import { describe, expect, it } from 'vitest';
import {
  BODY_CONTACT_STIFFNESS_N_PER_M,
  CONTACT_EFFECTIVE_MASS_KG,
  CONTACT_LIMIT_LABEL,
  CONTACT_LIMIT_N,
  DEFAULT_HUMAN_SPEED_M_S,
  DEFAULT_MODE,
  DEFAULT_ROBOT_SPEED_M_S,
  INTRUSION_MARGIN_M,
  MODES,
  POSITION_UNCERTAINTY_M,
  REACTION_TIME_S,
  ROBOT_DECELERATION_M_PER_S2,
  WORKCELL_SEPARATION_M,
  brakingDistanceM,
  forceLimitedSpeedMs,
  formatForce,
  formatMetres,
  formatSpeed,
  modeById,
  peakContactForceN,
  permittedRobotSpeedMs,
  protectiveSeparationM,
  separationTerms,
  stoppingTimeS,
  verdict,
} from '@/lib/safety-modes';
import {
  TRANSIENT_CONTACT_LIMIT_LABEL,
  TRANSIENT_CONTACT_LIMIT_N,
} from '@/lib/force-limits';

describe('collaborative modes', () => {
  it('names all four modes with a distinct explanatory constraint', () => {
    expect(MODES).toHaveLength(4);
    expect(MODES.map((m) => m.id)).toEqual([
      'monitored-stop',
      'hand-guiding',
      'speed-separation',
      'power-force',
    ]);
    const constraints = MODES.map((m) => m.constraint);
    expect(new Set(constraints).size).toBe(4);
    for (const mode of MODES) {
      expect(mode.constraint.split(/[.!?]\s/).length).toBeGreaterThanOrEqual(1);
      expect(mode.constraint.length).toBeGreaterThan(120);
    }
  });

  it('routes the two procedural modes to a stated constraint, not a number', () => {
    expect(modeById('monitored-stop').readout).toBe('stated');
    expect(modeById('hand-guiding').readout).toBe('stated');
    expect(modeById('speed-separation').readout).toBe('separation');
    expect(modeById('power-force').readout).toBe('force');
  });

  it('throws on an unknown mode id rather than returning undefined', () => {
    // @ts-expect-error deliberately outside the union
    expect(() => modeById('teleoperation')).toThrow(/unknown/);
  });
});

