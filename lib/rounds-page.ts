/**
 * What the recent funding rounds page (/market-map/rounds/) prints beyond the
 * figure: its sections, the headline totals, the coverage bands, the month
 * row, table cell text and the tracker lines. Every number comes from
 * data/rounds.ts through lib/rounds.ts; nothing here is typed by hand except
 * the two coverage thresholds below.
 *
 * Tested in tests/unit/rounds-page.test.ts.
 */
import {
  MARKET_CONTEXT,
  ROUNDS_AS_OF,
  type CorporateEvent,
  type FundingEvent,
  type MarketContext,
  type RoundStatus,
} from '@/data/rounds.ts';
import { formatLongDate } from '@/lib/dates.ts';
import { formatShortDate, formatUsd } from '@/lib/market-map.ts';
import {
  amountUsd,
  closedRoundsInWindow,
  countsByStatus,
  formatMoney,
  leadInvestorCounts,
  monthUnconfirmedRounds,
  reportedSourceCount,
  roundsInWindow,
  ROUNDS_WINDOW_DAYS,
  totalRaisedUsd,
  totalsByMonth,
  ukAndEuropeRounds,
  windowStart,
} from '@/lib/rounds.ts';
import { listText } from '@/lib/rounds-figure.ts';

export const ROUNDS_PAGE_PATH = '/market-map/rounds/';
export const ROUNDS_PAGE_TITLE = 'Recent funding rounds';

/** The page's sections in reading order; each id is a heading's anchor. */
export const ROUNDS_PAGE_SECTIONS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'by-month', label: 'By month' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'listings-and-exits', label: 'Listings, acquisitions and shutdowns' },
  { id: 'investors', label: 'Who is investing' },
  { id: 'uk-europe', label: 'United Kingdom and Europe' },
] as const;

export type RoundsPageSectionId = (typeof ROUNDS_PAGE_SECTIONS)[number]['id'];

/**
 * Where the list stops being close to complete: above `nearComplete` it is
 * close to complete outside China; from `regional` to `nearComplete` it is
 * good for the United States and Europe and thin for China; below `regional`
 * it holds examples.
 */
export const COVERAGE_THRESHOLDS_USD = { nearComplete: 100_000_000, regional: 50_000_000 } as const;

/** The two tracker counts the totals section closes with, by MARKET_CONTEXT key. */
export const CONTEXT_KEYS = ['trr-august-2026-total', 'cn-embodied-deals-sep-oct-2026'] as const;

/** The id of a rounds-table row; investor links point at it. */
export function roundAnchor(key: string): string {
  return `round-${key}`;
}

/** The page's money format for totals: one decimal in billions, whole millions below. */
export function formatTotalUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return formatUsd(value);
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The lead sentence under the title, without its full stop: the shared page
 * header closes it on the as-of date.
 */
export function roundsLeadSentence(): string {
  return (
    `Robotics funding rounds, listings, acquisitions and shutdowns over the last ${ROUNDS_WINDOW_DAYS} days, ` +
    'each linked to its source'
  );
}

export interface HeadlineFacts {
  strictUsd: number;
  fullUsd: number;
  closed: number;
  closedStrict: number;
  /** Closed rounds in the window marked borderline robotics. */
  borderline: number;
  reported: number;
  start: string;
  end: string;
}

export function headlineFacts(): HeadlineFacts {
  const closed = closedRoundsInWindow().length;
  const closedStrict = closedRoundsInWindow({ strict: true }).length;
  return {
    strictUsd: totalRaisedUsd({ strict: true }),
    fullUsd: totalRaisedUsd(),
    closed,
    closedStrict,
    borderline: closed - closedStrict,
    reported: reportedSourceCount(),
    start: windowStart(),
    end: ROUNDS_AS_OF,
  };
}

/** The lines beside and under the two totals. */
export function headlineText(facts: HeadlineFacts = headlineFacts()): {
  strict: string;
  full: string;
  reported: string;
} {
  // A date never breaks across lines under a total.
  const date = (iso: string) => formatLongDate(iso).replace(/ /g, ' ');
  return {
    strict: `raised in ${count(facts.closedStrict, 'closed round', 'closed rounds')} from ${date(facts.start)} to ${date(facts.end)}`,
    full: `with the ${count(facts.borderline, 'closed round', 'closed rounds')} marked borderline robotics`,
    reported: `${facts.reported} of the ${facts.closed} closed rounds rest on a press or newsletter report, not on the company, an investor or a filing.`,
  };
}

