/**
 * The card reader with a carousel for ReplayReuse, drawn with the isometric kit.
 *
 * The object is the explanation. Each round of collecting brings one batch
 * of robot experience, a punched card that comes out between the feed
 * rollers on the tower at the left and slides down the ramp into the pocket
 * under the reading head (the learner, the one lit part). The head drops its
 * pins onto the card: that is a read. What happens next is the learner's
 * choice, set by the plow over the turntable:
 *
 * - Fresh experience only (on-policy): the plow is down. The turntable
 *   indexes one pocket, the plow's blade pushes the card off the rim, and it
 *   slides down the chute into the waste bin. The head only ever reads the
 *   newest card.
 * - Reuse saved experience (off-policy): the plow is raised. The card stays
 *   in its pocket, and every round the turntable carries each stored card
 *   back under the head, so every card is read again.
 *
 * The counter dial at the front right shows it: a peg rises for every batch
 * collected so far, and the needle points at how many of them the learner
 * learns from.
 *
 * World units are about a millimetre: x to the right along the bench, y
 * toward the viewer, z up. Static parts are built once here; the cards, the
 * pocket marks, the plow's lift, the head's dip and the needle are rebuilt
 * or moved by the live code from `poseAt`, the one timeline of the model.
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
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong, plateIn } from '../prism.ts';
import { steadySolid } from '../steady-path.ts';

export const WIDTH = 600;
export const AZIMUTH = 55;
export const ELEVATION = 34;

// ------------------------------------------------------------- the model
export type LearnerId = 'on' | 'off';
/** Rounds of collecting the figure plays: one batch of experience arrives each round. */
export const ROUNDS = 6;
/** Batches the latest update may learn from after `round` rounds. */
export const usableBatches = (learner: LearnerId, round: number) => (learner === 'on' ? Math.min(1, round) : round);

// ------------------------------------------------------------ the layout
const BASE: Plan = { x: -174, y: -76, w: 308, d: 172, r: 10 };
const BASE_H = 9;
const FOOT_H = 6;

/** The turntable: its centre, its top face and the radius its pockets sit on. */
export const C: Plane = [40, -5];
const DISC_R = 56;
export const TOP = 20;
const DISC_Z = 13;
export const POCKET_R = 36;
/** The pocket under the head faces the feed; one index turns the turntable a sixth. */
export const HEAD_ANGLE = Math.PI;
export const STEP = Math.PI / 3;
/** Where the plow meets a card: one index after the head. */
export const PLOW_ANGLE = HEAD_ANGLE - STEP;

/** A card: one batch of experience. Long axis along u (out of its pocket), across along v. */
const CARD_A = 13;
const CARD_B = 8;
const CARD_T = 0.9;
const CARD_OUTLINE: Array<[number, number]> = [
  [-CARD_A, -CARD_B],
  [CARD_A, -CARD_B],
  [CARD_A, CARD_B - 2.2],
  [CARD_A - 2.2, CARD_B],
  [-CARD_A, CARD_B],
];

/** The feed tower and the ramp down to the pocket under the head. */
const TOWER: Plan = { x: -166, y: -17, w: 26, d: 24, r: 2 };
const TOWER_TOP = 42;
const PLATFORM: Plan = { x: -168, y: -17, w: 30, d: 24, r: 1.6 };
const DECK = 44;
const FEED_Y = -5;
const RAMP_X0 = -138;
const RAMP_X1 = -28;
const LIP: Plan = { x: RAMP_X1, y: -14, w: 11.4, d: 18, r: 0.8 };
const ROLLER_X = -161;
const ROLLER_R = 4;

/** The reading head on its arm, cantilevered from a column behind the turntable. */
export const HEAD_X = C[0] + POCKET_R * Math.cos(HEAD_ANGLE);
const COLUMN: Plane = [HEAD_X, -64];
const ARM_Z = 50;
const HEAD: Plan = { x: HEAD_X - 12, y: FEED_Y - 7, w: 24, d: 14, r: 1.6 };
const HEAD_Z: [number, number] = [31, 40];
const PIN_Z = 26.2;
/** How far the head drops to read: its pins reach the card's face. */
export const DIP = 5.2;

/** The plow on its post outside the rim, in front of the turntable. */
const POST: Plane = [C[0] + 62 * Math.cos(Math.PI * (78 / 180)), C[1] + 62 * Math.sin(Math.PI * (78 / 180))];
export const PLOW_LIFT = 11;
const BLADE_H = 5.5;

/** The chute from the rim into the waste bin, and the bin. */
const OUT: Point3 = [Math.cos(PLOW_ANGLE), Math.sin(PLOW_ANGLE), 0];
const ACROSS: Point3 = [-Math.sin(PLOW_ANGLE), Math.cos(PLOW_ANGLE), 0];
const CHUTE_R: [number, number] = [56.6, 73];
const CHUTE_Z: [number, number] = [TOP - 0.3, 11.6];
const CHUTE_W = 9.4;
const BIN: Plan = { x: -24, y: 46, w: 44, d: 44, r: 2 };
const BIN_FLOOR = 2.4;
const BIN_H = 15;
const WALL = 2.4;
const PILE_R = 84;

