/**
 * What a company profile page (/companies/<slug>/) derives from its profile
 * for display: the registry of profiles, the page's sections, the counts its
 * sentences state, the rows of each table and the labels of its sources.
 * Figures come from lib/company-profile.ts; nothing here types a number.
 */
import { UNITREE_PROFILE } from '../data/company-profiles/unitree.ts';
import type {
  CompanyProfile,
  CompanyReply,
  FinancialPeriod,
  Holder,
  Money,
  ProductLine,
  ProfileSource,
  TimelineKind,
  TimelineRow,
} from '../data/schemas/company-profile.ts';
import {
  NOT_APPLICABLE,
  NOT_DISCLOSED,
  averagePricePerUnit,
  firstDayChange,
  formatCny,
  formatPct,
  formatSharePrice,
  grossMargin,
  groupStakes,
  holdersInFilingOrder,
  marketValueAtLatestClose,
  netProceedsOverPlan,
  newShareFraction,
  timelineNewestFirst,
  toYuan,
} from './company-profile.ts';

export const COMPANY_PROFILES: readonly CompanyProfile[] = [UNITREE_PROFILE];

export function companyProfile(slug: string): CompanyProfile {
  const profile = COMPANY_PROFILES.find((candidate) => candidate.slug === slug);
  if (!profile) throw new Error(`no company profile ${slug}`);
  return profile;
}

export function companyProfilePath(slug: string): `/companies/${string}/` {
  return `/companies/${slug}/`;
}

/** The page's sections, in reading order. */
export const PROFILE_SECTIONS = [
  { id: 'products', title: 'Products' },
  { id: 'money', title: 'Money' },
  { id: 'timeline', title: 'Timeline' },
  { id: 'software-and-data', title: 'Software and data' },
  { id: 'security', title: 'Security disclosures' },
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]['id'];

// ── Rows each section shows ───────────────────────────────────────────────

/** The timeline without the security rows, which have their own section. */
export function timelineEvents(profile: CompanyProfile): TimelineRow[] {
  return timelineNewestFirst(profile.timeline.filter((row) => row.kind !== 'security'));
}

export function securityRecords(profile: CompanyProfile): TimelineRow[] {
  return timelineNewestFirst(profile.timeline.filter((row) => row.kind === 'security'));
}

/** Every CVE the security rows name, without repeats. */
export function cveCount(profile: CompanyProfile): number {
  return new Set(profile.timeline.flatMap((row) => row.cves ?? [])).size;
}

export interface ProfilePageCounts {
  products: number;
  events: number;
  security: number;
  cves: number;
  holders: number;
  holderTableRows: number;
  software: number;
}

export function profilePageCounts(profile: CompanyProfile): ProfilePageCounts {
  return {
    products: profile.products.length,
    events: timelineEvents(profile).length,
    security: securityRecords(profile).length,
    cves: cveCount(profile),
    holders: profile.holders.length,
    holderTableRows: profile.listing.holderTableRows.value,
    software: profile.software.length,
  };
}

/** The header's lead, without its closing date: true of every row the page holds. */
export function profileLead(profile: CompanyProfile): string {
  const counts = profilePageCounts(profile);
  return (
    `${counts.products} ${profile.company.name} products, its results, listing and shareholders, ` +
    `${counts.events} dated events and ${counts.security} security records, each row with its source`
  );
}

export interface PriceCounts {
  priced: number;
  contactSales: number;
  notDisclosed: number;
}

export function priceCounts(profile: CompanyProfile): PriceCounts {
  const counts = { priced: 0, contactSales: 0, notDisclosed: 0 };
  for (const product of profile.products) {
    if (product.priceUsd !== null) counts.priced += 1;
    else if (product.priceAbsent === 'contact sales') counts.contactSales += 1;
    else counts.notDisclosed += 1;
  }
  return counts;
}

/** "a", "a and b", "a, b and c". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** The documents a set of rows rests on, by their short names, without repeats. */
export function documentNames(rows: readonly ProfileSource[]): string[] {
  return [...new Set(rows.map((row) => sourceLabel(row)))];
}

