/**
 * Exact successor review for the articles the opus-pass owed-figures slices
 * of 2026-10-26 edit: data figures mounted where the domain passes owed
 * them, the sentences and sources that came with them, front-matter
 * citations no sentence, figure or guide row cites any more, and the review
 * dates those edits move. Each change is recorded as exact edits over the
 * bytes the article had before, so the earlier bytes are rebuilt from the
 * live article instead of being archived. Later owed-figures slices extend
 * this review rather than adding a layer.
 *
 * A successor may add figures but not drop or reorder one: the predecessor's
 * import lines and its sequence of block components at the start of a line
 * are subsequences of the successor's, and every added import names an
 * interactive figure that the successor mounts exactly once as a new block
 * component. Every source the predecessor's body cites is still cited in the
 * successor's body, unless the review names it as replaced by a source the
 * successor cites, with the reason. Front matter changes only in its
 * citation list: each earlier entry stays, unless the review names it as
 * removed, with the reason, and the successor's body no longer cites it.
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

export const OWED_FIGURES_CONTINUITY_DIR = 'audit/evidence/owed-figures-20261026/';
const reviewFile = `${OWED_FIGURES_CONTINUITY_DIR}source-transition.json`;
const drift = 'owed-figures continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type OwedFiguresEdit = { before: string; after: string };
export type OwedFiguresReplacement = { from: string; to: string; reason: string };
export type OwedFiguresRemoval = { id: string; reason: string };
export type OwedFiguresNotes = {
  replacedCitations?: readonly OwedFiguresReplacement[];
  removedFrontMatterCitations?: readonly OwedFiguresRemoval[];
};
export type OwedFiguresSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: OwedFiguresEdit[];
  replacedCitations?: OwedFiguresReplacement[];
  removedFrontMatterCitations?: OwedFiguresRemoval[];
};
export type OwedFiguresReview = {
  schemaVersion: 'owed-figures-continuity-v1';
  name: 'owed-figures-20261026';
  reviewedBy: string;
  rationale: string;
  ownerApproval: string;
  observedAt: string;
  sources: OwedFiguresSource[];
};

// BEGIN owed-figures pins (written by scripts/record-owed-figures-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 13690, sha256: 'd9125b83aabdd5dbfb35d89af77923148d1df1351bbfa71e3df401df61f6616f' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/data-hardware/datasets.mdx', [12320, '7e04f8b17c68b6caf8c43e1f77c996933c38fe5a3260f3d8abe9d324eb105738']],
  ['content/data-hardware/hardware-taxonomy.mdx', [12045, '7fc97eecb1680f24639e3625bab657780f6634a7fc6359f49ac65ac0c0e54af5']],
  ['content/data-hardware/industrial-deployment.mdx', [17821, '090208e45063d44a37090bb328158b98d53faa9edc951a88db1fcb078127c299']],
  ['content/data-hardware/robot-learning-stack.mdx', [10929, 'b75b094ff7c2b1442aa2f90259dd89f8e93b137d775c307c72a78ba9f36327b1']],
  ['content/data-hardware/teleop-rigs.mdx', [11644, '91ea6ee42d4635e6a7f9ccaa2898fad0e0b7f56bada85dc392df0eae14521a44']],
]);
// END owed-figures pins

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;
const body = (text: string) => text.replace(FRONT_MATTER, '');
const importLines = (text: string) => text.split('\n').filter((line) => /^import\s.+\sfrom\s/.test(line));
const blockComponents = (text: string) => [...body(text).matchAll(/^<([A-Z][A-Za-z0-9.]*)/gm)].map((match) => match[1]);
const citedIds = (text: string) => new Set([...body(text).matchAll(/<Cite id="([^"]+)"/g)].map((match) => match[1]));
const FIGURE_IMPORT = /^import \{ ([A-Z][A-Za-z0-9]*) \} from '@\/components\/interactive\/[a-z0-9-]+';$/;

/** The front matter split into its citation ids and every other line. */
function frontMatter(text: string): { citations: string[]; rest: string } | null {
  const block = text.match(FRONT_MATTER)?.[1];
  if (block === undefined) return null;
  const citations: string[] = [];
  const rest: string[] = [];
  let inCitations = false;
  for (const line of block.split('\n')) {
    if (line === 'citations:') {
      inCitations = true;
      rest.push(line);
      continue;
    }
    const entry = inCitations ? line.match(/^ {2}- ([a-z0-9-]+)$/) : null;
    if (entry) {
      citations.push(entry[1]);
      continue;
    }
    inCitations = false;
    rest.push(line);
  }
  return { citations, rest: rest.join('\n') };
}

