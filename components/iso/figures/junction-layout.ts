/**
 * The junction layout board for TrajectoryStitching, drawn with the
 * isometric kit.
 *
 * The object is the explanation: two recorded runs are two model railway
 * tracks laid on one board. Run 1 leaves the robot's platform at the front
 * left and ends at a buffer stop at the front right; run 2 leaves its own
 * buffer stop at the back left and ends at the goal, a platform with a flag
 * at the back right. The runs meet once, on a short shared stretch between a
 * merging turnout and a parting turnout. The car on run 1 is the robot and the
 * one lit part. A lever frame at the front works the parting turnout's points,
 * and the junction signal behind them, through one rod: copying a run leaves
 * the points set for run 1, so the car rolls on to run 1's buffer stop;
 * joining useful pieces throws them, and the car leaves run 1 at the shared
 * stretch and follows run 2 to the goal.
 *
 * World units are millimetres of a model railway: x along the board (start at
 * -x, goal at +x), y across it (toward the viewer is +y), z up. Static paths
 * are built once here; the car and its trail, the switch blades, the signal's
 * arms, the lever and its rod are rebuilt or moved by the live code through the
 * functions at the bottom.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  towardViewer,
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

export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 48;

export type Group = 'static' | 'rod';
export type LiveId = 'trail' | 'blades' | 'lever' | 'signal' | 'car';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'fill'; group: Group; d: string; shade: 0 | 1 | 2 | 3 }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- layout
const BOARD: Plan = { x: -166, y: -86, w: 332, d: 172, r: 10 };
const BOARD_H = 10;
const FOOT_H = 6;

/** Track: rail centres sit half the gauge either side of the route's centre line. */
export const GAUGE = 12;
const RAIL_W = 1.4;
const RAIL_H = 2;
const SLEEPER_H = 1.4;
const RAIL_TOP = SLEEPER_H + RAIL_H;

/** The two recorded runs: lanes either side of the board's middle, meeting on the shared stretch. */
const LANE = 44;
const END_X = 142;
const STRAIGHT_X = 116;
const JOIN_X = 24;
/** The switch blades run from the toe (where the routes part) to the heel; the throw is the blade's swing at the toe. */
export const TOE_X = JOIN_X;
const HEEL_X = JOIN_X + 13;
const THROW = 2.6;
/** Where the tie bar and the point rod cross under the rails, between two timbers. */
const TIE_X = JOIN_X + 4;

export const START: Plane = [-END_X, LANE];
export const OTHER_START: Plane = [-END_X, -LANE];
export const RUN_1_END: Plane = [END_X, LANE];
export const GOAL: Plane = [END_X, -LANE];

// --------------------------------------------------------------- routes
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function straight(from: Plane, to: Plane, step = 2): Plane[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.max(1, Math.round(length / step));
  return Array.from({ length: count + 1 }, (_, i): Plane => [from[0] + ((to[0] - from[0]) * i) / count, from[1] + ((to[1] - from[1]) * i) / count]);
}

/** A reverse curve from `from` to `to`, level at both ends: y follows a smoothstep in x. */
function reverseCurve(from: Plane, to: Plane, count = 60): Plane[] {
  return Array.from({ length: count + 1 }, (_, i): Plane => {
    const t = i / count;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * smoothstep(t)];
  });
}

const join = (...pieces: Plane[][]) => pieces.reduce<Plane[]>((all, piece) => (all.length ? [...all, ...piece.slice(1)] : [...piece]), []);

/** Each run in two halves either side of the shared stretch, from the start end to the far end. */
const RUN_1_IN = join(straight(START, [-STRAIGHT_X, LANE]), reverseCurve([-STRAIGHT_X, LANE], [-JOIN_X, 0]));
const RUN_2_IN = join(straight(OTHER_START, [-STRAIGHT_X, -LANE]), reverseCurve([-STRAIGHT_X, -LANE], [-JOIN_X, 0]));
const SHARED = straight([-JOIN_X, 0], [JOIN_X, 0]);
const RUN_1_OUT = join(reverseCurve([JOIN_X, 0], [STRAIGHT_X, LANE]), straight([STRAIGHT_X, LANE], RUN_1_END));
const RUN_2_OUT = join(reverseCurve([JOIN_X, 0], [STRAIGHT_X, -LANE]), straight([STRAIGHT_X, -LANE], GOAL));

/** The route the car takes under each way of learning: run 1 throughout, or run 1 then run 2's second half. */
export const ROUTES = {
  copy: join(RUN_1_IN, SHARED, RUN_1_OUT),
  join: join(RUN_1_IN, SHARED, RUN_2_OUT),
} as const;

/** A route's centre line at a given x, for the halves that are functions of x. */
function laneY(route: Plane[], x: number): number {
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1]!;
    const [bx, by] = route[i]!;
    if ((x >= ax && x <= bx) || (x <= ax && x >= bx)) return bx === ax ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax);
  }
  return route[route.length - 1]![1];
}

