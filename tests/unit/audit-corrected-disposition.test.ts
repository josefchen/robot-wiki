import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { parseLedger } from '../../lib/audit-ledger';
import { loadLocalBasisContext, validateLocalBasisPlan } from '../../lib/audit-local-basis';
import { parseCorrectedDispositions, validateCorrectedDisposition } from '../../lib/audit-corrected-disposition';

const root = process.cwd();
const ids = new Set(CITATIONS.map(c => c.id));
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const localBasis = loadLocalBasisContext(root, publishedModules().map(m => `/${m.domain}/${m.slug}/`));
const correctedDispositions = { root,
  records: parseCorrectedDispositions(read('audit/evidence/industrial-closure-20260923/corrections.json')) };
const context = { localBasis, correctedDispositions, compoundPlans: read('audit/compound-evidence.json') };
const rows = parseLedger('audit/data-hardware.md', readFileSync('audit/data-hardware.md', 'utf8'), ids, context)
  .find(s => s.slug === 'industrial-deployment')!.claimRecords;
const scalar = { citationId: '', sourceUrl: '', supportingPassage: '' };

describe('finite industrial correction evidence', () => {
  it('closes exactly the eight selected industrial records with full evidence', () => {
    expect(rows).toHaveLength(52);
    for (const ordinal of [9, 10, 31, 32, 33, 37, 47, 48]) {
      expect(rows[ordinal - 1].evidenceFailures, `original${ordinal}`).toEqual([]);
      expect(rows[ordinal - 1].outcome).toBe('passing');
    }
    expect(correctedDispositions.records.map(r => r.rowOrdinal)).toEqual([37, 47, 48]);
    expect(rows[31].localBasis?.kind).toBe('mixed-local');
  });
  it('does not convert missing correction context to scalar or cut-label success', () => {
    const missing = parseLedger('audit/data-hardware.md', readFileSync('audit/data-hardware.md', 'utf8'), ids,
      { ...context, correctedDispositions: undefined }).find(s => s.slug === 'industrial-deployment')!;
    for (const ordinal of [37, 47, 48]) expect(missing.claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
  });
  it('rejects a compound plan that shadows a finite correction target', () => {
    const duplicate = { ...context.compoundPlans[0], id: 'shadow-correction', ledgerPath: 'audit/data-hardware.md', articleSlug: 'industrial-deployment', rowOrdinal: 37 };
    expect(() => parseLedger('audit/data-hardware.md', readFileSync('audit/data-hardware.md', 'utf8'), ids,
      { ...context, compoundPlans: [...context.compoundPlans, duplicate] })).toThrow('duplicate correction/cross-catalog target');
  });
  it('keeps ledger-only withdrawal distinct from article removal', () => {
    const withdrawal = correctedDispositions.records.find(r => r.rowOrdinal === 47)!;
    expect(withdrawal.kind).toBe('withdrawn-audit-certification');
    expect(withdrawal.requiredAbsent).toEqual([]);
    expect(withdrawal.originalCells.claim).toBe('Every `<Term>` id used resolves in the glossary');
  });
  for (const mutation of ['current', 'snapshot', 'hash', 'review', 'kind', 'missing-child', 'child-digest']) {
    it(`rejects stale/missing P4 ${mutation}`, () => {
      const p = structuredClone(correctedDispositions.records.find(r => r.rowOrdinal === 48)!);
      if (mutation === 'current') p.currentCells.claim += ' changed';
      if (mutation === 'snapshot') p.originalTupleDigest = '0'.repeat(64);
      if (mutation === 'hash') p.execution.sha256 = '0'.repeat(64);
      if (mutation === 'review') p.review.inputDigest = '0'.repeat(64);
      if (mutation === 'kind') p.kind = 'removed-assertion';
      if (mutation === 'missing-child') p.children.pop();
      if (mutation === 'child-digest') p.children[0].digest = '0'.repeat(64);
      expect(validateCorrectedDisposition(p, rows[47], p.id, rows, correctedDispositions).length).toBeGreaterThan(0);
    });
  }
  it('requires supported external AND local children, never calculator-only P4', () => {
    const p = correctedDispositions.records.find(r => r.rowOrdinal === 48)!;
    for (const index of [0, 8, 30, 31, 32, 36, 46, 51]) {
      const broken = [...structuredClone(rows)];
      broken[index] = { ...broken[index], evidenceFailures: ['unresolved dependency'] };
      expect(validateCorrectedDisposition(p, rows[47], p.id, broken, correctedDispositions).length).toBeGreaterThan(0);
    }
  });
  for (const mutation of ['source', 'model', 'control', 'basis', 'result', 'observation', 'review', 'proof']) {
    it(`rejects incomplete typed ${mutation}`, () => {
      const ctx = structuredClone(localBasis);
      const ordinal = mutation === 'source' ? 32 : 9;
      const p = ctx.catalog.plans.find(p => p.id === `industrial-closure-${ordinal}-20260923`)!;
      const proof = ctx.catalog.proofs.find(proof => proof.planId === p.id && proof.kind === 'derived-result')!;
      if (mutation === 'source') p.evidence[0].citationId = 'nasa-availability-prediction-analysis';
      if (mutation === 'model') proof.artifacts.find(a => a.file.path === 'lib/deployment-economics.ts')!.file.sha256 = '0'.repeat(64);
      if (mutation === 'control') p.mounts[0].mountFingerprint = '0'.repeat(64);
      if (mutation === 'basis') proof.bases = [];
      if (mutation === 'result') proof.expected.values = { invented: 1 };
      if (mutation === 'observation') {
        const observed = ctx.catalog.proofs.find(proof => proof.planId === p.id && proof.kind === 'observed-behavior')!;
        if (observed.kind === 'observed-behavior') observed.observations[0].readouts[0].text = 'invented';
      }
      if (mutation === 'review') p.adjudications[0].inputDigest = '0'.repeat(64);
      if (mutation === 'proof') ctx.catalog.proofs = ctx.catalog.proofs.filter(proof => proof.id !== `i${ordinal}-parameters`);
      expect(validateLocalBasisPlan(p, p.currentCells, p.id, scalar, ids, ctx).failures.length).toBeGreaterThan(0);
    });
  }
});
