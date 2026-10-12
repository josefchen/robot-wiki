/**
 * The graphics-card test bench for RobotsPerGpu, drawn with the isometric kit.
 *
 * The object is the explanation: a graphics card lies open on a bench with
 * its cooler set aside, so the chip shows. The chip's face is a grid of
 * 16 by 8 tiles, and each tile stands for one block of 128 simulated robots.
 * A magnifier on a stand hangs over the first tile and shows its 128 robots
 * as a grid of dots: the count a CPU simulator ran at once. Picking a count
 * lights that many tiles in reading order, 1, 32 or all 128, which is the
 * scale-up Rudin and colleagues report on one workstation GPU.
 *
 * World units are about a millimetre at twice the real card's size: x along
 * the card, y across it (toward the viewer is +y), z up. Every static path
 * is built once here; the tiles are drawn lit or plain by the live code,
 * which only changes their opacity.
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

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 54;
export const ELEVATION = 36;

/** The chip's tiles: 16 across, 8 deep. */
export const COLUMNS = 16;
export const ROWS = 8;
export const TILES = COLUMNS * ROWS;

export type Group = 'static';
export type LiveId = 'tiles' | 'lens';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'fill'; group: Group; d: string; shade: 'paper' | 0 | 1 | 2 | 3 | 'top' }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -140, y: -84, w: 284, d: 150, r: 9 };
const BASE_H = 8;
const FOOT_H = 5;

/** The card: its board on four standoffs, the bracket at its far end, the gold fingers on its near edge. */
const PCB: Plan = { x: -112, y: -44, w: 196, d: 88, r: 3 };
const PCB_Z = 7;
const PCB_H = 1.8;
const TOP = PCB_Z + PCB_H;
const SUBSTRATE: Plan = { x: -40, y: -26, w: 72, d: 50, r: 2 };
const DIE: Plan = { x: -32, y: -16, w: 56, d: 28, r: 1 };
const DIE_Z = TOP + 2;
const DIE_TOP = DIE_Z + 1.8;
const PITCH = DIE.w / COLUMNS;

const COOLER: Plan = { x: -138, y: -79, w: 104, d: 30, r: 5 };
const SUPPLY: Plan = { x: 98, y: -46, w: 42, d: 30, r: 3 };
const LOUPE_FOOT: Plane = [-10, -64];
const LOUPE_Z = 34;
const LENS_R = 13;
const LABEL: Plan = { x: 92, y: 42, w: 40, d: 12, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([LOUPE_FOOT[0], LOUPE_FOOT[1], LOUPE_Z + 8], [PCB.x - 3, PCB.y - 4, 32]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group: 'static', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group: 'static', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group: 'static', points: points.map(at), size, tone });
const byDepth = <T extends Plane>(points: T[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const fourScrews = (plan: Plan, inset: number, z: number, size = 0.45) =>
  dots(
    [
      [plan.x + inset, plan.y + inset, z],
      [plan.x + plan.w - inset, plan.y + inset, z],
      [plan.x + inset, plan.y + plan.d - inset, z],
      [plan.x + plan.w - inset, plan.y + plan.d - inset, z],
    ],
    size,
  );

// Base: a bench plate on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth<Plane>([
  [BASE.x + 22, BASE.y + 18],
  [BASE.x + BASE.w - 22, BASE.y + 18],
  [BASE.x + 22, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 18],
])) {
  solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), 'lo');
  solid(cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.6, P, 8), innerTone: 'faint' });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  line(screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo');
  dots(screws.map(([x, y]): Point3 => [x, y, 0]), 0.55);
}

// The cooler, lifted off the card and set down behind it: a long shroud with two fans, hub caps and blades.
{
  solid(slab(COOLER, 0, 9, 8, 0.8), 'mid', { inner: sideSeam(COOLER, 3.4, P, 8), innerTone: 'faint' });
  for (const cx of [COOLER.x + 27, COOLER.x + 77]) {
    const cy = COOLER.y + COOLER.d / 2;
    put({ kind: 'fill', group: 'static', shade: 1, d: pathOf(Array.from({ length: 48 }, (_, i) => at([cx + 12.5 * Math.cos((i / 48) * Math.PI * 2), cy + 12.5 * Math.sin((i / 48) * Math.PI * 2), 9])), true) });
    line(ring(cx, cy, 12.5, 9, P, 48), 'lo');
    const blades: string[] = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const points: Plane[] = [];
      for (let s = 0; s <= 6; s++) {
        const r = 4.6 + (7.6 * s) / 6;
        const b = a + 0.55 * (s / 6);
        points.push([cx + r * Math.cos(b), cy + r * Math.sin(b)]);
      }
      blades.push(onTop(points, 9, P));
    }
    line(blades.join(''), 'mid');
    solid(cyl(cx, cy, 4.6, 9, 1.4, 28, 0.3), 'mid');
    dots([[cx, cy, 10.4]], 0.5);
  }
  fourScrews(COOLER, 4, 9);
}

