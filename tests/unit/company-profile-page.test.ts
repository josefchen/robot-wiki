import { describe, expect, it } from 'vitest';
import { UNITREE_PROFILE } from '@/data/company-profiles/unitree';
import {
  COMPANY_PROFILES,
  PCT_DIGITS,
  PROFILE_SECTIONS,
  REGION_COLUMNS,
  REPORTED_NOTE,
  absentWithNoun,
  calendarYearPeriod,
  companyProfile,
  companyProfilePath,
  cveCount,
  documentNames,
  formatChange,
  formatCnyWhole,
  formatStoredPct,
  groupLines,
  holderName,
  holdersLead,
  joinList,
  latestUnitsSold,
  lineYearRows,
  listingComputedNote,
  listingFacts,
  possessive,
  priceCounts,
  priceRange,
  productKinds,
  profileLead,
  resultsComputedNote,
  profilePageCounts,
  regionYearRows,
  resultsRows,
  sectionLeads,
  securityRecords,
  sourceLabel,
  timelineEvents,
} from '@/lib/company-profile-page';
import { toYuan } from '@/lib/company-profile';
import { ROUTE_SEO_PROFILES } from '@/lib/seo-profiles';

const profile = UNITREE_PROFILE;
const fact = (id: string) => listingFacts(profile).find((row) => row.id === id)!;

describe('company profile registry', () => {
  it('serves each profile once at /companies/<slug>/, with a search profile', () => {
    const slugs = COMPANY_PROFILES.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(companyProfile('unitree')).toBe(profile);
    expect(() => companyProfile('nobody')).toThrow();
    for (const slug of slugs) expect(ROUTE_SEO_PROFILES).toHaveProperty([companyProfilePath(slug)]);
  });

  it('keeps the sections in the brief’s order', () => {
    expect(PROFILE_SECTIONS.map((section) => section.id)).toEqual([
      'products',
      'money',
      'timeline',
      'software-and-data',
      'security',
    ]);
  });
});

describe('counts the page states', () => {
  it('counts products, events, security records, CVEs, holders and software from the rows', () => {
    expect(profilePageCounts(profile)).toEqual({
      products: 62,
      events: 40,
      security: 9,
      cves: 12,
      holders: 15,
      holderTableRows: 56,
      software: 34,
    });
  });

  it('splits the timeline into events and security records without losing a row', () => {
    const events = timelineEvents(profile);
    const security = securityRecords(profile);
    expect(events.length + security.length).toBe(profile.timeline.length);
    expect(events.some((row) => row.kind === 'security')).toBe(false);
    expect(security.every((row) => row.kind === 'security')).toBe(true);
    expect(events[0].date >= events.at(-1)!.date).toBe(true);
  });

  it('counts CVEs once each', () => {
    const all = profile.timeline.flatMap((row) => row.cves ?? []);
    expect(cveCount(profile)).toBe(new Set(all).size);
  });

  it('prices 31 products, quotes 16 on request and leaves 15 without a price, 62 in all', () => {
    const counts = priceCounts(profile);
    expect(counts).toEqual({ priced: 31, contactSales: 16, notDisclosed: 15 });
    expect(counts.priced + counts.contactSales + counts.notDisclosed).toBe(profile.products.length);
  });
});

