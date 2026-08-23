import { describe, expect, it } from 'vitest';
import {
  dashLines,
  extractRenderedProse,
  findBannedVocabulary,
  findPlaceholderMarkers,
  findStaleQuotationExceptions,
  maskRegisteredQuotes,
  quoteMatches,
  ruleOfThreeDensity,
  ruleOfThreeResult,
  RULE_OF_THREE_LIMIT,
  validateQuotationExceptions,
  type SlopQuotationException,
} from '@/lib/no-slop';

const citationIds = new Set(['brooks-better-lesson-2019', 'yang-autonomy-2017']);

const registeredQuote: SlopQuotationException = {
  id: 'brooks-better-lesson-2019',
  quote: 'we can not afford to put even the results of machine learning on our small robots–a human brain only requires 20 Watts',
  reason: 'Verbatim quotation from Brooks\'s essay; the en dashes are his, not ours.',
  verifiedBy: 'Fetched the live essay and byte-compared the sentence.',
  verifiedOn: '2026-08-18',
};

describe('findPlaceholderMarkers (VAL-BUILD-004)', () => {
  it('finds each placeholder marker in rendered HTML', () => {
    const html = '<main><p>lorem ipsum</p><p>TODO: fix</p></main>';
    expect(findPlaceholderMarkers(html)).toContain('lorem');
    expect(findPlaceholderMarkers(html)).toContain('TODO');
  });

  it('finds FIXME and coming soon', () => {
    const html = '<p>FIXME later</p><p>More modules coming soon</p>';
    expect(findPlaceholderMarkers(html)).toEqual(
      expect.arrayContaining(['FIXME', 'coming soon']),
    );
  });

  it('finds raw un-rendered MDX component tags', () => {
    const html = '<p>See &lt;Figure id="x" /&gt; below.</p>';
    expect(findPlaceholderMarkers(html)).toContain('raw <Figure> tag');
  });

  it('ignores markers inside script and style blocks', () => {
    const html = '<script>const x = "lorem";</script><style>/* TODO */</style><p>Real prose.</p>';
    expect(findPlaceholderMarkers(html)).toEqual([]);
  });

  it('passes clean HTML', () => {
    expect(findPlaceholderMarkers('<p>Diffusion policies denoise action chunks.</p>')).toEqual([]);
  });
});

describe('banned vocabulary (VAL-BUILD-007)', () => {
  it('flags promotional vocabulary in prose with a line number', () => {
    const body = 'First line.\nThis game-changing approach unlocks new capabilities.\n';
    const findings = findBannedVocabulary(body);
    expect(findings.map((f) => f.word)).toEqual(
      expect.arrayContaining(['game-changing', 'unlocks']),
    );
    expect(findings[0].line).toBe(2);
  });

  it('flags inflated-significance and vague-attribution markers', () => {
    const body = 'A testament to progress. Critics say otherwise.';
    const words = findBannedVocabulary(body).map((f) => f.word);
    expect(words).toContain('testament');
    expect(words).toContain('Critics say');
  });

  it('ignores banned words inside code spans and fenced code', () => {
    const body = 'Use `unlock()` to open it.\n\n```\nconst landscape = 1; // delve\n```\n';
    expect(findBannedVocabulary(body)).toEqual([]);
  });

  it('ignores banned words inside URLs', () => {
    expect(findBannedVocabulary('See https://example.com/delve/now')).toEqual([]);
  });

  it('passes clean technical prose', () => {
    expect(
      findBannedVocabulary('The policy executes at 50 Hz with a chunk size of 100.'),
    ).toEqual([]);
  });
});

describe('dash ban in prose (VAL-BUILD-007)', () => {
  it('reports the line of an em dash in prose', () => {
    expect(dashLines('line one\nan em dash — here')).toEqual([2]);
  });

  it('reports en dashes too', () => {
    expect(dashLines('a range 3–5 in prose')).toEqual([1]);
  });

  it('ignores dashes inside code and JSX attributes', () => {
    expect(dashLines('`a — b`\n\n```\nx — y\n```')).toEqual([]);
  });
});

