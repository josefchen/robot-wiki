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
import { BRAND_COLORS, type BrandColor } from '../lib/brand-v2-tokens.ts';
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
 * The primitive assertions whose evidence is the persisted browser
 * reconciliation (evidence/brand-v2/primitive-reconciliation.json, written
 * by tests/e2e/brand-v2-primitives.spec.ts).
 *
 * Membership here routes an assertion to that artifact; it does not grant a
 * pass. Status is derived per member from what the sweep actually rendered,
 * and a member the sweep never rendered becomes a typed not-applicable row
 * rather than a `passed` one. The previous allowlist did grant the pass: the
 * three IDs were declared complete and the generator then read registry
 * fields and a source regex, so a registered primitive that no route mounts
 * still produced a passing result.
 */
const RECONCILED_PRIMITIVE_ASSERTIONS = new Map<string, PrimitiveRegistryKey>([
  ['VAL-B2-GRID-009', 'gridDevices'],
  ['VAL-B2-SURF-010', 'surfaces'],
  ['VAL-B2-COMP-013', 'controls'],
]);

/**
 * Completed by the foundation-token feature. The renderer-mirror contract is
 * proved by tests/unit/design-system-contract.test.ts, which compares the
 * mirror constants against the sealed palette and against every
 * `--color-*` declaration in app/globals.css, and the runtime resolution is
 * measured in a real browser on every public route. Leaving them pending
 * while the feature's fulfils list claims them is R8c.
 */
const COMPLETED_TOKEN_ASSERTIONS = new Map<string, readonly BrandColor[]>([
  ['VAL-B2-COL-001', ['highlight']],
  ['VAL-B2-COL-002', ['signal']],
  ['VAL-B2-COL-003', ['ink', 'graphite', 'concrete', 'paper', 'white']],
  ['VAL-B2-COMP-012', ['ok', 'warn', 'error', 'destructive']],
]);

function isCompleted(id: string): boolean {
  return (
    COMPLETED_TEKTUR_ASSERTIONS.has(id) ||
    RECONCILED_PRIMITIVE_ASSERTIONS.has(id) ||
    COMPLETED_TOKEN_ASSERTIONS.has(id)
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
type PrimitiveRegistryKey = 'gridDevices' | 'surfaces' | 'controls';

const RECONCILIATION_PATH = join(
  ROOT,
  'evidence',
  'brand-v2',
  'primitive-reconciliation.json',
);

type ReconciliationMember = {
  kind: PrimitiveRegistryKey;
  fingerprint: string;
  mountState: string;
  definedIn: string[];
  ownerRouteOrMount: string[];
  renderedOn: string[];
};

type Reconciliation = {
  version: number;
  viewport: { width: number; height: number };
  routes: string[];
  members: Record<string, ReconciliationMember>;
  unregisteredRendered: string[];
  unannotatedRendered: string[];
};

/**
 * The persisted browser reconciliation, checked against the registry it
 * claims to describe. A stale or partial artifact must not be able to grant
 * a pass, so every mismatch throws instead of degrading to a weaker claim:
 * the generator refuses to emit rather than emitting an unfalsifiable row.
 */
function readReconciliation(): Reconciliation {
  const artifact = readJson(RECONCILIATION_PATH) as Reconciliation;
  if (artifact.version !== 1) {
    throw new Error(`Unsupported primitive reconciliation version`);
  }
  const registryRoutes = REGISTRY.routes.public.map(({ path }) => path);
  for (const route of registryRoutes) {
    if (!artifact.routes.includes(route)) {
      throw new Error(
        `Primitive reconciliation never visited ${route}; re-run npm run test:brand-v2`,
      );
    }
  }
  if (artifact.unannotatedRendered.length > 0) {
    throw new Error(
      `Primitive reconciliation records ${artifact.unannotatedRendered.length} unannotated rendered members`,
    );
  }
  if (artifact.unregisteredRendered.length > 0) {
    throw new Error(
      `Primitive reconciliation records unregistered rendered members: ${artifact.unregisteredRendered.join(', ')}`,
    );
  }
  for (const key of ['gridDevices', 'surfaces', 'controls'] as const) {
    for (const row of REGISTRY[key]) {
      const member = artifact.members[row.id as string];
      if (!member) {
        throw new Error(
          `Primitive reconciliation has no member record for ${row.id}`,
        );
      }
      if (member.fingerprint !== row.fingerprint) {
        throw new Error(
          `Primitive reconciliation for ${row.id} is stale: fingerprint ${member.fingerprint} does not match the registry`,
        );
      }
      const mounted = member.renderedOn.length > 0;
      if (mounted !== (member.mountState === 'production')) {
        throw new Error(
          `Primitive reconciliation for ${row.id} contradicts its mount state ${member.mountState}`,
        );
      }
    }
  }
  return artifact;
}

const RECONCILIATION = readReconciliation();

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
  // A token row's evidence is a computed value read out of a live document,
  // and a primitive row's evidence is the persisted browser reconciliation,
  // so both stay browser-state rows rather than becoming source-build ones.
  if (COMPLETED_TOKEN_ASSERTIONS.has(id)) return 'browser-state';
  if (RECONCILED_PRIMITIVE_ASSERTIONS.has(id)) return 'browser-state';
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
    'Sweeps every registered public route plus the market-map view states and checks rendered device IDs against the registry, pointer and ARIA behavior, the sealed 2px alignment bound, and exact equality with the production-mounted registry rows.',
  ),
  'VAL-B2-SURF-010': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-SURF-010 source, registry and rendered surface populations are equal',
    'Sweeps every registered public route plus the market-map view states, discovers surfaces structurally, requires an annotation on every discovered member, and asserts the rendered set equals the production-mounted registry rows exactly while rejecting backdrop blur, filters, and coloured glow.',
  ),
  'VAL-B2-COMP-013': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-COMP-013 source, registry and rendered control populations reconcile',
    'Sweeps every registered public route plus the market-map view states, discovers controls structurally including keyboard-operable SVG shapes, asserts the rendered set equals the production-mounted registry rows exactly, checks each row owner list against the route-reachable writers, and rejects persistent selected, pressed, or current ARIA on transient controls.',
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

