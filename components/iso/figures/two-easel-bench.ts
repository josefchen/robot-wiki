/**
 * The two-easel bench for HandMotionShare, drawn with the isometric kit.
 *
 * The object is the explanation. Two easels stand on one bench, each with a
 * squared sheet. At the left a person's arm (a jointed mannequin arm on a
 * stand) holds a pen to its sheet and draws a check mark. At the right a
 * robot arm with shorter links holds its pen to the other sheet. A copy box
 * between them carries the person's movement to the robot, and its lever
 * picks what is sent: the arm's joint angles as they are, or the hand's own
 * motion from the stroke's start, for which the robot finds its own angles.
 * The person's stroke is dark; the faint stroke on the robot's sheet is the
 * same check mark placed at the robot's start; the robot's ink, the one lit
 * part, lands on it only when the hand's motion is sent.
 *
 * Numbers: lib/hand-motion-share.ts. World units are centimetres: x along the
 * bench, y toward the viewer, z up from the bench top. Both arms move in
 * upright planes in front of their sheets, their joints toward the viewer and
 * their links behind them, so each arm is drawn from its pen out to its
 * shoulder in an order that never changes. Static parts are built once; the
 * strokes, the two arms and the lever are rebuilt for each pose.
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
  sideArc,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, circleAround, discAlong, plateIn, roundedOutline, viewOf } from '../prism.ts';
import { HUMAN, ROBOT, START_POSE, STROKE, elbowOf, handOf, humanPoseAt, robotPoseAt, strokeAt, type CopyId, type Point, type Pose } from '../../../lib/hand-motion-share.ts';

export const WIDTH = 640;
export const AZIMUTH = 68;
export const ELEVATION = 22;

// ------------------------------------------------------------------ layout
const RAD = Math.PI / 180;
const BENCH: Plan = { x: -102, y: -30, w: 182, d: 48, r: 6 };
const BENCH_H = 8;
const FOOT_H = 6;
/** The plane both arms move in, and the sheets' face behind them. */
const ARM_Y = -5;
const SHEET_Y = -14.4;
/** The person's shoulder, and the robot's (lower, on its pedestal). */
const HUMAN_SHOULDER: Plane = [-70, 56];
const ROBOT_SHOULDER: Plane = [20, 48];
/** Each easel: the board's extent along x and z, standing in a slotted foot rail. */
const EASELS = {
  human: { x0: -54, x1: -16, z0: 24, z1: 78 },
  robot: { x0: 32, x1: 70, z0: 24, z1: 78 },
} as const;
const BOARD_Y = [-17, -15] as const;
/** The copy box in front, between the two arms. */
const BOX: Plan = { x: -11, y: 3, w: 17, d: 12, r: 2 };
const BOX_H = 10;

/** World points for the two arms: a point in an arm's own plane (from its shoulder, cm) at depth y. */
const humanAt = ([x, z]: Point, y = ARM_Y): Point3 => [HUMAN_SHOULDER[0] + x, y, HUMAN_SHOULDER[1] + z];
const robotAt = ([x, z]: Point, y = ARM_Y): Point3 => [ROBOT_SHOULDER[0] + x, y, ROBOT_SHOULDER[1] + z];

