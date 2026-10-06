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
const reviewPin = { bytes: 392720, sha256: '7f9149283d68dfd0e9f50df1dcbe74dacbdb81cfffdd4664872957febfe2be66' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/manipulation/action-chunking.mdx', [12717, '917487e6f9b1beaba9b0485b8acd73580a6d70af06f71bf9efa674a9ae225939']],
  ['content/manipulation/action-spaces.mdx', [10641, 'ff854c17cf0a59f4554c02d770e4160bddba7d9061437029d5e00b0f09d5aa2f']],
  ['content/manipulation/bc-foundations.mdx', [13675, '7b8e48c921e210aa96860e48c6852eb89e0dd61d488972134e48bb2450921fc9']],
  ['content/manipulation/comparison-matrix.mdx', [11084, 'e9c7195f34e3e31bdc8bf047c701d3999c9a718f5bc7d7a7a07fd8d421c94750']],
  ['content/manipulation/cross-embodiment.mdx', [11614, 'f82cfbf97ee32f39f46764ff15d4365b5b4eb34d1df781908f85cd5d1dba3ba5']],
  ['content/manipulation/diffusion-policy.mdx', [11387, '532b8324fd2085a5f813c841a23be2dade8013237ce3769093da5d5469dcfc01']],
  ['content/manipulation/foundation-models.mdx', [10919, '293309a11c0d3cd59eb399ed1c9b8d0af07abd60439d248a3a97daca47e2c634']],
  ['content/manipulation/generalist-policies.mdx', [14708, '1aa7ca82c4b664ffa4e15357864504eba4d7a8f9fa3d6381f47c9a1cc8384aa2']],
  ['content/manipulation/hierarchical.mdx', [14469, 'ae6172a18e68898d49a5b112602f6aa5f8492b65565bdb33f6839319183acc05']],
  ['content/manipulation/knowledge-insulation.mdx', [9559, '7924d14a17d29904d969035f60bcab707e813bd6152fe487cbcbcbebb2e1d640']],
  ['content/manipulation/pi-line.mdx', [16619, 'ef185510767caa0fba8bc2d0416d9cfebe636221a93888fe232efec8f30e0545']],
  ['content/manipulation/realtime-execution.mdx', [12504, 'f1db1ff6aa7e6e1ff6221ee56e96d257a6f77920c9360c1759539e0bd1bb8c8a']],
  ['content/manipulation/rl-finetuning.mdx', [23472, '280f348bedc667981cdd497d4dbfef2d708b9a2bdf3cf1c8ce2d871235e6a46e']],
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
