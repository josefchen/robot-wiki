import { z } from 'zod';
import {
  confidenceSchema,
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
 * null and render as "n/a".
 */
export const fundingRoundSchema = z.object({
  type: z.string().min(1),
  amountUsd: z.number().positive().nullable(),
  date: isoDateSchema.nullable(),
  valuationUsd: z.number().positive().nullable(),
  leadInvestors: z.array(z.string().min(1)),
});

/** Market-map company entry (data/companies.ts, 112 rows from research/04). */
export const companySchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  aka: z.array(z.string().min(1)),
  hq: z.object({
    city: z.string().min(1).nullable(),
    country: z.string().min(1),
  }),
  founded: z.number().int().min(1900).max(2100).nullable(),
  segment: companySegmentSchema,
  subSegment: z.string().min(1).nullable(),
  description: z.string().min(1),
  approach: z.array(z.string().min(1)),
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
