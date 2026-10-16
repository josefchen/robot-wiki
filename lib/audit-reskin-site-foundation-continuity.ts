/**
 * Exact successor review for the site-foundation re-skin of 2026-10-10 (the
 * owner's Pantheon research-page standard, PANTHEON-SPEC.md): the global
 * tokens and fonts, the top bar, the article template and the home, hub,
 * glossary, A-Z and search pages. The re-skin changes presentation only, so
 * its review admits only presentation sources: files under app/ and
 * components/, the MDX component map and the citation punctuation plugin.
 * Content, data, contracts, evidence, tests and the audit layers themselves
 * are refused, and so are the interactive and motion lanes the figure system
 * owns.
 *
 * Each change is recorded as exact edits over the bytes the file had before,
 * so the earlier bytes are rebuilt from the live file instead of being
 * archived. The artifact reader hands every older check the rebuilt bytes
 * only while the live file is exactly the reviewed successor, reversing the
 * edits rebuilds bytes that hash to the recorded predecessor, and replaying
 * them gives the live bytes back. No old review, run, receipt, capture or
 * ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RESKIN_SITE_FOUNDATION_DIR = 'audit/evidence/reskin-site-foundation-20261010/';
const reviewFile = `${RESKIN_SITE_FOUNDATION_DIR}source-transition.json`;
const drift = 'reskin site-foundation continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ReskinEdit = { before: string; after: string };
export type ReskinSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: ReskinEdit[] };
export type ReskinReview = {
  schemaVersion: 'reskin-site-foundation-continuity-v1';
  name: 'reskin-site-foundation-20261010';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: ReskinSource[];
};

// BEGIN reskin site-foundation pins (written by scripts/record-reskin-site-foundation-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 209370, sha256: '7152d89a938cab2695b73658b01ed2a1d2fbdbd65eadade7758ad8f005d9ed88' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['app/(content)/[domain]/[slug]/page.tsx', [13070, '7c97076edf344ea7b7540608801c57732054b5252477eab1ed8d9893c2c3a34c']],
  ['app/(content)/[domain]/page.tsx', [10073, '7a207fee460b3fcafb158fe227adca353a9e537e0a2de20c642d1ef0cd37ec95']],
  ['app/a-z/page.tsx', [6588, 'ede8948c474300006eb05d1bcb608dcfff4a346733e540a4e3d1829d09eb17a5']],
  ['app/about/page.tsx', [5993, '70cee064b2b312acab3de6d13c080440af5052776d5c4a3880b6098550dc2516']],
  ['app/credits/page.tsx', [8310, '3a6551f0c4085b228f49679d08f094b8913656c0f019f4655ec29b69a6000010']],
  ['app/editorial-policy/page.tsx', [4507, '5725a0790a4ee703a3af4908432ff8837edf7ec23d89d3cc33749534b66bef8a']],
  ['app/globals.css', [32316, '8de4e85609e2124f4ed939f07e4d1b6fffb1fa3cffe68d3278824d336657530c']],
  ['app/glossary/page.tsx', [5323, 'fd573583eef2c762e26081e85dda3c1f48b8461cce24a41116e19114b7fc3b21']],
  ['app/layout.tsx', [4426, '7fc799173cdc026fd133d868deac13eaacfe26a6ed7a87a7fde6a5aedfd5c6c5']],
  ['app/not-found.tsx', [2670, '61cefe72130fbe2ad4c18c1d9d3877e236e370f9e11be61b784599f843fe64a9']],
  ['app/page.tsx', [11945, 'ecd27da9b503740482930904478dec78a843bf338515b19489529c28c49c9973']],
  ['app/privacy/page.tsx', [3984, '87ba4321fb4de3469891cdb718d997608f8af7c4fa62c3941b702d5557464bd3']],
  ['app/search/page.tsx', [2386, '812ecfe725d6dde3691e47dce6be31c0456e0312ee87c25f267e443ea7b63878']],
  ['components/article/article-header.tsx', [2737, '0e6de69a8588c6d716b7ef9969701dfe798b3b44608f305307a99f6a04c8af1c']],
  ['components/article/breadcrumbs.tsx', [4821, 'f339ceecb4b0d338067ab20ff3e18b22a07e3ea36575066b52a721748f1002de']],
  ['components/article/commit-to-reveal.tsx', [13685, '0f6725ec5f4f80a4897c32b69ded5979a3fc2271b1bef20d0fdfe008bc9ffb19']],
  ['components/article/heading-permalink.tsx', [2884, 'c846ea4836f62164f217826b2a639e3b819bf89d2cd282a4657c775cf80ec8a8']],
  ['components/article/references.tsx', [4522, 'fed962d668a021e3f70b7a198766ef66ba5c8bbf03895c53913b66e92dd9d0e7']],
  ['components/home/contents-index.tsx', [2671, 'b737e6f7c1990c2732b651495c24562d479b630487b69f5d028472fdb19538b6']],
  ['components/home/did-you-know.tsx', [2070, 'd0057d92372801782ed7f3d1121a227934c77dab4a1c91ac4102a5a7b74072d1']],
  ['components/home/home-search.tsx', [1560, '3df932048880a72c2fdf827890113719c2da2ea9a4692f338fbb047e1bfaaa17']],
  ['components/nav/nav-tree.tsx', [7461, '45c349bc17cc35b756995ad76e07e8dc0337cf47d09bd334f143f165b4614602']],
  ['components/nav/search-box.tsx', [2330, 'b7c20da06d0bad70111694d3ad0611c9d7e02ce34197610ae0f54a8e3210b78b']],
  ['components/nav/site-footer.tsx', [4958, 'fd96f04fd40b1fe84eee17b6355aa69cb8cbd88684617c92588e354a56e0ce47']],
  ['components/nav/site-shell.tsx', [11051, 'e5af0fb1687850d8846930525949134cc56809b0d1a24b38c0dff4a97ce0cc01']],
  ['components/search/results-group.tsx', [2789, '6c8d42c17798590e7d958d9f4b06f3c43c8b0e601040c76d7968d174f625bec3']],
  ['components/search/search-interface.tsx', [22509, 'a1069881595ea3f04c8dd7001d699653f9633a553007d93f352ad9fc75e5da00']],
  ['components/search/type-facet-bar.tsx', [3160, '48b32a1ed2a34dcabab5bb2090463cb9b78ccae0652c707880cc751213490c56']],
  ['components/ui/badge.tsx', [896, 'c8d4976355418852825c23be65fa4a5c4a69d4eab0e2bb222b2d12e1ed04afcc']],
  ['components/ui/callout.tsx', [1164, '121ecba1c09198ca847cb77bcd7bf9e11c6aa2ac641c003e0053c0aa01488f5e']],
  ['components/ui/card.tsx', [1948, '8125ef184499dd6843e602d5f60bbcc51d16165e9c135d296166324882ded1de']],
  ['components/ui/chip.tsx', [1404, 'ad85270b8f9d35724744af9a598131ac6066d90d64e1b66176798d6a80c14b7c']],
  ['components/ui/cite.tsx', [4783, 'cd028146d7e2b05c0b4ce5269c7fb7518eb45aaefb91c150d03565d77cac2c81']],
  ['components/ui/code-block.tsx', [1415, '8dad0fc0047e962a8d6e3d73bd95c697af6c190d4cf1d7e65cff926514c62524']],
  ['components/ui/table.tsx', [8316, '59f239fcde4498d01359bf0568a6e23e2188a891c17a524dc665eda132e422d9']],
  ['components/ui/tabs.tsx', [2844, '6b8cd205e909cfff2f5e783de2cc717cab0c864579f6e3fc557d646edf58f00d']],
  ['lib/rehype-cite-punctuation.mjs', [6741, 'd801b6f103d9dc0d497d8f5569f4ec01354852878aee8638dced4e24a2e30631']],
  ['mdx-components.tsx', [5019, '0232bf20edd573c1c38c68c0c830442895b8f790b57c4655b2f0e13468c3b34f']],
]);
// END reskin site-foundation pins

const PRESENTATION = /^(?:app\/.+\.(?:tsx|ts|css)|components\/.+\.tsx|mdx-components\.tsx|lib\/rehype-cite-punctuation\.mjs)$/;
const REFUSED = /^components\/(?:interactive|motion)\//;

/** Whether the re-skin review may hold a successor for this path. */
export const isReskinPresentationPath = (path: string): boolean => PRESENTATION.test(path) && !REFUSED.test(path);

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
 * The pre-reskin bytes rebuilt from the live successor. Throws unless the
 * path is a presentation source, the live bytes are the recorded successor,
 * and the edits reverse to the recorded predecessor and replay to the live
 * bytes exactly.
 */
export function verifyReskinSource(source: ReskinSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path || !isReskinPresentationPath(path) || source.before?.path !== path ||
    !/^[0-9a-f]{40}$/.test(source.archivedFrom ?? '') || !same(source.after, path, live.length, digest(live)) ||
    edits.length === 0 || edits.some(({ before, after }) => typeof before !== 'string' ||
      typeof after !== 'string' || before === after || (!before && !after))) {
    throw new Error(drift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const)) !== current) {
    throw new Error(drift);
  }
  return prior;
}

const reviewCache = new Map<string, ReskinReview>();
const priorCache = new Map<string, Buffer>();

export function loadReskinReview(root: string): ReskinReview {
  let bytes: Buffer;
  let review: ReskinReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as ReskinReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'reskin-site-foundation-continuity-v1' ||
    review.name !== 'reskin-site-foundation-20261010' || !review.reviewedBy || !(review.rationale?.length > 80) ||
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
    const source = loadReskinReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyReskinSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the re-skin review holds a successor for. */
export const reskinSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function reskinPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
