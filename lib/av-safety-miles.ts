/**
 * Miles a driverless fleet must drive with no failure at all to show, at
 * 95 percent confidence, that its failure rate is no worse than human
 * drivers', from Kalra and Paddock, "Driving to Safety" (RAND RR-1478,
 * 2016, RAND's free edition of the paywalled Transportation Research
 * Part A paper; read 2026-10-27 in the Internet Archive's copy of the PDF).
 *
 * Their Eq. 2 solves the success-run relation C = 1 - R^n for the miles:
 * n = ln(1 - C) / ln(R), where R = 1 - F is the chance of no failure in a
 * mile and F the per-mile failure rate. Table 1, row 1, prints the results
 * against three human benchmarks: 1.09 fatalities per 100 million miles
 * (the 32,719 deaths of 2013), 77 reported injuries (2013) and 190 reported
 * crashes, giving 275 million, 3.9 million and 1.6 million miles. The
 * report calls these a theoretical lower bound, "based on perfect
 * performance of vehicles". The 12.5 years is its fleet of 100 vehicles
 * driving 24 hours a day, 365 days a year, at 25 miles per hour.
 */

export interface SafetyBenchmark {
  id: string;
  /** The stage label: the human benchmark the fleet must match. */
  label: string;
  /** The table's row name. */
  row: string;
  /** Human-driver failures per 100 million miles. */
  per100MillionMiles: number;
  /** RAND Table 1, row 1, in miles. */
  printedMiles: number;
  /** The printed value in words. */
  printedText: string;
}

export const AV_SAFETY_CITATION_ID = 'kalra-paddock-2016';
export const AV_SAFETY_SOURCES: readonly string[] = [AV_SAFETY_CITATION_ID];
export const CONFIDENCE = 0.95;
export const FATALITY_ID = 'fatalities';
export const FLEET_YEARS = 12.5;

export const SAFETY_BENCHMARKS: readonly SafetyBenchmark[] = [
  {
    id: FATALITY_ID,
    label: 'Deaths, 1.09 per 100 million miles',
    row: 'Fatalities, 1.09 per 100 million miles',
    per100MillionMiles: 1.09,
    printedMiles: 275e6,
    printedText: '275 million',
  },
  {
    id: 'injuries',
    label: 'Reported injuries, 77 per 100 million miles',
    row: 'Reported injuries, 77 per 100 million miles',
    per100MillionMiles: 77,
    printedMiles: 3.9e6,
    printedText: '3.9 million',
  },
  {
    id: 'crashes',
    label: 'Reported crashes, 190 per 100 million miles',
    row: 'Reported crashes, 190 per 100 million miles',
    per100MillionMiles: 190,
    printedMiles: 1.6e6,
    printedText: '1.6 million',
  },
];

/** Kalra and Paddock's Eq. 2: failure-free miles to show the rate at confidence C. */
export function failureFreeMiles(per100MillionMiles: number, confidence = CONFIDENCE): number {
  const reliability = 1 - per100MillionMiles / 1e8;
  return Math.log(1 - confidence) / Math.log(reliability);
}

export function benchmarkOf(id: string): SafetyBenchmark {
  const row = SAFETY_BENCHMARKS.find((b) => b.id === id);
  if (!row) throw new Error(`av-safety-miles: no benchmark "${id}"`);
  return row;
}
