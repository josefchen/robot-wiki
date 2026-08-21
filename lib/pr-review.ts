/**
 * Automated pull-request review engine.
 *
 * The build gates (typecheck, lint, Vitest, validate:content, next build)
 * answer "is this repo still correct". They cannot answer the questions a
 * human reviewer asks about a *diff*: is this new number cited, did the
 * author hand-write a generated section, did the prose change without the
 * lastReviewed date moving, does this new registry row carry a source.
 * This module encodes those diff-scoped review questions from
 * CONTRIBUTING.md as pure functions so scripts/pr-review.ts can post them
 * as review comments on the pull request that introduced them.
 *
 * Everything here is a pure function over strings: the diff text, the head
 * revision of each changed file, and the current year. No fs, no network,
 * no git. The CLI wrapper supplies the world and the Vitest suite supplies
 * fixtures.
 *
 * Findings are advisory. They name the rule, the file, the line in the head
 * revision, and what the author should do; they never gate the merge, since
 * a heuristic over a diff is wrong often enough that a red X would train
 * reviewers to ignore it.
 *
 * Runtime imports carry explicit .ts extensions because this file is
 * executed by plain node (type stripping, no extension resolution) as well
 * as by Vitest.
 */
import { DASH_PATTERN, maskNonProse } from './no-slop.ts';

export type FileStatus = 'added' | 'modified' | 'deleted';

/** One added line, numbered in the head revision. */
export interface AddedLine {
  line: number;
  text: string;
}

export interface ChangedFile {
  /** Repo-relative path in the head revision (rename target for renames). */
  path: string;
  status: FileStatus;
  addedLines: AddedLine[];
  /** Text of removed lines, without line numbers (base-revision only). */
  removedLines: string[];
}

export type Severity = 'blocker' | 'warning' | 'note';

export interface ReviewFinding {
  /** Rule id, always a key of RULE_CATALOG. */
  rule: string;
  severity: Severity;
  /** Changed file the finding belongs to, or '' for a PR-level finding. */
  path: string;
  /** Line in the head revision. Absent for file- and PR-level findings. */
  line?: number;
  message: string;
}

export interface ReviewInput {
  files: readonly ChangedFile[];
  /** Head-revision body of every changed, non-deleted file, keyed by path. */
  bodies: Readonly<Record<string, string>>;
  /** Year used by the future-dated-citation rule. Defaults to the host year. */
  currentYear?: number;
}

export interface RuleDescriptor {
  severity: Severity;
  /** One line, printed in the review footer as "what was checked". */
  description: string;
}

/**
 * Every rule the reviewer can report, in the order the footer lists them.
 * The Vitest suite asserts that no finding escapes with an id that is not
 * described here, so the posted review always explains itself.
 */
export const RULE_CATALOG: Record<string, RuleDescriptor> = {
  'uncited-quantitative-claim': {
    severity: 'warning',
    description:
      'a number with a unit, a magnitude, or a price in added prose whose paragraph carries no <Cite> and no source URL',
  },
  'handwritten-generated-section': {
    severity: 'blocker',
    description:
      'References, See also, Linked from, or reading time written by hand instead of generated at build time',
  },
  'vague-attribution': {
    severity: 'warning',
    description: 'unattributed appeals to authority ("experts say", "studies show") in added prose',
  },
  'stale-last-reviewed': {
    severity: 'warning',
    description: 'article prose changed without moving the frontmatter lastReviewed date',
  },
  'unsourced-registry-row': {
    severity: 'blocker',
    description: 'a new data registry entry with no url, source, or citation field',
  },
  'citation-without-identifier': {
    severity: 'blocker',
    description: 'a new citation registry entry with no url, doi, or arXiv id',
  },
  'future-dated-citation': {
    severity: 'warning',
    description: 'a citation year later than the current year',
  },
  'control-without-accessible-name': {
    severity: 'warning',
    description: 'an added <input> control with no aria-label, aria-labelledby, or title',
  },
  'animation-without-reduced-motion': {
    severity: 'warning',
    description:
      'a requestAnimationFrame or setInterval loop added to a file with no prefers-reduced-motion branch',
  },
  'debugger-statement': {
    severity: 'blocker',
    description: 'a debugger statement left in shipped code',
  },
  'focused-test': {
    severity: 'blocker',
    description: 'it.only / describe.only, which silently skips the rest of the file in CI',
  },
  'skipped-test': {
    severity: 'warning',
    description: 'a newly skipped test with no explanation next to it',
  },
  'console-log-in-shipped-code': {
    severity: 'warning',
    description: 'console.log added under app/, components/, or lib/ (scripts may log)',
  },
  'dash-in-ui-copy': {
    severity: 'warning',
    description:
      'an em or en dash in an added UI or data string (the no-slop lint only covers content/)',
  },
  'code-change-without-test': {
    severity: 'warning',
    description: 'lib/, components/, or app/ changed while nothing under tests/ moved',
  },
  'multi-scope-pull-request': {
    severity: 'note',
    description: 'one pull request spanning many top-level areas, against the one-change-per-PR rule',
  },
};

