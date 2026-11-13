/**
 * The actuator test bench for GearRatioBench, drawn with the isometric kit.
 *
 * The object is the explanation. One motor drives a joint through a gear
 * cassette whose cover is off, so the gears show. The cassette's output
 * carries a lever (the one lit part) that lifts a hanger of slotted weights
 * off a pedestal, swinging over a protractor. Two dials on a small panel
 * read what the joint does: a tachometer for how fast the output turns, and
 * a push-back gauge for how heavy the motor feels to anything that pushes
 * the joint from outside. Swapping the cassette changes the gear ratio. A
 * higher ratio multiplies the motor's torque (more weights on the hanger),
 * divides its speed by the same factor (the lever creeps while the gears
 * inside spin fast), and multiplies the motor's inertia felt at the joint by
 * the ratio squared (the push-back needle swings up the log scale).
 *
 * World units are about half a millimetre: x to the right, y toward the
 * viewer, z up. The motor's axis runs along y at AXIS_Z. Static parts are
 * built once here; the cassette face, the lever with its weights and the
 * two needles are rebuilt as SVG strings by the live code each frame.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  dotsSvg,
  fitProjection,
  insetPlan,
  iso,
  lineSvg,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideSeam,
  slabOf,
  solidSvg,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong, plateIn, viewOf } from '../prism.ts';
import { phoneFitOf } from '../phone-fit.ts';

export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 60;
export const ELEVATION = 27;

// ---------------------------------------------------------------- the model
/**
 * The bench's motor is a teaching motor: one motor for every cassette, so
 * only the gear changes. Its rotor inertia is the MIT Cheetah's (Wensing et
 * al. 2017, 3.0279 × 10⁻⁴ kg m²); its peak torque and top speed are round
 * teaching numbers, not a product's.
 */
export const MOTOR = { peakTorque: 2.5, topSpeedRpm: 3000, rotorInertia: 3.0279e-4 } as const;
/** The lever is 25 cm long, and each slotted weight is 5 kg. */
export const LEVER_M = 0.25;
export const WEIGHT_KG = 5;
const GRAVITY = 9.81;

export type DriveId = 'leg' | 'humanoid' | 'arm';
export interface Drive {
  id: DriveId;
  /** The preset's button label. */
  label: string;
  ratio: number;
  /** How the cassette is built: one or two planetary stages, or a strain-wave gear. */
  kind: 'planetary' | 'two-stage' | 'strain-wave';
  /** Share of the motor's torque that reaches the joint (teaching values; the strain-wave one is read off the maker's chart). */
  efficiency: number;
  /** The real design the ratio comes from. */
  example: string;
}

export const DRIVES: readonly Drive[] = [
  { id: 'leg', label: 'Leg, 5.8 to 1', ratio: 5.8, kind: 'planetary', efficiency: 0.95, example: 'MIT Cheetah leg actuator, one planetary stage' },
  { id: 'humanoid', label: 'Humanoid, 36 to 1', ratio: 36, kind: 'two-stage', efficiency: 0.9, example: 'AGILOped humanoid joint, two planetary stages' },
  { id: 'arm', label: 'Arm, 100 to 1', ratio: 100, kind: 'strain-wave', efficiency: 0.75, example: 'Harmonic Drive CSF strain-wave gear' },
];
export const driveOf = (id: DriveId): Drive => DRIVES.find((drive) => drive.id === id) ?? DRIVES[0]!;

export interface Joint {
  /** Peak torque at the joint, newton-meters. */
  torque: number;
  /** Top speed at the joint, turns a minute. */
  speedRpm: number;
  /** How many times heavier the motor's rotor feels from outside the joint: the ratio squared. */
  heavier: number;
  /** The rotor inertia as felt at the joint, kg m². */
  reflected: number;
  /** The mass the lever holds at peak torque, kg. */
  holdsKg: number;
  /** Whole 5 kg weights on the hanger. */
  weights: number;
}

/** The true model: torque times ratio times efficiency, speed over ratio, inertia times ratio squared. */
export function jointOf(drive: Drive): Joint {
  const { ratio, efficiency } = drive;
  const torque = MOTOR.peakTorque * ratio * efficiency;
  const holdsKg = torque / (GRAVITY * LEVER_M);
  return {
    torque,
    speedRpm: MOTOR.topSpeedRpm / ratio,
    heavier: ratio * ratio,
    reflected: MOTOR.rotorInertia * ratio * ratio,
    holdsKg,
    weights: Math.max(1, Math.floor(holdsKg / WEIGHT_KG)),
  };
}

