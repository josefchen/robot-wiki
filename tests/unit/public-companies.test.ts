import { describe, expect, it } from 'vitest';
import {
  AI_LAB_FILINGS,
  DEBUTS,
  IPO_WATCH,
  LEFT_OUT_COMPANIES,
  PUBLIC_COMPANIES,
  PUBLIC_COMPANIES_AS_OF,
  REMOVED_COMPANIES,
  type PublicCompany,
} from '@/data/public-companies';
import {
  aiLabFilingSchema,
  debutSchema,
  ipoWatchSchema,
  leftOutCompanySchema,
  publicCompanySchema,
  removedCompanySchema,
} from '@/data/schemas/public-company';
import { SEGMENT_ORDER } from '@/lib/market-map';
import {
  EXPOSURE_CLASSES,
  PUBLIC_SEGMENTS,
  PUBLIC_TO_MARKET_MAP_SEGMENT,
  companiesByCountry,
  companiesBySegment,
  debutGrossProceeds,
  debutsWithChange,
  exposureCounts,
  mapSizeUsd,
  marketValueSourceLine,
  roboticsSharePercent,
  sinceListingChange,
  sizedCompanies,
  sizedTotalsBySegment,
  toUsd,
  type EurReferenceRates,
} from '@/lib/public-companies';

/**
 * ECB euro reference rates for 13 November 2026, units per 1 EUR, copied
 * from https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml
 * (Cube time="2026-11-13"), the date data/fx-rates.ts uses.
 */
const ECB_2026_11_13 = {
  USD: 1.1052,
  JPY: 176.83,
  GBP: 0.83559,
  SEK: 11.1075,
  CHF: 0.9266,
  NOK: 10.5695,
  AUD: 1.6288,
  CAD: 1.5758,
  CNY: 7.3738,
  HKD: 8.6714,
  ILS: 3.5485,
  INR: 104.1575,
  KRW: 1477.8,
  NZD: 1.9978,
} as const;

/**
 * Federal Reserve H.10, release of 9 November 2026: 32.8500 TWD per USD on
 * 6 November 2026 (https://www.federalreserve.gov/releases/h10/current/,
 * row TAIWAN DOLLAR, column Nov. 6). The ECB publishes no TWD rate, so the
 * per-EUR figure is the cross through the ECB's USD rate.
 */
const FED_TWD_PER_USD_2026_11_06 = 32.85;

const RATES: EurReferenceRates = {
  ...ECB_2026_11_13,
  TWD: FED_TWD_PER_USD_2026_11_06 * ECB_2026_11_13.USD,
};

const byName = (name: string): PublicCompany => {
  const company = PUBLIC_COMPANIES.find((c) => c.name === name);
  if (!company) throw new Error(`no listed company named ${name}`);
  return company;
};

const MULTIPLIERS: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12, B: 1e9 };

/**
 * Reads the value out of a quote page's passage: the market-cap sentence
 * ("… net worth of $153.77 billion as of …") or, for a listing too new to
 * have a market-cap page, the overview's "Market Cap 5.12B".
 */
function quotedValue(passage: string): { value: number; code: string | null } {
  const match = /(?:net worth of|Market Cap) (?:[$€]|([A-Z]{3}) )?([\d,.]+)\s*(thousand|million|billion|trillion|B)\b/.exec(
    passage,
  );
  if (!match) throw new Error(`no value in "${passage}"`);
  return { value: Number(match[2].replace(/,/g, '')) * MULTIPLIERS[match[3]], code: match[1] ?? null };
}

