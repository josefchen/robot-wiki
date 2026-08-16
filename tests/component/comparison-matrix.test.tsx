import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ComparisonMatrix } from '@/components/interactive/comparison-matrix';
import { METHODS } from '@/data/methods';

function bodyRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1); // skip the header row
}

function rowNamed(name: string | RegExp): HTMLElement | undefined {
  return bodyRows().find((row) => within(row).queryByText(name));
}

describe('ComparisonMatrix', () => {
  it('renders every method row across the eight axes', () => {
    render(<ComparisonMatrix />);
    expect(
      screen.getByRole('table', { name: /architectural axes/i }),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(METHODS.length);
    for (const header of [
      /action repr/i,
      /horizon/i,
      /control hz/i,
      /backbone/i,
      /conditioning/i,
      /cross-embodiment/i,
      /hierarchy/i,
      /weights/i,
    ]) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }
  });

  it('marks undisclosed cells honestly in the Gemini, Helix, and Skild rows', () => {
    render(<ComparisonMatrix />);
    for (const name of [
      'Gemini Robotics 1.5',
      'Gemini Robotics 2',
      'Helix 02',
      'Skild',
    ]) {
      const row = rowNamed(name);
      expect(row, `missing row for ${name}`).toBeDefined();
      expect(
        within(row as HTMLElement).getAllByText('not disclosed').length,
        `${name} must show explicit not-disclosed markers`,
      ).toBeGreaterThan(0);
    }
    // Gemini Robotics 1.5 publishes no architecture numbers at all: its
    // horizon and frequency cells must not invent values.
    const gemini = rowNamed('Gemini Robotics 1.5') as HTMLElement;
    expect(within(gemini).queryByText(/Hz/)).toBeNull();
  });

  it('sorts a numeric column in both directions with aria-sort', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    const yearButton = screen.getByRole('button', { name: /sort by year/i });

    // Ships sorted by year ascending.
    let headerCell = screen.getByRole('columnheader', { name: /year/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'ascending');
    const years = () =>
      bodyRows().map((row) =>
        Number(within(row).getAllByRole('cell')[1].textContent),
      );
    expect(years()).toEqual([...years()].sort((a, b) => a - b));

    await user.click(yearButton);
    headerCell = screen.getByRole('columnheader', { name: /year/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'descending');
    expect(years()).toEqual([...years()].sort((a, b) => b - a));
  });

  it('sorts not-disclosed frequency cells last in both directions (VAL-MAN-065)', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    const hzButton = screen.getByRole('button', {
      name: /sort by control hz/i,
    });

    const frequencies = () =>
      bodyRows().map(
        (row) => within(row).getAllByRole('cell')[4].textContent ?? '',
      );
    const disclosedValues = () =>
      frequencies()
        .filter((text) => text.includes('Hz'))
        .map((text) => Number(text.match(/^(\d+)/)?.[1]));

    // Ascending: numbers sorted, every "not disclosed" cell after them.
    await user.click(hzButton); // from initial year sort to hz ascending
    let freqs = frequencies();
    let firstUndisclosed = freqs.findIndex((t) => t.includes('not disclosed'));
    expect(firstUndisclosed).toBeGreaterThan(-1);
    expect(
      freqs.slice(firstUndisclosed).every((t) => t.includes('not disclosed')),
    ).toBe(true);
    expect(disclosedValues()).toEqual(
      [...disclosedValues()].sort((a, b) => a - b),
    );

    // Descending: numbers reverse, undisclosed cells still pinned to the end.
    await user.click(hzButton);
    const descHeader = screen.getByRole('columnheader', {
      name: /control hz/i,
    });
    expect(descHeader).toHaveAttribute('aria-sort', 'descending');
    freqs = frequencies();
    firstUndisclosed = freqs.findIndex((t) => t.includes('not disclosed'));
    expect(
      freqs.slice(firstUndisclosed).every((t) => t.includes('not disclosed')),
    ).toBe(true);
    expect(disclosedValues()).toEqual(
      [...disclosedValues()].sort((a, b) => b - a),
    );
  });

  it('filters to open weights and restores on clear (VAL-MAN-034)', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    await user.click(screen.getByRole('button', { name: /^open$/i }));

    expect(rowNamed('π0.6')).toBeUndefined();
    expect(rowNamed('π0.7')).toBeUndefined();
    expect(rowNamed('Gemini Robotics 1.5')).toBeUndefined();
    expect(rowNamed('Helix 02')).toBeUndefined();
    for (const kept of [
      'π0',
      'π0.5',
      'OpenVLA',
      'Octo',
      'ACT',
      'Diffusion Policy',
      'GR00T N1.7',
    ]) {
      expect(rowNamed(kept), `${kept} must stay visible`).toBeDefined();
    }

    await user.click(screen.getByRole('button', { name: /all weights/i }));
    expect(bodyRows()).toHaveLength(METHODS.length);
  });

  it('filters by action representation', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    await user.click(screen.getByRole('button', { name: /^discrete$/i }));
    const names = bodyRows().map(
      (row) => within(row).getAllByRole('cell')[0].textContent,
    );
    expect(names.sort()).toEqual(['OpenVLA', 'RT-1', 'RT-2', 'π0-FAST']);
  });

  it('narrows rows with the text query', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    await user.type(screen.getByRole('searchbox', { name: /filter/i }), 'octo');
    expect(bodyRows()).toHaveLength(1);
    expect(rowNamed('Octo')).toBeDefined();
  });

  it('shows an empty state with a clear affordance on zero results (VAL-MAN-066)', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    // No closed method ships a diffusion head.
    await user.click(screen.getByRole('button', { name: /^closed$/i }));
    await user.click(screen.getByRole('button', { name: /^diffusion$/i }));

    expect(screen.queryByRole('table')).toBeNull();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/no methods match/i);
    await user.click(
      within(status).getByRole('button', { name: /clear filters/i }),
    );
    expect(bodyRows()).toHaveLength(METHODS.length);
  });

  it('reports the visible row count', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    expect(
      screen.getByText(`${METHODS.length} of ${METHODS.length} methods`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^open$/i }));
    const openCount = METHODS.filter((m) => m.openWeights).length;
    expect(
      screen.getByText(`${openCount} of ${METHODS.length} methods`),
    ).toBeInTheDocument();
  });

  it('reset restores filters and the initial sort', async () => {
    const user = userEvent.setup();
    render(<ComparisonMatrix />);
    await user.click(screen.getByRole('button', { name: /^closed$/i }));
    await user.click(screen.getByRole('button', { name: /sort by method/i }));

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(bodyRows()).toHaveLength(METHODS.length);
    expect(screen.getByRole('columnheader', { name: /year/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });
});
