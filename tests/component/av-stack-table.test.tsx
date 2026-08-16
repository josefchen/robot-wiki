import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvStackTable } from '@/components/mdx/av-stack-table';

describe('AvStackTable', () => {
  it('renders the four pipeline stages as distinct rows', () => {
    const { container } = render(<AvStackTable />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(4);
    for (const stage of ['Perception', 'Prediction', 'Planning', 'Control']) {
      expect(
        container.querySelector(
          `[data-testid="av-stage-${stage.toLowerCase()}"]`,
        ),
      ).not.toBeNull();
    }
  });

  it('exposes an accessible name via caption', () => {
    render(<AvStackTable />);
    expect(
      screen.getByRole('table', { name: /autonomous-driving stack/i }),
    ).toBeInTheDocument();
  });

  it('populates every cell of every row', () => {
    const { container } = render(<AvStackTable />);
    const rows = container.querySelectorAll('tbody tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      // question, methods, failure (stage name lives in th)
      expect(cells.length).toBe(3);
      for (const cell of cells) {
        expect(cell.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('names representative learned and classical methods per stage', () => {
    render(<AvStackTable />);
    const text =
      screen.getByRole('table', { name: /autonomous-driving stack/i })
        .textContent ?? '';
    expect(text).toMatch(/VectorNet/);
    expect(text).toMatch(/UniAD/);
    expect(text).toMatch(/ChauffeurNet|EMMA/);
    expect(text).toMatch(/MPC|feedback/);
  });
});
