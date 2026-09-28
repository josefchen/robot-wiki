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

const root = join(import.meta.dirname, '../..');
const entries = loadRlMotionContinuity(root);
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
  expect(domainPairsChecker.before.path)
    .toBe('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt');
  expect(domainPairsChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(proofReaderChecker.before.path)
    .toBe('audit/evidence/motion-proof-reader-efficiency-20260928/audit-local-basis-before.ts.txt');
  expect(proofReaderChecker.after.path).toBe('lib/audit-local-basis.ts');
  expect(articleTruthChecker.before.path)
    .toBe('audit/evidence/motion-article-truth-efficiency-20260928/audit-local-basis-before.ts.txt');
  expect(articleTruthChecker.after.path).toBe('lib/audit-local-basis.ts');
  for (const artifact of [checker.before, worldChecker.before, dataHardwareChecker.before,
    frontierChecker.before, domainPairsChecker.before, domainPairsChecker.after,
    proofReaderChecker.before, proofReaderChecker.after, articleTruthChecker.before, articleTruthChecker.after]) {
    const path = artifact === domainPairsChecker.after ? proofReaderChecker.before.path :
      artifact === proofReaderChecker.after ? articleTruthChecker.before.path : artifact.path;
    const bytes = readFileSync(join(root, path));
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
    'This authored fixed-transitions model is not a benchmark.',
    'This model is a measured benchmark.',
  ));
  expect(() => currentRlMotionArticle(destination, entries[0].historical, entries)).toThrow(/identity drift|artifact bytes\/hash/);
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
    'This authored fixed-transitions model is not a benchmark.', 'This model is a measured benchmark.',
  ));
  expect(() => verify(destination, 0)).toThrow(/identity drift|artifact bytes\/hash/);
  expect(() => verify(destination, 0, entries, new Map())).toThrow(/identity drift|artifact bytes\/hash/);
  writeFileSync(articlePath, original);
  const catalogPath = join(destination, 'audit/local-basis.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  writeFileSync(catalogPath, JSON.stringify({ ...catalog, proofs: [] }));
  expect(() => verify(destination, 0)).toThrow(/proof population drift/);
});
