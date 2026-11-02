import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import { releaseArtifactHash } from './brand-v2-release-evidence.ts';
import { modules } from '../data/modules.ts';
import { buildBacklinkGraph } from './backlinks.ts';
import matter from 'gray-matter';

export const RELEASE_TEST_SCOPES = {
  'brand-v2': 'playwright.brand-v2.config.ts',
  product: 'playwright.release.config.ts',
  grasp: 'playwright.release.config.ts',
  dexterity: 'playwright.release.config.ts',
  rl: 'playwright.release.config.ts',
} as const;
export type ReleaseTestScope = keyof typeof RELEASE_TEST_SCOPES;
export const RELEASE_TEST_DIRECTORY = 'evidence/brand-v2/release/test-runs';
const SOURCE_LANES: Record<'grasp' | 'dexterity' | 'rl', readonly string[]> = {
  grasp: ['grasp-source-readers.spec.ts'],
  dexterity: ['dexterity-brooks-readers.spec.ts','dexterity-brooks-remaining-readers.spec.ts','dexterity-figure15-readers.spec.ts','dexterity-figure-holson-remaining-readers.spec.ts','dexterity-holson-outlook-readers.spec.ts'],
  rl: ['rl-source-closeouts.spec.ts'],
};
export function releaseScopeFiles(root: string, scope: ReleaseTestScope): string[] {
  const walk = (directory: string): string[] => readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : entry.isFile() && entry.name.endsWith('.spec.ts') ? [`${directory}/${entry.name}`] : []);
  return walk('tests/e2e').filter((path) => {
    const name = path.split('/').at(-1)!;
    if (name === 'brand-v2-release-pilot.spec.ts') return false; // Explicit diagnostic-only scope; never final proof.
    if (scope in SOURCE_LANES) return SOURCE_LANES[scope as keyof typeof SOURCE_LANES].includes(name);
    if (Object.values(SOURCE_LANES).some((names) => names.includes(name))) return false;
    return scope === 'brand-v2' ? name.startsWith('brand-v2') : !name.startsWith('brand-v2');
  }).sort();
}

export type TestInapplicability = { file: string; title: string; reason: string; population: string[]; derivation: string; sourcePaths: string[] };
export function fixtureInapplicabilities(drafts: string[], zeroInbound: string[], articlePaths: string[]): TestInapplicability[] {
  if (!articlePaths.length) throw new Error('cannot derive fixture inapplicability from an empty published corpus');
  return [
    ...(drafts.length ? [] : [{file:'search-coverage.spec.ts',title:'widening the index does not leak draft modules (VAL-BUILD-001)',reason:'no draft modules in the registry',population:drafts,derivation:'modules.filter(status !== published)',sourcePaths:['data/modules.ts']}]),
    ...(zeroInbound.length ? [] : [{file:'see-also.spec.ts',title:'a zero-inbound article renders no Linked from section and no bare heading (VAL-WIKI-012)',reason:'no zero-inbound published articles in the current link graph',population:zeroInbound,derivation:'published raw prose + seeAlso graph has an inbound edge for every published article',sourcePaths:['data/modules.ts','lib/backlinks.ts',...articlePaths]}]),
  ];
}
/** These two fixture classes may be genuinely empty. They remain skipped,
 * are never counted as passes, and reopen automatically when data changes. */
