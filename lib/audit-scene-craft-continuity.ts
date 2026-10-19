/**
 * Exact successor review for the motion scene sources the scene-craft pass
 * of 2026-10-18 changed after an older review, run or receipt had pinned
 * them: the BatchScale scene, whose dashed overhead curve now peels off the
 * solid curve across the cpu beat instead of only fading in (VAL-OPUS-072).
 * Each change is recorded as exact edits over the bytes the scene had
 * before, so the earlier bytes are rebuilt from the live file instead of
 * being archived. A successor stays a scene source and keeps every data
 * attribute, beat id, caption and exported name its predecessor had, so the
 * marks, labels and test ids older observations address are still there.
 *
 * These are the newest changes to their files, so the artifact readers call
 * this layer on the live bytes first, before every older layer. It hands an
 * older check the rebuilt bytes only while the live scene is exactly the
 * reviewed successor, reversing the edits rebuilds bytes that hash to the
 * recorded predecessor, and replaying them gives the live bytes back. No old
 * review, run, receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SCENE_CRAFT_CONTINUITY_DIR = 'audit/evidence/scene-craft-20261018/';
const reviewFile = `${SCENE_CRAFT_CONTINUITY_DIR}source-transition.json`;
const drift = 'scene-craft continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type SceneCraftEdit = { before: string; after: string };
export type SceneCraftSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: SceneCraftEdit[] };
export type SceneCraftReview = {
  schemaVersion: 'scene-craft-continuity-v1';
  name: 'scene-craft-20261018';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: SceneCraftSource[];
};

// BEGIN scene-craft pins (written by scripts/record-scene-craft-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 8298, sha256: 'b0416856f6f0fee8b36576a233ef4a6393646833eac6dacfa12d7ae19d622d9f' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/motion/scenes/batch-scale.tsx', [14926, 'ddc578f22a4d9ca09a1c37b267e4541d9f7125c2ad0d6f02bd8da4d62ae4a2c4']],
]);
// END scene-craft pins

const SCENE_SOURCE = /^components\/motion\/scenes\/[a-z0-9]+(?:-[a-z0-9]+)*\.tsx$/;
const QUOTED = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")`;
const HANDLES = [
  /\bdata-[a-z][a-z-]*=(?:"[^"]*"|\{'[^']*'\})/g,
  new RegExp(String.raw`\b(?:id|caption): ${QUOTED}`, 'g'),
  /\bexport (?:const|function|type|interface|class) [A-Za-z_$][\w$]*/g,
];

/**
 * What older observations and imports address a scene by: every literal data
 * attribute with its value (stage marks, stage labels, test ids,
 * annotations), every quoted id and caption, and every exported name.
 */
export function sceneHandles(source: string): Set<string> {
  return new Set(HANDLES.flatMap((pattern) => [...source.matchAll(pattern)].map(([match]) => match)));
}

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;

function applyExact(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

/**
 * The scene obligations of a scene-craft change: the file is a motion scene
 * source, it changed, and every handle of the predecessor is still in it.
 */
export function keepsSceneCraftObligations(path: string, prior: string, current: string): boolean {
  if (!SCENE_SOURCE.test(path) || prior === current) return false;
  const kept = sceneHandles(current);
  return [...sceneHandles(prior)].every((handle) => kept.has(handle));
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifySceneCraftSource(source: SceneCraftSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path || source.before?.path !== path || !/^[0-9a-f]{40}$/.test(source.archivedFrom ?? '') ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.some(({ before, after }) => typeof before !== 'string' || typeof after !== 'string' ||
      !before || !after || before === after)) {
    throw new Error(drift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const)) !== current ||
    !keepsSceneCraftObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, SceneCraftReview>();
const priorCache = new Map<string, Buffer>();

export function loadSceneCraftReview(root: string): SceneCraftReview {
  let bytes: Buffer;
  let review: SceneCraftReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as SceneCraftReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'scene-craft-continuity-v1' || review.name !== 'scene-craft-20261018' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(drift);
  }
  reviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

function rebuiltPrior(root: string, path: string, live: Buffer): Buffer {
  const key = `${root}\0${path}\0${digest(live)}`;
  let prior = priorCache.get(key);
  if (!prior) {
    const source = loadSceneCraftReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifySceneCraftSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the scene-craft review holds a successor for. */
export const sceneCraftSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function sceneCraftPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
