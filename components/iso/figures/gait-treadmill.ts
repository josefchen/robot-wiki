/**
 * The gait treadmill for the GaitSupport scene, drawn with the isometric
 * kit: a four-legged robot on a treadmill, wired to a four-pen gait
 * recorder.
 *
 * The object is the explanation. The robot walks, trots and hops on the
 * belt while staying in place; each foot on the ground slides back with the
 * belt. Under the treadmill's deck a contact plate under each foot drives a
 * pen on the recorder in front: while a foot is down its pen is down and
 * inks its lane on the moving paper, so the strip draws the gait as a
 * footfall chart, one lane per foot. A stance counter on the control box
 * shows how many feet are down, its needle the one lit part. Three feet down
 * all the time in the walk, two in the trot, at times none in the hop: the
 * paper keeps all three side by side.
 *
 * Every timing comes from lib/gait.ts (unchanged): duty factors and phase
 * offsets, the authored textbook gaits. The scene's clock drives the stride
 * phase; this module turns a phase into a pose and writes the chart.
 *
 * World units: millimetres. x runs along the belt (the robot faces +x), y
 * across it toward the viewer (the robot's left), z up.
 */
import {
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  radialTicks,
  ring as kitRing,
  sideArc,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong } from '../prism.ts';
import { GAITS, legPhase, type GaitId, type LegId } from '../../../lib/gait.ts';

// ------------------------------------------------------------------ the robot (mm)
/** Hip height above the belt when standing. */
const HIP_H = 27;
const THIGH = 16.5;
const SHIN = 16.5;
/** How far a foot travels back under the body in one stance, and how high it lifts in swing. */
export const STRIDE = 16;
const LIFT = 6;
/** How high the body rises at the middle of a leap. */
const LEAP: Record<GaitId, number> = { walk: 0, trot: 0, bound: 5, pronk: 9 };
const HIP_X = { hind: -20, front: 20 };
/** The legs swing in planes just outside the hip motors. */
const LEG_Y = 11;
/**
 * The feet in the scene's drawing order: right hind, left hind, right front,
 * left front. A mark `walk-foot-2` is the right front foot's ink in the
 * walk's stretch of paper.
 */
export const FOOT_ORDER: readonly LegId[] = ['rh', 'lh', 'rf', 'lf'];
const legY = (leg: LegId) => (leg === 'lh' || leg === 'lf' ? LEG_Y : -LEG_Y);
const legX = (leg: LegId) => (leg === 'lh' || leg === 'rh' ? HIP_X.hind : HIP_X.front);

// ------------------------------------------------------------------ the machine (mm)
const BASE: Plan = { x: -92, y: -24, w: 166, d: 84, r: 6 };
const BASE_Z = [0, 6] as const;
const DECK = { x0: -46, x1: 46, half: 14 };
const DECK_Z = [11, 16.4] as const;
/** The belt's top, where feet stand. */
export const BELT_Z = DECK_Z[1];
const RAIL = { thick: 2, height: 3.2 };
const ROLLER_R = 3.6;
/** The recorder in front of the treadmill. */
const REC: Plan = { x: -74, y: 26, w: 140, d: 30, r: 2.5 };
const REC_Z = [BASE_Z[1], 13] as const;
const PAPER_Z = REC_Z[1] + 0.6;
/** The paper strip: from the take-up roll at the left to the supply roll at the right. */
const PAPER = { x0: -64, x1: 52, y0: 30, lane: 5.2 };
/** Where the pens touch the paper. */
export const PEN_X = 40;
/** Paper the recorder feeds per stride of the robot. */
export const PAPER_PER_STRIDE = 14;
/** The control box with the stance counter, at the treadmill's front left. */
const BOX: Plan = { x: -86, y: -7, w: 25, d: 24, r: 2 };
const BOX_Z = [BASE_Z[1], 26] as const;
const DIAL = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.d / 2, r: 9.4 };

/** The lanes on the paper from the back: left front, right front, left hind, right hind. */
export const LANE_ORDER: readonly LegId[] = ['lf', 'rf', 'lh', 'rh'];
const laneY = (leg: LegId) => PAPER.y0 + LANE_ORDER.indexOf(leg) * PAPER.lane + PAPER.lane / 2;

