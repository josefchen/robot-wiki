import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { maskMarkdownCode, scanJsxTags } from '@/lib/brand-v2-jsx-elements';

/**
 * Articles carry no boxed Callout or Aside panel: a real fact becomes one
 * cited sentence and a disclaimer is cut. Both components stay registered in
 * mdx-components.tsx, so an article can still mount one; this check keeps
 * them out and deliberately has no allowlist.
 */

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'content');
const BOXES = new Set(['Callout', 'Aside']);
const ALIAS = new RegExp(`\\b(?:${[...BOXES].join('|')})\\s+as\\s+([A-Za-z_$][\\w$]*)`, 'g');

function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return mdxFiles(full);
    return entry.name.endsWith('.mdx') ? [full] : [];
  });
}

/** Local names an import binds a box to, as in `import { Callout as Note }`. */
function importAliases(code: string): Set<string> {
  const aliases = new Set<string>();
  for (const statement of code.matchAll(/^import\s[^;]*?\sfrom\s/gm)) {
    for (const match of statement[0].matchAll(ALIAS)) aliases.add(match[1]);
  }
  return aliases;
}

/**
 * Opening box tags an MDX source mounts, under the registered name, an import
 * alias or a namespace (`<UI.Aside>`). Code examples and comments mount nothing.
 */
function boxElements(source: string): string[] {
  const code = maskMarkdownCode(source);
  const aliases = importAliases(code);
  return scanJsxTags(code)
    .filter((tag) => !tag.closing && (aliases.has(tag.name) || BOXES.has(tag.name.slice(tag.name.lastIndexOf('.') + 1))))
    .map((tag) => `<${tag.name}${tag.attributes}>`);
}

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
    expect(boxElements(source)).toEqual([
      '<Callout variant="warn" title="How to read this chart">',
      '<Aside>',
      '<Callout />',
    ]);
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
    expect(boxElements(source)).toEqual(['<Note title="Vendor-reported">', '<UI.Aside>']);
  });

  it('does not count a box shown as code or left in a comment', () => {
    const source = [
      'Write `<Callout>` only in a code span.',
      '',
      '```mdx',
      '<Aside>example</Aside>',
      '```',
      '',
      '{/* <Callout variant="info">retired</Callout> */}',
      '<!-- <Aside>retired</Aside> -->',
    ].join('\n');
    expect(boxElements(source)).toEqual([]);
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
    const offenders = mdxFiles(CONTENT).flatMap((file) =>
      boxElements(readFileSync(file, 'utf8')).map((tag) => `${relative(ROOT, file)}: ${tag}`),
    );
    expect(offenders).toEqual([]);
  });
});
