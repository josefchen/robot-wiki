/**
 * EgoScale scaling-law model for the generalization module's extrapolation
 * interactive. Pure functions and constants, unit-tested in
 * tests/unit/egoscale-law.test.ts.
 *
 * Everything measured comes from the EgoScale paper (arXiv 2602.16710,
 * section 3.3 and Figure 5): models pretrained on 1k, 2k, 4k, 10k, and 20k
 * hours of egocentric human video; optimal validation loss at convergence
 * follows L = 0.024 - 0.003 * ln(D) with R^2 = 0.9983, where the paper's
 * display equation takes D in thousands of hours (the published figure's
 * loss axis spans 0.014 to 0.024, which only that reading reproduces);
 * downstream average task completion after post-training rises monotonically
 * from 0.30 at 1k hours to 0.71 at 20k hours (0.45, 0.48, 0.57 between).
 *
 * Two things in this file are ours, not the paper's, and the UI says so:
 * the log-linear least-squares fit through the five reported completion
 * scores, and the scenario band in the extrapolated region, which brackets
 * "the law keeps holding" against "the law plateaus at the last measured
 * value". The band is a pair of scenarios, not a confidence interval; the
 * paper itself states it does not extrapolate beyond the measured range.
 *
 * Reconciliation: the 20,854-hour full-dataset figure is the same number
 * the data-bottleneck module plots (ROBOT_POINTS, lib/data-scaling.ts);
 * a unit test pins the two together. The 20k-hour measured-range maximum is
 * the scaling study's largest pretrained model, a different quantity from
 * the full dataset size, and from the 20K hours of EgoScale video that
 * GR00T N1.7's README says enter its pretraining (see
 * content/manipulation/cross-embodiment.mdx).
 *
 * Determinism: no Math.random, no Date; all rendered values are rounded so
 * SSR HTML and client hydration serialize identically.
 */

/** Published fit quality of the log-linear validation-loss law. */
export const R_SQUARED = 0.9983;

/** Smallest pretraining scale in the paper's scaling study, in hours. */
export const MEASURED_MIN_HOURS = 1000;
/** Largest pretraining scale in the scaling study, in hours. */
export const MEASURED_MAX_HOURS = 20_000;
/** Full EgoScale dataset size in hours (matches ROBOT_POINTS 'egoscale'). */
export const FULL_DATASET_HOURS = 20_854;

/** Slider range for the extrapolation horizon. */
export const MAX_HORIZON_HOURS = 1_000_000;
/**
 * Default horizon: 100k hours keeps the extrapolated region, the scenario
 * band, and the solved bar all visible on first render.
 */
export const DEFAULT_HORIZON_HOURS = 100_000;

/**
 * The solved bar: a single policy above 90% success across many unseen
 * homes with no per-site data collection. Drawn on the completion axis.
 */
export const SOLVED_BAR_SCORE = 0.9;

/** The published law: L = intercept - slope * ln(D), D in thousands of hours. */
export const LOSS_LAW = { intercept: 0.024, slope: 0.003 } as const;

/** Optimal human-video validation loss (MSE) at convergence, per the law. */
export function validationLoss(hours: number): number {
  return LOSS_LAW.intercept - LOSS_LAW.slope * Math.log(hours / 1000);
}

/** A measured downstream result from the paper's scaling study. */
export interface ScalingPoint {
  /** Pretraining hours. */
  hours: number;
  /** Average task completion score after post-training, 0 to 1. */
  score: number;
}

/**
 * The five reported downstream scores (Figure 5, right panel). Endpoints
 * 0.30 and 0.71 are stated in the text; 0.45, 0.48, and 0.57 are the
 * figure's bar labels, in the monotonic order the text asserts.
 */
export const COMPLETION_POINTS: ScalingPoint[] = [
  { hours: 1000, score: 0.3 },
  { hours: 2000, score: 0.45 },
  { hours: 4000, score: 0.48 },
  { hours: 10_000, score: 0.57 },
  { hours: 20_000, score: 0.71 },
];

/**
 * Least-squares log-linear fit through COMPLETION_POINTS:
 * score = intercept + slope * ln(hours / 1000). Computed at module load
 * from the five points so the rendered line and the reported R^2 can never
 * drift apart.
 */
function fitCompletion(): { intercept: number; slope: number; rSquared: number } {
  const xs = COMPLETION_POINTS.map((p) => Math.log(p.hours / 1000));
  const ys = COMPLETION_POINTS.map((p) => p.score);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    ssRes += (ys[i] - (intercept + slope * xs[i])) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  return { intercept, slope, rSquared: 1 - ssRes / ssTot };
}

export const COMPLETION_FIT = fitCompletion();

/**
 * The completion fit's projection at a given scale. Uncapped on purpose:
 * past ~250k hours it exceeds 1.0, which is impossible, and that crossing
 * is the interactive's demonstration that the extrapolation must bend.
 */
export function completionFitScore(hours: number): number {
  return (
    COMPLETION_FIT.intercept +
    COMPLETION_FIT.slope * Math.log(hours / 1000)
  );
}

/** Alias kept short for JSX and tests. */
export const completionFit = completionFitScore;

/** Hours at which the completion fit reaches the solved bar. */
export function solvedBarCrossingHours(): number {
  return (
    1000 *
    Math.exp(
      (SOLVED_BAR_SCORE - COMPLETION_FIT.intercept) / COMPLETION_FIT.slope,
    )
  );
}

/** Pessimistic scenario: the law plateaus at the last measured loss. */
export function plateauLoss(hours: number): number {
  return validationLoss(Math.min(hours, MEASURED_MAX_HOURS));
}

/** Pessimistic scenario: downstream performance plateaus at 0.71. */
export function plateauCompletion(hours: number): number {
  const last = COMPLETION_POINTS[COMPLETION_POINTS.length - 1];
  return hours <= MEASURED_MAX_HOURS ? completionFit(hours) : last.score;
}

/* Slider mapping (log scale over the extrapolation horizon). */

/** Slider minimum: log10(MEASURED_MAX_HOURS) * 1000, rounded. */
export const SLIDER_MIN = 4301;
/** Slider maximum: log10(MAX_HORIZON_HOURS) * 1000. */
export const SLIDER_MAX = 6000;

/** Slider value to hours: hours = 10^(v / 1000). */
export function sliderToHours(value: number): number {
  return 10 ** (value / 1000);
}

/** Hours to slider value, the inverse of sliderToHours. */
export function hoursToSlider(hours: number): number {
  return Math.round(Math.log10(hours) * 1000);
}

/* Formatters. */

/** "1k h", "20k h", "100k h", "1M h". */
export function formatHours(hours: number): string {
  if (hours >= 1e6) return `${(hours / 1e6).toFixed(hours >= 1e7 ? 0 : 1)}M h`.replace('.0M', 'M');
  if (hours >= 1000) return `${Math.round(hours / 1000)}k h`;
  return `${Math.round(hours)} h`;
}

/** "0.0150": four decimals, the precision of the published equation. */
export function formatLoss(loss: number): string {
  return loss.toFixed(4);
}

/** "0.89": two decimals for completion scores. */
export function formatScore(score: number): string {
  return score.toFixed(2);
}
