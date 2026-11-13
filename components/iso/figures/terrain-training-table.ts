/**
 * The terrain training table for TerrainCurriculum, drawn with the
 * isometric kit.
 *
 * The object is the explanation. Eight bays stand side by side on one
 * base, easy at the left and hard at the right, each a strip of pyramid
 * stairs like the stairs in Rudin and colleagues' terrain grid: the steps
 * get taller from bay to bay. A ruler along the front numbers the bays with
 * one to eight ticks. Small walker tokens wait on the start deck at the
 * front of their bay. Running a round sends every token back over its
 * stairs: the ones that cross the whole strip step onto the back shuttle,
 * a tray on a lead screw that carries them one bay toward the hard end;
 * the ones that stop short of the summit (less than half the strip) walk
 * back to the front shuttle, which carries them one bay toward the easy
 * end; the rest return to their own bay. A token that crosses the hardest
 * bay is sent along the back lane to a random bay. The tokens that just
 * moved up are the one lit part.
 *
 * World units: x runs along the table from the easy end to the hard end,
 * y toward the viewer (the start deck is at the front), z up. Every static
 * path is built here once. The tokens are built once at the origin and
 * moved with `tokenShift`; the two shuttles are built at rest and moved
 * with `trayShift`. The painter's order is a list of cells, one per bay
 * and band of the table, sorted far to near; the live code files each
 * token into the cell it stands in.
 */
import {
  cylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  onTop,
  planOutline,
  ring as kitRing,
  sideArc,
  sideSeam,
  slabOf,
  solidSvg,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong } from '../prism.ts';
import { phoneFitOf } from '../phone-fit.ts';

// ------------------------------------------------------------ real numbers
/** Difficulty levels on the table, one bay each. */
export const LEVELS = 8;
/** The paper's stair step height on its easiest and hardest stairs, in centimeters. */
export const STEP_CM: readonly [number, number] = [5, 20];
/** The step height of a bay's stairs, rising evenly from the easiest bay to the hardest. */
export const stepCm = (level: number) => STEP_CM[0] + ((level - 1) * (STEP_CM[1] - STEP_CM[0])) / (LEVELS - 1);

// ------------------------------------------------------------ layout
/** Bay pitch along the table, and the width of a bay's pyramid at its foot. */
export const PITCH = 30;
const BAY_W = 27;
/** The table's easy end. */
const X0 = -120;
export const bayX = (level: number) => X0 + (level - 0.5) * PITCH;
/** The deck top every token stands on off the stairs. */
export const TOP = 3;
/** Drawn height of one centimeter of step: exaggerated, so the hardest bay's stair stands about four times the easiest's. */
const CM = 0.75;
/** A token's slot grid: three files across a bay, rows 10 apart. */
const COLUMNS = [-8.5, 0, 8.5];
const PER_ROW = COLUMNS.length;
/** Slots on a bay's start deck: six rows of three, enough for the most tokens a bay holds in any round the figure shows. */
export const SLOTS_PER_BAY = 18;
const ROW = 10;
/**
 * The stairs: a square pyramid of three plates, as in the paper. Each plate
 * is one tread (5) shorter at both ends along the strip and 1.8 narrower at
 * each side, so a walker on any of the three files climbs three steps to
 * the summit and goes down three on the far side.
 */
export const STRIP = { y0: -24, y1: 6 } as const;
const TREAD = 5;
const INSET_X = 1.8;
/** The bands along the strip, back to front: the far foot, the far step, the summit, the near step, the near foot. */
const BANDS = [STRIP.y0, STRIP.y0 + TREAD, STRIP.y0 + 2 * TREAD, STRIP.y1 - 2 * TREAD, STRIP.y1 - TREAD, STRIP.y1];
/** The summit line: half the strip. */
export const HALF_Y = (STRIP.y0 + STRIP.y1) / 2;
/** The start deck's back row, and the walk from there to the same row on the back shuttle. */
const HOME_Y = 11.5;
export const CROSS = 81;
/** The front shuttle's token row, and the back lane a token from the hardest bay is sent along. */
const LANE_Y = 76.5;
const LOOP_Y = -80.25;

