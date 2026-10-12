/**
 * The fixed reviewer rubric of the five-second reader test.
 *
 * `contract/reader-first-rubric.json` holds the reviewer instructions and
 * the exemption list: what a reviewer leaves off the unclear-term list
 * because every figure shares it, or because the frame itself explains it.
 * The reviewer brief is rendered from that file, and the reader-first check
 * reads it again: a record counts only the terms the list does not exempt,
 * and it stays current only while the file is byte for byte the one the
 * figure was reviewed under.
 *
 * Only named words and counters can be matched mechanically. Marks, the
 * kicker, the self-label and external credits are judged by the reviewer,
 * who sees the frame, so a listed mark still counts.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RUBRIC_PATH = 'contract/reader-first-rubric.json';

const BEFORE_LINES = [
  'role', 'look', 'sentence', 'list', 'listRule', 'listFormat', 'exemptionsIntro', 'stillList', 'order', 'answerBefore',
] as const;
const AFTER_LINES = ['takeawayIntro', 'samePoint', 'answerAfter'] as const;
type ReviewerLine = (typeof BEFORE_LINES)[number] | (typeof AFTER_LINES)[number];

export type RubricExemption = {
  id: string;
  /** "definition" restates the test as first defined; "clarification" was added later. */
  origin: 'definition' | 'clarification';
  /** The line the reviewer reads. */
  reviewer: string;
  /** Interface words the check removes from a record's unclear terms. */
  words?: string[];
  /** Counter nouns: "Round" exempts "Round 1 of 3" and "Round 1/3". */
  counters?: string[];
  /** Files that render the words. */
  renderedBy?: string[];
  since: string;
};

export type Rubric = {
  schemaVersion: 'reader-first-rubric-v1';
  decision: string;
  ownerReview: string;
  reviewer: Record<ReviewerLine, string>;
  exemptions: RubricExemption[];
};

export type LoadedRubric = { rubric: Rubric; digest: string };

/** The rubric and the SHA-256 of its file's bytes. */
export function loadRubric(root: string): LoadedRubric {
  const bytes = readFileSync(join(root, RUBRIC_PATH));
  return { rubric: JSON.parse(bytes.toString('utf8')) as Rubric, digest: createHash('sha256').update(bytes).digest('hex') };
}

/** Problems with the rubric itself, each naming its file. */
export function rubricProblems(rubric: Rubric): string[] {
  const problems: string[] = [];
  if (rubric.schemaVersion !== 'reader-first-rubric-v1') problems.push(`rubric schema ${rubric.schemaVersion}`);
  for (const line of [...BEFORE_LINES, ...AFTER_LINES]) {
    if (!rubric.reviewer?.[line]?.trim()) problems.push(`no reviewer line "${line}"`);
  }
  const seen = new Set<string>();
  for (const exemption of rubric.exemptions ?? []) {
    if (seen.has(exemption.id)) problems.push(`exemption ${exemption.id} is listed twice`);
    seen.add(exemption.id);
    if (!exemption.reviewer?.trim()) problems.push(`exemption ${exemption.id} has no reviewer line`);
    if (exemption.origin !== 'definition' && exemption.origin !== 'clarification') {
      problems.push(`exemption ${exemption.id} has origin ${exemption.origin}`);
    }
    if ([...(exemption.words ?? []), ...(exemption.counters ?? [])].some((word) => !bare(word))) {
      problems.push(`exemption ${exemption.id} lists an empty word`);
    }
  }
  return problems.map((problem) => `${RUBRIC_PATH}: ${problem}`);
}

/** The words a reviewer quoted from the frame: the part before the reason. */
function termLabel(term: string): string {
  const colon = term.indexOf(':');
  return (colon >= 0 ? term.slice(0, colon) : term).replace(/\s*\([^)]*\)\s*$/, '');
}

