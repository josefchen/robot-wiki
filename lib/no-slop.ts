/**
 * Global no-slop lint over the shipped prose and export (VAL-BUILD-004,
 * VAL-BUILD-007).
 *
 * Two checks, both pure functions over strings so they are unit-testable:
 *
 * 1. Placeholder sweep: scan every exported HTML file for placeholder
 *    markers (`lorem`, `TODO`, `FIXME`, "coming soon") and raw un-rendered
 *    MDX/JSX component tokens (a literal `<Figure`, `<Cite`, `<Term`,
 *    `<Image` rendered as text).
 *
 * 2. AI-writing marker lint over MDX prose: banned vocabulary per the
 *    humanizer skill's list (promotional language, inflated symbolism,
 *    vague attribution, filler transitions), em/en dashes in shipped
 *    prose, and rule-of-three padding heuristics. Code blocks, inline
 *    code, URLs, and quoted third-party titles are masked before
 *    matching, because those are not our prose.
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
 * Each entry carries the category the contract names (VAL-BUILD-007).
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
  // Vague attribution (humanizer §5).
  { word: 'critics', category: 'vague-attribution' },
  { word: 'observers', category: 'vague-attribution' },
  // Filler / throat-clearing (humanizer §23).
  { word: 'importantly', category: 'filler' },
  { word: 'needless', category: 'filler' },
  // -ing superficial analysis tacks (humanizer §3), word form only for
  // the strongest two markers.
  { word: 'fostering', category: 'superficial-ing' },
  { word: 'garnering', category: 'superficial-ing' },
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

export interface SlopFinding {
  file: string;
  line: number;
  message: string;
}

/** 1-based line numbers of every dash in an MDX body (prose only). */
export function dashLines(body: string): number[] {
  const masked = maskNonProse(body);
  const lines: number[] = [];
  masked.split('\n').forEach((line, i) => {
    if (DASH_PATTERN.test(line)) lines.push(i + 1);
  });
  return lines;
}

/** Find banned vocabulary in an MDX body, prose only, with line numbers. */
export function findBannedVocabulary(body: string): Array<SlopFinding & { word: string }> {
  const masked = maskNonProse(body);
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
  });
  return findings;
}

/**
 * Rule-of-three padding density (humanizer §10): count "X, Y, and Z"
 * enumerations per 1000 words of prose. Dense triads are an AI cadence
 * marker; the threshold allows ordinary technical enumeration.
 */
export function ruleOfThreeDensity(body: string): number {
  const masked = maskNonProse(body);
  const words = masked.split(/\s+/).filter((w) => w.length > 0).length;
  if (words < 200) return 0;
  const triads = masked.match(/\b[^,.;:]+,\s+[^,.;:]+,\s+and\s+[^,.;:]+/gi);
  return ((triads?.length ?? 0) / words) * 1000;
}

/** Density threshold for the rule-of-three check (triads per 1000 words). */
export const RULE_OF_THREE_LIMIT = 22;
