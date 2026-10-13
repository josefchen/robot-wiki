/**
 * The slip test stand for the TactileSlip scene, drawn with the isometric kit.
 *
 * The object is the explanation. A parallel gripper hangs from a test stand
 * and holds a glass tumbler between two fingertip pads. A camera on a post
 * looks at the grip from the side, along the line the fingers close on, so
 * all it sees is the back of the near finger: the contact itself is hidden.
 * When the glass slips, the stand's dial indicator (its plunger resting on
 * the rim) reads how far it went, the camera's view does not change, and
 * the only part of the robot that notices is the fingertip pads: their
 * taxel grids fire, and the gripper's lead screw squeezes until the grip
 * holds again. The grip dial on the gripper reads the squeeze.
 *
 * The model (`gripHolds`, `catchGrip`) is the friction rule a parallel grip
 * obeys: two pads hold a load while 2 μ N is at least the load. Its values
 * (glass weight, friction, the grip before and after, the extra load and the
 * 3 mm slide) are authored for the schematic, as the scene's status says.
 *
 * World units are millimetres: x along the line the fingers close on (the
 * camera is at +x), y toward the viewer's left, z up. Every static path is
 * built once here; the glass is built at rest and moved down with
 * `glassShift`, and the live code rebuilds only the dial needles' angle,
 * the plunger's length and the pads' fill.
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
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 600;
export const AZIMUTH = 70;
export const ELEVATION = 28;

// ------------------------------------------------------------------ the model
/** Standard gravity, m/s². */
export const G = 9.81;
/** The glass and its water, kg (authored). */
export const GLASS_KG = 0.3;
/** Friction between a rubber pad and the glass (authored). */
export const MU = 0.4;
/** The grip before the slip and after the regrip, newtons per pad (authored). */
export const GRIP_HOLD_N = 4;
export const GRIP_REGRIP_N = 6;
/** The extra downward load that starts the slip, newtons (authored: a knock or a top-up). */
export const EXTRA_LOAD_N = 0.8;
/** How far the glass slides before the grip catches it, millimetres (authored). */
export const SLIP_MM = 3;

/** The glass's weight, newtons. */
export const weightN = (kg = GLASS_KG) => kg * G;
/** What two pads can hold by friction at a grip of `grip` newtons each. */
export const holdingN = (grip: number, mu = MU) => 2 * mu * grip;
/** Whether a two-pad grip of `grip` newtons holds a downward load of `load` newtons. */
export const gripHolds = (grip: number, load: number, mu = MU) => holdingN(grip, mu) >= load;
/** The least grip that holds `load` newtons with two pads. */
export const catchGrip = (load: number, mu = MU) => load / (2 * mu);

// ----------------------------------------------------------------- the layout
const BASE: Plan = { x: -124, y: -32, w: 244, d: 96, r: 8 };
const BASE_H = 9;
const FOOT_H = 6;
const TRAY: Plan = { x: -34, y: -30, w: 68, d: 62, r: 6 };

/** The glass: a tapered tumbler, its foot held 22 above the base at rest. */
export const GLASS = { r0: 26, r1: 30, z0: 22, h: 80, wall: 2.1, foot: 6 };
const GLASS_TOP = GLASS.z0 + GLASS.h;
const glassR = (z: number) => GLASS.r0 + ((GLASS.r1 - GLASS.r0) * (z - GLASS.z0)) / GLASS.h;

/** The fingertip pads: their middle is the contact height, where the camera aims. */
export const CONTACT_Z = 74;
const PAD = { h: 24, t: 10, w: 20 };
const PAD_IN = glassR(CONTACT_Z);
const PLATE_T = 6;
const CARRIAGE = { z0: 110, h: 9, w: 22, d: 18 };
const RAIL = { z0: 119, h: 3 };
const BODY: Plan = { x: -60, y: -16, w: 120, d: 32, r: 3 };
const BODY_Z = 122;
const BODY_H = 28;
const BODY_TOP = BODY_Z + BODY_H;
const FACE_Y = BODY.y + BODY.d;

/** The stand: a column at -x, its arm along +x to the gripper's end through a wrist load cell. */
const COLUMN = { x: -104, y: 0, r: 9, top: 166 };
const ARM: Plan = { x: -92, y: -7, w: 13, d: 14, r: 2 };
const ARM_Z = 129;
const ARM_H = 14;
const WRIST = { x0: -76, x1: -63, r: 9.5, z: BODY_Z + BODY_H / 2 };

