/**
 * The contact-error test bench for ContactGeometry, drawn with the isometric kit.
 *
 * The object is the explanation: one error, two fixtures on one bench. The
 * error is how far a simulated surface sits from the real one.
 *
 * One knob at the front sets the error. Its shaft runs along the bench to a
 * right-angle gearbox at each fixture, so the same turn drives both.
 *
 * At the left, a four-legged robot stands with its hind feet on a deck, the
 * floor as the simulator modelled it, and its front feet on a lift plate, the
 * real floor, which a screw jack lowers by the error. The robot's front legs
 * reach down to the plate, as a gait's feedback does on its next step, until
 * the drop passes the 20 mm the legs can take up: then the front feet find
 * nothing and the robot pitches forward onto the plate. A ruler on the deck's
 * front reads the drop against the plate's pointer, its 20 mm mark longest.
 *
 * At the right, a gripper on a column lowers a peg, the one lit part, where
 * the simulator says the hole is, and a cross-slide's lead screw moves the
 * hole block by the same error. The real hole leaves 0.5 mm of clearance round the peg, so
 * past that shift the peg comes down on the rim instead of into the hole. A
 * ruler on the slide reads the shift, its 0.5 mm mark longest.
 *
 * Both are drawn larger than real, each at its own scale: the floor's drop
 * at FLOOR_UNITS world units a millimetre, the hole's shift at HOLE_UNITS,
 * which stops at four clearances (2 mm): past that the hole is off the peg
 * altogether and the exact shift carries nothing more.
 *
 * World units are about 1 px of the drawing: x along the bench (the robot
 * faces +x), y toward the viewer, z up from the bench top. Static paths are
 * built once here; the moving parts are slots the component fills with
 * `movingAt(pose)` for each frame.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  onTop,
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
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, circleAround, discAlong, plateIn, prismAlong, viewOf } from '../prism.ts';
import { steadySolid } from '../steady-path.ts';
import { MAX_ERROR_MM, SCENARIOS } from '../../../lib/contact-geometry.ts';

export const WIDTH = 640;
export const AZIMUTH = 52;

// ---------------------------------------------------------------- the model's scales
/** The legs' tolerance and the hole's clearance, millimetres, from the model. */
export const LEG_LIMIT_MM = SCENARIOS.locomotion.toleranceMm;
export const CLEARANCE_MM = SCENARIOS.manipulation.toleranceMm;
/** World units per millimetre of floor drop, and of hole shift. */
export const FLOOR_UNITS = 0.55;
export const HOLE_UNITS = 6;
/** The drawn hole shift stops growing here: four clearances, the peg wholly on the rim. */
export const SHIFT_STOP_MM = 4 * CLEARANCE_MM;

/** The floor drop and the hole shift a given error draws, world units. */
export const dropAt = (errorMm: number) => Math.max(0, Math.min(errorMm, MAX_ERROR_MM)) * FLOOR_UNITS;
export const shiftAt = (errorMm: number) => Math.max(0, Math.min(errorMm, SHIFT_STOP_MM)) * HOLE_UNITS;

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -170, y: -40, w: 218, d: 82, r: 7 };
const BASE_H = 8;
const FOOT_H = 5;

/** The deck: the floor the simulator modelled; the robot's hind feet stand on it. */
export const DECK_TOP = 44;
const DECK: Plan = { x: -158, y: -24, w: 56, d: 48, r: 2 };
/** The lift plate: the real floor, lowered by the error; the robot's front feet come down on it. */
const PLATE: Plan = { x: -100, y: -24, w: 58, d: 48, r: 2 };
const PLATE_H = 5;
/** The jack under the plate. */
const JACK: Plan = { x: -79, y: -8, w: 16, d: 16, r: 1.6 };
const JACK_H = 10;
const NUT_H = 3;
/**
 * The drive: one knob on a line shaft along the bench's front, a right-angle gearbox at each end, and a cross shaft
 * from each gearbox back to its fixture: the jack's gearbox at the left, the cross-slide's at the right.
 */
const DRIVE = { y: 33.4, z: 8.4, r: 1.6, x0: -71, x1: 38.5 };
const ANGLE_BOX = { d: 9, w: 9, h: 13.4 };
const KNOB_AT = { x0: -62, sleeve: 7, thimble: 12, r: 7.2 };
const PILLOWS = [-36, -4, 24];
/** The guide post behind the plate, which the plate's bushing rides. */
const GUIDE = { x: -71, y: -31, r: 2.4 };
/** The drop ruler on the deck's front face, beside the step. */
const DROP_RULER = { x0: -111, x1: -104.5, y: DECK.y + DECK.d, z0: DECK_TOP - MAX_ERROR_MM * FLOOR_UNITS - 3, z1: DECK_TOP + 1, t: 1.2 };

/** The robot: hind hips over the deck, front hips over the plate. */
const ROBOT = { x: -100, hindX: -123, frontX: -77, legY: 15.5 };
export const FOOT_R = 2.8;
/** How far a foot's centre sits below its hip, standing on the deck. */
const STAND = 32;
/** Each leg's two links: standing plus the reach the legs can take up, split equally. */
export const THIGH = (STAND + LEG_LIMIT_MM * FLOOR_UNITS) / 2;
export const SHIN = THIGH;
export const HIP_Z = DECK_TOP + FOOT_R + STAND;
/** The body box in the robot's frame (x from the body's middle, z from the hips). */
const BODY = { x0: -29, x1: 29, half: 7.5, z0: -4.5, z1: 6 };

/** The peg station. */
const HOLE = { x: -8, y: 4 };
const RAIL: Plan = { x: -38, y: -18, w: 72, d: 48, r: 1.5 };
const RAIL_H = 5;
const BLOCK: Plan = { x: HOLE.x - 15, y: HOLE.y - 15, w: 30, d: 30, r: 1.6 };
/** The hole block's top: where the peg lands when it misses. */
export const BLOCK_TOP = RAIL_H + 13;
export const PEG_R = 6;
export const HOLE_R = PEG_R + CLEARANCE_MM * HOLE_UNITS;
const HOLE_DEPTH = 13;
const SHIFT_RULER: Plan = { x: HOLE.x - 4 - 4 * CLEARANCE_MM * HOLE_UNITS, y: BLOCK.y + BLOCK.d + 1.6, w: 4 * CLEARANCE_MM * HOLE_UNITS + 8, d: 5, r: 0.8 };
const BRACKET: Plan = { x: 24, y: HOLE.y - 7, w: 6, d: 14, r: 1 };
const SCREW_Z = RAIL_H + 6;
/** The cross-slide's gearbox, past the rail's end, that turns the lead screw from the cross shaft. */
const SLIDE_BOX: Plan = { x: 34.2, y: HOLE.y - 6.5, w: 9, d: 13, r: 1.2 };
const COLUMN = { x: HOLE.x, y: -30, r: 4.6, z0: 3, z1: 74 };
const LABEL: Plan = { x: -160, y: 28, w: 40, d: 9.6, r: 2 };

/** The peg's tip heights: lifted clear, sitting in the hole, and resting on the rim. */
export const TIP_LIFTED = BLOCK_TOP + 7;
export const TIP_IN = BLOCK_TOP - 10;
export const TIP_ON_RIM = BLOCK_TOP;
/** The carriage is built for a tip at TIP0 and moved from there. */
const TIP0 = TIP_IN;

