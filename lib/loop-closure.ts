/**
 * The loop closure behind LoopClosure (classical/scene-representation).
 *
 * A robot that maps as it drives keeps a chain of poses, each placed from the
 * one before by odometry. Every small error in a measured turn bends the rest
 * of the chain, so the error grows with distance and the map drifts out of
 * shape (Cadena and colleagues, `cadena-2016`). When the robot comes back to a
 * place it has mapped and recognises it, the match is one more measurement:
 * where the old place is from here. Validated, it ties the end of the chain to
 * its start, and the back end spreads the loop's error along the whole chain
 * instead of dumping it on the last pose (monocular ORB-SLAM's similarity
 * alignment and Essential Graph optimization, `orb-slam-2015`). Smoothing can
 * do this because the past poses stay in the graph (`dellaert-kaess-2006`).
 * A revisit can reduce drift and in some cases correct it; it does not
 * promise to remove all of it.
 *
 * The model is a chain of that kind, solved exactly. The course is a loop of
 * 2 m legs round a block, 5 by 3 legs, with left turns at its three far
 * corners. The robot drives 15 legs from the start and stops one leg short of
 * it, where its camera sees the start again. Each leg's measured turn comes
 * up short by a heading drift: uneven, larger on the early legs and smaller on
 * the late ones, averaging the drift per leg the reader sets. The legs' lengths
 * are taken as exact, and the camera's view of the start (one leg straight
 * ahead, facing the way the robot set off after the last corner) as exact.
 *
 * Closing the loop asks for the smallest set of joint corrections, equally
 * weighted, that puts the end of the camera's view on the start, facing the
 * right way: least squares with every turn measurement trusted alike and the
 * loop as a hard constraint. It is solved by repeated linearisation (each
 * correction turns everything after its joint about that joint), the same
 * iteration a pose-graph back end runs. Each joint's correction is its
 * spring's share. The course, the drift and the drift's pattern are
 * illustrative; the gap and the shares are that chain's exact numbers.
 */

/** One leg of the course, metres (illustrative). */
export const LEG_M = 2;
/** The course: legs east, north, west and south, with a left turn at each far corner. */
export const COURSE_LEGS: readonly [number, number, number, number] = [5, 3, 5, 3];
/** The legs the robot drives; the last leg of the loop is the camera's view of the start. */
export const DRIVEN_LEGS = COURSE_LEGS[0] + COURSE_LEGS[1] + COURSE_LEGS[2] + COURSE_LEGS[3] - 1;
/** The joints between driven legs, each a measured turn: 14. */
export const JOINTS = DRIVEN_LEGS - 1;
/** The heading drift a leg, degrees: the slider's range, step and opening value. */
export const DRIFT_RANGE: readonly [number, number] = [0.5, 2];
export const DRIFT_STEP = 0.5;
export const OPENING_DRIFT = 1.5;
/** How long the chain takes to close or open, seconds. */
export const CLOSE_SECONDS = 1.8;

const RAD = Math.PI / 180;

export type Vec = [number, number];

/** The true turn at each joint, degrees, indexed 1..JOINTS (index 0 unused): left 90 at the far corners. */
export const TRUE_TURNS: readonly number[] = (() => {
  const turns = new Array<number>(JOINTS + 1).fill(0);
  let corner = 0;
  for (let leg = 0; leg < 3; leg++) {
    corner += COURSE_LEGS[leg]!;
    turns[corner] = 90;
  }
  return turns;
})();

/** How each joint's drift compares with the average: 1.8 at the first joint down to 0.2 at the last, averaging exactly 1. */
export const DRIFT_WEIGHTS: readonly number[] = (() => {
  const weights = new Array<number>(JOINTS + 1).fill(0);
  for (let joint = 1; joint <= JOINTS; joint++) weights[joint] = 1 + 0.8 * Math.cos((Math.PI * (joint - 1)) / (JOINTS - 1));
  return weights;
})();

