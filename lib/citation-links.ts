/**
 * Shared logic for the citation link-liveness sweep.
 *
 * The network runner lives in scripts/check-citation-links.ts; the pure
 * classification rules live here so they can be unit-tested without network
 * access: HTTP status classification, DOI extraction, Crossref metadata
 * comparison, 5xx retry policy, and the known-exception rules.
 */

/**
 * A real browser user agent. This is load-bearing: some proceedings sites
 * (papers.nips.cc was the case that motivated this sweep) answer a bare curl
 * differently than a browser, so a naive check reports a false pass.
 */
export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Final verdict for a single citation URL. */
export type LinkVerdict = 'live' | 'dead' | 'blocked' | 'error';

/** HTTP status code from a response, or 0 when the request never got one. */
export type LinkStatus = number;

export interface LinkCheckResult {
  id: string;
  url: string;
  verdict: LinkVerdict;
  /** Final HTTP status after redirects (0 when the request failed outright). */
  status: LinkStatus;
  /** Final URL after redirects, when it differs from the registry URL. */
  finalUrl?: string;
  /** Error message for network-level failures (timeout, DNS, TLS). */
  error?: string;
  /**
   * Set when a non-2xx result was resolved by other means: 'crossref' when
   * the DOI's Crossref metadata matches the registry entry, 'exception' when
   * a documented known-exception explains the failure.
   */
  resolvedBy?: 'crossref' | 'exception';
  /** Human-readable evidence for the resolution, shown in the report. */
  resolutionNote?: string;
}

/**
 * Classify a final HTTP status into a verdict.
 *
 * - 2xx: live.
 * - 404/410: dead.
 * - 401/403/429: blocked. A bot-wall or rate limit is not evidence of link
 *   rot; the sweep reports these separately so a human can re-check them in a
 *   real browser instead of "fixing" a link that is fine.
 * - everything else (5xx, 3xx leftovers, 0): error, i.e. inconclusive.
 */
export function classifyStatus(status: LinkStatus): LinkVerdict {
  if (status >= 200 && status < 300) return 'live';
  if (status === 404 || status === 410) return 'dead';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  return 'error';
}

/**
 * Whether a HEAD response should be retried as a GET. Some servers answer
 * HEAD with 405/501 (or even a generic 5xx), and some bot-walls only
 * challenge HEAD requests.
 */
export function shouldFallbackToGet(status: LinkStatus): boolean {
  return status === 405 || status === 501 || status === 403 || status >= 500;
}

/**
 * Whether an inconclusive outcome deserves one retry after a backoff: a 5xx
 * or a network-level failure (status 0, e.g. a transient connection reset).
 * Both are noise far more often than they are link rot; a single retry with
 * a pause absorbs them. Final answers (2xx, 4xx) are never retried.
 */
export function shouldRetryStatus(status: LinkStatus): boolean {
  return status === 0 || (status >= 500 && status < 600);
}

/**
 * Extract the DOI from a citation URL, when it carries one.
 *
 * Handles both canonical doi.org URLs (`https://doi.org/10.x/y`) and publisher
 * URLs with the DOI in the path (`https://www.science.org/doi/10.x/y`,
 * `https://journals.sagepub.com/doi/10.x/y`). Returns null for URLs with no
 * DOI (arXiv abs pages, blogs, press pages), which Crossref cannot verify.
 */
