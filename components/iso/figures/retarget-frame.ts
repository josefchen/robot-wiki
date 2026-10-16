/**
 * The retargeting frame for RetargetingGap, drawn with the isometric kit.
 *
 * The object is the explanation: a test frame with one hip beam. A
 * mannequin's legs and a robot's legs hang from the beam at the same hip
 * height, in the same walking pose, the robot's thighs held parallel to the
 * mannequin's by coupling rods. The mannequin stands on the floor plate.
 * The robot's legs telescope: shorter than the mannequin's, its feet hang
 * above the floor; longer, they sink through the bay, an opening framed in
 * the plate. A height gauge on a slide under the bay reads the gap under the
 * robot's planted foot, the one lit part.
 *
 * World units follow the walking pose: the mannequin's thigh and shin are
 * `WALK.thigh` and `WALK.shin` long, and its hip stands its planted leg's
 * drop above the floor. x is the walking direction, y is toward the viewer
 * (the near leg is the forward one), z is up. Static paths are built once;
 * the robot's legs and the gauge's slider are rebuilt per frame by the
 * functions at the bottom.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { phoneFitOf } from '../phone-fit.ts';
import { barBetween, discAlong, plateIn, roundedOutline } from '../prism.ts';

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 64;
export const ELEVATION = 22;

/** A walking pose: segment lengths and joint angles from straight down, in degrees, forward positive. */
export interface Pose {
  thigh: number;
  shin: number;
  frontHip: number;
  frontKnee: number;
  backHip: number;
  backKnee: number;
}

export type Group = 'static' | 'gauge';
export type LiveId = 'mannequin-far' | 'mannequin-near' | 'robot-far' | 'robot-near' | 'gauge';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'live'; group: Group; id: LiveId };

const RAD = Math.PI / 180;

/** The mannequin's walking pose, copied joint for joint onto the robot: the front leg planted, the back one at toe-off. */
export const WALK: Pose = { thigh: 46, shin: 46, frontHip: 22, frontKnee: -6, backHip: -18, backKnee: -16 };

/** Height of the hip above the lower foot for legs `scale` times the pose's length. */
export const legDrop = (pose: Pose, scale: number) =>
  Math.max(
    scale * (pose.thigh * Math.cos(pose.frontHip * RAD) + pose.shin * Math.cos((pose.frontHip + pose.frontKnee) * RAD)),
    scale * (pose.thigh * Math.cos(pose.backHip * RAD) + pose.shin * Math.cos((pose.backHip + pose.backKnee) * RAD)),
  );

// ---------------------------------------------------------------- layout
const BENCH: Plan = { x: -150, y: -40, w: 300, d: 86, r: 8 };
const BENCH_H = 9;
const FOOT_H = 5;
/** The floor plate's top: the floor both pairs of legs are measured against. */
export const FLOOR = 44;
const PLATE_T = 4;
/** The floor plate, with a bay under the robot's legs. */
const PLATE = { x0: -126, x1: 134, y0: -24, y1: 30 };
/** The bay: an opening in the floor under the robot, framed by the plate on every side. */
const BAY = { x0: 8, x1: 128, y0: -17, y1: 24 };
/** The two hips along the beam. */
export const HIPS = { mannequin: -66, robot: 70 };
/** Each leg's plane across the frame: the near (forward) leg toward the viewer, the far one away. */
const LEG_Y = { near: 7.5, far: -7.5 };
const POSTS_X = 140;
const BEAM_W = 8;

