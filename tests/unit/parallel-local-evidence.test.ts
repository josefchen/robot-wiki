import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as model from '../../lib/parallel-sim';
import {
  LOCAL_BASIS_REQUIRED_TARGETS, loadLocalBasisContext, localSceneRegistry, recomputeLocalDerivation, validateLocalBasisPlan,
} from '../../lib/audit-local-basis';
import { SCENE_TARGETS } from '../../lib/motion-scene-registry';
import { BATCH_SCALE_SCENE, batchScaleFrame, trainingTimeWords } from '../../components/motion/scenes/batch-scale';
import { beatSpans } from '../../components/motion/timeline';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { ARTICLE, UNIT, artifact, cases, dependencies, oracle, save } from '../../audit/evidence/parallel-local-20260923/support';

describe('parallel18 independent authored evidence', () => {
  it('discloses the entire chosen budget and cost model, not a measured run', () => {
    const body = readFileSync(ARTICLE, 'utf8');
    for (const text of ['illustrative calculation', '220-million-transition budget', 'assumed CPU-cost curve', 'near-four-minute time at 4,096 environments']) expect(body).toContain(text);
    expect(body).not.toContain('toy');
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
  // Six full plan validations: about 4-6 s alone, more under a loaded suite.
  it('requires the full typed plan and rejects missing proof, part, basis, mount and review', { timeout: 60_000 }, () => {
    const ctx = loadLocalBasisContext(process.cwd(), publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
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

describe('parallel18 BatchScale scene binding', () => {
  const root = process.cwd();
  const originalId = 'audit/rl-sim2real.md:parallel-sim-rl:18';
  const target = { component: 'BatchScale', recipe: 'batch-scale', mounts: [1], scene: 'batch-scale' } as const;
  const route = '/rl-sim2real/parallel-sim-rl/';
  const derive = (envs: 64 | 4096 | 16384, cpuBound: boolean) => recomputeLocalDerivation(
    { id: 'batch-scale', mode: 'derive', inputs: { envs, cpuBound } }).values as { seconds: number; words: string; display: string[] };
  // Independent wording: hours or minutes to one decimal, otherwise whole seconds.
  const words = (seconds: number) => seconds >= 3600 ? `${(seconds / 3600).toFixed(1)} hours`
    : seconds >= 60 ? `${(seconds / 60).toFixed(1)} minutes` : `${Math.round(seconds)} seconds`;

  it('recomputes every beat readout and method time the scene shows', () => {
    const beats = [
      ['one-batch', 64, '64 robots at once: 3.6 hours of training'],
      ['scale', 4096, '4,096 robots at once: 4.0 minutes of training'],
      ['cpu', 4096, '4,096 robots at once: 4.0 minutes of training'],
      ['recap', 16384, '16,384 robots at once: 1.5 minutes of training'],
    ] as const;
    const spans = beatSpans(BATCH_SCALE_SCENE.beats);
    expect(spans.map(span => span.beat.id)).toEqual(beats.map(([id]) => id));
    for (const [index, [, robots, readout]] of beats.entries()) {
      const frame = batchScaleFrame(spans[index].end);
      expect(frame.environments).toBe(robots);
      expect(`${model.formatEnvs(frame.environments)} robots at once: ${trainingTimeWords(frame.wallSeconds)} of training`).toBe(readout);
      expect(derive(robots, false).display[0]).toBe(readout);
    }
    for (const envs of [64, 4096, 16384] as const) for (const cpuBound of [false, true]) {
      const values = derive(envs, cpuBound);
      expect(values.seconds).toBeCloseTo(oracle(envs, cpuBound).seconds, 9);
      expect(values.words).toBe(words(oracle(envs, cpuBound).seconds));
      expect(values.words).toBe(trainingTimeWords(model.wallClockSeconds(envs, cpuBound)));
    }
    expect([64, 4096, 16384].map(envs => derive(envs as 64, false).display[1]))
      .toEqual(['64 robots, 3.6 hours', '4,096 robots, 4.0 minutes', '16,384 robots, 1.5 minutes']);
    expect([64, 4096, 16384].map(envs => derive(envs as 64, true).display))
      .toEqual([['3.6 hours'], ['7.3 minutes'], ['4.8 minutes']]);
    expect(() => recomputeLocalDerivation({ id: 'batch-scale', mode: 'derive', inputs: { envs: 2048, cpuBound: false } })).toThrow();
  });

  it('registers the scene source and its mount only while the article mounts the scene', () => {
    const registry = localSceneRegistry(root, { [originalId]: target });
    const cases = [{ id: 'default', kind: 'default' }, { id: 'step-each-beat', kind: 'scene-beats' }, { id: 'reset', kind: 'reset' }];
    expect(registry.sources).toEqual([{ id: 'scene:BatchScale', sourcePath: 'components/motion/scenes/batch-scale.tsx',
      scene: 'batch-scale', beats: 4, cases, fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect(registry.mounts).toEqual([{ id: `mount:${route}:BatchScale:1`, sourceId: 'scene:BatchScale', route,
      ordinal: 1, cases, fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect(readFileSync(ARTICLE, 'utf8').match(/<BatchScale[\s/>]/g)).toHaveLength(1);
    // The checker's context adds exactly the scene records its required targets derive.
    const context = loadLocalBasisContext(root, publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
    const derived = localSceneRegistry(root, LOCAL_BASIS_REQUIRED_TARGETS);
    expect(context.registry.sources.filter(source => source.id.startsWith('scene:'))).toEqual(derived.sources);
    expect(context.registry.mounts.filter(mount => mount.sourceId.startsWith('scene:'))).toEqual(derived.mounts);
  });

  it('rejects a planted scene mismatch: another article\'s scene, an unmounted component or a changed beat count', () => {
    const registry = localSceneRegistry(root, { [originalId]: target });
    expect(() => localSceneRegistry(root, { [originalId]: { ...target, scene: 'gait-support' } })).toThrow(/scene target identity/);
    expect(() => localSceneRegistry(root, { [originalId]: { ...target, scene: 'no-such-scene' } })).toThrow(/scene target identity/);
    expect(localSceneRegistry(root, { [originalId]: { ...target, component: 'TrainingTimeChart' } }).mounts).toEqual([]);
    expect(localSceneRegistry(root, { [originalId]: { ...target, mounts: [2] } }).mounts).toEqual([]);
    const scene = SCENE_TARGETS.find(candidate => candidate.id === 'batch-scale') as { beats: number };
    scene.beats = 5;
    try {
      const drifted = localSceneRegistry(root, { [originalId]: target });
      expect(drifted.sources[0].fingerprint).not.toBe(registry.sources[0].fingerprint);
      expect(drifted.mounts[0].fingerprint).toBe(registry.mounts[0].fingerprint);
    } finally {
      scene.beats = 4;
    }
    expect(localSceneRegistry(root, { [originalId]: target })).toEqual(registry);
  });
});
