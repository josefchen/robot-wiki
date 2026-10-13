/**
 * The reducing pantograph for MotionPantograph, drawn with the isometric kit.
 *
 * The object is the explanation. Motion scaling divides the surgeon's hand
 * movement, wobble included, before it reaches the instrument. A reducing
 * pantograph does exactly that with four bars: one end pivots on a fixed
 * post, the surgeon's stylus is at the far end, and the instrument tip sits
 * on the line between them at 1/scale of the way out, so whatever the hand
 * traces on the master plate the tip traces on the patient pad, every
 * wobble included, divided by the scale. Two scale pins through the bars'
 * hole rows set 2 to 1 up to 5 to 1. Both plates carry the same millimetre
 * rule, so a 30 mm stroke at the hand reads 10 mm at the tip at 3 to 1.
 *
 * The linkage: bars O-B and B-H are each `BAR` long, pinned at B; the scale
 * pins sit at D on O-B and at C on B-H, `k` of the way along each (k =
 * 1/scale), and the short bars D-T (parallel to B-H) and C-T (parallel to
 * O-B) meet at the tip T. Then T = O + k (H - O): the tip is always the hand
 * divided by the scale, about the fixed pivot (`linkageAt`, tested).
 *
 * World units: 3 a millimetre; x runs from the fixed pivot out toward the
 * hand, y across (toward the viewer is +y), z up. Every static path is built
 * once here; the four bars, their pins and holes, the stylus and the tip
 * are rebuilt for each pose by `linkageParts`, which is cheap.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  onTop,
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
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 640;
export const AZIMUTH = 64;
export const ELEVATION = 46;

/** World units per millimetre of motion. */
export const UNITS_PER_MM = 3;
/** The motion scales the pins can set: 2 to 1 up to 5 to 1. */
export const SCALES = [2, 3, 4, 5] as const;
export type Scale = (typeof SCALES)[number];
export const DEFAULT_SCALE: Scale = 3;
/** The authored stroke: 30 mm at the hand, with a wobble of 1.5 mm either side. */
export const STROKE_MM = 30;
export const WOBBLE_MM = 1.5;
const WOBBLE_CYCLES = 6;
/** The stroke starts this far from the fixed pivot (in world units) and runs straight in toward it. */
const STROKE_FROM = 304;

/** Each long bar's length, pivot to pivot. */
export const BAR = 160;
const BAR_W = 11;
const BAR_H = 3.6;
/** The bars' layers: O-B lowest, then B-H and D-T, then C-T on top. */
const Z_OB = 22;
const Z_MID = Z_OB + BAR_H;
const Z_TOP = Z_MID + BAR_H;
const MASTER_TOP = 3;
const PAD_TOP = 5.2;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: 'traces' | 'linkage' };

// ------------------------------------------------------------------ the model
/** The hand's point on the master plate at share `s` of the authored stroke, in world units. */
export function handAt(s: number): Plane {
  const u = Math.min(Math.max(s, 0), 1);
  const taper = Math.min(1, u * WOBBLE_CYCLES, (1 - u) * WOBBLE_CYCLES);
  return [STROKE_FROM - STROKE_MM * UNITS_PER_MM * u, WOBBLE_MM * UNITS_PER_MM * Math.sin(2 * Math.PI * WOBBLE_CYCLES * u) * taper];
}

/** Motion scaling: the tip moves the hand's motion divided by the scale (about the fixed pivot at the origin). */
export const tipFor = (hand: Plane, scale: number): Plane => [hand[0] / scale, hand[1] / scale];

/** Millimetres the tip moves for a hand movement of `mm` at a scale of `scale` to 1. */
export const tipMm = (mm: number, scale: number) => mm / scale;

export interface Linkage {
  O: Plane;
  B: Plane;
  H: Plane;
  D: Plane;
  C: Plane;
  T: Plane;
  k: number;
}

/** The pantograph's joints for the stylus at H and a scale of `scale` to 1. */
export function linkageAt(H: Plane, scale: number): Linkage {
  const k = 1 / scale;
  const O: Plane = [0, 0];
  const d = Math.hypot(H[0], H[1]);
  const half = d / 2;
  const h = Math.sqrt(Math.max(0, BAR * BAR - half * half));
  const [ux, uy] = [H[0] / d, H[1] / d];
  // The elbow B sits on the far side of the line O-H (toward -y), so the bars stay behind the plates.
  const B: Plane = [half * ux + h * uy, half * uy - h * ux];
  const D: Plane = [k * B[0], k * B[1]];
  const C: Plane = [B[0] + k * (H[0] - B[0]), B[1] + k * (H[1] - B[1])];
  const T: Plane = [D[0] + C[0] - B[0], D[1] + C[1] - B[1]];
  return { O, B, H, D, C, T, k };
}

