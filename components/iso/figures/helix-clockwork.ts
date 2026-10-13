/**
 * The two-rate clockwork for HelixClockwork, drawn with the isometric kit.
 *
 * The object is the explanation. In Figure's Helix 02, S1 turns what the
 * robot sees into joint targets 200 times a second, and S0, the
 * whole-body controller, acts 1,000 times a second: five control steps for
 * every joint target. A clock movement does the same with two wheels. The
 * balance and pallet fork let the escape wheel (S0) advance one tooth per
 * control step; four pins on its arbor trip a bell-crank lever once every
 * fifth step, and the lever's pawl jumps a four-point star wheel (S1) one
 * point: a new joint target. Each arbor carries a hand over its own chapter
 * ring, so the S0 hand ticks five times for every jump of the S1 hand, the
 * one lit part. A mainspring barrel and a third wheel drive the train.
 *
 * World units are about a quarter of a millimetre of a real movement: x
 * along the plate, y toward the viewer, z up. Every static path is built
 * once here; the wheels, hands, lever, fork, balance and hairspring are
 * rebuilt for a moment `ms` by `movingAt`, which is cheap.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  onTop,
  planOutline,
  ring,
  roundedPlan,
  sideArc,
  sideSeam,
  slabOf,
  topMatrix,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { getSystem } from '../../../lib/hierarchy-timescales.ts';

export const WIDTH = 600;
export const AZIMUTH = 56;
export const ELEVATION = 40;

// ------------------------------------------------------------------ the model
/** Helix 02: S1 sets full-body joint targets 200 times a second, S0 controls 1,000 times a second (lib/hierarchy-timescales.ts, Figure's announcement). */
const HELIX = getSystem('helix-02');
const periodOf = (id: string) => {
  const lane = HELIX.lanes.find((candidate) => candidate.id === id);
  if (!lane || lane.periodMs === null || !lane.disclosed) throw new Error(`helix-02: no disclosed period for ${id}`);
  return lane.periodMs;
};
export const S1_HZ = 1000 / periodOf('s1');
export const S0_HZ = 1000 / periodOf('s0');
/** Control steps per joint target. */
export const STEPS_PER_TARGET = S0_HZ / S1_HZ;
/** The clock shows 20 milliseconds: four joint targets, twenty control steps. */
export const SPAN_MS = 20;

/** Whole control steps taken by `ms` milliseconds (the first one lands at 1 ms). */
export const controlSteps = (ms: number) => Math.floor(ms * (S0_HZ / 1000) + 1e-9);
/** Whole new joint targets set by `ms` milliseconds (the first new one lands at 5 ms). */
export const jointTargets = (ms: number) => Math.floor(ms * (S1_HZ / 1000) + 1e-9);

/** How a tick eases: a wheel rests, then jumps over the last 18% of a step, landing exactly as the step is counted. */
const JUMP = 0.18;
const landing = (fraction: number, share: number) => {
  const x = Math.min(Math.max((fraction - (1 - share)) / share, 0), 1);
  return x * x * (3 - 2 * x);
};
/** The escape wheel's turn in teeth: one tooth per control step, the jump ending as the step lands. */
export const escapeSteps = (ms: number) => {
  const steps = ms * (S0_HZ / 1000);
  const whole = Math.floor(steps + 1e-9);
  return whole + landing(steps - whole, JUMP);
};
/** The star wheel's turn in points: one per joint target, its jump made during the escape wheel's fifth tooth. */
export const starSteps = (ms: number) => {
  const targets = ms * (S1_HZ / 1000);
  const whole = Math.floor(targets + 1e-9);
  return whole + landing(targets - whole, JUMP / STEPS_PER_TARGET);
};

// ----------------------------------------------------------------- the layout
const PLATE: Plan = { x: -100, y: -66, w: 208, d: 110, r: 14 };
const PLATE_Z = 18;
const PLATE_H = 6;
const TOP = PLATE_Z + PLATE_H;

