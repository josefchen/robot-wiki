/**
 * The puck-push test table for HindsightRelabel, drawn with the isometric kit.
 *
 * The object is the explanation: a robot arm clamped at the open end of a
 * short felt table has just pushed a puck, and the puck has stopped short of
 * the goal it was given. That goal is printed on the felt and marked by its
 * own pin. The goal the push is judged against is a hoop that a gantry holds
 * just above the felt: a rail along the table's far side on two posts, a
 * saddle on the rail, a beam it cantilevers over the felt and a carriage on
 * the beam, from which the hoop hangs on a drop arm. Judged against the given
 * goal, the hoop hangs round the pin, the puck lies outside it and the reward
 * flag on the carriage lies flat. Relabelling moves the hoop, the one lit
 * part, from the pin to where the puck stopped: the gantry carries it across,
 * it settles round the puck, and the flag rises. The push itself is the same:
 * its chalk trail runs across the felt from the start mark to the puck, and
 * the printed circle round the pin stays where the given goal was.
 *
 * World units are the figure's table units (lib/hindsight-push.ts), about
 * 1 px of the drawing: x along the table from the pusher's end, y toward the
 * viewer, z up from the felt. Static paths are built once; the gantry, the
 * hoop and the flag are slots the component fills with `movingAt(pose)`.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
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
import { barBetween, discAlong, prismAlong, viewOf } from '../prism.ts';
import { steadySolid } from '../steady-path.ts';
import { FELT, GIVEN_GOAL, GOAL_RADIUS, PUCK_END, PUCK_START, PUSH, type TablePoint } from '../../../lib/hindsight-push.ts';

export const WIDTH = 640;
export const AZIMUTH = 50;
export const ELEVATION = 36;

/** World units per table unit: one, so a distance on the felt is the distance the reward is judged by. */
export const S = 1;
/** A table point to the world: the felt centred on the origin. */
const CX = (FELT.left + FELT.right) / 2;
const CY = (FELT.top + FELT.bottom) / 2;
export const onFelt = ([x, y]: TablePoint): Plane => [(x - CX) * S, (y - CY) * S];

const FX = ((FELT.right - FELT.left) / 2) * S;
const FY = ((FELT.bottom - FELT.top) / 2) * S;
const TABLE: Plan = { x: -FX - 28, y: -FY - 13, w: 2 * FX + 36, d: 2 * FY + 21, r: 5 };
const TABLE_H = 8;
const FOOT_H = 6;
const FELT_Z = 1;
const CUSHION = { w: 4, h: 4.2 };
const PUCK = { r: 6, h: 4 };
/** The hoop: its centre line at the goal's radius, so a puck that stopped inside it has reached the goal. */
const HOOP = { outer: GOAL_RADIUS * S + 2.2, inner: GOAL_RADIUS * S - 2.2, z0: FELT_Z + 1.2, z1: FELT_Z + 3.8 };
/** The pin that marks the goal the robot was given. */
const PIN = { r: 1.1, h: 11, head: 3 };
/** The gantry: a rail along the table's far side on posts, a saddle, a beam it cantilevers, a carriage on the beam. */
const RAIL = { y: FY + 8.5, z: 25, x0: -FX + 4, x1: FX + 1, w: 4, h: 3.4 };
const BEAM = { w: 6, h: 4 };
const CARRIAGE = { w: 11, d: 9.6, h: 7 };
/** The pusher: a two-link arm on a turret at the table's open end, its pad resting where the stroke ended. */
const ARM = { base: [-FX - 17, onFelt(PUCK_START)[1]] as Plane, shoulderZ: 19, upper: 22, fore: 20 };
const LABEL: Plan = { x: -FX - 27, y: -FY - 8, w: 20, d: 11, r: 1.6 };

