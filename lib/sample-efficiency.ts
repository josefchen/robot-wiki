/**
 * Sample-efficiency ledger: converting one environment-step budget into
 * wall-clock time under three data sources, and reading off which family
 * of reinforcement learning algorithm that budget admits. Pure functions,
 * unit-tested in tests/unit/sample-efficiency.test.ts.
 *
 * The module's whole argument is that sample efficiency is not a virtue an
 * algorithm has, it is a constraint the sampler imposes. The same budget
 * that is half an hour of GPU simulation is years of one robot's life, and
 * the algorithms that remain available differ on each side of that.
 *
 * THREE COLLECTION RATES. Each is derived from a published measurement and
 * the derivation is written out, so a reader can redo it:
 *
 * 1. Massively parallel simulation. Rudin and colleagues trained ANYmal
 *    with 4,096 parallel robots at a batch size of 98,304 (4,096 x 24
 *    rollout steps), for 1,500 policy updates, in under 20 minutes on one
 *    workstation GPU. That is 4,096 x 24 x 1,500 = 147,456,000 environment
 *    steps in under 1,200 s, so 122,880 steps/s.
 *
 * 2. A single real robot. Haarnoja and colleagues learned Minitaur walking
 *    from 160,000 control steps, about 400 rollouts, in about two hours of
 *    real-world time. 160,000 / 7,200 s is 22.2 steps/s. That figure is
 *    end-to-end: it already contains the resets, the operator's time and
 *    the robot standing still, which is why it sits far below the 50 Hz
 *    control rate the same rollouts ran at.
 *
 * 3. A fleet of N real robots, modelled as N times the single-robot rate.
 *    Linear scaling is the model, not a measurement, and it is optimistic:
 *    QT-Opt's seven-robot campaign collected over 580,000 grasp attempts
 *    of up to 20 time steps in about 800 robot hours, which is at most
 *    4.0 steps per robot-second, well under the Minitaur rate. Episodic
 *    grasping carries more per-episode overhead than continuous
 *    locomotion. The instrument discloses the divergence on screen rather
 *    than burying it here.
 *
 * TWO VERDICT BOUNDARIES, both editorial thresholds drawn from what the
 * literature actually did rather than from theory, and both labelled as
 * such in the UI:
 *
 * - One hour. Below it a run is cheap enough to throw every sample away
 *   after one gradient step and to rerun the whole thing when a reward
 *   term is wrong, which is the regime on-policy methods were designed
 *   for. Rudin's four-minute flat-terrain and twenty-minute uneven-terrain
 *   runs both sit inside it, and so does DayDreamer's one-hour quadruped.
 * - 720 hours, one month of continuous operation. Past it there is no
 *   supervised campaign to run at all, and the only remaining option is to
 *   learn from data somebody already collected.
 */

/** Rudin: 4,096 robots x 24 rollout steps per policy update. */
export const RUDIN_BATCH_STEPS = 98_304;
/** Rudin: policy updates in the deployed flat-and-rough-terrain run. */
export const RUDIN_POLICY_UPDATES = 1_500;
/** Rudin: "under 20 minutes" for those updates, in seconds. */
export const RUDIN_RUN_SECONDS = 20 * 60;

/** Environment steps per wall-clock second in massively parallel simulation. */
export const SIM_STEPS_PER_SECOND =
  (RUDIN_BATCH_STEPS * RUDIN_POLICY_UPDATES) / RUDIN_RUN_SECONDS;

/** Haarnoja: control steps to a walking Minitaur policy on hardware. */
export const MINITAUR_CONTROL_STEPS = 160_000;
/** Haarnoja: "about two hours" of real-world time, in seconds. */
export const MINITAUR_SECONDS = 2 * 3600;

/** Environment steps per wall-clock second on one real robot. */
export const ROBOT_STEPS_PER_SECOND =
  MINITAUR_CONTROL_STEPS / MINITAUR_SECONDS;

/**
 * QT-Opt's measured per-robot ceiling, steps per robot-second: over
 * 580,000 grasp attempts of up to 20 time steps across about 800 robot
 * hours. An upper bound, since not every attempt ran the full 20 steps.
 * Used only for the on-screen disclosure of what linear fleet scaling
 * overstates.
 */