/** The counter dial and the label plate. */
const DIAL: Plane = [98, 66];
const DIAL_R = 17;
const DIAL_Z = 11;
const PEG_R = 11.2;
const LABEL: Plan = { x: -156, y: 76, w: 48, d: 9, r: 1.6 };

// ------------------------------------------------------------ the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
extremes.push(
  [TOWER.x, TOWER.y, DECK + 12],
  [TOWER.x + TOWER.w, TOWER.y + TOWER.d, DECK + 12],
  [COLUMN[0] - 8, COLUMN[1] - 8, ARM_Z + 8],
  [HEAD.x, HEAD.y, ARM_Z + 8],
  [POST[0], POST[1], 46],
);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flat0 = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flat0.map(([x]) => x)) - Math.min(...flat0.map(([x]) => x));
const spanY = Math.max(...flat0.map(([, y]) => y)) - Math.min(...flat0.map(([, y]) => y));
const PAD = 8;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanY) / spanX + 2 * PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const polar = (angle: number, r: number, z: number): Point3 => [C[0] + r * Math.cos(angle), C[1] + r * Math.sin(angle), z];

// ------------------------------------------------------------- parts
export type Slot = 'marks' | 'tableCards' | 'plow' | 'binCards' | 'head' | 'dial';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: Slot };

let into: Part[] = [];
const put = (part: Part) => into.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', paths: steadySolid(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', d, tone, free });
const screws = (points: Point3[], size = 0.5) => put({ kind: 'dots', points: points.map(at), size });
const collect = (build: () => void): Part[] => {
  const saved = into;
  into = [];
  build();
  const out = into;
  into = saved;
  return out;
};

const parts: Part[] = [];
into = parts;

// The base: a plate on four turned feet, with a groove and corner screws.
line(slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, 'faint');
for (const [x, y] of byDepth([
  [BASE.x + 24, BASE.y + 18],
  [BASE.x + BASE.w - 24, BASE.y + 18],
  [BASE.x + 24, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 24, BASE.y + BASE.d - 18],
])) {
  solid(cyl(x, y, 9, -BASE_H - FOOT_H, 2, 28), 'lo');
  solid(cyl(x, y, 6.8, -BASE_H - FOOT_H + 2, FOOT_H - 2, 28), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -3, P, 8) });
