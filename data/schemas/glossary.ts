import { z } from 'zod';
import { slugSchema } from './shared.ts';

/**
 * Glossary entry. Every jargon term wrapped in <Term id="..."/> in MDX
 * resolves to one of these, and the /glossary page renders the same records,
 * so the inline definition and the glossary entry can never drift apart
 *
 * `citations` requires at least one citation-registry id: an uncited
 * definition is exactly the confident-sounding filler this wiki exists to
 * avoid, so it fails validation here rather than at review time.
 */
export const glossaryTermSchema = z.object({
  id: slugSchema,
  /** Display name, lowercase except proper nouns ("action chunking"). */
  term: z.string().min(1),
  /** One source of truth for the meaning, written from the cited source. */
  definition: z.string().min(1),
  /** Citation registry ids backing the definition. At least one, always. */
  citations: z.array(slugSchema).min(1),
});

export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
