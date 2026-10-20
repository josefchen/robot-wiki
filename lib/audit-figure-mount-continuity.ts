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
 *
 * Extended on 2026-10-15 by two frontier figures (BearCaseLock in the bear
 * case, SafetyFilterFence in safety and assurance), mounted the same way
 * after both articles' image mounts of the same day, by two world-models
 * figures (ExcavatorPractice in model-based robot learning, PlannerExploit in
 * world models versus simulators), mounted after both articles' image mounts
 * of 2026-10-13, and by three manipulation figures (ImpedancePress in action
 * spaces, ChunkBuffer in the comparison matrix, KeypointString in
 * hierarchical policies), mounted after the three articles' image mounts.
 * For those seven the mount is the newest change, so the artifact readers
 * call this layer on the live bytes first, before the image-mount layer, as
 * well as in its original place under the word-budget trim. A call only
 * rebuilds bytes that are exactly a reviewed successor, so each article is
 * rebuilt at exactly one of the two places.
 *
 * Extended again on 2026-10-19 by KinematicTwin in teleoperation rigs,
 * mounted the same way after that article's image mounts of 2026-10-15, so
 * the same early read rebuilds it.
 *
 * Extended on 2026-10-19 also by ScopeFollow in surgical robotics, the first
 * article to gain a second admitted figure after newer layers rewrote it
 * (its MotionPantograph mount of 2026-10-12 sits under the adjacent cut and
 * image mounts). The review may therefore hold more than one successor for
 * one path, each pinned by its own bytes: the late read on the live article
 * rebuilds the bytes before the newest mount, and the read in its original
 * place rebuilds the bytes before the oldest. A later mount's obligation is
 * the same as a first one's: taking out the admitted imports and mounts the
 * prior bytes did not already carry gives the prior bytes exactly.
 *
 * Extended on 2026-10-20 by three manipulation figures (NoiseOrEdit in RL
 * fine-tuning, DeltaFrame in the robot-learning roadmap, HandMotionShare in
 * cross-embodiment transfer), mounted the same way after the three articles'
 * image mounts of 2026-10-13, so the same early read rebuilds them.
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
const reviewPin = { bytes: 64540, sha256: 'f25ba73bcf8cd101cddc6ffbe81d28c1aa8970f7457317c9b6e67c7e085f2c99' };