// The bench supply at the back right, with its switch, knob and the cable to the card's power connectors.
{
  solid(slab(SUPPLY, 0, 22, 4, 0.8), 'mid', { inner: sideSeam(SUPPLY, 16, P, 4), innerTone: 'faint' });
  line(planOutline(insetPlan(SUPPLY, 3), 22, P, 3), 'faint');
  solid(cyl(SUPPLY.x + 33, SUPPLY.y + 15, 4.2, 22, 1, 24), 'lo');
  solid(cyl(SUPPLY.x + 33, SUPPLY.y + 15, 3.4, 23, 3.4, 24), 'mid');
  line(knurl(SUPPLY.x + 33, SUPPLY.y + 15, 3.4, 23, 26.4, 18, P), 'lo');
  line(lineOnTop([SUPPLY.x + 33, SUPPLY.y + 15], [SUPPLY.x + 35.4, SUPPLY.y + 12.8], 26.4, P), 'hi', 'end');
  solid(slab({ x: SUPPLY.x + 9, y: SUPPLY.y + 11, w: 10, d: 7, r: 1 }, 22, 1.2, 2), 'lo');
  solid(slab({ x: SUPPLY.x + 12.5, y: SUPPLY.y + 12, w: 3, d: 5, r: 0.6 }, 23.2, 2.4, 2), 'hi');
  line([0, 1, 2, 3].map((k) => planOutline({ x: SUPPLY.x + 6 + k * 9, y: SUPPLY.y + 23, w: 5, d: 2, r: 1 }, 22, P, 3)).join(''), 'lo');
  fourScrews(SUPPLY, 2.4, 22, 0.4);
}

// The magnifier's stand behind the card: a weighted foot, a post with a clamp collar.
const LOUPE_ARM_END: Plane = [DIE.x + PITCH / 2, DIE.y + PITCH / 2];
{
  const [fx, fy] = LOUPE_FOOT;
  solid(cyl(fx, fy, 11, 0, 4, 48, 0.6), 'mid');
  dots(Array.from({ length: 3 }, (_, i): Point3 => [fx + 8 * Math.cos(i * 2.1 + 0.6), fy + 8 * Math.sin(i * 2.1 + 0.6), 4]), 0.45);
  solid(cyl(fx, fy, 2.8, 4, LOUPE_Z - 2, 20), 'mid', { inner: sideArc(fx, fy, 2.8, 24, P, 16), innerTone: 'faint' });
  solid(cyl(fx, fy, 4.4, LOUPE_Z - 6, 7, 28, 0.4), 'mid');
  line(knurl(fx, fy, 4.4, LOUPE_Z - 6, LOUPE_Z + 1, 18, P, 0), 'faint');
}

// The bracket at the card's far end, with its vent slots and two screws along its top edge.
{
  const BRACKET: Plan = { x: PCB.x - 2.4, y: PCB.y - 4, w: 2.4, d: PCB.d + 8, r: 0.4 };
  solid(slab(BRACKET, 0, 30, 2), 'mid');
  const face = PCB.x;
  const slot = (y0: number, z0: number) =>
    pathOf(
      [
        [y0, z0],
        [y0 + 22, z0],
        [y0 + 22, z0 + 2.2],
        [y0, z0 + 2.2],
      ].map(([y, z]) => at([face, y as number, z as number])),
      true,
    );
  line([0, 1, 2].flatMap((col) => [0, 1, 2].map((row) => slot(BRACKET.y + 8 + col * 28, 14 + row * 4.6))).join(''), 'lo');
  dots([[face, BRACKET.y + 4, 30], [face, BRACKET.y + BRACKET.d - 4, 30]], 0.55);
}

