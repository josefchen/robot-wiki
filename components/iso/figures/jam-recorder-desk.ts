/**
 * The chart-recorder desk for JamOverhead, drawn with the isometric kit.
 *
 * The object is the explanation: two picking cells are run from one control
 * desk, and each cell's door carries a 60-minute circular chart recorder.
 * The paper disc turns once an hour under a pen that rides the outer ring
 * while its robot picks, swings in to the middle ring while a person clears
 * a failed pick, and to the inner ring while the cell is down for upkeep.
 * Both cells get 99 picks in 100 right; the only difference is the jam timer
 * under each recorder, how long a person needs per fix. The quick cell's
 * chart keeps a nearly unbroken outer ring; the slow cell's chart (its pen
 * is the one lit part) is bitten by four wide dips, and its good-picks
 * counter stops far lower.
 *
 * World units are about two millimetres: x along the desk (the slow cell is
 * at +x), y toward the viewer, z up. Every static path is built once here;
 * the paper discs, pens, timer pointers and counters are drawn in their
 * faces' own planes (`sideMatrix`) by the scene, from the pure functions
 * below, so the turning chart is one rotate() per frame.
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
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 580;
export const HEIGHT = 400;
export const AZIMUTH = 64;

export type Cell = 'quick' | 'slow';
export const CELLS: readonly Cell[] = ['quick', 'slow'];

/** Where a dynamic layer is painted in the order: the scene draws it there. */
export type Slot = `chart-${Cell}` | `counter-${Cell}` | `timer-${Cell}`;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

// ------------------------------------------------------------ the hour
export type CellState = 'picking' | 'clearing' | 'downtime';
export interface Segment {
  state: CellState;
  /** Seconds into the hour. */
  from: number;
  to: number;
}

export interface HourInputs {
  cycleTimeSeconds: number;
  jamClearSeconds: number;
  successRatePercent: number;
  uptimePercent: number;
}

/**
 * One elapsed hour of a cell, laid out as the chart records it: runs of
 * good picks, each run followed by one fix (one failed pick in every
 * 1/(1 - success) good picks, as the calculator models it), the last
 * partial run split in the same ratio, then the downtime. The picking and
 * clearing spans sum exactly to the calculator's time breakdown.
 */
export function hourLayout({ cycleTimeSeconds, jamClearSeconds, successRatePercent, uptimePercent }: HourInputs): Segment[] {
  const available = (uptimePercent / 100) * 3600;
  const jamRate = (100 - successRatePercent) / 100;
  const segments: Segment[] = [];
  let at = 0;
  const push = (state: CellState, seconds: number) => {
    if (seconds <= 1e-9) return;
    segments.push({ state, from: at, to: at + seconds });
    at += seconds;
  };
  if (jamRate <= 0) push('picking', available);
  else {
    const run = cycleTimeSeconds / jamRate;
    const cycle = run + jamClearSeconds;
    const whole = Math.floor(available / cycle + 1e-9);
    for (let k = 0; k < whole; k++) {
      push('picking', run);
      push('clearing', jamClearSeconds);
    }
    const rest = available - whole * cycle;
    push('picking', (rest * run) / cycle);
    push('clearing', (rest * jamClearSeconds) / cycle);
  }
  push('downtime', 3600 - available);
  return segments;
}

/** Seconds of each state in a layout, to check it against the calculator. */
export function totalsOf(layout: readonly Segment[]): Record<CellState, number> {
  const totals: Record<CellState, number> = { picking: 0, clearing: 0, downtime: 0 };
  for (const segment of layout) totals[segment.state] += segment.to - segment.from;
  return totals;
}

/** Good picks finished by `seconds` into the hour: one per cycle of picking time. */
export function picksBy(layout: readonly Segment[], seconds: number, cycleTimeSeconds: number): number {
  let picking = 0;
  for (const segment of layout) {
    if (segment.state !== 'picking' || segment.from >= seconds) continue;
    picking += Math.min(seconds, segment.to) - segment.from;
  }
  return Math.floor(picking / cycleTimeSeconds + 1e-6);
}

/** What the cell is doing `seconds` into the hour; at the hour's end the next hour starts picking. */
export function stateAt(layout: readonly Segment[], seconds: number): CellState {
  for (const segment of layout) if (seconds < segment.to) return segment.state;
  return 'picking';
}

