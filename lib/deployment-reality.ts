/**
 * Deployment-reality dashboard data for the reliability-gap module.
 *
 * The dashboard contrasts humanoid deployment figures that survive contact
 * with company filings and independent reporting ("verified") against figures
 * that circulate without a company source or rest on vendor-run demonstrations
 * ("claimed"). Row data lives here (not in the component) so the module's
 * prose, the dashboard, and the tests share one source, and so the unit
 * suite can assert that every row's sourceId resolves in the citation
 * registry.
 *
 * Figures come from the cited sources; never invent a number. The verified
 * rows trace to Technology Org's July 2026 deployment sweep, which cross-checks
 * company statements and filings; the claimed rows are labeled with why they
 * do not meet that bar.
 */

export type DeploymentStatus = 'verified' | 'claimed';

export type DeploymentFilter = 'all' | DeploymentStatus;

export type DeploymentRow = {
  /** Stable row id, used for test selectors. */
  id: string;
  /** Program and platform, e.g. "Agility Digit". */
  program: string;
  /** What kind of figure the row reports, e.g. "Operating hours". */
  metric: string;
  /** The headline figure, e.g. "65,000+". */
  value: string;
  /** One line of context: what the figure covers and why it earns its status. */
  detail: string;
  status: DeploymentStatus;
  /** Currency of the figure, e.g. "Jul 2026". */
  asOf: string;
  /** Citation registry id backing the row. */
  sourceId: string;
  /** Short outlet label rendered as the source link text. */
  sourceLabel: string;
};

export const DEPLOYMENT_ROWS: DeploymentRow[] = [
  {
    id: 'agility-digit',
    program: 'Agility Digit',
    metric: 'Operating hours',
    value: '65,000+',
    detail:
      'Across nine customer facilities; named customers include GXO, Schaeffler, Toyota Motor Manufacturing Canada, and Mercado Libre.',
    status: 'verified',
    asOf: 'Jul 2026',
    sourceId: 'technology-org-deployed-2026',
    sourceLabel: 'Technology Org',
  },
  {
    id: 'figure-bmw',
    program: 'Figure 02 at BMW Spartanburg',
    metric: 'Operating hours',
    value: '1,250+',
    detail:
      'Eleven-month pilot on a live assembly line: 90,000+ parts loaded, above 99% placement accuracy per shift, 84-second cycle time.',
    status: 'verified',
    asOf: 'Nov 2025',
    sourceId: 'technology-org-deployed-2026',
    sourceLabel: 'Technology Org',
  },
  {
    id: 'unitree-2025',
    program: 'Unitree humanoid line',
    metric: 'Units shipped',
    value: '~5,500',
    detail:
      'Shipped across the G1/H1/H2 line in 2025, more than any Western competitor; 10,000 to 20,000 units targeted for 2026.',
    status: 'verified',
    asOf: 'Jul 2026',
    sourceId: 'technology-org-deployed-2026',
    sourceLabel: 'Technology Org',
  },
  {
    id: 'tesla-optimus',
    program: 'Tesla Optimus',
    metric: 'Production status',
    value: 'Not started',
    detail:
      'Fremont production had not begun as of mid-July 2026, and Tesla has never published a production count; Q4 2025 earnings call described units as for learning, not productive tasks.',
    status: 'verified',
    asOf: 'Jul 2026',
    sourceId: 'technology-org-deployed-2026',
    sourceLabel: 'Technology Org',
  },
  {
    id: 'optimus-50k-claim',
    program: 'Tesla Optimus (circulating figure)',
    metric: 'Units built',
    value: '50,000+',
    detail:
      'A widely circulated claim with no company source; Tesla has never published a production count, audited or otherwise.',
    status: 'claimed',
    asOf: 'Jul 2026',
    sourceId: 'technology-org-deployed-2026',
    sourceLabel: 'Technology Org',
  },
  {
    id: 'figure-8hr-shift',
    program: 'Figure Helix 02',
    metric: 'Autonomous shift',
    value: '8 hours',
    detail:
      'May 13, 2026 vendor livestream of package sorting; a real broadcast, but a single task, one site, and no independent audit of the success rate.',
    status: 'claimed',
    asOf: 'May 2026',
    sourceId: 'figure-8hr-shift-2026',
    sourceLabel: 'TechTimes',
  },
];

/** Filter rows by evidence status; "all" returns the full set. */
export function filterDeployments(
  rows: DeploymentRow[],
  filter: DeploymentFilter,
): DeploymentRow[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => row.status === filter);
}
