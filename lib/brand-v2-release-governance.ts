import { validateEnforcementCorpus, type EnforcementMap, type EvidenceResult, type EnforcementFailure } from './brand-v2-enforcement.ts';

export const RELEASE_GOVERNANCE_ASSERTIONS = ['VAL-B2-GOV-001', 'VAL-B2-GOV-002', 'VAL-B2-GOV-003'] as const;
type Corpus = Parameters<typeof validateEnforcementCorpus>[0];

/** Governance proves the enforcement structure, not the product outcome.
 * Pending product rows are allowed only while checking structure here; the
 * separate --check-release call still rejects every pending product row. */
export function governanceProof(input: Corpus) {
  const scope = { ...input, allowPendingResults: true };
  const failures = validateEnforcementCorpus(scope);
  if (failures.length) throw new Error(`governance: invalid active enforcement corpus: ${JSON.stringify(failures.slice(0, 8))}`);
  if (!input.assertionIds.length || !input.map.rows.length || !input.results.length) throw new Error('governance: empty enforcement population');
  const row = input.map.rows[0];
  const population = input.populationSources[row.canonicalPopulationSource];
  if (!population?.length) throw new Error('governance: empty first population');
  const mutation = (name: string, change: (copy: Corpus) => void, reason: EnforcementFailure['reason']) => {
    const copy = structuredClone(scope);
    change(copy);
    const refused = validateEnforcementCorpus(copy).filter((failure) => failure.reason === reason);
    if (!refused.length) throw new Error(`governance accepted planted ${name}`);
    return { name, requiredFailure: reason, actualFailures: refused.length };
  };
  const before = JSON.stringify(input);
  const mutations = [
    mutation('omitted assertion row', (copy) => { copy.map.rows = copy.map.rows.slice(1); }, 'missing-assertion-row'),
    mutation('nonexistent test target', (copy) => {
      copy.map.rows[0].enforcementTargets.push({ kind: 'test', file: 'tests/nonexistent-release-proof.ts', title: 'does not exist', mechanism: 'planted target omission' });
      copy.testTargetInventory = { ...copy.testTargetInventory, 'tests/nonexistent-release-proof.ts': [] };
    }, 'nonexistent-test-target'),
    mutation('omitted tagged result', (copy) => { copy.results = copy.results.filter(({ resultId }) => resultId !== row.producedResult.resultIds[0]); }, 'missing-produced-result'),
    mutation('omitted mandatory evidence target', (copy) => { copy.map.rows[0].enforcementTargets = copy.map.rows[0].enforcementTargets.filter((target) => target.kind !== 'evidence-row'); }, 'missing-evidence-target'),
    mutation('omitted population member', (copy) => { copy.populationSources[row.canonicalPopulationSource] = population.slice(1); }, population.length === 1 ? 'empty-applicable-population' : 'population-size-mismatch'),
    mutation('empty entire applicable population', (copy) => { copy.populationSources[row.canonicalPopulationSource] = []; }, 'empty-applicable-population'),
    mutation('missing canonical registry source', (copy) => { delete copy.populationSources[row.canonicalPopulationSource]; }, 'missing-population-source'),
    mutation('untagged produced result', (copy) => { copy.map.rows[0].producedResult.resultIds = ['result:absent-proof']; }, 'missing-produced-result'),
  ];
  if (JSON.stringify(input) !== before) throw new Error('governance mutation changed the original corpus');
  // Prove that structure-only validation cannot accidentally become the
  // release policy. At least one deliberately pending row must be refused.
  const pending = structuredClone(scope);
  const selected = pending.results.find(({ status }) => status !== 'not-applicable');
  if (!selected) throw new Error('governance: no applicable result for release-policy mutation');
  selected.status = 'passed';
  const namesSelectedPending = (failure: EnforcementFailure) => failure.reason === 'pending-result-blocks-release' &&
    failure.assertionId === selected.assertionId && failure.memberId === selected.populationMemberId;
  if (validateEnforcementCorpus({ ...pending, allowPendingResults: false }).some(namesSelectedPending)) throw new Error('governance: passed control falsely reported as pending');
  selected.status = 'pending';
  const releaseFailures = validateEnforcementCorpus({ ...pending, allowPendingResults: false });
  if (!releaseFailures.some(namesSelectedPending)) throw new Error('governance: release accepted the planted pending result');
  selected.status='failed';
  if(!validateEnforcementCorpus({...pending,allowPendingResults:false}).some((failure)=>failure.reason==='failed-result-blocks-release'&&failure.assertionId===selected.assertionId&&failure.memberId===selected.populationMemberId))throw new Error('governance: release accepted the planted failed result');
  return { assertionRows: input.map.rows.length, taggedResults: input.results.length,
    canonicalPopulationSources: Object.keys(input.populationSources).sort(),
    mutations, pendingReleaseMutationRejected: true,failedReleaseMutationRejected:true };
}

