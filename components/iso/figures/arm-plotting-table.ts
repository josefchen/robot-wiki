/**
 * The arm on the plotting table for PlanarFkArm, drawn with the isometric kit.
 *
 * The object is the explanation. A three-joint arm stands on a column at
 * the back of a plotting table, its links swinging flat over the paper, and
 * a pen on a quill at its hand touches the paper. Each joint's dial is a
 * ring of ticks on the tip of the link before it, zeroed along that link,
 * and the next link is the pointer, so every angle is read from the link
 * before it. The shoulder's dial is a protractor printed on the paper. The
 * paper's grid is half a link length a square, so the pen's place is the sum
 * of the three link vectors, read off the grid. Turn the shoulder alone and
 * the pen inks an arc round the shoulder: elbow, wrist and pen ride along.
 *
 * World units: `UNIT` per link length (the first link is 1.00 long). The
 * model's (x, y) is the table's (x, y) about the shoulder, x along the table
 * and y toward the viewer, z up. The links lie in layers, the first lowest,
 * so painting layer by layer from the paper up is always right; only the
 * quill, which stands through the lower layers, is placed by its depth.
 * Every static path is built once here; the arm, the quill and the ink are
 * rebuilt for each pose by `armParts` and `inkFor`, which is cheap.
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
  sideArc,
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
import { LINK_LENGTHS, planarForwardKinematics, totalReach, type Point2 } from '../../../lib/planar-fk.ts';

export const WIDTH = 640;
export const AZIMUTH = 58;
export const ELEVATION = 40;

/** World units per link length. */
export const UNIT = 46;
/** One grid square is half a link length. */
export const GRID = UNIT / 2;
/** The paper's top face: the pen and the ink are on it. */
export const PAPER_Z = 0.6;

/** Each link's layer: [bottom, top]. The first is lowest, on the shoulder column. */
export const LAYERS = [
  [22, 27],
  [29, 33.5],
  [35.5, 38.5],
] as const;
/** Boss radii of each link at its root and tip, and its bar's half width. */
const LINK_SHAPE: readonly { root: number; tip: number; bar: number }[] = [
  { root: 13, tip: 15, bar: 7.5 },
  { root: 10, tip: 12, bar: 6 },
  { root: 8, tip: 6.5, bar: 4.6 },
];
const REACH = totalReach(LINK_LENGTHS) * UNIT;
/**
 * The round paper covers every place the pen can reach. The shoulder turns
 * through the front half only, so the reach is a half disc in front of the
 * column and a band 1.3 link lengths deep behind it; a circle round a centre
 * half a link length in front of the shoulder holds both.
 */
const CENTRE: Plane = [0, UNIT / 2];
const PAPER_R = Math.hypot(1, 0.5) * UNIT + (LINK_LENGTHS[1] + LINK_LENGTHS[2]) * UNIT + 5;
const TABLE_R = PAPER_R + 11;
/** The protractor printed round the shoulder, 0 to 180 degrees. */
const PROTRACTOR = { inner: 25, outer: 34 };
/** Dial rings: ticks on each link's tip boss, every 15 degrees, zeroed along that link. */
const DIAL_STEP_DEG = 15;
/** The quill at the hand: the rod from the pen holder up through the third link. */
const QUILL = { r: 2.4, bottom: 16, top: LAYERS[2][1] + 4 };

/** A drawn part; `id` names the arm's parts a reader or test can find (a link, the pen). */
export type Part = (
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: 'ghost' | 'ink' | 'arm' }
) & { id?: string };

/** A seam or band line under a solid's outline, as the kit's line markup. */
const seam = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;

// ------------------------------------------------------------------ the model
/** The table point of a model point, in world units. */
export const tableOf = (p: Point2): Plane => [p.x * UNIT, p.y * UNIT];

/** The shoulder, elbow, wrist and pen for a pose, in model units (link lengths). */
export function poseOf(angles: readonly number[]) {
  const { pivots, effector } = planarForwardKinematics(LINK_LENGTHS, angles);
  return { joints: [...pivots, effector], hand: effector };
}

/** Table points of the shoulder, elbow, wrist and pen for a pose. */
export const jointsOf = (angles: readonly number[]): Plane[] => poseOf(angles).joints.map(tableOf);

