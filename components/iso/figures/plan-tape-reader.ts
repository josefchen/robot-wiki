/**
 * The plan-tape reader for RecedingHorizon, drawn with the isometric kit.
 *
 * The object is the explanation. A punch at the left writes each plan onto
 * a strip of paper tape, one row per planned move: the hole across the row
 * is where the move goes. The strip feeds to a reader bridge, whose feeler
 * drops into each hole in turn and inks the move it acts on: the ink, the
 * path the robot really moves, is the one lit part. After the first T_a
 * rows a blade cuts the strip at the reader, a pusher sweeps the unread
 * tail off the bed into the bin in front, and the punch writes the next
 * plan from where the robot now is. The read rows run on into the take-up
 * cabinet at the right; the bin collects every tail that was planned and
 * never done.
 *
 * World units: x along the bench (the tape runs toward +x), y across it
 * (toward the viewer is +y), z up. One row of tape is one planned move,
 * ROW units long, so a strip is as long as its plan. The still pose is the
 * moment of the cut: the current plan's read rows lie right of the reader
 * at x > 0, its tail left of it, and the bin holds the tails of the plans
 * before. Moving groups are built in that pose and moved with
 * `translateAlong`; the ink line, the rods and the take-up crank are
 * rebuilt by the live code each frame.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 640;
export const HEIGHT = 340;
export const AZIMUTH = 54;
export const ELEVATION = 32;

/** One row of tape: one planned move, in world units along the bench. */
export const ROW = 5.5;
/** The longest plan the bench takes (the step sliders' top end). */
export const MAX_ROWS = 32;

export type Group =
  | 'static'
  | 'knobs'
  | 'rods'
  | 'pusher'
  | 'exec'
  | 'card'
  | 'tail'
  | 'blade'
  | 'rodsBack'
  | 'feeler'
  | 'rodsFront'
  | 'crank';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'strip'; group: Group; role: 'committed' | 'predicted'; plan: number; rows: number; parts: Part[] }
  | { kind: 'slot'; group: Group };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -276, y: -64, w: 444, d: 132, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;

/** The tape deck: a long bed the strip slides along, at bench height. */
const DECK: Plan = { x: -204, y: -24, w: 304, d: 44, r: 2 };
export const DECK_Z = 14;
const PLATE_T = 0.6;
/** The top of the bed plates, where the tape lies. */
const BED_Z = DECK_Z + PLATE_T;
const TAPE_T = 0.8;
/** The top face of the tape. */
export const TAPE_Z = BED_Z + TAPE_T;
/** Half the tape's width across the bench. */
const TAPE_HALF = 14;
const GATE: Plan = { x: -200, y: -23, w: 192, d: 37, r: 1.2 };
const TABLE: Plan = { x: -6, y: -23, w: 16, d: 37, r: 1.2 };
const EXIT: Plan = { x: 12, y: -23, w: 86, d: 37, r: 1.2 };
const RULER: Plan = { x: -200, y: 14.6, w: 298, d: 5, r: 0.8 };

/** Where the strip comes out of the punch, and where it goes into the take-up. */
export const PUNCH_FACE = -201.5;
export const TAKEUP_FACE = 102;

const PUNCH: Plan = { x: -254, y: -30, w: 50, d: 56, r: 3 };
const PUNCH_H = 40;
const TAKEUP: Plan = { x: TAKEUP_FACE, y: -30, w: 48, d: 56, r: 3 };
const TAKEUP_H = 36;

/**
 * The reader bridge: posts at x = BRIDGE_X joined by a beam, two rods
 * between them carrying the feeler's carriage. The feeler reads a row as
 * its centre passes FEELER_X, and the blade cuts at x = 0, between the
 * last row read and the first row not read.
 */
const BRIDGE_X = 5.6;
export const FEELER_X = ROW / 2;
const POST_Y = [-31, 29] as const;
const BEAM: Plan = { x: -1.6, y: -35, w: 14.4, d: 68, r: 1.5 };
const BEAM_Z = 46;
const BEAM_H = 6;
const CARRIAGE: Plan = { x: 1.4, y: -6, w: 8.6, d: 12, r: 1.4 };
const CARRIAGE_Z = 23.5;
const CARRIAGE_H = 10;
const ROD_Z = [26.5, 30.5] as const;
const ROD_R = 1.1;
const GUIDE_Y = [-18, 18] as const;
const BLADE: Plan = { x: -0.7, y: -16.4, w: 1.4, d: 32.8, r: 0.3 };
const BLADE_Z = 22.5;
const BLADE_H = 6.5;
/** How far the blade drops to cut the strip on the reader table. */
export const BLADE_DROP = BLADE_Z - BED_Z;

/** The bin in front of the gate that catches every unread tail. */
const BIN: Plan = { x: -198, y: 24, w: 184, d: 34, r: 1.5 };
const BIN_WALL = 1.6;
const BIN_H = 12;
const BIN_FRONT_H = 8;