export function closeGovernanceEvidence(input: Corpus): { map: EnforcementMap; results: EvidenceResult[] } {
  const proof = governanceProof(input);
  const governance = new Set<string>(RELEASE_GOVERNANCE_ASSERTIONS);
  const map: EnforcementMap = structuredClone(input.map);
  for (const row of map.rows.filter(({ assertionId }) => governance.has(assertionId))) {
    const members = input.populationSources[row.canonicalPopulationSource];
    if (!members?.length || members.length !== input.assertionIds.length || input.assertionIds.some((id) => !members.includes(id))) throw new Error(`${row.assertionId}: governance population must equal every current assertion`);
    row.producedResult.resultIds = members.map((member) => `result:${row.assertionId}:${member}`);
    row.enforcementTargets = [
      ...row.producedResult.resultIds.map((evidenceRowId) => ({ kind: 'evidence-row' as const, evidenceRowId, mechanism: 'Current per-assertion map structure, real target inventory and planted omission failures.' })),
      ...row.enforcementTargets.filter(({ kind }) => kind === 'test'),
    ];
  }
  const results: EvidenceResult[] = input.results.filter(({ assertionId }) => !governance.has(assertionId)).map((row) => structuredClone(row));
  for (const row of map.rows.filter(({ assertionId }) => governance.has(assertionId))) {
    for (const member of input.populationSources[row.canonicalPopulationSource]) {
      const target = map.rows.find(({ assertionId }) => assertionId === member);
      if (!target) throw new Error(`${row.assertionId}: unmapped assertion ${member}`);
      results.push({
        resultId: `result:${row.assertionId}:${member}`, assertionId: row.assertionId,
        populationMemberId: member, coveredPopulationMemberIds: [member], coverageKind: 'per-member',
        expected: row.machinePredicate.expected,
        actual: `${member} has a valid nonempty canonical population, existing named targets, tagged results, and omission-proven release enforcement`,
        selectorOrRegistryId: row.canonicalPopulationSource, exceptionVerdict: 'none', status: 'passed',
        payload: { kind: 'source-build', sourcePath: 'contract/brand-v2-enforcement-map.json', predicate: row.machinePredicate.statement,
          observed: { member, canonicalPopulationSource: target.canonicalPopulationSource,
            memberCount: input.populationSources[target.canonicalPopulationSource]?.length ?? 0,
            producedResultIds: target.producedResult.resultIds,
            testTargets: target.enforcementTargets.filter(({ kind }) => kind === 'test'), proof },
          tool: 'lib/brand-v2-release-governance.ts#governanceProof' },
      });
    }
  }
  const failures = validateEnforcementCorpus({ ...input, map, results, allowPendingResults: true });
  if (failures.length) throw new Error(`governance closure is inconsistent: ${JSON.stringify(failures.slice(0, 8))}`);
  return { map, results };
}