const BASE: Plan = { x: -142, y: -94, w: 302, d: 198, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;
const DECK: Plan = { x: -121, y: 7, w: 242, d: 63.5, r: 1.4 };
const BACK_TRAY: Plan = { x: -120, y: -74, w: 240, d: 48.5, r: 1.4 };
const FRONT_TRAY: Plan = { x: -90, y: 72, w: 210, d: 9.5, r: 1 };
const LOOP_LANE: Plan = { x: -121, y: -84.5, w: 242, d: 8.5, r: 1 };
const RULER: Plan = { x: -121, y: 85.7, w: 242, d: 5, r: 0.8 };
const LABEL: Plan = { x: 124, y: 93, w: 30, d: 7, r: 1.6 };
const BACK_SCREW = { y: -75.2, z: 1.4, x0: -126, x1: 154 };
const FRONT_SCREW = { y: 83.8, z: 1.4, x0: -127, x1: 124 };

// ------------------------------------------------------------ camera
const AZIMUTH = 86;
const ELEVATION = 40;
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([bayX(LEVELS), STRIP.y0, TOP + 3 * stepCm(LEVELS) * CM + 2], [-138, -86, 14], [136, 89, 14]);
export const WIDTH = 600;
const PAD = 12;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unitP)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 4 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);

// ------------------------------------------------------------ the ground under a token
/** Step height of a bay in drawing units. */
const riseOf = (level: number) => stepCm(level) * CM;
/** Plate k of a bay's pyramid, as a plan. */
const plateOf = (level: number, k: number): Plan => ({
  x: bayX(level) - BAY_W / 2 + k * INSET_X,
  y: STRIP.y0 + k * TREAD,
  w: BAY_W - 2 * k * INSET_X,
  d: STRIP.y1 - STRIP.y0 - 2 * k * TREAD,
  r: 0.4,
});
/** Which bay an x lies in (the nearest). */
export const bayOf = (x: number) => Math.min(LEVELS, Math.max(1, Math.floor((x - X0) / PITCH) + 1));
/**
 * The height a token's foot stands at, at (x, y): the deck, or the tread
 * under it, climbing each riser over a short ramp so a walking token steps
 * up rather than jumping.
 */
export function groundZ(x: number, y: number): number {
  const level = bayOf(x);
  const ramp = 1.2;
  let tiers = 0;
  for (let k = 0; k < 3; k++) {
    const plate = plateOf(level, k);
    const inside = Math.min(x - plate.x, plate.x + plate.w - x, y - plate.y, plate.y + plate.d - y);
    const s = Math.min(1, Math.max(0, (inside + ramp) / (2 * ramp)));
    tiers += s * s * (3 - 2 * s);
  }
  return TOP + tiers * riseOf(level);
}

// ------------------------------------------------------------ slots and paths
export type Flat2 = [number, number];
/** A token's home on the start deck of a bay: slot 0 at the back left, four to a row. */
export const homeSlot = (level: number, slot: number): Flat2 => [bayX(level) + COLUMNS[slot % PER_ROW], HOME_Y + ROW * Math.floor(slot / PER_ROW)];

/**
 * Each token's slot in its bay: ranked by a key (highest first), so the
 * token that will walk furthest stands at the back and no token has to
 * pass another on its strip. Ties go to the lower index.
 */
export function arrange(levels: readonly number[], keys: readonly number[]): number[] {
  const slots = Array<number>(levels.length).fill(0);
  for (let level = 1; level <= LEVELS; level++) {
    const here = levels.map((l, i) => i).filter((i) => levels[i] === level);
    here.sort((a, b) => keys[b] - keys[a] || a - b);
    here.forEach((i, rank) => (slots[i] = rank));
  }
  return slots;
}

export type Move = 'up' | 'down' | 'stay' | 'loop';
/** A path as waypoints (round share u, floor point), eased between each pair. */
export type Waypoint = readonly [number, Flat2];

