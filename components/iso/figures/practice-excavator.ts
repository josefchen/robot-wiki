/**
 * The practice yard for ExcavatorPractice, drawn with the isometric kit.
 *
 * The object is the explanation. A walking excavator stands on a yard plate
 * beside a path board. Its arm (boom, stick, telescopic extension and
 * shovel, each driven by a hydraulic cylinder) traces a path engraved on the
 * board: a stylus on the shovel's far side inks where the shovel really
 * went, and five faint lines ahead of the stylus are the five learned
 * models' guesses of where it goes next. A trainer console in front counts
 * the minutes of practice on its dial, against a band at the 100 to 150
 * minutes earlier controllers needed. With 3 minutes of practice the guesses
 * fan out and the ink wanders off the path; by 20 minutes they lie together
 * and the ink stays on it.
 *
 * Numbers: lib/excavator-practice.ts (the paper's checkpoints, the five
 * models, the path and the misses). The arm's joints come from inverse
 * kinematics on the shovel tip, and each cylinder's rod is as long as that
 * pose needs.
 *
 * World units: 20 to a metre. x runs forward along the arm, y across (toward
 * the viewer is +y), z up from the yard plate.
 */
import {
  cylinder as kitCylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, circleAround, discAlong, prismAlong, viewOf } from '../prism.ts';
import {
  EARLIER_MINUTES,
  PRACTICE,
  STILL_PRACTICE,
  STILL_S,
  guessesAt,
  practiceOf,
  referenceAt,
  tracedAt,
  type ArmPoint,
  type Practice,
} from '../../../lib/excavator-practice.ts';

export const WIDTH = 600;
export const AZIMUTH = 62;
export const ELEVATION = 24;
/** World units to a metre. */
export const U = 20;

// ------------------------------------------------------------------ layout (metres)
/** The arm's plane, the board's face and the stylus between them. */
export const ARM_Y = -0.3;
export const BOARD_Y = -0.95;
const BOARD_T = 0.1;
const BOARD = { x0: 3.35, x1: 7.05, z0: 0.5, z1: 3.75 };
/** The boom's foot pin on the house, and the arm's lengths. */
export const BOOM_FOOT: ArmPoint = [0.95, 1.95];
export const BOOM_LENGTH = 3.1;
const KNEE_AT = 0.56;
const KNEE_RISE = 0.42;
export const STICK_LENGTH = 1.7;
export const TELESCOPE_MAX = 0.95;
/** From the shovel's pin to its cutting edge, held at one pitch. */
export const TIP_FROM_PIN: ArmPoint = [0.28, -0.7];
/** The boom cylinder's base pin on the house front. */
const BOOM_CYL_BASE: ArmPoint = [0.98, 1.5];
const BOOM_CYL_BARREL = 1.1;
const STICK_CYL_BARREL = 1.15;
const SHOVEL_CYL_BARREL = 0.48;

const V = viewOf({ origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION });

// ------------------------------------------------------------------ kinematics
export interface ArmPose {
  tip: ArmPoint;
  /** Shovel pin. */
  pin: ArmPoint;
  /** Boom tip (stick pivot). */
  boomTip: ArmPoint;
  knee: ArmPoint;
  /** Telescope extension in metres. */
  extension: number;
  /** Unit direction of the boom (foot to tip) and of the stick (pivot to pin). */
  boomDir: ArmPoint;
  stickDir: ArmPoint;
}

const sub2 = (a: ArmPoint, b: ArmPoint): ArmPoint => [a[0] - b[0], a[1] - b[1]];
const add2 = (a: ArmPoint, b: ArmPoint): ArmPoint => [a[0] + b[0], a[1] + b[1]];
const mul2 = (a: ArmPoint, k: number): ArmPoint => [a[0] * k, a[1] * k];
const len2 = (a: ArmPoint) => Math.hypot(a[0], a[1]);
const unit2 = (a: ArmPoint): ArmPoint => mul2(a, 1 / (len2(a) || 1));
/** Perpendicular, turned a quarter to the left (up for a forward direction). */
const perp = (a: ArmPoint): ArmPoint => [-a[1], a[0]];

/** The telescope's extension for a reach from the boom's foot: further reaches slide it out (the drawing's choice). */
export function extensionFor(reach: number) {
  const t = Math.min(1, Math.max(0, (reach - 3.0) / 2.4));
  return TELESCOPE_MAX * (0.12 + 0.88 * t * t * (3 - 2 * t));
}

/** The arm's joints for a shovel tip at (x, z): two links (boom; stick plus telescope), boom up. */
export function poseFor(tip: ArmPoint): ArmPose {
  const pin = sub2(tip, TIP_FROM_PIN);
  const toPin = sub2(pin, BOOM_FOOT);
  const reach = len2(toPin);
  const extension = extensionFor(reach);
  const second = STICK_LENGTH + extension;
  const r = Math.min(reach, BOOM_LENGTH + second - 1e-6);
  const toward = Math.atan2(toPin[1], toPin[0]);
  const cosA = (BOOM_LENGTH ** 2 + r ** 2 - second ** 2) / (2 * BOOM_LENGTH * r);
  const up = toward + Math.acos(Math.min(1, Math.max(-1, cosA)));
  const boomDir: ArmPoint = [Math.cos(up), Math.sin(up)];
  const boomTip = add2(BOOM_FOOT, mul2(boomDir, BOOM_LENGTH));
  const stickDir = unit2(sub2(pin, boomTip));
  const knee = add2(add2(BOOM_FOOT, mul2(boomDir, BOOM_LENGTH * KNEE_AT)), mul2(perp(boomDir), KNEE_RISE));
  return { tip, pin, boomTip, knee, extension, boomDir, stickDir };
}

