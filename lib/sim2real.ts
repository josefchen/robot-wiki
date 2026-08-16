/**
 * Models for the sim2real-transfer module interactives. Pure functions and
 * constants, unit-tested in tests/unit/sim2real.test.ts.
 *
 * Two models live here:
 *
 * 1. Friction domain randomization. Success rate against ground friction for
 *    two policies: one trained at a single friction coefficient (a tall,
 *    narrow spike) and one trained over a uniform distribution of frictions
 *    (a lower, wider plateau). The peak-versus-width trade and the
 *    over-randomization cost (widening the range lowers the peak) are the
 *    teaching points; both curves are illustrative, labeled as such in the
 *    UI, and consistent with the robustness/performance trade described in
 *    the reality-gap survey (arXiv:2510.20808) and the DR literature
 *    (arXiv:1710.06537).
 *
 * 2. Teacher-student privileged distillation. A deterministic terrain
 *    heightfield plays the role of the teacher's privileged observation; the
 *    student reconstructs it from a proprioceptive history that degrades
 *    under noise and occlusion. The reconstruction error and the resulting
 *    teacher-student action divergence are strictly increasing in the
 *    degradation control by construction, mirroring the information-capacity
 *    mismatch named in the Isaac Lab paper (arXiv:2511.04831).
 *
 * Determinism: no Math.random anywhere; pseudo-random fields come from a
 * seeded LCG at module load, and all rendered values are rounded so SSR HTML
 * and client hydration serialize identically.
 */

/* ------------------------------------------------------------------ */
/* Friction domain randomization                                       */
/* ------------------------------------------------------------------ */

/** Friction axis bounds (unitless coefficient of friction). */
export const MU_MIN = 0.2;
export const MU_MAX = 1.5;

/** Friction the point-trained policy saw in training, and default line spot. */
export const MU_TRAIN = 0.8;
export const DEFAULT_REAL_MU = MU_TRAIN;

/** Half-width bounds for the uniform randomization range, and its default. */
export const DR_RANGE_MIN = 0.1;
export const DR_RANGE_MAX = 0.65;
export const DEFAULT_DR_RANGE = 0.35;

/** Peak success of the point-trained policy at its training friction. */
export const POINT_PEAK = 0.97;
/** Gaussian width of the point policy's spike. */
export const POINT_SIGMA = 0.09;
/** Rolloff width of the DR plateau beyond its training range. */
export const EDGE_SIGMA = 0.1;

/** Success rate of the point-trained policy at friction mu. */
export function pointSuccess(mu: number): number {
  const d = mu - MU_TRAIN;
  return POINT_PEAK * Math.exp(-(d * d) / (2 * POINT_SIGMA * POINT_SIGMA));
}

/**
 * Peak success of the DR-trained policy. Wider randomization buys coverage at
 * the cost of peak performance: the policy is optimal for none of the
 * frictions it trained on, so the plateau sinks as the range widens.
 */
export function drPeak(range: number): number {
  return 0.93 - 0.55 * range;
}

/** Success rate of the DR-trained policy at friction mu. */
export function drSuccess(mu: number, range: number): number {
  const peak = drPeak(range);
  const d = Math.abs(mu - MU_TRAIN);
  if (d <= range) return peak;
  const excess = d - range;
  return peak * Math.exp(-(excess * excess) / (2 * EDGE_SIGMA * EDGE_SIGMA));
}

export interface FrictionPoint {
  mu: number;
  success: number;
}

/** Linearly spaced samples of the point-policy curve for the SVG polyline. */
export function pointCurvePoints(samples = 65): FrictionPoint[] {
  const points: FrictionPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const mu = MU_MIN + (i / (samples - 1)) * (MU_MAX - MU_MIN);
    points.push({
      mu: Number(mu.toFixed(4)),
      success: Number(pointSuccess(mu).toFixed(4)),
    });
  }
  return points;
}

/** Linearly spaced samples of the DR-policy curve at a given range. */
export function drCurvePoints(range: number, samples = 65): FrictionPoint[] {
  const points: FrictionPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const mu = MU_MIN + (i / (samples - 1)) * (MU_MAX - MU_MIN);
    points.push({
      mu: Number(mu.toFixed(4)),
      success: Number(drSuccess(mu, range).toFixed(4)),
    });
  }
  return points;
}

/** "0.80": two-decimal friction for readouts. */
export function formatMu(mu: number): string {
  return mu.toFixed(2);
}

/** "74%": whole-percent success for readouts. */
export function formatPct(success: number): string {
  return `${Math.round(success * 100)}%`;
}

/* ------------------------------------------------------------------ */
/* Teacher-student privileged distillation                             */
/* ------------------------------------------------------------------ */

/** Number of terrain cells and proprioceptive channels rendered. */
export const TERRAIN_CELLS = 24;

/** Default degradation: low but nonzero, so the mismatch is visible on load. */
export const DEFAULT_DEGRADATION = 0.15;

