/**
 * The card feeder for ChunkBuffer, drawn with the isometric kit.
 *
 * The object is the explanation. A sealed box at the left is the model: it
 * answers about every 250 ms, and each answer is a deck of cards, one card
 * per action. The deck in flight slides down the channel for the whole
 * 250 ms, so the channel is the latency. At the well it shoves out what is
 * left of the deck before (the fresher plan wins) and settles. A Geneva
 * wheel on the belt's drive box is the 50 Hz clock: every 20 ms it indexes
 * once, the belt moves one slot, and the bottom card of the deck in the well
 * slides out onto the empty slot. When the deck runs out before the next one
 * lands, the slot goes by empty: a tick the arm waits. The ruler behind the
 * well marks 12.5 cards, the most one answer's wait can use.
 *
 * World units are about half a millimetre; x to the right, y toward the
 * viewer, z up. The model is lib/chunk-buffer.ts; time here is robot
 * milliseconds.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  roundedPlan,
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
import { ANSWER_MS, CHUNK_MAX, TICK_MS, TICKS_PER_ANSWER, actionOfTick, answerAt, firstTickOf, leftOver } from '../../../lib/chunk-buffer.ts';

export const WIDTH = 600;
export const AZIMUTH = 57;
export const ELEVATION = 30;

// ----------------------------------------------------------------- the layout
const BASE: Plan = { x: -112, y: -48, w: 208, d: 74, r: 9 };
const BASE_Z = 10;
const TOP = 18;
/** The channel floor and the belt's top: one level, so a card slides straight across. */
export const FLOOR = TOP + 24;

/** A card: one action. */
export const CARD_W = 14;
const CARD_D = 18;
export const CARD_H = 1.2;
const DECK_Y = -22;
/** The well, where the deck being played sits. */
export const WELL_X = -30;

const BOX: Plan = { x: -102, y: -44, w: 36, d: 46, r: 3 };
const BOX_TOP = TOP + 56;
/** The box's outlet face: a deck inside the box is hidden behind it. */
const X_OUT = BOX.x + BOX.w;
const BED: Plan = { x: X_OUT, y: -38, w: 98, d: 30, r: 2 };
const BACK_WALL: Plan = { x: X_OUT, y: -35.2, w: 54, d: 3.4, r: 0.6 };
const WALL_TOP = FLOOR + 31;
const LIP_Y = DECK_Y + CARD_D / 2 + 0.6;
const LIP: Plan[] = [
  { x: X_OUT, y: LIP_Y, w: WELL_X - CARD_W / 2 - 0.8 - X_OUT, d: 2.6, r: 0.5 },
  { x: WELL_X + CARD_W / 2 + 0.8, y: LIP_Y, w: BACK_WALL.x + BACK_WALL.w - (WELL_X + CARD_W / 2 + 0.8), d: 2.6, r: 0.5 },
];
const LIP_H = 3;
/** The ruler on the back wall's face, beside the well: a tick a card, and the 12.5-card line. */
const RULER: Plan = { x: WELL_X + CARD_W / 2 + 1.4, y: BACK_WALL.y + BACK_WALL.d, w: 4.6, d: 0.8, r: 0.3 };
/** The tray a left-over deck is pushed onto, where it is set aside. */
const SPENT: Plan = { x: WELL_X + CARD_W + 10, y: DECK_Y - CARD_D / 2 - 3, w: CARD_W + 10, d: CARD_D + 6, r: 1.4 };

/** The belt: one slot a tick, from the well to the drive box. */
export const PITCH = 20;
const BELT_Y = 2;
const BELT: Plan = { x: WELL_X - 14, y: BELT_Y - 11, w: 106, d: 22, r: 1 };
const DRIVE: Plan = { x: BELT.x + BELT.w - 4, y: -26, w: 34, d: 44, r: 3 };
const DRIVE_TOP = FLOOR + 6;
const IDLER: Plan = { x: BELT.x - 6, y: BELT.y - 1, w: 9, d: BELT.d + 2, r: 1.4 };
const RAIL: Plan = { x: BELT.x + 3, y: BELT.y + BELT.d, w: DRIVE.x - BELT.x - 3, d: 2, r: 0.5 };