/** The three cylinders' pins for a pose: base and rod eye of each, in the arm's plane. */
export function cylindersFor(pose: ArmPose) {
  const { boomDir, stickDir, boomTip, pin } = pose;
  const along = (from: ArmPoint, dir: ArmPoint, a: number, side: number) => add2(add2(from, mul2(dir, a)), mul2(perp(dir), side));
  return {
    boom: { base: BOOM_CYL_BASE, eye: along(BOOM_FOOT, boomDir, 1.25, -0.1), barrel: BOOM_CYL_BARREL },
    stick: { base: along(BOOM_FOOT, boomDir, 1.5, 0.74), eye: along(boomTip, stickDir, -0.5, 0.3), barrel: STICK_CYL_BARREL },
    shovel: { base: along(pin, stickDir, -0.72, 0.2), eye: add2(pin, [-0.1, 0.1]), barrel: SHOVEL_CYL_BARREL },
  };
}

// ------------------------------------------------------------------ camera
const w = (x: number, y: number, z: number): Point3 => [x * U, y * U, z * U];
const inArm = ([x, z]: ArmPoint, dy = 0): Point3 => w(x, ARM_Y + dy, z);

const BASE: Plan = { x: -3.0 * U, y: -1.55 * U, w: 10.3 * U, d: 2.95 * U, r: 10 };
const BASE_TOP = 0;
const BASE_H = 7;

const extremes: Point3[] = [];
for (const [x, y] of [[BASE.x, BASE.y], [BASE.x + BASE.w, BASE.y], [BASE.x, BASE.y + BASE.d], [BASE.x + BASE.w, BASE.y + BASE.d]] as Plane[]) {
  extremes.push([x, y, -BASE_H - 5], [x, y, BASE_TOP]);
}
extremes.push(w(BOARD.x0, BOARD_Y - BOARD_T, BOARD.z1 + 0.12), w(BOARD.x1, BOARD_Y - BOARD_T, BOARD.z1 + 0.12));
// Every arm pose the figure shows, so the fit holds all of them.
for (const practice of PRACTICE) {
  for (let k = 0; k <= 40; k++) {
    const pose = poseFor(tracedAt(practice, k / 40));
    const cyls = cylindersFor(pose);
    const heelTop = add2(add2(pose.boomTip, mul2(pose.stickDir, -0.5)), mul2(perp(pose.stickDir), 0.45));
    extremes.push(
      inArm(add2(pose.knee, mul2(perp(pose.boomDir), 0.45))),
      inArm(add2(pose.boomTip, [0, 0.4])),
      inArm(add2(heelTop, [0, 0.1])),
      inArm(add2(cyls.stick.base, [0, 0.2])),
      inArm(add2(cyls.stick.eye, [0, 0.2])),
    );
  }
}
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flat = extremes.map((point) => iso(point, unit));
const spanX = Math.max(...flat.map(([x]) => x)) - Math.min(...flat.map(([x]) => x));
const spanY = Math.max(...flat.map(([, y]) => y)) - Math.min(...flat.map(([, y]) => y));
const PAD = 6;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanY) / spanX + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const r1 = (value: number) => Number(value.toFixed(1));

// ------------------------------------------------------------------ parts
export type Slot = 'board' | 'arm' | 'needle';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (list: Part[], points: Flat[], size = 0.45, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone });
const face = (list: Part[], d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => list.push({ kind: 'face', d, fill });
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
/** A plan in metres. */
const plan = (x0: number, y0: number, x1: number, y1: number, r = 0.06): Plan => ({ x: x0 * U, y: y0 * U, w: (x1 - x0) * U, d: (y1 - y0) * U, r: r * U });

/** The visible half of a ring round a part on any axis: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 48): string {
  const points = circleAround(centre, axis, radius, steps);
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  points.forEach((point, index) => {
    const normal: Point3 = [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
    if (dot3(normal, V) > 1e-9) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
    if (index === points.length - 1 && run.length) runs.push(run);
  });
  if (runs.length > 1) {
    const first = points[0]!;
    if (dot3([first[0] - centre[0], first[1] - centre[1], first[2] - centre[2]], V) > 1e-9) {
      const last = runs.pop()!;
      runs[0] = [...last, ...runs[0]!];
    }
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}
/** A closed ring on a round face. */
const faceRing = (centre: Point3, axis: Point3, radius: number, steps = 32) => pathOf(circleAround(centre, axis, radius, steps).map(at), true);
/** A closed outline in a vertical plane y = const, from (x, z) points in metres. */
const onWall = (points: ArmPoint[], y: number, closed = false) => pathOf(points.map(([x, z]) => at(w(x, y, z))), closed);
/** Points round a circle in a vertical plane y = const (metres). */
const wallCircle = (cx: number, cz: number, r: number, y: number, a0 = 0, a1 = Math.PI * 2, steps = 40): ArmPoint[] =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / steps;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as ArmPoint;
  });

