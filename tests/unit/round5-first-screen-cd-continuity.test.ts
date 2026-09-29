import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { currentClassicalCorrectionArticle, loadClassicalCorrectionContinuity } from '../../lib/audit-classical-continuity.ts';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { loadRlMotionContinuity } from '../../lib/audit-rl-motion-continuity.ts';
import {
  retainedRound5FirstScreenCdArticle, round5FirstScreenCdCheckerPredecessor, round5FirstScreenCdEndpoint,
} from '../../lib/audit-round5-first-screen-cd-continuity.ts';
import { round5PinnedLeftoversCheckerPredecessor } from '../../lib/audit-round5-pinned-leftovers-continuity.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round5-first-screen-cd-20260929/';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const dependencyReviewPath = 'audit/evidence/industrial-release-20260924/dependency-review.json';

const moves = [
  {
    path: 'content/rl-sim2real/parallel-sim-rl.mdx',
    snapshot: `${directory}parallel-sim-rl-first-screen-before.mdx`,
    before: '<BatchScale className="my-6" />\n\n<TrainingTimeChart className="my-6" />',
    after: '<TrainingTimeChart className="my-6" />\n\n<BatchScale className="my-6" />',
  },
  {
    path: 'content/rl-sim2real/legged-locomotion.mdx',
    snapshot: `${directory}legged-locomotion-first-screen-before.mdx`,
    before: '<GaitSupport className="my-6" />\n\n<GaitDiagram className="my-6" />',
    after: '<GaitDiagram className="my-6" />\n\n<GaitSupport className="my-6" />',
  },
  {
    path: 'content/classical/kinematics.mdx',
    snapshot: `${directory}kinematics-first-screen-before.mdx`,
    before: '<FkChain className="my-6" />\n<PlanarFkArm className="my-6" />',
    after: '<PlanarFkArm className="my-6" />\n<FkChain className="my-6" />',
  },
  {
    path: 'content/classical/motion-planning.mdx',
    snapshot: `${directory}motion-planning-first-screen-before.mdx`,
    before: '<RrtGrowth className="my-6" />\n<RrtExplorer className="my-6" />',
    after: '<RrtExplorer className="my-6" />\n<RrtGrowth className="my-6" />',
  },
] as const;

const articlePaths = [
  `${directory}first-screen-transition.json`,
  ...moves.map((move) => move.snapshot),
  'audit/evidence/motion-rl-sim2real-20260927/continuity.json',
  'audit/evidence/motion-classical-20260927/continuity.json',
  dependencyReviewPath,
] as const;

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round5-first-screen-cd-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

function priorEndpoint(path: string) {
  const rl = loadRlMotionContinuity(root).find((entry) => entry.article === path);
  if (rl) return rl.current;
  const classical = loadClassicalCorrectionContinuity(root).find((entry) => entry.article === path);
  if (classical) return classical.current;
  const review = JSON.parse(read(dependencyReviewPath).toString()) as {
    bindings: { current: { path: string; bytes: number; sha256: string } }[];
  };
  return review.bindings.find((binding) => binding.current?.path === path)!.current;
}

it('returns each archived pre-move article exactly where its unchanged prior review still points', () => {
  for (const move of moves) {
    const live = read(move.path);
    const archived = read(move.snapshot);
    const endpoint = priorEndpoint(move.path);
    expect(endpoint).toEqual({ path: move.path, bytes: archived.length, sha256: digest(archived) });
    expect(round5FirstScreenCdEndpoint(endpoint)).toBe(true);
    expect(round5FirstScreenCdEndpoint({ path: move.path, bytes: live.length, sha256: digest(live) })).toBe(false);
    expect(live.length).toBe(archived.length);
    expect(archived.toString().replace(move.before, move.after)).toBe(live.toString());
    expect(retainedRound5FirstScreenCdArticle(root, move.path, live)).toEqual(archived);
    expect(createLocalArtifactReader(root)(endpoint)).toEqual(archived);
  }
});

it('keeps the historical references readable through the prior reviews', () => {
  const reader = createLocalArtifactReader(root);
  for (const entry of loadRlMotionContinuity(root)) {
    if (!moves.some((move) => move.path === entry.article)) continue;
    expect(reader(entry.historical)).toEqual(read(entry.snapshot.path));
  }
  const classical = loadClassicalCorrectionContinuity(root);
  const kinematics = classical.find((entry) => entry.article === 'content/classical/kinematics.mdx')!;
  expect(currentClassicalCorrectionArticle(root, kinematics.historical, classical))
    .toBe(read(`${directory}kinematics-first-screen-before.mdx`).toString());
  const review = JSON.parse(read(dependencyReviewPath).toString()) as {
    bindings: { historical: { path: string; bytes: number; sha256: string }; snapshot: { path: string } }[];
  };
  const planning = review.bindings.find((binding) =>
    binding.historical?.path === 'content/classical/motion-planning.mdx')!;
  expect(reader(planning.historical)).toEqual(read(planning.snapshot.path));
});

