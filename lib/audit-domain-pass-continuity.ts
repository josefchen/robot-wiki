/**
 * Exact successor review for the articles the opus-pass domain passes
 * rewrote from the owner's verified drafts (manipulation first, 2026-10-06).
 * A domain pass shortens the prose, cites more sources and removes the
 * Callout and Aside boxes, while every figure and component mount, every
 * frontmatter field and every citation the article already had stay put.
 * Each rewrite is recorded as exact edits over the bytes the article had
 * before the pass, so the earlier bytes are rebuilt from the live file
 * instead of being archived. The artifact reader hands every older check the
 * rebuilt bytes only while the live article is exactly the reviewed
 * successor, reversing the edits rebuilds bytes that hash to the recorded
 * predecessor, replaying them gives the live bytes back, and the
 * obligations below hold. No old review, run, receipt, capture or ledger
 * cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DOMAIN_PASS_CONTINUITY_DIR = 'audit/evidence/domain-pass-20261006/';
const reviewFile = `${DOMAIN_PASS_CONTINUITY_DIR}source-transition.json`;
const drift = 'domain pass continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type DomainPassEdit = { before: string; after: string };
export type DomainPassSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: DomainPassEdit[] };
export type DomainPassReview = {
  schemaVersion: 'domain-pass-continuity-v1';
  name: 'domain-pass-20261006';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: DomainPassSource[];
};

// BEGIN domain-pass pins (written by scripts/record-domain-pass-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 686733, sha256: '87cee6426c17736e753809d34579aa9cac469d0003b1a64e36e5b766d6d7918a' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/calibration.mdx', [9689, 'f05b9f74bfefac02ed215bb3f4110b0afd3ec2ef1ed5cc5679c9e51be0943500']],
  ['content/classical/control.mdx', [19659, '4f68142d7a05a8e6ee80d1297c0a6c0c69f3ab42430f29f8a485ee2728b6d86b']],
  ['content/classical/grasp-planning.mdx', [13593, 'c70f1a6b072d4df15c6422bbb825cbdb8abc17c4559804770556931c8d21215f']],
  ['content/classical/kinematics.mdx', [11586, '36c66a5df19a38696991d78b5ef7cd030f2259282f44e209f48882106e4afa5d']],
  ['content/classical/motion-planning.mdx', [20454, 'ebc07401ea182cb0334d7037c3ed272cb7ecf0a38c807bfed847edaffa878cd1']],
  ['content/classical/perception.mdx', [28234, 'a7db2b82791e81cba3b759f8601ed8b97d7074f19db5e17e5df51127a7f22cff']],
  ['content/classical/ros2-for-ml-engineers.mdx', [9592, '1dfd445c34d55ac5c92957fa838df7e4a4918c9a13e7309546bebc7f13b34f34']],
  ['content/classical/scene-representation.mdx', [19360, 'af7d61ef547fa23cb7765c5bcc8e81341a4c090caf2d92813fb36107bd51f52d']],
  ['content/classical/state-estimation.mdx', [15410, '96b92f0aa260583ff52b6cd3e7867c14891b61fe8bb1379d04bea15d7ca30329']],
  ['content/frontier/dexterity.mdx', [18761, '91e3c09b8b032560e4fc843db142f558447434e8f078f1d596324687e83381a1']],
  ['content/manipulation/action-chunking.mdx', [12714, 'a08054d5b2b91c7f0a47b42a5f1851087634420845b7fba5f89f42d4c2d4ed84']],
  ['content/manipulation/action-spaces.mdx', [10574, '885130648006e720419bc1e074513c2c5631d3d1e2f5be6acab2c1ae41df7320']],
  ['content/manipulation/bc-foundations.mdx', [13674, 'cda4f9c5f5ceb8886e1ca3000ca9604e38688ebd1c5a13f61b7e5fe8794c8042']],
  ['content/manipulation/comparison-matrix.mdx', [10991, 'ca5ab6eead454ec4e4f6b4277a6222f6f761bebe9938e1bc0e5149d5202d7855']],
  ['content/manipulation/cross-embodiment.mdx', [11614, 'f82cfbf97ee32f39f46764ff15d4365b5b4eb34d1df781908f85cd5d1dba3ba5']],
  ['content/manipulation/diffusion-policy.mdx', [11387, '532b8324fd2085a5f813c841a23be2dade8013237ce3769093da5d5469dcfc01']],
  ['content/manipulation/foundation-models.mdx', [10881, '805ec2b61ba80c812f1c146193f584b374619902dbe3c471144ec84dcf8445a3']],
  ['content/manipulation/generalist-policies.mdx', [14708, '1aa7ca82c4b664ffa4e15357864504eba4d7a8f9fa3d6381f47c9a1cc8384aa2']],
  ['content/manipulation/hierarchical.mdx', [14466, 'b7afd6b5820943b4ca9b7431d7a3e1366ccdec1c32ad68b892b35eb9d0309e2e']],
  ['content/manipulation/knowledge-insulation.mdx', [9547, 'edd85c2ad7679321fb67d5795f63ed667387ea6e495a0f29706f773cb6645f87']],
  ['content/manipulation/pi-line.mdx', [16594, '44f42966362ab04c2b719f565f46ff55b8515e0b2aff0c37a78a1f0d0c4d75b9']],
  ['content/manipulation/realtime-execution.mdx', [12504, 'f1db1ff6aa7e6e1ff6221ee56e96d257a6f77920c9360c1759539e0bd1bb8c8a']],
  ['content/manipulation/rl-finetuning.mdx', [23458, '8486f78b8c0c574a54d907f207fa3c7638d842b4e4036fa49d09c7483f71a791']],
  ['content/manipulation/robot-learning-roadmap.mdx', [9916, 'c10473a9d9a52893fe18ce799007c4d7612a23da2934c68a303f33fe9b156aa6']],
  ['content/manipulation/vla-models.mdx', [14391, '3e0f91826050ffdb4b69bd6a39622c315f4497ccfbe931b02f7787a83c3ce854']],
]);
// END domain-pass pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citationList = (head: string) =>
  head.match(/\ncitations:\n((?: {2}- [^\n]+\n)*)/)?.[1].split('\n').filter(Boolean).map((line) => line.slice(4)) ?? [];
const citedIds = (source: string) => new Set([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));
/** Box components the owner removed from every article (decision of 2026-10-02 13:15). */
const REMOVED_BOXES = new Set(['Callout', 'Aside']);
const INLINE = new Set(['Cite', 'Term']);
/** Every figure and component mount in the body, in order, with its exact attributes. */
const mounts = (source: string) => [...source.slice(frontmatter(source)?.length ?? 0)
  .matchAll(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g)]
  .filter((m) => !INLINE.has(m[1]) && !REMOVED_BOXES.has(m[1]))
  .map((m) => `${m[1]}${m[2].replace(/\s+/g, ' ').trimEnd()}`);