line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
{
  const corners: Plane[] = [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ];
  line(corners.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo');
  screws(corners.map(([x, y]) => [x, y, 0] as Point3), 0.55);
}

// The column that carries the reading head's arm, behind the turntable.
solid(cyl(COLUMN[0], COLUMN[1], 9, 0, 3, 28, 0.4), 'lo');
screws([0, 1, 2, 3].map((k) => [COLUMN[0] + 7 * Math.cos(k * Math.PI / 2 + 0.6), COLUMN[1] + 7 * Math.sin(k * Math.PI / 2 + 0.6), 3] as Point3), 0.45);
solid(cyl(COLUMN[0], COLUMN[1], 4.6, 3, ARM_Z - 3, 24), 'mid', { inner: sideArc(COLUMN[0], COLUMN[1], 4.6, 24, P, 20) });

// The feed tower: a box on the base, a platform on top, a pair of feed rollers in their cheeks.
solid(slab(TOWER, 0, TOWER_TOP, 3, 0.6), 'mid', { inner: sideSeam(TOWER, 8, P, 3) + sideSeam(TOWER, TOWER_TOP - 8, P, 3) });
line(
  [0, 1, 2, 3, 4].map((k) => {
    const z = 14 + k * 3.2;
    return pathOf([at([TOWER.x + TOWER.w, TOWER.y + 5, z]), at([TOWER.x + TOWER.w, TOWER.y + TOWER.d - 5, z])]);
  }).join(''),
  'lo',
);
line(planOutline({ x: TOWER.x + TOWER.w - 0.01, y: TOWER.y + 3.6, w: 0.01, d: TOWER.d - 7.2, r: 0 }, 0, P), 'faint');
solid(slab(PLATFORM, TOWER_TOP, DECK - TOWER_TOP, 3, 0.5), 'mid');
screws([[PLATFORM.x + 3, PLATFORM.y + 3, DECK], [PLATFORM.x + 3, PLATFORM.y + PLATFORM.d - 3, DECK]], 0.45);
{
  const cheekBack: Plan = { x: ROLLER_X - 5, y: FEED_Y - CARD_B - 3.6, w: 10, d: 2.2, r: 0.6 };
  const cheekFront: Plan = { ...cheekBack, y: FEED_Y + CARD_B + 1.4 };
  const axleZ = DECK + CARD_T + ROLLER_R + 0.2;
  solid(slab(cheekBack, DECK, axleZ + 3.6 - DECK, 2, 0.3), 'mid');
  // The upper roller across the feed path, between its cheeks, on an axle along y.
  solid(discAlong([ROLLER_X, cheekBack.y + cheekBack.d, axleZ], [0, 1, 0], ROLLER_R, cheekFront.y - cheekBack.y - cheekBack.d, P, 32), 'mid');
  line(
    [0.25, 0.5, 0.75].map((f) => {
      const y = cheekBack.y + cheekBack.d + f * (cheekFront.y - cheekBack.y - cheekBack.d);
      const a = Math.PI * 0.62;
      return pathOf(Array.from({ length: 9 }, (_, k) => {
        const t = -a / 2 + (k / 8) * a + 0.15;
        return at([ROLLER_X + ROLLER_R * Math.cos(t) * 0.999, y, axleZ + ROLLER_R * Math.sin(t)]);
      }));
    }).join(''),
    'faint',
  );
  solid(slab(cheekFront, DECK, axleZ + 3.6 - DECK, 2, 0.3), 'mid');
  solid(discAlong([ROLLER_X, cheekFront.y + cheekFront.d, axleZ], [0, 1, 0], 1.6, 1.2, P, 16), 'lo');
  screws([[ROLLER_X, cheekFront.y + cheekFront.d + 1.2, axleZ]], 0.45);
}

// The ramp: two legs, a sloping deck with side rails, and the lip that meets the turntable's rim.
const rampZ = (x: number) => lerp(DECK, TOP, (x - RAMP_X0) / (RAMP_X1 - RAMP_X0));
{
  const legX = -86;
  for (const y of [FEED_Y - 7.5, FEED_Y + 3.5]) {
    solid(slab({ x: legX - 2, y, w: 4, d: 4, r: 0.6 }, 0, rampZ(legX) - 1.6, 2), 'mid');
  }
  solid(slab({ x: legX - 6, y: FEED_Y - 10, w: 12, d: 20, r: 1.4 }, 0, 2, 3, 0.3), 'lo');
  screws([[legX - 4, FEED_Y - 8, 2], [legX + 4, FEED_Y + 8, 2]], 0.45);
  // The deck, 1.6 thick, its top running from the platform down to the lip.
  const u: Point3 = [RAMP_X1 - RAMP_X0, 0, TOP - DECK];
  const length = Math.hypot(u[0], u[2]);
  const ux: Point3 = [u[0] / length, 0, u[2] / length];
  const down: Point3 = [ux[2], 0, -ux[0]];
  const start = add([RAMP_X0, FEED_Y - 9, DECK], mul(down, 1.6));
  solid(plateIn(start, ux, [0, 1, 0], [[0, 0], [length, 0], [length, 18], [0, 18]], 1.6, P), 'mid');
  // Side rails along both edges.
  for (const y of [FEED_Y - 9.6, FEED_Y + 9.6]) {
    solid(barBetween([RAMP_X0, y, DECK + 0.4], [RAMP_X1, y, TOP + 0.4], [0, 1, 0], 1.2, 2.4, P), 'mid');
  }
  // A ruler strip of ticks on the deck's edge, one tick per round's card length.
  line(
    Array.from({ length: 9 }, (_, k) => {
      const x = RAMP_X0 + 6 + k * 12.5;
      return pathOf([at([x, FEED_Y + 9, rampZ(x)]), at([x, FEED_Y + 9 - (k % 4 === 0 ? 3.4 : 1.8), rampZ(x)])]);
    }).join(''),
    'lo',
  );
  // The lip: a block under the last stretch of the feed, level with the turntable's top.
  solid(slab({ x: LIP.x + 1, y: LIP.y + 3, w: LIP.w - 3, d: LIP.d - 6, r: 0.8 }, 0, TOP - 2, 2), 'mid');
  solid(slab(LIP, TOP - 2, 2, 2, 0.3), 'mid');
}

// The detent: a block on a short post at the back of the rim, whose roller clicks into each index.
{
  const angle = HEAD_ANGLE + STEP * 1.4;
  const [x, y] = [C[0] + 61 * Math.cos(angle), C[1] + 61 * Math.sin(angle)];
  solid(cyl(x, y, 5, 0, 2, 20), 'lo');
  solid(cyl(x, y, 2.6, 2, TOP - 6, 16), 'mid');
  solid(slab({ x: x - 4, y: y - 4, w: 8, d: 8, r: 1 }, TOP - 4, 6, 2, 0.3), 'mid');
  screws([[x, y, TOP + 2]], 0.45);
}

// The turntable: a pedestal, a column, the disc and its hub.
solid(cyl(C[0], C[1], 22, 0, 3, 48, 0.5), 'lo');
screws([0, 1, 2, 3, 4, 5].map((k) => [C[0] + 18.5 * Math.cos(k * STEP + 0.3), C[1] + 18.5 * Math.sin(k * STEP + 0.3), 3] as Point3), 0.45);
solid(cyl(C[0], C[1], 10, 3, DISC_Z - 3, 32), 'mid', { inner: sideArc(C[0], C[1], 10, 7, P, 24) });
solid(cyl(C[0], C[1], DISC_R, DISC_Z, TOP - DISC_Z, 96, 1), 'mid', { inner: sideArc(C[0], C[1], DISC_R, DISC_Z + 2.2, P, 64) });
line(ring(C[0], C[1], DISC_R - 4, TOP, P, 96), 'faint');
line(ring(C[0], C[1], 20, TOP, P, 56), 'faint');
put({ kind: 'slot', slot: 'marks' });
solid(cyl(C[0], C[1], 11, TOP, 3.4, 40, 0.5), 'mid');
line(knurl(C[0], C[1], 11, TOP + 0.4, TOP + 3, 44, P), 'lo');
solid(cyl(C[0], C[1], 5, TOP + 3.4, 1.4, 24), 'mid');
line(ring(C[0], C[1], 2, TOP + 4.8, P, 16), 'lo');
put({ kind: 'slot', slot: 'tableCards' });
put({ kind: 'slot', slot: 'plow' });

// The chute from the rim down into the bin, on a saddle that rests on the bin's back wall.
const chuteAt = (r: number, z: number, across = 0): Point3 => add(add([C[0], C[1], z], mul(OUT, r)), mul(ACROSS, across));
const CHUTE_SLOPE = Math.atan2(CHUTE_Z[0] - CHUTE_Z[1], CHUTE_R[1] - CHUTE_R[0]);
{
  const length = Math.hypot(CHUTE_R[1] - CHUTE_R[0], CHUTE_Z[0] - CHUTE_Z[1]);
  const along: Point3 = add(mul(OUT, Math.cos(CHUTE_SLOPE)), [0, 0, -Math.sin(CHUTE_SLOPE)]);
  const normal: Point3 = add(mul(OUT, Math.sin(CHUTE_SLOPE)), [0, 0, Math.cos(CHUTE_SLOPE)]);
  // Where the chute crosses the bin's back wall, a saddle carries it.
  const crossR = (BIN.y + WALL / 2 - C[1]) / OUT[1];
  const crossZ = lerp(CHUTE_Z[0], CHUTE_Z[1], (crossR - CHUTE_R[0]) / (CHUTE_R[1] - CHUTE_R[0]));
  const saddle = chuteAt(crossR, 0);
  solid(slab({ x: saddle[0] - 6, y: BIN.y - 0.6, w: 12, d: WALL + 1.2, r: 0.5 }, BIN_H, crossZ - 1.4 - BIN_H, 2), 'mid');
  const origin = add(chuteAt(CHUTE_R[0], CHUTE_Z[0], -CHUTE_W), mul(normal, -1.4));
  // plateIn's thickness runs along along × across, which points up and out of the deck.
  solid(plateIn(origin, along, ACROSS, [[0, 0], [length, 0], [length, CHUTE_W * 2], [0, CHUTE_W * 2]], 1.4, P), 'mid');
  for (const side of [-CHUTE_W - 0.6, CHUTE_W + 0.6]) {
    solid(barBetween(chuteAt(CHUTE_R[0], CHUTE_Z[0] + 1.1, side), chuteAt(CHUTE_R[1], CHUTE_Z[1] + 1.1, side), ACROSS, 1.2, 2.4, P), 'mid');
  }
}

// The waste bin: floor, back and left walls, the cards in it, then the right and front walls.
solid(slab(BIN, 0, BIN_FLOOR, 3, 0.4), 'lo');
const binWall = (plan: Plan, tone: Tone = 'mid') => solid(slab(plan, BIN_FLOOR, BIN_H - BIN_FLOOR, 2, 0.3), tone);
binWall({ x: BIN.x, y: BIN.y, w: BIN.w, d: WALL, r: 0.6 });
binWall({ x: BIN.x, y: BIN.y, w: WALL, d: BIN.d, r: 0.6 });
put({ kind: 'slot', slot: 'binCards' });
binWall({ x: BIN.x + BIN.w - WALL, y: BIN.y, w: WALL, d: BIN.d, r: 0.6 });
{
  const front: Plan = { x: BIN.x, y: BIN.y + BIN.d - WALL, w: BIN.w, d: WALL, r: 0.6 };
  solid(slab(front, BIN_FLOOR, BIN_H - BIN_FLOOR, 2, 0.3), 'mid', { inner: sideSeam(front, 6, P, 2) });
  screws([[BIN.x + 5, BIN.y + BIN.d, 10], [BIN.x + BIN.w - 5, BIN.y + BIN.d, 10]], 0.45);
}

// The arm across to the head, with its clamp on the column and the stem the head slides on.
{
  const clamp: Plan = { x: COLUMN[0] - 7, y: COLUMN[1] - 7, w: 14, d: 14, r: 2.4 };
  solid(slab(clamp, ARM_Z - 4, 11, 3, 0.5), 'mid', { inner: sideSeam(clamp, ARM_Z + 1.5, P, 3) });
  solid(slab({ x: HEAD_X - 4, y: COLUMN[1] + 7, w: 8, d: FEED_Y - COLUMN[1] - 3, r: 1.2 }, ARM_Z, 5, 3, 0.4), 'mid');
  // A thumb screw on the clamp's right face.
  solid(discAlong([clamp.x + clamp.w, COLUMN[1], ARM_Z + 1.5], [1, 0, 0], 1.4, 2.2, P, 16), 'mid');
  solid(discAlong([clamp.x + clamp.w + 2.2, COLUMN[1], ARM_Z + 1.5], [1, 0, 0], 2.8, 3.2, P, 24), 'mid');
  screws([[clamp.x + 3, clamp.y + 3, ARM_Z + 7], [clamp.x + clamp.w - 3, clamp.y + clamp.d - 3, ARM_Z + 7]], 0.45);
  solid(cyl(HEAD_X, FEED_Y, 3.4, ARM_Z - 1.6, 1.6, 24), 'mid');
  solid(cyl(HEAD_X, FEED_Y, 1.6, HEAD_Z[1] - 3, ARM_Z - 1.6 - HEAD_Z[1] + 3, 16), 'mid');
}
put({ kind: 'slot', slot: 'head' });

// The plow's post, collar and cap: the moving blade and arm are drawn by the figure.
solid(cyl(POST[0], POST[1], 6, 0, 2.4, 24, 0.3), 'lo');
solid(cyl(POST[0], POST[1], 2.4, 2.4, 44, 16), 'mid', { inner: sideArc(POST[0], POST[1], 2.4, 14, P, 12) });
solid(cyl(POST[0], POST[1], 3.2, 46.4, 1.8, 16), 'mid');

// The counter dial on its pedestal: pegs and needle drawn by the figure.
solid(cyl(DIAL[0], DIAL[1], DIAL_R + 2.2, 0, 2.4, 48, 0.4), 'lo');
solid(cyl(DIAL[0], DIAL[1], DIAL_R, 2.4, DIAL_Z - 2.4, 64, 0.8), 'mid', { inner: sideArc(DIAL[0], DIAL[1], DIAL_R, DIAL_Z - 3, P, 48) });
line(ring(DIAL[0], DIAL[1], DIAL_R - 1.8, DIAL_Z, P, 64), 'lo');
/** The dial angle of a count 0..ROUNDS: 0 at the lower left, ROUNDS at the lower right, over the far side. */
const dialAngle = (value: number) => {
  const far = Math.atan2(-Math.sin((AZIMUTH * Math.PI) / 180), -Math.cos((AZIMUTH * Math.PI) / 180));
  const sweep = (135 * Math.PI) / 180;
  // Left on screen is clockwise from far as seen from above (x right, y toward the viewer).
  return far - sweep + (value / ROUNDS) * 2 * sweep;
};
const onDial = (value: number, r: number): Plane => [DIAL[0] + r * Math.cos(dialAngle(value)), DIAL[1] + r * Math.sin(dialAngle(value))];
{
  const ticks: string[] = [];
  const minor: string[] = [];
  for (let k = 0; k <= ROUNDS * 2; k++) {
    const v = k / 2;
    const major = k % 2 === 0;
    (major ? ticks : minor).push(lineOnTop(onDial(v, DIAL_R - 1.8), onDial(v, DIAL_R - (major ? 4.6 : 3.2)), DIAL_Z, P));
  }
  line(minor.join(''), 'lo');
  line(ticks.join(''), 'mid');
  line(Array.from({ length: ROUNDS }, (_, k) => ring(...onDial(k + 1, PEG_R), 1.3, DIAL_Z, P, 16)).join(''), 'faint');
}
put({ kind: 'slot', slot: 'dial' });

// The label plate at the front left, with three engraved rules.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 2.6 + row * 2], [LABEL.x + (row === 1 ? 26 : 38), LABEL.y + 2.6 + row * 2]], 0.8, P)).join(''),
  'lo',
  true,
);
screws([[LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8]]);

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------- moving parts
/** The reading head (the one lit part) and its pins, built at rest; the figure moves them down by `headShift`. */
export const HEAD_PARTS: readonly Part[] = collect(() => {
  const pins = Array.from({ length: 6 }, (_, c) => HEAD_X + CARD_A - 3 - c * 3.6);
  for (const x of [...pins].sort((a, b) => depthOf([a, FEED_Y, 0], P) - depthOf([b, FEED_Y, 0], P))) {
    solid(cyl(x, FEED_Y, 0.7, PIN_Z, HEAD_Z[0] - PIN_Z + 0.2, 12), 'mid', { crease: 'none' });
  }
  solid(slab(HEAD, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], 3, 0.6), 'hi', { lit: true, inner: sideSeam(HEAD, HEAD_Z[0] + 2.4, P, 3) });
  solid(cyl(HEAD_X, FEED_Y, 3, HEAD_Z[1], 1.6, 24), 'mid');
  screws([[HEAD.x + 2.6, HEAD.y + 2.6, HEAD_Z[1]], [HEAD.x + HEAD.w - 2.6, HEAD.y + HEAD.d - 2.6, HEAD_Z[1]], [HEAD.x + HEAD.w - 2.6, HEAD.y + 2.6, HEAD_Z[1]], [HEAD.x + 2.6, HEAD.y + HEAD.d - 2.6, HEAD_Z[1]]], 0.45);
});
export const headShift = (dip: number) => translateAlong(P, [0, 0, -DIP * dip]);

