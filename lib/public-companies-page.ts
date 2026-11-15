/**
 * What the public robotics companies page (/market-map/public/) prints: its
 * sections, the lead, the rates it converts with, and the text of every table
 * cell. Every number comes from data/public-companies.ts through
 * lib/public-companies.ts and the rates in data/fx-rates.ts; nothing here is
 * typed by hand.
 *
 * Tested in tests/unit/public-companies-page.test.ts.
 */
import {
  EUR_REFERENCE_RATES,
  FX_RATES_DATE,
  TWD_PER_USD,
  TWD_RATE_DATE,
} from '@/data/fx-rates.ts';
import {
  DEBUTS,
  IPO_WATCH,
  LEFT_OUT_COMPANIES,
  PUBLIC_COMPANIES,
  PUBLIC_COMPANIES_AS_OF,
  type Debut,
  type IpoStatus,
  type IpoWatchRow,
  type LeftOutCompany,
  type ListingCurrency,
  type PublicCompany,
} from '@/data/public-companies.ts';
import { formatLongDate } from '@/lib/dates.ts';
import { formatShortDate } from '@/lib/market-map.ts';
import {
  PUBLIC_SEGMENT_LABELS,
  debutGrossProceeds,
  exposureCounts,
  roboticsSharePercent,
  sinceListingChange,
  toUsd,
  type EurReferenceRates,
} from '@/lib/public-companies.ts';

export const PUBLIC_PAGE_PATH = '/market-map/public/';
export const PUBLIC_PAGE_TITLE = 'Public robotics companies';

/** The page's sections in reading order; each id is a heading's anchor. */
export const PUBLIC_PAGE_SECTIONS = [
  { id: 'listed-companies', label: 'Listed companies' },
  { id: 'ipo-watch', label: 'IPO watch' },
  { id: 'since-listing', label: 'Since listing' },
] as const;

export type PublicPageSectionId = (typeof PUBLIC_PAGE_SECTIONS)[number]['id'];

/**
 * The page's rates, units per 1 EUR: the ECB's for every currency it
 * publishes, and the Federal Reserve's TWD per USD crossed through the ECB's
 * USD rate, so a TWD amount converts at exactly the Fed's rate.
 */
export const PAGE_RATES: EurReferenceRates = {
  ...EUR_REFERENCE_RATES,
  TWD: TWD_PER_USD * EUR_REFERENCE_RATES.USD,
};

/** Country names for the ISO codes the listed rows use. */
export const COUNTRY_NAMES: Readonly<Record<string, string>> = {
  AU: 'Australia',
  CA: 'Canada',
  CH: 'Switzerland',
  CN: 'China',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IL: 'Israel',
  IN: 'India',
  JP: 'Japan',
  KR: 'South Korea',
  NO: 'Norway',
  NZ: 'New Zealand',
  SE: 'Sweden',
  SG: 'Singapore',
  TW: 'Taiwan',
  US: 'United States',
};

export function countryName(code: string): string {
  const name = COUNTRY_NAMES[code];
  if (!name) throw new Error(`no country name for ${code}`);
  return name;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Up to three significant figures, trailing zeros dropped: 153.77 -> "154", 5.12 -> "5.12". */
function significant(value: number): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return String(Number(value.toFixed(digits)));
}

const SCALES: readonly [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** The host a source sits on, without "www.": what a reader sees before following it. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\d?\./, '');
}

/** A large amount in its own currency: "$154B", "JPY 5.12T", "HKD 710M". */
export function formatMoney(amount: number, currency: ListingCurrency): string {
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  for (const [scale, suffix] of SCALES) {
    if (amount >= scale) return `${prefix}${significant(amount / scale)}${suffix}`;
  }
  return `${prefix}${significant(amount)}`;
}

/** A share price as written, with grouping: "HKD 43.24", "HKD 8.635", "KRW 17,600", "$5". */
export function formatPrice(price: number, currency: ListingCurrency): string {
  // HKEX prints some closes to three decimals (Galaxis, 8.635); rounding them would change the figure.
  const text = price.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return currency === 'USD' ? `$${text}` : `${currency} ${text}`;
}

/** A change as a signed percent with one decimal and a true minus sign. */
export function formatChange(change: number): string {
  const percent = (Math.abs(change) * 100).toFixed(1);
  return `${change < 0 ? '−' : '+'}${percent}%`;
}

/** "13 Sep 2026" for a day, "Oct 2026" for a month-only date. */
export function formatWatchDate(date: string): string {
  if (/^\d{4}-\d{2}$/.test(date)) return formatShortDate(`${date}-01`).replace(/^1 /, '');
  return formatShortDate(date);
}

