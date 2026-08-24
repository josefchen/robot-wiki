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
