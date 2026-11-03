import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync,lstatSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { releaseSourceFingerprint } from './brand-v2-release-evidence.ts';
import { RELEASE_GENERATED_SEARCH_MIRRORS } from './brand-v2-release-source.ts';

export const RELEASE_BUILD_STAMP = 'evidence/brand-v2/release/build.json';
export const RELEASE_BUILD_COMMANDS = [
  ['npm', 'run', 'build:ungated'],
  ['node', 'scripts/prune-export-artifacts.ts'],
  ['node', 'scripts/patch-404-guard.ts'],
  ['node', 'scripts/build-search.ts'],
] as const;
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const releaseBuildSchema = z.object({
  version: z.literal(1), sourceBefore: sha, sourceAfter: sha, exportFingerprint: sha,
  commands: z.array(z.object({ argv: z.array(z.string()).min(1), exitCode: z.number().int() }).strict()).min(1),
}).strict();
export type ReleaseBuildStamp = z.infer<typeof releaseBuildSchema>;

/** Search mirrors are generated deployment outputs, never independent
 * source inputs. Their full population and bytes must equal the sealed
 * export, including the copy Vercel collects from public/ after the build. */
export function releaseGeneratedSearchMirrorProblems(root:string):string[]{
  const failures:string[]=[];
  const files=(base:string):string[]=>{
    if(!existsSync(join(root,base))||lstatSync(join(root,base)).isSymbolicLink())throw new Error(`missing or linked generated mirror ${base}`);
    return readdirSync(join(root,base),{withFileTypes:true}).flatMap(entry=>{
      if(entry.isSymbolicLink())throw new Error(`linked generated mirror ${base}/${entry.name}`);
      return entry.isDirectory()?files(base+'/'+entry.name).map(path=>entry.name+'/'+path):entry.isFile()?[entry.name]:[];
    }).sort();
  };
  for(const mirror of RELEASE_GENERATED_SEARCH_MIRRORS){
    try{
      const paths=mirror.kind==='directory'?files(mirror.exported):[''];
      if(mirror.kind==='directory'&&(!paths.includes('pagefind.js')||JSON.stringify(paths)!==JSON.stringify(files(mirror.source))))failures.push(`${mirror.source}: generated mirror population differs from sealed export`);
      for(const path of paths){
        const a=join(root,mirror.source,path),b=join(root,mirror.exported,path);
        if(!existsSync(a)||lstatSync(a).isSymbolicLink()||!lstatSync(a).isFile()||!existsSync(b)||lstatSync(b).isSymbolicLink()||!readFileSync(a).equals(readFileSync(b)))failures.push(`${mirror.source}/${path}: generated mirror bytes differ from sealed export`);
      }
    }catch(error){failures.push(error instanceof Error?error.message:String(error));}
  }
  return failures;
}

type ValidationScope={root:string;stamp:ReleaseBuildStamp;stampHash:string;depth:number};
type ValidationTicket={scope:ValidationScope;closed:boolean};
let validationScope:ValidationScope|null=null;

/** A synchronous read-only validation run hashes the complete source/export
 * at entry and exit. Nested readers reuse that frozen identity, while state
 * capsules always re-hash their own immutable bytes. No scope survives a
 * finished run or accepts source/export changes at the final boundary. */
export function beginReleaseValidation(root:string):ValidationTicket{
  if(validationScope){
    if(validationScope.root!==root)throw new Error('cannot mix release validation roots');
    validationScope.depth++;return {scope:validationScope,closed:false};
  }
  const stamp=readReleaseBuildStamp(root);
  const stampHash=createHash('sha256').update(readFileSync(join(root,RELEASE_BUILD_STAMP))).digest('hex');
  validationScope={root,stamp,stampHash,depth:1};
  return {scope:validationScope,closed:false};
}
export function finishReleaseValidation(ticket:ValidationTicket):void{
  if(ticket.closed)return;
  if(validationScope!==ticket.scope)throw new Error('release validation scope was replaced');
  ticket.closed=true;
  if(--ticket.scope.depth>0)return;
  validationScope=null;
  const after=readReleaseBuildStamp(ticket.scope.root);
  const stampHash=createHash('sha256').update(readFileSync(join(ticket.scope.root,RELEASE_BUILD_STAMP))).digest('hex');
  if(after.sourceAfter!==ticket.scope.stamp.sourceAfter||after.exportFingerprint!==ticket.scope.stamp.exportFingerprint||stampHash!==ticket.scope.stampHash)throw new Error('source/export/build stamp changed during the validated release run');
}
export function withReleaseValidation<T>(root:string,read:()=>T):T{
  const ticket=beginReleaseValidation(root);
  try{
    const value=read();
    if(value&&typeof value==='object'&&'then'in value)throw new Error('release validation scope must be synchronous');
    return value;
  }finally{finishReleaseValidation(ticket);}
}

export function releaseExportFingerprint(root: string): string {
  const hash = createHash('sha256'); let files = 0;
  const walk = (directory: string) => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`release export contains a symlink: ${path}`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) { hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0'); files += 1; }
    }
  };
  if (!existsSync(join(root, 'out/index.html'))) throw new Error('release export has no home page');
  walk('out');
  if (files < 2) throw new Error('release export has no nonempty asset population');
  return hash.digest('hex');
}

export function releaseBuildProblems(input: unknown, current: { source: string; exported: string }): string[] {
  const parsed = releaseBuildSchema.safeParse(input);
  if (!parsed.success) return [`invalid release build stamp: ${parsed.error.message}`];
  const stamp = parsed.data; const failures: string[] = [];
  if (stamp.sourceBefore !== stamp.sourceAfter) failures.push('source changed during production build; freeze derived files and rebuild');
  if (stamp.sourceAfter !== current.source) failures.push('production build has a stale source fingerprint');
  if (stamp.exportFingerprint !== current.exported) failures.push('production export bytes changed after the build');
  if (JSON.stringify(stamp.commands.map(({ argv }) => argv)) !== JSON.stringify(RELEASE_BUILD_COMMANDS)) failures.push('production build command sequence differs');
  if (stamp.commands.some(({ exitCode }) => exitCode !== 0)) failures.push('production build command failed');
  return failures;
}

export function readReleaseBuildStamp(root: string): ReleaseBuildStamp {
  if(validationScope?.root===root)return validationScope.stamp;
  const stamp: unknown = JSON.parse(readFileSync(join(root, RELEASE_BUILD_STAMP), 'utf8'));
  const failures = [...releaseBuildProblems(stamp, { source: releaseSourceFingerprint(root), exported: releaseExportFingerprint(root) }),...releaseGeneratedSearchMirrorProblems(root)];
  if (failures.length) throw new Error(failures.join('\n'));
  return releaseBuildSchema.parse(stamp);
}
