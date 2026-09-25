import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RlMethodsTable } from '../../components/mdx/rl-methods-table';
import { CITATIONS } from '../../data/citations';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const planId = 'rl-method-table-original-11-20260908';
const selected = catalog.find(p => p.id === planId)!;
const ledger = readFileSync('audit/manipulation.md', 'utf8');
const row = (plan = selected) => parseLedger('audit/manipulation.md', ledger,
  new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog.map(p => p.id === planId ? plan : p) })
  .find(s => s.slug === 'rl-finetuning')!.claimRecords[10];

describe('source-scoped six-method aggregate original 11', () => {
  it('binds all 30 parts and 41 exact source pairs across eight citations', () => {
    expect(selected.rowOrdinal).toBe(11);
    expect(selected.parts).toHaveLength(30);
    expect(selected.adjudications).toHaveLength(30);
    expect(selected.evidence).toHaveLength(41);
    expect(new Set(selected.evidence.map(e => e.citationId))).toEqual(new Set([
      'dppo-2024', 'conrft-2025', 'pistar06-2025', 'pistar06-blog-2025',
      'pi06-model-card-2025', 'pi-rl-2026', 'pld-2026', 'hil-serl-2024',
    ]));
    expect(row().evidenceFailures).toEqual([]);
    expect(row().compound?.planId).toBe(planId);
    expect(row().verdict).toBe('corrected');
  });

  it.each(selected.evidence.map((item, index) => ({ ...item, index })))
  ('rejects malformed pair $index: $partId/$citationId', ({ index: i }) => {
      for (const mutation of ['missing', 'duplicate', 'stale', 'source', 'citation']) {
        const plan = structuredClone(selected);
        if (mutation === 'missing') plan.evidence.splice(i, 1);
        if (mutation === 'duplicate') plan.evidence.push({ ...plan.evidence[i] });
        if (mutation === 'stale') plan.evidence[i].supportingPassage += ' altered';
        if (mutation === 'source') plan.evidence[i].sourceUrl = 'https://arxiv.org/abs/1011.0686';
        if (mutation === 'citation') plan.evidence[i].citationId = 'dagger-2011';
        expect(row(plan).evidenceFailures.length, `${i}/${mutation}`).toBeGreaterThan(0);
      }
  });

  it('rejects incomplete reviews, reduced conjunctions and stale current tuples', () => {
    for (const mutation of ['plan-review', 'part-review', 'unresolved', 'reduced', 'tuple']) {
      const plan = structuredClone(selected);
      if (mutation === 'plan-review') plan.planReview = null;
      if (mutation === 'part-review') plan.adjudications.pop();
      if (mutation === 'unresolved') plan.adjudications[0].outcome = 'unresolved';
      if (mutation === 'reduced') plan.parts.pop();
      if (mutation === 'tuple') plan.originalCellsDigest = '0'.repeat(64);
      expect(row(plan).evidenceFailures.length, mutation).toBeGreaterThan(0);
    }
  });

  it('renders source-scoped missing values rather than inventing closed licensing', () => {
    render(<RlMethodsTable />);
    const table = screen.getByRole('table');
    // EXPO-FT and DSRL joined the table with the 20260925 intake.
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    for (const name of ['Recap (pi*0.6)', 'Residual RL (PLD)', 'DSRL']) {
      const record = within(table).getByText(name).closest('tr')!;
      expect(within(record).getByText('not disclosed')).toBeInTheDocument();
    }
    expect(within(table).queryByText('closed', { exact: true })).not.toBeInTheDocument();
    expect(within(table).getAllByText('code', { exact: true })).toHaveLength(5);
    expect(table).toHaveTextContent('not verified weights or licensing');
    expect(table).toHaveTextContent('not a claim that the model is closed');
  });

  it('preserves finite denominators, source conflicts and non-ranking prose', () => {
    const prose = readFileSync('content/manipulation/rl-finetuning.mdx', 'utf8');
    for (const value of ['16 of 20', '45-90', '39.4%', 'without stating an evaluation-trial denominator',
      'not 100%', 'two attempts per sub-policy', '18%', '28%', 'rankings across these protocols would mislead'])
      expect(prose).toContain(value);
    expect(prose).not.toContain("Recap's numbers are the most impressive");
    expect(prose).not.toContain("the strongest real-world results, Recap's");
    expect(prose).toContain('lastReviewed: "2026-08-17"');
  });
});
