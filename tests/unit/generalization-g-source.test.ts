/**
 * Red-first coverage for the 2026-09-15 generalization integration (frozen
 * packet convergence-source-b-generalization-20260915, zero retrieval): the
 * 20 applied originals must bind exact compound-evidence plans whose paired
 * evidence items name registered citation ids, complete uncredentialed
 * HTTP(S) URLs and substantive passages — where the packet's passage table
 * sliced a fetched PDF at a mid-number window boundary, the passage must be
 * the full sentence from the retained hash-verified fetch, carrying the
 * load-bearing figures. G17 (Goldberg/Berkeley interview) is held by a
 * separate mission hold and must gain no binding. The three article
 * endpoints (G2 first-training-phase qualifier, G15 On-Device 2
 * attribution, G18 Bessemer own-terms gloss) must be applied exactly.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCompoundPlans, originalClaimDigest } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

const root = join(__dirname, '..', '..');
const ledger = readFileSync(join(root, 'audit/frontier.md'), 'utf8');
const article = readFileSync(join(root, 'content/frontier/generalization.mdx'), 'utf8');
const plans = parseCompoundPlans(
  JSON.parse(readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')),
);
const registryIds = new Set(CITATIONS.map(({ id }) => id));

const APPLIED: ReadonlyArray<{
  readonly ordinal: number;
  readonly planId: string;
  readonly citations: readonly string[];
}> = [
  { ordinal: 1, planId: 'generalization-g1-pi05-eval-20260915', citations: ['pi05-2025'] },
  { ordinal: 2, planId: 'generalization-g2-pi05-mixture-20260915', citations: ['pi05-2025'] },
  { ordinal: 3, planId: 'generalization-g3-pi05-control-20260915', citations: ['pi05-2025'] },
  { ordinal: 4, planId: 'generalization-g4-pi05-ablation-20260915', citations: ['pi05-2025'] },
  { ordinal: 5, planId: 'generalization-g5-pi07blog-airfryer-20260915', citations: ['pi07-blog-2026'] },
  { ordinal: 6, planId: 'generalization-g6-pi07blog-earlysigns-20260915', citations: ['pi07-blog-2026'] },
  { ordinal: 7, planId: 'generalization-g7-pi07-laundry-20260915', citations: ['pi07-2026'] },
  { ordinal: 8, planId: 'generalization-g8-pi07-bag-20260915', citations: ['pi07-2026'] },
  { ordinal: 9, planId: 'generalization-g9-pi07-embodiment-20260915', citations: ['pi07-2026'] },
  { ordinal: 10, planId: 'generalization-g10-local-crossings-20260915', citations: ['egoscale-2026'] },
  { ordinal: 11, planId: 'generalization-g11-egoscale-law-quirk-20260915', citations: ['egoscale-2026'] },
  { ordinal: 12, planId: 'generalization-g12-egoscale-figures-20260915', citations: ['egoscale-2026'] },
  { ordinal: 13, planId: 'generalization-g13-egoscale-display-units-20260915', citations: ['egoscale-2026'] },
  { ordinal: 14, planId: 'generalization-g14-gr00t-egoscale-20260915', citations: ['isaac-gr00t-repo-2026'] },
  { ordinal: 15, planId: 'generalization-g15-gr2-ondevice-20260915', citations: ['gemini-robotics-2-2026'] },
  { ordinal: 16, planId: 'generalization-g16-karcini-position-20260915', citations: ['karcini-position-2026'] },
  { ordinal: 18, planId: 'generalization-g18-bessemer-scaling-20260915', citations: ['bessemer-robotics-2026'] },
  { ordinal: 19, planId: 'generalization-g19-editorial-scoping-20260915', citations: ['pi05-2025', 'pi07-2026', 'egoscale-2026'] },
  { ordinal: 20, planId: 'generalization-g20-statbox-and-20260915', citations: ['egoscale-2026'] },
  { ordinal: 21, planId: 'generalization-g21-local-bar-crossing-20260915', citations: ['egoscale-2026'] },
];

/** Passage-table slices that cut a load-bearing number mid-token: the
 * applied evidence must carry the full sentence from the retained fetch. */
