/**
 * Exact successor review for the articles the KOL backlog batch of
 * 2026-10-05 extended. The batch only adds: a dated, attributed sentence or
 * paragraph in the body and the new citation ids in the frontmatter
 * citations list. Each change is recorded as exact edits over the bytes the
 * article had before the batch, so the earlier bytes are rebuilt from the
 * live file instead of being archived. The artifact reader hands every
 * older check the rebuilt bytes only while the live article is exactly the
 * reviewed successor, reversing the edits rebuilds bytes that hash to the
 * recorded predecessor, replaying them gives the live bytes back, every
 * line of the predecessor survives in order, and the frontmatter differs
 * only by citation ids appended to its citations list. No old review, run,
 * receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const KOL_BACKLOG_CONTINUITY_DIR = 'audit/evidence/kol-backlog-20261005/';
const reviewFile = `${KOL_BACKLOG_CONTINUITY_DIR}source-transition.json`;
const drift = 'kol backlog continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type KolBacklogEdit = { before: string; after: string };
export type KolBacklogSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: KolBacklogEdit[] };
export type KolBacklogReview = {
  schemaVersion: 'kol-backlog-continuity-v1';
  name: 'kol-backlog-20261005';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: KolBacklogSource[];
};

// BEGIN kol-backlog pins (written by scripts/record-kol-backlog-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 32574, sha256: '1e48ec6472ec8139c8b732a269a241f5459ab75bebc8e84b669d1d0b7cbb2648' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/adjacent/surgical.mdx', [13479, '5715334d09882b723e7498639aaef0235a74f38b444a2afcddcff60893f2f33e']],
  ['content/classical/state-estimation.mdx', [16451, '506d14a40574c756ac45411bd7a59f1b482e68b00388e0a1efa10cda14c96841']],
  ['content/data-hardware/data-bottleneck.mdx', [13244, '509675b55fca4b46724651a35cdf2ff632a71235f022a93a72248657cfc381fe']],
  ['content/data-hardware/industrial-deployment.mdx', [20222, 'f257e2d44571f32030fa2186f884105a1b1b701422ad2531b993b6f699189c9f']],
  ['content/frontier/dexterity.mdx', [18264, '8202fff0ca24020b75c13256581c0634376191cac2045ddabd0414f667b307d9']],
  ['content/frontier/safety-and-assurance.mdx', [20354, 'ce051d78536d780f6653b25d8e66848322c7e3b01527f6a7668ebc4ee27d36e0']],
  ['content/manipulation/foundation-models.mdx', [10422, '740b0103ef13d24de61317aea6ca7dd95b6f7b223812ed8432220d729d01ddd3']],
  ['content/manipulation/hierarchical.mdx', [15982, '88fe12598ffec080170e81c93e78ee066e4f74c00d376b5272aeb9c26e66a017']],
  ['content/manipulation/realtime-execution.mdx', [13671, '8cc8e843080a6e977bfab48fffba4ac6bfde0cf29b2d880f3f8c39cf820e801e']],
  ['content/manipulation/rl-finetuning.mdx', [28572, '107fdaa88095cc192a401f1e1855ad896de33f2d04d3114cfa54f783baa2cc0b']],
  ['content/world-models/jepa.mdx', [14289, '9e5cab58ff71ac385685b256c20fdf0270fbf52202f22a9af8e098ffec228c56']],
]);
// END kol-backlog pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citationList = (head: string) =>
  head.match(/\ncitations:\n((?: {2}- [^\n]+\n)*)/)?.[1].split('\n').filter(Boolean).map((line) => line.slice(4)) ?? [];

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

/** True when every line of `prior` appears in `current`, in order. */
function keepsEveryLine(prior: string, current: string): boolean {
  const kept = lines(current);
  let at = 0;
  for (const line of lines(prior)) {
    while (at < kept.length && kept[at] !== line) at++;
    if (at === kept.length) return false;
    at++;
  }
  return true;
}

/** The article obligations: additions only, and new frontmatter lines are appended citation ids. */
export function keepsKolBacklogObligations(path: string, prior: string, current: string): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx')) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(current);
  if (!priorHead || !head || !keepsEveryLine(prior, current)) return false;
  const before = citationList(priorHead);
  const after = citationList(head);
  const added = after.slice(before.length);
  if (after.slice(0, before.length).join('\n') !== before.join('\n') ||
    added.some((id) => !/^[a-z0-9][a-z0-9.-]*$/.test(id) || before.includes(id)) ||
    new Set(added).size !== added.length) {
    return false;
  }
  const withoutAdded = head.replace(/\ncitations:\n(?: {2}- [^\n]+\n)*/, (block) =>
    block.split('\n').filter((line) => !added.some((id) => line === `  - ${id}`)).join('\n'));
  return withoutAdded === priorHead;
}

/**
 * The pre-batch bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyKolBacklogSource(source: KolBacklogSource, live: Buffer): Buffer {
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
    !keepsKolBacklogObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

export function loadKolBacklogReview(root: string): KolBacklogReview {
  let bytes: Buffer;
  let review: KolBacklogReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    review = JSON.parse(bytes.toString()) as KolBacklogReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'kol-backlog-continuity-v1' || review.name !== 'kol-backlog-20261005' ||
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

/** The paths the KOL backlog review holds a successor for. */
export const kolBacklogSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function kolBacklogPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadKolBacklogReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifyKolBacklogSource(source, live);
}