/** Findings posted in one review, so a broad refactor cannot flood the PR. */
export const MAX_FINDINGS = 40;

// --- Diff parsing -----------------------------------------------------------

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

/** Strip the a/ or b/ prefix and surrounding quotes from a diff path. */
function normalizeDiffPath(raw: string): string {
  let path = raw.trim();
  if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
  if (path === '/dev/null') return '';
  return path.replace(/^[ab]\//, '');
}

/**
 * Parse `git diff` output (any -U level) into per-file added and removed
 * lines. Binary files, mode-only changes, and deletions produce a
 * ChangedFile with no added lines rather than being dropped, so the
 * PR-level rules can still see them.
 */
export function parseUnifiedDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  let current: ChangedFile | null = null;
  let nextLine = 0;

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      // "diff --git a/x b/y": take the b-side, which is the head path.
      const match = /^diff --git (.+?) (.+)$/.exec(raw);
      current = {
        path: match ? normalizeDiffPath(match[2]) : '',
        status: 'modified',
        addedLines: [],
        removedLines: [],
      };
      files.push(current);
      nextLine = 0;
      continue;
    }
    if (!current) continue;

    if (raw.startsWith('new file mode')) {
      current.status = 'added';
      continue;
    }
    if (raw.startsWith('deleted file mode')) {
      current.status = 'deleted';
      continue;
    }
    if (raw.startsWith('+++ ')) {
      const path = normalizeDiffPath(raw.slice(4));
      // A deletion's +++ side is /dev/null; keep the a-side path already read.
      if (path) current.path = path;
      continue;
    }
    if (raw.startsWith('--- ') || raw.startsWith('index ') || raw.startsWith('\\ ')) continue;
    if (raw.startsWith('rename to ')) {
      current.path = normalizeDiffPath(raw.slice('rename to '.length));
      continue;
    }

    const hunk = HUNK_HEADER.exec(raw);
    if (hunk) {
      nextLine = Number(hunk[1]);
      continue;
    }
    if (nextLine === 0) continue; // header noise before the first hunk

    if (raw.startsWith('+')) {
      current.addedLines.push({ line: nextLine, text: raw.slice(1) });
      nextLine += 1;
    } else if (raw.startsWith('-')) {
      current.removedLines.push(raw.slice(1));
    } else if (raw.startsWith(' ')) {
      nextLine += 1;
    }
  }

  return files.filter((file) => file.path !== '');
}

// --- Shared helpers ---------------------------------------------------------

export interface ScannedTag {
  /** Tag name, lowercased: `input`, `stat`, `div`. */
  name: string;
  /** Full source text of the opening (or self-closing) tag. */
  text: string;
  /** Character offsets of the tag in the body: [start, end). */
  startIndex: number;
  endIndex: number;
  /** 1-based first and last line the tag spans. */
  startLine: number;
  endLine: number;
}

/**
 * Scan JSX/HTML opening tags with quote and brace awareness.
 *
 * A tag-shaped regex is not enough for this codebase: attribute values
 * carry `>` (`<Stat value=">$23B" />`) and handlers carry arrow functions
 * (`onChange={(e) => ...}`), both of which end a `[^>]*` match early. That
 * truncation is what makes a regex reviewer report attribute text as prose
 * and miss an `aria-label` further down a multi-line tag.
 */
