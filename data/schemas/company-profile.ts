import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * A company profile (/companies/<slug>/): what the company sells, how many,
 * for how much, and what its filings say. Every row carries its own source,
 * as the market map's rows do, so a profile never depends on the article
 * citation registry.
 *
 * Rules every profile follows:
 * - Values stay as filed. A figure filed in 万元 is stored in 万元 with
 *   unit 'CNY10k'; lib/company-profile.ts converts for display. No converted
 *   or summed figure is typed into the data.
 * - 'not disclosed' where the source gives no value, 'n/a' where the field
 *   does not apply (the strings lib/market-map.ts renders).
 * - A figure from a press report or a market-data feed is 'reported'.
 */

export const NOT_DISCLOSED = 'not disclosed';
export const NOT_APPLICABLE = 'n/a';

export const notDisclosedSchema = z.literal(NOT_DISCLOSED);
export const notApplicableSchema = z.literal(NOT_APPLICABLE);
export const absentSchema = z.union([notDisclosedSchema, notApplicableSchema]);

export const sourceTypeSchema = z.enum(['primary', 'reported']);

/**
 * A date as precise as its source states it: a year (2017), a month
 * (2024-05) or a day (2026-08-19). A month-only filing is never padded to a
 * month end.
 */
export const profileDateSchema = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'dates must be YYYY, YYYY-MM or YYYY-MM-DD')
  .refine(
    (value) => {
      const [year, month, day] = value.split('-').map(Number);
      if (month === undefined) return year >= 1900 && year <= 2100;
      if (month < 1 || month > 12) return false;
      if (day === undefined) return true;
      const probe = new Date(Date.UTC(year, month - 1, day));
      return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
    },
    { message: 'not a calendar date' },
  );

/** En dash and em dash. */
const DASH_CODE_POINTS = new Set([0x2013, 0x2014]);

/**
 * One short plain clause in the site's voice, only where a reader would
 * otherwise be misled. No dashes.
 */
export const profileNoteSchema = z
  .string()
  .min(1)
  .max(140)
  .refine((value) => ![...value].some((char) => DASH_CODE_POINTS.has(char.codePointAt(0) ?? 0)), {
    message: 'notes carry no en or em dashes',
  });

/** Provenance every profile row carries. */
export const profileSourceSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceUrl: httpsUrlSchema,
  sourceTitle: z.string().min(1),
  /** Page reference in the filing's own numbering, e.g. "1-1-144". */
  pageRef: z.string().min(1).optional(),
  /**
   * Set when the source would not open at the last check. The row keeps the
   * research record's value; the page must not present it as rechecked.
   */
  flag: z.literal('source-unreachable').optional(),
  note: profileNoteSchema.optional(),
});

/** How a filed amount is denominated: yuan, 万元 (CNY 10,000) or 亿元 (CNY 100 million). */
export const moneyUnitSchema = z.enum(['CNY', 'CNY10k', 'CNY100m']);

export const moneySchema = z.object({
  amount: z.number(),
  unit: moneyUnitSchema,
});

function fact<T extends z.ZodTypeAny>(value: T) {
  return profileSourceSchema.extend({ value });
}

export const companyFactsSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().min(1),
  founded: fact(profileDateSchema),
  founder: fact(z.string().min(1)),
  hq: fact(z.string().min(1)),
});

export const listingSchema = z.object({
  listed: fact(
    z.object({
      date: isoDateSchema,
      exchange: z.string().min(1),
      ticker: z.string().min(1),
    }),
  ),
  /** Yuan per share. */
  offerPrice: fact(z.number().positive()),
  newShares: fact(z.number().int().positive()),
  existingSharesSold: fact(z.number().int().nonnegative()),
  sharesAfterListing: fact(z.number().int().positive()),
  /** The filing's own percentage of new shares in the enlarged capital. */
  statedNewSharePct: fact(z.number().positive()),
  grossProceeds: fact(moneySchema),
  issueCosts: fact(moneySchema),
  netProceeds: fact(moneySchema),
  plannedRaise: fact(moneySchema),
  /** Market value at the offer price as the filing states it. */
  statedMarketValueAtOffer: fact(moneySchema),
  onlineSubscriptionMultiple: fact(z.number().positive()),
  /** Rows in the filing's shareholder table after the listing; the profile keeps only some. */
  holderTableRows: fact(z.number().int().positive()),
  firstDay: fact(
    z.object({
      date: isoDateSchema,
      open: z.number().positive(),
      close: z.number().positive(),
    }),
  ),
  latestClose: fact(
    z.object({
      date: isoDateSchema,
      close: z.number().positive(),
    }),
  ),
});

