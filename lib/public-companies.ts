/**
 * Public robotics companies: conversion, sizing, grouping and totals.
 * Pure functions over data/public-companies.ts; no React.
 *
 * Every conversion takes the rates as an argument, in the shape of
 * EUR_REFERENCE_RATES in data/fx-rates.ts: units of each currency per 1 EUR.
 * Amounts convert through the euro cross rate, amount / rate[currency] * rate.USD.
 *
 * Pinned in tests/unit/public-companies.test.ts.
 */
import {
  DEBUTS,
  PUBLIC_COMPANIES,
  PUBLIC_COMPANIES_AS_OF,
  type Debut,
  type ExposureClass,
  type ListingCurrency,
  type PublicCompany,
  type PublicSegment,
} from '@/data/public-companies';
import { EXPOSURE_CLASSES, PUBLIC_SEGMENTS } from '@/data/schemas/public-company';
import type { MarketMapSegment } from '@/lib/market-map';
import { formatLongDate } from '@/lib/dates';

export { EXPOSURE_CLASSES, PUBLIC_SEGMENTS };

/** Currencies a rates table must carry; EUR is the base and needs no rate. */
export type RatedListingCurrency = Exclude<ListingCurrency, 'EUR'>;

/** Units of each currency per 1 EUR. */
export type EurReferenceRates = Readonly<Record<RatedListingCurrency, number>>;

export const PUBLIC_SEGMENT_LABELS: Record<PublicSegment, string> = {
  humanoids: 'Humanoids',
  arms: 'Industrial arms',
  logistics: 'Logistics',
  surgical: 'Surgical',
  service: 'Service',
  vehicles: 'Autonomous vehicles',
  drones: 'Drones',
  components: 'Components',
};

/** Each public segment's place among the private market map's six. */
export const PUBLIC_TO_MARKET_MAP_SEGMENT: Record<PublicSegment, MarketMapSegment> = {
  humanoids: 'humanoids',
  arms: 'industrial-logistics',
  logistics: 'industrial-logistics',
  surgical: 'vertical-applications',
  service: 'vertical-applications',
  vehicles: 'vertical-applications',
  drones: 'vertical-applications',
  components: 'components-hardware',
};

export function toUsd(amount: number, currency: ListingCurrency, rates: EurReferenceRates): number {
  if (currency === 'USD') return amount;
  const eur = currency === 'EUR' ? amount : amount / rates[currency];
  return eur * rates.USD;
}

export function isSized(company: Pick<PublicCompany, 'exposure'>): boolean {
  return company.exposure !== 'minor part';
}

/** Market value in USD for the map, or null: a `minor part` company is listed, never sized. */
export function mapSizeUsd(
  company: Pick<PublicCompany, 'exposure' | 'marketCap' | 'currency'>,
  rates: EurReferenceRates,
): number | null {
  return isSized(company) ? toUsd(company.marketCap, company.currency, rates) : null;
}

/** Robotics share of revenue in percent: the filed figure, else the ratio of the two filed figures. */
export function roboticsSharePercent(company: Pick<PublicCompany, 'roboticsShare'>): number | null {
  const share = company.roboticsShare;
  if (!share) return null;
  if (share.filedPercent !== null) return share.filedPercent;
  if (share.lineRevenue === null || share.totalRevenue === null) return null;
  return (share.lineRevenue / share.totalRevenue) * 100;
}

function groupBy<K extends string>(
  companies: readonly PublicCompany[],
  key: (company: PublicCompany) => K,
): Partial<Record<K, PublicCompany[]>> {
  const groups: Partial<Record<K, PublicCompany[]>> = {};
  for (const company of companies) {
    const k = key(company);
    (groups[k] ??= []).push(company);
  }
  return groups;
}

export function companiesBySegment(
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): Record<PublicSegment, PublicCompany[]> {
  const groups = groupBy(companies, (c) => c.segment);
  return Object.fromEntries(PUBLIC_SEGMENTS.map((s) => [s, groups[s] ?? []])) as Record<
    PublicSegment,
    PublicCompany[]
  >;
}

/** Companies per country code, countries with the most companies first, ties by code. */
export function companiesByCountry(
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): [country: string, companies: PublicCompany[]][] {
  const groups = groupBy(companies, (c) => c.country);
  return Object.entries(groups as Record<string, PublicCompany[]>).sort(
    ([a, x], [b, y]) => y.length - x.length || a.localeCompare(b),
  );
}

export function exposureCounts(
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): Record<ExposureClass, number> {
  const counts = Object.fromEntries(EXPOSURE_CLASSES.map((c) => [c, 0])) as Record<ExposureClass, number>;
  for (const company of companies) counts[company.exposure] += 1;
  return counts;
}

export interface SegmentTotal {
  segment: PublicSegment;
  usd: number;
  /** Sized companies in the segment. */
  companies: number;
}

/** USD totals per segment over sized companies only, in PUBLIC_SEGMENTS order. */
export function sizedTotalsBySegment(
  rates: EurReferenceRates,
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): SegmentTotal[] {
  const bySegment = companiesBySegment(companies);
  return PUBLIC_SEGMENTS.map((segment) => {
    let usd = 0;
    let count = 0;
    for (const company of bySegment[segment]) {
      const size = mapSizeUsd(company, rates);
      if (size === null) continue;
      usd += size;
      count += 1;
    }
    return { segment, usd, companies: count };
  });
}

export interface SizedCompany {
  company: PublicCompany;
  usd: number;
}

/** Sized companies, largest USD value first. */
export function sizedCompanies(
  rates: EurReferenceRates,
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): SizedCompany[] {
  const sized: SizedCompany[] = [];
  for (const company of companies) {
    const usd = mapSizeUsd(company, rates);
    if (usd !== null) sized.push({ company, usd });
  }
  return sized.sort((a, b) => b.usd - a.usd);
}

/** Gross proceeds in the debut's currency: HKEX's two lines summed, price times shares, or the stated total. */
export function debutGrossProceeds(debut: Pick<Debut, 'proceeds' | 'offerPrice'>): number | null {
  const proceeds = debut.proceeds;
  if (!proceeds) return null;
  switch (proceeds.kind) {
    case 'hkex lines':
      return proceeds.fundsRaisedA + proceeds.fundsRaisedB;
    case 'price times shares':
      return debut.offerPrice === null ? null : debut.offerPrice * proceeds.offerShares;
    case 'stated':
      return proceeds.gross;
  }
}

/** Change from offer price to the as-of close, as a fraction; null ("n/a") without both. */
export function sinceListingChange(debut: Pick<Debut, 'offerPrice' | 'close'>): number | null {
  if (debut.offerPrice === null || debut.close === null) return null;
  return debut.close.price / debut.offerPrice - 1;
}

export function debutsWithChange(debuts: readonly Debut[] = DEBUTS): { debut: Debut; change: number }[] {
  const rows: { debut: Debut; change: number }[] = [];
  for (const debut of debuts) {
    const change = sinceListingChange(debut);
    if (change !== null) rows.push({ debut, change });
  }
  return rows;
}

/** The figure's source line for market values. */
export function marketValueSourceLine(asOf: string = PUBLIC_COMPANIES_AS_OF): string {
  return `Market values: Stock Analysis, close of ${formatLongDate(asOf)}, in each listing’s currency (reported).`;
}
