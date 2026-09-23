import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';
import type { ApprovedDelta } from '../../lib/brand-v2-baseline';
import type { CompoundPlan } from '../../lib/audit-ledger';
import { ledgerAt, showAt } from '../unit/helpers/continuation-merge-ledger';
import { preservedLegacySurvivors } from './audit-plan-history';

const root = resolve(import.meta.dirname, '../..');
export const RELEASE_BASE = '86e3a9b2b4a5c2cbec8e1eebab7cea281e6be57e';
export const CONTINUATION_CHECKPOINT = 'd928b6b76f9e777a3e1aa4af6839723aa6784cf7';

export function committedSource(ref: string, path: string): string {
  return showAt(ref, path);
}

export function committedApprovals(ref: string): ApprovedDelta[] {
  return ledgerAt(ref);
}

// Historical catalog hashes belong to their original transaction. The sole
// in-place successor is the independently tested RoboMIND disclosure. Four
// archived legacy-to-typed migrations are verified separately by exact identity.
export function preservedCompoundPacket(ref: string): CompoundPlan[] {
  const path = 'audit/compound-evidence.json';
  const prior: CompoundPlan[] = JSON.parse(committedSource(ref, path));
  const current: CompoundPlan[] = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const successorId = 'datasets-10-robomind-20260916c';
  const successor: CompoundPlan = JSON.parse(committedSource('8f7508b', path))
    .find((plan: CompoundPlan) => plan.id === successorId);
  expect(successor).toBeDefined();
  preservedLegacySurvivors(prior.map(plan => plan.id === successorId ? successor : plan), current);
  return prior;
}

// The release train preserves main's order, then appends mission-only IDs.
// Historical packet assertions still check every record, without assuming
// that a concurrently maintained branch has the same global ledger positions.
export function preservedApprovalPacket(ref: string): ApprovedDelta[] {
  const prior = committedApprovals(ref);
  const current: ApprovedDelta[] = JSON.parse(readFileSync(
    resolve(root, 'contract/brand-v2-approved-deltas.json'), 'utf8',
  )).entries;
  const main = committedApprovals(RELEASE_BASE);
  const mainById = new Map(main.map(entry => [entry.id, entry]));
  expect(current.slice(0, main.length)).toEqual(main);
  const explicitMainReconciliations = new Set([
    'sweeps-registry-gensim15-20260917-1',
    'sweeps-registry-mp7-20260917-1',
    'single-leftovers-rg6-20260917-1',
  ]);
  for (const entry of prior) {
    const matches = current.filter(candidate => candidate.id === entry.id);
    expect(matches, entry.id).toHaveLength(1);
    expect(matches[0], entry.id).toEqual(
      explicitMainReconciliations.has(entry.id) ? mainById.get(entry.id) : entry,
    );
  }
  return prior;
}