// ------------------------------------------------------------ layout
const PLINTH: Plan = { x: -230, y: -42, w: 460, d: 88, r: 8 };
const PLINTH_H = 9;
const FOOT_H = 6;
const DESK: Plan = { x: -210, y: -30, w: 420, d: 60, r: 2.5 };
const KICK: Plan = { x: -206, y: -26, w: 412, d: 52, r: 2 };
const KICK_H = 8;
const DESK_TOP = 196;
const LID: Plan = { x: -214, y: -34, w: 428, d: 68, r: 3.5 };
const LID_H = 5;
/** The desk's front face, where the doors are. */
const FRONT = DESK.y + DESK.d;

/** Each cell's door: the quick cell on the left, the slow cell on the right. */
const DOOR_X: Record<Cell, [number, number]> = { quick: [-204, -4], slow: [4, 204] };
const DOOR_Z: [number, number] = [14, 190];
const centreOf = (cell: Cell) => (DOOR_X[cell][0] + DOOR_X[cell][1]) / 2;

/** The recorder case on each door, and its recessed window. */
const CASE_Z: [number, number] = [54, 188];
const CASE_HALF = 82;
const CASE_D = 12;
const CASE_FRONT = FRONT + CASE_D;
const WINDOW_HALF = 72;
const WINDOW_Z: [number, number] = [62, 180];
const RECESS = 8;
const BACK = CASE_FRONT - RECESS;

/** The chart: its centre on the back plate, its radius and the pen's pivot. */
export const CHART_R = 54;
const CHART_DX = -10;
const CHART_Z = 121;
/** Pen geometry in the chart's own plane (u right, v down, chart centre at 0). */
const PIVOT: Flat = [64, -40];
const ARM = 62;

/** The rings the pen rides: picking at the rim, clearing a jam, stopped for upkeep. */
export const LEVELS: Record<CellState, number> = { picking: 0.86 * CHART_R, clearing: 0.6 * CHART_R, downtime: 0.36 * CHART_R };

/** The jam timer and the good-picks counter under each recorder. */
const TIMER_DX = 40;
const TIMER_Z = 34;
const TIMER_R = 15;
const TIMER_D = 4;
/** The timer's scale: 0 to 5 minutes over 270 degrees, zero at lower left. */
export const TIMER_MAX_S = 300;
const TIMER_FROM = -135;
const TIMER_SPAN = 270;
const COUNTER: { dx: number; w: number; z: number; h: number } = { dx: -44, w: 56, z: 24, h: 22 };
const COUNTER_FACE = FRONT + 3;

const LABEL: Plan = { x: 132, y: 33.5, w: 64, d: 9.5, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [PLINTH.x, PLINTH.x + PLINTH.w]) for (const py of [PLINTH.y, PLINTH.y + PLINTH.d]) {
  extremes.push([px, py, -PLINTH_H - FOOT_H], [px, py, 0]);
}
for (const px of [LID.x, LID.x + LID.w]) for (const py of [LID.y, LID.y + LID.d]) extremes.push([px, py, DESK_TOP + LID_H]);
// The stack lights' caps, all round, so the fit keeps the whole cap inside the stage.
for (const x of [-192, 192]) for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) extremes.push([x + dx, -10 + dy, DESK_TOP + LID_H + 56]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 8, azimuth: AZIMUTH });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A round boss standing out of a face whose normal is +y: its front disc, rim and outline. */
function boss(cx: number, cz: number, y0: number, depth: number, r: number, steps = 32): SolidPaths {
  const front: Flat[] = [];
  const back: Flat[] = [];
  for (let k = 0; k < steps; k++) {
    const angle = (k / steps) * Math.PI * 2;
    front.push(at([cx + r * Math.cos(angle), y0 + depth, cz + r * Math.sin(angle)]));
    back.push(at([cx + r * Math.cos(angle), y0, cz + r * Math.sin(angle)]));
  }
  const outline = pathOf(hull([...front, ...back]), true);
  return { fill: outline, outline, crease: pathOf(front, true), top: pathOf(front, true), shades: ['', '', outline, ''] };
}

/** A closed rectangle on the face y = `y`, from x0 to x1 and z0 to z1. */
const faceRect = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

