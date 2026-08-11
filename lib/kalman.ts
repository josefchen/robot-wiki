/**
 * Constant-velocity Kalman filter over a seeded wandering target, powering
 * the state-estimation module's tracking interactive. Pure functions,
 * unit-tested in tests/unit/kalman.test.ts.
 *
 * The world (true trajectory, measurement stream, dropouts) is generated
 * once per seed with a fixed-seed PRNG, so a run is exactly reproducible:
 * the same seed always yields the same truth and the same measurements.
 * The filter itself is deterministic linear algebra over that world given
 * the user's assumed noise levels, so "same seed + same sliders + same
 * step" always renders the same estimate and the same uncertainty band.
 *
 * Model (dt = 1 per step):
 *
 *   truth:  a damped oscillator driven by seeded Gaussian acceleration
 *           noise (a wandering target that stays on screen), measured by a
 *           position sensor with seeded Gaussian noise and random dropouts.
 *   filter: constant-velocity, F = [[1, 1], [0, 1]], H = [1, 0],
 *           Q = sigmaQ^2 * G G' with G = [0.5, 1], R = sigmaR^2.
 *
 * The sliders set what the filter BELIEVES about the noise (sigmaQ, sigmaR);
 * the world's actual noise (SIGMA_A_TRUE, SIGMA_R_TRUE) is fixed. The
 * defaults are matched, so the default run is a well-tuned filter.
 *
 * References: Kalman's 1960 recursion (doi:10.1115/1.3662552) in the form
 * given by Thrun, Burgard, and Fox, Probabilistic Robotics, ch. 3.
 */

export interface KalmanSettings {
  /** Assumed process-noise std: per-step acceleration noise, filter belief. */
  sigmaQ: number;
  /** Assumed measurement-noise std: position sensor scatter, filter belief. */
  sigmaR: number;
}

/** Matched to the world's true noise levels (see the constants below). */
export const DEFAULT_SETTINGS: KalmanSettings = { sigmaQ: 0.2, sigmaR: 1.0 };
export const DEFAULT_SEED = 1;
export const MAX_STEPS = 600;
/**
 * The tracker's paused initial position. Not zero: at step 0 the chart
 * holds a single degenerate frame (no visible series or band), so the lab
 * opens mid-run with a readable trace and a visible uncertainty band.
 * Reset and Reseed both return here, so the initial state is known and
 * reproducible.
 */
export const INITIAL_STEP = 60;
/** How many trailing steps the chart shows at once. */
export const WINDOW = 120;
/** The plot's fixed vertical half-span in world units. */
export const Y_SPAN = 8;

/* World constants (fixed; the sliders never touch these). */
const SPRING = 0.04;
const DAMP = 0.18;
const SIGMA_A_TRUE = 0.2;
const SIGMA_R_TRUE = 1.0;
const DROPOUT = 0.2;

/* Filter constants. */
const P0_POS = 9;
const P0_VEL = 1;

export interface Episode {
  seed: number;
  steps: number;
  /** True position at each step; index 0 is the initial state. */
  truth: number[];
  /** True velocity at each step. */
  velocity: number[];
  /** Sensor reading at each step, or null when the sensor dropped out. */
  measurements: (number | null)[];
}

export interface FilterFrame {
  t: number;
  /** Posterior position estimate after this step. */
  est: number;
  /** Posterior velocity estimate after this step. */
  vel: number;
  /** 1-sigma position uncertainty (sqrt of the position variance). */
  sigma: number;
  /**
   * The position Kalman gain of the current prior: the gain fused at this
   * step when a measurement landed, or the gain a reading WOULD get right
   * now during a dropout. Always reflects the current beliefs, so the
   * readout responds to the noise sliders even on measurement-free steps.
   */
  gain: number;
  /** Whether a measurement was fused at this step. */
  hasMeasurement: boolean;
}

/** mulberry32: tiny deterministic PRNG so the render is identical on reload. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller over the seeded stream: two normals per uniform pair. */
function gaussian(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    while (u === 0) u = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * rand();
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
}

/**
 * Generate the world for a seed: the true wandering trajectory plus the
 * sensor stream. Pure in (seed, steps); this is the reseed/reset contract.
 * The default length covers a full run: steps 0 through MAX_STEPS inclusive.
 */