// ---------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const [x, y] of [[TABLE.x, TABLE.y], [TABLE.x + TABLE.w, TABLE.y], [TABLE.x, TABLE.y + TABLE.d], [TABLE.x + TABLE.w, TABLE.y + TABLE.d]] as const) {
  extremes.push([x, y, -TABLE_H - FOOT_H], [x, y, 0]);
}
for (const x of [RAIL.x0 - 6, RAIL.x1 + 6]) extremes.push([x, -RAIL.y - 3, RAIL.z + RAIL.h + 3], [x, -RAIL.y + 3, RAIL.z + RAIL.h + 3]);
// The drive motor at the rail's far end, the flag raised on the carriage over either goal, and the arm's shoulder.
for (const dy of [-4.6, 4.6]) extremes.push([RAIL.x1 + 13, -RAIL.y + dy, RAIL.z - 2.4], [RAIL.x1 + 13, -RAIL.y + dy, RAIL.z + RAIL.h + 11.4]);
for (const [gx, gy] of [onFelt(GIVEN_GOAL), onFelt(PUCK_END)]) extremes.push([gx + CARRIAGE.w / 2, gy + CARRIAGE.d / 2, RAIL.z + RAIL.h + CARRIAGE.h + 14]);
extremes.push([ARM.base[0], ARM.base[1], ARM.shoulderZ + 6]);
const FIT_PAD = 8;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const seam = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const X: Point3 = [1, 0, 0];
const Y: Point3 = [0, 1, 0];
const facing = Math.atan2(V[1], V[0]);

const steady = steadySolid;

// ---------------------------------------------------------------- parts
export type Slot = 'ringBack' | 'witness' | 'ringFront' | 'gantry';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 1 | 2 | 3; name?: string }
  | { kind: 'slot'; slot: Slot };
export type TablePart = Exclude<Part, { kind: 'slot' }>;

const list: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths: steady(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', name?: string) => {
  if (d) list.push({ kind: 'line', d, tone, free, name });
};
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points: points.map(at), size, tone });
const slot = (name: Slot) => list.push({ kind: 'slot', slot: name });

