import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { round5ReaderPinsCheckerPredecessor } from '../../lib/audit-round5-reader-pins-continuity.ts';
import {
  retainedRound6KinematicsReaderSource, round6KinematicsReaderCheckerPredecessor, round6KinematicsReaderEndpoint,
} from '../../lib/audit-round6-kinematics-reader-continuity.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round6-kinematics-reader-20260929/';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const catalogPath = 'audit/local-basis.json';

type Artifact = { path: string; bytes: number; sha256: string };
type Source = { name: string; before: Artifact; after: Artifact; consumers: string[] };
type Catalog = { proofs: { id: string; artifacts: { file: Artifact }[]; provenance: { test: Artifact } }[] };
const review = JSON.parse(read(`${directory}source-transition.json`).toString()) as { sources: Source[] };
const [source] = review.sources;
const endpoint: Artifact = { path: source.after.path, bytes: source.before.bytes, sha256: source.before.sha256 };
const sameArtifact = (artifact: Artifact) => JSON.stringify(artifact) === JSON.stringify(endpoint);

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round6-kinematics-reader-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

it('returns the archived spec exactly where the 37 closure proofs and their run still point', () => {
  const live = read(source.after.path);
  const archived = read(source.before.path);
  expect(review.sources.map((entry) => entry.name)).toEqual(['kinematics-spec-exact-reset-hydrated']);
  expect({ bytes: archived.length, sha256: digest(archived) })
    .toEqual({ bytes: source.before.bytes, sha256: source.before.sha256 });
  expect({ bytes: live.length, sha256: digest(live) })
    .toEqual({ bytes: source.after.bytes, sha256: source.after.sha256 });
  expect(round6KinematicsReaderEndpoint(endpoint)).toBe(true);
  expect(round6KinematicsReaderEndpoint({ path: source.after.path, bytes: live.length, sha256: digest(live) }))
    .toBe(false);
  expect(retainedRound6KinematicsReaderSource(root, source.after.path, live)).toEqual(archived);
  expect(createLocalArtifactReader(root)(endpoint)).toEqual(archived);
  const catalog = JSON.parse(read(catalogPath).toString()) as Catalog;
  const artifactPins = catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) => sameArtifact(file)));
  const testPins = catalog.proofs.filter((proof) => sameArtifact(proof.provenance.test));
  expect(artifactPins.map((proof) => proof.id)).toEqual(source.consumers);
  expect(testPins.map((proof) => proof.id)).toEqual(source.consumers);
  expect(source.consumers).toHaveLength(37);
  for (const proof of artifactPins) {
    const run = JSON.parse(read(`audit/evidence/classical-closure-20260923/${proof.id}.run.json`).toString());
    expect(run.test).toEqual(endpoint);
  }
});

it('keeps every recorded check and changes only the reset locators and readiness waits', () => {
  const assertions = (text: string) => text.split('\n').filter((line) => line.includes('expect(')).length;
  const before = read(source.before.path).toString();
  const after = read(source.after.path).toString();
  expect(assertions(after)).toBe(assertions(before));
  const inserted = [
    "import { waitForHydration } from './interaction-ready';",
    '    // A fiber can attach before Next commits the initial route, and a slider',
    '    // event dispatched in that window is lost.',
    '    await page.waitForFunction(() => history.state !== null);',
    '    await waitForHydration(base);',
  ];
  for (const line of inserted) {
    expect(before.split(`${line}\n`).length).toBe(1);
    expect(after.split(`${line}\n`).length).toBe(2);
  }
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n').filter((line) => !inserted.includes(line));
  expect(afterLines).toHaveLength(beforeLines.length);
  expect(beforeLines.filter((line, index) => line !== afterLines[index])).toEqual([
    "    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();",
    "    await page.getByRole('button', { name: /reset/i }).click();",
  ]);
  expect(afterLines.filter((line, index) => line !== beforeLines[index])).toEqual([
    "    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();",
    "    await page.getByRole('button', { name: 'Reset', exact: true }).click();",
  ]);
});

