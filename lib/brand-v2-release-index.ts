import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_V2_DEEP_ROWS, BRAND_V2_FLOW_SUITES, type BrandV2Registry } from './brand-v2-runners.ts';
import { marketMapStatePlan } from './brand-v2-market-map-states.ts';
import { SEARCH_STATE_IDS } from './brand-v2-search-evidence.ts';
import {
  interactiveLedgerPlan, interactiveLedgerEvidenceFingerprint, readInteractiveLedgerEvidence,
} from './brand-v2-interactive-ledger.ts';
import { readDeepReleaseArtifact } from './brand-v2-release-deep.ts';
import { readReleaseBuildStamp, RELEASE_BUILD_STAMP } from './brand-v2-release-build.ts';
import {
  RELEASE_EVIDENCE_DIRECTORY, RELEASE_PROFILES, ledgerReleaseStateIds,
  readReleaseStateArtifact, releaseArtifactHash, releaseSourceFingerprint,
  releaseMapShard,
} from './brand-v2-release-evidence.ts';

export const RELEASE_STATE_INDEX_PATH = `${RELEASE_EVIDENCE_DIRECTORY}/state-index.json`;

/** Re-read genuine observations; callers cannot supply statuses or a selected
 * subset. The canonical registry and validated keyboard ledger own the exact
 * populations. This command intentionally fails before final sweeps exist. */
export function collectReleaseStateIndex(root: string) {
  const fingerprint = releaseSourceFingerprint(root);
  const build = readReleaseBuildStamp(root);
  const registry = JSON.parse(readFileSync(join(root, 'contract/brand-v2-registries.json'), 'utf8')) as BrandV2Registry;
  if (registry.routes.public.length === 0 || registry.interactive.mounts.length === 0) throw new Error('release state index: empty canonical population');
  const groups: Array<{ group: string; path: string; sha256: string; stateIds: string[]; profileCount: number }> = [];
  const add = (group: string, stateIds: string[]) => {
    const artifact = readReleaseStateArtifact(root, group, stateIds, { source: fingerprint, exported: build.exportFingerprint });
    const path = `${RELEASE_EVIDENCE_DIRECTORY}/${group}.json`;
    groups.push({ group, path, sha256: releaseArtifactHash(root, path), stateIds: artifact.cases.map(({ id }) => id), profileCount: artifact.cases.reduce((count, row) => count + row.profiles.length, 0) });
  };
  for (const route of registry.routes.public) add(`route-${route.path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home'}`, [route.id]);
  add('search', SEARCH_STATE_IDS.map((id) => `search:${id}`));
  add('article-flows', registry.routes.public.filter(({ routeKind }) => routeKind === 'article').flatMap(({ path }) => BRAND_V2_FLOW_SUITES['brand-v2-article-interactions'].captures.map(({ id }) => `article:${path}:${id}`)));
  add('playground', ['playground:reduced-motion-live', ...BRAND_V2_FLOW_SUITES['brand-v2-playground-states'].captures.map(({ id }) => `playground:${id}`)]);
  add('deep-phases', BRAND_V2_DEEP_ROWS.flatMap(({ captures }) => captures.filter(({ kind }) => kind === 'bounded').map(({ id }) => `deep:${id}`)));
  const ledgerPlan = interactiveLedgerPlan(registry);
  const ledgerPath = 'evidence/brand-v2/interactive-ledger.json';
  const ledger = readInteractiveLedgerEvidence({
    artifact: JSON.parse(readFileSync(join(root, ledgerPath), 'utf8')),
    fingerprint: interactiveLedgerEvidenceFingerprint({ root, plan: ledgerPlan }), plan: ledgerPlan,
  });
  for (const observation of ledger.observations) {
    add(`interactive-${observation.mountId.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, ledgerReleaseStateIds(observation));
  }
  const mapPlan = marketMapStatePlan();
  const mapIds = mapPlan.cases.filter(({ kind }) => kind !== 'exception').map(({ id }) => `map:${id}`);
  const directory = join(root, RELEASE_EVIDENCE_DIRECTORY);
  if (existsSync(join(directory, 'market-map.json'))) add('market-map', mapIds);
  else {
    const shards = readdirSync(directory).map((name) => /^market-map-shard-(\d+)-of-(\d+)\.json$/.exec(name)).filter((match) => match !== null);
    const counts = [...new Set(shards.map((match) => Number(match[2])))];
    if (counts.length !== 1 || shards.length !== counts[0]) throw new Error('release state index: missing or inconsistent market-map shard population');
    for (let index = 1; index <= counts[0]; index += 1) {
      const shard = releaseMapShard(`${index}/${counts[0]}`, mapIds);
      add(shard.group, shard.stateIds);
    }
  }
  const wanted = new Set(groups.map(({ path }) => path));
  for (const name of readdirSync(join(root, RELEASE_EVIDENCE_DIRECTORY))) {
    if (/^(route-|interactive-|market-map)/.test(name) && name.endsWith('.json') && !name.endsWith('.failed.json') && !wanted.has(`${RELEASE_EVIDENCE_DIRECTORY}/${name}`)) throw new Error(`release state index: unregistered state artifact ${name}`);
  }
  const deep = BRAND_V2_DEEP_ROWS.map((row) => {
    const path = `${RELEASE_EVIDENCE_DIRECTORY}/deep/${row.id}.json`;
    const artifact = readDeepReleaseArtifact(root, row, fingerprint, build.exportFingerprint, JSON.parse(readFileSync(join(root, path), 'utf8')));
    const expectedShotPaths = artifact.payload.screenshotPaths;
    const payload = artifact.payload;
    return { id: row.id, path, sha256: releaseArtifactHash(root, path), renderedRoute: artifact.renderedRoute, screenshotPaths: expectedShotPaths, anchors: payload.anchors };
  });
  if (releaseSourceFingerprint(root) !== fingerprint) throw new Error('release evidence source changed while the index was being checked');
  return { version: 1, sourceFingerprint: fingerprint, exportFingerprint: build.exportFingerprint,
    build: { path: RELEASE_BUILD_STAMP, sha256: releaseArtifactHash(root, RELEASE_BUILD_STAMP) }, profiles: RELEASE_PROFILES, groups, deep,
    keyboardLedger: { path: ledgerPath, sha256: releaseArtifactHash(root, ledgerPath) },
    counts: { routes: registry.routes.public.length, interactiveMounts: ledger.observations.length, mapCases: mapPlan.cases.filter(({ kind }) => kind !== 'exception').length,
      deepRows: deep.length, states: groups.reduce((count, group) => count + group.stateIds.length, 0), profileReadings: groups.reduce((count, group) => count + group.profileCount, 0) } };
}

export function readReleaseStateIndex(root: string) {
  const expected = collectReleaseStateIndex(root);
  const path = join(root, RELEASE_STATE_INDEX_PATH);
  if (!existsSync(path) || JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))) !== JSON.stringify(expected)) throw new Error('release state index is missing or stale');
  return expected;
}
export type ReleaseStateIndex = ReturnType<typeof collectReleaseStateIndex>;
