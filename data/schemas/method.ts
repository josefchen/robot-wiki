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
  /** Source-scoped training/runtime distinction, not a second action category. */
  actionRepresentationNote: z.string().min(1).optional(),
  /** Planned chunk length vs. steps actually executed before re-inference. */
  actionHorizon: z.object({
    planned: z.number().int().positive().nullable(),
    executed: z.union([
      z.number().int().positive(),
      z.object({
        choices: z.array(z.number().int().positive()).min(2)
          .refine(values => new Set(values).size === values.length, 'Execution choices must be distinct'),
      }).strict(),
    ]).nullable(),
    /** Source setting or qualifier; discrete choices are typed above, not a range. */
    note: z.string().min(1).optional(),
  }).refine(horizon => horizon.planned === null || horizon.executed === null ||
    (typeof horizon.executed === 'number'
      ? horizon.executed <= horizon.planned
      : horizon.executed.choices.every(value => value <= horizon.planned!)),
  'Executed steps cannot exceed the predicted horizon'),
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
  /** Download availability, not license openness; null requires source scope. */
  openWeights: z.boolean().nullable(),
  weightsNote: z.string().min(1).optional(),
  /** Citation registry IDs backing this row. */
  sources: z.array(slugSchema).min(1),
}).refine((method) => method.openWeights !== null || Boolean(method.weightsNote), {
  message: 'Unknown weight availability requires a source-scoped note',
  path: ['weightsNote'],
});

export type ActionRepresentation = z.infer<typeof actionRepresentationSchema>;

export type Method = z.infer<typeof methodSchema>;