/** Both hips hang at the mannequin's hip height: its planted foot's drop above the floor. */
export const HIP_Z = FLOOR + legDrop(WALK, 1);
/** The beam stands above the hips by this much. */
const BEAM_ABOVE = 14;
/** The gauge stands on its slide in front of the robot's near foot. */
const GAUGE_Y = 18;
/** The gauge stands this far ahead of the robot's planted sole, past its toe; its scriber reaches back under the sole. */
export const GAUGE_AHEAD = 16;
/** Where the scriber touches: this far along the sole from the ankle's line. */
const SCRIBE_AT = 4.5;
/** The gauge's slide along the bench: it covers the gauge base's travel over the whole leg-length range. */
const SLIDE = { x0: 92, x1: 136 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BENCH.x, BENCH.x + BENCH.w]) for (const py of [BENCH.y, BENCH.y + BENCH.d]) extremes.push([px, py, -BENCH_H - FOOT_H], [px, py, 0]);
for (const px of [-POSTS_X, POSTS_X]) extremes.push([px, -6, HIP_Z + BEAM_ABOVE + 10], [px, 6, HIP_Z + BEAM_ABOVE + 10]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 12 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

// ------------------------------------------------------------------ legs
/** A leg's hip and knee joints and its sole: the pose's leg ends where the foot meets the ground. */
export interface LegJoints {
  hip: Point3;
  knee: Point3;
  sole: Point3;
}

/** The hip, knee and sole of one leg hanging from `hipX`, its segments `scale` times the pose's. */
export function jointsOf(hipX: number, scale: number, leg: 'near' | 'far', pose: Pose = WALK): LegJoints {
  const [hipDeg, kneeDeg] = leg === 'near' ? [pose.frontHip, pose.frontKnee] : [pose.backHip, pose.backKnee];
  const y = LEG_Y[leg];
  const hip: Point3 = [hipX, y, HIP_Z];
  const knee: Point3 = [hipX + scale * pose.thigh * Math.sin(hipDeg * RAD), y, HIP_Z - scale * pose.thigh * Math.cos(hipDeg * RAD)];
  const sole: Point3 = [knee[0] + scale * pose.shin * Math.sin((hipDeg + kneeDeg) * RAD), y, knee[2] - scale * pose.shin * Math.cos((hipDeg + kneeDeg) * RAD)];
  return { hip, knee, sole };
}

const along = (a: Point3, b: Point3, t: number): Point3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const unitOf = (a: Point3, b: Point3): Point3 => {
  const d: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(...d) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
};
const lengthOf = (a: Point3, b: Point3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** The ankle joint's centre sits this far over the sole, along the shin. */
const ANKLE_UP = 5.5;
/** The ankle's centre: up the shin from the sole. */
const ankleOf = ({ knee, sole }: LegJoints): Point3 => {
  const u = unitOf(sole, knee);
  return [sole[0] + u[0] * ANKLE_UP, sole[1], sole[2] + u[2] * ANKLE_UP];
};
const FOOT = { heel: 6, toe: 12, width: 9, thick: 4 };

/** A mannequin leg: smooth round limbs, round joints at the ankle, knee and hip, a shoe-shaped foot, in painter's order. */
export function mannequinLeg(joints: LegJoints, toward: 1 | -1): SolidPaths[] {
  const { hip, knee, sole } = joints;
  const ankle = ankleOf(joints);
  const out: SolidPaths[] = [];
  const thighAxis = unitOf(hip, knee);
  const shinAxis = unitOf(knee, ankle);
  const footPlan: Plan = { x: sole[0] - FOOT.heel, y: sole[1] - FOOT.width / 2, w: FOOT.heel + FOOT.toe, d: FOOT.width, r: 3.6 };
  out.push(slabOf(footPlan, sole[2], FOOT.thick, P, 6, 0.5));
  out.push(discAlong(along(knee, ankle, 0.06), shinAxis, 4.6, lengthOf(knee, ankle) * 0.88, P, 26));
  out.push(discAlong([ankle[0], ankle[1] - toward * 3.6, ankle[2]], [0, toward, 0], 3.8, 7.2, P, 22));
  out.push(discAlong(along(hip, knee, 0.04), thighAxis, 6, lengthOf(hip, knee) * 0.9, P, 28));
  out.push(discAlong([knee[0], knee[1] - toward * 4.6, knee[2]], [0, toward, 0], 5.4, 9.2, P, 24));
  out.push(discAlong([hip[0], hip[1] - toward * 5, hip[2]], [0, toward, 0], 6.6, 10, P, 26));
  return out;
}

/**
 * A robot leg: hip actuator, a telescoping thigh (sleeve, rod and knurled lock collar), knee actuator,
 * a telescoping shin, ankle actuator and a flat foot plate, in painter's order.
 */
export interface RobotLeg {
  foot: SolidPaths;
  shinRod: SolidPaths;
  shinSleeve: SolidPaths;
  shinCollar: SolidPaths;
  ankle: SolidPaths;
  thighRod: SolidPaths;
  thighSleeve: SolidPaths;
  thighCollar: SolidPaths;
  knee: SolidPaths;
  kneeCap: SolidPaths;
  hip: SolidPaths;
}

const SLEEVE = 24;
export function robotLeg(joints: LegJoints, toward: 1 | -1): RobotLeg {
  const { hip, knee, sole } = joints;
  const ankle = ankleOf(joints);
  const side: Point3 = [0, 1, 0];
  const thighAxis = unitOf(hip, knee);
  const shinAxis = unitOf(knee, ankle);
  const sleeveEnd = (from: Point3, axis: Point3): Point3 => [from[0] + axis[0] * SLEEVE, from[1] + axis[1] * SLEEVE, from[2] + axis[2] * SLEEVE];
  const thighSleeveEnd = sleeveEnd(along(hip, knee, 0), thighAxis);
  const shinSleeveEnd = sleeveEnd(knee, shinAxis);
  const footPlan: Plan = { x: sole[0] - FOOT.heel - 1, y: sole[1] - FOOT.width / 2 - 0.5, w: FOOT.heel + FOOT.toe + 2, d: FOOT.width + 1, r: 1.4 };
  return {
    foot: slabOf(footPlan, sole[2], FOOT.thick - 0.8, P, 3, 0.5),
    shinRod: barBetween(shinSleeveEnd, along(shinSleeveEnd, ankle, 1), side, 4.2, 4.2, P),
    shinSleeve: barBetween(knee, shinSleeveEnd, side, 7, 7, P, 0.4),
    shinCollar: discAlong(along(knee, shinSleeveEnd, 1), shinAxis, 4.8, 2.6, P, 22),
    ankle: discAlong([ankle[0], ankle[1] - toward * 4, ankle[2]], [0, toward, 0], 4.2, 8, P, 22),
    thighRod: barBetween(thighSleeveEnd, knee, side, 5, 5, P),
    thighSleeve: barBetween(hip, thighSleeveEnd, side, 8.4, 8.4, P, 0.4),
    thighCollar: discAlong(thighSleeveEnd, thighAxis, 5.6, 2.8, P, 24),
    knee: discAlong([knee[0], knee[1] - toward * 5, knee[2]], [0, toward, 0], 6.4, 10, P, 26),
    kneeCap: discAlong([knee[0], knee[1] + toward * 5, knee[2]], [0, toward, 0], 3.2, 1.2, P, 20),
    hip: discAlong([hip[0], hip[1] - toward * 6, hip[2]], [0, toward, 0], 7.6, toward > 0 ? 7 : 5, P, 28, 0.4),
  };
}

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group: 'static', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group: 'static', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group: 'static', points: points.map(at), size, tone });

