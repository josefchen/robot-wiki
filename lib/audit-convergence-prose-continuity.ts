/**
 * Exact successor review for the articles the opus-pass convergence prose and
 * sources slice of 2026-10-26 edits: plain-prose fixes, restored numbers,
 * primary sources beside or in place of press stories, citations for
 * paragraphs that had none, and the review dates those edits move. Each
 * change is recorded as exact edits over the bytes the article had before,
 * so the earlier bytes are rebuilt from the live article instead of being
 * archived.
 *
 * A successor may not add, drop or reorder a figure: its import lines and
 * the sequence of block components at the start of a line equal the
 * predecessor's. Every source the predecessor's body cites is still cited in
 * the successor's body, unless the review names it as replaced by a source
 * the successor cites, with the reason.
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

export const CONVERGENCE_PROSE_CONTINUITY_DIR = 'audit/evidence/convergence-prose-20261026/';
const reviewFile = `${CONVERGENCE_PROSE_CONTINUITY_DIR}source-transition.json`;
const drift = 'convergence-prose continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ConvergenceProseEdit = { before: string; after: string };
export type ConvergenceProseReplacement = { from: string; to: string; reason: string };
export type ConvergenceProseSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: ConvergenceProseEdit[];
  replacedCitations?: ConvergenceProseReplacement[];
};
export type ConvergenceProseReview = {
  schemaVersion: 'convergence-prose-continuity-v1';
  name: 'convergence-prose-20261026';
  reviewedBy: string;
  rationale: string;
  ownerApproval: string;
  observedAt: string;
  sources: ConvergenceProseSource[];
};

// BEGIN convergence-prose pins (written by scripts/record-convergence-prose-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 52041, sha256: '4a357f5fae62b553dc3a57d6eb5fc7618f80ea59891d0b1b637058d69896ec02' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/control.mdx', [17047, 'b371169d0db8a0671379a069fe87d32c9c079425c16fd49b33f4394e9771c8fc']],
  ['content/classical/kinematics.mdx', [11050, 'e3f96b9586529dc16981e8d489e4ba83ebc88f32cdf749b31080c0ebfebfbc59']],
  ['content/classical/perception.mdx', [21919, '7fee182fcb5f7f1373558e04f821f17371f999f4681e797af35e8cd6abcf2222']],
  ['content/classical/scene-representation.mdx', [16762, '981fb16cc0586cc227c98cf665cc494f81a5b4d8f53c82c2fb8d7e2b18b89db7']],
  ['content/data-hardware/data-bottleneck.mdx', [14260, '514749c81c4ec92cac2f8fb5bf632a46a7b29e190c066100d66a71530ba09ad4']],
  ['content/data-hardware/datasets.mdx', [12200, '84b52070b682ec6f504101f7a4142da30c77d010182788c2783166602316712a']],
  ['content/data-hardware/evaluation-crisis.mdx', [16562, 'bca4dd293dfc0310233ee3aa699e8487b8bc269d93367d29fd8f333cd0a7fbe6']],
  ['content/data-hardware/hardware-taxonomy.mdx', [11562, '5a951632d7f979d9962b97253705179c71253c663b25ecd5b861c8120cc0a095']],
  ['content/data-hardware/industrial-deployment.mdx', [17753, '8c7229f5f8a07b525e5523e0750743e18116ed5146a912b98c84560c5a52fe8e']],
  ['content/data-hardware/robot-learning-stack.mdx', [10647, '88357b660995fad31819eade32e62869f012b635f571966fb56105d623c930ec']],
  ['content/data-hardware/teleop-rigs.mdx', [11172, '4b96137ef5926269f13434ace22197c31e436828d9af5c757ce184a5fc79fe86']],
  ['content/frontier/bear-case.mdx', [10521, '752dac5da3000fd7c3da1432b201d52628e899a267a9eb139b97cce7a5780bbc']],
  ['content/frontier/competing-theses.mdx', [14763, '001ddceccfa16abde8f5f34525d5b388e8bf23976e6344fde3a75cc04d3c6904']],
  ['content/frontier/dexterity.mdx', [18324, '16f522154dc6d7af7f8078140c14f1c9fa9bf99b4d32568a39d68cdce7203fe3']],
  ['content/frontier/generalization.mdx', [13877, '2598a647378346fa0d5761ccb3163f566b01f8d47879444c930ce4c04c6759fb']],
  ['content/frontier/reliability-gap.mdx', [10875, 'c4d003acc2efb1cbcc5b4517db07eb5b96b7a5ea4c62511dbeaed8e889e7e8a5']],
  ['content/frontier/safety-and-assurance.mdx', [18572, 'beceef25138934f8a4326f8e8659bc5ff62e5ddf68b3de197383e9ec4bba86ad']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [13910, '23f350fa18492c0cb429f3bf178640b235bd419367b5a6545986c9f357a9bb3f']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [12301, '8815008fd1e30b0ab297d67c73b186764295f26078734a0853a97d5ceb54687d']],
  ['content/world-models/jepa.mdx', [12716, '882326687d367951f7241abf1f78426c21321f40b73d2d732eb554cbd9c6e42b']],
  ['content/world-models/latent-dynamics.mdx', [10777, 'b25b62340cffb2bb29a836e34a05f0a45d3f2229139af5e027a6d8b5489aabcf']],
]);
// END convergence-prose pins

const body = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, '');
const importLines = (text: string) => text.split('\n').filter((line) => /^import\s.+\sfrom\s/.test(line));
const blockComponents = (text: string) => [...body(text).matchAll(/^<([A-Z][A-Za-z0-9.]*)/gm)].map((match) => match[1]);
const citedIds = (text: string) => new Set([...body(text).matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]));

/**
 * The article obligations of a convergence prose edit: the file is an
 * article, it changed, its imports and block components are unchanged, and
 * every source its body cited is still cited or is named as replaced by a
 * source the successor cites.
 */
export function keepsConvergenceProseObligations(
  path: string, prior: string, current: string, replaced: readonly ConvergenceProseReplacement[] = [],
): boolean {
  if (!/^content\/[a-z0-9-]+\/[a-z0-9-]+\.mdx$/.test(path) || prior === current) return false;
  if (importLines(prior).join('\n') !== importLines(current).join('\n')) return false;
  if (blockComponents(prior).join(',') !== blockComponents(current).join(',')) return false;
  const before = citedIds(prior);
  const after = citedIds(current);
  if (replaced.some(({ from, to, reason }) => !before.has(from) || after.has(from) || !after.has(to) ||
    typeof reason !== 'string' || reason.length < 40)) {
    return false;
  }
  const replacedIds = new Set(replaced.map(({ from }) => from));
  return [...before].every((id) => after.has(id) || replacedIds.has(id));
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
 * The pre-edit bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyConvergenceProseSource(source: ConvergenceProseSource, live: Buffer): Buffer {
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
    !keepsConvergenceProseObligations(path, rebuilt, current, source.replacedCitations ?? [])) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, ConvergenceProseReview>();
const priorCache = new Map<string, Buffer>();

export function loadConvergenceProseReview(root: string): ConvergenceProseReview {
  let bytes: Buffer;
  let review: ConvergenceProseReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as ConvergenceProseReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'convergence-prose-continuity-v1' || review.name !== 'convergence-prose-20261026' ||
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
    const source = loadConvergenceProseReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyConvergenceProseSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the convergence-prose review holds a successor for. */
export const convergenceProseSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function convergenceProsePredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
