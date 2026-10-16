/**
 * The four-pin lock for BearCaseLock, drawn with the isometric kit.
 *
 * The object is the explanation. The bear case rests on four premises, and
 * the article names the one result that would break each: a verified
 * deployment of 10,000 humanoids doing documented work, one policy above
 * 90% across more than ten unseen homes, a cost-per-task parity analysis,
 * and a real-world success-rate scaling law across tasks. A pin-tumbler lock
 * works the same way: one pin per premise, and the plug turns only when
 * every pin's split sits on the shear line. A result that has not arrived
 * leaves its key pin standing above the line; partial evidence leaves it
 * closer; the result itself sets it on the line. The housing is cut away in
 * front of the pins, so the four stacks, their springs and the line (the
 * one lit part) are in view. When all four sit on the line the plug turns a
 * quarter, the key turns with it and the bolt draws back out of its keeper.
 *
 * Each pin's status is the bear-case watchlist's own call (lib/bear-case.ts,
 * August 2026). How far a pin stands above the line only shows that call:
 * the heights are illustrative.
 *
 * World units are about a quarter of a millimetre of a training lock: x
 * along the plug, y toward the viewer, z up. Every static path is built
 * once here; the pins, springs, plug face, key and bolt are rebuilt by the
 * builders below, which are cheap.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  roundedPlan,
  segment,
  sideArc,
  sideSeam,
  slabOf,
  towardViewer,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong, plateIn, prismAlong, roundedOutline } from '../prism.ts';
import { MILESTONES } from '../../../lib/bear-case.ts';

export const WIDTH = 600;
export const AZIMUTH = 68;
export const ELEVATION = 22;

// ------------------------------------------------------------------ the model
export type PinStatus = 'not-met' | 'partial' | 'met';

/** The four premises, in the article's order, each with the watchlist milestone that tracks its breaking result. */
export const PREMISES = [
  { id: 'commercial', milestone: 'ten-thousand-unit-deployment', label: '10,000 at work', premise: 'commercial viability', result: 'a verified deployment of 10,000 humanoids doing documented work' },
  { id: 'generalization', milestone: 'unseen-homes-policy', label: '90% in unseen homes', premise: 'generalization', result: 'one policy above 90% across more than ten unseen homes' },
  { id: 'form-factor', milestone: 'cost-per-task-parity', label: 'Cost-per-task parity', premise: 'form factor', result: 'a published cost-per-task parity analysis' },
  { id: 'plateau', milestone: 'data-scaling-law', label: 'Success scaling law', premise: 'plateau', result: 'a real-world success-rate scaling law across tasks' },
] as const;
export type PremiseId = (typeof PREMISES)[number]['id'];

/** The watchlist's status call for each premise's result (lib/bear-case.ts). */
export function statusOf(id: PremiseId): PinStatus {
  const premise = PREMISES.find((candidate) => candidate.id === id)!;
  const milestone = MILESTONES.find((row) => row.id === premise.milestone);
  if (!milestone) throw new Error(`bear-case: no milestone ${premise.milestone}`);
  return milestone.status;
}

/** How far a key pin's top stands above the shear line for each call (illustrative heights, world units). */
export const LIFT: Record<PinStatus, number> = { 'not-met': 10, partial: 4.5, met: 0 };

/** A pin's lift: on the line when its result is supposed to have arrived, otherwise where the watchlist's call puts it. */
export const liftFor = (id: PremiseId, supposed: boolean) => (supposed ? 0 : LIFT[statusOf(id)]);

/** The plug turns only when every pin's split is on the shear line. */
export const opens = (lifts: readonly number[]) => lifts.length === PREMISES.length && lifts.every((lift) => lift === 0);

/** How far the plug turns when it opens, in radians: 75 degrees, top toward the viewer, so the pin holes stay in view. */
export const TURN = (75 * Math.PI) / 180;

// ----------------------------------------------------------------- the layout
const PLATE: Plan = { x: -132, y: -46, w: 250, d: 114, r: 10 };
const PLATE_Z = 10;
const PLATE_H = 7;
export const TOP = PLATE_Z + PLATE_H;

