/**
 * Window, conversion, totals and tallies for the funding rounds data
 * (data/rounds.ts). Pure functions; no React. Every number the rounds page
 * prints is computed here from the rows.
 *
 * Totals count `closed` rounds inside the window only. Talks, unconfirmed
 * closes, listings, acquisitions, the earlier 2026 rows and July rows dated
 * to the month (which may predate the window) never reach them.
 *
 * Tested in tests/unit/rounds.test.ts.
 */
import {
  ROUNDS,
  ROUNDS_AS_OF,
  UK_EUROPE_2026_EARLIER,
  type Currency,
  type FundingEvent,
  type RoundSector,
  type RoundStatus,
} from '@/data/rounds.ts';
import { EUR_REFERENCE_RATES } from '@/data/fx-rates.ts';
import { formatUsd, type MarketMapSegment } from '@/lib/market-map.ts';

export const ROUNDS_WINDOW_DAYS = 120;

export const SECTOR_ORDER = [
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
] as const satisfies readonly RoundSector[];

export const SECTOR_LABELS: Record<RoundSector, string> = {
  'foundation-models': 'Robot foundation models',
  humanoids: 'Humanoids',
  'factories-warehouses': 'Factories and warehouses',
  'simulation-data': 'Simulation and training data',
  'parts-chips': 'Parts, hands and chips',
  'drones-defense': 'Drones and defense',
  'construction-field': 'Construction and field machines',
  'surgical-medical': 'Surgical and medical',
  'lab-automation': 'Lab automation',
  'trucks-aircraft': 'Self-driving trucks and aircraft',
};

/** Each sector's market-map segment. */
export const SECTOR_SEGMENT: Record<RoundSector, MarketMapSegment> = {
  'foundation-models': 'foundation-models',
  humanoids: 'humanoids',
  'factories-warehouses': 'industrial-logistics',
  'simulation-data': 'simulation-tooling',
  'parts-chips': 'components-hardware',
  'drones-defense': 'vertical-applications',
  'construction-field': 'vertical-applications',
  'surgical-medical': 'vertical-applications',
  'lab-automation': 'vertical-applications',
  'trucks-aircraft': 'vertical-applications',
};

/** ISO country codes counted as Europe in the UK and Europe table. */
export const EUROPE_COUNTRIES: ReadonlySet<string> = new Set([
  'GB', 'DE', 'FR', 'CH', 'PT', 'ES', 'BE', 'NO', 'FI', 'IS', 'EE', 'LT', 'NL', 'SE', 'DK',
  'IT', 'IE', 'AT', 'PL', 'CZ', 'LV', 'LU', 'UA',
]);

/** Spellings of one investor that must count as one. Keys are variants; values are the name used. */
export const INVESTOR_ALIASES: Readonly<Record<string, string>> = {
  a16z: 'Andreessen Horowitz',
  'Andreessen Horowitz (a16z)': 'Andreessen Horowitz',
  SoftBank: 'SoftBank Group',
  'SoftBank Vision Fund': 'SoftBank Group',
  Sequoia: 'Sequoia Capital',
  Khosla: 'Khosla Ventures',
  Initialized: 'Initialized Capital',
  Balderton: 'Balderton Capital',
  Greylock: 'Greylock Partners',
  Valor: 'Valor Equity Partners',
};

export interface TotalsOptions {
  /** Leave out the rows marked borderline robotics. */
  strict?: boolean;
}

const DAY_MS = 86_400_000;

function parseIsoDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** First day of a window containing exactly `days` calendar dates, including `asOf`. */
export function windowStart(asOf: string = ROUNDS_AS_OF, days: number = ROUNDS_WINDOW_DAYS): string {
  return toIsoDay(parseIsoDay(asOf) - (days - 1) * DAY_MS);
}

/** First and last calendar day a record's date can mean. */
export function dateSpan(event: Pick<FundingEvent, 'date' | 'datePrecision'>): {
  first: string;
  last: string;
} {
  if (event.datePrecision === 'day') return { first: event.date, last: event.date };
  if (event.datePrecision === 'month') {
    const [y, m] = event.date.split('-').map(Number);
    return { first: `${event.date}-01`, last: toIsoDay(Date.UTC(y, m, 0)) };
  }
  return { first: `${event.date}-01-01`, last: `${event.date}-12-31` };
}

