/**
 * The air-bearing table for FreeFloatingArm, drawn with the isometric kit.
 *
 * The object is the explanation. Labs test free-flying space robots on Earth
 * by floating a mock-up of the spacecraft on air pads over a flat slab, so in
 * the plane of the slab nothing pushes on it: it can slide and turn as it
 * would in orbit. This is the rig Umetani and Yoshida built in 1989: a 6.3 kg
 * body on three air pads, with its own gas bottle, battery and radio, and a
 * two-link arm of 0.35 m links driven by DC motors. A grapple fixture is
 * bolted to the slab where the arm's hand would land if its body were held
 * still. Swing the arm and the body turns the other way on its pads; the
 * hand (the one lit part) ends off the grapple. A faint tape square on the
 * slab marks where the body started, so its turn shows against it.
 *
 * The model is planar conservation of momentum with the whole rig starting
 * at rest: the center of mass stays put (zero linear momentum), and the
 * body's turn is whatever keeps the total angular momentum at zero while the
 * shoulder swings. It is the arm's own masses and lengths from the 1989
 * paper, with the body as built, ballasted with two lead bricks to about
 * ETS-VII's body-to-arm mass ratio, or clamped to the slab (a ground-based arm).
 *
 * World units: UNIT per meter (4 mm each). x and y lie on the slab, y toward
 * the viewer, z up from the slab's top. The slab and the grapple are built
 * once; the body and the arm are rebuilt for each pose.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  planOutline,
  ring,
  ringSeam,
  sideArc,
  sideSeam,
  slabOf,
  topTicks,
  towardViewer,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong } from '../prism.ts';
import { phoneFitOf } from '../phone-fit.ts';
import type { IsoPart } from '../part-view.tsx';

// ================================================================= the model
/**
 * Umetani and Yoshida's 1989 laboratory model (NASA Conference on Space
 * Telerobotics, table of link parameters): the body, then the two links.
 * `a` runs from a link's joint to its center of mass, `b` from its center of
 * mass to the next joint (for the body, `b` is the shoulder's offset).
 */
export const LAB = {
  body: { mass: 6.256, inertia: 0.169, shoulder: 0.19 },
  links: [
    { a: 0.162, b: 0.188, mass: 0.747, inertia: 0.0424 },
    { a: 0.124, b: 0.226, mass: 0.62, inertia: 0.0141 },
  ],
} as const;
export const ARM_MASS = LAB.links[0].mass + LAB.links[1].mass;
const L1 = LAB.links[0].a + LAB.links[0].b;
const L2 = LAB.links[1].a + LAB.links[1].b;

/** ETS-VII as flown: its base and its six arm links, as identified in orbit (Yoshida). */
export const ETS_VII = { body: 2552, arm: 35.01 + 22.45 + 21.89 + 16.54 + 26.0 + 18.49, inertiaZ: 7087, armLength: 2 } as const;
export const ETS_VII_RATIO = ETS_VII.body / ETS_VII.arm;

/**
 * The ballast: standard lead bricks, 50 by 100 by 200 mm (11.34 g per cubic
 * centimeter, so 11.34 kg each), one lying along each side of the deck with
 * its center 0.1 m from the body's center, so the body's center of mass
 * does not move. Two bring the body to about ETS-VII's body-to-arm ratio.
 */
export const BRICK = { long: 0.2, wide: 0.1, high: 0.05, offset: 0.1, mass: 11.34 } as const;
export const BALLAST_BRICKS = 2;

export type BodyId = 'lab' | 'ballast' | 'clamped';
export interface Body {
  id: BodyId;
  /** kg, and kg m² about the body's own center; null for a body clamped to the slab. */
  mass: number | null;
  inertia: number | null;
  bricks: number;
}
export function bodyOf(id: BodyId): Body {
  if (id === 'clamped') return { id, mass: null, inertia: null, bricks: 0 };
  const bricks = id === 'ballast' ? BALLAST_BRICKS : 0;
  // A brick turning about its own center, m (long² + wide²) / 12, carried at its offset, m d².
  const own = (BRICK.mass * (BRICK.long ** 2 + BRICK.wide ** 2)) / 12 + BRICK.mass * BRICK.offset ** 2;
  return { id, mass: LAB.body.mass + bricks * BRICK.mass, inertia: LAB.body.inertia + bricks * own, bricks };
}

/** The swing: the shoulder turns from Q1[0] to Q1[1] degrees with the elbow held at Q2, both against the body. */
export const Q1: readonly [number, number] = [-45, 45];
export const Q2 = 90;
export const SWING_DEGREES = Math.abs(Q1[1] - Q1[0]);
const RAD = Math.PI / 180;

type V2 = [number, number];
const e = (angle: number): V2 => [Math.cos(angle), Math.sin(angle)];
const perp = ([x, y]: V2): V2 => [-y, x];
const cross2 = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0];

