import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  evidenceResultSchema,
  enforcementMapSchema,
  buildEnforcementPopulationSources,
  extractBrandV2Assertions,
  validateEnforcementCorpus,
  type EvidenceResult,
  type EnforcementMap,
} from '@/lib/brand-v2-enforcement';
import { BRAND_V2_DEEP_ROWS } from '@/lib/brand-v2-runners';

const ROOT = process.cwd();

function fixture() {
  const results: EvidenceResult[] = [
    {
      resultId: 'result:VAL-B2-TEST-001',
      assertionId: 'VAL-B2-TEST-001',
      populationMemberId: 'population:registry:test',
      coveredPopulationMemberIds: ['population:test-a', 'population:test-b'],
      status: 'pending',
      expected: 'the predicate passes',
      actual: 'awaiting responsible milestone',
      selectorOrRegistryId: 'registry:test',
      exceptionVerdict: 'none',
      payload: {
        kind: 'source-build',
        sourcePath: 'contract/design-integrity.md',
        predicate: 'fixture predicate',
        observed: 'pending',
      },
    },
  ];
  const map: EnforcementMap = {
    schemaVersion: 1,
    rows: [
      {
        assertionId: 'VAL-B2-TEST-001',
        canonicalPopulationSource: 'registry:test',
        enforcementTargets: [{
            kind: 'evidence-row',
            evidenceRowId: results[0].resultId,
            mechanism: 'fixture predicate',
          }],
        enforcementMode: 'automated-machine',
        machinePredicate: {
          statement: 'fixture predicate',
          expected: 'the predicate passes',
          actualSource: 'fixture results',
          nonEmptyPopulation: true,
          omissionMustFail: true,
        },
        producedResult: {
          resultIds: [results[0].resultId],
        },
      },
    ],
  };
  const populationSources: Record<string, string[]> = {
    'registry:test': ['population:test-a', 'population:test-b'],
  };
  return {
    assertionIds: ['VAL-B2-TEST-001'],
    populationSources,
    map,
    results,
  };
}

