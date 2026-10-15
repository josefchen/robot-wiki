/**
 * The press test stand for ImpedanceContactLab, drawn with the isometric kit.
 *
 * The object is the explanation: a head slides down a column and presses a
 * fingertip onto a glass vial standing on a load cell, and a force gauge wired to
 * the load cell shows the push. Its lit needle reads the push now; a drag pointer
 * stays at the hardest push, the first bump, and past the shaded arc the glass
 * cracks. The head is one of three arms: a stiff geared drive that only follows a
 * position (no softness knob at all), an arm that controls its own push (a knob on
 * its motor sets the softness) and the same arm with a coil spring built in
 * between the motor and the fingertip, which squeezes as it pushes.
 *
 * World units: x across the bench, y toward the viewer, z up. The press axis is
 * vertical through the vial. The head is built touching the vial and moved up by
 * `liftOf`; with the spring arm the fingertip and the head move apart by the
 * spring's squeeze. Static paths are built once; the needle, the pointer, the
 * spring and the softness knob's pointer are rebuilt by the live code.
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
  segment,
  sideArc,
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
import { viewOf } from '../prism.ts';

export const WIDTH = 640;
export const AZIMUTH = 50;

export type Arm = 'position' | 'torque' | 'sea';
export type Group = 'static' | 'head' | 'tip';
export type LiveId = 'crack' | 'spring-back' | 'spring-front' | 'knob' | 'needle' | 'peak';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'fill'; group: Group; d: string; shade: 0 | 1 | 2 | 3 }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- the gauge's scale
/** The gauge reads 0 to 50 newtons, as the old chart's axis did. */
export const SCALE_N = 50;
/** The glass cracks past this push (the model's crush force). */
export const CRUSH_N = 25;
/** The needle's stop pin, just past the scale's end: an off-scale push rests here. */
export const STOP_N = 53;
const SWEEP = (270 * Math.PI) / 180;
const DIAL_FROM = -SWEEP / 2;
/** The dial angle (kit convention: 0 toward -y, clockwise from above) for a push in newtons. */
export const dialAngle = (newtons: number) => DIAL_FROM + (Math.min(Math.max(newtons, 0), STOP_N) / SCALE_N) * SWEEP;

/** The softness knob reads 100 to 20,000 newtons a metre, on a log scale over 270 degrees. */
export const KNOB_RANGE = [100, 20000] as const;
export const knobAngle = (stiffness: number) =>
  DIAL_FROM + (Math.log(Math.min(Math.max(stiffness, KNOB_RANGE[0]), KNOB_RANGE[1]) / KNOB_RANGE[0]) / Math.log(KNOB_RANGE[1] / KNOB_RANGE[0])) * SWEEP;

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -86, y: -40, w: 166, d: 68, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;

/** The press axis, through the vial. */
export const AXIS: Plane = [-30, 0];
const CELL = { r: 15, h: 6, platenR: 11.5, platenH: 2 };
const CELL_TOP = CELL.h + CELL.platenH;
const VIAL = { r: 7.6, h: 20, lipR: 8.3, lipH: 1.6 };
/** The vial's top, where the fingertip lands. */
export const CONTACT_Z = CELL_TOP + VIAL.h + VIAL.lipH;
const TIP = { padR: 3.6, padH: 3.4, collarR: 4.6, collarH: 3, rodR: 2.2 };

const COLUMN: Plan = { x: AXIS[0] - 9, y: -34, w: 18, d: 14, r: 2 };
const COLUMN_H = 86;
/** The slide on the column's front face, and the arm out to the head over the vial. */
const SLIDE: Plan = { x: COLUMN.x - 3, y: COLUMN.y + COLUMN.d, w: COLUMN.w + 6, d: 7, r: 1.6 };
/** The arm's underside, measured up from the fingertip's pad at contact. */
const ARM_LO = 27;
const ARM_H = 9;
const ARM: Plan = { x: AXIS[0] - 8, y: SLIDE.y + SLIDE.d - 1, w: 16, d: AXIS[1] + 8 - (SLIDE.y + SLIDE.d - 1), r: 2.4 };
/** With the spring arm, the spring runs from this far above the pad up to the arm. */
const SPRING = { r: 5.6, lowPlate: 8, turns: 6 };
/** World units of spring squeeze per millimetre the real spring gives (drawn larger, so it shows). */
export const SQUEEZE_PER_MM = 3.2;