// The table: a thick top on four turned feet, with its edge seam and corner screws.
for (const [x, y] of byDepth(corners(TABLE, 18))) {
  solid(cyl(x, y, 7.4, -TABLE_H - FOOT_H, 1.6), 'lo');
  solid(cyl(x, y, 5.6, -TABLE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid');
}
solid(slab(TABLE, -TABLE_H, TABLE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(TABLE, -TABLE_H + 3, P, 8)) });
line(corners(TABLE, 6).map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
dots(corners(TABLE, 6).map(([x, y]) => [x, y, 0] as Point3), 0.5);

// The label plate on the open end's margin, behind the arm.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
line([0, 1, 2].map((row) => onTop([[LABEL.x + 5, LABEL.y + 3 + row * 2.6], [LABEL.x + (row === 1 ? 14 : 17), LABEL.y + 3 + row * 2.6]], 0.8, P)).join(''), 'lo', true);
dots([[LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8]], 0.4);

// The felt, inlaid flush and bound at its edge, and the cushions on its far side and far end.
const feltPlan: Plan = { x: -FX, y: -FY, w: 2 * FX, d: 2 * FY, r: 2 };
solid(slab(feltPlan, 0, FELT_Z, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(feltPlan, 1.6), FELT_Z, P, 3), 'faint');
for (const plan of [
  { x: -FX, y: -FY - CUSHION.w, w: 2 * FX + CUSHION.w, d: CUSHION.w, r: 1.6 },
  { x: FX, y: -FY - CUSHION.w, w: CUSHION.w, d: 2 * FY + 2 * CUSHION.w, r: 1.6 },
]) {
  solid(slab(plan, 0, CUSHION.h, 3, 0.5), 'mid', { inner: seam(sideSeam(plan, CUSHION.h - 1.8, P, 3)) });
}

// The marks the push left: the printed start mark, and the chalk trail the puck dragged from it to where it stopped.
{
  const [sx, sy] = onFelt(PUCK_START);
  const [ex, ey] = onFelt(PUCK_END);
  const path = PUSH.map(onFelt);
  // The trail is as wide as the puck: a band swept along the push, from the start mark's rim to under the puck.
  const from = path.findIndex(([x, y]) => Math.hypot(x - sx, y - sy) > PUCK.r + 1.4);
  const run = path.slice(Math.max(1, from) - 1);
  const normals = run.map((point, index) => {
    const a = run[Math.max(0, index - 1)]!;
    const b = run[Math.min(run.length - 1, index + 1)]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length] as Plane;
  });
  const side = (offset: number) => run.map(([x, y], index) => at([x + normals[index]![0] * offset, y + normals[index]![1] * offset, FELT_Z]));
  const half = PUCK.r * 0.86;
  list.push({ kind: 'face', d: pathOf([...side(half), ...side(-half).reverse()], true), fill: 3, name: 'trail' });
  // Streaks in the chalk, each from the start mark's rim, where it ends on the printed ring, to under the puck.
  const trim = (points: Plane[]): Plane[] => {
    const outside = (q: Plane) => Math.hypot(q[0] - sx, q[1] - sy) > PUCK.r + 1.4 && Math.hypot(q[0] - ex, q[1] - ey) > PUCK.r - 1;
    const cross = (a: Plane, b: Plane, cx: number, cy: number, r: number): Plane => {
      let lo = 0;
      let hi = 1;
      const inside = (t: number) => Math.hypot(a[0] + (b[0] - a[0]) * t - cx, a[1] + (b[1] - a[1]) * t - cy) < r;
      const startInside = inside(0);
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (inside(mid) === startInside) lo = mid;
        else hi = mid;
      }
      return [a[0] + (b[0] - a[0]) * hi, a[1] + (b[1] - a[1]) * hi];
    };
    const first = points.findIndex(outside);
    let last = points.length - 1;
    while (last > first && !outside(points[last]!)) last--;
    const kept = points.slice(first, last + 1);
    if (first > 0) kept.unshift(cross(points[first - 1]!, points[first]!, sx, sy, PUCK.r + 1.4));
    if (last < points.length - 1) kept.push(cross(points[last]!, points[last + 1]!, ex, ey, PUCK.r - 1));
    return kept;
  };
  const streaks: string[] = [];
  for (const offset of [-half * 0.62, -half * 0.12, half * 0.48]) {
    const offsetRun = run.map(([x, y], index) => [x + normals[index]![0] * offset, y + normals[index]![1] * offset] as Plane);
    streaks.push(pathOf(trim(offsetRun).map(([x, y]) => at([x, y, FELT_Z]))));
  }
  line(streaks.join(''), 'faint');
  line(ring(sx, sy, PUCK.r + 1.4, FELT_Z, P, 40), 'lo');
  line(ring(sx, sy, 0.9, FELT_Z, P, 12), 'lo');
}

// The gantry's rail along the table's far side, on two posts, with its drive motor at the far end.
{
  const y = -RAIL.y;
  for (const x of [RAIL.x0, RAIL.x1]) {
    solid(cyl(x, y, 3.6, 0, 1.8, 24, 0.3), 'mid');
    dots([0, 1, 2, 3].map((k) => [x + 2.6 * Math.cos(k * Math.PI / 2 + 0.4), y + 2.6 * Math.sin(k * Math.PI / 2 + 0.4), 1.8] as Point3), 0.32);
    solid(cyl(x, y, 2, 1.8, RAIL.z - 1.8, 20), 'mid', { inner: seam(sideArc(x, y, 2, 6, P, 12)) });
  }
  const plan: Plan = { x: RAIL.x0 - 4, y: y - RAIL.w / 2, w: RAIL.x1 - RAIL.x0 + 8, d: RAIL.w, r: 0.8 };
  solid(slab(plan, RAIL.z, RAIL.h, 2, 0.4), 'mid', { inner: seam(sideSeam(plan, RAIL.z + 1.2, P, 2)) });
  // The rail's scale: a tick every 8 units along its top, the long ones every 32.
  const ticks: string[] = [];
  for (let x = RAIL.x0; x <= RAIL.x1 + 0.01; x += 8) {
    // Every fourth tick runs across the rail's top, edge to edge; the others hang from its near edge.
    const long = Math.round((x - RAIL.x0) / 8) % 4 === 0;
    ticks.push(pathOf([at([x, y + RAIL.w / 2, RAIL.z + RAIL.h]), at([x, y + RAIL.w / 2 - (long ? RAIL.w : RAIL.w * 0.4), RAIL.z + RAIL.h])]));
  }
  line(ticks.join(''), 'lo');
  dots([RAIL.x0, RAIL.x1].map((x) => [x, y, RAIL.z + RAIL.h] as Point3), 0.42);
  // The drive: a gearbox on the rail's far end and its motor standing on it.
  const mx = RAIL.x1 + 4;
  const box: Plan = { x: mx, y: y - 4.6, w: 9, d: 9.2, r: 1 };
  solid(slab(box, RAIL.z - 2.4, RAIL.h + 4.8, 2, 0.4), 'mid', { inner: seam(sideSeam(box, RAIL.z + 0.4, P, 2)) });
  solid(cyl(mx + 4.5, y, 3.6, RAIL.z + RAIL.h + 2.4, 7.6, 28, 0.4), 'mid', { inner: seam(sideArc(mx + 4.5, y, 3.6, RAIL.z + RAIL.h + 7, P, 20)) });
  solid(cyl(mx + 4.5, y, 2.2, RAIL.z + RAIL.h + 10, 1.4, 24, 0.3), 'mid');
}

