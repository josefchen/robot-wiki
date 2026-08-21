import { describe, expect, it } from 'vitest';
import {
  CLEARANCE_MM,
  DEFAULT_PARAMS,
  NOMINAL_RANGE_M,
  PUBLISHED_DEPTH_SPEC_PCT,
  SLIDER_SPECS,
  TARGET_CLASSES,
  classifyVerdict,
  composeBudget,
  depthErrorMm,
  depthFloorPct,
  handEyeErrorMm,
  type BudgetParams,
} from '@/lib/perception-error';

const at = (overrides: Partial<BudgetParams>): BudgetParams => ({
  ...DEFAULT_PARAMS,
  ...overrides,
});

describe('hand-eye term', () => {
  it('is the only distance-dependent term: a fixed angle costs more at range', () => {
    const near = handEyeErrorMm(1, 0.1);
    const far = handEyeErrorMm(1, 1);
    expect(near).toBeCloseTo(100 * Math.tan(Math.PI / 180), 6);
    expect(far).toBeCloseTo(1000 * Math.tan(Math.PI / 180), 6);
    // The teaching move: invisible at 10 cm, fatal at 1 m.
    expect(near).toBeLessThan(2);
    expect(far).toBeGreaterThan(CLEARANCE_MM);
  });

  it('vanishes at zero angle regardless of distance', () => {
    for (const d of [0.15, 0.5, 1.5]) {
      expect(handEyeErrorMm(0, d)).toBe(0);
    }
  });
});

describe('depth term', () => {
  it('is range-independent: the same percent gives the same millimetres', () => {
    expect(depthErrorMm(2)).toBeCloseTo(0.02 * NOMINAL_RANGE_M * 1000, 9);
    expect(depthErrorMm(PUBLISHED_DEPTH_SPEC_PCT)).toBeCloseTo(10, 9);
  });

  it('reads the published stereo spec as its opaque floor', () => {
    expect(depthFloorPct('opaque')).toBe(PUBLISHED_DEPTH_SPEC_PCT);
    expect(depthFloorPct('specular')).toBeGreaterThan(depthFloorPct('opaque'));
    expect(depthFloorPct('transparent')).toBeGreaterThan(depthFloorPct('specular'));
  });

  it('offers exactly three surfaces, each with a stated failure mode', () => {
    expect(TARGET_CLASSES.map((t) => t.id)).toEqual([
      'opaque',
      'specular',
      'transparent',
    ]);
    for (const t of TARGET_CLASSES) {
      expect(t.failureMode.split(/\s+/).length).toBeGreaterThan(3);
    }
  });
});

describe('composition', () => {
  it('composes the three sources in quadrature', () => {
    const budget = composeBudget(
      at({ handEyeDeg: 0, depthPct: 0, poseMm: 4, target: 'opaque' }),
    );
    // The opaque floor holds the depth term at the published spec even
    // with the slider at zero, so the total is sqrt(10^2 + 4^2).
    expect(budget.effectiveDepthPct).toBe(PUBLISHED_DEPTH_SPEC_PCT);
    expect(budget.flooredByTarget).toBe(true);
    expect(budget.totalMm).toBeCloseTo(Math.sqrt(100 + 16), 6);
  });

  it('shares sum to one and rank the dominant source', () => {
    const budget = composeBudget(at({ handEyeDeg: 2, workingDistanceM: 1.5 }));
    const sum = budget.contributions.reduce((acc, c) => acc + c.share, 0);
    expect(sum).toBeCloseTo(1, 9);
    const dominant = [...budget.contributions].sort((a, b) => b.share - a.share)[0];
    expect(dominant.key).toBe('handeye');
  });

  it('is strictly increasing in working distance at a non-zero angle', () => {
    const totals = [0.15, 0.5, 1.0, 1.5].map(
      (workingDistanceM) =>
        composeBudget(at({ handEyeDeg: 1, workingDistanceM })).totalMm,
    );
    for (let i = 1; i < totals.length; i += 1) {
      expect(totals[i]).toBeGreaterThan(totals[i - 1]);
    }
  });

  it('is exactly flat in working distance at a zero angle (VAL-CLASS-042)', () => {
    const totals = [
      SLIDER_SPECS.distance.min,
      0.4,
      0.9,
      SLIDER_SPECS.distance.max,
    ].map(
      (workingDistanceM) =>
        composeBudget(at({ handEyeDeg: 0, workingDistanceM })).totalMm,
    );
    for (const total of totals) {
      expect(total).toBeCloseTo(totals[0], 12);
    }
  });

  it('raises the depth term and the verdict when the target turns transparent', () => {
    const params = at({ handEyeDeg: 0.5, depthPct: 2, poseMm: 3 });
    const opaque = composeBudget({ ...params, target: 'opaque' });
    const transparent = composeBudget({ ...params, target: 'transparent' });
    const depthOf = (b: ReturnType<typeof composeBudget>) =>
      b.contributions.find((c) => c.key === 'depth')!.mm;
    expect(depthOf(transparent)).toBeGreaterThan(depthOf(opaque));
    expect(opaque.verdict).toBe('within');
    expect(transparent.verdict).not.toBe(opaque.verdict);
  });
});

describe('verdict', () => {
  it('bands on the clearance figure, marginal to twice it', () => {
    expect(classifyVerdict(CLEARANCE_MM - 0.01)).toBe('within');
    expect(classifyVerdict(CLEARANCE_MM)).toBe('within');
    expect(classifyVerdict(CLEARANCE_MM + 0.01)).toBe('marginal');
    expect(classifyVerdict(2 * CLEARANCE_MM)).toBe('marginal');
    expect(classifyVerdict(2 * CLEARANCE_MM + 0.01)).toBe('jam');
  });
});

describe('defaults', () => {
  it('open inside every slider range', () => {
    expect(DEFAULT_PARAMS.handEyeDeg).toBeGreaterThanOrEqual(SLIDER_SPECS.handEye.min);
    expect(DEFAULT_PARAMS.handEyeDeg).toBeLessThanOrEqual(SLIDER_SPECS.handEye.max);
    expect(DEFAULT_PARAMS.depthPct).toBeLessThanOrEqual(SLIDER_SPECS.depth.max);
    expect(DEFAULT_PARAMS.poseMm).toBeLessThanOrEqual(SLIDER_SPECS.pose.max);
    expect(DEFAULT_PARAMS.workingDistanceM).toBeGreaterThanOrEqual(
      SLIDER_SPECS.distance.min,
    );
    expect(DEFAULT_PARAMS.workingDistanceM).toBeLessThanOrEqual(
      SLIDER_SPECS.distance.max,
    );
  });

  it('opens with a non-zero hand-eye error so the distance slider has an effect', () => {
    expect(DEFAULT_PARAMS.handEyeDeg).toBeGreaterThan(0);
  });
});
