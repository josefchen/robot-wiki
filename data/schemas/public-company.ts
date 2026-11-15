import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * Rows of the public robotics companies module (data/public-companies.ts):
 * listed companies, companies removed from the list, companies left out of
 * it, the 2026 debuts, the IPO watch and the AI-lab filings.
 *
 * Amounts stay in the currency they were quoted or filed in. Nothing here
 * stores a converted figure; lib/public-companies.ts converts with a rates
 * table passed in by the caller.
 */

/** The eight segments of the public list. lib/public-companies.ts maps each to a market-map segment. */
export const PUBLIC_SEGMENTS = [
  'humanoids',
  'arms',
  'logistics',
  'surgical',
  'service',
  'vehicles',
  'drones',
  'components',
] as const;
export const publicSegmentSchema = z.enum(PUBLIC_SEGMENTS);
export type PublicSegment = z.infer<typeof publicSegmentSchema>;

/** How much of the company robots are. Only `pure play` and `major part` are sized on the map. */
export const EXPOSURE_CLASSES = ['pure play', 'major part', 'minor part'] as const;
export const exposureClassSchema = z.enum(EXPOSURE_CLASSES);
export type ExposureClass = z.infer<typeof exposureClassSchema>;

/**
 * What the exposure class rests on:
 * - `filed share`: a filing states the robotics share of revenue.
 * - `computed from filed figures`: a filing gives the robotics line and the
 *   total for the same period, and the share is their ratio.
 * - `filing without a share`: a filing names the robot business but gives
 *   no share and no matching total.
 * - `business description`: the quote service's company profile (reported).
 * - `judgement`: no exposure source; the note gives the reason.
 */
export const EXPOSURE_BASES = [
  'filed share',
  'computed from filed figures',
  'filing without a share',
  'business description',
  'judgement',
] as const;
export const exposureBasisSchema = z.enum(EXPOSURE_BASES);
export type ExposureBasis = z.infer<typeof exposureBasisSchema>;

export const LISTING_CURRENCIES = [
  'USD',
  'EUR',
  'JPY',
  'KRW',
  'CNY',
  'HKD',
  'TWD',
  'GBP',
  'CHF',
  'SEK',
  'NOK',
  'INR',
  'ILS',
  'CAD',
  'AUD',
  'NZD',
] as const;
export const listingCurrencySchema = z.enum(LISTING_CURRENCIES);
export type ListingCurrency = z.infer<typeof listingCurrencySchema>;

export const sourceTypeSchema = z.enum(['primary', 'reported']);
export type PublicSourceType = z.infer<typeof sourceTypeSchema>;

/** One source, with the passage that supports the row copied from it. */
export const publicSourceSchema = z.object({
  url: httpsUrlSchema,
  title: z.string().min(1),
  type: sourceTypeSchema,
  quote: z.string().min(1),
  /** True when the page was opened again for this module and says what the row says. */
  verified: z.boolean(),
});
export type PublicSource = z.infer<typeof publicSourceSchema>;

/** ISO 3166-1 alpha-2 country code. */
const countrySchema = z.string().regex(/^[A-Z]{2}$/);

export const roboticsShareSchema = z.object({
  /** The line as the filing names it. */
  line: z.string().min(1),
  period: z.string().min(1),
  currency: listingCurrencySchema,
  lineRevenue: z.number().positive().nullable(),
  totalRevenue: z.number().positive().nullable(),
  /** Percent of revenue, only when the filing states it. */
  filedPercent: z.number().positive().max(100).nullable(),
  /** The filing gives the percent as an approximation ("about 7 percent"). */
  approximate: z.literal(true).optional(),
  /** Where the total comes from, when it is not in the exposure source. */
  totalSourceUrl: httpsUrlSchema.optional(),
});
export type RoboticsShare = z.infer<typeof roboticsShareSchema>;