/** The cylinder housing: a lower body and an upper body cut away in front of the pins. */
const HX0 = -84;
const HX1 = 72;
const HY = 30;
const HB = TOP + 12;
export const AXIS_Z = HB + 27;
export const PLUG_R = 17;
/** The shear line: where the plug's top meets the housing. */
export const SHEAR_Z = AXIS_Z + PLUG_R;
const HT = 110;
/** The cut-away window starts here and runs out to the housing's key end. */
const WINDOW_X = -58;

/** The four pin chambers, in the premises' order from the back of the lock to the key end. */
export const PIN_X = [-40, -14, 12, 38] as const;
export const PIN_R = 3.4;
const BORE_R = 4.6;
const BORE_TOP = HT - 5;
export const DRIVER_LENGTH = 11;

/** The lock case at the back end, its bolt and the keeper on the base in front of it. */
const CASE: Plan = { x: -122, y: -38, w: 36, d: 76, r: 2 };
const CASE_TOP = 116;
const BOLT_X = -113;
const BOLT_W = 18;
const BOLT_Z = TOP + 18;
const BOLT_H = 10;
const KEEPER_Y = 50;
const KEEPER_D = 12;
/** How far the bolt stands out of the case: into the keeper when locked, drawn back when the plug has turned. */
const BOLT_OUT = 15;
const BOLT_IN = 3;

/** The key end: the plug stands out of the housing's end face, and the key's bow stands out of the plug. */
const FACE_X = HX1;
const FACE_DEPTH = 3;
const BOW_X0 = FACE_X + FACE_DEPTH + 4.4;
const BOW_X1 = BOW_X0 + 24;
const BOW_HALF = 12.5;
const BOW_T = 2.6;

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(PLATE, 10)) extremes.push([px, py, 0], [px, py, TOP]);
for (const [px, py] of roundedPlan(CASE, 2)) extremes.push([px, py, CASE_TOP]);
// The key's bow at rest (upright) and turned (flat), so the fit holds both.
extremes.push([BOW_X1, 0, AXIS_Z + BOW_HALF], [BOW_X1, BOW_HALF, AXIS_Z], [BOW_X1, -BOW_HALF, AXIS_Z]);
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unit));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 8;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const box = (x0: number, x1: number, y0: number, y1: number, r = 0): Plan => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
/** A closed path through world points (a face drawn in its own plane). */
const face3 = (points: Point3[]) => pathOf(points.map(at), true);
/** A rectangle in the vertical plane y = `y`, from (x0, z0) to (x1, z1). */
const rectY = (y: number, x0: number, x1: number, z0: number, z1: number) => face3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);

// ------------------------------------------------------------------- parts
export type Slot = 'bolt' | 'plug' | 'pins' | 'face' | 'key';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
const into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => into.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => into.push({ kind: 'face', d, fill });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
/** A slotted screw head on a top face. */
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
/** A slotted screw head on a vertical face facing +y, at (x, y, z). */
function frontScrew(x: number, y: number, z: number, r = 1.7) {
  const points: Point3[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    points.push([x + r * Math.cos(a), y, z + r * Math.sin(a)]);
  }
  line(face3(points), 'lo');
  line(segment([x - r * 0.7, y, z - r * 0.7], [x + r * 0.7, y, z + r * 0.7], P), 'lo');
}
/** A slotted screw head on a vertical face facing +x, at (x, y, z). */
function endScrew(x: number, y: number, z: number, r = 1.7) {
  const points: Point3[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    points.push([x, y + r * Math.cos(a), z + r * Math.sin(a)]);
  }
  line(face3(points), 'lo');
  line(segment([x, y - r * 0.7, z - r * 0.7], [x, y + r * 0.7, z + r * 0.7], P), 'lo');
}

