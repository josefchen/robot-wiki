/**
 * The field table for FlowMatchingTrajectory, drawn with the isometric kit.
 *
 * The object is the explanation. A plate on a bench is the action space: two
 * of a chunk's dimensions, one action unit to every `U` (52) world units. Two
 * turned pockets sit at the two good moves (each as wide as two spreads of
 * the moves around it), a pad marks the followed sample's random start, a
 * small seat its own good move, and a groove the path the learned field
 * carries it along, slightly bent. A gantry carries a stylus over the plate.
 * Before every hop a vane beside the stylus turns to the field where the
 * stylus stands (the velocity the Euler step reads) and stays standing, then
 * the stylus moves straight along it for one step's share of the trip. The
 * ink it leaves (the one lit part) is `integrateFlow` of the followed sample:
 * one hop follows its single vane straight past the bend and lands outside
 * the pocket, five or ten hops follow the turning vanes into it. The other drawn samples' paths are engraved faintly. A bead
 * counter in front slides one bead per hop, one pass of the model each, and
 * the knurled knob sets how many hops a move gets.
 *
 * World units: x and y on the floor, z up. Action x runs along -x and action
 * y along +y (see SX), so the content lies across the plate's long diagonal
 * and the carriage never stands between the reader and what it explains.
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
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { phoneFitOf } from '../phone-fit.ts';
import { barBetween, discAlong, plateIn } from '../prism.ts';
import {
  FLOW_MODES,
  MAX_STEPS,
  MIN_STEPS,
  MODE_SPREAD,
  generateFlowField,
  integrateFlow,
  transportPoint,
  transportVelocity,
  vectorFieldAt,
  type FlowSample,
  type Vec2,
} from '../../../lib/flow-matching.ts';

export const WIDTH = 640;
export const AZIMUTH = 60;
export const ELEVATION = 42;

/** World units per action unit, on both axes. */
export const U = 52;
/**
 * Action x runs along world -x (action y along +y): the two good moves then lie across the plate's long diagonal
 * on screen, and the carriage never stands between the reader and the followed sample's good move or its ink.
 */
export const SX = -1;

/** Tau at which the learned vector field is shown (mid-transport). */
export const FIELD_TAU = 0.5;
export const FIELD_COLS = 9;
export const FIELD_ROWS = 7;
/** The plate's window on the action space: tight round every drawn path, start, mark and both pockets. */
export const X_RANGE = { min: -2, max: 1.94 };
export const Y_RANGE = { min: -1.76, max: 1.76 };
/** Every fourth seeded sample is drawn: 12 of the 48. */
export const DRAW_EVERY = 4;
/** The followed sample: seeded sample 0, whose one-jump miss (1.08) is about twice the 48-sample mean. */
export const FOCUS = 0;

export const FIELD = generateFlowField();
export const DRAWN: readonly FlowSample[] = FIELD.samples.filter((_, i) => i % DRAW_EVERY === 0);
export const FOCUS_SAMPLE: FlowSample = FIELD.samples[FOCUS]!;
export const ARROWS = vectorFieldAt(FIELD, FIELD_TAU, FIELD_COLS, FIELD_ROWS, X_RANGE, Y_RANGE);
/** A pocket's radius in action units: two spreads of the good moves around its centre. */
export const POCKET_R = 2 * MODE_SPREAD;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; name: SlotName };
export type SlotName = 'pockets' | 'engraved' | 'ghost' | 'ink' | 'outcome' | 'readings' | 'needles' | 'gantry' | 'beads' | 'lever' | 'pointer';

