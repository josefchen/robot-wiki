/**
 * The reward-writing loop for EurekaLoop, drawn with the isometric kit.
 *
 * The object is the explanation. Eureka has a language model write the
 * rules a robot is scored by, train the robot under them, read how the
 * robot did and rewrite the rules. Here the rules are an edge-notched card:
 * one notch on its top edge for each rule the reward pays or charges for
 * (raw speed, being near the target speed, staying up, falling, smooth
 * moves). The writer, a cabinet at the left, punches the card and slides it
 * out along a short track into the reader at the treadmill's rear, whose
 * feeler pins drop into its notches. The robot on the treadmill runs under
 * those rules. A strip-chart logger in front draws its speed on paper that
 * feeds straight back into the writer, which reads it and punches the next
 * card. The card, the rules, is the one lit part.
 *
 * Round 1 pays only for speed: the robot sprints to 2.8 metres a second
 * and falls within 0.4 seconds, so the paper shows one spike. Round 2 adds
 * staying up and a cost for falling: it stands still, a flat line at almost
 * zero for the full 20 seconds. Round 3 swaps raw speed for being near
 * 1.0 metre a second and adds smoothness: it trots along the target line.
 * Every number comes from the scripted statistics in lib/eureka.ts
 * (unchanged); the rules on each card are read from that round's reward
 * code. A scripted illustration, not a recording of a real Eureka run.
 *
 * World units: millimetres. x runs along the belt (the robot faces +x), y
 * toward the viewer, z up.
 */
import {
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring as kitRing,
  sideSeam,
  slabOf,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong, prismAlong } from '../prism.ts';
import { BACK_RISE, FOOT_ORDER, STANDING, rigFor, type FootPose, type RigPart, type RobotPose, type RobotSolid } from './quadruped-rig.ts';
import { EUREKA_GENERATIONS } from '../../../lib/eureka.ts';
import { GAITS, legPhase } from '../../../lib/gait.ts';

// ------------------------------------------------------------------ the truth, from lib/eureka.ts
const statOf = (gen: number, label: string) => {
  const stat = EUREKA_GENERATIONS[gen]!.stats.find((s) => s.label === label);
  if (!stat) throw new Error(`no ${label} in generation ${gen}`);
  return Number.parseFloat(stat.value);
};
/** Episode cap in seconds: the full-length runs last this long. */
export const EPISODE_SECONDS = statOf(1, 'episode length');
/** Round 1: the sprint's speed, and when the fall ends it. */
export const SPRINT_SPEED = statOf(0, 'base_vel_x (mean)');
export const FALL_AT = statOf(0, 'episode length');
/** Round 2: the mean speed of a robot that stands still. */
export const STANDING_SPEED = statOf(1, 'base_vel_x (mean)');
/** Round 3: the target speed in the task, and the mean miss. */
export const TARGET_SPEED = 1.0;
export const TRACKING_ERROR = statOf(2, 'velocity tracking error');

export type Outcome = 'falls' | 'stands' | 'walks';
/** What each round's robot does, from its statistics: every run falls, it never moves, or it walks. */
export const OUTCOMES: readonly Outcome[] = EUREKA_GENERATIONS.map((_, gen) => {
  if (statOf(gen, 'episodes ending in a fall') >= 100) return 'falls';
  if (gen === 1) return 'stands';
  return 'walks';
});

/** The rules a card can carry, left to right along its top edge. */
export const RULES = ['speed', 'target', 'up', 'fall', 'smooth'] as const;
export type Rule = (typeof RULES)[number];
const RULE_IN_CODE: Record<Rule, RegExp> = {
  speed: /^\s*(return obs\.base_lin_vel_x|speed = obs\.base_lin_vel_x)$/,
  target: /^\s*track = /,
  up: /^\s*alive = /,
  fall: /^\s*fall = -/,
  smooth: /^\s*smooth = /,
};
/** Each round's card: the rules its reward code pays or charges for. */
export const CARD_RULES: readonly (readonly Rule[])[] = EUREKA_GENERATIONS.map((generation) =>
  RULES.filter((rule) => generation.code.some((line) => RULE_IN_CODE[rule].test(line))),
);

/** The robot's speed at a moment of an episode, in metres a second, or null once the run has ended in a fall. */
export function speedAt(gen: number, seconds: number): number | null {
  if (OUTCOMES[gen] === 'falls') {
    // Up to the sprint's speed at once, then the fall stops it dead and ends the run.
    if (seconds > FALL_AT) return null;
    return SPRINT_SPEED * Math.min(1, seconds / 0.05, (FALL_AT - seconds) / 0.03);
  }
  if (OUTCOMES[gen] === 'stands') return STANDING_SPEED;
  return walkSpeed(seconds, RIPPLE_SCALE);
}
/** Up to the target over its first strides, then a fixed wobble about it: a sum of slow sines. */
const WALK_RAMP = 1.2;
function walkSpeed(seconds: number, wobble: number) {
  const t = Math.min(1, seconds / WALK_RAMP);
  const up = t * t * (3 - 2 * t);
  const ripple = Math.sin(1.3 * seconds) + 0.55 * Math.sin(3.1 * seconds) + 0.35 * Math.sin(7.3 * seconds);
  return up * (TARGET_SPEED + wobble * ripple);
}
/** The wobble's size, solved so the mean miss from the target over the run is the tracking error. */
const RIPPLE_SCALE = (() => {
  const missFor = (wobble: number) => {
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) sum += Math.abs(walkSpeed(((i + 0.5) / n) * 20, wobble) - TARGET_SPEED);
    return sum / n;
  };
  let low = 0;
  let high = 1;
  for (let step = 0; step < 60; step++) {
    const mid = (low + high) / 2;
    if (missFor(mid) < TRACKING_ERROR) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
})();

