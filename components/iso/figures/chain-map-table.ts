/**
 * The chain-map table for LoopClosure, drawn with the isometric kit.
 *
 * The object is the explanation: a plotting table carries a printed floor
 * plan, a corridor loop round a block of rooms with a ring at every place the
 * robot truly stopped. On the plan lies a jointed chain, the robot's map of
 * its own path: a steel link for every 2 m leg it drove, joined at pins that
 * stand on glide pucks, one for each pose it remembered. A torsion spring at
 * every pin holds that joint at the turn the robot measured there. The first
 * link is clamped to a start post; the last carries the robot itself, a small
 * rover whose camera looks ahead at a ranging pole beside the start.
 *
 * Each measured turn is a little off, so the chain bends away from the plan
 * and its end comes round short of the start. The lit bar clamped to the
 * rover's front is the camera's view of the start: one leg straight ahead,
 * ending in a square socket that fits the start post's square spigot one way
 * only. Open, the socket hangs off the post by the drift. Closing the loop
 * seats it: every spring gives a little, each joint turning by its share of
 * the least-squares correction (lib/loop-closure.ts), and the chain settles
 * back onto the plan's rings, nearly but not exactly.
 *
 * World units: 20 a metre of the course, x and y on the table, z up. The
 * course's own frame (the start at the origin, setting off along +x) is
 * turned a quarter turn onto the table, so the rover's last leg runs toward
 * the viewer and its camera faces out of the drawing.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  ringSeam,
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
import { barBetween, discAlong, viewOf } from '../prism.ts';
import { steadySolid } from '../steady-path.ts';
import { COURSE_LEGS, DRIFT_RANGE, DRIVEN_LEGS, JOINTS, LEG_M, TRUE_CHAIN, chainAt, type Vec } from '../../../lib/loop-closure.ts';

export const WIDTH = 640;
export const AZIMUTH = 34;
export const ELEVATION = 40;

/** World units per metre of the course. */
export const U = 20;
const RAD = Math.PI / 180;

/** The course's size, metres: legs east by legs north. */
const COURSE_W = COURSE_LEGS[0] * LEG_M;
const COURSE_D = COURSE_LEGS[1] * LEG_M;
/**
 * The plan sheet in the course's frame, metres: the corridor's walls, and room for the chain where it swings wide at
 * the widest drift (it bulges east and north, and a little south, of the course).
 */
const SHEET_M = { x0: -1.2, x1: COURSE_W + 2.15, y0: -1.55, y1: COURSE_D + 3.05 };
/** The table's margin round the sheet, metres. */
const MARGIN_M = 0.7;
const CENTRE_M: Vec = [(SHEET_M.x0 + SHEET_M.x1) / 2, (SHEET_M.y0 + SHEET_M.y1) / 2];
/** From the course's frame (metres, start at the origin, setting off along +x) to the table (world units), centred. */
export const toWorld = ([cx, cy]: Vec): Plane => [(-cy + CENTRE_M[1]) * U, (cx - CENTRE_M[0]) * U];
/** A heading in the course's frame, degrees, as a direction on the table. */
const headingOnTable = (deg: number): Plane => [-Math.sin(deg * RAD), Math.cos(deg * RAD)];
/** The start, on the table. */
export const START = toWorld([0, 0]);

// Heights.
const SHEET_H = 0.6;
const SHEET = SHEET_H;
const PUCK = { r: 4.4, z0: SHEET, z1: SHEET + 2 };
const LINK = { w: 4.6, h: 2 };
/** The two link layers: even legs low, odd legs high, so every joint stacks one of each. */
const LAYER = [PUCK.z1, PUCK.z1 + LINK.h] as const;
const LINK_TOP = PUCK.z1 + 2 * LINK.h;
const PIN = { r: 1.3, z1: LINK_TOP + 2.4 };
const CAP = { r: 2.1, h: 0.8 };
const COIL = { r: 2.5, z0: LINK_TOP + 0.3, z1: LINK_TOP + 2.0, turns: 2.5 };
/**
 * The start post on the first link's eye: a neck inside the eye, a collar, a column and the square spigot on top. The
 * bar, the camera's view of the start, ends in a square socket held clear of the spigot until it seats: on closing it
 * drops over the spigot onto the column's top.
 */
const POST = { neck: 1.9, collar: 6.8, r: 5.4, z0: LAYER[0] + LINK.h, neckTop: LAYER[0] + LINK.h + 1.4, collarTop: LAYER[0] + LINK.h + 2.6, z1: 15 };
const SPIGOT = { half: 4.2, z0: POST.z1, z1: POST.z1 + 3 };
const SOCKET = { half: 7.4, z0: SPIGOT.z1 + 0.6, z1: SPIGOT.z1 + 7.8 };
const SEAT = SOCKET.z0 - POST.z1;
const BAR = { z: (SOCKET.z0 + SOCKET.z1) / 2, w: 5.8, h: 3.6 };
/** The rover: a high-clearance chassis on four wheels, so the last link reaches the pin under its belly. */
const ROVER = { wheelR: 6.6, wheelW: 4.2, wheelA: 11.2, wheelB: 11.1, z0: 7.4, z1: 16.8, half: [15.6, 11] as const };
/** How far out the rover reaches from its pin, and how high its camera stands. */
const ROVER_REACH = 23;
const ROVER_TOP = BAR.z + BAR.h / 2 + 0.6 + 7.6;

