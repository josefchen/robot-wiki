import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import { articleCardElement, siteCardElement, type CardNode } from './og-card-artwork.ts';
import { articleCardFacts } from './og-card-facts.ts';
import { SITE_CARD_PATH, articleCardPath } from './og-cards.ts';

/**
 * The Open Graph card corpus: the single source of the element trees the
 * site ships, and of the file each one is written to.
 *
 * `scripts/generate-og-cards.ts` renders these entries and writes them to
 * their `cardPath`; the font and colour inspections walk the same entries.
 * That is a load-bearing property rather than a convenience: while the
 * generator built its own trees, a painted-colour change made only in the
 * generator left the evidence corpus unchanged, so the artifact measured a
 * replica of the artwork rather than the artwork. `rendererSourceIdentity`
 * enforces the single source structurally, and every consumer must obtain
 * card trees here rather than calling the artwork builders again.
 *
 * The identifier makes the per-card population addressable: a persisted
 * painted-colour record that reports only a total can agree with itself
 * after a short walk, while a per-card record has to name the same cards
 * this derivation names.
 */
export type OgCardCorpusEntry = {
  /** `site` for the site card, `<domain>/<slug>` for an article card. */
  cardId: string;
  /** Site-absolute PNG path the generator writes, e.g. `/og/<domain>/<slug>.png`. */
  cardPath: string;
  card: CardNode;
};

export function ogCardCorpus(root: string): OgCardCorpusEntry[] {
  const corpus: OgCardCorpusEntry[] = [
    { cardId: 'site', cardPath: SITE_CARD_PATH, card: siteCardElement() },
  ];
  for (const entry of publishedModules()) {
    const mdx = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    corpus.push({
      cardId: `${entry.domain}/${entry.slug}`,
      cardPath: articleCardPath(entry.domain, entry.slug),
      card: articleCardElement({
        entry,
        domainName: DOMAIN_META[entry.domain].name,
        ...articleCardFacts(mdx),
      }),
    });
  }
  const ids = new Set(corpus.map(({ cardId }) => cardId));
  if (ids.size !== corpus.length) {
    throw new Error('The Open Graph card corpus repeats a card identifier');
  }
  const paths = new Set(corpus.map(({ cardPath }) => cardPath));
  if (paths.size !== corpus.length) {
    throw new Error('The Open Graph card corpus repeats a card path');
  }
  return corpus;
}
