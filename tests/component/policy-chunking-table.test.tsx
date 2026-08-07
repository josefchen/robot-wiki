import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PolicyChunkingTable } from '@/components/mdx/policy-chunking-table';

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1); // skip the header row
}

describe('PolicyChunkingTable', () => {
  it('renders the policy rows with a visible caption', () => {
    render(<PolicyChunkingTable />);
    expect(
      screen.getByRole('table', { name: /action horizon/i }),
    ).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows.length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('ACT')).toBeInTheDocument();
    expect(screen.getByText('Diffusion Policy')).toBeInTheDocument();
  });

  it('marks undisclosed values instead of guessing them', () => {
    render(<PolicyChunkingTable />);
    // Helix 02 does not disclose its action horizon; the cell must not
    // invent a number.
    const helixRow = bodyRows().find((row) =>
      within(row).queryByText(/Helix/),
    );
    expect(helixRow).toBeDefined();
    expect(within(helixRow as HTMLElement).getAllByText('n/a').length)
      .toBeGreaterThan(0);
  });

  it('renders open and closed badges', () => {
    render(<PolicyChunkingTable />);
    expect(screen.getAllByText('open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('closed').length).toBeGreaterThan(0);
  });

  it('sorts by year in both directions with aria-sort', async () => {
    const user = userEvent.setup();
    render(<PolicyChunkingTable />);
    const yearHeader = screen.getByRole('button', { name: /sort by year/i });
    const years = () =>
      bodyRows().map((row) =>
        Number(within(row).getAllByRole('cell')[1].textContent),
      );

    // The table ships sorted by year ascending.
    let headerCell = screen.getByRole('columnheader', { name: /year/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'ascending');
    expect(years()).toEqual([...years()].sort((a, b) => a - b));

    await user.click(yearHeader);
    headerCell = screen.getByRole('columnheader', { name: /year/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'descending');
    expect(years()).toEqual([...years()].sort((a, b) => b - a));

    await user.click(yearHeader);
    headerCell = screen.getByRole('columnheader', { name: /year/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'ascending');
    expect(years()).toEqual([...years()].sort((a, b) => a - b));
  });
});