const SHEET_PLAN: Plan = (() => {
  const [x0, y0] = toWorld([SHEET_M.x1, SHEET_M.y1]);
  const [x1, y1] = toWorld([SHEET_M.x0, SHEET_M.y0]);
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r: 2 };
})();
const TABLE: Plan = { ...insetPlan(SHEET_PLAN, -MARGIN_M * U), r: 6 };
const TABLE_H = 9;
const FOOT_H = 6;
const WALL = 0.9 * U;

// ---------------------------------------------------------------- camera
// The camera frames the machine, not the table: every place the chain, the rover and its socket reach over the drift
// slider's range and the whole close, the start post and the ranging pole. The table runs on past the frame, cropped
// at its edge, with a sliver of its near rim and rule kept in view.
const extremes: Point3[] = [];
for (let drift = DRIFT_RANGE[0]; drift <= DRIFT_RANGE[1] + 1e-9; drift += 0.25) {
  for (const share of [0, 0.25, 0.5, 0.75, 1]) {
    const chain = chainAt(drift, share);
    for (const pin of chain.pins) {
      const [x, y] = toWorld(pin);
      for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) extremes.push([x + dx, y + dy, 0], [x + dx, y + dy, 10]);
    }
    const [rx, ry] = toWorld(chain.pins[DRIVEN_LEGS]!);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      extremes.push([rx + dx * ROVER_REACH, ry + dy * ROVER_REACH, 0], [rx + dx * ROVER_REACH, ry + dy * ROVER_REACH, ROVER_TOP]);
    }
    const [sx, sy] = toWorld(chain.end);
    extremes.push([sx, sy, SOCKET.z1 + 1]);
  }
}
/** The ranging pole beside the start, and its top. */
const POLE = { at: [START[0] + 15, START[1] - 16] as Plane, r: 2.6, z1: 56, band: 7 };
for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]] as const) extremes.push([POLE.at[0] + dx, POLE.at[1] + dy, 0]);
extremes.push([POLE.at[0], POLE.at[1], POLE.z1 + 3]);
const FIT_PAD = 10;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const seam = (d: string, tone: LineTone = 'faint') => (d ? `<path class="iso-line" data-tone="${tone}" d="${d}"/>` : '');
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const Z: Point3 = [0, 0, 1];
/** A circle on a top face, as points. */
const circleOn = (cx: number, cy: number, r: number, z: number, steps = 40): Flat[] =>
  Array.from({ length: steps + 1 }, (_, k) => at([cx + r * Math.cos((k / steps) * Math.PI * 2), cy + r * Math.sin((k / steps) * Math.PI * 2), z]));
/** A ring of plan points turned to a heading about a centre. */
const turned = (points: Plane[], [cx, cy]: Plane, [ux, uy]: Plane): Plane[] => points.map(([a, b]) => [cx + a * ux - b * uy, cy + a * uy + b * ux]);
/** A rounded rectangle centred on the origin in a heading's own frame (a along, b across). */
function boxRing(a0: number, a1: number, b0: number, b1: number, r: number, steps = 3): Plane[] {
  return [...ringOfPlan({ x: a0, y: b0, w: a1 - a0, d: b1 - b0, r }, steps)];
}
function ringOfPlan({ x, y, w, d, r }: Plan, steps: number): Plane[] {
  const radius = Math.max(0, Math.min(r, w / 2, d / 2));
  const out: Plane[] = [];
  const cs: Array<[number, number, number]> = [
    [x + w - radius, y + radius, -90],
    [x + w - radius, y + d - radius, 0],
    [x + radius, y + d - radius, 90],
    [x + radius, y + radius, 180],
  ];
  for (const [cx, cy, start] of cs) {
    for (let k = 0; k <= steps; k++) {
      const a = (start + (steps ? (90 * k) / steps : 45)) * RAD;
      out.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
  }
  return out;
}
/** A stadium between two points (a link with round eyes): the ring the link's outline follows. */
function stadium([ax, ay]: Plane, [bx, by]: Plane, r: number, steps = 12): Plane[] {
  const angle = Math.atan2(by - ay, bx - ax);
  const out: Plane[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = angle - Math.PI / 2 + (k / steps) * Math.PI;
    out.push([bx + r * Math.cos(a), by + r * Math.sin(a)]);
  }
  for (let k = 0; k <= steps; k++) {
    const a = angle + Math.PI / 2 + (k / steps) * Math.PI;
    out.push([ax + r * Math.cos(a), ay + r * Math.sin(a)]);
  }
  return out;
}

// ---------------------------------------------------------------- parts
export type Slot = 'chain';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 1 | 2 | 3 | 'void'; name?: string }
  | { kind: 'group'; dx: number; dy: number; parts: readonly TablePart[]; name?: string }
  | { kind: 'slot'; slot: Slot };
