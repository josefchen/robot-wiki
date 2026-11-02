import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256, stableJson,
  type ApprovedDelta, type BaselineBundle, type BaselineKind, type JsonValue,
} from './brand-v2-baseline.ts';

export const RELEASE_BASELINE_ASSERTIONS: Readonly<Record<string, readonly BaselineKind[]>> = {
  'VAL-B2-BASE-001': ['routes'],
  'VAL-B2-BASE-003': ['market-playground'],
  'VAL-B2-BASE-004': ['market-playground'],
  'VAL-B2-BASE-005': ['value-states'],
  'VAL-B2-BASE-006': ['accessible-names', 'navigation', 'interactive-sources-mounts', 'behavioral-defaults'],
  'VAL-B2-BASE-009': BASELINE_KINDS,
  'VAL-B2-BASE-010': BASELINE_KINDS,
  'VAL-B2-BASE-011': BASELINE_KINDS,
  'VAL-B2-BASE-012': ['prose', 'accessible-names'],
  'VAL-B2-BASE-013': ['value-states'],
};
export const RELEASE_BASELINE_SOURCE_PREFIX = 'evidence/brand-v2/baseline/baseline.json#release:';

export function releaseBaselinePopulation(
  assertion: string,
  baseline: BaselineBundle,
  current: BaselineBundle,
): string[] {
  const kinds = RELEASE_BASELINE_ASSERTIONS[assertion];
  if (!kinds) throw new Error(`No release baseline requirement for ${assertion}`);
  return kinds.flatMap((kind) => [...new Set([
    ...baseline.manifests[kind].members.map(({ id }) => id),
    ...current.manifests[kind].members.map(({ id }) => id),
  ])].sort().map((id) => `${kind}::${id}`));
}

/** Mutation proof runs in memory over every manifest kind, without changing
 * a tracked file or regenerating the immutable baseline. Its expected side
 * is the current bundle; omitting any real member must fail independently
 * of the historical approved-delta chain. */
export function releaseBaselineMutationProof(current: BaselineBundle): Array<{ kind: BaselineKind; omitted: string; failure: string }> {
  const original = stableJson(current as unknown as JsonValue);
  const results = BASELINE_KINDS.map((kind) => {
    const members = current.manifests[kind].members;
    if (!members.length) throw new Error(`baseline mutation: ${kind} is empty`);
    const changed = structuredClone(current);
    const kept = members.slice(1).map(({ id, value }) => {
      if (value === undefined) throw new Error(`baseline mutation: ${kind}/${id} has no current value`);
      return { id, value };
    });
    changed.manifests[kind] = kept.length ? buildManifest(kind, kept) : { schemaVersion: 1, kind, memberCount: 0, members: [], rootHash: sha256('[]') };
    const comparison = compareBaseline(current, changed, []);
    const failure = comparison.failures.find((row) => row.manifest === kind && row.memberId === members[0].id && row.reason === 'missing-member');
    if (!failure) throw new Error(`baseline mutation accepted omitted ${kind}/${members[0].id}`);
    return { kind, omitted: members[0].id, failure: failure.reason };
  });
  if (stableJson(current as unknown as JsonValue) !== original) throw new Error('baseline mutation changed its source bundle');
  return results;
}

export function releaseBaselineSourceProblems(baseline: BaselineBundle): string[] {
  const problems: string[] = [];
  if (!/^[a-f0-9]{40}$/.test(baseline.source.commit) || !/^[a-f0-9]{40}$/.test(baseline.source.tree)) problems.push('baseline has no valid original commit/tree identity');
  for (const [name, version] of Object.entries(baseline.tools)) if (!version) problems.push(`baseline lacks pinned tool ${name}`);
  for (const kind of BASELINE_KINDS) {
    const manifest = baseline.manifests[kind];
    if (!manifest || !manifest.members.length || manifest.members.length !== manifest.memberCount) {
      problems.push(`baseline manifest ${kind} has missing or inconsistent members`); continue;
    }
    const inputs = manifest.members.map(({ id, hash }) => ({ id, hash }));
    const root = sha256(stableJson(inputs));
    if (manifest.rootHash !== root || baseline.manifestRoots[kind] !== root) problems.push(`baseline manifest ${kind} root hash differs`);
  }
  if (baseline.rootHash !== sha256(stableJson({ source: baseline.source, tools: baseline.tools, manifestRoots: baseline.manifestRoots }))) problems.push('baseline bundle root hash differs');
  return problems;
}

export function releaseBaselineReading(input: {
  assertion: string; member: string; baseline: BaselineBundle; current: BaselineBundle;
  deltas: readonly ApprovedDelta[];
  valueStateFailures: readonly { manifest?: string; memberId?: string; reason: string }[];
  mutationProof?: ReturnType<typeof releaseBaselineMutationProof>;
  comparison?: ReturnType<typeof compareBaseline>;
  sourceProblems?: readonly string[];
}) {
  const { assertion, member, baseline, current, deltas } = input;
  const [kindText, ...idParts] = member.split('::');
  const kind = kindText as BaselineKind;
  const id = idParts.join('::');
  if (!RELEASE_BASELINE_ASSERTIONS[assertion]?.includes(kind) || !releaseBaselinePopulation(assertion, baseline, current).includes(member)) throw new Error(`${assertion}: unknown population member ${member}`);
  const comparison = input.comparison ?? compareBaseline(baseline, current, deltas);
  const failures = comparison.failures.filter((row) => row.manifest === kind && row.memberId === id);
  failures.push(...input.valueStateFailures.filter((row) => row.manifest === kind && (!row.memberId || row.memberId === id)) as typeof failures);
  const deltaFailures = comparison.failures.filter(({ reason }) => reason === 'invalid-approved-delta');
  if (deltaFailures.length) throw new Error(`${assertion}: invalid approved-delta ledger: ${JSON.stringify(deltaFailures)}`);
  if (assertion === 'VAL-B2-BASE-009') {
    const problems = input.sourceProblems ?? releaseBaselineSourceProblems(baseline);
    if (problems.length) throw new Error(problems.join('; '));
  }
  if (assertion === 'VAL-B2-BASE-011' && !input.mutationProof?.some((row) => row.kind === kind && row.failure === 'missing-member')) throw new Error(`${assertion}: missing mutation proof for ${kind}`);
  if (failures.length) throw new Error(`${assertion}: ${member}: ${failures.map(({ reason }) => reason).join(', ')}`);
  const previous = baseline.manifests[kind].members.find((row) => row.id === id);
  const observed = current.manifests[kind].members.find((row) => row.id === id);
  return {
    member, kind, id, baselineHash: previous?.hash ?? null, currentHash: observed?.hash ?? null,
    baselineCommit: baseline.source.commit, baselineTree: baseline.source.tree,
    approvedEdges: deltas.filter((delta) => delta.manifest === kind && delta.memberId === id).map(({ id: deltaId, oldHash, newHash, ownerApproval, reason }) => ({ id: deltaId, oldHash, newHash, ownerApproval, reason })),
    comparisonFailures: failures.length,
    ...(assertion === 'VAL-B2-BASE-011' ? { mutation: input.mutationProof!.find((row) => row.kind === kind) } : {}),
    ...(assertion === 'VAL-B2-BASE-009' ? { tools: baseline.tools, manifestRootHash: baseline.manifests[kind].rootHash } : {}),
  };
}