/** Weighted voting rights: who controls the votes, and how. */
export const controlSchema = z.object({
  holderId: slugSchema,
  classAShares: fact(z.number().int().positive()),
  votesPerClassAShare: fact(z.number().int().positive()),
  directVotesBeforePct: fact(z.number().positive()),
  withPlatformVotesBeforePct: fact(z.number().positive()),
  directVotesAfterPct: fact(z.number().positive()),
  withPlatformVotesAfterPct: fact(z.number().positive()),
  /** The holder ids whose votes the controller adds to his own. */
  platformHolderIds: z.array(slugSchema).min(1),
});

/**
 * One shareholder after the listing. Shares and votes are separate fields
 * and never stand in for each other. A group label appears only where the
 * filing itself names the group.
 */
export const holderSchema = profileSourceSchema
  .extend({
    id: slugSchema,
    /** The holder's row number in the filing's shareholder table. */
    filingRow: z.number().int().positive(),
    /** The name as the filing gives it. */
    name: z.string().min(1),
    nameEn: z.string().min(1),
    group: z.string().min(1).optional(),
    /** Shares held after the listing, in 万股 as filed. */
    sharesTenK: z.number().positive(),
    stakeBeforePct: z.union([z.number().positive(), notApplicableSchema]),
    stakeAfterPct: z.number().positive(),
    /** Votes after the listing, in 万票 as filed. */
    votesTenK: z.union([z.number().positive(), notDisclosedSchema]),
    votesBeforePct: z.union([z.number().positive(), notApplicableSchema, notDisclosedSchema]),
    votesAfterPct: z.union([z.number().positive(), notDisclosedSchema]),
  })
  .superRefine((holder, ctx) => {
    if (typeof holder.votesBeforePct === 'number' && typeof holder.stakeBeforePct !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['votesBeforePct'],
        message: `${holder.id}: votes before the listing without shares before it`,
      });
    }
    if (typeof holder.votesAfterPct === 'number' && typeof holder.votesTenK !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['votesAfterPct'],
        message: `${holder.id}: a vote percentage without a vote count`,
      });
    }
  });

export const grossMarginSchema = z.discriminatedUnion('basis', [
  /** The filing's own main-business margin. */
  z.object({ basis: z.literal('main business'), pct: z.number() }),
  /** Not stated by the filing: computed from total revenue and cost of sales. */
  z.object({ basis: z.literal('computed on total revenue'), costOfSales: z.number().positive() }),
  z.object({ basis: z.literal(NOT_DISCLOSED) }),
]);

/** Same-period figures of the year before, as the filing restates them. */
export const priorPeriodSchema = z.object({
  revenue: z.number().optional(),
  netProfit: z.number().optional(),
  adjustedNetProfit: z.number().optional(),
  costOfSales: z.number().positive().optional(),
});

export const financialPeriodSchema = profileSourceSchema.extend({
  id: slugSchema,
  label: z.string().min(1),
  start: isoDateSchema,
  end: isoDateSchema,
  assurance: z.enum(['audited', 'reviewed', 'unaudited']),
  unit: moneyUnitSchema,
  revenue: z.number().positive(),
  /** Net profit attributable to the parent's shareholders. */
  netProfit: z.number(),
  /** Net profit attributable, excluding non-recurring items (扣非). */
  adjustedNetProfit: z.number(),
  grossMargin: grossMarginSchema,
  prior: priorPeriodSchema.optional(),
  /** Year-over-year changes the filing states, in percent. */
  statedGrowthPct: z
    .object({
      revenue: z.number().optional(),
      netProfit: z.number().optional(),
      adjustedNetProfit: z.number().optional(),
    })
    .optional(),
  oneOffCharge: z.object({ label: z.string().min(1), amount: z.number().positive() }).optional(),
});

export const productLineSchema = z.enum(['humanoid', 'quadruped']);
export const revenueLineSchema = z.enum(['quadruped', 'humanoid', 'components', 'other']);

/** Units per product line and year. Sold and shipped are never summed or swapped. */
export const unitsRowSchema = profileSourceSchema.extend({
  line: productLineSchema,
  year: z.number().int(),
  produced: z.number().int().nonnegative(),
  shipped: z.union([z.number().int().nonnegative(), notDisclosedSchema]),
  sold: z.number().int().nonnegative(),
  /** The filing's average price per unit sold, in 万元, kept to check the arithmetic. */
  statedAveragePriceTenK: z.number().positive(),
});

