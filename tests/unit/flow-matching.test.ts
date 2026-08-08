import { describe, expect, it } from 'vitest';
import {
  FLOW_MODES,
  FLOW_SAMPLE_COUNT,
  MAX_STEPS,
  MIN_STEPS,
  endpointDispersion,
  generateFlowField,
  integrateFlow,
  pathCurvature,
  transportPoint,
  vectorFieldAt,
} from '@/lib/flow-matching';

describe('generateFlowField', () => {
  it('is deterministic for a fixed seed', () => {
    expect(generateFlowField(42)).toEqual(generateFlowField(42));
  });

  it('produces different fields for different seeds', () => {
    expect(generateFlowField(1)).not.toEqual(generateFlowField(2));
  });

  it('pairs every noise sample with a target on a real mode', () => {
    const field = generateFlowField(7);
    expect(field.samples.length).toBe(FLOW_SAMPLE_COUNT);
    for (const s of field.samples) {
      expect(s.mode).toBeGreaterThanOrEqual(0);
      expect(s.mode).toBeLessThan(FLOW_MODES.length);
    }
  });

  it('populates every mode (multimodality survives transport)', () => {
    const field = generateFlowField(7);
    const modes = new Set(field.samples.map((s) => s.mode));
    expect(modes.size).toBe(FLOW_MODES.length);
  });
});

describe('transportPoint', () => {
  const field = generateFlowField(7);

  it('starts at the Gaussian noise sample and ends exactly on the action target', () => {
    for (const s of field.samples.slice(0, 5)) {
      expect(transportPoint(s, 0)).toEqual(s.noise);
      const end = transportPoint(s, 1);
      expect(end.x).toBeCloseTo(s.target.x, 10);
      expect(end.y).toBeCloseTo(s.target.y, 10);
    }
  });

  it('follows a near-straight path (rectified / OT character)', () => {
    for (const s of field.samples) {
      // Deviation from the straight noise-to-target chord stays a small
      // fraction of the chord length: these are not curved diffusion paths.
      expect(pathCurvature(s)).toBeLessThan(0.3);
    }
  });
});

describe('integrateFlow', () => {
  const field = generateFlowField(7);
  const sample = field.samples[0];

  it('returns steps + 1 polyline points starting at the noise sample', () => {
    const points = integrateFlow(sample, 10);
    expect(points.length).toBe(11);
    expect(points[0]).toEqual(sample.noise);
  });

  it('clamps the step count to [MIN_STEPS, MAX_STEPS]', () => {
    expect(integrateFlow(sample, 0).length).toBe(MIN_STEPS + 1);
    expect(integrateFlow(sample, -5).length).toBe(MIN_STEPS + 1);
    expect(integrateFlow(sample, 999).length).toBe(MAX_STEPS + 1);
    expect(integrateFlow(sample, Number.NaN).length).toBe(MIN_STEPS + 1);
  });

  it('converges onto the target as steps increase', () => {
    const at = (k: number) => {
      const pts = integrateFlow(sample, k);
      const end = pts[pts.length - 1];
      return Math.hypot(end.x - sample.target.x, end.y - sample.target.y);
    };
    expect(at(1)).toBeGreaterThan(at(5));
    expect(at(5)).toBeGreaterThan(at(50));
    expect(at(50)).toBeLessThan(0.05);
  });
});

describe('endpointDispersion', () => {
  const field = generateFlowField(7);

  it('is observably larger at 1-2 steps than at 5+ steps', () => {
    // VAL-MAN-024 pass condition: the transported cloud visibly misses the
    // target distribution at very low step counts and concentrates by 5-10.
    const d1 = endpointDispersion(field, 1);
    const d2 = endpointDispersion(field, 2);
    const d5 = endpointDispersion(field, 5);
    const d10 = endpointDispersion(field, 10);
    expect(d1).toBeGreaterThan(0.2);
    expect(d1).toBeGreaterThan(2 * d5);
    expect(d2).toBeGreaterThan(d5);
    expect(d5).toBeGreaterThanOrEqual(d10);
    expect(d10).toBeLessThan(0.15);
  });

  it('keeps shrinking toward zero at 50 steps', () => {
    expect(endpointDispersion(field, 50)).toBeLessThan(0.02);
  });
});

describe('vectorFieldAt', () => {
  const field = generateFlowField(7);

  it('returns a deterministic grid of finite velocity vectors', () => {
    const grid = vectorFieldAt(field, 0.5, 7, 5);
    expect(grid.length).toBe(35);
    expect(grid).toEqual(vectorFieldAt(field, 0.5, 7, 5));
    for (const arrow of grid) {
      expect(Number.isFinite(arrow.vx)).toBe(true);
      expect(Number.isFinite(arrow.vy)).toBe(true);
    }
  });

  it('points from the noise region toward the modes on average', () => {
    // The marginal field near the origin (where the Gaussian cloud sits)
    // should have a nonzero mean direction: it transports mass outward
    // toward the two action modes.
    const grid = vectorFieldAt(field, 0.1, 5, 5);
    const magnitudes = grid.map((a) => Math.hypot(a.vx, a.vy));
    expect(Math.max(...magnitudes)).toBeGreaterThan(0.5);
  });
});