/** How complete the list is at each amount band; one paragraph. */
export function coverageText(): string {
  const high = formatUsd(COVERAGE_THRESHOLDS_USD.nearComplete);
  const mid = formatUsd(COVERAGE_THRESHOLDS_USD.regional);
  return (
    `Above ${high} the list is close to complete outside China. From ${mid} to ${high} it is good for ` +
    `the United States and Europe and thin for China; below ${mid} it shows examples, not totals. ` +
    'Every total on this page is the sum of the rounds listed.'
  );
}

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthCell {
  month: string;
  name: string;
  /** "from 17 July" or "to 14 November" for a month the window cuts; null for a whole month. */
  span: string | null;
  usd: number;
  rounds: number;
}

/** One cell per calendar month the window touches, oldest first, borderline rows left out. */
export function monthCells(): MonthCell[] {
  const start = windowStart();
  return totalsByMonth({ strict: true }).map(({ month, usd, rounds }) => {
    const [y, m] = month.split('-').map(Number);
    const name = `${MONTH_LONG[m - 1]} ${y}`;
    let span: string | null = null;
    if (month === start.slice(0, 7) && !start.endsWith('-01')) {
      span = `from ${formatLongDate(start).replace(/ \d{4}$/, '')}`;
    } else if (month === ROUNDS_AS_OF.slice(0, 7)) {
      span = `to ${formatLongDate(ROUNDS_AS_OF).replace(/ \d{4}$/, '')}`;
    }
    return { month, name, span, usd, rounds };
  });
}

/** A record's date as its precision allows: "12 Nov 2026", "Jul 2026" or "2026". */
export function eventDateText(event: Pick<FundingEvent, 'date' | 'datePrecision'>): string {
  if (event.datePrecision === 'day') return formatShortDate(event.date);
  if (event.datePrecision === 'month') return formatShortDate(`${event.date}-01`).replace(/^1 /, '');
  return event.date;
}

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

/** Codes whose standard English name is longer than a place line needs. */
const SHORT_REGION_NAMES: Readonly<Record<string, string>> = { HK: 'Hong Kong' };

/** "United Kingdom" for "GB"; anything that is not a two-letter code passes through. */
export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  return SHORT_REGION_NAMES[code] ?? REGION_NAMES.of(code) ?? code;
}

const NOT_DISCLOSED = 'not disclosed';

/**
 * "Munich, Germany", "Germany", or "not disclosed" when neither is known. A
 * city that is its own country (Singapore, Hong Kong) is named once.
 */
export function placeText(city: string, country: string): string {
  const parts = [...new Set([city, countryName(country)])].filter((p) => p !== NOT_DISCLOSED);
  return parts.length > 0 ? parts.join(', ') : NOT_DISCLOSED;
}

export interface AmountText {
  /** As announced: "EUR 27M", "over $27M", "about CNY 6.1B"; "not disclosed" or "n/a". */
  own: string;
  /** The US dollar conversion when the currency is not USD, else null. */
  usd: string | null;
}

/** An amount in its own currency with the USD conversion beside it when that differs. */
export function amountText(
  event: Pick<FundingEvent, 'currency' | 'amountIsFloor' | 'amountIsApproximate'> & {
    amount: FundingEvent['amount'] | CorporateEvent['amount'];
  },
): AmountText {
  if (typeof event.amount !== 'number') return { own: event.amount, usd: null };
  const prefix = event.amountIsFloor ? 'over ' : event.amountIsApproximate ? 'about ' : '';
  const own = `${prefix}${formatMoney(event.amount, event.currency)}`;
  const usd =
    event.currency === 'USD' ? null : `${prefix}${formatUsd(amountUsd({ amount: event.amount, currency: event.currency })!)}`;
  return { own, usd };
}

/** The page's words for a corporate event. */
export function corporateEventText(event: CorporateEvent): string {
  if (event.kind === 'shutdown') return 'Shut down';
  if (event.kind === 'blocked') return `Purchase by ${event.acquirer} blocked`;
  return `Acquisition by ${event.acquirer}`;
}

/** The host a source sits on, without "www.": what a reader sees before following it. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** Lead investors as a phrase; "none named" when the source names none. */
export function leadsText(event: Pick<FundingEvent, 'leadInvestors'>): string {
  return event.leadInvestors.length > 0 ? event.leadInvestors.join(', ') : 'none named';
}

