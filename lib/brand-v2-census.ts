import { createHash } from 'node:crypto';

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
      entries.map(([name, values]) => [name, values.includes(id)]),
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
function validateControlRecord(
  record: PrimitiveRegistryRecord,
): CensusFailure[] {
  const assertionId = 'VAL-B2-COMP-013';
  const failures: CensusFailure[] = [];
  const owners = record.ownerRouteOrMount;
  if (!Array.isArray(owners) || owners.length === 0) {
    failures.push({
      assertionId,
      memberId: record.id,
      expected: 'non-empty list of concrete owner routes or mount modules',
      actual: owners,
      reason: 'unowned-control-registry-row',
    });
  } else {
    for (const owner of owners) {
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
  }

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

const INVENTED_SYMBOL =
  /(?:^|[/:\-_])(favicon|apple-touch-icon|maskable|monogram|mascot|robot-head|brand-symbol|rw-logo)(?:[./:\-_]|$)/i;

export function validateNoInventedSymbols(
  paths: readonly string[],
): CensusFailure[] {
  return paths
    .filter((path) => INVENTED_SYMBOL.test(path))
    .map((path) => ({
      assertionId: 'VAL-B2-IMG-010',
      memberId: path,
      expected: 'no first-party symbol, favicon, mask, mascot, or monogram',
      actual: path,
      reason: 'invented-brand-symbol',
    }));
}
