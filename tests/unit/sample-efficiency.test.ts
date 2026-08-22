import { describe, expect, it } from 'vitest';
import {
  ANCHORS,
  BUDGET_SPEC,
  DATA_SOURCES,
  DEFAULT_PARAMS,
  MINITAUR_CONTROL_STEPS,
  MINITAUR_SECONDS,
  OFFLINE_ONLY_ABOVE_HOURS,
  ON_POLICY_MAX_HOURS,
  QT_OPT_STEPS_PER_ROBOT_SECOND,
  ROBOT_STEPS_PER_SECOND,
  RUDIN_BATCH_STEPS,
  RUDIN_POLICY_UPDATES,
  RUDIN_RUN_SECONDS,
  SIM_STEPS_PER_SECOND,
  classifyFamily,
  computeLedger,
  formatDuration,
  formatRate,
  formatSteps,
  getDataSource,
  stepsPerSecond,
  timeFraction,
} from '../../lib/sample-efficiency';

describe('collection rates derive from the published measurements', () => {
  it('the simulation rate is Rudin batch x updates over the run time', () => {
    expect(SIM_STEPS_PER_SECOND).toBeCloseTo(
      (RUDIN_BATCH_STEPS * RUDIN_POLICY_UPDATES) / RUDIN_RUN_SECONDS,
      6,
    );
    // 4,096 x 24 x 1,500 steps in 1,200 s.
    expect(SIM_STEPS_PER_SECOND).toBeCloseTo(122_880, 0);
  });

  it('the single-robot rate is the Minitaur control steps over two hours', () => {
    expect(ROBOT_STEPS_PER_SECOND).toBeCloseTo(
      MINITAUR_CONTROL_STEPS / MINITAUR_SECONDS,
      6,
    );
    expect(ROBOT_STEPS_PER_SECOND).toBeCloseTo(22.22, 2);
  });

  it('linear fleet scaling is optimistic against the QT-Opt per-robot ceiling', () => {
    // The disclosure the instrument makes on screen has to be true: the
    // measured episodic-grasping rate is below the locomotion rate the
    // fleet model multiplies.
    expect(QT_OPT_STEPS_PER_ROBOT_SECOND).toBeLessThan(ROBOT_STEPS_PER_SECOND);
    expect(QT_OPT_STEPS_PER_ROBOT_SECOND).toBeCloseTo(4.03, 2);
  });

  it('a fleet collects N times a single robot', () => {
    expect(stepsPerSecond('fleet', 10)).toBeCloseTo(
      10 * stepsPerSecond('robot', 1),
      6,
    );
    expect(stepsPerSecond('sim', 99)).toBe(SIM_STEPS_PER_SECOND);
  });

  it('rejects an unknown source id', () => {
    expect(() => getDataSource('gpu' as never)).toThrow(/unknown data source/);
  });
});

describe('the verdict boundaries partition wall-clock into three families', () => {
  it('classifies at the two thresholds', () => {
    expect(classifyFamily(ON_POLICY_MAX_HOURS * 3600).family).toBe('on-policy');
    expect(classifyFamily(ON_POLICY_MAX_HOURS * 3600 + 1).family).toBe(
      'off-policy',
    );
    expect(classifyFamily(OFFLINE_ONLY_ABOVE_HOURS * 3600).family).toBe(
      'off-policy',
    );
    expect(classifyFamily(OFFLINE_ONLY_ABOVE_HOURS * 3600 + 1).family).toBe(
      'offline',
    );
  });

  it('names an exemplar algorithm per family', () => {
    expect(classifyFamily(60).exemplars).toMatch(/PPO/);
    expect(classifyFamily(10 * 3600).exemplars).toMatch(/SAC|TD3/);
    expect(classifyFamily(1e7).exemplars).toMatch(/CQL|IQL/);
  });
});