/** Companies on the IPO watch, the ABB Robotics sale left out: it is not a listing. */
export function ipoWatchCompanies(): IpoWatchRow[] {
  return IPO_WATCH.filter((row) => row.status !== 'not an IPO');
}

/** The lead under the title, without its closing words: the header adds the date. */
export function publicLeadSentence(): string {
  return (
    `${PUBLIC_COMPANIES.length} listed robotics companies by market value, ` +
    `the ${DEBUTS.length} debuts of 2026 and ${count(ipoWatchCompanies().length,'company', 'companies')} on the IPO watch`
  );
}

export function publicPageDescription(): string {
  return (
    `Public robotics companies: ${PUBLIC_COMPANIES.length} listed companies by market value, ` +
    `the ${DEBUTS.length} debuts of 2026 against their offer price, and who is preparing to list.`
  );
}

/** The listed table's conversion note, with each rate's date. */
export function conversionNote(): string {
  return (
    `Sorted by market value in US dollars, converted at the European Central Bank's reference rates of ` +
    `${formatLongDate(FX_RATES_DATE)}; Taiwan dollars at the Federal Reserve's H.10 rate of ` +
    `${formatLongDate(TWD_RATE_DATE)}.`
  );
}

export interface ExposureText {
  /** The class: "pure play", "major part" or "minor part". */
  label: string;
  /** What the class rests on, in one line. */
  detail: string;
  /** The exposure source is a report, not a filing. */
  reported: boolean;
}

function shareText(company: PublicCompany): string | null {
  const share = company.roboticsShare;
  if (!share) return null;
  const percent = roboticsSharePercent(company);
  if (percent !== null) {
    const written = share.filedPercent !== null ? String(share.filedPercent) : percent.toFixed(1);
    return `${share.line}: ${share.approximate ? 'about ' : ''}${written}% of revenue, ${share.period}`;
  }
  if (share.lineRevenue !== null) {
    return `${share.line}: ${formatMoney(share.lineRevenue, share.currency)} revenue, ${share.period}`;
  }
  return `${share.line}, ${share.period}`;
}

export function exposureText(company: PublicCompany): ExposureText {
  const share = shareText(company);
  const detail =
    share ??
    {
      'filed share': 'filed share',
      'computed from filed figures': 'filed figures',
      'filing without a share': 'named in a filing; no share given',
      'business description': 'company profile',
      judgement: 'judgement; see the note',
    }[company.exposureBasis];
  return { label: company.exposure, detail, reported: company.exposureSource?.type === 'reported' };
}

export interface ListedRow {
  company: PublicCompany;
  usd: number;
  segment: string;
  country: string;
  /** Market value in the listing currency. */
  value: string;
  /** The same in US dollars, or null for a dollar listing. */
  valueUsd: string | null;
  exposure: ExposureText;
}

/** Every listed company, largest market value in US dollars first, ties by name. */
export function listedRows(
  rates: EurReferenceRates = PAGE_RATES,
  companies: readonly PublicCompany[] = PUBLIC_COMPANIES,
): ListedRow[] {
  return companies
    .map((company) => {
      const usd = toUsd(company.marketCap, company.currency, rates);
      return {
        company,
        usd,
        segment: PUBLIC_SEGMENT_LABELS[company.segment],
        country: countryName(company.country),
        value: formatMoney(company.marketCap, company.currency),
        valueUsd: company.currency === 'USD' ? null : formatMoney(usd, 'USD'),
        exposure: exposureText(company),
      };
    })
    .sort((a, b) => b.usd - a.usd || a.company.name.localeCompare(b.company.name));
}

