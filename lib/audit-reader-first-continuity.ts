/**
 * Exact successor review for the files the reader-first figure pass of
 * 2026-10-02 changed that an earlier review pins: articles, end-to-end
 * specs and figure sources. Each change is recorded as exact edits over the
 * bytes the file had before the pass, so the earlier bytes are rebuilt from
 * the live file instead of being archived. The artifact reader hands every
 * older check the rebuilt bytes only while the live file is exactly the
 * reviewed successor, reversing the edits rebuilds bytes that hash to the
 * recorded predecessor, and replaying them gives the live bytes back. An
 * article also keeps its frontmatter and every citation it had, and a spec
 * keeps at least as many expect and test calls. No old review, run,
 * receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const READER_FIRST_CONTINUITY_DIR = 'audit/evidence/reader-first-20261002/';
const reviewFile = `${READER_FIRST_CONTINUITY_DIR}source-transition.json`;
const drift = 'reader-first continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ReaderFirstEdit = { before: string; after: string };
export type ReaderFirstSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: ReaderFirstEdit[] };
export type ReaderFirstReview = {
  schemaVersion: 'reader-first-continuity-v1';
  name: 'reader-first-figures';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: ReaderFirstSource[];
};

// BEGIN reader-first pins (written by scripts/record-reader-first-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 350579, sha256: '0a992fd276f0a9d718e8ec5403b8b55df9ecfc3bf0236ec4af316572011d78da' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/interactive/collaborative-operation-modes.tsx', [25387, '4692a21269e9eb95ce397dc9e7081513fa8b82a67d84f020e7956fa5570baaa0']],
  ['components/interactive/egoscale-scaling.tsx', [27149, '479b378d3741841069f42d5b2769dbc483ed8cb1eb0e9499743641d6f0b58fe8']],
  ['components/interactive/hand-comparison.tsx', [16488, '3b2c3d9308e0bd0baef0a65303752664ebdd92f7e560312aaf00c57a3a95f2b2']],
  ['components/interactive/milestones-watchlist.tsx', [16141, '81aae07a0d8e73f9aa9761314e435460d6a544226689bf8a1f7c8335057ff88f']],
  ['components/interactive/perception-latency.tsx', [15260, '6f4270266f91b4c9f78e44358977a60200e02143a212f6438c74858672a9b202']],
  ['components/interactive/thesis-explorer.tsx', [16923, 'c5ab42ae55a0d684f5bde5c6a9d665eebfeac751cfbdfac2b674f7033a4bb5d7']],
  ['components/motion/scenes/sense-avoid.tsx', [13518, 'e18f668521d04e8bd5946508ab9cad990d2d76827fa7873b1e383f3911f001b7']],
  ['components/motion/scenes/tactile-slip.tsx', [9697, '8c3b451df94096363373e3afeb7a8a382b24ad98a9e03d04dfc43d06e95d0c67']],
  ['content/adjacent/drones.mdx', [14500, 'fba99c70b364213f21106c7a3f2b720bdfaf2c0c1a3a5caa4fa968336cbf5a47']],
  ['content/frontier/bear-case.mdx', [11038, '76effed4c8661a0fdd96e4558a76f1d835ef939cd0bc31a6caa4eec65c952e01']],
  ['content/frontier/competing-theses.mdx', [17758, 'c0f154df479b62f96726bca6deff5796c138b4abd55914c4acae2089c1058a25']],
  ['content/frontier/dexterity.mdx', [17836, '28df457c23f3ddc1724065713e0c127d66a3e07df0a8565c383c1029361586da']],
  ['content/frontier/generalization.mdx', [15297, 'effad5586287f0104cd87ba8022bc7a68b924c40f7fa14d28ab96efc2c4b6387']],
  ['content/frontier/safety-and-assurance.mdx', [19760, '04b4c95aeaa5cf9f0ac0cde5817a3a5607cbcb779e4152a89af87f26b7dbbbf5']],
  ['tests/component/chart-state-descriptions.test.tsx', [19496, '23c1d2153f85c873555a55815dc5830d53e0344736502e88be78d6bbe7814b2a']],
  ['tests/component/collaborative-operation-modes.test.tsx', [9511, '1fb9bbdfbdf923c9510af1cbdb18453cc1deed6e7d5ca9cbd36bb4f40b9bea88']],
  ['tests/component/egoscale-scaling.test.tsx', [9578, 'ab09fc12b101d882dcafa4a250e580c7bab03fec71663da59baf6cb1870f6bf1']],
  ['tests/component/hand-comparison.test.tsx', [10121, '017cd2176a183a717dd103c0fc98076d3f89157f326a5cda2ea0828eda0d1a10']],
  ['tests/component/milestones-watchlist.test.tsx', [8219, 'e335596d8dd037321f7adbbae1aded63fd706f2849a068bec0e829dd61ba03e7']],
  ['tests/component/perception-latency.test.tsx', [6200, '1f49e6eb68701f4f6ab21d5d8ff4a19863c67a2e97a94b3ef4ece70f887e7595']],
  ['tests/component/thesis-explorer.test.tsx', [7672, '9d9b7d792078c8e31522d326e0393defa5b4621c0a1ed841c03d786d70fdd621']],
  ['tests/e2e/bear-case.spec.ts', [12124, 'cd87d6c153033de4616ececc82620a207196e7ad1a991a07d45d922985c97919']],
  ['tests/e2e/brooks-theses-readers.spec.ts', [8452, '3f08eb90f251b5dc189d2854e6400421706d672b5d346a21e7654bea9106b79b']],
  ['tests/e2e/competing-theses.spec.ts', [9790, '42020e2d5dfb33bab2959e059998b9d79592453d522f6b9482e562b588682ed9']],
  ['tests/e2e/dexterity.spec.ts', [13239, '67696d58645a36946d2ca3b71f5aacac3dc58394696688333760060aa8f111c4']],
  ['tests/e2e/drones.spec.ts', [8481, '2eabafccd68f8a97c0c53a57e480fd6807d9ec96a3df784d08edb75483dd147f']],
  ['tests/e2e/final-seven-closure-evidence.spec.ts', [7486, '36ab7a3c8d08b31efa7d4503650865b51b6f9a7f249ead434056c114f9d29024']],
  ['tests/e2e/generalization.spec.ts', [9850, '9c9f69678708b07bbeb1f8fe53ba4a89e3f6bc82bb7dc369e8d681a01e7adae2']],
  ['tests/e2e/motion-frontier-adjacent-home.spec.ts', [9612, '60f0e13044bb551268f502e79acf1193989d8e61eaa0e269dad6edf2d0a9afe8']],
  ['tests/e2e/pi-helix-theses-readers.spec.ts', [3798, 'd4d426d40a5d6ab1020e7e955e2c4d0c10e55d1a04ae6ac062b763743f2d9686']],
  ['tests/e2e/predict-then-reveal.spec.ts', [39867, '857f6b86f3c8ad9c32a9581b4960337703a70ec070e90e35267044d4b9898c22']],
  ['tests/e2e/residual-release-final-seven.spec.ts', [7996, '91a2a1cdfb4c2d716fcf841e6bb45a95676f739810f93487fccbf0886242ff4a']],
  ['tests/e2e/safety-and-assurance.spec.ts', [23544, 'd8eb080ba5f910c343430f63f9e0d2a6c8b7e34d3cd814d292d42ea77d61e0fd']],
  ['tests/e2e/thesis-economics-readers.spec.ts', [6170, '25b0c7ae3b7cdcbe6a2b604f55d6bc6aa51de094f1e2209e1ee00325c52da0d3']],
  ['tests/unit/motion-frontier-adjacent-home.test.ts', [10400, '65d530b06879dcadbb24c1660a49c723882aece6335a11e0ca5ba299a9a14fe3']],
]);
// END reader-first pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citations = (source: string) => new Set([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));
const calls = (source: string) => [
  source.split('expect(').length - 1,
  source.match(/\btest(?:\.[a-z]+)?\(/g)?.length ?? 0,
] as const;

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

/** The path-specific obligations a successor keeps over its predecessor. */
function keepsObligations(path: string, prior: string, current: string): boolean {
  if (path.startsWith('content/') && path.endsWith('.mdx')) {
    const head = frontmatter(current);
    const kept = citations(current);
    return !!head && head === frontmatter(prior) && [...citations(prior)].every((id) => kept.has(id));
  }
  if (path.startsWith('tests/e2e/') && path.endsWith('.spec.ts')) {
    const [priorExpects, priorTests] = calls(prior);
    const [expects, tests] = calls(current);
    return expects >= priorExpects && tests >= priorTests;
  }
  return true;
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyReaderFirstSource(source: ReaderFirstSource, live: Buffer): Buffer {
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
    !keepsObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

function reviewed(review: ReaderFirstReview): void {
  if (review?.schemaVersion !== 'reader-first-continuity-v1' || review.name !== 'reader-first-figures' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
}

export function loadReaderFirstReview(root: string): ReaderFirstReview {
  let bytes: Buffer;
  let review: ReaderFirstReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    review = JSON.parse(bytes.toString()) as ReaderFirstReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256) throw new Error(drift);
  reviewed(review);
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(drift);
  }
  return review;
}

/** The paths the reader-first review holds a successor for. */
export const readerFirstSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function readerFirstPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadReaderFirstReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifyReaderFirstSource(source, live);
}
