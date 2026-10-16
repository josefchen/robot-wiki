/**
 * The marble run for ReliabilityCompounding, drawn with the isometric kit,
 * and the run of a hundred marbles that plays on it.
 *
 * The object is the explanation. A stepped wooden block carries ten rails,
 * one per step, joined end to end by turn blocks into one zig-zag track. Each
 * rail carries ten trapdoor gates, a hundred in all, one per step of a job.
 * The first n gates are armed (the job's n steps); the rest are pinned shut.
 * A hopper at the top releases a hundred marbles, one job each. An armed gate
 * lets a marble through only if that step goes right: it holds the share p of
 * the marbles that reach it and drops the rest through its trapdoor into a
 * duct inside the block, which empties into the reject tray at the right.
 * The marbles that pass every armed gate roll off the last rail into the
 * finish tray at the left, the one lit part. Ten by ten, each tray counts
 * whole jobs out of a hundred.
 *
 * The numbers come from lib/reliability.ts (unchanged): after k gates,
 * round(100 p^k) marbles are still rolling, so the finish tray holds
 * round(100 p^n), the readout's share of jobs in whole marbles. Which marble
 * drops where is a fixed shuffle of the release order, so drops arrive mixed
 * through the run instead of in one block; the counts do not depend on it.
 *
 * World units: millimetres. x runs along the rails, y across them toward the
 * viewer (rail 0 at the back, highest), z up.
 */
import {
  cameraOf,
  cylinder,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  ring as kitRing,
  sideArc,
  sideSeam,
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
import { phoneFitOf } from '../phone-fit.ts';
import { barBetween } from '../prism.ts';
import { compoundedSuccessRate } from '../../../lib/reliability.ts';

// ------------------------------------------------------------------ the machine (mm)
/** Rails on the block, one per step of the block, back to front. */
export const RAILS = 10;
/** Gates on each rail. */
export const GATES_PER_RAIL = 10;
/** Every gate the board carries: the longest job any mount offers. */
export const GATES = RAILS * GATES_PER_RAIL;
/** Marbles in a run: one job each. */
export const MARBLES = 100;
/** A marble's radius. */
export const MARBLE_R = 2.4;

const PITCH = 12;
/** The rails run from x = 0 to RAIL_X1; the block reaches a little past both ends. */
const RAIL_X1 = 128;
const BLOCK_X0 = -4;
const BLOCK_X1 = 132;
const ROW = 11;
const BLOCK_Z0 = 6;
/** Each step down the block. */
const STEP_DOWN = 3.4;
const TOP_Z = 44;
const LIP = { thick: 1.2, height: 1.6 };
/** The turn blocks round each end. */
const TURN_R = 10;
const TURN_PATH_R = ROW / 2;

/**
 * The centre line of rail r across the block. A rail's channel is its step's
 * top, between the riser of the step behind (its back wall) and a low lip
 * along the step's front edge.
 */
export const railY = (rail: number) => rail * ROW + (ROW - LIP.thick) / 2;
/** The floor of rail r: the top of its step. */
export const railZ = (rail: number) => TOP_Z - rail * STEP_DOWN;
/** Rail r runs toward +x when it is even, back toward -x when odd. */
const forward = (rail: number) => rail % 2 === 0;
/** The x of gate g (0 to 99) along its rail. */
export function gateX(gate: number): number {
  const rail = Math.floor(gate / GATES_PER_RAIL);
  const index = gate % GATES_PER_RAIL;
  const along = 10 + index * PITCH;
  return forward(rail) ? along : RAIL_X1 - along;
}
const FLAP = { half: 3.6, across: 2.7 };

const BASE: Plan = { x: -104, y: -16, w: 340, d: 142, r: 6 };
const BASE_Z = [0, BLOCK_Z0] as const;
const TRAY_Z = BLOCK_Z0;
const TRAY_H = 5;
const CUP_PITCH = 7;
const CUP_R = 2.7;
/** The two trays: finished jobs at the left, rejected ones at the right. */
const FINISH_TRAY: Plan = { x: -92, y: 40, w: 74, d: 74, r: 2.5 };
const REJECT_TRAY: Plan = { x: 152, y: 40, w: 74, d: 74, r: 2.5 };
const HOPPER: Plan = { x: -26, y: -9, w: 18, d: 18, r: 2 };
const HOPPER_Z = [railZ(0) + 6, railZ(0) + 17] as const;
const LABEL: Plan = { x: 40, y: 114, w: 44, d: 9, r: 1 };

// ---------------------------------------------------------------- the fit
const AZIMUTH = 72;
const ELEVATION = 46;
const extremes: Point3[] = [
  [BASE.x, BASE.y, 0],
  [BASE.x + BASE.w, BASE.y, 0],
  [BASE.x, BASE.y + BASE.d, -2],
  [BASE.x + BASE.w, BASE.y + BASE.d, -2],
  [HOPPER.x, HOPPER.y, HOPPER_Z[1] + 2],
  [HOPPER.x + HOPPER.w, HOPPER.y, HOPPER_Z[1] + 2],
  [BLOCK_X1 + TURN_R, 0, railZ(0) + 2],
];
export const WIDTH = 600;
/**
 * The phone stage draws the svg at 116% and crops 8% off each side, so the
 * fit keeps that much clear at the sides: the trays never leave the frame.
 */
const SIDE = Math.round(WIDTH * 0.075);
const PAD = 8;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * SIDE) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
const fitted = fitProjection(extremes, WIDTH - 2 * SIDE, HEIGHT - 2 * PAD, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
export const P: Projection = { ...fitted, origin: [fitted.origin[0] + SIDE, fitted.origin[1] + PAD] };
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: PAD });

