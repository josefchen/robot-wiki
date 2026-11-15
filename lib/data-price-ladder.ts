/**
 * What an hour of robot data costs: every row of the four price tables in
 * content/data-hardware/data-market.mdx ("China prices real-robot data",
 * the sellers' table, "Making an hour costs a fraction of its price" and
 * the workers' pay table), in table order, with the table's own wording
 * and the citation each table row carries.
 *
 * Yuan and euros become US dollars here, at the ECB reference rates of
 * 13 November 2026 the article cites (read 2026-11-14 on the ECB's page:
 * US dollar 1.1052 and Chinese yuan renminbi 7.3738 per euro). The one
 * exception is PyRUA-DataFarm's RMB 800 quote, which keeps its authors'
 * own $117. No dollar value for a yuan or euro row is typed anywhere.
 *
 * Plain module with relative imports only: lib/chart-descriptions.ts reads
 * the description from here under Node, with no bundler.
 */

export const ECB_REFERENCE_RATES = {
  citationId: 'ecb-reference-rates-2026-11-13',
  date: '2026-11-13',
  dateText: '13 November 2026',
  usdPerEur: 1.1052,
  cnyPerEur: 7.3738,
} as const;

export type Currency = 'CNY' | 'USD' | 'EUR';

export type LadderGroupId = 'china-prices' | 'other-prices' | 'costs' | 'pay';

export interface LadderGroup {
  id: LadderGroupId;
  /** The group heading on the stage. */
  label: string;
  /** The group as counted in the description: "10 prices in China". */
  counted: string;
}

/** The four groups, in the order the stage draws them. */
export const LADDER_GROUPS: readonly LadderGroup[] = [
  { id: 'china-prices', label: 'Prices in China', counted: 'prices in China' },
  { id: 'other-prices', label: 'Prices elsewhere', counted: 'prices elsewhere' },
  { id: 'costs', label: 'Costs and estimates', counted: 'costs and estimates' },
  { id: 'pay', label: 'Pay to the people who record', counted: 'rates of pay to the people who record' },
];

/** The group the caption is about, drawn in the one accent. */
export const LADDER_LEAD_GROUP: LadderGroupId = 'china-prices';

export interface PriceRow {
  id: string;
  group: LadderGroupId;
  /** The table's data, seller's data, cost or worker cell. */
  what: string;
  /** Who stated the value: the table's source cell, or the seller. */
  who: string;
  /** The table's price, cost or pay cell as printed, without its citation. */
  stated: string;
  currency: Currency;
  /** The stated value, or the low end of a stated range, per hour. */
  low: number;
  /** The high end of a stated range. */
  high?: number;
  /** A central estimate inside the range. */
  mid?: number;
  /** A second stated value beside the first, not a range. */
  also?: number;
  /** A lower bound ("from", "or more") is open above; a ceiling ("up to") below. */
  open?: 'above' | 'below';
  /** The source's own dollar conversion, used in place of the ECB rate. */
  authorsUsd?: number;
  /** A price per purchase that the article divides by the hours bought. */
  perPurchase?: { amount: number; hours: number };
  citationId: string;
}

const RMB = 'CNY' as const;
const USD = 'USD' as const;

