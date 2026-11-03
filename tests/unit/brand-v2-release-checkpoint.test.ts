// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync,gunzipSync } from 'node:zlib';
import { afterEach,describe,expect,it } from 'vitest';
import { readReleaseCheckpoint,writeReleaseCheckpoint } from '@/lib/brand-v2-release-checkpoint';
import { releaseArtifactFixture } from '../helpers/release-state-fixture';
import { RELEASE_TEXT_ONLY_SELECTORS,RELEASE_TEXT_ONLY_PREDECESSOR,RELEASE_TEXT_ONLY_PREDECESSOR_BLOB } from '@/lib/brand-v2-release-text';

const roots:string[]=[];afterEach(()=>roots.splice(0).forEach((root)=>rmSync(root,{recursive:true,force:true})));
function fixture(){const root=mkdtempSync(join(tmpdir(),'release-checkpoint-'));roots.push(root);const artifact=releaseArtifactFixture(),record=artifact.cases[0];const input={id:record.id,route:record.route,state:record.state,steps:record.steps};return {root,record,expected:{source:artifact.sourceFingerprint,exported:artifact.exportFingerprint,semanticDigest:'d'.repeat(64),input}};}
describe('frozen release state checkpoints',()=>{
  it('reuses only a complete passing observation after the same actual state is reached',()=>{
    const {root,record,expected}=fixture();writeReleaseCheckpoint(root,expected,record);expect(readReleaseCheckpoint(root,expected)).toEqual(record);
    for(const changed of [{...expected,source:'e'.repeat(64)},{...expected,exported:'e'.repeat(64)},{...expected,semanticDigest:'e'.repeat(64)},{...expected,input:{...expected.input,route:'/another/'}},{...expected,input:{...expected.input,steps:['different actual input']}}])expect(readReleaseCheckpoint(root,changed)).toBeNull();
  });
  it('re-evaluates cached predicates and rejects incomplete or corrupt data',()=>{
    const {root,record,expected}=fixture();writeReleaseCheckpoint(root,expected,record);
    const dir=join(root,'evidence/brand-v2/release/checkpoints');const path=join(dir,readdirSync(dir)[0]);
    const data=JSON.parse(gunzipSync(readFileSync(path)).toString());data.record.profiles[0].documentOverflowPx=1;
    writeFileSync(path,gzipSync(JSON.stringify(data)));expect(readReleaseCheckpoint(root,expected)).toBeNull();
    writeFileSync(path,'partial file');expect(readReleaseCheckpoint(root,expected)).toBeNull();
    record.profiles.pop();expect(()=>writeReleaseCheckpoint(root,expected,record)).toThrow('missing, extra or duplicate profile');
  });
  it('binds the inherited text-only selector scope without silently widening or narrowing it',()=>{
    expect(RELEASE_TEXT_ONLY_SELECTORS).toEqual(['main h1','main h2','main h3','main p','main button','main label','main a']);
    expect(RELEASE_TEXT_ONLY_PREDECESSOR).toBe('tests/e2e/brand-v2-reflow-320-200.spec.ts');
    expect(RELEASE_TEXT_ONLY_PREDECESSOR_BLOB).toBe('80c8caa777edbe7ce3bfbc2e554bc85d940fcf9c');
  });
});