export const QT_OPT_STEPS_PER_ROBOT_SECOND =
  (580_000 * 20) / (800 * 3600);

/** Wall-clock hours below which a run is cheap enough to discard samples. */
export const ON_POLICY_MAX_HOURS = 1;
/** Wall-clock hours past which no supervised collection campaign exists. */
export const OFFLINE_ONLY_ABOVE_HOURS = 720;

export type SourceId = 'sim' | 'robot' | 'fleet';

export interface DataSource {
  id: SourceId;
  /** Reader-facing label. */
  label: string;
  /** Where the rate comes from, one clause, for the on-screen readout. */
  provenance: string;
}

export const DATA_SOURCES: readonly DataSource[] = [
  {
    id: 'sim',
    label: 'massively parallel simulation',
    provenance:
      '4,096 parallel robots at 98,304 steps per update, 1,500 updates in under 20 minutes',
  },
  {
    id: 'robot',
    label: 'a single real robot',
    provenance:
      '160,000 control steps to a walking policy in about two hours, resets included',
  },
  {
    id: 'fleet',
    label: 'a fleet of real robots',
    provenance: 'the single-robot rate multiplied by the number of robots',
  },
];

export function getDataSource(id: SourceId): DataSource {
  const found = DATA_SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`unknown data source: ${id}`);
  return found;
}

export const FLEET_SPEC = { min: 2, max: 100, step: 1, default: 7 } as const;

/**
 * The budget slider carries the base-10 exponent, not the step count: the
 * quantity spans five orders of magnitude, so a linear slider would spend
 * nine tenths of its travel inside the top decade.
 */
export const BUDGET_SPEC = { min: 5, max: 10, step: 0.05, default: 8.2 } as const;

export interface LedgerParams {
  /** Base-10 exponent of the environment-step budget. */
  budgetExponent: number;
  source: SourceId;
  /** Robots in the fleet. Ignored unless source is 'fleet'. */
  fleetSize: number;
}

export const DEFAULT_PARAMS: LedgerParams = {
  budgetExponent: BUDGET_SPEC.default,
  source: 'sim',
  fleetSize: FLEET_SPEC.default,
};

/** Environment steps per wall-clock second under a source. */
export function stepsPerSecond(source: SourceId, fleetSize: number): number {
  switch (source) {
    case 'sim':
      return SIM_STEPS_PER_SECOND;
    case 'robot':
      return ROBOT_STEPS_PER_SECOND;
    case 'fleet':
      return ROBOT_STEPS_PER_SECOND * fleetSize;
  }
}

export type Family = 'on-policy' | 'off-policy' | 'offline';

export interface FamilyVerdict {
  family: Family;
  /** What the reader sees in the verdict readout. */
  label: string;
  /** Named exemplars of the family, for the readout's second clause. */
  exemplars: string;
}

const FAMILIES: Record<Family, FamilyVerdict> = {
  'on-policy': {
    family: 'on-policy',
    label: 'on-policy is affordable',
    exemplars: 'PPO: discard every batch after one update',
  },
  'off-policy': {
    family: 'off-policy',
    label: 'off-policy or offline only',
    exemplars: 'SAC, TD3, RLPD: reuse every transition from a replay buffer',
  },
  offline: {
    family: 'offline',
    label: 'offline only',
    exemplars: 'CQL, IQL, TD3+BC: no new collection at all',
  },
};

/** The algorithm family a wall-clock cost admits. */
export function classifyFamily(seconds: number): FamilyVerdict {
  const hours = seconds / 3600;
  if (hours <= ON_POLICY_MAX_HOURS) return FAMILIES['on-policy'];
  if (hours <= OFFLINE_ONLY_ABOVE_HOURS) return FAMILIES['off-policy'];
  return FAMILIES.offline;
}

export interface SourceRow {
  id: SourceId;
  label: string;
  stepsPerSecond: number;
  seconds: number;
  verdict: FamilyVerdict;
}

export interface Ledger {
  /** Environment steps the reader has budgeted. */
  budgetSteps: number;
  /** Every source at this budget, in DATA_SOURCES order. */
  rows: SourceRow[];
  /** The selected source's row. */
  selected: SourceRow;
  /**
   * How many times longer the selected source takes than parallel
   * simulation. 1 when simulation is selected.
   */
  slowdownVsSim: number;
}

