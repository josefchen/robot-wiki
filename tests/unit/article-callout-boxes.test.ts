import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { boxElements, boxImports, boxUses, mdxFiles } from '@/lib/article-boxes';

/**
 * Articles carry no boxed Callout or Aside panel: a real fact becomes one
 * cited sentence and a disclaimer is cut. Both components stay registered in
 * mdx-components.tsx, so an article can still mount one; this check keeps
 * them out and deliberately has no allowlist. The same scan runs in
 * vercel-build as scripts/check-article-boxes.ts (VAL-OPUS-151).
 */

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'content');
const tags = (source: string) => boxElements(source).map((use) => use.text);

describe('callout and aside boxes in articles', () => {
  it('finds a box however it is written', () => {
    const source = [
      '<Callout variant="warn" title="How to read this chart">',
      'Both curves are authored assumptions.',
      '</Callout>',
      '',
      '<Aside>A side note.</Aside>',
      '',
      '<Callout />',
    ].join('\n');
    expect(tags(source)).toEqual([
      '<Callout variant="warn" title="How to read this chart">',
      '<Aside>',
      '<Callout />',
    ]);
    expect(boxElements(source).map((use) => use.line)).toEqual([1, 5, 7]);
  });

  it('finds a box mounted under an import alias or a namespace', () => {
    const source = [
      "import { Callout as Note, Figure } from '@/components/ui';",
      "import * as UI from '@/components/ui';",
      '',
      '<Note title="Vendor-reported">Unreplicated.</Note>',
      '',
      '<UI.Aside>A side note.</UI.Aside>',
      '',
      '<Figure />',
    ].join('\n');
    expect(tags(source)).toEqual(['<Note title="Vendor-reported">', '<UI.Aside>']);
  });

  it('finds a box imported without being mounted', () => {
    const source = [
      "import { Callout } from '@/components/ui';",
      "import Note from '@/components/ui/aside';",
      "import { Figure } from '@/components/ui';",
      "export { Aside } from '@/components/ui';",
    ].join('\n');
    expect(boxImports(source).map((use) => use.line)).toEqual([1, 2, 4]);
  });

  it('does not count a box shown as code or left in a comment', () => {
    const source = [
      'Write `<Callout>` only in a code span.',
      '',
      '```mdx',
      '<Aside>example</Aside>',
      "import { Callout } from '@/components/ui';",
      '```',
      '',
      '{/* <Callout variant="info">retired</Callout> */}',
      '<!-- <Aside>retired</Aside> -->',
    ].join('\n');
    expect(tags(source)).toEqual([]);
    expect(boxImports(source)).toEqual([]);
  });

  it('reads every published article', () => {
    const scanned = new Set(mdxFiles(CONTENT).map((file) => relative(ROOT, file)));
    const published = publishedModules();
    expect(published.length).toBeGreaterThan(0);
    for (const entry of published) {
      expect(scanned.has(`content/${entry.domain}/${entry.slug}.mdx`), `${entry.domain}/${entry.slug}`).toBe(true);
    }
    expect(scanned.size).toBeGreaterThanOrEqual(published.length);
  });

  it('finds no box in any article', () => {
    expect(boxUses(CONTENT, ROOT)).toEqual([]);
  });

  it('runs in vercel-build with no allowlist, and a planted Callout and Aside each fail it', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['vercel-build']).toContain('node scripts/check-article-boxes.ts');
    const run = spawnSync(process.execPath, ['scripts/plant-article-boxes.ts'], { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('clean copy: exit 0');
    expect(run.stdout).toMatch(/^manipulation\/bc-foundations\.mdx: exit 1, names manipulation\/bc-foundations\.mdx:\d+$/m);
    expect(run.stdout).toMatch(/^frontier\/bear-case\.mdx: exit 1, names frontier\/bear-case\.mdx:\d+$/m);
  }, 60_000);
});