/** The arm's points relative to the body's center, in the slab's axes, for the body at `theta` and the shoulder at q1 (radians). */
function armRelative(theta: number, q1: number) {
  const q2 = Q2 * RAD;
  const j1: V2 = [LAB.body.shoulder * Math.cos(theta), LAB.body.shoulder * Math.sin(theta)];
  const u1 = e(theta + q1);
  const u2 = e(theta + q1 + q2);
  const c1: V2 = [j1[0] + LAB.links[0].a * u1[0], j1[1] + LAB.links[0].a * u1[1]];
  const j2: V2 = [j1[0] + L1 * u1[0], j1[1] + L1 * u1[1]];
  const c2: V2 = [j2[0] + LAB.links[1].a * u2[0], j2[1] + LAB.links[1].a * u2[1]];
  const tip: V2 = [j2[0] + L2 * u2[0], j2[1] + L2 * u2[1]];
  return { j1, j2, c1, c2, tip, u1, u2 };
}

/**
 * The total angular momentum's coefficients, L = A theta' + B q1', for a
 * free body: every velocity measured from the system's center of mass,
 * which does not move.
 */
function momentum(theta: number, q1: number, mass: number, inertia: number) {
  const m1 = LAB.links[0].mass;
  const m2 = LAB.links[1].mass;
  const M = mass + m1 + m2;
  const { j1, c1, c2 } = armRelative(theta, q1);
  // Positions from the system's center of mass.
  const shift: V2 = [-(m1 * c1[0] + m2 * c2[0]) / M, -(m1 * c1[1] + m2 * c2[1]) / M];
  const p0 = shift;
  const p1: V2 = [c1[0] + shift[0], c1[1] + shift[1]];
  const p2: V2 = [c2[0] + shift[0], c2[1] + shift[1]];
  const coefficient = (d1: V2, d2: V2, w0: number, w1: number, w2: number) => {
    // Velocities relative to the body's center, then the body's own velocity that keeps the center of mass still.
    const v0: V2 = [-(m1 * d1[0] + m2 * d2[0]) / M, -(m1 * d1[1] + m2 * d2[1]) / M];
    const v1: V2 = [v0[0] + d1[0], v0[1] + d1[1]];
    const v2: V2 = [v0[0] + d2[0], v0[1] + d2[1]];
    return inertia * w0 + LAB.links[0].inertia * w1 + LAB.links[1].inertia * w2 + mass * cross2(p0, v0) + m1 * cross2(p1, v1) + m2 * cross2(p2, v2);
  };
  // Turning the body turns everything about the body's center; the shoulder turns the links about the shoulder.
  const A = coefficient(perp(c1), perp(c2), 1, 1, 1);
  const B = coefficient(perp([c1[0] - j1[0], c1[1] - j1[1]]), perp([c2[0] - j1[0], c2[1] - j1[1]]), 0, 1, 1);
  return { A, B };
}

const STEPS = 480;
/** The body's turn at each step of the swing (radians), integrated once per body with the classical Runge-Kutta rule. */
function turnTable(mass: number, inertia: number): number[] {
  const dq = ((Q1[1] - Q1[0]) * RAD) / STEPS;
  const rate = (theta: number, q1: number) => {
    const { A, B } = momentum(theta, q1, mass, inertia);
    return -B / A;
  };
  const table = [0];
  let theta = 0;
  for (let step = 0; step < STEPS; step++) {
    const q = Q1[0] * RAD + step * dq;
    const k1 = rate(theta, q);
    const k2 = rate(theta + (k1 * dq) / 2, q + dq / 2);
    const k3 = rate(theta + (k2 * dq) / 2, q + dq / 2);
    const k4 = rate(theta + k3 * dq, q + dq);
    theta += ((k1 + 2 * k2 + 2 * k3 + k4) * dq) / 6;
    table.push(theta);
  }
  return table;
}
const TABLES: Record<Exclude<BodyId, 'clamped'>, number[]> = {
  lab: turnTable(bodyOf('lab').mass!, bodyOf('lab').inertia!),
  ballast: turnTable(bodyOf('ballast').mass!, bodyOf('ballast').inertia!),
};

export interface Pose {
  /** How far through the swing, 0 to 1. */
  s: number;
  /** The shoulder against the body, degrees. */
  shoulder: number;
  /** The body's turn, radians, counterclockwise seen from above. */
  theta: number;
  /** The body's center, meters from where it started. */
  body: V2;
  j1: V2;
  j2: V2;
  tip: V2;
  /** Where the same swing puts the hand with the body held still, meters from the body's start. */
  fixedTip: V2;
}