// ---------------------------------------------------------------- the layout
const BASE: Plan = { x: -30, y: -34, w: 362, d: 104, r: 6 };
const BASE_H = 9;
const FOOT_H = 6;
const MASTER: Plan = { x: 196, y: -26, w: 128, d: 56, r: 3 };
const MASTER_RULE: Plan = { x: 200, y: 16, w: 120, d: 10, r: 1 };
const PATIENT: Plan = { x: 30, y: -26, w: 134, d: 56, r: 3 };
const PAD: Plan = { x: 34, y: -20, w: 126, d: 34, r: 6 };
const PATIENT_RULE: Plan = { x: 34, y: 18, w: 126, d: 9, r: 1 };
const POST = { x: 0, y: 0 };
const LABEL: Plan = { x: 60, y: 42, w: 66, d: 16, r: 2 };

// ---------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([handAt(1)[0], 0, Z_TOP + 30], [handAt(0)[0], 0, Z_TOP + 30], [POST.x, POST.y, Z_TOP + 12]);
for (const scale of SCALES) for (const s of [0, 1]) {
  const L = linkageAt(handAt(s), scale);
  extremes.push([L.B[0], L.B[1] - 8, Z_TOP + 6]);
}
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unit));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 12;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** A bar with round ends between two floor points (plus overhang), `w` wide, from z to z + h. */
function barPaths(a: Plane, b: Plane, w: number, z: number, h: number, overhang = BAR_W / 2 + 1.5): SolidPaths {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  const r = w / 2;
  const points: Plane[] = [];
  const ends: Array<[Plane, number]> = [
    [[b[0] + ux * (overhang - r), b[1] + uy * (overhang - r)], Math.atan2(uy, ux) - Math.PI / 2],
    [[a[0] - ux * (overhang - r), a[1] - uy * (overhang - r)], Math.atan2(uy, ux) + Math.PI / 2],
  ];
  for (const [[cx, cy], start] of ends) {
    for (let step = 0; step <= 8; step++) {
      const angle = start + (step / 8) * Math.PI;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }
  return extrude(points, z, h, P, { bevel: 0.4 });
}

/** Scale pips beside each hole of a row: as many dots as the scale the hole sets (2 to 5). */
function pipsFor(from: Plane, to: Plane, distances: number[], z: number): Flat[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  const [nx, ny] = [-uy, ux];
  const points: Flat[] = [];
  distances.forEach((distance, index) => {
    const count = SCALES[index];
    for (let k = 0; k < count; k++) {
      const along = distance + (k - (count - 1) / 2) * 1.5;
      points.push(iso([from[0] + ux * along + nx * 3.4, from[1] + uy * along + ny * 3.4, z], P));
    }
  });
  return points;
}

/** A row of closed holes on a bar's top, at the given distances from `from` toward `to`. */
function holeRow(from: Plane, to: Plane, distances: number[], z: number, skip: number | null) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return distances
    .filter((distance) => skip === null || Math.abs(distance - skip) > 0.5)
    .map((distance) => ring(from[0] + (dx / length) * distance, from[1] + (dy / length) * distance, 1.5, z, P, 14))
    .join('');
}

const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => PARTS.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });

// ---------------------------------------------------------------- the base
for (const [x, y] of byDepth([...corners(BASE, 18), [BASE.x + BASE.w / 2, BASE.y + 18], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 18]])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -BASE_H + 3, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
for (const [x, y] of corners(BASE, 10)) line(ring(x, y, 2.2, 0, P, 16), 'lo');
dots(corners(BASE, 10).map(([x, y]) => at([x, y, 0])), 0.55, 'mid');
// The label plate; its three rule lines stand for print.
solid(slab(LABEL, 0, 0.8, 3), 'lo');
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P, 3), 'faint');
for (const [k, share] of [[0, 0.82], [1, 0.58], [2, 0.7]] as const) {
  const y = LABEL.y + 4.4 + k * 3.6;
  line(lineOnTop([LABEL.x + 6, y], [LABEL.x + 6 + (LABEL.w - 16) * share, y], 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], 0.45, 'mid');

// ------------------------------------------------- the patient plate and pad
solid(slab(PATIENT, 0, MASTER_TOP, 3, 0.6), 'mid', { inner: sideSeam(PATIENT, 1.4, P, 3) });
for (const [x, y] of corners(PATIENT, 3)) dots([at([x, y, MASTER_TOP])], 0.45, 'mid');
solid(slab(PAD, MASTER_TOP, PAD_TOP - MASTER_TOP, 6, 0.6), 'lo');
// The pad's practice incision: a closed slot along the line the tip works on.
line(planOutline({ x: PAD.x + 8, y: -1.4, w: PAD.w - 16, d: 2.8, r: 1.4 }, PAD_TOP, P, 3), 'faint');
solid(slab(PATIENT_RULE, MASTER_TOP, 0.8, 2), 'lo');
const patientTicks = topTicks(PATIENT_RULE.x + 3, PATIENT_RULE.x + PATIENT_RULE.w - 3, UNITS_PER_MM * 2, 5, PATIENT_RULE.y + 0.4, MASTER_TOP + 0.8, [2.4, 4.6], P);
line(patientTicks.minor, 'lo');
line(patientTicks.major, 'mid');

// ------------------------------------------------------------ the master plate
solid(slab(MASTER, 0, MASTER_TOP, 3, 0.6), 'mid', { inner: sideSeam(MASTER, 1.4, P, 3) });
for (const [x, y] of corners(MASTER, 3)) dots([at([x, y, MASTER_TOP])], 0.45, 'mid');
line(planOutline(insetPlan({ ...MASTER, y: -22, d: 36 }, 3), MASTER_TOP, P, 3), 'faint');
solid(slab(MASTER_RULE, MASTER_TOP, 0.8, 2), 'lo');
const masterTicks = topTicks(MASTER_RULE.x + 3, MASTER_RULE.x + MASTER_RULE.w - 3, UNITS_PER_MM * 2, 5, MASTER_RULE.y + 0.4, MASTER_TOP + 0.8, [2.4, 4.6], P);
line(masterTicks.minor, 'lo');
line(masterTicks.major, 'mid');

// The surgeon's armrest along the front of the master plate: two posts and a padded rail.
for (const x of [MASTER.x + 14, MASTER.x + MASTER.w - 14]) {
  solid(cyl(x, 56, 4.4, 0, 2, 24), 'lo');
  solid(cyl(x, 56, 2.6, 2, 9, 20), 'mid');
}
const REST: Plan = { x: MASTER.x + 4, y: 51, w: MASTER.w - 8, d: 10, r: 5 };
solid(slab(REST, 11, 5, 6, 0.6), 'hi', { inner: sideSeam(REST, 13.5, P, 6) });
// A tray of spare scale pins beside the fixed post.
const TRAY: Plan = { x: -22, y: 26, w: 40, d: 16, r: 2 };
solid(slab(TRAY, 0, 1.2, 3), 'lo');
for (const side of [-1, 1]) solid(slab({ x: TRAY.x, y: side < 0 ? TRAY.y : TRAY.y + TRAY.d - 1.6, w: TRAY.w, d: 1.6, r: 0.6 }, 1.2, 3, 2), 'mid');
for (const side of [-1, 1]) solid(slab({ x: side < 0 ? TRAY.x : TRAY.x + TRAY.w - 1.6, y: TRAY.y + 1.6, w: 1.6, d: TRAY.d - 3.2, r: 0.6 }, 1.2, 3, 2), 'mid');
for (const x of [TRAY.x + 10, TRAY.x + 20, TRAY.x + 30]) {
  solid(cyl(x, TRAY.y + TRAY.d / 2, 3.4, 1.2, 0.9, 20), 'lo');
  solid(cyl(x, TRAY.y + TRAY.d / 2, 2.4, 2.1, 4, 18), 'mid', { inner: knurl(x, TRAY.y + TRAY.d / 2, 2.4, 2.1, 6.1, 16, P, 0.5) });
}
// The ink of the last stroke on both plates (rebuilt in the slot).
PARTS.push({ kind: 'slot', slot: 'traces' });

// ------------------------------------------------------------- the fixed post
const POST_BASE: Plan = { x: POST.x - 16, y: POST.y - 14, w: 32, d: 28, r: 3 };
solid(slab(POST_BASE, 0, 5, 3, 0.6), 'mid', { inner: sideSeam(POST_BASE, 2.6, P, 3) });
for (const [x, y] of corners(POST_BASE, 3.4)) {
  line(ring(x, y, 1.9, 5, P, 14), 'lo');
  dots([at([x, y, 5])], 0.45, 'mid');
}
solid(cyl(POST.x, POST.y, 8, 5, 4, 32, 0.4), 'mid');
solid(cyl(POST.x, POST.y, 5, 9, Z_OB - 9, 28), 'mid', { inner: sideArc(POST.x, POST.y, 5, 16, P, 18) });

PARTS.push({ kind: 'slot', slot: 'linkage' });

export { PARTS };
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------- the moving linkage
const OB_HOLES = SCALES.map((scale) => BAR / scale);
const CT_HOLES = SCALES.map((scale) => BAR * (1 - 1 / scale));
const DT_REACH = Math.max(...OB_HOLES) + 6;
const CT_REACH = Math.max(...CT_HOLES) + 6;

/** A pin with a washer on top of the bar it holds. */
function pin(list: Part[], [x, y]: Plane, top: number, knurled = false) {
  list.push({ kind: 'solid', paths: cyl(x, y, 3.4, top, 0.9, 24), tone: 'lo' });
  list.push({ kind: 'solid', paths: cyl(x, y, 2.4, top + 0.9, knurled ? 4 : 2, 20), tone: 'mid', inner: knurled ? knurl(x, y, 2.4, top + 0.9, top + 4.9, 16, P, 0.5) : undefined });
}

/**
 * Every part of the linkage for the stylus at H and a scale of `scale` to 1,
 * in painter's order: the shafts under the bars, the bars from the lowest
 * layer up, the pins, then the stylus grip and the tip holder's head.
 */
export function linkageParts(H: Plane, scale: number): Part[] {
  const L = linkageAt(H, scale);
  const list: Part[] = [];
  const unitOf = (a: Plane, b: Plane): Plane => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  };
  const dBH = unitOf(L.H, L.B);
  const dOB = unitOf(L.O, L.B);
  const dtEnd: Plane = [L.T[0] + dBH[0] * DT_REACH, L.T[1] + dBH[1] * DT_REACH];
  const ctEnd: Plane = [L.T[0] + dOB[0] * CT_REACH, L.T[1] + dOB[1] * CT_REACH];

  // Under the bars: the stylus shaft down to the master plate, the instrument shaft down to the pad.
  list.push({ kind: 'solid', paths: cyl(L.H[0], L.H[1], 1.1, MASTER_TOP, 3, 12), tone: 'hi' });
  list.push({ kind: 'solid', paths: cyl(L.H[0], L.H[1], 2.2, MASTER_TOP + 3, Z_MID - MASTER_TOP - 3, 18), tone: 'mid', inner: sideArc(L.H[0], L.H[1], 2.2, MASTER_TOP + 9, P, 14) });
  list.push({ kind: 'solid', paths: cyl(L.T[0], L.T[1], 1.4, PAD_TOP + 3.4, Z_MID - PAD_TOP - 3.4, 14), tone: 'mid' });
  // The instrument's tip, the one lit part, with its two jaw blades on the pad.
  for (const side of [-1, 1]) {
    list.push({ kind: 'solid', paths: slabOf({ x: L.T[0] - 0.7, y: L.T[1] + side * 1.3 - 0.6, w: 1.4, d: 1.2, r: 0.4 }, PAD_TOP, 1.4, P, 2), tone: 'hi' });
  }
  list.push({ kind: 'solid', paths: cyl(L.T[0], L.T[1], 2.2, PAD_TOP + 1.2, 2.2, 18), tone: 'hi', lit: true });

  // The bars: O-B lowest, B-H and D-T on the middle layer, C-T on top; each with its hole row.
  list.push({ kind: 'solid', paths: barPaths(L.O, L.B, BAR_W, Z_OB, BAR_H), tone: 'mid' });
  list.push({ kind: 'line', d: holeRow(L.O, L.B, OB_HOLES, Z_OB + BAR_H, BAR * L.k), tone: 'lo' });
  list.push({ kind: 'dots', points: pipsFor(L.O, L.B, OB_HOLES, Z_OB + BAR_H), size: 0.42, tone: 'mid' });
  list.push({ kind: 'solid', paths: barPaths(L.B, L.H, BAR_W, Z_MID, BAR_H), tone: 'mid' });
  list.push({ kind: 'line', d: holeRow(L.B, L.H, OB_HOLES, Z_MID + BAR_H, BAR * L.k), tone: 'lo' });
  list.push({ kind: 'dots', points: pipsFor(L.B, L.H, OB_HOLES, Z_MID + BAR_H), size: 0.42, tone: 'mid' });
  list.push({ kind: 'solid', paths: barPaths(L.T, dtEnd, BAR_W - 2, Z_MID, BAR_H), tone: 'mid' });
  list.push({ kind: 'line', d: holeRow(L.T, dtEnd, OB_HOLES, Z_MID + BAR_H, BAR * L.k), tone: 'lo' });
  pin(list, L.O, Z_MID);
  pin(list, L.B, Z_MID + BAR_H);
  list.push({ kind: 'solid', paths: barPaths(L.T, ctEnd, BAR_W - 2, Z_TOP, BAR_H), tone: 'mid' });
  list.push({ kind: 'line', d: holeRow(L.T, ctEnd, CT_HOLES, Z_TOP + BAR_H, BAR * (1 - L.k)), tone: 'lo' });
  // The two scale pins (knurled, so they read as the ones you move) and the tip's joint.
  pin(list, L.D, Z_MID + BAR_H, true);
  pin(list, L.C, Z_TOP + BAR_H, true);
  list.push({ kind: 'solid', paths: cyl(L.T[0], L.T[1], 3.6, Z_TOP + BAR_H, 2.6, 24, 0.3), tone: 'mid' });
  // The stylus grip above the bar end: collar, knurled grip, cap.
  list.push({ kind: 'solid', paths: cyl(L.H[0], L.H[1], 3.4, Z_MID + BAR_H, 2, 24), tone: 'lo' });
  list.push({ kind: 'solid', paths: cyl(L.H[0], L.H[1], 4.2, Z_MID + BAR_H + 2, 16, 28), tone: 'hi', inner: knurl(L.H[0], L.H[1], 4.2, Z_MID + BAR_H + 2, Z_MID + BAR_H + 18, 24, P, 0.8) });
  list.push({ kind: 'solid', paths: cyl(L.H[0], L.H[1], 3, Z_MID + BAR_H + 18, 3, 20, 0.3), tone: 'mid' });
  return list;
}

