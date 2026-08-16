import { describe, expect, it } from 'vitest';
import {
  BROWSER_UA,
  applyException,
  classifyStatus,
  extractDoi,
  isUnexplained,
  parseCrossrefWork,
  shouldFallbackToGet,
  shouldRetryStatus,
  validateExceptions,
  verifyCrossrefWork,
  type LinkCheckException,
  type LinkCheckResult,
  type LinkStatus,
} from '@/lib/citation-links';
import { CITATIONS } from '@/data/citations';
import { LINK_CHECK_EXCEPTIONS } from '@/data/link-check-exceptions';

describe('classifyStatus', () => {
  it('treats 2xx as live', () => {
    expect(classifyStatus(200)).toBe('live');
    expect(classifyStatus(204)).toBe('live');
  });

  it('treats 404 and 410 as dead', () => {
    expect(classifyStatus(404)).toBe('dead');
    expect(classifyStatus(410)).toBe('dead');
  });

  it('treats 401/403/429 as blocked, not dead', () => {
    // Bot-walls and rate limits are not proof of link rot: a browser may
    // still reach the page, so the sweep must report these separately.
    expect(classifyStatus(401)).toBe('blocked');
    expect(classifyStatus(403)).toBe('blocked');
    expect(classifyStatus(429)).toBe('blocked');
  });

  it('treats 5xx as a transient error', () => {
    expect(classifyStatus(500)).toBe('error');
    expect(classifyStatus(503)).toBe('error');
  });

  it('treats unexpected statuses as errors', () => {
    expect(classifyStatus(418)).toBe('error');
    expect(classifyStatus(0)).toBe('error');
  });
});

describe('shouldFallbackToGet', () => {
  it('retries with GET when HEAD is not supported, bot-walled, or 5xx', () => {
    // Some servers (e.g. agibot.com) answer GET 200 but HEAD 500.
    const statuses: LinkStatus[] = [405, 501, 403, 500, 503];
    for (const status of statuses) {
      expect(shouldFallbackToGet(status)).toBe(true);
    }
  });

  it('does not retry clear answers', () => {
    expect(shouldFallbackToGet(200)).toBe(false);
    expect(shouldFallbackToGet(404)).toBe(false);
    expect(shouldFallbackToGet(429)).toBe(false);
  });
});

describe('BROWSER_UA', () => {
  it('looks like a real browser, not curl', () => {
    // papers.nips.cc 404s to a browser UA while answering a bare curl, so
    // the check must send a browser user agent to be meaningful.
    expect(BROWSER_UA).toContain('Mozilla/5.0');
    expect(BROWSER_UA).toContain('Chrome/');
    expect(BROWSER_UA).not.toContain('curl');
  });
});

describe('shouldRetryStatus', () => {
  it('retries a 5xx once with backoff', () => {
    // Intermittent server errors are noise, not link rot.
    expect(shouldRetryStatus(500)).toBe(true);
    expect(shouldRetryStatus(503)).toBe(true);
  });

  it('retries a network-level failure once (status 0)', () => {
    // A transient connection reset (ntrs.nasa.gov dropped one request in a
    // 221-URL sweep, then answered 200 four times in a row) is the same
    // class of noise as a 5xx and deserves the same single retry.
    expect(shouldRetryStatus(0)).toBe(true);
  });

  it('does not retry final answers', () => {
    for (const status of [200, 301, 400, 403, 404, 429]) {
      expect(shouldRetryStatus(status)).toBe(false);
    }
  });
});

describe('extractDoi', () => {
  it('extracts the DOI from a doi.org URL', () => {
    expect(extractDoi('https://doi.org/10.1115/1.4011045')).toBe('10.1115/1.4011045');
    expect(extractDoi('https://doi.org/10.1137/0111030')).toBe('10.1137/0111030');
  });

  it('extracts the DOI from publisher /doi/ paths', () => {
    expect(extractDoi('https://www.science.org/doi/10.1126/scirobotics.ade2256')).toBe(
      '10.1126/scirobotics.ade2256',
    );
    expect(extractDoi('https://journals.sagepub.com/doi/10.1177/0278364917694244')).toBe(
      '10.1177/0278364917694244',
    );
  });

  it('strips query strings, fragments, and trailing punctuation', () => {
    expect(extractDoi('https://doi.org/10.1137/0111030?utm_source=x#top')).toBe(
      '10.1137/0111030',
    );
    expect(extractDoi('https://doi.org/10.1115/1.4011045.')).toBe('10.1115/1.4011045');
  });

  it('returns null for URLs that carry no DOI', () => {
    expect(extractDoi('https://arxiv.org/abs/2304.13705')).toBeNull();
    expect(extractDoi('https://ai.meta.com/blog/meta-llama-3/')).toBeNull();
    expect(extractDoi('https://www.agibot.com/article/231/detail/56.html')).toBeNull();
  });
});