/** A closed rounded slot on the face x = `x` (the desk's right side), a vent. */
function sideSlot(y0: number, y1: number, z0: number, z1: number, x: number) {
  const r = Math.min((y1 - y0) / 2, (z1 - z0) / 2);
  const points: Flat[] = [];
  const arc = (cy: number, cz: number, from: number) => {
    for (let step = 0; step <= 6; step++) {
      const angle = from + (step / 6) * Math.PI;
      points.push(at([x, cy + r * Math.cos(angle), cz + r * Math.sin(angle)]));
    }
  };
  arc((y0 + y1) / 2, z1 - r, 0);
  arc((y0 + y1) / 2, z0 + r, Math.PI);
  return pathOf(points, true);
}

// ---------------------------------------------------------- the chart
const unit = (u: number, v: number): Flat => [u, v];
const rotate = ([u, v]: Flat, degrees: number): Flat => {
  const a = (degrees * Math.PI) / 180;
  return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
};
const local = (points: Flat[], closed = false) =>
  points.length ? points.map(([u, v], k) => `${k ? 'L' : 'M'}${u.toFixed(2)} ${v.toFixed(2)}`).join('') + (closed ? 'Z' : '') : '';

/** The pen arm's angle about its pivot, in degrees, when its tip is `r` from the chart's centre. */
export function armAngle(r: number): number {
  const d = Math.hypot(PIVOT[0], PIVOT[1]);
  const toCentre = Math.atan2(-PIVOT[1], -PIVOT[0]);
  const cosine = (d * d + ARM * ARM - r * r) / (2 * d * ARM);
  const turn = Math.acos(Math.max(-1, Math.min(1, cosine)));
  // The branch that swings the tip across the chart's upper half.
  return ((toCentre + turn) * 180) / Math.PI;
}

/** The pen tip, in the chart's plane, when it is `r` from the centre. */
export function penTip(r: number): Flat {
  const a = (armAngle(r) * Math.PI) / 180;
  return [PIVOT[0] + ARM * Math.cos(a), PIVOT[1] + ARM * Math.sin(a)];
}

/** The pen's path between two rings, sampled along its arm's arc. */
function penArc(r0: number, r1: number, count = 10): Flat[] {
  const a0 = armAngle(r0);
  const a1 = armAngle(r1);
  return Array.from({ length: count + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / count) * Math.PI) / 180;
    return unit(PIVOT[0] + ARM * Math.cos(a), PIVOT[1] + ARM * Math.sin(a));
  });
}

/** How far the paper has turned, in degrees clockwise, `seconds` into the hour. */
export const chartTurn = (seconds: number) => (360 * Math.min(Math.max(seconds, 0), 3600)) / 3600;

/** A point the pen marks at `seconds`, at the angle it has on the paper (the paper turns under the pen). */
const onPaper = (point: Flat, seconds: number) => rotate(point, -chartTurn(seconds));

/** The printed chart, in its own plane: rim, rings, the 5-minute time arcs and minute ticks. */
const INNER = 0.24 * CHART_R;
const RIM = 0.97 * CHART_R;
export const CHART_PRINT = (() => {
  const circle = (r: number, count = 96) => local(Array.from({ length: count }, (_, k) => unit(r * Math.cos((k / count) * Math.PI * 2), r * Math.sin((k / count) * Math.PI * 2))), true);
  const fiveMinutes: string[] = [];
  const minutes: string[] = [];
  for (let minute = 0; minute < 60; minute++) {
    const seconds = minute * 60;
    if (minute % 5 === 0) fiveMinutes.push(local(penArc(INNER, RIM).map((point) => onPaper(point, seconds))));
    else minutes.push(local(penArc(0.9 * CHART_R, RIM, 3).map((point) => onPaper(point, seconds))));
  }
  return {
    paper: circle(CHART_R, 120),
    rim: circle(RIM),
    hub: circle(INNER, 48),
    rings: [LEVELS.picking, LEVELS.clearing, LEVELS.downtime].map((r) => circle(r)).join(''),
    hours: fiveMinutes.join(''),
    minutes: minutes.join(''),
  };
})();

/**
 * The ink the pen has laid on the paper by `seconds` into the hour, one
 * path per state (in the paper's own frame, before it turns): each picking
 * run is an arc on the outer ring; each fix and the downtime is the pen's
 * swing in along its arm's arc, an arc on its ring, and the swing back out.
 */