/** The pusher bar behind the strip on the gate, and its two air cylinders behind the deck. */
const PUSHER: Plan = { x: -196, y: -21.5, w: 186, d: 4, r: 1 };
const PUSHER_Z = BED_Z;
const PUSHER_H = 4.4;
/** How far the bar travels to sweep a tail over the bed's front edge. */
export const PUSH_TRAVEL = 25;
/** The gap between the bar's front face and a strip's back edge, at rest. */
export const PUSH_CONTACT = 3.5;
const ACTUATOR_X = [-150, -58] as const;
const ACTUATOR_FACE = -31;

const CONTROL: Plan = { x: 16, y: 32, w: 46, d: 26, r: 3 };
const CONTROL_H = 10;
const LABEL: Plan = { x: -258, y: 42, w: 56, d: 14, r: 2 };
const MOTOR = { x: 128, y: 46, r: 8.5, h: 18 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([BRIDGE_X, POST_Y[0], BEAM_Z + BEAM_H + 9], [PUNCH.x, PUNCH.y, PUNCH_H + 9], [TAKEUP.x + TAKEUP.w, TAKEUP.y, TAKEUP_H + 10]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) =>
  kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) =>
  [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const seamOf = (plan: Plan, z: number, steps = 4) => sideSeam(plan, z, P, steps);
const faint = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;

/** The screen offset that moves a group built in the still pose by a world offset. */
export const shiftBy = (dx: number, dy = 0, dz = 0) => translateAlong(P, [dx, dy, dz]);

/** A closed rounded slot on the front face (plane y), from x0 to x1, centred at height zc. */
function slotOnFront(y: number, x0: number, x1: number, zc: number, h: number): string {
  const r = h / 2;
  const points: Flat[] = [];
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x1 - r + r * Math.cos(a), y, zc + r * Math.sin(a)]));
  }
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x0 + r + r * Math.cos(a), y, zc + r * Math.sin(a)]));
  }
  return pathOf(points, true);
}

/** A closed rounded slot on the +x face (plane x), from y0 to y1, centred at height zc. */
function slotOnSide(x: number, y0: number, y1: number, zc: number, h: number): string {
  const r = h / 2;
  const points: Flat[] = [];
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x, y1 - r + r * Math.cos(a), zc + r * Math.sin(a)]));
  }
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x, y0 + r + r * Math.cos(a), zc + r * Math.sin(a)]));
  }
  return pathOf(points, true);
}

// ------------------------------------------------------------ the plans

/**
 * The made-up path the plans follow, in the tape's [-1, 1] units across
 * the row. Illustrative only: two slow waves, so the inked line reads as
 * one smooth motion.
 */
const worldPath = (t: number) =>
  0.55 * Math.sin((2 * Math.PI * t) / 36 + 0.4) + 0.25 * Math.sin((2 * Math.PI * t) / 15 + 1.1);

/**
 * The move a plan writes on row `step` (0-based). Plan `plan` starts at
 * control step plan × T_a, from what the robot sees then, so near rows
 * follow the path closely and far rows drift: the illustrative reason the
 * next plan rewrites the tail. Deterministic, so server and client agree.
 */
export function plannedMove(plan: number, step: number, ta: number): number {
  const t = plan * ta + step;
  const ahead = step / 16;
  const drift = 0.5 * Math.sin(2.3 * plan + 0.7) * ahead * ahead;
  return Math.max(-1, Math.min(1, worldPath(t) + drift));
}

/** Where a move's hole sits across the tape. */
export const holeY = (move: number) => 2 + move * 9;
const FEED_Y = -11;

/** The centre of row `step` of the current plan, in the still pose. */
export const rowX = (step: number, ta: number) => (ta - step - 0.5) * ROW;

/** One piece of a plan's strip: rows [from, to) of plan `plan`, moved by `place` from where it lies in the still pose. */
function stripOf(group: Group, role: 'committed' | 'predicted', plan: number, from: number, to: number, ta: number, place: Point3, inked: boolean): Part {
  return { kind: 'strip', group, role, plan, rows: to - from, parts: stripParts(group, plan, from, to, ta, place, inked) };
}

function stripParts(group: Group, plan: number, from: number, to: number, ta: number, place: Point3, inked: boolean): Part[] {
  const [dx, dy, dz] = place;
  if (to <= from) return [];
  const x0 = rowX(to - 1, ta) - ROW / 2 + dx;
  const x1 = rowX(from, ta) + ROW / 2 + dx;
  const z = BED_Z + dz;
  const top = z + TAPE_T;
  const parts: Part[] = [];
  const paths = slab({ x: x0, y: -TAPE_HALF + dy, w: x1 - x0, d: TAPE_HALF * 2, r: 0.5 }, z, TAPE_T, 2);
  parts.push({ kind: 'solid', group, paths, tone: 'hi', crease: 'none' });
  const holes: Flat[] = [];
  const feeds: Flat[] = [];
  for (let step = from; step < to; step++) {
    const x = rowX(step, ta) + dx;
    holes.push(at([x, holeY(plannedMove(plan, step, ta)) + dy, top]));
    feeds.push(at([x, FEED_Y + dy, top]));
  }
  parts.push({ kind: 'dots', group, points: feeds, size: 0.42, tone: 'mid' });
  parts.push({ kind: 'dots', group, points: holes, size: 0.95, tone: 'hi' });
  if (inked && holes.length > 1) parts.push({ kind: 'line', group, d: pathOf(holes), tone: 'lit' });
  return parts;
}