// ------------------------------------------------------------------ the layout (mm)
const BASE: Plan = { x: -112, y: -24, w: 174, d: 76, r: 6 };
const BASE_Z = [0, 6] as const;
const TOP = BASE_Z[1];
const O: Point3 = [0, 0, TOP];
/** The writer: a cabinet across the left end, reading paper at the front and sending cards out at the back. */
const WRITER: Plan = { x: -106, y: -18, w: 20, d: 64, r: 2 };
const WRITER_H = 24;
const WRITER_FACE = WRITER.x + WRITER.w;
/** The card track between the writer and the reader. */
const TRACK = { x0: WRITER_FACE, x1: -82 };
/** The reader at the treadmill's rear: two halves either side of the card's slot. */
const READER = { x0: -82, x1: -54, half: 8, slot: 0.6, h: 12 };
const READER_TOP = TOP + READER.h;
/** The card: 24 wide, 13 tall, standing in the slot with its lower 3 inside. */
export const CARD = { w: 24, h: 13, t: 0.6, sunk: 3, pitch: 4.2, notchW: 2.4, notchD: 3 };
const CARD_Z0 = READER_TOP - CARD.sunk;
/** The card's centre along x: in the reader, and out of sight inside the writer. */
export const CARD_IN_READER = (READER.x0 + READER.x1) / 2;
export const CARD_IN_WRITER = CARD_IN_READER - 36;
/** The feeler pins' bridge over the reader. */
const BRIDGE = { z0: CARD_Z0 + CARD.h + 4.2, h: 1.8, y0: -5.2, y1: 1.6 };
export const PIN_R = 0.55;
/**
 * The logger at the treadmill's front end writes on an upright paper ribbon that runs left along the front of
 * the bench, in a guide channel, into the writer's slot: time along the ribbon, speed up its face.
 */
const RIBBON = { x0: WRITER_FACE, x1: 50, y: 40, t: 0.6, z0: TOP + 3.2, z1: TOP + 15.4 };
/** The guide channel's walls, which hide the ribbon's lower edge as far as the logger's plinth. */
const CHANNEL_H = 4.6;
/** The ribbon's face toward the viewer, where the pen writes. */
const RIBBON_FACE = RIBBON.y + RIBBON.t;
const RECORDER: Plan = { x: 32, y: 34, w: 26, d: 14, r: 1.6 };
const RECORDER_H = 3;
export const PEN_X = 40;
/** Speed up the ribbon: 0 just above the channel, 3 metres a second near its top edge. */
const SPEED_Z0 = TOP + 5.8;
const MM_PER_SPEED = 2.9;
export const speedZ = (speed: number) => SPEED_Z0 + speed * MM_PER_SPEED;
/** Ribbon each run feeds (its 20 seconds), and the blank gap fed between runs. */
export const RUN_PAPER = 34;
export const GAP_PAPER = 8;
/** Paper fed by the end of round `gen` (0-based). */
export const paperAfter = (gen: number) => (gen + 1) * RUN_PAPER + gen * GAP_PAPER;
/** Where round `gen`'s ink starts on the paper. */
const inkStart = (gen: number) => gen * (RUN_PAPER + GAP_PAPER);

// ---------------------------------------------------------------- the fit
const AZIMUTH = 60;
const ELEVATION = 36;
const extremes: Point3[] = [
  [BASE.x, BASE.y, -6],
  [BASE.x + BASE.w, BASE.y, -6],
  [BASE.x, BASE.y + BASE.d, -6],
  [BASE.x + BASE.w, BASE.y + BASE.d, -6],
  // The standing robot's battery top and head, and the hopper's tallest card.
  [-14, -4.2, TOP + 10.4 + 27 + 8.6],
  [8, 4.2, TOP + 10.4 + 27 + 8.6],
  [34, 5, TOP + 10.4 + 27 + 6],
  [WRITER.x + 3, WRITER.y + 4, TOP + WRITER_H + 7.4],
  [WRITER.x + 17, WRITER.y + 12, TOP + WRITER_H + 7.4],
];
export const WIDTH = 600;
const PAD = 14;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const rig = rigFor(P, O);
const at = (point: Point3) => iso(point, P);

// ----------------------------------------------------------------- the parts
export type Slot = 'belt' | 'legs-far' | 'body' | 'legs-near' | 'card' | 'pins' | 'lever' | 'ink' | 'pen';
export type Part = RigPart | { kind: 'fill'; d: string; shade: 0 | 1 | 2 | 3 } | { kind: 'slot'; slot: Slot };

