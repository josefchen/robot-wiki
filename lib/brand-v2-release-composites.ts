import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EvidenceResult, EnforcementMap } from './brand-v2-enforcement.ts';
import { RELEASE_MACHINE_PATH, RELEASE_MACHINE_SCRIPTS, readReleaseMachineEvidence, type ReleaseMachineEvidence } from './brand-v2-release-machine.ts';
import { RELEASE_TEST_SCOPES, RELEASE_TEST_DIRECTORY, readReleaseTestRun, type ReleaseTestScope } from './brand-v2-release-test-run.ts';
import { releaseArtifactHash } from './brand-v2-release-evidence.ts';

const ids=(family:string,numbers:number[])=>numbers.map((n)=>`VAL-B2-${family}-${String(n).padStart(3,'0')}`);
const range=(start:number,end:number)=>Array.from({length:end-start+1},(_,i)=>i+start);
/** Exact clause owners. A composite re-reads every result of each owner;
 * registering the dependency does not confer a pass. No dependency may be
 * absent, pending, failed, wholly inapplicable or have a narrowed population. */
export const RELEASE_COMPOSITE_DEPENDENCIES:Readonly<Record<string,readonly string[]>>={
  'VAL-B2-CONT-001':[
    ...ids('ID',range(1,7)),...ids('TYPE',range(1,18)),...ids('COL',range(1,10)),...ids('GRID',range(1,10)),...ids('SURF',range(1,11)),
    'VAL-B2-COMP-001','VAL-B2-SHELL-006','VAL-B2-SHELL-008','VAL-B2-DISC-003','VAL-B2-MAP-003','VAL-B2-PLAY-001','VAL-B2-OG-003','VAL-B2-OG-004','VAL-B2-OG-007',
  ],
  'VAL-B2-CONT-002':[...ids('RES',range(1,10)),'VAL-B2-ID-001','VAL-B2-ID-002','VAL-B2-ID-003','VAL-B2-OG-008'],
  'VAL-B2-CONT-003':['VAL-B2-SURF-006','VAL-B2-SURF-011','VAL-B2-PLAY-001','VAL-B2-OG-007'],
  'VAL-B2-CONT-004':[...ids('COL',range(4,7)),'VAL-B2-COMP-001','VAL-B2-COMP-002','VAL-B2-COMP-007','VAL-B2-A11Y-002','VAL-B2-VIZ-003','VAL-B2-MAP-003','VAL-B2-MAP-004','VAL-B2-PLAY-003','VAL-B2-PLAY-004'],
  'VAL-B2-CONT-005':ids('GRID',range(1,9)),
  'VAL-B2-CONT-006':[...ids('BASE',range(1,8)),...ids('A11Y',range(1,15)),'VAL-B2-ART-009','VAL-B2-ART-010','VAL-B2-COMP-009','VAL-B2-COMP-010','VAL-B2-MAP-001','VAL-B2-PLAY-002','VAL-B2-VIZ-013','VAL-B2-EVID-009'],
  'VAL-B2-A11Y-003':['VAL-B2-SHELL-003','VAL-B2-SHELL-004','VAL-B2-COMP-005','VAL-B2-COMP-013','VAL-B2-DISC-004','VAL-B2-ART-008','VAL-B2-VIZ-007','VAL-B2-VIZ-016','VAL-B2-MAP-005','VAL-B2-MAP-006','VAL-B2-MAP-011','VAL-B2-PLAY-004','VAL-B2-EVID-009'],
  'VAL-B2-EVID-009':['VAL-B2-VIZ-007','VAL-B2-VIZ-010','VAL-B2-VIZ-011','VAL-B2-VIZ-012','VAL-B2-VIZ-016','VAL-B2-COMP-013','VAL-B2-MAP-011','VAL-B2-EVID-012'],
  'VAL-B2-GOV-004':['VAL-B2-BASE-001','VAL-B2-BASE-004','VAL-B2-GOV-001','VAL-B2-GOV-002','VAL-B2-GOV-003','VAL-B2-EVID-001','VAL-B2-EVID-004','VAL-B2-EVID-010','VAL-B2-EVID-014','VAL-B2-EVID-016'],
};
export const RELEASE_COMPOSITE_SOURCES=Object.fromEntries(Object.keys(RELEASE_COMPOSITE_DEPENDENCIES).map((id)=>[id,`lib/brand-v2-release-composites.ts#${id}`]));
export function releaseCompositePopulations(assertionIds:readonly string[]):Record<string,string[]>{
  return Object.fromEntries(Object.entries(RELEASE_COMPOSITE_DEPENDENCIES).map(([id,dependencies])=>{
    if(!assertionIds.includes(id)||!dependencies.length||new Set(dependencies).size!==dependencies.length)throw new Error(`invalid composite definition ${id}`);
    for(const dependency of dependencies)if(!assertionIds.includes(dependency))throw new Error(`${id}: unknown clause owner ${dependency}`);
    return [RELEASE_COMPOSITE_SOURCES[id],[...dependencies.map((dependency)=>`assertion:${dependency}`),...(id==='VAL-B2-GOV-004'?[...RELEASE_MACHINE_SCRIPTS.map((name)=>`machine:${name}`),...Object.keys(RELEASE_TEST_SCOPES).map((scope)=>`suite:${scope}`),'tooling:direct-versioned']:[])]];
  }));
}

