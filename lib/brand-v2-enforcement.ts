import { z } from 'zod';
import {
  BRAND_V2_REFERENCE_RUBRIC,
  referenceAnchorResultSchema,
} from './brand-v2-reference-rubric.ts';

const assertionIdSchema = z.string().regex(/^VAL-B2-[A-Z0-9-]+$/);
const nonEmptyString = z.string().trim().min(1);
export const ENFORCEMENT_FAILURE_REASONS = [
  'invalid-map-schema',
  'duplicate-assertion-row',
  'missing-assertion-row',
  'unknown-assertion-row',
  'missing-population-source',
  'empty-applicable-population',
  'population-size-mismatch',
  'missing-test-target-inventory',
  'nonexistent-test-target',
  'missing-evidence-target',
  'missing-enforcement-target-for-result',
  'missing-population-result',
  'untagged-produced-result',
  'missing-produced-result',
  'mis-tagged-produced-result',
  'pending-result-blocks-release',
  'population-wide-coverage-blocks-release',
  'enforcement-mode-payload-mismatch',
  'unregistered-population-result',
  'duplicate-evidence-result',
  'generated-map-drift',
  'generated-results-drift',
] as const;
const enforcementFailureReasonSchema = z.enum(ENFORCEMENT_FAILURE_REASONS);
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const orderedStepSchema = z
  .object({
    order: z.number().int().positive(),
    id: nonEmptyString,
    action: nonEmptyString,
  })
  .strict();

const orderedCaptureSchema = z
  .object({
    order: z.number().int().positive(),
    id: nonEmptyString,
    afterStep: nonEmptyString,
    kind: z.enum([
      'full-page',
      'bounded',
      'computed-style',
      'semantic',
      'source',
      'image',
      'rubric',
    ]),
  })
  .strict();

const sourceBuildPayloadSchema = z
  .object({
    kind: z.literal('source-build'),
    sourcePath: nonEmptyString,
    predicate: nonEmptyString,
    observed: jsonValueSchema,
    tool: nonEmptyString.optional(),
    toolVersion: nonEmptyString.optional(),
  })
  .strict();