// ----------------------------------------------------------------- the parts
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'top' | 'paper' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

/**
 * Where the live pieces go in the painter's order: each rail's gates and the
 * marbles rolling on it (between the rail's back and front lips), the
 * hopper's load, and the two trays' marbles.
 */
export type Slot = `gates-${number}` | `rail-${number}` | 'hopper' | 'finish' | 'reject';

const at = (point: Point3) => iso(point, P);
const r1 = (value: number) => Math.round(value * 10) / 10;

const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (list: Part[], points: Point3[], size = 0.5, tone: Tone = 'mid') =>
  list.push({ kind: 'dots', points: points.map(at), size, tone });
/** A seam drawn as line markup under a solid's outline. */
const seamOf = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
/** A screw on a top face: a faint ring and its dot. */
function screw(list: Part[], x: number, y: number, z: number, r = 1.2) {
  line(list, kitRing(x, y, r, z, P, 16), 'lo');
  dots(list, [[x, y, z]], 0.45, 'mid');
}

/** Half a disc (a turn block's plan), the flat side on x = edge, bulging toward `side`. */
function halfDisc(cx: number, cy: number, radius: number, side: 1 | -1, steps = 24): Plane[] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = -Math.PI / 2 + (step / steps) * Math.PI;
    return [cx + side * radius * Math.cos(angle), cy + radius * Math.sin(angle)] as Plane;
  });
}
/** A half ring (a turn block's lip), between two radii. */
function halfRing(cx: number, cy: number, inner: number, outer: number, side: 1 | -1, steps = 24): Plane[] {
  const out = halfDisc(cx, cy, outer, side, steps);
  const back = halfDisc(cx, cy, inner, side, steps).reverse();
  return [...out, ...back];
}

