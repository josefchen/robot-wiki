/**
 * The cam-and-follower bench for NoiseOrEdit, drawn with the isometric kit.
 *
 * The object is the explanation. A frozen pear-shaped cam, the base policy,
 * turns on a shaft in two pillow blocks. The noise the policy starts from is
 * the knurled dial on its own stand at the front, belted one to one to the
 * camshaft. A flat follower rides the cam's edge, held against it by a
 * spring, and pushes a rod through a guide bearing to a slide head on a rail.
 * Whatever the dial reads, the follower lands between the cam's lowest and
 * highest lift, so the peg the slide head carries lands somewhere on the
 * darker strip inlaid in the fixture plate: the actions the frozen policy can
 * make. The hole the task needs is just past the strip's end. A micrometer
 * head on the slide is the edit: a short, bounded travel that moves the peg
 * carriage past what the cam gives. With its lock lever down (steering the
 * noise only), the best dial setting still drops the peg, the one lit part,
 * short of the hole; with the edit free, the same setting plus a small turn
 * of the thimble drops it in.
 *
 * Numbers: lib/noise-or-edit.ts (schematic, no number claimed). World units
 * are millimetres of the drawing: x runs along the bench to the right, y
 * toward the viewer, z up from the bench top; the cam's axis is x = 0.
 * Static parts are built once; the cam, the dial, the follower and its
 * spring, the slide head and the peg are rebuilt by the functions at the
 * bottom for each pose.
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
  topTicks,
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
import { CAM_BASE, CAM_NOSE, EDIT_MAX, HOLE_FIT, HOLE_X, LIFT_RANGE, PEG_OFFSET, camOutline, camRadius, liftAt, pegAt } from '../../../lib/noise-or-edit.ts';

export const WIDTH = 640;
export const AZIMUTH = 62;
export const ELEVATION = 27;

// ------------------------------------------------------------------ layout
const RAD = Math.PI / 180;
const BASE: Plan = { x: -47, y: -36, w: 176, d: 82, r: 6 };
const BASE_H = 9;
const FOOT_H = 6;
/** The cam's axis: x = 0, at the cam plate's mid-plane y = 0, ZC above the bench. */
const ZC = 36;
const AXIS_Y = 0;
/** The cast bed under the two pillow blocks. */
const BED: Plan = { x: -19, y: -35, w: 38, d: 32, r: 2 };
const BED_H = 7;
/** Along y: the back pillow block, the front pillow block, the cam plate, its hub and the pulley. */
const BACK_BLOCK = [-31, -22] as const;
const FRONT_BLOCK = [-15, -6] as const;
const CAM_Y = [-3, 3] as const;
const HUB_Y = [3, 7] as const;
const PULLEY_Y = [7, 10.6] as const;
const PULLEY_R = 5;
const SHAFT_R = 3.2;
/** The dial's stand at the front left: its axis along y at (DIAL.x, DIAL.z); its pulley lines up with the camshaft's. */
const DIAL = { x: -32, z: 14, block: [24, 32], knob: [32, 37.5], r: 7.6 } as const;
const BELT_T = 1.1;
/** The follower: a flat pad on a rod, the pad's face on the cam's edge. */
const PAD_R = 7;
const PAD_T = 3;
const ROD_R = 2.3;
const ROD_LENGTH = PEG_OFFSET - PAD_T - 27.5;
/** The guide bearing the rod slides through, on a web with two gussets. */
const GUIDE = { x0: 33, x1: 45, r: 7 } as const;
/** The rail the slide head rides on. */
const RAIL: Plan = { x: 49, y: -7, w: 70, d: 14, r: 1.2 };
const RAIL_H = 5;
/** The slide head, from the rod's end at x = h: carriage, upright, top plate, micrometer, peg carriage and its stop. */
const HEAD = { plate: [0, 30], upright: [0, 9], top: [-3, 53], clamp: [2, 11], barrel: [11, 19], thimble: [-8, 2], ratchet: [-13, -8], carriage: [22, 33], stop: [49, 53] } as const;
const MIC_Z = ZC + 17;
/** The peg: carried on an arm reaching forward over the fixture plate. */
const ARM_Y = [7, 31.6] as const;
const PEG_Y = 28;
const PEG_R = 2.2;
const SLEEVE_R = 3.8;
/** The fixture plate in front, its strip of reachable places and the hole. */
const FIXTURE: Plan = { x: 64, y: 16, w: 52, d: 24, r: 2 };
const FIXTURE_H = 14;
const STRIP: Plan = { x: LIFT_RANGE[0] + PEG_OFFSET - PEG_R - 0.8, y: PEG_Y - 5, w: LIFT_RANGE[1] - LIFT_RANGE[0] + 2 * PEG_R + 1.6, d: 10, r: 1.2 };
const HOLE_R = 2.7;
const BUSH_R = 4.4;
/** How far the peg's tip sits above the plate when raised, and how deep the hole lets it go. */
const PEG_LIFT = 4.5;
const HOLE_DEPTH = 5;

