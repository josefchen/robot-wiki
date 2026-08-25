import { createHash } from 'node:crypto';

export const BASELINE_KINDS = [
  'routes',
  'prose',
  'accessible-names',
  'relationships',
  'navigation',
  'market-playground',
  'assets-svg',
  'interactive-sources-mounts',
  'behavioral-defaults',
  'value-states',
  'article-metadata',
] as const;

export type BaselineKind = (typeof BASELINE_KINDS)[number];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ManifestInput {
  id: string;
  value: JsonValue;
}

export interface ManifestMember {
  id: string;
  value?: JsonValue;
  hash: string;
}

export interface BaselineManifest {
  schemaVersion: 1;
  kind: BaselineKind;
  memberCount: number;
  members: ManifestMember[];
  rootHash: string;
}

export interface BaselineBundle {
  schemaVersion: 1;
  source: {
    commit: string;
    tree: string;
    trackedWorktreeClean: boolean;
  };
  tools: {
    node: string;
    npm: string;
    playwright: string;
    next: string;
    typescript: string;
    vitest: string;
    lockfileSha256: string;
  };
  manifests: Record<BaselineKind, BaselineManifest>;
  manifestRoots: Record<BaselineKind, string>;
  rootHash: string;
}

export interface ApprovedDelta {
  id: string;
  manifest: BaselineKind;
  memberId: string;
  oldHash: string;
  newHash: string;
  reason: string;
  ownerApproval: string;
  responsibleMilestone: string;
  affectedAssertions: string[];
  disposition: 'permanent' | 'expires';
  expiresOn?: string;
}

export interface BaselineFailure {
  assertionId:
    | 'VAL-B2-BASE-010'
    | 'VAL-B2-BASE-011'
    | 'VAL-B2-BASE-012'
    | 'VAL-B2-BASE-013';
  manifest?: BaselineKind;
  memberId?: string;
  expected?: JsonValue | string;
  actual?: JsonValue | string;
  reason:
    | 'missing-member'
    | 'unexpected-member'
    | 'changed-member'
    | 'invalid-approved-delta'
    | 'collapsed-value-states'
    | 'invalid-value-state-rendering'
    | 'empty-value-state-population';
}

export interface DeltaValidationFailure {
  deltaId: string;
  field: keyof ApprovedDelta;
  message: string;
}

export interface ValueStateRecord {
  id: string;
  state: 'published' | 'not-disclosed' | 'not-applicable';
  rendered: string;
}

function normalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }
  return value;
}

