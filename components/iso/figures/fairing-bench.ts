/**
 * The fairing bench for PlannerExploit, drawn with the isometric kit.
 *
 * The object is the explanation. Along the back of a bench stands a steel
 * template whose top edge is the real reward for every action, left to right.
 * In front of it a draftsman's batten, the learned model and the one lit
 * part, is clamped at seven posts: the actions that were tried, all on the
 * data strip at the left. Between the clamps the batten lies along the real
 * edge; past the last clamp nothing holds it, and it runs on along its last
 * slope, above the real edge. A planner carriage rides a rail along the
 * front: its feeler reads the batten and it stops where the batten is
 * highest, then drops a probe onto the template to read what that action
 * really returns. Searching everywhere, it runs to the far end, past the
 * data, where the batten is highest and the template low. With the stop
 * raised at the data's edge, it stops inside the data, where the two agree.
 *
 * Numbers: lib/planner-exploit.ts (schematic, no number claimed). World
 * units: the action runs 0 to 1 over 220 units of x; reward 0 to 1 is 80
 * units of height; y toward the viewer is +y, z up.
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
  sideTicks,
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
import { discAlong, viewOf } from '../prism.ts';
import { edgePlate as edgePlateIn } from './edge-plate.ts';
import { DATA_EDGE, DATA_X, predictedReward, realReward } from '../../../lib/planner-exploit.ts';

export const WIDTH = 600;
export const AZIMUTH = 70;
export const ELEVATION = 24;

/** Action 0..1 along x, reward 0..1 in height. */
export const SPAN = 196;
export const RISE = 100;
const FLOOR = 10;
export const ax = (action: number) => action * SPAN;
export const height = (reward: number) => FLOOR + reward * RISE;

// ------------------------------------------------------------------ layout
const BENCH: Plan = { x: -40, y: -42, w: 288, d: 86, r: 6 };
const BENCH_H = 8;
/** The real template: a steel plate on edge at the back. */
const TEMPLATE = { x0: -8, x1: 204, y0: -32, y1: -25 };
/** The batten, the posts and their clamps. */
export const BATTEN_Y = -13;
const BATTEN_T = 2;
const BATTEN_H = 4.4;
const BATTEN = { x0: -6, x1: 202 };
/** The rail along the front and the carriage on it. */
const RAIL = { x0: -26, x1: 224, y0: 18, y1: 25 };
const RAIL_TOP = 5;
const CARRIAGE = { half: 13, y0: 13, y1: 31, z: RAIL_TOP, h: 4 };
const POST = { y: 22, r: 3 };
export const ARM_Z = height(1.08) + 8;
const ARM_BACK = TEMPLATE.y0 + 3.5;
/** The stop at the data's edge: it holds the carriage's centre at DATA_EDGE when raised. */
const STOP_X = ax(DATA_EDGE) + CARRIAGE.half;

const V = viewOf({ origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION });

// ------------------------------------------------------------------ camera
const extremes: Point3[] = [];
for (const [x, y] of [[BENCH.x, BENCH.y], [BENCH.x + BENCH.w, BENCH.y], [BENCH.x, BENCH.y + BENCH.d], [BENCH.x + BENCH.w, BENCH.y + BENCH.d]] as Plane[]) {
  extremes.push([x, y, -BENCH_H - 5], [x, y, 0]);
}
extremes.push([TEMPLATE.x0, TEMPLATE.y0, height(1.05)], [BATTEN.x1, BATTEN_Y, height(predictedReward(1.03)) + 3]);
for (const x of [ax(0) - CARRIAGE.half, ax(1) + CARRIAGE.half]) extremes.push([x, ARM_BACK - 4, ARM_Z + 6], [x, POST.y, ARM_Z + 10]);
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatAll = extremes.map((point) => iso(point, unitP));
const spanX = Math.max(...flatAll.map(([x]) => x)) - Math.min(...flatAll.map(([x]) => x));
const spanY = Math.max(...flatAll.map(([, y]) => y)) - Math.min(...flatAll.map(([, y]) => y));
const PAD = 6;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanY) / spanX + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const edgePlate = (xs: number[], top: (x: number) => number, bottom: (x: number) => number, y0: number, y1: number) => edgePlateIn(xs, top, bottom, y0, y1, P);

