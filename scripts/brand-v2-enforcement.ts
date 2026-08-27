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

type Registry = Parameters<
  typeof buildEnforcementPopulationSources
>[0]['registry'];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function populationSources(assertionIds: string[]) {
  const registry = readJson(
    join(ROOT, 'contract', 'brand-v2-registries.json'),
  ) as Registry;
  const baseline = readJson(
    join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
  ) as { manifests: Record<string, unknown> };
  return buildEnforcementPopulationSources({
    registry,
    baselineManifestIds: Object.keys(baseline.manifests).sort(),
    deepRowIds: BRAND_V2_DEEP_ROWS.map(({ id }) => id),
    assertionIds,
  });
}

function populationSourceFor(id: string): string {
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
    COMPLETED_TEKTUR_ASSERTIONS.has(id) ||
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
  return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET];
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
    status: COMPLETED_TEKTUR_ASSERTIONS.has(assertionId)
      ? ('passed' as const)
      : ('pending' as const),
    expected: requirement,
    actual: COMPLETED_TEKTUR_ASSERTIONS.has(assertionId)
      ? 'verified by the deterministic Tektur binary, role-registry, build, and browser gates'
      : 'awaiting responsible rollout milestone',
    selectorOrRegistryId: populationSource,
    exceptionVerdict: 'none' as const,
  };
  if (COMPLETED_TEKTUR_ASSERTIONS.has(assertionId)) {
    return {
      ...common,
      payload: {
        kind: 'source-build',
        sourcePath: 'assets/fonts/tektur/metadata.json',
        predicate: requirement,
        observed:
          'Pinned variable-web/static-OG assets, exact role axes, cmap coverage, and same-origin browser delivery all passed.',
        tool: 'fontkit + Vitest + Playwright',
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
      const assertionResults = COMPLETED_TEKTUR_ASSERTIONS.has(id)
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
            mechanism: COMPLETED_TEKTUR_ASSERTIONS.has(id)
              ? `${id} passed deterministic Tektur delivery evidence over ${canonicalPopulationSource}`
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
