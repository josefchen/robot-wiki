/**
 * The turret plotter for DeltaFrame, drawn with the isometric kit.
 *
 * The object is the explanation. A flatbed plotter: a sheet of squared paper
 * clipped to a bench, a carriage riding a rail along the back of the bench
 * (driven by a lead screw and motor), and an arm of twin rods reaching from
 * it over the paper, with a pen carriage riding the rods. The rail and the
 * paper's squares are the table's frame. Under the carriage hangs a turret that turns the tool, a gripper
 * whose two fingers point along the tool's own x; the knob on the carriage
 * reads its angle on a ring of ticks. The pen sits on the turret's axis. A
 * demonstration recorded "5 cm forward" in the tool's frame and left its
 * stroke on the paper, along the fingers. A replay reads the same numbers
 * either in the tool's frame, and its ink, the one lit part, runs down the
 * stroke, or in the table's frame, and it runs along the rails, ending off the
 * stroke by the chord between the two: nothing when the tool is square to the
 * table, more the further it is turned. Between replays the pen is lifted and
 * the arm parks at the left end of its rail, beside the paper, so neither
 * stroke is hidden under the rods.
 *
 * Numbers: lib/delta-frame.ts. World units: UNIT per centimetre on the paper;
 * x runs along the rails, y across them toward the viewer, z up from the
 * bench top. Static parts are built once; the strokes and the bridge with its
 * carriage, turret and tool are rebuilt for each pose.
 */
import {
  cylinder as kitCylinder,
  depthOf,
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
import { circleAround, discAlong, prismAlong, viewOf } from '../prism.ts';
import { ANGLE_RANGE, DELTA_CM, PARK_CM, START_CM } from '../../../lib/delta-frame.ts';

export const WIDTH = 640;
export const AZIMUTH = 50;
export const ELEVATION = 42;

/** World units per centimetre on the paper. */
export const UNIT = 9;

// ------------------------------------------------------------------ layout
const RAD = Math.PI / 180;
const BASE: Plan = { x: -68, y: -62, w: 160, d: 108, r: 6 };
const BASE_H = 9;
const FOOT_H = 6;
/** The paper, centred on the origin: 11 by 8 squares of 1 cm. */
const PAPER: Plan = { x: -5.5 * UNIT, y: -4 * UNIT, w: 11 * UNIT, d: 8 * UNIT, r: 0.6 };
const PAPER_Z = 0.5;
/** The rail along x at the back, and the lead screw behind it. */
const BACK_RAIL: Plan = { x: -62, y: -50, w: 132, d: 7, r: 1 };
const RAIL_H = 6;
const SCREW = { y: -56, z: 6, r: 1.6, x0: -60, x1: 66 } as const;
/** The arm: a truck on the rail and two rods reaching forward over the paper, ROD_Z above the bench, ROD_DX either side of the pen's x, to an end cap. */
const ROD_Z = 21;
const ROD_DX = 4.4;
const ROD_R = 1.3;
const TRUCK = { half: 10, back: [-53, -39] } as const;
const END_CAP = [44, 48] as const;
/** The pen carriage on the rods, the turret under it and the knob on top. */
const CARRIAGE = { half: 9, depth: 7.5, z0: 17.5, z1: 24.5 } as const;
const TURRET = { housing: [14, 17.5], body: [9.6, 14], r: 6.2 } as const;
const FINGER = { length: 11, z0: 3.6, z1: 7.6, gap: 2.4 } as const;
/** How high the pen's tip lifts off the paper while it travels back to the start. */
const PEN_LIFT = 4;

/** A paper point in centimetres to world x and y. */
export const toWorld = ([x, y]: readonly [number, number]): Plane => [x * UNIT, y * UNIT];

// ------------------------------------------------------------------ camera
function extremes(): Point3[] {
  const points: Point3[] = [];
  for (const [x, y] of [
    [BASE.x, BASE.y],
    [BASE.x + BASE.w, BASE.y],
    [BASE.x, BASE.y + BASE.d],
    [BASE.x + BASE.w, BASE.y + BASE.d],
  ] as Plane[]) {
    points.push([x, y, -BASE_H - FOOT_H], [x, y, 0]);
  }
  // The bridge and its knob at both ends of the reach, and parked at the end of the rail.
  for (const x of [toWorld(PARK_CM)[0] - TRUCK.half - 1, toWorld(START_CM)[0] - CARRIAGE.half - 2, toWorld([START_CM[0] + DELTA_CM[0], 0])[0] + CARRIAGE.half + 2]) {
    points.push([x, TRUCK.back[0], ROD_Z + 10], [x, END_CAP[1], ROD_Z + 6]);
  }
  return points;
}
const EXTREMES = extremes();
const FIT_PAD = 6;
const unitP = fitProjection(EXTREMES, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatAll = EXTREMES.map((point) => iso(point, unitP));
const spanOf = (axis: 0 | 1) => Math.max(...flatAll.map((p) => p[axis])) - Math.min(...flatAll.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * spanOf(1)) / spanOf(0) + 2 * FIT_PAD);
export const P: Projection = fitProjection(EXTREMES, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const box = (x0: number, y0: number, x1: number, y1: number, r = 0.8): Plan => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const X: Point3 = [1, 0, 0];
const Y: Point3 = [0, 1, 0];
const facing = (normal: Point3) => normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2];

// ------------------------------------------------------------------ parts
export type Slot = 'demo' | 'ink' | 'bridge';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string; weight?: number }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; slot: Slot };
export type LivePart = Exclude<Part, { kind: 'slot' }>;

