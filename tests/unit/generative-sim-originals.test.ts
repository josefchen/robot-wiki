import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16n generative-sim-originals integration: the three
 * dispatched world-models/generative-sim rows (originals 4 and 9, RoboCasa365
 * PDF evidence completion; original 14, 3DGS + SplatSim abstract-scope
 * evidence completion) must bind to their compound plans and parse complete
 * (no evidence failures) with supported adjudications, from the committed
 * ledger and catalog exactly as check-audit-coverage reads them. Row 15
 * (frontmatter sweep) stays held: isaac-lab-2025's live-page author list
 * does not freshly match the registry, so the sweep row stays unbound and
 * evidence-incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '57fa9ef830b74ee7dcaa40b5362878fa918c4eac02510b9df568c4611e2c00ed';
const EXPECTED_20260916N: Readonly<Record<number, string>> = {
  4: 'generative-sim-4-robocasa365-stat-20260916n',
  9: 'generative-sim-9-robocasa365-platform-20260916n',
  14: 'generative-sim-14-appearance-not-physics-20260916n',
};
const HELD_ORDINAL = 15;

const parseSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/world-models.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const declared = matter(readFileSync(join(ROOT, 'content/world-models/generative-sim.mdx'), 'utf8')).data.citations;
  const sections = parseLedger('audit/world-models.md', markdown, registryIds, {
    compoundPlans, articleCitations: { 'generative-sim': declared },
  });
  const section = sections.find((s) => s.slug === 'generative-sim');
  expect(section).toBeDefined();
  return { section: section!, compoundPlans };
};

