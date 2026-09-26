import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256, type ApprovedDelta, type BaselineBundle, type BaselineKind } from '../../../lib/brand-v2-baseline';
import { neutralizeHistory } from '../../../lib/neutral-tooling';
import { parseLedger, originalClaimDigest, compoundPlanDigest, compoundPartDigest } from '../../../lib/audit-ledger';
import { localPartDigest, localPlanDigest, parseOriginalLedgerSection, type LocalPlan, type LocalProof } from '../../../lib/audit-local-basis';
import { CITATIONS } from '../../../data/citations';

/**
 * The 2026-09-22 integration merged the continuation branch (afeeb05)
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
 * A member moved again after the integration keeps that re-anchor as the
 * record of the merged value and gains a later re-anchor from the same sealed
 * hash to the new HEAD value (see LATER_REANCHOR_PREFIXES).
 *
 * These helpers only read history and committed files; the assertions stay
 * in the tests that own them.
 */
const root = resolve(import.meta.dirname, '../../..');

export const PRODUCTION_BASE = '3023260e9af12aa12057a3f6441b3605e4e860ff';
export const TRUE_MERGE_BASE = '9212034bfa51823120572c92521c31dd10966f5e';
export const REANCHOR_PREFIX = 'continuation-merge-20260922-';
const LEDGER_PATH = 'contract/brand-v2-approved-deltas.json';

const ledgerRowsCache = new Map<string, unknown[]>();

/** Historical ledger rows under the neutral vocabulary, one parse per ref. */
function historyLedgerRows(commit: string, ledgerPath: string): unknown[] {
  const key = `${commit}:${ledgerPath}`;
  let rows = ledgerRowsCache.get(key);
  if (!rows) {
    const markdown = neutralizeHistory(execFileSync('git', ['show', `${commit}:${ledgerPath}`], {
      cwd: root, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024,
    }));
    const sections = parseLedger(ledgerPath, markdown, new Set(CITATIONS.map(({ id }: { id: string }) => id)), {});
    rows = sections.flatMap((section: { slug: string; claimRecords: readonly unknown[] }) =>
      section.claimRecords.map((record) => ({ slug: section.slug, record })));
    ledgerRowsCache.set(key, rows);
  }
  return rows;
}

const localBasisFileCache = new Map<string, string | null>();

/** A tracked file's bytes at `commit`, rendered with the neutral vocabulary. */
function committedAt(commit: string, filePath: string): string | null {
  const key = `${commit}:${filePath}`;
  let text = localBasisFileCache.get(key);
  if (text === undefined) {
    try {
      text = neutralizeHistory(execFileSync('git', ['show', `${commit}:${filePath}`], {
        cwd: root, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024,
      }));
    } catch {
      text = null;
    }
    localBasisFileCache.set(key, text);
  }
  return text ?? null;
}

let currentLocalBasis: { plans: LocalPlan[]; proofs: LocalProof[] } | null | undefined;
/** Today's catalog: artifact pins under the neutral vocabulary. */
function todayLocalBasis(): { plans: LocalPlan[]; proofs: LocalProof[] } | null {
  if (currentLocalBasis === undefined) {
    try {
      currentLocalBasis = JSON.parse(readFileSync(resolve(root, 'audit/local-basis.json'), 'utf8'));
    } catch {
      currentLocalBasis = null;
    }
  }
  return currentLocalBasis ?? null;
}

/**
 * A historical local-basis catalog under the neutral vocabulary: like the
 * compound catalog, its recorded digests pin cell and artifact text, so the
 * rendered catalog recomputes them over the rendered same-revision sources.
 * Artifact and run pins describe present-day files, so they adopt today's
 * regenerated pin values for the same proof identities.
 */
