/**
 * The averaging plotter for LatencyComparison, drawn with the isometric kit.
 *
 * The object is the explanation. A template plate carries two straight
 * grooves, one on each side of a round post: the two good plans, pass on
 * the left or pass on the right. A gantry runs along the grooves. Its two
 * followers ride one groove each, a balance beam joins them, and the pen
 * carriage sits on the beam at the weight temporal ensembling gives the
 * plan already under way: at weight 1 the pen rides the left groove, at
 * 0.5 it sits halfway between. A tracer arm carries the stylus back from
 * the carriage, so the stylus trails the gantry. A trip dog on the ruler
 * marks the tick where the late plan arrives. After it the pen slides along
 * the beam to the averaged weight, and the ink it lays down (the one lit
 * part) is the move the robot makes. Past about 96 ms of delay the pen sits
 * inside the post's width and the stylus runs into the post: the gantry
 * stops there, as the robot's protective stop did.
 *
 * World units: the gantry runs toward -y (away from the viewer), the lanes
 * are apart in x, z is up. The pen's x is the executed action scaled so the
 * plan under way (+0.8) is the left groove's centre line. The post's radius
 * plus the stylus's is the lateral offset of the weakest action that still
 * counts as on a plan, so the drawn collision and the model's off-plan
 * verdict agree.
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
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MODE_VALUE,
  TRACE_TICKS,
  VALID_ACTION_FLOOR,
  teHandoffTrace,
  type TracePoint,
} from '../../../lib/latency-chunking.ts';

export const WIDTH = 640;
export const AZIMUTH = 34;
export const ELEVATION = 36;

/** `gantry` moves with the gantry, `pen` with the gantry and along the beam. */
export type Group = 'static' | 'gantry' | 'pen';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; group: Group; name: 'ink' | 'cross' | 'pointer' };

// ---------------------------------------------------------------- layout
/** The left groove (the plan under way, +0.8) sits at +LANE; the right groove at -LANE. */
export const LANE = 52;
/** Progress per control tick, in world units along the grooves. */
export const TICK_RUN = 7;
/** The stylus's y at the first tick; the gantry runs toward -y. */
export const START_Y = 150;
/** The post's centre, on the template's centre line. */
export const POST_Y = 10;
/** The stylus's travel when nothing stops it: well past the post. */
export const RUN_END = START_Y - (POST_Y - 46);
/** The stylus barrel's radius. */
export const STYLUS_R = 2.6;
/** The lateral offset of the weakest action still on a plan: where the stylus first touches the post. */
export const CLEAR_X = (VALID_ACTION_FLOOR / MODE_VALUE) * LANE;
/** The post's own radius: the touching offset less the stylus barrel. */
export const POST_R = CLEAR_X - STYLUS_R;
/** How far the stylus trails the bridge, on its tracer arm. */
export const TRAIL = 78;