it.each(['reverted-move', 'dropped-citation', 'missing-review', 'missing-snapshot', 'corrupt-snapshot',
  'wrong-after-hash', 'wrong-name', 'prior-endpoint', 'preserved-text', 'unknown-article'] as const)(
  'rejects a %s first-screen cd successor', mutation => {
    const destination = copied(articlePaths);
    try {
      const move = mutation === 'prior-endpoint' || mutation === 'preserved-text' ? moves[3] : moves[0];
      const live = read(move.path);
      expect(retainedRound5FirstScreenCdArticle(destination, move.path, live)).toEqual(read(move.snapshot));
      const reviewPath = join(destination, `${directory}first-screen-transition.json`);
      let candidate = live;
      let path: string = move.path;
      if (mutation === 'reverted-move' || mutation === 'dropped-citation') {
        candidate = Buffer.from(mutation === 'reverted-move'
          ? live.toString().replace(move.after, move.before)
          : live.toString().replace(' <Cite id="rudin-2021" />', ''));
        expect(candidate.toString()).not.toBe(live.toString());
      }
      if (mutation === 'missing-review') rmSync(reviewPath);
      if (mutation === 'missing-snapshot') rmSync(join(destination, move.snapshot));
      if (mutation === 'corrupt-snapshot') writeFileSync(join(destination, move.snapshot), 'corrupt');
      if (mutation === 'wrong-after-hash' || mutation === 'wrong-name') {
        const review = JSON.parse(readFileSync(reviewPath, 'utf8')) as {
          name: string; sources: { after: { sha256: string } }[];
        };
        if (mutation === 'wrong-after-hash') review.sources[0].after.sha256 = '0'.repeat(64);
        else review.name = 'unreviewed-reorder';
        writeFileSync(reviewPath, JSON.stringify(review));
      }
      if (mutation === 'prior-endpoint' || mutation === 'preserved-text') {
        const dependencyPath = join(destination, dependencyReviewPath);
        const review = JSON.parse(readFileSync(dependencyPath, 'utf8')) as {
          bindings: { current?: { path: string; sha256: string }; preservedText?: string[] }[];
        };
        const binding = review.bindings.find((entry) => entry.current?.path === move.path)!;
        if (mutation === 'prior-endpoint') binding.current!.sha256 = digest(live);
        else binding.preservedText!.push('an unreviewed disclosure the live article does not carry');
        writeFileSync(dependencyPath, JSON.stringify(review));
      }
      if (mutation === 'unknown-article') path = 'content/classical/control.mdx';
      expect(() => retainedRound5FirstScreenCdArticle(destination, path, candidate))
        .toThrow(/round5 first-screen cd article continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);

it('admits only the exact named reader revision above the round5 pinned-leftovers head', () => {
  // This revision's output is now preserved as the input of the later
  // reader-pins revision, which the live checker reaches first.
  const reviewedAfter = read('audit/evidence/motion-round5-reader-pins-20260929/audit-local-basis-before.ts.txt');
  expect(reviewedAfter.length).toBe(113223);
  expect(digest(reviewedAfter)).toBe('4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69');
  const live = read('lib/audit-local-basis.ts');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(archived.length).toBe(112672);
  expect(digest(archived)).toBe('65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b');
  expect(round5FirstScreenCdCheckerPredecessor(root, reviewedAfter)).toEqual(archived);
  expect(round5FirstScreenCdCheckerPredecessor(root, live)).toEqual(archived);
  expect(round5FirstScreenCdCheckerPredecessor(root, archived)).toEqual(archived);
  const round5Archived = read('audit/evidence/motion-round5-pinned-leftovers-20260928/audit-local-basis-before.ts.txt');
  expect(round5FirstScreenCdCheckerPredecessor(root, round5Archived)).toEqual(round5Archived);
  expect(round5PinnedLeftoversCheckerPredecessor(root, live)).toEqual(round5Archived);
  const withoutPlanningBranch = Buffer.from(reviewedAfter.toString().replace(
    "  } else if (ref.path === 'content/classical/motion-planning.mdx') {\n", '  } else if (false) {\n'));
  expect(withoutPlanningBranch.toString()).not.toBe(reviewedAfter.toString());
  for (const changed of [Buffer.concat([reviewedAfter, Buffer.from('\n')]), withoutPlanningBranch]) {
    expect(() => round5FirstScreenCdCheckerPredecessor(root, changed)).toThrow(
      /round6 prose restores checker continuity drift/,
    );
  }
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash', 'wrong-name', 'future-observation'] as const)(
  'rejects %s in the first-screen cd checker transition', mutation => {
    const reviewPath = `${directory}checker-transition.json`;
    const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
    const destination = copied([reviewPath, predecessorPath,
      'audit/evidence/motion-round5-reader-pins-20260929/checker-transition.json',
      'audit/evidence/motion-round5-reader-pins-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-kinematics-reader-20260929/checker-transition.json',
      'audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-prose-restores-20260929/checker-transition.json',
      'audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt']);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(round5FirstScreenCdCheckerPredecessor(destination, live)).toEqual(read(predecessorPath));
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (!mutation.startsWith('missing') && mutation !== 'corrupt-predecessor') {
        const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
        if (mutation === 'review-before-hash') review.before.sha256 = '0'.repeat(64);
        if (mutation === 'review-after-hash') review.after.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-name') review.name = 'some-other-revision';
        if (mutation === 'future-observation') review.observedAt = '2999-01-01T00:00:00Z';
        writeFileSync(join(destination, reviewPath), JSON.stringify(review));
      }
      expect(() => round5FirstScreenCdCheckerPredecessor(destination, live))
        .toThrow(/round5 first-screen cd checker continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
