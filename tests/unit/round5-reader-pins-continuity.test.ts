import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { round5FirstScreenCdCheckerPredecessor } from '../../lib/audit-round5-first-screen-cd-continuity.ts';
import {
  retainedRound5ReaderPinSource, round5ReaderPinEndpoint, round5ReaderPinsCheckerPredecessor,
} from '../../lib/audit-round5-reader-pins-continuity.ts';
import { round6RemainingRepairPredecessor } from '../../lib/audit-round6-remaining-repairs-continuity.ts';
import { preFigureMigration } from '../helpers/figure-migration';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round5-reader-pins-20260929/';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const industrialPacket = 'audit/evidence/industrial-release-20260924/corrections.json';
const classicalPacket = 'audit/evidence/classical-closure-20260923/corrections.json';

type Artifact = { path: string; bytes: number; sha256: string };
type Source = { name: string; before: Artifact; after: Artifact; consumers: string[] };
const review = JSON.parse(read(`${directory}source-transition.json`).toString()) as { sources: Source[] };
const endpoint = (source: Source): Artifact =>
  ({ path: source.after.path, bytes: source.before.bytes, sha256: source.before.sha256 });
// The round-6 remaining repairs later edited the citation chip and the
// citation-refresh spec, and the 2026-10-01 figure migration then edited both
// specs; their reviewed successors return this revision's output, which is
// what the reader-pins review still names.
const reviewedLive = (artifact: Artifact) =>
  round6RemainingRepairPredecessor(root, artifact, preFigureMigration(artifact));

const sourcePaths = [
  `${directory}source-transition.json`,
  ...review.sources.map((source) => source.before.path),
  industrialPacket,
  classicalPacket,
] as const;

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round5-reader-pins-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

it('returns each archived predecessor exactly where the correction records and their runs still point', () => {
  const reader = createLocalArtifactReader(root);
  const records = [
    ...JSON.parse(read(industrialPacket).toString()),
    ...JSON.parse(read(classicalPacket).toString()),
  ] as { id: string; dependencies: Artifact[] }[];
  expect(review.sources.map((source) => source.name)).toEqual([
    'control-spec-hydrated-instrument', 'citation-refresh-instrument-frame', 'references-author-id',
    'cite-single-open-tooltip', 'term-overflow-keys',
  ]);
  for (const source of review.sources) {
    const live = reviewedLive(source.after);
    const archived = read(source.before.path);
    expect({ bytes: archived.length, sha256: digest(archived) })
      .toEqual({ bytes: source.before.bytes, sha256: source.before.sha256 });
    expect({ bytes: live.length, sha256: digest(live) })
      .toEqual({ bytes: source.after.bytes, sha256: source.after.sha256 });
    expect(round5ReaderPinEndpoint(endpoint(source))).toBe(true);
    expect(round5ReaderPinEndpoint({ path: source.after.path, bytes: live.length, sha256: digest(live) })).toBe(false);
    expect(retainedRound5ReaderPinSource(root, source.after.path, live)).toEqual(archived);
    expect(reader(endpoint(source))).toEqual(archived);
    expect(records.filter((record) => record.dependencies.some((dependency) =>
      JSON.stringify(dependency) === JSON.stringify(endpoint(source)))).map((record) => record.id))
      .toEqual(source.consumers);
  }
  const industrialRun = JSON.parse(read('audit/evidence/industrial-release-20260924/browser-run.json').toString());
  const controlRun = JSON.parse(read('audit/evidence/control-citation-closeout-20260924/reader-run.json').toString());
  expect(industrialRun.test).toEqual(endpoint(review.sources[1]));
  expect(controlRun.test).toEqual(endpoint(review.sources[0]));
  expect(reader(industrialRun.test)).toEqual(read(review.sources[1].before.path));
  expect(reader(controlRun.test)).toEqual(read(review.sources[0].before.path));
});

