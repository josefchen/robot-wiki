import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  actionDivergence, drSuccess, occludedCells, pointSuccess, proprioReadings,
  reconstruction, reconstructionMae, TERRAIN,
} from '@/lib/sim2real';
import { frictionCases, frictionOracle, teacherOracle } from '../../audit/evidence/sim2real-local-20260923/proof-support';
import { cases, dependencies, artifact, save, UNIT } from '../../audit/evidence/sim2real-local-20260923/typed-support';
import { loadLocalBasisContext, recomputeLocalDerivation, validateLocalBasisPlan } from '@/lib/audit-local-basis';
import { CITATIONS } from '@/data/citations';
import { publishedModules } from '../../data/modules';

const articlePath = 'content/rl-sim2real/sim2real-transfer.mdx';
const article = readFileSync(articlePath, 'utf8');
const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

describe('sim2real authored evidence', () => {
  it('discloses chosen reconstruction and does not assert a measured distillation floor', () => {
    expect(article).toContain('chosen terrain and noise');
    expect(article).toContain('2.2 times the unrounded reconstruction MAE');
    expect(article).toContain('not inferred from the displayed input strip');
    expect(article).not.toContain('That divergence is the cost of distillation');
    expect(article).not.toContain('no amount of imitation closes the gap');
  });

  for (const input of frictionCases) {
    it(`independently recomputes friction ${input.id}`, () => {
      const expected = frictionOracle(input.mu, input.range);
      expect(pointSuccess(input.mu)).toBeCloseTo(expected.point, 14);
      expect(drSuccess(input.mu, input.range)).toBeCloseTo(expected.dr, 14);
      if (input.id === 'ordinary') expect(expected.drDisplay).toBe('74%');
      if (input.id === 'wide') expect(expected.drDisplay).toBe('57%');
    });
  }

  for (const degradation of [0, 0.15, 1]) {
    it(`independently reconstructs every cell at degradation ${degradation}`, () => {
      const expected = teacherOracle(degradation);
      expect(TERRAIN).toEqual(expected.terrain);
      expect(reconstruction(degradation)).toEqual(expected.reconstruction);
      expect(proprioReadings(degradation)).toEqual(expected.readings);
      expect(occludedCells(degradation)).toEqual(expected.occluded);
      expect(reconstructionMae(degradation)).toBeCloseTo(expected.mae, 14);
      expect(actionDivergence(degradation)).toBeCloseTo(expected.divergence, 14);
      // A rounded reconstruction is not the MAE input: rounding first loses precision.
      if (degradation !== 0) {
        const wrong = expected.reconstruction.reduce((sum, value, index) => sum + Math.abs(value - expected.terrain[index]), 0) / 24;
        expect(Math.abs(wrong - expected.mae)).toBeGreaterThan(1e-8);
      }
    });
  }

  it('keeps the color disclosure consistent with high terrain rendered dark', () => {
    const component = readFileSync('components/interactive/teacher-student.tsx', 'utf8');
    expect(component).toContain('Darker cells are higher terrain');
    expect(component).not.toContain('the two policies');
  });

  it.runIf(process.env.SIM2REAL_WRITE_EVIDENCE === '1')('records checked raw numerical outputs, not an audit certification', () => {
    const startedAt = new Date().toISOString();
    const friction = frictionCases.map(input => {
      const expected = frictionOracle(input.mu, input.range);
      const actual = { point: pointSuccess(input.mu), dr: drSuccess(input.mu, input.range) };
      expect(actual.point).toBeCloseTo(expected.point, 14);
      expect(actual.dr).toBeCloseTo(expected.dr, 14);
      return { input, expected, actual };
    });
    const teacher = [0, 0.15, 1].map(degradation => {
      const expected = teacherOracle(degradation);
      const actual = {
        terrain: TERRAIN, reconstruction: reconstruction(degradation), readings: proprioReadings(degradation),
        occluded: occludedCells(degradation), mae: reconstructionMae(degradation), divergence: actionDivergence(degradation),
      };
      expect(actual.reconstruction).toEqual(expected.reconstruction);
      expect(actual.readings).toEqual(expected.readings);
      expect(actual.occluded).toEqual(expected.occluded);
      expect(actual.mae).toBeCloseTo(expected.mae, 14);
      expect(actual.divergence).toBeCloseTo(expected.divergence, 14);
      return { input: { degradation }, expected, actual };
    });
    const dependencies = [
      articlePath, 'lib/sim2real.ts', 'lib/audit-local-basis.ts',
      'components/interactive/friction-transfer.tsx', 'components/interactive/teacher-student.tsx',
      'tests/unit/sim2real-local-evidence.test.ts', 'tests/e2e/sim2real-local-evidence.spec.ts',
      'audit/evidence/sim2real-local-20260923/proof-support.ts',
    ].map(path => ({ path, sha256: sha256(readFileSync(path)) }));
    writeFileSync('audit/evidence/sim2real-local-20260923/numeric-run.json', JSON.stringify({
      kind: 'raw-independent-numeric-run', auditCertification: false,
      startedAt, completedAt: new Date().toISOString(), friction, teacher, dependencies,
      command: 'NODE_DISABLE_COMPILE_CACHE=1 SIM2REAL_WRITE_EVIDENCE=1 node_modules/.bin/vitest run tests/unit/sim2real-local-evidence.test.ts tests/unit/sim2real.test.ts tests/component/friction-transfer.test.tsx tests/component/teacher-student.test.tsx',
    }, null, 2) + '\n', { flag: 'wx' });
  });
});