// ------------------------------------------------------------------ the yard plate
{
  const list = PARTS;
  const feet: Plane[] = [
    [BASE.x + 16, BASE.y + 14],
    [BASE.x + BASE.w - 16, BASE.y + 14],
    [BASE.x + 16, BASE.y + BASE.d - 14],
    [BASE.x + BASE.w - 16, BASE.y + BASE.d - 14],
  ];
  feet.sort((a, b) => dot3([a[0], a[1], 0], V) - dot3([b[0], b[1], 0], V));
  for (const [x, y] of feet) {
    solid(list, cyl(x, y, 7.2, -BASE_H - 5, 1.6, 28, 0.3), 'lo');
    solid(list, cyl(x, y, 5, -BASE_H - 3.4, 3.4, 24), 'mid', { inner: sideArc(x, y, 5, -BASE_H - 1.6, P, 18) });
  }
  solid(list, slab(BASE, -BASE_H, BASE_H, 10, 1.2), 'lo', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 10) });
  line(list, planOutline(insetPlan(BASE, 5), BASE_TOP, P, 10), 'faint');
  for (const [x, y] of [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ] as Plane[]) {
    line(list, ring(x, y, 2.2, BASE_TOP, P, 16), 'lo');
    dots(list, [at([x, y, BASE_TOP])], 0.5, 'mid');
  }
  // The maker's plate at the front left corner, three printed rules and two screws.
  const label = plan(-2.7, 0.95, -1.5, 1.3, 0.04);
  solid(list, slab(label, BASE_TOP, 0.8, 3), 'lo');
  for (const [k, share] of [[0, 0.82], [1, 0.6], [2, 0.38]] as const) {
    const y = label.y + 1.9 + k * 1.75;
    line(list, lineOnTop([label.x + 4.2, y], [label.x + 4.2 + (label.w - 9) * share, y], BASE_TOP + 0.8, P), 'lo', true);
  }
  dots(list, [at([label.x + 1.9, label.y + label.d / 2, BASE_TOP + 0.8]), at([label.x + label.w - 1.9, label.y + label.d / 2, BASE_TOP + 0.8])], 0.42, 'mid');
}

// ------------------------------------------------------------------ the path board
{
  const list = PARTS;
  const yFace = BOARD_Y;
  const yBack = BOARD_Y - BOARD_T;
  // Two legs under the board and their foot plates.
  for (const x of [BOARD.x0 + 0.32, BOARD.x1 - 0.32]) {
    solid(list, slab(plan(x - 0.3, yBack - 0.28, x + 0.3, yFace + 0.18, 0.05), BASE_TOP, 0.7, 3, 0.3), 'lo');
    dots(list, [at(w(x - 0.2, yFace + 0.08, 0.035)), at(w(x + 0.2, yFace + 0.08, 0.035))], 0.42, 'mid');
    solid(list, slab(plan(x - 0.08, yBack + 0.01, x + 0.08, yFace - 0.01, 0.02), 0.7, (BOARD.z0 - 0.035) * U - 0.7, 2), 'mid');
  }
  // The board: a thick panel on its edge, its face toward the arm.
  const panel = plan(BOARD.x0, yBack, BOARD.x1, yFace, 0.03);
  solid(list, slab(panel, BOARD.z0 * U, (BOARD.z1 - BOARD.z0) * U, 3, 0.4), 'mid');
  // The sheet on the face, inset, with its edge and two clips at the top.
  const sheet = { x0: BOARD.x0 + 0.16, x1: BOARD.x1 - 0.16, z0: BOARD.z0 + 0.16, z1: BOARD.z1 - 0.16 };
  const corners: ArmPoint[] = [
    [sheet.x0, sheet.z0],
    [sheet.x1, sheet.z0],
    [sheet.x1, sheet.z1],
    [sheet.x0, sheet.z1],
  ];
  face(list, onWall(corners, yFace + 0.001, true), 'top');
  line(list, onWall(corners, yFace + 0.001, true), 'lo');
  // A faint half-metre grid on the sheet, edge to edge.
  for (let x = Math.ceil(sheet.x0 * 2) / 2; x < sheet.x1 - 0.05; x += 0.5) line(list, onWall([[x, sheet.z0], [x, sheet.z1]], yFace + 0.001), 'faint');
  for (let z = Math.ceil(sheet.z0 * 2) / 2; z < sheet.z1 - 0.05; z += 0.5) line(list, onWall([[sheet.x0, z], [sheet.x1, z]], yFace + 0.001), 'faint');
  // The path engraved on the sheet, from its start mark to its end mark.
  const engraved = Array.from({ length: 161 }, (_, k) => referenceAt(k / 160));
  const start = engraved[0]!;
  const end = engraved[engraved.length - 1]!;
  for (const [x, z] of [start, end]) line(list, onWall(wallCircle(x, z, 0.07, yFace + 0.002, 0, Math.PI * 2, 24), yFace + 0.002, true), 'mid');
  dots(list, [at(w(start[0], yFace + 0.002, start[1])), at(w(end[0], yFace + 0.002, end[1]))], 0.75, 'hi');
  // A ledge along the foot of the board.
  solid(list, slab(plan(BOARD.x0 + 0.1, yFace, BOARD.x1 - 0.1, yFace + 0.14, 0.02), (BOARD.z0 - 0.06) * U, 0.1 * U, 2, 0.2), 'mid');
  // Clips on the top edge, holding the sheet.
  for (const x of [sheet.x0 + 0.5, sheet.x1 - 0.5]) {
    solid(list, slab(plan(x - 0.2, yFace - 0.02, x + 0.2, yFace + 0.06, 0.02), (BOARD.z1 - 0.3) * U, 0.42 * U, 2, 0.2), 'hi');
    dots(list, [at(w(x, yFace + 0.06, BOARD.z1 - 0.12))], 0.5, 'mid');
  }
  list.push({ kind: 'slot', slot: 'board' });
}

