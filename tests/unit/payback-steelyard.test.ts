import { describe, expect, it } from 'vitest';
import {
  DISC_USD,
  HORIZON_MONTHS,
  MONTH,
  SCALE_MONTHS,
  SHORT_ARM,
  STACK_ROOM,
  TIP_DEGREES,
  balanceOf,
  beamParts,
  discStack,
  loadShift,
  onBeam,
  stackHeight,
  stackUsd,
  tiltWhileMoving,
} from '@/components/iso/figures/payback-steelyard';
import { DEFAULT_INPUTS, INPUT_RANGES, PAYBACK_TARGET_MONTHS, computeEconomics, type EconomicsInputs } from '@/lib/deployment-economics';

const sweep = (key: keyof EconomicsInputs) => {
  const { min, max } = INPUT_RANGES[key];
  return [min, (min + max) / 2, max].map((value) => ({ ...DEFAULT_INPUTS, [key]: value }));
};
const CASES: EconomicsInputs[] = [
  DEFAULT_INPUTS,
  { ...DEFAULT_INPUTS, successRatePercent: 99 },
  { ...DEFAULT_INPUTS, jamClearSeconds: 300 },
  { ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 300 },
  ...(Object.keys(INPUT_RANGES) as Array<keyof EconomicsInputs>).flatMap(sweep),
];

describe('payback steelyard: the model behind the beam', () => {
  it('balances where the cost on the short arm equals a month of value times the poise distance', () => {
    for (const inputs of CASES) {
      const out = computeEconomics(inputs);
      const { poise, tilt, onScale } = balanceOf(out.paybackMonths);
      if (onScale) {
        // cost x short arm = (one month of value) x (poise distance), with the arm graduated a month per MONTH.
        expect(out.totalCellCost * SHORT_ARM).toBeCloseTo(out.monthlyLaborValue * poise * MONTH, 3);
        expect(poise).toBe(out.paybackMonths);
        expect(tilt).toBe(0);
      } else {
        // Past the scale the poise sits on the end stop and the load wins: the beam rests tipped, long end up.
        expect(out.paybackMonths === null || out.paybackMonths > SCALE_MONTHS).toBe(true);
        expect(poise).toBe(SCALE_MONTHS);
        expect(tilt).toBe(TIP_DEGREES);
        expect(out.totalCellCost * SHORT_ARM).toBeGreaterThan(out.monthlyLaborValue * poise * MONTH);
      }
    }
    // The article's four cases, on the scale and inside the buyer's horizon collar.
    const months = [DEFAULT_INPUTS, CASES[1], CASES[2], CASES[3]].map((inputs) => balanceOf(computeEconomics(inputs).paybackMonths).poise.toFixed(2));
    expect(months).toEqual(['11.56', '11.82', '12.11', '17.30']);
    expect(HORIZON_MONTHS).toBe(PAYBACK_TARGET_MONTHS);
  });

  it('hangs the cost as slotted weights: the robot discs on top, the integration discs under them', () => {
    const discs = discStack(DEFAULT_INPUTS.robotCost, DEFAULT_INPUTS.integrationMultiple);
    // $80k robot and a 2.5x cell: 4 robot discs and 6 integration discs of $20k.
    expect(discs.filter((disc) => disc.kind === 'robot')).toHaveLength(4);
    expect(discs.filter((disc) => disc.kind === 'integration')).toHaveLength(6);
    expect(discs.every((disc) => disc.units === 1)).toBe(true);
    expect(stackUsd(discs)).toBe(200_000);
    expect(discs.findIndex((disc) => disc.kind === 'robot')).toBe(6);
    for (const inputs of CASES) {
      const stack = discStack(inputs.robotCost, inputs.integrationMultiple);
      const cost = inputs.robotCost * inputs.integrationMultiple;
      // Each share is drawn to the nearest disc, so the stack is within one disc per share of the cost.
      expect(Math.abs(stackUsd(stack) - cost), `${inputs.robotCost} x ${inputs.integrationMultiple}`).toBeLessThanOrEqual(DISC_USD);
      expect(stack.length).toBeLessThanOrEqual(30);
    }
    // Every cell the sliders reach hangs clear of the beam: heavier discs take over past ten light ones.
    for (let robot = INPUT_RANGES.robotCost.min; robot <= INPUT_RANGES.robotCost.max; robot += INPUT_RANGES.robotCost.step) {
      for (let multiple = INPUT_RANGES.integrationMultiple.min; multiple <= INPUT_RANGES.integrationMultiple.max + 1e-9; multiple += INPUT_RANGES.integrationMultiple.step) {
        const stack = discStack(robot, multiple);
        expect(stackHeight(stack), `${robot} x ${multiple.toFixed(1)}`).toBeLessThanOrEqual(STACK_ROOM);
        expect(Math.abs(stackUsd(stack) - robot * multiple)).toBeLessThanOrEqual(DISC_USD);
      }
    }
  });

  it('tips the beam only toward the heavier side while the poise travels, never past its rests', () => {
    for (const target of [0, 11.56, 17.3, 36]) {
      expect(tiltWhileMoving(target, target, 0)).toBe(0);
      for (const poise of [0, 6, 20, 36]) {
        const tilt = tiltWhileMoving(poise, target, 0);
        expect(Math.abs(tilt)).toBeLessThanOrEqual(TIP_DEGREES);
        // Short of the balance point the load is heavier: the long end rises.
        if (poise < target) expect(tilt).toBeGreaterThan(0);
        if (poise > target) expect(tilt).toBeLessThan(0);
      }
    }
    // The load rides the short arm's end: a tip with the long end up lowers it.
    expect(loadShift(0)).toEqual([0, 0, 0]);
    expect(loadShift(TIP_DEGREES)[2]).toBeLessThan(0);
    // The beam turns about the knife edge: the fulcrum stays put.
    expect(onBeam(0, TIP_DEGREES)).toEqual(onBeam(0, 0));
  });

  it('builds the same beam for the same balance, and puts the poise at its months on the scale', () => {
    const a = beamParts(0, 11.56);
    const b = beamParts(0, 11.56);
    expect(a).toEqual(b);
    const later = beamParts(0, 17.3);
    expect(later.index).not.toBe(a.index);
    // A month tick for each of the 36 months, a long one every six.
    expect(a.minor.split('M').length - 1 + a.major.split('M').length - 1).toBe(SCALE_MONTHS + 1);
    expect(a.major.split('M').length - 1).toBe(SCALE_MONTHS / 6 + 1);
  });
});