// ------------------------------------------------------------------ parts
export type Slot = 'probe' | 'stop' | 'feeler' | 'carriage';
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
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const box = (x0: number, y0: number, x1: number, y1: number, r = 0.8): Plan => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
function screw(list: Part[], x: number, y: number, z: number, r = 1.6) {
  line(list, ring(x, y, r, z, P, 14), 'lo');
  line(list, lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}

/** Points along x for a curve, every two units. */
const xsBetween = (x0: number, x1: number, step = 2) => {
  const xs: number[] = [];
  for (let x = x0; x < x1; x += step) xs.push(x);
  xs.push(x1);
  return xs;
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** The real template's top at a world x, and the batten's centre line. */
export const templateTop = (x: number) => height(realReward(clamp01(x / SPAN)));
export const battenMid = (x: number) => height(predictedReward(x / SPAN));

// ------------------------------------------------------------------ the bench
{
  const list = PARTS;
  const feet: Plane[] = [
    [BENCH.x + 14, BENCH.y + 12],
    [BENCH.x + BENCH.w - 14, BENCH.y + 12],
    [BENCH.x + 14, BENCH.y + BENCH.d - 12],
    [BENCH.x + BENCH.w - 14, BENCH.y + BENCH.d - 12],
  ];
  feet.sort((a, b) => dot3([a[0], a[1], 0], V) - dot3([b[0], b[1], 0], V));
  for (const [x, y] of feet) {
    solid(list, cyl(x, y, 6.6, -BENCH_H - 5, 1.6, 26, 0.3), 'lo');
    solid(list, cyl(x, y, 4.6, -BENCH_H - 3.4, 3.4, 22), 'mid', { inner: sideArc(x, y, 4.6, -BENCH_H - 1.6, P, 18) });
  }
  solid(list, slab(BENCH, -BENCH_H, BENCH_H, 8, 1.2), 'lo', { inner: sideSeam(BENCH, -BENCH_H + 2.8, P, 8) });
  line(list, planOutline(insetPlan(BENCH, 4.5), 0, P, 8), 'faint');
  for (const [x, y] of [
    [BENCH.x + 9, BENCH.y + 9],
    [BENCH.x + BENCH.w - 9, BENCH.y + 9],
    [BENCH.x + 9, BENCH.y + BENCH.d - 9],
    [BENCH.x + BENCH.w - 9, BENCH.y + BENCH.d - 9],
  ] as Plane[]) screw(list, x, y, 0, 2);
  // The maker's plate at the front left.
  const label = box(BENCH.x + 12, 30, BENCH.x + 52, 38, 1.2);
  solid(list, slab(label, 0, 0.8, 3), 'lo');
  for (const [k, share] of [[0, 0.82], [1, 0.58], [2, 0.36]] as const) {
    const y = label.y + 2 + k * 2;
    line(list, lineOnTop([label.x + 4.4, y], [label.x + 4.4 + (label.w - 9) * share, y], 0.8, P), 'lo', true);
  }
  dots(list, [at([label.x + 2, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2, label.y + label.d / 2, 0.8])], 0.42, 'mid');
}

// ------------------------------------------------------------------ the real template
{
  const list = PARTS;
  // Two angle brackets hold it upright from behind; only their feet show, screwed to the bench.
  for (const x of [TEMPLATE.x0 + 30, TEMPLATE.x1 - 30]) {
    solid(list, slab(box(x - 7, TEMPLATE.y0 - 7, x + 7, TEMPLATE.y0, 0.6), 0, 1.6, 2, 0.3), 'mid');
    dots(list, [at([x - 4, TEMPLATE.y0 - 3.5, 1.6]), at([x + 4, TEMPLATE.y0 - 3.5, 1.6])], 0.45, 'mid');
  }
  const xs = xsBetween(TEMPLATE.x0, TEMPLATE.x1);
  const paths = edgePlate(xs, templateTop, () => 0, TEMPLATE.y0, TEMPLATE.y1);
  // Two stiffener seams down the front face, edge to edge.
  const seams = [ax(0.5) - 1, ax(0.9)].map((x) => pathOf([at([x, TEMPLATE.y1, 0]), at([x, TEMPLATE.y1, templateTop(x)])])).join('');
  solid(list, paths, 'hi', { inner: seams });
}
PARTS.push({ kind: 'slot', slot: 'probe' });

// ------------------------------------------------------------------ the data strip, the posts and the batten
{
  const list = PARTS;
  const reach = ax(DATA_EDGE);
  const strip = box(-8, BATTEN_Y - 6, reach + 4, BATTEN_Y + 7, 1);
  solid(list, slab(strip, 0, 2, 3, 0.4), 'mid', { inner: sideSeam(strip, 1, P, 3) });
  // A stop block at each end of the strip.
  for (const x of [-8, reach + 4]) solid(list, slab(box(x - 2.4, BATTEN_Y - 6, x + 2.4, BATTEN_Y + 7, 0.5), 2, 3, 2, 0.3), 'lo');
  // The posts, at the tried actions.
  for (const action of DATA_X) {
    const x = ax(action);
    const top = battenMid(x) - BATTEN_H / 2;
    solid(list, cyl(x, BATTEN_Y + 0.8, 2.6, 2, 1.2, 20, 0.2), 'lo');
    solid(list, cyl(x, BATTEN_Y + 0.8, 1.3, 3.2, top - 3.2 - 1.2, 16), 'mid', { inner: sideArc(x, BATTEN_Y + 0.8, 1.3, (top + 3.2) / 2, P, 12) });
  }
  // The batten: lit, bent through the clamps and straight past the last one.
  const xs = xsBetween(BATTEN.x0, BATTEN.x1, 1.5);
  solid(list, edgePlate(xs, (x) => battenMid(x) + BATTEN_H / 2, (x) => battenMid(x) - BATTEN_H / 2, BATTEN_Y - BATTEN_T / 2, BATTEN_Y + BATTEN_T / 2), 'hi', { lit: true });
  // The clamp heads on the posts, each with its thumb screw toward the viewer.
  for (const action of DATA_X) {
    const x = ax(action);
    const mid = battenMid(x);
    solid(list, slab(box(x - 2.6, BATTEN_Y + BATTEN_T / 2, x + 2.6, BATTEN_Y + BATTEN_T / 2 + 2.6, 0.6), mid - 3.2, 6.4, 2, 0.3), 'mid');
    solid(list, discAlong([x, BATTEN_Y + BATTEN_T / 2 + 2.6, mid], [0, 1, 0], 1.6, 2.2, P, 16), 'mid');
  }
  PARTS.push({ kind: 'slot', slot: 'feeler' });
}

// ------------------------------------------------------------------ the rail, its stops and the scale
{
  const list = PARTS;
  const rail = box(RAIL.x0, RAIL.y0, RAIL.x1, RAIL.y1, 1);
  solid(list, slab(rail, 0, RAIL_TOP, 3, 0.5), 'mid', { inner: sideSeam(rail, RAIL_TOP - 1.6, P, 3) });
  // The action scale along the rail's front face, ticks every 0.05, long every 0.25.
  const ticks = sideTicks(ax(0), ax(1), SPAN / 20, 5, RAIL.y1, RAIL_TOP - 0.4, [1.2, 2.6], P, 'x');
  line(list, ticks.minor, 'lo');
  line(list, ticks.major, 'mid');
  // End stops.
  for (const x of [RAIL.x0 + 3, RAIL.x1 - 3]) {
    solid(list, slab(box(x - 3, RAIL.y0 - 1, x + 3, RAIL.y1 + 1, 0.6), RAIL_TOP, 7, 2, 0.4), 'lo');
    dots(list, [at([x, (RAIL.y0 + RAIL.y1) / 2, RAIL_TOP + 7])], 0.5, 'mid');
  }
  PARTS.push({ kind: 'slot', slot: 'stop' });
  PARTS.push({ kind: 'slot', slot: 'carriage' });
}

// ------------------------------------------------------------------ the moving parts
/** The stop at the data's edge: raised on the rail (searching inside the data) or folded down beside it. */
export function stopParts(raised: boolean): Part[] {
  const list: Part[] = [];
  const x = STOP_X + 3;
  // The hinge block on the rail's back side and its pin.
  solid(list, slab(box(x - 3.4, RAIL.y0 - 5, x + 3.4, RAIL.y0, 0.5), 0, 6, 2, 0.3), 'mid');
  if (raised) {
    solid(list, slab(box(x - 3, RAIL.y0 - 1, x + 3, RAIL.y1 + 1, 0.6), RAIL_TOP, 7, 2, 0.4), 'hi');
    dots(list, [at([x, (RAIL.y0 + RAIL.y1) / 2, RAIL_TOP + 7])], 0.5, 'mid');
  } else {
    solid(list, slab(box(x - 3, RAIL.y0 - 13, x + 3, RAIL.y0 - 5, 0.6), 0, 3, 2, 0.4), 'hi');
    dots(list, [at([x, RAIL.y0 - 9, 3])], 0.5, 'mid');
  }
  solid(list, discAlong([x - 3.4, RAIL.y0 - 2.5, 4.2], [-1, 0, 0], 1.4, 1.2, P, 14), 'lo');
  return list;
}

/** The carriage at action `action`: plate, bushings, post, the arm back over the template, and its knob. */
export function carriageParts(action: number): Part[] {
  const list: Part[] = [];
  const x = ax(action);
  const plate = box(x - CARRIAGE.half, CARRIAGE.y0, x + CARRIAGE.half, CARRIAGE.y1, 1.6);
  for (const [bx, by] of [[x - CARRIAGE.half + 4, RAIL.y0 - 1.5], [x + CARRIAGE.half - 4, RAIL.y0 - 1.5]] as Plane[]) {
    solid(list, slab(box(bx - 3, by - 2, bx + 3, by + 2, 0.5), RAIL_TOP - 1.5, 1.5, 2), 'lo');
  }
  solid(list, slab(plate, CARRIAGE.z, CARRIAGE.h, 3, 0.6), 'mid', { inner: sideSeam(plate, CARRIAGE.z + 1.6, P, 3) });
  for (const [sx, sy] of [[x - CARRIAGE.half + 3, CARRIAGE.y0 + 3], [x + CARRIAGE.half - 3, CARRIAGE.y0 + 3], [x - CARRIAGE.half + 3, CARRIAGE.y1 - 3], [x + CARRIAGE.half - 3, CARRIAGE.y1 - 3]] as Plane[]) {
    dots(list, [at([sx, sy, CARRIAGE.z + CARRIAGE.h])], 0.5, 'mid');
  }
  // The post, its collar and the clamp block that holds the arm.
  const base = CARRIAGE.z + CARRIAGE.h;
  solid(list, cyl(x, POST.y, POST.r + 2, base, 2.4, 24, 0.3), 'lo');
  solid(list, cyl(x, POST.y, POST.r, base + 2.4, ARM_Z - base - 6, 22), 'mid', { inner: sideArc(x, POST.y, POST.r, base + 20, P, 16) });
  // The arm: from the clamp back over the batten and the template, with a sleeve over each.
  solid(list, slab(box(x - 2.2, ARM_BACK - 3, x + 2.2, POST.y + 2, 0.8), ARM_Z - 4, 3.6, 2, 0.4), 'mid');
  solid(list, slab(box(x - 4.4, POST.y - 4.6, x + 4.4, POST.y + 4.6, 1.2), ARM_Z - 8, 10, 3, 0.5), 'mid');
  solid(list, discAlong([x, POST.y + 4.6, ARM_Z - 3], [0, 1, 0], 2.2, 3, P, 18), 'lo');
  // The two sleeves on the arm: the probe's at the back, the feeler's over the batten.
  solid(list, cyl(x, (TEMPLATE.y0 + TEMPLATE.y1) / 2, 2.8, ARM_Z - 0.4, 2.4, 18, 0.3), 'mid');
  solid(list, cyl(x, BATTEN_Y, 2.6, ARM_Z - 0.4, 2.4, 18, 0.3), 'mid');
  return list;
}

/** The feeler: a rod down from the arm's front sleeve, its foot resting on the batten. */
export function feelerParts(action: number): Part[] {
  const list: Part[] = [];
  const x = ax(action);
  const foot = battenMid(x) + BATTEN_H / 2;
  solid(list, cyl(x, BATTEN_Y, 0.9, foot + 1.6, ARM_Z - 4 - foot - 1.6, 14), 'hi');
  solid(list, cyl(x, BATTEN_Y, 2, foot, 1.6, 16, 0.2), 'hi');
  return list;
}

/** The probe: a plunger down from the arm's back sleeve; `drop` 0 is up, 1 resting on the template. */
export function probeParts(action: number, drop: number): Part[] {
  const list: Part[] = [];
  const x = ax(action);
  const y = (TEMPLATE.y0 + TEMPLATE.y1) / 2;
  const up = ARM_Z - 18;
  const rest = templateTop(x);
  const tip = up + (rest - up) * drop;
  solid(list, cyl(x, y, 1, tip + 2, ARM_Z - 4 - tip - 2, 14), 'hi');
  solid(list, cyl(x, y, 2.2, tip, 2, 16, 0.2), 'hi');
  return list;
}

/** Heights the figure reads at an action, in reward units: the batten's (predicted) and the template's (real). */
export const readingsAt = (action: number) => ({ predicted: predictedReward(action), real: realReward(action) });
