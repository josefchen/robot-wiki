import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  currentRlMotionArticle,
  loadRlMotionContinuity,
  parseRlMotionContinuity,
  rlMotionContinuityDigest,
} from '../../lib/audit-rl-motion-continuity.ts';
import { preDomainPass, preSeoPass } from '../helpers/seo-pass.ts';

const root = join(import.meta.dirname, '../..');
const entries = loadRlMotionContinuity(root);
// The 2026-10-01 figure migration later edited three of these articles; the
// reader hands this review their archived predecessors.
const figureMigrationReview = 'audit/evidence/figure-migration-20261001/source-transition.json';
const figureMigrationArchives = (JSON.parse(readFileSync(join(root, figureMigrationReview), 'utf8')) as {
  sources: { before: { path: string }; after: { path: string } }[];
}).sources.filter((source) => entries.some((entry) => entry.current.path === source.after.path))
  .map((source) => source.before.path);
const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
  const destination = mkdtempSync(join(tmpdir(), 'rl-motion-continuity-'));
  temporary.push(destination);
  for (const path of [
    'audit/local-basis.json',
    'audit/evidence/motion-rl-sim2real-20260927/continuity.json',
    'audit/evidence/motion-round5-first-screen-cd-20260929/first-screen-transition.json',
    'audit/evidence/motion-round5-first-screen-cd-20260929/parallel-sim-rl-first-screen-before.mdx',
    'audit/evidence/motion-round5-first-screen-cd-20260929/legged-locomotion-first-screen-before.mdx',
    figureMigrationReview,
    ...figureMigrationArchives,
    // The SEO pass rebuilds its predecessors from these reviews.
    'audit/evidence/seo-pass-20261002/source-transition.json',
    'audit/evidence/seo-pass-20261002/checker-transition.json',
    'audit/evidence/domain-pass-20261006/checker-transition.json',
    'audit/evidence/domain-pass-20261006/source-transition.json',
    ...entries.flatMap((entry) => [entry.snapshot.path, entry.current.path]),
  ]) {
    const to = join(destination, path);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(root, path), to);
  }
  return destination;
}