/** Round shares at which the two shuttles move: out with their riders, then home empty. */
export const SHUTTLE = { out: [0.52, 0.7], home: [0.84, 0.98] } as const;
const ease = (s: number) => {
  const t = Math.min(1, Math.max(0, s));
  return t * t * (3 - 2 * t);
};
/** How far a shuttle stands from rest at share u of a round, as a share of one bay. */
export function shuttleShare(u: number): number {
  if (u <= SHUTTLE.out[0]) return 0;
  if (u < SHUTTLE.out[1]) return ease((u - SHUTTLE.out[0]) / (SHUTTLE.out[1] - SHUTTLE.out[0]));
  if (u < SHUTTLE.home[0]) return 1;
  return 1 - ease((u - SHUTTLE.home[0]) / (SHUTTLE.home[1] - SHUTTLE.home[0]));
}
export const backTrayShift = (share: number) => translateAlong(P, [PITCH * share, 0, 0]);
export const frontTrayShift = (share: number) => translateAlong(P, [-PITCH * share, 0, 0]);

/**
 * Every token's path through one round. Before: its level and slot; after:
 * its new level and slot; its move and how much of the strip it covered (1
 * is the whole strip). A token that crosses walks to the back shuttle, one
 * that stops walks the stairs until it stops, and tokens in one file of a
 * bay keep a row apart.
 */
export function planRound(
  before: { levels: readonly number[]; slots: readonly number[] },
  after: { levels: readonly number[]; slots: readonly number[] },
  moves: readonly Move[],
  covered: readonly number[],
): Waypoint[][] {
  const stops = new Map<number, Flat2>();
  for (let level = 1; level <= LEVELS; level++) {
    for (let column = 0; column < PER_ROW; column++) {
      const file = before.levels
        .map((l, i) => i)
        .filter((i) => before.levels[i] === level && before.slots[i] % PER_ROW === column && moves[i] !== 'up' && moves[i] !== 'loop')
        .sort((a, b) => before.slots[a] - before.slots[b]);
      let last = -Infinity;
      for (const i of file) {
        const share = Math.min(0.98, Math.max(0, covered[i]));
        const y = Math.max(STRIP.y1 - share * (STRIP.y1 - STRIP.y0), last + ROW);
        last = y;
        stops.set(i, [homeSlot(level, before.slots[i])[0], y]);
      }
    }
  }
  return moves.map((move, i) => {
    const from = homeSlot(before.levels[i], before.slots[i]);
    const to = homeSlot(after.levels[i], after.slots[i]);
    if (move === 'up' || move === 'loop') {
      const landed: Flat2 = [from[0], from[1] - CROSS];
      if (move === 'up') {
        const carried: Flat2 = [landed[0] + PITCH, landed[1]];
        return [[0, from], [0.34, landed], [SHUTTLE.out[0], landed], [SHUTTLE.out[1], carried], [1, to]];
      }
      const lane: Flat2 = [from[0], LOOP_Y];
      const sent: Flat2 = [to[0], LOOP_Y];
      return [[0, from], [0.34, landed], [0.38, landed], [0.46, lane], [0.66, sent], [0.7, sent], [1, to]];
    }
    const stop = stops.get(i)!;
    if (move === 'stay') return [[0, from], [0.34, stop], [0.44, stop], [0.64, to]];
    // The front shuttle holds one row: a bay's strugglers (never more than three) take its three files in turn.
    const rank = before.levels.filter((l, j) => j < i && l === before.levels[i] && moves[j] === 'down').length;
    const lane: Flat2 = [bayX(before.levels[i]) + COLUMNS[rank % PER_ROW], LANE_Y];
    const carried: Flat2 = [lane[0] - PITCH, LANE_Y];
    return [[0, from], [0.34, stop], [0.36, stop], [0.48, lane], [SHUTTLE.out[0], lane], [SHUTTLE.out[1], carried], [0.72, carried], [0.92, to]];
  });
}

/** Where a path stands at share u of the round. */
export function pointOn(path: readonly Waypoint[], u: number): Flat2 {
  if (u <= path[0][0]) return path[0][1];
  for (let k = 1; k < path.length; k++) {
    const [u1, b] = path[k];
    if (u <= u1) {
      const [u0, a] = path[k - 1];
      const s = ease((u - u0) / Math.max(1e-6, u1 - u0));
      return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
    }
  }
  return path[path.length - 1][1];
}

/** The screen offset that stands a token (built at the origin) at a floor point. */
export const tokenShift = ([x, y]: Flat2) => translateAlong(P, [x, y, groundZ(x, y) - TOP]);