export function scanJsxTags(body: string): ScannedTag[] {
  const tags: ScannedTag[] = [];
  let line = 1;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '\n') {
      line += 1;
      continue;
    }
    if (char !== '<') continue;
    const nameMatch = /^<\/?([A-Za-z][A-Za-z0-9.:-]*)/.exec(body.slice(index, index + 64));
    if (!nameMatch) continue;

    let cursor = index + 1;
    let quote: string | null = null;
    let braces = 0;
    let endLine = line;
    let closed = false;
    for (; cursor < body.length; cursor += 1) {
      const inner = body[cursor];
      if (inner === '\n') endLine += 1;
      if (quote) {
        if (inner === quote) quote = null;
      } else if (inner === '"' || inner === "'" || inner === '`') {
        quote = inner;
      } else if (inner === '{') {
        braces += 1;
      } else if (inner === '}') {
        braces = Math.max(0, braces - 1);
      } else if (inner === '>' && braces === 0) {
        closed = true;
        break;
      }
    }
    if (!closed) break; // unterminated tag: stop rather than eat the file
    tags.push({
      name: nameMatch[1].toLowerCase(),
      text: body.slice(index, cursor + 1),
      startIndex: index,
      endIndex: cursor + 1,
      startLine: line,
      endLine,
    });
    index = cursor;
    line = endLine;
  }
  return tags;
}

/** Blank every scanned tag, keeping newlines so line numbers survive. */
export function maskJsxTags(body: string): string {
  let out = '';
  let cursor = 0;
  for (const tag of scanJsxTags(body)) {
    out += body.slice(cursor, tag.startIndex);
    out += tag.text.replace(/[^\n]/g, ' ');
    cursor = tag.endIndex;
  }
  return out + body.slice(cursor);
}

