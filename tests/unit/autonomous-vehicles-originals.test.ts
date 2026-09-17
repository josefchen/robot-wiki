import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-15 autonomous-vehicles originals integration: the
 * eighteen applied adjacent/autonomous-vehicles rows bound to their
 * compound plans must parse complete (no evidence failures) with supported
 * adjudications, from the committed ledger and catalog exactly as
 * check-audit-coverage reads them. Original 2 is deliberately absent: its
 * correction is fully needle-verified but its proposed registration
 * (no-hands-across-america-1995) serves over plain http only, and the locked
 * registry schema admits https URLs and dated web.archive.org captures
 * alone, so the record is held rather than unlawfully registered; the
 * ledger row carries the hold note.
 */
const ROOT = join(import.meta.dirname, '../..');
const EXPECTED: Readonly<Record<number, string>> = {
  1: 'av-1-alvinn-arch-20260915',
  3: 'av-3-waymo-crash-20260915',
  4: 'av-4-wod-20260915',
  5: 'av-5-vectornet-20260915',
  6: 'av-6-uniad-20260915',
  7: 'av-7-emma-20260915',
  8: 'av-8-chauffeurnet-20260915',
  9: 'av-9-paden-20260915',
  10: 'av-10-e2esurvey-20260915',
  11: 'av-11-sae-20260915',
  12: 'av-12-kalra-20260915',
  13: 'av-13-rss-20260915',
  14: 'av-14-koopman-20260915',
  15: 'av-15-waymo-wm-20260915',
  16: 'av-16-ntsb-20260915',
  17: 'av-17-vlaad-20260915',
  18: 'av-18-dagger-20260915',
  19: 'av-19-oxe-20260915',
};

