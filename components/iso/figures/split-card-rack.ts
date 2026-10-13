/**
 * The split card rack for SplitRiffle, drawn with the isometric kit.
 *
 * The object is the explanation: twenty episode cards stand in a channel,
 * five recorded in each of four scenes, and each card is printed with its
 * scene's shape. A punched program strip on the channel's front is the
 * split definition: wherever it has a hole, a lift pin rises through it and
 * raises that card against the test rail (the one lit part). The raised
 * cards are the test set; the cards left in the channel are the training
 * set. A random split raises cards from three or four scenes, and each of
 * those scenes still has cards down in training; holding out scene 4 raises
 * that whole group and leaves no card of its shape behind.
 *
 * World units are about a millimetre: x along the channel, y toward the
 * viewer, z up. Every static path is built once here; the cards and their
 * pins are built down in the channel and lifted with `liftShift`, and the
 * program strip's holes are built per split.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  segment,
  sideRing,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 600;
export const HEIGHT = 222;
export const AZIMUTH = 72;
export const ELEVATION = 30;

// ------------------------------------------------------------ the model
export const SCENES = 4;
export const PER_SCENE = 5;
export const EPISODES = SCENES * PER_SCENE;
/** The test set's size in both splits: a quarter of the episodes. */
export const TEST_SIZE = 5;
export const sceneOf = (episode: number) => Math.floor(episode / PER_SCENE) + 1;

/** A small seeded generator, so the one random draw is the same on the server and in every test. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One random draw of five test episodes out of twenty (a seeded shuffle), in rack order. */
export const RANDOM_TEST: readonly number[] = (() => {
  const random = mulberry32(7);
  const order = Array.from({ length: EPISODES }, (_, k) => k);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return order.slice(0, TEST_SIZE).sort((a, b) => a - b);
})();
/** Holding out scene 4: its five episodes are the test set. */
export const HOLDOUT_TEST: readonly number[] = Array.from({ length: PER_SCENE }, (_, k) => (SCENES - 1) * PER_SCENE + k);

export type SplitMode = 'random' | 'holdout';
export const testSetOf = (mode: SplitMode) => (mode === 'random' ? RANDOM_TEST : HOLDOUT_TEST);

/** The scenes in the test set, and those of them the training set also holds. */
export function leakOf(test: readonly number[]) {
  const training = Array.from({ length: EPISODES }, (_, k) => k).filter((k) => !test.includes(k));
  const inTraining = new Set(training.map(sceneOf));
  const testScenes = [...new Set(test.map(sceneOf))].sort((a, b) => a - b);
  return { testScenes, leaked: testScenes.filter((scene) => inTraining.has(scene)) };
}

const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
/** Every way to draw five test episodes of twenty, and how many of them keep a whole scene out of training. */
export const RANDOM_DRAWS = choose(EPISODES, TEST_SIZE);
export const DRAWS_HOLDING_A_SCENE_OUT = SCENES * choose(EPISODES - PER_SCENE, TEST_SIZE - PER_SCENE);

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -194, y: -26, w: 388, d: 58, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;
/** The channel the cards stand in: floor, back and front walls. */
const CHANNEL: Plan = { x: -174, y: -12, w: 348, d: 24, r: 2 };
const FLOOR_H = 3;
const WALL_H = 13;
const WALL_T = 3;
/** One card: width along the channel, thickness, height; the lift raises a test card this far. */
const CARD_W = 12.4;
const CARD_T = 2.4;
const CARD_H = 32;
export const LIFT = 22;
/** Where episode `k`'s card stands: five to a scene, a gap between scenes. */
export const cardX = (k: number) => -156 + k * 14.2 + Math.floor(k / PER_SCENE) * 9;
/** The test rail behind the raised cards, on two posts. */
const RAIL: Plan = { x: -170, y: -9, w: 340, d: 4, r: 1 };
const RAIL_Z = FLOOR_H + LIFT + 14;
const RAIL_H = 6;
/** The program strip in its holder on the channel's front face. */
const FACE = CHANNEL.y + CHANNEL.d;
const STRIP_Z: [number, number] = [4.5, 10.5];

