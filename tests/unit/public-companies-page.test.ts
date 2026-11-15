import { describe, expect, it } from 'vitest';
import { EUR_REFERENCE_RATES, FX_RATES_DATE, TWD_PER_USD, TWD_RATE_DATE } from '@/data/fx-rates';
import {
  AI_LAB_FILINGS,
  DEBUTS,
  IPO_WATCH,
  LEFT_OUT_COMPANIES,
  PUBLIC_COMPANIES,
  type PublicCompany,
} from '@/data/public-companies';
import { LISTING_CURRENCIES } from '@/data/schemas/public-company';
import { debutGrossProceeds, toUsd } from '@/lib/public-companies';
import {
  NO_CLOSE,
  PAGE_RATES,
  PUBLIC_PAGE_SECTIONS,
  conversionNote,
  countryName,
  debutRows,
  debutTally,
  exposureText,
  formatChange,
  formatMoney,
  formatPrice,
  formatWatchDate,
  ipoRows,
  ipoWatchLead,
  leftOutCaption,
  leftOutLead,
  leftOutRows,
  listedLead,
  listedRows,
  publicLeadSentence,
  sinceListingLead,
  sourceHost,
} from '@/lib/public-companies-page';

const company = (name: string): PublicCompany => {
  const row = PUBLIC_COMPANIES.find((c) => c.name === name);
  if (!row) throw new Error(`no listed company named ${name}`);
  return row;
};

describe('the rates the page converts with', () => {
  it('carries the ECB rates of 13 November 2026 exactly as the ECB file gives them', () => {
    // https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml, Cube time="2026-11-13".
    expect(FX_RATES_DATE).toBe('2026-11-13');
    expect(EUR_REFERENCE_RATES).toEqual({
      USD: 1.1052,
      GBP: 0.83559,
      CNY: 7.3738,
      JPY: 176.83,
      KRW: 1477.8,
      INR: 104.1575,
      HKD: 8.6714,
      SEK: 11.1075,
      CHF: 0.9266,
      NOK: 10.5695,
      AUD: 1.6288,
      CAD: 1.5758,
      ILS: 3.5485,
      NZD: 1.9978,
    });
  });

  it('takes TWD from the Fed H.10 at its own, older date', () => {
    expect(TWD_PER_USD).toBe(32.85);
    expect(TWD_RATE_DATE).toBe('2026-11-06');
    expect(toUsd(32.85, 'TWD', PAGE_RATES)).toBeCloseTo(1, 12);
  });

  it('has a rate for every listing currency but the euro', () => {
    for (const currency of LISTING_CURRENCIES) {
      if (currency === 'EUR') continue;
      expect(PAGE_RATES[currency], currency).toBeGreaterThan(0);
    }
  });

  it('states both dates in the conversion note', () => {
    expect(conversionNote()).toBe(
      "Sorted by market value in US dollars, converted at the European Central Bank's reference rates of " +
        "13 November 2026; Taiwan dollars at the Federal Reserve's H.10 rate of 6 November 2026.",
    );
  });
});

describe('formats', () => {
  it('writes amounts to three significant figures in their own currency', () => {
    expect(formatMoney(3.93e12, 'USD')).toBe('$3.93T');
    expect(formatMoney(153.77e9, 'USD')).toBe('$154B');
    expect(formatMoney(1324e12, 'KRW')).toBe('KRW 1324T');
    expect(formatMoney(709.7e6, 'HKD')).toBe('HKD 710M');
    expect(formatMoney(6.85e6, 'USD')).toBe('$6.85M');
    expect(formatMoney(2.6e9, 'CNY')).toBe('CNY 2.6B');
  });

  it('writes share prices as given, with grouping', () => {
    expect(formatPrice(17600, 'KRW')).toBe('KRW 17,600');
    expect(formatPrice(43.24, 'HKD')).toBe('HKD 43.24');
    expect(formatPrice(5, 'USD')).toBe('$5');
  });

  it('signs a change with a true minus and one decimal', () => {
    expect(formatChange(0.015)).toBe('+1.5%');
    expect(formatChange(-0.171)).toBe('−17.1%');
  });

  it('writes a month-only date without a day', () => {
    expect(formatWatchDate('2026-10')).toBe('Oct 2026');
    expect(formatWatchDate('2026-09-13')).toBe('13 Sep 2026');
  });

  it('names a source by its host', () => {
    expect(sourceHost('https://www2.hkexnews.hk/x.xlsx')).toBe('hkexnews.hk');
    expect(sourceHost('https://www.sec.gov/a')).toBe('sec.gov');
    expect(sourceHost('https://stockanalysis.com/stocks/isrg/')).toBe('stockanalysis.com');
  });
});

