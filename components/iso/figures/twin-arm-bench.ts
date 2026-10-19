/**
 * The twin-arm bench for KinematicTwin, drawn with the isometric kit.
 *
 * The object is the explanation. A small 3D-printed leader arm is clamped at
 * the front of a bench, and the robot arm it drives stands on a pedestal
 * behind it. Both have the same joints in the same order, a shoulder, an
 * elbow and a wrist that keeps the hand pointing down, and every link of the
 * leader is the same share of the robot's. Each shoulder and each elbow
 * faces the reader with a dial, zeroed the same way on both arms: the
 * shoulder's dial is fixed to the base and reads up from level, the elbow's
 * rides on the upper arm and reads the bend down from straight, and a needle
 * on the joint's shaft points along the link the joint drives. A cable runs
 * from the leader's base to the controller at the back of the bench, and a
 * second one from the controller to the robot's pedestal. Move the leader's
 * handle, the one lit part, and the robot takes the same angles, joint for
 * joint: both pairs of dials always read the same.
 *
 * World units: about 1 px of the drawing. x runs along the bench to the
 * right, y toward the viewer, z up from the bench top. Each arm moves in
 * upright planes; its joint housings face the viewer and every link runs
 * behind the housing that drives it, as on a real arm with its links offset
 * along the joint axes. So each arm is drawn from its farthest link to its
 * nearest housing, and that order never changes as it moves. The robot
 * stands behind the leader and is drawn first.
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
import { barBetween, circleAround, discAlong, plateIn, roundedOutline, viewOf } from '../prism.ts';
import {
  ELBOW_RANGE,
  LEADER_LINKS,
  ROBOT_LINKS,
  SHOULDER_RANGE,
  armPoints,
  forearmHeading,
  type Pose,
} from '../../../lib/kinematic-twin.ts';

export const WIDTH = 640;
export const AZIMUTH = 70;
export const ELEVATION = 20;

/** World units per robot upper-arm length: the model's lengths, both arms' links among them, times UNIT. */
export const UNIT = 96;

/** The bench top is z = 0. */
const BENCH: Plan = { x: -58, y: -66, w: 372, d: 130, r: 6 };
const BENCH_H = 12;
const FOOT_H = 7;

/** The robot: on a pedestal at the back right, its shoulder's axis at ROBOT_SHOULDER_Z. */
const ROBOT = { x: 136, y: 0 };
const PEDESTAL: Plan = { x: ROBOT.x - 20, y: ROBOT.y - 20, w: 40, d: 40, r: 2.5 };
const PEDESTAL_H = 30;
const ROBOT_SHOULDER_Z = 96;
/**
 * The robot's parts, by depth from its base's centre plane: each joint's
 * housing faces the viewer with its dial, and the link it drives runs
 * behind it, so every link steps away from the viewer.
 */
const RY = { shoulder: [-10, 14], upper: -17, elbow: [-25, -2], fore: -31, wrist: [-39, -23] } as const;
/**
 * The leader: clamped on an operator's riser at the front left, its
 * shoulder's axis at LEADER_SHOULDER_Z, near the robot's, so the two pairs
 * of dials sit side by side.
 */
const LEADER = { x: -26, y: 44 };
const RISER: Plan = { x: LEADER.x - 17, y: LEADER.y - 15, w: 34, d: 30, r: 2 };
const RISER_H = 34;
const LEADER_FOOT = RISER_H + 2.4 + 12;
const LEADER_SHOULDER_Z = 92;
/** The leader's parts, by depth from its column's centre plane, stepping back the same way. */
const LY = { shoulder: [-6, 6], upper: [-10, -7], elbow: [-7, 3], fore: [-14, -11] } as const;
/** The controller at the back, between the two. */
const CONTROLLER: Plan = { x: 40, y: -62, w: 44, d: 26, r: 2.5 };
const CONTROLLER_H = 20;
/** The robot's work mat, under its hand. */
const MAT: Plan = { x: 196, y: -56, w: 104, d: 50, r: 3 };
const MAT_H = 1.2;