/** Reviewed successor bytes per path (one per mount change, oldest first), so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly (readonly [number, string])[]> = new Map([
  ['content/adjacent/surgical.mdx', [[13598, 'cffde9f2ee237da5e27c744f7e62bd8f7ac75a914a27487f3fed2e7a9c7dfdf6'], [12535, 'b229640fa753e33d14441269b9fd68424f6775ffaa6dc5ac6e35143c125937f3']]],
  ['content/classical/calibration.mdx', [[10030, 'ffc769f31d4b00ea8624283b9af7d4d9d0b71bcd6ff55ec6887f5cf83429fdf5']]],
  ['content/classical/ros2-for-ml-engineers.mdx', [[9930, '65fb50d6229dde8c3446194236429481a1ac0799e99753471a29c95317731fb7']]],
  ['content/classical/scene-representation.mdx', [[16480, '515349d6cfefb7b6df9130a8719889c0f0c56e0219b25453644f0a2929ad0078']]],
  ['content/classical/state-estimation.mdx', [[14073, 'f4ee9d7b68feee568ecf5b21f95d37bfda3f51443c96533816d9929f214232c1']]],
  ['content/data-hardware/robot-learning-stack.mdx', [[11133, 'd5721a94dca00a2436bd40421cd71a69a0419c87459c160403e2c97141564b39']]],
  ['content/data-hardware/teleop-rigs.mdx', [[9699, 'f0115721ca4182a93ab1047168171137f738ebb2bc777439a59c0418e42bc5fa']]],
  ['content/frontier/bear-case.mdx', [[10227, '20caa5e4beb5395a272276347a9e9d6a370d7a88a7ec385df815d6e3521de8d4']]],
  ['content/frontier/competing-theses.mdx', [[15754, '265c64148b37d05e0947a6679ab2e9673fe40aa7dc069e8e702b529f86a2627a']]],
  ['content/frontier/safety-and-assurance.mdx', [[18466, '6bca2f2c739c1205b6aba50f63c357c8f2f4ee9c8501dd481e17a8aa8233cde5']]],
  ['content/manipulation/action-spaces.mdx', [[9102, '73e527d6c46472d025e3840f75c70cf8f388422d5f29efcf0cd9e19c46d13d8a']]],
  ['content/manipulation/comparison-matrix.mdx', [[9486, '29f74c7b927967f87763dbccc9e39236825addd0464b401d06a0fc08d4db85a2']]],
  ['content/manipulation/cross-embodiment.mdx', [[9920, '944ed6bd2a3a9c014498a16f4f0e7e0e06e65650192688ed107e4cc2d7695997']]],
  ['content/manipulation/hierarchical.mdx', [[11994, '315d07be25045cccbb4a4ff863b545be417ee198b7ff55263f650b4ec8579b19']]],
  ['content/manipulation/rl-finetuning.mdx', [[18253, 'd14cb02e5e38ba1270cecf249a7d4eae0c782ab820787f0891eeb67189f98499']]],
  ['content/manipulation/robot-learning-roadmap.mdx', [[9031, '8c868d5a44291ee09ecb915dc342a5cb4f5dfeed454c7ead1a0cec5fc6494f8d']]],
  ['content/rl-sim2real/humanoid-wbc.mdx', [[15826, '0286490b18ce62845fa3cb42eeffab3ec64143e1ca3fe10bc4790c177ee3619c']]],
  ['content/rl-sim2real/legged-locomotion.mdx', [[13891, 'b6f9b61a3bac25c098d0e2843780d4780b0ab8b865bfd7b39a273d2ea7f17dc3']]],
  ['content/rl-sim2real/offline-rl.mdx', [[13530, '029b258d5819fa7de1e20f053ae79330426f2243fabfe820c96c1bcaa7677735']]],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [[11879, 'de3f835a25ec25e9a63bee2054f64e7ffbaac61861ca5f80b88b1afabe0f3076']]],
  ['content/rl-sim2real/rl-for-robotics.mdx', [[17765, '79f2c2c2674b75442a8b2682648b6b14790f167c90b20553b5fc80eefc892c78']]],
  ['content/rl-sim2real/sim2real-transfer.mdx', [[19498, '1d99e5e554a7f0800e6c326db4edb90349813de0dfdd768b510e6b4997ce439a']]],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [[9108, 'ba47fe9cd518551edf9ffc5e373e4aa44ab7e7cb29afec62aedcd760430d4c90']]],
  ['content/world-models/model-based-robot-learning.mdx', [[9076, '0ea0f60d5f11bfc29db4fa4b14a2e519c893ad23d0038ada0049f0e0b20f4d07']]],
  ['content/world-models/world-models-vs-simulators.mdx', [[11575, '6df3698ece3b73c20a741500c0daf5545c08c49420ccc46b178c5e103de641b5']]],
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
  SceneSplit: 'scene-split',
  MotionPantograph: 'motion-pantograph',
  HelixClockwork: 'helix-clockwork',
  BearCaseLock: 'bear-case-lock',
  SafetyFilterFence: 'safety-filter-fence',
  ExcavatorPractice: 'excavator-practice',
  PlannerExploit: 'planner-exploit',
  ImpedancePress: 'impedance-press',
  ChunkBuffer: 'chunk-buffer',
  KeypointString: 'keypoint-string',
  KinematicTwin: 'kinematic-twin',
  ScopeFollow: 'scope-follow',
  NoiseOrEdit: 'noise-or-edit',
  DeltaFrame: 'delta-frame',
  HandMotionShare: 'hand-motion-share',
  LinearizationGap: 'linearization-gap',
  LoopClosure: 'loop-closure',
};

const importLine = (name: string, file: string) => `\nimport { ${name} } from '@/components/interactive/${file}';\n\n`;
const mountLine = (name: string) => `\n\n<${name} className="my-6" />\n\n`;

/** The admitted figures whose import line an article already carries. */
export function figureMountsIn(source: string): ReadonlySet<string> {
  return new Set(Object.entries(FIGURE_MOUNTS).filter(([name, file]) => source.includes(importLine(name, file))).map(([name]) => name));
}

/**
 * The article with each admitted figure's import line and one-line mount
 * taken out, except the figures named in `keep`. A figure is taken out only
 * when its import and its mount each appear exactly once; anything else is
 * left in place, so it cannot match a predecessor that lacked it.
 */
export function withoutFigureMounts(source: string, keep: ReadonlySet<string> = new Set()): string {
  let result = source;
  for (const [name, file] of Object.entries(FIGURE_MOUNTS)) {
    if (keep.has(name)) continue;
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
 * mounts it did not already carry gives the prior bytes exactly, so no
 * prose, number, citation, frontmatter field or other mount moved.
 */
export function keepsFigureMountObligations(path: string, prior: string, current: string): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  return withoutFigureMounts(current, figureMountsIn(prior)) === prior;
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
  const pinned = [...successors].flatMap(([path, list]) => list.map(([bytes, sha256]) => `${path}\0${bytes}\0${sha256}`));
  const recorded = new Set(review.sources?.map(({ after }) => `${after?.path}\0${after?.bytes}\0${after?.sha256}`));
  if (review.sources?.length !== pinned.length || recorded.size !== pinned.length || pinned.some((key) => !recorded.has(key))) {
    throw new Error(drift);
  }
  reviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

function rebuiltPrior(root: string, path: string, live: Buffer): Buffer {
  const key = `${root}\0${path}\0${digest(live)}`;
  let prior = priorCache.get(key);
  if (!prior) {
    const source = loadFigureMountReview(root).sources.find(({ after }) => same(after, path, live.length, digest(live)))!;
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
  if (!pinned || !pinned.some(([bytes]) => bytes === live.length)) return live;
  const liveHash = digest(live);
  if (!pinned.some(([bytes, sha256]) => bytes === live.length && sha256 === liveHash) ||
    (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
