/**
 * Data, geometry and label placement for the recent-rounds figure
 * (components/rounds/rounds-figure.tsx). Pure functions; no React.
 *
 * One dot per round inside the window of lib/rounds.ts: date across, the
 * amount in US dollars up on a log scale with a floor at USD 1M. Rounds
 * with no disclosed amount or under the floor stay in the data and the
 * totals and are not drawn. A month-only date sits on the 15th, or on the
 * as-of date when the 15th is later.
 *
 * Labels are placed here, never by hand: the largest rounds in order, each
 * at the first clean spot of a fixed candidate list, stopping at the first
 * round that has none or at the cap for the width. A label box never
 * touches a dot, an axis label or another label, and a leader never
 * crosses another leader, a label box or a dot other than its own. A label
 * without a leader keeps every other dot at least twice as far as its own,
 * so it reads as one dot's. Text widths come from Geist's advance widths.
 *
 * Tested in tests/unit/rounds-figure.test.ts.
 */
import { ROUNDS_AS_OF, type Currency, type FundingEvent, type RoundStatus } from '@/data/rounds.ts';
import { FX_RATES_DATE } from '@/data/fx-rates.ts';
import { formatLongDate } from '@/lib/dates.ts';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens.ts';
import {
  SEGMENT_LABELS,
  SEGMENT_ORDER,
  formatUsd,
  type MarketMapSegment,
} from '@/lib/market-map.ts';
import {
  SECTOR_SEGMENT,
  amountUsd,
  closedRoundsInWindow,
  countsByStatus,
  plotDate,
  reportedSourceCount,
  roundsInWindow,
  totalRaisedUsd,
  totalsByMonth,
  totalsBySector,
  windowStart,
} from '@/lib/rounds.ts';

/** Rounds under this many US dollars are not drawn. */
export const FLOOR_USD = 1_000_000;

/** Statuses drawn hollow: every round that has not closed. */
export const HOLLOW_STATUSES: readonly RoundStatus[] = ['talks', 'unconfirmed', 'announced'];

export interface FigureRound {
  key: string;
  company: string;
  status: RoundStatus;
  usd: number;
  /** The day the dot sits on (YYYY-MM-DD). */
  plotted: string;
  segment: MarketMapSegment;
  hollow: boolean;
  monthOnly: boolean;
  /** A month-only row whose 15th falls after the as-of date. */
  clamped: boolean;
  /** The amount is a ceiling ("up to"): the dot sits at it and is never labeled. */
  ceiling: boolean;
  /** Known from a press or newsletter report, not a primary source. */
  reported: boolean;
  /** Company and amount, as printed beside the dot. */
  label: string;
}

/** Later than any row's date, so plotDate returns the unclamped mid-point. */
const NO_CLAMP = '9999-12-31';

/** Where a round's dot sits: its day, the 15th of its month, never after `asOf`. */
export function figurePlotDate(
  event: Pick<FundingEvent, 'date' | 'datePrecision'>,
  asOf: string = ROUNDS_AS_OF,
): string {
  return plotDate(event, asOf);
}

const CEILING_NOTE = /^Up to ([A-Z]{3}) (\d+(?:\.\d+)?)([MB])\b/;

/**
 * The stored amount is a ceiling: the row's note opens "Up to" and that same
 * amount in the row's currency ("Up to USD 700M, per the Financial Times").
 * The schema has no ceiling flag; the note is the field that says so.
 */
export function amountIsCeiling(event: {
  amount: number | string;
  currency: Currency | null;
  note?: string;
}): boolean {
  if (typeof event.amount !== 'number' || !event.note) return false;
  const match = CEILING_NOTE.exec(event.note);
  if (!match || match[1] !== event.currency) return false;
  return Math.round(Number(match[2]) * (match[3] === 'B' ? 1e9 : 1e6)) === event.amount;
}

function amountText(event: FundingEvent, usd: number): string {
  const amount = formatUsd(usd);
  if (amountIsCeiling(event)) return `up to ${amount}`;
  if (event.amountIsFloor) return `over ${amount}`;
  if (event.amountIsApproximate) return `about ${amount}`;
  return amount;
}

