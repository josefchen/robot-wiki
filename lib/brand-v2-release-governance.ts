import { validateEnforcementCorpus, evidenceResultSchema, type EnforcementMap, type EvidenceResult, type EnforcementFailure } from './brand-v2-enforcement.ts';

export const RELEASE_GOVERNANCE_ASSERTIONS = ['VAL-B2-GOV-001', 'VAL-B2-GOV-002', 'VAL-B2-GOV-003'] as const;
export const RELEASE_SCHEMA_ASSERTIONS = ['VAL-B2-EVID-014','VAL-B2-EVID-016'] as const;
type Corpus = Parameters<typeof validateEnforcementCorpus>[0];

/** Run schema mutants on real current rows of all four payload families.
 * The proof contains no fabricated passing product observations. */
export function resultSchemaMutationProof(results:readonly EvidenceResult[]){
  const kinds=['source-build','browser-state','generated-image','autonomous-reference-comparison'] as const;
  const samples=kinds.map((kind)=>{
    const row=results.find((row)=>row.status==='passed'&&row.payload.kind===kind);
    if(!row)throw new Error(`result schema proof: no current passing ${kind} payload`);
    evidenceResultSchema.parse(row);return row;
  });
  const mutations:Array<{kind:string;name:string;rejected:boolean}>=[];
  const plant=(row:EvidenceResult,name:string,change:(value:Record<string,unknown>)=>void)=>{
    const changed=structuredClone(row) as unknown as Record<string,unknown>;change(changed);
    if(evidenceResultSchema.safeParse(changed).success)throw new Error(`result schema accepted ${name}`);
    mutations.push({kind:row.status==='not-applicable'?'not-applicable':row.payload.kind,name,rejected:true});
  };
  for(const row of samples){
    for(const field of ['resultId','assertionId','populationMemberId','coveredPopulationMemberIds','coverageKind','expected','actual','selectorOrRegistryId','exceptionVerdict','status','payload'])plant(row,`omitted ${field}`,(value)=>{delete value[field];});
    plant(row,'foreign common field',(value)=>{value.unstructuredPass=true;});
    plant(row,'foreign payload field',(value)=>{(value.payload as Record<string,unknown>).looksRight=true;});
    plant(row,'invalid viewport context',(value)=>{value.context={route:'/',viewport:{width:0,height:900}};});
  }
  const required:{[kind:string]:string[]}={
    'source-build':['sourcePath','predicate','observed'],
    'generated-image':['imagePath','width','height','sha256'],
    'autonomous-reference-comparison':['referenceIds','surfaceId','anchors','passed','screenshotPaths','comparisonMode'],
  };
  for(const row of samples){
    const kind=row.status==='not-applicable'?'':row.payload.kind;
    for(const field of required[kind]??[])plant(row,`omitted payload ${field}`,(value)=>{delete (value.payload as Record<string,unknown>)[field];});
    if(kind==='browser-state')plant(row,'browser payload without browser observations',(value)=>{
      for(const field of ['screenshotPath','computed','aria','axe','console','network'])delete (value.payload as Record<string,unknown>)[field];
    });
  }
  const source=samples[0];
  const failed=structuredClone(source);failed.status='failed';evidenceResultSchema.parse(failed);
  for(const field of ['assertionId','populationMemberId','expected','actual','selectorOrRegistryId','exceptionVerdict','payload'])plant(failed,`failed envelope omitted ${field}`,(value)=>{delete value[field];});
  const unavailable={...source,status:'not-applicable',notApplicableReason:{code:'unsupported-state',registryId:source.populationMemberId,detail:'Schema-only unsupported-state fixture'}} as unknown as Record<string,unknown>;
  delete unavailable.payload;evidenceResultSchema.parse(unavailable);
  plant(unavailable as unknown as EvidenceResult,'not-applicable without typed reason',(value)=>{delete value.notApplicableReason;});
  const phases=structuredClone(samples[1]) as unknown as Record<string,unknown>;
  const payload=phases.payload as Record<string,unknown>;
  payload.steps=[{order:1,id:'one',action:'actual step one'},{order:2,id:'two',action:'actual step two'}];
  payload.captures=[{order:1,id:'capture-one',afterStep:'one',kind:'semantic'},{order:2,id:'capture-two',afterStep:'two',kind:'semantic'}];
  evidenceResultSchema.parse(phases);
  plant(phases as unknown as EvidenceResult,'reordered step sequence',(value)=>{((value.payload as Record<string,unknown>).steps as unknown[]).reverse();});
  plant(phases as unknown as EvidenceResult,'capture without executed owning step',(value)=>{((value.payload as Record<string,unknown>).captures as Array<{afterStep:string}>)[0].afterStep='absent';});
  plant(phases as unknown as EvidenceResult,'steps without captures',(value)=>{delete (value.payload as Record<string,unknown>).captures;});
  return {sampleResultIds:samples.map(({resultId})=>resultId),mutations};
}

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
  const schemaIds=RELEASE_SCHEMA_ASSERTIONS.filter((id)=>input.assertionIds.includes(id));
  const schemaProof=schemaIds.length?resultSchemaMutationProof(input.results):null;
  const governance = new Set<string>([...RELEASE_GOVERNANCE_ASSERTIONS,...schemaIds]);
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
        actual: schemaIds.some((id)=>id===row.assertionId)?`${member} uses the common result envelope and a strict schema-specific payload; current payload families reject the required omission/sequence mutants`:`${member} has a valid nonempty canonical population, existing named targets, tagged results, and omission-proven release enforcement`,
        selectorOrRegistryId: row.canonicalPopulationSource, exceptionVerdict: 'none', status: 'passed',
        payload: { kind: 'source-build', sourcePath: 'contract/brand-v2-enforcement-map.json', predicate: row.machinePredicate.statement,
          observed: { member, canonicalPopulationSource: target.canonicalPopulationSource,
            memberCount: input.populationSources[target.canonicalPopulationSource]?.length ?? 0,
            producedResultIds: target.producedResult.resultIds,
            testTargets: target.enforcementTargets.filter(({ kind }) => kind === 'test'), proof,
            ...(schemaIds.some((id)=>id===row.assertionId)?{schemaProof}:{}), },
          tool: 'lib/brand-v2-release-governance.ts#governanceProof' },
      });
    }
  }
  const failures = validateEnforcementCorpus({ ...input, map, results, allowPendingResults: true });
  if (failures.length) throw new Error(`governance closure is inconsistent: ${JSON.stringify(failures.slice(0, 8))}`);
  return { map, results };
}
