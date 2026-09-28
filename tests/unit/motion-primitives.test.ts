import { describe, expect, it } from 'vitest';
import { laggedProgress } from '@/components/motion/primitives';
import {
  DIFFUSION_SCENE,
  diffusionSampleAt,
  diffusionStepAt,
} from '@/components/motion/scenes/diffusion-denoising';
import { beatSpans } from '@/components/motion/timeline';
import { MOTION_LAG } from '@/lib/motion-tokens';
import { DENOISING_STEPS, SAMPLE_COUNT, generateDenoisingTrajectory } from '@/lib/denoising';

describe('dense lagged forward noising', () => {
  const spans = beatSpans(DIFFUSION_SCENE.beats);
  const forward = spans[1];
  const trajectory = generateDenoisingTrajectory();
  const quantize = (value: number) => Number(value.toFixed(9));

  it('starts together at zero and reaches every noise draw continuously by one', () => {
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      expect(laggedProgress(0, i, SAMPLE_COUNT, MOTION_LAG.dense)).toBe(0);
      expect(laggedProgress(1, i, SAMPLE_COUNT, MOTION_LAG.dense)).toBe(1);
      expect(diffusionSampleAt(i, forward.start)).toEqual([
        quantize(trajectory.targets[i].x),
        quantize(trajectory.targets[i].y),
      ]);
      const noise = [
        quantize(trajectory.noise[i].x),
        quantize(trajectory.noise[i].y),
      ];
      expect(diffusionSampleAt(i, forward.end)).toEqual(noise);
      const justBefore = diffusionSampleAt(i, forward.end - 0.001);
      expect(Math.hypot(justBefore[0] - noise[0], justBefore[1] - noise[1]))
        .toBeLessThan(0.01);
    }
  });

  it('has ordered middle and near-end states without a boundary jump', () => {
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const middle = laggedProgress(0.5, i, SAMPLE_COUNT, MOTION_LAG.dense);
      const nearEnd = laggedProgress(0.95, i, SAMPLE_COUNT, MOTION_LAG.dense);
      expect(middle).toBeGreaterThanOrEqual(0);
      expect(middle).toBeLessThanOrEqual(nearEnd);
      expect(nearEnd).toBeLessThanOrEqual(1);
    }
    expect(laggedProgress(0.95, SAMPLE_COUNT - 1, SAMPLE_COUNT, MOTION_LAG.dense))
      .toBeGreaterThan(0.7);
    const last = SAMPLE_COUNT - 1;
    const at95 = diffusionSampleAt(last, forward.start + forward.duration * 0.95);
    const noise = diffusionSampleAt(last, forward.end);
    const clean = diffusionSampleAt(last, forward.start);
    expect(Math.hypot(at95[0] - noise[0], at95[1] - noise[1]))
      .toBeLessThan(Math.hypot(clean[0] - noise[0], clean[1] - noise[1]) * 0.3);
    expect(diffusionStepAt(spans[2].start + spans[2].duration * 0.5))
      .toBe(DENOISING_STEPS / 2);
  });
});