/** How far the robot's fingertips and the foot of the leader's handle hang below each wrist's axis. */
const ROBOT_HAND_DROP = 33;
const LEADER_HANDLE_DROP = 21;
/** Dial sizes: the radius of each joint's face, the robot's and the leader's. */
const ROBOT_DIAL = { shoulder: 16, elbow: 13.5 };
const LEADER_DIAL = { shoulder: 9.4, elbow: 8.4 };

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; weight?: number; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; slot: 'robot' | 'leader' };
export type ArmPart = Exclude<Part, { kind: 'slot' }>;

const RAD = Math.PI / 180;

// ---------------------------------------------------------------- the camera
/** The bench, and every place either arm can reach between its joint stops. */
function reachExtremes(): Point3[] {
  const points: Point3[] = [];
  for (const [x, y] of [
    [BENCH.x, BENCH.y],
    [BENCH.x + BENCH.w, BENCH.y],
    [BENCH.x, BENCH.y + BENCH.d],
    [BENCH.x + BENCH.w, BENCH.y + BENCH.d],
  ] as const) {
    points.push([x, y, -BENCH_H - FOOT_H], [x, y, 0]);
  }
  for (let s = 0; s <= 8; s++) {
    for (let e = 0; e <= 8; e++) {
      const pose = {
        shoulder: SHOULDER_RANGE[0] + ((SHOULDER_RANGE[1] - SHOULDER_RANGE[0]) * s) / 8,
        elbow: ELBOW_RANGE[0] + ((ELBOW_RANGE[1] - ELBOW_RANGE[0]) * e) / 8,
      };
      const { elbow, wrist } = armPoints(ROBOT_LINKS, pose);
      for (const y of [ROBOT.y + RY.elbow[0], ROBOT.y + RY.elbow[1]]) {
        points.push([ROBOT.x + elbow[0] * UNIT, y, ROBOT_SHOULDER_Z + elbow[1] * UNIT + ROBOT_DIAL.elbow]);
      }
      points.push([ROBOT.x + wrist[0] * UNIT + 10, ROBOT.y + RY.wrist[0], ROBOT_SHOULDER_Z + wrist[1] * UNIT + 9]);
    }
  }
  return points;
}
const extremes = reachExtremes();
const FIT_PAD = 6;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const box = (cx: number, cy: number, w: number, d: number, r = 1): Plan => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });
const Y: Point3 = [0, 1, 0];
const seam = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];

/** The front half of a ring round a round part on any axis: a seam that ends on its silhouette. */
function seamAround(centre: Point3, axis: Point3, radius: number, steps = 40): string {
  const points = circleAround(centre, axis, radius, steps);
  const facing = (p: Point3) => (p[0] - centre[0]) * V[0] + (p[1] - centre[1]) * V[1] + (p[2] - centre[2]) * V[2] > 0;
  const runs: Flat[][] = [];
  let run: Flat[] = [];
  for (const point of points) {
    if (facing(point)) run.push(at(point));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) {
    if (runs.length && facing(points[0]!)) runs[0] = [...run, ...runs[0]!];
    else runs.push(run);
  }
  return runs.filter((r) => r.length > 1).map((r) => pathOf(r)).join('');
}

/** A point on an upright face at depth y, `r` from (x0, z0) at `deg` above level (counterclockwise as the viewer sees it). */
const polarIn = (x0: number, z0: number, y: number, r: number, deg: number): Point3 => [x0 + r * Math.cos(deg * RAD), y, z0 + r * Math.sin(deg * RAD)];

/**
 * A dial on an upright face at depth y round (x0, z0): ticks hanging inward
 * from its rim `r` every 10 degrees, from `zero` through `span` degrees in
 * the direction `sense` (+1 up, counterclockwise as the viewer sees it; -1
 * down), long every 30, the zero longest.
 */
export function dialTicks(x0: number, z0: number, y: number, r: number, zero: number, span: number, sense: 1 | -1) {
  const minor: string[] = [];
  const major: string[] = [];
  let zeroMark = '';
  for (let deg = 0; deg <= span + 1e-9; deg += 10) {
    // Every tick is short enough to read as a mark hung from the rim (under 7 viewBox units even on the robot's shoulder).
    const length = deg === 0 ? r * 0.28 : deg % 30 === 0 ? r * 0.2 : r * 0.12;
    const angle = zero + sense * deg;
    const d = pathOf([at(polarIn(x0, z0, y, r, angle)), at(polarIn(x0, z0, y, r - length, angle))]);
    if (deg === 0) zeroMark = d;
    else if (deg % 30 === 0) major.push(d);
    else minor.push(d);
  }
  return { minor: minor.join(''), major: major.join(''), zero: zeroMark };
}