// --------------------------------------------------------------- the base
const PARTS_LIST: Part[] = [];
{
  const list = PARTS_LIST;
  // Feet at the corners, far ones first.
  const feet: Plane[] = [
    [BASE.x + 14, BASE.y + 12],
    [BASE.x + BASE.w - 14, BASE.y + 12],
    [BASE.x + 14, BASE.y + BASE.d - 12],
    [BASE.x + BASE.w - 14, BASE.y + BASE.d - 12],
  ];
  for (const [x, y] of feet) {
    solid(list, cylinder(x, y, 7, -6, 1.6, P, 28), 'lo');
    solid(list, cylinder(x, y, 5.2, -4.4, 4.4, P, 28), 'mid');
  }
  solid(list, slabOf(BASE, BASE_Z[0], BASE_Z[1] - BASE_Z[0], P, 8, 1.4), 'mid', { inner: seamOf(sideSeam(BASE, 2.2, P, 8)) });
  line(list, planOutline(insetPlan(BASE, 5), BASE_Z[1], P), 'faint');
  for (const [x, y] of [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ] as Plane[]) screw(list, x, y, BASE_Z[1]);
  // The label plate on the front edge: three rule lines that stand for its text, and two screws.
  solid(list, slabOf(LABEL, BASE_Z[1], 0.8, P, 4), 'lo');
  line(list, planOutline(insetPlan(LABEL, 1.4), BASE_Z[1] + 0.8, P), 'faint');
  for (const [dy, length] of [[2.9, 26], [4.5, 20], [6.1, 23]] as const) {
    line(list, lineOnTop([LABEL.x + 7, LABEL.y + dy], [LABEL.x + 7 + length, LABEL.y + dy], BASE_Z[1] + 0.8, P), 'lo', true);
  }
  for (const x of [LABEL.x + 3.4, LABEL.x + LABEL.w - 3.4]) dots(list, [[x, LABEL.y + LABEL.d / 2, BASE_Z[1] + 0.8]], 0.45, 'mid');
}

// --------------------------------------------------------------- the trays
/** The cup centre of cup c (0 to 99) in a tray: ten rows from the back, ten cups from the block side. */
function cupAt(tray: Plan, cup: number, towardBlock: 1 | -1): Point3 {
  const row = Math.floor(cup / 10);
  const col = cup % 10;
  const x0 = towardBlock === 1 ? tray.x + tray.w - 5.5 - col * CUP_PITCH : tray.x + 5.5 + col * CUP_PITCH;
  return [x0, tray.y + 5.5 + row * CUP_PITCH, TRAY_Z + TRAY_H];
}
/** Finished marbles fill the finish tray from the block side, row by row from the back. */
export const finishCup = (cup: number) => cupAt(FINISH_TRAY, cup, 1);
export const rejectCup = (cup: number) => cupAt(REJECT_TRAY, cup, -1);

function trayParts(list: Part[], tray: Plan, towardBlock: 1 | -1) {
  solid(list, slabOf(tray, TRAY_Z, TRAY_H, P, 4, 0.8), 'mid', { inner: seamOf(sideSeam(tray, TRAY_Z + 1.6, P, 4)) });
  const cups: string[] = [];
  for (let cup = 0; cup < MARBLES; cup++) {
    const [x, y, z] = cupAt(tray, cup, towardBlock);
    cups.push(kitRing(x, y, CUP_R, z, P, 18));
  }
  line(list, cups.join(''), 'lo');
  for (const [x, y] of [
    [tray.x + 1.8, tray.y + 1.8],
    [tray.x + tray.w - 1.8, tray.y + 1.8],
    [tray.x + 1.8, tray.y + tray.d - 1.8],
    [tray.x + tray.w - 1.8, tray.y + tray.d - 1.8],
  ] as Plane[]) dots(list, [[x, y, TRAY_Z + TRAY_H]], 0.4, 'mid');
}