const seamOf = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');
const PARTS_LIST: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  PARTS_LIST.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean) => {
  if (d) PARTS_LIST.push({ kind: 'line', d, tone, free });
};
const dots = (points: Point3[], size = 0.45, tone: Tone = 'mid') => PARTS_LIST.push({ kind: 'dots', points: points.map(at), size, tone });
function screw(x: number, y: number, z: number, r = 1.2) {
  line(kitRing(x, y, r, z, P, 16), 'lo');
  dots([[x, y, z]], 0.45, 'mid');
}
/** A closed outline on the writer's right face (x = WRITER_FACE), from (y, z) points. */
const onFace = (points: Array<[number, number]>) => pathOf(points.map(([y, z]) => at([WRITER_FACE, y, z])), true);
const rect = (y0: number, z0: number, y1: number, z1: number): Array<[number, number]> => [
  [y0, z0],
  [y1, z0],
  [y1, z1],
  [y0, z1],
];

// The base on four turned feet, its seam, groove and corner screws.
for (const [x, y] of [
  [BASE.x + 12, BASE.y + 12],
  [BASE.x + BASE.w - 12, BASE.y + 12],
  [BASE.x + 12, BASE.y + BASE.d - 12],
  [BASE.x + BASE.w - 12, BASE.y + BASE.d - 12],
] as Plane[]) {
  solid(cylinder(x, y, 7, -6, 1.6, P, 28), 'lo');
  solid(cylinder(x, y, 5.2, -4.4, 4.4, P, 28), 'mid');
}
solid(slabOf(BASE, BASE_Z[0], BASE_Z[1], P, 8, 1.4), 'mid', { inner: seamOf(sideSeam(BASE, 2.4, P, 8)) });
line(planOutline(insetPlan(BASE, 5), TOP, P), 'faint');
for (const [x, y] of [
  [BASE.x + 9, BASE.y + 9],
  [BASE.x + BASE.w - 9, BASE.y + 9],
  [BASE.x + 9, BASE.y + BASE.d - 9],
  [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
] as Plane[]) screw(x, y, TOP);

// The writer: a cabinet with a lid line, a hopper of blank cards and the punch on top, and on its right face
// the slot the cards leave by and the slot the paper comes back in by.
{
  const top = TOP + WRITER_H;
  solid(slabOf(WRITER, TOP, WRITER_H, P, 4, 0.8), 'mid', { inner: seamOf(sideSeam(WRITER, top - 3.2, P, 4)) + seamOf(sideSeam(WRITER, TOP + 3, P, 4)) });
  line(planOutline(insetPlan(WRITER, 2.4), top, P, 4), 'faint');
  for (const [x, y] of [
    [WRITER.x + 1.4, WRITER.y + 1.4],
    [WRITER_FACE - 1.4, WRITER.y + 1.4],
    [WRITER.x + 1.4, WRITER.y + WRITER.d - 1.4],
    [WRITER_FACE - 1.4, WRITER.y + WRITER.d - 1.4],
  ] as Plane[]) dots([[x, y, top]], 0.45, 'mid');
  // The hopper at the back: a tray, and three blank cards standing in it.
  const hopper: Plan = { x: WRITER.x + 3, y: WRITER.y + 4, w: 14, d: 8, r: 0.8 };
  solid(slabOf(hopper, top, 2.2, P, 3, 0.3), 'lo');
  for (const [index, y] of [-2, 0, 2].entries()) {
    const cy = hopper.y + hopper.d / 2 + y;
    solid(prismAlong([
      [hopper.x + 1.6, cy, top + 2.2],
      [hopper.x + hopper.w - 1.6, cy, top + 2.2],
      [hopper.x + hopper.w - 1.6, cy, top + 2.2 + 5 - index * 0.4],
      [hopper.x + 1.6, cy, top + 2.2 + 5 - index * 0.4],
    ], [0, -CARD.t, 0], P), 'hi');
  }
  // The punch: a head on the lid above the card slot, its lever in the lever slot.
  const head: Plan = { x: WRITER_FACE - 11, y: -4, w: 8, d: 8, r: 1 };
  solid(slabOf(head, top, 5.4, P, 3, 0.5), 'mid', { inner: seamOf(sideSeam(head, top + 1.6, P, 3)) });
  solid(discAlong([WRITER_FACE - 7, 4, top + 3.6], [0, 1, 0], 1.8, 1.2, P, 20, 0.2), 'mid');
  PARTS_LIST.push({ kind: 'slot', slot: 'lever' });
  // The label plate on the lid's front half: rule lines for its printed text, and two screws.
  const label: Plan = { x: WRITER.x + 4, y: 30, w: 12, d: 9, r: 0.8 };
  solid(slabOf(label, top, 0.8, P, 4), 'lo');
  line(planOutline(insetPlan(label, 0.8), top + 0.8, P, 4), 'faint');
  for (const [x, length] of [
    [label.x + 3, 5.4],
    [label.x + 5, 4],
    [label.x + 7, 4.8],
  ] as Array<[number, number]>) line(lineOnTop([x, label.y + 1.8], [x, label.y + 1.8 + length], top + 0.8, P), 'lo', true);
  dots([[label.x + 9.6, label.y + 1.6, top + 0.8], [label.x + 9.6, label.y + label.d - 1.6, top + 0.8]], 0.4, 'mid');
  // On the front face: a service door with its hinge pins and a knob.
  const front = WRITER.y + WRITER.d;
  const door: Array<[number, number]> = [
    [WRITER.x + 2.4, TOP + 4],
    [WRITER_FACE - 2.4, TOP + 4],
    [WRITER_FACE - 2.4, TOP + WRITER_H - 6],
    [WRITER.x + 2.4, TOP + WRITER_H - 6],
  ];
  line(pathOf(door.map(([x, z]) => at([x, front, z])), true), 'lo');
  dots([[WRITER.x + 2.4, front, TOP + 7], [WRITER.x + 2.4, front, TOP + WRITER_H - 9]], 0.55, 'mid');
  solid(discAlong([WRITER_FACE - 5, front, TOP + 12], [0, 1, 0], 1.2, 1.4, P, 16, 0.2), 'mid');
  // On the right face: vents, the card slot and the paper slot, each a recess.
  for (let i = 0; i < 4; i++) {
    const y = 14 + i * 3.2;
    const vent = onFace(rect(y, TOP + 14, y + 1.4, TOP + 21));
    PARTS_LIST.push({ kind: 'fill', d: vent, shade: 1 });
    line(vent, 'lo');
  }
  const cardSlot = onFace(rect(-1.1, CARD_Z0 - 0.4, 1.1, CARD_Z0 + CARD.h + 1.2));
  PARTS_LIST.push({ kind: 'fill', d: cardSlot, shade: 0 });
  line(cardSlot, 'lo');
  const paperSlot = onFace(rect(RIBBON.y - 0.5, RIBBON.z0 - 0.6, RIBBON_FACE + 0.5, RIBBON.z1 + 0.8));
  PARTS_LIST.push({ kind: 'fill', d: paperSlot, shade: 0 });
  line(paperSlot, 'lo');
}

// The reader's back half and the track's back rail: the card stands between them and their front halves.
solid(slabOf({ x: READER.x0, y: -READER.half, w: READER.x1 - READER.x0, d: READER.half - READER.slot, r: 1 }, TOP, READER.h, P, 3, 0.5), 'mid', {
  inner: seamOf(sideSeam({ x: READER.x0, y: -READER.half, w: READER.x1 - READER.x0, d: READER.half - READER.slot, r: 1 }, TOP + 3, P, 3)),
});
solid(slabOf({ x: TRACK.x0, y: -2.4, w: TRACK.x1 - TRACK.x0, d: 2.4 - READER.slot, r: 0.4 }, TOP, CARD_Z0 - TOP + 1.4, P, 2, 0.3), 'mid');

// The feeler bridge's two posts, behind the card on the reader's back half.
for (const x of [READER.x0 + 1.2, READER.x1 - 3.2]) {
  solid(slabOf({ x, y: BRIDGE.y0, w: 2, d: 2, r: 0.4 }, READER_TOP, BRIDGE.z0 - READER_TOP, P, 2, 0.3), 'mid');
}
// The card, then the track's front rail and the reader's front half, which hide its lower edge.
PARTS_LIST.push({ kind: 'slot', slot: 'card' });
solid(slabOf({ x: TRACK.x0, y: READER.slot, w: TRACK.x1 - TRACK.x0, d: 2.4 - READER.slot, r: 0.4 }, TOP, CARD_Z0 - TOP + 1.4, P, 2, 0.3), 'mid');
{
  const front: Plan = { x: READER.x0, y: READER.slot, w: READER.x1 - READER.x0, d: READER.half - READER.slot, r: 1 };
  solid(slabOf(front, TOP, READER.h, P, 3, 0.5), 'mid', { inner: seamOf(sideSeam(front, TOP + 3, P, 3)) });
  for (const x of [READER.x0 + 2, READER.x1 - 2]) dots([[x, READER.half - 1.6, READER_TOP]], 0.45, 'mid');
}
// The feeler bridge's plate over the card; the pins hang from its underside.
{
  PARTS_LIST.push({ kind: 'slot', slot: 'pins' });
  const plate: Plan = { x: READER.x0 + 0.6, y: BRIDGE.y0, w: READER.x1 - READER.x0 - 1.2, d: BRIDGE.y1 - BRIDGE.y0, r: 0.6 };
  solid(slabOf(plate, BRIDGE.z0, BRIDGE.h, P, 3, 0.3), 'mid');
  dots(RULES.map((_, index) => [notchX(CARD_IN_READER, index), BRIDGE.y1 - 1.6, BRIDGE.z0 + BRIDGE.h] as Point3), 0.4, 'mid');
}

// The treadmill's far side, the belt, the far rail, the robot and the near side.
PARTS_LIST.push(...rig.treadmillBack());
PARTS_LIST.push({ kind: 'slot', slot: 'belt' });
PARTS_LIST.push(...rig.farRail());
PARTS_LIST.push({ kind: 'slot', slot: 'legs-far' });
PARTS_LIST.push({ kind: 'slot', slot: 'body' });
PARTS_LIST.push({ kind: 'slot', slot: 'legs-near' });
PARTS_LIST.push(...rig.treadmillFront());

// The logger: its plinth, the platen the ribbon passes, the supply roll, and the pen on its post. The ribbon runs
// left in its channel, the target and zero lines printed along it, into the writer's slot.
{
  const top = TOP + RECORDER_H;
  solid(slabOf(RECORDER, TOP, RECORDER_H, P, 4, 0.5), 'mid', { inner: seamOf(sideSeam(RECORDER, TOP + 1.2, P, 4)) });
  for (const [x, y] of [
    [RECORDER.x + 1.6, RECORDER.y + 1.6],
    [RECORDER.x + RECORDER.w - 1.6, RECORDER.y + 1.6],
    [RECORDER.x + 1.6, RECORDER.y + RECORDER.d - 1.6],
    [RECORDER.x + RECORDER.w - 1.6, RECORDER.y + RECORDER.d - 1.6],
  ] as Plane[]) dots([[x, y, top]], 0.4, 'mid');
  // The platen behind the ribbon where the pen writes.
  solid(slabOf({ x: PEN_X - 5, y: RIBBON.y - 1.4, w: 10, d: 1.2, r: 0.3 }, top, RIBBON.z1 - top + 0.6, P, 2, 0.3), 'mid');
  // The channel's back wall, the ribbon, and the ink on its face.
  solid(slabOf({ x: RIBBON.x0, y: RIBBON.y - 1, w: RECORDER.x - RIBBON.x0, d: 0.8, r: 0.2 }, TOP, CHANNEL_H, P, 2, 0.2), 'lo');
  solid(prismAlong([
    [RIBBON.x0, RIBBON.y + RIBBON.t, RIBBON.z0],
    [RIBBON.x1, RIBBON.y + RIBBON.t, RIBBON.z0],
    [RIBBON.x1, RIBBON.y + RIBBON.t, RIBBON.z1],
    [RIBBON.x0, RIBBON.y + RIBBON.t, RIBBON.z1],
  ], [0, -RIBBON.t, 0], P), 'hi');
  line(pathOf([at([RIBBON.x0, RIBBON_FACE, speedZ(TARGET_SPEED)]), at([RIBBON.x1, RIBBON_FACE, speedZ(TARGET_SPEED)])]), 'lo');
  line(pathOf([at([RIBBON.x0, RIBBON_FACE, speedZ(0)]), at([RIBBON.x1, RIBBON_FACE, speedZ(0)])]), 'faint');
  PARTS_LIST.push({ kind: 'slot', slot: 'ink' });
  // The supply roll at the right end, standing on the plinth with a cap.
  solid(cylinder(RIBBON.x1 + 2.6, RIBBON.y + 3.4, 3.2, top, RIBBON.z1 - top, P, 32, 0.3), 'hi');
  solid(cylinder(RIBBON.x1 + 2.6, RIBBON.y + 3.4, 1.4, RIBBON.z1, 1.2, P, 20), 'mid');
  // The channel's front wall, in front of the ribbon's lower edge.
  solid(slabOf({ x: RIBBON.x0, y: RIBBON.y + RIBBON.t + 0.2, w: RECORDER.x - RIBBON.x0, d: 0.8, r: 0.2 }, TOP, CHANNEL_H, P, 2, 0.2), 'lo');
  for (const x of [-60, -20, 16]) dots([[x, RIBBON.y + RIBBON.t + 0.6, TOP + CHANNEL_H]], 0.4, 'mid');
  // The pen and its carriage, then the post it rides, in front of the ribbon.
  PARTS_LIST.push({ kind: 'slot', slot: 'pen' });
  solid(cylinder(PEN_X + 3.4, RIBBON.y + 6.4, 1.3, top, RIBBON.z1 + 3 - top, P, 20), 'mid');
  solid(cylinder(PEN_X + 3.4, RIBBON.y + 6.4, 2, RIBBON.z1 + 3, 1.4, P, 24, 0.2), 'mid');
}

// The speed cable from the treadmill's drive motor, in an arc down onto a gland on the logger's plinth.
{
  const cap = rig.motorCapPoint;
  const gland: Point3 = [RECORDER.x + RECORDER.w - 3, RECORDER.y + 2.6, TOP + RECORDER_H];
  solid(cylinder(gland[0], gland[1], 1.3, gland[2], 1.4, P, 20, 0.2), 'mid');
  const route = smoothRoute([
    cap,
    [cap[0] + 0.3, cap[1] + 2, cap[2] - 0.6],
    [gland[0] - 0.8, gland[1] - 2.6, gland[2] + 4.2],
    [gland[0], gland[1], gland[2] + 2.6],
    [gland[0], gland[1], gland[2] + 1.4],
  ]);
  PARTS_LIST.push({ kind: 'wire', from: at(route[0]!), via: route.slice(1, -1).map(at), to: at(route[route.length - 1]!), tone: 'lo' });
}

export const PARTS: readonly Part[] = PARTS_LIST;

/** A cable's route through waypoints, sampled along a Catmull-Rom curve so it bends instead of kinking. */
function smoothRoute(points: Point3[], samples = 6): Point3[] {
  const out: Point3[] = [points[0]!];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    for (let k = 1; k <= samples; k++) {
      const t = k / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1, 2].map((axis) => 0.5 * (2 * p1[axis]! + (-p0[axis]! + p2[axis]!) * t + (2 * p0[axis]! - 5 * p1[axis]! + 4 * p2[axis]! - p3[axis]!) * t2 + (-p0[axis]! + 3 * p1[axis]! - 3 * p2[axis]! + p3[axis]!) * t3)) as Point3);
    }
  }
  return out;
}