/** The arbors. */
const BARREL = { x: -40, y: -36, r: 26 };
const THIRD = { x: -6, y: -30, r: 17 };
export const ESCAPE = { x: 18, y: -10, r: 23, teeth: 20 };
const FORK = { x: 48, y: 6 };
const BALANCE = { x: 74.5, y: 20, r: 20 };
export const STAR = { x: -56, y: 15, r: 13, points: 4 };
const LEVER = { x: -20, y: 12 };
const JUMPER = { x: -88, y: 34 };

/** The heights of the moving layers. */
const Z = {
  third: TOP + 3,
  escape: TOP + 8,
  pins: TOP + 11,
  lever: TOP + 12,
  star: TOP + 9,
  balance: TOP + 7,
  cock: TOP + 14,
  s0Ring: TOP + 19,
  s1Ring: TOP + 16,
};
export const S0_RING = { inner: 33, outer: 43 };
export const S1_RING = { inner: 20, outer: 30 };

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
// The plate's true rounded outline, top and bottom, so the fit hugs what is drawn.
for (const [px, py] of roundedPlan(PLATE, 10)) extremes.push([px, py, 0], [px, py, TOP]);
extremes.push([BARREL.x, BARREL.y - BARREL.r, TOP + 17], [ESCAPE.x, ESCAPE.y - S0_RING.outer, Z.s0Ring + 1.4], [BALANCE.x + BALANCE.r, BALANCE.y, Z.cock + 4]);
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unit));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 8;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

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
const polar = (cx: number, cy: number, r: number, angle: number): Plane => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

// ------------------------------------------------------------------- parts
export type Slot = 'third' | 'escape' | 'pins' | 'lever' | 'star' | 'jumper' | 'fork' | 'balance' | 's0-hand' | 's1-hand';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3; evenodd?: boolean }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
let into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => into.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill'], evenodd = false) => into.push({ kind: 'face', d, fill, evenodd });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
function screw(x: number, y: number, z: number, r = 1.7) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
/** A jewel: a ring with its hole. */
function jewel(x: number, y: number, z: number, r = 2.2) {
  line(ring(x, y, r, z, P, 16), 'mid');
  dots([at([x, y, z])], 0.6, 'hi');
}

/** A toothed wheel's outline: `teeth` teeth between `root` and `tip`; `ratchet` slants them like an escape wheel's. */
export function toothRing(cx: number, cy: number, root: number, tip: number, teeth: number, turn: number, ratchet = false): Plane[] {
  const points: Plane[] = [];
  for (let k = 0; k < teeth; k++) {
    const a = turn + (k / teeth) * Math.PI * 2;
    const pitch = (Math.PI * 2) / teeth;
    if (ratchet) {
      points.push(polar(cx, cy, root, a), polar(cx, cy, tip, a + pitch * 0.62), polar(cx, cy, tip - 0.8, a + pitch * 0.74), polar(cx, cy, root, a + pitch * 0.8));
    } else {
      points.push(polar(cx, cy, root, a), polar(cx, cy, tip, a + pitch * 0.2), polar(cx, cy, tip, a + pitch * 0.45), polar(cx, cy, root, a + pitch * 0.65));
    }
  }
  return points;
}
/** Spoke windows on a wheel's top: `count` closed annular windows between r0 and r1. */
function spokeWindows(cx: number, cy: number, r0: number, r1: number, count: number, turn: number, z: number, web = 0.42) {
  const paths: string[] = [];
  for (let k = 0; k < count; k++) {
    const a0 = turn + (k / count) * Math.PI * 2 + web / 2;
    const a1 = turn + ((k + 1) / count) * Math.PI * 2 - web / 2;
    const points: Plane[] = [];
    for (let s = 0; s <= 10; s++) points.push(polar(cx, cy, r1, a0 + ((a1 - a0) * s) / 10));
    for (let s = 10; s >= 0; s--) points.push(polar(cx, cy, r0, a0 + ((a1 - a0) * s) / 10));
    paths.push(onTop(points, z, P, true));
  }
  return paths.join('');
}
/** An ellipse path on a top face. */
const ellipseAt = (cx: number, cy: number, r: number, z: number, steps = 48) => ring(cx, cy, r, z, P, steps);
/** A raised chapter ring: a thin annulus, its top drawn with a hole you see through. */
function chapterRing(cx: number, cy: number, inner: number, outer: number, z: number, count: number, every: number) {
  // Only the band's visible side and the annulus top are filled, so the wheel below shows through the hole.
  const band = cyl(cx, cy, outer, z, 1.4, 56);
  into.push({ kind: 'solid', paths: { ...band, fill: '', top: '', crease: '' }, tone: 'mid' });
  face(ellipseAt(cx, cy, outer, z + 1.4, 64) + ellipseAt(cx, cy, inner, z + 1.4, 64), 'top', true);
  line(ellipseAt(cx, cy, inner, z + 1.4, 64), 'lo');
  line(ellipseAt(cx, cy, outer - 1.2, z + 1.4, 64), 'faint');
  // Ticks hang inward from the printed circle just inside the outer edge.
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; k < count; k++) {
    const a = -Math.PI / 2 + (k / count) * Math.PI * 2;
    const big = k % every === 0;
    // Minor ticks hang from the printed circle; a major runs the ring's width, from the inner edge to that circle.
    const r1 = outer - 1.2;
    const r0 = big ? inner : r1 - 2.4;
    (big ? major : minor).push(lineOnTop(polar(cx, cy, r0, a), polar(cx, cy, r1, a), z + 1.4, P));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'hi');
}

