/**
 * The spring press for ImpedancePress, drawn with the isometric kit.
 *
 * The object is the explanation. An impedance action is two things: a
 * target for the tool and a stiffness. On this press a sealed box (the
 * policy) drives a crosshead up and down a column; a depth rod hangs from
 * the crosshead, and its tip, read on the column's ruler, is the target. The
 * tool hangs from the crosshead's arm on a spring, the one lit part. In free
 * space the tool's tip rides level with the target. Once the target passes
 * the scale's pan, the tool stops on the pan, the arm keeps going, the nut
 * lifts off the arm and the spring takes up the gap; the scale's dial reads
 * the push, the spring's rate times the gap. The two springs not fitted lie
 * in the tray in front.
 *
 * World units are about half a millimetre; x to the right, y toward the
 * viewer, z up. The model is lib/impedance-press.ts.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  roundedPlan,
  sideArc,
  sideSeam,
  slabOf,
  towardViewer,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { PUSH_MAX, SPRINGS, TARGET_MAX, TARGET_MIN, gapFor, pushFor, toolFor, type SpringId } from '../../../lib/impedance-press.ts';

export const WIDTH = 600;
export const AZIMUTH = 54;
export const ELEVATION = 24;

// ----------------------------------------------------------------- the layout
const BASE: Plan = { x: -88, y: -48, w: 176, d: 88, r: 9 };
const BASE_Z = 10;
export const TOP = 18;
/** World units per ruler mark. */
export const MARK = 6;

const AXIS_Y = -16;
/** The column the crosshead rides, and its foot. */
const COLUMN: Plan = { x: -69, y: AXIS_Y - 9, w: 18, d: 18, r: 1.6 };
const COLUMN_FOOT: Plan = { x: -76, y: AXIS_Y - 16, w: 32, d: 32, r: 3 };
/** Just above the crosshead's highest reach. */
const COLUMN_TOP = TOP + 122;
const COLUMN_FRONT = COLUMN.y + COLUMN.d;

/** The scale: a housing with a dial on its front and a pan on a stem. */
export const TOOL: Plane = [16, AXIS_Y];
const SCALE: Plan = { x: -8, y: AXIS_Y - 22, w: 48, d: 44, r: 4 };
const SCALE_TOP = TOP + 32;
const SCALE_FRONT = SCALE.y + SCALE.d;
const PAN_R = 17;
export const PAN_TOP = SCALE_TOP + 7;
const DIAL: Point3 = [TOOL[0], SCALE_FRONT, TOP + 15.5];
const DIAL_R = 11.5;
/** The dial's sweep: from 135° left of straight up to 135° right of it. */
const DIAL_SWEEP = (135 * Math.PI) / 180;

/** The tool, measured from its tip: pad, rod, spring collar, and the nut that hangs it from the arm. */
const PAD_H = 3;
const COLLAR_Z = 14;
const COLLAR_H = 3;
const NUT_ABOVE_TIP = 53;
const NUT_H = 4;
const ROD_R = 1.4;
const SPRING_R = 4.1;
const ARM_H = 8;

/** The crosshead: its arm's top for a target, so that in free space the tool's tip sits on the target. */
export const tipFor = (marks: number) => PAN_TOP - marks * MARK;
export const armTopFor = (target: number) => tipFor(target) + NUT_ABOVE_TIP;
const BLOCK: Plan = { x: -74, y: AXIS_Y - 14, w: 28, d: 28.5, r: 3 };
const BLOCK_BELOW = 16;
const BLOCK_ABOVE = 4;
const ARM: Plan = { x: BLOCK.x + BLOCK.w - 2, y: AXIS_Y - 7, w: TOOL[0] + 7 - (BLOCK.x + BLOCK.w - 2), d: 14, r: 7 };
/** The depth rod hangs from the crosshead in front of the column; its tip is the target. */
const ROD_AT: Plane = [COLUMN.x + COLUMN.w - 2.4, COLUMN_FRONT + 2.6];
const DEPTH_ROD_R = 1.1;

