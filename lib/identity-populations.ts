import { TEKTUR_OG_ROLE_ID, TEKTUR_ROLE_INSTANCES } from '../data/type-roles.ts';
import {
  descriptorSurfaces,
  type DescriptorSurface,
  type IdentityRuntimeEvidence,
} from './brand-v2-identity-evidence.ts';
import {
  deriveTekturRoleOccurrences,
  type TekturRoleOccurrenceOptions,
} from './tektur-role-occurrences.ts';

/**
 * Canonical populations for the six public-identity assertions.
 *
 * Four of them quantify over something other than a route.
 * `VAL-B2-ID-002` is about descriptor surfaces, and most routes have none;
 * `VAL-B2-ID-004` is about three named technical identifiers;
 * `VAL-B2-ID-005` is about the identity wordmark roles and the registered
 * static Open Graph instance; `VAL-B2-ID-006` is about the first-party
 * visual assets the repository ships. Recording any of them per public
 * route would emit 61 `passed` rows for a claim never checked against that
 * route, which is the proxy-population failure R8(a) names. Only
 * `VAL-B2-ID-001` and `VAL-B2-ID-003` genuinely quantify over routes, and
 * they keep the route population.
 */
export const IDENTITY_DESCRIPTOR_POPULATION_SOURCE =
  'evidence/brand-v2/identity-runtime.json#descriptorSurfaces';
export const IDENTITY_TECHNICAL_POPULATION_SOURCE =
  'contract/design-integrity.md#VAL-B2-ID-004:technical-identifiers';
export const IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE =
  'data/type-roles.json#identityWordmarkRoles';
export const IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#assets:first-party-visual';

export const IDENTITY_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ID-002': IDENTITY_DESCRIPTOR_POPULATION_SOURCE,
  'VAL-B2-ID-004': IDENTITY_TECHNICAL_POPULATION_SOURCE,
  'VAL-B2-ID-005': IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE,
  'VAL-B2-ID-006': IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE,
};

export type IdentityWordmarkRole = {
  id: string;
  kind: 'web-role' | 'og-static-instance';
  roleId: string;
  cssClass: string | null;
  wght: number;
  wdth: number;
  definedIn: string[];
};

/**
 * The identity surfaces `VAL-B2-ID-005` names: the wordmark roles the shell
 * and hero render, plus the registered static instance the Open Graph
 * renderer maps to one of them. Derived from the role registry by the
 * `wordmark` suffix rather than listed, so adding a third identity lockup
 * role adds a member instead of silently escaping the assertion.
 */
export function identityWordmarkRoles(): IdentityWordmarkRole[] {
  const web = TEKTUR_ROLE_INSTANCES.filter(({ id }) => id.endsWith('wordmark'));
  if (web.length === 0) {
    throw new Error(
      'no Tektur wordmark role instances are registered: VAL-B2-ID-005 would quantify over an empty population',
    );
  }
  const mapped = TEKTUR_ROLE_INSTANCES.find(
    ({ id }) => id === TEKTUR_OG_ROLE_ID,
  );
  if (!mapped) {
    throw new Error(
      `the registered Open Graph role ${TEKTUR_OG_ROLE_ID} is not a Tektur role instance`,
    );
  }
  return [
    ...web.map((instance) => ({
      id: `identity-surface:${instance.id}`,
      kind: 'web-role' as const,
      roleId: instance.id,
      cssClass: instance.cssClass,
      wght: instance.wght,
      wdth: instance.wdth,
      definedIn: [...instance.definedIn],
    })),
    {
      id: `identity-surface:og-static-instance:${mapped.id}`,
      kind: 'og-static-instance' as const,
      roleId: mapped.id,
      cssClass: null,
      wght: mapped.wght,
      wdth: mapped.wdth,
      definedIn: ['assets/fonts/tektur/metadata.json'],
    },
  ];
}

export type IdentitySlotExpectation = {
  route: string;
  /** Registered identity wordmark roles this route's modules write. */
  roles: string[];
};

