import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/**
 * Records of the funding rounds data (data/rounds.ts): rounds, listings,
 * acquisitions and shutdowns, the earlier 2026 UK and Europe rounds, notes
 * on four European investors and third-party counts.
 *
 * Amounts stay as announced, in the announced currency; lib/rounds.ts
 * converts. An amount no source states is "not disclosed"; a field that
 * does not apply (a shutdown has no amount) is "n/a".
 */

export const NOT_DISCLOSED = 'not disclosed';
export const NOT_APPLICABLE = 'n/a';

/** ISO 4217 codes the rows use. Every one except EUR has an ECB rate in data/fx-rates.ts. */
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'KRW', 'INR', 'HKD']);

/**
 * The ten sector ids of the rounds data. lib/rounds.ts maps each one to a
 * market-map segment; five of them share `vertical-applications`.
 */
export const roundSectorSchema = z.enum([
  'foundation-models',
  'humanoids',
  'factories-warehouses',
  'simulation-data',
  'parts-chips',
  'drones-defense',
  'construction-field',
  'surgical-medical',
  'lab-automation',
  'trucks-aircraft',
]);

/**
 * `closed`: the round or listing completed. `unconfirmed`: a close claimed by
 * one unconfirmed source or seen only in a Form D. `talks`: a raise being
 * sought or negotiated. `announced`: a round or listing agreed but not completed.
 */
export const roundStatusSchema = z.enum(['closed', 'unconfirmed', 'talks', 'announced']);

/** `primary`: the company, investor or filing. `reported`: press or a newsletter. */
export const sourceTypeSchema = z.enum(['primary', 'reported']);

export const datePrecisionSchema = z.enum(['day', 'month', 'year']);

const dayDate = /^\d{4}-\d{2}-\d{2}$/;
const monthDate = /^\d{4}-\d{2}$/;
const yearDate = /^\d{4}$/;

const DATE_FORMAT = { day: dayDate, month: monthDate, year: yearDate } as const;

const amountSchema = z.union([z.number().positive(), z.literal(NOT_DISCLOSED)]);
const optionalAmountSchema = z.union([
  z.number().positive(),
  z.literal(NOT_DISCLOSED),
  z.literal(NOT_APPLICABLE),
]);
const textOrAbsent = z.string().min(1);

const fundingEventObjectSchema = z
  .object({
    key: slugSchema,
    company: z.string().min(1),
    status: roundStatusSchema,
    sourceType: sourceTypeSchema,
    date: z.string().min(4),
    datePrecision: datePrecisionSchema,
    /** Round as named by the source (Series A, Seed, IPO), or "not disclosed". */
    round: textOrAbsent,
    amount: amountSchema,
    currency: currencySchema,
    /** Valuation as the source words it, or "not disclosed". */
    valuation: textOrAbsent,
    /** Lead or co-lead investors the source names; empty when none is named. */
    leadInvestors: z.array(z.string().min(1)),
    city: textOrAbsent,
    /** ISO 3166-1 alpha-2, or "not disclosed". */
    country: textOrAbsent,
    sector: roundSectorSchema,
    whatTheyBuild: textOrAbsent,
    sourceUrl: httpsUrlSchema,
    sourceTitle: z.string().min(1),
    /** The source gives a floor ("over", "more than"); the true figure is higher. */
    amountIsFloor: z.literal(true).optional(),
    /** The source gives the figure as approximate ("about", "approximately"). */
    amountIsApproximate: z.literal(true).optional(),
    /** The figure includes debt as well as equity. */
    includesDebt: z.literal(true).optional(),
    /** Robotics by some definitions only; the reason is shown on the page. */
    borderline: z.string().min(1).optional(),
    /** Sources disagree on the lead or only press names one; not counted as a lead. */
    leadUnconfirmed: z.literal(true).optional(),
    /**
     * One short clause, on floor, debt and lead-unconfirmed rows or where sources conflict.
     * A borderline row carries its reason in `borderline` and needs no note.
     */
    note: z.string().min(1).optional(),
  })
  .strict();

