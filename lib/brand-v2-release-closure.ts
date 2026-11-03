import { iterateReleaseStateRows } from './brand-v2-release-state-store.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_PROFILES, releaseProfileProblems } from './brand-v2-release-evidence.ts';
import { readReleaseStateIndex, RELEASE_STATE_INDEX_PATH } from './brand-v2-release-index.ts';
import { deepReleaseSchema } from './brand-v2-release-deep.ts';
import type { EvidenceResult, EnforcementMap } from './brand-v2-enforcement.ts';
import { readReleaseTestRun, RELEASE_TEST_SCOPES, RELEASE_TEST_DIRECTORY, type ReleaseTestScope } from './brand-v2-release-test-run.ts';
import { BRAND_V2_DEEP_ROWS } from './brand-v2-runners.ts';

export const RELEASE_PROFILE_SOURCE = `${RELEASE_STATE_INDEX_PATH}#declared-states`;
export const RELEASE_DEEP_SOURCE = `${RELEASE_STATE_INDEX_PATH}#deep`;
export const RELEASE_SUITE_SOURCE = `${RELEASE_TEST_DIRECTORY}#named-flow-suite-cases`;
const PROFILE_IDS = ['VAL-B2-A11Y-001','VAL-B2-A11Y-004','VAL-B2-A11Y-005','VAL-B2-A11Y-006','VAL-B2-A11Y-007','VAL-B2-A11Y-008','VAL-B2-A11Y-009','VAL-B2-A11Y-010','VAL-B2-A11Y-011','VAL-B2-A11Y-013','VAL-B2-A11Y-014','VAL-B2-A11Y-015','VAL-B2-EVID-008','VAL-B2-EVID-011','VAL-B2-EVID-012'];
const DEEP_IDS=['VAL-B2-EVID-001','VAL-B2-EVID-002','VAL-B2-EVID-003','VAL-B2-EVID-004','VAL-B2-EVID-005','VAL-B2-EVID-006','VAL-B2-EVID-007','VAL-B2-EVID-010','VAL-B2-EVID-015'];
export const RELEASE_CLOSURE_POPULATION_SOURCES:Readonly<Record<string,string>>={
  ...Object.fromEntries(PROFILE_IDS.map((id)=>[id,RELEASE_PROFILE_SOURCE])),
  ...Object.fromEntries(DEEP_IDS.map((id)=>[id,RELEASE_DEEP_SOURCE])),
  'VAL-B2-EVID-013':RELEASE_SUITE_SOURCE,
};
type ReleasePayload=Extract<EvidenceResult,{payload:unknown}>['payload'];
export type ReleaseClosureVerdict={id:string;failures:string[];observed:unknown;evidencePaths:string[];mode:EnforcementMap['rows'][number]['enforcementMode'];payload?:ReleasePayload;context?:EvidenceResult['context']};

/** Composite clauses list their independently measured dependencies. The
 * generator applies these after all per-member rows exist, so a green
 * visual/profile row cannot conceal pending truth or interaction proof. */