// ---------------------------------------------------------------- the fit
const AZIMUTH = 60;
const ELEVATION = 36;
const extremes: Point3[] = [
  [BASE.x, BASE.y, -6],
  [BASE.x + BASE.w, BASE.y, -6],
  [BASE.x, BASE.y + BASE.d, -6],
  [BASE.x + BASE.w, BASE.y + BASE.d, -6],
  [HIP_X.hind - 8, -8, BELT_Z + HIP_H + 9 + LEAP.pronk + 4],
  [HIP_X.front + 16, 6, BELT_Z + HIP_H + 9 + LEAP.pronk + 4],
  [BOX.x, BOX.y, BOX_Z[1] + 2],
];
export const WIDTH = 600;
/** 4 CSS px of margin on the narrowest full-size stage, with room to spare. */
const PAD = 16;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });

// ----------------------------------------------------------------- the parts
export type DrawnPart =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone };
export type Part = DrawnPart | { kind: 'slot'; slot: Slot };

/**
 * Where the live pieces go in the painter's order: the belt's slats, the
 * robot's far legs, its body, its near legs, the counter's needle, the
 * chart on the paper and the pens.
 */
export type Slot = 'belt' | 'legs-far' | 'body' | 'legs-near' | 'needle' | 'chart' | 'pens';

const at = (point: Point3) => iso(point, P);
const r2 = (value: number) => Math.round(value * 100) / 100;

const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (list: Part[], points: Point3[], size = 0.5, tone: Tone = 'mid') =>
  list.push({ kind: 'dots', points: points.map(at), size, tone });
const seamOf = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
function screw(list: Part[], x: number, y: number, z: number, r = 1.2) {
  line(list, kitRing(x, y, r, z, P, 16), 'lo');
  dots(list, [[x, y, z]], 0.45, 'mid');
}

const PARTS_LIST: Part[] = [];

// --------------------------------------------------------------- the base and the treadmill's far side
{
  const list = PARTS_LIST;
  for (const [x, y] of [
    [BASE.x + 12, BASE.y + 12],
    [BASE.x + BASE.w - 12, BASE.y + 12],
    [BASE.x + 12, BASE.y + BASE.d - 12],
    [BASE.x + BASE.w - 12, BASE.y + BASE.d - 12],
  ] as Plane[]) {
    solid(list, cylinder(x, y, 7, -6, 1.6, P, 28), 'lo');
    solid(list, cylinder(x, y, 5.2, -4.4, 4.4, P, 28), 'mid');
  }
  solid(list, slabOf(BASE, BASE_Z[0], BASE_Z[1], P, 8, 1.4), 'mid');
  line(list, planOutline(insetPlan(BASE, 5), BASE_Z[1], P), 'faint');
  for (const [x, y] of [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ] as Plane[]) screw(list, x, y, BASE_Z[1]);
  // The treadmill's two end housings, each carrying a roller, and the deck between.
  for (const x of [DECK.x0 - 6, DECK.x1]) {
    const housing: Plan = { x, y: -DECK.half - 3, w: 6, d: 2 * DECK.half + 6, r: 1.2 };
    solid(list, slabOf(housing, BASE_Z[1], DECK_Z[1] - 1 - BASE_Z[1], P, 3, 0.5), 'mid', { inner: seamOf(sideSeam(housing, BASE_Z[1] + 3, P, 3)) });
    for (const y of [-DECK.half - 1.4, DECK.half + 1.4]) dots(list, [[x + 3, y, DECK_Z[1] - 1]], 0.42, 'mid');
  }
  solid(list, slabOf({ x: DECK.x0, y: -DECK.half, w: DECK.x1 - DECK.x0, d: 2 * DECK.half, r: 0.6 }, DECK_Z[0], DECK_Z[1] - DECK_Z[0], P, 2, 0.4), 'mid');
  // The rollers' ends show where the belt wraps them.
  for (const x of [DECK.x0 - 1.8, DECK.x1 + 1.8]) solid(list, discAlong([x, -DECK.half, DECK_Z[1] - ROLLER_R], [0, 1, 0], ROLLER_R, 2 * DECK.half, P, 28), 'lo');
  // The belt itself: a darker band on the deck, its slats in the belt slot.
  list.push({ kind: 'slot', slot: 'belt' });
  // The far side rail.
  solid(list, slabOf({ x: DECK.x0 - 6, y: -DECK.half - RAIL.thick, w: DECK.x1 - DECK.x0 + 12, d: RAIL.thick, r: 0.5 }, DECK_Z[1], RAIL.height, P, 2, 0.3), 'mid');
  list.push({ kind: 'slot', slot: 'legs-far' });
  list.push({ kind: 'slot', slot: 'body' });
  list.push({ kind: 'slot', slot: 'legs-near' });
  // The near side rail, with its screws, in front of the near feet.
  solid(list, slabOf({ x: DECK.x0 - 6, y: DECK.half, w: DECK.x1 - DECK.x0 + 12, d: RAIL.thick, r: 0.5 }, DECK_Z[1], RAIL.height, P, 2, 0.3), 'mid');
  for (let i = 0; i < 5; i++) dots(list, [[DECK.x0 + 4 + i * 21, DECK.half + RAIL.thick / 2, DECK_Z[1] + RAIL.height]], 0.42, 'mid');
  // The motor at the front end, its can along the roller's axis, with a knurled cap.
  solid(list, discAlong([DECK.x1 + 3, DECK.half + 3, DECK_Z[1] - ROLLER_R], [0, 1, 0], 4.6, 7, P, 32, 0.4), 'mid');
  solid(list, discAlong([DECK.x1 + 3, DECK.half + 10, DECK_Z[1] - ROLLER_R], [0, 1, 0], 3.0, 2.4, P, 24), 'mid');
}

