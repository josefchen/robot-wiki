import { DEFAULT_MARKET_MAP_VIEW, VIEW_IDS } from './market-map.ts';

/**
 * The persisted browser reconciliation
 * (`evidence/brand-v2/primitive-reconciliation.json`), and the invariants a
 * consumer must establish before it may derive an assertion result from it.
 *
 * The enforcement generator used to accept the artifact on two checks: every
 * public route appears somewhere in `routes`, and each member's fingerprint
 * equals its registry row's. That leaves an artifact free to drop a required
 * market-map view state, add route states no sweep visited, promote a
 * library-only member to `mountState: "production"`, and list any string in
 * `renderedOn` — and still produce passing rows, because the rendered/mount
 * agreement was checked against the artifact's own copy of `mountState`
 * rather than against the registry. A self-consistent forgery is not
 * evidence.
 *
 * So the artifact is compared, field by field, with independently derived
 * inputs: the sweep population derived from the registry and the market-map
 * view union, and the current registry row for every member. Every mismatch
 * throws; the reader never degrades to a weaker claim.
 */
export type PrimitiveRegistryKind = 'gridDevices' | 'surfaces' | 'controls';

export const PRIMITIVE_REGISTRY_KINDS: readonly PrimitiveRegistryKind[] = [
  'gridDevices',
  'surfaces',
  'controls',
];

export type PrimitiveReconciliationMember = {
  kind: PrimitiveRegistryKind;
  fingerprint: string;
  mountState: string;
  definedIn: string[];
  ownerRouteOrMount: string[];
  renderedOn: string[];
};

export type PrimitiveReconciliation = {
  version: number;
  viewport: { width: number; height: number };
  routes: string[];
  members: Record<string, PrimitiveReconciliationMember>;
  unregisteredRendered: string[];
  unannotatedRendered: string[];
};

export type PrimitiveRegistryRow = {
  id: string;
  fingerprint: string;
  mountState: string;
  definedIn: readonly string[];
  ownerRouteOrMount: readonly string[];
};

export type PrimitiveRegistrySlice = Record<
  PrimitiveRegistryKind,
  readonly PrimitiveRegistryRow[]
> & {
  routes: { public: ReadonlyArray<{ path: string }> };
};

export const MARKET_MAP_ROUTE = '/market-map/';

/**
 * The route states a complete primitive sweep visits: every registered
 * public destination, plus one state per non-default market-map view,
 * because the bubble and timeline views mount primitives the default grid
 * view does not. Both the spec that writes the artifact and the generator
 * that reads it derive the population here, so "the sweep covered the
 * population" is a comparison against a derived set rather than against a
 * list typed beside either one.
 */
export function derivePrimitiveSweepRouteStates(
  registry: Pick<PrimitiveRegistrySlice, 'routes'>,
): string[] {
  const routes = registry.routes.public.map(({ path }) => path);
  if (routes.length === 0) {
    throw new Error('The registered public-route population is empty.');
  }
  if (!routes.includes(MARKET_MAP_ROUTE)) {
    throw new Error(
      `${MARKET_MAP_ROUTE} is not a registered public route, so its view states cannot be swept.`,
    );
  }
  const viewStates = VIEW_IDS.filter(
    (view) => view !== DEFAULT_MARKET_MAP_VIEW,
  ).map((view) => `${MARKET_MAP_ROUTE}?view=${view}`);
  if (viewStates.length === 0) {
    throw new Error('The market map declares no non-default view state.');
  }
  return [...routes, ...viewStates];
}

