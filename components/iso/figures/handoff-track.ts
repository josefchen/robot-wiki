/**
 * The hand-off test track for ExecutionModes, drawn with the isometric kit.
 *
 * The object is the explanation. Three trolleys run side by side on three
 * lanes, each commanded by the same plan. At the gate a new plan arrives
 * late, and each lane hands it over its own way: the back trolley pauses
 * (slows to rest, waits out the delay, starts again), the middle one
 * lurches (switches to the new speed in one tick) and the front one blends
 * (keeps the moves already under way, then eases over). Each trolley
 * carries a pendulum gauge on a quadrant plate: the bob (the one lit set)
 * swings with the speed step of each tick, a drag pointer keeps the
 * largest swing, and two long ticks mark the 0.30 limit. The still pose is
 * the end of the run: the pausing trolley sits behind, the lurching one's
 * drag pointer stands past the limit, the blending one's stays inside it.
 *
 * World units: the trolleys run toward +x, the lanes are apart in y, z is
 * up. A trolley's travel is its commanded speed summed tick by tick,
 * scaled so the longest run fills the lane. The gauge face is the plate's
 * near (+y) face; angles are measured from straight down, a speed step of
 * 1 per tick swinging the bob 40 degrees.
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
  radialTicks,
  ring,
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
import {
  HANDOFF_TICK,
  JERK_LIMIT,
  MAX_DELAY_MS,
  TRACE_TICKS,
  executedTrace,
  type ExecutionMode,
  type TracePoint,
} from '../../../lib/execution-modes.ts';

export const WIDTH = 640;
export const AZIMUTH = 60;
export const ELEVATION = 32;

/** Lanes back to front, the order a reader meets them in the hint. */
export const LANES: readonly ExecutionMode[] = ['synchronous', 'naive', 'rtc'];
export const LANE_Y: Record<ExecutionMode, number> = { synchronous: -62, naive: 0, rtc: 62 };

/** Degrees of bob swing per unit of speed step in one tick. */
export const DEG_PER_STEP = 40;
/** The scale's reach, in speed steps per tick. */
export const SCALE_MAX = 1.2;
/** The trolleys' first position. */
export const X_START = -150;
/** The longest run (the lurching trolley at the top delay) spans this much lane. */
export const RUN_SPAN = 296;

export type Group = 'static' | `trolley-${ExecutionMode}`;

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; group: Group; name: 'gauge' | 'knob' | 'wheels'; mode?: ExecutionMode };

// ---------------------------------------------------------------- model glue
/** Speed summed tick by tick up to a fractional tick: the trolley's travel in speed-ticks. */
export function travelAt(trace: readonly TracePoint[], tick: number): number {
  const t = Math.min(TRACE_TICKS - 1, Math.max(0, tick));
  let sum = 0;
  const whole = Math.floor(t);
  for (let i = 0; i < whole; i++) sum += trace[i].v;
  return sum + trace[Math.min(TRACE_TICKS - 1, whole)].v * (t - whole);
}

/** World units of travel per speed-tick: the longest run fills RUN_SPAN. */
export const TRAVEL_SCALE = RUN_SPAN / travelAt(executedTrace('naive', MAX_DELAY_MS), TRACE_TICKS - 1);

/** The trolley's x at a fractional tick. */
export const trolleyX = (trace: readonly TracePoint[], tick: number) => X_START + travelAt(trace, tick) * TRAVEL_SCALE;

/** The speed step the trolley takes in the tick it is in: the change from the tick before. */
export function stepAt(trace: readonly TracePoint[], tick: number): number {
  const i = Math.min(TRACE_TICKS - 1, Math.max(1, Math.floor(tick)));
  return trace[i].v - trace[i - 1].v;
}

/** The largest speed step of the run, with its sign: what the drag pointer keeps. */
export function peakStep(trace: readonly TracePoint[]): number {
  let peak = 0;
  for (let i = 1; i < trace.length; i++) {
    const step = trace[i].v - trace[i - 1].v;
    if (Math.abs(step) > Math.abs(peak)) peak = step;
  }
  return peak;
}

/** The bob's angle from straight down, in radians, for a speed step: speeding up swings it back (toward -x). */
export const swingOf = (step: number) => (-Math.max(-SCALE_MAX, Math.min(SCALE_MAX, step)) * DEG_PER_STEP * Math.PI) / 180;

