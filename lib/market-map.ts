/**
 * Market-map filter, URL, timeline, and bubble-plot logic.
 * Pure functions; UI lives in components/market-map/.
 *
 * Intersection filters, deep-link parsing, and the null-funding plot
 * rule are unit-tested in tests/unit/market-map.test.ts.
 */
import type { Company } from '@/data/schemas/company.ts';

export const MARKET_MAP_AS_OF = '2026-08-06';

export const SEGMENT_ORDER = [
  'foundation-models',
  'humanoids',
  'industrial-logistics',
  'vertical-applications',
  'simulation-tooling',
  'components-hardware',
] as const;

export type MarketMapSegment = (typeof SEGMENT_ORDER)[number];

export const SEGMENT_LABELS: Record<MarketMapSegment, string> = {
  'foundation-models': 'Foundation models',
  humanoids: 'Humanoids',
  'industrial-logistics': 'Industrial / logistics',
  'vertical-applications': 'Vertical applications',
  'simulation-tooling': 'Simulation / tooling',
  'components-hardware': 'Components',
};

export const EXPECTED_SEGMENT_COUNTS: Record<MarketMapSegment, number> = {
  'foundation-models': 12,
  humanoids: 35,
  'industrial-logistics': 15,
  'vertical-applications': 32,
  'simulation-tooling': 10,
  'components-hardware': 8,
};

export type MarketMapViewId = 'grid' | 'bubble' | 'timeline';

export const VIEW_IDS = ['grid', 'bubble', 'timeline'] as const;