// ---------------------------------------------------------------- the layout
const BASE: Plan = { x: -112, y: -96, w: 200, d: 134, r: 8 };
const BASE_H = 7;
const FOOT_H = 5;
export const AXIS_Z = 54;
/** The cassette housing: a drum on the motor's axis, its open face at y = 0. */
const HOUSING_R = 30;
const HOUSING_Y0 = -16;
const FACE_Y = 0;
const CAVITY_R = 27.4;
/** The motor behind the flange plate. */
const MOTOR_R = 21;
const MOTOR_Y: [number, number] = [-80, -24];
const FLANGE: Plan = { x: -36, y: -24, w: 72, d: 7, r: 1.4 };
const FLANGE_TOP = AXIS_Z + 36;
/** The lever: hub on the output, arm to the tip, the hanger below the tip. */
export const LEVER_LEN = 62;
const LEVER_Y: [number, number] = [5, 9];
const HANGER_Y = 12;
const ROD_LEN = 23;
const PAN_R = 8.5;
const PAN_H = 1.8;
const WEIGHT_R = 6.8;
const WEIGHT_H = 1.2;
/** The lever's swing, degrees: resting on the pedestal at the bottom. */
export const LOW_DEG = -18;
export const HIGH_DEG = 18;
export const REST_DEG = 9;
/** The protractor behind the lever's tip. */
const SECTOR = { r0: 44, r1: 72, from: -26, to: 26, y: -5, t: 2 };
/** The gauge panel at the front left, its two dials. */
const PANEL: Plan = { x: -104, y: 24, w: 56, d: 4, r: 1 };
const PANEL_TOP = 40;
const DIAL_Z = 23;
const DIAL_R = 10.5;
const TACH_X = -89.5;
const PUSH_X = -62.5;
const DIAL_Y = PANEL.y + PANEL.d + 0.2;
const DIAL_SWEEP = (120 * Math.PI) / 180;
export const TACH_MAX = 600;
/** The push-back dial runs on a log scale from 1 to 10,000 times. */
export const PUSH_DECADES = 4;
const DRIVER: Plan = { x: -98, y: -88, w: 36, d: 24, r: 2 };
const DRIVER_H = 22;
const LABEL: Plan = { x: 42, y: 25, w: 38, d: 9, r: 1.6 };

// ------------------------------------------------------------------- camera
const tipAt = (deg: number): Point3 => {
  const a = (deg * Math.PI) / 180;
  return [LEVER_LEN * Math.cos(a), LEVER_Y[1], AXIS_Z + LEVER_LEN * Math.sin(a)];
};
const PEDESTAL_X = tipAt(LOW_DEG)[0];
const PEDESTAL_TOP = tipAt(LOW_DEG)[2] - ROD_LEN - PAN_H;

const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([FLANGE.x, FLANGE.y, FLANGE_TOP + 2], [FLANGE.x + FLANGE.w, FLANGE.y, FLANGE_TOP + 2], [0, MOTOR_Y[0], AXIS_Z + MOTOR_R + 10]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION });
/** The machine's own window, shown on a phone in place of the full viewBox. */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 10 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const V = viewOf(P);
const Y_AXIS: Point3 = [0, 1, 0];
const round1 = (value: number) => Math.round(value * 10) / 10;

/** A point on a face that looks along +y: (u right, v up) about (cx, cz). */
const onFace = (cx: number, y: number, cz: number) => (u: number, v: number): Point3 => [cx + u, y, cz + v];
/** A closed polygon of (u, v) points on the face plane y. */
const facePath = (points: Array<[number, number]>, cx: number, y: number, cz: number, closed = true) => {
  const f = onFace(cx, y, cz);
  return pathOf(points.map(([u, v]) => at(f(u, v))), closed);
};
const circleUV = (r: number, steps = 64, phase = 0): Array<[number, number]> =>
  Array.from({ length: steps }, (_, k) => {
    const a = phase + (k / steps) * Math.PI * 2;
    return [r * Math.cos(a), r * Math.sin(a)];
  });

