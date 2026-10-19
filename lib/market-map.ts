/**
 * Market-map filter, URL, timeline, and bubble-plot logic.
 * Pure functions; UI lives in components/market-map/.
 *
 * Intersection filters, deep-link parsing, and the null-funding plot
 * rule are unit-tested in tests/unit/market-map.test.ts.
 */
import type { AbsentField, Company } from '@/data/schemas/company.ts';

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
  humanoids: 34, // 34 since the 2026-08-18 audit removed the duplicate galaxea-ai-robot row
  'industrial-logistics': 15,
  'vertical-applications': 32,
  'simulation-tooling': 10,
  'components-hardware': 8,
};

export type MarketMapViewId = 'grid' | 'bubble' | 'timeline';

export const VIEW_IDS = ['grid', 'bubble', 'timeline'] as const;

/**
 * The view a bare `/market-map/` URL renders. Named because the primitive
 * sweep derives its extra route states from the views that are NOT the
 * default, and a second literal would let those two drift apart.
 */
export const DEFAULT_MARKET_MAP_VIEW: MarketMapViewId = 'grid';

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
  /**
   * Free-text name search (the `q` param), trimmed. Matches a company's
   * name or any of its other names, case-insensitively.
   */
  query: string | null;
  subSegment: string | null;
  country: string | null;
  status: StatusFilter | null;
  approach: string | null;
  openSource: OpenSourceFilter | null;
  confidence: ConfidenceFilter | null;
}

