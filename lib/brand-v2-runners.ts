import type { StateCase } from './brand-v2-census';

export type BrandV2Registry = {
  routes: {
    public: Array<{
      id: string;
      path: string;
      routeKind: 'article' | 'destination';
      fingerprint: string;
    }>;
    notFound: {
      id: string;
      path: string;
      publicContent: false;
      fingerprint: string;
    };
  };
  interactive: {
    sources: Array<InteractiveRegistryMember>;
    mounts: Array<
      InteractiveRegistryMember & {
        sourceId: string;
        route: string;
        /** The document that mounts it: a route module, or a content module. */
        ownerPath: string;
        /** The JSX props it is mounted with, verbatim. */
        props: string;
        /** 1-based position among that component's mounts on that route. */
        ordinal: number;
      }
    >;
  };
  gridDevices: Array<PrimitiveRegistryRow>;
  surfaces: Array<PrimitiveRegistryRow>;
  controls: Array<PrimitiveRegistryRow>;
};

export type PrimitiveMountState = 'production' | 'library-only' | 'unwritten';

type PrimitiveRegistryRow = {
  id: string;
  fingerprint: string;
  /** First-party modules whose source writes this primitive ID. */
  definedIn: string[];
  /** The subset of `definedIn` a route entry actually reaches. */
  ownerRouteOrMount: string[];
  mountState: PrimitiveMountState;
};

type InteractiveRegistryMember = {
  id: string;
  component: string;
  sourcePath?: string;
  fingerprint: string;
  cases: StateCase[];
  expectedCaseCount: number;
};

export type RunnerFailure = {
  memberId: string;
  reason: string;
  expected: unknown;
  actual: unknown;
};

export type OrderedStep = {
  order: number;
  id: string;
  action: string;
};

export type OrderedCapture = {
  order: number;
  id: string;
  afterStep: string;
  kind: 'full-page' | 'bounded' | 'computed-style' | 'semantic';
};

export type DeepRow = {
  id: string;
  route: string;
  viewport: { width: number; height: number };
  state: string;
  steps: OrderedStep[];
  captures: OrderedCapture[];
};

export type FlowSuite = {
  population: string[];
  steps: OrderedStep[];
  captures: OrderedCapture[];
};

export type ExecutionRecord = {
  memberId: string;
  steps: string[];
  captures: string[];
};

export const ROUTE_CHECKS = [
  'browser-render',
  'computed-style',
  'axe',
  'keyboard',
  'forced-colours',
  'reflow',
  'overflow',
  'resource-font',
  'residue',
] as const;

const SMOKE_ROUTES = new Set([
  '/',
  '/manipulation/action-chunking/',
  '/search/',
  '/market-map/',
  '/playground/',
]);

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function assertSequential(values: Array<{ order: number }>): boolean {
  return values.every(({ order }, index) => order === index + 1);
}

export function buildPublicRouteExecutionPlan(
  registry: BrandV2Registry,
  observedRoutes: readonly string[],
) {
  const expectedRoutes = registry.routes.public.map(({ path }) => path);
  if (expectedRoutes.length === 0) {
    throw new Error('Public-route population is empty.');
  }
  if (
    observedRoutes.length === SMOKE_ROUTES.size &&
    observedRoutes.every((route) => SMOKE_ROUTES.has(route))
  ) {
    throw new Error(
      'Smoke-only coverage is not final release evidence; use the registry-derived population.',
    );
  }
  if (!unique(expectedRoutes) || !unique(observedRoutes)) {
    throw new Error('Public-route populations must contain unique members.');
  }
  const expected = [...expectedRoutes].sort();
  const observed = [...observedRoutes].sort();
  if (JSON.stringify(expected) !== JSON.stringify(observed)) {
    throw new Error(
      `Public-route population mismatch: expected ${expected.length}, observed ${observed.length}.`,
    );
  }
  return {
    members: registry.routes.public.map((route) => ({
      routeId: route.id,
      path: route.path,
      fingerprint: route.fingerprint,
      checks: [...ROUTE_CHECKS],
    })),
    notFound: registry.routes.notFound,
  };
}

