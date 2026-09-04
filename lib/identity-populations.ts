import { TEKTUR_OG_ROLE_ID, TEKTUR_ROLE_INSTANCES } from '../data/type-roles.ts';
import {
  descriptorSurfaces,
  type DescriptorSurface,
  type IdentityRuntimeEvidence,
} from './brand-v2-identity-evidence.ts';

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
