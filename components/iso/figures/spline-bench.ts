/**
 * The spline board for OfflineValueOverreach, drawn with the isometric kit.
 *
 * The object is the explanation: a draughtsman's upright curve board. Across
 * it runs grip strength, from gentle at the left to hard at the right; up it
 * runs how well a grip works. The true result is engraved on the chart paper.
 * The learner's guess is a thin flexible spline held between pairs of pins at
 * the recorded tries, so where the tries are it follows the engraved curve;
 * past the last pin at either end nothing holds it, and it springs up. A
 * presser arm at each end, set by a knurled screw, holds the free end down:
 * that is the caution about untried actions. A rider on the rail at the top
 * always sits over the spline's highest point, the grip the learner picks,
 * and its plumb bob, the one lit part, hangs down to what that grip really
 * earns on the engraved curve.
 *
 * World units are millimetres: x along the board, y out of it toward the
 * viewer, z up. Static paths are built once here; the spline, the presser
 * arms and screws, and the rider with its plumb line and bob are rebuilt by
 * the live code through the functions at the bottom.
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
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
  translateAlong,
} from '../iso-kit.ts';
import { phoneFitOf } from '../phone-fit.ts';
import { barBetween, discAlong, plateIn, roundedOutline } from '../prism.ts';

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 62;
export const ELEVATION = 26;

export type Group = 'static' | 'rider';
/**
 * Slots the component fills: `curve` and `pins` are drawn once from the model (the engraved result, the
 * tried range and the pins at the recorded tries); the rest move with the caution setting.
 */
export type LiveId = 'curve' | 'pins' | 'spline' | 'arms' | 'shanks' | 'knobs' | 'plumb';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'fill'; group: Group; d: string; shade: 0 | 1 | 2 | 3 | 'top' }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -150, y: -34, w: 300, d: 66, r: 8 };
const BASE_H = 9;
const FOOT_H = 5;
/** The upright board stands in the base's back third; its face looks toward +y. */
const BOARD: Plan = { x: -138, y: -30, w: 276, d: 9, r: 2 };
const BOARD_TOP = 160;
const FACE = BOARD.y + BOARD.d;
/** The chart paper is a thin sheet on the face; everything on the chart sits on or in front of it. */
const PAPER_Y = FACE + 0.6;
const PAPER = { x0: -122, x1: 122, z0: 10, z1: 144 };

/** Grip strength 0..1 across the chart, and a value 0..TOP_VALUE up it. */
export const CHART = { x0: -112, x1: 112, z0: 22, z1: 138 };
export const TOP_VALUE = 1.15;
export const xOf = (grip: number) => CHART.x0 + grip * (CHART.x1 - CHART.x0);
export const zOf = (value: number) => CHART.z0 + (value / TOP_VALUE) * (CHART.z1 - CHART.z0);

/** The spline: a strip standing a little off the paper, its width across the curve. */
const STRIP = { y0: PAPER_Y + 1.2, y1: PAPER_Y + 2.3, half: 1.9 };
/** Pins at each recorded try: a peg above and one below the strip. */
const PEG = { r: 1.25, length: 4.4, gap: 1.25 };
/** The rider's rail, the plumb line's plane, and the screw brackets at each end. */
const RAIL = { z: 151, y: PAPER_Y + 3.4, r: 1.5, x0: -118, x1: 118 };
const PLUMB_Y = PAPER_Y + 3.4;
const SCREW_X = 131;
const BRACKET_Z = 146;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (const px of [BOARD.x, BOARD.x + BOARD.w]) extremes.push([px, BOARD.y, BOARD_TOP], [px, FACE + 8, BOARD_TOP]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 12 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
/** A point on a plane parallel to the board's face, at y. */
const onFace = (x: number, z: number, y = PAPER_Y): Point3 => [x, y, z];
const faceLine = (points: Array<[number, number]>, y = PAPER_Y) => pathOf(points.map(([x, z]) => at(onFace(x, z, y))));
/** A round part standing out of the face toward the viewer. */
const peg = (x: number, z: number, r: number, from: number, length: number, steps = 18) => discAlong([x, from, z], [0, 1, 0], r, length, P, steps);

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group: 'static', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group: 'static', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group: 'static', points: points.map(at), size, tone });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