// The card: four standoffs, the board with its edge seam, the bracket and its vents, and the gold fingers.
const FINGERS: Plan = { x: -66, y: PCB.y + PCB.d, w: 104, d: 7, r: 0.6 };
{
  for (const [x, y] of byDepth<Plane>([
    [PCB.x + 8, PCB.y + 8],
    [PCB.x + PCB.w - 14, PCB.y + 8],
    [PCB.x + 8, PCB.y + PCB.d - 8],
    [PCB.x + PCB.w - 14, PCB.y + PCB.d - 8],
  ])) {
    solid(cyl(x, y, 3.4, 0, 1, 20), 'lo');
    solid(cyl(x, y, 2.4, 1, PCB_Z - 1, 16), 'mid');
  }
  solid(slab(FINGERS, PCB_Z, PCB_H * 0.8, 2), 'lo');
  line(
    Array.from({ length: 26 }, (_, i) => planOutline({ x: FINGERS.x + 2 + i * 3.9, y: FINGERS.y + 1, w: 2.4, d: 5, r: 0.4 }, PCB_Z + PCB_H * 0.8, P, 2)).join(''),
    'lo',
  );
  solid(slab(PCB, PCB_Z, PCB_H, 4, 0.5), 'lo');
  fourScrews(PCB, 4, TOP, 0.5);
  line([PCB.x + 4, PCB.x + PCB.w - 10].map((x) => ring(x, PCB.y + 4, 1.8, TOP, P, 14) + ring(x, PCB.y + PCB.d - 4, 1.8, TOP, P, 14)).join(''), 'lo');
  // Traces from the chip to the fingers, in the board's faint copper tone, run between the memory chips.
  line([-38, -22, -6, 10, 26].map((x) => onTop([[x, SUBSTRATE.y + SUBSTRATE.d], [x, PCB.y + PCB.d]], TOP, P)).join(''), 'faint');
}

// Power: the VRM's chokes and capacitors at the right of the chip, and two 8-pin connectors on the far edge.
{
  for (const [x, y] of byDepth<Plane>(Array.from({ length: 6 }, (_, i): Plane => [46, -34 + i * 9]))) {
    solid(slab({ x: x, y: y, w: 7, d: 7, r: 0.8 }, TOP, 6, 2, 0.3), 'mid');
    dots([[x + 3.5, y + 3.5, TOP + 6]], 0.4);
  }
  for (const [x, y] of byDepth<Plane>(Array.from({ length: 6 }, (_, i): Plane => [60, -30 + i * 9]))) {
    solid(cyl(x, y, 2.8, TOP, 7, 20, 0.3), 'mid');
    line(ring(x, y, 1.6, TOP + 7, P, 14), 'faint');
  }
  for (const x of [56, 72]) {
    solid(slab({ x, y: PCB.y + 3, w: 13, d: 8, r: 1 }, TOP, 8, 2, 0.4), 'mid');
    put({ kind: 'dots', group: 'static', points: [0, 1, 2, 3].flatMap((c) => [0, 1].map((r) => at([x + 2.4 + c * 2.7, PCB.y + 5.2 + r * 3.4, TOP + 8]))), size: 0.55, tone: 'hi' });
  }
}

// Memory: twelve chips round the chip, each with its pin-one dot.
{
  const chips: Plane[] = [];
  for (const x of [-36, -20, -4, 12]) chips.push([x, -40], [x, 28]);
  for (const y of [-20, 2]) chips.push([-62, y], [36, y]);
  for (const [x, y] of byDepth(chips)) {
    const plan: Plan = { x, y, w: 12, d: 10, r: 0.6 };
    solid(slab(plan, TOP, 1.6, 2, 0.3), 'mid');
    dots([[x + 1.8, y + 1.8, TOP + 1.6]], 0.35);
  }
}

// The chip: its package substrate with a stiffener ring, the die, and the die's tile grid (live: lit or plain).
{
  solid(slab(SUBSTRATE, TOP, 2, 3, 0.4), 'lo');
  line(planOutline(insetPlan(SUBSTRATE, 2.4), TOP + 2, P, 3), 'faint');
  dots(Array.from({ length: 10 }, (_, i): Point3 => [SUBSTRATE.x + 6 + i * 6.6, SUBSTRATE.y + SUBSTRATE.d - 3.6, TOP + 2]), 0.32);
  solid(slab(DIE, DIE_Z, DIE_TOP - DIE_Z, 2, 0.3), 'hi');
}
put({ kind: 'live', group: 'static', id: 'tiles' });