// --------------------------------------------------------------- the block, rail by rail
/** A gate's flap at an angle (0 shut, 1 hanging open), as a thin plate hinged on its far edge. */
export function flapPath(gate: number, open = 0): string {
  const rail = Math.floor(gate / GATES_PER_RAIL);
  const x = gateX(gate);
  const y0 = railY(rail) - FLAP.across;
  const z = railZ(rail) + 0.05;
  const angle = open * (Math.PI / 2) * 0.85;
  const reach = 2 * FLAP.across;
  const y1 = y0 + reach * Math.cos(angle);
  const z1 = z - reach * Math.sin(angle);
  return pathOf([at([x - FLAP.half, y0, z]), at([x + FLAP.half, y0, z]), at([x + FLAP.half, y1, z1]), at([x - FLAP.half, y1, z1])], true);
}
/** The opening under a gate's flap. */
export function gateHole(gate: number): string {
  const rail = Math.floor(gate / GATES_PER_RAIL);
  const x = gateX(gate);
  const y = railY(rail);
  const z = railZ(rail) + 0.02;
  const m = 0.7;
  return pathOf([at([x - FLAP.half - m, y - FLAP.across - m, z]), at([x + FLAP.half + m, y - FLAP.across - m, z]), at([x + FLAP.half + m, y + FLAP.across + m, z]), at([x - FLAP.half - m, y + FLAP.across + m, z])], true);
}
/** A gate's hinge rod along the flap's far edge, and its two knuckle screws. */
export function gateHinge(gate: number): { rod: SolidPaths; pins: Flat[] } {
  const rail = Math.floor(gate / GATES_PER_RAIL);
  const x = gateX(gate);
  const y = railY(rail) - FLAP.across - 0.5;
  const z = railZ(rail);
  return {
    rod: barBetween([x - FLAP.half - 0.6, y, z], [x + FLAP.half + 0.6, y, z], [0, 1, 0], 0.9, 1.0, P),
    pins: [at([x - FLAP.half - 0.2, y, z + 0.5]), at([x + FLAP.half + 0.2, y, z + 0.5])],
  };
}
/** A pinned-shut gate: its outline on the rail floor and the pin that locks it. */
export function lockedGate(gate: number): { outline: string; pin: Flat } {
  const rail = Math.floor(gate / GATES_PER_RAIL);
  const x = gateX(gate);
  const y = railY(rail);
  const z = railZ(rail);
  return {
    outline: pathOf([at([x - FLAP.half, y - FLAP.across, z]), at([x + FLAP.half, y - FLAP.across, z]), at([x + FLAP.half, y + FLAP.across, z]), at([x - FLAP.half, y + FLAP.across, z])], true),
    pin: at([x, y + FLAP.across - 0.9, z]),
  };
}

/** The turn block at the end of rail r, carrying the track round onto rail r + 1. */
function turnBlock(list: Part[], rail: number) {
  const side: 1 | -1 = forward(rail) ? 1 : -1;
  const edge = side === 1 ? BLOCK_X1 : BLOCK_X0;
  const cy = railY(rail) + TURN_PATH_R;
  const top = railZ(rail);
  solid(list, extrude(halfDisc(edge, cy, TURN_R, side), BLOCK_Z0, top - BLOCK_Z0, P, { convex: true, bevel: 0.6 }), 'mid', {
    inner: seamOf(sideArc(edge, cy, TURN_R, BLOCK_Z0 + 3, P, 24)),
  });
  // The groove's two lips: an outer wall and a round centre post.
  solid(list, extrude(halfRing(edge, cy, TURN_PATH_R + 3.0, TURN_PATH_R + 4.2, side), top, LIP.height, P, { convex: false }), 'mid');
  solid(list, cylinder(edge + side * 0.01, cy, TURN_PATH_R - 3.0, top, LIP.height, P, 20), 'mid');
  screw(list, edge, cy, top + LIP.height, 0.9);
}

/** Each step of the block with its rail, its gates and its marbles, back to front. */
for (let rail = 0; rail < RAILS; rail++) {
  const list = PARTS_LIST;
  const z = railZ(rail);
  const step: Plan = { x: BLOCK_X0, y: rail * ROW, w: BLOCK_X1 - BLOCK_X0, d: ROW, r: 0.6 };
  if (rail > 0) turnBlock(list, rail - 1);
  solid(list, slabOf(step, BLOCK_Z0, z - BLOCK_Z0, P, 2, 0.5), 'mid', {
    inner: seamOf(sideSeam(step, BLOCK_Z0 + 3, P, 2)),
  });
  // Screws where the step's top meets its neighbours, at both ends.
  for (const x of [BLOCK_X0 + 2.2, BLOCK_X1 - 2.2]) dots(list, [[x, rail * ROW + 1.6, z]], 0.42, 'mid');
  const front: Plan = { x: BLOCK_X0, y: (rail + 1) * ROW - LIP.thick, w: BLOCK_X1 - BLOCK_X0, d: LIP.thick, r: 0.3 };
  // The channel floor, a shade darker than the wood, so the track and its white trapdoors read.
  const floor: Plan = { x: BLOCK_X0, y: rail * ROW, w: BLOCK_X1 - BLOCK_X0, d: ROW - LIP.thick, r: 0 };
  list.push({ kind: 'face', d: planOutline(floor, z, P, 1), fill: 2 });
  if (rail === 0) backboard(list);
  list.push({ kind: 'slot', slot: `gates-${rail}` });
  list.push({ kind: 'slot', slot: `rail-${rail}` });
  solid(list, slabOf(front, z, LIP.height, P, 2), 'mid');
  if (rail === 0) hopperParts(list);
}

