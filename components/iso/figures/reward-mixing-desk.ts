/**
 * The reward mixing desk for RewardShaping, drawn with the isometric kit.
 *
 * The object is the explanation. A robot learns to walk by doing whatever
 * earns it points, and the points come from a score that adds twelve terms,
 * each with a weight. Here the twelve weights are twelve faders on a sloped
 * mixing desk, in the order the sliders list them: each fader's cap sits as
 * far up its slot as its weight (0 at the front, 4 at the back), and a dot
 * beside the slot marks where the balanced score sets it. Behind the desk a
 * cable runs to the treadmill bay, where the robot shows the walk that score
 * produces: a steady trot, standing still, bouncing in place or jittering.
 * The belt follows the robot (a self-paced treadmill), so it runs only when
 * the robot walks. The one lit part is the fader in charge of the walk: the
 * velocity-tracking task while the trot holds, otherwise the weight that
 * tipped it into its failure.
 *
 * Every pose comes from lib/reward-shaping.ts (unchanged): the walk is
 * classifyBehavior(weights) and the robot's feet, body and belt follow
 * quadrupedPose(walk, phase), its preview pixels drawn at MM_PER_PX
 * millimetres each.
 *
 * World units: millimetres. x runs along the belt (the robot faces +x), y
 * toward the viewer, z up.
 */
import {
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring as kitRing,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong, prismAlong, roundedOutline } from '../prism.ts';
import { FOOT_ORDER, HIP_H, rigFor, type FootPose, type RigPart, type RobotPose, type RobotSolid } from './quadruped-rig.ts';
import {
  TERMS,
  WEIGHT_MAX,
  defaultWeights,
  quadrupedPose,
  type BehaviorId,
  type TermId,
} from '../../../lib/reward-shaping.ts';

/**
 * Millimetres of the bench per preview pixel of the model's pose: the
 * model's robot stands 36 px from hip to ground, this one 27 mm.
 */
export const MM_PER_PX = HIP_H / 36;

// ------------------------------------------------------------------ the layout (mm)
const BASE: Plan = { x: -66, y: -24, w: 130, d: 90, r: 6 };
const BASE_Z = [0, 6] as const;
const TOP = BASE_Z[1];
/** The treadmill's centre on the base. */
const O: Point3 = [0, 0, TOP];
/** The desk: its plan, and its sloped top from the front edge up to the back edge. */
const DESK = { x0: -58, x1: 34, front: 60, back: 32, frontZ: TOP + 7, backZ: TOP + 16 };
const SLOPE_RUN = DESK.front - DESK.back;
const SLOPE_RISE = DESK.backZ - DESK.frontZ;
const SLOPE_LENGTH = Math.hypot(SLOPE_RUN, SLOPE_RISE);
/** Up the slope (toward the back), and the slope's outward normal (up and toward the viewer). */
export const SLOPE: Point3 = [0, -SLOPE_RUN / SLOPE_LENGTH, SLOPE_RISE / SLOPE_LENGTH];
const NORMAL: Point3 = [0, SLOPE_RISE / SLOPE_LENGTH, SLOPE_RUN / SLOPE_LENGTH];
/** A point on the slope: x across the desk, s up the slope from its front edge, lifted h off it. */
export const onSlope = (x: number, s: number, h = 0): Point3 => [
  x,
  DESK.front + SLOPE[1] * s + NORMAL[1] * h,
  DESK.frontZ + SLOPE[2] * s + NORMAL[2] * h,
];
/** The faders: one per term, in the sliders' order, across the desk. */
const FADER_PITCH = 7;
export const FADER_X = TERMS.map((_, index) => -50.5 + FADER_PITCH * index);
/** A fader's cap travels from s = 6.8 (weight 0) to s = 23.4 (the slider's maximum). */
export const CAP_S0 = 6.8;
export const CAP_TRAVEL = 16.6;
const CAP = { w: 4.6, l: 3.4, h: 2.6 };
const SLOT = { s0: 4.6, s1: 25.6, w: 1.6 };
/** Where a cap's centre sits up its slot for a weight. */
export const capS = (weight: number) => CAP_S0 + (CAP_TRAVEL * Math.max(0, Math.min(WEIGHT_MAX, weight))) / WEIGHT_MAX;
const SCALE_STRIP = { x0: -56.4, x1: -54, s0: 6, s1: 24.8 };
/** The label plate on the base, beside the desk. */
const LABEL: Plan = { x: 39, y: 47, w: 20, d: 5, r: 0.8 };