/** The plow, built down on the turntable; the figure lifts it by `plowShift`. */
export const PLOW_PARTS: readonly Part[] = collect(() => {
  // Downstream of the card it meets, its inner end ahead, so a card turning into it is pushed outward.
  const a = polar(PLOW_ANGLE - 0.3, 24, TOP + 0.3);
  const b = polar(PLOW_ANGLE - 0.46, 55, TOP + 0.3);
  const dir: Point3 = [b[0] - a[0], b[1] - a[1], 0];
  const length = Math.hypot(dir[0], dir[1]);
  const u: Point3 = [dir[0] / length, dir[1] / length, 0];
  solid(plateIn(a, u, [0, 0, 1], [[0, 0], [length, 0], [length, BLADE_H], [0, BLADE_H]], 1.2, P), 'mid');
  const topA = add(a, [0, 0, BLADE_H + 1]);
  const topB = add(b, [0, 0, BLADE_H + 1]);
  solid(barBetween(topA, topB, [0, 0, 1], 2, 2.4, P, 0.2), 'mid');
  const collarZ = TOP + BLADE_H - 2;
  solid(barBetween(topB, [POST[0], POST[1], TOP + BLADE_H + 1], [0, 0, 1], 2, 2.4, P), 'mid');
  solid(cyl(POST[0], POST[1], 4.2, collarZ, 6, 24, 0.3), 'mid');
  solid(discAlong([POST[0] + 4.2, POST[1], collarZ + 3], [1, 0, 0], 1.6, 2.4, P, 16), 'mid');
});
export const plowShift = (lift: number) => translateAlong(P, [0, 0, PLOW_LIFT * lift]);

