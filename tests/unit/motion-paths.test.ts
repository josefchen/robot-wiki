import { describe, expect, it } from 'vitest';
import {
  alignStart,
  ellipsePath,
  interpolatePaths,
  parsePath,
  resamplePath,
  toPathData,
} from '@/components/motion/paths';

const SQUARE = 'M 10 10 L 90 10 L 90 90 L 10 90 Z';
const DIAMOND = 'M 50 0 L 100 50 L 50 100 L 0 50 Z';

describe('parsePath', () => {
  it('normalizes every command to cubic segments', () => {
    const segments = parsePath('M 0 0 L 10 0 Q 20 0 20 10 C 30 10 30 20 40 20 Z');
    expect(segments.length).toBe(4);
    for (const segment of segments) {
      expect(segment.kind).toBe('C');
      expect(segment.p1).toBeDefined();
      expect(segment.p2).toBeDefined();
      expect(segment.to).toBeDefined();
    }
  });

  it('keeps the start point and visits every anchor', () => {
    const segments = parsePath(SQUARE);
    expect(segments[0].from).toEqual({ x: 10, y: 10 });
    expect(segments.map((s) => s.to)).toEqual([
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
      { x: 10, y: 10 },
    ]);
  });

  it('rejects arc commands with a clear error', () => {
    expect(() => parsePath('M 0 0 A 10 10 0 0 1 20 20')).toThrow(/arc/i);
  });
});

describe('resamplePath', () => {
  it('produces exactly the requested number of cubic segments', () => {
    for (const n of [1, 4, 16, 64]) {
      expect(resamplePath(parsePath(SQUARE), n)).toHaveLength(n);
      expect(resamplePath(parsePath(DIAMOND), n)).toHaveLength(n);
    }
  });

  it('preserves the source start point and total extent', () => {
    const resampled = resamplePath(parsePath(SQUARE), 24);
    expect(resampled[0].from).toEqual({ x: 10, y: 10 });
    const xs = resampled.flatMap((s) => [s.from.x, s.to.x]);
    const ys = resampled.flatMap((s) => [s.from.y, s.to.y]);
    expect(Math.min(...xs)).toBeCloseTo(10, 6);
    expect(Math.max(...xs)).toBeCloseTo(90, 6);
    expect(Math.min(...ys)).toBeCloseTo(10, 6);
    expect(Math.max(...ys)).toBeCloseTo(90, 6);
  });

  it('distributes segments by arc length, not by source count', () => {
    // A square with one side ten times longer than the others: equal arc
    // length resampling puts roughly half the segments on the long side.
    const path = 'M 0 0 L 100 0 L 100 10 L 0 10 Z';
    const resampled = resamplePath(parsePath(path), 20);
    const onLongSide = resampled.filter(
      (s) => s.from.y < 1 && s.to.y <= 1 && s.from.x !== s.to.x,
    ).length;
    expect(onLongSide).toBeGreaterThanOrEqual(8);
    expect(onLongSide).toBeLessThanOrEqual(12);
  });
});

describe('alignStart', () => {
  it('rotates the second path so it starts nearest the first start', () => {
    const a = parsePath(SQUARE);
    const b = parsePath(DIAMOND);
    const aligned = alignStart(a, b);
    const startA = a[0].from;
    const before = Math.hypot(b[0].from.x - startA.x, b[0].from.y - startA.y);
    const after = Math.hypot(
      aligned[0].from.x - startA.x,
      aligned[0].from.y - startA.y,
    );
    expect(after).toBeLessThan(before);
    // Rotation keeps the path continuous; a rotation may resample to a
    // finer subdivision, but never breaks the chain of anchors.
    expect(aligned.length).toBeGreaterThanOrEqual(b.length);
    for (let i = 1; i < aligned.length; i += 1) {
      expect(aligned[i].from).toEqual(aligned[i - 1].to);
    }
  });

  it('leaves paths that already share a start point unchanged', () => {
    const a = parsePath(SQUARE);
    const b = parsePath('M 10 10 L 50 90 L 90 10 Z');
    const aligned = alignStart(a, b);
    expect(aligned[0].from).toEqual(b[0].from);
  });
});

describe('interpolatePaths', () => {
  it('returns path a at t = 0 and path b at t = 1', () => {
    const a = parsePath(SQUARE);
    const b = parsePath(DIAMOND);
    expect(interpolatePaths(a, b, 0, 32)).toEqual(resamplePath(a, 32));
    expect(interpolatePaths(a, b, 1, 32)).toEqual(
      resamplePath(alignStart(a, b), 32),
    );
  });

  it('moves every anchor monotonically between the two shapes', () => {
    const a = parsePath(SQUARE);
    const b = parsePath(DIAMOND);
    const at = (t: number) => interpolatePaths(a, b, t, 16);
    const zero = at(0);
    const mid = at(0.5);
    const one = at(1);
    for (let i = 0; i < mid.length; i += 1) {
      for (const key of ['x', 'y'] as const) {
        const from = zero[i].from[key];
        const through = mid[i].from[key];
        const to = one[i].from[key];
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        expect(through).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(through).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('serializes to path data', () => {
    const d = toPathData(
      interpolatePaths(parsePath(SQUARE), parsePath(DIAMOND), 0.5, 8),
    );
    expect(d).toMatch(/^M /);
    expect(d).not.toContain('NaN');
  });
});

describe('ellipsePath', () => {
  it('builds a closed four-arc cubic approximation', () => {
    const segments = parsePath(ellipsePath(50, 40, 20, 10, Math.PI / 4));
    expect(segments).toHaveLength(4);
    expect(segments[0].from.x).toBeCloseTo(
      segments[segments.length - 1].to.x,
      6,
    );
  });

  it('lands on the ellipse extremes', () => {
    const segments = parsePath(ellipsePath(0, 0, 30, 15, 0));
    const points = segments.flatMap((s) => [s.from, s.to]);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.max(...xs)).toBeCloseTo(30, 3);
    expect(Math.min(...xs)).toBeCloseTo(-30, 3);
    expect(Math.max(...ys)).toBeCloseTo(15, 3);
    expect(Math.min(...ys)).toBeCloseTo(-15, 3);
  });
});
