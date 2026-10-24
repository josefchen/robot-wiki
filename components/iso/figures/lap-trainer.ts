/**
 * The laparoscopic box trainer for ScopeFollow, drawn with the isometric kit.
 *
 * The object is the explanation. Moon Surgical's ScoPilot lets a robot arm
 * keep the laparoscope aimed at the surgeon's instrument tip, on demand,
 * while the surgeon keeps both instruments: Level 1 on Yang's scale, one
 * task automated under the surgeon's continuous supervision. On this bench a
 * box trainer holds a peg board under a port plate. Two instruments, the
 * surgeon's hands, enter through two trocar ports; between them a
 * laparoscope enters through a third, held by a two-link robot arm on a
 * clamped column. The scope's light falls on the board as one lit pool, the
 * one lit part: what the camera sees. With following on, the arm turns the
 * scope about its port so the pool stays on the right instrument's tip
 * wherever the surgeon moves it. With following off, the scope stays where
 * it was put, and a tip that moves away leaves the picture.
 *
 * The geometry is illustrative; no number is claimed. Every port is a fixed
 * pivot: an instrument's shaft always runs straight through its port, and
 * so does the scope's (tested), so the outside ends move opposite the tips,
 * as they do in the body. World units are about 2.5 mm: x across the bench,
 * y toward the viewer, z up.
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
  roundedPlan,
  sideArc,
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
import { barBetween, basisOf, circleAround, discAlong, viewOf } from '../prism.ts';

export const WIDTH = 600;
export const AZIMUTH = 52;
export const ELEVATION = 40;

// ----------------------------------------------------------------- vectors
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length3 = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Point3): Point3 => mul(a, 1 / (length3(a) || 1));

// ----------------------------------------------------------------- the layout
const PLATE: Plan = { x: -134, y: -80, w: 222, d: 144, r: 9 };
const PLATE_Z = 9;
const PLATE_H = 7;
const TOP = PLATE_Z + PLATE_H;

/** The trainer's tray, and the peg board set into it. */
const TRAY: Plan = { x: -74, y: -64, w: 148, d: 124, r: 6 };
const TRAY_H = 9;
const TRAY_TOP = TOP + TRAY_H;
const BOARD: Plan = { x: -64, y: -54, w: 128, d: 104, r: 4 };
export const BOARD_TOP = TRAY_TOP + 2.4;

/** The pegs: two rows of three on the board's front half. */
export const PEGS: Plane[] = [
  [-28, -24],
  [4, -24],
  [36, -24],
  [-28, 4],
  [4, 4],
  [36, 4],
];
const PEG_R = 2.2;
const PEG_H = 13;
/** An instrument's tip works at the height of the pegs' tops. */
export const TIP_Z = BOARD_TOP + PEG_H + 1.5;

/** The port plate over the board's back half, on four posts. */
const LID: Plan = { x: -74, y: -64, w: 148, d: 42, r: 5 };
const LID_Z = BOARD_TOP + 64;
const LID_H = 4;
/** A soft pad, the trainer's stand-in for the abdominal wall, carries the ports on the plate. */
const PAD: Plan = { x: -60, y: -56, w: 122, d: 24, r: 4 };
const PAD_H = 2.4;
const LID_THICK = LID_H + PAD_H;
export const LID_TOP = LID_Z + LID_THICK;
const POST_R = 3;
const POSTS: Plane[] = [
  [-66, -56],
  [66, -56],
  [-66, -30],
  [66, -30],
];

/** The three ports: the surgeon's left and right instruments, and the scope between them. */
export const LEFT_PORT: Point3 = [2, -44, LID_TOP];
export const RIGHT_PORT: Point3 = [46, -44, LID_TOP];
export const SCOPE_PORT: Point3 = [-42, -44, LID_TOP];
/** An instrument is this long from its tip to the back of its handle's barrel. */
const SHAFT = 116;
const SHAFT_R = 1.5;
/** The scope reaches this far inside the port, and its shaft this far outside before the coupler. */
export const SCOPE_IN = 40;
const SCOPE_OUT = 24;
const SCOPE_R = 2.3;
/** Half the angle the scope's light and view cover. */
export const VIEW_HALF_ANGLE = (15 * Math.PI) / 180;

/** The robot: a column clamped to the bench at the back left, its shoulder on top, two links to a wrist clamp on the scope. */
const COLUMN: Plane = [-112, -44];
const COLUMN_R = 6.4;
const CLAMP_BASE: Plan = { x: -128, y: -60, w: 32, d: 32, r: 3 };
const SHOULDER_Z = LID_TOP + 24;
export const SHOULDER: Point3 = [COLUMN[0], COLUMN[1], SHOULDER_Z];
/** The camera cable's connector on the column, and where the cable leaves it. */
const CONNECTOR: Plan = { x: COLUMN[0] + COLUMN_R - 0.6, y: COLUMN[1] - 5, w: 5.4, d: 10, r: 0.8 };
const CONNECTOR_Z = LID_Z - 8;
const CABLE_FROM: Point3 = [CONNECTOR.x + CONNECTOR.w, COLUMN[1], CONNECTOR_Z + 4.6];
export const UPPER = 42;
export const FORE = 40;