export function traceOf(layout: readonly Segment[], seconds: number): Record<CellState, string> {
  const paths: Record<CellState, string[]> = { picking: [], clearing: [], downtime: [] };
  const now = Math.min(Math.max(seconds, 0), 3600);
  let previous: CellState | null = null;
  for (const segment of layout) {
    if (segment.from >= now) break;
    const end = Math.min(segment.to, now);
    const r = LEVELS[segment.state];
    const points: Flat[] = [];
    if (previous && previous !== segment.state) {
      for (const point of penArc(LEVELS[previous], r, 8)) points.push(onPaper(point, segment.from));
    }
    const steps = Math.max(1, Math.ceil((end - segment.from) / 15));
    for (let k = 0; k <= steps; k++) points.push(onPaper(penTip(r), segment.from + ((end - segment.from) * k) / steps));
    if (segment.state !== 'picking' && segment.to <= now) {
      for (const point of penArc(r, LEVELS.picking, 8)) points.push(onPaper(point, segment.to));
    }
    if (points.length > 1) paths[segment.state].push(local(points));
    previous = segment.state;
  }
  return { picking: paths.picking.join(''), clearing: paths.clearing.join(''), downtime: paths.downtime.join('') };
}

/** The pen arm, in the chart's plane, drawn at the picking ring; the scene turns it with `armTurn`. */
const ARM_W = 2.2;
export const PEN_ARM = (() => {
  const tip = penTip(LEVELS.picking);
  const dir: Flat = [(tip[0] - PIVOT[0]) / ARM, (tip[1] - PIVOT[1]) / ARM];
  const side: Flat = [-dir[1], dir[0]];
  const from: Flat = [PIVOT[0], PIVOT[1]];
  const to: Flat = [tip[0] - dir[0] * 3.6, tip[1] - dir[1] * 3.6];
  const strip = [
    [from[0] + side[0] * ARM_W, from[1] + side[1] * ARM_W],
    [to[0] + side[0] * ARM_W * 0.7, to[1] + side[1] * ARM_W * 0.7],
    [to[0] - side[0] * ARM_W * 0.7, to[1] - side[1] * ARM_W * 0.7],
    [from[0] - side[0] * ARM_W, from[1] - side[1] * ARM_W],
  ] as Flat[];
  // The pen: a small ink capsule across the arm's end, its nib on the ring.
  const nib = [
    [to[0] + side[0] * 2.6, to[1] + side[1] * 2.6],
    [to[0] + side[0] * 2.6 + dir[0] * 3.6, to[1] + side[1] * 2.6 + dir[1] * 3.6],
    [to[0] - side[0] * 2.6 + dir[0] * 3.6, to[1] - side[1] * 2.6 + dir[1] * 3.6],
    [to[0] - side[0] * 2.6, to[1] - side[1] * 2.6],
  ] as Flat[];
  // The stiffening rib runs from under the pivot boss to the arm's end.
  const rib = local([from, to]);
  return { strip: local(strip, true), nib: local(nib, true), rib, pivot: PIVOT };
})();

/** The pen arm's rotation about its pivot, in degrees, to put its tip on ring `r` (zero at the picking ring). */
export const armTurn = (r: number) => armAngle(r) - armAngle(LEVELS.picking);

/** The plane matrix of each cell's paper (the recess's back plate), chart centre at local 0, 0. */
export const CHART_MATRIX: Record<Cell, string> = {
  quick: sideMatrix([centreOf('quick') + CHART_DX, BACK + 0.4], CHART_Z, P, 'left'),
  slow: sideMatrix([centreOf('slow') + CHART_DX, BACK + 0.4], CHART_Z, P, 'left'),
};

/** The chart's hub nut and the pen's pivot boss, standing out of the paper. */
export const HUB: Record<Cell, SolidPaths> = {
  quick: boss(centreOf('quick') + CHART_DX, CHART_Z, BACK, 5, 6.5, 32),
  slow: boss(centreOf('slow') + CHART_DX, CHART_Z, BACK, 5, 6.5, 32),
};
export const PIVOT_BOSS: Record<Cell, SolidPaths> = {
  quick: boss(centreOf('quick') + CHART_DX + PIVOT[0], CHART_Z - PIVOT[1], BACK, 4, 4.6, 24),
  slow: boss(centreOf('slow') + CHART_DX + PIVOT[0], CHART_Z - PIVOT[1], BACK, 4, 4.6, 24),
};

