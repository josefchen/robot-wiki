/**
 * Venture funding raised by robotics startups each year, beside the
 * humanoid counts two trackers publish.
 *
 * Funding: the chart "Global Robotics Investment-6/22/26" embedded in
 * Crunchbase News's article of 22 June 2026 (read 2026-10-27), column
 * "Funding raised ($B)": 2020 5.8, 2021 14.1, 2022 9, 2023 7, 2024 8.4,
 * 2025 15, "2026 YTD" 18.8. The article's text gives the 2021, 2025 and
 * 2026 totals ("$18.8 billion in 2026, compared to $15 billion in the full
 * year of 2025"; "$14.1 billion raised in the peak venture funding year of
 * 2021"). The totals cover every robotics startup, not only humanoid makers.
 *
 * Humanoids: the IFR press release of 30 September 2026, "In 2025, about
 * 7,000 units of full-size humanoids (above 140 cm) were sold globally";
 * SAG's release of 10 August 2026, "approximately 19,100 units in 1H 2026,
 * surging 272% year over year from 5,100 units in 1H 2025". The two count
 * different things (full-size units sold, every humanoid shipped), so they
 * are drawn as separate rows, never one series.
 */

export interface FundingYear {
  year: number;
  billionsUsd: number;
  /** The year's total runs only to the article's date. */
  partial?: boolean;
}

export const FUNDING_CITATION_ID = 'crunchbase-robotics-funding-2026';
export const FUNDING_PARTIAL_UNTIL = '22 June';

export const FUNDING_BY_YEAR: readonly FundingYear[] = [
  { year: 2020, billionsUsd: 5.8 },
  { year: 2021, billionsUsd: 14.1 },
  { year: 2022, billionsUsd: 9 },
  { year: 2023, billionsUsd: 7 },
  { year: 2024, billionsUsd: 8.4 },
  { year: 2025, billionsUsd: 15 },
  { year: 2026, billionsUsd: 18.8, partial: true },
];

export interface HumanoidCount {
  id: string;
  label: string;
  /** The table's row name. */
  row: string;
  units: number;
  counter: string;
  citationId: string;
}

export const HUMANOID_COUNTS: readonly HumanoidCount[] = [
  {
    id: 'ifr-2025',
    label: 'Full-size humanoids sold in 2025 (IFR)',
    row: 'Full-size humanoids sold, 2025',
    units: 7_000,
    counter: 'IFR',
    citationId: 'ifr-service-robots-2026',
  },
  {
    id: 'sag-first-half-2025',
    label: 'Humanoids shipped, first half of 2025 (SAG)',
    row: 'Humanoids shipped, first half of 2025',
    units: 5_100,
    counter: 'SAG',
    citationId: 'sag-humanoid-shipments-2026',
  },
  {
    id: 'sag-first-half-2026',
    label: 'Humanoids shipped, first half of 2026 (SAG)',
    row: 'Humanoids shipped, first half of 2026',
    units: 19_100,
    counter: 'SAG',
    citationId: 'sag-humanoid-shipments-2026',
  },
];

export const FUNDING_HUMANOID_SOURCES: readonly string[] = [
  FUNDING_CITATION_ID,
  ...new Set(HUMANOID_COUNTS.map((c) => c.citationId)),
];

export function fundingIn(year: number): number {
  const row = FUNDING_BY_YEAR.find((f) => f.year === year);
  if (!row) throw new Error(`funding-humanoid-counts: no funding row for ${year}`);
  return row.billionsUsd;
}

export function humanoidCount(id: string): HumanoidCount {
  const row = HUMANOID_COUNTS.find((c) => c.id === id);
  if (!row) throw new Error(`funding-humanoid-counts: no humanoid count "${id}"`);
  return row;
}
