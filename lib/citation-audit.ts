/**
 * Pure logic for the citation audit checker (scripts/check-citations.ts).
 *
 * The liveness sweep (lib/citation-links.ts) answers "does the URL resolve?".
 * This module answers the harder question: "is the
 * fetched document the one the registry entry describes?" A URL that 200s
 * but serves a different paper is a failure, not a pass, so the checker
 * extracts the fetched document's title and compares it against the registry
 * title for plausibility.
 *
 * Everything here is network-free and deterministic so it can be unit-tested:
 * web.archive.org capture parsing (the sanctioned pattern for http-only
 * canonical sources), HTML/PDF title extraction, and the title comparison
 * heuristic with its thresholds.
 */

import { normalizeTitle, type ExceptedVerdict, type LinkCheckException } from './citation-links.ts';

/**
 * A dated web.archive.org capture: the sanctioned citation form for a
 * canonical source that is genuinely served over http only (decided
 * 2026-08-12; see the registry header and library/content-quality.md). The
 * capture itself is https, so it satisfies the https-only schema, and the
 * dated timestamp makes it content-addressed and stable. The checker treats
 * such URLs as deliberate, valid citations, never as oddities.
 */
export interface ArchivalCapture {
  /** Capture timestamp as written in the URL, e.g. "20241231102234". */
  timestamp: string;
  /** The original URL the capture preserves, exactly as embedded. */
  originalUrl: string;
}

const ARCHIVAL_CAPTURE_RE = /^https:\/\/web\.archive\.org\/web\/(\d{4,14})(?:id_)?\/(.+)$/i;

/** Parse a web.archive.org capture URL, or null for any other URL. */
export function parseArchivalCapture(url: string): ArchivalCapture | null {
  const match = ARCHIVAL_CAPTURE_RE.exec(url);
  if (!match) return null;
  return { timestamp: match[1], originalUrl: match[2] };
}

/** One hop of a redirect chain: the status and the URL that produced it. */
export interface RedirectHop {
  status: number;
  url: string;
}

/**
 * Render a redirect chain deterministically for reports: "200" when the
 * document was served directly, otherwise each hop's status and the final
 * URL, e.g. "302 -> 200 https://example.org/paper.html".
 */
export function formatRedirectChain(hops: readonly RedirectHop[], finalUrl: string): string {
  if (hops.length <= 1) return String(hops[0]?.status ?? 0);
  const statuses = hops.map((hop) => hop.status).join(' -> ');
  return `${statuses} ${finalUrl}`;
}

/** Outcome of comparing a fetched document title against the registry title. */
export type TitleComparison = 'match' | 'mismatch' | 'unavailable';

/** The citation types whose registry titles are descriptive labels. */
type CitationType = 'paper' | 'blog' | 'docs' | 'press';

const TITLE_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'for',
  'with',
  'in',
  'on',
  'to',
  'from',
  'at',
  'by',
  'via',
  'as',
  'is',
  'are',
]);

function titleTokens(title: string): string[] {
  return normalizeTitle(title)
    .split(' ')
    .filter((token) => token.length > 0 && !TITLE_STOPWORDS.has(token));
}

/**
 * Page titles that carry no document identity: bot-wall interstitials,
 * loading shells, and other placeholders. When the fetched page wears one of
 * these, the title check is "unavailable", not "mismatch": there is no
 * evidence either way about which document the URL serves.
 */
const GENERIC_PAGE_TITLES = new Set([
  'just a moment',
  'client challenge',
  'security check',
  'attention required',
  'access denied',
  'you need to have javascript enabled',
  'please wait',
  'redirecting',
  'loading',
  'untitled',
  'home',
  'welcome',
  'welcome to nginx',
  '403 forbidden',
  '404 not found',
  'not found',
  'error',
  'bad request',
  'service unavailable',
  'log in',
  'login',
  'sign in',
  'sign in twitter',
]);

function isGenericPageTitle(title: string): boolean {
  const normalized = normalizeTitle(title);
  if (normalized.length === 0) return true;
  return GENERIC_PAGE_TITLES.has(normalized);
}