/** Where the left instrument rests, holding the transfer ring on the back left peg: it stays put. */
export const LEFT_TIP: Point3 = [-22, -21, BOARD_TOP + 2.6];

// ------------------------------------------------------------------ the model
/** A straight instrument through a fixed port: tip, shaft direction (outward, tip to port) and the handle's end. */
export function instrumentPose(tip: Point3, port: Point3) {
  const out = unit(sub(port, tip));
  return { tip, out, end: add(tip, mul(out, SHAFT)) };
}

/** The scope through its port, aimed at `aim`: its distal end inside, its axis (inward) and the coupler outside. */
export function scopePose(aim: Point3) {
  const inward = unit(sub(aim, SCOPE_PORT));
  const distal = add(SCOPE_PORT, mul(inward, SCOPE_IN));
  const coupler = add(SCOPE_PORT, mul(inward, -SCOPE_OUT));
  return { inward, distal, coupler };
}

/** Does the scope, aimed at `aim`, see the point `tip`? Inside its view cone. */
export function inView(aim: Point3, tip: Point3) {
  const { inward, distal } = scopePose(aim);
  const to = sub(tip, distal);
  const along = dot(to, inward);
  if (along <= 0) return false;
  return Math.acos(Math.min(1, along / (length3(to) || 1))) < VIEW_HALF_ANGLE;
}

/** The pool of light on the board: where the view cone meets the board's top, cut to the board's edge. */
export function poolOf(aim: Point3, steps = 72): Point3[] {
  const { inward, distal } = scopePose(aim);
  const [u, v] = basisOf(inward);
  let points: Plane[] = [];
  for (let k = 0; k < steps; k++) {
    const angle = (k / steps) * Math.PI * 2;
    const ray = add(mul(inward, Math.cos(VIEW_HALF_ANGLE)), mul(add(mul(u, Math.cos(angle)), mul(v, Math.sin(angle))), Math.sin(VIEW_HALF_ANGLE)));
    const t = (BOARD_TOP - distal[2]) / ray[2];
    const hit = add(distal, mul(ray, t));
    points.push([hit[0], hit[1]]);
  }
  // Sutherland-Hodgman against the board's outline (convex, counter-clockwise).
  const edge = roundedPlan(insetPlan(BOARD, 0.6), 4);
  for (let k = 0; k < edge.length && points.length; k++) {
    const a = edge[k]!;
    const b = edge[(k + 1) % edge.length]!;
    const inside = (p: Plane) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const cut = (p: Plane, q: Plane): Plane => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const t = (ex * (a[1] - p[1]) - ey * (a[0] - p[0])) / (ex * dy - ey * dx);
      return [p[0] + dx * t, p[1] + dy * t];
    };
    const next: Plane[] = [];
    for (let j = 0; j < points.length; j++) {
      const p = points[j]!;
      const q = points[(j + 1) % points.length]!;
      if (inside(q)) {
        if (!inside(p)) next.push(cut(p, q));
        next.push(q);
      } else if (inside(p)) next.push(cut(p, q));
    }
    points = next;
  }
  return points.map(([x, y]) => [x, y, BOARD_TOP] as Point3);
}

/** The coupler's radius, and the camera head's length behind it. */
const COUPLER_R = 4.8;
const COUPLER_L = 7;
const CAMERA_L = 15;
/**
 * The robot holds the scope by its camera head: a flange on the scope's axis
 * at the camera head's back end, and the wrist joint a little beyond it, so
 * the forearm comes to the scope from behind and never crosses the camera.
 */
export function mountOf(aim: Point3): { flange: Point3; wrist: Point3; out: Point3 } {
  const { inward, coupler } = scopePose(aim);
  const out = mul(inward, -1);
  const flange = add(coupler, mul(out, COUPLER_L + CAMERA_L));
  return { flange, wrist: add(flange, mul(out, 7)), out };
}

/** The robot arm reaching `wrist`: the column's yaw, the elbow (up) and both link lengths kept. */
export function armPose(wrist: Point3) {
  const dx = wrist[0] - SHOULDER[0];
  const dy = wrist[1] - SHOULDER[1];
  const yaw = Math.atan2(dy, dx);
  const reach = Math.hypot(dx, dy);
  const rise = wrist[2] - SHOULDER[2];
  const span = Math.min(Math.hypot(reach, rise), UPPER + FORE - 1e-6);
  const base = Math.atan2(rise, reach);
  const inner = Math.acos((UPPER * UPPER + span * span - FORE * FORE) / (2 * UPPER * span));
  const lift = base + inner;
  const flat: Plane = [Math.cos(yaw), Math.sin(yaw)];
  const elbow: Point3 = [SHOULDER[0] + flat[0] * UPPER * Math.cos(lift), SHOULDER[1] + flat[1] * UPPER * Math.cos(lift), SHOULDER[2] + UPPER * Math.sin(lift)];
  return { yaw, elbow, wrist, joint: [-flat[1], flat[0], 0] as Point3 };
}