/** Newest first by date string, then by key; for the listings and corporate tables. */
export function byDateDesc<T extends { date: string; key: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.key.localeCompare(b.key)));
}

const STATUS_PHRASE: Record<RoundStatus, string> = {
  closed: 'closed',
  talks: 'in talks',
  unconfirmed: 'unconfirmed',
  announced: 'announced',
};

/** The rounds table's lead: how many rows, and how many of each status. */
export function roundsTableLead(): string {
  const rows = roundsInWindow();
  const counts = countsByStatus(rows);
  const parts = (Object.keys(STATUS_PHRASE) as RoundStatus[])
    .filter((status) => counts[status] > 0)
    .map((status) => `${counts[status]} ${STATUS_PHRASE[status]}`);
  return `${count(rows.length, 'round', 'rounds')} in the window, newest first: ${listText(parts)}.`;
}

/** The heading and sentence over the month-only rows that may predate the window. */
export function monthUnconfirmedText(): { heading: string; sentence: string } {
  const rows = monthUnconfirmedRounds();
  const months = [...new Set(rows.map((r) => r.date))].sort();
  const names = months.map((m) => {
    const [y, mo] = m.split('-').map(Number);
    return `${MONTH_LONG[mo - 1]} ${y}`;
  });
  return {
    heading: `Dated only to ${listText(names)}`,
    sentence:
      `These ${count(rows.length, 'round gives', 'rounds give')} only the month, so ${rows.length === 1 ? 'it' : 'they'} may predate ` +
      `${formatLongDate(windowStart())}, the window's first day. ${rows.length === 1 ? 'It is' : 'They are'} listed here and left out of every total.`,
  };
}

export interface InvestorRow {
  investor: string;
  rounds: number;
  companies: { key: string; company: string }[];
}

/** The fewest led or co-led rounds that put an investor in the table. */
export const INVESTOR_MIN_ROUNDS = 2;

export function investorsLead(): string {
  return (
    `Firms that led or co-led at least ${INVESTOR_MIN_ROUNDS} closed rounds in the window, counted only ` +
    "where the round's cited source names the lead."
  );
}

/** Investors with enough led or co-led closed rounds, each round resolved to its company. */
export function investorRows(minRounds = INVESTOR_MIN_ROUNDS): InvestorRow[] {
  const byKey = new Map(closedRoundsInWindow().map((r) => [r.key, r]));
  return leadInvestorCounts({ minRounds }).map(({ investor, rounds, keys }) => ({
    investor,
    rounds,
    companies: keys.map((key) => {
      const round = byKey.get(key);
      if (!round) throw new Error(`${investor}: ${key} is not a closed round in the window`);
      return { key, company: round.company };
    }),
  }));
}

/** The UK and Europe section's lead: the count, and that it reaches back over 2026. */
export function ukEuropeLead(): string {
  const rows = ukAndEuropeRounds();
  const year = ROUNDS_AS_OF.slice(0, 4);
  return (
    `${count(rows.length, 'closed round', 'closed rounds')} from the United Kingdom and Europe across ${year}, ` +
    `reaching back before the ${ROUNDS_WINDOW_DAYS}-day window, newest first.`
  );
}

/** "In August 2026" or "From 1 October 2026 to 29 October 2026". */
function periodText(period: string): string {
  if (period.includes('/')) {
    const [from, to] = period.split('/');
    return `From ${formatLongDate(from)} to ${formatLongDate(to)}`;
  }
  const [y, m] = period.split('-').map(Number);
  return `In ${MONTH_LONG[m - 1]} ${y}`;
}

/** A tracker's first count as a sentence: when, who, what it counted, and the sum. */
export function contextSentence(context: MarketContext): string {
  const figure = context.figures[0];
  const deals = `${figure.dealsIsFloor ? 'over ' : ''}${figure.deals}`;
  const amount = `${figure.amountIsFloor ? 'over ' : ''}${formatMoney(figure.amount, figure.currency)}`;
  const publisher = context.publisher.includes(',') ? `${context.publisher},` : context.publisher;
  return `${periodText(figure.period)} ${publisher} counted ${deals} ${lowerFirst(context.scope)}, worth ${amount}.`;
}

/** The tracker counts the page prints, in CONTEXT_KEYS order. */
export function pageContext(): MarketContext[] {
  return CONTEXT_KEYS.map((key) => {
    const row = MARKET_CONTEXT.find((c) => c.key === key);
    if (!row) throw new Error(`MARKET_CONTEXT has no row ${key}`);
    return row;
  });
}
