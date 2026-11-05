import {createHash}from 'node:crypto';
import {existsSync,readFileSync,readdirSync}from 'node:fs';
import {join}from 'node:path';

export const RELEASE_SOURCE_ROOTS = ['app', 'components', 'content', 'data', 'lib', 'scripts', 'tests', 'contract', 'public', 'audit', 'assets', 'library', 'evidence/brand-v2/baseline'] as const;
const GENERATED_INPUTS = new Set(['contract/brand-v2-enforcement-map.json']);
export const RELEASE_GENERATED_SEARCH_MIRRORS=[{source:'public/search-index.json',exported:'out/search-index.json',kind:'file'},{source:'public/pagefind',exported:'out/pagefind',kind:'directory'}] as const;
const generatedMirror=(path:string)=>RELEASE_GENERATED_SEARCH_MIRRORS.some(mirror=>path===mirror.source||mirror.kind==='directory'&&path.startsWith(mirror.source+'/'));
const ROOT_INPUTS = ['PANTHEON-SPEC.md', 'README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'CLAUDE.md', '.gitignore', 'package.json', 'package-lock.json', 'next.config.ts', 'postcss.config.mjs', 'motion-tokens.json', 'motion-clips.json', 'playwright.config.ts', 'playwright.brand-v2.config.ts', 'playwright.release.config.ts', 'tsconfig.json', 'next-env.d.ts', 'eslint.config.mjs', 'vitest.config.mts', 'vitest.setup.ts'];
const RELEASE_TOOLING_INSTRUCTION_HASHES:Readonly<Record<string,readonly string[]>>={
  // Exact reviewed project instructions and the pinned Next16.3 scaffold.
  'AGENTS.md':['e5b0e885f1c6ae9fd1997240328b750cbcbcee1b87393660b639c73e0ea005f9','63f2c50380ed6303237cce215ce27af1d620d094c215e28d1b1538a3c070e3bb'],
  'CLAUDE.md':['336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49'],
};
export const RELEASE_TOOLING_IGNORE_NOTE='# `next dev`/`next build` maintains only the marked Next.js block inside the\n# root AGENTS.md and preserves the project instructions around it. AGENTS.md\n# is tracked because it carries the Robot Wiki design-system contract.\n\n';

/** The public release tree makes these exact tooling-only transformations.
 * Pinned instruction bytes may be absent; unfamiliar bytes fail. All real
 * source, test, contract, ignore rules and declaration content stay bound. */
export function canonicalReleaseSourceBytes(path:string,bytes:Buffer):Buffer|null{
  const allowed=RELEASE_TOOLING_INSTRUCTION_HASHES[path];
  if(allowed){
    if(!allowed.includes(createHash('sha256').update(bytes).digest('hex')))throw new Error(`unreviewed release-tooling instruction bytes: ${path}`);
    return null;
  }
  if(path==='.gitignore')return Buffer.from(bytes.toString('utf8').replaceAll(RELEASE_TOOLING_IGNORE_NOTE,''));
  if(path==='next-env.d.ts'){
    let text=bytes.toString('utf8');
    for(const name of ['routes','root-params'])text=text.replaceAll(`import "./.next/dev/types/${name}.d.ts";`,`import "./.next/types/${name}.d.ts";`);
    return Buffer.from(text);
  }
  return bytes;
}

function filesBelow(root: string, directory: string): string[] {
  const path = join(root, directory);
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name);
    if(entry.isSymbolicLink())throw new Error(`release source contains an unbound symlink: ${child}`);
    return entry.isDirectory() ? filesBelow(root, child) : entry.isFile() ? [child] : [];
  });
}

export function releaseSourceFingerprint(root: string): string {
  const paths = [...RELEASE_SOURCE_ROOTS.flatMap((directory) => filesBelow(root, directory)),
    ...ROOT_INPUTS.filter((path) => existsSync(join(root, path)))].filter((path) => !GENERATED_INPUTS.has(path)&&!generatedMirror(path)).sort();
  if (paths.length === 0) throw new Error('release evidence: source population is empty');
  const hash = createHash('sha256');
  let counted=0;
  for (const path of paths){const bytes=canonicalReleaseSourceBytes(path,readFileSync(join(root,path)));if(bytes!==null){hash.update(path).update('\0').update(bytes).update('\0');counted++;}}
  if(!counted)throw new Error('release evidence: non-tooling source population is empty');
  return hash.digest('hex');
}
