/**
 * Exact successor review for the frontier articles the owner-approved length
 * cut of 2026-10-13 shortened (Josef, 12 Oct 2026: "ensure we remove AI slop
 * etc and keep it extremely premium. not too long text."; the length decision
 * in the humanize lane). The frontier domain pass keeps its own record and
 * holds each article to the obligations of the world-models length cut of
 * 2026-10-12: frontmatter, imports, one-line mounts and component blocks kept
 * exactly and in order, every earlier heading anchor reachable, citations,
 * numbers, link targets and glossary ids only thinned and every one that left
 * the body listed with the claim it came from, at least 30 distinct sources
 * cited, and a shorter body.
 *
 * One addition: a component block (a stat strip or a self-check) may change
 * only as a recorded correction, the exact block before and after with the
 * reason, for a tile with no source behind it, a stale date or an
 * unsupported self-check explanation. The obligations are checked with each
 * corrected block put back, so a correction cannot carry an added citation,
 * number, link or glossary id past them. The earlier bytes are rebuilt from
 * the live file by reversing the recorded edits, and older checks see them
 * only while the live article is exactly the reviewed successor. No old
 * review, run, receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  keepsWorldModelsLengthCutObligations, type LengthCutDrops, type LengthCutEdit, type LengthCutPin,
} from './audit-length-cut-world-models-continuity.ts';

export const FRONTIER_LENGTH_CUT_CONTINUITY_DIR = 'audit/evidence/length-cut-20261013-frontier/';
const reviewFile = `${FRONTIER_LENGTH_CUT_CONTINUITY_DIR}source-transition.json`;
const drift = 'frontier length cut continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
/** A component block the cut corrected: the exact block before and after, and why. */
export type LengthCutCorrection = { before: string; after: string; reason: string };
export type FrontierLengthCutSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: LengthCutEdit[];
  dropped: LengthCutDrops;
  pins: LengthCutPin[];
  corrected: LengthCutCorrection[];
};
export type FrontierLengthCutReview = {
  schemaVersion: 'length-cut-continuity-v1';
  name: 'length-cut-20261013-frontier';
  reviewedBy: string;
  ownerApproval: string;
  rationale: string;
  observedAt: string;
  sources: FrontierLengthCutSource[];
};

// BEGIN frontier length-cut pins (written by scripts/record-length-cut-frontier-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 125584, sha256: '3038c990bf24b33e6e0bba1c0cb89deb94ac6e21710a1d6f96794b3bada1029a' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/frontier/bear-case.mdx', [10051, '6d04e10afeba9b203f1da2393329d0ec98ac250a93f3bf4347d953666e338938']],
  ['content/frontier/competing-theses.mdx', [14273, '67f5cef40b7496b71f03449c495e470620b63a77b79fc5cea3b32823e38a0704']],
  ['content/frontier/generalization.mdx', [13782, '013a705bcc0bb5568020a1fe29c8fe87d85763e39ed2a19dd623a612ac9f8f69']],
  ['content/frontier/reliability-gap.mdx', [10756, '78330757c0d25fae42486ad39b2fae0190968ea489b821ac76431087368aabd9']],
  ['content/frontier/safety-and-assurance.mdx', [18159, '2be7ebef52a06c85830867d9249b1d566183a11f9f7ec353d9b8903340a390e4']],
]);
// END frontier length-cut pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const body = (source: string) => source.slice(source.match(/^---\n[\s\S]*?\n---\n/)?.[0].length ?? 0);
const componentBlocks = (text: string) =>
  [...text.matchAll(/\n(<SelfCheck[\s\S]*?\n\/>|<div[\s\S]*?\n<\/div>)/g)].map((match) => match[1]);
const occursOnce = (text: string, part: string) => text.split(part).length === 2;

/**
 * The live article with each recorded correction put back, or null unless
 * every correction names a whole component block the earlier article held
 * once, the live article holds once in its place, changed, with a reason.
 */
export function uncorrectedFrontierArticle(
  prior: string, current: string, corrected: readonly LengthCutCorrection[],
): string | null {
  const priorBlocks = componentBlocks(prior);
  const liveBlocks = componentBlocks(current);
  let result = current;
  for (const correction of corrected) {
    const { before, after, reason } = correction ?? ({} as Partial<LengthCutCorrection>);
    if (typeof before !== 'string' || typeof after !== 'string' || !before || !after || before === after ||
      typeof reason !== 'string' || reason.length < 40 || !priorBlocks.includes(before) ||
      !liveBlocks.includes(after) || !occursOnce(prior, before) || !occursOnce(result, after)) {
      return null;
    }
    result = result.split(after).join(before);
  }
  return result;
}

/**
 * The article obligations of the frontier cut: a frontier article that,
 * with its corrections put back, keeps every obligation of the world-models
 * length cut, whose pins hold against the live text, and whose live body has
 * fewer words than the earlier one.
 */
export function keepsFrontierLengthCutObligations(
  path: string, prior: string, current: string, dropped: LengthCutDrops,
  pins: readonly LengthCutPin[], corrected: readonly LengthCutCorrection[],
): boolean {
  if (!path.startsWith('content/frontier/') || !Array.isArray(corrected)) return false;
  const restored = uncorrectedFrontierArticle(prior, current, corrected);
  if (restored === null || !keepsWorldModelsLengthCutObligations(path, prior, restored, dropped, [])) return false;
  const pinHolds = ({ phrase, disposition, to, toPath, test }: LengthCutPin) => {
    if (typeof test !== 'string' || !test.startsWith('tests/') || !phrase || !prior.includes(phrase)) return false;
    if (disposition === 'retired') return toPath === undefined && !current.includes(phrase);
    if (disposition !== 'moved' || !to) return false;
    return toPath === undefined ? current.includes(to)
      : toPath !== path && toPath.startsWith('content/') && toPath.endsWith('.mdx') && !current.includes(phrase);
  };
  return pins.every(pinHolds) && words(body(current)) < words(body(prior));
}

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
 * The pre-cut bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyFrontierLengthCutSource(source: FrontierLengthCutSource, live: Buffer): Buffer {
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
    !keepsFrontierLengthCutObligations(path, rebuilt, current, source.dropped, source.pins ?? [], source.corrected)) {
    throw new Error(drift);
  }
  return prior;
}

const reviewCache = new Map<string, FrontierLengthCutReview>();
const priorCache = new Map<string, Buffer>();

export function loadFrontierLengthCutReview(root: string): FrontierLengthCutReview {
  let bytes: Buffer;
  let review: FrontierLengthCutReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as FrontierLengthCutReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'length-cut-continuity-v1' || review.name !== 'length-cut-20261013-frontier' ||
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
    const source = loadFrontierLengthCutReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyFrontierLengthCutSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the frontier length-cut review holds a successor for. */
export const frontierLengthCutSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function frontierLengthCutPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
