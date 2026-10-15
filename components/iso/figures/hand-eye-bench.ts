/**
 * The hand-eye calibration bench for HandEyePoses, drawn with the isometric kit.
 *
 * The object is the explanation: an arm with a camera on its wrist shows a
 * checkerboard on the bench to the camera from pose after pose. Each pose taken
 * drops a peg into the pose rack along the front edge; the rack's groove after
 * the third hole is the fewest poses that solve the camera's place, and its
 * sunken strip under holes 12 to 15 is where the gains level off. An iris of
 * blades round the camera's neck is the doubt about where the camera sits on the
 * wrist: wide open below three poses, then closing with every pose, quickly at
 * first and barely at all past a dozen.
 *
 * World units: x across the bench, y toward the viewer, z up. The arm is a turret
 * with a shoulder and an elbow that put the wrist on a ray from the board's centre;
 * the camera on the wrist always looks at the board's centre. Static paths are
 * built once; the arm, the camera and its iris are rebuilt for each pose.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  ring,
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
import { barBetween, circleAround, discAlong, prismAlong, viewOf } from '../prism.ts';

export const WIDTH = 640;
export const AZIMUTH = 42;

export const MAX_POSES = 20;

export type LiveId = 'pegs' | 'arm';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'fill'; d: string; paint: 'dark' | 0 | 1 | 2 | 3 }
  | { kind: 'live'; id: LiveId };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -80, y: -50, w: 160, d: 96, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;
/** The checkerboard: a plate on a stand, its centre the point the camera always looks at. */
const BOARD: Plan = { x: -32, y: -30, w: 52, d: 36, r: 1.2 };
const BOARD_Z = 10;
export const TARGET: Point3 = [BOARD.x + BOARD.w / 2, BOARD.y + BOARD.d / 2, BOARD_Z + 1];
const SQUARES = { cols: 7, rows: 5, margin: 3 };
/** The arm's turret and shoulder. */
export const SHOULDER: Point3 = [50, -26, 28];
export const LINKS = [48, 46] as const;
/** The pose rack along the front edge: one hole per pose. */
const RACK: Plan = { x: -52, y: 33, w: 116, d: 9, r: 2 };
const RACK_H = 4;
const HOLE = { pitch: 5.4, r: 1.5, x0: -52 + 6 };
const LABEL: Plan = { x: -74, y: -44, w: 34, d: 11, r: 2 };

/** The camera: lens to board centre, its length, the iris at its back and the mount to the wrist. */
const CAM = { range: 24, lens: [0, 6] as const, lensR: 4.4, body: [6, 28] as const, bodyR: 6, irisR: 10.8, irisInner: 9.6, irisT: 2, mount: 5, mountR: 3.2, ballR: 4.2 };
/** The wrist's distance from the board's centre, along the camera's line of sight. */
const WRIST_RANGE = CAM.range + CAM.body[1] + CAM.irisT + CAM.mount + CAM.ballR;

// ---------------------------------------------------------------- poses
/** The order the poses are taken in: spread over the dome, each new one landing in the widest gap left. */
export const POSE_ORDER = (() => {
  const order: number[] = [];
  for (let i = 0; i < MAX_POSES; i++) {
    let v = 0;
    let denom = 1;
    for (let k = i + 1; k > 0; k >>= 1) {
      denom *= 2;
      v += (k & 1) / denom;
    }
    order.push(v);
  }
  return order;
})();

const RADIANS = Math.PI / 180;
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Point3): Point3 => scale(a, 1 / (norm(a) || 1));
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Where pose i looks from: a direction out of the board's centre. Around the board the poses spread over
 * 130 degrees on the viewer's side, from the arm's side round to the front; their height steps between three tilts, so the camera turns
 * about different axes from pose to pose.
 */
export function poseDirection(i: number): Point3 {
  const t = POSE_ORDER[i]!;
  const around = (-15 + t * 130) * RADIANS;
  const tilt = [64, 78, 54][i % 3]! * RADIANS;
  return [Math.cos(tilt) * Math.cos(around), Math.cos(tilt) * Math.sin(around), Math.sin(tilt)];
}