export type TablePart = Exclude<Part, { kind: 'slot' }>;

const list: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths: steadySolid(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', name?: string) => {
  if (d) list.push({ kind: 'line', d, tone, free, name });
};
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points: points.map(at), size, tone });

// The table: a top on four turned feet, with an edge seam, a groove round the sheet and corner screws.
for (const [x, y] of byDepth(corners(TABLE, 18))) {
  solid(cyl(x, y, 8, -TABLE_H - FOOT_H, 1.6), 'lo');
  solid(cyl(x, y, 6, -TABLE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid');
}
solid(slab(TABLE, -TABLE_H, TABLE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(TABLE, -TABLE_H + 3, P, 8)) });
line(planOutline(insetPlan(TABLE, 6), 0, P), 'faint');
line(corners(TABLE, 9).map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
dots(corners(TABLE, 9).map(([x, y]) => [x, y, 0] as Point3), 0.5);

// Two rules along the near edges, graduated in metres of the plan: a tick every half metre, a long one every leg.
/** The label plate sits on the near rim beside the start, where the frame keeps it; the near rule runs on from it. */
const LABEL: Plan = { x: TABLE.x + TABLE.w - 12.5, y: -86, w: 9, d: 30, r: 1.6 };
const RULE_FRONT: Plan = { x: TABLE.x + TABLE.w - 11, y: LABEL.y + LABEL.d + 5, w: 7, d: SHEET_PLAN.y + SHEET_PLAN.d - 6 - (LABEL.y + LABEL.d + 5), r: 1 };
const RULE_SIDE: Plan = { x: SHEET_PLAN.x + 6, y: TABLE.y + TABLE.d - 11, w: SHEET_PLAN.w - 12, d: 7, r: 1 };
{
  solid(slab(RULE_FRONT, 0, 0.7, 3), 'lo', { crease: 'faint' });
  const yStart = toWorld([0, 0])[1];
  const fine: string[] = [];
  const major: string[] = [];
  for (let m = -1; m <= COURSE_W + 1 + 1e-9; m += 0.5) {
    const y = yStart + m * U;
    if (y < RULE_FRONT.y + 1.5 || y > RULE_FRONT.y + RULE_FRONT.d - 1.5) continue;
    const big = Math.abs(m % LEG_M) < 1e-9 || Math.abs((m % LEG_M) - LEG_M) < 1e-9;
    const edge = RULE_FRONT.x + RULE_FRONT.w;
    (big ? major : fine).push(onTop([[edge, y], [edge - (big ? RULE_FRONT.w : 2.2), y]], 0.7, P));
  }
  line(fine.join(''), 'lo');
  line(major.join(''), 'mid');
  solid(slab(RULE_SIDE, 0, 0.7, 3), 'lo', { crease: 'faint' });
  const xStart = toWorld([0, 0])[0];
  const fine2: string[] = [];
  const major2: string[] = [];
  for (let m = -1; m <= COURSE_D + 1 + 1e-9; m += 0.5) {
    const x = xStart - m * U;
    if (x < RULE_SIDE.x + 1.5 || x > RULE_SIDE.x + RULE_SIDE.w - 1.5) continue;
    const big = Math.abs(m % LEG_M) < 1e-9 || Math.abs((m % LEG_M) - LEG_M) < 1e-9;
    const edge = RULE_SIDE.y + RULE_SIDE.d;
    (big ? major2 : fine2).push(onTop([[x, edge], [x, edge - (big ? RULE_SIDE.d : 2.2)]], 0.7, P));
  }
  line(fine2.join(''), 'lo');
  line(major2.join(''), 'mid');
}

// The label plate at the front left corner, with three rule lines for its text and two screws.
{
  solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
  line(planOutline(insetPlan(LABEL, 1.4), 0.8, P), 'faint');
  line([0, 1, 2].map((row) => onTop([[LABEL.x + LABEL.w - 2.6 - row * 2.1, LABEL.y + 6], [LABEL.x + LABEL.w - 2.6 - row * 2.1, LABEL.y + (row === 1 ? 17 : 23)]], 0.8, P)).join(''), 'lo', true);
  dots([[LABEL.x + LABEL.w / 2, LABEL.y + 3, 0.8], [LABEL.x + LABEL.w / 2, LABEL.y + LABEL.d - 3, 0.8]], 0.45);
}

// The plan sheet, held at its corners by four clips, printed with the corridor's walls, the rooms in the block,
// the course and a ring at every true pose.
solid(slab(SHEET_PLAN, 0, SHEET_H, 4), 'lo', { crease: 'none' });
// The sheet's printed ground, a shade under the white parts that stand on it.
list.push({ kind: 'face', d: planOutline(SHEET_PLAN, SHEET, P, 4), fill: 3, name: 'sheet' });
{
  const [cx, cy] = toWorld([COURSE_W / 2, COURSE_D / 2]);
  const halfX = (COURSE_D / 2) * U;
  const halfY = (COURSE_W / 2) * U;
  const outer: Plan = { x: cx - halfX - WALL, y: cy - halfY - WALL, w: 2 * (halfX + WALL), d: 2 * (halfY + WALL), r: 2 };
  const inner: Plan = { x: cx - halfX + WALL, y: cy - halfY + WALL, w: 2 * (halfX - WALL), d: 2 * (halfY - WALL), r: 1 };
  line(planOutline(outer, SHEET, P, 3), 'lo');
  line(planOutline(insetPlan(outer, -1.2), SHEET, P, 3), 'faint');
  line(planOutline(inner, SHEET, P, 3), 'lo');
  line(planOutline(insetPlan(inner, 1.2), SHEET, P, 3), 'faint');
  // Rooms in the block: partitions wall to wall across it.
  const parts: string[] = [];
  for (const share of [0.3, 0.62]) {
    const y = inner.y + inner.d * share;
    parts.push(onTop([[inner.x + 1.2, y], [inner.x + inner.w - 1.2, y]], SHEET, P));
  }
  parts.push(onTop([[inner.x + inner.w * 0.5, inner.y + inner.d * 0.62], [inner.x + inner.w * 0.5, inner.y + inner.d - 1.2]], SHEET, P));
  line(parts.join(''), 'faint');
  // A faint grid, one leg apart and lined up with the course, edge to edge across the sheet.
  const grid: string[] = [];
  for (let m = Math.ceil(SHEET_M.x0 / LEG_M) * LEG_M; m <= SHEET_M.x1 + 1e-9; m += LEG_M) {
    const [, y] = toWorld([m, 0]);
    grid.push(onTop([[SHEET_PLAN.x, y], [SHEET_PLAN.x + SHEET_PLAN.w, y]], SHEET, P));
  }
  for (let m = Math.ceil(SHEET_M.y0 / LEG_M) * LEG_M; m <= SHEET_M.y1 + 1e-9; m += LEG_M) {
    const [x] = toWorld([0, m]);
    grid.push(onTop([[x, SHEET_PLAN.y], [x, SHEET_PLAN.y + SHEET_PLAN.d]], SHEET, P));
  }
  line(grid.join(''), 'faint', undefined, 'grid');
  // The course, round the corridor's middle, and the true poses on it.
  line(pathOf([...TRUE_CHAIN.pins.map((p) => toWorld(p)), toWorld(TRUE_CHAIN.pins[0]!)].map(([x, y]) => at([x, y, SHEET])), true), 'faint');
  const rings: string[] = [];
  for (let k = 1; k <= DRIVEN_LEGS; k++) {
    const [x, y] = toWorld(TRUE_CHAIN.pins[k]!);
    rings.push(pathOf(circleOn(x, y, PUCK.r + 1.2, SHEET, 32), true));
  }
  line(rings.join(''), 'lo', undefined, 'true-poses');
}
for (const [x, y] of byDepth(corners(SHEET_PLAN, 0))) {
  const sx = x < 0 ? 1 : -1;
  const sy = y < 0 ? 1 : -1;
  const clip: Plan = { x: x - 3 + sx * 3, y: y - 3 + sy * 3, w: 6, d: 6, r: 1 };
  solid(slab(clip, SHEET, 1.2, 2, 0.3), 'mid');
  dots([[clip.x + 3, clip.y + 3, SHEET + 1.2]], 0.45);
}

// The start post: a square plate on the sheet, with the first link's clamp, and the ranging pole beside it.
/** The start's plate runs out under the first link, to carry the clamp that holds that link's heading. */
const STATION: Plan = { x: START[0] - 8, y: START[1] - 8, w: 16, d: 30, r: 1.6 };
const CLAMP = { a0: 13, a1: 17, half: 5.2, z1: LAYER[0] + LINK.h + 1.4 };
solid(slab(STATION, SHEET, PUCK.z1 - SHEET, 3, 0.4), 'mid', { inner: seam(sideSeam(STATION, SHEET + 0.8, P, 3)) });
dots(corners(STATION, 2.2).map(([x, y]) => [x, y, PUCK.z1] as Point3), 0.45);

// The pole stands beside the start, in the corridor's corner: a foot, a banded staff and a cap.
{
  const [px, py] = POLE.at;
  solid(cyl(px, py, 6.4, SHEET, 1.8, 32, 0.3), 'mid');
  dots([0, 1, 2].map((k) => [px + 4.9 * Math.cos((k / 3) * Math.PI * 2 + 0.5), py + 4.9 * Math.sin((k / 3) * Math.PI * 2 + 0.5), SHEET + 1.8] as Point3), 0.45);
  solid(cyl(px, py, 3.3, SHEET + 1.8, 2.6, 24), 'mid');
  let z = SHEET + 4.4;
  let band = 0;
  // The staff's bands alternate light and dark, as a surveyor's ranging pole's do.
  while (z < POLE.z1 - 0.01) {
    const h = Math.min(POLE.band, POLE.z1 - z);
    const paths = cyl(px, py, POLE.r, z, h, 24);
    solid(paths, 'mid', { crease: 'none' });
    if (band % 2) {
      list.push({ kind: 'face', d: steadySolid(paths).fill, fill: 'void', name: 'pole-band' });
      line(paths.outline, 'mid');
    }
    z += h;
    band++;
  }
  solid(cyl(px, py, POLE.r + 0.5, POLE.z1, 1, 20, 0.2), 'mid');
}

list.push({ kind: 'slot', slot: 'chain' });

export const PARTS: readonly Part[] = list;
/** The table runs on past the frame: the drawing crops everything before the chain's slot to the viewBox. */
export const CROP_TABLE = true;

// ---------------------------------------------------------------- moving parts
export interface TablePose {
  /** The heading drift a leg, degrees, and the share of the closure the springs carry (0 open, 1 closed). */
  drift: number;
  share: number;
}

/** The pins on the table for a pose: the chain the model builds, turned onto the table. */
export const pinsAt = (pose: TablePose): Plane[] => chainAt(pose.drift, pose.share).pins.map(toWorld);

/** Where the bar's socket sits for a pose: one leg straight ahead of the rover, on the table. */
export function socketAt(pose: TablePose): Plane {
  const chain = chainAt(pose.drift, pose.share);
  return toWorld(chain.end);
}

/** How far the socket is lowered onto the spigot: only in the last tenth of the close. */
const seatOf = (share: number) => Math.max(0, Math.min(1, (share - 0.85) / 0.15)) * SEAT;

type Item = { key: number; parts: TablePart[] };

/** A link from pin a to pin b on its layer: a plate with round eyes and a lightening slot. */
function linkParts(a: Plane, b: Plane, z: number, name: string): TablePart[] {
  const ringPts = stadium(a, b, LINK.w / 2, 10);
  const paths = extrude(ringPts, z, LINK.h, P, { convex: true, bevel: 0.3 });
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Plane = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  // The slot runs between the eyes, a closed outline on the link's top.
  const s0: Plane = [a[0] + u[0] * 6.4, a[1] + u[1] * 6.4];
  const s1: Plane = [b[0] - u[0] * 6.4, b[1] - u[1] * 6.4];
  const slot = pathOf(stadium(s0, s1, 0.8, 6).map(([x, y]) => at([x, y, z + LINK.h])), true);
  return [{ kind: 'solid', paths: steadySolid(paths), tone: 'hi', inner: seam(slot, 'lo'), name }];
}

/** A glide puck under a pin: a felt pad and the puck with a seam. */
function puckParts([x, y]: Plane): TablePart[] {
  return [
    { kind: 'solid', paths: steadySolid(cyl(x, y, PUCK.r - 0.4, PUCK.z0, 0.5, 28)), tone: 'lo', crease: 'none' },
    { kind: 'solid', paths: steadySolid(cyl(x, y, PUCK.r, PUCK.z0 + 0.5, PUCK.z1 - PUCK.z0 - 0.5, 32, 0.3)), tone: 'mid', inner: seam(sideArc(x, y, PUCK.r, PUCK.z0 + 1.1, P, 20)) },
  ];
}

/** A helix round a vertical axis, split into the half behind the axis and the half in front. */
function helix([x, y]: Plane, r: number, z0: number, z1: number, turns: number, phase: number) {
  const back: Flat[][] = [];
  const front: Flat[][] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  const count = Math.round(turns * 20);
  for (let k = 0; k <= count; k++) {
    const share = k / count;
    const a = phase + share * turns * Math.PI * 2;
    const n: Point3 = [Math.cos(a), Math.sin(a), 0];
    const facing = n[0] * V[0] + n[1] * V[1] > 0;
    const point = at([x + r * n[0], y + r * n[1], z0 + (z1 - z0) * share]);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(point);
      (near ? front : back).push(run);
      run = [point];
      near = facing;
      continue;
    }
    run.push(point);
  }
  if (run.length > 1) (near ? front : back).push(run);
  return { back: back.map((r2) => pathOf(r2)).join(''), front: front.map((r2) => pathOf(r2)).join('') };
}

/**
 * The parts at a joint that only move, never turn, built once at the table's origin and slid into place: the glide
 * puck under the pin; the pin above the links with the torsion spring round it and its cap; and the spring's two
 * anchor posts, one on each link. Each joint draws them in a translated group, so a frame rebuilds only what turns.
 */
const PUCK_PARTS: readonly TablePart[] = puckParts([0, 0]);
const JOINT_TOP_PARTS: readonly TablePart[] = (() => {
  const coil = helix([0, 0], COIL.r, COIL.z0, COIL.z1, COIL.turns, -Math.PI / 3);
  return [
    { kind: 'line', d: coil.back, tone: 'lo' },
    { kind: 'solid', paths: steadySolid(cyl(0, 0, PIN.r, LINK_TOP, PIN.z1 - LINK_TOP, 16)), tone: 'mid' },
    { kind: 'line', d: coil.front, tone: 'mid' },
    { kind: 'solid', paths: steadySolid(cyl(0, 0, CAP.r, PIN.z1, CAP.h, 20, 0.2)), tone: 'mid' },
    { kind: 'dots', points: [at([0, 0, PIN.z1 + CAP.h])], size: 0.45, tone: 'mid' },
  ];
})();
const LOW_POST_PARTS: readonly TablePart[] = [{ kind: 'solid', paths: steadySolid(cyl(0, 0, 0.7, LAYER[0] + LINK.h, COIL.z0 - LAYER[0] - LINK.h, 12)), tone: 'mid' }];
const HIGH_POST_PARTS: readonly TablePart[] = [{ kind: 'solid', paths: steadySolid(cyl(0, 0, 0.7, LINK_TOP, COIL.z1 - LINK_TOP, 12)), tone: 'mid' }];
/** How far out along each link the spring's anchor post stands. */
const ANCHOR = 6.8;
const fine = (value: number) => Math.round(value * 100) / 100;
/** A group of origin-built parts slid to a point on the table. */
function placed(parts: readonly TablePart[], [x, y]: Plane, name?: string): TablePart {
  const o = at([0, 0, 0]);
  const p = at([x, y, 0]);
  return { kind: 'group', dx: fine(p[0] - o[0]), dy: fine(p[1] - o[1]), parts, name };
}

/**
 * A joint: the posts on the two links, the spring's legs from the pin out to the posts' tops (their inner ends under
 * the pin), and the pin with its spring and cap. `toLow` points along the low link, `toHigh` along the high one.
 */
function jointParts(p: Plane, toLow: Plane, toHigh: Plane): TablePart[] {
  const [x, y] = p;
  const out = (dir: Plane, r: number): Plane => [x + dir[0] * r, y + dir[1] * r];
  const lowPost = out(toLow, ANCHOR);
  const highPost = out(toHigh, ANCHOR);
  const legs =
    pathOf([at([...out(toLow, PIN.r * 0.5), COIL.z0] as Point3), at([lowPost[0], lowPost[1], COIL.z0])]) +
    pathOf([at([...out(toHigh, PIN.r * 0.5), COIL.z1] as Point3), at([highPost[0], highPost[1], COIL.z1])]);
  return [placed(LOW_POST_PARTS, lowPost), placed(HIGH_POST_PARTS, highPost), { kind: 'line', d: legs, tone: 'mid' }, placed(JOINT_TOP_PARTS, p, 'joint')];
}

/**
 * The rover at the end of the chain, at pin `p` facing `dir`, with the bar clamped to its front and the socket on the
 * bar's end. Its far wheels come back separately, to be drawn before the last link that passes between them.
 */
function roverParts(p: Plane, dir: Plane, socket: Plane, seat: number): { far: TablePart[]; body: TablePart[]; bar: TablePart[] } {
  const [x, y] = p;
  const side: Plane = [-dir[1], dir[0]];
  const onRover = (a: number, b: number): Plane => [x + dir[0] * a + side[0] * b, y + dir[1] * a + side[1] * b];
  const ringOn = (a0: number, a1: number, b0: number, b1: number, r: number) => turned(boxRing(a0, a1, b0, b1, r), p, dir);
  const body = (a0: number, a1: number, b0: number, b1: number, z: number, h: number, r: number, bevel = 0.3) =>
    steadySolid(extrude(ringOn(a0, a1, b0, b1, r), z, h, P, { convex: true, bevel }));
  const wheels = (near: boolean): TablePart[] => {
    const out: TablePart[] = [];
    for (const a of [-ROVER.wheelA, ROVER.wheelA]) {
      for (const sign of [-1, 1]) {
        const isNear = (side[0] * V[0] + side[1] * V[1]) * sign > 0;
        if (isNear !== near) continue;
        const c = onRover(a, sign * ROVER.wheelB);
        const axis: Point3 = [side[0] * sign, side[1] * sign, 0];
        const z = SHEET + ROVER.wheelR;
        const outer: Point3 = [c[0] + axis[0] * ROVER.wheelW, c[1] + axis[1] * ROVER.wheelW, z];
        out.push({ kind: 'solid', paths: steadySolid(discAlong([c[0], c[1], z], axis, ROVER.wheelR, ROVER.wheelW, P, 36, 0.3)), tone: 'mid' });
        out.push({ kind: 'solid', paths: steadySolid(discAlong(outer, axis, 2.9, 0.7, P, 24, 0.2)), tone: 'mid' });
        out.push({ kind: 'dots', points: [at([outer[0] + axis[0] * 0.6, outer[1] + axis[1] * 0.6, z])], size: 0.5, tone: 'mid' });
      }
    }
    return out;
  };
  const far = wheels(false);
  const parts: TablePart[] = [];
  // The chassis, with a seam round its sides, the deck's inset panel and screws, and the bumper.
  const [ha, hb] = ROVER.half;
  parts.push({
    kind: 'solid',
    paths: body(-ha, ha, -hb, hb, ROVER.z0, ROVER.z1 - ROVER.z0, 2.6),
    tone: 'hi',
    inner: seam(ringSeam(ringOn(-ha, ha, -hb, hb, 2.6), ROVER.z0 + 2.6, P)),
    name: 'rover',
  });
  const deck = ROVER.z1;
  parts.push({ kind: 'line', d: pathOf(ringOn(-ha + 2.4, ha - 2.4, -hb + 2.4, hb - 2.4, 1.2).map(([a, b]) => at([a, b, deck])), true), tone: 'faint' });
  parts.push({ kind: 'dots', points: [[-ha + 1.2, -hb + 1.2], [-ha + 1.2, hb - 1.2], [ha - 1.2, -hb + 1.2], [ha - 1.2, hb - 1.2]].map(([a, b]) => onRover(a!, b!)).map(([a, b]) => at([a, b, deck])), size: 0.45, tone: 'mid' });
  parts.push({ kind: 'solid', paths: body(ha, ha + 2.6, -hb + 1.8, hb - 1.8, ROVER.z0 + 0.9, 3.6, 0.9, 0.1), tone: 'mid' });
  parts.push(...wheels(true));
  // The antenna mast at the back, the mount at the front and the camera on it, looking ahead.
  const mast = onRover(-ha + 4.2, hb - 3.9);
  parts.push({ kind: 'solid', paths: steadySolid(cyl(mast[0], mast[1], 1.6, deck, 1, 16, 0.2)), tone: 'mid' });
  parts.push({ kind: 'solid', paths: steadySolid(cyl(mast[0], mast[1], 0.8, deck + 1, 11, 12)), tone: 'mid' });
  parts.push({ kind: 'solid', paths: steadySolid(cyl(mast[0], mast[1], 1.8, deck + 12, 1.6, 16, 0.2)), tone: 'mid' });
  const mountTop = BAR.z + BAR.h / 2 + 0.6;
  parts.push({ kind: 'solid', paths: body(6.2, ha, -4.8, 4.8, deck, mountTop - deck, 1.2), tone: 'mid' });
  parts.push({ kind: 'dots', points: [at([...onRover(ha, -3.3), BAR.z + BAR.h / 2 + 0.3] as Point3), at([...onRover(ha, 3.3), BAR.z + BAR.h / 2 + 0.3] as Point3)], size: 0.45, tone: 'mid' });
  const camZ = mountTop;
  parts.push({ kind: 'solid', paths: body(4.2, ha - 0.7, -5.3, 5.3, camZ, 7.6, 1.6), tone: 'mid', name: 'camera' });
  const lensAt = onRover(ha - 0.7, 0);
  const lensAxis: Point3 = [dir[0], dir[1], 0];
  parts.push({ kind: 'solid', paths: steadySolid(discAlong([lensAt[0], lensAt[1], camZ + 3.8], lensAxis, 3.1, 2.8, P, 28, 0.2)), tone: 'mid' });
  parts.push({ kind: 'solid', paths: steadySolid(discAlong([lensAt[0] + dir[0] * 2.8, lensAt[1] + dir[1] * 2.8, camZ + 3.8], lensAxis, 2.2, 0.4, P, 24)), tone: 'hi' });
  // The bar, from the mount's front to the socket, and the socket on its end.
  const front = onRover(ha, 0);
  const from: Point3 = [front[0], front[1], BAR.z];
  const length = Math.hypot(socket[0] - from[0], socket[1] - from[1]);
  const along: Plane = [(socket[0] - from[0]) / length, (socket[1] - from[1]) / length];
  const to: Point3 = [socket[0] - along[0] * SOCKET.half, socket[1] - along[1] * SOCKET.half, BAR.z];
  const bar: TablePart[] = [
    { kind: 'solid', paths: steadySolid(barBetween(from, to, [0, 0, 1], BAR.h, BAR.w, P, 0.3)), tone: 'hi', lit: true, name: 'bar' },
    {
      kind: 'solid',
      paths: steadySolid(extrude(turned(boxRing(-SOCKET.half, SOCKET.half, -SOCKET.half, SOCKET.half, 0.8), socket, along), SOCKET.z0 - seat, SOCKET.z1 - SOCKET.z0, P, { convex: true, bevel: 0.4 })),
      tone: 'hi',
      lit: true,
      name: 'socket',
    },
  ];
  return { far, body: parts, bar };
}

/** The clamp that holds the first link's heading: two cheeks on the start plate and a bridge across the link. */
function clampParts(): { far: TablePart[]; near: TablePart[] } {
  const along = headingOnTable(0);
  const side: Plane = [-along[1], along[0]];
  const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number) =>
    steadySolid(extrude(turned(boxRing(a0, a1, b0, b1, 0.4), START, along), z0, z1 - z0, P, { convex: true, bevel: 0.2 }));
  const cheek = LINK.w / 2 + 0.3;
  const sideNear = side[0] * V[0] + side[1] * V[1] > 0 ? 1 : -1;
  const cheekAt = (sign: number): TablePart => ({ kind: 'solid', paths: box(CLAMP.a0, CLAMP.a1, sign > 0 ? cheek : -CLAMP.half, sign > 0 ? CLAMP.half : -cheek, PUCK.z1, CLAMP.z1 - 0.01), tone: 'mid' });
  const top = CLAMP.z1;
  const bridge: TablePart = { kind: 'solid', paths: box(CLAMP.a0, CLAMP.a1, -CLAMP.half, CLAMP.half, LAYER[0] + LINK.h, top + 1.2), tone: 'mid', name: 'clamp' };
  const at2 = (a: number, b: number): Point3 => [START[0] + along[0] * a + side[0] * b, START[1] + along[1] * a + side[1] * b, top + 1.2];
  const screws: TablePart = { kind: 'dots', points: [at(at2((CLAMP.a0 + CLAMP.a1) / 2, -CLAMP.half + 1.4)), at(at2((CLAMP.a0 + CLAMP.a1) / 2, CLAMP.half - 1.4))], size: 0.45, tone: 'mid' };
  return { far: [cheekAt(-sideNear)], near: [cheekAt(sideNear), bridge, screws] };
}

