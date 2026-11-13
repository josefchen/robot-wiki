/**
 * The trial tally board for TrialTally, drawn with the isometric kit, and the
 * small sampling model that drives it.
 *
 * The object is the explanation. A bench plate carries two tally fields, one
 * per policy: the back field logs the policy that truly succeeds 70% of the
 * time, the front field the one that truly succeeds 85% of the time. Each
 * field has a cell for every trial, up to 300; as a trial is logged its flip
 * tile falls into the next cell, light face up for a pass and dark face up
 * for a failure. Between the fields run two percent rules, 0 to 100, one per
 * policy. On each rule a caliper's two jaws close on the exact 95% range of
 * true success rates that its field's tally supports, and a cursor between
 * them marks the measured rate. A pin in the channel between the rules marks
 * each policy's true rate. In that channel a bar spans the stretch where the
 * two ranges overlap: the one lit part. With 10 trials the ranges overlap
 * widely and the lit bar is long; with 300 they stand apart and it is gone.
 *
 * The model is exact: each trial is a seeded draw, a pass with the policy's
 * true rate; the ranges are Clopper-Pearson intervals; the chances quoted are
 * sums over the two binomial distributions. World units are about a
 * millimetre: x along the rules, y toward the viewer, z up.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineSvg,
  onTop,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  topTicks,
  translateAlong,
  type Flat,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
} from '../iso-kit.ts';
import type { IsoPart } from '../part-view.tsx';
import { phoneFitOf } from '../phone-fit.ts';
import { plateIn, prismAlong } from '../prism.ts';

// ------------------------------------------------------------------ the model
/** The teaching pair: the true success rates of the two policies. */
export const WORSE_RATE = 0.7;
export const BETTER_RATE = 0.85;
export type Policy = 'worse' | 'better';
export const POLICIES: readonly Policy[] = ['worse', 'better'];
export const rateOf = (policy: Policy) => (policy === 'worse' ? WORSE_RATE : BETTER_RATE);

/** The trial counts the preset row offers: the article's 10 and 50, and a few hundred. */
export const TRIAL_COUNTS = [10, 50, 300] as const;
export type TrialCount = (typeof TRIAL_COUNTS)[number];
/** Cells on each field: the largest count. */
export const MAX_TRIALS = 300;
/** The confidence level of the ranges the jaws show. */
export const LEVEL = 0.95;

/** A small seeded generator, so a run draws the same trials on the server, in the browser and in every test. */
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

/**
 * Run `run`'s trials of one policy, in the order they are logged: each a pass
 * with the policy's true rate. A run is one sequence of 300; a shorter test
 * reads its first trials, so 10 trials are the start of the same 50.
 */
export function trialsOf(run: number, policy: Policy): boolean[] {
  const random = mulberry32(run * 7919 + (policy === 'worse' ? 0 : 104729) + 17);
  return Array.from({ length: MAX_TRIALS }, () => random() < rateOf(policy));
}

/** Passes among the first `logged` trials. */
export const passesOf = (trials: readonly boolean[], logged: number) => trials.slice(0, logged).filter(Boolean).length;

const LOG_FACTORIAL: number[] = [0];
for (let i = 1; i <= MAX_TRIALS; i++) LOG_FACTORIAL[i] = LOG_FACTORIAL[i - 1]! + Math.log(i);

/** The binomial distribution of passes in `n` trials at rate `p`. */
export function binomial(n: number, p: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    return Math.exp(LOG_FACTORIAL[n]! - LOG_FACTORIAL[k]! - LOG_FACTORIAL[n - k]! + k * Math.log(p) + (n - k) * Math.log(1 - p));
  });
}
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/** The rate between 0 and 1 where a rising function of the rate reaches `target`. */
function solve(f: (p: number) => number, target: number) {
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 48; step++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const intervals = new Map<string, readonly [number, number]>();
/**
 * The exact (Clopper-Pearson) 95% interval for a true success rate, after
 * `passes` passes in `trials` trials: the lowest rate under which so many
 * passes or more has a 2.5% chance, and the highest rate under which so few
 * or fewer has a 2.5% chance. With no trials logged it is the whole rule.
 */
export function clopperPearson(passes: number, trials: number): readonly [number, number] {
  if (trials === 0) return [0, 1];
  const key = `${passes}/${trials}`;
  const known = intervals.get(key);
  if (known) return known;
  const tail = (1 - LEVEL) / 2;
  const lower = passes === 0 ? 0 : solve((p) => sum(binomial(trials, p).slice(passes)), tail);
  const upper = passes === trials ? 1 : solve((p) => 1 - sum(binomial(trials, p).slice(0, passes + 1)), 1 - tail);
  const interval = [lower, upper] as const;
  intervals.set(key, interval);
  return interval;
}

/** How far two ranges share the rule, in rate (0 when they stand apart). */
export const overlapOf = (a: readonly [number, number], b: readonly [number, number]) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));

