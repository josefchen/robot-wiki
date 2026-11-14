import { describe, expect, it } from 'vitest';
import { UNITREE_AS_OF, UNITREE_PROFILE } from '@/data/company-profiles/unitree';
import {
  companyProfileSchema,
  holderSchema,
  productSchema,
  profileDateSchema,
  profileNoteSchema,
} from '@/data/schemas/company-profile';
import {
  averagePricePerUnit,
  convertMoney,
  costAtOffer,
  countsBySourceType,
  cumulativeUnits,
  financialPeriod,
  firstDayChange,
  formatCny,
  formatProductPrice,
  formatProfileDate,
  formatQuantity,
  grossMargin,
  grossProceedsFromTerms,
  groupStakes,
  growthBetween,
  marketValueAtOffer,
  netProceedsFromCosts,
  netProceedsOverPlan,
  newShareFraction,
  parseProfileDate,
  periodGrowth,
  productLaunch,
  profileRows,
  revenueLineShares,
  roundPct,
  rowCountsBySection,
  stakeFromShares,
  tenKToYuan,
  timelineNewestFirst,
  timelineOfKind,
  toYuan,
  voteShareFromVotes,
  yoyGrowth,
} from '@/lib/company-profile';

/** One unit in the last digit the filings print (0.01 万元), plus float slack. */
const LAST_DIGIT = 0.01 + 1e-9;

const profile = UNITREE_PROFILE;
const listing = profile.listing;

function holder(id: string) {
  const row = profile.holders.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`no holder ${id}`);
  return row;
}

function product(id: string) {
  const row = profile.products.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`no product ${id}`);
  return row;
}

