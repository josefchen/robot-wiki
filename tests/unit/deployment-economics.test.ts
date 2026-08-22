import { describe, expect, it } from 'vitest';
import {
  AMORTIZATION_MONTHS,
  DEFAULT_INPUTS,
  INPUT_RANGES,
  PAYBACK_TARGET_MONTHS,
  ROBOT_HOURS_PER_MONTH,
  SECONDS_PER_HOUR,
  computeEconomics,
  paysBackWithinTarget,
  sanitizeInputs,
} from '../../lib/deployment-economics';

describe('deployment-economics pure model', () => {
  it('computes the default cell: cost multiple, picks, payback', () => {
    const out = computeEconomics(DEFAULT_INPUTS);
    // Cell cost: $80k robot x 2.5 integration = $200k.
    expect(out.totalCellCost).toBe(200_000);
    // 99.9% success => 0.1% jams; 6 s cycle + 0.001 x 15 s = 6.015 s per pick.
    expect(out.jamRatePercent).toBeCloseTo(0.1, 10);
    expect(out.effectiveSecondsPerPick).toBeCloseTo(6.015, 6);
    // 95% uptime => 3420 s available; 3420 / 6.015 = 568.5 picks/h.
    expect(out.netPicksPerHour).toBeCloseTo(568.58, 1);
    expect(out.monthlyPicks).toBeCloseTo(out.netPicksPerHour * ROBOT_HOURS_PER_MONTH, 6);
    // Labour value uses the nominal 6 s cycle at $25/h.
    expect(out.monthlyLaborValue).toBeCloseTo(
      (out.monthlyPicks * 6 * 25) / SECONDS_PER_HOUR,
      6,
    );
    expect(out.paybackMonths).toBeCloseTo(200_000 / out.monthlyLaborValue, 6);
    expect(paysBackWithinTarget(out.paybackMonths)).toBe(true);
  });

  it('time breakdown sums to one elapsed hour', () => {
    const out = computeEconomics(DEFAULT_INPUTS);
    const total =
      out.timeBreakdown.productive +
      out.timeBreakdown.jamClearing +
      out.timeBreakdown.downtime;
    expect(total).toBeCloseTo(SECONDS_PER_HOUR, 6);
    expect(out.timeBreakdown.downtime).toBeCloseTo(180, 6); // 5% of 3600
  });

  it('perfect reliability with cheap jam clearing keeps payback stable', () => {
    // Drop success from 99.9 to 99 with jam clearing at its minimum (5 s).
    const cheapJam = { ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 5 };
    const cheapOut = computeEconomics(cheapJam);
    expect(cheapOut.jamRatePercent).toBeCloseTo(1, 10);
    expect(cheapOut.effectiveSecondsPerPick).toBeCloseTo(6.05, 6);
    // Barely slower than the 6.015 s default: the whole module argument.
    const base = computeEconomics(DEFAULT_INPUTS);
    expect(cheapOut.paybackMonths!).toBeGreaterThan(base.paybackMonths!);
    expect(cheapOut.paybackMonths! / base.paybackMonths!).toBeLessThan(1.01);
  });

  it('the same success drop with expensive jam clearing collapses payback (VAL-DATA-033)', () => {
    // Hold everything at defaults except jam-clearing time at its max
    // (300 s), then measure how far a 99.9 -> 99 success drop moves the
    // payback readout, and compare with the cheap-jam delta.
    const maxJamHigh = computeEconomics({
      ...DEFAULT_INPUTS,
      jamClearSeconds: 300,
      successRatePercent: 99.9,
    });
    const maxJamLow = computeEconomics({
      ...DEFAULT_INPUTS,
      jamClearSeconds: 300,
      successRatePercent: 99,
    });
    const minJamHigh = computeEconomics({
      ...DEFAULT_INPUTS,
      jamClearSeconds: 5,
      successRatePercent: 99.9,
    });
    const minJamLow = computeEconomics({
      ...DEFAULT_INPUTS,
      jamClearSeconds: 5,
      successRatePercent: 99,
    });
    // All four readouts are finite and positive.
    for (const o of [maxJamHigh, maxJamLow, minJamHigh, minJamLow]) {
      expect(o.paybackMonths).not.toBeNull();
      expect(Number.isFinite(o.paybackMonths!)).toBe(true);
      expect(o.paybackMonths!).toBeGreaterThan(0);
    }
    const deltaAtMax = maxJamLow.paybackMonths! - maxJamHigh.paybackMonths!;
    const deltaAtMin = minJamLow.paybackMonths! - minJamHigh.paybackMonths!;
    // Ordering demanded by the contract: the same success-rate move hurts
    // strictly more when jams are expensive to clear.
    expect(deltaAtMax).toBeGreaterThan(deltaAtMin);
  });

  it('boundary inputs stay honest: no NaN, no division blowups', () => {
    // Every control at an extreme combination.
    const extremes = [
      { ...DEFAULT_INPUTS, successRatePercent: 99.9, jamClearSeconds: 300, uptimePercent: 80 },
      { ...DEFAULT_INPUTS, successRatePercent: 90, jamClearSeconds: 5, uptimePercent: 100 },
      { ...DEFAULT_INPUTS, robotCost: 250_000, integrationMultiple: 5 },
      { ...DEFAULT_INPUTS, wageUsdPerHour: 10, cycleTimeSeconds: 20 },
    ];
    for (const inputs of extremes) {
      const out = computeEconomics(inputs);
      expect(Number.isFinite(out.costPerPickUsd)).toBe(true);
      expect(out.paybackMonths === null || Number.isFinite(out.paybackMonths)).toBe(true);
      expect(out.netPicksPerHour).toBeGreaterThan(0);
    }
  });

  it('sanitizes out-of-range inputs by clamping', () => {
    const cleaned = sanitizeInputs({
      ...DEFAULT_INPUTS,
      successRatePercent: 105,
      jamClearSeconds: -50,
    });
    expect(cleaned.successRatePercent).toBe(INPUT_RANGES.successRatePercent.max);
    expect(cleaned.jamClearSeconds).toBe(INPUT_RANGES.jamClearSeconds.min);
  });

  it('cost per pick amortizes over the stated life', () => {
    const out = computeEconomics(DEFAULT_INPUTS);
    expect(out.costPerPickUsd).toBeCloseTo(
      out.totalCellCost / (out.monthlyPicks * AMORTIZATION_MONTHS),
      10,
    );
  });

  it('payback verdict respects the target horizon', () => {
    expect(paysBackWithinTarget(null)).toBe(false);
    expect(paysBackWithinTarget(PAYBACK_TARGET_MONTHS)).toBe(true);
    expect(paysBackWithinTarget(PAYBACK_TARGET_MONTHS + 0.1)).toBe(false);
  });
});