/** A dial's needle: from its hub along `deg` to just inside the ticks' inner ends; its tip stops on the face. */
const needle = (x0: number, z0: number, y: number, r: number, deg: number) => pathOf([at(polarIn(x0, z0, y, r * 0.18, deg)), at(polarIn(x0, z0, y, r * 0.84, deg))]);

/** The parts of one dial, in order: minor, major and zero ticks, the needle, its hub cap and the hub screw. */
function dialParts(x0: number, z0: number, y: number, r: number, zero: number, span: number, sense: 1 | -1, reading: number, name: string): ArmPart[] {
  const ticks = dialTicks(x0, z0, y, r, zero, span, sense);
  return [
    { kind: 'line', d: ticks.minor, tone: 'lo' },
    { kind: 'line', d: ticks.major, tone: 'mid' },
    { kind: 'line', d: ticks.zero, tone: 'hi' },
    { kind: 'line', d: needle(x0, z0, y, r, reading), tone: 'hi', free: 'end', weight: 1.2, name },
    { kind: 'solid', paths: discAlong([x0, y, z0], Y, r * 0.2, 0.8, P, 24, 0.2), tone: 'mid' },
    { kind: 'dots', points: [at([x0, y + 0.8, z0])], size: 0.5, tone: 'hi' },
  ];
}

// ---------------------------------------------------------------- static parts
const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) PARTS.push({ kind: 'line', d, tone, free });
};
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });
const screwsOn = (plan: Plan, z: number, inset = 3, size = 0.5) => dots(corners(plan, inset).map(([x, y]) => at([x, y, z])), size, 'mid');
/** A connector socket on an upright face at depth y (the face's normal is +y): a small rounded boss. */
const socket = (x: number, y: number, z: number) => plateIn([x, y, z], [1, 0, 0], [0, 0, 1], roundedOutline(-3.2, -2.1, 3.2, 2.1, 0.8, 2), -1.8, P, 0.2);

// The bench: a thick top on four turned feet, with its edge seam, a groove and corner screws.
for (const [x, y] of byDepth(corners(BENCH, 18))) {
  solid(cyl(x, y, 8, -BENCH_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BENCH, -BENCH_H, BENCH_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BENCH, -BENCH_H + 4, P, 8)) });
line(planOutline(insetPlan(BENCH, 5), 0, P, 8), 'faint');
// The top is an extruded-aluminium table: its T-slots run the bench's length as closed slots.
{
  const slots: string[] = [];
  for (let y = BENCH.y + 17; y < BENCH.y + BENCH.d - 12; y += 17) slots.push(planOutline({ x: BENCH.x + 12, y: y - 1.2, w: BENCH.w - 24, d: 2.4, r: 1.2 }, 0, P, 3));
  line(slots.join(''), 'faint');
}
screwsOn(BENCH, 0, 8, 0.55);

// The robot's work mat under its hand, with its grid.
solid(slab(MAT, 0, MAT_H, 3), 'lo');
{
  const grid: string[] = [];
  for (let x = MAT.x + 14; x < MAT.x + MAT.w - 2; x += 14) grid.push(lineOnTop([x, MAT.y + 0.4], [x, MAT.y + MAT.d - 0.4], MAT_H, P));
  for (let y = MAT.y + 12.5; y < MAT.y + MAT.d - 2; y += 12.5) grid.push(lineOnTop([MAT.x + 0.4, y], [MAT.x + MAT.w - 0.4, y], MAT_H, P));
  line(grid.join(''), 'faint');
}