describe('page text', () => {
  it('opens with counts taken from the rows', () => {
    expect(publicLeadSentence()).toBe(
      '135 listed robotics companies by market value, the 24 debuts of 2026 and 21 companies on the IPO watch',
    );
    expect(PUBLIC_COMPANIES).toHaveLength(135);
    expect(DEBUTS).toHaveLength(24);
    expect(IPO_WATCH.filter((row) => row.status !== 'not an IPO')).toHaveLength(21);
  });

  it('gives each section its lead', () => {
    expect(PUBLIC_PAGE_SECTIONS.map((s) => s.id)).toEqual(['listed-companies', 'ipo-watch', 'since-listing']);
    expect(listedLead()).toBe(
      '73 pure plays, 19 companies where robots are a major part and 43 where they are a minor part, largest first.',
    );
    expect(leftOutLead()).toBe(
      '22 listed companies kept off the list: robots are neither the business nor a named, reported part of it.',
    );
    expect(ipoWatchLead()).toBe(
      '21 companies heading to market, nearest first: 1 priced, 9 filed, 3 accepted, 1 postponed, 1 paused and ' +
        '6 reported only. The ABB Robotics sale closes the table as context: not an IPO.',
    );
    expect(sinceListingLead()).toBe(
      'Of the 24 debuts of 2026, 7 trade above their offer price and 13 below it at the close of 13 November 2026. ' +
        'Agility Robotics and XTEND AI Robotics listed by merger, with no offer price; ' +
        'the data has no close for Cosmo Robotics and Estun Automation (H shares).',
    );
  });
});

describe('listed companies table', () => {
  const rows = listedRows();

  it('lists every company once, largest value in US dollars first', () => {
    expect(rows).toHaveLength(PUBLIC_COMPANIES.length);
    expect(new Set(rows.map((r) => r.company.id)).size).toBe(rows.length);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i - 1].usd).toBeGreaterThanOrEqual(rows[i].usd);
    for (const row of rows) expect(row.usd).toBe(toUsd(row.company.marketCap, row.company.currency, PAGE_RATES));
  });

  it('shows the value in its listing currency and in dollars beside it', () => {
    const at = (name: string) => rows.find((r) => r.company.name === name)!;
    expect(rows[0].company.name).toBe('NVIDIA');
    expect([at('NVIDIA').value, at('NVIDIA').valueUsd]).toEqual(['$3.93T', null]);
    // 1324 trillion won / 1477.8 * 1.1052 = $990.5B.
    expect([at('Samsung Electronics').value, at('Samsung Electronics').valueUsd]).toEqual(['KRW 1324T', '$991B']);
    // Taiwan dollars at the Fed's 32.85 a dollar.
    expect(at('Hiwin Technologies').valueUsd).toBe(formatMoney(at('Hiwin Technologies').company.marketCap / 32.85, 'USD'));
  });

  it('names every country', () => {
    for (const c of PUBLIC_COMPANIES) expect(countryName(c.country), c.id).toMatch(/^[A-Z][a-z]/);
    expect(() => countryName('XX')).toThrow();
  });

  it('gives the share a filing supports, its line and its period', () => {
    expect(exposureText(company('Fanuc'))).toEqual({
      label: 'major part',
      detail: 'ROBOT Division: 44.1% of revenue, year to 31 March 2026',
      reported: false,
    });
    expect(exposureText(company('Yaskawa Electric')).detail).toBe(
      'Robotics: 45.6% of revenue, year to 28 February 2026',
    );
    expect(exposureText(company('ABB')).detail).toBe('Robotics: about 7% of revenue, 2024');
    expect(exposureText(company('Midea Group')).detail).toBe('Robotics & Automation: 6.8% of revenue, 2025');
    expect(exposureText(company('Alphabet')).detail).toBe('Other Bets: $1.54B revenue, 2025');
  });

  it('marks an exposure that rests on the quote service as reported', () => {
    expect(exposureText(company('Intuitive Surgical'))).toEqual({
      label: 'pure play',
      detail: 'company profile',
      reported: true,
    });
    for (const row of rows) {
      expect(row.exposure.reported, row.company.id).toBe(row.company.exposureSource?.type === 'reported');
    }
  });

  it('lists the companies left out by name', () => {
    const left = leftOutRows();
    expect(left).toHaveLength(LEFT_OUT_COMPANIES.length);
    expect(left.map((r) => r.name)).toEqual([...left.map((r) => r.name)].sort((a, b) => a.localeCompare(b)));
  });

  it('describes the left-out sources by the pages they are', () => {
    const profiles = LEFT_OUT_COMPANIES.filter((r) => r.source.url.endsWith('/company/')).length;
    expect([profiles, LEFT_OUT_COMPANIES.length - profiles]).toEqual([18, 4]);
    expect(leftOutCaption()).toBe(
      'Sources: Stock Analysis, the company profile for 18 and the market value page for 4 (reported).',
    );
    const elsewhere = { ...LEFT_OUT_COMPANIES[0], source: { ...LEFT_OUT_COMPANIES[0].source, url: 'https://example.com/x' } };
    expect(() => leftOutCaption([elsewhere])).toThrow();
  });
});