function sortedUnique(values: readonly string[], label: string): string[] {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error(`Primitive reconciliation repeats an entry in ${label}`);
  }
  return [...unique].sort();
}

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function readPrimitiveReconciliation(input: {
  artifact: unknown;
  registry: PrimitiveRegistrySlice;
  routeStates?: readonly string[];
}): PrimitiveReconciliation {
  const artifact = input.artifact as PrimitiveReconciliation;
  if (artifact === null || typeof artifact !== 'object') {
    throw new Error('Primitive reconciliation is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error('Unsupported primitive reconciliation version');
  }
  const viewport = artifact.viewport;
  if (
    typeof viewport?.width !== 'number' ||
    typeof viewport?.height !== 'number' ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new Error('Primitive reconciliation records no measured viewport');
  }
  const expectedStates =
    input.routeStates ?? derivePrimitiveSweepRouteStates(input.registry);
  if (!Array.isArray(artifact.routes)) {
    throw new Error('Primitive reconciliation records no route states');
  }
  const visited = sortedUnique(artifact.routes, 'routes');
  const required = [...expectedStates].sort();
  if (!sameSequence(visited, required)) {
    const missing = required.filter((route) => !visited.includes(route));
    const extra = visited.filter((route) => !required.includes(route));
    throw new Error(
      `Primitive reconciliation swept the wrong route states; missing ${
        missing.join(', ') || 'none'
      } and unexpected ${extra.join(', ') || 'none'}; re-run npm run test:brand-v2`,
    );
  }
  const visitedStates = new Set(visited);
  if (
    !Array.isArray(artifact.unannotatedRendered) ||
    !Array.isArray(artifact.unregisteredRendered)
  ) {
    throw new Error(
      'Primitive reconciliation records no unannotated/unregistered populations',
    );
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
  if (artifact.members === null || typeof artifact.members !== 'object') {
    throw new Error('Primitive reconciliation records no members');
  }

  const registeredIds = new Set<string>();
  for (const kind of PRIMITIVE_REGISTRY_KINDS) {
    const rows = input.registry[kind];
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`The ${kind} registry population is empty`);
    }
    for (const row of rows) {
      registeredIds.add(row.id);
      const member = artifact.members[row.id];
      if (!member) {
        throw new Error(
          `Primitive reconciliation has no member record for ${row.id}`,
        );
      }
      if (member.kind !== kind) {
        throw new Error(
          `Primitive reconciliation records ${row.id} as ${member.kind} rather than ${kind}`,
        );
      }
      if (member.fingerprint !== row.fingerprint) {
        throw new Error(
          `Primitive reconciliation for ${row.id} is stale: fingerprint ${member.fingerprint} does not match the registry`,
        );
      }
      // The metadata is compared with the CURRENT registry row rather than
      // trusted, so an artifact cannot promote a library-only member to a
      // production mount and collect a passing row for it.
      if (member.mountState !== row.mountState) {
        throw new Error(
          `Primitive reconciliation records mount state ${member.mountState} for ${row.id}; the registry records ${row.mountState}`,
        );
      }
      for (const field of ['definedIn', 'ownerRouteOrMount'] as const) {
        const recorded = member[field];
        if (!Array.isArray(recorded)) {
          throw new Error(
            `Primitive reconciliation records no ${field} for ${row.id}`,
          );
        }
        if (!sameSequence(recorded, row[field])) {
          throw new Error(
            `Primitive reconciliation records ${field} ${JSON.stringify(recorded)} for ${row.id}; the registry records ${JSON.stringify(row[field])}`,
          );
        }
      }
      if (!Array.isArray(member.renderedOn)) {
        throw new Error(
          `Primitive reconciliation records no renderedOn for ${row.id}`,
        );
      }
      const renderedOn = sortedUnique(
        member.renderedOn,
        `renderedOn for ${row.id}`,
      );
      for (const route of renderedOn) {
        if (!visitedStates.has(route)) {
          throw new Error(
            `Primitive reconciliation claims ${row.id} rendered on ${route}, which the sweep never visited`,
          );
        }
      }
      const mounted = renderedOn.length > 0;
      if (mounted !== (row.mountState === 'production')) {
        throw new Error(
          `Primitive reconciliation for ${row.id} contradicts its mount state ${row.mountState}`,
        );
      }
    }
  }
  for (const id of Object.keys(artifact.members)) {
    if (!registeredIds.has(id)) {
      throw new Error(
        `Primitive reconciliation records ${id}, which is not a registered primitive`,
      );
    }
  }
  return artifact;
}