function renderLocalBasis(commit: string, rendered: string): string {
  const today = todayLocalBasis();
  const todayProofs = new Map((today?.proofs ?? []).map((proof) => [proof.id, proof]));
  const lb = JSON.parse(rendered) as { plans: LocalPlan[]; proofs: LocalProof[] };
  const snapshots = new Map<string, ReturnType<typeof parseOriginalLedgerSection> | null>();
  for (const plan of lb.plans) {
    const row = (historyLedgerRows(commit, plan.ledgerPath) as { slug: string; record: {
      claim: string; sourceChecked: string; verdict: string; note: string;
    } }[]).filter((entry) => entry.slug === plan.articleSlug)[plan.rowOrdinal - 1]?.record;
    if (row) {
      const cells = { claim: row.claim, sourceChecked: row.sourceChecked, verdict: row.verdict, note: row.note };
      plan.currentCells = cells as LocalPlan['currentCells'];
      plan.currentTupleDigest = originalClaimDigest(row);
    }
    const snapshotPath = (plan.originalBinding as unknown as { snapshot: { path: string } }).snapshot.path;
    // Cache per ledger and slug: different plans share one snapshot file but
    // bind different sections of it.
    const sectionKey = `${plan.ledgerPath}\u0000${plan.articleSlug}\u0000${snapshotPath}`;
    let section: ReturnType<typeof parseOriginalLedgerSection> | null = snapshots.get(sectionKey) ?? null;
    if (!section) {
      const snapshot = committedAt(commit, snapshotPath);
      section = snapshot
        ? parseOriginalLedgerSection(plan.ledgerPath, plan.articleSlug, snapshot)
        : null;
      snapshots.set(sectionKey, section);
    }
    const original = section?.claimRecords[plan.rowOrdinal - 1];
    if (original) {
      const binding = plan.originalBinding as unknown as {
        originalCells: { claim: string; sourceChecked: string; verdict: string; note: string };
        originalTupleDigest: string;
      };
      binding.originalCells = {
        claim: original.claim, sourceChecked: original.sourceChecked,
        verdict: original.verdict, note: original.note,
      };
      binding.originalTupleDigest = originalClaimDigest({
        claim: original.claim, sourceChecked: original.sourceChecked,
        verdict: original.verdict, note: original.note,
      });
    }
  }
  for (const proof of lb.proofs as unknown as Array<{
    id: string; planId: string; currentTupleDigest: string; originalTupleDigest: string;
    input: { path: string; bytes: number; sha256: string };
    output: { path: string; bytes: number; sha256: string };
    inputDigest: string; outputDigest: string;
  }>) {
    const plan = lb.plans.find(p => p.id === proof.planId);
    if (plan) {
      proof.currentTupleDigest = plan.currentTupleDigest;
      proof.originalTupleDigest = (plan.originalBinding as unknown as { originalTupleDigest: string }).originalTupleDigest;
    }
    const todayProof = todayProofs.get(proof.id) as unknown as {
      input: typeof proof.input; output: typeof proof.output;
      inputDigest: string; outputDigest: string; artifacts: unknown;
      provenance: { receipt: unknown };
    } | undefined;
    if (todayProof) {
      proof.input = todayProof.input;
      proof.inputDigest = todayProof.inputDigest;
      proof.output = todayProof.output;
      proof.outputDigest = todayProof.outputDigest;
      (proof as unknown as { artifacts: unknown }).artifacts = todayProof.artifacts;
      ((proof as unknown as { provenance: { receipt: unknown } }).provenance).receipt = todayProof.provenance.receipt;
      continue;
    }
    const input = committedAt(commit, proof.input.path);
    if (input !== null) {
      proof.inputDigest = sha256(input);
      proof.input.bytes = Buffer.byteLength(input, 'utf8');
      proof.input.sha256 = proof.inputDigest;
    }
    const output = committedAt(commit, proof.output.path);
    if (output !== null) {
      proof.outputDigest = sha256(output);
      proof.output.bytes = Buffer.byteLength(output, 'utf8');
      proof.output.sha256 = proof.outputDigest;
    }
  }
  for (const plan of lb.plans) {
    const proofs = lb.proofs.filter(p => p.planId === plan.id);
    if (plan.planReview) plan.planReview.inputDigest = localPlanDigest(plan);
    for (const adjudication of plan.adjudications ?? []) {
      adjudication.inputDigest = localPartDigest(plan, adjudication.partId, proofs);
    }
    for (const review of [plan.planReview, ...(plan.adjudications ?? [])]) {
      const event = (review as unknown as { event?: { path: string; bytes: number; sha256: string } })?.event;
      if (!event) continue;
      // Event files are retained run records: the working tree holds the
      // retained bytes, so a render pins the present-day file rather than
      // re-deriving a byte variant of the historical run.
      try {
        const current = readFileSync(resolve(root, event.path));
        event.bytes = current.length;
        event.sha256 = sha256(current);
      } catch { /* retained file absent: keep the recorded pin */ }
    }
  }
  return JSON.stringify(lb, null, 2) + '\n';
}

