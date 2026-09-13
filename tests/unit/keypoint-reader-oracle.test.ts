import { describe, expect, it } from 'vitest';
import { CITATIONS, citationMeta } from '../../data/citations';
import { assertFullReferenceAuthors, assertShortMetadata, KEYPOINT_SHORT_META } from '../e2e/helpers/keypoint-reader-oracle';

describe('keypoint reader metadata oracle', () => {
  for (const id of Object.keys(KEYPOINT_SHORT_META)) {
    it(`accepts exact intended short metadata independently for ${id}`, () => {
      const citation = CITATIONS.find(entry => entry.id === id)!;
      expect(() => assertShortMetadata(id, citationMeta(citation))).not.toThrow();
      expect(() => assertFullReferenceAuthors(citation.authors.join(', '), citation.authors)).not.toThrow();
    });
  }
  it('rejects the wrong shortened byline even with et al. and the correct year', () => {
    expect(() => assertShortMetadata('moka-2024', 'Fangchen Liu, Kuan Fang, Sergey Levine et al., 2024')).toThrow('Wrong shortened metadata');
  });
  it('rejects generic et al., wrong year, full tooltip byline, and unknown identity', () => {
    for (const value of ['et al., 2024', KEYPOINT_SHORT_META['moka-2024'].replace('2024', '2023'), 'Fangchen Liu, Kuan Fang, Pieter Abbeel, Sergey Levine, 2024']) expect(() => assertShortMetadata('moka-2024', value)).toThrow();
    expect(() => assertShortMetadata('unknown', KEYPOINT_SHORT_META['moka-2024'])).toThrow();
  });
  it('rejects missing last References author, even though the tooltip is valid', () => {
    const authors = CITATIONS.find(entry => entry.id === 'moka-2024')!.authors;
    assertShortMetadata('moka-2024', KEYPOINT_SHORT_META['moka-2024']);
    expect(() => assertFullReferenceAuthors(authors.slice(0, -1).join(', '), authors)).toThrow('References authors');
  });
  it('rejects missing middle, reordered, or additional References authors', () => {
    const authors = CITATIONS.find(entry => entry.id === 'robopoint-2024')!.authors;
    for (const actual of [authors.filter((_, index) => index !== 3), [...authors].reverse(), [...authors, 'Invented Author']]) expect(() => assertFullReferenceAuthors(actual.join(', '), authors)).toThrow();
  });
  it('rejects a vacuous full-author population', () => {
    expect(() => assertFullReferenceAuthors('', [])).toThrow();
  });
});
