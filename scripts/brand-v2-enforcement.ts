import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evidenceResultSchema,
  enforcementMapSchema,
  buildEnforcementPopulationSources,
  extractBrandV2Assertions,
  summarizeEnforcementFailures,
  validateEnforcementCorpus,
  type EvidenceResult,
  type EnforcementMap,
} from '../lib/brand-v2-enforcement.ts';
import { BRAND_V2_DEEP_ROWS } from '../lib/brand-v2-runners.ts';
import { deriveTestTargetInventory } from '../lib/brand-v2-test-inventory.ts';
import { scanAnnotationLiterals } from '../lib/brand-v2-annotation-scan.ts';
import {
  TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE,
  TEKTUR_BINARY_POPULATION_SOURCE,
  TEKTUR_OG_BINARY_POPULATION_SOURCE,
  TEKTUR_OG_MAPPING_POPULATION_SOURCE,
  TEKTUR_POPULATION_IDS,
  TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE,
  TEKTUR_WEB_BINARY_POPULATION_SOURCE,
  tekturPopulationMember,
} from '../lib/tektur-populations.ts';

const ROOT = process.cwd();
const MAP_PATH = join(ROOT, 'contract', 'brand-v2-enforcement-map.json');
const RESULTS_PATH = join(ROOT, 'evidence', 'brand-v2', 'results.json');
const COMPLETED_TEKTUR_ASSERTIONS = new Set([
  'VAL-B2-TYPE-001',
  'VAL-B2-TYPE-002',
  'VAL-B2-TYPE-011',
  'VAL-B2-TYPE-012',
  'VAL-B2-TYPE-013',
  'VAL-B2-TYPE-014',
  'VAL-B2-TYPE-015',
  'VAL-B2-TYPE-016',
  'VAL-B2-TYPE-017',
]);
/**
 * Completed by the shared-primitive feature. Leaving them pending while the
 * feature claims to fulfil them is R8c: a fulfils list with no truthful
 * passing result. Their evidence is derived per registered member below.
 */
const COMPLETED_PRIMITIVE_ASSERTIONS = new Set([
  'VAL-B2-GRID-009',
  'VAL-B2-SURF-010',
  'VAL-B2-COMP-013',
]);

function isCompleted(id: string): boolean {
  return (
    COMPLETED_TEKTUR_ASSERTIONS.has(id) ||
    COMPLETED_PRIMITIVE_ASSERTIONS.has(id)
  );
}

type Registry = Parameters<
  typeof buildEnforcementPopulationSources
>[0]['registry'];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const REGISTRY = readJson(
  join(ROOT, 'contract', 'brand-v2-registries.json'),
) as Registry & {
  gridDevices: Array<Record<string, unknown>>;
  surfaces: Array<Record<string, unknown>>;
  controls: Array<Record<string, unknown>>;
};
const ANNOTATION_SCAN = scanAnnotationLiterals(ROOT);

function populationSources(assertionIds: string[]) {
  const baseline = readJson(
    join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
  ) as { manifests: Record<string, unknown> };
  return buildEnforcementPopulationSources({
    registry: REGISTRY,
    baselineManifestIds: Object.keys(baseline.manifests).sort(),
    deepRowIds: BRAND_V2_DEEP_ROWS.map(({ id }) => id),
    assertionIds,
    tekturPopulations: TEKTUR_POPULATION_IDS,
  });
}

