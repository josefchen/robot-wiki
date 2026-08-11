import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  MAX_STEPS,
  generateEpisode,
  playbackCadence,
  rmsError,
  runFilter,
  type Episode,
} from '@/lib/kalman';

/**
 * The tracker interactive is a seeded constant-velocity Kalman filter on a
 * wandering 1D target. These tests pin the two properties the module's
 * assertions lean on: determinism (same seed, same world) and the
 * theoretically correct response of the covariance band and Kalman gain to
 * the assumed noise sliders.
 */

function lastUpdateFrame(ep: Episode, settings = DEFAULT_SETTINGS) {
  const frames = runFilter(ep, settings, ep.steps - 1);
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].hasMeasurement) return frames[i];
  }
  throw new Error('episode has no measurement frames');
}

describe('generateEpisode', () => {
  it('is deterministic: the same seed reproduces the identical world', () => {
    const a = generateEpisode(7);
    const b = generateEpisode(7);
    expect(a.truth).toEqual(b.truth);
    expect(a.velocity).toEqual(b.velocity);
    expect(a.measurements).toEqual(b.measurements);
  });

  it('different seeds produce different worlds', () => {
    const a = generateEpisode(1);
    const b = generateEpisode(2);
    expect(a.truth).not.toEqual(b.truth);
    expect(a.measurements).not.toEqual(b.measurements);
  });

  it('produces the requested number of steps, defaulting to a full run', () => {
    // A full run displays steps 0..MAX_STEPS, so the episode carries
    // MAX_STEPS + 1 samples.
    expect(generateEpisode(1).truth).toHaveLength(MAX_STEPS + 1);
    const short = generateEpisode(1, 50);
    expect(short.truth).toHaveLength(50);
    expect(short.measurements).toHaveLength(50);
  });

  it('keeps the true trajectory inside the rendered span across seeds', () => {
    // The component renders a fixed +/-8 unit window; the wandering target
    // is a damped, stochastically forced oscillator tuned to stay inside it.
    for (let seed = 1; seed <= 25; seed++) {
      const ep = generateEpisode(seed);
      for (const p of ep.truth) {
        expect(Math.abs(p)).toBeLessThanOrEqual(8);
      }
    }
  });

  it('measurement noise matches the advertised standard deviation', () => {
    const ep = generateEpisode(1);
    const errors: number[] = [];
    for (let t = 0; t < ep.steps; t++) {
      const z = ep.measurements[t];
      if (z !== null) errors.push(z - ep.truth[t]);
    }
    expect(errors.length).toBeGreaterThan(400);
    const mean = errors.reduce((s, e) => s + e, 0) / errors.length;
    const variance =
      errors.reduce((s, e) => s + (e - mean) ** 2, 0) / errors.length;
    // True measurement noise std is 1.0 by construction.
    expect(Math.sqrt(variance)).toBeGreaterThan(0.85);
    expect(Math.sqrt(variance)).toBeLessThan(1.15);
  });

  it('drops roughly one measurement in five', () => {
    const ep = generateEpisode(1);
    const dropped = ep.measurements.filter((m) => m === null).length;
    const rate = dropped / ep.steps;
    expect(rate).toBeGreaterThan(0.12);
    expect(rate).toBeLessThan(0.28);
  });
});