/** Where a card lies: the centre of its bottom face, its long axis u and its across axis v. */
export interface CardPlace {
  o: Point3;
  u: Point3;
  v: Point3;
}

/** The holes punched in batch `k`'s card: one or two per column, in (a, b) on its face. */
export function holesOf(k: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let c = 0; c < 6; c++) {
    const a = -CARD_A + 3 + c * 3.6;
    const row = (k * 7 + c * 5 + c * c) % 3;
    out.push([a, (row - 1) * 3.8]);
    if ((k + c) % 3 === 0) out.push([a, (((row + 2) % 3) - 1) * 3.8]);
  }
  return out;
}

export interface CardParts {
  card: SolidPaths;
  holes: string;
}
/** Batch `k`'s card, lying at `place`. */
export function cardAt(k: number, place: CardPlace): CardParts {
  const { o, u, v } = place;
  const card = steadySolid(plateIn(o, u, v, CARD_OUTLINE, CARD_T, P, 0.3));
  const n: Point3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const face = add(o, mul(n, CARD_T));
  const point = (a: number, b: number) => at(add(add(face, mul(u, a)), mul(v, b)));
  const holes = holesOf(k)
    .map(([a, b]) => pathOf([point(a - 0.55, b - 1), point(a + 0.55, b - 1), point(a + 0.55, b + 1), point(a - 0.55, b + 1)], true))
    .join('');
  return { card, holes };
}

