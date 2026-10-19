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
 * A visible caveat on a round figure the sources do not state exactly: two
 * sources give different figures for the same round, a source gives only a
 * floor, or one figure covers more than the round. Every URL must be one of
 * the company's own sources, so the caveat points at documents the card lists.
 */
export const roundCaveatSchema = z.object({
  text: z.string().min(1),
  sourceUrls: z.array(httpsUrlSchema).min(1),
});

/**
 * Never invent a number: an unknown funding, valuation, or date field is
 * null, and the company's `absent` annotation records whether it is
 * undisclosed or inapplicable. Round type is also nullable: many rows are
 * public companies or internal divisions with no disclosed latest round.
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
  caveat: roundCaveatSchema.optional(),
});

/**
 * Every field the detail card renders that a record may leave empty. An
 * empty list or a null is never read as a state on its own: each one needs
 * an entry in the record's `absent` annotation.
 */
export const ABSENT_FIELDS = [
  'hq.city',
  'founded',
  'website',
  'aka',
  'deployments',
  'openSource',
  'totalRaisedUsd',
  'round.type',
  'round.amountUsd',
  'round.date',
  'round.valuationUsd',
  'round.leadInvestors',
] as const;

export const absentFieldSchema = z.enum(ABSENT_FIELDS);

/**
 * `not-disclosed`: the value exists (every company was founded somewhere,
 * every financed startup has a total) but no fetched source states it; the
 * card prints unknownFigure(). `not-applicable`: the field does not apply
 * to this company (a corporate division raises no rounds, a company with
 * one name has no other); the card prints inapplicableFigure(), and `basis`
 * says why.
 */
export const absenceSchema = z
  .object({
    state: z.enum(['not-disclosed', 'not-applicable']),
    basis: z.string().min(1).optional(),
  })
  .strict();

export type AbsentField = z.infer<typeof absentFieldSchema>;
export type Absence = z.infer<typeof absenceSchema>;

type AbsenceProbe = {
  hq: { city: string | null };
  founded: number | null;
  website: string | null;
  aka: readonly string[];
  deployments: readonly string[];
  openSource: readonly string[];
  totalRaisedUsd: number | null;
  latestRound: {
    type: string | null;
    amountUsd: number | null;
    date: string | null;
    valuationUsd: number | null;
    leadInvestors: readonly string[];
  } | null;
};

/** The rendered fields this record leaves empty, in ABSENT_FIELDS order. */
export function absentFieldsOf(company: AbsenceProbe): AbsentField[] {
  const round = company.latestRound;
  const empty: Record<AbsentField, boolean> = {
    'hq.city': company.hq.city === null,
    founded: company.founded === null,
    website: company.website === null,
    aka: company.aka.length === 0,
    deployments: company.deployments.length === 0,
    openSource: company.openSource.length === 0,
    totalRaisedUsd: company.totalRaisedUsd === null,
    'round.type': round === null || round.type === null,
    'round.amountUsd': round === null || round.amountUsd === null,
    'round.date': round === null || round.date === null,
    'round.valuationUsd': round === null || round.valuationUsd === null,
    'round.leadInvestors': round === null || round.leadInvestors.length === 0,
  };
  return ABSENT_FIELDS.filter((field) => empty[field]);
}

/** Market-map company entry (data/companies.ts, 111 rows from research/04). */
const companyObjectSchema = z.object({
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
  approach: z.array(z.string().min(1)).min(1),
  /**
   * Company-wide total stated by a fetched source. Never use an aggregator
   * figure, add individual rounds yourself, or promote a floor or ceiling to
   * an exact value. When only a bound is available, sources conflict without a
   * primary resolution, or a single fetched page contradicts itself, use null
   * and record the bound or disagreement in deployments prose and
   * audit/market-map.md. Null is a publishable state, not missing work.
   */
  totalRaisedUsd: z.number().positive().nullable(),
  latestRound: fundingRoundSchema.nullable(),
  status: companyStatusSchema,
  deployments: z.array(z.string().min(1)),
  openSource: z.array(z.string().min(1)),
  sources: z.array(sourceSchema).min(1),
  confidence: confidenceSchema,
  /**
   * Registry annotation for each rendered field the record leaves empty
   * (absentFieldsOf). Exactly the empty fields carry an entry; a populated
   * field never does.
   */
  absent: z.record(absentFieldSchema, absenceSchema),
});

export const companySchema = companyObjectSchema.superRefine((company, ctx) => {
  const empty = new Set<string>(absentFieldsOf(company));
  for (const field of ABSENT_FIELDS) {
    const absence = company.absent[field];
    if (empty.has(field) && !absence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['absent', field],
        message: `${company.id}: ${field} is empty but has no recorded disposition`,
      });
    }
    if (!empty.has(field) && absence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['absent', field],
        message: `${company.id}: ${field} is populated but carries a disposition`,
      });
    }
    if (absence?.state === 'not-applicable' && !absence.basis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['absent', field, 'basis'],
        message: `${company.id}: ${field} is marked not-applicable without a basis`,
      });
    }
  }
  const cited = new Set(company.sources.map((source) => source.url));
  for (const url of company.latestRound?.caveat?.sourceUrls ?? []) {
    if (!cited.has(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latestRound', 'caveat', 'sourceUrls'],
        message: `${company.id}: caveat source ${url} is not one of its sources`,
      });
    }
  }
});

export type FundingRound = z.infer<typeof fundingRoundSchema>;
export type Company = z.infer<typeof companySchema>;