// ---------------------------------------------------------------- the fit
const AZIMUTH = 60;
const ELEVATION = 36;
const extremes: Point3[] = [
  [BASE.x, BASE.y, -6],
  [BASE.x + BASE.w, BASE.y, -6],
  [BASE.x, BASE.y + BASE.d, -6],
  [BASE.x + BASE.w, BASE.y + BASE.d, -6],
  // The robot at the top of its bounce: hips raised 6.3, the battery's top 8.6 above them.
  [-14, -4.2, TOP + 10.4 + HIP_H + 6.3 + 8.6],
  [8, 4.2, TOP + 10.4 + HIP_H + 6.3 + 8.6],
  [34, 5, TOP + 10.4 + HIP_H + 6.3 + 6],
];
export const WIDTH = 600;
const PAD = 14;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const rig = rigFor(P, O);
const at = (point: Point3) => iso(point, P);

// ----------------------------------------------------------------- the parts
/** Where the live pieces go in the painter's order. */
export type Slot = 'belt' | 'legs-far' | 'body' | 'legs-near' | 'caps';
export type Part = RigPart | { kind: 'fill'; d: string; shade: 0 | 1 | 2 | 3 } | { kind: 'slot'; slot: Slot };

const seamOf = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
/** A cable's route through waypoints, sampled along a Catmull-Rom curve so it bends instead of kinking. */
function smoothRoute(points: Point3[], samples = 6): Point3[] {
  const out: Point3[] = [points[0]!];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    for (let k = 1; k <= samples; k++) {
      const t = k / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1, 2].map((axis) => 0.5 * (2 * p1[axis]! + (-p0[axis]! + p2[axis]!) * t + (2 * p0[axis]! - 5 * p1[axis]! + 4 * p2[axis]! - p3[axis]!) * t2 + (-p0[axis]! + 3 * p1[axis]! - 3 * p2[axis]! + p3[axis]!) * t3)) as Point3);
    }
  }
  return out;
}
const PARTS_LIST: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  PARTS_LIST.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: 'hi' | 'mid' | 'lo' | 'faint' = 'lo', free?: boolean) => {
  if (d) PARTS_LIST.push({ kind: 'line', d, tone, free });
};
const dots = (points: Point3[], size = 0.45, tone: Tone = 'mid') => PARTS_LIST.push({ kind: 'dots', points: points.map(at), size, tone });
function screw(x: number, y: number, z: number, r = 1.2) {
  line(kitRing(x, y, r, z, P, 16), 'lo');
  dots([[x, y, z]], 0.45, 'mid');
}