// The hoop's far half, the given goal's pin and its printed circle, the puck, then the hoop's near half.
slot('ringBack');
slot('witness');
{
  const [gx, gy] = onFelt(GIVEN_GOAL);
  solid(cyl(gx, gy, 2.8, FELT_Z, 0.9, 28, 0.3), 'mid', { name: 'goal-pin-base' });
  solid(cyl(gx, gy, PIN.r, FELT_Z + 0.9, PIN.h, 16), 'mid', { name: 'goal-pin' });
  solid(cyl(gx, gy, PIN.head, FELT_Z + 0.9 + PIN.h, 2.6, 28, 0.9), 'hi', { name: 'goal-pin-head' });
}
{
  const [px, py] = onFelt(PUCK_END);
  solid(cyl(px, py, PUCK.r, FELT_Z, PUCK.h, 48, 0.6), 'hi', { inner: seam(sideArc(px, py, PUCK.r, FELT_Z + PUCK.h / 2, P, 32)), name: 'puck' });
  line(ring(px, py, PUCK.r - 2.2, FELT_Z + PUCK.h, P, 36), 'lo');
  dots([[px, py, FELT_Z + PUCK.h]], 0.6, 'lo');
}
slot('ringFront');

// The pusher: a turret clamped on the open end, a shoulder, two links and the pad that struck the puck.
{
  const [bx, by] = ARM.base;
  const foot: Plan = { x: bx - 7.6, y: by - 7.6, w: 15.2, d: 15.2, r: 1.8 };
  solid(slab(foot, 0, 2.6, 3, 0.4), 'mid', { inner: seam(sideSeam(foot, 1.2, P, 3)) });
  dots(corners(foot, 2).map(([x, y]) => [x, y, 2.6] as Point3), 0.42);
  solid(cyl(bx, by, 5.4, 2.6, ARM.shoulderZ - 2.6 - 4, 32, 0.4), 'mid', { inner: seam(sideArc(bx, by, 5.4, 7, P, 20)) });
  const shoulder: Point3 = [bx, by, ARM.shoulderZ];
  // The pad rests where the stroke ended, just behind the start mark, at the puck's height.
  const [sx, sy] = onFelt(PUCK_START);
  const wrist: Point3 = [sx - PUCK.r - 4.6, sy, FELT_Z + PUCK.h + 6.4];
  const dx = wrist[0] - shoulder[0];
  const dz = wrist[2] - shoulder[2];
  const reach = Math.min(Math.hypot(dx, dz), ARM.upper + ARM.fore - 0.01);
  const toward = Math.atan2(dz, dx);
  const bend = Math.acos((ARM.upper * ARM.upper + reach * reach - ARM.fore * ARM.fore) / (2 * ARM.upper * reach));
  const elbow: Point3 = [shoulder[0] + ARM.upper * Math.cos(toward + bend), by, shoulder[2] + ARM.upper * Math.sin(toward + bend)];
  solid(discAlong([bx, by - 6, ARM.shoulderZ], Y, 6, 12, P, 32, 0.5), 'mid');
  solid(discAlong([bx, by + 6, ARM.shoulderZ], Y, 2.4, 0.8, P, 20, 0.2), 'lo');
  solid(barBetween([shoulder[0], by, shoulder[2]], elbow, Y, 5.2, 4.6, P, 0.4), 'mid');
  solid(discAlong([elbow[0], by - 3.4, elbow[2]], Y, 3.8, 6.8, P, 28, 0.4), 'mid');
  solid(barBetween(elbow, wrist, Y, 4.4, 3.8, P, 0.3), 'mid');
  solid(discAlong([wrist[0], by - 2.8, wrist[2]], Y, 2.8, 5.6, P, 24, 0.3), 'mid');
  // The pad on its stem: a block with a rubber face toward the puck's start mark.
  solid(barBetween(wrist, [wrist[0], by, FELT_Z + PUCK.h / 2 + 2.4], Y, 2.2, 2.2, P, 0.2), 'mid');
  solid(slab({ x: wrist[0] - 2.2, y: by - 5.4, w: 4.4, d: 10.8, r: 0.9 }, FELT_Z + 0.4, PUCK.h + 1.2, 2, 0.4), 'mid');
  solid(slab({ x: wrist[0] + 2.2, y: by - 5, w: 1.2, d: 10, r: 0.3 }, FELT_Z + 0.6, PUCK.h + 0.8, 1), 'lo', { name: 'pad' });
}

