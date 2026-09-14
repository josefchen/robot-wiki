import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import {
  compoundPartDigest,
  compoundPlanDigest,
  originalClaimDigest,
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';

const article = readFileSync('content/manipulation/hierarchical.mdx', 'utf8');
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const articleCitations = { hierarchical: matter(article).data.citations as string[] };
const records = parseLedger('audit/manipulation.md', ledger, ids, { compoundPlans: plans, articleCitations })
  .find(s => s.slug === 'hierarchical')!.claimRecords;
const selected = [6, 7].map(n => ({
  ordinal: n,
  row: records[n - 1],
  plan: plans.find(p => p.ledgerPath === 'audit/manipulation.md' && p.articleSlug === 'hierarchical' && p.rowOrdinal === n)!,
}));

function fixture(index: number, mutate: (p: CompoundPlan) => void) {
  const { row, plan } = selected[index];
  const p = structuredClone(plan);
  p.rowOrdinal = 1;
  p.planReview!.planDigest = compoundPlanDigest(p);
  for (const a of p.adjudications) a.evidenceDigest = compoundPartDigest(p, a.partId);
  mutate(p);
  const cells = ['H', row.claim, row.sourceChecked, row.verdict, row.note, '', '', '', p.id]
    .map(v => v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' '));
  return parseLedger('audit/manipulation.md', [
    '## hierarchical.mdx',
    '| # | Claim (quoted) | Source checked | Verdict | Note | Citation ID | Source URL fetched | Supporting passage | Evidence plan |',
    '|---|---|---|---|---|---|---|---|---|',
    '| ' + cells.join(' | ') + ' |',
  ].join('\n'), ids, { compoundPlans: [p], articleCitations })[0].claimRecords[0];
}

describe('ECoT and Hi Robot whole-current-claim corrections', () => {
  it('completes exactly the two bound originals without changing the hierarchy population', () => {
    expect(records).toHaveLength(16);
    for (const [i, { row, plan, ordinal }] of selected.entries()) {
      expect(plan, `original ${ordinal} reviewed plan`).toBeDefined();
      expect(row.verdict).toBe('corrected');
      expect(row.evidenceFailures).toEqual([]);
      expect(plan.originalCellsDigest).toBe(originalClaimDigest(row));
      expect(plan.parts).toHaveLength(7 + i);
      expect(plan.evidence).toHaveLength(7 + i);
      expect(plan.adjudications).toHaveLength(7 + i);
      expect(plan.planReview!.planDigest).toBe(compoundPlanDigest(plan));
      for (const a of plan.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(plan, a.partId));
      }
    }
  });

  it('distinguishes physical data, percentage points, matched baseline, and separate recipes', () => {
    expect(article).toContain('synthetic reasoning annotations to existing Bridge V2');
    expect(article).toContain('not new physical robot trajectories');
    expect(article).toContain('28-percentage-point absolute');
    expect(article).toContain('66% versus 44%');
    expect(article).toContain('64% versus 30%');
    expect(article).toContain('314 trials per approach');
    expect(article).toContain('one standard error');
    expect(article).toContain('fixed for five steps');
    expect(article).toContain('not the recipe behind the main Table 1');
    expect(article).not.toContain('Making that internal reasoning cheap is what the 2025-2026 systems figured out');
    const score = selected[0].plan.evidence.find(e => e.partId === 'score-and-baseline')!;
    expect(score.supportingPassage).toContain('by 28% across challenging generalization tasks');
    expect(score.sourceUrl).toBe('https://arxiv.org/pdf/2407.08693');
  });

  it('preserves Hi Robot scheduling, separate policies, scope, and execution limits', () => {
    for (const text of ['two separately trained policies', 'one second has elapsed or new human feedback',
      'transcribed speech', 'signal a return to the prior task', 'separate high-level policy',
      'table bussing, sandwich making and grocery shopping', 'missing high-level memory',
      'low-level instruction violations', 'recovering from dropped objects']) expect(article).toContain(text);
    expect(article).not.toContain('transitional form between SayCan and π0.5');
    expect(article).toContain('<Stat label="learned hierarchies" value="2025" note="Hi Robot, π0.5" />');
    expect(matter(article).data.lastReviewed).toBe('2026-08-17');
    expect(selected[1].plan.adjudications.find(a => a.partId === 'inputs-outputs')!.rationale)
      .toContain('caption conflicts');
  });

  it('retains original four-cell history without counting legacy verified labels as new originals', () => {
    expect(ledger).toContain('unchanged');
    expect(ledger).toContain('"originalId": "audit/manipulation.md:hierarchical:6"');
    expect(ledger).toContain('"originalId": "audit/manipulation.md:hierarchical:7"');
    for (const { row } of selected) {
      expect(row.sourceChecked).toContain('review2026-09-14 is not retrieval');
      expect(row.note).toContain('non-counted');
    }
  });

  for (const index of [0, 1]) {
    it(`rejects missing/stale review, tuple, source, evidence and duplicate for original ${index + 6}`, () => {
      expect(fixture(index, () => {}).evidenceFailures).toEqual([]);
      for (const mutate of [
        (p: CompoundPlan) => { p.planReview = null; },
        (p: CompoundPlan) => { p.planReview!.planDigest = '0'.repeat(64); },
        (p: CompoundPlan) => { p.originalCellsDigest = '0'.repeat(64); },
        (p: CompoundPlan) => { p.evidence[0].sourceUrl = 'https://example.org/wrong'; },
        (p: CompoundPlan) => { p.evidence[0].supportingPassage += ' unsupported'; },
        (p: CompoundPlan) => { p.evidence.push(p.evidence[0]); },
      ]) expect(fixture(index, mutate).evidenceFailures.length).toBeGreaterThan(0);
    });
    it(`requires every mandatory part's evidence and adjudication for original ${index + 6}`, () => {
      for (const part of selected[index].plan.parts) {
        expect(fixture(index, p => { p.evidence = p.evidence.filter(e => e.partId !== part.id); }).evidenceFailures.length).toBeGreaterThan(0);
        expect(fixture(index, p => { p.adjudications = p.adjudications.filter(a => a.partId !== part.id); }).evidenceFailures.length).toBeGreaterThan(0);
      }
    });
  }
});
