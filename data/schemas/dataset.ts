import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * One row of the dataset comparison data (data/datasets.ts). Unknown size
 * figures are null, never invented; figures a source reports only as an
 * estimate or an open-ended count carry the qualifier in a note field that
 * renders next to the number.
 */
export const datasetSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  /** Search-only alternate names; see the `aka` note on methodSchema. */
  aka: z.array(z.string().min(1)),
  year: z.number().int().min(1980).max(2100).nullable(),
  /** Reported trajectory/episode count; null when unpublished. */
  episodes: z.number().int().positive().nullable(),
  /** Qualifier for the count, e.g. "1M+; pooled from 60 datasets". */
  episodesNote: z.string().min(1).optional(),
  /** Reported interaction hours; null when unpublished. */
  hours: z.number().positive().nullable(),
  /** Qualifier, e.g. "not published; est. ~10,000 h". */
  hoursNote: z.string().min(1).optional(),
  /** Number of distinct tasks/skills, where reported. */
  tasks: z.number().int().positive().nullable(),
  /** Qualifier, e.g. "527 skills" next to a task count. */
  tasksNote: z.string().min(1).optional(),
  /** Distinct scenes/environments, where reported. */
  scenes: z.number().int().positive().nullable(),
  /** Number of distinct robot platforms the data was collected on. */
  embodimentCount: z.number().int().positive(),
  /** Platform names, or a short description when the count is large. */
  embodiments: z.array(z.string().min(1)).min(1),
  license: z.string().min(1).nullable(),
  url: httpsUrlSchema,
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
});

export type Dataset = z.infer<typeof datasetSchema>;
