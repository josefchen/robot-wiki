import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { committedText } from '../helpers/editorial-current-context';
import { CITATIONS } from '../../data/citations.ts';
import { committedSource } from '../helpers/continuation-integration';
import { currentAuditContext } from '../helpers/residual-integration';
import {
  classifyVerdict,
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
  type ClaimRecord,
  type CompoundPlan,
} from '../../lib/audit-ledger.ts';

const ledger = readFileSync('audit/classical.md', 'utf8');
const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const registry = new Set(CITATIONS.map(({ id }) => id));
const targets = [
  {
    slug: 'motion-planning', ordinal: 5, planId: 'rrt-hierarchy-20260914-motion-5',
    verdict: 'C', oldVerdict: 'unresolved',
    oldDigest: 'f26fcfa567d6325117c455935705558cec0443efcee3c2886a08fd780e8529c8',
    newDigest: 'b5b8a0f6c96f82e6c801e5821006f452c6a68389d2e8c4d41b27d44e8881e220',
    parts: ['report-identity', 'report-date', 'sample-nearest-control',
      'local-feasibility', 'equation-correction', 'book-formulation-difference',
      'state-glossary-coupling'],
  },
  {
    slug: 'perception', ordinal: 24, planId: 'perception-depth-specifications-24-source-20260913',
    verdict: 'C (evidence-limited cut)', oldVerdict: 'X',
    oldDigest: '5d7c41597e4e37d03ff23cf21c0b480693fdb09f21e923c2d7edd94f1075f1c6',
    newDigest: 'a1eb1c73e08402f5de11957ce3771978b3f53cbb0657feea6329be284a9681df',
    parts: ['cut-unsupported-page-attribution'],
  },
] as const;
type Target = typeof targets[number];
type Cells = Pick<ClaimRecord, 'claim' | 'sourceChecked' | 'verdict' | 'note'>;
type HistoryRecord = {
  originalId: string;
  oldCells: Cells;
  newCells: Cells;
  priorPlan: CompoundPlan;
};

function plan(target: Target) {
  const result = catalog.find(({ id }) => id === target.planId);
  assert.ok(result);
  return result;
}

function record(target: Target, supplied = catalog) {
  return parseLedger('audit/classical.md', ledger, registry, { compoundPlans: supplied })
    .find(({ slug }) => slug === target.slug)!.claimRecords[target.ordinal - 1];
}

function history(target: Target): HistoryRecord {
  const section = ledger.split('## 2026-09-21 verdict-pair reconciliation history\n')[1];
  assert.ok(section, 'the exact pre-change cells and reviews must be archived');
  const match = /```json\n([\s\S]*?)\n```/.exec(section);
  assert.ok(match);
  const archived = JSON.parse(match[1]) as { schema: string; records: HistoryRecord[] };
  assert.equal(archived.schema, 'robot-wiki-verdict-pair-history-v1');
  const result = archived.records.find(({ originalId }) =>
    originalId === `audit/classical.md:${target.slug}:${target.ordinal}`);
  assert.ok(result);
  return result;
}

function fullAndContract(target: Target, candidate: CompoundPlan) {
  assert.deepEqual(candidate.parts.map(({ id }) => id), [...target.parts]);
  assert.deepEqual(candidate.parts, history(target).priorPlan.parts);
  assert.deepEqual(candidate.evidence, history(target).priorPlan.evidence);
  assert.equal(candidate.evidence.length, target.parts.length);
}

