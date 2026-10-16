import { describe, expect, it } from 'vitest';
import {
  CAPS,
  CAP_S0,
  CAP_TRAVEL,
  FADER_X,
  MM_PER_PX,
  P,
  PARTS,
  SLOPE,
  TERM_IN_CHARGE,
  capS,
  capShift,
  onSlope,
  poseFor,
} from '@/components/iso/figures/reward-mixing-desk';
import { HIP_H } from '@/components/iso/figures/quadruped-rig';
import { iso } from '@/components/iso/iso-kit';
import {
  TERMS,
  WEIGHT_MAX,
  WEIGHT_MIN,
  classifyBehavior,
  defaultWeights,
  quadrupedPose,
  type BehaviorId,
} from '@/lib/reward-shaping';

const BEHAVIORS: BehaviorId[] = ['balanced', 'frozen', 'prancing', 'chatter'];
const PHASES = [0, 0.1, 0.25, 0.4, 0.5, 0.75, 0.9, 1 / 32];
const LEG_ORDER = ['rh', 'lh', 'rf', 'lf'] as const;

describe('reward mixing desk: the model behind the drawing', () => {
  it('draws the robot at the model pose, at 27 mm of hip height for the model 36 px', () => {
    expect(MM_PER_PX).toBeCloseTo(HIP_H / 36, 12);
    for (const behavior of BEHAVIORS) {
      for (const phase of PHASES) {
        const model = quadrupedPose(behavior, phase);
        const drawn = poseFor(behavior, phase);
        LEG_ORDER.forEach((leg, index) => {
          expect(drawn.feet[index]!.dx).toBeCloseTo(model.legs[leg].footDx * MM_PER_PX, 9);
          expect(drawn.feet[index]!.lift).toBeCloseTo(model.legs[leg].footDy * MM_PER_PX, 9);
          expect(drawn.feet[index]!.down).toBe(model.legs[leg].footDy <= 0.5);
        });
        expect(drawn.rise).toBeCloseTo(-model.bodyY * MM_PER_PX, 9);
        expect(drawn.roll).toBe(0);
        expect(drawn.travel).toBeCloseTo(model.groundOffset * MM_PER_PX, 9);
      }
    }
  });

  it('runs the belt only while the robot trots', () => {
    for (const behavior of BEHAVIORS) {
      const moves = PHASES.some((phase) => poseFor(behavior, phase).travel !== 0);
      expect(moves).toBe(behavior === 'balanced');
    }
    // The prance lifts the body and all four feet together; the freeze keeps every foot down.
    const top = poseFor('prancing', 0.25);
    expect(top.rise).toBeGreaterThan(0);
    expect(top.feet.every((foot) => !foot.down)).toBe(true);
    expect(poseFor('frozen', 0.4).feet.every((foot) => foot.down && foot.dx === 0)).toBe(true);
  });

  it('puts one fader per weight across the desk, in the sliders order', () => {
    expect(CAPS.map((cap) => cap.term)).toEqual(TERMS.map((term) => term.id));
    expect(FADER_X).toHaveLength(TERMS.length);
    for (let i = 1; i < FADER_X.length; i++) expect(FADER_X[i]!).toBeGreaterThan(FADER_X[i - 1]!);
  });

  it('slides each cap up its slot in proportion to its weight, from 0 at the front to the maximum at the back', () => {
    expect(capS(WEIGHT_MIN)).toBe(CAP_S0);
    expect(capS(WEIGHT_MAX)).toBeCloseTo(CAP_S0 + CAP_TRAVEL, 12);
    for (const weight of [0, 0.5, 1, 1.5, 2.7, 4]) {
      expect(capS(weight) - CAP_S0).toBeCloseTo((CAP_TRAVEL * weight) / WEIGHT_MAX, 12);
      // The screen shift equals the world slide up the slope, projected.
      const shift = capShift(weight).match(/translate\(([-\d.]+) ([-\d.]+)\)/)!;
      const a = iso(onSlope(0, CAP_S0), P);
      const b = iso(onSlope(0, capS(weight)), P);
      expect(Number(shift[1])).toBeCloseTo(b[0] - a[0], 1);
      expect(Number(shift[2])).toBeCloseTo(b[1] - a[1], 1);
    }
    // Up the slope means back and up.
    expect(SLOPE[1]).toBeLessThan(0);
    expect(SLOPE[2]).toBeGreaterThan(0);
  });

  it('lights the fader in charge of each walk: the task while it trots, else the weight that tipped it', () => {
    const base = defaultWeights();
    expect(classifyBehavior(base)).toBe('balanced');
    expect(TERM_IN_CHARGE.balanced).toBe('velTrack');
    for (const [behavior, change] of [
      ['frozen', { torque: WEIGHT_MAX }],
      ['prancing', { airTime: WEIGHT_MAX }],
      ['chatter', { actionRate: WEIGHT_MIN }],
    ] as const) {
      const weights = { ...base, ...change };
      expect(classifyBehavior(weights)).toBe(behavior);
      expect(Object.keys(change)).toEqual([TERM_IN_CHARGE[behavior]]);
      // Putting that one fader back restores the trot.
      expect(classifyBehavior({ ...weights, [TERM_IN_CHARGE[behavior]]: base[TERM_IN_CHARGE[behavior]] })).toBe('balanced');
    }
  });

  it('draws no words, only parts', () => {
    const kinds = new Set(PARTS.map((part) => part.kind));
    for (const kind of kinds) expect(['solid', 'line', 'dots', 'wire', 'fill', 'slot']).toContain(kind);
    expect(JSON.stringify(PARTS)).not.toMatch(/<text|<title|<desc|foreignObject/);
  });
});
