/**
 * Market-map dataset source-URL liveness sweep.
 *
 * Checks every company `sources[].url` in research/04-market-map-companies.json
 * (the file data/companies.ts is generated from) with the same conventions as
 * the citation link-liveness sweep (scripts/check-citation-links.ts): a real
 * browser user agent, redirects followed, GET fallback for HEAD-hostile
 * servers, one retry with backoff for 5xx/transient failures, and a
 * documented-exception path for bot-walls.
 *
 * What counts as a failure here mirrors the market-map audit's own published
 * convention ("every row carries at least one live or live-but-bot-walled
 * source"): a URL that is genuinely dead (404/410) fails the sweep, and a
 * record whose every source is dead or inconclusive fails the sweep. A
 * bot-wall (401/403/429) is not link rot; it is reported separately, and a
 * bot-walled URL with no documented exception marks its record as having no
 * machine-verifiable source. Dead URLs are never excepted.
 *
 * Deliberately NOT wired into the build: 200+ network calls would make every
 * build slow and flaky offline. Run it on demand:
 *
 *   npm run check:dataset-sources                # sweep every dataset source
 *   npm run check:dataset-sources -- --id unitree-robotics   # one record
 *   npm run check:dataset-sources -- --json      # machine-readable report
 *
 * Exit code is 1 when any source is dead, when any record has no live or
 * documented source left, or when the exception list itself is invalid.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BROWSER_UA,
  classifyStatus,
  shouldFallbackToGet,
  shouldRetryStatus,
  type LinkCheckResult,
} from '../lib/citation-links.ts';
import { DATASET_SOURCE_EXCEPTIONS } from '../data/dataset-source-exceptions.ts';

const SOURCE = join(import.meta.dirname, '..', 'research', '04-market-map-companies.json');

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 6;
/** Pause before the single 5xx retry. */
const RETRY_BACKOFF_MS = 1_500;