/** Deterministic LCG so noise fields are stable across SSR and hydration. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * The privileged terrain heightfield, in meters. A sum of sines plus a step,
 * computed once: no randomness, fully deterministic.
 */
export const TERRAIN: number[] = Array.from({ length: TERRAIN_CELLS }, (_, i) =>
  Number(
    (
      0.08 * Math.sin(i * 0.5) +
      0.045 * Math.sin(i * 1.27 + 0.8) +
      (i >= 14 ? 0.05 : 0) -
      (i >= 5 && i < 9 ? 0.04 : 0)
    ).toFixed(4),
  ),
);

export const TERRAIN_MIN = Math.min(...TERRAIN);
export const TERRAIN_MAX = Math.max(...TERRAIN);

/** Noise field in [-1, 1], one value per channel. */
const NOISE: number[] = (() => {
  const rand = lcg(123456789);
  return Array.from({ length: TERRAIN_CELLS }, () =>
    Number((rand() * 2 - 1).toFixed(4)),
  );
})();

/**
 * Per-channel occlusion thresholds in [0, 1): a channel drops out once the
 * degradation control passes its threshold.
 */
const OCCLUSION_KEY: number[] = (() => {
  const rand = lcg(987654321);
  return Array.from({ length: TERRAIN_CELLS }, () => Number(rand().toFixed(4)));
})();

/** Gaussian-blurred terrain (sigma 3 cells): the full-degradation blur target. */
const BLURRED: number[] = (() => {
  const sigma = 3;
  const offsets: number[] = [];
  const weights: number[] = [];
  for (let o = -6; o <= 6; o++) {
    offsets.push(o);
    weights.push(Math.exp(-(o * o) / (2 * sigma * sigma)));
  }
  return TERRAIN.map((_, i) => {
    let sum = 0;
    let wsum = 0;
    for (let k = 0; k < offsets.length; k++) {
      const j = i + offsets[k];
      if (j < 0 || j >= TERRAIN_CELLS) continue;
      sum += TERRAIN[j] * weights[k];
      wsum += weights[k];
    }
    return sum / wsum;
  });
})();

/**
 * Per-cell reconstruction error at full degradation, in meters. Blur error
 * plus a noise term; occluded channels add a further same-sign error so the
 * absolute error per cell is exactly additive. That additivity is what makes
 * the mean absolute error strictly increasing in the degradation control.
 */
function cellError(i: number, degradation: number): number {
  const blurError = BLURRED[i] - TERRAIN[i];
  const noiseError = 0.06 * NOISE[i];
  const base = blurError + noiseError;
  const sign = base >= 0 ? 1 : -1;
  const occlusion = OCCLUSION_KEY[i] < degradation ? 0.12 * sign : 0;
  return degradation * (base + occlusion);
}

/** The student's reconstructed terrain estimate at a degradation level. */
export function reconstruction(degradation: number): number[] {
  return TERRAIN.map((h, i) =>
    Number((h + cellError(i, degradation)).toFixed(4)),
  );
}

/** Mean absolute terrain reconstruction error, in meters. */
export function reconstructionMae(degradation: number): number {
  let sum = 0;
  for (let i = 0; i < TERRAIN_CELLS; i++) {
    sum += Math.abs(cellError(i, degradation));
  }
  return sum / TERRAIN_CELLS;
}

/**
 * Teacher-student action divergence, in normalized action units. State
 * estimation error maps to action error: the student acts on a wrong belief
 * about what is under the feet. Strictly increasing in degradation.
 */
export function actionDivergence(degradation: number): number {
  return reconstructionMae(degradation) * 2.2;
}

/** Which proprioceptive channels have dropped out at this degradation. */
export function occludedCells(degradation: number): boolean[] {
  return OCCLUSION_KEY.map((k) => k < degradation);
}

/**
 * Proprioceptive history readings in [0, 1]-ish units (normalized foot
 * heights), clean at zero degradation and noisier above it. Occluded channels
 * still return a value here; the component renders them as dropped using
 * occludedCells.
 */
export function proprioReadings(degradation: number): number[] {
  const span = TERRAIN_MAX - TERRAIN_MIN;
  return TERRAIN.map((h, i) => {
    const base = (h - TERRAIN_MIN) / span;
    return Number((base + degradation * 0.45 * NOISE[i]).toFixed(4));
  });
}

/**
 * Grayscale for a terrain height: low cells dark, high cells light, mapped
 * between the surface-2 and text tokens so teacher and reconstruction panels
 * read as the same kind of map.
 */
export function terrainColor(height: number): string {
  const t = (height - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN);
  const ch = (a: number, b: number) => Math.round(a + t * (b - a));
  return `rgb(${ch(24, 232)}, ${ch(28, 234)}, ${ch(31, 236)})`;
}

/** "0.07 m": two-decimal meters for the MAE readout. */
export function formatMeters(v: number): string {
  return `${v.toFixed(2)} m`;
}

/** "0.31": two-decimal action divergence for the readout. */
export function formatDivergence(v: number): string {
  return v.toFixed(2);
}
