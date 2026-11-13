/**
 * The floor test bed for FrictionTransfer, drawn with the isometric kit.
 *
 * The object is the explanation. A long bed carries a friction scale from
 * slippery (left) to grippy (right). Two racks run along it, each with a
 * slot for every floor on the scale, and each rack holds the floor strips
 * one robot practiced on: the back rack holds a single strip at the
 * practice floor, the front rack a run of strips either side of it. A
 * carriage rides on two rails between the racks and carries the real floor
 * plate, the one lit part; the reader slides it to the real floor's grip,
 * and its two index tabs point at the same place in both racks. On the
 * plate stand two identical test walkers: the one-floor robot at the back,
 * next to its rack, the many-floor robot at the front, next to its rack.
 * Each has a dial on its chest that reads the share of tries that end
 * without a fall. A strip's grip is its grit: the grippier the floor, the
 * closer its rows of grit dots.
 *
 * World units are about a millimetre: x along the friction scale, y toward
 * the viewer, z up. Every static path is built once here; the carriage and
 * everything on it are built at the practice floor and moved along x with
 * `carriageShift`, and the strips and the plate's grit are built for the
 * reader's settings. The numbers come from the teaching model in
 * lib/sim2real.ts.
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
  topMatrix,
  sideMatrix,
  sideRing,
  sideSeam,
  slabOf,
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong, viewOf } from '../prism.ts';
import { MU_MAX, MU_MIN, MU_TRAIN } from '../../../lib/sim2real.ts';

export const WIDTH = 600;
export const HEIGHT = 380;
export const AZIMUTH = 70;
export const ELEVATION = 50;

// ------------------------------------------------------------ the scale
/** World units per unit of friction along the bed. */
const PER_MU = 140;
/** The racks have a slot for every 0.05 of friction. */
export const SLOT_STEP = 0.05;
/** Where a floor of friction `mu` sits along the bed; the practice floor is at 0. */
export const xOf = (mu: number) => (mu - MU_TRAIN) * PER_MU;
const r2 = (value: number) => Math.round(value * 100) / 100;
/** Every slot's friction, slippery to grippy. */
export const SLOTS: readonly number[] = Array.from({ length: Math.round((MU_MAX - MU_MIN) / SLOT_STEP) + 1 }, (_, k) => r2(MU_MIN + k * SLOT_STEP));
/** The one floor the one-floor robot practiced on. */
export const ONE_FLOOR: readonly number[] = [MU_TRAIN];
/** The floors the many-floor robot practiced on: every slot within `range` of the practice floor. */
export const practiceFloors = (range: number): number[] => SLOTS.filter((mu) => Math.abs(mu - MU_TRAIN) <= range + 1e-9);

