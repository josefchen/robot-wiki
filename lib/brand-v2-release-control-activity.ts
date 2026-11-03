import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import { releaseActivitySchema,releaseActivityProblems } from './brand-v2-release-activity.ts';

export const RELEASE_CONTROL_ACTIVITY_PATH='evidence/brand-v2/release/control-activity.json';
const sha=z.string().regex(/^[a-f0-9]{64}$/);
export const releaseControlActivitySchema=z.object({version:z.literal(1),sourceFingerprint:sha,exportFingerprint:sha,
  records:z.array(z.object({id:z.string().min(1),route:z.string().min(1),viewport:z.string().min(1),navigationCount:z.number().int().positive(),intervals:z.array(releaseActivitySchema).min(1)}).strict()).min(1),
}).strict();
export type ReleaseControlActivity=z.infer<typeof releaseControlActivitySchema>;
export function validateReleaseControlActivity(input:unknown,expected:{source:string;exported:string;routes:readonly string[];viewports:readonly string[]}):ReleaseControlActivity{
  const artifact=releaseControlActivitySchema.parse(input);
  if(artifact.sourceFingerprint!==expected.source||artifact.exportFingerprint!==expected.exported)throw new Error('stale control activity source or production export');
  const ids=expected.routes.flatMap((route)=>expected.viewports.map((viewport)=>`${route}|${viewport}`)).sort();
  if(!ids.length||new Set(ids).size!==ids.length||JSON.stringify(artifact.records.map(({id})=>id).sort())!==JSON.stringify(ids))throw new Error('control activity route-state/viewport population differs');
  for(const record of artifact.records){
    if(record.id!==`${record.route}|${record.viewport}`||record.navigationCount!==record.intervals.length)throw new Error(`${record.id}: navigation intervals were omitted or misbound`);
    const failures=record.intervals.flatMap(releaseActivityProblems);
    if(failures.length)throw new Error(`${record.id}: ${failures.join('; ')}`);
  }
  return artifact;
}
export function readReleaseControlActivity(root:string,routes:readonly string[],viewports:readonly string[]):ReleaseControlActivity{
  const stamp=readReleaseBuildStamp(root);
  return validateReleaseControlActivity(JSON.parse(readFileSync(join(root,RELEASE_CONTROL_ACTIVITY_PATH),'utf8')),{source:stamp.sourceAfter,exported:stamp.exportFingerprint,routes,viewports});
}
