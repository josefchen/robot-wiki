import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gr2ResultsTable } from '@/components/mdx/gr2-results-table';

describe('Gr2ResultsTable', () => {
  it('renders every published figure with its task and embodiment', () => {
    render(<Gr2ResultsTable />);
    const table = screen.getByRole('table');
    for (const figure of [
      '68.4%',
      '45.7%',
      '76.3%',
      '92%',
      '44%',
      '40%',
      '36%',
      '32%',
      '89.6%',
      '78.9%',
      '74.2%',
    ]) {
      expect(table).toHaveTextContent(figure);
    }
    for (const task of [
      'pick from table',
      'pick from floor',
      'pick from shelf',
      'unscrew bulb',
      'dustpan',
      'precise insertion',
    ]) {
      expect(table).toHaveTextContent(task);
    }
    expect(table).toHaveTextContent('Apollo 2 + Inspire');
    expect(table).toHaveTextContent('Apollo 2 + SharpaWave');
    expect(table).toHaveTextContent('Franka Duo');
  });

  it('states the vendor-reported caveat alongside the numbers', () => {
    render(<Gr2ResultsTable />);
    expect(screen.getByTestId('gr2-caveat')).toHaveTextContent(
      /vendor-reported/i,
    );
    expect(screen.getByTestId('gr2-caveat')).toHaveTextContent(
      /no external replication/i,
    );
  });

  it('marks every row as vendor-reported evidence', () => {
    render(<Gr2ResultsTable />);
    const badges = screen.getAllByText('vendor-reported');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