export interface FigureRounds {
  drawn: FigureRound[];
  /** In the window with no disclosed amount. */
  undisclosed: FundingEvent[];
  /** In the window with an amount under FLOOR_USD. */
  belowFloor: FundingEvent[];
}

/** Splits the window's rounds into the drawn dots and the two kinds left off. */
export function figureRounds(
  events: readonly FundingEvent[] = roundsInWindow(),
  asOf: string = ROUNDS_AS_OF,
): FigureRounds {
  const drawn: FigureRound[] = [];
  const undisclosed: FundingEvent[] = [];
  const belowFloor: FundingEvent[] = [];
  for (const event of events) {
    const usd = amountUsd(event);
    if (usd === null) {
      undisclosed.push(event);
      continue;
    }
    if (usd < FLOOR_USD) {
      belowFloor.push(event);
      continue;
    }
    const plotted = figurePlotDate(event, asOf);
    drawn.push({
      key: event.key,
      company: event.company,
      status: event.status,
      usd,
      plotted,
      segment: SECTOR_SEGMENT[event.sector],
      hollow: HOLLOW_STATUSES.includes(event.status),
      monthOnly: event.datePrecision === 'month',
      clamped: plotted !== plotDate(event, NO_CLAMP),
      ceiling: amountIsCeiling(event),
      reported: event.sourceType === 'reported',
      label: `${event.company} ${amountText(event, usd)}`,
    });
  }
  return { drawn, undisclosed, belowFloor };
}

/** Largest first; at equal size a closed round first, then the earlier, then by key. */
export function bySize(a: FigureRound, b: FigureRound): number {
  return (
    b.usd - a.usd ||
    Number(a.hollow) - Number(b.hollow) ||
    a.plotted.localeCompare(b.plotted) ||
    a.key.localeCompare(b.key)
  );
}

export interface SegmentTotal {
  segment: MarketMapSegment;
  label: string;
  usd: number;
  rounds: number;
}

/** Closed rounds in the window per market-map segment, in the market map's order. */
export function segmentTotals(): SegmentTotal[] {
  const sectors = totalsBySector();
  return SEGMENT_ORDER.map((segment) => {
    const rows = sectors.filter((s) => s.segment === segment);
    return {
      segment,
      label: SEGMENT_LABELS[segment],
      usd: rows.reduce((sum, s) => sum + s.usd, 0),
      rounds: rows.reduce((sum, s) => sum + s.rounds, 0),
    };
  });
}

/** The segment that drew the most money; the figure opens on it. */
export function leadingSegment(totals: readonly SegmentTotal[] = segmentTotals()): SegmentTotal {
  return totals.reduce((best, s) => (s.usd > best.usd ? s : best));
}

export function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** Every count the caption, the fold and the description print. */
export interface RoundsFigureFacts {
  start: string;
  asOf: string;
  inWindow: number;
  closed: number;
  reported: number;
  hollow: { status: RoundStatus; count: number }[];
  hollowCount: number;
  drawn: number;
  undisclosed: number;
  belowFloor: FundingEvent[];
  monthOnly: number;
  clamped: number;
  totalUsd: number;
  fxDate: string;
  largestClosed: FigureRound;
}

export function roundsFigureFacts(): RoundsFigureFacts {
  const inWindow = roundsInWindow();
  const { drawn, undisclosed, belowFloor } = figureRounds(inWindow);
  const counts = countsByStatus(inWindow);
  const hollow = HOLLOW_STATUSES.map((status) => ({ status, count: counts[status] })).filter(
    (h) => h.count > 0,
  );
  const largestClosed = [...drawn].filter((r) => !r.hollow).sort(bySize)[0];
  return {
    start: windowStart(),
    asOf: ROUNDS_AS_OF,
    inWindow: inWindow.length,
    closed: closedRoundsInWindow().length,
    reported: reportedSourceCount(),
    hollow,
    hollowCount: hollow.reduce((sum, h) => sum + h.count, 0),
    drawn: drawn.length,
    undisclosed: undisclosed.length,
    belowFloor,
    monthOnly: drawn.filter((r) => r.monthOnly).length,
    clamped: drawn.filter((r) => r.clamped).length,
    totalUsd: totalRaisedUsd(),
    fxDate: FX_RATES_DATE,
    largestClosed,
  };
}

