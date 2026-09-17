import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16j motion-planning originals integration: the three
 * dispatched classical/motion-planning rows (originals 1, 2 and 4 — the
 * Lozano-Pérez 1983 configuration-space reformulation, the C_obs/C_free
 * definitions and the Kavraki 1996 PRM row) must bind to their compound
 * plans and parse complete (no evidence failures) with supported
 * adjudications, from the committed ledger and catalog exactly as
 * check-audit-coverage reads them. Row 7 (kinodynamic) was completed by the
 * 2026-09-17a dispatch (registry url corrected to LavKuf01b.pdf + scalar
 * evidence; see sweeps-registry-originals.test.ts); the repo-internal
 * rrt-explorer demo-scene row 15 (compoundPlanSchema requiredCitationIds
 * min(1) constraint) stays unbound and incomplete.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '9f356ad25eba709e1817aad8719a5a488220440c2d27998b062473c65156c4cf';
const EXPECTED_20260916J: Readonly<Record<number, string>> = {
  1: 'motion-planning-1-cspace-reformulation-20260916j',
  2: 'motion-planning-2-cspace-definitions-20260916j',
  4: 'motion-planning-4-prm-20260916j',
};
const HELD_ORDINALS = [15];

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/classical.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger('audit/classical.md', markdown, registryIds, { compoundPlans });
  const motionPlanning = sections.find((section) => section.slug === 'motion-planning');
  expect(motionPlanning).toBeDefined();
  return { motionPlanning: motionPlanning!, compoundPlans };
};