// ------------------------------------------------------------------ the card
/** The x of a rule's notch on a card centred at `centre`. */
export function notchX(centre: number, index: number) {
  return centre + (index - (RULES.length - 1) / 2) * CARD.pitch;
}

/** The card's face (toward the viewer) as an outline, notched at each of its rules, for a card centred at x = 0. */
export function cardOutline(gen: number): Array<[number, number]> {
  const rules = CARD_RULES[gen] ?? [];
  const top = CARD_Z0 + CARD.h;
  const points: Array<[number, number]> = [
    [-CARD.w / 2, CARD_Z0],
    [CARD.w / 2, CARD_Z0],
    [CARD.w / 2, top],
  ];
  for (let index = RULES.length - 1; index >= 0; index--) {
    if (!rules.includes(RULES[index]!)) continue;
    const x = notchX(0, index);
    points.push([x + CARD.notchW / 2, top], [x + CARD.notchW / 2, top - CARD.notchD], [x - CARD.notchW / 2, top - CARD.notchD], [x - CARD.notchW / 2, top]);
  }
  points.push([-CARD.w / 2, top]);
  return points;
}

/** The card for a round, drawn at the reader: its face, its outline and the thin edges on top. */
export function cardPaths(gen: number): { face: string; edges: string } {
  const outline = cardOutline(gen);
  const front = CARD.t / 2;
  const face = pathOf(outline.map(([x, z]) => at([CARD_IN_READER + x, front, z])), true);
  // The card's top edges (its thickness) show as thin faces along each stretch of the top.
  const top = CARD_Z0 + CARD.h;
  const edges: string[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    if (Math.abs(a[1] - b[1]) > 1e-6 || (Math.abs(a[1] - top) > 1e-6 && Math.abs(a[1] - (top - CARD.notchD)) > 1e-6)) continue;
    edges.push(pathOf([at([CARD_IN_READER + a[0], front, a[1]]), at([CARD_IN_READER + b[0], front, b[1]]), at([CARD_IN_READER + b[0], -front, b[1]]), at([CARD_IN_READER + a[0], -front, a[1]])], true));
  }
  return { face, edges: edges.join('') };
}

