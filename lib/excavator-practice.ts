/**
 * The truth model for ExcavatorPractice (world-models/model-based-robot-learning):
 * an excavator that learns a model of its own arm from its own moves and
 * plans through it.
 *
 * Source: Canales, Nan, Hutter and Ruiz-del-Solar (2026), "Precision at
 * Speed: Sample-Efficient Online Model-Based Reinforcement Learning for
 * Hydraulic Excavator Control" (citation `excavator-mbrl-2026`, arXiv
 * 2609.31025, read in its v1 HTML):
 * - an 11.5-ton Menzi Muck M445 walking excavator, its four arm joints
 *   (boom, stick, telescopic extension, shovel pitch) driven through valve
 *   currents; joint positions and velocities are measured, oil pressures and
 *   valve states are not;
 * - a probabilistic ensemble of 5 networks learned from scratch on the
 *   machine, updated after every episode, through which sampling-based MPC
 *   plans each control cycle;
 * - the paper's Fig. 5 snapshots: "large deviations from the reference are
 *   visible after three minutes, the path geometry is followed more closely
 *   after ten minutes, and consistent path execution is observed after twenty
 *   minutes";
 * - Table II: after 20 minutes the time-indexed mean error is 2.7 cm, in the
 *   range of earlier learned controllers given 100 to 150 minutes of machine
 *   data (2.8 cm after 100, 4.5 cm after 150); after 40 minutes every
 *   objective holds a sub-centimetre mean contour error (0.98, 0.72 and
 *   0.93 cm).
 *
 * Everything else here is the drawing's own choice and is said to be: the
 * path, the misses drawn at 3 and 10 minutes (shaped like the paper's
 * snapshots, not measured), and how far the five models' guesses fan out.
 */

/** The machine's mass in tonnes and the size of the model ensemble, from the paper. */
export const MACHINE_TONNES = 11.5;
export const ENSEMBLE_MEMBERS = 5;

/** The earlier learned controllers' machine data, in minutes (the article's "100 to 150 minutes"). */
export const EARLIER_MINUTES = { from: 100, to: 150 } as const;

export type PracticeId = 'three' | 'ten' | 'twenty' | 'forty';

export interface Practice {
  id: PracticeId;
  /** Minutes of interaction on the machine. */
  minutes: number;
  /** The control's label. */
  label: string;
  /** What the paper reports at this point, in plain words: the readout. */
  reads: string;
  /** The miss drawn at this point, in metres: illustrative at 3 and 10 minutes, the paper's mean error at 20 and 40. */
  missM: number;
  /** How far apart the five models' guesses end, in metres, at the end of the look-ahead (illustrative). */
  spreadM: number;
}

export const PRACTICE: readonly Practice[] = [
  { id: 'three', minutes: 3, label: '3 min', reads: '3 minutes · large misses', missM: 0.32, spreadM: 0.62 },
  { id: 'ten', minutes: 10, label: '10 min', reads: '10 minutes · closer to the path', missM: 0.11, spreadM: 0.26 },
  { id: 'twenty', minutes: 20, label: '20 min', reads: '20 minutes · matches earlier controllers', missM: 0.027, spreadM: 0.08 },
  { id: 'forty', minutes: 40, label: '40 min', reads: '40 minutes · under 1 cm off on average', missM: 0.0098, spreadM: 0.03 },
];

/** The still pose: 20 minutes, the point the article makes. */
export const STILL_PRACTICE: PracticeId = 'twenty';

export const practiceOf = (id: PracticeId): Practice => PRACTICE.find((p) => p.id === id)!;

/** The paper's own numbers behind the 20- and 40-minute readouts, kept beside them for the tests. */
export const PAPER_CHECKPOINTS = {
  twentyMinuteTrackingErrorCm: 2.7,
  earlierTrackingErrorCm: { afterHundred: 2.8, afterHundredFifty: 4.5 },
  fortyMinuteContourErrorCm: [0.98, 0.72, 0.93],
} as const;

// ------------------------------------------------------------------- the path
/** A point in the arm's plane, in metres: x forward of the slew axis, z up from the ground. */
export type ArmPoint = readonly [number, number];

/** The targets the reference path runs through (illustrative), in metres. */
export const PATH_TARGETS: readonly ArmPoint[] = [
  [3.95, 1.05],
  [4.55, 2.55],
  [5.45, 3.2],
  [6.4, 2.5],
  [5.9, 1.12],
];

/** The reference path at s in [0, 1]: a centripetal Catmull-Rom curve through the targets, sampled evenly by arc length. */
function catmull(points: readonly ArmPoint[], u: number): ArmPoint {
  const count = points.length - 1;
  const at = Math.min(count - 1e-9, Math.max(0, u * count));
  const i = Math.floor(at);
  const t = at - i;
  const p0 = points[Math.max(0, i - 1)]!;
  const p1 = points[i]!;
  const p2 = points[i + 1]!;
  const p3 = points[Math.min(count, i + 2)]!;
  const blend = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])];
}