describe('two source-backed verdict reconciliations, not structural completions', () => {
  for (const target of targets) {
    it(`${target.slug}:${target.ordinal} closes only the corrected current outcome`, () => {
      const current = record(target);
      expect(current.verdict).toBe(target.verdict);
      expect(current.outcome).toBe('passing');
      expect(originalClaimDigest(current)).toBe(target.newDigest);
      expect(current.evidenceFailures).toEqual([]);
    });

    it(`${target.slug}:${target.ordinal} preserves exact old cells and the whole old note`, () => {
      const archived = history(target);
      const current = record(target);
      expect(originalClaimDigest(archived.oldCells)).toBe(target.oldDigest);
      expect(archived.oldCells.verdict).toBe(target.oldVerdict);
      expect(originalClaimDigest(archived.newCells)).toBe(target.newDigest);
      expect(current.claim).toBe(archived.oldCells.claim);
      expect(current.sourceChecked).toBe(archived.oldCells.sourceChecked);
      expect(current.note.startsWith(archived.oldCells.note)).toBe(true);
      expect(current.note).toContain('Verdict reconciliation:');
    });

    it(`${target.slug}:${target.ordinal} carries fresh reviews of every unchanged AND part`, () => {
      const current = plan(target);
      const prior = history(target).priorPlan;
      fullAndContract(target, current);
      expect(current.originalCellsDigest).toBe(target.newDigest);
      expect(current.planReview?.planDigest).toBe(compoundPlanDigest(current));
      expect(current.planReview?.reviewedBy).toContain('verdict-pair reconciliation');
      expect(current.planReview?.reviewedBy).not.toBe(prior.planReview?.reviewedBy);
      expect(current.adjudications.map(({ partId }) => partId)).toEqual([...target.parts]);
      for (const review of current.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(current, review.partId));
        expect(review.reviewedBy).toContain('verdict-pair reconciliation');
        expect(review.rationale.length).toBeGreaterThan(100);
      }
    });

    it(`${target.slug}:${target.ordinal} rejects omission of any actual paired source item`, () => {
      for (const partId of target.parts) {
        const incomplete = structuredClone(plan(target));
        incomplete.evidence = incomplete.evidence.filter(item => item.partId !== partId);
        const supplied = catalog.map(item => item.id === incomplete.id ? incomplete : item);
        expect(record(target, supplied).evidenceFailures.some(failure =>
          failure.includes('coverage must equal every required'))).toBe(true);
      }
    });

    it(`${target.slug}:${target.ordinal} cannot authorize a reduced AND by rehashing`, () => {
      const reduced = structuredClone(plan(target));
      reduced.parts.pop();
      reduced.evidence.pop();
      reduced.adjudications.pop();
      if (reduced.planReview) reduced.planReview.planDigest = compoundPlanDigest(reduced);
      for (const review of reduced.adjudications) {
        review.evidenceDigest = compoundPartDigest(reduced, review.partId);
      }
      expect(() => fullAndContract(target, reduced)).toThrow();
    });

    it(`${target.slug}:${target.ordinal} still fails the historical outcome counterfact`, () => {
      expect(classifyVerdict(target.oldVerdict, {
        source: record(target).sourceChecked, note: record(target).note,
      })).toBe(target.oldVerdict === 'X' ? 'unrecognised' : 'unresolved');
    });
  }

  it('uses the actual October 1998 bibliography, not an unrelated source passage', () => {
    const evidence = plan(targets[0]).evidence;
    const date = evidence.find(({ partId }) => partId === 'report-date')!;
    expect(date.citationId).toBe('lavalle-2006');
    expect(date.supportingPassage).toMatch(/\[103\][\s\S]*Technical Report 98-11[\s\S]*Oct\. 1998/);
    expect(date.supportingPassage).not.toMatch(/Kalos|Whitlock|1986/);
    const wrong = structuredClone(plan(targets[0]));
    wrong.evidence.find(({ partId }) => partId === 'report-date')!.supportingPassage =
      evidence.find(({ partId }) => partId === 'report-identity')!.supportingPassage;
    expect(() => fullAndContract(targets[0], wrong)).toThrow();
  });

  it('preserves the evidence-limited cut without asserting the family claim is false', () => {
    const current = record(targets[1]);
    expect(current.claim).toContain('does not assert the family claim is false');
    expect(current.note).toContain('not verification or refutation');
    expect(current.note).toContain('historical wiki/manual assertions remain unverified leads');
    const page = plan(targets[1]).evidence[0].supportingPassage;
    expect(page).toContain('# PhoXi 3D Scanner L');
    expect(page).toContain('| Calibration accuracy (1 σ) | 0.200 mm |');
    expect(page).not.toMatch(/structured[- ]light/i);
  });

  it('keeps the already-applied reader corrections and their qualifications', () => {
    const motion = readFileSync('content/classical/motion-planning.mdx', 'utf8');
    expect(motion).toContain(String.raw`x_{new} \approx x + f(x,u)\Delta t`);
    expect(motion).toContain('initial obstacle-free construction');
    expect(motion).toContain(`note="Iowa State TR 98-11; date in LaValle's bibliography"`);
    expect(readFileSync('data/glossary.ts', 'utf8')).toContain(
      'A kinodynamic planner can instead use a state that includes both configuration and velocity.',
    );
    const perception = readFileSync('content/classical/perception.mdx', 'utf8');
    expect(perception).not.toContain('Three families of depth sensor');
    expect(perception).toContain('not a family-wide ranking');
    expect(perception).toContain('not establish uniform accuracy throughout that range');
  });

  it('records zero new structural completions while closing the two outcome findings', () => {
    const historical = committedSource('e687718', 'audit/classical.md');
    expect(historical).toContain('- Unresolved or unrecognised verdicts: 0');
    expect(historical).toContain('- Complete evidence records: 176');
    expect(historical).toContain('- Incomplete evidence records: 11');
    const current = parseLedger('audit/classical.md', ledger, registry, currentAuditContext());
    expect(current.flatMap(section => section.summaryFailures)).toEqual([]);
    const beforeClosure = readFileSync('audit/evidence/classical-closure-20260923/classical-before.md', 'utf8');
    expect(beforeClosure).toContain('- Complete evidence records: 177');
    expect(beforeClosure).toContain('- Incomplete evidence records: 10');
    const imported = new Set(['calibration', 'ros2-for-ml-engineers']);
    expect(current.filter(section => !imported.has(section.slug))
      .reduce((n, section) => n + section.claimRecords.filter(r => r.evidenceFailures.length === 0).length, 0)).toBe(187);
    expect(current.find(section => section.slug === 'calibration')?.claimRows).toBe(8);
    expect(current.find(section => section.slug === 'ros2-for-ml-engineers')?.claimRows).toBe(7);
    expect(current.reduce((n, section) => n + section.claimRecords.filter(r => r.evidenceFailures.length === 0).length, 0)).toBe(202);
    // Later checkpoints are prepended above this one, so find it by heading
    // rather than assuming it is still the first block.
    const checkpoint = readFileSync('audit/README.md', 'utf8')
      .split('\n---\n')
      .find((block) => block.includes('## Current checkpoint: two corrected verdict outcomes reconciled (2026-09-21)'));
    expect(checkpoint).toBeDefined();
    expect(checkpoint).toContain('zero new structural completions');
    const historicalCheckpoint = committedText('e687718cd3c2d1c35d3f63b6e296712a5892a9f0', 'audit/classical.md');
    expect(historicalCheckpoint).toContain('- Unresolved or unrecognised verdicts: 0');
    expect(historicalCheckpoint).toContain('- Complete evidence records: 176');
    expect(historicalCheckpoint).toContain('- Incomplete evidence records: 11');
    expect(ledger).toContain('- Complete evidence records: 202');
    expect(committedText('e687718cd3c2d1c35d3f63b6e296712a5892a9f0', 'audit/README.md').split('\n---\n')[0])
      .toContain('zero new structural completions');
    expect(readFileSync('audit/README.md', 'utf8')).toContain('994 complete / 0 incomplete');
  });
});
