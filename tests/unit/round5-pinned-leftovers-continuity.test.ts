import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import {
  retainedFrictionTransferSource, retainedRound5FirstScreenArticle,
  round5PinnedLeftoversCheckerPredecessor,
} from '../../lib/audit-round5-pinned-leftovers-continuity.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round5-pinned-leftovers-20260928/';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round5-pinned-leftovers-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

const frictionPaths = [
  `${directory}friction-source-transition.json`,
  `${directory}friction-transfer-before.tsx.txt`,
  'audit/local-basis.json',
  `${directory}first-screen-transition.json`,
  `${directory}data-bottleneck-first-screen-before.mdx`,
  `${directory}evaluation-crisis-first-screen-before.mdx`,
  'audit/evidence/motion-data-hardware-20260927/continuity.json',
  'audit/evidence/motion-data-hardware-20260927/dependency-review-before.json',
  'audit/evidence/industrial-release-20260924/dependency-review.json',
  'content/data-hardware/data-bottleneck.mdx',
  'content/data-hardware/evaluation-crisis.mdx',
] as const;

it('pins the live friction bytes and returns the exact catalog predecessor', () => {
  const live = read('components/interactive/friction-transfer.tsx');
  expect(live.length).toBe(15835);
  expect(digest(live)).toBe('45e15e842760f8109e19cd9cded9b066557fc235c0a4ebb51488590b9a2dee44');
  const retained = createLocalArtifactReader(root)({
    path: 'components/interactive/friction-transfer.tsx',
    bytes: 15549,
    sha256: 'af16eda88835169e720e7e6a8bb79c3ede65cba005635825a0b27f9aec7d8da9',
  });
  expect(retained).toEqual(read(`${directory}friction-transfer-before.tsx.txt`));
  expect(retainedFrictionTransferSource(root, live)).toEqual(retained);
});