// ------------------------------------------------------------------ the excavator
const TYRE_R = 0.5;
/** A leg from the chassis to a wheel, and the wheel: hub, tyre, rim. */
function legAndWheel(list: Part[], side: -1 | 1, front: boolean) {
  const hubX = front ? 2.05 : -2.3;
  const hubZ = TYRE_R;
  const rootX = front ? 0.72 : -0.95;
  const root = w(rootX, side * 0.5, 1.02);
  const knee = w(front ? 1.55 : -1.75, side * 1.0, 1.15);
  const hub = w(hubX, side * 1.02, hubZ + 0.18);
  const outward: Point3 = [0, side, 0];
  const upper = () => {
    // The leg's pivot boss on the chassis, the upper leg and its cylinder, then the lower leg down to the wheel's axle box.
    solid(list, discAlong(w(rootX, side * 0.55, 1.02), outward, 0.16 * U, 0.06 * U, P, 20), 'lo');
    solid(list, barBetween(root, knee, [0, 0, 1], 0.26 * U, 0.22 * U, P, 0.3), 'mid');
    solid(list, discAlong(w(front ? 1.55 : -1.75, side * 1.11, 1.15), outward, 0.1 * U, 0.04 * U, P, 16), 'lo');
    solid(list, barBetween(knee, hub, [0, 0, 1], 0.22 * U, 0.2 * U, P, 0.3), 'mid');
    const cylBase = w(rootX + (front ? 0.1 : -0.1), side * 0.55, 1.32);
    const cylEye = w(front ? 1.35 : -1.55, side * 0.92, 1.3);
    const dir: Point3 = [cylEye[0] - cylBase[0], cylEye[1] - cylBase[1], cylEye[2] - cylBase[2]];
    solid(list, discAlong(cylBase, dir, 0.07 * U, Math.hypot(...dir), P, 16), 'hi');
  };
  const axle = () => solid(list, discAlong(w(hubX, side * 0.98, hubZ), outward, 0.16 * U, 0.12 * U, P, 20), 'mid');
  const tyre = () => {
    solid(list, discAlong(w(hubX, side * 1.1, hubZ), outward, TYRE_R * U, 0.4 * U, P, 40), 'lo');
    // The sidewall facing the viewer, darker than the rim inside it.
    const capY = side > 0 ? 1.5 : 1.1;
    const centre = w(hubX, side * capY, hubZ);
    const sidewall = circleAround(centre, outward, (TYRE_R - 0.01) * U, 48).map(at);
    face(list, pathOf(sidewall, true), 0);
    line(list, pathOf(sidewall, true), 'lo');
    // Tread bars across the visible tread, rim to rim.
    const bars: string[] = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 2 + 0.05;
      const normal: Point3 = [Math.cos(a), 0, Math.sin(a)];
      if (dot3(normal, V) < 0.12) continue;
      const point = (y: number) => at(w(hubX + TYRE_R * Math.cos(a), y, hubZ + TYRE_R * Math.sin(a)));
      bars.push(pathOf([point(side * 1.1), point(side * 1.5)]));
    }
    line(list, bars.join(''), 'lo');
    if (side > 0) {
      face(list, faceRing(centre, outward, 0.32 * U, 40), 'top');
    }
  };
  const outer = w(hubX, side * 1.5, hubZ);
  // The far wheel is behind its leg, the near wheel in front of it.
  if (side < 0) {
    tyre();
    axle();
    upper();
    return;
  }
  upper();
  axle();
  tyre();
  {
    // The rim and hub on the outer face, with five wheel nuts.
    line(list, faceRing(outer, outward, 0.32 * U, 40), 'mid');
    solid(list, discAlong(outer, outward, 0.17 * U, 0.05 * U, P, 24), 'mid');
    dots(list, Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      return at(w(hubX + 0.25 * Math.cos(a), side * 1.5, hubZ + 0.25 * Math.sin(a)));
    }), 0.55, 'mid');
  }
}