/** The card's slide along the track, from its place in the reader, as a screen translate. */
export const cardShift = (x: number) => translateAlong(P, [x - CARD_IN_READER, 0, 0]);

/** Everything right of the writer's face plane at the card's depth: the card shows only there. */
export const CARD_CLIP = (() => {
  const [sx] = at([WRITER_FACE, 0, 0]);
  return `M${(Math.round(sx * 10) / 10).toFixed(1)} 0H${WIDTH}V${HEIGHT}H${(Math.round(sx * 10) / 10).toFixed(1)}Z`;
})();

// ------------------------------------------------------------------ the feeler pins and the punch
/** The pins for a card at a drop (0 lifted clear of the card, 1 resting on it): a cylinder each, hanging from the bridge. */
export function pinsAt(gen: number, drop: number): SolidPaths[] {
  const rules = CARD_RULES[gen] ?? [];
  const top = CARD_Z0 + CARD.h;
  return RULES.map((rule, index) => {
    const rest = rules.includes(rule) ? top - CARD.notchD + 0.2 : top + 0.05;
    const tip = rest + (1 - drop) * (top + 1.6 - rest);
    return cylinder(notchX(CARD_IN_READER, index), 0, PIN_R, tip, BRIDGE.z0 - tip, P, 14);
  });
}

