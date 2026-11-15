import { describe, expect, it } from 'vitest';
import {
  CORPORATE_EVENTS,
  EUROPE_INVESTORS,
  LISTINGS,
  MARKET_CONTEXT,
  ROUNDS,
  ROUNDS_AS_OF,
  UK_EUROPE_2026_EARLIER,
  type FundingEvent,
} from '@/data/rounds';
import {
  corporateEventSchema,
  currencySchema,
  fundingEventSchema,
  investorNoteSchema,
  marketContextSchema,
  roundSectorSchema,
} from '@/data/schemas/round';
import { EUR_REFERENCE_RATES, FX_RATES_DATE, FX_RATES_SOURCE_URL } from '@/data/fx-rates';
import { SEGMENT_ORDER } from '@/lib/market-map';
import {
  SECTOR_ORDER,
  SECTOR_SEGMENT,
  amountUsd,
  canonicalInvestor,
  closedRoundsInWindow,
  countsByStatus,
  formatMoney,
  leadInvestorCounts,
  monthUnconfirmedRounds,
  plotDate,
  reportedSourceCount,
  roundsInWindow,
  sizeBands,
  toUsd,
  totalRaisedUsd,
  totalsByMonth,
  totalsBySector,
  ukAndEuropeRounds,
  windowMembership,
  windowStart,
} from '@/lib/rounds';

const FUNDING_SETS = { ROUNDS, LISTINGS, UK_EUROPE_2026_EARLIER } as const;
const ALL_KEYED = [
  ...ROUNDS,
  ...LISTINGS,
  ...UK_EUROPE_2026_EARLIER,
  ...CORPORATE_EVENTS,
  ...EUROPE_INVESTORS,
  ...MARKET_CONTEXT,
];

const total = (rows: readonly FundingEvent[]) =>
  rows.reduce((sum, r) => sum + (typeof r.amount === 'number' ? toUsd(r.amount, r.currency) : 0), 0);