/** The world x of the slide head's left face for a follower face at `lift`. */
const headX = (lift: number) => lift + PAD_T + ROD_LENGTH;

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
  // The cam's reach above its axis, and the micrometer at either end of the travel.
  points.push([0, CAM_Y[0], ZC + CAM_BASE + CAM_NOSE + 1], [-(CAM_BASE + CAM_NOSE), CAM_Y[0], ZC + 8]);
  for (const lift of LIFT_RANGE) {
    const h = headX(lift);
    points.push([h + HEAD.ratchet[0], AXIS_Y, MIC_Z + 4], [h + HEAD.stop[1], AXIS_Y - 8, MIC_Z + 6]);
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
/** A point on an upright face at depth y, `r` from (x0, z0) at `deg` (counterclockwise as the viewer sees it, 0 along +x). */
const polar = (x0: number, z0: number, y: number, r: number, deg: number): Point3 => [x0 + r * Math.cos(deg * RAD), y, z0 + r * Math.sin(deg * RAD)];

// ------------------------------------------------------------------ parts
export type Slot = 'cam' | 'dial-pulley' | 'dial' | 'follower' | 'head' | 'peg';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
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

/** Knurl lines along a round part's axis on the side that faces the viewer, between s0 and s1 along `axis` from `centre`. */
function knurlAlong(centre: Point3, axis: Point3, radius: number, s0: number, s1: number, count: number): string {
  const lines: string[] = [];
  for (const p of circleAround(centre, axis, radius, count)) {
    const n: Point3 = [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]];
    if (facing(n) / radius < 0.2) continue;
    lines.push(pathOf([at([p[0] + axis[0] * s0, p[1] + axis[1] * s0, p[2] + axis[2] * s0]), at([p[0] + axis[0] * s1, p[1] + axis[1] * s1, p[2] + axis[2] * s1])]));
  }
  return lines.join('');
}

