/**
 * The contour gauge on a test track for TeacherStudent, drawn with the
 * isometric kit.
 *
 * The object is the explanation. A strip of bumpy ground lies in a tray
 * along the base: the terrain the robot walks on. A bridge spans it on two
 * towers, and its beam holds a comb of 24 loose pins, one for each stretch
 * of ground, like the gauge a carpenter presses against a molding to copy
 * its profile. A carriage runs along the beam with a wheel that rolls on
 * the ground, the robot's leg; as it passes a pin, the pin drops until it
 * touches the ground, so the row of pin heads (the one lit part) is the
 * profile the robot has felt: the student's guess. Standing on the beam
 * behind the heads is the teacher's plate, cut to the true ground the
 * teacher was given in simulation, and every head should sit on its edge.
 * Noisy readings make a pin sit a little high or low; a missing reading is
 * a pin that did not drop and still hangs at the top of its travel.
 *
 * World units are about a millimetre of the model: x along the track, y
 * toward the viewer, z up. Heights are the terrain's meters times `PER_M`,
 * far steeper than the cells are wide, so a centimeter of error shows. The
 * pins and the carriage are built once at rest and moved by the figure; the
 * part of each pin above the beam and the follower rod are rebuilt as they
 * move. The numbers come from the teaching model in lib/sim2real.ts.
 */
import {
  cameraOf,
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  lineSvg,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideRing,
  sideSeam,
  slabOf,
  SHADES,
  translateAlong,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
} from '../iso-kit.ts';
import { discAlong } from '../prism.ts';
import { phoneFitOf } from '../phone-fit.ts';
import type { IsoPart } from '../part-view.tsx';
import { TERRAIN, TERRAIN_CELLS, TERRAIN_MIN, occludedCells, reconstruction } from '../../../lib/sim2real.ts';

export const WIDTH = 600;
export const HEIGHT = 340;
export const AZIMUTH = 72;
export const ELEVATION = 30;

// ------------------------------------------------------------ the scale
/** The pitch of the pins along the track: one pin for each terrain cell. */
export const PITCH = 12;
/** Drawn height per meter of terrain. */
export const PER_M = 150;
/** Where pin `i` stands along the track. */
export const pinX = (i: number) => (i - (TERRAIN_CELLS - 1) / 2) * PITCH;
const LAST_X = pinX(TERRAIN_CELLS - 1);

/** The top of the tray the ground lies in. */
const TRAY_Z = 3;
/** The ground's height over the tray at its lowest point. */
const GROUND_FLOOR = 4;
/** The drawn height of ground `h` meters high. */
export const groundZ = (h: number) => TRAY_Z + GROUND_FLOOR + (h - TERRAIN_MIN) * PER_M;
/** The true ground under each pin. */
export const TRUE_Z: readonly number[] = TERRAIN.map(groundZ);

/** The beam the pins slide through, and how long a pin is from tip to head. */
const BEAM: Plan = { x: -156, y: -8, w: 312, d: 12, r: 1.2 };
const BEAM_Z0 = 63;
const BEAM_Z1 = 71;
export const PIN_LENGTH = 74;
/** A pin that did not drop hangs with its tip here, just under the beam. */
export const STOP_TIP = 61;
const PIN_Y = -2;
const PIN_HALF = 1.2;
const HEAD_R = 4;
const HEAD_H = 7;

/** Where pin `i`'s tip rests at this much leg-reading noise, and whether its reading went missing. */
export function pinRest(degradation: number): { tip: number[]; missing: boolean[] } {
  const guess = reconstruction(degradation);
  const missing = occludedCells(degradation);
  return { tip: guess.map((h, i) => (missing[i] ? STOP_TIP : groundZ(h))), missing };
}

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -186, y: -30, w: 372, d: 76, r: 8 };
const BASE_H = 9;
const FOOT_H = 5;
const TRAY: Plan = { x: -152, y: -22, w: 304, d: 40, r: 2 };
const GROUND_X0 = -148;
const GROUND_X1 = 148;
const GROUND_Y0 = -18;
const GROUND_Y1 = 14;
/** The tray's front lip rises this far over the tray. */
const LIP_H = 7;
/** The ground is drawn in two halves split at the pins' front faces, so a pin that sits low goes into the ground. */
const GROUND_SPLIT = PIN_Y + PIN_HALF;
const TOWER_X = [-168, 156] as const;
const TOWER: { w: number; y: number; d: number; h: number } = { w: 12, y: -14, d: 24, h: 75 };
const TEMPLATE_Y0 = -7;
const TEMPLATE_Y1 = -5.5;
const TEMPLATE_X0 = -146;
const TEMPLATE_X1 = 146;
const RAIL: Plan = { x: -154, y: 4, w: 308, d: 1.2, r: 0.4 };
const RAIL_Z = 65;
const RAIL_H = 3;
const RULER: Plan = { x: -150, y: 24, w: 300, d: 5, r: 0.8 };
const LABEL: Plan = { x: 126, y: 32, w: 38, d: 11, r: 1.6 };
/** The carriage, built at x = 0: a block hanging on the beam's rail, a lip over the beam, and a follower wheel. */
const CAR: Plan = { x: -7, y: 5.2, w: 14, d: 6, r: 1 };
const CAR_Z0 = 56;
const CAR_Z1 = 72;
const LIP: Plan = { x: -6, y: 1.6, w: 12, d: 9.4, r: 1 };
const WHEEL_R = 4.5;
const WHEEL_Y = 6.8;
const WHEEL_W = 2.4;
const ROD_Y = 7;
/** Where the carriage parks at each end, clear of the first and last pins. */
export const PARK = { left: -LAST_X - 8, right: LAST_X + 8 } as const;

