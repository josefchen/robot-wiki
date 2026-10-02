import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HandComparison } from '@/components/interactive/hand-comparison';
import { DEXTEROUS_HANDS } from '@/lib/dexterous-hands';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('HandComparison');

/** Rendered card order as hand ids, top to bottom. */
function cardOrder(): string[] {
  return screen
    .getAllByTestId(/^hand-card-/)
    .map((el) => (el.getAttribute('data-testid') ?? '').replace('hand-card-', ''));
}

/** Rendered table row order (in "How this was made"), top to bottom. */
function rowOrder(): string[] {
  return screen
    .getAllByTestId(/^hand-row-/)
    .map((el) => (el.getAttribute('data-testid') ?? '').replace('hand-row-', ''));
}

const DEFAULT_ORDER = ['sanctuary-phoenix', 'figure-02-03'];

describe('HandComparison', () => {
  it('leads with a plain-words claim and keeps the sort presets visible', () => {
    render(<HandComparison />);
    expect(
      screen.getByText('No hand here publishes both touch sensitivity and price'),
    ).toBeInTheDocument();
    const sort = screen.getByRole('group', { name: 'Sort by' });
    for (const label of ['Most joints', 'Lightest touch felt', 'Lowest price']) {
      expect(within(sort).getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByTestId('hand-gap-note')).toHaveTextContent(
      'Grey means the maker hasn’t published it. No hand shows both.',
    );
  });

  it('draws a card per hand and keeps the full table with sources in the method', () => {
    render(<HandComparison />);
    for (const hand of DEXTEROUS_HANDS) {
      const card = screen.getByTestId(`hand-card-${hand.id}`);
      expect(within(card).getByText(hand.name)).toBeInTheDocument();
      expect(within(card).getByText('Ways it can move')).toBeInTheDocument();

      const row = screen.getByTestId(`hand-row-${hand.id}`);
      const scope = within(row);
      expect(scope.getByText(hand.dofDisplay)).toBeInTheDocument();
      if (hand.tactileDisplay) {
        expect(scope.getByText(hand.tactileDisplay)).toBeInTheDocument();
      }
      if (hand.costDisplay) {
        expect(scope.getByText(hand.costDisplay)).toBeInTheDocument();
      }
      expect(scope.getByText(hand.asOf)).toBeInTheDocument();
      const source = scope.getByRole('link', { name: hand.sourceLabel, hidden: true });
      expect(source).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(source).toHaveAttribute('target', '_blank');
    }
    expect(screen.getByTestId('hand-row-unitree-h2').closest('details')).not.toBeNull();
  });

  it('renders undisclosed specs as "not disclosed", never a guessed value', () => {
    render(<HandComparison />);
    // Cards: Sanctuary price, Figure price, Tesla touch + price, Shadow
    // touch, Unitree touch + hand price (its listed price is the whole robot).
    expect(document.querySelectorAll('[data-hand-gap]')).toHaveLength(7);
    // Table: Tesla tactile + cost, Figure cost, Shadow tactile, Sanctuary
    // cost, Unitree tactile.
    const tableGaps = screen
      .getAllByTestId(/^hand-row-/)
      .flatMap((row) => within(row).queryAllByText('not disclosed', { exact: true }));
    expect(tableGaps).toHaveLength(6);
    expect(screen.queryByText('n/a', { exact: true })).not.toBeInTheDocument();
  });

  it('labels Unitree’s $29,900 as the whole-robot price, not the hand price', () => {
    render(<HandComparison />);
    const card = within(screen.getByTestId('hand-card-unitree-h2'));
    expect(card.getByTestId('whole-robot-price')).toHaveTextContent('Whole robot: $29,900');
    expect(card.getByText('Price of the hand').nextElementSibling).toHaveTextContent(
      /not disclosed/,
    );
  });

  it('captions why the gap matters, with the disclosure counts the data carries', () => {
    render(<HandComparison />);
    const tactile = DEXTEROUS_HANDS.filter((hand) => hand.tactileDisplay).length;
    const cost = DEXTEROUS_HANDS.filter((hand) => hand.costDisplay).length;
    const both = DEXTEROUS_HANDS.filter((hand) => hand.tactileDisplay && hand.costDisplay).length;
    // The headline and caption claim no hand publishes both; a data change
    // that breaks this must rewrite them.
    expect([tactile, cost, both]).toEqual([2, 2, 0]);
    expect(
      screen.getByText(
        'Two numbers buyers need, touch sensitivity and price, are never published together for these five robot hands.',
      ),
    ).toHaveAttribute('data-figure-caption');
  });

  it('opens sorted by lightest touch felt', () => {
    render(<HandComparison />);
    expect(cardOrder().slice(0, 2)).toEqual(DEFAULT_ORDER);
    // Hands without a disclosed threshold fill the end.
    expect(cardOrder().slice(2)).toEqual([
      'tesla-optimus-gen3',
      'shadow-dexterous',
      'unitree-h2',
    ]);
    expect(rowOrder()).toEqual(cardOrder());
    expect(screen.getByRole('button', { name: 'Lightest touch felt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      '5 hands, lightest touch felt first',
    );
    expect(
      screen.getByRole('columnheader', { name: /tactile threshold/i, hidden: true }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by most joints, and the reverse toggle flips the order', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    await user.click(screen.getByRole('button', { name: 'Most joints' }));
    expect(cardOrder()[0]).toBe('tesla-optimus-gen3');
    expect(
      screen.getByRole('columnheader', { name: /dof/i, hidden: true }),
    ).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      'most ways to move first',
    );
    await user.click(screen.getByRole('button', { name: 'Reverse the order', hidden: true }));
    expect(cardOrder()[0]).toBe('unitree-h2');
    expect(screen.getByRole('button', { name: 'Most joints' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('sorts by hand price and never ranks the whole-robot price as a hand', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    await user.click(screen.getByRole('button', { name: 'Lowest price' }));
    expect(cardOrder()[0]).toBe('shadow-dexterous');
    expect(cardOrder()).toContain('unitree-h2');
    expect(cardOrder().indexOf('unitree-h2')).toBeGreaterThan(0);
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      'lowest hand price first',
    );
  });

  it('lets the user select hands under "Adjust more" and compares their trade-offs', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    const selection = screen.getByTestId('hand-comparison-selection');
    expect(selection.closest('details')).not.toBeNull();
    expect(selection).toHaveTextContent(/select hands to compare/i);

    const sanctuary = DEXTEROUS_HANDS.find((h) => h.id === 'sanctuary-phoenix');
    const tesla = DEXTEROUS_HANDS.find((h) => h.id === 'tesla-optimus-gen3');
    const sanctuaryToggle = screen.getByRole('button', {
      name: `Select ${sanctuary?.name} for comparison`,
      hidden: true,
    });
    const teslaToggle = screen.getByRole('button', {
      name: `Select ${tesla?.name} for comparison`,
      hidden: true,
    });

    await user.click(sanctuaryToggle);
    await user.click(teslaToggle);
    expect(sanctuaryToggle).toHaveAttribute('aria-pressed', 'true');
    expect(teslaToggle).toHaveAttribute('aria-pressed', 'true');
    expect(selection).toHaveTextContent(sanctuary?.tradeoff ?? '');
    expect(selection).toHaveTextContent(tesla?.tradeoff ?? '');
    expect(screen.getByTestId('hand-card-sanctuary-phoenix')).toHaveAttribute('data-selected');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent('2 selected');

    await user.click(teslaToggle);
    expect(teslaToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent('1 selected');
  });

  it('operates from the keyboard', async () => {
    const user = userEvent.setup();
    render(<HandComparison />);
    const priceSort = screen.getByRole('button', { name: 'Lowest price' });
    priceSort.focus();
    await user.keyboard('{Enter}');
    expect(cardOrder()[0]).toBe('shadow-dexterous');

    const shadow = DEXTEROUS_HANDS.find((h) => h.id === 'shadow-dexterous');
    const toggle = screen.getByRole('button', {
      name: `Select ${shadow?.name} for comparison`,
      hidden: true,
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
    await user.click(screen.getByRole('button', { name: 'Lowest price' }));
    const figure = DEXTEROUS_HANDS.find((h) => h.id === 'figure-02-03');
    const toggle = screen.getByRole('button', {
      name: `Select ${figure?.name} for comparison`,
      hidden: true,
    });
    await user.click(toggle);
    expect(cardOrder()[0]).toBe('shadow-dexterous');

    await user.click(screen.getByRole('button', { name: /reset/i, hidden: true }));
    expect(cardOrder().slice(0, 2)).toEqual(DEFAULT_ORDER);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hand-comparison-selection')).toHaveTextContent(
      /select hands to compare/i,
    );
    expect(screen.getByTestId('hand-comparison-readout')).toHaveTextContent(
      '5 hands, lightest touch felt first',
    );
    expect(screen.getByTestId('hand-comparison-readout')).not.toHaveTextContent(/selected/);
  });
});