// --------------------------------------------------------------- the control box and its stance counter
{
  const list = PARTS_LIST;
  solid(list, slabOf(BOX, BOX_Z[0], BOX_Z[1] - BOX_Z[0], P, 4, 0.8), 'mid', { inner: seamOf(sideSeam(BOX, BOX_Z[1] - 3, P, 4)) });
  for (const [x, y] of [
    [BOX.x + 2.2, BOX.y + 2.2],
    [BOX.x + BOX.w - 2.2, BOX.y + 2.2],
    [BOX.x + 2.2, BOX.y + BOX.d - 2.2],
    [BOX.x + BOX.w - 2.2, BOX.y + BOX.d - 2.2],
  ] as Plane[]) dots(list, [[x, y, BOX_Z[1]]], 0.42, 'mid');
  // The dial: a bezel on the top, ticks for none to four feet over half a turn.
  solid(list, cylinder(DIAL.x, DIAL.y, DIAL.r, BOX_Z[1], 1.4, P, 56, 0.4), 'hi', { crease: 'lo', inner: seamOf(sideArc(DIAL.x, DIAL.y, DIAL.r, BOX_Z[1] + 0.7, P, 40)) });
  line(list, kitRing(DIAL.x, DIAL.y, DIAL.r - 1.2, BOX_Z[1] + 1.4, P, 56), 'lo');
  const ticks = radialTicks(DIAL.x, DIAL.y, DIAL.r - 1.2, 4, 1, BOX_Z[1] + 1.4, [1.2, 1.8], P, -Math.PI / 2, Math.PI);
  line(list, ticks.major, 'mid');
  list.push({ kind: 'slot', slot: 'needle' });
  solid(list, cylinder(DIAL.x, DIAL.y, 1.4, BOX_Z[1] + 1.4, 0.8, P, 16), 'mid');
}

