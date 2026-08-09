import { describe, expect, it } from 'vitest';
import {
  clampProbability,
  compoundingCurve,
  compoundedSuccessRate,
} from '@/lib/reliability';

describe('compoundedSuccessRate', () => {
  it('anchors the classic 95% over 30 steps example', () => {
    // 0.95^30 = 0.2146...: "95% per-step is unusable at 30 steps".
    expect(compoundedSuccessRate(0.95, 30)).toBeCloseTo(0.2146, 3);
  });

  it('returns the per-step rate for a single step', () => {
    expect(compoundedSuccessRate(0.8, 1)).toBeCloseTo(0.8, 10);
  });

  it('returns 1 at zero steps and at perfect per-step reliability', () => {
    expect(compoundedSuccessRate(0.5, 0)).toBe(1);
    expect(compoundedSuccessRate(1, 100)).toBe(1);
  });

  it('compounds to near zero for unreliable steps over long horizons', () => {
    expect(compoundedSuccessRate(0.5, 100)).toBeLessThan(1e-20);
  });

  it('clamps out-of-range probabilities instead of exploding', () => {
    expect(compoundedSuccessRate(1.5, 3)).toBe(1);
    expect(compoundedSuccessRate(-0.2, 3)).toBe(0);
  });
});

describe('compoundingCurve', () => {
  it('returns maxSteps + 1 points starting at 1', () => {
    const curve = compoundingCurve(0.9, 100);
    expect(curve).toHaveLength(101);
    expect(curve[0]).toBe(1);
    expect(curve[100]).toBeCloseTo(0.9 ** 100, 10);
  });

  it('is monotone non-increasing for probabilities in [0, 1]', () => {
    const curve = compoundingCurve(0.97, 60);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i]).toBeLessThanOrEqual(curve[i - 1]);
    }
  });

  it('is flat at 1 for a perfect per-step rate', () => {
    expect(compoundingCurve(1, 10).every((v) => v === 1)).toBe(true);
  });
});

describe('clampProbability', () => {
  it('passes through valid values and clamps the rest', () => {
    expect(clampProbability(0.5)).toBe(0.5);
    expect(clampProbability(2)).toBe(1);
    expect(clampProbability(-1)).toBe(0);
    expect(clampProbability(Number.NaN)).toBe(0);
  });
});

describe('boundary behavior (evaluation-crisis calculator contract)', () => {
  it('reads zero whole-task success at 0% per-step for any horizon >= 1', () => {
    for (const n of [1, 2, 30, 60, 100]) {
      expect(compoundedSuccessRate(0, n)).toBe(0);
    }
  });

  it('reads perfect whole-task success at 100% per-step at any horizon', () => {
    for (const n of [0, 1, 30, 60, 100]) {
      expect(compoundedSuccessRate(1, n)).toBe(1);
    }
  });

  it('reads exactly the per-step value at N=1', () => {
    expect(compoundedSuccessRate(0.734, 1)).toBeCloseTo(0.734, 12);
    expect(compoundedSuccessRate(0, 1)).toBe(0);
    expect(compoundedSuccessRate(1, 1)).toBe(1);
  });

  it('stays finite and within [0, 1] across the full control range', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      for (const n of [1, 5, 30, 60, 100]) {
        const v = compoundedSuccessRate(p, n);
        expect(Number.isNaN(v)).toBe(false);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
