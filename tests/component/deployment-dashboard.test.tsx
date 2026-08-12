import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DeploymentDashboard } from '@/components/interactive/deployment-dashboard';
import { DEPLOYMENT_ROWS } from '@/lib/deployment-reality';

const VERIFIED_COUNT = DEPLOYMENT_ROWS.filter((r) => r.status === 'verified').length;
const CLAIMED_COUNT = DEPLOYMENT_ROWS.filter((r) => r.status === 'claimed').length;

describe('DeploymentDashboard', () => {
  it('renders every deployment row with status badge, as-of date, and source link', () => {
    render(<DeploymentDashboard />);
    for (const row of DEPLOYMENT_ROWS) {
      const el = screen.getByTestId(`deployment-row-${row.id}`);
      expect(el).toBeInTheDocument();
      const rowScope = within(el);
      // Status badge is visible and matches the row's status.
      expect(rowScope.getByText(row.status)).toBeInTheDocument();
      // As-of date renders.
      expect(rowScope.getByText(row.asOf)).toBeInTheDocument();
      // Source link is external and reachable.
      const source = rowScope.getByRole('link', { name: row.sourceLabel });
      expect(source).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(source).toHaveAttribute('target', '_blank');
    }
  });

  it('distinguishes verified from claimed visually via badge variants', () => {
    render(<DeploymentDashboard />);
    const verifiedBadges = screen
      .getAllByText('verified')
      .map((el) => el.getAttribute('data-variant'));
    const claimedBadges = screen
      .getAllByText('claimed')
      .map((el) => el.getAttribute('data-variant'));
    expect(verifiedBadges.length).toBe(VERIFIED_COUNT);
    expect(claimedBadges.length).toBe(CLAIMED_COUNT);
    // The two states must not share a variant, or they blend.
    for (const v of verifiedBadges) {
      expect(claimedBadges).not.toContain(v);
    }
  });

  it('filters to verified rows only', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: 'Verified' }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(VERIFIED_COUNT);
    expect(screen.queryByText('claimed')).not.toBeInTheDocument();
    expect(screen.getByTestId('deployment-count')).toHaveTextContent(
      `${VERIFIED_COUNT} of ${DEPLOYMENT_ROWS.length}`,
    );
  });

  it('filters to claimed rows only', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: 'Claimed' }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(CLAIMED_COUNT);
    expect(screen.queryByText('verified')).not.toBeInTheDocument();
  });

  it('exposes aria-pressed on the filter buttons', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    const all = screen.getByRole('button', { name: 'All' });
    const verified = screen.getByRole('button', { name: 'Verified' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(verified).toHaveAttribute('aria-pressed', 'false');
    await user.click(verified);
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(verified).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset restores the full unfiltered dashboard', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: 'Claimed' }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(CLAIMED_COUNT);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(
      DEPLOYMENT_ROWS.length,
    );
    expect(screen.getByTestId('deployment-count')).toHaveTextContent(
      `${DEPLOYMENT_ROWS.length} of ${DEPLOYMENT_ROWS.length}`,
    );
  });
});