// Base: a bench plate on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 20, BASE.y + 16],
  [BASE.x + BASE.w - 20, BASE.y + 16],
  [BASE.x + 20, BASE.y + BASE.d - 16],
  [BASE.x + BASE.w - 20, BASE.y + BASE.d - 16],
])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 8), innerTone: 'faint' });
line(planOutline(insetPlan(BASE, 4.5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ];
  line(screws.map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
  dots(screws.map(([x, y]) => [x, y, 0]), 0.5);
}

// The upright board, in a cleat along its foot.
solid(slab({ x: BOARD.x - 4, y: BOARD.y - 3, w: BOARD.w + 8, d: BOARD.d + 6, r: 1.5 }, 0, 6, 3, 0.4), 'mid', {
  inner: sideSeam({ x: BOARD.x - 4, y: BOARD.y - 3, w: BOARD.w + 8, d: BOARD.d + 6, r: 1.5 }, 2.4, P, 3),
  innerTone: 'faint',
});
dots([-120, -40, 40, 120].map((x): Point3 => [x, BOARD.y + BOARD.d + 1.5, 6]), 0.45);
solid(slab(BOARD, 6, BOARD_TOP - 6, 3, 0.8), 'mid', { inner: sideSeam(BOARD, BOARD_TOP - 5, P, 3), innerTone: 'faint' });

// The chart paper: a thin sheet with its grid, held at the corners by four drawing pins.
{
  const sheet = plateIn([0, FACE, 0], [1, 0, 0], [0, 0, 1], roundedOutline(PAPER.x0, PAPER.z0, PAPER.x1, PAPER.z1, 1.2, 2), PAPER_Y - FACE, P);
  solid(sheet, 'lo', { crease: 'none' });
  const grid: string[] = [];
  for (let k = 0; k <= 10; k++) grid.push(faceLine([[xOf(k / 10), PAPER.z0], [xOf(k / 10), PAPER.z1]]));
  for (let score = 0; score <= 100; score += 10) {
    const z = zOf((score / 100) * TOP_VALUE);
    grid.push(faceLine([[PAPER.x0, z], [PAPER.x1, z]]));
  }
  line(grid.join(''), 'faint');
  dots(
    [
      [PAPER.x0 + 3, PAPER_Y, PAPER.z0 + 3],
      [PAPER.x1 - 3, PAPER_Y, PAPER.z0 + 3],
      [PAPER.x0 + 3, PAPER_Y, PAPER.z1 - 3],
      [PAPER.x1 - 3, PAPER_Y, PAPER.z1 - 3],
    ],
    0.6,
    'hi',
  );
}

/** The engraved true result, sampled across the chart; the component passes the model's own curve. */
export function engraved(real: (grip: number) => number): string {
  const points: Array<[number, number]> = [];
  // Edge to edge of the paper, so the engraved line ends on the sheet's own edge.
  const from = (PAPER.x0 - CHART.x0) / (CHART.x1 - CHART.x0);
  const to = (PAPER.x1 - CHART.x0) / (CHART.x1 - CHART.x0);
  for (let k = 0; k <= 130; k++) {
    const grip = from + ((to - from) * k) / 130;
    points.push([xOf(grip), zOf(real(grip))]);
  }
  return faceLine(points);
}

// The two rulers: grip strength along the bottom, how well it works up the left, ticks rooted on each strip's edge.
const RULER_Z = { z0: CHART.z0 - 9, z1: CHART.z0 - 3 };
const SCALE_X = { x0: CHART.x0 - 9, x1: CHART.x0 - 3 };
{
  solid(plateIn([0, PAPER_Y, 0], [1, 0, 0], [0, 0, 1], roundedOutline(CHART.x0 - 2, RULER_Z.z0, CHART.x1 + 2, RULER_Z.z1, 0.8, 2), 0.6, P), 'mid', { crease: 'none' });
  solid(plateIn([0, PAPER_Y, 0], [1, 0, 0], [0, 0, 1], roundedOutline(SCALE_X.x0, CHART.z0 - 2, SCALE_X.x1, CHART.z1 + 1, 0.8, 2), 0.6, P), 'mid', { crease: 'none' });
  const y = PAPER_Y + 0.6;
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; k <= 20; k++) (k % 2 ? minor : major).push(faceLine([[xOf(k / 20), RULER_Z.z1], [xOf(k / 20), RULER_Z.z1 - (k % 2 ? 2 : 3.6)]], y));
  for (let score = 0; score <= 100; score += 5) {
    const z = zOf((score / 100) * TOP_VALUE);
    (score % 10 ? minor : major).push(faceLine([[SCALE_X.x1, z], [SCALE_X.x1 - (score % 10 ? 2 : 3.6), z]], y));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
}

/** The tried range on the bottom ruler: an inlay under the span the recorded tries cover. */
export function triedInlay(low: number, high: number): SolidPaths {
  return plateIn([0, PAPER_Y + 0.6, 0], [1, 0, 0], [0, 0, 1], roundedOutline(xOf(low), RULER_Z.z0 + 0.8, xOf(high), RULER_Z.z0 + 2.4, 0.6, 2), 0.3, P);
}

/** The pins at each recorded try, a peg above and one below the strip where it passes the true curve. */
export function pinsAt(tried: readonly number[], real: (grip: number) => number): SolidPaths[] {
  const out: SolidPaths[] = [];
  for (const grip of tried) {
    const x = xOf(grip);
    const z = zOf(real(grip));
    out.push(peg(x, z - STRIP.half - PEG.gap, PEG.r, PAPER_Y, PEG.length), peg(x, z + STRIP.half + PEG.gap, PEG.r, PAPER_Y, PEG.length));
  }
  return out;
}

// The board's side brackets: triangular plates from the board's foot out over the base, at each end.
for (const side of [-1, 1] as const) {
  const x = side * (BOARD.w / 2 - 6);
  solid(plateIn([x - 1.2, FACE, 6], [0, 1, 0], [0, 0, 1], [[0, 0], [16, 0], [0, 34]], 2.4, P), 'mid');
}

// On the chart, back to front: the engraved result and the tried range, the spline, the pins that hold it,
// the presser arms on their pivots, the screws' shanks under their brackets, the brackets and knobs.
put({ kind: 'live', group: 'static', id: 'curve' });
put({ kind: 'live', group: 'static', id: 'spline' });
put({ kind: 'live', group: 'static', id: 'pins' });
put({ kind: 'live', group: 'static', id: 'arms' });
put({ kind: 'live', group: 'static', id: 'shanks' });
const SCREW_TOP = BRACKET_Z + 3;
for (const side of [-1, 1] as const) {
  const x = side * SCREW_X;
  solid(plateIn([x, FACE, BRACKET_Z], [1, 0, 0], [0, 1, 0], roundedOutline(-4, 0, 4, 9.5, 1, 2), 3, P, 0.3), 'mid');
  dots([[x - 2.4, FACE + 1.4, SCREW_TOP], [x + 2.4, FACE + 1.4, SCREW_TOP]], 0.45);
}
put({ kind: 'live', group: 'static', id: 'knobs' });

// The rider's rail on two brackets with an end stop at each end, then the rider (a moving group) and its plumb line.
for (const side of [-1, 1] as const) {
  const x = side * (RAIL.x1 + 3.5);
  solid(plateIn([x, FACE, RAIL.z - 4], [1, 0, 0], [0, 0, 1], roundedOutline(-3, 0, 3, 9, 1, 2), RAIL.y - FACE + 2.6, P, 0.3), 'mid');
}
solid(discAlong([RAIL.x0 - 6, RAIL.y, RAIL.z + 0.5], [1, 0, 0], RAIL.r, RAIL.x1 - RAIL.x0 + 12, P, 22), 'mid');
for (const x of [RAIL.x0 - 1.4, RAIL.x1 + 0.2]) solid(discAlong([x, RAIL.y, RAIL.z + 0.5], [1, 0, 0], 2.6, 1.2, P, 22), 'mid');
// The plumb line and bob hang from the rider's hanger, which is drawn over the line's top.
put({ kind: 'live', group: 'static', id: 'plumb' });
put({ kind: 'solid', group: 'rider', paths: plateIn([0, RAIL.y - 3.4, RAIL.z - 3.2], [1, 0, 0], [0, 0, 1], roundedOutline(-5, 0, 5, 7.6, 1.4, 3), 6.8, P, 0.4), tone: 'hi' });
put({ kind: 'solid', group: 'rider', paths: discAlong([0, RAIL.y + 3.4, RAIL.z + 0.6], [0, 1, 0], 1.6, 2.6, P, 18), tone: 'mid' });
put({ kind: 'dots', group: 'rider', points: [at([-3.2, RAIL.y + 3.4, RAIL.z + 3.4]), at([3.2, RAIL.y + 3.4, RAIL.z + 3.4])], size: 0.45, tone: 'mid' });
put({ kind: 'solid', group: 'rider', paths: discAlong([0, PLUMB_Y, RAIL.z - 3.2], [0, 0, -1], 1, 2.2, P, 16), tone: 'mid' });

// On the base in front of the board: a pencil tray with two spare pins, and the label plate.
const TRAY: Plan = { x: -60, y: 8, w: 120, d: 12, r: 3 };
solid(slab(TRAY, 0, 3, 4, 0.4), 'mid', { inner: sideSeam(TRAY, 1.2, P, 4), innerTone: 'faint' });
line(planOutline(insetPlan(TRAY, 2.2), 3, P, 4), 'lo');
for (const x of [-30, 8]) solid(discAlong([x, TRAY.y + TRAY.d / 2, 3 + PEG.r * 1.4], [1, 0, 0], PEG.r * 1.4, PEG.length * 3, P, 16), 'mid');
const LABEL: Plan = { x: 82, y: 9, w: 50, d: 13, r: 2 };
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.8 + row * 3], [LABEL.x + (row === 1 ? 30 : 42), LABEL.y + 3.8 + row * 3]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.8, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.8, LABEL.y + LABEL.d / 2, 0.8]], 0.5);

