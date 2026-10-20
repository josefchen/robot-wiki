import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import {
  DEFAULT_MARKET_MAP_FILTERS,
  EXPECTED_SEGMENT_COUNTS,
  MARKET_MAP_AS_OF,
  SEGMENT_ORDER,
  bubblePoints,
  companyShortName,
  countryOptions,
  filterCompanies,
  formatShortDate,
  formatUsd,
  hasActiveFilters,
  companyInitials,
  matchesQuery,
  normalizeQuery,
  parseMarketMapSearch,
  planMapColumns,
  relaxFiltersForCompany,
  roundSource,
  stepTile,
  tileFact,
  type MapTileBox,
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
  it('returns all 111 companies when no filters are active', () => {
    expect(filterCompanies(COMPANIES, DEFAULT_MARKET_MAP_FILTERS)).toHaveLength(
      111,
    );
    expect(hasActiveFilters(DEFAULT_MARKET_MAP_FILTERS)).toBe(false);
  });

  it('filters segment=humanoids to exactly 34 companies (VAL-MKT-005)', () => {
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
    // 6 -> 7 on 2026-10-19: the field audit moved 1X Technologies from NO
    // to US (Wikipedia: headquartered in Palo Alto, California).
    expect(humanoidsUs).toHaveLength(7);
    expect(humanoidsUs.map((row) => row.id)).toContain('1x-technologies');
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
        // Covariant left on 2026-10-19: Amazon hired its founders and
        // licensed its models without buying it (status private).
        'boston-dynamics',
        'irobot',
        'berkshire-grey',
        'abb-robotics',
        'mentee-robotics', // 2026-08-18: Mobileye completed the acquisition on 2026-02-03 (Form 8-K)
      ]),
    );
    expect(acquired.every((row) => row.status === 'acquired')).toBe(true);
    expect(acquired.map((row) => row.id)).not.toContain('covariant');

    const shutDown = filterCompanies(
      COMPANIES,
      filters({ status: 'shut-down' }),
    );
    expect(shutDown.map((row) => row.id)).toEqual(['k-scale-labs']);
    expect(shutDown.every((row) => row.status === 'dead')).toBe(true);
  });

  it('treats IPO as companies whose latest round is an IPO (VAL-MKT-004)', () => {
    const ipo = filterCompanies(COMPANIES, filters({ status: 'ipo' }));
    // UBTech left on 2026-10-20: its latest round is the 25 November 2025
    // share placement (SCMP; the company's announcement), not its 2023 IPO,
    // so it shows as Public.
    expect(ipo.map((row) => row.id).sort()).toEqual([
      'robotphoenix',
      'switchbot', // 2025-12-30 HK IPO, added by the 2026-08-18 audit
      'unitree-robotics',
    ]);
  });

  it('filters open-source contributions (VAL-MKT-004)', () => {
    const open = filterCompanies(COMPANIES, filters({ openSource: 'yes' }));
    // 6 -> 8 on 2026-10-19: the field audit added XDOF's ABC-130K dataset
    // and Unitree's released models and datasets, both named in fetched
    // bodies (The AI Insider; unitree.com/opensource).
    // 8 -> 12 on 2026-10-20: AgiBot (its site's Open Source menu and its
    // GitHub), Spirit AI (its Spirit v1.5 release), Galaxea (its OpenGalaxea
    // GitHub) and EngineAI (its PM01, per Wikipedia).
    expect(open).toHaveLength(12);
    expect(open.every((row) => row.openSource.length > 0)).toBe(true);
    expect(open.map((row) => row.id)).toEqual(
      expect.arrayContaining([
        'physical-intelligence', 'k-scale-labs', 'xdof', 'unitree-robotics',
        'agibot', 'spirit-ai', 'galaxea-ai', 'engineai',
      ]),
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
      COMPANIES,
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
    const parsed = parseMarketMapSearch(
      '?segment=bogus&confidence=999&view=xyz',
      COMPANIES,
    );
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

describe('data-derived param validation', () => {
  // subSegment, country, and approach values are free-form strings drawn
  // from the dataset, unlike the enum-like segment/status/confidence. A
  // hand-edited or stale URL must not put the page into a filter state
  // that matches nothing: unknown values are dropped, valid siblings
  // still apply, the way a wiki URL should degrade.
  it('drops an unknown sub-segment but keeps valid sibling filters', () => {
    const parsed = parseMarketMapSearch(
      '?segment=humanoids&subSegment=not-a-real-subsegment&country=US',
      COMPANIES,
    );
    expect(parsed.filters).toEqual(
      filters({ segment: 'humanoids', country: 'US' }),
    );
  });

  it('keeps a sub-segment that exists under the active segment', () => {
    const parsed = parseMarketMapSearch(
      '?segment=humanoids&subSegment=industrial-humanoids',
      COMPANIES,
    );
    expect(parsed.filters.subSegment).toBe('industrial-humanoids');
  });

  it('drops a sub-segment that belongs to a different segment', () => {
    const parsed = parseMarketMapSearch(
      '?segment=humanoids&subSegment=warehouse-automation',
      COMPANIES,
    );
    expect(parsed.filters).toEqual(filters({ segment: 'humanoids' }));
  });

  it('keeps a globally valid sub-segment when no segment is active', () => {
    const parsed = parseMarketMapSearch(
      '?subSegment=warehouse-automation',
      COMPANIES,
    );
    expect(parsed.filters.subSegment).toBe('warehouse-automation');
  });

  it('drops an unknown country but keeps a valid approach', () => {
    const parsed = parseMarketMapSearch(
      '?country=Atlantis&approach=vla',
      COMPANIES,
    );
    expect(parsed.filters).toEqual(filters({ approach: 'vla' }));
  });

  it('drops an unknown approach', () => {
    const parsed = parseMarketMapSearch('?approach=not-an-approach', COMPANIES);
    expect(parsed.filters).toEqual(DEFAULT_MARKET_MAP_FILTERS);
  });

  it('drops every unknown data-derived value while valid siblings survive', () => {
    const parsed = parseMarketMapSearch(
      '?subSegment=bogus&country=XX&approach=bogus&status=public&confidence=low',
      COMPANIES,
    );
    expect(parsed.filters).toEqual(
      filters({ status: 'public', confidence: 'low' }),
    );
  });
});

describe('relaxFiltersForCompany', () => {
  const figure = COMPANIES.find((company) => company.id === 'figure-ai')!;
  const physicalIntelligence = COMPANIES.find(
    (company) => company.id === 'physical-intelligence',
  )!;

  it('keeps the filters the company passes and drops the rest', () => {
    const relaxed = relaxFiltersForCompany(
      filters({ segment: 'humanoids', country: 'CN', status: 'ipo' }),
      figure,
    );
    expect(relaxed).toEqual(filters({ segment: 'humanoids' }));
    expect(filterCompanies([figure], relaxed)).toHaveLength(1);
  });

  it('clears every filter when the company fails all of them', () => {
    const relaxed = relaxFiltersForCompany(
      filters({
        segment: 'foundation-models',
        subSegment: 'warehouse-automation',
        country: 'CN',
        status: 'ipo',
        approach: 'rtk',
        openSource: 'yes',
        confidence: 'low',
      }),
      figure,
    );
    expect(relaxed).toEqual(DEFAULT_MARKET_MAP_FILTERS);
    expect(filterCompanies([figure], relaxed)).toHaveLength(1);
  });

  it('always yields a filter set that includes the named company', () => {
    const combinations: MarketMapFilters[] = [
      filters({ country: 'US', confidence: 'high' }),
      filters({ segment: 'humanoids', openSource: 'no' }),
      filters({ subSegment: 'research-humanoids', status: 'public' }),
    ];
    for (const active of combinations) {
      expect(
        filterCompanies([figure], relaxFiltersForCompany(active, figure)),
      ).toHaveLength(1);
    }
  });

  it('keeps an open-source filter only when the company matches it', () => {
    expect(
      relaxFiltersForCompany(filters({ openSource: 'yes' }), figure)
        .openSource,
    ).toBeNull();
    expect(
      relaxFiltersForCompany(filters({ openSource: 'yes' }), physicalIntelligence)
        .openSource,
    ).toBe('yes');
    expect(
      relaxFiltersForCompany(filters({ openSource: 'no' }), physicalIntelligence)
        .openSource,
    ).toBeNull();
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
    // 71 -> 72 on 2026-10-19: Farm-ng's acquisition by Bonsai Robotics
    // (2025-07-24, first-party release) is a dated event in the window.
    // 72 -> 71 the same day: the field audit cut Physical Intelligence's
    // round date (The Robot Report says only that it raised "last week"),
    // so its Series B has no place on a dated timeline.
    expect(events).toHaveLength(71);
    expect(events.some((event) => event.companyId === 'physical-intelligence')).toBe(false);
    const farmNg = events.find((event) => event.companyId === 'farm-ng');
    expect(farmNg?.date).toBe('2025-07-24');
    expect(events.every((event) => event.date >= '2023-01-01')).toBe(true);
    expect(events.every((event) => event.date <= '2026-12-31')).toBe(true);
    expect(events.every((event) => event.sourceUrl.startsWith('http'))).toBe(
      true,
    );
    // Audit re-dating (2026-08-18): sources re-verified live during the
    // market-map audit carry their re-verification date, so an event's asOf
    // is the snapshot date or later, never staler than the page label.
    expect(events.every((event) => event.asOf >= MARKET_MAP_AS_OF)).toBe(true);

    const byId = Object.fromEntries(events.map((event) => [event.companyId, event]));
    // Figure's amount and Skild's valuation became null on 2026-10-19: their
    // sources give floors ("exceeds $1B", "more than $14 billion"), which the
    // cards carry as caveats instead of printing them as exact figures.
    expect(byId['figure-ai']).toMatchObject({
      amountUsd: null,
      amountAbsent: unknownFigure(),
      valuationUsd: 39_000_000_000,
      type: 'Series C',
      date: '2025-09-16',
    });
    expect(byId['skild-ai']).toMatchObject({
      amountUsd: 1_400_000_000,
      valuationUsd: null,
      date: '2026-01-14',
    });
    expect(byId['neura-robotics']).toMatchObject({
      // amountUsd nulled 2026-08-18 (batch-3 re-verification): every fetched
      // body — the company's own release, CNBC, TNW — phrases the round as
      // "up to $1.4 billion", a bound the issuer declined to make exact.
      // Type, date and the Tether lead survive from the same fetches.
      amountUsd: null,
      type: 'Series C',
      date: '2026-06-10',
    });
    expect(byId['unitree-robotics']).toMatchObject({
      type: 'IPO',
      // Priced 2026-08-06 at 150.8 yuan/share (Reuters via CNBC); the old
      // $618M / 2026-08-10 values were the pre-pricing approval snapshot.
      amountUsd: 904_000_000,
      valuationUsd: 9_040_000_000,
      date: '2026-08-06',
    });
    expect(byId['nimble-robotics']).toMatchObject({
      type: 'Series C',
      amountUsd: 106_000_000,
      valuationUsd: 1_000_000_000,
      date: '2024-10-23',
    });

    const covariant = events.find((event) => event.companyId === 'covariant');
    expect(covariant?.amountUsd).toBeNull();
    expect(covariant?.valuationUsd).toBeNull();
  });

  it('cites the source explicitly linked to a corrected round figure', () => {
    const byId = Object.fromEntries(
      timelineEvents(COMPANIES).map((event) => [event.companyId, event]),
    );

    // Round-source provenance added after the audit appended corrected
    // sources without reordering the historical sources[] ledger.
    expect(byId['spirit-ai'].sourceTitle).toContain('1.5B yuan / $222M');
    expect(byId['tars-robotics'].sourceTitle).toContain(
      'TARS Raises $455M Pre-A Round',
    );
    expect(byId['carbon-robotics'].sourceTitle).toContain(
      'Carbon Robotics raises $20M',
    );
    expect(byId['standard-bots'].sourceTitle).toContain(
      'Standard Bots raises $200 million Series C',
    );
    expect(byId['limx-dynamics'].sourceTitle).toContain(
      'LimX Dynamics $200M Pre-IPO Financing',
    );
    expect(byId['unitree-robotics'].sourceTitle).toContain(
      'prices IPO at $9 billion valuation',
    );
    expect(byId['nimble-robotics'].sourceTitle).toContain(
      'Nimble Closes $106 Million Series C at $1B Valuation',
    );
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
    expect(sum).toBe(111);
  });
});

describe('companyInitials', () => {
  it('takes the first letters of the first two words', () => {
    expect(companyInitials('Figure AI')).toBe('FA');
    expect(companyInitials('Physical Intelligence')).toBe('PI');
  });

  it('uses the first two letters of a single word', () => {
    expect(companyInitials('NVIDIA')).toBe('NV');
    expect(companyInitials('Nuro')).toBe('NU');
  });

  it('drops parenthetical product lines so the mark names the company', () => {
    expect(companyInitials('Tesla (Optimus)')).toBe('TE');
    expect(companyInitials('Hugging Face (LeRobot)')).toBe('HF');
    expect(companyInitials('Google DeepMind (Robotics)')).toBe('GD');
  });
});

describe('name search (the q param)', () => {
  const byId = (id: string) => COMPANIES.find((company) => company.id === id)!;

  it('matches word starts of the name and other names, case- and accent-blind', () => {
    expect(matchesQuery(byId('boston-dynamics'), 'dyn')).toBe(true);
    expect(matchesQuery(byId('boston-dynamics'), 'Boston DYN')).toBe(true);
    expect(matchesQuery(byId('google-deepmind-robotics'), 'deepmind')).toBe(true);
    expect(matchesQuery(byId('figure-ai'), 'figureai')).toBe(true);
    // Other names count: Unitree is also listed as Yushu Technology, and
    // Physical Intelligence as Pi and π.
    expect(matchesQuery(byId('unitree-robotics'), 'yushu')).toBe(true);
    expect(matchesQuery(byId('physical-intelligence'), 'π')).toBe(true);
    // Letters inside a word do not match: "ai" is not a word start of
    // "Physical Intelligence".
    expect(matchesQuery(byId('physical-intelligence'), 'ai')).toBe(false);
    expect(matchesQuery(byId('figure-ai'), 'gure')).toBe(false);
  });

  it('filters the population and intersects with the other filters', () => {
    expect(filterCompanies(COMPANIES, filters({ query: 'dyn' })).map((c) => c.id)).toEqual([
      'dyna-robotics',
      'boston-dynamics',
      'limx-dynamics',
    ]);
    expect(filterCompanies(COMPANIES, filters({ query: 'zzz' }))).toHaveLength(0);
    const humanoidsRo = filterCompanies(COMPANIES, filters({ segment: 'humanoids', query: 'ro' }));
    // 18 -> 19 on 2026-10-19: the field audit corrected 1X's former name
    // from "Halodi" to "Halodi Robotics", as Wikipedia gives it.
    // 19 -> 21 on 2026-10-20: Humanoid's registered name SKL Robotics Ltd
    // (The Robot Report) and EngineAI's full name, Shenzhen EngineAI Robotics
    // Technology Co., Ltd. (Wikipedia), are now among their other names.
    expect(humanoidsRo).toHaveLength(21);
    expect(humanoidsRo.map((company) => company.id)).toEqual(
      expect.arrayContaining(['1x-technologies', 'humanoid-uk', 'engineai']),
    );
    expect(humanoidsRo.every((company) => company.segment === 'humanoids')).toBe(true);
    expect(hasActiveFilters(filters({ query: 'ro' }))).toBe(true);
  });

  it('round-trips through the URL as q, normalized, and drops an empty one', () => {
    const parsed = parseMarketMapSearch('?segment=humanoids&q=%20%20Boston%20%20dyn%20', COMPANIES);
    expect(parsed.filters).toEqual(filters({ segment: 'humanoids', query: 'Boston dyn' }));
    expect(serializeMarketMapSearch(parsed)).toBe('segment=humanoids&q=Boston+dyn');
    expect(parseMarketMapSearch('?q=%20%20', COMPANIES).filters).toEqual(DEFAULT_MARKET_MAP_FILTERS);
    expect(normalizeQuery('x'.repeat(200))).toHaveLength(60);
    expect(normalizeQuery(null)).toBeNull();
  });

  it('is relaxed like any filter when a named company fails it', () => {
    const figure = byId('figure-ai');
    expect(relaxFiltersForCompany(filters({ query: 'fig', country: 'CN' }), figure)).toEqual(
      filters({ query: 'fig' }),
    );
    expect(relaxFiltersForCompany(filters({ query: 'agility' }), figure)).toEqual(
      DEFAULT_MARKET_MAP_FILTERS,
    );
  });
});

describe('round source and tile facts', () => {
  const byId = (id: string) => COMPANIES.find((company) => company.id === id)!;

  it('dates round figures by the round\'s own source, not the first source', () => {
    // The audit appended corrected sources without reordering sources[];
    // the round pointer names the one its figures were read from, and that
    // source's asOf is the date shown next to them.
    const tars = byId('tars-robotics');
    expect(tars.sources[0].asOf).toBe('2026-08-18');
    expect(roundSource(tars)).toMatchObject({ asOf: '2026-08-25' });
    expect(roundSource(tars)?.title).toContain('TARS Raises $455M Pre-A Round');
    const nimble = byId('nimble-robotics');
    expect(roundSource(nimble)).toMatchObject({
      url: nimble.latestRound?.sourceUrl,
      asOf: '2026-08-24',
    });
    // Without a pointer the first source stands.
    const covariant = byId('covariant');
    expect(covariant.latestRound?.sourceUrl).toBeUndefined();
    expect(roundSource(covariant)).toBe(covariant.sources[0]);
    // The timeline cites the same source.
    const events = Object.fromEntries(timelineEvents(COMPANIES).map((e) => [e.companyId, e]));
    expect(events['tars-robotics'].asOf).toBe('2026-08-25');
  });

  it('shows status for a company no longer private, else the latest disclosed amount', () => {
    // Figure's tile went blank on 2026-10-19 when its "exceeds $1B" floor
    // stopped standing in for an amount; Skild's exact $1.4B now carries
    // the round example, and Covariant, no longer marked acquired, is a
    // private company whose deal has no disclosed amount.
    expect(tileFact(byId('skild-ai'))).toEqual({
      kind: 'round',
      text: '$1.4B',
      label: 'latest round $1.4B, Series C',
    });
    expect(tileFact(byId('figure-ai'))).toEqual({
      kind: 'none',
      text: '',
      label: `latest round amount ${unknownFigure()}`,
    });
    expect(tileFact(byId('unitree-robotics'))).toMatchObject({ kind: 'status', text: 'IPO' });
    expect(tileFact(byId('boston-dynamics'))).toMatchObject({ kind: 'status', text: 'Acquired' });
    expect(tileFact(byId('covariant'))).toMatchObject({ kind: 'none', text: '' });
    expect(tileFact(byId('k-scale-labs'))).toMatchObject({ kind: 'status', text: 'Shut down' });
    // An empty amount leaves the tile blank and tells a screen reader the
    // disposition the registry records for it; it is never printed as zero.
    const blankCompanies = COMPANIES.filter((company) => tileFact(company).kind === 'none');
    const blank = blankCompanies.map(tileFact);
    expect(blank.length).toBeGreaterThan(0);
    for (const company of blankCompanies) {
      const recorded = company.absent['round.amountUsd'];
      expect(recorded, company.id).toBeDefined();
      expect(tileFact(company)).toEqual({
        kind: 'none',
        text: '',
        label: `latest round amount ${recorded!.state === 'not-applicable' ? 'n/a' : unknownFigure()}`,
      });
    }
    expect(COMPANIES.map(tileFact).some((fact) => /\$0\b/.test(fact.text))).toBe(false);
    // Every tile carries exactly one of the three.
    const kinds = COMPANIES.map((company) => tileFact(company).kind);
    expect(kinds.filter((kind) => kind === 'round').length + kinds.filter((kind) => kind === 'status').length + blank.length).toBe(111);
  });

  it('drops the parenthetical division from tile names', () => {
    expect(companyShortName('Google DeepMind (Robotics)')).toBe('Google DeepMind');
    expect(companyShortName('Zebra Technologies (Robotics Automation)')).toBe('Zebra Technologies');
    expect(companyShortName('Figure AI')).toBe('Figure AI');
  });
});

describe('map layout', () => {
  it('lays all six segments over seven tracks with no column deeper than 20 rows', () => {
    const counts = SEGMENT_ORDER.map(
      (segment) => COMPANIES.filter((company) => company.segment === segment).length,
    );
    const columns = planMapColumns(counts, 7);
    expect(columns).toEqual([
      { segments: [0], span: 1 },
      { segments: [1], span: 2 },
      { segments: [2], span: 1 },
      { segments: [3], span: 2 },
      { segments: [4, 5], span: 1 },
    ]);
    // Exactly the seven tracks, every segment once, in order.
    expect(columns.reduce((sum, column) => sum + column.span, 0)).toBe(7);
    expect(columns.flatMap((column) => column.segments)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('gives a lone segment every track and skips empty segments', () => {
    expect(planMapColumns([0, 34, 0, 0, 0, 0], 7)).toEqual([{ segments: [1], span: 7 }]);
    const columns = planMapColumns([3, 6, 0, 5, 0, 2], 7);
    expect(columns.flatMap((column) => column.segments)).toEqual([0, 1, 3, 5]);
    expect(columns.reduce((sum, column) => sum + column.span, 0)).toBe(7);
    expect(planMapColumns([0, 0, 0, 0, 0, 0], 7)).toEqual([]);
  });
});

describe('stepTile', () => {
  // Two columns of two tiles, then a third column of one, in reading order.
  const tiles: MapTileBox[] = [
    { id: 'a', left: 0, top: 0, width: 100, height: 40 },
    { id: 'b', left: 120, top: 0, width: 100, height: 40 },
    { id: 'c', left: 0, top: 50, width: 100, height: 40 },
    { id: 'd', left: 120, top: 50, width: 100, height: 40 },
    { id: 'e', left: 240, top: 0, width: 100, height: 40 },
  ];

  it('steps through reading order with Left and Right, wrapping', () => {
    expect(stepTile(tiles, 'a', 'ArrowRight')).toBe('b');
    expect(stepTile(tiles, 'd', 'ArrowRight')).toBe('e');
    expect(stepTile(tiles, 'e', 'ArrowRight')).toBe('a');
    expect(stepTile(tiles, 'a', 'ArrowLeft')).toBe('e');
  });

  it('keeps Up and Down in the column and stops at its ends', () => {
    expect(stepTile(tiles, 'a', 'ArrowDown')).toBe('c');
    expect(stepTile(tiles, 'b', 'ArrowDown')).toBe('d');
    expect(stepTile(tiles, 'd', 'ArrowUp')).toBe('b');
    expect(stepTile(tiles, 'c', 'ArrowDown')).toBe('c');
    // Nothing under e in its own column: no sideways jump.
    expect(stepTile(tiles, 'e', 'ArrowDown')).toBe('e');
  });

  it('jumps to the ends with Home and End and ignores unknown ids', () => {
    expect(stepTile(tiles, 'c', 'Home')).toBe('a');
    expect(stepTile(tiles, 'c', 'End')).toBe('e');
    expect(stepTile(tiles, 'zz', 'ArrowDown')).toBe('zz');
  });
});
