import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ApprovedDelta } from '../../lib/brand-v2-baseline';
import { beforeCompletionApprovals, completionEndpoint } from '../helpers/completion-endpoint';

const approvals = JSON.parse(readFileSync('contract/brand-v2-approved-deltas.json', 'utf8')).entries as ApprovedDelta[];
const memberId = 'article:data-hardware/datasets';

describe('recorded completion endpoints', () => {
  it('continues the exact retained member endpoint through its reviewed resolution', () => {
    const before = beforeCompletionApprovals(approvals);
    expect(before).toHaveLength(4688);
    const old = before.findLast(edge => edge.manifest === 'prose' && edge.memberId === memberId)!;
    const current = approvals.findLast(edge => edge.manifest === 'prose' && edge.memberId === memberId)!;
    expect(current.id).toMatch(/^completion-article-20261102-prose-/);
    expect(current.newHash).not.toBe(old.newHash);
    expect(completionEndpoint(approvals, 'prose', memberId, old.newHash)).toBe(current.newHash);
    expect(completionEndpoint(approvals, 'routes', 'unreviewed-member', 'unchanged')).toBe('unchanged');
  });

  it('rejects a wrong predecessor, missing suffix member and mutated historical or current edge', () => {
    const before = beforeCompletionApprovals(approvals);
    const old = before.findLast(edge => edge.manifest === 'prose' && edge.memberId === memberId)!;
    expect(() => completionEndpoint(approvals, 'prose', memberId, '0'.repeat(64))).toThrow(/does not continue/);
    expect(() => beforeCompletionApprovals(approvals.slice(0, -1))).toThrow(/inventory drift/);
    for (const index of [0, approvals.length - 1]) {
      const altered = approvals.map((edge, ordinal) => ordinal === index ? { ...edge, newHash: '0'.repeat(64) } : edge);
      expect(() => completionEndpoint(altered, 'prose', memberId, old.newHash)).toThrow(/inventory drift/);
    }
  });
});