export const PARTS: readonly Part[] = parts;

// ------------------------------------------------------------- live parts
/** The spline strip along a guess curve, from gentle to hard: its front face, top edge and silhouette. */
export function splineOf(guess: (grip: number) => number): SolidPaths {
  const count = 140;
  const front: Flat[] = [];
  const frontLow: Flat[] = [];
  const topBack: Flat[] = [];
  for (let k = 0; k <= count; k++) {
    const grip = k / count;
    const x = xOf(grip);
    const z = zOf(guess(grip));
    front.push(at([x, STRIP.y1, z + STRIP.half]));
    frontLow.push(at([x, STRIP.y1, z - STRIP.half]));
    topBack.push(at([x, STRIP.y0, z + STRIP.half]));
  }
  const endBack = at([xOf(1), STRIP.y0, zOf(guess(1)) - STRIP.half]);
  const startBack = at([xOf(0), STRIP.y0, zOf(guess(0)) - STRIP.half]);
  const silhouette = [...topBack, endBack, ...[...frontLow].reverse(), startBack];
  const face = pathOf([...front, ...[...frontLow].reverse()], true);
  const edge = pathOf([...topBack, ...[...front].reverse()], true);
  return {
    fill: pathOf(silhouette, true),
    outline: pathOf(silhouette, true),
    crease: pathOf(front),
    top: face,
    shades: ['', '', edge, ''],
  };
}