// ------------------------------------------------------------------ the base
for (const [x, y] of byDepth(corners(PLATE, 13))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, PLATE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, PLATE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, PLATE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(PLATE, PLATE_Z, PLATE_H, 10, 1.2), 'lo', { inner: sideSeam(PLATE, PLATE_Z + 2.6, P, 10) });
line(planOutline(insetPlan(PLATE, 4.5), TOP, P, 10), 'faint');
for (const [x, y] of corners(PLATE, 10)) screw(x, y, TOP, 2.1);
// The maker's plate on the base's front; its rule lines stand for print.
const LABEL: Plan = { x: -18, y: 44, w: 50, d: 12, r: 1.6 };
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
line(planOutline(insetPlan(LABEL, 1.6), TOP + 0.8, P, 3), 'faint');
for (const [k, share] of [[0, 0.82], [1, 0.6], [2, 0.42]] as const) {
  const y = LABEL.y + 3.6 + k * 3.4;
  line(lineOnTop([LABEL.x + 6, y], [LABEL.x + 6 + (LABEL.w - 14) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');

// ------------------------------------------------------------- the lock case
{
  solid(slab(CASE, TOP, CASE_TOP - TOP, 2, 0.8), 'mid', { inner: sideSeam(CASE, CASE_TOP - 9, P, 2) });
  line(planOutline(insetPlan(CASE, 3.5), CASE_TOP, P, 2), 'faint');
  for (const [x, y] of corners(CASE, 6)) screw(x, y, CASE_TOP, 1.7);
  // The case's front plate: the bolt runs out through its slot.
  const front = CASE.y + CASE.d;
  line(rectY(front, BOLT_X - 1.4, BOLT_X + BOLT_W + 1.4, BOLT_Z - 1.4, BOLT_Z + BOLT_H + 1.4), 'lo');
  // The case's cover plate: an inset panel on the front, screwed at its corners.
  line(rectY(front, CASE.x + 2.6, CASE.x + CASE.w - 2.6, TOP + 3, CASE_TOP - 11), 'faint');
  for (const [x, z] of [[CASE.x + 6, TOP + 7], [CASE.x + CASE.w - 6, TOP + 7], [CASE.x + 6, CASE_TOP - 15], [CASE.x + CASE.w - 6, CASE_TOP - 15]] as const) frontScrew(x, front, z, 1.6);
}
// The bolt runs out of the case toward the keeper, a block bolted to the base in front of the case.
slot('bolt');
const KEEPER: Plan = { x: BOLT_X - 5, y: KEEPER_Y, w: BOLT_W + 10, d: KEEPER_D, r: 1.4 };
const KEEPER_TOP = BOLT_Z + BOLT_H + 3;
solid(slab({ x: KEEPER.x - 4, y: KEEPER.y - 2, w: KEEPER.w + 8, d: KEEPER.d + 4, r: 1.6 }, TOP, 2.4, 2, 0.4), 'lo');
for (const [x, y] of [[KEEPER.x - 1.6, KEEPER.y + 2], [KEEPER.x - 1.6, KEEPER.y + KEEPER.d - 2], [KEEPER.x + KEEPER.w + 1.6, KEEPER.y + 2], [KEEPER.x + KEEPER.w + 1.6, KEEPER.y + KEEPER.d - 2]] as Plane[]) dots([at([x, y, TOP + 2.4])], 0.5, 'mid');
solid(slab(KEEPER, TOP + 2.4, KEEPER_TOP - TOP - 2.4, 2, 0.6), 'mid', { inner: sideSeam(KEEPER, KEEPER_TOP - 4, P, 2) });
line(planOutline(insetPlan(KEEPER, 2.4), KEEPER_TOP, P, 2), 'faint');
for (const x of [KEEPER.x + 4, KEEPER.x + KEEPER.w - 4]) screw(x, KEEPER.y + KEEPER.d / 2, KEEPER_TOP, 1.5);
// The keeper's strike plate on its front face, with its two screws.
line(rectY(KEEPER.y + KEEPER.d, KEEPER.x + 2.2, KEEPER.x + KEEPER.w - 2.2, TOP + 5, KEEPER_TOP - 6), 'faint');
for (const x of [KEEPER.x + 5.4, KEEPER.x + KEEPER.w - 5.4]) frontScrew(x, KEEPER.y + KEEPER.d, (TOP + KEEPER_TOP) / 2 - 0.5, 1.3);

// ------------------------------------------------------------- the supports
for (const [x0, x1] of [[-76, -56], [38, 58]] as const) {
  const plan = box(x0, x1, -26, 26, 1.4);
  solid(slab(plan, TOP, HB - TOP, 2, 0.5), 'mid', { inner: sideSeam(plan, TOP + 3, P, 2) });
  for (const x of [x0 + 5, x1 - 5]) frontScrew(x, 26, TOP + 6.5, 1.4);
}

// ------------------------------------------------------------- the housing
// The lower body runs the housing's length; the plug's lower half lies in it.
{
  const plan = box(HX0, HX1, -HY, HY, 1.6);
  solid(slab(plan, HB, AXIS_Z - HB, 2, 0.6), 'mid', { inner: sideSeam(plan, HB + 6, P, 2) });
  // Two screws hold the lower body to its supports, from the front face.
  for (const x of [-66, 48]) frontScrew(x, HY, HB + 12, 1.7);
}
// The upper body: the full length behind the plug's axis, and only the back end in front of it: the cut-away.
{
  const outline: Plane[] = [
    [HX0, -HY],
    [HX1, -HY],
    [HX1, 0],
    [WINDOW_X, 0],
    [WINDOW_X, HY],
    [HX0, HY],
  ];
  // The inner corner of the cut, where the window's left wall meets the section face, has no silhouette of its own.
  const corner = segment([WINDOW_X, 0, AXIS_Z], [WINDOW_X, 0, HT], P);
  solid(extrude(outline, AXIS_Z, HT - AXIS_Z, P, { convex: false, bevel: 0.6 }), 'mid', { inner: corner });
  line(planOutline(box(HX0 + 4, HX1 - 4, -HY + 4, -4, 1), HT, P, 2), 'faint');
  for (const [x, y] of [[HX0 + 8, -HY + 8], [HX0 + 8, HY - 8], [HX1 - 8, -HY + 8], [-6, -HY + 8]] as Plane[]) screw(x, y, HT, 1.7);
}
// The pin chambers, cut open: half-bores in the section face from the shear line up to the springs' seat.
for (const x of PIN_X) {
  face(rectY(0, x - BORE_R, x + BORE_R, SHEAR_Z, BORE_TOP), 0);
  face(rectY(0, x + BORE_R * 0.4, x + BORE_R, SHEAR_Z, BORE_TOP), 1);
  line(pathOf([at([x - BORE_R, 0, SHEAR_Z]), at([x - BORE_R, 0, BORE_TOP]), at([x + BORE_R, 0, BORE_TOP]), at([x + BORE_R, 0, SHEAR_Z])]), 'lo');
  // Each chamber is drilled from the top and closed by a cap plug, cut in half with the housing.
  face(rectY(0, x - BORE_R, x + BORE_R, BORE_TOP, HT), 2);
  line(rectY(0, x - BORE_R, x + BORE_R, BORE_TOP, HT), 'lo');
  const cap: Plane[] = [];
  for (let k = 0; k <= 12; k++) cap.push([x + BORE_R * Math.cos(Math.PI + (k / 12) * Math.PI), BORE_R * Math.sin(Math.PI + (k / 12) * Math.PI)]);
  line(pathOf(cap.map(([px, py]) => at([px, py, HT]))), 'lo');
}

// ------------------------------------------------------------------ the plug
// The plug, the one lit part: its top edge along the cut is the shear line. The pins stand in front of it.
slot('plug');
slot('pins');

// --------------------------------------------------------------- the key end
for (const [y, z] of [[-HY + 6, HB + 7], [HY - 6, HB + 7]] as const) endScrew(HX1, y, z, 1.6);
slot('face');
slot('key');

// ---------------------------------------------------------- the moving parts
const X: Point3 = [1, 0, 0];
/** The unit direction in the plug's cross-section at angle `phi` (0 toward the viewer's side, +y; pi/2 straight up). */
const radial = (phi: number): Point3 => [0, Math.cos(phi), Math.sin(phi)];

/** The plug's visible quarter in the window: from the front of the ledge up to the shear line. Its shape does not change as it turns. */
export function plugParts(turn: number): Part[] {
  const parts: Part[] = [];
  const quarter: Point3[] = [[WINDOW_X, 0, AXIS_Z]];
  for (let k = 0; k <= 18; k++) {
    const phi = (k / 18) * (Math.PI / 2);
    quarter.push([WINDOW_X, PLUG_R * Math.cos(phi), AXIS_Z + PLUG_R * Math.sin(phi)]);
  }
  parts.push({ kind: 'solid', paths: prismAlong(quarter, [HX1 - WINDOW_X, 0, 0], P, { round: true }), tone: 'hi', lit: true });
  // The pin holes ride the plug round as it turns.
  for (const x of PIN_X) {
    const phi = Math.PI / 2 - turn;
    if (phi < 0.2) continue;
    const n = radial(phi);
    const centre: Point3 = [x, PLUG_R * n[1], AXIS_Z + PLUG_R * n[2]];
    const hole = holeRing(centre, n, PIN_R + 0.6);
    parts.push({ kind: 'line', d: hole, tone: 'lo' });
  }
  return parts;
}

/** A ring of `radius` on the plug's surface round `centre`, in the tangent plane at right angles to `normal`. */
function holeRing(centre: Point3, normal: Point3, radius: number) {
  // The surface is nearly flat across a pin, so the ring is drawn in the tangent plane: along the plug and round it.
  const round: Point3 = [0, -normal[2], normal[1]];
  const points: Point3[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const [c, s] = [radius * Math.cos(a), radius * Math.sin(a)];
    points.push([centre[0] + c, centre[1] + s * round[1], centre[2] + s * round[2]]);
  }
  return face3(points);
}

/** The key pins are brass: their sides in the darkest shade, so the split between key pin and driver reads at a glance. */
const darker = (paths: SolidPaths): SolidPaths => ({ ...paths, shades: [paths.shades.join(''), '', '', ''] });

/** A vertical coil round (cx, cy) from z0 to z1, split into the half behind the axis and the half in front. */
function coilUp(cx: number, cy: number, radius: number, z0: number, z1: number, turns: number) {
  const [vx, vy] = towardViewer(P);
  // Start on the side toward the viewer, so the first coil sits on the driver's top rim, and finish on the cut
  // plane at the coil's far left, where the last coil meets the chamber's top edge.
  const start = Math.atan2(vy, vx);
  const total = turns + (((Math.PI - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
  const count = Math.max(8, Math.round(total * 24));
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let k = 0; k <= count; k++) {
    const share = k / count;
    const angle = start + share * total * Math.PI * 2;
    const point: Point3 = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z0 + (z1 - z0) * share];
    // A tolerance, so a sample exactly on the limb falls the same way in every JavaScript engine (server and browser).
    const facing = Math.cos(angle) * vx + Math.sin(angle) * vy > 1e-9;
    const flat = at(point);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(''), front: front.join('') };
}

/** One pin stack at `lift` above the shear line: the key pin up to the split, the driver pin above it, the spring above that. */
export function pinParts(index: number, lift: number, turn: number): Part[] {
  const x = PIN_X[index]!;
  const parts: Part[] = [];
  // The key pin shows only above the shear line; on the line it lies flush in the plug and turns with it.
  if (lift > 0.05) {
    parts.push({ kind: 'solid', paths: darker(cyl(x, 0, PIN_R, SHEAR_Z - 0.2, lift + 0.2, 28, 0.3)), tone: 'hi' });
  } else if (turn > 0.02) {
    const phi = Math.PI / 2 - turn;
    if (phi >= 0.2) {
      const n = radial(phi);
      const centre: Point3 = [x, PLUG_R * n[1], AXIS_Z + PLUG_R * n[2]];
      // The flush end is the brass pin's own face: in a shade, not the white of a top.
      const end = discAlong(centre, n, PIN_R, 0.25, P, 28);
      parts.push({ kind: 'solid', paths: { ...end, shades: [end.shades.join(''), end.top, '', ''], top: '' }, tone: 'hi' });
    }
  }
  const split = SHEAR_Z + lift;
  const top = split + DRIVER_LENGTH;
  const coil = coilUp(x, 0, PIN_R * 0.82, top, BORE_TOP, 5);
  parts.push({ kind: 'line', d: coil.back, tone: 'lo' });
  parts.push({ kind: 'solid', paths: cyl(x, 0, PIN_R, split, DRIVER_LENGTH, 28, 0.3), tone: 'mid', inner: sideArc(x, 0, PIN_R, split + 1.4, P, 16) });
  parts.push({ kind: 'line', d: coil.front, tone: 'mid' });
  return parts;
}

/** The plug's face at the key end: a disc with the keyway, turned with the plug. */
export function faceParts(turn: number): Part[] {
  const parts: Part[] = [];
  parts.push({ kind: 'solid', paths: discAlong([FACE_X, 0, AXIS_Z], X, PLUG_R, FACE_DEPTH, P, 64, 0.5), tone: 'hi', lit: true });
  const up = radial(Math.PI / 2 + turn);
  const side = radial(turn);
  // The keyway: a narrow slot across the face, around the key's blade.
  const slotAt = (v: number, w: number): Point3 => [FACE_X + FACE_DEPTH, side[1] * w + up[1] * v, AXIS_Z + side[2] * w + up[2] * v];
  parts.push({ kind: 'line', d: face3([slotAt(-11, -1.6), slotAt(-11, 1.6), slotAt(12, 1.6), slotAt(12, -1.6)]), tone: 'lo' });
  return parts;
}

/** The key: its neck in the keyway and its bow, both turned with the plug. */
export function keyParts(turn: number): Part[] {
  const parts: Part[] = [];
  const up = radial(Math.PI / 2 + turn);
  const side = radial(turn);
  const x0 = FACE_X + FACE_DEPTH;
  // The neck: the blade's shoulder between the face and the bow.
  parts.push({
    kind: 'solid',
    paths: plateIn([x0, side[1] * 1.3, AXIS_Z + side[2] * 1.3], X, up, roundedOutline(0, -8, BOW_X0 - x0, 9, 0.6, 2), 2.6, P, 0.3),
    tone: 'mid',
  });
  // The bow: a rounded plate with a ring hole, lying in the blade's plane.
  const half = BOW_T / 2;
  const origin: Point3 = [0, side[1] * half, AXIS_Z + side[2] * half];
  const outline: Array<[number, number]> = [];
  for (let k = 0; k <= 28; k++) {
    const a = -Math.PI / 2 + (k / 28) * Math.PI;
    outline.push([BOW_X1 - BOW_HALF + BOW_HALF * Math.cos(a), BOW_HALF * Math.sin(a)]);
  }
  outline.push([BOW_X0, BOW_HALF * 0.72], [BOW_X0, -BOW_HALF * 0.72]);
  // A smooth rim: no creases between the round end's facets.
  const ring3 = outline.map(([u, v]): Point3 => [u, origin[1] + up[1] * v, origin[2] + up[2] * v]);
  parts.push({ kind: 'solid', paths: prismAlong(ring3, [0, -side[1] * BOW_T, -side[2] * BOW_T], P, { round: true, bevel: 0.5 }), tone: 'mid' });
  // The ring hole, on the bow's face toward the viewer (the +side face for every turn from upright to flat).
  const out = 1;
  const hole: Point3[] = [];
  const cx = BOW_X1 - BOW_HALF;
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    const u = cx + 4.2 * Math.cos(a);
    const v = 4.2 * Math.sin(a);
    hole.push([u, side[1] * half * out + up[1] * v, AXIS_Z + side[2] * half * out + up[2] * v]);
  }
  parts.push({ kind: 'line', d: face3(hole), tone: 'lo' });
  return parts;
}

/** How far the bolt stands out of the case for a plug turn: drawn back in step with the turn. */
export const boltOut = (turn: number) => BOLT_OUT + (BOLT_IN - BOLT_OUT) * Math.min(Math.max(turn / TURN, 0), 1);

/** The bolt, standing out of the case's front by `out`. */
export function boltParts(turn: number): Part[] {
  const front = CASE.y + CASE.d;
  const out = boltOut(turn);
  const plan = box(BOLT_X, BOLT_X + BOLT_W, front, front + out, 0.8);
  // The latch end's bevel runs across the bolt's top, edge to edge.
  return [{ kind: 'solid', paths: slab(plan, BOLT_Z, BOLT_H, 2, 0.4), tone: 'hi', inner: lineOnTop([BOLT_X, front + out - 3], [BOLT_X + BOLT_W, front + out - 3], BOLT_Z + BOLT_H, P) }];
}

/** Every moving part for the pins' lifts and the plug's turn, by slot. */
export function movingAt(lifts: readonly number[], turn: number): Record<Slot, Part[]> {
  return {
    bolt: boltParts(turn),
    plug: plugParts(turn),
    pins: PIN_X.flatMap((_, index) => pinParts(index, lifts[index] ?? 0, turn)),
    face: faceParts(turn),
    key: keyParts(turn),
  };
}
