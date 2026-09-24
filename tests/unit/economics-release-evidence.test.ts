import { describe, expect, it } from 'vitest';
import * as model from '../../lib/deployment-economics';
import { recomputeLocalDerivation } from '../../lib/audit-local-basis';
import {
  UNIT, artifact, cases, defaults, ranges, dependencies, oracle, save,
} from '../../audit/evidence/economics-release-20260923/support';

describe('release economics changed-input proof', () => {
  it('checks current merged dependencies and records actual numeric execution when requested', () => {
    const startedAt = new Date().toISOString();
    expect(model.DEFAULT_INPUTS).toEqual(defaults);
    expect(model.INPUT_RANGES).toEqual(ranges);
    const results = cases.map(c => {
      const expected = recomputeLocalDerivation(c.recipe);
      if (c.recipe.mode === 'parameters') {
        expect(expected.values).toEqual({ ...defaults, ranges, hours: 730, amortization: 60, target: 24 });
      } else {
        const independent = oracle(c.recipe.inputs);
        const actual = model.computeEconomics(c.recipe.inputs);
        const values = expected.values as Record<string, unknown>;
        for (const key of ['totalCellCost', 'monthlyPicks', 'monthlyLaborValue', 'costPerPickUsd', 'paybackMonths'] as const) {
          expect(actual[key]).toBeCloseTo(independent[key], 8);
          expect(values[key]).toBeCloseTo(independent[key], 8);
        }
        expect(values.sanitized).toEqual(independent.sanitized);
        expect(values.display).toEqual(independent.display);
        expect(independent.display).toEqual(c.recipe.inputs.robotCost === 20000
          ? ['0.002', '2.9 months'] : c.recipe.inputs.robotCost === 80000
            ? ['0.008', '11.6 months'] : ['0.025', '36.1 months']);
      }
      return { id: c.id, recipe: c.recipe, expected, dependencies: dependencies() };
    });
    if (process.env.ECONOMICS_RELEASE_WRITE === '1') save('numeric-run-final.json', {
      command: 'NODE_DISABLE_COMPILE_CACHE=1 ECONOMICS_RELEASE_WRITE=1 node_modules/.bin/vitest run tests/unit/economics-release-evidence.test.ts --no-file-parallelism',
      runner: 'vitest', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
      startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(UNIT), cases: results,
    });
  });
});