/** The column's ruler, its zero level with the pan's top. */
const RULER: Plan = { x: COLUMN.x + 2.4, y: COLUMN_FRONT, w: 9, d: 1.1, r: 0.3 };
const RULER_Z0 = tipFor(TARGET_MAX) - 6;
const RULER_Z1 = tipFor(TARGET_MIN) + 6;

/** The sealed policy box to the right of the scale, and the label plate and spare-spring rack in front. */
const POLICY: Plan = { x: 50, y: -24, w: 30, d: 26, r: 3 };
const POLICY_TOP = TOP + 20;
const LABEL: Plan = { x: 4, y: 26, w: 36, d: 8, r: 1.4 };
/** The rack the two springs not fitted stand on. */
const RACK: Plan = { x: -76, y: 12, w: 40, d: 18, r: 3 };
const RACK_TOP = TOP + 5;
const SPRING_FREE = 28;

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(BASE, 8)) extremes.push([px, py, 0], [px, py, TOP]);
for (const [px, py] of roundedPlan(BLOCK, 3)) extremes.push([px, py, COLUMN_TOP + 22]);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 6;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const face3 = (points: Point3[], closed = true) => pathOf(points.map(at), closed);

// ------------------------------------------------------------------- parts
export type Slot = 'policy-cable' | 'crosshead' | 'tool-low' | 'arm' | 'tool-high' | 'needle' | 'tray';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; weight?: number }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
let into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', weight?: number) => into.push({ kind: 'line', d, tone, free, weight });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => into.push({ kind: 'face', d, fill });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
/** Builds parts into a list of their own, for the moving slots. */
function collect(build: () => void): Part[] {
  const list: Part[] = [];
  const saved = into;
  into = list;
  build();
  into = saved;
  return list;
}
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
/** A circle in the vertical plane y = const (a face toward the viewer). */
const yCircle = (cx: number, y: number, cz: number, r: number, steps = 48): Point3[] =>
  Array.from({ length: steps }, (_, k) => {
    const a = (k / steps) * Math.PI * 2;
    return [cx + r * Math.sin(a), y, cz + r * Math.cos(a)] as Point3;
  });

/** A vertical coil round (cx, cy) from z0 to z1, split into the half behind its axis and the half in front. */
export function coilUp(cx: number, cy: number, z0: number, z1: number, r: number, turns: number) {
  const [vx, vy] = towardViewer(P);
  const count = Math.max(24, Math.round(turns * 28));
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  // Start the wire on the side away from the viewer, so both ends land behind the parts they sit on.
  const start = Math.atan2(-vy, -vx);
  for (let k = 0; k <= count; k++) {
    const share = k / count;
    const a = start + share * turns * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    // A tolerance, so a sample exactly on the limb falls the same way in every JavaScript engine (server and browser).
    const facing = nx * vx + ny * vy > 1e-9;
    const flat = at([cx + r * nx, cy + r * ny, z0 + (z1 - z0) * share]);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(''), front: front.join('') };
}

// ------------------------------------------------------------------ the base
for (const [x, y] of byDepth(corners(BASE, 15))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, BASE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, BASE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, BASE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(BASE, BASE_Z, TOP - BASE_Z, 10, 1.2), 'lo', { inner: sideSeam(BASE, BASE_Z + 2.6, P, 10) });
line(planOutline(insetPlan(BASE, 4.5), TOP, P, 10), 'faint');
for (const [x, y] of corners(BASE, 10)) screw(x, y, TOP, 2.1);

slot('policy-cable');