describe('rule-of-three density (VAL-BUILD-007)', () => {
  it('never scores a non-empty short body as a measured clean zero', () => {
    // The historical defect: a sub-floor body returned density 0, so a
    // triad-heavy short page passed invisibly. The true ratio must be
    // computable for any non-empty body; only `measured` says the
    // threshold applies.
    const triadHeavy =
      'It covers a, b, and c for readers who want d, e, and f across g, h, and i quickly.';
    const result = ruleOfThreeResult(triadHeavy);
    expect(result.words).toBeLessThan(200);
    expect(result.density).toBeGreaterThan(0);
    expect(result.measured).toBe(false);
    expect(result.subFloor).toBe(true);
  });

  it('measures at the 100-word floor with the standard limit', () => {
    const sentence =
      'The policy predicts action chunks and executes them at a fixed rate with measured latency every cycle.';
    const body = Array.from({ length: 10 }, () => sentence).join(' ');
    const result = ruleOfThreeResult(body);
    expect(result.words).toBeGreaterThanOrEqual(100);
    expect(result.measured).toBe(true);
    expect(result.subFloor).toBe(false);
  });

  it('fails a triad-heavy body at the smaller floor, not just above 200 words', () => {
    // 150 words with 6 triads: density 40, above the limit of 22, and the
    // old 200-word floor would have scored it 0.
    const body = Array.from(
      { length: 6 },
      () =>
        'It covers a, b, and c for readers who want d, e, and f across g, h, and i quickly without delay.',
    ).join(' ');
    const result = ruleOfThreeResult(body);
    expect(result.words).toBeGreaterThanOrEqual(100);
    expect(result.words).toBeLessThan(200);
    expect(result.measured).toBe(true);
    expect(result.density).toBeGreaterThan(RULE_OF_THREE_LIMIT);
    expect(ruleOfThreeDensity(body)).toBeGreaterThan(RULE_OF_THREE_LIMIT);
  });

  it('does not fail a 40-word page for two triads (denominator-noise guard)', () => {
    const body = 'It covers a, b, and c for readers who want d, e, and f quickly here.';
    const result = ruleOfThreeResult(body);
    expect(result.words).toBeLessThan(100);
    expect(result.density).toBeGreaterThan(RULE_OF_THREE_LIMIT); // true ratio is noisy
    expect(result.measured).toBe(false); // ...so the threshold must not apply
    expect(ruleOfThreeDensity(body)).toBe(0);
  });

  it('an empty body is not sub-floor (nothing to report, not a masked zero over prose)', () => {
    const result = ruleOfThreeResult('');
    expect(result.words).toBe(0);
    expect(result.density).toBe(0);
    expect(result.measured).toBe(false);
    expect(result.subFloor).toBe(false);
  });

  it('scores a triad-heavy text above a normal one', () => {
    const triads = Array.from(
      { length: 40 },
      () => 'It covers a, b, and c for readers who want d, e, and f across g, h, and i quickly.',
    ).join(' ');
    const plain = Array.from(
      { length: 40 },
      () => 'The policy predicts action chunks and executes them at a fixed rate with measured latency.',
    ).join(' ');
    expect(ruleOfThreeDensity(triads)).toBeGreaterThan(ruleOfThreeDensity(plain));
    expect(ruleOfThreeDensity(triads)).toBeGreaterThan(RULE_OF_THREE_LIMIT);
    expect(ruleOfThreeDensity(plain)).toBeLessThan(RULE_OF_THREE_LIMIT);
  });
});