// ------------------------------------------------------------------ the task
/** The peg the still pose's tip works at, front middle. */
const STILL_PEG = 4;
/**
 * The surgeon's drill for the right instrument: from wherever its tip is, peg
 * to peg on its own side of the board, and back to where it started, so a
 * drill run from the still pose ends on the still pose.
 */
export const TASK_PEGS: number[] = [1, 2, 5];
/** Seconds to move between two stops, and to dwell at each. */
const MOVE_S = 1.25;
const DWELL_S = 0.55;
export const TASK_SECONDS = (TASK_PEGS.length + 1) * (MOVE_S + DWELL_S) + DWELL_S;
const pegTip = (index: number): Point3 => [PEGS[index]![0], PEGS[index]![1], TIP_Z];
export const STILL_TIP = pegTip(STILL_PEG);
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const taskStops = (from: Point3): Point3[] => [from, ...TASK_PEGS.map(pegTip), from];

/** The right tip at `t` seconds into the drill started at `from`: an eased move to each stop with a short lift over the board, and a dwell at each. */
export function taskTipAt(t: number, from: Point3 = STILL_TIP): Point3 {
  const stops = taskStops(from);
  let clock = Math.max(0, t) - DWELL_S;
  if (clock <= 0) return from;
  for (let leg = 0; leg < stops.length - 1; leg++) {
    const a = stops[leg]!;
    const b = stops[leg + 1]!;
    if (clock <= MOVE_S) {
      const share = ease(clock / MOVE_S);
      const lift = 4 * Math.sin(Math.PI * Math.max(0, Math.min(1, clock / MOVE_S)));
      return [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share, a[2] + (b[2] - a[2]) * share + lift];
    }
    clock -= MOVE_S + DWELL_S;
  }
  return stops[stops.length - 1]!;
}

/** The drill under reduced motion: the tip stays on each stop until it would arrive at the next, then jumps there. */
export function taskStopAt(t: number, from: Point3 = STILL_TIP): Point3 {
  const stops = taskStops(from);
  const arrived = Math.floor(Math.max(0, t) / (MOVE_S + DWELL_S));
  return stops[Math.min(arrived, stops.length - 1)]!;
}

/** Where the scope looks to keep a tip in the middle of its picture: under the tip, at the pegs' middle height. */
export const lookAt = (tip: Point3): Point3 => [tip[0], tip[1], BOARD_TOP + 8];

/** How quickly the arm re-aims the scope at a moving tip (seconds): fast enough to hold the drill's tip in view. */
export const AIM_SECONDS = 0.1;

/** One step of following: the scope's aim eases toward the look point under the tip (a first-order follow). */
export function followAim(aim: Point3, tip: Point3, dt: number): Point3 {
  const goal = lookAt(tip);
  const keep = Math.exp(-dt / AIM_SECONDS);
  return [goal[0] + (aim[0] - goal[0]) * keep, goal[1] + (aim[1] - goal[1]) * keep, goal[2]];
}

/** The board region a dragged tip may reach: the pegs' field on the right instrument's side. */
export function clampTip([x, y]: Plane): Point3 {
  return [Math.max(-12, Math.min(42, x)), Math.max(-28, Math.min(10, y)), TIP_Z];
}

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(PLATE, 6)) extremes.push([px, py, 0], [px, py, TOP]);
// The arm and both instruments' handles at every peg the task visits, and at the drag field's corners.
const reachTips: Point3[] = [...PEGS.map(([x, y]) => [x, y, TIP_Z + 7] as Point3), clampTip([-60, -20]), clampTip([60, -20]), clampTip([-60, 60]), clampTip([60, 60])];
for (const tip of reachTips) {
  const right = instrumentPose(tip, RIGHT_PORT);
  extremes.push(add(right.end, [0, 0, 4]), add(right.end, [0, 0, -22]));
  const { coupler, inward } = scopePose(lookAt(tip));
  extremes.push(add(coupler, mul(inward, -26)));
  const arm = armPose(mountOf(lookAt(tip)).wrist);
  extremes.push(add(arm.elbow, [0, 0, 8]));
}
{
  const left = instrumentPose(LEFT_TIP, LEFT_PORT);
  extremes.push(add(left.end, [0, 0, 4]), add(left.end, [0, 0, -22]));
}
extremes.push([SHOULDER[0], SHOULDER[1], SHOULDER[2] + 10]);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 7;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
const V = viewOf(P);

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
const face3 = (points: Point3[]) => pathOf(points.map(at), true);
const line3 = (points: Point3[]) => pathOf(points.map(at));

/** The board point under a screen point, at height z (the inverse camera on a horizontal plane). */
export function planeAt([sx, sy]: Flat, z: number): Plane {
  const { scale, origin } = P;
  const k = scale * Math.sqrt(1.6);
  const a = (AZIMUTH * Math.PI) / 180;
  const e = (ELEVATION * Math.PI) / 180;
  const u = (sx - origin[0]) / k;
  const w = ((sy - origin[1]) / k + z * Math.cos(e)) / Math.sin(e);
  return [u * Math.sin(a) + w * Math.cos(a), -u * Math.cos(a) + w * Math.sin(a)];
}

