import { z } from 'zod';

const text=z.string();
const target=z.object({selector:z.string().min(1),tag:text,name:text,role:text.nullable(),testId:text.nullable()}).strict();
const region=z.object({id:z.string().min(1),tag:text,role:text.nullable(),ariaLive:text.nullable(),ariaAtomic:text.nullable(),attributes:z.record(text,text),ownerFrame:text.nullable(),playbackControl:target.nullable(),selfCheck:z.object({prompt:text,selected:text.nullable()}).strict().nullable(),text,hidden:z.boolean()}).strict();
export const releaseLiveRegionSchema=region;
export const releaseActivitySchema=z.object({
  version:z.literal(1),url:text,initialUrl:text,elapsedMs:z.number().nonnegative(),truncated:z.boolean(),
  startFocus:target.nullable(),endFocus:target.nullable(),
  initialRegions:z.array(region),finalRegions:z.array(region),finalRegionCount:z.number().int().nonnegative(),
  operations:z.array(z.object({id:z.number().int().positive(),atMs:z.number().nonnegative(),kind:z.enum(['keydown','input','change','pointer-click','pointer-hover']),key:text.nullable(),trusted:z.boolean(),target,focusBefore:target.nullable(),focusAfter:target.nullable()}).strict()),
  changes:z.array(z.object({order:z.number().int().positive(),url:text,atMs:z.number().nonnegative(),operationId:z.number().int().positive().nullable(),focus:target.nullable(),before:region.nullable(),after:region.nullable()}).strict()),
}).strict();
export type ReleaseActivity=z.infer<typeof releaseActivitySchema>;

export function liveRegionPoliteness(region:ReleaseActivity['finalRegions'][number]):string|null{
  return region.ariaLive??(region.role==='alert'?'assertive':region.role==='status'||region.role==='log'||region.tag==='OUTPUT'?'polite':null);
}

/** Structural/event integrity is independent of expected message bindings.
 * These observations never claim a particular assistive technology spoke. */
export function releaseActivityProblems(reading:ReleaseActivity):string[]{
  const failures:string[]=[];
  if(reading.truncated)failures.push('live observer exceeded its bounded event capacity');
  if(reading.finalRegions.length!==reading.finalRegionCount||new Set(reading.finalRegions.map(({id})=>id)).size!==reading.finalRegions.length)failures.push('final live-region census is missing or duplicated');
  if(new Set(reading.initialRegions.map(({id})=>id)).size!==reading.initialRegions.length)failures.push('initial live-region census is duplicated');
  const operations=new Map(reading.operations.map((operation)=>[operation.id,operation]));
  const replay=new Map(reading.initialRegions.map(region=>[region.id,region]));
  if(operations.size!==reading.operations.length)failures.push('native operation identities are duplicated');
  let previous=-1;
  for(const [index,operation]of reading.operations.entries()){
    if(operation.id!==index+1||operation.atMs<previous||operation.atMs>reading.elapsedMs)failures.push(`operation ${operation.id}: non-deterministic sequence or timing`);
    if(operation.kind==='keydown'&&!operation.key)failures.push(`operation ${operation.id}: keyboard key omitted`);
    previous=operation.atMs;
  }
  previous=-1;
  const messages=new Map<string,number>();
  for(const [index,change]of reading.changes.entries()){
    if(change.order!==index+1||change.atMs<previous||change.atMs>reading.elapsedMs)failures.push(`live change ${change.order}: non-deterministic sequence or timing`);
    const operation=change.operationId===null?null:operations.get(change.operationId);
    if(change.operationId!==null&&(!operation||operation.atMs>change.atMs))failures.push(`live change ${change.order}: missing or later owning operation`);
    if(!change.before&&!change.after)failures.push(`live change ${change.order}: no actual region reading`);
    if(change.before&&change.after&&change.before.id!==change.after.id)failures.push(`live change ${change.order}: changed region identity`);
    const id=(change.before??change.after)?.id;
    if(id){
      if(JSON.stringify(replay.get(id)??null)!==JSON.stringify(change.before))failures.push(`live change ${change.order}: omitted, reordered or changed prior region state`);
      if(change.after)replay.set(id,change.after);else replay.delete(id);
    }
    const live=change.after?liveRegionPoliteness(change.after):null;
    if(change.after&&!change.after.hidden&&change.after.text&&change.before?.text!==change.after.text&&live!=='off'){
      if(live!=='polite'&&live!=='assertive')failures.push(`live change ${change.order}: changed message lacks live semantics`);
      const key=`${change.operationId??'initial'}\0${change.after.text}`;
      if(messages.has(key))failures.push(`live change ${change.order}: duplicate message for one operation`);
      messages.set(key,change.order);
    }
    previous=change.atMs;
  }
  const sorted=(regions:ReleaseActivity['finalRegions'])=>[...regions].sort((a,b)=>a.id.localeCompare(b.id));
  if(JSON.stringify(sorted([...replay.values()]))!==JSON.stringify(sorted(reading.finalRegions)))failures.push('final live-region state differs from the complete mutation replay');
  return failures;
}
