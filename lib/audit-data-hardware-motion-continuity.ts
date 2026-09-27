/**
 * Exact successor review for the data-hardware motion/prose pass. Historical
 * proof and browser-run dependencies still read their own archived bytes.
 * This review checks the active article separately; it is not a new run.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LocalArtifact } from './audit-local-basis.ts';

const directory = 'audit/evidence/motion-data-hardware-20260927/';
const reviewPath = `${directory}continuity.json`;
const priorReviewPath = 'audit/evidence/industrial-release-20260924/dependency-review.json';
const priorHash = '13a1ddc93ea7a585bef3b546a2207666e9362c1aaccbf1281ec3e175d7b813d4';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const read = (root: string, path: string) => readFileSync(join(root, path));

type Entry = {
  before: LocalArtifact;
  snapshot: LocalArtifact;
  current: LocalArtifact;
  requiredPresent: string[];
  requiredAbsent: string[];
};
type Review = {
  schemaVersion: 'motion-data-hardware-continuity-v1';
  reviewedBy: string;
  observedAt: string;
  rationale: string;
  priorReviewSha256: string;
  entries: Entry[];
};
const paths = [
  'content/data-hardware/data-bottleneck.mdx',
  'content/data-hardware/evaluation-crisis.mdx',
  'content/data-hardware/industrial-deployment.mdx',
  'tests/e2e/industrial-deployment.spec.ts',
] as const;
const snapshots = [
  `${directory}data-bottleneck-before.mdx`,
  `${directory}evaluation-crisis-before.mdx`,
  `${directory}industrial-deployment-before.mdx`,
  `${directory}industrial-deployment-spec-before.ts.txt`,
] as const;
const oldHashes = [
  'd4c1dceb0ae03fc356056723f6f781d0b1c57f279091dc65a65ae1488454a5cf',
  '7f30bc80d8f82bf2b596f7e2e916abe9663b572933454402571cad85255d8ac8',
  'aa5785f903044c8bd12f0e3e4034401381e2a0f945e9812c2790fa0a5cef9016',
  '68507097ee09a5598fc3eff5b4da29d9dd61b3620a00a35a52aa9140e282aecb',
] as const;
const oldBytes = [11947, 17449, 19372, 19936] as const;
const identity = (bytes: Buffer, artifact: LocalArtifact) =>
  bytes.length === artifact.bytes && sha(bytes) === artifact.sha256;
const citations = (source: string) =>
  [...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map(m => m[1]).sort();
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];

export function loadDataHardwareMotionReview(root: string): Review {
  const review = JSON.parse(read(root, reviewPath).toString()) as Review;
  const previous = read(root, `${directory}dependency-review-before.json`);
  if (review.schemaVersion !== 'motion-data-hardware-continuity-v1' ||
    !review.reviewedBy || review.rationale.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() ||
    review.priorReviewSha256 !== priorHash ||
    sha(previous) !== priorHash ||
    !previous.equals(read(root, priorReviewPath)) ||
    review.entries.length !== paths.length) {
    throw Error('data-hardware motion review or predecessor drift');
  }
  return review;
}

/** Verify an exact reviewed successor, returning the unchanged old execution input. */
export function currentDataHardwareMotionArtifact(
  root: string, index: number, live: Buffer, review = loadDataHardwareMotionReview(root),
): Buffer {
  const entry = review.entries[index];
  if (!entry || entry.before.path !== paths[index] ||
    entry.before.bytes !== oldBytes[index] ||
    entry.before.sha256 !== oldHashes[index] ||
    entry.snapshot.path !== snapshots[index] ||
    entry.snapshot.bytes !== entry.before.bytes ||
    entry.snapshot.sha256 !== entry.before.sha256 ||
    entry.current.path !== paths[index] ||
    !identity(live, entry.current) ||
    !entry.requiredPresent.length || !entry.requiredAbsent.length) {
    throw Error('data-hardware motion endpoint identity drift');
  }
  const old = read(root, entry.snapshot.path);
  const before = old.toString();
  const current = live.toString();
  if (!identity(old, entry.before) ||
    entry.requiredPresent.some(phrase => !current.includes(phrase)) ||
    entry.requiredAbsent.some(phrase => current.includes(phrase)) ||
    (index < 3 && (frontmatter(before) !== frontmatter(current) ||
      JSON.stringify(citations(before)) !== JSON.stringify(citations(current))))) {
    throw Error('data-hardware motion disclosure, citation or snapshot drift');
  }
  return old;
}

/** Historical checker revisions terminate at the pinned pre-motion checker. */
export function reviewedDataHardwareChecker(root: string, live: Buffer): boolean {
  const review = JSON.parse(read(root, `${directory}checker-transition.json`).toString()) as {
    schemaVersion: string; before: LocalArtifact; after: LocalArtifact;
    reviewedBy: string; rationale: string; observedAt: string;
  };
  const prior = read(root, `${directory}audit-local-basis-before.ts.txt`);
  return review.schemaVersion === 'motion-data-hardware-checker-revision-v1' &&
    review.before.path === `${directory}audit-local-basis-before.ts.txt` &&
    review.before.bytes === 108255 &&
    review.before.sha256 === 'b757fb029b43c415e10d30a6214dd7b6590ef44b0caa768f642860f7cf5a387c' &&
    identity(prior, review.before) &&
    review.after.path === 'lib/audit-local-basis.ts' &&
    identity(live, review.after) &&
    Boolean(review.reviewedBy && review.rationale.length > 80) &&
    Number.isFinite(Date.parse(review.observedAt)) &&
    Date.parse(review.observedAt) <= Date.now();
}