/** Where the gate stands: every trolley's x at the hand-off tick (the plans agree until then). */
export const GATE_X = trolleyX(executedTrace('naive', 0), HANDOFF_TICK);

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -206, y: -110, w: 414, d: 228, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;
const BED_H = 3;
const RAIL_H = 2;
const RAIL_TOP = BED_H + RAIL_H;
const WHEEL_R = 6.8;
const AXLE_Z = RAIL_TOP + WHEEL_R;
const CHASSIS_Z = AXLE_Z - 1.6;
const CHASSIS_H = 9;
const DECK_Z = CHASSIS_Z + CHASSIS_H;
const PLATE_H = 40;
const FACE_DY = 10.4;
/** The pendulum pivot, at the top of the gauge plate, relative to the trolley at x = 0. */
const PIVOT_Z = DECK_Z + PLATE_H - 5.4;
const ROD = 19.6;
const BOB_R = 4.4;
const SCALE_R = 24.6;
const BOX: Plan = { x: -196, y: 84, w: 50, d: 24, r: 3 };
export const KNOB: Point3 = [BOX.x + 14, BOX.y + 11, 14];

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (const y of [LANE_Y.synchronous - 36, LANE_Y.rtc + 36]) extremes.push([GATE_X - 4.4, y, 86], [GATE_X + 4.4, y, 86]);
for (const x of [X_START - 24, X_START + RUN_SPAN + 24]) extremes.push([x, LANE_Y.synchronous - 12, DECK_Z + PLATE_H], [x, LANE_Y.rtc + 14, DECK_Z + PLATE_H]);
const FIT_PAD = 10;
/** The drawing's height, fitted tightly to the machine at the full width. */
export const HEIGHT = (() => {
  const flat = extremes.map((point) => iso(point, { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION }));
  const span = (axis: 0 | 1) => Math.max(...flat.map((f) => f[axis])) - Math.min(...flat.map((f) => f[axis]));
  return Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
})();
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const seam = (plan: Plan, z: number, steps = 3) => `<path class="iso-line" data-tone="faint" d="${sideSeam(plan, z, P, steps)}"/>`;

/** The convex hull of screen points, for a disc's outline. */
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

/** A circle in the x-z plane at depth y. */
const circleXZ = (cx: number, y: number, cz: number, r: number, steps = 36): Flat[] =>
  Array.from({ length: steps }, (_, k) => at([cx + r * Math.cos((k / steps) * Math.PI * 2), y, cz + r * Math.sin((k / steps) * Math.PI * 2)]));

/**
 * A disc whose axis runs along y (a wheel, a bob): its near face, which the camera sees, in the top tone,
 * its rim shaded under it, one hull outline round both faces.
 */
export function discY(cx: number, y: number, cz: number, r: number, thick: number): SolidPaths {
  const near = circleXZ(cx, y + thick / 2, cz, r);
  const far = circleXZ(cx, y - thick / 2, cz, r);
  const outline = pathOf(hull([...near, ...far]), true);
  const face = pathOf(near, true);
  return { fill: outline, outline, crease: face, top: face, shades: ['', '', outline, ''] };
}

/** A point on a gauge face (the x-z plane at y) at angle `a` from straight down and radius `r` about a pivot. */
const onFace = (px: number, y: number, pz: number, a: number, r: number): Point3 => [px + r * Math.sin(a), y, pz - r * Math.cos(a)];

// ---------------------------------------------------------------- live paths
/** The bob's rod for a swing angle, on a trolley built at x = 0 in its lane. */
export function rodPath(mode: ExecutionMode, angle: number): string {
  const y = LANE_Y[mode] + FACE_DY + BOB_R;
  return pathOf([at(onFace(0, y, PIVOT_Z, angle, 0)), at(onFace(0, y, PIVOT_Z, angle, ROD - BOB_R * 0.6))]);
}

