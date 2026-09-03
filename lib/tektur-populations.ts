/**
 * Canonical populations for the completed Tektur assertions.
 *
 * `VAL-B2-TYPE-015` quantifies over six registered role instances,
 * `VAL-B2-TYPE-016` over one static-TTF-to-role mapping, `VAL-B2-TYPE-017`
 * over every assigned string, and `VAL-B2-TYPE-002/011/012/013/014` over the
 * shipped binaries. None of them quantifies over the four first-party
 * families, so expanding their evidence across the family registry produced a
 * `passed` row per family for a claim never checked against that family (R8a).
 * Each population here is derived from the artifact the assertion inspects and
 * carries the member facts the evidence row records, so a result names
 * something that was actually measured about that member.
 */
import { TEKTUR_FONT_METADATA } from '../data/tektur-font-metadata.ts';
import {
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_OG_ROLE_ID,
  TEKTUR_ROLE_INSTANCES,
} from '../data/type-roles.ts';
import { deriveTekturRoleOccurrences } from './tektur-role-occurrences.ts';

export type TekturPopulationMember = {
  id: string;
  /** The file the member's facts were read out of. */
  sourcePath: string;
  observed: Record<string, unknown>;
};

function binaryMembers(): TekturPopulationMember[] {
  const { web, og, family, license, upstream, axisLabels } =
    TEKTUR_FONT_METADATA;
  return [
    {
      id: 'tektur:web-woff2',
      sourcePath: web.path,
      observed: {
        family,
        role: 'web display delivery through next/font/local',
        path: web.path,
        format: web.format,
        subset: web.subset,
        sha256: web.sha256,
        axes: Object.fromEntries(
          Object.entries(web.axes).map(([tag, axis]) => [
            tag,
            `${axisLabels[tag as keyof typeof axisLabels]} ${axis.min}..${axis.max} default ${axis.default}`,
          ]),
        ),
        licensePath: license.path,
        upstreamRevision: upstream.revision,
      },
    },
    {
      id: 'tektur:og-ttf',
      sourcePath: og.path,
      observed: {
        family,
        role: 'offline Open Graph renderer only; never loaded by a runtime route',
        path: og.path,
        format: og.format,
        subset: og.subset,
        sha256: og.sha256,
        staticInstance: `wght ${og.weight} / wdth ${og.width} / usWidthClass ${og.widthClass}`,
        licensePath: license.path,
        upstreamRevision: upstream.revision,
      },
    },
  ];
}

function roleInstanceMembers(): TekturPopulationMember[] {
  // The routes are derived from the annotation writers and the used-import
  // graph, not read back out of the registry row: a row that declares its
  // own route population cannot be wrong about it.
  const occurrences = deriveTekturRoleOccurrences();
  return TEKTUR_ROLE_INSTANCES.map((instance) => ({
    id: `type-instance:${instance.id}`,
    sourcePath: 'data/type-roles.json',
    observed: {
      cssClass: instance.cssClass,
      wght: instance.wght,
      wdth: instance.wdth,
      definedIn: instance.definedIn,
      derivedRoutes: occurrences.routesByRole[instance.id] ?? [],
      sourceOccurrences: occurrences.writers
        .filter(({ role }) => role === instance.id)
        .reduce((total, { occurrences: count }) => total + count, 0),
    },
  }));
}

function ogMappingMembers(): TekturPopulationMember[] {
  const { og } = TEKTUR_FONT_METADATA;
  return [
    {
      id: `og-static-mapping:${og.mappedRoleId}`,
      sourcePath: 'assets/fonts/tektur/metadata.json',
      observed: {
        mappedRoleId: og.mappedRoleId,
        registryOgRoleId: TEKTUR_OG_ROLE_ID,
        staticPath: og.path,
        weight: og.weight,
        width: og.width,
      },
    },
  ];
}

function assignedStringMembers(): TekturPopulationMember[] {
  return TEKTUR_ASSIGNED_STRINGS.map((assigned) => ({
    id: `assigned-string:${assigned.id}`,
    sourcePath: 'data/type-roles.ts',
    observed: {
      characters: [...assigned.text].length,
      codePoints: new Set([...assigned.text].map((c) => c.codePointAt(0))).size,
      targets: [...assigned.targets],
    },
  }));
}

export const TEKTUR_BINARY_POPULATION_SOURCE =
  'assets/fonts/tektur/metadata.json#binaries';
/**
 * `VAL-B2-TYPE-011` is a claim about the variable web file and
 * `VAL-B2-TYPE-012` about the static OG file, so neither may be recorded
 * against the other binary.
 */
export const TEKTUR_WEB_BINARY_POPULATION_SOURCE =
  'assets/fonts/tektur/metadata.json#web';
export const TEKTUR_OG_BINARY_POPULATION_SOURCE =
  'assets/fonts/tektur/metadata.json#og';
export const TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE =
  'data/type-roles.json#tekturRoleInstances';
export const TEKTUR_OG_MAPPING_POPULATION_SOURCE =
  'data/type-roles.json#tekturOgRoleMapping';
export const TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE =
  'data/type-roles.ts#TEKTUR_ASSIGNED_STRINGS';

const BINARIES = binaryMembers();

export const TEKTUR_POPULATIONS: Readonly<
  Record<string, readonly TekturPopulationMember[]>
> = {
  [TEKTUR_BINARY_POPULATION_SOURCE]: BINARIES,
  [TEKTUR_WEB_BINARY_POPULATION_SOURCE]: BINARIES.filter(
    ({ id }) => id === 'tektur:web-woff2',
  ),
  [TEKTUR_OG_BINARY_POPULATION_SOURCE]: BINARIES.filter(
    ({ id }) => id === 'tektur:og-ttf',
  ),
  [TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE]: roleInstanceMembers(),
  [TEKTUR_OG_MAPPING_POPULATION_SOURCE]: ogMappingMembers(),
  [TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE]: assignedStringMembers(),
};

export const TEKTUR_POPULATION_IDS: Readonly<Record<string, string[]>> =
  Object.fromEntries(
    Object.entries(TEKTUR_POPULATIONS).map(([source, members]) => [
      source,
      members.map(({ id }) => id),
    ]),
  );

export function tekturPopulationMember(
  source: string,
  id: string,
): TekturPopulationMember {
  const member = TEKTUR_POPULATIONS[source]?.find(
    (candidate) => candidate.id === id,
  );
  if (!member) {
    throw new Error(`No Tektur population member ${id} in ${source}`);
  }
  return member;
}
