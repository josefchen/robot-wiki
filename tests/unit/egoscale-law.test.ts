import { describe, expect, it } from 'vitest';
import { ROBOT_POINTS } from '@/lib/data-scaling';
import {
  COMPLETION_FIT,
  COMPLETION_POINTS,
  DEFAULT_HORIZON_HOURS,
  FULL_DATASET_HOURS,
  LOSS_LAW,
  MAX_HORIZON_HOURS,
  MEASURED_MAX_HOURS,
  MEASURED_MIN_HOURS,
  R_SQUARED,
  SOLVED_BAR_SCORE,
  completionFit,
  formatHours,
  formatLoss,
  plateauCompletion,
  plateauLoss,
  solvedBarCrossingHours,
  validationLoss,
} from '@/lib/egoscale-law';

/**
 * The model under test encodes EgoScale's published scaling law
 * (arXiv 2602.16710, Figure 5 and section 3.3): optimal human-video
 * validation loss L = 0.024 - 0.003 * ln(D) with D in thousands of hours,
 * fit over 1k/2k/4k/10k/20k hours with R^2 = 0.9983, and the five reported
 * downstream task-completion scores (0.30 at 1k rising monotonically to
 * 0.71 at 20k).
 */
describe('EgoScale validation-loss law', () => {
  it('anchors to the published equation at the measured endpoints', () => {
    // D = 1 (one thousand hours): ln(1) = 0, so L = 0.024 exactly.
    expect(validationLoss(1000)).toBeCloseTo(0.024, 6);
    // D = 20: L = 0.024 - 0.003 * ln(20) = 0.01501...
    expect(validationLoss(20_000)).toBeCloseTo(0.024 - 0.003 * Math.log(20), 6);
    expect(validationLoss(20_000)).toBeCloseTo(0.015, 3);
  });

  it('stays inside the figure axis range (0.014 to 0.024) across the measured regime', () => {
    for (const hours of [1000, 2000, 4000, 10_000, 20_000]) {
      const loss = validationLoss(hours);
      expect(loss).toBeGreaterThan(0.013);
      expect(loss).toBeLessThanOrEqual(0.024);
    }
  });

  it('decreases monotonically with data scale', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const hours of [1000, 2000, 4000, 10_000, 20_000, 100_000]) {
      const loss = validationLoss(hours);
      expect(loss).toBeLessThan(previous);
      previous = loss;
    }
  });

  it('stays positive out to the slider maximum (no impossible negative loss)', () => {
    expect(validationLoss(MAX_HORIZON_HOURS)).toBeGreaterThan(0);
  });

  it('publishes the paper constants', () => {
    expect(R_SQUARED).toBe(0.9983);
    expect(LOSS_LAW.intercept).toBe(0.024);
    expect(LOSS_LAW.slope).toBe(0.003);
    expect(MEASURED_MIN_HOURS).toBe(1000);
    expect(MEASURED_MAX_HOURS).toBe(20_000);
  });
});

describe('EgoScale downstream completion points', () => {
  it('carries the five reported scales in ascending order', () => {
    expect(COMPLETION_POINTS.map((p) => p.hours)).toEqual([
      1000, 2000, 4000, 10_000, 20_000,
    ]);
  });

  it('matches the reported endpoints: 0.30 at 1k hours, 0.71 at 20k hours', () => {
    expect(COMPLETION_POINTS[0].score).toBeCloseTo(0.3, 6);
    expect(COMPLETION_POINTS[COMPLETION_POINTS.length - 1].score).toBeCloseTo(
      0.71,
      6,
    );
  });

  it('is monotonic, as the paper reports', () => {
    for (let i = 1; i < COMPLETION_POINTS.length; i += 1) {
      expect(COMPLETION_POINTS[i].score).toBeGreaterThan(
        COMPLETION_POINTS[i - 1].score,
      );
    }
  });
});

describe('completion fit (robot-wiki least-squares over the five reported scores)', () => {
  it('fits the measured points closely', () => {
    expect(COMPLETION_FIT.rSquared).toBeGreaterThan(0.9);
    expect(completionFit(1000)).toBeCloseTo(0.32, 1);
    expect(completionFit(20_000)).toBeCloseTo(0.69, 1);
  });

  it('increases monotonically with data scale', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const hours of [1000, 5000, 20_000, 100_000]) {
      const score = completionFit(hours);
      expect(score).toBeGreaterThan(previous);
      previous = score;
    }
  });

  it('crosses the solved bar only deep in the extrapolated region', () => {
    const crossing = solvedBarCrossingHours();
    expect(crossing).toBeGreaterThan(MEASURED_MAX_HOURS);
    expect(crossing).toBeLessThanOrEqual(MAX_HORIZON_HOURS);
    expect(completionFit(crossing)).toBeCloseTo(SOLVED_BAR_SCORE, 6);
    // At the default 100k horizon the fit still sits just below the bar.
    expect(completionFit(DEFAULT_HORIZON_HOURS)).toBeLessThan(SOLVED_BAR_SCORE);
  });

  it('exceeds 100% inside the slider range, which is impossible and proves the curve must bend', () => {
    expect(completionFit(MAX_HORIZON_HOURS)).toBeGreaterThan(1);
  });
});

describe('extrapolation scenario band', () => {
  it('plateau scenario holds the last measured values flat', () => {
    expect(plateauLoss(100_000)).toBe(validationLoss(MEASURED_MAX_HOURS));
    expect(plateauCompletion(100_000)).toBeCloseTo(0.71, 6);
  });

  it('brackets the law-holds scenario from the plateau side beyond the measured range', () => {
    // Lower loss is better: law-holds drops below the plateau.
    expect(validationLoss(100_000)).toBeLessThan(plateauLoss(100_000));
    // Higher completion is better: fit-holds rises above the plateau.
    expect(completionFit(100_000)).toBeGreaterThan(plateauCompletion(100_000));
  });

  it('collapses to zero width at the end of the measured range', () => {
    expect(plateauLoss(MEASURED_MAX_HOURS)).toBe(
      validationLoss(MEASURED_MAX_HOURS),
    );
    expect(plateauCompletion(MEASURED_MAX_HOURS)).toBeCloseTo(
      completionFit(MEASURED_MAX_HOURS),
      1,
    );
  });
});

describe('reconciliation with the data-bottleneck module', () => {
  it('uses the same EgoScale dataset size as the data-scale chart', () => {
    const egoscale = ROBOT_POINTS.find((p) => p.id === 'egoscale');
    expect(egoscale?.magnitude).toBe(FULL_DATASET_HOURS);
    expect(FULL_DATASET_HOURS).toBe(20_854);
  });
});

describe('formatting', () => {
  it('formats hours compactly for axis ticks and readouts', () => {
    expect(formatHours(1000)).toBe('1k h');
    expect(formatHours(20_000)).toBe('20k h');
    expect(formatHours(100_000)).toBe('100k h');
    expect(formatHours(1_000_000)).toBe('1M h');
  });

  it('formats loss to four decimals', () => {
    expect(formatLoss(validationLoss(20_000))).toBe('0.0150');
    expect(formatLoss(validationLoss(1000))).toBe('0.0240');
  });
});
