import { describe, expect, it } from 'vitest';
import {
  CORPORATE_EVENTS,
  LISTINGS,
  MARKET_CONTEXT,
  ROUNDS,
  ROUNDS_AS_OF,
  UK_EUROPE_2026_EARLIER,
  type FundingEvent,
} from '@/data/rounds';
import { EUR_REFERENCE_RATES } from '@/data/fx-rates';
import {
  closedRoundsInWindow,
  reportedSourceCount,
  ROUNDS_WINDOW_DAYS,
  totalRaisedUsd,
  totalsByMonth,
  windowStart,
} from '@/lib/rounds';
import {
  CONTEXT_KEYS,
  COVERAGE_THRESHOLDS_USD,
  ROUNDS_PAGE_PATH,
  ROUNDS_PAGE_SECTIONS,
  amountText,
  contextSentence,
  corporateEventText,
  countryName,
  coverageText,
  eventDateText,
  formatTotalUsd,
  headlineFacts,
  headlineText,
  leadsText,
  monthCells,
  pageContext,
  placeText,
  roundAnchor,
  roundsLeadSentence,
  sourceHost,
} from '@/lib/rounds-page';
import { routeSeoProfile } from '@/lib/seo-profiles';

describe('headline totals', () => {
  it('takes both totals and every count from lib/rounds.ts', () => {
    const facts = headlineFacts();
    expect(facts.strictUsd).toBe(totalRaisedUsd({ strict: true }));
    expect(facts.fullUsd).toBe(totalRaisedUsd());
    expect(facts.closed).toBe(closedRoundsInWindow().length);
    expect(facts.closedStrict).toBe(closedRoundsInWindow({ strict: true }).length);
    expect(facts.borderline).toBe(closedRoundsInWindow().filter((r) => r.borderline).length);
    expect(facts.reported).toBe(reportedSourceCount());
    expect(facts.start).toBe(windowStart());
    expect(facts.end).toBe(ROUNDS_AS_OF);
  });

  it('leaves out at least one borderline row, so the two totals differ', () => {
    const facts = headlineFacts();
    expect(facts.borderline).toBeGreaterThan(0);
    expect(facts.fullUsd).toBeGreaterThan(facts.strictUsd);
    expect(formatTotalUsd(facts.fullUsd)).not.toBe(formatTotalUsd(facts.strictUsd));
  });

  it('prints the counts and the window in words', () => {
    const facts = headlineFacts();
    const text = headlineText(facts);
    expect(text.strict).toBe(
      `raised in ${facts.closedStrict} closed rounds from 17 July 2026 to 14 November 2026`,
    );
    expect(text.full).toBe(`with the ${facts.borderline} closed rounds marked borderline robotics`);
    expect(text.reported).toContain(`${facts.reported} of the ${facts.closed} closed rounds`);
  });

  it('formats totals to one decimal in billions and whole millions below', () => {
    expect(formatTotalUsd(15_034_000_000)).toBe('$15.0B');
    expect(formatTotalUsd(14_960_000_000)).toBe('$15.0B');
    expect(formatTotalUsd(1_450_000_000)).toBe('$1.4B');
    expect(formatTotalUsd(650_000_000)).toBe('$650M');
  });
});