/** The exact chance that, over `n` trials each, the 70% policy passes at least as many as the 85% policy. */
export function chanceWorseTies(n: number): number {
  const worse = binomial(n, WORSE_RATE);
  const better = binomial(n, BETTER_RATE);
  const atLeast: number[] = new Array(n + 2).fill(0);
  for (let k = n; k >= 0; k--) atLeast[k] = atLeast[k + 1]! + worse[k]!;
  return sum(better.map((chance, k) => chance * atLeast[k]!));
}

const apartChances = new Map<number, number>();
/** The exact chance that, over `n` trials each, the two 95% ranges stand apart (the 70% range wholly below the 85% one). */
export function chanceApart(n: number): number {
  const known = apartChances.get(n);
  if (known !== undefined) return known;
  const worse = binomial(n, WORSE_RATE);
  const better = binomial(n, BETTER_RATE);
  let chance = 0;
  for (let i = 0; i <= n; i++) {
    if (worse[i]! < 1e-13) continue;
    const top = clopperPearson(i, n)[1];
    for (let j = 0; j <= n; j++) if (better[j]! >= 1e-13 && clopperPearson(j, n)[0] > top) chance += worse[i]! * better[j]!;
  }
  apartChances.set(n, chance);
  return chance;
}

// ---------------------------------------------------------------- layout (mm)
/** The percent rules run from x = RULE_X0 (0%) to RULE_X1 (100%). */
const RULE_X0 = -160;
const RULE_X1 = 160;
export const xOfRate = (rate: number) => RULE_X0 + rate * (RULE_X1 - RULE_X0);

const BASE: Plan = { x: -204, y: -84, w: 408, d: 170, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;

/** The tally fields: 50 columns of 6 cells, filled column by column from the left. */
const COLUMNS = 50;
const ROWS = 6;
const PITCH_X = (RULE_X1 - RULE_X0) / COLUMNS;
const PITCH_Y = 7;
const TRAY_H = 2.4;
const FIELD: Record<Policy, Plan> = {
  worse: { x: -166, y: -76, w: 332, d: ROWS * PITCH_Y + 6, r: 2 },
  better: { x: -166, y: 28, w: 332, d: ROWS * PITCH_Y + 6, r: 2 },
};
const cellOf = (policy: Policy, trial: number): Plan => {
  const column = Math.floor(trial / ROWS);
  const row = trial % ROWS;
  return { x: RULE_X0 + column * PITCH_X, y: FIELD[policy].y + 3 + row * PITCH_Y, w: PITCH_X, d: PITCH_Y, r: 0 };
};
const TILE_INSET = 0.8;
const TILE_H = 0.9;

/** The two rule beams, and the channel between them. */
const BEAM_H = 6;
const BEAM: Record<Policy, Plan> = {
  worse: { x: -178, y: -20, w: 356, d: 10, r: 1.2 },
  better: { x: -178, y: 10, w: 356, d: 10, r: 1.2 },
};
const STRIP_H = 0.6;
const STRIP_TOP = BEAM_H + STRIP_H;
const CHANNEL: Plan = { x: -170, y: -8, w: 340, d: 16, r: 1.5 };
const CHANNEL_H = 1.2;
/** The lit overlap bar's section. */
const BAR = { y: -3, d: 6, h: 4 };
/** The true-rate pins stand in the channel beside each rule. */
const PIN_Y: Record<Policy, number> = { worse: -5.4, better: 5.4 };

const LABEL: Plan = { x: 24, y: 78.5, w: 58, d: 6, r: 1.2 };
const SELECTOR: Plan = { x: 174, y: 34, w: 24, d: 34, r: 2.4 };
const SELECTOR_H = 12;
const KNOB = { x: SELECTOR.x + 12, y: SELECTOR.y + 17, r: 5 };
const MAGAZINE: Plan = { x: 174, y: -70, w: 24, d: 34, r: 2.4 };

// ---------------------------------------------------------------- the camera
export const WIDTH = 600;
const AZIMUTH = 70;
const ELEVATION = 42;
const JAW_TOP = STRIP_TOP + 3 + 20;
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([BASE.x + BASE.w, BEAM.worse.y, JAW_TOP], [BASE.x, BEAM.worse.y, JAW_TOP], [MAGAZINE.x + MAGAZINE.w, MAGAZINE.y, 14]);
const PAD = 8;
const unitProjection = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unitProjection)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
export const P: Projection = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 4 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
/** A seam or band line drawn under a solid's outline (the kit's `inner` markup). */
const seam = (d: string) => lineSvg(d, { tone: 'faint' });
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

