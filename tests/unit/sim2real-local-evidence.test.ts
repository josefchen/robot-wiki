import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  actionDivergence, drSuccess, occludedCells, pointSuccess, proprioReadings,
  reconstruction, reconstructionMae, TERRAIN,
} from '@/lib/sim2real';
import { frictionCases, frictionOracle, teacherOracle } from '../../audit/evidence/sim2real-local-20260923/proof-support';

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
