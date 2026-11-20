/**
 * Euro foreign exchange reference rates of the European Central Bank for one
 * date: units of each currency per 1 EUR, copied exactly from the ECB file.
 * lib/rounds.ts converts every non-dollar amount to USD through the euro
 * cross rate: amount / rate[currency] * rate.USD.
 */

export const FX_RATES_DATE = '2026-11-13';

export const FX_RATES_SOURCE_URL =
  `https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?startPeriod=${FX_RATES_DATE}&endPeriod=${FX_RATES_DATE}&format=csvdata`;

export const FX_RATES_SOURCE_TITLE = 'Euro foreign exchange reference rates (ECB)';

export const EUR_REFERENCE_RATES = {
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
} as const;

export type RatedCurrency = keyof typeof EUR_REFERENCE_RATES;

/**
 * The ECB publishes no Taiwan dollar rate. This is the Federal Reserve's
 * H.10 noon buying rate for 6 November 2026, Taiwan dollars per 1 USD,
 * copied from the release of 9 November 2026: a week older than
 * FX_RATES_DATE, so a page that converts with it states its own date.
 */
export const TWD_PER_USD = 32.85;

export const TWD_RATE_DATE = '2026-11-06';

export const TWD_RATE_SOURCE_URL = 'https://www.federalreserve.gov/releases/h10/20261109/';

export const TWD_RATE_SOURCE_TITLE = 'Foreign Exchange Rates, H.10 Weekly, 9 November 2026 (Federal Reserve)';