// --------------------------------------------------------------- the recorder
{
  const list = PARTS_LIST;
  solid(list, slabOf(REC, REC_Z[0], REC_Z[1] - REC_Z[0], P, 4, 0.8), 'mid', { inner: seamOf(sideSeam(REC, REC_Z[0] + 2.6, P, 4)) });
  for (const [x, y] of [
    [REC.x + 2.4, REC.y + 2.2],
    [REC.x + REC.w - 2.4, REC.y + 2.2],
    [REC.x + 2.4, REC.y + REC.d - 2.2],
    [REC.x + REC.w - 2.4, REC.y + REC.d - 2.2],
  ] as Plane[]) dots(list, [[x, y, REC_Z[1]]], 0.42, 'mid');
  // The take-up roll at the left and the supply roll at the right, each on two cheeks.
  for (const x of [PAPER.x0 - 3.5, PAPER.x1 + 3.5]) {
    for (const y of [PAPER.y0 - 2.4, PAPER.y0 + 4 * PAPER.lane + 0.8]) solid(list, slabOf({ x: x - 2.4, y, w: 4.8, d: 1.6, r: 0.4 }, REC_Z[1], 6.4, P, 2), 'lo');
    solid(list, discAlong([x, PAPER.y0 - 0.8, REC_Z[1] + 3.6], [0, 1, 0], 3.2, 4 * PAPER.lane + 1.6, P, 28), 'hi');
  }
  // The paper on its platen, with a faint rule between the lanes.
  const paper: Plan = { x: PAPER.x0, y: PAPER.y0, w: PAPER.x1 - PAPER.x0, d: 4 * PAPER.lane, r: 0 };
  solid(list, slabOf(paper, REC_Z[1], PAPER_Z - REC_Z[1], P, 1), 'hi');
  for (let lane = 1; lane < 4; lane++) {
    line(list, lineOnTop([PAPER.x0, PAPER.y0 + lane * PAPER.lane], [PAPER.x1, PAPER.y0 + lane * PAPER.lane], PAPER_Z, P), 'faint');
  }
  list.push({ kind: 'slot', slot: 'chart' });
  // The pen bridge: two posts and a bar across the paper; the pens hang from it.
  for (const y of [PAPER.y0 - 2.6, PAPER.y0 + 4 * PAPER.lane + 1]) {
    solid(list, slabOf({ x: PEN_X + 1.2, y, w: 3.2, d: 1.6, r: 0.4 }, REC_Z[1], 14, P, 2), 'mid');
  }
  solid(list, slabOf({ x: PEN_X + 1.2, y: PAPER.y0 - 2.6, w: 3.2, d: 4 * PAPER.lane + 5.2, r: 0.5 }, REC_Z[1] + 14, 2.4, P, 2, 0.3), 'mid');
  list.push({ kind: 'slot', slot: 'pens' });
  // The cable from the control box to the recorder, along the base.
  list.push({
    kind: 'wire',
    from: at([BOX.x + BOX.w / 2, BOX.y + BOX.d, BASE_Z[1] + 3]),
    via: [at([BOX.x + BOX.w / 2, REC.y - 4, BASE_Z[1] + 0.6])],
    to: at([REC.x + 12, REC.y, REC_Z[0] + 3]),
    tone: 'lo',
  });
}

export const PARTS: readonly Part[] = PARTS_LIST;

// ------------------------------------------------------------------ the gait
export interface FootPose {
  leg: LegId;
  /** Foot position relative to its hip along the belt, and its lift above the belt. */
  dx: number;
  lift: number;
  down: boolean;
}

/** The robot at one moment of a gait: each foot, and how high its body rides. */
export function gaitPose(id: GaitId, phase: number): { feet: FootPose[]; rise: number } {
  const gait = GAITS[id];
  const feet = FOOT_ORDER.map((leg) => {
    const p = legPhase(gait, leg, phase);
    if (p < gait.dutyFactor) return { leg, p, down: true, dx: STRIDE / 2 - STRIDE * (p / gait.dutyFactor), lift: 0 };
    const swing = (p - gait.dutyFactor) / (1 - gait.dutyFactor);
    return { leg, p, down: false, dx: -STRIDE / 2 + STRIDE * swing, lift: LIFT * Math.sin(Math.PI * swing) };
  });
  let rise = 0;
  if (feet.every((foot) => !foot.down)) {
    // Mid-leap: from the last foot leaving the ground to the next one landing.
    const sinceLift = Math.min(...feet.map((foot) => foot.p - gait.dutyFactor));
    const untilLand = Math.min(...feet.map((foot) => 1 - foot.p));
    rise = LEAP[id] * Math.sin(Math.PI * (sinceLift / (sinceLift + untilLand)));
  }
  return { feet: feet.map(({ leg, dx, lift, down }) => ({ leg, dx, lift, down })), rise };
}