/** The backboard behind rail 0: the top rail's back wall, screwed to the block. */
function backboard(list: Part[]) {
  const board: Plan = { x: BLOCK_X0, y: -2.4, w: BLOCK_X1 - BLOCK_X0, d: 2.4, r: 0.4 };
  const top = railZ(0) + 7;
  solid(list, slabOf(board, BLOCK_Z0, top - BLOCK_Z0, P, 2, 0.4), 'mid', { inner: seamOf(sideSeam(board, railZ(0) + 2.2, P, 2)) });
  for (let i = 0; i < 6; i++) dots(list, [[BLOCK_X0 + 8 + i * 24, -1.2, top]], 0.42, 'mid');
}

// --------------------------------------------------------------- the hopper
function hopperParts(list: Part[]) {
  const cx = HOPPER.x + HOPPER.w / 2;
  const cy = HOPPER.y + HOPPER.d / 2;
  // The post and its foot on the base.
  solid(list, cylinder(cx, cy, 4.2, BASE_Z[1], 1.4, P, 24), 'lo');
  solid(list, cylinder(cx, cy, 2.4, BASE_Z[1] + 1.4, HOPPER_Z[0] - BASE_Z[1] - 1.4, P, 20), 'mid');
  // The box, open at the top: its walls and the dark well the marbles sit in.
  solid(list, slabOf(HOPPER, HOPPER_Z[0], HOPPER_Z[1] - HOPPER_Z[0], P, 4, 0.7), 'mid', {
    inner: seamOf(sideSeam(HOPPER, HOPPER_Z[0] + 3, P, 4)),
  });
  const well = insetPlan(HOPPER, 1.6);
  list.push({ kind: 'face', d: planOutline(well, HOPPER_Z[1], P, 4), fill: 0 });
  line(list, planOutline(well, HOPPER_Z[1], P, 4), 'lo');
  list.push({ kind: 'slot', slot: 'hopper' });
  // The spout: a short sloping channel from the box onto rail 0.
  const z0 = railZ(0);
  solid(list, barBetween([HOPPER.x + HOPPER.w, railY(0), HOPPER_Z[0] + 1.2], [BLOCK_X0 + 0.5, railY(0), z0 + 0.6], [0, 1, 0], ROW - 2 * LIP.thick, 1.2, P), 'mid');
  // The release slide and its knurled knob on the box's front.
  const knobX = cx;
  const knobY = HOPPER.y + HOPPER.d;
  solid(list, slabOf({ x: knobX - 3, y: knobY, w: 6, d: 2.2, r: 0.4 }, HOPPER_Z[0] + 3, 3.6, P, 2), 'lo');
  solid(list, cylinder(knobX, knobY + 3.4, 2.4, HOPPER_Z[0] + 3.2, 3.2, P, 24), 'mid');
  line(list, knurl(knobX, knobY + 3.4, 2.4, HOPPER_Z[0] + 3.2, HOPPER_Z[0] + 6.4, 22, P), 'lo');
}

// --------------------------------------------------------------- the ducts and trays
{
  const list = PARTS_LIST;
  // The finish chute: off the end of rail 9 and down onto the finish tray.
  const z9 = railZ(RAILS - 1);
  const y9 = railY(RAILS - 1);
  solid(list, barBetween([BLOCK_X0, y9, z9 - 1.2], [FINISH_TRAY.x + FINISH_TRAY.w - 2, y9, TRAY_Z + TRAY_H + 0.6], [0, 1, 0], ROW - 2 * LIP.thick, 1.2, P), 'mid');
  trayParts(list, FINISH_TRAY, 1);
  list.push({ kind: 'slot', slot: 'finish' });
  // The reject duct: out of the block's front face, along the base, into the reject tray.
  const ductY = RAILS * ROW + 3;
  solid(list, slabOf({ x: 104, y: RAILS * ROW, w: REJECT_TRAY.x - 104 + 4, d: 7, r: 1 }, BLOCK_Z0, 4, P, 3, 0.4), 'lo');
  line(list, lineOnTop([104, ductY + 0.5], [REJECT_TRAY.x + 2, ductY + 0.5], BLOCK_Z0 + 4, P), 'faint');
  trayParts(list, REJECT_TRAY, -1);
  list.push({ kind: 'slot', slot: 'reject' });
}