// ------------------------------------------------- the column and its ruler
solid(slab(COLUMN_FOOT, TOP, 6, 3, 0.6), 'mid', { inner: sideSeam(COLUMN_FOOT, TOP + 2.2, P, 3) });
for (const [x, y] of corners(COLUMN_FOOT, 4)) screw(x, y, TOP + 6, 1.5);
solid(slab(COLUMN, TOP + 6, COLUMN_TOP - TOP - 6, 2, 0.5), 'mid', { inner: sideSeam(COLUMN, TOP + 22, P, 2) });
// The lead screw's slot up the column's right face, where the crosshead's nut runs: a closed slot.
{
  const x = COLUMN.x + COLUMN.w;
  const y0 = COLUMN.y + COLUMN.d / 2 - 1.6;
  const y1 = COLUMN.y + COLUMN.d / 2 + 1.6;
  const z0 = TOP + 30;
  const z1 = COLUMN_TOP - 8;
  line(face3([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]].map(([px, py, pz]) => [px, py, pz] as Point3)), 'lo');
}
// The ruler strip on the column's front, and its ticks every half mark from its left edge (its outline); the zero,
// level with the pan's top, ends on a dot.
solid(slab(RULER, RULER_Z0, RULER_Z1 - RULER_Z0, 2), 'lo', { crease: 'none' });
{
  const y = RULER.y + RULER.d;
  const edge = RULER.x;
  for (let z = tipFor(TARGET_MAX); z <= tipFor(TARGET_MIN) + 1e-9; z += MARK / 2) {
    const zero = Math.abs(z - PAN_TOP) < 1e-6;
    const major = Math.abs(((z - PAN_TOP) / MARK) % 1) < 1e-6;
    const length = zero ? 2.6 : major ? 2.2 : 1.3;
    line(face3([[edge, y, z], [edge + length, y, z]], false), zero ? 'hi' : major ? 'mid' : 'lo', undefined, zero ? 1 : undefined);
    if (zero) dots([at([edge + length, y, z])], 0.7, 'hi');
  }
}
// The cap and the motor that turns the column's lead screw, on top.
solid(slab(insetPlan(COLUMN, -1.5), COLUMN_TOP, 3, 3, 0.4), 'mid');
const MOTOR: Plane = [COLUMN.x + COLUMN.w / 2, COLUMN.y + COLUMN.d / 2];
solid(cyl(MOTOR[0], MOTOR[1], 7.5, COLUMN_TOP + 3, 14, 32, 0.4), 'hi', { inner: sideArc(MOTOR[0], MOTOR[1], 7.5, COLUMN_TOP + 10, P, 24) });
solid(cyl(MOTOR[0], MOTOR[1], 5, COLUMN_TOP + 17, 2.4, 28, 0.3), 'mid');
dots([0, 1, 2, 3].map((k) => {
  const a = (k / 4) * Math.PI * 2 + 0.4;
  return at([MOTOR[0] + 6 * Math.cos(a), MOTOR[1] + 6 * Math.sin(a), COLUMN_TOP + 17]);
}), 0.42, 'mid');

// ------------------------------------------------------------ the crosshead
slot('crosshead');

// --------------------------------------------------------------- the scale
solid(slab(SCALE, TOP, SCALE_TOP - TOP, 4, 0.8), 'mid', { inner: sideSeam(SCALE, SCALE_TOP - 4, P, 4) });
line(planOutline(insetPlan(SCALE, 3.4), SCALE_TOP, P, 4), 'faint');
for (const [x, y] of corners(SCALE, 6)) screw(x, y, SCALE_TOP, 1.6);
// The dial plate and its dial, in the plane of the housing's front.
{
  const y = SCALE_FRONT;
  const [cx, , cz] = DIAL;
  const plate = (inset: number): Point3[] => {
    const half = DIAL_R + 3 - inset;
    return [[cx - half, y, cz - half], [cx + half, y, cz - half], [cx + half, y, cz + half], [cx - half, y, cz + half]];
  };
  line(face3(plate(0)), 'lo');
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    dots([at([cx + sx * (DIAL_R + 1.4), y, cz + sz * (DIAL_R + 1.4)])], 0.42, 'mid');
  }
  face(face3(yCircle(cx, y, cz, DIAL_R, 64)), 'top');
  line(face3(yCircle(cx, y, cz, DIAL_R, 64)), 'mid');
  line(face3(yCircle(cx, y, cz, DIAL_R - 1.6, 64)), 'lo');
  // A tick every half mark of push, rooted on the inner ring; long ones every whole mark.
  const steps = PUSH_MAX * 2;
  for (let k = 0; k <= steps; k++) {
    const a = -DIAL_SWEEP + (2 * DIAL_SWEEP * k) / steps;
    const major = k % 2 === 0;
    const r0 = DIAL_R - 1.6;
    const r1 = r0 - (major ? 2 : 1.2);
    line(face3([[cx + r0 * Math.sin(a), y, cz + r0 * Math.cos(a)], [cx + r1 * Math.sin(a), y, cz + r1 * Math.cos(a)]], false), k === 0 ? 'hi' : major ? 'mid' : 'lo');
  }
}
slot('needle');
// The pan on its stem.
solid(cyl(TOOL[0], TOOL[1], 4.5, SCALE_TOP, 4, 24, 0.3), 'mid');
solid(cyl(TOOL[0], TOOL[1], PAN_R, SCALE_TOP + 4, PAN_TOP - SCALE_TOP - 4, 56, 0.6), 'hi');
line(ring(TOOL[0], TOOL[1], PAN_R - 2.6, PAN_TOP, P, 56), 'faint');