{
  const beamZ = HIP_Z + BEAM_ABOVE;

  // Bench: a plate on four turned feet, with a seam, a groove and corner screws.
  for (const [x, y] of byDepth([
    [BENCH.x + 20, BENCH.y + 16],
    [BENCH.x + BENCH.w - 20, BENCH.y + 16],
    [BENCH.x + 20, BENCH.y + BENCH.d - 16],
    [BENCH.x + BENCH.w - 20, BENCH.y + BENCH.d - 16],
  ])) {
    solid(cyl(x, y, 8, -BENCH_H - FOOT_H, 1.6, 28), 'lo');
    solid(cyl(x, y, 6.2, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
  }
  solid(slab(BENCH, -BENCH_H, BENCH_H, 8, 1.4), 'mid', { inner: sideSeam(BENCH, -BENCH_H + 2.6, P, 8), innerTone: 'faint' });
  line(planOutline(insetPlan(BENCH, 4.5), 0, P), 'faint');
  {
    const screws: Plane[] = [
      [BENCH.x + 9, BENCH.y + 9],
      [BENCH.x + BENCH.w - 9, BENCH.y + 9],
      [BENCH.x + 9, BENCH.y + BENCH.d - 9],
      [BENCH.x + BENCH.w - 9, BENCH.y + BENCH.d - 9],
    ];
    line(screws.map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
    dots(screws.map(([x, y]) => [x, y, 0]), 0.5);
  }

  // The gantry posts at the far end of each side and the hip beam across them, back to front.
  for (const x of [-POSTS_X, POSTS_X]) {
    solid(slab({ x: x - 7, y: -9, w: 14, d: 18, r: 2 }, 0, 3, 3, 0.4), 'mid');
    solid(slab({ x: x - 4, y: -4, w: 8, d: 8, r: 1 }, 3, beamZ + BEAM_W - 3, 3, 0.5), 'mid', { inner: sideSeam({ x: x - 4, y: -4, w: 8, d: 8, r: 1 }, beamZ - 6, P, 3), innerTone: 'faint' });
    dots([[x - 4.6, 6, 3], [x + 4.6, -6, 3]], 0.45);
  }
  solid(slab({ x: -POSTS_X - 6, y: -BEAM_W / 2, w: 2 * POSTS_X + 12, d: BEAM_W, r: 1.2 }, beamZ, BEAM_W, 3, 0.6), 'mid');
  // A ruler along the beam's front face, ticks hanging from its top edge.
  {
    const y = BEAM_W / 2;
    const minor: string[] = [];
    const major: string[] = [];
    for (let x = -120; x <= 120; x += 6) {
      const big = Math.round(x / 6) % 5 === 0;
      (big ? major : minor).push(pathOf([at([x, y, beamZ + BEAM_W]), at([x, y, beamZ + BEAM_W - (big ? 3.4 : 2)])]));
    }
    line(minor.join(''), 'lo');
    line(major.join(''), 'mid');
  }

  // The floor plate on five legs: a U round the bay (the front strip across the bay is drawn later, in front
  // of the robot's legs), with a groove round its top and tiles on the mannequin's side.
  const plateRing: Plane[] = [
    [PLATE.x0, PLATE.y0],
    [PLATE.x1, PLATE.y0],
    [PLATE.x1, BAY.y1],
    [BAY.x1, BAY.y1],
    [BAY.x1, BAY.y0],
    [BAY.x0, BAY.y0],
    [BAY.x0, PLATE.y1],
    [PLATE.x0, PLATE.y1],
  ];
  for (const [x, y] of byDepth([
    [PLATE.x0 + 6, PLATE.y0 + 6],
    [PLATE.x1 - 3, PLATE.y0 + 4],
    [PLATE.x0 + 6, PLATE.y1 - 6],
    [BAY.x0 - 6, PLATE.y1 - 6],
    [PLATE.x1 - 3, 4],
  ])) {
    solid(slab({ x: x - 2.6, y: y - 2.6, w: 5.2, d: 5.2, r: 0.8 }, 0, FLOOR - PLATE_T, 3), 'mid');
  }
  solid(extrude(plateRing, FLOOR - PLATE_T, PLATE_T, P, { convex: false, bevel: 0.5 }), 'mid');
  line(planOutline({ x: PLATE.x0 + 4, y: PLATE.y0 + 4, w: BAY.x0 - PLATE.x0 - 8, d: PLATE.y1 - PLATE.y0 - 8, r: 1.5 }, FLOOR, P, 3), 'faint');
  {
    const tiles: string[] = [];
    for (let x = PLATE.x0 + 20; x < BAY.x0 - 10; x += 16) tiles.push(onTop([[x, PLATE.y0 + 4], [x, PLATE.y1 - 4]], FLOOR, P));
    line(tiles.join(''), 'faint');
  }

  // The gauge's slide: a rail on the bench under the bay's front, with an end block at each end.
  solid(slab({ x: SLIDE.x0, y: GAUGE_Y - 3, w: SLIDE.x1 - SLIDE.x0, d: 6, r: 1 }, 0, 2, 3, 0.3), 'mid');
  for (const x of [SLIDE.x0 - 2, SLIDE.x1 + 2]) solid(slab({ x: x - 2, y: GAUGE_Y - 4, w: 4, d: 8, r: 0.8 }, 0, 4, 3, 0.3), 'mid');

  // Behind the hips: the hangers from the beam down to each pelvis.
  for (const hipX of [HIPS.mannequin, HIPS.robot]) {
    solid(slab({ x: hipX - 9, y: -BEAM_W / 2 - 1.4, w: 18, d: BEAM_W + 2.8, r: 1.4 }, beamZ - 1.5, BEAM_W + 3, 3, 0.5), 'mid');
    dots([[hipX - 6, BEAM_W / 2 + 1.4, beamZ + 3.5], [hipX + 6, BEAM_W / 2 + 1.4, beamZ + 3.5]], 0.45);
  }
  for (const hipX of [HIPS.mannequin, HIPS.robot]) {
    solid(kitCylinder(hipX, 0, 2.4, HIP_Z + 6, beamZ - 1.5 - HIP_Z - 6, P, 18), 'mid');
  }

  // The coupling rod behind: it holds the far thighs parallel.
  const coupling = (leg: 'near' | 'far') => {
    const a = jointsOf(HIPS.mannequin, 1, leg);
    const b = jointsOf(HIPS.robot, 1, leg);
    const t = 16 / WALK.thigh;
    const pa = along(a.hip, a.knee, t);
    const pb = along(b.hip, b.knee, t);
    const y = LEG_Y[leg] + (leg === 'near' ? 7.6 : -7.6);
    return { rod: barBetween([pa[0], y, pa[2]], [pb[0], y, pb[2]], [0, 0, 1], 2.4, 1.6, P, 0.3), pins: [pa, pb], y };
  };
  const far = coupling('far');
  solid(far.rod, 'mid');
  for (const pin of far.pins) solid(discAlong([pin[0], far.y - 1.4, pin[2]], [0, 1, 0], 2.4, 2.4, P, 18), 'mid');

  // The far legs, then each pelvis, then the near legs, then the near coupling rod.
  put({ kind: 'live', group: 'static', id: 'mannequin-far' });
  put({ kind: 'live', group: 'static', id: 'robot-far' });
  // The mannequin's pelvis: a rounded block with a waist stub.
  {
    const hipX = HIPS.mannequin;
    solid(plateIn([hipX, -11, HIP_Z - 7], [1, 0, 0], [0, 0, 1], roundedOutline(-12, 0, 12, 17, 6, 5), 22, P), 'hi');
    solid(kitCylinder(hipX, 0, 7, HIP_Z + 10, 6, P, 28, 0.4), 'hi');
  }
  // The robot's pelvis: a box frame with a cable gland; its hip actuators belong to the legs.
  {
    const hipX = HIPS.robot;
    solid(plateIn([hipX, -9, HIP_Z - 6], [1, 0, 0], [0, 0, 1], roundedOutline(-10, 0, 10, 16, 2, 3), 18, P, 0.5), 'mid');
    dots([[hipX - 7, 9, HIP_Z + 7.5], [hipX + 7, 9, HIP_Z + 7.5], [hipX - 7, 9, HIP_Z - 3.5], [hipX + 7, 9, HIP_Z - 3.5]], 0.45);
    solid(kitCylinder(hipX, 0, 5, HIP_Z + 10, 4, P, 24, 0.4), 'mid');
  }
  put({ kind: 'live', group: 'static', id: 'mannequin-near' });
  put({ kind: 'live', group: 'static', id: 'robot-near' });
  const near = coupling('near');
  for (const pin of near.pins) solid(discAlong([pin[0], near.y - 2.6, pin[2]], [0, 1, 0], 2.2, 2, P, 18), 'mid');
  solid(near.rod, 'mid');
  for (const pin of near.pins) solid(discAlong([pin[0], near.y + 0.8, pin[2]], [0, 1, 0], 1.6, 1, P, 16), 'hi');

  // The height gauge on its slide (a moving group), then the plate's front strip across the bay, in front of
  // the gauge. Last, a label plate.
  put({ kind: 'live', group: 'gauge', id: 'gauge' });
  solid(slab({ x: BAY.x0, y: BAY.y1, w: PLATE.x1 - BAY.x0, d: PLATE.y1 - BAY.y1, r: 0.4 }, FLOOR - PLATE_T, PLATE_T, 2, 0.5), 'mid');
  const LABEL: Plan = { x: -126, y: 32, w: 50, d: 12, r: 2 };
  solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
  line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
  line(
    [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.4 + row * 2.8], [LABEL.x + (row === 1 ? 30 : 42), LABEL.y + 3.4 + row * 2.8]], 0.8, P)).join(''),
    'lo',
    true,
  );
  dots([[LABEL.x + 3.8, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.8, LABEL.y + LABEL.d / 2, 0.8]], 0.5);
}