/** The whole rig at swing `s` (0 to 1) for a body. */
export function poseAt(id: BodyId, sIn: number): Pose {
  const s = Math.min(1, Math.max(0, sIn));
  const q1 = (Q1[0] + (Q1[1] - Q1[0]) * s) * RAD;
  const fixed = armRelative(0, q1);
  let theta = 0;
  let body: V2 = [0, 0];
  if (id !== 'clamped') {
    const table = TABLES[id];
    const at = s * STEPS;
    const k = Math.min(STEPS - 1, Math.floor(at));
    theta = table[k]! + (table[k + 1]! - table[k]!) * (at - k);
    // The center of mass stays where it was at the start of the swing.
    const { mass } = bodyOf(id);
    const m1 = LAB.links[0].mass;
    const m2 = LAB.links[1].mass;
    const M = mass! + m1 + m2;
    const start = armRelative(0, Q1[0] * RAD);
    const now = armRelative(theta, q1);
    const g0: V2 = [(m1 * start.c1[0] + m2 * start.c2[0]) / M, (m1 * start.c1[1] + m2 * start.c2[1]) / M];
    const g1: V2 = [(m1 * now.c1[0] + m2 * now.c2[0]) / M, (m1 * now.c1[1] + m2 * now.c2[1]) / M];
    body = [g0[0] - g1[0], g0[1] - g1[1]];
  }
  const arm = armRelative(theta, q1);
  const add = (p: V2): V2 => [body[0] + p[0], body[1] + p[1]];
  return { s, shoulder: q1 / RAD, theta, body, j1: add(arm.j1), j2: add(arm.j2), tip: add(arm.tip), fixedTip: fixed.tip };
}

/** How far the body has turned (degrees, the other way from the shoulder) and how far the hand is from where a fixed body puts it (meters). */
export function resultOf(id: BodyId, s: number) {
  const pose = poseAt(id, s);
  return {
    turn: pose.theta / RAD,
    miss: Math.hypot(pose.tip[0] - pose.fixedTip[0], pose.tip[1] - pose.fixedTip[1]),
    swing: SWING_DEGREES * pose.s,
  };
}

// ================================================================= the drawing
export const WIDTH = 640;
export const AZIMUTH = 56;
export const ELEVATION = 42;
/** World units per meter. */
export const UNIT = 250;

/** The home pose's body center on the slab, in world units. */
const HOME: Plane = [-70, 40];
const toWorld = ([x, y]: V2): Plane => [HOME[0] + x * UNIT, HOME[1] - y * UNIT];
/** The slab's y runs toward the viewer, the model's y away from it: a counterclockwise turn in the model is clockwise on the slab. */
const headingOf = (angle: number) => -angle;

const SLAB_H = 28;
const BODY_HALF = 0.15 * UNIT;
/** Heights (world units) of the rig's layers above the slab. */
const Z = {
  pad: 2.6,
  plate: 12,
  deck: 15,
  bracket: 19,
  link1: [34.5, 38.5] as const,
  elbow: [22.5, 34.5] as const,
  link2: [18.5, 22.5] as const,
  wrist: [15.5, 25] as const,
  finger: [17.5, 21.5] as const,
  knob: [15.5, 23] as const,
};

// ---------------------------------------------------------------- the slab
/** Every place the hand can be, in every body, for the slab and the camera. */
function reachPoints(): Plane[] {
  const points: Plane[] = [];
  for (const id of ['lab', 'ballast', 'clamped'] as const) {
    for (let k = 0; k <= 24; k++) {
      const pose = poseAt(id, k / 24);
      for (const p of [pose.tip, pose.j2, pose.body]) points.push(toWorld(p));
    }
  }
  return points;
}
const REACH = reachPoints();
const GRAPPLE: Plane = toWorld(poseAt('clamped', 1).fixedTip);
const xs = REACH.map(([x]) => x);
const ys = REACH.map(([, y]) => y);
const SLAB: Plan = {
  x: Math.floor(Math.min(...xs, HOME[0] - BODY_HALF) - 26),
  y: Math.floor(Math.min(...ys, HOME[1] - BODY_HALF) - 24),
  w: 0,
  d: 0,
  r: 6,
};
SLAB.w = Math.ceil(Math.max(...xs) + 26 - SLAB.x);
SLAB.d = Math.ceil(Math.max(...ys, HOME[1] + BODY_HALF) + 30 - SLAB.y);

const extremes: Point3[] = [];
for (const [x, y] of [
  [SLAB.x, SLAB.y],
  [SLAB.x + SLAB.w, SLAB.y],
  [SLAB.x, SLAB.y + SLAB.d],
  [SLAB.x + SLAB.w, SLAB.y + SLAB.d],
] as const) {
  extremes.push([x, y, -SLAB_H - 16], [x, y, 0]);
}
for (const [x, y] of REACH) extremes.push([x, y, Z.link1[1] + 4]);
extremes.push([HOME[0], HOME[1], Z.deck + 44]);
const FIT_PAD = 8;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 4 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = ([x, y]: Plane, z = 0) => depthOf([x, y, z], P);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a) - depth(b));
const VIEW = towardViewer(P);