// The gantry's saddle, beam, carriage and the drop arm the hoop hangs from move with the hoop.
slot('gantry');

// The near cushion, in front of everything on the felt.
{
  const plan: Plan = { x: -FX, y: FY, w: 2 * FX + CUSHION.w, d: CUSHION.w, r: 1.6 };
  solid(slab(plan, 0, CUSHION.h, 3, 0.5), 'mid', { inner: seam(sideSeam(plan, CUSHION.h - 1.8, P, 3)) });
}

export const PARTS: readonly Part[] = list;

// ---------------------------------------------------------------- moving parts
export interface TablePose {
  /** The hoop's centre, in table points, and how far the reward flag has risen (0 down, 1 up). */
  goal: TablePoint;
  flag: number;
  /** Whether the push is judged against where it ended: then the given goal's printed circle shows round its pin. */
  relabelled: boolean;
}

/** One half of the hoop: its top as an annulus with a hole the felt shows through, and, for the near half, its side band. */
function ringHalf([gx, gy]: Plane, back: boolean): SolidPaths {
  const steps = 48;
  const outerTop: Flat[] = [];
  const innerTop: Flat[] = [];
  const outerLow: Flat[] = [];
  const innerLow: Flat[] = [];
  // The half away from (back) or toward (front) the viewer, cut across the view at the hoop's centre.
  const a0 = back ? facing + Math.PI / 2 : facing - Math.PI / 2;
  for (let k = 0; k <= steps; k++) {
    const a = a0 + (k / steps) * Math.PI;
    outerTop.push(at([gx + HOOP.outer * Math.cos(a), gy + HOOP.outer * Math.sin(a), HOOP.z1]));
    innerTop.push(at([gx + HOOP.inner * Math.cos(a), gy + HOOP.inner * Math.sin(a), HOOP.z1]));
    outerLow.push(at([gx + HOOP.outer * Math.cos(a), gy + HOOP.outer * Math.sin(a), HOOP.z0]));
    innerLow.push(at([gx + HOOP.inner * Math.cos(a), gy + HOOP.inner * Math.sin(a), HOOP.z0]));
  }
  const top = pathOf([...outerTop, ...[...innerTop].reverse()], true);
  if (back) {
    // The far half shows its top and, through the hole, the inside of its wall.
    const wall = pathOf([...innerTop, ...[...innerLow].reverse()], true);
    return { fill: top + wall, outline: pathOf(outerTop) + pathOf(innerTop) + pathOf(innerLow), crease: '', top, shades: ['', '', wall, ''] };
  }
  const band = pathOf([...outerTop, ...[...outerLow].reverse()], true);
  const outline = pathOf(outerLow) + pathOf(innerTop) + pathOf([outerTop[0]!, outerLow[0]!]) + pathOf([outerTop[steps]!, outerLow[steps]!]);
  return { fill: top + band, outline, crease: pathOf(outerTop), top, shades: ['', band, '', ''] };
}

