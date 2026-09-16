/**
 * Constant-rate sample-budget toy with unchanged arithmetic and controls.
 * Rudin reports 98,304 samples x 1,500 updates in under 1,200 seconds:
 * the end-to-end average is strictly greater than 122,880 steps/s. The
 * toy uses the boundary value, not an exact measured rate.
 * Minitaur reports 160,000 steps over about two hours of the whole
 * training process; 22.2 steps/s is an approximate process average.
 * Fleet scaling assumes N times that single-robot constant, not a
 * measured multi-robot throughput. One hour and 720 hours define editorial
 * toy bands, not algorithm-eligibility or supervised-collection limits.
 * Anchor positions retain existing nominal numeric values. Bounds,
 * approximate times, aggregate robot-hours and a two-month period are
 * not interchangeable measured wall-clock durations.
 */

/** Rudin: 4,096 robots x 24 rollout steps per policy update. */
export const RUDIN_BATCH_STEPS = 98_304;
/** Rudin: policy updates in the deployed flat-and-rough-terrain run. */
export const RUDIN_POLICY_UPDATES = 1_500;
/** Rudin: "under 20 minutes" for those updates, in seconds. */
export const RUDIN_RUN_SECONDS = 20 * 60;

/** Toy simulation constant at the reported time boundary, not exact measured throughput. */
export const SIM_STEPS_PER_SECOND =
  (RUDIN_BATCH_STEPS * RUDIN_POLICY_UPDATES) / RUDIN_RUN_SECONDS;

/** Haarnoja: control steps to a walking Minitaur policy on hardware. */
export const MINITAUR_CONTROL_STEPS = 160_000;
/** Haarnoja: "about two hours" of real-world time, in seconds. */
export const MINITAUR_SECONDS = 2 * 3600;

/** Approximate Minitaur whole-training average used as a toy single-robot constant. */
export const ROBOT_STEPS_PER_SECOND =
  MINITAUR_CONTROL_STEPS / MINITAUR_SECONDS;

/**
 * Legacy arithmetic retained unchanged for compatibility: 580000*20/(800*3600).
 * Not a measured mean, campaign step rate, or scientifically established
 * upper bound: the 20-step evaluation cap is not a campaign mean, and the
 * source count/time qualifiers do not establish exact operands. This value
 * is not rendered as an empirical QT-Opt comparison.
 */
export const QT_OPT_STEPS_PER_ROBOT_SECOND =
  (580_000 * 20) / (800 * 3600);

/** Editorial toy boundary in hours; not an algorithm eligibility rule. */
export const ON_POLICY_MAX_HOURS = 1;
/** Editorial toy boundary in hours; no claim that longer collection is impossible. */
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
      'toy boundary: 98,304 samples × 1,500 updates / 1,200 seconds; reported throughput is strictly greater',
  },
  {
    id: 'robot',
    label: 'a single real robot',
    provenance:
      'toy process-average constant: 160,000 control steps / about two hours; not the rollout rate',
  },
  {
    id: 'fleet',
    label: 'a fleet of real robots',
    provenance: 'assumed perfect parallelism: the toy single-robot rate multiplied by fleet size',
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
    label: 'toy on-policy band',
    exemplars: 'PPO example; not an eligibility rule',
  },
  'off-policy': {
    family: 'off-policy',
    label: 'toy off-policy band',
    exemplars: 'SAC, TD3, RLPD examples; not an eligibility rule',
  },
  offline: {
    family: 'offline',
    label: 'toy offline band',
    exemplars: 'CQL, IQL, TD3+BC examples; not an eligibility rule',
  },
};

/** Map modelled time to editorial toy categories; preserve existing thresholds. */
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
 * Numeric placement of a reported duration or bound. Each label/caption
 * preserves its source unit and qualifier. In particular, QT-Opt robot-hours
 * are not parallel wall time and the two-month position assumes 60 days.
 * These are not matched benchmark points.
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
    label: 'A1 walking, one reported run, 1 h',
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
    label: 'About 800k attempts, 6-14 robots, two months',
    citation: 'levine-hand-eye-2016',
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