// ------------------------------------------------------------------ the feet
// The movement stands on four turned feet under the plate's corners.
for (const [x, y] of byDepth(corners(PLATE, 12))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.4, 2, PLATE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.4, PLATE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, PLATE_Z - 2, 2, 26, 0.3), 'lo');
}

// ------------------------------------------------------------ the movement plate
solid(slab(PLATE, PLATE_Z, PLATE_H, 10, 1.2), 'mid', { inner: sideSeam(PLATE, PLATE_Z + 2.4, P, 10) });
line(planOutline(insetPlan(PLATE, 4), TOP, P, 10), 'faint');
for (const [x, y] of corners(PLATE, 10)) screw(x, y, TOP, 2.1);
// The maker's plate engraved on the movement plate's front; its rule lines stand for print.
const LABEL: Plan = { x: 6, y: 31, w: 44, d: 10, r: 1.6 };
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.8], [1, 0.55]] as const) {
  const y = LABEL.y + 3.4 + k * 3.2;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 14) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');
// Each arbor's lower jewel, set in the plate.
for (const [x, y] of [[THIRD.x, THIRD.y], [ESCAPE.x, ESCAPE.y], [FORK.x, FORK.y], [BALANCE.x, BALANCE.y], [STAR.x, STAR.y], [LEVER.x, LEVER.y]] as Plane[]) jewel(x, y, TOP, 2.4);

// ------------------------------------------------------------- the mainspring barrel
solid(extrude(toothRing(BARREL.x, BARREL.y, BARREL.r - 2.4, BARREL.r, 60, 0.03), TOP, 3, P, { convex: false }), 'mid');
solid(cyl(BARREL.x, BARREL.y, BARREL.r - 3, TOP + 3, 9, 56), 'mid', { inner: sideArc(BARREL.x, BARREL.y, BARREL.r - 3, TOP + 7.5, P, 32) });
line(ellipseAt(BARREL.x, BARREL.y, BARREL.r - 6, TOP + 12, 56), 'faint');
// The ratchet wheel on the barrel arbor, its click and the click spring.
solid(extrude(toothRing(BARREL.x, BARREL.y, 13, 15.5, 28, 0.1, true), TOP + 12, 2.2, P, { convex: false }), 'hi');
solid(slab({ x: BARREL.x - 3, y: BARREL.y - 3, w: 6, d: 6, r: 0.6 }, TOP + 14.2, 2.4, 2), 'mid');
screw(BARREL.x, BARREL.y, TOP + 16.6, 1.5);
{
  // The click: a pawl pivoted on a screw, its nose in the ratchet's teeth.
  const pivot = polar(BARREL.x, BARREL.y, 24, -0.55);
  const nose = polar(BARREL.x, BARREL.y, 14.6, -0.35);
  const dx = nose[0] - pivot[0];
  const dy = nose[1] - pivot[1];
  const l = Math.hypot(dx, dy);
  const [nx, ny] = [-dy / l, dx / l];
  solid(extrude([[pivot[0] + nx * 2.6, pivot[1] + ny * 2.6], [nose[0] + nx * 0.8, nose[1] + ny * 0.8], nose, [pivot[0] - nx * 2.6, pivot[1] - ny * 2.6]], TOP + 12, 2, P, { bevel: 0.3 }), 'mid');
  screw(pivot[0], pivot[1], TOP + 14, 1.5);
}