/** The current plan's ink, from row 0 to the feeler, with the feeler `read` rows into the act. */
export function inkPath(plan: number, ta: number, read: number): string {
  const s = read - 1;
  if (s <= 0) return '';
  const points: Flat[] = [];
  const last = Math.min(ta - 1, Math.floor(s));
  for (let step = 0; step <= last; step++) points.push(at([rowX(step, ta), holeY(plannedMove(plan, step, ta)), TAPE_Z]));
  if (s < ta - 1) {
    const f = s - last;
    const y0 = holeY(plannedMove(plan, last, ta));
    const y1 = holeY(plannedMove(plan, last + 1, ta));
    points.push(at([rowX(last, ta) - f * ROW, y0 + (y1 - y0) * f, TAPE_Z]));
  }
  return points.length > 1 ? pathOf(points) : '';
}

/** The feeler's place across the tape, `read` rows into plan `plan`'s act. */
export function feelerYAt(plan: number, ta: number, read: number): number {
  const s = Math.max(0, Math.min(ta - 1, read - 1));
  const last = Math.floor(s);
  const f = s - last;
  const y0 = holeY(plannedMove(plan, last, ta));
  const y1 = last + 1 < ta ? holeY(plannedMove(plan, last + 1, ta)) : y0;
  return y0 + (y1 - y0) * f;
}

/** Where tail `index` comes to rest in the bin, as the offset from its place on the gate. */
export function pileOffset(index: number, tailRows: number): Point3 {
  const length = tailRows * ROW;
  const inner = BIN.w - 2 * BIN_WALL - 4;
  const piles = Math.max(1, Math.floor(inner / (length + 3)));
  const pile = index % piles;
  const level = Math.floor(index / piles);
  const spacing = piles > 1 ? (inner - length) / (piles - 1) : 0;
  const left = BIN.x + BIN_WALL + 2 + (piles > 1 ? pile * spacing : (inner - length) / 2);
  const jitterX = ((index * 37) % 7) - 3;
  const jitterY = ((index * 53) % 5) - 2;
  const restLeft = left + jitterX * 0.5;
  const restY = BIN.y + BIN_WALL + 1 + TAPE_HALF + 0.4 + jitterY * 0.3;
  const restZ = BIN_WALL + level * (TAPE_T + 0.08);
  // On the gate the tail spans x from -length to 0, y about 0, z at the bed.
  return [restLeft + length, restY, restZ - BED_Z];
}

/** Where a tail clears the bin's back wall before it drops: its offset across the bench. */
export const BIN_CLEAR_Y = BIN.y + BIN_WALL + TAPE_HALF + 1.4;

// ---------------------------------------------------------------- parts
const STATIC: Part[] = [];
const BIN_BACK: Part[] = [];
const BIN_FRONT: Part[] = [];
const BRIDGE: Part[] = [];
const FRONT: Part[] = [];
const put = (list: Part[], part: Part) => list.push(part);

// Base: a plate on four turned feet, with a groove and corner screws.
{
  const feet = byDepth([
    [BASE.x + 26, BASE.y + 20],
    [BASE.x + BASE.w - 26, BASE.y + 20],
    [BASE.x + 26, BASE.y + BASE.d - 20],
    [BASE.x + BASE.w - 26, BASE.y + BASE.d - 20],
  ]);
  for (const [x, y] of feet) {
    put(STATIC, { kind: 'solid', group: 'static', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), tone: 'lo' });
    put(STATIC, { kind: 'solid', group: 'static', paths: cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), tone: 'mid' });
  }
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.6), tone: 'mid' });
  put(STATIC, { kind: 'line', group: 'static', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
  const screws: Array<[number, number]> = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  put(STATIC, { kind: 'line', group: 'static', d: screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  put(STATIC, { kind: 'dots', group: 'static', points: screws.map(([x, y]) => at([x, y, 0])), size: 0.55 });
}

// Behind the deck: the pusher's two air cylinders on their mounts.
for (const x of ACTUATOR_X) {
  const mount: Plan = { x: x - 9, y: -52, w: 18, d: 20, r: 1.5 };
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(mount, 0, 11, 3, 0.5), tone: 'lo' });
  put(STATIC, { kind: 'dots', group: 'static', points: [at([x - 6, -49, 11]), at([x + 6, -49, 11])], size: 0.45 });
  const barrel: Plan = { x: x - 6, y: -52, w: 12, d: 21, r: 5.5 };
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(barrel, 11, 11, 6, 0.5), tone: 'mid', inner: faint(seamOf(barrel, 16.5, 6)) });
  put(STATIC, { kind: 'solid', group: 'static', paths: slab({ x: x - 4, y: ACTUATOR_FACE - 1.4, w: 8, d: 1.4, r: 0.6 }, 13.2, 6.6, 2), tone: 'mid' });
}