/** Unit tangent of a polyline at each point (central differences). */
function tangents(points: Plane[]): Plane[] {
  return points.map((_, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  });
}

/** The polyline offset sideways: positive toward the route's left, which is +y for a route heading +x. */
function offset(points: Plane[], by: number): Plane[] {
  const t = tangents(points);
  return points.map(([x, y], i) => [x - t[i]![1] * by, y + t[i]![0] * by]);
}

/** The part of a polyline between two x values (the routes here are functions of x). */
function between(points: Plane[], x0: number, x1: number): Plane[] {
  const xs = points.map(([x]) => x);
  const lo = Math.max(Math.min(x0, x1), Math.min(...xs));
  const hi = Math.min(Math.max(x0, x1), Math.max(...xs));
  const inside = points.filter(([x]) => x > lo + 1e-6 && x < hi - 1e-6);
  const at = (x: number): Plane => {
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]!;
      const [bx, by] = points[i]!;
      if ((x >= ax && x <= bx) || (x <= ax && x >= bx)) return [x, bx === ax ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax)];
    }
    return points[points.length - 1]!;
  };
  const out = [at(lo), ...inside, at(hi)];
  return x0 <= x1 ? out : out.reverse();
}

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BOARD.x, BOARD.x + BOARD.w]) for (const py of [BOARD.y, BOARD.y + BOARD.d]) {
  extremes.push([px, py, -BOARD_H - FOOT_H], [px, py, 0]);
}
/** The goal flag's top and the car's roof at the far ends. */
const FLAG: Point3 = [END_X + 2, -LANE - 21, 0];
const FLAG_TOP = 46;
extremes.push([FLAG[0], FLAG[1], FLAG_TOP + 2], [-END_X + 14, LANE, 20]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const [VX, VY] = towardViewer(P);

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group: 'static', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', group: Group = 'static') => put({ kind: 'line', group, d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid', group: Group = 'static') => put({ kind: 'dots', group, points: points.map(at), size, tone });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** Several small solids that never overlap one another, painted as one: the sleepers and timbers. */
function merged(list: SolidPaths[]): SolidPaths {
  const joinField = (pick: (paths: SolidPaths) => string | undefined) => list.map(pick).filter(Boolean).join('');
  return {
    fill: joinField((p) => p.fill),
    outline: joinField((p) => p.outline),
    crease: joinField((p) => p.crease),
    top: joinField((p) => p.top),
    shades: [0, 1, 2, 3].map((shade) => joinField((p) => p.shades[shade])),
    bevel: joinField((p) => p.bevel) || undefined,
  };
}

/** A box of length `length` along `dir` and `width` across it, centred on `c`, from z0 up h. */
function boxAlong(c: Plane, dir: Plane, length: number, width: number, z0: number, h: number, bevel = 0): SolidPaths {
  const [dx, dy] = dir;
  const [nx, ny] = [-dy, dx];
  const l = length / 2;
  const w = width / 2;
  const ringPoints: Plane[] = [
    [c[0] + dx * l + nx * w, c[1] + dy * l + ny * w],
    [c[0] - dx * l + nx * w, c[1] - dy * l + ny * w],
    [c[0] - dx * l - nx * w, c[1] - dy * l - ny * w],
    [c[0] + dx * l - nx * w, c[1] + dy * l - ny * w],
  ];
  return extrude(ringPoints, z0, h, P, { bevel });
}

const oriented = (points: Flat[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[(i + 1) % points.length]!;
    area += ax * by - bx * ay;
  }
  return area < 0 ? [...points].reverse() : points;
};

/**
 * One rail along a centre line: its head (top face), the side that faces the viewer, the end face at
 * the far end when it faces the viewer, and the silhouette round all of them.
 */