export const RELEASE_CLOSURE_DEPENDENCIES:Readonly<Record<string,readonly string[]>>={
  'VAL-B2-A11Y-004':['VAL-B2-VIZ-002','VAL-B2-MAP-003','VAL-B2-PLAY-003','VAL-B2-COL-007'],
  'VAL-B2-A11Y-005':['VAL-B2-VIZ-009','VAL-B2-PLAY-007','VAL-B2-PLAY-011'],
  'VAL-B2-A11Y-006':['VAL-B2-A11Y-002','VAL-B2-A11Y-004'],
  'VAL-B2-A11Y-009':['VAL-B2-GRID-004','VAL-B2-GRID-006'],
  'VAL-B2-A11Y-010':['VAL-B2-VIZ-001','VAL-B2-VIZ-007','VAL-B2-MAP-002','VAL-B2-PLAY-004','VAL-B2-PLAY-006'],
  'VAL-B2-A11Y-011':['VAL-B2-SHELL-004','VAL-B2-VIZ-016','VAL-B2-DISC-004','VAL-B2-MAP-006'],
  'VAL-B2-A11Y-012':['VAL-B2-DISC-002','VAL-B2-DISC-004','VAL-B2-MAP-011','VAL-B2-MAP-005','VAL-B2-MAP-006','VAL-B2-VIZ-008','VAL-B2-VIZ-013','VAL-B2-VIZ-016','VAL-B2-PLAY-004','VAL-B2-PLAY-006','VAL-B2-COMP-005'],
  'VAL-B2-A11Y-013':['VAL-B2-VIZ-001','VAL-B2-VIZ-007','VAL-B2-MAP-002','VAL-B2-VIZ-015','VAL-B2-ART-008'],
  'VAL-B2-A11Y-015':['VAL-B2-A11Y-003'],
  'VAL-B2-EVID-002':['VAL-B2-OG-001','VAL-B2-OG-002'],
  'VAL-B2-EVID-007':['VAL-B2-CONT-006','VAL-B2-A11Y-001'],
  'VAL-B2-EVID-008':['VAL-B2-CONT-007','VAL-B2-CONT-009','VAL-B2-A11Y-003'],
  'VAL-B2-EVID-013':['VAL-B2-MAP-011','VAL-B2-PLAY-012','VAL-B2-PLAY-013','VAL-B2-DISC-004'],
};

export function enforceReleaseDependencies(results:readonly EvidenceResult[]):void {
  for(const [assertion,dependencies]of Object.entries(RELEASE_CLOSURE_DEPENDENCIES)){
    if(!results.some((row)=>row.assertionId===assertion&&row.status==='passed'))continue;
    for(const dependency of dependencies){
      const rows=results.filter((row)=>row.assertionId===dependency);
      if(!rows.length||rows.some(({status})=>status!=='passed'&&status!=='not-applicable'))throw new Error(`${assertion}: independently measured dependency ${dependency} is missing or unresolved`);
      if(rows.every(({status})=>status==='not-applicable'))throw new Error(`${assertion}: dependency ${dependency} has no applicable measured population`);
    }
  }
}

