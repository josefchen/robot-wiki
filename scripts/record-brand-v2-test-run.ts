import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync,createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { readReleaseBuildStamp } from '../lib/brand-v2-release-build.ts';
import { publishCapturedEvidence,privateReleaseEvidenceDirectory,type PublicEvidenceReference } from '../lib/brand-v2-release-public-evidence.ts';
import { RELEASE_TEST_DIRECTORY, RELEASE_TEST_SCOPES, readReleaseTestRun, releaseTestCommand, reportCases, testRunProblems, reportedTestCommandProblems,releaseTestInapplicabilities, type PlaywrightJson, type ReleaseTestScope, type ReleaseTestRun } from '../lib/brand-v2-release-test-run.ts';

const [mode, scopeText] = process.argv.slice(2);
if (!['--run', '--check'].includes(mode) || !Object.hasOwn(RELEASE_TEST_SCOPES, scopeText)) throw new Error('Usage: node scripts/record-brand-v2-test-run.ts --run|--check brand-v2|product|grasp|dexterity|rl');
const scope = scopeText as ReleaseTestScope;
const root = process.cwd();
if (mode === '--check') {
  const {run}=readReleaseTestRun(root,scope);
  console.log(`${scope}: ${run.passedTestCount} passed; ${run.inapplicableTestCount} independently derived empty fixture cases`);
} else {
  const build = readReleaseBuildStamp(root);
  const privateDirectory=privateReleaseEvidenceDirectory(root);
  const context=(name:string,argv:string[],exitCode:number)=>({sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,producer:{name,argv,exitCode}});
  const directory = join(root, RELEASE_TEST_DIRECTORY); mkdirSync(directory, { recursive: true });
  rmSync(join(directory, `${scope}.json`), { force: true });
  const attempts:Array<{argv:string[];exitCode:number|null;reportPath:string;log?:PublicEvidenceReference;artifact?:PublicEvidenceReference;error?:string}>=[];
  const saveAttempt=(failure?:PublicEvidenceReference)=>writeFileSync(join(directory,`${scope}.attempt.json`),JSON.stringify({version:2,scope,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,attempts,failure},null,2)+'\n');
  const execute = async (list: boolean) => {
    const path = `${RELEASE_TEST_DIRECTORY}/${scope}-${list ? 'inventory' : 'report'}.json`;
    rmSync(join(root, path), { force: true });
    const argv = releaseTestCommand(scope, list);
    const attempt:typeof attempts[number]={argv,exitCode:null,reportPath:path};attempts.push(attempt);saveAttempt();
    const env: NodeJS.ProcessEnv = { ...process.env, ROBOT_WIKI_RELEASE_PROFILES: '1', ROBOT_WIKI_RELEASE_PILOT: '0', ROBOT_WIKI_RELEASE_TEST_SCOPE: scope, ...(scope==='rl'?{RL_CLOSEOUT_PROOF:'1'}:{}), PLAYWRIGHT_JSON_OUTPUT_FILE: join(root, path) };
    delete env.ROBOT_WIKI_RELEASE_MAP_SHARD;
    const logPath=`${RELEASE_TEST_DIRECTORY}/${scope}-${list?'inventory':'run'}.log`,stream=createWriteStream(join(root,logPath));
    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(argv[0], argv.slice(1), { cwd: root, env, stdio: ['ignore','pipe','pipe'] });
      child.stdout.on('data',bytes=>{stream.write(bytes);process.stdout.write(bytes);});child.stderr.on('data',bytes=>{stream.write(bytes);process.stderr.write(bytes);});
      child.once('error',error=>{stream.write(error.stack??error.message);attempt.error='process spawn failed; exact error retained in the command log';resolve(-1);});child.once('close', (code) => resolve(code ?? -1));
    });
    await new Promise<void>(resolve=>stream.end(resolve));
    const producer=context(`${scope}:${list?'inventory':'run'}`,argv,exitCode);
    const log=publishCapturedEvidence(root,logPath,'command-log',producer,privateDirectory);attempt.log=log;
    attempt.exitCode=exitCode;saveAttempt();
    const raw=readFileSync(join(root,path));
    const artifact=publishCapturedEvidence(root,path,list?'playwright-inventory':'playwright-report',producer,privateDirectory);attempt.artifact=artifact;saveAttempt();
    const rawReport=JSON.parse(raw.toString('utf8')) as PlaywrightJson;
    const report=JSON.parse(readFileSync(join(root,path),'utf8')) as PlaywrightJson;
    return { argv, exitCode, report,rawReport,artifact,log };
  };
  try{
  const inventory = await execute(true);
  if (inventory.exitCode !== 0 || inventory.report.errors?.length) throw new Error('final test inventory command failed');
  const result = await execute(false);
  const after = readReleaseBuildStamp(root);
  if (after.sourceAfter !== build.sourceAfter || after.exportFingerprint !== build.exportFingerprint) throw new Error('source or production build changed during the final tests');
  const inapplicable=scope==='product'?releaseTestInapplicabilities(root):[];
  const failures = [...testRunProblems(inventory.rawReport,result.rawReport,result.exitCode,inapplicable),...testRunProblems(inventory.report, result.report, result.exitCode,inapplicable),...reportedTestCommandProblems(inventory.report,inventory.argv),...reportedTestCommandProblems(result.report,result.argv)];
  const cases=reportCases(result.report);
  const passedTestCount=cases.filter(({results})=>results.length===1&&results[0].status==='passed').length;
  const envelope: ReleaseTestRun = { version: 2, scope, sourceFingerprint: build.sourceAfter, exportFingerprint: build.exportFingerprint,
    command: result.argv, inventoryCommand: inventory.argv, exitCode: result.exitCode, inventoryExitCode: inventory.exitCode,
    inventory:inventory.artifact,report:result.artifact,inventoryLog:inventory.log,log:result.log,
    testCount: cases.length,passedTestCount,inapplicableTestCount:cases.length-passedTestCount,environment: { finalProfiles: '1', pilot: '0', mapShard: null }, inapplicable };
  writeFileSync(join(directory, `${scope}${failures.length ? '.failed' : ''}.json`), JSON.stringify({ ...envelope, ...(failures.length ? { failures } : {}) }, null, 2) + '\n');
  if (failures.length) throw new Error(failures.join('\n'));
  readReleaseTestRun(root,scope);
  console.log(`${scope}: ${envelope.passedTestCount} passed; ${envelope.inapplicableTestCount} independently derived empty fixture cases`);
  }catch(error){
    const path=`${RELEASE_TEST_DIRECTORY}/${scope}-failure.log`;writeFileSync(join(root,path),error instanceof Error?error.stack??error.message:String(error));
    const failure=publishCapturedEvidence(root,path,'command-log',context(`${scope}:recorder`,['node','scripts/record-brand-v2-test-run.ts','--run',scope],1),privateDirectory);saveAttempt(failure);throw error;
  }
}