/** Each pocket's two lanes and its stop pins on the turntable's top, turned by `turn`. */
export function pocketMarks(turn: number): { outline: string; pins: Flat[] } {
  const outline: string[] = [];
  const pins: Flat[] = [];
  for (let j = 0; j < 6; j++) {
    const angle = HEAD_ANGLE + j * STEP + turn;
    const u: Plane = [Math.cos(angle), Math.sin(angle)];
    const v: Plane = [-u[1], u[0]];
    // The pocket's two lanes, from the inner ring to the ring near the rim.
    for (const b of [-CARD_B - 1.2, CARD_B + 1.2]) {
      const lane = (r: number): Plane => [C[0] + u[0] * Math.sqrt(r * r - b * b) + v[0] * b, C[1] + u[1] * Math.sqrt(r * r - b * b) + v[1] * b];
      outline.push(onTop([lane(20), lane(DISC_R - 4)], TOP, P));
    }
    for (const b of [-CARD_B + 2.4, CARD_B - 2.4]) {
      const x = C[0] + u[0] * (POCKET_R - CARD_A - 1.6) + v[0] * b;
      const y = C[1] + u[1] * (POCKET_R - CARD_A - 1.6) + v[1] * b;
      outline.push(ring(x, y, 1.1, TOP, P, 14));
      pins.push(at([x, y, TOP]));
    }
  }
  return { outline: outline.join(''), pins };
}

/** The pegs on the counter dial, one for each batch collected so far. */
export const PEGS: readonly SolidPaths[] = Array.from({ length: ROUNDS }, (_, k) => steadySolid(cyl(...onDial(k + 1, PEG_R), 1.05, DIAL_Z, 2, 16)));
/** The needle at a count (0..ROUNDS, eased), and its hub. */
export const needleAt = (value: number) => lineOnTop(onDial(value, -2.6), onDial(value, PEG_R - 2), DIAL_Z + 1.4, P);
export const NEEDLE_HUB = steadySolid(cyl(DIAL[0], DIAL[1], 2, DIAL_Z, 1.2, 20));

// ------------------------------------------------------------ card places
const flatPlace = (angle: number, r: number, z: number): CardPlace => ({
  o: polar(angle, r, z),
  u: [Math.cos(angle), Math.sin(angle), 0],
  v: [-Math.sin(angle), Math.cos(angle), 0],
});
/** A card in its pocket, `angle` round the turntable. */
export const pocketPlace = (angle: number) => flatPlace(angle, POCKET_R, TOP);

