import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { publishedModules } from '@/data/modules';
import { MIN_DISTINCT_SOURCES, countArticleSources, normaliseUrl, sourceKey } from '@/lib/article-sources';

/**
 * VAL-OPUS-152: every published article cites at least 30 distinct sources
 * inline, where entries sharing an arXiv id, a DOI or a normalised URL count
 * once. scripts/check-article-sources.ts enforces it in vercel-build with no
 * exemption list.
 */
const byId = new Map(CITATIONS.map((citation) => [citation.id, citation]));

describe('distinct sources per article', () => {
  it('counts registry entries that share an arXiv id, DOI or normalised URL once', () => {
    expect(sourceKey({ url: 'https://arxiv.org/abs/2303.04137', arxiv: '2303.04137' }))
      .toBe(sourceKey({ url: 'https://arxiv.org/abs/2303.04137v1', arxiv: '2303.04137' }));
    expect(sourceKey({ url: 'https://arxiv.org/pdf/2410.24164' })).toBe('arxiv:2410.24164');
    expect(sourceKey({ url: 'https://doi.org/10.15607/RSS.2023.XIX.016' }))
      .toBe(sourceKey({ url: 'https://doi.org/10.15607/rss.2023.xix.016/' }));
    expect(normaliseUrl('https://www.Example.com/a/b/?utm=1#x')).toBe('example.com/a/b');
    expect(sourceKey({ url: 'https://example.com/a' })).not.toBe(sourceKey({ url: 'https://example.com/b' }));
  });

  it('counts only inline citations, not front-matter ids rendered as further reading', () => {
    const [row] = countArticleSources(join(process.cwd(), 'content'), [{ domain: 'manipulation', slug: 'diffusion-policy' }],
      (id) => byId.get(id));
    const source = readFileSync('content/manipulation/diffusion-policy.mdx', 'utf8');
    for (const id of row.cited) expect(source).toContain(`<Cite id="${id}"`);
    // diffusion-policy-2023 and -v1 are one arXiv paper.
    expect(row.cited).toEqual(expect.arrayContaining(['diffusion-policy-2023', 'diffusion-policy-2023-v1']));
    expect(row.sources.length).toBe(row.cited.length - 1);
  });

  it(`finds at least ${MIN_DISTINCT_SOURCES} distinct cited sources on every published article`, () => {
    const rows = countArticleSources(join(process.cwd(), 'content'), publishedModules(), (id) => byId.get(id));
    expect(rows.length).toBe(publishedModules().length);
    expect(rows.filter((row) => row.unknown.length > 0)).toEqual([]);
    expect(rows.filter((row) => row.sources.length < MIN_DISTINCT_SOURCES)
      .map((row) => `${row.route}: ${row.sources.length}`)).toEqual([]);
  });

  it('runs in vercel-build, and an article cut to 29 sources fails it with route and count', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['vercel-build']).toContain('node scripts/check-article-sources.ts');
    const run = spawnSync(process.execPath, ['scripts/plant-article-sources.ts'], { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('clean copy: exit 0');
    expect(run.stdout).toContain('/manipulation/action-chunking/ cut to 29: exit 1, names the route and count');
  }, 60_000);
});
