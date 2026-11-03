import { describe,expect,it } from 'vitest';
import { liveActivityVerdict,liveMessageBinding,joinNativeLedgerTransition,type LiveMessageBindings } from '../../lib/brand-v2-release-live';
import type { ReleaseActivity } from '../../lib/brand-v2-release-activity';
import { expectedCountText } from '../../lib/brand-v2-market-map-states';

function fixture(){
  const focus={selector:'#query',tag:'INPUT',name:'Query',role:null,testId:null};
  const region:ReleaseActivity['finalRegions'][number]={id:'#status',tag:'P',role:'status',ariaLive:'polite',ariaAtomic:null,attributes:{},ownerFrame:null,playbackControl:null,selfCheck:null,text:'Found two records',hidden:false};
  const activity:ReleaseActivity={version:1,url:'/search/',initialUrl:'/search/',elapsedMs:100,truncated:false,startFocus:focus,endFocus:focus,initialRegions:[{...region,text:''}],finalRegions:[region],finalRegionCount:1,operations:[{id:1,kind:'input',key:null,trusted:true,atMs:10,target:focus,focusBefore:focus,focusAfter:focus}],changes:[{order:1,url:'/search/',atMs:30,operationId:1,focus,before:{...region,text:''},after:region}]};
  const basis:LiveMessageBindings={static:{path:'out/search/index.html',regions:new Map([['#status',{text:'',role:'status',live:'polite'}]]),selfChecks:new Map()},frameMessages:new Map(),searchMessages:new Set(['Found two records']),playgroundMessages:new Set()};
  return {activity,basis,region};
}
describe('exact native live-region joins',()=>{
  it('binds changed text to the exact source and operation while retaining the complete replay',()=>{
    const {activity,basis}=fixture(),result=liveActivityVerdict(activity,basis);
    expect(result.failures).toEqual([]);expect(result.observed.bindings.map(binding=>binding.binding)).toEqual(['empty-region','deterministic-search-state','deterministic-search-state']);
  });
  it.each(['wrong text','wrong role','wrong politeness','unbound source','late update','focus stolen','missing replay','synthetic input'])(
    'rejects %s',mutation=>{
      const {activity,basis}=fixture();
      if(mutation==='wrong text')activity.changes[0].after!.text='Found 999 records';
      if(mutation==='wrong role')activity.changes[0].after!.role=null;
      if(mutation==='wrong politeness')activity.changes[0].after!.ariaLive='assertive';
      if(mutation==='unbound source')basis.searchMessages=new Set();
      if(mutation==='late update'){activity.changes[0].atMs=20_000;activity.elapsedMs=20_100;}
      if(mutation==='focus stolen')activity.changes[0].focus={...activity.startFocus!,selector:'#body'};
      if(mutation==='missing replay')activity.changes=[];
      if(mutation==='synthetic input')activity.operations[0].trusted=false;
      expect(liveActivityVerdict(activity,basis).failures).not.toEqual([]);
    },
  );
  it('derives map count from canonical companies and exact current filters',()=>{
    const {basis,region}=fixture();Object.assign(region,{text:expectedCountText({}),attributes:{'data-result-count':'true'}});
    expect(liveMessageBinding(region,'/market-map/',undefined,basis).failures).toEqual([]);
    expect(liveMessageBinding(region,'/market-map/?q=no-such-company',undefined,basis).failures).not.toEqual([]);
  });
  it('requires exact selected self-check reasoning and refuses unknown figure messages',()=>{
    const {basis,region}=fixture();
    region.selfCheck={prompt:'Which?',selected:'a'};
    basis.static.selfChecks.set('Which?',new Map([['a','OptionAyourpickBecauseA.']]));region.text='Option A your pick Because A.';
    expect(liveMessageBinding(region,'/example/',undefined,basis).failures).toEqual([]);
    region.text='Option B your pick Because B.';expect(liveMessageBinding(region,'/example/',undefined,basis).failures).not.toEqual([]);
    region.selfCheck=null;region.ownerFrame='example';region.text='42';
    expect(liveMessageBinding(region,'/example/',undefined,basis).failures).not.toEqual([]);
    basis.frameMessages=new Map([['example',new Set(['42'])]]);expect(liveMessageBinding(region,'/example/',undefined,basis).failures).toEqual([]);
  });
  it('allows muted playback only with the exact active native playback control',()=>{
    const {region,basis}=fixture();region.ownerFrame='pendulum-controller';region.ariaLive='off';
    expect(liveMessageBinding(region,'/classical/control/',undefined,basis).failures).not.toEqual([]);
    region.playbackControl={selector:'#pause',tag:'BUTTON',name:'Pause the simulation',role:null,testId:null};
    expect(liveMessageBinding(region,'/classical/control/',undefined,basis).failures).toEqual([]);
    region.ownerFrame='chunk-size-curve';expect(liveMessageBinding(region,'/example/',undefined,basis).failures).not.toEqual([]);
    region.ownerFrame=null;region.ariaLive='polite';basis.static.regions.set(region.id,{text:'Required status',role:'status',live:'polite'});region.text='';
    expect(liveMessageBinding(region,'/example/',undefined,basis).failures).not.toEqual([]);
  });
  it('joins each ledger key sequence and ordered message to its actual native interval',()=>{
    const {activity}=fixture();activity.operations[0].kind='keydown';activity.operations[0].key='ArrowRight';
    activity.operations.push({...activity.operations[0],id:2,atMs:15});activity.changes[0].operationId=2;
    const transition={keys:['ArrowRight×2'],announcements:[{region:'status',text:'Found two records',politeness:'polite',atMs:20}]};
    const intervals=[{id:'actual-focus-or-transition',activity}];
    expect(joinNativeLedgerTransition(transition,'Query',intervals).failures).toEqual([]);
    expect(joinNativeLedgerTransition(transition,'Another input',intervals).failures).not.toEqual([]);
    const omitted=structuredClone(intervals);omitted[0].activity.operations.pop();expect(joinNativeLedgerTransition(transition,'Query',omitted).failures).not.toEqual([]);
    const message=structuredClone(intervals);message[0].activity.changes[0].after!.text='Other result';expect(joinNativeLedgerTransition(transition,'Query',message).failures).not.toEqual([]);
    const untrusted=structuredClone(intervals);untrusted[0].activity.operations[0].trusted=false;expect(joinNativeLedgerTransition(transition,'Query',untrusted).failures).not.toEqual([]);
  });
});