// --------------------------------------------------- the third wheel and the escapement
slot('third');
slot('escape');
slot('pins');
slot('fork');
slot('balance');
// The balance cock: a long bridge from its foot at the back to the balance's arbor, with the regulator.
{
  const foot: Plane = [BALANCE.x + 4, BALANCE.y - 46];
  solid(slab({ x: foot[0] - 8, y: foot[1] - 6, w: 16, d: 12, r: 2.4 }, TOP, Z.cock - TOP, 3, 0.4), 'mid', { inner: sideSeam({ x: foot[0] - 8, y: foot[1] - 6, w: 16, d: 12, r: 2.4 }, TOP + 4, P, 3) });
  const outline: Plane[] = [];
  for (let k = 0; k <= 16; k++) outline.push(polar(BALANCE.x, BALANCE.y, 7, Math.PI * 0.15 + (k / 16) * Math.PI * 1.25));
  outline.push([foot[0] - 6.5, foot[1] + 2], [foot[0] + 6.5, foot[1] + 2]);
  solid(extrude(outline, Z.cock, 3, P, { bevel: 0.4 }), 'mid');
  screw(foot[0], foot[1], Z.cock + 3, 1.9);
  jewel(BALANCE.x, BALANCE.y, Z.cock + 3, 2.4);
  // The regulator: an index arm over a short engraved sector on the cock, its ticks rising from the sector's inner edge.
  const sector: Plane[] = [];
  for (let k = 0; k <= 8; k++) sector.push(polar(BALANCE.x, BALANCE.y, 10.6, -Math.PI / 2 - 0.36 + (k / 8) * 0.72));
  for (let k = 8; k >= 0; k--) sector.push(polar(BALANCE.x, BALANCE.y, 13.4, -Math.PI / 2 - 0.36 + (k / 8) * 0.72));
  line(onTop(sector, Z.cock + 3, P, true), 'lo');
  const ticks: string[] = [];
  for (let k = 1; k <= 3; k++) {
    const a = -Math.PI / 2 - 0.36 + (k / 4) * 0.72;
    ticks.push(lineOnTop(polar(BALANCE.x, BALANCE.y, 10.6, a), polar(BALANCE.x, BALANCE.y, k === 2 ? 13.4 : 12.2, a), Z.cock + 3, P));
  }
  line(ticks.join(''), 'lo');
  solid(extrude([polar(BALANCE.x, BALANCE.y, 3.2, -Math.PI / 2 + 0.5), polar(BALANCE.x, BALANCE.y, 12.6, -Math.PI / 2 - 0.04), polar(BALANCE.x, BALANCE.y, 12.6, -Math.PI / 2 + 0.04), polar(BALANCE.x, BALANCE.y, 3.2, -Math.PI / 2 - 0.5)], Z.cock + 3, 0.8, P), 'hi');
}

// ------------------------------------------------------ the target train (S1)
slot('star');
slot('jumper');
slot('lever');
// The star's cock and the lever's pivot screw.
{
  const foot: Plane = [STAR.x - 30, STAR.y - 4];
  solid(slab({ x: foot[0] - 5, y: foot[1] - 5, w: 10, d: 10, r: 2 }, TOP, Z.star + 3 - TOP, 3, 0.4), 'mid');
  const outline: Plane[] = [];
  for (let k = 0; k <= 12; k++) outline.push(polar(STAR.x, STAR.y, 4.4, Math.PI * 0.55 + (k / 12) * Math.PI * 0.9));
  outline.push([foot[0] + 3, foot[1] + 4.4], [foot[0] + 3, foot[1] - 4.4]);
  solid(extrude(outline, Z.star + 3, 2.4, P, { bevel: 0.3 }), 'mid');
  screw(foot[0], foot[1], Z.star + 5.4, 1.5);
}

