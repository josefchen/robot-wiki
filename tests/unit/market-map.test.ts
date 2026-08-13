import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import {
  DEFAULT_MARKET_MAP_FILTERS,
  EXPECTED_SEGMENT_COUNTS,
  MARKET_MAP_AS_OF,
  SEGMENT_ORDER,
  bubblePoints,
  countryOptions,
  filterCompanies,
  formatShortDate,
  formatUsd,
  hasActiveFilters,
  parseMarketMapSearch,
  serializeMarketMapSearch,
  subSegmentOptions,
  timelineEvents,
  unknownFigure,
  type MarketMapFilters,
} from '@/lib/market-map';

/**
 * Pure market-map logic (VAL-MKT-005/006/007/011/015/023/024/025).
 * Filter composition, URL round-trip, timeline anchors, and the
 * null-funding-is-never-zero plot rule all live here so the UI can stay
 * thin.
 */

function filters(patch: Partial<MarketMapFilters> = {}): MarketMapFilters {
  return { ...DEFAULT_MARKET_MAP_FILTERS, ...patch };
}

describe('filterCompanies', () => {
  it('returns all 112 companies when no filters are active', () => {
    expect(filterCompanies(COMPANIES, DEFAULT_MARKET_MAP_FILTERS)).toHaveLength(
      112,
    );
    expect(hasActiveFilters(DEFAULT_MARKET_MAP_FILTERS)).toBe(false);
  });

  it('filters segment=humanoids to exactly 35 companies (VAL-MKT-005)', () => {
    const rows = filterCompanies(COMPANIES, filters({ segment: 'humanoids' }));
    expect(rows).toHaveLength(EXPECTED_SEGMENT_COUNTS.humanoids);
    expect(rows.every((row) => row.segment === 'humanoids')).toBe(true);
    expect(hasActiveFilters(filters({ segment: 'humanoids' }))).toBe(true);
  });

  it('filters country=US to US-headquartered companies only (VAL-MKT-005)', () => {
    const rows = filterCompanies(COMPANIES, filters({ country: 'US' }));
    expect(rows).toHaveLength(63);
    expect(rows.every((row) => row.hq.country === 'US')).toBe(true);
  });

  it('intersects segment, country, and confidence (VAL-MKT-006)', () => {
    const humanoidsUs = filterCompanies(
      COMPANIES,
      filters({ segment: 'humanoids', country: 'US' }),
    );
    expect(humanoidsUs).toHaveLength(6);
    expect(
      humanoidsUs.every(
        (row) => row.segment === 'humanoids' && row.hq.country === 'US',
      ),
    ).toBe(true);

    const high = filterCompanies(
      COMPANIES,
      filters({ segment: 'humanoids', country: 'US', confidence: 'high' }),
    );
    expect(high).toHaveLength(4);
    expect(high.every((row) => row.confidence === 'high')).toBe(true);
    expect(high.length).toBeLessThan(humanoidsUs.length);
  });

  it('filters acquired and shut-down statuses truthfully (VAL-MKT-022)', () => {
    const acquired = filterCompanies(COMPANIES, filters({ status: 'acquired' }));
    expect(acquired.map((row) => row.id)).toEqual(
      expect.arrayContaining([
        'covariant',
        'irobot',
        'berkshire-grey',
        'abb-robotics',
      ]),
    );
    expect(acquired.every((row) => row.status === 'acquired')).toBe(true);

    const shutDown = filterCompanies(
      COMPANIES,
      filters({ status: 'shut-down' }),
    );
    expect(shutDown.map((row) => row.id)).toEqual(['k-scale-labs']);
    expect(shutDown.every((row) => row.status === 'dead')).toBe(true);
  });

  it('treats IPO as companies whose latest round is an IPO (VAL-MKT-004)', () => {
    const ipo = filterCompanies(COMPANIES, filters({ status: 'ipo' }));
    expect(ipo.map((row) => row.id).sort()).toEqual([
      'robotphoenix',
      'ubtech-robotics',
      'unitree-robotics',
    ]);
  });

  it('filters open-source contributions (VAL-MKT-004)', () => {
    const open = filterCompanies(COMPANIES, filters({ openSource: 'yes' }));
    expect(open).toHaveLength(6);
    expect(open.every((row) => row.openSource.length > 0)).toBe(true);
    expect(open.map((row) => row.id)).toEqual(
      expect.arrayContaining(['physical-intelligence', 'k-scale-labs']),
    );
  });

  it('can produce a zero-result intersection (VAL-MKT-017)', () => {
    const empty = filterCompanies(
      COMPANIES,
      filters({ segment: 'components-hardware', status: 'shut-down' }),
    );
    expect(empty).toHaveLength(0);
  });
});

describe('dependent facets', () => {
  it('narrows sub-segments to those present under an active segment (VAL-MKT-025)', () => {
    const humanoidSubs = subSegmentOptions(COMPANIES, 'humanoids');
    expect(humanoidSubs).toEqual([
      'care-companion-humanoids',
      'exoskeleton-mobility',
      'home-humanoids',
      'industrial-humanoids',
      'research-humanoids',
    ]);
    const allSubs = subSegmentOptions(COMPANIES, null);
    expect(allSubs.length).toBeGreaterThan(humanoidSubs.length);
    expect(allSubs).toContain('warehouse-automation');
    expect(humanoidSubs).not.toContain('warehouse-automation');
  });

  it('lists countries and approaches from the dataset', () => {
    const countries = countryOptions(COMPANIES);
    expect(countries).toContain('US');
    expect(countries).toContain('CN');
    expect(countries[0] < countries[countries.length - 1]).toBe(true);
  });
});