/** The punch lever, swung down `stroke` (0 to 1) from rest. */
export function leverAt(stroke: number): SolidPaths[] {
  const top = TOP + WRITER_H;
  const pivot: Point3 = [WRITER_FACE - 7, 5.2, top + 3.6];
  const angle = (32 - 34 * stroke) * (Math.PI / 180);
  const tip: Point3 = [pivot[0] + 9 * Math.cos(angle), pivot[1], pivot[2] + 9 * Math.sin(angle)];
  return [
    barBetween(pivot, tip, [0, 1, 0], 1.2, 1.6, P, 0.2),
    discAlong([tip[0], pivot[1] - 0.6, tip[2]], [0, 1, 0], 1.5, 2.4, P, 20, 0.2),
  ];
}

// ------------------------------------------------------------------ the logger
/** The ink on the ribbon when `fed` mm have passed the pen: each round's speed, up to `inked` seconds of the latest run. */
export function inkPaths(fed: number, latest: number, inked: number): string {
  const parts: string[] = [];
  const onRibbon = (x: number, speed: number) => at([x, RIBBON_FACE + 0.02, speedZ(speed)]);
  for (let gen = 0; gen <= latest; gen++) {
    const until = gen < latest ? EPISODE_SECONDS : Math.min(inked, EPISODE_SECONDS);
    const xOf = (seconds: number) => PEN_X - (fed - (inkStart(gen) + (seconds / EPISODE_SECONDS) * RUN_PAPER));
    // The sprint is all in its first half second: sample its rise finely so the spike keeps its shape.
    const times =
      OUTCOMES[gen] === 'falls'
        ? [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.2, FALL_AT - 0.03, FALL_AT - 0.015, FALL_AT]
        : Array.from({ length: 121 }, (_, i) => (i / 120) * EPISODE_SECONDS);
    const points: Flat[] = [];
    let previous: { x: number; speed: number } | null = null;
    for (const seconds of times) {
      if (seconds > until + 1e-9) break;
      const speed = speedAt(gen, seconds);
      const x = xOf(seconds);
      if (speed === null) break;
      if (x < RIBBON.x0) {
        previous = { x, speed };
        continue;
      }
      // Where the ribbon enters the writer, the ink runs exactly to the slot.
      if (previous && !points.length) {
        const k = (RIBBON.x0 - previous.x) / (x - previous.x);
        points.push(onRibbon(RIBBON.x0, previous.speed + (speed - previous.speed) * k));
      }
      points.push(onRibbon(x, speed));
    }
    // A run that is still being written ends exactly at the pen.
    if (gen === latest && until < EPISODE_SECONDS && until > 0) {
      const speed = speedAt(gen, until);
      if (speed !== null && xOf(until) >= RIBBON.x0) points.push(onRibbon(xOf(until), speed));
    }
    if (points.length > 1) parts.push(pathOf(points));
  }
  return parts.join('');
}