describe('brand-v2 enforcement map and evidence schemas', () => {
  it('extracts the complete unique VAL-B2 assertion inventory', () => {
    const contract = readFileSync(
      join(ROOT, 'contract', 'design-integrity.md'),
      'utf8',
    );
    const assertions = extractBrandV2Assertions(contract);
    expect(assertions.length).toBeGreaterThan(0);
    expect(new Set(assertions.map(({ id }) => id)).size).toBe(
      assertions.length,
    );
    expect(assertions.some(({ id }) => id === 'VAL-B2-GOV-004')).toBe(true);
  });

  it('accepts the checked-in map and tagged result corpus', () => {
    const contract = readFileSync(
      join(ROOT, 'contract', 'design-integrity.md'),
      'utf8',
    );
    const registry = JSON.parse(
      readFileSync(
        join(ROOT, 'contract', 'brand-v2-registries.json'),
        'utf8',
      ),
    );
    const map = enforcementMapSchema.parse(
      JSON.parse(
        readFileSync(
          join(ROOT, 'contract', 'brand-v2-enforcement-map.json'),
          'utf8',
        ),
      ),
    );
    const results = JSON.parse(
      readFileSync(
        join(ROOT, 'evidence', 'brand-v2', 'results.json'),
        'utf8',
      ),
    ).results.map((result: unknown) => evidenceResultSchema.parse(result));
    expect(
      validateEnforcementCorpus({
        assertionIds: extractBrandV2Assertions(contract).map(({ id }) => id),
        populationSources: buildEnforcementPopulationSources({
          registry,
          baselineManifestIds: Object.keys(
            JSON.parse(
              readFileSync(
                join(
                  ROOT,
                  'evidence',
                  'brand-v2',
                  'baseline',
                  'baseline.json',
                ),
                'utf8',
              ),
            ).manifests,
          ),
          deepRowIds: BRAND_V2_DEEP_ROWS.map(({ id }) => id),
          assertionIds: extractBrandV2Assertions(contract).map(({ id }) => id),
        }),
        map,
        results,
        allowPendingResults: true,
      }),
    ).toEqual([]);
  });

  it('rejects foreign payload fields and enforces typed not-applicable reasons', () => {
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:failed',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        status: 'failed',
        expected: 'pass',
        actual: 'fail',
        selectorOrRegistryId: 'registry:test',
        exceptionVerdict: 'none',
        payload: {
          kind: 'generated-image',
          imagePath: 'x.png',
          width: 1,
          height: 1,
          sha256: 'a'.repeat(64),
          sourcePath: 'foreign-field',
        },
      }),
    ).toThrow();
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:na',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        status: 'not-applicable',
        expected: 'not applicable',
        actual: 'not applicable',
        selectorOrRegistryId: 'registry:test',
        exceptionVerdict: 'accepted',
        notApplicableReason: 'free-form excuse',
      }),
    ).toThrow();
  });

  it('requires the complete failed-result envelope and schema payload', () => {
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:failed',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        status: 'failed',
        expected: 'pass',
        actual: 'fail',
        selectorOrRegistryId: 'registry:test',
        exceptionVerdict: 'none',
      }),
    ).toThrow();
    for (const field of ['expected', 'actual'] as const) {
      const candidate: Record<string, unknown> = {
        resultId: 'result:failed',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        status: 'failed',
        expected: 'pass',
        actual: 'fail',
        selectorOrRegistryId: 'registry:test',
        exceptionVerdict: 'none',
        payload: {
          kind: 'source-build',
          sourcePath: 'contract/design-integrity.md',
          predicate: 'fixture predicate',
          observed: 'failed',
        },
      };
      delete candidate[field];
      expect(() => evidenceResultSchema.parse(candidate)).toThrow();
    }
  });

  it('rejects a payload kind that cannot prove the declared enforcement mode', () => {
    const value = fixture();
    value.map.rows[0].enforcementMode = 'generated-image';
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        reason: 'enforcement-mode-payload-mismatch',
      }),
    );
  });

  it('allows pending migration evidence but blocks it in release mode', () => {
    const value = fixture();
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toEqual([]);
    expect(
      validateEnforcementCorpus(value),
    ).toContainEqual(
      expect.objectContaining({ reason: 'pending-result-blocks-release' }),
    );
  });

  it.each([
    ['assertion row', (value: ReturnType<typeof fixture>) => value.map.rows.splice(0, 1), 'invalid-map-schema'],
    ['target', (value: ReturnType<typeof fixture>) => value.map.rows[0].enforcementTargets.splice(0, 1), 'invalid-map-schema'],
    ['tagged result', (value: ReturnType<typeof fixture>) => { value.results[0].resultId = 'result:untagged'; }, 'untagged-produced-result'],
    ['population member', (value: ReturnType<typeof fixture>) => value.results[0].coveredPopulationMemberIds.splice(0, 1), 'missing-population-result'],
    ['registry entry', (value: ReturnType<typeof fixture>) => value.populationSources['registry:test'].splice(0, 1), 'unregistered-population-result'],
    ['registry', (value: ReturnType<typeof fixture>) => delete value.populationSources['registry:test'], 'missing-population-source'],
    ['evidence record', (value: ReturnType<typeof fixture>) => value.results.splice(0, 1), 'missing-produced-result'],
  ])('fails when a %s is omitted', (_label, mutate, reason) => {
    const value = fixture();
    mutate(value);
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(expect.objectContaining({ reason }));
  });

  it('rejects a nonexistent exact test target and an empty applicable population', () => {
    const value = fixture();
    value.map.rows[0].enforcementTargets = [
      {
        kind: 'test',
        file: 'tests/unit/brand-v2-enforcement.test.ts',
        title: 'reporter title that does not exist',
        mechanism: 'fixture predicate',
      },
    ];
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
        testTargetInventory: {
          'tests/unit/brand-v2-enforcement.test.ts': [],
        },
      }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'nonexistent-test-target' }),
    );

    const empty = fixture();
    empty.populationSources['registry:test'] = [];
    expect(
      validateEnforcementCorpus({
        ...empty,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'empty-applicable-population' }),
    );
  });
});