export type Part = IsoPart | { kind: 'slot'; slot: 'rig' };
export type RigPart = IsoPart;

const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) PARTS.push({ kind: 'line', d, tone, free });
};
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });
const seam = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');

// Three leveling jacks under the slab (a granite plate stands on three points), each a floor pad, a screw, a lock nut and a head block.
{
  const jacks: Plane[] = [
    [SLAB.x + 40, SLAB.y + 30],
    [SLAB.x + 40, SLAB.y + SLAB.d - 30],
    [SLAB.x + SLAB.w - 40, SLAB.y + SLAB.d / 2],
  ];
  for (const [x, y] of byDepth(jacks)) {
    solid(cyl(x, y, 10, -SLAB_H - 16, 2.4, 32, 0.4), 'lo');
    solid(cyl(x, y, 3, -SLAB_H - 13.6, 9, 16), 'mid', { inner: seam(sideArc(x, y, 3, -SLAB_H - 10, P, 12)) });
    solid(cyl(x, y, 6, -SLAB_H - 9, 3, 6, 0.3), 'mid');
    solid(slab({ x: x - 9, y: y - 9, w: 18, d: 18, r: 1.5 }, -SLAB_H - 4, 4, 2, 0.4), 'lo');
  }
}

// The granite slab: a thick plate with a chamfered top edge, a lapped working area, and a grid of threaded inserts.
solid(slab(SLAB, -SLAB_H, SLAB_H, 6, 1.6), 'mid', { inner: seam(sideSeam(SLAB, -6, P, 6)) });
line(planOutline(insetPlan(SLAB, 9), 0, P, 6), 'faint');
const INSERT_STEP = 0.2 * UNIT;
const INSERTS: Plane[] = [];
for (let x = SLAB.x + 24; x < SLAB.x + SLAB.w - 18; x += INSERT_STEP) {
  for (let y = SLAB.y + 22; y < SLAB.y + SLAB.d - 30; y += INSERT_STEP) {
    // Leave the inserts the body's home square covers.
    if (Math.abs(x - HOME[0]) < BODY_HALF + 6 && Math.abs(y - HOME[1]) < BODY_HALF + 6) continue;
    if (Math.hypot(x - GRAPPLE[0], y - GRAPPLE[1]) < 14) continue;
    INSERTS.push([x, y]);
  }
}
line(INSERTS.map(([x, y]) => ring(x, y, 1.6, 0, P, 12)).join(''), 'lo');

// The steel rule along the front edge, its ticks every 25 mm, long every 125 mm.
{
  const strip: Plan = { x: SLAB.x + 20, y: SLAB.y + SLAB.d - 16, w: SLAB.w * 0.56, d: 7, r: 0.8 };
  solid(slab(strip, 0, 0.6, 2), 'lo', { crease: 'none' });
  const ticks = topTicks(strip.x + 3, strip.x + strip.w - 3, 0.025 * UNIT, 5, strip.y + 0.6, 0.6, [2.2, 4], P);
  line(ticks.minor, 'lo');
  line(ticks.major, 'mid');
  dots([at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])], 0.45);
}

// The label plate at the front right, its three rules standing for print.
{
  const label: Plan = { x: SLAB.x + SLAB.w - 76, y: SLAB.y + SLAB.d - 18, w: 52, d: 10, r: 1.4 };
  solid(slab(label, 0, 0.8, 3), 'lo');
  line(planOutline(insetPlan(label, 1.4), 0.8, P, 3), 'faint');
  const rule = (y: number, x1: number) => onTop([[label.x + 6, label.y + y], [label.x + x1, label.y + y]], 0.8, P);
  line(rule(3.4, label.w - 8) + rule(5.2, label.w - 18) + rule(7, label.w - 24), 'lo', true);
  dots([at([label.x + 2.6, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.6, label.y + label.d / 2, 0.8])], 0.45);
}

// A round bubble level at the back right corner.
{
  const [x, y] = [SLAB.x + SLAB.w - 22, SLAB.y + 18];
  solid(cyl(x, y, 7, 0, 2.6, 32, 0.4), 'mid');
  line(ring(x, y, 4.6, 2.6, P, 28), 'lo');
  line(ring(x, y, 1.6, 2.6, P, 16), 'faint');
  dots([at([x + 0.4, y - 0.3, 2.6])], 0.9, 'hi');
}

// The body's home square, in tape: where the body started.
line(planOutline({ x: HOME[0] - BODY_HALF - 3, y: HOME[1] - BODY_HALF - 3, w: 2 * BODY_HALF + 6, d: 2 * BODY_HALF + 6, r: 1 }, 0, P, 2), 'lo');