// ------------------------------------------------------------------- parts
export type Slot = 'pool' | 'inside' | 'outside';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
let into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => into.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => into.push({ kind: 'face', d, fill });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}

// ------------------------------------------------------------------ the bench
for (const [x, y] of byDepth(corners(PLATE, 14))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, PLATE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, PLATE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, PLATE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(PLATE, PLATE_Z, PLATE_H, 9, 1.2), 'lo', { inner: sideSeam(PLATE, PLATE_Z + 2.6, P, 9) });
line(planOutline(insetPlan(PLATE, 4.5), TOP, P, 9), 'faint');
for (const [x, y] of corners(PLATE, 9.5)) screw(x, y, TOP, 2.1);
// The maker's plate at the front right.
const LABEL: Plan = { x: -120, y: 30, w: 36, d: 10, r: 1.4 };
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.8], [1, 0.5]] as const) {
  const y = LABEL.y + 3.4 + k * 3;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 12) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');
// A tray of spare transfer rings for the drill, screwed to the bench beside the trainer.
const SPARES: Plan = { x: -124, y: -14, w: 40, d: 30, r: 3 };
solid(slab(SPARES, TOP, 2.2, 3, 0.5), 'mid', { inner: sideSeam(SPARES, TOP + 1.1, P, 3) });
line(planOutline(insetPlan(SPARES, 2.4), TOP + 2.2, P, 3), 'faint');
for (const [x, y] of corners(SPARES, 4.2)) dots([at([x, y, TOP + 2.2])], 0.42, 'mid');
for (const [x, y] of byDepth([[-114, -6], [-102, -6], [-114, 7], [-102, 7]])) {
  solid(cyl(x, y, 4.6, TOP + 2.2, 1.6, 30, 0.3), 'mid', { inner: sideArc(x, y, 4.6, TOP + 3, P, 22) });
  line(ring(x, y, 2.8, TOP + 3.8, P, 24), 'lo');
}

// The robot's column: a screwed clamp base, the column with its collar and seam, and the turntable on top.
solid(slab(CLAMP_BASE, TOP, 6, 3, 0.6), 'mid', { inner: sideSeam(CLAMP_BASE, TOP + 2.4, P, 3) });
for (const [x, y] of corners(CLAMP_BASE, 4.6)) screw(x, y, TOP + 6, 1.5);
solid(cyl(COLUMN[0], COLUMN[1], COLUMN_R + 3, TOP + 6, 4, 36, 0.4), 'lo');
solid(cyl(COLUMN[0], COLUMN[1], COLUMN_R, TOP + 10, SHOULDER_Z - 11 - (TOP + 10), 32), 'mid', {
  inner: sideArc(COLUMN[0], COLUMN[1], COLUMN_R, TOP + 34, P, 24) + sideArc(COLUMN[0], COLUMN[1], COLUMN_R, SHOULDER_Z - 30, P, 24),
});
solid(cyl(COLUMN[0], COLUMN[1], COLUMN_R + 2.6, SHOULDER_Z - 11, 4, 36, 0.4), 'mid', { inner: sideArc(COLUMN[0], COLUMN[1], COLUMN_R + 2.6, SHOULDER_Z - 9, P, 24) });
// The camera's connector box on the column's trainer side, two screws on its face.
solid(slab(CONNECTOR, CONNECTOR_Z, 11, 2, 0.4), 'mid');
dots([at([CONNECTOR.x + CONNECTOR.w, CONNECTOR.y + 1.6, CONNECTOR_Z + 9]), at([CONNECTOR.x + CONNECTOR.w, CONNECTOR.y + CONNECTOR.d - 1.6, CONNECTOR_Z + 9])], 0.42, 'mid');