/** Blend two poses (the robot changing gait between beats). */
export function blendPose(a: ReturnType<typeof gaitPose>, b: ReturnType<typeof gaitPose>, k: number) {
  return {
    feet: a.feet.map((foot, index) => {
      const other = b.feet[index]!;
      return { leg: foot.leg, dx: foot.dx + (other.dx - foot.dx) * k, lift: foot.lift + (other.lift - foot.lift) * k, down: k < 0.5 ? foot.down : other.down };
    }),
    rise: a.rise + (b.rise - a.rise) * k,
  };
}

/** The knee for a hip and foot: two equal links, the knee bending back toward the tail. */
function kneeOf(hip: Point3, foot: Point3): Point3 {
  const dx = foot[0] - hip[0];
  const dz = foot[2] - hip[2];
  const reach = Math.min(Math.hypot(dx, dz), THIGH + SHIN - 0.01);
  const toward = Math.atan2(dz, dx);
  const bend = Math.acos(Math.max(-1, Math.min(1, (THIGH * THIGH + reach * reach - SHIN * SHIN) / (2 * THIGH * reach))));
  const angle = toward - bend;
  return [hip[0] + THIGH * Math.cos(angle), hip[1], hip[2] + THIGH * Math.sin(angle)];
}

/** One leg's solids at a pose: hip motor, thigh, knee, shin and foot. */
export function legParts(foot: FootPose, rise: number): Array<{ paths: SolidPaths; tone: Tone }> {
  const y = legY(foot.leg);
  const side = Math.sign(y);
  const hip: Point3 = [legX(foot.leg), y, BELT_Z + HIP_H + rise];
  const toe: Point3 = [legX(foot.leg) + foot.dx, y, BELT_Z + 2.2 + foot.lift];
  const knee = kneeOf(hip, toe);
  const out: Array<{ paths: SolidPaths; tone: Tone }> = [];
  // The hip motor's can, from the body's side out to the leg's plane.
  out.push({ paths: discAlong([hip[0], side * 6.5, hip[2]], [0, side, 0], 4.6, 3.6, P, 28, 0.3), tone: 'mid' });
  out.push({ paths: barBetween(hip, knee, [0, 1, 0], 2.6, 3.8, P, 0.3), tone: 'mid' });
  out.push({ paths: discAlong([knee[0], y - side * 1.6, knee[2]], [0, side, 0], 2.4, 3.2, P, 20), tone: 'mid' });
  out.push({ paths: barBetween(knee, [toe[0], y, toe[2] + 1.2], [0, 1, 0], 2.0, 2.6, P, 0.2), tone: 'mid' });
  out.push({ paths: discAlong([toe[0], y - side * 1.4, toe[2]], [0, side, 0], 2.2, 2.8, P, 20), tone: foot.down ? 'hi' : 'mid' });
  return out;
}

