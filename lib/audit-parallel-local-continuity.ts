/**
 * Exact successor reviews for the checker revision and the verification
 * suites of the parallel18 rebinding from the retired TrainingTimeChart to
 * the BatchScale motion scene (2026-10-11). The checker learns scene targets,
 * registers the scene sources and mounts itself because the brand-v2
 * interactive registry does not list scenes, and gains the batch-scale recipe
 * beside the retained parallel recipe. Each revision is recorded as exact
 * edits over the bytes before it, so those bytes are rebuilt from the live
 * file instead of being archived. The artifact reader hands every older check
 * the rebuilt bytes only while the live file is exactly the reviewed
 * successor, reversing the edits rebuilds bytes that hash to the recorded
 * predecessor and replaying them gives the live bytes back. No old review,
 * run, receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PARALLEL_LOCAL_CONTINUITY_DIR = 'audit/evidence/parallel-local-20261009/';
const checkerReviewFile = `${PARALLEL_LOCAL_CONTINUITY_DIR}checker-transition.json`;
const checkerDrift = 'parallel local checker continuity drift';
const checkerPath = 'lib/audit-local-basis.ts';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ParallelLocalCheckerEdit = { before: string; after: string };
export type ParallelLocalCheckerReview = {
  schemaVersion: 'parallel-local-checker-revision-v1';
  name: 'parallel-local-reader';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: ParallelLocalCheckerEdit[];
};

// BEGIN parallel-local checker pins (written by scripts/record-parallel-local-continuity.ts)
/** The reviewed checker evidence file; a changed review needs a reviewed code change too. */
const checkerReviewPin = { bytes: 9456, sha256: '17ed9b584bb92155bfd0b0cc4bf4cce23f9a5ffc46de0d1c7b87dea828db8ec0' };

/** The domain-pass reader head the revision edits, and the reviewed revision. */
const checkerBefore = { bytes: 114290, sha256: '6d377744d0d141a2605683c9b083d043e47f7ba17e7b4d651329d877b6cd9962' };
const checkerAfter = { bytes: 118664, sha256: '0168b4db33775ce763ee45637f8bec65120d46e945d6c30d748c40c1ab8b6623' };
// END parallel-local checker pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;

function applyExact(text: string, edits: readonly (readonly [string, string])[], drift = checkerDrift): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

// Older checks read the checker through this layer many times; the review is
// parsed and the predecessor rebuilt once per root and exact review bytes.
const checkerReviewCache = new Map<string, ParallelLocalCheckerReview>();
const checkerPriorCache = new WeakMap<ParallelLocalCheckerReview, Buffer>();