// ---------------------------------------------------------------- the trainer
solid(slab(TRAY, TOP, TRAY_H, 6, 1), 'mid', { inner: sideSeam(TRAY, TOP + 3.2, P, 6) });
line(planOutline(insetPlan(TRAY, 3.2), TRAY_TOP, P, 6), 'faint');
for (const [x, y] of corners(TRAY, 5)) screw(x, y, TRAY_TOP, 1.5);
// The peg board: a felt pad a shade darker than the trainer, set into the tray.
solid(slab(BOARD, TRAY_TOP, BOARD_TOP - TRAY_TOP, 4), 'lo', { crease: 'none' });
face(pathOf(roundedPlan(insetPlan(BOARD, 0.3), 4).map(([x, y]) => at([x, y, BOARD_TOP])), true), 1);
line(planOutline(BOARD, BOARD_TOP, P, 4), 'lo');
slot('pool');
// The pegs, each in a collar, sorted far to near; three carry the transfer rings a peg-transfer drill moves.
const RINGED = new Set([0, 2, 3]);
for (const [x, y] of byDepth(PEGS)) {
  if (RINGED.has(PEGS.findIndex(([px, py]) => px === x && py === y))) {
    solid(cyl(x, y, 6, BOARD_TOP, 1.8, 32, 0.3), 'mid', { inner: sideArc(x, y, 6, BOARD_TOP + 0.9, P, 24) });
    line(ring(x, y, 4.3, BOARD_TOP + 1.8, P, 28), 'lo');
  }
  solid(cyl(x, y, PEG_R + 1.6, BOARD_TOP, 1.4, 22, 0.2), 'lo');
  solid(cyl(x, y, PEG_R, BOARD_TOP + 1.4, PEG_H - 1.4, 18, 0.3), 'hi');
}
// The box's back and left walls (its front and right side are open, to see in), then the back posts.
solid(slab({ x: POSTS[0]![0], y: POSTS[0]![1] - 1.6, w: POSTS[1]![0] - POSTS[0]![0], d: 3.2, r: 0.6 }, TRAY_TOP, LID_Z - TRAY_TOP, 2), 'lo', {
  inner: sideSeam({ x: POSTS[0]![0], y: POSTS[0]![1] - 1.6, w: POSTS[1]![0] - POSTS[0]![0], d: 3.2, r: 0.6 }, TRAY_TOP + (LID_Z - TRAY_TOP) / 2, P, 2),
});
solid(slab({ x: POSTS[0]![0] - 1.6, y: POSTS[0]![1], w: 3.2, d: POSTS[2]![1] - POSTS[0]![1], r: 0.6 }, TRAY_TOP, LID_Z - TRAY_TOP, 2), 'lo', {
  inner: sideSeam({ x: POSTS[0]![0] - 1.6, y: POSTS[0]![1], w: 3.2, d: POSTS[2]![1] - POSTS[0]![1], r: 0.6 }, TRAY_TOP + (LID_Z - TRAY_TOP) / 2, P, 2),
});
for (const [x, y] of POSTS.slice(0, 2)) {
  solid(cyl(x, y, POST_R + 1.6, TRAY_TOP, 2, 22, 0.3), 'lo');
  solid(cyl(x, y, POST_R, TRAY_TOP + 2, LID_Z - TRAY_TOP - 2, 20), 'mid');
}
slot('inside');
for (const [x, y] of POSTS.slice(2)) {
  solid(cyl(x, y, POST_R + 1.6, TRAY_TOP, 2, 22, 0.3), 'lo');
  solid(cyl(x, y, POST_R, TRAY_TOP + 2, LID_Z - TRAY_TOP - 2, 20), 'mid');
}
// The port plate: its slab, groove, four screws over the posts, and a raised boss with a seal ring at each port.
solid(slab(LID, LID_Z, LID_H, 5, 0.8), 'mid', { inner: sideSeam(LID, LID_Z + 1.6, P, 5) });
for (const [x, y] of POSTS) screw(x, y, LID_Z + LID_H, 1.6);
solid(slab(PAD, LID_Z + LID_H, PAD_H, 4, 0.6), 'lo');
line(planOutline(insetPlan(PAD, 2.6), LID_TOP, P, 4), 'faint');
for (const port of [LEFT_PORT, SCOPE_PORT, RIGHT_PORT]) {
  solid(cyl(port[0], port[1], 7.2, LID_TOP, 1.6, 36, 0.3), 'lo');
  line(ring(port[0], port[1], 4.4, LID_TOP + 1.6, P, 28), 'faint');
}
slot('outside');

// ---------------------------------------------------------- the moving parts
type Group = { name: string; capsules: Array<[Point3, Point3, number]>; parts: Part[] };

/** A part list for one moving group. */
function partsOf(build: () => void): Part[] {
  const list: Part[] = [];
  const previous = into;
  into = list;
  build();
  into = previous;
  return list;
}

/** A seam ring round a round part on any axis: the half that faces the viewer. */
function seamAround(centre: Point3, axis: Point3, radius: number) {
  const a = unit(axis);
  const [u, v] = basisOf(a);
  const points: Flat[] = [];
  const runs: Flat[][] = [];
  for (let k = 0; k <= 48; k++) {
    const angle = (k / 48) * Math.PI * 2;
    const normal = add(mul(u, Math.cos(angle)), mul(v, Math.sin(angle)));
    if (dot(normal, V) > 0.04) points.push(at(add(centre, mul(normal, radius))));
    else if (points.length) runs.push(points.splice(0));
  }
  if (points.length) runs.push(points);
  // Join a run that wraps past angle 0 with the one that starts there.
  if (runs.length > 1 && dot(add(mul(u, 1), [0, 0, 0]), V) > 0.04) {
    const last = runs.pop()!;
    runs[0] = [...last, ...runs[0]!];
  }
  return runs.filter((run) => run.length > 1).map((run) => pathOf(run)).join('');
}

/** The face ring on the end of a round part, if that end faces the viewer. */
function endRing(centre: Point3, outward: Point3, radius: number) {
  if (dot(unit(outward), V) <= 0.05) return '';
  return pathOf(circleAround(centre, outward, radius, 28).map(at), true);
}