/** The items `whole` holds beyond `part`, or null unless `part` is a subsequence of it. */
function added<T>(part: readonly T[], whole: readonly T[]): T[] | null {
  const extra: T[] = [];
  let index = 0;
  for (const item of whole) {
    if (index < part.length && item === part[index]) index += 1;
    else extra.push(item);
  }
  return index === part.length ? extra : null;
}

/**
 * The article obligations of an owed-figures edit: the file is an article,
 * it changed, it only adds figures (each imported once and mounted once as a
 * new block component), every source its body cited is still cited or is
 * named as replaced by a source the successor cites, and its front matter
 * changes only in citations, each removal named with its reason.
 */
export function keepsOwedFiguresObligations(
  path: string, prior: string, current: string, notes: OwedFiguresNotes = {},
): boolean {
  if (!/^content\/[a-z0-9-]+\/[a-z0-9-]+\.mdx$/.test(path) || prior === current) return false;
  const addedImports = added(importLines(prior), importLines(current));
  const addedBlocks = added(blockComponents(prior), blockComponents(current));
  if (!addedImports || !addedBlocks) return false;
  const figures = addedImports.map((line) => line.match(FIGURE_IMPORT)?.[1]);
  if (figures.some((name) => !name) || new Set(figures).size !== figures.length) return false;
  if ([...addedBlocks].sort().join(',') !== [...figures].sort().join(',')) return false;
  if (figures.some((name) => blockComponents(prior).includes(name!))) return false;

  const before = citedIds(prior);
  const after = citedIds(current);
  const replaced = notes.replacedCitations ?? [];
  if (replaced.some(({ from, to, reason }) => !before.has(from) || after.has(from) || !after.has(to) ||
    typeof reason !== 'string' || reason.length < 40)) {
    return false;
  }
  const replacedIds = new Set(replaced.map(({ from }) => from));
  if (![...before].every((id) => after.has(id) || replacedIds.has(id))) return false;

  const priorFront = frontMatter(prior);
  const currentFront = frontMatter(current);
  if (!priorFront || !currentFront || priorFront.rest !== currentFront.rest) return false;
  const removed = notes.removedFrontMatterCitations ?? [];
  const kept = new Set(currentFront.citations);
  if (removed.some(({ id, reason }) => !priorFront.citations.includes(id) || kept.has(id) || after.has(id) ||
    typeof reason !== 'string' || reason.length < 40)) {
    return false;
  }
  const removedIds = new Set(removed.map(({ id }) => id));
  return priorFront.citations.every((id) => kept.has(id) || removedIds.has(id)) &&
    [...kept].length === currentFront.citations.length;
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
export function verifyOwedFiguresSource(source: OwedFiguresSource, live: Buffer): Buffer {
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
    !keepsOwedFiguresObligations(path, rebuilt, current, source)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, OwedFiguresReview>();
const priorCache = new Map<string, Buffer>();

export function loadOwedFiguresReview(root: string): OwedFiguresReview {
  let bytes: Buffer;
  let review: OwedFiguresReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as OwedFiguresReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'owed-figures-continuity-v1' || review.name !== 'owed-figures-20261026' ||
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
    const source = loadOwedFiguresReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyOwedFiguresSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the owed-figures review holds a successor for. */
export const owedFiguresSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function owedFiguresPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
