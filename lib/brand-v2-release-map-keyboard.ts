import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { expectedCountText, expectedSearchParams, MARKET_MAP_DEFAULT_VIEW, type MarketMapFilters, type MarketMapStatePlan } from './brand-v2-market-map-states.ts';
import { releaseMapShard, mapReleaseStateIds } from './brand-v2-release-evidence.ts';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
export const RELEASE_MAP_KEYBOARD_DIRECTORY = 'evidence/brand-v2/release';
const groups = new Set(['default-reset', 'views', 'single-options', 'dependent-options', 'pairwise', 'higher-order', 'states']);
export function releaseMapKeyboardCaseIds(plan: MarketMapStatePlan): string[] {
  return plan.cases.filter(c => c.kind !== 'exception' && groups.has(c.group)).map(c => c.id);
}
const text = z.string();
const record = z.record(text, text);
const step = z.object({
  step: text.min(1),
  keys: z.array(text.min(1)),
  focusAfter: text,
  expectedText: text,
  text,
  mutations: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative().nullable(),
  inKeyTask: z.boolean().nullable(),
  params: record,
  state: record
}).strict();
export const releaseMapKeyboardSchema = z.object({
  version: z.literal(1),
  sourceFingerprint: text.regex(/^[a-f0-9]{64}$/),
  exportFingerprint: text.regex(/^[a-f0-9]{64}$/),
  caseIds: z.array(text.min(1)).min(1),
  records: z.array(z.object({
    caseId: text.min(1),
    region: z.object({
      role: text.nullable(),
      ariaLive: text.nullable(),
      ariaAtomic: text.nullable(),
      sameNodeThroughout: z.boolean()
    }).strict(),
    startFocus: text,
    steps: z.array(step).min(1),
    announcements: z.array(text)
  }).strict()).min(1)
}).strict();
export type ReleaseMapKeyboardArtifact = z.infer<typeof releaseMapKeyboardSchema>;
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
export function validateReleaseMapKeyboard(input: unknown, expected: {
  source: string;
  exported: string;
  caseIds: readonly string[];
}): ReleaseMapKeyboardArtifact {
  const data = releaseMapKeyboardSchema.parse(input);
  if (data.sourceFingerprint !== expected.source || data.exportFingerprint !== expected.exported) throw Error('stale map keyboard source/export');
  if (!expected.caseIds.length || !same(data.caseIds, expected.caseIds) || !same(data.records.map(r => r.caseId), expected.caseIds)) throw Error('missing, extra or duplicate map keyboard case');
  return data;
}
function filtersOf(params: Record<string, string>): MarketMapFilters {
  const allowed = ['segment', 'subSegment', 'country', 'status', 'approach', 'openSource', 'confidence', 'q', 'view'];
  for (const key of Object.keys(params)) if (!allowed.includes(key)) throw Error('unrecognized map URL state ' + key);
  return Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'view').map(([key, value]) => [key === 'q' ? 'query' : key, value])) as MarketMapFilters;
}
export function mapKeyboardRecordFailures(row: ReleaseMapKeyboardArtifact['records'][number], plan: MarketMapStatePlan): string[] {
  const target = plan.cases.find(c => c.id === row.caseId);
  if (!target || !releaseMapKeyboardCaseIds(plan).includes(row.caseId)) throw Error('unplanned map keyboard record');
  const failures: string[] = [];
  // WAI-ARIA status has implicit polite/atomic semantics. Preserve null in
  // the raw record instead of inventing a literal attribute; an explicit
  // contradictory value still fails.
  if (row.region.role !== 'status' || row.region.ariaLive !== null && row.region.ariaLive !== 'polite' || row.region.ariaAtomic !== null && row.region.ariaAtomic !== 'true' || !row.region.sameNodeThroughout) failures.push('result-count region lacks stable status/polite/atomic semantics');
  if (!row.steps.length && target.kind !== 'default') failures.push('changed map case has no actual action readings');
  let announcementOffset = 0;
  let previousCount: string | null = null;
  for (const action of row.steps) {
    if (!action.keys.length && target.kind !== 'default') failures.push(action.step + ': no actual keyboard input');
    if (!action.focusAfter.trim()) failures.push(action.step + ': focus location missing');
    let expected: string;
    try {
      expected = expectedCountText(filtersOf(action.params));
    } catch (e) {
      failures.push(String(e));
      continue;
    }
    if (action.expectedText !== expected || action.text !== expected) failures.push(action.step + ': count does not match canonical companies and URL filters');
    if (action.latencyMs !== null && action.latencyMs > 10000) failures.push(action.step + ': count update exceeded limit');
    if (action.mutations > 0 && action.inKeyTask !== true) failures.push(action.step + ': count update was not in the key event task');
    if (action.mutations > 0 && action.latencyMs === null) failures.push(action.step + ': changed count has no measured latency');
    const announced = row.announcements.slice(announcementOffset, announcementOffset + action.mutations);
    announcementOffset += action.mutations;
    if (announced.length !== action.mutations || announced.some(value => value !== action.text)) failures.push(action.step + ': announcement text/order differs from the count mutation');
    if (previousCount !== null && previousCount !== action.text && action.mutations === 0) failures.push(action.step + ': changed result count emitted no live-region mutation');
    previousCount = action.text;
  }
  if (announcementOffset !== row.announcements.length) failures.push('unbound or missing count announcements');
  const last = row.steps.at(-1);
  if (last) {
    const wanted = expectedSearchParams(target.filters ?? {}, target.view ?? MARKET_MAP_DEFAULT_VIEW);
    if (JSON.stringify(Object.entries(last.params).sort()) !== JSON.stringify(Object.entries(wanted).sort())) failures.push('final keyboard state differs from the independently planned filters/view');
  }
  return failures;
}
export function readReleaseMapKeyboard(root: string, plan: MarketMapStatePlan) {
  const build = readReleaseBuildStamp(root);
  const dir = join(root, RELEASE_MAP_KEYBOARD_DIRECTORY);
  const all = releaseMapKeyboardCaseIds(plan);
  const names = readdirSync(dir);
  const full = names.includes('map-keyboard.json');
  const shards = names.map(name => /^map-keyboard-shard-(\d+)-of-(\d+)\.json$/.exec(name)).filter(m => m !== null);
  if (full && shards.length) throw Error('mixed full and sharded map keyboard evidence');
  const artifacts: Array<{
    path: string;
    artifact: ReleaseMapKeyboardArtifact;
  }> = [];
  const read = (name: string, ids: string[]) => {
    const path = RELEASE_MAP_KEYBOARD_DIRECTORY + '/' + name;
    artifacts.push({
      path,
      artifact: validateReleaseMapKeyboard(JSON.parse(readFileSync(join(root, path), 'utf8')), {
        source: build.sourceAfter,
        exported: build.exportFingerprint,
        caseIds: ids
      })
    });
  };
  if (full) read('map-keyboard.json', all);else {
    const counts = [...new Set(shards.map(m => Number(m[2])))];
    if (counts.length !== 1 || shards.length !== counts[0]) throw Error('incomplete map keyboard shard set');
    const phaseIds = mapReleaseStateIds(plan.cases);
    for (let i = 1; i <= counts[0]; i++) {
      const stateIds = new Set(releaseMapShard(i + '/' + counts[0], phaseIds).stateIds);
      const wanted = all.filter(id => stateIds.has('map:' + id));
      const name = 'map-keyboard-shard-' + i + '-of-' + counts[0] + '.json';
      if (!existsSync(join(dir, name))) throw Error('missing map keyboard shard ' + name);
      read(name, wanted);
    }
  }
  const records = artifacts.flatMap(a => a.artifact.records.map(row => ({
    row,
    path: a.path
  })));
  if (!same(records.map(r => r.row.caseId), all)) throw Error('map keyboard shard union differs');
  return records.map(({
    row,
    path
  }) => ({
    id: 'map-keyboard:' + row.caseId,
    failures: mapKeyboardRecordFailures(row, plan),
    observed: row,
    evidencePaths: [path]
  }));
}
