import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ARTICLE, UNIT, ROOT, rewardDisclosure, eurekaDisclosure, defaults,
  rewardCases, rewardRecipe, eurekaRecipe, extract, dependencies, save, artifact,
} from '../../audit/evidence/reward-local-20260923/proof-support';
import { classifyBehavior, quadrupedPose } from '../../lib/reward-shaping';
import { loadLocalBasisContext, validateLocalBasisPlan } from '../../lib/audit-local-basis';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';

describe('reward local evidence', () => {
  it('discloses the authored reward and complete scripted Eureka transcript to readers', () => {
    const article = readFileSync(ARTICLE, 'utf8');
    expect(article).toContain(rewardDisclosure);
    expect(article).toContain(eurekaDisclosure);
    expect(article).not.toContain("Each generation's mutation is justified by what the training statistics showed");
  });

  it('independently checks and records parameters, arithmetic, classification and diffs', () => {
    const startedAt = new Date().toISOString();
    const rewardParameters = extract({ id: 'reward', mode: 'parameters', inputs: {} });
    const parameters = rewardParameters.values as {
      weights: typeof defaults; terms: { id: string; label: string; sign: number; magnitude: number; defaultWeight: number }[];
      weightRange: number[]; threshold: number; dominance: number;
    };
    expect(parameters.weights).toEqual(defaults);
    expect(parameters.terms.map(t => t.id)).toEqual(Object.keys(defaults));
    expect(parameters.terms.map(t => t.sign)).toEqual([1, 1, -1, -1, -1, -1, -1, 1, -1, 1, -1, -1]);
    expect(parameters.terms.map(t => t.magnitude)).toEqual([1, 0.5, 1, 0.5, 1, 1, 1, 0.5, 0.8, 0.6, 0.8, 1.5]);
    expect(parameters.terms.map(t => t.defaultWeight)).toEqual(Object.values(defaults));
    expect(parameters.terms[10].label).toBe('Foot stumble penalty');
    expect(parameters.weightRange).toEqual([0, 4, 0.1]);
    expect([parameters.threshold, parameters.dominance]).toEqual([2.5, 2]);
    expect(classifyBehavior({ ...defaults, actionRate: 0.2, torque: 4, airTime: 4 })).toBe('chatter');
    expect(classifyBehavior({ ...defaults, actionRate: 0.3, torque: 4, airTime: 4 })).toBe('frozen');
    expect(quadrupedPose('frozen', 0)).toEqual(quadrupedPose('frozen', 0.75));
    const rows: { id: string; recipe: unknown; expected: ReturnType<typeof extract>; dependencies: ReturnType<typeof dependencies> }[] = [];
    const add = (id: string, recipe: unknown, family: 'reward' | 'eureka') =>
      rows.push({ id, recipe, expected: extract(recipe), dependencies: dependencies(family, UNIT) });
    for (const id of ['r4-parameters', 'r5-parameters']) add(id, { id: 'reward', mode: 'parameters', inputs: {} }, 'reward');
    const names = Object.keys(rewardCases) as (keyof typeof rewardCases)[];
    const behaviors = ['balanced', 'frozen', 'prancing', 'chatter', 'balanced', 'frozen'];
    const totals = [-5.52, -8.72, -3.48, -4.72, -5.72, -6.68];
    names.forEach((name, i) => {
      const w = rewardCases[name];
      // A separate explicit dot product, not weightedTotal/termContribution.
      const independent = w.velTrack + 0.5 * w.yawTrack - w.torque - 0.5 * w.jointAccel
        - w.actionRate - w.jointLimit - w.collision + 0.5 * w.baseHeight
        - 0.8 * w.orientation + 0.6 * w.airTime - 0.8 * w.stumble - 1.5 * w.termination;
      const expected = extract(rewardRecipe(name)).values as { total: number; behavior: string; display: string[]; pose: { groundOffset: number; legs: object } };
      expect(independent).toBeCloseTo(totals[i], 12);
      expect(expected.total).toBeCloseTo(independent, 12);
      expect(expected.display).toEqual([totals[i].toFixed(2)]);
      expect(expected.behavior).toBe(behaviors[i]);
      expect(expected.pose.groundOffset).toBe(0);
      expect(Object.keys(expected.pose.legs)).toEqual(['lf', 'rf', 'lh', 'rh']);
      add(`r5-${name}`, rewardRecipe(name), 'reward');
    });
    add('r4-default', rewardRecipe('default'), 'reward');
    const eureka = extract({ id: 'eureka', mode: 'parameters', inputs: {} }).values as {
      task: string; generations: { index: number; fitness: number; code: string[]; stats: { label: string; value: string }[]; reflection: string }[];
    };
    expect(eureka.task).toBe('quadruped forward walking at 1.0 m/s');
    expect(eureka.generations.map(g => g.index)).toEqual([0, 1, 2]);
    expect(eureka.generations.map(g => g.fitness)).toEqual([0.31, 0.58, 0.86]);
    expect(eureka.generations.map(g => g.stats.map(s => s.value))).toEqual([
      ['0.4 s', '2.8 m/s', '100%', '3%'],
      ['20.0 s (max)', '0.02 m/s', '0%', '1%'],
      ['20.0 s (max)', '0.12 m/s', '2%', '81%'],
    ]);
    add('r11-parameters', { id: 'eureka', mode: 'parameters', inputs: {} }, 'eureka');
    for (let next = 0; next < 3; next++) {
      const previous = Math.max(0, next - 1);
      const expected = extract(eurekaRecipe(next)).values as { display: string[]; diff: { type: string; text: string }[] };
      expect(expected.display).toEqual([`Generation ${next} of 2`, ['0.31', '0.58', '0.86'][next]]);
      // Each side is reconstructed independently from the diff; every line,
      // including repeated lines, must survive with its original ordering.
      expect(expected.diff.filter(l => l.type !== 'add').map(l => l.text)).toEqual(eureka.generations[previous].code);
      expect(expected.diff.filter(l => l.type !== 'del').map(l => l.text)).toEqual(eureka.generations[next].code);
      expect(expected.diff.filter(l => l.type === 'del').map(l => l.text)).toEqual(
        next === 0 ? [] : next === 1 ? ['    return obs.base_lin_vel_x'] : ['    speed = obs.base_lin_vel_x', '    return speed + alive + fall'],
      );
      add(`r11-generation-${next}`, eurekaRecipe(next), 'eureka');
    }
    // No writes on ordinary regression runs; evidence production is explicit.
    if (process.env.REWARD_LOCAL_CAPTURE === '1') {
      save('numeric-run.json', {
        startedAt, endedAt: new Date().toISOString(), cwd: ROOT, runner: 'vitest',
        command: process.env.REWARD_LOCAL_COMMAND, environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
        test: artifact(UNIT), cases: rows,
      });
    }
  });

  it('requires all three mixed plans and every prepared external/local obligation', () => {
    const context = loadLocalBasisContext(ROOT, publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
    const plans = context.catalog.plans.filter(p => p.articleSlug === 'reward-design-mpc');
    expect(plans.map(p => p.originalId)).toEqual([4, 5, 11].map(n => `audit/rl-sim2real.md:reward-design-mpc:${n}`));
    expect(plans.map(p => p.id)).toEqual(['reward-local-r4-20260923', 'reward-local-r5-20260923', 'reward-local-r11-20260923']);
    expect(plans.map(p => p.parts.length)).toEqual([5, 7, 7]);
    expect(plans.map(p => context.catalog.proofs.filter(proof => proof.planId === p.id).length)).toEqual([3, 11, 8]);
    for (const plan of plans) {
      expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id, {
        citationId: '', sourceUrl: '', supportingPassage: '',
      }, new Set(CITATIONS.map(c => c.id)), context).failures).toEqual([]);
      expect(plan.evidence.every(e => !e.supportingPassage.includes('REPO TEXT'))).toBe(true);
    }
  });

  it('rejects a missing external passage or stale real review without modifying artifacts', () => {
    const context = loadLocalBasisContext(ROOT, publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
    const plans = context.catalog.plans.filter(p => p.id === 'reward-local-r4-20260923');
    expect(plans).toHaveLength(1);
    const plan = structuredClone(plans[0]);
    plan.evidence[0].supportingPassage = rewardDisclosure;
    const scalar = { citationId: '', sourceUrl: '', supportingPassage: '' };
    expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id, scalar,
      new Set(CITATIONS.map(c => c.id)), context).failures.length).toBeGreaterThan(0);
    const unreviewed = structuredClone(plans[0]);
    unreviewed.planReview = null;
    expect(validateLocalBasisPlan(unreviewed, unreviewed.currentCells, unreviewed.id, scalar,
      new Set(CITATIONS.map(c => c.id)), context).failures).toContain('local basis: missing/stale semantic review');
  });
});
