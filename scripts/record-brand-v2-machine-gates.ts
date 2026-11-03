import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { readReleaseBuildStamp,releaseExportFingerprint } from '../lib/brand-v2-release-build.ts';
import { releaseUnitNonExecutions } from '../lib/brand-v2-release-unit-scope.ts';
import { releaseSourceFingerprint } from '../lib/brand-v2-release-evidence.ts';
import {publishCapturedEvidence,privateReleaseEvidenceDirectory,type PublicEvidenceReference}from '../lib/brand-v2-release-public-evidence.ts';
import { RELEASE_MACHINE_DIRECTORY,RELEASE_MACHINE_PATH,RELEASE_MACHINE_SCRIPTS,RELEASE_UNIT_INVENTORY,RELEASE_UNIT_REPORT,RELEASE_UNIT_LIST_COMMAND,releaseMachineCommand,unitReportProblems,readReleaseMachineEvidence,type ReleaseMachineEvidence,type UnitInventory,type UnitJson } from '../lib/brand-v2-release-machine.ts';

const mode=process.argv[2];const root=process.cwd();
if(mode==='--check')console.log(`Final machine gates: ${readReleaseMachineEvidence(root).commands.length} complete; full unit inventory verified`);
else if(mode==='--run'){
  const nonExecutions=releaseUnitNonExecutions(root);
  const build=readReleaseBuildStamp(root);mkdirSync(join(root,RELEASE_MACHINE_DIRECTORY),{recursive:true});rmSync(join(root,RELEASE_MACHINE_PATH),{force:true});
  const privateDirectory=privateReleaseEvidenceDirectory(root);
  const context=(name:string,argv:string[],exitCode:number)=>({sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,producer:{name,argv,exitCode}});
  const commands:ReleaseMachineEvidence['commands']=[];
  const attempts:Array<{name:string;argv:string[];exitCode:number|null;logPath:string;error?:string}>=[];
  let unitInventory:ReleaseMachineEvidence['unitInventory']|undefined;
  let unitReport:PublicEvidenceReference|undefined;let rawInventory:UnitInventory|undefined;let rawReport:UnitJson|undefined;
  const saveAttempt=(failure?:PublicEvidenceReference)=>writeFileSync(join(root,RELEASE_MACHINE_DIRECTORY,'attempt.json'),JSON.stringify({version:2,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,commands,unitInventory,unitReport,attempts,failure},null,2)+'\n');
  const execute=async(name:string,argv:readonly string[])=>{
    const before=readReleaseBuildStamp(root);if(before.sourceAfter!==build.sourceAfter||before.exportFingerprint!==build.exportFingerprint)throw new Error('build changed between machine gates');
    const path=`${RELEASE_MACHINE_DIRECTORY}/${name.replaceAll(':','-')}.log`;const stream=createWriteStream(join(root,path));const started=Date.now();
    const attempt={name,argv:[...argv],exitCode:null as number|null,logPath:path,error:undefined as string|undefined};attempts.push(attempt);saveAttempt();
    console.log(`Final machine gate: ${argv.join(' ')}`);
    const exitCode=await new Promise<number>((resolve)=>{
      const child=spawn(argv[0],argv.slice(1),{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
      child.stdout.on('data',(data)=>{stream.write(data);process.stdout.write(data);});child.stderr.on('data',(data)=>{stream.write(data);process.stderr.write(data);});
      child.once('error',(error)=>{stream.write(error.stack??error.message);attempt.error='process spawn failed; exact error retained in the command log';saveAttempt();resolve(-1);});child.once('close',(code)=>resolve(code??-1));
    });
    await new Promise<void>((resolve)=>stream.end(resolve));
    attempt.exitCode=exitCode;saveAttempt();
    const log=publishCapturedEvidence(root,path,'command-log',context(name,[...argv],exitCode),privateDirectory);
    const result={name,argv:[...argv],exitCode,durationMs:Date.now()-started,sourceBefore:before.sourceAfter,sourceAfter:releaseSourceFingerprint(root),exportBefore:before.exportFingerprint,exportAfter:releaseExportFingerprint(root),log};
    return result;
  };
  try{
    rmSync(join(root,RELEASE_UNIT_INVENTORY),{force:true});rmSync(join(root,RELEASE_UNIT_REPORT),{force:true});
    const listed=await execute('unit-inventory',RELEASE_UNIT_LIST_COMMAND);
    if(existsSync(join(root,RELEASE_UNIT_INVENTORY))){const raw=readFileSync(join(root,RELEASE_UNIT_INVENTORY));const artifact=publishCapturedEvidence(root,RELEASE_UNIT_INVENTORY,'vitest-inventory',context(listed.name,listed.argv,listed.exitCode),privateDirectory);rawInventory=JSON.parse(raw.toString('utf8')) as UnitInventory;unitInventory={command:listed,artifact};saveAttempt();}
    if(listed.exitCode!==0)throw new Error('unit inventory collection failed');
    if(!unitInventory||!rawInventory)throw new Error('unit inventory command produced no complete report');
    for(const script of RELEASE_MACHINE_SCRIPTS){
      const result=await execute(script,releaseMachineCommand(script));commands.push(result);
      if(script==='test'&&existsSync(join(root,RELEASE_UNIT_REPORT))){const raw=readFileSync(join(root,RELEASE_UNIT_REPORT));unitReport=publishCapturedEvidence(root,RELEASE_UNIT_REPORT,'vitest-report',context(result.name,result.argv,result.exitCode),privateDirectory);rawReport=JSON.parse(raw.toString('utf8')) as UnitJson;}
      saveAttempt();if(result.exitCode!==0)throw new Error(`final machine gate failed: ${script}`);
    }
    const after=readReleaseBuildStamp(root);if(after.sourceAfter!==build.sourceAfter||after.exportFingerprint!==build.exportFingerprint)throw new Error('source or export changed during final machine gates');
    const inventory=JSON.parse(readFileSync(join(root,RELEASE_UNIT_INVENTORY),'utf8')) as UnitInventory;
    const report=JSON.parse(readFileSync(join(root,RELEASE_UNIT_REPORT),'utf8')) as UnitJson;
    if(!rawReport||!unitReport)throw new Error('unit test command produced no complete report');
    const failures=[...unitReportProblems(rawInventory,rawReport,nonExecutions),...unitReportProblems(inventory,report,nonExecutions)];if(failures.length)throw new Error(failures.join('\n'));
    const evidence:ReleaseMachineEvidence={version:2,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,commands,unitInventory,unitReport,unitCount:inventory.length,unitPassedCount:report.numPassedTests,unitNonExecutions:nonExecutions};
    writeFileSync(join(root,RELEASE_MACHINE_PATH),JSON.stringify(evidence,null,2)+'\n');readReleaseMachineEvidence(root);
    console.log(`Final machine gates: ${commands.length} passed; ${report.numPassedTests} unit cases passed; ${nonExecutions.length} explicitly classified non-executions`);
  }catch(error){
    const path=`${RELEASE_MACHINE_DIRECTORY}/failure.log`;writeFileSync(join(root,path),error instanceof Error?error.stack??error.message:String(error));
    const failure=publishCapturedEvidence(root,path,'command-log',context('machine-recorder',['node','scripts/record-brand-v2-machine-gates.ts','--run'],1),privateDirectory);saveAttempt(failure);throw error;
  }
}else throw new Error('Usage: node scripts/record-brand-v2-machine-gates.ts --run|--check');