// ----------------------------------------------- the rack of spare springs
solid(slab(RACK, TOP, RACK_TOP - TOP, 3, 0.6), 'mid', { inner: sideSeam(RACK, TOP + 2, P, 3) });
line(planOutline(insetPlan(RACK, 2.4), RACK_TOP, P, 3), 'faint');
for (const [x, y] of [[RACK.x + 4, RACK.y + RACK.d / 2], [RACK.x + RACK.w - 4, RACK.y + RACK.d / 2]] as const) dots([at([x, y, RACK_TOP])], 0.45, 'mid');
slot('tray');

// -------------------------------------------------------- the label plate
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.82], [1, 0.58], [2, 0.36]] as const) {
  const y = LABEL.y + 2.6 + k * 2.4;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 12) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');

// ------------------------------------------------------- the sealed policy box
solid(slab(POLICY, TOP, POLICY_TOP - TOP, 3, 0.8), 'mid', { inner: sideSeam(POLICY, POLICY_TOP - 5, P, 3) });
line(planOutline(insetPlan(POLICY, 3.2), POLICY_TOP, P, 3), 'faint');
for (const [x, y] of corners(POLICY, 5.5)) screw(x, y, POLICY_TOP, 1.6);
// Three closed vent slots on its front face.
for (let k = 0; k < 3; k++) {
  const z = TOP + 5 + k * 3.2;
  const y = POLICY.y + POLICY.d;
  const x0 = POLICY.x + 8;
  const x1 = POLICY.x + POLICY.w - 8;
  line(face3([[x0, y, z], [x1, y, z], [x1, y, z + 1.3], [x0, y, z + 1.3]]), 'lo');
}
// The cable socket on its left face.
const SOCKET: Point3 = [POLICY.x, POLICY.y + 9, TOP + 9];
solid(extrude(roundedPlan({ x: POLICY.x - 2.4, y: SOCKET[1] - 3, w: 2.4, d: 6, r: 0.8 }, 2), TOP + 6, 6, P), 'lo');
// ------------------------------------------------------- the tool and arm
slot('tool-low');
slot('arm');
slot('tool-high');

// ---------------------------------------------------------- the moving parts
/** How a spring looks: its wire weight and turns, thicker and fewer for a stiffer spring. */
export const SPRING_LOOK: Record<SpringId, { weight: number; turns: number }> = {
  soft: { weight: 0.55, turns: 8 },
  medium: { weight: 0.85, turns: 6.5 },
  stiff: { weight: 1.25, turns: 5 },
};

