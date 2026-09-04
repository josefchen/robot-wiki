import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  evidenceResultSchema,
  enforcementMapSchema,
  buildEnforcementPopulationSources,
  extractBrandV2Assertions,
  summarizeEnforcementFailures,
  validateEnforcementCorpus,
  type EvidenceResult,
  type EnforcementMap,
} from '@/lib/brand-v2-enforcement';
import {
  BRAND_V2_REFERENCE_RUBRIC,
  evaluateReferenceFeatures,
  type ReferenceFeatureMeasurements,
} from '@/lib/brand-v2-reference-rubric';
import { BRAND_V2_DEEP_ROWS } from '@/lib/brand-v2-runners';
import {
  AUTHORED_TOKEN_SOURCE,
  deriveSemanticTokenPopulation,
} from '@/lib/brand-v2-token-evidence';
import { deriveTestTargetInventory } from '@/lib/brand-v2-test-inventory';
import { TEKTUR_POPULATION_IDS } from '@/lib/tektur-populations';
import {
  IDENTITY_RUNTIME_EVIDENCE_PATH,
  deriveTechnicalIdentifiers,
  identityEvidenceFingerprint,
  readIdentityRuntimeEvidence,
} from '@/lib/brand-v2-identity-evidence';
import {
  IDENTITY_DESCRIPTOR_POPULATION_SOURCE,
  IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE,
  IDENTITY_TECHNICAL_POPULATION_SOURCE,
  IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE,
  firstPartyVisualAssets,
  identityDescriptorSurfaces,
  identityWordmarkRoles,
} from '@/lib/identity-populations';

/**
 * The identity populations, rebuilt here from the same derivations the
 * generator uses. Reading them back out of the committed corpus would make
 * the corpus its own oracle.
 */
function identityPopulations(registry: {
  metadata: Array<{ routeId: string; ownerPath: string }>;
  routes: { public: Array<{ path: string }> };
  assets: Array<{ id: string; path: string; category: string }>;
}, contract: string): Record<string, string[]> {
  const siteOwnerPath = registry.metadata.find(
    ({ routeId }) => routeId === 'route:/',
  )?.ownerPath;
  if (!siteOwnerPath) throw new Error('no metadata owner for route:/');
  const evidence = readIdentityRuntimeEvidence({
    artifact: JSON.parse(
      readFileSync(join(ROOT, IDENTITY_RUNTIME_EVIDENCE_PATH), 'utf8'),
    ),
    routes: registry.routes.public.map(({ path }) => path),
    fingerprint: identityEvidenceFingerprint({
      root: ROOT,
      metadataOwnerPaths: [
        ...new Set(registry.metadata.map(({ ownerPath }) => ownerPath)),
      ],
      lockupSourcePaths: [
        'components/nav/site-shell.tsx',
        'components/nav/site-footer.tsx',
        'lib/identity.ts',
        'lib/og-cards.ts',
      ],
    }),
  });
  const requirement = extractBrandV2Assertions(contract).find(
    ({ id }) => id === 'VAL-B2-ID-004',
  )?.requirement;
  if (!requirement) throw new Error('VAL-B2-ID-004 has no requirement row');
  return {
    [IDENTITY_DESCRIPTOR_POPULATION_SOURCE]: identityDescriptorSurfaces(
      evidence,
      siteOwnerPath,
    ).map(({ id }) => id),
    [IDENTITY_TECHNICAL_POPULATION_SOURCE]: deriveTechnicalIdentifiers(
      requirement,
    ).map((literal) => `technical-identifier:${literal}`),
    [IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE]: identityWordmarkRoles().map(
      ({ id }) => id,
    ),
    [IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE]: firstPartyVisualAssets(
      registry.assets,
    ).map(({ id }) => id),
  };
}

const ROOT = process.cwd();
const FIXTURE_TEST_FILE = 'tests/unit/brand-v2-enforcement.test.ts';
const FIXTURE_TEST_TITLE =
  'brand-v2 enforcement map and evidence schemas > reports missing-assertion-row when one row is omitted from a two-row map';