export const STATUS_FILTERS = [
  'private',
  'public',
  'acquired',
  'ipo',
  'shut-down',
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const STATUS_LABELS: Record<StatusFilter, string> = {
  private: 'Private',
  public: 'Public',
  acquired: 'Acquired',
  ipo: 'IPO',
  'shut-down': 'Shut down',
};

export type OpenSourceFilter = 'yes' | 'no';

export type ConfidenceFilter = 'high' | 'medium' | 'low';

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

export interface MarketMapFilters {
  segment: MarketMapSegment | null;
  subSegment: string | null;
  country: string | null;
  status: StatusFilter | null;
  approach: string | null;
  openSource: OpenSourceFilter | null;
  confidence: ConfidenceFilter | null;
}

export const DEFAULT_MARKET_MAP_FILTERS: MarketMapFilters = {
  segment: null,
  subSegment: null,
  country: null,
  status: null,
  approach: null,
  openSource: null,
  confidence: null,
};

export interface ParsedMarketMapSearch {
  view: MarketMapViewId;
  filters: MarketMapFilters;
}

export interface TimelineEvent {
  id: string;
  companyId: string;
  companyName: string;
  date: string;
  type: string | null;
  amountUsd: number | null;
  valuationUsd: number | null;
  leadInvestors: string[];
  sourceUrl: string;
  sourceTitle: string;
  asOf: string;
}

export interface BubblePoint {
  id: string;
  name: string;
  founded: number;
  yUsd: number;
  yKind: 'valuation' | 'totalRaised';
  amountUsd: number | null;
  segment: MarketMapSegment;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function defaultMarketMapFilters(): MarketMapFilters {
  return { ...DEFAULT_MARKET_MAP_FILTERS };
}

export function hasActiveFilters(filters: MarketMapFilters): boolean {
  return (
    filters.segment !== null ||
    filters.subSegment !== null ||
    filters.country !== null ||
    filters.status !== null ||
    filters.approach !== null ||
    filters.openSource !== null ||
    filters.confidence !== null
  );
}

export function matchesStatus(company: Company, status: StatusFilter): boolean {
  switch (status) {
    case 'private':
      return company.status === 'private';
    case 'public':
      return company.status === 'public';
    case 'acquired':
      return company.status === 'acquired';
    case 'ipo':
      return company.latestRound?.type === 'IPO';
    case 'shut-down':
      return company.status === 'dead';
  }
}

export function companyStatusLabel(company: Company): string {
  if (company.latestRound?.type === 'IPO') return 'IPO';
  if (company.status === 'dead') return 'Shut down';
  if (company.status === 'acquired') {
    return company.latestRound?.type === 'Acquisition (bankruptcy)'
      ? 'Acquired (bankruptcy)'
      : 'Acquired';
  }
  if (company.status === 'public') return 'Public';
  return 'Private';
}

function matchesFilters(company: Company, filters: MarketMapFilters): boolean {
  if (filters.segment && company.segment !== filters.segment) return false;
  if (filters.subSegment && company.subSegment !== filters.subSegment) {
    return false;
  }
  if (filters.country && company.hq.country !== filters.country) return false;
  if (filters.status && !matchesStatus(company, filters.status)) return false;
  if (filters.approach && !company.approach.includes(filters.approach)) {
    return false;
  }
  if (filters.openSource === 'yes' && company.openSource.length === 0) {
    return false;
  }
  if (filters.openSource === 'no' && company.openSource.length > 0) {
    return false;
  }
  if (filters.confidence && company.confidence !== filters.confidence) {
    return false;
  }
  return true;
}

export function filterCompanies(
  companies: readonly Company[],
  filters: MarketMapFilters,
): Company[] {
  return companies.filter((company) => matchesFilters(company, filters));
}

export function segmentCounts(
  companies: readonly Company[],
): Record<MarketMapSegment, number> {
  const counts = {
    'foundation-models': 0,
    humanoids: 0,
    'industrial-logistics': 0,
    'vertical-applications': 0,
    'simulation-tooling': 0,
    'components-hardware': 0,
  } satisfies Record<MarketMapSegment, number>;
  for (const company of companies) {
    counts[company.segment] += 1;
  }
  return counts;
}

export function subSegmentOptions(
  companies: readonly Company[],
  segment: MarketMapSegment | null,
): string[] {
  const pool = segment
    ? companies.filter((company) => company.segment === segment)
    : companies;
  const values = new Set<string>();
  for (const company of pool) {
    if (company.subSegment) values.add(company.subSegment);
  }
  return [...values].sort();
}

export function countryOptions(companies: readonly Company[]): string[] {
  return [...new Set(companies.map((company) => company.hq.country))].sort();
}

export function approachOptions(companies: readonly Company[]): string[] {
  const values = new Set<string>();
  for (const company of companies) {
    for (const tag of company.approach) values.add(tag);
  }
  return [...values].sort();
}

function isSegment(value: string): value is MarketMapSegment {
  return (SEGMENT_ORDER as readonly string[]).includes(value);
}

function isView(value: string): value is MarketMapViewId {
  return (VIEW_IDS as readonly string[]).includes(value);
}

function isStatus(value: string): value is StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isConfidence(value: string): value is ConfidenceFilter {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

function isOpenSource(value: string): value is OpenSourceFilter {
  return value === 'yes' || value === 'no';
}

export function parseMarketMapSearch(
  search: string,
  companies: readonly Company[],
): ParsedMarketMapSearch {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  const filters = defaultMarketMapFilters();

  const segment = params.get('segment');
  if (segment && isSegment(segment)) filters.segment = segment;

  // subSegment, country, and approach name values drawn from the dataset
  // rather than fixed enums, so they are validated against it: a
  // hand-edited or stale URL must not put the page into a filter state
  // that matches nothing. Unknown values are dropped and valid sibling
  // filters still apply, the way a wiki URL should degrade.
  const subSegment = params.get('subSegment');
  if (
    subSegment &&
    subSegmentOptions(companies, filters.segment).includes(subSegment)
  ) {
    filters.subSegment = subSegment;
  }

  const country = params.get('country');
  if (country && countryOptions(companies).includes(country)) {
    filters.country = country;
  }

  const status = params.get('status');
  if (status && isStatus(status)) filters.status = status;

  const approach = params.get('approach');
  if (approach && approachOptions(companies).includes(approach)) {
    filters.approach = approach;
  }

  const openSource = params.get('openSource');
  if (openSource && isOpenSource(openSource)) filters.openSource = openSource;

  const confidence = params.get('confidence');
  if (confidence && isConfidence(confidence)) filters.confidence = confidence;

  const viewRaw = params.get('view');
  const view = viewRaw && isView(viewRaw) ? viewRaw : 'grid';

  return { view, filters };
}

/**
 * Filters for a deep link whose #company-<id> hash names a company the URL
 * filters exclude. The explicit hash request outranks the ambient filter
 * state, so keep every filter the company passes and drop the ones it
 * fails: the result always includes the named company.
 */
export function relaxFiltersForCompany(
  filters: MarketMapFilters,
  company: Company,
): MarketMapFilters {
  return {
    segment:
      filters.segment !== null && company.segment === filters.segment
        ? filters.segment
        : null,
    subSegment:
      filters.subSegment !== null &&
      company.subSegment === filters.subSegment
        ? filters.subSegment
        : null,
    country:
      filters.country !== null && company.hq.country === filters.country
        ? filters.country
        : null,
    status:
      filters.status !== null && matchesStatus(company, filters.status)
        ? filters.status
        : null,
    approach:
      filters.approach !== null &&
      company.approach.includes(filters.approach)
        ? filters.approach
        : null,
    openSource:
      filters.openSource === null
        ? null
        : filters.openSource === 'yes'
          ? company.openSource.length > 0
            ? 'yes'
            : null
          : company.openSource.length === 0
            ? 'no'
            : null,
    confidence:
      filters.confidence !== null &&
      company.confidence === filters.confidence
        ? filters.confidence
        : null,
  };
}

export function serializeMarketMapSearch(
  parsed: ParsedMarketMapSearch,
): string {
  const params = new URLSearchParams();
  const { filters, view } = parsed;
  if (filters.segment) params.set('segment', filters.segment);
  if (filters.subSegment) params.set('subSegment', filters.subSegment);
  if (filters.country) params.set('country', filters.country);
  if (filters.status) params.set('status', filters.status);
  if (filters.approach) params.set('approach', filters.approach);
  if (filters.openSource) params.set('openSource', filters.openSource);
  if (filters.confidence) params.set('confidence', filters.confidence);
  if (view !== 'grid') params.set('view', view);
  return params.toString();
}

export function formatUsd(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const text =
      Number.isInteger(billions) || billions >= 10
        ? String(Math.round(billions))
        : billions.toFixed(1).replace(/\.0$/, '');
    return `$${text}B`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const text =
      Number.isInteger(millions) || millions >= 10
        ? String(Math.round(millions))
        : millions.toFixed(1).replace(/\.0$/, '');
    return `$${text}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value}`;
}

export function unknownFigure(): string {
  return 'not disclosed';
}

export function formatShortDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    throw new Error(`expected an ISO YYYY-MM-DD date, got "${iso}"`);
  }
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`month out of range in "${iso}"`);
  }
  if (dayNumber < 1 || dayNumber > 31) {
    throw new Error(`day out of range in "${iso}"`);
  }
  return `${dayNumber} ${MONTH_SHORT[monthIndex]} ${year}`;
}