const seamPath = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');

/** The front half of a ring round a round part on any axis: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 40): string {
  const points = circleAround(centre, axis, radius, steps);
  const front = (p: Point3) => facing([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]]) > 0;
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  for (const point of points) {
    if (front(point)) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) {
    if (runs.length && front(points[0]!)) runs[0] = [...run, ...runs[0]!];
    else runs.push(run);
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}

const PARTS: Part[] = [];
const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', name?: string, weight?: number) => {
  if (d) list.push({ kind: 'line', d, tone, free, name, weight });
};
const dots = (list: Part[], points: Flat[], size = 0.45, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone });
function screw(list: Part[], x: number, y: number, z: number, r = 1.5) {
  line(list, ring(x, y, r, z, P, 14), 'lo');
  line(list, lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];

// The bench: a plate on four turned feet, with its edge seam, a groove, corner screws and the maker's plate.
{
  const list = PARTS;
  for (const [x, y] of byDepth(corners(BASE, 16))) {
    solid(list, cyl(x, y, 7, -BASE_H - FOOT_H, 1.6, 28, 0.3), 'lo');
    solid(list, cyl(x, y, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 24), 'mid', { inner: seamPath(sideArc(x, y, 5, -BASE_H - 3.4, P, 18)) });
  }
  solid(list, slab(BASE, -BASE_H, BASE_H, 8, 1.3), 'lo', { inner: seamPath(sideSeam(BASE, -BASE_H + 3, P, 8)) });
  line(list, planOutline(insetPlan(BASE, 4.5), 0, P, 8), 'faint');
  for (const [x, y] of corners(BASE, 9)) screw(list, x, y, 0, 1.9);
  const label = box(BASE.x + BASE.w - 40, BASE.y + BASE.d - 9, BASE.x + BASE.w - 14, BASE.y + BASE.d - 3, 1.2);
  solid(list, slab(label, 0, 0.8, 3), 'lo');
  line(list, planOutline(insetPlan(label, 1.2), 0.8, P, 3), 'faint');
  for (const [k, share] of [[0, 0.8], [1, 0.56], [2, 0.34]] as const) {
    const y = label.y + 1.6 + k * 1.4;
    line(list, lineOnTop([label.x + 4.4, y], [label.x + 4.4 + (label.w - 9) * share, y], 0.8, P), 'lo', true);
  }
  dots(list, [at([label.x + 2, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2, label.y + label.d / 2, 0.8])], 0.42, 'mid');
}

// The controller at the right: a case with a lid seam, vents as closed slots and a lamp.
const CONTROLLER: Plan = { x: 62, y: -8, w: 17, d: 24, r: 2 };
const CONTROLLER_H = 11;
{
  const list = PARTS;
  for (const [x, y] of byDepth(corners(CONTROLLER, 3.4))) solid(list, cyl(x, y, 1.8, 0, 1.2, 14), 'lo');
  solid(list, slab(CONTROLLER, 1.2, CONTROLLER_H, 3, 0.6), 'mid', { inner: seamPath(sideSeam(CONTROLLER, CONTROLLER_H - 2, P, 3)) });
  const top = 1.2 + CONTROLLER_H;
  const vents: string[] = [];
  for (let k = 0; k < 4; k++) vents.push(planOutline({ x: CONTROLLER.x + 3.5, y: CONTROLLER.y + 4 + k * 3.6, w: 11, d: 1.8, r: 0.9 }, top, P, 3));
  line(list, vents.join(''), 'lo');
  for (const [x, y] of corners(CONTROLLER, 2.2)) dots(list, [at([x, y, top])], 0.42, 'mid');
  solid(list, cyl(CONTROLLER.x + 9, CONTROLLER.y + CONTROLLER.d - 6, 2, top, 0.8, 18, 0.2), 'lo');
  dots(list, [at([CONTROLLER.x + 9, CONTROLLER.y + CONTROLLER.d - 6, top + 0.8])], 0.9, 'hi');
}

// The paper: a sheet clipped down at its corners, squared every centimetre (bolder every fifth), and the ring
// printed at the start.
{
  const list = PARTS;
  solid(list, slab(PAPER, 0, PAPER_Z, 2), 'hi', { crease: 'none' });
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = -5; k <= 5; k++) {
    const x = k * UNIT;
    (k % 5 === 0 ? major : minor).push(lineOnTop([x, PAPER.y], [x, PAPER.y + PAPER.d], PAPER_Z, P));
  }
  for (let k = -4; k <= 4; k++) {
    const y = k * UNIT;
    (k % 5 === 0 ? major : minor).push(lineOnTop([PAPER.x, y], [PAPER.x + PAPER.w, y], PAPER_Z, P));
  }
  line(list, minor.join(''), 'faint');
  line(list, major.join(''), 'lo');
  const [sx, sy] = toWorld(START_CM);
  line(list, ring(sx, sy, 3, PAPER_Z, P, 32), 'mid');
  dots(list, [at([sx, sy, PAPER_Z])], 1, 'hi');
  for (const [x, y] of corners(PAPER, 0)) {
    solid(list, slab(box(x - 3.5, y - 3.5, x + 3.5, y + 3.5, 0.8), PAPER_Z, 1.6, 2, 0.3), 'mid');
    dots(list, [at([x, y, PAPER_Z + 1.6])], 0.5, 'mid');
  }
}

PARTS.push({ kind: 'slot', slot: 'demo' });
PARTS.push({ kind: 'slot', slot: 'ink' });

// The back rail and the lead screw behind it, held in two bearing blocks, with its motor at the right end and the
// motor's lead to the controller.
{
  const list = PARTS;
  for (const x of [SCREW.x0, SCREW.x1]) {
    solid(list, slab(box(x - 3, SCREW.y - 3.4, x + 3, SCREW.y + 3.4, 0.6), 0, SCREW.z + 2.6, 2, 0.4), 'lo');
  }
  solid(list, discAlong([SCREW.x0 + 3, SCREW.y, SCREW.z], X, SCREW.r, SCREW.x1 - SCREW.x0 - 6, P, 18), 'hi', {
    inner: seamPath(
      Array.from({ length: Math.floor((SCREW.x1 - SCREW.x0 - 8) / 2.4) }, (_, k) => seamAround([SCREW.x0 + 4.5 + k * 2.4, SCREW.y, SCREW.z], X, SCREW.r)).join(''),
    ),
  });
  // The motor: flange, can with a seam and an end cap.
  solid(list, discAlong([SCREW.x1 + 3, SCREW.y, SCREW.z], X, 4.4, 1.4, P, 32, 0.2), 'lo');
  solid(list, discAlong([SCREW.x1 + 4.4, SCREW.y, SCREW.z], X, 4, 9, P, 32), 'mid', { inner: seamPath(seamAround([SCREW.x1 + 9, SCREW.y, SCREW.z], X, 4)) });
  solid(list, discAlong([SCREW.x1 + 13.4, SCREW.y, SCREW.z], X, 3, 1.2, P, 24, 0.2), 'lo');
  PARTS.push({
    kind: 'wire',
    from: at([SCREW.x1 + 14.6, SCREW.y, SCREW.z]),
    to: at([CONTROLLER.x + CONTROLLER.w, CONTROLLER.y + 6, 5]),
    via: [at([SCREW.x1 + 18, SCREW.y, SCREW.z]), at([SCREW.x1 + 18, SCREW.y, 0.4]), at([SCREW.x1 + 18, CONTROLLER.y + 6, 0.4]), at([SCREW.x1 + 18, CONTROLLER.y + 6, 5])],
    tone: 'lo',
  });
  solid(list, slab(BACK_RAIL, 0, RAIL_H, 3, 0.5), 'mid', { inner: seamPath(sideSeam(BACK_RAIL, RAIL_H - 1.6, P, 3)) });
  const screws: Flat[] = [];
  for (let x = BACK_RAIL.x + 6; x < BACK_RAIL.x + BACK_RAIL.w - 2; x += 14) screws.push(at([x, BACK_RAIL.y + BACK_RAIL.d / 2, RAIL_H]));
  dots(list, screws, 0.45, 'mid');
}

PARTS.push({ kind: 'slot', slot: 'bridge' });

export { PARTS };

// ------------------------------------------------------------------ the moving parts
/** A straight stroke on the paper from `from` to `to` (in centimetres). */
const strokeOn = (from: readonly [number, number], to: readonly [number, number]) => {
  const [ax, ay] = toWorld(from);
  const [bx, by] = toWorld(to);
  return lineOnTop([ax, ay], [bx, by], PAPER_Z + 0.05, P);
};