export function loadParallelLocalCheckerReview(root: string): ParallelLocalCheckerReview {
  let bytes: Buffer;
  let review: ParallelLocalCheckerReview;
  try {
    bytes = readFileSync(join(root, checkerReviewFile));
    const cached = checkerReviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as ParallelLocalCheckerReview;
  } catch (error) {
    throw new Error(`${checkerDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== checkerReviewPin.bytes || digest(bytes) !== checkerReviewPin.sha256 ||
    review?.schemaVersion !== 'parallel-local-checker-revision-v1' || review.name !== 'parallel-local-reader' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() || !/^[0-9a-f]{40}$/.test(review.archivedFrom ?? '') ||
    !same(review.before, checkerPath, checkerBefore.bytes, checkerBefore.sha256) ||
    !same(review.after, checkerPath, checkerAfter.bytes, checkerAfter.sha256) || !review.edits?.length ||
    review.edits.some(({ before, after }) => typeof before !== 'string' || typeof after !== 'string' ||
      !before || !after || before === after)) {
    throw new Error(checkerDrift);
  }
  checkerReviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

/**
 * The checker bytes the domain-pass checker layer should see. Checker bytes
 * other than the reviewed revision come back unchanged, so the older layers
 * still decide them. The reviewed revision is admitted only as its exact
 * recorded edits, and the domain-pass head is rebuilt from it and returned.
 */
export function parallelLocalCheckerPredecessor(root: string, live: Buffer): Buffer {
  if (live.length !== checkerAfter.bytes || digest(live) !== checkerAfter.sha256) return live;
  const review = loadParallelLocalCheckerReview(root);
  const cached = checkerPriorCache.get(review);
  if (cached) return Buffer.from(cached);
  const current = live.toString();
  const edits = review.edits.map(({ before, after }) => [before, after] as const);
  const rebuilt = applyExact(current, edits.map(([from, to]) => [to, from] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(review.before, checkerPath, prior.length, digest(prior)) || applyExact(rebuilt, edits) !== current) {
    throw new Error(checkerDrift);
  }
  checkerPriorCache.set(review, prior);
  return Buffer.from(prior);
}

/*
 * The verification suites the same rebinding brings up to date. Older
 * reviews, proofs and runs pin their earlier bytes, so each change is
 * recorded as exact edits over the bytes the suite had before, and the
 * artifact reader rebuilds those bytes from the live suite while it is
 * exactly the reviewed successor. A suite keeps at least as many expect and
 * test calls as it had.
 */
const sourceReviewFile = `${PARALLEL_LOCAL_CONTINUITY_DIR}source-transition.json`;
const sourceDrift = 'parallel local continuity drift';

export type ParallelLocalSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: ParallelLocalCheckerEdit[] };
export type ParallelLocalSourceReview = {
  schemaVersion: 'parallel-local-continuity-v1';
  name: 'parallel-local-suites';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: ParallelLocalSource[];
};

// BEGIN parallel-local source pins (written by scripts/record-parallel-local-continuity.ts)
/** The reviewed suite evidence file; a changed review needs a reviewed code change too. */
const sourceReviewPin = { bytes: 7766, sha256: '87233dada9fafe4a9d9e5d2f635286c821d66b88c3386a5cf2ad225a346c8ddc' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['tests/unit/parallel-local-evidence.test.ts', [10909, '4e4f8d09ea64ba6606ed517272d3fbadd1287b418a623d4abf980cc84d69476e']],
]);
// END parallel-local source pins

const calls = (source: string) => [
  source.split('expect(').length - 1,
  source.match(/\b(?:it|test)(?:\.[a-zA-Z]+)?\(/g)?.length ?? 0,
] as const;

/** A suite successor keeps its place and at least as many expect and test calls. */
export function keepsParallelLocalObligations(path: string, prior: string, current: string): boolean {
  if (!/^tests\/[a-z0-9/-]+\.test\.ts$/.test(path) || prior === current) return false;
  const [priorExpects, priorTests] = calls(prior);
  const [expects, tests] = calls(current);
  return expects >= priorExpects && tests >= priorTests;
}

/**
 * The pre-rebinding bytes rebuilt from the live successor. Throws unless the
 * obligations above hold. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyParallelLocalSource(source: ParallelLocalSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path || source.before?.path !== path || !/^[0-9a-f]{40}$/.test(source.archivedFrom ?? '') ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.some(({ before, after }) => typeof before !== 'string' || typeof after !== 'string' ||
      !before || !after || before === after)) {
    throw new Error(sourceDrift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse(), sourceDrift);
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const), sourceDrift) !== current ||
    !keepsParallelLocalObligations(path, rebuilt, current)) {
    throw new Error(sourceDrift);
  }
  return prior;
}

export function loadParallelLocalSourceReview(root: string): ParallelLocalSourceReview {
  let bytes: Buffer;
  let review: ParallelLocalSourceReview;
  try {
    bytes = readFileSync(join(root, sourceReviewFile));
    review = JSON.parse(bytes.toString()) as ParallelLocalSourceReview;
  } catch (error) {
    throw new Error(`${sourceDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== sourceReviewPin.bytes || digest(bytes) !== sourceReviewPin.sha256 ||
    review?.schemaVersion !== 'parallel-local-continuity-v1' || review.name !== 'parallel-local-suites' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(sourceDrift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(sourceDrift);
  }
  return review;
}

/** The paths the parallel-local suite review holds a successor for. */
export const parallelLocalSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function parallelLocalPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadParallelLocalSourceReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifyParallelLocalSource(source, live);
}
