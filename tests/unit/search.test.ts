import { describe, expect, it } from 'vitest';
import {
  contentPhraseWeight,
  createRequestSequencer,
  isGenuineHit,
  RESULT_LIMIT,
  searchPagefind,
  titleWeight,
  toSearchHits,
  type PagefindResult,
  type PagefindResultData,
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
  async function excerpt(title: string, plain: string, content: string, query: string, sections: string[] = []) {
    const data: PagefindResultData = {
      url: '/example/', meta: { title }, content, plain_excerpt: plain,
      excerpt: plain, sub_results: sections.map((title, i) => ({ title, url: `/example/#section-${i}` })),
    };
    return (await toSearchHits({ results: [fakeResult(data)] }, query))[0]?.excerpt;
  }

  it('uses a matched section for a qualifier beyond the repeated heading', async () => {
    const plain = 'Humanoid Control. How robots move. A humanoid can';
    const result = await excerpt('Humanoid Control', plain, plain + ' move. Sim-to-real results. Real humanoids at work.', 'humanoid control sim-to-real', ['Real humanoids at work']);
    expect(result).toBe('<mark>Real</mark> <mark>humanoids</mark> at work');
  });

  it('keeps the complete deck for a title match, including an escaped comparison and decimal', async () => {
    const plain = 'Control. A 3.5 mm gap is < 5 mm & visible. The next';
    expect(await excerpt('Control', plain, plain + ' sentence.', 'control')).toBe('A 3.5 mm gap is &lt; 5 mm &amp; visible.');
  });

  it('keeps a model identifier in the clipped window when the deck and section miss it', async () => {
    const plain = 'Motors. A short guide. The G1 works';
    expect(await excerpt('Motors', plain, plain + ' at low speed. G10 guide.', 'motors G1', ['G10 guide']))
      .toBe('A short guide. The <mark>G1</mark> works…');
  });

  it('retains an opening subject that happens to be the title', async () => {
    const plain = 'Robot welding requires a person to inspect the seam. The next';
    expect(await excerpt('Robot welding', plain, plain + ' test follows.', 'robot welding')).toBe(plain);
  });

  it('keeps an abbreviated title with the name and marks model numbers exactly', async () => {
    const calibration = 'Calibration. The method follows Dr. Smith’s test. Only three arms';
    expect(await excerpt('Calibration', calibration, calibration + ' were tested.', 'calibration'))
      .toBe('The method follows Dr. Smith’s test.');
    const motors = 'Robot arms. The G1 and G10 use different joints. The next';
    expect(await excerpt('Robot arms', motors, motors + ' test follows.', 'robot arms G1'))
      .toBe('The <mark>G1</mark> and G10 use different joints.');
  });

  it('preserves a non-Latin sentence and suppresses a title-only result description', async () => {
    const plain = '測定。距離は何メートル？次の';
    expect(await excerpt('測定', plain, plain + 'テスト。', '測定')).toBe('距離は何メートル？');
    expect(await excerpt('Control', 'Control.', 'Control.', 'control')).toBe('');
  });

  it('leaves an interior match intact and never interpolates markup in a replacement heading', async () => {
    const middle = 'Repeat. The clipped match 42';
    expect(await excerpt('Repeat', middle, 'Earlier. ' + middle + ' metres.', '42')).toBe(middle);
    const plain = 'Sensors. Camera coverage.';
    expect(await excerpt('Sensors', plain, plain + ' Glass & <probe>.', 'sensors glass', ['Glass & <probe>']))
      .toBe('<mark>Glass</mark> &amp; &lt;probe&gt;');
  });

  it('maps url, title, and excerpt from pagefind result data', async () => {
    const hits = await toSearchHits(
      {
        results: [
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA) | Robot Wiki' },
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
            meta: { title: 'Manipulation | Robot Wiki' },
            content: 'Action Chunking sits in this domain.',
          }),
          fakeResult({
            url: '/manipulation/action-chunking/',
            meta: { title: 'Action Chunking (ACT and ALOHA) | Robot Wiki' },
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

  it('keeps an exact prose phrase above scattered-term hits and inside the cap', async () => {
    const scattered = Array.from({ length: RESULT_LIMIT }, (_, i) =>
      fakeResult({
        url: `/scattered-${i}/`,
        meta: { title: `Scattered ${i}` },
        content:
          'Every page mentions learned systems. A policy appears elsewhere. This closes the passage.',
      }),
    );
    const exact = fakeResult({
      url: '/classical/',
      meta: { title: 'Classical Foundations' },
      content: 'Every learned policy this domain discusses depends on geometry.',
    });

    const hits = await toSearchHits(
      { results: [...scattered, exact] },
      'every learned policy this',
    );

    expect(hits).toHaveLength(RESULT_LIMIT);
    expect(hits[0].url).toBe('/classical/');
    expect(hits.map((hit) => hit.url)).not.toContain(
      `/scattered-${RESULT_LIMIT - 1}/`,
    );
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

describe('contentPhraseWeight', () => {
  it('scores a contiguous phrase, including typeahead and punctuation folding', () => {
    expect(contentPhraseWeight('tempor ensemb', 'Temporal ensembling smooths actions.')).toBe(1);
    expect(contentPhraseWeight('sim-to-real', 'The sim to real gap remains.')).toBe(1);
    expect(contentPhraseWeight('pi0.5 policy', 'The π0.5 policy is open.')).toBe(1);
  });

  it('does not score terms that only occur apart or empty input', () => {
    expect(
      contentPhraseWeight(
        'every learned policy this',
        'Every page mentions learned systems. A policy appears. This closes.',
      ),
    ).toBe(0);
    expect(contentPhraseWeight('', 'Action chunking')).toBe(0);
    expect(contentPhraseWeight('action', '')).toBe(0);
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
    // A review finding: normalizing the query token
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

describe('reader questions in prose search', () => {
  const question = 'Can a gripper lift fragile glass?';
  const introduction = 'A gripper can lift fragile glass, including <thin> glass & other samples.';
  const pages = {
    glass: { url: '/glass/', content: introduction, title: 'Glass handling' },
    gripper: { url: '/gripper/', content: 'Only the gripper is relevant here.', title: 'Grippers' },
    distant: {
      url: '/distant/',
      content: ['gripper', 'lift', 'fragile', 'glass'].join(' bridge'.repeat(50) + ' '),
      title: 'Unrelated mentions',
    },
  };
  type Page = keyof typeof pages;

  function result(id: Page, score: number) {
    const { url, title, content } = pages[id];
    return { id, score, data: async () => ({ url, meta: { title }, content, anchors: [{ element: 'h2', text: 'Handling <glass> & fragile samples', location: 0 }] }) };
  }

  it('keeps strict matches and performs no secondary lookups for an ordinary empty search', async () => {
    const calls: string[] = [];
    const lookup = async (query: string) => {
      calls.push(query);
      return { results: query === 'fragile glass' ? [result('glass', 10)] : [] };
    };
    expect((await searchPagefind(lookup, 'fragile glass'))[0].url).toBe('/glass/');
    expect(await searchPagefind(lookup, 'zzqqxx')).toEqual([]);
    expect(calls).toEqual(['fragile glass', 'zzqqxx']);
  });

  it('finds the spelled-out transfer term with the reader’s other qualifiers', async () => {
    const pages = [
      {url: '/humanoid/', content: 'Humanoid whole-body control with sim-to-real transfer.'},
      {url: '/other/', content: 'Simple whole-body humanoid control today in realistic games.'},
      {url: '/arm/', content: 'An arm controller applies sim-to-real transfer.'},
    ];
    const requests: string[] = [];
    const lookup = async (query: string) => {
      requests.push(query);
      const results = query.includes('sim-to-real') ? pages.map((page, n) => ({
        id: page.url, score: 3 - n, data: async () => page,
      })) : [];
      return {results};
    };
    const hits = await searchPagefind(lookup, 'SIM2REAL whole-body control humanoid');
    expect(requests).toEqual(['SIM2REAL whole-body control humanoid', 'sim-to-real whole-body control humanoid']);
    expect(hits.map(hit => hit.url)).toEqual(['/humanoid/']);
  });

  it('preserves a literal result and leaves longer names containing sim2real alone', async () => {
    for (const query of ['sim2real', 'Sim2RealBench', 'Project-Sim2Real', 'éSim2Real', 'sim2real_2026']) {
      const requests: string[] = [];
      const lookup = async (text: string) => {
        requests.push(text);
        const results = text === 'sim2real' ? [{
          id: 'literal', score: 1, data: async () => ({url: '/literal/', content: 'Sim2Real'}),
        }] : [];
        return {results};
      };
      const hits = await searchPagefind(lookup, query);
      expect(requests).toEqual([query]);
      expect(hits.map(hit => hit.url)).toEqual(query === 'sim2real' ? ['/literal/'] : []);
    }
  });

  it('looks up the bare arm identifier under its published spelling', async () => {
    for (const query of ['SO100', 'so 100', 'SO‑100', 'so-100']) {
      const requests: string[] = [];
      const lookup = async (term: string) => {
        requests.push(term);
        return {results: [result('glass', 5)]};
      };
      await searchPagefind(lookup, query);
      expect(requests).toEqual(['SO-100']);
    }
  });

  it('finds the original camera example by its arm, model and subject in any order', async () => {
    for (const query of [
      'SO100 GR00T camera', 'camera GR00T SO-100', 'GR00T N1 SO 100 camera',
      'NVIDIA GR00T-N1 SO‑100 camera example', 'Camera input SO100 GR00T code',
      'gr00t so-100 camera between actions', 'SO‑100 GR00T N1 camera updates',
      'SO100 gr00t camera every step', 'gr00t camera per command SO100',
    ]) {
      const other = {url: '/ordinary/', content: query};
      const lookup = async () => ({results: [{id: 'page', score: 1, data: async () => other}]});
      const hits = await searchPagefind(lookup, query);
      expect(hits.map(hit => hit.url)).toEqual(['/manipulation/hierarchical/#two-speeds-in-one-system', '/ordinary/']);
      expect(hits[0].source?.label).toBe('NVIDIA’s SO-100 control loop');
      expect(hits[0].excerpt).toMatch(/^Related question:/);
    }
  });

  it('keeps ordinary results for other model versions, hardware and camera questions', async () => {
    for (const query of [
      'GR00T N1.6 SO100 camera', 'GR00T N1.7 SO-100 camera', 'GR00T N2 SO100 camera',
      'SO-101 GR00T camera', 'SO100 GR00T camera price', 'GR00T SO-100 camera tripod for filming',
      'SO100 GR00T camera calibration', 'SO100 camera', 'GR00T N1 camera',
      'SO100 GR00T camera between action shots for filming',
      'SO100 GR00T N1.7 camera every step',
    ]) {
      const results = await searchPagefind(async () => ({results: []}), query);
      expect(results).toEqual([]);
    }
  });

  it('offers related reading and the source code for questions about vision and motor timing', async () => {
    const lookup = async () => ({results: []});
    for (const query of [
      'For GR00T N1, does 120 Hz mean a new camera image for every movement?',
      'How often does a GR00T N1 vision model update compared with its motor actions?',
      'How can a robot arm keep moving under a slow planner while fresh camera frames arrive?',
      'How frequently does the GR00T N1 vision model send a new command to its arm?',
      'Does GR00T N1 receive a camera frame before each motor action?',
    ]) {
      const [hit] = await searchPagefind(lookup, query);
      expect(hit.url).toBe('/manipulation/hierarchical/#two-speeds-in-one-system');
      expect(hit.excerpt).toMatch(/^Related question:/);
      expect(hit.source?.url).toMatch(/1184da1013ceb359f8b0e1801280ae12347396df.*eval_gr00t_so100/);
    }
  });

  it('keeps different model versions, camera shopping and unrelated uses of system names out of the timing passage', async () => {
    for (const query of [
      'How often does a GR00T N1.6 controller use new camera frames as the arm moves?',
      'How much should I pay for a GR00T N1 120 Hz camera to record arm movement?',
      'Which 120 Hz USB camera should I buy for a robot arm?',
      'Should I buy a faster camera to record a moving GR00T N1 robot at a trade show?',
      'How often should I move a tripod camera to film a GR00T N1 arm?',
      'How fast should a camera operator pan to film the movements of GR00T N1?',
      'How does System 1 psychology affect fast thinking?',
      'Can a robot with a slow planner move pallets while recording invoices?',
    ]) {
      expect(await searchPagefind(async () => ({results: []}), query)).toEqual([]);
    }
  });

  it('returns the exact directory passage without issuing word-by-word lookups', async () => {
    const query = 'Can a robot reach the same cup with its elbow up or down?';
    const lookup = async (word: string) => {
      if (word !== query) throw new Error('Unexpected fallback lookup');
      return {results: []};
    };
    const [hit] = await searchPagefind(lookup, query);
    expect(hit.url).toBe('/classical/kinematics/#inverse-kinematics-has-many-answers-or-none');
  });

  it('opens the inverse kinematics passage for its question and the exact cup search', async () => {
    const lookup = async () => ({results: []});
    const path = '/classical/kinematics/#inverse-kinematics-has-many-answers-or-none';
    for (const text of [
      'two elbow poses reach the same cup',
      'Two elbow poses reach the same cup. Does one local joint-speed calculation tell me all the poses?',
      'Can the gripper reach the same cup with the elbow bent the other way?',
      'Can a robot reach the same cup with its elbow up or down?',
    ]) {
      expect((await searchPagefind(lookup, text))[0]?.url).toBe(path);
    }
    for (const text of [
      'elbow injury',
      'two elbow poses reach the same cup after an injury',
      'Two elbow poses reach the same cup, but how do I treat an elbow injury?',
    ]) {
      expect(await searchPagefind(lookup, text)).toEqual([]);
    }
  });

  it.each(['robotic kinematics', 'robotics kinematics', 'kinematics of robotics'])(
    'returns the published article for the qualified title %s even when it lacks the literal phrase',
    async (query) => {
      const hits = await searchPagefind(async () => ({ results: [] }), query);
      expect(hits).toEqual([{
        url: '/classical/kinematics/', title: 'Kinematics',
        excerpt: "How joint angles place a robot's hand, and the reverse.",
      }]);
    },
  );

  it('keeps a full phrase title ahead of a qualified match and rejects unrelated qualifiers', async () => {
    const query = 'robotic kinematics';
    const exact = { id: 'named', score: 5, data: async () => ({
      url: '/named/', meta: { title: 'Robotic Kinematics' }, content: query,
    }) };
    expect((await searchPagefind(async () => ({ results: [exact] }), query))[0].url).toBe('/named/');
    expect(await searchPagefind(async () => ({ results: [] }), 'robot fishing')).toEqual([]);
    expect(await searchPagefind(async () => ({ results: [] }), 'robot kinematics for diving')).toEqual([]);
  });

  it('only treats validation data as a published evaluation title when the subject matches', async () => {
    const lookup = async () => ({results: []});
    const [lead] = await searchPagefind(lookup, 'world model validation data');
    expect(lead.url).toBe('/world-models/evaluation/');
    for (const query of ['world model training data', 'world model datasets', 'lunar soil validation data']) {
      expect(await searchPagefind(lookup, query)).toEqual([]);
    }
  });

  it('links a matching directory question to the section and keeps other Pagefind results', async () => {
    const query = 'Can a robot world model predict which policy works on a real robot?';
    const result = (url: string) => ({id: url, score: 5, data: async () => ({
      url, meta: {title: url}, content: query,
    })});
    const lookup = async () => ({results: [result('/other/'), result('/world-models/evaluation/')]});
    const hits = await searchPagefind(lookup, query);
    expect(hits.map(hit => hit.url)).toEqual([
      '/world-models/evaluation/#level-4-the-best-simulators-order-policies-as-real-trials-do',
      '/other/',
    ]);
    expect(hits[0].excerpt).toContain('which robot policy');
    for (const objection of ['How do I train a world model on video of a real robot?',
      'Can a world model predict which video works best on a real robot?', 'How do lunar rovers drive themselves?']) {
      expect(await searchPagefind(async () => ({results: []}), objection)).toEqual([]);
    }
  });

  it.each([
    'What does System 3 do in a humanoid robot?',
    'What do System 1 and System 3 do in a humanoid robot?',
    'Which paper should I cite for OpenVLA 2?',
    'How does light delay make lunar rovers drive themselves?',
    'Do simulators rank policies as real flight trials do?',
    'Do the simulators order robots for trials?',
    'Do simulators rank policy 4 as real trials do?',
    'Do simulators rank policies without real trials?',
  ])('retains the ordinary page and its rank for a different subject: %s', async query => {
    const data = {url: '/ordinary/', meta: {title: 'Ordinary match'}, content: query};
    const lookup = async () => ({results: [{id: 'ordinary', score: 5, data: async () => data}]});
    expect((await searchPagefind(lookup, query)).map(hit => hit.url)).toEqual(['/ordinary/']);
  });

  it('accepts an alternate question grounded in the policy comparison and its agreement column', async () => {
    const hits = await searchPagefind(async () => ({results: []}), 'Do simulator rankings agree with trials on actual hardware?');
    expect(hits[0]?.url).toBe('/world-models/evaluation/#level-4-the-best-simulators-order-policies-as-real-trials-do');
  });

  it('returns a real escaped passage and drops partial or scattered mentions', async () => {
    const lookup = async (word: string) => ({
      results: word === question ? [] : [result('glass', 5), result('gripper', 8), result('distant', 9)],
    });
    const hits = await searchPagefind(lookup, question);
    expect(hits).toEqual([{
      url: '/glass/', title: 'Glass handling',
      excerpt: 'Handling &lt;glass&gt; &amp; fragile samples',
    }]);
  });

  it('uses the published summary for an introduction with no preceding section', async () => {
    const query = 'How do joint angles place a hand?';
    const lookup = async (word: string) => ({
      results: word === query ? [] : [{
        id: 'arm', score: 5, data: async () => ({
          url: '/classical/kinematics/', content: 'Kinematics JointAngleControl Find joint angles to place the hand.',
        }),
      }],
    });
    expect((await searchPagefind(lookup, query))[0].excerpt)
      .toBe("How joint angles place a robot's hand, and the reverse.");
  });

  it('uses the complete heading for a matching table and excludes later sections', async () => {
    const query = 'Did the gripper lift the glass?';
    const lookup = async (word: string) => ({
      results: word === query ? [] : [{
        id: 'glass', score: 5, data: async () => ({
          url: '/glass/', content: 'Overview. Equipment ModelLoadOutcome Glass gripper can lift fragile glass.',
          anchors: [
            { element: 'h2', location: 0, text: 'Overview' },
            { element: 'h2', location: 1, text: 'Holding glass <safely> & steadily' },
            { element: 'h2', location: 20, text: 'A later section' },
          ],
        }),
      }],
    });
    expect((await searchPagefind(lookup, query))[0].excerpt)
      .toBe('Holding glass &lt;safely&gt; &amp; steadily');
  });

  it('keeps a rare unrecognized subject from becoming a result about common equipment', async () => {
    const lookup = async (word: string) => ({
      results: ['gripper', 'lift'].includes(word) ? Array.from({ length: 15 }, (_, i) => ({
        ...result('glass', 3), id: String(i),
      })) : [],
    });
    expect(await searchPagefind(lookup, 'Can a gripper lift zqxvqq?')).toEqual([]);
  });
});