describe('generative-sim originals integration (2026-09-16n evidence completions)', () => {
  it('binds the three applied generative-sim rows to complete compound evidence', () => {
    const { section, compoundPlans } = parseSection();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916N)) {
      const record = section.claimRecords[Number(ordinal) - 1];
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

  it('carries the RoboCasa365 and abstract-scope evidence needles in the bound rows and plans', () => {
    const { section, compoundPlans } = parseSection();

    // Row 4: Stat "RoboCasa365 2,500 kitchens, ICLR 2026"; the sourceChecked
    // cell records the registered-URL fetch of record, and the note keeps the
    // verbatim abstract quote plus the venue and no-competing-total census.
    const r4 = section.claimRecords[3];
    expect(r4.sourceChecked).toContain('https://robocasa.ai/assets/robocasa365_iclr26.pdf');
    expect(r4.sourceChecked).toContain('2026-09-16T21:15:37Z');
    expect(r4.sourceChecked).toContain('robocasa365-2026');
    expect(r4.note).toContain('"365 everyday tasks across 2,500 diverse kitchen environments"');
    expect(r4.note).toContain('Published as a conference paper at ICLR 2026');

    // Row 9: platform paragraph; both ledger-note quotes stay verbatim with
    // the gloss disclosures (600+/1,600+ over glosses; benchmarks compression).
    const r9 = section.claimRecords[8];
    expect(r9.sourceChecked).toContain('https://robocasa.ai/assets/robocasa365_iclr26.pdf');
    expect(r9.note).toContain(
      '"over 600 hours of human demonstration data and over 1600 hours of synthetically generated demonstration data"',
    );
    expect(r9.note).toContain('"multi-task learning, robot foundation model training, and lifelong learning"');

    // Row 14: push test; abstract-scope division of labor, disclosed as such.
    const r14 = section.claimRecords[13];
    expect(r14.sourceChecked).toContain('https://arxiv.org/abs/2308.04079');
    expect(r14.sourceChecked).toContain('https://arxiv.org/abs/2409.10161');
    expect(r14.note).toContain('Abstract-scope evidence');
    expect(r14.note).toContain('the primary rendering primitive');

    // Plans carry the exact passages against the registered URLs.
    const p4 = compoundPlans.find((p) => p.id === EXPECTED_20260916N[4])!;
    for (const item of p4.evidence) {
      expect(item.citationId).toBe('robocasa365-2026');
      expect(item.sourceUrl).toBe('https://robocasa.ai/assets/robocasa365_iclr26.pdf');
    }
    expect(p4.evidence[0].supportingPassage).toContain('Published as a conference paper at ICLR 2026');
    expect(p4.evidence[1].supportingPassage).toContain('365 everyday tasks across 2,500 diverse kitchen environments');
    expect(p4.evidence[1].supportingPassage).toContain('2500 diverse kitchen scenes');

    const p9 = compoundPlans.find((p) => p.id === EXPECTED_20260916N[9])!;
    expect(p9.evidence[0].supportingPassage).toContain('Built on the RoboCasa platform');
    expect(p9.evidence[1].supportingPassage).toContain(
      'over 600 hours of human demonstration data and over 1600 hours of synthetically generated demonstration data',
    );
    expect(p9.evidence[2].supportingPassage).toContain(
      'multi-task learning, robot foundation model training, and lifelong learning',
    );

    const p14 = compoundPlans.find((p) => p.id === EXPECTED_20260916N[14])!;
    expect(p14.evidence[0].citationId).toBe('3dgs-2023');
    expect(p14.evidence[0].sourceUrl).toBe('https://arxiv.org/abs/2308.04079');
    expect(p14.evidence[0].supportingPassage).toContain(
      'high-quality real-time (>= 30 fps) novel-view synthesis at 1080p resolution',
    );
    expect(p14.evidence[0].supportingPassage).toContain('fast visibility-aware rendering algorithm');
    expect(p14.evidence[1].citationId).toBe('splatsim-2024');
    expect(p14.evidence[1].sourceUrl).toBe('https://arxiv.org/abs/2409.10161');
    expect(p14.evidence[1].supportingPassage).toContain(
      'leverages Gaussian Splatting as the primary rendering primitive',
    );
    expect(p14.evidence[1].supportingPassage).toContain(
      'replacing traditional mesh representations with Gaussian Splats in simulators',
    );
  });

  it('reuses the three registered citations with no new registration', () => {
    const byId = new Map(CITATIONS.map((c) => [c.id, c]));
    expect(byId.get('robocasa365-2026')?.url).toBe('https://robocasa.ai/assets/robocasa365_iclr26.pdf');
    expect(byId.get('robocasa365-2026')?.year).toBe(2026);
    expect(byId.get('robocasa365-2026')?.venue).toBe('ICLR 2026');
    expect(byId.get('3dgs-2023')?.url).toBe('https://arxiv.org/abs/2308.04079');
    expect(byId.get('3dgs-2023')?.year).toBe(2023);
    expect(byId.get('splatsim-2024')?.url).toBe('https://arxiv.org/abs/2409.10161');
    expect(byId.get('splatsim-2024')?.year).toBe(2024);
    expect(byId.get('splatsim-2024')?.authors).toHaveLength(6);
  });

  it('leaves the formerly held frontmatter-sweep row to its own 20260917a sweep plan', () => {
    // This packet held row 15 unbound; the 20260917a frontmatter sweep later
    // bound it to its own plan, so the honest current assertion is that the
    // row carries that sweep's plan (not one of this packet's) and is complete.
    const { section, compoundPlans } = parseSection();
    const record = section.claimRecords[HELD_ORDINAL - 1];
    expect(record.compound?.planId).toBe('generative-sim-15-frontmatter-sweep-20260917a');
    expect(Object.values(EXPECTED_20260916N)).not.toContain(record.compound?.planId);
    // A frontmatter-P1 sweep row is only decidable against the article's
    // canonical frontmatter; with that context it carries no failures.
    const frontmatter = matter(
      readFileSync(join(ROOT, 'content/world-models/generative-sim.mdx'), 'utf8'),
    ).data.citations as string[];
    const withContext = parseLedger(
      'audit/world-models.md',
      readFileSync(join(ROOT, 'audit/world-models.md'), 'utf8'),
      new Set(CITATIONS.map(({ id }) => id)),
      { compoundPlans, articleCitations: { 'generative-sim': frontmatter } },
    ).find((s) => s.slug === 'generative-sim')!.claimRecords[HELD_ORDINAL - 1];
    expect(withContext.evidenceFailures).toEqual([]);
  });

  it('binds the formerly held frontmatter-sweep row to its complete plan', () => {
    const { section, compoundPlans } = parseSection();
    const record = section.claimRecords[HELD_ORDINAL - 1];
    const plan = compoundPlans.find(p => p.id === 'generative-sim-15-frontmatter-sweep-20260917a')!;
    expect(record.compound?.planId).toBe(plan.id);
    expect(plan.rowOrdinal).toBe(HELD_ORDINAL);
    expect(plan.parts).toHaveLength(8);
    expect(plan.adjudications).toHaveLength(plan.parts.length);
    expect(record.evidenceFailures).toEqual([]);
  });

  it('records integrator plan review on every 20260916n generative-sim plan', () => {
    const { compoundPlans } = parseSection();
    for (const planId of Object.values(EXPECTED_20260916N)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