/** Mask code, JSX, URLs (no-slop) plus KaTeX spans, keeping line offsets. */
function maskProse(body: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  // Code first (a fenced block may contain tag-shaped text), then JSX with
  // the quote-aware scanner, then the no-slop mask for URLs and leftovers.
  const withoutCode = body.replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]*`/g, blank);
  return maskNonProse(maskJsxTags(withoutCode))
    .replace(/\$\$[\s\S]*?\$\$/g, blank)
    .replace(/\$[^$\n]+\$/g, blank);
}

/** 1-based line of the closing frontmatter fence, or 0 when there is none. */
function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.trim() !== '---') return 0;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
}

/** The blank-line-delimited block of raw text containing a 1-based line. */
function paragraphAt(lines: readonly string[], line: number): string {
  const index = line - 1;
  if (index < 0 || index >= lines.length) return '';
  let start = index;
  while (start > 0 && lines[start - 1].trim() !== '') start -= 1;
  let end = index;
  while (end < lines.length - 1 && lines[end + 1].trim() !== '') end += 1;
  return lines.slice(start, end + 1).join('\n');
}

/** True when a paragraph already points at a source. */
function hasSourceReference(paragraph: string): boolean {
  return /<Cite\s+id=/.test(paragraph) || /https?:\/\//.test(paragraph);
}

/** True for a line that is only a comment, so leftovers there are harmless. */
function isCommentLine(text: string): boolean {
  return /^\s*(\/\/|\/\*|\*|#)/.test(text);
}

/**
 * Blank the contents of quoted strings, keeping the quotes and the length.
 * A pattern named inside a string is data, not code: a test fixture that
 * asserts on `'debugger;'` is not a leftover debugger statement.
 */
function maskStringContents(text: string): string {
  return text.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, (match) =>
    match.length <= 2 ? match : `${match[0]}${' '.repeat(match.length - 2)}${match.at(-1)}`,
  );
}

/**
 * The reviewer's own sources spell out every pattern it hunts for, in
 * regex literals that no amount of string masking can tell apart from the
 * real thing. They are exempt from the leftover and copy rules; their own
 * unit tests are what keep them honest.
 */
const SELF_PATHS = new Set([
  'lib/pr-review.ts',
  'scripts/pr-review.ts',
  'tests/unit/pr-review.test.ts',
]);

/** Runs of added lines with consecutive line numbers, as blocks. */
function addedBlocks(file: ChangedFile): AddedLine[][] {
  const blocks: AddedLine[][] = [];
  for (const added of file.addedLines) {
    const last = blocks.at(-1);
    const previous = last?.at(-1);
    if (last && previous && previous.line === added.line - 1) last.push(added);
    else blocks.push([added]);
  }
  return blocks;
}

const isContentArticle = (path: string) => /^content\/.+\.mdx?$/.test(path);
/** Structured datasets with sourced rows. Exception lists are not registries. */
const isDataRegistry = (path: string) =>
  /^data\/[a-z0-9-]+\.ts$/.test(path) && path !== 'data/link-check-exceptions.ts';
const isComponent = (path: string) => /^components\/.+\.tsx?$/.test(path);
const isTest = (path: string) => path.startsWith('tests/');

// --- Prose rules (content/) -------------------------------------------------

/**
 * Quantitative claims that need a source: units, magnitudes, and prices.
 * Bare integers ("Figure 3", "k=100", "2023") and bare multipliers ("10x")
 * are excluded: the surrounding sentence, not the digit, decides whether
 * they are a claim, and flagging them buries the real hits.
 */
const QUANTITATIVE_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?\s?(?:%|Hz|kHz|MHz|ms|µs|fps|mm|cm|km|kg|Nm|GB|TB|MB|W\b|kW\b|dB)/,
  /(?<=\d)\s(?:s|m|h|hours|minutes|seconds|watts|newtons)\b/,
  /\\?\$\s?\d/,
  /\d+(?:\.\d+)?\s?(?:thousand|million|billion|trillion)\b/,
  /\b\d{1,3}(?:,\d{3})+\b/,
  /\b\d+(?:\.\d+)?[MB]\b/,
];

/**
 * A number inside a hypothetical or a definitional threshold is not a claim
 * about the world, so it needs no source: "if 99.9% takes five more years",
 * "solved when a policy achieves better than 90%", "drag the horizon toward
 * 1M hours". Skipping these is what keeps the rule readable in a review.
 */
const HYPOTHETICAL =
  /\b(if|suppose|imagine|hypothetical|assume|scenarios?|extrapolat\w*)\b/i;
const DEFINITIONAL_THRESHOLD = /\b(better than|at least|no worse than|above|beyond)\s+[~\\$\d]/i;

/** Split a line into sentences, so one hedged clause does not mask another. */
function sentences(line: string): string[] {
  return line.split(/(?<=[.;:!?])\s+/);
}

function quantitativeClaim(sentence: string): string | null {
  if (HYPOTHETICAL.test(sentence) || DEFINITIONAL_THRESHOLD.test(sentence)) return null;
  for (const pattern of QUANTITATIVE_PATTERNS) {
    const match = pattern.exec(sentence);
    if (match) return match[0].trim();
  }
  return null;
}

function reviewUncitedClaims(file: ChangedFile, body: string): ReviewFinding[] {
  const lines = body.split('\n');
  const masked = maskProse(body).split('\n');
  const bodyStart = frontmatterEnd(lines);
  const findings: ReviewFinding[] = [];

  for (const added of file.addedLines) {
    if (added.line <= bodyStart) continue;
    const prose = masked[added.line - 1] ?? '';
    if (prose.trim().length === 0) continue;
    const claim = sentences(prose)
      .map(quantitativeClaim)
      .find((match) => match !== null);
    if (!claim) continue;
    if (hasSourceReference(paragraphAt(lines, added.line))) continue;
    findings.push({
      rule: 'uncited-quantitative-claim',
      severity: 'warning',
      path: file.path,
      line: added.line,
      message: `Quantitative claim ("${claim}") with no <Cite> anywhere in its paragraph. Register the source in data/citations.ts and cite it here, or move the number into a paragraph that already carries its source.`,
    });
  }
  return findings;
}

const GENERATED_SECTION_HEADING =
  /^#{2,4}\s+(references|sources|see also|linked from|further reading|bibliography|backlinks)\s*$/i;
const READING_TIME_TEXT = /(\b\d+\s?min(?:ute)?s?\s+read\b|^reading time)/i;

function reviewGeneratedSections(file: ChangedFile): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const added of file.addedLines) {
    const text = added.text.trim();
    if (GENERATED_SECTION_HEADING.test(text)) {
      findings.push({
        rule: 'handwritten-generated-section',
        severity: 'blocker',
        path: file.path,
        line: added.line,
        message: `"${text}" is generated at build time (lib/references.ts for References, lib/backlinks.ts for Linked from, frontmatter seeAlso for See also). Hand-writing it duplicates the generated block on the page. Delete it and curate frontmatter instead.`,
      });
      continue;
    }
    if (READING_TIME_TEXT.test(text)) {
      findings.push({
        rule: 'handwritten-generated-section',
        severity: 'blocker',
        path: file.path,
        line: added.line,
        message:
          'Reading time is measured at build time (scripts/measure-reading-times.ts into data/reading-times.json). A hand-written figure goes stale on the next edit.',
      });
    }
  }
  return findings;
}

const VAGUE_ATTRIBUTION =
  /\b(experts?\s+(?:say|believe|argue|agree)|it\s+is\s+(?:widely|generally|commonly)\s+(?:believed|accepted|agreed|held)|many\s+(?:believe|argue|say)|some\s+(?:believe|argue|say)|studies\s+show|research\s+shows|reportedly|is\s+said\s+to|widely\s+regarded|it\s+is\s+well\s+known)\b/i;

function reviewVagueAttribution(file: ChangedFile, body: string): ReviewFinding[] {
  const lines = body.split('\n');
  const masked = maskProse(body).split('\n');
  const bodyStart = frontmatterEnd(lines);
  const findings: ReviewFinding[] = [];

  for (const added of file.addedLines) {
    if (added.line <= bodyStart) continue;
    const match = VAGUE_ATTRIBUTION.exec(masked[added.line - 1] ?? '');
    if (!match) continue;
    if (hasSourceReference(paragraphAt(lines, added.line))) continue;
    findings.push({
      rule: 'vague-attribution',
      severity: 'warning',
      path: file.path,
      line: added.line,
      message: `"${match[0]}" attributes a claim to nobody. Name the proponents and cite them, or drop the claim (CONTRIBUTING: where experts disagree, present both sides and name them).`,
    });
  }
  return findings;
}

function reviewLastReviewed(file: ChangedFile, body: string): ReviewFinding[] {
  if (file.status !== 'modified') return [];
  const lines = body.split('\n');
  const bodyStart = frontmatterEnd(lines);
  const touchedProse = file.addedLines.some(
    (added) => added.line > bodyStart && added.text.trim().length > 0,
  );
  if (!touchedProse) return [];
  if (file.addedLines.some((added) => /^\s*lastReviewed:/.test(added.text))) return [];

  const current = /^lastReviewed:\s*"?([\d-]+)"?/m.exec(body)?.[1];
  return [
    {
      rule: 'stale-last-reviewed',
      severity: 'warning',
      path: file.path,
      message: `Prose changed but frontmatter lastReviewed still reads ${current ?? 'its old value'}. Bump it to the date you verified the claims in this edit, so the page's freshness stamp stays honest.`,
    },
  ];
}

