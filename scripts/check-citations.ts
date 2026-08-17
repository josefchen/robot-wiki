/**
 * Citation audit checker: reachability AND document identity.
 *
 * The liveness sweep (npm run check:links) answers "does every registry URL
 * resolve?". This checker answers the harder half of VAL-AUDIT-008: for every
 * entry in data/citations.ts it fetches the URL with a real browser user
 * agent, records the full redirect chain, extracts the fetched document's
 * title, and compares it against the registry entry's title for plausibility.
 * A URL that 200s but serves a different paper is reported as a failure, not
 * a pass; that title check is the point of this script.
 *
 * Web.archive.org awareness: a dated https://web.archive.org/web/<timestamp>/
 * capture is a deliberate, valid citation (the sanctioned form for a canonical
 * source that is genuinely http-only, see the registry header), so the
 * checker marks it "archival" and checks it like any other URL rather than
 * reporting it as an oddity.
 *
 * Like the liveness sweep, this is deliberately NOT wired into the build:
 * 300+ network calls with body reads would make every build slow and flaky
 * offline. Run it on demand:
 *
 *   npm run check:citations                       # audit every citation
 *   npm run check:citations -- --id act-aloha-2023  # re-audit one entry
 *   npm run check:citations -- --json             # machine-readable report
 *   npm run check:citations -- --markdown         # audit/citations.md table
 *
 * Output is deterministic (registry order, no timings), so consecutive runs
 * on an unchanged registry and unchanged web diff cleanly. Exit code is 1 on
 * any dead link, any unexplained blocked/error, or any title mismatch; 0
 * means every citation is reachable and serves the document it names.
 */

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyException,
  BROWSER_UA,
  classifyStatus,
  extractDoi,
  parseCrossrefWork,
  shouldRetryStatus,
  validateExceptions,
  verifyCrossrefWork,
  type CrossrefWork,
} from '../lib/citation-links.ts';
import {
  applyTitleMismatchException,
  compareTitles,
  extractHtmlTitle,
  formatRedirectChain,
  isAuditFailure,
  parseArchivalCapture,
  pdfFirstPageTitle,
  type CitationAuditResult,
  type RedirectHop,
} from '../lib/citation-audit.ts';
import { CITATIONS, type Citation } from '../data/citations.ts';
import { LINK_CHECK_EXCEPTIONS } from '../data/link-check-exceptions.ts';

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_CONCURRENCY = 6;
/** Pause before the single 5xx/network retry. */
const RETRY_BACKOFF_MS = 1_500;
/** Redirect hops before giving up (web.archive.org normalization adds one). */
const MAX_REDIRECTS = 12;
/** HTML titles live in <head>; this cap is generous and avoids whole-page reads. */
const HTML_READ_CAP_BYTES = 400_000;
/** PDFs must be complete for pdftotext; skip text extraction above this size. */
const PDF_READ_CAP_BYTES = 60_000_000;

const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8',
};

interface CliOptions {
  onlyId?: string;
  json: boolean;
  markdown: boolean;
  pdfText: boolean;
  timeoutMs: number;
  concurrency: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    markdown: false,
    pdfText: true,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--markdown') options.markdown = true;
    else if (arg === '--no-pdf-text') options.pdfText = false;
    else if (arg === '--id') options.onlyId = argv[++i];
    else if (arg === '--timeout') options.timeoutMs = Number(argv[++i]);
    else if (arg === '--concurrency') options.concurrency = Number(argv[++i]);
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (options.json && options.markdown) {
    console.error('--json and --markdown are mutually exclusive.');
    process.exit(2);
  }
  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FetchedDocument {
  chain: RedirectHop[];
  status: number;
  finalUrl: string;
  response?: Response;
  error?: string;
}

/**
 * GET the URL without following redirects, walking each Location hop by hand
 * so the report can show the whole chain (a redirect to an unrelated page is
 * exactly the failure mode the chain makes visible). Only the final response
 * keeps its body for reading.
 */
async function fetchDocument(url: string, timeoutMs: number): Promise<FetchedDocument> {
  const chain: RedirectHop[] = [];
  let current = url;
  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: REQUEST_HEADERS,
      });
    } catch (error) {
      clearTimeout(timer);
      // Status 0 (not the last hop's 3xx) so the retry policy recognizes a
      // network-level failure wherever in the chain it happened.
      return {
        chain,
        status: 0,
        finalUrl: current,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    clearTimeout(timer);
    chain.push({ status: response.status, url: current });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);
      if (!location) {
        // A 3xx without Location is malformed; report it where it stopped.
        return { chain, status: response.status, finalUrl: current };
      }
      current = new URL(location, current).toString();
      continue;
    }
    return { chain, status: response.status, finalUrl: current, response };
  }
  return { chain, status: 0, finalUrl: current, error: `more than ${MAX_REDIRECTS} redirects` };
}

