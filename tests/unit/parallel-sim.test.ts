import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENVS,
  MAX_ENVS,
  MIN_ENVS,
  ROLLOUT_STEPS,
  RUDIN_MARKERS,
  TARGET_TRANSITIONS,
  curvePoints,
  formatFps,
  formatWallClock,
  iterationBreakdown,
  iterationsToTarget,
  throughputFps,
  wallClockSeconds,
} from '@/lib/parallel-sim';

describe('parallel-sim training-time model', () => {
  it("anchors the default 4,096-env run near Rudin's four-minute flat-terrain mark", () => {
    const minutes = wallClockSeconds(DEFAULT_ENVS, false) / 60;
    expect(minutes).toBeGreaterThan(3.5);
    expect(minutes).toBeLessThan(4.5);
  });

  it('spans hours at 64 envs down to minutes at 16,384 envs', () => {
    expect(wallClockSeconds(MIN_ENVS, false)).toBeGreaterThan(3600);
    expect(wallClockSeconds(MAX_ENVS, false)).toBeLessThan(5 * 60);
  });

  it('decreases monotonically across the slider range in both modes', () => {
    for (const cpuBound of [false, true]) {
      let prev = Infinity;
      for (let log2 = 6; log2 <= 14; log2 += 1) {
        const w = wallClockSeconds(2 ** log2, cpuBound);
        expect(w).toBeLessThan(prev);
        prev = w;
      }
    }
  });

  it('iterations to target scale inversely with env count', () => {
    expect(iterationsToTarget(DEFAULT_ENVS)).toBeCloseTo(
      TARGET_TRANSITIONS / (DEFAULT_ENVS * ROLLOUT_STEPS),
      5,
    );
    expect(iterationsToTarget(8192)).toBeCloseTo(
      iterationsToTarget(4096) / 2,
      5,
    );
  });

  it('breakdown sums to the total and recomposes across the range', () => {
    const low = iterationBreakdown(MIN_ENVS, false);
    const high = iterationBreakdown(MAX_ENVS, false);
    for (const b of [low, high]) {
      expect(b.simSeconds + b.learnSeconds + b.cpuSeconds).toBeCloseTo(
        b.totalSeconds,
        10,
      );
    }
    expect(low.cpuSeconds / low.totalSeconds).toBeGreaterThan(
      high.cpuSeconds / high.totalSeconds,
    );
    expect(high.simSeconds / high.totalSeconds).toBeGreaterThan(
      low.simSeconds / low.totalSeconds,
    );
  });

  it('CPU-bottleneck mode raises wall-clock and flattens high-end scaling', () => {
    const normalGain =
      wallClockSeconds(4096, false) / wallClockSeconds(MAX_ENVS, false);
    const cpuGain =
      wallClockSeconds(4096, true) / wallClockSeconds(MAX_ENVS, true);
    expect(wallClockSeconds(MAX_ENVS, true)).toBeGreaterThan(
      wallClockSeconds(MAX_ENVS, false),
    );
    expect(cpuGain).toBeLessThan(normalGain);
    const high = iterationBreakdown(MAX_ENVS, true);
    expect(high.cpuSeconds / high.totalSeconds).toBeGreaterThan(0.5);
  });

  it('throughput rises with env count and sits in the cited ballpark at 4,096', () => {
    const fps = throughputFps(DEFAULT_ENVS, false);
    expect(fps).toBeGreaterThan(5e5);
    expect(fps).toBeLessThan(2e6);
    expect(throughputFps(MAX_ENVS, false)).toBeGreaterThan(fps);
    expect(throughputFps(MIN_ENVS, false)).toBeLessThan(fps);
  });

  it('Rudin ground-truth markers pin 4 and 20 minutes at 4,096 envs', () => {
    expect(RUDIN_MARKERS.map((m) => m.minutes)).toEqual([4, 20]);
    for (const m of RUDIN_MARKERS) expect(m.envs).toBe(4096);
  });

  it('curve points are log-sampled, rounded, and monotonic', () => {
    const pts = curvePoints(false, 24);
    expect(pts.length).toBe(24);
    expect(pts[0].envs).toBe(MIN_ENVS);
    expect(pts.at(-1)?.envs).toBe(MAX_ENVS);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].minutes).toBeLessThan(pts[i - 1].minutes);
      expect(pts[i].minutes).toBe(Number(pts[i].minutes.toFixed(2)));
    }
  });

  it('formats wall-clock as seconds, minutes, or hours', () => {
    expect(formatWallClock(45)).toBe('45 s');
    expect(formatWallClock(238)).toBe('4.0 min');
    expect(formatWallClock(12925)).toBe('3.6 h');
  });

  it('formats throughput with k/M suffixes', () => {
    expect(formatFps(17000)).toBe('17k FPS');
    expect(formatFps(924000)).toBe('924k FPS');
    expect(formatFps(2530000)).toBe('2.5M FPS');
  });
});