/** The ribbon's printed time lines, every 5 seconds of a run, moving with it: `fed` mm have passed the pen. */
export function ribbonGrid(fed: number): string {
  const pitch = (RUN_PAPER * 5) / EPISODE_SECONDS;
  const lines: string[] = [];
  const first = Math.ceil((RIBBON.x0 + 0.6 - PEN_X + fed) / pitch);
  for (let k = first; ; k++) {
    const x = PEN_X - (fed - k * pitch);
    if (x > RIBBON.x1 - 0.6) break;
    // Below the channel's top its front wall hides the line; over the plinth it starts at the ribbon's edge.
    const bottom = x < RECORDER.x ? TOP + CHANNEL_H - 0.4 : RIBBON.z0;
    lines.push(pathOf([at([x, RIBBON_FACE, bottom]), at([x, RIBBON_FACE, RIBBON.z1])]));
  }
  return lines.join('');
}

/** Where the pen's carriage rides on its post. */
const PEN_POST: Plane = [PEN_X + 3.4, RIBBON.y + 6.4];
/** The pen at a speed up the ribbon, pulled back `lift` off it: its arm, the pen and the carriage behind the post. */
export function penAt(speed: number, lift: number): SolidPaths[] {
  const z = speedZ(speed);
  const tip = RIBBON_FACE + 0.05 + lift;
  return [
    barBetween([PEN_POST[0] - 0.8, PEN_POST[1] - 2.6, z], [PEN_X, tip + 1.6, z], [0, 0, 1], 1, 0.9, P),
    discAlong([PEN_X, tip, z], [0, 1, 0], 0.75, 1.8, P, 16),
    slabOf({ x: PEN_POST[0] - 1.8, y: PEN_POST[1] - 3.2, w: 3.6, d: 2, r: 0.4 }, z - 1.4, 2.8, P, 2, 0.3),
  ];
}

// ------------------------------------------------------------------ the robot
export const STRIDE = 16;
const LIFT = 6;
/** The trot at a stride phase (lib/gait.ts), feet relative to their hips. */
export function trotPose(phase: number): RobotPose {
  const gait = GAITS.trot;
  const feet: FootPose[] = FOOT_ORDER.map((leg) => {
    const p = legPhase(gait, leg, phase);
    if (p < gait.dutyFactor) return { dx: STRIDE / 2 - STRIDE * (p / gait.dutyFactor), lift: 0, down: true };
    const swing = (p - gait.dutyFactor) / (1 - gait.dutyFactor);
    return { dx: -STRIDE / 2 + STRIDE * swing, lift: LIFT * Math.sin(Math.PI * swing), down: false };
  });
  return { feet, rise: 0, roll: 0 };
}
/** On its back after the fall, legs in the air; it rolls back onto its feet for the next run. */
export const FALLEN: RobotPose = {
  feet: [
    { dx: -7, lift: 7, down: false },
    { dx: 3, lift: 11, down: false },
    { dx: 6, lift: 5, down: false },
    { dx: -2, lift: 9, down: false },
  ],
  rise: BACK_RISE,
  roll: Math.PI,
};
/** The trot's resting phase: a diagonal pair down, the other pair mid-swing. */
export const TROT_REST = 0.25;
/** Each round's robot at rest. */
export const restPose = (gen: number): RobotPose => (OUTCOMES[gen] === 'falls' ? FALLEN : OUTCOMES[gen] === 'stands' ? STANDING : trotPose(TROT_REST));

export function mixPose(a: RobotPose, b: RobotPose, k: number, arc = 0): RobotPose {
  return {
    feet: a.feet.map((foot, index) => {
      const other = b.feet[index]!;
      return { dx: foot.dx + (other.dx - foot.dx) * k, lift: foot.lift + (other.lift - foot.lift) * k, down: k < 0.5 ? foot.down : other.down };
    }),
    rise: a.rise + (b.rise - a.rise) * k + arc * Math.sin(Math.PI * k),
    roll: a.roll + (b.roll - a.roll) * k,
  };
}

export const robotAt = (pose: RobotPose): { far: RobotSolid[]; body: RobotSolid[]; near: RobotSolid[]; all: RobotSolid[] } => rig.robot(pose);
export const BELT_BAND = rig.beltBand;
export const beltSlats = rig.beltSlats;
export const screenOf = (point: Point3): Flat => at(point);

