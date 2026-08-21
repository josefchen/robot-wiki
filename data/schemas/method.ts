import { z } from 'zod';
import { slugSchema } from './shared.ts';

export const actionRepresentationSchema = z.enum([
  'continuous',
  'discrete',
  'diffusion',
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
  /**
   * Search-only alternate names, same shape and same rules as Company.aka:
   * an acronym expansion, a vendor checkpoint identifier, a paper nickname or
   * a former name that a source actually uses. Never rendered; it exists so a
   * reader who knows the row by a name other than its display title reaches
   * it. Greek-to-ASCII folding already handles the mechanical character-level
   * case corpus-wide, so a bare transliteration does not belong here.
   */
  aka: z.array(z.string().min(1)),
  year: z.number().int().min(1980).max(2100).nullable(),
  /** Null when the vendor has not disclosed the representation. */
  actionRepresentation: actionRepresentationSchema.nullable(),
  /** Planned chunk length vs. steps actually executed before re-inference. */
  actionHorizon: z.object({
    planned: z.number().int().positive().nullable(),
    executed: z.number().int().positive().nullable(),
    /** Range or qualifier a single integer cannot carry, e.g. "15-25". */
    note: z.string().min(1).optional(),
  }),
  controlFrequencyHz: z.number().positive().nullable(),
  /**
   * Rate qualifier a single number cannot carry: dual-rate stacks
   * ("S1 200 Hz, S0 1 kHz"), ranges ("25-50 Hz class"), or deployment
   * caveats ("embodiment-dependent").
   */
  controlFrequencyNote: z.string().min(1).optional(),
  backbone: z.string().min(1).nullable(),
  conditioning: z.array(z.string().min(1)),
  crossEmbodiment: triStateSchema.nullable(),
  hierarchy: hierarchySchema.nullable(),
  openWeights: z.boolean(),
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
});

export type ActionRepresentation = z.infer<typeof actionRepresentationSchema>;

export type Method = z.infer<typeof methodSchema>;