export function buildInteractiveExecutionPlan(registry: BrandV2Registry) {
  const sources = registry.interactive.sources;
  const mounts = registry.interactive.mounts;
  if (sources.length === 0 || mounts.length === 0) {
    throw new Error('Interactive source and mount populations must be non-empty.');
  }
  const sourceIds = new Set(sources.map(({ id }) => id));
  const members = [...sources, ...mounts];
  for (const member of members) {
    if (
      member.expectedCaseCount <= 0 ||
      member.expectedCaseCount !== member.cases.length
    ) {
      throw new Error(`Interactive case-count mismatch for ${member.id}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(member.fingerprint)) {
      throw new Error(`Interactive fingerprint is invalid for ${member.id}.`);
    }
  }
  for (const mount of mounts) {
    if (!sourceIds.has(mount.sourceId)) {
      throw new Error(`Interactive mount ${mount.id} has no source.`);
    }
  }
  const expectedCaseCount = members.reduce(
    (sum, member) => sum + member.expectedCaseCount,
    0,
  );
  return {
    sources,
    mounts,
    expectedCaseCount,
    observedCaseCount: members.reduce(
      (sum, member) => sum + member.cases.length,
      0,
    ),
  };
}

const rows: Array<
  [string, string, number, number, string, string[]]
> = [
  ['B2-EV-001', '/', 1440, 900, 'home-default', ['settle', 'capture']],
  ['B2-EV-002', '/', 375, 812, 'home-mobile-default', ['settle', 'capture']],
  ['B2-EV-003', '/', 375, 812, 'drawer-focus-trap', ['open-drawer', 'cycle-focus', 'escape', 'capture']],
  ['B2-EV-004', '/', 1440, 900, 'keyboard-subflows', ['skip-link', 'search-entry', 'hero-action', 'capture']],
  ['B2-EV-005', '/manipulation/', 1440, 900, 'domain-default', ['settle', 'capture']],
  ['B2-EV-006', '/manipulation/', 375, 812, 'domain-mobile-default', ['settle', 'capture']],
  ['B2-EV-007', '/manipulation/action-chunking/', 1440, 900, 'article-top', ['settle', 'capture']],
  ['B2-EV-008', '/manipulation/action-chunking/', 1440, 900, 'article-heading-figure', ['scroll-heading', 'focus-copy-link', 'capture']],
  ['B2-EV-009', '/manipulation/comparison-matrix/', 375, 812, 'table-horizontal-scroll', ['focus-table', 'scroll-table', 'capture']],
  ['B2-EV-010', '/manipulation/action-chunking/', 1024, 768, 'article-tablet', ['settle', 'capture']],
  ['B2-EV-011', '/search/', 1440, 900, 'search-empty', ['settle', 'capture']],
  ['B2-EV-012', '/search/', 1440, 900, 'search-methods', ['enter-query', 'select-methods', 'capture']],
  ['B2-EV-013', '/search/', 375, 812, 'search-mobile-results', ['enter-query', 'focus-results', 'capture']],
  ['B2-EV-014', '/search/', 375, 812, 'search-no-results', ['enter-unmatched-query', 'focus-recovery', 'capture']],
  ['B2-EV-015', '/a-z/', 1440, 900, 'az-default', ['focus-first-letter', 'capture']],
  ['B2-EV-016', '/a-z/', 375, 812, 'az-to-glossary', ['activate-glossary-entry', 'capture']],
  ['B2-EV-017', '/market-map/', 1440, 900, 'market-three-views', ['grid-view', 'bubble-view', 'timeline-view', 'capture']],
  ['B2-EV-018', '/market-map/', 1440, 900, 'market-select-company', ['bubble-view', 'select-company', 'capture']],
  ['B2-EV-019', '/market-map/', 1440, 900, 'market-dismiss-filter-clear', ['bubble-view', 'select-company', 'dismiss-company', 'select-filter', 'clear-filter', 'capture']],
  ['B2-EV-020', '/market-map/', 375, 812, 'market-mobile-detail', ['select-company', 'dismiss-company', 'capture']],
  ['B2-EV-021', '/playground/', 1440, 900, 'playground-default', ['wait-webgl', 'capture']],
  ['B2-EV-022', '/playground/', 1440, 900, 'playground-joint-change', ['wait-webgl', 'change-joint', 'capture']],
  ['B2-EV-023', '/playground/', 1440, 900, 'playground-import-play', ['import-trajectory', 'play-trajectory', 'capture']],
  ['B2-EV-024', '/playground/', 1440, 900, 'playground-reset-clear', ['change-pose', 'import-trajectory', 'reset-pose', 'clear-trajectory', 'capture']],
  ['B2-EV-025', '/playground/', 375, 812, 'playground-mobile-live', ['wait-webgl', 'change-joint', 'capture']],
  ['B2-EV-026', '/', 1440, 900, 'home-to-credits', ['activate-credits', 'capture']],
  ['B2-EV-027', '/', 768, 1024, 'tablet-shell', ['open-drawer', 'capture']],
];

export const BRAND_V2_DEEP_ROWS: DeepRow[] = rows.map(
  ([id, route, width, height, state, actions]) => {
    const steps = actions.map((action, index) => ({
      order: index + 1,
      id: `${id}:step:${index + 1}`,
      action,
    }));
    return {
      id,
      route,
      viewport: { width, height },
      state,
      steps,
      captures: [
        {
          order: 1,
          id: `${id}:capture:full`,
          afterStep: steps.at(-1)?.id ?? '',
          kind: 'full-page',
        },
        {
          order: 2,
          id: `${id}:capture:computed`,
          afterStep: steps.at(-1)?.id ?? '',
          kind: 'computed-style',
        },
      ],
    };
  },
);

function flow(
  population: string[],
  actions: string[],
): FlowSuite {
  const steps = actions.map((action, index) => ({
    order: index + 1,
    id: `step:${index + 1}:${action}`,
    action,
  }));
  return {
    population,
    steps,
    captures: steps.map((step, index) => ({
      order: index + 1,
      id: `capture:${index + 1}:${step.action}`,
      afterStep: step.id,
      kind: 'semantic',
    })),
  };
}

export const BRAND_V2_FLOW_SUITES: Record<string, FlowSuite> = {
  'brand-v2-route-flows': flow(
    ['registry:routes.public', 'registry:routes.notFound'],
    ['navigate', 'exercise-history', 'run-route-profiles'],
  ),
  'brand-v2-article-interactions': flow(
    ['registry:routes.public:article'],
    ['copy-heading-link', 'citation-and-term-parity', 'table-keyboard', 'wiki-furniture'],
  ),
  'brand-v2-market-map-states': flow(
    ['route:/market-map/'],
    ['exercise-three-views', 'exercise-filters', 'select-dismiss-company', 'history-restore'],
  ),
  'brand-v2-playground-states': flow(
    ['route:/playground/'],
    ['exercise-fk-ik', 'import-export-errors', 'play-reset-clear', 'fallback-and-reduced-motion'],
  ),
};

export function validateDeepRows(rowsToValidate: DeepRow[]): RunnerFailure[] {
  const failures: RunnerFailure[] = [];
  if (rowsToValidate.length !== 27) {
    failures.push({
      memberId: 'brand-v2-deep-rows',
      reason: 'row-count',
      expected: 27,
      actual: rowsToValidate.length,
    });
  }
  for (const row of rowsToValidate) {
    if (row.steps.length === 0) {
      failures.push({
        memberId: row.id,
        reason: 'empty-steps',
        expected: 'non-empty ordered steps',
        actual: 0,
      });
    } else if (!assertSequential(row.steps)) {
      failures.push({
        memberId: row.id,
        reason: 'unordered-steps',
        expected: '1..n',
        actual: row.steps.map(({ order }) => order),
      });
    }
    if (row.captures.length === 0) {
      failures.push({
        memberId: row.id,
        reason: 'empty-captures',
        expected: 'non-empty ordered captures',
        actual: 0,
      });
    } else if (!assertSequential(row.captures)) {
      failures.push({
        memberId: row.id,
        reason: 'unordered-captures',
        expected: '1..n',
        actual: row.captures.map(({ order }) => order),
      });
    }
    const stepIds = new Set(row.steps.map(({ id }) => id));
    for (const capture of row.captures) {
      if (!stepIds.has(capture.afterStep)) {
        failures.push({
          memberId: row.id,
          reason: 'unknown-capture-step',
          expected: [...stepIds],
          actual: capture.afterStep,
        });
      }
    }
  }
  return failures;
}

export function validateFlowSuites(
  suites: Record<string, FlowSuite>,
): RunnerFailure[] {
  const required = [
    'brand-v2-route-flows',
    'brand-v2-article-interactions',
    'brand-v2-market-map-states',
    'brand-v2-playground-states',
  ];
  const failures: RunnerFailure[] = [];
  for (const name of required) {
    const suite = suites[name];
    if (!suite) {
      failures.push({
        memberId: name,
        reason: 'missing-suite',
        expected: 'registered suite',
        actual: null,
      });
      continue;
    }
    for (const [field, values] of [
      ['population', suite.population],
      ['steps', suite.steps],
      ['captures', suite.captures],
    ] as const) {
      if (values.length === 0) {
        failures.push({
          memberId: name,
          reason: `empty-${field}`,
          expected: `non-empty ${field}`,
          actual: 0,
        });
      }
    }
    if (!assertSequential(suite.steps)) {
      failures.push({
        memberId: name,
        reason: 'unordered-steps',
        expected: '1..n',
        actual: suite.steps.map(({ order }) => order),
      });
    }
    if (!assertSequential(suite.captures)) {
      failures.push({
        memberId: name,
        reason: 'unordered-captures',
        expected: '1..n',
        actual: suite.captures.map(({ order }) => order),
      });
    }
    const stepIds = new Set(suite.steps.map(({ id }) => id));
    for (const capture of suite.captures) {
      if (!stepIds.has(capture.afterStep)) {
        failures.push({
          memberId: name,
          reason: 'unknown-capture-step',
          expected: [...stepIds],
          actual: capture.afterStep,
        });
      }
    }
  }
  return failures;
}

export async function executeEvidencePlans(
  plans: Array<{
    id: string;
    steps: OrderedStep[];
    captures: OrderedCapture[];
  }>,
  handlers: {
    step: (memberId: string, step: OrderedStep) => Promise<void>;
    capture: (memberId: string, capture: OrderedCapture) => Promise<void>;
  },
): Promise<ExecutionRecord[]> {
  const records: ExecutionRecord[] = [];
  for (const plan of plans) {
    const record: ExecutionRecord = {
      memberId: plan.id,
      steps: [],
      captures: [],
    };
    for (const step of plan.steps) {
      await handlers.step(plan.id, step);
      record.steps.push(step.id);
      for (const capture of plan.captures.filter(
        ({ afterStep }) => afterStep === step.id,
      )) {
        await handlers.capture(plan.id, capture);
        record.captures.push(capture.id);
      }
    }
    if (record.captures.length !== plan.captures.length) {
      throw new Error(
        `${plan.id} executed ${record.captures.length} of ${plan.captures.length} captures.`,
      );
    }
    records.push(record);
  }
  return records;
}