/** "a, b and c". */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const STATUS_WORDS: Record<RoundStatus, string> = {
  closed: 'closed',
  talks: 'in talks',
  unconfirmed: 'unconfirmed',
  announced: 'announced',
};

export function hollowStatusText(facts: RoundsFigureFacts): string {
  return listText(facts.hollow.map((h) => STATUS_WORDS[h.status])).replace(/ and /, ' or ');
}

/** The headline: the segment that drew the most, at most ten words. */
export function roundsFigureHeadline(): string {
  const lead = leadingSegment();
  return `${lead.label} drew the most money: ${formatUsd(lead.usd)} of ${formatUsd(totalRaisedUsd())}`;
}

/** The caption sentence, at most 25 words. */
export function roundsFigureCaption(facts: RoundsFigureFacts = roundsFigureFacts()): string {
  return (
    `${facts.inWindow} rounds from ${formatLongDate(facts.start)} to ${formatLongDate(facts.asOf)}: ` +
    `${facts.closed} closed, drawn solid; ${facts.hollowCount} ${hollowStatusText(facts)}, drawn hollow.`
  );
}

/** The chart's text description at its default state; lib/chart-descriptions.ts holds the same text. */
export function roundsFigureDescription(facts: RoundsFigureFacts = roundsFigureFacts()): string {
  const lead = leadingSegment();
  return (
    `${facts.inWindow} funding rounds from ${formatLongDate(facts.start)} to ${formatLongDate(facts.asOf)}, ` +
    `placed by date and by amount in US dollars on a log scale. ${facts.closed} closed rounds raised ` +
    `${formatUsd(facts.totalUsd)}; ${lead.label} drew ${formatUsd(lead.usd)} of it in ${lead.rounds} rounds, ` +
    `the most of the six segments, and the largest closed round was ${facts.largestClosed.company} at ` +
    `${formatUsd(facts.largestClosed.usd)}.`
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Closed rounds per month of the window, each month named with the days it covers. */
export function monthRows(): { label: string; usd: number; rounds: number }[] {
  const start = windowStart();
  return totalsByMonth().map((m) => {
    const [y, mo] = m.month.split('-').map(Number);
    const name = MONTH_NAMES[mo - 1];
    const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const first = m.month === start.slice(0, 7) ? Number(start.slice(8)) : 1;
    const end = m.month === ROUNDS_AS_OF.slice(0, 7) ? Number(ROUNDS_AS_OF.slice(8)) : last;
    const label = first === 1 && end === last ? `${name} ${y}` : `${first} to ${end} ${name} ${y}`;
    return { label, usd: m.usd, rounds: m.rounds };
  });
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The line under the segment list for the chosen segment. */
export function readoutText(total: SegmentTotal, allUsd: number = totalRaisedUsd()): string {
  return (
    `${total.label}: ${formatUsd(total.usd)} in ${count(total.rounds, 'closed round', 'closed rounds')}, ` +
    `${percentOf(total.usd, allUsd)}% of the total.`
  );
}

/**
 * Ceilings that outrank the smallest label: larger than a labeled round, yet
 * unlabeled. Every drawn ceiling when nothing is labeled.
 */
export function outrankingCeilings(layout: Pick<RoundsFigureLayout, 'dots' | 'labels'>): FigureRound[] {
  const labeled = new Set(layout.labels.map((l) => l.key));
  const rounds = layout.dots.map((d) => d.round);
  const smallest = rounds.filter((r) => labeled.has(r.key)).sort(bySize).at(-1);
  return rounds.filter((r) => r.ceiling && (!smallest || bySize(r, smallest) < 0)).sort(bySize);
}

/** The labeling sentences, for the layout on screen. */
export function labelsText(
  layout: Pick<RoundsFigureLayout, 'dots' | 'labels' | 'cap' | 'firstUnplaced'>,
): string {
  const n = layout.labels.length;
  const others = layout.dots.some((d) => d.round.ceiling) ? ' other than ceilings' : '';
  const placed =
    `At this width the ${count(n, 'largest round', 'largest rounds')}${others} ` +
    `${n === 1 ? 'is' : 'are'} labeled with company and amount`;
  const ceilings = outrankingCeilings(layout);
  const one = ceilings.length === 1;
  const reported = ceilings.every((r) => r.reported) ? 'reported ' : '';
  const skipped =
    ceilings.length === 0
      ? ''
      : `; ${listText(ceilings.map((r) => `${r.company} (up to ${formatUsd(r.usd)})`))} ` +
        `would rank among them but ${one ? 'carries' : 'carry'} no label, because ` +
        `${one ? `its amount is a ${reported}ceiling` : `their amounts are ${reported}ceilings`}`;
  if (layout.firstUnplaced) {
    return `${placed}${skipped}. The next, ${layout.firstUnplaced.label}, has no spot clear of every dot, axis label and other label.`;
  }
  return `${placed}, the most this width takes${skipped}. No label touches a dot, an axis label or another label.`;
}

/** The paragraphs of the "How this was made" fold. */
export function methodParagraphs(
  facts: RoundsFigureFacts,
  layout: Pick<RoundsFigureLayout, 'dots' | 'labels' | 'cap' | 'firstUnplaced'>,
): string[] {
  const hollow = facts.hollow.map((h) => `${h.count} ${STATUS_WORDS[h.status]}`);
  const floorNames = facts.belowFloor.map((r) => r.company);
  const clamped =
    facts.clamped > 0
      ? `; ${count(facts.clamped, 'row', 'rows')} whose 15th falls after ${formatLongDate(facts.asOf)} ${facts.clamped === 1 ? 'sits' : 'sit'} on that date`
      : '';
  return [
    `One dot per round dated ${formatLongDate(facts.start)} to ${formatLongDate(facts.asOf)}, ` +
      `${facts.inWindow} in all: the date across, the amount in US dollars up on a log scale. ` +
      `Solid dots are the ${facts.closed} closed rounds, ${facts.reported} of them known from a press or newsletter report ` +
      `and not a primary source. Hollow dots are the ${facts.hollowCount} not closed: ${listText(hollow)}.`,
    `Not drawn: ${count(facts.undisclosed, 'round', 'rounds')} with no disclosed amount and ` +
      `${count(floorNames.length, 'round', 'rounds')} under the ${formatUsd(FLOOR_USD)} floor` +
      `${floorNames.length > 0 ? ` (${listText(floorNames)})` : ''}. They stay in the tables, and the closed ones in the totals.`,
    `${count(facts.monthOnly, 'round', 'rounds')} dated only to a month ${facts.monthOnly === 1 ? 'sits' : 'sit'} on its 15th${clamped}.`,
    labelsText(layout),
    `Amounts in other currencies are converted to US dollars at the European Central Bank's euro reference rates of ` +
      `${formatLongDate(facts.fxDate)}. The segments are the market map's six; each round's sector maps onto one of them.`,
  ];
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Geist (the site's sans, as next/font serves it) advance widths at its
 * default weight 400, in thousandths of an em, for the characters from
 * space (U+0020) to tilde (U+007E). Summing advances ignores kerning, which
 * only narrows a run, so a measured label is never shorter than its text.
 */
const GEIST_ADVANCES = [
  250, 213, 346, 478, 629, 802, 620, 178, 274, 274, 430, 558, 201, 419, 201, 480,
  663, 384, 619, 613, 615, 626, 593, 524, 604, 593, 297, 297, 544, 540, 544, 559,
  906, 668, 680, 703, 694, 603, 590, 700, 713, 270, 597, 640, 580, 877, 743, 739,
  650, 733, 672, 640, 552, 689, 667, 945, 606, 576, 544, 347, 455, 347, 426, 557,
  248, 551, 595, 546, 595, 561, 395, 594, 581, 244, 260, 590, 267, 877, 581, 573,
  595, 595, 379, 520, 392, 575, 536, 819, 585, 537, 537, 389, 264, 389, 523,
] as const;

/** Geist's ascender and descender, in ems: the box a line of text occupies. */
export const GEIST_ASCENT = 1.005;
export const GEIST_DESCENT = 0.295;

/**
 * Width of `text` set in Geist at `px`. A character outside the table
 * (the CJK in a company's own name falls back to another face) counts as
 * one full em, the width of a CJK glyph.
 */
export function textWidth(text: string, px: number): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    units += code >= 32 && code <= 126 ? GEIST_ADVANCES[code - 32] : 1000;
  }
  return (units / 1000) * px;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function boxesOverlap(a: Box, b: Box, gap = 0): boolean {
  return a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;
}

/** Distance from a point to the nearest point of a box (0 inside). */
export function pointBoxDistance(x: number, y: number, box: Box): number {
  const dx = Math.max(box.x0 - x, 0, x - box.x1);
  const dy = Math.max(box.y0 - y, 0, y - box.y1);
  return Math.hypot(dx, dy);
}

/** Distance from a point to a segment. */
export function pointSegmentDistance(x: number, y: number, s: Segment): number {
  const vx = s.x2 - s.x1;
  const vy = s.y2 - s.y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / len2));
  return Math.hypot(x - (s.x1 + t * vx), y - (s.y1 + t * vy));
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
}

/** True when two segments touch or cross. */
export function segmentsIntersect(a: Segment, b: Segment): boolean {
  const o1 = orient(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
  const o2 = orient(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);
  const o3 = orient(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1);
  const o4 = orient(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
  if (o1 !== o2 && o3 !== o4) return true;
  const on = (s: Segment, x: number, y: number) =>
    Math.min(s.x1, s.x2) <= x && x <= Math.max(s.x1, s.x2) && Math.min(s.y1, s.y2) <= y && y <= Math.max(s.y1, s.y2);
  return (
    (o1 === 0 && on(a, b.x1, b.y1)) ||
    (o2 === 0 && on(a, b.x2, b.y2)) ||
    (o3 === 0 && on(b, a.x1, a.y1)) ||
    (o4 === 0 && on(b, a.x2, a.y2))
  );
}

/** True when a segment enters a box grown by `gap`. */
export function segmentHitsBox(s: Segment, box: Box, gap = 0): boolean {
  const b = { x0: box.x0 - gap, y0: box.y0 - gap, x1: box.x1 + gap, y1: box.y1 + gap };
  const inside = (x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
  if (inside(s.x1, s.y1) || inside(s.x2, s.y2)) return true;
  const edges: Segment[] = [
    { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0 },
    { x1: b.x1, y1: b.y0, x2: b.x1, y2: b.y1 },
    { x1: b.x1, y1: b.y1, x2: b.x0, y2: b.y1 },
    { x1: b.x0, y1: b.y1, x2: b.x0, y2: b.y0 },
  ];
  return edges.some((e) => segmentsIntersect(s, e));
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Text sizes on the stage, in CSS px: the motion tokens' label (and axis title) and tick sizes. */
export const LABEL_PX = MOTION_STAGE_TYPE.labelPx;
export const AXIS_PX = MOTION_STAGE_TYPE.axisPx;
export const TICK_PX = MOTION_STAGE_TYPE.tickPx;
/** Dot radius, and the hollow ring's stroke. */
export const DOT_R = 3.5;
export const RING_STROKE = 1.25;
/** Below this chart width the figure is the phone layout. */
export const PHONE_MAX_WIDTH = 600;
/** The width drawn before the chart is measured, and the narrowest it is drawn. */
export const CHART_WIDTH = { fallback: 880, minimum: 300 } as const;
export const LABEL_CAP = { phone: 5, desktop: 10 } as const;

/** A dot's painted extent, ring included. */
const DOT_EXTENT = DOT_R + RING_STROKE / 2;
/** Clear space around a label box, from dots, text and leaders. */
const LABEL_GAP = 3;
/** From a label without a leader to any dot but its own: twice the gap to its own dot. */
const NEIGHBOUR_CLEARANCE = 2 * (DOT_EXTENT + LABEL_GAP);
/** Clear space between a leader and any dot but its own. */
const LEADER_CLEARANCE = 2;
/** The label search tries each label's first few clean spots, within a fixed number of steps. */
const SEARCH_BRANCHES = 4;
const SEARCH_BUDGET = 250;

export interface PlacedDot {
  round: FigureRound;
  cx: number;
  cy: number;
}

export interface AxisText {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  box: Box;
}

export interface PlacedLabel {
  key: string;
  text: string;
  /** Text start and baseline. */
  x: number;
  y: number;
  box: Box;
  /** From the dot's edge to the label, or null when the label sits beside its dot. */
  leader: Segment | null;
}

export interface RoundsFigureLayout {
  width: number;
  height: number;
  plot: { left: number; right: number; top: number; axisY: number };
  title: AxisText;
  yTicks: (AxisText & { gridY: number; value: number })[];
  months: AxisText[];
  /** Day lines at the start of each month inside the window. */
  monthLines: number[];
  dots: PlacedDot[];
  labels: PlacedLabel[];
  cap: number;
  /** The largest round that found no clean spot, or null when the cap stopped labeling. */
  firstUnplaced: FigureRound | null;
}

const DAY_MS = 86_400_000;
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const AXIS_TITLE = 'Round size in US dollars, log scale';

function textBox(text: string, x: number, baseline: number, px: number, anchor: AxisText['anchor']): Box {
  const w = textWidth(text, px);
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x0, y0: baseline - GEIST_ASCENT * px, x1: x0 + w, y1: baseline + GEIST_DESCENT * px };
}

/**
 * The candidate spots for one label, in the order they are tried: beside
 * the dot first, then at the end of a leader of growing length.
 */
function candidates(dot: PlacedDot, w: number, h: number): { box: Box; leader: Segment | null }[] {
  const { cx, cy } = dot;
  const r = DOT_EXTENT + LABEL_GAP;
  const out: { box: Box; leader: Segment | null }[] = [];
  const at = (x0: number, y0: number, leader: Segment | null) => out.push({ box: { x0, y0, x1: x0 + w, y1: y0 + h }, leader });
  // Beside the dot: right, left, above, below, then right and left shifted half a line.
  at(cx + r, cy - h / 2, null);
  at(cx - r - w, cy - h / 2, null);
  at(cx - DOT_EXTENT, cy - r - h, null);
  at(cx + DOT_EXTENT - w, cy - r - h, null);
  at(cx - DOT_EXTENT, cy + r, null);
  at(cx + DOT_EXTENT - w, cy + r, null);
  at(cx + r, cy - h + 2, null);
  at(cx - r - w, cy - h + 2, null);
  at(cx + r, cy - 2, null);
  at(cx - r - w, cy - 2, null);
  // On a leader: up first, where the large rounds have room.
  const angles = [
    -35, -145, -55, -125, -20, -160, -70, -110, -90, -5, -175, 10, 170, 30, 150, 50, 130, 70, 110, 90,
  ];
  for (const length of [12, 18, 26, 36, 48, 62, 78, 96, 116, 138]) {
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const start = DOT_EXTENT + 1;
      const ex = cx + ux * (start + length);
      const ey = cy + uy * (start + length);
      const leader = { x1: cx + ux * start, y1: cy + uy * start, x2: ex, y2: ey };
      if (Math.abs(ux) < 0.2) {
        // Straight up or down: the label centred on the leader's end.
        at(ex - w / 2, uy < 0 ? ey - 2 - h : ey + 2, leader);
      } else {
        at(ux > 0 ? ex + 2 : ex - 2 - w, ey - h / 2, leader);
      }
    }
  }
  return out;
}

/**
 * Lays the figure out at `width` CSS px: scales, axis text, dots and the
 * labels of the largest rounds.
 */
export function roundsFigureLayout(
  width: number,
  rounds: readonly FigureRound[] = figureRounds().drawn,
  options: { start?: string; asOf?: string } = {},
): RoundsFigureLayout {
  const start = options.start ?? windowStart();
  const asOf = options.asOf ?? ROUNDS_AS_OF;
  const phone = width < PHONE_MAX_WIDTH;
  const height = phone ? 420 : 460;
  const cap = phone ? LABEL_CAP.phone : LABEL_CAP.desktop;

  // Vertical scale: one decade per tick from the floor, headroom to the next half decade.
  const maxUsd = Math.max(FLOOR_USD * 10, ...rounds.map((r) => r.usd));
  const top = Math.max(Math.ceil(Math.log10(maxUsd) * 2) / 2, 7);
  const tickValues: number[] = [];
  for (let e = Math.log10(FLOOR_USD); e <= Math.floor(top); e += 1) tickValues.push(10 ** e);
  const tickTexts = tickValues.map(formatUsd);
  const tickWidth = Math.max(...tickTexts.map((t) => textWidth(t, TICK_PX)));

  const titleBaseline = Math.ceil(GEIST_ASCENT * AXIS_PX);
  const plotTop = titleBaseline + 22;
  const axisY = height - 28;
  const left = Math.ceil(tickWidth) + 10;
  const right = width - DOT_EXTENT - 4;
  const y = (usd: number) =>
    axisY - ((Math.log10(usd) - Math.log10(FLOOR_USD)) / (top - Math.log10(FLOOR_USD))) * (axisY - plotTop);
  const d0 = dayNumber(start);
  const d1 = dayNumber(asOf);
  const x = (iso: string) => left + DOT_EXTENT + ((dayNumber(iso) - d0) / (d1 - d0)) * (right - left - DOT_EXTENT);

  const title: AxisText = {
    text: AXIS_TITLE,
    x: 0,
    y: titleBaseline,
    anchor: 'start',
    box: textBox(AXIS_TITLE, 0, titleBaseline, AXIS_PX, 'start'),
  };
  const yTicks = tickValues.map((value, i) => {
    const gridY = y(value);
    const baseline = gridY + TICK_PX * 0.35;
    return {
      value,
      gridY,
      text: tickTexts[i],
      x: left - 8,
      y: baseline,
      anchor: 'end' as const,
      box: textBox(tickTexts[i], left - 8, baseline, TICK_PX, 'end'),
    };
  });

  // Months: a line at each month start inside the window, the name centred in its span.
  const months: AxisText[] = [];
  const monthLines: number[] = [];
  let [yy, mm] = start.split('-').map(Number);
  for (;;) {
    const first = `${yy}-${String(mm).padStart(2, '0')}-01`;
    const nextY = mm === 12 ? yy + 1 : yy;
    const nextM = mm === 12 ? 1 : mm + 1;
    const next = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
    const from = first < start ? start : first;
    const to = next > asOf ? asOf : next;
    if (first > start) monthLines.push(x(first));
    const text = SHORT_MONTHS[mm - 1];
    const cxm = (x(from) + x(to)) / 2;
    const baseline = axisY + 18;
    const box = textBox(text, cxm, baseline, TICK_PX, 'middle');
    if (x(to) - x(from) >= box.x1 - box.x0 + 4) months.push({ text, x: cxm, y: baseline, anchor: 'middle', box });
    if (next > asOf) break;
    [yy, mm] = [nextY, nextM];
  }

  const dots: PlacedDot[] = rounds.map((round) => ({ round, cx: x(round.plotted), cy: y(round.usd) }));

  // Labels, largest first.
  const fixedText = [title.box, ...yTicks.map((t) => t.box), ...months.map((m) => m.box)];
  const h = (GEIST_ASCENT + GEIST_DESCENT) * LABEL_PX;
  type Spot = { box: Box; leader: Segment | null };
  /** Clear of the frame, the axis text and every dot: the same whatever else is labeled. */
  const clearOfDrawing = (dot: PlacedDot, { box, leader }: Spot) => {
    if (box.x0 < left || box.x1 > width || box.y0 < 0 || box.y1 > axisY - LABEL_GAP) return false;
    if (fixedText.some((t) => boxesOverlap(box, t, LABEL_GAP))) return false;
    if (dots.some((d) => pointBoxDistance(d.cx, d.cy, box) < DOT_EXTENT + LABEL_GAP)) return false;
    if (!leader) {
      return dots.every((d) => d === dot || pointBoxDistance(d.cx, d.cy, box) >= NEIGHBOUR_CLEARANCE);
    }
    if (leader.y2 > axisY || leader.y1 > axisY) return false;
    if (fixedText.some((t) => segmentHitsBox(leader, t, 1))) return false;
    return dots.every(
      (d) => d === dot || pointSegmentDistance(d.cx, d.cy, leader) >= DOT_EXTENT + LEADER_CLEARANCE,
    );
  };
  /** Clear of the labels and leaders already placed. */
  const clearOfLabels = (placed: readonly PlacedLabel[], { box, leader }: Spot) =>
    placed.every(
      (other) =>
        !boxesOverlap(box, other.box, LABEL_GAP) &&
        !(other.leader && segmentHitsBox(other.leader, box, 1)) &&
        !(leader && segmentHitsBox(leader, other.box, 1)) &&
        !(leader && other.leader && segmentsIntersect(leader, other.leader)),
    );
  const toLabel = (dot: PlacedDot, spot: { box: Box; leader: Segment | null }): PlacedLabel => ({
    key: dot.round.key,
    text: dot.round.label,
    x: spot.box.x0,
    y: spot.box.y0 + GEIST_ASCENT * LABEL_PX,
    box: spot.box,
    leader: spot.leader,
  });
  const drawingSpots = new Map<PlacedDot, Spot[]>();
  const spotsFor = (dot: PlacedDot): Spot[] => {
    let spots = drawingSpots.get(dot);
    if (!spots) {
      spots = candidates(dot, textWidth(dot.round.label, LABEL_PX), h).filter((s) => clearOfDrawing(dot, s));
      drawingSpots.set(dot, spots);
    }
    return spots;
  };

  // The largest rounds in order. A depth-first search over each label's
  // first few clean spots, in preference order, keeps the longest run of
  // labels found; an earlier label moves only when that lets a later one in.
  // A ceiling is not a raise, so its dot carries no label.
  const order = dots.filter((d) => !d.round.ceiling).sort((a, b) => bySize(a.round, b.round));
  let labels: PlacedLabel[] = [];
  let visits = 0;
  const search = (placed: PlacedLabel[]): boolean => {
    if (placed.length > labels.length) labels = placed;
    if (placed.length >= cap || placed.length >= order.length) return true;
    if (visits >= SEARCH_BUDGET) return false;
    visits += 1;
    const dot = order[placed.length];
    let tried = 0;
    for (const spot of spotsFor(dot)) {
      if (!clearOfLabels(placed, spot)) continue;
      if (search([...placed, toLabel(dot, spot)])) return true;
      tried += 1;
      if (tried >= SEARCH_BRANCHES) break;
    }
    return false;
  };
  search([]);
  const firstUnplaced = labels.length < cap && labels.length < order.length ? order[labels.length].round : null;

  return {
    width,
    height,
    plot: { left, right, top: plotTop, axisY },
    title,
    yTicks,
    months,
    monthLines,
    dots,
    labels,
    cap,
    firstUnplaced,
  };
}

/** Dots in drawing order: the chosen segment last, so no grey dot covers a blue one. */
export function drawOrder(dots: readonly PlacedDot[], segment: MarketMapSegment | null): PlacedDot[] {
  return [...dots].sort(
    (a, b) => Number(a.round.segment === segment) - Number(b.round.segment === segment),
  );
}
