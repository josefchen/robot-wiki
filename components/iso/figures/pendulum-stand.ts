/**
 * The balance stand for PendulumController, drawn with the isometric kit.
 *
 * The object is the explanation. A pole with a weight at its top stands on
 * a motor's shaft in front of a round dial plate, and a torque gauge beside
 * it carries two needles from the same zero: the short one shows gravity's
 * pull on the leaning pole (with the small side load it carries), the long
 * lit one the motor's push back. When the long needle passes the short one
 * the pole is pushed back toward upright; when the push never catches the
 * pull, nothing else saves it. The dial plate reads the lean, with its zero
 * at the top, and the weight's path over the last two seconds is inked on
 * the plate.
 *
 * World units: `ROD` per metre of the simulated 1 m pole. x runs along the
 * bench, y toward the viewer and z up; the pole swings in the plane y = 3
 * in front of the plate, and the model's angle is measured from upright,
 * positive to the right. Everything stands in layers along y, so painting
 * from the plate forward is always right. Static paths are built once here;
 * the pole, its weight, the rotor's index, the needles and the ink are
 * rebuilt each tick by `poleParts`, `gaugeNeedles` and `trailFor`.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
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
} from '../iso-kit.ts';
import { barBetween, discAlong, prismAlong, viewOf } from '../prism.ts';

export const WIDTH = 640;
export const AZIMUTH = 68;
export const ELEVATION = 20;

/** World units per metre: the pole is 1 m long. */
export const ROD = 62;
/** The pivot's height above the base. The hanging weight clears the base. */
export const PIVOT_Z = 84;
/** The dial plate behind the pole, its face at y = 0. */
export const PLATE_R = 76;
const PLATE_BACK = -5;
/** The pole's layer in front of the plate. */
export const POLE_Y = 3;
const POLE_R = 2.1;
const WEIGHT = { r: 8, y0: 0.6, y1: 7.2 };
/** The motor in front of the pole: flange, can and end cap along y. */
const MOTOR = { r: 12.5, flangeY: 7.6, y0: 9.6, y1: 27, capY: 29 };
/** The torque gauge: face toward the viewer, needles about its centre. */
export const GAUGE = { x: 134, y: 14, z: 56, r: 36, depth: 9 };
/** The plate's printed zones: balanced within this lean, fallen past that one (degrees). */
export const BALANCED_DEG = 10;
export const FALLEN_DEG = 60;
/** Degrees of needle sweep per newton-metre, and the scale's top, in newton-metres. */
export const DEG_PER_NM = 18;
export const SCALE_NM = 10;

export type Part = (
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: 'trail' | 'pole' | 'needles' | 'index' }
) & { id?: string };

// ---------------------------------------------------------------- the camera
const BASE: Plan = { x: -104, y: -30, w: GAUGE.x + GAUGE.r + 18 + 104, d: 70, r: 6 };
const BASE_H = 8;
const FOOT_H = 6;
const extremes: Point3[] = [];
for (const x of [BASE.x, BASE.x + BASE.w]) for (const y of [BASE.y, BASE.y + BASE.d]) extremes.push([x, y, -BASE_H - FOOT_H], [x, y, 0]);
for (let k = 0; k < 48; k++) {
  const a = (k / 48) * Math.PI * 2;
  extremes.push([PLATE_R * Math.cos(a), PLATE_BACK, PIVOT_Z + PLATE_R * Math.sin(a)], [PLATE_R * Math.cos(a), 0, PIVOT_Z + PLATE_R * Math.sin(a)]);
}
extremes.push([GAUGE.x, GAUGE.y, GAUGE.z + GAUGE.r + 8]);
const FIT_PAD = 10;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const seam = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
/** A disc on the y axis (toward the viewer) centred at (x, z), from y0 to y1. */
const yDisc = (x: number, z: number, r: number, y0: number, y1: number, steps = 32, bevel = 0) =>
  discAlong([x, y0, z], [0, 1, 0], r, y1 - y0, P, steps, bevel);
/** A point on a face parallel to the plate: angle measured from straight up, clockwise (to the right) positive. */
const onFace = (cx: number, cz: number, r: number, fromUp: number, y: number): Point3 => [cx + r * Math.sin(fromUp), y, cz + r * Math.cos(fromUp)];
/** A line on a face parallel to the plate between two radii at one angle. */
const radial = (cx: number, cz: number, r0: number, r1: number, fromUp: number, y: number) =>
  pathOf([at(onFace(cx, cz, r0, fromUp, y)), at(onFace(cx, cz, r1, fromUp, y))]);
