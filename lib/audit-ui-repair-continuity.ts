/** Exact predecessors for reviewed shared UI repairs; current browser gates stay live. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const UI_REPAIR_REVIEW_FILE = 'audit/evidence/shared-ui-repairs-20261102/source-transition.json';
type Artifact = { path: string; bytes: number; sha256: string };
export type UiRepairSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  reason: string;
  preserved: string[];
  checks: string[];
  edits: { before: string; after: string }[];
};
export type UiRepairReview = { schemaVersion: 'shared-ui-repair-continuity-v1'; reviewedBy: string; observedAt: string; sources: UiRepairSource[] };
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const drift = 'shared UI repair continuity drift';
// BEGIN shared UI repair pins
const reviewPin = { bytes: 8281, sha256: 'd27924124904a07dacb314e64ed7bae86cbe0fa7e2fb08143cc16d6d23dd39d1' };
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/ui/cite.tsx', [5891, 'b9fbeaff3405eb0df51c10e79702cd5714b343f32997f5ee07e8afe5dce376e4']],
  ['components/article/references.tsx', [4543, '63e17ab383c0a949d95d33e1379db46521be04f6e3ba5e8fc609c82d486b74e7']],
  ['components/interactive/eureka-loop.tsx', [21980, '002311b1e187512f56d9d23bee63ea4b4a15d1ae04c65ac6e5c16e3eca4edcd3']],
  ['components/interactive/reward-shaping.tsx', [25306, '9f6c76ef04149f77123d9fe27e4fba67cd194032d351f8f0b8aa184ca8086c01']],
]);
// END shared UI repair pins

function apply(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    result = parts.join(to);
  }
  return result;
}
export function verifyUiRepairSource(source: UiRepairSource, live: Buffer): Buffer {
  if (source.after.path !== source.before.path || !/^[a-f0-9]{40}$/.test(source.archivedFrom) || source.reason.length < 100 ||
    !source.preserved.length || !source.checks.length || source.checks.some((path) => !path.startsWith('tests/')) ||
    live.length !== source.after.bytes || sha(live) !== source.after.sha256 || !source.edits.length ||
    source.edits.some((e) => !e.before || !e.after || e.before === e.after)) throw new Error(drift);
  const prior = Buffer.from(apply(live.toString(), source.edits.map((e) => [e.after, e.before] as const).reverse()));
  if (prior.length !== source.before.bytes || sha(prior) !== source.before.sha256 ||
    apply(prior.toString(), source.edits.map((e) => [e.before, e.after] as const)) !== live.toString() ||
    source.preserved.some((text) => !prior.includes(text) || !live.includes(text))) throw new Error(drift);
  return prior;
}
const cache = new Map<string, Buffer>();
export function uiRepairPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pin = successors.get(ref.path);
  if (!pin || live.length !== pin[0] || sha(live) !== pin[1] || (ref.bytes === live.length && ref.sha256 === pin[1])) return live;
  const bytes = readFileSync(join(root, UI_REPAIR_REVIEW_FILE));
  if (bytes.length !== reviewPin.bytes || sha(bytes) !== reviewPin.sha256) throw new Error(drift);
  const key = `${root}\0${ref.path}\0${sha(bytes)}`;
  let prior = cache.get(key);
  if (!prior) {
    const review = JSON.parse(bytes.toString()) as UiRepairReview;
    if (review.schemaVersion !== 'shared-ui-repair-continuity-v1' || !review.reviewedBy ||
      !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now() ||
      review.sources.length !== successors.size || new Set(review.sources.map((s) => s.after.path)).size !== successors.size ||
      review.sources.some((s) => JSON.stringify(successors.get(s.after.path)) !== JSON.stringify([s.after.bytes, s.after.sha256]))) throw new Error(drift);
    prior = verifyUiRepairSource(review.sources.find((s) => s.after.path === ref.path)!, live);
    cache.set(key, prior);
  }
  return Buffer.from(prior);
}