/** The camera on its post at +x, aimed along -x at the near finger. */
const CAM: Plan = { x: 88, y: -12, w: 26, d: 24, r: 2 };
const CAM_Z = CONTACT_Z - 11;
const CAM_H = 22;
const LENS = { x0: 68, x1: CAM.x, r: 8 };
const CAM_POST = { x: 101, y: 0 };

/** The dial indicator over the rim at the front left: plunger down, face toward +y. */
const RIM_ANGLE = (128 * Math.PI) / 180;
const RIM_RC = GLASS.r1 - GLASS.wall / 2;
export const PLUNGER_AT: Plane = [RIM_RC * Math.cos(RIM_ANGLE), RIM_RC * Math.sin(RIM_ANGLE)];
const GAUGE = { r: 12, depth: 8, stemTop: GLASS_TOP + 11, stemBottom: GLASS_TOP + 6, stemR: 2.8, plungerR: 1.3 };
const GAUGE_Z = GAUGE.stemTop + GAUGE.r + 0.5;
const GAUGE_FRONT = PLUNGER_AT[1] + GAUGE.depth / 2;
const GAUGE_POST: Plane = [-66, 50];

/** One revolution of the slip dial is 5 mm, in 50 divisions. */
export const DIAL_MM_PER_TURN = 5;
/** The grip dial reads 0 to 8 N over 270 degrees. */
export const GRIP_DIAL_MAX_N = 8;
const GRIP_DIAL = { x: 38, z: BODY_Z + BODY_H / 2, r: 10 };

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([COLUMN.x, COLUMN.y - COLUMN.r, COLUMN.top + 4], [COLUMN.x, COLUMN.y + COLUMN.r, COLUMN.top + 4], [-36, 0, BODY_TOP + 16], [60, 16, BODY_TOP]);
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unit));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 12;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 26, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The screen offset that moves the glass down by `mm`. */
export const glassShift = (mm: number) => translateAlong(P, [0, 0, -mm]);

// ------------------------------------------------------------------ helpers
function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const VIEW = (() => {
  const a = (AZIMUTH * Math.PI) / 180;
  const e = (ELEVATION * Math.PI) / 180;
  return { x: Math.cos(a) * Math.cos(e), y: Math.sin(a) * Math.cos(e), z: Math.sin(e), lx: -Math.sin(a), ly: Math.cos(a) };
})();

/** The kit's four-tone bucket for a side whose floor normal is (nx, ny). */
const shadeOf = (nx: number, ny: number) => {
  const length = Math.hypot(nx, ny) || 1;
  const lit = ((nx / length) * VIEW.lx + (ny / length) * VIEW.ly + 1) / 2;
  return Math.min(3, Math.max(0, Math.floor(lit * 4)));
};

/**
 * A tapered round body on a vertical axis (the tumbler): radius r0 at z0, r1
 * at z0 + h. The fill and outline are the hull of both rims; the sides are
 * shaded by facing like the kit's prisms; the top is the upper rim.
 */
function frustum(cx: number, cy: number, r0: number, r1: number, z0: number, h: number, steps = 64): SolidPaths {
  const low: Flat[] = [];
  const high: Flat[] = [];
  const angles: number[] = [];
  for (let k = 0; k < steps; k++) {
    const angle = ((k + 0.5) / steps) * Math.PI * 2;
    angles.push(angle);
    low.push(at([cx + r0 * Math.cos(angle), cy + r0 * Math.sin(angle), z0]));
    high.push(at([cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle), z0 + h]));
  }
  const shades: string[][] = [[], [], [], []];
  const crease: Flat[][] = [];
  let run: Flat[] = [];
  for (let k = 0; k < steps; k++) {
    const mid = ((k + 1) / steps) * Math.PI * 2;
    const nx = Math.cos(mid);
    const ny = Math.sin(mid);
    const next = (k + 1) % steps;
    if (nx * VIEW.x + ny * VIEW.y > 0) {
      shades[shadeOf(nx, ny)].push(pathOf([high[k], high[next], low[next], low[k]], true));
      if (!run.length) run.push(high[k]);
      run.push(high[next]);
    } else if (run.length) {
      crease.push(run);
      run = [];
    }
  }
  if (run.length) crease.push(run);
  const outline = pathOf(hull([...low, ...high]), true);
  return { fill: outline, outline, crease: crease.map((points) => pathOf(points)).join(''), top: pathOf(high, true), shades: shades.map((list) => list.join('')) };
}

