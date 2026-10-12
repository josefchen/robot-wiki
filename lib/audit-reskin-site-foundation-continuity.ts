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
const reviewPin = { bytes: 177690, sha256: '302c6c8a70c9ea10bfc2200392f63d47b3b9dc24b37294644ad5e2c57f96da3e' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['app/(content)/[domain]/[slug]/page.tsx', [12875, '81210683f397f374f3989f4700f03948d8b4b98860d2f7aea8c91ff07807774a']],
  ['app/(content)/[domain]/page.tsx', [6080, '23df1b3dedcc24f5437de548b27b529911eea340e67351f5ae5f225254b63bb2']],
  ['app/a-z/page.tsx', [6643, 'd8c4a0db86fd9959d6b23e8b4a4fb2e5a49380f0b18cc8584b65a339b3af8f3a']],
  ['app/about/page.tsx', [6322, 'f414d1966320ae764e1f122370a0153bd06052f54edd41af89cfb9a74f22fd3b']],
  ['app/credits/page.tsx', [8488, '66a9f71b1879de7fc50dcdaebf78fa6eb15f6cf8e376fd600c71ad0ac3e0040d']],
  ['app/editorial-policy/page.tsx', [4963, 'b9deaf6ef5d58ec00e2fb400344d7cefdf4ebf32bc4d37aa48510398eaf12dd1']],
  ['app/globals.css', [29922, '426e895225d34e6ab299def3f70c3718c237d5c0a4574e5da666a9513043b685']],
  ['app/glossary/page.tsx', [4689, 'a4701f1f96717f1c9374c453daf8585f31f153fd101aa7a5ca4f625d85347c61']],
  ['app/layout.tsx', [4426, '7fc799173cdc026fd133d868deac13eaacfe26a6ed7a87a7fde6a5aedfd5c6c5']],
  ['app/not-found.tsx', [2670, '61cefe72130fbe2ad4c18c1d9d3877e236e370f9e11be61b784599f843fe64a9']],
  ['app/page.tsx', [10654, '879840a280d17a6c7e414f1e34e5b012db56b4403fadb3b9dd7e205f8e995135']],
  ['app/privacy/page.tsx', [3984, '87ba4321fb4de3469891cdb718d997608f8af7c4fa62c3941b702d5557464bd3']],
  ['app/search/page.tsx', [2438, 'dfdb08e3bcac12514c538ee9a35bd67c1746bd939b32ce8e41ec7c24b46ed74b']],
  ['components/article/article-header.tsx', [2737, '0e6de69a8588c6d716b7ef9969701dfe798b3b44608f305307a99f6a04c8af1c']],
  ['components/article/breadcrumbs.tsx', [4821, 'f339ceecb4b0d338067ab20ff3e18b22a07e3ea36575066b52a721748f1002de']],
  ['components/article/commit-to-reveal.tsx', [13685, '0f6725ec5f4f80a4897c32b69ded5979a3fc2271b1bef20d0fdfe008bc9ffb19']],
  ['components/article/heading-permalink.tsx', [2884, 'c846ea4836f62164f217826b2a639e3b819bf89d2cd282a4657c775cf80ec8a8']],
  ['components/article/references.tsx', [3739, '598596180e8fc3de068cd5755f98775f7ac9400dd5d54e678ecd1b74908e5daa']],
  ['components/home/contents-index.tsx', [2671, 'b737e6f7c1990c2732b651495c24562d479b630487b69f5d028472fdb19538b6']],
  ['components/home/did-you-know.tsx', [2070, 'd0057d92372801782ed7f3d1121a227934c77dab4a1c91ac4102a5a7b74072d1']],
  ['components/home/home-search.tsx', [1560, '3df932048880a72c2fdf827890113719c2da2ea9a4692f338fbb047e1bfaaa17']],
  ['components/nav/nav-tree.tsx', [7461, '45c349bc17cc35b756995ad76e07e8dc0337cf47d09bd334f143f165b4614602']],
  ['components/nav/search-box.tsx', [2330, 'b7c20da06d0bad70111694d3ad0611c9d7e02ce34197610ae0f54a8e3210b78b']],
  ['components/nav/site-footer.tsx', [4958, 'fd96f04fd40b1fe84eee17b6355aa69cb8cbd88684617c92588e354a56e0ce47']],
  ['components/nav/site-shell.tsx', [11051, 'e5af0fb1687850d8846930525949134cc56809b0d1a24b38c0dff4a97ce0cc01']],
  ['components/search/results-group.tsx', [2789, '6c8d42c17798590e7d958d9f4b06f3c43c8b0e601040c76d7968d174f625bec3']],
  ['components/search/search-interface.tsx', [22546, 'ff0e3a4fef398349a37d57a43fd574cdab97adbea714630fc0a8ab49f62aa1bc']],
  ['components/search/type-facet-bar.tsx', [3160, '48b32a1ed2a34dcabab5bb2090463cb9b78ccae0652c707880cc751213490c56']],
  ['components/ui/badge.tsx', [896, 'c8d4976355418852825c23be65fa4a5c4a69d4eab0e2bb222b2d12e1ed04afcc']],
  ['components/ui/callout.tsx', [1164, '121ecba1c09198ca847cb77bcd7bf9e11c6aa2ac641c003e0053c0aa01488f5e']],
  ['components/ui/card.tsx', [1948, '8125ef184499dd6843e602d5f60bbcc51d16165e9c135d296166324882ded1de']],
  ['components/ui/chip.tsx', [1404, 'ad85270b8f9d35724744af9a598131ac6066d90d64e1b66176798d6a80c14b7c']],
  ['components/ui/cite.tsx', [4783, 'cd028146d7e2b05c0b4ce5269c7fb7518eb45aaefb91c150d03565d77cac2c81']],
  ['components/ui/code-block.tsx', [1415, '8dad0fc0047e962a8d6e3d73bd95c697af6c190d4cf1d7e65cff926514c62524']],
  ['components/ui/table.tsx', [8316, '59f239fcde4498d01359bf0568a6e23e2188a891c17a524dc665eda132e422d9']],
  ['components/ui/tabs.tsx', [2844, '6b8cd205e909cfff2f5e783de2cc717cab0c864579f6e3fc557d646edf58f00d']],
  ['lib/rehype-cite-punctuation.mjs', [5290, 'a66ea5c326b9b0a9b7b0c3f0cfdb7cf2b838a570d85714b1ebf1efbc7a33e6e1']],
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