export function railOf(centre: Plane[], widths: number | number[] = RAIL_W, z0 = SLEEPER_H, h = RAIL_H): SolidPaths {
  const t0 = tangents(centre);
  const half = (i: number) => (typeof widths === 'number' ? widths : widths[i]!) / 2;
  const left = centre.map(([x, y], i): Plane => [x - t0[i]![1] * half(i), y + t0[i]![0] * half(i)]);
  const right = centre.map(([x, y], i): Plane => [x + t0[i]![1] * half(i), y - t0[i]![0] * half(i)]);
  const top = z0 + h;
  const lt = left.map(([x, y]) => at([x, y, top]));
  const lb = left.map(([x, y]) => at([x, y, z0]));
  const rt = right.map(([x, y]) => at([x, y, top]));
  const rb = right.map(([x, y]) => at([x, y, z0]));
  const n = centre.length - 1;
  const t = tangents(centre);
  const endVisible = t[n]![0] * VX + t[n]![1] * VY > 0;
  const startVisible = -t[0]![0] * VX - t[0]![1] * VY > 0;
  // The side toward +y faces the viewer along every route on this board: the reverse curves head at most
  // about 36 degrees off +x, inside the 48 degrees this camera allows before that side turns away.
  const silhouette = [
    ...rt,
    ...(endVisible ? [rb[n]!] : [lt[n]!]),
    ...[...lb].reverse(),
    ...(startVisible ? [rb[0]!] : [lt[0]!]),
  ];
  const head = pathOf(oriented([...lt, ...[...rt].reverse()]), true);
  const side = pathOf(oriented([...lt, ...[...lb].reverse()]), true);
  const ends: string[] = [];
  if (endVisible) ends.push(pathOf(oriented([lt[n]!, rt[n]!, rb[n]!, lb[n]!]), true));
  if (startVisible) ends.push(pathOf(oriented([lt[0]!, rt[0]!, rb[0]!, lb[0]!]), true));
  const shades = ['', '', '', ''];
  shades[2] = side;
  shades[1] = ends.join('');
  const crease = [pathOf(lt)];
  if (endVisible) crease.push(pathOf([lt[n]!, rt[n]!]), pathOf([lt[n]!, lb[n]!]));
  if (startVisible) crease.push(pathOf([lt[0]!, rt[0]!]), pathOf([lt[0]!, lb[0]!]));
  return { fill: pathOf(silhouette, true), outline: pathOf(silhouette, true), crease: crease.join(''), top: head, shades };
}

// Base: a board on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BOARD.x + 24, BOARD.y + 20],
  [BOARD.x + BOARD.w - 24, BOARD.y + 20],
  [BOARD.x + 24, BOARD.y + BOARD.d - 20],
  [BOARD.x + BOARD.w - 24, BOARD.y + BOARD.d - 20],
])) {
  solid(cyl(x, y, 8.5, -BOARD_H - FOOT_H, 1.6, 28), 'lo');
  solid(cyl(x, y, 6.6, -BOARD_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
}
solid(slab(BOARD, -BOARD_H, BOARD_H, 8, 1.6), 'mid', { inner: sideSeam(BOARD, -BOARD_H + 3, P, 8), innerTone: 'faint' });
line(planOutline(insetPlan(BOARD, 5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BOARD.x + 11, BOARD.y + 11],
    [BOARD.x + BOARD.w - 11, BOARD.y + 11],
    [BOARD.x + 11, BOARD.y + BOARD.d - 11],
    [BOARD.x + BOARD.w - 11, BOARD.y + BOARD.d - 11],
  ];
  line(screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), 'lo');
  dots(screws.map(([x, y]) => [x, y, 0]), 0.55);
}

// A label plate at the front, left of the lever frame, with three engraved rules and two screws.
const LABEL: Plan = { x: -76, y: 64, w: 50, d: 13, r: 2 };
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.8), 0.8, P), 'faint');
line(
  [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.8 + row * 3], [LABEL.x + (row === 1 ? 32 : 44), LABEL.y + 3.8 + row * 3]], 0.8, P)).join(''),
  'lo',
  true,
);
dots([[LABEL.x + 3.8, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.8, LABEL.y + LABEL.d / 2, 0.8]], 0.5);

// The ballast bed under both tracks: one shape round the whole layout, its two arms meeting at each turnout.
const BALLAST = 12.5;
const RUN_1 = ROUTES.copy;
const RUN_2 = join(RUN_2_IN, SHARED, RUN_2_OUT);
{
  const parting = (() => {
    let x = JOIN_X;
    while (laneY(offset(RUN_1_OUT, -BALLAST), x) < 0 && x < 110) x += 0.05;
    return x;
  })();
  const r1f = offset(RUN_1, BALLAST);
  const r1b = offset(RUN_1, -BALLAST);
  const r2f = offset(RUN_2, BALLAST);
  const r2b = offset(RUN_2, -BALLAST);
  // Each edge runs 6 past the rail ends, under the buffer stops; the inner edges stop where the arms part.
  const out = (points: Plane[], left: boolean, right: boolean): Plane[] => {
    const [x0, y0] = points[0]!;
    const [x1, y1] = points[points.length - 1]!;
    return [...(left ? [[x0 - 6, y0] as Plane] : []), ...points, ...(right ? [[x1 + 6, y1] as Plane] : [])];
  };
  const outline: Plane[] = [
    ...out(between(r1f, -END_X, END_X), true, true),
    ...out(between(r1b, parting, END_X), false, true).reverse(),
    ...out(between(r2f, parting, END_X), false, true).slice(1),
    ...out(between(r2b, -END_X, END_X), true, true).reverse(),
    ...out(between(r2f, -END_X, -parting), true, false),
    ...out(between(r1b, -END_X, -parting), true, false).reverse().slice(1),
  ];
  const d = onTop(outline, 0, P, true);
  put({ kind: 'fill', group: 'static', d, shade: 3 });
  line(d, 'faint');
}

