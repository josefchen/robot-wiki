/**
 * Known exceptions for the market-map dataset source-URL liveness sweep
 * (scripts/check-dataset-sources.ts).
 *
 * An entry exists for a dataset source URL that is confirmed live but cannot
 * be verified by any machine client we can run — a hard bot-wall with no DOI
 * to verify through. Each entry must record WHY the URL cannot be
 * machine-verified, HOW a human last confirmed it is live, and WHEN.
 *
 * Matching is on the failure mode, not the URL alone: 'dead' is never
 * excepted, so a listed URL that starts genuinely 404ing still fails the
 * sweep. The list is empty as of 2026-08-18: the sweep that first ran on
 * that date found every bot-walled URL acceptable under the market-map
 * ledger's convention (a record is fine while it keeps at least one live
 * source), so no entry has been needed yet.
 */
export interface DatasetSourceException {
  /** The exact source URL from research/04-market-map-companies.json. */
  url: string;
  /** Why this URL cannot be verified by machine. */
  reason: string;
  /** How a human last confirmed the link is live (tool, status, evidence). */
  verifiedBy: string;
  /** ISO calendar date (YYYY-MM-DD) of that verification. */
  verifiedOn: string;
}

export const DATASET_SOURCE_EXCEPTIONS: DatasetSourceException[] = [];
