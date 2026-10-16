/**
 * The twin actuator bench for ActuatorGap, drawn with the isometric kit.
 *
 * The object is the explanation: two rotary joint drives stand side by side
 * on one bench, each a motor and gearbox turning a crank over a protractor
 * plate. The left one is the real series-elastic drive, with its torsion
 * spring between the gearbox and the crank; the right one is the
 * simulator's twin, with a rigid coupling where the spring would be, and
 * its crank is the one lit part. A chart recorder at the back draws the
 * command, the real crank and the twin's crank over time, and a learned
 * motor-model cartridge stands in the twin's model bay. Sent the same
 * command, the real crank arrives late and swings past the target stop;
 * the ideal twin is there at once, and with the learned cartridge seated it
 * follows the real swing.
 *
 * World units are millimetres: x along the bench, y across it (toward the
 * viewer is +y), z up. Static paths are built once here. The cranks, the
 * spring, the recorder's traces and pens and the cartridge are rebuilt or
 * moved by the live code through the functions at the bottom.
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
  pathOf,
  planOutline,
  radialTicks,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  towardViewer,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { phoneFitOf } from '../phone-fit.ts';

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 50;

/** The crank turns this far for the whole commanded move. */
export const SWING_DEG = 80;
/** The protractor reads from 0 to this share of the move (the real crank overshoots to about 1.2). */
export const SCALE_TOP = 1.4;

export type Station = 'real' | 'twin';
export type Group = 'static' | 'window' | 'cartridge';
export type LiveId = 'real-spring-back' | 'real-spring-front' | 'real-crank' | 'twin-crank' | 'traces' | 'pens';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'fill'; group: Group; d: string; shade: 'paper' | 0 | 1 | 2 | 3 | 'top' }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -130, y: -64, w: 260, d: 130, r: 9 };
const BASE_H = 8;
const FOOT_H = 5;

export const STATIONS: Record<Station, Plane> = { real: [-64, 14], twin: [64, 14] };
const Z = { mount: 3, motor: 26, gear: 32, plateLo: 31.2, plateHi: 33.6, springLo: 34.4, springHi: 49, hubLo: 49, hubHi: 53.6, armLo: 53.6, armHi: 57.6 };
const R_MOTOR = 15;
const R_GEAR = 18;
const ARM = { length: 39, root: 6.6, tip: 3.8 };
const PIN_R = 1.3;
const SPRING = { r: 6.6, turns: 5 };
/** How much of the real crank's lag the motor side leads by: the spring's drawn wind-up (illustrative). */
const LEAD = 0.45;

const RADIANS = Math.PI / 180;
/** Crank angle at zero, in the kit's dial convention (0 toward −y, clockwise from above). */
const ZERO = (90 + AZIMUTH - 0.6 * SWING_DEG) * RADIANS;
const SWING = SWING_DEG * RADIANS;
const SECTOR = { r0: 22.5, r1: 45, from: ZERO - 0.14 * SWING, to: ZERO + (SCALE_TOP + 0.04) * SWING };

/** The chart recorder at the back, its window and the paper's time and value axes. */
const REC: Plan = { x: -46, y: -58, w: 92, d: 18, r: 3 };
const REC_H = 60;
const FACE_Y = REC.y + REC.d;
const WIN = { x0: -38, x1: 32, z0: 14, z1: 51, depth: 2 };
const PAPER_Y = FACE_Y - WIN.depth;
/** The recorder runs the paper over this much of the model's time axis (command at 0.1). */
export const SWEEP = 0.6;
const TRACE = { x0: WIN.x0 + 4, x1: WIN.x1 - 4, zero: 20, full: 39 };