// The reader bridge's back post, on a foot plate behind the deck.
{
  const [y] = POST_Y;
  put(STATIC, { kind: 'solid', group: 'static', paths: slab({ x: BRIDGE_X - 7, y: y - 6, w: 14, d: 12, r: 1.5 }, 0, 2, 3, 0.4), tone: 'lo' });
  put(STATIC, { kind: 'dots', group: 'static', points: [at([BRIDGE_X - 4.5, y - 3.5, 2]), at([BRIDGE_X + 4.5, y + 3.5, 2])], size: 0.45 });
  put(STATIC, { kind: 'solid', group: 'static', paths: cyl(BRIDGE_X, y, 3.4, 2, BEAM_Z - 2, 24), tone: 'mid' });
  put(STATIC, { kind: 'solid', group: 'static', paths: cyl(BRIDGE_X, y, 4.4, 20, 4, 24, 0.3), tone: 'mid' });
}

// The punch at the left: a cabinet with the pancake reel of blank tape, the pin bank and a slot the strip comes out of.
{
  const top = PUNCH_H;
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(PUNCH, 0, PUNCH_H, 6, 1), tone: 'mid', inner: faint(seamOf(PUNCH, 6, 6)) });
  put(STATIC, { kind: 'line', group: 'static', d: planOutline(insetPlan(PUNCH, 3.5), top, P), tone: 'faint' });
  const front = PUNCH.y + PUNCH.d;
  put(STATIC, {
    kind: 'line',
    group: 'static',
    d: [0, 1, 2, 3].map((k) => slotOnFront(front, PUNCH.x + 8, PUNCH.x + 30, 30 - k * 4.4, 2)).join(''),
    tone: 'lo',
  });
  put(STATIC, {
    kind: 'dots',
    group: 'static',
    points: [
      at([PUNCH.x + 5, PUNCH.y + 5, top]),
      at([PUNCH.x + PUNCH.w - 5, PUNCH.y + 5, top]),
      at([PUNCH.x + 5, PUNCH.y + PUNCH.d - 5, top]),
      at([PUNCH.x + PUNCH.w - 5, PUNCH.y + PUNCH.d - 5, top]),
    ],
    size: 0.5,
  });
  // The pancake reel of blank tape on its spindle.
  const [rx, ry] = [PUNCH.x + 20, PUNCH.y + 19];
  put(STATIC, { kind: 'solid', group: 'static', paths: cyl(rx, ry, 16, top, 1.2, 56), tone: 'lo' });
  put(STATIC, { kind: 'solid', group: 'static', paths: cyl(rx, ry, 13.5, top + 1.2, 5, 56), tone: 'hi' });
  put(STATIC, { kind: 'line', group: 'static', d: ring(rx, ry, 9.5, top + 6.2, P, 40) + ring(rx, ry, 11.5, top + 6.2, P, 44), tone: 'faint' });
  put(STATIC, { kind: 'solid', group: 'static', paths: cyl(rx, ry, 4.2, top + 1.2, 7, 24, 0.3), tone: 'mid' });
  put(STATIC, { kind: 'dots', group: 'static', points: [at([rx, ry, top + 8.2])], size: 0.7, tone: 'hi' });
  // The pin bank across the tape's path, one pin per position across the row.
  const bank: Plan = { x: PUNCH.x + PUNCH.w - 15, y: -17, w: 11, d: 34, r: 1.5 };
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(bank, top, 3, 3, 0.5), tone: 'mid' });
  for (const y of [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]) {
    put(STATIC, { kind: 'solid', group: 'static', paths: cyl(bank.x + 5.5, y, 2, top + 3, 6, 16), tone: 'hi' });
    put(STATIC, { kind: 'dots', group: 'static', points: [at([bank.x + 5.5, y, top + 9])], size: 0.45 });
  }
  // The slot bezel on the cabinet's right face, where the strip comes out.
  put(STATIC, { kind: 'solid', group: 'static', paths: slab({ x: PUNCH.x + PUNCH.w, y: -17, w: 2.5, d: 34, r: 0.6 }, BED_Z - 1.6, 4.6, 2), tone: 'mid' });
  put(STATIC, { kind: 'line', group: 'static', d: slotOnSide(PUNCH_FACE, -15, 15, BED_Z + 0.4, 1.4), tone: 'hi' });
}