export const PRICE_ROWS: readonly PriceRow[] = [
  // China prices real-robot data at RMB 500 to 1,000 an hour.
  { id: 'beijing-real-robot', group: 'china-prices', what: 'Real robot, sold by the hour or task', who: "Beijing humanoid center's data lead, reported", stated: 'RMB 500 to 1,000', currency: RMB, low: 500, high: 1000, citationId: 'jiazi-data-collection-2026' },
  { id: 'mifeng-real-robot', group: 'china-prices', what: 'Real robot', who: "Mifeng's chief executive, reported", stated: 'RMB 500 to 1,000', currency: RMB, low: 500, high: 1000, citationId: 'yicai-mifeng-2026' },
  { id: 'huxiu-real-robot', group: 'china-prices', what: 'Real robot', who: 'Huxiu survey, reported', stated: 'RMB 500 to 1,000', currency: RMB, low: 500, high: 1000, citationId: 'huxiu-collection-centers-2026' },
  { id: 'huxiu-umi', group: 'china-prices', what: 'UMI-style, no robot', who: 'Huxiu survey, reported', stated: 'RMB 300 to 400', currency: RMB, low: 300, high: 400, citationId: 'huxiu-collection-centers-2026' },
  { id: 'huxiu-simulated', group: 'china-prices', what: 'Simulated, synthetic', who: 'Huxiu survey, reported', stated: 'RMB 200 to 500', currency: RMB, low: 200, high: 500, citationId: 'huxiu-collection-centers-2026' },
  { id: 'pyrua-quote', group: 'china-prices', what: 'Custom teleoperation, full service', who: 'Quote obtained by the PyRUA-DataFarm authors, vendor not named', stated: "RMB 800 ($117, the authors' conversion)", currency: RMB, low: 800, authorsUsd: 117, citationId: 'pyrua-datafarm-2026' },
  { id: 'lingyu-real-robot', group: 'china-prices', what: 'Real robot', who: "Lingyu's chief executive, a reference price, reported", stated: 'RMB 300 to 1,000 or more', currency: RMB, low: 300, high: 1000, open: 'above', citationId: 'cls-data-price-investigation-2026' },
  { id: 'lingyu-no-robot', group: 'china-prices', what: 'Recorded without a robot', who: "Lingyu's chief executive, a reference price, reported", stated: 'RMB 100 to 300', currency: RMB, low: 100, high: 300, citationId: 'cls-data-price-investigation-2026' },
  { id: 'resold-home-recordings', group: 'china-prices', what: 'Home recordings resold by intermediaries', who: 'Tech Xingqiu, reported', stated: 'RMB 300 to 500', currency: RMB, low: 300, high: 500, citationId: 'techxingqiu-data-collectors-2026' },
  { id: 'raw-video', group: 'china-prices', what: 'Raw single-camera video, some sellers', who: 'An industry veteran quoted under a pseudonym, reported', stated: 'RMB 5 to 10', currency: RMB, low: 5, high: 10, citationId: 'cls-data-price-investigation-2026' },

  // Outside China, sellers publish list prices.
  { id: 'rc-teleoperation', group: 'other-prices', what: 'Robot teleoperation', who: 'Robotics Center, San Francisco', stated: '$450 to $1,200, list, 10-hour minimum', currency: USD, low: 450, high: 1200, citationId: 'roboticscenter-marketplace' },
  { id: 'rc-hands-touch', group: 'other-prices', what: 'Hands and touch', who: 'Robotics Center', stated: '$225 to $1,800, list', currency: USD, low: 225, high: 1800, citationId: 'roboticscenter-marketplace' },
  { id: 'rc-motion-capture', group: 'other-prices', what: 'Motion capture', who: 'Robotics Center', stated: '$250 to $900, list', currency: USD, low: 250, high: 900, citationId: 'roboticscenter-marketplace' },
  { id: 'rc-handheld-gripper', group: 'other-prices', what: 'Handheld gripper', who: 'Robotics Center', stated: '$375 to $600, list', currency: USD, low: 375, high: 600, citationId: 'roboticscenter-marketplace' },
  { id: 'rc-egocentric', group: 'other-prices', what: 'Egocentric video', who: 'Robotics Center', stated: '$90 to $270, list', currency: USD, low: 90, high: 270, citationId: 'roboticscenter-marketplace' },
  { id: 'encord-ceiling', group: 'other-prices', what: 'Training data, kind not stated', who: 'Encord', stated: 'Up to $1,000, a ceiling, reported', currency: USD, low: 1000, open: 'below', citationId: 'latimes-encord-2026' },
  { id: 'exylos-rate-card', group: 'other-prices', what: 'Custom VR egocentric video, exclusive rights', who: 'EXYLOS', stated: '$30 to $49 per accepted hour, rate card', currency: USD, low: 30, high: 49, citationId: 'exylos-pricing-2026' },
  { id: 'unidata-datarade', group: 'other-prices', what: '4,050 hours of egocentric household video', who: 'Unidata, on Datarade', stated: 'From $30,000 a purchase, about $7.40 an hour by our division', currency: USD, low: 30_000 / 4050, perPurchase: { amount: 30_000, hours: 4050 }, open: 'above', citationId: 'unidata-datarade-egocentric' },
  { id: 'robopilots', group: 'other-prices', what: 'Teleoperation service', who: 'RoboPilots', stated: 'From $12 per operator hour, its own list price', currency: USD, low: 12, open: 'above', citationId: 'robopilots-providers-2026' },

  // Making an hour costs a fraction of its price.
  { id: 'galaxea-human-centric', group: 'costs', what: 'Human-centric collection, China', who: "Galaxea's chief executive, reported", stated: 'RMB 50 to 100', currency: RMB, low: 50, high: 100, citationId: 'nbd-galaxea-data-cost-2026' },
  { id: 'galaxea-robot-centric', group: 'costs', what: 'Robot-centric collection, China', who: "Galaxea's chief executive, reported", stated: 'About RMB 250', currency: RMB, low: 250, citationId: 'nbd-galaxea-data-cost-2026' },
  { id: 'galaxea-industry-average', group: 'costs', what: 'Industry average, China', who: "Galaxea's chief executive, reported", stated: 'RMB 100 to 150', currency: RMB, low: 100, high: 150, citationId: 'nbd-galaxea-data-cost-2026' },
  { id: 'pyrua-labor', group: 'costs', what: 'Teleoperation labor, North America', who: "PyRUA-DataFarm authors' estimate", stated: 'About $290 ($190 to $520), labor only', currency: USD, low: 190, high: 520, mid: 290, citationId: 'pyrua-datafarm-2026' },
  { id: 'pyrua-generated', group: 'costs', what: "PyRUA-DataFarm's generated three-view data", who: 'PyRUA-DataFarm authors, measured', stated: '$107 first hour, $81 each further hour', currency: USD, low: 107, also: 81, citationId: 'pyrua-datafarm-2026' },

  // Collectors earn a small fraction of the price.
  { id: 'umi-collector', group: 'pay', what: 'UMI gripper collector, China, advertised', who: 'The Standard, reported', stated: 'About RMB 20, or RMB 200 a day', currency: RMB, low: 20, citationId: 'standard-umi-collectors-2026' },
  { id: 'agency-collector', group: 'pay', what: 'Collector placed by an agency, China', who: 'Beijing Daily, reported', stated: 'RMB 15', currency: RMB, low: 15, citationId: 'beijing-daily-data-collectors-2026' },
  { id: 'front-line-collector', group: 'pay', what: 'Front-line collector, some subcontracted projects, China', who: 'STAR Market Daily, reported', stated: 'About RMB 8', currency: RMB, low: 8, citationId: 'cls-data-price-investigation-2026' },
  { id: 'suzhou-home-collector', group: 'pay', what: 'Home collector, Suzhou', who: 'Tech Xingqiu, reported', stated: 'RMB 30', currency: RMB, low: 30, citationId: 'techxingqiu-data-collectors-2026' },
  { id: 'jiyuan-collector', group: 'pay', what: 'Jiyuan Zhihang collector', who: "The company's chief executive, reported", stated: 'RMB 70 per effective hour', currency: RMB, low: 70, citationId: 'beijing-daily-data-collectors-2026' },
  { id: 'human-archive', group: 'pay', what: 'Human Archive camera wearer, India', who: 'TechCrunch, reported', stated: '$1 base rate', currency: USD, low: 1, citationId: 'techcrunch-human-archive-2026' },
  { id: 'objectways-recorder', group: 'pay', what: "Home recorder for Objectways' clients, India", who: 'NPR, reported', stated: 'About $2.60', currency: USD, low: 2.6, citationId: 'npr-robot-data-workers-2026' },
  { id: 'atlas-capture', group: 'pay', what: 'Atlas Capture recorder', who: 'The Globe and Mail, reported', stated: '$2.86 and $2.94 per approved hour', currency: USD, low: 2.86, also: 2.94, citationId: 'globe-gig-robot-data-2026' },
  { id: 'human-motion-data', group: 'pay', what: 'Human Motion Data contributor', who: 'The Globe and Mail, reported', stated: '$3 per approved hour', currency: USD, low: 3, citationId: 'globe-gig-robot-data-2026' },
  { id: 'micro1-recorder', group: 'pay', what: 'Micro1 recorder, Nigeria', who: 'MIT Technology Review, reported', stated: "$15, one worker's rate", currency: USD, low: 15, citationId: 'mittr-micro1-gig-2026' },
  { id: 'shift-contributor', group: 'pay', what: 'Shift contributor', who: 'Business Insider, reported', stated: "Up to $30, the company's ceiling", currency: USD, low: 30, open: 'below', citationId: 'bi-robot-data-labor-2026' },
  { id: 'ay-robots-operator', group: 'pay', what: 'AY-Robots remote operator, three skill tiers', who: 'AY-Robots', stated: 'EUR 6 to 22', currency: 'EUR', low: 6, high: 22, citationId: 'ay-robots-pricing' },
  { id: 'pi-operator', group: 'pay', what: 'Physical Intelligence robot operator, San Francisco', who: 'Job posting', stated: '$25', currency: USD, low: 25, citationId: 'pi-robot-operator-posting' },
  { id: 'onex-operator', group: 'pay', what: '1X senior data-collection operator, San Carlos', who: 'Job listing, reported', stated: '$36 to $46', currency: USD, low: 36, high: 46, citationId: 'onex-senior-operator-posting' },
];