/** Main-business revenue by product line and year, in the filing's unit. */
export const revenueLineRowSchema = profileSourceSchema.extend({
  year: z.number().int(),
  line: revenueLineSchema,
  unit: moneyUnitSchema,
  amount: z.number().nonnegative(),
  sharePct: z.number().nonnegative(),
});

export const mainBusinessTotalSchema = profileSourceSchema.extend({
  year: z.number().int(),
  unit: moneyUnitSchema,
  amount: z.number().positive(),
});

export const regionRowSchema = profileSourceSchema.extend({
  year: z.number().int(),
  region: z.enum(['domestic', 'overseas']),
  unit: moneyUnitSchema,
  amount: z.number().nonnegative(),
  sharePct: z.number().nonnegative(),
});

export const marketShareRowSchema = profileSourceSchema.extend({
  year: z.number().int(),
  market: z.string().min(1),
  sharePct: z.number().nonnegative(),
});

export const productTypeSchema = z.enum([
  'humanoid',
  'wheeled humanoid',
  'dual-arm',
  'quadruped',
  'wheeled quadruped',
  'arm',
  'hand',
  'gripper',
  'lidar',
]);

/** A measured quantity as the maker states it: "about 35 kg", "over 40 kg", "3 to 5 kg". */
export const quantitySchema = z.object({
  value: z.number().positive(),
  max: z.number().positive().optional(),
  unit: z.enum(['kg', 'g', 'lb']),
  qualifier: z.enum(['about', 'over', 'at least']).optional(),
});

export const dofSchema = z.union([
  z.number().int().positive(),
  z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
]);

/**
 * One named trim. Price is a number only when the maker lists a real price;
 * a placeholder is 'contact sales'. The launch is not stored here: it is the
 * family's launch row in the timeline (lib/company-profile.ts productLaunch).
 */
export const productSchema = profileSourceSchema
  .extend({
    id: slugSchema,
    name: z.string().min(1),
    /** Model family the launch row names, e.g. "G1" for the G1 EDU. */
    family: z.string().min(1),
    type: productTypeSchema,
    priceUsd: z.number().positive().nullable(),
    priceAbsent: z.enum(['contact sales', NOT_DISCLOSED, NOT_APPLICABLE]).nullable(),
    mass: z.union([quantitySchema, notDisclosedSchema]),
    dof: z.union([dofSchema, notDisclosedSchema, notApplicableSchema]),
    dofBasis: z.string().min(1).optional(),
    payload: z.union([quantitySchema, notDisclosedSchema, notApplicableSchema]),
    /** What the payload measures, as the source labels it: walking load, per arm, grasp. */
    payloadBasis: z.string().min(1).optional(),
    notable: z.string().min(1).optional(),
    /** Where the specification comes from when it is not the price source. */
    specSourceUrl: httpsUrlSchema.optional(),
    specSourceTitle: z.string().min(1).optional(),
    specPageRef: z.string().min(1).optional(),
  })
  .superRefine((product, ctx) => {
    const priced = product.priceUsd !== null;
    const absent = product.priceAbsent !== null;
    if (priced === absent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceUsd'],
        message: `${product.id}: needs exactly one of a price or a price disposition`,
      });
    }
    if (
      (product.specSourceUrl === undefined) !== (product.specSourceTitle === undefined) ||
      (product.specPageRef !== undefined && product.specSourceUrl === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specSourceUrl'],
        message: `${product.id}: a spec source needs both a URL and a title`,
      });
    }
  });

export const timelineKindSchema = z.enum([
  'listing',
  'funding',
  'product',
  'us-restriction',
  'security',
  'incident',
  'corporate',
]);

/** The company's own statement on an event, with its own source. */
export const companyReplySchema = z.union([
  z.literal('no statement'),
  notApplicableSchema,
  z.object({
    text: z.string().min(1),
    date: profileDateSchema.optional(),
    sourceType: sourceTypeSchema,
    sourceUrl: httpsUrlSchema,
    sourceTitle: z.string().min(1),
    pageRef: z.string().min(1).optional(),
  }),
]);

