import { describe, expect, it } from 'vitest';
import { laggedProgress } from '@/components/motion/primitives';
import {
  DIFFUSION_SCENE,
  diffusionPinsAt,
  diffusionStepAt,
} from '@/components/motion/scenes/diffusion-denoising';
import { beatSpans } from '@/components/motion/timeline';
import { MOTION_LAG } from '@/lib/motion-tokens';
import { DENOISING_STEPS, GUESSES, PIN_COUNT, noiseOf, profileOf } from '@/lib/denoising-gauge';

describe('dense lagged forward noising', () => {
  const spans = beatSpans(DIFFUSION_SCENE.beats);
  const forward = spans[1];
  const quantize = (value: number) => Number(value.toFixed(9));
  const gap = (a: number[], b: number[]) => Math.hypot(...a.map((value, i) => value - b[i]));

  it('starts together at zero and reaches every noise draw continuously by one', () => {
    for (let i = 0; i < PIN_COUNT; i += 1) {
      expect(laggedProgress(0, i, PIN_COUNT, MOTION_LAG.dense)).toBe(0);
      expect(laggedProgress(1, i, PIN_COUNT, MOTION_LAG.dense)).toBe(1);
    }
    for (const lane of [0, 1] as const) {
      const { demo, seed } = GUESSES[lane];
      expect(diffusionPinsAt(lane, forward.start)).toEqual(profileOf(demo).map(quantize));
      const noise = noiseOf(seed).map(quantize);
      const justBefore = diffusionPinsAt(lane, forward.end - 0.001);
      expect(gap(justBefore, noise)).toBeLessThan(0.01);
      // At the boundary the clean-up starts from exactly that noise: no jump.
      expect(diffusionPinsAt(lane, forward.end)).toEqual(noise);
    }
  });

  it('has ordered middle and near-end states without a boundary jump', () => {
    for (let i = 0; i < PIN_COUNT; i += 1) {
      const middle = laggedProgress(0.5, i, PIN_COUNT, MOTION_LAG.dense);
      const nearEnd = laggedProgress(0.95, i, PIN_COUNT, MOTION_LAG.dense);
      expect(middle).toBeGreaterThanOrEqual(0);
      expect(middle).toBeLessThanOrEqual(nearEnd);
      expect(nearEnd).toBeLessThanOrEqual(1);
    }
    for (const lane of [0, 1] as const) {
      const at95 = diffusionPinsAt(lane, forward.start + forward.duration * 0.95);
      const noise = diffusionPinsAt(lane, forward.end);
      const clean = diffusionPinsAt(lane, forward.start);
      expect(gap(at95, noise)).toBeLessThan(gap(clean, noise) * 0.3);
      // The share of noise only grows through the beat.
      let previous = Infinity;
      for (let k = 0; k <= 20; k += 1) {
        const distance = gap(diffusionPinsAt(lane, forward.start + (forward.duration * k) / 20), noise);
        expect(distance).toBeLessThanOrEqual(previous + 1e-9);
        previous = distance;
      }
    }
    expect(diffusionStepAt(spans[2].start + spans[2].duration * 0.5))
      .toBe(DENOISING_STEPS / 2);
  });
});