/** The crosshead at a target: its block on the column, the depth rod and its pointer. */
function crossheadParts(target: number): Part[] {
  const top = armTopFor(target);
  const bottom = top - BLOCK_BELOW;
  const tip = tipFor(target);
  return collect(() => {
    // The depth rod hangs from a lug under the block, down in front of the column, to the target.
    solid(cyl(ROD_AT[0], ROD_AT[1], DEPTH_ROD_R, tip + 1.2, bottom - tip - 1.2, 14), 'mid');
    solid(cyl(ROD_AT[0], ROD_AT[1], 1.9, tip, 1.2, 16, 0.2), 'hi');
    // Its pointer: a short blade from the rod's tip back to the ruler's edge.
    solid(extrude([[RULER.x + RULER.w + 0.2, ROD_AT[1] - 0.4], [ROD_AT[0], ROD_AT[1] - 0.4], [ROD_AT[0], ROD_AT[1] + 0.4], [RULER.x + RULER.w + 0.2, ROD_AT[1] + 0.4]], tip, 1.2, P), 'hi');
    solid(slab(BLOCK, bottom, BLOCK_BELOW + BLOCK_ABOVE, 3, 0.7), 'mid', { inner: sideSeam(BLOCK, bottom + 5, P, 3) });
    line(planOutline(insetPlan(BLOCK, 3), top + BLOCK_ABOVE, P, 3), 'faint');
    for (const [x, y] of corners(BLOCK, 5.5)) screw(x, y, top + BLOCK_ABOVE, 1.5);
    // The rod's lug on the block's underside, seen at its front.
    solid(cyl(ROD_AT[0], ROD_AT[1], 2.3, bottom - 2, 2, 16, 0.2), 'mid');
  });
}

/** The arm at a target: from the block's face to the boss the tool hangs through. */
function armParts(target: number): Part[] {
  const top = armTopFor(target);
  return collect(() => {
    solid(slab(ARM, top - ARM_H, ARM_H, 6, 0.6), 'mid', { inner: sideSeam(ARM, top - 3, P, 6) });
    line(ring(TOOL[0], TOOL[1], 2.6, top, P, 20), 'lo');
    for (const x of [ARM.x + 5, ARM.x + 13]) screw(x, AXIS_Y, top, 1.5);
  });
}

/** The tool and its spring for a spring and a target: below the arm (pad, rod, collar, spring) and above it (rod and nut). */
function toolParts(spring: SpringId, target: number) {
  const tip = tipFor(toolFor(target));
  const top = armTopFor(target);
  const armBottom = top - ARM_H;
  const [x, y] = TOOL;
  const look = SPRING_LOOK[spring];
  const springBottom = tip + COLLAR_Z + COLLAR_H;
  const coil = coilUp(x, y, springBottom, armBottom, SPRING_R, look.turns);
  const low = collect(() => {
    solid(cyl(x, y, 4.6, tip, PAD_H, 28, 0.4), 'hi');
    line(coil.back, 'lit', undefined, look.weight);
    solid(cyl(x, y, ROD_R, tip + PAD_H, armBottom - tip - PAD_H, 14), 'mid');
    solid(cyl(x, y, 5, tip + COLLAR_Z, COLLAR_H, 28, 0.3), 'mid');
    dots([at([x + 5 * towardViewer(P)[0], y + 5 * towardViewer(P)[1], tip + COLLAR_Z + COLLAR_H / 2])], 0.4, 'lo');
    line(ring(x, y, SPRING_R, springBottom, P, 28), 'lit', undefined, look.weight);
    line(coil.front, 'lit', undefined, look.weight);
  });
  const nutBottom = tip + NUT_ABOVE_TIP;
  const high = collect(() => {
    if (nutBottom > top + 0.05) solid(cyl(x, y, ROD_R, top, nutBottom - top, 14), 'mid');
    solid(cyl(x, y, 3.7, nutBottom, NUT_H, 6, 0.3), 'mid');
    solid(cyl(x, y, ROD_R, nutBottom + NUT_H, 2.4, 14), 'mid');
  });
  return { low, high };
}