/** The window each recess is seen through, on the case's front face. */
export const WINDOW_CLIP: Record<Cell, string> = {
  quick: faceRect(centreOf('quick') - WINDOW_HALF, centreOf('quick') + WINDOW_HALF, WINDOW_Z[0], WINDOW_Z[1], CASE_FRONT),
  slow: faceRect(centreOf('slow') - WINDOW_HALF, centreOf('slow') + WINDOW_HALF, WINDOW_Z[0], WINDOW_Z[1], CASE_FRONT),
};

/** The timer dial's face plane, its centre at local 0, 0. */
export const TIMER_MATRIX: Record<Cell, string> = {
  quick: sideMatrix([centreOf('quick') + TIMER_DX, FRONT + TIMER_D], TIMER_Z, P, 'left'),
  slow: sideMatrix([centreOf('slow') + TIMER_DX, FRONT + TIMER_D], TIMER_Z, P, 'left'),
};
/** The timer pointer's angle for a fix time, degrees clockwise from straight up. */
export const timerAngle = (seconds: number) => TIMER_FROM + (TIMER_SPAN * Math.min(Math.max(seconds, 0), TIMER_MAX_S)) / TIMER_MAX_S;
export const TIMER_POINTER = local([[0, 3.2], [0, -(TIMER_R - 4.2)]]);

// ------------------------------------------------- the picks counter
/** Seven-segment strokes for each digit: a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle. */
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};
const DIGIT_W = 7;
const DIGIT_H = 12;
const DIGIT_GAP = 5.4;
/** The counter's digits, three of them, as strokes on its face. */
export function counterDigits(cell: Cell, value: number): string {
  const text = String(Math.max(0, Math.min(999, Math.round(value)))).padStart(3, ' ');
  const x0 = centreOf(cell) + COUNTER.dx - (3 * DIGIT_W + 2 * DIGIT_GAP) / 2;
  const z0 = COUNTER.z + (COUNTER.h - DIGIT_H) / 2;
  const strokes: string[] = [];
  [...text].forEach((char, index) => {
    const segments = SEGMENTS[char];
    if (!segments) return;
    const left = x0 + index * (DIGIT_W + DIGIT_GAP);
    const right = left + DIGIT_W;
    const corners: Record<string, [Point3, Point3]> = {
      a: [[left + 0.8, COUNTER_FACE, z0 + DIGIT_H], [right - 0.8, COUNTER_FACE, z0 + DIGIT_H]],
      b: [[right, COUNTER_FACE, z0 + DIGIT_H - 0.8], [right, COUNTER_FACE, z0 + DIGIT_H / 2 + 0.6]],
      c: [[right, COUNTER_FACE, z0 + DIGIT_H / 2 - 0.6], [right, COUNTER_FACE, z0 + 0.8]],
      d: [[left + 0.8, COUNTER_FACE, z0], [right - 0.8, COUNTER_FACE, z0]],
      e: [[left, COUNTER_FACE, z0 + DIGIT_H / 2 - 0.6], [left, COUNTER_FACE, z0 + 0.8]],
      f: [[left, COUNTER_FACE, z0 + DIGIT_H - 0.8], [left, COUNTER_FACE, z0 + DIGIT_H / 2 + 0.6]],
      g: [[left + 0.8, COUNTER_FACE, z0 + DIGIT_H / 2], [right - 0.8, COUNTER_FACE, z0 + DIGIT_H / 2]],
    };
    for (const name of segments) strokes.push(segment(corners[name][0], corners[name][1], P));
  });
  return strokes.join('');
}
/** The counter window, where the digits are clipped. */
export const COUNTER_CLIP: Record<Cell, string> = {
  quick: faceRect(centreOf('quick') + COUNTER.dx - COUNTER.w / 2, centreOf('quick') + COUNTER.dx + COUNTER.w / 2, COUNTER.z, COUNTER.z + COUNTER.h, COUNTER_FACE),
  slow: faceRect(centreOf('slow') + COUNTER.dx - COUNTER.w / 2, centreOf('slow') + COUNTER.dx + COUNTER.w / 2, COUNTER.z, COUNTER.z + COUNTER.h, COUNTER_FACE),
};

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screws = (points: Point3[], size = 0.5) => put({ kind: 'dots', points: points.map(at), size });