PARTS.push({ kind: 'slot', slot: 'rig' });
export { PARTS };

// ---------------------------------------------------------------- the grapple fixture
/** The grapple fixture bolted to the slab where a held body's arm puts its hand. */
function grappleParts(): RigPart[] {
  const [x, y] = GRAPPLE;
  const list: RigPart[] = [];
  list.push({ kind: 'solid', paths: cyl(x, y, 9, 0, 1.8, 32, 0.4), tone: 'lo' });
  list.push({ kind: 'dots', points: [0, 1, 2, 3].map((k) => at([x + 6.6 * Math.cos((45 + k * 90) * RAD), y + 6.6 * Math.sin((45 + k * 90) * RAD), 1.8])), size: 0.5, tone: 'mid' });
  list.push({ kind: 'solid', paths: cyl(x, y, 2.6, 1.8, Z.knob[0] - 1.8, 20), tone: 'mid', inner: seam(sideArc(x, y, 2.6, 6, P, 14)) });
  list.push({ kind: 'solid', paths: cyl(x, y, 3.4, Z.knob[0], Z.knob[1] - Z.knob[0], 28, 0.4), tone: 'hi', inner: seam(sideArc(x, y, 3.4, (Z.knob[0] + Z.knob[1]) / 2, P, 20)) });
  list.push({ kind: 'line', d: ring(x, y, 1.4, Z.knob[1], P, 16), tone: 'lo' });
  return list;
}
const GRAPPLE_PARTS = grappleParts();

// ---------------------------------------------------------------- the floating body
/** A body-frame point (world units from the body's center, x toward the shoulder) on the slab, for a pose. */
function placer(pose: Pose) {
  const [cx, cy] = toWorld(pose.body);
  const h = headingOf(pose.theta);
  const c = Math.cos(h);
  const s = Math.sin(h);
  return ([u, v]: Plane): Plane => [cx + u * c - v * s, cy + u * s + v * c];
}
/** A rounded rectangle in the body's frame, turned onto the slab. */
const boxRing = (place: (p: Plane) => Plane, x0: number, y0: number, x1: number, y1: number, r: number, steps = 3): Plane[] => {
  const out: Plane[] = [];
  const corners: Array<[number, number, number]> = [
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= steps; k++) {
      const a = start + (k / steps) * (Math.PI / 2);
      out.push(place([cx + r * Math.cos(a), cy + r * Math.sin(a)]));
    }
  }
  return out;
};
/** A stadium (a link with round ends) from a to b on the slab, `half` wide each side. */
function stadium(a: Plane, b: Plane, half: number, steps = 8): Plane[] {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const out: Plane[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = angle - Math.PI / 2 + (k / steps) * Math.PI;
    out.push([b[0] + half * Math.cos(t), b[1] + half * Math.sin(t)]);
  }
  for (let k = 0; k <= steps; k++) {
    const t = angle + Math.PI / 2 + (k / steps) * Math.PI;
    out.push([a[0] + half * Math.cos(t), a[1] + half * Math.sin(t)]);
  }
  return out;
}

interface Item {
  key: number;
  parts: RigPart[];
}

