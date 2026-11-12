import type { ReleaseActivity } from '../../../lib/live-region-activity';

type ActivityController={take:()=>ReleaseActivity;resume:()=>void;dispose:()=>void};
declare global { interface Window { __robotWikiReleaseActivity?:ActivityController } }

/** Runs before navigation scripts. Reads real DOM mutations and native input
 * events; no product events, messages or focus changes are synthesized. */
export function installReleaseActivityObserver(force:boolean|void=false){
  if(window.__robotWikiReleaseActivity){if(!force)return;window.__robotWikiReleaseActivity.dispose();}
  const selector='[aria-live],[role="status"],[role="log"],[role="alert"],output';
  const path=(node:Element)=>{
    if(node.id&&document.querySelectorAll('#'+CSS.escape(node.id)).length===1)return '#'+CSS.escape(node.id);
    const parts:string[]=[];for(let current:Element|null=node;current&&current!==document.documentElement;current=current.parentElement){
      const siblings=[...(current.parentElement?.children??[])].filter((sibling)=>sibling.tagName===current!.tagName);
      parts.unshift(current.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(current)+1})`);
    }return 'html > '+parts.join(' > ');
  };
  const target=(node:Element|null)=>{
    if(!node)return null;
    const labelled=(node.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>document.getElementById(id)?.textContent??'').join(' ').trim();
    const labels='labels'in node?[...((node as HTMLInputElement).labels??[])].map(label=>label.textContent??'').join(' '):'';
    const name=labelled||node.getAttribute('aria-label')||labels||node.textContent||'';
    return {selector:path(node),tag:node.tagName,name:name.replace(/\s+/g,' ').trim().slice(0,160),role:node.getAttribute('role'),testId:node.getAttribute('data-testid')};
  };
  const regions=()=>[...document.querySelectorAll(selector)].map((node)=>({id:path(node),tag:node.tagName,role:node.getAttribute('role'),ariaLive:node.getAttribute('aria-live'),ariaAtomic:node.getAttribute('aria-atomic'),
    attributes:Object.fromEntries([...node.attributes].filter(({name})=>name.startsWith('data-')).map(({name,value})=>[name,value])),
    ownerFrame:node.closest('[data-figure-frame]')?.getAttribute('data-figure-frame')??node.closest('[data-article-interactive]')?.getAttribute('data-article-interactive')??null,
    playbackControl:node.getAttribute('aria-live')==='off'?target([...node.closest('[data-figure-frame]')?.querySelectorAll('button')??[]].find(button=>/^(Pause the simulation|Pause the growth|Stop rollout preview)$/.test(button.getAttribute('aria-label')??''))??null):null,
    selfCheck:node.closest('[data-self-check],[data-predict]')?{prompt:node.closest('[data-self-check],[data-predict]')?.querySelector('legend')?.textContent?.replace(/\s+/g,' ').trim()??'',selected:node.closest('[data-self-check],[data-predict]')?.querySelector<HTMLInputElement>('input[type=radio]:checked')?.value??null}:null,
    text:(node.textContent??'').replace(/\s+/g,' ').trim(),hidden:Boolean(node.closest('[hidden],[aria-hidden="true"],details:not([open])>:not(summary)'))||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden'}));
  let started=performance.now(),suspended=false,truncated=false,ready=document.readyState!=='loading';
  const url=()=>location.pathname+location.search+location.hash;
  let initial=regions(),previous=initial,startFocus=target(document.activeElement),initialUrl=url();
  let operations:ReleaseActivity['operations']=[],changes:ReleaseActivity['changes']=[];
  const updateFocus=()=>{const last=operations.at(-1);if(last)last.focusAfter=target(document.activeElement);};
  const collect=()=>{
    if(suspended)return;
    if(!ready){initial=regions();previous=initial;startFocus=target(document.activeElement);initialUrl=url();started=performance.now();return;}
    const next=regions(),before=new Map(previous.map((row)=>[row.id,row])),after=new Map(next.map((row)=>[row.id,row]));
    for(const id of new Set([...before.keys(),...after.keys()])){
      const a=before.get(id)??null,b=after.get(id)??null;
      if(JSON.stringify(a)===JSON.stringify(b))continue;
      if(changes.length>=10_000){truncated=true;continue;}
      changes.push({order:changes.length+1,url:url(),atMs:performance.now()-started,operationId:operations.at(-1)?.id??null,focus:target(document.activeElement),before:a,after:b});
    }
    previous=next;updateFocus();
  };
  const observer=new MutationObserver(collect);
  observer.observe(document,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['role','aria-live','aria-atomic','aria-hidden','hidden','open','class','style']});
  const operation=(event:Event)=>{
    if(!ready){collect();ready=true;}
    if(suspended||!(event.target instanceof Element))return;
    if(event.type==='click'&&(!(event instanceof MouseEvent)||event.detail===0))return;
    collect();updateFocus();
    if(operations.length>=10_000){truncated=true;return;}
    const focused=target(document.activeElement);
    const operated=event.target.closest('button,a[href],input,select,textarea,summary,[role="button"],[role="tab"],[role="slider"],[role="radio"],[role="checkbox"]')??event.target;
    operations.push({id:operations.length+1,atMs:performance.now()-started,kind:event.type==='click'?'pointer-click':event.type==='pointerover'?'pointer-hover':event.type as 'keydown'|'input'|'change',key:event instanceof KeyboardEvent?event.key:null,trusted:event.isTrusted,target:target(operated)!,focusBefore:focused,focusAfter:focused});
    queueMicrotask(updateFocus);
  };
  const domReady=()=>{collect();ready=true;};
  document.addEventListener('DOMContentLoaded',domReady,{once:true});
  for(const event of ['keydown','input','change','click','pointerover'])document.addEventListener(event,operation,true);
  window.__robotWikiReleaseActivity={
    dispose:()=>{observer.disconnect();document.removeEventListener('DOMContentLoaded',domReady);for(const event of ['keydown','input','change','click','pointerover'])document.removeEventListener(event,operation,true);},
    take:()=>{collect();updateFocus();suspended=true;const final=regions();return{version:1,url:url(),initialUrl,elapsedMs:performance.now()-started,truncated,startFocus,endFocus:target(document.activeElement),initialRegions:initial,finalRegions:final,finalRegionCount:document.querySelectorAll(selector).length,operations,changes};},
    resume:()=>{observer.takeRecords();started=performance.now();initial=regions();previous=initial;initialUrl=url();startFocus=target(document.activeElement);operations=[];changes=[];truncated=false;suspended=false;},
  };
}

export function takeReleaseActivity():ReleaseActivity{
  if(!window.__robotWikiReleaseActivity)throw new Error('native activity observer was not installed before state preparation');
  return window.__robotWikiReleaseActivity.take();
}
export function resumeReleaseActivity(){
  if(!window.__robotWikiReleaseActivity)throw new Error('native activity observer disappeared during profiles');
  window.__robotWikiReleaseActivity.resume();
}