/** The spacing of a floor's rows of grit: wide on a slippery floor, close on a grippy one. */
export const gritGap = (mu: number) => 7.5 - (5.5 * (mu - MU_MIN)) / (MU_MAX - MU_MIN);

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -140, y: -101, w: 308, d: 192, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;
/** The two racks: a tray of slots each, the back one for the one-floor robot, the front one for the many-floor robot. */
const TRAY_X0 = xOf(MU_MIN) - 6;
const TRAY_X1 = xOf(MU_MAX) + 6;
const TRAY_H = 2.4;
const TRAY_BACK: Plan = { x: TRAY_X0, y: -94, w: TRAY_X1 - TRAY_X0, d: 20, r: 2 };
const TRAY_FRONT: Plan = { x: TRAY_X0, y: 62, w: TRAY_X1 - TRAY_X0, d: 20, r: 2 };
/** A strip in its slot, and the strip's thickness above the tray. */
const STRIP_W = 5;
const STRIP_D = 16;
const STRIP_H = 1.3;
/** The friction rulers between each rack and the rails. */
const RULER_BACK: Plan = { x: TRAY_X0, y: -57, w: TRAY_X1 - TRAY_X0, d: 5, r: 0.8 };
const RULER_FRONT: Plan = { x: TRAY_X0, y: 52, w: TRAY_X1 - TRAY_X0, d: 5, r: 0.8 };
/** The rails the carriage rides on, with end stops. */
const RAIL_X0 = -124;
const RAIL_X1 = 138;
const RAIL_H = 6;
const RAIL_Y = [-42, 38.4] as const;
const RAIL_D = 3.6;
/** The lead screw down the middle of the bed that drives the carriage, and its crank at the right end. */
const SCREW_Z = 3.6;
const SCREW_R = 2;
const SCREW_X0 = RAIL_X0 - 4;
const SCREW_X1 = RAIL_X1 + 4;
/** Carriage travel per turn of the crank. */
export const LEAD = 10;
/** The drive box at the screw's right end, and the crank on its shaft. */
const BOX: Plan = { x: SCREW_X1 - 4, y: -7, w: 12, d: 14, r: 1.6 };
const BOX_H = 16;
const CRANK_Z = 11;
const CRANK_X = BOX.x + BOX.w + 3;
const CRANK_R = 5.5;
/** The carriage: a saddle on four bushings, the real floor plate on top. */
const SADDLE: Plan = { x: -38, y: -46, w: 76, d: 92, r: 2.6 };
const SADDLE_Z = RAIL_H;
const SADDLE_H = 3;
const PLATE: Plan = { x: -36, y: -40, w: 72, d: 80, r: 1.8 };
const PLATE_Z = SADDLE_Z + SADDLE_H;
const PLATE_H = 1.3;
export const FLOOR_Z = PLATE_Z + PLATE_H;
/** Where each walker stands on the plate, relative to the carriage, and how large it is drawn. */
export const WALKER_AT = { back: [-18, -22] as Plane, front: [18, 23] as Plane };
const S = 1.7;
const LABEL: Plan = { x: 120, y: 64, w: 32, d: 16, r: 1.6 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (const mu of [MU_MIN, MU_MAX]) for (const [wx, wy] of [WALKER_AT.back, WALKER_AT.front]) extremes.push([xOf(mu) + wx, wy, FLOOR_Z + 32 * S]);
extremes.push([CRANK_X + 8, 0, CRANK_Z + CRANK_R]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 8, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The screen offset that puts the carriage under a real floor of friction `mu`. */
export const carriageShift = (mu: number) => translateAlong(P, [xOf(mu), 0, 0]);

// ---------------------------------------------------------------- parts
export type Slot = 'rack-back' | 'rack-front' | 'carriage' | 'carriage-front' | 'crank';
export type Needle = 'back' | 'front';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'dial'; matrix: string; needle: Needle }
  | { kind: 'walker'; walker: Needle }
  | { kind: 'slot'; slot: Slot };

const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screws = (list: Part[], points: Point3[], size = 0.5) => list.push({ kind: 'dots', points: points.map(at), size });

// The base: a plate on four turned feet, with a groove and corner screws.
put({ kind: 'line', d: slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, tone: 'faint' });
for (const [x, y] of byDepth([
  [BASE.x + 22, BASE.y + 16],
  [BASE.x + BASE.w - 22, BASE.y + 16],
  [BASE.x + 22, BASE.y + BASE.d - 16],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 16],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.8, 28), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, 28), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.4), tone: 'mid', inner: sideSeam(BASE, -BASE_H / 2, P, 8) });
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

/** A rack's tray: a shallow slab with a recess outline for every slot and a screw at each end. */
function tray(plan: Plan) {
  put({ kind: 'solid', paths: slab(plan, 0, TRAY_H, 3, 0.5), tone: 'mid' });
  put({
    kind: 'line',
    d: SLOTS.map((mu) => planOutline({ x: xOf(mu) - STRIP_W / 2 - 0.5, y: plan.y + (plan.d - STRIP_D) / 2 - 0.5, w: STRIP_W + 1, d: STRIP_D + 1, r: 0.6 }, TRAY_H, P, 2)).join(''),
    tone: 'faint',
  });
  screws(parts, [[plan.x + 3.2, plan.y + plan.d / 2, TRAY_H], [plan.x + plan.w - 3.2, plan.y + plan.d / 2, TRAY_H]], 0.5);
}

/** A friction ruler: a thin strip with a tick per slot rooted on its edge toward the carriage, a long one every 0.2. */
function ruler(plan: Plan) {
  put({ kind: 'solid', paths: slab(plan, 0, 0.6, 3), tone: 'lo', crease: 'none' });
  const step = SLOT_STEP * PER_MU;
  // Ticks grow toward +y from their root on the strip's back edge.
  const ticks = topTicks(xOf(MU_MIN), xOf(MU_MAX), step, 4, plan.y + 0.8, 0.6, [1.8, 3.4], P);
  put({ kind: 'line', d: ticks.minor, tone: 'lo' });
  put({ kind: 'line', d: ticks.major, tone: 'mid' });
}

