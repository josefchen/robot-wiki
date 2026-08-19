/**
 * Pure rules behind scripts/check-chart-descriptions.ts (VAL-EDU-026).
 *
 * A chart description is an authored takeaway sentence rendered as real
 * DOM text beside the chart. The gate enforces four mechanical properties
 * on the authored sentence; everything judgment-based (does it name the
 * shape and the x-value where the behaviour changes) is a code-review
 * item, not a gate item, and the feature brief says so explicitly.
 *
 * Four checks, all pure functions over strings:
 *   1. at least two digit-bearing tokens (a description without numbers
 *      is a caption, and captions are what this feature replaces);
 *   2. both plotted quantity names appear (episode success and steps, not
 *      "the data");
 *   3. no banned opener from the VAL-EDU-026 list ("This chart shows...",
 *      "Line chart of...", "Diagram showing...", "shows the
 *      relationship...");
 *   4. cross-chart uniqueness after digit normalisation, so six charts
 *      cannot ship six copies of one sentence with the numbers swapped.
 */

/** Tokens (words) that contain at least one digit. */
export function digitTokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => /\d/.test(token));
}

/**
 * Digit normalisation for the uniqueness check: every digit becomes '#',
 * so "falls from 3.6 h at 64" and "falls from 1.5 h at 32" collide (they
 * are the same sentence with different numbers) while genuinely different
 * sentences do not.
 */
export function normalizeDigits(text: string): string {
  return text.replace(/\d/g, '#');
}

/** VAL-EDU-026's banned-opener list, verbatim. */
const BANNED_OPENER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: '"(this|the) (chart|graph|figure|diagram|plot)" opener',
    pattern: /^(this|the) (chart|graph|figure|diagram|plot)\b/i,
  },
  {
    label: '"(line|bar|scatter|log-log) chart of" opener',
    pattern: /^(line|bar|scatter|log-log) chart of\b/i,
  },
  {
    label: '"diagram showing" opener',
    pattern: /^diagram showing\b/i,
  },
  {
    label: '"shows the data/values/relationship" anywhere',
    pattern: /\bshows? (the )?(data|values|relationship)\b/i,
  },
];

/** The banned-opener labels that matched, empty when the text is clean. */
export function bannedOpeners(text: string): string[] {
  return BANNED_OPENER_PATTERNS.filter((p) => p.pattern.test(text)).map(
    (p) => p.label,
  );
}

export interface ChartDescriptionEntry {
  /** Component name, for failure messages that name the offender. */
  component: string;
  /** Repo-relative source file, for the wiring check. */
  file: string;
  /** The authored takeaway at the chart's default configuration. */
  text: string;
  /** Both plotted quantity names that must appear in the text. */
  quantityNames: readonly string[];
}

export interface ChartDescriptionProblem {
  component: string;
  message: string;
}

/** Validate one description against rules 1-3. */
export function validateChartDescription(
  entry: ChartDescriptionEntry,
): ChartDescriptionProblem[] {
  const problems: ChartDescriptionProblem[] = [];
  const fail = (message: string) =>
    problems.push({ component: entry.component, message });

  if (!entry.text || entry.text.trim().length === 0) {
    fail('description is missing or empty');
    return problems;
  }
  const tokens = digitTokens(entry.text);
  if (tokens.length < 2) {
    fail(
      `fewer than two digit-bearing tokens (${tokens.length}: a description without numbers is a caption)`,
    );
  }
  for (const quantity of entry.quantityNames) {
    if (!new RegExp(`\\b${escapeForWord(quantity)}\\b`, 'i').test(entry.text)) {
      fail(`plotted quantity "${quantity}" does not appear in the description`);
    }
  }
  for (const opener of bannedOpeners(entry.text)) {
    fail(`banned opener: ${opener}`);
  }
  return problems;
}

/**
 * Validate a whole set: rules 1-3 per entry, plus rule 4 (uniqueness after
 * digit normalisation) across the set.
 */
export function validateChartDescriptions(
  entries: readonly ChartDescriptionEntry[],
): ChartDescriptionProblem[] {
  const problems = entries.flatMap(validateChartDescription);
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const key = normalizeDigits(entry.text.trim().toLowerCase());
    const first = seen.get(key);
    if (first) {
      problems.push({
        component: entry.component,
        message: `description is a digit-normalised duplicate of ${first}`,
      });
    } else {
      seen.set(key, entry.component);
    }
  }
  return problems;
}

function escapeForWord(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