{
  const list = PARTS;
  // The far legs and wheels first.
  legAndWheel(list, -1, false);
  legAndWheel(list, -1, true);
  // The chassis between the legs, with its seam.
  const chassis = plan(-1.15, -0.55, 0.95, 0.55, 0.08);
  solid(list, slab(chassis, 0.78 * U, 0.48 * U, 3, 0.5), 'mid', { inner: sideSeam(chassis, 1.02 * U, P, 3) });
  // The slew ring and its bolt circle.
  solid(list, cyl(0, 0, 0.74 * U, 1.26 * U, 0.12 * U, 48, 0.3), 'lo');
  dots(list, Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    return [a, at(w(0.64 * Math.cos(a), 0.64 * Math.sin(a), 1.38))] as const;
  }).filter(([a]) => Math.cos(a) * Math.cos((AZIMUTH * Math.PI) / 180) + Math.sin(a) * Math.sin((AZIMUTH * Math.PI) / 180) > -0.2).map(([, p]) => p), 0.42, 'mid');
  // The near legs and wheels.
  legAndWheel(list, 1, false);
  legAndWheel(list, 1, true);
  // The house on the slew ring: deck, counterweight, engine hood with its vents and stack.
  const house = plan(-1.5, -0.92, 0.8, 0.92, 0.12);
  solid(list, slab(house, 1.38 * U, 0.74 * U, 4, 0.6), 'mid', { inner: sideSeam(house, 1.62 * U, P, 4) });
  const weight = plan(-1.78, -0.92, -1.32, 0.92, 0.12);
  solid(list, slab(weight, 1.3 * U, 1.0 * U, 6, 0.6), 'lo', { inner: sideSeam(weight, 1.55 * U, P, 6) });
  const hood = plan(-1.3, -0.86, -0.15, -0.02, 0.1);
  solid(list, slab(hood, 2.12 * U, 0.4 * U, 4, 0.5), 'mid');
  for (let k = 0; k < 4; k++) {
    const x = -1.12 + k * 0.2;
    line(list, planOutline(plan(x, -0.7, x + 0.1, -0.18, 0.04), 2.52 * U, P, 3), 'lo');
  }
  solid(list, cyl(-0.32 * U, -0.62 * U, 0.07 * U, 2.52 * U, 0.42 * U, 16), 'mid');
  solid(list, cyl(-0.32 * U, -0.62 * U, 0.09 * U, 2.94 * U, 0.06 * U, 18), 'lo');
  // The boom's foot block and the boom cylinder's base lug on the house front.
  solid(list, slab(plan(0.72, ARM_Y - 0.3, 1.08, ARM_Y + 0.3, 0.04), 1.38 * U, 0.78 * U, 3, 0.4), 'mid');
  // The cab: frame, roof, the window recess on its side and front, the door seam and a roof beacon.
  const cab = plan(-1.12, 0.06, 0.28, 0.9, 0.08);
  solid(list, slab(cab, 2.12 * U, 1.38 * U, 3, 0.5), 'hi');
  const side: ArmPoint[] = [[-0.98, 2.4], [0.14, 2.4], [0.14, 3.32], [-0.98, 3.32]];
  face(list, onWall(side, 0.9 + 0.001, true), 2);
  line(list, onWall(side, 0.9 + 0.001, true), 'mid');
  line(list, onWall([[-0.42, 2.4], [-0.42, 3.32]], 0.9 + 0.001), 'lo');
  const frontWin = [w(0.28 + 0.001, 0.18, 2.42), w(0.28 + 0.001, 0.78, 2.42), w(0.28 + 0.001, 0.78, 3.3), w(0.28 + 0.001, 0.18, 3.3)];
  face(list, pathOf(frontWin.map(at), true), 1);
  line(list, pathOf(frontWin.map(at), true), 'mid');
  solid(list, slab(plan(-1.18, 0.0, 0.34, 0.96, 0.1), 3.5 * U, 0.1 * U, 4, 0.4), 'mid');
  // A battery box on the deck in front of the cab, with its lid seam and two screws.
  const battery = plan(0.36, 0.32, 0.72, 0.86, 0.04);
  solid(list, slab(battery, 2.12 * U, 0.24 * U, 3, 0.4), 'mid', { inner: sideSeam(battery, 2.28 * U, P, 3) });
  dots(list, [at(w(0.44, 0.6, 2.36)), at(w(0.64, 0.6, 2.36))], 0.45, 'mid');
  // The satellite antenna on its mast at the back of the roof.
  solid(list, cyl(-1.0 * U, 0.2 * U, 0.03 * U, 3.6 * U, 0.34 * U, 12), 'mid');
  solid(list, cyl(-1.0 * U, 0.2 * U, 0.1 * U, 3.94 * U, 0.06 * U, 22, 0.2), 'hi');
  solid(list, cyl(-0.8 * U, 0.48 * U, 0.06 * U, 3.6 * U, 0.12 * U, 16), 'lo');
  solid(list, cyl(-0.8 * U, 0.48 * U, 0.09 * U, 3.72 * U, 0.1 * U, 18, 0.2), 'hi');
  list.push({ kind: 'slot', slot: 'arm' });
}

// ------------------------------------------------------------------ the arm (rebuilt with every pose)
export interface ArmSolid {
  name: string;
  paths: SolidPaths;
  tone: Tone;
  lit?: boolean;
  inner?: string;
}

/** A slab in the arm's plane: a convex outline of (x, z) points in metres, from y0 to y1 across. */
function armPlate(outline: ArmPoint[], y0: number, y1: number, bevel = 0.3): SolidPaths {
  const ring = outline.map(([x, z]) => w(x, y0, z));
  return prismAlong(ring, [0, (y1 - y0) * U, 0], P, { bevel });
}

/** A hydraulic cylinder from its base pin to its rod eye: barrel, then the rod out of its gland. */
function cylinderParts(base: ArmPoint, eye: ArmPoint, barrel: number, radius: number, dy = 0): [SolidPaths, SolidPaths, string] {
  const a = inArm(base, dy);
  const b = inArm(eye, dy);
  const dir: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...dir);
  const u: Point3 = [dir[0] / length, dir[1] / length, dir[2] / length];
  const barrelLen = Math.min(barrel * U, length - 0.25 * U);
  const gland: Point3 = [a[0] + u[0] * barrelLen, a[1] + u[1] * barrelLen, a[2] + u[2] * barrelLen];
  const barrelPaths = discAlong(a, u, radius * U, barrelLen, P, 28, 0.2);
  const rodPaths = discAlong(gland, u, radius * 0.5 * U, length - barrelLen, P, 20);
  const seam = seamAround([a[0] + u[0] * barrelLen * 0.12, a[1] + u[1] * barrelLen * 0.12, a[2] + u[2] * barrelLen * 0.12], u, radius * U);
  return [barrelPaths, rodPaths, seam];
}

/** A pin across the arm at a joint: its near end cap with a face ring. */
function pinAt(point: ArmPoint, y: number, radius: number): [SolidPaths, string] {
  const from = w(point[0], y, point[1]);
  const axis: Point3 = [0, 1, 0];
  return [discAlong(from, axis, radius * U, 0.06 * U, P, 20), faceRing([from[0], from[1] + 0.06 * U, from[2]], axis, radius * 0.55 * U, 18)];
}

/** The stylus: a pin from the shovel's far side back to the board, where it touches. */
export const stylusContact = (tip: ArmPoint): Flat => at(w(tip[0], BOARD_Y + 0.002, tip[1]));