// --- Registry rules (data/) -------------------------------------------------

const SOURCE_KEY = /^\s*(?:url|href|source|sources|sourceUrl|citation|citations|doi|arxiv)\s*:/m;
const ENTRY_KEY = /^\s*id\s*:\s*['"`]/m;

function reviewRegistryRows(file: ChangedFile): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const block of addedBlocks(file)) {
    const text = block.map((added) => added.text).join('\n');
    if (!ENTRY_KEY.test(text)) continue;
    if (SOURCE_KEY.test(text)) continue;
    findings.push({
      rule: 'unsourced-registry-row',
      severity: 'blocker',
      path: file.path,
      line: block[0].line,
      message:
        'New registry entry with no url, source, or citation field in the added block. Every row in the structured datasets carries at least one source link; an unsourced value cannot be checked, and CONTRIBUTING forbids guessing one (write null and let the table render "not disclosed").',
    });
  }
  return findings;
}

const CITATION_IDENTIFIER = /^\s*(?:url|doi|arxiv)\s*:/m;

function reviewCitationEntries(file: ChangedFile, currentYear: number): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const block of addedBlocks(file)) {
    const text = block.map((added) => added.text).join('\n');
    if (/^\s*title\s*:/m.test(text) && !CITATION_IDENTIFIER.test(text)) {
      findings.push({
        rule: 'citation-without-identifier',
        severity: 'blocker',
        path: file.path,
        line: block[0].line,
        message:
          'Citation entry with no url, doi, or arxiv field. A reader has to be able to reach the source, and a reviewer has to be able to check the claim against it.',
      });
    }
    for (const added of block) {
      const year = /^\s*year\s*:\s*(\d{4})/.exec(added.text)?.[1];
      if (year && Number(year) > currentYear) {
        findings.push({
          rule: 'future-dated-citation',
          severity: 'warning',
          path: file.path,
          line: added.line,
          message: `Citation year ${year} is later than ${currentYear}. Check the identifier against the source itself; a mistyped arXiv id usually shows up as a wrong year first.`,
        });
      }
    }
  }
  return findings;
}

