/**
 * Zod schema for the competing-theses rows (lib/competing-theses.ts).
 *
 * Kept apart from the rows so the thesis explorer, a Client Component, can
 * import the data without bundling zod into the browser. The schema runs
 * on the server at build time (lib/registry-validation.ts) and in the unit
 * suite.
 */
import { z } from 'zod';

/** One piece of evidence, with the registry ids that back it. */
export const evidenceSchema = z.object({
  text: z.string().min(1),
  citationIds: z.array(z.string().min(1)).min(1),
});

export const thesisSchema = z.object({
  /** Stable row id, used for test selectors. */
  id: z.string().min(1),
  /** Short thesis name, e.g. "End-to-end VLA scaling". */
  name: z.string().min(1),
  /** The core claim in one sentence. */
  claim: z.string().min(1),
  /** Named proponents (people or organizations), at least one. */
  proponents: z.array(z.string().min(1)).min(1),
  /** The strongest published evidence for the thesis. */
  evidenceFor: z.array(evidenceSchema).min(1),
  /** The strongest published evidence or argument against it. */
  evidenceAgainst: z.array(evidenceSchema).min(1),
  /** The falsification criterion: the observation that would kill it. */
  falsification: z.string().min(1),
  /** Compressed falsification signal for the table row. */
  falsificationSignal: z.string().min(1),
});

export type Thesis = z.infer<typeof thesisSchema>;
export type ThesisEvidence = z.infer<typeof evidenceSchema>;

/** The explorer's completeness gate: exactly six complete theses. */
export const thesesSchema = z.array(thesisSchema).length(6);