// ------------------------------------------------------------------ camera
function extremes(): Point3[] {
  const points: Point3[] = [];
  for (const [x, y] of [
    [BENCH.x, BENCH.y],
    [BENCH.x + BENCH.w, BENCH.y],
    [BENCH.x, BENCH.y + BENCH.d],
    [BENCH.x + BENCH.w, BENCH.y + BENCH.d],
  ] as Plane[]) {
    points.push([x, y, -BENCH_H - FOOT_H], [x, y, 0]);
  }
  for (const easel of Object.values(EASELS)) points.push([easel.x0, BOARD_Y[0], easel.z1 + 3], [easel.x1, BOARD_Y[0], easel.z1 + 3]);
  points.push([HUMAN_SHOULDER[0] - 22, ARM_Y, HUMAN_SHOULDER[1] + 20], [ROBOT_SHOULDER[0], ARM_Y, ROBOT_SHOULDER[1] + 16]);
  return points;
}
const EXTREMES = extremes();
const FIT_PAD = 6;
const unitP = fitProjection(EXTREMES, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatAll = EXTREMES.map((point) => iso(point, unitP));
const spanOf = (axis: 0 | 1) => Math.max(...flatAll.map((p) => p[axis])) - Math.min(...flatAll.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * spanOf(1)) / spanOf(0) + 2 * FIT_PAD);
export const P: Projection = fitProjection(EXTREMES, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const box = (x0: number, y0: number, x1: number, y1: number, r = 0.8): Plan => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const Y: Point3 = [0, 1, 0];
const facing = (normal: Point3) => normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2];

// ------------------------------------------------------------------ parts
export type Slot = 'strokes' | 'human' | 'robot' | 'lever';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string; weight?: number }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; slot: Slot };
export type LivePart = Exclude<Part, { kind: 'slot' }>;

const seamPath = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');

/** The front half of a ring round a round part on any axis: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 40): string {
  const points = circleAround(centre, axis, radius, steps);
  const front = (p: Point3) => facing([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]]) > 0;
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  for (const point of points) {
    if (front(point)) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) {
    if (runs.length && front(points[0]!)) runs[0] = [...run, ...runs[0]!];
    else runs.push(run);
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}

const PARTS: Part[] = [];
const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', name?: string, weight?: number) => {
  if (d) list.push({ kind: 'line', d, tone, free, name, weight });
};
const dots = (list: Part[], points: Flat[], size = 0.45, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone });
function screw(list: Part[], x: number, y: number, z: number, r = 1.5) {
  line(list, ring(x, y, r, z, P, 14), 'lo');
  line(list, lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
/** A path on the sheets' face (the plane y = SHEET_Y + 0.1) through world (x, z) points. */
const onSheet = (points: Array<[number, number]>, closed = false) => pathOf(points.map(([x, z]) => at([x, SHEET_Y + 0.1, z])), closed);

// The bench: a long top on four turned feet, with its edge seam, a groove, corner screws and the maker's plate.
{
  const list = PARTS;
  for (const [x, y] of byDepth(corners(BENCH, 14))) {
    solid(list, cyl(x, y, 6.4, -BENCH_H - FOOT_H, 1.6, 28, 0.3), 'lo');
    solid(list, cyl(x, y, 4.6, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, 24), 'mid', { inner: seamPath(sideArc(x, y, 4.6, -BENCH_H - 3.4, P, 18)) });
  }
  solid(list, slab(BENCH, -BENCH_H, BENCH_H, 8, 1.2), 'lo', { inner: seamPath(sideSeam(BENCH, -BENCH_H + 2.8, P, 8)) });
  line(list, planOutline(insetPlan(BENCH, 4), 0, P, 8), 'faint');
  for (const [x, y] of corners(BENCH, 8)) screw(list, x, y, 0, 1.7);
  const label = box(BENCH.x + BENCH.w - 46, BENCH.y + BENCH.d - 9, BENCH.x + BENCH.w - 14, BENCH.y + BENCH.d - 3, 1.2);
  solid(list, slab(label, 0, 0.8, 3), 'lo');
  line(list, planOutline(insetPlan(label, 1.2), 0.8, P, 3), 'faint');
  for (const [k, share] of [[0, 0.8], [1, 0.56], [2, 0.34]] as const) {
    const y = label.y + 1.6 + k * 1.4;
    line(list, lineOnTop([label.x + 4.4, y], [label.x + 4.4 + (label.w - 9) * share, y], 0.8, P), 'lo', true);
  }
  dots(list, [at([label.x + 2, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2, label.y + label.d / 2, 0.8])], 0.42, 'mid');
}