/** The demonstration's stroke: from the start along the tool turned `angle`, 5 cm, ending in a short cross mark. */
export function demoParts(angle: number): LivePart[] {
  const list: Part[] = [];
  const [dx] = DELTA_CM;
  const end: [number, number] = [START_CM[0] + dx * Math.cos(angle * RAD), START_CM[1] + dx * Math.sin(angle * RAD)];
  line(list, strokeOn(START_CM, end), 'mid', undefined, 'demo', 2.2);
  // The stroke ends in an inked dot, where the demonstration lifted its pen.
  const [ex, ey] = toWorld(end);
  dots(list, [at([ex, ey, PAPER_Z + 0.05])], 1.3, 'hi');
  return list as LivePart[];
}

/** The replay's ink, lit: from the start to where the pen has inked so far. */
export function inkParts(from: readonly [number, number], to: readonly [number, number], inked: number): LivePart[] {
  const list: Part[] = [];
  if (inked <= 0.001) return [];
  line(list, strokeOn(from, [from[0] + (to[0] - from[0]) * inked, from[1] + (to[1] - from[1]) * inked]), 'lit', undefined, 'ink', 2.4);
  // Once the move is made, the ink ends in a dot where the replay lifted its pen, as the demonstration's does.
  if (inked >= 0.999) {
    const [ex, ey] = toWorld(to);
    dots(list, [at([ex, ey, PAPER_Z + 0.05])], 1.3, 'hi');
  }
  return list as LivePart[];
}