/** Read up to capBytes of a body, then release the stream. */
async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  capBytes: number,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total >= capBytes) break;
    }
  }
  await reader.cancel().catch(() => undefined);
  const buffer = new Uint8Array(Math.min(total, capBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, buffer.length - offset);
    buffer.set(chunk.subarray(0, take), offset);
    offset += take;
    if (offset >= buffer.length) break;
  }
  return buffer;
}

/**
 * Verify a bot-walled DOI-bearing URL through Crossref content negotiation,
 * with one retry: under sweep concurrency the doi.org metadata endpoint
 * occasionally times out or resets, and a transient Crossref failure would
 * otherwise turn a verifiable DOI entry into unexplained noise.
 */
async function fetchCrossrefWork(doi: string, timeoutMs: number): Promise<CrossrefWork | null> {
  const attempt = async (): Promise<CrossrefWork | null> => {
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
  };
  const first = await attempt();
  if (first) return first;
  await sleep(RETRY_BACKOFF_MS);
  return attempt();
}

/** pdftotext (poppler) availability, probed once per run. */
function pdftotextAvailable(): boolean {
  const probe = spawnSync('pdftotext', ['-v'], { timeout: 5_000 });
  return probe.error === undefined;
}

/**
 * Infer the DOI a URL identifies, beyond paths that literally carry one.
 * Nature article URLs are DOI paths for the 10.1038 prefix
 * (nature.com/articles/s41586-023-06419-4 is 10.1038/s41586-023-06419-4),
 * which lets Crossref verify documents behind Nature's "Client Challenge"
 * interstitial.
 */