describe('URL search params', () => {
  it('round-trips filters and view through the query string (VAL-MKT-007)', () => {
    const parsed = parseMarketMapSearch(
      '?segment=humanoids&country=US&confidence=high&view=bubble',
    );
    expect(parsed.view).toBe('bubble');
    expect(parsed.filters).toEqual(
      filters({
        segment: 'humanoids',
        country: 'US',
        confidence: 'high',
      }),
    );
    expect(serializeMarketMapSearch(parsed)).toBe(
      'segment=humanoids&country=US&confidence=high&view=bubble',
    );
  });

  it('ignores invalid params and falls back to the unfiltered grid (VAL-MKT-024)', () => {
    const parsed = parseMarketMapSearch('?segment=bogus&confidence=999&view=xyz');
    expect(parsed.view).toBe('grid');
    expect(parsed.filters).toEqual(DEFAULT_MARKET_MAP_FILTERS);
  });

  it('serializes the empty state as an empty query string (VAL-MKT-018)', () => {
    expect(
      serializeMarketMapSearch({
        view: 'grid',
        filters: DEFAULT_MARKET_MAP_FILTERS,
      }),
    ).toBe('');
  });
});

describe('money and unknown figures', () => {
  it('formats known amounts without inventing zeros (VAL-MKT-011)', () => {
    expect(formatUsd(1_000_000_000)).toBe('$1B');
    expect(formatUsd(1_400_000_000)).toBe('$1.4B');
    expect(formatUsd(39_000_000_000)).toBe('$39B');
    expect(formatUsd(600_000_000)).toBe('$600M');
    expect(formatUsd(618_000_000)).toBe('$618M');
    expect(formatUsd(105_000_000)).toBe('$105M');
    expect(unknownFigure()).toBe('not disclosed');
  });

  it('formats short dates without a Date timezone round-trip', () => {
    expect(formatShortDate('2025-09-16')).toBe('16 Sep 2025');
    expect(formatShortDate('2026-01-14')).toBe('14 Jan 2026');
    expect(formatShortDate('2026-08-10')).toBe('10 Aug 2026');
  });
});

describe('timelineEvents', () => {
  it('covers 2023-2026 notable rounds including the five anchors (VAL-MKT-015)', () => {
    const events = timelineEvents(COMPANIES);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.date >= '2023-01-01')).toBe(true);
    expect(events.every((event) => event.date <= '2026-12-31')).toBe(true);
    expect(events.every((event) => event.sourceUrl.startsWith('http'))).toBe(
      true,
    );
    expect(events.every((event) => event.asOf === MARKET_MAP_AS_OF)).toBe(true);

    const byId = Object.fromEntries(events.map((event) => [event.companyId, event]));
    expect(byId['figure-ai']).toMatchObject({
      amountUsd: 1_000_000_000,
      valuationUsd: 39_000_000_000,
      type: 'Series C',
      date: '2025-09-16',
    });
    expect(byId['physical-intelligence']).toMatchObject({
      amountUsd: 600_000_000,
      valuationUsd: 5_600_000_000,
      type: 'Series B',
      date: '2025-11-20',
    });
    expect(byId['skild-ai']).toMatchObject({
      amountUsd: 1_400_000_000,
      valuationUsd: 14_000_000_000,
      date: '2026-01-14',
    });
    expect(byId['neura-robotics']).toMatchObject({
      amountUsd: 1_400_000_000,
      date: '2026-06-10',
    });
    expect(byId['unitree-robotics']).toMatchObject({
      type: 'IPO',
      amountUsd: 618_000_000,
      date: '2026-08-10',
    });

    const covariant = events.find((event) => event.companyId === 'covariant');
    expect(covariant?.amountUsd).toBeNull();
    expect(covariant?.valuationUsd).toBeNull();
  });
});

describe('bubblePoints', () => {
  it('never plots null funding as a fake zero (VAL-MKT-023)', () => {
    const points = bubblePoints(COMPANIES);
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThan(COMPANIES.length);
    expect(points.every((point) => point.founded > 0)).toBe(true);
    expect(points.every((point) => point.yUsd > 0)).toBe(true);
    expect(points.some((point) => point.id === 'figure-ai')).toBe(true);
    expect(points.some((point) => point.id === 'covariant')).toBe(false);
    expect(points.some((point) => point.id === 'irobot')).toBe(false);

    const ids = new Set(points.map((point) => point.id));
    for (const company of COMPANIES) {
      if (company.founded === null) {
        expect(ids.has(company.id)).toBe(false);
        continue;
      }
      const y = company.latestRound?.valuationUsd ?? company.totalRaisedUsd;
      if (y === null) {
        expect(ids.has(company.id)).toBe(false);
      }
    }
  });

  it('respects a filtered input set (VAL-MKT-008)', () => {
    const humanoids = filterCompanies(
      COMPANIES,
      filters({ segment: 'humanoids' }),
    );
    const points = bubblePoints(humanoids);
    expect(points.every((point) => point.segment === 'humanoids')).toBe(true);
    expect(points.length).toBeLessThanOrEqual(humanoids.length);
  });
});

describe('segment oracle', () => {
  it('keeps the six-segment order and counts used by the UI', () => {
    expect(SEGMENT_ORDER).toHaveLength(6);
    const sum = Object.values(EXPECTED_SEGMENT_COUNTS).reduce(
      (total, count) => total + count,
      0,
    );
    expect(sum).toBe(112);
  });
});
