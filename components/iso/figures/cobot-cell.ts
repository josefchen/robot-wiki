/**
 * The cobot cell for CollaborativeOperationModes, drawn with the isometric
 * kit, and the run that plays in it.
 *
 * The object is the explanation. A six-joint collaborative arm stands on a
 * pedestal at one end of a floor plate and moves parts from a tray to a
 * fixture on its table. A test mannequin rides a sled on a floor track that
 * runs from the cell's entrance, where a light curtain stands, toward the
 * robot. A floor scanner by the pedestal guards a zone on the floor; a ruler
 * along the track reads distance from the tool. A controller cabinet behind
 * the robot carries the speed dial and a stack light; the sled carries a bump
 * gauge, a spring pad at thigh height with its own dial, in front of the
 * mannequin. The four ways of sharing the cell each hand the job of guarding
 * the person to one part, which is the lit one:
 *
 * - monitored stop: the light curtain. The robot holds still while the
 *   person is inside the cell and works only once they step out.
 * - hand guiding: the handle on the wrist. The robot moves only while the
 *   mannequin's hand pushes it.
 * - speed and separation: the edge of the scanner's zone, drawn at the
 *   protective separation distance the model computes from both speeds. The
 *   ruler under it carries the model's four terms. A run walks the mannequin
 *   in: when it crosses the edge the robot keeps moving for the reaction
 *   time, brakes, and stops with exactly the margin left between them.
 * - power and force limiting: the bump gauge's needle. The tool bumps the
 *   pad at the robot's speed, and the needle holds the peak force against the
 *   limit mark.
 *
 * Every number comes from lib/safety-modes (unchanged): the separation terms,
 * the stopping time and braking, and the contact force F = v sqrt(k m). The
 * run below adds only the choreography (where the walk starts, the tray and
 * the fixture, the guiding push) and plays 8 times slower than real time.
 *
 * World units: centimetres. x runs along the track from the tool's working
 * point (x = 0) toward the entrance, y across the cell (toward the viewer is
 * +y), z up. The camera looks from azimuth 120, so the robot stands at the
 * left and in front, the mannequin at the right and further back.
 */
import {
  coil,
  cylinder as kitCylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  topTicks,
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
import { barBetween, circleAround, discAlong, viewOf } from '../prism.ts';
import {
  BODY_CONTACT_STIFFNESS_N_PER_M,
  CONTACT_EFFECTIVE_MASS_KG,
  ROBOT_DECELERATION_M_PER_S2,
  REACTION_TIME_S,
  WORKCELL_SEPARATION_M,
  peakContactForceN,
  protectiveSeparationM,
  separationTerms,
  stoppingTimeS,
  type ModeId,
  type SeparationTerms,
} from '../../../lib/safety-modes.ts';

// ------------------------------------------------------------------ the scale
/** World units (centimetres) per metre. */
export const UNITS_PER_M = 100;
/** A run plays this many times slower than real time. */
export const SLOW = 8;

export const AZIMUTH = 107;
export const ELEVATION = 36;

// ------------------------------------------------------------ the run's places (metres)
/** Where the person stands at their place in the cell: the model's workcell separation. */
export const STATION_M = WORKCELL_SEPARATION_M;
/** The cell's entrance: the far edge of the scanner's zone when the whole cell is guarded. */
export const ENTRANCE_M = 1.98;
/** Where the person waits outside the cell. */
export const OUTSIDE_M = 2.05;
/** Where the person stands to guide the arm by its handle. */
export const GUIDE_M = 0.3;
/** Where the person stands beside the arm when it may touch them. */
export const BUMP_M = 0.36;
/** The tool's working point is x = 0 (the fixture); the tray is this far back. */
export const TRAY_M = -0.3;
/** The tool's height while it carries a part, and at the fixture. */
export const CARRY_Z_M = 0.88;
/** How far the guiding hand pushes the arm, and how fast. */
export const GUIDE_PUSH_M = 0.15;
export const GUIDE_SPEED_M_S = 0.4;
/** The lead-in of a separation run: the person starts this long (real time) outside the zone. */
const LEAD_S = 0.5;
/** Real seconds held at the end of a phase change before the next. */
const BEAT_S = 0.12;

// --------------------------------------------------------- the machine (cm)
const FLOOR: Plan = { x: -110, y: -86, w: 368, d: 142, r: 6 };
const FLOOR_Z = [-5, 0] as const;
const PEDESTAL = { x: -58, y: 0 };
const PEDESTAL_TOP = 52;
/** The shoulder joint's axis: on top of the base housing. */
const SHOULDER: Point3 = [PEDESTAL.x, 0, 74];
const UPPER_ARM = 61;
const FOREARM = 57;
/** Wrist-1 centre above the tool's fingertips (tool pointing down). */
const WRIST_ABOVE_TCP = 39;
const UPPER_Y = 15;
const TABLE: Plan = { x: -42, y: -30, w: 54, d: 60, r: 2 };
const TABLE_Z = 72;
const TRACK = { x0: 6, x1: 252, y: 13 };
const RULER: Plan = { x: -6, y: 32, w: 214, d: 12, r: 1.2 };
const RULER_TOP = 0.8;
const CABINET: Plan = { x: -104, y: -82, w: 40, d: 28, r: 2.5 };
const CABINET_H = 74;
const SCANNER: Plane = [-50, 30];
/** The sled, built with its pad face at x = 0. */
const SLED: Plan = { x: -2, y: -20, w: 46, d: 40, r: 2 };
const SLED_Z = [5, 8] as const;
const BODY_X = 30;
const PAD_Z = 70;
/** The gripper's half-width along x: its side meets the bump pad. */
const GRIP_HALF = 6;
/** The guiding grip on the wrist: its centre is this far above the fingertips, at this y. */
const HANDLE = { y: 20, above: 22 };
/** The mannequin's right hand, from the sled's pad face. */
const HAND = { x: BODY_X - 40, y: 20, z: 112 };

// ---------------------------------------------------------------- the fit
const SPEED_DIAL = { x: -89, y: CABINET.y + CABINET.d, z: 52, r: 9 };
/** The speed dial reads 0 to 2 metres a second over 240 degrees, zero at lower left. */
export const SPEED_MAX = 2;
/** The bump gauge's dial reads 0 to 700 newtons over 240 degrees. */
export const FORCE_MAX = 700;
const DIAL_SWEEP = 240;
const NEEDLE_ZERO_DEG = 150;

const extremes: Point3[] = [
  [FLOOR.x, FLOOR.y, FLOOR_Z[0] - 4],
  [FLOOR.x + FLOOR.w, FLOOR.y, FLOOR_Z[0] - 4],
  [FLOOR.x, FLOOR.y + FLOOR.d, FLOOR_Z[0] - 4],
  [FLOOR.x + FLOOR.w, FLOOR.y + FLOOR.d, FLOOR_Z[0] - 4],
  [FLOOR.x + FLOOR.w, FLOOR.y, 0],
  [CABINET.x, CABINET.y, CABINET_H + 24],
  [CABINET.x, CABINET.y + CABINET.d, 0],
  [OUTSIDE_M * 100 + BODY_X, 0, 174],
  [STATION_M * 100 + BODY_X, 0, 174],
  [-92, 21, 140],
];
export const WIDTH = 640;
const PAD_VB = 10;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanOf(1)) / spanOf(0) + 2 * PAD_VB);
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });

// ----------------------------------------------------------------- the parts
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 'top' | 'paper' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

/**
 * Where the live pieces go in the painter's order: the scanner's zone and
 * the ruler's riders (redrawn when a setting changes), the sled with the
 * mannequin and the bump gauge, the arm,
 * the mannequin's right arm (drawn after the arm, so its hand closes on the
 * handle), the two dials' needles and the stack light's lamps.
 */