// ---------------------------------------------------------------- layout
/** The plate: the action-space window and a rim of PLATE_RIM world units round it. */
const PLATE_RIM = 6;
/** The window in world x: action x is mirrored onto the plate. */
const WORLD_X = { min: Math.min(SX * X_RANGE.min, SX * X_RANGE.max) * U, max: Math.max(SX * X_RANGE.min, SX * X_RANGE.max) * U };
const PLATE: Plan = {
  x: WORLD_X.min - PLATE_RIM,
  y: Y_RANGE.min * U - PLATE_RIM,
  w: (X_RANGE.max - X_RANGE.min) * U + 2 * PLATE_RIM,
  d: (Y_RANGE.max - Y_RANGE.min) * U + 2 * PLATE_RIM,
  r: 6,
};
const BASE_H = 8;
const FOOT_H = 5;
/** The plate's top: everything the stylus draws lies on it. */
export const TOP = 6;
const RAIL_Y = PLATE.y + PLATE.d + 9;
const RAIL_X0 = PLATE.x - 6;
const RAIL_X1 = PLATE.x + PLATE.w;
const RAIL_H = 9;
/** How far the stylus reaches ahead of the carriage's centre line, along +x. */
export const ARM = 18;
const TRUCK_Z = 6;
const TRUCK_TOP = 30;
/** The two guide rods the carriage runs on, across the plate between the trucks. */
const GUIDE_Z = 24;
const GUIDE_DX = 4.6;
const GUIDE_R = 1.5;
const CARRIAGE_Z = 18.5;
const CARRIAGE_TOP = 29.5;
const HOLDER_TOP = 28.5;
/** The ruler under the near rail: a tick every quarter action unit the stylus can reach, read at the near truck. */
const TICK_Q0 = Math.max(Math.ceil((4 * WORLD_X.min) / U), Math.ceil(((RAIL_X0 + 4 + ARM) / U) * 4));
const TICK_Q1 = Math.floor((4 * WORLD_X.max) / U);
const RULER: Plan = { x: RAIL_X0 + 2, y: RAIL_Y + 8, w: (TICK_Q1 / 4) * U - ARM + 4 - (RAIL_X0 + 2), d: 7, r: 1 };
const RULER_H = 1.2;
const COUNTER: Plan = { x: -8, y: RAIL_Y + 19, w: 100, d: 29, r: 3 };
const COUNTER_H = 10;
const LABEL: Plan = { x: RAIL_X0 - 2, y: RAIL_Y + 28, w: 64, d: 15, r: 2 };
/** The step knob and its dial. */
export const KNOB: Point3 = [-34, RAIL_Y + 34, 2];
/** The knob's top above the dial boss. */
const KNOB_H = 9;
/** The drive block at the near rail's +x end, with the motor standing on it. */
const DRIVE: Plan = { x: RAIL_X1 + 2, y: RAIL_Y - 9, w: 20, d: 18, r: 2.4 };
const DRIVE_H = 13;
/** The bench under it all: rails, plate, ruler, counter and drive, with a margin. */
const BASE: Plan = {
  x: RAIL_X0 - 14,
  y: -RAIL_Y - 14,
  w: DRIVE.x + DRIVE.w + 14 - (RAIL_X0 - 14),
  d: COUNTER.y + COUNTER.d + 5 - (-RAIL_Y - 14),
  r: 10,
};

// The bead counter: five rods of ten beads, one bead a hop, MAX_STEPS beads in all.
export const RODS = 5;
export const PER_ROD = MAX_STEPS / RODS;
const ROD_X0 = COUNTER.x + 13;
const ROD_X1 = COUNTER.x + COUNTER.w - 11;
const ROD_Z = COUNTER_H + 3.2;
const ROD_YS = Array.from({ length: RODS }, (_, rod) => COUNTER.y + 5 + rod * 4.8);
const BEAD_R = 2.2;
const BEAD_W = 2.6;
const BEAD_PITCH = 3;
/** How far a bead slides from the waiting stack to the spent stack. */
export const BEAD_TRAVEL = ROD_X1 - ROD_X0 - BEAD_PITCH * PER_ROD - 0.2;

// ---------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
// The gantry at the ends of the stylus's travel: every hop point of the followed sample, at every step count.
const travel = Array.from({ length: MAX_STEPS }, (_, k) => integrateFlow(FOCUS_SAMPLE, k + 1)).flat();
const travelX = travel.map((p) => SX * p.x * U);
const reach = { x0: Math.min(...travelX), x1: Math.max(...travelX), y0: Math.min(...travel.map((p) => p.y)) * U };
for (const xb of [reach.x0 - ARM, reach.x1 - ARM]) for (const y of [-RAIL_Y - 8, RAIL_Y + 8]) extremes.push([xb - 11, y, TRUCK_TOP], [xb + 11, y, TRUCK_TOP]);
extremes.push([reach.x1, reach.y0, HOLDER_TOP + 1.2], [reach.x0, reach.y0, HOLDER_TOP + 1.2]);
const FIT_PAD = 14;
/**
 * The side pad: room each side of the machine in the desktop viewBox. On a phone the stage shows only the
 * machine's own window (PHONE_FIT), so the pad costs no width there.
 */
const SIDE_PAD = 51;
/** The drawing's height, fitted tightly to the machine at the full width. */
export const HEIGHT = (() => {
  const flat = extremes.map((point) => iso(point, { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION }));
  const span = (axis: 0 | 1) => Math.max(...flat.map((f) => f[axis])) - Math.min(...flat.map((f) => f[axis]));
  return Math.ceil(((WIDTH - 2 * SIDE_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
})();
export const P = (() => {
  const fit = fitProjection(extremes, WIDTH - 2 * (SIDE_PAD - FIT_PAD), HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
  return { ...fit, origin: [fit.origin[0] + SIDE_PAD - FIT_PAD, fit.origin[1]] as Flat };
})();
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: FIT_PAD });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const seam = (plan: Plan, z: number, steps = 4) => `<path class="iso-line" data-tone="faint" d="${sideSeam(plan, z, P, steps)}"/>`;
const arcSeam = (cx: number, cy: number, r: number, zs: number[], steps = 24) =>
  `<path class="iso-line" data-tone="faint" d="${zs.map((z) => sideArc(cx, cy, r, z, P, steps)).join('')}"/>`;

// ---------------------------------------------------------------- model glue
/** A point of the action space on the plate, in world x and y. */
export const toWorld = (v: Vec2): [number, number] => [SX * v.x * U, v.y * U];
/** A point of the action space on the plate's top, on screen. */
export const onPlate = (v: Vec2): Flat => at([SX * v.x * U, v.y * U, TOP]);

/** The stylus's hops for a step count: the forward-Euler polyline of the followed sample. */
export const hopsOf = (steps: number): Vec2[] => integrateFlow(FOCUS_SAMPLE, steps);
/** The step count the model integrates with (it clamps the same way). */
export const clampSteps = (steps: number) => Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.round(steps)));