const LABEL: Plan = { x: 108, y: 19.5, w: 60, d: 8, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
extremes.push([CHANNEL.x, -9, RAIL_Z + RAIL_H + 4], [CHANNEL.x + CHANNEL.w, -9, RAIL_Z + RAIL_H + 4], [cardX(0), 0, FLOOR_H + LIFT + CARD_H]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 10, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The clip that hides a lift pin below the channel's floor: everything above the floor's line under the cards. */
export const PIN_CLIP = pathOf([at([-400, 0, FLOOR_H]), at([400, 0, FLOOR_H]), [at([400, 0, FLOOR_H])[0], -2000], [at([-400, 0, FLOOR_H])[0], -2000]], true);

/** The screen offset that lifts a card and its pin by `share` of the lift. */
export const liftShift = (share: number) => translateAlong(P, [0, 0, LIFT * share]);

// ------------------------------------------------------------ the cards
/** The outline of scene `scene`'s shape, in a face's own (u right, v up) units: a disc, a square, a triangle, a hexagon. */
export function sceneShape(scene: number, r: number): Flat[] {
  const polygon = (count: number, radius: number, turn: number) =>
    Array.from({ length: count }, (_, k) => {
      const a = turn + (k / count) * Math.PI * 2;
      return [radius * Math.cos(a), radius * Math.sin(a)] as Flat;
    });
  if (scene === 1) return polygon(32, r, 0);
  if (scene === 2) return polygon(4, r * 1.2, Math.PI / 4);
  if (scene === 3) return polygon(3, r * 1.3, Math.PI / 2);
  return polygon(6, r * 1.1, 0);
}

/** A shape drawn on the face y = `y`, centred at (x, z). */
const onFace = (shape: Flat[], x: number, y: number, z: number) => pathOf(shape.map(([u, v]) => at([x + u, y, z + v])), true);

export interface CardParts {
  pin: SolidPaths;
  card: SolidPaths;
  /** The scene's shape printed on the card's face, and the episode's two rule lines under it. */
  print: string;
  rules: string;
}
/** Episode `k`'s card, standing down in the channel, with the lift pin under it. */
export function cardParts(k: number): CardParts {
  const x = cardX(k);
  const z = FLOOR_H;
  const face = CARD_T / 2;
  return {
    pin: cyl(x, 0, 1.3, z - LIFT, LIFT + 0.2, 16),
    card: slab({ x: x - CARD_W / 2, y: -CARD_T / 2, w: CARD_W, d: CARD_T, r: 0.4 }, z, CARD_H, 2, 0.3),
    print: onFace(sceneShape(sceneOf(k), 3.6), x, face, z + 22),
    rules: [8.5, 6].map((h) => pathOf([at([x - 3.6, face, z + h]), at([x + (h > 7 ? 3.6 : 1.6), face, z + h])])).join(''),
  };
}
export const CARDS: readonly CardParts[] = Array.from({ length: EPISODES }, (_, k) => cardParts(k));

// ------------------------------------------------------ the program strip
/** The punched strip for a split: a hole wherever a card is to rise. */
export function stripHoles(test: readonly number[]): string {
  const zc = (STRIP_Z[0] + STRIP_Z[1]) / 2;
  return test.map((k) => sideRing([cardX(k), FACE + 1.2, zc], 2, 'y', P, 20)).join('');
}

// ---------------------------------------------------------------- parts
export type Slot = 'cards' | 'strip' | 'knob';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: Slot };

const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screws = (points: Point3[], size = 0.5) => put({ kind: 'dots', points: points.map(at), size });

// The base: a plate on four turned feet, with a groove and corner screws.
put({ kind: 'line', d: slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, tone: 'faint' });
for (const [x, y] of byDepth([
  [BASE.x + 22, BASE.y + 14],
  [BASE.x + BASE.w - 22, BASE.y + 14],
  [BASE.x + 22, BASE.y + BASE.d - 14],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 14],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.8, 28), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, 28), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.4), tone: 'mid' });