// ---------------------------------------------------------------- the layout
const BASE_H = 9;
const FOOT_H = 6;
const COLUMN = { r: 11, flange: 19 };

// ---------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (let k = 0; k < 72; k++) {
  const [x, y] = [CENTRE[0] + TABLE_R * Math.cos((k / 72) * Math.PI * 2), CENTRE[1] + TABLE_R * Math.sin((k / 72) * Math.PI * 2)];
  extremes.push([x, y, -BASE_H - FOOT_H], [x, y, 2]);
}
// The arm at its widest reach, at the quill's top.
for (const [x, y] of [[0, 0], [REACH, 0], [-REACH, 0], [0, REACH], [REACH * 0.7, REACH * 0.7], [-REACH * 0.7, REACH * 0.7]]) {
  extremes.push([x, y, QUILL.top + 2]);
}
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
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const polar = (cx: number, cy: number, r: number, deg: number): Plane => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

/**
 * A link: a flat bar with a round boss at each end, from z to z + h. Its
 * outline is the hull of the two end circles.
 */
function linkPaths(a: Plane, b: Plane, rootR: number, tipR: number, z: number, h: number): SolidPaths {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const heading = Math.atan2(b[1] - a[1], b[0] - a[0]);
  // Where the hull leaves each end circle, measured off the link's axis.
  const off = Math.acos(Math.max(-1, Math.min(1, (rootR - tipR) / length)));
  const points: Plane[] = [];
  const steps = 16;
  for (let k = 0; k <= steps; k++) {
    const angle = heading + off + (k / steps) * (2 * Math.PI - 2 * off);
    points.push([a[0] + rootR * Math.cos(angle), a[1] + rootR * Math.sin(angle)]);
  }
  for (let k = 0; k <= steps; k++) {
    const angle = heading - off + (k / steps) * (2 * off);
    points.push([b[0] + tipR * Math.cos(angle), b[1] + tipR * Math.sin(angle)]);
  }
  return extrude(points, z, h, P, { bevel: 0.5 });
}

/** A closed lightening slot on a link's top, between its bosses: a thin stadium, so it has no ends. */
function slotOn(a: Plane, b: Plane, from: number, to: number, half: number, z: number): string {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  if (length - from - to < half * 3) return '';
  const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const p0 = polar(a[0], a[1], from, heading);
  const p1 = polar(b[0], b[1], to, heading + 180);
  const points: Plane[] = [];
  for (let k = 0; k <= 8; k++) points.push(polar(p0[0], p0[1], half, heading + 90 + (k / 8) * 180));
  for (let k = 0; k <= 8; k++) points.push(polar(p1[0], p1[1], half, heading - 90 + (k / 8) * 180));
  return onTop(points, z, P, true);
}

/**
 * A dial ring: ticks hanging inward from the rim of a boss of radius `r`
 * round (x, y) on its top at z, every DIAL_STEP_DEG, zeroed at `zeroDeg`,
 * a quarter turn either side of the zero: past that the boss's rim runs
 * into the link's bar and has no edge to hang a tick from. The zero is
 * longest and every 45 degrees is long.
 */
export function dialTicks(x: number, y: number, r: number, z: number, zeroDeg: number) {
  const minor: string[] = [];
  const major: string[] = [];
  let zero = '';
  for (let deg = -90; deg <= 90; deg += DIAL_STEP_DEG) {
    const long = deg % 45 === 0;
    const inner = r - (deg === 0 ? 2.8 : long ? 2.1 : 1.3);
    const d = lineOnTop(polar(x, y, r, zeroDeg + deg), polar(x, y, inner, zeroDeg + deg), z, P);
    if (deg === 0) zero = d;
    else if (long) major.push(d);
    else minor.push(d);
  }
  return { minor: minor.join(''), major: major.join(''), zero };
}

const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => PARTS.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });

