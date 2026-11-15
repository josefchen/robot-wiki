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
  Product,
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
  formatUsdPrice,
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

/** The lowest and highest list price in US dollars across the priced products. */
export function priceRange(profile: CompanyProfile): { low: number; high: number } {
  const prices = profile.products.flatMap((product) => (product.priceUsd === null ? [] : [product.priceUsd]));
  if (prices.length === 0) throw new Error(`${profile.slug}: no priced product`);
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

/** The latest year the units table covers, with each line's units sold that year, most first. */
export function latestUnitsSold(profile: CompanyProfile): { year: number; lines: Array<{ line: ProductLine; sold: number }> } {
  const year = Math.max(...profile.units.map((row) => row.year));
  const lines = profile.units
    .filter((row) => row.year === year)
    .map((row) => ({ line: row.line, sold: row.sold }))
    .sort((a, b) => b.sold - a.sold);
  return { year, lines };
}

/** The full calendar year's results period, e.g. fy2025. */
export function calendarYearPeriod(profile: CompanyProfile, year: number): FinancialPeriod {
  const period = profile.financials.find((row) => row.start === `${year}-01-01` && row.end === `${year}-12-31`);
  if (!period) throw new Error(`${profile.slug}: no results for ${year}`);
  return period;
}

/** The kind of thing each product type is, in the plural the page's sentences use. */
const PRODUCT_KINDS: Record<Product['type'], string> = {
  humanoid: 'robots',
  'wheeled humanoid': 'robots',
  'dual-arm': 'robots',
  quadruped: 'robots',
  'wheeled quadruped': 'robots',
  arm: 'arms',
  gripper: 'grippers',
  hand: 'hands',
  lidar: 'lidars',
};

/** The kinds the product rows are, from their types, in row order without repeats. */
export function productKinds(profile: CompanyProfile): string[] {
  return [...new Set(profile.products.map((product) => PRODUCT_KINDS[product.type]))];
}

/**
 * The header's lead, without its closing date: the latest full year's units
 * and total revenue from the listing documents, then what this page's product
 * rows are, which the date dates. The count is the page's, not the company's:
 * the shop sells parts and accessories that are not rows.
 */
export function profileLead(profile: CompanyProfile): string {
  const counts = profilePageCounts(profile);
  const prices = priceCounts(profile);
  const range = priceRange(profile);
  const units = latestUnitsSold(profile);
  const period = calendarYearPeriod(profile, units.year);
  const sold = joinList(units.lines.map((row) => `${formatCount(row.sold)} ${row.line}s`));
  return (
    `${possessive(profile.company.name)} listing documents report ${units.year} sales of ${sold} and total revenue of ` +
    `${unbroken(periodMoney(period, period.revenue))}; this page lists ${counts.products} of the company’s ` +
    `${joinList(productKinds(profile))}, ${prices.priced} of them with a list price from ` +
    `${unbroken(formatUsdPrice(range.low))} to ${unbroken(formatUsdPrice(range.high))}`
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

/** An amount kept on one line: "CNY 1,699.27 m" and "USD 249" never wrap inside. */
export function unbroken(amount: string): string {
  return amount.replaceAll(' ', '\u00a0');
}

/** "Unitree Robotics’", "Unitree’s", with the page's curly apostrophe. */
export function possessive(name: string): string {
  return name.endsWith('s') ? `${name}’` : `${name}’s`;
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
      `The rows are ${joinList(productKinds(profile))}; parts and accessories such as motors, batteries and chargers ` +
      `are not listed. Of the ${counts.products} rows, ${prices.priced} carry a list price in US dollars from the ` +
      `maker’s shop or product page, ${prices.contactSales} are quoted on request and ${prices.notDisclosed} have no ` +
      'published price.',
    money: `Results from the ${joinList(documentNames(profile.financials))}, in millions of yuan.`,
    timeline:
      `${counts.events} events, newest first. Each United States restriction carries the company’s reply ` +
      'or says it made none.',
    'software-and-data': `${counts.software} repositories, models, datasets and collections, each with the license its host reports.`,
    security: `${counts.security} records naming ${counts.cves} CVEs, newest first, with the company’s reply where one applies.`,
  };
}

/** The shareholders table's lead: how many of the filing's rows it keeps. */
export function holdersLead(profile: CompanyProfile): string {
  const counts = profilePageCounts(profile);
  return (
    `${counts.holders} of the ${counts.holderTableRows} rows in the ${sourceLabel(profile.listing.holderTableRows)}’s ` +
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

/**
 * Decimals per kind of percentage, as the filings print them: shares of
 * revenue and votes to two, shareholdings to four. A column keeps one
 * precision so its figures line up.
 */
export const PCT_DIGITS = { share: 2, votes: 2, stake: 4 } as const;

/** A percentage stored in percent at its column's fixed precision, e.g. 13.3 → "13.30%". */
export function formatStoredPct(value: number, kind: keyof typeof PCT_DIGITS): string {
  return `${value.toFixed(PCT_DIGITS[kind])}%`;
}

/** A filing's vehicle name with "No. 1" kept on one line. */
export function holderName(name: string): string {
  return name.replace(/\bNo\. (?=\d)/g, 'No.\u00a0');
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

/** Publishers whose data endpoints a source can point at, by registrable domain. */
const API_PUBLISHERS: Record<string, string> = {
  'eastmoney.com': 'Eastmoney',
  'github.com': 'GitHub',
  'huggingface.co': 'Hugging Face',
};

/** A machine endpoint ("api.github.com", ".../api/qt/..."), whose address names no page a reader opens. */
function isApiEndpoint(url: URL): boolean {
  return url.hostname.startsWith('api.') || url.pathname.startsWith('/api/');
}

/**
 * The short name a source link shows: the publisher or document the title
 * names in its last parenthesis ("final prospectus", "Boschko Security
 * Blog"), else the host. A parenthesis that is one lowercase word
 * ("unadjusted") qualifies the title and names nothing, so the host is used.
 * A data endpoint shows its publisher's name in place of its address.
 */
export function sourceLabel(source: Pick<ProfileSource, 'sourceUrl' | 'sourceTitle'>): string {
  const groups = [...source.sourceTitle.matchAll(/\(([^()]+)\)/g)];
  const last = groups.at(-1)?.[1];
  const name = last?.split(/[,;]/)[0]?.trim();
  if (name && /[A-Z\s]/.test(name)) return name;
  const url = new URL(source.sourceUrl);
  if (isApiEndpoint(url)) {
    const domain = url.hostname.split('.').slice(-2).join('.');
    const publisher = API_PUBLISHERS[domain];
    if (!publisher) throw new Error(`${source.sourceUrl}: a data endpoint with no publisher name`);
    return publisher;
  }
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
  /** basis: what revenue the margin is a share of, null when none is disclosed. */
  margin: { text: string; basis: string | null; computed: boolean };
  /** The period's notes, the one-off charge first with its amount. */
  notes: string[];
}

function periodMoney(period: FinancialPeriod, amount: number): string {
  return formatCny({ amount, unit: period.unit });
}

const MARGIN_BASIS: Record<'main business' | 'computed on total revenue', string> = {
  'main business': 'on main business',
  'computed on total revenue': 'on total revenue',
};

/**
 * Whether a period's note is about a figure the results table prints. The
 * table prints amounts and margins, not growth rates, so a note that explains
 * a growth rate would explain nothing on the row and is left off it.
 */
export function noteIsAboutShownFigure(note: string): boolean {
  return !/\bgrowth\b/i.test(note);
}

/**
 * The results table: every stored period in CNY millions, oldest first as
 * filed. A period's note that names its one-off charge is replaced by the
 * sentence that gives the charge's amount, so the row says it once; a note
 * about a figure the row does not show is left off.
 */
export function resultsRows(profile: CompanyProfile): ResultsRow[] {
  return profile.financials.map((period) => {
    const margin = grossMargin(period);
    const charge = period.oneOffCharge;
    const notes = [
      ...(charge
        ? [`Net profit is after a one-off ${charge.label} charge of ${periodMoney(period, charge.amount)}.`]
        : []),
      ...(period.note && noteIsAboutShownFigure(period.note) && !(charge && period.note.includes(charge.label))
        ? [period.note]
        : []),
    ];
    return {
      period,
      revenue: periodMoney(period, period.revenue),
      netProfit: periodMoney(period, period.netProfit),
      adjustedNetProfit: periodMoney(period, period.adjustedNetProfit),
      margin:
        margin === NOT_DISCLOSED
          ? { text: absentWithNoun(NOT_DISCLOSED, 'margin'), basis: null, computed: false }
          : {
              text: `${margin.pct.toFixed(2)}%`,
              basis: MARGIN_BASIS[margin.basis],
              computed: margin.basis === 'computed on total revenue',
            },
      notes,
    };
  });
}

// ── Mark notes ────────────────────────────────────────────────────────────

/** The note under a table whose rows carry the reported mark. True of figures and events alike. */
export const REPORTED_NOTE =
  'marks a source that is a press report or a market-data feed, not a filing or a page of the company, maker or researcher the row is about.';

/** The note under the results table: what the computed margins are worked out from. */
export function resultsComputedNote(profile: CompanyProfile): string | null {
  const periods = resultsRows(profile).filter((row) => row.margin.computed).map((row) => row.period);
  if (periods.length === 0) return null;
  return (
    `marks revenue less cost of sales, over revenue, from the ` +
    `${joinList(documentNames(periods))}, which states no margin.`
  );
}

export const LINES_COMPUTED_NOTE = 'marks the line’s revenue divided by its units sold.';

/** The note under the listing table: each computed fact with what it is worked out from. */
export function listingComputedNote(profile: CompanyProfile): string {
  const derivations = listingFacts(profile).flatMap((fact) => (fact.derivation ? [fact.derivation] : []));
  return `marks a figure derived from the rows above: ${joinList(derivations)}.`;
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

/**
 * The market table's column heads. Domestic and overseas split main-business
 * revenue, as the prospectus's market table does; the United States share
 * keeps the note that says its basis is not stated.
 */
export const REGION_COLUMNS = {
  domestic: 'Domestic, of main business',
  overseas: 'Overseas, of main business',
  us: 'United States',
} as const;

/** Domestic and overseas shares of main-business revenue and the United States share, by year, newest first. */
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
  /** A figure computed from other rows of the table, not filed. */
  computed?: boolean;
  /** For a computed figure, what it is computed from. */
  derivation?: string;
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
      derivation: 'net proceeds less the planned raise',
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
      derivation: 'the first-day close against the offer price',
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
      derivation: 'the latest close times the shares after listing',
      source: listing.latestClose,
    },
    {
      id: 'class-a',
      label: `${possessive(holder.nameEn)} class A shares`,
      value: `${formatCount(control.classAShares.value)}, ${control.votesPerClassAShare.value} votes each`,
      source: control.classAShares,
    },
    {
      id: 'votes-direct',
      label: `${possessive(holder.nameEn)} votes after listing, direct`,
      value: formatStoredPct(control.directVotesAfterPct.value, 'votes'),
      source: control.directVotesAfterPct,
    },
    {
      id: 'votes-with-platform',
      label: `${possessive(holder.nameEn)} votes after listing, with the staff platform`,
      value: formatStoredPct(control.withPlatformVotesAfterPct.value, 'votes'),
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
