/**
 * Citation link-liveness sweep.
 *
 * Checks every `url` in data/citations.ts with a real browser user agent,
 * following redirects, and reports which links are dead, bot-blocked, or
 * inconclusive. This catches link rot in the citation registry before a
 * reader (or a validator sampling a reference) does.
 *
 * The sweep is built to keep a clean floor of zero unexplained entries, so
 * that any line in the output is real signal:
 *
 * - A 5xx or a network-level failure gets one retry after a short backoff
 *   (intermittent server errors and connection resets are noise, not rot).
 * - A blocked/errored URL that carries a DOI is verified through Crossref
 *   content negotiation: the publisher may bot-wall the fetch, but the DOI
 *   metadata proves the paper exists and matches the registry's title/year.
 * - A URL no machine client can verify (and with no DOI) needs a documented
 *   entry in data/link-check-exceptions.ts recording why it is exempt, how
 *   it was last verified, and when. The sweep refuses to run if an exception
 *   lacks its justification, and an exception never masks a real 404.
 *
 * Deliberately NOT wired into the build: 200+ network calls would make every
 * build slow and flaky offline. Run it on demand:
 *
 *   npm run check:links                    # sweep every citation
 *   npm run check:links -- --id alvinn-1988   # re-check one entry
 *   npm run check:links -- --json          # machine-readable report
 *
 * Exit code is 1 when any link is dead, when any blocked/error entry is
 * unexplained (no Crossref match, no exception), or when the exception list
 * itself is invalid; 0 otherwise.
 */

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
  type CrossrefWork,
  type LinkCheckResult,
} from '../lib/citation-links.ts';
import { CITATIONS, type Citation } from '../data/citations.ts';
import { LINK_CHECK_EXCEPTIONS } from '../data/link-check-exceptions.ts';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 6;
/** Pause before the single 5xx retry. */
const RETRY_BACKOFF_MS = 1_500;

