/** Exact later approvals, separate from the historical transactions they continue. */
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { sha256, stableJson, validateApprovedDeltas, type ApprovedDelta } from '../../lib/brand-v2-baseline';

export const COMPLETION_APPROVAL_REVIEW = 'audit/evidence/mission-completion-20261102/approval-suffix.json';
const pin = { bytes: 2990571, sha256: 'f57ff5700460cc613a949869ced663b38041e64267d7078bf87790c7321c69f9' };
export type CompletionApprovalReview = {
  schemaVersion: string;
  historicalRequest: string[];
  before: { entries: number; sha256: string };
  added: ApprovedDelta[];
  rationale: string;
};

export function completionApprovalReview(): CompletionApprovalReview {
  const bytes = readFileSync(COMPLETION_APPROVAL_REVIEW);
  if (bytes.length !== pin.bytes || sha256(bytes) !== pin.sha256) throw new Error('Completion approval review drift');
  const review = JSON.parse(bytes.toString()) as CompletionApprovalReview;
  if (review.schemaVersion !== 'completion-approval-suffix-v1' || review.before.entries !== 4688 ||
    review.added.length !== 906 || review.rationale.length < 100) throw new Error('Completion approval scope drift');
  return review;
}

export function verifyCompletionApprovals(entries: readonly ApprovedDelta[], review = completionApprovalReview()): ApprovedDelta[] {
  const before = entries.slice(0, review.before.entries);
  const added = entries.slice(review.before.entries);
  if (entries.length !== review.before.entries + review.added.length ||
    sha256(stableJson(JSON.parse(JSON.stringify(before)))) !== review.before.sha256 || !isDeepStrictEqual(added, review.added) ||
    validateApprovedDeltas(entries).length > 0) throw new Error('Completion approval inventory drift');
  return [...added];
}

const added = completionApprovalReview().added;
export const COMPLETION_APPEND_IDS = added.map((entry) => entry.id);
const byMember = new Map<string, string[]>();
for (const entry of added) {
  const key = `${entry.manifest}\0${entry.memberId}`;
  byMember.set(key, [...(byMember.get(key) ?? []), entry.id]);
}
export const completionEdges = (manifest: string, memberId: string): string[] =>
  [...(byMember.get(`${manifest}\0${memberId}`) ?? [])];