// ------------------------------------------------------------------ the tiles
/**
 * A field's logged tiles as three joined paths: the bodies (each tile's
 * silhouette, filled with a side tone and stroked as its outline) and the
 * tops of the passes and of the failures. The tiles lie flat with gaps, so
 * no tile covers another and one path per layer paints them in true order.
 */
export interface TileField {
  bodies: string;
  passTops: string;
  failTops: string;
}
interface TileShape {
  body: string;
  top: string;
}
const tileCache = new Map<string, TileShape>();
const short = (points: Point3[]) =>
  `M${points.map((point) => at(point).map((value) => value.toFixed(1)).join(' ')).join('L')}Z`;
function tileAt(policy: Policy, trial: number): TileShape {
  const key = `${policy}${trial}`;
  let shape = tileCache.get(key);
  if (!shape) {
    const cell = cellOf(policy, trial);
    const [x0, x1] = [cell.x + TILE_INSET, cell.x + cell.w - TILE_INSET];
    const [y0, y1] = [cell.y + TILE_INSET, cell.y + cell.d - TILE_INSET];
    const [z0, z1] = [TRAY_H, TRAY_H + TILE_H];
    shape = {
      body: short([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]]),
      top: short([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
    };
    tileCache.set(key, shape);
  }
  return shape;
}
/** The first `settled` trials of a field, lying in their cells. */
export function tileField(policy: Policy, trials: readonly boolean[], settled: number): TileField {
  const bodies: string[] = [];
  const passes: string[] = [];
  const failures: string[] = [];
  for (let trial = 0; trial < settled; trial++) {
    const tile = tileAt(policy, trial);
    bodies.push(tile.body);
    (trials[trial] ? passes : failures).push(tile.top);
  }
  return { bodies: bodies.join(''), passTops: passes.join(''), failTops: failures.join('') };
}
/**
 * A tile on its way into its cell: hinged on the cell's back edge, falling
 * forward from upright (share 0) to flat (share 1).
 */
export function fallingTile(policy: Policy, trial: number, share: number): SolidPaths {
  const cell = cellOf(policy, trial);
  const angle = (1 - share) * (Math.PI / 2) * 0.92;
  const along: Point3 = [0, Math.cos(angle), Math.sin(angle)];
  const width = cell.w - 2 * TILE_INSET;
  const depth = cell.d - 2 * TILE_INSET;
  return plateIn([cell.x + TILE_INSET, cell.y + TILE_INSET, TRAY_H], [1, 0, 0], along, [[0, 0], [width, 0], [width, depth], [0, depth]], TILE_H, P);
}

// ------------------------------------------------------------------ the jaws
export type JawSide = 'low' | 'high';
export interface JawParts {
  slider: SolidPaths;
  blade: SolidPaths;
  screw: SolidPaths;
  knurl: string;
}
/** One caliper jaw on a policy's rule, built with its inner face at 0% and moved along x. */
function jawParts(policy: Policy, side: JawSide): JawParts {
  const beam = BEAM[policy];
  const out = side === 'low' ? -1 : 1;
  const body = 9;
  const x0 = Math.min(0, out * body);
  const slider = slab({ x: x0 + RULE_X0, y: beam.y - 1.4, w: body, d: beam.d + 2.8, r: 0.8 }, STRIP_TOP, 3, 2, 0.4);
  const cy = beam.y + beam.d / 2;
  const bladeZ = STRIP_TOP + 3;
  const profile: Array<[number, number]> = [
    [0, bladeZ],
    [out * 7, bladeZ],
    [out * 7, bladeZ + 20],
    [out * 1.8, bladeZ + 20],
    [0, bladeZ + 16.5],
  ];
  const blade = prismAlong(
    profile.map(([x, z]) => [RULE_X0 + x, cy - 1.7, z] as Point3),
    [0, 3.4, 0],
    P,
    { bevel: 0.4 },
  );
  const sx = RULE_X0 + out * 5;
  const sy = policy === 'worse' ? beam.y + beam.d - 1.2 : beam.y + 1.2;
  return {
    slider,
    blade,
    screw: cyl(sx, sy, 1.5, bladeZ, 2.4, 16, 0.2),
    knurl: knurl(sx, sy, 1.5, bladeZ + 0.3, bladeZ + 2.2, 12, P),
  };
}
export const JAWS: Record<Policy, Record<JawSide, JawParts>> = {
  worse: { low: jawParts('worse', 'low'), high: jawParts('worse', 'high') },
  better: { low: jawParts('better', 'low'), high: jawParts('better', 'high') },
};
/** The measured-rate cursor on a rule, built at 0%. */
export interface CursorParts {
  body: SolidPaths;
  index: string;
}
function cursorParts(policy: Policy): CursorParts {
  const beam = BEAM[policy];
  return {
    body: slab({ x: RULE_X0 - 1.1, y: beam.y + 1.2, w: 2.2, d: beam.d - 2.4, r: 0.5 }, STRIP_TOP, 5, 2, 0.3),
    index: onTop([[RULE_X0, beam.y + 1.2], [RULE_X0, beam.y + beam.d - 1.2]], STRIP_TOP + 5, P),
  };
}
export const CURSORS: Record<Policy, CursorParts> = { worse: cursorParts('worse'), better: cursorParts('better') };

/** The screen offset that puts a part built at 0% at `rate` along its rule. */
export const alongRule = (rate: number) => translateAlong(P, [rate * (RULE_X1 - RULE_X0), 0, 0]);

/** The lit overlap bar from rate `from` to rate `to`, or nothing when the ranges stand apart. */
export function overlapBar(from: number, to: number): SolidPaths | null {
  const width = xOfRate(to) - xOfRate(from);
  if (width < 0.4) return null;
  return slab({ x: xOfRate(from), y: BAR.y, w: width, d: BAR.d, r: Math.min(0.8, width / 2) }, CHANNEL_H, BAR.h, 2, width > 3 ? 0.4 : 0);
}

/** The selector knob and its pointer, turned to a trial count. */
export function knobParts(count: TrialCount): { knob: SolidPaths; knurl: string; pointer: string } {
  const index = TRIAL_COUNTS.indexOf(count);
  const angle = ((150 - index * 60) * Math.PI) / 180;
  const top = SELECTOR_H + 4;
  return {
    knob: cyl(KNOB.x, KNOB.y, KNOB.r, SELECTOR_H, 4, 32, 0.4),
    knurl: knurl(KNOB.x, KNOB.y, KNOB.r, SELECTOR_H + 0.4, top - 0.4, 28, P),
    pointer: onTop([[KNOB.x, KNOB.y], [KNOB.x + (KNOB.r - 1) * Math.cos(angle), KNOB.y + (KNOB.r - 1) * Math.sin(angle)]], top, P),
  };
}

// ------------------------------------------------------------------ the parts
export type Slot = 'tiles-worse' | 'tiles-better' | 'caliper-worse' | 'caliper-better' | 'bar' | 'knob';
export type Part = IsoPart | { kind: 'slot'; slot: Slot };
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screws = (points: Point3[], size = 0.5) => put({ kind: 'dots', points: points.map(at), size });

// The bench plate on four turned feet, with its groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 22, BASE.y + 18],
  [BASE.x + BASE.w - 22, BASE.y + 18],
  [BASE.x + 22, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 22, BASE.y + BASE.d - 18],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.8, 28), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6.4, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, 28), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.4), tone: 'mid', inner: seam(sideSeam(BASE, -3, P, 8)) });
