import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readReleaseBuildStamp } from '../lib/brand-v2-release-build.ts';
import { releaseArtifactHash } from '../lib/brand-v2-release-evidence.ts';
import { RELEASE_TEST_DIRECTORY, RELEASE_TEST_SCOPES, readReleaseTestRun, releaseTestCommand, reportCases, testRunProblems, releaseTestInapplicabilities, type PlaywrightJson, type ReleaseTestScope, type ReleaseTestRun } from '../lib/brand-v2-release-test-run.ts';

const [mode, scopeText] = process.argv.slice(2);
if (!['--run', '--check'].includes(mode) || !Object.hasOwn(RELEASE_TEST_SCOPES, scopeText)) throw new Error('Usage: node scripts/record-brand-v2-test-run.ts --run|--check brand-v2|product|grasp|dexterity|rl');
const scope = scopeText as ReleaseTestScope;
const root = process.cwd();
if (mode === '--check') {
  const {run}=readReleaseTestRun(root,scope);
  console.log(`${scope}: ${run.passedTestCount} passed; ${run.inapplicableTestCount} independently derived empty fixture cases`);
} else {
  const build = readReleaseBuildStamp(root);
  const directory = join(root, RELEASE_TEST_DIRECTORY); mkdirSync(directory, { recursive: true });
  rmSync(join(directory, `${scope}.json`), { force: true });
  const attempts:Array<{argv:string[];exitCode:number|null;reportPath:string;error?:string}>=[];
  const saveAttempt=()=>writeFileSync(join(directory,`${scope}.attempt.json`),JSON.stringify({version:1,scope,sourceFingerprint:build.sourceAfter,exportFingerprint:build.exportFingerprint,attempts},null,2)+'\n');
  const execute = async (list: boolean) => {
    const path = `${RELEASE_TEST_DIRECTORY}/${scope}-${list ? 'inventory' : 'report'}.json`;
    rmSync(join(root, path), { force: true });
    const argv = releaseTestCommand(scope, list);
    const attempt={argv,exitCode:null as number|null,reportPath:path,error:undefined as string|undefined};attempts.push(attempt);saveAttempt();
    const env: NodeJS.ProcessEnv = { ...process.env, ROBOT_WIKI_RELEASE_PROFILES: '1', ROBOT_WIKI_RELEASE_PILOT: '0', ROBOT_WIKI_RELEASE_TEST_SCOPE: scope, ...(scope==='rl'?{RL_CLOSEOUT_PROOF:'1'}:{}), PLAYWRIGHT_JSON_OUTPUT_FILE: join(root, path) };
    delete env.ROBOT_WIKI_RELEASE_MAP_SHARD;
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(argv[0], argv.slice(1), { cwd: root, env, stdio: 'inherit' });
      child.once('error', reject); child.once('exit', (code) => resolve(code ?? -1));
    });
    attempt.exitCode=exitCode;saveAttempt();
    let report:PlaywrightJson;
    try{report=JSON.parse(readFileSync(join(root,path),'utf8')) as PlaywrightJson;}
    catch(error){attempt.error=error instanceof Error?error.message:String(error);saveAttempt();throw error;}
    return { argv, exitCode, report, path, sha256: releaseArtifactHash(root, path) };
  };
  const inventory = await execute(true);
  if (inventory.exitCode !== 0 || inventory.report.errors?.length) throw new Error('final test inventory command failed');
  const result = await execute(false);
  const after = readReleaseBuildStamp(root);
  if (after.sourceAfter !== build.sourceAfter || after.exportFingerprint !== build.exportFingerprint) throw new Error('source or production build changed during the final tests');
  const inapplicable=scope==='product'?releaseTestInapplicabilities(root):[];
  const failures = testRunProblems(inventory.report, result.report, result.exitCode,inapplicable);
  const cases=reportCases(result.report);
  const passedTestCount=cases.filter(({results})=>results.length===1&&results[0].status==='passed').length;
  const envelope: ReleaseTestRun = { version: 1, scope, sourceFingerprint: build.sourceAfter, exportFingerprint: build.exportFingerprint,
    command: result.argv, inventoryCommand: inventory.argv, exitCode: result.exitCode, inventoryExitCode: inventory.exitCode,
    inventory: { path: inventory.path, sha256: inventory.sha256 }, report: { path: result.path, sha256: result.sha256 },
    testCount: cases.length,passedTestCount,inapplicableTestCount:cases.length-passedTestCount,environment: { finalProfiles: '1', pilot: '0', mapShard: null }, inapplicable };
  writeFileSync(join(directory, `${scope}${failures.length ? '.failed' : ''}.json`), JSON.stringify({ ...envelope, ...(failures.length ? { failures } : {}) }, null, 2) + '\n');
  if (failures.length) throw new Error(failures.join('\n'));
  readReleaseTestRun(root,scope);
  console.log(`${scope}: ${envelope.passedTestCount} passed; ${envelope.inapplicableTestCount} independently derived empty fixture cases`);
}