/** The body, head and sensor, built level at rest; the live code lifts them by the pose's rise. */
export const BODY_PARTS: readonly DrawnPart[] = (() => {
  const list: Part[] = [];
  const z0 = BELT_Z + HIP_H - 4;
  const body: Plan = { x: -27, y: -6.5, w: 54, d: 13, r: 3 };
  solid(list, slabOf(body, z0, 10, P, 6, 0.8), 'hi', { inner: seamOf(sideSeam(body, z0 + 3.4, P, 6)) });
  // The hatch on top with its screws, and the carry handle on two posts.
  line(list, planOutline(insetPlan(body, 3.2), z0 + 10, P, 6), 'faint');
  for (const x of [-21, 21]) for (const y of [-3.6, 3.6]) dots(list, [[x, y, z0 + 10]], 0.4, 'mid');
  const battery: Plan = { x: -14, y: -4.2, w: 22, d: 8.4, r: 1.6 };
  solid(list, slabOf(battery, z0 + 10, 2.6, P, 4, 0.4), 'mid', { inner: seamOf(sideSeam(battery, z0 + 11.2, P, 4)) });
  for (const x of [11, 19]) solid(list, cylinder(x, 0, 0.9, z0 + 10, 4.2, P, 12), 'mid');
  solid(list, barBetween([10.2, 0, z0 + 14.6], [19.8, 0, z0 + 14.6], [0, 1, 0], 2.0, 1.4, P, 0.2), 'mid');
  // The head: a sensor housing at the front with its lens.
  const head: Plan = { x: 27, y: -5, w: 7, d: 10, r: 1.6 };
  solid(list, slabOf(head, z0 + 2, 8, P, 4, 0.5), 'mid');
  solid(list, discAlong([34, 0, z0 + 6], [1, 0, 0], 2.6, 1.6, P, 24), 'mid');
  return list.filter((part): part is DrawnPart => part.kind !== 'slot');
})();
/** Screen offset of the body for a rise. */
export const bodyShift = (rise: number) => {
  const a = at([0, 0, 0]);
  const b = at([0, 0, rise]);
  return `translate(${r2(b[0] - a[0])} ${r2(b[1] - a[1])})`;
};

/** The belt's slats at a belt position (mm moved back since the start). */
export function beltSlats(travel: number): string {
  const pitch = 6;
  const offset = ((travel % pitch) + pitch) % pitch;
  const lines: string[] = [];
  for (let x = DECK.x1 - offset; x > DECK.x0; x -= pitch) lines.push(lineOnTop([x, -DECK.half], [x, DECK.half], BELT_Z, P));
  return lines.join('');
}
/** The belt's darker band on the deck. */
export const BELT_BAND = planOutline({ x: DECK.x0, y: -DECK.half, w: DECK.x1 - DECK.x0, d: 2 * DECK.half, r: 0 }, BELT_Z, P, 1);

/** The stance counter's needle for a count of feet down (0 to 4, eased between). */
export function needlePath(count: number): string {
  const angle = -Math.PI / 2 + (Math.max(0, Math.min(4, count)) / 4) * Math.PI;
  const z = BOX_Z[1] + 1.6;
  const tip: Point3 = [DIAL.x + (DIAL.r - 2.6) * Math.sin(angle), DIAL.y - (DIAL.r - 2.6) * Math.cos(angle), z];
  // The tail ends under the hub, which is drawn over it.
  const tail: Point3 = [DIAL.x - 0.9 * Math.sin(angle), DIAL.y + 0.9 * Math.cos(angle), z];
  return pathOf([at(tail), at(tip)]);
}

/** A pen on its arm: down on the paper when its foot is down. */
export function penParts(leg: LegId, down: number): Array<{ paths: SolidPaths; tone: Tone }> {
  const y = laneY(leg);
  const lift = (1 - down) * 1.6;
  const top = REC_Z[1] + 14;
  return [
    { paths: barBetween([PEN_X + 2.8, y, top], [PEN_X + 0.8, y, PAPER_Z + 3 + lift], [0, 1, 0], 1.6, 1.4, P), tone: 'mid' },
    { paths: cylinder(PEN_X, y, 1.1, PAPER_Z + 0.05 + lift, 3.4, P, 16), tone: 'hi' },
  ];
}

/** The ink one lane carries over a stretch of paper, as bars between paper positions. */
export function inkBars(leg: LegId, stretches: ReadonlyArray<readonly [number, number]>, paper: number): string {
  const y = laneY(leg);
  const half = 1.05;
  return stretches
    .map(([q0, q1]) => {
      // Ink laid when the paper stood at q has since moved left by (paper - q).
      const x1 = PEN_X - (paper - q1);
      const x0 = Math.max(PAPER.x0 + 0.6, PEN_X - (paper - q0));
      if (x1 <= x0 + 0.05) return '';
      return pathOf([at([x0, y - half, PAPER_Z]), at([x1, y - half, PAPER_Z]), at([x1, y + half, PAPER_Z]), at([x0, y + half, PAPER_Z])], true);
    })
    .join('');
}

/** The longest stretch of written paper the window shows. */
export const PAPER_WINDOW = PEN_X - (PAPER.x0 + 0.6);
