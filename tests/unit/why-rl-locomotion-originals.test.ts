import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16g why-rl-locomotion originals integration: the seven
 * dispatched rl-sim2real/why-rl-locomotion rows (originals 2, 4, 7, 9, 10, 11
 * and 12) must bind to their compound plans and parse complete (no evidence
 * failures) with supported adjudications, from the committed ledger and
 * catalog exactly as check-audit-coverage reads them. The five rows outside
 * this dispatch (1, 3, 5, 6, 8) keep their pre-existing evidence state:
 * row 1 stays scalar-complete, rows 3/5/6/8 stay bound to their
 * pre-existing plans.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '2222994d591257e24144efc8d9b6d89e034b208ddb9255be1d56a12a27071588';
const EXPECTED_20260916G: Readonly<Record<number, string>> = {
  2: 'why-rl-locomotion-2-reality-gap-20260916g',
  4: 'why-rl-locomotion-4-lin-v1-20260916g',
  7: 'why-rl-locomotion-7-play2perfect-20260916g',
  9: 'why-rl-locomotion-9-gr2-20260916g',
  10: 'why-rl-locomotion-10-absence-and-20260916g',
  11: 'why-rl-locomotion-11-local-consistency-20260916g',
  12: 'why-rl-locomotion-12-frontmatter-p1-20260916g',
};
const PRE_EXISTING_PLANS: Readonly<Record<number, string>> = {
  3: 'isaac-v1-rl-sim2real-why-rl-locomotion-3-20260908',
  5: 'domain-randomization-why-rl-locomotion-5',
  6: 'isaac-v1-rl-sim2real-why-rl-locomotion-6-20260908',
  8: 'domain-randomization-why-rl-locomotion-8',
};

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/rl-sim2real.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  // canonical frontmatter for the row-12 frontmatter-p1 batch, exactly as
  // check-audit-coverage derives it
  const frontmatter = matter(
    readFileSync(join(ROOT, 'content/rl-sim2real/why-rl-locomotion.mdx'), 'utf8'),
  );
  const sections = parseLedger('audit/rl-sim2real.md', markdown, registryIds, {
    compoundPlans,
    articleCitations: { 'why-rl-locomotion': frontmatter.data.citations },
  });
  return { sections, compoundPlans, registryIds, markdown };
};

