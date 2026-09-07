import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { METHODS } from '@/data/methods';
import { methodSchema } from '@/data/schemas/method';
import { DEFAULT_FILTERS, filterMethods } from '@/lib/methods';
import { PolicyChunkingTable } from '@/components/mdx/policy-chunking-table';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';

describe('ACT five source-scoped records', () => {
  it('accepts explicit unknown weight availability without converting it to false', () => {
    expect(methodSchema.safeParse({ ...METHODS[0], openWeights: null, weightsNote: 'Paper releases code; pretrained weights not disclosed in this source.' }).success).toBe(true);
    expect(METHODS.find(m => m.id === 'rt-1')?.openWeights).toBeNull();
    expect(METHODS.find(m => m.id === 'helix-02')?.openWeights).toBeNull();
  });
  it('excludes unknown availability from both known-state filters', () => {
    const rows = [{ ...METHODS[0], openWeights: null }];
    expect(filterMethods(rows, { ...DEFAULT_FILTERS, weights: 'open' })).toEqual([]);
    expect(filterMethods(rows, { ...DEFAULT_FILTERS, weights: 'closed' })).toEqual([]);
    expect(filterMethods(rows, { ...DEFAULT_FILTERS, weights: 'undisclosed' })).toEqual(rows);
  });
  it('does not turn pi05 prediction length into executed count', () => {
    const pi05 = METHODS.find(m => m.id === 'pi05')!;
    expect(pi05.actionHorizon).toMatchObject({ planned: 50, executed: null });
    expect(pi05.actionHorizon.note).toContain('H=49');
    expect(pi05.controlFrequencyNote).toContain('mobile');
    expect(pi05.sources).toContain('openpi-repo-2024');
  });
  it('preserves source-scoped horizon, rate and weight absence on both tables', () => {
    const view = render(<PolicyChunkingTable />);
    expect(screen.getByRole('row', { name: /^RT-1 / })).toHaveTextContent('not disclosed');
    expect(screen.getByRole('row', { name: /^pi0.5 / })).toHaveTextContent('mobile');
    expect(screen.getByRole('row', { name: /^GR00T / })).toHaveTextContent('inference');
    expect(screen.getByRole('row', { name: /^Helix / })).toHaveTextContent('announcement');
    expect(within(screen.getByRole('table')).queryByText('n/a')).toBeNull();
    view.unmount();
    render(<ComparisonMatrix />);
    expect(screen.getByRole('row', { name: /^π0.5 / })).toHaveTextContent('50 / n.d.');
    expect(screen.getByRole('row', { name: /^Helix / })).toHaveTextContent('announcement');
  });
  it('provides a separate unknown-availability filter', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    await user.click(within(screen.getByRole('group', { name: 'Filter by weights' })).getByRole('button', { name: 'Not disclosed' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(rows.map(r => r.textContent).join(' ')).toMatch(/RT-1.*π0.6.*π0.7.*Helix 02/);
  });
  it('places actual citations and replaces the unqualified release cutoff', () => {
    const article = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
    for (const id of ['rt1-2022', 'pi05-2025', 'openpi-repo-2024', 'isaac-gr00t-repo-2026', 'helix-02-2026']) {
      expect(article).toContain(`<Cite id="${id}" />`);
    }
    expect(article).not.toContain('the open releases stop at pi0.5');
    expect(article).toContain('7 September 2026');
    expect(article).toContain('NVIDIA Open Model License');
  });
});