// The two easels: a slotted foot rail, the board standing in it, a squared sheet with corner clips.
for (const easel of Object.values(EASELS)) {
  const list = PARTS;
  const rail = box(easel.x0 - 2, BOARD_Y[0] - 4, easel.x1 + 2, BOARD_Y[1] + 4, 1.2);
  solid(list, slab(rail, 0, 6, 3, 0.5), 'mid', { inner: seamPath(sideSeam(rail, 2, P, 3)) });
  for (const x of [easel.x0 + 3, easel.x1 - 3]) dots(list, [at([x, BOARD_Y[1] + 2.6, 6])], 0.5, 'mid');
  const board = plateIn([easel.x0, BOARD_Y[1], 6], [1, 0, 0], [0, 0, 1], roundedOutline(0, 0, easel.x1 - easel.x0, easel.z1 - 6, 1.2, 3), BOARD_Y[1] - BOARD_Y[0], P, 0.4);
  solid(list, board, 'mid');
  // The sheet, a thin plate on the board's face, squared every 4 cm.
  const sx0 = easel.x0 + 3;
  const sx1 = easel.x1 - 3;
  const sz0 = easel.z0;
  const sz1 = easel.z1 - 3;
  solid(list, plateIn([sx0, SHEET_Y, sz0], [1, 0, 0], [0, 0, 1], roundedOutline(0, 0, sx1 - sx0, sz1 - sz0, 0.4, 2), SHEET_Y - BOARD_Y[1], P), 'hi', { crease: 'none' });
  const grid: string[] = [];
  for (let x = Math.ceil(sx0 / 4) * 4; x <= sx1; x += 4) grid.push(onSheet([[x, sz0], [x, sz1]]));
  for (let z = Math.ceil(sz0 / 4) * 4; z <= sz1; z += 4) grid.push(onSheet([[sx0, z], [sx1, z]]));
  line(list, grid.join(''), 'faint');
  for (const x of [sx0 + 4, sx1 - 4]) {
    solid(list, plateIn([x - 3, SHEET_Y + 0.4, sz1 - 3], [1, 0, 0], [0, 0, 1], roundedOutline(0, 0, 6, 5, 1, 2), -1.6, P, 0.2), 'mid');
    dots(list, [at([x, SHEET_Y + 1.6, sz1 - 0.6])], 0.45, 'mid');
  }
}

PARTS.push({ kind: 'slot', slot: 'strokes' });