/**
 * Compare the fetched document title with the registry title for
 * plausibility. This is deliberately a heuristic with published thresholds,
 * not a string equality: fetched titles carry site suffixes
 * ("... | TechCrunch"), descriptive registry labels ("Helix (System 1 /
 * System 2 humanoid VLA announcement)"), and case/punctuation drift.
 *
 * Verdicts:
 * - 'match': the fetched title plausibly IS the registry document.
 * - 'mismatch': the fetched title names a different document. This is the
 *   wrong-paper signal this checker exists to catch.
 * - 'unavailable': no comparable title was obtainable (generic/placeholder
 *   title, empty title). Not evidence of anything; reported, never fatal.
 */
export function compareTitles(
  registryTitle: string,
  fetchedTitle: string,
  citationType: CitationType = 'paper',
): TitleComparison {
  if (isGenericPageTitle(fetchedTitle)) return 'unavailable';
  const registry = titleTokens(registryTitle);
  if (registry.length === 0) return 'unavailable';
  const fetched = titleTokens(fetchedTitle);
  if (fetched.length === 0) return 'unavailable';

  // Containment either way: site-suffixed titles contain the paper title;
  // short page titles ("Helix") are contained in descriptive registry labels.
  if (containsSubsequence(registry, fetched) || containsSubsequence(fetched, registry)) {
    return 'match';
  }

  const registrySet = new Set(registry);
  const fetchedSet = new Set(fetched);
  let matched = 0;
  for (const token of registrySet) {
    if (fetchedSet.has(token)) matched += 1;
  }
  const ratio = matched / registry.length;

  // Numeric tokens in PAPER titles are the strongest distinguishers between
  // siblings ("RT-1" vs "RT-2", "Genie 2" vs "Genie 3"): a paper whose
  // numbers do not appear on the page is the wrong sibling, whatever the
  // word overlap. Docs/blog/press titles are descriptive labels, and their
  // numbers name products and dates that the page describes in prose, so
  // the rule would misfire on them.
  if (citationType === 'paper') {
    const registryNumerics = [...registrySet].filter((token) => /^\d+$/.test(token));
    if (registryNumerics.length > 0) {
      const numericsMatched = registryNumerics.filter((token) => fetchedSet.has(token)).length;
      if (numericsMatched / registryNumerics.length < 0.5) return 'mismatch';
    }
  }

  // Strong signal: most of the registry title's words are on the page.
  if (ratio >= 0.6) return 'match';
  // Tolerable partial: several distinct words match (truncated titles,
  // subtitle drift), but never a single generic word.
  if (ratio >= 0.4 && matched >= 3) return 'match';
  // Docs/blog/press entries carry descriptive label titles, not document
  // titles; for those, two distinct content words in common is the bar, and
  // a single strong word out of a short label ("LeRobot Documentation" vs
  // "LeRobot · Hugging Face") also clears it.
  if (citationType !== 'paper' && matched >= 2) return 'match';
  if (citationType !== 'paper' && matched >= 1 && ratio >= 0.5) return 'match';
  // A single-token registry title ("openpi") matches by presence.
  if (registry.length === 1 && matched === 1) return 'match';
  return 'mismatch';
}

/** Whether needle appears in haystack as a contiguous token subsequence. */
function containsSubsequence(needle: readonly string[], haystack: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) continue outer;
    }
    return true;
  }
  return false;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

/** Decode the HTML entities that appear in real-world <title> content. */
export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    const lower = body.toLowerCase();
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    const named = NAMED_ENTITIES[lower];
    return named ?? whole;
  });
}

/**
 * Extract a document title from the first chunk of an HTML page.
 *
 * Precedence: the scholarly `citation_title` meta tag (exact paper title on
 * publisher pages), then <title>, then og:title (often the only clean title
 * on SPA sites). Returns undefined when none is present; whitespace-only
 * titles count as absent.
 */
