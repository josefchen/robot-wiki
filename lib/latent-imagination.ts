/**
 * Deterministic pedagogical toy for the latent-dynamics article.
 *
 * The recurrence assumes that off-state error amplifies subsequent error.
 * Its curves, projected path, and reward-error multiplier are illustrative,
 * not measured Dreamer or TD-MPC predictions and not a reliability model.
 * Source horizon settings are discussed separately in the article.
 *
 * TD-MPC and TD-MPC2 do not reconstruct observations, but their objectives
 * also include latent-state consistency / joint-embedding prediction.
 * A toy scalar readout is not a complete account of either training loss.
 *
 * All functions are pure and deterministic. Unit-tested in
 * tests/unit/latent-imagination.test.ts.
 */

export interface ImaginationParams {
  /** One-step latent prediction error magnitude, in [0, 1]. */
  epsilon: number;
  /** Imagination horizon H in steps. */
  horizon: number;
}

/**
 * Off-state amplification: each new one-step error is scaled by how far the
 * imagined latent has already drifted from the true trajectory, matching the
 * intuition that predictions conditioned on wrong states are less reliable.
 * Small on purpose; the qualitative shape (superlinear deviation growth) is
 * what the module teaches.
 */
export const COMPOUNDING_GAIN = 0.02;

/**
 * Illustrative reward-error multiplier per unit of toy latent deviation.
 * This chosen coefficient is not a measured quantity or a paper loss.
 */
export const REWARD_ERROR_GAIN = 0.35;

/**
 * Illustrative shaded-band endpoints, not a published or reliable range.
 * The legacy export name is retained for compatibility. Neither endpoint
 * resolves DreamerV3 H=15/T=16 or DayDreamer H=16/H=15 source differences.
 */
export const TYPICAL_HORIZON: readonly [number, number] = [3, 15];

/** Longest horizon the interactive draws. */
export const MAX_HORIZON = 50;

function clampEpsilon(epsilon: number): number {
  if (!Number.isFinite(epsilon)) return 0;
  return Math.min(1, Math.max(0, epsilon));
}

function clampHorizon(horizon: number): number {
  if (!Number.isFinite(horizon)) return 0;
  return Math.max(0, Math.round(horizon));
}

/**
 * Deviation series d(0..horizon) between the imagined latent trajectory and
 * the ground-truth latent trajectory. d(0) = 0 (the rollout starts from a
 * real encoded state) and d is strictly increasing while epsilon > 0:
 *
 *   d_{t} = d_{t-1} + epsilon * (1 + COMPOUNDING_GAIN * d_{t-1})
 *
 * so a fixed one-step error compounds into a growing total deviation.
 */
export function imagineDeviation(params: ImaginationParams): number[] {
  const e = clampEpsilon(params.epsilon);
  const n = clampHorizon(params.horizon);
  const deviation: number[] = new Array(n + 1);
  deviation[0] = 0;
  let d = 0;
  for (let t = 1; t <= n; t += 1) {
    d += e * (1 + COMPOUNDING_GAIN * d);
    deviation[t] = d;
  }
  return deviation;
}

/** Deviation at the end of an H-step imagined rollout. */
export function deviationAt(params: ImaginationParams): number {
  const n = clampHorizon(params.horizon);
  if (n === 0) return 0;
  return imagineDeviation({ epsilon: params.epsilon, horizon: n })[n];
}

/**
 * Toy reward-error readout at the end of an H-step illustrative rollout,
 * proportional to toy latent deviation; not measured decoder-free performance.
 */
export function rewardPredictionError(params: ImaginationParams): number {
  return REWARD_ERROR_GAIN * deviationAt(params);
}

/**
 * Ground-truth latent trajectory, projected to one dimension for the chart.
 * A smooth S-curve in normalized units; deviations are measured against it.
 */
export function trueLatent(t: number): number {
  return 0.35 * Math.sin((2 * Math.PI * t) / 90);
}