/** The command box at the front, the two junction boxes and the twin's model bay (with its slot). */
const BUTTON_BOX: Plan = { x: -15, y: 42, w: 30, d: 18, r: 2.5 };
const JUNCTION: Record<Station, Plan> = {
  real: { x: -122, y: -30, w: 16, d: 14, r: 1.6 },
  twin: { x: 94, y: -40, w: 26, d: 22, r: 2.4 },
};
const JUNCTION_H: Record<Station, number> = { real: 10, twin: 14 };
const SLOT: Plan = { x: 98, y: -32.2, w: 18, d: 6.4, r: 1.2 };
const CART: Plan = { x: 99.6, y: -31, w: 14.8, d: 4, r: 0.8 };
const CART_Z = [2, JUNCTION_H.twin + 8] as const;
/** How far the cartridge rises out of its bay when the twin runs the ideal model. */
export const CART_LIFT = 13;
const LABEL: Plan = { x: -118, y: -56, w: 46, d: 12, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([REC.x, REC.y, REC_H + 8], [REC.x + REC.w, REC.y, REC_H + 8]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 14 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const dirOf = (angle: number): Plane => [Math.sin(angle), -Math.cos(angle)];
const polar = ([cx, cy]: Plane, r: number, angle: number): Plane => {
  const [dx, dy] = dirOf(angle);
  return [cx + r * dx, cy + r * dy];
};

/** The crank angle for a share of the move (0 at zero, 1 at the target stop). */
export const crankAngle = (share: number) => ZERO + SWING * share;

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group: 'static', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group: 'static', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group: 'static', points: points.map(at), size, tone });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** A flat annular sector on the floor plan, outer arc then inner arc. */
function sectorRing([cx, cy]: Plane, r0: number, r1: number, from: number, to: number, steps = 32): Plane[] {
  const out: Plane[] = [];
  for (let i = 0; i <= steps; i++) out.push(polar([cx, cy], r1, from + ((to - from) * i) / steps));
  for (let i = steps; i >= 0; i--) out.push(polar([cx, cy], r0, from + ((to - from) * i) / steps));
  return out;
}

/** Convex hull of floor or screen points. */
function hull<T extends [number, number]>(points: T[]): T[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: T, a: T, b: T) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: T[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: T[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A short round boss standing out of a face that looks along +y: a flange or a connector shell. */
function faceBoss(cx: number, y: number, cz: number, r: number, depth: number, steps = 28): SolidPaths {
  const circle = (yy: number) =>
    Array.from({ length: steps }, (_, i): Flat => {
      const a = (i / steps) * Math.PI * 2;
      return at([cx + r * Math.cos(a), yy, cz + r * Math.sin(a)]);
    });
  const front = circle(y + depth);
  const outline = pathOf(hull([...circle(y), ...front]), true);
  return { fill: outline, outline, crease: '', top: pathOf(front, true), shades: ['', outline, '', ''] };
}

// Base: a plate on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 22, BASE.y + 18],
  [BASE.x + BASE.w - 22, BASE.y + 18],
  [BASE.x + 22, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 18],
])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), 'lo');
  solid(cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 8), innerTone: 'faint' });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  line(screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo');
  dots(screws.map(([x, y]) => [x, y, 0]), 0.55);
}

// A label plate at the back left, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.6 + row * 3], [LABEL.x + (row === 1 ? 30 : 42), LABEL.y + 3.6 + row * 3]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.6, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.6, LABEL.y + LABEL.d / 2, 0.8]], 0.5);