export function collectReleaseClosure(root:string){
  const index=readReleaseStateIndex(root);
  const stateIds:string[]=[];
  const stateRows:Array<{id:string;route:string;elements:number;colourValues:number;findings:string[];evidencePaths:string[]}>=[];
  const stateVerdicts:ReleaseClosureVerdict[]=[];
  for(const {state,path,sha256}of iterateReleaseStateRows(root,index)){
    stateIds.push(state.id);
    for(const profile of state.profiles)stateRows.push({id:`${state.id}|profile:${profile.id}`,route:state.route,...profile.residue,evidencePaths:[RELEASE_STATE_INDEX_PATH,path]});
    stateVerdicts.push({id:state.id,
      failures:state.profiles.flatMap((profile)=>releaseProfileProblems(profile,RELEASE_PROFILES.find(({id})=>id===profile.id)!,state.route)),
      context:{route:state.route,stateId:state.id},
      observed:{route:state.route,state:state.state,caseSha256:sha256,profileCount:state.profiles.length,
        measured:{textRuns:state.profiles.reduce((sum,p)=>sum+p.accessibility.counts.textRuns,0),tables:state.profiles.reduce((sum,p)=>sum+p.interaction.tables.length,0),tableCells:state.profiles.reduce((sum,p)=>sum+p.interaction.tables.reduce((count,t)=>count+t.cells.length,0),0),controls:state.profiles.reduce((sum,p)=>sum+p.interaction.targets.count,0)}},
      payload:{kind:'browser-state',computed:{route:state.route,state:state.state,profileIds:state.profiles.map(({id})=>id),evidence:path,sha256},
        steps:state.steps.map((action,i)=>({id:`${state.id}:step:${i+1}`,order:i+1,action})),
        captures:state.profiles.map(({id},i)=>({id:`${state.id}:capture:${id}`,order:i+1,afterStep:`${state.id}:step:${state.steps.length}`,kind:'semantic' as const}))},
      evidencePaths:[RELEASE_STATE_INDEX_PATH,path],mode:'browser-state'});
  }
  const expectedActivatedStateIds=index.groups.flatMap(({stateIds})=>stateIds.flatMap((id)=>RELEASE_PROFILES.map((profile)=>`${id}|profile:${profile.id}`)));
  if(!stateRows.length||new Set(stateRows.map(({id})=>id)).size!==stateRows.length||JSON.stringify(stateRows.map(({id})=>id).sort())!==JSON.stringify([...expectedActivatedStateIds].sort()))throw new Error('release closure profile population differs from independent state plan');
  const deep=index.deep.map((entry)=>({entry,artifact:deepReleaseSchema.parse(JSON.parse(readFileSync(join(root,entry.path),'utf8')))}));
  const testRuns=Object.keys(RELEASE_TEST_SCOPES).map((scope)=>({scope,...readReleaseTestRun(root,scope as ReleaseTestScope)}));
  const tests=testRuns.flatMap(({scope,cases})=>cases.map((row)=>({id:`${scope}:${row.id}`,scope,row})));
  const flowFiles=['brand-v2-route-flows.spec.ts','brand-v2-article-interactions.spec.ts','brand-v2-market-map-states.spec.ts','brand-v2-playground-states.spec.ts'];
  const flowTests=tests.filter(({row})=>flowFiles.includes(row.file.split('/').at(-1)!));
  if(flowFiles.some((file)=>!flowTests.some(({row})=>row.file.endsWith(file))))throw new Error('a mandatory named flow suite has no actual executed tests');
  const populations={
    [RELEASE_PROFILE_SOURCE]:stateIds,
    [RELEASE_DEEP_SOURCE]:deep.map(({entry})=>entry.id),
    [RELEASE_SUITE_SOURCE]:flowTests.map(({id})=>id),
  };
  const verdicts:Record<string,ReleaseClosureVerdict[]>={};
  for(const assertion of PROFILE_IDS)verdicts[assertion]=stateVerdicts;
  for(const assertion of DEEP_IDS)verdicts[assertion]=deep.map(({entry,artifact})=>({id:entry.id,failures:[],
    context:{route:artifact.renderedRoute,stateId:artifact.state,viewport:artifact.viewport},
    observed:{declaredRoute:artifact.declaredRoute,renderedRoute:artifact.renderedRoute,viewport:artifact.viewport,state:artifact.state,steps:artifact.executedSteps,captures:artifact.captures,computed:artifact.computed,sourceFingerprint:artifact.sourceFingerprint,exportFingerprint:artifact.exportFingerprint},
    evidencePaths:[RELEASE_STATE_INDEX_PATH,entry.path,...entry.screenshotPaths],
    mode:['VAL-B2-EVID-004','VAL-B2-EVID-007','VAL-B2-EVID-015'].includes(assertion)?'autonomous-visual':'browser-state',
    payload:(['VAL-B2-EVID-004','VAL-B2-EVID-007','VAL-B2-EVID-015'].includes(assertion)
      ?{...artifact.payload,steps:BRAND_V2_DEEP_ROWS.find(({id})=>id===entry.id)!.steps,captures:artifact.captures}
      :{kind:'browser-state',screenshotPath:artifact.bounded.path,computed:{...artifact.computed,evidence:entry.path},steps:BRAND_V2_DEEP_ROWS.find(({id})=>id===entry.id)!.steps,captures:artifact.captures}) as ReleasePayload,
  }));
  verdicts['VAL-B2-EVID-013']=flowTests.map(({id,scope,row})=>({id,failures:[],observed:{scope,...row},evidencePaths:[`${RELEASE_TEST_DIRECTORY}/${scope}.json`],mode:'automated-machine'}));
  return {index,populations,verdicts,expectedActivatedStateIds,
    activatedStateResidue:stateRows,
    modeFor:(assertion:string)=>verdicts[assertion]?.[0]?.mode,
  };
}