/** A closed band on a face: the outer arc out and the inner arc back, between two angles. */
function bandOn(cx: number, cz: number, r0: number, r1: number, from: number, to: number, y: number, steps = 48) {
  const arc = (r: number) => Array.from({ length: steps + 1 }, (_, k) => at(onFace(cx, cz, r, from + ((to - from) * k) / steps, y)));
  return pathOf([...arc(r1), ...arc(r0).reverse()], true);
}
/** A full circle on a face parallel to the plate. */
const circleOn = (cx: number, cz: number, r: number, y: number, steps = 40) =>
  pathOf(Array.from({ length: steps }, (_, k) => at(onFace(cx, cz, r, (k / steps) * Math.PI * 2, y))), true);

/**
 * The visible half of a ring round a disc on the y axis, at depth y: a band
 * or seam on the motor can, ending on the can's silhouette.
 */
function canSeam(cx: number, cz: number, r: number, y: number, steps = 24): string {
  const V = viewOf(P);
  const facing = Math.atan2(V[2], V[0]);
  return pathOf(Array.from({ length: steps + 1 }, (_, k) => {
    const a = facing - Math.PI / 2 + (k / steps) * Math.PI;
    return at([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
  }));
}

const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => PARTS.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });

// ---------------------------------------------------------------- the base
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
for (const [x, y] of byDepth([...corners(BASE, 16), [BASE.x + BASE.w / 2, BASE.y + 16], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 16]])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BASE, -BASE_H + 3, P, 8)) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
for (const [x, y] of corners(BASE, 10)) line(ring(x, y, 2.2, 0, P, 16), 'lo');
dots(corners(BASE, 10).map(([x, y]) => at([x, y, 0])), 0.55, 'mid');
// The label plate at the front left; its rule lines stand for print.
const LABEL: Plan = { x: BASE.x + 18, y: 20, w: 58, d: 12, r: 2 };
solid(slab(LABEL, 0, 0.8, 3), 'lo');
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P, 3), 'faint');
for (const [k, share] of [[0, 0.8], [1, 0.55]] as const) {
  const y = LABEL.y + 4.2 + k * 3.6;
  line(lineOnTop([LABEL.x + 6, y], [LABEL.x + 6 + (LABEL.w - 14) * share, y], 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], 0.45, 'mid');

// ------------------------------------------------- the column and the dial plate
const COLUMN: Plan = { x: -9, y: PLATE_BACK - 13, w: 18, d: 13, r: 2 };
solid(slab({ x: -20, y: PLATE_BACK - 20, w: 40, d: 24, r: 3 }, 0, 4, 3, 0.5), 'lo');
solid(slab(COLUMN, 4, PIVOT_Z - 4, 3, 0.6), 'mid', { inner: seam(sideSeam(COLUMN, 12, P, 3)) });
// The plate: a round dial behind the pole, bolted to the column.
solid(yDisc(0, PIVOT_Z, PLATE_R, PLATE_BACK, 0, 96, 0.8), 'mid');
{
  // A printed ring 8 units in from the rim; ticks every 5 degrees hang from the rim, every 30 run to the ring.
  const inner = PLATE_R - 8;
  line(circleOn(0, PIVOT_Z, inner, 0, 96), 'lo');
  const minor: string[] = [];
  const major: string[] = [];
  let zero = '';
  for (let deg = -175; deg <= 180; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const rim = PLATE_R;
    if (deg === 0) zero = radial(0, PIVOT_Z, inner, rim, a, 0);
    else if (deg % 30 === 0) major.push(radial(0, PIVOT_Z, inner, rim, a, 0));
    else minor.push(radial(0, PIVOT_Z, rim - (deg % 10 === 0 ? 2.6 : 1.6), rim, a, 0));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  line(zero, 'hi');
  // Two printed zones inside the ring: upright within 10 degrees either side, and past 60 the pole has fallen.
  line(bandOn(0, PIVOT_Z, inner - 5.5, inner - 1.5, -BALANCED_DEG * Math.PI / 180, BALANCED_DEG * Math.PI / 180, 0, 12), 'lo');
  line(bandOn(0, PIVOT_Z, inner - 5.5, inner - 1.5, FALLEN_DEG * Math.PI / 180, (360 - FALLEN_DEG) * Math.PI / 180, 0, 96), 'lo');
  // The weight's track, printed faintly where the trail is inked.
  line(circleOn(0, PIVOT_Z, ROD, 0, 96), 'faint');
  // The bearing boss behind the hub, bolted to the plate.
  solid(yDisc(0, PIVOT_Z, 19, 0, 0.6, 48, 0.3), 'lo', { crease: 'none' });
  dots(Array.from({ length: 6 }, (_, k) => at(onFace(0, PIVOT_Z, 16, (k / 6) * Math.PI * 2 + Math.PI / 6, 0.6))), 0.55, 'mid');
}

PARTS.push({ kind: 'slot', slot: 'trail' });
PARTS.push({ kind: 'slot', slot: 'pole' });

// ------------------------------------------------------------- the motor
// Flange, can with two bands, end cap and the connector on top with its cable to the gauge.
const motor: Part[] = [];
motor.push({ kind: 'solid', paths: yDisc(0, PIVOT_Z, MOTOR.r + 2.5, MOTOR.flangeY, MOTOR.y0, 40, 0.4), tone: 'mid', id: 'motor' });
motor.push({ kind: 'solid', paths: yDisc(0, PIVOT_Z, MOTOR.r, MOTOR.y0, MOTOR.y1, 40), tone: 'mid',
  inner: seam(canSeam(0, PIVOT_Z, MOTOR.r, MOTOR.y0 + 4) + canSeam(0, PIVOT_Z, MOTOR.r, MOTOR.y1 - 4)), id: 'motor' });
motor.push({ kind: 'solid', paths: yDisc(0, PIVOT_Z, MOTOR.r - 2, MOTOR.y1, MOTOR.capY, 36, 0.4), tone: 'lo', id: 'motor' });
// Four screws hold the end cap; the rotor's shaft end sits at its centre.
motor.push({ kind: 'dots', points: [45, 135, 225, 315].map((deg) => at(onFace(0, PIVOT_Z, MOTOR.r - 4.6, (deg * Math.PI) / 180, MOTOR.capY))), size: 0.55, tone: 'mid', id: 'motor' });
export { motor as MOTOR_PARTS };

// ------------------------------------------------------------- the torque gauge
const gauge: Part[] = [];
{
  const { x, y, z, r, depth } = GAUGE;
  // The post and its foot on the base.
  gauge.push({ kind: 'solid', paths: slab({ x: x - 12, y: y - 6, w: 24, d: 14, r: 2 }, 0, 3, 3, 0.4), tone: 'lo' });
  gauge.push({ kind: 'solid', paths: slab({ x: x - 4, y: y, w: 8, d: depth - 2, r: 1.5 }, 3, z - r - 1, 3), tone: 'mid' });
  // The case, its bezel and the face.
  gauge.push({ kind: 'solid', paths: yDisc(x, z, r, y, y + depth - 2, 56, 0.5), tone: 'mid', inner: seam(canSeam(x, z, r, y + 3)) });
  gauge.push({ kind: 'solid', paths: yDisc(x, z, r - 0.6, y + depth - 2, y + depth, 56, 0.5), tone: 'lo' });
  const face = y + depth;
  // The scale: a printed band from 0 at the left, over the top, to 20 at the right; a tick every newton-metre.
  const sweep = (nm: number) => -Math.PI / 2 + (nm * DEG_PER_NM * Math.PI) / 180;
  gauge.push({ kind: 'line', d: bandOn(x, z, r - 6, r - 3.6, sweep(0), sweep(SCALE_NM), face), tone: 'lo' });
  const minor: string[] = [];
  const major: string[] = [];
  for (let nm = 0; nm <= SCALE_NM; nm += 1) {
    if (nm % 5 === 0) major.push(radial(x, z, r - 6, r - 3.6, sweep(nm), face));
    else minor.push(radial(x, z, r - 4.8, r - 3.6, sweep(nm), face));
  }
  gauge.push({ kind: 'line', d: minor.join(''), tone: 'lo' });
  gauge.push({ kind: 'line', d: major.join(''), tone: 'mid' });
  // The zero-set crown on top, and a lug beside it.
  gauge.push({ kind: 'solid', paths: cyl(x, y + depth / 2, 2.8, z + r - 1, 4.4, 20, 0.3), tone: 'mid' });
  gauge.push({ kind: 'solid', paths: cyl(x + 9, y + depth / 2, 2, z + r - 2.4, 3, 18, 0.3), tone: 'lo' });
}
export { gauge as GAUGE_PARTS };

PARTS.push(...gauge);
PARTS.push({ kind: 'slot', slot: 'needles' });
PARTS.push(...motor);
PARTS.push({ kind: 'slot', slot: 'index' });

export { PARTS };

// ------------------------------------------------------------- the moving pole
/** The weight's centre on the plate for a lean `theta` (radians from upright, positive to the right). */
export const tipOf = (theta: number): Point3 => onFace(0, PIVOT_Z, ROD, theta, POLE_Y);

/**
 * The pole for a lean `theta`: the rod from the hub to the weight, the hub,
 * the weight with the small side load clamped to its right, and the rotor's
 * index on the motor's cap, which turns with the pole. The rod and the
 * weight are the one lit part.
 */
export function poleParts(theta: number): { rod: Part[]; weight: Part[]; hub: Part[]; index: Part } {
  const axis: Point3 = [Math.sin(theta), 0, Math.cos(theta)];
  const across: Point3 = [Math.cos(theta), 0, -Math.sin(theta)];
  const from: Point3 = [axis[0] * 6, POLE_Y, PIVOT_Z + axis[2] * 6];
  const to: Point3 = [axis[0] * (ROD - WEIGHT.r + 1), POLE_Y, PIVOT_Z + axis[2] * (ROD - WEIGHT.r + 1)];
  const tip = tipOf(theta);
  const side: Point3 = [tip[0] + across[0] * (WEIGHT.r + 3.2), WEIGHT.y0 + 1.2, tip[2] + across[2] * (WEIGHT.r + 3.2)];
  return {
    rod: [{ kind: 'solid', paths: discAlong(from, axis, POLE_R, Math.hypot(to[0] - from[0], to[2] - from[2]), P, 18), tone: 'hi' }],
    hub: [{ kind: 'solid', paths: yDisc(0, PIVOT_Z, 7.4, 0.6, MOTOR.flangeY, 32, 0.4), tone: 'mid' }],
    weight: [
      { kind: 'solid', paths: barBetween([tip[0] + across[0] * WEIGHT.r * 0.6, WEIGHT.y0 + 3.3, tip[2] + across[2] * WEIGHT.r * 0.6], [side[0], WEIGHT.y0 + 3.3, side[2]], [0, 1, 0], 2.4, 2.4, P), tone: 'mid' },
      { kind: 'solid', paths: discAlong(side, [0, 1, 0], 3.2, 4.2, P, 20, 0.3), tone: 'mid' },
      { kind: 'solid', paths: yDisc(tip[0], tip[2], WEIGHT.r, WEIGHT.y0, WEIGHT.y1, 36, 0.5), tone: 'hi' },
    ],
    index: { kind: 'line', d: radial(0, PIVOT_Z, 0, MOTOR.r - 2, theta, MOTOR.capY), tone: 'hi' },
  };
}

/**
 * The gauge's two needles for a motor push and a gravity pull, both in
 * newton-metres: the push long and lit (the one lit part: the push the
 * reader sets), the pull short. Each sweeps
 * DEG_PER_NM per newton-metre from the zero at the left, up to the scale's
 * top.
 */
export function gaugeNeedles(pushNm: number, pullNm: number) {
  const { x, z, y, depth } = GAUGE;
  const face = y + depth;
  const sweepDeg = (nm: number) => Math.min(Math.abs(nm), SCALE_NM) * DEG_PER_NM;
  const angle = (nm: number) => -Math.PI / 2 + (sweepDeg(nm) * Math.PI) / 180;
  // A needle: a thin tapered blade in the face plane, from a short tail through the hub to its tip.
  const needle = (nm: number, length: number, tail: number, width: number, y: number) => {
    const a = angle(nm);
    const [ux, uz] = [Math.sin(a), Math.cos(a)];
    const [vx, vz] = [Math.cos(a), -Math.sin(a)];
    const ring: Point3[] = [
      [x - ux * tail + vx * width, y, z - uz * tail + vz * width],
      [x + ux * length + vx * 0.25, y, z + uz * length + vz * 0.25],
      [x + ux * length - vx * 0.25, y, z + uz * length - vz * 0.25],
      [x - ux * tail - vx * width, y, z - uz * tail - vz * width],
    ];
    return prismAlong(ring, [0, 0.5, 0], P);
  };
  return {
    pull: { paths: needle(pullNm, GAUGE.r - 13, 2.6, 0.9, face + 0.3), sweepDeg: sweepDeg(pullNm) },
    push: { paths: needle(pushNm, GAUGE.r - 6.4, 3.6, 1.1, face + 0.9), sweepDeg: sweepDeg(pushNm) },
    hub: yDisc(x, z, 2, face + 1.4, face + 2.4, 18, 0.2),
  };
}

/** The weight's path on the plate over the recent run, with a dot where it starts. */
export function trailFor(thetas: readonly number[]) {
  if (thetas.length < 2) return null;
  const points = thetas.map((theta) => at(onFace(0, PIVOT_Z, ROD, theta, 0)));
  return { d: pathOf(points), start: points[0] };
}

/** The rotor's shaft end at the centre of the motor's cap, where its index line starts. */
export const shaftEnd: Flat = at([0, MOTOR.capY, PIVOT_Z]);

/** The screen point of the weight's centre for a lean, for tests. */
export const weightPoint = (theta: number): Flat => at(tipOf(theta));
