/**
 * Exact successor reviews for the checker revision, the verification suites
 * and the end-to-end spec of the parallel18 rebinding from the retired
 * TrainingTimeChart to the BatchScale motion scene (2026-10-11). The checker
 * learns scene targets, registers the scene sources and mounts itself because
 * the brand-v2 interactive registry does not list scenes, and gains the
 * batch-scale recipe beside the retained parallel recipe. Each revision is
 * recorded as exact edits over the bytes before it, so those bytes are
 * rebuilt from the live file instead of being archived. The artifact reader
 * hands every older check the rebuilt bytes only while the live file is
 * exactly the reviewed successor, reversing the edits rebuilds bytes that
 * hash to the recorded predecessor and replaying them gives the live bytes
 * back. No old review, run, receipt, capture or ledger cell is rewritten.
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
const checkerReviewPin = { bytes: 10085, sha256: '707aec306544d89d8f66fe0f24d17933fd6a04fd673f15c87e20fadcb2020682' };

/** The domain-pass reader head the revision edits, and the reviewed revision. */
const checkerBefore = { bytes: 114290, sha256: '6d377744d0d141a2605683c9b083d043e47f7ba17e7b4d651329d877b6cd9962' };
const checkerAfter = { bytes: 118682, sha256: 'd2778193b282c32af9b463cbe3eb195c5a753179178b4674a10ff610194fa75d' };
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
const sourceReviewPin = { bytes: 16038, sha256: '43189a0d13eee4da323ce206e2f15c2eb24490d71c497ab8f02828b1ba33045e' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['tests/unit/classical-closure-evidence.test.ts', [17690, '60e2ac48fb9091fa6c6fc1790190672f5e67c529e2cfc39a7a3f2fcfb59afc66']],
  ['tests/unit/parallel-local-evidence.test.ts', [12041, 'b9070de0d151ee9f5f597be3dd19a7ca2b29905877b1df853078666d224eb7a3']],
]);
// END parallel-local source pins

const calls = (source: string) => [
  source.split('expect(').length - 1,
  source.match(/\b(?:it|test)(?:\.[a-zA-Z]+)?\(/g)?.length ?? 0,
  source.match(/\b(?:it|test|describe)\.(?:skip|fixme|only)\b/g)?.length ?? 0,
] as const;

/**
 * A suite or end-to-end spec successor keeps its place and at least as many
 * expect and test calls, and adds no skipped, fixme or focused test.
 */
export function keepsParallelLocalObligations(path: string, prior: string, current: string): boolean {
  if (!/^tests\/(?:[a-z0-9/-]+\.test|e2e\/[a-z0-9-]+\.spec)\.ts$/.test(path) || prior === current) return false;
  const [priorExpects, priorTests, priorSkips] = calls(prior);
  const [expects, tests, skips] = calls(current);
  return expects >= priorExpects && tests >= priorTests && skips <= priorSkips;
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

function loadReview<T extends { schemaVersion: string; name: string; reviewedBy: string; rationale: string;
  observedAt: string; sources: ParallelLocalSource[] }>(root: string, file: string, pin: { bytes: number; sha256: string },
  schemaVersion: T['schemaVersion'], name: T['name'], pinned: ReadonlyMap<string, readonly [number, string]>): T {
  let bytes: Buffer;
  let review: T;
  try {
    bytes = readFileSync(join(root, file));
    review = JSON.parse(bytes.toString()) as T;
  } catch (error) {
    throw new Error(`${sourceDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256 ||
    review?.schemaVersion !== schemaVersion || review.name !== name ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(sourceDrift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== pinned.size || paths.size !== pinned.size ||
    review.sources.some(({ after }) => !pinned.has(after?.path) ||
      !same(after, after.path, ...pinned.get(after.path)!))) {
    throw new Error(sourceDrift);
  }
  return review;
}

export function loadParallelLocalSourceReview(root: string): ParallelLocalSourceReview {
  return loadReview<ParallelLocalSourceReview>(root, sourceReviewFile, sourceReviewPin,
    'parallel-local-continuity-v1', 'parallel-local-suites', successors);
}

/** The paths the parallel-local suite review holds a successor for. */
export const parallelLocalSuccessorPaths = (): readonly string[] => [...successors.keys()];

/*
 * The end-to-end spec the same rebinding rewrites to drive the BatchScale
 * scene instead of the retired chart. The retired chart's observed proofs,
 * receipts and browser run pin the spec as it was, so the rewrite is recorded
 * the same way, in its own review, under the same obligations.
 */
const specReviewFile = `${PARALLEL_LOCAL_CONTINUITY_DIR}spec-transition.json`;

export type ParallelLocalSpecReview = Omit<ParallelLocalSourceReview, 'schemaVersion' | 'name'> & {
  schemaVersion: 'parallel-local-spec-continuity-v1';
  name: 'parallel-local-specs';
};

// BEGIN parallel-local spec pins (written by scripts/record-parallel-local-continuity.ts)
/** The reviewed spec evidence file; a changed review needs a reviewed code change too. */
const specReviewPin = { bytes: 17378, sha256: 'f592fdec8675d5e686ca5f75000fd1e9da21f0310df610916951911ea4bbe3db' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const specSuccessors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['tests/e2e/parallel-local-evidence.spec.ts', [12127, 'd5960407c2a9e5bf01369f6f208e20a7dc3b18c1713eff22b8aa63722eb94992']],
]);
// END parallel-local spec pins

export function loadParallelLocalSpecReview(root: string): ParallelLocalSpecReview {
  return loadReview<ParallelLocalSpecReview>(root, specReviewFile, specReviewPin,
    'parallel-local-spec-continuity-v1', 'parallel-local-specs', specSuccessors);
}

/** The paths the parallel-local spec review holds a successor for. */
export const parallelLocalSpecPaths = (): readonly string[] => [...specSuccessors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function parallelLocalPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const spec = specSuccessors.get(ref.path);
  const pinned = spec ?? successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const review = spec ? loadParallelLocalSpecReview(root) : loadParallelLocalSourceReview(root);
  return verifyParallelLocalSource(review.sources.find(({ after }) => after.path === ref.path)!, live);
}