function applyExact(text: string, edits: readonly (readonly [string, string])[], message = drift): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(message);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

/**
 * The article obligations of a domain-pass rewrite: the frontmatter differs
 * only by citation ids appended to its citations list, every citation the
 * body had is still cited, and the figure and component mounts are the same
 * mounts in the same order with the same attributes. Prose may change.
 */
export function keepsDomainPassObligations(path: string, prior: string, current: string): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx')) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(current);
  if (!priorHead || !head) return false;
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
  if (withoutAdded !== priorHead) return false;
  const kept = citedIds(current);
  if ([...citedIds(prior)].some((id) => !kept.has(id))) return false;
  return JSON.stringify(mounts(prior)) === JSON.stringify(mounts(current));
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyDomainPassSource(source: DomainPassSource, live: Buffer): Buffer {
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
    !keepsDomainPassObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, DomainPassReview>();
const priorCache = new Map<string, Buffer>();

export function loadDomainPassReview(root: string): DomainPassReview {
  let bytes: Buffer;
  let review: DomainPassReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as DomainPassReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'domain-pass-continuity-v1' || review.name !== 'domain-pass-20261006' ||
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
    const source = loadDomainPassReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyDomainPassSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/**
 * The citation list a frontmatter P1 ledger row was written against. A
 * reviewed successor appends its new ids to the list; those ids have their
 * own registry audit rows, so the P1 row keeps certifying the list it
 * declared. Any other article, or bytes other than the reviewed successor,
 * get their live list back unchanged.
 */
export function preDomainPassCitations(root: string, path: string, citations: readonly string[]): readonly string[] {
  const pinned = successors.get(path);
  if (!pinned) return citations;
  const live = readFileSync(join(root, path));
  if (live.length !== pinned[0] || digest(live) !== pinned[1]) return citations;
  const prior = citationList(frontmatter(rebuiltPrior(root, path, live).toString()) ?? '');
  const current = citationList(frontmatter(live.toString()) ?? '');
  if (current.join('\n') !== citations.join('\n')) return citations;
  return prior;
}

/** The paths the domain-pass review holds a successor for. */
export const domainPassSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function domainPassPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}

const checkerReviewFile = `${DOMAIN_PASS_CONTINUITY_DIR}checker-transition.json`;
const checkerDrift = 'domain pass checker continuity drift';
const checkerPath = 'lib/audit-local-basis.ts';
export type DomainPassCheckerEdit = DomainPassEdit & { suite: string };
export type DomainPassCheckerReview = {
  schemaVersion: 'domain-pass-checker-revision-v1';
  name: 'domain-pass-reader';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: DomainPassCheckerEdit[];
};

// BEGIN domain-pass checker pins (written by scripts/record-domain-pass-continuity.ts --checker)
/** The reviewed checker evidence file; a changed review needs a reviewed code change too. */
const checkerReviewPin = { bytes: 1372, sha256: '6ce1b59ac71fd7fbd76b4fe023b4293378e764e13310228ee39409e447d57958' };

/** The SEO-pass reader head the revision edits, and the reviewed revision. */
const checkerBefore = { bytes: 114290, sha256: 'f115c68135aaac380af0e10ebecc721bcb613d5434f24b007f51879ed6829f3e' };
const checkerAfter = { bytes: 114290, sha256: '593edb1358888d4ca8a827ddd9360540ea8f75808e6a9737b8a8348899397294' };
// END domain-pass checker pins

/** The one checker line a domain-pass revision may change: a suite's reviewed live hash. */
const suiteHashLine = /^ {4}currentTestHash: '[0-9a-f]{64}',\n$/;
/** The historical-verification entry of one suite, from its key line to its closing brace. */
const suiteEntry = (checker: string, suite: string) => {
  const start = checker.indexOf(`\n  '${suite}': {\n`);
  return start < 0 ? '' : checker.slice(start, checker.indexOf('\n  },\n', start) + 1);
};

export function loadDomainPassCheckerReview(root: string): DomainPassCheckerReview {
  let bytes: Buffer;
  let review: DomainPassCheckerReview;
  try {
    bytes = readFileSync(join(root, checkerReviewFile));
    review = JSON.parse(bytes.toString()) as DomainPassCheckerReview;
  } catch (error) {
    throw new Error(`${checkerDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== checkerReviewPin.bytes || digest(bytes) !== checkerReviewPin.sha256 ||
    review?.schemaVersion !== 'domain-pass-checker-revision-v1' || review.name !== 'domain-pass-reader' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() || !/^[0-9a-f]{40}$/.test(review.archivedFrom ?? '') ||
    !same(review.before, checkerPath, checkerBefore.bytes, checkerBefore.sha256) ||
    !same(review.after, checkerPath, checkerAfter.bytes, checkerAfter.sha256) || !review.edits?.length ||
    new Set(review.edits.map(({ suite }) => suite)).size !== review.edits.length ||
    review.edits.some(({ suite, before, after }) => typeof suite !== 'string' || !/^tests\/[a-z0-9/-]+\.test\.ts$/.test(suite) ||
      typeof before !== 'string' || typeof after !== 'string' ||
      !suiteHashLine.test(before) || !suiteHashLine.test(after) || before === after)) {
    throw new Error(checkerDrift);
  }
  return review;
}

/**
 * The checker bytes the SEO-pass checker layer should see. Checker bytes
 * other than the reviewed revision come back unchanged, so the older layers
 * still decide them. The reviewed revision is admitted only as edits that
 * each swap the reviewed live hash of one historical verification suite
 * whose assertions a domain pass brought up to date, inside that suite's own
 * entry, and the SEO-pass head is rebuilt from it and returned.
 */
export function domainPassCheckerPredecessor(root: string, live: Buffer): Buffer {
  if (live.length !== checkerAfter.bytes || digest(live) !== checkerAfter.sha256) return live;
  const review = loadDomainPassCheckerReview(root);
  const current = live.toString();
  const edits = review.edits.map(({ before, after }) => [before, after] as const);
  const rebuilt = applyExact(current, edits.map(([from, to]) => [to, from] as const).reverse(), checkerDrift);
  const prior = Buffer.from(rebuilt);
  if (!same(review.before, checkerPath, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits, checkerDrift) !== current ||
    review.edits.some(({ suite, before, after }) => suiteEntry(rebuilt, suite).split(before).length !== 2 ||
      suiteEntry(current, suite).split(after).length !== 2)) {
    throw new Error(checkerDrift);
  }
  return prior;
}