export const PARTS: readonly Part[] = PARTS_LIST;

// ------------------------------------------------------------------ the marble
/** A marble drawn about the origin: its shading follows the kit's light (from the upper left). */
export const MARBLE = (() => {
  // A ball projects to a circle of its radius times the camera's scale.
  const r = r1(MARBLE_R * cameraOf(P).k);
  // The shaded side: the circle less a lighter disc nudged toward the light.
  const shade = `M${r1(-r)} 0A${r} ${r} 0 0 0 ${r1(r)} 0A${r} ${r1(r * 0.78)} 0 0 1 ${r1(-r)} 0Z`;
  return { r, shade, shine: { cx: r1(-r * 0.35), cy: r1(-r * 0.4), r: r1(Math.max(0.5, r * 0.22)) } };
})();

// ------------------------------------------------------------------ the track
/** One sampled point of the track: where a marble's centre is, and the rail whose slot draws it. */
interface TrackPoint {
  at: Point3;
  s: number;
  rail: number;
}
const TRACK: TrackPoint[] = [];
/** Arc length along the track at each gate's centre. */
export const GATE_S: number[] = [];
/** Arc length where the track leaves rail 9 for the finish chute. */
let FINISH_S = 0;
{
  const push = (point: Point3, rail: number) => {
    const last = TRACK[TRACK.length - 1];
    const s = last ? last.s + Math.hypot(point[0] - last.at[0], point[1] - last.at[1], point[2] - last.at[2]) : 0;
    TRACK.push({ at: point, s, rail });
  };
  const lift = MARBLE_R;
  // Out of the hopper and down the spout onto rail 0.
  const spoutStart: Point3 = [HOPPER.x + HOPPER.w - 2, railY(0), HOPPER_Z[0] + 1.2 + lift + 0.6];
  const spoutEnd: Point3 = [BLOCK_X0 + 1, railY(0), railZ(0) + lift];
  for (let i = 0; i <= 6; i++) push([spoutStart[0] + ((spoutEnd[0] - spoutStart[0]) * i) / 6, railY(0), spoutStart[2] + ((spoutEnd[2] - spoutStart[2]) * i) / 6], 0);
  for (let rail = 0; rail < RAILS; rail++) {
    const z = railZ(rail) + lift;
    const y = railY(rail);
    const from = forward(rail) ? BLOCK_X0 + 1 : BLOCK_X1 - 1;
    const to = forward(rail) ? BLOCK_X1 : BLOCK_X0;
    const steps = 68;
    for (let i = rail === 0 ? 1 : 0; i <= steps; i++) push([from + ((to - from) * i) / steps, y, z], rail);
    if (rail === RAILS - 1) break;
    // Round the turn block, then a short drop onto the next rail.
    const side = forward(rail) ? 1 : -1;
    const cx = forward(rail) ? BLOCK_X1 : BLOCK_X0;
    const cy = y + TURN_PATH_R;
    for (let i = 1; i <= 16; i++) {
      const angle = -Math.PI / 2 + (i / 16) * Math.PI;
      push([cx + side * TURN_PATH_R * Math.cos(angle), cy + TURN_PATH_R * Math.sin(angle), z], rail + 1);
    }
    const next = railZ(rail + 1) + lift;
    for (let i = 1; i <= 4; i++) push([cx - side * 1.0 * i, railY(rail + 1), z - ((z - next) * i * i) / 16], rail + 1);
  }
  for (let gate = 0; gate < GATES; gate++) {
    const rail = Math.floor(gate / GATES_PER_RAIL);
    const x = gateX(gate);
    const first = TRACK.findIndex((point) => point.rail === rail && Math.abs(point.at[1] - railY(rail)) < 0.01 && (forward(rail) ? point.at[0] >= x : point.at[0] <= x));
    const a = TRACK[first - 1]!;
    const b = TRACK[first]!;
    const share = (x - a.at[0]) / (b.at[0] - a.at[0]);
    GATE_S.push(a.s + (b.s - a.s) * share);
  }
  FINISH_S = TRACK[TRACK.length - 1]!.s;
  // Down the finish chute to its mouth over the finish tray.
  const mouth: Point3 = [FINISH_TRAY.x + FINISH_TRAY.w - 2, railY(RAILS - 1), TRAY_Z + TRAY_H + 0.6 + lift + 1.2];
  const start = TRACK[TRACK.length - 1]!.at;
  for (let i = 1; i <= 8; i++) push([start[0] + ((mouth[0] - start[0]) * i) / 8, mouth[1], start[2] + ((mouth[2] - start[2]) * i) / 8], RAILS - 1);
}
/** The length of the whole track, hopper to the finish chute's mouth. */
export const TRACK_END = TRACK[TRACK.length - 1]!.s;
export { FINISH_S };