/** Where the followed sample's single jump lands. */
export const JUMP_END: Vec2 = integrateFlow(FOCUS_SAMPLE, 1)[1]!;
/** The centre of the followed sample's pocket: its mode. */
export const FOCUS_MODE: Vec2 = FLOW_MODES[FOCUS_SAMPLE.mode]!;

/** True when a landing point lies inside the followed sample's pocket. */
export const inPocket = (point: Vec2) => Math.hypot(point.x - FOCUS_MODE.x, point.y - FOCUS_MODE.y) < POCKET_R;

/** The direction the field carries the followed sample at hop `hop` of `steps`, as a world angle on the plate. */
export function readingAngle(steps: number, hop: number): number {
  const k = clampSteps(steps);
  const v = transportVelocity(FOCUS_SAMPLE, Math.min(k - 1, Math.max(0, hop)) / k);
  return Math.atan2(v.y, SX * v.x);
}

/** The ink after `progress` hops (fractional: part way along the next hop), on the plate's top. */
export function inkPath(points: readonly Vec2[], progress: number): string {
  const hops = points.length - 1;
  const p = Math.min(hops, Math.max(0, progress));
  const whole = Math.floor(p);
  const flat = points.slice(0, whole + 1).map(onPlate);
  if (p > whole) flat.push(onPlate(stylusPoint(points, p)));
  return flat.length > 1 ? pathOf(flat) : '';
}

/** The stylus's point in the action space after `progress` hops. */
export function stylusPoint(points: readonly Vec2[], progress: number): Vec2 {
  const hops = points.length - 1;
  const p = Math.min(hops, Math.max(0, progress));
  const whole = Math.min(hops - 1, Math.floor(p));
  const t = p - whole;
  const a = points[whole]!;
  const b = points[whole + 1] ?? a;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** An engraved or inked path through action-space points, on the plate's top. */
export const plateLine = (points: readonly Vec2[]) => pathOf(points.map(onPlate));

/** How deep the pockets are cut into the plate. */
const POCKET_DEPTH = 1.6;
/**
 * The far inner wall of a round recess cut `depth` into the plate's top: the band between the rim and the floor
 * edge over the half of the circle whose wall faces the viewer, as one closed shape (it has no loose ends).
 */
function recessWall(cx: number, cy: number, r: number, depth: number): string {
  const [vx, vy] = [Math.cos((AZIMUTH * Math.PI) / 180), Math.sin((AZIMUTH * Math.PI) / 180)];
  const facing = Math.atan2(-vy, -vx);
  const rim: Flat[] = [];
  const floor: Flat[] = [];
  for (let k = 0; k <= 48; k++) {
    const a = facing - Math.PI / 2 + (k / 48) * Math.PI;
    rim.push(at([cx + r * Math.cos(a), cy + r * Math.sin(a), TOP]));
    floor.push(at([cx + r * Math.cos(a), cy + r * Math.sin(a), TOP - depth]));
  }
  return pathOf([...rim, ...floor.reverse()], true);
}

/** The two pockets at the two good moves: shallow turned recesses, their far inner wall in shade, a chamfer ring on the floor. */
export const POCKETS = FLOW_MODES.map((mode) => {
  const [cx, cy] = toWorld(mode);
  return {
    wall: recessWall(cx, cy, POCKET_R * U, POCKET_DEPTH),
    rim: ring(cx, cy, POCKET_R * U, TOP, P, 96),
    floor: ring(cx, cy, POCKET_R * U - 2.4, TOP - POCKET_DEPTH, P, 96),
  };
});

/** The radius of the ring engraved round another drawn sample's start, in world units. */
const START_RING = 1.5;
/** Another drawn sample's engraved path: it leaves its start ring at the rim. */
export function engravedLine(points: readonly Vec2[]): string {
  const centre = points[0]!;
  // The first vertex at or past the rim, and the point on that segment where the path crosses the rim.
  const out = points.findIndex((p) => Math.hypot(p.x - centre.x, p.y - centre.y) * U >= START_RING);
  if (out < 1) return plateLine(points);
  const a = points[out - 1]!;
  const b = points[out]!;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 30; k++) {
    const t = (lo + hi) / 2;
    const r = Math.hypot(a.x + (b.x - a.x) * t - centre.x, a.y + (b.y - a.y) * t - centre.y) * U;
    if (r < START_RING) lo = t;
    else hi = t;
  }
  const rim = { x: a.x + (b.x - a.x) * hi, y: a.y + (b.y - a.y) * hi };
  return plateLine([rim, ...points.slice(out)]);
}