/** The companies kept off the list, by name. */
export function leftOutRows(rows: readonly LeftOutCompany[] = LEFT_OUT_COMPANIES): LeftOutCompany[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

/** IPO watch order: nearest to a listing first, the ABB Robotics sale last. */
export const IPO_STATUS_ORDER: readonly IpoStatus[] = [
  'priced',
  'filed',
  'accepted',
  'postponed',
  'paused',
  'reported only',
  'not an IPO',
];

export interface IpoText {
  row: IpoWatchRow;
  date: string;
  /** What the date marks: "filed", "accepted", "listing" and so on. */
  dateKind: string | null;
  amount: string;
  /** What the amount is: "raised", "sought", "offering" or "new shares". */
  amountKind: string | null;
  /** The offer price and its kind, when one is set. */
  price: string | null;
  valuation: string;
  reported: boolean;
}

function watchCurrency(row: IpoWatchRow): ListingCurrency {
  if (!row.currency) throw new Error(`${row.id}: an amount needs its currency`);
  return row.currency;
}

export function ipoText(row: IpoWatchRow): IpoText {
  // A sale and a direct listing raise nothing, so their amounts do not apply.
  const none = row.status === 'not an IPO' || /direct listing/i.test(row.filingType) ? 'n/a' : 'not disclosed';
  const raised = row.amount && row.amount.kind !== 'valuation' ? row.amount : null;
  const valuation = row.amount?.kind === 'valuation' ? row.amount : null;
  let amount = none;
  let amountKind: string | null = null;
  if (raised) {
    amount = formatMoney(raised.value, watchCurrency(row));
    amountKind = raised.kind;
  } else if (row.offerShares) {
    amount = row.offerShares.toLocaleString('en-US');
    amountKind = 'new shares';
  }
  return {
    row,
    date: row.date ? formatWatchDate(row.date) : 'not disclosed',
    dateKind: row.date ? row.dateKind : null,
    amount,
    amountKind,
    price: row.offerPrice
      ? `${formatPrice(row.offerPrice.value, watchCurrency(row))} a share, ${row.offerPrice.kind}`
      : null,
    valuation: valuation ? formatMoney(valuation.value, watchCurrency(row)) : none,
    reported: row.source.type === 'reported',
  };
}

/** The IPO watch in IPO_STATUS_ORDER, newest date first within a status, undated last. */
export function ipoRows(rows: readonly IpoWatchRow[] = IPO_WATCH): IpoText[] {
  const rank = (row: IpoWatchRow) => IPO_STATUS_ORDER.indexOf(row.status);
  return [...rows]
    .sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.date === b.date) return a.name.localeCompare(b.name);
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return a.date < b.date ? 1 : -1;
    })
    .map(ipoText);
}

export interface DebutText {
  debut: Debut;
  listed: string;
  offer: string;
  close: string;
  change: number | null;
  changeText: string;
  raised: string;
  /** How the amount raised was arrived at, when the source qualifies it. */
  raisedKind: string | null;
  reported: boolean;
}

const RAISED_KIND: Record<string, string | null> = {
  'hkex lines': 'HKEX, both lines',
  'price times shares': 'offer price times shares',
  final: null,
  expected: 'expected',
  reported: null,
  'total capital': 'total capital',
};

/** Who publishes each close, by the host of the row's close link. */
const CLOSE_SOURCES: Readonly<Record<string, { name: string; reported: boolean }>> = {
  'hkex.com.hk': { name: 'HKEX daily quotations', reported: false },
  'yunhq.sse.com.cn': { name: 'SSE quotation server', reported: false },
  'api.nasdaq.com': { name: 'Nasdaq historical data', reported: false },
  'stockanalysis.com': { name: 'Stock Analysis quote page', reported: true },
};

export function closeSource(close: NonNullable<Debut['close']>): { name: string; reported: boolean } {
  const source = CLOSE_SOURCES[sourceHost(close.url)];
  if (!source) throw new Error(`no close source named for ${close.url}`);
  return source;
}

/** The since-listing caption's first sentence: where the closes come from, with a count each. */
export function closesCaption(debuts: readonly Debut[] = DEBUTS): string {
  const parts = Object.values(CLOSE_SOURCES)
    .map((source) => {
      const n = debuts.filter((d) => d.close && closeSource(d.close).name === source.name).length;
      return n ? `${source.name}, ${n}${source.reported ? ' (reported)' : ''}` : null;
    })
    .filter((part): part is string => part !== null);
  return `Closes, linked in each row: ${parts.join('; ')}.`;
}

/** A debut that trades but has no close in the module: the close exists, the data lacks it. */
export const NO_CLOSE = 'no close in the data';

export function debutText(debut: Debut): DebutText {
  const change = sinceListingChange(debut);
  const gross = debutGrossProceeds(debut);
  const proceeds = debut.proceeds;
  const offer =
    debut.offerPrice === null
      ? 'n/a'
      : `${formatPrice(debut.offerPrice, debut.currency)}${debut.offerPriceB ? ` and ${formatPrice(debut.offerPriceB, debut.currency)}` : ''}`;
  return {
    debut,
    listed: debut.listingDate ? formatShortDate(debut.listingDate) : 'not disclosed',
    offer,
    close: debut.close ? formatPrice(debut.close.price, debut.currency) : NO_CLOSE,
    change,
    // A merger has no offer price, so no change applies; a missing close is the data's gap.
    changeText: change !== null ? formatChange(change) : debut.offerPrice === null ? 'n/a' : NO_CLOSE,
    raised: gross === null ? 'not disclosed' : formatMoney(gross, debut.currency),
    raisedKind: proceeds ? RAISED_KIND[proceeds.kind === 'stated' ? proceeds.qualifier : proceeds.kind] : null,
    reported: debut.source.type === 'reported',
  };
}