describe('why-rl-locomotion originals integration (2026-09-16g evidence completions)', () => {
  it('binds the seven applied rows to complete compound evidence', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'why-rl-locomotion');
    expect(article).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916G)) {
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

  it('keeps the five undispatched rows in their pre-existing evidence state', () => {
    const { sections } = loadSection();
    const article = sections.find((section) => section.slug === 'why-rl-locomotion')!;
    // row 1: scalar-complete Rudin row, untouched
    const r1 = article.claimRecords[0];
    expect(r1.citationId).toBe('rudin-2021');
    expect(r1.sourceUrl).toContain('2109.11978');
    expect(r1.evidenceFailures).toEqual([]);
    expect(r1.compound?.planId ?? '').toBe('');
    // rows 3/5/6/8: pre-existing compound plans, untouched and complete
    for (const [ordinal, planId] of Object.entries(PRE_EXISTING_PLANS)) {
      const record = article.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.evidenceFailures).toEqual([]);
    }
  });

  it('carries the packet passages in the bound rows and plans', () => {
    const { sections, compoundPlans } = loadSection();
    const article = sections.find((section) => section.slug === 'why-rl-locomotion')!;

    // Row 2: the survey paraphrase basis is recorded verbatim, and the
    // paraphrase itself is disclosed (the survey prints no form of 'cheap').
    const r2 = article.claimRecords[1];
    expect(r2.sourceChecked).toContain('https://arxiv.org/html/2510.20808');
    expect(r2.sourceChecked).toContain('2026-09-16T11:45:14Z');
    expect(r2.note).toContain('particularly problematic in contact-rich tasks like robotic manipulation');
    expect(r2.note).toContain("the article's paraphrase");
    const p2 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[2])!;
    expect(p2.evidence.some((e) => e.supportingPassage.includes('To maintain computational efficiency, simulators typically rely on simplified models'))).toBe(true);
    expect(p2.evidence.some((e) => e.supportingPassage.includes('Accepted for Publication as part of the Annual Review of Control, Robotics, and Autonomous Systems 2026'))).toBe(true);

    // Row 4: the v1 quote with its task-/hardware-specific qualifier.
    const r4 = article.claimRecords[3];
    expect(r4.sourceChecked).toContain('https://arxiv.org/html/2502.20396v1');
    expect(r4.note).toContain('much more laborious real-to-sim engineering efforts that are task-specific or hardware-specific');
    expect(r4.verdict).toContain('corrected');
    const p4 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[4])!;
    expect(p4.evidence.some((e) => e.supportingPassage.includes('previous successes in dexterous manipulation involve much more laborious real-to-sim engineering efforts that are task-specific or hardware-specific'))).toBe(true);

    // Row 7: 60% at 0.5 mm, CAD-derived sparse rewards, zero-shot, v3 basis.
    const r7 = article.claimRecords[6];
    expect(r7.note).toContain('60% success on tight insertions with only 0.5 mm contact clearance');
    expect(r7.note).toContain('sparse-reward RL environments derived from CAD designs');
    expect(r7.sourceChecked).toContain('v3 HTML');
    const p7 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[7])!;
    expect(p7.evidence.some((e) => e.supportingPassage.includes('At 0.5 mm clearance, Play2Perfect still succeeds 60% of the time'))).toBe(true);
    expect(p7.evidence.some((e) => e.supportingPassage.includes('no real-world finetuning'))).toBe(true);

    // Row 9: exact endpoints and the vendor-span mirror; household disclosed
    // as the article's descriptor.
    const r9 = article.claimRecords[8];
    expect(r9.note).toContain('32% (Dustpan) to 92% (Unscrew bulb)');
    expect(r9.note).toContain("the article's descriptor");
    expect(r9.sourceChecked).toContain('humanoid-wbc rows 15/18/19, reused read-only');
    const p9 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[9])!;
    expect(p9.evidence.some((e) => e.supportingPassage.includes('"Precise insertion tasks" at 89.6%'))).toBe(true);
    expect(p9.evidence.some((e) => e.supportingPassage.includes('"Pick up from table" at 68.4%'))).toBe(true);

    // Row 10: absence claim held as honest-unknown with the conjunction.
    const r10 = article.claimRecords[9];
    expect(r10.note).toContain('Stat \'none\' + note state absence, not measurement');
    expect(r10.note).toContain('2-5 h');
    const p10 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[10])!;
    expect(p10.parts.map((part) => part.id)).toEqual([
      'w10-survey-clause', 'w10-lin-clause', 'w10-play2perfect-clause',
    ]);

    // Row 11: local proof executed read-only; illustrative-model labeling.
    const r11 = article.claimRecords[10];
    expect(r11.note).toContain('Local proof, executed read-only');
    expect(r11.note).toContain('20/0.5 = 40');
    const p11 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[11])!;
    expect(p11.parts[0].requiredCitationIds).toEqual(['gemini-robotics-2-2026', 'play2perfect-2026']);

    // Row 12: fresh sweep provenance; the two honest caveats stay recorded.
    const r12 = article.claimRecords[11];
    expect(r12.sourceChecked).toContain('All seven identities fetched fresh this sweep');
    expect(r12.note).toContain("Lin registry venue 'CoRL 2025' is printed nowhere on the live v1 pages");
    expect(r12.note).toContain('retained Appendix-A derivation');
    const p12 = compoundPlans.find((p) => p.id === EXPECTED_20260916G[12])!;
    expect(p12.kind).toBe('frontmatter-p1');
    expect(p12.parts).toHaveLength(7);
    expect(p12.evidence).toHaveLength(7);
  });

  it('reuses registered citations with no new registrations', () => {
    const ids = ['rudin-2021', 'reality-gap-survey-2026', 'isaac-lab-2025',
      'lin-humanoid-sim2real-2025', 'openai-rubiks-cube-2019', 'play2perfect-2026',
      'gemini-robotics-2-2026'];
    for (const id of ids) {
      expect(CITATIONS.filter((c) => c.id === id)).toHaveLength(1);
    }
    // GR2 stays the single humanoid-wbc-registered entry with the blog URL.
    const gr2 = CITATIONS.find((c) => c.id === 'gemini-robotics-2-2026')!;
    expect(gr2.url).toBe('https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/');
    expect(gr2.title).toBe('Gemini Robotics 2 brings whole body intelligence to robots');
    expect(gr2.year).toBe(2026);
  });

  it('records integrator plan review on every 20260916g why-rl-locomotion plan', () => {
    const { compoundPlans } = loadSection();
    for (const planId of Object.values(EXPECTED_20260916G)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