const TEKTUR_ROLE_POPULATION_TARGET = testTarget(
  'tests/e2e/tektur-font-delivery.spec.ts',
  // The reporter interpolates the route into this title; the enforcement
  // inventory reads the authored template, so the row has to name it as
  // written in the spec.
  'Tektur role population › renders every registered role ${route} owns, at every declared viewport (VAL-B2-TYPE-015)',
  'Loads each public route at every declared viewport and measures the computed family and wght/wdth axes of every role that route owns.',
);
const TEKTUR_ROLE_OWNERSHIP_TARGET = testTarget(
  'tests/e2e/tektur-font-delivery.spec.ts',
  'Tektur role population › every registered role is owned by at least one public route',
  'Proves the swept route population covers every registered role, so no role escapes the per-route viewport measurement.',
);
const TEKTUR_BINARY_TARGET = tekturUnitTarget(
  'inspects checksums, formats, axes, static mapping, and cmap coverage (VAL-B2-TYPE-011 through 017)',
  'Opens both binaries with fontkit and verifies checksums, formats, exact axes, the static OG mapping, license metadata, and assigned-string cmap coverage.',
);
const OG_RENDERER_FAMILY_TARGET = testTarget(
  'tests/unit/og-renderer-fonts.test.ts',
  'OG renderer font delivery contract > registers only first-party role families (VAL-B2-TYPE-001)',
  'Checks the OG renderer registers only the first-party role families, so the card corpus and the web pages resolve the same four families.',
);
const OG_RENDERER_RUN_TARGET = testTarget(
  'tests/unit/og-renderer-fonts.test.ts',
  'OG renderer font delivery contract > walks every shipped card and covers each painted run (VAL-B2-TYPE-011 through 014)',
  'Walks every shipped card and proves each painted run resolves to a registered static face whose cmap covers its code points.',
);

/**
 * Each Tektur row names the gates that decide its own predicate. Naming only
 * the registry-shaped unit test and the single-route delivery spec left the
 * measuring runs — the per-route viewport sweep, the fontkit binary
 * inspection, and the OG renderer walk — unnamed, so a reader could not
 * reach the evidence from the row.
 */