/**
 * Where a row sits on a time axis. Day rows sit on their day; a month-only row
 * on the 15th and a year-only row on 1 July, or on the as-of date when that
 * comes first, so no row plots after the data's last day.
 */
export function plotDate(
  event: Pick<FundingEvent, 'date' | 'datePrecision'>,
  asOf: string = ROUNDS_AS_OF,
): string {
  if (event.datePrecision === 'day') return event.date;
  const mid = event.datePrecision === 'month' ? `${event.date}-15` : `${event.date}-07-01`;
  return mid < asOf ? mid : asOf;
}

export type WindowMembership = 'in' | 'out' | 'unconfirmed';

/**
 * `in` when every day the date can mean falls on or after the window start,
 * `unconfirmed` when a month-only date straddles the start, `out` otherwise.
 */
export function windowMembership(
  event: Pick<FundingEvent, 'date' | 'datePrecision'>,
  asOf: string = ROUNDS_AS_OF,
  days: number = ROUNDS_WINDOW_DAYS,
): WindowMembership {
  const start = windowStart(asOf, days);
  const { first, last } = dateSpan(event);
  if (first > asOf || last < start) return 'out';
  if (first >= start) return 'in';
  return 'unconfirmed';
}

/** Converts through the ECB euro cross rate. EUR and USD need no table lookup on one side. */
export function toUsd(amount: number, currency: Currency): number {
  if (currency === 'USD') return amount;
  const eur = currency === 'EUR' ? amount : amount / EUR_REFERENCE_RATES[currency];
  return eur * EUR_REFERENCE_RATES.USD;
}

/** The record's amount in USD, or null when it is not disclosed. */
export function amountUsd(event: Pick<FundingEvent, 'amount' | 'currency'>): number | null {
  return typeof event.amount === 'number' ? toUsd(event.amount, event.currency) : null;
}

function keep(event: FundingEvent, { strict = false }: TotalsOptions): boolean {
  return !(strict && event.borderline);
}

/** Rounds of any status inside the window, newest first. */
export function roundsInWindow(options: TotalsOptions = {}): FundingEvent[] {
  return ROUNDS.filter((r) => windowMembership(r) === 'in' && keep(r, options)).sort(newestFirst);
}

function newestFirst(a: FundingEvent, b: FundingEvent): number {
  const da = plotDate(a);
  const db = plotDate(b);
  return da < db ? 1 : da > db ? -1 : a.key.localeCompare(b.key);
}

/** Closed rounds inside the window: the only rows that reach a total. */
export function closedRoundsInWindow(options: TotalsOptions = {}): FundingEvent[] {
  return roundsInWindow(options).filter((r) => r.status === 'closed');
}

/** Month-only rows that may predate the window start; kept, flagged and never totaled. */
export function monthUnconfirmedRounds(): FundingEvent[] {
  return ROUNDS.filter((r) => windowMembership(r) === 'unconfirmed');
}

function sumUsd(events: readonly FundingEvent[]): number {
  return events.reduce((sum, r) => sum + (amountUsd(r) ?? 0), 0);
}

/** Sum of closed rounds inside the window, in USD. Undisclosed amounts add nothing. */
export function totalRaisedUsd(options: TotalsOptions = {}): number {
  return sumUsd(closedRoundsInWindow(options));
}

export interface PeriodTotal {
  /** YYYY-MM */
  month: string;
  usd: number;
  rounds: number;
}

