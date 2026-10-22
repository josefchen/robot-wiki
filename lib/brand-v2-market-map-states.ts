import { z } from 'zod';
import { COMPANIES } from '../data/companies.ts';
import type { Company } from '../data/schemas/company.ts';
import {
  companySegmentSchema,
  companyStatusSchema,
} from '../data/schemas/company.ts';
import { confidenceSchema } from '../data/schemas/shared.ts';
import type { StateCase } from './brand-v2-census.ts';
import { deriveEvidenceClosure } from './brand-v2-evidence-closure.ts';
import {
  accountInteractiveCases,
  validateInteractiveCaseAccounting,
} from './brand-v2-interactive-accounting.ts';

/**
 * The market map's §1.15 bounded-state registry and its evidence family:
 * the persisted browser sweep behind `VAL-B2-MAP-011` (and the mission's
 * VAL-MKT-005, -006 and -026).
 *
 * The map is not under `components/interactive/`, so the census that builds
 * `contract/brand-v2-registries.json#interactive` never sees it. Its one
 * source and one mount are registered here instead, with the same
 * `StateCase` records and the same accounting the census runner uses, and
 * every case is derived: filter options from the canonical company registry
 * (`data/companies.ts`) and the schema enums, the pairwise cases from a
 * pinned IPOG generator, and each case's expected company-ID set from an
 * independent reading of the registry rather than from the map's own filter
 * and plotting functions (`lib/market-map.ts` is not imported here). No
 * total or segment count is written down anywhere: every number the sweep
 * compares against is computed from the registry it runs on.
 */

export const MARKET_MAP_STATES_EVIDENCE_PATH =
  'evidence/brand-v2/market-map-states.json';

/** The case groups MAP-011 quantifies over, one result row per group. */
export const MARKET_MAP_CASE_GROUP_POPULATION_SOURCE =
  'evidence/brand-v2/market-map-states.json#caseGroups';

export const MARKET_MAP_ROUTE = '/market-map/';

export const MARKET_MAP_VIEWPORT = {
  id: '1440x900',
  width: 1440,
  height: 900,
} as const;

/** Pinned pairwise generator: the census names the same algorithm and seed. */
export const MARKET_MAP_PAIRWISE_ALGORITHM = 'ipog';
export const MARKET_MAP_PAIRWISE_SEED = 'brand-v2-state-v1';

/** The research-page focus ring: a 1 px ink outline offset 2 px. */
export const MARKET_MAP_FOCUS_RING = {
  style: 'solid',
  width: '1px',
  color: 'rgb(28, 28, 26)',
  offset: '2px',
} as const;

/*
 * Update timing. A filter change is a synchronous pass over a registry
 * compiled into the page. "Instant" is judged by where the update lands,
 * not by a millisecond figure: every step must already show once its own
 * event's task has run (the microtasks it queued included), so it waited
 * for no timer, frame or response. A millisecond budget cannot carry that
 * claim on a shared machine, where minute-long bursts of memory pressure
 * have slowed every render a hundredfold; latencies are recorded as
 * figures, and the only timed gate is the ceiling below.
 */

/**
 * No single update takes longer than this, past which the probe stops
 * waiting for the state to land and the case is a hang.
 */
export const MARKET_MAP_UPDATE_CEILING_MS = 10_000;

/**
 * A case over the ceiling is measured again from a fresh reset, up to this
 * many samples in all, and judged by its fastest one: a hang that repeats
 * fails. Every sample is recorded, and a case may only be re-measured after
 * a sample over the ceiling.
 */
export const MARKET_MAP_LATENCY_SAMPLES = 3;

export const MARKET_MAP_INTERACTIVE_SOURCE = {
  id: 'components/market-map/market-map.tsx',
  modules: [
    'components/market-map/market-map.tsx',
    'components/market-map/filter-bar.tsx',
    'components/market-map/grid-view.tsx',
    'components/market-map/bubble-view.tsx',
    'components/market-map/funding-timeline.tsx',
    'components/market-map/company-sheet.tsx',
  ],
} as const;

export const MARKET_MAP_MOUNT = {
  id: 'mount:/market-map/#market-map',
  sourceId: MARKET_MAP_INTERACTIVE_SOURCE.id,
  route: MARKET_MAP_ROUTE,
} as const;

export const MARKET_MAP_VIEWS = ['grid', 'bubble', 'timeline'] as const;
export type MarketMapView = (typeof MARKET_MAP_VIEWS)[number];

/** The view a bare URL renders; it writes no `view` param. */
export const MARKET_MAP_DEFAULT_VIEW: MarketMapView = 'grid';

/** The discrete filter dimensions, in the order the filter bar renders them. */
export const MARKET_MAP_FILTER_DIMENSIONS = [
  'segment',
  'subSegment',
  'country',
  'status',
  'approach',
  'openSource',
  'confidence',
] as const;
export type MarketMapFilterDimension =
  (typeof MARKET_MAP_FILTER_DIMENSIONS)[number];

/**
 * Sub-segment options depend on the chosen segment, so the sub-segment is
 * not an independent control: it is covered option by option under its own
 * segment (the dependent group) and left out of the pairwise generator.
 */
export const MARKET_MAP_INDEPENDENT_DIMENSIONS = [
  'segment',
  'country',
  'status',
  'approach',
  'openSource',
  'confidence',
] as const satisfies readonly MarketMapFilterDimension[];

/** The URL param and the `<select>` id each dimension writes and renders. */
export const MARKET_MAP_DIMENSION_CONTROLS: Record<
  MarketMapFilterDimension,
  { param: string; selectId: string | null }
> = {
  segment: { param: 'segment', selectId: null },
  subSegment: { param: 'subSegment', selectId: 'filter-subsegment' },
  country: { param: 'country', selectId: 'filter-country' },
  status: { param: 'status', selectId: 'filter-status' },
  approach: { param: 'approach', selectId: 'filter-approach' },
  openSource: { param: 'openSource', selectId: 'filter-opensource' },
  confidence: { param: 'confidence', selectId: 'filter-confidence' },
};

/**
 * The stage/status filter is a closed product enum over two record fields:
 * four of its options read `status`, and "IPO" reads the latest round. Each
 * option's predicate is written here from the contract (VAL-MKT-022), not
 * borrowed from the map's own matcher.
 */
const STATUS_OPTION_PREDICATES: ReadonlyArray<
  readonly [string, (company: Company) => boolean]
> = [
  ['private', (company) => company.status === 'private'],
  ['public', (company) => company.status === 'public'],
  ['acquired', (company) => company.status === 'acquired'],
  ['ipo', (company) => company.latestRound?.type === 'IPO'],
  ['shut-down', (company) => company.status === 'dead'],
];

export type MarketMapFilters = Partial<
  Record<MarketMapFilterDimension | 'query', string>
>;

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

/** Every discrete option a control offers, derived from the registry. */
export function marketMapFilterOptions(
  companies: readonly Company[] = COMPANIES,
  segment: string | null = null,
): Record<MarketMapFilterDimension, string[]> {
  const statusEnum = new Set<string>(companyStatusSchema.options);
  for (const [option] of STATUS_OPTION_PREDICATES) {
    if (['private', 'public', 'acquired'].includes(option) && !statusEnum.has(option)) {
      throw new Error(
        `the status option ${option} names a record status the schema no longer has`,
      );
    }
  }
  if (!statusEnum.has('dead')) {
    throw new Error('the shut-down status option reads a status the schema no longer has');
  }
  const pool =
    segment === null
      ? companies
      : companies.filter((company) => company.segment === segment);
  return {
    segment: [...companySegmentSchema.options],
    subSegment: sortedUnique(
      pool.flatMap((company) => (company.subSegment ? [company.subSegment] : [])),
    ),
    country: sortedUnique(companies.map((company) => company.hq.country)),
    status: STATUS_OPTION_PREDICATES.map(([option]) => option),
    approach: sortedUnique(companies.flatMap((company) => company.approach)),
    openSource: ['yes', 'no'],
    confidence: [...confidenceSchema.options],
  };
}

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * The documented name-search rule: each query word starts a word of the
 * company's name or of one of its other names, or starts the name with its
 * separators removed.
 */
