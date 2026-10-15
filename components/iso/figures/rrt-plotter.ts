/**
 * The planning plotter for RrtExplorer, drawn with the isometric kit.
 *
 * The object is the explanation. The planning map is a board on a plotting
 * table, its obstacles real blocks standing on it: a wall with a gap at the
 * back and four round posts. A gantry rides two rails over the board, and
 * its pen inks each branch the search accepts, from the nearest node toward
 * a random spot, dotting every node it reaches; the tree spreads into open
 * space because each new branch starts from whatever node is nearest the
 * sample. When a branch reaches the goal ring, the path back to the start
 * peg is inked again in the lit pen.
 *
 * World units: `CELL` per planning unit; the model's 100 by 64 world is the
 * board, x along it and the model's y toward the viewer, z up. Everything
 * the pen inks lies on the board's face; the blocks, pegs and the pen's nib
 * stand on it and paint by their depth; the gantry rides above them all.
 * Static paths are built once here; the ink, the node dots and the gantry's
 * place are rebuilt or moved for each iteration.
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
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  topTicks,
  towardViewer,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { RRT_SCENE, type Obstacle, type Vec2 } from '../../../lib/rrt.ts';

export const WIDTH = 640;
export const AZIMUTH = 60;
export const ELEVATION = 48;

/** World units per planning unit. */
export const CELL = 3;
/** The board's face, where the ink lies. */
export const BOARD_Z = 6;
const BLOCK_H = 12;
const W = RRT_SCENE.width * CELL;
const D = RRT_SCENE.height * CELL;
/** The gantry: rails along x behind and in front of the board, a bridge across y, the pen head on a carriage. */
const RAIL = { inset: 16, w: 8, h: 8 };
const BRIDGE = { z: 40, h: 6, d: 10 };
const PEN = { nib: 1.1, r: 2.6, holder: 4.4 };

export type Part = (
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; slot: 'ink' | 'standing' | 'gantry' }
) & { id?: string };

// ---------------------------------------------------------------- the camera
const BASE: Plan = { x: -26, y: -RAIL.inset - RAIL.w - 14, w: W + 92, d: D + 2 * (RAIL.inset + RAIL.w) + 28, r: 6 };
const BASE_H = 8;
const FOOT_H = 6;
const extremes: Point3[] = [];
for (const x of [BASE.x, BASE.x + BASE.w]) for (const y of [BASE.y, BASE.y + BASE.d]) extremes.push([x, y, -BASE_H - FOOT_H], [x, y, 0]);
for (const x of [0, W]) for (const y of [-RAIL.inset - RAIL.w, D + RAIL.inset + RAIL.w]) extremes.push([x, y, BRIDGE.z + BRIDGE.h + 16]);
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
const seam = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The board point of a planning point. */
export const boardOf = (p: Vec2): Plane => [p.x * CELL, p.y * CELL];
/** The screen point of a planning point on the board's face. */
export const inkPoint = (p: Vec2): Flat => at([p.x * CELL, p.y * CELL, BOARD_Z]);

const PARTS: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => PARTS.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => PARTS.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => PARTS.push({ kind: 'dots', points, size, tone });

// ---------------------------------------------------------------- the table
for (const [x, y] of byDepth([...corners(BASE, 18), [BASE.x + BASE.w / 2, BASE.y + 18], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 18]])) {
  solid(cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BASE, -BASE_H + 3, P, 8)) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
for (const [x, y] of corners(BASE, 10)) line(ring(x, y, 2.2, 0, P, 16), 'lo');
dots(corners(BASE, 10).map(([x, y]) => at([x, y, 0])), 0.55, 'mid');

