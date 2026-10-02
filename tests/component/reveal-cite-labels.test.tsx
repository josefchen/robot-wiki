import { compile, evaluate } from '@mdx-js/mdx';
import { render } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as runtime from 'react/jsx-runtime';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { describe, expect, it } from 'vitest';
import { PredictThenReveal, SelfCheck } from '@/components/article/commit-to-reveal';
import { CITATIONS, citationLabel, getCitation } from '@/data/citations';
import rehypeRevealCiteLabels from '@/lib/rehype-reveal-cite-labels.mjs';

const root = resolve(import.meta.dirname, '../..');
const labels = Object.fromEntries(CITATIONS.map((citation) => [citation.id, citationLabel(citation)]));
const plugins = { rehypePlugins: [[rehypeRevealCiteLabels, { labels }]] as never };

async function mount(source: string) {
  const { default: Content } = await evaluate(source, { ...runtime, ...plugins });
  render(<Content components={{ PredictThenReveal, SelfCheck }} />);
  return [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#ref-"]')];
}

const options = (cited: string) => `options={[
  { value: 'cited', label: 'The cited answer', why: 'The bound is quadratic.', ${cited} },
  { value: 'plain', label: 'An uncited answer', why: 'This one carries no source.' },
]}`;

describe('rehype-reveal-cite-labels', () => {
  it('labels a self-check citation chip with the registry author-year label', async () => {
    const [chip, ...rest] = await mount(
      `<SelfCheck prompt="Which bound?" answer="cited" takeaway="Quadratic." ${options("cite: 'dagger-2011'")} />`,
    );
    expect(rest).toHaveLength(0);
    expect(chip.getAttribute('href')).toBe('#ref-dagger-2011');
    expect(chip.textContent).toBe(citationLabel(getCitation('dagger-2011')!));
    expect(chip.textContent).toBe('Ross et al. 2011');
  });

  it('labels a prediction-step citation chip the same way', async () => {
    const chips = await mount(
      `<PredictThenReveal prompt="Which bound?" answer="cited" takeaway="Quadratic." revealHint="The toy at 240 steps." ${options("cite: 'dagger-2011'")}>\n\nfigure\n\n</PredictThenReveal>`,
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(['Ross et al. 2011']);
  });

  it('keeps an authored label', async () => {
    const chips = await mount(
      `<SelfCheck prompt="Which bound?" answer="cited" takeaway="Quadratic." ${options("cite: 'dagger-2011', citeLabel: 'DAgger'")} />`,
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(['DAgger']);
  });

  it('fails the build on a citation id the registry lacks', async () => {
    await expect(
      evaluate(`<SelfCheck prompt="Q" answer="cited" takeaway="T." ${options("cite: 'no-such-source-1999'")} />`, {
        ...runtime,
        ...plugins,
      }),
    ).rejects.toThrow(/cites "no-such-source-1999", which the citation registry lacks/);
  });

  it('labels every cited answer option in the published articles', async () => {
    const files = readdirSync(join(root, 'content'), { recursive: true, encoding: 'utf8' })
      .filter((path) => path.endsWith('.mdx'))
      .map((path) => join('content', path))
      .filter((path) => /<(?:SelfCheck|PredictThenReveal)\b/.test(readFileSync(join(root, path), 'utf8')));
    expect(files.length).toBeGreaterThan(0);
    let cited = 0;
    for (const path of files) {
      const source = readFileSync(join(root, path), 'utf8');
      const ids = [...source.matchAll(/^\s+cite: '([^']+)'/gm)].map((match) => match[1]);
      const code = String(await compile(source, {
        remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath],
        ...plugins,
      }));
      const written = [...code.matchAll(/cite: (['"])([^'"]+)\1,\s*citeLabel: "([^"]+)"/g)]
        .map(([, , id, label]) => [id, label]);
      expect(written, path).toEqual(ids.map((id) => [id, citationLabel(getCitation(id)!)]));
      cited += ids.length;
    }
    expect(cited).toBe(3);
  });

  it('runs in the site MDX pipeline with the registry labels', () => {
    const config = readFileSync(join(root, 'next.config.ts'), 'utf8');
    expect(config).toContain("path.join(process.cwd(), 'lib/rehype-reveal-cite-labels.mjs')");
    expect(config).toContain('CITATIONS.map((citation) => [citation.id, citationLabel(citation)])');
  });
});