// ------------------------------------------------------------ parts
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone };
export type Slot = 'back-shuttle' | 'back-nut' | 'front-shuttle' | 'front-nut' | 'cells';
export type Layer = Part | { kind: 'slot'; slot: Slot };

const seam = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
function solid(list: Layer[] | Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) {
  (list as Part[]).push({ kind: 'solid', paths, tone, ...extra });
}
function line(list: Layer[] | Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') {
  if (d) (list as Part[]).push({ kind: 'line', d, tone, free });
}
function dots(list: Layer[] | Part[], points: Point3[], size = 0.45, tone: Tone = 'mid') {
  (list as Part[]).push({ kind: 'dots', points: points.map(at), size, tone });
}
function screw(list: Layer[] | Part[], x: number, y: number, z: number, r = 1.4) {
  line(list, kitRing(x, y, r, z, P, 16), 'lo');
  dots(list, [[x, y, z]], 0.5);
}
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The lead screw's thread: short ribs along its visible side. */
function threadOf(x0: number, x1: number, y: number, z: number, r: number) {
  const out: string[] = [];
  for (let x = x0 + 1.2; x < x1 - 0.6; x += 1.6) out.push(onTop([[x, y + r * 0.35], [x + 0.5, y + r * 0.95]], z + r * 0.6, P));
  return out.join('');
}

/** A shuttle's drive: a lead screw between a motor box and an end bearing. */
function drive(list: Layer[], screwAt: { y: number; z: number; x0: number; x1: number }, motorAt: 'left' | 'right') {
  const { y, z, x0, x1 } = screwAt;
  const bearingX = motorAt === 'left' ? x1 : x0 - 3.4;
  const bearing: Plan = { x: bearingX, y: y - 2.6, w: 3.4, d: 5.2, r: 0.6 };
  if (motorAt === 'left') {
    solid(list, discAlong([x0, y, z], [1, 0, 0], 0.9, x1 - x0, P, 16), 'mid');
    line(list, threadOf(x0, x1, y, z, 0.9), 'faint');
    solid(list, slab(bearing, 0, 3.6, 2, 0.3), 'mid');
    dots(list, [[bearing.x + 1.7, y, 3.6]]);
  } else {
    solid(list, slab(bearing, 0, 3.6, 2, 0.3), 'mid');
    dots(list, [[bearing.x + 1.7, y, 3.6]]);
    solid(list, discAlong([x0, y, z], [1, 0, 0], 0.9, x1 - x0, P, 16), 'mid');
    line(list, threadOf(x0, x1, y, z, 0.9), 'faint');
  }
}

/** The motor box at one end of a lead screw, with a coupling, a knurled hand wheel and a vent. */
function motorBox(list: Layer[], box: Plan, screwY: number, toward: 1 | -1) {
  solid(list, slab(box, 0, 9, 3, 0.6), 'mid', { inner: seam(sideSeam(box, 6.6, P, 3)) });
  // The vent on the lid: closed slots.
  for (let k = 0; k < 3; k++) {
    line(list, planOutline({ x: box.x + 2.2, y: box.y + 2.4 + k * 2.2, w: box.w - 4.4, d: 0.9, r: 0.45 }, 9, P, 2), 'faint');
  }
  for (const [x, y] of [
    [box.x + 1.4, box.y + 1.4],
    [box.x + box.w - 1.4, box.y + 1.4],
    [box.x + 1.4, box.y + box.d - 1.4],
    [box.x + box.w - 1.4, box.y + box.d - 1.4],
  ] as Array<[number, number]>) dots(list, [[x, y, 9]], 0.42);
  // The coupling where the screw leaves the box.
  const face = toward === 1 ? box.x + box.w : box.x;
  solid(list, discAlong([face, screwY, 1.6], [toward, 0, 0], 1.7, 1.6, P, 20), 'mid');
  // The hand wheel on the lid.
  const cx = box.x + box.w / 2;
  const cy = box.y + box.d - 3.2;
  solid(list, cylinder(cx, cy, 2.4, 9, 2.2, P, 24, 0.3), 'mid');
  line(list, knurl(cx, cy, 2.4, 9.2, 11, 24, P), 'lo');
  line(list, lineOnTop([cx - 1.2, cy], [cx + 1.8, cy], 11.2, P), 'hi', 'end');
}

