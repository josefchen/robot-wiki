import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  currentDataHardwareMotionArtifact, loadDataHardwareMotionReview, reviewedDataHardwareChecker,
} from '../../lib/audit-data-hardware-motion-continuity.ts';
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
      expect(currentDataHardwareMotionArtifact(root, index, current)).toEqual(
        readFileSync(join(root, entry.snapshot.path)));
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
      const changed = Buffer.concat([readFileSync(join(destination, entry.current.path)), Buffer.from('\nchanged')]);
      expect(() => currentDataHardwareMotionArtifact(destination, index, changed)).toThrow(/endpoint identity/);
      put(destination, entry.current.path, changed);
      expect(() => createLocalArtifactReader(destination)(entry.before)).toThrow();
      put(destination, entry.current.path, readFileSync(join(root, entry.current.path)));
      put(destination, entry.snapshot.path, 'changed historical input');
      expect(() => currentDataHardwareMotionArtifact(destination, index,
        readFileSync(join(destination, entry.current.path)))).toThrow(/snapshot drift/);
      put(destination, 'audit/evidence/industrial-release-20260924/dependency-review.json', '{}');
      expect(() => loadDataHardwareMotionReview(destination)).toThrow(/predecessor drift/);
    }
  });

  it('rejects missing qualification and unreviewed checker revision', () => {
    const destination = fixture();
    const review = loadDataHardwareMotionReview(destination);
    review.entries[1].requiredPresent.push('unreviewed outcome claim');
    put(destination, `${directory}continuity.json`, JSON.stringify(review));
    expect(() => currentDataHardwareMotionArtifact(destination, 1,
      readFileSync(join(destination, review.entries[1].current.path)))).toThrow(/disclosure/);
    const checker = readFileSync(join(root, 'lib/audit-local-basis.ts'));
    expect(reviewedDataHardwareChecker(destination, Buffer.concat([checker, Buffer.from('\n')]))).toBe(false);
    put(destination, `${directory}audit-local-basis-before.ts.txt`, 'changed checker predecessor');
    expect(reviewedDataHardwareChecker(destination, checker)).toBe(false);
  });
});