it('keeps every recorded check in the specs and only inserts reader code in the components', () => {
  const assertions = (text: string) => text.split('\n').filter((line) => line.includes('expect(')).length;
  const once = (text: string, line: string) => text.split(line).length === 2;
  const [control, refresh, ...components] = review.sources;
  const controlBefore = read(control.before.path).toString();
  const controlAfter = reviewedLive(control.after).toString();
  expect(assertions(controlAfter)).toBe(assertions(controlBefore));
  for (const line of [
    "      await expect(page.locator('[data-cite-id=\"astrom-murray-2008\"]')).toHaveCount(0);",
    "      await expect(page.locator('[data-cite-id=\"kalman-1960\"]')).toHaveCount(0);",
    "      await expect(zn).toHaveAttribute('href', 'https://doi.org/10.1115/1.2899060');",
    "      await expect(lqr).toHaveAttribute('href', 'https://underactuated.mit.edu/');",
  ]) {
    expect(once(controlBefore, line) && once(controlAfter, line)).toBe(true);
  }
  const refreshBefore = read(refresh.before.path).toString();
  const refreshAfter = reviewedLive(refresh.after).toString();
  expect(assertions(refreshAfter)).toBe(assertions(refreshBefore));
  expect(refreshAfter.split('\n').length).toBe(refreshBefore.split('\n').length);
  expect(refreshBefore.split('\n').filter((line, index) => line !== refreshAfter.split('\n')[index]))
    .toEqual(["  return page.locator('div.prose > div.rounded-md:has([data-testid=\"payback-months\"])');"]);
  for (const component of components) {
    const before = read(component.before.path).toString().split('\n');
    const after = reviewedLive(component.after).toString().split('\n');
    let cursor = 0;
    for (const line of after) if (line === before[cursor]) cursor += 1;
    expect(cursor).toBe(before.length);
    expect(after.length).toBeGreaterThan(before.length);
  }
});

