import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16l evaluation-crisis originals integration: the single
 * dispatched data-hardware/evaluation-crisis row (original 9, libero-plus-2025
 * arXiv 2510.13626 abstract evidence completion) must bind to its compound
 * plan and parse complete (no evidence failures) with supported adjudications,
 * from the committed ledger and catalog exactly as check-audit-coverage reads
 * them. The schema-held internal-arithmetic row 1 stays unbound and incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = 'defe33b6e1ce7a8eb835dc31b7926ccbfc88d30a98388d71f7021cf28d517364';
const EXPECTED_20260916L: Readonly<Record<number, string>> = {
  9: 'evaluation-crisis-9-libero-plus-20260916l',
};
const HELD_ORDINALS = [1];

describe('evaluation-crisis originals integration (2026-09-16l evidence completion)', () => {
  it('binds the applied evaluation-crisis row to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/data-hardware.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/data-hardware.md', markdown, registryIds, { compoundPlans });
    const evaluationCrisis = sections.find((section) => section.slug === 'evaluation-crisis');
    expect(evaluationCrisis).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916L)) {
      const record = evaluationCrisis!.claimRecords[Number(ordinal) - 1];
      expect(record.claim).toContain('LIBERO-Plus');
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

  it('carries the libero-plus abstract evidence needles in the bound row and plan', () => {
    const markdown = readFileSync(join(ROOT, 'audit/data-hardware.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/data-hardware.md', markdown, registryIds, { compoundPlans });
    const evaluationCrisis = sections.find((section) => section.slug === 'evaluation-crisis')!;

    // Row 9: standing V verdict evidence-completed; the sourceChecked cell
    // records the exact registered URL and the preparer's fetch of record.
    const r9 = evaluationCrisis.claimRecords[8];
    expect(r9.sourceChecked).toContain('https://arxiv.org/abs/2510.13626');
    expect(r9.sourceChecked).toContain('2026-09-16T18:34:30Z');
    expect(r9.verdict).toBe('V');
    // The note quotes the three abstract fragments the evidence rests on.
    expect(r9.note).toContain('seven dimensions: objects layout, camera viewpoints, robot initial states, language instructions, light conditions, background textures and sensor noise');
    expect(r9.note).toContain('performance dropping from 95% to below 30% under modest perturbations');
    expect(r9.note).toContain('models tend to ignore language instructions completely');

    // The plan carries the exact abstract passages against the registered URL,
    // one evidence item per part, all for the registered citation.
    const plan = compoundPlans.find((p) => p.id === EXPECTED_20260916L[9])!;
    expect(plan.parts.map((part) => part.id)).toEqual([
      'ec9-seven-dimensions',
      'ec9-collapse-95-to-below-30',
      'ec9-language-insensitivity',
    ]);
    expect(plan.evidence).toHaveLength(plan.parts.length);
    for (const item of plan.evidence) {
      expect(item.citationId).toBe('libero-plus-2025');
      expect(item.sourceUrl).toBe('https://arxiv.org/abs/2510.13626');
    }
    expect(plan.evidence[0].supportingPassage).toBe(
      'We perform a systematic vulnerability analysis by introducing controlled perturbations across seven dimensions: objects layout, camera viewpoints, robot initial states, language instructions, light conditions, background textures and sensor noise.',
    );
    expect(plan.evidence[1].supportingPassage).toBe(
      'Our analysis exposes critical weaknesses: models exhibit extreme sensitivity to perturbation factors, including camera viewpoints and robot initial states, with performance dropping from 95% to below 30% under modest perturbations.',
    );
    expect(plan.evidence[2].supportingPassage).toBe(
      'Surprisingly, models are largely insensitive to language variations, with further experiments revealing that models tend to ignore language instructions completely.',
    );
  });

  it('uses the registered libero-plus-2025 citation with no new registration', () => {
    const registered = CITATIONS.filter(({ id }) => id === 'libero-plus-2025');
    expect(registered).toHaveLength(1);
    expect(registered[0].url).toBe('https://arxiv.org/abs/2510.13626');
    expect(registered[0].year).toBe(2025);
    expect(registered[0].title).toBe(
      'LIBERO-Plus: In-depth Robustness Analysis of Vision-Language-Action Models',
    );
    expect(registered[0].authors).toHaveLength(13);
  });

  it('keeps the schema-held internal-arithmetic row unbound and evidence-incomplete', () => {
    const markdown = readFileSync(join(ROOT, 'audit/data-hardware.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/data-hardware.md', markdown, registryIds, { compoundPlans });
    const evaluationCrisis = sections.find((section) => section.slug === 'evaluation-crisis')!;
    for (const ordinal of HELD_ORDINALS) {
      const record = evaluationCrisis.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('records integrator plan review on the 20260916l evaluation-crisis plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED_20260916L)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