function inferDoi(url: string): string | null {
  const explicit = extractDoi(url);
  if (explicit) return explicit;
  const nature = /^https:\/\/www\.nature\.com\/articles\/(s[^/?#]+)/i.exec(url);
  if (nature) return `10.1038/${nature[1]}`;
  return null;
}

class PdfTitleExtractor {
  private dir: string | null = null;

  private constructor() {}

  static async create(available: boolean): Promise<PdfTitleExtractor> {
    const extractor = new PdfTitleExtractor();
    if (available) {
      extractor.dir = await mkdtemp(join(tmpdir(), 'citation-audit-'));
    }
    return extractor;
  }

  async extract(id: string, bytes: Uint8Array): Promise<string | undefined> {
    if (!this.dir) return undefined;
    const file = join(this.dir, `${id}.pdf`);
    await writeFile(file, bytes);
    const result = spawnSync('pdftotext', ['-f', '1', '-l', '1', file, '-'], {
      timeout: 30_000,
      maxBuffer: 4_000_000,
    });
    if (result.status !== 0 || !result.stdout) return undefined;
    return pdfFirstPageTitle(result.stdout.toString());
  }

  async cleanup(): Promise<void> {
    if (this.dir) await rm(this.dir, { recursive: true, force: true });
  }
}

async function auditOne(
  citation: Citation,
  options: CliOptions,
  pdf: PdfTitleExtractor,
): Promise<CitationAuditResult> {
  const { id, url } = citation;
  const archival = parseArchivalCapture(url);

  let attempt = await fetchDocument(url, options.timeoutMs);
  if (shouldRetryStatus(attempt.status)) {
    // One retry with backoff: intermittent 5xx and transient connection
    // resets are noise, not a verdict.
    await sleep(RETRY_BACKOFF_MS);
    const retry = await fetchDocument(url, options.timeoutMs);
    if (!shouldRetryStatus(retry.status)) attempt = retry;
  }

  const result: CitationAuditResult = {
    id,
    url,
    verdict: classifyStatus(attempt.status),
    status: attempt.status,
    chain: attempt.chain,
    finalUrl: attempt.finalUrl,
    titleComparison: 'unavailable',
    ...(archival ? { archival } : {}),
    ...(attempt.error ? { error: attempt.error } : {}),
  };

  if (attempt.response && result.verdict === 'live') {
    const contentType = attempt.response.headers.get('content-type') ?? '';
    const contentLength = Number(attempt.response.headers.get('content-length') ?? '0');
    try {
      if (contentType.includes('pdf') || (!contentType && url.endsWith('.pdf'))) {
        if (
          options.pdfText &&
          (contentLength === 0 || contentLength <= PDF_READ_CAP_BYTES)
        ) {
          const bytes = await readCapped(attempt.response.body, PDF_READ_CAP_BYTES);
          const title = await pdf.extract(id, bytes);
          if (title) {
            result.fetchedTitle = title;
            result.titleCheckedBy = 'pdf';
            result.titleComparison = compareTitles(citation.title, title, citation.type);
          }
        }
      } else {
        const html = new TextDecoder('utf-8', { fatal: false }).decode(
          await readCapped(attempt.response.body, HTML_READ_CAP_BYTES),
        );
        const title = extractHtmlTitle(html);
        if (title) {
          result.fetchedTitle = title;
          result.titleCheckedBy = 'html';
          result.titleComparison = compareTitles(citation.title, title, citation.type);
        }
      }
    } finally {
      await attempt.response.body?.cancel().catch(() => undefined);
    }
    if (result.titleComparison !== 'unavailable') return result;
    // The fetch reached a 2xx but the title was unusable (JS-rendered SPA,
    // bot-wall interstitial served with 200, no title element). When the URL
    // identifies a DOI, Crossref metadata still verifies the document.
    return crossrefVerify(citation, result, `no comparable title at HTTP ${attempt.status}`, options.timeoutMs);
  }

  // No final response body: blocked, errored, or dead. When the URL carries a
  // DOI, Crossref metadata verifies the document identity (title and year).
  return crossrefVerify(citation, result, `publisher answered HTTP ${attempt.status}`, options.timeoutMs);
}

/**
 * Verify a result through Crossref content negotiation for its DOI. Only a
 * full title+year match upgrades the result; anything else leaves the
 * observed verdict in place.
 */
async function crossrefVerify(
  citation: Citation,
  result: CitationAuditResult,
  why: string,
  timeoutMs: number,
): Promise<CitationAuditResult> {
  const doi = inferDoi(result.url);
  if (!doi) return result;
  const work = await fetchCrossrefWork(doi, timeoutMs);
  if (!work) return result;
  const verification = verifyCrossrefWork(citation, work, { missingYearIsAcceptable: true });
  if (verification.ok) {
    return {
      ...result,
      titleComparison: 'match',
      titleCheckedBy: 'crossref',
      resolvedBy: 'crossref',
      resolutionNote: `${why}; Crossref metadata for doi:${doi} matches the registry title${
        work.years.length > 0 ? ' and year' : ' (Crossref lists no publication year for the record)'
      }`,
    };
  }
  // A title that matches while the year conflicts is real signal, not noise:
  // the DOI resolves to a reprint of the right paper (or a different record
  // for it). Surface it as a mismatch so it is either fixed or documented,
  // instead of hiding behind "title unavailable".
  if (
    verification.titleMatched &&
    verification.yearsReported &&
    verification.yearsReported.length > 0
  ) {
    return {
      ...result,
      fetchedTitle: work.title,
      titleComparison: 'mismatch',
      resolutionNote: `title matches Crossref for doi:${doi}, but ${verification.problems.join('; ')}`,
    };
  }
  return result;
}

async function auditAll(
  entries: Citation[],
  options: CliOptions,
  exceptionsById: Map<string, (typeof LINK_CHECK_EXCEPTIONS)[number]>,
): Promise<CitationAuditResult[]> {
  const pdf = await PdfTitleExtractor.create(options.pdfText && pdftotextAvailable());
  try {
    const results: CitationAuditResult[] = [];
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(options.concurrency, entries.length) },
      async () => {
        for (;;) {
          const index = cursor;
          cursor += 1;
          if (index >= entries.length) return;
          results[index] = await auditOne(entries[index], options, pdf);
        }
      },
    );
    await Promise.all(workers);
    return results.map((result) => {
      // Exceptions explain blocked/error fetches and title mismatches, with
      // the same evidence discipline as the liveness sweep.
      let resolved = applyException(result, exceptionsById.get(result.id));
      if (result.titleComparison === 'mismatch' && !resolved.resolvedBy) {
        resolved = applyTitleMismatchException(resolved, exceptionsById.get(result.id));
      }
      return resolved;
    });
  } finally {
    await pdf.cleanup();
  }
}

interface Summary {
  checked: number;
  ok: number;
  titleUnavailable: number;
  titleMismatch: number;
  crossrefVerified: number;
  excepted: number;
  dead: number;
  blocked: number;
  error: number;
  archival: number;
}