// The plinth: a plate on four levelling feet, with a groove and corner screws.
put({ kind: 'line', d: slab(PLINTH, -PLINTH_H - FOOT_H, PLINTH_H + FOOT_H).fill, tone: 'faint' });
for (const [x, y] of byDepth([
  [PLINTH.x + 26, PLINTH.y + 20],
  [PLINTH.x + PLINTH.w - 26, PLINTH.y + 20],
  [PLINTH.x + 26, PLINTH.y + PLINTH.d - 20],
  [PLINTH.x + PLINTH.w - 26, PLINTH.y + PLINTH.d - 20],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 9, -PLINTH_H - FOOT_H, 2, 28), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6.5, -PLINTH_H - FOOT_H + 2, FOOT_H - 2, 28), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(PLINTH, -PLINTH_H, PLINTH_H, 8, 1.6), tone: 'mid' });
put({ kind: 'line', d: planOutline(insetPlan(PLINTH, 5), 0, P), tone: 'faint' });
{
  const corners: Array<[number, number]> = [
    [PLINTH.x + 11, PLINTH.y + 11],
    [PLINTH.x + PLINTH.w - 11, PLINTH.y + 11],
    [PLINTH.x + 11, PLINTH.y + PLINTH.d - 11],
    [PLINTH.x + PLINTH.w - 11, PLINTH.y + PLINTH.d - 11],
  ];
  put({ kind: 'line', d: corners.map(([x, y]) => ring(x, y, 2.6, 0, P, 16)).join(''), tone: 'lo' });
  screws(corners.map(([x, y]) => [x, y, 0] as Point3), 0.55);
}

// The desk: a recessed kick plate, the body with its lid seam, and the lid.
put({ kind: 'solid', paths: slab(KICK, 0, KICK_H, 3), tone: 'lo' });
put({ kind: 'solid', paths: slab(DESK, KICK_H, DESK_TOP - KICK_H, 4, 0.8), tone: 'mid', inner: sideSeam(DESK, DESK_TOP - 10, P, 4) });
put({ kind: 'solid', paths: slab(LID, DESK_TOP, LID_H, 6, 1.2), tone: 'mid' });
put({ kind: 'line', d: planOutline(insetPlan(LID, 6), DESK_TOP + LID_H, P, 6), tone: 'faint' });
screws([LID.x + 9, LID.x + LID.w - 9].flatMap((x) => [[x, LID.y + 9, DESK_TOP + LID_H], [x, LID.y + LID.d - 9, DESK_TOP + LID_H]] as Point3[]));

// The desk's right side: louvred vent slots and the cable gland at the foot.
{
  const side = DESK.x + DESK.w;
  for (let k = 0; k < 5; k++) put({ kind: 'line', d: sideSlot(-20 + k * 9.5, -16 + k * 9.5, 112, 168, side), tone: 'lo' });
}

// The doors: an outline round each, the stile between them, hinge knuckles and a latch.
put({ kind: 'line', d: faceRect(DOOR_X.quick[0], DOOR_X.quick[1], DOOR_Z[0], DOOR_Z[1], FRONT), tone: 'lo' });
put({ kind: 'line', d: faceRect(DOOR_X.slow[0], DOOR_X.slow[1], DOOR_Z[0], DOOR_Z[1], FRONT), tone: 'lo' });
put({ kind: 'line', d: faceRect(DOOR_X.quick[0] + 5, DOOR_X.quick[1] - 5, DOOR_Z[0] + 5, DOOR_Z[1] - 5, FRONT), tone: 'faint' });
put({ kind: 'line', d: faceRect(DOOR_X.slow[0] + 5, DOOR_X.slow[1] - 5, DOOR_Z[0] + 5, DOOR_Z[1] - 5, FRONT), tone: 'faint' });
for (const [x, z] of [[DOOR_X.quick[0] - 0.4, 30], [DOOR_X.quick[0] - 0.4, 158], [DOOR_X.slow[1] + 0.4, 30], [DOOR_X.slow[1] + 0.4, 158]] as Array<[number, number]>) {
  put({ kind: 'solid', paths: cyl(x, FRONT + 1.6, 2.4, z, 16, 16), tone: 'mid' });
  put({ kind: 'line', d: sideArc(x, FRONT + 1.6, 2.4, z + 8, P, 12), tone: 'faint' });
}
for (const cell of CELLS) {
  const x = cell === 'quick' ? DOOR_X.quick[1] - 12 : DOOR_X.slow[0] + 12;
  put({ kind: 'solid', paths: boss(x, 104, FRONT, 2.2, 5.2, 28), tone: 'mid' });
  put({ kind: 'solid', paths: slab({ x: x - 1.8, y: FRONT + 2.2, w: 3.6, d: 3.2, r: 0.8 }, 92, 24, 2, 0.4), tone: 'hi' });
}

