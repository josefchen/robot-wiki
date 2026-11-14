/**
 * Company profile arithmetic and display helpers. Pure functions, no React.
 *
 * The profile data stores figures as filed (data/company-profiles/). Every
 * total, share, growth rate, average price and currency conversion a profile
 * page shows is computed here from those rows, and pinned in
 * tests/unit/company-profile.test.ts.
 */
import {
  NOT_APPLICABLE,
  NOT_DISCLOSED,
  type CompanyProfile,
  type FinancialPeriod,
  type Holder,
  type Money,
  type MoneyUnit,
  type Product,
  type ProductLine,
  type Quantity,
  type RevenueLine,
  type TimelineKind,
  type TimelineRow,
} from '@/data/schemas/company-profile.ts';

export { NOT_APPLICABLE, NOT_DISCLOSED };

// ── Currency ──────────────────────────────────────────────────────────────

const YUAN_PER_UNIT: Record<MoneyUnit, number> = {
  CNY: 1,
  CNY10k: 10_000,
  CNY100m: 100_000_000,
};

/** 万元 (CNY 10,000) to yuan. */
export function tenKToYuan(amount: number): number {
  return amount * YUAN_PER_UNIT.CNY10k;
}

/** Yuan to 万元. */
export function yuanToTenK(amount: number): number {
  return amount / YUAN_PER_UNIT.CNY10k;
}

export function toYuan(money: Money): number {
  return money.amount * YUAN_PER_UNIT[money.unit];
}

export function convertMoney(money: Money, unit: MoneyUnit): Money {
  return { amount: toYuan(money) / YUAN_PER_UNIT[unit], unit };
}

/** Subtract two amounts, in the unit of the first. */
export function subtractMoney(a: Money, b: Money): Money {
  return { amount: (toYuan(a) - toYuan(b)) / YUAN_PER_UNIT[a.unit], unit: a.unit };
}