/** Closed-round totals per calendar month the window touches, oldest first. */
export function totalsByMonth(options: TotalsOptions = {}): PeriodTotal[] {
  const months: string[] = [];
  const start = windowStart();
  let [y, m] = start.split('-').map(Number);
  const end = ROUNDS_AS_OF.slice(0, 7);
  for (;;) {
    const month = `${y}-${String(m).padStart(2, '0')}`;
    months.push(month);
    if (month >= end) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const closed = closedRoundsInWindow(options);
  return months.map((month) => {
    const rows = closed.filter((r) => r.date.slice(0, 7) === month);
    return { month, usd: sumUsd(rows), rounds: rows.length };
  });
}

export interface SectorTotal {
  sector: RoundSector;
  segment: MarketMapSegment;
  usd: number;
  rounds: number;
}

/** Closed-round totals per sector, in SECTOR_ORDER. */
export function totalsBySector(options: TotalsOptions = {}): SectorTotal[] {
  const closed = closedRoundsInWindow(options);
  return SECTOR_ORDER.map((sector) => {
    const rows = closed.filter((r) => r.sector === sector);
    return { sector, segment: SECTOR_SEGMENT[sector], usd: sumUsd(rows), rounds: rows.length };
  });
}

/** Rounds inside the window by status. */
export function countsByStatus(
  events: readonly FundingEvent[] = roundsInWindow(),
): Record<RoundStatus, number> {
  const counts: Record<RoundStatus, number> = { closed: 0, unconfirmed: 0, talks: 0, announced: 0 };
  for (const event of events) counts[event.status] += 1;
  return counts;
}

/** How many closed rounds in the window rest on a reported, not a primary, source. */
export function reportedSourceCount(options: TotalsOptions = {}): number {
  return closedRoundsInWindow(options).filter((r) => r.sourceType === 'reported').length;
}

export interface SizeBands {
  under10m: number;
  from10mTo100m: number;
  atLeast100m: number;
  notDisclosed: number;
}

/** Closed rounds in the window by USD size: under 10M, 10M up to 100M, 100M and over. */
export function sizeBands(options: TotalsOptions = {}): SizeBands {
  const bands: SizeBands = { under10m: 0, from10mTo100m: 0, atLeast100m: 0, notDisclosed: 0 };
  for (const event of closedRoundsInWindow(options)) {
    const usd = amountUsd(event);
    if (usd === null) bands.notDisclosed += 1;
    else if (usd < 10_000_000) bands.under10m += 1;
    else if (usd < 100_000_000) bands.from10mTo100m += 1;
    else bands.atLeast100m += 1;
  }
  return bands;
}

export function canonicalInvestor(name: string): string {
  return INVESTOR_ALIASES[name] ?? name;
}

export interface LeadInvestorCount {
  investor: string;
  rounds: number;
  /** Record keys, newest first. */
  keys: string[];
}

/**
 * Lead or co-lead appearances on closed rounds inside the window, skipping
 * rows whose lead is unconfirmed. Most rounds first, then by name.
 */
export function leadInvestorCounts(options: TotalsOptions & { minRounds?: number } = {}): LeadInvestorCount[] {
  const { minRounds = 1 } = options;
  const byInvestor = new Map<string, string[]>();
  for (const event of closedRoundsInWindow(options)) {
    if (event.leadUnconfirmed) continue;
    const names = new Set(event.leadInvestors.map(canonicalInvestor));
    for (const name of names) byInvestor.set(name, [...(byInvestor.get(name) ?? []), event.key]);
  }
  return [...byInvestor]
    .map(([investor, keys]) => ({ investor, rounds: keys.length, keys }))
    .filter((row) => row.rounds >= minRounds)
    .sort((a, b) => b.rounds - a.rounds || a.investor.localeCompare(b.investor));
}

/**
 * Closed UK and Europe rounds for the snapshot year, including rounds
 * that have rolled out of the 120-day window. Newest first.
 */
export function ukAndEuropeRounds(): FundingEvent[] {
  const year = ROUNDS_AS_OF.slice(0, 4);
  return [...ROUNDS, ...UK_EUROPE_2026_EARLIER]
    .filter((r) => r.date.startsWith(year) && r.date <= ROUNDS_AS_OF && r.status === 'closed' && EUROPE_COUNTRIES.has(r.country))
    .sort(newestFirst);
}

function scaled(value: number, unit: number, suffix: string): string {
  const n = value / unit;
  const text = Number.isInteger(n) || n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '');
  return `${text}${suffix}`;
}

/**
 * An amount in its own currency: "$1.5B" for dollars (formatUsd), "EUR 27M",
 * "CNY 1B", and thousands under one million ("GBP 585K").
 */
export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') return formatUsd(amount);
  if (amount >= 1_000_000_000) return `${currency} ${scaled(amount, 1_000_000_000, 'B')}`;
  if (amount >= 1_000_000) return `${currency} ${scaled(amount, 1_000_000, 'M')}`;
  if (amount >= 1_000) return `${currency} ${Math.round(amount / 1_000)}K`;
  return `${currency} ${amount}`;
}