describe('strict sim2real local evidence', () => {
  const registryIds = new Set(CITATIONS.map(c => c.id));
  const context = () => loadLocalBasisContext(process.cwd(),
    publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`));
  for (const [ordinal, partCount] of [[23, 9], [24, 7]]) {
    it(`completes original ${ordinal} with its full strict AND inventory`, () => {
      const ctx = context();
      const plan = ctx.catalog.plans.find(p => p.originalId === `audit/rl-sim2real.md:sim2real-transfer:${ordinal}`);
      expect(plan).toBeDefined();
      if (!plan) return;
      expect(plan.parts).toHaveLength(partCount);
      expect(plan.parts.filter(p => p.kind === 'observed-behavior')).toHaveLength(3);
      expect(plan.parts.filter(p => p.kind === 'observed-behavior').flatMap(p => p.requiredObservations)).toHaveLength(ordinal === 23 ? 7 : 4);
      expect(plan.parts.filter(p => p.kind === 'external-source')).toHaveLength(ordinal === 23 ? 4 : 2);
      expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id,
        { citationId: '', sourceUrl: '', supportingPassage: '' }, registryIds, ctx).failures).toEqual([]);
      for (const mutation of ['missing-part', 'missing-proof', 'bad-input-basis', 'missing-mount', 'stale-review']) {
        const broken = structuredClone(ctx);
        const selected = broken.catalog.plans.find(p => p.id === plan.id)!;
        if (mutation === 'missing-part') selected.parts.pop();
        if (mutation === 'missing-proof') broken.catalog.proofs = broken.catalog.proofs.filter(p => p.planId !== plan.id || p.kind !== 'authored-parameter');
        if (mutation === 'bad-input-basis') {
          const proof = broken.catalog.proofs.find(p => p.planId === plan.id && p.kind === 'derived-result')!;
          proof.bases = [];
        }
        if (mutation === 'missing-mount') selected.mounts.pop();
        if (mutation === 'stale-review') selected.currentCells.note += ' unsupported drift';
        expect(validateLocalBasisPlan(selected, selected.currentCells, selected.id,
          { citationId: '', sourceUrl: '', supportingPassage: '' }, registryIds, broken).failures.length, mutation).toBeGreaterThan(0);
      }
    });
  }

  it.runIf(process.env.SIM2REAL_TYPED_CAPTURE === '1')('refreshes exact native numeric outputs with independent arithmetic', () => {
    const startedAt = new Date().toISOString();
    const results = cases.map(c => {
      const expected = recomputeLocalDerivation(c.recipe);
      const v = expected.values as Record<string, unknown>;
      if (c.recipe.mode === 'parameters') {
        if (c.family === 'friction') {
          expect(v).toEqual({ mu: 0.8, range: 0.35, muRange: [0.2, 1.5], drRange: [0.1, 0.65], pointPeak: 0.97, sigma: 0.09, edgeSigma: 0.1 });
        } else {
          expect(v).toEqual({ degradation: 0.15, range: [0, 1], terrain: teacherOracle(0).terrain, cells: 24 });
        }
      } else if (c.family === 'friction') {
        const o = frictionOracle(c.recipe.inputs.mu, c.recipe.inputs.range);
        expect(v.point).toBeCloseTo(o.point, 14);
        expect(v.dr).toBeCloseTo(o.dr, 14);
        expect(v.peak).toBeCloseTo(o.peak, 14);
        expect(v.display).toEqual([c.recipe.inputs.mu.toFixed(2), o.pointDisplay, o.drDisplay]);
      } else {
        const o = teacherOracle(c.recipe.inputs.degradation);
        expect(v.reconstruction).toEqual(o.reconstruction);
        expect(v.occluded).toEqual(o.occluded);
        expect(v.proprio).toEqual(o.readings);
        expect(v.mae).toBeCloseTo(o.mae, 14);
        expect(v.divergence).toBeCloseTo(o.divergence, 14);
        expect(v.display).toEqual([o.maeDisplay, o.divergenceDisplay]);
      }
      return { id: c.id, recipe: c.recipe, expected, dependencies: dependencies(c.family) };
    });
    save('numeric-run-sealed.json', {
      command: 'NODE_DISABLE_COMPILE_CACHE=1 SIM2REAL_TYPED_CAPTURE=1 node_modules/.bin/vitest run tests/unit/sim2real-local-evidence.test.ts -t "refreshes exact native numeric" --no-file-parallelism',
      runner: 'vitest', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
      startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(UNIT), cases: results,
    });
  });
});
