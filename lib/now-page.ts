/**
 * What /now/ derives from its two data modules for display: section ids,
 * the lead sentences' counts and dates, each trajectory's place on its own
 * scale, the figure's headline and text description, and source labels.
 * Every count the page states is computed here from the rows.
 */
import { DELIVERY_GAPS, DEVELOPMENTS, DEVELOPMENTS_FROM, NOW_AS_OF } from '../data/now.ts';
import type { Cited, DeliveryGap, Development } from '../data/now.ts';
import { NOW_ARGUMENTS, OPEN_QUESTIONS } from '../data/now-debates.ts';
import type { NowArgument, OpenQuestion } from '../data/now-debates.ts';
import { formatLongDate } from './dates.ts';
import { formatShortDate } from './market-map.ts';
import { argumentForQuestion, argumentsByRank, isSourced, questionForArgument, questionsByRank } from './now-debates.ts';
import { resolvedTrajectories, type ResolvedTrajectory } from './now.ts';

export const NOW_PATH = '/now/';
export const NOW_TITLE = 'Robotics now';

/** The page's five sections, in reading order. */
export const NOW_SECTIONS = [
  { id: 'where-it-is-heading', title: 'Where it is heading' },
  { id: 'what-changed', title: 'What changed' },
  { id: 'open-questions', title: 'Open questions' },
  { id: 'what-people-argue-about', title: 'What people argue about' },
  { id: 'announced-against-delivered', title: 'Announced against delivered' },
] as const;

/** "15 October and 14 November 2026"; the first year is dropped when both share it. */
export function formatDateSpan(from: string, to: string): string {
  const start = formatLongDate(from);
  const end = formatLongDate(to);
  return from.slice(0, 4) === to.slice(0, 4) ? `${start.slice(0, -5)} and ${end}` : `${start} and ${end}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** A date as precise as its source: "2026", "November 2026", "10 Nov 2026", or the source's own "not disclosed". */
export function formatStatedDate(value: string): string {
  if (/^\d{4}$/.test(value)) return value;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) {
    const name = MONTHS[Number(month[2]) - 1];
    if (!name) throw new Error(`month out of range in "${value}"`);
    return `${name} ${month[1]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatShortDate(value);
  return value;
}

/** A machine-readable date for <time>, or null when the source gives none. */
export function stated(value: string): string | null {
  return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) ? value : null;
}

/** The host a source lives on, without "www.": the short label a table cell links. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** Where each end sits on its row's own scale, from zero to the larger end, in percent. */
export function trajectoryPositions(row: ResolvedTrajectory): { earlier: number; later: number } {
  const max = Math.max(row.earlier.value, row.later.value);
  if (!(max > 0)) return { earlier: 0, later: 0 };
  return { earlier: (row.earlier.value / max) * 100, later: (row.later.value / max) * 100 };
}

export type DirectionCounts = { up: number; down: number; flat: number };

export function directionCounts(rows: readonly ResolvedTrajectory[]): DirectionCounts {
  const counts: DirectionCounts = { up: 0, down: 0, flat: 0 };
  for (const row of rows) counts[row.direction] += 1;
  return counts;
}

/** The figure's headline: how many measures rose and fell, from the rows. */
export function trajectoryHeadline(rows: readonly ResolvedTrajectory[]): string {
  const { up, down, flat } = directionCounts(rows);
  const still = flat > 0 ? `, ${flat} held` : '';
  return `${up} of ${rows.length} measures rose${still} and ${down} fell`;
}

/**
 * The figure's text description: every row's two ends, with their periods,
 * in the data's order. The chart-description registry stores this string.
 */
export function trajectoryDescription(rows: readonly ResolvedTrajectory[] = resolvedTrajectories()): string {
  const { up, down } = directionCounts(rows);
  const ends = rows
    .map((row) => `${row.title}, ${row.earlier.display} (${row.earlier.period}) to ${row.later.display} (${row.later.period})`)
    .join('; ');
  return `Of ${rows.length} measures, ${up} rose and ${down} fell from the earlier value to the latest value: ${ends}.`;
}

/** Every page a trajectory rests on, once each, in order of first use. */
export function trajectorySources(row: ResolvedTrajectory): Cited[] {
  const cited: Cited[] = [
    ...row.earlier.sources,
    ...row.later.sources,
    ...row.alongside.flatMap((end) => end.sources),
    ...(row.ratio ? [row.ratio] : []),
    ...(row.note ? [row.note] : []),
  ];
  return uniqueByUrl(cited);
}

export function uniqueByUrl<T extends { sourceUrl: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.sourceUrl) ? false : (seen.add(item.sourceUrl), true)));
}

/** Distinct pages behind the whole figure. */
export function figureSourceCount(rows: readonly ResolvedTrajectory[] = resolvedTrajectories()): number {
  return uniqueByUrl(rows.flatMap(trajectorySources)).length;
}

/** Arguments that get rows of their own: those with no open question on the same subject. */
export function standaloneArguments(
  args: readonly NowArgument[] = NOW_ARGUMENTS,
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
): NowArgument[] {
  return argumentsByRank(args).filter((argument) => questionForArgument(argument, questions) === null);
}

/** Open questions in rank order, each with the argument shown beneath it, if any. */
export function questionsWithArguments(
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
  args: readonly NowArgument[] = NOW_ARGUMENTS,
): { question: OpenQuestion; argument: NowArgument | null }[] {
  return questionsByRank(questions).map((question) => ({ question, argument: argumentForQuestion(question, args) }));
}

/** Does any source of a development rest on a report rather than its own page? */
export function developmentReported(row: Development): boolean {
  return row.sourceType === 'reported' || (row.alsoCited ?? []).some((cited) => cited.sourceType === 'reported');
}

export function gapReported(gap: DeliveryGap): boolean {
  return gap.promised.sourceType === 'reported' || gap.delivered.sourceType === 'reported';
}

export function questionReported(question: OpenQuestion, argument: NowArgument | null): boolean {
  const evidence = [question.evidenceFor, question.evidenceAgainst].filter(isSourced);
  return (
    evidence.some((side) => side.sourceType === 'reported') ||
    (argument?.positions ?? []).some((position) => position.sourceType === 'reported')
  );
}

/** The counts and dates the page's lead sentences state. */
export function nowPageCounts() {
  const linked = questionsWithArguments().filter(({ argument }) => argument !== null).length;
  return {
    asOf: formatLongDate(NOW_AS_OF),
    developments: DEVELOPMENTS.length,
    developmentSpan: formatDateSpan(DEVELOPMENTS_FROM, NOW_AS_OF),
    questions: OPEN_QUESTIONS.length,
    questionsWithArguments: linked,
    standaloneArguments: standaloneArguments().length,
    gaps: DELIVERY_GAPS.length,
  };
}