/** One presser arm, pivoted above the outermost pin on its side and resting on the spline's free tip. */
export function armOf(side: 1 | -1, pivotGrip: number, pivotValue: number, tipValue: number) {
  const tipGrip = side > 0 ? 1 : 0;
  const pivot: [number, number] = [xOf(pivotGrip) + side * 6, zOf(pivotValue) + 10];
  const contact: [number, number] = [xOf(tipGrip), zOf(tipValue) + STRIP.half];
  const dx = contact[0] - pivot[0];
  const dz = contact[1] - pivot[1];
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  // The bar's lower edge lies on the contact: its centre line is half its depth above, across the arm.
  const half = 1.4;
  const nx = -uz * Math.sign(ux);
  const nz = ux * Math.sign(ux);
  const lift = (p: [number, number]): Point3 => [p[0] + nx * half, (STRIP.y0 + STRIP.y1) / 2 + 0.1, p[1] + nz * half];
  const reach = side * (SCREW_X + 3 - Math.abs(contact[0]));
  const end: [number, number] = [contact[0] + ux * Math.abs(reach / ux), contact[1] + uz * Math.abs(reach / ux)];
  const bar = barBetween(lift([pivot[0] - ux * 3, pivot[1] - uz * 3]), lift(end), [0, 1, 0], 1.8, half * 2, P, 0.3);
  const boss = peg(pivot[0], pivot[1], 2.6, PAPER_Y, STRIP.y1 + 0.6 - PAPER_Y, 22);
  const cap = peg(pivot[0], pivot[1], 1.5, STRIP.y1 + 0.6, 0.8, 16);
  /** Where the screw meets the arm's top edge, at the screw's x. */
  const screwX = side * SCREW_X;
  const along = (screwX - pivot[0]) / ux;
  const top = pivot[1] + uz * along + Math.abs(nz) * half * 2;
  return { bar, boss, cap, screwFoot: top, pivot };
}

