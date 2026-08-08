import { describe, expect, it } from 'vitest';
import {
  BEHAVIORS,
  TERMS,
  WEIGHT_MAX,
  classifyBehavior,
  defaultWeights,
  quadrupedPose,
  termContribution,
  weightedTotal,
  type Weights,
} from '@/lib/reward-shaping';

function weightsWith(patch: Partial<Weights>): Weights {
  return { ...defaultWeights(), ...patch };
}

describe('reward term set', () => {
  it('defines at least ten terms including the canonical locomotion set', () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(10);
    const labels = TERMS.map((t) => t.label.toLowerCase());
    for (const required of [
      'velocity tracking',
      'torque',
      'action-rate',
      'foot air time',
      'base height',
      'orientation',
      'joint limit',
      'collision',
      'slip',
      'termination',
    ]) {
      expect(
        labels.some((l) => l.includes(required)),
        `missing term containing "${required}"`,
      ).toBe(true);
    }
  });

  it('every term weight defaults within range and penalties are negative', () => {
    const defaults = defaultWeights();
    for (const t of TERMS) {
      expect(defaults[t.id]).toBeGreaterThanOrEqual(0);
      expect(defaults[t.id]).toBeLessThanOrEqual(WEIGHT_MAX);
      expect(Math.sign(termContribution(t, 1))).toBe(t.sign);
    }
  });
});

describe('weightedTotal', () => {
  it('is the sum of signed per-term contributions', () => {
    const w = defaultWeights();
    const expected = TERMS.reduce(
      (sum, t) => sum + termContribution(t, w[t.id]),
      0,
    );
    expect(weightedTotal(w)).toBeCloseTo(expected, 10);
  });

  it('dropping every weight to zero gives zero total', () => {
    const zeroed = Object.fromEntries(
      TERMS.map((t) => [t.id, 0]),
    ) as Weights;
    expect(weightedTotal(zeroed)).toBe(0);
  });
});

describe('classifyBehavior', () => {
  it('default weights produce a balanced gait', () => {
    expect(classifyBehavior(defaultWeights())).toBe('balanced');
  });

  it('torque penalty dominating velocity tracking freezes the robot', () => {
    expect(
      classifyBehavior(weightsWith({ torque: WEIGHT_MAX })),
    ).toBe('frozen');
  });

  it('foot air time reward dominating velocity tracking produces prancing', () => {
    expect(
      classifyBehavior(weightsWith({ airTime: WEIGHT_MAX })),
    ).toBe('prancing');
  });

  it('near-zero action-rate penalty produces chatter', () => {
    expect(classifyBehavior(weightsWith({ actionRate: 0 }))).toBe('chatter');
  });

  it('chatter outranks the other attractors when conditions overlap', () => {
    expect(
      classifyBehavior(
        weightsWith({ actionRate: 0, torque: WEIGHT_MAX, airTime: WEIGHT_MAX }),
      ),
    ).toBe('chatter');
  });

  it('every classified behavior has a name, status, and description', () => {
    for (const id of ['balanced', 'frozen', 'prancing', 'chatter'] as const) {
      expect(BEHAVIORS[id].name.length).toBeGreaterThan(0);
      expect(BEHAVIORS[id].status.length).toBeGreaterThan(0);
      expect(BEHAVIORS[id].description.length).toBeGreaterThan(0);
    }
  });
});

describe('quadrupedPose', () => {
  it('frozen pose is identical at every phase', () => {
    const a = quadrupedPose('frozen', 0.13);
    const b = quadrupedPose('frozen', 0.71);
    expect(a).toEqual(b);
  });

  it('balanced gait scrolls the ground and moves the feet', () => {
    const a = quadrupedPose('balanced', 0.1);
    const b = quadrupedPose('balanced', 0.6);
    expect(a.groundOffset).not.toBe(b.groundOffset);
    const feetA = Object.values(a.legs).map((l) => l.footDx);
    const feetB = Object.values(b.legs).map((l) => l.footDx);
    expect(feetA).not.toEqual(feetB);
  });

  it('prancing lifts all four feet together and bobs the body', () => {
    const mid = quadrupedPose('prancing', 0.25);
    for (const leg of Object.values(mid.legs)) {
      expect(leg.footDy).toBeGreaterThan(0);
    }
    const start = quadrupedPose('prancing', 0);
    expect(mid.bodyY).not.toBe(start.bodyY);
    expect(mid.groundOffset).toBe(0);
  });

  it('chatter oscillates faster than the stride cycle with small amplitude', () => {
    // Within a tenth of the nominal cycle the vibration has flipped sign:
    // high-frequency chatter, not a stride.
    const early = quadrupedPose('chatter', 0.02).legs.lf.footDx;
    const later = quadrupedPose('chatter', 0.1).legs.lf.footDx;
    expect(Math.abs(early)).toBeLessThanOrEqual(4);
    expect(Math.sign(early)).toBe(1);
    expect(Math.sign(later)).toBe(-1);
    expect(quadrupedPose('chatter', 0.1).groundOffset).toBe(0);
  });

  it('distinct behaviors produce distinct poses at the same phase', () => {
    const phase = 0.3;
    const poses = (
      ['balanced', 'frozen', 'prancing', 'chatter'] as const
    ).map((b) => JSON.stringify(quadrupedPose(b, phase)));
    expect(new Set(poses).size).toBe(4);
  });
});