/** One instrument: what lies inside the box (shaft and jaws) and what stands outside it (trocar, shaft, knob, barrel and grips). */
function instrumentGroups(tip: Point3, port: Point3, name: string, lit = false): { inside: Group; outside: Group } {
  const { out, end } = instrumentPose(tip, port);
  const toPort = length3(sub(port, tip));
  const underLid = add(tip, mul(out, toPort - LID_THICK / Math.max(0.2, out[2])));
  const jawBase = add(tip, mul(out, 7));
  const [u] = basisOf(out);
  const side = unit(cross(out, [0, 0, 1]));
  const inside = partsOf(() => {
    solid(discAlong(jawBase, out, SHAFT_R, length3(sub(underLid, jawBase)), P, 16), 'mid');
    // The jaws: two short blades opening a little either side of the shaft's line.
    for (const sign of [-1, 1]) {
      const spread = add(tip, mul(side, sign * 1.4));
      solid(barBetween(jawBase, spread, u, 1.3, 1.1, P), 'hi', { lit });
    }
    solid(discAlong(add(jawBase, mul(out, -0.8)), out, SHAFT_R + 0.5, 3.2, P, 18), 'lo');
  });
  // Outside: the trocar housing tilts with the shaft on the port's boss, then the shaft, knob, barrel and grip.
  const housingFrom = add(port, mul(out, 1.6 / Math.max(0.2, out[2])));
  const knobAt = add(end, mul(out, -16));
  const outside = partsOf(() => {
    solid(discAlong(housingFrom, out, 4.4, 9, P, 30, 0.3), 'mid', { inner: seamAround(add(housingFrom, mul(out, 6.8)), out, 4.4) });
    stopcock(housingFrom, out, 4.4);
    solid(discAlong(add(housingFrom, mul(out, 9)), out, 3, 2.2, P, 24), 'lo');
    const shaftFrom = add(housingFrom, mul(out, 11.2));
    solid(discAlong(shaftFrom, out, SHAFT_R, length3(sub(knobAt, shaftFrom)), P, 16), 'mid');
    solid(discAlong(knobAt, out, 3.8, 3.6, P, 30, 0.3), 'mid', { inner: knurlAlong(knobAt, out, 3.8, 3.6) });
    // An in-line handle: the barrel, its finger ring on the underside, and the end cap.
    const barrelFrom = add(knobAt, mul(out, 3.6));
    solid(discAlong(barrelFrom, out, 2.9, 11, P, 26, 0.3), 'hi', { inner: seamAround(add(barrelFrom, mul(out, 7.4)), out, 2.9) });
    solid(discAlong(add(barrelFrom, mul(out, 11)), out, 2.1, 2.4, P, 20, 0.2), 'lo');
  });
  return {
    inside: { name: `${name}-inside`, capsules: [[tip, underLid, SHAFT_R + 1.2]], parts: inside },
    outside: { name: `${name}-outside`, capsules: [[port, end, 4], [end, add(end, [0, 0, -16]), 3]], parts: outside },
  };
}

/** The direction off a round part on axis `axis` that shows best: between facing the viewer and pointing right on screen. */
function showingSide(axis: Point3): Point3 {
  const a = unit(axis);
  const right: Point3 = [Math.sin((AZIMUTH * Math.PI) / 180), -Math.cos((AZIMUTH * Math.PI) / 180), 0];
  const flat = (w: Point3) => unit(sub(w, mul(a, dot(w, a))));
  return unit(add(flat(V), mul(flat(right), 1.4)));
}

/** A trocar's stopcock: a short luer spigot off the housing's side that shows, with its tap lever. */
function stopcock(housingFrom: Point3, out: Point3, radius: number) {
  const side = showingSide(out);
  const base = add(add(housingFrom, mul(out, 4.2)), mul(side, radius - 0.5));
  solid(discAlong(base, side, 1.2, 4.6, P, 14, 0.2), 'mid');
  solid(barBetween(add(base, mul(side, 3.4)), add(add(base, mul(side, 3.4)), mul(out, 4.4)), side, 1, 1.1, P), 'lo');
}

/** Knurl lines along a round part on any axis: the generators that face the viewer. */
function knurlAlong(from: Point3, axis: Point3, radius: number, length: number) {
  const a = unit(axis);
  const [u, v] = basisOf(a);
  const lines: string[] = [];
  for (let k = 0; k < 28; k++) {
    const angle = (k / 28) * Math.PI * 2;
    const normal = add(mul(u, Math.cos(angle)), mul(v, Math.sin(angle)));
    if (dot(normal, V) < 0.2) continue;
    const base = add(from, mul(normal, radius));
    lines.push(line3([add(base, mul(a, 0.35)), add(base, mul(a, length - 0.35))]));
  }
  return lines.join('');
}