const FULL_SENTENCE_REQUIREMENTS: ReadonlyArray<{
  readonly planId: string;
  readonly partId: string;
  readonly mustContain: readonly string[];
}> = [
  { planId: 'generalization-g2-pi05-mixture-20260915', partId: 'g2-976',
    mustContain: ['97.6% during the first training phase'] },
  { planId: 'generalization-g7-pi07-laundry-20260915', partId: 'g7-model-figures',
    mustContain: ['85.6% task progress and an 80% success rate'] },
  { planId: 'generalization-g7-pi07-laundry-20260915', partId: 'g7-human-figures',
    mustContain: ['90.9% task progress and an 80.6% success rate'] },
  { planId: 'generalization-g10-local-crossings-20260915', partId: 'g10-points',
    mustContain: ['0.30 at 1k hours to 0.71 at 20k hours'] },
  { planId: 'generalization-g12-egoscale-figures-20260915', partId: 'g12-completion',
    mustContain: ['0.30 at 1k hours to 0.71 at 20k hours'] },
  { planId: 'generalization-g19-editorial-scoping-20260915', partId: 'g19-pi07-basis',
    mustContain: ['80% success rate'] },
  { planId: 'generalization-g19-editorial-scoping-20260915', partId: 'g19-ego-basis',
    mustContain: ['0.71 at 20k hours'] },
  { planId: 'generalization-g20-statbox-and-20260915', partId: 'g20-completion',
    mustContain: ['0.30 at 1k hours to 0.71 at 20k hours'] },
  { planId: 'generalization-g21-local-bar-crossing-20260915', partId: 'g21-points',
    mustContain: ['0.30 at 1k hours to 0.71 at 20k hours'] },
];

function rowLine(ordinal: number): string {
  const prefix = `| G${ordinal} |`;
  const matches = ledger.split('\n').filter((line) => line.startsWith(prefix));
  expect(matches, `row G${ordinal} must appear exactly once`).toHaveLength(1);
  return matches[0];
}

function cellsOf(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

describe('generalization 2026-09-15 integration', () => {
  it('binds every applied original to its exact compound-evidence plan', () => {
    for (const { ordinal, planId } of APPLIED) {
      const cells = cellsOf(rowLine(ordinal));
      expect(cells[cells.length - 1], `G${ordinal} evidence-plan cell`).toBe(planId);
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      expect(plan!.ledgerPath).toBe('audit/frontier.md');
      expect(plan!.articleSlug).toBe('generalization');
      expect(plan!.rowOrdinal).toBe(ordinal);
    }
  });

  it('keeps every applied plan digest aligned with the live row cells', () => {
    for (const { ordinal, planId } of APPLIED) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      const cells = cellsOf(rowLine(ordinal));
      expect(
        originalClaimDigest({
          claim: cells[1], sourceChecked: cells[2], verdict: cells[3], note: cells[4],
        }),
        `G${ordinal} live cells must digest to the plan's originalCellsDigest`,
      ).toBe(plan!.originalCellsDigest);
    }
  });

  it('requires registered citations, complete URLs and substantive passages on every evidence item', () => {
    for (const { planId, citations } of APPLIED) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      expect(
        [...new Set(plan!.parts.flatMap((part) => part.requiredCitationIds))].sort(),
        `${planId} required citations`,
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

  it('carries full sentences, not mid-number window slices, where the packet passage table cut a figure', () => {
    for (const { planId, partId, mustContain } of FULL_SENTENCE_REQUIREMENTS) {
      const plan = plans.find((candidate) => candidate.id === planId);
      expect(plan, planId).toBeDefined();
      const items = plan!.evidence.filter((item) => item.partId === partId);
      expect(items.length, `${planId}/${partId}`).toBeGreaterThan(0);
      for (const fragment of mustContain) {
        expect(
          items.some((item) => item.supportingPassage.includes(fragment)),
          `${planId}/${partId} passage must contain "${fragment}"`,
        ).toBe(true);
      }
    }
  });

  it('leaves the held Goldberg row (G17) without an evidence-plan binding', () => {
    const cells = cellsOf(rowLine(17));
    expect(cells.length, 'G17 must keep its un-upgraded 5-column form').toBe(5);
    expect(
      cells[4],
      'G17 must keep its original held note, not gain an evidence plan',
    ).toContain('Good old-fashioned engineering');
    expect(
      plans.some((plan) => plan.articleSlug === 'generalization' && !APPLIED.some(({ planId }) => planId === plan.id)),
      'no generalization plan may exist beyond the 20 applied',
    ).toBe(false);
  });

  it('preserves the S verdicts and the S1 quirk register against literal-reading correction', () => {
    for (const ordinal of [11, 13]) {
      expect(cellsOf(rowLine(ordinal))[3], `G${ordinal} stays S`).toBe('S');
    }
    expect(ledger).toContain('Do not "correct" the article to the literal reading');
    expect(article).toContain('$D$ in thousands of hours');
  });

  it('applies the three article endpoints exactly', () => {
    expect(article).toContain('97.6% of the training examples in the first training phase come from somewhere else');
    expect(article).not.toContain('97.6% of the training examples come from somewhere else');
    expect(article).toContain('its Gemini Robotics On-Device 2 model adapts to new bi-arm robot embodiments with just a few hours of adaptation time, typically with less than 200 examples, a vendor-reported figure');
    expect(article).not.toContain('for Gemini Robotics 2, which adapts to new bi-arm embodiments with fewer than 200 examples in a few hours');
    expect(article).toContain('arguing that scaling laws are beginning to show up in robotics data');
    expect(article).toContain('"not years away"');
    expect(article).not.toContain('arguing the capability curve is steep');
  });
});