// The magnifier: its arm from the collar out over the first tile, the lens ring, and the lens (live view).
{
  const [fx, fy] = LOUPE_FOOT;
  const [lx, ly] = LOUPE_ARM_END;
  const dx = lx - fx;
  const dy = ly - fy;
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  const [vx, vy] = [-uy, ux];
  const reach = length - LENS_R - 1;
  const arm: Plane[] = [
    [fx + vx * 2.2, fy + vy * 2.2],
    [fx + ux * reach + vx * 2.2, fy + uy * reach + vy * 2.2],
    [fx + ux * reach - vx * 2.2, fy + uy * reach - vy * 2.2],
    [fx - vx * 2.2, fy - vy * 2.2],
  ];
  solid(extrude(arm, LOUPE_Z - 1, 3, P, { bevel: 0.4 }), 'mid');
  solid(cyl(lx, ly, LENS_R + 2.2, LOUPE_Z - 2, 4, 72, 0.5), 'mid', { inner: sideArc(lx, ly, LENS_R + 2.2, LOUPE_Z, P, 36), innerTone: 'faint' });
}
put({ kind: 'live', group: 'static', id: 'lens' });

// A label plate at the front right, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.6 + row * 3], [LABEL.x + (row === 1 ? 26 : 36), LABEL.y + 3.6 + row * 3]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.6, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.6, LABEL.y + LABEL.d / 2, 0.8]], 0.5);

// The power cable: from the right-hand connector on the card, up and over to a socket on the supply's front.
{
  const socket: Point3 = [SUPPLY.x + 9, SUPPLY.y + SUPPLY.d, 9];
  solid(faceBoss(socket[0], socket[1], socket[2], 3.2, 1.6), 'mid');
  put({
    kind: 'wire',
    group: 'static',
    from: at([78.5, PCB.y + 7, TOP + 8]),
    via: [at([78.5, PCB.y + 7, 20]), at([88, PCB.y + 7, 20]), at([socket[0], socket[1] + 8, 13]), at([socket[0], socket[1] + 3.6, 9])],
    to: at([socket[0], socket[1] + 1.6, 9]),
    tone: 'mid',
  });
}

/** A short round boss standing out of a face that looks along +y: a socket on the supply's front. */
function faceBoss(cx: number, y: number, cz: number, r: number, depth: number, steps = 28): SolidPaths {
  const circle = (yy: number) =>
    Array.from({ length: steps }, (_, i): Flat => {
      const a = (i / steps) * Math.PI * 2;
      return at([cx + r * Math.cos(a), yy, cz + r * Math.sin(a)]);
    });
  const front = circle(y + depth);
  const outline = pathOf(hullOf([...circle(y), ...front]), true);
  return { fill: outline, outline, crease: '', top: pathOf(front, true), shades: ['', outline, '', ''] };
}

function hullOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Flat[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------------- live parts
/** The floor outline of tile k, in reading order (row by row along x). */
export function tilePlan(k: number): Plan {
  const column = k % COLUMNS;
  const row = Math.floor(k / COLUMNS);
  return { x: DIE.x + column * PITCH + 0.35, y: DIE.y + row * PITCH + 0.35, w: PITCH - 0.7, d: PITCH - 0.7, r: 0.3 };
}

/** Each tile's face on the die, as a closed path. */
export const TILE_PATHS: readonly string[] = Array.from({ length: TILES }, (_, k) => planOutline(tilePlan(k), DIE_TOP, P, 1));

/** The lens and what it shows: the first tile magnified, its 128 robots as a 16 by 8 grid of dots. */
export const LENS = (() => {
  const [lx, ly] = LOUPE_ARM_END;
  const z = LOUPE_Z + 2;
  const glass = pathOf(Array.from({ length: 72 }, (_, i) => at([lx + LENS_R * Math.cos((i / 72) * Math.PI * 2), ly + LENS_R * Math.sin((i / 72) * Math.PI * 2), z])), true);
  const half = 9.6;
  const tile = planOutline({ x: lx - half, y: ly - half / 2 - 0.4, w: half * 2, d: half + 0.8, r: 0.6 }, z, P, 2);
  const robots: Flat[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) robots.push(at([lx - half + 0.9 + column * 1.18, ly - half / 2 + 0.6 + row * 1.18, z]));
  }
  return { glass, tile, robots };
})();