// The back rack, its ruler, the rails, the carriage (drawn by the figure), the front ruler and rack.
tray(TRAY_BACK);
put({ kind: 'slot', slot: 'rack-back' });
ruler(RULER_BACK);
/** A rail with an end stop at each end. */
function rail(y: number) {
  put({ kind: 'solid', paths: slab({ x: RAIL_X0, y, w: RAIL_X1 - RAIL_X0, d: RAIL_D, r: 1 }, 0, RAIL_H, 3, 0.4), tone: 'mid' });
  for (const x of [RAIL_X0 - 6, RAIL_X1]) {
    put({ kind: 'solid', paths: slab({ x, y: y - 2, w: 6, d: RAIL_D + 4, r: 1.2 }, 0, RAIL_H + 3, 3, 0.5), tone: 'mid' });
    screws(parts, [[x + 3, y + RAIL_D / 2, RAIL_H + 3]], 0.5);
  }
}
rail(RAIL_Y[0]);

// The lead screw on its two bearing blocks: the left block first, since the screw comes out of its
// visible face; the right block after, since the screw goes into its hidden one.
const V = viewOf(P);
/** The visible half of the screw's section at `x`, leaning a little along x as a thread does. */
function threadAt(x: number): string {
  const t0 = Math.atan2(-V[2], -V[1]);
  const points: Flat[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = t0 - Math.PI / 2 + 0.04 + ((Math.PI - 0.08) * k) / 12;
    points.push(at([x + ((t - t0) / Math.PI) * 1.4, -SCREW_R * Math.cos(t), SCREW_Z - SCREW_R * Math.sin(t)]));
  }
  return pathOf(points);
}
const bearing = (x: number) => {
  const block: Plan = { x: x - 4, y: -4.5, w: 8, d: 9, r: 1.2 };
  put({ kind: 'solid', paths: slab(block, 0, SCREW_Z + 3.4, 3, 0.4), tone: 'mid', inner: sideSeam(block, 2.2, P, 3) });
  screws(parts, [[x, -2.6, SCREW_Z + 3.4], [x, 2.6, SCREW_Z + 3.4]], 0.45);
};
bearing(SCREW_X0);
{
  const threads: string[] = [];
  for (let x = SCREW_X0 + 6; x <= SCREW_X1 - 6; x += 2.5) threads.push(threadAt(x));
  put({ kind: 'solid', paths: discAlong([SCREW_X0, 0, SCREW_Z], [1, 0, 0], SCREW_R, SCREW_X1 - SCREW_X0, P, 20), tone: 'mid', inner: threads.join('') });
}
// The drive box: the screw goes into its hidden face; gears inside turn it from the crank shaft higher up.
put({ kind: 'solid', paths: slab(BOX, 0, BOX_H, 3, 0.5), tone: 'mid', inner: sideSeam(BOX, BOX_H - 3, P, 3) });
screws(parts, [[BOX.x + 2, BOX.y + 2, BOX_H], [BOX.x + BOX.w - 2, BOX.y + 2, BOX_H], [BOX.x + 2, BOX.y + BOX.d - 2, BOX_H], [BOX.x + BOX.w - 2, BOX.y + BOX.d - 2, BOX_H]], 0.45);
put({ kind: 'solid', paths: discAlong([BOX.x + BOX.w, 0, CRANK_Z], [1, 0, 0], 2.6, 1, P, 24), tone: 'mid' });
put({ kind: 'solid', paths: discAlong([BOX.x + BOX.w + 1, 0, CRANK_Z], [1, 0, 0], 1.2, 2, P, 16), tone: 'mid' });
put({ kind: 'solid', paths: discAlong([CRANK_X, 0, CRANK_Z], [1, 0, 0], CRANK_R, 1.8, P, 40, 0.3), tone: 'mid' });
put({ kind: 'slot', slot: 'crank' });

rail(RAIL_Y[1]);
put({ kind: 'slot', slot: 'carriage' });
ruler(RULER_FRONT);
put({ kind: 'slot', slot: 'carriage-front' });
tray(TRAY_FRONT);
put({ kind: 'slot', slot: 'rack-front' });