/** A presser screw: from its bracket down to the arm, with a knurled knob on top whose pointer turns with the setting. */
export function screwOf(side: 1 | -1, foot: number, turn: number) {
  const x = side * SCREW_X;
  const y = (STRIP.y0 + STRIP.y1) / 2 + 0.1;
  const shank = kitCylinder(x, y, 0.9, foot, BRACKET_Z - foot, P, 14);
  const collar = kitCylinder(x, y, 2.2, SCREW_TOP, 1.2, P, 22);
  const knob = kitCylinder(x, y, 3.4, SCREW_TOP + 1.2, 3.6, P, 28, 0.4);
  const ribs = knurl(x, y, 3.4, SCREW_TOP + 1.2, SCREW_TOP + 4.8, 22, P);
  const a = turn * Math.PI * 2;
  const pointer = lineOnTop([x, y], [x + Math.sin(a) * 2.8, y - Math.cos(a) * 2.8], SCREW_TOP + 4.8, P);
  return { shank, collar, knob, ribs, pointer };
}

/** The screen offset that moves the rider, built at grip x = 0, over a grip. */
export const riderAt = (grip: number) => translateAlong(P, [xOf(grip), 0, 0]);

/** The plumb line from the rider down to the bob, and the bob whose tip marks the true result at that grip. */
export function plumbOf(grip: number, realValue: number) {
  const x = xOf(grip);
  const tip = zOf(realValue);
  const bobTop = tip + 7.4;
  return {
    line: pathOf([at([x, PLUMB_Y, RAIL.z - 4.4]), at([x, PLUMB_Y, bobTop + 1.2])]),
    knot: kitCylinder(x, PLUMB_Y, 1, bobTop, 1.2, P, 14),
    body: kitCylinder(x, PLUMB_Y, 3.1, tip + 3.4, 4, P, 26, 0.3),
    neck: kitCylinder(x, PLUMB_Y, 1.8, tip + 1.6, 1.8, P, 20),
    point: kitCylinder(x, PLUMB_Y, 0.6, tip, 1.6, P, 12),
  };
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