// --------------------------------------------------------------- the ground
/** The ground's height anywhere along the track: a smooth curve through the true ground under the pins, flat past the ends. */
export function groundAt(x: number): number {
  const u = x / PITCH + (TERRAIN_CELLS - 1) / 2;
  if (u <= 0) return TRUE_Z[0]!;
  if (u >= TERRAIN_CELLS - 1) return TRUE_Z[TERRAIN_CELLS - 1]!;
  const i = Math.floor(u);
  const t = u - i;
  const z = (k: number) => TRUE_Z[Math.min(Math.max(k, 0), TERRAIN_CELLS - 1)]!;
  const p0 = z(i - 1);
  const p1 = z(i);
  const p2 = z(i + 1);
  const p3 = z(i + 2);
  // A Catmull-Rom curve with its tangents halved, so it passes every pin's ground and never overshoots far.
  const m1 = (p2 - p0) / 4;
  const m2 = (p3 - p1) / 4;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
}

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
for (const px of [pinX(0), LAST_X]) extremes.push([px, PIN_Y, STOP_TIP + PIN_LENGTH + HEAD_H]);
for (const px of [TOWER_X[0], TOWER_X[1] + TOWER.w]) extremes.push([px, TOWER.y, TOWER.h + 3]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 6, azimuth: AZIMUTH, elevation: ELEVATION });
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 4 });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
/** A seam on a box, as line markup under its outline. */
const seam = (d: string) => lineSvg(d, { tone: 'faint' });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** Screen offsets for moving parts. */
export const carriageShift = (x: number) => translateAlong(P, [x, 0, 0]);
/** Pins are built with their tip at z = 0 and lifted to their rest. */
export const pinShift = (tip: number) => translateAlong(P, [0, 0, tip]);

