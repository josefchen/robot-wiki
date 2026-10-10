/**
 * Exact successor review for the articles the word-budget trim of
 * 2026-10-10 shortened. The figure restyle of that day mounted two new
 * figures in each of the classical articles on calibration and on ROS 2 for
 * ML engineers, and their rendered words took both pages past the budgets
 * in data/word-budgets.json. The trim keeps the budgets and shortens the
 * body prose instead: it may only delete or rephrase words. The frontmatter,
 * every import line, every one-line mount, every heading, every citation
 * and glossary id in order, every link target in order and every number in
 * order stay exactly as they were, and the body ends shorter than it began.
 * Each change is recorded as exact edits over the bytes the article had
 * before the trim, so the earlier bytes are rebuilt from the live file
 * instead of being archived. The artifact reader hands every older check the
 * rebuilt bytes only while the live article is exactly the reviewed
 * successor, reversing the edits rebuilds bytes that hash to the recorded
 * predecessor, and replaying them gives the live bytes back. No old review,
 * run, receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORD_BUDGET_TRIM_CONTINUITY_DIR = 'audit/evidence/word-budget-trim-20261010/';
const reviewFile = `${WORD_BUDGET_TRIM_CONTINUITY_DIR}source-transition.json`;
const drift = 'word budget trim continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type WordBudgetTrimEdit = { before: string; after: string };
export type WordBudgetTrimSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: WordBudgetTrimEdit[] };
export type WordBudgetTrimReview = {
  schemaVersion: 'word-budget-trim-continuity-v1';
  name: 'word-budget-trim-20261010';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: WordBudgetTrimSource[];
};

// BEGIN word-budget-trim pins (written by scripts/record-word-budget-trim-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 24149, sha256: 'fcf6db7543659f50930c3b4b2388cf6ec743a9e29f543bf4cd40bf5df7a40b43' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/calibration.mdx', [9327, '32bbaa807e2e11972de9bf679d45e80222299f912ce045f633fba81672b70a28']],
  ['content/classical/ros2-for-ml-engineers.mdx', [9506, '137a5e00e657e36a9363858d920c084322b1f0c4c11319ffc26c08ce4d849468']],
]);
// END word-budget-trim pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const lineList = (text: string, pattern: RegExp) => text.split('\n').filter((line) => pattern.test(line));
const matchList = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => match[1] ?? match[0]);
const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** What a trim must keep, in order: everything but the words between them. */
const KEPT: readonly ((text: string) => string[])[] = [
  (text) => lineList(text, /^import /),
  (text) => lineList(text, /^<[A-Z][A-Za-z0-9]*\b[^\n]*\/>$/),
  (text) => lineList(text, /^#{1,6} /),
  (text) => matchList(text, /<Cite id="([^"]+)"/g),
  (text) => matchList(text, /<Term id="([^"]+)"/g),
  (text) => matchList(text, /\]\(([^)\s]+)\)/g),
  (text) => matchList(text, /\d+(?:[.,]\d+)*/g),
];

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
 * The article obligations of a trim: a content MDX file whose frontmatter,
 * imports, mounts, headings, citation ids, glossary ids, link targets and
 * numbers are all unchanged and in order, and whose body has fewer words.
 */
export function keepsWordBudgetTrimObligations(path: string, prior: string, current: string): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(current);
  if (!priorHead || head !== priorHead) return false;
  const priorBody = prior.slice(priorHead.length);
  const body = current.slice(head.length);
  return KEPT.every((kept) => sameList(kept(priorBody), kept(body))) && words(body) < words(priorBody);
}

/**
 * The pre-trim bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyWordBudgetTrimSource(source: WordBudgetTrimSource, live: Buffer): Buffer {
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
    !keepsWordBudgetTrimObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

export function loadWordBudgetTrimReview(root: string): WordBudgetTrimReview {
  let bytes: Buffer;
  let review: WordBudgetTrimReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    review = JSON.parse(bytes.toString()) as WordBudgetTrimReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'word-budget-trim-continuity-v1' || review.name !== 'word-budget-trim-20261010' ||
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
  return review;
}

/** The paths the word-budget trim review holds a successor for. */
export const wordBudgetTrimSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function wordBudgetTrimPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadWordBudgetTrimReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifyWordBudgetTrimSource(source, live);
}
