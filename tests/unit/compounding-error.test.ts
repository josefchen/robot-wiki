import { describe, expect, it } from 'vitest';
import {
  accumulatedCost,
  bcBound,
  DAGGER_INTERVAL,
  daggerBound,
  expertY,
  simulateDeviation,
} from '@/lib/compounding-error';

describe('regret bounds', () => {
  it('bcBound is the quadratic bound epsilon * t * (t + 1) / 2', () => {
    expect(bcBound(0.1, 10)).toBeCloseTo(0.1 * 55);
    expect(bcBound(0.05, 100)).toBeCloseTo(0.05 * 5050);
  });

  it('daggerBound is the linear bound epsilon * t', () => {
    expect(daggerBound(0.1, 10)).toBeCloseTo(1);
    expect(daggerBound(0.05, 100)).toBeCloseTo(5);
  });

  it('the bounds agree at t = 1 and diverge after', () => {
    expect(bcBound(0.07, 1)).toBeCloseTo(daggerBound(0.07, 1));
    expect(bcBound(0.07, 50)).toBeGreaterThan(daggerBound(0.07, 50));
  });

  it('bcBound grows superlinearly in t', () => {
    // Doubling the horizon more than doubles the bound.
    expect(bcBound(0.05, 200)).toBeGreaterThan(2 * bcBound(0.05, 100));
  });
});

describe('expertY', () => {
  it('is deterministic and bounded', () => {
    expect(expertY(7)).toBe(expertY(7));
    for (let t = 0; t < 500; t += 1) {
      expect(Math.abs(expertY(t))).toBeLessThanOrEqual(1);
    }
  });
});

describe('simulateDeviation', () => {
  it('returns steps + 1 samples starting at zero', () => {
    const d = simulateDeviation({
      epsilon: 0.05,
      steps: 120,
      mode: 'per-step',
      chunkSize: 25,
      dagger: false,
    });
    expect(d).toHaveLength(121);
    expect(d[0]).toBe(0);
  });

  it('is deterministic', () => {
    const params = {
      epsilon: 0.08,
      steps: 90,
      mode: 'per-step' as const,
      chunkSize: 25,
      dagger: true,
    };
    expect(simulateDeviation(params)).toEqual(simulateDeviation(params));
  });

  it('stays finite and non-negative across the parameter grid', () => {
    for (const epsilon of [0.005, 0.05, 0.15]) {
      for (const steps of [10, 120, 240]) {
        for (const mode of ['per-step', 'chunk'] as const) {
          for (const dagger of [false, true]) {
            const d = simulateDeviation({
              epsilon,
              steps,
              mode,
              chunkSize: 25,
              dagger,
            });
            for (const v of d) {
              expect(Number.isFinite(v)).toBe(true);
              expect(v).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  it('grows monotonically without DAgger and sawtooths with it', () => {
    const base = {
      epsilon: 0.05,
      steps: 120,
      mode: 'per-step' as const,
      chunkSize: 25,
    };
    const plain = simulateDeviation({ ...base, dagger: false });
    for (let t = 1; t < plain.length; t += 1) {
      expect(plain[t]).toBeGreaterThanOrEqual(plain[t - 1]);
    }
    const corrected = simulateDeviation({ ...base, dagger: true });
    // A correction step visibly pulls the deviation back down.
    expect(corrected[DAGGER_INTERVAL]).toBeLessThan(
      corrected[DAGGER_INTERVAL - 1],
    );
  });

  it('per-step cost increases monotonically with epsilon', () => {
    let previous = 0;
    for (const epsilon of [0.01, 0.03, 0.05, 0.1, 0.15]) {
      const cost = accumulatedCost(
        simulateDeviation({
          epsilon,
          steps: 120,
          mode: 'per-step',
          chunkSize: 25,
          dagger: false,
        }),
      );
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
    }
  });

  it('per-step cost increases monotonically with horizon', () => {
    let previous = 0;
    for (const steps of [20, 60, 120, 240]) {
      const cost = accumulatedCost(
        simulateDeviation({
          epsilon: 0.05,
          steps,
          mode: 'per-step',
          chunkSize: 25,
          dagger: false,
        }),
      );
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
    }
  });

  it('chunked prediction is strictly lower than per-step at identical settings', () => {
    for (const epsilon of [0.01, 0.05, 0.15]) {
      for (const steps of [10, 50, 120, 240]) {
        for (const chunkSize of [2, 10, 25, 50]) {
          const perStep = accumulatedCost(
            simulateDeviation({
              epsilon,
              steps,
              mode: 'per-step',
              chunkSize,
              dagger: false,
            }),
          );
          const chunked = accumulatedCost(
            simulateDeviation({
              epsilon,
              steps,
              mode: 'chunk',
              chunkSize,
              dagger: false,
            }),
          );
          expect(
            chunked,
            `eps=${epsilon} T=${steps} k=${chunkSize}`,
          ).toBeLessThan(perStep);
        }
      }
    }
  });

  it('DAgger corrections strictly lower the accumulated cost', () => {
    for (const epsilon of [0.01, 0.05, 0.15]) {
      for (const mode of ['per-step', 'chunk'] as const) {
        const plain = accumulatedCost(
          simulateDeviation({
            epsilon,
            steps: 120,
            mode,
            chunkSize: 25,
            dagger: false,
          }),
        );
        const corrected = accumulatedCost(
          simulateDeviation({
            epsilon,
            steps: 120,
            mode,
            chunkSize: 25,
            dagger: true,
          }),
        );
        expect(corrected, `eps=${epsilon} mode=${mode}`).toBeLessThan(plain);
      }
    }
  });
});

describe('accumulatedCost', () => {
  it('sums absolute deviations', () => {
    expect(accumulatedCost([0, 1, 2, 3])).toBe(6);
    expect(accumulatedCost([])).toBe(0);
  });
});