export interface ArmPose {
  wrist: Point3;
  elbow: Point3;
  look: Point3;
  yaw: number;
}

/** The arm for a look direction (a unit vector out of the board's centre): turret yaw, elbow-up two-link reach. */
export function armFor(look: Point3): ArmPose {
  const dir = unit(look);
  const wrist = add(TARGET, scale(dir, WRIST_RANGE));
  const dx = wrist[0] - SHOULDER[0];
  const dy = wrist[1] - SHOULDER[1];
  const yaw = Math.atan2(dy, dx);
  const h = Math.hypot(dx, dy);
  const v = wrist[2] - SHOULDER[2];
  const [a, b] = LINKS;
  const d = Math.min(Math.hypot(h, v), a + b - 1e-6);
  const cosElbow = (a * a + d * d - b * b) / (2 * a * d);
  const reach = Math.atan2(v, h) + Math.acos(Math.max(-1, Math.min(1, cosElbow)));
  const elbow: Point3 = [SHOULDER[0] + a * Math.cos(reach) * Math.cos(yaw), SHOULDER[1] + a * Math.cos(reach) * Math.sin(yaw), SHOULDER[2] + a * Math.sin(reach)];
  return { wrist, elbow, look: dir, yaw };
}

/** Pose i's arm. */
export const poseArm = (i: number) => armFor(poseDirection(i));

/** Ease between two look directions along the great circle, so the camera keeps looking at the board. */
export function lookBetween(from: Point3, to: Point3, s: number): Point3 {
  const a = unit(from);
  const b = unit(to);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot3(a, b))));
  if (angle < 1e-6) return b;
  const k0 = Math.sin((1 - s) * angle) / Math.sin(angle);
  const k1 = Math.sin(s * angle) / Math.sin(angle);
  return unit(add(scale(a, k0), scale(b, k1)));
}

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (let i = 0; i < MAX_POSES; i++) {
  const arm = poseArm(i);
  extremes.push(add(arm.wrist, [0, 0, CAM.ballR + 4]), add(arm.elbow, [0, 0, 8]));
}
export const P = fitProjection(extremes, WIDTH, 1000, { pad: 12, azimuth: AZIMUTH });
const screen = extremes.map((point) => iso(point, P));
export const HEIGHT = Math.ceil(Math.max(...screen.map(([, y]) => y)) - Math.min(...screen.map(([, y]) => y)) + 24);
P.origin = [P.origin[0], P.origin[1] - Math.min(...screen.map(([, y]) => y)) + 12];

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 32, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const V = viewOf(P);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** Where hole k (0-based) of the pose rack sits. */
export const holeAt = (k: number): Plane => [HOLE.x0 + k * HOLE.pitch, RACK.y + RACK.d / 2];

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => put({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', points: points.map(at), size, tone });

// Base on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 20, BASE.y + 18],
  [BASE.x + BASE.w - 20, BASE.y + 18],
  [BASE.x + 20, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 20, BASE.y + BASE.d - 18],
])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  line(screws.map(([x, y]) => ring(x, y, 2.3, 0, P, 16)).join(''), 'lo');
  dots(screws.map(([x, y]) => [x, y, 0]), 0.5);
}

// Label plate at the back right, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
line([0, 1, 2].map((row) => onTop([[LABEL.x + 6, LABEL.y + 3.2 + row * 2.4], [LABEL.x + (row === 1 ? 22 : 29), LABEL.y + 3.2 + row * 2.4]], 0.8, P)).join(''), 'lo', true);
dots([[LABEL.x + 3, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 0.8]], 0.45);

// The arm's turret at the back left: a bolted flange and the drum. The turning head and the links are live.
{
  const [sx, sy] = SHOULDER;
  solid(cyl(sx, sy, 17, 0, 3, 48, 0.6), 'mid');
  dots(Array.from({ length: 8 }, (_, k): Point3 => {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    return [sx + 14 * Math.cos(a), sy + 14 * Math.sin(a), 3];
  }).filter(([x, y]) => (x - sx) * V[0] + (y - sy) * V[1] > -6), 0.55);
  solid(cyl(sx, sy, 12, 3, 13, 48, 0.6), 'mid', { inner: sideArc(sx, sy, 12, 9, P, 32) });
}