/**
 * The turns the robot measured at a drift a leg, degrees: each comes up short of the true turn by that joint's share
 * of the drift (an odometer that under-reads its turns), so the chain swings wide and its end comes round short of
 * the start.
 */
export const measuredTurns = (drift: number): number[] => TRUE_TURNS.map((turn, joint) => (joint === 0 ? 0 : turn - drift * DRIFT_WEIGHTS[joint]!));

export interface Chain {
  /** The poses, metres, 0..DRIVEN_LEGS: the start at the origin, setting off along +x. */
  pins: Vec[];
  /** Each driven leg's heading, degrees, 0..DRIVEN_LEGS - 1. The robot at the last pose faces the last leg's way. */
  headings: number[];
  /** Where the camera's view of the start ends: one leg straight ahead of the robot. */
  end: Vec;
}

/** The chain the turns build: each leg one LEG_M along its heading, each joint turning the rest. */
export function chainOf(turns: readonly number[]): Chain {
  const pins: Vec[] = [[0, 0]];
  const headings: number[] = [];
  let heading = 0;
  for (let leg = 0; leg < DRIVEN_LEGS; leg++) {
    if (leg > 0) heading += turns[leg]!;
    headings.push(heading);
    const [x, y] = pins[leg]!;
    pins.push([x + LEG_M * Math.cos(heading * RAD), y + LEG_M * Math.sin(heading * RAD)]);
  }
  const [x, y] = pins[DRIVEN_LEGS]!;
  return { pins, headings, end: [x + LEG_M * Math.cos(heading * RAD), y + LEG_M * Math.sin(heading * RAD)] };
}

/** The heading the robot should have at its last pose: after the three corners, so the start lies straight ahead. */
export const FINAL_HEADING = 270;

/** What the closure asks to be zero: the view's end on the start (x, y, metres) and the heading's error (radians). */
function residual(chain: Chain): [number, number, number] {
  return [chain.end[0], chain.end[1], (chain.headings[DRIVEN_LEGS - 1]! - FINAL_HEADING) * RAD];
}

/**
 * The smallest corrections, degrees per joint (indexed 1..JOINTS), that close the loop from the measured turns.
 * Each step linearises the chain where it stands: a correction at joint j turns everything after it about pin j, so
 * it moves the view's end at right angles to the line from pin j, and turns the robot by the same amount. The
 * least-norm step that zeroes the linearised residual is J^T (J J^T)^-1 (J d - r); it repeats until the loop closes.
 */
export function closureFor(drift: number): number[] {
  const measured = measuredTurns(drift);
  let d = new Array<number>(JOINTS + 1).fill(0);
  for (let step = 0; step < 40; step++) {
    const chain = chainOf(measured.map((turn, joint) => turn + d[joint]!));
    const r = residual(chain);
    if (Math.max(...r.map(Math.abs)) < 1e-13) break;
    // J: 3 rows (end x, end y, heading) by JOINTS columns, per degree of correction.
    const J: number[][] = [[], [], []];
    for (let joint = 1; joint <= JOINTS; joint++) {
      const [px, py] = chain.pins[joint]!;
      J[0]!.push(-(chain.end[1] - py) * RAD);
      J[1]!.push((chain.end[0] - px) * RAD);
      J[2]!.push(RAD);
    }
    const Jd = J.map((row) => row.reduce((sum, value, k) => sum + value * d[k + 1]!, 0));
    const rhs = Jd.map((value, i) => value - r[i]!);
    const JJt = J.map((a) => J.map((b) => a.reduce((sum, value, k) => sum + value * b[k]!, 0)));
    const lambda = solve3(JJt, rhs);
    d = [0, ...J[0]!.map((_, k) => J[0]![k]! * lambda[0] + J[1]![k]! * lambda[1] + J[2]![k]! * lambda[2])];
  }
  return d;
}

function solve3(m: number[][], b: number[]): [number, number, number] {
  const det = (a: number[][]) =>
    a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) -
    a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) +
    a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!);
  const whole = det(m);
  const swap = (column: number) => m.map((row, i) => row.map((value, j) => (j === column ? b[i]! : value)));
  return [det(swap(0)) / whole, det(swap(1)) / whole, det(swap(2)) / whole];
}