/** The boom's top and bottom edges as offsets from its centreline, a distance `along` from the foot (straight-line part). */
const footTopAt = (along: number) => 0.26 + ((KNEE_RISE + 0.3 - 0.26) * along) / (BOOM_LENGTH * KNEE_AT);
const footBottomAt = (along: number) => -0.26 + ((KNEE_RISE - 0.3 + 0.26) * along) / (BOOM_LENGTH * KNEE_AT);

/**
 * An ear that holds a cylinder's pin off a part's edge: from the pin to the part's surface, a little into it,
 * with the pin near its tip. `side` is +1 above the part (along its left normal) and -1 below it.
 */
function lugPlate(pinAt: ArmPoint, dir: ArmPoint, side: 1 | -1, origin: ArmPoint, axis: ArmPoint, edgeAt: (along: number) => number): SolidPaths {
  const n = perp(dir);
  const rel = sub2(pinAt, origin);
  const along = rel[0] * axis[0] + rel[1] * axis[1];
  const offset = rel[0] * perp(axis)[0] + rel[1] * perp(axis)[1];
  const reach = Math.abs(offset - edgeAt(along)) + 0.08;
  const s = side;
  const ear = Array.from({ length: 7 }, (_, k) => {
    const a = (k / 6) * Math.PI;
    return add2(pinAt, add2(mul2(dir, Math.cos(a) * 0.13), mul2(n, s * Math.sin(a) * 0.13)));
  });
  return armPlate([...ear, add2(add2(pinAt, mul2(dir, -0.3)), mul2(n, -s * reach)), add2(add2(pinAt, mul2(dir, 0.3)), mul2(n, -s * reach))], ARM_Y + 0.1, ARM_Y + 0.27, 0.2);
}

