import { describe, expect, it } from 'vitest';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  MODE_VALUE,
  TRACE_TICKS,
  clampDelay,
  ensembleCommitWeight,
  isValidModeAction,
  rtcHandoffTrace,
  rtcThroughput,
  teActionAtHandoff,
  teHandoffTrace,
  teStatus,
  teThroughput,
} from '@/lib/latency-chunking';

describe('clampDelay', () => {
  it('clamps to the slider bounds and handles NaN', () => {
    expect(clampDelay(-50)).toBe(MIN_DELAY_MS);
    expect(clampDelay(999)).toBe(MAX_DELAY_MS);
    expect(clampDelay(Number.NaN)).toBe(MIN_DELAY_MS);
    expect(clampDelay(120)).toBe(120);
  });
});

describe('ensembleCommitWeight', () => {
  it('starts at 1 with no delay (the newest chunk is fresh)', () => {
    expect(ensembleCommitWeight(0)).toBeCloseTo(1, 6);
  });

  it('decays toward 0.5 as staleness grows, never below', () => {
    let previous = ensembleCommitWeight(0);
    for (const d of [20, 50, 100, 150, 200, 240]) {
      const w = ensembleCommitWeight(d);
      expect(w).toBeLessThan(previous);
      expect(w).toBeGreaterThanOrEqual(0.5);
      previous = w;
    }
  });
});

describe('teActionAtHandoff', () => {
  it('executes the committed mode at zero delay', () => {
    expect(teActionAtHandoff(0)).toBeCloseTo(MODE_VALUE, 6);
    expect(isValidModeAction(teActionAtHandoff(0))).toBe(true);
  });

  it('leaves the valid mode between 100 and 200 ms of delay', () => {
    // Physical Intelligence documents temporal ensembling failing outright
    // at +100 ms and +200 ms (arXiv:2506.07339). The modeled averaged action
    // must land outside both valid modes inside that window.
    expect(isValidModeAction(teActionAtHandoff(100))).toBe(false);
    expect(isValidModeAction(teActionAtHandoff(200))).toBe(false);
  });

  it('approaches but never crosses the midpoint between modes', () => {
    // Averaging two modes converges to the 50/50 midpoint, not past it.
    for (const d of [150, 200, 240]) {
      expect(teActionAtHandoff(d)).toBeGreaterThan(0);
    }
  });
});

describe('teThroughput', () => {
  it('is full at zero delay and collapsed at high delay', () => {
    expect(teThroughput(0)).toBe(1);
    expect(teThroughput(200)).toBe(0);
    expect(teThroughput(240)).toBe(0);
  });

  it('is monotonically non-increasing across the slider range', () => {
    let previous = teThroughput(0);
    for (let d = 10; d <= MAX_DELAY_MS; d += 10) {
      const value = teThroughput(d);
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  it('collapses within the published 100 to 200 ms failure window', () => {
    // Still above zero just before the window, fully collapsed inside it.
    expect(teThroughput(50)).toBeGreaterThan(0);
    expect(teThroughput(150)).toBe(0);
  });
});

describe('rtcThroughput', () => {
  it('holds flat across the whole range (published: flat to +200 ms)', () => {
    for (let d = 0; d <= MAX_DELAY_MS; d += 20) {
      expect(rtcThroughput(d)).toBe(1);
    }
  });
});

describe('teStatus', () => {
  it('reports nominal, then degraded, then failed', () => {
    expect(teStatus(0)).toBe('nominal');
    expect(teStatus(200)).toBe('failed');
    expect(teStatus(240)).toBe('failed');
  });

  it('passes through degraded between nominal and failed', () => {
    const statuses = new Set<'nominal' | 'degraded' | 'failed'>();
    for (let d = 0; d <= MAX_DELAY_MS; d += 5) {
      statuses.add(teStatus(d));
    }
    expect(statuses).toEqual(new Set(['nominal', 'degraded', 'failed']));
  });

  it('is failed at 100 ms (the documented failure point)', () => {
    expect(teStatus(100)).toBe('failed');
  });
});

describe('handoff traces', () => {
  it('both traces execute the committed mode before the hand-off', () => {
    for (const trace of [teHandoffTrace(200), rtcHandoffTrace(200)]) {
      expect(trace).toHaveLength(TRACE_TICKS);
      for (const point of trace) {
        if (point.tick < HANDOFF_TICK) {
          expect(point.action).toBeCloseTo(MODE_VALUE, 6);
        }
      }
    }
  });

  it('the RTC trace stays flat on the committed mode at any delay', () => {
    for (const point of rtcHandoffTrace(240)) {
      expect(point.action).toBeCloseTo(MODE_VALUE, 6);
    }
  });

  it('the TE trace settles on the stale averaged action after the hand-off', () => {
    const delay = 200;
    const trace = teHandoffTrace(delay);
    const settled = trace.at(-1);
    expect(settled).toBeDefined();
    expect(settled?.action).toBeCloseTo(teActionAtHandoff(delay), 6);
    expect(isValidModeAction(settled?.action ?? 0)).toBe(false);
  });

  it('the TE trace is continuous through the hand-off (no jumps)', () => {
    const trace = teHandoffTrace(180);
    for (let i = 1; i < trace.length; i += 1) {
      const step = Math.abs(trace[i].action - trace[i - 1].action);
      expect(step).toBeLessThanOrEqual(MODE_VALUE / 2);
    }
  });
});