export const DEFAULT_MARKET_MAP_FILTERS: MarketMapFilters = {
  segment: null,
  query: null,
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
  /** What an empty type or amount renders, from the record's disposition. */
  typeAbsent: string | null;
  amountAbsent: string | null;
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
    filters.query !== null ||
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

/**
 * Two-letter initials for the logo fallback. Parenthetical product names
 * (Optimus, LeRobot) are dropped so the mark names the company, not the
 * product line.
 */
export function companyInitials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    const word = words[0];
    return word.slice(0, Math.min(2, word.length)).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
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

/** Longest search text the URL keeps; anything longer is cut, not refused. */
export const MARKET_MAP_QUERY_MAX = 60;

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Name search: every word of the query must start a word of the company's
 * name or of one of its other names, so "robo" finds "Rainbow Robotics"
 * and "dyn" finds "Boston Dynamics" without "ai" matching every name that
 * merely contains the letters.
 */
export function matchesQuery(company: Company, query: string): boolean {
  const terms = searchable(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (terms.length === 0) return true;
  const words = [company.name, ...company.aka].flatMap((name) =>
    searchable(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
  );
  const joined = [company.name, ...company.aka].map(searchable);
  return terms.every(
    (term) =>
      words.some((word) => word.startsWith(term)) ||
      // A query typed with its own spacing ("deepmind", "1x") still finds
      // the name it spells.
      joined.some((name) => name.replace(/[^\p{L}\p{N}]+/gu, '').startsWith(term)),
  );
}

function matchesFilters(company: Company, filters: MarketMapFilters): boolean {
  if (filters.segment && company.segment !== filters.segment) return false;
  if (filters.query && !matchesQuery(company, filters.query)) return false;
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

/** The query as the URL keeps it: trimmed, inner spaces collapsed, capped. */
export function normalizeQuery(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MARKET_MAP_QUERY_MAX).trim();
  return text === '' ? null : text;
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

  filters.query = normalizeQuery(params.get('q'));

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
  const view = viewRaw && isView(viewRaw) ? viewRaw : DEFAULT_MARKET_MAP_VIEW;

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
    query:
      filters.query !== null && matchesQuery(company, filters.query)
        ? filters.query
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
  if (filters.query) params.set('q', filters.query);
  if (filters.subSegment) params.set('subSegment', filters.subSegment);
  if (filters.country) params.set('country', filters.country);
  if (filters.status) params.set('status', filters.status);
  if (filters.approach) params.set('approach', filters.approach);
  if (filters.openSource) params.set('openSource', filters.openSource);
  if (filters.confidence) params.set('confidence', filters.confidence);
  if (view !== DEFAULT_MARKET_MAP_VIEW) params.set('view', view);
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

export function inapplicableFigure(): string {
  return 'n/a';
}

/**
 * What an empty field renders, read from the disposition the registry
 * records for it (Company.absent). A missing disposition is a data error,
 * never a default: an empty list or a null alone does not say whether the
 * value is undisclosed or inapplicable.
 */
export function absentState(
  company: Company,
  field: AbsentField,
): 'not-disclosed' | 'not-applicable' {
  const absence = company.absent[field];
  if (!absence) {
    throw new Error(`${company.id}: no recorded disposition for empty ${field}`);
  }
  return absence.state;
}

export function absentFigure(company: Company, field: AbsentField): string {
  return absentState(company, field) === 'not-applicable'
    ? inapplicableFigure()
    : unknownFigure();
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

/**
 * The source a company's latest-round figures rest on: the round's own
 * pointer when it names one of the company's sources, otherwise the first
 * source. sources[] is append-ordered provenance, so after an audit appends
 * a corrected source the first entry can describe a superseded round; the
 * pointer is the truth whenever it is set (data/schemas/company.ts). Its
 * asOf is the date the round's figures were last read, which is the date
 * a reader should see next to them.
 */
export function roundSource(company: Company): Company['sources'][number] | null {
  const pointer = company.latestRound?.sourceUrl;
  if (pointer) {
    const linked = company.sources.find((candidate) => candidate.url === pointer);
    if (linked) return linked;
  }
  return company.sources[0] ?? null;
}

/**
 * The name a map tile shows: the registry name without the parenthetical
 * division or product line ("Google DeepMind (Robotics)" is listed under
 * Google DeepMind). The full name stays in the tile's accessible name and
 * in the detail view.
 */
export function companyShortName(name: string): string {
  const short = name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  return short === '' ? name : short;
}

export type TileFact =
  | { kind: 'status'; text: string; label: string }
  | { kind: 'round'; text: string; label: string }
  | { kind: 'none'; text: ''; label: string };

/**
 * The one quiet fact a map tile carries. A company that is no longer
 * private shows that status (listed, acquired, shut down), because a round
 * amount next to an acquired company would read as current funding. A
 * private company shows the amount of its latest disclosed round. Nothing
 * else is ever shown: an undisclosed amount leaves the slot empty instead of
 * printing a zero, and the label (read by screen readers) says so.
 */
export function tileFact(company: Company): TileFact {
  const status = companyStatusLabel(company);
  if (status !== 'Private') {
    // "Acquired (bankruptcy)" keeps its qualifier in the label and the
    // detail view; the tile has room for the status word alone.
    const text = status.replace(/\s*\(.*\)$/, '');
    return { kind: 'status', text, label: status.toLowerCase() };
  }
  const amount = company.latestRound?.amountUsd ?? null;
  if (amount !== null) {
    const round = company.latestRound?.type;
    return {
      kind: 'round',
      text: formatUsd(amount),
      label: `latest round ${formatUsd(amount)}${round ? `, ${round}` : ''}`,
    };
  }
  return {
    kind: 'none',
    text: '',
    label: `latest round amount ${absentFigure(company, 'round.amountUsd')}`,
  };
}

export function timelineEvents(
  companies: readonly Company[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const company of companies) {
    const round = company.latestRound;
    if (!round?.date) continue;
    if (round.date < '2023-01-01' || round.date > '2026-12-31') continue;
    const source = roundSource(company);
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
      typeAbsent: round.type === null ? absentFigure(company, 'round.type') : null,
      amountAbsent:
        round.amountUsd === null ? absentFigure(company, 'round.amountUsd') : null,
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

/** One column of the wide map: one segment across `span` grid tracks, or a stack. */
export interface MapColumn {
  /** Indexes into the segment list, top to bottom. */
  segments: number[];
  /** Grid tracks the column spans; a stack of segments always takes one. */
  span: number;
}

/** A segment heading's height, in tile rows. */
const MAP_HEADER_ROWS = 1;

/**
 * Lays the visible segments out as the columns of the wide map, in their
 * order, over exactly `tracks` grid tracks, so the tallest column is as
 * short as possible. A segment can take several tracks (its tiles then run
 * that many abreast), and neighbouring segments can share one track as a
 * stack. With all six segments over seven tracks: humanoids and vertical
 * applications take two each, and simulation/tooling sits above components,
 * so no column is deeper than 20 rows where one column per segment would
 * run humanoids 34 deep. Ties go to fewer stacks, then to the more even
 * layout. Segments with no visible company are skipped.
 */
export function planMapColumns(counts: readonly number[], tracks: number): MapColumn[] {
  const visible = counts.flatMap((count, index) => (count > 0 ? [index] : []));
  if (visible.length === 0 || tracks < 1) return [];
  type Plan = { columns: MapColumn[]; tallest: number; stacks: number; spread: number };
  const memo = new Map<string, Plan | null>();
  const height = (column: MapColumn) =>
    column.segments.length > 1
      ? column.segments.reduce((sum, index) => sum + counts[index] + MAP_HEADER_ROWS, 0)
      : Math.ceil(counts[column.segments[0]] / column.span) + MAP_HEADER_ROWS;
  const better = (a: Plan, b: Plan | null) =>
    !b ||
    a.tallest < b.tallest ||
    (a.tallest === b.tallest &&
      (a.stacks < b.stacks || (a.stacks === b.stacks && a.spread < b.spread)));
  function plan(from: number, left: number): Plan | null {
    if (from === visible.length) return left === 0 ? { columns: [], tallest: 0, stacks: 0, spread: 0 } : null;
    if (left <= 0) return null;
    const key = `${from}:${left}`;
    if (memo.has(key)) return memo.get(key)!;
    let best: Plan | null = null;
    const consider = (column: MapColumn, rest: Plan | null) => {
      if (!rest) return;
      const h = height(column);
      const candidate: Plan = {
        columns: [column, ...rest.columns],
        tallest: Math.max(h, rest.tallest),
        stacks: rest.stacks + (column.segments.length > 1 ? 1 : 0),
        spread: rest.spread + h * h,
      };
      if (better(candidate, best)) best = candidate;
    };
    for (let span = 1; span <= left; span += 1) {
      consider({ segments: [visible[from]], span }, plan(from + 1, left - span));
    }
    for (let end = from + 2; end <= visible.length; end += 1) {
      consider({ segments: visible.slice(from, end), span: 1 }, plan(end, left - 1));
    }
    memo.set(key, best);
    return best;
  }
  // Fewer segments than tracks never strands a track: spans absorb them.
  return plan(0, tracks)?.columns ?? visible.map((index) => ({ segments: [index], span: 1 }));
}

export const MAP_ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'] as const;

export type MapArrowKey = (typeof MAP_ARROW_KEYS)[number];

export function isMapArrowKey(key: string): key is MapArrowKey {
  return (MAP_ARROW_KEYS as readonly string[]).includes(key);
}

/** A map tile's identity and on-screen box, in reading order. */
export interface MapTileBox {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Roving movement over the map's tiles, which form one tab stop. Left and
 * Right step through the tiles in reading order (segment by segment, row by
 * row inside a segment) and wrap at the ends, like a list. Up and Down stay
 * in the column under the focused tile and stop at its ends, so they never
 * jump sideways into another segment. Home and End go to the first and last
 * tile. Unknown ids return the current id.
 */
export function stepTile(
  tiles: readonly MapTileBox[],
  currentId: string,
  key: MapArrowKey,
): string {
  const index = tiles.findIndex((tile) => tile.id === currentId);
  if (index === -1 || tiles.length === 0) return currentId;
  if (key === 'Home') return tiles[0].id;
  if (key === 'End') return tiles[tiles.length - 1].id;
  if (key === 'ArrowRight') return tiles[(index + 1) % tiles.length].id;
  if (key === 'ArrowLeft') return tiles[(index - 1 + tiles.length) % tiles.length].id;
  const current = tiles[index];
  const centre = current.left + current.width / 2;
  const below = key === 'ArrowDown';
  const sameColumn = tiles.filter(
    (tile) =>
      tile.id !== current.id &&
      Math.abs(tile.left + tile.width / 2 - centre) < current.width / 2 &&
      (below ? tile.top > current.top + 1 : tile.top < current.top - 1),
  );
  if (sameColumn.length === 0) return currentId;
  sameColumn.sort((a, b) => (below ? a.top - b.top : b.top - a.top));
  return sameColumn[0].id;
}
