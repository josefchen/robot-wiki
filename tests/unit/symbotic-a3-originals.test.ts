import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import { committedSource } from '../helpers/continuation-integration';
import {
  compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const ordinals = [19, 20, 21, 39, 40, 14, 50];
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const selected = ordinals.map(n => plans.find(p => p.ledgerPath === 'audit/data-hardware.md'
  && p.articleSlug === 'industrial-deployment' && p.rowOrdinal === n));
const localBasis = loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`));
const parse = (catalog = plans, includeLocal = false) => parseLedger('audit/data-hardware.md', ledger,
  new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog, ...(includeLocal ? { localBasis } : {}) })
  .find(s => s.slug === 'industrial-deployment')!;
const expectedUrls: Record<string, string> = {
  'symbotic-10k-2025': 'https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm',
  'osha-otm-robots': 'https://www.osha.gov/otm/section-4-safety-hazards/chapter-4',
  'a3-orders-2025': 'https://www.automate.org/robotics/news/robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption',
};

describe('seven Symbotic and A3 industrial originals', () => {
  it('requires seven exact originals and all twenty mandatory parts and pairs', () => {
    expect(selected.every(Boolean)).toBe(true);
    expect(selected.map(p => p?.parts.length)).toEqual([3, 1, 3, 4, 1, 5, 3]);
    expect(selected.reduce((n, p) => n + p!.evidence.length, 0)).toBe(20);
    expect(selected.reduce((n, p) => n + p!.parts.reduce((m, t) => m + t.requiredCitationIds.length, 0), 0)).toBe(20);
    for (const n of ordinals) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
  });

  it('binds every review to the current whole plan and actual part evidence', () => {
    expect(selected.every(Boolean)).toBe(true);
    for (const p of selected) {
      expect(p!.planReview?.planDigest).toBe(compoundPlanDigest(p!));
      expect(p!.planReview?.reviewedBy).toContain('integrator');
      expect(p!.planReview?.reviewedBy).not.toContain('SYNTHETIC');
      expect(p!.adjudications).toHaveLength(p!.parts.length);
      for (const a of p!.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p!, a.partId));
      }
    }
  });

  it('rejects every missing pair and stale tuple, review, evidence or adjudication', () => {
    expect(selected.every(Boolean)).toBe(true);
    for (const p of selected) {
      for (let i = 0; i < p!.evidence.length + 4; i++) {
        const changed = structuredClone(plans);
        const target = changed.find(x => x.id === p!.id)!;
        if (i < target.evidence.length) target.evidence.splice(i, 1);
        else if (i === p!.evidence.length) target.originalCellsDigest = '0'.repeat(64);
        else if (i === p!.evidence.length + 1) target.planReview = null;
        else if (i === p!.evidence.length + 2) target.evidence[0].supportingPassage += ' changed';
        else target.adjudications.pop();
        expect(parse(changed).claimRecords[p!.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    }
  });

  it('requires OSHA and Symbotic separately for original39 and exact source URLs', () => {
    expect(selected.every(Boolean)).toBe(true);
    const p = selected.find(p => p?.rowOrdinal === 39)!;
    expect(p.parts.map(t => t.requiredCitationIds)).toEqual([
      ['osha-otm-robots'], ['osha-otm-robots'], ['osha-otm-robots'], ['symbotic-10k-2025'],
    ]);
    for (const plan of selected) for (const e of plan!.evidence) {
      expect(e.sourceUrl).toBe(expectedUrls[e.citationId]);
      expect(e.sourceUrl).toBe(CITATIONS.find(c => c.id === e.citationId)?.url);
    }
  });

  it('distinguishes dated approximate backlog from exact annual revenue and earned revenue', () => {
    expect(article).toContain('approximately \\$22.5 billion of backlog as of September 27, 2025');
    expect(article).toContain('\\$2.246922 billion of total revenue for the fiscal year ended that day');
    expect(article).toContain('unperformed obligations under existing contracts, not revenue already earned');
    expect(article).not.toContain('\\$2.247 billion of annual revenue');
    expect(2246922 / 1000000).toBe(2.246922);
  });

  it('keeps Walmart contractual scope separate from operating sites and counts from duration', () => {
    expect(article).toContain('expanded in May 2022');
    expect(article).toContain('all 42 regional distribution centres');
    expect(article).toContain('contractual scope, not a count of operating sites');
    expect(article).toContain('50 systems in deployment and 48 operational systems under software maintenance and support contracts');
    expect(article).toContain('It then expected approximately 12 percent');
    expect(article).toContain('a revenue-recognition forecast, not an order-to-running duration');
    expect(article).toContain('estimates can change with terminations, contract scope');
    expect(article).not.toContain('neither the build-out nor the unwind is fast');
  });

  it('preserves multiyear cost countercontext without inventing each system installation duration', () => {
    expect(selected.every(Boolean)).toBe(true);
    const p = selected.find(p => p?.rowOrdinal === 21)!;
    expect(p.evidence.find(e => e.partId === 'backlog12-forecast-and-risk')?.supportingPassage)
      .toContain('Contract costs are incurred over a period of time, which can span multiple years');
    expect(parse().claimRecords[20].note).toContain('Do not sum 50 and 48');
  });

  it('removes scheduling exemption, universal closure and parallel-flow claims', () => {
    const brownfield = article.split('## Brownfield versus greenfield')[1].split('## The labour')[0];
    expect(brownfield).toContain('non-collaborative robot applications during automatic operation');
    expect(brownfield).toContain('reduced-speed manual mode with an enabling device');
    expect(brownfield).toContain('29 CFR 1910.147 or 29 CFR 1910.333');
    expect(brownfield).toContain('Separately, Symbotic');
    expect(brownfield).toContain('company-reported capability, not a guarantee for every retrofit');
    expect(brownfield).not.toMatch(/schedule cannot stop|flows in parallel|cannot close to be rebuilt/);
  });

  it('publishes the A3 annual North American order population and distinct shares', () => {
    expect(article).toContain("In A3's North American order data for 2025");
    for (const value of ['7,212', '\\$241 million', '19.6 percent of the 36,766 robots ordered',
      '10.7 percent of the \\$2.25 billion in order value', 'distinct category in Q1 2025']) {
      expect(article).toContain(value);
    }
    expect(article).not.toContain('lower-volume shops rather than replacing it with learned policies');
    expect((7212 / 36766 * 100).toFixed(1)).toBe('19.6');
    expect((241 / 2250 * 100).toFixed(1)).toBe('10.7');
  });

  it('keeps the already-correct A3 bibliography and literal date separate from normalization', () => {
    const c = CITATIONS.find(c => c.id === 'a3-orders-2025')!;
    expect(c.title).toBe('Robot Orders Grow 6.6% in 2025 as General Industries Drive Broader Automation Adoption');
    expect(c.authors).toEqual(['Association for Advancing Automation']);
    expect(c.year).toBe(2026);
    expect(c.venue).toBe('A3, 2026-02-06');
    expect(c.url).toBe(expectedUrls[c.id]);
    expect(selected.every(Boolean)).toBe(true);
    const p = selected.find(p => p?.rowOrdinal === 50)!;
    expect(p.evidence.find(e => e.partId === 'displayed-publication')?.supportingPassage).toBe('02/06/2026');
  });

  it('preserves completed peers and original 8, the original 52 hold, citation union and review date', () => {
    for (const n of [1, 2, 3, 4, 13, 27, 28]) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
    // Row 8 stays complete. Row 52 retains its genuine correction but is held:
    // the September 17 scalar EVST passage did not prove the authored part.
    expect(parse().claimRecords[7].evidenceFailures).toEqual([]);
    const historical = parseLedger('audit/data-hardware.md',
      committedSource('9e4441e', 'audit/data-hardware.md'), new Set(CITATIONS.map(c => c.id)),
      { compoundPlans: plans }).find(s => s.slug === 'industrial-deployment')!;
    expect(historical.claimRecords[51].evidenceFailures).toContain(
      'Supporting passage must contain the passage actually read, not a locator or placeholder',
    );
    const current = parse(plans, true).claimRecords[51];
    expect(current.evidenceFailures).toEqual([]);
    expect(current.outcome).toBe('passing');
    expect(article).toContain('lastReviewed: "2026-08-22"');
    const citations = article.split('citations:\n')[1].split('seeAlso:')[0];
    expect(citations.match(/^  - /gm)).toHaveLength(22);
    expect(citations).toContain('  - nasa-availability-prediction-analysis');
    expect(CITATIONS.find(c => c.id === 'osha-otm-robots')?.year).toBe(2026);
  });
});
