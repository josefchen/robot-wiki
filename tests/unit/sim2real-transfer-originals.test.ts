import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16h sim2real-transfer originals integration: the four
 * dispatched rl-sim2real/sim2real-transfer rows (originals 1, 7, 21 and 22)
 * must bind to their compound plans and parse complete (no evidence
 * failures) with supported adjudications, from the committed ledger and
 * catalog exactly as check-audit-coverage reads them. The held rows 23 and
 * 24 (authored-toy internal rows with no registered citation; standing
 * owner question on the compoundPlanSchema requiredCitationIds min(1)
 * constraint) stay incomplete, and every other row keeps its pre-existing
 * evidence state.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = 'ef6410bf9d0e03899eddd9700cffa7d86de01af7246cf722a0138888f10bac16';
const EXPECTED_20260916H: Readonly<Record<number, string>> = {
  1: 'sim2real-transfer-1-survey-taxonomy-20260916h',
  7: 'sim2real-transfer-7-adr-20260916h',
  21: 'sim2real-transfer-21-splat-division-20260916h',
  22: 'sim2real-transfer-22-action-space-20260916h',
};
const PRE_EXISTING_PLANS: Readonly<Record<number, string>> = {
  2: 'isaac-v1-rl-sim2real-sim2real-transfer-2-20260908',
  3: 'rma-writer-3-20260909',
  4: 'sim2real-splat-consumer-4-20260908',
  5: 'domain-randomization-sim2real-transfer-5',
  6: 'domain-randomization-sim2real-transfer-6',
  8: 'isaac-v1-rl-sim2real-sim2real-transfer-8-20260908',
  9: 'domain-randomization-sim2real-transfer-9',
  10: 'learned-locomotion-sim2real-transfer-10-20260908',
  11: 'rma-writer-11-20260909',
  12: 'isaac-v1-rl-sim2real-sim2real-transfer-12-20260908',
  13: 'isaac-v1-rl-sim2real-sim2real-transfer-13-20260908',
  14: 'learned-locomotion-sim2real-transfer-14-20260908',
  15: 'humanoid-motion-sim2real-transfer-15-20260908',
  16: 'humanoid-motion-sim2real-transfer-16-20260908',
  17: 'humanoid-motion-sim2real-transfer-17-20260908',
  18: 'sim2real-splat-consumer-18-20260908',
  19: 'sim2real-splat-consumer-19-20260908',
  20: 'source-newton-engine-20260908-sim2real-transfer-20',
};

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, {
    compoundPlans,
  });
  return { sections, compoundPlans, registryIds, markdown };
};