// ------------------------------------------------------------------ one round of the loop, as a pure function of time
/** The steps of a round, in seconds from pressing "Next round". */
export const STEPS = {
  pinsUp: [0, 0.3],
  cardOut: [0.3, 1.4],
  punch: [1.4, 2.5],
  cardIn: [2.5, 3.6],
  pinsDown: [3.6, 3.9],
  gap: [3.9, 4.4],
  run: [4.4, 7.8],
} as const;
export const ROUND_SECONDS = STEPS.run[1];
/** Strides the trotting robot takes in a run: whole strides plus its resting phase, so the run ends on the still pose. */
const RUN_STRIDES = 7 + TROT_REST;

export interface LoopFrame {
  /** Which round's card is in play, and where its centre is along the track. */
  cardGen: number;
  cardX: number;
  /** The feeler pins: 0 lifted clear, 1 resting on the card. */
  pinDrop: number;
  /** The punch lever: 0 at rest, 1 fully down. */
  stroke: number;
  pose: RobotPose;
  /** How far the belt has moved back, in mm. */
  travel: number;
  /** Ribbon fed past the pen, the latest round with ink on it and how many seconds of that run are written. */
  fed: number;
  latest: number;
  inked: number;
  /** The pen: the speed it stands at, and how far it is pulled back off the ribbon. */
  penSpeed: number;
  penLift: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const progress = ([from, to]: readonly [number, number], t: number) => clamp01((t - from) / (to - from));
/** How far the pen lifts off the ribbon while it moves back to zero between runs. */
const PEN_BACK = 1.6;
/** The pen at rest after a round, on the ribbon at the run's last speed (a fallen run at zero). */
const penRestSpeed = (gen: number) => speedAt(gen, EPISODE_SECONDS) ?? 0;

/** Round `gen` (0-based) at rest: its card read, its run written, its robot as the run left it. */
export function restFrame(gen: number): LoopFrame {
  return {
    cardGen: gen,
    cardX: CARD_IN_READER,
    pinDrop: 1,
    stroke: 0,
    pose: restPose(gen),
    travel: OUTCOMES[gen] === 'walks' ? RUN_STRIDES * STRIDE : 0,
    fed: paperAfter(gen),
    latest: gen,
    inked: EPISODE_SECONDS,
    penSpeed: penRestSpeed(gen),
    penLift: 0,
  };
}

/** The loop `t` seconds after "Next round" moved it on to round `gen` (1 or 2), from round gen − 1 at rest. */
export function loopFrame(gen: number, t: number): LoopFrame {
  if (t >= ROUND_SECONDS) return restFrame(gen);
  const before = restFrame(gen - 1);
  const out = progress(STEPS.cardOut, t);
  const back = progress(STEPS.cardIn, t);
  const cardGen = t < STEPS.punch[0] ? gen - 1 : gen;
  const cardX = t < STEPS.punch[0] ? CARD_IN_READER + (CARD_IN_WRITER - CARD_IN_READER) * ease(out) : CARD_IN_WRITER + (CARD_IN_READER - CARD_IN_WRITER) * ease(back);
  const pinDrop = t < STEPS.pinsDown[0] ? 1 - ease(progress(STEPS.pinsUp, t)) : ease(progress(STEPS.pinsDown, t));
  // One stroke of the lever for each notch the new card carries.
  const strokes = CARD_RULES[gen]!.length;
  const punch = progress(STEPS.punch, t);
  const stroke = punch > 0 && punch < 1 ? Math.sin(Math.PI * ((punch * strokes) % 1)) ** 2 : 0;
  // The robot: up on its feet (if the last run ended in a fall) while the card is away, then its run.
  const run = progress(STEPS.run, t);
  let pose: RobotPose = before.pose;
  let travel = 0;
  if (OUTCOMES[gen - 1] === 'falls') pose = mixPose(FALLEN, STANDING, ease(out), 3);
  else if (OUTCOMES[gen - 1] === 'stands') pose = STANDING;
  else pose = before.pose;
  if (run > 0) {
    if (OUTCOMES[gen] === 'walks') {
      const phase = RUN_STRIDES * run;
      // Into the trot over the first stride, from standing.
      pose = mixPose(STANDING, trotPose(phase % 1), ease(phase), 0);
      travel = phase * STRIDE;
    } else pose = STANDING;
  }
  // The ribbon: a blank gap fed, then the run written as it feeds past the pen.
  const gap = progress(STEPS.gap, t);
  const fed = before.fed + GAP_PAPER * ease(gap) + RUN_PAPER * run;
  const inked = run * EPISODE_SECONDS;
  const live = run > 0 ? speedAt(gen, inked) : null;
  // The pen lifts off the ribbon while it moves back to zero over the gap, and writes the run.
  const penSpeed = run > 0 ? (live ?? 0) : before.penSpeed + (0 - before.penSpeed) * ease(gap);
  const penLift = run > 0 ? 0 : PEN_BACK * Math.sin(Math.PI * gap);
  return { cardGen, cardX, pinDrop, stroke, pose, travel, fed, latest: run > 0 ? gen : gen - 1, inked: run > 0 ? inked : EPISODE_SECONDS, penSpeed, penLift };
}

/** The hatch on the robot's back at a pose, gone once its back turns away. */
export const hatchAt = (pose: RobotPose) => rig.hatch(pose);
