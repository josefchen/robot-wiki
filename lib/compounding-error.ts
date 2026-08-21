/**
 * Compounding-error model for the behavior-cloning foundations module.
 *
 * Pedagogical model of the DAgger analysis (Ross, Gordon & Bagnell,
 * arXiv:1011.0686): a policy trained on the expert's state distribution makes
 * a per-decision error of magnitude epsilon. Each error persists (the robot
 * keeps the offset it drove itself into) and amplifies subsequent errors,
 * because the policy is now off the distribution it was trained on. Deviation
 * therefore grows superlinearly in the horizon, and the total cost of an
 * episode, the sum of per-step deviations, follows the quadratic bound
 * epsilon * T * (T + 1) / 2 rather than the linear epsilon * T.
 *
 * All functions are pure and deterministic; the interactive replays identical
 * traces on every render. Unit-tested in tests/unit/compounding-error.test.ts.
 */

export type PredictionMode = 'per-step' | 'chunk';

export interface RolloutParams {
  /** Per-decision error magnitude on the expert distribution, in (0, 1]. */
  epsilon: number;
  /** Episode horizon T in control steps. */
  steps: number;
  /** Per-timestep prediction versus committing to a chunk of k actions. */
  mode: PredictionMode;
  /** Chunk length k; only used when mode is 'chunk'. */
  chunkSize: number;
  /** When true, an expert relabels visited states every DAGGER_INTERVAL steps. */
  dagger: boolean;
}

/**
 * Off-distribution amplification: the policy's error grows with how far it
 * has drifted from the expert distribution, which is the mechanism behind
 * superlinear deviation growth. Small on purpose; the qualitative shape
 * (linear-ish deviation, quadratic cost) is what the module teaches.
 */
export const COMPOUNDING_GAIN = 0.01;

/** Steps between expert relabeling rounds when the DAgger toggle is on. */
export const DAGGER_INTERVAL = 20;

/** Fraction of the current deviation each relabeling round removes. */
export const DAGGER_CORRECTION = 0.75;

/**
 * The demonstrated path's lateral position at step t, in model units. A
 * gentle S-curve; deviations are measured against it.
 */
export function expertY(t: number): number {
  return 0.4 * Math.sin((2 * Math.PI * t) / 150);
}

/**
 * Simulated lateral deviation d(t) = y_rollout(t) - y_expert(t) for
 * t = 0..steps. d(0) = 0 and deviations are non-negative (drift to one side)
 * so that ordering guarantees hold term-wise:
 *
 * - per-step mode makes a decision every step; chunk mode only every
 *   chunkSize steps, so its deviation is pointwise dominated by per-step.
 * - DAgger corrections only ever shrink the deviation, so the corrected
 *   rollout is pointwise dominated by the uncorrected one.
 *
 * Increments use the off-distribution amplification epsilon * (1 + gain * d),
 * so a policy that has drifted further errs more, matching the intuition that
 * states far from the demonstration data are where the policy is least
 * reliable.
 */
export function simulateDeviation(params: RolloutParams): number[] {
  const { epsilon, steps, mode, chunkSize, dagger } = params;
  const e = Math.min(1, Math.max(0, epsilon));
  const n = Math.max(0, Math.round(steps));
  const k = Math.max(1, Math.round(chunkSize));
  const deviation: number[] = new Array(n + 1);
  deviation[0] = 0;
  let d = 0;
  for (let t = 1; t <= n; t += 1) {
    const isDecision = mode === 'per-step' || (t - 1) % k === 0;
    if (isDecision) {
      d += e * (1 + COMPOUNDING_GAIN * d);
    }
    if (dagger && t % DAGGER_INTERVAL === 0) {
      d *= 1 - DAGGER_CORRECTION;
    }
    deviation[t] = d;
  }
  return deviation;
}

/** Total episode cost: the sum of per-step absolute deviations. */
export function accumulatedCost(deviation: readonly number[]): number {
  let total = 0;
  for (const d of deviation) total += Math.abs(d);
  return total;
}

/**
 * The DAgger paper's worst-case bound for naive behavior cloning: a policy
 * with per-step error epsilon on the expert distribution can incur total
 * cost epsilon * T * (T + 1) / 2 over a T-step episode.
 */
export function bcBound(epsilon: number, t: number): number {
  return (epsilon * t * (t + 1)) / 2;
}

/**
 * The matching bound once the training distribution covers the states the
 * policy actually visits (DAgger's no-regret reduction): cost grows only
 * linearly, epsilon * T.
 */
export function daggerBound(epsilon: number, t: number): number {
  return epsilon * t;
}

/**
 * Top of the accumulated-deviation axis, in model units. It covers the
 * whole reachable range at once: the worst plottable simulated cost is
 * 4906.2 (15% error, 240 steps, per-timestep, no relabeling) and the
 * worst quadratic bound is 4338.0, so nothing a reader can reach clips.
 */
export const DEVIATION_AXIS_CEILING = 5000;

/**
 * Knee of the compressive axis below, in model units. It sets how much
 * height the low end of the range gets: the interesting readings span
 * three decades (17.5 units chunked, 370.3 at the article defaults,
 * 4906.2 at the extreme) and a linear axis gave the first two 0.4% and
 * 8.1% of plot height, which is the whole 21x lesson rendered as a few
 * pixels.
 */
const DEVIATION_AXIS_KNEE = 100;

const DEVIATION_AXIS_SPAN = Math.log10(
  1 + DEVIATION_AXIS_CEILING / DEVIATION_AXIS_KNEE,
);

/** Gridline values, in model units. Ascending, spanning the full domain. */
export const DEVIATION_AXIS_TICKS: readonly number[] = [
  0,
  100,
  500,
  2000,
  DEVIATION_AXIS_CEILING,
];

/**
 * Where a deviation value sits on the accumulated-deviation axis, as a
 * fraction of plot height from the zero baseline.
 *
 * The domain is FIXED rather than fitted to whatever is currently
 * plotted, and that is the load-bearing property: an axis rescaled to the
 * current series holds the marker at a near-constant height and turns the
 * error and horizon sliders into apparent no-ops. What the fixed linear
 * domain could not do is show the mode toggle, because a 21x drop near
 * the bottom of a 5000-unit range is a few pixels.
 *
 * log10(1 + v/knee) resolves both: it is compressive enough to give the
 * low decades real height, monotone so raising either slider still moves
 * the marker up, and defined at v = 0 so the baseline is a true zero
 * rather than an arbitrary floor a pure log axis would need.
 */
export function deviationAxisFraction(value: number): number {
  const clamped = Math.min(
    DEVIATION_AXIS_CEILING,
    Math.max(0, Number.isFinite(value) ? value : 0),
  );
  return Math.log10(1 + clamped / DEVIATION_AXIS_KNEE) / DEVIATION_AXIS_SPAN;
}