/**
 * Which identity lockups each public route is *registered* to render,
 * derived from the role annotations its own modules write.
 *
 * This is the population the sweep has to account for, and it is built
 * without reading a single rendered character. The discovery it joins used
 * to be the whole population: the sweep matched every rendered leaf whose
 * text was some spelling of `robot wiki` and then decided those. A filter
 * over the thing being measured cannot see a lockup that stopped saying it —
 * rename the shell wordmark to `Sprocket Emporium` and it simply leaves the
 * population, so nothing is wrong with the routes that remain and the row
 * stays green over a page whose name is gone.
 *
 * Registration does not move when the text does. `app/page.tsx` writes
 * `home-wordmark` and `components/nav/site-shell.tsx` writes
 * `shell-wordmark`; the used-import graph says which routes reach those
 * modules, so `/` owes two slots and every other public route owes one,
 * whatever any of them currently say. The sweep must find every owed slot
 * and every found slot must render exactly `PUBLIC_IDENTITY`, which fails a
 * renamed lockup in the first direction and a deleted or unannotated one in
 * the second.
 *
 * The spelling-family scan stays, as the other half of a union rather than
 * as the source: registration cannot see a lockup nobody annotated, and the
 * family scan finds exactly those.
 */
export function expectedIdentitySlots(
  routes: readonly string[],
  options: TekturRoleOccurrenceOptions = {},
): IdentitySlotExpectation[] {
  if (routes.length === 0) {
    throw new Error(
      'no routes to derive identity slot expectations for: the sweep would owe nothing',
    );
  }
  const registered = new Set(
    identityWordmarkRoles()
      .filter(({ kind }) => kind === 'web-role')
      .map(({ roleId }) => roleId),
  );
  const occurrences = deriveTekturRoleOccurrences({ ...options, routes });
  const unwritten = [...registered]
    .filter((role) => !occurrences.writtenRoles.includes(role))
    .sort();
  if (unwritten.length > 0) {
    throw new Error(
      `registered identity wordmark role(s) ${unwritten.join(', ')} are written by no first-party module, so no route could owe them`,
    );
  }
  const expectations = [...routes].sort().map((route) => {
    const roles = occurrences.rolesByRoute[route];
    if (!roles) {
      throw new Error(
        `${route} has no derived role occurrences, so what it owes is unknown rather than empty`,
      );
    }
    return {
      route,
      roles: roles.filter((role) => registered.has(role)).sort(),
    };
  });
  const owing = expectations.filter(({ roles }) => roles.length === 0);
  if (owing.length > 0) {
    throw new Error(
      `${owing.length} public route(s) are registered to render no identity lockup at all, starting with ${owing[0].route}; every route mounts the shell, so the derivation did not measure what it claims`,
    );
  }
  return expectations;
}

/**
 * Every tracked file whose bytes can change what an identity lockup
 * renders, so the sweep's fingerprint covers them.
 *
 * Derived from the role registry rather than listed: the home hero and the
 * shell wordmark are both `definedIn` entries, and a hero edit that the
 * fingerprint did not cover would leave a green identity row standing over
 * an artifact measured against different markup.
 */
export function identityLockupSourcePaths(): string[] {
  return [
    ...new Set([
      ...identityWordmarkRoles()
        .filter(({ kind }) => kind === 'web-role')
        .flatMap(({ definedIn }) => definedIn),
      IDENTITY_CONSTANTS_SOURCE,
      ...IDENTITY_METADATA_SOURCES,
    ]),
  ].sort();
}

const IDENTITY_CONSTANTS_SOURCE = 'lib/identity.ts';
const IDENTITY_METADATA_SOURCES = [
  'components/nav/site-footer.tsx',
  'lib/og-cards.ts',
];

export type FirstPartyVisualAsset = {
  id: string;
  path: string;
  category: string;
};

/**
 * The first-party visual assets `VAL-B2-ID-006` quantifies over: everything
 * the repository ships as its own artwork. Company logos are registered as
 * `official-mark`, which is third-party identity the site reproduces under
 * its own name, and fonts are typography rather than artwork; neither is a
 * symbol this repository could introduce, so neither is a member.
 */
export function firstPartyVisualAssets(
  assets: ReadonlyArray<{ id: string; path: string; category: string }>,
): FirstPartyVisualAsset[] {
  const members = assets
    .filter(({ category }) => !['official-mark', 'font'].includes(category))
    .map(({ id, path, category }) => ({ id, path, category }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (members.length === 0) {
    throw new Error(
      'no first-party visual assets are registered: VAL-B2-ID-006 would quantify over an empty population',
    );
  }
  return members;
}

export function identityDescriptorSurfaces(
  evidence: IdentityRuntimeEvidence,
  siteMetadataOwnerPath: string,
): DescriptorSurface[] {
  const surfaces = descriptorSurfaces(evidence, siteMetadataOwnerPath);
  if (surfaces.length === 0) {
    throw new Error(
      'the identity sweep discovered no descriptor surface: VAL-B2-ID-002 would quantify over an empty population',
    );
  }
  return surfaces;
}
