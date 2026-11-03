import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectBaselineCheckResult, collectBundle } from '../../scripts/brand-v2-baseline';
import type { ApprovedDelta, BaselineBundle } from '../../lib/brand-v2-baseline';
import { completionApprovalReview, verifyCompletionApprovals } from '../helpers/completion-approvals';
import { historicalGit } from '../helpers/historical-git';

const entries = JSON.parse(readFileSync('contract/brand-v2-approved-deltas.json', 'utf8')).entries as ApprovedDelta[];

describe('complete later approval inventory', () => {
  it('retains the independently archived historical prefix and every exact ordered successor', () => {
    const review = completionApprovalReview();
    const prior = JSON.parse(historicalGit(review.historicalRequest, { encoding: 'utf8', neutralVocabulary: true })).entries;
    expect(prior).toHaveLength(4688);
    expect(entries.slice(0, prior.length)).toEqual(prior);
    expect(verifyCompletionApprovals(entries)).toEqual(review.added);
  });

  it('rejects a changed prefix, missing or reordered successors and an unreviewed append', () => {
    const review = completionApprovalReview();
    const changedPrefix = structuredClone(entries);
    changedPrefix[0].reason += ' altered';
    const changedSuccessor = structuredClone(entries);
    changedSuccessor.at(-1)!.newHash = '0'.repeat(64);
    const reordered = [...entries];
    [reordered[review.before.entries], reordered[review.before.entries + 1]] =
      [reordered[review.before.entries + 1], reordered[review.before.entries]];
    for (const changed of [changedPrefix, changedSuccessor, reordered, entries.slice(0, -1),
      [...entries, { ...entries.at(-1)!, id: 'unreviewed-successor' }]]) {
      expect(() => verifyCompletionApprovals(changed)).toThrow(/inventory drift/);
    }
  });

  it('still checks every current baseline member against the complete live approval graph', () => {
    const baseline = JSON.parse(readFileSync('evidence/brand-v2/baseline/baseline.json', 'utf8')) as BaselineBundle;
    const result = collectBaselineCheckResult(baseline, collectBundle(), entries);
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
  }, 20_000);
});