describe('sim2real-transfer originals integration (2026-09-16h evidence completions)', () => {
  it('binds the four applied rows to complete compound evidence', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'sim2real-transfer');
    expect(article).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916H)) {
      const record = article!.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
      // compound rows must not mix scalar evidence cells with paired items
      for (const item of plan.evidence) {
        expect(item.citationId).not.toBe('');
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps every undispatched row in its pre-existing evidence state', () => {
    const { sections } = loadSection();
    const article = sections.find((section) => section.slug === 'sim2real-transfer')!;
    // rows 2-6, 8-20: pre-existing compound plans, untouched and complete
    for (const [ordinal, planId] of Object.entries(PRE_EXISTING_PLANS)) {
      const record = article.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.evidenceFailures).toEqual([]);
    }
    // rows 23/24 stay honestly HELD: authored-toy internal rows with no
    // registered citation; scalar evidence cannot complete them under the
    // compoundPlanSchema requiredCitationIds min(1) constraint
    for (const ordinal of [23, 24]) {
      const record = article.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('carries the packet passages in the bound rows and plans', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'sim2real-transfer')!;

    // Row 1: the survey taxonomy, abstract + Sec. 4 organization, with the
    // 'nearly' qualifier absorbing the survey's missing literal
    // 'teacher-student' phrase.
    const r1 = article.claimRecords[0];
    expect(r1.sourceChecked).toContain('reality-gap-survey-2026');
    expect(r1.sourceChecked).toContain('https://arxiv.org/html/2510.20808');
    expect(r1.sourceChecked).toContain('2026-09-16T13:15:54Z');
    expect(r1.note).toContain('domain randomization, real-to-sim transfer, state and action abstractions, and sim-real co-training');
    expect(r1.note).toContain("survey prints no literal 'teacher-student'");
    const p1 = compoundPlans.find((p) => p.id === EXPECTED_20260916H[1])!;
    expect(p1.evidence.some((e) => e.supportingPassage.includes('By leveraging techniques such as domain randomization, real-to-sim transfer, state and action abstractions, and sim-real co-training'))).toBe(true);
    expect(p1.evidence.some((e) => e.supportingPassage.includes('A taxonomy of sim-to-real transfer methods, distinguishing clearly between approaches and techniques'))).toBe(true);
    expect(p1.evidence.some((e) => e.supportingPassage.includes('Real-to-sim environment creation involves creating environments in simulation from data collected in the real world'))).toBe(true);

    // Row 7: ADR mechanism per OpenAI; Isaac Lab Sec. 5.3 curriculum, with
    // the 'dexsuite' gloss disclosed.
    const r7 = article.claimRecords[6];
    expect(r7.sourceChecked).toContain('openai-rubiks-cube-2019');
    expect(r7.sourceChecked).toContain('isaac-lab-2025');
    expect(r7.note).toContain('ever-increasing difficulty');
    expect(r7.note).toContain("faithful gloss of 'dexsuite'");
    const p7 = compoundPlans.find((p) => p.id === EXPECTED_20260916H[7])!;
    expect(p7.evidence.some((e) => e.supportingPassage.includes('the parameter for the chosen dimension is increased. It is decreased if the average model performance is worse than the low threshold'))).toBe(true);
    expect(p7.evidence.some((e) => e.supportingPassage.includes('through a configurable curriculum framework that adaptively adjusts the difficulty of the environment based on the performance of the agent'))).toBe(true);
    expect(p7.evidence.some((e) => e.supportingPassage.includes('The dexsuite examples in Isaac Lab provide reference ADR configurations for RL training'))).toBe(true);

    // Row 21: division of labor and the static-scene caveat, both papers.
    const r21 = article.claimRecords[20];
    expect(r21.sourceChecked).toContain('splatsim-2024');
    expect(r21.sourceChecked).toContain('robogsim-2024');
    expect(r21.note).toContain('traditional mesh representation in the rendering pipeline of the simulator');
    expect(r21.note).toContain('the simulator as a physics backend');
    expect(r21.note).toContain('reconstruct static scenes');
    const p21 = compoundPlans.find((p) => p.id === EXPECTED_20260916H[21])!;
    expect(p21.evidence.some((e) => e.supportingPassage.includes('relies solely on an initial video of the static scene with the robot'))).toBe(true);
    expect(p21.evidence.some((e) => e.supportingPassage.includes('powered by 3D Gaussian Splatting and the physics engine'))).toBe(true);

    // Row 22: the corrected verdict stands, with the Sec. 4.1 locator fix
    // and the zero-hits absence confirmation recorded.
    const r22 = article.claimRecords[21];
    expect(r22.verdict).toContain('corrected');
    expect(r22.sourceChecked).toContain("Sec. 4.1 'Reducing the Gap'");
    expect(r22.sourceChecked).toContain("the earlier 'Sec. 4.2' locator mislabeled the section");
    expect(r22.note).toContain('The action space plays a crucial role in reducing the sim-to-real gap as demonstrated across robotics domains including navigation, locomotion, and manipulation');
    expect(r22.note).toContain('0 hits');
    const p22 = compoundPlans.find((p) => p.id === EXPECTED_20260916H[22])!;
    expect(p22.evidence.some((e) => e.supportingPassage.includes('Action Representations. The action space plays a crucial role'))).toBe(true);
    expect(p22.adjudications.map((a) => a.partId)).toEqual([
      's22-survey-emphasis', 's22-absence-of-coinage', 's22-locator-correction',
    ]);
  });

  it('reuses registered citations with no new registrations', () => {
    const ids = ['reality-gap-survey-2026', 'openai-rubiks-cube-2019', 'isaac-lab-2025',
      'splatsim-2024', 'robogsim-2024'];
    for (const id of ids) {
      expect(CITATIONS.filter((c) => c.id === id)).toHaveLength(1);
    }
    // the survey is the same citation already bound for the why-rl rows;
    // Isaac Lab is the same entry behind rows 2/8/12/13
    const survey = CITATIONS.find((c) => c.id === 'reality-gap-survey-2026')!;
    expect(survey.url).toBe('https://arxiv.org/abs/2510.20808');
    const isaac = CITATIONS.find((c) => c.id === 'isaac-lab-2025')!;
    expect(isaac.url).toBe('https://arxiv.org/abs/2511.04831');
    const splatsim = CITATIONS.find((c) => c.id === 'splatsim-2024')!;
    expect(splatsim.url).toBe('https://arxiv.org/abs/2409.10161');
    const robogsim = CITATIONS.find((c) => c.id === 'robogsim-2024')!;
    expect(robogsim.url).toBe('https://arxiv.org/abs/2411.11839');
  });

  it('records integrator plan review on every 20260916h sim2real-transfer plan', () => {
    const { compoundPlans } = loadSection();
    for (const planId of Object.values(EXPECTED_20260916H)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