function populationSourceFor(id: string): string {
  if (id === 'VAL-B2-TYPE-015') {
    return TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE;
  }
  if (id === 'VAL-B2-TYPE-016') return TEKTUR_OG_MAPPING_POPULATION_SOURCE;
  if (id === 'VAL-B2-TYPE-017') {
    return TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE;
  }
  if (id === 'VAL-B2-TYPE-011') return TEKTUR_WEB_BINARY_POPULATION_SOURCE;
  if (id === 'VAL-B2-TYPE-012') return TEKTUR_OG_BINARY_POPULATION_SOURCE;
  if (
    ['VAL-B2-TYPE-002', 'VAL-B2-TYPE-013', 'VAL-B2-TYPE-014'].includes(id)
  ) {
    return TEKTUR_BINARY_POPULATION_SOURCE;
  }
  const area = id.split('-')[2];
  if (area === 'BASE') {
    return 'evidence/brand-v2/baseline/baseline.json#manifests';
  }
  if (area === 'VIZ') {
    return id === 'VAL-B2-VIZ-012'
      ? 'contract/brand-v2-registries.json#interactive.mounts'
      : 'contract/brand-v2-registries.json#interactive.sources';
  }
  if (area === 'EVID') {
    return 'lib/brand-v2-runners.ts#BRAND_V2_DEEP_ROWS';
  }
  if (area === 'GOV') {
    return 'contract/design-integrity.md#VAL-B2-assertions';
  }
  if (area === 'TYPE') return 'contract/brand-v2-registries.json#typeRoles';
  if (area === 'GRID') return 'contract/brand-v2-registries.json#gridDevices';
  if (area === 'SURF') return 'contract/brand-v2-registries.json#surfaces';
  if (area === 'SPACE') return 'contract/brand-v2-registries.json#pageFrames';
  if (area === 'COMP') return 'contract/brand-v2-registries.json#controls';
  if (area === 'IMG') return 'contract/brand-v2-registries.json#assets';
  if (area === 'OG') return 'contract/brand-v2-registries.json#metadata';
  if (area === 'ART') {
    return 'contract/brand-v2-registries.json#routes.public:article';
  }
  return 'contract/brand-v2-registries.json#routes.public';
}

function modeFor(id: string): EnforcementMap['rows'][number]['enforcementMode'] {
  const area = id.split('-')[2];
  if (
    ['GOV', 'BASE'].includes(area) ||
    isCompleted(id) ||
    ['VAL-B2-EVID-014', 'VAL-B2-EVID-016'].includes(id)
  ) {
    return 'automated-machine';
  }
  if (area === 'OG') return 'generated-image';
  if (['EVID', 'IMG', 'TYPE', 'COL', 'GRID', 'SURF'].includes(area)) {
    return 'autonomous-visual';
  }
  return 'browser-state';
}

type TestTarget = Extract<
  EnforcementMap['rows'][number]['enforcementTargets'][number],
  { kind: 'test' }
>;

function testTarget(
  file: string,
  title: string,
  mechanism: string,
): TestTarget {
  return { kind: 'test', file, title, mechanism };
}

const CENSUS_ROUTE_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > reconciles fixed, domain, and article routes without counting 404 as public',
  'Derives and reconciles the current public-route population; it does not prove the row’s pending visual outcome.',
);
const ROUTE_FLOW_TARGET = testTarget(
  'tests/e2e/brand-v2-route-flows.spec.ts',
  'brand-v2-route-flows › derives and renders every public destination while keeping 404 separate',
  'Executes navigate, history restoration, and per-route browser-render, computed-style, Axe, keyboard, forced-colours, reflow, overflow, resource/font, and residue profiles for every registry-derived public destination; the row’s brand-v2 visual predicate remains pending.',
);
const CENSUS_INTERACTIVE_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > derives every interactive source and production mount from repository source',
  'Derives the current interactive source and production-mount populations from repository source and reconciles their registered cases.',
);
const INTERACTIVE_STATE_TARGET = testTarget(
  'tests/e2e/brand-v2-interactive-states.spec.ts',
  'brand-v2 interactive-state runner › reconciles non-empty registry sources, production mounts, controls, and exact cases',
  'Accounts for every registered interactive case and exercises or explicitly classifies its current milestone-1 mechanism; later visual convergence remains pending.',
);
const PRIMITIVE_REGISTRY_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > registers complete grid, surface, and control primitive contracts',
  'Validates every primitive registry row has the sealed owner, geometry, state, target-size, and allowed-owner fields with stable fingerprints.',
);
const PRIMITIVE_BROWSER_TARGETS = {
  'VAL-B2-GRID-009': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-GRID-009 renders registered, aligned, pointer-inert devices',
    'Checks rendered device IDs against the registry, pointer and ARIA behavior, and the sealed 2px alignment bound.',
  ),
  'VAL-B2-SURF-010': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-SURF-010 source, registry and rendered surface populations are equal',
    'Discovers surfaces structurally, requires an annotation on every discovered member, and equates the source, registry, and rendered populations while rejecting backdrop blur, filters, and coloured glow.',
  ),
  'VAL-B2-COMP-013': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-COMP-013 source, registry and rendered control populations reconcile',
    'Discovers controls structurally, requires an annotation on every discovered member, checks each row owner list against the modules that render it, and rejects persistent selected, pressed, or current ARIA on transient controls.',
  ),
} satisfies Record<string, TestTarget>;
const PRIMITIVE_TARGET_SIZE_TARGET = testTarget(
  'tests/e2e/brand-v2-primitives.spec.ts',
  'brand-v2 shared primitive registry › VAL-B2-COMP-014 undersized targets rely only on registered WCAG exceptions',
  'Measures every structurally discovered control against the registered 24px minimum and admits an undersized target only when the SC 2.5.8 exception it satisfies geometrically is the one its registry row records.',
);
const PRIMITIVE_TABLE_REGION_TARGET = testTarget(
  'tests/e2e/brand-v2-primitives.spec.ts',
  'brand-v2 shared primitive registry › VAL-B2-COMP-009 focusable table scroll regions are named regions',
  'Requires every focusable horizontal table-scroll container to expose the region role with a name that resolves to real text.',
);
const BASELINE_TARGET = testTarget(
  'tests/unit/brand-v2-baseline.test.ts',
  'brand-v2 immutable baseline > fails with a tagged omission when one %s member is deleted',
  'Mutates each immutable baseline manifest class and proves an omitted member produces a tagged baseline failure.',
);
const ASSET_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > accounts for every physical asset through a registry or narrow identical-byte exception',
  'Reconciles the git-tracked physical-asset population against registered assets and proves missing and unregistered assets fail.',
);
const TEKTUR_BROWSER_TARGET = testTarget(
  'tests/e2e/tektur-font-delivery.spec.ts',
  'Tektur web delivery › loads the local variable face without a third-party request or glyph fallback',
  'Loads every registered Tektur role instance from the static export, verifies computed axes and same-origin WOFF2 resources, and rejects runtime Google-font or static-OG-TTF requests.',
);