/** The Geneva wheel and its driver on the drive box. */
const G1: Plane = [DRIVE.x + DRIVE.w / 2 + 2, DRIVE.y + DRIVE.d / 2 + 5];
const CENTERS = 16;
const G2: Plane = [G1[0], G1[1] - CENTERS];
const CRANK = CENTERS * Math.SQRT1_2;
const STAR_R = CENTERS * Math.SQRT1_2;
const SLOT_IN = CENTERS - CRANK;
const SLOT_HALF = 1.6;
const LOCK_R = 8.4;
const GZ = DRIVE_TOP + 1.4;
const GH = 2.4;

const LABEL: Plan = { x: -66, y: 15, w: 40, d: 8, r: 1.4 };

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(BASE, 8)) extremes.push([px, py, 0], [px, py, TOP]);
for (const [px, py] of roundedPlan(BOX, 3)) extremes.push([px, py, BOX_TOP]);
for (const [px, py] of roundedPlan(BACK_WALL, 1)) extremes.push([px, py, WALL_TOP]);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 6;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });

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
const face3 = (points: Point3[], closed = true) => pathOf(points.map(at), closed);

// ------------------------------------------------------------------- parts
export type Slot = 'decks' | 'belt' | 'cards' | 'geneva';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; opacity?: number }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; weight?: number; opacity?: number }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
let into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', extra: { weight?: number; opacity?: number } = {}) => into.push({ kind: 'line', d, tone, free, ...extra });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
function collect(build: () => void): Part[] {
  const list: Part[] = [];
  const saved = into;
  into = list;
  build();
  into = saved;
  return list;
}
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}
/** A closed slot outline on a face of constant y. */
const ySlot = (x0: number, x1: number, y: number, z0: number, z1: number) => face3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);
/** A closed slot outline on a face of constant x. */
const xSlot = (x: number, y0: number, y1: number, z0: number, z1: number) => face3([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]);

// ------------------------------------------------------------------ the base
for (const [x, y] of byDepth(corners(BASE, 15))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, BASE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, BASE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, BASE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(BASE, BASE_Z, TOP - BASE_Z, 10, 1.2), 'lo', { inner: sideSeam(BASE, BASE_Z + 2.6, P, 10) });
line(planOutline(insetPlan(BASE, 4.5), TOP, P, 10), 'faint');
for (const [x, y] of corners(BASE, 10)) screw(x, y, TOP, 2.1);

// ------------------------------------------------------------ the model box
solid(slab(BOX, TOP, BOX_TOP - TOP, 3, 0.8), 'mid', { inner: sideSeam(BOX, BOX_TOP - 6, P, 3) });
line(planOutline(insetPlan(BOX, 3.4), BOX_TOP, P, 3), 'faint');
for (const [x, y] of corners(BOX, 6)) screw(x, y, BOX_TOP, 1.7);
// Vent slots down its front, and the outlet the decks leave by, framed on its right face.
for (let k = 0; k < 6; k++) line(ySlot(BOX.x + 8, BOX.x + BOX.w - 8, BOX.y + BOX.d, TOP + 30 + k * 4, TOP + 31.6 + k * 4), 'lo');
line(xSlot(X_OUT, DECK_Y - CARD_D / 2 - 1.6, DECK_Y + CARD_D / 2 + 1.6, FLOOR, FLOOR + CHUNK_MAX * CARD_H + 2.2), 'mid');
dots([at([X_OUT, DECK_Y - CARD_D / 2 - 3.4, FLOOR + 34]), at([X_OUT, DECK_Y + CARD_D / 2 + 3.4, FLOOR + 34])], 0.45, 'mid');

// ------------------------------------------------- the channel and the well
solid(slab(BED, TOP, FLOOR - TOP, 2, 0.8), 'mid', { inner: sideSeam(BED, TOP + 4, P, 2) });
for (const [x, y] of [[BED.x + 5, BED.y + 4], [BED.x + BED.w - 5, BED.y + 4]] as const) screw(x, y, FLOOR, 1.5);
solid(slab(BACK_WALL, FLOOR, WALL_TOP - FLOOR, 2, 0.5), 'mid');
dots([BACK_WALL.x + 4, BACK_WALL.x + BACK_WALL.w - 4].map((x) => at([x, BACK_WALL.y + BACK_WALL.d, WALL_TOP - 3.4])), 0.45, 'mid');
// The ruler: a tick every card from its left edge, longer every four, and the 12.5-card line the reader compares a deck with.
solid(slab(RULER, FLOOR, CHUNK_MAX * CARD_H + 1.4, 2), 'lo', { crease: 'none' });
{
  const y = RULER.y + RULER.d;
  for (let k = 1; k <= CHUNK_MAX; k++) {
    const z = FLOOR + k * CARD_H;
    line(face3([[RULER.x, y, z], [RULER.x + (k % 4 === 0 ? 2.6 : 1.6), y, z]], false), k % 4 === 0 ? 'mid' : 'lo');
  }
  const enough = FLOOR + TICKS_PER_ANSWER * CARD_H;
  line(face3([[RULER.x, y, enough], [RULER.x + RULER.w, y, enough]], false), 'hi', undefined, { weight: 1 });
}
// The spent tray: a shallow pan on the bed past the well, where a left-over deck is pushed and set aside.
solid(slab(SPENT, FLOOR, 1.4, 2, 0.3), 'lo');
line(planOutline(insetPlan(SPENT, 1.6), FLOOR + 1.4, P, 2), 'faint');
slot('decks');
for (const lip of LIP) solid(slab(lip, FLOOR, LIP_H, 2, 0.3), 'mid');