// The chart recorder at the back: an upright case, a recessed window with the paper and its grid,
// rails above and below the window, three connectors under it, a carry handle, two knobs and a vent row on top.
const timeX = (t: number) => TRACE.x0 + (t / SWEEP) * (TRACE.x1 - TRACE.x0);
const valueZ = (v: number) => TRACE.zero + v * (TRACE.full - TRACE.zero);
const PORTS: Record<'real' | 'command' | 'twin', number> = { real: -30, command: -6, twin: 18 };
{
  solid(slab(REC, 0, REC_H, 4, 0.8), 'mid', { inner: sideSeam(REC, REC_H - 8, P, 4), innerTone: 'faint' });
}
// The paper behind the window, its grid, the traces and the pens: everything here is seen through the opening.
{
  const { x0, x1, z0, z1 } = WIN;
  const quad = (points: Point3[]) => pathOf(points.map(at), true);
  put({ kind: 'fill', group: 'static', shade: 'paper', d: quad([[x0, FACE_Y, z0], [x1, FACE_Y, z0], [x1, FACE_Y, z1], [x0, FACE_Y, z1]]) });
  put({ kind: 'fill', group: 'window', shade: 'top', d: quad([[x0, PAPER_Y, z0], [x1, PAPER_Y, z0], [x1, PAPER_Y, z1], [x0, PAPER_Y, z1]]) });
  const grid: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = timeX((i / 12) * SWEEP);
    grid.push(pathOf([at([x, PAPER_Y, z0]), at([x, PAPER_Y, z1])]));
  }
  for (const v of [0, 0.5]) grid.push(pathOf([at([x0, PAPER_Y, valueZ(v)]), at([x1, PAPER_Y, valueZ(v)])]));
  put({ kind: 'line', group: 'window', d: grid.join(''), tone: 'faint' });
  put({ kind: 'line', group: 'window', d: pathOf([at([x0, PAPER_Y, valueZ(1)]), at([x1, PAPER_Y, valueZ(1)])]), tone: 'lo' });
  put({ kind: 'live', group: 'window', id: 'traces' });
  put({ kind: 'live', group: 'window', id: 'pens' });
  // The recess walls you can see from above and to the right: its floor and its left side.
  put({ kind: 'fill', group: 'static', shade: 'top', d: quad([[x0, FACE_Y, z0], [x1, FACE_Y, z0], [x1, PAPER_Y, z0], [x0, PAPER_Y, z0]]) });
  put({ kind: 'fill', group: 'static', shade: 2, d: quad([[x0, FACE_Y, z0], [x0, FACE_Y, z1], [x0, PAPER_Y, z1], [x0, PAPER_Y, z0]]) });
  put({ kind: 'line', group: 'window', d: pathOf([at([x0, PAPER_Y, z1]), at([x0, PAPER_Y, z0]), at([x1, PAPER_Y, z0])]), tone: 'faint' });
  line(quad([[x0, FACE_Y, z0], [x1, FACE_Y, z0], [x1, FACE_Y, z1], [x0, FACE_Y, z1]]), 'lo');
  for (const z of [z1 + 3, z0 - 3]) line(pathOf([at([x0 - 6, FACE_Y, z]), at([x1 + 6, FACE_Y, z])]), 'lo');
  dots([x0 - 6, x1 + 6].flatMap((x): Point3[] => [[x, FACE_Y, z1 + 3], [x, FACE_Y, z0 - 3]]), 0.55);
}
/** The recorder's window: the paper, its traces and pens show only through this opening in the case's face. */
export const WINDOW_CLIP = pathOf(
  [
    [WIN.x0, FACE_Y, WIN.z0],
    [WIN.x1, FACE_Y, WIN.z0],
    [WIN.x1, FACE_Y, WIN.z1],
    [WIN.x0, FACE_Y, WIN.z1],
  ].map((point) => at(point as Point3)),
  true,
);
{
  for (const x of [-36, 12]) solid(slab({ x: x - 2, y: REC.y + 7, w: 4, d: 4, r: 1 }, REC_H, 6, 3), 'mid');
  solid(slab({ x: -39, y: REC.y + 7, w: 54, d: 4, r: 1.6 }, REC_H + 6, 2.4, 3, 0.4), 'mid');
  for (const x of [26, 36]) {
    solid(cyl(x, REC.y + 12, 3.6, REC_H, 1, 24), 'lo');
    solid(cyl(x, REC.y + 12, 3, REC_H + 1, 3.2, 24), 'mid');
    line(knurl(x, REC.y + 12, 3, REC_H + 1, REC_H + 4.2, 18, P), 'lo');
    line(lineOnTop([x, REC.y + 12], [x + 2.2, REC.y + 10], REC_H + 4.2, P), 'hi', 'end');
  }
  line([0, 1, 2, 3, 4].map((k) => planOutline({ x: -34 + k * 8, y: REC.y + 12.6, w: 5, d: 2, r: 1 }, REC_H, P, 3)).join(''), 'lo');
  for (const x of Object.values(PORTS)) {
    solid(faceBoss(x, FACE_Y, 7, 3.8, 1), 'mid');
    solid(faceBoss(x, FACE_Y + 1, 7, 2.4, 2.6), 'mid');
  }
}