function tekturUnitTarget(title: string, mechanism: string): TestTarget {
  return testTarget(
    'tests/unit/tektur-fonts.test.ts',
    `Tektur font delivery contract > ${title}`,
    mechanism,
  );
}

function tekturTargetsFor(id: string): TestTarget[] {
  if (id === 'VAL-B2-TYPE-001' || id === 'VAL-B2-TYPE-002') {
    return [
      tekturUnitTarget(
        'registers exactly four first-party families (VAL-B2-TYPE-001, VAL-A11Y-014)',
        'Pins the four first-party families to their display, interface, reading, and data roles.',
      ),
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-015' || id === 'VAL-B2-TYPE-016') {
    return [
      tekturUnitTarget(
        'registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)',
        'Pins all six measurable wght/wdth role instances and the exact static OG role mapping.',
      ),
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-017') {
    return [
      tekturUnitTarget(
        'keeps assigned web and OG strings non-empty and code-point addressable (VAL-B2-TYPE-017)',
        'Derives the assigned identity, descriptor, numeral, domain, and article-title string population before cmap inspection.',
      ),
      TEKTUR_BROWSER_TARGET,
    ];
  }
  return [
    tekturUnitTarget(
      'inspects checksums, formats, axes, static mapping, and cmap coverage (VAL-B2-TYPE-011 through 017)',
      'Opens both binaries with fontkit and verifies checksums, formats, exact axes, static mapping, license metadata, and assigned-string cmap coverage.',
    ),
    TEKTUR_BROWSER_TARGET,
  ];
}
const RUNNER_ROUTE_TARGET = testTarget(
  'tests/unit/brand-v2-runners.test.ts',
  'brand-v2 exhaustive runners > derives one non-empty public-route plan member per registry route and keeps 404 separate',
  'Builds a non-empty execution-plan member for every registered public route while keeping the 404 population separate.',
);
const RUNNER_DEEP_TARGET = testTarget(
  'tests/unit/brand-v2-runners.test.ts',
  'brand-v2 exhaustive runners > defines all 27 sealed deep rows with ordered steps and captures',
  'Proves the sealed deep-row inventory has all 27 members with valid ordered steps and captures.',
);
const DEEP_ROW_TARGET = testTarget(
  'tests/e2e/brand-v2-deep-rows.spec.ts',
  'brand-v2 27-row deep executor › enforces all sealed row interactions and capture populations',
  'Executes every sealed deep-row interaction and capture population and enforces exact archived functional failures; full v2 visual parity remains pending.',
);
const ENFORCEMENT_TARGET = testTarget(
  'tests/unit/brand-v2-enforcement.test.ts',
  'brand-v2 enforcement map and evidence schemas > accepts the checked-in map and tagged result corpus',
  'Validates assertion, population, target, result, payload, and pending-migration relationships in the checked-in enforcement corpus.',
);
const OMISSION_PROOF = {
  testFile: 'tests/unit/brand-v2-enforcement.test.ts',
  testTitle:
    'brand-v2 enforcement map and evidence schemas > reports missing-assertion-row when one row is omitted from a two-row map',
  failureReason: 'missing-assertion-row' as const,
};

function testTargetsFor(id: string): TestTarget[] {
  if (COMPLETED_TEKTUR_ASSERTIONS.has(id)) return tekturTargetsFor(id);
  if (id in PRIMITIVE_BROWSER_TARGETS) {
    return [
      PRIMITIVE_REGISTRY_TARGET,
      PRIMITIVE_BROWSER_TARGETS[id as keyof typeof PRIMITIVE_BROWSER_TARGETS],
    ];
  }
  const area = id.split('-')[2];
  if (area === 'BASE') return [BASELINE_TARGET];
  if (area === 'CONT') return [CENSUS_ROUTE_TARGET];
  if (area === 'IMG') return [ASSET_TARGET];
  if (area === 'VIZ') {
    return [CENSUS_INTERACTIVE_TARGET, INTERACTIVE_STATE_TARGET];
  }
  if (area === 'GOV' || ['VAL-B2-EVID-014', 'VAL-B2-EVID-016'].includes(id)) {
    return [ENFORCEMENT_TARGET];
  }
  if (area === 'EVID') {
    if (['VAL-B2-EVID-008', 'VAL-B2-EVID-012'].includes(id)) {
      return [RUNNER_ROUTE_TARGET, ROUTE_FLOW_TARGET];
    }
    if (id === 'VAL-B2-EVID-009') return [INTERACTIVE_STATE_TARGET];
    if (id === 'VAL-B2-EVID-010') {
      return [RUNNER_DEEP_TARGET, DEEP_ROW_TARGET];
    }
    if (id === 'VAL-B2-EVID-011') {
      return [
        testTarget(
          'tests/e2e/brand-v2-reflow-320-200.spec.ts',
          'brand-v2-reflow-320-200 › enforces route loading, zoom-equivalent, and text-only profiles for every route',
          'Exercises every registered route under the milestone-1 reflow, zoom-equivalent, and text-only profiles; archived 320px rollout drift remains separate.',
        ),
        testTarget(
          'tests/e2e/brand-v2-reduced-motion.spec.ts',
          'brand-v2-reduced-motion › keeps every registered mount route interactive under reduce',
          'Checks that every registered interactive mount route remains present and operable under reduced motion.',
        ),
        testTarget(
          'tests/e2e/brand-v2-forced-colours.spec.ts',
          'brand-v2-forced-colours › preserves every derived route in forced-colours mode',
          'Visits the derived route population in forced-colours mode and checks current route preservation.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › covers deterministic results, Methods facet, URL sync, focus retention, and recovery',
          'Exercises the current search-state flow, including deterministic results, facet state, URL sync, focus retention, and recovery.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › shows the product unavailable state when both search indexes fail',
          'Forces both search indexes unavailable and asserts the product’s unavailable status and visible recovery witness.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › keeps the later query when an earlier request resolves after it',
          'Issues a second query while the first request remains in flight, resolves the first last, and asserts the later result remains authoritative.',
        ),
      ];
    }
    if (id === 'VAL-B2-EVID-013') {
      return [
        ROUTE_FLOW_TARGET,
        testTarget(
          'tests/e2e/brand-v2-article-interactions.spec.ts',
          'brand-v2-article-interactions › executes the ordered article interaction flow over the derived article population',
          'Executes the ordered article interaction flow over the registry-derived article population.',
        ),
        testTarget(
          'tests/e2e/brand-v2-market-map-states.spec.ts',
          'brand-v2-market-map-states › executes ordered view, filter, selection, and history phases',
          'Executes the registered market-map view, filter, selection, and history phases in order.',
        ),
        testTarget(
          'tests/e2e/brand-v2-playground-states.spec.ts',
          'brand-v2-playground-states › executes ordered FK/IK, import/error, trajectory, and fallback phases',
          'Executes the registered playground FK/IK, import/error, trajectory, and fallback phases in order.',
        ),
      ];
    }
    if (id === 'VAL-B2-EVID-004') {
      return [testTarget(
        'tests/e2e/brand-v2-reference-rubric.spec.ts',
        'brand-v2 reference-feature rubric › article comparison applies literals and article hierarchy without pixels',
        'Applies every independent reference-feature anchor to the article surface and enforces exact archived anchor drift without cross-composition pixel scoring.',
      )];
    }
    if (id === 'VAL-B2-EVID-015') {
      return [testTarget(
        'tests/e2e/brand-v2-reference-rubric.spec.ts',
        'brand-v2 reference-feature rubric › home comparison applies all independent reference anchors',
        'Applies every independent reference-feature anchor to the home surface and enforces exact archived anchor drift without cross-composition pixel scoring.',
      )];
    }
    return [RUNNER_DEEP_TARGET];
  }
  if (id === 'VAL-B2-COMP-014') {
    return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET, PRIMITIVE_TARGET_SIZE_TARGET];
  }
  if (id === 'VAL-B2-COMP-009') {
    return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET, PRIMITIVE_TABLE_REGION_TARGET];
  }
  return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET];
}