/** The dial's needle for a push. */
export function needleAngle(push: number) {
  return -DIAL_SWEEP + (2 * DIAL_SWEEP * Math.max(0, Math.min(push, PUSH_MAX))) / PUSH_MAX;
}
function needleParts(push: number): Part[] {
  const [cx, , cz] = DIAL;
  const y = SCALE_FRONT + 0.2;
  const a = needleAngle(push);
  const r = DIAL_R - 3;
  return [
    { kind: 'line', d: face3([[cx - 2.2 * Math.sin(a), y, cz - 2.2 * Math.cos(a)], [cx + r * Math.sin(a), y, cz + r * Math.cos(a)]], false), tone: 'hi', free: true, weight: 1.1 },
    { kind: 'dots', points: [at([cx, y, cz])], size: 1.3, tone: 'hi' },
  ];
}

/** The two springs not fitted, standing on the rack's pegs. */
function trayParts(fitted: SpringId): Part[] {
  const spares = SPRINGS.filter((spring) => spring.id !== fitted);
  const pegs: Plane[] = [[RACK.x + 13, RACK.y + RACK.d / 2], [RACK.x + RACK.w - 13, RACK.y + RACK.d / 2]];
  return collect(() => {
    spares.forEach((spring, index) => {
      const [x, y] = pegs[index]!;
      const look = SPRING_LOOK[spring.id];
      const coil = coilUp(x, y, RACK_TOP, RACK_TOP + SPRING_FREE, SPRING_R, look.turns);
      line(coil.back, 'lo', undefined, look.weight);
      solid(cyl(x, y, 1.8, RACK_TOP, SPRING_FREE + 3, 14), 'mid');
      solid(cyl(x, y, 2.6, RACK_TOP + SPRING_FREE + 3, 1.6, 16, 0.2), 'mid');
      line(ring(x, y, SPRING_R, RACK_TOP, P, 28), 'mid', undefined, look.weight);
      line(coil.front, 'mid', undefined, look.weight);
      // Its ground top end: the last turn closes flat, so the wire ends on it.
      line(ring(x, y, SPRING_R, RACK_TOP + SPRING_FREE, P, 28), 'mid', undefined, look.weight);
    });
  });
}

/** The cable from the policy box, along the back of the bench, up the column's back to the motor. */
function cableParts(): Part[] {
  const route: Point3[] = [
    SOCKET.map((v, k) => (k === 0 ? v - 2.4 : v)) as Point3,
    [POLICY.x - 5, SOCKET[1], TOP + 1.2],
    [POLICY.x - 5, BASE.y + 6, TOP + 1.2],
    [COLUMN.x + COLUMN.w / 2, BASE.y + 6, TOP + 1.2],
    [COLUMN.x + COLUMN.w / 2, COLUMN.y - 1.4, TOP + 1.2],
    [COLUMN.x + COLUMN.w / 2, COLUMN.y - 1.4, COLUMN_TOP + 8],
    [MOTOR[0], MOTOR[1] - 7.5, COLUMN_TOP + 8],
  ];
  return [{ kind: 'line', d: pathOf(route.map(at)), tone: 'lo', weight: 1 }, { kind: 'dots', points: [at(route[0]!), at(route[route.length - 1]!)], size: 1.1, tone: 'lo' }];
}

export type PressState = { spring: SpringId; target: number };

/** Every moving part for a spring and a (possibly in-between) target, by slot. */
export function movingAt({ spring, target }: PressState): Record<Slot, Part[]> {
  const tool = toolParts(spring, target);
  return {
    'policy-cable': cableParts(),
    crosshead: crossheadParts(target),
    'tool-low': tool.low,
    arm: armParts(target),
    'tool-high': tool.high,
    needle: needleParts(pushFor(spring, target)),
    tray: trayParts(spring),
  };
}

/** The press's pose for a target, in world units: the tool's tip, the arm's top, the spring's length and how far the nut has lifted off the arm. */
export function poseFor(target: number) {
  const tip = tipFor(toolFor(target));
  const armTop = armTopFor(target);
  return { tip, armTop, springLength: armTop - ARM_H - (tip + COLLAR_Z + COLLAR_H), nutLift: tip + NUT_ABOVE_TIP - armTop, gap: gapFor(target) * MARK };
}

/** The spring's length when nothing squeezes it. */
export const SPRING_HANG = poseFor(0).springLength;