/** The ink on both plates for a stroke drawn up to share `s` of the authored stroke (or a free list of hand points). */
export function tracesFor(hands: Plane[], scale: number) {
  const hand = hands.length > 1 ? onTop(hands, MASTER_TOP, P) : '';
  const tip = hands.length > 1 ? onTop(hands.map((h) => tipFor(h, scale)), PAD_TOP, P) : '';
  // Where each pen first touched down: an ink dot the line starts from.
  const dots: Flat[] = hands.length ? [iso([hands[0][0], hands[0][1], MASTER_TOP], P), iso([...tipFor(hands[0], scale), PAD_TOP], P)] : [];
  return { hand, tip, dots };
}

/** The authored stroke as points, from its start to share `s`. */
export function strokeUpTo(s: number, samples = 160): Plane[] {
  const count = Math.max(2, Math.round(samples * Math.min(Math.max(s, 0), 1)));
  return Array.from({ length: count + 1 }, (_, index) => handAt((index / count) * s));
}

/** Where the stylus may go on the master plate, in world units. */
export const HAND_BOUNDS = { x0: MASTER.x + 8, x1: MASTER.x + MASTER.w - 6, y0: MASTER.y + 6, y1: MASTER_RULE.y - 3 };

/** The point on the master plate under a viewBox point (the inverse of the camera on the plate's top). */
export function plateAt([sx, sy]: Flat): Plane {
  const a = (AZIMUTH * Math.PI) / 180;
  const e = (ELEVATION * Math.PI) / 180;
  const k = P.scale * Math.sqrt(1.6);
  const u = (sx - P.origin[0]) / k;
  const w = (sy - P.origin[1]) / k + MASTER_TOP * Math.cos(e);
  const along = w / Math.sin(e);
  return [u * Math.sin(a) + along * Math.cos(a), -u * Math.cos(a) + along * Math.sin(a)];
}

/** A hand point held inside the master plate and within the bars' reach. */
export function clampHand([x, y]: Plane): Plane {
  const cx = Math.min(Math.max(x, HAND_BOUNDS.x0), HAND_BOUNDS.x1);
  const cy = Math.min(Math.max(y, HAND_BOUNDS.y0), HAND_BOUNDS.y1);
  const d = Math.hypot(cx, cy);
  const reach = 2 * BAR - 4;
  return d > reach ? [(cx / d) * reach, (cy / d) * reach] : [cx, cy];
}