/** A coil spring along x round (y, z), from x0 to x1, split into the halves behind and in front of what it wraps. */
function coilAlongX(x0: number, x1: number, y: number, z: number, radius: number, turns: number) {
  const count = Math.max(8, Math.round(turns * 18));
  const back: Flat[][] = [];
  const front: Flat[][] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let k = 0; k <= count; k++) {
    const share = k / count;
    const angle = share * turns * Math.PI * 2;
    const isNear = facing([0, Math.cos(angle), Math.sin(angle)]) > 0;
    const flat = at([x0 + (x1 - x0) * share, y + radius * Math.cos(angle), z + radius * Math.sin(angle)]);
    if (near === null) near = isNear;
    if (isNear !== near) {
      run.push(flat);
      (near ? front : back).push(run);
      run = [flat];
      near = isNear;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(run);
  return { back: back.map((r) => pathOf(r)).join(''), front: front.map((r) => pathOf(r)).join('') };
}

const PARTS: Part[] = [];
const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', name?: string) => {
  if (d) list.push({ kind: 'line', d, tone, free, name });
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
/** A triangle or other convex outline in the x-z plane at depth y0, `depth` thick toward the viewer. */

// The base: a cast plate on four turned feet, with its edge seam, a groove, corner screws and the maker's plate.
{
  const list = PARTS;
  for (const [x, y] of byDepth(corners(BASE, 16))) {
    solid(list, cyl(x, y, 7, -BASE_H - FOOT_H, 1.6, 28, 0.3), 'lo');
    solid(list, cyl(x, y, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 24), 'mid', { inner: seamPath(sideArc(x, y, 5, -BASE_H - 3.4, P, 18)) });
  }
  solid(list, slab(BASE, -BASE_H, BASE_H, 8, 1.3), 'lo', { inner: seamPath(sideSeam(BASE, -BASE_H + 3, P, 8)) });
  line(list, planOutline(insetPlan(BASE, 4.5), 0, P, 8), 'faint');
  for (const [x, y] of corners(BASE, 9)) screw(list, x, y, 0, 1.9);
  const label = box(-6, BASE.y + BASE.d - 12, 30, BASE.y + BASE.d - 4.5, 1.2);
  solid(list, slab(label, 0, 0.8, 3), 'lo');
  line(list, planOutline(insetPlan(label, 1.3), 0.8, P, 3), 'faint');
  for (const [k, share] of [[0, 0.8], [1, 0.56], [2, 0.34]] as const) {
    const y = label.y + 2.2 + k * 1.8;
    line(list, lineOnTop([label.x + 4.4, y], [label.x + 4.4 + (label.w - 9) * share, y], 0.8, P), 'lo', true);
  }
  dots(list, [at([label.x + 2, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2, label.y + label.d / 2, 0.8])], 0.42, 'mid');
}

// The rail the slide head rides, with its end stops and the screws along its top.
{
  const list = PARTS;
  solid(list, slab(RAIL, 0, RAIL_H, 3, 0.5), 'mid', { inner: seamPath(sideSeam(RAIL, RAIL_H - 1.6, P, 3)) });
  const screws: Flat[] = [];
  for (let x = RAIL.x + 8; x < RAIL.x + RAIL.w - 4; x += 12) screws.push(at([x, RAIL.y + RAIL.d / 2, RAIL_H]));
  dots(list, screws, 0.45, 'mid');
  for (const x of [RAIL.x - 1, RAIL.x + RAIL.w - 4]) {
    const stop = box(x, RAIL.y - 1, x + 5, RAIL.y + RAIL.d + 1, 0.6);
    solid(list, slab(stop, 0, RAIL_H + 3, 2, 0.4), 'lo');
    dots(list, [at([x + 2.5, RAIL.y + RAIL.d / 2, RAIL_H + 3])], 0.5, 'mid');
  }
}

/** A pillow block on the bed between y0 and y1: its bolted foot, a short body and the round bearing housing with its seam and cap screws. */
function pillowBlock(list: Part[], y0: number, y1: number) {
  const foot = box(-14, y0 - 1.2, 14, y1 + 1.2, 1.2);
  solid(list, slab(foot, BED_H, 3, 3, 0.4), 'lo');
  for (const x of [-10.5, 10.5]) screw(list, x, (y0 + y1) / 2, BED_H + 3, 1.2);
  const body = box(-7, y0, 7, y1, 1);
  solid(list, slab(body, BED_H + 3, ZC - BED_H - 3 - 5, 3, 0.4), 'mid');
  solid(list, discAlong([0, y0, ZC], Y, 8, y1 - y0, P, 40, 0.4), 'mid', { inner: seamPath(seamAround([0, (y0 + y1) / 2, ZC], Y, 8)) });
  dots(list, [at([-5.6, y1, ZC + 5.6]), at([5.6, y1, ZC + 5.6])], 0.5, 'mid');
  line(list, pathOf(circleAround([0, y1, ZC], Y, SHAFT_R + 1.3, 28).map(at), true), 'faint');
}

// The cam's bed and the two pillow blocks, with the shaft between and in front of them.
{
  const list = PARTS;
  solid(list, slab(BED, 0, BED_H, 3, 0.6), 'mid', { inner: seamPath(sideSeam(BED, 3, P, 3)) });
  for (const [x, y] of corners(BED, 3.4)) dots(list, [at([x, y, BED_H])], 0.5, 'mid');
  solid(list, discAlong([0, BACK_BLOCK[0] - 4, ZC], Y, SHAFT_R, 4, P, 24), 'mid');
  pillowBlock(list, BACK_BLOCK[0], BACK_BLOCK[1]);
  solid(list, discAlong([0, BACK_BLOCK[1], ZC], Y, SHAFT_R, FRONT_BLOCK[0] - BACK_BLOCK[1], P, 24), 'hi');
  pillowBlock(list, FRONT_BLOCK[0], FRONT_BLOCK[1]);
  solid(list, discAlong([0, FRONT_BLOCK[1], ZC], Y, SHAFT_R, CAM_Y[0] - FRONT_BLOCK[1], P, 24), 'hi');
}

PARTS.push({ kind: 'slot', slot: 'cam' });
PARTS.push({ kind: 'slot', slot: 'dial-pulley' });

// The belt: one to one from the dial's pulley to the camshaft's, drawn as its side band in front of the two pulleys.
{
  const list = PARTS;
  const y = PULLEY_Y[1] - 0.3;
  const a: [number, number] = [0, ZC];
  const b: [number, number] = [DIAL.x, DIAL.z];
  const along = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const loop = (r: number) => {
    const points: Point3[] = [];
    // Round the camshaft's pulley on the side away from the dial, then round the dial's on the side away from the camshaft.
    for (let k = 0; k <= 24; k++) points.push(polar(a[0], a[1], y, r, (along + Math.PI / 2 + (k / 24) * Math.PI) / RAD));
    for (let k = 0; k <= 24; k++) points.push(polar(b[0], b[1], y, r, (along - Math.PI / 2 + (k / 24) * Math.PI) / RAD));
    return points.map(at);
  };
  const outer = loop(PULLEY_R + BELT_T);
  const inner = loop(PULLEY_R).reverse();
  list.push({ kind: 'face', d: pathOf(outer, true) + pathOf(inner, true), fill: 2 });
  line(list, pathOf(outer, true), 'mid');
  line(list, pathOf(inner, true), 'lo');
}

// The dial's stand at the front left: its shaft forward from the pulley, a bolted foot, a short body and the bearing housing the shaft turns in.
{
  const list = PARTS;
  const [y0, y1] = DIAL.block;
  // The dial's shaft, from its pulley forward into the bearing.
  solid(list, discAlong([DIAL.x, PULLEY_Y[1], DIAL.z], Y, SHAFT_R - 0.6, y0 - PULLEY_Y[1], P, 22), 'hi');
  const foot = box(DIAL.x - 9, y0 - 1, DIAL.x + 9, y1 + 1, 1);
  solid(list, slab(foot, 0, 2.6, 3, 0.4), 'lo');
  for (const x of [DIAL.x - 6.4, DIAL.x + 6.4]) screw(list, x, (y0 + y1) / 2, 2.6, 1.1);
  solid(list, slab(box(DIAL.x - 4.6, y0, DIAL.x + 4.6, y1, 0.8), 2.6, DIAL.z - 2.6 - 3, 3, 0.3), 'mid');
  solid(list, discAlong([DIAL.x, y0, DIAL.z], Y, 6, y1 - y0, P, 36, 0.4), 'mid', { inner: seamPath(seamAround([DIAL.x, (y0 + y1) / 2, DIAL.z], Y, 6)) });
  line(list, pathOf(circleAround([DIAL.x, y1, DIAL.z], Y, SHAFT_R + 1, 22).map(at), true), 'faint');
}

PARTS.push({ kind: 'slot', slot: 'dial' });

// The index the dial is read against: a finger fixed on the bearing housing, its tip over the knob's rim.
{
  const list = PARTS;
  const [y0] = DIAL.block;
  solid(list, slab(box(DIAL.x - 1.4, y0 + 2, DIAL.x + 1.4, y0 + 5, 0.4), DIAL.z + 5.4, DIAL.r - 5.4 + 2.2, 2, 0.2), 'mid');
  solid(list, slab(box(DIAL.x - 0.9, y0 + 2, DIAL.x + 0.9, DIAL.knob[1] - 0.6, 0.4), DIAL.z + DIAL.r + 1.2, 1, 2, 0.2), 'mid');
  dots(list, [at([DIAL.x, y0 + 3.5, DIAL.z + DIAL.r + 2.2])], 0.4, 'mid');
}

PARTS.push({ kind: 'slot', slot: 'follower' });

// The guide bearing the rod slides through: a bolted foot, a turned column with its collars, and the round housing with its seal ring and grease nipple.
{
  const list = PARTS;
  const mid = (GUIDE.x0 + GUIDE.x1) / 2;
  const foot = box(GUIDE.x0 - 2, AXIS_Y - 8, GUIDE.x1 + 2, AXIS_Y + 8, 1.2);
  solid(list, slab(foot, 0, 2.6, 3, 0.4), 'lo');
  for (const [x, y] of [[GUIDE.x0 + 1, AXIS_Y + 5.4], [GUIDE.x1 - 1, AXIS_Y + 5.4], [GUIDE.x0 + 1, AXIS_Y - 5.4], [GUIDE.x1 - 1, AXIS_Y - 5.4]] as Plane[]) screw(list, x, y, 2.6, 1);
  solid(list, cyl(mid, AXIS_Y, 5.6, 2.6, 2.4, 32, 0.3), 'mid');
  solid(list, cyl(mid, AXIS_Y, 3.8, 5, ZC - GUIDE.r - 5 - 2, 28), 'mid', { inner: seamPath(sideArc(mid, AXIS_Y, 3.8, 14, P, 20)) });
  solid(list, cyl(mid, AXIS_Y, 5, ZC - GUIDE.r - 2, 2.4, 32, 0.3), 'mid');
  solid(list, discAlong([GUIDE.x0, AXIS_Y, ZC], X, GUIDE.r, GUIDE.x1 - GUIDE.x0, P, 40, 0.4), 'mid', {
    inner: seamPath(seamAround([GUIDE.x0 + 3.5, AXIS_Y, ZC], X, GUIDE.r) + seamAround([GUIDE.x1 - 3.5, AXIS_Y, ZC], X, GUIDE.r)),
  });
  line(list, pathOf(circleAround([GUIDE.x1, AXIS_Y, ZC], X, ROD_R + 1.1, 24).map(at), true), 'faint');
  solid(list, cyl(mid, AXIS_Y, 1.3, ZC + GUIDE.r - 0.6, 2.4, 14), 'mid');
  solid(list, cyl(mid, AXIS_Y, 0.85, ZC + GUIDE.r + 1.8, 1.1, 12), 'lo');
}

PARTS.push({ kind: 'slot', slot: 'head' });

// The fixture plate in front: screwed down, its strip of the places the cam can reach, the hole and the ruler.
{
  const list = PARTS;
  const plate = insetPlan(FIXTURE, -2.4);
  solid(list, slab(plate, 0, 3, 3, 0.4), 'lo');
  for (const [x, y] of corners(plate, 2.6)) screw(list, x, y, 3, 1.1);
  solid(list, slab(FIXTURE, 3, FIXTURE_H - 3, 3, 0.6), 'mid', { inner: seamPath(sideSeam(FIXTURE, FIXTURE_H - 3.4, P, 3)) });
  // Two jacking-screw holes on the block's front face.
  for (const x of [FIXTURE.x + 7, FIXTURE.x + FIXTURE.w - 7]) line(list, pathOf(circleAround([x, FIXTURE.y + FIXTURE.d, 7], Y, 1.4, 18).map(at), true), 'lo');
  line(list, planOutline(insetPlan(FIXTURE, 2.6), FIXTURE_H, P, 3), 'faint');
  for (const [x, y] of corners(FIXTURE, 5)) screw(list, x, y, FIXTURE_H, 1.3);
  // The strip: a darker inlay, flush with the plate, where the frozen cam can put the peg.
  list.push({ kind: 'face', d: planOutline(STRIP, FIXTURE_H, P, 3), fill: 0 });
  line(list, planOutline(STRIP, FIXTURE_H, P, 3), 'mid');
  // The hole: a hardened bush pressed into the plate, its bore dark.
  solid(list, cyl(HOLE_X, PEG_Y, BUSH_R, FIXTURE_H, 0.6, 32, 0.2), 'mid');
  const bore = pathOf(circleAround([HOLE_X, PEG_Y, FIXTURE_H + 0.6], [0, 0, 1], HOLE_R, 28).map(at), true);
  list.push({ kind: 'face', d: bore, fill: 0 });
  line(list, bore, 'mid');
  // The ruler along the plate's front edge: ticks every 2, long every 10.
  const rule = box(FIXTURE.x + 4, FIXTURE.y + FIXTURE.d - 6, FIXTURE.x + FIXTURE.w - 4, FIXTURE.y + FIXTURE.d - 2, 0.6);
  solid(list, slab(rule, FIXTURE_H, 0.6, 2), 'lo');
  const ticks = topTicks(rule.x + 2, rule.x + rule.w - 2, 2, 5, rule.y + 0.2, FIXTURE_H + 0.6, [1.4, 2.6], P, 'x');
  line(list, ticks.minor, 'lo');
  line(list, ticks.major, 'mid');
}

PARTS.push({ kind: 'slot', slot: 'peg' });

export { PARTS };

// ------------------------------------------------------------------ the moving parts
/**
 * The cam turned to `deg` (its nose toward the follower at 0): the pear-shaped
 * plate with a machined chamfer line just inside its edge, two lightening
 * holes, the hub with its set screw, and the camshaft's pulley.
 */
export function camParts(deg: number): LivePart[] {
  const list: Part[] = [];
  const turn = deg * RAD;
  const toWorld = ([u, v]: [number, number], y: number): Point3 => [u * Math.cos(turn) - v * Math.sin(turn), y, ZC + u * Math.sin(turn) + v * Math.cos(turn)];
  const inset = (phi: number, by: number): [number, number] => {
    const r = camRadius(phi) - by;
    return [r * Math.cos(phi * RAD), r * Math.sin(phi * RAD)];
  };
  const outline = camOutline(3).map((point) => toWorld(point, CAM_Y[0]));
  const chamfer: Point3[] = [];
  for (let phi = 0; phi < 360; phi += 3) chamfer.push(toWorld(inset(phi, 1.5), CAM_Y[1]));
  solid(list, prismAlong(outline, [0, CAM_Y[1] - CAM_Y[0], 0], P, { round: true, bevel: 0.4 }), 'hi', {
    inner: seamPath(pathOf(chamfer.map(at), true)),
    name: 'cam',
  });
  for (const v of [-6.2, 6.2]) line(list, pathOf(circleAround(toWorld([-4, v], CAM_Y[1]), Y, 2.4, 22).map(at), true), 'lo');
  // The hub, its set screw turning with it, and the pulley the belt drives.
  solid(list, discAlong([0, HUB_Y[0], ZC], Y, 5.6, HUB_Y[1] - HUB_Y[0], P, 32, 0.3), 'mid');
  dots(list, [at(polar(0, ZC, (HUB_Y[0] + HUB_Y[1]) / 2, 5.6, deg + 90))], 0.6, 'mid');
  list.push(...pulleyParts(0, ZC, deg));
  return list as LivePart[];
}

/** A belt pulley on a shaft along y at (x0, z0): its back flange, the drum and three holes in its face that turn with it. */
function pulleyParts(x0: number, z0: number, deg: number): LivePart[] {
  const list: Part[] = [];
  solid(list, discAlong([x0, PULLEY_Y[0], z0], Y, PULLEY_R + BELT_T + 0.7, 0.6, P, 36, 0.2), 'lo');
  solid(list, discAlong([x0, PULLEY_Y[0] + 0.6, z0], Y, PULLEY_R, PULLEY_Y[1] - PULLEY_Y[0] - 0.6, P, 36, 0.3), 'mid');
  for (let k = 0; k < 3; k++) line(list, pathOf(circleAround(polar(x0, z0, PULLEY_Y[1], 2.6, deg + 30 + k * 120), Y, 0.9, 14).map(at), true), 'lo');
  dots(list, [at([x0, PULLEY_Y[1], z0])], 0.55, 'mid');
  return list as LivePart[];
}

/** The dial's pulley at the back of its shaft, turned to `deg`. */
export const dialPulleyParts = (deg: number) => pulleyParts(DIAL.x, DIAL.z, deg);

/** The dial knob on its stand, turned to `deg`: the knob with its knurl, the ticks on its face (zero at the top, under the index, at 0) and its hub. */
export function dialParts(deg: number): LivePart[] {
  const list: Part[] = [];
  const [y0, y1] = DIAL.knob;
  solid(list, discAlong([DIAL.x, y0, DIAL.z], Y, DIAL.r, y1 - y0, P, 64, 0.5), 'hi', {
    inner: `<path class="iso-line" data-tone="lo" d="${knurlAlong([DIAL.x, y0, DIAL.z], Y, DIAL.r, 0, y1 - y0, 44)}"/>`,
  });
  const minor: string[] = [];
  const major: string[] = [];
  let zero = '';
  for (let k = 0; k < 24; k++) {
    const a = deg + 90 + k * 15;
    const r0 = DIAL.r - 0.1;
    const r1 = r0 - (k === 0 ? 2.2 : k % 6 === 0 ? 1.8 : 1.1);
    const d = pathOf([at(polar(DIAL.x, DIAL.z, y1, r0, a)), at(polar(DIAL.x, DIAL.z, y1, r1, a))]);
    if (k === 0) zero = d;
    else (k % 6 === 0 ? major : minor).push(d);
  }
  line(list, minor.join(''), 'lo');
  line(list, major.join(''), 'mid');
  line(list, zero, 'hi');
  line(list, pathOf(circleAround([DIAL.x, y1, DIAL.z], Y, 2.2, 20).map(at), true), 'mid');
  dots(list, [at([DIAL.x, y1, DIAL.z])], 0.6, 'hi');
  return list as LivePart[];
}

/** The follower for a follower face at `lift`: the flat pad, the spring's back half, the rod up to the guide, the spring's front half. */
export function followerParts(lift: number): LivePart[] {
  const list: Part[] = [];
  solid(list, discAlong([lift, AXIS_Y, ZC], X, PAD_R, PAD_T, P, 40, 0.3), 'hi', { inner: seamPath(seamAround([lift + 1, AXIS_Y, ZC], X, PAD_R)), name: 'pad' });
  const spring = coilAlongX(lift + PAD_T, GUIDE.x0, AXIS_Y, ZC, 4.6, 6.5);
  line(list, spring.back, 'lo');
  solid(list, discAlong([lift + PAD_T, AXIS_Y, ZC], X, ROD_R, GUIDE.x0 - lift - PAD_T, P, 20), 'hi', { name: 'rod' });
  line(list, spring.front, 'mid');
  return list as LivePart[];
}

/** The slide head for a follower face at `lift` and an edit `edit`: the rod out of the guide, the carriage, the micrometer and the peg carriage. */
export function headParts(lift: number, edit: number, locked: boolean): LivePart[] {
  const list: Part[] = [];
  const h = headX(lift);
  const e = Math.min(EDIT_MAX, Math.max(-EDIT_MAX, edit));
  // The rod from the guide's face into the upright.
  solid(list, discAlong([GUIDE.x1, AXIS_Y, ZC], X, ROD_R, h - GUIDE.x1, P, 20), 'hi', { name: 'rod' });
  // Bushings under the carriage, the carriage plate on the rail, the upright the rod is fixed to.
  for (const x of [h + 4, h + HEAD.plate[1] - 4]) solid(list, slab(box(x - 3, RAIL.y - 1.4, x + 3, RAIL.y + RAIL.d + 1.4, 0.5), RAIL_H - 1.4, 1.4, 2), 'lo');
  const plate = box(h + HEAD.plate[0], AXIS_Y - 10, h + HEAD.plate[1], AXIS_Y + 10, 1.2);
  solid(list, slab(plate, RAIL_H, 4.4, 3, 0.4), 'mid', { inner: seamPath(sideSeam(plate, RAIL_H + 1.6, P, 3)) });
  for (const [x, y] of corners(plate, 2.6)) dots(list, [at([x, y, RAIL_H + 4.4])], 0.45, 'mid');
  const upright = box(h + HEAD.upright[0], AXIS_Y - 6, h + HEAD.upright[1], AXIS_Y + 6, 0.8);
  solid(list, slab(upright, RAIL_H + 4.4, ZC + 8 - RAIL_H - 4.4, 3, 0.4), 'mid', { inner: seamPath(sideSeam(upright, ZC - 6, P, 3)) });
  dots(list, [at([h + 5, AXIS_Y + 6, ZC - 2]), at([h + 5, AXIS_Y + 6, ZC + 4])], 0.45, 'mid');
  // The top plate, on which the micrometer is clamped and the peg carriage slides, and the dovetail along it.
  solid(list, slab(box(h + HEAD.top[0], AXIS_Y - 8, h + HEAD.top[1], AXIS_Y + 8, 1), ZC + 8, 4, 3, 0.4), 'mid');
  solid(list, slab(box(h + HEAD.barrel[1] + 2, AXIS_Y - 3, h + HEAD.stop[0], AXIS_Y + 3, 0.4), ZC + 12, 1.2, 2), 'lo');
  // The micrometer: ratchet and thimble at the left (knurled; the thimble's marks turn with the edit), the clamp, the barrel and the spindle.
  const axisZ = MIC_Z;
  solid(list, discAlong([h + HEAD.ratchet[0], AXIS_Y, axisZ], X, 2.8, HEAD.ratchet[1] - HEAD.ratchet[0], P, 28, 0.3), 'mid', {
    inner: `<path class="iso-line" data-tone="lo" d="${knurlAlong([h + HEAD.ratchet[0], AXIS_Y, axisZ], X, 2.8, 0, HEAD.ratchet[1] - HEAD.ratchet[0], 26)}"/>`,
  });
  const band = 5.5;
  solid(list, discAlong([h + HEAD.thimble[0], AXIS_Y, axisZ], X, 4.4, band, P, 40, 0.3), 'hi', {
    inner: `<path class="iso-line" data-tone="lo" d="${knurlAlong([h + HEAD.thimble[0], AXIS_Y, axisZ], X, 4.4, 0, band, 36)}"/>`,
  });
  solid(list, discAlong([h + HEAD.thimble[0] + band, AXIS_Y, axisZ], X, 4.4, HEAD.thimble[1] - HEAD.thimble[0] - band, P, 40, 0.3), 'hi');
  {
    // The thimble's graduations round its bevelled end, turned by the edit (a full turn per 3 units of travel).
    const marks: string[] = [];
    const turn = (e / 3) * 360;
    for (let k = 0; k < 25; k++) {
      const a = (turn + k * (360 / 25)) * RAD;
      const n: Point3 = [0, Math.cos(a), Math.sin(a)];
      if (facing(n) < 0.25) continue;
      const p0: Point3 = [h + HEAD.thimble[1], AXIS_Y + 4.4 * n[1], axisZ + 4.4 * n[2]];
      const p1: Point3 = [h + HEAD.thimble[1] - (k % 5 === 0 ? 2.2 : 1.4), AXIS_Y + 4.4 * n[1], axisZ + 4.4 * n[2]];
      marks.push(pathOf([at(p0), at(p1)]));
    }
    line(list, marks.join(''), 'mid');
  }
  const clamp = box(h + HEAD.clamp[0], AXIS_Y - 5, h + HEAD.clamp[1], AXIS_Y + 5, 0.8);
  solid(list, slab(clamp, ZC + 12, 11, 3, 0.4), 'mid', { inner: seamPath(sideSeam(clamp, ZC + 15, P, 3)) });
  solid(list, discAlong([h + (HEAD.clamp[0] + HEAD.clamp[1]) / 2 - 1.5, AXIS_Y + 5, ZC + 20], Y, 1.5, 1.4, P, 16), 'lo');
  // The barrel out of the clamp, with its index line along the top and ticks hanging from it.
  solid(list, discAlong([h + HEAD.barrel[0], AXIS_Y, axisZ], X, 3.4, HEAD.barrel[1] - HEAD.barrel[0], P, 32), 'hi', {
    inner: seamPath(seamAround([h + HEAD.barrel[0] + 1.2, AXIS_Y, axisZ], X, 3.4)),
  });
  {
    const yTop = AXIS_Y + 3.4 * Math.sin(70 * RAD);
    const zTop = axisZ + 3.4 * Math.cos(70 * RAD);
    line(list, pathOf([at([h + HEAD.barrel[0] + 1.2, yTop, zTop]), at([h + HEAD.barrel[1], yTop, zTop])]), 'mid');
    const ticks: string[] = [];
    for (let x = h + HEAD.barrel[0] + 2; x <= h + HEAD.barrel[1] - 1; x += 1.5) ticks.push(pathOf([at([x, yTop, zTop]), at([x, yTop + 0.7, zTop - 1.3])]));
    line(list, ticks.join(''), 'lo');
  }
  // The lock lever on the clamp's front: down when the edit is locked (steering the noise only), up when it is free.
  {
    const pivot: Point3 = [h + HEAD.clamp[1] - 2.6, AXIS_Y + 5, ZC + 15.4];
    const a = (locked ? -70 : 25) * RAD;
    const tip: Point3 = [pivot[0] + 7 * Math.cos(a), pivot[1] + 1, pivot[2] + 7 * Math.sin(a)];
    solid(list, discAlong(pivot, Y, 1.5, 1, P, 14), 'lo');
    solid(
      list,
      prismAlong(
        [
          [pivot[0] - 0.9 * Math.sin(a), pivot[1] + 1, pivot[2] + 0.9 * Math.cos(a)],
          [pivot[0] + 0.9 * Math.sin(a), pivot[1] + 1, pivot[2] - 0.9 * Math.cos(a)],
          [tip[0] + 0.7 * Math.sin(a), tip[1], tip[2] - 0.7 * Math.cos(a)],
          [tip[0] - 0.7 * Math.sin(a), tip[1], tip[2] + 0.7 * Math.cos(a)],
        ],
        [0, 0.9, 0],
        P,
      ),
      'mid',
    );
  }
  // The spindle, out of the barrel to the peg carriage.
  const carriageX = h + HEAD.carriage[0] + e;
  solid(list, discAlong([h + HEAD.barrel[1], AXIS_Y, axisZ], X, 1.5, carriageX - h - HEAD.barrel[1], P, 16), 'hi');
  // The return spring between the peg carriage and the stop (its back half first), the carriage, the spring's front half and the stop.
  const stopX = h + HEAD.stop[0];
  const carriageEnd = h + HEAD.carriage[1] + e;
  const spring = coilAlongX(carriageEnd, stopX, AXIS_Y - 2, ZC + 15.5, 1.8, 3.5);
  line(list, spring.back, 'lo');
  const carriage = box(carriageX, AXIS_Y - 6, carriageEnd, AXIS_Y + 7, 0.8);
  solid(list, slab(carriage, ZC + 12, 10, 3, 0.4), 'mid', { inner: seamPath(sideSeam(carriage, ZC + 14.2, P, 3)) });
  dots(list, [at([carriageX + 2.4, AXIS_Y + 7, ZC + 19.6]), at([carriageEnd - 2.4, AXIS_Y + 7, ZC + 19.6])], 0.45, 'mid');
  line(list, spring.front, 'mid');
  // The spring's seat on the carriage: a cup the coil's first turn sits in.
  solid(list, discAlong([carriageEnd, AXIS_Y - 2, ZC + 15.5], X, 2.5, 1.1, P, 20, 0.2), 'lo');
  solid(list, slab(box(stopX, AXIS_Y - 6, h + HEAD.stop[1], AXIS_Y + 6, 0.6), ZC + 12, 9, 2, 0.4), 'lo');
  dots(list, [at([stopX + 2, AXIS_Y, ZC + 21])], 0.5, 'mid');
  return list as LivePart[];
}

/** The peg's tip height above the bench: raised, or down on the plate, or down in the hole. */
export function pegTipZ(drop: number, fits: boolean): number {
  const up = FIXTURE_H + PEG_LIFT;
  const down = fits ? FIXTURE_H + 0.6 - HOLE_DEPTH : FIXTURE_H;
  return up + (down - up) * drop;
}

/** The peg (lit) out of its sleeve, the sleeve under the arm's end with its set screw, and the arm forward from the peg carriage. */
export function pegParts(x: number, drop: number, fits: boolean): LivePart[] {
  const list: Part[] = [];
  const tip = pegTipZ(drop, fits);
  const sleeveBottom = ZC + 2;
  // In the hole, the bush's rim hides the peg below it, so the peg is drawn down to the rim.
  const rim = FIXTURE_H + 0.6;
  const inHole = fits && tip < rim;
  const bottom = inHole ? rim : tip;
  const chamfer = inHole ? 0 : 0.9;
  solid(list, cyl(x, PEG_Y, PEG_R, bottom + chamfer, sleeveBottom - bottom - chamfer, 20), 'hi', { lit: true, name: 'peg' });
  if (!inHole) solid(list, cyl(x, PEG_Y, PEG_R - 0.6, tip, chamfer, 16), 'hi', { lit: true, name: 'peg' });
  solid(list, cyl(x, PEG_Y, SLEEVE_R, sleeveBottom, ZC + 14 - sleeveBottom, 24, 0.3), 'mid', { inner: seamPath(sideArc(x, PEG_Y, SLEEVE_R, ZC + 6, P, 18)) });
  solid(list, discAlong([x + SLEEVE_R, PEG_Y, ZC + 9], X, 1.1, 1.8, P, 12), 'lo');
  const arm = box(x - 2.6, ARM_Y[0], x + 2.6, ARM_Y[1], 1);
  solid(list, slab(arm, ZC + 14, 4.4, 3, 0.4), 'mid');
  dots(list, [at([x, ARM_Y[0] + 3, ZC + 18.4]), at([x, PEG_Y, ZC + 18.4])], 0.45, 'mid');
  return list as LivePart[];
}

/** The pose a drawing takes: the dial's angle, the edit's travel, the peg's drop and whether the edit is locked. */
export type BenchPose = { deg: number; edit: number; drop: number; locked: boolean };

/** Every moving part for a pose, by slot. */
export function movingAt(pose: BenchPose): Record<Slot, LivePart[]> {
  const lift = liftAt(pose.deg);
  const x = pegAt(pose.deg, pose.edit);
  const fits = Math.abs(x - HOLE_X) <= HOLE_FIT;
  return {
    cam: camParts(pose.deg),
    'dial-pulley': dialPulleyParts(pose.deg),
    dial: dialParts(pose.deg),
    follower: followerParts(lift),
    head: headParts(lift, pose.edit, pose.locked),
    peg: pegParts(x, pose.drop, fits),
  };
}

export const STILL_POSE: BenchPose = { deg: 0, edit: 0, drop: 1, locked: true };
