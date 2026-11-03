import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe,expect,it } from 'vitest';
import { checkedTableValueProof,profileTableValueProof } from '../../lib/brand-v2-release-values';
import type { RawFrameData } from '../../lib/brand-v2-release-frame-data';
import type { ReleaseProfile } from '../../lib/brand-v2-release-evidence';

type Reading=RawFrameData&{route:string;sourceId:string;mountId:string;width:number;state?:string};
const readings=(JSON.parse(gunzipSync(readFileSync('tests/fixtures/source-data-oracles/figure-readings.json.gz')).toString()) as {readings:Reading[]}).readings;
function fixture(){
  const reading=structuredClone(readings.find(row=>row.sourceId==='interactive:HardwareGuide'&&row.width===1440&&row.state===undefined)!);
  const table:ReleaseProfile['interaction']['tables'][number]={id:'table:2',frame:'HardwareGuide',name:'Hardware',headers:reading.tables[0].headers,unassociated:[],sortButtons:0,ariaSort:0,scroll:null,cells:reading.tables[0].cells.map((cell,index)=>({...cell,rowIndex:index,align:'right'}))};
  return {id:'state:actual|profile:phone|table:2',route:reading.route,table,frames:[{mountId:reading.mountId,sourceId:reading.sourceId,tableIds:[table.id],frame:reading}],mounts:[{id:reading.mountId,sourceId:reading.sourceId,route:reading.route}]};
}
describe('exact profile source-table joins',()=>{
  it('rechecks the source oracle on the actual configuration and every table cell',()=>{
    expect(profileTableValueProof(fixture())?.failures).toEqual([]);
  });
  it.each(['changed cell','wrong mount','wrong route','wrong source','duplicate owner','missing table binding','changed frame value','changed configuration'])(
    'rejects %s',mutation=>{
      const input=fixture();
      if(mutation==='changed cell')input.table.cells[0].text='fabricated';
      if(mutation==='wrong mount')input.frames[0].mountId='another';
      if(mutation==='wrong route')input.route='/other/';
      if(mutation==='wrong source')input.frames[0].sourceId='interactive:Unknown';
      if(mutation==='duplicate owner')input.frames.push(input.frames[0]);
      if(mutation==='missing table binding')input.frames[0].tableIds=[];
      if(mutation==='changed frame value')input.frames[0].frame.tables[0].cells[0].text='invented';
      if(mutation==='changed configuration'){input.frames[0].frame.controls.find(control=>control.label==='All categories')!.pressed='false';input.frames[0].frame.controls.find(control=>control.label==='Arms')!.pressed='true';}
      const proof=profileTableValueProof(input);expect(proof===null||proof.failures.length>0).toBe(true);
    },
  );
  it('binds the exact state/profile/table identity and hash for server tables',()=>{
    const input=fixture(),sha256=createHash('sha256').update(JSON.stringify(input.table)).digest('hex');
    const proof={failures:[],observed:{checkedReadings:[{id:input.id,sha256}]},evidencePaths:['source.ts']};
    expect(checkedTableValueProof(proof,input.id,input.table).failures).toEqual([]);
    expect(checkedTableValueProof(proof,'state:other',input.table).failures).not.toEqual([]);
    input.table.cells[0].text='0';expect(checkedTableValueProof(proof,input.id,input.table).failures).not.toEqual([]);
    expect(checkedTableValueProof({...proof,observed:{}},input.id,input.table).failures).not.toEqual([]);
  });
});