// The person: a jointed mannequin bust on a stand, its back to the viewer as it faces its easel: a weighted base, a
// post, the torso with its waist seam, the neck and the head. The drawing arm hangs from the torso's right shoulder.
const TORSO = { x0: HUMAN_SHOULDER[0] - 22, x1: HUMAN_SHOULDER[0] + 2, z0: HUMAN_SHOULDER[1] - 24, z1: HUMAN_SHOULDER[1] + 4, y0: ARM_Y - 9, y1: ARM_Y + 2 } as const;
{
  const list = PARTS;
  const x = (TORSO.x0 + TORSO.x1) / 2;
  const y = (TORSO.y0 + TORSO.y1) / 2;
  solid(list, cyl(x, y, 11, 0, 2.4, 40, 0.4), 'lo', { inner: seamPath(sideArc(x, y, 11, 1, P, 32)) });
  dots(list, [0, 120, 240].map((a) => at([x + 8 * Math.cos((a + 30) * RAD), y + 8 * Math.sin((a + 30) * RAD), 2.4])), 0.5, 'mid');
  solid(list, cyl(x, y, 4.6, 2.4, 2.6, 28, 0.3), 'mid');
  solid(list, cyl(x, y, 2.4, 5, TORSO.z0 - 5 - 2, 20), 'mid', { inner: seamPath(sideArc(x, y, 2.4, 14, P, 16)) });
  solid(list, cyl(x, y, 3.4, TORSO.z0 - 2, 2, 24, 0.3), 'mid');
  // The torso: wider at the shoulders than at the waist, its waist seam across it.
  const w = TORSO.x1 - TORSO.x0;
  const h = TORSO.z1 - TORSO.z0;
  const outline: Array<[number, number]> = [
    [w * 0.22, 0], [w * 0.78, 0], [w * 0.9, h * 0.45], [w, h * 0.78], [w * 0.94, h], [w * 0.06, h], [0, h * 0.78], [w * 0.1, h * 0.45],
  ];
  solid(list, plateIn([TORSO.x0, TORSO.y1, TORSO.z0], [1, 0, 0], [0, 0, 1], outline, TORSO.y1 - TORSO.y0, P, 0.5), 'hi', {
    // The seam runs edge to edge: at 0.4 of the height the outline's sides stand 0.22 - 0.12 x 0.4 / 0.45 of the width in.
    inner: seamPath(pathOf([at([TORSO.x0 + w * (0.22 - (0.12 * 0.4) / 0.45), TORSO.y1, TORSO.z0 + h * 0.4]), at([TORSO.x0 + w * (0.78 + (0.12 * 0.4) / 0.45), TORSO.y1, TORSO.z0 + h * 0.4])])),
    name: 'torso',
  });
  // The neck and the head.
  solid(list, discAlong([x, y - 2.6, TORSO.z1], [0, 0, 1], 2.6, 3, P, 20), 'mid');
  solid(list, discAlong([x, TORSO.y0 + 1, TORSO.z1 + 10], Y, 6.4, TORSO.y1 - TORSO.y0 - 2, P, 40, 0.5), 'hi', { name: 'head' });
}

// The robot's pedestal: a block with a seam and screws, its bolted flange and the column up to the shoulder.
{
  const list = PARTS;
  const [x] = ROBOT_SHOULDER;
  const pedestal = box(x - 10, ARM_Y - 10, x + 10, ARM_Y + 10, 1.4);
  solid(list, slab(pedestal, 0, 12, 3, 0.6), 'mid', { inner: seamPath(sideSeam(pedestal, 9, P, 3)) });
  for (const [px, py] of corners(pedestal, 2.4)) dots(list, [at([px, py, 12])], 0.45, 'mid');
  solid(list, cyl(x, ARM_Y, 7.4, 12, 2, 36, 0.3), 'lo');
  dots(list, Array.from({ length: 6 }, (_, k) => at([x + 6 * Math.cos((k * 60 + 30) * RAD), ARM_Y + 6 * Math.sin((k * 60 + 30) * RAD), 14])), 0.42, 'mid');
  solid(list, cyl(x, ARM_Y, 4.6, 14, ROBOT_SHOULDER[1] - 14 - 6, 28), 'mid', { inner: seamPath(sideArc(x, ARM_Y, 4.6, 24, P, 20)) });
}

PARTS.push({ kind: 'slot', slot: 'human' });
PARTS.push({ kind: 'slot', slot: 'robot' });

