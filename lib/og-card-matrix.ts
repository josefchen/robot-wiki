import { publishedModules } from '../data/modules.ts';
import { SITE_CARD_PATH, articleCardPath } from './og-cards.ts';

/**
 * The Open Graph card population: the site card plus one card per published
 * article, derived from the module registry.
 */
export type OgMatrixRow = {
  row: number;
  /** `site` for row 1, otherwise the article route, e.g. `/classical/control/`. */
  routeOwner: string;
  assetPath: string;
  /** `site` or `<domain>/<slug>`, the corpus card identifier. */
  cardId: string;
};

export type OgMatrix = {
  rows: OgMatrixRow[];
  /** The non-article destinations that share the site card. */
  siteDestinations: string[];
  /** Two structured search images per article: 4:3 and square. */
  structuredImageCount: number;
};

/** Every route that is not an article shares the site card. */
export const SITE_CARD_DESTINATIONS = [
  '/',
  '/a-z/',
  '/market-map/',
  '/playground/',
  '/how-robots-work/',
  '/glossary/',
  '/credits/',
  '/editorial-policy/',
  '/about/',
  '/privacy/',
  '/search/',
  '/adjacent/',
  '/classical/',
  '/data-hardware/',
  '/frontier/',
  '/manipulation/',
  '/rl-sim2real/',
  '/world-models/',
] as const;

export function readOgMatrix(): OgMatrix {
  const articles = publishedModules()
    .map(({ domain, slug }) => ({ domain, slug, route: `/${domain}/${slug}/` }))
    .sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));
  const rows: OgMatrixRow[] = [
    { row: 1, routeOwner: 'site', assetPath: SITE_CARD_PATH, cardId: 'site' },
    ...articles.map(({ domain, slug, route }, index) => ({
      row: index + 2,
      routeOwner: route,
      assetPath: articleCardPath(domain, slug),
      cardId: `${domain}/${slug}`,
    })),
  ];
  return {
    rows,
    siteDestinations: [...SITE_CARD_DESTINATIONS],
    structuredImageCount: articles.length * 2,
  };
}

/**
 * The difference between the expected card population and the corpus the
 * renderer built; empty when they agree.
 */
export function ogMatrixDrift(
  matrix: OgMatrix,
  corpus: ReadonlyArray<{ cardId: string; cardPath: string }>,
): string[] {
  const expected = new Map(matrix.rows.map((row) => [row.cardId, row.assetPath]));
  const derived = new Map(corpus.map(({ cardId, cardPath }) => [cardId, cardPath]));
  const drift: string[] = [];
  for (const [cardId, assetPath] of expected) {
    if (!derived.has(cardId)) drift.push(`expected ${cardId} (${assetPath}) is not in the corpus`);
    else if (derived.get(cardId) !== assetPath) {
      drift.push(`${cardId} ships ${derived.get(cardId)}; expected ${assetPath}`);
    }
  }
  for (const [cardId, cardPath] of derived) {
    if (!expected.has(cardId)) drift.push(`corpus card ${cardId} (${cardPath}) is not a published article`);
  }
  return drift;
}
