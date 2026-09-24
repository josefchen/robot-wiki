import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAITS, GAIT_ORDER, inStance, legPhase, stepPhase } from '../../lib/gait.ts';
import {
  COLLECTION_RATES, FRONTIER_HOURS, OXE_DURATION, OXE_SCALE_HOURS,
  ROBOT_POINTS, hoursPerYear, yearsToTarget,
} from '../../lib/data-scaling.ts';
import {
  DEFAULT_HUMAN_SPEED_M_S, INTRUSION_MARGIN_M, REACTION_TIME_S,
  brakingDistanceM, permittedRobotSpeedMs, protectiveSeparationM,
  separationTerms, stoppingTimeS,
} from '../../lib/safety-modes.ts';
import { compoundedSuccessRate } from '../../lib/reliability.ts';
import { LOCAL_BASIS_REQUIRED_TARGETS, recomputeLocalDerivation } from '../../lib/audit-local-basis.ts';

const read = (path: string) => readFileSync(path, 'utf8');

describe('final-seven corrected reader disclosures and independent arithmetic', () => {
  it('dispatches exactly the newly closed recipe targets', () => {
    expect([
      'audit/rl-sim2real.md:legged-locomotion:17',
      'audit/data-hardware.md:data-bottleneck:3',
      'audit/data-hardware.md:data-bottleneck:5',
      'audit/data-hardware.md:evaluation-crisis:1',
    ].map(id => LOCAL_BASIS_REQUIRED_TARGETS[id]?.recipe))
      .toEqual(['gait', 'data-scale', 'data-scale', 'reliability']);
  });
  it('removes universal gait modulation and declares the fixed timing examples', () => {
    const article = read('content/rl-sim2real/legged-locomotion.mdx');
    expect(article).toContain('authored illustrative duty factors: walk 0.75, trot 0.50, bound 0.45, and pronk 0.35');
    expect(article).not.toContain('classical and learned alike, modulate duty factor continuously with speed');
    expect(GAIT_ORDER.map(id => GAITS[id].dutyFactor)).toEqual([.75, .5, .45, .35]);
    for (const id of GAIT_ORDER) {
      expect(legPhase(GAITS[id], 'lf', 1)).toBeCloseTo(legPhase(GAITS[id], 'lf', 0));
      expect(typeof inStance(GAITS[id], 'lf', 0)).toBe('boolean');
    }
    // The implementation snaps to the 0.05 grid after wrapping, not 0.03.
    expect(stepPhase(.98, 1)).toBeCloseTo(.05);
  });

  it('keeps dataset counts separate from authored projection inputs', () => {
    const article = read('content/data-hardware/data-bottleneck.mdx');
    expect(article).toContain('The chart assigns it no hour estimate');
    expect(article).not.toContain('350 hours divided by 50 collectors happens to equal seven');
    expect(ROBOT_POINTS.some(point => point.id === 'oxe')).toBe(false);
    expect(OXE_DURATION.value).toBe('No hour estimate plotted');
    expect([OXE_SCALE_HOURS, FRONTIER_HOURS]).toEqual([10_000, 1_000_000]);
    expect(COLLECTION_RATES.map(rate => rate.hoursPerRigYear)).toEqual([1000, 7]);
    expect(hoursPerYear(10, 'droid-measured')).toBe(70);
    expect(yearsToTarget(10, 'droid-measured', 10_000)).toBeCloseTo(1000 / 7);
    expect(yearsToTarget(10, 'dedicated', 10_000)).toBe(1);
    expect(4 * 250).toBe(1000); // authored illustrative hours/day × days/year
  });

  it('qualifies episode arithmetic as constant conditional probability', () => {
    const article = read('content/data-hardware/evaluation-crisis.mdx');
    expect(article).toContain('same probability p of success conditional on all earlier decisions succeeding');
    expect(article).not.toContain('an order of magnitude apart in real capability');
    expect(100 * .95 ** 30).toBeCloseTo(21.463876784);
    expect(100 * .95 ** 100).toBeCloseTo(.592052922);
    expect(100 * .8 ** (1 / 5)).toBeCloseTo(95.635250);
    expect(100 * .8 ** (1 / 30)).toBeCloseTo(99.25895, 2);
    expect(100 * .95 ** 14).toBeCloseTo(48.767497);
    expect(100 * compoundedSuccessRate(.95, 30)).toBeCloseTo(100 * .95 ** 30);
  });

  it('qualifies the safety source and recomputes four terms independently', () => {
    const article = read('content/frontier/safety-and-assurance.mdx');
    expect(article).toContain('1200 mm for a single-height beam');
    expect(article).toContain('2000 mm/s may be more prudent');
    expect(article).toContain('A 100 Hz update period is 0.01 s');
    expect(article).not.toContain("the instrument's sourced constants come from");
    expect([INTRUSION_MARGIN_M, REACTION_TIME_S, DEFAULT_HUMAN_SPEED_M_S]).toEqual([.85, .1, 1.6]);
    for (const r of [0, 1, 2]) for (const h of [0, 1.6, 2]) {
      const reference = h * (.1 + r / 10) + .1 * r + r * r / 20 + .85 + .1;
      expect(stoppingTimeS(r)).toBeCloseTo(r / 10);
      expect(brakingDistanceM(r)).toBeCloseTo(r * r / 20);
      expect(protectiveSeparationM(r, h)).toBeCloseTo(reference);
      expect(separationTerms(r, h).totalM).toBeCloseTo(reference);
      const limit = permittedRobotSpeedMs(h, 1.6);
      if (reference <= 1.6 && r <= limit) expect(protectiveSeparationM(r, h)).toBeLessThanOrEqual(1.6);
    }
  });
  it('rejects out-of-range/untyped inputs and exposes only mounted safety mode readouts', () => {
    for (const recipe of [
      { id: 'data-scale', mode: 'derive', inputs: { rigs: 0, rateId: 'dedicated', targetHours: 10_000 } },
      { id: 'data-scale', mode: 'derive', inputs: { rigs: 10, rateId: 'droid-measured', targetHours: 350 } },
      { id: 'reliability', mode: 'derive', inputs: { perStep: .95, steps: 0, inverseTarget: .8 } },
      { id: 'reliability', mode: 'derive', inputs: { perStep: 1.2, steps: 30, inverseTarget: .8 } },
      { id: 'safety', mode: 'derive', inputs: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, displayMode: 'inverse' } },
    ]) expect(() => recomputeLocalDerivation(recipe)).toThrow();
    const input = { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6 };
    const distance = recomputeLocalDerivation({ id: 'safety', mode: 'derive',
      inputs: { ...input, displayMode: 'speed-separation' } }).values as { display: string[] };
    const contact = recomputeLocalDerivation({ id: 'safety', mode: 'derive',
      inputs: { ...input, displayMode: 'power-force' } }).values as { display: string[] };
    expect(distance.display).toEqual(['1.42 m']);
    expect(contact.display).toEqual(['316 N', '255 N']);
    expect([...distance.display, ...contact.display]).not.toContain('1.20 m/s');
  });
  it.runIf(process.env.FINAL_SEVEN_NUMERIC === '1')('records executed finite recipe outputs', () => {
    const parameters = ['gait', 'data-scale', 'reliability', 'safety']
      .map(id => ({ id, mode: 'parameters', inputs: {} }));
    const gait = ['walk', 'trot', 'bound', 'pronk'].flatMap(id =>
      [0, .25, .95, 1].map(phase => ({
        id: 'gait', mode: 'derive', inputs: { gait: id, phase, direction: 1 },
      })));
    const scale = [
      [10, 'droid-measured', 10_000], [10, 'dedicated', 10_000],
      [15, 'dedicated', 1_000_000], [1, 'droid-measured', 10_000],
      [500, 'dedicated', 1_000_000],
    ].map(([rigs, rateId, targetHours]) =>
      ({ id: 'data-scale', mode: 'derive', inputs: { rigs, rateId, targetHours } }));
    const evaluation = [[.95, 30], [.95, 100], [.95, 14], [.95, 5], [0, 1], [1, 1]]
      .map(([perStep, steps]) => ({ id: 'reliability', mode: 'derive',
        inputs: { perStep, steps, inverseTarget: .8 } }));
    const safety = [0, 1, 2].flatMap(robotSpeed => [0, 1.6, 2].map(humanSpeed => ({
      id: 'safety', mode: 'derive', inputs: {
        robotSpeed, humanSpeed, separation: 1.6, displayMode: 'speed-separation',
      },
    })));
    safety.push({ id: 'safety', mode: 'derive', inputs: {
      robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, displayMode: 'power-force',
    } });
    const results = [...parameters, ...gait, ...scale, ...evaluation, ...safety].map(recipe => ({
      recipe, output: recomputeLocalDerivation(recipe),
    }));
    expect(results).toHaveLength(41);
    const by = (id: string, mode: string) => results.filter(r => r.recipe.id === id && r.recipe.mode === mode);
    expect((by('data-scale', 'derive')[0].output.values as { display: string[] }).display).toEqual(['70 h/yr', '143 yr']);
    expect((by('reliability', 'derive')[0].output.values as { display: string[] }).display).toEqual(['21.5%']);
    writeFileSync('audit/evidence/final-seven-closure-20260923/numeric-results-final.json',
      JSON.stringify({ observedAt: new Date().toISOString(), results }, null, 2) + '\n', { flag: 'wx' });
  });
});