// The cables lie on the bench and run back to the recorder's connectors: one from each junction box and the command line.
const CABLE_Z = 0.6;
const CABLES: Array<{ from: Point3; via: Point3[]; to: Point3 }> = [
  {
    from: [JUNCTION.real.x + JUNCTION.real.w, JUNCTION.real.y + 7, 4],
    via: [[JUNCTION.real.x + JUNCTION.real.w + 5, JUNCTION.real.y + 7, CABLE_Z], [PORTS.real, JUNCTION.real.y + 7, CABLE_Z], [PORTS.real, FACE_Y + 10, CABLE_Z], [PORTS.real, FACE_Y + 10, 7]],
    to: [PORTS.real, FACE_Y + 3.6, 7],
  },
  {
    from: [JUNCTION.twin.x, JUNCTION.twin.y + 16, 4],
    via: [[JUNCTION.twin.x - 5, JUNCTION.twin.y + 16, CABLE_Z], [PORTS.twin + 12, JUNCTION.twin.y + 16, CABLE_Z], [PORTS.twin, FACE_Y + 10, CABLE_Z], [PORTS.twin, FACE_Y + 10, 7]],
    to: [PORTS.twin, FACE_Y + 3.6, 7],
  },
  {
    from: [PORTS.command + 4, BUTTON_BOX.y, 4],
    via: [[PORTS.command + 4, BUTTON_BOX.y - 5, CABLE_Z], [PORTS.command, FACE_Y + 18, CABLE_Z], [PORTS.command, FACE_Y + 10, CABLE_Z], [PORTS.command, FACE_Y + 10, 7]],
    to: [PORTS.command, FACE_Y + 3.6, 7],
  },
];
for (const cable of CABLES) put({ kind: 'wire', group: 'static', from: at(cable.from), via: cable.via.map(at), to: at(cable.to), tone: 'mid' });

// The junction boxes at each drive's outer back corner; the twin's carries the motor-model bay and its cartridge.
for (const station of ['real', 'twin'] as const) {
  const box = JUNCTION[station];
  const h = JUNCTION_H[station];
  solid(slab(box, 0, h, 4, 0.6), 'mid', { inner: sideSeam(box, 3.4, P, 4), innerTone: 'faint' });
  dots([[box.x + 2.6, box.y + 2.6, h], [box.x + box.w - 2.6, box.y + box.d - 2.6, h]], 0.45);
  if (station === 'real') line(planOutline(insetPlan(box, 2.4), h, P, 3), 'faint');
}
put({ kind: 'fill', group: 'static', shade: 0, d: slab(SLOT, JUNCTION_H.twin, 0, 3).top });
line(planOutline(SLOT, JUNCTION_H.twin, P, 3), 'lo');
put({ kind: 'solid', group: 'cartridge', paths: slab(CART, CART_Z[0], CART_Z[1] - CART_Z[0], 2, 0.4), tone: 'mid', inner: sideSeam(CART, CART_Z[1] - 3.4, P, 2), innerTone: 'faint' });
put({ kind: 'line', group: 'cartridge', d: [0, 1, 2, 3].map((k) => planOutline({ x: CART.x + 2 + k * 3, y: CART.y + 1.2, w: 1.6, d: 1.6, r: 0.6 }, CART_Z[1], P, 2)).join(''), tone: 'lo' });