interface DatasetSource {
  id: string;
  url: string;
}

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
      options.timeoutMs = Number(argv[i + 1]);
    } else if (arg === '--concurrency') {
      options.concurrency = Number(argv[i + 1]);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

interface CompanyRecord {
  id: string;
  name: string;
  sources?: Array<{ url: string; title?: string; asOf?: string }>;
}

function loadDatasetSources(onlyId?: string): DatasetSource[] {
  const raw = JSON.parse(readFileSync(SOURCE, 'utf8')) as CompanyRecord[];
  const entries: DatasetSource[] = [];
  for (const record of raw) {
    if (onlyId && record.id !== onlyId) continue;
    for (const source of record.sources ?? []) {
      entries.push({ id: record.id, url: source.url });
    }
  }
  return entries;
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
        Accept: 'text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    // We only need the status; release the body so PDFs are not downloaded.
    await response.body?.cancel().catch(() => undefined);
    return { status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

async function checkOne(source: DatasetSource, timeoutMs: number): Promise<LinkCheckResult> {
  const attempt = async (): Promise<{ status: number; finalUrl: string; error?: string }> => {
    try {
      let result = await fetchStatus(source.url, 'HEAD', timeoutMs);
      if (shouldFallbackToGet(result.status)) {
        result = await fetchStatus(source.url, 'GET', timeoutMs);
      }
      return result;
    } catch (error) {
      return {
        status: 0,
        finalUrl: source.url,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  let { status, finalUrl, error } = await attempt();
  if (shouldRetryStatus(status)) {
    // One retry with backoff: intermittent 5xx and transient connection
    // resets are noise, not rot.
    await sleep(RETRY_BACKOFF_MS);
    ({ status, finalUrl, error } = await attempt());
  }
  const exception = DATASET_SOURCE_EXCEPTIONS.find((e) => e.url === source.url);
  const verdict = classifyStatus(status);
  const result: LinkCheckResult = {
    id: source.id,
    url: source.url,
    verdict,
    status,
    ...(finalUrl !== source.url ? { finalUrl } : {}),
    ...(error ? { error } : {}),
  };
  // Documented bot-wall exception: the exception must cover the observed
  // failure mode, and a dead URL is never excepted.
  if (exception && (verdict === 'blocked' || verdict === 'error')) {
    return {
      ...result,
      resolvedBy: 'exception',
      resolutionNote: `${exception.reason} Verified ${exception.verifiedOn}: ${exception.verifiedBy}`,
    };
  }
  return result;
}

async function sweep(entries: DatasetSource[], options: CliOptions): Promise<LinkCheckResult[]> {
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

/** A record fails when none of its sources is live or covered by an exception. */
function recordsWithoutAnyLiveSource(results: LinkCheckResult[]): string[] {
  const byRecord = new Map<string, LinkCheckResult[]>();
  for (const result of results) {
    byRecord.set(result.id, [...(byRecord.get(result.id) ?? []), result]);
  }
  const failed: string[] = [];
  for (const [id, rows] of byRecord) {
    const anyGood = rows.some((r) => r.verdict === 'live' || r.resolvedBy === 'exception');
    if (!anyGood) failed.push(id);
  }
  return failed.sort();
}

function validateExceptions(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const datasetUrls = new Set(loadDatasetSources().map((s) => s.url));
  for (const exception of DATASET_SOURCE_EXCEPTIONS) {
    const label = exception.url || '(missing url)';
    if (!exception.url) {
      problems.push('An exception is missing its URL.');
      continue;
    }
    if (!datasetUrls.has(exception.url)) {
      problems.push(`'${label}' is not a source URL of any record in the dataset.`);
    }
    if (seen.has(exception.url)) {
      problems.push(`'${label}' is listed twice.`);
    }
    seen.add(exception.url);
    if (typeof exception.reason !== 'string' || exception.reason.trim().length === 0) {
      problems.push(`'${label}' records no reason: why can this URL not be verified by machine?`);
    }
    if (typeof exception.verifiedBy !== 'string' || exception.verifiedBy.trim().length === 0) {
      problems.push(`'${label}' records no verification method.`);
    }
    if (typeof exception.verifiedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(exception.verifiedOn)) {
      problems.push(`'${label}' records no valid verification date (want YYYY-MM-DD).`);
    }
  }
  return problems;
}

function reportText(results: LinkCheckResult[], failedRecords: string[]): void {
  const counts = {
    live: results.filter((r) => r.verdict === 'live').length,
    dead: results.filter((r) => r.verdict === 'dead').length,
    blocked: results.filter((r) => r.verdict === 'blocked' && !r.resolvedBy).length,
    error: results.filter((r) => r.verdict === 'error' && !r.resolvedBy).length,
    exceptions: results.filter((r) => r.resolvedBy === 'exception').length,
  };
  console.log(
    `Checked ${results.length} dataset source URLs across ` +
      `${new Set(results.map((r) => r.id)).size} records: ${counts.live} live, ` +
      `${counts.dead} dead, ${counts.blocked} blocked, ${counts.error} error, ` +
      `${counts.exceptions} documented exceptions.`,
  );
  for (const result of results) {
    if (result.resolvedBy === 'exception') {
      console.log(`  [EXCEPTION] ${result.id}: ${result.url} (${result.resolutionNote})`);
    } else if (result.verdict !== 'live') {
      const detail = result.error ?? `HTTP ${result.status}`;
      console.log(`  [${result.verdict.toUpperCase()}] ${result.id}: ${result.url} (${detail})`);
    }
  }
  for (const id of failedRecords) {
    console.log(
      `  [NO LIVE SOURCE] ${id}: every source URL is dead or inconclusive; ` +
        `replace the dead source with a live one.`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Validate the exception list before a single request goes out: an
  // exception with no recorded evidence is a suppressed failure.
  const exceptionProblems = validateExceptions();
  if (exceptionProblems.length > 0) {
    console.error('The dataset source exception list is not valid:');
    for (const problem of exceptionProblems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const entries = loadDatasetSources(options.onlyId);
  if (entries.length === 0) {
    console.error(`No dataset source matched${options.onlyId ? ` id '${options.onlyId}'` : ''}.`);
    process.exit(2);
  }
  const results = await sweep(entries, options);
  const failedRecords = recordsWithoutAnyLiveSource(results);

  if (options.json) {
    console.log(JSON.stringify({ results, failedRecords }, null, 2));
  } else {
    reportText(results, failedRecords);
  }
  if (results.some((r) => r.verdict === 'dead') || failedRecords.length > 0) {
    process.exit(1);
  }
}

await main();