export const PARTS: readonly Part[] = parts;

// ------------------------------------------------------------- the gauge
/** Drawing units per centimetre when the mannequin's hip stands `hipCm` above the floor. */
export const unitsPerCm = (hipCm: number) => legDrop(WALK, 1) / hipCm;

/**
 * The height gauge, built at x = 0 and moved along its slide by `gaugeAt`: a base, a column with a scale
 * whose zero is the floor's height (ticks every 5 cm, majors every 10), and a slider whose scriber reaches
 * back under the robot's foot. `gap` is the sole's height above the floor in drawing units.
 */
export function gaugeOf(hipCm: number, gap: number) {
  const k = unitsPerCm(hipCm);
  const column = { x: -2.2, y: GAUGE_Y - 2.2, w: 4.4, d: 4.4, r: 0 };
  const top = FLOOR + 32 * k;
  const minor: string[] = [];
  const major: string[] = [];
  for (let cm = -30; cm <= 30; cm += 5) {
    const z = FLOOR + cm * k;
    const big = cm % 10 === 0;
    const len = cm === 0 ? 4.4 : big ? 3 : 1.8;
    // Each tick hangs from the column's left edge, its silhouette, across the face toward the viewer.
    (big ? major : minor).push(pathOf([at([-2.2, GAUGE_Y + 2.2, z]), at([-2.2 + len, GAUGE_Y + 2.2, z])]));
  }
  const sliderZ = FLOOR + gap;
  return {
    base: slabOf({ x: -7, y: GAUGE_Y - 6, w: 14, d: 11, r: 2 }, 2, 6, P, 4, 0.5),
    baseSeam: sideSeam({ x: -7, y: GAUGE_Y - 6, w: 14, d: 11, r: 2 }, 4.4, P, 4),
    column: slabOf(column, 8, top - 8, P, 2, 0.3),
    cap: slabOf({ x: -3.2, y: GAUGE_Y - 3.2, w: 6.4, d: 6.4, r: 1 }, top, 2.4, P, 3, 0.3),
    minor: minor.join(''),
    major: major.join(''),
    sliderZ,
    slider: slabOf({ x: -4.4, y: GAUGE_Y - 4.4, w: 8.8, d: 8.8, r: 1.2 }, sliderZ - 3.2, 6.4, P, 3, 0.4),
    knob: discAlong([0, GAUGE_Y + 4.4, sliderZ], [0, 1, 0], 2.6, 3.2, P, 22),
    scriber: barBetween([-2.4, GAUGE_Y - 3.4, sliderZ - 1.4], [SCRIBE_AT - GAUGE_AHEAD, LEG_Y.near, sliderZ - 1.4], [0, 0, 1], 1, 1.6, P),
    tip: discAlong([SCRIBE_AT - GAUGE_AHEAD, LEG_Y.near, sliderZ - 0.9], [0, 0, -1], 1.2, 1, P, 14),
  };
}
/** The screen offset that moves the gauge along its slide to x. */
export const gaugeAt = (x: number) => translateAlong(P, [x, 0, 0]);

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