// The back rail (behind the board), then the board itself.
const railPlan = (y: number): Plan => ({ x: -14, y, w: W + 28, d: RAIL.w, r: 1.5 });
const backRail = railPlan(-RAIL.inset - RAIL.w);
const frontRail = railPlan(D + RAIL.inset);
function rail(plan: Plan) {
  solid(slab(plan, 0, RAIL.h, 3, 0.6), 'mid', { inner: seam(sideSeam(plan, 3, P, 3)) });
  line(planOutline({ x: plan.x + 4, y: plan.y + plan.d / 2 - 1, w: plan.w - 8, d: 2, r: 1 }, RAIL.h, P, 3), 'faint');
  // A ruler strip along the rail's inner edge: a tick every planning unit, long every ten.
  const front = plan === frontRail;
  const strip: Plan = { x: 0, y: front ? plan.y + 0.6 : plan.y + plan.d - 2.6, w: W, d: 2, r: 0.4 };
  solid(slab(strip, RAIL.h, 0.4, 2), 'lo', { crease: 'none' });
  const ticks = topTicks(0, W, CELL, 10, front ? strip.y : strip.y + strip.d, RAIL.h + 0.4, front ? [1.1, 1.9] : [-1.1, -1.9], P, 'x');
  line(ticks.minor, 'lo');
  line(ticks.major, 'mid');
  for (const x of [plan.x + 3, plan.x + plan.w - 3]) dots([at([x, plan.y + plan.d / 2, RAIL.h])], 0.5, 'mid');
}
rail(backRail);
// The controller at the right of the board: a case with two knurled knobs.
const BOX: Plan = { x: W + 24, y: D / 2 - 26, w: 30, d: 52, r: 2 };
solid(slab(BOX, 0, 16, 3, 0.6), 'mid', { inner: seam(sideSeam(BOX, 12, P, 3)) });
for (const y of [BOX.y + 14, BOX.y + 30]) {
  solid(cyl(BOX.x + BOX.w / 2, y, 4, 16, 3.4, 24, 0.3), 'mid', { inner: seam(knurl(BOX.x + BOX.w / 2, y, 4, 16, 19.4, 18, P, 0.5)) });
}
// Its lamp, lit while the pen draws: a plain lens on the case's front end.
line(ring(BOX.x + BOX.w / 2, BOX.y + BOX.d - 8, 2.4, 16, P, 20), 'lo');
dots(corners(BOX, 2.4).map(([x, y]) => at([x, y, 16])), 0.45, 'mid');
const BOARD: Plan = { x: -6, y: -6, w: W + 12, d: D + 12, r: 3 };
solid(slab(BOARD, 0, BOARD_Z, 4, 0.8), 'lo', { inner: seam(sideSeam(BOARD, 2.4, P, 4)) });
// The map's edge, printed on the board, and its corner screws in the margin.
line(planOutline({ x: 0, y: 0, w: W, d: D, r: 0.5 }, BOARD_Z, P, 2), 'lo');
dots(corners(BOARD, 3).map(([x, y]) => at([x, y, BOARD_Z])), 0.5, 'mid');
// The goal area printed round the goal: its ring is the radius a branch must come within.
{
  const [gx, gy] = boardOf(RRT_SCENE.goal);
  line(ring(gx, gy, RRT_SCENE.goalRadius * CELL, BOARD_Z, P, 40), 'mid');
}

PARTS.push({ kind: 'slot', slot: 'ink' });
PARTS.push({ kind: 'slot', slot: 'standing' });

// The front rail, in front of everything on the board.
rail(frontRail);

PARTS.push({ kind: 'slot', slot: 'gantry' });

export { PARTS };

// --------------------------------------------------------- the standing pieces
/** One obstacle as a block on the board: a round post or the wall slab. */
function obstacleParts(obstacle: Obstacle): Part[] {
  if (obstacle.kind === 'circle') {
    const [x, y] = boardOf(obstacle);
    const r = obstacle.r * CELL;
    return [
      { kind: 'solid', paths: cyl(x, y, r, BOARD_Z, BLOCK_H, 64, 0.8), tone: 'hi', inner: seam(sideArc(x, y, r, BOARD_Z + 3, P, 48)) },
      { kind: 'line', d: ring(x, y, r - 3, BOARD_Z + BLOCK_H, P, 48), tone: 'faint' },
    ];
  }
  const plan: Plan = { x: obstacle.x * CELL, y: obstacle.y * CELL, w: obstacle.w * CELL, d: obstacle.h * CELL, r: 1.5 };
  return [
    { kind: 'solid', paths: slab(plan, BOARD_Z, BLOCK_H, 3, 0.8), tone: 'hi', inner: seam(sideSeam(plan, BOARD_Z + 3, P, 3)) },
    { kind: 'line', d: planOutline(insetPlan(plan, 3), BOARD_Z + BLOCK_H, P, 3), tone: 'faint' },
  ];
}

/** The start peg: a collar and a knurled peg the tree grows from. */
function startParts(): Part[] {
  const [x, y] = boardOf(RRT_SCENE.start);
  return [
    { kind: 'solid', paths: cyl(x, y, 4.6, BOARD_Z, 1.6, 28, 0.3), tone: 'mid' },
    { kind: 'solid', paths: cyl(x, y, 2.6, BOARD_Z + 1.6, 8, 24, 0.3), tone: 'hi', inner: seam(knurl(x, y, 2.6, BOARD_Z + 4, BOARD_Z + 9.6, 14, P, 0.5)) },
  ];
}