// A label plate on the base at the front right, with three engraved rules.
put({ kind: 'solid', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', d: planOutline(insetPlan(LABEL, 1.6), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  d: [0, 1, 2].map((row) => onTop([[LABEL.x + 5, LABEL.y + 4 + row * 3], [LABEL.x + (row === 1 ? 15 : 23), LABEL.y + 4 + row * 3]], 0.8, P)).join(''),
  tone: 'lo',
  free: true,
});
screws(parts, [[LABEL.x + 2.6, LABEL.y + 2.6, 0.8], [LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 0.8]]);

export const PARTS: readonly Part[] = parts;

// ------------------------------------------------------------ floor strips
/** Rows of grit dots across a floor's top, spaced by its grip, from edge to edge of `plan`. */
function grit(plan: Plan, z: number, mu: number, columns: number): Flat[] {
  const gap = gritGap(mu);
  const rows = Math.max(1, Math.floor((plan.d - 2) / gap));
  const y0 = plan.y + (plan.d - (rows - 1) * gap) / 2;
  const dx = (plan.w - 2.4) / Math.max(columns - 1, 1);
  const points: Flat[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      // Every other row is staggered by half a column, as grit tape is.
      const shift = row % 2 && columns > 1 ? dx / 2 : 0;
      const x = plan.x + 1.2 + column * dx + shift;
      if (x > plan.x + plan.w - 1) continue;
      points.push(at([x, y0 + row * gap, z]));
    }
  }
  return points;
}

/** The strips in a rack, one per practiced floor: a thin tile in its slot, with its grit. */
export function rackParts(rack: 'back' | 'front', floors: readonly number[]): Part[] {
  const plan = rack === 'back' ? TRAY_BACK : TRAY_FRONT;
  const list: Part[] = [];
  for (const mu of floors) {
    const strip: Plan = { x: xOf(mu) - STRIP_W / 2, y: plan.y + (plan.d - STRIP_D) / 2, w: STRIP_W, d: STRIP_D, r: 0.6 };
    list.push({ kind: 'solid', paths: slab(strip, TRAY_H, STRIP_H, 2, 0.3), tone: 'hi' });
    list.push({ kind: 'dots', points: grit(strip, TRAY_H + STRIP_H, mu, 2), size: 0.5, tone: 'mid' });
  }
  return list;
}

// ------------------------------------------------------------ the walkers
/** A dial on a walker's chest: its face plane, and the face in the plane's own (x right, y down) units. */
export const DIAL_R = 4.8 * S;
const DIAL_Z = FLOOR_Z + 19 * S;
/** The dial's sweep: no tries without a fall at the left stop, every try at the right stop. */
export const DIAL_SWEEP = 240;
export const needleDegrees = (share: number) => -DIAL_SWEEP / 2 + Math.min(Math.max(share, 0), 1) * DIAL_SWEEP;