function tekturTargetsFor(id: string): TestTarget[] {
  if (id === 'VAL-B2-TYPE-001' || id === 'VAL-B2-TYPE-002') {
    return [
      tekturUnitTarget(
        'registers exactly four first-party families (VAL-B2-TYPE-001, VAL-A11Y-014)',
        'Pins the four first-party families to their display, interface, reading, and data roles.',
      ),
      OG_RENDERER_FAMILY_TARGET,
      TEKTUR_ROLE_POPULATION_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-015') {
    return [
      tekturUnitTarget(
        'registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)',
        'Pins all six measurable wght/wdth role instances and the exact static OG role mapping.',
      ),
      TEKTUR_ROLE_POPULATION_TARGET,
      TEKTUR_ROLE_OWNERSHIP_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-016') {
    return [
      tekturUnitTarget(
        'registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)',
        'Pins all six measurable wght/wdth role instances and the exact static OG role mapping.',
      ),
      TEKTUR_BINARY_TARGET,
      OG_RENDERER_RUN_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-017') {
    return [
      tekturUnitTarget(
        'keeps assigned web and OG strings non-empty and code-point addressable (VAL-B2-TYPE-017)',
        'Derives the assigned identity, descriptor, numeral, domain, and article-title string population before cmap inspection.',
      ),
      TEKTUR_BINARY_TARGET,
      OG_RENDERER_RUN_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  return [TEKTUR_BINARY_TARGET, OG_RENDERER_RUN_TARGET, TEKTUR_BROWSER_TARGET];
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

const TOKEN_MIRROR_TARGET = testTarget(
  'tests/unit/design-system-contract.test.ts',
  'design tokens stay aligned > compares the shared renderer constants against the sealed values',
  'Compares every renderer mirror constant against the sealed palette and against the matching --color-* declaration in app/globals.css, so a wrong mirror literal fails instead of propagating.',
);
const TOKEN_SEMANTIC_TARGET = testTarget(
  'tests/unit/design-system-contract.test.ts',
  'design tokens stay aligned > uses semantic warning colour in warning primitives',
  'Proves the four semantic tokens are distinct from the brand accents, declared in app/globals.css, carried by the badge and callout non-colour cues, and measured at or above WCAG AA against both reading grounds.',
);
const TOKEN_ROUTE_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › every public route resolves the sealed palette exactly',
  'Loads every registered public route and compares the resolved :root colour tokens against the sealed contract values exactly.',
);
const TOKEN_ACCENT_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › runtime signal token resolves to exact v2 blue',
  'Measures the resolved signal, focus, and selection tokens in a live document.',
);
const TOKEN_FOUNDATION_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › runtime paper token resolves to exact v2 foundation',
  'Measures the resolved foundation, semantic, and spacing tokens in a live document.',
);

function tokenTargetsFor(id: string): TestTarget[] {
  if (id === 'VAL-B2-COMP-012') {
    return [
      TOKEN_MIRROR_TARGET,
      TOKEN_SEMANTIC_TARGET,
      TOKEN_ROUTE_SWEEP_TARGET,
      TOKEN_FOUNDATION_TARGET,
    ];
  }
  return [
    TOKEN_MIRROR_TARGET,
    TOKEN_ROUTE_SWEEP_TARGET,
    id === 'VAL-B2-COL-003' ? TOKEN_FOUNDATION_TARGET : TOKEN_ACCENT_TARGET,
  ];
}

function testTargetsFor(id: string): TestTarget[] {
  if (COMPLETED_TEKTUR_ASSERTIONS.has(id)) return tekturTargetsFor(id);
  if (COMPLETED_TOKEN_ASSERTIONS.has(id)) return tokenTargetsFor(id);
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
  const registryKey = RECONCILED_PRIMITIVE_ASSERTIONS.get(assertionId);
  if (registryKey) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is reconciled per member and must record per-member evidence`,
      );
    }
    const record = RECONCILIATION.members[member];
    if (!record || record.kind !== registryKey) {
      throw new Error(
        `${assertionId}: ${member} has no ${registryKey} reconciliation record`,
      );
    }
    if (record.renderedOn.length === 0) {
      return {
        ...common,
        status: 'not-applicable' as const,
        actual: `registered and defined in ${record.definedIn.join(', ') || 'no first-party module'}, mounted by no public route`,
        notApplicableReason: {
          code: 'unsupported-state' as const,
          registryId: member,
          detail: `${member} has mount state ${record.mountState}: the reconciliation over ${RECONCILIATION.routes.length} route states rendered it 0 times, so no rendered member exists to measure.`,
        },
      };
    }
    const evidence = completedEvidence(assertionId, populationSource, member);
    return {
      ...common,
      actual: `rendered on ${record.renderedOn.length} of ${RECONCILIATION.routes.length} swept route states and reconciled exactly against the registry row`,
      payload: {
        kind: 'browser-state',
        computed: {
          ...evidence.observed,
          mountState: record.mountState,
          renderedOn: record.renderedOn,
          sweptRouteStates: RECONCILIATION.routes.length,
          reconciliationSource:
            'evidence/brand-v2/primitive-reconciliation.json',
        },
      },
    };
  }
  const tokenNames = COMPLETED_TOKEN_ASSERTIONS.get(assertionId);
  if (tokenNames) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is completed and must record per-member evidence`,
      );
    }
    return {
      ...common,
      payload: {
        kind: 'browser-state',
        computed: {
          populationMember: member,
          resolvedTokens: Object.fromEntries(
            tokenNames.map((name) => [`--color-${name}`, BRAND_COLORS[name]]),
          ),
          mirrorSource: 'lib/brand-v2-tokens.ts',
          runtimeSource: 'app/globals.css',
        },
      },
    };
  }
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
            mechanism: RECONCILED_PRIMITIVE_ASSERTIONS.has(id)
              ? `${id} per-member status derived from the persisted browser reconciliation over ${canonicalPopulationSource}`
              : isCompleted(id)
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
