import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
  expect(before).toEqual(readFileSync(join(root, 'audit/evidence/industrial-release-20260924/dependency-review.json')));
  const checker = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-rl-sim2real-20260927/checker-transition.json'), 'utf8'));
  for (const artifact of [checker.before, checker.after]) {
    const bytes = readFileSync(join(root, artifact.path));
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