/** The body's pads, plate and everything on its deck, for a pose, in painter's order. */
function bodyParts(pose: Pose, body: Body): RigPart[] {
  const place = placer(pose);
  const h = headingOf(pose.theta);
  const list: RigPart[] = [];
  const put = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; inner?: string; crease?: Tone | 'none' } = {}) => list.push({ kind: 'solid', paths, tone, ...extra });
  const ext = (ringPoints: Plane[], z: number, height: number, bevel = 0) => extrude(ringPoints, z, height, P, { bevel });
  const B = BODY_HALF;

  // Three air pads under the plate, each on a ball stud.
  const pads = [90, 210, 330].map((deg) => place([0.84 * B * Math.cos(deg * RAD), 0.84 * B * Math.sin(deg * RAD)]));
  for (const [x, y] of byDepth(pads)) {
    put(cyl(x, y, 9.5, 0, Z.pad, 32, 0.4), 'lo');
    put(cyl(x, y, 4.2, Z.pad, 1.6, 20, 0.2), 'mid');
    put(cyl(x, y, 2.4, Z.pad + 1.6, Z.plate - Z.pad - 1.6, 16), 'mid');
  }
  // The base plate with its edge seam and corner screws.
  const plateRing = boxRing(place, -B, -B, B, B, 3, 3);
  put(ext(plateRing, Z.plate, Z.deck - Z.plate, 0.6), 'mid', { inner: seam(ringSeam(plateRing, Z.plate + 1.4, P)) });
  list.push({ kind: 'dots', points: ([[-B + 4, -B + 4], [B - 4, -B + 4], [-B + 4, B - 4], [B - 4, B - 4]] as Plane[]).map((p) => { const [x, y] = place(p); return at([x, y, Z.deck]); }), size: 0.5, tone: 'mid' });

  // Deck items, each a small group, sorted by depth.
  const items: Item[] = [];
  const item = (center: Plane, z: number, parts: RigPart[]) => items.push({ key: depth(center, z), parts });

  // The gas bottle that feeds the pads, lying on two saddles along the back edge, with its valve and a small gauge.
  {
    const bx = -B + 6.4;
    const parts: RigPart[] = [];
    for (const v of [-18, 8]) parts.push({ kind: 'solid', paths: ext(boxRing(place, bx - 4.6, v - 2, bx + 4.6, v + 2, 0.6, 1), Z.deck, 3), tone: 'lo' });
    const axis: Point3 = [Math.cos(h + Math.PI / 2), Math.sin(h + Math.PI / 2), 0];
    const zc = Z.deck + 3 + 5.2;
    const from = (v: number): Point3 => {
      const [x, y] = place([bx, v]);
      return [x, y, zc];
    };
    const bottle = discAlong(from(-28), axis, 5.2, 44, P, 28, 0.3);
    const neck = discAlong(from(16), axis, 2.2, 4, P, 16);
    const valve = discAlong(from(20), axis, 3.2, 4, P, 20, 0.2);
    const towardUs = axis[0] * VIEW[0] + axis[1] * VIEW[1] > 0;
    const pieces: Array<[SolidPaths, Tone]> = [[bottle, 'hi'], [neck, 'mid'], [valve, 'mid']];
    for (const [paths, tone] of towardUs ? pieces : [...pieces].reverse()) parts.push({ kind: 'solid', paths, tone });
    const [gx, gy] = place([bx, 22]);
    parts.push({ kind: 'solid', paths: cyl(gx, gy, 2.2, zc + 3.2, 1.6, 20, 0.2), tone: 'lo' });
    parts.push({ kind: 'line', d: ring(gx, gy, 1.4, zc + 4.8, P, 16), tone: 'faint' });
    item(place([bx, -4]), zc, parts);
  }
  // The electronics box in the middle of the deck: radio and servo controller, vents as closed slots, an antenna.
  {
    const box = boxRing(place, 4, -10, 28, 10, 1.4, 2);
    const parts: RigPart[] = [{ kind: 'solid', paths: ext(box, Z.deck, 10, 0.5), tone: 'mid', inner: seam(ringSeam(box, Z.deck + 7.5, P)) }];
    const vents = [0, 1, 2, 3].map((k) => onTop(boxRing(place, 7 + k * 4.4, -7, 9 + k * 4.4, 3, 1, 2), Z.deck + 10, P, true)).join('');
    parts.push({ kind: 'line', d: vents, tone: 'lo' });
    const [ax, ay] = place([24, 6]);
    parts.push({ kind: 'solid', paths: cyl(ax, ay, 1.8, Z.deck + 10, 1.4, 16), tone: 'lo' });
    parts.push({ kind: 'solid', paths: cyl(ax, ay, 0.7, Z.deck + 11.4, 14, 10), tone: 'mid' });
    parts.push({ kind: 'dots', points: [at([ax, ay, Z.deck + 25.4])], size: 0.9, tone: 'mid' });
    item(place([16, 0]), Z.deck + 5, parts);
  }
  // The battery pack beside it, with its two terminals.
  {
    const pack = boxRing(place, -22, -9, 0, 9, 1.2, 2);
    const [t1x, t1y] = place([-17, -4]);
    const [t2x, t2y] = place([-17, 4]);
    item(place([-11, 0]), Z.deck + 4, [
      { kind: 'solid', paths: ext(pack, Z.deck, 7, 0.4), tone: 'mid', inner: seam(ringSeam(pack, Z.deck + 2, P)) },
      { kind: 'solid', paths: cyl(t1x, t1y, 1.3, Z.deck + 7, 1, 12), tone: 'lo' },
      { kind: 'solid', paths: cyl(t2x, t2y, 1.3, Z.deck + 7, 1, 12), tone: 'lo' },
    ]);
  }
  // The brick seats along both sides of the deck, each with two hold-down bolts; ballasted, a lead brick lies in each under a strap.
  for (const side of [-1, 1]) {
    const v = side * BRICK.offset * UNIT;
    const halfL = (BRICK.long * UNIT) / 2;
    const halfW = (BRICK.wide * UNIT) / 2 - 0.6;
    const parts: RigPart[] = [];
    const seat = boxRing(place, -halfL, v - halfW, halfL, v + halfW, 1, 2);
    const bolts = ([-halfL + 4, halfL - 4] as const).map((u) => place([u, v]));
    if (body.bricks) {
      const brickH = BRICK.high * UNIT;
      parts.push({ kind: 'solid', paths: ext(seat, Z.deck, brickH, 0.4), tone: 'mid', inner: seam(ringSeam(seat, Z.deck + brickH - 1.2, P)) });
      const strap = boxRing(place, -2.4, v - halfW - 1, 2.4, v + halfW + 1, 0.6, 1);
      parts.push({ kind: 'solid', paths: ext(strap, Z.deck + brickH, 0.9, 0.2), tone: 'lo' });
      parts.push({ kind: 'dots', points: [place([0, v - halfW + 1.5]), place([0, v + halfW - 1.5])].map(([x, y]) => at([x, y, Z.deck + brickH + 0.9])), size: 0.45, tone: 'mid' });
    } else {
      parts.push({ kind: 'line', d: onTop(seat, Z.deck, P, true), tone: 'faint' });
      parts.push({ kind: 'line', d: bolts.map(([x, y]) => ring(x, y, 1.6, Z.deck, P, 12)).join(''), tone: 'lo' });
      parts.push({ kind: 'dots', points: bolts.map(([x, y]) => at([x, y, Z.deck])), size: 0.45, tone: 'mid' });
    }
    item(place([0, v]), Z.deck + 4, parts);
  }
  // Clamped: two toe clamps hold the plate's back corners to the slab's inserts.
  if (body.id === 'clamped') {
    for (const v of [-B + 10, B - 10]) {
      const parts: RigPart[] = [];
      const step = boxRing(place, -B - 16, v - 4, -B - 8, v + 4, 0.8, 1);
      parts.push({ kind: 'solid', paths: ext(step, 0, Z.deck + 1, 0.3), tone: 'lo' });
      const strap = boxRing(place, -B - 15, v - 3, -B + 6, v + 3, 1, 2);
      parts.push({ kind: 'solid', paths: ext(strap, Z.deck + 1, 2.2, 0.3), tone: 'mid' });
      const [nx, ny] = place([-B - 4, v]);
      parts.push({ kind: 'solid', paths: cyl(nx, ny, 2.6, Z.deck + 3.2, 2, 6, 0.2), tone: 'mid' });
      item(place([-B - 4, v]), Z.deck, parts);
    }
  }
  items.sort((a, b) => a.key - b.key);
  for (const it of items) list.push(...it.parts);
  return list;
}

