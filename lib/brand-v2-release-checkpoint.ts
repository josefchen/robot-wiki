import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { RELEASE_EVIDENCE_DIRECTORY, releaseStateSchema, releaseStateProblems, type ReleaseState } from './brand-v2-release-evidence.ts';

const identity=z.object({id:z.string().min(1),route:z.string().min(1),state:z.string().min(1),steps:z.array(z.string().min(1)).min(1)}).strict();
const sha=z.string().regex(/^[a-f0-9]{64}$/);
export const releaseCheckpointSchema=z.object({version:z.literal(1),sourceFingerprint:sha,exportFingerprint:sha,semanticDigest:sha,input:identity,record:releaseStateSchema}).strict();
type Expected={source:string;exported:string;semanticDigest:string;input:Omit<ReleaseState,'profiles'|'activity'>};
export function releaseCheckpointProblems(input:unknown,expected:Expected):string[]{
  const parsed=releaseCheckpointSchema.safeParse(input);if(!parsed.success)return ['invalid release checkpoint schema'];
  const data=parsed.data;const failures:string[]=[];
  if(data.sourceFingerprint!==expected.source||data.exportFingerprint!==expected.exported)failures.push('stale checkpoint source/export');
  if(data.semanticDigest!==expected.semanticDigest)failures.push('checkpoint has another actual semantic state');
  const expectedInput=identity.parse(expected.input);
  const recordedInput={id:data.record.id,route:data.record.route,state:data.record.state,steps:data.record.steps};
  if(JSON.stringify(data.input)!==JSON.stringify(expectedInput)||JSON.stringify(recordedInput)!==JSON.stringify(expectedInput))failures.push('checkpoint identity or executed steps differ');
  failures.push(...releaseStateProblems({version:1,sourceFingerprint:data.sourceFingerprint,exportFingerprint:data.exportFingerprint,group:'checkpoint',expectedStateIds:[expected.input.id],cases:[data.record]},
    {fingerprint:expected.source,exportFingerprint:expected.exported,group:'checkpoint',stateIds:[expected.input.id]}));
  return failures;
}
function checkpointPath(root:string,id:string){return join(root,RELEASE_EVIDENCE_DIRECTORY,'checkpoints',createHash('sha256').update(id).digest('hex')+'.json.gz');}

/** A checkpoint is reusable only after the driver has actually reached the
 * same named state again. All12 profile predicates and frozen bytes are
 * revalidated; stale, incomplete or corrupt caches trigger real remeasurement.
 * The final independent group/index population still decides completeness. */
export function readReleaseCheckpoint(root:string,expected:Expected):ReleaseState|null{
  const path=checkpointPath(root,expected.input.id);if(!existsSync(path))return null;
  let input:unknown;try{input=JSON.parse(gunzipSync(readFileSync(path)).toString());}catch{return null;}
  if(releaseCheckpointProblems(input,expected).length)return null;
  return releaseCheckpointSchema.parse(input).record;
}
export function writeReleaseCheckpoint(root:string,expected:Expected,record:ReleaseState):void{
  const value={version:1 as const,sourceFingerprint:expected.source,exportFingerprint:expected.exported,semanticDigest:expected.semanticDigest,input:expected.input,record};
  const failures=releaseCheckpointProblems(value,expected);if(failures.length)throw new Error(failures.join('\n'));
  const directory=join(root,RELEASE_EVIDENCE_DIRECTORY,'checkpoints');mkdirSync(directory,{recursive:true});
  const path=checkpointPath(root,expected.input.id);const temporary=`${path}.${process.pid}.tmp`;
  writeFileSync(temporary,gzipSync(Buffer.from(JSON.stringify(value)),{level:6}));renameSync(temporary,path);
}