/** The debuts with a change first, best first; then those without one, newest listing first. */
export function debutRows(debuts: readonly Debut[] = DEBUTS): DebutText[] {
  return debuts.map(debutText).sort((a, b) => {
    if (a.change !== null && b.change !== null) return b.change - a.change;
    if (a.change !== null) return -1;
    if (b.change !== null) return 1;
    return (b.debut.listingDate ?? '').localeCompare(a.debut.listingDate ?? '');
  });
}

export interface DebutTally {
  above: number;
  below: number;
  /** Listed by merger: no offer price, so no change applies. */
  noOffer: string[];
  /** An offer price, but no close in the module to compare with it. */
  noClose: string[];
}

/** Debuts trading above and below their offer price, and those without a change, by name. */
export function debutTally(rows: readonly DebutText[] = debutRows()): DebutTally {
  const tally: DebutTally = { above: 0, below: 0, noOffer: [], noClose: [] };
  for (const { debut, change } of rows) {
    if (change !== null) {
      if (change > 0) tally.above += 1;
      else if (change < 0) tally.below += 1;
    } else if (debut.offerPrice === null) tally.noOffer.push(debut.name);
    else tally.noClose.push(debut.name);
  }
  return tally;
}

function names(list: readonly string[]): string {
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list.join('');
}

export function sinceListingLead(rows: readonly DebutText[] = debutRows()): string {
  const { above, below, noOffer, noClose } = debutTally(rows);
  const gaps = [
    noOffer.length ? `${names(noOffer)} listed by merger, with no offer price` : null,
    noClose.length ? `the data has no close for ${names(noClose)}` : null,
  ].filter(Boolean);
  return (
    `Of the ${rows.length} debuts of 2026, ${above} trade above their offer price and ${below} below it ` +
    `at the close of ${formatLongDate(PUBLIC_COMPANIES_AS_OF)}.` +
    (gaps.length ? ` ${gaps.join('; ').replace(/^./, (c) => c.toUpperCase())}.` : '')
  );
}

/** The listed table's lead: how many companies of each class. */
export function listedLead(companies: readonly PublicCompany[] = PUBLIC_COMPANIES): string {
  const counts = exposureCounts(companies);
  return (
    `${counts['pure play']} pure plays, ${counts['major part']} companies where robots are a major part ` +
    `and ${counts['minor part']} where they are a minor part, largest first.`
  );
}

export function leftOutLead(rows: readonly LeftOutCompany[] = LEFT_OUT_COMPANIES): string {
  return (
    `${count(rows.length, 'listed company', 'listed companies')} kept off the list: ` +
    'robots are neither the business nor a named, reported part of it.'
  );
}

/** The left-out sources as they are: which Stock Analysis page backs how many rows. */
export function leftOutCaption(rows: readonly LeftOutCompany[] = LEFT_OUT_COMPANIES): string {
  const page = (row: LeftOutCompany) => {
    const url = new URL(row.source.url);
    if (sourceHost(row.source.url) !== 'stockanalysis.com') throw new Error(`${row.id}: source is not Stock Analysis`);
    if (url.pathname.endsWith('/company/')) return 'profile';
    if (url.pathname.endsWith('/market-cap/')) return 'value';
    throw new Error(`${row.id}: source is neither a profile nor a market value page`);
  };
  const profiles = rows.filter((row) => page(row) === 'profile').length;
  const values = rows.length - profiles;
  const parts = [
    profiles ? `the company profile for ${profiles}` : null,
    values ? `the market value page for ${values}` : null,
  ].filter(Boolean);
  const reported = rows.every((row) => row.source.type === 'reported') ? ' (reported)' : '';
  return `Sources: Stock Analysis, ${parts.join(' and ')}${reported}.`;
}

/** The IPO watch lead: how many companies at each status, in table order. */
export function ipoWatchLead(rows: readonly IpoWatchRow[] = IPO_WATCH): string {
  const companies = rows.filter((row) => row.status !== 'not an IPO');
  const parts = IPO_STATUS_ORDER.filter((status) => status !== 'not an IPO')
    .map((status) => [status, companies.filter((row) => row.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${n} ${status}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join('');
  const sales = rows.filter((row) => row.status === 'not an IPO').map((row) => row.name);
  const context = sales.length
    ? ` The ${sales.join(' and ')} sale${sales.length > 1 ? 's close' : ' closes'} the table as context: not an IPO.`
    : '';
  return `${count(companies.length, 'company', 'companies')} heading to market, nearest first: ${list}.${context}`;
}
