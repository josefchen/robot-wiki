import { describe, expect, it } from 'vitest';
import {
  COLLECTION_RATES,
  DEFAULT_RIGS,
  FRONTIER_HOURS,
  LLM_POINTS,
  MAX_RIGS,
  MIN_RIGS,
  OXE_SCALE_HOURS,
  ROBOT_POINTS,
  formatDuration,
  formatHours,
  formatTokens,
  hoursPerYear,
  rateById,
  yearsToTarget,
} from '@/lib/data-scaling';

describe('teleop-farm projection model', () => {
  it('hours per year scales linearly with rig count for both rates', () => {
    const dedicated = rateById('dedicated').hoursPerRigYear;
    const measured = rateById('droid-measured').hoursPerRigYear;
    expect(hoursPerYear(10, 'dedicated')).toBe(10 * dedicated);
    expect(hoursPerYear(10, 'droid-measured')).toBe(10 * measured);
    expect(hoursPerYear(2, 'dedicated')).toBe(2 * dedicated);
  });

  it('dedicated rate assumes 1,000 productive hours per rig-year', () => {
    expect(rateById('dedicated').hoursPerRigYear).toBe(1000);
  });

  it('DROID-measured rate reproduces the published collection throughput', () => {
    // DROID: 350 hours from 50 collectors over 12 months (arXiv 2403.12945).
    expect(hoursPerYear(50, 'droid-measured')).toBe(350);
  });

  it('years to target decreases monotonically as the fleet grows', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let rigs = MIN_RIGS; rigs <= 64; rigs *= 2) {
      const years = yearsToTarget(rigs, 'dedicated', OXE_SCALE_HOURS);
      expect(years).toBeLessThan(previous);
      previous = years;
    }
  });

  it('default scenario: 15 dedicated rigs reach OXE scale in eight months', () => {
    expect(DEFAULT_RIGS).toBe(15);
    expect(hoursPerYear(DEFAULT_RIGS, 'dedicated')).toBe(15_000);
    expect(
      formatDuration(yearsToTarget(DEFAULT_RIGS, 'dedicated', OXE_SCALE_HOURS)),
    ).toBe('8 mo');
    expect(
      formatDuration(yearsToTarget(DEFAULT_RIGS, 'dedicated', FRONTIER_HOURS)),
    ).toBe('66.7 yr');
  });

  it('DROID-rate scenario takes centuries to reach OXE scale', () => {
    const years = yearsToTarget(10, 'droid-measured', OXE_SCALE_HOURS);
    expect(years).toBeGreaterThan(100);
    expect(formatDuration(years)).toBe('143 yr');
  });

  it('slider bounds are sane', () => {
    expect(MIN_RIGS).toBe(1);
    expect(MAX_RIGS).toBe(500);
    expect(COLLECTION_RATES.map((r) => r.id)).toEqual([
      'dedicated',
      'droid-measured',
    ]);
  });
});

describe('chart data anchors match published numbers', () => {
  it('robot-side points carry the research values', () => {
    const byId = new Map(ROBOT_POINTS.map((p) => [p.id, p]));
    expect(byId.get('droid')?.magnitude).toBe(350);
    expect(byId.get('egodex')?.magnitude).toBe(829);
    expect(byId.get('tri-lbm')?.magnitude).toBe(1700);
    expect(byId.get('ego4d')?.magnitude).toBe(3670);
    expect(byId.get('oxe')?.magnitude).toBe(10_000);
    expect(byId.get('egoscale')?.magnitude).toBe(20_854);
    expect(byId.get('agibot')?.magnitude).toBe(100_000);
  });

  it('estimated points are flagged, measured points are not', () => {
    const byId = new Map(ROBOT_POINTS.map((p) => [p.id, p]));
    expect(byId.get('droid')?.estimated).toBe(false);
    expect(byId.get('egodex')?.estimated).toBe(false);
    expect(byId.get('egoscale')?.estimated).toBe(false);
    expect(byId.get('oxe')?.estimated).toBe(true);
    expect(byId.get('agibot')?.estimated).toBe(true);
    expect(byId.get('tri-lbm')?.estimated).toBe(true);
  });

  it('points are sorted ascending by magnitude and all cite a registry id', () => {
    for (let i = 1; i < ROBOT_POINTS.length; i++) {
      expect(ROBOT_POINTS[i].magnitude).toBeGreaterThan(
        ROBOT_POINTS[i - 1].magnitude,
      );
    }
    for (const p of [...ROBOT_POINTS, ...LLM_POINTS]) {
      expect(p.cite.length).toBeGreaterThan(0);
      expect(p.magnitude).toBeGreaterThan(0);
    }
  });

  it('LLM-side points anchor GPT-3 and Llama 3', () => {
    const byId = new Map(LLM_POINTS.map((p) => [p.id, p]));
    expect(byId.get('gpt3')?.magnitude).toBe(3e11);
    expect(byId.get('llama3')?.magnitude).toBe(1.5e13);
  });
});

describe('formatters', () => {
  it('formats hours with grouping and suffixes', () => {
    expect(formatHours(70)).toBe('70 h');
    expect(formatHours(350)).toBe('350 h');
    expect(formatHours(829)).toBe('829 h');
    expect(formatHours(1700)).toBe('1,700 h');
    expect(formatHours(10_000)).toBe('10,000 h');
    expect(formatHours(20_854)).toBe('20,854 h');
    expect(formatHours(100_000)).toBe('100,000 h');
    expect(formatHours(1_000_000)).toBe('1.0M h');
  });

  it('formats durations, switching to months under one year', () => {
    expect(formatDuration(1)).toBe('1.0 yr');
    expect(formatDuration(10)).toBe('10.0 yr');
    expect(formatDuration(100)).toBe('100 yr');
    expect(formatDuration(142.857)).toBe('143 yr');
    expect(formatDuration(14_285.7)).toBe('14,286 yr');
    expect(formatDuration(0.5)).toBe('6 mo');
    expect(formatDuration(0.04)).toBe('1 mo');
  });

  it('formats token counts', () => {
    expect(formatTokens(3e11)).toBe('300B');
    expect(formatTokens(1.5e13)).toBe('15T');
  });
});
