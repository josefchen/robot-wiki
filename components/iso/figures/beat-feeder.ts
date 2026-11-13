/**
 * The beat feeder for ControlLoopBudget, drawn with the isometric kit.
 *
 * The object is the explanation. The arm wants a fresh order on every beat
 * of its control loop, 50 beats a second. An upright pocket wheel is that
 * beat: a pendulum below its hub swings once per beat, and its anchor lets
 * a star wheel on the axle, and the pocket wheel with it, step one pocket.
 * At the left a small crank press is the model: one turn of its flywheel is
 * one stamping stroke, and each finished token rolls down a short chute into
 * the pocket waiting under it. A stroke takes as long as one answer takes,
 * so on the robot's own computer the press finishes a token only every 2.6
 * beats and most pockets leave the press empty.
 *
 * At the next station the arm's feeler (the one lit part) drops onto each
 * pocket as it arrives: a token is a fresh order for that beat, an empty
 * pocket lets the feeler fall in, and the arm repeats its last order. The
 * tokens ride on over the top of the wheel as a record of the last eleven
 * beats, held in by a guard on the right, and tip out into a bin at the
 * bottom. So the wheel shows the proportion at a glance: on the robot's own
 * computer about 2 pockets in 5 carry a token, on the data-center computer
 * every one does.
 *
 * World units are about a millimetre: x to the right, y toward the viewer,
 * z up. The wheel turns in the x-z plane about an axle along y. Time in the
 * model is counted in beats (one beat is CONTROL_PERIOD_MS); every moving
 * part is drawn from `poseAt`, the one pure function of the model.
 */
import {
  cylinder as kitCylinder,
  cameraOf,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  SHADES,
  sideRing,
  sideSeam,
  sideTicks,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong, plateIn, viewOf } from '../prism.ts';
import { phoneFitOf } from '../phone-fit.ts';
import { steadySolid } from '../steady-path.ts';
import { CONTROL_HZ, CONTROL_PERIOD_MS } from '../../../lib/control-loop.ts';

export const WIDTH = 600;
export const AZIMUTH = 60;
export const ELEVATION = 24;

// ------------------------------------------------------------- the model
/** Pockets on the wheel; one beat steps it one pocket. */
export const POCKETS = 20;
/** The station the press drops into, the arm's feeler, and where tokens tip out. */
export const PRESS_STATION = 0;
export const FEELER_STATION = 1;
export const RELEASE_STATION = 12;
/** Beats the record shows: the pockets from the feeler up to the release. */
export const RECORD = RELEASE_STATION - FEELER_STATION;

/** How many beats one stamping stroke (one answer) takes. */
export const strokeBeats = (inferenceMs: number) => inferenceMs / CONTROL_PERIOD_MS;

/**
 * When a token drops into the pocket under the press during beat interval
 * `k` (from beat k to beat k + 1), in beats, or null when no stroke ends in
 * it. A press slower than the beat runs stroke after stroke, a stroke ending
 * every S beats; a press faster than the beat stamps one token as each new
 * pocket arrives and waits for the next.
 */
export function dropIn(k: number, S: number): number | null {
  if (S <= 1) return k + S;
  const n = Math.ceil(k / S - 1e-9);
  const at = n * S;
  return at < k + 1 - 1e-9 ? at : null;
}

/** True when the arm's beat `k` gets a fresh order: a token dropped in the interval before it. */
export const freshAt = (k: number, S: number) => dropIn(k - 1, S) !== null;

/** Fresh orders in a second of the arm's 50 beats, in steady running. */
export const freshPerSecond = (inferenceMs: number) => Math.min(CONTROL_HZ, Math.round(1000 / inferenceMs));

/** Real seconds the figure spends on one beat, so the eye can follow it. */
export const BEAT_S = 0.62;
/** The share of a beat the wheel spends stepping, at its end. */
const STEP_SHARE = 0.24;
/** The pendulum's swing either side, in degrees. */
const SWING = 8;
/** The moment the server, reduced motion and the first frame draw, in beats. */
export const STILL_T = 40.5;

