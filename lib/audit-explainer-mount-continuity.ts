/**
 * Exact successor review for the home articles that mount a 3D explainer
 * (VAL-OPUS-153, convergence of 2026-10-26). Each of the twelve curriculum
 * explainers is mounted once, in the first home article the curriculum names
 * for it (components/explainers/mounts.ts), and kinematics, a second home
 * article of the arm explainer, links to it. Each change is recorded as exact
 * edits over the bytes the article had before, so the earlier bytes are
 * rebuilt from the live article instead of being archived.
 *
 * A successor may differ from its predecessor only by: the one import line
 * of the explainer figure, on its own line after the article's imports; the
 * one-line mount of the explainer its table row names, between blank lines;
 * that row's cue sentence, appended to the paragraph just before the mount;
 * and links to /how-robots-work/ anchors wrapped around existing words.
 * Taking those out of the successor gives the predecessor exactly, so every
 * number, citation, glossary occurrence and other link is unchanged.
 *
 * These are the newest changes to their files, so the artifact readers call
 * this layer on the live bytes first, before every older layer. It hands an
 * older check the rebuilt bytes only while the live article is exactly the
 * reviewed successor, reversing the edits rebuilds bytes that hash to the
 * recorded predecessor, and replaying them gives the live bytes back. No old
 * review, run, receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPLAINER_MOUNTS } from '../components/explainers/mounts.ts';

export const EXPLAINER_MOUNT_CONTINUITY_DIR = 'audit/evidence/explainer-mounts-20261026/';
const reviewFile = `${EXPLAINER_MOUNT_CONTINUITY_DIR}source-transition.json`;
const drift = 'explainer-mount continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ExplainerMountEdit = { before: string; after: string };
export type ExplainerMountSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: ExplainerMountEdit[] };
export type ExplainerMountReview = {
  schemaVersion: 'explainer-mount-continuity-v1';
  name: 'explainer-mounts-20261026';
  reviewedBy: string;
  rationale: string;
  ownerApproval: string;
  observedAt: string;
  sources: ExplainerMountSource[];
};

// BEGIN explainer-mount pins (written by scripts/record-explainer-mount-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 24910, sha256: '1fe2479d2c65917b1d428dfaab62cdc3afd4292d4027fde90f5a514c2f4ebe32' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/adjacent/drones.mdx', [13860, 'a4433d509c6b9f63950a41bb485cece53cd74b455cf8aa5b82be5adb01bbacfe']],
  ['content/classical/grasp-planning.mdx', [12832, '64451cba15010e4039106b9e941de34febba8741e654f82ac82c4ec30be5c808']],
  ['content/classical/kinematics.mdx', [10994, '8451978739c776c203605c0ac66ab411b990f155569262820f75d07060bd4c45']],
  ['content/classical/motion-planning.mdx', [18553, 'cc21591384cfdaeb31252ee9e8c122dc2a38e9442d4e435316663240b0b82b7c']],
  ['content/classical/scene-representation.mdx', [16650, '4a1265574ee4408e040ced46ef2b61665bac9083771a330e8dc1945dfbdad75a']],
  ['content/classical/state-estimation.mdx', [15508, '12bdc339311f21d8bb24a8152deabb2081f3f25a23dae7ba2b85d532c2f1609c']],
  ['content/data-hardware/hardware-taxonomy.mdx', [11434, 'e0c7afb20c2a5de3d63e0500014efa386a4ade66ca1d6b4bdcc28f051afc4579']],
  ['content/data-hardware/teleop-rigs.mdx', [11197, 'b3106048faa1dd919137f754db6840e90f1e83c22eae122915c355be2395af1b']],
  ['content/frontier/dexterity.mdx', [17973, '6a77a821e58dd11a4da30e450cabb150933e93597e9db912a684ecc92d8e8ad3']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [15836, 'd2890829da00f251c161b5f4e4019d4589a0842fe6a0d2aac8853e73ded1daf1']],
  ['content/rl-sim2real/legged-locomotion.mdx', [13030, '647285a60c502735f82f944ebce0869127db25d15e2dee071162b0a9da8a9534']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [10301, 'c633af5ff2cc7a40311c33c0832cc4a1d0672e3c047ae6d1a8f3e361aa991891']],
]);
// END explainer-mount pins

export const EXPLAINER_IMPORT = "import { ExplainerFigure } from '@/components/explainers/explainer-figure';";

/**
 * Cue sentences as this review recorded them where a later reviewed edit
 * rewrote the row's cue (the 2026-10-26 convergence-prose layer records the
 * article side of that rewrite), so the reviewed successors keep checking the
 * exact cue they were recorded with.
 */
const REVIEWED_CUES: Readonly<Record<string, string>> = {
  reaching: 'Drag the cup in the figure below and watch the arm work out an angle for every joint.',
};

/** The cue sentence this review recorded for an explainer's mount. */
export const explainerMountReviewedCue = (id: string): string =>
  REVIEWED_CUES[id] ?? EXPLAINER_MOUNTS[id as keyof typeof EXPLAINER_MOUNTS].cue;
const HOW_ROBOTS_WORK_LINK = /\[([^\]\n]+)\]\(\/how-robots-work\/#[a-z]+\)/g;
const once = (text: string, part: string) => text.split(part).length === 2;

/**
 * The article obligations of an explainer mount: the file is the home article
 * of exactly one explainer or links to one, it changed, and taking out the
 * import, the mount, the cue and any new /how-robots-work/ link wrapping gives
 * the predecessor exactly.
 */
export function keepsExplainerMountObligations(path: string, prior: string, current: string): boolean {
  if (prior === current || prior.includes('ExplainerFigure')) return false;
  const homes = Object.entries(EXPLAINER_MOUNTS).filter(([, row]) => `content/${row.article}.mdx` === path);
  const linked = Object.values(EXPLAINER_MOUNTS).some((row) => row.linkedFrom.some((a) => `content/${a}.mdx` === path));
  if (homes.length > 1 || (homes.length === 0 && !linked)) return false;
  let text = current;
  if (homes.length === 1) {
    const [id] = homes[0];
    const cue = explainerMountReviewedCue(id);
    const importLine = `\n${EXPLAINER_IMPORT}\n\n`;
    const mount = `\n\n<ExplainerFigure id="${id}" />`;
    const cued = ` ${cue}${mount}\n\n`;
    if (!once(text, importLine) || !once(text, cued) || text.split('ExplainerFigure').length !== 3) return false;
    text = text.split(importLine).join('\n').split(cued).join('\n\n');
  } else if (text.includes('ExplainerFigure')) {
    return false;
  }
  const links = (value: string) => value.match(HOW_ROBOTS_WORK_LINK)?.length ?? 0;
  if (links(text) < links(prior)) return false;
  const unwrap = (value: string) => value.replace(HOW_ROBOTS_WORK_LINK, '$1');
  return unwrap(text) === unwrap(prior) && (text === prior || links(text) > links(prior));
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
 * The pre-mount bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyExplainerMountSource(source: ExplainerMountSource, live: Buffer): Buffer {
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
    !keepsExplainerMountObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, ExplainerMountReview>();
const priorCache = new Map<string, Buffer>();

export function loadExplainerMountReview(root: string): ExplainerMountReview {
  let bytes: Buffer;
  let review: ExplainerMountReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as ExplainerMountReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'explainer-mount-continuity-v1' || review.name !== 'explainer-mounts-20261026' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !(review.ownerApproval?.length > 40) ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
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
    const source = loadExplainerMountReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyExplainerMountSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the explainer-mount review holds a successor for. */
export const explainerMountSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function explainerMountPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
