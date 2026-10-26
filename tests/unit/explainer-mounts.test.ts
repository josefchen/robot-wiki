import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { EXPLAINER_MOUNTS } from '@/components/explainers/mounts';
import { publishedModules } from '@/data/modules';
import { CAPTION_MAX_WORDS, words } from '@/lib/figure-system-paint';

/**
 * VAL-OPUS-153: each 3D explainer is mounted exactly once, by a one-line
 * mount in its home article, in the body after the article's first section
 * heading, right after the paragraph whose last sentence points the reader
 * at it, and never next to another explainer; every other home article the
 * curriculum names links to it instead.
 */

const ROOT = process.cwd();
const IMPORT = "import { ExplainerFigure } from '@/components/explainers/explainer-figure';";
const MOUNT = /^<ExplainerFigure id="([a-z]+)" \/>$/;

const ids = EXPLAINER_ORDER.map(({ id }) => id);
const articles = readdirSync(join(ROOT, 'content'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap(({ name: domain }) =>
    readdirSync(join(ROOT, 'content', domain))
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => `${domain}/${file.replace(/\.mdx$/, '')}`),
  );
const source = (article: string) => readFileSync(join(ROOT, 'content', `${article}.mdx`), 'utf8');
/** The article body after its frontmatter, as blank-line separated blocks. */
const blocks = (article: string) =>
  source(article)
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
/** A paragraph of article text: not an import, heading, table, formula, list or component mount. */
const isProse = (block: string) => !/^(import |export |#|\||\$\$|```|- |\d+\. |<(?!Term\b|Cite\b))/.test(block);

/** Every line in content/ that mentions the component, by article. */
const mentions = articles.flatMap((article) =>
  source(article)
    .split('\n')
    .filter((line) => line.includes('ExplainerFigure'))
    .map((line) => ({ article, line: line.trim() })),
);

describe('explainer mounts (VAL-OPUS-153)', () => {
  it('lists every catalog explainer once, in curriculum order', () => {
    expect(Object.keys(EXPLAINER_MOUNTS)).toEqual(ids);
  });

  it('mounts each explainer exactly once, in its home article, on one line', () => {
    const mounts = mentions.filter(({ line }) => line !== IMPORT);
    for (const { article, line } of mounts) expect(line, article).toMatch(MOUNT);
    const where = new Map<string, string[]>();
    for (const { article, line } of mounts) {
      const id = MOUNT.exec(line)![1] as string;
      where.set(id, [...(where.get(id) ?? []), article]);
    }
    for (const id of ids) expect(where.get(id), `#${id} is mounted in its home article only`).toEqual([EXPLAINER_MOUNTS[id].article]);
    expect([...where.keys()].sort()).toEqual([...ids].sort());
  });

  it('gives each home article one explainer, imported once, in a published article', () => {
    const homes: string[] = ids.map((id) => EXPLAINER_MOUNTS[id].article);
    expect(new Set(homes).size).toBe(homes.length);
    const published = new Set(publishedModules().map(({ domain, slug }) => `${domain}/${slug}`));
    for (const article of homes) {
      expect(published.has(article), article).toBe(true);
      expect(source(article).split('\n').filter((line) => line === IMPORT), article).toHaveLength(1);
    }
    for (const article of articles.filter((a) => !homes.includes(a))) {
      expect(source(article), article).not.toContain('ExplainerFigure');
    }
  });

  it('places each mount in the body, after the paragraph whose last sentence refers to it', () => {
    for (const id of ids) {
      const { article, cue } = EXPLAINER_MOUNTS[id];
      const body = blocks(article);
      const at = body.indexOf(`<ExplainerFigure id="${id}" />`);
      expect(at, `${article} mounts #${id}`).toBeGreaterThan(0);
      expect(body.slice(0, at).some((block) => /^## /.test(block)), `${article}: #${id} sits below a section heading`).toBe(true);
      const before = body[at - 1] as string;
      expect(isProse(before), `${article}: prose just before #${id}`).toBe(true);
      expect(before.endsWith(` ${cue}`), `${article}: the paragraph before #${id} ends "${cue}"`).toBe(true);
      expect(source(article).split(cue).length - 1, `${article}: the cue appears once`).toBe(1);
      for (const near of [body[at - 2], body[at + 1]]) {
        expect(near ?? '', `${article}: no explainer stacked beside #${id}`).not.toMatch(/^<ExplainerFigure /);
      }
    }
  });

  it('points each cue at the figure below and names no other figure', () => {
    for (const id of ids) {
      const { cue } = EXPLAINER_MOUNTS[id];
      expect(cue, id).toMatch(/\bthe figure below\b/);
      expect(cue, id).toMatch(/[.]$/);
      expect(cue.split(/(?<=[.!?])\s+/), id).toHaveLength(1);
      expect(cue, id).not.toMatch(/[—–]|<Cite|\]\(/);
    }
  });

  it('links to each explainer from the other home articles, which do not mount it', () => {
    for (const id of ids) {
      for (const article of EXPLAINER_MOUNTS[id].linkedFrom) {
        expect(articles, article).toContain(article);
        expect(source(article), `${article} links #${id}`).toContain(`](/how-robots-work/#${id})`);
        expect(source(article), article).not.toContain(`<ExplainerFigure id="${id}" />`);
      }
    }
  });

  it('captions each mount in one plain sentence of 25 words or fewer', () => {
    for (const id of ids) {
      const { caption } = EXPLAINER_MOUNTS[id];
      expect(words(caption), id).toBeLessThanOrEqual(CAPTION_MAX_WORDS);
      expect(caption.split(/(?<=[.!?])\s+/).filter(Boolean), id).toHaveLength(1);
      expect(caption, id).not.toMatch(/[—–]|\s-\s/);
    }
  });
});