// ----------------------------------------------------------------- the belt
for (const x of [BELT.x + 14, BELT.x + BELT.w - 30]) {
  for (const y of [BELT.y + 3, BELT.y + BELT.d - 3]) solid(slab({ x: x - 2.4, y: y - 2.4, w: 4.8, d: 4.8, r: 0.8 }, TOP, FLOOR - TOP - 5, 2), 'mid');
}
solid(slab({ x: BELT.x, y: BELT.y + 1, w: BELT.w, d: BELT.d - 2, r: 0.6 }, FLOOR - 5, 3.4, 2, 0.3), 'mid');
solid(slab(BELT, FLOOR - 1.6, 1.6, 2), 'mid', { crease: 'lo' });
// The belt's running surface, a shade darker than the cards it carries.
into.push({ kind: 'face', d: face3(roundedPlan(insetPlan(BELT, 0.4), 2).map(([x, y]) => [x, y, FLOOR] as Point3)), fill: 1 });
slot('belt');
solid(slab(IDLER, FLOOR - 6, 8.6, 2, 0.4), 'mid');
dots([at([IDLER.x + IDLER.w / 2, IDLER.y + IDLER.d, FLOOR - 1.7])], 0.6, 'lo');
slot('cards');
solid(slab(RAIL, FLOOR - 5, 6.4, 2, 0.4), 'mid');
for (const x of [RAIL.x + 10, RAIL.x + RAIL.w / 2, RAIL.x + RAIL.w - 10]) dots([at([x, RAIL.y + RAIL.d, FLOOR - 1.8])], 0.42, 'mid');

// ---------------------------------------------- the drive box and its clock
solid(slab(DRIVE, TOP, DRIVE_TOP - TOP, 3, 0.8), 'mid', { inner: sideSeam(DRIVE, DRIVE_TOP - 5, P, 3) });
line(planOutline(insetPlan(DRIVE, 3), DRIVE_TOP, P, 3), 'faint');
for (const [x, y] of corners(DRIVE, 5)) screw(x, y, DRIVE_TOP, 1.5);
for (let k = 0; k < 4; k++) line(xSlot(DRIVE.x + DRIVE.w, DRIVE.y + 9, DRIVE.y + DRIVE.d - 9, TOP + 6 + k * 3.6, TOP + 7.4 + k * 3.6), 'lo');
// The bearing plates the wheel and its driver turn on.
solid(cyl(G2[0], G2[1], LOCK_R + 1.6, DRIVE_TOP, 1.4, 40, 0.3), 'lo');
solid(cyl(G1[0], G1[1], STAR_R + 1.4, DRIVE_TOP, 1.4, 44, 0.3), 'lo');
slot('geneva');

// -------------------------------------------------------- the label plate
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.82], [1, 0.58], [2, 0.36]] as const) {
  const y = LABEL.y + 2.4 + k * 2.3;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 12) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');

// ---------------------------------------------------------- the moving parts
/** A deck of `count` cards centred at x, standing on z0: one block with a line at every card joint on its two visible sides. */
function deckParts(x: number, y: number, count: number, z0: number, extra: { lit?: boolean; opacity?: number; clipAt?: number } = {}): Part[] {
  if (count <= 0) return [];
  const x0 = Math.max(x - CARD_W / 2, extra.clipAt ?? -Infinity);
  const x1 = x + CARD_W / 2;
  if (x1 - x0 < 0.3) return [];
  const plan: Plan = { x: x0, y: y - CARD_D / 2, w: x1 - x0, d: CARD_D, r: 0 };
  const top = z0 + count * CARD_H;
  return collect(() => {
    const joints: string[] = [];
    for (let k = 1; k < count; k++) {
      const z = z0 + k * CARD_H;
      joints.push(face3([[x0, plan.y + CARD_D, z], [x1, plan.y + CARD_D, z], [x1, plan.y, z]], false));
    }
    solid(slab(plan, z0, top - z0, 1), 'hi', { lit: extra.lit, crease: 'lo', inner: joints.join(''), opacity: extra.opacity });
  });
}