/**
 * The start post, standing on the first link's eye: a neck inside the eye, a collar, a column with a seam and the
 * square spigot the socket fits one way only.
 */
function startPostParts(): TablePart[] {
  const [x, y] = START;
  const along = headingOnTable(0);
  return [
    { kind: 'solid', paths: steadySolid(cyl(x, y, POST.neck, POST.z0, POST.neckTop - POST.z0, 20)), tone: 'mid' },
    { kind: 'solid', paths: steadySolid(cyl(x, y, POST.collar, POST.neckTop, POST.collarTop - POST.neckTop, 32, 0.3)), tone: 'mid' },
    { kind: 'dots', points: [0, 1, 2, 3].map((k) => at([x + (POST.collar - 0.9) * Math.cos((k / 4) * Math.PI * 2 + Math.PI / 4), y + (POST.collar - 0.9) * Math.sin((k / 4) * Math.PI * 2 + Math.PI / 4), POST.collarTop])), size: 0.42, tone: 'mid' },
    { kind: 'solid', paths: steadySolid(cyl(x, y, POST.r, POST.collarTop, POST.z1 - POST.collarTop, 28, 0.3)), tone: 'hi', inner: seam(sideArc(x, y, POST.r, (POST.collarTop + POST.z1) / 2, P, 20)), name: 'start-post' },
    { kind: 'solid', paths: steadySolid(extrude(turned(boxRing(-SPIGOT.half, SPIGOT.half, -SPIGOT.half, SPIGOT.half, 0.4), START, along), SPIGOT.z0, SPIGOT.z1 - SPIGOT.z0, P, { convex: true, bevel: 0.3 })), tone: 'mid', name: 'spigot' },
  ];
}

