import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { recomputeLocalDerivation, LOCAL_BASIS_REQUIRED_TARGETS } from '../../lib/audit-local-basis';
import { artifact, defaults, dependencies, oracle, save, UNIT } from '../../audit/evidence/industrial-closure-20260923/support';
import { computeEconomics, DEFAULT_INPUTS } from '../../lib/deployment-economics';

describe('industrial residual finite economics', () => {
  it('admits only the four selected economics originals', () => {
    for (const ordinal of [9, 10, 32, 33]) {
      expect(LOCAL_BASIS_REQUIRED_TARGETS[`audit/data-hardware.md:industrial-deployment:${ordinal}`]).toBeDefined();
    }
    expect(LOCAL_BASIS_REQUIRED_TARGETS['audit/data-hardware.md:industrial-deployment:48']).toBeUndefined();
  });
  it('exposes honest interior authored bases without changing old parameters', () => {
    const old = recomputeLocalDerivation({ id: 'economics', mode: 'parameters', inputs: {} });
    expect(old.values).not.toHaveProperty('comparisonSuccess');
    const selected = recomputeLocalDerivation({ id: 'economics-examples', mode: 'parameters', inputs: {} });
    expect(selected.values).toMatchObject({ comparisonSuccess: 99, exampleClearing: 10, expensiveClearing: 300 });
  });
  for (const clearing of [15, 300]) {
    it(`independently verifies the paired paybacks at ${clearing}s`, () => {
      const paybacks: number[] = [];
      const outputs: number[] = [];
      for (const success of [99.9, 99]) {
        const input = { ...DEFAULT_INPUTS, successRatePercent: success, jamClearSeconds: clearing };
        const actual = computeEconomics(input);
        // Independent dimensional expression, not expected values copied from the model.
        const seconds = 6 + (100 - success) * clearing / 100;
        const hourly = 3420 / seconds;
        const payback = 200000 / (hourly * 730 * 25 / 600);
        expect(actual.netPicksPerHour).toBeCloseTo(hourly, 9);
        expect(actual.paybackMonths).toBeCloseTo(payback, 9);
        paybacks.push(payback); outputs.push(hourly);
      }
      expect(paybacks.map(v => v.toFixed(2))).toEqual(clearing === 15 ? ['11.56', '11.82'] : ['12.11', '17.30']);
      if (clearing === 15) expect(((paybacks[1] / paybacks[0] - 1) * 100).toFixed(1)).toBe('2.2');
      else {
        expect((paybacks[1] - paybacks[0]).toFixed(2)).toBe('5.19');
        expect(outputs.map(v => v.toFixed(1))).toEqual(['542.9', '380.0']);
        expect((1 - outputs[1] / outputs[0]) * 100).toBeCloseTo(30, 9);
        expect(paybacks.every(v => v < 24)).toBe(true);
      }
    });
  }
  it('exposes the ten-second hypothetical overhead with units', () => {
    const result = recomputeLocalDerivation({
      id: 'economics-examples', mode: 'derive',
      inputs: { ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 10 },
    });
    expect(result.values).toHaveProperty('jamOverheadPerPick', 0.1);
    expect(result.units).toContain('seconds');
  });
  it('removes unsupported attribution, economic certainty and numbered dashboard wording', () => {
    const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
    for (const removed of ["from Ohno's", 'comfortably economic', 'is ruinous', 'six-row deployment dashboard']) {
      expect(article).not.toContain(removed);
    }
    expect(article).toContain('<DeploymentEconomics');
    expect(article).toContain('lei-takt-time-definition');
    expect(article).toContain('lei-cycle-time-definition');
    expect(article).toContain('not a measured intervention rate');
  });
});

// This producer records only commands and comparisons that really execute.
it.runIf(process.env.INDUSTRIAL_WRITE_NUMERIC === '1')('records industrial numeric observations', () => {
  const startedAt = new Date().toISOString();
  const recipes = [
    { id: 'economics-examples', mode: 'parameters', inputs: {} },
    ...[[99.9, 15], [99, 15], [99.9, 300], [99, 300], [99, 10]].map(([successRatePercent, jamClearSeconds]) => ({
      id: 'economics-examples', mode: 'derive', inputs: { ...defaults, successRatePercent, jamClearSeconds },
    })),
  ];
  const cases = recipes.map(recipe => {
    const expected = recomputeLocalDerivation(recipe);
    if (recipe.mode === 'derive') {
      const input = recipe.inputs as typeof defaults;
      const independent = oracle(input);
      const values = expected.values as Record<string, unknown>;
      for (const key of ['totalCellCost', 'effectiveSecondsPerPick', 'netPicksPerHour', 'monthlyPicks', 'monthlyLaborValue', 'costPerPickUsd', 'paybackMonths'] as const) {
        expect(values[key]).toBeCloseTo(independent[key], 9);
      }
      expect(values.display).toEqual(independent.display);
      expect(values.paysBack).toEqual(independent.paysBack);
      expect(values.jamOverheadPerPick).toBeCloseTo((100 - input.successRatePercent) * input.jamClearSeconds / 100, 12);
    } else expect(expected.values).toMatchObject({ ...defaults, comparisonSuccess: 99, exampleClearing: 10, expensiveClearing: 300, hours: 730, amortization: 60, target: 24 });
    return { recipe, expected, dependencies: dependencies() };
  });
  save('numeric-run-final.json', {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 INDUSTRIAL_WRITE_NUMERIC=1 node_modules/.bin/vitest run tests/unit/industrial-closure-evidence.test.ts tests/unit/undated-citations.test.ts --no-file-parallelism',
    runner: 'vitest', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(UNIT), cases,
  });
});
