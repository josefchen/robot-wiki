import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractBrandV2Assertions, type EvidenceResult, type EnforcementMap } from '@/lib/brand-v2-enforcement';
import { compositeDependencyReading, releaseCompositePopulations, releaseToolingReading } from '@/lib/brand-v2-release-composites';

function fixture(){
  const results:EvidenceResult[]=['one','two'].map((member)=>({resultId:`result:owner:${member}`,assertionId:'owner',populationMemberId:member,coveredPopulationMemberIds:[member],coverageKind:'per-member',expected:'required',actual:'measured',selectorOrRegistryId:'population',exceptionVerdict:'none',status:'passed',payload:{kind:'source-build',sourcePath:'actual.json',predicate:'required',observed:{value:member}}}));
  const map:EnforcementMap={schemaVersion:1,rows:[{assertionId:'owner',canonicalPopulationSource:'population',enforcementMode:'automated-machine',enforcementTargets:results.map(({resultId})=>({kind:'evidence-row',evidenceRowId:resultId,mechanism:'real result'})),producedResult:{resultIds:results.map(({resultId})=>resultId)},machinePredicate:{statement:'required',expected:'required',actualSource:'results.json',populationSize:2,omissionProof:{testFile:'test.ts',testTitle:'test',failureReason:'missing-population-source'}}}]};
  return {map,results,populationSources:{population:['one','two']}};
}
describe('release composite clause joins',()=>{
  it('binds every declared clause owner to a current contract assertion',()=>{
    const ids=extractBrandV2Assertions(readFileSync('contract/design-integrity.md','utf8')).map(({id})=>id);
    const populations=releaseCompositePopulations(ids);
    expect(Object.keys(populations)).toHaveLength(9);
    expect(()=>releaseCompositePopulations(ids.filter((id)=>id!=='VAL-B2-VIZ-013'))).toThrow('unknown clause owner');
    expect(releaseToolingReading(process.cwd()).dependencies).toHaveLength(5);
  });
  it('joins all independently expected members and changes when their actual measurements change',()=>{
    const corpus=fixture(),before=compositeDependencyReading(corpus,'owner');
    expect(before.populationCount).toBe(2);
    const row=corpus.results[0];if(row.status==='passed'&&row.payload.kind==='source-build')row.payload.observed={value:'changed actual measurement'};
    expect(compositeDependencyReading(corpus,'owner').resultsSha256).not.toBe(before.resultsSha256);
  });
  it.each(['missing owner','missing result','omitted member','duplicate member','pending','failed','all inapplicable'])(
    'refuses %s rather than granting a composite pass',mutation=>{
      const corpus=fixture();
      if(mutation==='missing owner')corpus.map.rows=[];
      if(mutation==='missing result')corpus.results.pop();
      if(mutation==='omitted member')corpus.populationSources.population.pop();
      if(mutation==='duplicate member')corpus.results[1].coveredPopulationMemberIds=['one'];
      if(mutation==='pending'||mutation==='failed')corpus.results[0].status=mutation;
      if(mutation==='all inapplicable')corpus.results=corpus.results.map((row)=>{const changed={...row,status:'not-applicable',notApplicableReason:{code:'unsupported-state',registryId:row.populationMemberId,detail:'no applicable observation'}} as Record<string,unknown>;delete changed.payload;return changed as EvidenceResult;});
      expect(()=>compositeDependencyReading(corpus,'owner')).toThrow();
    },
  );
});
