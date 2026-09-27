import { describe, expect, it } from 'vitest';
import {
  clamp01,
  cssLinearEasing,
  lerp,
  sampleSmooth,
  smooth,
  thereAndBack,
} from '@/components/motion/easing';

describe('smooth easing', () => {
  it('is exactly the cubic formula from the motion tokens', () => {
    // smooth(t) = t^3 * (10(1-t)^2 + 5t(1-t) + t^2)
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const expected =
        t ** 3 * (10 * (1 - t) ** 2 + 5 * t * (1 - t) + t ** 2);
      expect(smooth(t)).toBeCloseTo(expected, 12);
    }
  });

  it('pins the endpoints', () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
  });

  it('passes through one half at one half', () => {
    expect(smooth(0.5)).toBeCloseTo(0.5, 12);
  });

  it('is symmetric: smooth(1 - t) === 1 - smooth(t)', () => {
    for (let i = 1; i < 20; i += 1) {
      const t = i / 20;
      expect(smooth(1 - t)).toBeCloseTo(1 - smooth(t), 12);
    }
  });

  it('is monotonic on [0, 1]', () => {
    let previous = smooth(0);
    for (let i = 1; i <= 200; i += 1) {
      const value = smooth(i / 200);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('starts and ends with a flat derivative', () => {
    const h = 1e-4;
    const startSlope = (smooth(h) - smooth(0)) / h;
    const endSlope = (smooth(1) - smooth(1 - h)) / h;
    expect(startSlope).toBeLessThan(0.01);
    expect(endSlope).toBeLessThan(0.01);
  });

  it('clamps outside [0, 1]', () => {
    expect(smooth(-0.5)).toBe(0);
    expect(smooth(1.5)).toBe(1);
  });
});

describe('thereAndBack easing', () => {
  it('rises on the first half and falls on the second', () => {
    expect(thereAndBack(0)).toBe(0);
    expect(thereAndBack(0.25)).toBeCloseTo(smooth(0.5), 12);
    expect(thereAndBack(0.5)).toBe(1);
    expect(thereAndBack(0.75)).toBeCloseTo(smooth(0.5), 12);
    expect(thereAndBack(1)).toBe(0);
  });

  it('is symmetric about the midpoint', () => {
    for (let i = 1; i < 10; i += 1) {
      const t = i / 10;
      expect(thereAndBack(1 - t)).toBeCloseTo(thereAndBack(t), 12);
    }
  });
});

describe('lerp and clamp01', () => {
  it('interpolates linearly', () => {
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe('css linear() sampling', () => {
  it('emits at least 20 stops with exact endpoints', () => {
    const easing = cssLinearEasing(24);
    expect(easing.startsWith('linear(')).toBe(true);
    const stops = easing
      .slice('linear('.length, -1)
      .split(',')
      .map((stop) => Number.parseFloat(stop));
    expect(stops.length).toBeGreaterThanOrEqual(20);
    expect(stops[0]).toBeCloseTo(0, 6);
    expect(stops[stops.length - 1]).toBeCloseTo(1, 6);
    // Sampled values must match the function they stand in for (the CSS
    // artifact rounds to four decimals).
    for (let i = 0; i < stops.length; i += 1) {
      expect(stops[i]).toBeCloseTo(smooth(i / (stops.length - 1)), 4);
    }
  });

  it('matches sampleSmooth output', () => {
    const samples = sampleSmooth(21);
    expect(samples).toHaveLength(21);
    expect(samples[0]).toBe(0);
    expect(samples[20]).toBe(1);
  });
});
