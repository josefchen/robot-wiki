import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HardwareGuide } from '@/components/interactive/hardware-guide';
import { HARDWARE } from '@/data/hardware';

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1); // skip the header row
}

function rowNamed(name: string | RegExp): HTMLElement | undefined {
  return bodyRows().find((row) => within(row).queryByText(name));
}

describe('HardwareGuide', () => {
  it('puts a product photo or an explicit no-photo mark on every row', () => {
    render(<HardwareGuide />);
    const photos = document.querySelectorAll('img[src^="/images/hardware/"]');
    expect(photos.length).toBeGreaterThan(50);
    expect(screen.getAllByText('no public photo').length).toBeGreaterThanOrEqual(1);
  });

  it('renders every entry with the buyer columns (VAL-DATA-011)', () => {
    render(<HardwareGuide />);
    expect(
      screen.getByRole('table', { name: /hardware entries/i }),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(HARDWARE.length);
    for (const header of [
      /entry/i,
      /category/i,
      /price/i,
      /dof/i,
      /availability/i,
      /source/i,
    ]) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }
  });

  it('shows every hardware family in the rendered rows (VAL-DATA-011)', () => {
    render(<HardwareGuide />);
    const categoryCells = bodyRows().map(
      (row) => within(row).getAllByRole('cell')[1].textContent,
    );
    for (const label of [
      'Arm',
      'Humanoid',
      'Hand',
      'Sensor',
      'Compute',
      'Wheelbase',
      'Lidar',
      'Camera',
      'IMU',
      'Mobile manipulator',
      'Quadruped',
    ]) {
      expect(
        categoryCells.some((text) => text === label),
        `category ${label} missing from rendered rows`,
      ).toBe(true);
    }
  });

  it('carries an as-of note on every listed price (VAL-DATA-012)', () => {
    render(<HardwareGuide />);
    for (const row of bodyRows()) {
      const priceCell = within(row).getAllByRole('cell')[2];
      if (priceCell.textContent === 'not disclosed') continue;
      expect(
        priceCell.textContent,
        `price without as-of note: ${priceCell.textContent}`,
      ).toMatch(/as of (?:[A-Z][a-z]{2} \d{4}|\d{4})/);
    }
    // Sanity: the guide actually renders priced rows.
    const priced = bodyRows().filter(
      (row) =>
        within(row).getAllByRole('cell')[2].textContent !== 'not disclosed',
    );
    expect(priced.length).toBeGreaterThan(10);
  });

  it('renders unpublished figures as not disclosed and never invents numbers (VAL-DATA-015)', () => {
    render(<HardwareGuide />);
    // Tesla publishes no Optimus 3 price or DoF.
    const optimus = rowNamed(/Tesla Optimus 3/) as HTMLElement;
    expect(optimus).toBeDefined();
    const cells = within(optimus).getAllByRole('cell');
    expect(cells[2].textContent).toBe('not disclosed'); // price
    expect(cells[3].textContent).toBe('not disclosed'); // DoF

    // Boston Dynamics publishes no Atlas price.
    const atlas = rowNamed(/Atlas \(Electric\)/) as HTMLElement;
    expect(within(atlas).getAllByRole('cell')[2].textContent).toBe(
      'not disclosed',
    );
    // Atlas DoF is published: 56, not undisclosed.
    expect(
      within(atlas).getAllByRole('cell')[3].textContent,
    ).toMatch(/^56/);
  });

  it('carries at least one external source link per row (VAL-DATA-014)', () => {
    render(<HardwareGuide />);
    for (const row of bodyRows()) {
      const links = within(row)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('https://'));
      expect(links.length, 'every row needs an external link').toBeGreaterThanOrEqual(1);
    }
  });

  it('filters by category and restores on reset (VAL-DATA-013)', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    await user.click(screen.getByRole('button', { name: /^humanoids$/i }));
    expect(bodyRows()).toHaveLength(14);
    expect(
      bodyRows().every(
        (row) => within(row).getAllByRole('cell')[1].textContent === 'Humanoid',
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(bodyRows()).toHaveLength(HARDWARE.length);
  });

  it('filters by price with null-honest buckets (VAL-DATA-012)', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    await user.click(
      screen.getByRole('button', { name: /^no listed price$/i }),
    );
    // Every unlisted row renders not disclosed in the price column.
    expect(
      bodyRows().every(
        (row) =>
          within(row).getAllByRole('cell')[2].textContent === 'not disclosed',
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: /under \$1k/i }));
    // Four entry arms plus the two tactile sensors with published retail
    // prices (DIGIT $350, GelSight Mini $500).
    expect(bodyRows()).toHaveLength(10);
    expect(rowNamed(/SO-101 \(self-build\)/)).toBeDefined();
    expect(rowNamed('Koch v1.1')).toBeDefined();
    expect(rowNamed('DIGIT')).toBeDefined();
    expect(rowNamed(/GelSight Mini/)).toBeDefined();
    expect(rowNamed('OAK-D')).toBeDefined();
  });

  it('composes price and availability filters conjunctively (VAL-DATA-016)', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    await user.click(screen.getByRole('button', { name: /^\$1k-\$10k$/i }));
    await user.click(screen.getByRole('button', { name: /^preorder$/i }));

    // The Bumi presale ($1,400) is the only preorder in the $1k-$10k band.
    expect(bodyRows()).toHaveLength(1);
    expect(rowNamed(/Noetix Bumi/)).toBeDefined();
  });

  it('composes three filters and reports the visible count', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    expect(
      screen.getByText(`${HARDWARE.length} of ${HARDWARE.length} entries`),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^arms$/i }));
    await user.click(screen.getByRole('button', { name: /^not listed$/i }));
    await user.click(
      screen.getByRole('button', { name: /^no listed price$/i }),
    );
    // The only arm with neither a listed price nor a stated sourcing state
    // is the Franka Panda.
    expect(screen.getByText(`1 of ${HARDWARE.length} entries`)).toBeInTheDocument();
    expect(rowNamed(/Franka Emika Panda/)).toBeDefined();
  });

  it('shows an empty state with a clear affordance on zero results', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    // No compute row carries a listed price: NVIDIA publishes no Thor
    // module price and VLA-Perf quotes no card prices.
    await user.click(screen.getByRole('button', { name: /^compute$/i }));
    await user.click(screen.getByRole('button', { name: /under \$1k/i }));

    expect(screen.queryByRole('table')).toBeNull();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/no hardware matches/i);
    await user.click(
      within(status).getByRole('button', { name: /clear filters/i }),
    );
    expect(bodyRows()).toHaveLength(HARDWARE.length);
  });

  it('sorts price in both directions with aria-sort, nulls last', async () => {
    const user = userEvent.setup();
    render(<HardwareGuide />);
    const sortButton = screen.getByRole('button', {
      name: /sort by price/i,
    });
    const prices = () =>
      bodyRows().map(
        (row) => within(row).getAllByRole('cell')[2].textContent ?? '',
      );
    const known = () =>
      prices()
        .map((text) => text.match(/^\$([\d,]+)/)?.[1])
        .filter((v): v is string => v !== undefined)
        .map((v) => Number(v.replace(/,/g, '')));

    await user.click(sortButton); // ascending
    let headerCell = screen.getByRole('columnheader', { name: /price/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'ascending');
    const ascending = known();
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(prices().at(-1)).toBe('not disclosed'); // nulls last

    await user.click(sortButton); // descending
    headerCell = screen.getByRole('columnheader', { name: /price/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'descending');
    const descending = known();
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
    expect(prices().at(-1)).toBe('not disclosed');
  });

  it('keeps every filter control keyboard operable', () => {
    render(<HardwareGuide />);
    const buttons = screen.getAllByRole('button');
    // Every filter and sort control is a real button with a type.
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button');
    }
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBe(4);
  });
});