it.each(['wrong-mark', 'dropped-sentence'] as const)(
  'rejects a %s friction edit outside the named transition', change => {
    const live = read('components/interactive/friction-transfer.tsx').toString();
    const wrong = change === 'wrong-mark'
      ? live.replace("'wide' : 'ordinary'", "'narrow' : 'ordinary'")
      : live.replace(' The randomization band is marked ', ' A band is marked ');
    expect(wrong).not.toBe(live);
    expect(() => retainedFrictionTransferSource(root, Buffer.from(wrong))).toThrow(
      /round5 friction-transfer source continuity drift/,
    );
  },
);

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash', 'review-name', 'proof-population'] as const)(
  'rejects %s in the friction source transition', mutation => {
    const destination = copied(frictionPaths);
    try {
      const live = read('components/interactive/friction-transfer.tsx');
      expect(retainedFrictionTransferSource(destination, live))
        .toEqual(read(`${directory}friction-transfer-before.tsx.txt`));
      const reviewPath = `${directory}friction-source-transition.json`;
      const predecessorPath = `${directory}friction-transfer-before.tsx.txt`;
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (mutation.startsWith('review-')) {
        const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
        if (mutation === 'review-before-hash' || mutation === 'review-after-hash') {
          review[mutation === 'review-before-hash' ? 'before' : 'after'].sha256 = '0'.repeat(64);
        }
        if (mutation === 'review-name') review.name = 'unreviewed-rewrite';
        writeFileSync(join(destination, reviewPath), JSON.stringify(review));
      }
      if (mutation === 'proof-population') {
        const catalog = JSON.parse(readFileSync(join(destination, 'audit/local-basis.json'), 'utf8'));
        catalog.proofs = catalog.proofs.filter((proof: { id: string }) => proof.id !== 's23-wide');
        writeFileSync(join(destination, 'audit/local-basis.json'), JSON.stringify(catalog));
      }
      expect(() => retainedFrictionTransferSource(destination, live)).toThrow();
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);

it('chains both first-screen successors on the unchanged data-hardware review', () => {
  const priorDataBottleneck = read(`${directory}data-bottleneck-first-screen-before.mdx`);
  const priorEvaluationCrisis = read(`${directory}evaluation-crisis-first-screen-before.mdx`);
  expect(retainedRound5FirstScreenArticle(root, 0, read('content/data-hardware/data-bottleneck.mdx')))
    .toEqual(read('audit/evidence/motion-data-hardware-20260927/data-bottleneck-before.mdx'));
  expect(retainedRound5FirstScreenArticle(root, 1, read('content/data-hardware/evaluation-crisis.mdx')))
    .toEqual(read('audit/evidence/motion-data-hardware-20260927/evaluation-crisis-before.mdx'));
  expect(createLocalArtifactReader(root)({
    path: 'content/data-hardware/data-bottleneck.mdx', bytes: 11947,
    sha256: 'd4c1dceb0ae03fc356056723f6f781d0b1c57f279091dc65a65ae1488454a5cf',
  })).toEqual(read('audit/evidence/motion-data-hardware-20260927/data-bottleneck-before.mdx'));
  expect(priorDataBottleneck.length).toBe(12009);
  expect(priorEvaluationCrisis.length).toBe(17487);
});

it.each(['reverted-move', 'dropped-citation', 'missing-review', 'wrong-after-hash'] as const)(
  'rejects a %s first-screen successor', mutation => {
    const destination = copied([...frictionPaths,
      'audit/evidence/motion-data-hardware-20260927/data-bottleneck-before.mdx']);
    try {
      const live = read('content/data-hardware/data-bottleneck.mdx');
      const reviewed = mutation === 'reverted-move'
        ? Buffer.from(live.toString()
          .replace('<DataScaleChart className="my-6" />\n\n<FarmThroughput className="my-6" />',
            '<FarmThroughput className="my-6" />\n\n<DataScaleChart className="my-6" />'))
        : mutation === 'dropped-citation'
          ? Buffer.from(live.toString().replace(' <Cite id="droid-2024" />', ''))
          : live;
      if (mutation === 'missing-review') rmSync(join(destination, `${directory}first-screen-transition.json`));
      if (mutation === 'wrong-after-hash') {
        const review = JSON.parse(readFileSync(join(destination, `${directory}first-screen-transition.json`), 'utf8'));
        review.sources[0].after.sha256 = '0'.repeat(64);
        writeFileSync(join(destination, `${directory}first-screen-transition.json`), JSON.stringify(review));
      }
      expect(() => retainedRound5FirstScreenArticle(destination, 0, reviewed)).toThrow();
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);

it('admits only the exact named checker revision above the shared-ui predecessor', () => {
  // This revision's output is now preserved as the input of the later
  // first-screen c/d reader revision, which the live checker reaches first.
  const reviewedAfter = read('audit/evidence/motion-round5-first-screen-cd-20260929/audit-local-basis-before.ts.txt');
  expect(reviewedAfter.length).toBe(112672);
  expect(digest(reviewedAfter)).toBe('65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(round5PinnedLeftoversCheckerPredecessor(root, reviewedAfter)).toEqual(archived);
  expect(round5PinnedLeftoversCheckerPredecessor(root, read('lib/audit-local-basis.ts'))).toEqual(archived);
  expect(round5PinnedLeftoversCheckerPredecessor(root, archived)).toEqual(archived);
  expect(() => round5PinnedLeftoversCheckerPredecessor(root,
    Buffer.concat([reviewedAfter, Buffer.from('\n')]))).toThrow(
    /round6 remaining repairs checker continuity drift/,
  );
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'wrong-edge'] as const)(
  'rejects %s in the round5 checker transition', mutation => {
    const destination = copied([`${directory}checker-transition.json`,
      `${directory}audit-local-basis-before.ts.txt`,
      'audit/evidence/motion-round5-first-screen-cd-20260929/checker-transition.json',
      'audit/evidence/motion-round5-first-screen-cd-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round5-reader-pins-20260929/checker-transition.json',
      'audit/evidence/motion-round5-reader-pins-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-kinematics-reader-20260929/checker-transition.json',
      'audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-prose-restores-20260929/checker-transition.json',
      'audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/checker-transition.json',
      'audit/evidence/motion-round6-remaining-repairs-20260929/audit-local-basis-before.ts.txt',
      'audit/evidence/motion-round6-remaining-repairs-20260929/classical-closure-evidence-before.test.ts.txt']);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(round5PinnedLeftoversCheckerPredecessor(destination, live))
        .toEqual(read(`${directory}audit-local-basis-before.ts.txt`));
      const reviewPath = `${directory}checker-transition.json`;
      const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (mutation === 'wrong-edge') {
        const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
        review.name = 'some-other-revision';
        writeFileSync(join(destination, reviewPath), JSON.stringify(review));
      }
      expect(() => round5PinnedLeftoversCheckerPredecessor(destination, live)).toThrow();
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