describe('top of the page', () => {
  it('leaves the lead open for the header to close on the date, and states the window from the module', () => {
    const lead = roundsLeadSentence();
    expect(lead).toBe(
      `Robotics funding rounds, listings, acquisitions and shutdowns over the last ${ROUNDS_WINDOW_DAYS} days, each linked to its source`,
    );
    expect(lead).not.toMatch(/[.,;:!?]\s*$/);
    expect(lead).not.toMatch(/\d{4}/);
  });

  it('states the window from the module in the search title and description', () => {
    const profile = routeSeoProfile(ROUNDS_PAGE_PATH);
    // The title is in title case: "Last 120 Days".
    expect(profile.title.toLowerCase()).toContain(`${ROUNDS_WINDOW_DAYS} days`);
    expect(profile.description).toContain(`${ROUNDS_WINDOW_DAYS} days`);
  });

  it('gives every section a unique id', () => {
    const ids = ROUNDS_PAGE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('states coverage from the thresholds and claims sums, not market totals', () => {
    expect(COVERAGE_THRESHOLDS_USD).toEqual({ nearComplete: 100_000_000, regional: 50_000_000 });
    const text = coverageText();
    expect(text).toContain('Above $100M the list is close to complete outside China.');
    expect(text).toContain('From $50M to $100M it is good for the United States and Europe and thin for China');
    expect(text).toContain('below $50M it shows examples, not totals');
    expect(text).toContain('sum of the rounds listed');
  });
});

describe('month row', () => {
  it('has one cell per month of totalsByMonth, strict, and they sum to the strict total', () => {
    const cells = monthCells();
    const months = totalsByMonth({ strict: true });
    expect(cells.map((c) => [c.month, c.usd, c.rounds])).toEqual(months.map((m) => [m.month, m.usd, m.rounds]));
    expect(cells.reduce((s, c) => s + c.usd, 0)).toBeCloseTo(totalRaisedUsd({ strict: true }), 0);
  });

  it('marks only the months the window cuts', () => {
    const cells = monthCells();
    expect(cells[0]).toMatchObject({ name: 'July 2026', span: 'from 17 July' });
    expect(cells.at(-1)).toMatchObject({ name: 'November 2026', span: 'to 14 November' });
    expect(cells.slice(1, -1).every((c) => c.span === null)).toBe(true);
  });
});

describe('cell text', () => {
  it('prints a month-only date as the month and never invents a day', () => {
    expect(eventDateText({ date: '2026-11-12', datePrecision: 'day' })).toBe('12 Nov 2026');
    expect(eventDateText({ date: '2026-07', datePrecision: 'month' })).toBe('Jul 2026');
    expect(eventDateText({ date: '2026', datePrecision: 'year' })).toBe('2026');
  });

  it('names countries and keeps "not disclosed" out of a known place', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('not disclosed')).toBe('not disclosed');
    expect(placeText('Munich', 'DE')).toBe('Munich, Germany');
    expect(placeText('not disclosed', 'DE')).toBe('Germany');
    expect(placeText('not disclosed', 'not disclosed')).toBe('not disclosed');
  });

  it('names a city that is its own country once, and Hong Kong by its short name', () => {
    expect(countryName('HK')).toBe('Hong Kong');
    expect(placeText('Hong Kong', 'HK')).toBe('Hong Kong');
    expect(placeText('Singapore', 'SG')).toBe('Singapore');
    expect(placeText('not disclosed', 'HK')).toBe('Hong Kong');
  });

  it('prints every place in the module as a name, never a code or a repeat', () => {
    const records = [...ROUNDS, ...LISTINGS, ...CORPORATE_EVENTS, ...UK_EUROPE_2026_EARLIER];
    for (const { key, city, country } of records) {
      const place = placeText(city, country);
      expect(place, key).not.toMatch(/\b[A-Z]{2}\b|SAR/);
      const parts = place.split(', ');
      expect(new Set(parts).size, key).toBe(parts.length);
    }
  });

  it('prints an amount as announced, with the dollar conversion only for other currencies', () => {
    const base = { currency: 'USD' } as const;
    expect(amountText({ ...base, amount: 1_500_000_000 })).toEqual({ own: '$1.5B', usd: null });
    expect(amountText({ ...base, amount: 27_000_000, amountIsFloor: true })).toEqual({ own: 'over $27M', usd: null });
    expect(amountText({ ...base, amount: 'not disclosed' })).toEqual({ own: 'not disclosed', usd: null });
    expect(amountText({ currency: 'EUR', amount: 'n/a' })).toEqual({ own: 'n/a', usd: null });
    const eur = amountText({ currency: 'EUR', amount: 100_000_000, amountIsApproximate: true });
    expect(eur.own).toBe('about EUR 100M');
    expect(eur.usd).toBe(`about $${Math.round(100 * EUR_REFERENCE_RATES.USD)}M`);
  });

  it('says what each corporate event is', () => {
    const byKind = (kind: string) => CORPORATE_EVENTS.find((e) => e.kind === kind)!;
    expect(corporateEventText(byKind('shutdown'))).toBe('Shut down');
    expect(corporateEventText(byKind('blocked'))).toBe(`Purchase by ${byKind('blocked').acquirer} blocked`);
    expect(corporateEventText(byKind('acquisition'))).toBe(`Acquisition by ${byKind('acquisition').acquirer}`);
  });

  it('shows the source host and the leads the source names', () => {
    expect(sourceHost('https://www.agilityrobotics.com/content/x')).toBe('agilityrobotics.com');
    expect(leadsText({ leadInvestors: [] })).toBe('none named');
    expect(leadsText({ leadInvestors: ['a16z', 'Khosla'] } as Pick<FundingEvent, 'leadInvestors'>)).toBe('a16z, Khosla');
    expect(roundAnchor('zipline-2026-11-05')).toBe('round-zipline-2026-11-05');
  });
});

describe('tracker lines', () => {
  it('picks the named MARKET_CONTEXT rows and words them from their fields', () => {
    const rows = pageContext();
    expect(rows.map((r) => r.key)).toEqual([...CONTEXT_KEYS]);
    for (const row of rows) {
      const sentence = contextSentence(row);
      expect(sentence).toContain(String(row.figures[0].deals));
      expect(sentence).toContain(row.publisher);
    }
    const trr = MARKET_CONTEXT.find((c) => c.key === 'trr-august-2026-total')!;
    expect(contextSentence(trr)).toBe(
      'In August 2026 The Robot Report counted 162 robotics financial transactions worldwide, IPOs included, worth $4.9B.',
    );
  });

  it('carries floors through to the words', () => {
    const floor = MARKET_CONTEXT.find((c) => c.figures[0].dealsIsFloor)!;
    expect(contextSentence(floor)).toMatch(/counted over \d+ .* worth over /);
  });
});