// Each door's recorder, timer and counter, quick (far) then slow (near).
for (const cell of CELLS) {
  const cx = centreOf(cell);
  const lit = cell === 'slow';
  // The recorder case on the door, with four screws in its face.
  const casePlan: Plan = { x: cx - CASE_HALF, y: FRONT, w: CASE_HALF * 2, d: CASE_D, r: 2 };
  put({ kind: 'solid', paths: slab(casePlan, CASE_Z[0], CASE_Z[1] - CASE_Z[0], 3, 0.6), tone: 'mid', inner: sideSeam(casePlan, CASE_Z[1] - 4, P, 3) });
  screws([[cx - CASE_HALF + 5, CASE_FRONT, CASE_Z[0] + 4], [cx + CASE_HALF - 5, CASE_FRONT, CASE_Z[0] + 4], [cx - CASE_HALF + 5, CASE_FRONT, CASE_Z[1] - 8], [cx + CASE_HALF - 5, CASE_FRONT, CASE_Z[1] - 8]]);
  // The recess: its back plate, the turning chart and pen (drawn by the scene, clipped to the window), then the walls.
  const [x0, x1] = [cx - WINDOW_HALF, cx + WINDOW_HALF];
  const [z0, z1] = WINDOW_Z;
  put({ kind: 'face', d: faceRect(x0, x1, z0, z1, BACK), fill: 3 });
  put({ kind: 'slot', slot: `chart-${cell}` });
  // The left and bottom walls of the recess are the ones that face the viewer.
  put({ kind: 'face', d: pathOf([at([x0, CASE_FRONT, z0]), at([x0, BACK, z0]), at([x0, BACK, z1]), at([x0, CASE_FRONT, z1])], true), fill: 1 });
  put({ kind: 'face', d: pathOf([at([x0, CASE_FRONT, z0]), at([x1, CASE_FRONT, z0]), at([x1, BACK, z0]), at([x0, BACK, z0])], true), fill: 'top' });
  put({ kind: 'line', d: pathOf([at([x0, CASE_FRONT, z1]), at([x0, BACK, z1]), at([x0, BACK, z0]), at([x1, BACK, z0]), at([x1, CASE_FRONT, z0])]), tone: 'faint' });
  put({ kind: 'line', d: faceRect(x0, x1, z0, z1, CASE_FRONT), tone: 'mid' });
  // The glass: one glint across the window's top right corner, edge to edge.
  put({ kind: 'line', d: pathOf([at([x1 - 22, CASE_FRONT, z1]), at([x1, CASE_FRONT, z1 - 18])]), tone: 'faint' });
  // The pen lifter under the window: a boss and its lever.
  put({ kind: 'solid', paths: boss(cx + 2, CASE_Z[0] + 4, CASE_FRONT, 1.6, 2.6, 20), tone: 'mid' });
  put({ kind: 'solid', paths: slab({ x: cx + 2, y: CASE_FRONT + 1.6, w: 9, d: 1.6, r: 0.6 }, CASE_Z[0] + 3, 2, 2), tone: 'hi' });

  // The good-picks counter: a bezel, its window and the digits (drawn by the scene).
  const counterPlan: Plan = { x: cx + COUNTER.dx - COUNTER.w / 2 - 3, y: FRONT, w: COUNTER.w + 6, d: 3, r: 1.2 };
  put({ kind: 'solid', paths: slab(counterPlan, COUNTER.z - 3, COUNTER.h + 6, 2, 0.4), tone: 'mid' });
  put({ kind: 'face', d: COUNTER_CLIP[cell], fill: 2 });
  put({ kind: 'slot', slot: `counter-${cell}` });
  put({ kind: 'line', d: COUNTER_CLIP[cell], tone: 'lo' });

  // The jam timer: a dial on a boss, a 0 to 5 minute scale, the pointer (drawn by the scene) and its knob.
  const tx = cx + TIMER_DX;
  put({ kind: 'solid', paths: boss(tx, TIMER_Z, FRONT, TIMER_D, TIMER_R + 2, 40), tone: 'mid' });
  {
    const face = FRONT + TIMER_D;
    const ticks: { minor: string[]; major: string[] } = { minor: [], major: [] };
    for (let step = 0; step <= 20; step++) {
      const angle = ((TIMER_FROM + (TIMER_SPAN * step) / 20) * Math.PI) / 180;
      const big = step % 4 === 0;
      const r0 = TIMER_R - (big ? 4 : 2.4);
      const r1 = TIMER_R;
      (big ? ticks.major : ticks.minor).push(segment([tx + r0 * Math.sin(angle), face, TIMER_Z + r0 * Math.cos(angle)], [tx + r1 * Math.sin(angle), face, TIMER_Z + r1 * Math.cos(angle)], P));
    }
    const arc: Flat[] = [];
    for (let step = 0; step <= 40; step++) {
      const angle = ((TIMER_FROM + (TIMER_SPAN * step) / 40) * Math.PI) / 180;
      arc.push(at([tx + TIMER_R * Math.sin(angle), face, TIMER_Z + TIMER_R * Math.cos(angle)]));
    }
    put({ kind: 'line', d: pathOf(arc), tone: 'lo' });
    put({ kind: 'line', d: ticks.minor.join(''), tone: 'lo' });
    put({ kind: 'line', d: ticks.major.join(''), tone: 'mid' });
  }
  put({ kind: 'slot', slot: `timer-${cell}` });
  put({ kind: 'solid', paths: boss(tx, TIMER_Z, FRONT + TIMER_D, 3, 4.2, 24), tone: lit ? 'mid' : 'mid' });
}