/** The learned path the field carries the followed sample along: its transport curve, sampled finely. */
export const LEARNED: readonly Vec2[] = Array.from({ length: 65 }, (_, k) => transportPoint(FOCUS_SAMPLE, k / 64));
/** The groove cut along the learned path: a closed slot GROOVE_HW wide either side, with round ends. */
const GROOVE_HW = 1.5;
export const GROOVE = (() => {
  const pts = LEARNED.map(toWorld);
  const normal = (i: number): [number, number] => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  const side = (sign: number) => pts.map(([x, y], i) => [x + sign * GROOVE_HW * normal(i)[0], y + sign * GROOVE_HW * normal(i)[1]] as [number, number]);
  const cap = (i: number, from: number) => {
    const [cx, cy] = pts[i]!;
    const [nx, ny] = normal(i);
    const a0 = Math.atan2(ny, nx);
    return Array.from({ length: 9 }, (_, k) => {
      const a = a0 + from + (k / 8) * Math.PI;
      return [cx + GROOVE_HW * Math.cos(a), cy + GROOVE_HW * Math.sin(a)] as [number, number];
    }).slice(1, 8);
  };
  const left = side(1);
  const right = side(-1).reverse();
  return onTop([...left, ...cap(pts.length - 1, 0).reverse().map((p) => p), ...right, ...cap(0, Math.PI).reverse()], TOP, P, true);
})();

/** A small engraved ring round another drawn sample's random start. */
export function startRing(point: Vec2): string {
  const [cx, cy] = toWorld(point);
  return ring(cx, cy, START_RING, TOP, P, 16);
}

/** A small cross in a ring on the plate at a missed landing (an outcome mark). */
export function missMark(point: Vec2): string {
  const [cx, cy] = toWorld(point);
  const h = 2.2;
  return ring(cx, cy, h * Math.SQRT2, TOP, P, 24) + onTop([[cx - h, cy - h], [cx + h, cy + h]], TOP, P) + onTop([[cx - h, cy + h], [cx + h, cy - h]], TOP, P);
}

/** A small ring round a landing in the pocket (an outcome mark). */
export function landedMark(point: Vec2): string {
  const [cx, cy] = toWorld(point);
  return ring(cx, cy, 3.4, TOP, P, 28);
}

/** The gantry's screen offset: the bridge (built at x = 0) moved so the stylus stands at `point`. */
export const bridgeAt = (point: Vec2) => translateAlong(P, [SX * point.x * U - ARM, 0, 0]);
/** The carriage's screen offset along the bridge (built at y = 0). */
export const carriageAt = (point: Vec2) => translateAlong(P, [0, point.y * U, 0]);

/** A flat kite needle at a point of the plate, pointing along `angle`; `length` in world units. */
function kite(cx: number, cy: number, z: number, angle: number, length: number, half: number, thick: number): SolidPaths {
  const u: Point3 = [Math.cos(angle), Math.sin(angle), 0];
  const v: Point3 = [-Math.sin(angle), Math.cos(angle), 0];
  return plateIn([cx, cy, z], u, v, [[0.68 * length, 0], [0, half], [-0.32 * length, 0], [0, -half]], thick, P);
}

/**
 * The vanes the stylus reads, one beside the start of every hop: a post on the plate and a blade turned to the
 * direction the field gives there at that moment of the trip (the velocity the Euler step uses). They stand on
 * the outside of the bend, READING_OFFSET from the ink, so the blades never cover it.
 */
const READING_OFFSET = 5;
const READING_POST_H = 3;
const OUTSIDE = (() => {
  const { noise, control, target } = FOCUS_SAMPLE;
  // Mirroring action x onto the plate flips which hand is the outside of the bend.
  return SX * Math.sign((target.x - noise.x) * (control.y - noise.y) - (target.y - noise.y) * (control.x - noise.x)) || 1;
})();
export type Reading = { at: [number, number]; post: SolidPaths; pivot: Flat; angle: number; length: number };
export function readingsOf(steps: number): Reading[] {
  const points = hopsOf(steps);
  const k = points.length - 1;
  return Array.from({ length: k }, (_, hop) => {
    const angle = readingAngle(k, hop);
    const [px, py] = toWorld(points[hop]!);
    const at: [number, number] = [px - OUTSIDE * Math.sin(angle) * READING_OFFSET, py + OUTSIDE * Math.cos(angle) * READING_OFFSET];
    const hopLength = Math.hypot(points[hop + 1]!.x - points[hop]!.x, points[hop + 1]!.y - points[hop]!.y) * U;
    return {
      at,
      post: cyl(at[0], at[1], 0.75, TOP, READING_POST_H, 14),
      pivot: iso([at[0], at[1], TOP + READING_POST_H + 0.8], P),
      angle,
      length: Math.max(3, Math.min(11, 0.8 * hopLength)),
    };
  });
}
/** A reading vane's blade, turned to `angle`. */
export const bladeAt = (reading: Reading, angle: number) => kite(reading.at[0], reading.at[1], TOP + READING_POST_H, angle, reading.length, 1.9, 0.8);

/** The step knob's pointer, from one step to MAX_STEPS over three quarters of a turn. */
export const knobAngle = (steps: number) => -0.75 * Math.PI + ((clampSteps(steps) - MIN_STEPS) / (MAX_STEPS - MIN_STEPS)) * 1.5 * Math.PI;
export function knobPointer(steps: number): string {
  const angle = knobAngle(steps);
  const [cx, cy, z] = KNOB;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([cx, cy], [cx + sx * 5.6, cy + sy * 5.6], z + KNOB_H, P);
}

