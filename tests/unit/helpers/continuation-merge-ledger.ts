import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256, type ApprovedDelta, type BaselineBundle, type BaselineKind } from '../../../lib/brand-v2-baseline';

/**
 * The 2026-09-22 integration merged josef/droid-wiki-continuation (afeeb05)
 * into the production line (main's tree at 3023260) against the true merge
 * base 9212034. Continuation lane tests pinned their approved-delta prefix
 * and member endpoints to lane-local history. On the integrated line:
 *
 * - the production ledger at 3023260 is an exact, unchanged prefix;
 * - continuation-only entries follow it, unchanged and in lane order;
 * - a member that both lines changed carries one `continuation-merge-20260922-*`
 *   delta from its sealed baseline hash to the merged hash, because each
 *   lane's own approval only brackets that lane's endpoint.
 *
 * These helpers only read history and committed files; the assertions stay
 * in the tests that own them.
 */
const root = resolve(import.meta.dirname, '../../..');

export const PRODUCTION_BASE = '3023260e9af12aa12057a3f6441b3605e4e860ff';
export const TRUE_MERGE_BASE = '9212034bfa51823120572c92521c31dd10966f5e';
export const REANCHOR_PREFIX = 'continuation-merge-20260922-';
const LEDGER_PATH = 'contract/brand-v2-approved-deltas.json';

export function showAt(commit: string, path: string): string {
  return execFileSync('git', ['show', `${commit}:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
}

export function ledgerAt(commit: string): ApprovedDelta[] {
  return (JSON.parse(showAt(commit, LEDGER_PATH)) as { entries: ApprovedDelta[] }).entries;
}

/**
 * Where a lane snapshot's continuation-only entries sit on the merged ledger.
 * `start` is the index at which the lane's next appended entries must follow.
 */
export function laneWindow(laneSnapshot: readonly ApprovedDelta[]): {
  production: ApprovedDelta[];
  shared: ApprovedDelta[];
  laneOnly: ApprovedDelta[];
  start: number;
} {
  const production = ledgerAt(PRODUCTION_BASE);
  const productionIds = new Set(production.map((entry) => entry.id));
  const shared = laneSnapshot.filter((entry) => productionIds.has(entry.id));
  const laneOnly = laneSnapshot.filter((entry) => !productionIds.has(entry.id));
  return { production, shared, laneOnly, start: production.length + laneOnly.length };
}

/** The sealed baseline hash of one member, or the missing-member sentinel. */
export function sealedHash(kind: BaselineKind, memberId: string): string {
  const baseline = JSON.parse(
    readFileSync(resolve(root, 'evidence/brand-v2/baseline/baseline.json'), 'utf8'),
  ) as BaselineBundle;
  return (
    baseline.manifests[kind]?.members.find((member) => member.id === memberId)?.hash ??
    sha256('missing')
  );
}

/** The integration re-anchor delta for a member both lines changed, if any. */
export function reanchorFor(
  approvals: readonly ApprovedDelta[],
  kind: BaselineKind,
  memberId: string,
): ApprovedDelta | undefined {
  return approvals.find(
    (entry) =>
      entry.id.startsWith(REANCHOR_PREFIX) &&
      entry.manifest === kind &&
      entry.memberId === memberId,
  );
}