export function movingAt(pose: TablePose): Record<Slot, TablePart[]> {
  const chain = chainAt(pose.drift, pose.share);
  const pins = chain.pins.map(toWorld);
  const items: Item[] = [];
  const LAYERS = 1e5;
  // Pucks, lowest of all, under every pin but the start's (its plate) and the rover's (its wheels).
  for (let k = 1; k < DRIVEN_LEGS; k++) items.push({ key: depth(...pins[k]!), parts: [placed(PUCK_PARTS, pins[k]!, 'puck')] });
  // Links on their two layers.
  for (let leg = 0; leg < DRIVEN_LEGS; leg++) {
    const layer = leg % 2;
    const a = pins[leg]!;
    const b = pins[leg + 1]!;
    items.push({ key: LAYERS * (1 + layer) + depth((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), parts: linkParts(a, b, LAYER[layer]!, `link-${leg}`) });
  }
  // Joint tops: pin, spring and cap at every joint.
  for (let k = 1; k <= JOINTS; k++) {
    const p = pins[k]!;
    const back = pins[k - 1]!;
    const ahead = pins[k + 1]!;
    const unit = (q: Plane): Plane => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    };
    // The low link at joint k is the even one of the two that meet there.
    const lowIsBack = (k - 1) % 2 === 0;
    items.push({ key: 3 * LAYERS + depth(p[0], p[1]), parts: jointParts(p, unit(lowIsBack ? back : ahead), unit(lowIsBack ? ahead : back)) });
  }
  items.push({ key: 3 * LAYERS + depth(START[0], START[1]), parts: startPostParts() });
  // The clamp over the first link: its far cheek before the links, its bridge and near cheek after them.
  const clamp = clampParts();
  items.push({ key: 0.5 * LAYERS, parts: clamp.far });
  items.push({ key: 2.5 * LAYERS, parts: clamp.near });
  // The rover: its far wheels before the links (the last link passes between them), the rest after everything, then
  // its bar and socket.
  const heading = chain.headings[DRIVEN_LEGS - 1]!;
  const rover = roverParts(pins[DRIVEN_LEGS]!, headingOnTable(heading), toWorld(chain.end), seatOf(pose.share));
  const roverKey = depth(...pins[DRIVEN_LEGS]!);
  items.push({ key: 0.5 * LAYERS + roverKey, parts: rover.far });
  items.push({ key: 4 * LAYERS + roverKey, parts: rover.body });
  items.push({ key: 5 * LAYERS + roverKey, parts: rover.bar });
  items.sort((a, b) => a.key - b.key);
  return { chain: items.flatMap((item) => item.parts) };
}

/** A pose from preview input: `{ drift, share }`, open at the opening drift by default. */
export const poseFrom = (raw: { drift?: number; share?: number } | null): TablePose => ({ drift: raw?.drift ?? 1.5, share: raw?.share ?? 0 });

export const SCREEN = { at, START, POLE, TABLE, depth, Z };