it('retains all four exact historical articles and independently pins active disclosures', () => {
  expect(entries.map((entry) => entry.proofIds.length)).toEqual([13, 10, 22, 14]);
  for (const entry of entries) {
    const old = currentRlMotionArticle(root, entry.historical, entries,
      entry.article.endsWith('sim2real-transfer.mdx')
        ? { path: entry.article, bytes: 21963, sha256: 'c8dc42be4c4d4557f585b0712b7bf43d873ada46f93c4d638101afb94b8b671c' }
        : entry.historical);
    expect(old).toEqual(readFileSync(join(root, entry.snapshot.path)));
    const { review, ...input } = entry;
    expect(rlMotionContinuityDigest(input)).toBe(review.inputDigest);
  }
  const before = readFileSync(join(root, 'audit/evidence/motion-rl-sim2real-20260927/dependency-review-before.json'));
  expect(before).toEqual(readFileSync(join(root, 'audit/evidence/motion-world-models-20260927/dependency-review-before.json')));
  const checker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-rl-sim2real-20260927/checker-transition.json'), 'utf8'));
  const worldChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-world-models-20260927/checker-transition.json'), 'utf8'));
  const dataHardwareChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-data-hardware-20260927/checker-transition.json'), 'utf8'));
  const frontierChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-frontier-adjacent-home-20260927/checker-transition.json'), 'utf8'));
  const domainPairsChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-domain-pairs-20260928/checker-transition.json'), 'utf8'));
  const proofReaderChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-proof-reader-efficiency-20260928/checker-transition.json'), 'utf8'));
  const articleTruthChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-article-truth-efficiency-20260928/checker-transition.json'), 'utf8'));
  const sharedUiChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-shared-ui-local-basis-20260928/checker-transition.json'), 'utf8'));
  const round5Checker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round5-pinned-leftovers-20260928/checker-transition.json'), 'utf8'));
  const round5CdChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round5-first-screen-cd-20260929/checker-transition.json'), 'utf8'));
  const readerPinsChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round5-reader-pins-20260929/checker-transition.json'), 'utf8'));
  const kinematicsChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round6-kinematics-reader-20260929/checker-transition.json'), 'utf8'));
  const proseRestoresChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round6-prose-restores-20260929/checker-transition.json'), 'utf8'));
  const remainingRepairsChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-round6-remaining-repairs-20260929/checker-transition.json'), 'utf8'));
  const figureMigrationChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/figure-migration-20261001/checker-transition.json'), 'utf8'));
  const seoPassChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/seo-pass-20261002/checker-transition.json'), 'utf8'));
  const domainPassChecker = JSON.parse(readFileSync(join(root,
    'audit/evidence/domain-pass-20261006/checker-transition.json'), 'utf8'));
  expect(checker.after.bytes).toBe(worldChecker.before.bytes);
  expect(checker.after.sha256).toBe(worldChecker.before.sha256);
  expect(worldChecker.after.bytes).toBe(dataHardwareChecker.before.bytes);
  expect(worldChecker.after.sha256).toBe(dataHardwareChecker.before.sha256);
  expect(dataHardwareChecker.after.bytes).toBe(frontierChecker.before.bytes);
  expect(dataHardwareChecker.after.sha256).toBe(frontierChecker.before.sha256);
  expect(frontierChecker.after.bytes).toBe(domainPairsChecker.before.bytes);
  expect(frontierChecker.after.sha256).toBe(domainPairsChecker.before.sha256);
  expect(domainPairsChecker.after.bytes).toBe(proofReaderChecker.before.bytes);
  expect(domainPairsChecker.after.sha256).toBe(proofReaderChecker.before.sha256);
  expect(proofReaderChecker.after.bytes).toBe(articleTruthChecker.before.bytes);
  expect(proofReaderChecker.after.sha256).toBe(articleTruthChecker.before.sha256);
  expect(articleTruthChecker.after.bytes).toBe(sharedUiChecker.before.bytes);
  expect(articleTruthChecker.after.sha256).toBe(sharedUiChecker.before.sha256);
  expect(sharedUiChecker.after.bytes).toBe(round5Checker.before.bytes);
  expect(sharedUiChecker.after.sha256).toBe(round5Checker.before.sha256);
  expect(round5Checker.after.bytes).toBe(round5CdChecker.before.bytes);
  expect(round5Checker.after.sha256).toBe(round5CdChecker.before.sha256);
  expect(round5CdChecker.after.bytes).toBe(readerPinsChecker.before.bytes);
  expect(round5CdChecker.after.sha256).toBe(readerPinsChecker.before.sha256);
  expect(readerPinsChecker.after.bytes).toBe(kinematicsChecker.before.bytes);
  expect(readerPinsChecker.after.sha256).toBe(kinematicsChecker.before.sha256);
  expect(kinematicsChecker.after.bytes).toBe(proseRestoresChecker.before.bytes);
  expect(kinematicsChecker.after.sha256).toBe(proseRestoresChecker.before.sha256);
  expect(proseRestoresChecker.after.bytes).toBe(remainingRepairsChecker.before.bytes);
  expect(proseRestoresChecker.after.sha256).toBe(remainingRepairsChecker.before.sha256);
  expect(remainingRepairsChecker.after.bytes).toBe(figureMigrationChecker.before.bytes);
  expect(remainingRepairsChecker.after.sha256).toBe(figureMigrationChecker.before.sha256);
  expect(figureMigrationChecker.after.bytes).toBe(seoPassChecker.before.bytes);
  expect(figureMigrationChecker.after.sha256).toBe(seoPassChecker.before.sha256);
  expect(seoPassChecker.after.bytes).toBe(domainPassChecker.before.bytes);
  expect(seoPassChecker.after.sha256).toBe(domainPassChecker.before.sha256);
  expect(domainPairsChecker.before.path)
    .toBe('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt');
  expect(domainPairsChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(proofReaderChecker.before.path)
    .toBe('audit/evidence/motion-proof-reader-efficiency-20260928/audit-local-basis-before.ts.txt');
  expect(proofReaderChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(articleTruthChecker.before.path)
    .toBe('audit/evidence/motion-article-truth-efficiency-20260928/audit-local-basis-before.ts.txt');
  expect(articleTruthChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(sharedUiChecker.before.path)
    .toBe('audit/evidence/motion-shared-ui-local-basis-20260928/audit-local-basis-before.ts.txt');
  expect(sharedUiChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(round5Checker.before.path)
    .toBe('audit/evidence/motion-round5-pinned-leftovers-20260928/audit-local-basis-before.ts.txt');
  expect(round5Checker.after.path).toBe('lib/audit-local-basis.ts');
  expect(round5CdChecker.before.path)
    .toBe('audit/evidence/motion-round5-first-screen-cd-20260929/audit-local-basis-before.ts.txt');
  expect(round5CdChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(readerPinsChecker.before.path)
    .toBe('audit/evidence/motion-round5-reader-pins-20260929/audit-local-basis-before.ts.txt');
  expect(readerPinsChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(kinematicsChecker.before.path)
    .toBe('audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt');
  expect(kinematicsChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(proseRestoresChecker.before.path)
    .toBe('audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt');
  expect(proseRestoresChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(remainingRepairsChecker.before.path)
    .toBe('audit/evidence/motion-round6-remaining-repairs-20260929/audit-local-basis-before.ts.txt');
  expect(remainingRepairsChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(figureMigrationChecker.before.path)
    .toBe('audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt');
  expect(figureMigrationChecker.after.path).toBe('lib/audit-local-basis.ts');
  // The SEO pass archives no checker copy: its predecessor, the figure
  // migration's endpoint, is rebuilt from the live checker.
  expect(seoPassChecker.before.path).toBe('lib/audit-local-basis.ts');
  expect(seoPassChecker.after.path).toBe('lib/audit-local-basis.ts');
  // Nor does the domain-pass revision: the SEO pass's endpoint is rebuilt
  // from the live checker as well.
  expect(domainPassChecker.before.path).toBe('lib/audit-local-basis.ts');
  expect(domainPassChecker.after.path).toBe('lib/audit-local-basis.ts');
  for (const artifact of [checker.before, worldChecker.before, dataHardwareChecker.before,
    frontierChecker.before, domainPairsChecker.before, domainPairsChecker.after,
    proofReaderChecker.before, proofReaderChecker.after, articleTruthChecker.before,
    articleTruthChecker.after, sharedUiChecker.before, sharedUiChecker.after,
    round5Checker.before, round5Checker.after, round5CdChecker.before, round5CdChecker.after,
    readerPinsChecker.before, readerPinsChecker.after, kinematicsChecker.before, kinematicsChecker.after,
    proseRestoresChecker.before, proseRestoresChecker.after,
    remainingRepairsChecker.before, remainingRepairsChecker.after,
    figureMigrationChecker.before, figureMigrationChecker.after,
    seoPassChecker.before, seoPassChecker.after, domainPassChecker.before, domainPassChecker.after]) {
    const path = artifact === domainPairsChecker.after ? proofReaderChecker.before.path :
      artifact === proofReaderChecker.after ? articleTruthChecker.before.path :
      artifact === articleTruthChecker.after ? sharedUiChecker.before.path :
      artifact === sharedUiChecker.after ? round5Checker.before.path :
      artifact === round5Checker.after ? round5CdChecker.before.path :
      artifact === round5CdChecker.after ? readerPinsChecker.before.path :
      artifact === readerPinsChecker.after ? kinematicsChecker.before.path :
      artifact === kinematicsChecker.after ? proseRestoresChecker.before.path :
      artifact === proseRestoresChecker.after ? remainingRepairsChecker.before.path :
      artifact === remainingRepairsChecker.after ? figureMigrationChecker.before.path : artifact.path;
    const bytes = artifact === figureMigrationChecker.after || artifact === seoPassChecker.before
      ? preSeoPass(path)
      : artifact === seoPassChecker.after || artifact === domainPassChecker.before
        ? preDomainPass(path) : readFileSync(join(root, path));
    expect(bytes.length).toBe(artifact.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(artifact.sha256);
  }
});

it('rejects population changes, unreviewed claims and active article drift', () => {
  expect(() => parseRlMotionContinuity({
    schemaVersion: 'motion-rl-sim2real-continuity-v1',
    entries: entries.slice(1),
  })).toThrow();
  const altered = structuredClone(entries);
  altered[0].proofIds.pop();
  expect(() => currentRlMotionArticle(root, altered[0].historical, altered)).toThrow(/proof population/);
  const changed = structuredClone(entries);
  changed[0].requiredPresent.push('unreviewed new claim');
  expect(() => currentRlMotionArticle(root, changed[0].historical, changed)).toThrow();
  const destination = fixture();
  const current = join(destination, entries[0].current.path);
  writeFileSync(current, readFileSync(current, 'utf8').replace(
    'The interactive scene is an unbenchmarked toy',
    'The interactive scene is a measured benchmark',
  ));
  expect(() => currentRlMotionArticle(destination, entries[0].historical, entries))
    .toThrow(/identity drift|artifact bytes\/hash|first-screen cd article continuity drift/);
});

it('rechecks each member, root and fresh article/catalog bytes with one parsed-input cache', () => {
  const cache = new Map<string, unknown>();
  const verify = (location: string, index: number, bindings = entries, shared = cache) =>
    currentRlMotionArticle(location, bindings[index].historical, bindings,
      bindings[index].historical, shared);
  expect(verify(root, 0)).toEqual(readFileSync(join(root, entries[0].snapshot.path)));
  expect(cache.has(resolve(root))).toBe(true);
  expect(verify(root, 1)).toEqual(readFileSync(join(root, entries[1].snapshot.path)));
  const wrongPopulation = structuredClone(entries);
  wrongPopulation[1].proofIds.pop();
  expect(() => verify(root, 1, wrongPopulation)).toThrow(/proof population drift/);
  const missingApproval = structuredClone(entries);
  missingApproval[1].review.inputDigest = '0'.repeat(64);
  expect(() => verify(root, 1, missingApproval)).toThrow(/review drift/);

  const destination = fixture();
  expect(verify(destination, 0)).toEqual(readFileSync(join(destination, entries[0].snapshot.path)));
  expect(cache.has(resolve(destination))).toBe(true);
  const articlePath = join(destination, entries[0].current.path);
  const original = readFileSync(articlePath);
  writeFileSync(articlePath, original.toString().replace(
    'The interactive scene is an unbenchmarked toy', 'The interactive scene is a measured benchmark',
  ));
  expect(() => verify(destination, 0))
    .toThrow(/identity drift|artifact bytes\/hash|first-screen cd article continuity drift/);
  expect(() => verify(destination, 0, entries, new Map()))
    .toThrow(/identity drift|artifact bytes\/hash|first-screen cd article continuity drift/);
  writeFileSync(articlePath, original);
  const catalogPath = join(destination, 'audit/local-basis.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  writeFileSync(catalogPath, JSON.stringify({ ...catalog, proofs: [] }));
  expect(() => verify(destination, 0)).toThrow(/proof population drift/);
});