/** The push lever on the counter's end, `press` 0 at rest to 1 fully pressed. */
const LEVER_PIVOT: Point3 = [COUNTER.x + COUNTER.w + 1.6, COUNTER.y + 22, 6];
export function leverAt(press: number): { bar: SolidPaths; ball: SolidPaths } {
  const angle = ((38 - 16 * Math.min(1, Math.max(0, press))) * Math.PI) / 180;
  const [px, py, pz] = LEVER_PIVOT;
  const end: Point3 = [px + 0.8, py - 15 * Math.cos(angle), pz + 15 * Math.sin(angle)];
  return {
    bar: barBetween([px + 0.8, py, pz], end, [0, 0, 1], 2.4, 1.6, P, 0.3),
    ball: discAlong([px - 0.8, end[1], end[2]], [1, 0, 0], 2.4, 3.2, P, 20, 0.3),
  };
}

/** Bead `index` (0 to MAX_STEPS - 1): its rod, and its centre's x in the waiting stack. */
export function beadHome(index: number): { rod: number; x: number; y: number } {
  const rod = Math.floor(index / PER_ROD);
  const slot = index % PER_ROD;
  return { rod, x: ROD_X1 - 0.1 - BEAD_PITCH / 2 - (PER_ROD - 1 - slot) * BEAD_PITCH, y: ROD_YS[rod]! };
}
/** A bead's screen offset: 0 waiting, 1 slid to the spent stack. */
export const beadAt = (slid: number) => translateAlong(P, [-BEAD_TRAVEL * slid, 0, 0]);

// ---------------------------------------------------------------- part helpers
const solidOf = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<{ lit: boolean; crease: Tone | 'none'; inner: string }> = {}): Part => ({ kind: 'solid', paths, tone, ...extra });
const lineOf = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end'): Part => ({ kind: 'line', d, tone, free });
const dotsOf = (points: Flat[], size = 0.5, tone?: Tone): Part => ({ kind: 'dots', points, size, tone });
const screwsAt = (points: Array<[number, number]>, z: number, r = 2.2, size = 0.5): Part[] => [
  lineOf(points.map(([x, y]) => ring(x, y, r, z, P, 16)).join(''), 'lo'),
  dotsOf(points.map(([x, y]) => at([x, y, z])), size),
];
const cornersOf = (plan: Plan, inset: number): Array<[number, number]> => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];

// ---------------------------------------------------------------- the bench, back to front
const bench: Part[] = [];
for (const [x, y] of byDepth(cornersOf(BASE, 20))) {
  bench.push(solidOf(cyl(x, y, 9, -BASE_H - FOOT_H, 1.6, 32), 'lo'));
  bench.push(solidOf(cyl(x, y, 7, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 32), 'mid', { inner: arcSeam(x, y, 7, [-BASE_H - 1.6]) }));
}
bench.push(solidOf(slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: seam(BASE, -BASE_H + 3, 8) }));
bench.push(lineOf(planOutline(insetPlan(BASE, 5), 0, P), 'faint'));
bench.push(...screwsAt(cornersOf(BASE, 11), 0, 2.4, 0.55));

// The far rail, with an end stop at each end.
const stopPlan = (x: number, y: number): Plan => ({ x: x - 3, y: y - 8, w: 6, d: 16, r: 1.2 });
const railPlan = (y: number): Plan => ({ x: RAIL_X0, y: y - 5, w: RAIL_X1 - RAIL_X0, d: 10, r: 2 });
const railParts = (y: number): Part[] => [
  solidOf(slab(railPlan(y), 0, RAIL_H, 3, 0.6), 'mid', { inner: seam(railPlan(y), 3, 3) }),
  lineOf(onTop([[RAIL_X0, y - 2], [RAIL_X1, y - 2]], RAIL_H, P), 'faint'),
];
const stopParts = (x: number, y: number): Part[] => [
  solidOf(slab(stopPlan(x, y), 0, 15, 3, 0.5), 'mid'),
  dotsOf([at([x, y - 4.5, 15]), at([x, y + 4.5, 15])], 0.45),
];
bench.push(...stopParts(RAIL_X0 - 3, -RAIL_Y));
bench.push(...railParts(-RAIL_Y));
bench.push(...stopParts(RAIL_X1 + 3, -RAIL_Y));

// The plate: the action space. An inset rule, the two zero lines, corner screws and a socket for every field needle.
bench.push(solidOf(slab(PLATE, 0, TOP, 6, 1.2), 'mid', { inner: seam(PLATE, 2.2, 6) }));
bench.push(lineOf(planOutline(insetPlan(PLATE, 4.5), TOP, P), 'faint'));
{
  const g = insetPlan(PLATE, 4.5);
  bench.push(lineOf(onTop([[0, g.y], [0, g.y + g.d]], TOP, P) + onTop([[g.x, 0], [g.x + g.w, 0]], TOP, P), 'faint'));
}
bench.push(...screwsAt(cornersOf(PLATE, 10), TOP));
bench.push({ kind: 'slot', name: 'pockets' });
// The followed sample's own good move: a small seat with a centre dot.
{
  const [cx, cy] = toWorld(FOCUS_SAMPLE.target);
  bench.push(lineOf(ring(cx, cy, 2.4, TOP, P, 24), 'mid'));
  bench.push(dotsOf([at([cx, cy, TOP])], 0.6, 'hi'));
}
// The groove: the path the learned field carries the followed sample along.
bench.push(lineOf(GROOVE, 'mid'));
bench.push({ kind: 'slot', name: 'engraved' });
bench.push({ kind: 'slot', name: 'ghost' });
// The start pad at the followed sample's random start.
{
  const [cx, cy] = toWorld(FOCUS_SAMPLE.noise);
  bench.push(solidOf(cyl(cx, cy, 4.2, TOP, 0.8, 32, 0.3), 'mid'));
}
bench.push({ kind: 'slot', name: 'ink' });
bench.push({ kind: 'slot', name: 'outcome' });
bench.push({ kind: 'slot', name: 'needles' });
bench.push({ kind: 'slot', name: 'readings' });