const smooth = (u: number) => {
  const x = Math.min(Math.max(u, 0), 1);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ------------------------------------------------------------ the layout
const BASE: Plan = { x: -178, y: -44, w: 300, d: 92, r: 9 };
const BASE_H = 8;
const FOOT_H = 5;

/** The wheel: hub, outer radius, its faces, and its pockets. */
export const HUB: Point3 = [0, 0, 104];
const R = 72;
const FACE: [number, number] = [-6, 6];
const NOTCH_W = 6.6;
const COIN_C = 66.4;
const COIN_R = 6.2;
const COIN_Y: [number, number] = [-0.4, 7.2];
/** Angle of the press station, in degrees; each pocket further on is 18 degrees on, clockwise. */
const START = 162;
const PITCH = 360 / POCKETS;
const angleOf = (station: number) => ((START - PITCH * station) * Math.PI) / 180;
const radial = (station: number, r: number, y = 0): Point3 => {
  const a = angleOf(station);
  return [HUB[0] + r * Math.cos(a), HUB[1] + y, HUB[2] + r * Math.sin(a)];
};

/** The press at the left. */
const PRESS_BASE: Plan = { x: -172, y: -26, w: 66, d: 52, r: 3 };
const COLUMN: Plan = { x: -168, y: -14, w: 18, d: 28, r: 2 };
const JAW = { x: -168, y: -14, w: 58, d: 28, r: 2 };
const JAW_Z: [number, number] = [108, 126];
const HEAD_Z: [number, number] = [162, 180];
const DIE: Plan = { x: -135, y: -9, w: 22, d: 18, r: 1.2 };
const DIE_TOP = 132;
const PUNCH_X = -124;
const COIN_IN_DIE: Point3 = [PUNCH_X, 0, DIE_TOP - 2 + COIN_R];
const RAM_R = 4;
const RAM_TRAVEL = 7.4;
const RAM_LOW = COIN_IN_DIE[2] + COIN_R + 0.7;
const GUIDE_Z: [number, number] = [154, 162];
const FLY: Point3 = [-140, 18, 171];
const FLY_R = 15;
const FLY_T = 5;
const CRANK_R = 10;

/** The chute from the die to the pocket under the press. */
const CHUTE_X: [number, number] = [-112, -80];
const CHUTE_W = 8;

/** The feeler at the arm's station, on a guide block outside the rim. */
const FEELER_Y = 3;
const FEELER_ON = R + 1.2;
const FEELER_IN = COIN_C - NOTCH_W + 1.6;
const FEELER_UP = R + 2.8;
const FEELER_LEN = 30;

/** The guard over the right side, and the tray and bin under it. */
const GUARD: [number, number] = [7.5, 11.5];
const GUARD_R: [number, number] = [74.4, 76.2];
const GUARD_Y: [number, number] = [-7, -1.2];
const TRAY: [Point3, Point3] = [
  [42, 0, 36],
  [78, 0, 22],
];
const BIN: Plan = { x: 72, y: -17, w: 38, d: 34, r: 2 };
const BIN_H = 21;
const BIN_WALL = 2.2;

/** The pendulum below the hub, in front of the beat plate. */
const PIVOT: Point3 = [0, 19.5, 76];
const ROD_TO = 54;
const BOB_R = 7.5;
const PLATE: Plan = { x: -25, y: 12, w: 50, d: 3, r: 1 };
const PLATE_TOP = 82;
const STAR: [number, number] = [14, 17];
const STAR_R: [number, number] = [14.2, 19.4];
const PALLET_ANGLE = 36;

const LABEL: Plan = { x: -96, y: 30, w: 46, d: 10, r: 1.6 };

// ------------------------------------------------------------ the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (let a = 0; a < 360; a += 15) {
  const t = (a * Math.PI) / 180;
  extremes.push([R * Math.cos(t), FACE[0], HUB[2] + R * Math.sin(t)], [R * Math.cos(t), FACE[1] + 2, HUB[2] + R * Math.sin(t)]);
}
extremes.push(
  [COLUMN.x, COLUMN.y, HEAD_Z[1]],
  [COLUMN.x, COLUMN.y + COLUMN.d, HEAD_Z[1]],
  [FLY[0] - FLY_R, FLY[1] + FLY_T, FLY[2] + FLY_R],
  [FLY[0] + FLY_R, FLY[1] + FLY_T, FLY[2] + FLY_R],
  radial(FEELER_STATION, FEELER_UP + FEELER_LEN + 4, FEELER_Y),
);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flat0 = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flat0.map(([x]) => x)) - Math.min(...flat0.map(([x]) => x));
const spanY = Math.max(...flat0.map(([, y]) => y)) - Math.min(...flat0.map(([, y]) => y));
const PAD = 10;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanY) / spanX + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 8 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Point3): Point3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const Y: Point3 = [0, 1, 0];
const V = viewOf(P);

// ------------------------------------------------- a solid swept along y
function signedArea(points: Flat[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[(i + 1) % points.length]!;
    area += ax * by - bx * ay;
  }
  return area / 2;
}
const oriented = (points: Flat[]) => (signedArea(points) < 0 ? [...points].reverse() : points);

/**
 * Any outline in the x-z plane (convex or not: a notched wheel, a toothed
 * star, an arc of sheet), swept along +y from y0 to y1, shaded the way the
 * kit shades its prisms: the visible face is the light top, the visible
 * sides fall into the four shades, and the outline is the silhouette.
 */
function sweptY(outline: Array<[number, number]>, y0: number, y1: number): SolidPaths {
  const count = outline.length;
  const near = outline.map(([x, z]) => [x, y0, z] as Point3);
  const far = outline.map(([x, z]) => [x, y1, z] as Point3);
  // Counter-clockwise about +y (seen from +y) when the x-z area, with z up and x right, is negative in this sense.
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [ax, az] = outline[i]!;
    const [bx, bz] = outline[(i + 1) % count]!;
    area += ax * bz - bx * az;
  }
  const { sinA, cosA } = cameraOf(P);
  const light = unit([-sinA, cosA, 0.9]);
  const normals = outline.map(([ax, az], i) => {
    const [bx, bz] = outline[(i + 1) % count]!;
    const edge: Point3 = [bx - ax, 0, bz - az];
    // Outward in the x-z plane: for a ring that turns from +x toward +z (positive area), outward is (dz, -dx).
    const n = unit(area > 0 ? [edge[2], 0, -edge[0]] : [-edge[2], 0, edge[0]]);
    return n;
  });
  const facing = normals.map((n) => dot(n, V) > 1e-9);
  const topIsFar = dot(Y, V) > 0;
  const top = (topIsFar ? far : near).map(at);
  const bottom = (topIsFar ? near : far).map(at);
  const runs = (want: boolean) => {
    const out: number[][] = [];
    const start = facing.findIndex((flag, i) => flag !== facing[(i + count - 1) % count]);
    if (start < 0) return facing[0] === want ? [Array.from({ length: count + 1 }, (_, i) => i % count)] : [];
    let run: number[] | null = null;
    for (let step = 0; step < count; step++) {
      const i = (start + step) % count;
      if (facing[i] === want) {
        if (!run) run = [i];
        run.push((i + 1) % count);
      } else if (run) {
        out.push(run);
        run = null;
      }
    }
    if (run) out.push(run);
    return out;
  };
  const edge: string[] = [];
  const crease: string[] = [];
  for (const run of runs(false)) edge.push(pathOf(run.map((i) => top[i]!)));
  for (const run of runs(true)) {
    crease.push(pathOf(run.map((i) => top[i]!)));
    edge.push(pathOf(run.map((i) => bottom[i]!)));
  }
  for (let i = 0; i < count; i++) {
    if (facing[(i + count - 1) % count] !== facing[i]) edge.push(pathOf([top[i]!, bottom[i]!]));
  }
  const fill = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
  const buckets: string[][] = Array.from({ length: SHADES }, () => []);
  for (let i = 0; i < count; i++) {
    if (!facing[i]) continue;
    const next = (i + 1) % count;
    const quad = pathOf(oriented([top[i]!, top[next]!, bottom[next]!, bottom[i]!]), true);
    fill.push(quad);
    const lit = (dot(normals[i]!, light) + 1) / 2;
    buckets[Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)))]!.push(quad);
  }
  return { fill: fill.join(''), outline: edge.join(''), crease: crease.join(''), top: pathOf(oriented(top), true), shades: buckets.map((b) => b.join('')) };
}