// The checkerboard on its stand: the plate's squares in two tones, its border and two clamps.
{
  const stand: Plan = { x: BOARD.x + 6, y: BOARD.y + 5, w: BOARD.w - 12, d: BOARD.d - 10, r: 2 };
  solid(slab(stand, 0, BOARD_Z - 1.6, 4, 0.6), 'mid', { inner: sideSeam(stand, 3, P, 4) });
  solid(slab(BOARD, BOARD_Z - 1.6, 1.6 + 1, 3, 0.4), 'hi');
  const top = BOARD_Z + 1;
  const cell = { w: (BOARD.w - 2 * SQUARES.margin) / SQUARES.cols, d: (BOARD.d - 2 * SQUARES.margin) / SQUARES.rows };
  const x0 = BOARD.x + SQUARES.margin;
  const y0 = BOARD.y + SQUARES.margin;
  const dark: string[] = [];
  for (let c = 0; c < SQUARES.cols; c++) for (let r = 0; r < SQUARES.rows; r++) {
    if ((c + r) % 2) continue;
    dark.push(onTop([[x0 + c * cell.w, y0 + r * cell.d], [x0 + (c + 1) * cell.w, y0 + r * cell.d], [x0 + (c + 1) * cell.w, y0 + (r + 1) * cell.d], [x0 + c * cell.w, y0 + (r + 1) * cell.d]], top, P, true));
  }
  put({ kind: 'fill', d: dark.join(''), paint: 'dark' });
  line(onTop([[x0, y0], [x0 + SQUARES.cols * cell.w, y0], [x0 + SQUARES.cols * cell.w, y0 + SQUARES.rows * cell.d], [x0, y0 + SQUARES.rows * cell.d]], top, P, true), 'mid');
  // The board's centre mark, where every pose's line of sight lands.
  line(ring(TARGET[0], TARGET[1], 2.2, top, P, 24), 'hi');
  dots([TARGET], 0.7, 'hi');
  for (const x of [BOARD.x + 4, BOARD.x + BOARD.w - 4]) {
    solid(slab({ x: x - 3, y: BOARD.y - 2.2, w: 6, d: 4, r: 0.6 }, BOARD_Z - 2, 4, 2, 0.3), 'mid');
    dots([[x, BOARD.y - 0.2, BOARD_Z + 2]], 0.45);
  }
}

// The pose rack along the front: a rail with a hole per pose, a groove after the third hole (the fewest poses
// that solve it) and a sunken strip under holes 12 to 15 (where the gains level off). The pegs are live.
{
  solid(slab(RACK, 0, RACK_H, 4, 0.6), 'mid', { inner: sideSeam(RACK, 1.6, P, 4) });
  const [x12] = holeAt(11);
  const [x15] = holeAt(14);
  const strip: Plan = { x: x12 - HOLE.pitch / 2 + 0.4, y: RACK.y + 1.2, w: x15 - x12 + HOLE.pitch - 0.8, d: RACK.d - 2.4, r: 1 };
  put({ kind: 'fill', d: planOutline(strip, RACK_H, P), paint: 1 });
  line(planOutline(strip, RACK_H, P), 'lo');
  const [x3] = holeAt(2);
  const gx = x3 + HOLE.pitch / 2;
  line(lineOnTop([gx, RACK.y], [gx, RACK.y + RACK.d], RACK_H, P), 'mid');
  const holes: string[] = [];
  for (let k = 0; k < MAX_POSES; k++) {
    const [hx, hy] = holeAt(k);
    holes.push(ring(hx, hy, HOLE.r, RACK_H, P, 16));
  }
  line(holes.join(''), 'lo');
  dots([[RACK.x + 2.6, RACK.y + RACK.d / 2, RACK_H], [RACK.x + RACK.w - 2.6, RACK.y + RACK.d / 2, RACK_H]], 0.5);
  put({ kind: 'live', id: 'pegs' });
}