describe('autonomous-vehicles originals integration (2026-09-15)', () => {
  it('binds all eighteen applied autonomous-vehicles rows to complete compound evidence', () => {
    const markdown = readFileSync(join(ROOT, 'audit/adjacent.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/adjacent.md', markdown, registryIds, { compoundPlans });
    const av = sections.find((section) => section.slug === 'autonomous-vehicles');
    expect(av).toBeDefined();
    for (const [ordinal, planId] of Object.entries(EXPECTED)) {
      const record = av!.claimRecords[Number(ordinal) - 1];
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

  it('records integrator plan review on every new autonomous-vehicles plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const planId of Object.values(EXPECTED)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain('78203bf030d34fc8184f579d0972cbbd7079caa6ebabe732e23061806356ce4a');
    }
  });
});
describe('autonomous-vehicles originals: 20260917a row 2 completion (No Hands Across America)', () => {
  const PLAN_ID = 'av-2-nhaa-tour-20260917a';

  /**
   * The superseded 2026-09-15 hold, pinned verbatim. The claim and source
   * cells survive the completion unchanged; the verdict and note were
   * replaced, so all four original cells are recorded here exactly as the
   * 2026-09-15 integrator left them. The https-availability blocker named by
   * the hold was removed on 2026-09-17 (preparer re-verified the tour pages
   * over https, no redirect), which is why the row is complete now.
   */
  const SUPERSEDED_CELLS = {
    claim: 'ALVINN "drove it across America in a demonstration tour"',
    source:
      'CMU No Hands Across America pages (cs.cmu.edu/~tjochem/nhaa): the cross-country tour is the 1995 Navlab 5 run steered by the ALVINN-lineage RALPH system; ALVINN 1988 itself is the road-following network',
    verdict:
      "V (the sentence compresses the lineage; the 1988 paper is the architecture citation and the tour is the ALVINN program's demonstration, consistent with the Navlab record)",
    note:
      'HELD 2026-09-15 (integrator, record 2 of 19): the packet correction is real and fully needle-verified against the retained live fetches (RALPH steered No Hands Across America 1995, 2797/2849 miles, 98.2%), but the required registration no-hands-across-america-1995 serves over plain http only and the locked registry schema admits https URLs and dated web.archive.org captures alone (data/schemas/citation.ts); constructing a capture identity without a fetch would invent one, and this integrator performs zero retrieval. The P3 defect (tour attributed to the 1988 alvinn-1988 citation) remains open pending an owner-sanctioned registration route. See lane passage-verification.json and handoff.json.',
  };

  it('binds the completed tour row to a complete compound plan that pins the row as it stands', () => {
    const markdown = readFileSync(join(ROOT, 'audit/adjacent.md'), 'utf8');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/adjacent.md', markdown, registryIds, { compoundPlans });
    const av = sections.find((section) => section.slug === 'autonomous-vehicles')!;
    const record = av.claimRecords[1];
    expect(record.claim).toBe(SUPERSEDED_CELLS.claim);
    expect(record.sourceChecked).toBe(SUPERSEDED_CELLS.source);
    expect(record.compound?.planId ?? '').toBe(PLAN_ID);
    expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
    expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
    expect(record.evidenceFailures).toEqual([]);
    const plan = compoundPlans.find((p) => p.id === PLAN_ID)!;
    expect(plan.adjudications.map((a) => a.outcome)).toEqual(
      plan.parts.map(() => 'supported'),
    );
    expect(originalClaimDigest(record)).toBe(plan.originalCellsDigest);
  });

  it('replaces the superseded hold with the tour record', () => {
    const markdown = readFileSync(join(ROOT, 'audit/adjacent.md'), 'utf8');
    expect(markdown).not.toContain(SUPERSEDED_CELLS.note);
    expect(markdown).not.toContain('remains open pending an owner-sanctioned registration route');
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const registryIds = new Set(CITATIONS.map(({ id }) => id));
    const sections = parseLedger('audit/adjacent.md', markdown, registryIds, { compoundPlans });
    const record = sections.find((s) => s.slug === 'autonomous-vehicles')!.claimRecords[1];
    expect(record.verdict).toContain('steered by RALPH with 98.2% of miles autonomous');
    expect(record.note).toContain(
      'Evidence completion 2026-09-17 (integrator, lane convergence-aq-books-industrial-integration-20260917a)',
    );
    expect(record.note).toContain('registered in data/citations.ts');
  });

  it('registers no-hands-across-america-1995 at the schema-valid https URL', () => {
    const registered = CITATIONS.filter(({ id }) => id === 'no-hands-across-america-1995');
    expect(registered).toHaveLength(1);
    expect(registered[0].url).toBe('https://www.cs.cmu.edu/~tjochem/nhaa/nhaa_home_page.html');
  });

  it('re-cites the tour span in the article and fixes the P3 defect', () => {
    const article = readFileSync(join(ROOT, 'content/adjacent/autonomous-vehicles.mdx'), 'utf8');
    expect(article).toContain(
      'In 1988, ALVINN trained a three-layer neural network to steer a van from images from a camera and a laser range finder <Cite id="alvinn-1988" />. Its lineage went on to steer a van across America: in the 1995 No Hands Across America tour, the ALVINN-lineage RALPH program did the steering for 2,797 of 2,849 miles, 98.2 percent of the run, while the human researchers handled the throttle and brake <Cite id="no-hands-across-america-1995" />',
    );
    // the tour is no longer attributed to the 1988 paper citation
    expect(article).not.toContain('and drove it across America in a demonstration tour');
    // frontmatter declares the new id directly after alvinn-1988
    expect(article).toContain('  - alvinn-1988\n  - no-hands-across-america-1995\n');
  });

  it('records integrator plan review against the frozen AO packet', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    const plan = compoundPlans.find((p) => p.id === PLAN_ID)!;
    expect(plan.planReview?.reviewedBy).toContain('convergence-aq integrator');
    expect(plan.planReview?.reviewedBy).toContain('not independent acceptance');
    expect(plan.planReview?.rationale).toContain(
      'ca1245a0c832c4f103779536c07cac10316eaf369c06351090ecb334cfb66da6',
    );
  });
});