// ---------------------------------------------------------------- camera
/** The drawing's true extremes: the base's rounded rim and feet, the robot's handle and head, the column's cap. */
const ringAt = (plan: Plan, z: number): Point3[] => {
  const out: Point3[] = [];
  const r = plan.r;
  for (const [cx, cy, a0] of [[plan.x + plan.w - r, plan.y + r, -90], [plan.x + plan.w - r, plan.y + plan.d - r, 0], [plan.x + r, plan.y + plan.d - r, 90], [plan.x + r, plan.y + r, 180]] as const) {
    for (let k = 0; k <= 6; k++) {
      const a = ((a0 + (k / 6) * 90) * Math.PI) / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    }
  }
  return out;
};
const extremes: Point3[] = [...ringAt(BASE, -BASE_H), ...ringAt(BASE, 0)];
for (const [x, y] of [[BASE.x + 20, BASE.y + BASE.d - 20], [BASE.x + BASE.w - 20, BASE.y + BASE.d - 20], [BASE.x + BASE.w - 20, BASE.y + 20]]) {
  for (let k = 0; k < 16; k++) extremes.push([x! + 7 * Math.cos((k / 16) * Math.PI * 2), y! + 7 * Math.sin((k / 16) * Math.PI * 2), -BASE_H - FOOT_H]);
}
for (const x of [ROBOT.x + BODY.x0 + 12, ROBOT.x + BODY.x1 - 12]) for (const y of [-1.4, 1.4]) extremes.push([x, y, HIP_Z + BODY.z1 + 6.4]);
for (const x of [ROBOT.x + BODY.x0, ROBOT.x + BODY.x1]) for (const y of [-BODY.half, BODY.half]) extremes.push([x, y, HIP_Z + BODY.z1]);
for (let k = 0; k < 16; k++) extremes.push([COLUMN.x + (COLUMN.r + 1.2) * Math.cos((k / 16) * Math.PI * 2), COLUMN.y + (COLUMN.r + 1.2) * Math.sin((k / 16) * Math.PI * 2), COLUMN.z1 + 2.4]);
const FIT_PAD = 8;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH });

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const seam = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const X: Point3 = [1, 0, 0];
const Y: Point3 = [0, 1, 0];
const Z: Point3 = [0, 0, 1];

/** Knurl lines on the visible side of a round part along any axis, turned by `phase` radians. */
export function knurlAlong(from: Point3, axis: Point3, r: number, length: number, count: number, phase = 0): string {
  const helper: Point3 = Math.abs(axis[2]) < 0.9 ? Z : X;
  const cross = (p: Point3, q: Point3): Point3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const u0 = cross(axis, helper);
  const u = mul(u0, 1 / Math.hypot(...u0));
  const v = cross(axis, u);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const angle = phase + (i / count) * Math.PI * 2;
    const n = add(mul(u, Math.cos(angle)), mul(v, Math.sin(angle)));
    if (dot3(n, V) < 0.18) continue;
    const p0 = add(from, mul(n, r));
    // Each line runs the knob's whole width, so it ends on the rims at both faces.
    out.push(pathOf([at(add(p0, mul(axis, 0.02))), at(add(p0, mul(axis, length - 0.02)))]));
  }
  return out.join('');
}