/** The bob itself at a swing angle: a ball, its shaded body under a lighter cap toward the light. */
export function bobPaths(mode: ExecutionMode, angle: number): SolidPaths {
  const centre = at(onFace(0, LANE_Y[mode] + FACE_DY + BOB_R, PIVOT_Z, angle, ROD));
  const r = BOB_R * Math.sqrt(1.6) * P.scale;
  const circle = (cx: number, cy: number, radius: number) =>
    pathOf(Array.from({ length: 32 }, (_, k): Flat => [cx + radius * Math.cos((k / 32) * Math.PI * 2), cy + radius * Math.sin((k / 32) * Math.PI * 2)]), true);
  const body = circle(centre[0], centre[1], r);
  return { fill: body, outline: body, crease: '', top: circle(centre[0] - r * 0.22, centre[1] - r * 0.22, r * 0.72), shades: ['', '', body, ''] };
}

/** The drag pointer at an angle: a thin blade from the hub to the scale. */
export function dragPath(mode: ExecutionMode, angle: number): string {
  const y = LANE_Y[mode] + FACE_DY + 0.2;
  return pathOf([at(onFace(0, y, PIVOT_Z, angle, 0)), at(onFace(0, y, PIVOT_Z, angle, SCALE_R - 0.4))]);
}

/** A small cross in a ring on the scale, just past the drag pointer: the step went over the limit. */
export function overPath(mode: ExecutionMode, angle: number): string {
  const y = LANE_Y[mode] + FACE_DY + 0.1;
  const beside = angle + Math.sign(angle || 1) * 0.2;
  const [cx, , cz] = onFace(0, y, PIVOT_Z, beside, SCALE_R - 6);
  const h = 1.6;
  const ringPath = pathOf(circleXZ(cx, y, cz, h * Math.SQRT2, 20), true);
  return ringPath + pathOf([at([cx - h, y, cz - h]), at([cx + h, y, cz + h])]) + pathOf([at([cx - h, y, cz + h]), at([cx + h, y, cz - h])]);
}

/** The wheels' spokes at a roll angle: one line across each near wheel, so the wheels turn as the trolley runs. */
export function spokePath(mode: ExecutionMode, roll: number): string {
  const y = LANE_Y[mode] + 14.15;
  return [-15, 15]
    .map((x) => pathOf([at(onFace(x, y, AXLE_Z, roll, WHEEL_R - 0.3)), at(onFace(x, y, AXLE_Z, roll + Math.PI, WHEEL_R - 0.3))]))
    .join('');
}

/** The screen offset of a trolley, built at x = 0, at x. */
export const trolleyAt = (x: number) => translateAlong(P, [x, 0, 0]);

/** The delay knob's pointer over three quarters of a turn. */
export function knobPointer(delayMs: number): string {
  const angle = -0.75 * Math.PI + (Math.min(MAX_DELAY_MS, Math.max(0, delayMs)) / MAX_DELAY_MS) * 1.5 * Math.PI;
  const [cx, cy, z] = KNOB;
  return lineOnTop([cx + Math.sin(angle) * 1.2, cy - Math.cos(angle) * 1.2], [cx + Math.sin(angle) * 4.6, cy - Math.cos(angle) * 4.6], z + 5.6, P);
}

