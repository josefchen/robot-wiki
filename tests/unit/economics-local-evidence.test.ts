import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as model from '../../lib/deployment-economics';
import { loadLocalBasisContext, recomputeLocalDerivation, validateLocalBasisPlan } from '../../lib/audit-local-basis';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { ARTICLE, COMPONENT, UNIT, ROUTE, artifact, cases, defaults, ranges, dependencies, oracle, save } from '../../audit/evidence/economics-local-20260923/support';

function check(input: typeof defaults) {
  const actual = model.computeEconomics(input);
  const expected = oracle(input);
  for (const k of ['totalCellCost', 'jamRatePercent', 'effectiveSecondsPerPick', 'netPicksPerHour', 'monthlyPicks', 'monthlyLaborValue', 'costPerPickUsd', 'paybackMonths'] as const) {
    expect(actual[k]).toBeCloseTo(expected[k], 8);
  }
  for (const k of ['productive', 'jamClearing', 'downtime'] as const) expect(actual.timeBreakdown[k]).toBeCloseTo(expected.timeBreakdown[k], 8);
  expect(model.sanitizeInputs(input)).toEqual(expected.sanitized);
  expect(model.paysBackWithinTarget(actual.paybackMonths)).toBe(expected.paysBack);
  expect(Object.values(actual.timeBreakdown).reduce((a, b) => a + b)).toBeCloseTo(3600, 8);
  return expected;
}

describe('industrial52 authored economics evidence', () => {
  it('distinguishes chosen prices, domains and constants from vendor context', () => {
    const body = readFileSync(ARTICLE, 'utf8');
    for (const s of ['authored worked example', '80,000', '20,000', '250,000', '5,000', '730', '60-month', 'chosen 24-month', 'not a sourced arm-price quote']) expect(body).toContain(s);
    const component = readFileSync(COMPONENT, 'utf8');
    expect(component).not.toContain('no cited source publishes');
    expect(component).toContain('modeled picks per elapsed hour');
  });
  it('pins all seven authored defaults and control ranges', () => {
    expect(model.DEFAULT_INPUTS).toEqual(defaults);
    expect(model.INPUT_RANGES).toEqual(ranges);
    expect([model.ROBOT_HOURS_PER_MONTH, model.AMORTIZATION_MONTHS, model.PAYBACK_TARGET_MONTHS, model.SECONDS_PER_HOUR]).toEqual([730, 60, 24, 3600]);
  });
  for (const robotCost of [20000, 80000, 250000]) it(`independently checks capital, throughput, labour and formatting at ${robotCost}`, () => {
    const o = check({ ...defaults, robotCost });
    expect(o.display).toEqual(robotCost === 20000 ? ['0.002', '2.9 months'] : robotCost === 80000 ? ['0.008', '11.6 months'] : ['0.025', '36.1 months']);
    expect(o.netPicksPerHour).toBeCloseTo(568.5785536159601, 8);
  });
  it('independently checks nonfinite and out-of-range sanitization for every input', () => {
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      for (const value of [NaN, Infinity, -Infinity, ranges[key].min - 1, ranges[key].max + 1]) check({ ...defaults, [key]: value });
    }
  });
  it('requires every external and local part, binding and observation', () => {
    const routes = publishedModules().map(m => `/${m.domain}/${m.slug}/`);
    expect(routes).toContain(ROUTE);
    const ctx = loadLocalBasisContext(process.cwd(), routes);
    const plan = ctx.catalog.plans.find(p => p.originalId === 'audit/data-hardware.md:industrial-deployment:52');
    expect(plan).toBeDefined();
    if (!plan) return;
    expect(plan.originalBinding.originalCells.verdict).toBe('Unresolved (component files are out of my edit scope; recorded below)');
    expect(plan.originalBinding.originalTupleDigest).toBe('82e25ed8ad6381edd7ae91d5a247ead79a3185c9b3e113a1b5501b00f344b864');
    expect(plan.parts).toHaveLength(7);
    expect(plan.parts.filter(p => p.kind === 'external-source')).toHaveLength(2);
    const ids = new Set(CITATIONS.map(c => c.id));
    const scalar = { citationId: '', sourceUrl: '', supportingPassage: '' };
    expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id, scalar, ids, ctx).failures).toEqual([]);
    for (const what of ['part', 'proof', 'basis', 'result', 'hash', 'unobserved', 'review']) {
      const broken = structuredClone(ctx);
      const p = broken.catalog.plans.find(p => p.id === plan.id)!;
      const derived = broken.catalog.proofs.find(p => p.id === 'i52-20000')!;
      if (what === 'part') p.parts.shift();
      if (what === 'proof') broken.catalog.proofs = broken.catalog.proofs.filter(p => p.id !== 'i52-parameters');
      if (what === 'basis') derived.bases = [];
      if (what === 'result') derived.expected.values = { wrong: 1 };
      if (what === 'hash') derived.input.sha256 = '0'.repeat(64);
      if (what === 'unobserved') {
        const observed = broken.catalog.proofs.find(p => p.id === 'i52-observed-80000')!;
        if (observed.kind === 'observed-behavior') observed.observations = [];
      }
      if (what === 'review') p.currentCells.note += ' drift';
      expect(validateLocalBasisPlan(p, p.currentCells, p.id, scalar, ids, broken).failures.length).toBeGreaterThan(0);
    }
  });
  it.runIf(process.env.ECONOMICS_WRITE_NUMERIC === '1')('records final native outputs after independent checks', () => {
    const startedAt = new Date().toISOString();
    const results = cases.map(c => {
      const expected = recomputeLocalDerivation(c.recipe);
      if (c.recipe.mode === 'parameters') expect(expected.values).toEqual({ ...defaults, ranges, hours: 730, amortization: 60, target: 24 });
      else {
        const o = check(c.recipe.inputs);
        const v = expected.values as Record<string, unknown>;
        for (const key of ['totalCellCost', 'monthlyPicks', 'monthlyLaborValue', 'costPerPickUsd', 'paybackMonths'] as const) expect(v[key]).toBeCloseTo(o[key], 8);
        expect(v.sanitized).toEqual(o.sanitized);
        expect(v.display).toEqual(o.display);
      }
      return { id: c.id, recipe: c.recipe, expected, dependencies: dependencies() };
    });
    save('numeric-run-final.json', {
      command: 'NODE_DISABLE_COMPILE_CACHE=1 ECONOMICS_WRITE_NUMERIC=1 node_modules/.bin/vitest run tests/unit/economics-local-evidence.test.ts -t "records final native outputs" --no-file-parallelism',
      runner: 'vitest', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
      startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(UNIT), cases: results,
    });
  });
});