/** Where a marble is at arc length s along the track, and the rail that draws it. */
export function trackAt(s: number): TrackPoint {
  if (s <= 0) return TRACK[0]!;
  if (s >= TRACK_END) return TRACK[TRACK.length - 1]!;
  let lo = 0;
  let hi = TRACK.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (TRACK[mid]!.s <= s) lo = mid;
    else hi = mid;
  }
  const a = TRACK[lo]!;
  const b = TRACK[hi]!;
  const k = (s - a.s) / (b.s - a.s || 1);
  return {
    at: [a.at[0] + (b.at[0] - a.at[0]) * k, a.at[1] + (b.at[1] - a.at[1]) * k, a.at[2] + (b.at[2] - a.at[2]) * k],
    s,
    rail: b.rail,
  };
}

/** The hopper's load: where the top layer's marbles sit (up to 16 show). */
export const HOPPER_SPOTS: Point3[] = Array.from({ length: 16 }, (_, index) => {
  const row = Math.floor(index / 4);
  const col = index % 4;
  return [HOPPER.x + 3.6 + col * 3.6, HOPPER.y + 3.6 + row * 3.6, HOPPER_Z[1] - 0.6];
});

/** Screen point of a world point, for the live code. */
export const screenOf = (point: Point3): Flat => at(point);

// ------------------------------------------------------------------ the model
/**
 * Marbles still rolling after k armed gates: each gate holds the share p of
 * the marbles that reach it, in whole marbles, round(100 p^k).
 */
export function survivorsAfter(perStep: number, gates: number): number {
  return Math.round(MARBLES * compoundedSuccessRate(perStep, gates));
}

/** The order the hopper releases them in maps to a fixed shuffle of the hundred jobs (37 is coprime with 100). */
export const jobOf = (release: number) => (release * 37) % MARBLES;

/**
 * Where marble `release` ends up with n armed gates at success p per gate:
 * the gate it drops at (0-based), or `finish` when it passes all n.
 */
export function fateOf(release: number, perStep: number, steps: number): number | 'finish' {
  const job = jobOf(release);
  const n = Math.min(GATES, Math.max(0, Math.round(steps)));
  for (let gate = 1; gate <= n; gate++) {
    if (job >= survivorsAfter(perStep, gate)) return gate - 1;
  }
  return 'finish';
}

/** Marbles each armed gate drops: round(100 p^(k-1)) - round(100 p^k). */
export function dropsAt(perStep: number, steps: number): number[] {
  const n = Math.min(GATES, Math.max(0, Math.round(steps)));
  return Array.from({ length: n }, (_, k) => survivorsAfter(perStep, k) - survivorsAfter(perStep, k + 1));
}

// ------------------------------------------------------------------ the run
/** Seconds between releases, and how fast a marble rolls (mm a second). The run is illustrative, not to time. */
export const RELEASE_S = 0.05;
export const ROLL_MM_S = 420;
/** How long a marble takes to drop through a trapdoor, and to settle into a cup. */
const FALL_S = 0.16;
const SETTLE_S = 0.22;
/** A flap swings open as a marble drops, and back shut. */
const FLAP_OPEN_S = 0.05;
const FLAP_SHUT_S = 0.22;