interface CliOptions {
  onlyId?: string;
  json: boolean;
  timeoutMs: number;
  concurrency: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--id') {
      options.onlyId = argv[++i];
    } else if (arg === '--timeout') {
      options.timeoutMs = Number(argv[++i]);
    } else if (arg === '--concurrency') {
      options.concurrency = Number(argv[++i]);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStatus(
  url: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<{ status: number; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept:
          'text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    // We only need the status; release the body so PDFs are not downloaded.
    await response.body?.cancel().catch(() => undefined);
    return { status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify a bot-walled DOI-bearing URL through Crossref content negotiation.
 * Returns null when Crossref cannot answer (network failure, unparseable
 * payload); the caller then leaves the original verdict in place.
 */
async function fetchCrossrefWork(doi: string, timeoutMs: number): Promise<CrossrefWork | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://doi.org/${doi}`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/vnd.citationstyles.csl+json',
      },
    });
    if (!response.ok) return null;
    return parseCrossrefWork(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function checkOne(citation: Citation, timeoutMs: number): Promise<LinkCheckResult> {
  const { id, url } = citation;
  // One probe of the URL: HEAD, with a GET fallback for HEAD-hostile or
  // bot-walled servers. A network-level failure yields status 0.
  const attempt = async (): Promise<{ status: number; finalUrl: string; error?: string }> => {
    try {
      let result = await fetchStatus(url, 'HEAD', timeoutMs);
      if (shouldFallbackToGet(result.status)) {
        result = await fetchStatus(url, 'GET', timeoutMs);
      }
      return result;
    } catch (error) {
      return {
        status: 0,
        finalUrl: url,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  let { status, finalUrl, error } = await attempt();
  if (shouldRetryStatus(status)) {
    // One retry with backoff: intermittent 5xx and transient connection
    // resets are noise, not link rot.
    await sleep(RETRY_BACKOFF_MS);
    ({ status, finalUrl, error } = await attempt());
  }
  const verdict = classifyStatus(status);
  const result: LinkCheckResult = {
    id,
    url,
    verdict,
    status,
    ...(finalUrl !== url ? { finalUrl } : {}),
    ...(error ? { error } : {}),
  };
  if (verdict !== 'blocked' && verdict !== 'error') return result;
  // The publisher walled the request. When the URL carries a DOI, Crossref
  // content negotiation is the durable verification path: confirm the DOI
  // resolves to the paper the registry claims (title and year), not merely
  // that Crossref knows the DOI at all.
  const doi = extractDoi(url);
  if (!doi) return result;
  const work = await fetchCrossrefWork(doi, timeoutMs);
  if (!work) return result;
  const verification = verifyCrossrefWork(citation, work);
  if (!verification.ok) {
    return {
      ...result,
      error: `Crossref metadata does not match the registry: ${verification.problems.join('; ')}`,
    };
  }
  return {
    ...result,
    verdict: 'live',
    resolvedBy: 'crossref',
    resolutionNote: `publisher bot-walled the sweep (HTTP ${status}); Crossref metadata for doi:${doi} matches the registry title and year`,
  };
}

async function sweep(
  entries: Citation[],
  options: CliOptions,
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(options.concurrency, entries.length) },
    async () => {
      while (cursor < entries.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await checkOne(entries[index], options.timeoutMs);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

interface Summary {
  checked: number;
  live: number;
  crossrefVerified: number;
  dead: number;
  blocked: number;
  error: number;
  exceptions: number;
}

function summarize(results: LinkCheckResult[]): Summary {
  const counts: Summary = {
    checked: results.length,
    live: 0,
    crossrefVerified: 0,
    dead: 0,
    blocked: 0,
    error: 0,
    exceptions: 0,
  };
  for (const result of results) {
    if (result.resolvedBy === 'exception') {
      counts.exceptions += 1;
      continue;
    }
    if (result.resolvedBy === 'crossref') counts.crossrefVerified += 1;
    counts[result.verdict] += 1;
  }
  return counts;
}

function reportText(results: LinkCheckResult[], staleExceptions: string[]): void {
  const counts = summarize(results);
  const crossrefNote =
    counts.crossrefVerified > 0 ? ` (${counts.crossrefVerified} verified via Crossref)` : '';
  console.log(
    `Checked ${counts.checked}: ${counts.live} live${crossrefNote}, ${counts.dead} dead, ` +
      `${counts.blocked} blocked, ${counts.error} error, ${counts.exceptions} documented exceptions.`,
  );
  for (const result of results) {
    if (result.resolvedBy === 'crossref') {
      console.log(`  [CROSSREF] ${result.id}: ${result.url} (${result.resolutionNote})`);
      continue;
    }
    if (result.resolvedBy === 'exception') {
      console.log(`  [EXCEPTION] ${result.id}: ${result.url} (${result.resolutionNote})`);
      continue;
    }
    if (result.verdict === 'live') continue;
    const detail = result.error ?? `HTTP ${result.status}`;
    const moved = result.finalUrl ? ` -> ${result.finalUrl}` : '';
    console.log(
      `  [${result.verdict.toUpperCase()}] ${result.id}: ${result.url} (${detail})${moved}`,
    );
  }
  for (const id of staleExceptions) {
    console.log(
      `  [STALE] ${id}: the URL passes unaided now; remove its entry from data/link-check-exceptions.ts.`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Validate the exception list before a single request goes out: an
  // exception with no recorded evidence is a suppressed failure, so the
  // check fails fast and says why.
  const citationIds = new Set(CITATIONS.map((c) => c.id));
  const exceptionProblems = validateExceptions(LINK_CHECK_EXCEPTIONS, citationIds);
  if (exceptionProblems.length > 0) {
    console.error('The known-exception list (data/link-check-exceptions.ts) is not valid:');
    for (const problem of exceptionProblems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  const entries = CITATIONS.filter((c) => !options.onlyId || c.id === options.onlyId);
  if (entries.length === 0) {
    console.error(`No citation matched${options.onlyId ? ` id '${options.onlyId}'` : ''}.`);
    process.exit(2);
  }

  const exceptionsById = new Map(LINK_CHECK_EXCEPTIONS.map((e) => [e.id, e]));
  const rawResults = await sweep(entries, options);
  const results = rawResults.map((r) => applyException(r, exceptionsById.get(r.id)));
  // An exception whose URL now passes (unaided or via Crossref) is leftover
  // paperwork, not a failure; surface it so the list stays honest. But a
  // title-mismatch exception is invisible to this liveness sweep (a tagline
  // <title> still resolves HTTP 200): the audit checker
  // (scripts/check-citations.ts) owns that failure mode, so only it may
  // declare those stale.
  const staleExceptions = results
    .filter((r) => r.verdict === 'live' && exceptionsById.has(r.id))
    .filter((r) => !exceptionsById.get(r.id)!.covers.includes('title-mismatch'))
    .map((r) => r.id);

  if (options.json) {
    console.log(
      JSON.stringify({ summary: summarize(results), staleExceptions, results }, null, 2),
    );
  } else {
    reportText(results, staleExceptions);
  }
  if (results.some((r) => r.verdict === 'dead') || results.some(isUnexplained)) {
    process.exit(1);
  }
}

await main();