export function generateEpisode(seed: number, steps = MAX_STEPS + 1): Episode {
  const n = Math.max(1, Math.floor(steps));
  const rand = mulberry32(seed);
  const randn = gaussian(rand);
  const truth: number[] = new Array<number>(n);
  const velocity: number[] = new Array<number>(n);
  const measurements: (number | null)[] = new Array<number | null>(n);

  let pos = randn() * 1.5;
  let vel = randn() * 0.5;
  truth[0] = pos;
  velocity[0] = vel;
  measurements[0] = rand() < DROPOUT ? null : pos + SIGMA_R_TRUE * randn();
  for (let t = 1; t < n; t++) {
    vel += -SPRING * pos - DAMP * vel + SIGMA_A_TRUE * randn();
    pos += vel;
    truth[t] = pos;
    velocity[t] = vel;
    measurements[t] = rand() < DROPOUT ? null : pos + SIGMA_R_TRUE * randn();
  }
  return { seed, steps: n, truth, velocity, measurements };
}

/**
 * Run the constant-velocity Kalman filter over the episode up to (and
 * including) step `upto`, returning one frame per step from 0. Pure in
 * (episode, settings, upto): changing a slider recomputes the whole run, so
 * the band and the estimate path always reflect the current beliefs.
 */
export function runFilter(
  ep: Episode,
  settings: KalmanSettings,
  upto: number,
): FilterFrame[] {
  const q = settings.sigmaQ * settings.sigmaQ;
  const r = settings.sigmaR * settings.sigmaR;
  const last = Math.min(Math.max(0, Math.floor(upto)), ep.steps - 1);

  // Prior at t = 0: centered at the origin with a wide position covariance.
  let x0 = 0;
  let x1 = 0;
  let p00 = P0_POS;
  let p01 = 0;
  let p11 = P0_VEL;

  const frames: FilterFrame[] = [];
  for (let t = 0; t <= last; t++) {
    if (t > 0) {
      // Predict: x = F x, P = F P F' + Q with G = [0.5, 1].
      x0 = x0 + x1;
      const np00 = p00 + 2 * p01 + p11 + q * 0.25;
      const np01 = p01 + p11 + q * 0.5;
      const np11 = p11 + q;
      p00 = np00;
      p01 = np01;
      p11 = np11;
    }
    const z = ep.measurements[t];
    // The gain belongs to the prior, not to the reading: S = H P H' + R,
    // K = P H' / S. Compute it every step so dropout frames still report
    // the gain a reading would get; fuse only when a measurement landed.
    const s = p00 + r;
    const k0 = p00 / s;
    if (z !== null) {
      // Update: x += K (z - H x), P -= K H P.
      const k1 = p01 / s;
      const innovation = z - x0;
      x0 += k0 * innovation;
      x1 += k1 * innovation;
      const np01 = p01 * (1 - k0);
      p00 = p00 * (1 - k0);
      p11 = p11 - k1 * p01;
      p01 = np01;
    }
    frames.push({
      t,
      est: x0,
      vel: x1,
      sigma: Math.sqrt(p00),
      gain: k0,
      hasMeasurement: z !== null,
    });
  }
  return frames;
}

/**
 * Root-mean-square error of the estimate against the truth over the frames
 * from index `from` onward. Callers pass the visible window's start.
 */
export function rmsError(
  frames: FilterFrame[],
  truth: number[],
  from = 0,
): number {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, from); i < frames.length; i++) {
    const e = frames[i].est - truth[frames[i].t];
    sum += e * e;
    count++;
  }
  return count === 0 ? 0 : Math.sqrt(sum / count);
}

/**
 * Playback cadence: small smooth steps by default; under reduced motion the
 * same wall-clock rate lands on the step grid in coarse jumps (no smooth
 * animation), matching the pendulum lab's interval-playback convention.
 */
export function playbackCadence(reducedMotion: boolean): {
  tickMs: number;
  stepsPerTick: number;
} {
  return reducedMotion
    ? { tickMs: 320, stepsPerTick: 4 }
    : { tickMs: 80, stepsPerTick: 1 };
}
