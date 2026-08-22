/**
 * Deployment-economics model for the industrial-deployment module.
 *
 * A robot cell is priced as a multiple of the robot's purchase price, and
 * its economics are decided by ratios the ML literature rarely names: the
 * share of elapsed time spent productively, the time each failure costs,
 * and the payback period an operations buyer requires. This module holds
 * the pure arithmetic behind the DeploymentEconomics calculator so the
 * prose, the component, and the tests share one source.
 *
 * Every default is either sourced (see the module's citations and the
 * calculator caption) or labelled an assumption in the rendered caption;
 * the constants below carry comments saying which is which.
 *
 * Unit-tested in tests/unit/deployment-economics.test.ts.
 */

export interface EconomicsInputs {
  /** Robot purchase price in USD. */
  robotCost: number;
  /** Integration cost as a multiple of the robot price (1 = none). */
  integrationMultiple: number;
  /** Seconds for one full pick cycle at the cell's designed pace. */
  cycleTimeSeconds: number;
  /** Share of elapsed time the cell is up, in percent. */
  uptimePercent: number;
  /** Per-pick success rate, in percent (failures are cleared as jams). */
  successRatePercent: number;
  /** Seconds a human needs to clear one jam or rejected pick. */
  jamClearSeconds: number;
  /** Fully loaded wage of the displaced picker, USD per hour. */
  wageUsdPerHour: number;
}

export interface TimeBreakdown {
  /** Seconds per elapsed hour spent completing good pick cycles. */
  productive: number;
  /** Seconds per elapsed hour lost to clearing jams. */
  jamClearing: number;
  /** Seconds per elapsed hour lost to downtime (the uptime gap). */
  downtime: number;
}

export interface EconomicsOutputs {
  /** Robot plus integration, in USD. */
  totalCellCost: number;
  /** Fraction of picks that fail and need clearing, in percent. */
  jamRatePercent: number;
  /** Cycle time plus amortized jam-clearing time, in seconds per pick. */
  effectiveSecondsPerPick: number;
  /** Good picks per elapsed hour, net of jams and downtime. */
  netPicksPerHour: number;
  /** Good picks per month at ROBOT_HOURS_PER_MONTH. */
  monthlyPicks: number;
  /** Displaced labour value per month, in USD. */
  monthlyLaborValue: number;
  /** Amortized cell cost per good pick, in USD. */
  costPerPickUsd: number;
  /** Months until labour savings repay the cell, or null if never. */
  paybackMonths: number | null;
  /** Where each elapsed hour goes. Sums to 3600. */
  timeBreakdown: TimeBreakdown;
}

/**
 * Hours the cell is scheduled per month: 24 x 365 / 12, rounded. An
 * ASSUMPTION: a lights-out cell can in principle run the whole calendar,
 * and the calculator values the picking it outputs, not the shifts a
 * facility happens to staff today. Labelled in the calculator caption.
 */
export const ROBOT_HOURS_PER_MONTH = 730;

/**
 * Amortization life for the cost-per-pick readout, in months. An
 * ASSUMPTION aligned with the 5-year horizon automation budgets commonly
 * use; it sets cost per pick only, never payback. Labelled in the caption.
 */
export const AMORTIZATION_MONTHS = 60;

/**
 * The payback horizon an operations buyer is modeled as requiring, in
 * months. An ASSUMPTION: vendor guidance for palletizing cells quotes
 * 12-24 month paybacks in multi-shift operation, so 24 months is a
 * defensible "acceptable" bar and the verdict readout names it. Labelled
 * in the caption.
 */
export const PAYBACK_TARGET_MONTHS = 24;

/** Seconds in an hour; exported for tests of the time breakdown. */
export const SECONDS_PER_HOUR = 3600;

/** Defaults. Sourcing for each value is documented in the calculator's
 * caption and the module prose; see content/data-hardware/
 * industrial-deployment.mdx. */
export const DEFAULT_INPUTS: EconomicsInputs = {
  robotCost: 80_000,
  integrationMultiple: 2.5,
  cycleTimeSeconds: 6,
  uptimePercent: 95,
  successRatePercent: 99.9,
  jamClearSeconds: 15,
  wageUsdPerHour: 25,
};

