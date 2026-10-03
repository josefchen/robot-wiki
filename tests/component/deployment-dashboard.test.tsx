import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEPLOYMENT_STATUS_LABEL, DeploymentDashboard } from '@/components/interactive/deployment-dashboard';
import { DEPLOYMENT_ROWS } from '@/lib/deployment-reality';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('DeploymentDashboard');

const VERIFIED_COUNT = DEPLOYMENT_ROWS.filter((r) => r.status === 'verified').length;
const CLAIMED_COUNT = DEPLOYMENT_ROWS.filter((r) => r.status === 'claimed').length;
const BACKED = DEPLOYMENT_STATUS_LABEL.verified;
const DEMO = DEPLOYMENT_STATUS_LABEL.claimed;

/** The status chips of the records table in "How this was made", which carry the badge variant. */
const chips = (label: string) => screen.queryAllByText(label, { selector: '[data-variant]' });

describe('DeploymentDashboard', () => {
  it('renders every deployment row with status badge, as-of date, and source link', () => {
    render(<DeploymentDashboard />);
    for (const row of DEPLOYMENT_ROWS) {
      const el = screen.getByTestId(`deployment-row-${row.id}`);
      expect(el).toBeInTheDocument();
      const rowScope = within(el);
      // Status badge names what backs the row, in the reader's words.
      expect(rowScope.getByText(DEPLOYMENT_STATUS_LABEL[row.status])).toBeInTheDocument();
      // As-of date renders.
      expect(rowScope.getByText(row.asOf)).toBeInTheDocument();
      // Source link is external and reachable.
      const source = rowScope.getByRole('link', { name: row.sourceLabel, hidden: true });
      expect(source).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(source).toHaveAttribute('target', '_blank');
    }
  });

  it('distinguishes verified from claimed visually via badge variants', () => {
    render(<DeploymentDashboard />);
    const verifiedBadges = chips(BACKED).map((el) => el.getAttribute('data-variant'));
    const claimedBadges = chips(DEMO).map((el) => el.getAttribute('data-variant'));
    expect(verifiedBadges.length).toBe(VERIFIED_COUNT);
    expect(claimedBadges.length).toBe(CLAIMED_COUNT);
    // The two states must not share a variant, or they blend.
    for (const v of verifiedBadges) {
      expect(claimedBadges).not.toContain(v);
    }
    // No badge, filter or label calls a company-reported record verified.
    expect(screen.queryAllByText(/verified/i)).toEqual([]);
  });

  it('filters to verified rows only', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: BACKED }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(VERIFIED_COUNT);
    expect(chips(DEMO)).toEqual([]);
    expect(screen.queryByTestId('deployment-group-claimed')).not.toBeInTheDocument();
    expect(screen.getByTestId('deployment-count')).toHaveTextContent(
      `${VERIFIED_COUNT} of ${DEPLOYMENT_ROWS.length}`,
    );
  });

  it('filters to claimed rows only', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: DEMO }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(CLAIMED_COUNT);
    expect(chips(BACKED)).toEqual([]);
    expect(screen.queryByTestId('deployment-group-verified')).not.toBeInTheDocument();
  });

  it('exposes aria-pressed on the filter buttons', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    const all = screen.getByRole('button', { name: 'All' });
    const verified = screen.getByRole('button', { name: BACKED });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(verified).toHaveAttribute('aria-pressed', 'false');
    await user.click(verified);
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(verified).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset restores the full unfiltered dashboard', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard />);
    await user.click(screen.getByRole('button', { name: DEMO }));
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(CLAIMED_COUNT);
    const reset = screen.getByRole('button', { name: /reset/i, hidden: true });
    // Reset sits in the "Adjust more" fold.
    expect(reset.closest('details')).not.toBeNull();
    await user.click(reset);
    expect(screen.getAllByTestId(/^deployment-row-/).length).toBe(
      DEPLOYMENT_ROWS.length,
    );
    expect(screen.getByTestId('deployment-count')).toHaveTextContent(
      `${DEPLOYMENT_ROWS.length} of ${DEPLOYMENT_ROWS.length}`,
    );
  });

  it('offers keyboard and pointer recovery from an empty filtered category', async () => {
    const user = userEvent.setup();
    render(<DeploymentDashboard deploymentRows={DEPLOYMENT_ROWS.filter(r => r.status === 'claimed')} />);
    await user.click(screen.getByRole('button', { name: BACKED }));
    expect(screen.getByTestId('deployment-count')).toHaveTextContent('0 of 1 records');
    expect(screen.queryByTestId(/^deployment-row-/)).not.toBeInTheDocument();
    const recover = screen.getByRole('button', { name: 'Show all records' });
    expect(recover).toBeVisible();
    recover.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('deployment-count')).toHaveTextContent('1 of 1 records');
    await user.click(screen.getByRole('button', { name: BACKED }));
    await user.click(screen.getByRole('button', { name: 'Reset', hidden: true }));
    expect(screen.getByTestId('deployment-row-figure-8hr-shift')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-bar-figure-8hr-shift')).toBeVisible();
  });
});
