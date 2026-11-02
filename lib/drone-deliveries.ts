/**
 * Cumulative drone deliveries as the two operators covered here report them,
 * for the drones article's delivery bars (read 2026-10-27). Both are
 * company figures and lower bounds, given on different dates:
 *
 * - Zipline's safety fact sheet, a page Zipline keeps current: "Made more
 *   than 3 million deliveries" since its first commercial delivery in
 *   2016. Its January 2026 release had "surpassed two million commercial
 *   deliveries".
 * - Wing's post of 8 June 2026 on its Walmart expansion: "well over one
 *   million commercial deliveries completed".
 *
 * Walmart's "more than one million drone deliveries" (29 May 2026) is not a
 * third bar: Walmart works "with drone delivery providers including Wing
 * and Zipline", so its count overlaps theirs.
 */

export interface DeliveryCount {
  id: string;
  operator: string;
  /** The lower bound the operator reports. */
  atLeast: number;
  /** The readout, as the operator words it. */
  readout: string;
  asOf: string;
  citationId: string;
}

export const ZIPLINE_ID = 'zipline';
export const WING_ID = 'wing';
export const ZIPLINE_JANUARY_2026 = 2e6;
export const WALMART_MAY_2026 = 1e6;

export const DELIVERY_SOURCES: readonly string[] = ['zipline-safety-facts', 'wing-walmart-2026', 'walmart-drone-1m-2026'];

export const DELIVERY_COUNTS: readonly DeliveryCount[] = [
  {
    id: ZIPLINE_ID,
    operator: 'Zipline',
    atLeast: 3e6,
    readout: 'more than 3 million',
    asOf: 'fact sheet read October 2026',
    citationId: 'zipline-safety-facts',
  },
  {
    id: WING_ID,
    operator: 'Wing',
    atLeast: 1e6,
    readout: 'well over 1 million',
    asOf: 'June 2026',
    citationId: 'wing-walmart-2026',
  },
];

export function deliveryOf(id: string): DeliveryCount {
  const row = DELIVERY_COUNTS.find((d) => d.id === id);
  if (!row) throw new Error(`drone-deliveries: no operator "${id}"`);
  return row;
}
