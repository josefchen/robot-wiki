import { describe, expect, it } from 'vitest';
import { BASELINE_KINDS, buildManifest, sha256, stableJson, type BaselineBundle } from '@/lib/brand-v2-baseline';
import { releaseBaselineMutationProof, releaseBaselinePopulation, releaseBaselineReading, releaseBaselineSourceProblems } from '@/lib/brand-v2-release-baseline';

function bundle(): BaselineBundle {
  const manifests = Object.fromEntries(BASELINE_KINDS.map((kind) => [kind, buildManifest(kind, [{ id: `${kind}:one`, value: { data: 'original' } }])])) as BaselineBundle['manifests'];
  const manifestRoots = Object.fromEntries(BASELINE_KINDS.map((kind) => [kind, manifests[kind].rootHash])) as BaselineBundle['manifestRoots'];
  const source = { commit: 'a'.repeat(40), tree: 'b'.repeat(40), trackedWorktreeClean: true };
  const tools = { node: '24.18.0', npm: '11', playwright: '1.58', next: '16', typescript: '7', vitest: '4', lockfileSha256: 'c'.repeat(64) };
  return { schemaVersion: 1, source, tools, manifests, manifestRoots, rootHash: sha256(stableJson({ source, tools, manifestRoots })) };
}

describe('release baseline measured readers', () => {
  it('re-derives each manifest root and original bundle identity', () => {
    expect(releaseBaselineSourceProblems(bundle())).toEqual([]);
    const stale = bundle(); stale.manifests.routes.members[0].hash = 'd'.repeat(64);
    expect(releaseBaselineSourceProblems(stale)).toContain('baseline manifest routes root hash differs');
  });
  it('proves an omitted member fails in every manifest, without changing the original', () => {
    const current = bundle(); const original = JSON.stringify(current);
    const result = releaseBaselineMutationProof(current);
    expect(result.map(({ kind }) => kind)).toEqual([...BASELINE_KINDS]);
    expect(result.every(({ failure }) => failure === 'missing-member')).toBe(true);
    expect(JSON.stringify(current)).toBe(original);
  });
  it('joins actual original/current member hashes and rejects unapproved source drift', () => {
    const baseline = bundle(); const current = bundle(); const assertion = 'VAL-B2-BASE-001';
    const member = releaseBaselinePopulation(assertion, baseline, current)[0];
    expect(releaseBaselineReading({ assertion, member, baseline, current, deltas: [], valueStateFailures: [] })).toMatchObject({ comparisonFailures: 0, baselineHash: baseline.manifests.routes.members[0].hash });
    current.manifests.routes = buildManifest('routes', [{ id: 'routes:one', value: { data: 'changed' } }]);
    expect(() => releaseBaselineReading({ assertion, member, baseline, current, deltas: [], valueStateFailures: [] })).toThrow('changed-member');
  });
  it('rejects a population member from a different assertion and an unproven mutation claim', () => {
    const current = bundle();
    expect(() => releaseBaselineReading({ assertion: 'VAL-B2-BASE-001', member: 'prose::prose:one', baseline: current, current, deltas: [], valueStateFailures: [] })).toThrow('unknown population member');
    expect(() => releaseBaselineReading({ assertion: 'VAL-B2-BASE-011', member: 'routes::routes:one', baseline: current, current, deltas: [], valueStateFailures: [] })).toThrow('missing mutation proof');
  });
  it('does not lose collection-time source-value errors during hash comparison', () => {
    const current = bundle();
    expect(() => releaseBaselineReading({ assertion: 'VAL-B2-BASE-005', member: 'value-states::value-states:one', baseline: current, current, deltas: [], valueStateFailures: [{ manifest: 'value-states', memberId: 'value-states:one', reason: 'collapsed-value-states' }] })).toThrow('collapsed-value-states');
  });
});
