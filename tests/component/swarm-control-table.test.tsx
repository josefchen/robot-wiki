import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SwarmControlTable } from '@/components/mdx/swarm-control-table';

describe('SwarmControlTable', () => {
  it('renders the three control families as distinct rows', () => {
    const { container } = render(<SwarmControlTable />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    for (const id of [
      'swarm-family-reactive-flocking',
      'swarm-family-predictive-nmpc-control',
      'swarm-family-decentralized-trajectory-planning',
    ]) {
      expect(container.querySelector(`[data-testid="${id}"]`)).not.toBeNull();
    }
  });

  it('exposes an accessible name via caption', () => {
    render(<SwarmControlTable />);
    expect(
      screen.getByRole('table', { name: /control families for aerial swarms/i }),
    ).toBeInTheDocument();
  });

  it('populates every cell of every row', () => {
    const { container } = render(<SwarmControlTable />);
    const rows = container.querySelectorAll('tbody tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      // mechanism, exemplar, limit (family name lives in th)
      expect(cells.length).toBe(3);
      for (const cell of cells) {
        expect(cell.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('names the demonstrated systems the prose cites', () => {
    render(<SwarmControlTable />);
    const text =
      screen.getByRole('table', { name: /control families for aerial swarms/i })
        .textContent ?? '';
    expect(text).toMatch(/Vásárhelyi/);
    expect(text).toMatch(/Soria/);
    expect(text).toMatch(/Zhou/);
  });
});
