import { createHash } from 'node:crypto';
import { mkdtempSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync,gunzipSync } from 'node:zlib';
import { afterEach,describe,expect,it } from 'vitest';
import { releaseArtifactFixture } from '../helpers/release-state-fixture';
import { clearReleaseStateValidationCache,releaseStateFile,iterateReleaseProfileRows,readReleaseStateManifest,readReleaseStateRecord,validateReleaseStateManifest,writeReleaseStateManifest,writeReleaseStateRecord,type ReleaseStateReference } from '@/lib/brand-v2-release-state-store';

const roots:string[]=[];
afterEach(()=>{clearReleaseStateValidationCache();for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
const hash=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
function fixture(){
  const root=mkdtempSync(join(tmpdir(),'brand-v2-state-store-'));roots.push(root);
  const source=releaseArtifactFixture();const frozen={source:source.sourceFingerprint,exported:source.exportFingerprint};
  const state=source.cases[0];const reference=writeReleaseStateRecord(root,state,frozen);
  const manifest=writeReleaseStateManifest(root,'routes',[state.id],[reference],frozen);
  return {root,state,reference,manifest,frozen};
}
function replace(root:string,reference:ReleaseStateReference,mutate:(data:Record<string,unknown>)=>void):ReleaseStateReference{
  const parsed=JSON.parse(gunzipSync(readFileSync(join(root,reference.path))).toString('utf8')) as Record<string,unknown>;
  mutate(parsed);const bytes=gzipSync(Buffer.from(JSON.stringify(parsed))),sha256=hash(bytes),path=releaseStateFile(reference.id,sha256);writeFileSync(join(root,path),bytes);
  return {...reference,path,sha256};
}
describe('bounded final state storage',()=>{
  it('stores every measured profile once and streams exact hash-bound members',()=>{
    const {root,state,reference,manifest,frozen}=fixture();
    expect(readReleaseStateRecord(root,reference,frozen)).toEqual(state);
    const path='evidence/brand-v2/release/routes.json';
    const index={sourceFingerprint:frozen.source,exportFingerprint:frozen.exported,groups:[{group:'routes',path,sha256:hash(readFileSync(join(root,path))),stateIds:[state.id],stateFiles:manifest.states,profileCount:12}]};
    const rows=[...iterateReleaseProfileRows(root,index)];
    expect(rows.map(({profile})=>profile.id)).toEqual(state.profiles.map(({id})=>id));
    expect(rows.every(({path})=>path===reference.path)).toBe(true);
    expect(readFileSync(join(root,reference.path)).length).toBeLessThan(Buffer.byteLength(JSON.stringify(state)));
  });
  it('rejects omitted state/group files and a narrowed or duplicate manifest population',()=>{
    const {root,state,reference,manifest,frozen}=fixture();const expected={...frozen,group:'routes',stateIds:[state.id]};
    expect(()=>readReleaseStateManifest(root,'absent',[state.id],frozen)).toThrow('missing');
    expect(()=>validateReleaseStateManifest(root,{...manifest,states:[]},expected)).toThrow();
    expect(()=>validateReleaseStateManifest(root,{...manifest,states:[reference,reference]},expected)).toThrow('populations');
    rmSync(join(root,reference.path));expect(()=>validateReleaseStateManifest(root,manifest,expected)).toThrow('missing');
  });
  it('re-hashes after cached validation and rejects corruption even when a caller updates the compressed hash',()=>{
    const {root,reference,frozen}=fixture();readReleaseStateRecord(root,reference,frozen);
    const path=join(root,reference.path),bytes=readFileSync(path).subarray(0,25);writeFileSync(path,bytes);
    expect(()=>readReleaseStateRecord(root,reference,frozen)).toThrow('changed or truncated');
    const corrupt={...reference,path:releaseStateFile(reference.id,hash(bytes)),sha256:hash(bytes)};writeFileSync(join(root,corrupt.path),bytes);
    expect(()=>readReleaseStateRecord(root,corrupt,frozen)).toThrow();
  });
  it.each(['source','export','state','profile'] as const)('rejects a changed %s inside otherwise valid compressed bytes',mutation=>{
    const {root,reference,frozen}=fixture();
    const changed=replace(root,reference,data=>{
      if(mutation==='source')data.sourceFingerprint='d'.repeat(64);
      if(mutation==='export')data.exportFingerprint='d'.repeat(64);
      const state=data.state as {id:string;profiles:unknown[]};
      if(mutation==='state')state.id='route:/other/';
      if(mutation==='profile')state.profiles.pop();
    });
    expect(()=>readReleaseStateRecord(root,changed,frozen)).toThrow();
  });
  it('rejects a missing cell against the independently measured semantic table census',()=>{
    const {root,state,frozen}=fixture();const profile=state.profiles[0];
    profile.accessibility.tables=[{id:'table:0',name:'Values',headers:1,cells:1,unassociated:[]}];
    profile.interaction.tables=[{id:'table:0',frame:'',name:'Values',headers:['Value'],unassociated:[],sortButtons:0,ariaSort:0,cells:[{rowIndex:0,row:'1',column:'Value',text:'1',align:'right'}],scroll:null}];
    const reference=writeReleaseStateRecord(root,state,frozen);
    const changed=replace(root,reference,data=>{const state=data.state as {profiles:Array<{interaction:{tables:Array<{cells:unknown[]}>}}>};state.profiles[0].interaction.tables[0].cells=[];});
    expect(()=>readReleaseStateRecord(root,changed,frozen)).toThrow('independently counted');
    profile.interaction.tables=[];expect(()=>writeReleaseStateRecord(root,state,frozen)).toThrow('table census');
  });
});