/** The cartridge's clip: everything above the bay's top face over the slot, so a seated cartridge sinks into it. */
export const CART_CLIP = pathOf(
  hull(
    [
      [SLOT.x, SLOT.y, JUNCTION_H.twin],
      [SLOT.x + SLOT.w, SLOT.y, JUNCTION_H.twin],
      [SLOT.x, SLOT.y + SLOT.d, JUNCTION_H.twin],
      [SLOT.x + SLOT.w, SLOT.y + SLOT.d, JUNCTION_H.twin],
      [SLOT.x, SLOT.y, JUNCTION_H.twin + 80],
      [SLOT.x + SLOT.w, SLOT.y, JUNCTION_H.twin + 80],
      [SLOT.x, SLOT.y + SLOT.d, JUNCTION_H.twin + 80],
      [SLOT.x + SLOT.w, SLOT.y + SLOT.d, JUNCTION_H.twin + 80],
    ].map((point) => at(point as Point3)),
  ),
  true,
);
/** The screen offset that lifts the cartridge by `share` of its travel (0 seated, 1 raised out of the bay). */
export const cartridgeAt = (share: number) => translateAlong(P, [0, 0, CART_LIFT * share]);

// Each drive: the plate's two standoffs behind it, a round mount flange with its screws, the motor can with
// ribs and seam bands, the gearbox with its bolt circle, the protractor sector with ticks, zero mark and a
// target stop, then the spring (real) or the rigid coupling (twin), the hub and the crank (live).
for (const station of ['real', 'twin'] as const) {
  const centre = STATIONS[station];
  const [cx, cy] = centre;
  for (const angle of byDepthAngles(centre, [SECTOR.from + 0.12, SECTOR.to - 0.12])) {
    const [sx, sy] = polar(centre, 33.5, angle);
    solid(cyl(sx, sy, 3.2, 0, 1.2, 20), 'lo');
    solid(cyl(sx, sy, 2, 1.2, Z.plateLo - 1.2, 16), 'mid');
  }
  solid(cyl(cx, cy, 22, 0, Z.mount, 64, 0.6), 'mid');
  dots(Array.from({ length: 6 }, (_, i): Point3 => [...polar(centre, 19, (i / 6) * Math.PI * 2 + 0.3), Z.mount]), 0.45);
  solid(cyl(cx, cy, R_MOTOR, Z.mount, Z.motor - Z.mount, 64), 'mid', {
    inner: [8, 21].map((z) => sideArc(cx, cy, R_MOTOR, z, P, 32)).join(''),
    innerTone: 'faint',
  });
  line(knurl(cx, cy, R_MOTOR, 8, 21, 44, P, 0), 'faint');
  solid(cyl(cx, cy, R_GEAR, Z.motor, Z.gear - Z.motor, 64, 0.5), 'mid');
  dots(Array.from({ length: 8 }, (_, i): Point3 => [...polar(centre, R_GEAR - 2.6, (i / 8) * Math.PI * 2 + 0.2), Z.gear]), 0.45);
  // The protractor: ticks every tenth of the move, majors at zero, half and the full move, the zero mark in ink.
  solid(extrude(sectorRing(centre, SECTOR.r0, SECTOR.r1, SECTOR.from, SECTOR.to), Z.plateLo, Z.plateHi - Z.plateLo, P, { convex: false }), 'mid');
  {
    const ticks = radialTicks(cx, cy, SECTOR.r1 - 1.4, 14, 5, Z.plateHi, [1.8, 3.8], P, ZERO, SCALE_TOP * SWING);
    line(onTop(sectorRing(centre, SECTOR.r1 - 1.4, SECTOR.r1 - 1.4, SECTOR.from, SECTOR.to).slice(0, 33), Z.plateHi, P), 'faint');
    line(ticks.minor, 'lo');
    line(ticks.major, 'mid');
    line(lineOnTop(polar(centre, SECTOR.r1 - 7.4, ZERO), polar(centre, SECTOR.r1 - 1.4, ZERO), Z.plateHi, P), 'hi');
    dots([polar(centre, SECTOR.r0 + 2.6, SECTOR.from + 0.06), polar(centre, SECTOR.r0 + 2.6, SECTOR.to - 0.06)].map(([x, y]): Point3 => [x, y, Z.plateHi]), 0.45);
  }
  {
    const [tx, ty] = polar(centre, SECTOR.r1 + 1.8, ZERO + SWING);
    solid(slab({ x: tx - 2.2, y: ty - 2.2, w: 4.4, d: 4.4, r: 0.8 }, Z.plateLo - 1, 4.6, 2), 'hi');
  }
  if (station === 'real') {
    solid(cyl(cx, cy, 8.6, Z.gear, Z.springLo - Z.gear, 36), 'mid');
    put({ kind: 'live', group: 'static', id: 'real-spring-back' });
    solid(cyl(cx, cy, 2.6, Z.springLo, Z.hubLo - Z.springLo, 20), 'mid');
    put({ kind: 'live', group: 'static', id: 'real-spring-front' });
  } else {
    // The twin's rigid coupling, where the real drive has its spring, with two set screws.
    solid(cyl(cx, cy, 6.8, Z.gear, Z.hubLo - Z.gear, 40, 0.4), 'mid', {
      inner: [Z.gear + 4, Z.hubLo - 4].map((z) => sideArc(cx, cy, 6.8, z, P, 24)).join(''),
      innerTone: 'faint',
    });
    const [vx, vy] = towardViewer(P);
    dots([[cx + vx * 6.8, cy + vy * 6.8, (Z.gear + Z.hubLo) / 2]], 0.6);
  }
  solid(cyl(cx, cy, 8.6, Z.hubLo, Z.hubHi - Z.hubLo, 36, 0.4), 'mid');
  put({ kind: 'live', group: 'static', id: station === 'real' ? 'real-crank' : 'twin-crank' });
}

