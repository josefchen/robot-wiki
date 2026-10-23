import { createHash } from 'node:crypto';
import { maskScriptComments } from './brand-v2-jsx-elements.ts';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type CensusFailure = {
  assertionId: string;
  memberId?: string;
  expected: unknown;
  actual: unknown;
  reason: string;
};

export type StateCase = {
  id: string;
  kind:
    | 'default'
    | 'focus'
    | 'hover'
    | 'reset'
    | 'discrete-options'
    | 'slider-boundaries'
    | 'pairwise'
    | 'exception';
  selector?: string;
  expectedEnumeration?: string;
  notApplicableReason?: string;
};

/** The implemented states a component source can witness by name. */
export const IMPLEMENTED_STATES = ['loading', 'error', 'empty', 'unavailable'] as const;
export type ImplementedState = (typeof IMPLEMENTED_STATES)[number];

/**
 * A component source with its comments blanked, which is what the state
 * census reads: a note such as "the list is never empty" or a commented-out
 * `aria-pressed` describes the code, it is not code, and must not register a
 * state or a control the component does not render.
 */
export function stateCensusText(source: string): string {
  return maskScriptComments(source);
}

/** Whether a source's code, comments aside, names an implemented state. */
export function implementsState(source: string, state: ImplementedState): boolean {
  return new RegExp(`\\b${state}\\b`, 'i').test(stateCensusText(source));
}

export type InteractiveSourceRecord = {
  id: string;
  fingerprint: string;
  cases: readonly StateCase[];
};

export type InteractiveMountRecord = {
  id: string;
  sourceId: string;
  fingerprint: string;
  cases: readonly StateCase[];
};

type PrimitiveRegistryRecord = {
  id: string;
  fingerprint: string;
  [key: string]: unknown;
};

type PrimitiveRegistrySet = {
  gridDevices: readonly PrimitiveRegistryRecord[];
  surfaces: readonly PrimitiveRegistryRecord[];
  controls: readonly PrimitiveRegistryRecord[];
};

function normalize(value: unknown): JsonValue {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return String(value);
}