/** The front half of a ring round a round part on any axis: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 40): string {
  const points = circleAround(centre, axis, radius, steps);
  const facing = (p: Point3) => (p[0] - centre[0]) * V[0] + (p[1] - centre[1]) * V[1] + (p[2] - centre[2]) * V[2] > 0;
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  for (const point of points) {
    if (facing(point)) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) {
    if (runs.length && facing(points[0]!)) runs[0] = [...run, ...runs[0]!];
    else runs.push(run);
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}

// ---------------------------------------------------------------- parts
export type Slot = 'jack' | 'plate' | 'wheel' | 'robot' | 'block' | 'leadscrew' | 'knob' | 'carriage' | 'peg';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 0 | 1 | 2 | 3 | 'paper' | 'top' | 'void' }
  | { kind: 'slot'; slot: Slot };
export type BenchPart = Exclude<Part, { kind: 'slot' }>;

const list: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths: steadySolid(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points: points.map(at), size, tone });
const slot = (name: Slot) => list.push({ kind: 'slot', slot: name });

// The base: a plate on four turned feet, with an edge seam, a groove and corner screws.
for (const [x, y] of byDepth(corners(BASE, 20))) {
  solid(cyl(x, y, 7, -BASE_H - FOOT_H, 1.4), 'lo');
  solid(cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.4, FOOT_H - 1.4), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BASE, -BASE_H + 2.6, P, 8)) });
line(planOutline(insetPlan(BASE, 4.5), 0, P), 'faint');
line(corners(BASE, 9).map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
dots(corners(BASE, 9).map(([x, y]) => [x, y, 0] as Point3), 0.5);

// The peg station's column at the back: a flange with its bolts, the column and its cap.
solid(cyl(COLUMN.x, COLUMN.y, 9, 0, COLUMN.z0, 32, 0.5), 'mid');
dots(
  [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return [COLUMN.x + 7 * Math.cos(a), COLUMN.y + 7 * Math.sin(a), COLUMN.z0] as Point3;
  }),
  0.45,
);
solid(cyl(COLUMN.x, COLUMN.y, COLUMN.r, COLUMN.z0, COLUMN.z1 - COLUMN.z0, 28), 'mid', { inner: seam(sideArc(COLUMN.x, COLUMN.y, COLUMN.r, COLUMN.z0 + 6, P, 16)) });
solid(cyl(COLUMN.x, COLUMN.y, COLUMN.r + 1.2, COLUMN.z1, 2.4, 28, 0.4), 'mid');

// The plate's guide post behind it: a foot flange, the post and its cap.
solid(cyl(GUIDE.x, GUIDE.y, 4.6, 0, 2, 24, 0.4), 'mid');
solid(cyl(GUIDE.x, GUIDE.y, GUIDE.r, 2, DECK_TOP + 2, 20), 'mid');
solid(cyl(GUIDE.x, GUIDE.y, GUIDE.r + 0.8, DECK_TOP + 4, 1.4, 20, 0.3), 'mid');

// The deck: a top plate on four posts tied by rails, open underneath, with its ribbed mat and top screws.
const DECK_T = 5;
{
  const posts = byDepth(corners(DECK, 4.5));
  const railZ = 13;
  const [backLeft, backRight, frontLeft, frontRight] = [
    [DECK.x + 4.5, DECK.y + 4.5],
    [DECK.x + DECK.w - 4.5, DECK.y + 4.5],
    [DECK.x + 4.5, DECK.y + DECK.d - 4.5],
    [DECK.x + DECK.w - 4.5, DECK.y + DECK.d - 4.5],
  ] as Plane[];
  const rail = (a: Plane, b: Plane, across: Point3) =>
    solid(barBetween([a[0], a[1], railZ], [b[0], b[1], railZ], across, 2.6, 3.2, P, 0.2), 'mid');
  const at2 = (a: Plane, b: Plane) => a[0] === b[0] && a[1] === b[1];
  for (const post of posts) {
    // Each rail goes in just before the nearer of the two posts it joins, which hides its end.
    if (at2(post, backRight!)) rail(backLeft!, backRight!, Y);
    if (at2(post, frontLeft!)) rail(backLeft!, frontLeft!, X);
    if (at2(post, frontRight!)) {
      rail(backRight!, frontRight!, X);
      rail(frontLeft!, frontRight!, Y);
    }
    const [x, y] = post;
    solid(cyl(x, y, 3.8, 0, 1.4, 24, 0.3), 'mid');
    solid(cyl(x, y, 2.4, 1.4, DECK_TOP - DECK_T - 1.4, 20), 'mid', { inner: seam(sideArc(x, y, 2.4, railZ + 6, P, 12)) });
  }
  solid(slab(DECK, DECK_TOP - DECK_T, DECK_T, 3, 0.8), 'mid', { inner: seam(sideSeam(DECK, DECK_TOP - DECK_T + 1.8, P, 3)) });
  const mat = insetPlan(DECK, 4);
  solid(slab(mat, DECK_TOP, 0.8, 3), 'lo', { crease: 'none' });
  const ribs: string[] = [];
  for (let x = mat.x + 5; x < mat.x + mat.w - 3; x += 5) ribs.push(planOutline({ x: x - 0.6, y: mat.y + 3, w: 1.2, d: mat.d - 6, r: 0.6 }, DECK_TOP + 0.8, P, 2));
  line(ribs.join(''), 'faint');
  dots(corners(DECK, 2).map(([x, y]) => [x, y, DECK_TOP] as Point3), 0.45);
  // The drop ruler hangs from the top plate's front edge and is held off the front post by a standoff at its foot.
  const post = frontRight!;
  solid(slab({ x: post[0] - 1.2, y: post[1] + 2.2, w: 2.4, d: DROP_RULER.y - post[1] - 2.2, r: 0.3 }, DROP_RULER.z0 + 1, 2.4, 1), 'mid');
}
{
  const r = DROP_RULER;
  solid(plateIn([r.x0, r.y, r.z0], X, Z, [[0, 0], [r.x1 - r.x0, 0], [r.x1 - r.x0, r.z1 - r.z0], [0, r.z1 - r.z0]], -r.t, P, 0.3), 'lo');
  const face = r.y + r.t;
  const minor: string[] = [];
  const major: string[] = [];
  let limit = '';
  for (let mm = 0; mm <= MAX_ERROR_MM + 1e-9; mm += 2.5) {
    const z = DECK_TOP - mm * FLOOR_UNITS;
    // Every 10 mm and the legs' limit run across the ruler, edge to edge; the others hang from its right edge.
    const across = mm % 10 === 0 || mm === LEG_LIMIT_MM;
    const long = across ? r.x1 - r.x0 : mm % 5 === 0 ? 2.4 : 1.5;
    const d = pathOf([at([r.x1, face, z]), at([r.x1 - long, face, z])]);
    if (mm === LEG_LIMIT_MM) limit = d;
    else if (mm % 10 === 0) major.push(d);
    else minor.push(d);
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  line(limit, 'hi');
  dots([[r.x0 + 1.6, face, r.z1 - 1.4], [r.x0 + 1.6, face, r.z0 + 1.4]], 0.4);
}

// The jack under the plate: a gearbox on the base with its screw, then the plate itself.
solid(slab(JACK, 0, JACK_H, 3, 0.5), 'mid', { inner: seam(sideSeam(JACK, JACK_H - 3, P, 3)) });
dots(corners(JACK, 2.4).map(([x, y]) => [x, y, JACK_H] as Point3), 0.42);
slot('jack');
slot('plate');
// The handwheel on its shaft out of the gearbox's front.
slot('wheel');

// The label plate at the front of the deck.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 7, LABEL.y + 2.6 + row * 2.2], [LABEL.x + (row === 1 ? 24 : 32), LABEL.y + 2.6 + row * 2.2]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8]], 0.45);

// The peg station's cross-slide: its rail, the shift ruler at the front, the hole block, its lead screw, bracket and knob.
solid(slab(RAIL, 0, RAIL_H, 3, 0.6), 'mid', { inner: seam(sideSeam(RAIL, 2, P, 3)) });
line(planOutline({ x: RAIL.x + 3, y: HOLE.y - 1.4, w: RAIL.w - 6, d: 2.8, r: 1.2 }, RAIL_H, P, 2), 'faint');
dots([[RAIL.x + 3, RAIL.y + 3, RAIL_H], [RAIL.x + 3, RAIL.y + RAIL.d - 3, RAIL_H], [RAIL.x + RAIL.w - 3, RAIL.y + 3, RAIL_H], [RAIL.x + RAIL.w - 3, RAIL.y + RAIL.d - 3, RAIL_H]], 0.45);
solid(slab(SHIFT_RULER, RAIL_H, 0.8, 2), 'lo');
{
  const minor: string[] = [];
  const major: string[] = [];
  let limit = '';
  const edge = SHIFT_RULER.y;
  for (let k = 0; k <= 4; k++) {
    const x = HOLE.x - k * CLEARANCE_MM * HOLE_UNITS;
    // The clearance and the two ends run across the ruler, edge to edge; the others hang from its back edge.
    const long = k === 1 || k === 0 || k === 4 ? SHIFT_RULER.d : 1.8;
    const d = lineOnTop([x, edge], [x, edge + long], RAIL_H + 0.8, P);
    if (k === 1) limit = d;
    else if (k === 0 || k === 4) major.push(d);
    else minor.push(d);
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  line(limit, 'hi');
}
slot('block');
slot('leadscrew');
solid(slab(BRACKET, RAIL_H, SCREW_Z - RAIL_H + 6, 2, 0.4), 'mid');
dots([[BRACKET.x + BRACKET.w / 2, BRACKET.y + 2.2, SCREW_Z + 6], [BRACKET.x + BRACKET.w / 2, BRACKET.y + BRACKET.d - 2.2, SCREW_Z + 6]], 0.42);
// The cross-slide's gearbox past the rail's end, its bolts, and the boss the lead screw's coupling enters.
solid(slab(SLIDE_BOX, 0, SCREW_Z + 5, 3, 0.5), 'mid', { inner: seam(sideSeam(SLIDE_BOX, 3, P, 3)) });
dots(corners(SLIDE_BOX, 2).map(([x, y]) => [x, y, SCREW_Z + 5] as Point3), 0.42);
slot('knob');

// The drive. The cross shafts run from the fixtures' gearboxes to the angle boxes at the bench's front; the line shaft
// joins the two angle boxes, on three pillow blocks, with the one knob on it that sets the error for both.
{
  const z = DRIVE.z;
  const jackX = JACK.x + JACK.w / 2;
  const slideX = DRIVE.x1;
  const boxY = DRIVE.y - ANGLE_BOX.d / 2;
  // The cross shafts: the jack's under the plate, the slide's beside the rail's end.
  solid(discAlong([jackX, JACK.y + JACK.d, z], Y, 2.6, 1.2, P, 20, 0.2), 'mid');
  solid(discAlong([jackX, JACK.y + JACK.d + 1.2, z], Y, DRIVE.r, boxY - JACK.y - JACK.d - 1.2, P, 16), 'mid');
  solid(discAlong([slideX, SLIDE_BOX.y + SLIDE_BOX.d, z], Y, 2.6, 1.2, P, 20, 0.2), 'mid');
  solid(discAlong([slideX, SLIDE_BOX.y + SLIDE_BOX.d + 1.2, z], Y, DRIVE.r, boxY - SLIDE_BOX.y - SLIDE_BOX.d - 1.2, P, 16), 'mid');
  // The angle boxes, each with its bolts and the bosses its shafts enter.
  for (const x of [jackX, slideX]) {
    const plan: Plan = { x: x - ANGLE_BOX.w / 2, y: boxY, w: ANGLE_BOX.w, d: ANGLE_BOX.d, r: 1.2 };
    solid(slab(plan, 0, ANGLE_BOX.h, 3, 0.5), 'mid', { inner: seam(sideSeam(plan, 3, P, 3)) });
    dots(corners(plan, 1.8).map(([px, py]) => [px, py, ANGLE_BOX.h] as Point3), 0.42);
  }
  const x0 = jackX + ANGLE_BOX.w / 2;
  const x1 = slideX - ANGLE_BOX.w / 2;
  solid(discAlong([x0, DRIVE.y, z], X, 2.6, 1.2, P, 20, 0.2), 'mid');
  solid(discAlong([x1 - 1.2, DRIVE.y, z], X, 2.6, 1.2, P, 20, 0.2), 'mid');
  // The line shaft, broken by the pillow blocks that carry it and by the knob's sleeve.
  const stops = [x0 + 1.2, ...PILLOWS.flatMap((px) => [px - 2.6, px + 2.6]), x1 - 1.2].sort((a, b) => a - b);
  const knobSpan: [number, number] = [KNOB_AT.x0, KNOB_AT.x0 + KNOB_AT.sleeve + KNOB_AT.thimble];
  for (let k = 0; k < stops.length; k += 2) {
    const a = stops[k]!;
    const b = stops[k + 1]!;
    // Skip the stretch the knob covers.
    const pieces: Array<[number, number]> = a < knobSpan[0] && b > knobSpan[1] ? [[a, knobSpan[0]], [knobSpan[1], b]] : [[a, b]];
    for (const [pa, pb] of pieces) if (pb - pa > 0.2) solid(discAlong([pa, DRIVE.y, z], X, DRIVE.r, pb - pa, P, 16), 'mid');
  }
  for (const px of PILLOWS) {
    const plan: Plan = { x: px - 2.6, y: DRIVE.y - 2.8, w: 5.2, d: 5.6, r: 0.8 };
    solid(slab(plan, 0, z + 2.6, 2, 0.4), 'mid', { inner: seam(sideSeam(plan, 1.6, P, 2)) });
    dots([[px - 1.6, DRIVE.y + 1.6, z + 2.6], [px + 1.6, DRIVE.y + 1.6, z + 2.6]], 0.4);
  }
  // The knob's sleeve, fixed on a pedestal, with the index line the knob is read against.
  const sleeve: Plan = { x: KNOB_AT.x0, y: DRIVE.y - 3.4, w: KNOB_AT.sleeve, d: 6.8, r: 0.8 };
  solid(slab({ ...sleeve, x: sleeve.x + 0.6, w: sleeve.w - 1.2 }, 0, z - 2.4, 2, 0.3), 'mid');
  solid(discAlong([KNOB_AT.x0, DRIVE.y, z], X, 3.8, KNOB_AT.sleeve, P, 28, 0.3), 'mid');
  line(pathOf([at([KNOB_AT.x0 + 0.4, DRIVE.y, z + 3.8]), at([KNOB_AT.x0 + KNOB_AT.sleeve - 0.02, DRIVE.y, z + 3.8])]), 'hi');
}

// The robot, then the gripper's carriage on the column and the peg it holds.
slot('robot');
slot('carriage');
slot('peg');

export const PARTS: readonly Part[] = list;

// ---------------------------------------------------------------- the robot
export interface BenchPose {
  /** The floor's drop and the hole's shift, world units. */
  drop: number;
  shift: number;
  /** The peg's tip, z. */
  tip: number;
  /** How far the robot has fallen, 0 standing to 1 down on the plate. */
  fall: number;
}

