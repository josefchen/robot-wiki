import {
  DEVELOPMENTS,
  TRAJECTORIES,
  type Cited,
  type DeliveryGap,
  type Development,
  type DevelopmentArea,
  type Trajectory,
  type TrajectoryEnd,
  type TrajectoryUnit,
} from '../data/now.ts';
import type { Computation } from '../data/schemas/now.ts';

/**
 * Pure functions over data/now.ts. Every number derived from the rows is
 * computed here: implied ends, sums, shares, day counts and GPU-hours. The
 * page and its figure read these and never type a derived number.
 */

const HOURS_PER_DAY = 24;
const DAY_MS = 86_400_000;

/** Whole days from one ISO date to a later one. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** The value a computation yields from its stated inputs. */
export function computeValue(computation: Computation): number {
  switch (computation.kind) {
    case 'implied-by-growth':
      return computation.later.value / (1 + computation.growthPercent.value / 100);
    case 'sum':
      return computation.parts.reduce((total, part) => total + part.value, 0);
    case 'robot-share': {
      const robot = computation.parts.filter((part) => part.robot);
      // Every part robot data: the share is whole even where a part's hours are not given.
      if (robot.length === computation.parts.length) return 100;
      if (computation.parts.some((part) => part.hours === null)) {
        throw new Error('A robot share needs the hours of every part');
      }
      const total = computation.parts.reduce((sum, part) => sum + (part.hours ?? 0), 0);
      const robotHours = robot.reduce((sum, part) => sum + (part.hours ?? 0), 0);
      return (robotHours / total) * 100;
    }
    case 'days-between':
      return daysBetween(computation.from.date, computation.to.date);
    case 'gpu-hours':
      return computation.gpus.value * computation.days.value * HOURS_PER_DAY;
  }
}

/** An end's value: the page's number, or the one computed from its inputs. */
export function endValue(end: TrajectoryEnd): number {
  return end.basis === 'stated' ? end.value : computeValue(end.computation);
}

/** Every page an end rests on: its own, its inputs', and its date's. */
export function endSources(end: TrajectoryEnd): Cited[] {
  const own: Cited[] = end.basis === 'stated' ? [end] : computationInputs(end.computation);
  return end.dateSource ? [...own, end.dateSource] : own;
}

function computationInputs(computation: Computation): Cited[] {
  switch (computation.kind) {
    case 'implied-by-growth':
      return [computation.later, computation.growthPercent];
    case 'sum':
    case 'robot-share':
      return [...computation.parts];
    case 'days-between':
      return [computation.from, computation.to];
    case 'gpu-hours':
      return [computation.gpus, computation.days];
  }
}

const COUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Implied counts are estimates of an estimate: shown to the nearest hundred. */
function roundedCount(value: number): string {
  return COUNT.format(Math.round(value / 100) * 100);
}

/** One formatter per trajectory unit. */
export const TRAJECTORY_UNIT_FORMATS: Record<TrajectoryUnit, (value: number) => string> = {
  'humanoids per quarter': (value) => COUNT.format(value),
  hours: (value) => `${COUNT.format(value)} h`,
  'percent of hours': (value) => `${ONE_DECIMAL.format(value)}%`,
  days: (value) => `${COUNT.format(value)} days`,
  'GPU-hours': (value) => `${COUNT.format(value)} GPU-hours`,
  'percent success': (value) => `${ONE_DECIMAL.format(value)}%`,
  'USD billions per quarter': (value) => `$${ONE_DECIMAL.format(value)}B`,
  'rides per week': (value) => COUNT.format(value),
  'missions per month': (value) => COUNT.format(value),
  'systems installed': (value) => COUNT.format(value),
};

/** An end as a reader sees it, with the page's hedge or "about" for an implied count. */
export function formatEnd(trajectory: Trajectory, end: TrajectoryEnd): string {
  const value = endValue(end);
  if (end.basis === 'computed' && end.computation.kind === 'implied-by-growth') {
    return `about ${roundedCount(value)}`;
  }
  const text = TRAJECTORY_UNIT_FORMATS[trajectory.unit](value);
  return end.basis === 'stated' && end.qualifier ? `${end.qualifier} ${text}` : text;
}

export type ResolvedEnd = {
  date: string;
  period: string;
  label: string;
  basis: TrajectoryEnd['basis'];
  value: number;
  display: string;
  sources: Cited[];
};

export type ResolvedTrajectory = Omit<Trajectory, 'earlier' | 'later' | 'alongside'> & {
  earlier: ResolvedEnd;
  later: ResolvedEnd;
  alongside: ResolvedEnd[];
  /** Up, down or flat from the earlier end to the later one. */
  direction: 'up' | 'down' | 'flat';
};

function resolveEnd(trajectory: Trajectory, end: TrajectoryEnd): ResolvedEnd {
  return {
    date: end.date,
    period: end.period,
    label: end.label,
    basis: end.basis,
    value: endValue(end),
    display: formatEnd(trajectory, end),
    sources: endSources(end),
  };
}

/** A trajectory with both ends computed and formatted. */
export function resolveTrajectory(trajectory: Trajectory): ResolvedTrajectory {
  const earlier = resolveEnd(trajectory, trajectory.earlier);
  const later = resolveEnd(trajectory, trajectory.later);
  return {
    ...trajectory,
    earlier,
    later,
    alongside: (trajectory.alongside ?? []).map((end) => resolveEnd(trajectory, end)),
    direction: later.value > earlier.value ? 'up' : later.value < earlier.value ? 'down' : 'flat',
  };
}

/** Every trajectory with its computed ends, in the data's order. */
export function resolvedTrajectories(rows: readonly Trajectory[] = TRAJECTORIES): ResolvedTrajectory[] {
  return rows.map(resolveTrajectory);
}

/** Developments newest first; rows on one day keep the data's order. */
export function developmentsNewestFirst(rows: readonly Development[] = DEVELOPMENTS): Development[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => right.row.date.localeCompare(left.row.date) || left.index - right.index)
    .map(({ row }) => row);
}

/** The `count` newest developments with a primary source, for the home page. */
export function latestDevelopments(count: number, rows: readonly Development[] = DEVELOPMENTS): Development[] {
  return developmentsNewestFirst(rows)
    .filter((row) => row.sourceType === 'primary')
    .slice(0, Math.max(0, count));
}

export const DEVELOPMENT_AREAS: readonly DevelopmentArea[] = ['models', 'deployments', 'policy', 'money'];

/** How many developments each area holds. */
export function developmentCountsByArea(rows: readonly Development[] = DEVELOPMENTS): Record<DevelopmentArea, number> {
  const counts = { models: 0, deployments: 0, policy: 0, money: 0 } satisfies Record<DevelopmentArea, number>;
  for (const row of rows) counts[row.area] += 1;
  return counts;
}

const PLAIN_COUNT = new Intl.NumberFormat('en-US');
const COMPACT_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * A delivery-gap figure as a reader sees it: "n/a" for a milestone, which
 * has no number, and "not disclosed" when the source gives no figure.
 */
export function formatGapValue(gap: DeliveryGap, side: 'promised' | 'delivered'): string {
  const { value, qualifier, countKind } = gap[side];
  if (value === null) return countKind === 'milestone' ? 'n/a' : 'not disclosed';
  const number = gap.unit.startsWith('USD') ? COMPACT_DOLLARS.format(value) : PLAIN_COUNT.format(value);
  return qualifier ? `${qualifier} ${number}` : number;
}
