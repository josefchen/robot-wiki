import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Table, type Column } from '@/components/ui/table';

type Row = { method: string; year: number; rate: number | null };

const columns: Column<Row>[] = [
  { key: 'method', header: 'Method', sortable: true },
  { key: 'year', header: 'Year', sortable: true, numeric: true },
  { key: 'rate', header: 'Success rate', numeric: true },
];

const rows: Row[] = [
  { method: 'Diffusion Policy', year: 2023, rate: 0.44 },
  { method: 'ACT', year: 2023, rate: null },
  { method: 'RT-1', year: 2022, rate: 0.97 },
];

function rowOrder() {
  const body = screen.getAllByRole('rowgroup')[1];
  return within(body)
    .getAllByRole('row')
    .map((r) => within(r).getAllByRole('cell')[0].textContent);
}

describe('Table', () => {
  it('exposes its caption as the accessible name', () => {
    render(<Table caption="Policy comparison" columns={columns} rows={rows} />);
    expect(
      screen.getByRole('table', { name: 'Policy comparison' }),
    ).toBeInTheDocument();
  });

  it('renders all rows in the given order', () => {
    render(<Table caption="Policy comparison" columns={columns} rows={rows} />);
    expect(rowOrder()).toEqual(['Diffusion Policy', 'ACT', 'RT-1']);
  });

  it('sorts ascending then descending when a sortable header is activated', async () => {
    const user = userEvent.setup();
    render(<Table caption="Policy comparison" columns={columns} rows={rows} />);

    const yearButton = screen.getByRole('button', { name: /Year/ });
    await user.click(yearButton);
    expect(rowOrder()).toEqual(['RT-1', 'Diffusion Policy', 'ACT']);
    expect(screen.getByRole('columnheader', { name: /Year/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await user.click(yearButton);
    expect(rowOrder()).toEqual(['Diffusion Policy', 'ACT', 'RT-1']);
    expect(screen.getByRole('columnheader', { name: /Year/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('keeps null values at the end when sorting', async () => {
    const user = userEvent.setup();
    const sortable: Column<Row>[] = [
      { key: 'method', header: 'Method' },
      { key: 'rate', header: 'Success rate', sortable: true, numeric: true },
    ];
    render(
      <Table caption="Policy comparison" columns={sortable} rows={rows} />,
    );
    await user.click(screen.getByRole('button', { name: /Success rate/ }));
    expect(rowOrder()).toEqual(['Diffusion Policy', 'RT-1', 'ACT']);
  });

  it('renders null and empty values as "not disclosed", dimmed', () => {
    render(<Table caption="Policy comparison" columns={columns} rows={rows} />);
    // ACT's rate is null. The shared fallback marks it "not disclosed"
    // (dim): the wiki-wide convention for a value its owner has not
    // published. A column whose nulls mean "not applicable" instead must
    // pass an explicit render (see PolicyChunkingTable).
    const body = screen.getAllByRole('rowgroup')[1];
    const actRow = within(body)
      .getAllByRole('row')
      .find((row) => within(row).queryByText('ACT'));
    expect(actRow).toBeDefined();
    const placeholder = within(actRow as HTMLElement).getByText(
      'not disclosed',
      { exact: true },
    );
    expect(placeholder).toHaveClass('text-text-dim');
  });

  it('does not render a sort button for non-sortable columns', () => {
    render(<Table caption="Policy comparison" columns={columns} rows={rows} />);
    expect(
      screen.queryByRole('button', { name: /Success rate/ }),
    ).not.toBeInTheDocument();
  });
});