type CompletedEvidence = {
  sourcePath: string;
  observed: Record<string, unknown>;
  tool: string;
};

const PRIMITIVE_EVIDENCE_FIELDS = {
  'VAL-B2-GRID-009': {
    registryKey: 'gridDevices' as const,
    fields: [
      'ownerSurface',
      'structuralPurpose',
      'anchorGeometry',
      'classification',
      'ariaBehavior',
      'pointerBehavior',
      'allowedViewports',
      'alignmentTolerancePx',
    ],
    // VAL-B2-GRID-009 requires every *rendered* device layer to carry a
    // complete registry row, not every registered class to be mounted, so a
    // declared class the product has not adopted yet is recorded as
    // unmounted rather than treated as a missing owner.
    requireSourceOwner: false,
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
  'VAL-B2-SURF-010': {
    registryKey: 'surfaces' as const,
    fields: [
      'level',
      'stackingPurpose',
      'allowedRadiusPx',
      'border',
      'shadow',
      'allowedOwners',
    ],
    requireSourceOwner: true,
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
  'VAL-B2-COMP-013': {
    registryKey: 'controls' as const,
    fields: [
      'action',
      'statePurpose',
      'persistentAria',
      'supportedStates',
      'ownerRouteOrMount',
      'targetSize',
      'pointerAlternative',
    ],
    requireSourceOwner: true,
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
} as const;

/**
 * Per-member evidence for a completed assertion, read out of the artifact the
 * assertion inspects. A missing field or an unmounted registry ID throws
 * rather than producing a `passed` row, because a result the generator could
 * emit without the underlying record being complete would be exactly the
 * unfalsifiable evidence this corpus exists to prevent.
 */
function completedEvidence(
  assertionId: string,
  populationSource: string,
  member: string,
): CompletedEvidence {
  if (COMPLETED_TEKTUR_ASSERTIONS.has(assertionId)) {
    if (populationSource === 'contract/brand-v2-registries.json#typeRoles') {
      const role = REGISTRY.typeRoles.find(({ id }) => id === member) as
        | { id: string; family?: string }
        | undefined;
      if (!role?.family) {
        throw new Error(`Type role ${member} records no family`);
      }
      return {
        sourcePath: 'data/type-roles.json',
        observed: { role: role.id, family: role.family },
        tool: 'fontkit + Vitest + Playwright',
      };
    }
    const entry = tekturPopulationMember(populationSource, member);
    return {
      sourcePath: entry.sourcePath,
      observed: entry.observed,
      tool: 'fontkit + Vitest + Playwright',
    };
  }
  const spec =
    PRIMITIVE_EVIDENCE_FIELDS[
      assertionId as keyof typeof PRIMITIVE_EVIDENCE_FIELDS
    ];
  if (!spec) throw new Error(`No completed evidence shape for ${assertionId}`);
  const row = REGISTRY[spec.registryKey].find(
    (candidate) => candidate.id === member,
  );
  if (!row) throw new Error(`${assertionId}: ${member} is not registered`);
  const observed: Record<string, unknown> = {};
  for (const field of spec.fields) {
    const value = (row as Record<string, unknown>)[field];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0) ||
      // A control legitimately carries no persistent ARIA; every other listed
      // field is meaningless when empty.
      (Array.isArray(value) &&
        value.length === 0 &&
        field !== 'persistentAria');
    if (empty) throw new Error(`${assertionId}: ${member} records no ${field}`);
    observed[field] = value;
  }
  // The registry row is only half the claim: where the assertion demands
  // source/registry equality, an ID nothing writes is a record of a primitive
  // that does not exist. The module list itself is not recorded, because a
  // committed artifact must not carry a filesystem walk's machine-local
  // result.
  const mounted = (ANNOTATION_SCAN.ownersById[member] ?? []).length > 0;
  if (spec.requireSourceOwner && !mounted) {
    throw new Error(
      `${assertionId}: ${member} is registered but no first-party module writes it`,
    );
  }
  observed.sourceMounted = mounted;
  return {
    sourcePath: 'contract/brand-v2-registries.json',
    observed,
    tool: spec.tool,
  };
}

function resultFor(
  assertionId: string,
  populationMemberIds: string[],
  requirement: string,
  populationSource: string,
  mode: EnforcementMap['rows'][number]['enforcementMode'],
  member?: string,
): EvidenceResult {
  const perMember = member !== undefined;
  const common = {
    resultId: perMember
      ? `result:${assertionId}:${member}`
      : `result:${assertionId}`,
    assertionId,
    populationMemberId: member ?? `population:${populationSource}`,
    coveredPopulationMemberIds: populationMemberIds,
    coverageKind: perMember ? ('per-member' as const) : ('population-wide' as const),
    status: isCompleted(assertionId) ? ('passed' as const) : ('pending' as const),
    expected: requirement,
    actual: isCompleted(assertionId)
      ? `verified for ${member} by the gates named in this row's enforcement targets`
      : 'awaiting responsible rollout milestone',
    selectorOrRegistryId: populationSource,
    exceptionVerdict: 'none' as const,
  };
  if (isCompleted(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is completed and must record per-member evidence`,
      );
    }
    const evidence = completedEvidence(assertionId, populationSource, member);
    return {
      ...common,
      payload: {
        kind: 'source-build',
        sourcePath: evidence.sourcePath,
        predicate: requirement,
        observed: evidence.observed,
        tool: evidence.tool,
      },
    };
  }
  if (mode === 'generated-image') {
    return {
      ...common,
      payload: {
        kind: 'generated-image',
        imagePath: `pending://${assertionId}`,
        width: 1200,
        height: 630,
        sha256: '0'.repeat(64),
        generator: 'pending brand-v2 rollout',
      },
    };
  }
  if (mode === 'autonomous-visual') {
    return {
      ...common,
      payload: {
        kind: 'autonomous-reference-comparison',
        rubricVersion: 1,
        comparisonMode: 'feature-anchors-only',
        contractLiteralOverridesApplied: true,
        referenceIds: [
          'library/brand-reference-board.jpeg',
          'library/brand-reference-article.png',
        ],
        surfaceId: `pending:${assertionId}`,
        migrationStatus: 'pending',
        screenshotPaths: [`pending://${assertionId}`],
      },
    };
  }
  if (mode === 'browser-state') {
    return {
      ...common,
      payload: {
        kind: 'browser-state',
        computed: { status: 'pending' },
      },
    };
  }
  return {
    ...common,
    payload: {
      kind: 'source-build',
      sourcePath: 'contract/design-integrity.md',
      predicate: requirement,
      observed: 'pending',
      tool: 'brand-v2-enforcement',
    },
  };
}

function generate() {
  const contract = readFileSync(
    join(ROOT, 'contract', 'design-integrity.md'),
    'utf8',
  );
  const assertions = extractBrandV2Assertions(contract);
  const sources = populationSources(assertions.map(({ id }) => id));
  const results: EvidenceResult[] = [];
  const rows: EnforcementMap['rows'] = assertions.map(
    ({ id, requirement }) => {
      const canonicalPopulationSource = populationSourceFor(id);
      const population = sources[canonicalPopulationSource];
      if (!population?.length) {
        throw new Error(`Population is empty for ${id}: ${canonicalPopulationSource}`);
      }
      const enforcementMode = modeFor(id);
      const assertionResults = isCompleted(id)
        ? population.map((member) =>
            resultFor(
              id,
              [member],
              requirement,
              canonicalPopulationSource,
              enforcementMode,
              member,
            ),
          )
        : [
            resultFor(
              id,
              population,
              requirement,
              canonicalPopulationSource,
              enforcementMode,
            ),
          ];
      results.push(...assertionResults);
      return {
        assertionId: id,
        canonicalPopulationSource,
        enforcementTargets: [
          ...assertionResults.map((assertionResult) => ({
            kind: 'evidence-row' as const,
            evidenceRowId: assertionResult.resultId,
            mechanism: isCompleted(id)
              ? `${id} passed per-member evidence derived from ${canonicalPopulationSource}`
              : `${id} pending rollout evidence over ${canonicalPopulationSource}`,
          })),
          ...testTargetsFor(id),
        ],
        enforcementMode,
        machinePredicate: {
          statement: requirement,
          expected: requirement,
          actualSource: 'evidence/brand-v2/results.json',
          populationSize: population.length,
          omissionProof: OMISSION_PROOF,
        },
        producedResult: {
          resultIds: assertionResults.map(({ resultId }) => resultId),
        },
      };
    },
  );
  return {
    sources,
    map: enforcementMapSchema.parse({ schemaVersion: 1, rows }),
    results: results.map((result) => evidenceResultSchema.parse(result)),
  };
}

const args = new Set(process.argv.slice(2));
const mode = process.argv.slice(2).find((argument) =>
  ['--write', '--check', '--check-release'].includes(argument),
);
const countOnly = args.has('--count-only');
const generated = generate();
if (mode === '--write') {
  writeFileSync(MAP_PATH, `${JSON.stringify(generated.map, null, 2)}\n`);
  writeFileSync(
    RESULTS_PATH,
    `${JSON.stringify({ schemaVersion: 1, results: generated.results }, null, 2)}\n`,
  );
  console.log(
    `brand-v2-enforcement: wrote ${generated.map.rows.length} assertion rows and ${generated.results.length} tagged results`,
  );
} else if (mode === '--check' || mode === '--check-release') {
  const map = enforcementMapSchema.parse(readJson(MAP_PATH));
  const resultDocument = readJson(RESULTS_PATH) as {
    schemaVersion: number;
    results: unknown[];
  };
  if (resultDocument.schemaVersion !== 1) {
    throw new Error('Evidence result document schemaVersion must be 1.');
  }
  const results = resultDocument.results.map((result) =>
    evidenceResultSchema.parse(result),
  );
  const failures = validateEnforcementCorpus({
    assertionIds: generated.map.rows.map(({ assertionId }) => assertionId),
    populationSources: generated.sources,
    map,
    results,
    testTargetInventory: deriveTestTargetInventory(),
    allowPendingResults: mode === '--check',
  });
  if (JSON.stringify(map) !== JSON.stringify(generated.map)) {
    failures.push({
      reason: 'generated-map-drift',
      expected: 'deterministic generated enforcement map',
      actual: MAP_PATH,
    });
  }
  if (JSON.stringify(results) !== JSON.stringify(generated.results)) {
    failures.push({
      reason: 'generated-results-drift',
      expected: 'deterministic generated tagged results',
      actual: RESULTS_PATH,
    });
  }
  if (failures.length > 0) {
    const summary = summarizeEnforcementFailures(failures);
    console.error(
      `brand-v2-enforcement: ${summary.total} failures by class`,
    );
    for (const { reason, count } of summary.counts) {
      console.error(`${reason}: ${count}`);
    }
    if (!countOnly) {
      for (const failure of failures.slice(0, 20)) {
        console.error(JSON.stringify(failure));
      }
      if (failures.length > 20) {
        console.error(`... ${failures.length - 20} more enforcement failures`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log(
      `brand-v2-enforcement: OK (${map.rows.length} assertions, ${results.length} tagged results)`,
    );
  }
} else {
  console.error(
    'Usage: node scripts/brand-v2-enforcement.ts --write|--check|--check-release [--count-only]',
  );
  process.exitCode = 2;
}
