import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-15 control-originals integration: the eleven dispatched
 * classical/control rows bound to their compound plans must parse complete
 * (no evidence failures) with supported adjudications, from the committed
 * ledger and catalog exactly as check-audit-coverage reads them.
 */
const ROOT = join(import.meta.dirname, '../..');
const EXPECTED: Readonly<Record<number, string>> = {
  5: 'control-c5-pendulum-plant-20260915',
  6: 'control-c6-linearization-20260915',
  7: 'control-c7-lqr-riccati-20260915',
  8: 'control-c8-lqr-pd-swingup-20260915',
  9: 'control-c9-mayne-title-20260915',
  12: 'control-c12-dicarlo-abstract-20260915',
  14: 'control-c14-mujoco-ilqr-20260915',
  15: 'control-c15-mujoco-gloss-20260915',
  17: 'control-c17-sentis-hierarchy-20260915',
  18: 'control-c18-wbc-qp-form-20260915',
  19: 'control-c19-bd-spot-rl-20260915',
};

describe('control originals integration (2026-09-15)', () => {
  it('binds all eleven dispatched control rows to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const control = sections.find((section) => section.slug === 'control');
    expect(control).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED)) {
      const record = control!.claimRecords[Number(ordinal) - 1];
      expect(record.claim).toContain(' ');
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
    }
  });

  it('records integrator plan review on every new control plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain('9cba7f40ed2206e979ffc09591dc20f0b87cf48c08e26fcb496af698d8b8b3af');
    }
  });
});