put({ kind: 'live', id: 'arm' });

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------------- live pieces
/** The pegs in the first `count` holes: a short pin each, the newest one in the darker ink. */
export function pegsFor(count: number) {
  return Array.from({ length: Math.max(0, Math.min(count, MAX_POSES)) }, (_, k) => {
    const [hx, hy] = holeAt(k);
    return { paths: cyl(hx, hy, HOLE.r - 0.2, RACK_H, 4.2, 16, 0.3), newest: k === count - 1 };
  });
}

/** The iris's opening radius for a doubt `gap` (world units between the blades and the camera's neck). */
export const openingRadius = (gap: number) => Math.min(CAM.mountR + gap, CAM.irisInner);
/** Fully open: the blades tucked into the housing. */
export const IRIS_OPEN_GAP = CAM.irisInner - CAM.mountR;

export interface ArmDrawing {
  /** Solids and lines in painter's order. */
  pieces: Array<{ kind: 'solid'; paths: SolidPaths; tone: Tone; lit?: boolean; inner?: string } | { kind: 'line'; d: string; tone: LineTone } | { kind: 'fill'; d: string; paint: 'interior' | 'top' | 'blades' } | { kind: 'ball'; d: string; shade: string }>;
}

/** A disc's rim as a closed screen polygon (a circle round `centre` across `axis`). */
const rimOf = (centre: Point3, axis: Point3, r: number, steps = 40) => pathOf(circleAround(centre, axis, r, steps).map(at), true);