export function extractDoi(url: string): string | null {
  const match =
    /(?:doi\.org|\/doi)\/(?:abs\/|full\/|pdf\/)?(10\.\d{4,9}\/[^?#\s]+)/i.exec(
      url,
    );
  if (!match) return null;
  return match[1].replace(/[/.,;]+$/, '');
}

/** The slice of Crossref metadata the sweep verifies against the registry. */
export interface CrossrefWork {
  title?: string;
  /**
   * Every candidate publication year Crossref reports (issued, published,
   * published-print, published-online), deduplicated, in first-seen order.
   * Online-first records drift: the registry usually cites the print-issue
   * year while `issued` carries the earlier online date, so any corroborating
   * date field counts.
   */
  years: number[];
}

/** Read a CSL `date-parts` year out of a metadata field, when present. */
function datePartsYear(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const dateParts = (value as Record<string, unknown>)['date-parts'];
  if (
    Array.isArray(dateParts) &&
    Array.isArray(dateParts[0]) &&
    typeof dateParts[0][0] === 'number'
  ) {
    return dateParts[0][0];
  }
  return null;
}

/**
 * Parse the CSL-JSON returned by doi.org content negotiation
 * (`Accept: application/vnd.citationstyles.csl+json`) into the fields the
 * sweep checks. Defensive by design: a malformed response yields null, and
 * missing fields are omitted rather than invented, so verification can never
 * pass vacuously on an empty payload.
 */
export function parseCrossrefWork(json: unknown): CrossrefWork | null {
  if (typeof json !== 'object' || json === null) return null;
  const record = json as Record<string, unknown>;
  const work: CrossrefWork = { years: [] };
  const { title } = record;
  if (typeof title === 'string' && title.trim().length > 0) {
    work.title = title;
  } else if (
    Array.isArray(title) &&
    typeof title[0] === 'string' &&
    title[0].trim().length > 0
  ) {
    work.title = title[0];
  }
  for (const field of [
    'issued',
    'published',
    'published-print',
    'published-online',
  ]) {
    const year = datePartsYear(record[field]);
    if (year !== null && !work.years.includes(year)) {
      work.years.push(year);
    }
  }
  return work;
}

/**
 * Normalize a title for comparison: strip markup, fold diacritics, ignore
 * case and punctuation. Crossref sentence-cases titles the registry records
 * in title case, so a byte comparison would false-negative on every check.
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface CrossrefVerification {
  ok: boolean;
  problems: string[];
}

/**
 * Verify Crossref metadata against the registry entry. The point is not
 * "Crossref knows this DOI" (it always does) but "the DOI this URL points at
 * resolves to the paper the registry claims it is", so both the title and the
 * publication year must match.
 */
export function verifyCrossrefWork(
  citation: { title: string; year: number },
  work: CrossrefWork,
): CrossrefVerification {
  const problems: string[] = [];
  if (!work.title) {
    problems.push('Crossref returned no title');
  } else if (normalizeTitle(work.title) !== normalizeTitle(citation.title)) {
    problems.push(
      `title mismatch: registry says "${citation.title}", Crossref says "${work.title}"`,
    );
  }
  if (work.years.length === 0) {
    problems.push('Crossref returned no publication year');
  } else if (!work.years.includes(citation.year)) {
    problems.push(
      `year mismatch: registry says ${citation.year}, Crossref reports ${work.years.join(' or ')}`,
    );
  }
  return { ok: problems.length === 0, problems };
}

/** The failure modes a known exception is allowed to explain. */
export type ExceptedVerdict = 'blocked' | 'error';

/**
 * A documented exception for a URL no machine client can verify.
 *
 * An exception with no recorded evidence is a suppressed failure, so every
 * field is mandatory and the sweep refuses to run when one is missing (see
 * validateExceptions). Matching is on the failure mode, not the URL alone:
 * 'dead' is never excepted, so a listed URL that starts genuinely 404ing
 * still surfaces as dead.
 */
export interface LinkCheckException {
  /** Citation id from data/citations.ts. */
  id: string;
  /** The failure modes this exception explains. */
  covers: ExceptedVerdict[];
  /** Why the URL cannot be verified by machine. */
  reason: string;
  /** How a human last confirmed the link is live (tool, status, evidence). */
  verifiedBy: string;
  /** ISO calendar date (YYYY-MM-DD) of that verification. */
  verifiedOn: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the known-exception list. Returns a list of problems; an empty
 * list means every exception carries its justification. Anything else fails
 * the check, because suppression without evidence is not acceptable.
 */
export function validateExceptions(
  exceptions: readonly LinkCheckException[],
  citationIds: ReadonlySet<string>,
  today: Date = new Date(),
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const exception of exceptions) {
    const label = exception.id || '(missing id)';
    if (!exception.id) {
      problems.push('An exception is missing its citation id.');
    } else {
      if (!citationIds.has(exception.id)) {
        problems.push(
          `'${label}' does not match any citation in the registry.`,
        );
      }
      if (seen.has(exception.id)) {
        problems.push(`'${label}' is listed twice.`);
      }
      seen.add(exception.id);
    }
    if (!Array.isArray(exception.covers) || exception.covers.length === 0) {
      problems.push(`'${label}' covers no failure modes.`);
    }
    if (
      typeof exception.reason !== 'string' ||
      exception.reason.trim().length === 0
    ) {
      problems.push(
        `'${label}' records no reason: why can this URL not be verified by machine?`,
      );
    }
    if (
      typeof exception.verifiedBy !== 'string' ||
      exception.verifiedBy.trim().length === 0
    ) {
      problems.push(
        `'${label}' records no verification method: how was the link last confirmed live?`,
      );
    }
    if (
      typeof exception.verifiedOn !== 'string' ||
      !ISO_DATE.test(exception.verifiedOn)
    ) {
      problems.push(
        `'${label}' records no valid verification date (want YYYY-MM-DD).`,
      );
    } else {
      const verified = new Date(`${exception.verifiedOn}T00:00:00Z`);
      if (Number.isNaN(verified.getTime())) {
        problems.push(
          `'${label}' verification date '${exception.verifiedOn}' is not a real date.`,
        );
      } else {
        const todayUtc = Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        );
        if (verified.getTime() > todayUtc) {
          problems.push(
            `'${label}' verification date '${exception.verifiedOn}' is in the future.`,
          );
        }
      }
    }
  }
  return problems;
}

/**
 * Apply a known exception to a result. The exception must name the same
 * citation id and cover the observed failure mode. A 'dead' verdict is never
 * covered: if a listed URL starts genuinely 404ing, it still reports dead.
 */
export function applyException(
  result: LinkCheckResult,
  exception: LinkCheckException | undefined,
): LinkCheckResult {
  if (!exception || exception.id !== result.id) return result;
  if (result.verdict !== 'blocked' && result.verdict !== 'error') return result;
  if (!exception.covers.includes(result.verdict)) return result;
  return {
    ...result,
    resolvedBy: 'exception',
    resolutionNote: `${exception.reason} Verified ${exception.verifiedOn}: ${exception.verifiedBy}`,
  };
}

/**
 * Whether a result still needs a human eye: blocked or errored, and neither
 * Crossref nor a documented exception could resolve it. A clean sweep has
 * zero of these, so any occurrence is real signal.
 */
export function isUnexplained(result: LinkCheckResult): boolean {
  return (
    (result.verdict === 'blocked' || result.verdict === 'error') &&
    !result.resolvedBy
  );
}
