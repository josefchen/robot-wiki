/**
 * Exact successor review for the seven data-hardware articles the opus-pass
 * data-hardware domain pass rewrote and cut on 2026-10-13 (Josef, 12 Oct
 * 2026: "ensure we remove AI slop etc and keep it extremely premium. not too
 * long text."; the length decision in the humanize lane). Unlike the
 * world-models and frontier cuts, this pass also brings each article up to
 * the owner sweep of 2026-09-29: dated primary sources replace stale or
 * secondary ones, overtaken claims are corrected, and every article cites at
 * least 30 distinct sources. So citations, numbers, link targets may be added
 * as well as dropped, and every occurrence that left or entered the body is
 * listed in the review with the claim it came from or went into.
 *
 * The pass keeps, exactly and in order, every import line, every one-line
 * figure or component mount and every multi-line component block (stat
 * strips, self-checks), except blocks it records as corrections, each the
 * exact block before and after with a reason. The frontmatter changes only by
 * citation ids appended to its citations list, and every added inline citation
 * is in that list. Every earlier heading anchor stays reachable, every earlier
 * link target and glossary id stays at least once, the glossary ids keep their
 * order of first use, the body cites at least 30 distinct sources, and the
 * body ends shorter than it began. Each change is recorded as exact edits over
 * the bytes the article had before the pass, so the earlier bytes are rebuilt
 * from the live file and older checks see them only while the live article is
 * exactly the reviewed successor. No old review, run, receipt, capture or
 * ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COUNTED, MIN_BODY_SOURCES, headingSlug, type LengthCutDrops, type LengthCutEdit, type LengthCutPin,
} from './audit-length-cut-world-models-continuity.ts';

export const DATA_HARDWARE_CUT_CONTINUITY_DIR = 'audit/evidence/length-cut-20261013-data-hardware/';
const reviewFile = `${DATA_HARDWARE_CUT_CONTINUITY_DIR}source-transition.json`;
const drift = 'data-hardware cut continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
/** A component block the pass corrected: the exact block before and after, and why. */
export type DataHardwareCorrection = { before: string; after: string; reason: string };
export type DataHardwareCutSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: LengthCutEdit[];
  dropped: LengthCutDrops;
  added: LengthCutDrops;
  pins: LengthCutPin[];
  corrected: DataHardwareCorrection[];
};
export type DataHardwareCutReview = {
  schemaVersion: 'data-hardware-cut-continuity-v1';
  name: 'length-cut-20261013-data-hardware';
  reviewedBy: string;
  ownerApproval: string;
  rationale: string;
  observedAt: string;
  sources: DataHardwareCutSource[];
};

// BEGIN data-hardware cut pins (written by scripts/record-length-cut-data-hardware-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 471054, sha256: 'd98bb90b4ddf59683153bafb151f29700e92142564cc8294d25229d8a93c33dc' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/data-hardware/data-bottleneck.mdx', [14175, '9104f056f21f19b3c9986260df0caadcaf91dbb3c1fc6b79a51e6f1511f878e0']],
  ['content/data-hardware/datasets.mdx', [12020, '05e13772e4e89d8a5130849b4d9329d3dae7b46566ea43be5d2207f2476629e0']],
  ['content/data-hardware/evaluation-crisis.mdx', [16445, 'dbf351e2d8f8d7d3babc480d325c1fd0a172848efb1a9954de2b236d9e93d425']],
  ['content/data-hardware/hardware-taxonomy.mdx', [11123, '0791f01688e3925c5bf27c667684b984f776801ff5229ad098d1627c6d7195f1']],
  ['content/data-hardware/industrial-deployment.mdx', [17434, '755f3e0c8094f52fb0fb518174e0f3fddfe08cfa1aaffc9f4f8328051ca0ff23']],
  ['content/data-hardware/robot-learning-stack.mdx', [10316, '9a9a8b44561dba0fc5df4759328928ad7b8efe3927a1cff6b6867d3e3b2430ee']],
  ['content/data-hardware/teleop-rigs.mdx', [10790, '39048aef62feee2cedd8090baac2247cfdc53917b9649c5ab9356c4492cca07d']],
]);
// END data-hardware cut pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const lineList = (text: string, pattern: RegExp) => text.split('\n').filter((line) => pattern.test(line));
const matchList = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => match[1] ?? match[0]);
const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const citationList = (head: string) =>
  head.match(/\ncitations:\n((?: {2}- [^\n]+\n)*)/)?.[1].split('\n').filter(Boolean).map((line) => line.slice(4)) ?? [];
const componentBlocks = (text: string) =>
  [...text.matchAll(/\n(<SelfCheck[\s\S]*?\n\/>|<div[\s\S]*?\n<\/div>)/g)].map((match) => match[1]);
const occursOnce = (text: string, part: string) => text.split(part).length === 2;

/** What the pass must keep exactly and in order, once its corrected blocks are put back. */
const KEPT: readonly ((text: string) => string[])[] = [
  (text) => lineList(text, /^import /),
  (text) => lineList(text, /^<[A-Z][A-Za-z0-9]*\b[^\n]*\/>$/),
  componentBlocks,
];

const anchors = (body: string) => [
  ...lineList(body, /^#{1,6} /).map(headingSlug),
  ...matchList(body, /<span id="([^"]+)" \/>/g),
];

