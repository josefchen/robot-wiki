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

const EXPECTED_20260916F: Readonly<Record<number, string>> = {
  1: 'control-1-astrom-20260916f',
  2: 'control-2-astrom-20260916f',
  3: 'control-3-astrom-20260916f',
  11: 'control-11-qb-20260916f',
  13: 'control-13-dc-20260916f',
  16: 'control-16-kh-20260916f',
};

const EXPECTED_20260917A: Readonly<Record<number, string>> = {
  4: 'control-4-zn1942-dated-capture-20260917a',
  10: 'control-10-qb-origin-20260917a',
};

describe('control originals integration (2026-09-16 evidence completions)', () => {
  it('binds the six applied control rows to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const control = sections.find((section) => section.slug === 'control');
    expect(control).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916F)) {
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
    // The Ziegler-Nichols row 4 and the MPC-origin row 10 were held until the
    // 20260917a paywall pass; both now bind complete compound evidence.
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260917A)) {
      const record = control!.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
    }
  });

  it('binds the 20260917a paywall rows to the dated ZN capture and the survey origin', () => {
    const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
    const control = sections.find((section) => section.slug === 'control')!;
    const zn = control.claimRecords[3];
    // lawful public copy: dated Wayback capture of the ASME-permitted
    // Driedger text-layer reproduction, corroborated by the NTNU scan
    expect(zn.sourceChecked).toContain('ziegler-nichols-1942');
    expect(zn.sourceChecked).toContain('https://web.archive.org/web/20170918055307/');
    expect(zn.sourceChecked).toContain('sha256 2834f3507113b995721f815465a478731aba1a7baae7304d463d909dfa39df9c');
    expect(zn.sourceChecked).toContain('skoge.folk.ntnu.no');
    expect(zn.note).toContain('Pre-act time = Pu / 8 min');
    expect(zn.note).toContain('find the ultimate sensitivity and then simply cut it in half');
    const mpc = control.claimRecords[9];
    expect(mpc.claim).toBe('MPC grew out of power-plant and petroleum-refinery practice in the 1970s-80s');
    expect(mpc.verdict).toContain('C (');
    expect(mpc.sourceChecked).toContain('qin-badgwell-2003');
    expect(mpc.sourceChecked).toContain('https://cepac.cheme.cmu.edu/pasilectures/darciodolak/Review_article_2.pdf');
    expect(mpc.sourceChecked).toContain('garcia-1989 stays registered');
    expect(mpc.note).toContain('power plants and petroleum reﬁneries');
    expect(mpc.note).toContain('garcia-1989 -> qin-badgwell-2003');
    const article = readFileSync(join(ROOT, 'content/classical/control.mdx'), 'utf8');
    expect(article).toContain('MPC grew out of power-plant and petroleum-refinery practice in the 1970s and 1980s');
    expect(article).not.toContain('MPC grew out of refinery practice');
    expect(article).toContain('exactly what PID could not handle <Cite id="qin-badgwell-2003" />');
  });

  it('records integrator plan review on the 20260917a paywall plans', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260917A)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toContain('paywall integrator efa5d1e4-a1b6-4874-b933-8492ceab17fa');
      expect(plan.planReview?.rationale).toContain('af50da65fc93392238e2c9c7cf2d170dfa0955e283cf7fb9dcff60eacc7d187d');
    }
  });

  it('records integrator plan review on every 20260916f control plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260916F)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain('7a796795a9ca1684460f332bfc05f9f10950b87067eabe667afd3210a7b0e4e3');
    }
  });
});

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
