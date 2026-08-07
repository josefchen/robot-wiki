import { z } from 'zod';
import { slugSchema } from './shared.ts';

export const actionRepresentationSchema = z.enum([
  'continuous',
  'discrete',
  'flow',
]);

export const triStateSchema = z.enum(['no', 'limited', 'yes']);

export const hierarchySchema = z.enum(['none', 'external', 'internal']);

/**
 * One row of the manipulation comparison matrix (data/methods.ts). Cells the
 * vendor has not disclosed are null and render as "not disclosed"; no row
 * ships without at least one citation-registry source id.
 */
export const methodSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  year: z.number().int().min(1980).max(2100).nullable(),
  actionRepresentation: actionRepresentationSchema,
  /** Planned chunk length vs. steps actually executed before re-inference. */
  actionHorizon: z.object({
    planned: z.number().int().positive().nullable(),
    executed: z.number().int().positive().nullable(),
  }),
  controlFrequencyHz: z.number().positive().nullable(),
  backbone: z.string().min(1).nullable(),
  conditioning: z.array(z.string().min(1)),
  crossEmbodiment: triStateSchema.nullable(),
  hierarchy: hierarchySchema.nullable(),
  openWeights: z.boolean(),
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
});

export type Method = z.infer<typeof methodSchema>;
