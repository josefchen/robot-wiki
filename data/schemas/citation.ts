import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * Citation registry entry. Every non-obvious technical claim in the wiki
 * cites one of these via <Cite id="..."/> in MDX.
 *
 * URL policy: registry urls are https, full stop (httpsUrlSchema). The one
 * sanctioned escape hatch, for a canonical source that is genuinely served
 * over http only, is a DATED web.archive.org capture:
 *
 *   https://web.archive.org/web/<timestamp>/http://<original>
 *
 * The capture itself is https and content-addressed to a specific date, so
 * it satisfies the schema while preserving the real author, title, venue and
 * original date in the entry (precedent: Sutton, The Bitter Lesson; settled
 * 2026-08-12, see library/content-quality.md). Undated or wildcard archive
 * URLs are rejected by datedArchiveRefinement below, and there is no blanket
 * http allowlist.
 */
const datedArchiveRefinement = z
  .string()
  .refine(
    (u) => !u.startsWith('https://web.archive.org/web/') || /^https:\/\/web\.archive\.org\/web\/\d{4,14}(id_)?\//.test(u),
    {
      message:
        'web.archive.org captures must be dated: https://web.archive.org/web/<timestamp>/<original-url>',
    },
  );

export const citationSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(1900).max(2100),
  venue: z.string().min(1).optional(),
  /** Bare arXiv id, e.g. "2304.13705". When present, url must be its abs
   *  page (unversioned, or versioned …vN for quotes that exist only in a
   *  superseded version; see audit/README.md's quote policy). */
  arxiv: z
    .string()
    .regex(/^\d{4}\.\d{4,5}$/, 'arXiv ids look like 2304.13705')
    .optional(),
  url: z.intersection(httpsUrlSchema, datedArchiveRefinement),
  type: z.enum(['paper', 'blog', 'docs', 'press']),
});

export type Citation = z.infer<typeof citationSchema>;