export function timelineEvents(
  companies: readonly Company[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const company of companies) {
    const round = company.latestRound;
    if (!round?.date) continue;
    if (round.date < '2023-01-01' || round.date > '2026-12-31') continue;
    const source = company.sources[0];
    if (!source) continue;
    events.push({
      id: `${company.id}-${round.date}`,
      companyId: company.id,
      companyName: company.name,
      date: round.date,
      type: round.type,
      amountUsd: round.amountUsd,
      valuationUsd: round.valuationUsd,
      leadInvestors: round.leadInvestors,
      sourceUrl: source.url,
      sourceTitle: source.title,
      asOf: source.asOf,
    });
  }
  return events.sort((a, b) => {
    if (a.date === b.date) return a.companyName.localeCompare(b.companyName);
    return a.date.localeCompare(b.date);
  });
}

export function bubblePoints(companies: readonly Company[]): BubblePoint[] {
  const points: BubblePoint[] = [];
  for (const company of companies) {
    if (company.founded === null) continue;
    const valuation = company.latestRound?.valuationUsd ?? null;
    const total = company.totalRaisedUsd;
    const yUsd = valuation ?? total;
    if (yUsd === null || yUsd <= 0) continue;
    points.push({
      id: company.id,
      name: company.name,
      founded: company.founded,
      yUsd,
      yKind: valuation !== null ? 'valuation' : 'totalRaised',
      amountUsd: company.latestRound?.amountUsd ?? null,
      segment: company.segment,
    });
  }
  return points;
}