// The controller at the back: a small case on four rubber feet, with a lid seam, vents as closed slots, a lamp and two sockets.
const CONTROLLER_FRONT = CONTROLLER.y + CONTROLLER.d;
const SOCKET_Z = 7;
const CONTROLLER_SOCKETS = { leader: CONTROLLER.x + 12, robot: CONTROLLER.x + CONTROLLER.w - 12 };
for (const [x, y] of byDepth(corners(CONTROLLER, 5))) solid(cyl(x, y, 2.6, 0, 1.6, 16), 'lo');
solid(slab(CONTROLLER, 1.6, CONTROLLER_H, 3, 0.8), 'mid', { inner: seam(sideSeam(CONTROLLER, CONTROLLER_H - 3, P, 3)) });
{
  const top = 1.6 + CONTROLLER_H;
  const vents: string[] = [];
  for (let k = 0; k < 5; k++) vents.push(planOutline({ x: CONTROLLER.x + 7 + k * 5.4, y: CONTROLLER.y + 6, w: 2.4, d: 14, r: 1.2 }, top, P, 3));
  line(vents.join(''), 'lo');
  screwsOn(CONTROLLER, top, 3, 0.45);
  solid(cyl(CONTROLLER.x + CONTROLLER.w - 8, CONTROLLER.y + 9, 2.2, top, 0.8, 20, 0.2), 'lo');
  dots([at([CONTROLLER.x + CONTROLLER.w - 8, CONTROLLER.y + 9, top + 0.8])], 1, 'hi');
  solid(socket(CONTROLLER_SOCKETS.leader, CONTROLLER_FRONT, SOCKET_Z), 'lo');
  solid(socket(CONTROLLER_SOCKETS.robot, CONTROLLER_FRONT, SOCKET_Z), 'lo');
}

// The leader's lead: from the back of its base block down the back of the riser and along the bench top to the
// controller. It is drawn before the riser and the base, which cover its start; its far end plugs into the
// controller's left socket.
const CLAMP: Plan = box(LEADER.x, LEADER.y, 30, 26, 2);
const LEADER_BASE: Plan = box(LEADER.x, LEADER.y, 20, 20, 2);
{
  const lane = CONTROLLER_FRONT + 12;
  PARTS.push({
    kind: 'wire',
    from: at([LEADER.x + 2, LEADER_BASE.y + 4, RISER_H + 8]),
    to: at([CONTROLLER_SOCKETS.leader, CONTROLLER_FRONT + 1.8, SOCKET_Z]),
    via: [at([LEADER.x + 2, RISER.y + 2, RISER_H + 8]), at([LEADER.x + 2, RISER.y + 2, 0.4]), at([LEADER.x + 2, lane, 0.4]), at([CONTROLLER_SOCKETS.leader, lane, 0.4]), at([CONTROLLER_SOCKETS.leader, CONTROLLER_FRONT + 5, 0.4])],
    tone: 'lo',
  });
}

// The robot's pedestal: a block with a lid seam, corner screws and a socket on its front face, and the lead to it.
solid(slab(PEDESTAL, 0, PEDESTAL_H, 3, 0.8), 'mid', { inner: seam(sideSeam(PEDESTAL, PEDESTAL_H - 4, P, 3)) });
screwsOn(PEDESTAL, PEDESTAL_H, 3, 0.5);
const PEDESTAL_FRONT = PEDESTAL.y + PEDESTAL.d;
const PEDESTAL_SOCKET = PEDESTAL.x + 9;
solid(socket(PEDESTAL_SOCKET, PEDESTAL_FRONT, SOCKET_Z), 'lo');
{
  const lane = PEDESTAL_FRONT + 10;
  PARTS.push({
    kind: 'wire',
    from: at([CONTROLLER_SOCKETS.robot, CONTROLLER_FRONT + 1.8, SOCKET_Z]),
    to: at([PEDESTAL_SOCKET, PEDESTAL_FRONT + 1.8, SOCKET_Z]),
    via: [at([CONTROLLER_SOCKETS.robot, CONTROLLER_FRONT + 5, 0.4]), at([CONTROLLER_SOCKETS.robot, lane, 0.4]), at([PEDESTAL_SOCKET, lane, 0.4]), at([PEDESTAL_SOCKET, PEDESTAL_FRONT + 5, 0.4])],
    tone: 'lo',
  });
}

