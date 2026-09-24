import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { committedSource } from '../helpers/continuation-integration';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { loadLocalBasisContext, validateLocalBasisPlan, type LocalCatalog } from '../../lib/audit-local-basis';

const checkpoint = '358f5050333386606f041505613e4a65d90dc703';
const previous: LocalCatalog = JSON.parse(committedSource(checkpoint, 'audit/local-basis.json'));
const context = loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`));
const id = 'economics-local-i52-20260923';
const oldPlan = previous.plans.find(p => p.id === id)!;
const plan = context.catalog.plans.find(p => p.id === id)!;
const validate = (ctx = context) => {
  const current = ctx.catalog.plans.find(p => p.id === id)!;
  return validateLocalBasisPlan(current, current.currentCells, current.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' },
    new Set(CITATIONS.map(c => c.id)), ctx);
};

describe('fresh release economics proof preserves immutable history', () => {
  it('archives the exact replaced plan and proofs while preserving every other plan', () => {
    const archive = JSON.parse(readFileSync(
      'audit/evidence/economics-release-20260923/previous-economics-plan-and-proofs.json', 'utf8',
    ));
    expect(archive).toEqual({ plan: oldPlan, proofs: previous.proofs.filter(p => p.planId === id) });
    const priorIds = new Set(previous.plans.map(p => p.id));
    expect(context.catalog.plans.filter(p => p.id !== id && priorIds.has(p.id))).toEqual(previous.plans.filter(p => p.id !== id));
    expect(context.catalog.proofs.filter(p => p.planId !== id && priorIds.has(p.planId))).toEqual(previous.proofs.filter(p => p.planId !== id));
    for (const key of ['originalBinding', 'currentCells', 'currentTupleDigest', 'parts', 'evidence', 'mounts'] as const) {
      expect(plan[key]).toEqual(oldPlan[key]);
    }
  });

  it('binds seven fresh executions in a content-equivalent checkout without claiming independent acceptance', () => {
    expect(validate().failures).toEqual([]);
    const proofs = context.catalog.proofs.filter(p => p.planId === id);
    expect(proofs).toHaveLength(7);
    for (const proof of proofs) {
      // Historical cwd is immutable execution provenance: it records where
      // each fresh run actually happened and is never read or executed by
      // this verifier, so verification stays portable across
      // content-equivalent checkouts instead of demanding that every future
      // verifier live in the recorded execution directory. Equivalence of
      // the recorded execution tree with this checkout is already proven
      // above: validate() re-verifies every pinned dependency identity
      // against bytes this checkout can produce. Only the checker's own
      // absolute/normalized provenance shape is re-asserted here.
      expect(proof.provenance.cwd.startsWith('/')).toBe(true);
      expect(proof.provenance.cwd).not.toContain('\0');
      expect(resolve(proof.provenance.cwd)).toBe(proof.provenance.cwd);
      expect(proof.provenance.receipt.path).toContain('economics-release-20260923/');
      expect(proof.provenance.test.path).toContain('economics-release-evidence');
      expect(Date.parse(proof.provenance.startedAt)).toBeGreaterThan(
        Date.parse(previous.proofs.find(p => p.id === proof.id)!.provenance.endedAt),
      );
    }
    expect(plan.planReview?.reviewedBy).toContain('not independent Mission acceptance');
  });

  it.each(['disclosure', 'old-proof', 'missing-proof', 'changed-recipe', 'lost-review'])(
    'rejects the changed-input proof defect %s', mutation => {
      const broken = structuredClone(context);
      const selected = broken.catalog.plans.find(p => p.id === id)!;
      const proof = broken.catalog.proofs.find(p => p.id === 'i52-observed-80000')!;
      if (mutation === 'disclosure') selected.disclosure = structuredClone(oldPlan.disclosure);
      if (mutation === 'old-proof') Object.assign(proof, previous.proofs.find(p => p.id === proof.id));
      if (mutation === 'missing-proof') broken.catalog.proofs = broken.catalog.proofs.filter(p => p.id !== proof.id);
      if (mutation === 'changed-recipe' && proof.recipe.id === 'economics' && proof.recipe.mode === 'derive') proof.recipe.inputs.robotCost += 1;
      if (mutation === 'lost-review') selected.planReview = null;
      expect(validate(broken).failures.length).toBeGreaterThan(0);
    },
  );
});