// The tape deck: a long bed with the gate, the reader table and the exit plate on top, and a ruler along its front edge.
{
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(DECK, 0, DECK_Z, 4, 1), tone: 'mid', inner: faint(seamOf(DECK, 4, 4)) });
  for (const plate of [GATE, TABLE, EXIT]) {
    put(STATIC, { kind: 'solid', group: 'static', paths: slab(plate, DECK_Z, PLATE_T, 2), tone: 'lo', crease: 'none' });
  }
  // Two shallow grooves under the tape's edges, plate edge to plate edge.
  put(STATIC, {
    kind: 'line',
    group: 'static',
    d: [GATE, TABLE, EXIT]
      .flatMap((plate) => [-TAPE_HALF - 0.8, TAPE_HALF + 0.8].map((y) => lineOnTop([plate.x, y], [plate.x + plate.w, y], BED_Z, P)))
      .join(''),
    tone: 'faint',
  });
  put(STATIC, {
    kind: 'dots',
    group: 'static',
    points: [GATE, EXIT].flatMap((plate) => [
      at([plate.x + 3, plate.y + 3, BED_Z]),
      at([plate.x + plate.w - 3, plate.y + 3, BED_Z]),
    ]),
    size: 0.45,
  });
  put(STATIC, { kind: 'solid', group: 'static', paths: slab(RULER, DECK_Z, PLATE_T, 2), tone: 'lo', crease: 'none' });
  // One tick per row (a tenth of a second at ten steps a second), a long one every second, zero at the blade.
  const ticks = topTicks(-176, 93.5, ROW, 10, RULER.y + 0.2, BED_Z, [1.6, 3.2], P, 'x');
  put(STATIC, { kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
  put(STATIC, { kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  put(STATIC, { kind: 'line', group: 'static', d: lineOnTop([0, RULER.y + 0.2], [0, RULER.y + 4.4], BED_Z, P), tone: 'hi' });
}

// The back blade guide stands on the reader table behind the strip.
put(STATIC, { kind: 'solid', group: 'static', paths: cyl(0, GUIDE_Y[0], 1.3, BED_Z, BEAM_Z - BED_Z, 14), tone: 'mid' });

// After the strip: the bin in front of the gate, back half first.
{
  put(BIN_BACK, { kind: 'solid', group: 'static', paths: slab(BIN, 0, BIN_WALL, 4, 0.4), tone: 'lo' });
  put(BIN_BACK, { kind: 'solid', group: 'static', paths: slab({ x: BIN.x, y: BIN.y, w: BIN.w, d: BIN_WALL, r: 0.6 }, BIN_WALL, BIN_H - BIN_WALL, 2, 0.3), tone: 'mid' });
  put(BIN_BACK, { kind: 'solid', group: 'static', paths: slab({ x: BIN.x, y: BIN.y, w: BIN_WALL, d: BIN.d, r: 0.6 }, BIN_WALL, BIN_H - BIN_WALL, 2, 0.3), tone: 'mid' });
  put(BIN_FRONT, { kind: 'solid', group: 'static', paths: slab({ x: BIN.x + BIN.w - BIN_WALL, y: BIN.y, w: BIN_WALL, d: BIN.d, r: 0.6 }, BIN_WALL, BIN_H - BIN_WALL, 2, 0.3), tone: 'mid' });
  const frontWall: Plan = { x: BIN.x, y: BIN.y + BIN.d - BIN_WALL, w: BIN.w, d: BIN_WALL, r: 0.6 };
  put(BIN_FRONT, { kind: 'solid', group: 'static', paths: slab(frontWall, BIN_WALL, BIN_FRONT_H - BIN_WALL, 2, 0.3), tone: 'mid' });
  // A finger pull on the bin's front, and its corner rivets.
  const pull: Plan = { x: BIN.x + BIN.w / 2 - 14, y: BIN.y + BIN.d, w: 28, d: 2.4, r: 1 };
  put(BIN_FRONT, { kind: 'solid', group: 'static', paths: slab(pull, 3, 2.4, 3), tone: 'mid' });
  put(BIN_FRONT, {
    kind: 'dots',
    group: 'static',
    points: [BIN.x + 4, BIN.x + BIN.w - 4].flatMap((x) => [at([x, BIN.y + BIN.d, 2.6]), at([x, BIN.y + BIN.d, BIN_FRONT_H - 1.6])]),
    size: 0.45,
  });
}

// The blade between its guides, the feeler and its carriage (the lit part) on two rods, the front guide.
{
  put(BRIDGE, {
    kind: 'solid',
    group: 'blade',
    paths: slab(BLADE, BLADE_Z, BLADE_H, 2, 0.3),
    tone: 'hi',
    inner: faint(pathOf([at([BLADE.x + BLADE.w, BLADE.y, BLADE_Z + 1.6]), at([BLADE.x + BLADE.w, BLADE.y + BLADE.d, BLADE_Z + 1.6])])),
  });
  put(BRIDGE, { kind: 'slot', group: 'rodsBack' });
  // The feeler: a pin that drops into each hole, hung from a carriage that slides across the bridge on two rods.
  put(BRIDGE, { kind: 'solid', group: 'feeler', paths: cyl(FEELER_X, 0, 0.8, TAPE_Z, CARRIAGE_Z - TAPE_Z, 12), tone: 'hi' });
  put(BRIDGE, { kind: 'solid', group: 'feeler', paths: cyl(FEELER_X, 0, 1.6, CARRIAGE_Z - 2.6, 2.6, 14), tone: 'mid' });
  put(BRIDGE, { kind: 'solid', group: 'feeler', paths: slab(CARRIAGE, CARRIAGE_Z, CARRIAGE_H, 3, 0.6), tone: 'hi' });
  put(BRIDGE, { kind: 'line', group: 'feeler', d: planOutline(insetPlan(CARRIAGE, 1.8), CARRIAGE_Z + CARRIAGE_H, P, 3), tone: 'faint' });
  put(BRIDGE, {
    kind: 'dots',
    group: 'feeler',
    points: [at([CARRIAGE.x + 1.6, CARRIAGE.y + 1.6, CARRIAGE_Z + CARRIAGE_H]), at([CARRIAGE.x + CARRIAGE.w - 1.6, CARRIAGE.y + CARRIAGE.d - 1.6, CARRIAGE_Z + CARRIAGE_H])],
    size: 0.4,
  });
  put(BRIDGE, { kind: 'solid', group: 'static', paths: cyl(0, GUIDE_Y[1], 1.3, BED_Z, BEAM_Z - BED_Z, 14), tone: 'mid' });
  put(BRIDGE, { kind: 'slot', group: 'rodsFront' });
}

// The bridge: the front post on its foot plate, the beam across both posts, and the blade's solenoid on top.
{
  const [, y] = POST_Y;
  put(FRONT, { kind: 'solid', group: 'static', paths: slab({ x: BRIDGE_X - 7, y: y - 6, w: 14, d: 12, r: 1.5 }, 0, 2, 3, 0.4), tone: 'lo' });
  put(FRONT, { kind: 'dots', group: 'static', points: [at([BRIDGE_X - 4.5, y - 3.5, 2]), at([BRIDGE_X + 4.5, y + 3.5, 2])], size: 0.45 });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(BRIDGE_X, y, 3.4, 2, BEAM_Z - 2, 24), tone: 'mid' });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(BRIDGE_X, y, 4.4, 20, 4, 24, 0.3), tone: 'mid' });
  put(FRONT, { kind: 'solid', group: 'static', paths: slab(BEAM, BEAM_Z, BEAM_H, 3, 0.6), tone: 'mid' });
  put(FRONT, { kind: 'line', group: 'static', d: planOutline(insetPlan(BEAM, 2.4), BEAM_Z + BEAM_H, P, 3), tone: 'faint' });
  put(FRONT, { kind: 'dots', group: 'static', points: POST_Y.map((py) => at([BRIDGE_X, py, BEAM_Z + BEAM_H])), size: 0.6 });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(0, 0, 4.2, BEAM_Z + BEAM_H, 9, 24, 0.4), tone: 'mid', inner: faint(sideArc(0, 0, 4.2, BEAM_Z + BEAM_H + 3, P, 20) + sideArc(0, 0, 4.2, BEAM_Z + BEAM_H + 6, P, 20)) });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(0, 0, 2, BEAM_Z + BEAM_H + 9, 1.4, 16), tone: 'mid' });
}

