import { createHash } from 'node:crypto';
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
  card: SealedCardTree;
};

/**
 * A card tree, handed out as an opaque final value.
 *
 * A shared corpus alone does not make the measured tree the shipped tree:
 * while `card` was the element tree itself, the generator could wrap,
 * substitute or edit it on the way to `ImageResponse`. That changed all 48
 * shipped cards, and it moved the generator fingerprint — but a fingerprint
 * is a drift detector, not an invariant, so the next sanctioned evidence
 * refresh recorded the new fingerprint and re-certified the unchanged
 * corpus-derived painted-property numbers.
 *
 * The tree itself is therefore not reachable from this handle at all: it is
 * held in a module-private registry, and `openSealedCardTree` is the only
 * way back to it. A handle this module did not mint cannot be opened, so a
 * wrapped or substituted tree cannot be presented as a corpus card, and the
 * digest is re-derived on every open, so a tree edited in place after
 * sealing is rejected rather than rendered.
 */
export type SealedCardTree = {
  /** sha256 of the sealed tree, re-derived and compared on every open. */
  readonly cardTreeDigest: string;
};

const sealedTrees = new WeakMap<SealedCardTree, CardNode>();

function cardTreeDigest(card: CardNode): string {
  return createHash('sha256').update(JSON.stringify(card)).digest('hex');
}

function sealCardTree(card: CardNode): SealedCardTree {
  const sealed: SealedCardTree = Object.freeze({
    cardTreeDigest: cardTreeDigest(card),
  });
  sealedTrees.set(sealed, card);
  return sealed;
}

/**
 * The element tree behind a sealed corpus card.
 *
 * Both the renderer and every measurement read the tree through here, so
 * the population the evidence walks and the tree the renderer paints are
 * the same object, verified at each open.
 */
export function openSealedCardTree(sealed: SealedCardTree): CardNode {
  const card = sealedTrees.get(sealed);
  if (card === undefined) {
    throw new Error(
      'This card tree was not sealed by ogCardCorpus, so it is not a shipped card',
    );
  }
  const digest = cardTreeDigest(card);
  if (digest !== sealed.cardTreeDigest) {
    throw new Error(
      `The card tree sealed as ${sealed.cardTreeDigest} now hashes to ${digest}, so it was edited after the corpus built it`,
    );
  }
  return card;
}

export function ogCardCorpus(root: string): OgCardCorpusEntry[] {
  const corpus: OgCardCorpusEntry[] = [
    {
      cardId: 'site',
      cardPath: SITE_CARD_PATH,
      card: sealCardTree(siteCardElement()),
    },
  ];
  for (const entry of publishedModules()) {
    const mdx = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    corpus.push({
      cardId: `${entry.domain}/${entry.slug}`,
      cardPath: articleCardPath(entry.domain, entry.slug),
      card: sealCardTree(
        articleCardElement({
          entry,
          domainName: DOMAIN_META[entry.domain].name,
          ...articleCardFacts(mdx),
        }),
      ),
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
