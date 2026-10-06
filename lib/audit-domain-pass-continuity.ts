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
const reviewPin = { bytes: 382825, sha256: 'd1e2c1142fbb9ef91308ea8a9d900ed4e6c8a2bcbb21c27b9797108382ec4842' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/manipulation/action-chunking.mdx', [12679, '6b1d7d47fe4cc5e47a38c5f9454b0d58ebe9ab0dfb70b17faf1351e63224f5e5']],
  ['content/manipulation/action-spaces.mdx', [9332, '10a3a9f95f8d1099a677d1622d4eb34bcd2929cd6baf2de278b99b6f070a5e4b']],
  ['content/manipulation/bc-foundations.mdx', [12484, '9360607b5991d9853d781fed6becd9345fc34a0c8443ff983b72811334f3b054']],
  ['content/manipulation/comparison-matrix.mdx', [11084, 'e9c7195f34e3e31bdc8bf047c701d3999c9a718f5bc7d7a7a07fd8d421c94750']],
  ['content/manipulation/cross-embodiment.mdx', [10446, '297c42515c9cd70ee6906f6e4124271c6b69327076409c8968e25b242d39a02d']],
  ['content/manipulation/diffusion-policy.mdx', [10412, 'edf531a7c5fd2efe57f06efe3937f487b8dac057d5e84cd4aa51f88df2b8fd60']],
  ['content/manipulation/foundation-models.mdx', [9987, 'a0c99d565063f0ad5923b83855363d8fe9b89ff7711f1983247c24693f861657']],
  ['content/manipulation/generalist-policies.mdx', [14707, 'dc1f5b1bae1cb595ecd7a3e747bb798c287cc3e7b17e81d215bdf4c930f73ba9']],
  ['content/manipulation/hierarchical.mdx', [13666, '5951d1ac4234a63f0f929c5c5571399fa917f9a4af6b8436812b98515396bfa1']],
  ['content/manipulation/knowledge-insulation.mdx', [9089, '49c75fa273f9f9145bdde4fb50b5d97d13e0b25ff69d0911764ea5d5df7c4d4f']],
  ['content/manipulation/pi-line.mdx', [16618, 'ee0a366d1e688812a78f9d1a92b131106369bc854b23a329a1ea08ff47993a43']],
  ['content/manipulation/realtime-execution.mdx', [11765, 'ada00bae97ff0cbb54f80b2e9816b1666cbff6f7d28ff30e6a001d4afdecfa1d']],
  ['content/manipulation/rl-finetuning.mdx', [22679, 'acd5d42ce6e35340194669108b3d4d946d3400cae96ee6fb46c56311e1fc0065']],
  ['content/manipulation/robot-learning-roadmap.mdx', [9690, '59656b226f93fd1b5a2a8d3e05d2921b67cc760a5e2b86895f00fa96020b1ff3']],
  ['content/manipulation/vla-models.mdx', [13509, '675fbf2caf96085d45a811179bc4b22da0a4070be64b81f2ff61a8686bc9f27c']],
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