/** The leaving card's y as it slides from under the deck to its slot on the belt. */
const leavingY = (share: number) => DECK_Y + (BELT_Y - DECK_Y) * share;

/** One card lying at (x, y) on z0. */
const cardParts = (x: number, y: number, z0: number): Part[] => deckParts(x, y, 1, z0);

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** Times inside a tick period, in robot ms: the card leaves, the stack settles, the wheel indexes, a fresh deck is shoved in. */
const EJECT = [0, 6] as const;
const SETTLE = [6, 8] as const;
const INDEX = [8, 13] as const;
const SHOVE = 4;
/** Where an incoming deck waits, just short of the well, before its shove. */
const WAIT_X = WELL_X - CARD_W - 0.4;
const START_X = X_OUT - CARD_W / 2 - 1;

/** The driver's angle in a tick period: one turn a tick, the pin in a slot while |angle| < 45°. */
export function driverAngle(u: number) {
  const mid = (INDEX[0] + INDEX[1]) / 2;
  return ((u - mid) / TICK_MS) * Math.PI * 2;
}
/** How far the wheel (and so the belt) has indexed in a tick period, 0 to 1, from the pin's true path. */
export function indexShare(u: number) {
  const phi = driverAngle(u);
  if (phi <= -Math.PI / 4) return 0;
  if (phi >= Math.PI / 4) return 1;
  // The pin, seen from the wheel's centre: the wheel's slot points at it.
  const angle = Math.atan2(CRANK * Math.sin(phi), CENTERS - CRANK * Math.cos(phi));
  return (angle + Math.PI / 4) / (Math.PI / 2);
}

export type FeederState = { chunk: number; ms: number };

/** Where every moving thing is at robot time `ms` for a chunk size. */
export function poseAt({ chunk, ms }: FeederState) {
  const t = Math.max(0, ms);
  const tick = Math.floor(t / TICK_MS + 1e-9);
  const u = t - tick * TICK_MS;
  // The answer in the well is the last to arrive; the current tick played from it only if it came at or after that arrival.
  const answer = answerAt(t);
  const arrival = answer * ANSWER_MS;
  const next = arrival + ANSWER_MS;
  const fromThis = tick * TICK_MS >= arrival - 1e-9;
  const action = tick - firstTickOf(answer);
  const playing = fromThis && action < chunk;
  // The deck in the well: its cards not yet played; during the eject its bottom card is the one leaving.
  const left = fromThis ? Math.max(0, chunk - action - 1) : chunk;
  const ejecting = playing && u < EJECT[1];
  const raise = playing ? 1 - smooth((u - SETTLE[0]) / (SETTLE[1] - SETTLE[0])) : 0;
  const ejectShare = playing ? smooth((u - EJECT[0]) / (EJECT[1] - EJECT[0])) : 1;
  // The next deck flies for the whole wait, then shoves in during the last few ms before it arrives.
  const shove = smooth((t - (next - SHOVE)) / SHOVE);
  const flight = Math.max(0, Math.min(1, (t - arrival) / (next - SHOVE - arrival)));
  const incomingX = shove > 0 ? WAIT_X + (WELL_X - WAIT_X) * shove : START_X + (WAIT_X - START_X) * flight;
  const wellX = WELL_X + (CARD_W + 0.4) * shove;
  // The deck the last shove pushed out, sliding on to the spent tray and set aside.
  const since = t - arrival;
  const previous = answer > 0 ? leftOver(chunk, answer - 1) : 0;
  const outX = WELL_X + CARD_W + 0.4 + (SPENT.x + SPENT.w / 2 - (WELL_X + CARD_W + 0.4)) * smooth(since / 30);
  const outOpacity = 1 - smooth((since - 12) / 24);
  return {
    tick,
    u,
    answer,
    action,
    playing,
    left,
    ejecting,
    ejectShare,
    raise,
    incomingX,
    wellX,
    previous: since < 36 ? previous : 0,
    outX,
    outOpacity,
    share: indexShare(u),
    driver: driverAngle(u),
  };
}