/** The robot's frame: pitched forward by `pitch` radians about the line through its hind feet. */
function robotFrame(pitch: number) {
  const pivot: Point3 = [ROBOT.hindX, 0, DECK_TOP];
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  // A point in the robot's own frame (x from the body's middle, z from the hips) to the world.
  const point = ([x, y, z]: Point3): Point3 => {
    const local: Point3 = [ROBOT.x + x - pivot[0], y, HIP_Z + z - pivot[2]];
    return [pivot[0] + local[0] * c + local[2] * s, y, pivot[2] - local[0] * s + local[2] * c];
  };
  const axis = ([x, y, z]: Point3): Point3 => [x * c + z * s, y, -x * s + z * c];
  return { point, axis };
}
type Frame = ReturnType<typeof robotFrame>;

/** A box in the robot's frame, as a prism: plan corners at z0, swept up h. */
function frameBox(f: Frame, x0: number, x1: number, y0: number, y1: number, z0: number, h: number, bevel = 0.5): SolidPaths {
  const ring = frameRing(x0, x1, y0, y1).map(([x, y]) => f.point([x, y, z0]));
  return prismAlong(ring, f.axis([0, 0, h]), P, { round: true, bevel });
}

/** A box's rounded plan in the robot's frame, as frameBox draws it: corner arcs of radius r. */
function frameRing(x0: number, x1: number, y0: number, y1: number): Array<[number, number]> {
  const r = Math.min(2.4, (x1 - x0) / 4, (y1 - y0) / 4);
  const ring: Array<[number, number]> = [];
  const cornersAt: Array<[number, number, number]> = [
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
  ];
  for (const [cx, cy, start] of cornersAt) for (let k = 0; k <= 3; k++) {
    const a = start + (k / 3) * (Math.PI / 2);
    ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return ring;
}

/** The seam round a box in the robot's frame at height z: the run of its rounded sides that face the viewer, end to end on its silhouette. */
function frameSeam(f: Frame, x0: number, x1: number, y0: number, y1: number, z: number): string {
  const ring = frameRing(x0, x1, y0, y1);
  const n = ring.length;
  const facing = ring.map(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % n]!;
    // The ring runs counterclockwise seen from above, so the outward normal is (dy, -dx).
    const normal: Point3 = [by - ay, -(bx - ax), 0];
    return dot3(f.axis(normal), V) > 1e-9;
  });
  const start = facing.findIndex((v) => !v);
  if (start < 0) return '';
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (facing[i]) {
      if (!run.length) run.push(at(f.point([ring[i]![0], ring[i]![1], z])));
      const next = ring[(i + 1) % n]!;
      run.push(at(f.point([next[0], next[1], z])));
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.map((points) => pathOf(points)).join('');
}

/**
 * The knee for a hip and a foot in the robot's frame: two equal links. The front knees bend back toward the tail and
 * the hind knees forward toward the head, the X of a walking robot's legs.
 */