export function extractHtmlTitle(html: string): string | undefined {
  const pick = (regex: RegExp): string | undefined => {
    const match = regex.exec(html);
    if (!match) return undefined;
    const decoded = decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
    return decoded.length > 0 ? decoded : undefined;
  };
  return (
    pick(/<meta[^>]+name=["']citation_title["'][^>]*content=["']([^"']*)["']/i) ??
    pick(/<title[^>]*>([\s\S]{0,600}?)<\/title>/i) ??
    pick(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ??
    pick(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i)
  );
}

/**
 * Undo PDF small-caps letterspacing: pdftotext renders letterspaced caps as
 * "C ASA", "L ARGE", "S CALE". A single capital followed by a run of
 * capitals is almost always a split word ("ROBO C ASA" -> "ROBO CASA");
 * the article "A" is the one capital that legitimately stands alone
 * ("A L ARGE" -> "A LARGE", not "ALARGE").
 */
function squeezeLetterspacedCaps(text: string): string {
  let squeezed = text;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = squeezed.replace(/(?<![A-Z])[B-Z] (?=[A-Z]{2,})/g, (split) =>
      split.replace(/ $/, ''),
    );
    if (next === squeezed) break;
    squeezed = next;
  }
  return squeezed;
}

/**
 * Characters expected in a readable title: ASCII letters, digits, common
 * punctuation and spacing, plus Latin-1 letters and Greek (π0.5, Åström).
 * pdftotext output for PDFs without a usable text layer (early LaTeX with
 * Type 3 fonts) is symbol soup; a candidate dominated by characters outside
 * this set is not a title.
 */
const READABLE_TITLE_CHAR = /[A-Za-z0-9 .,:;'"/()\[\]&%+\-–—…\u00C0-\u024F\u0370-\u03FF]/;

/**
 * Extract a plausible title from a PDF's first-page text (pdftotext output).
 * Paper first pages put the title in the opening lines; page numbers and
 * bare arXiv stamps are skipped. Enough lines are joined to cover multi-line
 * titles, subtitle-style registry labels, and FDA 510(k) cover letters whose
 * device-name line sits a few lines down.
 */
export function pdfFirstPageTitle(firstPageText: string): string | undefined {
  const lines = firstPageText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 1 && !/^\d+$/.test(line) && !/^arxiv:/i.test(line));
  const candidate = squeezeLetterspacedCaps(lines.slice(0, 12).join(' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (candidate.length === 0) return undefined;
  const readable = [...candidate].filter((ch) => READABLE_TITLE_CHAR.test(ch)).length;
  if (readable / candidate.length < 0.7) return undefined;
  return candidate;
}

/** A fetched-document audit result, one per registry entry. */
export interface CitationAuditResult {
  id: string;
  url: string;
  /** Link verdict for the HTTP status (reuses the liveness taxonomy). */
  verdict: 'live' | 'dead' | 'blocked' | 'error';
  status: number;
  /** Every redirect hop, in order, starting with the registry URL. */
  chain: RedirectHop[];
  finalUrl: string;
  /** Set when the registry URL is a dated web.archive.org capture. */
  archival?: ArchivalCapture;
  /** The extracted document title, when one was obtained. */
  fetchedTitle?: string;
  /** Title comparison against the registry entry. */
  titleComparison: TitleComparison;
  /**
   * How the title comparison was made, when it was not against fetched page
   * markup ('crossref' metadata, PDF first page, or 'exception').
   */
  titleCheckedBy?: 'html' | 'pdf' | 'crossref';
  /** Set when blocked/error was resolved by Crossref metadata. */
  resolvedBy?: 'crossref' | 'exception';
  resolutionNote?: string;
  error?: string;
}

/** Whether an audit result represents a confirmed failure. */
export function isAuditFailure(result: CitationAuditResult): boolean {
  if (result.verdict === 'dead') return true;
  if (result.verdict === 'blocked' || result.verdict === 'error') {
    return !result.resolvedBy;
  }
  return result.titleComparison === 'mismatch' && !result.resolvedBy;
}

/**
 * Apply a documented exception to a title mismatch. Mirrors applyException in
 * lib/citation-links.ts for the audit checker's failure mode: the exception
 * must name the entry and cover 'title-mismatch', and it never touches a
 * dead link or an unlisted entry.
 */
export function applyTitleMismatchException(
  result: CitationAuditResult,
  exception: LinkCheckException | undefined,
): CitationAuditResult {
  if (!exception || exception.id !== result.id) return result;
  if (!exception.covers.includes('title-mismatch' satisfies ExceptedVerdict)) return result;
  if (result.titleComparison !== 'mismatch') return result;
  return {
    ...result,
    resolvedBy: 'exception',
    resolutionNote: `${exception.reason} Verified ${exception.verifiedOn}: ${exception.verifiedBy}`,
  };
}
