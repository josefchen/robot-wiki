import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VIEW_IDS, DEFAULT_MARKET_MAP_VIEW } from '@/lib/market-map';
import {
  MARKET_MAP_ROUTE,
  PRIMITIVE_REGISTRY_KINDS,
  derivePrimitiveSweepRouteStates,
  readPrimitiveReconciliation,
  type PrimitiveReconciliation,
  type PrimitiveRegistrySlice,
} from '@/lib/brand-v2-primitive-reconciliation';

const ROOT = process.cwd();
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as PrimitiveRegistrySlice;
const ROUTE_STATES = derivePrimitiveSweepRouteStates(REGISTRY);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * An artifact that agrees with the registry in every field, used as the base
 * every spoof below mutates. Building it here rather than reading the
 * committed sweep keeps the rejection proofs independent of whether the
 * browser gate has run.
 */
function validArtifact(): PrimitiveReconciliation {
  const members: PrimitiveReconciliation['members'] = {};
  for (const kind of PRIMITIVE_REGISTRY_KINDS) {
    for (const row of REGISTRY[kind]) {
      members[row.id] = {
        kind,
        fingerprint: row.fingerprint,
        mountState: row.mountState,
        definedIn: [...row.definedIn],
        ownerRouteOrMount: [...row.ownerRouteOrMount],
        renderedOn: row.mountState === 'production' ? [ROUTE_STATES[0]] : [],
      };
    }
  }
  return {
    version: 1,
    viewport: { width: 1440, height: 900 },
    routes: [...ROUTE_STATES],
    members,
    unregisteredRendered: [],
    unannotatedRendered: [],
  };
}

function read(artifact: PrimitiveReconciliation): PrimitiveReconciliation {
  return readPrimitiveReconciliation({ artifact, registry: REGISTRY });
}

function productionMember(kind?: string): string {
  const members = validArtifact().members;
  const id = Object.keys(members).find(
    (candidate) =>
      members[candidate].renderedOn.length > 0 &&
      (kind === undefined || members[candidate].kind === kind),
  );
  if (!id) {
    throw new Error(`No production-mounted ${kind ?? 'primitive'} is registered`);
  }
  return id;
}

describe('brand-v2 primitive reconciliation', () => {
  it('derives the sweep population from the registry and the market-map views', () => {
    const routes = REGISTRY.routes.public.map(({ path }) => path);
    expect(ROUTE_STATES).toEqual([
      ...routes,
      ...VIEW_IDS.filter((view) => view !== DEFAULT_MARKET_MAP_VIEW).map(
        (view) => `${MARKET_MAP_ROUTE}?view=${view}`,
      ),
    ]);
    expect(ROUTE_STATES.length).toBe(routes.length + VIEW_IDS.length - 1);
    expect(() =>
      derivePrimitiveSweepRouteStates({
        routes: { public: routes.filter((path) => path !== MARKET_MAP_ROUTE).map((path) => ({ path })) },
      }),
    ).toThrow(/view states cannot be swept/);
  });

  it('accepts a sweep that agrees with the current registry in every field', () => {
    expect(read(validArtifact())).toBeTruthy();
  });

  it('rejects a sweep that skipped a required route state', () => {
    const artifact = validArtifact();
    artifact.routes = artifact.routes.filter(
      (route) => route !== `${MARKET_MAP_ROUTE}?view=bubble`,
    );
    expect(() => read(artifact)).toThrow(/wrong route states/);
  });

  it('rejects a sweep that claims route states the population does not contain', () => {
    const artifact = validArtifact();
    artifact.routes = [...artifact.routes, '/invented/'];
    expect(() => read(artifact)).toThrow(/unexpected \/invented\//);
  });

  it('rejects a forged mount state, even a self-consistent one', () => {
    const artifact = validArtifact();
    const libraryOnly = Object.entries(artifact.members).find(
      ([, member]) => member.mountState !== 'production',
    );
    expect(libraryOnly, 'a library-only primitive is registered').toBeDefined();
    const [id, member] = libraryOnly as [
      string,
      PrimitiveReconciliation['members'][string],
    ];
    // The forgery is internally consistent: it promotes the member and
    // supplies a rendering to match, which is exactly what the previous
    // "renderedOn agrees with the artifact's own mountState" check accepted.
    member.mountState = 'production';
    member.renderedOn = [ROUTE_STATES[0]];
    expect(() => read(artifact)).toThrow(
      new RegExp(`records mount state production for ${id}`),
    );
  });

  it('rejects fabricated registry metadata', () => {
    const stale = validArtifact();
    stale.members[productionMember()].fingerprint = 'f'.repeat(64);
    expect(() => read(stale)).toThrow(/is stale/);

    const definedIn = validArtifact();
    definedIn.members[productionMember()].definedIn = ['components/fake.tsx'];
    expect(() => read(definedIn)).toThrow(/records definedIn/);

    const owners = validArtifact();
    owners.members[productionMember()].ownerRouteOrMount = ['/invented/'];
    expect(() => read(owners)).toThrow(/records ownerRouteOrMount/);

    const kind = validArtifact();
    kind.members[productionMember('controls')].kind = 'gridDevices';
    expect(() => read(kind)).toThrow(/as gridDevices rather than controls/);
  });

  it('rejects an incomplete or padded member set', () => {
    const dropped = validArtifact();
    const id = productionMember();
    delete dropped.members[id];
    expect(() => read(dropped)).toThrow(
      new RegExp(`no member record for ${id}`),
    );

    const padded = validArtifact();
    padded.members['surface:invented'] = clone(padded.members[id]);
    expect(() => read(padded)).toThrow(/not a registered primitive/);
  });

  it('rejects a rendering on a route state the sweep never visited', () => {
    const artifact = validArtifact();
    artifact.members[productionMember()].renderedOn = ['/never-visited/'];
    expect(() => read(artifact)).toThrow(/which the sweep never visited/);

    const duplicated = validArtifact();
    duplicated.members[productionMember()].renderedOn = [
      ROUTE_STATES[0],
      ROUTE_STATES[0],
    ];
    expect(() => read(duplicated)).toThrow(/repeats an entry/);
  });

  it('rejects an unannotated or unregistered rendered member', () => {
    const unannotated = validArtifact();
    unannotated.unannotatedRendered = ['div.surface'];
    expect(() => read(unannotated)).toThrow(/unannotated rendered members/);

    const unregistered = validArtifact();
    unregistered.unregisteredRendered = ['surface:sunken'];
    expect(() => read(unregistered)).toThrow(/unregistered rendered members/);
  });

  it('accepts the committed sweep this repository ships', () => {
    const artifact = JSON.parse(
      readFileSync(
        join(ROOT, 'evidence', 'brand-v2', 'primitive-reconciliation.json'),
        'utf8',
      ),
    ) as PrimitiveReconciliation;
    expect(read(artifact)).toBeTruthy();
  });
});