// On the lid: a stack of spare charts with its centre hole, and a box of spare pens.
{
  const top = DESK_TOP + LID_H;
  put({ kind: 'solid', paths: cyl(-58, 0, 29, top, 6, 72, 0.6), tone: 'hi', inner: [top + 2, top + 4].map((h) => sideArc(-58, 0, 29, h, P, 40)).join('') });
  put({ kind: 'line', d: ring(-58, 0, 26.6, top + 6, P, 72), tone: 'faint' });
  put({ kind: 'line', d: ring(-58, 0, 3.4, top + 6, P, 24), tone: 'lo' });
  const box: Plan = { x: 34, y: -12, w: 46, d: 24, r: 2 };
  put({ kind: 'solid', paths: slab(box, top, 7, 3, 0.5), tone: 'mid', inner: sideSeam(box, top + 4.5, P, 3) });
  put({ kind: 'line', d: planOutline(insetPlan(box, 3), top + 7, P, 3), tone: 'faint' });
  screws([[box.x + 5, box.y + box.d / 2, top + 7], [box.x + box.w - 5, box.y + box.d / 2, top + 7]], 0.45);
}

// The stack light on the lid at each end: base, pole, three lamps and a cap.
for (const x of [-192, 192]) {
  const y = -10;
  let z = DESK_TOP + LID_H;
  put({ kind: 'solid', paths: cyl(x, y, 9.5, z, 4, 32, 0.5), tone: 'mid' });
  screws([[x - 6.8, y + 2.4, z + 4], [x + 6.8, y - 2.4, z + 4]], 0.45);
  z += 4;
  put({ kind: 'solid', paths: cyl(x, y, 3, z, 14, 16), tone: 'mid' });
  z += 14;
  put({ kind: 'solid', paths: cyl(x, y, 7.4, z, 33, 32, 0.4), tone: 'hi', inner: [z + 11, z + 22].map((h) => sideArc(x, y, 7.4, h, P, 18)).join('') });
  z += 33;
  put({ kind: 'solid', paths: cyl(x, y, 7.9, z, 3, 32, 0.4), tone: 'mid' });
}

// A cable from the desk's side gland down to the plinth's floor gland.
{
  const side = DESK.x + DESK.w;
  put({ kind: 'solid', paths: cyl(side + 6, 14, 3.2, 0, 2, 20), tone: 'mid' });
  put({ kind: 'wire', from: at([side, 14, 30]), via: [at([side + 6, 14, 24]), at([side + 6, 14, 6])], to: at([side + 6, 14, 2]), tone: 'lo' });
}

// A label plate on the plinth at the front right, with three engraved rules.
put({ kind: 'solid', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  d: [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3 + row * 2.5], [LABEL.x + (row === 1 ? 34 : 50), LABEL.y + 3 + row * 2.5]], 0.8, P)).join(''),
  tone: 'lo',
  free: true,
});
screws([[LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8]]);

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