// The copy box in front: a case with a lid seam, vents, the lever's gate on top, and its two leads, one to the person's
// stand and one to the robot's pedestal.
{
  const list = PARTS;
  for (const [x, y] of byDepth(corners(BOX, 3))) solid(list, cyl(x, y, 1.7, 0, 1.2, 14), 'lo');
  solid(list, slab(BOX, 1.2, BOX_H, 3, 0.6), 'mid', { inner: seamPath(sideSeam(BOX, BOX_H - 1.6, P, 3)) });
  const top = 1.2 + BOX_H;
  for (const [x, y] of corners(BOX, 2)) dots(list, [at([x, y, top])], 0.42, 'mid');
  line(list, planOutline({ x: BOX.x + 4, y: BOX.y + 5.6, w: BOX.w - 8, d: 2.8, r: 1.4 }, top, P, 4), 'mid');
  const vents: string[] = [];
  for (let k = 0; k < 3; k++) vents.push(planOutline({ x: BOX.x + 5 + k * 4.4, y: BOX.y + 10, w: 2, d: 2.6, r: 1 }, top, P, 3));
  line(list, vents.join(''), 'lo');
  const humanBase: Point3 = [(TORSO.x0 + TORSO.x1) / 2 + 11 * Math.cos(25 * RAD), (TORSO.y0 + TORSO.y1) / 2 + 11 * Math.sin(25 * RAD), 1.2];
  PARTS.push({
    kind: 'wire',
    from: at([BOX.x, BOX.y + 7, 4]),
    to: at(humanBase),
    via: [at([BOX.x - 4, BOX.y + 7, 4]), at([BOX.x - 4, BOX.y + 7, 0.4]), at([humanBase[0] + 4, BOX.y + 7, 0.4])],
    tone: 'lo',
  });
  PARTS.push({
    kind: 'wire',
    from: at([BOX.x + BOX.w, BOX.y + 7, 4]),
    to: at([ROBOT_SHOULDER[0] - 4, ARM_Y + 10, 6]),
    via: [at([BOX.x + BOX.w + 4, BOX.y + 7, 4]), at([BOX.x + BOX.w + 4, BOX.y + 7, 0.4]), at([ROBOT_SHOULDER[0] - 4, BOX.y + 7, 0.4]), at([ROBOT_SHOULDER[0] - 4, ARM_Y + 13, 0.4])],
    tone: 'lo',
  });
}

PARTS.push({ kind: 'slot', slot: 'lever' });

export { PARTS };

// ------------------------------------------------------------------ the moving parts
/** The check mark as the person's hand moves, in world (x, z) on the person's sheet, up to a share of the way. */
const START_H = handOf(HUMAN, START_POSE);
const START_R = handOf(ROBOT, START_POSE);

/** The strokes: the person's (dark), the faint check mark placed at the robot's start, and the robot's ink (lit). */
export function strokeParts(human: Point[], robot: Point[]): LivePart[] {
  const list: Part[] = [];
  const toHuman = ([x, z]: Point): [number, number] => [HUMAN_SHOULDER[0] + x, HUMAN_SHOULDER[1] + z];
  const toRobot = ([x, z]: Point): [number, number] => [ROBOT_SHOULDER[0] + x, ROBOT_SHOULDER[1] + z];
  // A small printed ring with a dot marks where each hand starts, and one where the person's check mark ends at the robot's start.
  const ringOn = ([x, z]: [number, number], name: string) => {
    line(list, onSheet(circleAround([x, 0, z], Y, 1.6, 20).map((p) => [p[0], p[2]] as [number, number]), true), 'lo', undefined, name);
    dots(list, [at([x, SHEET_Y + 0.1, z])], 0.7, 'mid');
  };
  ringOn(toHuman(START_H), 'start');
  if (human.length > 1) line(list, onSheet(human.map(toHuman)), 'mid', undefined, 'demo', 2.4);
  const template = STROKE.map(([dx, dz]) => toRobot([START_R[0] + dx, START_R[1] + dz]));
  line(list, onSheet(template), 'lo', undefined, 'template', 1.6);
  ringOn(template[0]!, 'start');
  ringOn(template[template.length - 1]!, 'end');
  if (robot.length > 1) line(list, onSheet(robot.map(toRobot)), 'lit', undefined, 'ink', 2.6);
  return list as LivePart[];
}

/** A pen: from the hand at `hand` (world) back to the sheet, its tip on the paper. */
function penParts(list: Part[], hand: Point3, lift: number) {
  const tipY = SHEET_Y + 0.2 + lift;
  solid(list, discAlong([hand[0], tipY, hand[2]], Y, 0.6, 1.6, P, 12), 'hi', { name: 'pen-tip' });
  solid(list, discAlong([hand[0], tipY + 1.6, hand[2]], Y, 1.1, hand[1] - tipY - 1.6, P, 16), 'hi', { name: 'pen' });
}