// The label plate on the bench's front edge, between the two arms; its rule lines stand for print.
{
  const LABEL: Plan = { x: 70, y: BENCH.y + BENCH.d - 15, w: 44, d: 8, r: 1.4 };
  solid(slab(LABEL, 0, 0.8, 3), 'lo');
  line(planOutline(insetPlan(LABEL, 1.4), 0.8, P, 3), 'faint');
  const rule = (y: number, x1: number) => lineOnTop([LABEL.x + 5, LABEL.y + y], [LABEL.x + x1, LABEL.y + y], 0.8, P);
  line(rule(2.9, LABEL.w - 8) + rule(4.4, LABEL.w - 15) + rule(5.9, LABEL.w - 21), 'lo', true);
  dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, 0.8])], 0.45, 'mid');
}

// The operator's riser: an aluminium box on the bench with a lid seam, its slot running down the front face, and
// corner screws; on it the leader's clamp plate and its printed base block with a seam.
solid(slab(RISER, 0, RISER_H, 3, 0.6), 'mid', { inner: seam(sideSeam(RISER, RISER_H - 4, P, 3)) });
line(pathOf([at([RISER.x + RISER.w / 2 - 1.2, RISER.y + RISER.d, 4]), at([RISER.x + RISER.w / 2 - 1.2, RISER.y + RISER.d, RISER_H - 7]), at([RISER.x + RISER.w / 2 + 1.2, RISER.y + RISER.d, RISER_H - 7]), at([RISER.x + RISER.w / 2 + 1.2, RISER.y + RISER.d, 4])], true), 'faint');
screwsOn(RISER, RISER_H, 3, 0.5);
solid(slab(CLAMP, RISER_H, 2.4, 3, 0.5), 'lo');
screwsOn(CLAMP, RISER_H + 2.4, 3, 0.5);
solid(slab(LEADER_BASE, RISER_H + 2.4, 12, 3, 0.6), 'mid', { inner: seam(sideSeam(LEADER_BASE, RISER_H + 6.4, P, 3)) });
screwsOn(LEADER_BASE, LEADER_FOOT, 2.6, 0.4);

PARTS.push({ kind: 'slot', slot: 'robot' });
PARTS.push({ kind: 'slot', slot: 'leader' });

export { PARTS };

// ------------------------------------------------------------- the moving arms
/**
 * The robot arm for a pose, in painter's order from its farthest part: the
 * gripper and the wrist under the wrist housing, the forearm, the upper arm,
 * the elbow housing with its dial, then the base on the pedestal and the
 * shoulder housing with its dial.
 */
