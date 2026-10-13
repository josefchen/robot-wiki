/**
 * The copy-tracing bench for CompoundingError, drawn with the isometric kit.
 *
 * The object is the explanation. A template plate carries one straight
 * groove: the path a person showed the robot. A carriage runs along the
 * bench, one move at a time. Its arm carries a cross-slide, and the
 * cross-slide carries the stylus (the one lit part) that draws the robot's
 * own path beside the groove. At every decision a stepper turns the feed
 * wheel by the policy's slip, and the slip grows with how far the slide
 * already is from the groove: d becomes d + epsilon (1 + 0.01 d). Nothing
 * turns it back, so the offset ramps and the wash between groove and ink,
 * the summed drift, grows with the square of the task's length. A dial
 * on the cross-slide, geared to a rack along the arm, reads the offset.
 * With a teacher, a solenoid winds
 * the slide three quarters of the way back every 20 moves; with chunks,
 * the stepper only fires once per plan of 25 moves.
 *
 * World units: x along the bench (moves run toward +x), y across it
 * (toward the viewer is +y, the side the slide drifts to), z up. The
 * carriage is built at move 0 and moved with `translateAlong`; the slide
 * is built at no offset and moved along y; the dial needle, the feed
 * wheel's pointer, the ink and the wash are rebuilt from the model.
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
  radialTicks,
  ring,
  sideArc,
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
import {
  DAGGER_INTERVAL,
  simulateDeviation,
  type PredictionMode,
} from '../../../lib/compounding-error.ts';

export const WIDTH = 640;
export const AZIMUTH = 56;
export const ELEVATION = 40;

/** `carriage` moves along the bench; `slide` with it and across it. */
export type Group = 'static' | 'carriage' | 'slide';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; group: Group; name: 'trace' | 'needle' | 'wheel' | 'knobs' };

// ---------------------------------------------------------------- layout
/** The longest task the bench runs, in moves. */
export const MAX_MOVES = 240;
/** The worst error the error slider reaches, for the fixed drift scale. */
export const WORST_EPSILON = 0.15;
/** The first move's x and the bench length the longest task spans. */
export const X0 = -176;
export const RUN_LENGTH = 336;
/** The stylus sits this far to +x of the carriage's centre line. */
export const STYLUS_DX = 20;
/** The template's top, where the groove, the ink and the wash lie. */
export const ZT = 6;
/** Half the groove's width: the wash starts at the groove's near edge. */
export const GROOVE_HALF = 3.4;
/** World units of offset across the bench for the worst reachable drift. */
export const DRIFT_SPAN = 92;