describe('parseCrossrefWork', () => {
  it('parses the CSL-JSON returned by doi.org content negotiation', () => {
    const work = parseCrossrefWork({
      title: 'A Kinematic Notation for Lower-Pair Mechanisms Based on Matrices',
      issued: { 'date-parts': [[1955, 6, 1]] },
      DOI: '10.1115/1.4011045',
      type: 'journal-article',
    });
    expect(work).toEqual({
      title: 'A Kinematic Notation for Lower-Pair Mechanisms Based on Matrices',
      years: [1955],
    });
  });

  it('collects every candidate year, not only issued', () => {
    // Online-first drift: Crossref issued the kaess-2012 record in Dec 2011
    // but the print issue is Feb 2012, which is the year the registry cites.
    const work = parseCrossrefWork({
      title: 'iSAM2: Incremental smoothing and mapping using the Bayes tree',
      issued: { 'date-parts': [[2011, 12, 20]] },
      'published-print': { 'date-parts': [[2012, 2]] },
      'published-online': { 'date-parts': [[2011, 12, 20]] },
    });
    expect(work?.years).toEqual([2011, 2012]);
  });

  it('tolerates an array-valued title', () => {
    expect(parseCrossrefWork({ title: ['Some Paper'], issued: { 'date-parts': [[2001]] } })).toEqual(
      { title: 'Some Paper', years: [2001] },
    );
  });

  it('returns null for non-objects', () => {
    expect(parseCrossrefWork(null)).toBeNull();
    expect(parseCrossrefWork('not json metadata')).toBeNull();
    expect(parseCrossrefWork(42)).toBeNull();
  });

  it('omits missing fields rather than inventing them', () => {
    expect(parseCrossrefWork({})).toEqual({ years: [] });
    expect(parseCrossrefWork({ title: 'Only a Title' })).toEqual({
      title: 'Only a Title',
      years: [],
    });
  });
});