export function robotParts(pose: Pose): ArmPart[] {
  const list: ArmPart[] = [];
  const put = (paths: SolidPaths, tone: Tone = 'hi', extra: { inner?: string; name?: string } = {}) => list.push({ kind: 'solid', paths, tone, ...extra });
  const x0 = ROBOT.x;
  const y0 = ROBOT.y;
  const z0 = ROBOT_SHOULDER_Z;
  const { elbow, wrist } = armPoints(ROBOT_LINKS, pose);
  const E: [number, number] = [x0 + elbow[0] * UNIT, z0 + elbow[1] * UNIT];
  const W: [number, number] = [x0 + wrist[0] * UNIT, z0 + wrist[1] * UNIT];
  const fore = forearmHeading(pose);
  const yF = y0 + RY.fore;

  // The hand: two fingers under the gripper body, the tool flange, and the wrist column up into the wrist housing.
  const [wx, wz] = W;
  for (const side of [-1, 1] as const) put(slabOf(box(wx + side * 4.4, yF, 2.4, 6, 0.5), wz - ROBOT_HAND_DROP, 8, P, 2), 'mid', { name: 'robot-finger' });
  const gripper = box(wx, yF, 16, 10, 1.4);
  put(slabOf(gripper, wz - 26, 6, P, 3, 0.4), 'mid', { inner: seam(sideSeam(gripper, wz - 23, P, 3)), name: 'robot-gripper' });
  put(cyl(wx, yF, 6.2, wz - 20, 1.6, 32, 0.2), 'lo', { name: 'robot-flange' });
  put(cyl(wx, yF, 5.4, wz - 18.4, 12, 32), 'mid', { inner: seam(sideArc(wx, yF, 5.4, wz - 14, P, 24)), name: 'robot-wrist' });

  // The forearm and its wrist housing.
  const forearm: Point3 = [W[0] - E[0], 0, W[1] - E[1]];
  put(discAlong([E[0], yF, E[1]], forearm, 6, Math.hypot(forearm[0], forearm[2]), P, 36), 'hi', {
    inner: seam(seamAround([E[0] + forearm[0] * 0.6, yF, E[1] + forearm[2] * 0.6], forearm, 6)),
    name: 'robot-forearm',
  });
  put(discAlong([wx, y0 + RY.wrist[0], wz], Y, 8.4, RY.wrist[1] - RY.wrist[0], P, 40, 0.4), 'hi', { inner: seam(seamAround([wx, y0 + RY.wrist[0] + 8, wz], Y, 8.4)), name: 'robot-wrist' });
  list.push({ kind: 'dots', points: [at([wx, y0 + RY.wrist[1], wz])], size: 0.6, tone: 'hi' });

  // The upper arm, running behind the shoulder housing into the elbow housing, which carries the elbow's dial.
  const yU = y0 + RY.upper;
  const upper: Point3 = [E[0] - x0, 0, E[1] - z0];
  put(discAlong([x0, yU, z0], upper, 7, Math.hypot(upper[0], upper[2]), P, 40), 'hi', {
    inner: seam(seamAround([x0 + upper[0] * 0.55, yU, z0 + upper[2] * 0.55], upper, 7)),
    name: 'robot-upper-arm',
  });
  put(discAlong([E[0], y0 + RY.elbow[0], E[1]], Y, ROBOT_DIAL.elbow, RY.elbow[1] - RY.elbow[0], P, 56, 0.5), 'hi', {
    inner: seam(seamAround([E[0], y0 + RY.elbow[0] + 6, E[1]], Y, ROBOT_DIAL.elbow)),
    name: 'robot-elbow',
  });
  list.push(...dialParts(E[0], E[1], y0 + RY.elbow[1], ROBOT_DIAL.elbow, pose.shoulder, 150, -1, fore, 'robot-elbow-needle'));

  // The base on the pedestal: a bolted flange, the column with its seam and the bearing ring under the shoulder.
  put(cyl(x0, y0, 17, PEDESTAL_H, 3, 48, 0.5), 'mid', { name: 'robot-base' });
  list.push({
    kind: 'dots',
    points: Array.from({ length: 8 }, (_, k) => at([x0 + 14 * Math.cos((22.5 + k * 45) * RAD), y0 + 14 * Math.sin((22.5 + k * 45) * RAD), PEDESTAL_H + 3])),
    size: 0.5,
    tone: 'mid',
  });
  put(cyl(x0, y0, 12, PEDESTAL_H + 3, 39, 40), 'mid', { inner: seam(sideArc(x0, y0, 12, PEDESTAL_H + 12, P, 32)), name: 'robot-base' });
  put(cyl(x0, y0 + 2, 14.5, PEDESTAL_H + 42, 8, 44, 0.4), 'mid', { inner: seam(sideArc(x0, y0 + 2, 14.5, PEDESTAL_H + 46, P, 32)), name: 'robot-base' });

  // The shoulder housing across the top, its dial on its face: zero at level, reading up.
  put(discAlong([x0, y0 + RY.shoulder[0], z0], Y, ROBOT_DIAL.shoulder, RY.shoulder[1] - RY.shoulder[0], P, 64, 0.5), 'hi', {
    inner: seam(seamAround([x0, y0 + RY.shoulder[0] + 7, z0], Y, ROBOT_DIAL.shoulder)),
    name: 'robot-shoulder',
  });
  list.push(...dialParts(x0, z0, y0 + RY.shoulder[1], ROBOT_DIAL.shoulder, 0, 90, 1, pose.shoulder, 'robot-shoulder-needle'));
  return list;
}

/** A printed servo case: a rounded box in the arm's upright plane, turned `deg` above level, from depth y0 to y1. */
function servoCase(cx: number, cz: number, y0: number, y1: number, w: number, h: number, deg: number) {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  // u along the case's long side and v across it, both in the upright plane; u x v points to -y, so the case runs back from y1.
  return plateIn([cx, y1, cz], [c, 0, s], [-s, 0, c], roundedOutline(-w / 2, -h / 2, w / 2, h / 2, 1.6, 3), y1 - y0, P, 0.4);
}