function byDepthAngles(centre: Plane, angles: number[]) {
  return [...angles].sort((a, b) => {
    const [ax, ay] = polar(centre, 1, a);
    const [bx, by] = polar(centre, 1, b);
    return depthOf([ax, ay, 0], P) - depthOf([bx, by, 0], P);
  });
}

// The command box at the front: a push button in a collar and a knurled toggle, four screws.
solid(slab(BUTTON_BOX, 0, 8, 4, 0.6), 'mid', { inner: sideSeam(BUTTON_BOX, 3, P, 4), innerTone: 'faint' });
dots(
  [
    [BUTTON_BOX.x + 3, BUTTON_BOX.y + 3, 8],
    [BUTTON_BOX.x + BUTTON_BOX.w - 3, BUTTON_BOX.y + 3, 8],
    [BUTTON_BOX.x + 3, BUTTON_BOX.y + BUTTON_BOX.d - 3, 8],
    [BUTTON_BOX.x + BUTTON_BOX.w - 3, BUTTON_BOX.y + BUTTON_BOX.d - 3, 8],
  ],
  0.45,
);
solid(cyl(4, 51, 5.4, 8, 1.4, 32), 'mid');
solid(cyl(4, 51, 4, 9.4, 2.4, 28, 0.4), 'hi');
solid(cyl(-8, 52, 2.4, 8, 3.2, 20), 'mid');
line(knurl(-8, 52, 2.4, 8, 11.2, 12, P), 'lo');

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------------- live parts
const [VX, VY] = towardViewer(P);