describe('sentences', () => {
  it('leads with the 2025 sales and total revenue, ends on what the page\u2019s rows are, and leaves the date to the header', () => {
    expect(profileLead(profile)).toBe(
      'Unitree Robotics\u2019 listing documents report 2025 sales of 23,037 quadrupeds and 5,215 humanoids and total ' +
        'revenue of CNY\u00a01,699.27\u00a0m; this page lists 62 of the company\u2019s robots, arms, grippers, hands and ' +
        'lidars, 31 of them with a list price from USD 249 to USD 50,000',
    );
    expect(profileLead(profile)).not.toMatch(/[.,;:]\s*$/);
  });

  it('makes the page, not the company, the subject of the product count', () => {
    // The shop also sells motors, servos, batteries, chargers and a controller that are not rows.
    const lead = profileLead(profile);
    expect(lead).toMatch(/this page lists 62 of the company\u2019s /);
    expect(lead).not.toMatch(/\b(sells|names|makes) \d/);
    expect(lead).not.toMatch(/\bthe company (sells|names|makes|lists)\b/);
  });

  it('names the kinds of product from the rows\u2019 types, in row order', () => {
    expect(productKinds(profile)).toEqual(['robots', 'arms', 'grippers', 'hands', 'lidars']);
    const types = new Set(profile.products.map((row) => row.type));
    expect(types).toEqual(
      new Set(['humanoid', 'wheeled humanoid', 'dual-arm', 'quadruped', 'wheeled quadruped', 'arm', 'gripper', 'hand', 'lidar']),
    );
    expect(profileLead(profile)).toMatch(/robots, arms, grippers, hands and lidars/);
    expect(sectionLeads(profile).products).toMatch(/^The rows are robots, arms, grippers, hands and lidars;/);
  });

  it('dates the revenue with the sales and calls it total revenue, which is more than the two robot lines earned', () => {
    const fy2025 = calendarYearPeriod(profile, 2025);
    const robots = profile.revenueLines
      .filter((row) => row.year === 2025 && (row.line === 'humanoid' || row.line === 'quadruped'))
      .reduce((sum, row) => sum + toYuan(row), 0);
    expect(Math.round(robots / 1e4) / 100).toBe(1_565.46);
    expect(robots).toBeLessThan(toYuan({ amount: fy2025.revenue, unit: fy2025.unit }));
    expect(profileLead(profile)).toMatch(/report 2025 sales of .+ and total revenue of CNY\u00a01,699\.27\u00a0m;/);
  });

  it('uses the curly apostrophe in every sentence it writes', () => {
    const sentences = [profileLead(profile), ...Object.values(sectionLeads(profile)), holdersLead(profile)];
    for (const sentence of sentences) expect(sentence).not.toMatch(/'/);
    expect(possessive('Unitree Robotics')).toBe('Unitree Robotics\u2019');
    expect(possessive('Unitree')).toBe('Unitree\u2019s');
  });

  it('takes the lead’s price range, latest units and revenue from the rows', () => {
    const prices = profile.products.flatMap((row) => (row.priceUsd === null ? [] : [row.priceUsd]));
    expect(priceRange(profile)).toEqual({ low: Math.min(...prices), high: Math.max(...prices) });
    expect(latestUnitsSold(profile)).toEqual({
      year: 2025,
      lines: [
        { line: 'quadruped', sold: 23_037 },
        { line: 'humanoid', sold: 5_215 },
      ],
    });
    expect(calendarYearPeriod(profile, 2025).id).toBe('fy2025');
    expect(() => calendarYearPeriod(profile, 2019)).toThrow();
  });

  it('names the documents the results rest on from the rows themselves', () => {
    expect(documentNames(profile.financials)).toEqual([
      'final prospectus',
      'listing announcement',
      'Q3 2026 report',
    ]);
    expect(sectionLeads(profile).money).toBe(
      'Results from the final prospectus, listing announcement and Q3 2026 report, in millions of yuan.',
    );
  });

  it('states the product, event, software and security counts', () => {
    const leads = sectionLeads(profile);
    expect(leads.products).toBe(
      'The rows are robots, arms, grippers, hands and lidars; parts and accessories such as motors, batteries and ' +
        'chargers are not listed. Of the 62 rows, 31 carry a list price in US dollars from the maker’s shop or ' +
        'product page, 16 are quoted on request and 15 have no published price.',
    );
    expect(leads.timeline).toMatch(/^40 events, newest first\./);
    expect(leads['software-and-data']).toMatch(/^34 /);
    expect(leads.security).toMatch(/^9 records naming 12 CVEs/);
  });

  it('gives every United States restriction a reply or "no statement", as the timeline lead says', () => {
    const restrictions = profile.timeline.filter((row) => row.kind === 'us-restriction');
    expect(restrictions.length).toBeGreaterThan(0);
    for (const row of restrictions) expect(row.companyReply, row.id).not.toBe('n/a');
  });

  it('every priced trim rests on the maker’s shop or a unitree.com page, as the products lead says', () => {
    for (const product of profile.products.filter((row) => row.priceUsd !== null)) {
      expect(new URL(product.sourceUrl).hostname, product.id).toMatch(/(^|\.)unitree\.com$/);
    }
  });

  it('says how many of the filing’s holder rows the table keeps', () => {
    expect(holdersLead(profile)).toBe(
      '15 of the 56 rows in the listing announcement’s shareholder table, in its order.',
    );
  });

  it('joins lists in plain English', () => {
    expect(joinList([])).toBe('');
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a and b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('money', () => {
  it('converts each period to CNY millions from its own unit', () => {
    const rows = new Map(resultsRows(profile).map((row) => [row.period.id, row]));
    expect(rows.get('fy2025')!.revenue).toBe('CNY 1,699.27 m');
    expect(rows.get('fy2023')!.netProfit).toBe('-CNY 11.15 m');
    expect(rows.get('q3-2026')!.revenue).toBe('CNY 665.04 m');
    expect(rows.get('nine-months-2026')!.adjustedNetProfit).toBe('CNY 348.97 m');
  });

  it('states the 2025 charge once, with its amount, and keeps the other notes', () => {
    const rows = new Map(resultsRows(profile).map((row) => [row.period.id, row]));
    expect(rows.get('fy2025')!.notes).toEqual([
      'Net profit is after a one-off share-based payment charge of CNY 349.07 m.',
    ]);
    expect(rows.get('fy2024')!.notes).toEqual(['Revenue as restated by the board in May 2026.']);
    expect(rows.get('fy2023')!.notes).toEqual([]);
  });

  it('gives each margin its basis, marks the one computed on total revenue and names the absent ones', () => {
    const rows = new Map(resultsRows(profile).map((row) => [row.period.id, row]));
    expect(rows.get('nine-months-2026')!.margin).toEqual({ text: '54.02%', basis: 'on total revenue', computed: true });
    for (const id of ['fy2023', 'fy2024', 'fy2025']) {
      expect(rows.get(id)!.margin.basis, id).toBe('on main business');
      expect(rows.get(id)!.margin.computed, id).toBe(false);
    }
    expect(rows.get('fy2025')!.margin.text).toBe('60.13%');
    expect(rows.get('q3-2026')!.margin).toEqual({ text: 'margin not disclosed', basis: null, computed: false });
  });

  it('says what each computed figure is computed from', () => {
    expect(resultsComputedNote(profile)).toBe(
      'marks revenue less cost of sales, over revenue, from the Q3 2026 report, which states no margin.',
    );
    expect(listingComputedNote(profile)).toBe(
      'marks a figure derived from the rows above: net proceeds less the planned raise, the first-day close ' +
        'against the offer price and the latest close times the shares after listing.',
    );
    const computed = listingFacts(profile).filter((row) => row.computed);
    expect(computed.every((row) => row.derivation)).toBe(true);
    expect(listingFacts(profile).filter((row) => row.derivation)).toEqual(computed);
    expect(REPORTED_NOTE).not.toMatch(/figure/);
    expect(REPORTED_NOTE).not.toMatch(/\bthe publisher/);
    expect(REPORTED_NOTE).toMatch(/the company, maker or researcher the row is about/);
  });

  it('computes the average price per unit sold in whole yuan', () => {
    const rows = new Map(lineYearRows(profile).map((row) => [`${row.year}-${row.line}`, row]));
    expect(rows.get('2025-humanoid')!.averagePrice).toBe('CNY 166,411');
    expect(rows.get('2025-quadruped')!.averagePrice).toBe('CNY 30,283');
    expect(rows.get('2023-humanoid')!.averagePrice).toBe('CNY 593,420');
    expect(lineYearRows(profile).map((row) => row.year)).toEqual([2025, 2025, 2024, 2024, 2023, 2023]);
  });

  it('keeps sold and shipped apart', () => {
    const humanoids2025 = lineYearRows(profile).find((row) => row.year === 2025 && row.line === 'humanoid')!;
    expect(humanoids2025.sold).toBe(5_215);
    expect(humanoids2025.shipped).toBe(5_511);
    const quadrupeds2025 = lineYearRows(profile).find((row) => row.year === 2025 && row.line === 'quadruped')!;
    expect(quadrupeds2025.shipped).toBe('not disclosed');
  });

  it('pairs each year’s regions with its United States share', () => {
    expect(regionYearRows(profile).map((row) => [row.year, row.domesticPct, row.overseasPct, row.usPct])).toEqual([
      [2025, 56.35, 43.65, 13.3],
      [2024, 44.26, 55.74, 19.54],
      [2023, 44.37, 55.63, 18.39],
    ]);
  });

  it('heads domestic and overseas as shares of main business, since each year’s two regions sum to its main-business total', () => {
    const years = [...new Set(profile.regions.map((row) => row.year))];
    expect(years.length).toBe(3);
    for (const year of years) {
      const regions = profile.regions.filter((row) => row.year === year);
      const total = profile.mainBusinessTotals.find((row) => row.year === year)!;
      expect(regions.map((row) => row.region).sort(), String(year)).toEqual(['domestic', 'overseas']);
      expect(regions.every((row) => row.unit === total.unit), String(year)).toBe(true);
      // Two amounts rounded to 0.01 can miss their rounded total by 0.01: the filing's 2024 rows sum to 38,767.29.
      const gap = regions.reduce((sum, row) => sum + row.amount, 0) - total.amount;
      expect(Math.abs(gap), String(year)).toBeLessThanOrEqual(0.01 + 1e-9);
    }
    expect(profile.mainBusinessTotals.find((row) => row.year === 2025)!.amount).toBe(167_611.09);
    expect(REGION_COLUMNS).toEqual({
      domestic: 'Domestic, of main business',
      overseas: 'Overseas, of main business',
      us: 'United States',
    });
    // The United States share keeps its own basis note.
    expect(profile.marketShares.every((row) => row.note === 'The prospectus does not say which revenue this is a share of.')).toBe(true);
  });

  it('computes the listing figures it marks as computed', () => {
    expect(fact('over-plan')).toMatchObject({ value: 'CNY 1,715.44 m', computed: true });
    expect(fact('first-day-change')).toMatchObject({ value: '+460.34%', computed: true });
    expect(fact('value-at-close')).toMatchObject({ value: 'CNY 281.51 bn', computed: true });
    expect(fact('new-shares').value).toBe('40,446,434, 10.00% of the shares after listing');
    expect(fact('gross').value).toBe('CNY 6,099.32 m');
    expect(fact('net').value).toBe('CNY 5,917.15 m');
    expect(fact('value-at-offer').value).toBe('CNY 60.99 bn');
  });

  it('cites each vote figure on its own page of the listing announcement', () => {
    expect(fact('votes-direct')).toMatchObject({ value: '60.34%', source: { pageRef: 'p. 25' } });
    expect(fact('votes-with-platform')).toMatchObject({ value: '65.31%', source: { pageRef: 'p. 24' } });
  });

  it('dates the market-data prices and keeps them reported', () => {
    expect(fact('first-day')).toMatchObject({ date: '2026-08-19', value: 'opened CNY 1,100.00, closed CNY 845.00' });
    expect(fact('latest-close')).toMatchObject({ date: '2026-11-13', value: 'CNY 696.00' });
    expect(fact('first-day').source.sourceType).toBe('reported');
    expect(fact('value-at-close').source.sourceType).toBe('reported');
    const reported = listingFacts(profile).filter((row) => row.source.sourceType === 'reported');
    expect(reported.map((row) => row.id)).toEqual(['first-day', 'first-day-change', 'latest-close', 'value-at-close']);
  });

  it('sums the named groups from their member rows', () => {
    expect(groupLines(profile.holders)).toEqual([
      { group: 'Meituan', members: 3, stakeAfterPct: 8.684 },
      { group: 'HongShan', members: 2, stakeAfterPct: 6.4034 },
    ]);
  });
});

describe('formatting and sources', () => {
  it('writes absent values with their noun', () => {
    expect(absentWithNoun('not disclosed', 'price')).toBe('price not disclosed');
    expect(absentWithNoun('n/a', 'DoF')).toBe('n/a');
  });

  it('formats whole yuan and signed changes', () => {
    expect(formatCnyWhole({ amount: 16.64, unit: 'CNY10k' })).toBe('CNY 166,400');
    expect(formatChange(0.5)).toBe('+50.00%');
    expect(formatChange(-0.1737)).toBe('-17.37%');
  });

  it('formats each kind of percentage to one fixed precision, so a column lines up', () => {
    expect(formatStoredPct(13.3, 'share')).toBe('13.30%');
    expect(formatStoredPct(5.589, 'stake')).toBe('5.5890%');
    expect(formatStoredPct(6.21, 'stake')).toBe('6.2100%');
    expect(formatStoredPct(60.34, 'votes')).toBe('60.34%');
    const columns: Array<[keyof typeof PCT_DIGITS, number[]]> = [
      ['share', [...profile.regions, ...profile.marketShares, ...profile.revenueLines].map((row) => row.sharePct)],
      ['stake', profile.holders.flatMap((row) => [row.stakeAfterPct, ...(row.stakeBeforePct === 'n/a' ? [] : [row.stakeBeforePct])])],
      ['stake', groupLines(profile.holders).map((row) => row.stakeAfterPct)],
      ['votes', profile.holders.flatMap((row) => (row.votesAfterPct === 'not disclosed' ? [] : [row.votesAfterPct]))],
      ['votes', [profile.control.directVotesAfterPct.value, profile.control.withPlatformVotesAfterPct.value]],
    ];
    for (const [kind, values] of columns) {
      const texts = values.map((value) => formatStoredPct(value, kind));
      // Every cell has the column's decimals, and none drops a filed digit.
      for (const text of texts) expect(text, kind).toMatch(new RegExp(`^\\d+\\.\\d{${PCT_DIGITS[kind]}}%$`));
      for (const [index, value] of values.entries()) expect(Number.parseFloat(texts[index]), kind).toBe(value);
    }
  });

  it('keeps a vehicle number on the line of its "No."', () => {
    expect(holderName('Nanjing Jingwei Chuang No. 1')).toBe('Nanjing Jingwei Chuang No.\u00a01');
    expect(holderName('Wang Xingxing')).toBe('Wang Xingxing');
  });

  it('labels each source by the document its title names, else its host, and a data endpoint by its publisher', () => {
    expect(sourceLabel(profile.financials[0])).toBe('final prospectus');
    expect(sourceLabel(profile.listing.firstDay)).toBe('Eastmoney');
    expect(sourceLabel(profile.software.find((row) => row.id === 'github-org')!)).toBe('GitHub');
    expect(
      sourceLabel({ sourceUrl: 'https://huggingface.co/api/datasets?author=unitreerobotics', sourceTitle: 'Hugging Face API: datasets' }),
    ).toBe('Hugging Face');
    expect(() => sourceLabel({ sourceUrl: 'https://api.example.org/v1', sourceTitle: 'Example API' })).toThrow();
    expect(sourceLabel(profile.products[0])).toBe('unitree.com');
    expect(sourceLabel(profile.products.find((row) => row.id === 'g1-pro')!)).toBe('shop.unitree.com');
    expect(sourceLabel(securityRecords(profile).find((row) => row.id === 'sec-unibleed')!)).toBe(
      'Boschko Security Blog',
    );
  });

  it('gives every row a short, non-empty source label', () => {
    const sources = [
      ...profile.products,
      ...profile.timeline,
      ...profile.holders,
      ...profile.financials,
      ...profile.software,
      ...listingFacts(profile).map((row) => row.source),
    ];
    for (const source of sources) {
      const label = sourceLabel(source);
      expect(label.length, source.sourceTitle).toBeGreaterThan(2);
      expect(label.length, source.sourceTitle).toBeLessThanOrEqual(40);
      expect(label, source.sourceTitle).not.toMatch(/^api\.|^push\d*\w*\./);
    }
  });
});
