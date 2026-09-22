import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const ordinals = [1, 2, 3, 4, 13];
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const selected = plans.filter(p => p.ledgerPath === 'audit/data-hardware.md'
  && p.articleSlug === 'industrial-deployment' && ordinals.includes(p.rowOrdinal));
const parse = (catalog = plans) => parseLedger('audit/data-hardware.md', ledger,
  new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog })
  .find(s => s.slug === 'industrial-deployment')!;
const opening = article.split('\n## The economics')[0];
const uses = article.split('## What is actually automated at scale')[1].split('\n\n')[1];

describe('five IFR and OSHA industrial originals', () => {
  it('binds exactly the five original identities and all sixteen parts / nineteen pairs', () => {
    expect(selected.map(p => p.rowOrdinal)).toEqual(ordinals);
    expect(selected.map(p => p.parts.length)).toEqual([1, 2, 6, 4, 3]);
    expect(selected.reduce((n, p) => n + p.evidence.length, 0)).toBe(19);
    expect(selected.reduce((n, p) => n
      + p.parts.reduce((m, part) => m + part.requiredCitationIds.length, 0), 0)).toBe(19);
    for (const n of ordinals) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
    expect(parse().claimRecords[2].outcome).toBe('recorded-inconsistency');
  });

  it('binds actual final reviews to every mandatory current part', () => {
    expect(selected).toHaveLength(5);
    for (const p of selected) {
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.planReview?.reviewedBy).toContain('integrator');
      expect(p.adjudications).toHaveLength(p.parts.length);
      for (const review of p.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(p, review.partId));
      }
    }
  });

  it('rejects deletion of each source pair, including both rank-cut sources', () => {
    expect(selected).toHaveLength(5);
    for (const p of selected) for (const e of p.evidence) {
      const changed = structuredClone(plans);
      const target = changed.find(x => x.id === p.id)!;
      target.evidence = target.evidence.filter(x => x !== target.evidence.find(v =>
        v.partId === e.partId && v.citationId === e.citationId));
      expect(parse(changed).claimRecords[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('rejects missing adjudications and stale tuple, passage and whole-plan review', () => {
    expect(selected).toHaveLength(5);
    for (const p of selected) for (const mutation of ['adjudication', 'tuple', 'passage', 'review']) {
      const changed = structuredClone(plans);
      const target = changed.find(x => x.id === p.id)!;
      if (mutation === 'adjudication') target.adjudications.pop();
      if (mutation === 'tuple') target.originalCellsDigest = '0'.repeat(64);
      if (mutation === 'passage') target.evidence[0].supportingPassage += ' altered';
      if (mutation === 'review') target.planReview = null;
      expect(parse(changed).claimRecords[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('rejects the wrong source even with a refreshed evidence digest', () => {
    expect(selected).toHaveLength(5);
    for (const p of selected) {
      const changed = structuredClone(plans);
      const target = changed.find(x => x.id === p.id)!;
      target.evidence[0].citationId = 'act-aloha-2023';
      for (const a of target.adjudications) a.evidenceDigest = compoundPartDigest(target, a.partId);
      expect(parse(changed).claimRecords[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
    for (const p of selected) for (const e of p.evidence) {
      expect(e.sourceUrl).toBe(CITATIONS.find(c => c.id === e.citationId)?.url);
    }
  });

  it('keeps stock, annual flow and the four explicit years distinct in prose and Stats', () => {
    expect(opening).toContain('global operational stock of 4,663,698 industrial robots in 2024');
    expect(opening).toContain('each year from 2021 through 2024');
    expect(opening).toContain('with 542,076 installed in 2024');
    expect(opening).toContain('value="4,663,698"');
    expect(opening).toContain('note="2021-2024 each above 500k"');
    expect(opening).not.toContain('value="4.66M"');
    expect(opening).not.toMatch(/2021[^.\n]*517,385/);
  });

  it('represents both automotive percentages without substituting arithmetic for the source', () => {
    expect(opening).toContain('128,899 installations (reported as 24 percent)');
    expect(opening).toContain('automotive for 126,088');
    expect(opening).toContain('88,777 (16 percent)');
    expect(opening).toContain('23 percent on page 13 but 24 percent on page 16');
    expect(opening).toContain('customer-industry categories, not application families');
    expect(opening).toContain('unspecified for 14 percent');
    const p = selected.find(p => p.rowOrdinal === 3)!;
    expect(p).toBeDefined();
    const conflict = p.evidence.find(e => e.partId === 'automotive-conflict')!.supportingPassage;
    expect(conflict).toContain('23% share');
    expect(conflict).toContain('24% in 2024');
  });

  it('scopes exact China/Japan counts and rounded share to 2024, not the release date', () => {
    expect(opening).toContain('In 2024, China had 2,027,190');
    expect(opening).toContain('Japan had 450,530');
    expect(opening).toContain('about 4.5 times the stock of Japan');
    expect(opening).toContain('295,045 new installations that year');
    expect(opening).toContain("IFR's May 5, 2026 release repeats");
    expect(opening).toContain('note="of global installations in 2024"');
    expect(opening).not.toContain('4.5 times more');
  });

  it('retains non-exhaustive OSHA uses and cuts the secondary worldwide ranking', () => {
    expect(uses).toContain('OSHA’s Technical Manual lists uses');
    expect(uses).toContain('including arc and resistance welding');
    expect(uses).toContain('machine-tool loading and unloading');
    expect(uses).not.toContain('among the largest installation categories worldwide');
    expect(uses).not.toContain('<Cite id="evst-cell-cost-2026"');
    const p = selected.find(p => p.rowOrdinal === 13)!;
    expect(p).toBeDefined();
    expect(p.parts.map(x => [x.id, x.requiredCitationIds])).toEqual([
      ['retained-osha-uses', ['osha-otm-robots']],
      ['source-scoped-rank-cut', ['ifr-world-robotics-2025', 'evst-cell-cost-2026']],
      ['customer-industry-scope', ['ifr-world-robotics-2025']],
    ]);
    expect(p.evidence.find(e => e.citationId === 'evst-cell-cost-2026')?.supportingPassage)
      .toContain('According to the International Federation of Robotics');
  });

  it('uses the report suggested bibliography without creator-credit or publication-day inference', () => {
    const citation = CITATIONS.find(c => c.id === 'ifr-world-robotics-2025')!;
    expect(citation.title).toBe('World Robotics 2025 – Industrial Robots');
    expect(citation.authors).toEqual(['Christopher Müller']);
    expect(citation.year).toBe(2025);
    expect(citation.venue).toBe('IFR Statistical Department, VDMA Services GmbH, Frankfurt am Main, Germany');
    expect(citation.venue).not.toContain('2025-09-25');
  });

  it('preserves the peer pair, completed original 8, held original 52 and old review date', () => {
    // Row 8 stays complete. EVST cannot resolve row 52's named authored-proof
    // hold; the genuine component correction is not source completion.
    expect(parse().claimRecords[7].evidenceFailures).toEqual([]);
    expect(parse().claimRecords[51].evidenceFailures).toContain(
      'Supporting passage must contain the passage actually read, not a locator or placeholder',
    );
    for (const n of [27, 28]) expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
    expect(article).toContain('lastReviewed: "2026-08-22"');
    expect(article).toContain('value="~5,500" note="Unitree, its own figure"');
    expect(article).toContain('with little or no perception worth the name');
    expect(CITATIONS.find(c => c.id === 'osha-otm-robots')?.year).toBe(2026);
  });
});