/** US dollars for an amount, at the ECB reference rates. */
export function toUsd(amount: number, currency: Currency): number {
  if (currency === 'USD') return amount;
  const usdPerUnit =
    currency === 'EUR'
      ? ECB_REFERENCE_RATES.usdPerEur
      : ECB_REFERENCE_RATES.usdPerEur / ECB_REFERENCE_RATES.cnyPerEur;
  return amount * usdPerUnit;
}

/** Dollars as printed: two significant figures in cents below $10, whole dollars above. */
export function usdText(value: number): string {
  if (value < 10) {
    const rounded = Number(value.toPrecision(2));
    const text = rounded.toFixed(2).replace(/\.00$/, '');
    return `$${text}`;
  }
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export interface PlottedRow extends PriceRow {
  /** The plotted values in US dollars an hour. */
  usdLow: number;
  usdHigh?: number;
  usdMid?: number;
  usdAlso?: number;
  /** Who converted: the ECB rate, the source's own figure, or none for dollars. */
  conversion: 'ecb' | 'authors' | 'none';
  /** The stated value with its dollar conversion, as the stage prints it. */
  valueText: string;
}

const STATED_AMOUNT = /(?:RMB|EUR) \d+(?:,\d{3})*(?: to \d+(?:,\d{3})*)?/;

function plotted(row: PriceRow): PlottedRow {
  const convert = (amount: number | undefined) => (amount === undefined ? undefined : toUsd(amount, row.currency));
  const perPurchase = row.perPurchase ? row.perPurchase.amount / row.perPurchase.hours : undefined;
  if (row.authorsUsd !== undefined) {
    return { ...row, usdLow: row.authorsUsd, conversion: 'authors', valueText: row.stated };
  }
  const usdLow = perPurchase ?? (convert(row.low) as number);
  const usdHigh = convert(row.high);
  const base = { ...row, usdLow, usdHigh, usdMid: convert(row.mid), usdAlso: convert(row.also) };
  if (row.currency === 'USD') return { ...base, conversion: 'none', valueText: row.stated };
  const dollars = usdHigh === undefined ? usdText(usdLow) : `${usdText(usdLow)} to ${usdText(usdHigh)}`;
  const match = STATED_AMOUNT.exec(row.stated);
  if (!match) throw new Error(`data-price-ladder: no ${row.currency} amount in "${row.stated}"`);
  const end = match.index + match[0].length;
  return {
    ...base,
    conversion: 'ecb',
    valueText: `${row.stated.slice(0, end)} (${dollars})${row.stated.slice(end)}`,
  };
}

export const PLOTTED_ROWS: readonly PlottedRow[] = PRICE_ROWS.map(plotted);

/** Every value a row plots, in US dollars. */
export function rowValues(row: PlottedRow): number[] {
  return [row.usdLow, row.usdHigh, row.usdMid, row.usdAlso].filter((v): v is number => v !== undefined);
}

/** The plotted dollars in words, bound and all: "190 to 520, about 290", "12 or more". */
export function plottedUsdText(row: PlottedRow): string {
  const d = (v: number) => usdText(v).slice(1);
  let text = row.usdHigh === undefined ? d(row.usdLow) : `${d(row.usdLow)} to ${d(row.usdHigh)}`;
  if (row.usdAlso !== undefined) text += ` and ${d(row.usdAlso)}`;
  if (row.usdMid !== undefined) text += `, about ${d(row.usdMid)}`;
  if (row.open === 'above') text += ' or more';
  if (row.open === 'below') text = `up to ${text}`;
  return text;
}

export function groupRows(group: LadderGroupId): PlottedRow[] {
  return PLOTTED_ROWS.filter((row) => row.group === group);
}

export interface GroupSpan {
  count: number;
  min: number;
  max: number;
  /** The highest value is a lower bound, so the group runs higher. */
  openAbove: boolean;
}

export function groupSpan(group: LadderGroupId): GroupSpan {
  const rows = groupRows(group);
  const values = rows.flatMap(rowValues);
  const max = Math.max(...values);
  return {
    count: rows.length,
    min: Math.min(...values),
    max,
    openAbove: rows.some((row) => row.open === 'above' && Math.max(...rowValues(row)) === max),
  };
}

const spanText = (span: GroupSpan) =>
  `from ${usdText(span.min)} to ${usdText(span.max)}${span.openAbove ? ' or more' : ''}`;

/**
 * The axis: US dollars an hour on a log scale, from a labelled floor of
 * 20 cents, below the lowest value (RMB 5), to $3,000, above the highest
 * ($1,800). The floor sits far enough below $1 for both labels to fit on
 * a phone.
 */
export const LADDER_AXIS = { floor: 0.2, ceiling: 3000, ticks: [1, 10, 100, 1000] } as const;

/** Where a dollar value sits along the axis, from 0 at the floor to 1 at the ceiling. */
export function axisFraction(usd: number): number {
  const lo = Math.log10(LADDER_AXIS.floor);
  const hi = Math.log10(LADDER_AXIS.ceiling);
  return Math.min(1, Math.max(0, (Math.log10(usd) - lo) / (hi - lo)));
}

export const DATA_PRICE_LADDER_SOURCES: readonly string[] = [
  ...new Set([...PRICE_ROWS.map((row) => row.citationId), ECB_REFERENCE_RATES.citationId]),
];

const LEAD = groupSpan(LADDER_LEAD_GROUP);
const LEAD_GROUP = LADDER_GROUPS.find((g) => g.id === LADDER_LEAD_GROUP)!;

export const DATA_PRICE_LADDER_CAPTION = `Of ${PRICE_ROWS.length} rows, the ${LEAD.count} ${LEAD_GROUP.counted} run ${spanText(LEAD)} an hour at the ECB rate of ${ECB_REFERENCE_RATES.dateText}.`;

const groupClauses = LADDER_GROUPS.map((g) => {
  const span = groupSpan(g.id);
  return `${span.count} ${g.counted} ${spanText(span)}`;
});

export const DATA_PRICE_LADDER_DESCRIPTION = `${PRICE_ROWS.length} hourly values from this article's four tables, in US dollars on a log scale, with yuan and euros converted at the ECB reference rates of ${ECB_REFERENCE_RATES.dateText}: ${groupClauses.slice(0, -1).join(', ')}, and ${groupClauses[groupClauses.length - 1]}.`;