describe('runFilter math', () => {
  it('reproduces a hand-computed predict/update sequence exactly', () => {
    // Synthetic episode with hand-set measurements; the expected values
    // below were computed by hand from the constant-velocity recursion with
    // P0 = diag(9, 1), Q = sigmaQ^2 * [[0.25, 0.5], [0.5, 1]], R = sigmaR^2.
    const ep: Episode = {
      seed: 0,
      steps: 3,
      truth: [0, 0, 0],
      velocity: [0, 0, 0],
      measurements: [2, null, 3.5],
    };
    const frames = runFilter(ep, { sigmaQ: 0.5, sigmaR: 1 }, 2);
    expect(frames).toHaveLength(3);

    // t = 0: prior (0, 0), P0 = diag(9, 1), fuse z = 2.
    // S = 10, K = [0.9, 0], x = [1.8, 0], P00 = 0.9.
    expect(frames[0].hasMeasurement).toBe(true);
    expect(frames[0].gain).toBeCloseTo(0.9, 3);
    expect(frames[0].est).toBeCloseTo(1.8, 4);
    expect(frames[0].vel).toBeCloseTo(0, 4);
    expect(frames[0].sigma).toBeCloseTo(Math.sqrt(0.9), 3);

    // t = 1: predict only (measurement dropped). x = [1.8, 0],
    // P_pred = [[1.9625, 1.125], [1.125, 1.25]]. The reported gain is the
    // would-be gain of the current prior: 1.9625 / (1.9625 + 1).
    expect(frames[1].hasMeasurement).toBe(false);
    expect(frames[1].gain).toBeCloseTo(1.9625 / 2.9625, 3);
    expect(frames[1].est).toBeCloseTo(1.8, 4);
    expect(frames[1].sigma).toBeCloseTo(Math.sqrt(1.9625), 3);

    // t = 2: predict, then fuse z = 3.5. P_pred = [[5.525, 2.5], [2.5, 1.5]],
    // S = 6.525, K = [0.846743, 0.383142], innovation 1.7.
    expect(frames[2].hasMeasurement).toBe(true);
    expect(frames[2].gain).toBeCloseTo(5.525 / 6.525, 3);
    expect(frames[2].est).toBeCloseTo(1.8 + (5.525 / 6.525) * 1.7, 3);
    expect(frames[2].vel).toBeCloseTo((2.5 / 6.525) * 1.7, 3);
    expect(frames[2].sigma).toBeCloseTo(Math.sqrt(0.846743), 3);
  });

  it('tracks the truth better than the raw measurements do', () => {
    const ep = generateEpisode(DEFAULT_SEED);
    const frames = runFilter(ep, DEFAULT_SETTINGS, ep.steps - 1);
    const from = 100;
    const filtered = rmsError(frames, ep.truth, from);
    const rawFrames = frames
      .slice(from)
      .filter((f) => f.hasMeasurement)
      .map((f) => ({ ...f, est: ep.measurements[f.t] as number }));
    const raw = rmsError(rawFrames, ep.truth, from);
    // The target maneuvers, so the constant-velocity filter lags on turns:
    // the win over the raw sensor is real but modest, and the raw stream
    // stays at the sensor's own noise level.
    expect(filtered).toBeLessThan(raw);
    expect(filtered).toBeGreaterThan(0.5);
    expect(filtered).toBeLessThan(1.0);
    expect(raw).toBeGreaterThan(0.8);
    expect(raw).toBeLessThan(1.2);
  });

  it('widens the uncertainty band when either assumed noise increases', () => {
    const ep = generateEpisode(DEFAULT_SEED);
    const base = lastUpdateFrame(ep).sigma;
    const moreR = lastUpdateFrame(ep, { sigmaQ: 0.2, sigmaR: 2.5 }).sigma;
    const lessR = lastUpdateFrame(ep, { sigmaQ: 0.2, sigmaR: 0.3 }).sigma;
    const moreQ = lastUpdateFrame(ep, { sigmaQ: 0.8, sigmaR: 1.0 }).sigma;
    const lessQ = lastUpdateFrame(ep, { sigmaQ: 0.05, sigmaR: 1.0 }).sigma;
    expect(moreR).toBeGreaterThan(base);
    expect(lessR).toBeLessThan(base);
    expect(moreQ).toBeGreaterThan(base);
    expect(lessQ).toBeLessThan(base);
  });

  it('lowers the Kalman gain when the sensor is trusted less', () => {
    const ep = generateEpisode(DEFAULT_SEED);
    const base = lastUpdateFrame(ep).gain;
    const highR = lastUpdateFrame(ep, { sigmaQ: 0.2, sigmaR: 2.5 }).gain;
    const lowR = lastUpdateFrame(ep, { sigmaQ: 0.2, sigmaR: 0.3 }).gain;
    const highQ = lastUpdateFrame(ep, { sigmaQ: 0.8, sigmaR: 1.0 }).gain;
    expect(highR).toBeLessThan(base);
    expect(lowR).toBeGreaterThan(base);
    expect(highQ).toBeGreaterThan(base);
  });

  it('grows the covariance across measurement dropouts', () => {
    const ep = generateEpisode(DEFAULT_SEED);
    const frames = runFilter(ep, DEFAULT_SETTINGS, ep.steps - 1);
    // In the steady-state regime (t > 100) a dropout step carries a wider
    // band than the step before it: predict adds Q and no update trims it.
    let checked = 0;
    for (let t = 101; t < frames.length; t++) {
      if (!frames[t].hasMeasurement && frames[t - 1].hasMeasurement) {
        expect(frames[t].sigma).toBeGreaterThan(frames[t - 1].sigma);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('is a pure function of seed, settings, and step count', () => {
    const ep = generateEpisode(3);
    const a = runFilter(ep, { sigmaQ: 0.4, sigmaR: 1.4 }, 200);
    const b = runFilter(generateEpisode(3), { sigmaQ: 0.4, sigmaR: 1.4 }, 200);
    expect(a.map((f) => [f.est, f.sigma, f.gain])).toEqual(
      b.map((f) => [f.est, f.sigma, f.gain]),
    );
  });
});

describe('rmsError', () => {
  it('computes the root-mean-square tracking error over the window', () => {
    const ep = generateEpisode(1, 10);
    const frames = runFilter(ep, DEFAULT_SETTINGS, 9).map((f) => ({
      ...f,
      est: ep.truth[f.t] + (f.t % 2 === 0 ? 1 : -1),
    }));
    expect(rmsError(frames, ep.truth, 0)).toBeCloseTo(1, 6);
  });
});

describe('playbackCadence', () => {
  it('steps smoothly by default and in coarse jumps under reduced motion', () => {
    const normal = playbackCadence(false);
    const reduced = playbackCadence(true);
    expect(normal.stepsPerTick).toBe(1);
    expect(reduced.stepsPerTick).toBeGreaterThan(1);
    expect(reduced.tickMs).toBeGreaterThan(normal.tickMs);
  });
});