put({ kind: 'line', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
{
  const corners: Array<[number, number]> = [
    [BASE.x + 8, BASE.y + 8],
    [BASE.x + BASE.w - 8, BASE.y + 8],
    [BASE.x + 8, BASE.y + BASE.d - 8],
    [BASE.x + BASE.w - 8, BASE.y + BASE.d - 8],
  ];
  put({ kind: 'line', d: corners.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  screws(corners.map(([x, y]) => [x, y, 0] as Point3), 0.55);
}

// The test rail on its two posts, behind where the raised cards stand: the one lit part.
for (const x of [RAIL.x - 3, RAIL.x + RAIL.w + 3]) {
  put({ kind: 'solid', paths: cyl(x, -7, 6, 0, 2.4, 24), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, -7, 3.2, 2.4, RAIL_Z + RAIL_H - 2.4, 20), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(RAIL, RAIL_Z, RAIL_H, 2, 0.4), tone: 'hi', lit: true });
put({ kind: 'dots', points: [at([RAIL.x + 3, RAIL.y + 2, RAIL_Z + RAIL_H]), at([RAIL.x + RAIL.w - 3, RAIL.y + 2, RAIL_Z + RAIL_H])], size: 0.5 });

// The channel: its floor with the pin bores, the back wall, the cards (drawn by the figure), the front wall.
put({ kind: 'solid', paths: slab(CHANNEL, 0, FLOOR_H, 3, 0.4), tone: 'mid' });
put({ kind: 'solid', paths: slab({ x: CHANNEL.x, y: CHANNEL.y, w: CHANNEL.w, d: WALL_T, r: 0.6 }, FLOOR_H, WALL_H, 2), tone: 'mid' });
put({ kind: 'line', d: Array.from({ length: EPISODES }, (_, k) => ring(cardX(k), 0, 2, FLOOR_H, P, 16)).join(''), tone: 'lo' });
put({ kind: 'slot', slot: 'cards' });
{
  const front: Plan = { x: CHANNEL.x, y: FACE - WALL_T, w: CHANNEL.w, d: WALL_T, r: 0.6 };
  put({ kind: 'solid', paths: slab(front, FLOOR_H, WALL_H, 2, 0.4), tone: 'mid' });
  // The strip holder: two lips along the front face, end blocks, and the scene bounds.
  const lips = [STRIP_Z[0] - 1, STRIP_Z[1] + 1];
  for (const z of lips) put({ kind: 'solid', paths: slab({ x: CHANNEL.x + 6, y: FACE, w: CHANNEL.w - 12, d: 1.6, r: 0.3 }, z - 0.6, 1.2, 2), tone: 'mid' });
  put({ kind: 'solid', paths: slab({ x: CHANNEL.x + 6, y: FACE, w: CHANNEL.w - 12, d: 1.2, r: 0.3 }, STRIP_Z[0], STRIP_Z[1] - STRIP_Z[0], 2), tone: 'hi' });
  put({ kind: 'slot', slot: 'strip' });
  put({ kind: 'line', d: Array.from({ length: SCENES - 1 }, (_, s) => {
    const x = (cardX(s * PER_SCENE + PER_SCENE - 1) + cardX((s + 1) * PER_SCENE)) / 2;
    return segment([x, FACE + 1.2, STRIP_Z[0]], [x, FACE + 1.2, STRIP_Z[1]], P);
  }).join(''), tone: 'lo' });
  for (const x of [CHANNEL.x + 2, CHANNEL.x + CHANNEL.w - 8]) {
    put({ kind: 'solid', paths: slab({ x, y: FACE, w: 6, d: 2.4, r: 0.5 }, STRIP_Z[0] - 2, STRIP_Z[1] - STRIP_Z[0] + 4, 2), tone: 'mid' });
  }
  screws([[CHANNEL.x + 5, FACE + 2.4, (STRIP_Z[0] + STRIP_Z[1]) / 2], [CHANNEL.x + CHANNEL.w - 5, FACE + 2.4, (STRIP_Z[0] + STRIP_Z[1]) / 2]], 0.45);
}

// The selector at the channel's right end: a block, a dial plate and its knob (drawn by the figure).
{
  const block: Plan = { x: CHANNEL.x + CHANNEL.w + 2, y: -12, w: 12, d: 24, r: 1.6 };
  put({ kind: 'solid', paths: slab(block, 0, 18, 2, 0.4), tone: 'mid', inner: sideSeam(block, 6, P, 2) });
  put({ kind: 'line', d: ring(block.x + 6, 0, 4.6, 18, P, 28), tone: 'lo' });
  put({ kind: 'slot', slot: 'knob' });
}

// A label plate on the base at the front right, with three engraved rules.
put({ kind: 'solid', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  d: [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 2.6 + row * 2], [LABEL.x + (row === 1 ? 30 : 46), LABEL.y + 2.6 + row * 2]], 0.8, P)).join(''),
  tone: 'lo',
  free: true,
});
screws([[LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8]]);

export const PARTS: readonly Part[] = parts;

/** The selector knob and its pointer, set to a split: back for random, forward for hold-out. */
export function knobParts(mode: SplitMode): { knob: SolidPaths; pointer: string } {
  const cx = CHANNEL.x + CHANNEL.w + 8;
  const a = ((mode === 'random' ? 200 : 340) * Math.PI) / 180;
  return {
    knob: cyl(cx, 0, 3.4, 18, 3.4, 24, 0.3),
    pointer: onTop([[cx, 0], [cx + 3.2 * Math.cos(a), 3.2 * Math.sin(a)]], 21.4, P),
  };
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