describe('registered verbatim quotations (VAL-BUILD-008)', () => {
  const quotedBody = `Brooks states the cost side directly: "${registeredQuote.quote}" <Cite id="brooks-better-lesson-2019" />.`;

  it('passes a registered quotation containing an en dash', () => {
    expect(dashLines(quotedBody, [registeredQuote])).toEqual([]);
  });

  it('fails the identical text when it is not registered', () => {
    // The exemption comes from attribution, never from punctuation: the same
    // sentence with an empty registry is a violation.
    expect(dashLines(quotedBody, [])).toEqual([1]);
  });

  it('fails a registered quote whose text does not match the line under check', () => {
    const altered = quotedBody.replace('small robots', 'tiny robots');
    // One word changed: the registered span no longer matches, so the dash
    // on the line surfaces again (VAL-BUILD-009).
    expect(dashLines(altered, [registeredQuote])).toEqual([1]);
  });

  it('masks banned vocabulary inside a registered quotation', () => {
    const quoteWithVocab: SlopQuotationException = {
      ...registeredQuote,
      quote: 'the robotics landscape will change everything–fundamentally',
    };
    const body = `He wrote: "the robotics landscape will change everything–fundamentally" last year.`;
    expect(findBannedVocabulary(body, [quoteWithVocab])).toEqual([]);
    expect(findBannedVocabulary(body, []).map((f) => f.word)).toEqual(['landscape']);
  });

  it('matches a registered quote across MDX line wraps', () => {
    const wrapped = `He wrote that ${registeredQuote.quote.split(' ').slice(0, 8).join(' ')}\n${registeredQuote.quote.split(' ').slice(8).join(' ')} in 2019.`;
    expect(dashLines(wrapped, [registeredQuote])).toEqual([]);
  });
});

describe('quotation marks alone never exempt text (VAL-BUILD-009)', () => {
  it('fails an unregistered banned construction wrapped in quotation marks', () => {
    const body = 'The vendor called it "game-changing" and said it "unlocks new capabilities".';
    const words = findBannedVocabulary(body, []).map((f) => f.word);
    expect(words).toContain('game-changing');
    expect(words).toContain('unlocks');
  });

  it('fails an unregistered em dash inside quotation marks', () => {
    expect(dashLines('He said "this — that" plainly.', [])).toEqual([1]);
  });

  it('a registry entry for other text does not suppress the violation', () => {
    expect(dashLines('He said "this — that" plainly.', [registeredQuote])).toEqual([1]);
  });

  it('maskRegisteredQuotes leaves non-matching text untouched', () => {
    const body = 'A different sentence entirely.';
    expect(maskRegisteredQuotes(body, [registeredQuote])).toBe(body);
  });
});

