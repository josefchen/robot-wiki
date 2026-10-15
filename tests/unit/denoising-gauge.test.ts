import { describe, expect, it } from 'vitest';
import {
  COSINE_OFFSET,
  DENOISING_STEPS,
  GUESSES,
  MODES,
  PIN_COUNT,
  cleanEstimate,
  cleanUp,
  ddimStep,
  demonstrationWeights,
  distance,
  modeProfile,
  nearestMode,
  noiseOf,
  noisedMove,
  profileOf,
  signalLeft,
  stepTime,
} from '@/lib/denoising-gauge';
import { DIFFUSION_POLICY_HORIZON } from '@/lib/receding-horizon';

const ZERO = Array.from({ length: PIN_COUNT }, () => 0);

describe('the denoising gauge model', () => {
  it('plans the paper\'s 16 positions per move and cleans up in its 10 DDIM steps', () => {
    expect(PIN_COUNT).toBe(DIFFUSION_POLICY_HORIZON.tp);
    expect(PIN_COUNT).toBe(16);
    expect(DENOISING_STEPS).toBe(10);
    expect(stepTime(0)).toBe(1);
    expect(stepTime(DENOISING_STEPS)).toBe(0);
  });

  it('keeps the signal on improved DDPM\'s square-cosine schedule: all of it at 0, none at 1, falling in between', () => {
    expect(signalLeft(0)).toBe(1);
    expect(signalLeft(1)).toBe(0);
    const f = (u: number) => Math.cos(((u + COSINE_OFFSET) / (1 + COSINE_OFFSET)) * (Math.PI / 2)) ** 2;
    for (let k = 1; k < 100; k += 1) {
      const t = k / 100;
      expect(signalLeft(t)).toBeCloseTo(f(t) / f(0), 12);
      expect(signalLeft(t)).toBeLessThan(signalLeft(t - 0.01));
    }
  });

  it('draws two demonstrations that pass the bar, one arched over it and one sagged under it, and whose average runs straight into it', () => {
    const over = modeProfile('over');
    const under = modeProfile('under');
    expect(over).toHaveLength(PIN_COUNT);
    for (let i = 0; i < PIN_COUNT; i += 1) {
      expect(under[i]).toBe(-over[i]);
      expect(over[i]).toBeGreaterThan(0);
      // Symmetric about the bar, which crosses between pins 8 and 9.
      expect(over[i]).toBeCloseTo(over[PIN_COUNT - 1 - i], 9);
    }
    // Pins 8 and 9 stand either side of the bar, at the full arch.
    expect(over[7]).toBeGreaterThan(0.99);
    expect(over[8]).toBeGreaterThan(0.99);
    // The average of the two is a straight thread at the bar's height.
    expect(over.map((height, i) => (height + under[i]) / 2).every((height) => Math.abs(height) < 1e-9)).toBe(true);
  });

  it('noises a demonstration in training until nothing of it is left', () => {
    const noise = noiseOf(7);
    expect(noisedMove('over', noise, 0)).toEqual(profileOf('over'));
    expect(noisedMove('over', noise, 1)).toEqual(noise);
    for (const t of [0.2, 0.5, 0.8]) {
      const mixed = noisedMove('under', noise, t);
      const a = signalLeft(t);
      for (let i = 0; i < PIN_COUNT; i += 1) {
        expect(mixed[i]).toBeCloseTo(Math.sqrt(a) * profileOf('under')[i] + Math.sqrt(1 - a) * noise[i], 8);
      }
    }
  });

  it('weighs the two demonstrations equally in pure noise and picks one outright when no noise is left', () => {
    expect(demonstrationWeights(noiseOf(3), 0)).toEqual({ over: 0.5, under: 0.5 });
    // So the ideal denoiser first points at their average: straight through the bar.
    expect(cleanEstimate(noiseOf(3), 0).every((height) => Math.abs(height) < 1e-12)).toBe(true);
    expect(demonstrationWeights(profileOf('over'), 1)).toEqual({ over: 1, under: 0 });
    expect(demonstrationWeights(profileOf('under'), 1)).toEqual({ over: 0, under: 1 });
    const half = demonstrationWeights(noisedMove('over', noiseOf(4), 0.3), signalLeft(0.3));
    expect(half.over + half.under).toBeCloseTo(1, 12);
  });

  it('takes each clean-up step as deterministic DDIM with the ideal denoiser', () => {
    const states = cleanUp(noiseOf(60));
    expect(states).toHaveLength(DENOISING_STEPS + 1);
    expect(states[0]).toEqual(noiseOf(60));
    for (let done = 1; done <= DENOISING_STEPS; done += 1) {
      const a = signalLeft(stepTime(done - 1));
      const b = signalLeft(stepTime(done));
      const x = states[done - 1];
      const clean = cleanEstimate(x, a);
      const expected = x.map((value, i) => {
        const noise = (value - Math.sqrt(a) * clean[i]) / Math.sqrt(1 - a);
        return Math.sqrt(b) * clean[i] + Math.sqrt(1 - b) * noise;
      });
      states[done].forEach((value, i) => expect(value).toBeCloseTo(expected[i], 8));
      expect(ddimStep(x, stepTime(done - 1), stepTime(done))).toEqual(states[done]);
    }
  });

  it('lands every random guess on one of the two demonstrations, never on their average, and different guesses on different ones', () => {
    const landed = { over: 0, under: 0 };
    for (let seed = 1; seed <= 200; seed += 1) {
      const end = cleanUp(noiseOf(seed))[DENOISING_STEPS];
      const nearest = nearestMode(end);
      expect(nearest.distance, `seed ${seed}`).toBeLessThan(1e-6);
      expect(distance(end, ZERO), `seed ${seed}`).toBeGreaterThan(0.5);
      landed[nearest.mode] += 1;
    }
    expect(landed.over).toBeGreaterThan(50);
    expect(landed.under).toBeGreaterThan(50);
  });

  it('runs the scene\'s two guesses from seeds whose pins stay on the gauge, the front one landing under the bar and the back one over it', () => {
    expect(GUESSES.map(({ demo }) => demo).sort()).toEqual([...MODES].sort());
    const lands = GUESSES.map(({ seed }) => nearestMode(cleanUp(noiseOf(seed))[DENOISING_STEPS]).mode);
    expect(lands).toEqual(['under', 'over']);
    for (const { seed } of GUESSES) {
      for (const state of cleanUp(noiseOf(seed))) {
        for (const height of state) expect(Math.abs(height)).toBeLessThanOrEqual(1.9);
      }
    }
    // Each step brings the guess closer to where it lands.
    for (const { seed } of GUESSES) {
      const states = cleanUp(noiseOf(seed));
      const target = profileOf(nearestMode(states[DENOISING_STEPS]).mode);
      for (let done = 1; done <= DENOISING_STEPS; done += 1) {
        expect(distance(states[done], target)).toBeLessThan(distance(states[done - 1], target));
      }
    }
  });
});