describe('rounds data', () => {
  it('parses every record against its schema', () => {
    for (const [name, rows] of Object.entries(FUNDING_SETS)) {
      for (const row of rows) {
        const parsed = fundingEventSchema.safeParse(row);
        expect(parsed.success, `${name} ${row.key}: ${parsed.error?.message}`).toBe(true);
      }
    }
    for (const row of CORPORATE_EVENTS) {
      expect(corporateEventSchema.safeParse(row).success, row.key).toBe(true);
    }
    for (const row of EUROPE_INVESTORS) {
      expect(investorNoteSchema.safeParse(row).success, row.key).toBe(true);
    }
    for (const row of MARKET_CONTEXT) {
      expect(marketContextSchema.safeParse(row).success, row.key).toBe(true);
    }
  });

  it('holds the first tally by kind, less the rows left out', () => {
    // The first tally: 147 closed rounds and 4 unconfirmed, 7 listings, 14 corporate
    // events, 11 earlier UK and Europe rows, 4 investor and 4 context rows.
    // Left out: Tangent, Maven and the Genrobot Series A. Agreed, not
    // closed, so announced: CMR Surgical's round, Shield's Series H and
    // FieldAI's term sheet (unconfirmed in the first tally). Kraken's source dates it
    // to July only, so it leaves the earlier rows for the July month-only rounds.
    // Added after it: Medtronic's investment in Cornerstone Robotics, made by 9 Nov.
    expect(ROUNDS.filter((r) => r.status === 'closed')).toHaveLength(147 - 3 - 2 + 1 + 1);
    expect(ROUNDS.filter((r) => r.status === 'announced')).toHaveLength(3);
    expect(ROUNDS.filter((r) => r.status === 'unconfirmed')).toHaveLength(4 - 1);
    expect(ROUNDS.filter((r) => r.status === 'talks')).toHaveLength(9);
    expect(LISTINGS).toHaveLength(7);
    expect(CORPORATE_EVENTS.filter((r) => r.kind === 'acquisition')).toHaveLength(10);
    expect(CORPORATE_EVENTS.filter((r) => r.kind === 'blocked')).toHaveLength(1);
    expect(CORPORATE_EVENTS.filter((r) => r.kind === 'shutdown')).toHaveLength(3);
    expect(UK_EUROPE_2026_EARLIER).toHaveLength(11 - 1);
    expect(EUROPE_INVESTORS).toHaveLength(4);
    expect(MARKET_CONTEXT).toHaveLength(4);
    expect(monthUnconfirmedRounds()).toHaveLength(12 + 1);
    expect(monthUnconfirmedRounds().map((r) => r.key)).toContain('kraken-technology-2026-07-13');
  });

  it('keeps every key unique across all exports', () => {
    const keys = ALL_KEYED.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('links every record to an https source', () => {
    for (const row of ALL_KEYED) {
      expect(row.sourceUrl.startsWith('https://'), row.key).toBe(true);
      expect(() => new URL(row.sourceUrl), row.key).not.toThrow();
    }
  });

  it('gives every amount as a positive number or says it is not disclosed', () => {
    for (const row of [...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER]) {
      if (typeof row.amount === 'number') {
        expect(Number.isFinite(row.amount) && row.amount > 0, row.key).toBe(true);
      } else {
        expect(row.amount, row.key).toBe('not disclosed');
      }
    }
    for (const row of CORPORATE_EVENTS) {
      if (typeof row.amount === 'number') expect(row.amount, row.key).toBeGreaterThan(0);
      else if (row.kind === 'shutdown') expect(row.amount, row.key).toBe('n/a');
      else expect(row.amount, row.key).toBe('not disclosed');
      if (row.amountIsApproximate) expect(typeof row.amount, row.key).toBe('number');
    }
  });

  it('has an ECB rate for every currency the rows use', () => {
    const used = new Set<string>([
      ...[...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER].map((r) => r.currency),
      ...CORPORATE_EVENTS.flatMap((r) => (r.currency ? [r.currency] : [])),
      ...MARKET_CONTEXT.flatMap((r) => r.figures.map((f) => f.currency)),
    ]);
    for (const currency of used) {
      expect(currency === 'EUR' || currency in EUR_REFERENCE_RATES, currency).toBe(true);
    }
    for (const currency of currencySchema.options) {
      if (currency === 'EUR') continue;
      expect(EUR_REFERENCE_RATES[currency], currency).toBeGreaterThan(0);
    }
    expect(FX_RATES_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FX_RATES_DATE <= ROUNDS_AS_OF).toBe(true);
    expect(FX_RATES_SOURCE_URL.startsWith('https://www.ecb.europa.eu/')).toBe(true);
  });

  it('maps every sector to exactly one market-map segment', () => {
    expect([...SECTOR_ORDER].sort()).toEqual([...roundSectorSchema.options].sort());
    for (const sector of roundSectorSchema.options) {
      expect(SEGMENT_ORDER).toContain(SECTOR_SEGMENT[sector]);
    }
  });

  it('puts a note on every floor, debt and lead-unconfirmed row', () => {
    for (const row of [...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER]) {
      if (row.amountIsFloor || row.includesDebt || row.leadUnconfirmed) {
        expect(row.note, row.key).toBeTruthy();
      }
    }
  });

  it('never repeats the borderline reason in the note', () => {
    const borderline = [...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER].filter(
      (r) => r.borderline,
    );
    expect(borderline.length).toBeGreaterThan(0);
    for (const row of borderline) {
      expect(row.borderline!.length, row.key).toBeGreaterThan(0);
      if (row.note) {
        expect(row.note.toLowerCase(), row.key).not.toContain(row.borderline!.toLowerCase());
      }
    }
  });

  it('marks an amount as a floor or approximate, never both, and only with a figure', () => {
    const approximate = [...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER].filter(
      (r) => r.amountIsApproximate,
    );
    expect(approximate.length).toBeGreaterThan(0);
    for (const row of approximate) {
      expect(row.amountIsFloor, row.key).toBeUndefined();
      expect(typeof row.amount, row.key).toBe('number');
    }
    const both = { ...approximate[0], amountIsFloor: true as const };
    expect(fundingEventSchema.safeParse(both).success).toBe(false);
  });

  it('keeps announced to listings and the three agreed rounds, and the earlier rows closed', () => {
    expect(ROUNDS.filter((r) => r.status === 'announced').map((r) => r.key).sort()).toEqual([
      'cmr-surgical-stryker-2026-10-12',
      'fieldai-2026-10-02',
      'shield-ai-series-h-2026-11-05',
    ]);
    for (const row of UK_EUROPE_2026_EARLIER) expect(row.status, row.key).toBe('closed');
    for (const row of LISTINGS) expect(['closed', 'announced']).toContain(row.status);
  });
});

describe('the window', () => {
  it('starts 120 days before the as-of date', () => {
    expect(ROUNDS_AS_OF).toBe('2026-11-14');
    expect(windowStart()).toBe('2026-07-17');
    expect(windowStart('2026-03-01', 1)).toBe('2026-02-28');
  });

  it('plots month-only rows on the 15th', () => {
    expect(plotDate({ date: '2026-09', datePrecision: 'month' })).toBe('2026-09-15');
    expect(plotDate({ date: '2026-09-03', datePrecision: 'day' })).toBe('2026-09-03');
  });

  it('never plots a row after the as-of date', () => {
    expect(plotDate({ date: '2026-11', datePrecision: 'month' }, '2026-11-14')).toBe('2026-11-14');
    expect(plotDate({ date: '2026-11', datePrecision: 'month' }, '2026-11-15')).toBe('2026-11-15');
    expect(plotDate({ date: '2026-11', datePrecision: 'month' }, '2026-11-30')).toBe('2026-11-15');
    expect(plotDate({ date: '2026', datePrecision: 'year' }, '2026-03-01')).toBe('2026-03-01');
    for (const row of [...ROUNDS, ...LISTINGS, ...UK_EUROPE_2026_EARLIER]) {
      expect(plotDate(row) <= ROUNDS_AS_OF, row.key).toBe(true);
    }
  });

  it('marks a month that straddles the window start as unconfirmed', () => {
    expect(windowMembership({ date: '2026-07', datePrecision: 'month' })).toBe('unconfirmed');
    expect(windowMembership({ date: '2026-08', datePrecision: 'month' })).toBe('in');
    expect(windowMembership({ date: '2026-07-16', datePrecision: 'day' })).toBe('out');
    expect(windowMembership({ date: '2026-07-17', datePrecision: 'day' })).toBe('in');
    expect(windowMembership({ date: '2026-11-15', datePrecision: 'day' })).toBe('out');
  });

  it('keeps the July month-only rows, flagged, and counts them', () => {
    const july = monthUnconfirmedRounds();
    expect(july.length).toBeGreaterThan(0);
    for (const row of july) {
      expect(row.datePrecision).toBe('month');
      expect(row.date).toBe('2026-07');
    }
    const inWindow = new Set(roundsInWindow().map((r) => r.key));
    for (const row of july) expect(inWindow.has(row.key), row.key).toBe(false);
  });

  it('places every earlier 2026 row before the window', () => {
    for (const row of UK_EUROPE_2026_EARLIER) {
      expect(windowMembership(row), row.key).toBe('out');
      expect(row.date.startsWith('2026'), row.key).toBe(true);
    }
  });
});

describe('conversion', () => {
  it('converts EUR, CNY and JPY through the euro cross rate', () => {
    const usdPerEur = EUR_REFERENCE_RATES.USD;
    expect(toUsd(27_040_000, 'EUR')).toBeCloseTo(27_040_000 * usdPerEur, 4);
    expect(toUsd(1_000_000_000, 'CNY')).toBeCloseTo(
      (1_000_000_000 / EUR_REFERENCE_RATES.CNY) * usdPerEur,
      4,
    );
    expect(toUsd(5_000_000_000, 'JPY')).toBeCloseTo(
      (5_000_000_000 / EUR_REFERENCE_RATES.JPY) * usdPerEur,
      4,
    );
    expect(toUsd(1_500_000_000, 'USD')).toBe(1_500_000_000);
  });

  it('returns null for an undisclosed amount', () => {
    expect(amountUsd({ amount: 'not disclosed', currency: 'CNY' })).toBeNull();
  });
});

describe('totals', () => {
  const closedKeys = new Set(closedRoundsInWindow().map((r) => r.key));

  it('counts closed rounds in the window only', () => {
    for (const row of ROUNDS) {
      if (row.status !== 'closed') expect(closedKeys.has(row.key), row.key).toBe(false);
      if (windowMembership(row) !== 'in') expect(closedKeys.has(row.key), row.key).toBe(false);
    }
    for (const row of [...LISTINGS, ...UK_EUROPE_2026_EARLIER, ...CORPORATE_EVENTS]) {
      expect(closedKeys.has(row.key), row.key).toBe(false);
    }
    const expected = ROUNDS.filter((r) => r.status === 'closed' && windowMembership(r) === 'in');
    expect(totalRaisedUsd()).toBeCloseTo(total(expected), 2);
  });

  it('adds totals by month and by sector up to the total', () => {
    const full = totalRaisedUsd();
    expect(totalsByMonth().reduce((s, m) => s + m.usd, 0)).toBeCloseTo(full, 2);
    expect(totalsBySector().reduce((s, m) => s + m.usd, 0)).toBeCloseTo(full, 2);
    const strict = totalRaisedUsd({ strict: true });
    expect(totalsByMonth({ strict: true }).reduce((s, m) => s + m.usd, 0)).toBeCloseTo(strict, 2);
    expect(totalsBySector({ strict: true }).reduce((s, m) => s + m.usd, 0)).toBeCloseTo(strict, 2);
    const rounds = closedRoundsInWindow().length;
    expect(totalsByMonth().reduce((s, m) => s + m.rounds, 0)).toBe(rounds);
    expect(totalsBySector().reduce((s, m) => s + m.rounds, 0)).toBe(rounds);
    expect(totalsByMonth().map((m) => m.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('makes the strict total the full total minus the borderline rows', () => {
    const borderline = closedRoundsInWindow().filter((r) => r.borderline);
    expect(borderline.length).toBeGreaterThan(0);
    expect(totalRaisedUsd({ strict: true })).toBeCloseTo(totalRaisedUsd() - total(borderline), 2);
  });

  it('matches the first tally of USD rounds, less the rows left out', () => {
    // The first tally gave USD 15.48B (15,478.2M) for closed USD rounds in the window.
    // Left out here: Tangent Robotics, 4.5M (its release states no currency)
    // and Maven Robotics, 100M. The Genrobot Series A also left out has no
    // amount. Moove's 250M is in, dated 5 August from its own page.
    // CMR Surgical's approximately 400M is agreed, not closed, and Shield
    // is still raising its 1B Series H. Shandong UBTECH's 13.9M is stored in
    // yuan, as its source announces it, and Motion's own post gives USD 2M
    // where the first tally had EUR. Cornerstone's approximately 700M, added
    // after the tally, is in: Cornerstone said on 9 Nov the investment is made.
    const usdOnly = closedRoundsInWindow().filter((r) => r.currency === 'USD');
    expect(total(usdOnly)).toBe(
      15_478_200_000 -
        4_500_000 -
        100_000_000 -
        400_000_000 -
        1_000_000_000 -
        13_900_000 +
        2_000_000 +
        700_000_000,
    );
  });

  it('counts Moove in the full total only and the Cornerstone investment in both', () => {
    const full = new Set(closedRoundsInWindow().map((r) => r.key));
    const strict = new Set(closedRoundsInWindow({ strict: true }).map((r) => r.key));
    expect(full.has('moove-2026-08-05')).toBe(true);
    expect(strict.has('moove-2026-08-05')).toBe(false);
    const cornerstone = 'cornerstone-robotics-medtronic-2026-09-01';
    expect(full.has(cornerstone)).toBe(true);
    expect(strict.has(cornerstone)).toBe(true);
  });

  it('counts statuses, reported sources and size bands from the same rows', () => {
    const counts = countsByStatus();
    expect(counts.closed).toBe(closedRoundsInWindow().length);
    expect(counts.closed + counts.unconfirmed + counts.talks + counts.announced).toBe(
      roundsInWindow().length,
    );
    expect(countsByStatus(LISTINGS).announced).toBe(
      LISTINGS.filter((r) => r.status === 'announced').length,
    );
    const reported = reportedSourceCount();
    expect(reported).toBe(closedRoundsInWindow().filter((r) => r.sourceType === 'reported').length);
    const bands = sizeBands();
    expect(bands.under10m + bands.from10mTo100m + bands.atLeast100m + bands.notDisclosed).toBe(
      closedRoundsInWindow().length,
    );
  });
});

describe('lead investors', () => {
  it('folds spellings of one investor into one name', () => {
    expect(canonicalInvestor('a16z')).toBe('Andreessen Horowitz');
    expect(canonicalInvestor('Andreessen Horowitz')).toBe('Andreessen Horowitz');
  });

  it('counts closed rounds in the window and skips unconfirmed leads', () => {
    const counts = leadInvestorCounts();
    const eligible = closedRoundsInWindow().filter((r) => !r.leadUnconfirmed);
    const appearances = eligible.reduce(
      (s, r) => s + new Set(r.leadInvestors.map(canonicalInvestor)).size,
      0,
    );
    expect(counts.reduce((s, c) => s + c.rounds, 0)).toBe(appearances);
    const skipped = new Set(closedRoundsInWindow().filter((r) => r.leadUnconfirmed).map((r) => r.key));
    for (const row of counts) {
      for (const key of row.keys) expect(skipped.has(key), key).toBe(false);
    }
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i - 1].rounds).toBeGreaterThanOrEqual(counts[i].rounds);
    }
    expect(leadInvestorCounts({ minRounds: 2 }).every((c) => c.rounds >= 2)).toBe(true);
  });
});

describe('UK and Europe', () => {
  it('lists closed 2026 rounds from Europe, inside and before the window', () => {
    const rows = ukAndEuropeRounds();
    for (const row of rows) {
      expect(row.status).toBe('closed');
      expect(row.date.startsWith('2026')).toBe(true);
    }
    const keys = new Set(rows.map((r) => r.key));
    for (const row of UK_EUROPE_2026_EARLIER) expect(keys.has(row.key), row.key).toBe(true);
    expect(keys.has('uforce-2026-11-12')).toBe(true);
    expect(keys.has('emulate-talks-2026-09-17')).toBe(false);
  });

  it('finds the UK rounds of the window, less the agreed CMR investment', () => {
    const uk = closedRoundsInWindow()
      .filter((r) => r.country === 'GB')
      .map((r) => r.key.replace(/-2026.*$/, ''))
      .sort();
    expect(uk).toEqual(
      [
        'bioliberty',
        'cambridge-aerospace',
        'cloudnc',
        'danu',
        'extend-robotics',
        'humanoid',
        'kinematic-trees',
        'machenta',
        'mistt',
        'nearhuman',
        'occam',
        'oshen',
        'port',
        'uforce',
        'versatile-robotx',
      ].sort(),
    );
  });
});

describe('formatMoney', () => {
  it('prints amounts under one million in thousands', () => {
    expect(formatMoney(585_000, 'GBP')).toBe('GBP 585K');
    expect(formatMoney(350_000, 'GBP')).toBe('GBP 350K');
  });

  it('prints millions and billions, and dollars through formatUsd', () => {
    expect(formatMoney(27_040_000, 'EUR')).toBe('EUR 27M');
    expect(formatMoney(4_290_000, 'EUR')).toBe('EUR 4.3M');
    expect(formatMoney(1_000_000_000, 'CNY')).toBe('CNY 1B');
    expect(formatMoney(1_500_000_000, 'USD')).toBe('$1.5B');
  });
});