export function computeLedger(params: LedgerParams): Ledger {
  const budgetSteps = 10 ** params.budgetExponent;
  const rows = DATA_SOURCES.map((source) => {
    const rate = stepsPerSecond(source.id, params.fleetSize);
    const seconds = budgetSteps / rate;
    return {
      id: source.id,
      label:
        source.id === 'fleet'
          ? `a fleet of ${params.fleetSize} real robots`
          : source.label,
      stepsPerSecond: rate,
      seconds,
      verdict: classifyFamily(seconds),
    };
  });
  const selected = rows.find((r) => r.id === params.source);
  if (!selected) throw new Error(`unknown data source: ${params.source}`);
  const sim = rows.find((r) => r.id === 'sim')!;
  return {
    budgetSteps,
    rows,
    selected,
    slowdownVsSim: selected.seconds / sim.seconds,
  };
}

/**
 * A measured wall-clock figure from a paper, drawn on the shared timeline
 * so the reader can see where the modelled conversions land relative to
 * runs that really happened. Every one carries a citation id: an unlabelled
 * or unsourced anchor is exactly the decoration this chart avoids.
 */
export interface Anchor {
  id: string;
  seconds: number;
  /** The visible label drawn beside the mark. */
  label: string;
  /** Citation registry id, rendered as a chip in the caption. */
  citation: string;
}

export const ANCHORS: readonly Anchor[] = [
  {
    id: 'rudin-flat',
    seconds: 4 * 60,
    label: 'ANYmal flat terrain, under 4 min',
    citation: 'rudin-2021',
  },
  {
    id: 'rudin-uneven',
    seconds: 20 * 60,
    label: 'ANYmal uneven terrain, 20 min',
    citation: 'rudin-2021',
  },
  {
    id: 'daydreamer',
    seconds: 3600,
    label: 'A1 walking on hardware, 1 h',
    citation: 'daydreamer-2022',
  },
  {
    id: 'minitaur',
    seconds: MINITAUR_SECONDS,
    label: 'Minitaur walking on hardware, about 2 h',
    citation: 'haarnoja-walk-2019',
  },
  {
    id: 'qt-opt',
    seconds: 800 * 3600,
    label: 'QT-Opt grasping, about 800 robot hours',
    citation: 'qt-opt-2018',
  },
  {
    id: 'hand-eye',
    seconds: 2 * 30 * 24 * 3600,
    label: '800k grasps on 6 to 14 arms, two months',
    citation: 'levine-hand-eye-2018',
  },
];

/** Timeline bounds in seconds: 1 s to about 31.7 years. */
export const TIME_MIN_SECONDS = 1;
export const TIME_MAX_SECONDS = 1e9;

/** Position on the log timeline, 0 to 1, clamped to the drawn bounds. */
export function timeFraction(seconds: number): number {
  const lo = Math.log10(TIME_MIN_SECONDS);
  const hi = Math.log10(TIME_MAX_SECONDS);
  const t = (Math.log10(Math.max(seconds, TIME_MIN_SECONDS)) - lo) / (hi - lo);
  return Math.min(Math.max(t, 0), 1);
}

/** "45 s", "3.4 min", "5.2 h", "22 d", "3.1 yr". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 48 * 3600) return `${(seconds / 3600).toFixed(1)} h`;
  if (seconds < 365.25 * 24 * 3600) return `${(seconds / 86400).toFixed(1)} d`;
  return `${(seconds / (365.25 * 86400)).toFixed(1)} yr`;
}

/** "1.6e8 steps" as "160M steps"-style compact text. */
export function formatSteps(steps: number): string {
  if (steps >= 1e9) return `${(steps / 1e9).toFixed(2)}B`;
  if (steps >= 1e6) return `${(steps / 1e6).toFixed(0)}M`;
  if (steps >= 1e3) return `${(steps / 1e3).toFixed(0)}k`;
  return `${Math.round(steps)}`;
}

/** "123k steps/s", "22 steps/s". */
export function formatRate(rate: number): string {
  if (rate >= 1e3) return `${Math.round(rate / 1e3)}k steps/s`;
  if (rate >= 10) return `${Math.round(rate)} steps/s`;
  return `${rate.toFixed(1)} steps/s`;
}