// Sleepers. Where the two routes run close (the shared stretch and both turnouts), long timbers at right
// angles to the board carry both tracks; elsewhere each route has its own sleepers at right angles to it.
const TIMBER_STEP = 7;
const TIMBER_COUNT = 8;
const TIMBER_EDGE = TIMBER_STEP * TIMBER_COUNT;
const SLEEPER_STEP = 8;
const SLEEPER_LEN = 20;
const SLEEPER_W = 3.8;
{
  const list: SolidPaths[] = [];
  for (let k = 0; k < TIMBER_COUNT; k++) for (const sign of [-1, 1]) {
    const x = sign * (TIMBER_STEP / 2 + TIMBER_STEP * k);
    const spread = Math.abs(x) <= JOIN_X ? 0 : laneY(x > 0 ? RUN_1_OUT : RUN_1_IN, x);
    const y0 = -spread - SLEEPER_LEN / 2;
    const y1 = spread + SLEEPER_LEN / 2;
    list.push(boxAlong([x, (y0 + y1) / 2], [0, 1], y1 - y0, SLEEPER_W, 0, SLEEPER_H));
  }
  const along = (route: Plane[], fromX: number, toX: number) => {
    const piece = between(route, fromX, toX);
    const t = tangents(piece);
    let length = 0;
    let next = SLEEPER_STEP / 2;
    for (let i = 1; i < piece.length; i++) {
      const [ax, ay] = piece[i - 1]!;
      const [bx, by] = piece[i]!;
      const seg = Math.hypot(bx - ax, by - ay);
      while (next <= length + seg) {
        const f = (next - length) / seg;
        const c: Plane = [ax + (bx - ax) * f, ay + (by - ay) * f];
        const [tx, ty] = t[i]!;
        list.push(boxAlong(c, [-ty, tx], SLEEPER_LEN, SLEEPER_W, 0, SLEEPER_H));
        next += SLEEPER_STEP;
      }
      length += seg;
    }
  };
  along(RUN_1_IN, -END_X + 2, -TIMBER_EDGE);
  along(RUN_2_IN, -END_X + 2, -TIMBER_EDGE);
  along(RUN_1_OUT, TIMBER_EDGE, END_X - 2);
  along(RUN_2_OUT, TIMBER_EDGE, END_X - 2);
  solid(merged(list), 'lo', { crease: 'none' });
}

// The car's route so far, drawn on the sleepers between the rails (live).
put({ kind: 'live', group: 'static', id: 'trail' });

// Under the rails at each turnout, between two timbers: the tie bars that join each pair of blades.
const FRAME: Plan = { x: TIE_X - 9, y: 58, w: 26, d: 16, r: 2 };
const LEVER_X = TIE_X;
const ROD_Z = 0.4;
const ROD_H = 1;
const TIE_HALF = GAUGE / 2 + 3.4;
/** The junction signal stands behind the parting turnout; the same rod works the points and its arms. */
const SIGNAL: Plane = [TIE_X, -23];
const SIGNAL_BRACKET = 36;
const SIGNAL_TOP = 48;
const SIGNAL_DOLL = 7.5;
// The merging turnout is sprung, set for run 1, the way the car arrives: a fixed tie bar and a spring box.
const SPRING_BOX: Plan = { x: -TIE_X - 3, y: TIE_HALF + 1.6, w: 6, d: 7, r: 1 };
solid(boxAlong([-TIE_X, 0.8], [0, 1], 2 * TIE_HALF + 1.6, 1.6, 0.3, 1.0), 'mid');
solid(slab(SPRING_BOX, 0, 4, 3, 0.4), 'mid', { inner: sideSeam(SPRING_BOX, 1.6, P, 3), innerTone: 'faint' });
dots([[SPRING_BOX.x + 1.6, SPRING_BOX.y + SPRING_BOX.d - 1.6, 4], [SPRING_BOX.x + SPRING_BOX.w - 1.6, SPRING_BOX.y + SPRING_BOX.d - 1.6, 4]], 0.45);
// The parting turnout's rod rests on stools on its way from the signal, under the track, to the lever frame.
for (const y of [-15, 24, 36, 48]) solid(slab({ x: TIE_X - 2, y: y - 1.2, w: 4, d: 2.4, r: 0.6 }, 0, ROD_Z, 2), 'lo', { crease: 'none' });
// The parting turnout's tie bar and point rod move together with the blades (live group).
put({ kind: 'solid', group: 'rod', paths: boxAlong([TIE_X, 0], [0, 1], 2 * TIE_HALF, 1.6, 0.3, 1.0), tone: 'mid' });
put({ kind: 'solid', group: 'rod', paths: barBetween([TIE_X, SIGNAL[1] + 2, ROD_Z + ROD_H / 2], [TIE_X, FRAME.y + 3, ROD_Z + ROD_H / 2], [1, 0, 0], 1.2, ROD_H, P), tone: 'mid' });