// ---------------------------------------------------------------- part lists
const solidOf = (group: Group, paths: SolidPaths, tone: Tone = 'mid', extra: Partial<{ lit: boolean; crease: Tone | 'none'; inner: string }> = {}): Part => ({
  kind: 'solid',
  group,
  paths,
  tone,
  ...extra,
});
const lineOf = (group: Group, d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end'): Part => ({ kind: 'line', group, d, tone, free });
const dotsOf = (group: Group, points: Flat[], size = 0.5, tone?: Tone): Part => ({ kind: 'dots', group, points, size, tone });

// ------------------------------------------------- base
const base: Part[] = [];
for (const [x, y] of byDepth([
  [BASE.x + 26, BASE.y + 22],
  [BASE.x + BASE.w - 26, BASE.y + 22],
  [BASE.x + 26, BASE.y + BASE.d - 22],
  [BASE.x + BASE.w - 26, BASE.y + BASE.d - 22],
])) {
  base.push(solidOf('static', cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6), 'lo'));
  base.push(solidOf('static', cyl(x, y, 6.6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid'));
}
base.push(solidOf('static', slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid'));
base.push(lineOf('static', planOutline(insetPlan(BASE, 5), 0, P), 'faint'));
{
  const screws: Array<[number, number]> = [
    [BASE.x + 11, BASE.y + 11],
    [BASE.x + BASE.w - 11, BASE.y + 11],
    [BASE.x + 11, BASE.y + BASE.d - 11],
    [BASE.x + BASE.w - 11, BASE.y + BASE.d - 11],
  ];
  base.push(lineOf('static', screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo'));
  base.push(dotsOf('static', screws.map(([x, y]) => at([x, y, 0])), 0.55));
}
// The gate's far post, behind every lane.
const GATE_Y0 = LANE_Y.synchronous - 30;
const GATE_Y1 = LANE_Y.rtc + 30;
const GATE_TOP = 80;
base.push(solidOf('static', slab({ x: GATE_X - 7, y: GATE_Y0 - 7, w: 14, d: 14, r: 2 }, 0, 3, 4, 0.4), 'lo'));
base.push(solidOf('static', slab({ x: GATE_X - 3.2, y: GATE_Y0 - 3.2, w: 6.4, d: 6.4, r: 1 }, 3, GATE_TOP - 3, 3, 0.4), 'mid', { inner: seam({ x: GATE_X - 3.2, y: GATE_Y0 - 3.2, w: 6.4, d: 6.4, r: 1 }, 20) }));

// ------------------------------------------------- lanes: bed, rails, buffers, and each trolley in its slot
/** Each lane's static parts, then its trolley's parts, back lane first. */
export const LANE_PARTS: Record<ExecutionMode, { bed: readonly Part[]; trolley: readonly Part[] }> = {} as Record<
  ExecutionMode,
  { bed: readonly Part[]; trolley: readonly Part[] }
>;
const BED_X0 = -184;
const BED_X1 = 182;
for (const mode of LANES) {
  const y = LANE_Y[mode];
  const group: Group = `trolley-${mode}`;
  const bed: Part[] = [];
  const bedPlan: Plan = { x: BED_X0, y: y - 19, w: BED_X1 - BED_X0, d: 38, r: 3 };
  bed.push(solidOf('static', slab(bedPlan, 0, BED_H, 4, 0.6), 'lo'));
  // Two rails, with a tick every 20 units of lane along the near rail's outer edge.
  for (const ry of [y - 12.6, y + 12.6]) {
    bed.push(solidOf('static', slab({ x: BED_X0 + 6, y: ry - 1.6, w: BED_X1 - BED_X0 - 12, d: 3.2, r: 0.8 }, BED_H, RAIL_H, 2, 0.3), 'mid'));
  }
  {
    const ticks: string[] = [];
    for (let x = -180 + 20; x <= BED_X1 - 10; x += 20) ticks.push(lineOnTop([x, y + 19], [x, y + 15.8], BED_H, P));
    bed.push(lineOf('static', ticks.join(''), 'faint'));
  }
  // End buffers: a block at each end with a sprung plunger toward the trolley.
  for (const [bx, dir] of [[BED_X0 + 2, 1], [BED_X1 - 10, -1]] as const) {
    bed.push(solidOf('static', slab({ x: bx, y: y - 10, w: 8, d: 20, r: 1.6 }, BED_H, 11, 3, 0.5), 'mid'));
    bed.push(solidOf('static', cyl(bx + (dir > 0 ? 9.6 : -1.6), y, 3, BED_H + 4, 4, 16), 'lo'));
    bed.push(dotsOf('static', [at([bx + 4, y - 6, BED_H + 11]), at([bx + 4, y + 6, BED_H + 11])], 0.45));
  }

  // The trolley, built at x = 0: far wheels, chassis, near wheels, motor, gauge plate and its face.
  const trolley: Part[] = [];
  for (const x of [-15, 15]) trolley.push(solidOf(group, discY(x, y - 12.6, AXLE_Z, WHEEL_R, 3), 'mid'));
  const chassis: Plan = { x: -23, y: y - 10.6, w: 46, d: 21.2, r: 2.8 };
  trolley.push(solidOf(group, slab(chassis, CHASSIS_Z, CHASSIS_H, 4, 0.6), 'mid', { inner: seam(chassis, CHASSIS_Z + 2.6, 4) }));
  for (const x of [-15, 15]) trolley.push(solidOf(group, discY(x, y + 12.6, AXLE_Z, WHEEL_R, 3), 'mid'));
  trolley.push({ kind: 'slot', group, name: 'wheels', mode });
  trolley.push(dotsOf(group, [-15, 15].map((x) => at([x, y + 14.1, AXLE_Z])), 0.8, 'hi'));
  trolley.push(dotsOf(group, [at([16, y - 6, DECK_Z]), at([-19, y - 6.6, DECK_Z])], 0.45));
  // The gauge plate standing on the deck's near edge, its face toward the viewer.
  const plate: Plan = { x: -20, y: y + FACE_DY - 2.4, w: 40, d: 2.4, r: 0.6 };
  trolley.push(solidOf(group, slab(plate, DECK_Z, PLATE_H, 2, 0.4), 'hi'));
  trolley.push(solidOf(group, slab({ x: -22, y: y + FACE_DY, w: 44, d: 2.4, r: 0.6 }, DECK_Z, 3.6, 2), 'mid'));
  trolley.push({ kind: 'slot', group, name: 'gauge', mode });
  LANE_PARTS[mode] = { bed, trolley };
}

/** The gauge face's fixed marks, drawn on the plate's near face: the scale arc and its ticks, the limit marks, the zero. */
export function faceMarks(mode: ExecutionMode): { arc: string; minor: string; major: string; limit: string; screws: Flat[]; hub: Flat; dragHub: Flat; pin: string } {
  const y = LANE_Y[mode] + FACE_DY + 0.05;
  const reach = (SCALE_MAX * DEG_PER_STEP * Math.PI) / 180;
  const arc: Flat[] = [];
  for (let k = 0; k <= 36; k++) arc.push(at(onFace(0, y, PIVOT_Z, -reach + (2 * reach * k) / 36, SCALE_R)));
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = -12; k <= 12; k++) {
    const a = (k * 0.1 * DEG_PER_STEP * Math.PI) / 180;
    const long = k % 5 === 0;
    (long ? major : minor).push(pathOf([at(onFace(0, y, PIVOT_Z, a, SCALE_R)), at(onFace(0, y, PIVOT_Z, a, SCALE_R - (long ? 3.2 : 1.8)))]));
  }
  const lim = (JERK_LIMIT * DEG_PER_STEP * Math.PI) / 180;
  const limit = [-lim, lim].map((a) => pathOf([at(onFace(0, y, PIVOT_Z, a, SCALE_R)), at(onFace(0, y, PIVOT_Z, a, SCALE_R - 5))])).join('');
  const screws = [at([-17.4, y, DECK_Z + 2.8]), at([17.4, y, DECK_Z + 2.8]), at([-17.4, y, DECK_Z + PLATE_H - 2.8]), at([17.4, y, DECK_Z + PLATE_H - 2.8])];
  return { arc: pathOf(arc), minor: minor.join(''), major: major.join(''), limit, screws, hub: at([0, y + BOB_R, PIVOT_Z]), dragHub: at([0, y + 0.2, PIVOT_Z]), pin: pathOf([at([0, y + 0.2, PIVOT_Z]), at([0, y + BOB_R, PIVOT_Z])]) };
}

// ------------------------------------------------- the gate across the lanes, and the near side
const gate: Part[] = [];
gate.push(solidOf('static', slab({ x: GATE_X - 4.4, y: GATE_Y0 - 6, w: 8.8, d: GATE_Y1 - GATE_Y0 + 12, r: 1.6 }, GATE_TOP, 6, 3, 0.6), 'mid', { inner: seam({ x: GATE_X - 4.4, y: GATE_Y0 - 6, w: 8.8, d: GATE_Y1 - GATE_Y0 + 12, r: 1.6 }, GATE_TOP + 2.4) }));
gate.push(dotsOf('static', [at([GATE_X, GATE_Y0, GATE_TOP + 6]), at([GATE_X, GATE_Y1, GATE_TOP + 6])], 0.55));
// One signal lamp over each lane: where the late plan reaches the trolley.
for (const mode of LANES) {
  const y = LANE_Y[mode];
  gate.push(solidOf('static', cyl(GATE_X, y, 1.4, GATE_TOP - 5, 5, 12), 'mid'));
  gate.push(solidOf('static', cyl(GATE_X, y, 3.6, GATE_TOP - 9.4, 4.4, 24, 0.3), 'hi'));
}
// The gate's near post.
gate.push(solidOf('static', slab({ x: GATE_X - 7, y: GATE_Y1 - 7, w: 14, d: 14, r: 2 }, 0, 3, 4, 0.4), 'lo'));
gate.push(solidOf('static', slab({ x: GATE_X - 3.2, y: GATE_Y1 - 3.2, w: 6.4, d: 6.4, r: 1 }, 3, GATE_TOP - 3, 3, 0.4), 'mid', { inner: seam({ x: GATE_X - 3.2, y: GATE_Y1 - 3.2, w: 6.4, d: 6.4, r: 1 }, 20) }));
gate.push(dotsOf('static', [at([GATE_X - 4.6, GATE_Y1 - 4.6, 3]), at([GATE_X + 4.6, GATE_Y1 + 4.6, 3])], 0.45));

const near: Part[] = [];
// The control box with the delay knob, its dial and a lamp, and its cable to the gate.
near.push(solidOf('static', slab(BOX, 0, 14, 4, 0.8), 'mid'));
near.push(lineOf('static', planOutline(insetPlan(BOX, 2.6), 14, P, 4), 'faint'));
near.push(dotsOf('static', [[BOX.x + 4, BOX.y + 4], [BOX.x + BOX.w - 4, BOX.y + 4], [BOX.x + 4, BOX.y + BOX.d - 4], [BOX.x + BOX.w - 4, BOX.y + BOX.d - 4]].map(([x, y]) => at([x, y, 14])), 0.5));
{
  const [kx, ky, kz] = KNOB;
  const dial = radialTicks(kx, ky, 8.4, 10, 5, kz, [1.1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  near.push(lineOf('static', ring(kx, ky, 8.4, kz, P, 36), 'faint'));
  near.push(lineOf('static', dial.minor, 'lo'));
  near.push(lineOf('static', dial.major, 'mid'));
  near.push(solidOf('static', cyl(kx, ky, 5.2, kz, 5.6, 28, 0.4), 'hi'));
  near.push(lineOf('static', knurl(kx, ky, 5.2, kz, kz + 5.6, 22, P), 'lo'));
  near.push({ kind: 'slot', group: 'static', name: 'knob' });
  near.push(solidOf('static', cyl(BOX.x + 36, BOX.y + 11, 3.2, 14, 1.4, 20), 'mid'));
  near.push(solidOf('static', cyl(BOX.x + 36, BOX.y + 11, 2.1, 15.4, 1.8, 20, 0.3), 'hi'));
}
near.push({
  kind: 'wire',
  group: 'static',
  from: at([BOX.x + BOX.w, BOX.y + 8, 6]),
  via: [at([BOX.x + BOX.w + 6, BOX.y + 8, 0.4]), at([GATE_X - 9, BOX.y + 8, 0.4])],
  to: at([GATE_X - 5, GATE_Y1 + 3, 1.6]),
  tone: 'lo',
});
// The label plate at the near right, with three engraved rules.
{
  const plate: Plan = { x: 104, y: 92, w: 78, d: 15, r: 2 };
  near.push(solidOf('static', slab(plate, 0, 0.8, 3), 'lo', { crease: 'none' }));
  near.push(lineOf('static', planOutline(insetPlan(plate, 1.8), 0.8, P), 'faint'));
  near.push(lineOf('static', [0, 1, 2].map((row) => onTop([[plate.x + 9, plate.y + 4 + row * 3.6], [plate.x + (row === 1 ? 42 : 60), plate.y + 4 + row * 3.6]], 0.8, P)).join(''), 'lo', true));
  near.push(dotsOf('static', [at([plate.x + 4, plate.y + plate.d / 2, 0.8]), at([plate.x + plate.w - 4, plate.y + plate.d / 2, 0.8])], 0.5));
}

export const BASE_PARTS: readonly Part[] = base;
export const GATE_PARTS: readonly Part[] = gate;
export const NEAR_PARTS: readonly Part[] = near;
export const PART_COUNT =
  base.length + gate.length + near.length + LANES.reduce((sum, mode) => sum + LANE_PARTS[mode].bed.length + LANE_PARTS[mode].trolley.length, 0);
export const SOLID_COUNT = [base, gate, near, ...LANES.flatMap((mode) => [LANE_PARTS[mode].bed, LANE_PARTS[mode].trolley])]
  .flat()
  .filter((part) => part.kind === 'solid').length;
