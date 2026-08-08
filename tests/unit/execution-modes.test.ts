import { describe, expect, it } from 'vitest';
import {
  HANDOFF_TICK,
  JERK_LIMIT,
  MAX_DELAY_MS,
  TICK_MS,
  TRACE_TICKS,
  executedTrace,
  modeShift,
  oldPlanVelocity,
  passesJerkLimit,
  pauseTicks,
  peakDeltaV,
} from '@/lib/execution-modes';

const DELAYS = [0, 50, 100, 150, 200];

describe('executedTrace', () => {
  it('returns one point per controller tick for every mode', () => {
    for (const mode of ['synchronous', 'naive', 'rtc'] as const) {
      const trace = executedTrace(mode, 120);
      expect(trace).toHaveLength(TRACE_TICKS);
      expect(trace[0].tick).toBe(0);
      expect(trace.at(-1)?.tick).toBe(TRACE_TICKS - 1);
    }
  });

  it('follows the old plan before the hand-off in every mode', () => {
    for (const mode of ['synchronous', 'naive', 'rtc'] as const) {
      const trace = executedTrace(mode, 160);
      for (let t = 0; t < HANDOFF_TICK; t += 1) {
        expect(trace[t].v).toBeCloseTo(oldPlanVelocity(t), 6);
      }
    }
  });

  it('synchronous mode holds exactly zero velocity for the pause window', () => {
    const trace = executedTrace('synchronous', 100);
    const zeros = trace.filter((p) => p.v === 0).length;
    expect(zeros).toBe(pauseTicks(100));
    expect(pauseTicks(100) * TICK_MS).toBe(100);
  });

  it('naive mode jumps instantly by the mode shift at the hand-off', () => {
    const trace = executedTrace('naive', 200);
    const jump = trace[HANDOFF_TICK].v - trace[HANDOFF_TICK - 1].v;
    expect(jump).toBeGreaterThan(0.9);
    expect(modeShift(200)).toBeCloseTo(1.0, 6);
  });

  it('rtc mode never jumps harder than the blend allows', () => {
    const trace = executedTrace('rtc', 200);
    expect(peakDeltaV(trace)).toBeLessThan(JERK_LIMIT);
  });
});

describe('jerk-limit verdicts', () => {
  it('naive switching exceeds the limit at and beyond 100 ms', () => {
    expect(passesJerkLimit('naive', 0)).toBe(true);
    expect(passesJerkLimit('naive', 50)).toBe(true);
    expect(passesJerkLimit('naive', 100)).toBe(false);
    expect(passesJerkLimit('naive', MAX_DELAY_MS)).toBe(false);
  });

  it('rtc stays within the limit across the full 0-200 ms range', () => {
    for (const d of DELAYS) {
      expect(passesJerkLimit('rtc', d)).toBe(true);
    }
  });

  it('synchronous stays within the limit but pays dead time', () => {
    for (const d of DELAYS) {
      expect(passesJerkLimit('synchronous', d)).toBe(true);
    }
    expect(pauseTicks(200) * TICK_MS).toBe(200);
    expect(pauseTicks(0)).toBe(0);
  });
});

describe('peakDeltaV', () => {
  it('is the maximum per-tick velocity step', () => {
    const trace = [
      { tick: 0, v: 0.1 },
      { tick: 1, v: 0.4 },
      { tick: 2, v: 0.2 },
    ];
    expect(peakDeltaV(trace)).toBeCloseTo(0.3, 6);
  });
});
