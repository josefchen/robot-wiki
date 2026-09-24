import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as model from '../../lib/parallel-sim';
import { loadLocalBasisContext, recomputeLocalDerivation, validateLocalBasisPlan } from '../../lib/audit-local-basis';
import { CITATIONS } from '../../data/citations';
import { ARTICLE, UNIT, artifact, cases, dependencies, oracle, save } from '../../audit/evidence/parallel-local-20260923/support';

describe('parallel18 independent authored evidence', () => {
  it('discloses the entire chosen budget and cost model, not a measured run', () => {
    const body = readFileSync(ARTICLE, 'utf8');
    for (const text of ['authored fixed-transitions model', '220 million', '49 logarithmically spaced', '0.000004', '0.000022', 'CPU toggle off', 'not a benchmark']) expect(body).toContain(text);
  });
  for (const envs of [64, 4096, 16384]) for (const cpu of [false, true]) {
    it(`independently checks ${envs} environments, CPU ${cpu}`, () => {
      const o = oracle(envs, cpu);
      expect(model.wallClockSeconds(envs, cpu)).toBeCloseTo(o.seconds, 9);
      expect(model.throughputFps(envs, cpu)).toBeCloseTo(o.fps, 7);
      expect(model.iterationsToTarget(envs)).toBeCloseTo(o.iterations, 9);
      const b = model.iterationBreakdown(envs, cpu);
      for (const key of ['simSeconds', 'learnSeconds', 'cpuSeconds', 'totalSeconds'] as const) expect(b[key]).toBeCloseTo(o.breakdown[key], 12);
      expect(model.curvePoints(cpu)).toEqual(o.curve);
      if (cpu) expect(model.simulationOvertakeEnvs(cpu)).toBeNull();
      else expect(model.simulationOvertakeEnvs(cpu)).toBeCloseTo(12500, 8);
      expect([model.formatEnvs(envs), model.formatWallClock(model.wallClockSeconds(envs, cpu)), model.formatFps(model.throughputFps(envs, cpu))]).toEqual(o.display);
      expect(o.seconds * o.fps).toBeCloseTo(220_000_000, 5);
      expect(model.wallClockSeconds(envs, cpu)).not.toBeCloseTo(147_456_000 / o.fps, 1);
    });
  }
  it('requires the full typed plan and rejects missing proof, part, basis, mount and review', () => {
    const ctx = loadLocalBasisContext(process.cwd(), ['/rl-sim2real/parallel-sim-rl/', '/rl-sim2real/reward-design-mpc/', '/rl-sim2real/sim2real-transfer/']);
    const plan = ctx.catalog.plans.find(p => p.originalId === 'audit/rl-sim2real.md:parallel-sim-rl:18');
    expect(plan).toBeDefined();
    if (!plan) return;
    expect(plan.parts).toHaveLength(12);
    expect(plan.parts.filter(p => p.kind === 'external-source')).toHaveLength(4);
    expect(plan.parts.filter(p => p.kind === 'observed-behavior').flatMap(p => p.requiredObservations)).toHaveLength(8);
    const ids = new Set(CITATIONS.map(c => c.id));
    const scalar = { citationId: '', sourceUrl: '', supportingPassage: '' };
    expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id, scalar, ids, ctx).failures).toEqual([]);
    for (const what of ['part', 'proof', 'basis', 'mount', 'review']) {
      const broken = structuredClone(ctx);
      const p = broken.catalog.plans.find(p => p.id === plan.id)!;
      if (what === 'part') p.parts.shift();
      if (what === 'proof') broken.catalog.proofs = broken.catalog.proofs.filter(v => v.id !== 'p18-parameters');
      if (what === 'basis') broken.catalog.proofs.find(v => v.id === 'p18-64-on')!.bases = [];
      if (what === 'mount') p.mounts = [];
      if (what === 'review') p.currentCells.note += ' drift';
      expect(validateLocalBasisPlan(p, p.currentCells, p.id, scalar, ids, broken).failures.length).toBeGreaterThan(0);
    }
  });
  it.runIf(process.env.PARALLEL_WRITE_NUMERIC === '1')('records final native outputs after independent checks', () => {
    const startedAt = new Date().toISOString();
    const results = cases.map(c => {
      const expected = recomputeLocalDerivation(c.recipe);
      if (c.recipe.mode === 'parameters') {
        expect(expected.values).toEqual({
          envs: 4096, cpuBound: false, samples: 49,
          authoredDomainBasis: 'Illustrative model environment bounds and CPU toggle choices, not measured throughput.',
          authoredDomains: { envs: { min: 64, max: 16384 }, cpuBound: { off: false, on: true } },
          transitions: 220_000_000, rollout: 24, costs: [0.02, 0.000004, 0.04, 0.03, 0.000022],
          markerX: [{ id: 'flat', envs: 4096 }, { id: 'uneven', envs: 4096 }],
        });
      } else {
        const o = oracle(c.recipe.inputs.envs, c.recipe.inputs.cpuBound);
        const v = expected.values as Record<string, unknown>;
        for (const key of ['seconds', 'fps', 'iterations'] as const) expect(v[key]).toBeCloseTo(o[key], 7);
        expect(v.curve).toEqual(o.curve);
        expect(v.display).toEqual(o.display);
        if (o.crossover === null) expect(v.crossover).toBeNull();
        else expect(v.crossover).toBeCloseTo(o.crossover, 8);
      }
      return { id: c.id, recipe: c.recipe, expected, dependencies: dependencies() };
    });
    save('numeric-run.json', {
      command: 'NODE_DISABLE_COMPILE_CACHE=1 PARALLEL_WRITE_NUMERIC=1 node_modules/.bin/vitest run tests/unit/parallel-local-evidence.test.ts -t "records final native outputs" --no-file-parallelism',
      runner: 'vitest', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
      startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(UNIT), cases: results,
    });
  });
});