/** The goal: a pin in the middle of the goal ring with a small flag plate. */
function goalParts(): Part[] {
  const [x, y] = boardOf(RRT_SCENE.goal);
  return [
    { kind: 'solid', paths: cyl(x, y, 2.2, BOARD_Z, 1.2, 24, 0.3), tone: 'mid' },
    { kind: 'solid', paths: cyl(x, y, 0.8, BOARD_Z + 1.2, 16, 14), tone: 'hi' },
    { kind: 'solid', paths: slab({ x: x + 0.6, y: y - 0.4, w: 7, d: 0.8, r: 0.2 }, BOARD_Z + 11.5, 5, 2), tone: 'mid' },
  ];
}

/** Where the pen stands on the board, as a planning point. */
export type PenAt = Vec2;

/**
 * Where the gantry parks once the path is inked: past the board's right
 * edge, clear of the map, with the pen lifted.
 */
export const PARK: Vec2 = { x: (W + 12) / CELL, y: RRT_SCENE.goal.y };
const LIFT = 8;

/** The pen's nib and holder below the bridge, which stand among the blocks; lifted off the board when parked. */
function nibParts([x, y]: Plane, lifted: boolean): Part[] {
  const z = BOARD_Z + (lifted ? LIFT : 0);
  return [
    { kind: 'solid', paths: cyl(x, y, PEN.nib, z, 2.2, 14), tone: 'hi' },
    { kind: 'solid', paths: cyl(x, y, PEN.r, z + 2.2, 12, 20), tone: 'hi', inner: seam(sideArc(x, y, PEN.r, z + 9, P, 16)) },
    { kind: 'solid', paths: cyl(x, y, PEN.holder, z + 14.2, 5, 24, 0.3), tone: 'mid' },
    { kind: 'solid', paths: cyl(x, y, 1.6, z + 19.2, BRIDGE.z - z - 19.2, 16), tone: 'mid' },
  ];
}

/** True when floor point p is in front of (nearer the viewer than) the obstacle's footprint. */
function inFrontOf(p: Plane, obstacle: Obstacle): boolean {
  const [vx, vy] = towardViewer(P);
  if (obstacle.kind === 'circle') {
    const [x, y] = boardOf(obstacle);
    return (p[0] - x) * vx + (p[1] - y) * vy > 0;
  }
  const x0 = obstacle.x * CELL;
  const y0 = obstacle.y * CELL;
  const cx = Math.max(x0, Math.min(x0 + obstacle.w * CELL, p[0]));
  const cy = Math.max(y0, Math.min(y0 + obstacle.h * CELL, p[1]));
  if (cx === p[0] && cy === p[1]) return false;
  return (p[0] - cx) * vx + (p[1] - cy) * vy > 0;
}

/**
 * Everything standing on the board for the pen at `pen`, in painter's
 * order: the start peg, the goal pin, the five blocks and the pen's nib,
 * sorted by depth so a block in front of the nib covers it and one behind
 * is covered. Each obstacle keeps its index for its test id.
 */
export function standingParts(pen: PenAt, lifted = false): { id: string; parts: Part[] }[] {
  const nib = boardOf(pen);
  const pieces: { id: string; parts: Part[]; depth: number; obstacle?: Obstacle }[] = [
    { id: 'start', parts: startParts(), depth: depthOf([...boardOf(RRT_SCENE.start), 0] as Point3, P) },
    { id: 'goal', parts: goalParts(), depth: depthOf([...boardOf(RRT_SCENE.goal), 0] as Point3, P) },
    ...RRT_SCENE.obstacles.map((obstacle, k) => {
      const centre: Plane = obstacle.kind === 'circle' ? boardOf(obstacle) : [(obstacle.x + obstacle.w / 2) * CELL, (obstacle.y + obstacle.h / 2) * CELL];
      return { id: `obstacle-${k}`, parts: obstacleParts(obstacle), depth: depthOf([...centre, 0] as Point3, P), obstacle };
    }),
  ];
  pieces.sort((a, b) => a.depth - b.depth);
  // The nib paints after every block it stands in front of, and before the rest.
  let slot = 0;
  pieces.forEach((piece, k) => {
    if (piece.obstacle ? inFrontOf(nib, piece.obstacle) : depthOf([...nib, 0] as Point3, P) > piece.depth) slot = k + 1;
  });
  const ordered: { id: string; parts: Part[] }[] = pieces.map(({ id, parts }) => ({ id, parts }));
  ordered.splice(lifted ? ordered.length : slot, 0, { id: 'pen-nib', parts: nibParts(nib, lifted) });
  return ordered;
}

