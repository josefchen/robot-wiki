import { describe, expect, it } from 'vitest';
import {
  BLOCK_TOP,
  CLEARANCE_MM,
  CYCLE_SECONDS,
  DECK_TOP,
  FLOOR_UNITS,
  FOOT_R,
  HIP_Z,
  HOLE_R,
  HOLE_UNITS,
  LEG_LIMIT_MM,
  PARTS,
  PEG_R,
  SHIFT_STOP_MM,
  SHIN,
  THIGH,
  TIP_IN,
  TIP_LIFTED,
  TIP_ON_RIM,
  cycleAt,
  dropAt,
  footGap,
  frontFootZ,
  legsReach,
  movingAt,
  pegFits,
  restPose,
  restingPitch,
  shiftAt,
  type BenchPart,
} from '@/components/iso/figures/contact-error-bench';
import { MAX_ERROR_MM, SCENARIOS, outcomeFor } from '@/lib/contact-geometry';

const ERRORS = [0, 0.2, 0.5, 0.51, 1, 2, 5, 12, 19.9, 20, 20.1, 25, 30];
const allParts = (errorMm: number): BenchPart[] => {
  const moving = movingAt(restPose(errorMm));
  return Object.values(moving).flat();
};

describe('contact-error bench model', () => {
  it('takes its tolerances from the contact model and draws each gap at its own scale', () => {
    expect(LEG_LIMIT_MM).toBe(SCENARIOS.locomotion.toleranceMm);
    expect(CLEARANCE_MM).toBe(SCENARIOS.manipulation.toleranceMm);
    expect(dropAt(2)).toBeCloseTo(2 * FLOOR_UNITS, 9);
    expect(dropAt(MAX_ERROR_MM + 5)).toBeCloseTo(MAX_ERROR_MM * FLOOR_UNITS, 9);
    expect(shiftAt(0.25)).toBeCloseTo(0.25 * HOLE_UNITS, 9);
    // The hole's shift stops at four clearances; past it the peg is off the hole altogether.
    expect(SHIFT_STOP_MM).toBe(4 * CLEARANCE_MM);
    expect(shiftAt(25)).toBeCloseTo(shiftAt(SHIFT_STOP_MM), 9);
    // The drawn hole leaves exactly one clearance round the peg.
    expect(HOLE_R - PEG_R).toBeCloseTo(CLEARANCE_MM * HOLE_UNITS, 9);
  });

  it('agrees with the contact model on every outcome', () => {
    for (const e of ERRORS) {
      expect(legsReach(e)).toBe(outcomeFor(SCENARIOS.locomotion, e) === 'ok');
      expect(pegFits(e)).toBe(outcomeFor(SCENARIOS.manipulation, e) === 'ok');
    }
  });

  it('lets the front feet reach the plate exactly up to the legs’ tolerance, and leaves them short past it', () => {
    // The legs' reach beyond standing is the tolerance at the floor's scale.
    expect(THIGH + SHIN - (HIP_Z - DECK_TOP - FOOT_R)).toBeCloseTo(LEG_LIMIT_MM * FLOOR_UNITS, 6);
    for (const e of ERRORS) {
      const drop = dropAt(e);
      if (legsReach(e)) expect(footGap(drop)).toBeCloseTo(0, 6);
      else expect(footGap(drop)).toBeGreaterThan(0);
      expect(frontFootZ(drop)).toBeGreaterThanOrEqual(DECK_TOP - drop);
    }
  });

  it('puts the peg in the hole while the shift is inside the clearance, and on the block’s top past it', () => {
    for (const e of ERRORS) {
      const pose = restPose(e);
      expect(pose.tip).toBe(pegFits(e) ? TIP_IN : TIP_ON_RIM);
      // A peg that misses rests on the top beside the hole: its centre is off by more than the clearance.
      if (!pegFits(e)) expect(pose.shift).toBeGreaterThan(HOLE_R - PEG_R);
      else expect(pose.shift).toBeLessThanOrEqual(HOLE_R - PEG_R + 1e-9);
    }
    expect(TIP_IN).toBeLessThan(BLOCK_TOP);
    expect(TIP_ON_RIM).toBe(BLOCK_TOP);
  });

  it('lays a fallen robot’s front on the plate', () => {
    for (const e of [20.1, 25, 30]) {
      const pitch = restingPitch(dropAt(e));
      expect(pitch).toBeGreaterThan(0);
      expect(pitch).toBeLessThan((60 * Math.PI) / 180);
      expect(restPose(e).fall).toBe(1);
    }
    expect(restPose(20).fall).toBe(0);
  });

  it('runs a test from any pose to the new rest pose, smoothly, lifting the peg clear while the hole moves', () => {
    for (const [a, b] of [[2, 0.5], [0.5, 2], [2, 25], [25, 0.2], [12, 19]] as const) {
      const from = restPose(a);
      expect(cycleAt(from, b, 0)).toEqual(from);
      expect(cycleAt(from, b, CYCLE_SECONDS)).toEqual(restPose(b));
      let last = cycleAt(from, b, 0);
      for (let t = 0.01; t <= CYCLE_SECONDS + 1e-9; t += 0.01) {
        const pose = cycleAt(from, b, t);
        for (const key of ['drop', 'shift', 'tip', 'fall'] as const) expect(Math.abs(pose[key] - last[key])).toBeLessThan(1.5);
        // While the hole moves under it, the peg is above the block.
        if (Math.abs(pose.shift - last.shift) > 1e-9) expect(pose.tip).toBeGreaterThanOrEqual(BLOCK_TOP);
        last = pose;
      }
    }
    // Interrupted halfway, a new test starts from where the bench stands.
    const mid = cycleAt(restPose(2), 25, CYCLE_SECONDS / 2);
    expect(cycleAt(mid, 0.5, 0)).toEqual(mid);
    expect(cycleAt(mid, 0.5, CYCLE_SECONDS)).toEqual(restPose(0.5));
    expect(TIP_LIFTED).toBeGreaterThan(BLOCK_TOP);
  });

  it('draws one lit part, the peg, and the same parts in every pose, with no words', () => {
    const counts = new Set<number>();
    for (const e of ERRORS) {
      const parts = allParts(e);
      counts.add(parts.length);
      const lit = parts.filter((part) => part.kind === 'solid' && part.lit);
      expect(lit.map((part) => (part as { name?: string }).name).sort()).toEqual(['peg', 'peg-tip']);
    }
    expect(counts.size).toBe(1);
    const markup = JSON.stringify([PARTS, allParts(2)]);
    expect(markup).not.toMatch(/<text|<title|<desc|foreignObject/);
  });

  it('sets both fixtures with one knob, and marks where each standing foot meets the floor', () => {
    for (const e of ERRORS) {
      const moving = movingAt(restPose(e));
      // One knob, on the line shaft that drives both the jack and the cross-slide.
      expect(Object.values(moving).flat().filter((part) => part.kind === 'solid' && part.name === 'error-knob')).toHaveLength(1);
      // A contact patch under each foot that stands; a robot that lost its footing leaves none.
      const patches = moving.robot.filter((part) => part.kind === 'face' && part.d !== '');
      expect(patches).toHaveLength(legsReach(e) ? 4 : 0);
    }
  });

  it('names the four feet the contact model counts', () => {
    const names = allParts(2)
      .map((part) => (part.kind === 'solid' ? part.name : undefined))
      .filter((name): name is string => Boolean(name && name.startsWith('foot-')));
    expect(names.sort()).toEqual(['foot-front-far', 'foot-front-near', 'foot-hind-far', 'foot-hind-near']);
    expect(names).toHaveLength(SCENARIOS.locomotion.contacts.length);
  });
});
