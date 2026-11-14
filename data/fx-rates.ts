/**
 * Euro foreign exchange reference rates of the European Central Bank for one
 * date: units of each currency per 1 EUR, copied exactly from the ECB file.
 * lib/rounds.ts converts every non-dollar amount to USD through the euro
 * cross rate: amount / rate[currency] * rate.USD.
 */

export const FX_RATES_DATE = '2026-11-13';

export const FX_RATES_SOURCE_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';

export const FX_RATES_SOURCE_TITLE = 'Euro foreign exchange reference rates (ECB)';

export const EUR_REFERENCE_RATES = {
  USD: 1.1052,
  GBP: 0.83559,
  CNY: 7.3738,
  JPY: 176.83,
  KRW: 1477.8,
  INR: 104.1575,
  HKD: 8.6714,
} as const;

export type RatedCurrency = keyof typeof EUR_REFERENCE_RATES;