function kneeOf(hip: Point3, foot: Point3, forward = false): Point3 {
  const dx = foot[0] - hip[0];
  const dz = foot[2] - hip[2];
  const reach = Math.min(Math.hypot(dx, dz), THIGH + SHIN - 0.001);
  const toward = Math.atan2(dz, dx);
  const bend = Math.acos(Math.max(-1, Math.min(1, reach / (2 * THIGH))));
  const angle = forward ? toward + bend : toward - bend;
  return [hip[0] + THIGH * Math.cos(angle), hip[1], hip[2] + THIGH * Math.sin(angle)];
}

/** Where the front feet sit in the robot's frame: reaching for the plate, or tucked under as it falls. */
function frontFootLocal(drop: number, fall: number): Point3 {
  const reachZ = -Math.min(HIP_Z - (DECK_TOP - drop + FOOT_R), THIGH + SHIN - 0.001);
  // Buckled: the front feet drawn back under the body, the knees giving way.
  const tucked: Point3 = [ROBOT.frontX - ROBOT.x - 8, 0, -(STAND - 7)];
  const reaching: Point3 = [ROBOT.frontX - ROBOT.x, 0, reachZ];
  return [reaching[0] + (tucked[0] - reaching[0]) * fall, 0, reaching[2] + (tucked[2] - reaching[2]) * fall];
}

/** The lowest point of the robot's front, in the world, at a pitch: the front knees, feet and the head's chin. */
function frontLow(pitch: number, foot: Point3): number {
  const f = robotFrame(pitch);
  const hip: Point3 = [ROBOT.frontX - ROBOT.x, 0, 0];
  const knee = kneeOf(hip, foot);
  return Math.min(f.point(knee)[2] - 3.4, f.point(foot)[2] - FOOT_R, f.point([BODY.x1 + 8, 0, BODY.z0 + 1])[2]);
}