export function armParts(tip: ArmPoint): ArmSolid[] {
  const pose = poseFor(tip);
  const cyls = cylindersFor(pose);
  const out: ArmSolid[] = [];
  const put = (name: string, paths: SolidPaths, tone: Tone = 'hi', extra: { lit?: boolean; inner?: string } = {}) => out.push({ name, paths, tone, ...extra });
  const { boomDir, stickDir, boomTip, knee, pin, extension } = pose;
  const n1 = perp(boomDir);
  const n2 = perp(stickDir);
  const half = 0.23;

  // The stylus, behind the shovel, back to the board.
  put('stylus', discAlong(w(tip[0], ARM_Y - 0.3, tip[1]), [0, -1, 0], 0.035 * U, (ARM_Y - 0.3 - BOARD_Y - 0.002) * U, P, 12), 'mid');

  // The boom cylinder under the boom, from the house to the boom's belly.
  const [boomBarrel, boomRod, boomSeam] = cylinderParts(cyls.boom.base, cyls.boom.eye, cyls.boom.barrel, 0.11);
  put('boom-barrel', boomBarrel, 'hi', { inner: boomSeam });
  put('boom-rod', boomRod, 'hi');

  // The boom: two box sections welded at the knee, deepest at the knee and tapering to the tip.
  const foot = BOOM_FOOT;
  const headDir = unit2(sub2(boomTip, knee));
  const kneeAxis = unit2(add2(boomDir, headDir));
  const kneeN = perp(kneeAxis);
  const tipN = perp(headDir);
  const footArc = Array.from({ length: 7 }, (_, k) => {
    const a = Math.PI / 2 + (k / 6) * Math.PI;
    const d: ArmPoint = [Math.cos(a), Math.sin(a)];
    return add2(foot, add2(mul2(boomDir, d[0] * 0.26), mul2(n1, d[1] * 0.26)));
  });
  const kneeTop = add2(knee, mul2(kneeN, 0.3));
  const kneeBottom = add2(knee, mul2(kneeN, -0.3));
  const tipArc = Array.from({ length: 7 }, (_, k) => {
    const a = -Math.PI / 2 + (k / 6) * Math.PI;
    return add2(boomTip, add2(mul2(headDir, Math.cos(a) * 0.19), mul2(tipN, Math.sin(a) * 0.19)));
  });
  put('boom-root', armPlate([...footArc, kneeBottom, kneeTop], ARM_Y - half, ARM_Y + half), 'hi');
  put('boom-head', armPlate([kneeBottom, ...tipArc, kneeTop], ARM_Y - half, ARM_Y + half), 'hi', {
    inner: pathOf([inArm(kneeTop, half), inArm(kneeBottom, half)].map(at)),
  });
  // The lug under the boom that holds the boom cylinder's eye: an ear from the boom's belly round the pin.
  const eye = cyls.boom.eye;
  put('boom-lug', lugPlate(eye, boomDir, -1, BOOM_FOOT, boomDir, footBottomAt), 'mid');

  // The stick cylinder on top of the boom, from the knee lug to the stick's heel.
  const [stickBarrel, stickRod, stickSeam] = cylinderParts(cyls.stick.base, cyls.stick.eye, cyls.stick.barrel, 0.1);
  put('stick-barrel', stickBarrel, 'hi', { inner: stickSeam });
  put('stick-rod', stickRod, 'hi');
  // The bracket on top of the boom that holds the stick cylinder's base, its near cheek over the barrel's end.
  put('knee-lug', lugPlate(cyls.stick.base, boomDir, 1, BOOM_FOOT, boomDir, footTopAt), 'mid');

  // The stick: its heel behind the boom tip rises to the stick cylinder's eye; then it tapers to its end, and the telescope slides out of it.
  const heel = add2(boomTip, mul2(stickDir, -0.5));
  const stickEnd = add2(boomTip, mul2(stickDir, STICK_LENGTH));
  put('stick', armPlate([add2(heel, mul2(n2, 0.38)), add2(heel, mul2(n2, -0.14)), add2(stickEnd, mul2(n2, -0.13)), add2(stickEnd, mul2(n2, 0.14)), add2(boomTip, mul2(n2, 0.22))], ARM_Y - 0.17, ARM_Y + 0.17), 'hi');
  const telEnd = add2(stickEnd, mul2(stickDir, extension + 0.12));
  put('telescope', armPlate([add2(stickEnd, mul2(n2, 0.09)), add2(stickEnd, mul2(n2, -0.09)), add2(telEnd, mul2(n2, -0.09)), add2(telEnd, mul2(n2, 0.09))], ARM_Y - 0.11, ARM_Y + 0.11, 0.2), 'mid');
  // The stick's end collar, where the telescope slides out.
  put('stick-collar', armPlate([add2(stickEnd, add2(mul2(n2, 0.17), mul2(stickDir, -0.12))), add2(stickEnd, add2(mul2(n2, -0.16), mul2(stickDir, -0.12))), add2(stickEnd, mul2(n2, -0.16)), add2(stickEnd, mul2(n2, 0.17))], ARM_Y - 0.2, ARM_Y + 0.2, 0.2), 'mid');

  // The shovel cylinder along the stick's top, to the shovel's link.
  const [shovelBarrel, shovelRod, shovelSeam] = cylinderParts(cyls.shovel.base, cyls.shovel.eye, cyls.shovel.barrel, 0.075);
  put('shovel-barrel', shovelBarrel, 'hi', { inner: shovelSeam });
  put('shovel-rod', shovelRod, 'hi');

  // The coupler at the telescope's end and the shovel under it, held at one pitch.
  const coupler: ArmPoint[] = [add2(pin, [-0.2, 0.12]), add2(pin, [0.14, 0.12]), add2(pin, [0.2, -0.1]), add2(pin, [-0.16, -0.12])];
  put('coupler', armPlate(coupler, ARM_Y - 0.17, ARM_Y + 0.17, 0.2), 'lo');
  const back = Array.from({ length: 9 }, (_, k) => {
    const a = Math.PI * (0.98 + (k / 8) * 0.55);
    return add2(pin, [0.02 + 0.34 * Math.cos(a), -0.36 + 0.36 * Math.sin(a)]);
  });
  const bucket: ArmPoint[] = [add2(pin, [0.22, -0.02]), add2(pin, [-0.18, -0.02]), ...back, add2(pin, TIP_FROM_PIN), add2(pin, [0.34, -0.42])];
  put('shovel', armPlate(bucket, ARM_Y - 0.3, ARM_Y + 0.3, 0.3), 'hi');
  // Four teeth on the cutting edge.
  for (let k = 0; k < 4; k++) {
    const y = ARM_Y - 0.22 + k * 0.147;
    const edge = add2(pin, TIP_FROM_PIN);
    put(`tooth-${k}`, armPlate([add2(edge, [-0.05, 0.03]), add2(edge, [0.05, 0.05]), add2(edge, [0.07, -0.06]), add2(edge, [0.0, -0.07])], y - 0.035, y + 0.035, 0), 'mid');
  }

  // Pins across the joints, their near ends.
  const pins: Array<[string, ArmPoint, number, number]> = [
    ['pin-foot', foot, ARM_Y + half, 0.11],
    ['pin-boom-cyl-base', cyls.boom.base, ARM_Y + 0.3, 0.08],
    ['pin-boom-cyl-eye', cyls.boom.eye, ARM_Y + half, 0.07],
    ['pin-stick-cyl-base', cyls.stick.base, ARM_Y + half - 0.02, 0.07],
    ['pin-boom-tip', boomTip, ARM_Y + half - 0.02, 0.1],
    ['pin-heel', cyls.stick.eye, ARM_Y + 0.18, 0.065],
    ['pin-shovel-cyl-base', cyls.shovel.base, ARM_Y + 0.12, 0.055],
    ['pin-shovel', pin, ARM_Y + 0.3, 0.08],
    ['pin-shovel-cyl-eye', cyls.shovel.eye, ARM_Y + 0.3, 0.05],
  ];
  for (const [name, point, y, radius] of pins) {
    const [paths, ringD] = pinAt(point, y, radius);
    put(name, paths, 'mid', { inner: ringD });
  }

  return out;
}

// ------------------------------------------------------------------ the trainer console
const CONSOLE = plan(3.85, 0.62, 4.85, 1.12, 0.08);
const CONSOLE_TOP = 1.15;
export const DIAL = { x: 4.35, y: 1.12, z: 0.6, r: 0.42 };
/** The dial reads minutes from 0 to 150 over 270 degrees, starting at the lower left. */
export const DIAL_MAX = 150;
const DIAL_FROM = (225 * Math.PI) / 180;
const DIAL_SPAN = (270 * Math.PI) / 180;
/** The angle (in the dial's plane, counter-clockwise from +x) for a reading. */
export const dialAngle = (minutes: number) => DIAL_FROM - (Math.min(Math.max(minutes, 0), DIAL_MAX) / DIAL_MAX) * DIAL_SPAN;
const dialPoint = (minutes: number, r: number): Point3 => {
  const a = dialAngle(minutes);
  return w(DIAL.x + r * Math.cos(a), DIAL.y + 0.062, DIAL.z + r * Math.sin(a));
};

