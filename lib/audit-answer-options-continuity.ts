/**
 * Exact successor review for the articles whose self-check option sets the
 * brand-v2-interactives round-1 fix of 2026-10-23 rebalanced (VAL-EDU-041):
 * across the answer-feedback regions the correct option was the longest too
 * often and, on calibration, 1.63 times the length of its longest
 * distractor, so its length gave the answer away. The fix lengthens or
 * qualifies distractors and rewords a few prompts. Each change is recorded
 * as exact edits over the bytes the article had before, so the earlier bytes
 * are rebuilt from the live article instead of being archived.
 *
 * A successor may differ from its predecessor only inside a `<SelfCheck>`
 * block, and there only in the text of its prompt and of its option labels:
 * the frontmatter, the prose, every mount, every option value, explanation
 * and takeaway, the answer, the option order and every number, citation,
 * link and glossary occurrence stay exactly as they were.
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

export const ANSWER_OPTIONS_CONTINUITY_DIR = 'audit/evidence/answer-options-20261023/';
const reviewFile = `${ANSWER_OPTIONS_CONTINUITY_DIR}source-transition.json`;
const drift = 'answer-options continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type AnswerOptionsEdit = { before: string; after: string };
export type AnswerOptionsSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: AnswerOptionsEdit[] };
export type AnswerOptionsReview = {
  schemaVersion: 'answer-options-continuity-v1';
  name: 'answer-options-20261023';
  reviewedBy: string;
  rationale: string;
  ownerApproval: string;
  observedAt: string;
  sources: AnswerOptionsSource[];
};

// BEGIN answer-options pins (written by scripts/record-answer-options-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 7306, sha256: 'd06afbb70f6b59530cae28f7d25cffc4d2b5b5203166ce1fa00954b0f8069833' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/calibration.mdx', [8197, '7274fffbdf172e28e1c0878915d0199cd60181eb30608f0661672070723fd7fc']],
  ['content/data-hardware/robot-learning-stack.mdx', [10408, '1d8f59aa897c1843cc5586d3ca1278e68093a3e24b34523abf17ee761fd05432']],
  ['content/world-models/evaluation.mdx', [9653, 'be1e584cecb03b2515224dad0c7fe70e5148a2bb47aa7dff47ef5aebc5492409']],
  ['content/world-models/model-based-robot-learning.mdx', [9729, '316e1072720a5dbc76bc681f8435703ab4f2249f8c83e1e581df19ed298ed3ec']],
  ['content/world-models/world-models-vs-simulators.mdx', [11578, '3c1cbd85e88bf016113192ad2baff6d097079fc5d1dffd83b121f655747d3676']],
]);
// END answer-options pins

const ARTICLE = /^content\/[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/;
const SELF_CHECK = /\n<SelfCheck\n[\s\S]*?\n\/>\n/g;
const PROMPT = /^( {2}prompt=")([^"\n]+)("\n)/gm;
const LABEL = /^( {6}label: ')((?:[^'\\\n]|\\.)+)(',?\n)/gm;
/** Occurrences no rebalanced prompt or label may add, drop or reorder. */
const COUNTED = [
  /<Cite id="[^"]+"/g,
  /\d+(?:[.,]\d+)*/g,
  /\]\([^)\s]+\)/g,
  /<Term id="[^"]+"/g,
] as const;

/**
 * The article with the text of every self-check prompt and option label
 * blanked, and the number of prompts and labels blanked: what a rebalance
 * must leave exactly as it was.
 */
export function answerOptionsFrame(text: string): { frame: string; slots: number } {
  let slots = 0;
  const frame = text.replace(SELF_CHECK, (block) => block
    .replace(PROMPT, (_, open: string, __: string, close: string) => { slots += 1; return `${open}\u0000${close}`; })
    .replace(LABEL, (_, open: string, __: string, close: string) => { slots += 1; return `${open}\u0000${close}`; }));
  return { frame, slots };
}

const occurrences = (text: string) => COUNTED.map((pattern) => (text.match(pattern) ?? []).join('\u0001'));

/**
 * The article obligations of an option rebalance: the file is a content
 * article, it changed, and it differs from its predecessor only in the text
 * of self-check prompts and option labels, with every number, citation, link
 * and glossary occurrence unchanged and in order.
 */
export function keepsAnswerOptionsObligations(path: string, prior: string, current: string): boolean {
  if (!ARTICLE.test(path) || prior === current) return false;
  const was = answerOptionsFrame(prior);
  const now = answerOptionsFrame(current);
  if (was.slots === 0 || was.slots !== now.slots || was.frame !== now.frame) return false;
  const before = occurrences(prior);
  return occurrences(current).every((list, index) => list === before[index]);
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
 * The pre-rebalance bytes rebuilt from the live successor. Throws unless
 * every obligation above holds. Exported so the obligations can be exercised
 * apart from the byte pins that normally gate them.
 */
export function verifyAnswerOptionsSource(source: AnswerOptionsSource, live: Buffer): Buffer {
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
    !keepsAnswerOptionsObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, AnswerOptionsReview>();
const priorCache = new Map<string, Buffer>();

export function loadAnswerOptionsReview(root: string): AnswerOptionsReview {
  let bytes: Buffer;
  let review: AnswerOptionsReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as AnswerOptionsReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'answer-options-continuity-v1' || review.name !== 'answer-options-20261023' ||
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
    const source = loadAnswerOptionsReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyAnswerOptionsSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the answer-options review holds a successor for. */
export const answerOptionsSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function answerOptionsPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