/** left minus right as a sorted multiset. */
function minus(left: readonly string[], right: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of left) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of right) counts.set(item, (counts.get(item) ?? 0) - 1);
  return [...counts].flatMap(([item, n]) => (n > 0 ? Array<string>(n).fill(item) : [])).sort();
}

const firstUse = (list: readonly string[]) => list.filter((item, index) => list.indexOf(item) === index);

/**
 * The live article with each recorded correction put back, or null unless
 * every correction names a whole component block the earlier article held
 * once, the live article holds once in its place, changed, with a reason.
 */
export function uncorrectedDataHardwareArticle(
  prior: string, current: string, corrected: readonly DataHardwareCorrection[],
): string | null {
  const priorBlocks = componentBlocks(prior);
  const liveBlocks = componentBlocks(current);
  let result = current;
  for (const correction of corrected) {
    const { before, after, reason } = correction ?? ({} as Partial<DataHardwareCorrection>);
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
 * The article obligations of the data-hardware pass: a data-hardware article
 * that, with its corrected blocks put back, keeps its imports, mounts and
 * component blocks in order, whose frontmatter only gained appended citation
 * ids, which still reaches every earlier heading anchor, link target and
 * glossary id (glossary ids in the same order of first use), whose dropped
 * and added citations, numbers, links and glossary ids are exactly the
 * recorded ones, each with a claim, whose added citations are all listed in
 * the frontmatter, which cites at least 30 distinct sources, whose pins hold
 * against the live text, and whose body is shorter.
 */
export function keepsDataHardwareCutObligations(
  path: string, prior: string, current: string, dropped: LengthCutDrops, added: LengthCutDrops,
  pins: readonly LengthCutPin[], corrected: readonly DataHardwareCorrection[],
): boolean {
  if (!path.startsWith('content/data-hardware/') || !path.endsWith('.mdx') || prior === current ||
    !Array.isArray(corrected) || !Array.isArray(pins)) return false;
  const restored = uncorrectedDataHardwareArticle(prior, current, corrected);
  if (restored === null) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(restored);
  if (!priorHead || !head) return false;
  const before = citationList(priorHead);
  const after = citationList(head);
  const appended = after.slice(before.length);
  if (!sameList(after.slice(0, before.length), before) || new Set(appended).size !== appended.length ||
    appended.some((id) => !/^[a-z0-9][a-z0-9.-]*$/.test(id) || before.includes(id))) return false;
  const withoutAppended = head.replace(/\ncitations:\n(?: {2}- [^\n]+\n)*/, (block) =>
    block.split('\n').filter((line) => !appended.some((id) => line === `  - ${id}`)).join('\n'));
  if (withoutAppended !== priorHead) return false;
  const priorBody = prior.slice(priorHead.length);
  const body = restored.slice(head.length);
  if (!KEPT.every((kept) => sameList(kept(priorBody), kept(body)))) return false;
  const live = new Set(anchors(body));
  if (!anchors(priorBody).every((anchor) => live.has(anchor))) return false;
  for (const key of Object.keys(COUNTED) as (keyof typeof COUNTED)[]) {
    const was = matchList(priorBody, COUNTED[key]);
    const now = matchList(body, COUNTED[key]);
    const recordedDrops = (dropped?.[key] ?? []).map(({ value }) => value).sort();
    const recordedAdds = (added?.[key] ?? []).map(({ value }) => value).sort();
    if (!sameList(minus(was, now), recordedDrops) || !sameList(minus(now, was), recordedAdds)) return false;
    if ([...(dropped[key] ?? []), ...(added[key] ?? [])]
      .some(({ claim }) => typeof claim !== 'string' || claim.length < 12)) return false;
    if ((key === 'links' || key === 'terms') && [...new Set(was)].some((value) => !now.includes(value))) return false;
    if (key === 'terms' && !sameList(firstUse(was), firstUse(now))) return false;
    if (key === 'citations' && recordedAdds.some((id) => !after.includes(id))) return false;
  }
  if (new Set(matchList(body, COUNTED.citations)).size < MIN_BODY_SOURCES) return false;
  const pinHolds = ({ phrase, disposition, to, toPath, test }: LengthCutPin) => {
    if (typeof test !== 'string' || !test.startsWith('tests/') || !phrase || !prior.includes(phrase)) return false;
    if (disposition === 'retired') return toPath === undefined && !current.includes(phrase);
    if (disposition !== 'moved' || !to) return false;
    return toPath === undefined ? current.includes(to) && !current.includes(phrase)
      : toPath !== path && toPath.startsWith('content/') && toPath.endsWith('.mdx') && !current.includes(phrase);
  };
  return pins.every(pinHolds) && words(body) < words(priorBody);
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
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyDataHardwareCutSource(source: DataHardwareCutSource, live: Buffer): Buffer {
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
    !keepsDataHardwareCutObligations(path, rebuilt, current, source.dropped, source.added, source.pins ?? [],
      source.corrected)) {
    throw new Error(drift);
  }
  return prior;
}

const reviewCache = new Map<string, DataHardwareCutReview>();
const priorCache = new Map<string, Buffer>();

export function loadDataHardwareCutReview(root: string): DataHardwareCutReview {
  let bytes: Buffer;
  let review: DataHardwareCutReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as DataHardwareCutReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'data-hardware-cut-continuity-v1' || review.name !== 'length-cut-20261013-data-hardware' ||
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
    const source = loadDataHardwareCutReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyDataHardwareCutSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the data-hardware cut review holds a successor for. */
export const dataHardwareCutSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function dataHardwareCutPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