/** The gantry at a goal: a saddle on the far rail at the goal's x, the beam it cantilevers over the felt, the carriage at
 * the goal's y with the reward flag on its top, and the drop arm down to the hoop. */
function gantryParts([gx, gy]: Plane, rise: number): TablePart[] {
  const parts: TablePart[] = [];
  const bz = RAIL.z + RAIL.h;
  const saddle: Plan = { x: gx - 6, y: -RAIL.y - RAIL.w / 2 - 1.4, w: 12, d: RAIL.w + 2.8, r: 0.8 };
  parts.push({ kind: 'solid', paths: slab(saddle, RAIL.z - 1.8, RAIL.h + 1.8 + 2.4, 2, 0.3), tone: 'mid', inner: seam(sideSeam(saddle, RAIL.z, P, 2)) });
  parts.push({ kind: 'dots', points: [[gx - 4, -RAIL.y + RAIL.w / 2 + 1.4], [gx + 4, -RAIL.y + RAIL.w / 2 + 1.4]].map(([x, y]) => at([x!, y!, RAIL.z + RAIL.h + 2.4])), size: 0.4, tone: 'mid' });
  const beamPlan: Plan = { x: gx - BEAM.w / 2, y: -RAIL.y, w: BEAM.w, d: RAIL.y + gy + CARRIAGE.d / 2 + 3, r: 0.8 };
  parts.push({ kind: 'solid', paths: slab(beamPlan, bz, BEAM.h, 2, 0.4), tone: 'mid', inner: seam(sideSeam(beamPlan, bz + 1.6, P, 2)) });
  const carriage: Plan = { x: gx - CARRIAGE.w / 2, y: gy - CARRIAGE.d / 2, w: CARRIAGE.w, d: CARRIAGE.d, r: 1.2 };
  parts.push({ kind: 'solid', paths: slab(carriage, bz - 2.4, CARRIAGE.h, 3, 0.5), tone: 'mid', inner: seam(sideSeam(carriage, bz + 1, P, 3)) });
  parts.push({ kind: 'dots', points: corners(carriage, 1.9).map(([x, y]) => at([x, y, bz - 2.4 + CARRIAGE.h])), size: 0.42, tone: 'mid' });
  // The reward flag on the carriage: a mast, a pivot, and the flag, lying along the beam (0) or raised (1).
  const top = bz - 2.4 + CARRIAGE.h;
  parts.push(...flagParts([gx + CARRIAGE.w / 2 - 2.4, gy + CARRIAGE.d / 2 - 2, top], rise));
  // The hanger: a boss under the carriage, an arm out toward the far rail, and a rod straight down to a yoke on the hoop's rim.
  const hy = gy - (HOOP.outer + HOOP.inner) / 2;
  const armZ = bz - 7;
  parts.push({ kind: 'solid', paths: barBetween([gx, gy, bz - 2.4], [gx, gy, armZ - 1.4], X, 3.6, 3.6, P, 0.3), tone: 'mid' });
  parts.push({ kind: 'solid', paths: barBetween([gx, gy + 1.6, armZ], [gx, hy - 1.2, armZ], X, 2.4, 2.8, P, 0.2), tone: 'mid' });
  parts.push({ kind: 'solid', paths: cyl(gx, hy, 0.9, HOOP.z1 + 1.6, armZ - 1.4 - HOOP.z1 - 1.6, 14), tone: 'mid' });
  // A clamp straddling the hoop's band where the rod meets it.
  const clamp: Plan = { x: gx - 1.8, y: hy - (HOOP.outer - HOOP.inner) / 2 - 0.6, w: 3.6, d: HOOP.outer - HOOP.inner + 1.2, r: 0.4 };
  parts.push({ kind: 'solid', paths: slab(clamp, HOOP.z1, 1.6, 1, 0.2), tone: 'mid' });
  return parts;
}