const GAUGE: Plane = [44, 2];
const GAUGE_R = 21;
const GAUGE_Z = 16;
const GAUGE_H = 7;
const FACE_Z = GAUGE_Z + GAUGE_H;
const LABEL: Plan = { x: -78, y: 16, w: 30, d: 11, r: 2 };

/** How high the head parks above the vial when it lifts to press again. */
export const PARK_LIFT = 11;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
extremes.push([COLUMN.x, COLUMN.y, COLUMN_H + 4], [COLUMN.x + COLUMN.w, COLUMN.y, COLUMN_H + 4]);
extremes.push([AXIS[0] - 12, AXIS[1] + 12, CONTACT_Z + PARK_LIFT + ARM_LO + ARM_H + 2 + 12 + 4.4]);
export const P = fitProjection(extremes, WIDTH, 1000, { pad: 12, azimuth: AZIMUTH });
const screen = extremes.map((point) => iso(point, P));
export const HEIGHT = Math.ceil(Math.max(...screen.map(([, y]) => y)) - Math.min(...screen.map(([, y]) => y)) + 28);
P.origin = [P.origin[0], P.origin[1] - Math.min(...screen.map(([, y]) => y)) + 14];

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 32, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const V = viewOf(P);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const polar = ([cx, cy]: Plane, r: number, angle: number): Plane => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];

/** The screen offset that lifts a group built at contact by `lift` world units. */
export const liftOf = (lift: number) => translateAlong(P, [0, 0, lift]);
export const liftOffset = (lift: number): Flat => {
  const a = at([0, 0, 0]);
  const b = at([0, 0, lift]);
  return [b[0] - a[0], b[1] - a[1]];
};

