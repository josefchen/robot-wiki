/**
 * Pure helpers for the /now/ debate tables (data/now-debates.ts): order,
 * grouping, the link between an argument and its open question, and the
 * counts a caption may state. Nothing here is typed into a component.
 *
 * Only types come from the schema, so a page that renders these rows does
 * not bundle zod.
 */
import { NOW_ARGUMENTS, OPEN_QUESTIONS, type NowArgument, type OpenQuestion, type Position } from '../data/now-debates.ts';
import type { Evidence, SourcedEvidence } from '../data/schemas/now-debate.ts';

/** Same string as the schema's NONE_PUBLISHED (pinned by the unit test). */
export const NONE_PUBLISHED = 'none published';

export interface SideGroup {
  side: string;
  positions: Position[];
}

export interface DebateCounts {
  questions: number;
  arguments: number;
  positions: number;
  /** Positions whose source is a press report or a reporter's scoop. */
  reportedPositions: number;
  /** Evidence sides with a source, and sides with nothing published. */
  sourcedEvidence: number;
  evidenceNonePublished: number;
  /** Subjects that appear as both a question and an argument. */
  linkedSubjects: number;
}

/** Arguments in rank order, the most argued first. */
export function argumentsByRank(args: readonly NowArgument[] = NOW_ARGUMENTS): NowArgument[] {
  return [...args].sort((a, b) => a.rank - b.rank);
}

/** Open questions in rank order. */
export function questionsByRank(questions: readonly OpenQuestion[] = OPEN_QUESTIONS): OpenQuestion[] {
  return [...questions].sort((a, b) => a.rank - b.rank);
}

/** The positions of one argument grouped by side, in the argument's side order; empty sides are left out. */
export function positionsBySide(argument: NowArgument): SideGroup[] {
  return argument.sides
    .map((side) => ({ side, positions: argument.positions.filter((position) => position.side === side) }))
    .filter((group) => group.positions.length > 0);
}

/** The open question on the same subject as an argument, or null. */
export function questionForArgument(
  argument: NowArgument,
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
): OpenQuestion | null {
  if (argument.questionId === undefined) return null;
  return questions.find((question) => question.id === argument.questionId) ?? null;
}

/** The argument on the same subject as an open question, or null. */
export function argumentForQuestion(
  question: OpenQuestion,
  args: readonly NowArgument[] = NOW_ARGUMENTS,
): NowArgument | null {
  return args.find((argument) => argument.questionId === question.id) ?? null;
}

/** Questions with no argument on the same subject, in rank order. */
export function unlinkedQuestions(
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
  args: readonly NowArgument[] = NOW_ARGUMENTS,
): OpenQuestion[] {
  return questionsByRank(questions).filter((question) => argumentForQuestion(question, args) === null);
}

export function isSourced(evidence: Evidence): evidence is SourcedEvidence {
  return evidence !== NONE_PUBLISHED;
}

/** Every position, in argument rank order. */
export function allPositions(args: readonly NowArgument[] = NOW_ARGUMENTS): Position[] {
  return argumentsByRank(args).flatMap((argument) => argument.positions);
}

export function debateCounts(
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
  args: readonly NowArgument[] = NOW_ARGUMENTS,
): DebateCounts {
  const positions = allPositions(args);
  const evidence = questions.flatMap((question) => [question.evidenceFor, question.evidenceAgainst]);
  return {
    questions: questions.length,
    arguments: args.length,
    positions: positions.length,
    reportedPositions: positions.filter((position) => position.sourceType === 'reported').length,
    sourcedEvidence: evidence.filter(isSourced).length,
    evidenceNonePublished: evidence.filter((side) => !isSourced(side)).length,
    linkedSubjects: args.filter((argument) => questionForArgument(argument, questions) !== null).length,
  };
}

/** Every string written for the site: not quotes, names, passages or source titles. */
export function siteCopy(
  questions: readonly OpenQuestion[] = OPEN_QUESTIONS,
  args: readonly NowArgument[] = NOW_ARGUMENTS,
): string[] {
  const fromQuestions = questions.flatMap((question) => [
    question.question,
    question.labels.for,
    question.labels.against,
    ...[question.evidenceFor, question.evidenceAgainst].filter(isSourced).map((evidence) => evidence.text),
  ]);
  const fromArguments = args.flatMap((argument) => [
    argument.title,
    argument.question,
    ...argument.sides,
    ...argument.positions.flatMap((position) => [position.role, ...(position.context ? [position.context] : [])]),
  ]);
  return [...fromQuestions, ...fromArguments];
}