put({ kind: 'line', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
{
  const corners: Array<[number, number]> = [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ];
  put({ kind: 'line', d: corners.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  screws(corners.map(([x, y]) => [x, y, 0] as Point3), 0.55);
}

/** A tally field: the tray, its inset groove, the cell grid and the screws that hold it. */
function field(policy: Policy) {
  const tray = FIELD[policy];
  put({ kind: 'solid', paths: slab(tray, 0, TRAY_H, 3, 0.5), tone: 'mid' });
  const inner = insetPlan(tray, 1.6);
  put({ kind: 'line', d: planOutline(inner, TRAY_H, P, 3), tone: 'faint' });
  const y0 = tray.y + 3;
  const y1 = tray.y + 3 + ROWS * PITCH_Y;
  const grid: string[] = [];
  for (let row = 0; row <= ROWS; row++) {
    const y = y0 + row * PITCH_Y;
    grid.push(onTop([[inner.x, y], [inner.x + inner.w, y]], TRAY_H, P));
  }
  // The rows run the tray's length; a divider after every fifth column marks each 30 trials.
  put({ kind: 'line', d: grid.join(''), tone: 'faint' });
  put({
    kind: 'line',
    d: Array.from({ length: COLUMNS / 5 + 1 }, (_, k) => onTop([[RULE_X0 + k * 5 * PITCH_X, y0], [RULE_X0 + k * 5 * PITCH_X, y1]], TRAY_H, P)).join(''),
    tone: 'lo',
  });
  screws([[tray.x + 3, tray.y + 3, TRAY_H], [tray.x + 3, tray.y + tray.d - 3, TRAY_H], [tray.x + tray.w - 3, tray.y + 3, TRAY_H], [tray.x + tray.w - 3, tray.y + tray.d - 3, TRAY_H]], 0.42);
  // The policy's mark at the field's left: one bump for the 70% policy, two for the 85% one.
  const plate: Plan = { x: BASE.x + 12, y: tray.y + 8, w: 22, d: tray.d - 16, r: 2 };
  put({ kind: 'solid', paths: slab(plate, 0, 3, 3, 0.4), tone: 'mid' });
  const bumps = policy === 'worse' ? [plate.y + plate.d / 2] : [plate.y + plate.d / 2 - 6, plate.y + plate.d / 2 + 6];
  for (const by of bumps) {
    put({ kind: 'solid', paths: cyl(plate.x + plate.w / 2, by, 3.6, 3, 1.6, 24, 0.3), tone: 'hi' });
  }
  put({ kind: 'slot', slot: `tiles-${policy}` });
}

/** A percent rule: the beam, its ruler strip with ticks, and the end blocks. */
function rule(policy: Policy) {
  const beam = BEAM[policy];
  put({ kind: 'solid', paths: slab(beam, 0, BEAM_H, 3, 0.5), tone: 'mid', inner: seam(sideSeam(beam, 2, P, 3)) });
  const strip: Plan = { x: RULE_X0 - 4, y: beam.y + 1.5, w: RULE_X1 - RULE_X0 + 8, d: beam.d - 3, r: 0.6 };
  put({ kind: 'solid', paths: slab(strip, BEAM_H, STRIP_H, 2), tone: 'lo', crease: 'none' });
  const ticks = topTicks(RULE_X0, RULE_X1, (RULE_X1 - RULE_X0) / 50, 5, strip.y + 0.1, STRIP_TOP, [2.2, 4], P);
  put({ kind: 'line', d: ticks.minor, tone: 'lo' });
  put({ kind: 'line', d: ticks.major, tone: 'mid' });
  // Zero, a half and the full rule, run the strip's whole depth.
  put({
    kind: 'line',
    d: [0, 0.5, 1].map((rate) => onTop([[xOfRate(rate), strip.y + 0.1], [xOfRate(rate), strip.y + strip.d - 0.1]], STRIP_TOP, P)).join(''),
    tone: 'hi',
  });
  for (const x of [beam.x, beam.x + beam.w - 8]) {
    const block: Plan = { x, y: beam.y - 1, w: 8, d: beam.d + 2, r: 1 };
    put({ kind: 'solid', paths: slab(block, 0, 10, 2, 0.4), tone: 'mid' });
    screws([[x + 4, beam.y + 2.5, 10], [x + 4, beam.y + beam.d - 2.5, 10]], 0.45);
  }
  put({ kind: 'slot', slot: `caliper-${policy}` });
}

// Back to front: the 70% field, its rule, the channel with the pins and the lit bar, the 85% rule, the 85% field.
field('worse');
// The tile magazine at the back right: spare tiles stacked between two guide posts.
{
  put({ kind: 'solid', paths: slab(MAGAZINE, 0, 4, 3, 0.4), tone: 'mid', inner: seam(sideSeam(MAGAZINE, 1.6, P, 3)) });
  const cx = MAGAZINE.x + MAGAZINE.w / 2;
  const cy = MAGAZINE.y + MAGAZINE.d / 2;
  put({ kind: 'solid', paths: cyl(cx, cy - 7.4, 1.4, 4, 9, 16), tone: 'mid' });
  for (let k = 0; k < 7; k++) {
    put({ kind: 'solid', paths: slab({ x: cx - 2.4, y: cy - 2.7, w: 4.8, d: 5.4, r: 0.5 }, 4 + k * 1.1, 0.9, 2), tone: k === 6 ? 'hi' : 'mid' });
  }
  put({ kind: 'solid', paths: cyl(cx, cy + 7.4, 1.4, 4, 9, 16), tone: 'mid' });
  screws([[MAGAZINE.x + 3, MAGAZINE.y + 3, 4], [MAGAZINE.x + MAGAZINE.w - 3, MAGAZINE.y + MAGAZINE.d - 3, 4]], 0.45);
}
rule('worse');
{
  put({ kind: 'solid', paths: slab(CHANNEL, 0, CHANNEL_H, 3), tone: 'lo' });
  put({ kind: 'line', d: planOutline(insetPlan(CHANNEL, 1.2), CHANNEL_H, P, 3), tone: 'faint' });
  // The true-rate pins: where each policy's success rate really sits. The back pin stands behind the lit bar, the front pin in front of it.
  const pin = (policy: Policy) => {
    const x = xOfRate(rateOf(policy));
    put({ kind: 'solid', paths: cyl(x, PIN_Y[policy], 2, CHANNEL_H, 0.8, 20), tone: 'mid' });
    put({ kind: 'solid', paths: cyl(x, PIN_Y[policy], 1.2, CHANNEL_H + 0.8, 6.4, 16, 0.2), tone: 'hi', inner: seam(sideArc(x, PIN_Y[policy], 1.2, CHANNEL_H + 3, P, 12)) });
  };
  pin('worse');
  put({ kind: 'slot', slot: 'bar' });
  pin('better');
}
rule('better');
field('better');
// The selector at the front right: a block with a dial ring, three stops for 10, 50 and 300 trials, and the knob.
{
  put({ kind: 'solid', paths: slab(SELECTOR, 0, SELECTOR_H, 3, 0.5), tone: 'mid', inner: seam(sideSeam(SELECTOR, 4, P, 3)) });
  put({ kind: 'line', d: ring(KNOB.x, KNOB.y, KNOB.r + 1.6, SELECTOR_H, P, 40), tone: 'lo' });
  put({
    kind: 'line',
    d: TRIAL_COUNTS.map((_, index) => {
      const angle = ((150 - index * 60) * Math.PI) / 180;
      const r0 = KNOB.r + 1.6;
      const r1 = KNOB.r + 3.6 + index;
      return onTop([[KNOB.x + r0 * Math.cos(angle), KNOB.y + r0 * Math.sin(angle)], [KNOB.x + r1 * Math.cos(angle), KNOB.y + r1 * Math.sin(angle)]], SELECTOR_H, P);
    }).join(''),
    tone: 'mid',
    free: 'end',
  });
  screws([[SELECTOR.x + 3, SELECTOR.y + 3, SELECTOR_H], [SELECTOR.x + SELECTOR.w - 3, SELECTOR.y + 3, SELECTOR_H], [SELECTOR.x + 3, SELECTOR.y + SELECTOR.d - 3, SELECTOR_H], [SELECTOR.x + SELECTOR.w - 3, SELECTOR.y + SELECTOR.d - 3, SELECTOR_H]], 0.45);
  put({ kind: 'slot', slot: 'knob' });
}
// A label plate on the bench's front edge, with three engraved rules.
put({ kind: 'solid', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', d: planOutline(insetPlan(LABEL, 1.6), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  d: [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 1.8 + row * 1.5], [LABEL.x + (row === 1 ? 30 : 48), LABEL.y + 1.8 + row * 1.5]], 0.8, P)).join(''),
  tone: 'lo',
  free: true,
});
screws([[LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8]]);

export const PARTS: readonly Part[] = parts;
/** Solids the drawing carries, for the parts count. */
export const SOLID_COUNT = parts.filter((part) => part.kind === 'solid').length;

export type { Flat };
