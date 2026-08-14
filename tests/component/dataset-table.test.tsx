import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DatasetTable } from '@/components/interactive/dataset-table';
import { DATASETS } from '@/data/datasets';

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1); // skip the header row
}

function rowNamed(name: string | RegExp): HTMLElement | undefined {
  return bodyRows().find((row) => within(row).queryByText(name));
}

describe('DatasetTable', () => {
  it('renders every dataset row with the comparison columns', () => {
    render(<DatasetTable />);
    expect(
      screen.getByRole('table', { name: /robot-manipulation datasets/i }),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(DATASETS.length);
    for (const header of [
      /episodes/i,
      /hours/i,
      /tasks/i,
      /embodiments/i,
      /license/i,
      /source/i,
    ]) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }
    for (const name of [
      /Open X-Embodiment/,
      'DROID',
      /BridgeData V2/,
      /AgiBot World/,
      /RoboMIND/,
    ]) {
      expect(rowNamed(name), `missing row for ${name}`).toBeDefined();
    }
  });

  it('renders unknown values as not disclosed and never invents numbers (VAL-DATA-009)', () => {
    render(<DatasetTable />);
    const unreleased = rowNamed('AgiBot World 2026') as HTMLElement;
    expect(unreleased).toBeDefined();
    // Episodes, hours, tasks, and scenes (cells 2-5) are all unpublished
    // for this row and must render the placeholder, never a number.
    const cells = within(unreleased).getAllByRole('cell');
    for (const index of [2, 3, 4, 5]) {
      expect(cells[index].textContent).toBe('not disclosed');
    }
    expect(
      within(unreleased).getAllByText('not disclosed').length,
    ).toBeGreaterThanOrEqual(4);

    const oxe = rowNamed(/Open X-Embodiment/) as HTMLElement;
    // OXE publishes no hour count: the hours cell reads not disclosed,
    // not an estimate.
    const oxeCells = within(oxe).getAllByRole('cell');
    expect(oxeCells.some((c) => c.textContent === 'not disclosed')).toBe(true);
  });

  it('carries at least one external source link per row (VAL-DATA-010)', () => {
    render(<DatasetTable />);
    for (const row of bodyRows()) {
      const links = within(row)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('http'));
      expect(links.length, 'every dataset row needs an external link').toBeGreaterThanOrEqual(1);
    }
  });

  it('filters by size and restores on clear (VAL-DATA-008)', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    await user.click(screen.getByRole('button', { name: /^1M\+ episodes$/i }));
    expect(bodyRows()).toHaveLength(2);
    expect(rowNamed(/Open X-Embodiment/)).toBeDefined();
    expect(rowNamed('DROID')).toBeUndefined();

    await user.click(screen.getByRole('button', { name: /all sizes/i }));
    expect(bodyRows()).toHaveLength(DATASETS.length);
  });

  it('filters by embodiment class', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    await user.click(
      screen.getByRole('button', { name: /^single platform$/i }),
    );
    expect(rowNamed(/Open X-Embodiment/)).toBeUndefined();
    expect(rowNamed(/RoboMIND/)).toBeUndefined();
    expect(rowNamed('DROID')).toBeDefined();
    expect(rowNamed(/BridgeData V2/)).toBeDefined();
  });

  it('composes size and task filters conjunctively', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    await user.click(
      screen.getByRole('button', { name: /under 100k episodes/i }),
    );
    await user.click(screen.getByRole('button', { name: /under 100 tasks/i }));
    const names = bodyRows().map(
      (row) => within(row).getAllByRole('cell')[0].textContent,
    );
    expect(names.sort()).toEqual(['BridgeData V2', 'DROID']);
  });

  it('shows an empty state with a clear affordance on zero results', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    // RoboMIND is the only 100k-1M dataset, and it is multi-platform.
    await user.click(screen.getByRole('button', { name: /100k-1M episodes/i }));
    await user.click(
      screen.getByRole('button', { name: /^single platform$/i }),
    );

    expect(screen.queryByRole('table')).toBeNull();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/no datasets match/i);
    await user.click(
      within(status).getByRole('button', { name: /clear filters/i }),
    );
    expect(bodyRows()).toHaveLength(DATASETS.length);
  });

  it('reports the visible row count', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    expect(
      screen.getByText(`${DATASETS.length} of ${DATASETS.length} datasets`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^1M\+ episodes$/i }));
    expect(
      screen.getByText(`2 of ${DATASETS.length} datasets`),
    ).toBeInTheDocument();
  });

  it('sorts episodes in both directions with aria-sort, nulls last', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    // Ships sorted by episodes descending.
    let headerCell = screen.getByRole('columnheader', { name: /episodes/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'descending');
    const episodes = () =>
      bodyRows().map(
        (row) => within(row).getAllByRole('cell')[2].textContent ?? '',
      );
    // Leading grouped count only; note text under the number carries digits.
    const known = () =>
      episodes()
        .map((text) => text.match(/^([\d,]+)/)?.[1])
        .filter((v): v is string => v !== undefined);
    const descending = (values: string[]) =>
      [...values].sort(
        (a, b) => Number(b.replace(/,/g, '')) - Number(a.replace(/,/g, '')),
      );
    const ascending = (values: string[]) =>
      [...values].sort(
        (a, b) => Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, '')),
      );
    // AgiBot World 2026 (unpublished episodes) sorts last.
    expect(episodes().at(-1)).toBe('not disclosed');
    expect(known()).toEqual(descending(known()));

    const sortButton = screen.getByRole('button', {
      name: /sort by episodes/i,
    });
    await user.click(sortButton);
    headerCell = screen.getByRole('columnheader', { name: /episodes/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'ascending');
    expect(known()).toEqual(ascending(known()));
    expect(episodes().at(-1)).toBe('not disclosed');
  });

  it('reset restores filters and the initial sort', async () => {
    const user = userEvent.setup();
    render(<DatasetTable />);
    await user.click(
      screen.getByRole('button', { name: /^single platform$/i }),
    );
    await user.click(screen.getByRole('button', { name: /sort by dataset/i }));

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(bodyRows()).toHaveLength(DATASETS.length);
    expect(
      screen.getByRole('columnheader', { name: /episodes/i }),
    ).toHaveAttribute('aria-sort', 'descending');
  });
});