// ---------------------------------------------------------------- parts
function build(arm: Arm): Part[] {
  const parts: Part[] = [];
  const put = (part: Part) => parts.push(part);
  const solid = (group: Group, paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
    put({ kind: 'solid', group, paths, tone, ...extra });
  const line = (group: Group, d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group, d, tone, free });
  const dots = (group: Group, points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group, points: points.map(at), size, tone });
  const live = (group: Group, id: LiveId) => put({ kind: 'live', group, id });

  // Base on four turned feet, with a seam, a groove and corner screws.
  for (const [x, y] of byDepth([
    [BASE.x + 20, BASE.y + 18],
    [BASE.x + BASE.w - 20, BASE.y + 18],
    [BASE.x + 20, BASE.y + BASE.d - 18],
    [BASE.x + BASE.w - 20, BASE.y + BASE.d - 18],
  ])) {
    solid('static', cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
    solid('static', cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
  }
  solid('static', slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 8) });
  line('static', planOutline(insetPlan(BASE, 5), 0, P), 'faint');
  {
    const screws: Plane[] = [
      [BASE.x + 10, BASE.y + 10],
      [BASE.x + BASE.w - 10, BASE.y + 10],
      [BASE.x + 10, BASE.y + BASE.d - 10],
      [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
    ];
    line('static', screws.map(([x, y]) => ring(x, y, 2.3, 0, P, 16)).join(''), 'lo');
    dots('static', screws.map(([x, y]) => [x, y, 0]), 0.5);
  }

  // Label plate at the front left, with three engraved rules.
  solid('static', slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
  line('static', planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
  line(
    'static',
    [0, 1, 2].map((row) => onTop([[LABEL.x + 6, LABEL.y + 3.2 + row * 2.4], [LABEL.x + LABEL.w - (row === 1 ? 12 : 6), LABEL.y + 3.2 + row * 2.4]], 0.8, P)).join(''),
    'lo',
    true,
  );
  dots('static', [[LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8]], 0.45);

  // The column at the back: a foot flange with bolts, the square column with a height scale down its front,
  // and a cap.
  {
    const foot: Plan = { x: COLUMN.x - 7, y: COLUMN.y - 5, w: COLUMN.w + 14, d: COLUMN.d + 12, r: 3 };
    solid('static', slab(foot, 0, 4, 4, 0.6), 'mid');
    dots('static', [[foot.x + 3.4, foot.y + 3.4, 4], [foot.x + foot.w - 3.4, foot.y + 3.4, 4], [foot.x + 3.4, foot.y + foot.d - 3.4, 4], [foot.x + foot.w - 3.4, foot.y + foot.d - 3.4, 4]], 0.5);
    solid('static', slab(COLUMN, 4, COLUMN_H - 4, 3, 0.6), 'mid', { inner: sideSeam(COLUMN, 12, P, 3) });
    // A scale strip on the column's front face, ticks hanging from its top edge down the face.
    const face = COLUMN.y + COLUMN.d;
    const strip = { x0: COLUMN.x + COLUMN.w - 4.6, x1: COLUMN.x + COLUMN.w - 1.2 };
    const ticks: string[] = [];
    for (let z = 20; z <= COLUMN_H - 10; z += 4) ticks.push(segment([strip.x1, face + 0.02, z], [strip.x1 - ((z - 20) % 20 === 0 ? 2 : 1.1), face + 0.02, z], P));
    line('static', ticks.join(''), 'lo');
    // The datum line runs the face's full height, from the foot to under the cap.
    line('static', segment([strip.x1, face + 0.02, 4], [strip.x1, face + 0.02, COLUMN_H], P), 'lo');
    solid('static', slab({ x: COLUMN.x - 1, y: COLUMN.y - 1, w: COLUMN.w + 2, d: COLUMN.d + 2, r: 2.6 }, COLUMN_H, 4, 3, 0.6), 'mid');
    dots('static', [[COLUMN.x + COLUMN.w / 2, COLUMN.y + COLUMN.d / 2, COLUMN_H + 4]], 0.6);
  }

  // The load cell under the vial, with its connector boss and the cable to the gauge.
  solid('static', cyl(AXIS[0], AXIS[1], CELL.r, 0, CELL.h, 48, 0.8), 'mid', { inner: sideArc(AXIS[0], AXIS[1], CELL.r, CELL.h - 2, P, 32) });
  {
    const [ux, uy] = [0.72, 0.69];
    const bossAt: Plane = [AXIS[0] + ux * CELL.r, AXIS[1] + uy * CELL.r];
    solid('static', cyl(bossAt[0] + ux * 1.4, bossAt[1] + uy * 1.4, 2.6, 1, 3.6, 20), 'mid');
    const from = at([bossAt[0] + ux * 3.2, bossAt[1] + uy * 3.2, 2.8]);
    const to = at([GAUGE[0] - 10, GAUGE[1] + 14, 2]);
    put({ kind: 'wire', group: 'static', from, to, via: [at([bossAt[0] + ux * 8, bossAt[1] + uy * 8, 0.6]), at([GAUGE[0] - 22, GAUGE[1] + 14, 0.6])], tone: 'lo' });
  }
  solid('static', cyl(AXIS[0], AXIS[1], CELL.platenR, CELL.h, CELL.platenH, 40, 0.5), 'hi');
  line('static', ring(AXIS[0], AXIS[1], VIAL.r + 1.6, CELL_TOP, P, 40), 'faint');

  // The glass vial: a body and a rolled lip; cracks appear on it when the push passes the crush force.
  {
    // The glass's glint: a line down the body, a little left of where it faces the viewer, lip to foot.
    const glint = Math.atan2(V[1], V[0]) + 0.5;
    const gx = AXIS[0] + VIAL.r * Math.cos(glint);
    const gy = AXIS[1] + VIAL.r * Math.sin(glint);
    solid('static', cyl(AXIS[0], AXIS[1], VIAL.r, CELL_TOP, VIAL.h, 48), 'hi', {
      inner: sideArc(AXIS[0], AXIS[1], VIAL.r, CELL_TOP + 4, P, 32) + segment([gx, gy, CELL_TOP + 4], [gx, gy, CELL_TOP + VIAL.h], P),
    });
  }
  solid('static', cyl(AXIS[0], AXIS[1], VIAL.lipR, CELL_TOP + VIAL.h, VIAL.lipH, 48, 0.4), 'hi');
  line('static', ring(AXIS[0], AXIS[1], VIAL.r - 1.6, CONTACT_Z, P, 40), 'faint');
  live('static', 'crack');

  // The head, built touching the vial. The slide on the column and the arm, then the arm's drive.
  const pad = CONTACT_Z;
  const armLo = pad + ARM_LO;
  const armHi = armLo + ARM_H;
  solid('head', slab(SLIDE, armLo - 8, ARM_H + 16, 3, 0.6), 'mid', { inner: sideSeam(SLIDE, armLo + 4, P, 3) });
  {
    // The slide's clamp knob on its right side.
    const kx = SLIDE.x + SLIDE.w;
    const ky = SLIDE.y + SLIDE.d / 2;
    solid('head', slab({ x: kx, y: ky - 1.4, w: 2.4, d: 2.8, r: 0.4 }, armLo + 2, 3, 2), 'mid');
    solid('head', cyl(kx + 5.4, ky, 3.4, armLo + 0.5, 6, 24, 0.4), 'hi', { inner: knurl(kx + 5.4, ky, 3.4, armLo + 0.5, armLo + 6.5, 22, P, 0.15) });
  }
  dots('head', [[SLIDE.x + 2.6, SLIDE.y + SLIDE.d, armLo + 14], [SLIDE.x + SLIDE.w - 2.6, SLIDE.y + SLIDE.d, armLo + 14], [SLIDE.x + 2.6, SLIDE.y + SLIDE.d, armLo - 5], [SLIDE.x + SLIDE.w - 2.6, SLIDE.y + SLIDE.d, armLo - 5]], 0.45);
  const [ax, ay] = AXIS;
  // Drawn from the bottom up, so each part covers the end of the one it stands on: the fingertip's pad and
  // collar, the rod (with the spring arm, its lower plate and the spring round a guide rod), then the arm and
  // the drive on top of it.
  const tipGroup: Group = arm === 'sea' ? 'tip' : 'head';
  solid(tipGroup, cyl(ax, ay, TIP.padR, pad, TIP.padH, 32, 0.6), 'hi');
  solid(tipGroup, cyl(ax, ay, TIP.collarR, pad + TIP.padH, TIP.collarH, 32, 0.4), 'mid', { inner: sideArc(ax, ay, TIP.collarR, pad + TIP.padH + 1.5, P, 20) });
  const rodFrom = pad + TIP.padH + TIP.collarH;
  if (arm === 'position') {
    // A lead screw from the gearbox down to the fingertip: one rigid drive line.
    solid('head', cyl(ax, ay, TIP.rodR + 0.6, rodFrom, ARM_LO - TIP.padH - TIP.collarH, 24), 'mid', {
      inner: Array.from({ length: 9 }, (_, i) => sideArc(ax, ay, TIP.rodR + 0.6, rodFrom + 3 + i * 3.6, P, 12)).join(''),
    });
  } else if (arm === 'torque') {
    solid('head', cyl(ax, ay, TIP.rodR + 0.4, rodFrom, ARM_LO - TIP.padH - TIP.collarH, 24), 'mid', {
      inner: sideArc(ax, ay, TIP.rodR + 0.4, pad + ARM_LO - 4, P, 12),
    });
  } else {
    // The spring arm: the fingertip's rod up to a lower plate, the coil spring round a guide rod, and the upper
    // plate under the arm. The fingertip and the lower plate stop on the vial while the head keeps coming down
    // and the spring squeezes.
    solid('tip', cyl(ax, ay, TIP.rodR + 0.4, rodFrom, SPRING.lowPlate - TIP.padH - TIP.collarH, 24), 'mid');
    solid('tip', cyl(ax, ay, SPRING.r + 1.6, pad + SPRING.lowPlate, 2, 40, 0.4), 'mid');
    // The spring is drawn where it is (from the lift and the squeeze), not moved with either group; the guide rod
    // rides with the fingertip and slides up into the arm as the spring squeezes.
    live('static', 'spring-back');
    solid('tip', cyl(ax, ay, 1.4, pad + SPRING.lowPlate + 2, ARM_LO - SPRING.lowPlate - 4, 20), 'hi');
    live('static', 'spring-front');
    solid('head', cyl(ax, ay, SPRING.r + 1.6, armLo - 2, 2, 40, 0.4), 'mid');
  }
  solid('head', slab(ARM, armLo, ARM_H, 4, 0.8), 'mid', { inner: sideSeam(ARM, armLo + 3, P, 4) });
  dots('head', [[ARM.x + 3, ARM.y + 4, armHi], [ARM.x + ARM.w - 3, ARM.y + 4, armHi]], 0.5);
  if (arm === 'position') {
    // The stiff arm: a gearbox on the arm and a geared motor on it. It has no softness knob at all.
    const gear: Plan = { x: ax - 9, y: ay - 9, w: 18, d: 18, r: 2 };
    solid('head', slab(gear, armHi, 8, 4, 0.6), 'mid', { inner: sideSeam(gear, armHi + 4, P, 4) });
    dots('head', [[gear.x + 2.6, gear.y + 2.6, armHi + 8], [gear.x + gear.w - 2.6, gear.y + 2.6, armHi + 8], [gear.x + 2.6, gear.y + gear.d - 2.6, armHi + 8], [gear.x + gear.w - 2.6, gear.y + gear.d - 2.6, armHi + 8]], 0.5);
    solid('head', cyl(ax, ay, 8, armHi + 8, 12, 40, 0.6), 'mid', {
      inner: sideArc(ax, ay, 8, armHi + 11, P, 24) + sideArc(ax, ay, 8, armHi + 17, P, 24),
    });
    solid('head', cyl(ax, ay, 5.6, armHi + 20, 2.4, 32, 0.4), 'mid');
  } else {
    // The arms that control their own push: a direct-drive motor with a softness knob and its scale.
    const motorR = 11;
    const motorH = 12;
    solid('head', cyl(ax, ay, motorR + 1.4, armHi, 2, 48, 0.4), 'mid');
    solid('head', cyl(ax, ay, motorR, armHi + 2, motorH, 48, 0.6), 'mid', {
      inner: sideArc(ax, ay, motorR, armHi + 5, P, 32) + sideArc(ax, ay, motorR, armHi + 10, P, 32),
    });
    const top = armHi + 2 + motorH;
    const scale = radialTicks(ax, ay, motorR - 1.4, 8, 4, top, [1.1, 1.9], P, DIAL_FROM, SWEEP);
    line('head', scale.minor, 'lo');
    line('head', scale.major, 'mid');
    line('head', ring(ax, ay, motorR - 1.4, top, P, 48), 'faint');
    live('head', 'knob');
  }

  // The force gauge at the front right, face up on a short pillar, wired to the load cell.
  {
    const [gx, gy] = GAUGE;
    solid('static', slab({ x: gx - 13, y: gy + 10, w: 26, d: 12, r: 2 }, 0, 3, 4, 0.5), 'mid');
    solid('static', cyl(gx - 10, gy + 14, 3, 3, 1.2, 20), 'lo');
    solid('static', cyl(gx, gy + 12, 4.6, 3, GAUGE_Z - 3, 28), 'mid', { inner: sideArc(gx, gy + 12, 4.6, 7, P, 20) });
    solid('static', cyl(gx, gy, GAUGE_R, GAUGE_Z, GAUGE_H, 72, 0.8), 'mid', { inner: knurl(gx, gy, GAUGE_R, FACE_Z - 3, FACE_Z, 90, P, 0.15) + sideArc(gx, gy, GAUGE_R, FACE_Z - 3, P, 48) });
    // Crown on the right.
    const crownDir: Plane = [Math.cos(0.15), Math.sin(0.15)];
    const crownAt = polar([gx, gy], GAUGE_R, Math.PI / 2 + 0.15);
    solid('static', cyl(crownAt[0] + crownDir[0] * 1.6, crownAt[1] + crownDir[1] * 1.6, 2.4, GAUGE_Z + 1.6, 3.4, 20), 'mid');
    // The face: a ring, the crush band (an annular sector from 25 to past the scale), the ticks and the stop pin.
    // The face's rings: the outer one the ticks hang from, the inner one the long ticks reach; the crush band
    // lies inside the inner ring.
    const rOuter = GAUGE_R - 2.2;
    const rInner = rOuter - 2.6;
    const r0 = rInner - 5.2;
    const r1 = rInner;
    const band: Plane[] = [];
    const from = dialAngle(CRUSH_N);
    const to = dialAngle(SCALE_N);
    for (let i = 0; i <= 24; i++) band.push(polar([gx, gy], r1, from + ((to - from) * i) / 24));
    for (let i = 24; i >= 0; i--) band.push(polar([gx, gy], r0, from + ((to - from) * i) / 24));
    put({ kind: 'fill', group: 'static', shade: 1, d: onTop(band, FACE_Z, P, true) });
    line('static', onTop(band, FACE_Z, P, true), 'lo');
    line('static', ring(gx, gy, rOuter, FACE_Z, P, 72), 'lo');
    line('static', ring(gx, gy, rInner, FACE_Z, P, 72), 'faint');
    const ticks = radialTicks(gx, gy, rOuter, 50, 5, FACE_Z, [1.3, rOuter - rInner], P, DIAL_FROM, SWEEP);
    line('static', ticks.minor, 'lo');
    line('static', ticks.major, 'mid');
    const crush = polar([gx, gy], r0, from);
    line('static', lineOnTop(crush, polar([gx, gy], rOuter, from), FACE_Z, P), 'hi');
    const stop = polar([gx, gy], rInner - 1.4, dialAngle(STOP_N + 1.4));
    solid('static', cyl(stop[0], stop[1], 0.9, FACE_Z, 1.6, 12), 'mid');
    live('static', 'peak');
    live('static', 'needle');
    solid('static', cyl(gx, gy, 1.6, FACE_Z, 1, 20), 'hi');
  }
  return parts;
}

export const PARTS: Record<Arm, readonly Part[]> = { position: build('position'), torque: build('torque'), sea: build('sea') };

// ---------------------------------------------------------------- live pieces
/** The needle reaches the outer ring the ticks hang from; its tail is free. */
const NEEDLE = { r: GAUGE_R - 2.2, tail: 4.2 };

/** The lit needle for a push in newtons: from its tail, through the hub, to just inside the ticks. */
export function needleAt(newtons: number) {
  const a = dialAngle(newtons);
  // The needle rides just above the face; its tip comes down onto the outer ring it points at.
  const tail = polar(GAUGE, -NEEDLE.tail, a);
  const tip = polar(GAUGE, NEEDLE.r, a);
  return pathOf([at([tail[0], tail[1], FACE_Z + 1.1]), at([tip[0], tip[1], FACE_Z])]);
}
/** The drag pointer that stays at the hardest push: a thin blade with a dot at its tip. */
export function peakAt(newtons: number) {
  const a = dialAngle(newtons);
  const tip = polar(GAUGE, GAUGE_R - 6.2, a);
  return { d: lineOnTop(polar(GAUGE, 1.2, a), tip, FACE_Z + 0.6, P), tip: at([tip[0], tip[1], FACE_Z + 0.6]) };
}
/** The softness knob on the motor: a knurled knob and its pointer, turned to the stiffness. */
export function knobAt(stiffness: number) {
  const [ax, ay] = AXIS;
  const top = CONTACT_Z + ARM_LO + ARM_H + 2 + 12;
  const a = knobAngle(stiffness);
  const paths = cyl(ax, ay, 4.6, top, 4.4, 32, 0.4);
  return {
    paths,
    knurl: knurl(ax, ay, 4.6, top, top + 4.4, 26, P, 0.15),
    pointer: lineOnTop(polar(AXIS, 0, a), polar(AXIS, 4.6 + 2.2, a), top + 4.4, P),
    hub: at([ax, ay, top + 4.4]),
  };
}

/** The coil spring of the spring arm, with the fingertip lifted `lift` and the spring squeezed `squeeze` world units. */
export function springAt(lift: number, squeeze: number) {
  const [ax, ay] = AXIS;
  const z0 = CONTACT_Z + lift + SPRING.lowPlate + 2;
  const z1 = CONTACT_Z + lift + ARM_LO - 2 - squeeze;
  const count = Math.round(SPRING.turns * 20);
  const back: Flat[][] = [];
  const front: Flat[][] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const angle = t * SPRING.turns * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const point = at([ax + SPRING.r * nx, ay + SPRING.r * ny, z0 + (z1 - z0) * t]);
    const facing = nx * V[0] + ny * V[1] > 0;
    if (near === null) near = facing;
    run.push(point);
    if (facing !== near) {
      (near ? front : back).push(run);
      run = [point];
      near = facing;
    }
  }
  if (run.length > 1) (near ? front : back).push(run);
  const first = at([ax + SPRING.r, ay, z0]);
  const lastAngle = SPRING.turns * Math.PI * 2;
  const last = at([ax + SPRING.r * Math.cos(lastAngle), ay + SPRING.r * Math.sin(lastAngle), z1]);
  return { back: back.map((points) => pathOf(points)).join(''), front: front.map((points) => pathOf(points)).join(''), ends: [first, last] as Flat[] };
}

/** Cracks down the vial's visible side, from the lip to the platen: drawn once the push passes the crush force. */
export const CRACK = (() => {
  const [ax, ay] = AXIS;
  const facing = Math.atan2(V[1], V[0]);
  const z0 = CELL_TOP + 0.2;
  const z1 = CELL_TOP + VIAL.h;
  const zig = (a0: number, swing: number, steps: number) => {
    const points: Flat[] = [];
    for (let i = 0; i <= steps; i++) {
      const z = z1 - ((z1 - z0) * i) / steps;
      const a = a0 + (i % 2 === 0 ? 0 : swing) + i * 0.02;
      points.push(at([ax + VIAL.r * Math.cos(a), ay + VIAL.r * Math.sin(a), z]));
    }
    return pathOf(points);
  };
  return zig(facing - 0.35, 0.16, 7) + zig(facing + 0.42, -0.13, 6);
})();

/** The pieces of the stand a test can check, in world units. */
export const GEOMETRY = { AXIS, CONTACT_Z, GAUGE, FACE_Z, SPRING, ARM_LO, at };