// The near rail with its belt, the idler block at -x, the drive block at +x, and the ruler that reads the stylus's x.
bench.push(...stopParts(RAIL_X0 - 3, RAIL_Y));
bench.push(...railParts(RAIL_Y));
bench.push(lineOf(onTop([[RAIL_X0, RAIL_Y + 2.6], [DRIVE.x, RAIL_Y + 2.6]], RAIL_H + 0.2, P), 'lo'));
{
  const cx = DRIVE.x + DRIVE.w / 2;
  bench.push(solidOf(slab(DRIVE, 0, DRIVE_H, 4, 0.6), 'mid', { inner: seam(DRIVE, 4.4, 4) }));
  bench.push(dotsOf(cornersOf(DRIVE, 2.6).map(([x, y]) => at([x, y, DRIVE_H])), 0.45));
  bench.push(solidOf(cyl(cx, RAIL_Y, 7.4, DRIVE_H, 14, 40, 0.5), 'hi', { inner: arcSeam(cx, RAIL_Y, 7.4, [DRIVE_H + 4, DRIVE_H + 10], 32) }));
  bench.push(solidOf(cyl(cx, RAIL_Y, 4.2, DRIVE_H + 14, 2.2, 28, 0.3), 'mid'));
  bench.push(dotsOf([at([cx, RAIL_Y, DRIVE_H + 16.2])], 0.55));
}
bench.push(solidOf(slab(RULER, 0, RULER_H, 3, 0.4), 'lo'));
{
  // A tick every quarter action unit, long on every whole unit, read by the index on the near truck.
  const minor: string[] = [];
  const major: string[] = [];
  for (let q = TICK_Q0; q <= TICK_Q1; q++) {
    const x = (q / 4) * U - ARM;
    const long = q % 4 === 0;
    (long ? major : minor).push(lineOnTop([x, RULER.y], [x, RULER.y + (long ? 4.6 : 2.6)], RULER_H, P));
  }
  bench.push(lineOf(minor.join(''), 'lo'));
  bench.push(lineOf(major.join(''), 'mid'));
  bench.push(lineOf(lineOnTop([-ARM, RULER.y], [-ARM, RULER.y + RULER.d], RULER_H, P), 'hi'));
  bench.push(dotsOf([at([RULER.x + 3, RULER.y + 4.6, RULER_H]), at([RULER.x + RULER.w - 3, RULER.y + 4.6, RULER_H])], 0.45));
}
bench.push({ kind: 'slot', name: 'gantry' });

