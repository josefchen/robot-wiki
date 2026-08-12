import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MilestonesWatchlist } from '@/components/interactive/milestones-watchlist';
import { MILESTONES } from '@/lib/bear-case';

const STATUS_LABEL: Record<string, string> = {
  'not-met': 'not met',
  partial: 'partial',
  met: 'met',
};

function milestoneById(id: string) {
  const milestone = MILESTONES.find((m) => m.id === id);
  if (!milestone) throw new Error(`unknown milestone ${id}`);
  return milestone;
}

describe('MilestonesWatchlist', () => {
  it('renders a row for each of the eight milestones with its status badge', () => {
    render(<MilestonesWatchlist />);
    expect(screen.getAllByTestId(/^milestone-row-/)).toHaveLength(8);
    for (const milestone of MILESTONES) {
      const row = screen.getByTestId(`milestone-row-${milestone.id}`);
      const scope = within(row);
      expect(
        scope.getByRole('button', { name: milestone.name }),
      ).toBeInTheDocument();
      expect(scope.getByText(milestone.whyItMatters)).toBeInTheDocument();
      expect(
        scope.getByText(STATUS_LABEL[milestone.status]),
      ).toBeInTheDocument();
    }
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      /^8 milestones: 4 not met, 4 partial, 0 met$/,
    );
  });

  it('opens with the first milestone selected and its detail fields visible', () => {
    render(<MilestonesWatchlist />);
    const first = MILESTONES[0];
    expect(
      screen.getByRole('button', { name: first.name }),
    ).toHaveAttribute('aria-pressed', 'true');

    const detail = screen.getByTestId('milestone-detail');
    const scope = within(detail);
    expect(scope.getByText(first.whyItMatters)).toBeInTheDocument();
    expect(scope.getByText(first.statusDetail)).toBeInTheDocument();
    expect(scope.getByText(first.howWeKnow)).toBeInTheDocument();
    expect(scope.getByText(/why it matters/i)).toBeInTheDocument();
    expect(scope.getByText(/current status/i)).toBeInTheDocument();
    expect(scope.getByText(/how we’d know/i)).toBeInTheDocument();
  });

  it('switches the detail view when another milestone row is clicked', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    const target = milestoneById('data-scaling-law');
    await user.click(screen.getByRole('button', { name: target.name }));

    expect(
      screen.getByRole('button', { name: target.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByTestId('milestone-detail');
    expect(detail).toHaveTextContent(target.statusDetail);
    expect(detail).toHaveTextContent(target.howWeKnow);
    expect(detail).not.toHaveTextContent(MILESTONES[0].statusDetail);
  });

  it('filters rows by status and moves the selection into the visible set', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    // The default selection (unseen-homes-policy) is partial; filtering to
    // "not met" hides it, so the detail must move to a visible row.
    await user.click(screen.getByRole('button', { name: 'Not met' }));

    const rows = screen.getAllByTestId(/^milestone-row-/);
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(within(row).getByText('not met')).toBeInTheDocument();
    }
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      'showing 4 of 8 milestones (not met)',
    );
    const firstNotMet = milestoneById('ten-thousand-unit-deployment');
    expect(
      screen.getByRole('button', { name: firstNotMet.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('milestone-detail')).toHaveTextContent(
      firstNotMet.statusDetail,
    );
  });

  it('shows an explicit empty state for the status no milestone has reached', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    await user.click(screen.getByRole('button', { name: 'Met' }));

    expect(screen.queryAllByTestId(/^milestone-row-/)).toHaveLength(0);
    expect(screen.queryByTestId('milestone-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('watchlist-empty')).toHaveTextContent(
      /none of the eight milestones/i,
    );
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      'showing 0 of 8 milestones (met)',
    );
  });

  it('renders status-detail citations as external links', () => {
    render(<MilestonesWatchlist />);
    const first = MILESTONES[0];
    const detail = screen.getByTestId('milestone-detail');
    for (const id of first.citationIds) {
      const chip = detail.querySelector(`[data-cite-id="${id}"]`);
      expect(chip, `missing chip for ${id}`).not.toBeNull();
      const external = chip?.querySelector('a[href^="http"]');
      expect(external, `chip ${id} has no external link`).not.toBeNull();
      expect(external).toHaveAttribute('target', '_blank');
    }
  });

  it('is operable from the keyboard: arrows move between milestones, Enter selects', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    const first = milestoneById('unseen-homes-policy');
    const second = milestoneById('ten-thousand-unit-deployment');
    const third = milestoneById('open-benchmark');

    const firstButton = screen.getByRole('button', { name: first.name });
    firstButton.focus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('button', { name: second.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('milestone-detail')).toHaveTextContent(
      second.statusDetail,
    );

    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('button', { name: third.name }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: second.name }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset restores the full list and the default selection', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    await user.click(screen.getByRole('button', { name: 'Partial' }));
    expect(screen.getAllByTestId(/^milestone-row-/)).toHaveLength(4);
    const target = milestoneById('data-scaling-law');
    await user.click(screen.getByRole('button', { name: target.name }));

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getAllByTestId(/^milestone-row-/)).toHaveLength(8);
    const first = MILESTONES[0];
    expect(
      screen.getByRole('button', { name: first.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('milestone-detail')).toHaveTextContent(
      first.statusDetail,
    );
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      /^8 milestones: /,
    );
  });
});