function nameMatches(company: Company, query: string): boolean {
  const split = (text: string) =>
    searchable(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const terms = split(query);
  const names = [company.name, ...company.aka];
  const words = names.flatMap(split);
  const joined = names.map((name) =>
    searchable(name).replace(/[^\p{L}\p{N}]+/gu, ''),
  );
  return terms.every(
    (term) =>
      words.some((word) => word.startsWith(term)) ||
      joined.some((name) => name.startsWith(term)),
  );
}

function companyMatches(company: Company, filters: MarketMapFilters): boolean {
  if (filters.segment && company.segment !== filters.segment) return false;
  if (filters.subSegment && company.subSegment !== filters.subSegment) return false;
  if (filters.country && company.hq.country !== filters.country) return false;
  if (filters.status) {
    const predicate = STATUS_OPTION_PREDICATES.find(
      ([option]) => option === filters.status,
    )?.[1];
    if (!predicate) throw new Error(`unregistered status option ${filters.status}`);
    if (!predicate(company)) return false;
  }
  if (filters.approach && !company.approach.includes(filters.approach)) return false;
  if (filters.openSource === 'yes' && company.openSource.length === 0) return false;
  if (filters.openSource === 'no' && company.openSource.length > 0) return false;
  if (filters.confidence && company.confidence !== filters.confidence) return false;
  if (filters.query && !nameMatches(company, filters.query)) return false;
  return true;
}

/** The registry records an intersection of filters keeps. */
export function expectedCompanies(
  filters: MarketMapFilters,
  companies: readonly Company[] = COMPANIES,
): Company[] {
  return companies.filter((company) => companyMatches(company, filters));
}

/**
 * The bubble chart plots founding year against the latest valuation, or the
 * total raised where no valuation is disclosed (VAL-MKT-023): a company
 * with no founding year or no positive figure is left off, never drawn at
 * zero.
 */
export function expectedBubbleIds(companies: readonly Company[]): string[] {
  return companies
    .filter((company) => {
      if (company.founded === null) return false;
      const figure = company.latestRound?.valuationUsd ?? company.totalRaisedUsd;
      return figure !== null && figure > 0;
    })
    .map(({ id }) => id);
}

/** The funding timeline's window (VAL-MKT-015): rounds dated 2023 to 2026. */
export const MARKET_MAP_TIMELINE_WINDOW = {
  from: '2023-01-01',
  to: '2026-12-31',
} as const;

export type ExpectedTimelineEvent = {
  id: string;
  companyId: string;
  companyName: string;
  date: string;
};

/**
 * One event per company whose latest round is dated inside the window and
 * cited (VAL-MKT-016), oldest first and by name within a day, the order the
 * list and the plot both state.
 */
export function expectedTimelineEvents(
  companies: readonly Company[],
): ExpectedTimelineEvent[] {
  return companies
    .flatMap((company) => {
      const date = company.latestRound?.date ?? null;
      if (
        date === null ||
        date < MARKET_MAP_TIMELINE_WINDOW.from ||
        date > MARKET_MAP_TIMELINE_WINDOW.to ||
        company.sources.length === 0
      ) {
        return [];
      }
      return [
        { id: `${company.id}-${date}`, companyId: company.id, companyName: company.name, date },
      ];
    })
    .sort((left, right) =>
      left.date === right.date
        ? left.companyName.localeCompare(right.companyName)
        : left.date.localeCompare(right.date),
    );
}

/** What each view draws for a filtered set: one element per company. */
export function expectedRenderedIds(
  filters: MarketMapFilters,
  view: MarketMapView,
  companies: readonly Company[] = COMPANIES,
): string[] {
  const kept = expectedCompanies(filters, companies);
  if (view === 'grid') return kept.map(({ id }) => id).sort();
  if (view === 'bubble') return expectedBubbleIds(kept).sort();
  return expectedTimelineEvents(kept)
    .map(({ companyId }) => companyId)
    .sort();
}

/** The URL query the map must write for a filter state and view. */
export function expectedSearchParams(
  filters: MarketMapFilters,
  view: MarketMapView = MARKET_MAP_DEFAULT_VIEW,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const dimension of MARKET_MAP_FILTER_DIMENSIONS) {
    const value = filters[dimension];
    if (value) params[MARKET_MAP_DIMENSION_CONTROLS[dimension].param] = value;
  }
  if (filters.query) params.q = filters.query;
  if (view !== MARKET_MAP_DEFAULT_VIEW) params.view = view;
  return Object.fromEntries(
    Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function expectedCountText(
  filters: MarketMapFilters,
  companies: readonly Company[] = COMPANIES,
): string {
  return `${expectedCompanies(filters, companies).length} of ${companies.length} companies`;
}

/**
 * The count each segment tab shows: how many companies choosing it would
 * leave under every other active filter.
 */
export function expectedSegmentTabCounts(
  filters: MarketMapFilters,
  companies: readonly Company[] = COMPANIES,
): Record<string, number> {
  const pool = expectedCompanies(
    { ...filters, segment: undefined, subSegment: undefined },
    companies,
  );
  const counts: Record<string, number> = { all: pool.length };
  for (const segment of companySegmentSchema.options) {
    counts[segment] = pool.filter((company) => company.segment === segment).length;
  }
  return counts;
}

/** The grid's band counts: one band per segment that keeps a company. */
export function expectedBandCounts(
  filters: MarketMapFilters,
  companies: readonly Company[] = COMPANIES,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const company of expectedCompanies(filters, companies)) {
    counts[company.segment] = (counts[company.segment] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

/* ------------------------------------------------------------------ */
/* Pinned pairwise generator                                           */
/* ------------------------------------------------------------------ */

export type PairwiseDimension = {
  id: string;
  /** Every level; the first is the reset level a don't-care position takes. */
  values: readonly string[];
};

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic IPOG (in-parameter-order) pairwise generation.
 *
 * Dimensions are processed largest first (input order breaks ties). The
 * first two seed the set with their full cross product; each later one
 * grows it horizontally, giving every existing row the level that covers
 * the most still-uncovered pairs, then vertically, filling a don't-care
 * position or adding a row for each pair still uncovered. Ties between
 * levels that cover the same positive number of new pairs fall to a
 * permutation drawn from the seed; a row where no level covers a new pair
 * keeps the dimension at its reset level, as does every don't-care left at
 * the end, so a row only sets the filters a pair needs. Identical rows
 * collapse to their first occurrence.
 */
export function ipogPairwise(
  dimensions: readonly PairwiseDimension[],
  seed: string,
): Array<Record<string, string>> {
  if (dimensions.length < 2) {
    throw new Error('pairwise generation needs at least two dimensions');
  }
  for (const dimension of dimensions) {
    if (dimension.values.length === 0) {
      throw new Error(`pairwise dimension ${dimension.id} has no levels`);
    }
    if (new Set(dimension.values).size !== dimension.values.length) {
      throw new Error(`pairwise dimension ${dimension.id} repeats a level`);
    }
  }
  if (new Set(dimensions.map(({ id }) => id)).size !== dimensions.length) {
    throw new Error('pairwise dimensions repeat an id');
  }
  const order = dimensions
    .map((dimension, index) => ({ dimension, index }))
    .sort(
      (left, right) =>
        right.dimension.values.length - left.dimension.values.length ||
        left.index - right.index,
    )
    .map(({ dimension }) => dimension);
  const random = mulberry32(fnv1a(seed));
  // rank[k][level]: the seeded tie-break priority of each level.
  const rank = order.map(({ values }) => {
    const permutation = values.map((_, index) => index);
    for (let index = permutation.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [permutation[index], permutation[swap]] = [permutation[swap], permutation[index]];
    }
    const priority = new Array<number>(values.length);
    permutation.forEach((level, position) => {
      priority[level] = position;
    });
    return priority;
  });

  type Row = Array<number | null>;
  const rows: Row[] = [];
  for (let first = 0; first < order[0].values.length; first += 1) {
    for (let second = 0; second < order[1].values.length; second += 1) {
      rows.push([first, second]);
    }
  }
  const pairKey = (earlier: number, earlierLevel: number, level: number) =>
    `${earlier}:${earlierLevel}:${level}`;

  for (let k = 2; k < order.length; k += 1) {
    const uncovered = new Set<string>();
    for (let j = 0; j < k; j += 1) {
      for (let earlierLevel = 0; earlierLevel < order[j].values.length; earlierLevel += 1) {
        for (let level = 0; level < order[k].values.length; level += 1) {
          uncovered.add(pairKey(j, earlierLevel, level));
        }
      }
    }
    for (const row of rows) {
      let best = 0;
      let bestGain = 0;
      for (let level = 0; level < order[k].values.length; level += 1) {
        let gain = 0;
        for (let j = 0; j < k; j += 1) {
          const earlierLevel = row[j];
          if (earlierLevel !== null && uncovered.has(pairKey(j, earlierLevel, level))) {
            gain += 1;
          }
        }
        if (
          gain > bestGain ||
          (gain === bestGain && gain > 0 && rank[k][level] < rank[k][best])
        ) {
          best = level;
          bestGain = gain;
        }
      }
      row.push(best);
      for (let j = 0; j < k; j += 1) {
        const earlierLevel = row[j];
        if (earlierLevel !== null) uncovered.delete(pairKey(j, earlierLevel, best));
      }
    }
    for (let j = 0; j < k; j += 1) {
      for (let earlierLevel = 0; earlierLevel < order[j].values.length; earlierLevel += 1) {
        for (let level = 0; level < order[k].values.length; level += 1) {
          const key = pairKey(j, earlierLevel, level);
          if (!uncovered.has(key)) continue;
          const open = rows.find((row) => row[k] === level && row[j] === null);
          if (open) {
            open[j] = earlierLevel;
          } else {
            const row: Row = new Array(k + 1).fill(null);
            row[j] = earlierLevel;
            row[k] = level;
            rows.push(row);
          }
          uncovered.delete(key);
        }
      }
    }
  }

  const seen = new Set<string>();
  const cases: Array<Record<string, string>> = [];
  for (const row of rows) {
    const levels = row.map((level) => level ?? 0);
    const key = levels.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const record: Record<string, string> = {};
    for (const dimension of dimensions) {
      const position = order.indexOf(dimension);
      record[dimension.id] = dimension.values[levels[position]];
    }
    cases.push(record);
  }
  return cases;
}

/** The value pairs a case list leaves uncovered (empty for a covering array). */
export function uncoveredPairs(
  dimensions: readonly PairwiseDimension[],
  cases: ReadonlyArray<Record<string, string>>,
): string[] {
  const covered = new Set<string>();
  for (const row of cases) {
    for (let left = 0; left < dimensions.length; left += 1) {
      for (let right = left + 1; right < dimensions.length; right += 1) {
        covered.add(
          `${dimensions[left].id}=${row[dimensions[left].id]}|${dimensions[right].id}=${row[dimensions[right].id]}`,
        );
      }
    }
  }
  const missing: string[] = [];
  for (let left = 0; left < dimensions.length; left += 1) {
    for (let right = left + 1; right < dimensions.length; right += 1) {
      for (const leftValue of dimensions[left].values) {
        for (const rightValue of dimensions[right].values) {
          const key = `${dimensions[left].id}=${leftValue}|${dimensions[right].id}=${rightValue}`;
          if (!covered.has(key)) missing.push(key);
        }
      }
    }
  }
  return missing;
}

/* ------------------------------------------------------------------ */
/* The case registry                                                   */
/* ------------------------------------------------------------------ */

export const MARKET_MAP_CASE_GROUPS = [
  'default-reset',
  'views',
  'single-options',
  'dependent-options',
  'pairwise',
  'higher-order',
  'selection',
  'url-history',
  'tooltip-parity',
  'states',
  'focus-keyboard',
] as const;
export type MarketMapCaseGroup = (typeof MARKET_MAP_CASE_GROUPS)[number];

export type MarketMapDismissal = 'close' | 'escape' | 'back';

export type MarketMapCase = StateCase & {
  group: MarketMapCaseGroup;
  /** Filter cases: the state applied from reset, and the view it is read in. */
  filters?: MarketMapFilters;
  view?: MarketMapView;
  /** The order the filters are applied in, when a case pins it. */
  applyOrder?: readonly (MarketMapFilterDimension | 'query')[];
  /** Selection, history and tooltip cases: the company or event they open. */
  companyId?: string;
  eventId?: string;
  dismissal?: MarketMapDismissal;
  /** The named invariant a registered higher-order combination exists for. */
  invariant?: string;
};

/**
 * The explicitly registered higher-order combinations. Each names the
 * invariant it exists for; nothing else above two dimensions is generated.
 * A combination whose option the registry no longer offers is refused when
 * the plan is built, rather than silently testing an empty intersection.
 */
export const MARKET_MAP_HIGHER_ORDER = [
  {
    id: 'filters-survive-view-switch',
    invariant: 'a filter state survives each view switch and every view draws the same intersection (VAL-MKT-008)',
    filters: { segment: 'humanoids', country: 'CN' },
    views: MARKET_MAP_VIEWS,
  },
  {
    id: 'three-way-order-independent',
    invariant: 'a three-way intersection is the same set and URL whichever order its filters are applied in',
    filters: { segment: 'humanoids', country: 'US', status: 'private' },
    orders: [
      ['segment', 'country', 'status'],
      ['status', 'country', 'segment'],
    ],
  },
  {
    id: 'every-dimension-keeps-its-witness',
    invariant: 'setting every discrete dimension at once to one company’s own values still keeps that company',
    witness: 'figure-ai',
  },
  {
    id: 'name-search-composes-with-segment',
    invariant: 'the name search intersects with the segment filter rather than replacing it',
    filters: { segment: 'humanoids', query: 'figure' },
  },
] as const;

function filterQuery(filters: MarketMapFilters): string {
  const params = expectedSearchParams(filters);
  return new URLSearchParams(params).toString();
}

function statusOptionOf(company: Company): string {
  const match = STATUS_OPTION_PREDICATES.find(
    ([option, predicate]) => option === 'ipo' && predicate(company),
  );
  if (match) return match[0];
  return company.status === 'dead' ? 'shut-down' : company.status;
}

export type MarketMapStatePlan = {
  source: typeof MARKET_MAP_INTERACTIVE_SOURCE;
  mount: typeof MARKET_MAP_MOUNT;
  viewport: typeof MARKET_MAP_VIEWPORT;
  generator: {
    algorithm: string;
    seed: string;
    dimensions: string[];
    levels: Record<string, number>;
  };
  cases: MarketMapCase[];
};

function assertOffered(
  dimension: MarketMapFilterDimension,
  value: string,
  options: Record<MarketMapFilterDimension, string[]>,
  caseId: string,
) {
  if (!options[dimension].includes(value)) {
    throw new Error(
      `registered case ${caseId} sets ${dimension}=${value}, which the registry no longer offers`,
    );
  }
}

/** The full, ordered case list for the one market-map mount. */
export function marketMapStatePlan(
  companies: readonly Company[] = COMPANIES,
): MarketMapStatePlan {
  if (companies.length === 0) {
    throw new Error('the company registry is empty, so the market map has no cases');
  }
  const options = marketMapFilterOptions(companies);
  const cases: MarketMapCase[] = [];

  cases.push(
    { id: 'default', kind: 'default', group: 'default-reset', filters: {}, view: 'grid' },
    {
      id: 'reset',
      kind: 'reset',
      group: 'default-reset',
      filters: {},
      view: 'grid',
    },
  );

  for (const view of MARKET_MAP_VIEWS) {
    cases.push({
      id: `view:${view}`,
      kind: 'discrete-options',
      group: 'views',
      filters: {},
      view,
    });
  }

  for (const dimension of MARKET_MAP_FILTER_DIMENSIONS) {
    for (const value of options[dimension]) {
      cases.push({
        id: `option:${dimension}=${value}`,
        kind: 'discrete-options',
        group: 'single-options',
        filters: { [dimension]: value },
        view: 'grid',
      });
    }
  }

  for (const segment of options.segment) {
    for (const subSegment of marketMapFilterOptions(companies, segment).subSegment) {
      cases.push({
        id: `dependent:segment=${segment}&subSegment=${subSegment}`,
        kind: 'discrete-options',
        group: 'dependent-options',
        filters: { segment, subSegment },
        view: 'grid',
      });
    }
  }

  const pairwiseDimensions: PairwiseDimension[] =
    MARKET_MAP_INDEPENDENT_DIMENSIONS.map((dimension) => ({
      id: dimension,
      values: ['', ...options[dimension]],
    }));
  const pairwise = ipogPairwise(pairwiseDimensions, MARKET_MAP_PAIRWISE_SEED);
  for (const row of pairwise) {
    const filters: MarketMapFilters = {};
    for (const dimension of MARKET_MAP_INDEPENDENT_DIMENSIONS) {
      if (row[dimension]) filters[dimension] = row[dimension];
    }
    cases.push({
      id: `pairwise:${filterQuery(filters) || 'reset'}`,
      kind: 'pairwise',
      group: 'pairwise',
      filters,
      view: 'grid',
    });
  }

  for (const registered of MARKET_MAP_HIGHER_ORDER) {
    if (registered.id === 'filters-survive-view-switch') {
      for (const view of registered.views) {
        const id = `higher-order:${registered.id}:${view}`;
        for (const [dimension, value] of Object.entries(registered.filters)) {
          assertOffered(dimension as MarketMapFilterDimension, value, options, id);
        }
        cases.push({
          id,
          kind: 'discrete-options',
          group: 'higher-order',
          filters: { ...registered.filters },
          view,
          invariant: registered.invariant,
        });
      }
    } else if (registered.id === 'three-way-order-independent') {
      for (const order of registered.orders) {
        const id = `higher-order:${registered.id}:${order.join('>')}`;
        for (const [dimension, value] of Object.entries(registered.filters)) {
          assertOffered(dimension as MarketMapFilterDimension, value, options, id);
        }
        cases.push({
          id,
          kind: 'discrete-options',
          group: 'higher-order',
          filters: { ...registered.filters },
          applyOrder: order,
          view: 'grid',
          invariant: registered.invariant,
        });
      }
    } else if (registered.id === 'every-dimension-keeps-its-witness') {
      const witness = companies.find(({ id }) => id === registered.witness);
      const id = `higher-order:${registered.id}:${registered.witness}`;
      if (!witness) {
        throw new Error(`registered case ${id} names a company the registry no longer has`);
      }
      if (!witness.subSegment || witness.approach.length === 0) {
        throw new Error(
          `registered case ${id} needs a witness with a sub-segment and an approach tag`,
        );
      }
      const filters: MarketMapFilters = {
        segment: witness.segment,
        subSegment: witness.subSegment,
        country: witness.hq.country,
        status: statusOptionOf(witness),
        approach: [...witness.approach].sort()[0],
        openSource: witness.openSource.length > 0 ? 'yes' : 'no',
        confidence: witness.confidence,
      };
      cases.push({
        id,
        kind: 'discrete-options',
        group: 'higher-order',
        filters,
        view: 'grid',
        companyId: witness.id,
        invariant: registered.invariant,
      });
    } else {
      const id = `higher-order:${registered.id}`;
      assertOffered('segment', registered.filters.segment, options, id);
      cases.push({
        id,
        kind: 'discrete-options',
        group: 'higher-order',
        filters: { ...registered.filters },
        applyOrder: ['segment', 'query'],
        view: 'grid',
        invariant: registered.invariant,
      });
    }
  }

  const gridTarget = companies[0];
  const bubbleIds = expectedBubbleIds(companies);
  const events = expectedTimelineEvents(companies);
  const bubbleTarget = bubbleIds[0];
  const timelineTarget = events[0];
  if (!bubbleTarget || !timelineTarget) {
    throw new Error('the registry plots no bubble or dates no round, so a view has no selection case');
  }
  const targets: Record<MarketMapView, { companyId: string; eventId?: string }> = {
    grid: { companyId: gridTarget.id },
    bubble: { companyId: bubbleTarget },
    timeline: { companyId: timelineTarget.companyId, eventId: timelineTarget.id },
  };
  for (const view of MARKET_MAP_VIEWS) {
    cases.push({
      id: `selection:${view}:open`,
      kind: 'discrete-options',
      group: 'selection',
      view,
      filters: {},
      ...targets[view],
    });
    for (const dismissal of ['close', 'escape', 'back'] as const) {
      cases.push({
        id: `selection:${view}:dismiss-${dismissal}`,
        kind: 'discrete-options',
        group: 'selection',
        view,
        filters: {},
        dismissal,
        ...targets[view],
      });
    }
  }

  // Filters write the URL with replaceState and never stack history; only
  // opening a company pushes an entry. So filter state is restored by the
  // URL itself (a fresh load, a return through Back from another page, a
  // reload), and details are restored by Back and Forward over the pushed
  // entry without a reload.
  const deepLink = MARKET_MAP_HIGHER_ORDER[0].filters;
  const segmentFilter = { segment: deepLink.segment };
  const detailsTarget = expectedCompanies(segmentFilter, companies)[0];
  if (!detailsTarget) {
    throw new Error(`no company is in ${deepLink.segment}, so the details history case has no target`);
  }
  cases.push(
    {
      id: 'url:deep-link-filters-and-view',
      kind: 'discrete-options',
      group: 'url-history',
      filters: { ...deepLink },
      view: 'timeline',
    },
    {
      id: 'url:deep-link-company',
      kind: 'discrete-options',
      group: 'url-history',
      filters: {},
      view: 'grid',
      companyId: gridTarget.id,
    },
    {
      id: 'history:filters-return-and-reload',
      kind: 'discrete-options',
      group: 'url-history',
      filters: { ...deepLink },
      view: 'bubble',
    },
    {
      id: 'history:details-back-forward',
      kind: 'discrete-options',
      group: 'url-history',
      filters: segmentFilter,
      view: 'grid',
      companyId: detailsTarget.id,
    },
  );

  for (const id of bubbleIds) {
    cases.push({
      id: `tooltip:bubble:${id}`,
      kind: 'hover',
      group: 'tooltip-parity',
      view: 'bubble',
      filters: {},
      companyId: id,
    });
  }
  for (const event of events) {
    cases.push({
      id: `tooltip:timeline:${event.id}`,
      kind: 'hover',
      group: 'tooltip-parity',
      view: 'timeline',
      filters: {},
      companyId: event.companyId,
      eventId: event.id,
    });
  }

  const singles = cases.filter(({ group }) => group === 'single-options');
  const emptyWitness = singles.find(
    ({ filters }) => expectedCompanies(filters ?? {}, companies).length === 0,
  ) ?? cases.find(
    ({ group, filters }) =>
      group === 'pairwise' && expectedCompanies(filters ?? {}, companies).length === 0,
  );
  const unplottedWitness = singles.find(({ filters }) => {
    const kept = expectedCompanies(filters ?? {}, companies);
    return kept.length > 0 && expectedBubbleIds(kept).length === 0;
  });
  const undatedWitness = singles.find(({ filters }) => {
    const kept = expectedCompanies(filters ?? {}, companies);
    return kept.length > 0 && expectedTimelineEvents(kept).length === 0;
  });
  if (!emptyWitness) throw new Error('no registered filter state empties the map');
  cases.push({
    id: 'state:empty-filtered',
    kind: 'discrete-options',
    group: 'states',
    filters: { ...emptyWitness.filters },
    view: 'grid',
    expectedEnumeration: 'one deterministic implemented empty witness: no company matches',
  });
  if (unplottedWitness) {
    cases.push({
      id: 'state:empty-bubble-unplotted',
      kind: 'discrete-options',
      group: 'states',
      filters: { ...unplottedWitness.filters },
      view: 'bubble',
      expectedEnumeration:
        'one deterministic implemented empty witness: companies match but none is plotted',
    });
  }
  if (undatedWitness) {
    cases.push({
      id: 'state:empty-timeline-undated',
      kind: 'discrete-options',
      group: 'states',
      filters: { ...undatedWitness.filters },
      view: 'timeline',
      expectedEnumeration:
        'one deterministic implemented empty witness: companies match but none has a dated round',
    });
  }
  cases.push(
    {
      id: 'state:loading-not-applicable',
      kind: 'exception',
      group: 'states',
      notApplicableReason:
        'The map renders from the company registry compiled into the static page and fetches nothing, so it implements no loading state.',
    },
    {
      id: 'state:error-not-applicable',
      kind: 'exception',
      group: 'states',
      notApplicableReason:
        'The map makes no runtime request that could fail, so it implements no error state.',
    },
    {
      id: 'state:unavailable-not-applicable',
      kind: 'exception',
      group: 'states',
      notApplicableReason:
        'The map depends on no index, service or browser capability that can be missing, so it implements no unavailable state.',
    },
  );

  cases.push(
    {
      id: 'focus:each-filter-bar-control',
      kind: 'focus',
      group: 'focus-keyboard',
      // One folded filter set, so Clear filters renders and the fold opens.
      filters: { country: options.country[0] },
      view: 'grid',
      selector: '[aria-label="Segment"] button, [data-market-map-search], button[aria-expanded], [aria-label="View"] button, select',
      expectedEnumeration: 'every filter-bar control in tab order, each with the visible ink focus ring',
    },
    {
      id: 'keyboard:operate-filter-bar',
      kind: 'focus',
      group: 'focus-keyboard',
      expectedEnumeration:
        'keyboard-only operation of segment, search, More filters, selects, view and Clear, with the result-count live-region ledger',
    },
  );

  const ids = new Set<string>();
  for (const stateCase of cases) {
    if (ids.has(stateCase.id)) {
      throw new Error(`the market-map plan repeats case ${stateCase.id}`);
    }
    ids.add(stateCase.id);
  }

  return {
    source: MARKET_MAP_INTERACTIVE_SOURCE,
    mount: MARKET_MAP_MOUNT,
    viewport: MARKET_MAP_VIEWPORT,
    generator: {
      algorithm: MARKET_MAP_PAIRWISE_ALGORITHM,
      seed: MARKET_MAP_PAIRWISE_SEED,
      dimensions: [...MARKET_MAP_INDEPENDENT_DIMENSIONS],
      levels: Object.fromEntries(
        pairwiseDimensions.map(({ id, values }) => [id, values.length]),
      ),
    },
    cases,
  };
}

/** Expected case count per group, for the §1.15 count ledger. */
export function marketMapGroupCaseCounts(
  plan: MarketMapStatePlan,
): Record<MarketMapCaseGroup, number> {
  const counts = Object.fromEntries(
    MARKET_MAP_CASE_GROUPS.map((group) => [group, 0]),
  ) as Record<MarketMapCaseGroup, number>;
  for (const { group } of plan.cases) counts[group] += 1;
  return counts;
}

export function marketMapCaseGroupMemberId(group: MarketMapCaseGroup): string {
  return `market-map-cases:${group}`;
}

/* ------------------------------------------------------------------ */
/* Fingerprint                                                         */
/* ------------------------------------------------------------------ */

const MARKET_MAP_CLOSURE_ENTRIES = [
  'app/market-map/page.tsx',
  'tests/e2e/brand-v2-market-map-states.spec.ts',
] as const;

/**
 * The bytes of the map's closure, its registry, and the sweep that measures
 * it, plus the literals the verdicts hold the page to, so a changed filter,
 * view or company record without a re-run is a stale-evidence failure.
 */
export function marketMapStatesEvidenceFingerprint(input: {
  root: string;
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: MARKET_MAP_CLOSURE_ENTRIES,
    facts: [
      MARKET_MAP_VIEWPORT.id,
      MARKET_MAP_PAIRWISE_ALGORITHM,
      MARKET_MAP_PAIRWISE_SEED,
      JSON.stringify(MARKET_MAP_FOCUS_RING),
      String(MARKET_MAP_UPDATE_CEILING_MS),
      String(MARKET_MAP_LATENCY_SAMPLES),
    ],
  }).fingerprint;
}

/* ------------------------------------------------------------------ */
/* Observation schema                                                  */
/* ------------------------------------------------------------------ */

const stringRecord = z.record(z.string(), z.string());
const countRecord = z.record(z.string(), z.number().int().min(0));

const filterObservationSchema = z
  .object({
    kind: z.literal('filter'),
    view: z.enum(MARKET_MAP_VIEWS),
    params: stringRecord,
    countText: z.string(),
    renderedIds: z.array(z.string()),
    segmentTabCounts: countRecord,
    bandCounts: countRecord.nullable(),
    emptyState: z.boolean(),
    emptyStateRole: z.string().nullable(),
    bubbleEmptyNote: z.boolean(),
    timelineEmptyNote: z.boolean(),
    reloaded: z.boolean(),
    requests: z.array(z.string()),
    /** The fastest of the latency samples; null where the case is not timed. */
    latencyMs: z.number().min(0).nullable(),
    latencySamplesMs: z.array(z.number().min(0)),
    /**
     * Indices of the case's steps whose state did not yet show when their
     * event's task had run.
     */
    lateSteps: z.array(z.number().int().min(0)),
    /** The reset case: focus after Clear filters and the bare URL. */
    focusAfterReset: z.string().nullable().optional(),
    /** The default case: every option each control renders. */
    renderedOptions: z.record(z.string(), z.array(z.string())).optional(),
    /** The dependent group: the sub-segment options under the segment. */
    subSegmentOptions: z.array(z.string()).optional(),
  })
  .strict();

const selectionObservationSchema = z
  .object({
    kind: z.literal('selection'),
    view: z.enum(MARKET_MAP_VIEWS),
    activation: z.enum(['click', 'keyboard']),
    hashWhileOpen: z.string(),
    sheetCompanyId: z.string().nullable(),
    sheetHeading: z.string().nullable(),
    expandedTriggers: z.array(z.string()),
    collapsedTriggers: z.number().int().min(0),
    renderedTriggers: z.number().int().min(0),
    bubbleSelected: z.string().nullable(),
    /** history.pushState calls the opening made. */
    pushes: z.number().int().min(0),
    dismissedBy: z.enum(['close', 'escape', 'back']).nullable(),
    sheetAfterDismiss: z.boolean().nullable(),
    hashAfterDismiss: z.string().nullable(),
    focusAfterDismiss: z.string().nullable(),
    reloaded: z.boolean(),
  })
  .strict();

const historyStepSchema = z
  .object({
    label: z.string(),
    params: stringRecord,
    hash: z.string(),
    view: z.enum(MARKET_MAP_VIEWS),
    countText: z.string(),
    renderedIds: z.array(z.string()),
    pressedSegment: z.string().nullable(),
    selectValues: stringRecord,
    sheetCompanyId: z.string().nullable(),
    /** history.pushState calls since the case's first step. */
    pushes: z.number().int().min(0),
    /** Whether this step is still the document the first step read. */
    sameDocument: z.boolean(),
  })
  .strict();

const historyObservationSchema = z
  .object({
    kind: z.literal('history'),
    steps: z.array(historyStepSchema).min(1),
  })
  .strict();

const tooltipObservationSchema = z
  .object({
    kind: z.literal('tooltip'),
    view: z.enum(['bubble', 'timeline']),
    markId: z.string(),
    hitId: z.string().nullable(),
    pointerReachable: z.boolean(),
    hoverLabel: z.array(z.string()),
    labelAfterLeave: z.boolean(),
    /** Bubble: the label focus shows for the mark the pointer resolved to. */
    focusLabel: z.array(z.string()).nullable(),
    /** Timeline: the keyboard row of the event the pointer resolved to. */
    row: z
      .object({ name: z.string(), date: z.string(), amount: z.string() })
      .strict()
      .nullable(),
  })
  .strict();

const focusStopSchema = z
  .object({
    descriptor: z.string(),
    focusVisible: z.boolean(),
    outlineStyle: z.string(),
    outlineWidth: z.string(),
    outlineColor: z.string(),
    outlineOffset: z.string(),
  })
  .strict();

const focusTraceObservationSchema = z
  .object({
    kind: z.literal('focus-trace'),
    stops: z.array(focusStopSchema).min(1),
  })
  .strict();

const ledgerStepSchema = z
  .object({
    step: z.string(),
    keys: z.array(z.string()).min(1),
    focusAfter: z.string(),
    expectedText: z.string(),
    text: z.string(),
    mutations: z.number().int().min(0),
    latencyMs: z.number().min(0).nullable(),
    /**
     * Whether the region's first update came inside the task of one of the
     * step's key events; null when the region did not change.
     */
    inKeyTask: z.boolean().nullable(),
    params: stringRecord,
    state: z.record(z.string(), z.string()),
  })
  .strict();

const keyboardObservationSchema = z
  .object({
    kind: z.literal('keyboard-ledger'),
    region: z
      .object({
        role: z.string().nullable(),
        ariaLive: z.string().nullable(),
        ariaAtomic: z.string().nullable(),
        sameNodeThroughout: z.boolean(),
      })
      .strict(),
    startFocus: z.string(),
    steps: z.array(ledgerStepSchema).min(1),
    announcements: z.array(z.string()),
  })
  .strict();

const exceptionObservationSchema = z
  .object({
    kind: z.literal('exception'),
    notApplicableReason: z.string().min(1),
    requestsDuringSweep: z.array(z.string()),
  })
  .strict();

const observationSchema = z.discriminatedUnion('kind', [
  filterObservationSchema,
  selectionObservationSchema,
  historyObservationSchema,
  tooltipObservationSchema,
  focusTraceObservationSchema,
  keyboardObservationSchema,
  exceptionObservationSchema,
]);

export type MarketMapCaseObservation = z.infer<typeof observationSchema>;

const caseRecordSchema = z
  .object({
    id: z.string().min(1),
    group: z.enum(MARKET_MAP_CASE_GROUPS),
    observed: observationSchema,
  })
  .strict();

export type MarketMapCaseRecord = z.infer<typeof caseRecordSchema>;

const axeStateSchema = z
  .object({
    state: z.string().min(1),
    violations: z.array(z.string()),
  })
  .strict();

export const marketMapStatesEvidenceSchema = z
  .object({
    version: z.literal(1),
    fingerprint: z.string().min(1),
    route: z.literal(MARKET_MAP_ROUTE),
    viewport: z.literal(MARKET_MAP_VIEWPORT.id),
    generator: z
      .object({
        algorithm: z.string(),
        seed: z.string(),
        dimensions: z.array(z.string()),
        levels: countRecord,
      })
      .strict(),
    caseCounts: z
      .object({ expected: z.number().int().min(0), observed: z.number().int().min(0) })
      .strict(),
    cases: z.array(caseRecordSchema),
    axe: z.array(axeStateSchema).min(1),
  })
  .strict();

export type MarketMapStatesEvidence = z.infer<typeof marketMapStatesEvidenceSchema>;

/* ------------------------------------------------------------------ */
/* Fail-closed reader                                                  */
/* ------------------------------------------------------------------ */

/**
 * Refuses an artifact that is malformed or stale, that records zero cases,
 * that misses a registered case or holds an unregistered one, repeats a
 * case, files a case under the wrong group, records the registered cases in
 * any order but the registry's, disagrees with the registry on its case
 * counts, or was generated by a different pairwise algorithm or seed.
 */
export function readMarketMapStatesEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  plan?: MarketMapStatePlan;
}): MarketMapStatesEvidence {
  const parsed = marketMapStatesEvidenceSchema.safeParse(input.artifact);
  if (!parsed.success) {
    throw new Error(
      `market-map-states evidence is malformed: ${parsed.error.issues
        .slice(0, 4)
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  const evidence = parsed.data;
  if (evidence.fingerprint !== input.fingerprint) {
    throw new Error(
      'market-map-states evidence is stale: the fingerprint does not match the current market-map closure',
    );
  }
  const plan = input.plan ?? marketMapStatePlan();
  if (plan.cases.length === 0) {
    throw new Error('the market-map registry derives zero cases');
  }
  if (evidence.cases.length === 0) {
    throw new Error('market-map-states evidence records zero cases');
  }
  if (JSON.stringify(evidence.generator) !== JSON.stringify(plan.generator)) {
    throw new Error(
      `market-map-states evidence was generated by ${JSON.stringify(evidence.generator)}, not the pinned ${JSON.stringify(plan.generator)}`,
    );
  }
  const planned = new Map(plan.cases.map((stateCase, index) => [stateCase.id, { stateCase, index }]));
  const seen = new Set<string>();
  for (const record of evidence.cases) {
    const entry = planned.get(record.id);
    if (!entry) {
      throw new Error(`market-map-states evidence holds unregistered case ${record.id}`);
    }
    if (seen.has(record.id)) {
      throw new Error(`market-map-states evidence holds duplicate case ${record.id}`);
    }
    seen.add(record.id);
    if (record.group !== entry.stateCase.group) {
      throw new Error(
        `market-map-states evidence files ${record.id} under ${record.group}, not ${entry.stateCase.group}`,
      );
    }
  }
  const missing = plan.cases.filter(({ id }) => !seen.has(id)).map(({ id }) => id);
  if (missing.length > 0) {
    throw new Error(
      `market-map-states evidence is incomplete: missing ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` and ${missing.length - 5} more` : ''}`,
    );
  }
  const divergence = evidence.cases.findIndex(
    (record, index) => record.id !== plan.cases[index].id,
  );
  if (divergence !== -1) {
    throw new Error(
      `market-map-states evidence is out of registry order at case ${divergence}: recorded ${evidence.cases[divergence].id}, registered ${plan.cases[divergence].id}`,
    );
  }
  if (
    evidence.caseCounts.expected !== plan.cases.length ||
    evidence.caseCounts.observed !== evidence.cases.length
  ) {
    throw new Error(
      `market-map-states evidence counts disagree: recorded ${evidence.caseCounts.expected} expected and ${evidence.caseCounts.observed} observed, registry ${plan.cases.length} and artifact ${evidence.cases.length}`,
    );
  }
  return evidence;
}

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

export type MarketMapCaseVerdict = {
  id: string;
  group: MarketMapCaseGroup;
  failures: string[];
  expectedCount: number | null;
  observedCount: number | null;
};

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameRecord(
  left: Record<string, string | number>,
  right: Record<string, string | number>,
): boolean {
  const keys = (record: Record<string, string | number>) => Object.keys(record).sort();
  return (
    sameList(keys(left), keys(right)) &&
    Object.keys(left).every((key) => left[key] === right[key])
  );
}

function diffIds(expected: readonly string[], observed: readonly string[]): string {
  const missing = expected.filter((id) => !observed.includes(id));
  const extra = observed.filter((id) => !expected.includes(id));
  return `missing [${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', …' : ''}], extra [${extra.slice(0, 4).join(', ')}${extra.length > 4 ? ', …' : ''}]`;
}

function latencyFailures(
  latencyMs: number | null,
  samples: readonly number[],
  lateSteps: readonly number[],
): string[] {
  if (latencyMs === null) {
    const failures: string[] = [];
    if (samples.length > 0) failures.push(`an untimed case records ${samples.length} latency sample(s)`);
    if (lateSteps.length > 0) failures.push(`an untimed case records late steps [${lateSteps.join(', ')}]`);
    return failures;
  }
  const failures: string[] = [];
  if (lateSteps.length > 0) {
    failures.push(
      `step(s) [${lateSteps.join(', ')}] had not landed when their event's task ended: the update waited for a timer, a frame or a response`,
    );
  }
  if (samples.length === 0 || samples.length > MARKET_MAP_LATENCY_SAMPLES) {
    failures.push(
      `records ${samples.length} latency samples, not 1 to ${MARKET_MAP_LATENCY_SAMPLES}`,
    );
  } else if (latencyMs !== Math.min(...samples)) {
    failures.push(`records ${latencyMs} ms, not the fastest of its samples [${samples.join(', ')}]`);
  }
  if (samples.slice(0, -1).some((sample) => sample <= MARKET_MAP_UPDATE_CEILING_MS)) {
    failures.push(`was re-measured after a sample within the ceiling: [${samples.join(', ')}]`);
  }
  if (latencyMs > MARKET_MAP_UPDATE_CEILING_MS) {
    failures.push(
      `the count took ${latencyMs} ms to update at best of [${samples.join(', ')}], over the ${MARKET_MAP_UPDATE_CEILING_MS} ms ceiling`,
    );
  }
  return failures;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function filterFailures(
  stateCase: MarketMapCase,
  observed: Extract<MarketMapCaseObservation, { kind: 'filter' }>,
  companies: readonly Company[],
): string[] {
  const failures: string[] = [];
  const filters = stateCase.filters ?? {};
  const view = stateCase.view ?? MARKET_MAP_DEFAULT_VIEW;
  const expectedIds = expectedRenderedIds(filters, view, companies);
  const renderedSorted = [...observed.renderedIds].sort();
  if (observed.view !== view) failures.push(`rendered the ${observed.view} view, not ${view}`);
  if (!sameList(expectedIds, renderedSorted)) {
    failures.push(
      `rendered ${observed.renderedIds.length} ids, registry derives ${expectedIds.length}: ${diffIds(expectedIds, renderedSorted)}`,
    );
  }
  const countText = expectedCountText(filters, companies);
  if (observed.countText !== countText) {
    failures.push(`count reads "${observed.countText}", registry derives "${countText}"`);
  }
  const params = expectedSearchParams(filters, view);
  if (!sameRecord(observed.params, params)) {
    failures.push(
      `URL holds ${JSON.stringify(observed.params)}, the state is ${JSON.stringify(params)}`,
    );
  }
  const tabs = expectedSegmentTabCounts(filters, companies);
  if (!sameRecord(observed.segmentTabCounts, tabs)) {
    failures.push(
      `segment tabs read ${JSON.stringify(observed.segmentTabCounts)}, registry derives ${JSON.stringify(tabs)}`,
    );
  }
  if (view === 'grid') {
    const bands = expectedBandCounts(filters, companies);
    if (!observed.bandCounts || !sameRecord(observed.bandCounts, bands)) {
      failures.push(
        `grid bands read ${JSON.stringify(observed.bandCounts)}, registry derives ${JSON.stringify(bands)}`,
      );
    }
  }
  const kept = expectedCompanies(filters, companies);
  if (observed.emptyState !== (kept.length === 0)) {
    failures.push(
      kept.length === 0
        ? 'no company matches, and the empty state is missing'
        : 'companies match, and the empty state is showing',
    );
  }
  if (observed.emptyState && observed.emptyStateRole !== 'status') {
    failures.push(`the empty state has role ${observed.emptyStateRole}, not status`);
  }
  if (kept.length > 0 && view === 'bubble') {
    const unplotted = expectedBubbleIds(kept).length === 0;
    if (observed.bubbleEmptyNote !== unplotted) {
      failures.push(
        unplotted
          ? 'no company is plotted, and the bubble note is missing'
          : 'companies are plotted, and the bubble note is showing',
      );
    }
  }
  if (kept.length > 0 && view === 'timeline') {
    const undated = expectedTimelineEvents(kept).length === 0;
    if (observed.timelineEmptyNote !== undated) {
      failures.push(
        undated
          ? 'no round is dated, and the timeline note is missing'
          : 'rounds are dated, and the timeline note is showing',
      );
    }
  }
  if (observed.reloaded) failures.push('the page reloaded while the case was applied');
  if (observed.requests.length > 0) {
    failures.push(`the case made ${observed.requests.length} request(s): ${observed.requests.slice(0, 3).join(', ')}`);
  }
  failures.push(
    ...latencyFailures(observed.latencyMs, observed.latencySamplesMs, observed.lateSteps),
  );
  if (stateCase.id === 'default') {
    const rendered = observed.renderedOptions;
    const options = marketMapFilterOptions(companies);
    if (!rendered) {
      failures.push('the default case recorded no rendered control options');
    } else {
      for (const dimension of MARKET_MAP_FILTER_DIMENSIONS) {
        const have = rendered[dimension] ?? [];
        if (!sameList(have, options[dimension])) {
          failures.push(
            `${dimension} renders ${have.length} options, registry derives ${options[dimension].length}: ${diffIds(options[dimension], have)}`,
          );
        }
      }
    }
  }
  if (stateCase.id === 'reset' && observed.focusAfterReset !== 'tab:all') {
    failures.push(`Clear filters left focus on ${observed.focusAfterReset}, not the All tab`);
  }
  if (stateCase.group === 'dependent-options') {
    const expected = marketMapFilterOptions(companies, filters.segment ?? null).subSegment;
    if (!observed.subSegmentOptions || !sameList(observed.subSegmentOptions, expected)) {
      failures.push(
        `the sub-segment control offers ${JSON.stringify(observed.subSegmentOptions)} under ${filters.segment}, registry derives ${JSON.stringify(expected)}`,
      );
    }
  }
  if (stateCase.companyId && !observed.renderedIds.includes(stateCase.companyId)) {
    failures.push(`the witness ${stateCase.companyId} is not kept`);
  }
  return failures;
}

function companyName(companies: readonly Company[], id: string | undefined): string {
  const company = companies.find((entry) => entry.id === id);
  if (!company) throw new Error(`no registry company ${id}`);
  return company.name;
}

function selectionFailures(
  stateCase: MarketMapCase,
  observed: Extract<MarketMapCaseObservation, { kind: 'selection' }>,
  companies: readonly Company[],
): string[] {
  const failures: string[] = [];
  const id = stateCase.companyId as string;
  if (observed.view !== stateCase.view) failures.push(`opened from ${observed.view}, not ${stateCase.view}`);
  if (observed.hashWhileOpen !== `#company-${id}`) {
    failures.push(`the URL hash reads ${observed.hashWhileOpen}, not #company-${id}`);
  }
  if (observed.sheetCompanyId !== id) {
    failures.push(`the detail sheet shows ${observed.sheetCompanyId}, not ${id}`);
  }
  const name = companyName(companies, id);
  if (observed.sheetHeading !== name) {
    failures.push(`the sheet is headed "${observed.sheetHeading}", the registry names "${name}"`);
  }
  if (!sameList(observed.expandedTriggers, [id])) {
    failures.push(`expanded triggers are [${observed.expandedTriggers.join(', ')}], not only ${id}`);
  }
  const expectedTriggers = expectedRenderedIds({}, stateCase.view as MarketMapView, companies).length;
  if (observed.renderedTriggers !== expectedTriggers) {
    failures.push(`${observed.renderedTriggers} triggers render, registry derives ${expectedTriggers}`);
  }
  if (observed.collapsedTriggers !== expectedTriggers - 1) {
    failures.push(
      `${observed.collapsedTriggers} triggers read unselected, every other one of ${expectedTriggers} should`,
    );
  }
  if (stateCase.view === 'bubble' && observed.bubbleSelected !== id) {
    failures.push(`the chart marks ${observed.bubbleSelected} selected, not ${id}`);
  }
  if (observed.pushes !== 1) {
    failures.push(`opening pushed ${observed.pushes} history entries, not 1`);
  }
  const expectedActivation = stateCase.dismissal ? 'click' : 'keyboard';
  if (observed.activation !== expectedActivation) {
    failures.push(`opened by ${observed.activation}, the case opens by ${expectedActivation}`);
  }
  if (stateCase.dismissal) {
    if (observed.dismissedBy !== stateCase.dismissal) {
      failures.push(`dismissed by ${observed.dismissedBy}, not ${stateCase.dismissal}`);
    }
    if (observed.sheetAfterDismiss !== false) failures.push('the sheet is still open after dismissal');
    if (observed.hashAfterDismiss !== '') {
      failures.push(`the hash reads ${observed.hashAfterDismiss} after dismissal`);
    }
    const trigger = `trigger:${stateCase.view}:${id}`;
    if (observed.focusAfterDismiss !== trigger) {
      failures.push(`focus returned to ${observed.focusAfterDismiss}, not ${trigger}`);
    }
  } else if (observed.dismissedBy !== null) {
    failures.push('the open case recorded a dismissal');
  }
  if (observed.reloaded) failures.push('the page reloaded during selection');
  return failures;
}

type HistoryExpectation = {
  label: string;
  filters: MarketMapFilters;
  view: MarketMapView;
  sheetCompanyId: string | null;
  pushes: number;
  /** null: the step may or may not be a new document (a deliberate load). */
  sameDocument: boolean | null;
};

function historyStepFailures(
  expected: HistoryExpectation,
  step: z.infer<typeof historyStepSchema> | undefined,
  companies: readonly Company[],
): string[] {
  const { label, filters, view, sheetCompanyId } = expected;
  if (!step) return [`no ${label} step was recorded`];
  const failures: string[] = [];
  if (step.label !== label) failures.push(`recorded step ${step.label} where ${label} belongs`);
  if (step.pushes !== expected.pushes) {
    failures.push(`${label}: ${step.pushes} history entries were pushed, not ${expected.pushes}`);
  }
  if (expected.sameDocument !== null && step.sameDocument !== expected.sameDocument) {
    failures.push(
      expected.sameDocument
        ? `${label}: the page reloaded`
        : `${label}: the step should be a fresh document load and is not`,
    );
  }
  const params = expectedSearchParams(filters, view);
  if (!sameRecord(step.params, params)) {
    failures.push(`${label}: URL holds ${JSON.stringify(step.params)}, not ${JSON.stringify(params)}`);
  }
  if (step.view !== view) failures.push(`${label}: rendered ${step.view}, not ${view}`);
  const countText = expectedCountText(filters, companies);
  if (step.countText !== countText) {
    failures.push(`${label}: count reads "${step.countText}", registry derives "${countText}"`);
  }
  const ids = expectedRenderedIds(filters, view, companies);
  if (!sameList([...step.renderedIds].sort(), ids)) {
    failures.push(`${label}: ${diffIds(ids, [...step.renderedIds].sort())}`);
  }
  if (step.pressedSegment !== (filters.segment ?? 'all')) {
    failures.push(`${label}: the ${step.pressedSegment} tab is pressed, not ${filters.segment ?? 'all'}`);
  }
  for (const dimension of MARKET_MAP_FILTER_DIMENSIONS) {
    if (dimension === 'segment') continue;
    const value = step.selectValues[dimension] ?? '';
    if (value !== (filters[dimension] ?? '')) {
      failures.push(`${label}: the ${dimension} control reads "${value}", not "${filters[dimension] ?? ''}"`);
    }
  }
  if (step.sheetCompanyId !== sheetCompanyId) {
    failures.push(`${label}: the sheet shows ${step.sheetCompanyId}, not ${sheetCompanyId}`);
  }
  const hash = sheetCompanyId ? `#company-${sheetCompanyId}` : '';
  if (step.hash !== hash) failures.push(`${label}: the hash reads ${step.hash}, not ${hash}`);
  return failures;
}

function historyFailures(
  stateCase: MarketMapCase,
  observed: Extract<MarketMapCaseObservation, { kind: 'history' }>,
  companies: readonly Company[],
): string[] {
  const steps = historyExpectations(stateCase);
  if (steps === null) return [`${stateCase.id} is not a registered history case`];
  const failures = steps.flatMap((expected, index) =>
    historyStepFailures(expected, observed.steps[index], companies),
  );
  if (observed.steps.length !== steps.length) {
    failures.push(`recorded ${observed.steps.length} steps, not ${steps.length}`);
  }
  return failures;
}

/**
 * The ordered steps each URL and history case reads, with the state each
 * must show. Exported so the sweep drives exactly the steps the verdict
 * grades.
 */
export function historyExpectations(stateCase: MarketMapCase): HistoryExpectation[] | null {
  const filters = stateCase.filters ?? {};
  const view = stateCase.view ?? MARKET_MAP_DEFAULT_VIEW;
  const id = stateCase.companyId ?? null;
  const step = (
    label: string,
    state: Partial<HistoryExpectation> = {},
  ): HistoryExpectation => ({
    label,
    filters: {},
    view: MARKET_MAP_DEFAULT_VIEW,
    sheetCompanyId: null,
    pushes: 0,
    sameDocument: true,
    ...state,
  });
  switch (stateCase.id) {
    case 'url:deep-link-filters-and-view':
      return [step('loaded', { filters, view })];
    case 'url:deep-link-company':
      return [step('loaded', { filters, view, sheetCompanyId: id })];
    case 'history:filters-return-and-reload':
      return [
        step('loaded'),
        // Filters and the view replace the entry rather than pushing one.
        step('applied', { filters, view }),
        // Back from another page, and a reload, restore them from the URL.
        step('returned', { filters, view, sameDocument: null }),
        step('reloaded', { filters, view, sameDocument: false }),
      ];
    case 'history:details-back-forward':
      return [
        step('loaded', { filters, view }),
        step('opened', { filters, view, sheetCompanyId: id, pushes: 1 }),
        // Back closes the details and keeps the filters; Forward reopens.
        step('back', { filters, view, pushes: 1 }),
        step('forward', { filters, view, sheetCompanyId: id, pushes: 1 }),
      ];
    default:
      return null;
  }
}

function tooltipFailures(
  stateCase: MarketMapCase,
  observed: Extract<MarketMapCaseObservation, { kind: 'tooltip' }>,
  companies: readonly Company[],
): string[] {
  const failures: string[] = [];
  const markId = stateCase.view === 'timeline' ? stateCase.eventId : stateCase.companyId;
  if (observed.view !== stateCase.view) failures.push(`read from ${observed.view}, not ${stateCase.view}`);
  if (observed.markId !== markId) failures.push(`recorded mark ${observed.markId}, not ${markId}`);
  if (observed.hitId === null) {
    failures.push('the pointer at the mark resolved to no mark');
    return failures;
  }
  if (observed.pointerReachable !== (observed.hitId === markId)) {
    failures.push('pointer reachability disagrees with the mark the pointer resolved to');
  }
  if (observed.hoverLabel.length !== 2 || observed.hoverLabel.some((line) => !line.trim())) {
    failures.push(`hover showed ${JSON.stringify(observed.hoverLabel)}, not a name and a value`);
  }
  if (!observed.labelAfterLeave) {
    // labelAfterLeave records that leaving cleared the label.
    failures.push('the hover label stayed after the pointer left');
  }
  if (stateCase.view === 'bubble') {
    const name = companyName(companies, observed.hitId);
    if (observed.hoverLabel[0] !== name) {
      failures.push(`hover names "${observed.hoverLabel[0]}", the mark under the pointer is "${name}"`);
    }
    if (!observed.focusLabel || !sameList(observed.focusLabel, observed.hoverLabel)) {
      failures.push(
        `hover shows ${JSON.stringify(observed.hoverLabel)}, focus shows ${JSON.stringify(observed.focusLabel)}`,
      );
    }
  } else {
    const event = expectedTimelineEvents(companies).find(({ id }) => id === observed.hitId);
    if (!event) {
      failures.push(`the pointer resolved to ${observed.hitId}, which is no registry event`);
      return failures;
    }
    if (observed.hoverLabel[0] !== event.companyName) {
      failures.push(`hover names "${observed.hoverLabel[0]}", the event under the pointer is "${event.companyName}"`);
    }
    const row = observed.row;
    if (!row) {
      failures.push('no keyboard row was read for the event under the pointer');
    } else {
      const split = observed.hoverLabel[1]?.lastIndexOf(', ') ?? -1;
      const amount = split === -1 ? '' : observed.hoverLabel[1].slice(0, split);
      const date = split === -1 ? '' : observed.hoverLabel[1].slice(split + 2);
      if (row.name !== observed.hoverLabel[0]) {
        failures.push(`the row names "${row.name}", hover names "${observed.hoverLabel[0]}"`);
      }
      if (row.date !== date) failures.push(`the row dates "${row.date}", hover dates "${date}"`);
      if (!amount || !row.amount.startsWith(amount)) {
        failures.push(`the row reads "${row.amount}", hover reads "${amount}"`);
      }
    }
  }
  return failures;
}

/** The filter-bar tab order the registry implies, with a filter active and the fold open. */
export function expectedFilterBarTabOrder(): string[] {
  return [
    'tab:all',
    ...companySegmentSchema.options.map((segment) => `tab:${segment}`),
    'search',
    'more-filters',
    'clear-filters',
    ...MARKET_MAP_VIEWS.map((view) => `view:${view}`),
    ...MARKET_MAP_FILTER_DIMENSIONS.filter(
      (dimension) => MARKET_MAP_DIMENSION_CONTROLS[dimension].selectId !== null,
    ).map((dimension) => `select:${dimension}`),
  ];
}

function focusTraceFailures(
  observed: Extract<MarketMapCaseObservation, { kind: 'focus-trace' }>,
): string[] {
  const failures: string[] = [];
  const expected = expectedFilterBarTabOrder();
  const descriptors = observed.stops.map(({ descriptor }) => descriptor);
  if (!sameList(descriptors, expected)) {
    failures.push(`Tab visits [${descriptors.join(', ')}], the filter bar is [${expected.join(', ')}]`);
  }
  for (const stop of observed.stops) {
    if (!stop.focusVisible) failures.push(`${stop.descriptor} is focused without :focus-visible`);
    if (
      stop.outlineStyle !== MARKET_MAP_FOCUS_RING.style ||
      stop.outlineWidth !== MARKET_MAP_FOCUS_RING.width ||
      stop.outlineColor !== MARKET_MAP_FOCUS_RING.color ||
      stop.outlineOffset !== MARKET_MAP_FOCUS_RING.offset
    ) {
      failures.push(
        `${stop.descriptor} draws a ${stop.outlineWidth} ${stop.outlineStyle} ${stop.outlineColor} ring offset ${stop.outlineOffset}`,
      );
    }
  }
  return failures;
}

/**
 * The keyboard script the ledger case drives, with the filter state each
 * step leaves and where focus must be afterwards. Derived from the registry:
 * the first segment, its first company's initial, its first sub-segment and
 * the first country option.
 */
export function marketMapKeyboardScript(
  companies: readonly Company[] = COMPANIES,
): Array<{
  step: string;
  filters: MarketMapFilters;
  view: MarketMapView;
  focusAfter: string;
  /** Whether the count must change (an announcement) or stay (no mutation). */
  announces: boolean;
}> {
  const options = marketMapFilterOptions(companies);
  const segment = options.segment[0];
  const inSegment = expectedCompanies({ segment }, companies);
  const initial = searchable(inSegment[0]?.name ?? '').match(/[\p{L}\p{N}]/u)?.[0];
  const subSegment = marketMapFilterOptions(companies, segment).subSegment[0];
  const country = options.country[0];
  if (!segment || !initial || !subSegment || !country) {
    throw new Error('the registry cannot seed the keyboard script');
  }
  const total = companies.length;
  const count = (filters: MarketMapFilters) => expectedCompanies(filters, companies).length;
  const steps: Array<{
    step: string;
    filters: MarketMapFilters;
    view: MarketMapView;
    focusAfter: string;
  }> = [
    { step: 'enter-segment', filters: { segment }, view: 'grid', focusAfter: `tab:${segment}` },
    { step: 'enter-segment-again-clears', filters: {}, view: 'grid', focusAfter: `tab:${segment}` },
    { step: 'space-segment', filters: { segment }, view: 'grid', focusAfter: `tab:${segment}` },
    { step: 'type-initial', filters: { segment, query: initial }, view: 'grid', focusAfter: 'search' },
    { step: 'backspace-initial', filters: { segment }, view: 'grid', focusAfter: 'search' },
    { step: 'open-more-filters', filters: { segment }, view: 'grid', focusAfter: 'more-filters' },
    {
      step: 'arrow-subsegment',
      filters: { segment, subSegment },
      view: 'grid',
      focusAfter: 'select:subSegment',
    },
    {
      step: 'arrow-country',
      filters: { segment, subSegment, country },
      view: 'grid',
      focusAfter: 'select:country',
    },
    {
      step: 'enter-bubble-view',
      filters: { segment, subSegment, country },
      view: 'bubble',
      focusAfter: 'view:bubble',
    },
    { step: 'enter-clear-filters', filters: {}, view: 'bubble', focusAfter: 'tab:all' },
  ];
  let previous = total;
  return steps.map((entry) => {
    const next = count(entry.filters);
    const announces = next !== previous;
    previous = next;
    return { ...entry, announces };
  });
}

function keyboardFailures(
  observed: Extract<MarketMapCaseObservation, { kind: 'keyboard-ledger' }>,
  companies: readonly Company[],
): string[] {
  const failures: string[] = [];
  if (observed.region.role !== 'status') failures.push(`the count region has role ${observed.region.role}`);
  if (observed.region.ariaLive !== 'polite') {
    failures.push(`the count region is aria-live ${observed.region.ariaLive}`);
  }
  if (!observed.region.sameNodeThroughout) {
    failures.push('the count region was replaced, so a screen reader loses the live region');
  }
  if (observed.startFocus !== 'tab:all') {
    failures.push(`the script started from ${observed.startFocus}, not the All tab`);
  }
  const script = marketMapKeyboardScript(companies);
  const steps = observed.steps.map(({ step }) => step);
  if (!sameList(steps, script.map(({ step }) => step))) {
    failures.push(`the ledger records [${steps.join(', ')}], the script is [${script.map(({ step }) => step).join(', ')}]`);
  }
  const announcements: string[] = [];
  script.forEach((expected, index) => {
    const step = observed.steps[index];
    if (!step) return;
    const text = expectedCountText(expected.filters, companies);
    if (step.expectedText !== text) {
      failures.push(`${step.step}: recorded the expectation "${step.expectedText}", registry derives "${text}"`);
    }
    if (step.text !== text) failures.push(`${step.step}: the count reads "${step.text}", registry derives "${text}"`);
    if (step.focusAfter !== expected.focusAfter) {
      failures.push(`${step.step}: focus is on ${step.focusAfter}, not ${expected.focusAfter}`);
    }
    const params = expectedSearchParams(expected.filters, expected.view);
    if (!sameRecord(step.params, params)) {
      failures.push(`${step.step}: URL holds ${JSON.stringify(step.params)}, not ${JSON.stringify(params)}`);
    }
    if (expected.announces) {
      announcements.push(text);
      if (step.mutations === 0) failures.push(`${step.step}: the count changed with no live-region update`);
      if (step.inKeyTask !== true) {
        failures.push(`${step.step}: the region did not update inside the task of the key that changed it`);
      }
      if (step.latencyMs === null || step.latencyMs > MARKET_MAP_UPDATE_CEILING_MS) {
        failures.push(`${step.step}: the update took ${step.latencyMs} ms`);
      }
    } else if (step.mutations !== 0) {
      failures.push(`${step.step}: the count did not change, and the region was rewritten ${step.mutations} time(s)`);
    }
  });
  if (!sameList(observed.announcements, announcements)) {
    failures.push(
      `the region announced [${observed.announcements.join(' | ')}], the script derives [${announcements.join(' | ')}]`,
    );
  }
  for (let index = 1; index < observed.announcements.length; index += 1) {
    if (observed.announcements[index] === observed.announcements[index - 1]) {
      failures.push(`the region repeated "${observed.announcements[index]}" back to back`);
    }
  }
  return failures;
}

function exceptionFailures(
  stateCase: MarketMapCase,
  observed: Extract<MarketMapCaseObservation, { kind: 'exception' }>,
): string[] {
  const failures: string[] = [];
  if (observed.notApplicableReason !== stateCase.notApplicableReason) {
    failures.push('the recorded reason is not the registered one');
  }
  if (observed.requestsDuringSweep.length > 0) {
    failures.push(
      `the sweep saw ${observed.requestsDuringSweep.length} runtime request(s), which contradicts a map with nothing to load: ${observed.requestsDuringSweep.slice(0, 3).join(', ')}`,
    );
  }
  return failures;
}

const EXPECTED_OBSERVATION_KIND: Record<MarketMapCaseGroup, MarketMapCaseObservation['kind']> = {
  'default-reset': 'filter',
  views: 'filter',
  'single-options': 'filter',
  'dependent-options': 'filter',
  pairwise: 'filter',
  'higher-order': 'filter',
  selection: 'selection',
  'url-history': 'history',
  'tooltip-parity': 'tooltip',
  states: 'filter',
  'focus-keyboard': 'focus-trace',
};

/** Every case's verdict, in registry order. */
export function marketMapCaseVerdicts(
  evidence: MarketMapStatesEvidence,
  plan: MarketMapStatePlan = marketMapStatePlan(),
  companies: readonly Company[] = COMPANIES,
): MarketMapCaseVerdict[] {
  return plan.cases.map((stateCase, index) => {
    const record = evidence.cases[index];
    if (!record || record.id !== stateCase.id) {
      throw new Error(`market-map-states sweep decided no case ${stateCase.id}`);
    }
    const observed = record.observed;
    const failures: string[] = [];
    let expectedCount: number | null = null;
    let observedCount: number | null = null;
    const expectedKind =
      stateCase.kind === 'exception'
        ? 'exception'
        : stateCase.id === 'keyboard:operate-filter-bar'
          ? 'keyboard-ledger'
          : EXPECTED_OBSERVATION_KIND[stateCase.group];
    if (observed.kind !== expectedKind) {
      failures.push(`recorded a ${observed.kind} observation, the case needs ${expectedKind}`);
    } else if (observed.kind === 'filter') {
      failures.push(...filterFailures(stateCase, observed, companies));
      expectedCount = expectedRenderedIds(
        stateCase.filters ?? {},
        stateCase.view ?? MARKET_MAP_DEFAULT_VIEW,
        companies,
      ).length;
      observedCount = observed.renderedIds.length;
    } else if (observed.kind === 'selection') {
      failures.push(...selectionFailures(stateCase, observed, companies));
    } else if (observed.kind === 'history') {
      failures.push(...historyFailures(stateCase, observed, companies));
    } else if (observed.kind === 'tooltip') {
      failures.push(...tooltipFailures(stateCase, observed, companies));
    } else if (observed.kind === 'focus-trace') {
      failures.push(...focusTraceFailures(observed));
      expectedCount = expectedFilterBarTabOrder().length;
      observedCount = observed.stops.length;
    } else if (observed.kind === 'keyboard-ledger') {
      failures.push(...keyboardFailures(observed, companies));
      expectedCount = marketMapKeyboardScript(companies).length;
      observedCount = observed.steps.length;
    } else {
      failures.push(...exceptionFailures(stateCase, observed));
    }
    return { id: stateCase.id, group: stateCase.group, failures, expectedCount, observedCount };
  });
}

export type MarketMapGroupVerdict = {
  id: string;
  failures: string[];
  observed: Record<string, unknown>;
};

/**
 * One verdict per case group: the exact expected and observed case counts
 * (both non-zero), the case accounting the census runner uses, the summed
 * expected and observed rendered-ID counts of its filter cases, and every
 * case failure by name.
 */
export function marketMapGroupVerdicts(
  evidence: MarketMapStatesEvidence,
  plan: MarketMapStatePlan = marketMapStatePlan(),
  companies: readonly Company[] = COMPANIES,
): MarketMapGroupVerdict[] {
  const verdicts = marketMapCaseVerdicts(evidence, plan, companies);
  const expectedCounts = marketMapGroupCaseCounts(plan);
  return MARKET_MAP_CASE_GROUPS.map((group) => {
    const cases = plan.cases.filter((stateCase) => stateCase.group === group);
    const recorded = evidence.cases.filter((record) => record.group === group);
    const groupVerdicts = verdicts.filter((verdict) => verdict.group === group);
    const failures: string[] = [];
    if (expectedCounts[group] === 0) failures.push(`the registry derives zero ${group} cases`);
    if (recorded.length !== expectedCounts[group]) {
      failures.push(`recorded ${recorded.length} ${group} cases, registry derives ${expectedCounts[group]}`);
    }
    const accounting = accountInteractiveCases(
      cases,
      new Set(groupVerdicts.filter(({ failures: found }) => found.length === 0).map(({ id }) => id)),
    );
    const typed = cases.filter((stateCase) => stateCase.kind === 'exception').length;
    failures.push(
      ...validateInteractiveCaseAccounting(accounting, expectedCounts[group], expectedCounts[group] - typed),
    );
    for (const verdict of groupVerdicts) {
      for (const failure of verdict.failures) failures.push(`${verdict.id}: ${failure}`);
    }
    const counted = groupVerdicts.filter((verdict) => verdict.expectedCount !== null);
    const observed: Record<string, unknown> = {
      group,
      expectedCaseCount: expectedCounts[group],
      observedCaseCount: recorded.length,
      registryCaseCount: { expected: plan.cases.length, observed: evidence.cases.length },
      selectorReconciled: accounting.selectorReconciled,
      typedNotApplicable: accounting.typedNotApplicable,
    };
    if (counted.length > 0) {
      observed.expectedRenderedTotal = counted.reduce((sum, verdict) => sum + (verdict.expectedCount ?? 0), 0);
      observed.observedRenderedTotal = counted.reduce((sum, verdict) => sum + (verdict.observedCount ?? 0), 0);
      observed.nonEmptyCases = counted.filter((verdict) => (verdict.expectedCount ?? 0) > 0).length;
    }
    const latencies = recorded.flatMap(({ observed: reading }) =>
      reading.kind === 'filter' && reading.latencyMs !== null ? [reading.latencyMs] : [],
    );
    if (latencies.length > 0) {
      const typical = median(latencies);
      observed.timedCases = latencies.length;
      observed.medianLatencyMs = typical;
      observed.maxLatencyMs = Math.max(...latencies);
    }
    if (group === 'pairwise') {
      observed.generator = plan.generator;
    }
    if (group === 'focus-keyboard') {
      // Keyboard operation is only accessible if the states it reaches are.
      failures.push(...marketMapAxeFailures(evidence));
      observed.axeStates = evidence.axe.map(({ state }) => state);
    }
    return { id: marketMapCaseGroupMemberId(group), failures, observed };
  });
}

/**
 * The cases axe is run on, in registry order, once each has been driven:
 * each view, an open detail sheet, the empty state, the open fold after
 * focus has crossed the filter bar, and the end of the keyboard script.
 */
export const MARKET_MAP_AXE_CASES = [
  'default',
  'view:bubble',
  'view:timeline',
  'selection:grid:open',
  'state:empty-filtered',
  'focus:each-filter-bar-control',
  'keyboard:operate-filter-bar',
] as const;

/** The axe sweep of the map's states (VAL-MKT-026). */
export function marketMapAxeFailures(evidence: MarketMapStatesEvidence): string[] {
  const failures: string[] = [];
  const states = evidence.axe.map(({ state }) => state);
  if (!sameList(states, MARKET_MAP_AXE_CASES)) {
    failures.push(`axe ran on [${states.join(', ')}], not [${MARKET_MAP_AXE_CASES.join(', ')}]`);
  }
  for (const { state, violations } of evidence.axe) {
    for (const violation of violations) failures.push(`${state}: axe ${violation}`);
  }
  return failures;
}