const BASE: Plan = { x: -122, y: -164, w: 244, d: 382, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;
const TEMPLATE: Plan = { x: -76, y: -114, w: 152, d: 280, r: 6 };
const TEMPLATE_H = 6;
const ZT = TEMPLATE_H;
const RAIL_X = 96;
const RAIL_Y0 = -142;
const RAIL_Y1 = 176;
const RAIL_H = 10;
const RULER: Plan = { x: 77, y: -112, w: 9, d: 276, r: 1 };
const RULER_H = 1.2;
const CONTROL: Plan = { x: 12, y: 186, w: 58, d: 24, r: 3 };
const CONTROL_H = 15;
const MOTOR: Plan = { x: 84, y: 184, w: 22, d: 26, r: 3 };
const LABEL: Plan = { x: -94, y: 190, w: 80, d: 16, r: 2 };
/** The delay knob on the control box. */
export const KNOB: Point3 = [30, 198, CONTROL_H];
/** The post's top, and its cap on it. */
export const POST_TOP = ZT + 10;
const CAP_H = 1.4;

/** The gantry is built with its stylus at (0, START_Y); its bridge runs TRAIL ahead. */
const GY = START_Y - TRAIL;
const TRUCK_Z = RAIL_H;
const BRIDGE_Z = 22;
const BRIDGE_H = 10;
const FRONT = GY + 7;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
extremes.push([-106, GY, BRIDGE_Z + BRIDGE_H], [106, GY, BRIDGE_Z + BRIDGE_H], [-106, GY - RUN_END, BRIDGE_Z + BRIDGE_H]);
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
const rimDots = (cx: number, cy: number, r: number, z: number, count: number, phase = 0): Flat[] =>
  Array.from({ length: count }, (_, k) => at([cx + r * Math.cos(phase + (k / count) * Math.PI * 2), cy + r * Math.sin(phase + (k / count) * Math.PI * 2), z]));

/** The screen offset that moves the gantry, built with its stylus at the start, to stylus travel `s`. */
export const gantryAt = (s: number) => translateAlong(P, [0, -s, 0]);
/** The screen offset that moves the pen carriage, built at x = 0, to x on the beam. */
export const penAt = (x: number) => translateAlong(P, [x, 0, 0]);
/** True while the followers' pins are nearer the viewer than the post's centre: the post is drawn before them. */
export const postFirst = (s: number) => FRONT + 7.4 - s > POST_Y;

// ---------------------------------------------------------------- model glue
/** The pen's x for an executed action: the plan under way (+0.8) is the left groove's centre line. */
export const penX = (action: number) => (action / MODE_VALUE) * LANE;

/** The executed action at a (fractional) tick, read off the hand-off trace; it holds its last value past the trace. */
export function actionAt(trace: readonly TracePoint[], tick: number): number {
  const t = Math.min(TRACE_TICKS - 1, Math.max(0, tick));
  const i = Math.min(TRACE_TICKS - 2, Math.floor(t));
  return trace[i].action + (trace[i + 1].action - trace[i].action) * (t - i);
}

export type PlotterRun = {
  trace: TracePoint[];
  /** The pen's x once the averaged weight has settled. */
  finalX: number;
  /** True when the stylus meets the post: the averaged move is off both plans. */
  hits: boolean;
  /** Where the stylus stops: at the post, or past it. */
  stopS: number;
  /** The tick the run ends on. */
  endTick: number;
};

export function runOf(delayMs: number): PlotterRun {
  const trace = teHandoffTrace(delayMs);
  const finalX = penX(trace[TRACE_TICKS - 1].action);
  const hits = Math.abs(finalX) < CLEAR_X;
  const stopS = hits ? START_Y - POST_Y - Math.sqrt(CLEAR_X * CLEAR_X - finalX * finalX) : RUN_END;
  return { trace, finalX, hits, stopS, endTick: stopS / TICK_RUN };
}

/** Stylus travel and the pen's x at a tick of the run. */
export function poseAt(run: PlotterRun, tick: number): { s: number; x: number } {
  const t = Math.min(run.endTick, Math.max(0, tick));
  return { s: t * TICK_RUN, x: penX(actionAt(run.trace, t)) };
}

/** The ink the pen has laid down by `tick`: the executed move, on the template top. */
export function inkPath(run: PlotterRun, tick: number): string {
  const end = Math.min(run.endTick, Math.max(0, tick));
  const points: Flat[] = [];
  for (let t = 0; t < end; t += 0.25) {
    const { s, x } = poseAt(run, t);
    points.push(at([x, START_Y - s, ZT]));
  }
  const last = poseAt(run, end);
  points.push(at([last.x, START_Y - last.s, ZT]));
  return pathOf(points);
}

/** Where the pen first touches down: the ink starts on this dot. */
export const INK_START: Flat = iso([LANE, START_Y, TEMPLATE_H], P);

/** A small cross in a ring on the post's cap, on the side the stylus struck. */
export function crossPath(run: PlotterRun): string {
  if (!run.hits) return '';
  const contactY = START_Y - run.stopS;
  const angle = Math.atan2(contactY - POST_Y, run.finalX);
  const cx = Math.cos(angle) * (POST_R - 10);
  const cy = POST_Y + Math.sin(angle) * (POST_R - 10);
  const h = 2.6;
  const z = POST_TOP + CAP_H;
  return ring(cx, cy, h * Math.SQRT2, z, P, 24) + onTop([[cx - h, cy - h], [cx + h, cy + h]], z, P) + onTop([[cx - h, cy + h], [cx + h, cy - h]], z, P);
}

/** The delay knob's pointer, from no delay to the slider's top end over three quarters of a turn. */
export function knobPointer(delayMs: number): string {
  const angle = -0.75 * Math.PI + (Math.min(MAX_DELAY_MS, Math.max(0, delayMs)) / MAX_DELAY_MS) * 1.5 * Math.PI;
  const [cx, cy, z] = KNOB;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([cx + sx * 1.2, cy + sy * 1.2], [cx + sx * 5.2, cy + sy * 5.2], z + 6.2, P);
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

// ------------------------------------------------- back: base, rails, template, ruler
const back: Part[] = [];
for (const [x, y] of byDepth([
  [BASE.x + 24, BASE.y + 26],
  [BASE.x + BASE.w - 24, BASE.y + 26],
  [BASE.x + 24, BASE.y + BASE.d - 26],
  [BASE.x + BASE.w - 24, BASE.y + BASE.d - 26],
])) {
  back.push(solidOf('static', cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6), 'lo'));
  back.push(solidOf('static', cyl(x, y, 6.6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid'));
}
back.push(solidOf('static', slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid'));
back.push(lineOf('static', planOutline(insetPlan(BASE, 5), 0, P), 'faint'));
{
  const screws: Array<[number, number]> = [
    [BASE.x + 11, BASE.y + 11],
    [BASE.x + BASE.w - 11, BASE.y + 11],
    [BASE.x + 11, BASE.y + BASE.d - 11],
    [BASE.x + BASE.w - 11, BASE.y + BASE.d - 11],
  ];
  back.push(lineOf('static', screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo'));
  back.push(dotsOf('static', screws.map(([x, y]) => at([x, y, 0])), 0.55));
}
// The far rail ends: an end stop on the plain rail, the far pulley block on the drive rail (+x).
const stopPlan = (x: number, y: number): Plan => ({ x: x - 8, y, w: 16, d: 6, r: 1.2 });
back.push(solidOf('static', slab(stopPlan(-RAIL_X, RAIL_Y0 - 7), 0, 16, 3, 0.5)));
back.push(dotsOf('static', [at([-RAIL_X - 4, RAIL_Y0 - 4, 16]), at([-RAIL_X + 4, RAIL_Y0 - 4, 16])], 0.45));
for (const x of [-RAIL_X, RAIL_X]) {
  back.push(solidOf('static', slab({ x: x - 6, y: RAIL_Y0, w: 12, d: RAIL_Y1 - RAIL_Y0, r: 2 }, 0, RAIL_H, 3, 0.6)));
  back.push(lineOf('static', onTop([[x - 2.2, RAIL_Y0], [x - 2.2, RAIL_Y1]], RAIL_H, P), 'faint'));
}
// The drive belt along the +x rail, pulley to pulley.
back.push(lineOf('static', onTop([[RAIL_X + 2.4, RAIL_Y0 - 6], [RAIL_X + 2.4, RAIL_Y1 + 3]], RAIL_H + 0.3, P), 'lo'));
back.push(solidOf('static', slab({ x: RAIL_X - 8, y: RAIL_Y0 - 12, w: 16, d: 12, r: 2 }, 0, 20, 4, 0.6)));
back.push(solidOf('static', cyl(RAIL_X, RAIL_Y0 - 6, 4.2, 20, 3, 20), 'mid'));
back.push(dotsOf('static', [at([RAIL_X, RAIL_Y0 - 6, 23])], 0.6));
// The template plate: grooves for the two plans, an inset rule and corner screws.
back.push(solidOf('static', slab(TEMPLATE, 0, TEMPLATE_H, 6, 1.2), 'mid'));
back.push(lineOf('static', planOutline(insetPlan(TEMPLATE, 4.5), ZT, P), 'faint'));
for (const x of [LANE, -LANE]) {
  const groove: Plan = { x: x - 3.6, y: TEMPLATE.y + 8, w: 7.2, d: TEMPLATE.d - 16, r: 3.6 };
  back.push(lineOf('static', planOutline(groove, ZT, P, 6), 'mid'));
  back.push(lineOf('static', planOutline(insetPlan(groove, 1.4), ZT, P, 6), 'faint'));
}
{
  const screws: Array<[number, number]> = [
    [TEMPLATE.x + 10, TEMPLATE.y + 10],
    [TEMPLATE.x + TEMPLATE.w - 10, TEMPLATE.y + 10],
    [TEMPLATE.x + 10, TEMPLATE.y + TEMPLATE.d - 10],
    [TEMPLATE.x + TEMPLATE.w - 10, TEMPLATE.y + TEMPLATE.d - 10],
  ];
  back.push(lineOf('static', screws.map(([x, y]) => ring(x, y, 2.2, ZT, P, 16)).join(''), 'lo'));
  back.push(dotsOf('static', screws.map(([x, y]) => at([x, y, ZT])), 0.5));
}
// The ruler beside the drive rail: one tick per control tick from the start, a long one every fourth.
back.push(solidOf('static', slab(RULER, 0, RULER_H, 3, 0.4), 'lo'));
{
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; START_Y - k * TICK_RUN >= RULER.y + 4; k++) {
    const y = START_Y - k * TICK_RUN;
    (k % 4 === 0 ? major : minor).push(lineOnTop([RULER.x, y], [RULER.x + (k % 4 === 0 ? 6 : 3.2), y], RULER_H, P));
  }
  back.push(lineOf('static', minor.join(''), 'lo'));
  back.push(lineOf('static', major.join(''), 'mid'));
  back.push(dotsOf('static', [at([RULER.x + 6.8, RULER.y + 3, RULER_H]), at([RULER.x + 6.8, RULER.y + RULER.d - 3, RULER_H])], 0.45));
}
// The trip dog at the hand-off tick: where the late plan arrives.
{
  const y = START_Y - HANDOFF_TICK * TICK_RUN;
  back.push(solidOf('static', slab({ x: RULER.x + 2.2, y: y - 2.6, w: 5.4, d: 5.2, r: 1 }, RULER_H, 3.4, 3, 0.4), 'hi'));
  back.push(dotsOf('static', [at([RULER.x + 4.9, y, RULER_H + 3.4])], 0.5));
}
// The start rule across the template, groove to groove: where the run begins.
back.push(lineOf('static', onTop([[-LANE + 3.6, START_Y], [LANE - 3.6, START_Y]], ZT, P), 'mid'));
back.push(lineOf('static', onTop([[LANE + 3.6, START_Y], [TEMPLATE.x + TEMPLATE.w, START_Y]], ZT, P), 'faint'));
// The ink: the move the robot makes, laid on the template by the pen.
back.push({ kind: 'slot', group: 'static', name: 'ink' });

// ------------------------------------------------- the post: the thing both plans steer round
const post: Part[] = [];
post.push(solidOf('static', cyl(0, POST_Y, POST_R + 2.2, ZT, 1.4, 64, 0.4), 'lo'));
post.push(
  solidOf('static', cyl(0, POST_Y, POST_R, ZT + 1.4, POST_TOP - ZT - 1.4, 72, 0.8), 'hi', {
    inner: `<path class="iso-line" data-tone="faint" d="${sideArc(0, POST_Y, POST_R, ZT + 5.6, P, 48)}"/>`,
  }),
);
post.push(solidOf('static', cyl(0, POST_Y, POST_R - 4, POST_TOP, CAP_H, 64, 0.5), 'mid'));
post.push(lineOf('static', ring(0, POST_Y, 9, POST_TOP + CAP_H, P, 32), 'faint'));
post.push(dotsOf('static', rimDots(0, POST_Y, POST_R - 8.5, POST_TOP + CAP_H, 8, Math.PI / 8), 0.55));
post.push(dotsOf('static', [at([0, POST_Y, POST_TOP + CAP_H])], 0.7));
post.push({ kind: 'slot', group: 'static', name: 'cross' });

// ------------------------------------------------- the gantry, built with its stylus at the start
/** The followers' rollers and pins: the gantry's only parts below the post's top. */
const low: Part[] = [];
const gantry: Part[] = [];
const FOLLOW_Y = FRONT + 7.4;
for (const x of [-RAIL_X, RAIL_X]) {
  const truck: Plan = { x: x - 9.5, y: GY - 13, w: 19, d: 26, r: 3 };
  gantry.push(solidOf('gantry', slab(truck, TRUCK_Z, BRIDGE_Z - TRUCK_Z, 4, 0.6), 'mid', { inner: `<path class="iso-line" data-tone="faint" d="${sideSeam(truck, TRUCK_Z + 4, P, 4)}"/>` }));
}
// The belt clamp on the drive truck.
gantry.push(solidOf('gantry', slab({ x: RAIL_X - 5, y: GY + 7.6, w: 10, d: 4.6, r: 1 }, BRIDGE_Z, 2.2, 2, 0.3), 'lo'));
gantry.push(dotsOf('gantry', [at([RAIL_X - 2.6, GY + 9.9, BRIDGE_Z + 2.2]), at([RAIL_X + 2.6, GY + 9.9, BRIDGE_Z + 2.2])], 0.45));
// The trip finger on the drive truck, which rides over the dog.
gantry.push(solidOf('gantry', slab({ x: RULER.x + 1.4, y: GY + 9, w: 10, d: 3, r: 0.6 }, 5.6, 4.4, 2), 'lo'));
// The bridge across the rails, with its cover plate.
const BRIDGE: Plan = { x: -106, y: GY - 7, w: 212, d: 14, r: 2.5 };
gantry.push(solidOf('gantry', slab(BRIDGE, BRIDGE_Z, BRIDGE_H, 4, 0.8), 'mid', { inner: `<path class="iso-line" data-tone="faint" d="${sideSeam(BRIDGE, BRIDGE_Z + 3, P, 4)}"/>` }));
gantry.push(dotsOf('gantry', [-102, -90, 90, 102].map((x) => at([x, GY, BRIDGE_Z + BRIDGE_H])), 0.5));
gantry.push(lineOf('gantry', planOutline({ x: -72, y: GY - 3, w: 144, d: 6, r: 1.2 }, BRIDGE_Z + BRIDGE_H, P, 3), 'faint'));
// The guide on the bridge's near face, with its end clamps.
gantry.push(solidOf('gantry', slab({ x: -86, y: FRONT, w: 172, d: 3.2, r: 0.8 }, BRIDGE_Z + 2, 6, 2), 'lo'));
for (const x of [-89, 89]) gantry.push(solidOf('gantry', slab({ x: x - 2.5, y: FRONT - 0.4, w: 5, d: 4.4, r: 0.8 }, BRIDGE_Z + 1, 8, 2), 'mid'));
// Followers: one per groove, a roller in the groove, a pin up to a carriage on the guide.
for (const x of [-LANE, LANE]) {
  low.push(solidOf('gantry', cyl(x, FOLLOW_Y, 3.0, ZT - 0.6, 3.4, 24), 'lo'));
  low.push(solidOf('gantry', cyl(x, FOLLOW_Y, 1.5, ZT + 2.8, 17, 16), 'mid'));
}
for (const x of [-LANE, LANE]) {
  const carriage: Plan = { x: x - 7.5, y: FRONT + 3.2, w: 15, d: 8.4, r: 1.6 };
  gantry.push(solidOf('gantry', slab(carriage, 19.6, 13.4, 3, 0.6), 'mid', { inner: `<path class="iso-line" data-tone="faint" d="${sideSeam(carriage, 24, P, 3)}"/>` }));
  gantry.push(solidOf('gantry', cyl(x, FOLLOW_Y, 3.2, 33, 3.4, 24, 0.3), 'hi'));
  gantry.push(lineOf('gantry', knurl(x, FOLLOW_Y, 3.2, 33, 36.4, 16, P), 'lo'));
}
// The balance beam between the followers, with its weight scale: 1 at the left groove, 0 at the right.
const BEAM_Y = FRONT + 11.6;
const BEAM_Z = 22;
const BEAM_H = 5;
gantry.push(solidOf('gantry', slab({ x: -LANE - 4, y: BEAM_Y, w: LANE * 2 + 8, d: 6, r: 1.2 }, BEAM_Z, BEAM_H, 3, 0.5), 'mid'));
{
  const top = BEAM_Z + BEAM_H;
  const ticks = topTicks(-LANE, LANE, (LANE * 2) / 20, 5, BEAM_Y + 0.6, top, [1.6, 3], P, 'x');
  gantry.push(lineOf('gantry', ticks.minor, 'lo'));
  gantry.push(lineOf('gantry', ticks.major, 'mid'));
  // The post's width on the scale: a pen between these two marks meets the post.
  gantry.push(lineOf('gantry', onTop([[-CLEAR_X, BEAM_Y + 0.6], [-CLEAR_X, BEAM_Y + 5.2]], top, P) + onTop([[CLEAR_X, BEAM_Y + 0.6], [CLEAR_X, BEAM_Y + 5.2]], top, P), 'hi'));
  gantry.push(lineOf('gantry', onTop([[-CLEAR_X, BEAM_Y + 4.4], [CLEAR_X, BEAM_Y + 4.4]], top, P), 'faint'));
}
// The pen carriage on the beam (moves along it), with its clamp screw and index line.
const PEN_BLOCK: Plan = { x: -6.5, y: BEAM_Y - 1.4, w: 13, d: 14, r: 2 };
gantry.push(solidOf('pen', slab(PEN_BLOCK, 19.8, 11, 3, 0.6), 'mid', { inner: `<path class="iso-line" data-tone="faint" d="${sideSeam(PEN_BLOCK, 24.6, P, 3)}"/>` }));
gantry.push(solidOf('pen', cyl(0, BEAM_Y + 7.6, 2.6, 30.8, 3.6, 20, 0.3), 'hi'));
gantry.push(lineOf('pen', knurl(0, BEAM_Y + 7.6, 2.6, 30.8, 34.4, 12, P), 'lo'));
gantry.push(lineOf('pen', onTop([[0, BEAM_Y - 1.4], [0, BEAM_Y + 2.4]], 30.8, P), 'hi', 'end'));

// ------------------------------------------------- the tracer: arm and stylus (moves with the pen)
const tracer: Part[] = [];
const ARM: Plan = { x: -2.6, y: PEN_BLOCK.y + PEN_BLOCK.d, w: 5.2, d: START_Y - (PEN_BLOCK.y + PEN_BLOCK.d) + 3.4, r: 1.2 };
const ARM_Z = 24.4;
tracer.push(solidOf('pen', cyl(0, START_Y, 1.1, ZT, 3.2, 16), 'hi', { lit: true }));
tracer.push(solidOf('pen', cyl(0, START_Y, STYLUS_R, ZT + 3.2, ARM_Z - ZT - 3.2, 24), 'hi', { lit: true }));
tracer.push(solidOf('pen', cyl(0, START_Y, STYLUS_R + 0.7, ZT + 9, 1.8, 24), 'mid'));
tracer.push(solidOf('pen', slab(ARM, ARM_Z, 3.2, 3, 0.4), 'mid'));
tracer.push(solidOf('pen', cyl(0, START_Y, 4.2, ARM_Z + 3.2, 2.4, 24, 0.3), 'mid'));
tracer.push(dotsOf('pen', [at([0, START_Y, ARM_Z + 5.6])], 0.6));
tracer.push(dotsOf('pen', [at([0, ARM.y + 3, ARM_Z + 3.2]), at([0, ARM.y + 9, ARM_Z + 3.2])], 0.45));

// ------------------------------------------------- front: near rail ends, drive, controls, label
const front: Part[] = [];
front.push(solidOf('static', slab(stopPlan(-RAIL_X, RAIL_Y1 + 1), 0, 16, 3, 0.5)));
front.push(dotsOf('static', [at([-RAIL_X - 4, RAIL_Y1 + 4, 16]), at([-RAIL_X + 4, RAIL_Y1 + 4, 16])], 0.45));
front.push(solidOf('static', slab({ x: RAIL_X - 8, y: RAIL_Y1 - 2, w: 16, d: 9, r: 2 }, 0, 20, 4, 0.6)));
front.push(solidOf('static', cyl(RAIL_X, RAIL_Y1 + 3, 4.2, 20, 3, 20), 'mid'));
front.push(dotsOf('static', [at([RAIL_X, RAIL_Y1 + 3, 23])], 0.6));
// The motor that turns the near pulley.
{
  const cx = MOTOR.x + MOTOR.w / 2;
  const cy = MOTOR.y + 14;
  front.push(solidOf('static', slab(MOTOR, 0, 4, 4, 0.5), 'lo'));
  front.push(dotsOf('static', [at([MOTOR.x + 3, MOTOR.y + 3, 4]), at([MOTOR.x + MOTOR.w - 3, MOTOR.y + MOTOR.d - 3, 4])], 0.45));
  front.push(
    solidOf('static', cyl(cx, cy, 8.4, 4, 16, 36, 0.6), 'hi', {
      inner: `<path class="iso-line" data-tone="faint" d="${sideArc(cx, cy, 8.4, 8.5, P, 28)}${sideArc(cx, cy, 8.4, 15.5, P, 28)}"/>`,
    }),
  );
  front.push(solidOf('static', cyl(cx, cy, 4.6, 20, 2.4, 24, 0.3), 'mid'));
  front.push(dotsOf('static', [at([cx, cy, 22.4])], 0.55));
}
// The control box with the delay knob, its dial and a lamp.
front.push(solidOf('static', slab(CONTROL, 0, CONTROL_H, 4, 0.8), 'mid'));
front.push(lineOf('static', planOutline(insetPlan(CONTROL, 3), CONTROL_H, P, 4), 'faint'));
front.push(
  dotsOf('static', [
    at([CONTROL.x + 4.5, CONTROL.y + 4.5, CONTROL_H]),
    at([CONTROL.x + CONTROL.w - 4.5, CONTROL.y + 4.5, CONTROL_H]),
    at([CONTROL.x + 4.5, CONTROL.y + CONTROL.d - 4.5, CONTROL_H]),
    at([CONTROL.x + CONTROL.w - 4.5, CONTROL.y + CONTROL.d - 4.5, CONTROL_H]),
  ], 0.5),
);
{
  const [cx, cy, z] = KNOB;
  const dial = radialTicks(cx, cy, 9.8, 12, 3, z, [1.4, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  front.push(lineOf('static', ring(cx, cy, 9.8, z, P, 40), 'faint'));
  front.push(lineOf('static', dial.minor, 'lo'));
  front.push(lineOf('static', dial.major, 'mid'));
  front.push(solidOf('static', cyl(cx, cy, 6, z, 6.2, 32, 0.4), 'hi'));
  front.push(lineOf('static', knurl(cx, cy, 6, z, z + 6.2, 26, P), 'lo'));
  front.push({ kind: 'slot', group: 'static', name: 'pointer' });
}
front.push(solidOf('static', cyl(CONTROL.x + 47, CONTROL.y + 12, 3.4, CONTROL_H, 1.6, 20), 'mid'));
front.push(solidOf('static', cyl(CONTROL.x + 47, CONTROL.y + 12, 2.2, CONTROL_H + 1.6, 1.8, 20, 0.3), 'hi'));
front.push({
  kind: 'wire',
  group: 'static',
  from: at([CONTROL.x + CONTROL.w, CONTROL.y + 14, 7]),
  via: [at([CONTROL.x + CONTROL.w + 5, CONTROL.y + 14, 0.4])],
  to: at([MOTOR.x, MOTOR.y + 14, 2.4]),
  tone: 'lo',
});
// The label plate at the near left corner, with three engraved rules.
front.push(solidOf('static', slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' }));
front.push(lineOf('static', planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint'));
front.push(
  lineOf(
    'static',
    [0, 1, 2].map((row) => onTop([[LABEL.x + 9, LABEL.y + 4 + row * 3.6], [LABEL.x + (row === 1 ? 44 : 62), LABEL.y + 4 + row * 3.6]], 0.8, P)).join(''),
    'lo',
    true,
  ),
);
front.push(dotsOf('static', [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], 0.5));

/**
 * Painter's order: back; the post while the followers are in front of it; the followers' pins; the post once they
 * are past it; the rest of the gantry (all of it above the post's top); the tracer; the front.
 */
export const BACK_PARTS: readonly Part[] = back;
export const POST_PARTS: readonly Part[] = post;
export const LOW_PARTS: readonly Part[] = low;
export const GANTRY_PARTS: readonly Part[] = gantry;
export const TRACER_PARTS: readonly Part[] = tracer;
export const FRONT_PARTS: readonly Part[] = front;
export const PART_COUNT = back.length + post.length + low.length + gantry.length + tracer.length + front.length;
export const SOLID_COUNT = [back, post, low, gantry, tracer, front].flat().filter((part) => part.kind === 'solid').length;
