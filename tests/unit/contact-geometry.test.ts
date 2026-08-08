import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ERROR_MM,
  MAX_ERROR_MM,
  SCENARIOS,
  SCENARIO_ORDER,
  contactCount,
  errorOffsetPx,
  formatMm,
  maxPatchRadiusMm,
  outcomeFor,
  renderedOffsetPx,
  scenarioById,
} from '@/lib/contact-geometry';

describe('contact-geometry scenarios', () => {
  it('exposes locomotion and manipulation in order', () => {
    expect(SCENARIO_ORDER).toEqual(['locomotion', 'manipulation']);
    expect(scenarioById('locomotion').id).toBe('locomotion');
    expect(scenarioById('manipulation').id).toBe('manipulation');
  });

  it('manipulation has strictly more simultaneous contacts than locomotion', () => {
    const locomotion = contactCount(SCENARIOS.locomotion);
    const manipulation = contactCount(SCENARIOS.manipulation);
    expect(locomotion).toBe(4);
    expect(manipulation).toBeGreaterThan(locomotion * 3);
    expect(manipulation).toBe(SCENARIOS.manipulation.contacts.length);
  });

  it('locomotion tolerates centimeter-scale error; manipulation only sub-millimeter', () => {
    expect(SCENARIOS.locomotion.toleranceMm).toBeGreaterThanOrEqual(10);
    expect(SCENARIOS.manipulation.toleranceMm).toBeLessThanOrEqual(1);
  });

  it('contact patches are near-point for feet and distributed for the peg', () => {
    expect(maxPatchRadiusMm(SCENARIOS.locomotion)).toBeGreaterThan(
      maxPatchRadiusMm(SCENARIOS.manipulation),
    );
  });

  it('the default error is survivable for locomotion and fatal for manipulation', () => {
    expect(outcomeFor(SCENARIOS.locomotion, DEFAULT_ERROR_MM)).toBe('ok');
    expect(outcomeFor(SCENARIOS.manipulation, DEFAULT_ERROR_MM)).toBe('fail');
  });

  it('outcome flips at the tolerance boundary', () => {
    expect(outcomeFor(SCENARIOS.locomotion, 19.9)).toBe('ok');
    expect(outcomeFor(SCENARIOS.locomotion, 20)).toBe('ok');
    expect(outcomeFor(SCENARIOS.locomotion, 20.1)).toBe('fail');
    expect(outcomeFor(SCENARIOS.manipulation, 0.5)).toBe('ok');
    expect(outcomeFor(SCENARIOS.manipulation, 0.6)).toBe('fail');
    expect(outcomeFor(SCENARIOS.locomotion, MAX_ERROR_MM)).toBe('fail');
  });

  it('error offset is deterministic and rounded to two decimals', () => {
    const a = errorOffsetPx(SCENARIOS.manipulation, 0.3);
    const b = errorOffsetPx(SCENARIOS.manipulation, 0.3);
    expect(a).toBe(b);
    expect(a).toBe(Number(a.toFixed(2)));
    expect(errorOffsetPx(SCENARIOS.locomotion, 0)).toBe(0);
  });

  it('rendered offset clamps the peg inside the viewport but not the feet', () => {
    const clearance = SCENARIOS.manipulation.toleranceMm;
    expect(renderedOffsetPx(SCENARIOS.manipulation, 0.2)).toBeLessThan(
      renderedOffsetPx(SCENARIOS.manipulation, MAX_ERROR_MM),
    );
    expect(renderedOffsetPx(SCENARIOS.manipulation, MAX_ERROR_MM)).toBe(
      Number((4 * clearance * SCENARIOS.manipulation.pxPerMm).toFixed(2)),
    );
    expect(renderedOffsetPx(SCENARIOS.locomotion, MAX_ERROR_MM)).toBe(
      errorOffsetPx(SCENARIOS.locomotion, MAX_ERROR_MM),
    );
  });

  it('every contact sits inside the shared viewport', () => {
    for (const scenario of SCENARIO_ORDER.map((id) => SCENARIOS[id])) {
      for (const c of scenario.contacts) {
        expect(c.x).toBeGreaterThan(0);
        expect(c.x).toBeLessThan(640);
        expect(c.y).toBeGreaterThan(0);
        expect(c.y).toBeLessThan(320);
      }
    }
  });

  it('formats millimeter values without trailing .0 on integers', () => {
    expect(formatMm(20)).toBe('20 mm');
    expect(formatMm(0.5)).toBe('0.5 mm');
    expect(formatMm(2.5)).toBe('2.5 mm');
  });
});