const BASE: Plan = { x: -254, y: -96, w: 476, d: 222, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;
const TEMPLATE: Plan = { x: -192, y: -18, w: 384, d: 134, r: 6 };
const RULER: Plan = { x: -186, y: 104, w: 372, d: 9, r: 1 };
const RULER_H = 1.2;
const RAIL_Y = [-80, -56];
const RAIL_X0 = -206;
const RAIL_X1 = 206;
const RAIL_H = 9;
const BOX: Plan = { x: -246, y: 0, w: 32, d: 42, r: 3 };
const LABEL: Plan = { x: -244, y: 56, w: 28, d: 50, r: 2 };
/** The two knobs on the control box: how big each slip is, and how many moves the task has. */
export const KNOBS: Point3[] = [
  [BOX.x + BOX.w / 2, BOX.y + 12, 14],
  [BOX.x + BOX.w / 2, BOX.y + 30, 14],
];

/** The carriage, built at move 0 with its centre line at x = X0 - STYLUS_DX. */
const CX = X0 - STYLUS_DX;
const SADDLE: Plan = { x: CX - 26, y: -88, w: 52, d: 40, r: 3 };
const SADDLE_Z = RAIL_H;
const SADDLE_H = 8;
const COLUMN: Plan = { x: CX - 10, y: -78, w: 20, d: 20, r: 2 };
const ARM_Z = 30;
const ARM_H = 8;
const ARM: Plan = { x: CX - 9, y: -80, w: 18, d: 186, r: 2.4 };
const SLIDE_Z = ARM_Z + ARM_H;
const SLIDE: Plan = { x: CX - 25, y: -9, w: 50, d: 18, r: 2.4 };
/** The dial on the cross-slide: its pinion runs on the rack along the arm, so the needle reads the slide's offset. */
const GAUGE: Point3 = [CX - 14, 0, SLIDE_Z + 6.4];
const GAUGE_R = 8.6;
const WHEEL: Point3 = [CX + 18, -62, SADDLE_Z + SADDLE_H];

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
extremes.push([SADDLE.x, ARM.y, SLIDE_Z + 12], [SADDLE.x + RUN_LENGTH + 52, ARM.y, SLIDE_Z + 12], [CX + 25, ARM.y + ARM.d, SLIDE_Z + 8]);
const FIT_PAD = 10;
/** The drawing's height, fitted tightly to the machine at the full width. */
export const HEIGHT = (() => {
  const flat = extremes.map((point) => iso(point, { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION }));
  const span = (axis: 0 | 1) => Math.max(...flat.map((f) => f[axis])) - Math.min(...flat.map((f) => f[axis]));
  return Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
})();
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const seam = (plan: Plan, z: number, steps = 3) => `<path class="iso-line" data-tone="faint" d="${sideSeam(plan, z, P, steps)}"/>`;

// ---------------------------------------------------------------- model glue
export type Rollout = { deviation: number[]; steps: number; maxSteps: number; scale: number };

/** The drift scale: the worst reachable drift (top error, longest task, no help) spans DRIFT_SPAN. */
export function driftScale(maxSteps: number, chunkSize: number): number {
  const worst = simulateDeviation({ epsilon: WORST_EPSILON, steps: maxSteps, mode: 'per-step', chunkSize, dagger: false });
  return DRIFT_SPAN / worst[maxSteps];
}

export function rolloutOf(params: { epsilon: number; steps: number; mode: PredictionMode; chunkSize: number; dagger: boolean; maxSteps: number }): Rollout {
  const { maxSteps, ...rest } = params;
  return { deviation: simulateDeviation(rest), steps: params.steps, maxSteps, scale: driftScale(maxSteps, params.chunkSize) };
}

/** The stylus's x at move t. */
export const moveX = (t: number, maxSteps: number) => X0 + (t / maxSteps) * RUN_LENGTH;
/** The slide's offset across the bench at move t (interpolated between moves). */
export function offsetAt(r: Rollout, t: number): number {
  const m = Math.min(r.steps, Math.max(0, t));
  const i = Math.floor(m);
  const j = Math.min(r.steps, i + 1);
  return (r.deviation[i] + (r.deviation[j] - r.deviation[i]) * (m - i)) * r.scale;
}

/** The screen offset of the carriage at move t. */
export const carriageAt = (t: number, maxSteps: number) => translateAlong(P, [moveX(t, maxSteps) - X0, 0, 0]);
/** The screen offset of the slide across the arm for an offset y. */
export const slideAt = (y: number) => translateAlong(P, [0, y, 0]);

/** The ink the stylus has laid down by move t: the robot's own path. */
export function inkPath(r: Rollout, t: number): string {
  const end = Math.min(r.steps, Math.max(0, t));
  const points: Flat[] = [];
  for (let m = 0; m < end; m += 1) points.push(at([moveX(m, r.maxSteps), offsetAt(r, m), ZT]));
  points.push(at([moveX(end, r.maxSteps), offsetAt(r, end), ZT]));
  return pathOf(points);
}

/** The wash between the groove's near edge and the ink, from move a to move b: the drift summed over those moves. */
export function washPath(r: Rollout, a: number, b: number): string {
  const from = Math.max(0, Math.min(r.steps, a));
  const to = Math.max(from, Math.min(r.steps, b));
  if (to - from < 1e-6) return '';
  const top: Flat[] = [];
  const edge: Flat[] = [];
  const marks: number[] = [];
  for (let m = Math.ceil(from); m < to; m += 1) marks.push(m);
  for (const m of [from, ...marks.filter((m) => m > from), to]) {
    top.push(at([moveX(m, r.maxSteps), Math.max(GROOVE_HALF, offsetAt(r, m)), ZT]));
    edge.unshift(at([moveX(m, r.maxSteps), GROOVE_HALF, ZT]));
  }
  return pathOf([...top, ...edge], true);
}

/** The halfway rule across the wash, from the groove's edge to the ink, when there is a gap to cross. */
export function halfRule(r: Rollout, half: number): string {
  const y = offsetAt(r, half);
  if (y < GROOVE_HALF + 1.5) return '';
  return onTop([[moveX(half, r.maxSteps), GROOVE_HALF], [moveX(half, r.maxSteps), y]], ZT, P);
}

/** The teacher's corrections up to move t: one dot on the ink where each pulled the slide back. */
export function correctionPoints(r: Rollout, t: number, dagger: boolean): Flat[] {
  if (!dagger) return [];
  const points: Flat[] = [];
  for (let m = DAGGER_INTERVAL; m <= Math.min(r.steps, t); m += DAGGER_INTERVAL) points.push(at([moveX(m, r.maxSteps), offsetAt(r, m), ZT]));
  return points;
}

/** Where the ink starts: the stylus's first touch, on the groove. */
export function inkStart(maxSteps: number): Flat {
  return at([moveX(0, maxSteps), 0, ZT]);
}

/** The dial's needle for an offset y, drawn at no offset (it rides the slide); one turn spans a little under the worst drift. */
export function needlePath(y: number): string {
  const angle = (y / DRIFT_SPAN) * Math.PI * 1.8;
  const [cx, cy, z] = GAUGE;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([cx - sx * 1.8, cy - sy * 1.8], [cx + sx * (GAUGE_R - 2.8), cy + sy * (GAUGE_R - 2.8)], z + 6.4, P);
}

/** The feed wheel's pointer: the stepper turns it by every slip, one turn for a third of the worst drift. */
export function wheelPointer(y: number): string {
  const angle = (y / DRIFT_SPAN) * Math.PI * 6;
  const [cx, cy, z] = WHEEL;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([cx + sx * 2.2, cy + sy * 2.2], [cx + sx * 7.4, cy + sy * 7.4], z + 7, P);
}

/** A knob's pointer over three quarters of a turn, for a share 0 to 1 of its range. */
export function knobPointer(index: number, share: number): string {
  const angle = -0.75 * Math.PI + Math.min(1, Math.max(0, share)) * 1.5 * Math.PI;
  const [cx, cy, z] = KNOBS[index];
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([cx + sx * 1.2, cy + sy * 1.2], [cx + sx * 4.2, cy + sy * 4.2], z + 5.2, P);
}

// ---------------------------------------------------------------- part lists
const solidOf = (group: Group, paths: SolidPaths, tone: Tone = 'mid', extra: Partial<{ lit: boolean; crease: Tone | 'none'; inner: string }> = {}): Part => ({
  kind: 'solid',
  group,
  paths,
  tone,
  ...extra,
});
const lineOf = (group: Group, d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end'): Part => ({ kind: 'line', group, d, tone, free });
const dotsOf = (group: Group, points: Flat[], size = 0.5, tone?: Tone): Part => ({ kind: 'dots', group, points, size, tone });

// ------------------------------------------------- the bench: base, rails, drive, template, ruler
const bench: Part[] = [];
for (const [x, y] of byDepth([
  [BASE.x + 26, BASE.y + 22],
  [BASE.x + BASE.w - 26, BASE.y + 22],
  [BASE.x + 26, BASE.y + BASE.d - 22],
  [BASE.x + BASE.w - 26, BASE.y + BASE.d - 22],
])) {
  bench.push(solidOf('static', cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6), 'lo'));
  bench.push(solidOf('static', cyl(x, y, 6.6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid'));
}
bench.push(solidOf('static', slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid'));
bench.push(lineOf('static', planOutline(insetPlan(BASE, 5), 0, P), 'faint'));
{
  const screws: Array<[number, number]> = [
    [BASE.x + 11, BASE.y + 11],
    [BASE.x + BASE.w - 11, BASE.y + 11],
    [BASE.x + 11, BASE.y + BASE.d - 11],
    [BASE.x + BASE.w - 11, BASE.y + BASE.d - 11],
  ];
  bench.push(lineOf('static', screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo'));
  bench.push(dotsOf('static', screws.map(([x, y]) => at([x, y, 0])), 0.55));
}
// The rails along the far side, with end stops at the left.
for (const y of RAIL_Y) bench.push(solidOf('static', slab({ x: RAIL_X0 + 6, y: y - 6, w: 8, d: 12, r: 1.2 }, 0, 15, 3, 0.5)));
// The drive screw between the rails, in two bearing blocks, turned by the motor at the right.
{
  const y = (RAIL_Y[0] + RAIL_Y[1]) / 2;
  bench.push(solidOf('static', slab({ x: RAIL_X0 - 4, y: y - 5, w: 9, d: 10, r: 1.4 }, 0, 9, 3, 0.4), 'mid'));
  bench.push(solidOf('static', slab({ x: RAIL_X0 + 2, y: y - 1.4, w: RAIL_X1 - RAIL_X0 - 2, d: 2.8, r: 1.3 }, 4.2, 2.8, 3), 'lo'));
}
for (const y of RAIL_Y) {
  bench.push(solidOf('static', slab({ x: RAIL_X0, y: y - 5, w: RAIL_X1 - RAIL_X0, d: 10, r: 2 }, 0, RAIL_H, 3, 0.6)));
  bench.push(lineOf('static', onTop([[RAIL_X0, y], [RAIL_X1, y]], RAIL_H, P), 'faint'));
}
// The template plate: the demonstrated groove, an inset rule and corner screws.
bench.push(solidOf('static', slab(TEMPLATE, 0, ZT, 6, 1.2), 'mid'));
bench.push(lineOf('static', planOutline(insetPlan(TEMPLATE, 4.5), ZT, P), 'faint'));
{
  const groove: Plan = { x: TEMPLATE.x + 8, y: -GROOVE_HALF, w: TEMPLATE.w - 16, d: GROOVE_HALF * 2, r: GROOVE_HALF };
  bench.push(lineOf('static', planOutline(groove, ZT, P, 6), 'mid'));
  bench.push(lineOf('static', planOutline(insetPlan(groove, 1.3), ZT, P, 6), 'faint'));
  const screws: Array<[number, number]> = [
    [TEMPLATE.x + 10, TEMPLATE.y + 8],
    [TEMPLATE.x + TEMPLATE.w - 10, TEMPLATE.y + 8],
    [TEMPLATE.x + 10, TEMPLATE.y + TEMPLATE.d - 8],
    [TEMPLATE.x + TEMPLATE.w - 10, TEMPLATE.y + TEMPLATE.d - 8],
  ];
  bench.push(lineOf('static', screws.map(([x, y]) => ring(x, y, 2.2, ZT, P, 16)).join(''), 'lo'));
  bench.push(dotsOf('static', screws.map(([x, y]) => at([x, y, ZT])), 0.5));
}
// The ruler on the template's near edge: a tick every 10 moves, a long one every 40.
bench.push(solidOf('static', slab(RULER, ZT, RULER_H, 3, 0.4), 'lo'));
{
  const minor: string[] = [];
  const major: string[] = [];
  for (let m = 0; m <= MAX_MOVES; m += 10) {
    const x = X0 + (m / MAX_MOVES) * RUN_LENGTH;
    (m % 40 === 0 ? major : minor).push(lineOnTop([x, RULER.y], [x, RULER.y + (m % 40 === 0 ? 5.6 : 3)], ZT + RULER_H, P));
  }
  bench.push(lineOf('static', minor.join(''), 'lo'));
  bench.push(lineOf('static', major.join(''), 'mid'));
  bench.push(dotsOf('static', [at([RULER.x + 3, RULER.y + 6.6, ZT + RULER_H]), at([RULER.x + RULER.w - 3, RULER.y + 6.6, ZT + RULER_H])], 0.45));
}
// The start rule across the template: where every run begins.
bench.push(lineOf('static', onTop([[X0, GROOVE_HALF], [X0, RULER.y]], ZT, P), 'mid'));
bench.push({ kind: 'slot', group: 'static', name: 'trace' });

// ------------------------------------------------- the carriage, built at move 0
const carriage: Part[] = [];
carriage.push(solidOf('carriage', slab(SADDLE, SADDLE_Z, SADDLE_H, 4, 0.8), 'mid', { inner: seam(SADDLE, SADDLE_Z + 3, 4) }));
carriage.push(dotsOf('carriage', [[SADDLE.x + 4, SADDLE.y + 4], [SADDLE.x + SADDLE.w - 4, SADDLE.y + 4], [SADDLE.x + 4, SADDLE.y + SADDLE.d - 4], [SADDLE.x + SADDLE.w - 4, SADDLE.y + SADDLE.d - 4]].map(([x, y]) => at([x, y, SADDLE_Z + SADDLE_H])), 0.5));
// The stepper that turns the feed wheel, and the wheel with its pointer.
{
  const [wx, wy, wz] = WHEEL;
  carriage.push(solidOf('carriage', cyl(wx, wy, 6.4, wz, 3, 28, 0.3), 'mid'));
  carriage.push(solidOf('carriage', cyl(wx, wy, 8.4, wz + 3, 4, 36, 0.4), 'hi'));
  carriage.push(lineOf('carriage', knurl(wx, wy, 8.4, wz + 3, wz + 7, 30, P), 'lo'));
  carriage.push(lineOf('carriage', ring(wx, wy, 2.2, wz + 7, P, 16), 'mid'));
  carriage.push({ kind: 'slot', group: 'carriage', name: 'wheel' });
}
// The teacher's solenoid beside the column: it winds the slide back every 20 moves.
{
  const sx = CX - 18;
  const sy = -58;
  carriage.push(
    solidOf('carriage', cyl(sx, sy, 5.4, SADDLE_Z + SADDLE_H, 12, 28, 0.4), 'mid', {
      inner: `<path class="iso-line" data-tone="faint" d="${sideArc(sx, sy, 5.4, SADDLE_Z + SADDLE_H + 4, P, 20)}${sideArc(sx, sy, 5.4, SADDLE_Z + SADDLE_H + 8, P, 20)}"/>`,
    }),
  );
  carriage.push(solidOf('carriage', cyl(sx, sy, 2, SADDLE_Z + SADDLE_H + 12, 2.4, 16), 'hi'));
}
// The column and the arm across the bench, over the template.
carriage.push(solidOf('carriage', slab(COLUMN, SADDLE_Z + SADDLE_H, ARM_Z - SADDLE_Z - SADDLE_H, 3, 0.5), 'mid', { inner: seam(COLUMN, SADDLE_Z + SADDLE_H + 4) }));
carriage.push(solidOf('carriage', slab(ARM, ARM_Z, ARM_H, 4, 0.8), 'mid', { inner: seam(ARM, ARM_Z + 3, 4) }));
// The feed screw along the arm's top, end to end.
carriage.push(solidOf('carriage', slab({ x: CX + 2.4, y: ARM.y + 4, w: 3.2, d: ARM.d - 8, r: 1.5 }, SLIDE_Z, 2.4, 3), 'lo'));
carriage.push(dotsOf('carriage', [at([CX + 4, ARM.y + ARM.d - 2.4, SLIDE_Z]), at([CX + 4, ARM.y + 2.4, SLIDE_Z])], 0.5));
// The rack along the arm's far side, for the dial's pinion: a tooth every 2 units, a long one every 10.
{
  const rack: Plan = { x: CX - 7.4, y: ARM.y + 22, w: 4, d: ARM.d - 26, r: 0.8 };
  carriage.push(solidOf('carriage', slab(rack, SLIDE_Z, 1.2, 2), 'lo'));
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0, y = rack.y + 2; y <= rack.y + rack.d - 2; k += 1, y += 2) {
    (k % 5 === 0 ? major : minor).push(lineOnTop([rack.x, y], [rack.x + (k % 5 === 0 ? 3 : 1.8), y], SLIDE_Z + 1.2, P));
  }
  carriage.push(lineOf('carriage', minor.join(''), 'faint'));
  carriage.push(lineOf('carriage', major.join(''), 'lo'));
}

// ------------------------------------------------- the cross-slide, built at no offset (moves with the carriage and across it)
const slide: Part[] = [];
// The stylus: a holder off the slide's near end, the barrel down to the template.
{
  const sx = CX + STYLUS_DX;
  slide.push(solidOf('slide', cyl(sx, 0, 1.1, ZT, 3.2, 16), 'hi', { lit: true }));
  slide.push(solidOf('slide', cyl(sx, 0, 2.6, ZT + 3.2, SLIDE_Z - ZT - 3.2, 24), 'hi', { lit: true }));
  slide.push(solidOf('slide', cyl(sx, 0, 3.3, ZT + 10, 1.8, 24), 'mid'));
}
slide.push(solidOf('slide', slab(SLIDE, SLIDE_Z, 6.4, 4, 0.6), 'mid', { inner: seam(SLIDE, SLIDE_Z + 2.4, 4) }));
slide.push(lineOf('slide', planOutline(insetPlan(SLIDE, 3), SLIDE_Z + 6.4, P, 4), 'faint'));
slide.push(solidOf('slide', cyl(CX + STYLUS_DX, 0, 4.4, SLIDE_Z + 6.4, 2.6, 28, 0.3), 'mid'));
slide.push(dotsOf('slide', [at([CX + STYLUS_DX, 0, SLIDE_Z + 9])], 0.6));
slide.push(dotsOf('slide', [[SLIDE.x + 3.4, SLIDE.y + 3.4], [SLIDE.x + 3.4, SLIDE.y + SLIDE.d - 3.4], [CX + 10, SLIDE.y + 3.4], [CX + 10, SLIDE.y + SLIDE.d - 3.4]].map(([x, y]) => at([x, y, SLIDE_Z + 6.4])), 0.45));
// The feed nut where the screw drives the slide.
slide.push(solidOf('slide', cyl(CX + 4, 0, 3.6, SLIDE_Z + 6.4, 2.2, 6, 0.3), 'lo'));
// The dial on the slide's far end: knurled bezel, face ticks, a zero mark, the needle and its hub.
{
  const [gx, gy, gz] = GAUGE;
  slide.push(solidOf('slide', cyl(gx, gy, GAUGE_R, gz, 6.4, 56, 0.6), 'hi', { inner: `<path class="iso-line" data-tone="faint" d="${sideArc(gx, gy, GAUGE_R, gz + 2.6, P, 40)}"/>` }));
  slide.push(lineOf('slide', knurl(gx, gy, GAUGE_R, gz + 0.2, gz + 2.4, 54, P, 0.2), 'lo'));
  slide.push(lineOf('slide', ring(gx, gy, GAUGE_R - 1.4, gz + 6.4, P, 56), 'lo'));
  const ticks = radialTicks(gx, gy, GAUGE_R - 1.4, 40, 5, gz + 6.4, [0.9, 1.9], P);
  slide.push(lineOf('slide', ticks.minor, 'lo'));
  slide.push(lineOf('slide', ticks.major, 'mid'));
  slide.push(lineOf('slide', lineOnTop([gx, gy - (GAUGE_R - 1.4)], [gx, gy - (GAUGE_R - 4.6)], gz + 6.4, P), 'hi'));
  slide.push({ kind: 'slot', group: 'slide', name: 'needle' });
  slide.push(dotsOf('slide', [at([gx, gy, gz + 6.4])], 0.75, 'hi'));
}

// ------------------------------------------------- the near side: motor, controls, label
const near: Part[] = [];
// The drive motor at the rails' right end.
{
  const y = (RAIL_Y[0] + RAIL_Y[1]) / 2;
  near.push(solidOf('static', slab({ x: RAIL_X1 - 2, y: y - 14, w: 14, d: 28, r: 2.4 }, 0, 18, 4, 0.6), 'mid', { inner: seam({ x: RAIL_X1 - 2, y: y - 14, w: 14, d: 28, r: 2.4 }, 6, 4) }));
  near.push(dotsOf('static', [at([RAIL_X1 + 5, y - 10, 18]), at([RAIL_X1 + 5, y + 10, 18])], 0.5));
  near.push(solidOf('static', cyl(RAIL_X1 + 5, y, 6.4, 18, 3.2, 28, 0.4), 'hi'));
}
// The control box at the left end: the slip-size knob and the task-length knob.
near.push(solidOf('static', slab(BOX, 0, 14, 4, 0.8), 'mid'));
near.push(lineOf('static', planOutline(insetPlan(BOX, 2.6), 14, P, 4), 'faint'));
near.push(dotsOf('static', [[BOX.x + 4, BOX.y + 4], [BOX.x + BOX.w - 4, BOX.y + 4], [BOX.x + 4, BOX.y + BOX.d - 4], [BOX.x + BOX.w - 4, BOX.y + BOX.d - 4]].map(([x, y]) => at([x, y, 14])), 0.5));
for (const [kx, ky, kz] of KNOBS) {
  const dial = radialTicks(kx, ky, 7.8, 10, 5, kz, [1.1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  near.push(lineOf('static', ring(kx, ky, 7.8, kz, P, 36), 'faint'));
  near.push(lineOf('static', dial.minor, 'lo'));
  near.push(lineOf('static', dial.major, 'mid'));
  near.push(solidOf('static', cyl(kx, ky, 4.8, kz, 5.2, 28, 0.4), 'hi'));
  near.push(lineOf('static', knurl(kx, ky, 4.8, kz, kz + 5.2, 22, P), 'lo'));
}
near.push({ kind: 'slot', group: 'static', name: 'knobs' });
// The label plate below it, with three engraved rules.
near.push(solidOf('static', slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' }));
near.push(lineOf('static', planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint'));
near.push(lineOf('static', [0, 1, 2].map((row) => onTop([[LABEL.x + 7 + row * 4, LABEL.y + 7], [LABEL.x + 7 + row * 4, LABEL.y + (row === 1 ? 24 : 34)]], 0.8, P)).join(''), 'lo', true));
near.push(dotsOf('static', [at([LABEL.x + LABEL.w / 2, LABEL.y + 3.4, 0.8]), at([LABEL.x + LABEL.w / 2, LABEL.y + LABEL.d - 3.4, 0.8])], 0.45));

/** Painter's order: the bench (with the ink and wash), the carriage, the slide, the near side. */
export const BENCH_PARTS: readonly Part[] = bench;
export const CARRIAGE_PARTS: readonly Part[] = carriage;
export const SLIDE_PARTS: readonly Part[] = slide;
export const NEAR_PARTS: readonly Part[] = near;
export const PART_COUNT = bench.length + carriage.length + slide.length + near.length;
export const SOLID_COUNT = [bench, carriage, slide, near].flat().filter((part) => part.kind === 'solid').length;