export function configurationFingerprint(value: unknown): string {
  if (ArrayBuffer.isView(value)) {
    return createHash('sha256')
      .update(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      )
      .digest('hex');
  }
  return createHash('sha256')
    .update(JSON.stringify(normalize(value)))
    .digest('hex');
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

export function reconcileNamedSets(
  sets: Record<string, readonly string[]>,
  assertionId = 'VAL-B2-CONT-007',
  exemptions: Record<string, readonly string[]> = {},
): CensusFailure[] {
  const entries = Object.entries(sets);
  if (entries.length < 2) {
    return [
      {
        assertionId,
        expected: 'at least two independently derived populations',
        actual: entries.map(([name]) => name),
        reason: 'insufficient-populations',
      },
    ];
  }

  const failures: CensusFailure[] = [];
  for (const [name, values] of entries) {
    for (const id of duplicates(values)) {
      failures.push({
        assertionId,
        memberId: id,
        expected: 'one member per population',
        actual: `${name} contains a duplicate`,
        reason: 'duplicate-member',
      });
    }
  }

  const universe = new Set(entries.flatMap(([, values]) => values));
  for (const id of [...universe].sort()) {
    const membership = Object.fromEntries(
      entries.map(([name, values]) => [
        name,
        values.includes(id) || (exemptions[name] ?? []).includes(id),
      ]),
    );
    if (Object.values(membership).every(Boolean)) continue;
    failures.push({
      assertionId,
      memberId: id,
      expected: Object.fromEntries(entries.map(([name]) => [name, true])),
      actual: membership,
      reason: 'set-mismatch',
    });
  }
  return failures;
}

export function validateExactRegistryParity(
  physicalIds: readonly string[],
  registeredIds: readonly string[],
  usedIds: readonly string[],
): CensusFailure[] {
  const assertionId = 'VAL-B2-IMG-007';
  const failures: CensusFailure[] = [];
  const physical = new Set(physicalIds.filter((id) => !id.startsWith('symlink:')));
  const registered = new Set(registeredIds);
  const used = new Set(usedIds);

  for (const id of duplicates(registeredIds)) {
    failures.push({
      assertionId,
      memberId: id,
      expected: 'unique asset registry id',
      actual: 'duplicate',
      reason: 'duplicate-registry-id',
    });
  }
  for (const id of physicalIds.filter((value) => value.startsWith('symlink:'))) {
    failures.push({
      assertionId,
      memberId: id.replace(/^symlink:/, ''),
      expected: 'regular physical asset file',
      actual: 'symlink',
      reason: 'symlink-asset',
    });
  }
  for (const id of physical) {
    if (!registered.has(id)) {
      failures.push({
        assertionId,
        memberId: id,
        expected: 'registered physical asset',
        actual: 'unregistered',
        reason: 'unregistered-physical-asset',
      });
    }
  }
  for (const id of registered) {
    if (!physical.has(id)) {
      failures.push({
        assertionId,
        memberId: id,
        expected: 'physical file',
        actual: 'missing',
        reason: 'registered-file-missing',
      });
    }
    if (!used.has(id)) {
      failures.push({
        assertionId,
        memberId: id,
        expected: 'at least one source/render owner',
        actual: 'unused',
        reason: 'orphan-registered-asset',
      });
    }
  }
  for (const id of used) {
    if (!registered.has(id)) {
      failures.push({
        assertionId,
        memberId: id,
        expected: 'registered asset use',
        actual: 'unregistered use',
        reason: 'unregistered-asset-use',
      });
    }
  }
  return failures;
}

function validFingerprint(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

const OWNER_PLACEHOLDER =
  /shared primitive|supplied at render|concrete owner|to be (?:supplied|determined)|tbd|various|as needed/i;
const OWNER_MODULE = /^(?:app|components|lib|mdx-components)[\w./[\]()@-]*\.tsx?$/;
const TARGET_SIZE_EXCEPTION_KINDS = new Set(['inline', 'spacing', 'equivalent']);

/**
 * A required-field presence check cannot tell a real owner record from a
 * sentence that says an owner exists, and it cannot tell a measured target
 * size from a blanket claim. Both were true of the control registry, so the
 * owner and target-size values are checked for substance here.
 */
const MOUNT_STATES = new Set(['production', 'library-only', 'unwritten']);

/**
 * Every primitive row records where its ID is written (`definedIn`) and
 * whether a route entry actually reaches one of those modules
 * (`mountState`). Recording a definition file as an owner is how an
 * unmounted shared primitive came to look like a production mount, so the
 * two fields have to agree: `production` requires owners, `library-only`
 * requires definitions and no owner, and `unwritten` requires neither. A row
 * cannot claim a mount it does not have, and it cannot hide one it does.
 */
function validateMountRecord(
  assertionId: string,
  record: PrimitiveRegistryRecord,
): CensusFailure[] {
  const failures: CensusFailure[] = [];
  const owners = record.ownerRouteOrMount ?? [];
  const definedIn = record.definedIn;
  const mountState = record.mountState;
  if (typeof mountState !== 'string' || !MOUNT_STATES.has(mountState)) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: [...MOUNT_STATES].join(' | '),
      actual: mountState,
      reason: 'unrecognised-primitive-mount-state',
    });
  }
  if (!Array.isArray(definedIn) || !Array.isArray(owners)) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'definedIn and ownerRouteOrMount arrays',
      actual: { definedIn, owners },
      reason: 'invalid-control-owner',
    });
    return failures;
  }
  for (const owner of [...definedIn, ...owners]) {
    if (typeof owner !== 'string' || owner.trim().length === 0) {
      failures.push({
        assertionId,
        memberId: record.id,
        expected: 'owner route or mount module path',
        actual: owner,
        reason: 'invalid-control-owner',
      });
      continue;
    }
    if (OWNER_PLACEHOLDER.test(owner)) {
      failures.push({
        assertionId,
        memberId: record.id,
        expected: 'concrete owner route or mount module path',
        actual: owner,
        reason: 'placeholder-control-owner',
      });
      continue;
    }
    if (!owner.startsWith('/') && !OWNER_MODULE.test(owner)) {
      failures.push({
        assertionId,
        memberId: record.id,
        expected: 'route path starting with / or a first-party module path',
        actual: owner,
        reason: 'unresolvable-control-owner',
      });
    }
  }
  for (const owner of owners) {
    if (!definedIn.includes(owner)) {
      failures.push({
        assertionId,
        memberId: record.id,
        expected: `${owner} listed among the modules that write ${record.id}`,
        actual: definedIn,
        reason: 'owner-outside-definition-set',
      });
    }
  }
  const expectedState =
    definedIn.length === 0
      ? 'unwritten'
      : owners.length > 0
        ? 'production'
        : 'library-only';
  if (mountState !== expectedState) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: expectedState,
      actual: mountState,
      reason: 'mount-state-contradicts-owners',
    });
  }
  if (mountState === 'production' && owners.length === 0) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'non-empty list of concrete owner routes or mount modules',
      actual: owners,
      reason: 'unowned-control-registry-row',
    });
  }
  return failures;
}