/** The shoulder, the two links, the elbow and the hand (the lit part), for a pose, in painter's order. */
function armParts(pose: Pose): RigPart[] {
  const place = placer(pose);
  const list: RigPart[] = [];
  const put = (paths: SolidPaths, tone: Tone = 'hi', extra: { lit?: boolean; inner?: string } = {}) => list.push({ kind: 'solid', paths, tone, ...extra });
  const J1 = toWorld(pose.j1);
  const J2 = toWorld(pose.j2);
  const TIP = toWorld(pose.tip);
  const B = BODY_HALF;
  const j1Body = LAB.body.shoulder * UNIT;

  // The shoulder bracket from the deck's edge out to the joint, and the motor standing on it.
  put(extrude(boxRing(place, B - 6, -8, j1Body + 8, 8, 2, 3), Z.deck, Z.bracket - Z.deck, P, { bevel: 0.4 }), 'mid');
  list.push({ kind: 'dots', points: ([[B - 2.5, -5], [B - 2.5, 5]] as Plane[]).map((p) => { const [x, y] = place(p); return at([x, y, Z.bracket]); }), size: 0.45, tone: 'mid' });
  put(cyl(J1[0], J1[1], 7.5, Z.bracket, Z.link1[0] - Z.bracket - 3, 32, 0.3), 'mid', { inner: seam(sideArc(J1[0], J1[1], 7.5, Z.bracket + 6, P, 24)) });
  put(cyl(J1[0], J1[1], 5.6, Z.link1[0] - 3, 3, 28, 0.3), 'mid');

  // The elbow motor hangs under link 1's end; link 2 runs under it.
  const u2: Plane = [TIP[0] - J2[0], TIP[1] - J2[1]];
  const l2 = Math.hypot(u2[0], u2[1]);
  const d2: Plane = [u2[0] / l2, u2[1] / l2];
  const along = (p: Plane, t: number, side = 0): Plane => [p[0] + d2[0] * t - d2[1] * side, p[1] + d2[1] * t + d2[0] * side];
  const wristEnd = along(TIP, -4.5);
  // Link 2, from the elbow to the wrist block, with its lightening slot.
  const link2 = stadium(J2, along(TIP, -15.5 - 4.4), 4.4, 8);
  const link2Parts: RigPart[] = [
    { kind: 'solid', paths: extrude(link2, Z.link2[0], Z.link2[1] - Z.link2[0], P, { bevel: 0.3 }), tone: 'hi' },
    { kind: 'line', d: onTop(stadium(along(J2, 14), along(TIP, -30), 1.5, 6), Z.link2[1], P, true), tone: 'faint' },
  ];
  // The hand: the wrist block (lit) and two fingers either side of the grasp point.
  const block = [along(TIP, -15.5, -7), along(TIP, -4.5, -7), along(TIP, -4.5, 7), along(TIP, -15.5, 7)];
  const wrist: RigPart = { kind: 'solid', paths: extrude(block, Z.wrist[0], Z.wrist[1] - Z.wrist[0], P, { bevel: 0.4 }), tone: 'hi', lit: true };
  const fingers: RigPart[] = [-5, 5].map((side) => ({
    kind: 'solid',
    paths: extrude([along(wristEnd, 0, side - 1), along(wristEnd, 9.5, side - 1), along(wristEnd, 9.5, side + 1), along(wristEnd, 0, side + 1)], Z.finger[0], Z.finger[1] - Z.finger[0], P),
    tone: 'mid',
  }));
  const fingersAway = d2[0] * VIEW[0] + d2[1] * VIEW[1] < 0;
  const sideOrder = (parts: RigPart[], sides: number[]) => {
    // The finger nearer the viewer is drawn last.
    const k0 = depth(along(wristEnd, 4, sides[0]!));
    const k1 = depth(along(wristEnd, 4, sides[1]!));
    return k0 < k1 ? parts : [parts[1]!, parts[0]!];
  };
  const orderedFingers = sideOrder(fingers, [-5, 5]);
  const elbowMotor: RigPart[] = [
    { kind: 'solid', paths: cyl(J2[0], J2[1], 6.6, Z.elbow[0], Z.elbow[1] - Z.elbow[0], 32, 0.3), tone: 'mid', inner: seam(sideArc(J2[0], J2[1], 6.6, Z.elbow[1] - 4, P, 24)) },
  ];

  // Link 1 from the shoulder to the elbow, on top of both motors, with its slot and its caps.
  const link1Parts: RigPart[] = [
    { kind: 'solid', paths: extrude(stadium(J1, J2, 5.4, 8), Z.link1[0], Z.link1[1] - Z.link1[0], P, { bevel: 0.4 }), tone: 'hi' },
    { kind: 'line', d: onTop(stadium(lerp(J1, J2, 0.24), lerp(J1, J2, 0.76), 1.8, 6), Z.link1[1], P, true), tone: 'faint' },
    { kind: 'solid', paths: cyl(J1[0], J1[1], 3.6, Z.link1[1], 1.6, 20, 0.2), tone: 'mid' },
    { kind: 'solid', paths: cyl(J2[0], J2[1], 3.6, Z.link1[1], 1.6, 20, 0.2), tone: 'mid' },
    { kind: 'dots', points: [at([J1[0], J1[1], Z.link1[1] + 1.6]), at([J2[0], J2[1], Z.link1[1] + 1.6])], size: 0.5, tone: 'hi' },
  ];

  // Order the lower arm: whatever is farther from the viewer goes first.
  const lower: Item[] = [
    { key: depth(lerp(J2, wristEnd, 0.5), Z.link2[0]), parts: link2Parts },
    { key: depth(J2, Z.elbow[0]) + 0.01, parts: elbowMotor },
  ];
  lower.sort((a, b) => a.key - b.key);
  const hand = fingersAway ? [...orderedFingers, wrist] : [wrist, ...orderedFingers];
  // Link 1 lies on top of the elbow motor; link 2 and the hand lie lower, beyond it.
  const towardUs = d2[0] * VIEW[0] + d2[1] * VIEW[1] > 0;
  if (towardUs) {
    for (const it of lower) list.push(...it.parts);
    list.push(...link1Parts);
    list.push(...hand);
  } else {
    list.push(...hand);
    for (const it of lower) list.push(...it.parts);
    list.push(...link1Parts);
  }
  return list;
}

const lerp = (a: Plane, b: Plane, t: number): Plane => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** The moving rig for a pose: body, arm and the grapple fixture, in painter's order. */
export function rigParts(id: BodyId, s: number): RigPart[] {
  const pose = poseAt(id, s);
  const body = bodyOf(id);
  const tip = toWorld(pose.tip);
  const grappleFirst = depth(GRAPPLE, Z.knob[1]) < depth(tip, Z.wrist[1]);
  const rig = [...bodyParts(pose, body), ...armParts(pose)];
  return grappleFirst ? [...GRAPPLE_PARTS, ...rig] : [...rig, ...GRAPPLE_PARTS];
}

/** The hand's grasp point on screen, for tests and the drag. */
export const handOnScreen = (id: BodyId, s: number): Flat => {
  const [x, y] = toWorld(poseAt(id, s).tip);
  return at([x, y, Z.finger[1]]);
};
export const GRAPPLE_ON_SCREEN: Flat = at([GRAPPLE[0], GRAPPLE[1], Z.knob[1]]);
