import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  MilestonesWatchlist,
  plainMilestoneName,
} from '@/components/interactive/milestones-watchlist';
import { MILESTONES } from '@/lib/bear-case';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('MilestonesWatchlist');

const STATUS_PLAIN: Record<string, string> = {
  'not-met': 'Not yet',
  partial: 'Partly there',
  met: 'Done',
};

function milestoneById(id: string) {
  const milestone = MILESTONES.find((m) => m.id === id);
  if (!milestone) throw new Error(`unknown milestone ${id}`);
  return milestone;
}

const tile = (id: string) => screen.getByRole('button', { name: plainMilestoneName(id) });

describe('MilestonesWatchlist', () => {
  it('draws a scoreboard tile for each of the eight milestones with its status', () => {
    render(<MilestonesWatchlist />);
    expect(
      screen.getByText('Eight results would prove skeptics wrong; none has happened yet'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId(/^milestone-tile-/)).toHaveLength(8);
    for (const milestone of MILESTONES) {
      const scope = within(screen.getByTestId(`milestone-tile-${milestone.id}`));
      expect(scope.getByRole('button', { name: plainMilestoneName(milestone.id) })).toBeInTheDocument();
      expect(scope.getByText(STATUS_PLAIN[milestone.status])).toHaveAttribute(
        'data-milestone-status',
        milestone.status,
      );
    }
    expect(screen.getByTestId('watchlist-score')).toHaveTextContent('0 of 8 done');
    expect(screen.getByTestId('watchlist-tally')).toHaveTextContent(
      '4 partly there, 4 not yet, 0 done',
    );
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(/^Showing all 8$/);
  });

  it('keeps every original name, reason, evidence and test in the method table', () => {
    render(<MilestonesWatchlist />);
    expect(screen.getAllByTestId(/^milestone-row-/)).toHaveLength(8);
    for (const milestone of MILESTONES) {
      const row = screen.getByTestId(`milestone-row-${milestone.id}`);
      expect(row.closest('details')).not.toBeNull();
      const scope = within(row);
      expect(scope.getByText(milestone.name)).toBeInTheDocument();
      expect(scope.getByText(milestone.whyItMatters)).toBeInTheDocument();
      expect(row).toHaveTextContent(milestone.statusDetail);
      expect(scope.getByText(milestone.howWeKnow)).toBeInTheDocument();
      for (const id of milestone.citationIds) {
        expect(row.querySelector(`[data-cite-id="${id}"]`)).not.toBeNull();
      }
    }
  });

  it('opens with no tile selected, then shows the detail fields of a tapped tile', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    expect(screen.queryByTestId('milestone-detail')).not.toBeInTheDocument();
    const first = MILESTONES[0];
    await user.click(tile(first.id));
    expect(tile(first.id)).toHaveAttribute('aria-pressed', 'true');

    const detail = screen.getByTestId('milestone-detail');
    const scope = within(detail);
    expect(scope.getByText(first.whyItMatters)).toBeInTheDocument();
    expect(detail).toHaveTextContent(first.statusDetail);
    expect(scope.getByText(first.howWeKnow)).toBeInTheDocument();
    expect(scope.getByText(/why it matters/i)).toBeInTheDocument();
    expect(scope.getByText(/current status/i)).toBeInTheDocument();
    expect(scope.getByText(/how we’d know/i)).toBeInTheDocument();
  });

  it('switches the detail view when another tile is tapped', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    await user.click(tile(MILESTONES[0].id));
    const target = milestoneById('data-scaling-law');
    await user.click(tile(target.id));

    expect(tile(target.id)).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByTestId('milestone-detail');
    expect(detail).toHaveTextContent(target.statusDetail);
    expect(detail).toHaveTextContent(target.howWeKnow);
    expect(detail).not.toHaveTextContent(MILESTONES[0].statusDetail);
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      `open: ${plainMilestoneName(target.id)}`,
    );
  });

  it('filters tiles by status and closes a detail the filter hides', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    // unseen-homes-policy is partial; filtering to "Not yet" hides it.
    await user.click(tile('unseen-homes-policy'));
    await user.click(screen.getByRole('button', { name: 'Not yet' }));

    const tiles = screen.getAllByTestId(/^milestone-tile-/);
    expect(tiles.length).toBe(4);
    for (const element of tiles) {
      expect(element).toHaveAttribute('data-status', 'not-met');
    }
    expect(screen.getByRole('button', { name: 'Not yet' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      'Showing 4 of 8: not yet',
    );
    expect(screen.queryByTestId('milestone-detail')).not.toBeInTheDocument();
  });

  it('shows an explicit empty state for the status no milestone has reached', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    await user.click(screen.getByRole('button', { name: 'Done (0)' }));

    expect(screen.queryAllByTestId(/^milestone-tile-/)).toHaveLength(0);
    expect(screen.queryByTestId('milestone-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('watchlist-empty')).toHaveTextContent(
      /none of the eight milestones/i,
    );
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(
      'Showing 0 of 8: done',
    );
  });

  it('renders status-detail citations as external links', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    const first = MILESTONES[0];
    await user.click(tile(first.id));
    const detail = screen.getByTestId('milestone-detail');
    for (const id of first.citationIds) {
      const chip = detail.querySelector(`[data-cite-id="${id}"]`);
      expect(chip, `missing chip for ${id}`).not.toBeNull();
      const external = chip?.querySelector('a[href^="http"]');
      expect(external, `chip ${id} has no external link`).not.toBeNull();
      expect(external).toHaveAttribute('target', '_blank');
    }
  });

  it('is operable from the keyboard: Enter selects, arrows move between tiles', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    const [first, second, third] = MILESTONES;

    tile(first.id).focus();
    await user.keyboard('{Enter}');
    expect(tile(first.id)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowDown}');
    expect(tile(second.id)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('milestone-detail')).toHaveTextContent(second.statusDetail);

    await user.keyboard('{ArrowRight}');
    expect(tile(third.id)).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(tile(second.id)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{End}');
    expect(tile(MILESTONES[7].id)).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset under "Adjust more" restores the full board and closes the detail', async () => {
    const user = userEvent.setup();
    render(<MilestonesWatchlist />);
    await user.click(screen.getByRole('button', { name: 'Partly' }));
    expect(screen.getAllByTestId(/^milestone-tile-/)).toHaveLength(4);
    await user.click(tile('data-scaling-law'));

    const reset = screen.getByRole('button', { name: /reset/i, hidden: true });
    expect(reset.closest('details')).not.toBeNull();
    await user.click(reset);
    expect(screen.getAllByTestId(/^milestone-tile-/)).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('milestone-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('watchlist-readout')).toHaveTextContent(/^Showing all 8$/);
  });
});