/** A printed link: a flat bar between two joints, `width` across, from depth y0 to y1, with a closed lightening slot on its face. */
function printedLink(a: [number, number], b: [number, number], y0: number, y1: number, width: number, heading: number, name: string): ArmPart[] {
  const ux = Math.cos(heading * RAD);
  const uz = Math.sin(heading * RAD);
  const parts: ArmPart[] = [
    { kind: 'solid', paths: barBetween([a[0], (y0 + y1) / 2, a[1]], [b[0], (y0 + y1) / 2, b[1]], [-uz, 0, ux], width, y1 - y0, P, 0.3), tone: 'hi', name },
  ];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const from = 8;
  const to = length - 8;
  if (to - from > 6) {
    const slot: Point3[] = [];
    const half = width * 0.18;
    for (let j = 0; j <= 8; j++) slot.push(polarIn(a[0] + ux * from, a[1] + uz * from, y1, half, heading + 90 + j * 22.5));
    for (let j = 0; j <= 8; j++) slot.push(polarIn(a[0] + ux * to, a[1] + uz * to, y1, half, heading - 90 + j * 22.5));
    parts.push({ kind: 'line', d: pathOf(slot.map(at), true), tone: 'faint' });
  }
  return parts;
}

/**
 * The leader arm for a pose, in painter's order from its farthest part: the
 * handle and its trigger under the wrist block, the forearm, the upper link,
 * the elbow servo riding on it with its dial, then the column on the base
 * block and the shoulder servo with its dial. Every length is the robot's
 * times LEADER_SCALE; the joints, their order and their zeros are the robot's.
 */
export function leaderParts(pose: Pose): ArmPart[] {
  const list: ArmPart[] = [];
  const put = (paths: SolidPaths, tone: Tone = 'hi', extra: { inner?: string; name?: string; lit?: boolean } = {}) => list.push({ kind: 'solid', paths, tone, ...extra });
  const x0 = LEADER.x;
  const y0 = LEADER.y;
  const z0 = LEADER_SHOULDER_Z;
  const { elbow, wrist } = armPoints(LEADER_LINKS, pose);
  const E: [number, number] = [x0 + elbow[0] * UNIT, z0 + elbow[1] * UNIT];
  const W: [number, number] = [x0 + wrist[0] * UNIT, z0 + wrist[1] * UNIT];
  const fore = forearmHeading(pose);
  const yF = y0 + (LY.fore[0] + LY.fore[1]) / 2;

  // The handle, the one lit part, hanging under the wrist block, with its trigger behind it.
  const [wx, wz] = W;
  put(slabOf(box(wx + 3.6, yF, 2, 2.6, 0.5), wz - 13, 6, P, 2), 'mid', { name: 'leader-trigger' });
  put(cyl(wx, yF, 3.4, wz - LEADER_HANDLE_DROP, 16, 28, 0.3), 'hi', { lit: true, inner: seam(sideArc(wx, yF, 3.4, wz - 8.5, P, 20)), name: 'leader-handle' });

  // The forearm and the wrist block at its tip.
  list.push(...printedLink(E, W, y0 + LY.fore[0], y0 + LY.fore[1], 5.6, fore, 'leader-forearm'));
  put(servoCase(wx, wz, yF - 3.6, yF + 3.6, 10, 9, 0), 'mid', { name: 'leader-wrist' });
  list.push({ kind: 'dots', points: [at([wx - 3.2, yF + 3.6, wz]), at([wx + 3.2, yF + 3.6, wz])], size: 0.4, tone: 'mid' });

  // The upper link, then the elbow servo riding on its tip, with its dial: zero along the upper link, reading the bend down.
  list.push(...printedLink([x0, z0], E, y0 + LY.upper[0], y0 + LY.upper[1], 6.4, pose.shoulder, 'leader-upper-arm'));
  put(servoCase(E[0], E[1], y0 + LY.elbow[0], y0 + LY.elbow[1] - 1, 18, 15, pose.shoulder), 'mid', { name: 'leader-elbow' });
  put(discAlong([E[0], y0 + LY.elbow[1] - 1, E[1]], Y, LEADER_DIAL.elbow, 1, P, 40, 0.2), 'hi', { name: 'leader-elbow' });
  list.push(...dialParts(E[0], E[1], y0 + LY.elbow[1], LEADER_DIAL.elbow, pose.shoulder, 150, -1, fore, 'leader-elbow-needle'));

  // The column on the base block, then the shoulder servo with its dial: zero at level, reading up.
  const column: Plan = box(x0, y0, 11, 11, 1.6);
  put(slab(column, LEADER_FOOT, z0 - 9.5 - LEADER_FOOT, 3, 0.4), 'mid', { inner: seam(sideSeam(column, LEADER_FOOT + 9, P, 3)), name: 'leader-column' });
  put(servoCase(x0, z0, y0 + LY.shoulder[0], y0 + LY.shoulder[1] - 1, 21, 19, 0), 'mid', { name: 'leader-shoulder' });
  list.push({
    kind: 'dots',
    points: [[-8.6, -7.6], [8.6, -7.6], [-8.6, 7.6], [8.6, 7.6]].map(([u, w]) => at([x0 + u!, y0 + LY.shoulder[1] - 1, z0 + w!])),
    size: 0.4,
    tone: 'mid',
  });
  put(discAlong([x0, y0 + LY.shoulder[1] - 1, z0], Y, LEADER_DIAL.shoulder, 1, P, 44, 0.2), 'hi', { name: 'leader-shoulder' });
  list.push(...dialParts(x0, z0, y0 + LY.shoulder[1], LEADER_DIAL.shoulder, 0, 90, 1, pose.shoulder, 'leader-shoulder-needle'));
  return list;
}

