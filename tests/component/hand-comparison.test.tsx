import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HandComparison } from '@/components/interactive/hand-comparison';
import { DEXTEROUS_HANDS } from '@/lib/dexterous-hands';

/** Rendered row order as hand ids, top to bottom. */
function rowOrder(): string[] {
  return screen
    .getAllByTestId(/^hand-row-/)
    .map((el) => (el.getAttribute('data-testid') ?? '').replace('hand-row-', ''));
}

const DEFAULT_ORDER = ['sanctuary-phoenix', 'figure-02-03'];

describe('HandComparison', () => {
  it('renders every hand with its specs, as-of date, and source link', () => {
    render(<HandComparison />);
    for (const hand of DEXTEROUS_HANDS) {
      const row = screen.getByTestId(`hand-row-${hand.id}`);
      const scope = within(row);
      expect(
        scope.getByRole('button', {
          name: `Select ${hand.name} for comparison`,
        }),
      ).toBeInTheDocument();
      expect(scope.getByText(hand.dofDisplay)).toBeInTheDocument();
      if (hand.tactileDisplay) {
        expect(scope.getByText(hand.tactileDisplay)).toBeInTheDocument();
      }
      if (hand.costDisplay) {
        expect(scope.getByText(hand.costDisplay)).toBeInTheDocument();
      }
      expect(scope.getByText(hand.asOf)).toBeInTheDocument();
      const source = scope.getByRole('link', { name: hand.sourceLabel });
      expect(source).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(source).toHaveAttribute('target', '_blank');
    }
  });

  it('renders undisclosed specs as "not disclosed", never a guessed value', () => {
    render(<HandComparison />);
    // Tesla tactile + cost, Figure cost, Shadow tactile, Sanctuary cost,
    // Unitree tactile.
    expect(screen.getAllByText('not disclosed', { exact: true })).toHaveLength(6);
    expect(screen.queryByText('n/a', { exact: true })).not.toBeInTheDocument();
  });

  it('opens sorted by tactile threshold, most sensitive first', () => {
    render(<HandComparison />);
    expect(rowOrder().slice(0, 2)).toEqual(DEFAULT_ORDER);
    // Hands without a disclosed threshold fill the bottom of the table.
    expect(rowOrder().slice(2)).toEqual([
      'tesla-optimus-gen3',
      'shadow-dexterous',
      'unitree-h2',
    ]);
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      /tactile threshold, most sensitive first/,
    );
    expect(
      screen.getByRole('columnheader', { name: /tactile threshold/i }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by DoF on header click and toggles direction on a second click', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    const dofHeader = screen.getByRole('columnheader', { name: /dof/i });
    await user.click(screen.getByRole('button', { name: 'Sort by DoF' }));
    expect(rowOrder()[0]).toBe('tesla-optimus-gen3');
    expect(dofHeader).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      /degrees of freedom, most first/,
    );
    await user.click(screen.getByRole('button', { name: 'Sort by DoF' }));
    expect(rowOrder()[0]).toBe('unitree-h2');
    expect(dofHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by cost, cheapest first, with undisclosed prices last', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    await user.click(screen.getByRole('button', { name: 'Sort by cost' }));
    expect(rowOrder().slice(0, 2)).toEqual(['unitree-h2', 'shadow-dexterous']);
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      /cost, lowest first/,
    );
  });

  it('lets the user select hands and compares their trade-offs', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    const selection = screen.getByTestId('hand-comparison-selection');
    expect(selection).toHaveTextContent(/select hands to compare/i);

    const sanctuary = DEXTEROUS_HANDS.find((h) => h.id === 'sanctuary-phoenix');
    const tesla = DEXTEROUS_HANDS.find((h) => h.id === 'tesla-optimus-gen3');
    const sanctuaryToggle = screen.getByRole('button', {
      name: `Select ${sanctuary?.name} for comparison`,
    });
    const teslaToggle = screen.getByRole('button', {
      name: `Select ${tesla?.name} for comparison`,
    });

    await user.click(sanctuaryToggle);
    await user.click(teslaToggle);
    expect(sanctuaryToggle).toHaveAttribute('aria-pressed', 'true');
    expect(teslaToggle).toHaveAttribute('aria-pressed', 'true');
    expect(selection).toHaveTextContent(sanctuary?.tradeoff ?? '');
    expect(selection).toHaveTextContent(tesla?.tradeoff ?? '');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      '2 selected',
    );

    await user.click(teslaToggle);
    expect(teslaToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      '1 selected',
    );
  });

  it('operates from the keyboard', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    const costSort = screen.getByRole('button', { name: 'Sort by cost' });
    costSort.focus();
    await user.keyboard('{Enter}');
    expect(rowOrder()[0]).toBe('unitree-h2');

    const shadow = DEXTEROUS_HANDS.find((h) => h.id === 'shadow-dexterous');
    const toggle = screen.getByRole('button', {
      name: `Select ${shadow?.name} for comparison`,
    });
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hand-comparison-selection')).toHaveTextContent(
      shadow?.tradeoff ?? '',
    );
  });

  it('reset restores the default sort and clears the selection', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    await user.click(screen.getByRole('button', { name: 'Sort by cost' }));
    const figure = DEXTEROUS_HANDS.find((h) => h.id === 'figure-02-03');
    const toggle = screen.getByRole('button', {
      name: `Select ${figure?.name} for comparison`,
    });
    await user.click(toggle);
    expect(rowOrder()[0]).toBe('unitree-h2');

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(rowOrder().slice(0, 2)).toEqual(DEFAULT_ORDER);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hand-comparison-selection')).toHaveTextContent(
      /select hands to compare/i,
    );
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      /tactile threshold, most sensitive first/,
    );
    expect(screen.getByTestId('hand-comparison-readout')).not.toHaveTextContent(
      /selected/,
    );
  });
});