export function stableJson(value: JsonValue): string {
  return JSON.stringify(normalize(value));
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildManifest(
  kind: BaselineKind,
  inputs: readonly ManifestInput[],
): BaselineManifest {
  const ids = new Set<string>();
  const members = inputs
    .map(({ id, value }) => {
      if (!id || ids.has(id)) {
        throw new Error(`Duplicate or empty ${kind} baseline member id: ${id}`);
      }
      ids.add(id);
      const normalizedValue = normalize(value);
      return {
        id,
        value: normalizedValue,
        hash: sha256(stableJson(normalizedValue)),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (members.length === 0) {
    throw new Error(`${kind} baseline population must be non-empty`);
  }

  return {
    schemaVersion: 1,
    kind,
    memberCount: members.length,
    members,
    rootHash: sha256(
      stableJson(
        members.map(({ id, hash }) => ({ id, hash })) as JsonValue,
      ),
    ),
  };
}

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const FORBIDDEN_BROAD_TEXT = /\*|visual redesign|all files|all routes|any change/i;

export function validateApprovedDeltas(
  deltas: readonly ApprovedDelta[],
): DeltaValidationFailure[] {
  const failures: DeltaValidationFailure[] = [];
  const ids = new Set<string>();

  for (const delta of deltas) {
    const fail = (field: keyof ApprovedDelta, message: string) => {
      failures.push({ deltaId: delta.id, field, message });
    };
    if (!delta.id || ids.has(delta.id)) fail('id', 'must be unique and non-empty');
    ids.add(delta.id);
    if (!BASELINE_KINDS.includes(delta.manifest)) {
      fail('manifest', 'must name one exact baseline manifest');
    }
    if (!delta.memberId || FORBIDDEN_BROAD_TEXT.test(delta.memberId)) {
      fail('memberId', 'must name one exact member without wildcards');
    }
    if (!HASH_PATTERN.test(delta.oldHash)) fail('oldHash', 'must be an exact SHA-256');
    if (!HASH_PATTERN.test(delta.newHash)) fail('newHash', 'must be an exact SHA-256');
    if (
      !delta.reason.trim() ||
      FORBIDDEN_BROAD_TEXT.test(delta.reason) ||
      delta.reason.trim().length < 12
    ) {
      fail('reason', 'must be specific and may not be a broad redesign allowance');
    }
    if (!delta.ownerApproval.trim()) fail('ownerApproval', 'is required');
    if (!delta.responsibleMilestone.trim()) {
      fail('responsibleMilestone', 'is required');
    }
    if (
      delta.affectedAssertions.length === 0 ||
      delta.affectedAssertions.some((id) => !/^VAL-[A-Z0-9-]+$/.test(id))
    ) {
      fail('affectedAssertions', 'must contain exact assertion IDs');
    }
    if (delta.disposition === 'expires' && !delta.expiresOn) {
      fail('expiresOn', 'is required for an expiring delta');
    }
    if (delta.disposition === 'permanent' && delta.expiresOn) {
      fail('expiresOn', 'must be omitted for a permanent delta');
    }
  }

  return failures;
}

function deltaMatches(
  delta: ApprovedDelta,
  manifest: BaselineKind,
  memberId: string,
  oldMember: ManifestMember | undefined,
  newMember: ManifestMember | undefined,
): boolean {
  if (
    delta.manifest !== manifest ||
    delta.memberId !== memberId ||
    delta.oldHash !== (oldMember?.hash ?? sha256('missing')) ||
    delta.newHash !== (newMember?.hash ?? sha256('missing'))
  ) {
    return false;
  }
  return true;
}

export function compareBaseline(
  baseline: BaselineBundle,
  current: BaselineBundle,
  deltas: readonly ApprovedDelta[],
): {
  ok: boolean;
  failures: BaselineFailure[];
  approvedDifferences: string[];
} {
  const invalidDeltas = validateApprovedDeltas(deltas);
  if (invalidDeltas.length > 0) {
    return {
      ok: false,
      failures: invalidDeltas.map((failure) => ({
        assertionId: 'VAL-B2-BASE-010',
        reason: 'invalid-approved-delta',
        memberId: failure.deltaId,
        expected: failure.field,
        actual: failure.message,
      })),
      approvedDifferences: [],
    };
  }

  const failures: BaselineFailure[] = [];
  const approvedDifferences: string[] = [];
  for (const kind of BASELINE_KINDS) {
    const before = new Map(
      baseline.manifests[kind]?.members.map((member) => [member.id, member]) ?? [],
    );
    const after = new Map(
      current.manifests[kind]?.members.map((member) => [member.id, member]) ?? [],
    );
    const ids = new Set([...before.keys(), ...after.keys()]);
    for (const id of [...ids].sort()) {
      const oldMember = before.get(id);
      const newMember = after.get(id);
      if (oldMember?.hash === newMember?.hash) continue;
      const approved = deltas.find((delta) =>
        deltaMatches(delta, kind, id, oldMember, newMember),
      );
      if (approved) {
        approvedDifferences.push(approved.id);
        continue;
      }
      failures.push({
        assertionId:
          kind === 'value-states'
            ? 'VAL-B2-BASE-013'
            : oldMember &&
                newMember &&
                (kind === 'prose' ||
                  kind === 'accessible-names' ||
                  kind === 'article-metadata')
            ? 'VAL-B2-BASE-012'
            : 'VAL-B2-BASE-011',
        manifest: kind,
        memberId: id,
        expected: oldMember?.value ?? oldMember?.hash ?? 'member absent',
        actual: newMember?.value ?? newMember?.hash ?? 'member absent',
        reason: oldMember
          ? newMember
            ? 'changed-member'
            : 'missing-member'
          : 'unexpected-member',
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    approvedDifferences: [...new Set(approvedDifferences)].sort(),
  };
}

export function assertAdditiveBaseline(
  previous: BaselineBundle,
  recreated: BaselineBundle,
): {
  addedKinds: BaselineKind[];
  addedMembers: number;
} {
  const addedKinds: BaselineKind[] = [];
  let addedMembers = 0;

  for (const kind of Object.keys(previous.manifests) as BaselineKind[]) {
    if (!BASELINE_KINDS.includes(kind)) {
      throw new Error(`Additive recreation removed baseline kind ${kind}`);
    }
  }

  for (const kind of BASELINE_KINDS) {
    const before = previous.manifests[kind];
    const after = recreated.manifests[kind];
    if (!after) {
      throw new Error(`Additive recreation removed baseline kind ${kind}`);
    }
    if (!before) {
      addedKinds.push(kind);
      addedMembers += after.members.length;
      continue;
    }

    const afterById = new Map(
      after.members.map((member) => [member.id, member]),
    );
    for (const member of before.members) {
      const recreatedMember = afterById.get(member.id);
      if (!recreatedMember) {
        throw new Error(
          `Additive recreation removed pre-existing member ${kind}:${member.id}`,
        );
      }
      if (recreatedMember.hash !== member.hash) {
        throw new Error(
          `Additive recreation changed pre-existing member ${kind}:${member.id}`,
        );
      }
    }
    addedMembers += after.members.length - before.members.length;
  }

  return { addedKinds, addedMembers };
}

export function validateValueStateSeparation(
  records: readonly ValueStateRecord[],
): BaselineFailure[] {
  const failures: BaselineFailure[] = [];
  const expected = {
    'not-disclosed': 'not disclosed',
    'not-applicable': 'n/a',
  } as const;
  for (const record of records) {
    if (
      record.state !== 'published' &&
      record.rendered !== expected[record.state]
    ) {
      failures.push({
        assertionId: 'VAL-B2-BASE-013',
        memberId: record.id,
        expected: expected[record.state],
        actual: record.rendered,
        reason: 'invalid-value-state-rendering',
      });
    }
  }
  for (const state of ['not-disclosed', 'not-applicable'] as const) {
    const population = records.filter((record) => record.state === state);
    if (population.length === 0) {
      failures.push({
        assertionId: 'VAL-B2-BASE-013',
        expected: `non-empty ${state} population`,
        actual: 0,
        reason: 'empty-value-state-population',
      });
    }
  }
  const byState = new Map(
    records.map((record) => [record.state, record.rendered]),
  );
  const undisclosed = byState.get('not-disclosed');
  const notApplicable = byState.get('not-applicable');
  if (undisclosed !== undefined && undisclosed === notApplicable) {
    failures.push({
      assertionId: 'VAL-B2-BASE-013',
      expected: 'distinct renderings for not-disclosed and not-applicable',
      actual: undisclosed,
      reason: 'collapsed-value-states',
    });
  }
  return failures;
}
