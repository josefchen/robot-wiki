/**
 * Latent-imagination compounding-error model for the world-models
 * latent-dynamics module.
 *
 * Pedagogical model of how error accumulates inside an imagined rollout
 * (Dreamer-style RSSM imagination or TD-MPC-style latent planning). At each
 * imagined step the learned dynamics make a one-step prediction error of
 * magnitude epsilon in latent space. The next prediction is conditioned on
 * the already-erroneous latent, so error enters the state the model reads
 * and later steps err more: deviation compounds instead of staying flat.
 * This is the mechanism behind the published practice of keeping latent
 * imagination short, typically 15 to 50 steps (see research/02 Part B1).
 *
 * Decoder-free models (TD-MPC/TD-MPC2) never reconstruct an image; the only
 * prediction that has to stay calibrated is reward and value. The reward
 * prediction error is modeled as proportional to the latent deviation: the
 * further the imagined state has drifted, the worse the scalar heads do.
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
 * Reward/value prediction error per unit of latent deviation. Decoder-free
 * models are trained only for reward and value prediction, so this is the
 * readout that replaces pixel reconstruction quality for them.
 */
export const REWARD_ERROR_GAIN = 0.35;

/** Published practice: latent imagination horizons typically run 15-50 steps. */
export const TYPICAL_HORIZON: readonly [number, number] = [15, 50];

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
 * Reward/value prediction error at the end of an H-step imagined rollout,
 * proportional to the latent deviation. This is the quantity a decoder-free
 * model exposes: prediction quality without any image reconstruction.
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