describe('verifyCrossrefWork', () => {
  const citation = {
    title: 'High-Speed Bounding with the MIT Cheetah 2: Control Design and Experiments',
    year: 2017,
  };

  it('accepts a title match regardless of case and punctuation, with the same year', () => {
    // Crossref sentence-cases titles the registry records in title case.
    const result = verifyCrossrefWork(citation, {
      title: 'High-speed bounding with the MIT Cheetah 2: control design and experiments',
      years: [2017],
    });
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('accepts the registry year when any Crossref date field carries it', () => {
    // Online-first drift: issued 2011, print 2012; the registry cites 2012.
    const result = verifyCrossrefWork(
      { title: 'iSAM2: Incremental smoothing and mapping using the Bayes tree', year: 2012 },
      { title: 'iSAM2: Incremental Smoothing and Mapping Using the Bayes Tree', years: [2011, 2012] },
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a different title', () => {
    const result = verifyCrossrefWork(citation, { title: 'Some Other Paper', years: [2017] });
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('title');
  });

  it('rejects when no Crossref date field carries the registry year', () => {
    const result = verifyCrossrefWork(citation, { title: citation.title, years: [2016] });
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('year');
  });

  it('rejects missing metadata instead of passing vacuously', () => {
    expect(verifyCrossrefWork(citation, { years: [] }).ok).toBe(false);
    expect(verifyCrossrefWork(citation, { years: [2017] }).ok).toBe(false);
    expect(verifyCrossrefWork(citation, { title: citation.title, years: [] }).ok).toBe(false);
  });

  it('reports whether the title matched even when the year conflicts', () => {
    // The audit checker distinguishes "title matched but the DOI record is a
    // later reprint" (a divergence to surface) from "no corroboration".
    const result = verifyCrossrefWork(citation, { title: citation.title, years: [2009] });
    expect(result.ok).toBe(false);
    expect(result.titleMatched).toBe(true);
    expect(result.yearsReported).toEqual([2009]);
    expect(result.problems.join(' ')).toContain('year');
  });

  it('accepts a title match with no Crossref year when the caller allows it', () => {
    // IEEE conference records are often deposited without dates; the audit
    // checker passes missingYearIsAcceptable, the liveness sweep does not.
    const work = { title: citation.title, years: [] };
    expect(verifyCrossrefWork(citation, work, { missingYearIsAcceptable: true }).ok).toBe(true);
    expect(verifyCrossrefWork(citation, work).ok).toBe(false);
  });

  it('never accepts a conflicting year, even when the caller allows missing years', () => {
    const result = verifyCrossrefWork(citation, { title: citation.title, years: [2016] }, {
      missingYearIsAcceptable: true,
    });
    expect(result.ok).toBe(false);
  });
});

const VALID_EXCEPTION: LinkCheckException = {
  id: 'llama-3-2024',
  covers: ['error'],
  reason: 'TLS-fingerprint bot-wall answers HTTP 400 to non-browser clients.',
  verifiedBy: 'Loaded in real Chromium: HTTP 200, page title matches the registry entry.',
  verifiedOn: '2026-08-11',
};

describe('validateExceptions', () => {
  const ids = new Set(['llama-3-2024']);
  const today = new Date('2026-08-11T12:00:00Z');

  it('accepts a fully documented exception', () => {
    expect(validateExceptions([VALID_EXCEPTION], ids, today)).toEqual([]);
  });

  it('fails an exception with no recorded reason', () => {
    const problems = validateExceptions([{ ...VALID_EXCEPTION, reason: '' }], ids, today);
    expect(problems.some((p) => p.includes('reason'))).toBe(true);
  });

  it('fails an exception with no verification method', () => {
    const problems = validateExceptions([{ ...VALID_EXCEPTION, verifiedBy: '  ' }], ids, today);
    expect(problems.some((p) => p.includes('verif'))).toBe(true);
  });

  it('fails an exception with a missing or malformed verification date', () => {
    for (const verifiedOn of ['', 'yesterday', '2026-8-1', '2026-13-01']) {
      const problems = validateExceptions([{ ...VALID_EXCEPTION, verifiedOn }], ids, today);
      expect(problems.length, `date '${verifiedOn}'`).toBeGreaterThan(0);
    }
  });

  it('fails an exception dated in the future', () => {
    const problems = validateExceptions(
      [{ ...VALID_EXCEPTION, verifiedOn: '2026-08-12' }],
      ids,
      today,
    );
    expect(problems.some((p) => p.includes('future'))).toBe(true);
  });

  it('fails an exception that names an unknown citation', () => {
    const problems = validateExceptions([{ ...VALID_EXCEPTION, id: 'no-such-id' }], ids, today);
    expect(problems.some((p) => p.includes('no-such-id'))).toBe(true);
  });

  it('fails an exception that covers no failure mode', () => {
    const problems = validateExceptions([{ ...VALID_EXCEPTION, covers: [] }], ids, today);
    expect(problems.length).toBeGreaterThan(0);
  });

  it('fails duplicate exception ids', () => {
    const problems = validateExceptions([VALID_EXCEPTION, VALID_EXCEPTION], ids, today);
    expect(problems.some((p) => p.includes('twice'))).toBe(true);
  });
});

describe('applyException', () => {
  const base: LinkCheckResult = {
    id: 'llama-3-2024',
    url: 'https://ai.meta.com/blog/meta-llama-3/',
    verdict: 'error',
    status: 400,
  };

  it('marks a covered failure mode as a documented exception', () => {
    const resolved = applyException(base, VALID_EXCEPTION);
    expect(resolved.verdict).toBe('error');
    expect(resolved.resolvedBy).toBe('exception');
    expect(resolved.resolutionNote).toContain('2026-08-11');
    expect(isUnexplained(resolved)).toBe(false);
  });

  it('never masks a genuinely dead link', () => {
    // The exception covers the bot-wall failure mode; a 404 is a different
    // observation and must still surface as dead.
    const dead: LinkCheckResult = { ...base, verdict: 'dead', status: 404 };
    const resolved = applyException(dead, VALID_EXCEPTION);
    expect(resolved.verdict).toBe('dead');
    expect(resolved.resolvedBy).toBeUndefined();
  });

  it('does not apply when the observed failure mode is not covered', () => {
    const blocked: LinkCheckResult = { ...base, verdict: 'blocked', status: 403 };
    expect(applyException(blocked, VALID_EXCEPTION).resolvedBy).toBeUndefined();
  });

  it('ignores exceptions for a different citation id', () => {
    const other: LinkCheckResult = { ...base, id: 'someone-else-2024' };
    expect(applyException(other, VALID_EXCEPTION)).toEqual(other);
  });

  it('passes live results through untouched', () => {
    const live: LinkCheckResult = { ...base, verdict: 'live', status: 200 };
    expect(applyException(live, VALID_EXCEPTION)).toEqual(live);
  });
});

describe('isUnexplained', () => {
  const base: LinkCheckResult = { id: 'x', url: 'https://example.com', verdict: 'live', status: 200 };

  it('is true only for blocked/error results with no resolution', () => {
    expect(isUnexplained({ ...base, verdict: 'blocked' })).toBe(true);
    expect(isUnexplained({ ...base, verdict: 'error' })).toBe(true);
    expect(isUnexplained({ ...base, verdict: 'error', resolvedBy: 'exception' })).toBe(false);
    expect(isUnexplained({ ...base, verdict: 'live', resolvedBy: 'crossref' })).toBe(false);
    expect(isUnexplained({ ...base, verdict: 'dead', status: 404 })).toBe(false);
  });
});

describe('checked-in exception list', () => {
  it('is fully documented and references real citations', () => {
    const ids = new Set(CITATIONS.map((c) => c.id));
    expect(validateExceptions(LINK_CHECK_EXCEPTIONS, ids)).toEqual([]);
  });
});