/**
 * A round body lying along the x or y axis (a lens barrel, a dial body): its
 * axis through `c`, from `c` to `c` + `length` along the axis. The fill and
 * outline are the hull of both end rims; the curved side is shaded by facing,
 * its upward facets as a top; an end that faces the viewer is drawn as its
 * crease and left for the face drawing.
 */
function drum(c: Point3, axis: 'x' | 'y', length: number, r: number, steps = 36): SolidPaths {
  const along = (p: Point3, s: number): Point3 => (axis === 'x' ? [p[0] + s, p[1], p[2]] : [p[0], p[1] + s, p[2]]);
  const rimAt = (s: number) => {
    const points: Flat[] = [];
    for (let k = 0; k < steps; k++) {
      const angle = ((k + 0.5) / steps) * Math.PI * 2;
      const u = r * Math.cos(angle);
      const w = r * Math.sin(angle);
      points.push(at(along(axis === 'x' ? [c[0], c[1] + u, c[2] + w] : [c[0] + u, c[1], c[2] + w], s)));
    }
    return points;
  };
  const near = rimAt(0);
  const far = rimAt(length);
  const shades: string[][] = [[], [], [], []];
  const tops: string[] = [];
  for (let k = 0; k < steps; k++) {
    const mid = ((k + 1) / steps) * Math.PI * 2;
    const u = Math.cos(mid);
    const w = Math.sin(mid);
    const [nx, ny, nz] = axis === 'x' ? [0, u, w] : [u, 0, w];
    if (nx * VIEW.x + ny * VIEW.y + nz * VIEW.z <= 0) continue;
    const next = (k + 1) % steps;
    const quad = pathOf([near[k], near[next], far[next], far[k]], true);
    if (nz > 0.72) tops.push(quad);
    else shades[shadeOf(nx, ny)].push(quad);
  }
  const outline = pathOf(hull([...near, ...far]), true);
  const endFacing = (axis === 'x' ? VIEW.x : VIEW.y) * Math.sign(length);
  const front = endFacing > 0 ? far : near;
  return { fill: outline, outline, crease: pathOf(front, true), top: tops.join(''), shades: shades.map((list) => list.join('')) };
}

/** A closed rectangle on the face y = `y`. */
const faceRectY = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

/** A circle of radius `r` as a path in a face's local coordinates. */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// ------------------------------------------------------------------- parts
export type Slot =
  | 'glass'
  | 'finger-far'
  | 'finger-near'
  | 'taxels-far'
  | 'taxels-near'
  | 'pad-far'
  | 'pad-near'
  | 'plunger'
  | 'slip-dial'
  | 'grip-dial'
  | 'sight';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via?: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => PARTS.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => PARTS.push({ kind: 'face', d, fill });
const slot = (name: Slot) => PARTS.push({ kind: 'slot', slot: name });

/** A screw head on a top face: a ring and its dot. */
function screw(x: number, y: number, z: number, r = 1.9) {
  line(ring(x, y, r, z, P, 14), 'lo');
  dots([at([x, y, z])], 0.45, 'mid');
}