describe('Unitree profile: schema', () => {
  it('parses against the company profile schema', () => {
    expect(() => companyProfileSchema.parse(profile)).not.toThrow();
    expect(profile.asOf).toBe(UNITREE_AS_OF);
    expect(UNITREE_AS_OF).toBe('2026-11-14');
  });

  it('gives every row and fact a source', () => {
    for (const { section, row } of profileRows(profile)) {
      const sourced = row as { sourceUrl?: string; sourceTitle?: string };
      expect(sourced.sourceUrl, section).toMatch(/^https:\/\//);
      expect(sourced.sourceTitle?.length, section).toBeGreaterThan(0);
    }
  });

  it('gives every company reply that is a statement its own source', () => {
    for (const row of profile.timeline) {
      if (typeof row.companyReply === 'string') {
        expect(['no statement', 'n/a']).toContain(row.companyReply);
      } else {
        expect(row.companyReply.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it('never gives a product both a price and contact sales', () => {
    for (const row of profile.products) {
      expect(row.priceUsd === null, row.id).not.toBe(row.priceAbsent === null);
      if (row.priceAbsent === 'contact sales') expect(row.priceUsd, row.id).toBeNull();
    }
    const both = { ...product('g1'), priceAbsent: 'contact sales' as const };
    expect(productSchema.safeParse(both).success).toBe(false);
    const neither = { ...product('g1'), priceUsd: null };
    expect(productSchema.safeParse(neither).success).toBe(false);
  });

  it('keeps the shop placeholders out of the prices', () => {
    for (const row of profile.products) {
      expect([100_000, 90_000, 50_000], row.id).not.toContain(row.priceUsd);
    }
    for (const id of ['a2', 'b2', 'b2-w', 'h2-plus', 'as2-edu', 'b1', 'h1']) {
      expect(formatProductPrice(product(id)), id).toBe('contact sales');
    }
  });

  it('gives no holder votes without shares', () => {
    for (const row of profile.holders) {
      expect(row.sharesTenK, row.id).toBeGreaterThan(0);
      expect(row.stakeAfterPct, row.id).toBeGreaterThan(0);
      if (typeof row.votesBeforePct === 'number') {
        expect(typeof row.stakeBeforePct, row.id).toBe('number');
      }
    }
    const votesWithoutShares = { ...holder('deepseek'), votesBeforePct: 0.1 };
    expect(holderSchema.safeParse(votesWithoutShares).success).toBe(false);
    const voteShareWithoutCount = { ...holder('deepseek'), votesTenK: 'not disclosed' as const };
    expect(holderSchema.safeParse(voteShareWithoutCount).success).toBe(false);
  });

  it('keeps notes short and free of dashes', () => {
    expect(profileNoteSchema.safeParse('Restated in May 2026.').success).toBe(true);
    expect(profileNoteSchema.safeParse(`Restated ${String.fromCodePoint(0x2014)} twice.`).success).toBe(false);
    expect(profileNoteSchema.safeParse('x'.repeat(141)).success).toBe(false);
  });

  it('labels groups only where the filing names them', () => {
    const groups = new Set(profile.holders.flatMap((row) => (row.group ? [row.group] : [])));
    expect([...groups].sort()).toEqual(['HongShan', 'Meituan']);
  });

  it('parses every date and rejects impossible ones', () => {
    const dates = [
      profile.company.founded.value,
      listing.listed.value.date,
      listing.firstDay.value.date,
      listing.latestClose.value.date,
      ...profile.timeline.map((row) => row.date),
      ...profile.timeline.flatMap((row) =>
        typeof row.companyReply === 'object' && row.companyReply.date ? [row.companyReply.date] : [],
      ),
      ...profile.software.flatMap((row) => (row.created ? [row.created] : [])),
    ];
    for (const date of dates) {
      expect(profileDateSchema.safeParse(date).success, date).toBe(true);
      expect(() => parseProfileDate(date), date).not.toThrow();
    }
    expect(profileDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(profileDateSchema.safeParse('2026-13').success).toBe(false);
    expect(profileDateSchema.safeParse('2024-05-31').success).toBe(true);
  });

  it('marks the market-data and press rows as reported', () => {
    expect(listing.firstDay.sourceType).toBe('reported');
    expect(listing.latestClose.sourceType).toBe('reported');
    const reported = profile.timeline.filter((row) => row.sourceType === 'reported').map((row) => row.id);
    expect(reported.sort()).toEqual(['cnpc-joint-venture', 'ipo-accepted', 'tianjin-subsidiary']);
  });

  it('flags the one source that did not open', () => {
    const flagged = profileRows(profile).filter(({ row }) => (row as { flag?: string }).flag);
    expect(flagged.map(({ row }) => (row as { id?: string }).id)).toEqual(['us-dod-1260h']);
  });
});

describe('Unitree profile: listing arithmetic', () => {
  it('gross proceeds equal the offer price times the shares sold', () => {
    const fromTerms = grossProceedsFromTerms(listing);
    expect(fromTerms.amount).toBeCloseTo(6_099_322_247.2, 1);
    expect(convertMoney(fromTerms, 'CNY10k').amount).toBeCloseTo(listing.grossProceeds.value.amount, 2);
    expect(formatCny(listing.grossProceeds.value)).toBe('CNY 6,099.32 m');
  });

  it('new shares are 10.00% of the enlarged capital, with no existing shares sold', () => {
    expect(roundPct(newShareFraction(listing))).toBe(listing.statedNewSharePct.value);
    expect(roundPct(newShareFraction(listing))).toBe(10);
    expect(listing.existingSharesSold.value).toBe(0);
  });

  it('net proceeds are gross less issue costs, within the filing’s rounding', () => {
    const net = netProceedsFromCosts(listing);
    expect(Math.abs(net.amount - listing.netProceeds.value.amount)).toBeLessThanOrEqual(LAST_DIGIT);
    expect(formatCny(listing.netProceeds.value)).toBe('CNY 5,917.15 m');
  });

  it('net proceeds beat the planned raise by CNY 1,715 m', () => {
    const over = netProceedsOverPlan(listing);
    expect(over.unit).toBe('CNY10k');
    expect(over.amount).toBeCloseTo(171_543.8, 2);
    expect(formatCny(over, 0)).toBe('CNY 1,715 m');
    expect(formatCny(listing.plannedRaise.value)).toBe('CNY 4,201.71 m');
  });

  it('market value at the offer price matches the filed 609.93 亿元', () => {
    const value = marketValueAtOffer(listing);
    expect(value.amount).toBe(150.8 * 404_464_340);
    expect(convertMoney(value, 'CNY100m').amount.toFixed(2)).toBe(
      listing.statedMarketValueAtOffer.value.amount.toFixed(2),
    );
    expect(formatCny(value)).toBe('CNY 60.99 bn');
  });

  it('first-day close is 460.3% above the offer price', () => {
    expect(roundPct(firstDayChange(listing), 1)).toBe(460.3);
  });

  it('DeepSeek paid the offer price for its shares', () => {
    expect(costAtOffer(listing, holder('deepseek')).amount).toBeCloseTo(140_756_569.2, 1);
  });
});

describe('Unitree profile: holders and votes', () => {
  it('recomputes each stake after the listing from shares held', () => {
    for (const row of profile.holders) {
      expect(stakeFromShares(profile, row).toFixed(4), row.id).toBe(row.stakeAfterPct.toFixed(4));
    }
  });

  it('recomputes vote shares from vote counts and the ten-vote class A shares', () => {
    for (const row of profile.holders) {
      const computed = voteShareFromVotes(profile, row);
      if (typeof row.votesAfterPct === 'number') {
        expect(computed?.toFixed(2), row.id).toBe(row.votesAfterPct.toFixed(2));
      }
    }
    expect(profile.control.directVotesAfterPct.value).toBe(holder('wang-xingxing').votesAfterPct);
  });

  it('keeps Wang Xingxing’s shares and votes apart', () => {
    const wang = holder('wang-xingxing');
    expect(wang.stakeAfterPct).toBe(21.4395);
    expect(wang.votesAfterPct).toBe(60.34);
    const platform = holder('shanghai-yuyi');
    const withPlatform = (voteShareFromVotes(profile, wang) ?? 0) + (voteShareFromVotes(profile, platform) ?? 0);
    expect(withPlatform.toFixed(2)).toBe(profile.control.withPlatformVotesAfterPct.value.toFixed(2));
  });

  it('DeepSeek holds 0.2308% of shares and 0.12% of votes', () => {
    const deepseek = holder('deepseek');
    expect(deepseek.stakeAfterPct).toBe(0.2308);
    expect(deepseek.votesAfterPct).toBe(0.12);
    expect(deepseek.stakeBeforePct).toBe('n/a');
  });

  it('the ten largest holders own 64.3536% of shares, as filed', () => {
    const topTen = [...profile.holders].sort((a, b) => b.stakeAfterPct - a.stakeAfterPct).slice(0, 10);
    const sum = topTen.reduce((total, row) => total + row.stakeAfterPct, 0);
    expect(sum.toFixed(4)).toBe('64.3536');
  });

  it('sums the named groups from their member rows', () => {
    const groups = groupStakes(profile.holders);
    expect(groups.map((group) => [group.group, group.stakeAfterPct.toFixed(4)])).toEqual([
      ['Meituan', '8.6840'],
      ['HongShan', '6.4034'],
    ]);
  });
});

describe('Unitree profile: results', () => {
  it('converts 万元 and yuan without dividing twice', () => {
    expect(tenKToYuan(169_926.93)).toBeCloseTo(1_699_269_300, 0);
    const fy2025 = financialPeriod(profile, 'fy2025');
    expect(formatCny({ amount: fy2025.revenue, unit: fy2025.unit })).toBe('CNY 1,699.27 m');
    expect(formatCny({ amount: fy2025.netProfit, unit: fy2025.unit })).toBe('CNY 278.21 m');
    const q3 = financialPeriod(profile, 'q3-2026');
    expect(formatCny({ amount: q3.revenue, unit: q3.unit })).toBe('CNY 665.04 m');
    expect(toYuan({ amount: q3.revenue, unit: q3.unit })).toBe(665_044_497.9);
  });

  it('recomputes stated growth from the stored comparatives', () => {
    const checks = [
      ['q1-2026', 'revenue', 68.49],
      ['q1-2026', 'netProfit', -47.69],
      ['q1-2026', 'adjustedNetProfit', -52.55],
      ['h1-2026', 'revenue', 48.54],
      ['h1-2026', 'adjustedNetProfit', -19.34],
      ['nine-months-2026', 'revenue', 55.71],
    ] as const;
    for (const [id, field, stated] of checks) {
      const period = financialPeriod(profile, id);
      const growth = periodGrowth(period, field);
      expect(growth, `${id} ${field}`).not.toBeNull();
      expect(roundPct(growth ?? 0), `${id} ${field}`).toBe(stated);
      expect(period.statedGrowthPct?.[field], `${id} ${field}`).toBe(stated);
    }
  });

  it('computes annual growth across the filed years', () => {
    const fy2024 = financialPeriod(profile, 'fy2024');
    const fy2025 = financialPeriod(profile, 'fy2025');
    expect(roundPct(growthBetween(fy2025, fy2024, 'revenue') ?? 0)).toBe(332.64);
    expect(growthBetween(fy2024, financialPeriod(profile, 'fy2023'), 'netProfit')).toBeNull();
    expect(yoyGrowth(10, 0)).toBeNull();
  });

  it('keeps each gross margin with its basis and recomputes 54.02% for nine months of 2026', () => {
    for (const id of ['fy2023', 'fy2024', 'fy2025']) {
      const margin = grossMargin(financialPeriod(profile, id));
      expect(margin === 'not disclosed' ? null : margin.basis, id).toBe('main business');
    }
    const nineMonths = grossMargin(financialPeriod(profile, 'nine-months-2026'));
    expect(nineMonths).not.toBe('not disclosed');
    if (nineMonths !== 'not disclosed') {
      expect(nineMonths.basis).toBe('computed on total revenue');
      expect(nineMonths.pct.toFixed(2)).toBe('54.02');
    }
    expect(grossMargin(financialPeriod(profile, 'q3-2026'))).toBe('not disclosed');
  });
});

describe('Unitree profile: units and revenue lines', () => {
  it('keeps humanoids sold and shipped apart', () => {
    const row = profile.units.find((candidate) => candidate.line === 'humanoid' && candidate.year === 2025);
    expect(row?.sold).toBe(5_215);
    expect(row?.shipped).toBe(5_511);
    for (const quadruped of profile.units.filter((candidate) => candidate.line === 'quadruped')) {
      expect(quadruped.shipped).toBe('not disclosed');
    }
  });

  it('recomputes the average price per humanoid and per quadruped for the three years', () => {
    const expected = {
      humanoid: { 2023: '59.34', 2024: '26.04', 2025: '16.64' },
      quadruped: { 2023: '3.83', 2024: '3.23', 2025: '3.03' },
    } as const;
    for (const line of ['humanoid', 'quadruped'] as const) {
      for (const year of [2023, 2024, 2025] as const) {
        const average = averagePricePerUnit(profile, line, year);
        expect(average.unit).toBe('CNY10k');
        expect(average.amount.toFixed(2), `${line} ${year}`).toBe(expected[line][year]);
        const row = profile.units.find((candidate) => candidate.line === line && candidate.year === year);
        expect(row?.statedAveragePriceTenK.toFixed(2), `${line} ${year}`).toBe(expected[line][year]);
      }
    }
  });

  it('sums units sold over 2023 to 2025 to the prospectus totals', () => {
    expect(cumulativeUnits(profile, 'humanoid', 'sold')).toBe(5_632);
    expect(cumulativeUnits(profile, 'quadruped', 'sold')).toBe(33_294);
  });

  it('2025 revenue-line shares close to 100% within rounding, with the remainder named', () => {
    const shares = revenueLineShares(profile, 2025);
    expect(shares.lines.map((line) => line.line)).toEqual(['quadruped', 'humanoid', 'components']);
    expect(shares.remainder.line).toBe('other');
    expect(shares.remainder.statedPct).toBe(0.41);
    expect(Math.abs(shares.statedTotalPct - 100)).toBeLessThanOrEqual(shares.roundingTolerancePct);
    expect(Math.abs(shares.amountGap)).toBeLessThanOrEqual(LAST_DIGIT);
    for (const line of [...shares.lines, shares.remainder]) {
      expect(line.computedPct.toFixed(2), line.line).toBe(line.statedPct.toFixed(2));
    }
    const other = profile.revenueLines.find((row) => row.year === 2025 && row.line === 'other');
    expect(other?.note).toMatch(/PUMP/);
  });

  it('every filed year closes to 100% within rounding', () => {
    for (const year of [2023, 2024, 2025]) {
      const shares = revenueLineShares(profile, year);
      expect(Math.abs(shares.statedTotalPct - 100), String(year)).toBeLessThanOrEqual(shares.roundingTolerancePct);
      expect(Math.abs(shares.amountGap), String(year)).toBeLessThanOrEqual(LAST_DIGIT);
    }
    for (const year of [2023, 2024, 2025]) {
      const regions = profile.regions.filter((row) => row.year === year);
      const total = profile.mainBusinessTotals.find((row) => row.year === year);
      const sum = regions.reduce((acc, row) => acc + row.amount, 0);
      expect(Math.abs(sum - (total?.amount ?? 0)), String(year)).toBeLessThanOrEqual(LAST_DIGIT);
    }
  });
});

describe('Unitree profile: products', () => {
  it('reads launches from the family timeline rows, else not disclosed', () => {
    expect(productLaunch(profile, product('g1'))).toBe('2024-05');
    expect(productLaunch(profile, product('g1-edu'))).toBe('2024-05');
    expect(productLaunch(profile, product('h1'))).toBe('2023-08');
    expect(productLaunch(profile, product('go2-air'))).toBe('2023');
    for (const id of ['as2-air', 'a2-w', 'h2-x', 'g1-plus', 'go2-w', 'b2-ex', 'dex5-s', 'r1-a5', 'd2', 'h2-plus']) {
      expect(productLaunch(profile, product(id)), id).toBe('not disclosed');
    }
  });

  it('formats prices, masses and dates as the sources state them', () => {
    expect(formatProductPrice(product('g1'))).toBe('USD 13,500');
    expect(formatProductPrice(product('h1-2'))).toBe('not disclosed');
    expect(formatQuantity(product('g1').mass)).toBe('about 35 kg');
    expect(formatQuantity(product('h2-plus').mass)).toBe('about 68 kg');
    expect(formatQuantity(product('r1-7a').payload)).toBe('3 to 5 kg');
    expect(formatProfileDate('2026-08-19')).toBe('19 Aug 2026');
    expect(formatProfileDate('2024-05')).toBe('May 2024');
    expect(formatProfileDate('2017')).toBe('2017');
  });
});

describe('Unitree profile: timeline', () => {
  it('sorts newest first, a year-only row below that year’s dated rows', () => {
    const sorted = timelineNewestFirst(profile.timeline);
    expect(sorted[0].id).toBe('cnpc-joint-venture');
    expect(sorted[1].id).toBe('tianjin-subsidiary');
    expect(sorted.at(-1)?.id).toBe('founded');
    const ids = sorted.map((row) => row.id);
    expect(ids.indexOf('launch-g1')).toBeLessThan(ids.indexOf('launch-b2-w'));
    for (let i = 1; i < sorted.length; i++) {
      expect(parseProfileDate(sorted[i - 1].date).start >= parseProfileDate(sorted[i].date).start).toBe(true);
    }
  });

  it('filters by kind', () => {
    expect(timelineOfKind(profile.timeline, 'us-restriction').map((row) => row.date)).toEqual([
      '2026-10-28',
      '2026-07-28',
      '2026-06-08',
    ]);
    expect(timelineOfKind(profile.timeline, 'incident')).toEqual([]);
    expect(timelineOfKind(profile.timeline, ['listing', 'funding']).length).toBe(8);
  });

  it('dates and credits the security findings from the researchers and the CVE records', () => {
    const security = new Map(timelineOfKind(profile.timeline, 'security').map((row) => [row.id, row]));
    expect(security.get('sec-unipwn')?.date).toBe('2025-09-20');
    expect(security.get('sec-unipwn')?.cves).toEqual([
      'CVE-2025-35027',
      'CVE-2025-60017',
      'CVE-2025-60250',
      'CVE-2025-60251',
    ]);
    expect(security.get('sec-unibleed')?.date).toBe('2026-08-27');
    expect(security.get('sec-go2-dds')?.date).toBe('2026-02-26');
    expect(security.get('sec-g1-telemetry')?.credits).toEqual([
      'Víctor Mayoral-Vilches',
      'Andreas Makris',
      'Kevin Finisterre',
    ]);
  });
});

describe('Unitree profile: software and provenance', () => {
  it('never states one license for everything', () => {
    const licenses = new Set(profile.software.map((row) => row.license));
    for (const license of ['BSD-3-Clause', 'Apache-2.0', 'GPL-2.0', 'custom license file', 'no license file', 'no license tag']) {
      expect(licenses.has(license as never), license).toBe(true);
    }
    const repo = (name: string) => profile.software.find((row) => row.name === name)?.license;
    expect(repo('point_lio_unilidar')).toBe('GPL-2.0');
    expect(repo('unifolm-vla')).toBe('no license file');
    expect(repo('unitree_rl_lab')).toBe('Apache-2.0');
  });

  it('counts rows by source type', () => {
    const counts = countsBySourceType(profile);
    expect(counts.total).toBe(profileRows(profile).length);
    expect(counts.primary + counts.reported).toBe(counts.total);
    expect(counts).toEqual({ primary: 215, reported: 5, total: 220 });
    expect(rowCountsBySection(profile)).toEqual({
      company: 3,
      listing: 14,
      control: 6,
      holders: 15,
      financials: 7,
      units: 6,
      revenueLines: 12,
      mainBusinessTotals: 3,
      regions: 6,
      marketShares: 3,
      products: 62,
      timeline: 49,
      software: 34,
    });
  });

  it('prices 30 trims, sends 16 to contact sales and leaves 16 not disclosed', () => {
    const tally = (kind: string) =>
      profile.products.filter((row) => (row.priceUsd !== null ? 'price' : row.priceAbsent) === kind).length;
    expect([tally('price'), tally('contact sales'), tally('not disclosed')]).toEqual([30, 16, 16]);
  });
});