describe('motion-planning originals integration (2026-09-16j evidence completions)', () => {
  it('binds the three applied motion-planning rows to complete compound evidence', () => {
    const { motionPlanning, compoundPlans } = loadSection();
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916J)) {
      const record = motionPlanning.claimRecords[Number(ordinal) - 1];
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

  it('carries the fetched-surface evidence needles in the bound rows and plans', () => {
    const { motionPlanning, compoundPlans } = loadSection();

    // Row 1: evidence completion of the standing V verdict; the sourceChecked
    // cell now records both fetched surfaces (IEEE abstract at the registered
    // DOI; the free author-hosted chapter 4 PDF of the registered book).
    const r1 = motionPlanning.claimRecords[0];
    expect(r1.sourceChecked).toContain('https://doi.org/10.1109/TC.1983.1676196');
    expect(r1.sourceChecked).toContain('https://lavalle.pl/planning/ch4.pdf');
    expect(r1.note).toContain("'as a single point in a configuration space'");
    expect(r1.note).toContain('seminal work of Lozano-Pérez [24, 26, 25]');
    expect(r1.note).toContain(
      "'Grows each obstacle by the robot's shape' is the article's wording",
    );

    // Row 2: precise source correction; the non-fetch 'standard' basis is
    // replaced by the chapter that prints the definitions verbatim, with the
    // 1983 abstract kept as the concept origin.
    const r2 = motionPlanning.claimRecords[1];
    expect(r2.sourceChecked).toContain('https://lavalle.pl/planning/ch4.pdf Sec. 4.3.1');
    expect(r2.sourceChecked).toContain('{q ∈ C | A(q) ∩ O ≠ ∅} (Eq. 4.34)');
    expect(r2.sourceChecked).toContain('https://doi.org/10.1109/TC.1983.1676196');
    expect(r2.note).toContain("'standard' removed as a non-fetch basis");

    // Row 4: precise correction; the quotation now matches the fetched
    // chapter's own chapter-local numbering [90], not the book-global [516].
    const r4 = motionPlanning.claimRecords[3];
    expect(r4.sourceChecked).toContain('https://doi.org/10.1109/70.508439');
    expect(r4.sourceChecked).toContain("'mainly introduced in [90] under the name probabilistic roadmaps (PRMs)'");
    expect(r4.sourceChecked).toContain('the fetched chapter prints [90], not the book-global [516]');
    expect(r4.note).toContain('a uniform, dense sequence α');
    expect(r4.note).toContain(
      'IEEE page prints August 1996, chapter bibliography June 1996 (disclosed)',
    );

    // Both fetched surfaces per row carry the exact passages in the plans.
    for (const planId of Object.values(EXPECTED_20260916J)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.evidence).toHaveLength(plan.parts.length);
      expect(new Set(plan.evidence.map((item) => item.partId))).toEqual(
        new Set(plan.parts.map((part) => part.id)),
      );
    }
    const byPart = (planId: string, partId: string) =>
      compoundPlans.find((p) => p.id === planId)!.evidence.find(
        (item) => item.partId === partId,
      )!;
    const mp1 = byPart(EXPECTED_20260916J[1], 'mp1-primary-abstract');
    expect(mp1.citationId).toBe('lozano-perez-1983');
    expect(mp1.sourceUrl).toBe('https://doi.org/10.1109/TC.1983.1676196');
    expect(mp1.supportingPassage).toContain('as a single point in a configuration space');
    expect(mp1.supportingPassage).toContain('called configuration space obstacles');
    const mp1book = byPart(EXPECTED_20260916J[1], 'mp1-seminal-book-credit');
    expect(mp1book.citationId).toBe('lavalle-2006');
    expect(mp1book.sourceUrl).toBe('https://lavalle.pl/planning/ch4.pdf');
    expect(mp1book.supportingPassage).toContain('seminal work of Lozano-Pérez [24, 26, 25]');
    expect(mp1book.supportingPassage).toContain('Spatial planning: A configuration space approach');
    const mp2 = byPart(EXPECTED_20260916J[2], 'mp2-definitions-textbook');
    expect(mp2.citationId).toBe('lavalle-2006');
    expect(mp2.sourceUrl).toBe('https://lavalle.pl/planning/ch4.pdf');
    expect(mp2.supportingPassage).toContain('The obstacle region, Cobs ⊆ C');
    expect(mp2.supportingPassage).toContain(
      'The leftover configurations are called the free space',
    );
    const mp2origin = byPart(EXPECTED_20260916J[2], 'mp2-concept-origin-primary');
    expect(mp2origin.citationId).toBe('lozano-perez-1983');
    expect(mp2origin.sourceUrl).toBe('https://doi.org/10.1109/TC.1983.1676196');
    expect(mp2origin.supportingPassage).toContain('called configuration space obstacles');
    const mp4 = byPart(EXPECTED_20260916J[4], 'mp4-prm-primary-abstract');
    expect(mp4.citationId).toBe('kavraki-1996');
    expect(mp4.sourceUrl).toBe('https://doi.org/10.1109/70.508439');
    expect(mp4.supportingPassage).toContain(
      'whose nodes correspond to collision-free configurations',
    );
    expect(mp4.supportingPassage).toContain('a simple and fast local planner');
    const mp4book = byPart(EXPECTED_20260916J[4], 'mp4-book-credit-and-uniform');
    expect(mp4book.citationId).toBe('lavalle-2006');
    expect(mp4book.sourceUrl).toBe('https://lavalle.pl/planning/ch5.pdf');
    expect(mp4book.supportingPassage).toContain('mainly introduced in [90]');
    expect(mp4book.supportingPassage).toContain('a uniform, dense sequence');
  });

  it('reuses the registered citations read-only, including the url-corrected lavalle-kuffner-2001 entry', () => {
    const registered = new Map(CITATIONS.map((c) => [c.id, c]));
    const lp = registered.get('lozano-perez-1983')!;
    expect(lp.url).toBe('https://doi.org/10.1109/TC.1983.1676196');
    expect(lp.year).toBe(1983);
    expect(lp.title).toBe('Spatial Planning: A Configuration Space Approach');
    const kavraki = registered.get('kavraki-1996')!;
    expect(kavraki.url).toBe('https://doi.org/10.1109/70.508439');
    expect(kavraki.year).toBe(1996);
    const lavalle = registered.get('lavalle-2006')!;
    expect(lavalle.url).toBe('https://lavalle.pl/planning/');
    expect(lavalle.year).toBe(2006);
    // The 2026-09-17a registry correction landed in this same change: the url
    // now binds the IJRR paper (LavKuf01b.pdf); title/authors/year/venue/type
    // are unchanged (ah-lane 13-consumer survey, fields-only correction).
    const lk = registered.get('lavalle-kuffner-2001')!;
    expect(lk.url).toBe('https://lavalle.pl/papers/LavKuf01b.pdf');
    expect(lk.title).toBe('Randomized Kinodynamic Planning');
  });

  it('keeps the remaining repo-internal held row unbound and evidence-incomplete', () => {
    const { motionPlanning } = loadSection();
    for (const ordinal of HELD_ORDINALS) {
      const record = motionPlanning.claimRecords[ordinal - 1];
      expect(record.compound?.planId ?? '').toBe('');
      expect(record.evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('records integrator plan review on every 20260916j motion-planning plan', () => {
    const { compoundPlans } = loadSection();
    for (const planId of Object.values(EXPECTED_20260916J)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