describe('separation model', () => {
  it('derives the stopping time and braking distance from the deceleration', () => {
    expect(stoppingTimeS(1)).toBeCloseTo(1 / ROBOT_DECELERATION_M_PER_S2, 10);
    expect(brakingDistanceM(1)).toBeCloseTo(
      1 / (2 * ROBOT_DECELERATION_M_PER_S2),
      10,
    );
    expect(stoppingTimeS(0)).toBe(0);
    expect(brakingDistanceM(0)).toBe(0);
  });

  it('composes S from the four bracketed terms of the published equation', () => {
    const t = separationTerms(1, 1.6);
    expect(t.humanTravelM).toBeCloseTo(1.6 * (0.1 + 0.1), 10);
    expect(t.robotReactionM).toBeCloseTo(1 * REACTION_TIME_S, 10);
    expect(t.brakingM).toBeCloseTo(0.05, 10);
    expect(t.marginM).toBeCloseTo(INTRUSION_MARGIN_M + POSITION_UNCERTAINTY_M, 10);
    expect(t.totalM).toBeCloseTo(
      t.humanTravelM + t.robotReactionM + t.brakingM + t.marginM,
      10,
    );
    expect(protectiveSeparationM(1, 1.6)).toBeCloseTo(1.42, 10);
  });

  it('reduces to the margin terms alone when nothing is moving', () => {
    expect(protectiveSeparationM(0, 0)).toBeCloseTo(
      INTRUSION_MARGIN_M + POSITION_UNCERTAINTY_M,
      10,
    );
  });

  it('increases strictly with robot speed across the slider range', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const values = samples.map((v) => protectiveSeparationM(v, DEFAULT_HUMAN_SPEED_M_S));
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  it('increases strictly with human approach speed', () => {
    const a = protectiveSeparationM(1, 0.5);
    const b = protectiveSeparationM(1, 1.0);
    const c = protectiveSeparationM(1, 1.6);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('grows faster than linearly in robot speed because braking is quadratic', () => {
    const base = protectiveSeparationM(0, 1.6);
    const one = protectiveSeparationM(1, 1.6) - base;
    const two = protectiveSeparationM(2, 1.6) - base;
    expect(two).toBeGreaterThan(2 * one);
  });
});

describe('permitted robot speed', () => {
  it('is the speed at which S exactly fills the workcell', () => {
    const v = permittedRobotSpeedMs(DEFAULT_HUMAN_SPEED_M_S);
    expect(v).toBeGreaterThan(0);
    expect(protectiveSeparationM(v, DEFAULT_HUMAN_SPEED_M_S)).toBeCloseTo(
      WORKCELL_SEPARATION_M,
      8,
    );
  });

  it('falls as the operator approaches faster', () => {
    expect(permittedRobotSpeedMs(0.5)).toBeGreaterThan(permittedRobotSpeedMs(1.6));
  });

  it('is zero when the margin terms alone overrun the cell', () => {
    expect(permittedRobotSpeedMs(1.6, 0.5)).toBe(0);
    expect(permittedRobotSpeedMs(1.6, INTRUSION_MARGIN_M + POSITION_UNCERTAINTY_M)).toBe(0);
  });
});

describe('contact-force model', () => {
  it('reads its limit from the shared module rather than a local copy', () => {
    expect(CONTACT_LIMIT_N).toBe(TRANSIENT_CONTACT_LIMIT_N);
    expect(CONTACT_LIMIT_LABEL).toBe(TRANSIENT_CONTACT_LIMIT_LABEL);
  });

  it('is the energy-balance impact force, linear in speed and zero at rest', () => {
    expect(peakContactForceN(0)).toBe(0);
    expect(peakContactForceN(1)).toBeCloseTo(
      Math.sqrt(BODY_CONTACT_STIFFNESS_N_PER_M * CONTACT_EFFECTIVE_MASS_KG),
      10,
    );
    expect(peakContactForceN(2)).toBeCloseTo(2 * peakContactForceN(1), 10);
  });

  it('inverts to a force-limited speed that hits the limit exactly', () => {
    const v = forceLimitedSpeedMs();
    expect(peakContactForceN(v)).toBeCloseTo(TRANSIENT_CONTACT_LIMIT_N, 8);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(DEFAULT_ROBOT_SPEED_M_S);
  });
});

describe('verdict', () => {
  it('always leaves monitored stop and hand guiding available', () => {
    for (const v of [0, 1, 2]) {
      for (const h of [0, 1.6, 2]) {
        const out = verdict(v, h);
        expect(out.satisfiedModes).toContain('monitored-stop');
        expect(out.satisfiedModes).toContain('hand-guiding');
      }
    }
  });

  it('permits separation monitoring but not force limiting at the default speeds', () => {
    const out = verdict(DEFAULT_ROBOT_SPEED_M_S, DEFAULT_HUMAN_SPEED_M_S);
    expect(out.separationSatisfied).toBe(true);
    expect(out.forceSatisfied).toBe(false);
    expect(out.satisfiedModes).toContain('speed-separation');
    expect(out.satisfiedModes).not.toContain('power-force');
    expect(out.summary).toMatch(/contact-force limit/);
  });

  it('permits force limiting at a slow enough robot speed', () => {
    const out = verdict(0.5, DEFAULT_HUMAN_SPEED_M_S);
    expect(out.forceSatisfied).toBe(true);
    expect(out.satisfiedModes).toContain('power-force');
  });

  it('drops separation monitoring once S overruns the cell', () => {
    const out = verdict(2, DEFAULT_HUMAN_SPEED_M_S);
    expect(protectiveSeparationM(2, DEFAULT_HUMAN_SPEED_M_S)).toBeGreaterThan(
      WORKCELL_SEPARATION_M,
    );
    expect(out.separationSatisfied).toBe(false);
    expect(out.satisfiedModes).not.toContain('speed-separation');
  });

  it('names the both-unavailable case explicitly', () => {
    const out = verdict(2, 2);
    expect(out.separationSatisfied).toBe(false);
    expect(out.forceSatisfied).toBe(false);
    expect(out.satisfiedModes).toEqual(['monitored-stop', 'hand-guiding']);
    expect(out.summary).toMatch(/Neither continuous-motion mode/);
  });

  it('writes a distinct summary for each of the four combinations', () => {
    const summaries = new Set([
      verdict(0.5, 0.5).summary,
      verdict(1, 1.6).summary,
      verdict(2, 2).summary,
    ]);
    expect(summaries.size).toBe(3);
  });
});

describe('formatting', () => {
  it('renders metres, speed and force with fixed precision', () => {
    expect(formatMetres(1.4249)).toBe('1.42 m');
    expect(formatSpeed(1)).toBe('1.00 m/s');
    expect(formatForce(316.22)).toBe('316 N');
  });
});

describe('defaults', () => {
  it('open on speed and separation monitoring with a moving robot', () => {
    expect(DEFAULT_MODE).toBe('speed-separation');
    expect(DEFAULT_ROBOT_SPEED_M_S).toBeGreaterThan(0);
    expect(DEFAULT_HUMAN_SPEED_M_S).toBe(1.6);
  });
});