/** The scope aimed at `aim`: its shaft inside with the lens; outside, the shaft, coupler, light post and camera head. */
function scopeGroups(aim: Point3): { inside: Group; outside: Group } {
  const { inward, distal, coupler } = scopePose(aim);
  const out = mul(inward, -1);
  const underLid = add(SCOPE_PORT, mul(inward, LID_THICK / Math.max(0.2, -inward[2])));
  const inside = partsOf(() => {
    solid(discAlong(distal, out, SCOPE_R, length3(sub(underLid, distal)), P, 20), 'hi', { inner: endRing(distal, inward, SCOPE_R - 0.8) });
  });
  const housingFrom = add(SCOPE_PORT, mul(out, 1.6 / Math.max(0.2, out[2])));
  const camera = add(coupler, mul(out, COUPLER_L));
  const outside = partsOf(() => {
    solid(discAlong(housingFrom, out, 4.8, 9, P, 30, 0.3), 'mid', { inner: seamAround(add(housingFrom, mul(out, 6.8)), out, 4.8) });
    stopcock(housingFrom, out, 4.8);
    solid(discAlong(add(housingFrom, mul(out, 9)), out, 3.2, 2.2, P, 24), 'lo');
    const shaftFrom = add(housingFrom, mul(out, 11.2));
    solid(discAlong(shaftFrom, out, SCOPE_R, length3(sub(coupler, shaftFrom)), P, 20), 'hi');
    // The light post stands off the shaft just below the coupler.
    const postAt = add(coupler, mul(inward, 5));
    const postFacing = showingSide(out);
    solid(discAlong(add(postAt, mul(postFacing, SCOPE_R - 0.4)), postFacing, 1.3, 5.4, P, 14, 0.2), 'mid');
    solid(discAlong(coupler, out, COUPLER_R, COUPLER_L, P, 32, 0.4), 'mid', { inner: seamAround(add(coupler, mul(out, COUPLER_L / 2)), out, COUPLER_R) });
    // The camera head, and the strain relief where its cable leaves the side that faces the column.
    const cable = cableSideOf(aim);
    solid(discAlong(add(cable.mid, mul(cable.side, CAMERA_R - 0.6)), cable.side, 1.9, 4.6, P, 18, 0.3), 'lo');
    solid(discAlong(camera, out, CAMERA_R, CAMERA_L, P, 36, 0.5), 'hi', { inner: seamAround(add(camera, mul(out, CAMERA_L * 0.7)), out, CAMERA_R) });
  });
  return {
    inside: { name: 'scope-inside', capsules: [[distal, underLid, SCOPE_R + 1]], parts: inside },
    outside: { name: 'scope-outside', capsules: [[SCOPE_PORT, add(camera, mul(out, CAMERA_L)), CAMERA_R]], parts: outside },
  };
}

const CAMERA_R = 6;
/** Where the camera cable leaves the camera head: the middle of its side that faces the column. */
function cableSideOf(aim: Point3) {
  const { coupler, inward } = scopePose(aim);
  const out = mul(inward, -1);
  const mid = add(coupler, mul(out, COUPLER_L + CAMERA_L * 0.45));
  const toward = sub(CABLE_FROM, mid);
  return { mid, side: unit(sub(toward, mul(out, dot(toward, out)))) };
}

/** The camera cable: out of the camera head's side, sagging back to the connector on the column. */
function cableGroup(aim: Point3): Group {
  const { mid, side } = cableSideOf(aim);
  const boot = add(mid, mul(side, CAMERA_R - 0.6 + 4.6));
  const c1 = add(boot, mul(side, 12));
  const c2: Point3 = [CABLE_FROM[0] + 22, CABLE_FROM[1], CABLE_FROM[2] - 14];
  const points: Point3[] = [];
  for (let k = 0; k <= 32; k++) {
    const t = k / 32;
    const u = 1 - t;
    points.push(add(add(mul(boot, u * u * u), mul(c1, 3 * u * u * t)), add(mul(c2, 3 * u * t * t), mul(CABLE_FROM, t * t * t))));
  }
  const parts: Part[] = [
    { kind: 'line', d: line3(points), tone: 'mid' },
    { kind: 'dots', points: [at(boot), at(CABLE_FROM)], size: 1, tone: 'mid' },
  ];
  return { name: 'cable', capsules: points.slice(1).map((point, k) => [points[k]!, point, 1] as [Point3, Point3, number]), parts };
}

