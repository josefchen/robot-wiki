import { createHash, randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { RELEASE_EVIDENCE_DIRECTORY, RELEASE_PROFILES, releaseStateSchema, releaseStateProblems, type ReleaseState, type ReleaseProfile } from './brand-v2-release-evidence.ts';

const sha=z.string().regex(/^[a-f0-9]{64}$/);
const nonempty=z.string().min(1);
export const releaseStateReferenceSchema=z.object({id:nonempty,path:nonempty,sha256:sha,profileCount:z.number().int().positive()}).strict();
export type ReleaseStateReference=z.infer<typeof releaseStateReferenceSchema>;
export const releaseStateManifestSchema=z.object({version:z.literal(2),sourceFingerprint:sha,exportFingerprint:sha,group:nonempty,expectedStateIds:z.array(nonempty).min(1),states:z.array(releaseStateReferenceSchema).min(1)}).strict();
export type ReleaseStateManifest=z.infer<typeof releaseStateManifestSchema>;
const capsuleSchema=z.object({version:z.literal(1),sourceFingerprint:sha,exportFingerprint:sha,state:releaseStateSchema}).strict();
export type FrozenRelease={source:string;exported:string};
const digest=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const same=(a:readonly string[],b:readonly string[])=>{const left=[...a].sort(),right=[...b].sort();return a.length===b.length&&new Set(a).size===a.length&&left.every((id,index)=>id===right[index]);};
export function releaseStateFile(id:string,sha256:string){return `${RELEASE_EVIDENCE_DIRECTORY}/states/${digest(id)}-${sha256}.json.gz`;}

function atomicFile(root:string,path:string,bytes:string|Buffer){
  const destination=join(root,path);mkdirSync(dirname(destination),{recursive:true});
  const temporary=`${destination}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(temporary,bytes);renameSync(temporary,destination);
}
function checkState(state:ReleaseState,frozen:FrozenRelease){
  const failures=releaseStateProblems({version:1,sourceFingerprint:frozen.source,exportFingerprint:frozen.exported,group:'capsule',expectedStateIds:[state.id],cases:[state]},
    {fingerprint:frozen.source,exportFingerprint:frozen.exported,group:'capsule',stateIds:[state.id]});
  if(failures.length)throw new Error(failures.join('\n'));
}

/** Cache only validation of exact compressed bytes, bound to source, export,
 * and state identity. Every read hashes the actual file again. It never
 * retains the full matrix or accepts a changed file on mtime/size alone. */
const validated=new Map<string,{profileCount:number}>();
export function clearReleaseStateValidationCache(){validated.clear();}
function capsule(root:string,reference:ReleaseStateReference,frozen:FrozenRelease,decode:boolean):ReleaseState|null{
  if(reference.path!==releaseStateFile(reference.id,reference.sha256))throw new Error(`${reference.id}: state file path differs from its stable identity`);
  const path=join(root,reference.path);
  if(!existsSync(path)||!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw new Error(`${reference.id}: missing or nonregular state capsule`);
  const bytes=readFileSync(path);
  if(digest(bytes)!==reference.sha256)throw new Error(`${reference.id}: changed or truncated compressed state bytes`);
  const key=`${frozen.source}|${frozen.exported}|${reference.id}|${reference.sha256}`;
  const known=validated.get(key);
  if(known&&known.profileCount!==reference.profileCount)throw new Error(`${reference.id}: referenced profile count differs from measured capsule`);
  if(!decode&&known)return null;
  // A bounded state cannot allocate an unbounded gzip payload. The limit
  // covers a full long article far beyond measured current state sizes;
  // exceeding it is a visible collection failure, never a dropped sample.
  const parsed=capsuleSchema.parse(JSON.parse(gunzipSync(bytes,{maxOutputLength:64*1024*1024}).toString('utf8')));
  if(parsed.sourceFingerprint!==frozen.source||parsed.exportFingerprint!==frozen.exported||parsed.state.id!==reference.id)throw new Error(`${reference.id}: capsule source, export or state identity differs`);
  if(parsed.state.profiles.length!==reference.profileCount)throw new Error(`${reference.id}: referenced profile count differs from measured capsule`);
  if(!validated.has(key)){checkState(parsed.state,frozen);validated.set(key,{profileCount:parsed.state.profiles.length});}
  return parsed.state;
}
export function readReleaseStateRecord(root:string,reference:ReleaseStateReference,frozen:FrozenRelease):ReleaseState{return capsule(root,reference,frozen,true)!;}
export function validateReleaseStateReference(root:string,reference:ReleaseStateReference,frozen:FrozenRelease):void{capsule(root,reference,frozen,false);}
export function writeReleaseStateRecord(root:string,state:ReleaseState,frozen:FrozenRelease):ReleaseStateReference{
  checkState(state,frozen);
  const bytes=gzipSync(Buffer.from(JSON.stringify({version:1,sourceFingerprint:frozen.source,exportFingerprint:frozen.exported,state})),{level:6});
  const sha256=digest(bytes);
  const reference={id:state.id,path:releaseStateFile(state.id,sha256),sha256,profileCount:state.profiles.length};
  if(!existsSync(join(root,reference.path)))atomicFile(root,reference.path,bytes);
  validateReleaseStateReference(root,reference,frozen);
  return reference;
}
export function validateReleaseStateManifest(root:string,input:unknown,expected:{group:string;stateIds:readonly string[]}&FrozenRelease):ReleaseStateManifest{
  const manifest=releaseStateManifestSchema.parse(input);
  if(manifest.sourceFingerprint!==expected.source||manifest.exportFingerprint!==expected.exported||manifest.group!==expected.group)throw new Error('state manifest source, export or group differs');
  if(!expected.stateIds.length||new Set(expected.stateIds).size!==expected.stateIds.length||!same(manifest.expectedStateIds,expected.stateIds)||!same(manifest.states.map(({id})=>id),expected.stateIds))throw new Error('state manifest expected/executed populations differ');
  for(const reference of manifest.states)validateReleaseStateReference(root,reference,expected);
  return manifest;
}
export function readReleaseStateManifest(root:string,group:string,stateIds:readonly string[],frozen:FrozenRelease):ReleaseStateManifest{
  if(!/^[a-z0-9-]+$/.test(group))throw new Error(`invalid release state group ${group}`);
  const path=join(root,RELEASE_EVIDENCE_DIRECTORY,`${group}.json`);
  if(!existsSync(path))throw new Error(`missing state manifest ${group}`);
  return validateReleaseStateManifest(root,JSON.parse(readFileSync(path,'utf8')),{group,stateIds,...frozen});
}
export function writeReleaseStateManifest(root:string,group:string,stateIds:readonly string[],states:ReleaseStateReference[],frozen:FrozenRelease):ReleaseStateManifest{
  if(!/^[a-z0-9-]+$/.test(group))throw new Error(`invalid release state group ${group}`);
  const manifest=validateReleaseStateManifest(root,{version:2,sourceFingerprint:frozen.source,exportFingerprint:frozen.exported,group,expectedStateIds:[...stateIds],states},{group,stateIds,...frozen});
  atomicFile(root,`${RELEASE_EVIDENCE_DIRECTORY}/${group}.json`,JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

export type ReleaseStorageIndex={sourceFingerprint:string;exportFingerprint:string;groups:Array<{group:string;path:string;sha256:string;stateIds:string[];stateFiles:ReleaseStateReference[];profileCount:number}>};
export function* iterateReleaseStateRows(root:string,index:ReleaseStorageIndex):Generator<{state:ReleaseState;path:string;sha256:string;group:string}>{
  const frozen={source:index.sourceFingerprint,exported:index.exportFingerprint};
  for(const group of index.groups){
    if(digest(readFileSync(join(root,group.path)))!==group.sha256)throw new Error(`changed state manifest ${group.group}`);
    const manifest=readReleaseStateManifest(root,group.group,group.stateIds,frozen);
    if(JSON.stringify(manifest.states)!==JSON.stringify(group.stateFiles)||group.profileCount!==manifest.states.reduce((count,reference)=>count+reference.profileCount,0)||manifest.states.some(({profileCount})=>profileCount!==RELEASE_PROFILES.length))throw new Error(`state index capsule population differs for ${group.group}`);
    for(const reference of manifest.states)yield {state:readReleaseStateRecord(root,reference,frozen),path:reference.path,sha256:reference.sha256,group:group.group};
  }
}
export function* iterateReleaseProfileRows(root:string,index:ReleaseStorageIndex):Generator<{id:string;route:string;state:string;profile:ReleaseProfile;path:string;sha256:string}>{
  for(const {state,path,sha256}of iterateReleaseStateRows(root,index))for(const profile of state.profiles)yield{id:`${state.id}|profile:${profile.id}`,route:state.route,state:state.id,profile,path,sha256};
}