function validateControlRecord(
  record: PrimitiveRegistryRecord,
): CensusFailure[] {
  const assertionId = 'VAL-B2-COMP-013';
  const failures: CensusFailure[] = [];

  const targetSize = record.targetSize;
  if (targetSize === null || typeof targetSize !== 'object') {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'target-size record',
      actual: targetSize,
      reason: 'missing-target-size-record',
    });
    return failures;
  }
  const size = targetSize as Record<string, unknown>;
  if (size.minimumPx !== 24) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'WCAG 2.2 SC 2.5.8 minimum of 24px',
      actual: size.minimumPx,
      reason: 'wrong-target-size-minimum',
    });
  }
  if (typeof size.preferredPx !== 'number' || size.preferredPx < 24) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'preferred target size of at least the 24px minimum',
      actual: size.preferredPx,
      reason: 'wrong-target-size-preference',
    });
  }
  if (!Array.isArray(size.exceptions)) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'explicit target-size exception list (empty when none apply)',
      actual: size.exceptions,
      reason: 'missing-target-size-exceptions',
    });
    return failures;
  }
  for (const [index, value] of size.exceptions.entries()) {
    const exception = (value ?? {}) as Record<string, unknown>;
    const memberId = `${record.id} exception ${index}`;
    if (
      typeof exception.kind !== 'string' ||
      !TARGET_SIZE_EXCEPTION_KINDS.has(exception.kind)
    ) {
      failures.push({
        assertionId,
        memberId,
        expected: [...TARGET_SIZE_EXCEPTION_KINDS].join(' | '),
        actual: exception.kind,
        reason: 'unrecognised-target-size-exception',
      });
    }
    for (const field of ['criterion', 'reason'] as const) {
      if (
        typeof exception[field] !== 'string' ||
        exception[field].trim().length === 0
      ) {
        failures.push({
          assertionId,
          memberId,
          expected: `non-empty ${field}`,
          actual: exception[field],
          reason: 'undocumented-target-size-exception',
        });
      }
    }
  }
  return failures;
}