/** The person's arm for a pose: the pen, the hand (a mitten round it), forearm, upper arm, then the wrist, elbow and shoulder joints. */
export function humanParts(pose: Pose, lift = 0): LivePart[] {
  const list: Part[] = [];
  const elbow = humanAt(elbowOf(HUMAN, pose));
  const hand = humanAt(handOf(HUMAN, pose));
  const shoulder = humanAt([0, 0]);
  const fore = (pose.shoulder - pose.elbow) * RAD;
  penParts(list, [hand[0], ARM_Y - 2.6, hand[2]], lift);
  // The forearm and the upper arm: smooth round limbs from joint to joint.
  const limb = (a: Point3, b: Point3, r: number, name: string) => {
    const d: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const n = Math.hypot(...d);
    solid(list, discAlong([a[0] + (d[0] / n) * 2, a[1], a[2] + (d[2] / n) * 2], d, r, n - 4, P, 28), 'hi', { name });
  };
  limb(elbow, hand, 2.7, 'forearm');
  limb(shoulder, elbow, 3.3, 'upper-arm');
  // The hand: a mitten in the forearm's line, round the pen, with the thumb's seam.
  const u: Point3 = [Math.cos(fore), 0, Math.sin(fore)];
  const w: Point3 = [-Math.sin(fore), 0, Math.cos(fore)];
  solid(list, plateIn([hand[0] - u[0] * 3, ARM_Y + 2.4, hand[2] - u[2] * 3], u, w, roundedOutline(-2, -3, 6, 3, 2.4, 4), -5.2, P, 0.3), 'hi', { name: 'hand' });
  // The joints: round discs facing the viewer, the wrist the smallest.
  solid(list, discAlong([hand[0] - u[0] * 2.4, ARM_Y - 2.6, hand[2] - u[2] * 2.4], Y, 2.6, 5.2, P, 24, 0.3), 'mid', { name: 'wrist' });
  solid(list, discAlong([elbow[0], ARM_Y - 3.2, elbow[2]], Y, 3.6, 6.4, P, 28, 0.3), 'mid', { inner: seamPath(seamAround([elbow[0], ARM_Y, elbow[2]], Y, 3.6)), name: 'elbow' });
  solid(list, discAlong([shoulder[0], ARM_Y - 3.8, shoulder[2]], Y, 4.4, 7.6, P, 32, 0.3), 'mid', { inner: seamPath(seamAround([shoulder[0], ARM_Y, shoulder[2]], Y, 4.4)), name: 'shoulder' });
  return list as LivePart[];
}