/** Each section's lead sentence, from the rows it introduces. */
export function sectionLeads(profile: CompanyProfile): Record<ProfileSectionId, string> {
  const counts = profilePageCounts(profile);
  const prices = priceCounts(profile);
  return {
    products:
      `${counts.products} trims, one per row. ${prices.priced} carry a list price in US dollars from the maker's ` +
      `shop or product page, ${prices.contactSales} are sold through sales and ${prices.notDisclosed} have no published price.`,
    money: `Results from the ${joinList(documentNames(profile.financials))}, in millions of yuan.`,
    timeline:
      `${counts.events} events, newest first. Each United States restriction carries the company's reply ` +
      'or says it made none.',
    'software-and-data': `${counts.software} repositories, models, datasets and collections, each with the license its host reports.`,
    security: `${counts.security} records naming ${counts.cves} CVEs, newest first, with the company's reply where one applies.`,
  };
}

/** The shareholders table's lead: how many of the filing's rows it keeps. */
export function holdersLead(profile: CompanyProfile): string {
  const counts = profilePageCounts(profile);
  return (
    `${counts.holders} of the ${counts.holderTableRows} rows in the ${sourceLabel(profile.listing.holderTableRows)}'s ` +
    'shareholder table, in its order.'
  );
}

// ── Formatting ────────────────────────────────────────────────────────────

/** An amount in whole yuan, e.g. "CNY 166,411". */
export function formatCnyWhole(money: Money): string {
  return `CNY ${Math.round(toYuan(money)).toLocaleString('en-US')}`;
}

/** A whole count with grouping, e.g. "40,446,434". */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/** A percentage stored in percent, e.g. 21.4395 → "21.4395%". The digits stay as filed. */
export function formatStoredPct(value: number): string {
  return `${value}%`;
}

/** A signed change, e.g. 4.6034 → "+460.34%". */
export function formatChange(fraction: number): string {
  return `${fraction >= 0 ? '+' : ''}${formatPct(fraction)}`;
}

/** "price not disclosed": an absent value with the noun it stands for. */
export function absentWithNoun(value: typeof NOT_DISCLOSED | typeof NOT_APPLICABLE, noun: string): string {
  return value === NOT_DISCLOSED ? `${noun} not disclosed` : NOT_APPLICABLE;
}

const KIND_LABELS: Record<TimelineKind, string> = {
  listing: 'Listing',
  funding: 'Funding',
  product: 'Product',
  'us-restriction': 'US restriction',
  security: 'Security',
  incident: 'Incident',
  corporate: 'Corporate',
};

export function timelineKindLabel(kind: TimelineKind): string {
  return KIND_LABELS[kind];
}

// ── Sources ───────────────────────────────────────────────────────────────