const renderedCache = new Map<string, string>();

export function showAt(commit: string, path: string): string {
  const cacheKey = `${commit}:${path}`;
  const cached = renderedCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const committed = execFileSync('git', ['show', `${commit}:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  // Historical revisions keep their original spelling; the neutral-tooling
  // vocabulary renders them the way the repository spells the same
  // identifiers today (see lib/neutral-tooling.ts). Comparisons below stay
  // byte-for-byte against that rendering, never against raw history.
  const rendered = neutralizeHistory(committed);
  if (path === 'audit/local-basis.json') {
    renderedCache.set(cacheKey, renderLocalBasis(commit, rendered));
    return renderedCache.get(cacheKey)!;
  }
  if (path !== 'audit/compound-evidence.json') { renderedCache.set(cacheKey, rendered); return rendered; }
  // Review digests pin the cell text they were computed over, so a rendered
  // catalog also carries digests recomputed over the rendered cells.
  const plans = JSON.parse(rendered);
  for (const plan of plans) {
    const row = (historyLedgerRows(commit, plan.ledgerPath) as { slug: string; record: {
      claim: string; sourceChecked: string; verdict: string; note: string;
    } }[]).filter((entry) => entry.slug === plan.articleSlug)[plan.rowOrdinal - 1]?.record;
    if (!row) continue;
    plan.originalCellsDigest = originalClaimDigest(row);
    for (const adjudication of plan.adjudications ?? []) {
      adjudication.evidenceDigest = compoundPartDigest(plan, adjudication.partId);
    }
    if (plan.planReview) plan.planReview.planDigest = compoundPlanDigest(plan);
  }
  const out = JSON.stringify(plans);
  renderedCache.set(cacheKey, out);
  return out;
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

/**
 * The 2026-09-22 integration commit. The brand-v2 evidence committed with it
 * observed each re-anchored member's merged value on the integrated tree.
 */
export const INTEGRATION_COMMIT = 'ab5437b35478893adc972add9d3f24736e4f128d';

/**
 * Later integrations that move a member the 2026-09-22 integration
 * re-anchored. Each appends its own re-anchor after the ledger it found, from
 * the same sealed hash to its own HEAD value, and leaves the continuation
 * re-anchor in place as the record of the merged value.
 *
 * - `content-integration-20260923-`: release/seo-content-fixes onto 754ae58
 *   registered llama-3-herd-2024 and shiu-ahmad-1989, which moved
 *   `citation-rendering:label-and-meta`.
 */
export const LATER_REANCHOR_PREFIXES = [
  'content-integration-20260923-',
  'continuation-merge-2026-09-23-',
  'continuation-merge-2026-09-24-',
  'main-merge-20260924-',
  'humanizer-manipulation-v3-20260925-',
  'expo-ft-intake-20260925-',
  'instrument-migration-20260926-',
] as const;

let integratedObservations: Map<string, string | undefined> | undefined;

/**
 * A member's merged value at the integration commit, as that commit's own
 * committed evidence observed it (not as the ledger claims it).
 */
export function integratedHash(kind: BaselineKind, memberId: string): string | undefined {
  integratedObservations ??= new Map(
    (
      JSON.parse(showAt(INTEGRATION_COMMIT, 'evidence/brand-v2/results.json')) as {
        results: Array<{ resultId: string; payload?: { observed?: { currentHash?: string } } }>;
      }
    ).results.map((row) => [row.resultId, row.payload?.observed?.currentHash]),
  );
  return integratedObservations.get(`result:VAL-B2-BASE-002:${kind}:${memberId}`);
}

/**
 * The re-anchor that brackets a re-anchored member at HEAD: the last
 * continuation or later-integration re-anchor for it, in ledger order.
 */
export function headReanchorFor(
  approvals: readonly ApprovedDelta[],
  kind: BaselineKind,
  memberId: string,
): ApprovedDelta | undefined {
  return approvals.findLast(
    (entry) =>
      [REANCHOR_PREFIX, ...LATER_REANCHOR_PREFIXES].some((prefix) => entry.id.startsWith(prefix)) &&
      entry.manifest === kind &&
      entry.memberId === memberId,
  );
}