export function validatePrimitiveRegistries(
  registries: PrimitiveRegistrySet,
): CensusFailure[] {
  const failures: CensusFailure[] = [];
  const definitions = [
    {
      assertionId: 'VAL-B2-GRID-009',
      name: 'gridDevices',
      records: registries.gridDevices,
      fields: [
        'definedIn',
        'mountState',
        'ownerRouteOrMount',
        'ownerSurface',
        'structuralPurpose',
        'anchorGeometry',
        'classification',
        'pointerBehavior',
        'ariaBehavior',
        'allowedViewports',
      ],
    },
    {
      assertionId: 'VAL-B2-SURF-010',
      name: 'surfaces',
      records: registries.surfaces,
      fields: [
        'definedIn',
        'mountState',
        'ownerRouteOrMount',
        'level',
        'stackingPurpose',
        'allowedRadiusPx',
        'border',
        'shadow',
        'allowedOwners',
      ],
    },
    {
      assertionId: 'VAL-B2-COMP-013',
      name: 'controls',
      records: registries.controls,
      fields: [
        'definedIn',
        'mountState',
        'ownerRouteOrMount',
        'action',
        'persistentAria',
        'disabledException',
        'targetSize',
        'pointerAlternative',
        'supportedStates',
      ],
    },
  ] as const;

  for (const definition of definitions) {
    if (definition.records.length === 0) {
      failures.push({
        assertionId: definition.assertionId,
        memberId: definition.name,
        expected: 'non-empty primitive registry',
        actual: 0,
        reason: 'empty-primitive-registry',
      });
      continue;
    }
    for (const record of definition.records) {
      if (!validFingerprint(record.fingerprint)) {
        failures.push({
          assertionId: definition.assertionId,
          memberId: record.id,
          expected: 'lowercase SHA-256 configuration fingerprint',
          actual: record.fingerprint,
          reason: 'invalid-fingerprint',
        });
      }
      for (const field of definition.fields) {
        if (!Object.hasOwn(record, field)) {
          failures.push({
            assertionId: definition.assertionId,
            memberId: record.id,
            expected: `registry field ${field}`,
            actual: 'missing',
            reason: 'missing-primitive-registry-field',
          });
        }
      }
      failures.push(...validateMountRecord(definition.assertionId, record));
    }
  }
  for (const record of registries.controls) {
    failures.push(...validateControlRecord(record));
  }
  return failures;
}

export function validateInteractiveRegistry(
  sources: readonly InteractiveSourceRecord[],
  mounts: readonly InteractiveMountRecord[],
): CensusFailure[] {
  const failures: CensusFailure[] = [];
  const sourceIds = new Set(sources.map(({ id }) => id));
  for (const id of duplicates(sources.map(({ id }) => id))) {
    failures.push({
      assertionId: 'VAL-B2-VIZ-010',
      memberId: id,
      expected: 'unique source id',
      actual: 'duplicate',
      reason: 'duplicate-source-id',
    });
  }
  for (const id of duplicates(mounts.map(({ id }) => id))) {
    failures.push({
      assertionId: 'VAL-B2-VIZ-010',
      memberId: id,
      expected: 'unique mount id',
      actual: 'duplicate',
      reason: 'duplicate-mount-id',
    });
  }
  for (const record of [...sources, ...mounts]) {
    if (!validFingerprint(record.fingerprint)) {
      failures.push({
        assertionId: 'VAL-B2-VIZ-010',
        memberId: record.id,
        expected: 'lowercase SHA-256 configuration fingerprint',
        actual: record.fingerprint,
        reason: 'invalid-fingerprint',
      });
    }
    if (record.cases.length === 0) {
      failures.push({
        assertionId: 'VAL-B2-VIZ-011',
        memberId: record.id,
        expected: 'non-empty exact bounded state cases',
        actual: 0,
        reason: 'empty-state-cases',
      });
    }
    for (const stateCase of record.cases) {
      if (stateCase.kind === 'exception' && !stateCase.notApplicableReason) {
        failures.push({
          assertionId: 'VAL-B2-VIZ-011',
          memberId: `${record.id}:${stateCase.id}`,
          expected: 'typed notApplicableReason',
          actual: null,
          reason: 'untyped-not-applicable',
        });
      }
    }
  }
  for (const mount of mounts) {
    if (!sourceIds.has(mount.sourceId)) {
      failures.push({
        assertionId: 'VAL-B2-VIZ-010',
        memberId: mount.id,
        expected: mount.sourceId,
        actual: 'missing source registry member',
        reason: 'missing-mount-source',
      });
    }
  }
  return failures;
}

/**
 * The one first-party icon set the owner approved.
 *
 * The sealed identity left every icon slot empty (design-system 3.4). On
 * 2026-10-12 Josef asked: "ensure we fix the favicon". This set is that
 * exception and nothing wider: exactly these three files, with exactly these
 * bytes, declared through the Next.js file conventions in `app/`. The mark is
 * the wordmark's own DM Sans R (weight 600, the instance the shell
 * wordmark renders) in paper on an ink square, so it adds no new symbol.
 * Any other favicon, icon or touch-icon file, monogram, mascot or mask is
 * still an invented symbol, and changed bytes need a new approval here.
 */
