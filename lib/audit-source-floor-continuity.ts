/**
 * Exact article successors for the final source and reading-order pass.
 * This preserves historical proof inputs; it is not fresh acceptance of the
 * current article. Current source, prose, placement and browser checks still
 * run against the live files. Unreviewed bytes never inherit an old verdict.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { sourceRegistryPredecessor } from './audit-source-registry-continuity.ts';

export const SOURCE_FLOOR_CONTINUITY_FILE = 'audit/evidence/source-floor-20261102/source-transition.json';
const drift = 'source-floor continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
type Artifact = { path: string; bytes: number; sha256: string };
export type SourceFloorMetadataChange = { field: 'description'; before: string; after: string; reason: string };
export type SourceFloorImageRelocation = { id: string; reason: string };
export type SourceFloorSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: { before: string; after: string }[];
  metadataChanges?: SourceFloorMetadataChange[];
  imageRelocations?: SourceFloorImageRelocation[];
};
export type SourceFloorReview = {
  schemaVersion: 'source-floor-continuity-v1';
  reviewedBy: string;
  rationale: string;
  ownerApproval: string;
  observedAt: string;
  sources: SourceFloorSource[];
};

// BEGIN source-floor pins (written by scripts/record-source-floor-continuity.ts)
const reviewPin = { bytes: 297416, sha256: '3ba1fbccbfa5a2ca68576e6b86d2c798f1467ed6d55243fd5fe48774c5518c4d' };
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/adjacent/autonomous-vehicles.mdx', [23593, 'cfa4800e1f0087048d873d62abadf9542f65bc0d86976d3d143fb15fae38a905']],
  ['content/adjacent/drones.mdx', [15306, '2d28646b34b6155c8190a21505d7cac1be6042eb6cb8fdecd050873c9bb95a5f']],
  ['content/adjacent/space.mdx', [15632, '908f257bd0e337122e3b721a63c6400ba5b0c7f5d6a4349ce4182f7a7ab1a0ba']],
  ['content/adjacent/surgical.mdx', [13477, 'a5f4050fd355ed94d76552534f69194f30134fdbd99e6b979fd1ccf311f68788']],
  ['content/classical/calibration.mdx', [9281, 'dfb1522ed7b786955fe88570c81b8a6be91020d6903a078f3da30e3ea6b3c026']],
  ['content/classical/control.mdx', [18210, '8772f811150177fdff9624a0d9edf8b238dfb54f20c902fc4c0fbcb2aaed6ac4']],
  ['content/classical/grasp-planning.mdx', [14272, '4b8eca09d20e27e019bda9d95c2a05329e592a4dad5916ed1d9f397004fee67b']],
  ['content/classical/kinematics.mdx', [11528, '70b778e5d4fbf3d1a9ed949c5795260887371a3d07fd0863b05a789a11bf23af']],
  ['content/classical/motion-planning.mdx', [20755, 'cebb6a38fc651fa1b23262773158311abd1eee7430b4225c2d28c06722e76f36']],
  ['content/classical/perception.mdx', [23931, '75b2906744909f23172a584d8460e765abd60758e0048ec6a4d4dd807ae12647']],
  ['content/classical/ros2-for-ml-engineers.mdx', [9579, '6c5a82dcb8a93492e6b8f940bf5f410cb9f469f03a5b995146c3cbfc148d171c']],
  ['content/classical/scene-representation.mdx', [20324, '5e19a78d759cfb171859dbed377579ff9fe90e612240030f9eb5d37765ffeca2']],
  ['content/classical/state-estimation.mdx', [16544, '9fa466a58784430cf1f7e026297a8de106b67eb8d9de72f3106cdc37137d5ed3']],
  ['content/data-hardware/data-bottleneck.mdx', [16092, '2854ef7fc0e3611ee7a698ebc7119f79592254873dacf5645b81d3a52fdf0e08']],
  ['content/data-hardware/datasets.mdx', [14263, '9c4694ccd7c0a90715ea1df32407940531f6961aaace2d260eb1905b7612ff4f']],
  ['content/data-hardware/evaluation-crisis.mdx', [18113, '8e9abea3ff8763a79b1ed28ab0fd3ea8e3f6612abc9f7bf22a1008ccae297140']],
  ['content/data-hardware/hardware-taxonomy.mdx', [13462, '7589f23ed5e9f6573819223b3ff56b0546d0fc4672e384a96a0539650bec3e4f']],
  ['content/data-hardware/industrial-deployment.mdx', [18605, '0203a153dab0d3666ae90c83f2844a8dfe6326a2eb33d9f8630cfeedb8266807']],
  ['content/data-hardware/robot-learning-stack.mdx', [11777, '309d261899672797ae35d57f75dc30192311834406c51ff60da1403b4ea14813']],
  ['content/data-hardware/teleop-rigs.mdx', [12744, '46ae338f9a5d0148475efa7eaf1bf5f534ecad8e55b3893f621abeebe2970584']],
  ['content/frontier/bear-case.mdx', [10814, '118d9cab6c3259255c3a1bcf94a2eb6204c5274ffb4beb873c472ca76f424c10']],
  ['content/frontier/competing-theses.mdx', [14788, '8c1749238b3c4b42e8e653712a33f58f6923b51ea7135ca582346c6da759b3a4']],
  ['content/frontier/dexterity.mdx', [20127, '858c851e46c5eb3eef0d9b8ec5d2097790ee5842e450036d907e49958b09dc40']],
  ['content/frontier/generalization.mdx', [15780, 'b4f0aa8cf5b76c069909c7005404d85c178a24b91135543b10ee65e0f3340035']],
  ['content/frontier/reliability-gap.mdx', [11270, '836a18b3cbd2ed792a69c49466396c360dc2759b80ef8d6558258e370ffd2d85']],
  ['content/frontier/safety-and-assurance.mdx', [21137, 'a97e16c33f76be208607fedea7f9db57e7259c752ea0caac9039f00885ce7bca']],
  ['content/manipulation/action-chunking.mdx', [10995, '3fbcb5864481e6c112c890e9efda17c62806d80906bf2bd122712b84e4211504']],
  ['content/manipulation/action-spaces.mdx', [10316, '991f4674945e2727c60444aba799c9125c540c32cc61b15cff34856e930fa493']],
  ['content/manipulation/bc-foundations.mdx', [12805, '3e9bdf06f01871ebfe2da3672c98880923acf8c80116470d05bf1869a7a7e7a5']],
  ['content/manipulation/comparison-matrix.mdx', [9554, 'a2a50fdc6974d2f0e4591343125b320f4aa15d75a8ce6f32cefcb89de13a2977']],
  ['content/manipulation/cross-embodiment.mdx', [10803, '3e096a65a779f7cb5f326e082c8239dd9812921c1627a650ef844f428d079531']],
  ['content/manipulation/diffusion-policy.mdx', [10019, '11e6856c9bbd2b1fb953eeac8da813cea6c75a4c87d9e542a3d54a74127ccb35']],
  ['content/manipulation/foundation-models.mdx', [10961, 'f5d2c840d8caafa6a6e65c899b0f23dfe3433e4caa1206a7f70230dff79388d0']],
  ['content/manipulation/generalist-policies.mdx', [11786, 'aa0d5bf0115faf182f448c09094d8b4c7cb77c1314f7d3c9b8053117894ac4aa']],
  ['content/manipulation/hierarchical.mdx', [14616, 'f813993b696392450d6fa25e09217335cfc5403788f057dcafb21ce429f8346d']],
  ['content/manipulation/knowledge-insulation.mdx', [8870, '5e653349a1539698fcd0e95c0a68f7a2affeeffdbeeaccf591b10b9ae1947c97']],
  ['content/manipulation/pi-line.mdx', [13302, '29d973dfdf1e08f47cb969d98213b7ed38514ba6b11174a80524ffc29966ed1e']],
  ['content/manipulation/realtime-execution.mdx', [10817, 'fc6ebe02c25c3a840baa110c7c2692caabc543888beb5d3d2d788572606be8fd']],
  ['content/manipulation/rl-finetuning.mdx', [18769, '6ad2cc662b3afd781c87acd2c3ac37530b045a42d2ffd9e96d4dc62b7bb04433']],
  ['content/manipulation/robot-learning-roadmap.mdx', [9180, '9fc1ca24d19f6b9ed379f51c26568445c2257ab4ada8d4fb67da30b9c892c161']],
  ['content/manipulation/vla-models.mdx', [13601, 'b735a6b9569526100657c4c26490548e639240b0cc6c68d8a42ea168a1266438']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [16797, '3799cfccd59e8c5aaefcb70afc5b6c063be55178045cf8c5d846147f73bed4ac']],
  ['content/rl-sim2real/legged-locomotion.mdx', [13466, '0abf6ad8b30ec69da7805c981e25888c48a9d043ecb50e00725c428c8aa6474d']],
  ['content/rl-sim2real/offline-rl.mdx', [12871, '437079d652a07e91e9c281e547b951cdcae31a61987095be56e7a6bd2a9bad78']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [10673, 'a8d92949618be1921e8c2c6aec62c47da26529963e99732546346b196eec0c3e']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [14821, '1dcdd2d2f3af95ed7d2508232dd7e56536402b2cadd6a5c90d773d5aef132f25']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [13010, '88a5329907fc8449560d4a9da3159b15500ea6853e01d3569e15a875a7b0270d']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [16229, 'd01537ae5932365b4133d28efc242b4967411aba85ef0b8b5bce2f304ea731b5']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [8364, '050d298fc4f758783257caf18d03fbc2aa76889bfd03c259d3cd33853bc752f9']],
  ['content/world-models/evaluation.mdx', [10204, 'd61e5cff60dff5939a2a1df3b06890f049fead4bc4a7c5875255d028fb7e8f9a']],
  ['content/world-models/generative-sim.mdx', [13897, 'ec627acacdfaaf0a3d273a66d4c1838b28669207a74e0e16e4b125cfaa99feb3']],
  ['content/world-models/generative-video.mdx', [16847, '92b6ccb9839ba7358e7ad9ab916580278158d4dd444456e421730d80e9f8c3cb']],
  ['content/world-models/jepa.mdx', [13078, 'a2eef54eb1405735248ca5bd95c8c5ff2a5a1abab49ac24e644b2a7f48473725']],
  ['content/world-models/latent-dynamics.mdx', [11751, '1640f8bd68be1860cbae6c228efa5fbe0da7c47596bc1f9f022f965be32c9a17']],
  ['content/world-models/model-based-robot-learning.mdx', [11505, 'e56ab673b817f35aa8c4135b63c6b94ff36310373ee4c5366b52a5a0ef0b3756']],
  ['content/world-models/taxonomy.mdx', [12811, 'd4fbccc397ee5201660b0fc84457c1b4ca008793514dbe4d25c272a31bc73eb5']],
  ['content/world-models/world-models-vs-simulators.mdx', [12324, 'e4fa21fecd5bb5eafedb95516567d7b7ca2de4a0491dfb59d2d2fea321e61525']],
]);
// END source-floor pins

const body = (text: string) => matter(text).content;
const cites = (text: string) => new Set([...body(text).matchAll(/<Cite\b[^>]*\bid=["']([^"']+)["']/g)].map((m) => m[1]));
const imports = (text: string) => text.split('\n').filter((line) => /^import\s.+\sfrom\s/.test(line));
const blocks = (text: string) => [...body(text).matchAll(/^<([A-Z][A-Za-z0-9.]*)\b([^>]*)>/gm)]
  .map((m) => m[1] === 'Image' ? `Image:${m[2].match(/\bid=["']([^"']+)["']/)?.[1] ?? ''}` : m[1]);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Preserve every cited source and imported figure, including its props. */
