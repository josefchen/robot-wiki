/**
 * Global no-slop lint over the shipped prose and export.
 *
 * Two checks, both pure functions over strings so they are unit-testable:
 *
 * 1. Placeholder sweep: scan every exported HTML file for placeholder
 *    markers (`lorem`, `TODO`, `FIXME`, "coming soon") and raw un-rendered
 *    MDX/JSX component tokens (a literal `<Figure`, `<Cite`, `<Term`,
 *    `<Image` rendered as text).
 *
 * 2. AI-writing marker lint over shipped prose, in two places:
 *    every MDX body in content/, and the rendered prose extracted from
 *    the built export (component copy, data-file strings that render,
 *    landing-page text, <title> and meta/og descriptions). The checks are
 *    banned vocabulary per the humanizer skill's list (promotional
 *    language, inflated symbolism, vague-attribution phrases, filler
 *    transitions, superficial -ing tacks), em/en dashes, and rule-of-three
 *    density. Before matching, maskNonProse blanks fenced code, inline
 *    code, URLs, and JSX/HTML tags - and only those. Nothing else is
 *    masked, and quotation marks are never masked.
 *
 *    The single carve-out for verbatim quoted source text is the
 *    attribution-scoped exception registry in data/no-slop-exceptions.ts:
 *    a quotation is exempt only when its exact text is
 *    registered there against a citation-registry id or a named source
 *    URL, each entry carrying why the text is verbatim, how a human
 *    verified it against the source, and when. The exemption comes from
 *    that registration, never from punctuation: unregistered text inside
 *    quotation marks still fails, which the unit tests
 *    pin from both directions.
 *
 * The CLI wrapper (scripts/lint-no-slop.ts) runs both against the real
 * repo/export and exits non-zero on any hit, wired into validate:content.
 */

/** Placeholder markers that must never appear in the export. */
const PLACEHOLDER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'lorem', pattern: /lorem/i },
  { label: 'TODO', pattern: /\bTODO\b/ },
  { label: 'FIXME', pattern: /\bFIXME\b/ },
  { label: 'coming soon', pattern: /coming soon/i },
  // Raw MDX/JSX component tags rendered as visible text (un-compiled MDX).
  { label: 'raw <Figure> tag', pattern: /&lt;Figure[\s>/]/ },
  { label: 'raw <Cite> tag', pattern: /&lt;Cite[\s>/]/ },
  { label: 'raw <Term> tag', pattern: /&lt;Term[\s>/]/ },
  { label: 'raw <Image> tag', pattern: /&lt;Image[\s>/]/ },
  { label: 'raw <Aside> tag', pattern: /&lt;Aside[\s>/]/ },
];

/** Find every placeholder marker in one exported HTML document. */
export function findPlaceholderMarkers(html: string): string[] {
  // Mask script/style blocks: their contents are not reader-visible.
  const masked = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  const hits: string[] = [];
  for (const { label, pattern } of PLACEHOLDER_PATTERNS) {
    if (pattern.test(masked)) hits.push(label);
  }
  return hits;
}

/**
 * Banned AI-writing vocabulary in shipped prose, from the humanizer
 * skill's high-frequency list. Word-boundary matched, case-insensitive.
 * Each entry carries the category the contract names.
 */
const BANNED_VOCABULARY: Array<{ word: string; category: string }> = [
  // Promotional / advertisement-like (humanizer §4).
  { word: 'game-changing', category: 'promotional' },
  { word: 'revolutionary', category: 'promotional' },
  { word: 'cutting-edge', category: 'promotional' },
  { word: 'groundbreaking', category: 'promotional' },
  { word: 'breathtaking', category: 'promotional' },
  { word: 'must-visit', category: 'promotional' },
  { word: 'vibrant', category: 'promotional' },
  { word: 'boasts', category: 'promotional' },
  { word: 'showcasing', category: 'promotional' },
  { word: 'unlock', category: 'promotional' },
  { word: 'unlocks', category: 'promotional' },
  { word: 'unleash', category: 'promotional' },
  { word: 'seamless', category: 'promotional' },
  { word: 'seamlessly', category: 'promotional' },
  // Inflated significance (humanizer §1).
  { word: 'testament', category: 'inflated-significance' },
  { word: 'tapestry', category: 'inflated-significance' },
  { word: 'delve', category: 'inflated-significance' },
  { word: 'underscore', category: 'inflated-significance' },
  { word: 'underscores', category: 'inflated-significance' },
  { word: 'pivotal', category: 'inflated-significance' },
  { word: 'landscape', category: 'inflated-significance' },
  // Filler / throat-clearing (humanizer §23).
  { word: 'importantly', category: 'filler' },
  { word: 'needless', category: 'filler' },
  // -ing superficial analysis tacks (humanizer §3), word form only for
  // the strongest two markers.
  { word: 'fostering', category: 'superficial-ing' },
  { word: 'garnering', category: 'superficial-ing' },
];