/** The reward flag on the carriage: a short mast, a pivot boss, the flag swung from lying flat (0) to raised (1). */
function flagParts([fx, fy, fz]: Point3, rise: number): TablePart[] {
  const parts: TablePart[] = [];
  parts.push({ kind: 'solid', paths: cyl(fx, fy, 1.2, fz, 4.4, 16), tone: 'mid' });
  const pivot: Point3 = [fx, fy + 1.2, fz + 4.4];
  parts.push({ kind: 'solid', paths: discAlong([fx, fy, fz + 4.4], Y, 1.9, 2.4, P, 20, 0.2), tone: 'mid' });
  // Down, the flag lies back along the beam toward the far rail; up, it stands above the mast.
  const angle = ((-90 + rise * 90) * Math.PI) / 180;
  const u: Point3 = [0, Math.sin(angle), Math.cos(angle)];
  const w: Point3 = [1, 0, 0];
  const normal: Point3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const corner = (along: number, across: number): Point3 => [pivot[0] + u[0] * along + w[0] * across, pivot[1] + u[1] * along, pivot[2] + u[2] * along];
  const staff = [corner(1.6, -0.6), corner(12, -0.6), corner(12, 0.6), corner(1.6, 0.6)];
  parts.push({ kind: 'solid', paths: plateBetween(staff, normal, 0.8), tone: 'mid' });
  const cloth = [corner(5.6, 0.6), corner(12, 0.6), corner(12, 8.4), corner(5.6, 8.4)];
  parts.push({ kind: 'solid', paths: plateBetween(cloth, normal, 0.7), tone: rise > 0.5 ? 'hi' : 'mid', name: 'flag' });
  return parts;
}

/** A thin plate through a quadrilateral, swept a little along `normal`. */
function plateBetween(quad: Point3[], normal: Point3, depth: number): SolidPaths {
  const along: Point3 = [normal[0] * depth, normal[1] * depth, normal[2] * depth];
  return prismAlong(quad, along, P, { bevel: 0.15 });
}

const steadyParts = (parts: TablePart[]): TablePart[] => parts.map((part) => (part.kind === 'solid' ? { ...part, paths: steady(part.paths) } : part));

export function movingAt(pose: TablePose): Record<Slot, TablePart[]> {
  const raw = movingRaw(pose);
  return { ringBack: raw.ringBack, witness: raw.witness, ringFront: raw.ringFront, gantry: steadyParts(raw.gantry) };
}

function movingRaw(pose: TablePose): Record<Slot, TablePart[]> {
  const g = onFelt(pose.goal);
  const [wx, wy] = onFelt(GIVEN_GOAL);
  return {
    ringBack: [{ kind: 'solid', paths: ringHalf(g, true), tone: 'hi', lit: true, name: 'ring-back' }],
    // Once the hoop has left it, the given goal shows as the circle printed round its pin.
    witness: pose.relabelled
      ? [{ kind: 'line', d: ring(wx, wy, GOAL_RADIUS * S, FELT_Z, P, 56) + ring(wx, wy, GOAL_RADIUS * S - 1.6, FELT_Z, P, 56), tone: 'lo', name: 'given-goal' }]
      : [],
    ringFront: [{ kind: 'solid', paths: ringHalf(g, false), tone: 'hi', lit: true, name: 'ring-front' }],
    gantry: gantryParts(g, pose.flag),
  };
}

/**
 * A pose: `{ goal: 'given' | 'reached' }` at rest, or `{ share, flag, relabelled }` for a moment of the move, where
 * `share` runs from the given goal (0) to where the puck ended (1).
 */
export function poseFrom(raw: { goal?: 'given' | 'reached'; share?: number; flag?: number; relabelled?: boolean }): TablePose {
  const share = raw.share ?? (raw.goal === 'reached' ? 1 : 0);
  return {
    goal: [GIVEN_GOAL[0] + (PUCK_END[0] - GIVEN_GOAL[0]) * share, GIVEN_GOAL[1] + (PUCK_END[1] - GIVEN_GOAL[1]) * share],
    flag: raw.flag ?? (share >= 1 ? 1 : 0),
    relabelled: raw.relabelled ?? share > 0,
  };
}

export const SCREEN = { at, onFelt };