describe('the ledger converts one budget under every source', () => {
  it('at the default budget, simulation is on-policy and one robot is not', () => {
    const ledger = computeLedger(DEFAULT_PARAMS);
    const sim = ledger.rows.find((r) => r.id === 'sim')!;
    const robot = ledger.rows.find((r) => r.id === 'robot')!;
    expect(sim.verdict.family).toBe('on-policy');
    expect(robot.verdict.family).not.toBe('on-policy');
    // VAL-RL-040's factor-of-ten clause, in the model rather than the DOM.
    expect(robot.seconds / sim.seconds).toBeGreaterThan(10);
  });

  it('the factor of ten and the family change hold at a second budget too', () => {
    for (const budgetExponent of [BUDGET_SPEC.min, 6, 7, 9, BUDGET_SPEC.max]) {
      const ledger = computeLedger({ ...DEFAULT_PARAMS, budgetExponent });
      const sim = ledger.rows.find((r) => r.id === 'sim')!;
      const robot = ledger.rows.find((r) => r.id === 'robot')!;
      expect(
        robot.seconds / sim.seconds,
        `slowdown at 1e${budgetExponent}`,
      ).toBeGreaterThan(10);
      expect(
        robot.verdict.family,
        `verdict differs at 1e${budgetExponent}`,
      ).not.toBe(sim.verdict.family);
    }
  });

  it('the slowdown is the rate ratio and is 1 for simulation itself', () => {
    const ledger = computeLedger({ ...DEFAULT_PARAMS, source: 'robot' });
    expect(ledger.slowdownVsSim).toBeCloseTo(
      SIM_STEPS_PER_SECOND / ROBOT_STEPS_PER_SECOND,
      4,
    );
    expect(computeLedger(DEFAULT_PARAMS).slowdownVsSim).toBe(1);
  });

  it('a larger fleet is strictly faster and can cross a boundary', () => {
    const small = computeLedger({
      budgetExponent: 7,
      source: 'fleet',
      fleetSize: 2,
    });
    const large = computeLedger({
      budgetExponent: 7,
      source: 'fleet',
      fleetSize: 100,
    });
    expect(large.selected.seconds).toBeLessThan(small.selected.seconds);
    expect(large.selected.label).toBe('a fleet of 100 real robots');
  });

  it('holds one row per registered source, in registry order', () => {
    const ledger = computeLedger(DEFAULT_PARAMS);
    expect(ledger.rows.map((r) => r.id)).toEqual(
      DATA_SOURCES.map((s) => s.id),
    );
  });
});

describe('anchors are sourced measured points on a log timeline', () => {
  it('every anchor carries a visible label and a citation id', () => {
    expect(ANCHORS.length).toBeGreaterThanOrEqual(4);
    for (const anchor of ANCHORS) {
      expect(anchor.label.length, anchor.id).toBeGreaterThan(4);
      expect(anchor.citation, anchor.id).toMatch(/^[a-z0-9-]+$/);
      expect(anchor.seconds, anchor.id).toBeGreaterThan(0);
    }
  });

  it('anchor ids are unique', () => {
    expect(new Set(ANCHORS.map((a) => a.id)).size).toBe(ANCHORS.length);
  });

  it('the timeline fraction is monotone and clamped', () => {
    expect(timeFraction(0.01)).toBe(0);
    expect(timeFraction(1e12)).toBe(1);
    expect(timeFraction(1e4)).toBeGreaterThan(timeFraction(1e3));
  });
});

describe('formatters', () => {
  it('scales duration units', () => {
    expect(formatDuration(4.2)).toBe('4.2 s');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(240)).toBe('4.0 min');
    expect(formatDuration(7200)).toBe('2.0 h');
    expect(formatDuration(800 * 3600)).toBe('33.3 d');
    expect(formatDuration(1e9)).toBe('31.7 yr');
  });

  it('scales step counts and rates', () => {
    expect(formatSteps(1.6e8)).toBe('160M');
    expect(formatSteps(2.5e9)).toBe('2.50B');
    expect(formatSteps(160_000)).toBe('160k');
    expect(formatRate(SIM_STEPS_PER_SECOND)).toBe('123k steps/s');
    expect(formatRate(ROBOT_STEPS_PER_SECOND)).toBe('22 steps/s');
    expect(formatRate(4.03)).toBe('4.0 steps/s');
  });
});