export type MarblePlace =
  | { where: 'hopper'; spot: number }
  | { where: 'rail'; rail: number; at: Point3; fade: number }
  | { where: 'finish' | 'reject'; cup: number; at: Point3; settle: number };

/** One run of the hundred marbles: every marble's place, the flaps and the counts, as a pure function of run time. */
export function marbleRun(perStep: number, steps: number) {
  const fates = Array.from({ length: MARBLES }, (_, release) => fateOf(release, perStep, steps));
  // Arrival times decide cup order in each tray.
  const ends = fates.map((fate, release) => release * RELEASE_S + (fate === 'finish' ? TRACK_END : GATE_S[fate]!) / ROLL_MM_S);
  const cupOf: number[] = new Array(MARBLES).fill(0);
  for (const kind of ['finish', 'reject'] as const) {
    const members = fates.map((fate, release) => ({ fate, release })).filter(({ fate }) => (fate === 'finish') === (kind === 'finish'));
    members.sort((a, b) => ends[a.release]! - ends[b.release]! || a.release - b.release);
    members.forEach(({ release }, cup) => {
      cupOf[release] = cup;
    });
  }
  const duration = Math.max(...ends) + Math.max(FALL_S, SETTLE_S) + FLAP_SHUT_S;
  const finished = fates.filter((fate) => fate === 'finish').length;
  const place = (release: number, t: number): MarblePlace => {
    const start = release * RELEASE_S;
    if (t < start) return { where: 'hopper', spot: release };
    const fate = fates[release]!;
    const rolled = (t - start) * ROLL_MM_S;
    const endS = fate === 'finish' ? TRACK_END : GATE_S[fate]!;
    if (rolled < endS) {
      const point = trackAt(rolled);
      return { where: 'rail', rail: point.rail, at: point.at, fade: 1 };
    }
    const since = t - ends[release]!;
    if (fate !== 'finish' && since < FALL_S) {
      const point = trackAt(endS);
      const k = since / FALL_S;
      return { where: 'rail', rail: point.rail, at: [point.at[0], point.at[1], point.at[2] - 2.6 * k * k], fade: 1 - k };
    }
    const cup = cupOf[release]!;
    const home = fate === 'finish' ? finishCup(cup) : rejectCup(cup);
    const settle = fate === 'finish' ? Math.min(1, since / SETTLE_S) : Math.min(1, (since - FALL_S) / SETTLE_S);
    return { where: fate === 'finish' ? 'finish' : 'reject', cup, at: [home[0], home[1], home[2] + MARBLE_R - 1.0], settle };
  };
  /** How far each armed gate's flap hangs open at time t, 0 to 1. */
  const flaps = (t: number): number[] => {
    const open = new Array(GATES).fill(0);
    fates.forEach((fate, release) => {
      if (fate === 'finish') return;
      const age = t - ends[release]!;
      if (age < -FLAP_OPEN_S || age > FLAP_SHUT_S) return;
      const value = age < 0 ? 1 + age / FLAP_OPEN_S : 1 - age / FLAP_SHUT_S;
      open[fate] = Math.max(open[fate], Math.min(1, Math.max(0, value)));
    });
    return open;
  };
  const counts = (t: number) => {
    let released = 0;
    let finishedNow = 0;
    let rejected = 0;
    for (let release = 0; release < MARBLES; release++) {
      if (t >= release * RELEASE_S) released += 1;
      if (t >= ends[release]!) {
        if (fates[release] === 'finish') finishedNow += 1;
        else rejected += 1;
      }
    }
    return { released, finished: finishedNow, rejected };
  };
  return { fates, finished, duration, place, flaps, counts, cupOf };
}

/** The still pose: every marble home, the finished ones in the finish tray, the rest in the reject tray. */
export function restCounts(perStep: number, steps: number) {
  const finished = survivorsAfter(perStep, Math.min(GATES, steps));
  return { finished, rejected: MARBLES - finished };
}