/** A path of (distance, height) points; a card's place along it from the chord across its own length. */
function along(path: Array<[number, number]>, s: number) {
  const point = (d: number): [number, number] => {
    if (d <= path[0]![0]) {
      const [[d0, z0], [d1, z1]] = [path[0]!, path[1]!];
      return [d, z0 + ((z1 - z0) * (d - d0)) / (d1 - d0)];
    }
    for (let k = 1; k < path.length; k++) {
      const [d0, z0] = path[k - 1]!;
      const [d1, z1] = path[k]!;
      if (d <= d1 || k === path.length - 1) return [d, z0 + ((z1 - z0) * (d - d0)) / (d1 - d0)];
    }
    return path[path.length - 1]!;
  };
  // Distances along the path are measured on the floor, which is close enough for these gentle slopes.
  const back = point(s - CARD_A);
  const ahead = point(s + CARD_A);
  const middle = point(s);
  const dz = ahead[1] - back[1];
  const dd = ahead[0] - back[0];
  const length = Math.hypot(dd, dz);
  return { s, z: Math.max(middle[1], (back[1] + ahead[1]) / 2), cos: dd / length, sin: dz / length };
}

/** The feed: from under the rollers, along the platform, down the ramp and over the lip into the pocket under the head. */
const FEED_PATH: Array<[number, number]> = [
  [-170, DECK],
  [RAMP_X0, DECK],
  [RAMP_X1, TOP],
  [HEAD_X + 30, TOP],
];
export const FEED_FROM = ROLLER_X + CARD_A + 2;
export function feedPlace(share: number): CardPlace {
  const x = lerp(FEED_FROM, HEAD_X, share);
  const { z, cos, sin } = along(FEED_PATH, x);
  // The card's u points back along the feed (out of the pocket it is heading for), tipped with the slope.
  return { o: [x, FEED_Y, z], u: [-cos, 0, -sin], v: [0, -1, 0] };
}

/** A card the plow pushes off: out across the rim, down the chute, and into the pile at `n`. */
export function ejectPlace(share: number, n: number): CardPlace {
  const slide = 0.72;
  const pile = pilePlace(n);
  const path: Array<[number, number]> = [
    [POCKET_R - 20, TOP],
    [CHUTE_R[0], TOP],
    [CHUTE_R[1], CHUTE_Z[1] + 0.2],
    [CHUTE_R[1] + 20, CHUTE_Z[1] - 6.7],
  ];
  const lastR = CHUTE_R[1] - CARD_A + 2;
  if (share <= slide) {
    const t = share / slide;
    const r = lerp(POCKET_R, lastR, t * t);
    const { z, cos, sin } = along(path, r);
    const u: Point3 = add(mul(OUT, cos), [0, 0, sin]);
    return { o: add([C[0], C[1], z], mul(OUT, r)), u, v: ACROSS };
  }
  const t = (share - slide) / (1 - slide);
  const fall = t * t;
  const { z, cos, sin } = along(path, lastR);
  const startO = add([C[0], C[1], z], mul(OUT, lastR));
  const o: Point3 = [lerp(startO[0], pile.o[0], t), lerp(startO[1], pile.o[1], t), lerp(startO[2], pile.o[2], fall)];
  const tip = lerp(Math.atan2(sin, cos), 0, t);
  const yaw = lerp(PLOW_ANGLE, Math.atan2(pile.u[1], pile.u[0]), t);
  const u: Point3 = [Math.cos(yaw) * Math.cos(tip), Math.sin(yaw) * Math.cos(tip), Math.sin(tip)];
  return { o, u, v: [-Math.sin(yaw), Math.cos(yaw), 0] };
}

const PILE_TURN = [-6, 4, -2, 7, -4, 2];
const PILE_SHIFT = [-1.6, 1.2, 0.2, -0.8, 1.8, -0.4];
/** The `n`th card in the waste bin, flat on the ones before it. */
export function pilePlace(n: number): CardPlace {
  const yaw = PLOW_ANGLE + (PILE_TURN[n % 6]! * Math.PI) / 180;
  const o = add(add([C[0], C[1], BIN_FLOOR + n * (CARD_T + 0.05)], mul(OUT, PILE_R)), mul(ACROSS, PILE_SHIFT[n % 6]!));
  return { o, u: [Math.cos(yaw), Math.sin(yaw), 0], v: [-Math.sin(yaw), Math.cos(yaw), 0] };
}

/** True once a card leaving on the chute is past the rim, so it is drawn over the bin's back wall. */
export const pastRim = (share: number) => share > 0.5;

// ------------------------------------------------------------ the timeline
type Segment =
  | { kind: 'clear'; t0: number; t1: number }
  | { kind: 'feed'; k: number; t0: number; t1: number }
  | { kind: 'read'; k: number; t0: number; t1: number; hold: boolean }
  | { kind: 'turn'; from: number; to: number; t0: number; t1: number }
  | { kind: 'eject'; k: number; pile: number; t0: number; t1: number };

/** Seconds for each phase. */
export const CLEAR_S = 0.7;
const FEED_S = 0.85;
const READ_S = 0.45;
const REREAD_S = 0.32;
const STEP_S = 0.4;
const EJECT_S = 0.8;