export function keepsSourceFloorObligations(path: string, prior: string, current: string,
  metadataChanges: readonly SourceFloorMetadataChange[] = [],
  imageRelocations: readonly SourceFloorImageRelocation[] = []): boolean {
  if (!/^content\/[a-z0-9-]+\/[a-z0-9-]+\.mdx$/.test(path) || prior === current) return false;
  if (!equal(imports(prior), imports(current))) return false;
  const priorBlocks = blocks(prior);
  const currentBlocks = blocks(current);
  const relocated = new Set(imageRelocations.map((move) => `Image:${move.id}`));
  if (relocated.size !== imageRelocations.length || imageRelocations.some((move) => {
    const token = `Image:${move.id}`;
    return !move.id || move.reason.length < 60 || priorBlocks.filter((x) => x === token).length !== 1 ||
      currentBlocks.filter((x) => x === token).length !== 1 || priorBlocks.indexOf(token) === currentBlocks.indexOf(token);
  })) return false;
  // Only explicitly named photos may move around an interactive. The image
  // identities, complete props and relative image order remain unchanged;
  // every other block retains its relative position, including the figures.
  const images = (text: string) => [...body(text).matchAll(/^<Image\b[^>]*\/\s*>/gm)].map((m) => m[0]);
  if (!equal(images(prior), images(current)) ||
    !equal(priorBlocks.filter((x) => !relocated.has(x)), currentBlocks.filter((x) => !relocated.has(x)))) return false;
  const names = imports(prior).flatMap((line) => [...line.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1]));
  for (const name of names) {
    const mounts = (text: string) => [...body(text).matchAll(new RegExp(`<${name}\\b[\\s\\S]*?\\/>`, 'g'))].map((m) => m[0]);
    if (!equal(mounts(prior), mounts(current))) return false;
  }
  const afterIds = cites(current);
  if (![...cites(prior)].every((id) => afterIds.has(id))) return false;
  const beforeFront = { ...matter(prior).data };
  const afterFront = { ...matter(current).data };
  const beforeCitations = beforeFront.citations;
  const afterCitations = afterFront.citations;
  if (!Array.isArray(beforeCitations) || !Array.isArray(afterCitations) ||
    new Set(afterCitations).size !== afterCitations.length ||
    !beforeCitations.every((id) => afterCitations.includes(id))) return false;
  delete beforeFront.citations;
  delete afterFront.citations;
  const seen = new Set<string>();
  for (const change of metadataChanges) {
    if (change.field !== 'description' || seen.has(change.field) || change.before === change.after ||
      change.reason.length < 60 || beforeFront[change.field] !== change.before || afterFront[change.field] !== change.after) return false;
    seen.add(change.field);
    delete beforeFront[change.field];
    delete afterFront[change.field];
  }
  return equal(beforeFront, afterFront);
}