// The frogs: a cast plate where the inner rails cross, and the check rails opposite, inside the stock rails.
const crossX = (() => {
  let x = JOIN_X;
  while (2 * laneY(RUN_1_OUT, x) < GAUGE && x < 80) x += 0.25;
  return x;
})();
for (const side of [-1, 1] as const) solid(boxAlong([side * crossX, 0], [1, 0], 14, 5.2, SLEEPER_H, 0.5), 'mid');

// The rails. Run 1's front rail and run 2's back rail are continuous stock rails through both turnouts;
// the inner rails start at the blades' heels, and the shared stretch carries both routes on one track.
// Every rail is built heading +x, so its +y side is the one that faces the viewer.
const FRONT_RAIL = join(offset(RUN_1_IN, GAUGE / 2), offset(SHARED, GAUGE / 2), offset(RUN_1_OUT, GAUGE / 2));
const BACK_RAIL = join(offset(RUN_2_IN, -GAUGE / 2), offset(SHARED, -GAUGE / 2), offset(RUN_2_OUT, -GAUGE / 2));
/** Where a blade's toe sits: against its stock rail (closed) or a flangeway off it (open). */
export const TOE_CLOSED = GAUGE / 2 - 1.05;
const TOE_WIDTH = 0.5;
/**
 * An inner rail of a turnout as one piece: the closure rail from the heel on, and the switch blade from the
 * heel to its toe, planed thinner toward the toe. `toward` is +1 for a rail that ends at its toe (the merging
 * turnout, seen heading +x) and -1 for one that starts there.
 */
function innerRail(closure: Plane[], toe: Plane, toward: 1 | -1): { centre: Plane[]; widths: number[] } {
  const heel = toward > 0 ? closure[closure.length - 1]! : closure[0]!;
  const blade = straight(toward > 0 ? heel : toe, toward > 0 ? toe : heel, 1);
  const centre = toward > 0 ? [...closure, ...blade.slice(1)] : [...blade, ...closure.slice(1)];
  const bladeLength = Math.hypot(heel[0] - toe[0], heel[1] - toe[1]);
  const widths = centre.map(([x, y]) => {
    const fromToe = Math.hypot(x - toe[0], y - toe[1]);
    return fromToe >= bladeLength ? RAIL_W : TOE_WIDTH + (RAIL_W - TOE_WIDTH) * Math.sqrt(fromToe / bladeLength);
  });
  return { centre, widths };
}
const RUN_1_IN_BACK = innerRail(between(offset(RUN_1_IN, -GAUGE / 2), -END_X, -HEEL_X), [-TOE_X, -TOE_CLOSED], 1);
const RUN_2_IN_FRONT = innerRail(between(offset(RUN_2_IN, GAUGE / 2), -END_X, -HEEL_X), [-TOE_X, TOE_CLOSED - THROW], 1);
const RUN_1_OUT_CLOSURE = between(offset(RUN_1_OUT, -GAUGE / 2), HEEL_X, END_X);
const RUN_2_OUT_CLOSURE = between(offset(RUN_2_OUT, GAUGE / 2), HEEL_X, END_X);
/** Check rails beside each stock rail, opposite the frog. */
const checkRail = (route: Plane[], side: 1 | -1, cx: number) => between(offset(route, side * (GAUGE / 2 - 1.9)), cx - 8, cx + 8);
{
  // Painted back to front: run 2's back stock rail and check rails, the inner rails with their blades (the
  // merging turnout's set for run 1, the way the car arrives; the parting turnout's live), then run 1's.
  solid(railOf(BACK_RAIL), 'mid');
  for (const side of [-1, 1] as const) solid(railOf(checkRail(side < 0 ? RUN_2_IN : RUN_2_OUT, -1, side * crossX)), 'mid');
  solid(railOf(RUN_2_IN_FRONT.centre, RUN_2_IN_FRONT.widths), 'mid');
  solid(railOf(RUN_1_IN_BACK.centre, RUN_1_IN_BACK.widths), 'mid');
  put({ kind: 'live', group: 'static', id: 'blades' });
  for (const side of [-1, 1] as const) solid(railOf(checkRail(side < 0 ? RUN_1_IN : RUN_1_OUT, 1, side * crossX)), 'mid');
  solid(railOf(FRONT_RAIL), 'mid');
}

// The buffer stops: two raked posts, a beam and two sprung buffers that face the track.
function bufferStop(x: number, y: number, facing: 1 | -1) {
  const back = x - facing * 4;
  for (const side of byDepth([[back, y - GAUGE / 2], [back, y + GAUGE / 2]])) {
    solid(barBetween([side[0] - facing * 8, side[1], 0], [side[0], side[1], 10.8], [0, 1, 0], 1.6, 1.6, P), 'mid');
    solid(slab({ x: side[0] - 1.1, y: side[1] - 1.1, w: 2.2, d: 2.2, r: 0.4 }, SLEEPER_H, 10.8 - SLEEPER_H, 2), 'mid');
  }
  solid(slab({ x: back - 1.8, y: y - 11, w: 3.6, d: 22, r: 0.8 }, 8.4, 3.8, 3, 0.4), 'mid');
  dots([[back, y - 9, 12.2], [back, y + 9, 12.2]], 0.45);
  for (const side of byDepth([[x, y - GAUGE / 2], [x, y + GAUGE / 2]])) {
    solid(discAlong([back + facing * 1.8, side[1], 10.3], [facing, 0, 0], 1.3, 2.4, P, 18), 'mid');
    solid(discAlong([back + facing * 4.2, side[1], 10.3], [facing, 0, 0], 2.6, 0.8, P, 24), 'hi');
  }
}