// ---------------------------------------------------------------- the gantry, built with the stylus at x = ARM, y = 0
/** A truck riding a rail, carrying the guide rods' ends: moves along x. */
const truckParts = (y: number): Part[] => {
  const truck: Plan = { x: -11, y: y - 8, w: 22, d: 16, r: 3 };
  return [
    solidOf(slab(truck, TRUCK_Z, TRUCK_TOP - TRUCK_Z, 4, 0.6), 'mid', { inner: seam(truck, TRUCK_Z + 4.4, 4) }),
    dotsOf([at([-7, y - 4, TRUCK_TOP]), at([7, y - 4, TRUCK_TOP]), at([-7, y + 4, TRUCK_TOP]), at([7, y + 4, TRUCK_TOP])], 0.45),
  ];
};
const farTruck: Part[] = truckParts(-RAIL_Y);
const nearTruck: Part[] = truckParts(RAIL_Y);
// The index tab on the near truck, over the ruler, and the belt clamp.
{
  const tab: Plan = { x: -2.4, y: RAIL_Y + 8, w: 4.8, d: 4.4, r: 0.8 };
  nearTruck.push(solidOf(slab(tab, 2.2, 7, 2, 0.3), 'lo'));
  nearTruck.push(lineOf(lineOnTop([0, tab.y], [0, tab.y + tab.d], 9.2, P), 'hi'));
  nearTruck.push(solidOf(slab({ x: -5, y: RAIL_Y + 8, w: 10, d: 2.4, r: 0.6 }, 12, 4, 2, 0.3), 'lo'));
}
/** The guide rods' ends on the trucks' inner faces. */
const GUIDE_FAR = -RAIL_Y + 8;
const GUIDE_NEAR = RAIL_Y - 8;
const CARRIAGE_HALF = 9;
const COLLAR_W = 1.2;
/** The two guide rods for a carriage at `ys`, cut at the carriage: the far pieces go before it, the near pieces after. */
export function guidesAt(ys: number): { far: SolidPaths[]; near: SolidPaths[] } {
  const y0 = ys - CARRIAGE_HALF;
  const y1 = ys + CARRIAGE_HALF + COLLAR_W;
  return {
    far: [-GUIDE_DX, GUIDE_DX].map((x) => discAlong([x, GUIDE_FAR, GUIDE_Z], [0, 1, 0], GUIDE_R, y0 - GUIDE_FAR, P, 14)),
    near: [-GUIDE_DX, GUIDE_DX].map((x) => discAlong([x, y1, GUIDE_Z], [0, 1, 0], GUIDE_R, GUIDE_NEAR - y1, P, 14)),
  };
}
/** The carriage on the guide rods, its arm, the stylus and its needle's pin: move along x with the trucks and along y on the rods. */
const carriage: Part[] = [];
{
  const block: Plan = { x: -8, y: -CARRIAGE_HALF, w: 16, d: CARRIAGE_HALF * 2, r: 2 };
  carriage.push(solidOf(slab(block, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, 4, 0.6), 'mid', { inner: seam(block, CARRIAGE_Z + 2.4, 4) }));
  carriage.push(dotsOf(cornersOf(block, 2.4).map(([x, y]) => at([x, y, CARRIAGE_TOP])), 0.45));
  // The bushing collars where the rods leave the carriage's near face.
  for (const x of [-GUIDE_DX, GUIDE_DX]) carriage.push(solidOf(discAlong([x, CARRIAGE_HALF, GUIDE_Z], [0, 1, 0], GUIDE_R + 1.1, COLLAR_W, P, 24, 0.2), 'lo'));
  // The clamp screw on top.
  carriage.push(solidOf(cyl(-2.5, 0, 2.3, CARRIAGE_TOP, 2.6, 18, 0.3), 'hi'));
  carriage.push(lineOf(knurl(-2.5, 0, 2.3, CARRIAGE_TOP, CARRIAGE_TOP + 2.6, 12, P), 'lo'));
  // The arm out to the stylus holder.
  const arm: Plan = { x: 8, y: -3, w: ARM - 8 + 1, d: 6, r: 1 };
  carriage.push(solidOf(slab(arm, 22, 3.6, 3, 0.4), 'mid'));
  carriage.push(dotsOf([at([10.5, 0, 25.6])], 0.45));
  // The stylus: tip, barrel, collar and holder, standing on the plate.
  carriage.push(solidOf(cyl(ARM, 0, 0.8, TOP, 2.8, 16), 'hi'));
  carriage.push(solidOf(cyl(ARM, 0, 1.6, TOP + 2.8, 16 - TOP - 2.8, 20), 'hi', { inner: arcSeam(ARM, 0, 1.6, [12], 16) }));
  carriage.push(solidOf(cyl(ARM, 0, 2.4, 16, 2, 24), 'mid'));
  carriage.push(solidOf(cyl(ARM, 0, 3.4, 18, HOLDER_TOP - 18, 28, 0.4), 'mid', { inner: arcSeam(ARM, 0, 3.4, [20.4], 24) }));
  carriage.push(solidOf(cyl(ARM, 0, 2.2, HOLDER_TOP, 1.2, 20, 0.3), 'hi'));
  carriage.push(dotsOf([at([ARM, 0, HOLDER_TOP + 1.2])], 0.55));
}

