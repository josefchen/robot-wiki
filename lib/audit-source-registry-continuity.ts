/** Preserve prior citation proof inputs after individually reviewed additions. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { readCitationRegistrySource } from './citation-registry-source.ts';
import { sourceKey } from './citation-source-key.ts';
import type { Citation } from '../data/schemas/citation.ts';

export const SOURCE_REGISTRY_REVIEW_FILE = 'audit/evidence/source-floor-20261102/registry-transition.json';
const path = 'data/citations.ts';
const drift = 'source registry continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
type Artifact = { path: string; bytes: number; sha256: string };
export type SourceRegistryChange = { id: string; before: Citation; after: Citation; reason: string; sourceUrl: string };
export type SourceRegistryReview = {
  schemaVersion: 'source-registry-continuity-v1';
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: { before: string; after: string }[];
  changes: SourceRegistryChange[];
  reviewedBy: string;
  rationale: string;
  observedAt: string;
};
// BEGIN source registry pins (written by scripts/record-source-registry-continuity.ts)
const reviewPin = { bytes: 82970, sha256: '76e6fdf227b44bc11cf80e51ee7f2e33f19a436f1d107d81a8a41090930b7201' };
const successor = { bytes: 1068997, sha256: 'dda6eaed490f46b8f53f55fe2732b3c360a2b65d11b96daa3a047412c5555f77' };
// END source registry pins

const equal = isDeepStrictEqual;
export function keepsSourceRegistryObligations(prior: string, current: string, changes: readonly SourceRegistryChange[]): boolean {
  const before = readCitationRegistrySource(prior);
  const after = readCitationRegistrySource(current);
  if (new Set(changes.map((change) => change.id)).size !== changes.length) return false;
  const currentById = new Map(after.map((entry) => [entry.id, entry]));
  const priorIds = new Set(before.map((entry) => entry.id));
  const keys = new Set(before.map(sourceKey));
  for (const entry of after.filter((entry) => !priorIds.has(entry.id))) {
    const key = sourceKey(entry);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  let changed = 0;
  for (const entry of before) {
    const updated = currentById.get(entry.id);
    if (!updated) return false;
    if (equal(entry, updated)) continue;
    changed++;
    const review = changes.find((change) => change.id === entry.id);
    if (!review || !equal(review.before, entry) || !equal(review.after, updated) ||
      review.sourceUrl !== updated.url || review.reason.length < 80) return false;
    // This pass corrects an undated page or records its actual fresh access.
    // It does not silently alter authors, source identity, titles or URLs.
    const { year: _a, accessedOn: _b, ...oldIdentity } = entry;
    const { year: _c, accessedOn: _d, ...newIdentity } = updated;
    void _a; void _b; void _c; void _d;
    if (!equal(oldIdentity, newIdentity) || updated.year !== 'n.d.' || !updated.accessedOn) return false;
  }
  return changed === changes.length;
}

function apply(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    result = parts.join(to);
  }
  return result;
}
export function verifySourceRegistryReview(review: SourceRegistryReview, live: Buffer): Buffer {
  if (review.schemaVersion !== 'source-registry-continuity-v1' || !/^[a-f0-9]{40}$/.test(review.archivedFrom) ||
    review.after.path !== path || review.before.path !== path || live.length !== review.after.bytes || digest(live) !== review.after.sha256 ||
    !review.edits.length || review.edits.some((e) => !e.before || !e.after || e.before === e.after) ||
    review.rationale.length < 100 || !review.reviewedBy || !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) throw new Error(drift);
  const prior = Buffer.from(apply(live.toString(), review.edits.map((e) => [e.after, e.before] as const).reverse()));
  if (prior.length !== review.before.bytes || digest(prior) !== review.before.sha256 ||
    apply(prior.toString(), review.edits.map((e) => [e.before, e.after] as const)) !== live.toString() ||
    !keepsSourceRegistryObligations(prior.toString(), live.toString(), review.changes)) throw new Error(drift);
  return prior;
}

const cache = new Map<string, Buffer>();
export function sourceRegistryPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  if (ref.path !== path || live.length !== successor.bytes || digest(live) !== successor.sha256 ||
    (ref.bytes === live.length && ref.sha256 === successor.sha256)) return live;
  const bytes = readFileSync(join(root, SOURCE_REGISTRY_REVIEW_FILE));
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256) throw new Error(drift);
  const key = `${root}\0${digest(bytes)}`;
  let prior = cache.get(key);
  if (!prior) {
    prior = verifySourceRegistryReview(JSON.parse(bytes.toString()), live);
    cache.set(key, prior);
  }
  return Buffer.from(prior);
}