{
  const list = PARTS;
  solid(list, slab(CONSOLE, 0, CONSOLE_TOP * U, 4, 0.6), 'mid', { inner: sideSeam(CONSOLE, (CONSOLE_TOP - 0.12) * U, P, 4) });
  line(list, planOutline(insetPlan(CONSOLE, 2.4), CONSOLE_TOP * U, P, 4), 'faint');
  dots(list, [
    at(w(CONSOLE.x / U + 0.08, CONSOLE.y / U + 0.08, CONSOLE_TOP)),
    at(w((CONSOLE.x + CONSOLE.w) / U - 0.08, CONSOLE.y / U + 0.08, CONSOLE_TOP)),
    at(w(CONSOLE.x / U + 0.08, (CONSOLE.y + CONSOLE.d) / U - 0.08, CONSOLE_TOP)),
    at(w((CONSOLE.x + CONSOLE.w) / U - 0.08, (CONSOLE.y + CONSOLE.d) / U - 0.08, CONSOLE_TOP)),
  ], 0.45, 'mid');
  // Vents on the lid, closed slots.
  for (let k = 0; k < 4; k++) {
    const x = 4.05 + k * 0.17;
    line(list, planOutline(plan(x, 0.72, x + 0.08, 1.0, 0.035), CONSOLE_TOP * U, P, 3), 'lo');
  }
  // The dial on the front face: bezel, face, scale and the band where earlier controllers stood.
  const y = DIAL.y;
  solid(list, discAlong(w(DIAL.x, y, DIAL.z), [0, 1, 0], DIAL.r * U, 0.06 * U, P, 56, 0.4), 'mid');
  face(list, faceRing(w(DIAL.x, y + 0.061, DIAL.z), [0, 1, 0], (DIAL.r - 0.05) * U, 56), 'top');
  line(list, faceRing(w(DIAL.x, y + 0.061, DIAL.z), [0, 1, 0], (DIAL.r - 0.05) * U, 56), 'lo');
  const fy = y + 0.062;
  const band = (from: number, to: number, r0: number, r1: number): ArmPoint[] => {
    const outer = Array.from({ length: 25 }, (_, k) => {
      const a = dialAngle(from + ((to - from) * k) / 24);
      return [DIAL.x + r1 * Math.cos(a), DIAL.z + r1 * Math.sin(a)] as ArmPoint;
    });
    const inner = Array.from({ length: 25 }, (_, k) => {
      const a = dialAngle(to - ((to - from) * k) / 24);
      return [DIAL.x + r0 * Math.cos(a), DIAL.z + r0 * Math.sin(a)] as ArmPoint;
    });
    return [...outer, ...inner];
  };
  // The band at 100 to 150 minutes: the machine data earlier learned controllers were given.
  const earlier = band(EARLIER_MINUTES.from, EARLIER_MINUTES.to, DIAL.r - 0.2, DIAL.r - 0.09);
  face(list, onWall(earlier, fy, true), 1);
  line(list, onWall(earlier, fy, true), 'mid');
  // The scale arc and its ticks, every 10 minutes, long every 50.
  const arc = Array.from({ length: 61 }, (_, k) => {
    const a = dialAngle((DIAL_MAX * k) / 60);
    return [DIAL.x + (DIAL.r - 0.09) * Math.cos(a), DIAL.z + (DIAL.r - 0.09) * Math.sin(a)] as ArmPoint;
  });
  line(list, onWall(arc, fy), 'lo');
  for (let minutes = 0; minutes <= DIAL_MAX; minutes += 10) {
    const major = minutes % 50 === 0;
    line(list, pathOf([at(dialPoint(minutes, DIAL.r - 0.09)), at(dialPoint(minutes, DIAL.r - (major ? 0.2 : 0.15)))]), major ? 'mid' : 'lo');
  }
  list.push({ kind: 'slot', slot: 'needle' });
  // The hub over the needle's root.
  solid(list, discAlong(w(DIAL.x, fy, DIAL.z), [0, 1, 0], 0.04 * U, 0.03 * U, P, 16), 'mid');
  // A lamp beside the dial, lit while the models are refitted.
  solid(list, discAlong(w(4.7, y, 1.0), [0, 1, 0], 0.05 * U, 0.04 * U, P, 16), 'lo');
}

/** The needle at a reading: a line from just past the hub to just inside the scale. */
export const needleAt = (minutes: number): string => pathOf([at(dialPoint(minutes, 0.05)), at(dialPoint(minutes, DIAL.r - 0.11))]);

// ------------------------------------------------------------------ the board's live marks
/** The path engraved on the board, drawn heavier than the kit's hairlines (the live code draws it under the ink). */
export const ENGRAVED_D = onWall(Array.from({ length: 161 }, (_, k) => referenceAt(k / 160)), BOARD_Y + 0.002);

export interface BoardMarks {
  /** The ink, from the path's start to where the stylus is. */
  ink: string;
  /** The five guesses, each from the stylus to its end. */
  guesses: string[];
  /** The guesses' end points and the stylus' contact point. */
  ends: Flat[];
  contact: Flat;
}

export function boardMarks(practice: Practice, s: number): BoardMarks {
  const y = BOARD_Y + 0.003;
  const steps = Math.max(2, Math.round(s * 160));
  const inked = Array.from({ length: steps + 1 }, (_, k) => tracedAt(practice, (s * k) / steps));
  const guesses = s < 1 ? guessesAt(practice, s) : [];
  return {
    ink: s > 0 ? onWall(inked, y) : '',
    guesses: guesses.map((points) => onWall(points, y)),
    ends: guesses.map((points) => at(w(points[points.length - 1]![0], y, points[points.length - 1]![1]))),
    contact: at(w(inked[inked.length - 1]![0], y, inked[inked.length - 1]![1])),
  };
}

/** The pose shown before anyone touches the figure. */
export const STILL = { practice: practiceOf(STILL_PRACTICE), s: STILL_S };

export const rounded = r1;
