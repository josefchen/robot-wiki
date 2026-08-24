import { z } from 'zod';
import {
  confidenceSchema,
  httpsUrlSchema,
  isoDateSchema,
  slugSchema,
  sourceSchema,
} from './shared.ts';

export const companySegmentSchema = z.enum([
  'foundation-models',
  'humanoids',
  'industrial-logistics',
  'vertical-applications',
  'simulation-tooling',
  'components-hardware',
]);

export const companyStatusSchema = z.enum([
  'private',
  'public',
  'acquired',
  'dead',
]);

/**
 * Never invent a number: unknown funding, valuation, and date fields are
 * null and render as "not disclosed". Round type is also nullable: many
 * rows are public companies or internal divisions with no disclosed latest
 * round.
 */
export const fundingRoundSchema = z.object({
  /**
   * Name the event class that actually occurred. Do not label an acquisition,
   * controlling-stake purchase, or other transaction as a financing round.
   * Use null when no fetched source settles the event class.
   */
  type: z.string().min(1).nullable(),
  /**
   * Exact event amount stated by a fetched source. Apply the same evidence
   * rules as totalRaisedUsd: never use an aggregator figure or promote a floor
   * or ceiling to an exact value. When sources conflict, or one page
   * contradicts itself, null is the correct publishable value.
   */
  amountUsd: z.number().positive().nullable(),
  date: isoDateSchema.nullable(),
  valuationUsd: z.number().positive().nullable(),
  leadInvestors: z.array(z.string().min(1)),
  /**
   * URL of the company source that supports this round. sources[0] is only
   * the earliest append-ordered provenance entry, so it is not a safe proxy
   * after a later audit appends a corrected or more specific source.
   */
  sourceUrl: httpsUrlSchema.optional(),
});

/** Market-map company entry (data/companies.ts, 111 rows from research/04). */
export const companySchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  aka: z.array(z.string().min(1)),
  /**
   * Official homepage when a first-party URL is known. Null when the
   * homepage is not in the research snapshot; official pages may still
   * appear inside sources[]. Never invent a URL.
   */
  website: httpsUrlSchema.nullable(),
  /**
   * Image-registry id of a plotted logo, or null only when no public
   * mark could be fetched. Official marks without a reuse grant are
   * allowed (licence unlicensed/unknown on the registry entry). The
   * validator treats a non-null value as a published usage of that
   * registry entry (the market-map page renders it).
   */
  logo: slugSchema.nullable(),
  hq: z.object({
    city: z.string().min(1).nullable(),
    country: z.string().min(1),
  }),
  founded: z.number().int().min(1900).max(2100).nullable(),
  segment: companySegmentSchema,
  subSegment: z.string().min(1).nullable(),
  description: z.string().min(1),
  approach: z.array(z.string().min(1)),
  /**
   * Company-wide total stated by a fetched source. Never use an aggregator
   * figure, add individual rounds yourself, or promote a floor or ceiling to
   * an exact value. When only a bound is available, or sources conflict and no
   * primary resolves them, use null and record the range or disagreement in
   * deployments prose and audit/market-map.md. Null is a publishable state,
   * not missing work.
   */
  totalRaisedUsd: z.number().positive().nullable(),
  latestRound: fundingRoundSchema.nullable(),
  status: companyStatusSchema,
  deployments: z.array(z.string().min(1)),
  openSource: z.array(z.string().min(1)),
  sources: z.array(sourceSchema).min(1),
  confidence: confidenceSchema,
});

export type FundingRound = z.infer<typeof fundingRoundSchema>;
export type Company = z.infer<typeof companySchema>;
