import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import { publicEvidenceReferenceSchema,readPublicEvidence } from './brand-v2-release-public-evidence.ts';
import { releaseUnitNonExecutions, type UnitNonExecution } from './brand-v2-release-unit-scope.ts';

export const RELEASE_MACHINE_DIRECTORY='evidence/brand-v2/release/machine';
export const RELEASE_MACHINE_PATH=`${RELEASE_MACHINE_DIRECTORY}/results.json`;
export const RELEASE_UNIT_INVENTORY=`${RELEASE_MACHINE_DIRECTORY}/unit-inventory.json`;
export const RELEASE_UNIT_REPORT=`${RELEASE_MACHINE_DIRECTORY}/unit-report.json`;
export const RELEASE_MACHINE_SCRIPTS=[
  'typecheck','lint','test','validate:content','lint-no-slop','check:article-boxes','check:article-sources',
  'baseline:brand-v2','check:figure-system','check:reader-first','check:explainer-labels','check:teach-back',
  'check:reading-times','check:seo','check:internal-links','check:discovery-prose','check:brand-v2-registries',
  'check:tektur-fonts','check:og-renderer-fonts','check:og-card-bytes','check:neutral-tooling','check:e2e-navigation-budget',
] as const;
export const RELEASE_UNIT_LIST_COMMAND=['npx','vitest','list',`--json=${RELEASE_UNIT_INVENTORY}`] as const;
export function releaseMachineCommand(script:string):string[]{
  if(!RELEASE_MACHINE_SCRIPTS.some((name)=>name===script))throw new Error(`Unregistered final machine gate ${script}`);
  return script==='test'?['npm','test','--','--reporter=default','--reporter=json',`--outputFile.json=${RELEASE_UNIT_REPORT}`,'--allowOnly=false','--no-file-parallelism','--maxWorkers=1']:['npm','run',script];
}

export type UnitInventory=Array<{name:string;file:string}>;
export type UnitJson={success:boolean;numTotalTests:number;numPassedTests:number;numFailedTests:number;numPendingTests:number;numTodoTests:number;testResults:Array<{name:string;status:string;message?:string;assertionResults:Array<{ancestorTitles:string[];title:string;fullName:string;status:string;failureMessages:string[]}>}>};
export function unitReportProblems(inventory:UnitInventory,report:UnitJson,nonExecutions:readonly UnitNonExecution[]=[]):string[]{
  const failures:string[]=[];
  if(!Array.isArray(inventory)||!inventory.length)throw new Error('empty or invalid independent unit inventory');
  if(!report||!Array.isArray(report.testResults))throw new Error('invalid or incomplete unit JSON report');
  const actual=report.testResults.flatMap((file)=>file.assertionResults.map((test)=>({file:file.name,name:[...test.ancestorTitles,test.title].join(' > '),test})));
  const key=(row:{file:string;name:string})=>`${row.file}\0${row.name}`;
  // Compare multiplicity as well as names: parameterized cases may repeat a
  // public title, so deduplication would silently omit real test executions.
  if(JSON.stringify(inventory.map(key).sort())!==JSON.stringify(actual.map(key).sort()))failures.push('executed unit inventory differs from independent complete list');
  const excluded = actual.filter((row) => nonExecutions.some((item) => row.file.endsWith('/'+item.file) && row.name === item.name && item.population.length === 0));
  if (excluded.length !== nonExecutions.length || nonExecutions.some((item) => excluded.filter((row) => row.file.endsWith('/'+item.file) && row.name === item.name).length !== 1)) failures.push('declared unit non-execution population differs or is duplicated');
  if(!report.success||report.numFailedTests||report.numPendingTests!==excluded.length||report.numTodoTests||report.numTotalTests!==inventory.length||report.numPassedTests!==inventory.length-excluded.length)failures.push('unit report has nonpassing, unexplained skipped, todo or missing outcomes');
  for(const file of report.testResults)if(file.status!=='passed'||file.message?.trim())failures.push(`${file.name}: failed or incomplete unit file`);
  for(const row of actual)if((excluded.includes(row)?!['pending','skipped'].includes(row.test.status):row.test.status!=='passed')||row.test.failureMessages.length)failures.push(`${row.name}: nonpassing or misclassified unit execution`);
  return failures;
}

