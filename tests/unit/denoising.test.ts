import { describe, expect, it } from 'vitest';
import {
  DENOISING_STEPS,
  MODE_CENTERS,
  convergenceAlpha,
  generateDenoisingTrajectory,
  meanDistanceToMode,
  samplesAtStep,
} from '@/lib/denoising';

describe('generateDenoisingTrajectory', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generateDenoisingTrajectory(42);
    const b = generateDenoisingTrajectory(42);
    expect(a).toEqual(b);
  });

  it('produces different clouds for different seeds', () => {
    const a = generateDenoisingTrajectory(1);
    const b = generateDenoisingTrajectory(2);
    expect(a.noise).not.toEqual(b.noise);
  });

  it('assigns every target to a real mode', () => {
    const cloud = generateDenoisingTrajectory(7);
    expect(cloud.noise.length).toBeGreaterThan(0);
    expect(cloud.targets.length).toBe(cloud.noise.length);
    for (const target of cloud.targets) {
      expect(target.mode).toBeGreaterThanOrEqual(0);
      expect(target.mode).toBeLessThan(MODE_CENTERS.length);
    }
  });

  it('populates both modes (the multimodality the method preserves)', () => {
    const cloud = generateDenoisingTrajectory(7);
    const modes = new Set(cloud.targets.map((t) => t.mode));
    expect(modes.size).toBe(MODE_CENTERS.length);
  });
});

describe('samplesAtStep', () => {
  const cloud = generateDenoisingTrajectory(7);

  it('starts at the noise cloud and ends at the action modes', () => {
    expect(samplesAtStep(cloud, 0)).toEqual(
      cloud.noise.map((p, i) => ({ ...p, mode: cloud.targets[i].mode })),
    );
    expect(samplesAtStep(cloud, DENOISING_STEPS)).toEqual(cloud.targets);
  });

  it('produces observably different clouds at step 0 and the final step', () => {
    expect(samplesAtStep(cloud, 0)).not.toEqual(
      samplesAtStep(cloud, DENOISING_STEPS),
    );
  });

  it('moves samples progressively between endpoints', () => {
    const early = samplesAtStep(cloud, 0);
    const mid = samplesAtStep(cloud, Math.floor(DENOISING_STEPS / 2));
    const late = samplesAtStep(cloud, DENOISING_STEPS);
    expect(mid).not.toEqual(early);
    expect(mid).not.toEqual(late);
  });

  it('converges: dispersion falls from dispersed noise to the mode spread', () => {
    const d0 = meanDistanceToMode(samplesAtStep(cloud, 0));
    const dMid = meanDistanceToMode(
      samplesAtStep(cloud, Math.floor(DENOISING_STEPS / 2)),
    );
    const dFinal = meanDistanceToMode(samplesAtStep(cloud, DENOISING_STEPS));
    expect(d0).toBeGreaterThan(1);
    expect(d0).toBeGreaterThan(dMid);
    expect(dMid).toBeGreaterThan(dFinal);
    // Final spread is the mode width, well under the initial noise distance.
    expect(dFinal).toBeLessThan(0.4);
  });

  it('clamps out-of-range steps to the endpoints', () => {
    expect(samplesAtStep(cloud, -3)).toEqual(samplesAtStep(cloud, 0));
    expect(samplesAtStep(cloud, 999)).toEqual(
      samplesAtStep(cloud, DENOISING_STEPS),
    );
    expect(samplesAtStep(cloud, Number.NaN)).toEqual(samplesAtStep(cloud, 0));
  });
});

describe('convergenceAlpha', () => {
  it('is 0 at step 0 and 1 at the final step', () => {
    expect(convergenceAlpha(0, DENOISING_STEPS)).toBe(0);
    expect(convergenceAlpha(DENOISING_STEPS, DENOISING_STEPS)).toBe(1);
  });

  it('is monotonically non-decreasing across the schedule', () => {
    let previous = 0;
    for (let s = 1; s <= DENOISING_STEPS; s += 1) {
      const value = convergenceAlpha(s, DENOISING_STEPS);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });
});