/**
 * Vague-attribution phrases (humanizer §5): opinions attributed to an
 * unnamed authority. These are phrase-level, deliberately: the vice is the
 * attribution construction ("critics say"), not the noun, so a concrete
 * reference like "critics of the approach" passes, while "experts argue"
 * and "it is widely believed" fail with no named source in sight.
 */
const VAGUE_ATTRIBUTION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: 'authority + attribution verb',
    pattern:
      /\b(critics|observers|experts|analysts|skeptics|commentators)\s+(have\s+)?(say|says|said|cite|cites|cited|argue|argues|argued|believe|believes|believed|claim|claims|claimed|contend|contends|note|notes|noted|think|thinks|warn|warns|warned|suggest|suggests|suggested|maintain|maintains|maintained|agree|agrees|agreed|report|reports|reported)\b/i,
  },
  {
    label: 'quantified unnamed authority',
    pattern:
      /\b(some|many|most|several)\s+(critics|observers|experts|analysts|skeptics|commentators|sources|publications)\b/i,
  },
  {
    label: 'many + stance verb',
    pattern:
      /\bmany\s+(argue|argues|argued|believe|believes|believed|say|says|said|think|thinks|consider|considers|considered)\b/i,
  },
  {
    label: 'widely believed',
    pattern: /\b(?:it\s+is\s+)?widely\s+(believed|held|accepted|assumed|known|reported|considered)\b/i,
  },
];

/** Em and en dashes: zero in shipped prose (humanizer §14, hard rule). */
export const DASH_PATTERN = /[—–]/;

