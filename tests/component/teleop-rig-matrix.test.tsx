import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TeleopRigMatrix } from '@/components/interactive/teleop-rig-matrix';
import { TELEOP_RIGS } from '@/data/teleop-rigs';

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1); // skip the header row
}

function rowNamed(name: string | RegExp): HTMLElement | undefined {
  return bodyRows().find((row) => within(row).queryByText(name));
}

describe('TeleopRigMatrix', () => {
  it('renders every rig family with the four comparison dimensions (VAL-DATA-019)', () => {
    render(<TeleopRigMatrix />);
    expect(
      screen.getByRole('table', { name: /teleoperation rig families/i }),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(TELEOP_RIGS.length);
    for (const header of [
      /rig/i,
      /cost/i,
      /data quality/i,
      /throughput/i,
      /embodiment gap/i,
      /sources/i,
    ]) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }
    for (const name of [
      /ALOHA-class workstation/,
      'GELLO',
      'UMI',
      /VR teleoperation/,
    ]) {
      expect(rowNamed(name), `missing row for ${name}`).toBeDefined();
    }
  });

  it('renders the unpublished VR system cost as not disclosed and never invents numbers (VAL-DATA-020)', () => {
    render(<TeleopRigMatrix />);
    const vr = rowNamed(/VR teleoperation/) as HTMLElement;
    expect(vr).toBeDefined();
    // Cost is the second cell; no source publishes a VR system cost.
    const cells = within(vr).getAllByRole('cell');
    expect(cells[1].textContent).toBe('not disclosed');
    // The verified rigs do show concrete costs.
    const gello = rowNamed('GELLO') as HTMLElement;
    expect(within(gello).getAllByRole('cell')[1].textContent).toContain('$300');
    const umi = rowNamed('UMI') as HTMLElement;
    expect(within(umi).getAllByRole('cell')[1].textContent).toContain('$371');
  });

  it('ships sorted by cost with unknown costs last', () => {
    render(<TeleopRigMatrix />);
    const header = screen.getByRole('columnheader', { name: /cost/i });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const costs = bodyRows().map(
      (row) => within(row).getAllByRole('cell')[1].textContent ?? '',
    );
    // GELLO ($300) < UMI ($371) < ALOHA ($17,000) < not disclosed.
    expect(costs.at(-1)).toBe('not disclosed');
    expect(costs[0]).toContain('$300');
  });

  it('sorts rating columns with null-safe ordering (VAL-DATA-020)', async () => {
    const user = userEvent.setup();
    render(<TeleopRigMatrix />);
    await user.click(
      screen.getByRole('button', { name: /sort by embodiment gap/i }),
    );
    const header = screen.getByRole('columnheader', {
      name: /embodiment gap/i,
    });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    // ALOHA and GELLO carry the low gap and must lead the ascending sort.
    const firstCells = bodyRows()
      .slice(0, 2)
      .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
    expect(firstCells.join(' ')).toContain('ALOHA');
    expect(firstCells.join(' ')).toContain('GELLO');
    // Reversing keeps the comparison consistent.
    await user.click(
      screen.getByRole('button', { name: /sort by embodiment gap/i }),
    );
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('highlights a dimension and shows the per-rig detail readout (VAL-DATA-020)', async () => {
    const user = userEvent.setup();
    render(<TeleopRigMatrix />);
    // Anchored: the table header also exposes a "Sort by Data quality" button.
    const button = screen.getByRole('button', { name: /^data quality$/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByRole('region', { name: /dimension detail/i });
    // Every rig family is described along the selected dimension.
    for (const name of [
      /ALOHA-class workstation/,
      'GELLO',
      'UMI',
      /VR teleoperation/,
    ]) {
      expect(within(detail).getByText(name)).toBeInTheDocument();
    }
    expect(detail.textContent).toMatch(
      /joint space|kinematic|fisheye|retarget/i,
    );

    // Clicking the same dimension again returns to the overview.
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByRole('region', { name: /dimension detail/i }),
    ).toBeNull();
  });

  it('highlights exactly one dimension at a time', async () => {
    const user = userEvent.setup();
    render(<TeleopRigMatrix />);
    await user.click(screen.getByRole('button', { name: /^data quality$/i }));
    await user.click(screen.getByRole('button', { name: /^throughput$/i }));
    expect(
      screen.getByRole('button', { name: /^data quality$/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /^throughput$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByRole('region', { name: /dimension detail/i });
    expect(detail.textContent).toMatch(/DROID|operators|demonstrations per/i);
  });

  it('reports the visible rig count and resets to the initial state', async () => {
    const user = userEvent.setup();
    render(<TeleopRigMatrix />);
    expect(
      screen.getByText(`${TELEOP_RIGS.length} of ${TELEOP_RIGS.length} rigs`),
    ).toBeInTheDocument();

    // Disturb both the highlight and the sort.
    await user.click(screen.getByRole('button', { name: /^embodiment gap$/i }));
    await user.click(
      screen.getByRole('button', { name: /sort by throughput/i }),
    );

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(
      screen.queryByRole('region', { name: /dimension detail/i }),
    ).toBeNull();
    for (const button of screen.getAllByRole('button', {
      name: /cost|data quality|throughput|embodiment gap/i,
    })) {
      if (button.closest('thead')) continue;
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByRole('columnheader', { name: /cost/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('carries at least one external source link per row (VAL-DATA-018)', () => {
    render(<TeleopRigMatrix />);
    for (const row of bodyRows()) {
      const links = within(row)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('http'));
      expect(
        links.length,
        'every rig row needs an external link',
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