// The take-up cabinet at the right, with its crank wheel on top.
const CRANK = { x: TAKEUP.x + 26, y: TAKEUP.y + 30, r: 10 };
{
  const top = TAKEUP_H;
  put(FRONT, { kind: 'solid', group: 'static', paths: slab(TAKEUP, 0, TAKEUP_H, 6, 1), tone: 'mid', inner: faint(seamOf(TAKEUP, 6, 6)) });
  put(FRONT, { kind: 'line', group: 'static', d: planOutline(insetPlan(TAKEUP, 3.5), top, P), tone: 'faint' });
  const front = TAKEUP.y + TAKEUP.d;
  put(FRONT, {
    kind: 'line',
    group: 'static',
    d: [0, 1, 2, 3].map((k) => slotOnFront(front, TAKEUP.x + 18, TAKEUP.x + 40, 27 - k * 4.4, 2)).join(''),
    tone: 'lo',
  });
  put(FRONT, {
    kind: 'line',
    group: 'static',
    d: [0, 1, 2].map((k) => slotOnSide(TAKEUP.x + TAKEUP.w, TAKEUP.y + 12, TAKEUP.y + 40, 27 - k * 4.4, 2)).join(''),
    tone: 'lo',
  });
  put(FRONT, {
    kind: 'dots',
    group: 'static',
    points: [
      at([TAKEUP.x + 5, TAKEUP.y + 5, top]),
      at([TAKEUP.x + TAKEUP.w - 5, TAKEUP.y + 5, top]),
      at([TAKEUP.x + 5, TAKEUP.y + TAKEUP.d - 5, top]),
      at([TAKEUP.x + TAKEUP.w - 5, TAKEUP.y + TAKEUP.d - 5, top]),
    ],
    size: 0.5,
  });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(CRANK.x, CRANK.y, CRANK.r + 1.5, top, 1.4, 48), tone: 'lo' });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(CRANK.x, CRANK.y, CRANK.r, top + 1.4, 3.6, 48, 0.5), tone: 'mid' });
  put(FRONT, { kind: 'line', group: 'static', d: knurl(CRANK.x, CRANK.y, CRANK.r, top + 1.6, top + 4.8, 40, P), tone: 'faint' });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(CRANK.x, CRANK.y, 2.6, top + 5, 2, 18), tone: 'mid' });
  put(FRONT, { kind: 'slot', group: 'crank' });
}