export const publicCompanySchema = z
  .object({
    id: slugSchema,
    name: z.string().min(1),
    /** The company name the market-cap page showed, so a reused ticker cannot pass unnoticed. */
    quoteName: z.string().min(1),
    exchange: z.string().min(1),
    ticker: z.string().min(1),
    country: countrySchema,
    segment: publicSegmentSchema,
    exposure: exposureClassSchema,
    exposureBasis: exposureBasisSchema,
    roboticsShare: roboticsShareSchema.nullable(),
    exposureSource: publicSourceSchema.nullable(),
    /** Market value in `currency`, whole units, at the close of PUBLIC_COMPANIES_AS_OF. */
    marketCap: z.number().positive(),
    currency: listingCurrencySchema,
    /** Date of the rate a conversion must use, when it is older than the shared rates date (TWD). */
    fxRateDate: isoDateSchema.optional(),
    marketCapSource: publicSourceSchema,
    note: z.string().min(1).optional(),
  })
  .superRefine((row, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${row.id}: ${message}` });
    const share = row.roboticsShare;
    const source = row.exposureSource;
    if (row.marketCapSource.type !== 'reported') issue('market caps come from a quote service and are reported');
    if ((row.currency === 'TWD') !== (row.fxRateDate !== undefined)) issue('fxRateDate is set on TWD rows and only there');
    switch (row.exposureBasis) {
      case 'filed share':
        if (!share || share.filedPercent === null) issue('a filed share needs filedPercent');
        if (source?.type !== 'primary') issue('a filed share needs a primary source');
        break;
      case 'computed from filed figures':
        if (!share || share.lineRevenue === null || share.totalRevenue === null) issue('a computed share needs both figures');
        if (share && share.filedPercent !== null) issue('a computed share has no filed percent');
        if (source?.type !== 'primary') issue('filed figures need a primary source');
        break;
      case 'filing without a share':
        if (share && (share.filedPercent !== null || share.totalRevenue !== null)) issue('no share can be given');
        if (source?.type !== 'primary') issue('a filing basis needs a primary source');
        break;
      case 'business description':
        if (share) issue('a business description gives no share');
        if (source?.type !== 'reported') issue('a business description is reported');
        break;
      case 'judgement':
        if (share || source) issue('a judgement has no exposure source');
        if (!row.note) issue('a judgement needs a note giving the reason');
        break;
    }
  });
export type PublicCompany = z.infer<typeof publicCompanySchema>;

/** A company that was on earlier lists and is no longer a listed robotics company. Never in a total. */
export const removedCompanySchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  ticker: z.string().min(1),
  date: isoDateSchema,
  reason: z.string().min(1),
  sources: z.array(publicSourceSchema).min(1),
});
export type RemovedCompany = z.infer<typeof removedCompanySchema>;

/** A listed company kept off the list because robots are neither its business nor a reported part of it. */
export const leftOutCompanySchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  exchange: z.string().min(1),
  ticker: z.string().min(1),
  reason: z.string().min(1),
  source: publicSourceSchema,
});
export type LeftOutCompany = z.infer<typeof leftOutCompanySchema>;

/** How much a debut raised, in the debut's currency. */
export const debutProceedsSchema = z.discriminatedUnion('kind', [
  /** HKEX's New Listing Report gives two lines per issue, (a) and (b), with no legend. */
  z.object({
    kind: z.literal('hkex lines'),
    fundsRaisedA: z.number().positive(),
    fundsRaisedB: z.number().positive(),
  }),
  /** Gross proceeds are the offer price times the shares issued. */
  z.object({ kind: z.literal('price times shares'), offerShares: z.number().int().positive() }),
  /** A total the source states. */
  z.object({
    kind: z.literal('stated'),
    gross: z.number().positive(),
    net: z.number().positive().optional(),
    offerShares: z.number().int().positive().optional(),
    qualifier: z.enum(['final', 'expected', 'reported', 'total capital']),
    /** Where the total comes from, when it is not in the debut's source. */
    sourceUrl: httpsUrlSchema.optional(),
  }),
]);
export type DebutProceeds = z.infer<typeof debutProceedsSchema>;

export const debutSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  exchange: z.string().min(1),
  ticker: z.string().min(1),
  /** First trading day; null when no source gives it. */
  listingDate: isoDateSchema.nullable(),
  currency: listingCurrencySchema,
  /** Price per share; null for mergers, which have none. */
  offerPrice: z.number().positive().nullable(),
  /** HKEX's (b) line price, where it differs from the (a) line. */
  offerPriceB: z.number().positive().optional(),
  proceeds: debutProceedsSchema.nullable(),
  /** Close of PUBLIC_COMPANIES_AS_OF, with the line the page prints for it when one was copied. */
  close: z
    .object({
      price: z.number().positive(),
      url: httpsUrlSchema,
      quote: z.string().min(1).optional(),
      verified: z.boolean(),
    })
    .nullable(),
  /** The listed row this debut belongs to; null when the module holds no market value for the company. */
  listedCompanyId: slugSchema.nullable(),
  source: publicSourceSchema,
  note: z.string().min(1).optional(),
});
export type Debut = z.infer<typeof debutSchema>;

export const IPO_STATUSES = [
  'filed',
  'priced',
  'accepted',
  'reported only',
  'paused',
  'postponed',
  'not an IPO',
] as const;
export const ipoStatusSchema = z.enum(IPO_STATUSES);
export type IpoStatus = z.infer<typeof ipoStatusSchema>;

export const ipoWatchSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  exchange: z.string().min(1),
  ticker: z.string().min(1).optional(),
  status: ipoStatusSchema,
  filingType: z.string().min(1),
  /** YYYY-MM-DD, or YYYY-MM when the source gives only the month; null when no source gives one. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/)
    .nullable(),
  dateKind: z.enum(['filed', 'accepted', 'cleared', 'prospectus', 'listing', 'reported', 'announced']).nullable(),
  currency: listingCurrencySchema.optional(),
  offerPrice: z.object({ value: z.number().positive(), kind: z.enum(['final', 'maximum']) }).optional(),
  amount: z
    .object({ value: z.number().positive(), kind: z.enum(['raised', 'sought', 'offering', 'valuation']) })
    .optional(),
  offerShares: z.number().int().positive().optional(),
  source: publicSourceSchema,
  note: z.string().min(1).optional(),
});
export type IpoWatchRow = z.infer<typeof ipoWatchSchema>;

/** AI labs adjacent to robotics. Not robotics companies, and never in a robotics count. */
export const aiLabFilingSchema = z.object({
  id: slugSchema,
  name: z.string().min(1),
  status: z.enum(['range set', 'public S-1 filed', 'confidential draft only']),
  filingType: z.string().min(1),
  date: isoDateSchema,
  exchange: z.string().min(1).optional(),
  ticker: z.string().min(1).optional(),
  priceRange: z.object({ low: z.number().positive(), high: z.number().positive(), currency: z.literal('USD') }).optional(),
  shares: z
    .object({
      total: z.number().int().positive(),
      company: z.number().int().positive(),
      sellingHolders: z.number().int().nonnegative(),
    })
    .optional(),
  source: publicSourceSchema,
  note: z.string().min(1).optional(),
});
export type AiLabFiling = z.infer<typeof aiLabFilingSchema>;