const QUOTE = /[\u2018\u2019\u201C\u201D"'`]/g;
const ARTICLE = /^(?:the|a|an) /;
// Reviewers name a control by what it is as well as by its label.
const CONTROL_NOUN = / (?:button|buttons|control|controls|fold|folds|section|sections|link|label|toggle|tab|counter|disclosure)$/;
const SEPARATOR = /\s*(?:\/|,|&|\band\b|\bor\b)\s*/;

const plain = (text: string) => text.replace(QUOTE, '').toLowerCase().replace(/\s+/g, ' ').trim();

function bare(text: string): string {
  let word = plain(text).replace(ARTICLE, '');
  while (CONTROL_NOUN.test(word)) word = word.replace(CONTROL_NOUN, '');
  return word;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchPart(rubric: Rubric, part: string): string | null {
  if (!part) return null;
  for (const exemption of rubric.exemptions) {
    if (exemption.words?.some((word) => bare(word) === part)) return exemption.id;
    if (exemption.counters?.some((noun) => new RegExp(`^${escapeRegExp(bare(noun))} \\d+ ?(?:of|/) ?\\d+$`).test(part))) {
      return exemption.id;
    }
  }
  return null;
}

/**
 * The exemption a listed term falls under, or null when it counts. A term
 * is exempt when the words it quotes are exactly exempt words or counters,
 * alone or joined by "/", "and", "or" or commas.
 */
export function exemptionFor(rubric: Rubric, term: string): string | null {
  const label = termLabel(term);
  const whole = matchPart(rubric, bare(label));
  if (whole) return whole;
  const parts = plain(label).split(SEPARATOR).map(bare).filter(Boolean);
  if (parts.length < 2) return null;
  const ids = parts.map((part) => matchPart(rubric, part));
  return ids.every(Boolean) ? ids[0] : null;
}

/** The listed terms that count against a pass. */
export function countedTerms(rubric: Rubric, terms: readonly string[]): string[] {
  return terms.map((term) => term.trim()).filter((term) => term && exemptionFor(rubric, term) === null);
}

/** A figure passes when the point matches and no listed term counts. */
export function readerVerdict(rubric: Rubric, answer: { samePoint: string; unclearTerms: readonly string[] }): 'pass' | 'fail' {
  return answer.samePoint === 'yes' && countedTerms(rubric, answer.unclearTerms).length === 0 ? 'pass' : 'fail';
}

export type BriefFigure = { id: string; takeaway: string; screenshots: Record<'1280' | '375', string> };
export type ReviewerBrief = {
  /** What the reviewer reads with the screenshots. */
  before: string;
  /** The takeaways, shown once every sentence and list is written. */
  after: string;
  /** For the operator only: ids and file names carry the technical names the test hides. */
  key: { rubricDigest: string; figures: { label: string; id: string; screenshots: Record<'1280' | '375', string> }[] };
};

/** The same brief for every round, with the figures labelled F1, F2 ... */
export function reviewerBrief({ rubric, digest }: LoadedRubric, figures: readonly BriefFigure[]): ReviewerBrief {
  const line = rubric.reviewer;
  const labelled = figures.map((figure, index) => ({ ...figure, label: `F${index + 1}` }));
  const before = [
    line.role,
    line.look,
    line.sentence,
    `${line.list} ${line.listRule} ${line.listFormat}`,
    [line.exemptionsIntro, ...rubric.exemptions.map((exemption) => `- ${exemption.reviewer}`)].join('\n'),
    line.stillList,
    line.order,
    ['The figures, each with its 1280 px screenshot first and its 375 px screenshot second:',
      ...labelled.map((figure) => `- ${figure.label}`)].join('\n'),
    line.answerBefore,
  ].join('\n\n');
  const after = [
    line.takeawayIntro,
    labelled.map((figure) => `- ${figure.label}: ${figure.takeaway}`).join('\n'),
    line.samePoint,
    line.answerAfter,
  ].join('\n\n');
  return {
    before: `${before}\n`,
    after: `${after}\n`,
    key: { rubricDigest: digest, figures: labelled.map(({ label, id, screenshots }) => ({ label, id, screenshots })) },
  };
}