// The control box at the front with the two horizon knobs, and its cable to the bridge.
const KNOB_AT: Array<[number, number]> = [
  [CONTROL.x + 12, CONTROL.y + 13],
  [CONTROL.x + 30, CONTROL.y + 13],
];
{
  put(FRONT, {
    kind: 'wire',
    group: 'static',
    from: at([CONTROL.x + 6, CONTROL.y, 5]),
    via: [at([CONTROL.x + 2, CONTROL.y - 3, 0.4]), at([BRIDGE_X + 4, POST_Y[1] + 3, 0.4])],
    to: at([BRIDGE_X + 3.2, POST_Y[1] + 1.4, 1.2]),
    tone: 'lo',
  });
  put(FRONT, { kind: 'solid', group: 'static', paths: slab(CONTROL, 0, CONTROL_H, 4, 0.8), tone: 'mid' });
  put(FRONT, { kind: 'line', group: 'static', d: planOutline(insetPlan(CONTROL, 2.6), CONTROL_H, P), tone: 'faint' });
  put(FRONT, {
    kind: 'dots',
    group: 'static',
    points: [at([CONTROL.x + 4, CONTROL.y + 4, CONTROL_H]), at([CONTROL.x + CONTROL.w - 4, CONTROL.y + CONTROL.d - 4, CONTROL_H])],
    size: 0.5,
  });
  for (const [x, y] of KNOB_AT) {
    put(FRONT, { kind: 'solid', group: 'static', paths: cyl(x, y, 5.6, CONTROL_H, 1, 32), tone: 'lo' });
    put(FRONT, { kind: 'solid', group: 'static', paths: cyl(x, y, 4.4, CONTROL_H + 1, 4.4, 32, 0.4), tone: 'hi' });
    put(FRONT, { kind: 'line', group: 'static', d: knurl(x, y, 4.4, CONTROL_H + 1.2, CONTROL_H + 5.2, 22, P), tone: 'faint' });
  }
  put(FRONT, { kind: 'slot', group: 'knobs' });
  // A small lamp lens.
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(CONTROL.x + 40, CONTROL.y + 8, 2.2, CONTROL_H, 1.6, 16), tone: 'mid' });
}

// The take-up's drive: a motor on a foot plate in front of the cabinet, its belt under a guard.
{
  const { x, y, r, h } = MOTOR;
  put(FRONT, { kind: 'solid', group: 'static', paths: slab({ x: x - 12, y: y - 11, w: 24, d: 22, r: 2 }, 0, 2, 3, 0.4), tone: 'lo' });
  put(FRONT, { kind: 'dots', group: 'static', points: [at([x - 9, y - 8, 2]), at([x + 9, y + 8, 2]), at([x - 9, y + 8, 2]), at([x + 9, y - 8, 2])], size: 0.45 });
  const guard: Plan = { x: x - 6, y: TAKEUP.y + TAKEUP.d, w: 12, d: y - (TAKEUP.y + TAKEUP.d), r: 1.5 };
  put(FRONT, { kind: 'solid', group: 'static', paths: slab(guard, h - 6, 6, 3, 0.5), tone: 'mid' });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(x, y, r, 2, h - 2, 36, 0.5), tone: 'hi', inner: faint(sideArc(x, y, r, 6, P, 28) + sideArc(x, y, r, h - 4, P, 28)) });
  put(FRONT, { kind: 'line', group: 'static', d: knurl(x, y, r, 6.4, h - 4.4, 30, P), tone: 'faint' });
  put(FRONT, { kind: 'solid', group: 'static', paths: cyl(x, y, 3.2, h, 2.4, 18), tone: 'mid' });
}