function apply(text: string, edits: readonly (readonly [string, string])[]): string {
  let out = text;
  for (const [from, to] of edits) {
    const parts = out.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    out = parts.join(to);
  }
  return out;
}
const same = (ref: Artifact, path: string, bytes: Buffer) =>
  ref.path === path && ref.bytes === bytes.length && ref.sha256 === digest(bytes);

export function verifySourceFloorSource(source: SourceFloorSource, live: Buffer): Buffer {
  const path = source.after?.path;
  if (!path || !/^[a-f0-9]{40}$/.test(source.archivedFrom) || !same(source.after, path, live) ||
    !source.edits?.length || source.edits.some((e) => !e.before || !e.after || e.before === e.after)) throw new Error(drift);
  const text = live.toString();
  const rebuilt = apply(text, source.edits.map((e) => [e.after, e.before] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior) || apply(rebuilt, source.edits.map((e) => [e.before, e.after] as const)) !== text ||
    !keepsSourceFloorObligations(path, rebuilt, text, source.metadataChanges, source.imageRelocations)) throw new Error(drift);
  return prior;
}

const reviews = new Map<string, SourceFloorReview>();
export function loadSourceFloorReview(root: string): SourceFloorReview {
  const bytes = readFileSync(join(root, SOURCE_FLOOR_CONTINUITY_FILE));
  const key = `${root}\0${digest(bytes)}`;
  const cached = reviews.get(key);
  if (cached) return cached;
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256) throw new Error(drift);
  const review = JSON.parse(bytes.toString()) as SourceFloorReview;
  if (review.schemaVersion !== 'source-floor-continuity-v1' || !review.reviewedBy || review.rationale.length < 100 ||
    review.ownerApproval.length < 60 || !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now() ||
    review.sources.length !== successors.size || new Set(review.sources.map((s) => s.after.path)).size !== successors.size ||
    review.sources.some(({ after }) => !equal(successors.get(after.path), [after.bytes, after.sha256]))) throw new Error(drift);
  reviews.set(key, review);
  return review;
}

const priors = new Map<string, Buffer>();
/** Return reviewed historical bytes only for an exact, reviewed live successor. */
export function sourceFloorPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  if (ref.path === 'data/citations.ts') return sourceRegistryPredecessor(root, ref, live);
  const pin = successors.get(ref.path);
  if (!pin || live.length !== pin[0]) return live;
  const hash = digest(live);
  if (hash !== pin[1] || (ref.bytes === live.length && ref.sha256 === hash)) return live;
  // Always check the review, even when the reconstructed bytes are cached.
  const source = loadSourceFloorReview(root).sources.find((s) => s.after.path === ref.path)!;
  const key = `${root}\0${ref.path}\0${hash}`;
  let prior = priors.get(key);
  if (!prior) {
    prior = verifySourceFloorSource(source, live);
    priors.set(key, prior);
  }
  return Buffer.from(prior);
}