const FLAT: Layer[] = [];

// The base: a plate on four turned feet, with a groove and corner screws.
{
  const list = FLAT;
  line(list, slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, 'faint');
  for (const [x, y] of byDepth([
    [BASE.x + 18, BASE.y + 16],
    [BASE.x + BASE.w - 18, BASE.y + 16],
    [BASE.x + 18, BASE.y + BASE.d - 16],
    [BASE.x + BASE.w - 18, BASE.y + BASE.d - 16],
  ])) {
    solid(list, cylinder(x, y, 8, -BASE_H - FOOT_H, 1.8, P, 28), 'lo');
    solid(list, cylinder(x, y, 6, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), 'mid');
  }
  solid(list, slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BASE, -BASE_H + 2.6, P, 8)) });
  line(list, planOutline(insetPlan(BASE, 5), 0, P), 'faint');
  for (const [x, y] of [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ] as Array<[number, number]>) screw(list, x, y, 0, 2.2);
}

// The back: the lane a token from the hardest bay is sent along, its end stops, the back shuttle's motor and screw.
{
  const list = FLAT;
  motorBox(list, { x: -138, y: -88, w: 12, d: 15, r: 1.4 }, BACK_SCREW.y, 1);
  solid(list, slab(LOOP_LANE, 0, TOP, 2, 0.4), 'mid');
  line(list, planOutline(insetPlan(LOOP_LANE, 1.6), TOP, P, 2), 'faint');
  for (const x of [LOOP_LANE.x + 1.6, LOOP_LANE.x + LOOP_LANE.w - 3.6]) {
    solid(list, slab({ x, y: LOOP_LANE.y + 0.8, w: 2, d: LOOP_LANE.d - 1.6, r: 0.4 }, TOP, 2.4, 2, 0.2), 'mid');
  }
  drive(list, BACK_SCREW, 'left');
  // The back shuttle's two rails under its tray.
  for (const y of [BACK_TRAY.y + 3, BACK_TRAY.y + BACK_TRAY.d - 5]) {
    solid(list, slab({ x: -124, y, w: 278, d: 2, r: 0.4 }, 0, 0.6, 2), 'lo');
  }
  list.push({ kind: 'slot', slot: 'back-nut' });
  list.push({ kind: 'slot', slot: 'back-shuttle' });
}

// The bays' strips under their stairs, and the start deck with one pad per bay.
{
  const list = FLAT;
  for (let level = 1; level <= LEVELS; level++) {
    const strip: Plan = { x: bayX(level) - BAY_W / 2, y: STRIP.y0, w: BAY_W, d: STRIP.y1 - STRIP.y0, r: 0.8 };
    solid(list, slab(strip, 0, TOP, 2, 0.3), 'mid');
  }
  solid(list, slab(DECK, 0, TOP, 3, 0.4), 'mid');
  for (let level = 1; level <= LEVELS; level++) {
    line(list, planOutline({ x: bayX(level) - PITCH / 2 + 1.6, y: DECK.y + 1.2, w: PITCH - 3.2, d: DECK.d - 2.4, r: 1.2 }, TOP, P, 3), 'faint');
  }
}