/** The pitch at which the fallen robot's front comes to rest on the plate. */
export function restingPitch(drop: number): number {
  const plateTop = DECK_TOP - drop;
  const foot = frontFootLocal(drop, 1);
  let lo = 0;
  let hi = (70 * Math.PI) / 180;
  if (frontLow(0, foot) <= plateTop) return 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (frontLow(mid, foot) > plateTop) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The robot at a pose, in painter's order: the far legs and hip motors, the body, the near motors and legs. */
function robotParts(drop: number, fall: number, failed: boolean): BenchPart[] {
  const pitch = fall > 0 ? restingPitch(drop) * fall : 0;
  const f = robotFrame(pitch);
  const front = frontFootLocal(drop, fall);
  const parts: BenchPart[] = [];
  const plateTop = DECK_TOP - drop;
  const footOf = (frontLeg: boolean, side: number): Point3 => {
    const hx = (frontLeg ? ROBOT.frontX : ROBOT.hindX) - ROBOT.x;
    return frontLeg ? [front[0], side * ROBOT.legY, front[2]] : [hx, side * ROBOT.legY, -STAND];
  };
  // A foot stands when it is on its floor; the legs' full reach stops a hair (0.001) short, so allow a hundredth.
  const plantedOf = (frontLeg: boolean, side: number) => !failed && (frontLeg ? f.point(footOf(frontLeg, side))[2] <= plateTop + FOOT_R + 0.01 : true);
  // Where a foot stands, a contact patch on the floor under it; a foot that found nothing leaves none.
  for (const side of [-1, 1]) {
    for (const frontLeg of [false, true]) {
      const [x, y] = f.point(footOf(frontLeg, side));
      const floor = (frontLeg ? plateTop : DECK_TOP) + 0.8;
      parts.push({ kind: 'face', d: plantedOf(frontLeg, side) ? pathOf(circleAround([x, y, floor], Z, FOOT_R + 1.2, 28).map(at), true) : '', fill: 1 });
    }
  }
  const leg = (frontLeg: boolean, side: number): BenchPart[] => {
    const y = side * ROBOT.legY;
    const hx = (frontLeg ? ROBOT.frontX : ROBOT.hindX) - ROBOT.x;
    const hip: Point3 = [hx, y, 0];
    const foot = footOf(frontLeg, side);
    const knee = kneeOf(hip, foot, !frontLeg);
    const across: Point3 = [0, side, 0];
    const planted = plantedOf(frontLeg, side);
    const name = `foot-${frontLeg ? 'front' : 'hind'}-${side > 0 ? 'near' : 'far'}`;
    const ball = f.point([foot[0], y, foot[2]]);
    return [
      { kind: 'solid', paths: barBetween(f.point(knee), f.point([foot[0], y, foot[2] + 1.8]), across, 2.4, 3, P, 0.2), tone: 'mid' },
      { kind: 'solid', paths: barBetween(f.point(hip), f.point(knee), across, 3.2, 4.4, P, 0.3), tone: 'mid' },
      { kind: 'solid', paths: discAlong(f.point([knee[0], y - side * 1.8, knee[2]]), across, 2.5, 3.6, P, 24, 0.3), tone: 'mid' },
      // The foot: a rubber ball, drawn round from any side.
      { kind: 'solid', paths: discAlong(add(ball, mul(V, -1.2)), V, FOOT_R, 2.4, P, 28, 0.6), tone: planted ? 'hi' : 'lo', name },
    ];
  };
  const motor = (frontLeg: boolean, side: number): BenchPart => {
    const hx = (frontLeg ? ROBOT.frontX : ROBOT.hindX) - ROBOT.x;
    return { kind: 'solid', paths: discAlong(f.point([hx, side * BODY.half, 0]), [0, side, 0], 4.4, ROBOT.legY - BODY.half - 1.6, P, 32, 0.4), tone: 'mid' };
  };
  for (const frontLeg of [false, true]) parts.push(...leg(frontLeg, -1));
  for (const frontLeg of [false, true]) parts.push(motor(frontLeg, -1));
  // The body: the shell with its seam, the hatch and its screws, the carry handle, the head with its lens and the sensor puck.
  const b = BODY;
  parts.push({ kind: 'solid', paths: frameBox(f, b.x0, b.x1, -b.half, b.half, b.z0, b.z1 - b.z0, 0.8), tone: 'hi', inner: seam(frameSeam(f, b.x0, b.x1, -b.half, b.half, b.z0 + 4.6)) });
  const up = f.axis(Z);
  if (dot3(up, V) > 0.05) {
    const h = { x0: b.x0 + 5, x1: b.x1 - 5, y0: -b.half + 4, y1: b.half - 4 };
    parts.push({ kind: 'line', d: pathOf([[h.x0, h.y0], [h.x1, h.y0], [h.x1, h.y1], [h.x0, h.y1]].map(([x, y]) => at(f.point([x, y, b.z1]))), true), tone: 'faint' });
    parts.push({ kind: 'dots', points: [[h.x0 + 2, h.y0 + 2], [h.x1 - 2, h.y0 + 2], [h.x0 + 2, h.y1 - 2], [h.x1 - 2, h.y1 - 2]].map(([x, y]) => at(f.point([x, y, b.z1]))), size: 0.42, tone: 'mid' });
  }
  for (const x of [b.x0 + 15, b.x1 - 15]) parts.push({ kind: 'solid', paths: discAlong(f.point([x, 0, b.z1]), up, 1.5, 5, P, 16), tone: 'mid' });
  parts.push({ kind: 'solid', paths: barBetween(f.point([b.x0 + 13.5, 0, b.z1 + 5]), f.point([b.x1 - 13.5, 0, b.z1 + 5]), Y, 2.8, 2.8, P, 0.2), tone: 'mid' });
  parts.push({ kind: 'solid', paths: frameBox(f, b.x1, b.x1 + 9, -6.5, 6.5, b.z0 + 1, 10, 0.5), tone: 'mid', inner: seam(frameSeam(f, b.x1, b.x1 + 9, -6.5, 6.5, b.z0 + 4)) });
  // The head's two cameras, side by side on its face.
  for (const ly of [-3.2, 3.2]) {
    parts.push({ kind: 'solid', paths: discAlong(f.point([b.x1 + 9, ly, b.z0 + 6.6]), f.axis(X), 2.2, 1.4, P, 24, 0.3), tone: 'mid' });
    parts.push({ kind: 'dots', points: [at(f.point([b.x1 + 10.4, ly, b.z0 + 6.6]))], size: 0.55, tone: 'hi' });
  }
  parts.push({ kind: 'solid', paths: discAlong(f.point([b.x1 + 4.5, 0, b.z0 + 11]), up, 3.2, 2.4, P, 28, 0.3), tone: 'mid' });
  for (const frontLeg of [false, true]) parts.push(motor(frontLeg, 1));
  for (const frontLeg of [false, true]) parts.push(...leg(frontLeg, 1));
  return parts;
}

// ---------------------------------------------------------------- the other moving parts
/** The lift plate at a drop: its nut boss, the plate with its seam, the guide tongue, the mat and the pointer over the drop ruler. */
function plateParts(drop: number): BenchPart[] {
  const top = DECK_TOP - drop;
  const parts: BenchPart[] = [];
  const cx = JACK.x + JACK.w / 2;
  const cy = JACK.y + JACK.d / 2;
  parts.push({ kind: 'solid', paths: cyl(cx, cy, 4.2, top - PLATE_H - NUT_H, NUT_H, 24, 0.3), tone: 'mid' });
  // The bushing that rides the guide post, on a web from the plate's back edge.
  parts.push({ kind: 'solid', paths: slab({ x: GUIDE.x - 2, y: GUIDE.y + 2, w: 4, d: PLATE.y - GUIDE.y - 2, r: 0.4 }, top - PLATE_H, PLATE_H - 1, 1), tone: 'mid' });
  parts.push({ kind: 'solid', paths: cyl(GUIDE.x, GUIDE.y, 4.2, top - PLATE_H - 1.5, PLATE_H + 0.5, 24, 0.4), tone: 'mid', inner: seam(sideArc(GUIDE.x, GUIDE.y, 4.2, top - PLATE_H + 1.4, P, 16)) });
  parts.push({ kind: 'solid', paths: slab(PLATE, top - PLATE_H, PLATE_H, 3, 0.6), tone: 'mid', inner: seam(sideSeam(PLATE, top - PLATE_H + 1.8, P, 3)) });
  const mat = insetPlan(PLATE, 4);
  parts.push({ kind: 'solid', paths: slab(mat, top, 0.8, 3), tone: 'lo', crease: 'none' });
  const ribs: string[] = [];
  for (let x = mat.x + 5; x < mat.x + mat.w - 3; x += 5) ribs.push(planOutline({ x: x - 0.6, y: mat.y + 3, w: 1.2, d: mat.d - 6, r: 0.6 }, top + 0.8, P, 2));
  parts.push({ kind: 'line', d: ribs.join(''), tone: 'faint' });
  parts.push({ kind: 'dots', points: corners(PLATE, 2).map(([x, y]) => at([x, y, top])), size: 0.45, tone: 'mid' });
  // The pointer: a tab out of the plate's front, then a blade along the deck's front to the ruler, its top edge at the plate's top.
  const ry = DROP_RULER.y + DROP_RULER.t;
  parts.push({ kind: 'solid', paths: slab({ x: PLATE.x, y: PLATE.y + PLATE.d, w: 3.4, d: ry + 0.6 - (PLATE.y + PLATE.d), r: 0.3 }, top - 1.6, 1.6, 1), tone: 'mid' });
  const blade = PLATE.x - DROP_RULER.x1 + 2.4;
  parts.push({ kind: 'solid', paths: plateIn([DROP_RULER.x1 - 2.4, ry, top - 1.6], X, Z, [[0, 0], [blade, 0], [blade, 1.6], [0, 1.6]], -0.6, P, 0.2), tone: 'hi' });
  return parts;
}

/** The jack's screw, from the gearbox up into the plate's nut, its threads every 1.4 units. */
function jackParts(drop: number): BenchPart[] {
  const top = DECK_TOP - drop - PLATE_H - NUT_H;
  const cx = JACK.x + JACK.w / 2;
  const cy = JACK.y + JACK.d / 2;
  const threads: string[] = [];
  for (let z = JACK_H + 1.8; z < top - 0.6; z += 1.4) threads.push(sideArc(cx, cy, 2.2, z, P, 12));
  return [
    { kind: 'solid', paths: cyl(cx, cy, 3.6, JACK_H, 1.2, 24, 0.3), tone: 'mid' },
    { kind: 'solid', paths: cyl(cx, cy, 2.2, JACK_H + 1.2, Math.max(0.2, top - JACK_H - 1.2), 20), tone: 'mid', inner: seam(threads.join('')) },
  ];
}

/**
 * The knob that sets the error: a thimble on the line shaft, knurled at its end and graduated round its skirt, turned
 * once for every 5 mm. The same turn reaches the jack through the left angle box and the lead screw through the right.
 */
function wheelParts(drop: number): BenchPart[] {
  const errorMm = drop / FLOOR_UNITS;
  const turn = (errorMm / 5) * Math.PI * 2;
  const from: Point3 = [KNOB_AT.x0 + KNOB_AT.sleeve, DRIVE.y, DRIVE.z];
  const skirt = KNOB_AT.thimble - 4;
  const graduations: string[] = [];
  const majors: string[] = [];
  // Ten graduations round the skirt, half a millimetre each; the whole millimetres longer. They hang from the edge
  // beside the sleeve, where its index line reads them.
  for (let k = 0; k < 10; k++) {
    const a = turn + (k / 10) * Math.PI * 2;
    const n: Point3 = [0, Math.cos(a), Math.sin(a)];
    if (dot3(n, V) < 0.2) continue;
    const r = KNOB_AT.r - 1.2;
    const p = (x: number): Point3 => [x, DRIVE.y + r * n[1], DRIVE.z + r * n[2]];
    const long = k % 2 === 0;
    (long ? majors : graduations).push(pathOf([at(p(from[0] + 0.02)), at(p(from[0] + (long ? 3.4 : 2)))]));
  }
  return [
    { kind: 'solid', paths: discAlong(from, X, KNOB_AT.r - 1.2, skirt, P, 40, 0.3), tone: 'hi', name: 'error-knob' },
    { kind: 'line', d: graduations.join(''), tone: 'lo' },
    { kind: 'line', d: majors.join(''), tone: 'mid' },
    { kind: 'solid', paths: discAlong(add(from, [skirt, 0, 0]), X, KNOB_AT.r, 4, P, 48, 0.4), tone: 'mid', inner: seam(knurlAlong(add(from, [skirt, 0, 0]), X, KNOB_AT.r, 4, 40, turn)) },
    { kind: 'dots', points: [at(add(from, [KNOB_AT.thimble, 0, 0]))], size: 0.6, tone: 'mid' },
  ];
}

/** The hole block at a shift, built where it stands: the block, its bore, chamfer, screws and the pointer over the ruler. */
function blockParts(shift: number): BenchPart[] {
  const plan: Plan = { ...BLOCK, x: BLOCK.x - shift };
  const hx = HOLE.x - shift;
  const parts: BenchPart[] = [];
  parts.push({ kind: 'solid', paths: slab(plan, RAIL_H, BLOCK_TOP - RAIL_H, 3, 0.8), tone: 'mid', inner: seam(sideSeam(plan, RAIL_H + 4, P, 3)) });
  // The bore: the mouth's dark void, its far wall, the mouth's edge and the chamfer ring round it.
  const mouth = circleAround([hx, HOLE.y, BLOCK_TOP], Z, HOLE_R, 64).map(at);
  const facing = Math.atan2(V[1], V[0]);
  const far: Flat[] = [];
  const deep: Flat[] = [];
  const lip: Flat[] = [];
  // The far wall shows as a crescent at the back of the mouth: the far half of the mouth over the far half of a
  // ring a little way down the bore, taken in from the sides so it stays inside the mouth.
  for (let k = 0; k <= 32; k++) {
    const a = facing + Math.PI / 2 + (k / 32) * Math.PI;
    const inset = Math.sin((k / 32) * Math.PI);
    far.push(at([hx + HOLE_R * Math.cos(a), HOLE.y + HOLE_R * Math.sin(a), BLOCK_TOP]));
    deep.push(at([hx + HOLE_R * Math.cos(a), HOLE.y + HOLE_R * Math.sin(a), BLOCK_TOP - HOLE_DEPTH * 0.3 * inset]));
    lip.push(at([hx + (HOLE_R + 1.4) * Math.cos(a), HOLE.y + (HOLE_R + 1.4) * Math.sin(a), BLOCK_TOP]));
  }
  parts.push({ kind: 'face', d: pathOf(mouth, true), fill: 'void' });
  parts.push({ kind: 'face', d: pathOf([...far, ...deep.reverse()], true), fill: 2 });
  parts.push({ kind: 'face', d: pathOf(lip.reverse().concat(far), true), fill: 3 });
  parts.push({ kind: 'line', d: pathOf(mouth, true), tone: 'mid' });
  parts.push({ kind: 'line', d: ring(hx, HOLE.y, HOLE_R + 1.4, BLOCK_TOP, P, 48), tone: 'faint' });
  parts.push({ kind: 'dots', points: corners(plan, 3.4).map(([x, y]) => at([x, y, BLOCK_TOP])), size: 0.5, tone: 'mid' });
  // The pointer: a tab down the block's front face to the ruler, with its hairline at the hole's centre.
  const fy = plan.y + plan.d;
  parts.push({ kind: 'solid', paths: slab({ x: hx - 1.6, y: fy, w: 3.2, d: SHIFT_RULER.y + 3.6 - fy, r: 0.4 }, RAIL_H + 1.4, 0.8, 1), tone: 'hi' });
  parts.push({ kind: 'line', d: lineOnTop([hx, fy + 0.4], [hx, SHIFT_RULER.y + 3.6], RAIL_H + 2.2, P), tone: 'hi' });
  parts.push({ kind: 'solid', paths: slab({ x: hx - 1.6, y: fy, w: 3.2, d: 1.2, r: 0.3 }, RAIL_H + 1.4, 4, 1), tone: 'mid' });
  return parts;
}

/** The cross-slide's lead screw, from the block's +x face into the bracket. */
function leadscrewParts(shift: number): BenchPart[] {
  const x0 = BLOCK.x + BLOCK.w - shift;
  const threads: string[] = [];
  for (let x = x0 + 2; x < BRACKET.x - 0.6; x += 1.4) threads.push(seamAround([x, HOLE.y, SCREW_Z], X, 1.8, 96));
  return [
    { kind: 'solid', paths: discAlong([x0, HOLE.y, SCREW_Z], X, 3.2, 1.2, P, 24, 0.2), tone: 'mid' },
    { kind: 'solid', paths: discAlong([x0 + 1.2, HOLE.y, SCREW_Z], X, 1.8, Math.max(0.2, BRACKET.x - x0 - 1.2), P, 20), tone: 'mid', inner: seam(threads.join('')) },
  ];
}

/** The coupling from the lead screw's end, through the bracket, into the slide's gearbox, turned with the shift. */
function knobParts(shift: number): BenchPart[] {
  const turn = (shift / HOLE_UNITS / CLEARANCE_MM) * Math.PI * 2;
  const c: Point3 = [BRACKET.x + BRACKET.w, HOLE.y, SCREW_Z];
  const length = SLIDE_BOX.x - c[0];
  const mark: Point3 = [0, Math.cos(turn), Math.sin(turn)];
  const r = 2.6;
  const parts: BenchPart[] = [
    { kind: 'solid', paths: discAlong(c, X, r, length, P, 28, 0.3), tone: 'mid', inner: seam(seamAround(add(c, [length / 2, 0, 0]), X, r, 40)) },
  ];
  // The coupling's set screw turns with it; it shows while it faces the viewer.
  if (dot3(mark, V) > 0.15) parts.push({ kind: 'dots', points: [at(add(add(c, [length / 4, 0, 0]), mul(mark, r)))], size: 0.5, tone: 'mid' });
  else parts.push({ kind: 'dots', points: [], size: 0.5, tone: 'mid' });
  return parts;
}

/** The carriage on the column, its arm and the gripper's body, for a peg tip at `tip`. */
function carriageParts(tip: number): BenchPart[] {
  const dz = tip - TIP0;
  const parts: BenchPart[] = [];
  const carriage: Plan = { x: COLUMN.x - 7, y: COLUMN.y - 8, w: 14, d: 16, r: 1.6 };
  const cz = TIP0 + 26 + dz;
  parts.push({ kind: 'solid', paths: slab(carriage, cz, 14, 3, 0.6), tone: 'mid', inner: seam(sideSeam(carriage, cz + 3, P, 3)) });
  parts.push({ kind: 'line', d: ring(COLUMN.x, COLUMN.y, COLUMN.r, cz + 14, P, 32), tone: 'lo' });
  // The clamp knob on the carriage's +x face.
  parts.push({ kind: 'solid', paths: discAlong([carriage.x + carriage.w, COLUMN.y, cz + 9], X, 1.4, 1.8, P, 16), tone: 'mid' });
  parts.push({ kind: 'solid', paths: discAlong([carriage.x + carriage.w + 1.8, COLUMN.y, cz + 9], X, 3, 2.6, P, 24, 0.3), tone: 'mid', inner: seam(knurlAlong([carriage.x + carriage.w + 1.8, COLUMN.y, cz + 9], X, 3, 2.6, 18)) });
  // The arm out over the hole, and the gripper's body under its end.
  const arm: Plan = { x: HOLE.x - 3.4, y: carriage.y + carriage.d, w: 6.8, d: HOLE.y + 8 - (carriage.y + carriage.d), r: 0.8 };
  parts.push({ kind: 'solid', paths: slab(arm, cz + 6, 6, 2, 0.4), tone: 'mid' });
  const body: Plan = { x: HOLE.x - 9, y: HOLE.y - 7, w: 18, d: 14, r: 1.4 };
  const bz = TIP0 + 22 + dz;
  parts.push({ kind: 'solid', paths: slab(body, bz, cz + 6 - bz, 3, 0.5), tone: 'mid', inner: seam(sideSeam(body, bz + 2.4, P, 3)) });
  parts.push({ kind: 'dots', points: [at([body.x + 2.4, body.y + body.d, bz + 4.6]), at([body.x + body.w - 2.4, body.y + body.d, bz + 4.6])], size: 0.42, tone: 'mid' });
  return parts;
}

/** The peg and the fingers that hold it, for a tip at `tip`: the far finger, the peg, then the near finger. */
function pegParts(tip: number): BenchPart[] {
  const finger = (sign: number): BenchPart => ({
    kind: 'solid',
    paths: slab({ x: sign < 0 ? HOLE.x - PEG_R - 2.4 : HOLE.x + PEG_R, y: HOLE.y - 4, w: 2.4, d: 8, r: 0.4 }, tip + 12, 10, 2, 0.3),
    tone: 'mid',
  });
  return [
    finger(-1),
    { kind: 'solid', paths: cyl(HOLE.x, HOLE.y, PEG_R - 1.4, tip, 1.6, 32), tone: 'hi', lit: true, name: 'peg-tip' },
    { kind: 'solid', paths: cyl(HOLE.x, HOLE.y, PEG_R, tip + 1.6, 24.4, 40), tone: 'hi', lit: true, inner: seam(sideArc(HOLE.x, HOLE.y, PEG_R, tip + 9, P, 24)), name: 'peg' },
    finger(1),
  ];
}

// ---------------------------------------------------------------- the model: poses and a test cycle
/** True when the error fits: the legs reach the plate, and the peg goes into the hole. */
export const legsReach = (errorMm: number) => errorMm <= LEG_LIMIT_MM;
export const pegFits = (errorMm: number) => errorMm <= CLEARANCE_MM;

/** The bench at rest for an error: the plate dropped, the hole shifted, the peg in the hole or on its rim, the robot up or down. */
export function restPose(errorMm: number): BenchPose {
  return { drop: dropAt(errorMm), shift: shiftAt(errorMm), tip: pegFits(errorMm) ? TIP_IN : TIP_ON_RIM, fall: legsReach(errorMm) ? 0 : 1 };
}

/** Every moving slot's parts for a pose. */
export function movingAt(pose: BenchPose): Record<Slot, BenchPart[]> {
  const raw = movingRaw(pose);
  return Object.fromEntries(
    Object.entries(raw).map(([slot, parts]) => [slot, parts.map((part) => (part.kind === 'solid' ? { ...part, paths: steadySolid(part.paths) } : part))]),
  ) as Record<Slot, BenchPart[]>;
}

function movingRaw(pose: BenchPose): Record<Slot, BenchPart[]> {
  const failed = pose.drop > LEG_LIMIT_MM * FLOOR_UNITS + 1e-9;
  return {
    jack: jackParts(pose.drop),
    plate: plateParts(pose.drop),
    wheel: wheelParts(pose.drop),
    robot: robotParts(pose.drop, pose.fall, failed),
    block: blockParts(pose.shift),
    leadscrew: leadscrewParts(pose.shift),
    knob: knobParts(pose.shift),
    carriage: carriageParts(pose.tip),
    peg: pegParts(pose.tip),
  };
}

/**
 * Where the peg may show while it is in the hole: the screen above the near half of the hole's mouth.
 * Below that line the block's near face hides it; the far half of the mouth shows the peg going in.
 */
export function holeClip(shift: number): string {
  const facing = Math.atan2(V[1], V[0]);
  const near: Flat[] = [];
  for (let k = 0; k <= 32; k++) {
    const a = facing - Math.PI / 2 + (k / 32) * Math.PI;
    near.push(at([HOLE.x - shift + HOLE_R * Math.cos(a), HOLE.y + HOLE_R * Math.sin(a), BLOCK_TOP]));
  }
  const first = near[0]!;
  const last = near[near.length - 1]!;
  return pathOf([...near, [last[0], -HEIGHT], [first[0], -HEIGHT]], true);
}

/** The clip the peg takes at a pose: the hole's, while its tip is below the block's top. */
export const clipFor = (pose: BenchPose): { slot: Slot; d: string } | null => (pose.tip < BLOCK_TOP - 1e-6 ? { slot: 'peg', d: holeClip(pose.shift) } : null);

/** The front feet's lowest reach, z, and how far a hanging foot would sit above the plate (0 while it stands on it). */
export const frontFootZ = (drop: number) => Math.max(DECK_TOP - drop + FOOT_R, HIP_Z - (THIGH + SHIN));
export const footGap = (drop: number) => frontFootZ(drop) - (DECK_TOP - drop + FOOT_R);

/** A test cycle's phases, seconds: lift the peg clear, set the new error, lower the peg (the robot settles meanwhile). */
export const CYCLE = { lift: 0.35, set: 0.65, lower: 0.5 } as const;
export const CYCLE_SECONDS = CYCLE.lift + CYCLE.set + CYCLE.lower;
const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

/**
 * The bench `t` seconds into a test cycle from a pose to an error's rest pose: the peg lifts clear of the block,
 * the jack and the cross-slide move to the new error while the robot's front feet follow the plate, then the peg
 * comes down into the hole or onto its rim, and a robot whose feet found nothing pitches forward onto the plate (a
 * robot that was down gets up first). The cycle ends exactly on the new error's rest pose, and it can start from any
 * moment of another cycle.
 */
export function cycleAt(from: BenchPose, toMm: number, t: number): BenchPose {
  const to = restPose(toMm);
  if (t >= CYCLE_SECONDS) return to;
  const a = smooth(t / CYCLE.lift);
  const b = smooth((t - CYCLE.lift) / CYCLE.set);
  const c = smooth((t - CYCLE.lift - CYCLE.set) / CYCLE.lower);
  const lifted = Math.max(from.tip, TIP_LIFTED);
  const tip = t < CYCLE.lift + CYCLE.set ? from.tip + (lifted - from.tip) * a : lifted + (to.tip - lifted) * c;
  const fall = to.fall < from.fall ? from.fall * (1 - a) : from.fall + (to.fall - from.fall) * c;
  return { drop: from.drop + (to.drop - from.drop) * b, shift: from.shift + (to.shift - from.shift) * b, tip, fall };
}

/** A pose from preview input: `{ errorMm }` for a rest pose, `{ from, to, t }` for a moment of a cycle, or a pose itself. */
export function poseFrom(raw: { errorMm?: number; from?: number; to?: number; t?: number } & Partial<BenchPose>): BenchPose {
  if (typeof raw.errorMm === 'number') return restPose(raw.errorMm);
  if (typeof raw.from === 'number' && typeof raw.to === 'number') return cycleAt(restPose(raw.from), raw.to, raw.t ?? 0);
  return raw as BenchPose;
}

/** The resting screen numbers, for tests and previews. */
export const SCREEN = { at, HOLE, BLOCK_TOP, DECK_TOP };