// A platform: a raised deck with its coping line and two screws.
const PLATFORM_A: Plan = { x: -152, y: LANE + 9, w: 66, d: 15, r: 1.6 };
const PLATFORM_GOAL: Plan = { x: 84, y: -LANE - 25, w: 66, d: 16, r: 1.6 };
function platform(plan: Plan, edgeY: number) {
  solid(slab(plan, 0, 6, 3, 0.5), 'mid', { inner: sideSeam(plan, 2.2, P, 3), innerTone: 'faint' });
  line(onTop([[plan.x, edgeY], [plan.x + plan.w, edgeY]], 6, P), 'lo');
  dots([[plan.x + 3.5, plan.y + plan.d / 2, 6], [plan.x + plan.w - 3.5, plan.y + plan.d / 2, 6]], 0.45);
}

// Everything the car can pass in front of, back to front: run 2's platform and buffer stop, the junction
// signal, the goal platform and its flag, run 1's start buffer stop.
const PLATFORM_B: Plan = { x: -152, y: -LANE - 25, w: 52, d: 16, r: 1.6 };
platform(PLATFORM_B, PLATFORM_B.y + PLATFORM_B.d - 2.2);
bufferStop(OTHER_START[0], OTHER_START[1], 1);
{
  // The signal: a base over the rod's end, a post, a bracket with two dolls, one arm for each route (live).
  const [sx, sy] = SIGNAL;
  const base: Plan = { x: sx - 4, y: sy - 4, w: 8, d: 8, r: 1.2 };
  solid(slab(base, 0, 3.4, 3, 0.4), 'mid', { inner: sideSeam(base, 1.4, P, 3), innerTone: 'faint' });
  dots([[base.x + 1.5, base.y + 1.5, 3.4], [base.x + base.w - 1.5, base.y + base.d - 1.5, 3.4]], 0.45);
  solid(cyl(sx, sy, 1.6, 3.4, SIGNAL_BRACKET - 3.4, 18), 'mid', { inner: sideArc(sx, sy, 1.6, 14, P, 14), innerTone: 'faint' });
  solid(slab({ x: sx - 1, y: sy - SIGNAL_DOLL - 2, w: 2, d: 2 * SIGNAL_DOLL + 4, r: 0.5 }, SIGNAL_BRACKET, 1.6, 2), 'mid');
  for (const y of byDepth([[sx, sy - SIGNAL_DOLL], [sx, sy + SIGNAL_DOLL]])) {
    solid(cyl(y[0], y[1], 1, SIGNAL_BRACKET + 1.6, SIGNAL_TOP - SIGNAL_BRACKET - 1.6, 14), 'mid');
    solid(cyl(y[0], y[1], 1.5, SIGNAL_TOP, 1.2, 16), 'mid');
  }
  put({ kind: 'live', group: 'static', id: 'signal' });
}
platform(PLATFORM_GOAL, PLATFORM_GOAL.y + PLATFORM_GOAL.d - 2.2);
{
  const [fx, fy] = FLAG;
  solid(cyl(fx, fy, 3.6, 6, 1.6, 24), 'mid');
  solid(cyl(fx, fy, 1.1, 7.6, FLAG_TOP - 7.6, 16), 'mid');
  solid(cyl(fx, fy, 1.7, FLAG_TOP, 1.2, 16), 'mid');
  // The flag: a plate in the x-z plane, hung from the pole toward the track's end.
  solid(plateIn([fx - 1.1, fy, FLAG_TOP - 1], [-1, 0, 0], [0, 0, -1], [[0, 0], [16, 0], [16, 10], [0, 10]], 0.6, P), 'hi');
}
bufferStop(START[0], START[1], 1);