// ------------------------------------------------- a profile swept across y
const { sinA, cosA } = cameraOf(P);
const LIGHT: Point3 = (() => {
  const l: Point3 = [-sinA, cosA, 0.9];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();
const shadeOf = (n: Point3) => {
  const len = Math.hypot(...n) || 1;
  const lit = ((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / len + 1) / 2;
  return Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
};
/** A closed screen polygon, wound one way, so overlapping faces of one fill never cancel. */
function wound(points: Flat[]): string {
  let area = 0;
  for (let k = 0; k < points.length; k++) {
    const [ax, ay] = points[k]!;
    const [bx, by] = points[(k + 1) % points.length]!;
    area += ax * by - bx * ay;
  }
  return pathOf(area < 0 ? [...points].reverse() : points, true);
}

/**
 * A solid whose top follows a profile z(x) and runs straight across from
 * `y0` to `y1`, standing on `z0`: the ground strip and the teacher's plate.
 * Its front face, its right end and every stretch of its top are drawn and
 * shaded by facing (near-level stretches take the top's tone); the top
 * must face the viewer everywhere, which holds for slopes under
 * tan(elevation) / cos(azimuth).
 */
function profileSolid(xs: number[], zs: number[], y0: number, y1: number, z0: number): SolidPaths {
  const n = xs.length;
  const front: Flat[] = [at([xs[0]!, y1, z0]), at([xs[n - 1]!, y1, z0])];
  for (let k = n - 1; k >= 0; k--) front.push(at([xs[k]!, y1, zs[k]!]));
  const end: Flat[] = [at([xs[n - 1]!, y0, z0]), at([xs[n - 1]!, y1, z0]), at([xs[n - 1]!, y1, zs[n - 1]!]), at([xs[n - 1]!, y0, zs[n - 1]!])];
  const faces: string[] = [wound(front), wound(end)];
  const shades: string[][] = Array.from({ length: SHADES }, () => []);
  shades[shadeOf([0, 1, 0])]!.push(wound(front));
  shades[shadeOf([1, 0, 0])]!.push(wound(end));
  const top: string[] = [];
  for (let k = 0; k < n - 1; k++) {
    const quad = wound([at([xs[k]!, y0, zs[k]!]), at([xs[k + 1]!, y0, zs[k + 1]!]), at([xs[k + 1]!, y1, zs[k + 1]!]), at([xs[k]!, y1, zs[k]!])]);
    faces.push(quad);
    const slope = (zs[k + 1]! - zs[k]!) / (xs[k + 1]! - xs[k]!);
    if (Math.abs(slope) < 0.14) top.push(quad);
    else shades[shadeOf([-slope, 0, 1])]!.push(quad);
  }
  const back = xs.map((x, k) => at([x, y0, zs[k]!]));
  const outline = [
    pathOf([at([xs[0]!, y1, zs[0]!]), at([xs[0]!, y1, z0]), at([xs[n - 1]!, y1, z0]), at([xs[n - 1]!, y0, z0]), at([xs[n - 1]!, y0, zs[n - 1]!])]),
    pathOf([...back].reverse()),
    pathOf([at([xs[0]!, y0, zs[0]!]), at([xs[0]!, y1, zs[0]!])]),
  ].join('');
  const crease = [
    pathOf(xs.map((x, k) => at([x, y1, zs[k]!]))),
    pathOf([at([xs[n - 1]!, y1, z0]), at([xs[n - 1]!, y1, zs[n - 1]!]), at([xs[n - 1]!, y0, zs[n - 1]!])]),
  ].join('');
  return { fill: faces.join(''), outline, crease, top: top.join(''), shades: shades.map((list) => list.join('')) };
}

/** Sample points along x, four per pin, ending on `x0` and `x1`. */
function samples(x0: number, x1: number): number[] {
  const xs: number[] = [x0];
  for (let x = Math.ceil(x0 / (PITCH / 4)) * (PITCH / 4); x < x1; x += PITCH / 4) if (x > x0 + 0.5) xs.push(x);
  xs.push(x1);
  return xs;
}
const GROUND_XS = samples(GROUND_X0, GROUND_X1);
const GROUND_ZS = GROUND_XS.map(groundAt);
const TEMPLATE_XS = samples(TEMPLATE_X0, TEMPLATE_X1);
/** The teacher's plate: its edge is the true ground raised by a pin's length, where every head should sit. */
const TEMPLATE_ZS = TEMPLATE_XS.map((x) => groundAt(x) + PIN_LENGTH);

// ---------------------------------------------------------------- parts
export type Slot = 'lower-pins' | 'follower' | 'upper-pins' | 'carriage';
export type Part = IsoPart | { kind: 'slot'; slot: Slot };

const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screws = (list: Part[], points: Point3[], size = 0.5) => list.push({ kind: 'dots', points: points.map(at), size });

// The base: a plate on four turned feet, with a groove and corner screws.
put({ kind: 'line', d: slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, tone: 'faint' });
for (const [x, y] of byDepth([
  [BASE.x + 24, BASE.y + 14],
  [BASE.x + BASE.w - 24, BASE.y + 14],
  [BASE.x + 24, BASE.y + BASE.d - 14],
  [BASE.x + BASE.w - 24, BASE.y + BASE.d - 14],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.8, 28), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, 28), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.4), tone: 'mid', inner: seam(sideSeam(BASE, -BASE_H / 2, P, 8)) });
put({ kind: 'line', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
{
  const corners: Plane[] = [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ];
  put({ kind: 'line', d: corners.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  screws(parts, corners.map(([x, y]) => [x, y, 0] as Point3), 0.55);
}

// A ruler along the front of the track, a tick under every pin and a long one every sixth.
put({ kind: 'solid', paths: slab(RULER, 0, 0.6, 3), tone: 'lo', crease: 'none' });
{
  // Ticks grow toward the viewer from their root on the strip's back edge.
  const minor: string[] = [];
  const major: string[] = [];
  for (let i = 0; i < TERRAIN_CELLS; i++) {
    const big = i % 6 === 0 || i === TERRAIN_CELLS - 1;
    (big ? major : minor).push(onTop([[pinX(i), RULER.y + 0.8], [pinX(i), RULER.y + 0.8 + (big ? 3.4 : 1.8)]], 0.6, P));
  }
  put({ kind: 'line', d: minor.join(''), tone: 'lo' });
  put({ kind: 'line', d: major.join(''), tone: 'mid' });
}

// A label plate on the base at the front right, with three engraved rules.
put({ kind: 'solid', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', d: planOutline(insetPlan(LABEL, 1.6), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  d: [0, 1, 2].map((row) => onTop([[LABEL.x + 5, LABEL.y + 3.2 + row * 2.4], [LABEL.x + (row === 1 ? 17 : 27), LABEL.y + 3.2 + row * 2.4]], 0.8, P)).join(''),
  tone: 'lo',
  free: true,
});
screws(parts, [[LABEL.x + 2.4, LABEL.y + 2.4, 0.8], [LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.8]]);

/** A tower of the bridge: a foot plate, the post with a seam, and a cap with two screws. */
function tower(x: number): Part[] {
  const list: Part[] = [];
  const foot: Plan = { x: x - 3, y: TOWER.y - 3, w: TOWER.w + 6, d: TOWER.d + 6, r: 1.6 };
  list.push({ kind: 'solid', paths: slab(foot, 0, 3, 3, 0.5), tone: 'mid' });
  screws(list, [[foot.x + 2, foot.y + 2, 3], [foot.x + foot.w - 2, foot.y + 2, 3], [foot.x + 2, foot.y + foot.d - 2, 3], [foot.x + foot.w - 2, foot.y + foot.d - 2, 3]], 0.45);
  const post: Plan = { x, y: TOWER.y, w: TOWER.w, d: TOWER.d, r: 1.2 };
  list.push({ kind: 'solid', paths: slab(post, 3, TOWER.h - 3, 3, 0.5), tone: 'mid', inner: seam(sideSeam(post, 34, P, 3)) });
  const cap: Plan = { x: x - 1.2, y: TOWER.y - 1.2, w: TOWER.w + 2.4, d: TOWER.d + 2.4, r: 1.4 };
  list.push({ kind: 'solid', paths: slab(cap, TOWER.h, 3, 3, 0.5), tone: 'mid' });
  screws(list, [[x + TOWER.w / 2, TOWER.y + 4, TOWER.h + 3], [x + TOWER.w / 2, TOWER.y + TOWER.d - 4, TOWER.h + 3]], 0.5);
  return list;
}

// The far tower, then the tray and the back half of the ground behind the pins.
for (const part of tower(TOWER_X[0])) put(part);
put({ kind: 'solid', paths: slab(TRAY, 0, TRAY_Z, 3, 0.5), tone: 'lo' });
put({ kind: 'solid', paths: profileSolid(GROUND_XS, GROUND_ZS, GROUND_Y0, GROUND_SPLIT, TRAY_Z), tone: 'hi' });
put({ kind: 'slot', slot: 'lower-pins' });
// The front half of the ground, over the foot of every pin.
put({ kind: 'solid', paths: profileSolid(GROUND_XS, GROUND_ZS, GROUND_SPLIT, GROUND_Y1, TRAY_Z), tone: 'hi' });
put({ kind: 'slot', slot: 'follower' });
// The tray's front lip, which holds the ground in.
{
  const lip: Plan = { x: TRAY.x, y: GROUND_Y1, w: TRAY.w, d: TRAY.y + TRAY.d - GROUND_Y1, r: 0.8 };
  put({ kind: 'solid', paths: slab(lip, TRAY_Z, LIP_H, 3, 0.4), tone: 'mid', inner: seam(sideSeam(lip, TRAY_Z + 2.2, P, 3)) });
  screws(parts, [lip.x + 4, 0, lip.x + lip.w - 4].map((x) => [x, lip.y + lip.d / 2, TRAY_Z + LIP_H] as Point3), 0.45);
}

// The beam, with a guide hole round every pin, and the rail the carriage hangs on.
put({ kind: 'solid', paths: slab(BEAM, BEAM_Z0, BEAM_Z1 - BEAM_Z0, 3, 0.5), tone: 'mid', inner: seam(sideSeam(BEAM, BEAM_Z0 + 2.4, P, 3)) });
put({
  kind: 'line',
  d: Array.from({ length: TERRAIN_CELLS }, (_, i) => planOutline({ x: pinX(i) - PIN_HALF - 0.8, y: PIN_Y - PIN_HALF - 0.8, w: 2 * PIN_HALF + 1.6, d: 2 * PIN_HALF + 1.6, r: 0.8 }, BEAM_Z1, P, 2)).join(''),
  tone: 'faint',
});
screws(parts, [[BEAM.x + 3, BEAM.y + 2.4, BEAM_Z1], [BEAM.x + 3, BEAM.y + BEAM.d - 2.4, BEAM_Z1], [BEAM.x + BEAM.w - 3, BEAM.y + 2.4, BEAM_Z1], [BEAM.x + BEAM.w - 3, BEAM.y + BEAM.d - 2.4, BEAM_Z1]], 0.45);
put({ kind: 'solid', paths: slab(RAIL, RAIL_Z, RAIL_H, 2, 0.3), tone: 'mid' });

// The teacher's plate, standing on the beam behind the pins, and its two corner brackets.
put({ kind: 'solid', paths: profileSolid(TEMPLATE_XS, TEMPLATE_ZS, TEMPLATE_Y0, TEMPLATE_Y1, BEAM_Z1), tone: 'hi', crease: 'lo' });
for (const x of [TEMPLATE_X0 + 1, TEMPLATE_X1 - 6]) {
  const bracket: Plan = { x, y: TEMPLATE_Y1, w: 5, d: 2.2, r: 0.4 };
  put({ kind: 'solid', paths: slab(bracket, BEAM_Z1, 6, 2, 0.3), tone: 'mid' });
  screws(parts, [[x + 2.5, TEMPLATE_Y1 + 2.2, BEAM_Z1 + 3.4]], 0.45);
}
put({ kind: 'slot', slot: 'upper-pins' });
put({ kind: 'slot', slot: 'carriage' });
// The near tower last: the beam's end and the carriage's park sit against it.
for (const part of tower(TOWER_X[1])) put(part);

export const PARTS: readonly Part[] = parts;

// ------------------------------------------------------------ the pins
const PIN_PLAN = (i: number): Plan => ({ x: pinX(i) - PIN_HALF, y: PIN_Y - PIN_HALF, w: 2 * PIN_HALF, d: 2 * PIN_HALF, r: 0.5 });
/** Pin `i` from its tip at z = 0 to its head, below the beam and through it; lifted by `pinShift`. */
export const LOWER_PINS: readonly SolidPaths[] = Array.from({ length: TERRAIN_CELLS }, (_, i) => slab(PIN_PLAN(i), 0, PIN_LENGTH, 2));
/** The part of pin `i` above the beam, for a pin whose tip rests at `tip`. */
export const upperPin = (i: number, tip: number): SolidPaths => slab(PIN_PLAN(i), BEAM_Z1, tip + PIN_LENGTH - BEAM_Z1, 2);
/** Pin `i`'s head, built for a tip at z = 0 and lifted by `pinShift`. */
export const HEADS: readonly SolidPaths[] = Array.from({ length: TERRAIN_CELLS }, (_, i) => cyl(pinX(i), PIN_Y, HEAD_R, PIN_LENGTH, HEAD_H, 22, 0.4));

// --------------------------------------------------------- the carriage
/** The carriage at x = 0: the block on the rail, the lip over the beam, the knob, two screws. */
export const CARRIAGE: readonly IsoPart[] = (() => {
  const list: IsoPart[] = [];
  list.push({ kind: 'solid', paths: slab(CAR, CAR_Z0, CAR_Z1 - CAR_Z0, 3, 0.4), tone: 'mid', inner: seam(sideSeam(CAR, CAR_Z0 + 4, P, 3)) });
  list.push({ kind: 'solid', paths: slab(LIP, CAR_Z1, 2, 3, 0.4), tone: 'mid' });
  const face = CAR.y + CAR.d;
  list.push({ kind: 'solid', paths: discAlong([0, face, 66], [0, 1, 0], 3.2, 2.6, P, 24, 0.3), tone: 'mid' });
  list.push({ kind: 'line', d: sideRing([0, face + 2.6, 66], 1.5, 'y', P, 18), tone: 'lo' });
  screws(list, [[-4.6, face, 60], [4.6, face, 60]], 0.45);
  return list;
})();

/** The follower under a carriage at `x`: the rod down from the block and the wheel rolling on the ground. */
export function follower(x: number): { rod: SolidPaths; wheel: SolidPaths; hub: string; axle: Flat } {
  const wz = groundAt(x) + WHEEL_R;
  return {
    rod: slab({ x: x - 1, y: ROD_Y, w: 2, d: 2, r: 0.4 }, wz, CAR_Z0 - wz, 2),
    wheel: discAlong([x, WHEEL_Y, wz], [0, 1, 0], WHEEL_R, WHEEL_W, P, 28, 0.3),
    hub: sideRing([x, WHEEL_Y + WHEEL_W, wz], 1.4, 'y', P, 16),
    axle: at([x, WHEEL_Y + WHEEL_W, wz]),
  };
}