/** The pocket wheel's outline turned by `turn` stations (clockwise), relative to the world origin. */
function wheelOutline(turn: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const half = Math.atan2(NOTCH_W, Math.sqrt(R * R - NOTCH_W * NOTCH_W));
  const wall = Math.sqrt(R * R - NOTCH_W * NOTCH_W);
  const push = (r: number, a: number, across = 0) =>
    out.push([HUB[0] + r * Math.cos(a) - across * Math.sin(a), HUB[2] + r * Math.sin(a) + across * Math.cos(a)]);
  // Pockets in rising angle, each followed by the rim arc up to the next.
  for (let k = 0; k < POCKETS; k++) {
    const a = angleOf(-turn) + (k * 2 * Math.PI) / POCKETS;
    push(wall, a, -NOTCH_W);
    push(COIN_C, a, -NOTCH_W);
    for (let s = 1; s < 8; s++) {
      const t = (s / 8) * Math.PI;
      // From the -across wall round the bottom to the +across wall.
      out.push([
        HUB[0] + COIN_C * Math.cos(a) + NOTCH_W * (Math.cos(t) * Math.sin(a) - Math.sin(t) * Math.cos(a)),
        HUB[2] + COIN_C * Math.sin(a) + NOTCH_W * (-Math.cos(t) * Math.cos(a) - Math.sin(t) * Math.sin(a)),
      ]);
    }
    push(COIN_C, a, NOTCH_W);
    push(wall, a, NOTCH_W);
    const gap = (2 * Math.PI) / POCKETS - 2 * half;
    for (let s = 1; s < 4; s++) push(R, a + half + (gap * s) / 4);
  }
  return out;
}

/** The star wheel on the axle, one tooth per pocket, turned with the wheel. */
function starOutline(turn: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const pitch = (2 * Math.PI) / POCKETS;
  for (let k = 0; k < POCKETS; k++) {
    const a = angleOf(-turn) + k * pitch + pitch / 2;
    const pts: Array<[number, number]> = [
      [STAR_R[0], a - pitch * 0.32],
      [STAR_R[1], a - pitch * 0.08],
      [STAR_R[1], a + pitch * 0.08],
      [STAR_R[0], a + pitch * 0.32],
    ];
    for (const [r, t] of pts) out.push([HUB[0] + r * Math.cos(t), HUB[2] + r * Math.sin(t)]);
  }
  return out;
}

const wheelCache = new Map<number, { wheel: SolidPaths; star: SolidPaths }>();
/** The wheel and its star at a turn, in stations; the picture repeats every whole station. */
export function wheelAt(turn: number): { wheel: SolidPaths; star: SolidPaths } {
  const key = Math.round(mod(turn, 1) * 1000) / 1000;
  const hit = wheelCache.get(key);
  if (hit) return hit;
  const made = {
    wheel: steadySolid(sweptY(wheelOutline(key), FACE[0], FACE[1])),
    star: steadySolid(sweptY(starOutline(key), STAR[0], STAR[1])),
  };
  if (wheelCache.size > 600) wheelCache.clear();
  wheelCache.set(key, made);
  return made;
}

// ------------------------------------------------------------- parts
export type Slot = 'press-moving' | 'press-token' | 'wheel' | 'tokens' | 'star' | 'feeler' | 'pendulum' | 'falling';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: Slot };

let into: Part[] = [];
const put = (part: Part) => into.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', paths: steadySolid(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', d, tone, free });
const screws = (points: Point3[], size = 0.5) => put({ kind: 'dots', points: points.map(at), size });
const collect = (build: () => void): Part[] => {
  const saved = into;
  into = [];
  build();
  const out = into;
  into = saved;
  return out;
};

const parts: Part[] = [];
into = parts;