function decksAt(state: FeederState): Part[] {
  const pose = poseAt(state);
  const parts: Part[] = [];
  // Back to front: the deck in flight (behind the outlet face while still in the box), the deck in the well, the deck set aside.
  parts.push(...deckParts(pose.incomingX, DECK_Y, state.chunk, FLOOR, { clipAt: X_OUT }));
  // The leaving card, while it is still under the deck or the lip: drawn before them, so they cover it.
  if (pose.ejecting && leavingY(pose.ejectShare) < LIP_Y + 2.6 + CARD_D / 2) parts.push(...cardParts(WELL_X, leavingY(pose.ejectShare), FLOOR));
  parts.push(...deckParts(pose.wellX, DECK_Y, pose.left, FLOOR + pose.raise * CARD_H, { lit: true }));
  if (pose.previous > 0 && pose.outOpacity > 0.01) parts.push(...deckParts(pose.outX, DECK_Y, pose.previous, FLOOR, { opacity: pose.outOpacity }));
  return parts;
}

/** The belt's cleats: one between every two slots, moving with the belt. */
function beltAt(state: FeederState): Part[] {
  const pose = poseAt(state);
  const offset = ((pose.tick + pose.share) * PITCH) % PITCH;
  const parts: Part[] = [];
  const y0 = BELT.y;
  const y1 = BELT.y + BELT.d;
  for (let x = WELL_X - PITCH / 2 + offset - PITCH; x <= BELT.x + BELT.w + 1e-9; x += PITCH) {
    if (x < BELT.x + 1 || x > DRIVE.x - 0.5) continue;
    parts.push({ kind: 'line', d: face3([[x, y0, FLOOR], [x, y1, FLOOR]], false), tone: 'lo' });
  }
  return parts;
}

/** Every card on the belt: the history of the ticks, one slot a tick; an empty slot is a tick the arm waited. */
export function beltCards(state: FeederState): { tick: number; x: number }[] {
  const pose = poseAt(state);
  const cards: { tick: number; x: number }[] = [];
  // A card is drawn until it is wholly inside the drive box, which hides it.
  const last = DRIVE.x + CARD_W / 2 + 2;
  for (let back = pose.playing && pose.ejecting ? 1 : 0; ; back++) {
    const tick = pose.tick - back;
    const x = WELL_X + (back + pose.share) * PITCH;
    if (tick < 0 || x > last) break;
    if (!actionOfTick(state.chunk, tick)) continue;
    cards.push({ tick, x });
  }
  return cards;
}

function cardsAt(state: FeederState): Part[] {
  const pose = poseAt(state);
  const parts: Part[] = [];
  // Far end first, so nearer cards paint over farther ones where they could touch.
  const cards = beltCards(state).sort((a, b) => depthOf([a.x, BELT_Y, 0], P) - depthOf([b.x, BELT_Y, 0], P));
  for (const card of cards) parts.push(...cardParts(card.x, BELT_Y, FLOOR));
  // The card leaving the well, once it is clear of the lip's gap, on its way onto the empty slot.
  if (pose.ejecting && leavingY(pose.ejectShare) >= LIP_Y + 2.6 + CARD_D / 2) parts.push(...cardParts(WELL_X, leavingY(pose.ejectShare), FLOOR));
  return parts;
}

