import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
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