// The base: a plate on four turned feet, with a groove and corner screws.
line(slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, 'faint');
for (const [x, y] of [
  [BASE.x + 22, BASE.y + 16],
  [BASE.x + BASE.w - 22, BASE.y + 16],
  [BASE.x + 22, BASE.y + BASE.d - 16],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 16],
].sort((a, b) => depthOf([a[0]!, a[1]!, 0], P) - depthOf([b[0]!, b[1]!, 0], P)) as Plane[]) {
  solid(cyl(x, y, 8.4, -BASE_H - FOOT_H, 2, 28), 'lo');
  solid(cyl(x, y, 6.2, -BASE_H - FOOT_H + 2, FOOT_H - 2, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -3, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
{
  const corners: Point3[] = [
    [BASE.x + 9, BASE.y + 9, 0],
    [BASE.x + BASE.w - 9, BASE.y + 9, 0],
    [BASE.x + 9, BASE.y + BASE.d - 9, 0],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9, 0],
  ];
  line(corners.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo');
  screws(corners, 0.55);
}

// The wheel's frame behind it: two legs, a cross bar and the bearing block on top.
const LEG_Y = -26;
{
  solid(slab({ x: -58, y: LEG_Y - 6, w: 116, d: 12, r: 2 }, 0, 3, 3, 0.4), 'lo');
  screws([[-52, LEG_Y, 3], [52, LEG_Y, 3]], 0.45);
  for (const side of [-1, 1]) {
    solid(barBetween([side * 48, LEG_Y, 3], [side * 7, LEG_Y, HUB[2] - 8], [0, 1, 0], 7, 4, P), 'mid');
  }
  solid(barBetween([-30, LEG_Y, 44], [30, LEG_Y, 44], [0, 1, 0], 6, 3, P), 'mid');
  solid(slab({ x: -11, y: LEG_Y - 6, w: 22, d: 12, r: 2 }, HUB[2] - 10, 20, 3, 0.5), 'mid');
  screws([[-7, LEG_Y - 2, HUB[2] + 10], [7, LEG_Y + 2, HUB[2] + 10]], 0.45);
  // The axle's back length, from the bearing block to the wheel.
  solid(discAlong([HUB[0], LEG_Y + 6, HUB[2]], Y, 4, FACE[0] - LEG_Y - 6, P, 24), 'mid');
  // The feeler's bracket: an arm out from the bearing block behind the wheel, and a stub forward to the guide block.
  const u = radial(FEELER_STATION, 1);
  const dir = unit(sub(u, HUB));
  const root = add([HUB[0], LEG_Y, HUB[2]], mul(dir, 12));
  const tip = add([HUB[0], LEG_Y, HUB[2]], mul(dir, 90));
  solid(barBetween(root, tip, [0, 1, 0], 4, 6, P), 'mid');
  solid(barBetween(add(tip, [0, 3, 0]), add(tip, [0, FEELER_Y - 6 - LEG_Y, 0]), dir, 6, 6, P), 'mid');
  // The guard's bracket: a strap back from its lower end and a bar along to the right leg.
  const end = radial(GUARD[1], GUARD_R[1] - 0.6, 0);
  const legAt = 48 - (41 * (end[2] - 3)) / (HUB[2] - 11);
  solid(barBetween([legAt, LEG_Y, end[2]], [end[0], LEG_Y, end[2]], [0, 0, 1], 4, 3, P), 'mid');
  solid(barBetween([end[0], LEG_Y + 1.5, end[2]], [end[0], GUARD_Y[0], end[2]], [0, 0, 1], 4, 3, P), 'mid');
}

// The press at the left: a C-frame on its base block, the die on the lower jaw, the ram and flywheel above.
solid(slab(PRESS_BASE, 0, 12, 3, 0.6), 'lo', { inner: sideSeam(PRESS_BASE, 6, P, 3) });
screws([[PRESS_BASE.x + 4, PRESS_BASE.y + 4, 12], [PRESS_BASE.x + PRESS_BASE.w - 4, PRESS_BASE.y + PRESS_BASE.d - 4, 12], [PRESS_BASE.x + PRESS_BASE.w - 4, PRESS_BASE.y + 4, 12], [PRESS_BASE.x + 4, PRESS_BASE.y + PRESS_BASE.d - 4, 12]], 0.5);
solid(slab(COLUMN, 12, HEAD_Z[0] - 12, 3, 0.5), 'mid', { inner: sideSeam(COLUMN, 30, P, 3) });
solid(slab(JAW, JAW_Z[0], JAW_Z[1] - JAW_Z[0], 3, 0.6), 'mid', { inner: sideSeam(JAW, JAW_Z[0] + 5, P, 3) });
solid(slab(DIE, JAW_Z[1], DIE_TOP - JAW_Z[1], 2, 0.4), 'mid', { inner: sideSeam(DIE, JAW_Z[1] + 2.4, P, 2) });
// The slot the blank stands in.
line(planOutline({ x: PUNCH_X - COIN_R - 0.6, y: -6, w: 2 * COIN_R + 1.2, d: 13, r: 0.6 }, DIE_TOP, P), 'faint');
screws([[DIE.x + 2.4, DIE.y + 2.4, DIE_TOP], [DIE.x + DIE.w - 2.4, DIE.y + DIE.d - 2.4, DIE_TOP]], 0.45);
put({ kind: 'slot', slot: 'press-moving' });
// The chute: a strut from the base, the back rail, the deck, the token, the front rail.
const chuteZ = (x: number) => {
  const a = COIN_IN_DIE[2] - 1.8;
  const mouth = radial(PRESS_STATION, R + 6);
  return lerp(a, mouth[2], (x - CHUTE_X[0] + 2) / (mouth[0] - CHUTE_X[0] + 2)) - COIN_R;
};
{
  const sx = CHUTE_X[1] - 4;
  solid(cyl(sx, 0, 4.2, 0, 2, 20), 'lo');
  solid(cyl(sx, 0, 1.8, 2, chuteZ(sx) - 1.6 - 2, 16), 'mid');
  const a: Point3 = [CHUTE_X[0], 0, chuteZ(CHUTE_X[0])];
  const b: Point3 = [CHUTE_X[1], 0, chuteZ(CHUTE_X[1])];
  solid(barBetween(add(a, [0, -CHUTE_W - 0.6, 1.4]), add(b, [0, -CHUTE_W - 0.6, 1.4]), [0, 1, 0], 1.2, 4.2, P), 'mid');
  const along = unit(sub(b, a));
  // plateIn's thickness runs along along x across, which points up out of the deck.
  const up = unit(cross(along, [0, 1, 0]));
  const origin = add(add(a, [0, -CHUTE_W, 0]), mul(up, -1.4));
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  solid(plateIn(origin, along, [0, 1, 0], [[0, 0], [length, 0], [length, CHUTE_W * 2], [0, CHUTE_W * 2]], 1.4, P), 'mid');
}
put({ kind: 'slot', slot: 'press-token' });
{
  const a: Point3 = [CHUTE_X[0], 0, chuteZ(CHUTE_X[0])];
  const b: Point3 = [CHUTE_X[1], 0, chuteZ(CHUTE_X[1])];
  solid(barBetween(add(a, [0, CHUTE_W + 0.6, 1.4]), add(b, [0, CHUTE_W + 0.6, 1.4]), [0, 1, 0], 1.2, 4.2, P), 'mid');
}

// The pocket wheel, its tokens, then the parts in front of it.
put({ kind: 'slot', slot: 'wheel' });
// Two turned grooves on the wheel's face, and the bolt circle of its hub.
line(sideRing([HUB[0], FACE[1], HUB[2]], 50, 'y', P, 96) + sideRing([HUB[0], FACE[1], HUB[2]], 28, 'y', P, 72), 'faint');
screws(Array.from({ length: 6 }, (_, i) => [HUB[0] + 22 * Math.cos((i * Math.PI) / 3 + 0.3), FACE[1], HUB[2] + 22 * Math.sin((i * Math.PI) / 3 + 0.3)] as Point3), 0.5);
// The guard over the right side: an arc of sheet just outside the rim, behind the tokens' faces.
{
  const outline: Array<[number, number]> = [];
  const steps = 28;
  for (let s = 0; s <= steps; s++) {
    const a = angleOf(lerp(GUARD[0], GUARD[1], s / steps));
    outline.push([HUB[0] + GUARD_R[1] * Math.cos(a), HUB[2] + GUARD_R[1] * Math.sin(a)]);
  }
  for (let s = steps; s >= 0; s--) {
    const a = angleOf(lerp(GUARD[0], GUARD[1], s / steps));
    outline.push([HUB[0] + GUARD_R[0] * Math.cos(a), HUB[2] + GUARD_R[0] * Math.sin(a)]);
  }
  solid(sweptY(outline, GUARD_Y[0], GUARD_Y[1]), 'mid');
  screws([radial(GUARD[0] + 0.25, GUARD_R[1], GUARD_Y[0] + 3), radial(GUARD[1] - 0.25, GUARD_R[1], GUARD_Y[0] + 3)], 0.45);
}

put({ kind: 'slot', slot: 'tokens' });

// The hub boss on the wheel's face, the beat plate, the star wheel and the axle's nut.
solid(discAlong([HUB[0], FACE[1], HUB[2]], Y, 9, STAR[0] - FACE[1], P, 36), 'mid');
solid(slab({ x: PLATE.x - 4, y: PLATE.y - 3, w: PLATE.w + 8, d: PLATE.d + 6, r: 1.4 }, 0, 3, 3, 0.4), 'lo');
screws([[PLATE.x - 1.5, PLATE.y + 1.5, 3], [PLATE.x + PLATE.w + 1.5, PLATE.y + 1.5, 3]], 0.45);
solid(slab(PLATE, 3, PLATE_TOP - 3, 2, 0.4), 'mid');
{
  // The beat scale: a strip on the plate under the bob, its ticks hanging from the strip's top edge.
  const strip: Plan = { x: -18, y: PLATE.y + PLATE.d, w: 36, d: 1.2, r: 0.4 };
  const top = 12;
  solid(slab(strip, 6, top - 6, 2), 'lo', { crease: 'none' });
  const face = strip.y + strip.d;
  const ticks = sideTicks(-15, 15, 2.5, 6, face, top, [1.8, 3.4], P, 'x');
  line(ticks.minor, 'lo');
  line(ticks.major, 'mid');
  screws([[PLATE.x + 3.2, PLATE.y + PLATE.d, PLATE_TOP - 4], [PLATE.x + PLATE.w - 3.2, PLATE.y + PLATE.d, PLATE_TOP - 4]], 0.45);
}
put({ kind: 'slot', slot: 'star' });
solid(discAlong([HUB[0], STAR[1], HUB[2]], Y, 5.4, 2.6, P, 6), 'mid');
solid(discAlong([HUB[0], STAR[1] + 2.6, HUB[2]], Y, 2.4, 1.2, P, 20), 'mid');
// The pendulum's pivot pin through the beat plate.
solid(discAlong([PIVOT[0], PLATE.y + PLATE.d, PIVOT[2]], Y, 2.8, 1.4, P, 20), 'mid');
put({ kind: 'slot', slot: 'pendulum' });

// The feeler's guide block outside the rim, the feeler, and the two straps that hold it.
const FEEL_DIR = unit(sub(radial(FEELER_STATION, 1), HUB));
{
  const a = radial(FEELER_STATION, 80, FEELER_Y - 6);
  const b = radial(FEELER_STATION, 92, FEELER_Y - 6);
  solid(barBetween(add(a, [0, 2.5, 0]), add(b, [0, 2.5, 0]), [0, 1, 0], 5, 9, P, 0.4), 'mid');
}
put({ kind: 'slot', slot: 'feeler' });
for (const r of [82.5, 89.5]) {
  const c = radial(FEELER_STATION, r, FEELER_Y);
  solid(barBetween(add(c, [0, 2.6, 0]), add(c, [0, -2.6, 0]), FEEL_DIR, 2.2, 6.6, P), 'mid');
}

// The bin's floor and back walls, the tray down into it, the falling token, then the bin's near walls.
solid(slab(BIN, 0, 2.4, 3, 0.4), 'lo');
const binWall = (plan: Plan, inner?: string) => solid(slab(plan, 2.4, BIN_H - 2.4, 2, 0.3), 'mid', inner ? { inner } : {});
binWall({ x: BIN.x, y: BIN.y, w: BIN.w, d: BIN_WALL, r: 0.6 });
binWall({ x: BIN.x, y: BIN.y, w: BIN_WALL, d: BIN.d, r: 0.6 });
{
  const [a, b] = TRAY;
  solid(cyl(a[0] - 2, 0, 4.2, 0, 2, 20), 'lo');
  solid(cyl(a[0] - 2, 0, 1.8, 2, a[2] - 3.6, 16), 'mid');
  const along = unit(sub(b, a));
  const up = unit(cross(along, [0, 1, 0]));
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  solid(barBetween(add(a, [0, -8.6, 1.4]), add(b, [0, -8.6, 1.4]), [0, 1, 0], 1.2, 4, P), 'mid');
  solid(plateIn(add(add(a, [0, -8, 0]), mul(up, -1.4)), along, [0, 1, 0], [[0, 0], [length, 0], [length, 16], [0, 16]], 1.4, P), 'mid');
}
put({ kind: 'slot', slot: 'falling' });
binWall({ x: BIN.x + BIN.w - BIN_WALL, y: BIN.y, w: BIN_WALL, d: BIN.d, r: 0.6 });
{
  const front: Plan = { x: BIN.x, y: BIN.y + BIN.d - BIN_WALL, w: BIN.w, d: BIN_WALL, r: 0.6 };
  binWall(front, sideSeam(front, 8, P, 2));
  screws([[BIN.x + 4, BIN.y + BIN.d, 15], [BIN.x + BIN.w - 4, BIN.y + BIN.d, 15]], 0.45);
  // The tray's front rail, over the token sliding down it.
  const [a, b] = TRAY;
  solid(barBetween(add(a, [0, 8.6, 1.4]), add(b, [0, 8.6, 1.4]), [0, 1, 0], 1.2, 4, P), 'mid');
}

// The label plate at the front, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 2.8 + row * 2.2], [LABEL.x + (row === 1 ? 24 : 36), LABEL.y + 2.8 + row * 2.2]], 0.8, P)).join(''),
  'lo',
  true,
);
screws([[LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8]]);

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------- moving parts
/** A token: an upright disc stamped with a ring, built at the origin and moved with `tokenShift`. */
export const TOKEN_PARTS: readonly Part[] = collect(() => {
  solid(discAlong([0, COIN_Y[0], 0], Y, COIN_R, COIN_Y[1] - COIN_Y[0], P, 36, 0.4), 'hi');
  line(sideRing([0, COIN_Y[1], 0], COIN_R - 2, 'y', P, 28), 'lo');
  screws([[0, COIN_Y[1], 0]], 0.6);
});
export const tokenShift = (point: Point3) => translateAlong(P, point);

/** The ram and its punch, built up; the figure moves them down by `ramShift`. */
export const RAM_PARTS: readonly Part[] = collect(() => {
  solid(cyl(PUNCH_X, 0, RAM_R, RAM_LOW + RAM_TRAVEL, GUIDE_Z[0] - RAM_LOW + 1, 24), 'mid');
  solid(cyl(PUNCH_X, 0, RAM_R + 1.4, RAM_LOW + RAM_TRAVEL, 2.2, 24, 0.3), 'mid');
});
export const ramShift = (down: number) => translateAlong(P, [0, 0, -RAM_TRAVEL * down]);

/** The guide, head, flywheel axle and flywheel: drawn after the ram, fixed. */
export const HEAD_PARTS: readonly Part[] = collect(() => {
  solid(slab({ x: PUNCH_X - 7, y: -8, w: 14, d: 16, r: 1.2 }, GUIDE_Z[0], GUIDE_Z[1] - GUIDE_Z[0], 2, 0.4), 'mid');
  solid(slab(JAW, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], 3, 0.6), 'mid', { inner: sideSeam(JAW, HEAD_Z[1] - 5, P, 3) });
  screws([[JAW.x + 4, JAW.y + 4, HEAD_Z[1]], [JAW.x + JAW.w - 4, JAW.y + JAW.d - 4, HEAD_Z[1]], [JAW.x + JAW.w - 4, JAW.y + 4, HEAD_Z[1]]], 0.5);
  solid(discAlong([FLY[0], JAW.y + JAW.d, FLY[2]], Y, 3.6, FLY[1] - JAW.y - JAW.d, P, 20), 'mid');
  solid(discAlong([FLY[0], FLY[1], FLY[2]], Y, FLY_R, FLY_T, P, 56, 0.6), 'mid');
  line(sideRing([FLY[0], FLY[1] + FLY_T, FLY[2]], FLY_R - 3, 'y', P, 48), 'faint');
  solid(discAlong([FLY[0], FLY[1] + FLY_T, FLY[2]], Y, 3.4, 1.4, P, 20), 'mid');
});

/** The flywheel's spokes and crank pin at a turn of the stroke (0 to 1). */
export function flywheelAt(turn: number): { spokes: string; pin: string } {
  const face = FLY[1] + FLY_T;
  const spokes: string[] = [];
  for (let s = 0; s < 4; s++) {
    const a = turn * 2 * Math.PI + (s * Math.PI) / 2;
    spokes.push(pathOf([at([FLY[0] + 3.4 * Math.sin(a), face, FLY[2] + 3.4 * Math.cos(a)]), at([FLY[0] + (FLY_R - 3) * Math.sin(a), face, FLY[2] + (FLY_R - 3) * Math.cos(a)])]));
  }
  const a = turn * 2 * Math.PI;
  return { spokes: spokes.join(''), pin: translateAlong(P, [CRANK_R * Math.sin(a), 0, CRANK_R * Math.cos(a)]) };
}
/** The crank pin, built at the top of the flywheel's face. */
export const CRANK_PIN = steadySolid(discAlong([FLY[0], FLY[1] + FLY_T + 1.4, FLY[2]], Y, 2, 3, P, 18));

/** The feeler, built resting on a token; the figure slides it along its axis by `feelerShift`. */
export const FEELER_PARTS: readonly Part[] = collect(() => {
  const tip = radial(FEELER_STATION, FEELER_ON, FEELER_Y);
  solid(discAlong(tip, FEEL_DIR, 2, FEELER_LEN, P, 20), 'hi', { lit: true });
  solid(discAlong(add(tip, mul(FEEL_DIR, FEELER_LEN)), FEEL_DIR, 3.2, 4, P, 24, 0.3), 'hi', { lit: true });
});
export const feelerShift = (r: number) => translateAlong(P, mul(FEEL_DIR, r - FEELER_ON));
export const FEELER_REST = { on: FEELER_ON, in: FEELER_IN, up: FEELER_UP } as const;

/** The pendulum at an angle in degrees: rod, bob, the anchor's two arms and their pallet pins. */
export function pendulumAt(degrees: number): SolidPaths[] {
  const t = (degrees * Math.PI) / 180;
  const turn = (r: number, a: number): Point3 => [PIVOT[0] + r * Math.sin(a + t), PIVOT[1], PIVOT[2] - r * Math.cos(a + t)];
  const bob = turn(ROD_TO, 0);
  const out: SolidPaths[] = [];
  out.push(barBetween(turn(-3, 0), bob, [0, 1, 0], 2.4, 1.6, P));
  for (const side of [-1, 1]) {
    // A pallet tip sits on the star's tooth circle, about 36 degrees either side of straight down from the hub.
    const p0: Point3 = [HUB[0] + side * STAR_R[1] * Math.sin((PALLET_ANGLE * Math.PI) / 180), PIVOT[1], HUB[2] - STAR_R[1] * Math.cos((PALLET_ANGLE * Math.PI) / 180) + 1.5];
    const rel = sub(p0, PIVOT);
    const r0 = Math.hypot(rel[0], rel[2]);
    const a0 = Math.atan2(rel[0], -rel[2]);
    const tip = turn(r0, a0);
    out.push(barBetween(PIVOT, tip, [0, 1, 0], 1.8, 3, P));
    out.push(discAlong(add(tip, [0, -1, 0]), [0, -1, 0], 1.3, PIVOT[1] - 1 - STAR[0] - 0.6, P, 14));
  }
  out.push(discAlong(add(bob, [0, -1.6, 0]), Y, BOB_R, 3.4, P, 36, 0.4));
  out.push(discAlong(add(PIVOT, [0, 1, 0]), Y, 3, 1.6, P, 20));
  return out.map(steadySolid);
}

// ------------------------------------------------------------ the timeline
export interface PocketPose {
  /** Where the pocket is, in stations from the press, continuous while the wheel steps. */
  station: number;
  /** A token sits in it. */
  token: boolean;
  /** How far the token has slid in from the pocket's mouth, 0 to 1. */
  seat: number;
}
export interface PressPose {
  /** The flywheel's turn through this stroke, 0 to 1. */
  turn: number;
  /** The ram's way down, 0 at the top to 1 on the blank. */
  down: number;
  /** The token on the press: in the die, rolling down the chute, or gone. */
  token: Point3 | null;
  tokenOpacity: number;
}
export interface Pose {
  /** The beat the arm is on (it read its pocket at this beat). */
  beat: number;
  /** The wheel's turn in stations, continuous. */
  turn: number;
  pockets: PocketPose[];
  press: PressPose;
  /** The feeler's tip, as a radius from the hub. */
  feeler: number;
  /** The pendulum's swing, in degrees. */
  swing: number;
  /** A token tipping out into the bin, and how far along. */
  falling: { at: Point3; opacity: number } | null;
  /** This beat got a fresh order. */
  fresh: boolean;
}

const rollPath = (end: Point3): Point3[] => {
  const start = COIN_IN_DIE;
  const lip: Point3 = [CHUTE_X[0] + 1, 0, chuteZ(CHUTE_X[0] + 1) + COIN_R];
  const low: Point3 = [CHUTE_X[1], 0, chuteZ(CHUTE_X[1]) + COIN_R];
  return [start, [start[0] + 6, 0, start[2] + 2.4], lip, low, end];
};
const along = (points: Point3[], u: number): Point3 => {
  const lengths = points.slice(1).map((p, i) => Math.hypot(...(sub(p, points[i]!) as [number, number, number])));
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = Math.min(Math.max(u, 0), 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i]! || i === lengths.length - 1) return add(points[i]!, mul(sub(points[i + 1]!, points[i]!), Math.min(1, d / (lengths[i]! || 1))));
    d -= lengths[i]!;
  }
  return points[points.length - 1]!;
};

