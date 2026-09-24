/**
 * Deployment-reality dashboard data for the reliability-gap module.
 *
 * "Verified" means source-backed at the stated scope, not independently
 * audited: the hours and parts below are vendor reports, and Tesla's stage
 * comes from its own quarterly update. "Claimed" marks a vendor demonstration,
 * not a measured deployment. Row data lives here (not in the component) so the module's
 * prose, the dashboard, and the tests share one source, and so the unit
 * suite can assert that every row's sourceId resolves in the citation
 * registry.
 *
 * Figures come from the cited documents at their own dates, never a common
 * July snapshot. No Unitree shipment or Tesla build count is established by
 * the inspected primary records; neither appears as a dashboard row.
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
  /** Publication date or (for an undated page) actual retrieval date. */
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
    value: '65,000',
    detail:
      'Digit production experience reported on Agility’s undated homepage. No facility allocation or measurement date is given; company-reported, not audited.',
    status: 'verified',
    asOf: 'n.d.; accessed Sep 24, 2026',
    sourceId: 'agility-digit-production',
    sourceLabel: 'Agility Robotics',
  },
  {
    id: 'figure-bmw',
    program: 'Figure 02 at BMW Spartanburg',
    metric: 'Operating hours',
    value: '1,250+',
    detail:
      'Figure reports runtime and 90,000+ parts loaded at BMW Spartanburg during an eleven-month deployment. The 84-second cycle and >99% accuracy were targets, not achieved KPIs.',
    status: 'verified',
    asOf: 'Nov 19, 2025',
    sourceId: 'figure-bmw-production-2025',
    sourceLabel: 'Figure AI',
  },
  {
    id: 'tesla-optimus',
    program: 'Tesla Optimus',
    metric: 'Production status',
    value: 'Construction',
    detail:
      'Tesla lists its California and Texas Optimus lines as under construction in its Q1 update. First-generation lines were being installed in anticipation of volume production; designed capacity is not output.',
    status: 'verified',
    asOf: 'Q1 2026',
    sourceId: 'tesla-q1-2026-update',
    sourceLabel: 'Tesla',
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
