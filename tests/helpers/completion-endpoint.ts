/** Finite current successors of the historical article approval chains. */
import type { ApprovedDelta, BaselineKind } from '../../lib/brand-v2-baseline';
import { completionApprovalReview, verifyCompletionApprovals } from './completion-approvals';

export function beforeCompletionApprovals(entries: readonly ApprovedDelta[]): ApprovedDelta[] {
  verifyCompletionApprovals(entries);
  return entries.slice(0, completionApprovalReview().before.entries);
}

export function completionEndpoint(entries: readonly ApprovedDelta[], manifest: BaselineKind,
  memberId: string, historicalEndpoint: string): string {
  let endpoint = historicalEndpoint;
  for (const edge of verifyCompletionApprovals(entries).filter(entry => entry.manifest === manifest && entry.memberId === memberId)) {
    if (edge.oldHash !== endpoint && !edge.reconciles?.some(binding => binding.newHash === endpoint)) {
      throw new Error(`Completion endpoint does not continue ${manifest}:${memberId}`);
    }
    endpoint = edge.newHash;
  }
  return endpoint;
}