/**
 * The arm at the pen's place `pen` (in centimetres), with the tool turned `angle` and the pen `lift` off the
 * paper: the truck on the back rail with its nut, the rods behind the pen carriage, the tool under the carriage
 * (pen, fingers, gripper, turret), the carriage with its angle ring and knob, the rods in front of it and their
 * end cap.
 */
export function bridgeParts(pen: readonly [number, number], angle: number, lift: number): LivePart[] {
  const list: Part[] = [];
  const [px, py] = toWorld(pen);
  const a = angle * RAD;
  const along: Plane = [Math.cos(a), Math.sin(a)];
  const across: Plane = [-Math.sin(a), Math.cos(a)];

  // The truck on the back rail: its nut on the lead screw, its body with a seam and the rods' sockets.
  const truck = box(px - TRUCK.half, TRUCK.back[0], px + TRUCK.half, TRUCK.back[1], 1);
  solid(list, slab(box(px - 4, SCREW.y - 3.2, px + 4, TRUCK.back[0] + 1, 0.6), SCREW.z - 3, 6, 2, 0.3), 'lo');
  solid(list, slab(truck, RAIL_H, ROD_Z + 6 - RAIL_H, 3, 0.5), 'mid', { inner: seamPath(sideSeam(truck, RAIL_H + 4, P, 3)) });
  for (const [x, y] of corners(truck, 2)) dots(list, [at([x, y, ROD_Z + 6])], 0.45, 'mid');
  for (const dx of [-ROD_DX, ROD_DX]) line(list, pathOf(circleAround([px + dx, TRUCK.back[1], ROD_Z], Y, ROD_R + 0.9, 20).map(at), true), 'faint');

  // The rods from the truck to the pen carriage.
  for (const dx of [-ROD_DX, ROD_DX]) solid(list, discAlong([px + dx, TRUCK.back[1], ROD_Z], Y, ROD_R, py - CARRIAGE.depth - TRUCK.back[1], P, 16), 'hi');

  // The pen: its tip on the paper (or lifted), its barrel up to the gripper.
  const tipZ = PAPER_Z + lift;
  solid(list, cyl(px, py, 0.7, tipZ, 1.8, 12), 'hi', { name: 'pen-tip' });
  solid(list, cyl(px, py, 1.4, tipZ + 1.8, FINGER.z0 + 1 - tipZ - 1.8, 16), 'hi', { name: 'pen' });

  // The gripper on the turret: two fingers along the tool's x, drawn far finger first, then the body across them.
  const fingers = [-1, 1]
    .map((side) => {
      const off = side * (FINGER.gap + 1);
      const base: Plane = [px + across[0] * off - along[0] * 2, py + across[1] * off - along[1] * 2];
      const tip: Plane = [base[0] + along[0] * FINGER.length, base[1] + along[1] * FINGER.length];
      const ringPts: Point3[] = [
        [base[0] - across[0] * 1, base[1] - across[1] * 1, FINGER.z0],
        [tip[0] - across[0] * 1, tip[1] - across[1] * 1, FINGER.z0],
        [tip[0] + across[0] * 1, tip[1] + across[1] * 1, FINGER.z0],
        [base[0] + across[0] * 1, base[1] + across[1] * 1, FINGER.z0],
      ];
      return { ringPts, depth: depthOf([base[0] + along[0] * 5, base[1] + along[1] * 5, FINGER.z0], P) };
    })
    .sort((m, n) => m.depth - n.depth);
  for (const finger of fingers) solid(list, prismAlong(finger.ringPts, [0, 0, FINGER.z1 - FINGER.z0], P, { bevel: 0.2 }), 'mid', { name: 'finger' });
  const body: Point3[] = [];
  for (const [u, v] of [[-5, -5.4], [3, -5.4], [3, 5.4], [-5, 5.4]] as const) body.push([px + along[0] * u + across[0] * v, py + along[1] * u + across[1] * v, FINGER.z1 - 0.6]);
  solid(list, prismAlong(body, [0, 0, TURRET.body[0] - FINGER.z1 + 0.6], P, { bevel: 0.3 }), 'mid', { name: 'gripper' });
  dots(list, [-3.6, 3.6].map((v) => at([px - along[0] * 3 + across[0] * v, py - along[1] * 3 + across[1] * v, TURRET.body[0]])), 0.45, 'mid');

  // The turret: the body that turns with the tool, and the housing it turns in.
  solid(list, cyl(px, py, TURRET.r, TURRET.body[0], TURRET.body[1] - TURRET.body[0], 36, 0.4), 'hi', { inner: seamPath(sideArc(px, py, TURRET.r, TURRET.body[0] + 2.4, P, 24)) });
  solid(list, cyl(px, py, TURRET.r - 1.6, TURRET.housing[0], TURRET.housing[1] - TURRET.housing[0], 32), 'mid');

  // The pen carriage on the rods: a block with a seam, corner screws, the ring of angle ticks on its top and the knob.
  const carriage = box(px - CARRIAGE.half, py - CARRIAGE.depth, px + CARRIAGE.half, py + CARRIAGE.depth, 1.2);
  solid(list, slab(carriage, CARRIAGE.z0, CARRIAGE.z1 - CARRIAGE.z0, 3, 0.5), 'mid', { inner: seamPath(sideSeam(carriage, CARRIAGE.z0 + 2.4, P, 3)) });
  for (const [x, y] of corners(carriage, 1.8)) dots(list, [at([x, y, CARRIAGE.z1])], 0.42, 'mid');
  {
    // The angle ring: ticks hanging inward from a printed circle.
    line(list, ring(px, py, 7, CARRIAGE.z1, P, 40), 'lo');
    const minor: string[] = [];
    const major: string[] = [];
    for (let deg = ANGLE_RANGE[0] - 30; deg <= ANGLE_RANGE[1] + 30; deg += 10) {
      const t = deg * RAD;
      const r0 = 7;
      const r1 = deg % 30 === 0 ? 5.2 : 6;
      const d = lineOnTop([px + r0 * Math.cos(t), py + r0 * Math.sin(t)], [px + r1 * Math.cos(t), py + r1 * Math.sin(t)], CARRIAGE.z1, P);
      (deg % 30 === 0 ? major : minor).push(d);
    }
    line(list, minor.join(''), 'lo');
    line(list, major.join(''), 'mid');
  }
  solid(list, cyl(px, py, 4, CARRIAGE.z1, 3.4, 32, 0.3), 'hi', { inner: `<path class="iso-line" data-tone="lo" d="${knurlLines(px, py, 4, CARRIAGE.z1 + 0.5, CARRIAGE.z1 + 2.9)}"/>` });
  line(list, lineOnTop([px - along[0] * 1.6, py - along[1] * 1.6], [px + along[0] * 3.6, py + along[1] * 3.6], CARRIAGE.z1 + 3.4, P), 'hi', 'end', 'knob-pointer', 1.2);
  dots(list, [at([px, py, CARRIAGE.z1 + 3.4])], 0.55, 'hi');

  // The rods in front of the carriage, and the end cap that ties them.
  for (const dx of [-ROD_DX, ROD_DX]) solid(list, discAlong([px + dx, py + CARRIAGE.depth, ROD_Z], Y, ROD_R, END_CAP[0] - py - CARRIAGE.depth, P, 16), 'hi');
  const cap = box(px - ROD_DX - 3.4, END_CAP[0], px + ROD_DX + 3.4, END_CAP[1], 1);
  solid(list, slab(cap, ROD_Z - 3.4, 6.8, 3, 0.4), 'mid');
  dots(list, [at([px - ROD_DX, END_CAP[1], ROD_Z]), at([px + ROD_DX, END_CAP[1], ROD_Z])], 0.5, 'mid');
  return list as LivePart[];
}

