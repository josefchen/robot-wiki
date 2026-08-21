import { describe, expect, it } from 'vitest';
import {
  accumulatedCost,
  bcBound,
  DAGGER_INTERVAL,
  daggerBound,
  DEVIATION_AXIS_CEILING,
  DEVIATION_AXIS_TICKS,
  deviationAxisFraction,
  expertY,
  simulateDeviation,
} from '@/lib/compounding-error';

/** Accumulated deviation at horizon T, exactly as the chart plots it. */
function plottedCost(
  epsilon: number,
  steps: number,
  mode: 'per-step' | 'chunk',
  dagger = false,
): number {
  const deviation = simulateDeviation({
    epsilon,
    steps: 240,
    mode,
    chunkSize: 25,
    dagger,
  });
  let sum = 0;
  for (let t = 0; t <= steps; t += 1) sum += Math.abs(deviation[t]);
  return sum;
}

/** Marker height as a percentage of plot height, per VAL-MAN-067. */
function markerPercent(
  epsilon: number,
  steps: number,
  mode: 'per-step' | 'chunk' = 'per-step',
  dagger = false,
): number {
  return 100 * deviationAxisFraction(plottedCost(epsilon, steps, mode, dagger));
}

describe('deviationAxisFraction', () => {
  it('anchors zero at the baseline and the ceiling at the top gridline', () => {
    expect(deviationAxisFraction(0)).toBe(0);
    expect(deviationAxisFraction(DEVIATION_AXIS_CEILING)).toBeCloseTo(1, 12);
  });

  it('clamps outside the domain instead of drawing off-plot', () => {
    expect(deviationAxisFraction(-50)).toBe(0);
    expect(deviationAxisFraction(DEVIATION_AXIS_CEILING * 3)).toBeCloseTo(1, 12);
  });

  it('is strictly increasing across the plotted range', () => {
    let previous = -1;
    for (let v = 0; v <= DEVIATION_AXIS_CEILING; v += 25) {
      const f = deviationAxisFraction(v);
      expect(f).toBeGreaterThan(previous);
      previous = f;
    }
  });

  it('spends real height on the low decades, unlike the linear domain it replaces', () => {
    // The linear domain put 370.3 units at 8.1% of plot height. A
    // compressive axis has to lift that above the contract's 20% floor.
    expect(deviationAxisFraction(370.3)).toBeGreaterThan(0.2);
    // ... without collapsing the top of the range into the ceiling.
    expect(deviationAxisFraction(370.3)).toBeLessThan(
      deviationAxisFraction(1505.3),
    );
  });

  it('places every tick inside the plotted domain, ascending', () => {
    expect(DEVIATION_AXIS_TICKS[0]).toBe(0);
    expect(DEVIATION_AXIS_TICKS[DEVIATION_AXIS_TICKS.length - 1]).toBe(
      DEVIATION_AXIS_CEILING,
    );
    for (let i = 1; i < DEVIATION_AXIS_TICKS.length; i += 1) {
      expect(DEVIATION_AXIS_TICKS[i]).toBeGreaterThan(
        DEVIATION_AXIS_TICKS[i - 1],
      );
    }
  });

  it('holds the whole reachable range: nothing the sliders can plot clips', () => {
    for (const mode of ['per-step', 'chunk'] as const) {
      for (const dagger of [false, true]) {
        const worst = plottedCost(0.15, 240, mode, dagger);
        expect(worst).toBeLessThanOrEqual(DEVIATION_AXIS_CEILING);
      }
    }
    expect(bcBound(0.15, 240)).toBeLessThanOrEqual(DEVIATION_AXIS_CEILING);
  });
});

describe('VAL-MAN-067 marker-height bounds on the deviation axis', () => {
  it('(a) reads at least 20% of plot height at the article defaults', () => {
    expect(markerPercent(0.05, 120)).toBeGreaterThanOrEqual(20);
  });

  it('(b) drops at least 25% of plot height on the chunk-of-25 toggle', () => {
    const perStep = markerPercent(0.05, 120, 'per-step');
    const chunked = markerPercent(0.05, 120, 'chunk');
    expect(perStep - chunked).toBeGreaterThanOrEqual(25);
  });

  it('(c) rises strictly with per-step error, by at least 20% overall', () => {
    const samples = [0.025, 0.05, 0.1, 0.15].map((e) => markerPercent(e, 240));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
    expect(samples[samples.length - 1] - samples[0]).toBeGreaterThanOrEqual(20);
    // Every step the slider can take, not only the four contract samples.
    let previous = -1;
    for (let percent = 0.5; percent <= 15.0001; percent += 0.5) {
      const value = markerPercent(percent / 100, 240);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('(d) rises strictly with the horizon, by at least 20% overall', () => {
    const samples = [60, 120, 180, 240].map((t) => markerPercent(0.05, t));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
    expect(samples[samples.length - 1] - samples[0]).toBeGreaterThanOrEqual(20);
    let previous = -1;
    for (let steps = 20; steps <= 240; steps += 5) {
      const value = markerPercent(0.05, steps);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('(e) the seeded prediction-step mount clears both of its bounds', () => {
    expect(markerPercent(0.05, 240)).toBeGreaterThanOrEqual(20);
    expect(markerPercent(0.05, 240) - markerPercent(0.05, 120)).toBeGreaterThanOrEqual(20);
  });
});

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