export function releaseTestInapplicabilities(root: string): TestInapplicability[] {
  const drafts = modules.filter(({status})=>status !== 'published').map(({domain,slug})=>`${domain}/${slug}`);
  const published = modules.filter(({status})=>status === 'published');
  const articles = published.map(({domain,slug})=>{
    const path=`content/${domain}/${slug}.mdx`;const parsed=matter(readFileSync(join(root,path),'utf8'));
    return { key:`${domain}/${slug}`,body:parsed.content,seeAlso:Array.isArray(parsed.data.seeAlso) ? parsed.data.seeAlso.filter((x:unknown):x is string=>typeof x==='string') : undefined };
  });
  if (!published.length) throw new Error('cannot derive fixture inapplicability from an empty published corpus');
  const graph=buildBacklinkGraph(articles,(key)=>articles.findIndex((a)=>a.key===key));
  const zeroInbound=articles.filter(({key})=>!graph.has(key)).map(({key})=>key);
  return fixtureInapplicabilities(drafts,zeroInbound,published.map(({domain,slug})=>`content/${domain}/${slug}.mdx`));
}
type ReportTest = { projectName: string; expectedStatus?: string; status?: string; annotations?: Array<{ type: string; description?: string }>; results?: Array<{ status: string; errors?: unknown[] }> };
type ReportSpec = { id: string; title: string; file: string; line: number; column: number; tests: ReportTest[] };
type ReportSuite = { title: string; specs?: ReportSpec[]; suites?: ReportSuite[] };
export type PlaywrightJson = { suites: ReportSuite[]; errors?: unknown[]; stats?: { expected: number; unexpected: number; flaky: number; skipped: number }; config?: { configFile?: string; forbidOnly?: boolean; grep?: unknown } };
export type ReportCase = { id: string; file: string; title: string; project: string; expectedStatus: string; status: string; results: Array<{ status: string; errors?: unknown[] }>; annotations: Array<{ type: string; description?: string }> };

export function reportCases(report: PlaywrightJson): ReportCase[] {
  if (!report || !Array.isArray(report.suites)) throw new Error('invalid or incomplete Playwright JSON report');
  const rows: ReportCase[] = [];
  const walk = (suite: ReportSuite, parent: string[]) => {
    const titles = [...parent, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      if (!spec.id || !spec.file || !spec.title || !test.projectName && test.projectName !== '') throw new Error('test report case lacks its identity');
      rows.push({ id: `${spec.id}|${test.projectName}`, file: spec.file.replaceAll('\\', '/'), title: [...titles, spec.title].join(' › '),
        project: test.projectName, expectedStatus: test.expectedStatus ?? 'passed', status: test.status ?? '',
        results: test.results ?? [], annotations: test.annotations ?? [] });
    }
    for (const child of suite.suites ?? []) walk(child, titles);
  };
  report.suites.forEach((suite) => walk(suite, []));
  if (!rows.length || new Set(rows.map(({ id }) => id)).size !== rows.length) throw new Error('empty or duplicate Playwright case inventory');
  return rows;
}

/** The independent --list inventory is the expected side. Neither a filtered
 * report nor an expected-red/skip annotation can grant a product pass. */
export function testRunProblems(listed: PlaywrightJson, executed: PlaywrightJson, exitCode: number, inapplicable: readonly TestInapplicability[] = []): string[] {
  const expected = reportCases(listed); const actual = reportCases(executed); const failures: string[] = [];
  if (exitCode !== 0) failures.push(`test command exited ${exitCode}`);
  if (listed.errors?.length || executed.errors?.length) failures.push('Playwright reported a global or collection error');
  const identity = (row: ReportCase) => `${row.id}\0${row.file}\0${row.title}\0${row.project}`;
  if (JSON.stringify(expected.map(identity).sort()) !== JSON.stringify(actual.map(identity).sort())) failures.push('executed inventory differs from the independently listed complete suite');
  const allowedSkip = (row:ReportCase) => inapplicable.find((item)=>row.file.split('/').at(-1)===item.file && row.title.endsWith(` › ${item.title}`) && item.population.length===0 && row.annotations.some(({type,description})=>type==='skip'&&description===item.reason));
  const skipped=actual.filter((row)=>allowedSkip(row)&&row.expectedStatus==='skipped'&&row.results.length===1&&row.results[0].status==='skipped');
  if (!executed.stats || executed.stats.unexpected || executed.stats.flaky || executed.stats.skipped !== skipped.length || executed.stats.expected !== actual.length-skipped.length) failures.push('test summary has missing, skipped, flaky or unexpected outcomes');
  for (const row of actual) {
    if (skipped.includes(row)) continue;
    if (row.expectedStatus !== 'passed') failures.push(`${row.id}: expected ${row.expectedStatus}, so this is not passing acceptance`);
    if (row.status !== 'expected' || row.results.length !== 1 || row.results[0]?.status !== 'passed' || row.results.some(({ errors }) => errors?.length)) failures.push(`${row.id}: incomplete or nonpassing execution`);
    if (row.annotations.some(({ type }) => ['skip', 'fixme', 'fail', 'only'].includes(type))) failures.push(`${row.id}: forbidden acceptance annotation`);
  }
  return failures;
}