const browserStatePayloadSchema = z
  .object({
    kind: z.literal('browser-state'),
    screenshotPath: nonEmptyString.optional(),
    computed: z.record(z.string(), z.unknown()).optional(),
    aria: z.record(z.string(), z.unknown()).optional(),
    axe: z.record(z.string(), z.unknown()).optional(),
    console: z.array(z.string()).optional(),
    network: z.array(z.string()).optional(),
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (payload) =>
      payload.screenshotPath !== undefined ||
      payload.computed !== undefined ||
      payload.aria !== undefined ||
      payload.axe !== undefined ||
      payload.console !== undefined ||
      payload.network !== undefined,
    'browser-state payload requires browser evidence',
  );

const generatedImagePayloadSchema = z
  .object({
    kind: z.literal('generated-image'),
    imagePath: nonEmptyString,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    generator: nonEmptyString.optional(),
    generatorVersion: nonEmptyString.optional(),
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict();

const completeComparisonPayloadSchema = z
  .object({
    kind: z.literal('autonomous-reference-comparison'),
    rubricVersion: z.literal(1),
    comparisonMode: z.literal('feature-anchors-only'),
    contractLiteralOverridesApplied: z.literal(true),
    referenceIds: z.tuple([
      z.literal('library/brand-reference-board.jpeg'),
      z.literal('library/brand-reference-article.png'),
    ]),
    surfaceId: nonEmptyString,
    anchors: z.array(referenceAnchorResultSchema).length(8),
    passed: z.boolean(),
    screenshotPaths: z.array(nonEmptyString).min(1),
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedIds = BRAND_V2_REFERENCE_RUBRIC.anchors.map(({ id }) => id);
    const actualIds = payload.anchors.map(({ id }) => id);
    if (
      new Set(actualIds).size !== expectedIds.length ||
      expectedIds.some((id) => !actualIds.includes(id))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Comparison payload must contain all rubric anchors once.',
      });
    }
    if (payload.passed !== payload.anchors.every(({ passed }) => passed)) {
      context.addIssue({
        code: 'custom',
        message: 'Comparison pass cannot average or hide a failed anchor.',
      });
    }
  });

const pendingComparisonPayloadSchema = z
  .object({
    kind: z.literal('autonomous-reference-comparison'),
    rubricVersion: z.literal(1),
    comparisonMode: z.literal('feature-anchors-only'),
    contractLiteralOverridesApplied: z.literal(true),
    referenceIds: z.tuple([
      z.literal('library/brand-reference-board.jpeg'),
      z.literal('library/brand-reference-article.png'),
    ]),
    surfaceId: nonEmptyString,
    migrationStatus: z.literal('pending'),
    screenshotPaths: z.array(nonEmptyString).min(1),
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict();

const comparisonPayloadSchema = z.union([
  completeComparisonPayloadSchema,
  pendingComparisonPayloadSchema,
]);

export const evidencePayloadSchema = z.union([
  sourceBuildPayloadSchema,
  browserStatePayloadSchema,
  generatedImagePayloadSchema,
  comparisonPayloadSchema,
]);

const notApplicableReasonSchema = z.discriminatedUnion('code', [
  z
    .object({
      code: z.literal('unsupported-state'),
      registryId: nonEmptyString,
      detail: nonEmptyString,
    })
    .strict(),
  z
    .object({
      code: z.literal('no-applicable-population'),
      populationSource: nonEmptyString,
      detail: nonEmptyString,
    })
    .strict(),
  z
    .object({
      code: z.literal('platform-capability-unavailable'),
      capability: nonEmptyString,
      detail: nonEmptyString,
    })
    .strict(),
]);

const commonResultFields = {
  resultId: nonEmptyString,
  assertionId: assertionIdSchema,
  populationMemberId: nonEmptyString,
  coveredPopulationMemberIds: z.array(nonEmptyString).min(1),
  coverageKind: z.enum(['population-wide', 'per-member']),
  expected: jsonValueSchema,
  actual: jsonValueSchema,
  selectorOrRegistryId: nonEmptyString,
  exceptionVerdict: z.enum(['none', 'accepted', 'rejected']),
  context: z
    .object({
      route: nonEmptyString.optional(),
      interactiveId: nonEmptyString.optional(),
      stateId: nonEmptyString.optional(),
      viewport: z
        .object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          dpr: z.number().positive().optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .optional(),
};

export const evidenceResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      ...commonResultFields,
      status: z.enum(['passed', 'failed', 'pending']),
      payload: evidencePayloadSchema,
    })
    .strict(),
  z
    .object({
      ...commonResultFields,
      status: z.literal('not-applicable'),
      notApplicableReason: notApplicableReasonSchema,
    })
    .strict(),
]).superRefine((result, context) => {
  if (
    result.status !== 'not-applicable' &&
    result.payload.kind === 'autonomous-reference-comparison' &&
    'migrationStatus' in result.payload &&
    result.status !== 'pending'
  ) {
    context.addIssue({
      code: 'custom',
      message:
        'A pending comparison payload is valid only for a pending migration result.',
    });
  }
  if (
    result.status !== 'not-applicable' &&
    result.payload.kind === 'autonomous-reference-comparison' &&
    'anchors' in result.payload &&
    result.status !== (result.payload.passed ? 'passed' : 'failed')
  ) {
    context.addIssue({
      code: 'custom',
      message: 'comparison-result-status-payload-mismatch',
    });
  }
});

const testTargetSchema = z
  .object({
    kind: z.literal('test'),
    file: nonEmptyString,
    title: nonEmptyString,
    mechanism: nonEmptyString,
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict();

const evidenceTargetSchema = z
  .object({
    kind: z.literal('evidence-row'),
    evidenceRowId: nonEmptyString,
    mechanism: nonEmptyString,
    steps: z.array(orderedStepSchema).min(1).optional(),
    captures: z.array(orderedCaptureSchema).min(1).optional(),
  })
  .strict();

export const enforcementMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    rows: z
      .array(
        z
          .object({
            assertionId: assertionIdSchema,
            canonicalPopulationSource: nonEmptyString,
            enforcementTargets: z
              .array(z.discriminatedUnion('kind', [
                testTargetSchema,
                evidenceTargetSchema,
              ]))
              .min(1),
            enforcementMode: z.enum([
              'automated-machine',
              'generated-image',
              'browser-state',
              'autonomous-visual',
            ]),
            machinePredicate: z
              .object({
                statement: nonEmptyString,
                expected: z.unknown(),
                actualSource: nonEmptyString,
                populationSize: z.number().int().positive(),
                omissionProof: z
                  .object({
                    testFile: nonEmptyString,
                    testTitle: nonEmptyString,
                    failureReason: enforcementFailureReasonSchema,
                  })
                  .strict(),
              })
              .strict(),
            producedResult: z
              .object({
                resultIds: z.array(nonEmptyString).min(1),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type EvidenceResult = z.infer<typeof evidenceResultSchema>;
export type EnforcementMap = z.infer<typeof enforcementMapSchema>;

export type EnforcementFailure = {
  assertionId?: string;
  memberId?: string;
  reason: (typeof ENFORCEMENT_FAILURE_REASONS)[number];
  expected: unknown;
  actual: unknown;
};

export function summarizeEnforcementFailures(
  failures: readonly EnforcementFailure[],
): {
  total: number;
  counts: Array<{
    reason: EnforcementFailure['reason'];
    count: number;
  }>;
} {
  const totals = new Map<EnforcementFailure['reason'], number>();
  for (const failure of failures) {
    totals.set(failure.reason, (totals.get(failure.reason) ?? 0) + 1);
  }
  return {
    total: failures.length,
    counts: [...totals]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => left.reason.localeCompare(right.reason)),
  };
}

export function buildEnforcementPopulationSources(input: {
  registry: {
    routes: {
      public: Array<{ id: string; routeKind: 'article' | 'destination' }>;
    };
    metadata: Array<{ id: string }>;
    assets: Array<{ id: string }>;
    interactive: {
      sources: Array<{ id: string }>;
      mounts: Array<{ id: string }>;
    };
    controls: Array<{ id: string }>;
    gridDevices: Array<{ id: string }>;
    surfaces: Array<{ id: string }>;
    pageFrames: Array<{ id: string }>;
    typeRoles: Array<{ id: string }>;
  };
  baselineManifestIds: string[];
  deepRowIds: string[];
  assertionIds: string[];
}): Record<string, string[]> {
  const { registry } = input;
  return {
    'contract/brand-v2-registries.json#routes.public':
      registry.routes.public.map(({ id }) => id),
    'contract/brand-v2-registries.json#routes.public:article':
      registry.routes.public
        .filter(({ routeKind }) => routeKind === 'article')
        .map(({ id }) => id),
    'contract/brand-v2-registries.json#metadata':
      registry.metadata.map(({ id }) => id),
    'contract/brand-v2-registries.json#assets':
      registry.assets.map(({ id }) => id),
    'contract/brand-v2-registries.json#interactive.sources':
      registry.interactive.sources.map(({ id }) => id),
    'contract/brand-v2-registries.json#interactive.mounts':
      registry.interactive.mounts.map(({ id }) => id),
    'contract/brand-v2-registries.json#controls':
      registry.controls.map(({ id }) => id),
    'contract/brand-v2-registries.json#gridDevices':
      registry.gridDevices.map(({ id }) => id),
    'contract/brand-v2-registries.json#surfaces':
      registry.surfaces.map(({ id }) => id),
    'contract/brand-v2-registries.json#pageFrames':
      registry.pageFrames.map(({ id }) => id),
    'contract/brand-v2-registries.json#typeRoles':
      registry.typeRoles.map(({ id }) => id),
    'lib/brand-v2-runners.ts#BRAND_V2_DEEP_ROWS': input.deepRowIds,
    'evidence/brand-v2/baseline/baseline.json#manifests':
      input.baselineManifestIds,
    'contract/design-integrity.md#VAL-B2-assertions': input.assertionIds,
  };
}

export function extractBrandV2Assertions(markdown: string): Array<{
  id: string;
  requirement: string;
}> {
  const requirements = new Map<string, string>();
  for (const match of markdown.matchAll(
    /^\|\s*`(VAL-B2-[A-Z0-9-]+)`\s*\|\s*(.+?)\s*\|$/gm,
  )) {
    if (!requirements.has(match[1])) requirements.set(match[1], match[2]);
  }
  return [...requirements]
    .map(([id, requirement]) => ({ id, requirement }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function schemaFailure(error: unknown): EnforcementFailure {
  return {
    reason: 'invalid-map-schema',
    expected: 'sealed assertion-enforcement-map schema',
    actual: error instanceof Error ? error.message : String(error),
  };
}

export function validateEnforcementCorpus(input: {
  assertionIds: readonly string[];
  populationSources: Record<string, readonly string[]>;
  map: EnforcementMap;
  results: readonly EvidenceResult[];
  testTargetInventory?: Record<string, readonly string[]>;
  allowPendingResults?: boolean;
}): EnforcementFailure[] {
  const parsedMap = enforcementMapSchema.safeParse(input.map);
  if (!parsedMap.success) return [schemaFailure(parsedMap.error)];
  const failures: EnforcementFailure[] = [];
  const rows = parsedMap.data.rows;
  const rowByAssertion = new Map(rows.map((row) => [row.assertionId, row]));
  const resultById = new Map(input.results.map((result) => [result.resultId, result]));
  const resultsByAssertion = new Map<string, EvidenceResult[]>();
  for (const result of input.results) {
    const assertionResults = resultsByAssertion.get(result.assertionId) ?? [];
    assertionResults.push(result);
    resultsByAssertion.set(result.assertionId, assertionResults);
  }

  for (const id of duplicates(rows.map(({ assertionId }) => assertionId))) {
    failures.push({
      assertionId: id,
      reason: 'duplicate-assertion-row',
      expected: 'one enforcement row',
      actual: 'duplicate',
    });
  }
  for (const id of input.assertionIds) {
    if (!rowByAssertion.has(id)) {
      failures.push({
        assertionId: id,
        reason: 'missing-assertion-row',
        expected: 'one enforcement row',
        actual: null,
      });
    }
  }
  for (const row of rows) {
    if (!input.assertionIds.includes(row.assertionId)) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'unknown-assertion-row',
        expected: input.assertionIds,
        actual: row.assertionId,
      });
    }
    const population = input.populationSources[row.canonicalPopulationSource];
    if (!population) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'missing-population-source',
        expected: row.canonicalPopulationSource,
        actual: null,
      });
      continue;
    }
    if (population.length === 0) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'empty-applicable-population',
        expected: 'non-empty population',
        actual: 0,
      });
    }
    if (row.machinePredicate.populationSize !== population.length) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'population-size-mismatch',
        expected: row.machinePredicate.populationSize,
        actual: population.length,
      });
    }
    const populationSet = new Set(population);
    const evidenceTargets = new Set(
      row.enforcementTargets
        .filter((target) => target.kind === 'evidence-row')
        .map((target) => target.evidenceRowId),
    );
    for (const target of row.enforcementTargets) {
      if (target.kind === 'test') {
        const inventory = input.testTargetInventory?.[target.file];
        if (!inventory) {
          failures.push({
            assertionId: row.assertionId,
            reason: 'missing-test-target-inventory',
            expected: `${target.file} :: ${target.title}`,
            actual: null,
          });
          continue;
        }
        if (!inventory.includes(target.title)) {
          failures.push({
            assertionId: row.assertionId,
            reason: 'nonexistent-test-target',
            expected: `${target.file} :: ${target.title}`,
            actual: 'reporter-visible title missing',
          });
        }
      } else if (!resultById.has(target.evidenceRowId)) {
        failures.push({
          assertionId: row.assertionId,
          reason: 'missing-evidence-target',
          expected: target.evidenceRowId,
          actual: null,
        });
      }
    }
    const omissionInventory =
      input.testTargetInventory?.[row.machinePredicate.omissionProof.testFile];
    if (!omissionInventory) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'missing-test-target-inventory',
        expected: `${row.machinePredicate.omissionProof.testFile} :: ${row.machinePredicate.omissionProof.testTitle}`,
        actual: null,
      });
    } else if (
      !omissionInventory.includes(row.machinePredicate.omissionProof.testTitle)
    ) {
      failures.push({
        assertionId: row.assertionId,
        reason: 'nonexistent-test-target',
        expected: `${row.machinePredicate.omissionProof.testFile} :: ${row.machinePredicate.omissionProof.testTitle}`,
        actual: 'reporter-visible title missing',
      });
    }
    const produced = new Set(row.producedResult.resultIds);
    const assertionResults = resultsByAssertion.get(row.assertionId) ?? [];
    const hasPopulationWideResult = assertionResults.some(
      (result) => result.coverageKind === 'population-wide',
    );
    for (const resultId of produced) {
      if (!evidenceTargets.has(resultId)) {
        failures.push({
          assertionId: row.assertionId,
          reason: 'missing-evidence-target',
          expected: resultId,
          actual: [...evidenceTargets],
        });
      }
    }
    for (const evidenceTarget of evidenceTargets) {
      if (!produced.has(evidenceTarget)) {
        failures.push({
          assertionId: row.assertionId,
          reason: 'missing-enforcement-target-for-result',
          expected: evidenceTarget,
          actual: [...produced],
        });
      }
    }
    for (const memberId of population) {
      const matching = assertionResults.filter((result) =>
        result.coverageKind === 'per-member' &&
        result.coveredPopulationMemberIds.includes(memberId),
      );
      if (matching.length === 0 && !hasPopulationWideResult) {
        failures.push({
          assertionId: row.assertionId,
          memberId,
          reason: 'missing-population-result',
          expected: 'one tagged result',
          actual: 0,
        });
      }
    }
    for (const result of assertionResults) {
      if (!produced.has(result.resultId)) {
        failures.push({
          assertionId: row.assertionId,
          memberId: result.populationMemberId,
          reason: 'untagged-produced-result',
          expected: row.producedResult.resultIds,
          actual: result.resultId,
        });
      }
    }
    for (const resultId of produced) {
      const result = resultById.get(resultId);
      if (!result) {
        failures.push({
          assertionId: row.assertionId,
          reason: 'missing-produced-result',
          expected: resultId,
          actual: null,
        });
      } else if (result.assertionId !== row.assertionId) {
        failures.push({
          assertionId: row.assertionId,
          reason: 'mis-tagged-produced-result',
          expected: row.assertionId,
          actual: result.assertionId,
        });
      } else {
        if (
          result.status === 'pending' &&
          input.allowPendingResults !== true
        ) {
          failures.push({
            assertionId: row.assertionId,
            memberId: result.populationMemberId,
            reason: 'pending-result-blocks-release',
            expected: 'passed, failed, or typed not-applicable result',
            actual: 'pending',
          });
        }
        if (
          result.coverageKind === 'population-wide' &&
          input.allowPendingResults !== true
        ) {
          failures.push({
            assertionId: row.assertionId,
            memberId: result.populationMemberId,
            reason: 'population-wide-coverage-blocks-release',
            expected: 'per-member coverage',
            actual: 'population-wide',
          });
        }
        if (
          result.status !== 'not-applicable' &&
          {
            'automated-machine': 'source-build',
            'generated-image': 'generated-image',
            'browser-state': 'browser-state',
            'autonomous-visual': 'autonomous-reference-comparison',
          }[row.enforcementMode] !== result.payload.kind
        ) {
          failures.push({
            assertionId: row.assertionId,
            memberId: result.populationMemberId,
            reason: 'enforcement-mode-payload-mismatch',
            expected: row.enforcementMode,
            actual: result.payload.kind,
          });
        }
      }
    }
    for (const result of assertionResults) {
      for (const memberId of result.coveredPopulationMemberIds) {
        if (!populationSet.has(memberId)) {
          failures.push({
            assertionId: row.assertionId,
            memberId,
            reason: 'unregistered-population-result',
            expected: population,
            actual: memberId,
          });
        }
      }
    }
  }
  for (const id of duplicates(input.results.map(({ resultId }) => resultId))) {
    failures.push({
      memberId: id,
      reason: 'duplicate-evidence-result',
      expected: 'unique result id',
      actual: 'duplicate',
    });
  }
  return failures;
}