const circlePath = (r: number) => `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** The dial face, drawn in its plane: rim, a tick every eighth with a long one at each quarter, the scale arc and the hub. */
export const DIAL_FACE = (() => {
  const minor: string[] = [];
  const major: string[] = [];
  const count = 8;
  const ri = DIAL_R - 2.2;
  for (let k = 0; k <= count; k++) {
    const angle = ((-DIAL_SWEEP / 2 + (k / count) * DIAL_SWEEP) * Math.PI) / 180;
    const big = k % 2 === 0;
    const r0 = big ? ri : DIAL_R - 1.2;
    const sx = Math.sin(angle);
    const sy = -Math.cos(angle);
    // Every tick hangs from the rim; a long one runs in to the scale arc, so both its ends land.
    (big ? major : minor).push(`M${(sx * r0).toFixed(2)} ${(sy * r0).toFixed(2)}L${(sx * DIAL_R).toFixed(2)} ${(sy * DIAL_R).toFixed(2)}`);
  }
  const a0 = (-DIAL_SWEEP / 2) * (Math.PI / 180);
  const a1 = (DIAL_SWEEP / 2) * (Math.PI / 180);
  const arc = `M${(Math.sin(a0) * ri).toFixed(2)} ${(-Math.cos(a0) * ri).toFixed(2)}A${ri} ${ri} 0 1 1 ${(Math.sin(a1) * ri).toFixed(2)} ${(-Math.cos(a1) * ri).toFixed(2)}`;
  return { rim: circlePath(DIAL_R), minor: minor.join(''), major: major.join(''), arc, hub: circlePath(1.1) };
})();
/** The needle, pointing up from the hub in the dial's plane, to be turned. */
export const NEEDLE = `M0 1.6L0 ${-(DIAL_R - 1.3)}`;

/** One test walker standing at (cx, cy) on the plate, facing the viewer, its chest dial a slot. Sizes are in walker units of S. */
function walkerParts([cx, cy]: Plane, needle: Needle): Part[] {
  const list: Part[] = [];
  const solid = (paths: SolidPaths, tone: Tone = 'hi', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => list.push({ kind: 'solid', paths, tone, ...extra });
  const z0 = FLOOR_Z;
  const box = (x: number, y: number, w: number, d: number, r: number): Plan => ({ x: cx + x * S, y: cy + y * S, w: w * S, d: d * S, r: r * S });
  const post = (x: number, y: number, r: number, z: number, h: number, steps: number, bevel = 0) => cyl(cx + x * S, cy + y * S, r * S, z0 + z * S, h * S, steps, bevel);
  // Legs, the far-left one first: a foot, a shin, a knee and a thigh up to the hip.
  const leg = (side: -1 | 1) => {
    const lx = side * 3.4;
    solid(slab(box(lx - 2.3, -2.6, 4.6, 6.8, 1.2), z0, 1.4 * S, 3, 0.3), 'mid');
    solid(post(lx, 0.2, 1.2, 1.4, 4.4, 16), 'mid');
    solid(post(lx, 0.2, 1.8, 5.8, 1.5, 20, 0.2), 'mid');
    solid(post(lx, 0.2, 1.4, 7.3, 3.9, 16), 'mid');
  };
  leg(-1);
  leg(1);
  // The hip block, the arms either side of the torso, and the torso with the seam under its lid.
  solid(slab(box(-5.4, -2.6, 10.8, 5.6, 1), z0 + 11.2 * S, 2.4 * S, 3, 0.3), 'mid');
  const arm = (side: -1 | 1) => {
    solid(post(side * 8.4, 0, 1.1, 16, 7.2, 14), 'mid');
    solid(post(side * 8.4, 0, 1.5, 22.4, 1.6, 18, 0.2), 'mid');
  };
  arm(-1);
  const torso = box(-7, -3.4, 14, 6.8, 1.2);
  solid(slab(torso, z0 + 13.6 * S, 11.6 * S, 3, 0.5), 'hi', { inner: sideSeam(torso, z0 + 22.6 * S, P, 3) });
  arm(1);
  // The gauge panel on the chest, with four screws and the dial.
  const front = cy + 3.4 * S;
  const panel: Plan = { x: cx - 5.8 * S, y: front, w: 11.6 * S, d: 0.7, r: 0.3 };
  solid(slab(panel, DIAL_Z - 5.6 * S, 11.2 * S, 2), 'mid');
  const corner = 4.9 * S;
  screws(list, [
    [cx - corner, front + 0.7, DIAL_Z - corner + 0.3],
    [cx + corner, front + 0.7, DIAL_Z - corner + 0.3],
    [cx - corner, front + 0.7, DIAL_Z + corner - 0.3],
    [cx + corner, front + 0.7, DIAL_Z + corner - 0.3],
  ], 0.45);
  list.push({ kind: 'dial', matrix: sideMatrix([cx, front + 0.7], DIAL_Z, P, 'left'), needle });
  // The neck and the head with its camera eye.
  solid(post(0, 0, 1.6, 25.2, 1.2, 16), 'mid');
  solid(slab(box(-3.6, -2.8, 7.2, 5.6, 1.2), z0 + 26.4 * S, 5 * S, 3, 0.4), 'hi');
  list.push({ kind: 'line', d: sideRing([cx, cy + 2.8 * S, z0 + 29 * S], 1.5 * S, 'y', P, 24), tone: 'mid' });
  list.push({ kind: 'line', d: sideRing([cx, cy + 2.8 * S, z0 + 29 * S], 0.6 * S, 'y', P, 14), tone: 'lo' });
  return list;
}

/** Where a toppled walker's feet lie, relative to the carriage: it lies on its back along the plate, head toward -x. */
const TOPPLED_FEET_X = 19;

/**
 * One test walker toppled onto its back at y = `cy`: the standing walker
 * turned so its up (z) lies along -x, away from the viewer, and its front
 * (+y) faces up. Built from the same sizes, so the toppled robot is the same
 * robot; its dial faces up and still reads its share. Painted far to near:
 * the head and neck, the far arm, the torso with its dial panel and dial,
 * the near arm, the hip, then the far leg and the near leg.
 */
function toppledParts(cy: number, needle: Needle): Part[] {
  const list: Part[] = [];
  const solid = (paths: SolidPaths, tone: Tone = 'hi') => list.push({ kind: 'solid', paths, tone });
  // A standing point (x across the walker, y toward its front, z up) on the plate once toppled.
  const X = (z: number) => TOPPLED_FEET_X - z * S;
  const Y = (x: number) => cy - x * S;
  const Z = (y: number) => FLOOR_Z + (y + 3.4) * S;
  /** A standing box (x0, y0, z0, w, d, h) as it lies. */
  const box = (x0: number, y0: number, z0: number, w: number, d: number, h: number, bevel = 0.3) =>
    slabOf({ x: X(z0 + h), y: Y(x0 + w), w: h * S, d: w * S, r: 0.8 }, Z(y0), d * S, P, 3, bevel);
  /** A standing post (axis at x, y; from z, h long) as it lies, along +x. */
  const post = (x: number, y: number, r: number, z: number, h: number, steps = 18) => discAlong([X(z + h), Y(x), Z(y)], [1, 0, 0], r * S, h * S, P, steps);
  const leg = (side: -1 | 1) => {
    const lx = side * 3.4;
    solid(post(lx, 0.2, 1.4, 7.3, 3.9), 'mid');
    solid(post(lx, 0.2, 1.8, 5.8, 1.5, 22), 'mid');
    solid(post(lx, 0.2, 1.2, 1.4, 4.4), 'mid');
    solid(box(lx - 2.3, -2.6, 0, 4.6, 6.8, 1.4), 'mid');
  };
  const arm = (side: -1 | 1) => {
    solid(post(side * 8.4, 0, 1.5, 22.4, 1.6, 20), 'mid');
    solid(post(side * 8.4, 0, 1.1, 16, 7.2, 16), 'mid');
  };
  // Standing x maps to toppled -y, so the walker's right (+x) side is the far one.
  solid(box(-3.6, -2.8, 26.4, 7.2, 5.6, 5, 0.4), 'hi');
  list.push({ kind: 'line', d: ring(X(29), cy, 1.5 * S, Z(2.8), P, 24), tone: 'mid' });
  list.push({ kind: 'line', d: ring(X(29), cy, 0.6 * S, Z(2.8), P, 14), tone: 'lo' });
  solid(post(0, 0, 1.6, 25.2, 1.2, 18), 'mid');
  arm(1);
  solid(box(-7, -3.4, 13.6, 14, 6.8, 11.6, 0.5), 'hi');
  const top = Z(3.4);
  const panel: Plan = { x: X(19 + 5.6), y: Y(5.8), w: 11.2 * S, d: 11.6 * S, r: 0.3 };
  solid(slabOf(panel, top, 0.7, P, 2), 'mid');
  const corner = 4.9 * S;
  screws(list, [
    [X(19) - corner + 0.3, cy - corner, top + 0.7],
    [X(19) - corner + 0.3, cy + corner, top + 0.7],
    [X(19) + corner - 0.3, cy - corner, top + 0.7],
    [X(19) + corner - 0.3, cy + corner, top + 0.7],
  ], 0.45);
  // The face lies flat: its up points along -x (toward the head) and its right along -y.
  list.push({ kind: 'dial', matrix: topMatrix([X(19), cy], top + 0.7, P, 'y'), needle });
  arm(-1);
  solid(box(-5.4, -2.6, 11.2, 10.8, 5.6, 2.4), 'mid');
  leg(1);
  leg(-1);
  return list;
}

/** Each walker standing and toppled, built once; the figure shows one pose or the other. */
export const WALKERS: Record<Needle, { standing: readonly Part[]; toppled: readonly Part[] }> = {
  back: { standing: walkerParts(WALKER_AT.back, 'back'), toppled: toppledParts(WALKER_AT.back[1], 'back') },
  front: { standing: walkerParts(WALKER_AT.front, 'front'), toppled: toppledParts(WALKER_AT.front[1], 'front') },
};

/** A walker stands while at least half of its tries end without a fall, and is drawn toppled below that. */
export const standsAt = (share: number) => share >= 0.5;

/** The crank's handle, turned by `turns` of the lead screw: a pin from the crank's face and a grip on it. */
export function crankHandle(turns: number): { pin: SolidPaths; grip: SolidPaths } {
  const t = turns * Math.PI * 2;
  const y = -(CRANK_R - 1.4) * Math.cos(t);
  const z = CRANK_Z - (CRANK_R - 1.4) * Math.sin(t);
  return {
    pin: discAlong([CRANK_X + 1.8, y, z], [1, 0, 0], 0.7, 2, P, 12),
    grip: discAlong([CRANK_X + 3.8, y, z], [1, 0, 0], 1.2, 4, P, 16, 0.2),
  };
}
/** The crank's turns when the carriage stands under a real floor of friction `mu`. */
export const crankTurns = (mu: number) => xOf(mu) / LEAD;

/**
 * The carriage at the practice floor, with the real floor plate's grit for
 * a floor of friction `mu`: bushings and nut, saddle, the back index tab,
 * the lit plate and both walkers, back to front.
 */
export function carriageParts(mu: number): Part[] {
  const list: Part[] = [];
  // The bushings that ride the back rail, the nut on the lead screw, the bushings on the front rail.
  const bushings = (y: number) => {
    for (const x of [-35, 21]) {
      list.push({ kind: 'solid', paths: slab({ x, y: y - 1.4, w: 14, d: RAIL_D + 2.8, r: 1 }, 2, SADDLE_Z - 2, 3), tone: 'mid' });
    }
  };
  bushings(RAIL_Y[0]);
  list.push({ kind: 'solid', paths: slab({ x: -8, y: -4.6, w: 16, d: 9.2, r: 1.4 }, 0.9, SADDLE_Z - 0.9, 3), tone: 'mid' });
  bushings(RAIL_Y[1]);
  list.push({ kind: 'solid', paths: slab(SADDLE, SADDLE_Z, SADDLE_H, 4, 0.6), tone: 'mid', inner: sideSeam(SADDLE, SADDLE_Z + 1.2, P, 4) });
  screws(list, [
    [SADDLE.x + 2, SADDLE.y + 1.6, PLATE_Z],
    [SADDLE.x + SADDLE.w - 2, SADDLE.y + 1.6, PLATE_Z],
    [SADDLE.x + 2, SADDLE.y + SADDLE.d - 1.6, PLATE_Z],
    [SADDLE.x + SADDLE.w - 2, SADDLE.y + SADDLE.d - 1.6, PLATE_Z],
  ], 0.5);
  // The back index tab, pointing at the back ruler.
  list.push({ kind: 'solid', paths: extrude([[-3, SADDLE.y + 1], [3, SADDLE.y + 1], [0, RULER_BACK.y + 2.6]], SADDLE_Z + 0.8, 1.2, P), tone: 'mid' });
  // The real floor plate, the one lit part, with its grit.
  list.push({ kind: 'solid', paths: slab(PLATE, PLATE_Z, PLATE_H, 3, 0.4), tone: 'hi', lit: true });
  list.push({ kind: 'dots', points: grit(insetPlan(PLATE, 1), FLOOR_Z, mu, 11), size: 0.42, tone: 'mid' });
  // The reading line down the middle of the plate, from tab to tab: the real floor's friction on both rulers.
  list.push({ kind: 'line', d: onTop([[0, PLATE.y], [0, PLATE.y + PLATE.d]], FLOOR_Z, P), tone: 'lo' });
  list.push({ kind: 'walker', walker: 'back' }, { kind: 'walker', walker: 'front' });
  return list;
}

/** The front index tab, drawn after the front ruler it points at. */
export const CARRIAGE_FRONT: readonly Part[] = [
  { kind: 'solid', paths: extrude([[-3, SADDLE.y + SADDLE.d - 1], [0, RULER_FRONT.y + 2.6], [3, SADDLE.y + SADDLE.d - 1]], SADDLE_Z + 0.8, 1.2, P), tone: 'mid' },
];

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
