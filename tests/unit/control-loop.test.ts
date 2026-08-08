import { describe, expect, it } from 'vitest';
import {
  CONTROL_PERIOD_MS,
  LATENCY_REFERENCES,
  MAX_PARAMS_B,
  MIN_PARAMS_B,
  clampParamsB,
  effectiveHz,
  inferenceMsOnThor,
  loopCloses,
  missedTicks,
} from '@/lib/control-loop';

describe('inferenceMsOnThor', () => {
  it('anchors to the VLA-Perf Jetson Thor measurements', () => {
    // arXiv:2602.18397: pi0 ~3B at 52.57 ms (19.0 Hz), pi0-L 9.1B at 3.9 Hz.
    expect(inferenceMsOnThor(3.0)).toBeCloseTo(52.57, 2);
    expect(inferenceMsOnThor(9.1)).toBeCloseTo(1000 / 3.9, 0);
  });

  it('scales linearly below the pi0 anchor (memory-bound regime)', () => {
    expect(inferenceMsOnThor(1.5)).toBeCloseTo(52.57 / 2, 2);
    expect(inferenceMsOnThor(0.5)).toBeCloseTo(52.57 / 6, 1);
  });

  it('is monotonic increasing in model size', () => {
    let prev = -Infinity;
    for (let b = MIN_PARAMS_B; b <= MAX_PARAMS_B; b += 0.1) {
      const ms = inferenceMsOnThor(b);
      expect(ms).toBeGreaterThan(prev);
      prev = ms;
    }
  });

  it('clamps out-of-range model sizes', () => {
    expect(clampParamsB(0.1)).toBe(MIN_PARAMS_B);
    expect(clampParamsB(42)).toBe(MAX_PARAMS_B);
    expect(clampParamsB(Number.NaN)).toBe(MIN_PARAMS_B);
    expect(inferenceMsOnThor(0.1)).toBe(inferenceMsOnThor(MIN_PARAMS_B));
  });
});

describe('50 Hz loop verdicts', () => {
  it('closes the loop at or under the 20 ms budget', () => {
    expect(CONTROL_PERIOD_MS).toBe(20);
    expect(loopCloses(20)).toBe(true);
    expect(loopCloses(8.76)).toBe(true);
    expect(loopCloses(20.01)).toBe(false);
    expect(loopCloses(52.57)).toBe(false);
  });

  it('counts missed deadlines after the first period', () => {
    expect(missedTicks(8.76)).toBe(0);
    expect(missedTicks(20)).toBe(0);
    expect(missedTicks(52.57)).toBe(2);
    expect(missedTicks(256.41)).toBe(12);
  });

  it('recovers the published 19 Hz for pi0 on Jetson Thor', () => {
    expect(effectiveHz(52.57)).toBeCloseTo(19.0, 1);
  });

  it('crosses the budget threshold as model size grows', () => {
    expect(loopCloses(inferenceMsOnThor(1.0))).toBe(true);
    expect(loopCloses(inferenceMsOnThor(3.0))).toBe(false);
    expect(loopCloses(inferenceMsOnThor(9.1))).toBe(false);
  });
});

describe('LATENCY_REFERENCES', () => {
  it('carries the sourced latency figures used on the page', () => {
    const byId = Object.fromEntries(LATENCY_REFERENCES.map((r) => [r.id, r]));
    expect(byId['pi0-thor'].ms).toBe(52.57);
    expect(byId['pi06-h100'].ms).toBe(63);
    expect(byId['rtc-static'].ms).toBe(108);
    expect(byId['rtc-mobile'].ms).toBe(139);
    expect(byId['pi07-tolerance'].ms).toBe(240);
  });

  it('every reference names its source citation id', () => {
    for (const ref of LATENCY_REFERENCES) {
      expect(ref.citationId.length).toBeGreaterThan(0);
    }
  });
});
