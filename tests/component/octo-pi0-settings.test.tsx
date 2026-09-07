import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { METHODS } from '@/data/methods';
import { PolicyChunkingTable } from '@/components/mdx/policy-chunking-table';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';

const article = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
describe('Octo v2 and pi0 v4 reported settings', () => {
  it('keeps Octo ALOHA prediction and execution separate and conditional', () => {
    const row = METHODS.find(m => m.id === 'octo')!;
    expect(row.actionHorizon).toMatchObject({ planned: 64, executed: 12 });
    expect(row.actionHorizon.note).toContain('ALOHA finetuning');
    expect(row.controlFrequencyHz).toBeNull();
    expect(row.controlFrequencyNote).toContain('15 Hz');
    expect(row.controlFrequencyNote).toContain('10 Hz');
    expect(row.controlFrequencyNote).toContain('5 Hz');
  });
  it('names pi0 UR5e/Franka reference settings rather than a universal 50 Hz', () => {
    const row = METHODS.find(m => m.id === 'pi0')!;
    expect(row.actionHorizon).toMatchObject({ planned: 50, executed: 16 });
    expect(row.actionHorizon.note).toContain('UR5e/Franka');
    expect(row.actionHorizon.note).toContain('25');
    expect(row.controlFrequencyHz).toBe(20);
    expect(row.controlFrequencyNote).toContain('UR5e/Franka');
    expect(row.controlFrequencyNote).toContain('50 Hz');
    expect(row.actionRepresentation).toBe('flow');
  });
  it('renders conditional settings and P4 without mixed-meaning n/a', () => {
    render(<PolicyChunkingTable />);
    const octo = screen.getByRole('row', { name: /^Octo / });
    expect(octo).toHaveTextContent('64');
    expect(octo).toHaveTextContent('12');
    expect(octo).toHaveTextContent('ALOHA finetuning');
    expect(octo).toHaveTextContent('not disclosed');
    const pi0 = screen.getByRole('row', { name: /^pi0 2024/ });
    expect(pi0).toHaveTextContent('UR5e/Franka');
    expect(pi0).toHaveTextContent('50 Hz');
    expect(within(screen.getByRole('table')).queryByText('n/a')).not.toBeInTheDocument();
  });
  it('carries settings qualifications into the shared model table', () => {
    render(<ComparisonMatrix />);
    expect(screen.getByRole('row', { name: /^Octo / })).toHaveTextContent('ALOHA finetuning');
    expect(screen.getByRole('row', { name: /^π0 2024/ })).toHaveTextContent('UR5e/Franka');
  });
  it('places both primary citations beside the corrected source notes', () => {
    expect(article).toContain('<Cite id="octo-2024" />');
    expect(article).toContain('<Cite id="pi0-2024" />');
    expect(article).toContain('predicts 64 actions');
    expect(article).toContain('executes 12');
    expect(article).not.toContain('Cells marked n/a are undisclosed');
  });
});
