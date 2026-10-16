import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import { ogCardCorpus } from '@/lib/og-card-corpus';
import { OG_MATRIX_SOURCE, ogMatrixDrift, parseOgMatrix, readOgMatrix } from '@/lib/og-card-matrix';

/**
 * VAL-B2-OG-001 and VAL-B2-OG-006: the sealed OG/X matrix in
 * contract/design-integrity.md §20 is the corpus population, and registry
 * truth has to keep equalling it until an owner-approved contract update.
 */
const ROOT = process.cwd();
const MARKDOWN = readFileSync(join(ROOT, OG_MATRIX_SOURCE), 'utf8');

describe('the sealed OG/X matrix', () => {
  it('seals one site card plus one card per published article, and the site-card destinations', () => {
    const matrix = readOgMatrix(ROOT);
    expect(matrix.rows.length).toBe(publishedModules().length + 1);
    expect(matrix.rows[0]).toEqual({ row: 1, routeOwner: 'site', assetPath: '/og/robot-wiki.png', cardId: 'site' });
    expect(matrix.structuredImageCount).toBe(publishedModules().length * 2);
    // Seven domain landings plus the standalone destinations; every one is
    // a non-article route.
    const articleRoutes = new Set(publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
    expect(matrix.siteDestinations.length).toBeGreaterThan(7);
    for (const route of matrix.siteDestinations) expect(articleRoutes.has(route), route).toBe(false);
  });

  it('equals the corpus the registry derives, card for card', () => {
    expect(ogMatrixDrift(readOgMatrix(ROOT), ogCardCorpus(ROOT))).toEqual([]);
  });

  it('reports a registry publish the contract has not sealed, and a sealed card the registry dropped', () => {
    const matrix = readOgMatrix(ROOT);
    const corpus = ogCardCorpus(ROOT).map(({ cardId, cardPath }) => ({ cardId, cardPath }));
    expect(ogMatrixDrift(matrix, [...corpus, { cardId: 'frontier/new-draft', cardPath: '/og/frontier/new-draft.png' }])).toEqual([
      expect.stringMatching(/frontier\/new-draft .* is not in the sealed matrix; an owner-approved contract update/),
    ]);
    expect(ogMatrixDrift(matrix, corpus.slice(0, -1))).toEqual([
      expect.stringMatching(/is not in the registry corpus/),
    ]);
  });

  it('refuses a matrix that is renumbered, miscounted, or pairs a route with another slug', () => {
    const row2 = /\| 2 \| `\/adjacent\/autonomous-vehicles\/` \| `\/og\/adjacent\/autonomous-vehicles\.png` \|/;
    expect(MARKDOWN).toMatch(row2);
    expect(() =>
      parseOgMatrix(MARKDOWN.replace(row2, '| 3 | `/adjacent/autonomous-vehicles/` | `/og/adjacent/autonomous-vehicles.png` |')),
    ).toThrow(/numbered/);
    expect(() =>
      parseOgMatrix(MARKDOWN.replace(row2, '| 2 | `/adjacent/autonomous-vehicles/` | `/og/adjacent/drones.png` |')),
    ).toThrow(/not its slug-bearing card/);
    expect(() => parseOgMatrix(MARKDOWN.replace(/^## 20\. Exact (\d+)-OG matrix$/m, '## 20. Exact 59-OG matrix'))).toThrow(
      /heading seals 59/,
    );
    expect(() => parseOgMatrix(MARKDOWN.replace('## 20. Exact', '## 20. Approximate'))).toThrow(/no "## 20/);
  });
});
