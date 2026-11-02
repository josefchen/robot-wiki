import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readReleaseBuildStamp } from '../lib/brand-v2-release-build.ts';
import { releaseUnitNonExecutions } from '../lib/brand-v2-release-unit-scope.ts';
import { releaseArtifactHash } from '../lib/brand-v2-release-evidence.ts';
import { RELEASE_MACHINE_DIRECTORY,RELEASE_MACHINE_PATH,RELEASE_MACHINE_SCRIPTS,RELEASE_UNIT_INVENTORY,RELEASE_UNIT_REPORT,RELEASE_UNIT_LIST_COMMAND,releaseMachineCommand,unitReportProblems,readReleaseMachineEvidence,type ReleaseMachineEvidence,type UnitInventory,type UnitJson } from '../lib/brand-v2-release-machine.ts';

const mode=process.argv[2];const root=process.cwd();
if(mode==='--check')console.log(`Final machine gates: ${readReleaseMachineEvidence(root).commands.length} complete; full unit inventory verified`);
else if(mode==='--run'){
  const nonExecutions=releaseUnitNonExecutions(root);
  const build=readReleaseBuildStamp(root);mkdirSync(join(root,RELEASE_MACHINE_DIRECTORY),{recursive:true});rmSync(join(root,RELEASE_MACHINE_PATH),{force:true});
  const commands:ReleaseMachineEvidence['commands']=[];
  const attempts:Array<{name:string;argv:string[];exitCode:number|null;logPath:string;error?:string}>=[];
  let unitInventory:ReleaseMachineEvidence['unitInventory']|undefined;
  const saveAttempt=(error?:string)=>writeFileSync(join(root,RELEASE_MACHINE_DIRECTORY,'attempt.json'),JSON.stringify({version:1,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,commands,unitInventory,attempts,error},null,2)+'\n');
  const execute=async(name:string,argv:readonly string[])=>{
    const before=readReleaseBuildStamp(root);if(before.sourceAfter!==build.sourceAfter||before.exportFingerprint!==build.exportFingerprint)throw new Error('build changed between machine gates');
    const path=`${RELEASE_MACHINE_DIRECTORY}/${name.replaceAll(':','-')}.log`;const stream=createWriteStream(join(root,path));const started=Date.now();
    const attempt={name,argv:[...argv],exitCode:null as number|null,logPath:path,error:undefined as string|undefined};attempts.push(attempt);saveAttempt();
    console.log(`Final machine gate: ${argv.join(' ')}`);
    const exitCode=await new Promise<number>((resolve,reject)=>{
      const child=spawn(argv[0],argv.slice(1),{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
      child.stdout.on('data',(data)=>{stream.write(data);process.stdout.write(data);});child.stderr.on('data',(data)=>{stream.write(data);process.stderr.write(data);});
      child.once('error',(error)=>{attempt.error=error.message;saveAttempt();reject(error);});child.once('exit',(code)=>resolve(code??-1));
    });
    await new Promise<void>((resolve)=>stream.end(resolve));
    attempt.exitCode=exitCode;saveAttempt();
    const result={name,argv:[...argv],exitCode,durationMs:Date.now()-started,log:{path,sha256:releaseArtifactHash(root,path)}};
    return result;
  };
  try{
    const listed=await execute('unit-inventory',RELEASE_UNIT_LIST_COMMAND);
    if(listed.exitCode!==0)throw new Error('unit inventory collection failed');
    unitInventory={command:listed,artifact:{path:RELEASE_UNIT_INVENTORY,sha256:releaseArtifactHash(root,RELEASE_UNIT_INVENTORY)}};saveAttempt();
    for(const script of RELEASE_MACHINE_SCRIPTS){const result=await execute(script,releaseMachineCommand(script));commands.push(result);saveAttempt();if(result.exitCode!==0)throw new Error(`final machine gate failed: ${script}`);}
    const after=readReleaseBuildStamp(root);if(after.sourceAfter!==build.sourceAfter||after.exportFingerprint!==build.exportFingerprint)throw new Error('source or export changed during final machine gates');
    const inventory=JSON.parse(readFileSync(join(root,RELEASE_UNIT_INVENTORY),'utf8')) as UnitInventory;
    const report=JSON.parse(readFileSync(join(root,RELEASE_UNIT_REPORT),'utf8')) as UnitJson;
    const failures=unitReportProblems(inventory,report,nonExecutions);if(failures.length)throw new Error(failures.join('\n'));
    const evidence:ReleaseMachineEvidence={version:1,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,commands,unitInventory,unitReport:{path:RELEASE_UNIT_REPORT,sha256:releaseArtifactHash(root,RELEASE_UNIT_REPORT)},unitCount:inventory.length,unitPassedCount:report.numPassedTests,unitNonExecutions:nonExecutions};
    writeFileSync(join(root,RELEASE_MACHINE_PATH),JSON.stringify(evidence,null,2)+'\n');readReleaseMachineEvidence(root);
    console.log(`Final machine gates: ${commands.length} passed; ${report.numPassedTests} unit cases passed; ${nonExecutions.length} explicitly classified non-executions`);
  }catch(error){saveAttempt(error instanceof Error?error.message:String(error));throw error;}
}else throw new Error('Usage: node scripts/record-brand-v2-machine-gates.ts --run|--check');