it.each(['wrong-edit', 'dropped-assertion', 'missing-review', 'missing-snapshot', 'corrupt-snapshot',
  'wrong-before-hash', 'wrong-after-hash', 'wrong-name', 'future-observation', 'short-rationale',
  'extra-source', 'wrong-consumers', 'artifact-population', 'test-population', 'unknown-path'] as const)(
  'rejects a %s kinematics reader successor', mutation => {
    const destination = copied([`${directory}source-transition.json`, source.before.path, catalogPath]);
    try {
      const live = read(source.after.path);
      expect(retainedRound6KinematicsReaderSource(destination, source.after.path, live))
        .toEqual(read(source.before.path));
      const reviewPath = join(destination, `${directory}source-transition.json`);
      let candidate = live;
      let path = source.after.path;
      if (mutation === 'wrong-edit' || mutation === 'dropped-assertion') {
        candidate = Buffer.from(mutation === 'wrong-edit'
          ? live.toString().replace('    await waitForHydration(base);\n', '')
          : live.toString().replace(
            "    await expect(page.getByTestId('perception-budget')).not.toContainText('will jam');\n", ''));
        expect(candidate.toString()).not.toBe(live.toString());
      }
      if (mutation === 'missing-review') rmSync(reviewPath);
      if (mutation === 'missing-snapshot') rmSync(join(destination, source.before.path));
      if (mutation === 'corrupt-snapshot') writeFileSync(join(destination, source.before.path), 'corrupt');
      if (['wrong-before-hash', 'wrong-after-hash', 'wrong-name', 'future-observation', 'short-rationale',
        'extra-source', 'wrong-consumers'].includes(mutation)) {
        const changed = JSON.parse(readFileSync(reviewPath, 'utf8'));
        if (mutation === 'wrong-before-hash') changed.sources[0].before.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-after-hash') changed.sources[0].after.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-name') changed.name = 'unreviewed-kinematics-edits';
        if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
        if (mutation === 'short-rationale') changed.rationale = 'Exact edits.';
        if (mutation === 'extra-source') changed.sources.push(structuredClone(changed.sources[0]));
        if (mutation === 'wrong-consumers') changed.sources[0].consumers.pop();
        writeFileSync(reviewPath, JSON.stringify(changed));
      }
      if (mutation === 'artifact-population' || mutation === 'test-population') {
        const catalog = JSON.parse(readFileSync(join(destination, catalogPath), 'utf8')) as Catalog;
        const proof = catalog.proofs.find((entry) => entry.id === 'p7-observed-reset')!;
        if (mutation === 'artifact-population') {
          proof.artifacts = proof.artifacts.filter(({ file }) => !sameArtifact(file));
        } else {
          proof.provenance.test = { ...proof.provenance.test, sha256: '0'.repeat(64) };
        }
        writeFileSync(join(destination, catalogPath), JSON.stringify(catalog));
      }
      if (mutation === 'unknown-path') path = 'tests/e2e/classical-closure.spec.ts';
      expect(() => retainedRound6KinematicsReaderSource(destination, path, candidate))
        .toThrow(/round6 kinematics reader source continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);

it('reuses only the parse of unchanged catalog bytes across calls', () => {
  const destination = copied([`${directory}source-transition.json`, source.before.path, catalogPath]);
  try {
    const live = read(source.after.path);
    const cache = new Map<string, unknown>();
    expect(retainedRound6KinematicsReaderSource(destination, source.after.path, live, cache))
      .toEqual(read(source.before.path));
    expect(cache.size).toBe(1);
    expect(retainedRound6KinematicsReaderSource(destination, source.after.path, live, cache))
      .toEqual(read(source.before.path));
    const catalog = JSON.parse(readFileSync(join(destination, catalogPath), 'utf8')) as Catalog;
    const proof = catalog.proofs.find((entry) => entry.id === 'rrt15-observed-opening')!;
    proof.artifacts = proof.artifacts.filter(({ file }) => !sameArtifact(file));
    writeFileSync(join(destination, catalogPath), JSON.stringify(catalog));
    expect(() => retainedRound6KinematicsReaderSource(destination, source.after.path, live, cache))
      .toThrow(/round6 kinematics reader source continuity drift/);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});

it('rejects a pinned spec whose recorded hash no reviewed predecessor carries', () => {
  expect(round6KinematicsReaderEndpoint({ ...endpoint, sha256: '0'.repeat(64) })).toBe(false);
  expect(() => createLocalArtifactReader(root)({ ...endpoint, sha256: '0'.repeat(64) })).toThrow();
});

it('admits only the exact kinematics reader revision above the round5 reader-pins head', () => {
  // This revision's output is now preserved as the input of the later
  // round6 prose-restores reader revision, which the live checker reaches first.
  const reviewedAfter = read('audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt');
  expect(reviewedAfter.length).toBe(113723);
  expect(digest(reviewedAfter)).toBe('ab4e3d50ed3961a293d1e8b8a664d8e8de1f2f1e5cd93ee08785d5402a9465c6');
  const live = read('lib/audit-local-basis.ts');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(archived.length).toBe(113447);
  expect(digest(archived)).toBe('0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756');
  expect(round6KinematicsReaderCheckerPredecessor(root, reviewedAfter)).toEqual(archived);
  expect(round6KinematicsReaderCheckerPredecessor(root, live)).toEqual(archived);
  expect(round6KinematicsReaderCheckerPredecessor(root, archived)).toEqual(archived);
  const readerPinsArchived = read('audit/evidence/motion-round5-reader-pins-20260929/audit-local-basis-before.ts.txt');
  expect(round6KinematicsReaderCheckerPredecessor(root, readerPinsArchived)).toEqual(readerPinsArchived);
  expect(round5ReaderPinsCheckerPredecessor(root, live)).toEqual(readerPinsArchived);
  const branch = '  if (round6KinematicsReaderEndpoint(ref)) {\n' +
    '    return retainedRound6KinematicsReaderSource(root, ref.path, current, parsedInputCache);\n  }\n';
  const importLine = "import { retainedRound6KinematicsReaderSource, round6KinematicsReaderEndpoint } from './audit-round6-kinematics-reader-continuity.ts';\n";
  expect(reviewedAfter.toString().split(branch).length).toBe(2);
  expect(reviewedAfter.toString().replace(branch, '').replace(importLine, '')).toBe(archived.toString());
  for (const changed of [Buffer.concat([reviewedAfter, Buffer.from('\n')]),
    Buffer.from(reviewedAfter.toString().replace(branch, ''))]) {
    expect(() => round6KinematicsReaderCheckerPredecessor(root, changed)).toThrow(
      /figure migration checker continuity drift/,
    );
  }
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash', 'wrong-name', 'future-observation'] as const)(
  'rejects %s in the kinematics reader checker transition', mutation => {
    const reviewPath = `${directory}checker-transition.json`;
    const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
    const destination = copied([reviewPath, predecessorPath,
      'audit/evidence/motion-round6-prose-restores-20260929/checker-transition.json',
      'audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/checker-transition.json',
      'audit/evidence/motion-round6-remaining-repairs-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/classical-closure-evidence-before.test.ts.txt',
      'audit/evidence/figure-migration-20261001/checker-transition.json',
      'audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt']);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(round6KinematicsReaderCheckerPredecessor(destination, live)).toEqual(read(predecessorPath));
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (!mutation.startsWith('missing') && mutation !== 'corrupt-predecessor') {
        const changed = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
        if (mutation === 'review-before-hash') changed.before.sha256 = '0'.repeat(64);
        if (mutation === 'review-after-hash') changed.after.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-name') changed.name = 'some-other-revision';
        if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
        writeFileSync(join(destination, reviewPath), JSON.stringify(changed));
      }
      expect(() => round6KinematicsReaderCheckerPredecessor(destination, live))
        .toThrow(/round6 kinematics reader checker continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