// ---------------------------------------------------------------- the base
// A round table on six turned feet, with a seam round its side.
for (const [x, y] of byDepth(Array.from({ length: 6 }, (_, k) => polar(CENTRE[0], CENTRE[1], TABLE_R - 20, 30 + k * 60)))) {
  solid(cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(cyl(CENTRE[0], CENTRE[1], TABLE_R, -BASE_H, BASE_H, 120, 1.2), 'mid', { inner: seam(sideArc(CENTRE[0], CENTRE[1], TABLE_R, -BASE_H + 3, P, 96)) });

// The paper, its grid (half a link length a square, chord to chord through the shoulder's lines) and the axes.
solid(cyl(CENTRE[0], CENTRE[1], PAPER_R, 0, PAPER_Z, 120), 'lo');
{
  const chord = (along: 'x' | 'y', at: number) => {
    const offset = at - (along === 'x' ? CENTRE[0] : CENTRE[1]);
    const half = Math.sqrt(Math.max(0, PAPER_R * PAPER_R - offset * offset));
    const mid = along === 'x' ? CENTRE[1] : CENTRE[0];
    return along === 'x'
      ? lineOnTop([at, mid - half], [at, mid + half], PAPER_Z, P)
      : lineOnTop([mid - half, at], [mid + half, at], PAPER_Z, P);
  };
  const grid: string[] = [];
  for (let x = GRID; x < PAPER_R; x += GRID) grid.push(chord('x', x), chord('x', -x));
  for (let y = GRID; y < CENTRE[1] + PAPER_R; y += GRID) grid.push(chord('y', y));
  for (let y = -GRID; y > CENTRE[1] - PAPER_R; y -= GRID) grid.push(chord('y', y));
  line(grid.join(''), 'faint');
  line(chord('x', 0) + chord('y', 0), 'lo');
}
// The protractor round the shoulder: a printed half ring with ticks every 5 degrees.
{
  const { inner, outer } = PROTRACTOR;
  const arc = (r: number) => Array.from({ length: 61 }, (_, k): Plane => polar(0, 0, r, (k / 60) * 180));
  line(onTop([...arc(outer), ...arc(inner).reverse()], PAPER_Z, P, true), 'lo');
  const minor: string[] = [];
  const major: string[] = [];
  let zero = '';
  for (let deg = 0; deg <= 180; deg += 5) {
    const length = deg % 90 === 0 ? outer - inner : deg % 30 === 0 ? 2.6 : deg % 10 === 0 ? 2 : 1.3;
    const d = lineOnTop(polar(0, 0, outer, deg), polar(0, 0, outer - length, deg), PAPER_Z, P);
    if (deg === 0) zero = d;
    else if (deg % 30 === 0) major.push(d);
    else minor.push(d);
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  line(zero, 'hi');
}

PARTS.push({ kind: 'slot', slot: 'ghost' });
PARTS.push({ kind: 'slot', slot: 'ink' });

// Four clips on the rim hold the paper down, each a block with a knurled knob.
for (const deg of [40, 140, 220, 320]) {
  const [x, y] = polar(CENTRE[0], CENTRE[1], PAPER_R + 1.5, deg);
  const clip: Plan = { x: x - 5, y: y - 5, w: 10, d: 10, r: 2 };
  solid(slab(clip, PAPER_Z, 2.6, 3, 0.4), 'mid');
  solid(cyl(x, y, 3, PAPER_Z + 2.6, 3.2, 24, 0.3), 'mid', { inner: seam(knurl(x, y, 3, PAPER_Z + 2.6, PAPER_Z + 5.8, 16, P, 0.5)) });
}
// The label plate on the rim at the front; its rule lines stand for print.
{
  const [lx, ly] = polar(CENTRE[0], CENTRE[1], PAPER_R + 5.5, 108);
  const LABEL: Plan = { x: lx - 18, y: ly - 3.2, w: 36, d: 6.4, r: 1.4 };
  solid(slab(LABEL, 0, 0.8, 3), 'lo');
  line(planOutline(insetPlan(LABEL, 1.2), 0.8, P, 3), 'faint');
  line(lineOnTop([LABEL.x + 4, LABEL.y + 3.2], [LABEL.x + LABEL.w - 9, LABEL.y + 3.2], 0.8, P), 'lo', true);
  dots([at([LABEL.x + 2, LABEL.y + 3.2, 0.8]), at([LABEL.x + LABEL.w - 2, LABEL.y + 3.2, 0.8])], 0.45, 'mid');
}
// Screws round the rim between the clips.
dots(Array.from({ length: 12 }, (_, k) => at([...polar(CENTRE[0], CENTRE[1], PAPER_R + 6, 15 + k * 30), 0] as Point3)), 0.5, 'mid');

// The shoulder column: a bolted flange, the column with its seam, and the bearing ring under the first link.
const columnParts: Part[] = [
  { kind: 'solid', paths: cyl(0, 0, COLUMN.flange, PAPER_Z, 3, 56, 0.5), tone: 'mid' },
  { kind: 'dots', points: Array.from({ length: 8 }, (_, k) => at([...polar(0, 0, COLUMN.flange - 3.6, 22.5 + k * 45), PAPER_Z + 3] as Point3)), size: 0.55, tone: 'mid' },
  { kind: 'solid', paths: cyl(0, 0, COLUMN.r, PAPER_Z + 3, LAYERS[0][0] - PAPER_Z - 5, 48), tone: 'mid', inner: seam(sideArc(0, 0, COLUMN.r, 10, P, 32)) },
  { kind: 'solid', paths: cyl(0, 0, COLUMN.r + 2, LAYERS[0][0] - 2, 2, 48, 0.3), tone: 'lo' },
];

PARTS.push({ kind: 'slot', slot: 'arm' });

export { PARTS };

// ------------------------------------------------------------- the moving arm
/** True when the floor point `p` is in front of the segment a-b (nearer the viewer), so it paints after it. */
function inFront(p: Plane, a: Plane, b: Plane): boolean {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const [vx, vy] = towardViewer(P);
  return (p[0] - a[0] - t * dx) * vx + (p[1] - a[1] - t * dy) * vy > 0;
}

/** The quill and pen below the third link: the nib on the paper, the pen, its holder and the rod. */
function quillParts([x, y]: Plane): Part[] {
  return [
    { kind: 'solid', paths: cyl(x, y, 1.3, PAPER_Z, 2.6, 14), tone: 'hi', lit: true, id: 'effector-marker' },
    { kind: 'solid', paths: cyl(x, y, 3.4, PAPER_Z + 2.6, QUILL.bottom - PAPER_Z - 2.6, 24), tone: 'hi', lit: true, inner: seam(sideArc(x, y, 3.4, PAPER_Z + 9, P, 20)), id: 'effector-marker' },
    { kind: 'solid', paths: cyl(x, y, 4.8, QUILL.bottom, 4, 28, 0.3), tone: 'mid', inner: seam(sideArc(x, y, 4.8, QUILL.bottom + 2, P, 20)), id: 'effector-marker' },
    { kind: 'solid', paths: cyl(x, y, QUILL.r, QUILL.bottom + 4, LAYERS[2][0] - QUILL.bottom - 4, 18), tone: 'mid', id: 'effector-marker' },
  ];
}

/**
 * Every moving part for a pose, in painter's order: the column and the
 * quill below the first link (whichever is further back first), then layer
 * by layer up: the first link with the elbow's dial on its tip, the elbow
 * hub, the second link with the wrist's dial, the wrist hub, the third link,
 * and the quill's top. The quill below the links paints after the last
 * lower link it stands in front of.
 */
export function armParts(angles: readonly number[]): Part[] {
  const joints = jointsOf(angles);
  const hand = joints[3];
  const headings = [angles[0], angles[0] + angles[1], angles[0] + angles[1] + angles[2]];
  const quill = quillParts(hand);
  // After which lower link the quill paints: 0 before the first link, 1 after it, 2 after the second.
  const slot = inFront(hand, joints[1], joints[2]) ? 2 : inFront(hand, joints[0], joints[1]) ? 1 : 0;
  const quillFirst = depthOf([hand[0], hand[1], 0], P) < depthOf([0, 0, 0], P);
  const list: Part[] = [];
  if (slot === 0 && quillFirst) list.push(...quill);
  list.push(...columnParts);
  if (slot === 0 && !quillFirst) list.push(...quill);
  for (let k = 0; k < 3; k++) {
    const [z0, z1] = LAYERS[k];
    const shape = LINK_SHAPE[k];
    const a = joints[k];
    const b = joints[k + 1];
    const id = `link-${k + 1}`;
    list.push({ kind: 'solid', paths: linkPaths(a, b, shape.root, shape.tip, z0, z1 - z0), tone: 'mid', id });
    list.push({ kind: 'line', d: slotOn(a, b, shape.root + 3.6, shape.tip + 3.6, shape.bar * 0.42, z1), tone: 'faint', id });
    // The cover's screws, one each side of the slot's ends.
    const heading = headings[k];
    const screws = [polar(a[0], a[1], shape.root + 1.6, heading), polar(b[0], b[1], shape.tip + 1.6, heading + 180)]
      .flatMap(([sx, sy]) => [polar(sx, sy, shape.bar * 0.72, heading + 90), polar(sx, sy, shape.bar * 0.72, heading - 90)]);
    list.push({ kind: 'dots', points: screws.map(([sx, sy]) => at([sx, sy, z1])), size: 0.5, tone: 'mid', id });
    if (k < 2) {
      // The next joint's dial on this link's tip, zeroed along this link; the next link is its pointer.
      const ticks = dialTicks(b[0], b[1], shape.tip, z1, headings[k]);
      list.push({ kind: 'line', d: ticks.minor, tone: 'lo', id });
      list.push({ kind: 'line', d: ticks.major, tone: 'mid', id });
      list.push({ kind: 'line', d: ticks.zero, tone: 'hi', id });
      // The hub the next link turns on, between the two layers.
      list.push({ kind: 'solid', paths: cyl(b[0], b[1], LINK_SHAPE[k + 1].root * 0.72, z1, LAYERS[k + 1][0] - z1, 28), tone: 'lo' });
      if (slot === k + 1) list.push(...quill);
    }
    // This joint's axle cap on the link's top, with its screw.
    const capR = shape.root * 0.5;
    list.push({ kind: 'solid', paths: cyl(a[0], a[1], capR, z1, 1.4, 24, 0.3), tone: 'mid' });
    list.push({ kind: 'dots', points: [at([a[0], a[1], z1 + 1.4])], size: 0.6, tone: 'hi' });
  }
  // The quill's top above the third link: its clamp collar and the knob that holds the pen.
  const z3 = LAYERS[2][1];
  list.push({ kind: 'solid', paths: cyl(hand[0], hand[1], 4.4, z3, 1.8, 24, 0.3), tone: 'mid' });
  list.push({ kind: 'solid', paths: cyl(hand[0], hand[1], QUILL.r + 0.6, z3 + 1.8, QUILL.top - z3 - 1.8, 20, 0.3), tone: 'mid' });
  return list;
}

// ------------------------------------------------------------------- the ink
/**
 * The pen's ink on the paper: the arc the hand swept round the shoulder from
 * the pose before the move (`from`) to the pen now (`to`), with the dot where
 * the pen started. The arc's radius is the hand's distance from the
 * shoulder, which a shoulder turn never changes.
 */
export function inkFor(from: readonly number[], to: readonly number[]) {
  const start = poseOf(from).hand;
  const r = Math.hypot(start.x, start.y);
  const a0 = (Math.atan2(start.y, start.x) * 180) / Math.PI;
  const turn = to[0] - from[0];
  const steps = Math.max(2, Math.ceil(Math.abs(turn) / 2));
  const points: Plane[] = Array.from({ length: steps + 1 }, (_, k) => polar(0, 0, r * UNIT, a0 + (turn * k) / steps));
  return { arc: onTop(points, PAPER_Z, P), radius: r, start: at([...tableOf(start), PAPER_Z] as Point3) };
}

/**
 * The pose before the last move, sketched faintly on the paper: the three
 * link centre lines between small rings at the joints and the pen.
 */
export function ghostFor(angles: readonly number[]) {
  const points = jointsOf(angles);
  const radii = [3.4, 2.8, 2.4, 2];
  const rings = points.map(([x, y], k) => ring(x, y, radii[k], PAPER_Z, P, 24)).join('');
  const links = points.slice(0, -1).map(([x0, y0], k) => {
    const [x1, y1] = points[k + 1];
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length <= radii[k] + radii[k + 1]) return '';
    const [ux, uy] = [(x1 - x0) / length, (y1 - y0) / length];
    return lineOnTop([x0 + ux * radii[k], y0 + uy * radii[k]], [x1 - ux * radii[k + 1], y1 - uy * radii[k + 1]], PAPER_Z, P);
  }).join('');
  return { rings, links, points };
}

/** The screen point of a table point on the paper. */
export const paperPoint = (x: number, y: number): Flat => at([x, y, PAPER_Z]);