// ---------------------------------------------------------------- front: the counter, the knob, the drive motor, the label
const front: Part[] = [];
// The label plate at the near left corner, with three engraved rules.
front.push(solidOf(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' }));
front.push(lineOf(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint'));
front.push(
  lineOf(
    [0, 1, 2].map((row) => onTop([[LABEL.x + 9, LABEL.y + 5 + row * 4], [LABEL.x + (row === 1 ? 46 : 66), LABEL.y + 5 + row * 4]], 0.8, P)).join(''),
    'lo',
    true,
  ),
);
front.push(dotsOf([at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], 0.5));
// The step knob: a dial boss with a tick every five steps (long every ten), the knob, its knurl and its pointer.
{
  const [cx, cy, z] = KNOB;
  front.push(solidOf(cyl(cx, cy, 12, 0, z, 48, 0.5), 'lo'));
  const span = 1.5 * Math.PI;
  const minor: string[] = [];
  const major: string[] = [];
  for (let s = 0; s <= MAX_STEPS; s += 5) {
    const steps = Math.max(MIN_STEPS, s);
    const angle = -0.75 * Math.PI + ((steps - MIN_STEPS) / (MAX_STEPS - MIN_STEPS)) * span;
    const long = s % 10 === 0;
    const inner = 11.6 - (long ? 3 : 1.8);
    (long ? major : minor).push(lineOnTop([cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner], [cx + Math.sin(angle) * 11.6, cy - Math.cos(angle) * 11.6], z, P));
  }
  front.push(lineOf(ring(cx, cy, 11.6, z, P, 48), 'faint'));
  front.push(lineOf(minor.join(''), 'lo'));
  front.push(lineOf(major.join(''), 'mid'));
  front.push(solidOf(cyl(cx, cy, 6.8, z, 1.6, 32), 'mid'));
  front.push(solidOf(cyl(cx, cy, 5.8, z + 1.6, KNOB_H - 1.6, 32, 0.4), 'hi'));
  front.push(lineOf(knurl(cx, cy, 5.8, z + 1.6, z + KNOB_H, 24, P), 'lo'));
  front.push({ kind: 'slot', name: 'pointer' });
  front.push(dotsOf([at([cx, cy, z + KNOB_H])], 0.75, 'hi'));
}
// The counter: a body with a lid seam and a frame round its top, two end blocks carrying five rods of beads.
front.push(solidOf(slab(COUNTER, 0, COUNTER_H, 4, 0.8), 'mid', { inner: seam(COUNTER, 3.4, 4) }));
front.push(lineOf(planOutline(insetPlan(COUNTER, 2.6), COUNTER_H, P), 'faint'));
front.push(dotsOf(cornersOf(COUNTER, 4.2).map(([x, y]) => at([x, y, COUNTER_H])), 0.5));
{
  const left: Plan = { x: ROD_X0 - 5, y: COUNTER.y + 3, w: 5, d: COUNTER.d - 6, r: 1 };
  front.push(solidOf(slab(left, COUNTER_H, 7, 3, 0.4), 'mid'));
  front.push(dotsOf([at([ROD_X0 - 2.5, COUNTER.y + 6, COUNTER_H + 7]), at([ROD_X0 - 2.5, COUNTER.y + COUNTER.d - 6, COUNTER_H + 7])], 0.45));
}
front.push({ kind: 'slot', name: 'beads' });
{
  const right: Plan = { x: ROD_X1, y: COUNTER.y + 3, w: 5, d: COUNTER.d - 6, r: 1 };
  front.push(solidOf(slab(right, COUNTER_H, 7, 3, 0.4), 'mid'));
  front.push(dotsOf([at([ROD_X1 + 2.5, COUNTER.y + 6, COUNTER_H + 7]), at([ROD_X1 + 2.5, COUNTER.y + COUNTER.d - 6, COUNTER_H + 7])], 0.45));
}
// The push lever's pivot boss on the counter's end, then the lever.
front.push(solidOf(discAlong([COUNTER.x + COUNTER.w, LEVER_PIVOT[1], LEVER_PIVOT[2]], [1, 0, 0], 2.8, 1.6, P, 24, 0.3), 'mid'));
front.push({ kind: 'slot', name: 'lever' });
// The cable from the counter to the drive block: each counted pass steps the drive.
front.push({
  kind: 'wire',
  from: at([COUNTER.x + COUNTER.w, COUNTER.y + 5, 3]),
  via: [at([DRIVE.x + 6, COUNTER.y + 5, 0.4])],
  to: at([DRIVE.x + 6, DRIVE.y + DRIVE.d, 3]),
  tone: 'lo',
});

/** A field needle (shown with the learned field) on its socket: a pin, the needle turned to the field, a pivot dot. */
export type Needle = { pin: SolidPaths; needle: SolidPaths; pivot: Flat; depth: number };
const MAX_FIELD = Math.max(...ARROWS.map((arrow) => Math.hypot(arrow.vx, arrow.vy)), 1e-6);
export const NEEDLES: readonly Needle[] = ARROWS.map((arrow) => {
  const [cx, cy] = toWorld(arrow);
  const magnitude = Math.hypot(arrow.vx, arrow.vy);
  const angle = Math.atan2(arrow.vy, SX * arrow.vx);
  return {
    pin: cyl(cx, cy, 0.75, TOP, READING_POST_H, 14),
    needle: kite(cx, cy, TOP + READING_POST_H, angle, 5 + 6 * (magnitude / MAX_FIELD), 1.7, 0.8),
    pivot: at([cx, cy, TOP + READING_POST_H + 0.8]),
    depth: depthOf([cx, cy, 0], P),
  };
}).sort((a, b) => a.depth - b.depth);

/** A bead of the counter, built in the waiting stack. */
export type Bead = { index: number; paths: SolidPaths };
export const BEADS: readonly Bead[] = Array.from({ length: MAX_STEPS }, (_, index) => {
  const { x, y } = beadHome(index);
  return { index, paths: discAlong([x - BEAD_W / 2, y, ROD_Z], [1, 0, 0], BEAD_R, BEAD_W, P, 20, 0.2) };
});
/** The five rods, far to near, each drawn before its beads. */
export const ROD_PATHS: readonly SolidPaths[] = ROD_YS.map((y) => discAlong([ROD_X0, y, ROD_Z], [1, 0, 0], 0.55, ROD_X1 - ROD_X0, P, 12));

export const BENCH_PARTS: readonly Part[] = bench;
export const FAR_TRUCK_PARTS: readonly Part[] = farTruck;
export const NEAR_TRUCK_PARTS: readonly Part[] = nearTruck;
export const CARRIAGE_PARTS: readonly Part[] = carriage;
export const FRONT_PARTS: readonly Part[] = front;
/** The static solids drawn (the live ones are the four guide-rod pieces, the stylus's needle, the lever and ball, five rods and fifty beads). */
export const SOLID_COUNT = [bench, farTruck, nearTruck, carriage, front].flat().filter((part) => part.kind === 'solid').length;