/** The torsion spring between the real drive's gearbox and its hub, wound by the motor side leading the crank. */
export function springAt(crankShare: number, motorShare: number): { back: string; front: string } {
  const [cx, cy] = STATIONS.real;
  const phiO = crankAngle(crankShare);
  const phiM = crankAngle(motorShare);
  const count = 120;
  const back: Flat[][] = [];
  const front: Flat[][] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let i = 0; i <= count; i++) {
    const s = i / count;
    const phi = phiM + (phiO - phiM) * s + SPRING.turns * Math.PI * 2 * s;
    const [dx, dy] = dirOf(phi);
    const point = at([cx + SPRING.r * dx, cy + SPRING.r * dy, Z.springLo + (Z.springHi - Z.springLo) * s]);
    const facing = dx * VX + dy * VY > 0;
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(point);
      (near ? front : back).push(run);
      run = [point];
      near = facing;
      continue;
    }
    run.push(point);
  }
  if (run.length > 1) (near ? front : back).push(run);
  return { back: back.map((points) => pathOf(points)).join(''), front: front.map((points) => pathOf(points)).join('') };
}

export interface Crank {
  pin: SolidPaths;
  arm: SolidPaths;
  rule: string;
  screws: Flat[];
}

/** One crank at a share of the move: the tapered arm on the hub, its drop pin over the scale, a rule and two screws. */
export function crankAt(station: Station, share: number): Crank {
  const centre = STATIONS[station];
  const [cx, cy] = centre;
  const angle = crankAngle(share);
  const [ux, uy] = dirOf(angle);
  const points: Plane[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    points.push([cx + ARM.root * Math.cos(a), cy + ARM.root * Math.sin(a)]);
    points.push([cx + ux * ARM.length + ARM.tip * Math.cos(a), cy + uy * ARM.length + ARM.tip * Math.sin(a)]);
  }
  const tip = polar(centre, ARM.length, angle);
  return {
    pin: kitCylinder(tip[0], tip[1], PIN_R, Z.plateHi + 0.8, Z.armLo - Z.plateHi - 0.8, P, 14),
    arm: extrude(hull(points), Z.armLo, Z.armHi - Z.armLo, P, { bevel: 0.5 }),
    rule: lineOnTop(centre, polar(centre, ARM.length, angle), Z.armHi, P),
    screws: [at([cx, cy, Z.armHi]), at([tip[0], tip[1], Z.armHi])],
  };
}

/** The recorder's three traces up to model time `t`: command, real crank, twin crank. */
export function tracesTo(t: number, command: (u: number) => number, real: (u: number) => number, twin: (u: number) => number) {
  const until = Math.max(0, Math.min(t, SWEEP));
  const count = Math.max(2, Math.round((until / SWEEP) * 180));
  const path = (fn: (u: number) => number) => {
    const points: Flat[] = [];
    for (let i = 0; i <= count; i++) {
      const u = (i / count) * until;
      points.push(at([timeX(u), PAPER_Y, valueZ(fn(u))]));
    }
    return pathOf(points);
  };
  return { command: path(command), real: path(real), twin: path(twin) };
}

/** The pen carriage at model time `t`: a bar across the paper and one pen on each trace. */
export function pensAt(t: number, values: { command: number; real: number; twin: number }) {
  const x = timeX(Math.max(0, Math.min(t, SWEEP)));
  const head = (v: number) => slabOf({ x: x - 2.2, y: PAPER_Y + 0.4, w: 4.4, d: 3.2, r: 0.8 }, valueZ(v) - 1.3, 2.6, P, 2);
  return {
    bar: slabOf({ x: x - 1.2, y: PAPER_Y + 0.3, w: 2.4, d: 1.8, r: 0.5 }, WIN.z0 + 0.4, WIN.z1 - WIN.z0 - 0.8, P, 2),
    command: head(values.command),
    real: head(values.real),
    twin: head(values.twin),
  };
}

/** The motor side of the real drive leads its crank by part of the remaining move: the spring's drawn wind-up. */
export const motorSideOf = (crank: number, command: number) => crank + (command - crank) * LEAD;