const RAW = Array.from({ length: 801 }, (_, k) => catmull(PATH_TARGETS, k / 800));
const CUMULATIVE = RAW.reduce<number[]>((acc, point, k) => {
  acc.push(k === 0 ? 0 : acc[k - 1]! + Math.hypot(point[0] - RAW[k - 1]![0], point[1] - RAW[k - 1]![1]));
  return acc;
}, []);
/** The reference path's length in metres. */
export const PATH_LENGTH_M = CUMULATIVE[CUMULATIVE.length - 1]!;

/** The reference point a share s of the way along the path. */
export function referenceAt(s: number): ArmPoint {
  const target = Math.min(1, Math.max(0, s)) * PATH_LENGTH_M;
  let lo = 0;
  let hi = CUMULATIVE.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (CUMULATIVE[mid]! < target) lo = mid;
    else hi = mid;
  }
  const span = CUMULATIVE[hi]! - CUMULATIVE[lo]! || 1;
  const t = (target - CUMULATIVE[lo]!) / span;
  return [RAW[lo]![0] + (RAW[hi]![0] - RAW[lo]![0]) * t, RAW[lo]![1] + (RAW[hi]![1] - RAW[lo]![1]) * t];
}

/** The path's unit normal at s (to the left of travel). */
export function normalAt(s: number): ArmPoint {
  const a = referenceAt(Math.max(0, s - 0.004));
  const b = referenceAt(Math.min(1, s + 0.004));
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz) || 1;
  return [-dz / length, dx / length];
}

/**
 * The shape of a miss along the path: a smooth wander that starts at zero
 * (the shovel starts on the path) and stays within one unit. Fixed, so the
 * drawing is the same on the server and in the browser.
 */
export function wander(s: number): number {
  const ramp = Math.min(1, s / 0.08);
  return ramp * (0.62 * Math.sin(2 * Math.PI * (1.7 * s + 0.12)) + 0.38 * Math.sin(2 * Math.PI * (4.3 * s + 0.61)));
}

/** Where the shovel's tip actually goes after this much practice, a share s along the path. */
export function tracedAt(practice: Practice, s: number): ArmPoint {
  const point = referenceAt(s);
  const normal = normalAt(s);
  const miss = practice.missM * wander(s);
  return [point[0] + normal[0] * miss, point[1] + normal[1] * miss];
}

/** How far ahead along the path the planner looks, as a share of the path (illustrative). */
export const LOOK_AHEAD = 0.16;

/** Each model's lean, from -1 to 1: the five guesses fan out evenly on both sides. */
export const MEMBER_LEAN = [-1, -0.45, 0.1, 0.55, 0.95] as const;

/**
 * The five models' guesses of where the tip goes next, from where it is now:
 * each starts at the tip and follows the path ahead, leaning off it more the
 * further ahead it guesses. With more practice they lean less (illustrative).
 */
export function guessesAt(practice: Practice, s: number, samples = 14): ArmPoint[][] {
  const from = tracedAt(practice, s);
  const span = Math.min(LOOK_AHEAD, 1 - s);
  return MEMBER_LEAN.map((lean, member) =>
    Array.from({ length: samples + 1 }, (_, k) => {
      const u = k / samples;
      const ahead = s + span * u;
      const point = referenceAt(ahead);
      const normal = normalAt(ahead);
      const start = tracedAt(practice, s);
      // Each guess leaves the tip and bends toward the path ahead, off by its own lean.
      const offStart = (start[0] - referenceAt(s)[0]) * normal[0] + (start[1] - referenceAt(s)[1]) * normal[1];
      const off = offStart * (1 - u) + practice.spreadM * lean * u ** 1.4 + 0.12 * practice.spreadM * Math.sin(member * 1.7 + u * 3) * u;
      return k === 0 ? from : ([point[0] + normal[0] * off, point[1] + normal[1] * off] as ArmPoint);
    }),
  );
}

/** The share of the path the still pose shows: the tip partway along it. */
export const STILL_S = 0.6;

/** A run traces the whole path in this many seconds. */
export const RUN_SECONDS = 7;

/** Then the arm glides back to the still pose in this many seconds. */
export const REWIND_SECONDS = 1.2;

/** Where a run under reduced motion stops, each held for an equal share of RUN_SECONDS. */
export const TRACE_STOPS = [0, 0.25, 0.5, 0.75, 1] as const;

export type RunPhase = 'tracing' | 'rewinding' | 'done';

/**
 * The shovel's share of the path `t` seconds into a run: it traces the whole
 * path, then glides back to the still pose, so a run ends on the frame it
 * started from. Under reduced motion (`calm`) it jumps from stop to stop and
 * then back to the still pose.
 */
export function runAt(t: number, calm: boolean): { s: number; phase: RunPhase } {
  const clock = Math.max(0, t);
  if (calm) {
    const index = Math.floor(clock / (RUN_SECONDS / TRACE_STOPS.length));
    return index < TRACE_STOPS.length ? { s: TRACE_STOPS[index], phase: 'tracing' } : { s: STILL_S, phase: 'done' };
  }
  if (clock < RUN_SECONDS) return { s: clock / RUN_SECONDS, phase: 'tracing' };
  if (clock >= RUN_SECONDS + REWIND_SECONDS) return { s: STILL_S, phase: 'done' };
  const back = (clock - RUN_SECONDS) / REWIND_SECONDS;
  return { s: 1 + (STILL_S - 1) * back * back * (3 - 2 * back), phase: 'rewinding' };
}