/** The centre of a token in a pocket at a station, and its mouth. */
export const pocketCentre = (station: number): Point3 => radial(station, COIN_C, 0);
const pocketMouth = (station: number): Point3 => radial(station, R + 5, 0);

/** The machine at time `t` (in beats) for a model that takes `inferenceMs` to answer. */
export function poseAt(inferenceMs: number, t: number): Pose {
  const S = strokeBeats(inferenceMs);
  const k = Math.floor(t);
  const f = t - k;
  const move = f > 1 - STEP_SHARE ? smooth((f - (1 - STEP_SHARE)) / STEP_SHARE) : 0;
  const turn = k + move;

  // The press: a slow press runs stroke after stroke; a fast one stamps once per pocket and waits.
  const roll = Math.min(0.3, S * 0.45);
  let start: number;
  let end: number;
  if (S > 1) {
    const n = Math.floor(t / S + 1e-9);
    start = n * S;
    end = start + S;
  } else {
    start = k;
    end = k + S;
  }
  const cycleEnd = end - roll;
  const running = t < end;
  const cycle = running ? Math.min(1, (t - start) / (cycleEnd - start)) : 1;
  const down = running && t < cycleEnd ? (1 - Math.cos(2 * Math.PI * cycle)) / 2 : 0;
  let token: Point3 | null = null;
  let tokenOpacity = 0;
  if (running) {
    // The token's pocket is the one under the press when the stroke ends.
    const dropK = Math.floor(end + 1e-9);
    const station = turn - dropK;
    if (t < cycleEnd) {
      token = COIN_IN_DIE;
      tokenOpacity = smooth((t - start) / Math.min(0.25, (cycleEnd - start) * 0.3));
    } else {
      token = along(rollPath(pocketMouth(station)), smooth((t - cycleEnd) / roll));
      tokenOpacity = 1;
    }
  }
  const press: PressPose = { turn: cycle, down, token, tokenOpacity };

  // Every pocket: where it is, and whether it holds a token.
  const pockets: PocketPose[] = [];
  let falling: Pose['falling'] = null;
  for (let j = 0; j < POCKETS; j++) {
    const s = mod(k - j, POCKETS);
    const filledAt = dropIn(k - s, S);
    let tokenHere = false;
    let seat = 1;
    if (s <= RELEASE_STATION && filledAt !== null && t >= filledAt) {
      tokenHere = s < RELEASE_STATION;
      if (s === PRESS_STATION) seat = smooth((t - filledAt) / 0.14);
      if (s === RELEASE_STATION) {
        const u = (t - k) / 0.55;
        if (u < 1) {
          const c = pocketCentre(RELEASE_STATION);
          const [a, b] = TRAY;
          const path: Point3[] = [c, add(a, [3, 0, COIN_R]), add(b, [-1, 0, COIN_R]), [BIN.x + BIN.w / 2, 0, 8]];
          falling = { at: along(path, smooth(u)), opacity: 1 - smooth((u - 0.75) / 0.25) };
        }
      }
    }
    pockets.push({ station: s + move - (s === POCKETS - 1 ? POCKETS : 0), token: tokenHere, seat });
  }

  // The feeler rests on the token in its pocket, or drops into an empty one; it rides up while the wheel steps.
  const restFor = (beat: number) => (freshAt(beat, S) ? FEELER_ON : FEELER_IN);
  let feeler = restFor(k);
  if (move > 0) {
    if (move < 0.4) feeler = lerp(restFor(k), FEELER_UP, smooth(move / 0.4));
    else if (move < 0.7) feeler = FEELER_UP;
    else feeler = lerp(FEELER_UP, restFor(k + 1), smooth((move - 0.7) / 0.3));
  }

  // The pendulum reaches the end of its swing as each step ends, on the beat.
  const swing = SWING * Math.cos(Math.PI * t);

  return { beat: k, turn, pockets, press, feeler, swing, falling, fresh: freshAt(k, S) };
}

/** Where a pocket's token is drawn: the pocket's centre, slid in from the mouth while it seats. */
export function tokenPoint(pocket: PocketPose): Point3 {
  const c = pocketCentre(pocket.station);
  if (pocket.seat >= 1) return c;
  const m = pocketMouth(pocket.station);
  return add(m, mul(sub(c, m), pocket.seat));
}

/** The pockets in the record, from the feeler round to the release, that hold a token now. */
export const recordCount = (pose: Pose) => pose.pockets.filter((p) => p.token && p.station >= FEELER_STATION - 0.01 && p.station < RELEASE_STATION).length;

// ------------------------------------------------------------ words
/** The readout: this beat, and the share of beats that get a fresh order. */
export function readoutOf(inferenceMs: number, pose: Pick<Pose, 'fresh'>): string {
  const per = freshPerSecond(inferenceMs);
  return `${pose.fresh ? 'This beat: fresh order' : 'This beat: no fresh order'} · ${per} of ${CONTROL_HZ} beats a second get one`;
}