/** The Geneva wheel's outline in its own turn: four slots, and between them the hollows the driver's locking disc turns in. */
function starRing(turn: number): Plane[] {
  const points: Plane[] = [];
  const lockR = LOCK_R + 0.35;
  for (let k = 0; k < 4; k++) {
    const slotAngle = turn + (k * Math.PI) / 2;
    const ux = Math.cos(slotAngle);
    const uy = Math.sin(slotAngle);
    const vx = -uy;
    const vy = ux;
    // The slot: in along one wall, round its bottom, out along the other.
    const mouth = Math.sqrt(STAR_R * STAR_R - SLOT_HALF * SLOT_HALF);
    points.push([G1[0] + mouth * ux - SLOT_HALF * vx, G1[1] + mouth * uy - SLOT_HALF * vy]);
    for (let s = 0; s <= 6; s++) {
      const a = -Math.PI / 2 - (s / 6) * Math.PI;
      points.push([G1[0] + SLOT_IN * ux + SLOT_HALF * (Math.cos(a) * ux + Math.sin(a) * vx), G1[1] + SLOT_IN * uy + SLOT_HALF * (Math.cos(a) * uy + Math.sin(a) * vy)]);
    }
    points.push([G1[0] + mouth * ux + SLOT_HALF * vx, G1[1] + mouth * uy + SLOT_HALF * vy]);
    // The lobe to the next slot: the rim, hollowed by the locking disc's circle about the point opposite the lobe.
    const bisector = slotAngle + Math.PI / 4;
    const steps = 18;
    const from = Math.asin(SLOT_HALF / STAR_R);
    // The lobe's own points only: its two ends are the slot mouths already pushed, and a repeated point would
    // leave an edge of no length whose facing rounds differently in Node and in the browser.
    for (let s = 1; s < steps; s++) {
      const a = slotAngle + from + ((Math.PI / 2 - 2 * from) * s) / steps;
      const delta = a - bisector;
      const disc = lockR * lockR - CENTERS * CENTERS * Math.sin(delta) ** 2;
      let r = STAR_R;
      if (disc > 0) r = Math.min(r, CENTERS * Math.cos(delta) - Math.sqrt(disc));
      points.push([G1[0] + r * Math.cos(a), G1[1] + r * Math.sin(a)]);
    }
  }
  return points;
}

/** The locking disc on the driver: round, with a hollow cut on the pin's side so the wheel can turn past it. */
function lockRing(pin: number): Plane[] {
  const points: Plane[] = [];
  const steps = 64;
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    const off = Math.atan2(Math.sin(a - pin), Math.cos(a - pin));
    const cut = Math.abs(off) < 0.95 ? 2.8 * Math.cos((off / 0.95) * (Math.PI / 2)) ** 2 : 0;
    points.push([G2[0] + (LOCK_R - cut) * Math.cos(a), G2[1] + (LOCK_R - cut) * Math.sin(a)]);
  }
  return points;
}

function genevaAt(state: FeederState): Part[] {
  const pose = poseAt(state);
  // The wheel turns a quarter a tick; it follows the pin's slot while the pin is in it.
  const towardWheel = Math.atan2(G1[1] - G2[1], G1[0] - G2[0]);
  const pinAngle = towardWheel + pose.driver;
  const pin: Plane = [G2[0] + CRANK * Math.cos(pinAngle), G2[1] + CRANK * Math.sin(pinAngle)];
  // Seen from the wheel, the pin enters a slot 45° one side of the line of centres and leaves 45° the other: a quarter turn a tick.
  const turn = towardWheel + Math.PI + Math.PI / 4 - (pose.tick + pose.share) * (Math.PI / 2);
  return collect(() => {
    solid(extrude(lockRing(pinAngle), GZ, GH, P, { convex: false, bevel: 0.3 }), 'mid');
    solid(extrude(starRing(turn), GZ, GH, P, { convex: false, bevel: 0.3 }), 'hi');
    solid(cyl(G1[0], G1[1], 2.2, GZ + GH, 1.2, 18, 0.2), 'mid');
    // The crank: from the driver's hub out to the pin, over the wheel.
    const half = 1.9;
    const arm: Plane[] = [];
    for (let s = 0; s <= 8; s++) {
      const a = pinAngle - Math.PI / 2 - (s / 8) * Math.PI;
      arm.push([G2[0] + half * 1.6 * Math.cos(a), G2[1] + half * 1.6 * Math.sin(a)]);
    }
    for (let s = 0; s <= 8; s++) {
      const a = pinAngle + Math.PI / 2 - (s / 8) * Math.PI;
      arm.push([pin[0] + half * Math.cos(a), pin[1] + half * Math.sin(a)]);
    }
    solid(extrude(arm, GZ + GH, 1.4, P, { bevel: 0.2 }), 'mid');
    solid(cyl(pin[0], pin[1], 1.1, GZ + 0.4, GH + 2.6, 14), 'hi');
    solid(cyl(G2[0], G2[1], 1.6, GZ + GH + 1.4, 1, 16, 0.2), 'mid');
  });
}

/** Every moving part at a moment, by slot. */
export function movingAt(state: FeederState): Record<Slot, Part[]> {
  return { decks: decksAt(state), belt: beltAt(state), cards: cardsAt(state), geneva: genevaAt(state) };
}

/** For the tests: the answer period and tick, in robot ms. */
export const PERIODS = { ANSWER_MS, TICK_MS };