/** The front half of a ring round a drum whose axis runs along y: a seam or band you can see. */
function drumArc(cx: number, y: number, cz: number, r: number, steps = 40): string {
  const centre = Math.atan2(V[2], V[0]);
  const points: Flat[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = centre - Math.PI / 2 + (k / steps) * Math.PI;
    points.push(at([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]));
  }
  return pathOf(points);
}
/** Lines along a drum, on the side you can see: ribs on the motor can. */
function drumRibs(cx: number, cz: number, r: number, y0: number, y1: number, count: number): string {
  const centre = Math.atan2(V[2], V[0]);
  const out: string[] = [];
  for (let k = 1; k < count; k++) {
    const a = centre - Math.PI / 2 + (k / count) * Math.PI;
    out.push(pathOf([at([cx + r * Math.cos(a), y0, cz + r * Math.sin(a)]), at([cx + r * Math.cos(a), y1, cz + r * Math.sin(a)])]));
  }
  return out.join('');
}

// -------------------------------------------------------------------- parts
export type Slot = 'cassette' | 'lever' | 'tach' | 'push';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

const parts: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => parts.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => parts.push({ kind: 'line', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => parts.push({ kind: 'dots', points: points.map(at), size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => parts.push({ kind: 'face', d, fill });
const slot = (name: Slot) => parts.push({ kind: 'slot', slot: name });
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];

// The base: a plate on four turned feet, a seam round its side, a groove and corner screws.
for (const [x, y] of byDepth(corners(BASE, 16))) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), 'lo');
  solid(cyl(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.4, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
for (const [x, y] of corners(BASE, 9)) line(ring(x, y, 2.3, 0, P, 16), 'lo');
dots(corners(BASE, 9).map(([x, y]) => [x, y, 0] as Point3), 0.55);

// The motor driver at the back left: a box with a seam, closed vent slots, a connector and a status lamp.
solid(slab(DRIVER, 0, DRIVER_H, 3, 0.6), 'mid', { inner: sideSeam(DRIVER, 5, P, 3) });
line(planOutline(insetPlan(DRIVER, 2.6), DRIVER_H, P, 3), 'faint');
line(
  [0, 1, 2].map((k) => facePath([[-11, 0], [11, 0], [11, 1.4], [-11, 1.4]], DRIVER.x + DRIVER.w / 2, DRIVER.y + DRIVER.d, 9 + k * 3.2)).join(''),
  'lo',
);
dots(corners(DRIVER, 3).map(([x, y]) => [x, y, DRIVER_H] as Point3), 0.45);
solid(cyl(DRIVER.x + DRIVER.w - 9, DRIVER.y + 12, 3.2, DRIVER_H, 3.4, 20, 0.3), 'mid');
dots([[DRIVER.x + 7, DRIVER.y + DRIVER.d - 5, DRIVER_H]], 0.9, 'hi');

// The motor: two cradles, the ribbed can on its axis, a cable gland on top, and the cable to the driver.
for (const y of [MOTOR_Y[0] + 5, MOTOR_Y[1] - 9]) {
  const cradle: Plan = { x: -15, y, w: 30, d: 6, r: 1 };
  solid(slab(cradle, 0, AXIS_Z - MOTOR_R + 3, 2, 0.4), 'mid', { inner: sideSeam(cradle, 4, P, 2) });
}
solid(discAlong([0, MOTOR_Y[0], AXIS_Z], Y_AXIS, MOTOR_R, MOTOR_Y[1] - MOTOR_Y[0], P, 64), 'mid', {
  inner: [MOTOR_Y[0] + 4, MOTOR_Y[1] - 4].map((y) => drumArc(0, y, AXIS_Z, MOTOR_R)).join(''),
});
line(drumRibs(0, AXIS_Z, MOTOR_R, MOTOR_Y[0] + 4, MOTOR_Y[1] - 4, 18), 'faint');
const GLAND: Point3 = [0, MOTOR_Y[0] + 9, AXIS_Z + MOTOR_R - 1];
solid(cyl(GLAND[0], GLAND[1], 3.4, GLAND[2], 4, 20, 0.3), 'mid');
parts.push({
  kind: 'wire',
  from: at([GLAND[0], GLAND[1], GLAND[2] + 4]),
  // The cable sags from the gland to the driver: a cubic curve that leaves the gland upward and drops onto the connector.
  via: Array.from({ length: 15 }, (_, k): Point3 => {
    const t = (k + 1) / 16;
    const a: Point3 = [GLAND[0], GLAND[1], GLAND[2] + 4];
    const b: Point3 = [GLAND[0], GLAND[1], GLAND[2] + 18];
    const c: Point3 = [DRIVER.x + DRIVER.w - 9, DRIVER.y + 12, DRIVER_H + 30];
    const d: Point3 = [DRIVER.x + DRIVER.w - 9, DRIVER.y + 12, DRIVER_H + 3.4];
    const w = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
    return [0, 1, 2].map((i) => w[0]! * a[i]! + w[1]! * b[i]! + w[2]! * c[i]! + w[3]! * d[i]!) as Point3;
  }).map(at),
  to: at([DRIVER.x + DRIVER.w - 9, DRIVER.y + 12, DRIVER_H + 3.4]),
  tone: 'mid',
});

// The flange plate the motor and the cassette bolt to, on a foot bar, with its four bolts.
solid(slab({ x: -44, y: FLANGE.y - 8, w: 88, d: 22, r: 2 }, 0, 4, 3, 0.5), 'mid');
dots([[-38, FLANGE.y - 4, 4], [38, FLANGE.y - 4, 4], [-38, FLANGE.y + 10, 4], [38, FLANGE.y + 10, 4]], 0.5);
solid(slab(FLANGE, 4, FLANGE_TOP - 4, 2, 0.6), 'mid', { inner: sideSeam(FLANGE, FLANGE_TOP - 6, P, 2) });
dots(
  [[-29, FLANGE.y + FLANGE.d, AXIS_Z - 29], [29, FLANGE.y + FLANGE.d, AXIS_Z - 29], [-29, FLANGE.y + FLANGE.d, AXIS_Z + 29], [29, FLANGE.y + FLANGE.d, AXIS_Z + 29]],
  0.6,
);

// The cassette's cradle, then the cassette itself (drawn live: its drum, the gears behind its open face).
{
  const cradle: Plan = { x: -22, y: HOUSING_Y0 + 1, w: 44, d: 13, r: 1.4 };
  solid(slab(cradle, 0, AXIS_Z - HOUSING_R + 5, 2, 0.5), 'mid', { inner: sideSeam(cradle, 5, P, 2) });
  dots([[cradle.x + 3.5, cradle.y + cradle.d, 3], [cradle.x + cradle.w - 3.5, cradle.y + cradle.d, 3]], 0.5);
}
slot('cassette');

// The protractor behind the lever's tip: a sector plate on a post, ticks every 4 degrees from its outer edge.
{
  // A bracket from the flange plate's face carries the plate.
  const bracket: Plan = { x: 30, y: FLANGE.y + FLANGE.d, w: 16, d: SECTOR.y - SECTOR.t - FLANGE.y - FLANGE.d, r: 0.8 };
  solid(slab(bracket, AXIS_Z - 7, 14, 2, 0.4), 'mid');
  dots([[bracket.x + 4, bracket.y + bracket.d / 2, AXIS_Z + 7], [bracket.x + bracket.w - 4, bracket.y + bracket.d / 2, AXIS_Z + 7]], 0.45);
  const outline: Array<[number, number]> = [];
  for (let k = 0; k <= 16; k++) {
    const a = ((SECTOR.from + ((SECTOR.to - SECTOR.from) * k) / 16) * Math.PI) / 180;
    outline.push([SECTOR.r1 * Math.cos(a), SECTOR.r1 * Math.sin(a)]);
  }
  for (let k = 16; k >= 0; k--) {
    const a = ((SECTOR.from + ((SECTOR.to - SECTOR.from) * k) / 16) * Math.PI) / 180;
    outline.push([SECTOR.r0 * Math.cos(a), SECTOR.r0 * Math.sin(a)]);
  }
  solid(plateIn([0, SECTOR.y - SECTOR.t, AXIS_Z], [1, 0, 0], [0, 0, 1], outline, SECTOR.t, P, 0.4), 'mid');
  const minor: string[] = [];
  const major: string[] = [];
  for (let deg = -24; deg <= 24; deg += 4) {
    const a = (deg * Math.PI) / 180;
    const long = deg % 12 === 0;
    const r0 = SECTOR.r1 - 0.2;
    const r1 = r0 - (long ? 6 : 3.4);
    (long ? major : minor).push(facePath([[r0 * Math.cos(a), r0 * Math.sin(a)], [r1 * Math.cos(a), r1 * Math.sin(a)]], 0, SECTOR.y, AXIS_Z, false));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  dots([[(SECTOR.r0 + 4) * Math.cos(0.35), SECTOR.y, AXIS_Z + (SECTOR.r0 + 4) * Math.sin(0.35)], [(SECTOR.r0 + 4) * Math.cos(-0.35), SECTOR.y, AXIS_Z - (SECTOR.r0 + 4) * Math.sin(0.35)]], 0.45);
}

// The pedestal the hanger rests on when the lever is down.
solid(cyl(PEDESTAL_X, HANGER_Y, 11, 0, 2, 32, 0.3), 'lo');
solid(cyl(PEDESTAL_X, HANGER_Y, 7, 2, PEDESTAL_TOP - 2, 28), 'mid');

slot('lever');

// The label plate on the base at the front right, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 7, LABEL.y + 2.6 + row * 2], [LABEL.x + (row === 1 ? 22 : 31), LABEL.y + 2.6 + row * 2]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.4, LABEL.y + LABEL.d / 2, 0.8]], 0.5);

// The gauge panel: two feet, the upright plate, two dials with bezels and ticks, and a knob under each.
for (const x of [PANEL.x + 8, PANEL.x + PANEL.w - 8]) solid(slab({ x: x - 5, y: PANEL.y - 6, w: 10, d: 16, r: 1.4 }, 0, 4, 2, 0.4), 'mid');
solid(slab(PANEL, 4, PANEL_TOP - 4, 2, 0.5), 'mid', { inner: sideSeam(PANEL, 9, P, 2) });
dots(corners({ ...PANEL, y: PANEL.y }, 0).slice(2).map(([x]) => [x + (x < PANEL.x + 1 ? 3 : -3), DIAL_Y, PANEL_TOP - 3] as Point3), 0.5);
for (const cx of [TACH_X, PUSH_X]) {
  face(facePath(circleUV(DIAL_R, 64), cx, DIAL_Y, DIAL_Z), 'top');
  line(facePath(circleUV(DIAL_R, 64), cx, DIAL_Y, DIAL_Z), 'mid');
  line(facePath(circleUV(DIAL_R - 1.5, 64), cx, DIAL_Y, DIAL_Z), 'lo');
  solid(discAlong([cx, PANEL.y + PANEL.d, 8], Y_AXIS, 2.4, 2.6, P, 18), 'mid');
}
{
  // Tachometer: a tick every 50 turns a minute, long ones every 100, the zero in ink.
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; k <= TACH_MAX / 50; k++) {
    const a = -DIAL_SWEEP + (2 * DIAL_SWEEP * k) / (TACH_MAX / 50);
    const long = k % 2 === 0;
    const r0 = DIAL_R - 1.5;
    const r1 = r0 - (long ? 2.2 : 1.2);
    (long ? major : minor).push(facePath([[r0 * Math.sin(a), r0 * Math.cos(a)], [r1 * Math.sin(a), r1 * Math.cos(a)]], TACH_X, DIAL_Y, DIAL_Z, false));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  // Push-back: log scale, a long tick at each power of ten, short ones at 2 to 9 times.
  const pMinor: string[] = [];
  const pMajor: string[] = [];
  for (let decade = 0; decade <= PUSH_DECADES; decade++) {
    for (let k = 1; k <= (decade === PUSH_DECADES ? 1 : 9); k++) {
      const value = k * 10 ** decade;
      const a = pushAngle(value);
      const long = k === 1;
      const r0 = DIAL_R - 1.5;
      const r1 = r0 - (long ? 2.2 : 1.1);
      (long ? pMajor : pMinor).push(facePath([[r0 * Math.sin(a), r0 * Math.cos(a)], [r1 * Math.sin(a), r1 * Math.cos(a)]], PUSH_X, DIAL_Y, DIAL_Z, false));
    }
  }
  line(pMinor.join(''), 'lo');
  line(pMajor.join(''), 'mid');
}
slot('tach');
slot('push');

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------------- live parts
/** The tachometer needle's angle for a speed in turns a minute. */
export function tachAngle(rpm: number) {
  return -DIAL_SWEEP + (2 * DIAL_SWEEP * Math.max(0, Math.min(rpm, TACH_MAX))) / TACH_MAX;
}
/** The push-back needle's angle for "times heavier", on the log scale from 1 to 10,000. */
export function pushAngle(times: number) {
  const share = Math.max(0, Math.min(Math.log10(Math.max(times, 1)) / PUSH_DECADES, 1));
  return -DIAL_SWEEP + 2 * DIAL_SWEEP * share;
}
/** A dial's needle as SVG: a line from a short tail through the hub to the tip, and the hub dot. */
export function needleSvg(dial: 'tach' | 'push', angle: number): string {
  const cx = dial === 'tach' ? TACH_X : PUSH_X;
  const y = DIAL_Y + 0.2;
  const r = DIAL_R - 3.2;
  const d = pathOf([at([cx - 2 * Math.sin(angle), y, DIAL_Z - 2 * Math.cos(angle)]), at([cx + r * Math.sin(angle), y, DIAL_Z + r * Math.cos(angle)])]);
  return `${lineSvg(d, { tone: 'hi', free: true })}${dotsSvg([at([cx, y, DIAL_Z])], { size: 1.1, tone: 'hi' })}`;
}

/** A spur gear's outline on a face, `teeth` trapezoid teeth on pitch radius `r` (internal: teeth point in). */
function gearUV(r: number, teeth: number, phase: number, internal = false): Array<[number, number]> {
  const m = (2 * r) / teeth;
  const tip = internal ? r - m : r + m;
  const root = internal ? r + 1.2 * m : r - 1.2 * m;
  const pitch = (Math.PI * 2) / teeth;
  const out: Array<[number, number]> = [];
  for (let k = 0; k < teeth; k++) {
    const a = phase + k * pitch;
    for (const [da, rr] of [[-0.3, root], [-0.15, tip], [0.15, tip], [0.3, root]] as const) {
      out.push([rr * Math.cos(a + da * pitch), rr * Math.sin(a + da * pitch)]);
    }
  }
  return out;
}
/** An ellipse on a face, semi-axes a and b, its long axis at `turn`. */
function ellipseUV(a: number, b: number, turn: number, steps = 72): Array<[number, number]> {
  return Array.from({ length: steps }, (_, k) => {
    const t = (k / steps) * Math.PI * 2;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    return [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)];
  });
}

const PLANETARY = { sun: 10, ring: 48, planets: 4 };
const STAGE2 = { sun: 10, ring: 50, planets: 3 };

/**
 * The cassette for a drive, as SVG: its drum and bands, the dark cavity behind the open face and the
 * gears in it, posed for the motor's angle (radians) and the output's angle.
 */
export function cassetteSvg(drive: Drive, motorAngle: number, outputAngle: number): string {
  const out: string[] = [];
  const cx = 0;
  const cz = AXIS_Z;
  const len = FACE_Y - HOUSING_Y0;
  const bands = drive.kind === 'two-stage' ? [HOUSING_Y0 + 4, HOUSING_Y0 + len / 2, FACE_Y - 3] : [HOUSING_Y0 + 4, FACE_Y - 3];
  out.push(
    solidSvg(discAlong([cx, HOUSING_Y0, cz], Y_AXIS, HOUSING_R, len, P, 72, 0.6), {
      tone: 'mid',
      inner: lineSvg(bands.map((y) => drumArc(cx, y, cz, HOUSING_R)).join(''), { tone: 'faint' }),
    }),
  );
  // The lifting handle on top of the drum, so the cassette can be swapped.
  for (const x of [-9, 9]) out.push(solidSvg(kitCylinder(x, HOUSING_Y0 + len / 2, 1.6, cz + HOUSING_R - 1, 6, P, 14), { tone: 'mid' }));
  out.push(solidSvg(slabOf({ x: -11.5, y: HOUSING_Y0 + len / 2 - 2, w: 23, d: 4, r: 1.8 }, cz + HOUSING_R + 5, 2.4, P, 3, 0.4), { tone: 'mid' }));
  // The cavity behind the face, its rim bolts.
  out.push(`<path class="iso-shade" data-shade="0" d="${facePath(circleUV(CAVITY_R, 72), cx, FACE_Y, cz)}"/>`);
  out.push(lineSvg(facePath(circleUV(CAVITY_R, 72), cx, FACE_Y, cz), { tone: 'lo' }));
  out.push(dotsSvg(circleUV(HOUSING_R - 1.3, 10, 0.3).map(([u, v]) => at([cx + u, FACE_Y, cz + v])), { size: 0.5, tone: 'mid' }));
  const gy = FACE_Y - 2;
  if (drive.kind === 'strain-wave') {
    // Circular spline (fixed, teeth on the inside of the cavity), flexspline (turns with the output),
    // wave generator (the elliptical cam on the motor shaft, its bearing ring and hub).
    out.push(lineSvg(facePath(gearUV(25.6, 101, 0, true), cx, gy, cz), { tone: 'faint' }));
    const turn = motorAngle;
    const outer = ellipseUV(25.2, 23.4, turn, 96);
    const inner = ellipseUV(22.4, 20.6, turn, 96);
    const ringD = facePath(outer, cx, gy + 0.6, cz) + facePath([...inner].reverse(), cx, gy + 0.6, cz);
    out.push(`<path class="iso-top" fill-rule="evenodd" d="${ringD}"/>`);
    out.push(lineSvg(facePath(outer, cx, gy + 0.6, cz), { tone: 'mid' }));
    out.push(lineSvg(facePath(inner, cx, gy + 0.6, cz), { tone: 'lo' }));
    // Every second flexspline tooth as a short mark from its outer edge, turning with the output.
    const marks: string[] = [];
    for (let k = 0; k < 100; k++) {
      const t = outputAngle + (k / 100) * Math.PI * 2;
      const local = t - turn;
      const ra = 25.2 * 23.4 / Math.hypot(23.4 * Math.cos(local), 25.2 * Math.sin(local));
      marks.push(facePath([[ra * Math.cos(t), ra * Math.sin(t)], [(ra - 1.1) * Math.cos(t), (ra - 1.1) * Math.sin(t)]], cx, gy + 0.6, cz, false));
    }
    out.push(lineSvg(marks.join(''), { tone: 'faint' }));
    out.push(`<path class="iso-shade" data-shade="2" d="${facePath(ellipseUV(20.4, 18.6, turn), cx, gy + 1.2, cz)}"/>`);
    out.push(lineSvg(facePath(ellipseUV(20.4, 18.6, turn), cx, gy + 1.2, cz), { tone: 'mid' }));
    out.push(lineSvg(facePath(ellipseUV(17.6, 15.8, turn), cx, gy + 1.2, cz), { tone: 'lo' }));
    const balls = ellipseUV(19, 17.2, turn, 22).map(([u, v]) => at([cx + u, gy + 1.2, cz + v]));
    out.push(dotsSvg(balls, { size: 0.75, tone: 'lo' }));
    out.push(solidSvg(discAlong([cx, gy + 1.2, cz], Y_AXIS, 10, 1.6, P, 40), { tone: 'mid' }));
    // The output marker on the flexspline rim: the slow part.
    const [mu, mv] = [22.2 * Math.cos(outputAngle), 22.2 * Math.sin(outputAngle)];
    out.push(dotsSvg([at([cx + mu, gy + 0.6, cz + mv])], { size: 1.1, tone: 'hi' }));
    return out.join('');
  }
  // Planetary: the ring's teeth on the cavity wall, the sun on the (stage's) input, the planets on the carrier.
  const stage = drive.kind === 'two-stage' ? STAGE2 : PLANETARY;
  const stageRatio = 1 + stage.ring / stage.sun;
  const sunAngle = drive.kind === 'two-stage' ? motorAngle / (drive.ratio / stageRatio) : motorAngle;
  const carrier = outputAngle;
  const m = (2 * 25.4) / stage.ring;
  const sunR = (m * stage.sun) / 2;
  const planetR = (m * (stage.ring - stage.sun)) / 4;
  const orbit = sunR + planetR;
  out.push(lineSvg(facePath(gearUV(25.4, stage.ring, 0, true), cx, gy, cz), { tone: 'lo' }));
  const planets = Array.from({ length: stage.planets }, (_, k) => carrier + (k / stage.planets) * Math.PI * 2)
    .map((a) => ({ a, centre: [cx + orbit * Math.cos(a), cz + orbit * Math.sin(a)] as [number, number] }))
    .sort((p, q) => depthOf([p.centre[0], 0, p.centre[1]], P) - depthOf([q.centre[0], 0, q.centre[1]], P));
  // A planet spins backward on its pin: relative to the carrier it turns -sun·(sun teeth / planet teeth).
  const spin = carrier - (sunAngle - carrier) * (stage.sun / ((stage.ring - stage.sun) / 2));
  for (const { centre } of planets) {
    out.push(
      solidSvg(discAlong([centre[0], gy, centre[1]], Y_AXIS, planetR + m, 2.2, P, 44), {
        tone: 'mid',
        inner: lineSvg(facePath(gearUV(planetR, (stage.ring - stage.sun) / 2, spin), centre[0], gy + 2.2, centre[1]), { tone: 'lo' }),
      }),
    );
  }
  out.push(
    solidSvg(discAlong([cx, gy, cz], Y_AXIS, sunR + m, 2.2, P, 32), {
      tone: 'hi',
      inner: lineSvg(facePath(gearUV(sunR, stage.sun, sunAngle), cx, gy + 2.2, cz), { tone: 'lo' }),
    }),
  );
  // The carrier: arms from the output hub to each planet pin, the pins themselves.
  for (const { centre } of planets) {
    out.push(solidSvg(barBetween([cx, gy + 2.4, cz], [centre[0], gy + 2.4, centre[1]], Y_AXIS, 1.4, 3.6, P, 0.2), { tone: 'mid' }));
  }
  for (const { centre } of planets) out.push(solidSvg(discAlong([centre[0], gy + 2.2, centre[1]], Y_AXIS, 2.4, 2.2, P, 18), { tone: 'mid' }));
  return out.join('');
}

/** The lever at `deg` degrees with `weights` slotted weights on its hanger, as SVG. */
export function leverSvg(deg: number, weights: number): string {
  const out: string[] = [];
  const tip = tipAt(deg);
  const centre: Point3 = [0, LEVER_Y[0], AXIS_Z];
  // The output hub on the carrier, the lit arm to the tip, the tip boss and its pin.
  out.push(solidSvg(discAlong([0, FACE_Y + 0.2, AXIS_Z], Y_AXIS, 8.5, LEVER_Y[0] - FACE_Y - 0.2, P, 40, 0.4), { tone: 'mid' }));
  out.push(dotsSvg([0, 1, 2, 3, 4, 5].map((k) => {
    const a = (deg * Math.PI) / 180 + (k / 6) * Math.PI * 2 + 0.5;
    return at([6.2 * Math.cos(a), LEVER_Y[0], AXIS_Z + 6.2 * Math.sin(a)]);
  }), { size: 0.45, tone: 'mid' }));
  const mid = (LEVER_Y[0] + LEVER_Y[1]) / 2;
  // The lit part: the arm, on the kit's standard lit treatment.
  out.push(solidSvg(barBetween([centre[0], mid, centre[2]], [tip[0], mid, tip[2]], Y_AXIS, LEVER_Y[1] - LEVER_Y[0], 7, P, 0.5), { tone: 'hi', lit: true }));
  out.push(solidSvg(discAlong([0, LEVER_Y[0], AXIS_Z], Y_AXIS, 6, LEVER_Y[1] - LEVER_Y[0] + 0.6, P, 36, 0.4), { tone: 'hi' }));
  out.push(solidSvg(discAlong([tip[0], LEVER_Y[0], tip[2]], Y_AXIS, 4.4, LEVER_Y[1] - LEVER_Y[0] + 0.4, P, 28, 0.3), { tone: 'hi' }));
  out.push(solidSvg(discAlong([tip[0], LEVER_Y[1] + 0.4, tip[2]], Y_AXIS, 1.5, HANGER_Y + 2 - LEVER_Y[1], P, 14), { tone: 'mid' }));
  // The hanger: pan, the stack of slotted weights, the rod up to its hook on the pin.
  const panTop = tip[2] - ROD_LEN;
  const [hx, hy] = [tip[0], HANGER_Y];
  out.push(solidSvg(kitCylinder(hx, hy, PAN_R, panTop - PAN_H, PAN_H, P, 40, 0.3), { tone: 'mid' }));
  for (let k = 0; k < weights; k++) {
    const z = panTop + k * (WEIGHT_H + 0.15);
    out.push(solidSvg(kitCylinder(hx, hy, WEIGHT_R - (k % 2) * 0.5, z, WEIGHT_H, P, 36, 0.25), { tone: k % 2 ? 'mid' : 'hi', crease: 'lo' }));
  }
  const stackTop = panTop + weights * (WEIGHT_H + 0.15) - 0.15;
  out.push(solidSvg(kitCylinder(hx, hy, 0.9, stackTop, tip[2] - 2.4 - stackTop, P, 12), { tone: 'mid' }));
  out.push(lineSvg(facePath(circleUV(2.4, 24, 0), hx, hy + 0.2, tip[2]), { tone: 'mid' }));
  return out.join('');
}

/** The output's angle and pan height for the lever at `deg`, for tests and the readout. */
export function hangerAt(deg: number) {
  const tip = tipAt(deg);
  return { tip, panBottom: round1(tip[2] - ROD_LEN - PAN_H), onPedestal: tip[2] - ROD_LEN - PAN_H <= PEDESTAL_TOP + 1e-6 };
}