// The base on four turned feet, its groove and corner screws.
for (const [x, y] of [
  [BASE.x + 12, BASE.y + 12],
  [BASE.x + BASE.w - 12, BASE.y + 12],
  [BASE.x + 12, BASE.y + BASE.d - 12],
  [BASE.x + BASE.w - 12, BASE.y + BASE.d - 12],
] as Plane[]) {
  solid(cylinder(x, y, 7, -6, 1.6, P, 28), 'lo');
  solid(cylinder(x, y, 5.2, -4.4, 4.4, P, 28), 'mid');
}
solid(slabOf(BASE, BASE_Z[0], BASE_Z[1], P, 8, 1.4), 'mid', { inner: seamOf(sideSeam(BASE, 2.4, P, 8)) });
line(planOutline(insetPlan(BASE, 5), TOP, P), 'faint');
for (const [x, y] of [
  [BASE.x + 9, BASE.y + 9],
  [BASE.x + BASE.w - 9, BASE.y + 9],
  [BASE.x + 9, BASE.y + BASE.d - 9],
  [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
] as Plane[]) screw(x, y, TOP);

// The treadmill's far side, the belt, the far rail, the robot and the near side.
PARTS_LIST.push(...rig.treadmillBack());
PARTS_LIST.push({ kind: 'slot', slot: 'belt' });
PARTS_LIST.push(...rig.farRail());
PARTS_LIST.push({ kind: 'slot', slot: 'legs-far' });
PARTS_LIST.push({ kind: 'slot', slot: 'body' });
PARTS_LIST.push({ kind: 'slot', slot: 'legs-near' });
PARTS_LIST.push(...rig.treadmillFront());
// The desk: a wedge whose top slopes up toward the back, with a trim line along its front face.
{
  const profile: Point3[] = [
    [DESK.x0, DESK.front, TOP],
    [DESK.x0, DESK.front, DESK.frontZ],
    [DESK.x0, DESK.back, DESK.backZ],
    [DESK.x0, DESK.back, TOP],
  ];
  solid(prismAlong(profile, [DESK.x1 - DESK.x0, 0, 0], P, { bevel: 0.6 }), 'mid', {
    inner: seamOf(pathOf([at([DESK.x0, DESK.front, TOP + 2.6]), at([DESK.x1, DESK.front, TOP + 2.6]), at([DESK.x1, DESK.back, TOP + 2.6])])),
  });
}
/** A closed outline lying on the slope, from (x, s) pairs. */
const slopeOutline = (points: Array<[number, number]>, h = 0) => pathOf(points.map(([x, s]) => at(onSlope(x, s, h))), true);
// The armrest along the front edge, a padded bar the length of the desk.
solid(discAlong([DESK.x0 + 0.6, DESK.front - 1.3, DESK.frontZ + 0.6], [1, 0, 0], 1.7, DESK.x1 - DESK.x0 - 1.2, P, 28, 0.3), 'mid');
// The panel's inset border, then the slots: each a recess, its walls the darkest tone.
line(slopeOutline(roundedOutline(DESK.x0 + 1.4, 3.4, DESK.x1 - 1.4, SLOPE_LENGTH - 1.4, 1.2, 4)), 'faint');
for (const x of FADER_X) {
  const outline = roundedOutline(x - SLOT.w / 2, SLOT.s0, x + SLOT.w / 2, SLOT.s1, SLOT.w / 2, 5);
  PARTS_LIST.push({ kind: 'fill', d: slopeOutline(outline), shade: 0 });
  line(slopeOutline(outline), 'lo');
}
// The scale strip at the bank's left end, its ticks rooted on its right edge: a mark every half weight, long at each whole weight.
{
  const outline = roundedOutline(SCALE_STRIP.s0, SCALE_STRIP.x0, SCALE_STRIP.s1, SCALE_STRIP.x1, 0.5, 2).map(([s, x]) => onSlope(x, s));
  const strip = prismAlong(outline, NORMAL.map((value) => value * 0.7) as Point3, P, { round: true, bevel: 0.2 });
  solid(strip, 'lo');
  const minor: string[] = [];
  const major: string[] = [];
  for (let step = 0; step <= 2 * WEIGHT_MAX; step++) {
    const s = capS(step / 2);
    const long = step % 2 === 0;
    const from = onSlope(SCALE_STRIP.x1, s, 0.7);
    const to = onSlope(SCALE_STRIP.x1 - (long ? 2.2 : 1.2), s, 0.7);
    (long ? major : minor).push(pathOf([at(from), at(to)]));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
}
// Beside each slot, a dot where the balanced score sets that weight.
{
  const defaults = defaultWeights();
  dots(TERMS.map((term, index) => onSlope(FADER_X[index]! + 2.6, capS(defaults[term.id]))), 0.55, 'mid');
}
// Panel screws in the corners.
for (const [x, s] of [
  [DESK.x0 + 2.8, 4.4],
  [DESK.x1 - 2.8, 4.4],
  [DESK.x0 + 2.8, SLOPE_LENGTH - 2.2],
  [DESK.x1 - 2.8, SLOPE_LENGTH - 2.2],
] as Array<[number, number]>) {
  const centre = onSlope(x, s);
  PARTS_LIST.push({ kind: 'line', d: pathOf(Array.from({ length: 17 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    return at(onSlope(x + 1.1 * Math.cos(angle), s + 1.1 * Math.sin(angle)));
  })), tone: 'lo' });
  dots([centre], 0.42, 'mid');
}
// The cable from the drive motor's end cap, down to the base and into a gland on the desk's right end,
// drawn after the desk because it lies in front of that end.
{
  const cap = rig.motorCapPoint;
  const gland: Point3 = [DESK.x1, DESK.back + 12, TOP + 4.2];
  solid(discAlong(gland, [1, 0, 0], 1.7, 1.4, P, 20, 0.2), 'mid');
  const route = smoothRoute([
    cap,
    [cap[0], cap[1] + 2.6, cap[2] - 1.2],
    [cap[0] - 0.4, cap[1] + 5.4, TOP + 0.7],
    [cap[0] - 3, DESK.back + 9, TOP + 0.7],
    [DESK.x1 + 5, gland[1], TOP + 0.9],
    [DESK.x1 + 2.6, gland[1], gland[2] - 0.6],
    [DESK.x1 + 1.4, gland[1], gland[2]],
  ]);
  PARTS_LIST.push({ kind: 'wire', from: at(route[0]!), via: route.slice(1, -1).map(at), to: at(route[route.length - 1]!), tone: 'lo' });
}
PARTS_LIST.push({ kind: 'slot', slot: 'caps' });

// The label plate on the base in front of the desk: three rule lines for its printed text, and two screws.
solid(slabOf(LABEL, TOP, 0.8, P, 4), 'lo');
line(planOutline(insetPlan(LABEL, 0.9), TOP + 0.8, P, 4), 'faint');
for (const [y, length] of [
  [LABEL.y + 1.5, 10],
  [LABEL.y + 2.5, 7],
  [LABEL.y + 3.5, 8.5],
] as Array<[number, number]>) line(lineOnTop([LABEL.x + 2.4, y], [LABEL.x + 2.4 + length, y], TOP + 0.8, P), 'lo', true);
dots([[LABEL.x + LABEL.w - 2.2, LABEL.y + 1.5, TOP + 0.8], [LABEL.x + LABEL.w - 2.2, LABEL.y + LABEL.d - 1.5, TOP + 0.8]], 0.42, 'mid');

export const PARTS: readonly Part[] = PARTS_LIST;

// ------------------------------------------------------------------ the faders
export interface Cap {
  term: TermId;
  /** The cap built at weight 0; the live code slides it up the slot by capShift(weight). */
  paths: SolidPaths;
  /** The grip ridge across its top. */
  grip: string;
}
export const CAPS: readonly Cap[] = TERMS.map((term, index) => {
  const x = FADER_X[index]!;
  const outline = roundedOutline(-CAP.l / 2, -CAP.w / 2, CAP.l / 2, CAP.w / 2, 0.8, 3).map(([s, across]) => onSlope(x + across, CAP_S0 + s));
  const paths = prismAlong(outline, NORMAL.map((value) => value * CAP.h) as Point3, P, { round: true, bevel: 0.35 });
  const grip = pathOf([at(onSlope(x - CAP.w / 2, CAP_S0, CAP.h)), at(onSlope(x + CAP.w / 2, CAP_S0, CAP.h))]);
  return { term: term.id, paths, grip };
});
/** A cap's slide up its slot for a weight, as a screen translate. */
export const capShift = (weight: number) => translateAlong(P, SLOPE.map((value) => value * (capS(weight) - CAP_S0)) as Point3);

/** The fader in charge of each walk: the task while the trot holds, otherwise the weight that tipped it. */
export const TERM_IN_CHARGE: Record<BehaviorId, TermId> = {
  balanced: 'velTrack',
  frozen: 'torque',
  prancing: 'airTime',
  chatter: 'actionRate',
};

// ------------------------------------------------------------------ the robot
/** The model's pose for a walk at a phase, in the bench's millimetres. */
export function poseFor(behavior: BehaviorId, phase: number): RobotPose & { travel: number } {
  const pose = quadrupedPose(behavior, phase);
  const feet: FootPose[] = FOOT_ORDER.map((leg) => {
    const { footDx, footDy } = pose.legs[leg];
    return { dx: footDx * MM_PER_PX, lift: footDy * MM_PER_PX, down: footDy <= 0.5 };
  });
  return { feet, rise: -pose.bodyY * MM_PER_PX, roll: 0, travel: pose.groundOffset * MM_PER_PX };
}

/** The legs at a pose: the far pair and the near pair, five solids a leg. */
export function legsAt(pose: RobotPose): { far: RobotSolid[]; near: RobotSolid[] } {
  const { far, near } = rig.robot(pose);
  return { far, near };
}

/** The body, battery, head and lens, built level at standing height; the live code lifts them by the pose's rise. */
export const BODY_SOLIDS: readonly RobotSolid[] = rig.robot({ feet: FOOT_ORDER.map(() => ({ dx: 0, lift: 0, down: true })), rise: 0, roll: 0 }).body;
export const HATCH = rig.hatch({ feet: [], rise: 0, roll: 0 });
/** Screen offset of the body for a rise. */
export const bodyShift = (rise: number) => translateAlong(P, [0, 0, rise]);

export const BELT_BAND = rig.beltBand;
export const beltSlats = rig.beltSlats;

/** Screen points for checks: a world point on screen. */
export const screenOf = (point: Point3): Flat => at(point);