type FundingEventShape = z.infer<typeof fundingEventObjectSchema>;

function refineFundingEvent(event: FundingEventShape, ctx: z.RefinementCtx): void {
  if (!DATE_FORMAT[event.datePrecision].test(event.date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date'],
      message: `${event.key}: date ${event.date} does not match precision ${event.datePrecision}`,
    });
  }
  const flagged = event.amountIsFloor || event.includesDebt || event.leadUnconfirmed;
  if (flagged && !event.note) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['note'],
      message: `${event.key}: a flagged row needs a note`,
    });
  }
  if (event.amountIsFloor && event.amountIsApproximate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amountIsApproximate'],
      message: `${event.key}: an amount is a floor or approximate, not both`,
    });
  }
  if ((event.amountIsFloor || event.amountIsApproximate) && event.amount === NOT_DISCLOSED) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amountIsFloor'],
      message: `${event.key}: a floor or approximate figure needs an amount`,
    });
  }
}

/** A round or a listing: one company raising money on one date. */
export const fundingEventSchema = fundingEventObjectSchema.superRefine(refineFundingEvent);

/** An acquisition, a blocked deal, or a shutdown. */
export const corporateEventSchema = z
  .object({
    key: slugSchema,
    kind: z.enum(['acquisition', 'blocked', 'shutdown']),
    company: z.string().min(1),
    /** Buyer; "n/a" for a shutdown. */
    acquirer: textOrAbsent,
    sourceType: sourceTypeSchema,
    date: z.string().regex(dayDate),
    datePrecision: z.literal('day'),
    amount: optionalAmountSchema,
    currency: currencySchema.nullable(),
    city: textOrAbsent,
    country: textOrAbsent,
    sector: roundSectorSchema,
    /** A short phrase about the company, not the deal. */
    whatTheyBuild: textOrAbsent,
    sourceUrl: httpsUrlSchema,
    sourceTitle: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((event, ctx) => {
    if (typeof event.amount === 'number' && event.currency === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currency'],
        message: `${event.key}: an amount needs a currency`,
      });
    }
    if (event.kind === 'shutdown' && event.amount !== NOT_APPLICABLE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: `${event.key}: a shutdown has no amount`,
      });
    }
  });

/** One European investor and what it did in robotics in 2026. */
export const investorNoteSchema = z
  .object({
    key: slugSchema,
    investor: z.string().min(1),
    summary: z.string().min(1),
    date: z.string().min(1),
    datePrecision: z.union([datePrecisionSchema, z.literal(NOT_DISCLOSED)]),
    sourceType: sourceTypeSchema,
    sourceUrl: httpsUrlSchema,
    sourceTitle: z.string().min(1),
  })
  .strict();

/** One period of a third-party count. */
const contextFigureSchema = z
  .object({
    period: z.string().min(1),
    deals: z.number().int().positive(),
    dealsIsFloor: z.literal(true).optional(),
    amount: z.number().positive(),
    currency: currencySchema,
    amountIsFloor: z.literal(true).optional(),
  })
  .strict();

/** A count published by a tracker, for what the page's list leaves out. */
export const marketContextSchema = z
  .object({
    key: slugSchema,
    publisher: z.string().min(1),
    scope: z.string().min(1),
    figures: z.array(contextFigureSchema).min(1),
    date: z.string().regex(dayDate),
    sourceType: sourceTypeSchema,
    sourceUrl: httpsUrlSchema,
    sourceTitle: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict();

export type Currency = z.infer<typeof currencySchema>;
export type RoundSector = z.infer<typeof roundSectorSchema>;
export type RoundStatus = z.infer<typeof roundStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type DatePrecision = z.infer<typeof datePrecisionSchema>;
export type FundingEvent = z.infer<typeof fundingEventSchema>;
export type CorporateEvent = z.infer<typeof corporateEventSchema>;
export type InvestorNote = z.infer<typeof investorNoteSchema>;
export type MarketContext = z.infer<typeof marketContextSchema>;