const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const releaseTestRunSchema = z.object({
  version: z.literal(1), scope: z.enum(['brand-v2', 'product', 'grasp', 'dexterity', 'rl']), sourceFingerprint: sha, exportFingerprint: sha,
  command: z.array(z.string()).min(1), inventoryCommand: z.array(z.string()).min(1), exitCode: z.number().int(), inventoryExitCode: z.number().int(),
  inventory: z.object({ path: z.string(), sha256: sha }).strict(), report: z.object({ path: z.string(), sha256: sha }).strict(),
  testCount: z.number().int().positive(), environment: z.object({ finalProfiles: z.literal('1'), pilot: z.literal('0'), mapShard: z.null() }).strict(),
  passedTestCount: z.number().int().nonnegative(), inapplicableTestCount: z.number().int().nonnegative(),
  inapplicable: z.array(z.object({ file:z.string(),title:z.string(),reason:z.string(),population:z.array(z.string()),derivation:z.string(),sourcePaths:z.array(z.string()).min(1) }).strict()),
}).strict();
export type ReleaseTestRun = z.infer<typeof releaseTestRunSchema>;

export function releaseTestCommand(scope: ReleaseTestScope, list: boolean): string[] {
  return ['npx', 'playwright', 'test', '--config', RELEASE_TEST_SCOPES[scope], '--forbid-only', '--workers=1', '--reporter=list,json', ...(list ? ['--list'] : [])];
}

export function readReleaseTestRun(root: string, scope: ReleaseTestScope): { run: ReleaseTestRun; cases: ReportCase[] } {
  const path = join(root, RELEASE_TEST_DIRECTORY, `${scope}.json`);
  if (!existsSync(path)) throw new Error(`missing final ${scope} test report envelope`);
  const run = releaseTestRunSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const build = readReleaseBuildStamp(root);
  if (run.scope !== scope || run.sourceFingerprint !== build.sourceAfter || run.exportFingerprint !== build.exportFingerprint || run.inventoryExitCode !== 0) throw new Error('stale or failed final test-run identity');
  if (JSON.stringify(run.command) !== JSON.stringify(releaseTestCommand(scope, false)) || JSON.stringify(run.inventoryCommand) !== JSON.stringify(releaseTestCommand(scope, true))) throw new Error('final test command was filtered or changed');
  for (const artifact of [run.inventory, run.report]) if (releaseArtifactHash(root, artifact.path) !== artifact.sha256) throw new Error(`changed final test report bytes: ${artifact.path}`);
  const listed = JSON.parse(readFileSync(join(root, run.inventory.path), 'utf8')) as PlaywrightJson;
  const report = JSON.parse(readFileSync(join(root, run.report.path), 'utf8')) as PlaywrightJson;
  const inapplicable=scope==='product'?releaseTestInapplicabilities(root):[];
  const failures = testRunProblems(listed, report, run.exitCode,inapplicable);
  if(JSON.stringify(run.inapplicable)!==JSON.stringify(inapplicable))failures.push('fixture inapplicability is stale or narrowed');
  const cases = reportCases(report);
  const expectedFiles=releaseScopeFiles(root,scope);
  const actualFiles=[...new Set(cases.map(({file})=>expectedFiles.find((path)=>path===file||path.endsWith('/'+file)||file.endsWith('/'+path))??file))].sort();
  if(JSON.stringify(expectedFiles)!==JSON.stringify(actualFiles))failures.push('declared final scope omits a current spec file');
  if (cases.length !== run.testCount) failures.push('final test count differs');
  if(cases.filter(({results})=>results.length===1&&results[0].status==='passed').length!==run.passedTestCount||run.testCount-run.passedTestCount!==run.inapplicableTestCount)failures.push('passed and inapplicable execution counts differ');
  if (failures.length) throw new Error(failures.join('\n'));
  return { run, cases };
}
