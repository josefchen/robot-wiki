import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { reviewedDomainPairsChecker } from '../../lib/audit-motion-domain-pairs-continuity.ts';
import {
  retainedCommitToRevealSource,
  sharedUiCheckerPredecessor,
} from '../../lib/audit-shared-ui-local-basis-continuity.ts';
import { preReaderFirst, preSeoPass, preSeoPassText } from '../helpers/seo-pass.ts';

const root = resolve(import.meta.dirname, '../..');
const sourcePath = 'components/article/commit-to-reveal.tsx';
const directory = 'audit/evidence/motion-shared-ui-local-basis-20260928/';
const predecessor = {
  path: sourcePath,
  bytes: 12571,
  sha256: '8642903b3584b2a79ecb27fefbf2cf8652dd86f4600eaa7a5ce6aa03224c4190',
};
const current = {
  bytes: 12895,
  sha256: 'cd89e02019c260f36f091bae34b1deeffebbfe5128025f7dbe3b99b43140f4d4',
};
const read = (path: string) => readFileSync(resolve(root, path));

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'shared-ui-local-basis-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

it('pins the pre-SEO-pass commit-to-reveal bytes and still returns the catalog predecessor', () => {
  const live = preSeoPass(sourcePath);
  expect(live.length).toBe(current.bytes);
  expect(createHash('sha256').update(live).digest('hex')).toBe(current.sha256);
  const retained = createLocalArtifactReader(root)(predecessor);
  expect(retained.length).toBe(predecessor.bytes);
  expect(createHash('sha256').update(retained).digest('hex')).toBe(predecessor.sha256);
  expect(retained).toEqual(read(`${directory}commit-to-reveal-before.tsx.txt`));
  expect(retainedCommitToRevealSource(root, live)).toEqual(retained);
});

it('reaches the live primitive from those bytes only through the SEO-pass citation-label edits', () => {
  // The reader-first pass moved the prediction step's figure out of the
  // disclosure; its reviewed successor hands back these pre-pass bytes.
  const live = preReaderFirst(sourcePath);
  expect(live.length).toBe(13176);
  expect(createHash('sha256').update(live).digest('hex'))
    .toBe('cd996c964173cca0529068624d827b94f9f57f0227a866a3ab413cf8db24da5f');
  const labelled = preSeoPassText(sourcePath)
    .replace('  cite?: string;\n', [
      '  cite?: string;',
      '  /**',
      "   * The chip text for `cite`: the registry's author-year label, which",
      '   * lib/rehype-reveal-cite-labels.mjs writes in at compile time because this',
      '   * client module does not load the citation registry. Falls back to the id.',
      '   */',
      '  citeLabel?: string;',
      '',
    ].join('\n'))
    .replace('{option.cite}\n', '{option.citeLabel ?? option.cite}\n');
  expect(labelled).toBe(live.toString());
});

it('keeps the article-truth checker reachable through the named reader branch', () => {
  const live = read('lib/audit-local-basis.ts');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(sharedUiCheckerPredecessor(root, live)).toEqual(archived);
  expect(reviewedDomainPairsChecker(root, live)).toEqual(
    read('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt'),
  );
  expect(() => sharedUiCheckerPredecessor(root, Buffer.concat([live, Buffer.from('\n')]))).toThrow(
    /figure migration checker continuity drift/,
  );
});

it.each(['wrong-leading-edge', 'wrong-trailing-edge'] as const)(
  'rejects a %s commit-to-reveal edit', edge => {
    const live = preSeoPassText(sourcePath);
    const wrong = edge === 'wrong-leading-edge'
      ? live.replace('useLayoutEffect', 'useEffect')
      : live.replace('ref={detailsRef}', 'ref={detailRef}');
    expect(() => retainedCommitToRevealSource(root, Buffer.from(wrong))).toThrow(
      /shared-ui commit-to-reveal continuity drift/,
    );
  },
);

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash'] as const)('rejects %s in the commit-to-reveal source transition', mutation => {
  const reviewPath = `${directory}source-transition.json`;
  const predecessorPath = `${directory}commit-to-reveal-before.tsx.txt`;
  const destination = copied([reviewPath, predecessorPath, 'audit/local-basis.json']);
  try {
    const live = preSeoPass(sourcePath);
    expect(retainedCommitToRevealSource(destination, live)).toEqual(read(predecessorPath));
    if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
    if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
    if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
    if (mutation === 'review-before-hash' || mutation === 'review-after-hash') {
      const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
      review[mutation === 'review-before-hash' ? 'before' : 'after'].sha256 = '0'.repeat(64);
      writeFileSync(join(destination, reviewPath), JSON.stringify(review));
    }
    expect(() => retainedCommitToRevealSource(destination, live)).toThrow();
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor'] as const)(
  'rejects %s in the shared-ui checker transition', mutation => {
    const reviewPath = `${directory}checker-transition.json`;
    const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
    const destination = copied([reviewPath, predecessorPath,
      'audit/evidence/motion-round5-pinned-leftovers-20260928/checker-transition.json',
      'audit/evidence/motion-round5-pinned-leftovers-20260928/audit-local-basis-before.ts.txt',
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
      'audit/evidence/motion-round6-remaining-repairs-20260929/classical-closure-evidence-before.test.ts.txt',
      'audit/evidence/figure-migration-20261001/checker-transition.json',
      'audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt',
      'audit/evidence/seo-pass-20261002/checker-transition.json',
      'audit/evidence/domain-pass-20261006/checker-transition.json']);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(sharedUiCheckerPredecessor(destination, live)).toEqual(read(predecessorPath));
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      expect(() => sharedUiCheckerPredecessor(destination, live)).toThrow();
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