const hash=z.string().regex(/^[a-f0-9]{64}$/);
const file=publicEvidenceReferenceSchema;
const command=z.object({name:z.string().min(1),argv:z.array(z.string()).min(1),exitCode:z.number().int(),durationMs:z.number().nonnegative(),sourceBefore:hash,sourceAfter:hash,exportBefore:hash,exportAfter:hash,log:file}).strict();
export const releaseMachineSchema=z.object({
  version:z.literal(2),sourceFingerprint:hash,exportFingerprint:hash,commands:z.array(command).min(1),
  unitInventory:z.object({command,artifact:file}).strict(),unitReport:file,unitCount:z.number().int().positive(),unitPassedCount:z.number().int().nonnegative(),
  unitNonExecutions:z.array(z.object({file:z.string(),name:z.string(),kind:z.enum(['conditional-evidence-producer','derived-inapplicable']),reason:z.string().min(1),derivation:z.string().min(1),sourcePaths:z.array(z.string()).min(1),sourceHash:hash,population:z.array(z.string()).length(0)}).strict()),
}).strict();
export type ReleaseMachineEvidence=z.infer<typeof releaseMachineSchema>;
export function readReleaseMachineEvidence(root:string):ReleaseMachineEvidence{
  const path=join(root,RELEASE_MACHINE_PATH);if(!existsSync(path))throw new Error('missing final machine-gate evidence');
  const evidence=releaseMachineSchema.parse(JSON.parse(readFileSync(path,'utf8')));const build=readReleaseBuildStamp(root);
  if(evidence.sourceFingerprint!==build.sourceAfter||evidence.exportFingerprint!==build.exportFingerprint)throw new Error('stale final machine-gate source or production export');
  if(JSON.stringify(evidence.commands.map(({name})=>name))!==JSON.stringify(RELEASE_MACHINE_SCRIPTS))throw new Error('machine-gate command population differs');
  for(const row of [...evidence.commands,evidence.unitInventory.command])if(row.sourceBefore!==build.sourceAfter||row.sourceAfter!==build.sourceAfter||row.exportBefore!==build.exportFingerprint||row.exportAfter!==build.exportFingerprint)throw new Error(`machine gate did not preserve source/export bytes: ${row.name}`);
  for(const row of evidence.commands)if(row.exitCode!==0||JSON.stringify(row.argv)!==JSON.stringify(releaseMachineCommand(row.name)))throw new Error(`failed or changed final machine command ${row.name}`);
  if(evidence.unitInventory.command.name!=='unit-inventory'||evidence.unitInventory.command.exitCode!==0||JSON.stringify(evidence.unitInventory.command.argv)!==JSON.stringify(RELEASE_UNIT_LIST_COMMAND))throw new Error('missing or filtered independent unit inventory command');
  const context=(command:ReleaseMachineEvidence['commands'][number])=>({sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,producer:{name:command.name,argv:command.argv,exitCode:command.exitCode}});
  for(const command of [...evidence.commands,evidence.unitInventory.command])readPublicEvidence(root,command.log,'command-log',context(command));
  const inventory=JSON.parse(readPublicEvidence(root,evidence.unitInventory.artifact,'vitest-inventory',context(evidence.unitInventory.command)).toString('utf8')) as UnitInventory;
  const report=JSON.parse(readPublicEvidence(root,evidence.unitReport,'vitest-report',context(evidence.commands.find(command=>command.name==='test')!)).toString('utf8')) as UnitJson;
  const nonExecutions=releaseUnitNonExecutions(root);const failures=unitReportProblems(inventory,report,nonExecutions);if(inventory.length!==evidence.unitCount||report.numPassedTests!==evidence.unitPassedCount)failures.push('unit count differs');
  if(JSON.stringify(evidence.unitNonExecutions)!==JSON.stringify(nonExecutions))failures.push('unit non-execution scope differs from current source derivation');
  if(failures.length)throw new Error(failures.join('\n'));return evidence;
}
