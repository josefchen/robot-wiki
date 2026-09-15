/**
 * Red-first coverage for the 2026-09-15 safety-and-assurance integration
 * (frozen packet convergence-source-a-safety-assurance-20260915, zero
 * retrieval): the applied original rows must bind exact compound-evidence
 * plans whose paired evidence items name registered citation ids, complete
 * uncredentialed HTTP(S) URLs and substantive passages, and whose
 * original-cell digests match the live ledger rows. Held rows (SA9, SA25,
 * SA32, SA33, SA36, SA38, SA39) must gain no binding, and SA40's corrected
 * note must count 29 frontmatter citation ids.
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

const HELD = [9, 25, 32, 33, 36, 38, 39] as const;

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
    for (const { ordinal, planId } of APPLIED) {
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
    for (const { ordinal, planId } of APPLIED) {
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
    for (const { planId, citations } of APPLIED) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      expect(
        plan!.parts.flatMap((part) => part.requiredCitationIds).sort(),
        `${planId} required citations`,
      ).toEqual([...citations].sort());
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

  it('leaves the held rows without evidence-plan bindings', () => {
    for (const ordinal of HELD) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `SA${ordinal} must stay unbound`).toBe('');
      expect(cells[5] ?? '', `SA${ordinal} scalar citation cell`).toBe('');
    }
    expect(plans.some((plan) => plan.articleSlug === 'safety-and-assurance' && !APPLIED.some(({ planId }) => planId === plan.id))).toBe(false);
  });

  it('carries the SA40 corrected note counting 29 frontmatter citation ids', () => {
    const cells = cellsOf(rowLine(40));
    expect(cells[4]).toContain('29 frontmatter citation ids');
    expect(cells[4]).not.toContain('28 frontmatter citation ids');
    expect(cells[cells.length - 1]).toBe('');
  });
});