// A label plate at the front left, with three engraved rules.
{
  put(FRONT, { kind: 'solid', group: 'static', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
  put(FRONT, { kind: 'line', group: 'static', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
  put(FRONT, {
    kind: 'line',
    group: 'static',
    d: [0, 1, 2]
      .map((row) => onTop([[LABEL.x + 9, LABEL.y + 3.8 + row * 3.2], [LABEL.x + (row === 1 ? 34 : 48), LABEL.y + 3.8 + row * 3.2]], 0.8, P))
      .join(''),
    tone: 'lo',
    free: true,
  });
  put(FRONT, { kind: 'dots', group: 'static', points: [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], size: 0.5 });
}

// ------------------------------------------------------------- live paths

/** The pusher's two rods, from the cylinders' faces to the bar, with the bar moved `push` forward. */
export function rodPaths(push: number): SolidPaths[] {
  const front = PUSHER.y + push;
  return ACTUATOR_X.map((x) => slab({ x: x - 1.4, y: ACTUATOR_FACE, w: 2.8, d: front - ACTUATOR_FACE, r: 1.3 }, PUSHER_Z + 1.4, 2.6, 4));
}

/** The carriage's two rods, from the back post to the carriage and from the carriage to the front post, with the feeler at `feelerY`. */
export function guideRodPaths(feelerY: number): { back: SolidPaths[]; front: SolidPaths[] } {
  const near = feelerY + CARRIAGE.y + CARRIAGE.d;
  const far = feelerY + CARRIAGE.y;
  const rod = (y0: number, y1: number, z: number) =>
    slab({ x: BRIDGE_X - ROD_R, y: y0, w: ROD_R * 2, d: Math.max(0.1, y1 - y0), r: ROD_R * 0.95 }, z - ROD_R, ROD_R * 2, 4);
  return {
    back: ROD_Z.map((z) => rod(POST_Y[0] + 3.4, far, z)),
    front: ROD_Z.map((z) => rod(near, POST_Y[1] - 3.4, z)),
  };
}

/** The crank handle on the take-up wheel, turned to `angle`. */
export function crankPaths(angle: number): SolidPaths {
  const x = CRANK.x + Math.cos(angle) * (CRANK.r - 3);
  const y = CRANK.y + Math.sin(angle) * (CRANK.r - 3);
  return cyl(x, y, 1.5, TAKEUP_H + 5, 7, 14);
}

/** A knob's pointer, turned through 270 degrees as `share` goes from 0 to 1. */
export function knobPointer(index: 0 | 1, share: number): string {
  const [x, y] = KNOB_AT[index];
  const a = (-135 + 270 * Math.max(0, Math.min(1, share))) * (Math.PI / 180);
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  return lineOnTop([x + dx * 1.2, y + dy * 1.2], [x + dx * 4, y + dy * 4], CONTROL_H + 5.4, P);
}

/**
 * The clip that hides the strip inside the punch and the take-up: the band
 * of screen between the line where the strip leaves the punch's slot and
 * the line where it enters the take-up, both drawn along the tape's width.
 */
export const TAPE_CLIP = (() => {
  const a = at([0, 0, BED_Z]);
  const b = at([0, 1, BED_Z]);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const across: Flat = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  const far = 2000;
  const left = at([PUNCH_FACE, 0, BED_Z]);
  const right = at([TAKEUP_FACE, 0, BED_Z]);
  const point = (base: Flat, s: number): Flat => [base[0] + across[0] * s, base[1] + across[1] * s];
  return pathOf([point(left, -far), point(right, -far), point(right, far), point(left, far)], true);
})();

// ----------------------------------------------------------------- scene

/**
 * Every part in painter's order for one setting of the horizons: plan
 * `plan` at the moment of its cut, its read rows on the exit plate, its
 * tail on the gate, the executed rows of the earlier plans running on
 * toward the take-up, and the tails of those plans in the bin.
 */
export function sceneOf(tp: number, ta: number, plan: number): Part[] {
  const tailRows = tp - ta;
  const parts: Part[] = [...STATIC];
  // The pusher's rods and bar, behind the strip.
  parts.push({ kind: 'slot', group: 'rods' });
  parts.push({ kind: 'solid', group: 'pusher', paths: slab(PUSHER, PUSHER_Z, PUSHER_H, 3, 0.4), tone: 'mid' });
  parts.push({ kind: 'line', group: 'pusher', d: planOutline(insetPlan(PUSHER, 1.2), PUSHER_Z + PUSHER_H, P, 3), tone: 'faint' });
  // The executed rows of the earlier plans, run on toward the take-up.
  for (let back = 1; back <= plan; back++) {
    const dx = back * ta * ROW;
    if (rowX(ta - 1, ta) - ROW / 2 + dx > TAKEUP_FACE) break;
    parts.push(stripOf('exec', 'committed', plan - back, 0, ta, ta, [dx, 0, 0], true));
  }
  // The current plan's read rows, inked up to the feeler by the live code.
  parts.push(stripOf('card', 'committed', plan, 0, ta, ta, [0, 0, 0], false));
  parts.push({ kind: 'slot', group: 'card' });
  // The bin, back half, with the earlier tails in it, then the current tail, then the bin's front.
  parts.push(...BIN_BACK);
  if (tailRows > 0) {
    const resting = Array.from({ length: plan }, (_, index) => index);
    resting
      .sort((a, b) => {
        const pa = pileOffset(a, tailRows);
        const pb = pileOffset(b, tailRows);
        return pa[2] - pb[2] || depthOf(pa, P) - depthOf(pb, P);
      })
      .forEach((index) => parts.push(stripOf('static', 'predicted', index, ta, tp, ta, pileOffset(index, tailRows), false)));
    parts.push(stripOf('tail', 'predicted', plan, ta, tp, ta, [0, 0, 0], false));
  }
  parts.push(...BIN_FRONT);
  parts.push(...BRIDGE);
  parts.push(...FRONT);
  return parts;
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