/** The whole arm, camera and iris for a pose and an iris gap. */
export function armDrawing(pose: ArmPose, gap: number): ArmDrawing {
  const pieces: ArmDrawing['pieces'] = [];
  const { wrist, elbow, look, yaw } = pose;
  const across: Point3 = [-Math.sin(yaw), Math.cos(yaw), 0];
  // Turret head: a block turned to the arm's yaw, on the drum.
  const [sx, sy] = SHOULDER;
  const head = [[-9, -8], [9, -8], [9, 8], [-9, 8]].map(([u, v]): Point3 => [sx + u * Math.cos(yaw) - v * Math.sin(yaw), sy + u * Math.sin(yaw) + v * Math.cos(yaw), 16]);
  pieces.push({ kind: 'solid', paths: prismAlong(head, [0, 0, SHOULDER[2] - 4 - 16], P, { bevel: 0.6 }), tone: 'mid' });
  // Shoulder and elbow joints: discs across the arm's plane, on the side nearer the viewer.
  const side = dot3(across, V) > 0 ? 1 : -1;
  const joint = (centre: Point3, r: number, half: number) => discAlong(add(centre, scale(across, -half * side)), scale(across, side), r, 2 * half, P, 40, 0.5);
  const upper = barBetween(SHOULDER, elbow, across, 9, 7.4, P, 0.5);
  const fore = barBetween(elbow, wrist, across, 7, 6, P, 0.5);
  pieces.push({ kind: 'solid', paths: joint(SHOULDER, 8.6, 5.2), tone: 'mid' });
  pieces.push({ kind: 'solid', paths: upper, tone: 'mid' });
  pieces.push({ kind: 'solid', paths: joint(elbow, 7, 4.4), tone: 'mid' });
  pieces.push({ kind: 'solid', paths: fore, tone: 'mid' });
  pieces.push({ kind: 'solid', paths: discAlong(add(elbow, scale(across, 4.4 * side)), scale(across, side), 3.2, 1.2, P, 24, 0.3), tone: 'hi' });
  pieces.push({ kind: 'solid', paths: discAlong(add(SHOULDER, scale(across, 5.2 * side)), scale(across, side), 4, 1.2, P, 24, 0.3), tone: 'hi' });
  // The camera hangs off the wrist and looks at the board's centre: lens, body, then the iris round its neck,
  // the mount and the wrist's ball.
  const lensFront = add(TARGET, scale(look, CAM.range));
  // The camera's line of sight, from the lens to the board's centre mark.
  pieces.push({ kind: 'line', d: pathOf([at(lensFront), at(TARGET)]), tone: 'lo' });
  pieces.push({ kind: 'solid', paths: discAlong(lensFront, look, CAM.lensR + 0.8, 1.2, P, 32, 0.3), tone: 'mid' });
  pieces.push({ kind: 'solid', paths: discAlong(add(lensFront, scale(look, 1.2)), look, CAM.lensR, CAM.lens[1] - 1.2, P, 32), tone: 'mid' });
  const bodyFrom = add(TARGET, scale(look, CAM.range + CAM.body[0]));
  pieces.push({ kind: 'solid', paths: discAlong(bodyFrom, look, CAM.bodyR, CAM.body[1] - CAM.body[0], P, 40, 0.5), tone: 'hi' });
  const irisFace = add(TARGET, scale(look, CAM.range + CAM.body[1] + CAM.irisT));
  const housing = discAlong(add(TARGET, scale(look, CAM.range + CAM.body[1])), look, CAM.irisR, CAM.irisT, P, 56, 0.5);
  pieces.push({ kind: 'solid', paths: housing, tone: 'mid' });
  // The iris face: inside the housing, the camera's back face; over it, the dark blades from the housing's inner
  // rim down to the opening, which closes on the camera's neck.
  const r = openingRadius(gap);
  const faceUp = dot3(look, V) > 0;
  const face = add(irisFace, scale(look, faceUp ? 0.02 : -CAM.irisT - 0.02));
  const blades = 7;
  const [u0, v0] = (() => {
    const helper: Point3 = Math.abs(look[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = unit(cross(look, helper));
    return [u, cross(look, u)];
  })();
  const onFace = (radius: number, angle: number): Point3 => add(face, add(scale(u0, radius * Math.cos(angle)), scale(v0, radius * Math.sin(angle))));
  const spin = (CAM.irisInner - r) * 0.18;
  const opening = Array.from({ length: blades }, (_, k) => onFace(r, spin + (k / blades) * Math.PI * 2));
  const openingPath = pathOf(opening.map(at), true);
  pieces.push({ kind: 'fill', d: rimOf(face, look, CAM.irisInner, 56), paint: 'interior' });
  pieces.push({ kind: 'fill', d: rimOf(face, look, CAM.bodyR, 40), paint: 'top' });
  pieces.push({ kind: 'line', d: rimOf(face, look, CAM.bodyR, 40), tone: 'lo' });
  pieces.push({ kind: 'fill', d: rimOf(face, look, CAM.irisInner, 56) + openingPath, paint: 'blades' });
  // Each blade's edge: from an opening corner out to the housing's inner rim, curving with the blades.
  const seams: string[] = [];
  for (let k = 0; k < blades; k++) {
    const a = spin + (k / blades) * Math.PI * 2;
    const points: Flat[] = [];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      points.push(at(onFace(r + (CAM.irisInner - r) * t, a + t * 0.9)));
    }
    seams.push(pathOf(points));
  }
  // Fully open, the blades are tucked into the housing: no edges show.
  const shut = r < CAM.irisInner - 0.05;
  pieces.push({ kind: 'line', d: shut ? seams.join('') : '', tone: 'faint' });
  pieces.push({ kind: 'line', d: shut ? openingPath : '', tone: 'lit' });
  pieces.push({ kind: 'line', d: rimOf(face, look, CAM.irisInner, 56), tone: 'lo' });
  // The mount from the iris to the wrist, and the wrist's ball where the forearm ends.
  pieces.push({ kind: 'solid', paths: discAlong(irisFace, look, CAM.mountR, CAM.mount, P, 28, 0.3), tone: 'mid' });
  const ball = at(wrist);
  const k = P.scale * Math.sqrt(1.6);
  const rr = CAM.ballR * k;
  const circle = (cx: number, cy: number, radius: number) => `M${(cx - radius).toFixed(1)} ${cy.toFixed(1)}a${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(2 * radius).toFixed(1)} 0a${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(-2 * radius).toFixed(1)} 0Z`;
  pieces.push({ kind: 'ball', d: circle(ball[0], ball[1], rr), shade: circle(ball[0] - rr * 0.22, ball[1] - rr * 0.26, rr * 0.66) });
  return { pieces };
}

/** For tests: the camera's line of sight passes through the board's centre at every pose. */
export const GEOMETRY = { TARGET, SHOULDER, LINKS, WRIST_RANGE, CAM };
