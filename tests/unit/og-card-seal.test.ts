import { describe, expect, it } from 'vitest';
import { ogCardCorpus, openSealedCardTree } from '@/lib/og-card-corpus';
import { publishedModules } from '@/data/modules';

/**
 * The corpus hands out sealed cards, and this is what "sealed" has to mean
 * at runtime.
 *
 * The structural half of the guarantee lives in `rendererSourceIdentity`:
 * one module may import an image renderer, and its single renderer call has
 * to receive the identifier the seal opener returned. That closes the
 * source. These gates close the values: a handle the corpus did not mint
 * cannot be opened, an element tree edited after sealing cannot be opened,
 * and the handle itself exposes no route to the tree, so a generator holding
 * one cannot wrap, clone or edit what gets painted.
 */
const CORPUS = ogCardCorpus(process.cwd());

describe('the sealed Open Graph card corpus', () => {
  it('seals one addressable card per published module plus the site card', () => {
    expect(CORPUS.length).toBe(publishedModules().length + 1);
    for (const { cardId, card } of CORPUS) {
      expect(card.cardTreeDigest, cardId).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(
      new Set(CORPUS.map(({ card }) => card.cardTreeDigest)).size,
      'every card tree is distinct, so a digest identifies one card',
    ).toBe(CORPUS.length);
  });

  it('exposes no route from the handle to the element tree', () => {
    const [{ card }] = CORPUS;
    expect(Object.keys(card)).toEqual(['cardTreeDigest']);
    expect(Object.getOwnPropertySymbols(card)).toEqual([]);
    expect(Object.isFrozen(card)).toBe(true);
    // The tree is reachable only through the opener.
    expect(openSealedCardTree(card).type).toBe('div');
  });

  it('refuses a handle it did not mint', () => {
    const [{ card }] = CORPUS;
    const forged = { cardTreeDigest: card.cardTreeDigest };
    expect(() => openSealedCardTree(forged)).toThrow(
      /was not sealed by ogCardCorpus/,
    );
    // Including a structural copy, which is what a substitution looks like.
    expect(() => openSealedCardTree({ ...card })).toThrow(
      /was not sealed by ogCardCorpus/,
    );
  });

  it('refuses a card tree edited in place after it was sealed', () => {
    const [{ card }] = ogCardCorpus(process.cwd());
    const tree = openSealedCardTree(card);
    const before = tree.props.style.backgroundColor;
    tree.props.style.backgroundColor = '#FF00FF';
    expect(() => openSealedCardTree(card)).toThrow(
      /was edited after the corpus built it/,
    );
    tree.props.style.backgroundColor = before;
    expect(openSealedCardTree(card)).toBe(tree);
  });
});
