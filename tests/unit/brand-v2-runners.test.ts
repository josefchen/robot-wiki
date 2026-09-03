import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRAND_V2_DEEP_ROWS,
  BRAND_V2_FLOW_SUITES,
  ROUTE_CHECKS,
  buildInteractiveExecutionPlan,
  buildPublicRouteExecutionPlan,
  executeEvidencePlans,
  validateDeepRows,
  validateFlowSuites,
} from '@/lib/brand-v2-runners';

const registry = JSON.parse(
  readFileSync(
    join(process.cwd(), 'contract', 'brand-v2-registries.json'),
    'utf8',
  ),
);
const expectedRed = JSON.parse(
  readFileSync(
    join(process.cwd(), 'evidence', 'brand-v2', 'expected-red-v1.json'),
    'utf8',
  ),
) as {
  failures: Array<{
    suite: string;
    assertionId: string;
    actual: string;
    failedAnchors?: string[];
    rolloutMilestone: string;
  }>;
};

const referenceAnchorIds = [
  'identity',
  'hierarchy',
  'grid-alignment',
  'purposeful-devices',
  'light-dark-balance',
  'repetition-frames',
  'palette-type',
  'material-treatment',
] as const;

describe('brand-v2 exhaustive runners', () => {
  it('rejects the five-route smoke set as final public-route evidence', () => {
    expect(() =>
      buildPublicRouteExecutionPlan(registry, [
        '/',
        '/manipulation/action-chunking/',
        '/search/',
        '/market-map/',
        '/playground/',
      ]),
    ).toThrow(/smoke-only/i);
  });

  it('derives one non-empty public-route plan member per registry route and keeps 404 separate', () => {
    const routes = registry.routes.public.map(
      ({ path }: { path: string }) => path,
    );
    const plan = buildPublicRouteExecutionPlan(registry, routes);
    expect(plan.members).toHaveLength(routes.length);
    expect(plan.members.length).toBeGreaterThan(5);
    expect(plan.notFound.id).toBe('route:/404/');
    expect(plan.members.some(({ routeId }) => routeId === 'route:/404/')).toBe(
      false,
    );
    expect(plan.members.every(({ checks }) => checks.length === 9)).toBe(true);
    expect(ROUTE_CHECKS).toEqual([
      'browser-render',
      'computed-style',
      'axe',
      'keyboard',
      'forced-colours',
      'reflow',
      'overflow',
      'resource-font',
      'residue',
    ]);
  });

  it('derives every source and mount case with exact non-zero counts', () => {
    const plan = buildInteractiveExecutionPlan(registry);
    expect(plan.sources.length).toBeGreaterThan(0);
    expect(plan.mounts.length).toBeGreaterThan(0);
    expect(plan.observedCaseCount).toBe(plan.expectedCaseCount);
    for (const member of [...plan.sources, ...plan.mounts]) {
      expect(member.cases.length).toBe(member.expectedCaseCount);
      expect(member.expectedCaseCount).toBeGreaterThan(0);
      expect(member.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('defines all 27 sealed deep rows with ordered steps and captures', () => {
    expect(BRAND_V2_DEEP_ROWS).toHaveLength(27);
    expect(validateDeepRows(BRAND_V2_DEEP_ROWS)).toEqual([]);
    expect(BRAND_V2_DEEP_ROWS.map(({ id }) => id)).toEqual(
      Array.from(
        { length: 27 },
        (_, index) => `B2-EV-${String(index + 1).padStart(3, '0')}`,
      ),
    );
  });

  it('defines the four mandatory named flow suites with ordered steps and captures', () => {
    expect(Object.keys(BRAND_V2_FLOW_SUITES).sort()).toEqual([
      'brand-v2-article-interactions',
      'brand-v2-market-map-states',
      'brand-v2-playground-states',
      'brand-v2-route-flows',
    ]);
    expect(validateFlowSuites(BRAND_V2_FLOW_SUITES)).toEqual([]);
    expect(
      BRAND_V2_FLOW_SUITES['brand-v2-route-flows'].steps.map(
        ({ action }) => action,
      ),
    ).toEqual(['navigate', 'exercise-history', 'run-route-profiles']);
  });

  it('fails deep rows that omit a capture and flow suites with an empty population', () => {
    const rows = structuredClone(BRAND_V2_DEEP_ROWS);
    rows[0].captures = [];
    expect(validateDeepRows(rows)).toContainEqual(
      expect.objectContaining({
        memberId: 'B2-EV-001',
        reason: 'empty-captures',
      }),
    );

    const suites = structuredClone(BRAND_V2_FLOW_SUITES);
    suites['brand-v2-route-flows'].population = [];
    expect(validateFlowSuites(suites)).toContainEqual(
      expect.objectContaining({
        memberId: 'brand-v2-route-flows',
        reason: 'empty-population',
      }),
    );

    const badReference = structuredClone(BRAND_V2_DEEP_ROWS);
    badReference[0].captures[0].afterStep = 'missing-step';
    expect(validateDeepRows(badReference)).toContainEqual(
      expect.objectContaining({
        memberId: 'B2-EV-001',
        reason: 'unknown-capture-step',
      }),
    );
  });

  it('executes every deep row step and capture in declared order', async () => {
    const calls: string[] = [];
    const records = await executeEvidencePlans(BRAND_V2_DEEP_ROWS, {
      step: async (memberId, step) => {
        calls.push(`${memberId}:${step.id}`);
      },
      capture: async (memberId, capture) => {
        calls.push(`${memberId}:${capture.id}`);
      },
    });
    expect(records).toHaveLength(27);
    expect(records.every(({ steps, captures }) => steps.length > 0 && captures.length > 0))
      .toBe(true);
    expect(calls[0]).toBe('B2-EV-001:B2-EV-001:step:1');
    expect(calls.at(-1)).toBe(
      'B2-EV-027:B2-EV-027:capture:computed',
    );
  });

  it('keeps every archived expected-red failure linked to an executable core suite', () => {
    expect(expectedRed.failures.length).toBeGreaterThan(0);
    const coreSource = readFileSync(
      join(process.cwd(), 'tests', 'e2e', 'brand-v2.spec.ts'),
      'utf8',
    );
    const ogSource = readFileSync(
      join(process.cwd(), 'tests', 'e2e', 'brand-v2-og.spec.ts'),
      'utf8',
    );
    const reflowSource = readFileSync(
      join(
        process.cwd(),
        'tests',
        'e2e',
        'brand-v2-reflow-320-200.spec.ts',
      ),
      'utf8',
    );
    const deepSource = readFileSync(
      join(process.cwd(), 'tests', 'e2e', 'brand-v2-deep-rows.spec.ts'),
      'utf8',
    );
    const primitiveSource = readFileSync(
      join(process.cwd(), 'tests', 'e2e', 'brand-v2-primitives.spec.ts'),
      'utf8',
    );
    const referenceRubricSource = readFileSync(
      join(
        process.cwd(),
        'tests',
        'e2e',
        'brand-v2-reference-rubric.spec.ts',
      ),
      'utf8',
    );
    const keys = expectedRed.failures.map(
      ({ suite, assertionId }) => `${suite}:${assertionId}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const failure of expectedRed.failures) {
      expect(failure.rolloutMilestone).toMatch(/^brand-v2-/);
      const source =
        failure.suite === 'brand-v2 OG authority'
          ? ogSource
          : failure.suite === 'brand-v2 reference-feature rubric'
            ? referenceRubricSource
          : failure.suite === 'brand-v2-reflow-320-200'
            ? reflowSource
            : failure.suite === 'brand-v2 27-row deep executor'
              ? deepSource
            : failure.suite === 'brand-v2 shared primitive registry'
              ? primitiveSource
            : coreSource;
      expect(source).toContain(failure.assertionId);
    }
  });

  it('keeps reference-rubric prose synchronized with its exact failed-anchor set', () => {
    const referenceFailures = expectedRed.failures.filter(
      ({ suite }) => suite === 'brand-v2 reference-feature rubric',
    );
    expect(referenceFailures.length).toBeGreaterThan(0);
    for (const failure of referenceFailures) {
      expect(failure.failedAnchors).toBeDefined();
      for (const anchorId of referenceAnchorIds) {
        expect(
          failure.actual.includes(anchorId),
          `${failure.assertionId} prose for ${anchorId}`,
        ).toBe(failure.failedAnchors?.includes(anchorId) ?? false);
      }
    }
  });
});