export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * The short name a source link shows: the publisher or document the title
 * names in its last parenthesis ("final prospectus", "Boschko Security
 * Blog"), else the host. A parenthesis that is one lowercase word
 * ("unadjusted") qualifies the title and names nothing, so the host is used.
 */
export function sourceLabel(source: Pick<ProfileSource, 'sourceUrl' | 'sourceTitle'>): string {
  const groups = [...source.sourceTitle.matchAll(/\(([^()]+)\)/g)];
  const last = groups.at(-1)?.[1];
  const name = last?.split(/[,;]/)[0]?.trim();
  if (name && /[A-Z\s]/.test(name)) return name;
  return sourceHost(source.sourceUrl);
}

/** A company reply that is a statement, or null for "no statement" and "n/a". */
export function replyStatement(reply: CompanyReply): Exclude<CompanyReply, string> | null {
  return typeof reply === 'string' ? null : reply;
}

// ── Money ─────────────────────────────────────────────────────────────────

export interface ResultsRow {
  period: FinancialPeriod;
  revenue: string;
  netProfit: string;
  adjustedNetProfit: string;
  margin: { text: string; computed: boolean };
  oneOffCharge: string | null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function periodMoney(period: FinancialPeriod, amount: number): string {
  return formatCny({ amount, unit: period.unit });
}

/** The results table: every stored period in CNY millions, oldest first as filed. */
export function resultsRows(profile: CompanyProfile): ResultsRow[] {
  return profile.financials.map((period) => {
    const margin = grossMargin(period);
    return {
      period,
      revenue: periodMoney(period, period.revenue),
      netProfit: periodMoney(period, period.netProfit),
      adjustedNetProfit: periodMoney(period, period.adjustedNetProfit),
      margin:
        margin === NOT_DISCLOSED
          ? { text: absentWithNoun(NOT_DISCLOSED, 'margin'), computed: false }
          : { text: `${margin.pct.toFixed(2)}%`, computed: margin.basis === 'computed on total revenue' },
      oneOffCharge: period.oneOffCharge
        ? `${capitalize(period.oneOffCharge.label)} charge ${periodMoney(period, period.oneOffCharge.amount)}`
        : null,
    };
  });
}

/** Distinct sources across a set of rows, in first-seen order. */
export function distinctSources<T extends ProfileSource>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.sourceUrl} ${row.pageRef ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface LineYearRow {
  year: number;
  line: ProductLine;
  sold: number;
  shipped: number | typeof NOT_DISCLOSED;
  produced: number;
  revenue: string;
  sharePct: number;
  averagePrice: string;
  source: ProfileSource;
  note?: string;
}

/** Units, revenue and average price per unit sold, by year (newest first) and line. */
export function lineYearRows(profile: CompanyProfile): LineYearRow[] {
  const lines: ProductLine[] = ['humanoid', 'quadruped'];
  const years = [...new Set(profile.units.map((row) => row.year))].sort((a, b) => b - a);
  return years.flatMap((year) =>
    lines.flatMap((line) => {
      const units = profile.units.find((row) => row.year === year && row.line === line);
      const revenue = profile.revenueLines.find((row) => row.year === year && row.line === line);
      if (!units || !revenue) return [];
      return [
        {
          year,
          line,
          sold: units.sold,
          shipped: units.shipped,
          produced: units.produced,
          revenue: formatCny({ amount: revenue.amount, unit: revenue.unit }),
          sharePct: revenue.sharePct,
          averagePrice: formatCnyWhole(averagePricePerUnit(profile, line, year)),
          source: units,
          note: units.note,
        },
      ];
    }),
  );
}

export interface RegionYearRow {
  year: number;
  domesticPct: number;
  overseasPct: number;
  usPct: number | null;
  sources: ProfileSource[];
}

/** Domestic, overseas and United States shares of revenue, by year, newest first. */
export function regionYearRows(profile: CompanyProfile): RegionYearRow[] {
  const years = [...new Set(profile.regions.map((row) => row.year))].sort((a, b) => b - a);
  return years.map((year) => {
    const domestic = profile.regions.find((row) => row.year === year && row.region === 'domestic');
    const overseas = profile.regions.find((row) => row.year === year && row.region === 'overseas');
    const us = profile.marketShares.find((row) => row.year === year && row.market === 'United States');
    if (!domestic || !overseas) throw new Error(`${profile.slug}: no regions for ${year}`);
    return {
      year,
      domesticPct: domestic.sharePct,
      overseasPct: overseas.sharePct,
      usPct: us ? us.sharePct : null,
      sources: distinctSources([domestic, overseas, ...(us ? [us] : [])]),
    };
  });
}

export interface ListingFact {
  id: string;
  label: string;
  /** The day the figure belongs to, when it is one trading day. */
  date?: string;
  value: string;
  /** The value is a name, not a figure, and is set as text. */
  text?: boolean;
  /** A figure worked out here from stored rows, not filed. */
  computed?: boolean;
  source: ProfileSource;
}

/** The listing's facts, as filed, with the figures computed from them marked. */
export function listingFacts(profile: CompanyProfile): ListingFact[] {
  const { listing, control } = profile;
  const holder = profile.holders.find((row) => row.id === control.holderId);
  if (!holder) throw new Error(`${profile.slug}: no controlling holder ${control.holderId}`);
  return [
    {
      id: 'listed',
      label: 'Listed',
      date: listing.listed.value.date,
      value: `${listing.listed.value.exchange}, code ${listing.listed.value.ticker}`,
      text: true,
      source: listing.listed,
    },
    { id: 'offer-price', label: 'Offer price', value: formatSharePrice(listing.offerPrice.value), source: listing.offerPrice },
    {
      id: 'new-shares',
      label: 'New shares sold',
      value: `${formatCount(listing.newShares.value)}, ${formatPct(newShareFraction(listing))} of the shares after listing`,
      source: listing.newShares,
    },
    { id: 'existing-shares', label: 'Existing shares sold', value: formatCount(listing.existingSharesSold.value), source: listing.existingSharesSold },
    { id: 'shares-after', label: 'Shares after listing', value: formatCount(listing.sharesAfterListing.value), source: listing.sharesAfterListing },
    {
      id: 'subscription',
      label: 'Online subscription',
      value: `${formatCount(listing.onlineSubscriptionMultiple.value)} times the initial tranche`,
      source: listing.onlineSubscriptionMultiple,
    },
    { id: 'gross', label: 'Gross proceeds', value: formatCny(listing.grossProceeds.value), source: listing.grossProceeds },
    { id: 'costs', label: 'Issue costs', value: formatCny(listing.issueCosts.value), source: listing.issueCosts },
    { id: 'net', label: 'Net proceeds', value: formatCny(listing.netProceeds.value), source: listing.netProceeds },
    { id: 'planned', label: 'Raise the prospectus planned', value: formatCny(listing.plannedRaise.value), source: listing.plannedRaise },
    {
      id: 'over-plan',
      label: 'Net proceeds over the plan',
      value: formatCny(netProceedsOverPlan(listing)),
      computed: true,
      source: listing.netProceeds,
    },
    {
      id: 'value-at-offer',
      label: 'Market value at the offer price',
      value: formatCny(listing.statedMarketValueAtOffer.value),
      source: listing.statedMarketValueAtOffer,
    },
    {
      id: 'first-day',
      label: 'First trading day',
      date: listing.firstDay.value.date,
      value: `opened ${formatSharePrice(listing.firstDay.value.open)}, closed ${formatSharePrice(listing.firstDay.value.close)}`,
      source: listing.firstDay,
    },
    {
      id: 'first-day-change',
      label: 'First-day close against the offer price',
      value: formatChange(firstDayChange(listing)),
      computed: true,
      source: listing.firstDay,
    },
    {
      id: 'latest-close',
      label: 'Latest close',
      date: listing.latestClose.value.date,
      value: formatSharePrice(listing.latestClose.value.close),
      source: listing.latestClose,
    },
    {
      id: 'value-at-close',
      label: 'Market value at that close',
      value: formatCny(marketValueAtLatestClose(listing)),
      computed: true,
      source: listing.latestClose,
    },
    {
      id: 'class-a',
      label: `${holder.nameEn}'s class A shares`,
      value: `${formatCount(control.classAShares.value)}, ${control.votesPerClassAShare.value} votes each`,
      source: control.classAShares,
    },
    {
      id: 'votes-after',
      label: `${holder.nameEn}'s votes after listing`,
      value: `${formatStoredPct(control.directVotesAfterPct.value)} direct, ${formatStoredPct(control.withPlatformVotesAfterPct.value)} with the staff platform`,
      source: control.withPlatformVotesAfterPct,
    },
  ];
}

export interface GroupLine {
  group: string;
  members: number;
  stakeAfterPct: number;
}

/** The groups the filing names, with their summed stake after the listing, largest first. */
export function groupLines(holders: readonly Holder[]): GroupLine[] {
  return groupStakes(holders).map((group) => ({
    group: group.group,
    members: group.holderIds.length,
    stakeAfterPct: Number(group.stakeAfterPct.toFixed(4)),
  }));
}

export { holdersInFilingOrder };