// ------------------------------------------------------- the chapter rings and hands
// Each chapter ring stands on three posts round its arbor; the hand rides above it.
for (const [cx, cy, r, z] of [[STAR.x, STAR.y, S1_RING.outer - 2, Z.s1Ring], [ESCAPE.x, ESCAPE.y, S0_RING.outer - 2, Z.s0Ring]] as const) {
  const posts = [0.75, 2.9, 4.6].map((a) => polar(cx, cy, r, a));
  for (const [px, py] of byDepth(posts)) solid(cyl(px, py, 1.6, TOP, z - TOP, 14), 'lo');
}
chapterRing(STAR.x, STAR.y, S1_RING.inner, S1_RING.outer, Z.s1Ring, 4, 1);
slot('s1-hand');
chapterRing(ESCAPE.x, ESCAPE.y, S0_RING.inner, S0_RING.outer, Z.s0Ring, 20, 5);
slot('s0-hand');

// ---------------------------------------------------------- the moving parts
/** A hand: a slim pointer from a hub, with a short counterweight tail, lying on a top face. Drawn flat in its plane. */
function handPath(length: number, tail: number, width: number) {
  return `M${-width / 2} ${tail}L${-width * 0.32} ${-length * 0.92}L0 ${-length}L${width * 0.32} ${-length * 0.92}L${width / 2} ${tail}Z`;
}
export const S0_HAND = { matrix: topMatrix([ESCAPE.x, ESCAPE.y], Z.s0Ring + 3, P), d: handPath(S0_RING.outer - 1.4, 6, 2.2), hub: `M-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0Z` };
export const S1_HAND = { matrix: topMatrix([STAR.x, STAR.y], Z.s1Ring + 3, P), d: handPath(S1_RING.outer - 1.4, 5, 4.2), hub: `M-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z` };
/** The hands' angles in degrees (0 points along -y, the back of the plate, clockwise seen from above). */
export const s0HandDegrees = (ms: number) => (escapeSteps(ms) / ESCAPE.teeth) * 360;
export const s1HandDegrees = (ms: number) => (starSteps(ms) / STAR.points) * 360;
/** The arbor posts the hands sit on (static: they turn about their own axis). */
export const HAND_POSTS: Part[] = [];
into = HAND_POSTS;
solid(cyl(ESCAPE.x, ESCAPE.y, 1.6, Z.pins + 1.4, Z.s0Ring + 3 - (Z.pins + 1.4), 14), 'mid');
solid(cyl(STAR.x, STAR.y, 1.6, Z.star + 5.4, Z.s1Ring + 3 - (Z.star + 5.4), 14), 'mid');
into = PARTS;

/**
 * Every moving part at `ms` milliseconds, by slot, built fresh. The wheels
 * turn on their arbors; the fork rocks once per step; the balance swings a
 * full beat each two steps; the lever kicks as each of the four pins passes.
 */