function grouped(value: number, digits: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * "CNY 6,099.32 m" or "CNY 60.99 bn". Billions from CNY 10 bn up, millions
 * below; two decimals by default.
 */
export function formatCny(money: Money, digits = 2): string {
  const yuan = toYuan(money);
  const sign = yuan < 0 ? '-' : '';
  const size = Math.abs(yuan);
  if (size >= 10_000_000_000) return `${sign}CNY ${grouped(size / 1e9, digits)} bn`;
  return `${sign}CNY ${grouped(size / 1e6, digits)} m`;
}

/** Whole yuan per share, e.g. "CNY 150.80". */
export function formatSharePrice(yuan: number): string {
  return `CNY ${grouped(yuan, 2)}`;
}

export function formatUsdPrice(amount: number): string {
  return `USD ${grouped(amount, 0)}`;
}

/** A fraction as a percentage string: 0.4854 → "48.54%". */
export function formatPct(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Round a percentage the way the filings print it. */
export function roundPct(fraction: number, digits = 2): number {
  return Number((fraction * 100).toFixed(digits));
}

// ── Growth and margins ────────────────────────────────────────────────────

/**
 * Year-over-year growth as a fraction. Null when the prior value is zero or
 * negative: growth from a loss is not a meaningful percentage.
 */
export function yoyGrowth(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return current / prior - 1;
}

/** Growth of one field of a period against its stored prior-year comparative. */
export function periodGrowth(
  period: FinancialPeriod,
  field: 'revenue' | 'netProfit' | 'adjustedNetProfit',
): number | null {
  const prior = period.prior?.[field];
  if (prior === undefined) return null;
  return yoyGrowth(period[field], prior);
}

/** Growth between two periods of the same length, converting units. */
export function growthBetween(
  current: FinancialPeriod,
  prior: FinancialPeriod,
  field: 'revenue' | 'netProfit' | 'adjustedNetProfit',
): number | null {
  return yoyGrowth(
    toYuan({ amount: current[field], unit: current.unit }),
    toYuan({ amount: prior[field], unit: prior.unit }),
  );
}

export type GrossMargin =
  | { pct: number; basis: 'main business' | 'computed on total revenue' }
  | typeof NOT_DISCLOSED;

/**
 * The period's gross margin with its basis. A filed main-business margin is
 * returned as filed; a computed one is (revenue − cost of sales) ÷ revenue,
 * in percent, from the stored inputs.
 */
export function grossMargin(period: FinancialPeriod): GrossMargin {
  const margin = period.grossMargin;
  if (margin.basis === 'main business') return { pct: margin.pct, basis: margin.basis };
  if (margin.basis === 'computed on total revenue') {
    return {
      pct: ((period.revenue - margin.costOfSales) / period.revenue) * 100,
      basis: margin.basis,
    };
  }
  return NOT_DISCLOSED;
}

export function financialPeriod(profile: CompanyProfile, id: string): FinancialPeriod {
  const period = profile.financials.find((row) => row.id === id);
  if (!period) throw new Error(`${profile.slug}: no financial period ${id}`);
  return period;
}

// ── Units and revenue lines ───────────────────────────────────────────────

function unitsRow(profile: CompanyProfile, line: ProductLine, year: number) {
  const row = profile.units.find((candidate) => candidate.line === line && candidate.year === year);
  if (!row) throw new Error(`${profile.slug}: no ${line} units for ${year}`);
  return row;
}

function revenueLineRow(profile: CompanyProfile, line: RevenueLine, year: number) {
  const row = profile.revenueLines.find(
    (candidate) => candidate.line === line && candidate.year === year,
  );
  if (!row) throw new Error(`${profile.slug}: no ${line} revenue for ${year}`);
  return row;
}

/**
 * Average revenue per unit sold: the line's main-business revenue divided
 * by units sold (not shipped), in the revenue row's unit per unit.
 */
export function averagePricePerUnit(
  profile: CompanyProfile,
  line: ProductLine,
  year: number,
): Money {
  const units = unitsRow(profile, line, year);
  const revenue = revenueLineRow(profile, line, year);
  if (units.sold === 0) throw new Error(`${profile.slug}: no ${line} units sold in ${year}`);
  return { amount: revenue.amount / units.sold, unit: revenue.unit };
}

/** Units of one kind summed over the years the profile holds. Sold and shipped never mix. */
export function cumulativeUnits(
  profile: CompanyProfile,
  line: ProductLine,
  field: 'sold' | 'produced',
): number {
  return profile.units
    .filter((row) => row.line === line)
    .reduce((sum, row) => sum + row[field], 0);
}

export interface RevenueLineShare {
  line: RevenueLine;
  amount: number;
  /** The filing's own share, in percent. */
  statedPct: number;
  /** This line's amount over the main-business total, in percent. */
  computedPct: number;
}

export interface RevenueLineShares {
  year: number;
  lines: RevenueLineShare[];
  /** The line that is not a product category, named so the shares close to 100%. */
  remainder: RevenueLineShare;
  statedTotalPct: number;
  /** The most the stated shares can miss 100% by from rounding each to two decimals. */
  roundingTolerancePct: number;
  /** Lines summed against the filed main-business total, in the filing's unit. */
  amountGap: number;
}

export function revenueLineShares(profile: CompanyProfile, year: number): RevenueLineShares {
  const rows = profile.revenueLines.filter((row) => row.year === year);
  const total = profile.mainBusinessTotals.find((row) => row.year === year);
  if (rows.length === 0 || !total) {
    throw new Error(`${profile.slug}: no revenue lines for ${year}`);
  }
  const shares = rows.map((row) => ({
    line: row.line,
    amount: row.amount,
    statedPct: row.sharePct,
    computedPct: (row.amount / total.amount) * 100,
  }));
  const remainder = shares.find((share) => share.line === 'other');
  if (!remainder) throw new Error(`${profile.slug}: ${year} revenue lines name no remainder`);
  return {
    year,
    lines: shares.filter((share) => share.line !== 'other'),
    remainder,
    statedTotalPct: shares.reduce((sum, share) => sum + share.statedPct, 0),
    roundingTolerancePct: shares.length * 0.005,
    amountGap: shares.reduce((sum, share) => sum + share.amount, 0) - total.amount,
  };
}

// ── Listing ───────────────────────────────────────────────────────────────

type Listing = CompanyProfile['listing'];

/** Offer price times new shares sold, in yuan. */
export function grossProceedsFromTerms(listing: Listing): Money {
  return { amount: listing.offerPrice.value * listing.newShares.value, unit: 'CNY' };
}

/** New shares as a fraction of the enlarged share capital. */
export function newShareFraction(listing: Listing): number {
  return listing.newShares.value / listing.sharesAfterListing.value;
}

/** Gross proceeds less issue costs, in the gross figure's unit. */
export function netProceedsFromCosts(listing: Listing): Money {
  return subtractMoney(listing.grossProceeds.value, listing.issueCosts.value);
}

/** Net proceeds less the raise the prospectus planned, in the net figure's unit. */
export function netProceedsOverPlan(listing: Listing): Money {
  return subtractMoney(listing.netProceeds.value, listing.plannedRaise.value);
}

/** Offer price times all shares after the listing, in yuan. */
export function marketValueAtOffer(listing: Listing): Money {
  return { amount: listing.offerPrice.value * listing.sharesAfterListing.value, unit: 'CNY' };
}

/** Latest close times all shares after the listing, in yuan. Rests on a reported price. */
export function marketValueAtLatestClose(listing: Listing): Money {
  return { amount: listing.latestClose.value.close * listing.sharesAfterListing.value, unit: 'CNY' };
}

/** First-day close against the offer price, as a fraction. */
export function firstDayChange(listing: Listing): number {
  return listing.firstDay.value.close / listing.offerPrice.value - 1;
}

/** What a holder paid at the offer price for its shares, in yuan. */
export function costAtOffer(listing: Listing, holder: Holder): Money {
  return { amount: holder.sharesTenK * 10_000 * listing.offerPrice.value, unit: 'CNY' };
}

// ── Holders and votes ─────────────────────────────────────────────────────

/** All votes after the listing, in 万票: class A shares carry several votes, the rest one. */
export function totalVotesTenK(profile: CompanyProfile): number {
  const classA = profile.control.classAShares.value;
  const perClassA = profile.control.votesPerClassAShare.value;
  const shares = profile.listing.sharesAfterListing.value;
  return (classA * perClassA + (shares - classA)) / 10_000;
}

/** A holder's shares over all shares after the listing, in percent. */
export function stakeFromShares(profile: CompanyProfile, holder: Holder): number {
  return ((holder.sharesTenK * 10_000) / profile.listing.sharesAfterListing.value) * 100;
}

/** A holder's votes over all votes after the listing, in percent; null when votes are not disclosed. */
export function voteShareFromVotes(profile: CompanyProfile, holder: Holder): number | null {
  if (typeof holder.votesTenK !== 'number') return null;
  return (holder.votesTenK / totalVotesTenK(profile)) * 100;
}

export interface GroupStake {
  group: string;
  holderIds: string[];
  stakeAfterPct: number;
}

/** Stakes summed for the groups the filing names; holders without a group are left out. */
export function groupStakes(holders: readonly Holder[]): GroupStake[] {
  const groups = new Map<string, GroupStake>();
  for (const holder of holders) {
    if (!holder.group) continue;
    const entry = groups.get(holder.group) ?? {
      group: holder.group,
      holderIds: [],
      stakeAfterPct: 0,
    };
    entry.holderIds.push(holder.id);
    entry.stakeAfterPct += holder.stakeAfterPct;
    groups.set(holder.group, entry);
  }
  return [...groups.values()].sort((a, b) => b.stakeAfterPct - a.stakeAfterPct);
}

/** Holders by stake after the listing, largest first. */
export function holdersByStake(holders: readonly Holder[]): Holder[] {
  return [...holders].sort((a, b) => b.stakeAfterPct - a.stakeAfterPct);
}

// ── Dates and the timeline ────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type DatePrecision = 'year' | 'month' | 'day';

export interface ParsedProfileDate {
  year: number;
  month: number | null;
  day: number | null;
  precision: DatePrecision;
  /** First day of the period, for sorting. */
  start: string;
}

export function parseProfileDate(value: string): ParsedProfileDate {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) throw new Error(`not a profile date: "${value}"`);
  const year = Number(match[1]);
  const month = match[2] === undefined ? null : Number(match[2]);
  const day = match[3] === undefined ? null : Number(match[3]);
  if (month !== null && (month < 1 || month > 12)) throw new Error(`month out of range in "${value}"`);
  if (day !== null) {
    const probe = new Date(Date.UTC(year, (month ?? 1) - 1, day));
    if (probe.getUTCDate() !== day) throw new Error(`day out of range in "${value}"`);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    year,
    month,
    day,
    precision: day !== null ? 'day' : month !== null ? 'month' : 'year',
    start: `${year}-${pad(month ?? 1)}-${pad(day ?? 1)}`,
  };
}

/** "19 Aug 2026", "Aug 2024" or "2017": only as precise as the source. */
export function formatProfileDate(value: string): string {
  const date = parseProfileDate(value);
  if (date.month === null) return String(date.year);
  const month = MONTH_SHORT[date.month - 1];
  if (date.day === null) return `${month} ${date.year}`;
  return `${date.day} ${month} ${date.year}`;
}

const PRECISION_RANK: Record<DatePrecision, number> = { day: 0, month: 1, year: 2 };

/**
 * Newest first by the first day of each row's period. A year-only row sorts
 * at 1 January of its year, so it falls below the dated rows of that year;
 * on the same start the more precise date comes first, then the id.
 */
export function timelineNewestFirst(rows: readonly TimelineRow[]): TimelineRow[] {
  return [...rows].sort((a, b) => {
    const da = parseProfileDate(a.date);
    const db = parseProfileDate(b.date);
    if (da.start !== db.start) return da.start < db.start ? 1 : -1;
    const rank = PRECISION_RANK[da.precision] - PRECISION_RANK[db.precision];
    if (rank !== 0) return rank;
    return a.id.localeCompare(b.id);
  });
}

export function timelineOfKind(
  rows: readonly TimelineRow[],
  kind: TimelineKind | readonly TimelineKind[],
): TimelineRow[] {
  const kinds = new Set<TimelineKind>(typeof kind === 'string' ? [kind] : kind);
  return timelineNewestFirst(rows.filter((row) => kinds.has(row.kind)));
}

// ── Products ──────────────────────────────────────────────────────────────

/** The family's launch date from its timeline row, or "not disclosed". */
export function productLaunch(profile: CompanyProfile, product: Product): string {
  const row = profile.timeline.find((candidate) => candidate.launchOf === product.family);
  return row ? row.date : NOT_DISCLOSED;
}

export function formatProductPrice(product: Product): string {
  if (product.priceUsd !== null) return formatUsdPrice(product.priceUsd);
  if (product.priceAbsent === null) throw new Error(`${product.id}: no price and no disposition`);
  return product.priceAbsent;
}

const KG_PER_UNIT: Record<Quantity['unit'], number> = { kg: 1, g: 0.001, lb: 0.45359237 };

/** A stated quantity in kilograms (the low end of a range). */
export function quantityInKg(quantity: Quantity): number {
  return quantity.value * KG_PER_UNIT[quantity.unit];
}

/** "about 35 kg", "over 40 kg", "3 to 5 kg", "about 68 kg" for a mass stated in pounds. */
export function formatQuantity(quantity: Quantity | typeof NOT_DISCLOSED | typeof NOT_APPLICABLE): string {
  if (typeof quantity === 'string') return quantity;
  const qualifier = quantity.qualifier ? `${quantity.qualifier} ` : '';
  if (quantity.unit === 'lb') {
    return `${quantity.qualifier ? qualifier : 'about '}${Math.round(quantityInKg(quantity))} kg`;
  }
  const value = grouped(quantity.value, Number.isInteger(quantity.value) ? 0 : 1);
  if (quantity.max !== undefined) return `${qualifier}${value} to ${grouped(quantity.max, 0)} ${quantity.unit}`;
  return `${qualifier}${value} ${quantity.unit}`;
}

export function formatDof(dof: Product['dof']): string {
  if (typeof dof === 'string') return dof;
  if (typeof dof === 'number') return String(dof);
  return `${dof.min} to ${dof.max}`;
}

// ── Provenance ────────────────────────────────────────────────────────────

export interface SourceTypeCounts {
  primary: number;
  reported: number;
  total: number;
}

/**
 * Every row and every single-value fact in the profile, as { section, row }.
 * A company reply is part of its timeline row and is not counted on its own.
 */
export function profileRows(profile: CompanyProfile) {
  const facts = (section: string, record: Record<string, unknown>) =>
    Object.values(record)
      .filter(
        (value): value is { sourceType: 'primary' | 'reported' } =>
          typeof value === 'object' && value !== null && 'sourceType' in value,
      )
      .map((row) => ({ section, row }));
  const rows = (section: string, list: readonly { sourceType: 'primary' | 'reported' }[]) =>
    list.map((row) => ({ section, row }));
  return [
    ...facts('company', profile.company),
    ...facts('listing', profile.listing),
    ...facts('control', profile.control),
    ...rows('holders', profile.holders),
    ...rows('financials', profile.financials),
    ...rows('units', profile.units),
    ...rows('revenueLines', profile.revenueLines),
    ...rows('mainBusinessTotals', profile.mainBusinessTotals),
    ...rows('regions', profile.regions),
    ...rows('marketShares', profile.marketShares),
    ...rows('products', profile.products),
    ...rows('timeline', profile.timeline),
    ...rows('software', profile.software),
  ];
}

export function countsBySourceType(profile: CompanyProfile): SourceTypeCounts {
  const counts = { primary: 0, reported: 0, total: 0 };
  for (const { row } of profileRows(profile)) {
    counts[row.sourceType] += 1;
    counts.total += 1;
  }
  return counts;
}

/** Rows per section, for coverage reports. */
export function rowCountsBySection(profile: CompanyProfile): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { section } of profileRows(profile)) counts[section] = (counts[section] ?? 0) + 1;
  return counts;
}
