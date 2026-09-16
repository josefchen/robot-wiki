/**
 * Red-first coverage for the 2026-09-15 safety-and-assurance integration
 * (frozen packet convergence-source-a-safety-assurance-20260915, zero
 * retrieval) and its 2026-09-16 remainder continuation (frozen packet
 * convergence-source-e-safety-remainder-20260916, zero retrieval): every
 * applied original row must bind an exact compound-evidence plan whose
 * paired evidence items name registered citation ids, complete
 * uncredentialed HTTP(S) URLs and substantive passages, and whose
 * original-cell digests match the live ledger rows. The 2026-09-16
 * dispatch applied the rows the 20260915 lane held or left unattempted
 * (SA5-9, SA25, SA26, SA32, SA33, SA36, SA38-40), so no row of this
 * section remains unbound, and SA40's corrected note counts 29 ids.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

const root = join(__dirname, '..', '..');
const ledger = readFileSync(join(root, 'audit/frontier.md'), 'utf8');
const plans = parseCompoundPlans(
  JSON.parse(readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')),
);
const registryIds = new Set(CITATIONS.map(({ id }) => id));

const APPLIED: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 3, planId: 'safety-assurance-20260915-safety-and-assurance-3', citations: ['iso-ts-15066'] },
  { ordinal: 10, planId: 'safety-assurance-20260915-safety-and-assurance-10', citations: ['iso-12100'] },
  { ordinal: 11, planId: 'safety-assurance-20260915-safety-and-assurance-11', citations: ['iso-12100', 'osha-otm-robots'] },
  { ordinal: 12, planId: 'safety-assurance-20260915-safety-and-assurance-12', citations: ['iso-10218-1-2025', 'iso-10218-2-2025'] },
  { ordinal: 13, planId: 'safety-assurance-20260915-safety-and-assurance-13', citations: ['iso-10218-1-2025', 'iso-10218-2-2025'] },
  { ordinal: 14, planId: 'safety-assurance-20260915-safety-and-assurance-14', citations: ['iec-61508-1-2010'] },
  { ordinal: 15, planId: 'safety-assurance-20260915-safety-and-assurance-15', citations: ['iso-13849-1-2023'] },
  { ordinal: 16, planId: 'safety-assurance-20260915-safety-and-assurance-16', citations: ['iso-13850-2015', 'iec-60204-1-2016'] },
  { ordinal: 17, planId: 'safety-assurance-20260915-safety-and-assurance-17', citations: ['iso-13850-2015', 'iso-12100'] },
  { ordinal: 19, planId: 'safety-assurance-20260915-safety-and-assurance-19', citations: ['iso-3691-4-2023'] },
  { ordinal: 20, planId: 'safety-assurance-20260915-safety-and-assurance-20', citations: ['a3-robot-safety-standards'] },
  { ordinal: 21, planId: 'safety-assurance-20260915-safety-and-assurance-21', citations: ['iso-cd-25785-1'] },
  { ordinal: 22, planId: 'safety-assurance-20260915-safety-and-assurance-22', citations: ['iso-cd-25785-1'] },
  { ordinal: 24, planId: 'safety-assurance-20260915-safety-and-assurance-24', citations: ['kalra-paddock-2016'] },
  { ordinal: 27, planId: 'safety-assurance-20260915-safety-and-assurance-27', citations: ['ul-4600-2023'] },
  { ordinal: 28, planId: 'safety-assurance-20260915-safety-and-assurance-28', citations: ['gsn-standard-v3'] },
  { ordinal: 29, planId: 'safety-assurance-20260915-safety-and-assurance-29', citations: ['gsn-standard-v3'] },
  { ordinal: 30, planId: 'safety-assurance-20260915-safety-and-assurance-30', citations: ['koopman-safe-enough-2026'] },
  { ordinal: 31, planId: 'safety-assurance-20260915-safety-and-assurance-31', citations: ['rss-2017'] },
  { ordinal: 34, planId: 'safety-assurance-20260915-safety-and-assurance-34', citations: ['knowno-2023'] },
  { ordinal: 35, planId: 'safety-assurance-20260915-safety-and-assurance-35', citations: ['sinha-anomaly-2024'] },
  { ordinal: 37, planId: 'safety-assurance-20260915-safety-and-assurance-37', citations: ['asimov-agentic-2026'] },
];

const APPLIED_20260916: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 5, planId: 'safety-remainder-20260916-safety-and-assurance-5', citations: ['marvel-norcross-2017'] },
  { ordinal: 6, planId: 'safety-remainder-20260916-safety-and-assurance-6', citations: ['marvel-norcross-2017'] },
  { ordinal: 7, planId: 'safety-remainder-20260916-safety-and-assurance-7', citations: ['haddadin-2009'] },
  { ordinal: 8, planId: 'safety-remainder-20260916-safety-and-assurance-8', citations: ['han-force-pain-2024'] },
  { ordinal: 9, planId: 'safety-remainder-20260916-safety-and-assurance-9', citations: ['han-force-pain-2024'] },
  { ordinal: 25, planId: 'safety-remainder-20260916-safety-and-assurance-25', citations: ['ames-cbf-2019'] },
  { ordinal: 26, planId: 'safety-remainder-20260916-safety-and-assurance-26', citations: ['wabersich-safety-filters-2023'] },
  { ordinal: 32, planId: 'safety-remainder-20260916-safety-and-assurance-32', citations: ['koopman-safe-enough-2026', 'rss-2017'] },
  { ordinal: 33, planId: 'safety-remainder-20260916-safety-and-assurance-33', citations: ['angelopoulos-conformal-2021', 'vovk-conformal-2022'] },
  { ordinal: 36, planId: 'safety-remainder-20260916-safety-and-assurance-36', citations: ['farid-failure-2022'] },
  { ordinal: 38, planId: 'safety-remainder-20260916-safety-and-assurance-38', citations: ['gemini-robotics-er2-2026'] },
  { ordinal: 39, planId: 'safety-remainder-20260916-safety-and-assurance-39', citations: ['koopman-safe-enough-2026', 'rss-2017'] },
  { ordinal: 40, planId: 'safety-remainder-20260916-safety-and-assurance-40', citations: ['kalra-paddock-2016'] },
];

const ALL_APPLIED = [...APPLIED, ...APPLIED_20260916];

function rowLine(ordinal: number): string {
  const prefix = `| SA${ordinal} |`;
  const matches = ledger.split('\n').filter((line) => line.startsWith(prefix));
  expect(matches, `row SA${ordinal} must appear exactly once`).toHaveLength(1);
  return matches[0];
}

function cellsOf(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

describe('safety-and-assurance 2026-09-15 integration', () => {
  it('binds every applied original to its exact compound-evidence plan', () => {
    for (const { ordinal, planId } of ALL_APPLIED) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `SA${ordinal} evidence-plan cell`).toBe(planId);
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      expect(plan!.ledgerPath).toBe('audit/frontier.md');
      expect(plan!.articleSlug).toBe('safety-and-assurance');
      expect(plan!.rowOrdinal).toBe(ordinal);
    }
  });

  it('keeps every applied plan digest aligned with the live row cells', () => {
    for (const { ordinal, planId } of ALL_APPLIED) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      const cells = cellsOf(rowLine(ordinal));
      // Header: # / Claim / Source checked / Verdict / Note / Citation ID / URL / passage / Evidence plan
      expect(
        originalClaimDigest({
          claim: cells[1], sourceChecked: cells[2], verdict: cells[3], note: cells[4],
        }),
        `SA${ordinal} live cells must digest to the plan's originalCellsDigest`,
      ).toBe(plan!.originalCellsDigest);
    }
  });

  it('requires registered citations, complete URLs and substantive passages on every evidence item', () => {
    for (const { planId, citations } of ALL_APPLIED) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      expect(
        [...new Set(plan!.parts.flatMap((part) => part.requiredCitationIds))].sort(),
        `${planId} required citations (20260916 plans may require one citation from several parts)`,
      ).toEqual([...new Set(citations)].sort());
      for (const item of plan!.evidence) {
        expect(registryIds.has(item.citationId), `${planId}/${item.partId} citation registered`).toBe(true);
        expect(item.sourceUrl).toMatch(/^https?:\/\/\S+$/);
        expect(item.sourceUrl).not.toMatch(/[@\s]/);
        expect(item.supportingPassage.trim().length, `${planId}/${item.partId} passage substantive`).toBeGreaterThan(40);
      }
      for (const review of plan!.adjudications) {
        expect(review.outcome, `${planId}/${review.partId} supported`).toBe('supported');
      }
    }
  });

  it('binds every row the 20260915 lane held to its 2026-09-16 plan', () => {
    // The 2026-09-16 dispatch applied all eight rows this suite previously
    // pinned as held; each now carries exactly its new plan binding and the
    // compound shape (empty scalar cells, evidence in the plan items).
    for (const { ordinal, planId } of APPLIED_20260916) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `SA${ordinal} evidence-plan cell`).toBe(planId);
      expect(cells[5] ?? '', `SA${ordinal} scalar citation cell stays empty in compound shape`).toBe('');
      expect(cells[6] ?? '', `SA${ordinal} scalar URL cell stays empty in compound shape`).toBe('');
      expect(cells[7] ?? '', `SA${ordinal} scalar passage cell stays empty in compound shape`).toBe('');
    }
    expect(plans.some((plan) => plan.articleSlug === 'safety-and-assurance' && !ALL_APPLIED.some(({ planId }) => planId === plan.id))).toBe(false);
  });

  it('carries the SA40 corrected note counting 29 frontmatter citation ids', () => {
    const cells = cellsOf(rowLine(40));
    expect(cells[4]).toContain('29 frontmatter citation ids');
    expect(cells[4]).not.toContain('28 frontmatter citation ids');
    expect(cells[cells.length - 1]).toBe('safety-remainder-20260916-safety-and-assurance-40');
  });
});
