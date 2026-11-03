// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { RELEASE_BUILD_COMMANDS, RELEASE_BUILD_STAMP, releaseBuildProblems, readReleaseBuildStamp, releaseExportFingerprint, type ReleaseBuildStamp } from '@/lib/brand-v2-release-build';
import { releaseSourceFingerprint } from '@/lib/brand-v2-release-evidence';

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'release-build-')); temporary.push(root);
  for (const directory of ['app', 'public/pagefind', 'out/pagefind', 'evidence/brand-v2/release']) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, 'app/page.tsx'), 'current source');
  writeFileSync(join(root, 'public/asset.bin'), 'asset-input');
  writeFileSync(join(root, 'out/index.html'), 'built-home');
  writeFileSync(join(root, 'out/asset.bin'), 'asset-output');
  for(const directory of ['public','out']){writeFileSync(join(root,directory,'search-index.json'),'{}');writeFileSync(join(root,directory,'pagefind/pagefind.js'),'export const source="measured";');}
  const current = { source: releaseSourceFingerprint(root), exported: releaseExportFingerprint(root) };
  const stamp: ReleaseBuildStamp = { version: 1, sourceBefore: current.source, sourceAfter: current.source, exportFingerprint: current.exported,
    commands: RELEASE_BUILD_COMMANDS.map((argv) => ({ argv: [...argv], exitCode: 0 })) };
  writeFileSync(join(root, RELEASE_BUILD_STAMP), JSON.stringify(stamp));
  return { root, current, stamp };
}

describe('frozen production build stamp', () => {
  it('binds a successful complete build to unchanged source and every exported byte', () => {
    const {root,current,stamp}=fixture();
    expect(releaseBuildProblems(stamp,current)).toEqual([]);
    expect(readReleaseBuildStamp(root)).toEqual(stamp);
  });
  it.each([
    ['failed build',(s:ReleaseBuildStamp)=>{s.commands[0].exitCode=1;}],
    ['partial build',(s:ReleaseBuildStamp)=>{s.commands.pop();}],
    ['replacement command',(s:ReleaseBuildStamp)=>{s.commands[0].argv=['true'];}],
    ['source changed during build',(s:ReleaseBuildStamp)=>{s.sourceBefore='a'.repeat(64);}],
    ['stale export',(s:ReleaseBuildStamp)=>{s.exportFingerprint='a'.repeat(64);}],
    ['stale source',(s:ReleaseBuildStamp)=>{s.sourceBefore=s.sourceAfter='a'.repeat(64);}],
  ])('rejects %s',(_label,mutate)=>{const {current,stamp}=fixture();mutate(stamp);expect(releaseBuildProblems(stamp,current).length).toBeGreaterThan(0);});
  it('rejects changed, added or missing exported assets and changed public source',()=>{
    for(const change of ['changed','added','missing','source']) {
      const {root}=fixture();
      if(change==='changed')writeFileSync(join(root,'out/asset.bin'),'changed bytes');
      if(change==='added')writeFileSync(join(root,'out/another.bin'),'new bytes');
      if(change==='missing')rmSync(join(root,'out/asset.bin'));
      if(change==='source')writeFileSync(join(root,'public/asset.bin'),'changed input asset');
      expect(()=>readReleaseBuildStamp(root)).toThrow();
    }
  });
  it('does not accept a missing home page or an empty export',()=>{
    const {root}=fixture();rmSync(join(root,'out/index.html'));expect(()=>releaseExportFingerprint(root)).toThrow('home page');
  });
  it.each(['changed','added','missing'] as const)('rejects a %s generated public mirror without treating it as source',change=>{
    const {root,current}=fixture();
    if(change==='changed')writeFileSync(join(root,'public/search-index.json'),'{"wrong":true}');
    if(change==='added')writeFileSync(join(root,'public/pagefind/extra.js'),'unmeasured');
    if(change==='missing')rmSync(join(root,'public/pagefind/pagefind.js'));
    expect(releaseSourceFingerprint(root)).toBe(current.source);expect(()=>readReleaseBuildStamp(root)).toThrow(/mirror/);
  });
});