const memo = new Map<number, number[]>();
/** The closure for a drift, computed once. */
export function sharesFor(drift: number): readonly number[] {
  let shares = memo.get(drift);
  if (!shares) {
    shares = closureFor(drift);
    memo.set(drift, shares);
  }
  return shares;
}

/** The turns with a share (0 open, 1 closed) of the closure applied: the chain as the springs carry it. */
export const turnsAt = (drift: number, share: number): number[] => {
  const shares = sharesFor(drift);
  return measuredTurns(drift).map((turn, joint) => turn + share * shares[joint]!);
};

/** The chain at a drift and a share of the closure. */
export const chainAt = (drift: number, share: number): Chain => chainOf(turnsAt(drift, share));

/** The true course: the chain the true turns build. */
export const TRUE_CHAIN: Chain = chainOf(TRUE_TURNS);

const tenth = (value: number) => Math.round(value * 10) / 10;
const hundredth = (value: number) => Math.round(value * 100) / 100;

/** How far the camera's view misses the start before the loop is closed, metres. */
export const gapM = (drift: number, share = 0) => Math.hypot(...chainAt(drift, share).end);

/** The heading drift the robot built up over the lap, degrees: the sum of every joint's error. */
export const lapDrift = (drift: number) => DRIFT_WEIGHTS.reduce((sum, weight) => sum + drift * weight, 0);

/** The largest single joint's turn back on closing, degrees. */
export const largestShare = (drift: number) => Math.max(...sharesFor(drift).map(Math.abs));

/** The farthest any pose sits from where it truly is, metres, open (share 0) or closed (share 1). */
export function worstOffM(drift: number, share: number): number {
  const { pins } = chainAt(drift, share);
  return Math.max(...pins.map(([x, y], k) => Math.hypot(x - TRUE_CHAIN.pins[k]![0], y - TRUE_CHAIN.pins[k]![1])));
}

/** A drift inside the slider's range, on its step. */
export const clampDrift = (drift: number) =>
  Math.min(DRIFT_RANGE[1], Math.max(DRIFT_RANGE[0], Math.round(drift / DRIFT_STEP) * DRIFT_STEP));

const degrees = (drift: number) => drift.toFixed(1);

/** The numbers the stage prints, rounded as printed. */
export const printed = (drift: number) => ({
  gap: tenth(gapM(drift)).toFixed(1),
  lap: String(Math.round(lapDrift(drift))),
  worstOpen: tenth(worstOffM(drift, 0)).toFixed(1),
  worstClosed: hundredth(worstOffM(drift, 1)).toFixed(2),
});

/** The stage's words, open or closed. */
export function readoutFor(drift: number, closed: boolean): string {
  const p = printed(drift);
  return closed
    ? `Closed · ${JOINTS} joints share ${p.lap} degrees · worst pose ${p.worstClosed} m off`
    : `Drift ${degrees(drift)} degrees a leg · the bar misses the start by ${p.gap} m`;
}

/** The words while the chain moves: how far the camera's view still is from the start. */
export const movingReadout = (drift: number, share: number, closing: boolean) =>
  `${closing ? 'Closing' : 'Opening'} · the bar ${tenth(gapM(drift, share)).toFixed(1)} m from the start`;

/** The slider's value text, which says every number the readout prints in that state. */
export function valueTextFor(drift: number, closed: boolean): string {
  const p = printed(drift);
  return closed
    ? `${degrees(drift)} degrees of heading drift a leg; loop closed, the ${JOINTS} joints share ${p.lap} degrees and the worst pose is ${p.worstClosed} m off the course`
    : `${degrees(drift)} degrees of heading drift a leg; the camera's bar misses the start by ${p.gap} m`;
}

/** The share of the closure, `t` seconds into a close: eased in and out, from 0 to 1. */
export function closeShareAt(t: number): number {
  const u = Math.max(0, Math.min(1, t / CLOSE_SECONDS));
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}