// --- Component rules (components/, app/) ------------------------------------

function reviewControlLabels(file: ChangedFile, body: string): ReviewFinding[] {
  const added = new Set(file.addedLines.map((line) => line.line));
  const findings: ReviewFinding[] = [];
  for (const tag of scanJsxTags(body)) {
    if (tag.name !== 'input') continue;
    const touched: number[] = [];
    for (let line = tag.startLine; line <= tag.endLine; line += 1) {
      if (added.has(line)) touched.push(line);
    }
    if (touched.length === 0) continue;
    if (/aria-label|aria-labelledby|title=/.test(tag.text)) continue;
    // An input with an id is named only by the <label htmlFor> that points at
    // that id. An unrelated htmlFor elsewhere in the file does not name it.
    const id = /\bid=["']([^"']+)["']/.exec(tag.text)?.[1];
    if (id) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`htmlFor=["']${escaped}["']`).test(body)) continue;
    }
    findings.push({
      rule: 'control-without-accessible-name',
      severity: 'warning',
      path: file.path,
      line: touched[0],
      message:
        'Control with no accessible name. Interactives need keyboard-reachable controls with ARIA labels (CONTRIBUTING), and the axe-core pass in the e2e suite fails on an unnamed input.',
    });
  }
  return findings;
}

const ANIMATION_LOOP = /\b(requestAnimationFrame|setInterval)\s*\(/;

function reviewReducedMotion(file: ChangedFile, body: string): ReviewFinding[] {
  if (/prefers-reduced-motion/.test(body)) return [];
  const hit = file.addedLines.find(
    (added) => ANIMATION_LOOP.test(added.text) && !isCommentLine(added.text),
  );
  if (!hit) return [];
  return [
    {
      rule: 'animation-without-reduced-motion',
      severity: 'warning',
      path: file.path,
      line: hit.line,
      message:
        'Animation loop added to a file with no prefers-reduced-motion branch. Follow components/interactive/pendulum-controller.tsx: read the media query once and degrade to discrete steps instead of animating.',
    },
  ];
}

// --- Rules over any changed source file -------------------------------------

function reviewLeftovers(file: ChangedFile): ReviewFinding[] {
  if (SELF_PATHS.has(file.path)) return [];
  const findings: ReviewFinding[] = [];
  const shippedCode = /^(?:app|components|lib)\//.test(file.path);

  for (const added of file.addedLines) {
    const text = maskStringContents(added.text);
    if (isCommentLine(text)) continue;
    if (/\bdebugger\b\s*;?/.test(text)) {
      findings.push({
        rule: 'debugger-statement',
        severity: 'blocker',
        path: file.path,
        line: added.line,
        message: 'debugger statement left in the diff.',
      });
    }
    if (/\b(?:it|test|describe)\.only\s*\(/.test(text)) {
      findings.push({
        rule: 'focused-test',
        severity: 'blocker',
        path: file.path,
        line: added.line,
        message:
          'Focused test: .only silently skips every other test in the file, so CI goes green on one assertion. Remove it before merge.',
      });
    }
    if (/\b(?:it|test|describe)\.skip\s*\(/.test(text)) {
      findings.push({
        rule: 'skipped-test',
        severity: 'warning',
        path: file.path,
        line: added.line,
        message:
          'Newly skipped test. Say in a comment why it is skipped and what re-enables it, or delete it; a silent skip reads as coverage that does not exist.',
      });
    }
    if (shippedCode && /\bconsole\.log\s*\(/.test(text)) {
      findings.push({
        rule: 'console-log-in-shipped-code',
        severity: 'warning',
        path: file.path,
        line: added.line,
        message:
          'console.log ships to the browser here. Drop it, or move the diagnostic into a script under scripts/ where logging is the interface.',
      });
    }
  }
  return findings;
}

/** Added string literals on a line, for the UI-copy dash check. */
function stringLiterals(text: string): string[] {
  return [...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? '',
  );
}

function reviewUiCopyDashes(file: ChangedFile): ReviewFinding[] {
  if (!/^(?:app|components|data)\//.test(file.path)) return [];
  if (SELF_PATHS.has(file.path)) return [];
  const findings: ReviewFinding[] = [];
  for (const added of file.addedLines) {
    if (isCommentLine(added.text)) continue;
    if (!DASH_PATTERN.test(added.text)) continue;
    if (!stringLiterals(added.text).some((literal) => DASH_PATTERN.test(literal))) continue;
    findings.push({
      rule: 'dash-in-ui-copy',
      severity: 'warning',
      path: file.path,
      line: added.line,
      message:
        'Em or en dash in a shipped string. The no-slop lint enforces zero dashes over content/ prose; UI and data copy follow the same rule. Rewrite with a comma, colon, or period.',
    });
  }
  return findings;
}

// --- Pull-request level rules -----------------------------------------------

const CODE_PATH = /^(?:app|components|lib)\/.+\.(?:ts|tsx|mts)$/;

function reviewTestCoverage(files: readonly ChangedFile[]): ReviewFinding[] {
  const code = files.filter((file) => file.status !== 'deleted' && CODE_PATH.test(file.path));
  if (code.length === 0) return [];
  if (files.some((file) => isTest(file.path))) return [];
  const sample = code
    .slice(0, 4)
    .map((file) => file.path)
    .join(', ');
  return [
    {
      rule: 'code-change-without-test',
      severity: 'warning',
      path: '',
      message: `${code.length} source file(s) changed (${sample}${code.length > 4 ? ', ...' : ''}) and nothing under tests/. Pure logic belongs in lib/ with a unit test; rendered behaviour gets a component test. Say why in the PR description if a test genuinely cannot cover this.`,
    },
  ];
}

/**
 * Top-level directory of a path, used by the scope note. Root files
 * (package.json, next-env.d.ts) are not an area of their own: they ride
 * along with whatever change needed them.
 */
function area(path: string): string {
  const parts = path.split('/');
  return parts.length > 1 ? parts[0] : '';
}

function reviewScope(files: readonly ChangedFile[]): ReviewFinding[] {
  const areas = new Set(
    files.map((file) => area(file.path)).filter((name) => name !== 'tests' && name !== ''),
  );
  if (areas.size < 4 || files.length <= 8) return [];
  return [
    {
      rule: 'multi-scope-pull-request',
      severity: 'note',
      path: '',
      message: `This pull request touches ${files.length} files across ${areas.size} areas (${[...areas].sort().join(', ')}). CONTRIBUTING asks for one logical change per PR: a new article, a data fix, and a component refactor are three reviews, not one. Split it if the parts can land independently.`,
    },
  ];
}

// --- Entry point ------------------------------------------------------------

/** Order findings by severity, then path, then line, for a stable review. */
const SEVERITY_ORDER: Record<Severity, number> = { blocker: 0, warning: 1, note: 2 };

export function sortFindings(findings: readonly ReviewFinding[]): ReviewFinding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.path.localeCompare(b.path) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.rule.localeCompare(b.rule),
  );
}

/** Run every review rule over one parsed diff. */
export function reviewChanges(input: ReviewInput): ReviewFinding[] {
  const currentYear = input.currentYear ?? new Date().getUTCFullYear();
  const findings: ReviewFinding[] = [];

  for (const file of input.files) {
    if (file.status === 'deleted') continue;
    const body = input.bodies[file.path] ?? '';

    if (isContentArticle(file.path)) {
      findings.push(...reviewUncitedClaims(file, body));
      findings.push(...reviewGeneratedSections(file));
      findings.push(...reviewVagueAttribution(file, body));
      findings.push(...reviewLastReviewed(file, body));
    }
    if (isDataRegistry(file.path)) {
      findings.push(...reviewRegistryRows(file));
      if (file.path === 'data/citations.ts') {
        findings.push(...reviewCitationEntries(file, currentYear));
      }
    }
    if (isComponent(file.path) || file.path.startsWith('app/')) {
      findings.push(...reviewControlLabels(file, body));
      findings.push(...reviewReducedMotion(file, body));
    }
    findings.push(...reviewLeftovers(file));
    findings.push(...reviewUiCopyDashes(file));
  }

  findings.push(...reviewTestCoverage(input.files));
  findings.push(...reviewScope(input.files));

  return sortFindings(findings);
}

// --- Review rendering -------------------------------------------------------

/** Marker that lets the CLI find and update its own previous comment. */
export const REVIEW_MARKER = '<!-- robot-wiki-pr-review -->';

export interface ReviewContext {
  files: number;
  additions: number;
  base?: string;
  head?: string;
}

export function countBySeverity(
  findings: readonly ReviewFinding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = { blocker: 0, warning: 0, note: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

const SEVERITY_HEADING: Record<Severity, string> = {
  blocker: 'Blockers',
  warning: 'Warnings',
  note: 'Notes',
};

function locate(finding: ReviewFinding): string {
  if (!finding.path) return 'this pull request';
  return finding.line ? `\`${finding.path}:${finding.line}\`` : `\`${finding.path}\``;
}

/** Render the review body posted as the PR comment and the job summary. */
export function formatReviewMarkdown(
  findings: readonly ReviewFinding[],
  context: ReviewContext,
): string {
  const counts = countBySeverity(findings);
  const scope = `${context.files} changed file(s), ${context.additions} added line(s)`;
  const range = context.base && context.head ? ` (\`${context.base}...${context.head}\`)` : '';
  const out: string[] = [REVIEW_MARKER, '## Automated review', ''];

  if (findings.length === 0) {
    out.push(
      `No findings over ${scope}${range}.`,
      '',
      'This pass is heuristic and advisory. It does not replace the human review CONTRIBUTING requires: claims still get checked against their cited sources.',
    );
  } else {
    out.push(
      `${findings.length} finding(s) over ${scope}${range}: ${counts.blocker} blocker(s), ${counts.warning} warning(s), ${counts.note} note(s).`,
    );
    for (const severity of ['blocker', 'warning', 'note'] as const) {
      const group = findings.filter((finding) => finding.severity === severity);
      if (group.length === 0) continue;
      out.push('', `### ${SEVERITY_HEADING[severity]}`, '');
      for (const finding of group) {
        out.push(`- ${locate(finding)} ${finding.message} \`[${finding.rule}]\``);
      }
    }
    out.push(
      '',
      'Findings are heuristic: say so in a reply when one is wrong, and fix the rule in `lib/pr-review.ts` if it is wrong in general. Nothing here blocks the merge, and none of it replaces the human review CONTRIBUTING requires.',
    );
  }

  out.push('', '<details><summary>What this pass checks</summary>', '');
  for (const [rule, descriptor] of Object.entries(RULE_CATALOG)) {
    out.push(`- \`${rule}\` (${descriptor.severity}): ${descriptor.description}`);
  }
  out.push(
    '',
    'Gates that run separately and are not repeated here: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate:content`, `npm run build`.',
    '',
    'Reproduce locally with `npm run review:pr -- --base main`.',
    '</details>',
  );
  return out.join('\n');
}

/** Findings that can be posted inline: file-anchored to an added line. */
export function inlineFindings(
  findings: readonly ReviewFinding[],
  addedLinesByPath: Readonly<Record<string, readonly number[]>>,
): ReviewFinding[] {
  return findings.filter(
    (finding) =>
      finding.line !== undefined &&
      (addedLinesByPath[finding.path] ?? []).includes(finding.line),
  );
}

const inlineKey = (path: string, line: number, rule: string) => `${path}:${line}:${rule}`;

/** Keys of inline findings already commented on this PR by an earlier run. */
export function existingInlineKeys(
  comments: readonly { body?: string; path?: string; line?: number }[],
): Set<string> {
  const keys = new Set<string>();
  for (const comment of comments) {
    const rule = /<!-- pr-review-rule:([a-z-]+) -->/.exec(comment.body ?? '')?.[1];
    if (rule && comment.path && comment.line) {
      keys.add(inlineKey(comment.path, comment.line, rule));
    }
  }
  return keys;
}

/**
 * Inline comments still to post. `null` means the existing-comment list could
 * not be read, so the caller must skip posting rather than treat every prior
 * comment as new.
 */
export function pendingInlineFindings(
  findings: readonly ReviewFinding[],
  addedLinesByPath: Readonly<Record<string, readonly number[]>>,
  existingComments: readonly { body?: string; path?: string; line?: number }[] | null,
  listFailed: boolean,
): ReviewFinding[] | null {
  if (listFailed) return null;
  const alreadySaid = existingInlineKeys(existingComments ?? []);
  return inlineFindings(findings, addedLinesByPath).filter(
    (finding) => !alreadySaid.has(inlineKey(finding.path, finding.line ?? 0, finding.rule)),
  );
}

/** Next page URL from a GitHub `Link` header, or null when there is no next. */
export function githubNextLink(linkHeader: string | null | undefined): string | null {
  if (!linkHeader) return null;
  const match = /<([^>]+)>\s*;\s*rel="next"/i.exec(linkHeader);
  return match?.[1] ?? null;
}
