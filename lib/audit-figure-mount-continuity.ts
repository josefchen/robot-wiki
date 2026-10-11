/**
 * Exact successor review for the classical articles that gained their first
 * interactive figure on 2026-10-07 (VAL-OPUS-057: the calibration chain in
 * calibration, the policy graph layout in ROS 2 for ML engineers). Each
 * figure adds two things to an article and changes nothing else: its import
 * line after the frontmatter, and its one-line mount on its own line between
 * blank lines. Only the components named in FIGURE_MOUNTS are admitted, each
 * with exactly the attributes listed there. Each change is recorded as exact
 * edits over the bytes the article had before, so the earlier bytes are
 * rebuilt from the live file instead of being archived. The artifact reader
 * hands every older check the rebuilt bytes only while the live article is
 * exactly the reviewed successor, reversing the edits rebuilds bytes that
 * hash to the recorded predecessor, replaying them gives the live bytes
 * back, and removing the import and mount from the live article gives the
 * predecessor exactly. No old review, run, receipt, capture or ledger cell
 * is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FIGURE_MOUNT_CONTINUITY_DIR = 'audit/evidence/figure-mounts-20261007/';
const reviewFile = `${FIGURE_MOUNT_CONTINUITY_DIR}source-transition.json`;
const drift = 'figure mount continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type FigureMountEdit = { before: string; after: string };
export type FigureMountSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: FigureMountEdit[] };
export type FigureMountReview = {
  schemaVersion: 'figure-mount-continuity-v1';
  name: 'figure-mounts-20261007';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: FigureMountSource[];
};

// BEGIN figure-mount pins (written by scripts/record-figure-mount-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 33613, sha256: 'f47d0583e8bee93e25fbf2909e5633672ab4b5e9919f5b6058fd7d4fdc02ae6c' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/calibration.mdx', [10030, 'ffc769f31d4b00ea8624283b9af7d4d9d0b71bcd6ff55ec6887f5cf83429fdf5']],
  ['content/classical/ros2-for-ml-engineers.mdx', [9930, '65fb50d6229dde8c3446194236429481a1ac0799e99753471a29c95317731fb7']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [15826, '0286490b18ce62845fa3cb42eeffab3ec64143e1ca3fe10bc4790c177ee3619c']],
  ['content/rl-sim2real/legged-locomotion.mdx', [13891, 'b6f9b61a3bac25c098d0e2843780d4780b0ab8b865bfd7b39a273d2ea7f17dc3']],
  ['content/rl-sim2real/offline-rl.mdx', [13530, '029b258d5819fa7de1e20f053ae79330426f2243fabfe820c96c1bcaa7677735']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [11879, 'de3f835a25ec25e9a63bee2054f64e7ffbaac61861ca5f80b88b1afabe0f3076']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [17765, '79f2c2c2674b75442a8b2682648b6b14790f167c90b20553b5fc80eefc892c78']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [19498, '1d99e5e554a7f0800e6c326db4edb90349813de0dfdd768b510e6b4997ce439a']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [9108, 'ba47fe9cd518551edf9ffc5e373e4aa44ab7e7cb29afec62aedcd760430d4c90']],
]);
// END figure-mount pins

/** The admitted figure components and the components/interactive/ file each is imported from. */
const FIGURE_MOUNTS: Readonly<Record<string, string>> = {
  CalibrationChain: 'calibration-chain',
  Ros2PolicyLayout: 'ros2-policy-layout',
  HandEyePoses: 'hand-eye-poses',
  QosQueueAge: 'qos-queue-age',
  Ros2Interfaces: 'ros2-interfaces',
  TimeOffsetMiss: 'time-offset-miss',
  OfflineValueOverreach: 'offline-value-overreach',
  TrajectoryStitching: 'trajectory-stitching',
  RealRobotRlGains: 'real-robot-rl-gains',
  HumanoidPickHeight: 'humanoid-pick-height',
  ActuatorGap: 'actuator-gap',
  TerrainCurriculum: 'terrain-curriculum',
  RetargetingGap: 'retargeting-gap',
  RobotsPerGpu: 'robots-per-gpu',
  NewtonSolvers: 'newton-solvers',
  ReplayReuse: 'replay-reuse',
  HindsightRelabel: 'hindsight-relabel',
  ScannedTwinCheck: 'scanned-twin-check',
  DemoOrSim: 'demo-or-sim',
  CubeTrials: 'cube-trials',
};

const importLine = (name: string, file: string) => `\nimport { ${name} } from '@/components/interactive/${file}';\n\n`;
const mountLine = (name: string) => `\n\n<${name} className="my-6" />\n\n`;

/**
 * The article with each admitted figure's import line and one-line mount
 * taken out. A figure is taken out only when its import and its mount each
 * appear exactly once; anything else is left in place, so it cannot match a
 * predecessor that lacked it.
 */
export function withoutFigureMounts(source: string): string {
  let result = source;
  for (const [name, file] of Object.entries(FIGURE_MOUNTS)) {
    const imports = result.split(importLine(name, file));
    if (imports.length !== 2) continue;
    const mounts = imports.join('\n').split(mountLine(name));
    if (mounts.length !== 2) continue;
    result = mounts.join('\n\n');
  }
  return result;
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
 * The article obligations of a figure-mount change: the article is a content
 * MDX file, it changed, and taking out the admitted figure imports and
 * mounts gives the prior bytes exactly, so no prose, number, citation,
 * frontmatter field or other mount moved.
 */
export function keepsFigureMountObligations(path: string, prior: string, current: string): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  return withoutFigureMounts(current) === prior;
}

/**
 * The pre-mount bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyFigureMountSource(source: FigureMountSource, live: Buffer): Buffer {
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
    !keepsFigureMountObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, FigureMountReview>();
const priorCache = new Map<string, Buffer>();

export function loadFigureMountReview(root: string): FigureMountReview {
  let bytes: Buffer;
  let review: FigureMountReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as FigureMountReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'figure-mount-continuity-v1' || review.name !== 'figure-mounts-20261007' ||
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
    const source = loadFigureMountReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyFigureMountSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the figure-mount review holds a successor for. */
export const figureMountSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function figureMountPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