describe('quotation exception registry validation', () => {
  const valid: SlopQuotationException = { ...registeredQuote };

  it('accepts a well-formed entry keyed to a citation id', () => {
    expect(validateQuotationExceptions([valid], citationIds)).toEqual([]);
  });

  it('rejects an id that names no citation and carries no sourceUrl', () => {
    const entry = { ...valid, id: 'not-a-citation' };
    const problems = validateQuotationExceptions([entry], citationIds);
    expect(problems.join(' ')).toMatch(/sourceUrl/);
  });

  it('accepts a non-citation id that names its source URL', () => {
    const entry = { ...valid, id: 'xela-press-2026', sourceUrl: 'https://xelarobotics.com/press' };
    expect(validateQuotationExceptions([entry], citationIds)).toEqual([]);
  });

  it('rejects entries missing evidence fields', () => {
    for (const field of ['reason', 'verifiedBy', 'verifiedOn'] as const) {
      const entry = { ...valid, [field]: '' } as SlopQuotationException;
      expect(validateQuotationExceptions([entry], citationIds).length).toBeGreaterThan(0);
    }
  });

  it('rejects a malformed or future verification date', () => {
    const bad = { ...valid, verifiedOn: '2026-13-99' };
    const future = { ...valid, verifiedOn: '2100-01-01' };
    expect(validateQuotationExceptions([bad], citationIds).length).toBeGreaterThan(0);
    expect(
      validateQuotationExceptions([future], citationIds, new Date('2026-08-18T00:00:00Z')).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a quote too short to be a deliberate attribution', () => {
    // A one- or two-token entry (the em dash glyph alone, say) would exempt
    // that token everywhere it appears, so minimum substance is an
    // anti-abuse bound.
    expect(
      validateQuotationExceptions([{ ...valid, quote: '—' }], citationIds).length,
    ).toBeGreaterThan(0);
    expect(
      validateQuotationExceptions([{ ...valid, quote: 'robots —' }], citationIds).length,
    ).toBeGreaterThan(0);
  });

  it('rejects exact duplicate entries', () => {
    const problems = validateQuotationExceptions([valid, { ...valid }], citationIds);
    expect(problems.join(' ')).toMatch(/twice/);
  });
});

describe('stale quotation exceptions', () => {
  it('surfaces an entry whose quote matches no scanned content', () => {
    const stale = findStaleQuotationExceptions([registeredQuote], [
      'Nothing here quotes Brooks at all.',
    ]);
    expect(stale.map((e) => e.id)).toContain('brooks-better-lesson-2019');
  });

  it('keeps an entry whose quote is present, including across line wraps', () => {
    const texts = [`prefix words\n${registeredQuote.quote} suffix`];
    expect(findStaleQuotationExceptions([registeredQuote], texts)).toEqual([]);
  });

  it('quoteMatches is whitespace-insensitive but text-exact', () => {
    expect(quoteMatches(`x ${registeredQuote.quote} y`, registeredQuote.quote)).toBe(true);
    expect(quoteMatches(`x ${registeredQuote.quote} extra y`, registeredQuote.quote)).toBe(true);
    expect(
      quoteMatches(`x ${registeredQuote.quote.replace('afford', 'affords')} y`, registeredQuote.quote),
    ).toBe(false);
  });
});

describe('vague attribution phrases (VAL-BUILD-007)', () => {
  it('flags attribution constructions to unnamed authorities', () => {
    for (const body of [
      'Critics say the approach is overhyped.',
      'Experts argue the results will not hold.',
      'Observers have cited the cost as prohibitive.',
      'Many believe this will fail in the field.',
      'It is widely believed that scaling suffices.',
      'Some critics argue the benchmark is flawed.',
      'Many argue for a different architecture.',
    ]) {
      const words = findBannedVocabulary(body).map((f) => f.word);
      expect(words.length, body).toBeGreaterThan(0);
    }
  });

  it('does not flag the bare nouns outside an attribution construction', () => {
    // The old word-level rule banned these tokens outright; a concrete
    // reference like "critics of the approach" is legitimate prose.
    expect(findBannedVocabulary('Critics of the approach raise three objections.')).toEqual([]);
    expect(findBannedVocabulary('The observers in the room measured latency.')).toEqual([]);
  });

  it('does not flag named attributions', () => {
    expect(findBannedVocabulary('Goldberg argues the gap is closable by engineering.')).toEqual([]);
    expect(findBannedVocabulary('Sutton says computation wins in the long run.')).toEqual([]);
  });
});

describe('rendered prose extraction (VAL-BUILD-007 scope widening)', () => {
  it('extracts visible text, meta descriptions, and titles', () => {
    const html =
      '<title>Robot kinematics — the wiki page</title>' +
      '<meta name="description" content="A seamless guide to arms.">' +
      '<body><main><p>The policy runs at 50 Hz.</p></main></body>';
    const prose = extractRenderedProse(html);
    expect(prose).toContain('The policy runs at 50 Hz.');
    expect(prose).toContain('A seamless guide to arms.');
    expect(prose).toContain('the wiki page');
    expect(findBannedVocabulary(prose)).toHaveLength(1);
    expect(dashLines(prose)).toEqual([1]);
  });

  it('masks script, style, pre, code, svg, and noscript content', () => {
    const html =
      '<script>const seamless = 1;</script>' +
      '<style>.x { color: red; }</style>' +
      '<noscript>enable js for the vibrant chart</noscript>' +
      '<pre>const unlock = (k) =&gt; open(k);</pre>' +
      '<code>delve()</code>' +
      '<svg><text>landscape</text></svg>' +
      '<p>Clean prose here.</p>';
    expect(findBannedVocabulary(extractRenderedProse(html))).toEqual([]);
  });

  it('decodes HTML entities so masked-in-prose rules see the real glyphs', () => {
    const html = '<p>Watts&#8211;a comparison</p>';
    expect(dashLines(extractRenderedProse(html))).toEqual([1]);
  });

  it('masks registered quotations in rendered prose too', () => {
    const html = `<p>Brooks wrote "${registeredQuote.quote}" in reply.</p>`;
    const prose = extractRenderedProse(html);
    expect(dashLines(prose, [registeredQuote])).toEqual([]);
    expect(dashLines(prose, [])).toEqual([1]);
  });
});
