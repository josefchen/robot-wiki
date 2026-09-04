import { describe, expect, it } from 'vitest';
import {
  createRequestSequencer,
  isGenuineHit,
  RESULT_LIMIT,
  titleWeight,
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
            meta: { title: 'Action Chunking (ACT and ALOHA) - Robot Wiki' },
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
        results: [fakeResult({ url: '/', meta: { title: 'Robot Wiki' } })],
      },
      'wiki',
    );
    expect(hits[0].excerpt).toBe('');
    expect(hits[0].title).toBe('Robot Wiki');
  });

  it('caps the hits at the result limit, preserving rank order within a tier', async () => {
    // Every title carries the query word, so all these hits share one title
    // weight and the sort is a no-op: what this pins is that Pagefind's own
    // relative order survives the ranking pass untouched.
    const results = Array.from({ length: RESULT_LIMIT + 5 }, (_, i) =>
      fakeResult({ url: `/p${i}/`, meta: { title: `Page ${i}` } }),
    );
    const hits = await toSearchHits({ results }, 'page');
    expect(hits).toHaveLength(RESULT_LIMIT);
    expect(hits.map((hit) => hit.url)).toEqual(
      Array.from({ length: RESULT_LIMIT }, (_, i) => `/p${i}/`),
    );
  });

  it('ranks the title-matching page above a page that only mentions the query', async () => {
    // The reader-facing point of the title weight: a landing page
    // legitimately lists every article it links, so an article's own route
    // competes with its domain landing and the home page on every title
    // query. The article must win.
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/',
            meta: { title: 'Robot Wiki' },
            content: 'Action Chunking is one of the modules listed here.',
          }),
          fakeResult({
            url: '/manipulation/',
            meta: { title: 'Manipulation - Robot Wiki' },
            content: 'Action Chunking sits in this domain.',
          }),
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA) - Robot Wiki' },
            content: 'Action Chunking predicts a chunk of actions.',
          }),
        ],
      },
      'action chunking',
    );
    expect(hits.map((hit) => hit.url)).toEqual([
      '/manipulation/action-chunking/',
      '/',
      '/manipulation/',
    ]);
  });

  it('ranks a whole-phrase title above a title that only covers the terms', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/a/',
            meta: { title: 'Chunking, and Action Representations' },
            content: 'action chunking',
          }),
          fakeResult({
            url: '/b/',
            meta: { title: 'Action Chunking' },
            content: 'action chunking',
          }),
        ],
      },
      'action chunking',
    );
    expect(hits.map((hit) => hit.url)).toEqual(['/b/', '/a/']);
  });

  it('filters for genuineness before capping, so a post-cap genuine hit is rendered', async () => {
    // The cap used to run first, so a truncation-fallback hit inside the
    // cap displaced a genuine hit the index ranked just past it, and the
    // rendered count silently fell below the cap.
    const rejected = Array.from({ length: 5 }, (_, i) =>
      fakeResult({
        url: `/junk${i}/`,
        meta: { title: `Junk ${i}` },
        content: 'Tony Z. Zhao et al.',
      }),
    );
    const genuine = Array.from({ length: RESULT_LIMIT }, (_, i) =>
      fakeResult({
        url: `/real${i}/`,
        meta: { title: `Real ${i}` },
        content: 'covariate shift breaks naive imitation',
      }),
    );
    const hits = await toSearchHits(
      { results: [...rejected, ...genuine] },
      'covariate',
    );
    expect(hits).toHaveLength(RESULT_LIMIT);
    expect(hits.some((hit) => hit.url.startsWith('/junk'))).toBe(false);
    // /real19 sat at raw position 24, five places past the old cap.
    expect(hits.map((hit) => hit.url)).toContain(
      `/real${RESULT_LIMIT - 1}/`,
    );
  });

  it('never pads the rendered list with rejected hits', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/real/',
            meta: { title: 'Real' },
            content: 'covariate shift',
          }),
          ...Array.from({ length: RESULT_LIMIT }, (_, i) =>
            fakeResult({
              url: `/junk${i}/`,
              meta: { title: `Junk ${i}` },
              content: 'Tony Z. Zhao et al.',
            }),
          ),
        ],
      },
      'covariate',
    );
    expect(hits.map((hit) => hit.url)).toEqual(['/real/']);
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

