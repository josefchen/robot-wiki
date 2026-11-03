import { createHash } from 'node:crypto';
import { readFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { EXPLAINER_WORDS } from '../components/explainers/words.ts';
import type { BrandV2Registry } from './brand-v2-runners.ts';
import type { InteractiveLedgerEvidence } from './brand-v2-interactive-ledger.ts';
import type { ReleaseFrameArtifact } from './brand-v2-release-frame-data.ts';
import type { ReleasePlaygroundArtifact } from './brand-v2-release-playground.ts';
import type { SearchStatesEvidence } from './brand-v2-search-evidence.ts';
import { expectedCountText,type MarketMapFilters } from './brand-v2-market-map-states.ts';
import { SEGMENT_LABELS,type MarketMapSegment } from './market-map.ts';
import { releaseActivityProblems,liveRegionPoliteness,type ReleaseActivity } from './brand-v2-release-activity.ts';
import { iterateReleaseStateRows } from './brand-v2-release-state-store.ts';
import type { ReleaseStateIndex } from './brand-v2-release-index.ts';
import { readReleaseControlActivity,RELEASE_CONTROL_ACTIVITY_PATH } from './brand-v2-release-control-activity.ts';

export const RELEASE_LIVE_SOURCE='lib/brand-v2-release-live.ts#native-live-region-joins';
type Region=ReleaseActivity['finalRegions'][number];
const clean=(value:string)=>value.replace(/\s+/g,' ').trim();
const compact=(value:string)=>clean(value).replace(/\s/g,'');
const tidy=(value:string)=>value.replace(/[^a-z0-9]/gi,'').toLowerCase();
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const selector='[aria-live],[role="status"],[role="log"],[role="alert"],output';
const path=(node:Element)=>{
  if(node.id&&node.ownerDocument.querySelectorAll(`[id="${node.id.replaceAll('"','\\"')}"]`).length===1)return '#'+node.id;
  const parts:string[]=[];for(let current:Element|null=node;current&&current!==node.ownerDocument.documentElement;current=current.parentElement){const siblings=[...(current.parentElement?.children??[])].filter(sibling=>sibling.tagName===current!.tagName);parts.unshift(current.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(current)+1})`);}return 'html > '+parts.join(' > ');
};
type StaticBasis={path:string;regions:Map<string,{text:string;role:string|null;live:string|null}>;selfChecks:Map<string,Map<string|null,string>>};
export function exportedLiveBasis(root:string,route:string,notFound=false):StaticBasis{
  const pathname=new URL(route,'http://release.test').pathname;
  const file=notFound||pathname==='/404.html'?'out/404.html':`out${pathname.endsWith('/')?pathname:pathname+'/'}index.html`;
  if(!existsSync(join(root,file)))throw new Error(`missing source-bound live-region export ${file}`);
  const dom=new JSDOM(readFileSync(join(root,file),'utf8')),document=dom.window.document;
  const regions=new Map([...document.querySelectorAll(selector)].map(node=>[path(node),{text:clean(node.textContent??''),role:node.getAttribute('role'),live:node.getAttribute('aria-live')}]));
  const selfChecks=new Map<string,Map<string|null,string>>();
  for(const owner of document.querySelectorAll('[data-self-check],[data-predict]')){
    const prompt=clean(owner.querySelector('legend')?.textContent??''),region=owner.querySelector('details > [aria-live]');
    if(!prompt||!region)continue;
    if(selfChecks.has(prompt))throw new Error(`ambiguous authored self-check prompt on ${pathname}`);
    const texts=new Map<string|null,string>([[null,compact(region.textContent??'')]]);
    for(const option of owner.querySelectorAll('[data-reason]')){
      const value=option.getAttribute('data-reason')!,copy=region.cloneNode(true) as Element;
      const selected=[...copy.querySelectorAll('[data-reason]')].find(node=>node.getAttribute('data-reason')===value)?.firstElementChild;
      if(!selected)throw new Error('missing source self-check option label');
      selected.appendChild(document.createTextNode('your pick'));texts.set(value,compact(copy.textContent??''));
    }
    selfChecks.set(prompt,texts);
  }
  dom.window.close();return {path:file,regions,selfChecks};
}

export type LiveMessageBindings={
  static:StaticBasis;
  frameMessages:ReadonlyMap<string,ReadonlySet<string>>;
  searchMessages:ReadonlySet<string>;
  playgroundMessages:ReadonlySet<string>;
};
export function liveMessageBinding(region:Region,url:string,operation:ReleaseActivity['operations'][number]|undefined,basis:LiveMessageBindings):{binding:string;failures:string[]}{
  const failures:string[]=[],politeness=liveRegionPoliteness(region);
  const staticRegion=basis.static.regions.get(region.id);
  const expectedPoliteness=region.role==='alert'?'assertive':'polite';
  if(politeness!==expectedPoliteness&&politeness!=='off')failures.push('live region role/politeness differs from its native semantics');
  if(politeness==='off'){
    const expectedControl:Record<string,string>={pendulumcontroller:'Pause the simulation',rrtexplorer:'Pause the growth',rewardshaping:'Stop rollout preview'};
    const active=region.ownerFrame?expectedControl[tidy(region.ownerFrame)]:undefined;
    if(staticRegion?.live!=='off'&&(!active||region.playbackControl?.name!==active||region.playbackControl.tag!=='BUTTON'))failures.push('off live region has no exact active playback or authored-off binding');
  }
  if(!region.text&&!region.hidden&&politeness!=='off'&&staticRegion?.text)failures.push('live region dropped its nonempty authored message');
  if(!region.text||region.hidden||politeness==='off')return {binding:region.hidden?'not-exposed':politeness==='off'?'explicitly-off':'empty-region',failures};
  const pathname=new URL(url,'http://release.test').pathname;
  if(region.selfCheck){
    const expected=basis.static.selfChecks.get(clean(region.selfCheck.prompt))?.get(region.selfCheck.selected);
    if(expected===undefined||compact(region.text)!==expected)failures.push('self-check message differs from exact authored option/reasoning/selection');
    return {binding:'authored-self-check',failures};
  }
  if(pathname==='/market-map/'&&(Object.hasOwn(region.attributes,'data-result-count')||Object.hasOwn(region.attributes,'data-market-map-empty'))){
    const params=new URL(url,'http://release.test').searchParams;
    const allowed=['segment','subSegment','country','status','approach','openSource','confidence','q'];
    const filters=Object.fromEntries([...params].filter(([key])=>allowed.includes(key)).map(([key,value])=>[key==='q'?'query':key,value])) as MarketMapFilters;
    const count=expectedCountText(filters);
    if(Object.hasOwn(region.attributes,'data-market-map-empty')){
      const scope=filters.segment?` in ${SEGMENT_LABELS[filters.segment as MarketMapSegment]}`:'';
      const hint=filters.query?`No company name${scope} starts with “${filters.query}”.`:`Nothing${scope} matches every filter at once.`;
      const expected=`No companies match these filters.${hint}Clear filters`;
      if(!count.startsWith('0 of ')||compact(region.text)!==compact(expected))failures.push('empty-map message differs from canonical zero-result filter state');
    }else if(region.text!==count)failures.push('map announcement differs from canonical companies and actual filter URL');
    if(region.role!=='status'||politeness!=='polite'||region.ariaAtomic==='false')failures.push('map announcement lost status/polite/atomic semantics');
    return {binding:'canonical-map-count-or-empty',failures};
  }
  if(pathname==='/search/'&&region.role==='status'){
    if(region.ariaLive!=='polite'||!basis.searchMessages.has(region.text))failures.push('search announcement differs from independently checked query/group/error state');
    return {binding:'deterministic-search-state',failures};
  }
  if(region.ownerFrame){
    if(!basis.frameMessages.get(tidy(region.ownerFrame))?.has(region.text)&&staticRegion?.text!==region.text)failures.push('figure announcement has no exact source-verified frame/transition message');
    return {binding:'source-verified-figure:'+tidy(region.ownerFrame),failures};
  }
  if(pathname==='/playground/'&&basis.playgroundMessages.has(region.text))return {binding:'canonical-playground-state',failures};
  if(region.text==='Copied'&&operation&&/copy/i.test(operation.target.name)){
    if(region.role!=='status'||politeness!=='polite')failures.push('copy confirmation lost polite status semantics');
    return {binding:'native-copy-confirmation',failures};
  }
  if(Object.hasOwn(region.attributes,'data-step-text')&&Object.values(EXPLAINER_WORDS).some(words=>words.steps.some(step=>clean(step)===region.text)))return {binding:'authored-explainer-step',failures};
  if(staticRegion?.text===region.text&&staticRegion.role===region.role&&staticRegion.live===region.ariaLive)return {binding:'exact-exported-live-region',failures};
  failures.push('nonempty live message has no exact source/state binding');return {binding:'unbound',failures};
}

/** Message replay and exact text bindings are distinct from the companion
 * action readers. The latter prove canonical results, native keyboard
 * focus, intended detail focus transfer, latency and idle non-flooding. */
export function liveActivityVerdict(activity:ReleaseActivity,basis:LiveMessageBindings){
  const failures=releaseActivityProblems(activity),bindings:Array<{phase:string;region:string;binding:string;sha256:string}>=[];
  if(activity.operations.length&&activity.operations.every(operation=>!operation.trusted)&&activity.changes.some(change=>change.after&&!change.after.hidden&&change.after.text!==change.before?.text))failures.push('synthetic preparation alone cannot prove native live interaction');
  const inspect=(region:Region,url:string,phase:string,operation?:ReleaseActivity['operations'][number])=>{
    const result=liveMessageBinding(region,url,operation,basis);failures.push(...result.failures.map(failure=>`${phase}:${region.id}: ${failure}`));bindings.push({phase,region:region.id,binding:result.binding,sha256:digest(region)});
  };
  for(const region of activity.initialRegions)inspect(region,activity.initialUrl,'initial');
  for(const change of activity.changes)if(change.after){
    const operation=activity.operations.find(operation=>operation.id===change.operationId);
    inspect(change.after,change.url,`change:${change.order}`,operation);
    if(operation&&change.atMs-operation.atMs>10_000&&!change.after.hidden&&change.after.text!==change.before?.text)failures.push(`change:${change.order}: live response exceeded the registered interaction settle ceiling`);
    if(operation&&['input','change'].includes(operation.kind)&&operation.focusBefore?.selector===operation.target.selector&&['INPUT','SELECT','TEXTAREA'].includes(operation.target.tag)&&change.focus?.selector!==operation.target.selector)failures.push(`change:${change.order}: live update stole focus from its native input`);
  }
  for(const region of activity.finalRegions){const change=[...activity.changes].reverse().find(change=>change.after?.id===region.id);inspect(region,activity.url,'final',activity.operations.find(operation=>operation.id===change?.operationId));}
  return {failures,observed:{url:activity.url,initialUrl:activity.initialUrl,operations:activity.operations.length,nativeOperations:activity.operations.filter(operation=>operation.trusted).length,syntheticPreparationOperations:activity.operations.filter(operation=>!operation.trusted).length,changes:activity.changes.length,regions:activity.finalRegionCount,activitySha256:digest(activity),bindings}};
}

type NativeLedgerInterval={id:string;activity:Pick<ReleaseActivity,'operations'|'changes'>};
export function joinNativeLedgerTransition(transition:Pick<InteractiveLedgerEvidence['observations'][number]['transitions'][number],'keys'|'announcements'>,controlName:string,intervals:readonly NativeLedgerInterval[]){
  const failures:string[]=[];
  const key=(value:string)=>value==='Space'?' ':value;
  const expectedKeys=transition.keys.flatMap(value=>{const run=/^(.*)×(\d+)$/.exec(value);return run?Array.from({length:Number(run[2])},()=>key(run[1])):value==='(none)'?[]:[key(value)];});
  const witnesses=intervals.flatMap(interval=>{
    const native=interval.activity.operations.filter(operation=>operation.kind==='keydown'&&operation.trusted&&(operation.target.name===controlName||operation.focusAfter?.name===controlName));
    let at=0;for(const operation of native)if(operation.key===expectedKeys[at])at++;
    return at===expectedKeys.length?[interval]:[];
  });
  if(expectedKeys.length&&!witnesses.length)failures.push('ledger keys have no actual trusted native-control event witness');
  const messages=intervals.flatMap(interval=>interval.activity.changes.flatMap(change=>change.after&&!change.after.hidden&&change.after.text&&change.after.text!==change.before?.text&&liveRegionPoliteness(change.after)!=='off'?[{interval:interval.id,order:change.order,text:change.after.text,politeness:liveRegionPoliteness(change.after)}]:[]));
  let offset=0;
  for(const announcement of transition.announcements){
    const index=messages.findIndex((message,index)=>index>=offset&&clean(message.text)===clean(announcement.text)&&message.politeness===announcement.politeness);
    if(index<0)failures.push('ledger announcement has no exact ordered native live mutation: '+announcement.text.slice(0,100));else offset=index+1;
  }
  return {failures,observed:{control:controlName,keys:transition.keys,nativeStateIds:witnesses.map(witness=>witness.id),announcements:transition.announcements,mutationsSha256:digest(messages)}};
}

export function collectReleaseLiveEvidence(input:{root:string;registry:BrandV2Registry;index:ReleaseStateIndex;frames:ReleaseFrameArtifact;ledger:InteractiveLedgerEvidence;search:SearchStatesEvidence;playground:ReleasePlaygroundArtifact;controlRoutes:readonly string[];controlViewports:readonly string[]}){
  const frameMessages=new Map<string,Set<string>>();
  const add=(sourceId:string,text:string)=>{const key=tidy(sourceId.replace(/^interactive:/,''));const set=frameMessages.get(key)??new Set<string>();if(text.trim())set.add(clean(text));frameMessages.set(key,set);};
  for(const frame of input.frames.frames){for(const reading of frame.readouts)add(frame.sourceId,reading.text);for(const match of frame.text.matchAll(/\b\d+ of \d+ (?:datasets|entries|rigs|systems|releases|models)\b/g))add(frame.sourceId,match[0]);}
  for(const observation of input.ledger.observations){
    const mount=input.registry.interactive.mounts.find(mount=>mount.id===observation.mountId);if(!mount)throw new Error('live ledger has an unregistered source owner');
    for(const transition of observation.transitions){for(const message of transition.announcements)add(mount.sourceId,message.text);for(const reading of transition.series?.frame?.readouts??[])add(mount.sourceId,reading.text);}
  }
  const searchMessages=new Set(input.search.states.map(state=>state.statusText));
  const playgroundMessages=new Set(input.playground.readings.flatMap(reading=>[reading.message,reading.reachText]));
  playgroundMessages.add('Enter a number of centimetres in each box.');playgroundMessages.add('Reaching the target…');playgroundMessages.add('Loading the arm…');
  const cache=new Map<string,StaticBasis>();
  const basis=(route:string):LiveMessageBindings=>{const pathname=new URL(route,'http://release.test').pathname;let saved=cache.get(pathname);if(!saved){saved=exportedLiveBasis(input.root,pathname,pathname===input.registry.routes.notFound.path);cache.set(pathname,saved);}return {static:saved,frameMessages,searchMessages,playgroundMessages};};
  const verdicts:Array<{id:string;failures:string[];observed:unknown;evidencePaths:string[];mode:'browser-state'}>=[];
  const nativeByMount=new Map<string,NativeLedgerInterval[]>();
  for(const {state,path}of iterateReleaseStateRows(input.root,input.index)){
    const mount=input.registry.interactive.mounts.find(mount=>state.id.startsWith(mount.id+'|'));
    if(mount){const records=nativeByMount.get(mount.id)??[];records.push({id:state.id,activity:{operations:state.activity.operations,changes:state.activity.changes}});nativeByMount.set(mount.id,records);}
    const reading=liveActivityVerdict(state.activity,basis(state.route));
    const profiles=state.profiles.map(profile=>{
      const bindings=profile.liveRegions.map(region=>{
        const change=[...state.activity.changes].reverse().find(change=>change.after?.id===region.id);
        const operation=state.activity.operations.find(operation=>operation.id===change?.operationId);
        const result=liveMessageBinding(region,state.activity.url,operation,basis(state.route));
        reading.failures.push(...result.failures.map(failure=>`${profile.id}:${region.id}: ${failure}`));
        return {region:region.id,binding:result.binding,sha256:digest(region)};
      });
      return {id:profile.id,regionCount:profile.liveRegionCount,bindings};
    });
    if(state.id.startsWith('search:')){
      const expected=input.search.states.filter(row=>row.stateId===state.state&&row.viewport==='1440x900');
      const statuses=state.activity.finalRegions.filter(region=>region.role==='status'&&!region.hidden);
      if(expected.length!==1||statuses.length!==1||statuses[0].text!==expected[0]?.statusText)reading.failures.push('final native search message differs from its exact deterministic case');
    }
    verdicts.push({id:'state:'+state.id,...reading,observed:{...reading.observed,profiles},evidencePaths:[path,basis(state.route).static.path,'evidence/brand-v2/interactive-ledger.json'],mode:'browser-state'});
  }
  for(const observation of input.ledger.observations)for(const [index,transition]of observation.transitions.entries()){
    const name=observation.controls.find(control=>control.index===transition.control)?.name;
    if(name===undefined)throw new Error('native live transition has no independently enumerated control');
    const native=nativeByMount.get(observation.mountId)??[];
    const exact=`${observation.mountId}|transition:${transition.control}:${transition.fold??'main'}:${transition.caseId}:${transition.keys.join('+')}`;
    // Radio navigation emits the reached focus capture before its transition
    // capture. Keep both genuine intervals; do not manufacture a second key.
    const intervals=native.filter(record=>record.id===exact||record.id===`${observation.mountId}|focus:${transition.control}`);
    verdicts.push({id:`ledger:${observation.mountId}:${index}`,...joinNativeLedgerTransition(transition,name,intervals),evidencePaths:['evidence/brand-v2/interactive-ledger.json','evidence/brand-v2/release/state-index.json'],mode:'browser-state'});
  }
  const controls=readReleaseControlActivity(input.root,input.controlRoutes,input.controlViewports);
  for(const record of controls.records)for(const [index,interval]of record.intervals.entries())verdicts.push({id:`control:${record.id}:navigation:${index+1}`,...liveActivityVerdict(interval,basis(interval.url)),evidencePaths:[RELEASE_CONTROL_ACTIVITY_PATH,basis(interval.url).static.path],mode:'browser-state'});
  if(!verdicts.length||new Set(verdicts.map(row=>row.id)).size!==verdicts.length)throw new Error('empty or duplicate native live-region population');
  return {populations:{[RELEASE_LIVE_SOURCE]:verdicts.map(row=>row.id)},verdicts:{'VAL-B2-A11Y-012':verdicts}};
}
