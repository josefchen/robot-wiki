/**
 * Denoising-loop math for the Diffusion Policy interactive. Pure functions,
 * unit-tested in tests/unit/denoising.test.ts.
 *
 * This is an illustrative pedagogical model, not a reimplementation of the
 * DDPM sampler. Samples start as Gaussian noise in a 2D action space and are
 * transported toward two demonstration modes (the multimodality that MSE
 * heads collapse and diffusion heads preserve, arXiv:2303.04137). The number
 * of steps matches the paper's DDIM inference schedule: 10.
 */

export interface ActionPoint {
  x: number;
  y: number;
}

export interface ModeSample extends ActionPoint {
  /** Index into MODE_CENTERS: which demonstration mode this sample lands in. */
  mode: number;
}

export interface DenoisingTrajectory {
  /** Initial Gaussian cloud (step 0). */
  noise: ActionPoint[];
  /** Final sample positions clustered on the modes (last step). */
  targets: ModeSample[];
}

/** The two demonstration modes in the 2D action-space view. */
export const MODE_CENTERS: ReadonlyArray<ActionPoint> = [
  { x: -1.1, y: 0.55 },
  { x: 1.15, y: -0.5 },
];

/** Standard deviation of a mode cluster (the spread that remains at the end). */
export const MODE_SPREAD = 0.22;

/** Standard deviation of the initial Gaussian noise cloud. */
export const NOISE_SPREAD = 1.0;

/** DDIM inference steps in the published Diffusion Policy configuration. */
export const DENOISING_STEPS = 10;

export const SAMPLE_COUNT = 60;

/** mulberry32: tiny deterministic PRNG so the render is identical on reload. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller Gaussian sample from a uniform PRNG. */
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), Number.EPSILON);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Deterministic cloud: `count` noise points and one target per point. Each
 * target sits on one of the two modes with equal probability, matching how a
 * multimodal demonstration set splits across strategies.
 */
export function generateDenoisingTrajectory(
  seed = 20230304,
  count = SAMPLE_COUNT,
): DenoisingTrajectory {
  const rand = mulberry32(seed);
  const noise: ActionPoint[] = [];
  const targets: ModeSample[] = [];
  for (let i = 0; i < count; i += 1) {
    noise.push({
      x: gaussian(rand) * NOISE_SPREAD,
      y: gaussian(rand) * NOISE_SPREAD,
    });
    const mode = rand() < 0.5 ? 0 : 1;
    const center = MODE_CENTERS[mode];
    targets.push({
      x: center.x + gaussian(rand) * MODE_SPREAD,
      y: center.y + gaussian(rand) * MODE_SPREAD,
      mode,
    });
  }
  return { noise, targets };
}

/**
 * Convergence fraction at `step` of `totalSteps`: 0 at the start, 1 at the
 * end, smoothstep in between so intermediate steps show progressive
 * convergence (coarse movement early, refinement late).
 */
export function convergenceAlpha(step: number, totalSteps: number): number {
  const total = Math.max(1, Math.round(totalSteps));
  const s = Math.min(total, Math.max(0, Math.round(step) || 0));
  const t = s / total;
  return t * t * (3 - 2 * t);
}

/** Sample positions at a denoising step (clamped to [0, DENOISING_STEPS]). */
export function samplesAtStep(
  trajectory: DenoisingTrajectory,
  step: number,
): ModeSample[] {
  const clamped = Number.isNaN(step)
    ? 0
    : Math.min(DENOISING_STEPS, Math.max(0, Math.round(step)));
  if (clamped <= 0) {
    return trajectory.noise.map((n, i) => ({
      ...n,
      mode: trajectory.targets[i].mode,
    }));
  }
  if (clamped >= DENOISING_STEPS) {
    return trajectory.targets;
  }
  const a = convergenceAlpha(clamped, DENOISING_STEPS);
  return trajectory.noise.map((n, i) => {
    const target = trajectory.targets[i];
    return {
      x: n.x + (target.x - n.x) * a,
      y: n.y + (target.y - n.y) * a,
      mode: target.mode,
    };
  });
}

/** Mean distance of samples to their assigned mode center. */
export function meanDistanceToMode(samples: ModeSample[]): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const s of samples) {
    const center = MODE_CENTERS[s.mode];
    total += Math.hypot(s.x - center.x, s.y - center.y);
  }
  return total / samples.length;
}
