/**
 * Zod schema for the bear-case milestone rows (lib/bear-case.ts).
 *
 * Kept apart from the rows so the milestones watchlist, a Client
 * Component, can import the data without bundling zod into the browser.
 * The schema runs on the server at build time (lib/registry-validation.ts)
 * and in the unit suite.
 */
import { z } from 'zod';
import { MILESTONE_STATUSES } from './bear-case.ts';

export const milestoneStatusSchema = z.enum(MILESTONE_STATUSES);

export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const milestoneSchema = z.object({
  /** Stable row id, used for test selectors. */
  id: z.string().min(1),
  /** Short milestone name for the table row. */
  name: z.string().min(1),
  /** The question the milestone settles. */
  whyItMatters: z.string().min(1),
  status: milestoneStatusSchema,
  /** The published evidence behind the status call. */
  statusDetail: z.string().min(1),
  /** The observation that would flip the status to met. */
  howWeKnow: z.string().min(1),
  /** Citation registry ids backing the status detail. */
  citationIds: z.array(z.string().min(1)).min(1),
});

export type Milestone = z.infer<typeof milestoneSchema>;

/** The watchlist's completeness gate: exactly eight complete milestones. */
export const milestonesSchema = z.array(milestoneSchema).length(8);
