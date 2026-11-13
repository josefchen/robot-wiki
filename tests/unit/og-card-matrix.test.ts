import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { ogCardCorpus } from '@/lib/og-card-corpus';
import { ogMatrixDrift, readOgMatrix } from '@/lib/og-card-matrix';

describe('the Open Graph card population', () => {
  it('holds one site card plus one card per published article', () => {
    const matrix = readOgMatrix();
    expect(matrix.rows.length).toBe(publishedModules().length + 1);
    expect(matrix.rows[0]).toEqual({ row: 1, routeOwner: 'site', assetPath: '/og/robot-wiki.png', cardId: 'site' });
    expect(matrix.structuredImageCount).toBe(publishedModules().length * 2);
    for (const row of matrix.rows.slice(1)) {
      expect(row.assetPath).toBe(`/og${row.routeOwner.replace(/\/$/, '')}.png`);
    }
  });

  it('gives the site card only to routes that are not articles', () => {
    const articleRoutes = new Set(publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
    const { siteDestinations } = readOgMatrix();
    expect(new Set(siteDestinations).size).toBe(siteDestinations.length);
    for (const route of siteDestinations) expect(articleRoutes.has(route), route).toBe(false);
  });

  it('equals the corpus the renderer builds, card for card', () => {
    expect(ogMatrixDrift(readOgMatrix(), ogCardCorpus(process.cwd()))).toEqual([]);
  });

  it('reports an extra card and a missing card', () => {
    const matrix = readOgMatrix();
    const corpus = ogCardCorpus(process.cwd()).map(({ cardId, cardPath }) => ({ cardId, cardPath }));
    expect(ogMatrixDrift(matrix, [...corpus, { cardId: 'frontier/new-draft', cardPath: '/og/frontier/new-draft.png' }])).toEqual([
      expect.stringMatching(/frontier\/new-draft .* is not a published article/),
    ]);
    expect(ogMatrixDrift(matrix, corpus.slice(0, -1))).toEqual([expect.stringMatching(/is not in the corpus/)]);
  });
});