/** Knurl lines on a vertical knob's side that faces the viewer. */
function knurlLines(cx: number, cy: number, r: number, z0: number, z1: number) {
  const lines: string[] = [];
  for (let k = 0; k < 36; k++) {
    const t = (k / 36) * Math.PI * 2;
    if (facing([Math.cos(t), Math.sin(t), 0]) < 0.2) continue;
    lines.push(pathOf([at([cx + r * Math.cos(t), cy + r * Math.sin(t), z0]), at([cx + r * Math.cos(t), cy + r * Math.sin(t), z1])]));
  }
  return lines.join('');
}

/** The pose a drawing takes: the tool's angle, the pen's place and lift, and the replay's ink from the start. */
export type PlotterPose = { angle: number; pen: [number, number]; lift: number; inkTo: [number, number]; inked: number };

/** Every moving part for a pose, by slot. */
export function movingAt(pose: PlotterPose): Record<Slot, LivePart[]> {
  return {
    demo: demoParts(pose.angle),
    ink: inkParts(START_CM, pose.inkTo, pose.inked),
    bridge: bridgeParts(pose.pen, pose.angle, pose.lift),
  };
}

export const PEN_LIFT_UNITS = PEN_LIFT;

/** The arm's footprint across the rail, in world units: for checking that the parked arm stays on its rail and off the strokes. */
export const ARM_SPAN = {
  truckHalf: TRUCK.half,
  carriageHalf: CARRIAGE.half,
  turretR: TURRET.r,
  toolReach: Math.hypot(FINGER.length - 2, FINGER.gap + 2),
  rodDx: ROD_DX + ROD_R,
  rail: [BACK_RAIL.x, BACK_RAIL.x + BACK_RAIL.w] as const,
  paperLeft: PAPER.x,
  startRing: 3,
} as const;