type Corpus={map:EnforcementMap;results:EvidenceResult[];populationSources:Record<string,string[]>};
export function compositeDependencyReading(corpus:Corpus,dependency:string){
  const mapRows=corpus.map.rows.filter(({assertionId})=>assertionId===dependency);
  if(mapRows.length!==1)throw new Error(`missing or duplicate composite clause owner ${dependency}`);
  const row=mapRows[0],expected=corpus.populationSources[row.canonicalPopulationSource];
  if(!expected?.length||new Set(expected).size!==expected.length)throw new Error(`${dependency}: empty or duplicate independent population`);
  const results=corpus.results.filter(({assertionId})=>assertionId===dependency);
  if(!results.length||JSON.stringify(results.map(({resultId})=>resultId).sort())!==JSON.stringify([...row.producedResult.resultIds].sort()))throw new Error(`${dependency}: tagged result population differs`);
  const covered=results.flatMap(({coveredPopulationMemberIds})=>coveredPopulationMemberIds);
  if(JSON.stringify(covered.sort())!==JSON.stringify([...expected].sort()))throw new Error(`${dependency}: composite would omit or duplicate a measured member`);
  if(results.some(({status})=>status!=='passed'&&status!=='not-applicable'))throw new Error(`${dependency}: measured result is pending or failed`);
  if(results.every(({status})=>status==='not-applicable'))throw new Error(`${dependency}: no applicable measured population`);
  return {assertionId:dependency,populationSource:row.canonicalPopulationSource,populationCount:expected.length,
    resultIds:results.map(({resultId})=>resultId),resultsSha256:createHash('sha256').update(JSON.stringify(results)).digest('hex'),
    statuses:results.reduce<Record<string,number>>((counts,{status})=>({...counts,[status]:(counts[status]??0)+1}),{}),
    targets:row.enforcementTargets};
}

export function releaseToolingReading(root:string){
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
  const dependencies=['@playwright/test','@axe-core/playwright','fontkit','typescript6','vitest'].map((name)=>{
    const declared=pkg.dependencies?.[name]??pkg.devDependencies?.[name];
    const resolved=lock.packages?.[`node_modules/${name}`]?.version;
    const exact=typeof declared==='string'?declared.replace(/^npm:[^@]+@/,''):'';
    if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(exact)||resolved!==exact)throw new Error(`release tooling is not direct and exactly versioned: ${name}`);
    return {name,declared,resolved};
  });
  const files=['tests/e2e/static-export-server.ts','tests/e2e/brand-v2-static-fixture.ts','playwright.brand-v2.config.ts','playwright.release.config.ts','lib/png-decode.ts','lib/brand-v2-reference-rubric.ts','evidence/brand-v2/expected-red-v1.json'];
  return {dependencies,files:files.map((path)=>({path,sha256:releaseArtifactHash(root,path)})),ocr:'No OCR claim is used as authoritative release evidence; the checked-in PNG decoder and measured font/render probes are the required readers.'};
}

/** Missing machine evidence leaves GOV004 pending during the bootstrap pass.
 * An existing but failed, altered or stale report is always rejected. The
 * second deterministic generation after the actual machine run closes it. */
export function closeReleaseComposites(corpus:Corpus,root:string):Corpus{
  const results=corpus.results.map((row)=>structuredClone(row));
  const working={...corpus,results};
  let machine:ReleaseMachineEvidence|null=null;
  if(existsSync(join(root,RELEASE_MACHINE_PATH)))machine=readReleaseMachineEvidence(root);
  const done=new Set<string>();
  const close=(assertion:string)=>{
    if(done.has(assertion))return;
    for(const dependency of RELEASE_COMPOSITE_DEPENDENCIES[assertion])if(RELEASE_COMPOSITE_DEPENDENCIES[dependency])close(dependency);
    for(const row of results.filter(({assertionId})=>assertionId===assertion)){
      const member=row.populationMemberId;
      let observed:unknown;let sourcePath='evidence/brand-v2/results.json';
      if(member.startsWith('assertion:'))observed=compositeDependencyReading(working,member.slice('assertion:'.length));
      else if(member.startsWith('machine:')){
        if(!machine){row.status='pending';row.actual='awaiting the complete stamped read-only machine-gate run';continue;}
        sourcePath=RELEASE_MACHINE_PATH;observed=machine.commands.find(({name})=>name===member.slice('machine:'.length));
        if(!observed)throw new Error(`${assertion}: missing actual command ${member}`);
      }else if(member.startsWith('suite:')){
        const scope=member.slice('suite:'.length) as ReleaseTestScope;
        const {run}=readReleaseTestRun(root,scope);sourcePath=`${RELEASE_TEST_DIRECTORY}/${scope}.json`;
        observed={scope,command:run.command,exitCode:run.exitCode,testCount:run.testCount,passedTestCount:run.passedTestCount,inapplicable:run.inapplicable,report:run.report};
      }else if(member==='tooling:direct-versioned'){sourcePath='package-lock.json';observed=releaseToolingReading(root);}
      else throw new Error(`${assertion}: unexpected composite member ${member}`);
      Object.assign(row,{status:'passed',actual:`${member}: complete current measured evidence agrees with the independent population`,
        payload:{kind:'source-build',sourcePath,predicate:row.expected,observed,tool:'lib/brand-v2-release-composites.ts'}});
    }
    done.add(assertion);
  };
  for(const assertion of Object.keys(RELEASE_COMPOSITE_DEPENDENCIES))close(assertion);
  return working;
}
