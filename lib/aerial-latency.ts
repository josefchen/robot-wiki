/**
 * Perception-latency model for the drones module's interactive, drawn
 * from Falanga, Kim, and Scaramuzza, "How Fast Is Too Fast? The Role of
 * Perception Latency in High-Speed Sense and Avoid" (IEEE RA-L 2019,
 * doi:10.1109/LRA.2019.2898117).
 *
 * Their model: a robot flying at longitudinal speed v toward an obstacle
 * perceives it when it enters the sensing range s, but the perception
 * pipeline is delayed by latency tau. The remaining time to contact is
 * s / v - tau, and the lateral avoidance maneuver at maximum lateral
 * acceleration u takes 2 * sqrt(r / u), where r is the expanded obstacle
 * radius. Avoidance is possible exactly when
 *
 *   s / v - tau >= 2 * sqrt(r / u)          (their Eq. 7)
 *
 * which inverts to a closed-form maximum speed (their Eq. 9):
 *
 *   v_max = ( s / (tau + 2 * sqrt(r / u)) ).
 *
 * Every constant below is a value they used in the paper's Table I case
 * study (sensing ranges 2, 5, 8 m; latencies 0.017 to 0.070 s for frame
 * and stereo cameras, microsecond-scale for the event camera; lateral
 * accelerations 10, 25, 50, 200 m/s^2; r = 0.75 m from rv = 0.25 and
 * ro = 0.50). The two sensor rows the interactive reproduces are the
 * paper's stereo-camera case (s = 8 m, tau = 0.070 s upper bound) and
 * the event-camera case (s = 8 m, tau in the milliseconds), at the
 * u = 50 m/s^2 agility column. Pure functions only; the component and
 * the tests share this model.
 */

/** Expanded obstacle radius r = rv + ro, in meters (paper Sec. IV-C). */
export const OBSTACLE_RADIUS_M = 0.75;

/** Lateral-acceleration columns of the paper's Table I, in m/s^2. */
export const AGILITY_STEPS = [10, 25, 50, 200] as const;
export const DEFAULT_AGILITY = 25;

export interface SensorSpec {
  id: string;
  name: string;
  /** Sensing range s in meters. */
  rangeM: number;
  /** Perception latency tau in seconds. */
  latencyS: number;
}

/**
 * The paper's Table I stereo frame camera upper-bound row and its
 * event-camera counterpart at the same sensing range. The stereo
 * latency 0.070 s is the Bumblebee XB3 datasheet value the paper cites;
 * the event camera's latency at this operating point (8 m range,
 * u = 50 m/s^2) is the Table I value 0.012 s, because the event camera
 * fires the instant brightness changes rather than waiting out a frame.
 */
export const SENSORS: SensorSpec[] = [
  { id: 'stereo', name: 'Stereo frame camera', rangeM: 8, latencyS: 0.07 },
  { id: 'event', name: 'Event camera', rangeM: 8, latencyS: 0.012 },
];

export const DEFAULT_SENSOR_ID = 'stereo';

/** Latency values offered by the latency slider, in milliseconds. */
export const LATENCY_STEPS_MS = [0, 10, 25, 50, 70, 100, 150, 200] as const;

export const DEFAULT_LATENCY_MS = 70;

export const INTERACTIVE_MAX_LATENCY_MS = 200;

/** Time the avoidance maneuver takes, 2*sqrt(r/u), in seconds. */
export function avoidanceTimeS(agilityMs2: number): number {
  return 2 * Math.sqrt(OBSTACLE_RADIUS_M / agilityMs2);
}

/**
 * The paper's Eq. 9: the maximum longitudinal speed at which the drone
 * can still complete the lateral avoidance in the time left after the
 * latency eats into the time to contact.
 */
export function maxSpeedMs(
  latencyS: number,
  agilityMs2: number,
  rangeM: number,
): number {
  return rangeM / (latencyS + avoidanceTimeS(agilityMs2));
}

export interface LatencyOutcome {
  /** The paper's maximum speed for this latency/agility pair, m/s. */
  maxSpeedMs: number;
  /** Time to contact at that speed when the obstacle is first seen, s. */
  timeToContactS: number;
  /** Time actually remaining when perception finally reports it, s. */
  timeRemainingS: number;
  /** Time the avoidance maneuver needs, 2*sqrt(r/u), s. */
  avoidanceTimeS: number;
  /** True when the maneuver still fits inside the remaining time. */
  avoidable: boolean;
  /** Share of the time to contact the latency consumes, 0..1. */
  latencyShare: number;
}

/**
 * The full outcome at the maximum speed: at v_max the maneuver completes
 * exactly as contact would occur (their equality case, passing tangent
 * to the obstacle), so timeRemaining equals avoidanceTime and the margin
 * is zero by construction. That is the paper's point: latency converts
 * directly into lost speed, not necessarily into a crash.
 */
export function latencyOutcome(
  latencyS: number,
  agilityMs2: number,
  rangeM: number,
): LatencyOutcome {
  const v = maxSpeedMs(latencyS, agilityMs2, rangeM);
  const ttc = rangeM / v;
  const remaining = ttc - latencyS;
  const tAvoid = avoidanceTimeS(agilityMs2);
  return {
    maxSpeedMs: v,
    timeToContactS: ttc,
    timeRemainingS: remaining,
    avoidanceTimeS: tAvoid,
    avoidable: remaining >= tAvoid - 1e-9,
    latencyShare: Math.min(1, latencyS / ttc),
  };
}

export function formatSpeed(v: number): string {
  return `${v.toFixed(2)} m/s`;
}

export function formatSeconds(s: number): string {
  return `${(s * 1000).toFixed(0)} ms`;
}

export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}
