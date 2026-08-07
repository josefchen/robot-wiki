import { describe, expect, it } from 'vitest';
import {
  createRequestSequencer,
  isGenuineHit,
  RESULT_LIMIT,
  toSearchHits,
  type PagefindResult,
} from '@/lib/search';

function fakeResult(data: {
  url: string;
  meta?: { title?: string };
  excerpt?: string;
  content?: string;
}): PagefindResult {
  return { data: () => Promise.resolve(data) };
}

describe('toSearchHits', () => {
  it('maps url, title, and excerpt from pagefind result data', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA) - robot-atlas' },
            excerpt: 'the <mark>chunk</mark> size tradeoff',
          }),
        ],
      },
      'chunk',
    );
    expect(hits).toEqual([
      {
        url: '/manipulation/action-chunking/',
        title: 'Action Chunking (ACT and ALOHA)',
        excerpt: 'the <mark>chunk</mark> size tradeoff',
      },
    ]);
  });

  it('falls back to the url when the meta title is missing or blank', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({ url: '/classical/', meta: {} }),
          fakeResult({ url: '/frontier/', meta: { title: '   ' } }),
        ],
      },
      'kinematics',
    );
    expect(hits[0].title).toBe('/classical/');
    expect(hits[1].title).toBe('/frontier/');
  });

  it('handles a missing excerpt as an empty string', async () => {
    const hits = await toSearchHits(
      {
        results: [fakeResult({ url: '/', meta: { title: 'robot-atlas' } })],
      },
      'atlas',
    );
    expect(hits[0].excerpt).toBe('');
    expect(hits[0].title).toBe('robot-atlas');
  });

  it('caps the hits at the result limit, preserving rank order', async () => {
    const results = Array.from({ length: RESULT_LIMIT + 5 }, (_, i) =>
      fakeResult({ url: `/p${i}/`, meta: { title: `Page ${i}` } }),
    );
    const hits = await toSearchHits({ results }, 'page');
    expect(hits).toHaveLength(RESULT_LIMIT);
    expect(hits[0].url).toBe('/p0/');
    expect(hits[RESULT_LIMIT - 1].url).toBe(`/p${RESULT_LIMIT - 1}/`);
  });

  it('drops pagefind truncation-fallback hits (garbage query)', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA)' },
            excerpt: 'Tony <mark>Z.</mark> Zhao et al.',
            content: 'ACT executes chunks with temporal ensembling. Tony Z. Zhao et al.',
          }),
        ],
      },
      'zzqqxx',
    );
    expect(hits).toEqual([]);
  });

  it('keeps genuine hits even when the excerpt marks a different word', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA)' },
            excerpt: '<mark>co-training</mark> on static ALOHA data',
            content: 'Covariate shift breaks naive imitation. Co-training on static ALOHA data.',
          }),
        ],
      },
      'covariate',
    );
    expect(hits).toHaveLength(1);
  });
});

describe('isGenuineHit', () => {
  it('accepts exact and case-insensitive matches', () => {
    expect(isGenuineHit('covariate', 'the covariate shift')).toBe(true);
    expect(isGenuineHit('act', 'ACT executes chunks')).toBe(true);
  });

  it('accepts typeahead prefixes (content word extends the token)', () => {
    expect(isGenuineHit('tempor', 'temporal ensembling')).toBe(true);
    expect(isGenuineHit('covariat', 'covariate shift')).toBe(true);
  });

  it('rejects truncation-fallback matches (token extends the matched word)', () => {
    expect(isGenuineHit('zzqqxx', 'Tony Z. Zhao')).toBe(false);
    expect(isGenuineHit('asdfgh', 'scales as O(n)')).toBe(false);
    expect(isGenuineHit('zq', 'Z. Zhao')).toBe(false);
  });

  it('requires every token of a multi-token query to match', () => {
    expect(
      isGenuineHit('temporal ensembling', 'chunks with temporal ensembling'),
    ).toBe(true);
    expect(isGenuineHit('temporal zzz', 'temporal only')).toBe(false);
  });

  it('keeps hits with no content (cannot disprove)', () => {
    expect(isGenuineHit('chunking', '')).toBe(true);
    expect(isGenuineHit('chunking', '   ')).toBe(true);
  });

  it('splits hyphenated and punctuated words', () => {
    expect(isGenuineHit('training', 'co-training on static data')).toBe(true);
    expect(isGenuineHit('z', 'Tony Z. Zhao')).toBe(true);
  });
});

describe('createRequestSequencer', () => {
  it('marks only the most recently begun token as current', () => {
    const seq = createRequestSequencer();
    const first = seq.begin();
    const second = seq.begin();
    expect(seq.isCurrent(first)).toBe(false);
    expect(seq.isCurrent(second)).toBe(true);
  });

  it('invalidates every outstanding token', () => {
    const seq = createRequestSequencer();
    const token = seq.begin();
    seq.invalidate();
    expect(seq.isCurrent(token)).toBe(false);
  });

  it('a token begun after invalidation is current again', () => {
    const seq = createRequestSequencer();
    seq.begin();
    seq.invalidate();
    const next = seq.begin();
    expect(seq.isCurrent(next)).toBe(true);
  });
});
