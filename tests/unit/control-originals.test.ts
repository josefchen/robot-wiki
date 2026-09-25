import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';
import { CORRECTION_TARGETS, parseCorrectedDispositions, validateCorrectedDisposition } from '../../lib/audit-corrected-disposition.ts';

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
  3: 'control-3-zn-effects-20260924',
  11: 'control-11-qb-20260916f',
  13: 'control-13-dc-20260916f',
  16: 'control-16-kh-20260916f',
};

const EXPECTED_20260917A: Readonly<Record<number, string>> = {
  4: 'control-4-zn1942-dated-capture-20260917a',
  10: 'control-10-qb-origin-20260917a',
};

describe('control originals integration (2026-09-16 evidence completions)', () => {
  it('requires finite removal evidence for exactly the two withdrawn prevalence rows', () => {
    expect(Object.keys(CORRECTION_TARGETS).filter(id => id.startsWith('audit/classical.md:control:')))
      .toEqual(['audit/classical.md:control:1', 'audit/classical.md:control:2']);
    const corrections = parseCorrectedDispositions([
      ...JSON.parse(readFileSync(join(ROOT, 'audit/evidence/industrial-closure-20260923/corrections.json'), 'utf8')),
      ...JSON.parse(readFileSync(join(ROOT, 'audit/evidence/classical-closure-20260923/corrections.json'), 'utf8')),
    ]);
    expect(corrections).toHaveLength(7);
    const plans = parseCompoundPlans(JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')));
    const rows = parseLedger('audit/classical.md', readFileSync(join(ROOT, 'audit/classical.md'), 'utf8'),
      new Set(CITATIONS.map(c => c.id)), {
        compoundPlans: plans, correctedDispositions: { root: ROOT, records: corrections },
      }).find(s => s.slug === 'control')!.claimRecords;
    for (const n of [1, 2]) {
      const correction = corrections.find(c => c.originalId === `audit/classical.md:control:${n}`)!;
      expect(rows[n - 1].correctedDisposition?.id).toBe(correction.id);
      expect(rows[n - 1].evidenceFailures).toEqual([]);
      expect(validateCorrectedDisposition({ ...correction, requiredAbsent: correction.requiredAbsent.slice(1) },
        rows[n - 1], correction.id, rows, { root: ROOT, records: corrections }))
        .toContain('corrected disposition: missing/stale correction semantic review');
      expect(validateCorrectedDisposition({ ...correction, currentTupleDigest: '0'.repeat(64) },
        rows[n - 1], correction.id, rows, { root: ROOT, records: corrections }))
        .toContain('corrected disposition: correction current tuple drift');
    }
  });

  it('binds supported replacement parts without a historical-priority shortcut', () => {
    const plans = parseCompoundPlans(JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')));
    const control = plans.filter(p => p.ledgerPath === 'audit/classical.md' && p.articleSlug === 'control');
    const three = control.find(p => p.rowOrdinal === 3)!;
    const seven = control.find(p => p.rowOrdinal === 7)!;
    expect(control.some(p => p.rowOrdinal === 1 || p.rowOrdinal === 2)).toBe(false);
    expect(three.parts.map(p => p.id)).toEqual(['c3-proportional', 'c3-reset', 'c3-preact']);
    expect(three.evidence.map(e => e.citationId)).toEqual(Array(3).fill('ziegler-nichols-1942'));
    expect(seven.parts.map(p => p.id)).toEqual(['c7-state', 'c7-cost', 'c7-policy', 'c7-are']);
    expect(seven.evidence.map(e => e.citationId)).toEqual(Array(4).fill('tedrake-underactuated'));
    expect(seven.evidence.map(e => e.sourceUrl)).toEqual(Array(4).fill('https://underactuated.mit.edu/lqr.html'));
    expect(control.flatMap(p => p.evidence).some(e => e.citationId === 'astrom-murray-2008' || e.citationId === 'kalman-1960')).toBe(false);
  });

  it('removes unsupported active Åström and Kalman claims without removing control interactions', () => {
    const article = readFileSync(join(ROOT, 'content/classical/control.mdx'), 'utf8');
    const frontmatter = article.slice(0, article.indexOf('---', 4));
    expect(article).not.toMatch(/(?:more than 95%|>95%|many of them without the D|Åström and Murray's reading|Kalman's 1960 formulation)/i);
    expect(frontmatter).not.toContain('astrom-murray-2008');
    expect(frontmatter).not.toContain('kalman-1960');
    expect(article).not.toContain('<Cite id="astrom-murray-2008" />');
    expect(article).not.toContain('<Cite id="kalman-1960" />');
    expect(article).toContain('<Cite id="ziegler-nichols-1942" />');
    expect(article).toContain('<Cite id="tedrake-underactuated" />');
    expect(article.match(/<PendulumController\b/g)).toHaveLength(2);
    expect(article).toContain('<ImpedanceContactLab');
    expect(article).toContain('<SelfCheck');
    expect(article).toContain('<PredictThenReveal');
    expect(article).toContain('A^{\\top} P + P A - P B R^{-1} B^{\\top} P + Q = 0');
  });

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
      expect(plan.planReview?.reviewedBy).toContain('paywall integrator efa5d1e4');
      expect(plan.planReview?.rationale).toContain('af50da65fc93392238e2c9c7cf2d170dfa0955e283cf7fb9dcff60eacc7d187d');
    }
  });

  it('records integrator plan review on every retained 20260916f control plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260916F)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      if (planId === 'control-3-zn-effects-20260924') {
        expect(plan.planReview?.reviewedBy).toContain('implementation integrator');
        expect(plan.planReview?.rationale).toContain('1942 reproduction');
      } else {
        expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
        expect(plan.planReview?.rationale).toContain('7a796795a9ca1684460f332bfc05f9f10950b87067eabe667afd3210a7b0e4e3');
      }
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
      if (planId === 'control-c7-lqr-riccati-20260915') {
        expect(plan.planReview?.reviewedBy).toContain('implementation integrator');
        expect(plan.planReview?.rationale).toContain('Tedrake chapter 8');
      } else {
        expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
        expect(plan.planReview?.rationale).toContain('9cba7f40ed2206e979ffc09591dc20f0b87cf48c08e26fcb496af698d8b8b3af');
      }
    }
  });
});
