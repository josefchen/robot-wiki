import { readFileSync } from 'node:fs';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { METHODS } from '@/data/methods';
import { methodSchema } from '@/data/schemas/method';
import { methodHorizonFigure } from '@/lib/entity-cells';
import { DEFAULT_FILTERS, filterMethods } from '@/lib/methods';
import { PolicyChunkingTable } from '@/components/mdx/policy-chunking-table';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('ComparisonMatrix');

const model = (id: string) => METHODS.find(m => m.id === id)!;
describe('ACT final model paper corrections', () => {
  it('does not inherit pi06 horizons, control Hz or closed licensing', () => {
    const m = model('pi06');
    expect(m.actionHorizon).toMatchObject({ planned: null, executed: null });
    expect(m.actionHorizon.note).toContain('model card');
    expect(m.controlFrequencyHz).toBeNull();
    expect(m.controlFrequencyNote).toContain('63 ms');
    expect(m.openWeights).toBeNull();
    expect(m.weightsNote).toContain('model card');
  });
  it('represents pi07 execution as two discrete choices, not a range or default', () => {
    expect(model('pi07').actionHorizon.executed).toEqual({ choices: [15, 25] });
    expect(methodHorizonFigure(model('pi07'))).toBe('50 / {15, 25}');
    expect(model('pi07').controlFrequencyHz).toBe(20);
    expect(model('pi07').controlFrequencyNote).toBe('UR5e reference; other tested robots 50 Hz');
  });
  it('accepts only distinct positive integer execution choices within the prediction', () => {
    const parse = (executed: unknown) => methodSchema.safeParse({
      ...model('pi07'), actionHorizon: { planned: 50, executed },
    }).success;
    expect(parse({ choices: [15, 25] })).toBe(true);
    for (const value of [{ choices: [] }, { choices: [15] }, { choices: [15, 15] },
      { choices: [0, 25] }, { choices: [15.5, 25] }, { choices: [15, 51] },
      { min: 15, max: 25 }, { choices: [15, 25], default: 15 }]) {
      expect(parse(value), JSON.stringify(value)).toBe(false);
    }
  });
  it('keeps both unknown releases out of the known-unreleased filter', () => {
    for (const m of [model('pi06'), model('pi07')]) {
      expect(m.openWeights).toBeNull();
      expect(filterMethods([m], { ...DEFAULT_FILTERS, weights: 'closed' })).toEqual([]);
      expect(methodSchema.safeParse({ ...m, weightsNote: undefined }).success).toBe(false);
    }
  });
  it('renders scoped unknowns, FAST training and discrete execution on both tables', () => {
    const view = render(<PolicyChunkingTable />);
    const pi06 = screen.getByRole('row', { name: /^pi0.6 / });
    expect(pi06).toHaveTextContent('not disclosed');
    expect(pi06).toHaveTextContent('FAST backbone supervision during training');
    expect(pi06).not.toHaveTextContent('not released');
    expect(screen.getByRole('row', { name: /^pi0.7 / })).toHaveTextContent('either 15 or 25');
    view.unmount();
    render(<ComparisonMatrix />);
    expect(screen.getByRole('row', { name: /^π0.7 / })).toHaveTextContent('50 / {15, 25}');
    expect(screen.getByRole('row', { name: /^π0.6 / })).toHaveTextContent('model card');
  });
  it('places both paper citations and preserves inference and training qualifications', () => {
    const article = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
    expect(article).toContain('<Cite id="pi06-model-card-2025" />');
    expect(article).toContain('<Cite id="pi07-2026" />');
    expect(article).toContain('five denoising steps and three camera inputs on one H100');
    expect(article).toContain('either 15 or 25');
    expect(article).toContain('does not assign either execution choice to a particular robot');
    expect(article).toContain('RL-trained π*0.6');
    expect(article).not.toContain('executes 15-25');
  });
});