export function movingAt(ms: number): Record<Slot, Part[]> {
  const out = {} as Record<Slot, Part[]>;
  const list = (name: Slot): Part[] => (out[name] = []);
  const steps = escapeSteps(ms);
  const escapeTurn = (steps / ESCAPE.teeth) * Math.PI * 2;
  // The third wheel turns the other way, slower by its tooth ratio (24 to its pinion's 8).
  {
    const parts = list('third');
    const turn = -escapeTurn * (8 / 24);
    parts.push({ kind: 'solid', paths: extrude(toothRing(THIRD.x, THIRD.y, THIRD.r - 2, THIRD.r, 48, turn), Z.third, 2, P, { convex: false }), tone: 'mid' });
    parts.push({ kind: 'line', d: spokeWindows(THIRD.x, THIRD.y, 6, THIRD.r - 5, 4, turn, Z.third + 2), tone: 'lo' });
    parts.push({ kind: 'solid', paths: cyl(THIRD.x, THIRD.y, 3.4, Z.third + 2, 1.6, 18), tone: 'lo' });
  }
  // The escape wheel: 20 slanted teeth, four spokes, its pinion meshing the third wheel below.
  {
    const parts = list('escape');
    parts.push({ kind: 'solid', paths: cyl(ESCAPE.x, ESCAPE.y, 4.4, TOP, Z.escape - TOP, 18), tone: 'mid', inner: knurl(ESCAPE.x, ESCAPE.y, 4.4, TOP, Z.escape, 12, P, 0.1) });
    parts.push({ kind: 'solid', paths: extrude(toothRing(ESCAPE.x, ESCAPE.y, ESCAPE.r - 3.4, ESCAPE.r, ESCAPE.teeth, escapeTurn, true), Z.escape, 1.6, P, { convex: false }), tone: 'hi' });
    parts.push({ kind: 'line', d: spokeWindows(ESCAPE.x, ESCAPE.y, 5, ESCAPE.r - 6.2, 4, escapeTurn + 0.3, Z.escape + 1.6, 0.5), tone: 'lo' });
  }
  // The pin disc on the escape arbor: four pins, one per five teeth.
  {
    const parts = list('pins');
    parts.push({ kind: 'solid', paths: cyl(ESCAPE.x, ESCAPE.y, 14, Z.pins, 1.4, 40), tone: 'mid' });
    parts.push({ kind: 'line', d: spokeWindows(ESCAPE.x, ESCAPE.y, 4.5, 10.5, 4, escapeTurn + 0.95, Z.pins + 1.4, 0.6), tone: 'lo' });
    for (let k = 0; k < 4; k++) {
      const [px, py] = polar(ESCAPE.x, ESCAPE.y, 12.4, escapeTurn + (k / 4) * Math.PI * 2 + 0.2);
      parts.push({ kind: 'solid', paths: cyl(px, py, 1.1, Z.pins + 1.4, 2.6, 12), tone: 'hi' });
    }
  }
  // The pallet fork: it rocks to the other side on each step.
  {
    const parts = list('fork');
    // The fork swings from one banking pin to the other with each tooth.
    const rockNow = 0.13 * Math.cos(Math.PI * steps);
    const toEscape = Math.atan2(ESCAPE.y - FORK.y, ESCAPE.x - FORK.x) + rockNow;
    const toBalance = Math.atan2(BALANCE.y - FORK.y, BALANCE.x - FORK.x) + rockNow;
    const arm = (a: number, length: number, width: number): Plane[] => {
      const [ex, ey] = polar(FORK.x, FORK.y, length, a);
      const [nx, ny] = [-Math.sin(a) * width, Math.cos(a) * width];
      return [[FORK.x + nx, FORK.y + ny], [ex + nx * 0.7, ey + ny * 0.7], [ex - nx * 0.7, ey - ny * 0.7], [FORK.x - nx, FORK.y - ny]];
    };
    parts.push({ kind: 'solid', paths: extrude(arm(toBalance, 30 - BALANCE.r * 0.5 + 6, 1.4), Z.escape + 0.2, 1.4, P, { bevel: 0.2 }), tone: 'mid' });
    // The anchor: two arms reaching over the escape wheel's rim, each ending in a pallet stone.
    for (const off of [-0.42, 0.42]) {
      parts.push({ kind: 'solid', paths: extrude(arm(toEscape + off, 15.5, 1.3), Z.escape + 0.2, 1.4, P, { bevel: 0.2 }), tone: 'mid' });
      const [sx, sy] = polar(FORK.x, FORK.y, 15.5, toEscape + off);
      parts.push({ kind: 'solid', paths: cyl(sx, sy, 1.3, Z.escape - 0.6, 2.2, 12), tone: 'hi' });
    }
    parts.push({ kind: 'solid', paths: cyl(FORK.x, FORK.y, 2.6, Z.escape + 0.2, 2, 18, 0.3), tone: 'lo' });
  }
  // The balance: a rim with timing screws on two arms; it swings a beat each two steps. The hairspring breathes with it.
  {
    const parts = list('balance');
    const swing = 1.9 * Math.sin(Math.PI * ms * (S0_HZ / 1000));
    parts.push({ kind: 'solid', paths: cyl(BALANCE.x, BALANCE.y, BALANCE.r, Z.balance, 2.6, 64), tone: 'hi', inner: sideArc(BALANCE.x, BALANCE.y, BALANCE.r, Z.balance + 1.3, P, 40) });
    parts.push({ kind: 'face', d: ellipseAt(BALANCE.x, BALANCE.y, BALANCE.r - 2.6, Z.balance + 2.6, 64), fill: 'top' });
    parts.push({ kind: 'line', d: ellipseAt(BALANCE.x, BALANCE.y, BALANCE.r - 2.6, Z.balance + 2.6, 64), tone: 'lo' });
    for (const off of [0, Math.PI]) {
      const a = swing + off;
      const [ex, ey] = polar(BALANCE.x, BALANCE.y, BALANCE.r - 2, a);
      const [nx, ny] = [-Math.sin(a) * 1.3, Math.cos(a) * 1.3];
      parts.push({ kind: 'solid', paths: extrude([[BALANCE.x + nx, BALANCE.y + ny], [ex + nx, ey + ny], [ex - nx, ey - ny], [BALANCE.x - nx, BALANCE.y - ny]], Z.balance + 0.6, 1.6, P), tone: 'hi' });
    }
    const screws: Flat[] = [];
    for (let k = 0; k < 12; k++) screws.push(at([...polar(BALANCE.x, BALANCE.y, BALANCE.r - 1.3, swing + (k / 12) * Math.PI * 2 + 0.13), Z.balance + 2.6] as Point3));
    parts.push({ kind: 'dots', points: screws, size: 0.75, tone: 'mid' });
    // The hairspring: a flat spiral from the collet to its stud, opening and closing with the swing.
    const spiral: Plane[] = [];
    const turns = 5.5;
    for (let s = 0; s <= 220; s++) {
      const u = s / 220;
      const a = u * turns * Math.PI * 2 + swing * (1 - u);
      spiral.push(polar(BALANCE.x, BALANCE.y, 3.4 + u * 12.4, a));
    }
    parts.push({ kind: 'solid', paths: cyl(BALANCE.x, BALANCE.y, 3.2, Z.balance + 2.6, 1.6, 16), tone: 'mid' });
    parts.push({ kind: 'line', d: onTop(spiral, Z.balance + 4, P), tone: 'mid' });
    const end = spiral[spiral.length - 1];
    parts.push({ kind: 'solid', paths: cyl(end[0], end[1], 1.5, Z.balance + 3.2, Z.cock - Z.balance - 3.2, 12), tone: 'lo' });
  }
  // The star wheel (S1): four points, held by the jumper, one point per kick of the lever.
  const starTurn = (starSteps(ms) / STAR.points) * Math.PI * 2;
  {
    const parts = list('star');
    const star: Plane[] = [];
    for (let k = 0; k < STAR.points; k++) {
      const a = starTurn + (k / STAR.points) * Math.PI * 2 - Math.PI / 2;
      star.push(polar(STAR.x, STAR.y, 4.4, a - Math.PI / 4), polar(STAR.x, STAR.y, STAR.r, a - 0.16), polar(STAR.x, STAR.y, STAR.r, a + 0.16));
    }
    parts.push({ kind: 'solid', paths: extrude(star, Z.star, 2, P, { convex: false }), tone: 'hi' });
    parts.push({ kind: 'solid', paths: cyl(STAR.x, STAR.y, 3, Z.star + 2, 1.2, 16), tone: 'mid' });
  }
  // The jumper: a spring lever pivoted at the side, its roller sitting between two of the star's points.
  {
    const parts = list('jumper');
    const kick = Math.sin(Math.PI * (starSteps(ms) % 1)) * 0.08;
    const toward = Math.atan2(STAR.y - JUMPER.y, STAR.x - JUMPER.x) + kick;
    const reach = Math.hypot(STAR.x - JUMPER.x, STAR.y - JUMPER.y) - 7.2;
    const [ex, ey] = polar(JUMPER.x, JUMPER.y, reach, toward);
    const [nx, ny] = [-Math.sin(toward) * 1.2, Math.cos(toward) * 1.2];
    parts.push({ kind: 'solid', paths: extrude([[JUMPER.x + nx * 1.6, JUMPER.y + ny * 1.6], [ex + nx, ey + ny], [ex - nx, ey - ny], [JUMPER.x - nx * 1.6, JUMPER.y - ny * 1.6]], Z.star, 1.6, P), tone: 'mid' });
    parts.push({ kind: 'solid', paths: cyl(ex, ey, 2.4, Z.star - 0.2, 2, 16), tone: 'hi' });
    parts.push({ kind: 'solid', paths: cyl(JUMPER.x, JUMPER.y, 3, TOP, Z.star + 1.6 - TOP, 18, 0.3), tone: 'mid' });
    out.jumper.push({ kind: 'line', d: ring(JUMPER.x, JUMPER.y, 1.6, Z.star + 1.6, P, 12), tone: 'lo' });
  }
  // The lever: a bell crank on its pivot; a pin on the escape arbor nudges its tail every fifth step and its pawl kicks the star.
  {
    const parts = list('lever');
    // The pin meets the lever's tail during the fifth step of each target and lets it go as the star lands.
    const phase = (ms * (S1_HZ / 1000)) % 1;
    const lead = 1 / STEPS_PER_TARGET;
    const kick = phase > 1 - lead ? Math.sin(((phase - (1 - lead)) / lead) * Math.PI) : 0;
    const swing = 0.16 * (ms > 0.01 ? kick : 0);
    const tailTo = Math.atan2(ESCAPE.y - LEVER.y, ESCAPE.x - LEVER.x) + swing;
    const pawlTo = Math.atan2(STAR.y - LEVER.y, STAR.x - LEVER.x) + swing;
    const tailLength = Math.hypot(ESCAPE.x - LEVER.x, ESCAPE.y - LEVER.y) - 15.2;
    const pawlLength = Math.hypot(STAR.x - LEVER.x, STAR.y - LEVER.y) - STAR.r - 1.2;
    const armOf = (a: number, length: number, w0: number, w1: number): Plane[] => {
      const [ex, ey] = polar(LEVER.x, LEVER.y, length, a);
      const [nx, ny] = [-Math.sin(a), Math.cos(a)];
      return [[LEVER.x + nx * w0, LEVER.y + ny * w0], [ex + nx * w1, ey + ny * w1], [ex - nx * w1, ey - ny * w1], [LEVER.x - nx * w0, LEVER.y - ny * w0]];
    };
    parts.push({ kind: 'solid', paths: extrude(armOf(tailTo, tailLength, 2.2, 1.3), Z.lever, 1.6, P, { bevel: 0.2 }), tone: 'mid' });
    parts.push({ kind: 'solid', paths: extrude(armOf(pawlTo, pawlLength, 2.2, 1.1), Z.lever, 1.6, P, { bevel: 0.2 }), tone: 'mid' });
    parts.push({ kind: 'solid', paths: cyl(LEVER.x, LEVER.y, 3.4, TOP, Z.lever + 1.6 - TOP, 20, 0.3), tone: 'lo' });
    parts.push({ kind: 'line', d: ring(LEVER.x, LEVER.y, 1.8, Z.lever + 1.6, P, 12) + lineOnTop([LEVER.x - 1.2, LEVER.y + 1.2], [LEVER.x + 1.2, LEVER.y - 1.2], Z.lever + 1.6, P), tone: 'lo' });
  }
  out['s0-hand'] = [];
  out['s1-hand'] = [];
  return out;
}

/** What the reader sees at `ms`: control steps taken and new joint targets set. */
export function readingAt(ms: number) {
  return { ms, steps: controlSteps(ms), targets: jointTargets(ms), stepInTarget: controlSteps(ms) - jointTargets(ms) * STEPS_PER_TARGET };
}

