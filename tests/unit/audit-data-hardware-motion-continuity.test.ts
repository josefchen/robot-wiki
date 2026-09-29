import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  currentDataHardwareMotionArtifact, loadDataHardwareMotionReview, reviewedDataHardwareChecker,
} from '../../lib/audit-data-hardware-motion-continuity.ts';
import { retainedRound5FirstScreenArticle } from '../../lib/audit-round5-pinned-leftovers-continuity.ts';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { reviewedFrontierChecker } from '../../lib/audit-frontier-motion-continuity.ts';

const root = join(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-data-hardware-20260927/';
const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});
const put = (destination: string, path: string, bytes: Buffer | string) => {
  const target = join(destination, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
};
function fixture() {
  const destination = mkdtempSync(join(tmpdir(), 'data-hardware-motion-continuity-'));
  temporary.push(destination);
  const review = loadDataHardwareMotionReview(root);
  for (const path of [
    `${directory}continuity.json`, `${directory}checker-transition.json`,
    `${directory}audit-local-basis-before.ts.txt`, `${directory}dependency-review-before.json`,
    'audit/evidence/industrial-release-20260924/dependency-review.json',
    'audit/evidence/motion-round5-pinned-leftovers-20260928/first-screen-transition.json',
    'audit/evidence/motion-round5-pinned-leftovers-20260928/data-bottleneck-first-screen-before.mdx',
    'audit/evidence/motion-round5-pinned-leftovers-20260928/evaluation-crisis-first-screen-before.mdx',
    ...review.entries.flatMap(entry => [entry.snapshot.path, entry.current.path]),
  ]) {
    const target = join(destination, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, path), target);
  }
  return destination;
}

describe('data-hardware motion continuity', () => {
  it('checks exact active endpoints without relabelling four prior execution inputs', () => {
    const review = loadDataHardwareMotionReview(root);
    expect(review.entries).toHaveLength(4);
    for (const [index, entry] of review.entries.entries()) {
      const current = readFileSync(join(root, entry.current.path));
      // The 2026-09-28 pinned-leftover round moved the data-bottleneck and
      // evaluation-crisis first screens; those two live articles are gated by
      // the named successor chained on this unchanged review.
      const verify = index === 0 || index === 1
        ? retainedRound5FirstScreenArticle(root, index as 0 | 1, current)
        : currentDataHardwareMotionArtifact(root, index, current);
      expect(verify).toEqual(readFileSync(join(root, entry.snapshot.path)));
      if (index !== 2) expect(createLocalArtifactReader(root)(entry.before)).toEqual(
        readFileSync(join(root, entry.snapshot.path)));
    }
    expect(reviewedDataHardwareChecker(root, readFileSync(join(root,
      'audit/evidence/motion-frontier-adjacent-home-20260927/audit-local-basis-before.ts.txt')))).toBe(true);
    expect(reviewedFrontierChecker(root, readFileSync(join(root, 'lib/audit-local-basis.ts')))).toBe(true);
    expect(review.entries[0].requiredPresent).toContain(
      'Both the rate and target are authored hypothetical inputs. Neither measures DROID productivity or OXE duration.');
    expect(review.entries[1].requiredPresent).toContain(
      'These are methods for reducing the gaps, not guarantees that they are closed');
    expect(review.entries[2].requiredPresent).toContain(
      'Backlog means unperformed obligations under existing contracts, not revenue already earned.');
  });

  it('rejects changed article, locator, snapshot and predecessor review bytes', () => {
    for (const index of [0, 1, 2, 3]) {
      const destination = fixture();
      const review = loadDataHardwareMotionReview(destination);
      const entry = review.entries[index];
      const verify = (live: Buffer) => index === 0 || index === 1
        ? retainedRound5FirstScreenArticle(destination, index as 0 | 1, live)
        : currentDataHardwareMotionArtifact(destination, index, live);
      const changed = Buffer.concat([readFileSync(join(destination, entry.current.path)), Buffer.from('\nchanged')]);
      expect(() => verify(changed)).toThrow(/endpoint identity|first-screen article continuity/);
      put(destination, entry.current.path, changed);
      expect(() => createLocalArtifactReader(destination)(entry.before)).toThrow();
      put(destination, entry.current.path, readFileSync(join(root, entry.current.path)));
      put(destination, entry.snapshot.path, 'changed historical input');
      expect(() => verify(readFileSync(join(destination, entry.current.path)))).toThrow(/snapshot drift/);
      put(destination, 'audit/evidence/industrial-release-20260924/dependency-review.json', '{}');
      expect(() => loadDataHardwareMotionReview(destination)).toThrow(/predecessor drift/);
    }
  });

  it('rejects missing qualification and unreviewed checker revision', () => {
    const destination = fixture();
    const review = loadDataHardwareMotionReview(destination);
    review.entries[1].requiredPresent.push('unreviewed outcome claim');
    put(destination, `${directory}continuity.json`, JSON.stringify(review));
    expect(() => retainedRound5FirstScreenArticle(destination, 1,
      readFileSync(join(destination, review.entries[1].current.path)))).toThrow(/disclosure/);
    const checker = readFileSync(join(root, 'lib/audit-local-basis.ts'));
    expect(reviewedDataHardwareChecker(destination, Buffer.concat([checker, Buffer.from('\n')]))).toBe(false);
    put(destination, `${directory}audit-local-basis-before.ts.txt`, 'changed checker predecessor');
    expect(reviewedDataHardwareChecker(destination, checker)).toBe(false);
  });
});