/**
 * The lowest point of each arm's hand for a pose, in world units above the
 * bench top: the robot's fingertips and the foot of the leader's handle.
 * Within the joint stops both stay above the bench (and the robot's mat).
 */
export function handFloors(pose: Pose) {
  const robot = armPoints(ROBOT_LINKS, pose).wrist;
  const leader = armPoints(LEADER_LINKS, pose).wrist;
  return { robot: ROBOT_SHOULDER_Z + robot[1] * UNIT - ROBOT_HAND_DROP, leader: LEADER_SHOULDER_Z + leader[1] * UNIT - LEADER_HANDLE_DROP, mat: MAT_H };
}

/** The leader's handle grip, in world units: the point a drag holds. */
const gripOf = (pose: Pose): Point3 => {
  const { wrist } = armPoints(LEADER_LINKS, pose);
  return [LEADER.x + wrist[0] * UNIT, LEADER.y + (LY.fore[0] + LY.fore[1]) / 2, LEADER_SHOULDER_Z + wrist[1] * UNIT - 13];
};

/** The leader's handle grip on screen, for a pose. */
export const leaderGrip = (pose: Pose): Flat => at(gripOf(pose));

/**
 * The leader's wrist under a viewBox point: the inverse camera on the
 * handle's upright plane, given as a wrist position in robot upper-arm
 * lengths from the leader's shoulder, as the model's LEADER_LINKS measure
 * it. A drag sets the leader by this, through the model's poseFor.
 */
export function leaderWristAt([sx, sy]: Flat): [number, number] {
  const y = LEADER.y + (LY.fore[0] + LY.fore[1]) / 2;
  // iso() is linear in the world point: screen = o + x * ex + z * ez on this plane.
  const o = at([0, y, 0]);
  const ex = at([1, y, 0]);
  const ez = at([0, y, 1]);
  const a = [ex[0] - o[0], ex[1] - o[1]] as const;
  const c = [ez[0] - o[0], ez[1] - o[1]] as const;
  const px = sx - o[0];
  const py = sy - o[1];
  const det = a[0] * c[1] - a[1] * c[0];
  const x = (px * c[1] - py * c[0]) / det;
  const z = (a[0] * py - a[1] * px) / det;
  return [(x - LEADER.x) / UNIT, (z + 13 - LEADER_SHOULDER_Z) / UNIT];
}
