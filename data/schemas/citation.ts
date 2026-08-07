import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * Citation registry entry. Every non-obvious technical claim in the atlas
 * cites one of these via <Cite id="..."/> in MDX.
 */
export const citationSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(1900).max(2100),
  venue: z.string().min(1).optional(),
  /** Bare arXiv id, e.g. "2304.13705". When present, url must be its abs page. */
  arxiv: z
    .string()
    .regex(/^\d{4}\.\d{4,5}$/, 'arXiv ids look like 2304.13705')
    .optional(),
  url: httpsUrlSchema,
  type: z.enum(['paper', 'blog', 'docs', 'press']),
});

export type Citation = z.infer<typeof citationSchema>;