/** Mask code, URLs, and HTML/JSX so only prose words are scanned. */
export function maskNonProse(body: string): string {
  // Blank (not remove) so match offsets keep their line numbers.
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  return body
    .replace(/```[\s\S]*?```/g, blank) // fenced code
    .replace(/`[^`\n]*`/g, blank) // inline code
    .replace(/https?:\/\/\S+/g, blank) // URLs
    .replace(/<\/?[A-Za-z][^>\n]*>/g, blank); // JSX/HTML tags
}

/**
 * A registered exception exempting one verbatim quotation from the marker
 * lint. House pattern of data/link-check-exceptions.ts:
 * every field is mandatory and the registry is validated before the lint
 * runs, because an exception without evidence is a suppressed failure.
 *
 * The exemption is attribution-scoped and text-exact: `quote` must appear
 * verbatim (whitespace-insensitively) in the scanned text, or nothing is
 * masked. Registration, never punctuation, is what grants the exemption.
 */
export interface SlopQuotationException {
  /** Citation id from data/citations.ts, or a stable slug for a non-citation source (then sourceUrl is required). */
  id: string;
  /** The verbatim text as it appears in shipped prose (minimum 3 words). */
  quote: string;
  /** Why this text is excepted: whose words, and why they must stay verbatim. */
  reason: string;
  /** How a human last verified the quote matches the named source. */
  verifiedBy: string;
  /** ISO calendar date (YYYY-MM-DD) of that verification. */
  verifiedOn: string;
  /** Required when `id` is not a citation-registry id: names the source the quote came from. */
  sourceUrl?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the quotation-exception registry. Returns a list of problems;
 * an empty list means every exception carries its justification. Anything
 * else fails the lint before scanning, mirroring validateExceptions in
 * lib/citation-links.ts.
 */
export function validateQuotationExceptions(
  exceptions: readonly SlopQuotationException[],
  citationIds: ReadonlySet<string>,
  today: Date = new Date(),
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const exception of exceptions) {
    const label = exception.id || '(missing id)';
    if (!exception.id) {
      problems.push('An exception is missing its source id.');
      continue;
    }
    if (!citationIds.has(exception.id) && !exception.sourceUrl) {
      problems.push(
        `'${label}' matches no citation in the registry and records no sourceUrl: an exemption must be attributable to a named source.`,
      );
    }
    const key = `${exception.id}\u0000${exception.quote.trim()}`;
    if (seen.has(key)) {
      problems.push(`'${label}' registers the same quotation twice.`);
    }
    seen.add(key);
    const tokens = exception.quote.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 3) {
      problems.push(
        `'${label}' registers a quotation shorter than three words: a trivial entry (the em dash glyph alone, say) would exempt that token everywhere, so substance is an anti-abuse bound.`,
      );
    }
    if (typeof exception.reason !== 'string' || exception.reason.trim().length === 0) {
      problems.push(`'${label}' records no reason: whose words are these and why must they stay verbatim?`);
    }
    if (typeof exception.verifiedBy !== 'string' || exception.verifiedBy.trim().length === 0) {
      problems.push(
        `'${label}' records no verification method: how was the quote last checked against the source?`,
      );
    }
    if (typeof exception.verifiedOn !== 'string' || !ISO_DATE.test(exception.verifiedOn)) {
      problems.push(`'${label}' records no valid verification date (want YYYY-MM-DD).`);
    } else {
      const verified = new Date(`${exception.verifiedOn}T00:00:00Z`);
      if (Number.isNaN(verified.getTime())) {
        problems.push(`'${label}' verification date '${exception.verifiedOn}' is not a real date.`);
      } else {
        const todayUtc = Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        );
        if (verified.getTime() > todayUtc) {
          problems.push(`'${label}' verification date '${exception.verifiedOn}' is in the future.`);
        }
      }
    }
  }
  return problems;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whitespace-insensitive, text-exact matcher for a registered quotation:
 * tokens must appear in order with any whitespace between them (MDX wraps
 * lines; HTML collapses spaces), and no token may differ.
 */
export function quoteMatches(text: string, quote: string): boolean {
  const source = quoteRegExpSource(quote);
  if (!source) return false;
  return new RegExp(source).test(text);
}

function quoteRegExpSource(quote: string): string | null {
  const tokens = quote
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (tokens.length === 0) return null;
  return tokens.join('\\s+');
}

/**
 * Blank every verbatim occurrence of a registered quotation, preserving
 * newlines (match offsets keep their line numbers). Text that merely
 * resembles a registered quote is untouched, so it still fails the lint.
 */
export function maskRegisteredQuotes(
  text: string,
  exceptions: readonly SlopQuotationException[],
): string {
  let masked = text;
  for (const exception of exceptions) {
    const source = quoteRegExpSource(exception.quote);
    if (!source) continue;
    masked = masked.replace(new RegExp(source, 'g'), (match) =>
      match.replace(/[^\n]/g, ' '),
    );
  }
  return masked;
}

/**
 * Registry entries whose quotation no longer appears in any scanned text.
 * A stale entry is leftover paperwork, not a failure; the runner surfaces
 * each one so the registry stays honest (the same contract
 * data/link-check-exceptions.ts holds with its [STALE] report).
 */
export function findStaleQuotationExceptions(
  exceptions: readonly SlopQuotationException[],
  texts: readonly string[],
): SlopQuotationException[] {
  return exceptions.filter(
    (exception) => !texts.some((text) => quoteMatches(text, exception.quote)),
  );
}

export interface SlopFinding {
  file: string;
  line: number;
  message: string;
}

/** 1-based line numbers of every dash in an MDX body (prose only). */
export function dashLines(
  body: string,
  exceptions: readonly SlopQuotationException[] = [],
): number[] {
  const masked = maskRegisteredQuotes(maskNonProse(body), exceptions);
  const lines: number[] = [];
  masked.split('\n').forEach((line, i) => {
    if (DASH_PATTERN.test(line)) lines.push(i + 1);
  });
  return lines;
}

/** Find banned vocabulary in an MDX body, prose only, with line numbers. */
export function findBannedVocabulary(
  body: string,
  exceptions: readonly SlopQuotationException[] = [],
): Array<SlopFinding & { word: string }> {
  const masked = maskRegisteredQuotes(maskNonProse(body), exceptions);
  const findings: Array<SlopFinding & { word: string }> = [];
  masked.split('\n').forEach((line, i) => {
    for (const { word, category } of BANNED_VOCABULARY) {
      const pattern = new RegExp(`\\b${word}\\b`, 'i');
      if (pattern.test(line)) {
        findings.push({
          file: '',
          line: i + 1,
          word,
          message: `banned ${category} marker "${word}"`,
        });
      }
    }
    for (const { pattern } of VAGUE_ATTRIBUTION_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        findings.push({
          file: '',
          line: i + 1,
          word: match[0],
          message: `banned vague-attribution phrase "${match[0]}" (attribute to a named source)`,
        });
      }
    }
  });
  return findings;
}

/**
 * Rule-of-three padding density (humanizer §10): count "X, Y, and Z"
 * enumerations per 1000 words of prose. Dense triads are an AI cadence
 * marker; the threshold allows ordinary technical enumeration.
 *
 * The measurement floor is 100 words, not the historical 200. The 200-word
 * floor silently reported every shorter page as density 0, conflating
 * "measured and clean" with "not measured" (the /data-hardware/ and
 * /world-models/ landing pages carried true densities of 46 and 42 at 195
 * words and passed invisibly until unrelated footer copy pushed them over
 * the floor). 100 words keeps the same statistical reasoning at a scale a
 * short page can actually reach: at 100 words the limit of 22 per 1000
 * requires 3 triads to fail, so a 40-word page with two triads (density
 * 50 by raw ratio) still cannot fail - the denominator-noise false
 * positive the floor exists to prevent stays prevented. Below 100 words
 * the density is still computed but the page is reported as sub-floor
 * informationally (see ruleOfThreeResult), never silently zero.
 */
export const RULE_OF_THREE_MIN_WORDS = 100;

/** Outcome of the rule-of-three measurement for one body of prose. */
export interface RuleOfThreeResult {
  /** Masked prose word count the measurement ran over. */
  words: number;
  /** Triads per 1000 words, computed whenever words > 0 (never a silent 0). */
  density: number;
  /** True when words meet the measurement floor and the limit applies. */
  measured: boolean;
  /** True when words > 0 but below the floor: informational, not passing. */
  subFloor: boolean;
}

/**
 * Measure rule-of-three density and make the measured / not-measured
 * distinction legible. `density` is the true ratio for any non-empty body;
 * `measured` says whether the gate's failure threshold applies; `subFloor`
 * marks a body too short for the threshold to be meaningful, which the
 * runner reports informationally instead of scoring it as a clean zero.
 */
export function ruleOfThreeResult(body: string): RuleOfThreeResult {
  const masked = maskNonProse(body);
  const words = masked.split(/\s+/).filter((w) => w.length > 0).length;
  const triads = masked.match(/\b[^,.;:]+,\s+[^,.;:]+,\s+and\s+[^,.;:]+/gi);
  const density = words > 0 ? ((triads?.length ?? 0) / words) * 1000 : 0;
  return {
    words,
    density,
    measured: words >= RULE_OF_THREE_MIN_WORDS,
    subFloor: words > 0 && words < RULE_OF_THREE_MIN_WORDS,
  };
}

/**
 * Rule-of-three density for threshold comparison. Returns the true ratio at
 * or above the measurement floor, and 0 below it where the ratio is noise;
 * callers that need to see short pages must use ruleOfThreeResult, which
 * never conflates "not measured" with "measured and clean".
 */
export function ruleOfThreeDensity(body: string): number {
  const { density, measured } = ruleOfThreeResult(body);
  return measured ? density : 0;
}

/** Density threshold for the rule-of-three check (triads per 1000 words). */
export const RULE_OF_THREE_LIMIT = 22;

/**
 * Extract the reader-visible prose from an exported HTML document:
 * text content of the body, the <title>, and the description metadata
 * (meta description, og:description, og:title, twitter:description).
 * Script/style/noscript/svg contents are dropped, <pre>/<code> contents
 * are blanked (code is not prose, same as maskNonProse), tags become
 * newlines so text nodes stay on their own lines, and entities are
 * decoded so glyph rules see the real characters.
 */
export function extractRenderedProse(html: string): string {
  const metadata = html
    .match(
      /<meta[^>]+(?:name|property)="(?:description|og:description|og:title|twitter:description)"[^>]*>/gi,
    )
    ?.map((tag) => {
      const content = /content="([^"]*)"/i.exec(tag);
      return content ? decodeEntities(content[1]) : '';
    })
    .join('\n');
  const masked = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<code[\s\S]*?<\/code>/gi, (m) => m.replace(/[^\n]/g, ' '));
  const prose = masked.replace(/<[^>]+>/g, '\n');
  const decoded = decodeEntities(prose).replace(/^\s+/, '');
  return metadata ? `${decoded}\n${metadata}` : decoded;
}

/** Decode the named and numeric entities that appear in exported prose. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}
