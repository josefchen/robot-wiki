/**
 * The denoising gauge: the model behind the Diffusion Policy scene's pin
 * gauge (components/motion/scenes/diffusion-denoising.tsx). Pure functions,
 * unit-tested in tests/unit/denoising-gauge.test.ts.
 *
 * A move is a chunk of 16 planned positions, Diffusion Policy's prediction
 * horizon T_p (arXiv 2303.04137), drawn as 16 pins whose heights are the
 * positions. Two demonstrations pass a bar the camera sees: one arches over
 * it, one sags under it. Training noises a demonstration with the
 * square-cosine schedule of improved DDPM (arXiv 2102.09672) until nothing
 * of it is left; acting runs the 10 deterministic DDIM steps (arXiv
 * 2010.02502) the paper uses on real robots, from a seeded random guess.
 *
 * The denoiser is the ideal one for a training set of exactly these two
 * demonstrations: the average of the two, weighted by how likely each is to
 * have produced the current guess at this noise level. While the guess is
 * mostly noise the two weigh the same and the denoiser points at their
 * average, a path straight through the bar; every step lets the guess lean
 * further toward the nearer demonstration, and the last step lands on it
 * exactly. Different random guesses land on different demonstrations, never
 * on the average. This is an illustrative model of the sampler, not a
 * trained network.
 */
import { DENOISING_STEPS } from './denoising.ts';
import { DIFFUSION_POLICY_HORIZON } from './receding-horizon.ts';

/** Pins per move: the prediction horizon T_p. */
export const PIN_COUNT = DIFFUSION_POLICY_HORIZON.tp;

/** The clean-up steps a move takes when the robot acts. */
export { DENOISING_STEPS };

/** The square-cosine schedule's small offset s, from improved DDPM. */
export const COSINE_OFFSET = 0.008;

export type Mode = 'over' | 'under';
export const MODES: readonly Mode[] = ['over', 'under'];

/** Nine decimals: the rendered digits survive, and server and browser agree exactly. */
const Q = (value: number): number => Number(value.toFixed(9));

/**
 * The signal left in a noised move at noise time t in [0, 1] (alpha-bar):
 * 1 is the clean demonstration, 0 is pure noise.
 */
export function signalLeft(t: number): number {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  const f = (u: number) => Math.cos(((u + COSINE_OFFSET) / (1 + COSINE_OFFSET)) * (Math.PI / 2)) ** 2;
  return Math.min(1, Math.max(0, f(t) / f(0)));
}

/** A demonstration: pin heights in arch heights, 0 at the bar, rising to 1 (over) or falling to -1 (under) at the bar. */
export function modeProfile(mode: Mode): number[] {
  const sign = mode === 'over' ? 1 : -1;
  return Array.from({ length: PIN_COUNT }, (_, i) => Q(sign * Math.sin((Math.PI * (i + 1)) / (PIN_COUNT + 1)) ** 2));
}

const PROFILES: Record<Mode, number[]> = { over: modeProfile('over'), under: modeProfile('under') };

/** mulberry32: a tiny deterministic generator, so every render draws the same guesses. */
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

/** A seeded random guess: one standard normal per pin (Box-Muller). */
export function noiseOf(seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: PIN_COUNT }, () => {
    const u = Math.max(rand(), Number.EPSILON);
    const v = rand();
    return Q(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  });
}

/** Forward noising for training: the demonstration with noise mixed in at time t. */
export function noisedMove(mode: Mode, noise: readonly number[], t: number): number[] {
  const keep = Math.sqrt(signalLeft(t));
  const add = Math.sqrt(1 - signalLeft(t));
  return PROFILES[mode].map((height, i) => Q(keep * height + add * noise[i]));
}

/** How likely each demonstration is to have produced x at this signal level, as weights summing to 1. */
export function demonstrationWeights(x: readonly number[], signal: number): Record<Mode, number> {
  if (signal <= 0) return { over: 0.5, under: 0.5 };
  if (signal >= 1) {
    const over = distance(x, PROFILES.over) <= distance(x, PROFILES.under) ? 1 : 0;
    return { over, under: 1 - over };
  }
  const root = Math.sqrt(signal);
  const energy = (mode: Mode) =>
    PROFILES[mode].reduce((sum, height, i) => sum + (x[i] - root * height) ** 2, 0) / (2 * (1 - signal));
  const gap = energy('over') - energy('under');
  // Logistic of the energy gap, written so neither branch overflows.
  const over = gap >= 0 ? Math.exp(-gap) / (1 + Math.exp(-gap)) : 1 / (1 + Math.exp(gap));
  return { over, under: 1 - over };
}

/** The ideal denoiser's estimate of the clean move: the demonstrations' weighted average. */
export function cleanEstimate(x: readonly number[], signal: number): number[] {
  const weight = demonstrationWeights(x, signal);
  return PROFILES.over.map((height, i) => weight.over * height + weight.under * PROFILES.under[i]);
}

/** One deterministic DDIM step from noise time `from` down to `to`. */
export function ddimStep(x: readonly number[], from: number, to: number): number[] {
  const a = signalLeft(from);
  const b = signalLeft(to);
  const clean = cleanEstimate(x, a);
  return x.map((value, i) => {
    const noise = a >= 1 ? 0 : (value - Math.sqrt(a) * clean[i]) / Math.sqrt(1 - a);
    return Q(Math.sqrt(b) * clean[i] + Math.sqrt(1 - b) * noise);
  });
}

/** Noise time after `done` of the clean-up steps. */
export const stepTime = (done: number): number => (DENOISING_STEPS - done) / DENOISING_STEPS;

/**
 * The robot acting: from the random guess, the pins after each clean-up
 * step. `states[0]` is the guess, `states[DENOISING_STEPS]` the finished move.
 */
export function cleanUp(noise: readonly number[]): number[][] {
  const states: number[][] = [noise.map(Q)];
  for (let done = 1; done <= DENOISING_STEPS; done += 1) {
    states.push(ddimStep(states[done - 1], stepTime(done - 1), stepTime(done)));
  }
  return states;
}

/** Root-mean-square gap between two moves, in arch heights. */
export function distance(a: readonly number[], b: readonly number[]): number {
  return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length);
}

/** The demonstration a move is nearest to, and how far it is from it. */
export function nearestMode(x: readonly number[]): { mode: Mode; distance: number } {
  const over = distance(x, PROFILES.over);
  const under = distance(x, PROFILES.under);
  return over <= under ? { mode: 'over', distance: over } : { mode: 'under', distance: under };
}

/** The demonstration's profile, for drawing and tests. */
export const profileOf = (mode: Mode): readonly number[] => PROFILES[mode];

/**
 * The two gauges the scene runs side by side: the demonstration each shows
 * in training, and the seed of the random guess each starts from when the
 * robot acts. Once the noise is complete a guess carries nothing of the
 * move it was made from, so where it lands depends on its seed alone: the
 * front guess (followed in the scene) lands under the bar, the back one
 * over it.
 */
export const GUESSES = [
  { seed: 60, demo: 'under' as Mode },
  { seed: 55, demo: 'over' as Mode },
] as const;