/** The robot arm: shoulder housing on the column's turntable, upper arm, elbow, forearm, wrist, and the roll joint and flange on the camera head. */
function armGroup(aim: Point3): Group {
  const { flange, wrist, out } = mountOf(aim);
  const { elbow, joint } = armPose(wrist);
  const jointFacing = dot(joint, V) > 0 ? joint : mul(joint, -1);
  const fore = unit(sub(wrist, elbow));
  const parts = partsOf(() => {
    const shoulderFrom = add(SHOULDER, mul(jointFacing, -8));
    solid(discAlong(add(SHOULDER, [0, 0, -7]), [0, 0, 1], 7.6, 3.4, P, 36, 0.3), 'lo');
    solid(discAlong(shoulderFrom, jointFacing, 7.4, 16, P, 40, 0.5), 'mid', { inner: endRing(add(shoulderFrom, mul(jointFacing, 16)), jointFacing, 4.8) });
    solid(discAlong(SHOULDER, unit(sub(elbow, SHOULDER)), 4.4, length3(sub(elbow, SHOULDER)), P, 28), 'hi', {
      inner: seamAround(add(SHOULDER, mul(sub(elbow, SHOULDER), 0.5)), sub(elbow, SHOULDER), 4.4),
    });
    const elbowFrom = add(elbow, mul(jointFacing, -6.5));
    solid(discAlong(elbowFrom, jointFacing, 6, 13, P, 36, 0.4), 'mid', { inner: endRing(add(elbowFrom, mul(jointFacing, 13)), jointFacing, 3.8) });
    solid(discAlong(elbow, fore, 3.6, length3(sub(wrist, elbow)) - 4, P, 24), 'hi', {
      inner: seamAround(add(elbow, mul(sub(wrist, elbow), 0.55)), fore, 3.6),
    });
    // The wrist: a joint housing across the forearm's end, the roll joint down the scope's axis, and the flange on the camera head.
    const across = unit(cross(fore, out));
    const acrossFacing = dot(across, V) > 0 ? across : mul(across, -1);
    solid(discAlong(add(wrist, mul(acrossFacing, -5)), acrossFacing, 5, 10, P, 32, 0.4), 'mid', { inner: endRing(add(wrist, mul(acrossFacing, 5)), acrossFacing, 3) });
    solid(discAlong(flange, out, 3.4, length3(sub(wrist, flange)), P, 24), 'mid');
    solid(discAlong(flange, out, 5.2, 2, P, 32, 0.3), 'lo');
  });
  return { name: 'arm', capsules: [[SHOULDER, elbow, 7], [elbow, wrist, 5], [wrist, flange, 4]], parts };
}

/** The pool of light the scope throws on the board, the one lit part: a pale patch and its lit rim. */
function poolParts(aim: Point3): Part[] {
  const pool = poolOf(aim);
  return [
    { kind: 'face', d: face3(pool), fill: 'top' },
    { kind: 'line', d: face3(pool), tone: 'lit' },
  ];
}

/** Screen-space order for groups that overlap: a capsule pair that crosses on screen puts the nearer one later. */
function ordered(groups: Group[]): Group[] {
  const depth = (p: Point3) => dot(p, V);
  const screenCross = (a0: Point3, a1: Point3, b0: Point3, b1: Point3): [number, number] | null => {
    const [p, q, r, s] = [at(a0), at(a1), at(b0), at(b1)];
    const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
    const w = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    return t >= -0.05 && t <= 1.05 && w >= -0.05 && w <= 1.05 ? [t, w] : null;
  };
  const centre = (g: Group) => g.capsules.reduce((sum, [a, b]) => sum + depth(a) + depth(b), 0) / (2 * g.capsules.length);
  const before = new Map<number, Set<number>>();
  groups.forEach((_, index) => before.set(index, new Set()));
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      let vote = 0;
      for (const [a0, a1] of groups[i]!.capsules) {
        for (const [b0, b1] of groups[j]!.capsules) {
          const hit = screenCross(a0, a1, b0, b1);
          if (!hit) continue;
          const da = depth(add(a0, mul(sub(a1, a0), hit[0])));
          const db = depth(add(b0, mul(sub(b1, b0), hit[1])));
          vote += Math.sign(da - db);
        }
      }
      if (vote === 0) vote = Math.sign(centre(groups[i]!) - centre(groups[j]!));
      // The nearer group is drawn after the farther one.
      if (vote > 0) before.get(i)!.add(j);
      else before.get(j)!.add(i);
    }
  }
  const out: Group[] = [];
  const done = new Set<number>();
  const visit = (index: number, trail: Set<number>) => {
    if (done.has(index) || trail.has(index)) return;
    trail.add(index);
    for (const earlier of before.get(index)!) visit(earlier, trail);
    done.add(index);
    out.push(groups[index]!);
  };
  [...groups.keys()].sort((a, b) => centre(groups[a]!) - centre(groups[b]!)).forEach((index) => visit(index, new Set()));
  return out;
}

export interface Pose {
  /** The right instrument's tip, which the surgeon moves. */
  tip: Point3;
  /** Where the scope is aimed. */
  aim: Point3;
}

/** Every moving part in a pose, by slot. */
export function movingAt({ tip, aim }: Pose): Record<Slot, Part[]> {
  const left = instrumentGroups(LEFT_TIP, LEFT_PORT, 'left');
  const right = instrumentGroups(tip, RIGHT_PORT, 'right');
  const scope = scopeGroups(aim);
  const arm = armGroup(aim);
  return {
    pool: poolParts(aim),
    inside: ordered([left.inside, right.inside, scope.inside]).flatMap((group) => group.parts),
    outside: ordered([cableGroup(aim), arm, left.outside, scope.outside, right.outside]).flatMap((group) => group.parts),
  };
}

/** The still pose: the right tip at its first peg, the scope following it. */
export const STILL_POSE: Pose = { tip: STILL_TIP, aim: lookAt(STILL_TIP) };