function fixture() {
  const results: EvidenceResult[] = [
    {
      resultId: 'result:VAL-B2-TEST-001',
      assertionId: 'VAL-B2-TEST-001',
      populationMemberId: 'population:registry:test',
      coveredPopulationMemberIds: ['population:test-a', 'population:test-b'],
      coverageKind: 'population-wide',
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
    {
      resultId: 'result:VAL-B2-TEST-002',
      assertionId: 'VAL-B2-TEST-002',
      populationMemberId: 'population:registry:second',
      coveredPopulationMemberIds: ['population:second-a'],
      coverageKind: 'population-wide',
      status: 'pending',
      expected: 'the second predicate passes',
      actual: 'awaiting responsible milestone',
      selectorOrRegistryId: 'registry:second',
      exceptionVerdict: 'none',
      payload: {
        kind: 'source-build',
        sourcePath: 'contract/design-integrity.md',
        predicate: 'second fixture predicate',
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
        enforcementTargets: [
          {
            kind: 'evidence-row',
            evidenceRowId: results[0].resultId,
            mechanism: 'fixture predicate',
          },
          {
            kind: 'test',
            file: FIXTURE_TEST_FILE,
            title: FIXTURE_TEST_TITLE,
            mechanism: 'fixture omission mutation',
          },
        ],
        enforcementMode: 'automated-machine',
        machinePredicate: {
          statement: 'fixture predicate',
          expected: 'the predicate passes',
          actualSource: 'fixture results',
          populationSize: 2,
          omissionProof: {
            testFile: FIXTURE_TEST_FILE,
            testTitle: FIXTURE_TEST_TITLE,
            failureReason: 'missing-assertion-row',
          },
        },
        producedResult: {
          resultIds: [results[0].resultId],
        },
      },
      {
        assertionId: 'VAL-B2-TEST-002',
        canonicalPopulationSource: 'registry:second',
        enforcementTargets: [
          {
            kind: 'evidence-row',
            evidenceRowId: results[1].resultId,
            mechanism: 'second fixture predicate',
          },
          {
            kind: 'test',
            file: FIXTURE_TEST_FILE,
            title: FIXTURE_TEST_TITLE,
            mechanism: 'fixture omission mutation',
          },
        ],
        enforcementMode: 'automated-machine',
        machinePredicate: {
          statement: 'second fixture predicate',
          expected: 'the second predicate passes',
          actualSource: 'fixture results',
          populationSize: 1,
          omissionProof: {
            testFile: FIXTURE_TEST_FILE,
            testTitle: FIXTURE_TEST_TITLE,
            failureReason: 'missing-assertion-row',
          },
        },
        producedResult: {
          resultIds: [results[1].resultId],
        },
      },
    ],
  };
  const populationSources: Record<string, string[]> = {
    'registry:test': ['population:test-a', 'population:test-b'],
    'registry:second': ['population:second-a'],
  };
  return {
    assertionIds: ['VAL-B2-TEST-001', 'VAL-B2-TEST-002'],
    populationSources,
    map,
    results,
    testTargetInventory: {
      [FIXTURE_TEST_FILE]: [FIXTURE_TEST_TITLE],
    } as Record<string, string[]>,
  };
}

describe('brand-v2 enforcement map and evidence schemas', () => {
  it('summarizes every enforcement failure by class without truncation', () => {
    const failures = [
      ...Array.from({ length: 238 }, () => ({
        reason: 'pending-result-blocks-release' as const,
        expected: 'settled',
        actual: 'pending',
      })),
      ...Array.from({ length: 238 }, () => ({
        reason: 'population-wide-coverage-blocks-release' as const,
        expected: 'per-member',
        actual: 'population-wide',
      })),
    ];

    expect(summarizeEnforcementFailures(failures)).toEqual({
      total: 476,
      counts: [
        {
          reason: 'pending-result-blocks-release',
          count: 238,
        },
        {
          reason: 'population-wide-coverage-blocks-release',
          count: 238,
        },
      ],
    });
  });

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
          tekturPopulations: TEKTUR_POPULATION_IDS,
          semanticTokenPopulation: deriveSemanticTokenPopulation({
            root: ROOT,
            contract,
            css: readFileSync(join(ROOT, AUTHORED_TOKEN_SOURCE), 'utf8'),
          }).map(({ id }) => id),
          identityPopulations: identityPopulations(registry, contract),
        }),
        map,
        results,
        testTargetInventory: deriveTestTargetInventory(),
        allowPendingResults: true,
      }),
    ).toEqual([]);
  });

  it('derives sorted reporter-visible test targets from tracked test files', () => {
    const inventory = deriveTestTargetInventory();
    expect(Object.keys(inventory)).toEqual(
      [...Object.keys(inventory)].sort(),
    );
    expect(
      inventory['tests/unit/brand-v2-census.test.ts'],
    ).toContain(
      'brand-v2 canonical census > derives every interactive source and production mount from repository source',
    );
    expect(
      inventory['tests/e2e/brand-v2-route-flows.spec.ts'],
    ).toContain(
      'brand-v2-route-flows › derives and renders every public destination while keeping 404 separate',
    );
    expect(
      inventory['tests/unit/brand-v2-baseline.test.ts'],
    ).toContain(
      'brand-v2 immutable baseline > fails with a tagged omission when one %s member is deleted',
    );
    expect(
      inventory['tests/e2e/brand-v2-route-flows.spec.ts'],
    ).not.toContain('brand-v2-route-flows');
    for (const titles of Object.values(inventory)) {
      expect(titles).toEqual([...titles].sort());
    }
  });

  it('binds every generated assertion row to tests with composite non-degenerate targets', () => {
    const map = enforcementMapSchema.parse(
      JSON.parse(
        readFileSync(
          join(ROOT, 'contract', 'brand-v2-enforcement-map.json'),
          'utf8',
        ),
      ),
    );
    expect(
      map.rows.every((row) =>
        row.enforcementTargets.some((target) => target.kind === 'test'),
      ),
    ).toBe(true);
    expect(
      map.rows.some((row) => row.enforcementTargets.length > 1),
    ).toBe(true);
    expect(
      new Set(map.rows.map((row) => row.enforcementTargets.length)).size,
    ).toBeGreaterThan(1);
  });

  it('rejects foreign payload fields and enforces typed not-applicable reasons', () => {
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:failed',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        coverageKind: 'per-member',
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
        coverageKind: 'per-member',
        status: 'not-applicable',
        expected: 'not applicable',
        actual: 'not applicable',
        selectorOrRegistryId: 'registry:test',
        exceptionVerdict: 'accepted',
        notApplicableReason: 'free-form excuse',
      }),
    ).toThrow();
  });

  it('requires every independent reference anchor and prohibits comparison scores', () => {
    const measurements = {
      surfaceKind: 'home',
      viewport: { width: 1440, height: 900 },
      identity: {
        publicName: 'Robot Wiki',
        descriptor: 'Citation-first encyclopedia of modern robot learning.',
        descriptorRequired: true,
        webDisplayFamily: 'Tektur Variable',
        ogStaticRoleMatched: true,
        alternateSymbolCount: 0,
        v1IdentityCount: 0,
      },
      hierarchy: {
        primarySizePx: 96,
        supportingSizePx: 60,
        bodySizePx: 20,
        primaryLineCount: 1,
      },
      gridAndDevices: {
        registeredCount: 1,
        unregisteredCount: 0,
        maximumAlignmentErrorPx: 0,
        missingPurposeCount: 0,
        missingOwnerCount: 0,
        maximumDominantMotifsPerSection: 1,
        mobileDeviceCount: 0,
        desktopDeviceCount: 1,
        obscuringCount: 0,
        inputInterceptingCount: 0,
      },
      lightDarkBalance: {
        bodyIsLight: true,
        shellIsLight: true,
        proseIsLight: true,
        darkNonActionAreaPx2: 0,
        firstViewportAreaPx2: 1_296_000,
        unregisteredDarkSurfaceCount: 0,
        shellOrProseIntersectionCount: 0,
      },
      repetitionAndFrames: {
        registeredPopulationCount: 1,
        maximumAdjacentRepeatedSignatures: 0,
        redundantNestedFourSidedFrameCount: 0,
        maximumFrameDepth: 1,
        unregisteredDepthTwoCount: 0,
      },
      paletteAndType: {
        auditedColourCount: 7,
        matchingColourCount: 7,
        auditedTypeRoleCount: 30,
        matchingTypeRoleCount: 30,
        unregisteredRoleCount: 0,
        fallbackGlyphCount: 0,
      },
      materialTreatment: {
        registeredRepresentativeCount: 1,
        deterministicCount: 1,
        contrastPassingCount: 1,
        provenanceCompleteCount: 0,
        externalRepresentativeCount: 0,
        proseElementResolved: true,
        proseTextureIntersectionCount: 0,
      },
    } satisfies ReferenceFeatureMeasurements;
    const report = evaluateReferenceFeatures(measurements);
    const payload = {
      kind: 'autonomous-reference-comparison',
      rubricVersion: 1,
      comparisonMode: 'feature-anchors-only',
      contractLiteralOverridesApplied: true,
      referenceIds: BRAND_V2_REFERENCE_RUBRIC.references,
      surfaceId: 'B2-EV-001',
      anchors: report.anchors,
      passed: report.passed,
      screenshotPaths: ['/tmp/home.png'],
    };
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:comparison',
        assertionId: 'VAL-B2-EVID-015',
        populationMemberId: 'B2-EV-001',
        coveredPopulationMemberIds: ['B2-EV-001'],
        coverageKind: 'per-member',
        status: 'passed',
        expected: 'all anchors pass',
        actual: 'all anchors pass',
        selectorOrRegistryId: 'B2-EV-001',
        exceptionVerdict: 'none',
        payload,
      }),
    ).not.toThrow();
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:comparison',
        assertionId: 'VAL-B2-EVID-015',
        populationMemberId: 'B2-EV-001',
        coveredPopulationMemberIds: ['B2-EV-001'],
        coverageKind: 'per-member',
        status: 'passed',
        expected: 'all anchors pass',
        actual: 'averaged score',
        selectorOrRegistryId: 'B2-EV-001',
        exceptionVerdict: 'none',
        payload: { ...payload, score: 0.99 },
      }),
    ).toThrow();

    const failingMeasurements = structuredClone(measurements);
    failingMeasurements.hierarchy.primarySizePx = 1;
    const failingReport = evaluateReferenceFeatures(failingMeasurements);
    const failingPayload = {
      ...payload,
      anchors: failingReport.anchors,
      passed: failingReport.passed,
    };
    const inconsistent = evidenceResultSchema.safeParse({
      resultId: 'result:comparison-failing-payload',
      assertionId: 'VAL-B2-EVID-015',
      populationMemberId: 'B2-EV-001',
      coveredPopulationMemberIds: ['B2-EV-001'],
      coverageKind: 'per-member',
      status: 'passed',
      expected: 'all anchors pass',
      actual: 'one anchor failed',
      selectorOrRegistryId: 'B2-EV-001',
      exceptionVerdict: 'none',
      payload: failingPayload,
    });
    expect(inconsistent.success).toBe(false);
    if (!inconsistent.success) {
      expect(inconsistent.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'comparison-result-status-payload-mismatch',
          }),
        ]),
      );
    }

    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:comparison-passing-payload',
        assertionId: 'VAL-B2-EVID-015',
        populationMemberId: 'B2-EV-001',
        coveredPopulationMemberIds: ['B2-EV-001'],
        coverageKind: 'per-member',
        status: 'failed',
        expected: 'all anchors pass',
        actual: 'all anchors pass',
        selectorOrRegistryId: 'B2-EV-001',
        exceptionVerdict: 'none',
        payload,
      }),
    ).toThrow('comparison-result-status-payload-mismatch');
  });

  it('requires the complete failed-result envelope and schema payload', () => {
    expect(() =>
      evidenceResultSchema.parse({
        resultId: 'result:failed',
        assertionId: 'VAL-B2-TEST-001',
        populationMemberId: 'population:test',
        coveredPopulationMemberIds: ['population:test'],
        coverageKind: 'per-member',
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
        coverageKind: 'per-member',
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
    expect(
      validateEnforcementCorpus(value),
    ).toContainEqual(
      expect.objectContaining({
        reason: 'population-wide-coverage-blocks-release',
      }),
    );
  });

  it('reports missing-assertion-row when one row is omitted from a two-row map', () => {
    const value = fixture();
    value.map.rows.splice(0, 1);
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-TEST-001',
        reason: 'missing-assertion-row',
      }),
    );
  });

  it('reports missing-evidence-target when one target is omitted from a multi-target row', () => {
    const value = fixture();
    value.map.rows[0].enforcementTargets.splice(0, 1);
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-TEST-001',
        reason: 'missing-evidence-target',
      }),
    );
  });

  it.each([
    ['tagged result', (value: ReturnType<typeof fixture>) => { value.results[0].resultId = 'result:untagged'; }, 'untagged-produced-result'],
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

  it('reports population-size-mismatch when a derived population shrinks', () => {
    const value = fixture();
    value.populationSources['registry:test'].splice(0, 1);
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-TEST-001',
        reason: 'population-size-mismatch',
        expected: 2,
        actual: 1,
      }),
    );
  });

  it('proves per-member coverage reports an omitted population member', () => {
    const value = fixture();
    value.results[0].coverageKind = 'per-member';
    value.results[0].coveredPopulationMemberIds = ['population:test-a'];
    expect(
      validateEnforcementCorpus({
        ...value,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-TEST-001',
        memberId: 'population:test-b',
        reason: 'missing-population-result',
      }),
    );
  });

  it('rejects a nonexistent exact omission proof title and unknown failure reason', () => {
    const missingTitle = fixture();
    missingTitle.map.rows[0].machinePredicate.omissionProof.testTitle =
      'reporter title that does not exist';
    expect(
      validateEnforcementCorpus({
        ...missingTitle,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'nonexistent-test-target' }),
    );

    const invalidReason = fixture();
    (
      invalidReason.map.rows[0].machinePredicate.omissionProof as {
        failureReason: string;
      }
    ).failureReason = 'invented-failure-reason';
    expect(
      validateEnforcementCorpus({
        ...invalidReason,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'invalid-map-schema' }),
    );
  });

  it('fires previously uncovered row, inventory, target, and result reasons', () => {
    const unknown = fixture();
    unknown.map.rows[0].assertionId = 'VAL-B2-TEST-999';
    expect(
      validateEnforcementCorpus({ ...unknown, allowPendingResults: true }),
    ).toContainEqual(expect.objectContaining({ reason: 'unknown-assertion-row' }));

    const duplicate = fixture();
    duplicate.map.rows[1].assertionId = 'VAL-B2-TEST-001';
    expect(
      validateEnforcementCorpus({ ...duplicate, allowPendingResults: true }),
    ).toContainEqual(expect.objectContaining({ reason: 'duplicate-assertion-row' }));

    const missingInventory = fixture();
    delete missingInventory.testTargetInventory[FIXTURE_TEST_FILE];
    expect(
      validateEnforcementCorpus({
        ...missingInventory,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'missing-test-target-inventory' }),
    );

    const missingProducedTag = fixture();
    missingProducedTag.map.rows[0].enforcementTargets.push({
      kind: 'evidence-row',
      evidenceRowId: 'result:not-produced',
      mechanism: 'fixture target omitted from produced results',
    });
    expect(
      validateEnforcementCorpus({
        ...missingProducedTag,
        allowPendingResults: true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        reason: 'missing-enforcement-target-for-result',
      }),
    );

    const misTagged = fixture();
    misTagged.results[0].assertionId = 'VAL-B2-TEST-002';
    expect(
      validateEnforcementCorpus({ ...misTagged, allowPendingResults: true }),
    ).toContainEqual(
      expect.objectContaining({ reason: 'mis-tagged-produced-result' }),
    );
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