it.each(['wrong-edit', 'dropped-assertion', 'missing-review', 'missing-snapshot', 'corrupt-snapshot',
  'wrong-before-hash', 'wrong-after-hash', 'wrong-name', 'future-observation', 'short-rationale',
  'dropped-source', 'wrong-consumers', 'consumer-population', 'unknown-path'] as const)(
  'rejects a %s reader-pin successor', mutation => {
    const destination = copied(sourcePaths);
    try {
      const source = review.sources[0];
      const live = reviewedLive(source.after);
      expect(retainedRound5ReaderPinSource(destination, source.after.path, live)).toEqual(read(source.before.path));
      const reviewPath = join(destination, `${directory}source-transition.json`);
      let candidate = live;
      let path = source.after.path;
      if (mutation === 'wrong-edit' || mutation === 'dropped-assertion') {
        candidate = Buffer.from(mutation === 'wrong-edit'
          ? live.toString().replace('    await waitForHydration(kd);\n', '')
          : live.toString().replace(
            "      await expect(page.locator('[data-cite-id=\"kalman-1960\"]')).toHaveCount(0);\n", ''));
        expect(candidate.toString()).not.toBe(live.toString());
      }
      if (mutation === 'missing-review') rmSync(reviewPath);
      if (mutation === 'missing-snapshot') rmSync(join(destination, source.before.path));
      if (mutation === 'corrupt-snapshot') writeFileSync(join(destination, source.before.path), 'corrupt');
      if (['wrong-before-hash', 'wrong-after-hash', 'wrong-name', 'future-observation', 'short-rationale',
        'dropped-source', 'wrong-consumers'].includes(mutation)) {
        const changed = JSON.parse(readFileSync(reviewPath, 'utf8'));
        if (mutation === 'wrong-before-hash') changed.sources[0].before.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-after-hash') changed.sources[0].after.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-name') changed.name = 'unreviewed-reader-edits';
        if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
        if (mutation === 'short-rationale') changed.rationale = 'Exact edits.';
        if (mutation === 'dropped-source') changed.sources.pop();
        if (mutation === 'wrong-consumers') changed.sources[0].consumers.pop();
        writeFileSync(reviewPath, JSON.stringify(changed));
      }
      if (mutation === 'consumer-population') {
        const packetPath = join(destination, classicalPacket);
        const records = JSON.parse(readFileSync(packetPath, 'utf8')) as { id: string; dependencies: Artifact[] }[];
        const record = records.find((entry) => entry.id === 'control-citation-removed-2-20260924')!;
        record.dependencies = record.dependencies.filter((dependency) => dependency.path !== source.after.path);
        writeFileSync(packetPath, JSON.stringify(records));
      }
      if (mutation === 'unknown-path') path = 'tests/e2e/classical-closure.spec.ts';
      expect(() => retainedRound5ReaderPinSource(destination, path, candidate))
        .toThrow(/round5 reader pins source continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);

it('rejects a pinned path whose recorded hash no reviewed predecessor carries', () => {
  const source = review.sources[3];
  expect(round5ReaderPinEndpoint({ ...endpoint(source), sha256: '0'.repeat(64) })).toBe(false);
  expect(() => createLocalArtifactReader(root)({ ...endpoint(source), sha256: '0'.repeat(64) })).toThrow();
});

it('admits only the exact named reader revision above the round5 first-screen cd head', () => {
  // This revision's output is now preserved as the input of the later
  // round6 kinematics reader revision, which the live checker reaches first.
  const reviewedAfter = read('audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt');
  expect(reviewedAfter.length).toBe(113447);
  expect(digest(reviewedAfter)).toBe('0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756');
  const live = read('lib/audit-local-basis.ts');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(archived.length).toBe(113223);
  expect(digest(archived)).toBe('4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69');
  expect(round5ReaderPinsCheckerPredecessor(root, reviewedAfter)).toEqual(archived);
  expect(round5ReaderPinsCheckerPredecessor(root, live)).toEqual(archived);
  expect(round5ReaderPinsCheckerPredecessor(root, archived)).toEqual(archived);
  const cdArchived = read('audit/evidence/motion-round5-first-screen-cd-20260929/audit-local-basis-before.ts.txt');
  expect(round5ReaderPinsCheckerPredecessor(root, cdArchived)).toEqual(cdArchived);
  expect(round5FirstScreenCdCheckerPredecessor(root, live)).toEqual(cdArchived);
  const branch = '  if (round5ReaderPinEndpoint(ref)) {\n    return retainedRound5ReaderPinSource(root, ref.path, current);\n  }\n';
  const importLine = "import { retainedRound5ReaderPinSource, round5ReaderPinEndpoint } from './audit-round5-reader-pins-continuity.ts';\n";
  expect(reviewedAfter.toString().split(branch).length).toBe(2);
  expect(reviewedAfter.toString().replace(branch, '').replace(importLine, '')).toBe(archived.toString());
  for (const changed of [Buffer.concat([reviewedAfter, Buffer.from('\n')]),
    Buffer.from(reviewedAfter.toString().replace(branch, ''))]) {
    expect(() => round5ReaderPinsCheckerPredecessor(root, changed)).toThrow(
      /figure migration checker continuity drift/,
    );
  }
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash', 'wrong-name', 'future-observation'] as const)(
  'rejects %s in the reader-pins checker transition', mutation => {
    const reviewPath = `${directory}checker-transition.json`;
    const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
    const destination = copied([reviewPath, predecessorPath,
      'audit/evidence/motion-round6-kinematics-reader-20260929/checker-transition.json',
      'audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-prose-restores-20260929/checker-transition.json',
      'audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/checker-transition.json',
      'audit/evidence/motion-round6-remaining-repairs-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/classical-closure-evidence-before.test.ts.txt',
      'audit/evidence/figure-migration-20261001/checker-transition.json',
      'audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt',
      'audit/evidence/seo-pass-20261002/checker-transition.json',
      'audit/evidence/domain-pass-20261006/checker-transition.json']);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(round5ReaderPinsCheckerPredecessor(destination, live)).toEqual(read(predecessorPath));
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
      expect(() => round5ReaderPinsCheckerPredecessor(destination, live))
        .toThrow(/round5 reader pins checker continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
