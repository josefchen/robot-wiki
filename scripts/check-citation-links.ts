/**
 * Citation link-liveness sweep.
 *
 * Checks every `url` in data/citations.ts with a real browser user agent,
 * following redirects, and reports which links are dead, bot-blocked, or
 * inconclusive. This catches link rot in the citation registry before a
 * reader (or a validator sampling a reference) does.
 *
 * Deliberately NOT wired into the build: 178 network calls would make every
 * build slow and flaky offline. Run it on demand:
 *
 *   npm run check:links                    # sweep every citation
 *   npm run check:links -- --id alvinn-1988   # re-check one entry
 *   npm run check:links -- --json          # machine-readable report
 *
 * Exit code is 1 when any link is dead, 0 otherwise (blocked/error entries
 * are reported but do not fail the run; they need a human eye, not a fix).
 */

import {
  BROWSER_UA,
  classifyStatus,
  shouldFallbackToGet,
  type LinkCheckResult,
} from '../lib/citation-links.ts';
import { CITATIONS } from '../data/citations.ts';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 6;

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

async function checkOne(
  id: string,
  url: string,
  timeoutMs: number,
): Promise<LinkCheckResult> {
  try {
    let { status, finalUrl } = await fetchStatus(url, 'HEAD', timeoutMs);
    if (shouldFallbackToGet(status)) {
      ({ status, finalUrl } = await fetchStatus(url, 'GET', timeoutMs));
    }
    return {
      id,
      url,
      verdict: classifyStatus(status),
      status,
      ...(finalUrl !== url ? { finalUrl } : {}),
    };
  } catch (error) {
    return {
      id,
      url,
      verdict: 'error',
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sweep(
  entries: { id: string; url: string }[],
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
        const entry = entries[index];
        results[index] = await checkOne(entry.id, entry.url, options.timeoutMs);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function summarize(results: LinkCheckResult[]) {
  const counts = { checked: results.length, live: 0, dead: 0, blocked: 0, error: 0 };
  for (const result of results) {
    counts[result.verdict] += 1;
  }
  return counts;
}

function reportText(results: LinkCheckResult[]): void {
  const counts = summarize(results);
  console.log(
    `Checked ${counts.checked}: ${counts.live} live, ${counts.dead} dead, ` +
      `${counts.blocked} blocked (bot-wall/rate-limit), ${counts.error} inconclusive (error).`,
  );
  for (const result of results) {
    if (result.verdict === 'live') continue;
    const detail = result.error ?? `HTTP ${result.status}`;
    const moved = result.finalUrl ? ` -> ${result.finalUrl}` : '';
    console.log(
      `  [${result.verdict.toUpperCase()}] ${result.id}: ${result.url} (${detail})${moved}`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const entries = CITATIONS.filter((c) => !options.onlyId || c.id === options.onlyId).map(
    (c) => ({ id: c.id, url: c.url }),
  );
  if (entries.length === 0) {
    console.error(`No citation matched${options.onlyId ? ` id '${options.onlyId}'` : ''}.`);
    process.exit(2);
  }
  const results = await sweep(entries, options);
  if (options.json) {
    console.log(JSON.stringify({ summary: summarize(results), results }, null, 2));
  } else {
    reportText(results);
  }
  if (results.some((r) => r.verdict === 'dead')) {
    process.exit(1);
  }
}

await main();
