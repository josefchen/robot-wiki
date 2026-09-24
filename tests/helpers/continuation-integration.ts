import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

// Historical catalog hashes belong to their original transaction. The finite
// Kroger and Control successors are archived and checked below; other
// legacy-to-typed migrations are verified separately by exact identity.
export function preservedCompoundPacket(ref: string): CompoundPlan[] {
  const path = 'audit/compound-evidence.json';
  const prior: CompoundPlan[] = JSON.parse(committedSource(ref, path));
  const current: CompoundPlan[] = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const successorId = 'datasets-10-robomind-20260916c';
  const successor: CompoundPlan = JSON.parse(committedSource('8f7508b', path))
    .find((plan: CompoundPlan) => plan.id === successorId);
  expect(successor).toBeDefined();
  const archive = readFileSync(resolve(root,
    'audit/evidence/control-citation-closeout-20260924/prior-plans.json'));
  expect(createHash('sha256').update(archive).digest('hex'))
    .toBe('dfcff572c2da8eadbc9bf01b5c620c79ea085592dc38b4defbfecc349cc0ade5');
  const superseded: CompoundPlan[] = JSON.parse(archive.toString());
  expect(superseded.map(p => p.id)).toEqual([
    'control-1-astrom-20260916f', 'control-2-astrom-20260916f',
    'control-3-astrom-20260916f', 'control-c7-lqr-riccati-20260915',
  ]);
  const locallyApproved: CompoundPlan[] = JSON.parse(
    committedSource('addbf58ad4386de53144c30b87d9144019accba2', path),
  );
  const changedC7 = locallyApproved.find(p => p.id === 'control-c7-lqr-riccati-20260915');
  expect(changedC7).toBeDefined();
  const krogerArchive = readFileSync(resolve(root,
    'audit/evidence/citation-closeout-20260924/before-kroger-plans.json'));
  expect(createHash('sha256').update(krogerArchive).digest('hex'))
    .toBe('81e227633c4ffed7ba5e5ed7e2f87fabd81ab4fdb34e68e75552e2ae96fc4090');
  const oldKroger: CompoundPlan[] = JSON.parse(krogerArchive.toString());
  expect(oldKroger.map(p => [p.id, p.rowOrdinal])).toEqual([
    ['industrial-kroger-closures-20260917a', 22],
    ['industrial-kroger-compensation-20260917a', 24],
  ]);
  for (const old of oldKroger) {
    expect(prior.find(p => p.id === old.id)).toEqual(old);
    expect(current.find(p => p.id === old.id)).toEqual(locallyApproved.find(p => p.id === old.id));
  }
  for (const old of superseded) {
    if (old.id.startsWith('control-') && old.id !== 'control-c7-lqr-riccati-20260915') {
      expect(prior.find(p => p.id === old.id)).toEqual(old);
      expect(current.filter(p => p.id === old.id)).toEqual([]);
    } else {
      expect(prior.find(p => p.id === old.id)).toEqual(old);
      expect(current.find(p => p.id === old.id)).toEqual(changedC7);
    }
  }
  const removed = new Set(superseded.slice(0, 3).map(p => p.id));
  const krogerIds = new Set(oldKroger.map(p => p.id));
  const reviewedPrior = prior.filter(p => !removed.has(p.id)).map(plan =>
    plan.id === successorId ? successor :
      plan.id === 'control-c7-lqr-riccati-20260915' || krogerIds.has(plan.id)
        ? locallyApproved.find(p => p.id === plan.id)! : plan);
  preservedLegacySurvivors(reviewedPrior, current);
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