// ------------------------------------------------------------- the gantry
/**
 * The gantry for the pen at `pen`: the trucks on the rails, the uprights,
 * the bridge across the board, the carriage on the bridge and the pen's
 * head above it. Built at the pen's place (the bridge's y and the
 * carriage's x), cheap to rebuild.
 */
export function gantryParts(pen: PenAt): Part[] {
  const [px, py] = boardOf(pen);
  const list: Part[] = [];
  const truckBack: Plan = { x: px - 9, y: backRail.y - 2, w: 18, d: RAIL.w + 4, r: 2 };
  const truckFront: Plan = { x: px - 9, y: frontRail.y - 2, w: 18, d: RAIL.w + 4, r: 2 };
  const uprightBack: Plan = { x: px - 4, y: backRail.y + 1, w: 8, d: RAIL.w - 2, r: 1.2 };
  const uprightFront: Plan = { x: px - 4, y: frontRail.y + 1, w: 8, d: RAIL.w - 2, r: 1.2 };
  const bridge: Plan = { x: px - BRIDGE.d / 2, y: backRail.y - 2, w: BRIDGE.d, d: frontRail.y + RAIL.w + 2 - (backRail.y - 2), r: 2 };
  const carriage: Plan = { x: px - BRIDGE.d / 2 - 3, y: py - 9, w: BRIDGE.d + 6, d: 18, r: 2 };
  list.push({ kind: 'solid', paths: slab(truckBack, RAIL.h, 5, 3, 0.5), tone: 'mid' });
  list.push({ kind: 'solid', paths: slab(uprightBack, RAIL.h + 5, BRIDGE.z - RAIL.h - 5, 3), tone: 'mid' });
  list.push({ kind: 'solid', paths: slab(bridge, BRIDGE.z, BRIDGE.h, 3, 0.6), tone: 'mid', inner: seam(sideSeam(bridge, BRIDGE.z + 2.4, P, 3)) });
  list.push({ kind: 'line', d: planOutline({ x: px - 1, y: bridge.y + 6, w: 2, d: bridge.d - 12, r: 1 }, BRIDGE.z + BRIDGE.h, P, 3), tone: 'faint' });
  list.push({ kind: 'solid', paths: slab(carriage, BRIDGE.z + BRIDGE.h, 7, 3, 0.6), tone: 'mid' });
  list.push({ kind: 'dots', points: corners(carriage, 2.6).map(([x, y]) => at([x, y, BRIDGE.z + BRIDGE.h + 7])), size: 0.5, tone: 'mid' });
  // The pen's head on the carriage: a lift solenoid with its cap.
  list.push({ kind: 'solid', paths: cyl(px, py, 4.2, BRIDGE.z + BRIDGE.h + 7, 6, 24, 0.4), tone: 'hi' });
  list.push({ kind: 'solid', paths: cyl(px, py, 2.6, BRIDGE.z + BRIDGE.h + 13, 1.6, 20, 0.3), tone: 'mid' });
  list.push({ kind: 'solid', paths: slab(truckFront, RAIL.h, 5, 3, 0.5), tone: 'mid' });
  list.push({ kind: 'solid', paths: slab(uprightFront, RAIL.h + 5, BRIDGE.z - RAIL.h - 5, 3), tone: 'mid' });
  return list;
}

// ------------------------------------------------------------------- the ink
/** One tree branch on the board's face, as screen end points. */
export function branchInk(from: Vec2, to: Vec2): [Flat, Flat] {
  return [inkPoint(from), inkPoint(to)];
}

/** The found path on the board's face. */
export function pathInk(path: Vec2[]): string {
  return onTop(path.map(boardOf), BOARD_Z, P);
}

/** A line along the board's face between two planning points (for tests). */
export const boardLine = (a: Vec2, b: Vec2) => lineOnTop(boardOf(a), boardOf(b), BOARD_Z, P);

/** The screen offset of the gantry for a pen move, for tests and transforms. */
export const shiftOf = (from: Vec2, to: Vec2) => translateAlong(P, [(to.x - from.x) * CELL, (to.y - from.y) * CELL, 0]);
