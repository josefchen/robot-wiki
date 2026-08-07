import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * One row of the dataset comparison data (data/datasets.ts). Unknown size
 * figures are null, never invented.
 */
export const datasetSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  year: z.number().int().min(1980).max(2100).nullable(),
  episodes: z.number().int().positive().nullable(),
  hours: z.number().positive().nullable(),
  embodiments: z.array(z.string().min(1)),
  /** Number of distinct tasks/skills, where reported. */
  tasks: z.number().int().positive().nullable(),
  license: z.string().min(1).nullable(),
  url: httpsUrlSchema,
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
});

export type Dataset = z.infer<typeof datasetSchema>;
