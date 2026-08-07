import { z } from 'zod';

/** kebab-case slug, e.g. "action-chunking". */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugs must be kebab-case');

/** ISO calendar date, e.g. "2026-08-07". */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dates must be ISO YYYY-MM-DD');

/** External links are https-only. */
export const httpsUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith('https://'), { message: 'urls must be https' });

/** Provenance attached to structured-data entities. */
export const sourceSchema = z.object({
  url: httpsUrlSchema,
  title: z.string().min(1),
  asOf: isoDateSchema,
});

export const confidenceSchema = z.enum(['high', 'medium', 'low']);

export type Source = z.infer<typeof sourceSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