// The front: the front shuttle on its rails, its screw, the ruler and the label plate.
{
  const list = FLAT;
  for (const y of [FRONT_TRAY.y + 1.4, FRONT_TRAY.y + FRONT_TRAY.d - 3.4]) {
    solid(list, slab({ x: -124, y, w: 248, d: 2, r: 0.4 }, 0, 0.6, 2), 'lo');
  }
  list.push({ kind: 'slot', slot: 'front-shuttle' });
  drive(list, FRONT_SCREW, 'right');
  list.push({ kind: 'slot', slot: 'front-nut' });
  solid(list, slab(RULER, 0, 0.8, 2), 'lo', { crease: 'none' });
  // The ruler numbers the bays by ticks: one for the easiest, eight for the hardest, a long tick between bays.
  const minor: string[] = [];
  const major: string[] = [];
  for (let level = 1; level <= LEVELS; level++) {
    const x0 = bayX(level) - ((level - 1) * 1.5) / 2;
    for (let k = 0; k < level; k++) minor.push(lineOnTop([x0 + k * 1.5, RULER.y], [x0 + k * 1.5, RULER.y + 2.2], 0.8, P));
  }
  for (let k = 0; k <= LEVELS; k++) major.push(lineOnTop([X0 + k * PITCH, RULER.y], [X0 + k * PITCH, RULER.y + 3.6], 0.8, P));
  line(list, minor.join(''), 'mid');
  line(list, major.join(''), 'lo');
  // The label plate, with three engraved rules.
  solid(list, slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
  line(list, planOutline(insetPlan(LABEL, 1.4), 0.8, P, 3), 'faint');
  line(list, [0, 1, 2].map((row) => onTop([[LABEL.x + 5, LABEL.y + 2.2 + row * 1.8], [LABEL.x + (row === 1 ? 16 : 23), LABEL.y + 2.2 + row * 1.8]], 0.8, P)).join(''), 'lo', true);
  dots(list, [[LABEL.x + 2.4, LABEL.y + LABEL.d / 2, 0.8]]);
  list.push({ kind: 'slot', slot: 'cells' });
  motorBox(list, { x: 124, y: 76.5, w: 12, d: 15, r: 1.4 }, FRONT_SCREW.y, -1);
}

export const LAYERS: readonly Layer[] = FLAT;

/** The back shuttle: a tray on the rails, with a lip at each end and rivets along its edges. */
export const BACK_SHUTTLE: readonly Part[] = (() => {
  const list: Part[] = [];
  solid(list, slab(BACK_TRAY, 0.6, TOP - 0.6, 3, 0.4), 'hi', { inner: seam(sideSeam(BACK_TRAY, 1.6, P, 3)) });
  line(list, planOutline(insetPlan(BACK_TRAY, 1.4), TOP, P, 3), 'faint');
  // Engraved lines between the bays' landings, edge to edge of the inset groove.
  const fences: string[] = [];
  for (let k = 1; k < LEVELS; k++) {
    const x = X0 + k * PITCH;
    fences.push(lineOnTop([x, BACK_TRAY.y + 1.4], [x, BACK_TRAY.y + BACK_TRAY.d - 1.4], TOP, P));
  }
  line(list, fences.join(''), 'faint');
  for (const x of [BACK_TRAY.x + 0.4, BACK_TRAY.x + BACK_TRAY.w - 2.4]) {
    solid(list, slab({ x, y: BACK_TRAY.y + 1, w: 2, d: BACK_TRAY.d - 2, r: 0.4 }, TOP, 1.6, 2, 0.2), 'mid');
  }
  return list;
})();
export const BACK_NUT: readonly Part[] = (() => {
  const list: Part[] = [];
  const nut: Plan = { x: BACK_TRAY.x + 2, y: BACK_SCREW.y - 1.9, w: 6, d: 3.8, r: 0.5 };
  solid(list, slab(nut, 0.2, 3.4, 2, 0.3), 'mid');
  dots(list, [[nut.x + 1.4, nut.y + 1.9, 3.6], [nut.x + 4.6, nut.y + 1.9, 3.6]], 0.4);
  return list;
})();
export const FRONT_SHUTTLE: readonly Part[] = (() => {
  const list: Part[] = [];
  solid(list, slab(FRONT_TRAY, 0.6, TOP - 0.6, 3, 0.4), 'hi', { inner: seam(sideSeam(FRONT_TRAY, 1.6, P, 3)) });
  line(list, planOutline(insetPlan(FRONT_TRAY, 1.2), TOP, P, 3), 'faint');
  for (const x of [FRONT_TRAY.x + 0.4, FRONT_TRAY.x + FRONT_TRAY.w - 2.4]) {
    solid(list, slab({ x, y: FRONT_TRAY.y + 0.8, w: 2, d: FRONT_TRAY.d - 1.6, r: 0.4 }, TOP, 1.6, 2, 0.2), 'mid');
  }
  return list;
})();
export const FRONT_NUT: readonly Part[] = (() => {
  const list: Part[] = [];
  const nut: Plan = { x: FRONT_TRAY.x + FRONT_TRAY.w - 8, y: FRONT_SCREW.y - 1.9, w: 6, d: 3.8, r: 0.5 };
  solid(list, slab(nut, 0.2, 3.4, 2, 0.3), 'mid');
  dots(list, [[nut.x + 1.4, nut.y + 1.9, 3.6], [nut.x + 4.6, nut.y + 1.9, 3.6]], 0.4);
  return list;
})();

// ------------------------------------------------------------ the cells
export type CellKind = 'loop' | 'landing' | 'tread' | 'home' | 'lane';
export interface Cell {
  id: string;
  parts: Part[];
  depth: number;
}
const cellId = (level: number, band: string) => `${level}-${band}`;
const cells: Cell[] = [];
for (let level = 1; level <= LEVELS; level++) {
  const x = bayX(level);
  const centre = (y: number, z = TOP) => depthOf([x, y, z], P);
  cells.push({ id: cellId(level, 'loop'), parts: [], depth: centre(LOOP_Y) });
  cells.push({ id: cellId(level, 'landing'), parts: [], depth: centre(-50) });
  // The pyramid stairs: three plates stacked, each a tread shorter at both ends and narrower at both sides.
  // Plate k is drawn in the cell of the band it starts at, so a token on a lower tread behind it is drawn first.
  const rise = riseOf(level);
  for (let k = 0; k < 5; k++) {
    const parts: Part[] = [];
    if (k < 3) {
      const plate = plateOf(level, k);
      const z = TOP + k * rise;
      solid(parts, slab(plate, z, rise, 2, 0.3), 'hi');
      // The nosing grooves 1 inside each exposed tread edge, edge to edge across the plate.
      const top = z + rise;
      const across = (y: number) => lineOnTop([plate.x, y], [plate.x + plate.w, y], top, P);
      line(parts, across(plate.y + 1) + across(plate.y + plate.d - 1), 'faint');
      if (k === 2) {
        // The summit marks half the strip.
        line(parts, across(HALF_Y), 'mid');
        dots(parts, [[plate.x + 1.4, HALF_Y, top], [plate.x + plate.w - 1.4, HALF_Y, top]], 0.42);
      }
    }
    cells.push({ id: cellId(level, `tread-${k}`), parts, depth: centre((BANDS[k] + BANDS[k + 1]) / 2) });
  }
  cells.push({ id: cellId(level, 'home'), parts: [], depth: centre(39) });
  cells.push({ id: cellId(level, 'lane'), parts: [], depth: centre(LANE_Y) });
}
cells.sort((a, b) => a.depth - b.depth);
export const CELLS: readonly Cell[] = cells;

/** The cell a token standing at (x, y) belongs to. */
export function cellOf([x, y]: Flat2): string {
  const level = bayOf(x);
  if (y < -75) return cellId(level, 'loop');
  if (y < STRIP.y0) return cellId(level, 'landing');
  if (y < STRIP.y1) return cellId(level, `tread-${Math.max(0, BANDS.findIndex((edge) => y < edge) - 1)}`);
  if (y < 71) return cellId(level, 'home');
  return cellId(level, 'lane');
}
/** The order tokens in one cell are drawn in: far to near, then by index. */
export const tokenDepth = ([x, y]: Flat2) => depthOf([x, y, 0], P);

// ------------------------------------------------------------ the token
/** A walker token: a foot, a body and a head, built standing at the origin on the deck. */
const TOKEN = {
  foot: cylinder(0, 0, 4, TOP, 1.3, P, 28, 0.3),
  body: cylinder(0, 0, 3, TOP + 1.3, 7.4, P, 28, 0.3),
  head: cylinder(0, 0, 2.2, TOP + 8.7, 3, P, 24, 0.3),
  ring: sideArc(0, 0, 3, TOP + 5, P, 24),
};
/** A token's markup: lit when it has just moved up. */
export function tokenSvg(index: number, point: Flat2, lit: boolean, move: string): string {
  return (
    `<g data-token="${index}" data-move="${move}" transform="${tokenShift(point)}">` +
    solidSvg(TOKEN.foot, { tone: 'mid' }) +
    solidSvg(TOKEN.body, { tone: 'hi', lit, inner: seam(TOKEN.ring) }) +
    solidSvg(TOKEN.head, { tone: 'mid', lit }) +
    `</g>`
  );
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