export const APPROVED_TAB_ICONS = [
  {
    path: 'app/favicon.ico',
    rel: 'icon',
    href: '/favicon.ico',
    sha256: 'ac6b44117b0a93dc8e282b85106e3cc85f68ef18fdf53cd805e73d26fe6f3517',
  },
  {
    path: 'app/icon.svg',
    rel: 'icon',
    href: '/icon.svg',
    sha256: '7e5b818f0caea7d7b38b53845ec32ccfde28c668b1cbc1cf0e4f2b4dc540cef8',
  },
  {
    path: 'app/apple-icon.png',
    rel: 'apple-touch-icon',
    href: '/apple-icon.png',
    sha256: 'bdadc29c59a40a39927bebf68c55322d9c66fb7c1e9310707fb32b518344fbf2',
  },
] as const;

export const TAB_ICON_OWNER_APPROVAL =
  'Josef, 2026-10-12: "ensure we fix the favicon"';

const APPROVED_TAB_ICON_PATHS: ReadonlySet<string> = new Set(
  APPROVED_TAB_ICONS.map(({ path }) => path),
);

/**
 * Whether a rendered `<link>` icon declaration, written `rel=href` as the
 * identity sweep records it, is one of the approved tab icons. Next.js adds
 * a content-hash query to file-convention icons, so the query is ignored
 * and the path and rel must match exactly.
 */
export function isApprovedTabIconDeclaration(declaration: string): boolean {
  const separator = declaration.indexOf('=');
  if (separator < 0) return false;
  const rel = declaration.slice(0, separator).trim().toLowerCase();
  const href = declaration.slice(separator + 1).split(/[?#]/)[0];
  return APPROVED_TAB_ICONS.some(
    (icon) => icon.rel === rel && icon.href === href,
  );
}

/**
 * Every approved tab icon exists with its approved bytes. `read` returns
 * a file's bytes by repository path, or null when it is absent.
 */
export function validateApprovedTabIcons(
  read: (path: string) => Uint8Array | null,
): CensusFailure[] {
  return APPROVED_TAB_ICONS.flatMap((icon): CensusFailure[] => {
    const bytes = read(icon.path);
    if (bytes === null) {
      return [{
        assertionId: 'VAL-B2-IMG-010',
        memberId: icon.path,
        expected: icon.sha256,
        actual: null,
        reason: 'missing-approved-tab-icon',
      }];
    }
    const actual = createHash('sha256').update(bytes).digest('hex');
    return actual === icon.sha256
      ? []
      : [{
          assertionId: 'VAL-B2-IMG-010',
          memberId: icon.path,
          expected: icon.sha256,
          actual,
          reason: 'unapproved-tab-icon-bytes',
        }];
  });
}

const INVENTED_SYMBOL =
  /(?:^|[/:\-_])(favicon|apple-touch-icon|apple-icon|touch-icon|maskable|monogram|mascot|robot-head|brand-symbol|rw-logo)(?:[./:\-_]|$)/i;

/** A Next.js icon file convention anywhere under `app/` (icon1.png, a/b/icon.tsx, ...). */
const APP_ICON_CONVENTION =
  /(?:^|\/)app\/(?:[^/\n]+\/)*(?:favicon|icon|apple-icon)\d*\.(?:ico|jpe?g|png|gif|svg|webp|[cm]?[jt]sx?)$/i;

export function validateNoInventedSymbols(
  paths: readonly string[],
): CensusFailure[] {
  return paths
    .filter((path) => !APPROVED_TAB_ICON_PATHS.has(path))
    .filter((path) => INVENTED_SYMBOL.test(path) || APP_ICON_CONVENTION.test(path))
    .map((path) => ({
      assertionId: 'VAL-B2-IMG-010',
      memberId: path,
      expected:
        'no first-party symbol, favicon, mask, mascot, or monogram beyond the approved tab icon set',
      actual: path,
      reason: 'invented-brand-symbol',
    }));
}
