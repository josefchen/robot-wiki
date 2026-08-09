import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * One row of the teleop-rig comparison matrix (data/teleop-rigs.ts).
 *
 * Every row carries the four comparison dimensions the module is built
 * around: cost, data quality, throughput, and embodiment gap. Ratings use
 * a shared low/medium/high enum whose meaning each note explains; unknown
 * figures (e.g. the VR family's system cost) are null and render as "n/a",
 * never as invented values.
 */

export const rigRatingSchema = z.enum(['low', 'medium', 'high']);
export type RigRating = z.infer<typeof rigRatingSchema>;

export const teleopRigSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  /** Short descriptor of the rig family's operating principle. */
  family: z.string().min(1),
  /** Concrete rigs that belong to this family. */
  representatives: z.array(z.string().min(1)).min(1),
  /** Representative rig cost in USD; null when no source publishes one. */
  costUsd: z.number().positive().nullable(),
  /** Qualifier rendered under a known cost; must stay absent on null costs. */
  costNote: z.string().min(1).optional(),
  /** How faithfully the recorded demonstrations map onto robot execution. */
  dataQuality: rigRatingSchema,
  dataQualityNote: z.string().min(1),
  /** How cheaply demonstration volume scales with more collectors. */
  throughput: rigRatingSchema,
  throughputNote: z.string().min(1),
  /** How far the recorded motion is from what the robot actually executes. */
  embodimentGap: rigRatingSchema,
  embodimentGapNote: z.string().min(1),
  /** Per-dimension one-paragraph detail shown by the highlight control. */
  details: z.object({
    cost: z.string().min(1),
    dataQuality: z.string().min(1),
    throughput: z.string().min(1),
    embodimentGap: z.string().min(1),
  }),
  /** External links rendered in the sources column. */
  links: z
    .array(z.object({ label: z.string().min(1), url: httpsUrlSchema }))
    .min(1),
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
});

export type TeleopRig = z.infer<typeof teleopRigSchema>;