// ---------------------------------------------------------------- the base
for (const [x, y] of byDepth(corners(BASE, 16))) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 26), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -BASE_H + 3.2, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
for (const [x, y] of corners(BASE, 10)) screw(x, y, 0, 2.2);
// The catch tray under the glass: a shallow tray with a perforated mat.
solid(slab(TRAY, 0, 2.6, 6, 0.5), 'lo', { inner: sideSeam(TRAY, 1.3, P, 6) });
line(planOutline(insetPlan(TRAY, 4), 2.6, P, 6), 'faint');
{
  const mat: Flat[] = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) mat.push(at([TRAY.x + 10 + i * 8, TRAY.y + 11 + j * 8, 2.6]));
  dots(mat, 0.5, 'lo');
}
// The label plate at the front right; its rule lines stand for print.
const LABEL: Plan = { x: 30, y: 46, w: 54, d: 15, r: 2 };
solid(slab(LABEL, 0, 0.8, 3), 'lo');
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P, 3), 'faint');
for (const [k, share] of [[0, 0.82], [1, 0.56], [2, 0.7]] as const) {
  const y = LABEL.y + 4 + k * 3.5;
  line(lineOnTop([LABEL.x + 6, y], [LABEL.x + 6 + (LABEL.w - 16) * share, y], 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], 0.45, 'mid');
// The camera's connector block on the base, where its cable lands.
const JACK: Plan = { x: 92, y: 30, w: 14, d: 11, r: 1.5 };
solid(slab(JACK, 0, 5, 2, 0.4), 'mid');
line(ring(JACK.x + 7, JACK.y + 5.5, 2.2, 5, P, 16), 'lo');

// ------------------------------------------------------------- the column
solid(cyl(COLUMN.x, COLUMN.y, 15, 0, 3, 32, 0.5), 'mid');
for (const [x, y] of [[COLUMN.x - 10, COLUMN.y + 10], [COLUMN.x + 10, COLUMN.y + 10]] as Plane[]) screw(x, y, 3, 1.5);
const CLAMP: Plan = { x: COLUMN.x - 13, y: COLUMN.y - 13, w: 26, d: 26, r: 3 };
const CLAMP_Z = ARM_Z - 5;
const CLAMP_H = ARM_H + 10;
solid(cyl(COLUMN.x, COLUMN.y, COLUMN.r, 3, CLAMP_Z - 3, 30), 'mid', { inner: [40, 90].map((z) => sideArc(COLUMN.x, COLUMN.y, COLUMN.r, z, P, 20)).join('') });
// The clamp block that carries the arm, with its thumb screw on the front.
solid(slab(CLAMP, CLAMP_Z, CLAMP_H, 3, 0.6), 'mid', { inner: sideSeam(CLAMP, CLAMP_Z + CLAMP_H / 2, P, 3) });
solid(cyl(COLUMN.x, COLUMN.y, COLUMN.r, CLAMP_Z + CLAMP_H, COLUMN.top - (CLAMP_Z + CLAMP_H), 30), 'mid');
solid(cyl(COLUMN.x, COLUMN.y, COLUMN.r + 1.5, COLUMN.top, 3.5, 30, 0.4), 'lo');
solid(drum([COLUMN.x, CLAMP.y + CLAMP.d, ARM_Z + ARM_H / 2], 'y', 3, 2.2, 20), 'mid');
solid(drum([COLUMN.x, CLAMP.y + CLAMP.d + 3, ARM_Z + ARM_H / 2], 'y', 6, 4.6, 28), 'hi');
// The arm out to the wrist: an end plate, the load cell, and the flange on the gripper's end.
solid(slab(ARM, ARM_Z, ARM_H, 3, 0.6), 'mid', { inner: sideSeam(ARM, ARM_Z + 4, P, 3) });
for (const x of [ARM.x + 5, ARM.x + ARM.w - 5]) screw(x, 0, ARM_Z + ARM_H, 1.3);
solid(slab({ x: WRIST.x0 - 3, y: -13, w: 3, d: 26, r: 0.8 }, WRIST.z - 13, 26, 2, 0.4), 'lo');
dots([at([WRIST.x0, 9.5, WRIST.z + 9.5]), at([WRIST.x0, 9.5, WRIST.z - 9.5])], 0.45, 'mid');
solid(drum([WRIST.x0, 0, WRIST.z], 'x', WRIST.x1 - WRIST.x0, WRIST.r, 40), 'hi');
solid(drum([WRIST.x0 + 4, 0, WRIST.z], 'x', 1.2, WRIST.r + 0.8, 40), 'lo');
solid(drum([WRIST.x1, 0, WRIST.z], 'x', BODY.x - WRIST.x1, WRIST.r + 3, 40), 'lo');

// --------------------------------------------- the far finger, behind the glass
/** One finger's carriage and plate (its pad is rebuilt live), built at rest; it moves in by the squeeze. */
function fingerParts(side: -1 | 1): Part[] {
  const list: Part[] = [];
  const plateX = side > 0 ? PAD_IN + PAD.t : -(PAD_IN + PAD.t) - PLATE_T;
  const carriage: Plan = { x: plateX + PLATE_T / 2 - CARRIAGE.w / 2, y: -CARRIAGE.d / 2 - 3, w: CARRIAGE.w, d: CARRIAGE.d + 6, r: 1.4 };
  list.push({ kind: 'solid', paths: slab(carriage, CARRIAGE.z0, CARRIAGE.h, 2, 0.5), tone: 'mid', inner: sideSeam(carriage, CARRIAGE.z0 + 3.5, P, 2) });
  const plate: Plan = { x: plateX, y: -9, w: PLATE_T, d: 18, r: 1 };
  const plateZ = CONTACT_Z - PAD.h / 2 - 4;
  list.push({ kind: 'solid', paths: slab(plate, plateZ, CARRIAGE.z0 - plateZ, 2, 0.4), tone: 'mid', inner: sideSeam(plate, CONTACT_Z + PAD.h / 2 + 5, P, 2) });
  // Two cap screws holding the pad's backing plate, on the finger's front face.
  list.push({ kind: 'dots', points: [at([plateX + PLATE_T / 2, 9, CONTACT_Z + PAD.h / 2 + 10]), at([plateX + PLATE_T / 2, 9, CONTACT_Z + PAD.h / 2 + 20])], size: 0.5, tone: 'mid' });
  return list;
}
export const FINGER_PARTS = { far: fingerParts(-1), near: fingerParts(1) };
/** The screen offset that moves a finger in by `mm` (the far finger toward +x, the near one toward -x). */
export const fingerShift = (side: -1 | 1, mm: number) => translateAlong(P, [-side * mm, 0, 0]);
slot('finger-far');
slot('pad-far');
slot('taxels-far');

// --------------------------------------------------------------- the glass
slot('glass');

export const GLASS_PATHS = frustum(0, 0, GLASS.r0, GLASS.r1, GLASS.z0, GLASS.h);
/** The glass's open mouth: the rim's inner circle, the dark inside of the far wall. */
export const GLASS_MOUTH = (() => {
  const inner: Flat[] = [];
  for (let k = 0; k < 64; k++) {
    const angle = ((k + 0.5) / 64) * Math.PI * 2;
    inner.push(at([(GLASS.r1 - GLASS.wall) * Math.cos(angle), (GLASS.r1 - GLASS.wall) * Math.sin(angle), GLASS_TOP]));
  }
  return pathOf(inner, true);
})();
/** The glass's seams: the top of its thick foot, and a glint down the side that faces the light. */
export const GLASS_SEAMS = (() => {
  const foot = GLASS.z0 + GLASS.foot;
  const arc = (z: number) => {
    const r = glassR(z);
    const points: Flat[] = [];
    const facing = Math.atan2(VIEW.y, VIEW.x);
    for (let k = 0; k <= 32; k++) {
      const angle = facing - Math.PI / 2 + (k / 32) * Math.PI;
      points.push(at([r * Math.cos(angle), r * Math.sin(angle), z]));
    }
    return pathOf(points);
  };
  const glintAngle = Math.atan2(VIEW.y, VIEW.x) + 0.62;
  const glint = (z0: number, z1: number) => pathOf([at([glassR(z0) * Math.cos(glintAngle), glassR(z0) * Math.sin(glintAngle), z0]), at([glassR(z1) * Math.cos(glintAngle), glassR(z1) * Math.sin(glintAngle), z1])]);
  return { foot: arc(foot), glint: glint(foot, GLASS_TOP) };
})();
/** The glass's silhouette, which carries the scene's held-object mark. */
export const GLASS_OUTLINE = GLASS_PATHS.outline;

// ------------------------------------------- the near finger, in front of the glass
slot('finger-near');
slot('pad-near');
slot('taxels-near');

// ------------------------------------------------- the gripper's rail and body
solid(slab({ x: -54, y: -5, w: 108, d: 10, r: 1 }, RAIL.z0, RAIL.h, 2), 'lo');
solid(slab(BODY, BODY_Z, BODY_H, 3, 0.8), 'mid', { inner: sideSeam(BODY, BODY_TOP - 5, P, 3) });
for (const [x, y] of corners(BODY, 4)) screw(x, y, BODY_TOP, 1.4);
// The lead-screw window on the front face: a recessed slot with the screw's threads.
export const SCREW_WINDOW = { x0: -50, x1: 18, z0: BODY_Z + 8, z1: BODY_Z + 16, y: FACE_Y };
face(faceRectY(SCREW_WINDOW.x0, SCREW_WINDOW.x1, SCREW_WINDOW.z0, SCREW_WINDOW.z1, FACE_Y), 1);
line(faceRectY(SCREW_WINDOW.x0, SCREW_WINDOW.x1, SCREW_WINDOW.z0, SCREW_WINDOW.z1, FACE_Y), 'lo');
dots([at([BODY.x + 4, FACE_Y, BODY_Z + 4]), at([BODY.x + BODY.w - 4, FACE_Y, BODY_Z + 4]), at([BODY.x + 4, FACE_Y, BODY_TOP - 9]), at([BODY.x + BODY.w - 4, FACE_Y, BODY_TOP - 9])], 0.45, 'mid');
slot('grip-dial');

/** The lead screw's thread lines in the window, at a turn of `turn` (0 to 1 is one pitch). */
export function threadsAt(turn: number) {
  const pitch = 4;
  const lines: string[] = [];
  const shift = (((turn % 1) + 1) % 1) * pitch;
  for (let x = SCREW_WINDOW.x0 - pitch + shift; x < SCREW_WINDOW.x1 + pitch; x += pitch) {
    const a = x;
    const b = x + 2.2;
    if (b <= SCREW_WINDOW.x0 || a >= SCREW_WINDOW.x1) continue;
    // Clip each slanted thread to the window's edges, so it ends on the window outline.
    const za = SCREW_WINDOW.z0;
    const zb = SCREW_WINDOW.z1;
    let x0 = a;
    let z0 = za;
    let x1 = b;
    let z1 = zb;
    if (x0 < SCREW_WINDOW.x0) {
      z0 = za + ((SCREW_WINDOW.x0 - a) / (b - a)) * (zb - za);
      x0 = SCREW_WINDOW.x0;
    }
    if (x1 > SCREW_WINDOW.x1) {
      z1 = za + ((SCREW_WINDOW.x1 - a) / (b - a)) * (zb - za);
      x1 = SCREW_WINDOW.x1;
    }
    lines.push(pathOf([at([x0, FACE_Y, z0]), at([x1, FACE_Y, z1])]));
  }
  return lines.join('');
}

// The motor can on top of the body, with its knurled end cap.
solid(cyl(-24, 0, 11, BODY_TOP, 13, 30), 'mid', { inner: sideArc(-24, 0, 11, BODY_TOP + 5, P, 20) });
solid(cyl(-24, 0, 9, BODY_TOP + 13, 3.5, 26, 0.4), 'lo', { inner: knurl(-24, 0, 9, BODY_TOP + 13, BODY_TOP + 16.5, 22, P, 0.1) });

// ------------------------------------------- the dial indicator at the front left
solid(cyl(GAUGE_POST[0], GAUGE_POST[1], 10, 0, 3.5, 30, 0.5), 'lo');
screw(GAUGE_POST[0] + 6, GAUGE_POST[1] + 5, 3.5, 1.2);
solid(cyl(GAUGE_POST[0], GAUGE_POST[1], 3.6, 3.5, GAUGE.stemTop + 7 - 3.5, 22), 'mid', { inner: sideArc(GAUGE_POST[0], GAUGE_POST[1], 3.6, 50, P, 16) });
{
  // The gauge arm: a flat bar from the post's clamp to the gauge's stem.
  const [px, py] = GAUGE_POST;
  const [gx, gy] = PLUNGER_AT;
  const dx = gx - px;
  const dy = gy - py;
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  const [nx, ny] = [-uy, ux];
  const half = 3;
  const bar: Plane[] = [
    [px + nx * half, py + ny * half],
    [gx - ux * 3 + nx * half, gy - uy * 3 + ny * half],
    [gx - ux * 3 - nx * half, gy - uy * 3 - ny * half],
    [px - nx * half, py - ny * half],
  ];
  solid(extrude(bar, GAUGE.stemTop + 1, 4.5, P, { bevel: 0.4 }), 'mid');
  solid(cyl(px, py, 6, GAUGE.stemTop, 6.5, 24), 'mid');
  solid(cyl(px, py, 3.2, GAUGE.stemTop + 6.5, 3.5, 20), 'hi', { inner: knurl(px, py, 3.2, GAUGE.stemTop + 6.5, GAUGE.stemTop + 10, 14, P, 0.1) });
}
slot('plunger');
solid(cyl(PLUNGER_AT[0], PLUNGER_AT[1], GAUGE.stemR, GAUGE.stemBottom, GAUGE.stemTop - GAUGE.stemBottom + 1, 20), 'mid', {
  inner: sideArc(PLUNGER_AT[0], PLUNGER_AT[1], GAUGE.stemR, GAUGE.stemTop - 2, P, 14),
});
solid(cyl(PLUNGER_AT[0], PLUNGER_AT[1], GAUGE.stemR + 2.4, GAUGE.stemTop + 1, 4.5, 22), 'mid');
solid(drum([PLUNGER_AT[0], PLUNGER_AT[1] - GAUGE.depth / 2, GAUGE_Z], 'y', GAUGE.depth, GAUGE.r, 48), 'mid');
solid(drum([PLUNGER_AT[0], GAUGE_FRONT, GAUGE_Z], 'y', 2, GAUGE.r + 0.8, 48), 'lo');
slot('slip-dial');

/** The slip dial's face plane (y = the bezel's front), centred on the dial: local x to +x, local y down. */
export const SLIP_DIAL_MATRIX = sideMatrix([PLUNGER_AT[0], GAUGE_FRONT + 2], GAUGE_Z, P, 'left');
export const SLIP_DIAL_R = GAUGE.r - 1.4;
/** The grip dial's face plane on the gripper's front face. */
export const GRIP_DIAL_MATRIX = sideMatrix([GRIP_DIAL.x, FACE_Y + 1.6], GRIP_DIAL.z, P, 'left');
export const GRIP_DIAL_R = GRIP_DIAL.r - 1.4;
/** The grip dial's bezel: a short drum standing out of the body's face. */
export const GRIP_BEZEL = drum([GRIP_DIAL.x, FACE_Y, GRIP_DIAL.z], 'y', 1.6, GRIP_DIAL.r, 40);

/** A dial face in its local plane: rim, ticks every `step` of a sweep, majors every `every`. */
export function dialFace(r: number, from: number, sweep: number, count: number, every: number) {
  const minor: string[] = [];
  const major: string[] = [];
  const closed = Math.abs(sweep - 360) < 1e-9;
  for (let k = 0; k <= count - (closed ? 1 : 0); k++) {
    const angle = ((from + (k / count) * sweep) * Math.PI) / 180;
    // Every tick hangs from the rim; a long one runs in to the inner scale circle, so both its ends land.
    const big = k % every === 0;
    const r0 = r - (big ? 3.4 : 1.6);
    const sx = Math.sin(angle);
    const sy = -Math.cos(angle);
    (big ? major : minor).push(`M${(sx * r0).toFixed(2)} ${(sy * r0).toFixed(2)}L${(sx * r).toFixed(2)} ${(sy * r).toFixed(2)}`);
  }
  const ri = r - 3.4;
  const a0 = (from * Math.PI) / 180;
  const a1 = ((from + sweep) * Math.PI) / 180;
  const arc = closed
    ? circlePath(0, 0, ri)
    : `M${(Math.sin(a0) * ri).toFixed(2)} ${(-Math.cos(a0) * ri).toFixed(2)}A${ri} ${ri} 0 ${sweep > 180 ? 1 : 0} 1 ${(Math.sin(a1) * ri).toFixed(2)} ${(-Math.cos(a1) * ri).toFixed(2)}`;
  return { rim: circlePath(0, 0, r), minor: minor.join(''), major: major.join(''), arc, hub: circlePath(0, 0, 1.3) };
}
export const SLIP_FACE = dialFace(SLIP_DIAL_R, 0, 360, 50, 10);
export const GRIP_FACE = dialFace(GRIP_DIAL_R, -135, 270, 16, 4);
/** A needle pointing up from the hub (local), to be rotated. */
export const needlePath = (r: number) => `M0 ${(0.28 * r).toFixed(2)}L0 ${(-(r - 1.2)).toFixed(2)}`;
/** The slip dial's needle angle in degrees for a slide of `mm`. */
export const slipDialDegrees = (mm: number) => (mm / DIAL_MM_PER_TURN) * 360;
/** The grip dial's needle angle in degrees for a grip of `newtons`. */
export const gripDialDegrees = (newtons: number) => -135 + (Math.min(Math.max(newtons, 0), GRIP_DIAL_MAX_N) / GRIP_DIAL_MAX_N) * 270;

/** The plunger: a rod from the stem down to the rim, its tip following the glass down by `mm`. */
export function plungerAt(mm: number) {
  const tip = GLASS_TOP - mm;
  return {
    rod: cyl(PLUNGER_AT[0], PLUNGER_AT[1], GAUGE.plungerR, tip + 1.6, GAUGE.stemBottom - tip - 1.6, 16),
    foot: cyl(PLUNGER_AT[0], PLUNGER_AT[1], GAUGE.plungerR + 0.9, tip, 1.6, 18),
  };
}

// ------------------------------------------------ the camera and its sight line
/** The camera's line of sight: from inside its lens to the back of the near finger. */
export const SIGHT = { from: at([LENS.x0 + 2, 0, CONTACT_Z]), to: at([PAD_IN + PAD.t + PLATE_T, 0, CONTACT_Z]) };
solid(cyl(CAM_POST.x, CAM_POST.y, 11, 0, 3, 30, 0.5), 'lo');
screw(CAM_POST.x - 6, CAM_POST.y + 7, 3, 1.3);
solid(cyl(CAM_POST.x, CAM_POST.y, 4, 3, CAM_Z - 6 - 3, 22), 'mid', { inner: sideArc(CAM_POST.x, CAM_POST.y, 4, 30, P, 16) });
solid(cyl(CAM_POST.x, CAM_POST.y, 6.2, CAM_Z - 6, 6, 24, 0.4), 'lo');
solid(drum([LENS.x0 - 3, 0, CAM_Z + CAM_H / 2], 'x', 3, LENS.r + 1.6, 40), 'lo');
solid(drum([LENS.x0, 0, CAM_Z + CAM_H / 2], 'x', LENS.x1 - LENS.x0, LENS.r, 40), 'mid');
solid(drum([LENS.x0 + 8, 0, CAM_Z + CAM_H / 2], 'x', 2.4, LENS.r + 0.8, 40), 'lo');
solid(slab(CAM, CAM_Z, CAM_H, 3, 0.6), 'mid', { inner: sideSeam(CAM, CAM_Z + 6, P, 3) });
for (const [x, y] of corners(CAM, 3)) dots([at([x, y, CAM_Z + CAM_H])], 0.42, 'mid');
// The camera's front: a status lamp and a model plate.
const CAM_FACE = CAM.y + CAM.d;
line(faceRectY(CAM.x + 4, CAM.x + 16, CAM_Z + 9, CAM_Z + 15, CAM_FACE), 'lo');
line(pathOf([at([CAM.x + 6, CAM_FACE, CAM_Z + 12.6]), at([CAM.x + 13, CAM_FACE, CAM_Z + 12.6])]) + pathOf([at([CAM.x + 6, CAM_FACE, CAM_Z + 11]), at([CAM.x + 11, CAM_FACE, CAM_Z + 11])]), 'faint', true);
dots([at([CAM.x + 21, CAM_FACE, CAM_Z + 12])], 1.1, 'hi');
// The camera cable down the post to its connector block.
PARTS.push({
  kind: 'wire',
  from: at([CAM.x + 6, CAM_FACE, CAM_Z + 3]),
  via: [at([CAM.x + 6, CAM_FACE + 4, CAM_Z - 2]), at([JACK.x + 7, JACK.y + 5.5, 22])],
  to: at([JACK.x + 7, JACK.y + 5.5, 5]),
  tone: 'lo',
});

// ------------------------------------------------------ the pads and taxels
/** A fingertip pad, pressed in by `squeeze` (mm) when the grip rises. */
export function padAt(side: -1 | 1, squeeze = 0) {
  const t = PAD.t - squeeze;
  const plan: Plan = side > 0 ? { x: PAD_IN, y: -PAD.w / 2, w: t, d: PAD.w, r: 1.6 } : { x: -PAD_IN - t, y: -PAD.w / 2, w: t, d: PAD.w, r: 1.6 };
  return slab(plan, CONTACT_Z - PAD.h / 2, PAD.h, 3, 0.4);
}
/** The pad's taxel grid (4 across, 6 down) on its front face, as one path of circles in that face's plane. */
export const TAXEL_MATRIX = {
  far: sideMatrix([-PAD_IN - 8.4, PAD.w / 2], CONTACT_Z + PAD.h / 2, P, 'left'),
  near: sideMatrix([PAD_IN, PAD.w / 2], CONTACT_Z + PAD.h / 2, P, 'left'),
};
export const TAXELS = (() => {
  const list: string[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) list.push(circlePath(1.3 + i * 1.95, 3.2 + j * 3.9, 0.66));
  return list.join('');
})();
/** The rim of each pad's taxel grid: a closed frame around the 24 cells. */
export const TAXEL_FRAME = `M0.15 1.1H8.25V24.7H0.15Z`;

/** How the pads squeeze in when the grip rises from GRIP_HOLD_N to GRIP_REGRIP_N. */
export const squeezeFor = (grip: number) => (Math.max(0, grip - GRIP_HOLD_N) / (GRIP_REGRIP_N - GRIP_HOLD_N)) * 1.2;
