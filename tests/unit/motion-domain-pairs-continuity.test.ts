import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  retainedDomainPairSource,
  reviewedDomainPairsChecker,
} from '../../lib/audit-motion-domain-pairs-continuity';

const root = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path));

describe('historical RL proof dependency continuity', () => {
  for (const [source, snapshot] of [
    ['components/interactive/gait-diagram.tsx', 'gait-diagram-before.tsx.txt'],
    ['components/interactive/training-time-chart.tsx', 'training-time-chart-before.tsx.txt'],
  ] as const) {
    it(`retains the original ${source} and rejects a further source change`, () => {
      const current = read(source);
      const archived = read(`audit/evidence/motion-domain-pairs-20260928/${snapshot}`);
      expect(retainedDomainPairSource(root, source, current)).toEqual(archived);
      expect(() => retainedDomainPairSource(root, source, Buffer.concat([current, Buffer.from('\n')]))).toThrow(
        /source continuity drift/,
      );
    });
  }

  it('retains the predecessor checker only for the exact source-reader extension', () => {
    const current = read('lib/audit-local-basis.ts');
    const archived = read('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt');
    expect(reviewedDomainPairsChecker(root, current)).toEqual(archived);
    expect(() => reviewedDomainPairsChecker(root, Buffer.concat([current, Buffer.from('\n')]))).toThrow(
      /figure migration checker continuity drift/,
    );
  });
  it.each(['review-before-hash', 'review-after-hash', 'missing-review', 'missing-predecessor',
    'corrupt-predecessor'] as const)('rejects %s in the finite proof-reader succession', mutation => {
    const destination = mkdtempSync(join(tmpdir(), 'proof-reader-continuity-'));
    try {
      const reviewPath = 'audit/evidence/motion-proof-reader-efficiency-20260928/checker-transition.json';
      const predecessorPath = 'audit/evidence/motion-proof-reader-efficiency-20260928/audit-local-basis-before.ts.txt';
      for (const path of [reviewPath, predecessorPath,
        'audit/evidence/motion-article-truth-efficiency-20260928/checker-transition.json',
        'audit/evidence/motion-article-truth-efficiency-20260928/audit-local-basis-before.ts.txt',
        'audit/evidence/motion-shared-ui-local-basis-20260928/checker-transition.json',
        'audit/evidence/motion-shared-ui-local-basis-20260928/audit-local-basis-before.ts.txt',
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
        'audit/evidence/domain-pass-20261006/checker-transition.json',
        'audit/evidence/motion-domain-pairs-20260928/checker-transition.json',
        'audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt']) {
        mkdirSync(dirname(join(destination, path)), { recursive: true });
        copyFileSync(join(root, path), join(destination, path));
      }
      const live = read('lib/audit-local-basis.ts');
      const archived = read('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt');
      expect(reviewedDomainPairsChecker(destination, live)).toEqual(archived);
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (mutation === 'review-before-hash' || mutation === 'review-after-hash') {
        const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
        review[mutation === 'review-before-hash' ? 'before' : 'after'].sha256 = '0'.repeat(64);
        writeFileSync(join(destination, reviewPath), JSON.stringify(review));
      }
      expect(() => reviewedDomainPairsChecker(destination, live)).toThrow();
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  });
  it.each(['review-before-hash', 'review-after-hash', 'missing-review', 'corrupt-predecessor'] as const)(
    'rejects %s in the article-truth checker succession', mutation => {
      const destination = mkdtempSync(join(tmpdir(), 'article-truth-continuity-'));
      try {
        const reviewPath = 'audit/evidence/motion-article-truth-efficiency-20260928/checker-transition.json';
        const predecessorPath = 'audit/evidence/motion-article-truth-efficiency-20260928/audit-local-basis-before.ts.txt';
        for (const path of [reviewPath, predecessorPath,
          'audit/evidence/motion-shared-ui-local-basis-20260928/checker-transition.json',
          'audit/evidence/motion-shared-ui-local-basis-20260928/audit-local-basis-before.ts.txt',
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
          'audit/evidence/domain-pass-20261006/checker-transition.json',
          'audit/evidence/motion-proof-reader-efficiency-20260928/checker-transition.json',
          'audit/evidence/motion-proof-reader-efficiency-20260928/audit-local-basis-before.ts.txt',
          'audit/evidence/motion-domain-pairs-20260928/checker-transition.json',
          'audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt']) {
          mkdirSync(dirname(join(destination, path)), { recursive: true });
          copyFileSync(join(root, path), join(destination, path));
        }
        const live = read('lib/audit-local-basis.ts');
        expect(reviewedDomainPairsChecker(destination, live)).toEqual(
          read('audit/evidence/motion-domain-pairs-20260928/audit-local-basis-before.ts.txt'),
        );
        if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
        if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
        if (mutation === 'review-before-hash' || mutation === 'review-after-hash') {
          const review = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8'));
          review[mutation === 'review-before-hash' ? 'before' : 'after'].sha256 = '0'.repeat(64);
          writeFileSync(join(destination, reviewPath), JSON.stringify(review));
        }
        expect(() => reviewedDomainPairsChecker(destination, live)).toThrow();
      } finally {
        rmSync(destination, { recursive: true, force: true });
      }
    },
  );
});