/**
 * Plotted position of a bubble mark, in SVG user units. cx is the founding
 * year axis (grows right), cy the funding axis (grows down, like all SVG
 * y). Only the two axes matter for arrow-key movement.
 */
export interface BubbleMarkPosition {
  id: string;
  cx: number;
  cy: number;
}

export const BUBBLE_ARROW_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
] as const;

export type BubbleArrowKey = (typeof BUBBLE_ARROW_KEYS)[number];

export function isBubbleArrowKey(key: string): key is BubbleArrowKey {
  return (BUBBLE_ARROW_KEYS as readonly string[]).includes(key);
}

/**
 * Roving-tabindex movement between bubble marks. The chart is one tab
 * stop; arrow keys move between marks spatially: left/right step along
 * the founding-year axis, up/down along the funding axis. The nearest
 * mark along the pressed axis wins (perpendicular distance breaks ties,
 * id breaks full ties so the result never depends on input order). At the
 * end of an axis the move wraps to the far end, the way a radio group
 * wraps, so every mark is reachable without the mouse. Unknown ids or
 * keys return the current id unchanged.
 */
export function stepMark(
  marks: readonly BubbleMarkPosition[],
  currentId: string,
  key: BubbleArrowKey,
): string {
  if (!isBubbleArrowKey(key)) return currentId;
  const current = marks.find((mark) => mark.id === currentId);
  if (!current) return currentId;

  const alongX = key === 'ArrowLeft' || key === 'ArrowRight';
  const forward = key === 'ArrowRight' || key === 'ArrowDown';
  const axis = (mark: BubbleMarkPosition) => (alongX ? mark.cx : mark.cy);
  const perpendicular = (mark: BubbleMarkPosition) =>
    alongX ? mark.cy : mark.cx;

  const currentAxis = axis(current);
  const candidates = marks.filter((mark) =>
    forward ? axis(mark) > currentAxis : axis(mark) < currentAxis,
  );

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const axisDelta =
        Math.abs(axis(a) - currentAxis) - Math.abs(axis(b) - currentAxis);
      if (axisDelta !== 0) return axisDelta;
      const perpDelta =
        Math.abs(perpendicular(a) - perpendicular(current)) -
        Math.abs(perpendicular(b) - perpendicular(current));
      if (perpDelta !== 0) return perpDelta;
      return a.id.localeCompare(b.id);
    });
    return candidates[0].id;
  }

  // Wrap to the far end of the axis.
  const sorted = [...marks].sort((a, b) =>
    forward ? axis(a) - axis(b) : axis(b) - axis(a),
  );
  return (sorted[0] ?? current).id;
}

export const TIMELINE_ARROW_KEYS = ['ArrowUp', 'ArrowDown'] as const;

export type TimelineArrowKey = (typeof TIMELINE_ARROW_KEYS)[number];

/** A timeline row's identity for roving movement: id plus date. */
export interface TimelineRow {
  id: string;
  date: string;
}

export function isTimelineArrowKey(key: string): key is TimelineArrowKey {
  return (TIMELINE_ARROW_KEYS as readonly string[]).includes(key);
}

/**
 * Roving-tabindex movement between funding-timeline rows, the 1-D
 * counterpart of stepMark: the timeline is one tab stop and ArrowUp /
 * ArrowDown move between rows in render order, which is chronological
 * (date, then company name, the sort timelineEvents already renders).
 * Movement is positional in the array the view renders (the order the
 * reader sees), so equal dates and even unsorted input behave like the
 * visual list. At the ends the move wraps, the way a radio group wraps,
 * so every row is reachable without the mouse. Unknown ids or keys
 * return the current id unchanged.
 */
export function stepTimeline(
  rows: readonly TimelineRow[],
  currentId: string,
  key: TimelineArrowKey,
): string {
  if (!isTimelineArrowKey(key)) return currentId;
  const index = rows.findIndex((row) => row.id === currentId);
  if (index === -1) return currentId;
  const delta = key === 'ArrowDown' ? 1 : -1;
  return rows[(index + delta + rows.length) % rows.length].id;
}

export function formatSubSegment(value: string): string {
  return value.replace(/-/g, ' ');
}

export function formatApproach(value: string): string {
  return value.replace(/-/g, ' ');
}