function summarize(results: readonly CitationAuditResult[]): Summary {
  const counts: Summary = {
    checked: results.length,
    ok: 0,
    titleUnavailable: 0,
    titleMismatch: 0,
    crossrefVerified: 0,
    excepted: 0,
    dead: 0,
    blocked: 0,
    error: 0,
    archival: 0,
  };
  for (const result of results) {
    if (result.archival) counts.archival += 1;
    if (result.verdict === 'dead') {
      counts.dead += 1;
      continue;
    }
    if (result.resolvedBy === 'crossref') {
      counts.crossrefVerified += 1;
      counts.ok += 1;
      continue;
    }
    if (result.resolvedBy === 'exception') {
      counts.excepted += 1;
      continue;
    }
    if (result.verdict === 'blocked' || result.verdict === 'error') {
      counts[result.verdict] += 1;
      continue;
    }
    if (result.titleComparison === 'match') counts.ok += 1;
    else if (result.titleComparison === 'mismatch') counts.titleMismatch += 1;
    else counts.titleUnavailable += 1;
  }
  return counts;
}

function reportText(results: readonly CitationAuditResult[]): void {
  const counts = summarize(results);
  console.log(
    `Checked ${counts.checked}: ${counts.ok} ok (title verified, ` +
      `${counts.crossrefVerified} of them via Crossref), ${counts.titleUnavailable} title unavailable, ` +
      `${counts.titleMismatch} TITLE MISMATCH, ${counts.dead} dead, ${counts.blocked} blocked, ` +
      `${counts.error} error, ${counts.excepted} documented exceptions, ${counts.archival} archival captures.`,
  );
  for (const result of results) {
    const chain = formatRedirectChain(result.chain, result.finalUrl);
    const where = chain === String(result.status) ? '' : ` [${chain}]`;
    const archive = result.archival ? ` (archival capture ${result.archival.timestamp})` : '';
    if (isAuditFailure(result)) {
      const detail =
        result.titleComparison === 'mismatch'
          ? `serves a different document: fetched title "${result.fetchedTitle ?? '(none)'}"`
          : (result.error ?? `HTTP ${result.status}`);
      console.log(`  [FAIL] ${result.id}: ${result.url}${archive} (${detail})${where}`);
      continue;
    }
    if (result.resolvedBy === 'crossref' || result.resolvedBy === 'exception') {
      console.log(`  [${result.resolvedBy === 'crossref' ? 'CROSSREF' : 'EXCEPTION'}] ${result.id}: ${result.url} (${result.resolutionNote})`);
      continue;
    }
    if (result.titleComparison === 'unavailable' && result.verdict === 'live') {
      const why = result.fetchedTitle
        ? `generic title "${result.fetchedTitle}"`
        : (result.titleCheckedBy ?? 'no title');
      console.log(`  [TITLE-UNAVAILABLE] ${result.id}: ${result.url} (${why})${where}`);
    }
  }
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

/** Emit the audit/citations.md results table: id, url, verdict, title, note. */
function reportMarkdown(results: readonly CitationAuditResult[]): void {
  console.log('| id | url checked | verdict | title check | note |');
  console.log('|---|---|---|---|---|');
  for (const result of results) {
    const verdict = isAuditFailure(result)
      ? 'FAIL'
      : result.resolvedBy === 'crossref'
        ? 'ok (crossref)'
        : result.resolvedBy === 'exception'
          ? 'ok (exception)'
          : result.verdict === 'live'
            ? 'ok'
            : result.verdict;
    const title =
      result.titleComparison === 'match'
        ? `match${result.titleCheckedBy && result.titleCheckedBy !== 'html' ? ` (${result.titleCheckedBy})` : ''}`
        : result.titleComparison === 'mismatch'
          ? `MISMATCH: "${escapeTableCell(result.fetchedTitle ?? '')}"`
          : 'unavailable';
    const notes: string[] = [];
    if (result.archival) notes.push(`archival capture ${result.archival.timestamp}`);
    const chain = formatRedirectChain(result.chain, result.finalUrl);
    if (chain !== String(result.status)) notes.push(`chain: ${chain}`);
    if (result.finalUrl !== result.url) notes.push(`final: ${result.finalUrl}`);
    if (result.resolutionNote) notes.push(result.resolutionNote);
    if (result.error) notes.push(result.error);
    console.log(
      `| ${result.id} | ${escapeTableCell(result.url)} | ${verdict} | ${escapeTableCell(title)} | ${escapeTableCell(notes.join('; '))} |`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Validate the exception list before a single request goes out.
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
  const results = await auditAll(entries, options, exceptionsById);

  if (options.json) {
    console.log(JSON.stringify({ summary: summarize(results), results }, null, 2));
  } else if (options.markdown) {
    reportMarkdown(results);
  } else {
    reportText(results);
  }
  if (results.some(isAuditFailure)) process.exit(1);
}

await main();
