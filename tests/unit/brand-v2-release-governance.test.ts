import { describe, expect, it } from 'vitest';
import { closeGovernanceEvidence, governanceProof, resultSchemaMutationProof, RELEASE_GOVERNANCE_ASSERTIONS } from '@/lib/brand-v2-release-governance';
import { validateEnforcementCorpus, type EnforcementMap, type EvidenceResult } from '@/lib/brand-v2-enforcement';
import { BRAND_V2_REFERENCE_RUBRIC } from '@/lib/brand-v2-reference-rubric';

function fixture() {
  const assertionIds = ['VAL-B2-TEST-001', ...RELEASE_GOVERNANCE_ASSERTIONS];
  const populationSources = { 'registry:test': ['one'], 'contract:assertions': assertionIds };
  const testTargetInventory = { 'tests/fixture.test.ts': ['fixture > proves omissions'] };
  const results: EvidenceResult[] = assertionIds.map((id) => ({
    resultId: `result:${id}`, assertionId: id,
    populationMemberId: `population:${id === assertionIds[0] ? 'registry:test' : 'contract:assertions'}`,
    coveredPopulationMemberIds: id === assertionIds[0] ? ['one'] : assertionIds,
    coverageKind: 'population-wide', status: 'pending', expected: 'required outcome', actual: 'unmeasured',
    selectorOrRegistryId: id === assertionIds[0] ? 'registry:test' : 'contract:assertions', exceptionVerdict: 'none',
    payload: { kind: 'source-build', sourcePath: 'fixture', predicate: 'required outcome', observed: 'unmeasured' },
  }));
  const map: EnforcementMap = { schemaVersion: 1, rows: assertionIds.map((id) => ({
    assertionId: id, canonicalPopulationSource: id === assertionIds[0] ? 'registry:test' : 'contract:assertions',
    enforcementTargets: [
      { kind: 'evidence-row', evidenceRowId: `result:${id}`, mechanism: 'mandatory source proof' },
      { kind: 'test', file: 'tests/fixture.test.ts', title: 'fixture > proves omissions', mechanism: 'omission proof' },
    ],
    enforcementMode: 'automated-machine',
    machinePredicate: { statement: 'required outcome', expected: 'required outcome', actualSource: 'fixture', populationSize: id === assertionIds[0] ? 1 : assertionIds.length,
      omissionProof: { testFile: 'tests/fixture.test.ts', testTitle: 'fixture > proves omissions', failureReason: 'missing-assertion-row' } },
    producedResult: { resultIds: [`result:${id}`] },
  })) };
  return { assertionIds, populationSources, map, results, testTargetInventory };
}

describe('release governance measurements', () => {
  it('executes current common-envelope and four-family payload omission and sequence mutants',()=>{
    const base=fixture().results[0];
    const rows:EvidenceResult[]=[
      {...base,status:'passed',payload:{kind:'source-build',sourcePath:'source.ts',predicate:'required',observed:{value:1}}},
      {...base,resultId:'browser',status:'passed',payload:{kind:'browser-state',computed:{font:'Geist'}}},
      {...base,resultId:'image',status:'passed',payload:{kind:'generated-image',imagePath:'image.png',width:1200,height:630,sha256:'a'.repeat(64)}},
      {...base,resultId:'visual',status:'passed',payload:{kind:'autonomous-reference-comparison',rubricVersion:1,comparisonMode:'feature-anchors-only',contractLiteralOverridesApplied:true,
        referenceIds:['library/brand-reference-board.jpeg','library/brand-reference-article.png'],surfaceId:'schema-only-fixture',passed:true,screenshotPaths:['fixture.png'],
        anchors:BRAND_V2_REFERENCE_RUBRIC.anchors.map(({id})=>({id,applicable:true,expected:1,actual:1,predicates:[{id:'schema-fixture-equality',expected:1,actual:1,passed:true}],passed:true}))}},
    ];
    const proof=resultSchemaMutationProof(rows);
    expect(proof.sampleResultIds).toHaveLength(4);
    expect(proof.mutations.length).toBeGreaterThan(75);
    expect(proof.mutations.every(({rejected})=>rejected)).toBe(true);
    expect(()=>resultSchemaMutationProof(rows.slice(0,3))).toThrow('no current passing autonomous-reference-comparison');
  });
  it('executes every omission mutant against the current corpus without changing it', () => {
    const input = fixture(); const before = JSON.stringify(input);
    const proof = governanceProof(input);
    expect(proof.mutations).toHaveLength(8);
    expect(proof.mutations.every(({ actualFailures }) => actualFailures > 0)).toBe(true);
    expect(proof.pendingReleaseMutationRejected).toBe(true);
    expect(proof.failedReleaseMutationRejected).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('emits one measured governance result for each real assertion and preserves product pending status', () => {
    const input = fixture();
    const closed = closeGovernanceEvidence(input);
    expect(closed.results.filter(({ assertionId }) => assertionId.startsWith('VAL-B2-GOV')).length).toBe(RELEASE_GOVERNANCE_ASSERTIONS.length * input.assertionIds.length);
    expect(closed.results.find(({ assertionId }) => assertionId === 'VAL-B2-TEST-001')?.status).toBe('pending');
    expect(validateEnforcementCorpus({ ...input, ...closed, allowPendingResults: true })).toEqual([]);
    expect(validateEnforcementCorpus({ ...input, ...closed, allowPendingResults: false }).some(({ reason }) => reason === 'pending-result-blocks-release')).toBe(true);
  });
  it('refuses a real missing target before attempting closure', () => {
    const input = fixture(); input.testTargetInventory['tests/fixture.test.ts'] = [];
    expect(() => closeGovernanceEvidence(input)).toThrow('invalid active enforcement corpus');
  });
  it('refuses narrowing governance to a subset of the live contract', () => {
    const input = fixture(); input.populationSources['contract:assertions'] = input.assertionIds.slice(1);
    expect(() => closeGovernanceEvidence(input)).toThrow();
  });
  it('rejects a current failed product result even when its map and evidence are structurally complete',()=>{
    const input=fixture();input.results[0].status='failed';
    expect(validateEnforcementCorpus({...input,allowPendingResults:true}).filter(({reason})=>reason==='failed-result-blocks-release')).toEqual([]);
    expect(validateEnforcementCorpus({...input,allowPendingResults:false}).some(({reason,assertionId})=>reason==='failed-result-blocks-release'&&assertionId==='VAL-B2-TEST-001')).toBe(true);
  });
});
