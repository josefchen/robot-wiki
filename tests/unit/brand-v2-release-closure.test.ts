import { describe, expect, it } from 'vitest';
import { enforceReleaseDependencies } from '@/lib/brand-v2-release-closure';
import type { EvidenceResult } from '@/lib/brand-v2-enforcement';

function row(assertionId:string,status:'passed'|'pending'='passed'):EvidenceResult{return {
  resultId:`result:${assertionId}:member`,assertionId,populationMemberId:'member',coveredPopulationMemberIds:['member'],coverageKind:'per-member',expected:'required',actual:'measured',selectorOrRegistryId:'registry',exceptionVerdict:'none',status,
  payload:{kind:'source-build',sourcePath:'proof.json',predicate:'required',observed:{measured:true}},
};}
describe('final release composite evidence',()=>{
  it('does not let profile or visual success waive pending interaction or truth evidence',()=>{
    const direct=row('VAL-B2-EVID-007');
    expect(()=>enforceReleaseDependencies([direct])).toThrow('VAL-B2-CONT-006');
    expect(()=>enforceReleaseDependencies([direct,row('VAL-B2-CONT-006','pending'),row('VAL-B2-A11Y-001')])).toThrow('VAL-B2-CONT-006');
    expect(()=>enforceReleaseDependencies([direct,row('VAL-B2-CONT-006'),row('VAL-B2-A11Y-001')])).not.toThrow();
  });
  it('rejects an all-inapplicable dependency rather than treating its empty scope as proof',()=>{
    const absent:EvidenceResult={...row('VAL-B2-CONT-006'),status:'not-applicable',notApplicableReason:{code:'no-applicable-population',populationSource:'registry',detail:'empty'}};
    delete (absent as unknown as Record<string,unknown>).payload;
    expect(()=>enforceReleaseDependencies([row('VAL-B2-EVID-007'),absent,row('VAL-B2-A11Y-001')])).toThrow('no applicable measured population');
  });
});