/** Slider bounds, per input key. The success-rate ceiling is 99.9 (not
 * 100) on purpose: a perfect picker has no jams, which would make the
 * jam-clearing control a dead dial at the top of its range. */
export const INPUT_RANGES: Record<
  keyof EconomicsInputs,
  { min: number; max: number; step: number }
> = {
  robotCost: { min: 20_000, max: 250_000, step: 5_000 },
  integrationMultiple: { min: 1, max: 5, step: 0.1 },
  cycleTimeSeconds: { min: 2, max: 20, step: 0.5 },
  uptimePercent: { min: 80, max: 100, step: 0.5 },
  successRatePercent: { min: 90, max: 99.9, step: 0.1 },
  jamClearSeconds: { min: 5, max: 300, step: 5 },
  wageUsdPerHour: { min: 10, max: 80, step: 1 },
};

function clampToRange(key: keyof EconomicsInputs, value: number): number {
  const { min, max } = INPUT_RANGES[key];
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Clamp every input into its slider range so no control combination,
 * however it is driven, produces a nonsense model state. */
export function sanitizeInputs(inputs: EconomicsInputs): EconomicsInputs {
  const out = { ...inputs };
  for (const key of Object.keys(INPUT_RANGES) as Array<keyof EconomicsInputs>) {
    out[key] = clampToRange(key, inputs[key]);
  }
  return out;
}

export function computeEconomics(
  rawInputs: EconomicsInputs,
): EconomicsOutputs {
  const inputs = sanitizeInputs(rawInputs);
  const {
    robotCost,
    integrationMultiple,
    cycleTimeSeconds,
    uptimePercent,
    successRatePercent,
    jamClearSeconds,
    wageUsdPerHour,
  } = inputs;

  const totalCellCost = robotCost * integrationMultiple;
  const uptimeFraction = uptimePercent / 100;
  const jamRate = (100 - successRatePercent) / 100;

  // One failed pick in every 1/successRate picks must be cleared, so each
  // good pick carries jamRate x jamClearSeconds of clearing time on top of
  // its cycle.
  const jamOverheadPerPick = jamRate * jamClearSeconds;
  const effectiveSecondsPerPick = cycleTimeSeconds + jamOverheadPerPick;

  const availableSecondsPerHour = uptimeFraction * SECONDS_PER_HOUR;
  const netPicksPerHour = availableSecondsPerHour / effectiveSecondsPerPick;
  const monthlyPicks = netPicksPerHour * ROBOT_HOURS_PER_MONTH;

  // The cell is paced for the task, so a displaced picker is modeled as
  // taking the same nominal cycle time; the value of the cell's output is
  // the labour embodied in those picks at the wage being displaced.
  const monthlyLaborValue =
    (monthlyPicks * cycleTimeSeconds * wageUsdPerHour) / SECONDS_PER_HOUR;

  const lifetimePicks = monthlyPicks * AMORTIZATION_MONTHS;
  const costPerPickUsd = lifetimePicks > 0 ? totalCellCost / lifetimePicks : 0;
  const paybackMonths =
    monthlyLaborValue > 0 ? totalCellCost / monthlyLaborValue : null;

  const productive = availableSecondsPerHour - netPicksPerHour * jamOverheadPerPick;
  const timeBreakdown: TimeBreakdown = {
    productive: Math.max(0, productive),
    jamClearing: netPicksPerHour * jamOverheadPerPick,
    downtime: SECONDS_PER_HOUR - availableSecondsPerHour,
  };

  return {
    totalCellCost,
    jamRatePercent: jamRate * 100,
    effectiveSecondsPerPick,
    netPicksPerHour,
    monthlyPicks,
    monthlyLaborValue,
    costPerPickUsd,
    paybackMonths,
    timeBreakdown,
  };
}

/** True when the cell pays back inside the modeled buyer's horizon. */
export function paysBackWithinTarget(
  paybackMonths: number | null,
  targetMonths: number = PAYBACK_TARGET_MONTHS,
): boolean {
  return paybackMonths !== null && paybackMonths <= targetMonths;
}
