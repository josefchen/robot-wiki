import { describe, expect, it } from 'vitest';
import {
  COMPOUNDING_GAIN,
  MAX_HORIZON,
  REWARD_ERROR_GAIN,
  TYPICAL_HORIZON,
  deviationAt,
  imagineDeviation,
  rewardPredictionError,
  trueLatent,
} from '@/lib/latent-imagination';

describe('latent-imagination model', () => {
  it('anchors the imagination range to the published 3-15 step horizons', () => {
    // TD-MPC2 plans 3 steps ahead; DreamerV3 imagines 15-step rollouts.
    expect(TYPICAL_HORIZON).toEqual([3, 15]);
    expect(MAX_HORIZON).toBeGreaterThanOrEqual(TYPICAL_HORIZON[1]);
  });

  it('returns horizon + 1 samples starting at zero deviation', () => {
    const d = imagineDeviation({ epsilon: 0.02, horizon: 30 });
    expect(d).toHaveLength(31);
    expect(d[0]).toBe(0);
  });

  it('is strictly increasing while the model errs', () => {
    const d = imagineDeviation({ epsilon: 0.02, horizon: 50 });
    for (let t = 1; t <= 50; t += 1) {
      expect(d[t]).toBeGreaterThan(d[t - 1]);
    }
  });

  it('error compounds superlinearly once the rollout has drifted', () => {
    // With amplification epsilon * (1 + gain * d), late increments exceed
    // early increments, so the curve bends upward.
    const d = imagineDeviation({ epsilon: 0.05, horizon: 50 });
    expect(COMPOUNDING_GAIN).toBeGreaterThan(0);
    const early = d[5] - d[0];
    const late = d[50] - d[45];
    expect(late).toBeGreaterThan(early);
  });

  it('deviation at the horizon grows monotonically with the horizon', () => {
    const short = deviationAt({ epsilon: 0.02, horizon: 5 });
    const mid = deviationAt({ epsilon: 0.02, horizon: 15 });
    const long = deviationAt({ epsilon: 0.02, horizon: 50 });
    expect(mid).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(mid);
  });

  it('a more accurate model deviates less at the same horizon', () => {
    const sloppy = deviationAt({ epsilon: 0.06, horizon: 30 });
    const careful = deviationAt({ epsilon: 0.01, horizon: 30 });
    expect(careful).toBeLessThan(sloppy);
    expect(careful).toBeGreaterThan(0);
  });

  it('a perfect model never deviates', () => {
    expect(deviationAt({ epsilon: 0, horizon: 50 })).toBe(0);
  });

  it('reward prediction error tracks latent deviation monotonically', () => {
    expect(REWARD_ERROR_GAIN).toBeGreaterThan(0);
    const short = rewardPredictionError({ epsilon: 0.02, horizon: 5 });
    const long = rewardPredictionError({ epsilon: 0.02, horizon: 50 });
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(0);
    expect(rewardPredictionError({ epsilon: 0.02, horizon: 0 })).toBe(0);
  });

  it('is deterministic across calls', () => {
    const a = imagineDeviation({ epsilon: 0.03, horizon: 40 });
    const b = imagineDeviation({ epsilon: 0.03, horizon: 40 });
    expect(a).toEqual(b);
  });

  it('clamps out-of-range inputs instead of producing nonsense', () => {
    expect(deviationAt({ epsilon: 2, horizon: 10 })).toBeLessThanOrEqual(
      deviationAt({ epsilon: 1, horizon: 10 }) + 1e-9,
    );
    expect(imagineDeviation({ epsilon: 0.02, horizon: -5 })).toEqual([0]);
  });

  it('provides a smooth ground-truth latent path for the chart', () => {
    expect(trueLatent(0)).toBeCloseTo(0, 5);
    expect(Number.isFinite(trueLatent(50))).toBe(true);
    // The path is continuous: small steps move it by small amounts.
    expect(Math.abs(trueLatent(10) - trueLatent(10.01))).toBeLessThan(0.05);
  });
});