// The car (live), then everything that stands in front of its path: the robot's platform with its lamp post,
// the buffer stops at both far ends and the lever frame with its levers.
put({ kind: 'live', group: 'static', id: 'car' });
platform(PLATFORM_A, PLATFORM_A.y + 2.2);
{
  const [lx, ly] = [PLATFORM_A.x + 52, PLATFORM_A.y + PLATFORM_A.d - 4];
  solid(cyl(lx, ly, 2.2, 6, 1.2, 20), 'mid');
  solid(cyl(lx, ly, 0.8, 7.2, 20, 14), 'mid');
  solid(cyl(lx, ly, 2.4, 27.2, 1.4, 20, 0.3), 'mid');
}
bufferStop(GOAL[0], GOAL[1], -1);
bufferStop(RUN_1_END[0], RUN_1_END[1], -1);
{
  solid(slab(FRAME, 0, 7, 4, 0.6), 'mid', { inner: sideSeam(FRAME, 2.6, P, 4), innerTone: 'faint' });
  dots(
    [
      [FRAME.x + 2.6, FRAME.y + 2.6, 7],
      [FRAME.x + FRAME.w - 2.6, FRAME.y + 2.6, 7],
      [FRAME.x + 2.6, FRAME.y + FRAME.d - 2.6, 7],
      [FRAME.x + FRAME.w - 2.6, FRAME.y + FRAME.d - 2.6, 7],
    ],
    0.45,
  );
  line(planOutline({ x: LEVER_X - 1.2, y: FRAME.y + 3.2, w: 2.4, d: FRAME.d - 6.4, r: 1 }, 7, P, 3), 'lo');
  put({ kind: 'live', group: 'static', id: 'lever' });
  // The quadrant beside the slot: a notched plate the lever's catch drops into at each end of its throw.
  const arc: Array<[number, number]> = [];
  for (let k = 0; k <= 12; k++) {
    const a = (-22 + (44 * k) / 12) * (Math.PI / 180);
    arc.push([Math.sin(a) * 15, Math.cos(a) * 15 - 11]);
  }
  solid(plateIn([LEVER_X + 1.6, FRAME.y + FRAME.d / 2, 11], [0, 1, 0], [0, 0, 1], [[-5.6, -4], [5.6, -4], ...arc.reverse()], 1, P), 'mid');
  dots([-1, 1].map((side): Point3 => [LEVER_X + 2.6, FRAME.y + FRAME.d / 2 + side * 3.2, 7 + 1.2]), 0.45);
}

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------------- live parts
/**
 * Where the parting turnout's two blade toes sit across the track for a throw from 0 to 1. Set for run 1,
 * run 1's back blade lies closed against the back stock rail and run 2's front blade stands open; thrown,
 * the tie bar carries both a flangeway forward, so run 2's front blade closes and run 1's opens.
 */
export const toesAt = (throwShare: number) => ({ back: -TOE_CLOSED + THROW * throwShare, front: TOE_CLOSED - THROW + THROW * throwShare });

/** The parting turnout's inner rails with their blades, for a throw from 0 (set for run 1) to 1 (set for run 2). */
export function bladesAt(throwShare: number): SolidPaths[] {
  const toes = toesAt(throwShare);
  const back = innerRail(RUN_1_OUT_CLOSURE, [TOE_X, toes.back], -1);
  const front = innerRail(RUN_2_OUT_CLOSURE, [TOE_X, toes.front], -1);
  return [railOf(front.centre, front.widths), railOf(back.centre, back.widths)];
}

/**
 * The junction signal's two arms, one per route, on dolls either side of the post: an arm drops 40 degrees
 * to clear its route. Run 1's arm (the front doll) clears while the points are set for run 1, run 2's arm
 * (the back doll) when they are thrown.
 */
export function signalAt(throwShare: number): SolidPaths[] {
  const [sx, sy] = SIGNAL;
  const arm = (dollY: number, clear: number) => {
    const a = 40 * clear * (Math.PI / 180);
    const pivot: Point3 = [sx + 0.9, dollY, SIGNAL_TOP - 2.4];
    const out: Point3 = [0, -Math.cos(a), -Math.sin(a)];
    const tip: Point3 = [pivot[0], pivot[1] + out[1] * 8, pivot[2] + out[2] * 8];
    return barBetween(pivot, tip, [0, -out[2], out[1]], 2.4, 0.6, P);
  };
  return [arm(sy - SIGNAL_DOLL, throwShare), arm(sy + SIGNAL_DOLL, 1 - throwShare)];
}

/** Where the trail starts: the far edge of run 1's first sleeper, so it begins on a part. */
export const TRAIL_FROM = -END_X + 2 + SLEEPER_STEP / 2 - SLEEPER_W / 2;
/** The car's route from the first sleeper to the car's centre, `along` route units past the route's start. */
export function trailTo(route: readonly Plane[], along: number): string {
  const points: Plane[] = [[TRAIL_FROM, route[0]![1]]];
  let left = along;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1]!;
    const [bx, by] = route[i]!;
    const seg = Math.hypot(bx - ax, by - ay);
    if (left <= seg) {
      const f = seg ? left / seg : 0;
      points.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
      break;
    }
    points.push([bx, by]);
    left -= seg;
  }
  return onTop(points, SLEEPER_H + 0.05, P);
}

/** The screen offset that moves the parting turnout's point rod with the blades. */
export const rodAt = (throwShare: number) => translateAlong(P, [0, THROW * throwShare, 0]);