describe('IPO watch table', () => {
  const rows = ipoRows();
  const at = (id: string) => rows.find((r) => r.row.id === id)!;

  it('puts the nearest listing first and the ABB Robotics sale last, flagged', () => {
    expect(rows).toHaveLength(IPO_WATCH.length);
    expect(rows[0].row.id).toBe('al-robot');
    const last = rows.at(-1)!;
    expect([last.row.id, last.row.status, last.amount, last.valuation]).toEqual([
      'abb-robotics-sale',
      'not an IPO',
      'n/a',
      'n/a',
    ]);
  });

  it('leaves the AI labs out: they say nothing about robotics', () => {
    const names = new Set(rows.map((r) => r.row.name));
    for (const lab of AI_LAB_FILINGS) expect(names.has(lab.name), lab.name).toBe(false);
  });

  it('prints amounts, prices and valuations from the rows', () => {
    expect([at('al-robot').amount, at('al-robot').amountKind, at('al-robot').price]).toEqual([
      'KRW 42.2B',
      'raised',
      'KRW 17,600 a share, final',
    ]);
    expect(at('changzhou-microintelligence').price).toBe('HKD 21.46 a share, maximum');
    expect([at('aitmc-ventures').amount, at('aitmc-ventures').date]).toEqual(['35,000,000', 'Oct 2026']);
    expect(at('wb-electronics').valuation).toBe('EUR 7B');
    expect([at('deep-robotics').amount, at('leju-robotics').amount]).toEqual(['CNY 2.5B', 'CNY 2.6B']);
    // A direct listing raises nothing; an unknown is "not disclosed".
    expect(at('firefly-robotics').amount).toBe('n/a');
    expect([at('galbot').date, at('galbot').amount]).toEqual(['not disclosed', 'not disclosed']);
  });

  it('marks reported rows where the module does', () => {
    for (const row of rows) expect(row.reported, row.row.id).toBe(row.row.source.type === 'reported');
  });
});

describe('since listing table', () => {
  const rows = debutRows();
  const at = (id: string) => rows.find((r) => r.debut.id === id)!;

  it('ranks the debuts by change, the ones without a price to compare last', () => {
    expect(rows).toHaveLength(DEBUTS.length);
    expect(rows[0].debut.id).toBe('unitree-robotics');
    const changes = rows.map((r) => r.change);
    const firstNull = changes.indexOf(null);
    expect(changes.slice(firstNull).every((c) => c === null)).toBe(true);
    expect(rows.slice(firstNull).map((r) => r.debut.id)).toEqual([
      'agility-robotics',
      'xtend-ai-robotics',
      'cosmo-robotics',
      'estun-automation-h-shares',
    ]);
    expect(debutTally(rows)).toEqual({
      above: 7,
      below: 13,
      noOffer: ['Agility Robotics', 'XTEND AI Robotics'],
      noClose: ['Cosmo Robotics', 'Estun Automation (H shares)'],
    });
  });

  it('computes each change from the offer price and the close', () => {
    // 696 / 150.8 - 1 = +361.5%; 84.35 / 101.7 - 1 = -17.1%.
    expect([at('unitree-robotics').offer, at('unitree-robotics').close, at('unitree-robotics').changeText]).toEqual([
      'CNY 150.8',
      'CNY 696',
      '+361.5%',
    ]);
    expect(at('mech-mind-robotics').changeText).toBe('−17.1%');
    expect([at('agility-robotics').offer, at('agility-robotics').changeText]).toEqual(['n/a', 'n/a']);
  });

  it('says a missing close is the data’s gap, never that no close exists', () => {
    // Cosmo has an offer price and trades: the change is unknown, not inapplicable.
    expect([at('cosmo-robotics').offer, at('cosmo-robotics').close, at('cosmo-robotics').changeText]).toEqual([
      'KRW 6,000',
      NO_CLOSE,
      NO_CLOSE,
    ]);
    expect(at('agility-robotics').close).toBe(NO_CLOSE);
    for (const row of rows) {
      if (!row.debut.close) expect(row.close, row.debut.id).toBe(NO_CLOSE);
      if (row.change === null) expect(row.changeText, row.debut.id).toBe(row.debut.offerPrice === null ? 'n/a' : NO_CLOSE);
    }
  });

  it('sums what each debut raised from the module, never a press total', () => {
    // 150.80 x 40,446,434 shares.
    expect([at('unitree-robotics').raised, at('unitree-robotics').raisedKind]).toEqual([
      'CNY 6.1B',
      'offer price times shares',
    ]);
    // HKEX's (a) and (b) lines: 119,874,252 + 1,258,638,568.
    expect([at('edge-medical').raised, at('edge-medical').raisedKind]).toEqual(['HKD 1.38B', 'HKEX, both lines']);
    // Amicro's allotment notice, not the press's HK$1.78 billion.
    expect(at('amicro-technology').raised).toBe('HKD 710M');
    expect(at('cosmo-robotics').raised).toBe('not disclosed');
    for (const row of rows) {
      const gross = debutGrossProceeds(row.debut);
      expect(row.raised, row.debut.id).toBe(gross === null ? 'not disclosed' : formatMoney(gross, row.debut.currency));
    }
  });
});