describe('public companies data', () => {
  it('parses against the schemas', () => {
    expect(publicCompanySchema.array().safeParse(PUBLIC_COMPANIES).error).toBeUndefined();
    expect(removedCompanySchema.array().safeParse(REMOVED_COMPANIES).error).toBeUndefined();
    expect(leftOutCompanySchema.array().safeParse(LEFT_OUT_COMPANIES).error).toBeUndefined();
    expect(debutSchema.array().safeParse(DEBUTS).error).toBeUndefined();
    expect(ipoWatchSchema.array().safeParse(IPO_WATCH).error).toBeUndefined();
    expect(aiLabFilingSchema.array().safeParse(AI_LAB_FILINGS).error).toBeUndefined();
  });

  it('gives every row a unique id', () => {
    for (const rows of [PUBLIC_COMPANIES, REMOVED_COMPANIES, LEFT_OUT_COMPANIES, DEBUTS, IPO_WATCH, AI_LAB_FILINGS]) {
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('matches the counts the research pack states', () => {
    // The pack's prose gives 135 listed (its heading says 134), classes 73, 19 and 43,
    // and these country and segment counts. Each is computed from the rows here.
    expect(PUBLIC_COMPANIES).toHaveLength(135);
    expect(exposureCounts()).toEqual({ 'pure play': 73, 'major part': 19, 'minor part': 43 });
    const countries = Object.fromEntries(companiesByCountry().map(([country, rows]) => [country, rows.length]));
    expect({ CN: countries.CN, US: countries.US, KR: countries.KR, JP: countries.JP }).toEqual({
      CN: 45,
      US: 37,
      KR: 17,
      JP: 15,
    });
    const elsewhere = PUBLIC_COMPANIES.filter((c) => !['CN', 'US', 'KR', 'JP'].includes(c.country));
    expect(elsewhere).toHaveLength(21);
    const segments = Object.fromEntries(
      Object.entries(companiesBySegment()).map(([segment, rows]) => [segment, rows.length]),
    );
    expect(segments).toEqual({
      arms: 33,
      components: 20,
      surgical: 19,
      service: 15,
      drones: 15,
      logistics: 12,
      vehicles: 11,
      humanoids: 10,
    });
    expect(LEFT_OUT_COMPANIES).toHaveLength(22);
    expect(REMOVED_COMPANIES).toHaveLength(4);
    expect(IPO_WATCH).toHaveLength(21);
    expect(AI_LAB_FILINGS).toHaveLength(3);
  });

  it('copies each market value from its quote page sentence, at the as-of close', () => {
    for (const company of PUBLIC_COMPANIES) {
      const quote = company.marketCapSource.quote;
      expect(quote, company.id).toMatch(/as of November 13, 2026|At close: Nov 13, 2026/);
      const { value, code } = quotedValue(quote);
      expect(value, company.id).toBeCloseTo(company.marketCap, -3);
      if (code) expect(company.currency, company.id).toBe(code);
      if (quote.includes('$')) expect(company.currency, company.id).toBe('USD');
      if (quote.includes('€')) expect(company.currency, company.id).toBe('EUR');
    }
    expect(PUBLIC_COMPANIES_AS_OF).toBe('2026-11-13');
  });

  it('matches companies by the name on the quote page, not the ticker', () => {
    const listedNames = new Set(PUBLIC_COMPANIES.flatMap((c) => [c.name, c.quoteName]));
    const listedTickers = new Set(PUBLIC_COMPANIES.map((c) => c.ticker));
    for (const removed of REMOVED_COMPANIES) {
      expect(listedNames.has(removed.name), removed.id).toBe(false);
      expect(listedTickers.has(removed.ticker), removed.id).toBe(false);
    }
    for (const company of PUBLIC_COMPANIES) expect(company.quoteName).not.toMatch(/ChronoScale/);
    const ekso = REMOVED_COMPANIES.find((r) => r.ticker === 'EKSO');
    expect(ekso?.sources.some((s) => s.quote.startsWith('ChronoScale Holdings has a market cap'))).toBe(true);
    const unitree = byName('Unitree Robotics');
    expect(unitree.quoteName).toBe('Yushu Technology Co., Ltd.');
    expect(unitree.marketCapSource.quote.startsWith('Yushu Technology has a market cap')).toBe(true);
  });

  it('keeps left-out and removed companies out of the listed rows', () => {
    const listedTickers = new Set(PUBLIC_COMPANIES.map((c) => `${c.exchange}:${c.ticker}`));
    const listedNames = new Set(PUBLIC_COMPANIES.map((c) => c.name));
    for (const row of LEFT_OUT_COMPANIES) {
      expect(listedTickers.has(`${row.exchange}:${row.ticker}`), row.id).toBe(false);
      expect(listedNames.has(row.name), row.id).toBe(false);
    }
  });

  it('carries the older rate date on TWD rows only', () => {
    const twd = PUBLIC_COMPANIES.filter((c) => c.currency === 'TWD');
    expect(twd.map((c) => c.name).sort()).toEqual(['Hiwin Technologies', 'Techman Robot']);
    for (const company of PUBLIC_COMPANIES) {
      expect(company.fxRateDate, company.id).toBe(company.currency === 'TWD' ? '2026-11-06' : undefined);
    }
  });

  it('has a rate for every listing currency but the euro', () => {
    for (const company of PUBLIC_COMPANIES) {
      if (company.currency === 'EUR') continue;
      expect(RATES[company.currency], company.id).toBeGreaterThan(0);
    }
  });
});

describe('exposure', () => {
  it('rests the ten judgement classes on the companies the pack names', () => {
    const judged = PUBLIC_COMPANIES.filter((c) => c.exposureBasis === 'judgement').map((c) => c.name);
    expect(judged.sort()).toEqual(
      [
        'Amazon',
        'Hyundai Motor',
        'Johnson & Johnson',
        'LG Electronics',
        'Medtronic',
        'Mitsubishi Electric',
        'Scott Technology',
        'Smith & Nephew',
        'Stryker',
        'Xiaomi',
      ].sort(),
    );
    for (const company of PUBLIC_COMPANIES.filter((c) => c.exposureBasis === 'judgement')) {
      expect(company.note, company.id).toBeTruthy();
    }
  });

  it('marks every business-description class as reported', () => {
    for (const company of PUBLIC_COMPANIES.filter((c) => c.exposureBasis === 'business description')) {
      expect(company.exposureSource?.type, company.id).toBe('reported');
    }
  });

  it('recomputes Fanuc and Yaskawa from their filed figures', () => {
    const fanuc = byName('Fanuc');
    expect(fanuc.exposure).toBe('major part');
    const f = fanuc.roboticsShare!;
    expect([f.lineRevenue, f.totalRevenue]).toEqual([378_610e6, 857_831e6]);
    // Fanuc's release also states the share; the figures must give it back.
    expect(Math.round((f.lineRevenue! / f.totalRevenue!) * 1000) / 10).toBe(f.filedPercent);

    const yaskawa = byName('Yaskawa Electric');
    expect(yaskawa.exposure).toBe('major part');
    expect(yaskawa.exposureBasis).toBe('computed from filed figures');
    const y = yaskawa.roboticsShare!;
    expect([y.lineRevenue, y.totalRevenue]).toEqual([247.0e9, 542.1e9]);
    expect(roboticsSharePercent(yaskawa)).toBeCloseTo((247.0 / 542.1) * 100, 10);
  });

  it('gives every computed share both figures in one currency and period', () => {
    for (const company of PUBLIC_COMPANIES.filter((c) => c.exposureBasis === 'computed from filed figures')) {
      const share = roboticsSharePercent(company);
      expect(share, company.id).not.toBeNull();
      expect(share!, company.id).toBeGreaterThan(0);
      expect(share!, company.id).toBeLessThan(100);
    }
  });

  it('keeps ABB and Midea minor, Fanuc and Yaskawa major', () => {
    expect(byName('ABB').exposure).toBe('minor part');
    expect(byName('Midea Group').exposure).toBe('minor part');
    expect(byName('Fanuc').exposure).toBe('major part');
    expect(byName('Yaskawa Electric').exposure).toBe('major part');
    expect(roboticsSharePercent(byName('Midea Group'))).toBe(6.8);
  });
});

describe('conversion and sizing', () => {
  it('converts through the euro cross rate', () => {
    expect(toUsd(100, 'USD', RATES)).toBe(100);
    expect(toUsd(100, 'EUR', RATES)).toBeCloseTo(110.52, 10);
    expect(toUsd(176.83, 'JPY', RATES)).toBeCloseTo(1.1052, 12);
    expect(toUsd(32.85, 'TWD', RATES)).toBeCloseTo(1, 12);
  });

  it('never sizes a minor-part company', () => {
    for (const name of ['NVIDIA', 'Alphabet', 'Amazon', 'Tesla', 'ABB', 'Midea Group']) {
      expect(mapSizeUsd(byName(name), RATES), name).toBeNull();
    }
    for (const company of PUBLIC_COMPANIES) {
      const size = mapSizeUsd(company, RATES);
      if (company.exposure === 'minor part') expect(size, company.id).toBeNull();
      else expect(size, company.id).toBe(toUsd(company.marketCap, company.currency, RATES));
    }
  });

  it('totals each segment over its sized companies only', () => {
    const totals = sizedTotalsBySegment(RATES);
    expect(totals.map((t) => t.segment)).toEqual([...PUBLIC_SEGMENTS]);
    const sized = sizedCompanies(RATES);
    const counts = exposureCounts();
    expect(sized).toHaveLength(counts['pure play'] + counts['major part']);
    for (const total of totals) {
      const members = sized.filter((s) => s.company.segment === total.segment);
      expect(total.companies, total.segment).toBe(members.length);
      expect(total.usd, total.segment).toBeCloseTo(
        members.reduce((sum, s) => sum + s.usd, 0),
        -3,
      );
    }
    const all = totals.reduce((sum, t) => sum + t.usd, 0);
    expect(all).toBeCloseTo(sized.reduce((sum, s) => sum + s.usd, 0), -3);
  });

  it('orders sized companies largest first', () => {
    const sized = sizedCompanies(RATES);
    for (let i = 1; i < sized.length; i += 1) expect(sized[i - 1].usd).toBeGreaterThanOrEqual(sized[i].usd);
  });

  it('maps every segment onto a market-map segment', () => {
    for (const segment of PUBLIC_SEGMENTS) {
      expect(SEGMENT_ORDER).toContain(PUBLIC_TO_MARKET_MAP_SEGMENT[segment]);
    }
    expect(EXPOSURE_CLASSES).toEqual(['pure play', 'major part', 'minor part']);
  });
});

describe('debuts', () => {
  it('belong to listed companies and listed in 2026', () => {
    const ids = new Set(PUBLIC_COMPANIES.map((c) => c.id));
    for (const debut of DEBUTS) {
      if (debut.listedCompanyId !== null) expect(ids.has(debut.listedCompanyId), debut.id).toBe(true);
      if (debut.listingDate !== null) expect(debut.listingDate.slice(0, 4), debut.id).toBe('2026');
    }
    // Duke Robotics has no market value in the module, so no listed row.
    expect(DEBUTS.filter((d) => d.listedCompanyId === null).map((d) => d.id)).toEqual(['duke-robotics']);
    expect(ids.has('duke-robotics')).toBe(false);
    expect(DEBUTS).toHaveLength(25);
    expect(DEBUTS.find((d) => d.name === 'BRILS')?.listingDate).toBeNull();
  });

  it('gives every debut a close, the exchange’s own where it published one', () => {
    for (const debut of DEBUTS) expect(debut.close, debut.id).not.toBeNull();
    const host = (url: string) => new URL(url).hostname;
    for (const debut of DEBUTS.filter((d) => d.exchange === 'HKEX')) {
      const close = debut.close!;
      expect(close.url, debut.id).toBe('https://www.hkex.com.hk/eng/stat/smstat/dayquot/d261113e.htm');
      expect(close.verified, debut.id).toBe(true);
      // The sheet's second line opens with the closing price.
      const closing = close.quote!.split(' / ')[1].split(' ')[0];
      expect(Number(closing), debut.id).toBe(close.price);
      expect(close.quote!.startsWith(debut.ticker), debut.id).toBe(true);
    }
    expect(DEBUTS.filter((d) => d.exchange === 'HKEX')).toHaveLength(17);
    const at = (id: string) => DEBUTS.find((d) => d.id === id)!.close!;
    expect([at('estun-automation-h-shares'), at('excelland-robotics'), at('galaxis-technology'), at('huayan-robotics')]
      .map((c) => c.price)).toEqual([12.89, 34.48, 8.635, 6.705]);
    expect([at('unitree-robotics').price, host(at('unitree-robotics').url)]).toEqual([696, 'yunhq.sse.com.cn']);
    expect(at('unitree-robotics').quote).toContain('"date":20261113');
    expect(at('unitree-robotics').quote).toContain('696.0000');
    for (const [id, price] of [['swarmer', 8.84], ['agility-robotics', 7.36], ['duke-robotics', 2.02]] as const) {
      expect([at(id).price, host(at(id).url), at(id).verified], id).toEqual([price, 'api.nasdaq.com', true]);
      expect(at(id).url, id).toContain('fromdate=2026-11-13');
      expect(at(id).quote, id).toBe(`"date":"11/13/2026","close":"$${price}"`);
    }
    // KRX gave no price and NYSE's page prints none: these rest on the quote page, unverified.
    expect(at('cosmo-robotics').price).toBe(3875);
    expect(at('xtend-ai-robotics').price).toBe(1.39);
    const quotePages = DEBUTS.filter((d) => host(d.close!.url) === 'stockanalysis.com');
    expect(quotePages.map((d) => d.id).sort()).toEqual(['bigwave-robotics', 'brils', 'cosmo-robotics', 'xtend-ai-robotics']);
    for (const debut of quotePages) expect(debut.close!.verified, debut.id).toBe(false);
    for (const debut of DEBUTS.filter((d) => d.close!.verified)) {
      expect(host(debut.close!.url), debut.id).not.toBe('stockanalysis.com');
      expect(debut.close!.quote, debut.id).toBeTruthy();
    }
  });

  it('sums HKEX’s two lines for every Hong Kong debut', () => {
    const hk = DEBUTS.filter((d) => d.exchange === 'HKEX');
    for (const debut of hk) {
      const proceeds = debut.proceeds;
      if (debut.name === 'Amicro Technology') {
        expect(proceeds?.kind).toBe('stated');
        continue;
      }
      expect(proceeds?.kind, debut.id).toBe('hkex lines');
      if (proceeds?.kind !== 'hkex lines') continue;
      expect(debutGrossProceeds(debut), debut.id).toBe(proceeds.fundsRaisedA + proceeds.fundsRaisedB);
    }
  });

  it('takes Amicro’s figures from its allotment notice', () => {
    const amicro = DEBUTS.find((d) => d.name === 'Amicro Technology')!;
    expect(amicro.source.url).toMatch(/hkexnews\.hk\/listedco/);
    const proceeds = amicro.proceeds!;
    expect(proceeds.kind).toBe('stated');
    if (proceeds.kind !== 'stated') return;
    // The notice rounds gross proceeds to HK$0.01 million.
    expect(Math.abs(proceeds.offerShares! * amicro.offerPrice! - proceeds.gross)).toBeLessThan(5_000);
  });

  it('computes Unitree’s gross proceeds from the issue price and share count', () => {
    const unitree = DEBUTS.find((d) => d.name === 'Unitree Robotics')!;
    expect(unitree.offerPrice).toBe(150.8);
    expect(unitree.proceeds).toEqual({ kind: 'price times shares', offerShares: 40_446_434 });
    expect(debutGrossProceeds(unitree)).toBeCloseTo(150.8 * 40_446_434, 2);
  });

  it('gives no since-listing change without an offer price and a close', () => {
    for (const name of ['Agility Robotics', 'XTEND AI Robotics']) {
      const debut = DEBUTS.find((d) => d.name === name)!;
      expect(debut.offerPrice, name).toBeNull();
      expect(sinceListingChange(debut), name).toBeNull();
    }
    const withChange = debutsWithChange();
    for (const { debut, change } of withChange) {
      expect(change).toBeCloseTo(debut.close!.price / debut.offerPrice! - 1, 12);
    }
    expect(withChange.length).toBe(DEBUTS.filter((d) => d.offerPrice !== null && d.close !== null).length);
  });

  it('takes Swarmer’s amount from the 8-K that reports the closed IPO, not the pricing release', () => {
    const swarmer = DEBUTS.find((d) => d.id === 'swarmer')!;
    const proceeds = swarmer.proceeds!;
    expect(proceeds.kind).toBe('stated');
    if (proceeds.kind !== 'stated') return;
    expect([proceeds.gross, proceeds.offerShares, proceeds.qualifier]).toEqual([17.3e6, 3_450_000, 'final']);
    expect(proceeds.sourceUrl).toBe(
      'https://www.sec.gov/Archives/edgar/data/2092574/000110465926031244/tm2529424d17_8k.htm',
    );
    // 3,450,000 x $5.00 = $17.25M, which the 8-K rounds to $17.3 million.
    expect(Math.abs(proceeds.offerShares! * swarmer.offerPrice! - proceeds.gross)).toBeLessThanOrEqual(0.05e6);
    expect(swarmer.source.quote).not.toMatch(/expected to be approximately \$15\.0 million/);
    // The Ratel Robotics purchase was still pending on 10 November: no row speaks of it.
    const rows = [...PUBLIC_COMPANIES, ...DEBUTS].filter((r) => r.id === 'swarmer');
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toMatch(/merg|acqui|Ratel/i);
  });

  it('lists Duke Robotics as a Nasdaq uplisting of units, not on the IPO watch', () => {
    expect(IPO_WATCH.some((r) => r.id === 'duke-robotics' || r.name === 'Duke Robotics')).toBe(false);
    const duke = DEBUTS.find((d) => d.id === 'duke-robotics')!;
    expect([duke.exchange, duke.ticker, duke.listingDate, duke.currency, duke.offerPrice]).toEqual([
      'Nasdaq',
      'DUKR',
      '2026-05-15',
      'USD',
      8.2,
    ]);
    // 1,125,000 units at $8.20 = $9,225,000, the 8-K's gross.
    expect(duke.proceeds).toEqual({ kind: 'stated', gross: 9_225_000, qualifier: 'final' });
    expect(1_125_000 * duke.offerPrice!).toBeCloseTo(9_225_000, 6);
    expect(duke.source.quote).toContain('1,125,000 units');
    expect(duke.source.quote).toContain('$8.20');
    expect(duke.source.quote).toContain('$9,225,000');
    expect([duke.source.type, duke.source.verified]).toEqual(['primary', true]);
    expect(JSON.stringify(duke)).not.toMatch(/6\.85/);
    // A share's close against a unit's price: the change stands only beside the note that says so.
    expect(duke.note).toContain('Uplisted from OTCQB');
    expect(duke.note).toContain('a unit of one share and one warrant');
    expect(sinceListingChange(duke)).toBeCloseTo(2.02 / 8.2 - 1, 12);
  });
});

describe('IPO watch and AI labs', () => {
  it('flags the ABB Robotics sale as not an IPO', () => {
    const abb = IPO_WATCH.filter((r) => r.status === 'not an IPO');
    expect(abb.map((r) => r.id)).toEqual(['abb-robotics-sale']);
  });

  it('writes a missing filing one way', () => {
    expect(IPO_WATCH.filter((r) => /^none/i.test(r.filingType))).toEqual([]);
    expect(IPO_WATCH.filter((r) => r.filingType === 'not published').map((r) => r.id)).toEqual([
      'agibot',
      'engineai',
      'wb-electronics',
    ]);
  });

  it('marks every reported-only row with a reported source', () => {
    for (const row of IPO_WATCH.filter((r) => r.status === 'reported only' || r.status === 'paused')) {
      expect(row.source.type, row.id).toBe('reported');
    }
  });

  it('keeps the AI labs separate, with OpenAI as a confidential draft only', () => {
    const names = new Set(PUBLIC_COMPANIES.map((c) => c.name));
    for (const lab of AI_LAB_FILINGS) expect(names.has(lab.name), lab.id).toBe(false);
    expect(AI_LAB_FILINGS.find((l) => l.name === 'OpenAI')?.status).toBe('confidential draft only');
    const range = AI_LAB_FILINGS.find((l) => l.status === 'range set')!;
    expect(range.priceRange).toEqual({ low: 70, high: 78, currency: 'USD' });
    expect(range.shares!.company + range.shares!.sellingHolders).toBe(range.shares!.total);
  });
});

describe('sources and notes', () => {
  it('builds the source line from the as-of constant', () => {
    expect(marketValueSourceLine()).toBe(
      'Market values: Stock Analysis, close of 13 November 2026, in each listing’s currency (reported).',
    );
  });

  it('marks as verified only the sources opened again for this module', () => {
    const verifiedCaps = PUBLIC_COMPANIES.filter((c) => c.marketCapSource.verified).map((c) => c.name);
    expect(verifiedCaps.sort()).toEqual([
      'Amicro Technology',
      'Fanuc',
      'Intuitive Surgical',
      'Symbotic',
      'UBTech Robotics',
      'Unitree Robotics',
    ]);
    const verifiedExposure = PUBLIC_COMPANIES.filter((c) => c.exposureSource?.verified);
    const verifiedFilings = verifiedExposure.filter((c) => c.exposureBasis !== 'business description');
    expect(verifiedFilings.map((c) => c.name).sort()).toEqual(['Fanuc', 'Yaskawa Electric']);
    // The 56 company profiles reopened to replace quotes that held only the company name.
    expect(verifiedExposure.length - verifiedFilings.length).toBe(56);
    expect(LEFT_OUT_COMPANIES.filter((c) => c.source.verified).map((c) => c.id).sort()).toEqual([
      'applied-aerospace-and-defense',
      'ningbo-tuopu',
      'ningbo-zhongda-leader',
      'robotechnik',
      'seyond',
      'swancor-advanced-materials',
    ]);
    expect(byName('ABB').exposureSource?.verified).toBe(false);
  });

  it('quotes a passage past the company name for every exposure and left-out source', () => {
    const wordsPastName = (quote: string, name: string) =>
      (quote.startsWith(name) ? quote.slice(name.length) : quote).split(/\s+/).filter((w) => /\p{L}|\d/u.test(w))
        .length;
    for (const c of PUBLIC_COMPANIES) {
      if (!c.exposureSource) continue;
      const quote = c.exposureSource.quote.trim();
      expect(quote, c.id).not.toBe(c.quoteName);
      expect(quote.length, c.id).toBeGreaterThan(c.quoteName.length);
      expect(quote.length, c.id).toBeGreaterThan(c.name.length);
      expect(wordsPastName(quote, c.quoteName), c.id).toBeGreaterThanOrEqual(6);
    }
    for (const c of LEFT_OUT_COMPANIES) {
      const quote = c.source.quote.trim();
      expect(quote.length, c.id).toBeGreaterThan(c.name.length);
      expect(wordsPastName(quote, c.name), c.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('writes notes and reasons as one short clause without dashes', () => {
    const texts = [
      ...PUBLIC_COMPANIES.map((c) => c.note),
      ...DEBUTS.map((d) => d.note),
      ...IPO_WATCH.map((r) => r.note),
      ...AI_LAB_FILINGS.map((r) => r.note),
      ...REMOVED_COMPANIES.map((r) => r.reason),
      ...LEFT_OUT_COMPANIES.map((r) => r.reason),
    ].filter((t): t is string => t !== undefined);
    for (const text of texts) {
      expect(text, text).not.toMatch(/[–—]| - /);
      expect(text.length, text).toBeLessThanOrEqual(110);
      expect(text.endsWith('.'), text).toBe(true);
    }
  });
});
