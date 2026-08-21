import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEGRADATION,
  DEFAULT_DR_RANGE,
  DEFAULT_REAL_MU,
  DR_RANGE_MAX,
  DR_RANGE_MIN,
  MU_MAX,
  MU_MIN,
  MU_TRAIN,
  POINT_PEAK,
  TERRAIN,
  TERRAIN_CELLS,
  actionDivergence,
  drCurvePoints,
  drPeak,
  drSuccess,
  formatDivergence,
  formatMeters,
  formatMu,
  formatPct,
  occludedCells,
  pointCurvePoints,
  pointSuccess,
  proprioReadings,
  reconstruction,
  reconstructionMae,
  terrainColor,
} from '@/lib/sim2real';

describe('sim2real friction model', () => {
  it('point policy peaks at its training friction and falls off sharply', () => {
    expect(pointSuccess(MU_TRAIN)).toBeCloseTo(POINT_PEAK, 10);
    expect(pointSuccess(MU_TRAIN - 0.45)).toBeLessThan(0.1);
    expect(pointSuccess(MU_TRAIN + 0.45)).toBeLessThan(0.1);
  });

  it('DR policy forms a plateau over its training range', () => {
    const peak = drPeak(DEFAULT_DR_RANGE);
    expect(drSuccess(MU_TRAIN, DEFAULT_DR_RANGE)).toBeCloseTo(peak, 10);
    expect(
      drSuccess(MU_TRAIN - DEFAULT_DR_RANGE * 0.9, DEFAULT_DR_RANGE),
    ).toBeCloseTo(peak, 10);
    expect(
      drSuccess(MU_TRAIN + DEFAULT_DR_RANGE * 0.9, DEFAULT_DR_RANGE),
    ).toBeCloseTo(peak, 10);
  });

  it('the point peak beats the DR peak at every slider setting', () => {
    for (let r = DR_RANGE_MIN; r <= DR_RANGE_MAX + 1e-9; r += 0.05) {
      expect(drPeak(r)).toBeLessThan(POINT_PEAK);
    }
  });

  it('widening the randomization range lowers the DR peak monotonically', () => {
    let prev = Infinity;
    for (let r = DR_RANGE_MIN; r <= DR_RANGE_MAX + 1e-9; r += 0.05) {
      const peak = drPeak(r);
      expect(peak).toBeLessThan(prev);
      prev = peak;
    }
  });

  it('far from the training friction the DR policy beats the point policy', () => {
    const farMu = MU_TRAIN - 0.45;
    expect(drSuccess(farMu, DEFAULT_DR_RANGE)).toBeGreaterThan(
      pointSuccess(farMu),
    );
    expect(drSuccess(farMu, DEFAULT_DR_RANGE)).toBeGreaterThan(0.3);
  });

  it('curve points stay inside the friction axis and are rounded', () => {
    for (const p of pointCurvePoints()) {
      expect(p.mu).toBeGreaterThanOrEqual(MU_MIN);
      expect(p.mu).toBeLessThanOrEqual(MU_MAX);
      expect(p.success).toBe(Number(p.success.toFixed(4)));
    }
    for (const p of drCurvePoints(DEFAULT_DR_RANGE)) {
      expect(p.mu).toBeGreaterThanOrEqual(MU_MIN);
      expect(p.mu).toBeLessThanOrEqual(MU_MAX);
    }
  });

  it('formats friction and percentages for the readouts', () => {
    expect(formatMu(DEFAULT_REAL_MU)).toBe('0.80');
    expect(formatPct(0.97)).toBe('97%');
    expect(formatPct(0.7375)).toBe('74%');
  });
});

describe('sim2real teacher-student model', () => {
  it('ships a deterministic terrain of the declared size', () => {
    expect(TERRAIN.length).toBe(TERRAIN_CELLS);
    expect(TERRAIN.every((h) => Number.isFinite(h))).toBe(true);
  });

  it('reconstruction is perfect at zero degradation', () => {
    const recon = reconstruction(0);
    expect(recon.length).toBe(TERRAIN_CELLS);
    for (let i = 0; i < TERRAIN_CELLS; i++) {
      expect(recon[i]).toBeCloseTo(TERRAIN[i], 10);
    }
    expect(reconstructionMae(0)).toBe(0);
    expect(actionDivergence(0)).toBe(0);
  });

  it('reconstruction error and action divergence rise strictly with degradation', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    let prevMae = -1;
    let prevDiv = -1;
    for (const d of steps) {
      const mae = reconstructionMae(d);
      const div = actionDivergence(d);
      expect(mae).toBeGreaterThan(prevMae);
      expect(div).toBeGreaterThan(prevDiv);
      prevMae = mae;
      prevDiv = div;
    }
  });

  it('occluded cells appear monotonically as degradation rises', () => {
    expect(occludedCells(0).every((o) => !o)).toBe(true);
    const counts = [0.2, 0.5, 0.8, 1].map(
      (d) => occludedCells(d).filter(Boolean).length,
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    expect(counts[3]).toBeGreaterThan(0);
  });

  it('proprioceptive readings are clean at zero degradation and noisy above it', () => {
    const clean = proprioReadings(0);
    const noisy = proprioReadings(1);
    expect(clean.length).toBe(TERRAIN_CELLS);
    expect(noisy.length).toBe(TERRAIN_CELLS);
    const differs = clean.some((v, i) => Math.abs(v - noisy[i]) > 1e-9);
    expect(differs).toBe(true);
  });

  it('terrain color maps low heights light and high heights dark', () => {
    const low = terrainColor(Math.min(...TERRAIN));
    const high = terrainColor(Math.max(...TERRAIN));
    const luminance = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Ink on paper: the taller the cell, the darker the mark.
    expect(luminance(low)).toBeGreaterThan(luminance(high));
  });

  it('formats meters and divergence for the readouts', () => {
    expect(formatMeters(0.0732)).toBe('0.07 m');
    expect(formatDivergence(0.314)).toBe('0.31');
  });

  it('default degradation is low but nonzero', () => {
    expect(DEFAULT_DEGRADATION).toBeGreaterThan(0);
    expect(DEFAULT_DEGRADATION).toBeLessThan(0.5);
  });
});