/** The lever: it leans back with the points set for run 1, and forward, toward the viewer, when thrown. */
export function leverAt(throwShare: number) {
  const a = (-16 + 32 * throwShare) * (Math.PI / 180);
  const pivot: Point3 = [LEVER_X, FRAME.y + FRAME.d / 2, 4];
  const up: Point3 = [0, Math.sin(a), Math.cos(a)];
  const point = (r: number): Point3 => [LEVER_X, pivot[1] + up[1] * r, pivot[2] + up[2] * r];
  return {
    bar: barBetween(pivot, point(25), [1, 0, 0], 1.8, 1.2, P),
    catch: barBetween(point(12), point(19), [1, 0, 0], 2.8, 0.6, P),
    grip: discAlong(point(20.5), up, 1.5, 5.6, P, 18),
  };
}

// The car. Its reference point is its centre on the track; it is rebuilt each frame from where it is and
// which way it heads.
const CAR = { length: 32, width: 16, wheelR: 3.8, frameZ: RAIL_TOP + 4.1, frameH: 2.8, bodyH: 11, roofH: 1.6 };

export interface CarPaths {
  wheels: SolidPaths[];
  rearBuffers: SolidPaths[];
  frame: SolidPaths;
  body: SolidPaths;
  windows: string;
  roof: SolidPaths;
  frontBuffers: SolidPaths[];
  lamp: SolidPaths;
}

export function carAt(centre: Plane, heading: Plane): CarPaths {
  const [dx, dy] = heading;
  const [nx, ny] = [-dy, dx];
  const along = (s: number, side: number): Plane => [centre[0] + dx * s + nx * side, centre[1] + dy * s + ny * side];
  const facing = dx * VX + dy * VY;
  // Wheels: four discs on the rails, far side first.
  const wheelCentres: Point3[] = [];
  for (const s of [-8.5, 8.5]) for (const side of [-GAUGE / 2, GAUGE / 2]) {
    const [x, y] = along(s, side);
    wheelCentres.push([x, y, RAIL_TOP + CAR.wheelR]);
  }
  wheelCentres.sort((a, b) => depthOf(a, P) - depthOf(b, P));
  const wheels = wheelCentres.map(([x, y, z]) => {
    const out: Point3 = [nx, ny, 0];
    const sign = (x - centre[0]) * nx + (y - centre[1]) * ny > 0 ? 1 : -1;
    return discAlong([x - out[0] * sign * 0.8, y - out[1] * sign * 0.8, z], [out[0] * sign, out[1] * sign, 0], CAR.wheelR, 1.6, P, 24);
  });
  const buffer = (s: number, side: number, dir: 1 | -1) => {
    const [x, y] = along(s, side);
    return discAlong([x, y, CAR.frameZ + CAR.frameH / 2], [dx * dir, dy * dir, 0], 1.3, 3, P, 16);
  };
  const front = [buffer(CAR.length / 2, -GAUGE / 2, 1), buffer(CAR.length / 2, GAUGE / 2, 1)];
  const rear = [buffer(-CAR.length / 2, -GAUGE / 2, -1), buffer(-CAR.length / 2, GAUGE / 2, -1)];
  const ahead = facing > 0;
  const frame = boxAlong(centre, heading, CAR.length, CAR.width, CAR.frameZ, CAR.frameH, 0.4);
  const bodyZ = CAR.frameZ + CAR.frameH;
  const body = boxAlong(along(2, 0), heading, CAR.length - 8, CAR.width - 3, bodyZ, CAR.bodyH, 0.5);
  const roof = boxAlong(along(2, 0), heading, CAR.length - 5, CAR.width - 0.8, bodyZ + CAR.bodyH, CAR.roofH, 0.4);
  // Windows: a row of closed slots along the side that faces the viewer.
  const sideSign = nx * VX + ny * VY > 0 ? 1 : -1;
  const sideY = (CAR.width - 3) / 2;
  const windows: string[] = [];
  for (const s of [-7, 0.5, 8]) {
    const quad: Point3[] = [
      [...along(s - 2.6, sideSign * sideY), bodyZ + 4.6] as Point3,
      [...along(s + 2.6, sideSign * sideY), bodyZ + 4.6] as Point3,
      [...along(s + 2.6, sideSign * sideY), bodyZ + 9] as Point3,
      [...along(s - 2.6, sideSign * sideY), bodyZ + 9] as Point3,
    ];
    windows.push(pathOf(quad.map(at), true));
  }
  const [lx, ly] = along(2 + (CAR.length - 8) / 2, 0);
  const lamp = discAlong([lx, ly, bodyZ + 6.6], [dx, dy, 0], 1.9, 1, P, 20);
  return {
    wheels,
    rearBuffers: ahead ? rear : front,
    frame,
    body,
    windows: windows.join(''),
    roof,
    frontBuffers: ahead ? front : rear,
    lamp,
  };
}

/** Where the car's centre is when it stands at each end: a short gap from the buffer stop. */
export const CAR_END_GAP = CAR.length / 2 + 6.6;
