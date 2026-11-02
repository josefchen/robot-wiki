/**
 * Delays a robot works within, from a drone's own camera to a command to
 * Mars and back, for the space article's latency ladder.
 *
 * The space rows come from JPL's 2024 IPN Progress Report on positioning,
 * navigation and timing at the Moon and Mars (42-237A, read 2026-10-27).
 * Its Table 1 prints two-way delays of 0.24 s to geostationary orbit,
 * 2.5 s to the Moon and 25 min on average to Mars, and its findings put
 * the one-way light time to Mars at "between 4 minutes to 20 minutes".
 * The Mars round trip drawn here doubles that printed one-way range, 8 to
 * 40 minutes, which brackets the table's 25-minute average.
 *
 * The camera row is Falanga, Kim and Scaramuzza's bound on the sensing
 * latency of a quadrotor's stereo frame camera (RA-L 2019, read
 * 2026-10-27), which they define as the interval from an obstacle
 * entering the sensing area to the start of the avoidance manoeuvre: a
 * lower bound of 0.017 s, the frame period of the fastest
 * sensor they found (Intel RealSense R200), and an upper bound of
 * 0.070 s, the latency the Bumblebee XB3 datasheet reports. Their
 * monocular camera, 0.026 to 0.040 s, falls inside that range.
 */

export interface DelayRow {
  id: string;
  /** The stage label. */
  label: string;
  /** The table's row name. */
  row: string;
  /** Shortest and longest delay, in seconds; equal for a single value. */
  lowSeconds: number;
  highSeconds: number;
  /** The readout, in words. */
  readout: string;
  citationId: string;
}

export const CAMERA_ID = 'drone-camera';
export const MOON_ID = 'moon-round-trip';
export const MARS_ID = 'mars-round-trip';

export const JPL_CITATION_ID = 'jpl-ipn-pnt-2024';
export const FALANGA_CITATION_ID = 'falanga-latency-2019';
export const SPACE_LATENCY_SOURCES: readonly string[] = [FALANGA_CITATION_ID, JPL_CITATION_ID];

/** JPL's printed values the figure keeps in its method note. */
export const GEO_ROUND_TRIP_SECONDS = 0.24;
export const MARS_AVERAGE_ROUND_TRIP_MINUTES = 25;
export const MARS_ONE_WAY_MINUTES: readonly [number, number] = [4, 20];
export const MONOCULAR_SECONDS: readonly [number, number] = [0.026, 0.04];

export const DELAY_ROWS: readonly DelayRow[] = [
  {
    id: CAMERA_ID,
    label: 'A drone’s stereo camera, sensing delay',
    row: 'Sensing delay, drone stereo camera',
    lowSeconds: 0.017,
    highSeconds: 0.07,
    readout: '17 to 70 milliseconds',
    citationId: FALANGA_CITATION_ID,
  },
  {
    id: MOON_ID,
    label: 'Earth to the Moon and back',
    row: 'Round trip, Earth to the Moon',
    lowSeconds: 2.5,
    highSeconds: 2.5,
    readout: '2.5 seconds',
    citationId: JPL_CITATION_ID,
  },
  {
    id: MARS_ID,
    label: 'Earth to Mars and back',
    row: 'Round trip, Earth to Mars',
    lowSeconds: 2 * MARS_ONE_WAY_MINUTES[0] * 60,
    highSeconds: 2 * MARS_ONE_WAY_MINUTES[1] * 60,
    readout: '8 to 40 minutes',
    citationId: JPL_CITATION_ID,
  },
];

export function delayOf(id: string): DelayRow {
  const row = DELAY_ROWS.find((r) => r.id === id);
  if (!row) throw new Error(`space-latency: no delay row "${id}"`);
  return row;
}
