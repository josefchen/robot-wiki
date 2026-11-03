import { describe, expect, it } from 'vitest';
import { releaseActivityProblems,releaseActivitySchema,type ReleaseActivity } from '@/lib/brand-v2-release-activity';
import { validateReleaseControlActivity } from '@/lib/brand-v2-release-control-activity';

function activity():ReleaseActivity{
  const target={selector:'#action',tag:'BUTTON',name:'Update',role:null,testId:null};
  const region={id:'#status',tag:'P',role:'status',ariaLive:null,ariaAtomic:null,attributes:{},ownerFrame:null,playbackControl:null,selfCheck:null,text:'Updated',hidden:false};
  return{version:1,url:'/',initialUrl:'/',elapsedMs:100,truncated:false,startFocus:target,endFocus:target,initialRegions:[{...region,text:''}],finalRegions:[region],finalRegionCount:1,
    operations:[{id:1,atMs:10,kind:'keydown',key:'Enter',trusted:true,target,focusBefore:target,focusAfter:target}],
    changes:[{order:1,url:'/',atMs:30,operationId:1,focus:target,before:{...region,text:''},after:region}]};
}
describe('native operation and live-region evidence',()=>{
  it('retains actual native keys, implicit status semantics and measured message timing',()=>{
    const reading=releaseActivitySchema.parse(activity());expect(releaseActivityProblems(reading)).toEqual([]);
    expect(reading.changes[0].atMs-reading.operations[0].atMs).toBe(20);
    expect(reading.finalRegions[0].ariaLive).toBeNull();
  });
  it.each(['omitted region','duplicate operation','out-of-order timing','missing operation','duplicate message','truncation','missing semantics','omitted mutation','wrong prior text'])(
    'refuses %s',mutation=>{
      const row=activity();
      if(mutation==='omitted region')row.finalRegions=[];
      if(mutation==='duplicate operation')row.operations.push({...row.operations[0]});
      if(mutation==='out-of-order timing')row.changes[0].atMs=5;
      if(mutation==='missing operation')row.changes[0].operationId=99;
      if(mutation==='duplicate message')row.changes.push({...row.changes[0],order:2,atMs:40});
      if(mutation==='truncation')row.truncated=true;
      if(mutation==='missing semantics')row.changes[0].after!.role=null;
      if(mutation==='omitted mutation')row.changes=[];
      if(mutation==='wrong prior text')row.changes[0].before!.text='Changed before';
      expect(releaseActivityProblems(row).length).toBeGreaterThan(0);
    },
  );
  it('retains synthetic preparation honestly for the separate native-witness join',()=>{
    const row=activity();row.operations[0].trusted=false;
    expect(releaseActivityProblems(row)).toEqual([]);expect(row.operations[0].trusted).toBe(false);
  });
  it('requires every route-state/viewport and every navigation interval under the current stamp',()=>{
    const expected={source:'a'.repeat(64),exported:'b'.repeat(64),routes:['/'],viewports:['1440x900']};
    const artifact={version:1,sourceFingerprint:expected.source,exportFingerprint:expected.exported,records:[{id:'/|1440x900',route:'/',viewport:'1440x900',navigationCount:2,intervals:[activity(),activity()]}]};
    expect(validateReleaseControlActivity(artifact,expected).records).toHaveLength(1);
    expect(()=>validateReleaseControlActivity({...artifact,sourceFingerprint:'c'.repeat(64)},expected)).toThrow('stale');
    expect(()=>validateReleaseControlActivity({...artifact,records:[]},expected)).toThrow();
    artifact.records[0].intervals.pop();expect(()=>validateReleaseControlActivity(artifact,expected)).toThrow('intervals');
  });
});