export const timelineRowSchema = profileSourceSchema
  .extend({
    id: slugSchema,
    date: profileDateSchema,
    kind: timelineKindSchema,
    title: z.string().min(1),
    /** On a product row: the family whose launch this is. */
    launchOf: z.string().min(1).optional(),
    /** On a funding row: the amount raised as filed. */
    amount: moneySchema.optional(),
    postMoneyValuation: moneySchema.optional(),
    /** On a security row. */
    cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/)).optional(),
    credits: z.union([z.array(z.string().min(1)).min(1), notDisclosedSchema, notApplicableSchema]).optional(),
    companyReply: companyReplySchema,
  })
  .superRefine((row, ctx) => {
    if (row.launchOf !== undefined && row.kind !== 'product') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['launchOf'],
        message: `${row.id}: only product rows name a launch`,
      });
    }
    if (row.kind === 'security' && row.credits === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['credits'],
        message: `${row.id}: a security row credits the researchers or says why not`,
      });
    }
  });

export const licenseSchema = z.enum([
  'BSD-3-Clause',
  'Apache-2.0',
  'GPL-2.0',
  'MIT',
  'MPL-2.0',
  'custom license file',
  'no license file',
  'no license tag',
  'mixed',
  NOT_DISCLOSED,
]);

export const softwareRowSchema = profileSourceSchema.extend({
  id: slugSchema,
  name: z.string().min(1),
  kind: z.enum(['repository', 'model', 'dataset', 'collection']),
  url: httpsUrlSchema,
  description: z.string().min(1),
  /** The license of this item exactly as its host reports it. */
  license: licenseSchema,
  publisher: z.string().min(1).optional(),
  created: profileDateSchema.optional(),
  /** On a collection: how many items, and whether that is only a floor. */
  count: z.number().int().positive().optional(),
  countIsFloor: z.boolean().optional(),
});

export const companyProfileSchema = z
  .object({
    slug: slugSchema,
    asOf: isoDateSchema,
    company: companyFactsSchema,
    listing: listingSchema,
    control: controlSchema,
    holders: z.array(holderSchema).min(1),
    financials: z.array(financialPeriodSchema).min(1),
    units: z.array(unitsRowSchema),
    revenueLines: z.array(revenueLineRowSchema),
    mainBusinessTotals: z.array(mainBusinessTotalSchema),
    regions: z.array(regionRowSchema),
    marketShares: z.array(marketShareRowSchema),
    products: z.array(productSchema).min(1),
    timeline: z.array(timelineRowSchema).min(1),
    software: z.array(softwareRowSchema),
  })
  .superRefine((profile, ctx) => {
    const rows = new Set<number>();
    for (const holder of profile.holders) {
      if (holder.filingRow > profile.listing.holderTableRows.value || rows.has(holder.filingRow)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['holders'],
          message: `${holder.id}: filing row ${holder.filingRow} is repeated or outside the table`,
        });
      }
      rows.add(holder.filingRow);
    }
    const holderIds = new Set(profile.holders.map((holder) => holder.id));
    for (const id of [profile.control.holderId, ...profile.control.platformHolderIds]) {
      if (!holderIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['control'],
          message: `control names ${id}, which is not a holder`,
        });
      }
    }
    for (const [name, rows] of [
      ['holders', profile.holders],
      ['financials', profile.financials],
      ['products', profile.products],
      ['timeline', profile.timeline],
      ['software', profile.software],
    ] as const) {
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `duplicate ${name} id ${row.id}`,
          });
        }
        seen.add(row.id);
      }
    }
  });

export type ProfileSource = z.infer<typeof profileSourceSchema>;
export type MoneyUnit = z.infer<typeof moneyUnitSchema>;
export type Money = z.infer<typeof moneySchema>;
export type Holder = z.infer<typeof holderSchema>;
export type FinancialPeriod = z.infer<typeof financialPeriodSchema>;
export type ProductLine = z.infer<typeof productLineSchema>;
export type RevenueLine = z.infer<typeof revenueLineSchema>;
export type UnitsRow = z.infer<typeof unitsRowSchema>;
export type RevenueLineRow = z.infer<typeof revenueLineRowSchema>;
export type Product = z.infer<typeof productSchema>;
export type Quantity = z.infer<typeof quantitySchema>;
export type TimelineKind = z.infer<typeof timelineKindSchema>;
export type TimelineRow = z.infer<typeof timelineRowSchema>;
export type CompanyReply = z.infer<typeof companyReplySchema>;
export type SoftwareRow = z.infer<typeof softwareRowSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