export type Slot = 'field' | 'riders' | 'sled' | 'arm' | 'right-arm' | 'speed-needle' | 'lamps';

const at = (point: Point3) => iso(point, P);
const V = viewOf(P);
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const deg = Math.PI / 180;
const r1 = (value: number) => Math.round(value * 10) / 10;

const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (list: Part[], points: Flat[], size = 0.45, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone });
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const screws = (list: Part[], plan: Plan, z: number, inset = 2.5, size = 0.45) =>
  dots(list, [
    [plan.x + inset, plan.y + inset],
    [plan.x + plan.w - inset, plan.y + inset],
    [plan.x + inset, plan.y + plan.d - inset],
    [plan.x + plan.w - inset, plan.y + plan.d - inset],
  ].map(([x, y]) => at([x, y, z])), size, 'mid');
const box = (cx: number, cy: number, w: number, d: number, r = 1): Plan => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });

/** The front half of a ring round a horizontal or tilted round part: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 48): string {
  const points = circleAround(centre, axis, radius, steps);
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  points.forEach((point, index) => {
    const normal: Point3 = [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
    if (dot(normal, V) > 0) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
    if (index === points.length - 1 && run.length) runs.push(run);
  });
  // Join a run that wraps past the start.
  if (runs.length > 1 && dot([points[0]![0] - centre[0], points[0]![1] - centre[1], points[0]![2] - centre[2]], V) > 0) {
    const last = runs.pop()!;
    runs[0] = [...last, ...runs[0]!];
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}

/** A closed ring on a round face (the end cap of a part on any axis). */
const faceRing = (centre: Point3, axis: Point3, radius: number, steps = 40) => pathOf(circleAround(centre, axis, radius, steps).map(at), true);

function hullOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Flat[]) => {
    const out: Flat[] = [];
    for (const point of list) {
      while (out.length >= 2 && turn(out[out.length - 2]!, out[out.length - 1]!, point) <= 0) out.pop();
      out.push(point);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * A ball (a mannequin's head, hand and joints), shaded as the kit's sphereOf
 * shades one: the outline in the darkest tone, then three caps toward the
 * light, each the visible part of the sphere facing the light past a
 * threshold.
 */
function ballOf(centre: Point3, radius: number, steps = 40): SolidPaths {
  const { sinA, cosA } = { sinA: Math.sin(AZIMUTH * deg), cosA: Math.cos(AZIMUTH * deg) };
  const lightLength = Math.hypot(sinA, cosA, 1.2);
  const L: Point3 = [-sinA / lightLength, cosA / lightLength, 1.2 / lightLength];
  const rim = circleAround(centre, V, radius, steps);
  const outline = pathOf(rim.map(at), true);
  const cap = (threshold: number) => {
    const points = rim.filter((p) => dot([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]], L) / radius >= threshold).map(at);
    const ringCentre: Point3 = [centre[0] + L[0] * radius * threshold, centre[1] + L[1] * radius * threshold, centre[2] + L[2] * radius * threshold];
    for (const p of circleAround(ringCentre, L, radius * Math.sqrt(1 - threshold * threshold), steps)) {
      if (dot([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]], V) >= -1e-9) points.push(at(p));
    }
    if (dot(L, V) > threshold) points.push(at([centre[0] + V[0] * radius, centre[1] + V[1] * radius, centre[2] + V[2] * radius]));
    return points.length > 2 ? pathOf(hullOf(points), true) : '';
  };
  return { fill: outline, outline, crease: '', top: '', shades: [outline, cap(0.2), cap(0.42), cap(0.62)] };
}

// --------------------------------------------------------------- static parts
const byDepth = <T extends [number, number] | Plane>(points: T[]) => [...points].sort((p, q) => dot([p[0], p[1], 0], V) - dot([q[0], q[1], 0], V));

export const PARTS: Part[] = [];
{
  const list = PARTS;
  // The floor plate on eight levelling feet, with its edge seam, groove, tile seams and corner screws.
  list.push({ kind: 'face', d: slabOf(insetPlan(FLOOR, -3), FLOOR_Z[0] - 4, 4, P, 6).fill, fill: 'paper' });
  const feet: Plane[] = [];
  for (const fx of [FLOOR.x + 14, FLOOR.x + FLOOR.w / 3, FLOOR.x + (2 * FLOOR.w) / 3, FLOOR.x + FLOOR.w - 14]) {
    for (const fy of [FLOOR.y + 14, FLOOR.y + FLOOR.d - 14]) feet.push([fx, fy]);
  }
  for (const [fx, fy] of byDepth(feet)) {
    solid(list, cyl(fx, fy, 6, FLOOR_Z[0] - 4, 1.4, 24), 'lo');
    solid(list, cyl(fx, fy, 4.2, FLOOR_Z[0] - 2.6, 2.6, 20), 'lo');
  }
  solid(list, slab(FLOOR, FLOOR_Z[0], FLOOR_Z[1] - FLOOR_Z[0], 6, 1.2), 'lo', { inner: sideSeam(FLOOR, FLOOR_Z[0] + 2, P, 6) });
  line(list, [-40, 60, 160].map((x) => lineOnTop([x, FLOOR.y + 0.4], [x, FLOOR.y + FLOOR.d - 0.4], FLOOR_Z[1], P)).join(''), 'faint');
  line(list, planOutline(insetPlan(FLOOR, 5), FLOOR_Z[1], P, 6), 'faint');
  screws(list, FLOOR, FLOOR_Z[1], 9, 0.5);
  // The entrance tape across the cell's mouth, and the place the person stands at.
  line(list, planOutline({ x: ENTRANCE_M * 100, y: -46, w: 6, d: 92, r: 0.6 }, FLOOR_Z[1], P, 2), 'lo');
  for (const ty of [-32, 22]) line(list, planOutline({ x: STATION_M * 100 - 1, y: ty, w: 2, d: 10, r: 0.4 }, FLOOR_Z[1], P, 2), 'mid');
  // The cell's label plate by the entrance: three rule lines stand for its printing.
  const LABEL: Plan = { x: 216, y: 40, w: 26, d: 9, r: 1 };
  solid(list, slab(LABEL, FLOOR_Z[1], 0.8, 3), 'lo', { crease: 'none' });
  line(list, planOutline(insetPlan(LABEL, 1.4), FLOOR_Z[1] + 0.8, P, 3), 'faint');
  line(list, [0, 1, 2].map((k) => lineOnTop([LABEL.x + 4, LABEL.y + 2.6 + k * 1.9], [LABEL.x + 4 + [16, 11, 13][k]!, LABEL.y + 2.6 + k * 1.9], FLOOR_Z[1] + 0.8, P)).join(''), 'lo', true);
  list.push({ kind: 'slot', slot: 'field' });

  // The ruler along the track's near side: a tick every 10 cm from the tool's working point, long every half metre.
  solid(list, slab(RULER, FLOOR_Z[1], RULER_TOP, 2), 'lo', { crease: 'none' });
  const ticks = topTicks(0, 200, 10, 5, RULER.y + 0.6, RULER_TOP, [3, 5.6], P);
  line(list, ticks.minor, 'lo');
  line(list, ticks.major, 'mid');
  line(list, lineOnTop([0, RULER.y + 0.6], [0, RULER.y + 0.6 + 5.6], RULER_TOP, P), 'hi');
  list.push({ kind: 'slot', slot: 'riders' });

  // The track: sleepers, two rails and end stops.
  for (let x = TRACK.x0 + 8; x <= TRACK.x1 - 6; x += 33) solid(list, slab(box(x, 0, 6, 38, 1), FLOOR_Z[1], 1.2, 2), 'lo', { crease: 'none' });
  for (const ry of [-TRACK.y, TRACK.y]) {
    const rail: Plan = { x: TRACK.x0, y: ry - 1.5, w: TRACK.x1 - TRACK.x0, d: 3, r: 0.8 };
    solid(list, slab(rail, 1.2, 2.3, 2, 0.3), 'mid');
  }
  for (const sx of [TRACK.x0 - 4, TRACK.x1]) {
    const stop: Plan = { x: sx, y: -TRACK.y - 4, w: 4, d: TRACK.y * 2 + 8, r: 1 };
    solid(list, slab(stop, FLOOR_Z[1], 4.4, 2, 0.4), 'mid');
    dots(list, [at([sx + 2, -TRACK.y, 4.4]), at([sx + 2, TRACK.y, 4.4])], 0.45, 'mid');
  }

  // The controller cabinet behind the robot: plinth, case with door, vents and latch, the speed dial on its door.
  const C = CABINET;
  solid(list, slab(insetPlan(C, -1.6), FLOOR_Z[1], 3, 3), 'lo');
  const door: Plan = { x: C.x + 3, y: C.y + C.d, w: C.w - 6, d: 0.6, r: 0.3 };
  const vents = [0, 1, 2, 3].map((k) => pathOf(([
    [C.x + 7 + k * 5.5, C.y + C.d + 0.6, 10],
    [C.x + 10 + k * 5.5, C.y + C.d + 0.6, 10],
    [C.x + 10 + k * 5.5, C.y + C.d + 0.6, 30],
    [C.x + 7 + k * 5.5, C.y + C.d + 0.6, 30],
  ] as Point3[]).map(at), true)).join('');
  solid(list, slab(C, 3, CABINET_H - 3, 3, 0.8), 'mid', { inner: sideSeam(C, CABINET_H - 5, P, 3) });
  solid(list, slab(door, 6, CABINET_H - 12, 1), 'mid', { crease: 'none' });
  line(list, vents, 'lo');
  screws(list, C, CABINET_H, 2.4);
  solid(list, slab({ x: C.x + C.w - 7, y: C.y + C.d + 0.6, w: 2, d: 1.4, r: 0.5 }, 50, 12, 2), 'lo');
  const D = SPEED_DIAL;
  solid(list, discAlong([D.x, D.y + 0.6, D.z], [0, 1, 0], D.r + 1.6, 1.6, P, 40), 'mid');
  list.push({ kind: 'slot', slot: 'speed-needle' });
  // The stack light on the lid: a base, a pole, three lamps and a cap (the lamps are live).
  solid(list, cyl(C.x + 8, C.y + 8, 3.4, CABINET_H, 1.6, 24), 'mid');
  solid(list, cyl(C.x + 8, C.y + 8, 1.1, CABINET_H + 1.6, 6, 12), 'mid');
  list.push({ kind: 'slot', slot: 'lamps' });
  // The teach pendant on its hook on the door, its cable looping down into the cabinet.
  const face = C.y + C.d + 0.6;
  const pendant: Plan = { x: C.x + C.w - 13, y: face, w: 9, d: 2.2, r: 0.8 };
  solid(list, slab({ x: pendant.x + 3, y: face, w: 3, d: 1.4, r: 0.4 }, 40, 2, 2), 'lo');
  solid(list, slab(pendant, 24, 16, 2, 0.4), 'mid');
  const screen = ([[1.4, 37.5], [7.6, 37.5], [7.6, 30], [1.4, 30]] as Array<[number, number]>).map(([x, z]) => at([pendant.x + x, face + pendant.d, z]));
  line(list, pathOf(screen, true), 'lo');
  dots(list, [at([pendant.x + 2.5, face + pendant.d, 27]), at([pendant.x + 4.5, face + pendant.d, 27]), at([pendant.x + 6.5, face + pendant.d, 27])], 0.45, 'mid');
  list.push({ kind: 'wire', from: at([pendant.x + 4.5, face + 1.1, 24]), via: [at([pendant.x + 5, face + 6, 17])], to: at([pendant.x + 8, face, 14]), tone: 'lo' });

  list.push({ kind: 'slot', slot: 'sled' });

  // The table: four legs on feet and two low stretchers, in depth order, then the top with its apron seam,
  // the tray of parts and the fixture at the working point.
  const legs: Array<{ at: Plane; draw: () => void }> = [];
  for (const [lx, ly] of [[TABLE.x + 3, TABLE.y + 3], [TABLE.x + TABLE.w - 3, TABLE.y + 3], [TABLE.x + 3, TABLE.y + TABLE.d - 3], [TABLE.x + TABLE.w - 3, TABLE.y + TABLE.d - 3]] as Array<[number, number]>) {
    legs.push({ at: [lx, ly], draw: () => {
      solid(list, slab(box(lx, ly, 5, 5, 1), FLOOR_Z[1], 1, 2), 'lo');
      solid(list, slab(box(lx, ly, 3, 3, 0.6), 1, TABLE_Z - 5, 2), 'mid');
    } });
  }
  for (const ly of [TABLE.y + 3, TABLE.y + TABLE.d - 3]) {
    legs.push({ at: [TABLE.x + TABLE.w / 2, ly], draw: () => solid(list, slab({ x: TABLE.x + 4.5, y: ly - 1, w: TABLE.w - 9, d: 2, r: 0.4 }, 14, 2, 2), 'mid') });
  }
  legs.sort((p, q) => dot([p.at[0], p.at[1], 0], V) - dot([q.at[0], q.at[1], 0], V)).forEach((leg) => leg.draw());
  solid(list, slab(TABLE, TABLE_Z - 4, 4, 3, 0.8), 'mid', { inner: sideSeam(TABLE, TABLE_Z - 2, P, 3) });
  screws(list, TABLE, TABLE_Z, 2.2);
  const TRAY: Plan = box(TRAY_M * 100, 0, 18, 26, 1.2);
  solid(list, slab(TRAY, TABLE_Z, 2.6, 2, 0.4), 'lo');
  line(list, planOutline(insetPlan(TRAY, 1.6), TABLE_Z + 2.6, P, 2), 'faint');
  for (const [px, py] of byDepth<[number, number]>([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([u, v]) => [TRAY.x + TRAY.w / 2 + u! * 4.5, v! * 6] as [number, number]))) {
    solid(list, cyl(px, py, 2.6, TABLE_Z + 2.6, 3, 20), 'hi');
  }
  const FIXTURE: Plan = box(0, 0, 16, 16, 1);
  solid(list, slab(FIXTURE, TABLE_Z, 3, 2, 0.5), 'mid');
  line(list, ring(0, 0, 3.4, TABLE_Z + 3, P, 32), 'lo');
  dots(list, [at([-6, -6, TABLE_Z + 3]), at([6, 6, TABLE_Z + 3]), at([-6, 6, TABLE_Z + 3]), at([6, -6, TABLE_Z + 3])], 0.45, 'mid');

  // The robot's cable along the floor from the cabinet to the pedestal.
  list.push({
    kind: 'wire',
    from: at([CABINET.x + CABINET.w - 6, CABINET.y + CABINET.d, 3]),
    via: [at([CABINET.x + CABINET.w - 6, CABINET.y + CABINET.d + 6, 0.6]), at([PEDESTAL.x - 22, CABINET.y + CABINET.d + 6, 0.6]), at([PEDESTAL.x - 22, -6, 0.6])],
    to: at([PEDESTAL.x - 17, -6, 1.2]),
    tone: 'lo',
  });

  // The pedestal: a floor flange with anchor bolts, the column, its top flange with a bolt circle.
  const FLANGE: Plan = box(PEDESTAL.x, PEDESTAL.y, 34, 34, 2);
  solid(list, slab(FLANGE, FLOOR_Z[1], 2.4, 3, 0.6), 'mid');
  for (const [bx, by] of byDepth<[number, number]>([[-12, -12], [12, -12], [-12, 12], [12, 12]])) {
    solid(list, cyl(PEDESTAL.x + bx, PEDESTAL.y + by, 1.8, 2.4, 1.6, 12), 'lo');
  }
  solid(list, cyl(PEDESTAL.x, PEDESTAL.y, 11, 2.4, PEDESTAL_TOP - 5.4, 40), 'mid', { inner: sideArc(PEDESTAL.x, PEDESTAL.y, 11, 9, P, 32) });
  solid(list, cyl(PEDESTAL.x, PEDESTAL.y, 14, PEDESTAL_TOP - 3, 3, 48, 0.6), 'mid');
  const bolts: Flat[] = [];
  for (let k = 0; k < 8; k++) {
    const angle = ((k + 0.5) / 8) * Math.PI * 2;
    bolts.push(at([PEDESTAL.x + 11.6 * Math.cos(angle), PEDESTAL.y + 11.6 * Math.sin(angle), PEDESTAL_TOP]));
  }
  dots(list, bolts, 0.45, 'mid');
  // The floor scanner on its bracket, its window toward the track.
  const [sx, sy] = SCANNER;
  solid(list, slab(box(sx, sy, 12, 12, 1.2), FLOOR_Z[1], 1.6, 2), 'lo');
  dots(list, [at([sx - 4, sy - 4, 1.6]), at([sx + 4, sy + 4, 1.6]), at([sx - 4, sy + 4, 1.6]), at([sx + 4, sy - 4, 1.6])], 0.4, 'mid');
  solid(list, cyl(sx, sy, 5.4, 1.6, 6, 32), 'mid', { inner: sideArc(sx, sy, 5.4, 4.8, P, 24) });
  solid(list, cyl(sx, sy, 5, 7.6, 5, 32), 'hi', { inner: sideArc(sx, sy, 5, 9.4, P, 24) + sideArc(sx, sy, 5, 11, P, 24) });
  solid(list, cyl(sx, sy, 5.4, 12.6, 1.6, 32), 'mid');

  list.push({ kind: 'slot', slot: 'arm' });
  list.push({ kind: 'slot', slot: 'right-arm' });
}

// --------------------------------------------------------------- the stack light
/** The three lamps, top to bottom: stop, wait, run. Each is a solid in the order it is drawn (bottom first). */
export const LAMPS = (() => {
  const C = CABINET;
  const [lx, ly] = [C.x + 8, C.y + 8];
  const base = CABINET_H + 7.6;
  const lamp = (index: number) => {
    const z = base + index * 5.2;
    return { paths: cyl(lx, ly, 3, z, 5, 28), inner: sideArc(lx, ly, 3, z + 5, P, 20) };
  };
  return {
    run: lamp(0),
    wait: lamp(1),
    stop: lamp(2),
    cap: cyl(lx, ly, 3.3, base + 15.6, 1.6, 28, 0.4),
  };
})();

// ------------------------------------------------------------- the dials
const dialFace = (radius: number, max: number, every: number, major: number) => {
  const arcR = radius - 1.6;
  const point = (angle: number, rr: number): Flat => [rr * Math.cos(angle), rr * Math.sin(angle)];
  const arc: Flat[] = [];
  for (let step = 0; step <= 72; step++) arc.push(point((NEEDLE_ZERO_DEG + (step / 72) * DIAL_SWEEP) * deg, arcR));
  const minor: string[] = [];
  const majorTicks: string[] = [];
  const count = Math.round(max / every);
  for (let k = 0; k <= count; k++) {
    const angle = (NEEDLE_ZERO_DEG + (k / count) * DIAL_SWEEP) * deg;
    const big = Math.abs(((k * every) / major) % 1) < 1e-9;
    (big ? majorTicks : minor).push(pathOf([point(angle, arcR), point(angle, arcR - (big ? 2.6 : 1.4))]));
  }
  const circle = (rr: number) => pathOf(Array.from({ length: 48 }, (_, k) => point((k / 48) * Math.PI * 2, rr)), true);
  return { face: circle(radius), rim: circle(radius - 0.6), arc: pathOf(arc), minor: minor.join(''), major: majorTicks.join(''), hub: circle(1.1), arcR };
};

/** The speed dial on the cabinet door, in its face plane (x right, z down), 0 to 2 m/s, long every half metre a second. */
export const SPEED_FACE = {
  ...dialFace(SPEED_DIAL.r, SPEED_MAX, 0.1, 0.5),
  matrix: sideMatrix([SPEED_DIAL.x, SPEED_DIAL.y + 2.2], SPEED_DIAL.z, P, 'left'),
};
export const speedNeedle = (radius = SPEED_DIAL.r) => `M-2 0L${r1(radius - 2.8)} 0`;
export const speedNeedleDegrees = (speed: number) => NEEDLE_ZERO_DEG + (Math.min(Math.max(speed, 0), SPEED_MAX) / SPEED_MAX) * DIAL_SWEEP;

// --------------------------------------------------------------- the sled
const GAUGE = { x: 15, dialY: 7.6, dialZ: 91, dialR: 9.5 };
/** The bump gauge's dial in its face plane on the sled (before the sled's shift), 0 to 700 N, long every 250 N... */
export const FORCE_FACE = (() => {
  const face = dialFace(GAUGE.dialR, FORCE_MAX, 50, 250);
  const arcR = face.arcR;
  // The limit band: from the limit to the end of the scale, a closed strip inside the arc.
  return { ...face, matrix: sideMatrix([GAUGE.x, GAUGE.dialY], GAUGE.dialZ, P, 'left'), bandOf: (limitN: number) => {
    const from = NEEDLE_ZERO_DEG + (limitN / FORCE_MAX) * DIAL_SWEEP;
    const to = NEEDLE_ZERO_DEG + DIAL_SWEEP;
    const outer: Flat[] = [];
    const inner: Flat[] = [];
    for (let step = 0; step <= 40; step++) {
      const a = (from + ((to - from) * step) / 40) * deg;
      outer.push([arcR * Math.cos(a), arcR * Math.sin(a)]);
      inner.push([(arcR - 1.4) * Math.cos(a), (arcR - 1.4) * Math.sin(a)]);
    }
    const a0 = from * deg;
    return {
      band: pathOf([...outer, ...inner.reverse()], true),
      mark: pathOf([[arcR * Math.cos(a0), arcR * Math.sin(a0)], [(arcR - 3.2) * Math.cos(a0), (arcR - 3.2) * Math.sin(a0)]]),
    };
  } };
})();
export const forceNeedle = () => `M-1.6 0L${r1(GAUGE.dialR - 2.4)} 0`;
export const forceNeedleDegrees = (forceN: number) => NEEDLE_ZERO_DEG + (Math.min(Math.max(forceN, 0), FORCE_MAX) / FORCE_MAX) * DIAL_SWEEP;

/** The sled with the mannequin and the bump gauge, built with the pad's face at x = 0, in painter's order. Its slot is the force needle. */
export type SledSlot = 'force-needle';
export type SledPart = Exclude<Part, { kind: 'slot' }> | { kind: 'slot'; slot: SledSlot };
export const SLED_PARTS: SledPart[] = [];
/** The mannequin's right arm, drawn after the robot so its hand closes on the handle: hanging at its side, or reaching forward (hand guiding). */
export const RIGHT_ARM: { down: Part[]; reach: Part[] } = { down: [], reach: [] };
{
  const list = SLED_PARTS as Part[];
  const S = SLED;
  const z0 = SLED_Z[1];
  // Bogies on the rails, then the sled plate with its edge seam and screws.
  for (const [bx, by] of byDepth<[number, number]>([[6, -TRACK.y], [36, -TRACK.y], [6, TRACK.y], [36, TRACK.y]])) solid(list, slab(box(bx, by, 8, 6, 1), 3.5, SLED_Z[0] - 3.5, 2), 'lo');
  solid(list, slab(S, SLED_Z[0], SLED_Z[1] - SLED_Z[0], 3, 0.6), 'mid', { inner: sideSeam(S, SLED_Z[0] + 1.5, P, 3) });
  screws(list, S, SLED_Z[1], 2.4);
  // The mannequin, far side first: left arm, left leg, right leg, pelvis, waist, chest, neck, head. Its right arm is drawn after the robot.
  const B = BODY_X;
  const limb = (target: Part[], cx: number, cy: number, w: number, d: number, zA: number, zB: number, seamAt?: number) => {
    const plan = box(cx, cy, w, d, Math.min(w, d) / 2 - 0.3);
    solid(target, slab(plan, zA, zB - zA, 6, 0.4), 'hi', seamAt ? { inner: sideSeam(plan, seamAt, P, 6) } : {});
  };
  const ball = (target: Part[], centre: Point3, radius: number) => solid(target, ballOf(centre, radius), 'hi', { crease: 'none' });
  /** An arm hanging at the side, drawn bottom up: hand, forearm, elbow, upper arm, shoulder. */
  const hanging = (target: Part[], ay: number) => {
    ball(target, [B, ay, 80], 3.8);
    limb(target, B, ay, 6.2, 6.2, 83, 105);
    ball(target, [B, ay, 107.5], 3.9);
    limb(target, B, ay, 7, 7, 110, 131, 113);
    ball(target, [B, ay, 133], 4.8);
  };
  hanging(list, -HAND.y);
  for (const fy of [-8.5, 8.5]) {
    solid(list, slab({ x: B - 13, y: fy - 4.5, w: 24, d: 9, r: 3.5 }, z0, 6, 4, 0.4), 'hi');
    limb(list, B, fy, 8.6, 8.6, z0 + 6, 47, 44);
    ball(list, [B, fy, 49.5], 5);
    limb(list, B, fy, 11.6, 11, 52, 86, 55);
  }
  limb(list, B, 0, 16, 30, 84, 98);
  limb(list, B, 0, 14, 25, 98, 115);
  solid(list, slab(box(B, 0, 18, 34, 8.5), 115, 23, 8, 0.6), 'hi', { inner: sideSeam(box(B, 0, 18, 34, 8.5), 127, P, 8) });
  solid(list, cyl(B, 0, 3.6, 138, 9, 24), 'hi');
  ball(list, [B, 0, 156], 9.2);

  // The bump gauge at the sled's front, facing the robot: a foot block and post, the load cell, a spring on its
  // rod out to the pad that stands in for a thigh, and above them the dial box.
  const G = GAUGE.x;
  solid(list, slab(box(G, 0, 12, 14, 1), z0, 3, 2, 0.4), 'mid');
  dots(list, [at([G - 4.4, -5, z0 + 3]), at([G + 4.4, 5, z0 + 3]), at([G - 4.4, 5, z0 + 3]), at([G + 4.4, -5, z0 + 3])], 0.4, 'mid');
  solid(list, cyl(G, 0, 2.2, z0 + 3, PAD_Z - 5.4 - z0 - 3, 20), 'mid', { inner: sideArc(G, 0, 2.2, 40, P, 12) });
  solid(list, discAlong([G + 5, 0, PAD_Z], [-1, 0, 0], 5.4, 10, P, 36), 'mid', { inner: seamAround([G, 0, PAD_Z], [1, 0, 0], 5.4) });
  const spring = coil(2.4, G - 5, [0, PAD_Z], 3.2, 5, 'x', P, 18);
  line(list, spring.back, 'lo');
  solid(list, discAlong([G - 5, 0, PAD_Z], [-1, 0, 0], 1.2, G - 5 - 2.4, P, 16), 'mid');
  line(list, spring.front, 'mid');
  solid(list, discAlong([2.4, 0, PAD_Z], [-1, 0, 0], 6.6, 2.4, P, 44, 0.4), 'hi', { inner: faceRing([0, 0, PAD_Z], [1, 0, 0], 4.6) });
  const DB: Plan = box(G, 1.8, 22, 11.4, 1.4);
  solid(list, slab(box(G, 0, 3, 3, 0.6), PAD_Z + 5.4, GAUGE.dialZ - 11 - PAD_Z - 5.4, 2), 'mid');
  solid(list, slab(DB, GAUGE.dialZ - 11, 22, 3, 0.6), 'mid', { inner: sideSeam(DB, GAUGE.dialZ + 8, P, 3) });
  screws(list, DB, GAUGE.dialZ + 11, 1.8, 0.4);
  list.push({ kind: 'slot', slot: 'force-needle' } as unknown as Part);

  const down = RIGHT_ARM.down;
  const B2 = BODY_X;
  {
    const ballTo = (target: Part[], centre: Point3, radius: number) => solid(target, ballOf(centre, radius), 'hi', { crease: 'none' });
    const limbTo = (target: Part[], w: number, zA: number, zB: number, seamAt?: number) => {
      const plan = box(B2, HAND.y, w, w, w / 2 - 0.3);
      solid(target, slab(plan, zA, zB - zA, 6, 0.4), 'hi', seamAt ? { inner: sideSeam(plan, seamAt, P, 6) } : {});
    };
    ballTo(down, [B2, HAND.y, 80], 3.8);
    limbTo(down, 6.2, 83, 105);
    ballTo(down, [B2, HAND.y, 107.5], 3.9);
    limbTo(down, 7, 110, 131, 113);
    ballTo(down, [B2, HAND.y, 133], 4.8);
    const reach = RIGHT_ARM.reach;
    limbTo(reach, 7, 115, 131, 118);
    ballTo(reach, [B2, HAND.y, 133], 4.8);
    ballTo(reach, [B2, HAND.y, HAND.z], 4);
    solid(reach, barBetween([B2 - 3, HAND.y, HAND.z], [HAND.x + 3, HAND.y, HAND.z], [0, 0, 1], 6, 6, P, 0.3), 'hi');
    ballTo(reach, [HAND.x, HAND.y, HAND.z], 4);
  }
}

/** The sled and the right arm move together along the track: the pad's face is at `personM` from the tool's working point. */
export const sledShift = (personM: number) => translateAlong(P, [personM * UNITS_PER_M, 0, 0]);

// ------------------------------------------------------------- the zone and riders
/** The scanner's zone on the floor: from the scanner to the protective separation distance. */
export function fieldAt(separationM: number) {
  const x1 = separationM * UNITS_PER_M;
  const plan: Plan = { x: SCANNER[0] + 6, y: -46, w: x1 - SCANNER[0] - 6, d: 92, r: 1 };
  const d = planOutline(plan, FLOOR_Z[1], P, 2);
  return {
    fill: d,
    outline: d,
    /** The zone's edge: a strip of floor tape, the part the eye follows. */
    edge: slabOf({ x: x1 - 1.2, y: -46, w: 2.4, d: 92, r: 0.4 }, FLOOR_Z[1], 0.5, P, 2),
    x: x1,
  };
}

/** The model's four terms laid along the ruler from the tool's working point: the robot's reaction and braking, the margin, then the person's walk. */
export function ridersAt(terms: SeparationTerms) {
  const U = UNITS_PER_M;
  const y0 = RULER.y + 6.2;
  const y1 = RULER.y + RULER.d - 1;
  const z = RULER_TOP;
  const span = (from: number, to: number, h: number) =>
    to - from > 0.6 ? slabOf({ x: from + 0.2, y: y0, w: to - from - 0.4, d: y1 - y0, r: 0.4 }, z, h, P, 2) : null;
  const a = terms.robotReactionM * U;
  const b = a + terms.brakingM * U;
  const c = b + terms.marginM * U;
  const d = c + terms.humanTravelM * U;
  return {
    reaction: span(0, a, 1.6),
    braking: span(a, b, 1.6),
    margin: span(b, c, 0.4),
    walk: span(c, d, 1.6),
  };
}

// ---------------------------------------------------------------- the arm
export interface ArmJoints {
  shoulder: Point3;
  elbow: Point3;
  wrist: Point3;
  tcp: Point3;
}

/** Elbow-up inverse kinematics in the arm's plane (y = 0) for a tool pointing straight down at (x, z), in metres. */
export function armJoints(toolXM: number, toolZM: number): ArmJoints {
  const tcp: Point3 = [toolXM * UNITS_PER_M, 0, toolZM * UNITS_PER_M];
  const wrist: Point3 = [tcp[0], 0, tcp[2] + WRIST_ABOVE_TCP];
  const dx = wrist[0] - SHOULDER[0];
  const dz = wrist[2] - SHOULDER[2];
  const reach = Math.min(Math.hypot(dx, dz), UPPER_ARM + FOREARM - 0.01);
  const toward = Math.atan2(dz, dx);
  const bend = Math.acos(Math.min(1, Math.max(-1, (UPPER_ARM ** 2 + reach ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * reach))));
  const up = toward + bend;
  const elbow: Point3 = [SHOULDER[0] + UPPER_ARM * Math.cos(up), 0, SHOULDER[2] + UPPER_ARM * Math.sin(up)];
  return { shoulder: SHOULDER, elbow, wrist, tcp };
}

/** The arm's solids for one tool position, in painter's order; the list's shape never changes, so the live code can rewrite each in place. */
/** The wrist's roll that turns the guiding handle to the viewer's side (toward +y), and away from it (toward -y, via -x). */
export const ROLL_NEAR = Math.PI / 2;
export const ROLL_AWAY = (3 * Math.PI) / 2;

const EMPTY: SolidPaths = { fill: '', outline: '', crease: '', top: '', shades: ['', '', '', ''] };

export function armParts(toolXM: number, toolZM: number, mode: ModeId, roll = ROLL_NEAR): Array<{ paths: SolidPaths; tone: Tone; lit?: boolean; inner?: string; name: string }> {
  const j = armJoints(toolXM, toolZM);
  const out: Array<{ paths: SolidPaths; tone: Tone; lit?: boolean; inner?: string; name: string }> = [];
  const Y: Point3 = [0, 1, 0];
  const put = (name: string, paths: SolidPaths, tone: Tone = 'hi', extra: { lit?: boolean; inner?: string } = {}) => out.push({ name, paths, tone, ...extra });
  const [tx, , tz] = j.tcp;
  const along = (a: Point3, b: Point3): Point3 => [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = (v: Point3) => Math.hypot(v[0], v[1], v[2]);
  // The base housing on the pedestal's flange.
  put('base', kitCylinder(PEDESTAL.x, PEDESTAL.y, 9.4, PEDESTAL_TOP, SHOULDER[2] - 8.4 - PEDESTAL_TOP, P, 40, 0.5), 'hi', { inner: sideArc(PEDESTAL.x, PEDESTAL.y, 9.4, PEDESTAL_TOP + 4, P, 32) });
  // The upper arm, outboard, from the shoulder to the elbow.
  const s1: Point3 = [j.shoulder[0], UPPER_Y, j.shoulder[2]];
  const e1: Point3 = [j.elbow[0], UPPER_Y, j.elbow[2]];
  const ua = along(s1, e1);
  put('upper-arm', discAlong(s1, ua, 5.6, len(ua), P, 32), 'hi', { inner: seamAround(add(s1, [ua[0] * 0.5, 0, ua[2] * 0.5]), ua, 5.6) });
  put('shoulder', discAlong([j.shoulder[0], -7, j.shoulder[2]], Y, 8.6, 30, P, 48, 0.4), 'hi', { inner: seamAround([j.shoulder[0], 17, j.shoulder[2]], Y, 8.6) + faceRing([j.shoulder[0], 23, j.shoulder[2]], Y, 6.4) });
  // The forearm, inboard, from the elbow to wrist 1.
  const e0: Point3 = [j.elbow[0], 0, j.elbow[2]];
  const fa = along(e0, j.wrist);
  put('forearm', discAlong(e0, fa, 4.4, len(fa), P, 32), 'hi', { inner: seamAround(add(e0, [fa[0] * 0.78, 0, fa[2] * 0.78]), fa, 4.4) });
  put('elbow', discAlong([j.elbow[0], -6, j.elbow[2]], Y, 7, 27, P, 44, 0.4), 'hi', { inner: seamAround([j.elbow[0], 15, j.elbow[2]], Y, 7) + faceRing([j.elbow[0], 21, j.elbow[2]], Y, 5.2) });
  // The guiding handle rides wrist 3: a bracket out from it, a grip and its trigger. Turned away from the viewer it is
  // drawn first, behind the wrist; turned toward the viewer, after wrist 3. The other slot stays empty.
  const d: Point3 = [Math.cos(roll), Math.sin(roll), 0];
  const side: Point3 = [-Math.sin(roll), Math.cos(roll), 0];
  const front = d[0] * V[0] + d[1] * V[1] > 0;
  const lit = mode === 'hand-guiding';
  const grip: Point3 = [tx + d[0] * HANDLE.y, d[1] * HANDLE.y, tz + HANDLE.above];
  const handle = (suffix: string, active: boolean) => {
    put(`handle-bracket${suffix}`, active ? barBetween([tx + d[0] * 4.4, d[1] * 4.4, tz + 21], [grip[0] - d[0] * 1.4, grip[1] - d[1] * 1.4, tz + 21], [0, 0, 1], 2.4, 2.4, P, 0.2) : EMPTY, 'mid', { lit: lit && active });
    put(`handle${suffix}`, active ? discAlong([grip[0], grip[1], grip[2] - 10], [0, 0, 1], 1.8, 20, P, 20) : EMPTY, 'hi', { lit: lit && active });
    put(`trigger${suffix}`, active ? barBetween([grip[0] + side[0] * 2.4, grip[1] + side[1] * 2.4, grip[2] - 2], [grip[0] + side[0] * 2.4, grip[1] + side[1] * 2.4, grip[2] + 2], d, 1.6, 1.4, P) : EMPTY, 'mid');
  };
  handle('-back', !front);
  // The wrist, bottom up: fingers, gripper, force sensor, flange, wrist 3, wrist 2, wrist 1.
  for (const fy of [-3.2, 3.2]) put(`finger-${fy < 0 ? 'far' : 'near'}`, slabOf(box(tx, fy, 2.2, 1.6, 0.4), tz, 7, P, 2), 'mid');
  put('gripper', slabOf(box(tx, 0, GRIP_HALF * 2, 9, 1.2), tz + 7, 6, P, 3, 0.4), 'mid', { inner: sideSeam(box(tx, 0, GRIP_HALF * 2, 9, 1.2), tz + 10, P, 3) });
  put('sensor', kitCylinder(tx, 0, 4.6, tz + 13, 3, P, 32), 'mid', { inner: sideArc(tx, 0, 4.6, tz + 14.5, P, 24) });
  put('flange', kitCylinder(tx, 0, 4.2, tz + 16, 1.4, P, 32), 'lo');
  put('wrist-3', kitCylinder(tx, 0, 5, tz + 17.4, 6.6, P, 36, 0.4), 'hi', { inner: sideArc(tx, 0, 5, tz + 19.6, P, 24) });
  handle('', front);
  put('wrist-2', discAlong([tx - 6.4, 0, tz + 29], [1, 0, 0], 5, 12.8, P, 36), 'hi', { inner: faceRing([tx - 6.4, 0, tz + 29], [1, 0, 0], 3.6) });
  put('wrist-1', discAlong([tx, -7, j.wrist[2]], Y, 5.4, 14, P, 36), 'hi', { inner: faceRing([tx, 7, j.wrist[2]], Y, 3.8) });
  return out;
}

// ------------------------------------------------------------------ the run
export type Phase =
  | 'rest'
  | 'setup'
  | 'walk'
  | 'react'
  | 'brake'
  | 'stopped'
  | 'out'
  | 'work'
  | 'in'
  | 'push'
  | 'held'
  | 'approach'
  | 'bump';

export interface CellPose {
  /** The tool's fingertips, metres along the track from the working point, and metres above the floor. */
  toolX: number;
  toolZ: number;
  /** The tool's speed, metres a second. */
  toolSpeed: number;
  /** The sled's pad face, metres from the working point. */
  personX: number;
  /** The bump gauge's held reading, newtons. */
  forceN: number;
  /** The robot holds a safety-rated stop. */
  stopped: boolean;
  /** The wrist's roll, which turns the guiding handle (radians). */
  roll: number;
  phase: Phase;
}

const smooth = (u: number) => {
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** The contact point where the gripper's side meets the bump pad. */
export const bumpTool = (personM: number) => ({ x: personM - GRIP_HALF / UNITS_PER_M, z: (PAD_Z - 10) / UNITS_PER_M });
/** Where the tool's fingertips sit when the mannequin's right hand holds the handle. */
export const guideTool = (personM: number) => ({ x: personM + HAND.x / UNITS_PER_M, z: (HAND.z - HANDLE.above) / UNITS_PER_M });

/** The still pose for each mode: the moment that shows its point. */
export function restPose(mode: ModeId, robotSpeed: number, humanSpeed: number): CellPose {
  if (mode === 'speed-separation') {
    const stopped = protectiveSeparationM(robotSpeed, humanSpeed) > STATION_M;
    return { toolX: 0, toolZ: CARRY_Z_M, toolSpeed: stopped ? 0 : robotSpeed, personX: STATION_M, forceN: 0, stopped, roll: ROLL_NEAR, phase: 'rest' };
  }
  if (mode === 'monitored-stop') return { toolX: 0, toolZ: CARRY_Z_M, toolSpeed: 0, personX: STATION_M, forceN: 0, stopped: true, roll: ROLL_NEAR, phase: 'rest' };
  if (mode === 'hand-guiding') {
    const tool = guideTool(GUIDE_M);
    return { toolX: tool.x, toolZ: tool.z, toolSpeed: 0, personX: GUIDE_M, forceN: 0, stopped: false, roll: ROLL_NEAR, phase: 'rest' };
  }
  const tool = bumpTool(BUMP_M);
  return { toolX: tool.x, toolZ: tool.z, toolSpeed: robotSpeed, personX: BUMP_M, forceN: peakContactForceN(robotSpeed), stopped: false, roll: ROLL_AWAY, phase: 'rest' };
}

export interface Run {
  /** Real seconds; the page plays it SLOW times slower. */
  duration: number;
  at: (t: number) => CellPose;
  /** Separation runs: when the person crosses the zone's edge, and where everything stops. */
  trigger?: { t: number; toolStopX: number; personStopX: number; gapM: number };
}

/** A straight move of `distance` metres that accelerates and brakes at the model's deceleration and cruises at `speed`. */
function moveProfile(distance: number, speed: number) {
  const a = ROBOT_DECELERATION_M_PER_S2;
  if (speed <= 0 || distance <= 0) return { duration: 0, at: () => ({ s: 0, v: 0 }) };
  const ramp = speed / a;
  const rampDistance = (speed * ramp) / 2;
  if (2 * rampDistance >= distance) {
    const half = Math.sqrt(distance / a);
    return {
      duration: 2 * half,
      at: (t: number) => (t < half ? { s: (a * t * t) / 2, v: a * t } : t < 2 * half ? { s: distance - (a * (2 * half - t) ** 2) / 2, v: a * (2 * half - t) } : { s: distance, v: 0 }),
    };
  }
  const cruise = (distance - 2 * rampDistance) / speed;
  const total = 2 * ramp + cruise;
  return {
    duration: total,
    at: (t: number) =>
      t < ramp
        ? { s: (a * t * t) / 2, v: a * t }
        : t < ramp + cruise
          ? { s: rampDistance + speed * (t - ramp), v: speed }
          : t < total
            ? { s: distance - (a * (total - t) ** 2) / 2, v: a * (total - t) }
            : { s: distance, v: 0 },
  };
}

/** The setup that eases from the still pose to a run's first pose, in real seconds. */
const SETUP_S = 0.16;

function eased(from: CellPose, to: CellPose, u: number, phase: Phase): CellPose {
  const e = smooth(u);
  return {
    toolX: lerp(from.toolX, to.toolX, e),
    toolZ: lerp(from.toolZ, to.toolZ, e),
    toolSpeed: 0,
    personX: lerp(from.personX, to.personX, e),
    forceN: lerp(from.forceN, to.forceN, e),
    stopped: to.stopped,
    roll: lerp(from.roll, to.roll, e),
    phase,
  };
}

/**
 * One run of the cell, in real seconds, for a mode and the two speeds.
 *
 * Speed and separation: the person walks in from outside the zone at their
 * speed while the robot works toward them at its speed, timed so the tool is
 * at its working point when the person crosses the zone's edge (the model's
 * worst case). The robot keeps moving for the reaction time, then brakes at
 * the model's deceleration; the person keeps walking until it stops. What is
 * left between them is the margin.
 */
export function cellRun(mode: ModeId, robotSpeed: number, humanSpeed: number): Run {
  const rest = restPose(mode, robotSpeed, humanSpeed);
  if (mode === 'speed-separation') {
    const S = protectiveSeparationM(robotSpeed, humanSpeed);
    const terms = separationTerms(robotSpeed, humanSpeed);
    if (humanSpeed <= 0) {
      // Nobody walks in: the robot works a cycle if it may, then rests.
      if (rest.stopped) return { duration: 0.3, at: () => ({ ...rest, phase: 'stopped' }) };
      const leg = moveProfile(-TRAY_M, robotSpeed);
      const duration = 2 * leg.duration;
      return {
        duration,
        at: (t) => {
          const out = t < leg.duration;
          const m = leg.at(out ? t : t - leg.duration);
          return { ...rest, toolX: out ? -m.s : TRAY_M + m.s, toolSpeed: m.v, phase: 'work' };
        },
      };
    }
    const start = Math.min(OUTSIDE_M, Math.max(S + humanSpeed * LEAD_S, STATION_M));
    const lead = (start - S) / humanSpeed;
    const travel = Math.min(-TRAY_M, robotSpeed * lead);
    const toolStart = -travel;
    const moveFrom = robotSpeed > 0 ? lead - travel / robotSpeed : lead;
    const TR = REACTION_TIME_S;
    const TS = stoppingTimeS(robotSpeed);
    const a = ROBOT_DECELERATION_M_PER_S2;
    const first: CellPose = { toolX: toolStart, toolZ: CARRY_Z_M, toolSpeed: 0, personX: start, forceN: 0, stopped: false, roll: rest.roll, phase: 'setup' };
    const t0 = SETUP_S;
    const tTrigger = t0 + lead;
    const tStop = tTrigger + TR + TS;
    const toolStopX = terms.robotReactionM + terms.brakingM;
    const personStopX = S - terms.humanTravelM;
    return {
      duration: tStop + BEAT_S * 3,
      trigger: { t: tTrigger, toolStopX, personStopX, gapM: personStopX - toolStopX },
      at: (t) => {
        if (t < t0) return eased(rest, first, t / t0, 'setup');
        const w = t - t0;
        if (w < lead) {
          const moving = w >= moveFrom && robotSpeed > 0;
          return {
            toolX: moving ? toolStart + robotSpeed * (w - moveFrom) : toolStart,
            toolZ: CARRY_Z_M,
            toolSpeed: moving ? robotSpeed : 0,
            personX: start - humanSpeed * w,
            forceN: 0,
            stopped: false,
            roll: rest.roll,
            phase: 'walk',
          };
        }
        const r = t - tTrigger;
        const personX = S - humanSpeed * Math.min(r, TR + TS);
        if (r < TR) return { toolX: robotSpeed * r, toolZ: CARRY_Z_M, toolSpeed: robotSpeed, personX, forceN: 0, stopped: false, roll: rest.roll, phase: 'react' };
        const b = r - TR;
        if (b < TS) {
          return {
            toolX: robotSpeed * TR + robotSpeed * b - (a * b * b) / 2,
            toolZ: CARRY_Z_M,
            toolSpeed: robotSpeed - a * b,
            personX,
            forceN: 0,
            stopped: false,
            roll: rest.roll,
            phase: 'brake',
          };
        }
        return { toolX: toolStopX, toolZ: CARRY_Z_M, toolSpeed: 0, personX: personStopX, forceN: 0, stopped: true, roll: rest.roll, phase: 'stopped' };
      },
    };
  }

  if (mode === 'monitored-stop') {
    // The person steps out through the curtain, the robot works, the person steps back in and it stops.
    const walk = Math.min(2, Math.max(0.5, humanSpeed));
    const tOut = (OUTSIDE_M - STATION_M) / walk;
    const tCrossOut = (ENTRANCE_M - STATION_M) / walk;
    const leg = moveProfile(-TRAY_M, robotSpeed);
    const workStart = tCrossOut + BEAT_S;
    // The person turns back halfway through the robot's second leg, so they cross the curtain while it moves.
    const tTurn = Math.max(tOut + BEAT_S, workStart + leg.duration * 1.5 - (OUTSIDE_M - ENTRANCE_M) / walk);
    const tCrossIn = tTurn + (OUTSIDE_M - ENTRANCE_M) / walk;
    const tHome = tTurn + tOut;
    const toolAt = (t: number) => {
      if (t < workStart || robotSpeed <= 0) return { x: 0, v: 0 };
      const w = t - workStart;
      if (w < leg.duration) {
        const m = leg.at(w);
        return { x: -m.s, v: m.v };
      }
      const m = leg.at(Math.min(w - leg.duration, leg.duration));
      return { x: TRAY_M + m.s, v: m.v };
    };
    const atCross = toolAt(tCrossIn);
    const sign = tCrossIn - workStart > leg.duration ? 1 : -1;
    const a = ROBOT_DECELERATION_M_PER_S2;
    const brakeT = atCross.v / a;
    return {
      duration: Math.max(tHome, tCrossIn + brakeT) + BEAT_S * 2,
      at: (t) => {
        const personX = t < tOut ? STATION_M + walk * t : t < tTurn ? OUTSIDE_M : t < tHome ? OUTSIDE_M - walk * (t - tTurn) : STATION_M;
        if (t < tCrossIn) {
          const tool = toolAt(t);
          const outside = t >= workStart;
          return { toolX: tool.x, toolZ: CARRY_Z_M, toolSpeed: tool.v, personX, forceN: 0, stopped: !outside, roll: rest.roll, phase: t < tTurn ? (outside ? 'work' : 'out') : 'in' };
        }
        const b = Math.min(t - tCrossIn, brakeT);
        const v = Math.max(0, atCross.v - a * b);
        return {
          toolX: atCross.x + sign * (atCross.v * b - (a * b * b) / 2),
          toolZ: CARRY_Z_M,
          toolSpeed: v,
          personX,
          forceN: 0,
          stopped: true,
          roll: rest.roll,
          phase: t - tCrossIn < brakeT ? 'brake' : 'stopped',
        };
      },
    };
  }

  if (mode === 'hand-guiding') {
    // The hand pushes the tool back toward the robot; the arm moves only while it is pushed.
    const push = moveProfile(GUIDE_PUSH_M, GUIDE_SPEED_M_S);
    const t0 = BEAT_S;
    return {
      duration: t0 + push.duration + BEAT_S * 3,
      at: (t) => {
        if (t < t0) return { ...rest, phase: 'held' };
        const m = push.at(t - t0);
        const personX = GUIDE_M - m.s;
        const tool = guideTool(personX);
        return { toolX: tool.x, toolZ: tool.z, toolSpeed: m.v, personX, forceN: 0, stopped: false, roll: rest.roll, phase: m.v > 0 || t - t0 < push.duration ? 'push' : 'held' };
      },
    };
  }

  // Power and force limiting: back off to the fixture, then bump the pad at the robot's speed.
  const contact = bumpTool(BUMP_M);
  const home: CellPose = { toolX: 0, toolZ: CARRY_Z_M, toolSpeed: 0, personX: BUMP_M, forceN: 0, stopped: false, roll: rest.roll, phase: 'setup' };
  const dx = contact.x - home.toolX;
  const dz = contact.z - home.toolZ;
  const pathM = Math.hypot(dx, dz);
  const t0 = SETUP_S + BEAT_S;
  const approach = robotSpeed > 0 ? pathM / robotSpeed : 0;
  const omega = Math.sqrt(BODY_CONTACT_STIFFNESS_N_PER_M / CONTACT_EFFECTIVE_MASS_KG);
  const squeeze = Math.PI / (2 * omega);
  const peak = peakContactForceN(robotSpeed);
  return {
    duration: t0 + approach + squeeze + BEAT_S * 3,
    at: (t) => {
      if (t < SETUP_S) return eased(rest, home, t / SETUP_S, 'setup');
      if (t < t0 || robotSpeed <= 0) return { ...home, phase: 'setup' };
      const w = t - t0;
      if (w < approach) {
        const u = w / approach;
        return { toolX: home.toolX + dx * u, toolZ: home.toolZ + dz * u, toolSpeed: robotSpeed, personX: BUMP_M, forceN: 0, stopped: false, roll: rest.roll, phase: 'approach' };
      }
      const c = Math.min(w - approach, squeeze);
      // The pad's spring takes the tool's energy: the force rises as k times the squeeze, F = v sqrt(k m) at its peak.
      return {
        toolX: contact.x,
        toolZ: contact.z,
        toolSpeed: robotSpeed * Math.cos(omega * c),
        personX: BUMP_M,
        forceN: peak * Math.sin(omega * c),
        stopped: false,
        roll: rest.roll,
        phase: 'bump',
      };
    },
  };
}
