import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import { articleCardElement, siteCardElement, type CardNode } from './og-card-artwork.ts';
import { articleCardFacts } from './og-card-facts.ts';

/**
 * The shipped Open Graph card corpus as identified element trees.
 *
 * The font and colour inspections walk this population rather than
 * restating what the corpus is meant to contain, and the identifier makes
 * the per-card population addressable: a persisted painted-colour record
 * that reports only a total can agree with itself after a short walk, while
 * a per-card record has to name the same cards this derivation names.
 */
export type OgCardCorpusEntry = {
  /** `site` for the site card, `<domain>/<slug>` for an article card. */
  cardId: string;
  card: CardNode;
};

export function ogCardCorpus(root: string): OgCardCorpusEntry[] {
  const corpus: OgCardCorpusEntry[] = [
    { cardId: 'site', card: siteCardElement() },
  ];
  for (const entry of publishedModules()) {
    const mdx = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    corpus.push({
      cardId: `${entry.domain}/${entry.slug}`,
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
  return corpus;
}

/** The element tree of every card the generator ships. */
export function ogCardElements(root: string): CardNode[] {
  return ogCardCorpus(root).map(({ card }) => card);
}