describe('titleWeight', () => {
  it('scores a title carrying the whole query phrase highest', () => {
    expect(titleWeight('action chunking', 'Action Chunking (ACT and ALOHA)')).toBe(
      2,
    );
    expect(titleWeight('Glossary', 'Glossary')).toBe(2);
  });

  it('scores a title covering every term but not the phrase in the middle tier', () => {
    expect(titleWeight('action chunking', 'Chunking, and Action Horizons')).toBe(1);
  });

  it('scores a title that answers none of the query at zero', () => {
    expect(titleWeight('action chunking', 'Market Map')).toBe(0);
    expect(titleWeight('action chunking', 'Action Tokenization')).toBe(0);
  });

  it('folds punctuation and Greek the same way the genuineness filter does', () => {
    expect(titleWeight('pi0.5', 'π0.5')).toBe(2);
    expect(titleWeight('sim-to-real', 'Sim to Real Transfer')).toBe(2);
  });

  it('scores an empty query or an empty title at zero', () => {
    expect(titleWeight('', 'Action Chunking')).toBe(0);
    expect(titleWeight('action', '')).toBe(0);
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

  it('admits a genuine hit for a hyphenated query over split content words', () => {
    // The scrutiny finding (misc-hardening-3): normalizing the query token
    // to alphanumerics-only produced 'actionconditioned', which can never
    // prefix-match the content words ['action', 'conditioned'], so
    // hyphenated queries were silently dropped even when Pagefind matched.
    expect(
      isGenuineHit('action-conditioned', 'action-conditioned video prediction'),
    ).toBe(true);
    expect(isGenuineHit('sim-to-real', 'the sim-to-real gap')).toBe(true);
    // Whitespace-tokenized queries keep today's semantics.
    expect(isGenuineHit('flow matching', 'flow matching recipes')).toBe(true);
  });

  it('admits a genuine hit when the content hyphenates and the query splits', () => {
    // The mirror direction: a reader types the two-word form, the article
    // writes the hyphenated form (or vice versa).
    expect(isGenuineHit('real time', 'real-time chunking closes the loop')).toBe(
      true,
    );
    expect(isGenuineHit('covariate shift', 'the covariate-shift problem')).toBe(
      true,
    );
  });

  it('admits a genuine hit for a version-numbered query', () => {
    // The period was the last character left in the strip set after the
    // hyphen fix, so a query token kept it ("pi0.5" -> "pi05") while the
    // content side split on it ("pi0", "5"). Nothing starts with "pi05",
    // so every version-numbered query was discarded even though Pagefind
    // had matched the page.
    expect(isGenuineHit('pi0.5', 'the pi0.5 open-world results')).toBe(true);
    expect(isGenuineHit('pi0.7', 'what pi0.7 adds')).toBe(true);
    expect(isGenuineHit('N1.7', 'GR00T N1.7 ships an engineered space')).toBe(
      true,
    );
    expect(
      isGenuineHit('GR00T N1.7', 'GR00T N1.7 ships an engineered space'),
    ).toBe(true);
    expect(
      isGenuineHit('Gemini Robotics 1.5', 'Gemini Robotics 1.5 plans first'),
    ).toBe(true);
    expect(isGenuineHit('v1.1', 'the SO-101 v1.1 revision')).toBe(true);
  });

  it('admits a genuine hit when the content punctuates and the query does not', () => {
    // The mirror direction, matching the hyphen pair above.
    expect(isGenuineHit('pi0 5', 'the pi0.5 open-world results')).toBe(true);
    expect(isGenuineHit('so 101', 'the SO-101 arm')).toBe(true);
  });

  it('still rejects garbage spelled with periods', () => {
    // The period cannot become a bypass around the zzqqxx guard either:
    // splitting produces real tokens, and no content word starts with them.
    expect(isGenuineHit('zz.qq.xx', 'Tony Z. Zhao')).toBe(false);
    expect(isGenuineHit('pi0.zzz', 'the pi0.5 open-world results')).toBe(false);
    // The direction of the prefix test, not the tokenizer, is what rejects a
    // short garbage query: a content word must extend the query token, never
    // the other way round, so "zq" can never match the initial "Z.".
    expect(isGenuineHit('zq', 'Tony Z. Zhao')).toBe(false);
  });

  it('still rejects truncation fallbacks spelled with hyphens', () => {
    // Both hyphen spellings must stay filtered: the hyphen cannot become a
    // bypass around the zzqqxx guard.
    expect(isGenuineHit('zz-qq-xx', 'Tony Z. Zhao')).toBe(false);
    expect(isGenuineHit('sim-to-zzz', 'the sim-to-real gap')).toBe(false);
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
