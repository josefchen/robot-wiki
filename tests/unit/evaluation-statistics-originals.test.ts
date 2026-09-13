import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../../data/glossary';
import { CITATIONS } from '../../data/citations';
import { compoundPlanDigest, compoundPartDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const prose = readFileSync('content/data-hardware/evaluation-crisis.mdx', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const selected = plans.filter((p) => p.articleSlug === 'evaluation-crisis' && p.rowOrdinal >= 2 && p.rowOrdinal <= 7);
const ids = new Set(CITATIONS.map((c) => c.id));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const records = (catalog = plans) => parseLedger('audit/data-hardware.md', ledger, ids, { compoundPlans: catalog })
  .find((s) => s.slug === 'evaluation-crisis')!.claimRecords;

describe('evaluation statistics originals 2–7', () => {
  it('integrates all six originals with every mandatory AND dependency', () => {
    expect(selected.map((p) => p.rowOrdinal)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(selected.reduce((n, p) => n + p.parts.length, 0)).toBe(23);
    expect(selected.reduce((n, p) => n + p.evidence.length, 0)).toBe(24);
    for (const r of records().slice(1, 7)) expect(r.evidenceFailures).toEqual([]);
    expect(records()[0].evidenceFailures.length).toBeGreaterThan(0);
  });

  it('states examples, units and protocol without a universal minimum', () => {
    expect(prose).toContain('label="trial-count examples" value="10 or 50"');
    expect(prose).toContain('1,700 demonstration hours');
    expect(prose).toContain('50 real attempts per task per policy per condition');
    expect(prose).toContain('missing simulation data');
    expect(prose).toContain('Simulation used automated predicates');
    for (const old of ['typical trials', '## Ten trials is noise', 'sit inside that noise floor', 'TRI needed 50', 'Only the 50-trial number']) {
      expect(prose).not.toContain(old);
    }
  });

  it('separates STEP savings and assumptions from TRI’s Lai adoption', () => {
    for (const text of ['up to 32%', 'Lai', 'SAVI', 'i.i.d.', 'uniform risk', 'Welch', 'rather than STEP']) {
      expect(prose).toContain(text);
    }
    expect(prose).not.toContain('up to 40%');
    expect(prose).toContain('significant risk');
    expect(prose).toContain('variation from stochastic training');
    expect(prose).toContain('Neither policy is established as better');
  });

  it('records complete TRI metadata while preserving both audited identities', () => {
    const tri = CITATIONS.find((c) => c.id === 'tri-lbm-2025')!;
    expect(tri.authors).toHaveLength(82);
    expect(tri.authors?.slice(0, 3)).toEqual(['TRI LBM Team', 'Jose Barreiros', 'Andrew Beaulieu']);
    expect(tri.authors?.at(-1)).toBe('Russ Tedrake');
    expect(tri.authors).toContain('Benjamin Burchfiel');
    expect(tri.venue).toBeUndefined();
    expect(tri.url).toBe('https://arxiv.org/abs/2507.05331');
    const snyder = CITATIONS.find((c) => c.id === 'optimal-stopping-2025')!;
    expect(snyder.authors).toHaveLength(9);
    expect(snyder.venue).toBe('RSS 2025');
    expect(snyder.url).toBe('https://arxiv.org/abs/2503.10966');
  });

  it('preserves the article’s date, excluded arithmetic and nine-source union', () => {
    expect(prose).toContain('lastReviewed: "2026-08-17"');
    expect(prose.match(/^  - [a-z][\w-]+$/gm)).toHaveLength(9);
    expect(prose).toContain('which is 21.5%');
    expect(prose).toContain('minPerStepPercent={0} maxPerStepPercent={100}');
    expect(prose).toContain('label="real rollouts" value="1,800"');
  });

  it('keeps the mounted glossary definition consistent with the corrected originals', () => {
    const term = GLOSSARY.find((t) => t.id === 'success-rate')!;
    expect(term.citations).toEqual(['tri-lbm-2025', 'optimal-stopping-2025']);
    expect(term.definition).toContain('significant risk');
    expect(term.definition).toContain('does not establish policy equivalence');
    expect(term.definition).not.toContain('most papers measure it on 10 to 20');
    expect(term.definition).not.toContain('explains many published comparisons');
  });

  it('rejects missing reviews, evidence, stale tuples and missing AND adjudications', () => {
    expect(selected).toHaveLength(6);
    for (const p of selected) {
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      for (const mutate of [
        (q: typeof p) => { q.planReview = null; },
        (q: typeof p) => { q.evidence.pop(); },
        (q: typeof p) => { q.originalCellsDigest = '0'.repeat(64); },
        (q: typeof p) => { q.adjudications.pop(); },
      ]) {
        const bad = structuredClone(plans);
        mutate(bad.find((q) => q.id === p.id)!);
        expect(records(bad)[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    }
  });
});