/** The robot arm for a pose: the pen and its holder, the forearm and upper links behind their housings, the elbow and shoulder housings. */
export function robotParts(pose: Pose, lift = 0): LivePart[] {
  const list: Part[] = [];
  const elbow = robotAt(elbowOf(ROBOT, pose));
  const hand = robotAt(handOf(ROBOT, pose));
  const shoulder = robotAt([0, 0]);
  penParts(list, [hand[0], ARM_Y - 2.4, hand[2]], lift);
  // The pen holder at the forearm's tip, a short collar along the pen.
  solid(list, discAlong([hand[0], ARM_Y - 2.4, hand[2]], Y, 2.2, 3.6, P, 24, 0.3), 'mid', { name: 'holder' });
  dots(list, [at([hand[0], ARM_Y + 1.2, hand[2]])], 0.5, 'mid');
  // The links: flat bars between the joints, behind the housings.
  const bar = (a: Point3, b: Point3, width: number, name: string) => {
    const along: Point3 = [b[0] - a[0], 0, b[2] - a[2]];
    const n = Math.hypot(along[0], along[2]);
    solid(list, barBetween([a[0], ARM_Y - 1.6, a[2]], [b[0], ARM_Y - 1.6, b[2]], [-along[2] / n, 0, along[0] / n], width, 2.6, P, 0.3), 'hi', { name });
  };
  bar(elbow, hand, 3.6, 'robot-forearm');
  bar(shoulder, elbow, 4.4, 'robot-upper-arm');
  solid(list, discAlong([elbow[0], ARM_Y - 0.4, elbow[2]], Y, 4, 3.6, P, 32, 0.4), 'mid', { inner: seamPath(seamAround([elbow[0], ARM_Y + 1.4, elbow[2]], Y, 4)), name: 'robot-elbow' });
  dots(list, [at([elbow[0], ARM_Y + 3.2, elbow[2]])], 0.55, 'hi');
  solid(list, discAlong([shoulder[0], ARM_Y - 0.4, shoulder[2]], Y, 5.6, 4.4, P, 36, 0.4), 'mid', { inner: seamPath(seamAround([shoulder[0], ARM_Y + 1.8, shoulder[2]], Y, 5.6)), name: 'robot-shoulder' });
  dots(list, [0, 90, 180, 270].map((a) => at([shoulder[0] + 3.8 * Math.cos((a + 45) * RAD), ARM_Y + 4, shoulder[2] + 3.8 * Math.sin((a + 45) * RAD)])), 0.42, 'mid');
  return list as LivePart[];
}

/** The copy box's lever, standing in its gate: left for the joint angles, right for the hand's motion. */
export function leverParts(copy: CopyId, share = copy === 'hand' ? 1 : 0): LivePart[] {
  const list: Part[] = [];
  const top = 1.2 + BOX_H;
  const x = BOX.x + 5.4 + (BOX.w - 10.8) * share;
  const y = BOX.y + 7;
  solid(list, cyl(x, y, 1.6, top - 0.4, 1.2, 16, 0.2), 'lo');
  solid(list, cyl(x, y, 0.7, top + 0.8, 6, 12), 'mid');
  solid(list, cyl(x, y, 1.9, top + 6.8, 2.6, 20, 0.3), 'hi');
  return list as LivePart[];
}

/** Everything the drawing shows at one moment: both arms, the strokes so far, the lever and the pens' lift. */
export type BenchPose = { human: Pose; robot: Pose; humanStroke: Point[]; robotStroke: Point[]; copy: CopyId; lever: number; lift: number };

/** The bench a share 0..1 of the way through the stroke, copying as `copy`, with the pens `lift` off the sheets. */
export function benchPose(copy: CopyId, share: number, lift = 0, lever = copy === 'hand' ? 1 : 0): BenchPose {
  const steps = Math.max(1, Math.round(share * 60));
  const humanStroke: Point[] = [];
  const robotStroke: Point[] = [];
  for (let k = 0; k <= steps; k++) {
    const s = (k / steps) * share;
    const [dx, dz] = strokeAt(s);
    humanStroke.push([START_H[0] + dx, START_H[1] + dz]);
    robotStroke.push(handOf(ROBOT, robotPoseAt(copy, s)));
  }
  return { human: humanPoseAt(share), robot: robotPoseAt(copy, share), humanStroke: share > 0 ? humanStroke : [], robotStroke: share > 0 ? robotStroke : [], copy, lever, lift };
}

/** Every moving part for a pose, by slot (a short form `{ copy, share }` is filled in by benchPose). */
export function movingAt(input: BenchPose | { copy: CopyId; share: number; lift?: number }): Record<Slot, LivePart[]> {
  const pose = 'human' in input ? input : benchPose(input.copy, input.share, input.lift ?? 0);
  return {
    strokes: strokeParts(pose.humanStroke, pose.robotStroke),
    human: humanParts(pose.human, pose.lift),
    robot: robotParts(pose.robot, pose.lift),
    lever: leverParts(pose.copy, pose.lever),
  };
}

export const STILL_POSE = benchPose('joints', 1);

export { START_H, START_R };