export interface Timeline {
  segments: Segment[];
  /** The still moment: the last read of round 6, the head down on a card. */
  still: number;
  /** Which pocket each batch went into (index 0 unused). */
  pockets: number[];
}

function build(learner: LearnerId): Timeline {
  const segments: Segment[] = [{ kind: 'clear', t0: 0, t1: CLEAR_S }];
  const pockets: number[] = [0];
  let t = CLEAR_S;
  let steps = 0;
  const seg = (s: Segment) => {
    segments.push(s);
    t = s.t1;
  };
  for (let k = 1; k <= ROUNDS; k++) {
    pockets[k] = ((steps % 6) + 6) % 6;
    seg({ kind: 'feed', k, t0: t, t1: t + FEED_S });
    const last = k === ROUNDS;
    if (learner === 'on') {
      seg({ kind: 'read', k, t0: t, t1: t + READ_S * (last ? 0.5 : 1), hold: last });
      if (last) break;
      seg({ kind: 'turn', from: steps, to: steps + 1, t0: t, t1: t + STEP_S + 0.1 });
      steps += 1;
      seg({ kind: 'eject', k, pile: k - 1, t0: t, t1: t + EJECT_S });
    } else {
      seg({ kind: 'read', k, t0: t, t1: t + READ_S, hold: false });
      // Every card stored before comes back under the head, one index at a time.
      for (let i = 1; i < k; i++) {
        seg({ kind: 'turn', from: steps, to: steps + 1, t0: t, t1: t + STEP_S });
        steps += 1;
        const hold = last && i === k - 1;
        seg({ kind: 'read', k: k - i, t0: t, t1: t + REREAD_S * (hold ? 0.5 : 1), hold });
      }
      if (last) break;
      // Then on round to the next empty pocket.
      const rest = ROUNDS - k;
      seg({ kind: 'turn', from: steps, to: steps + rest, t0: t, t1: t + 0.25 + 0.12 * rest });
      steps += rest;
    }
  }
  return { segments, still: t, pockets };
}

export const TIMELINES: Record<LearnerId, Timeline> = { on: build('on'), off: build('off') };

const smooth = (u: number) => {
  const x = Math.min(Math.max(u, 0), 1);
  return x * x * (3 - 2 * x);
};

export interface CardPose {
  k: number;
  place: CardPlace;
  opacity: number;
  /** Drawn over the bin's back wall (on the chute or in the bin), or on the turntable. */
  inBin: boolean;
}
export interface Pose {
  /** The turntable's turn, in radians (negative: the head's pocket moves on toward the plow). */
  turn: number;
  /** The head's dip, 0 up to 1 down on the card. */
  dip: number;
  /** Batches collected so far: the cards that have reached the turntable. */
  arrived: number;
  /** Batches the learner learns from, out of those. */
  usable: number;
  cards: CardPose[];
}

/** The machine `t` seconds into a run of six rounds for `learner`; past the still moment it holds there. */
export function poseAt(learner: LearnerId, t: number): Pose {
  const line = TIMELINES[learner];
  const clock = Math.min(t, line.still);
  // While the run before is cleared away the machine is empty (the figure fades out what it drew).
  if (clock < CLEAR_S) return { turn: 0, dip: 0, arrived: 0, usable: 0, cards: [] };
  let turnSteps = 0;
  let dip = 0;
  let arrived = 0;
  const feeds = new Map<number, number>();
  const ejects = new Map<number, { share: number; pile: number }>();
  for (const s of line.segments) {
    if (s.t0 > clock) break;
    const u = s.t1 > s.t0 ? Math.min(1, (clock - s.t0) / (s.t1 - s.t0)) : 1;
    if (s.kind === 'turn') turnSteps = lerp(s.from, s.to, smooth(u));
    else if (s.kind === 'feed') {
      feeds.set(s.k, smooth(u));
      if (u >= 1) arrived = s.k;
    } else if (s.kind === 'read') dip = clock <= s.t1 ? (s.hold ? Math.sin((Math.PI / 2) * u) : Math.sin(Math.PI * u)) : 0;
    else if (s.kind === 'eject') ejects.set(s.k, { share: u, pile: s.pile });
  }
  const turn = -turnSteps * STEP;
  const cards: CardPose[] = [];
  for (const [k, share] of feeds) {
    const eject = ejects.get(k);
    if (eject) {
      cards.push({ k, place: eject.share >= 1 ? pilePlace(eject.pile) : ejectPlace(eject.share, eject.pile), opacity: 1, inBin: pastRim(eject.share) });
    } else if (share < 1) {
      cards.push({ k, place: feedPlace(share), opacity: smooth(share / 0.12), inBin: false });
    } else {
      cards.push({ k, place: pocketPlace(HEAD_ANGLE + line.pockets[k]! * STEP + turn), opacity: 1, inBin: false });
    }
  }
  return { turn, dip, arrived, usable: usableBatches(learner, arrived), cards };
}

/** The readout in plain words, from a pose. */
export function readoutOf(pose: Pick<Pose, 'arrived' | 'usable'>): string {
  if (pose.arrived === 0) return 'No batches collected yet';
  return `Learns from ${pose.usable} of ${pose.arrived} ${pose.arrived === 1 ? 'batch' : 'batches'}`;
}
