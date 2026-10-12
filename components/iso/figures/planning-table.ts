/**
 * The planning table for JepaPlanning, drawn with the isometric kit.
 *
 * The object is the explanation: instead of imagining full video, the robot
 * compares compact summaries. Here a summary is a point on a ground steel
 * table: the "now" picture's summary is the ring at the left, the goal
 * picture's summary is the target at the right, and both pictures stand on
 * easels in front. A probe head, carried on an arm from a gantry bridge,
 * stands on the current summary. At every planning step it sets out one
 * feeler per candidate move, each ending on a pin; the feeler and pin that
 * land closest to the target (the one lit part) are the move it keeps.
 * "Plan next move" carries the head along the lit feeler, and a prick mark
 * records where it really ended up.
 *
 * World units are about a millimetre. The toy latent point (u, v) from
 * lib/jepa-planning.ts is turned so the start-to-pick direction runs along x
 * (a rotation keeps every distance) and scaled uniformly by SCALE, so every
 * distance on the table is the toy distance times SCALE. The kept pin sits at
 * the model's predicted landing. The other pins are spread out for display
 * by `fanOf`: each keeps its side of the goal direction and its order by
 * distance to the goal, and all sit at the same predicted reach, so the kept
 * pin is still the one closest to the target. The bridge carries the head
 * from behind (the -x side), where no candidate move ever points, so the arm
 * never covers a pin.
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
  planOutline,
  radialTicks,
  ring,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  topTicks,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

export const WIDTH = 640;
export const HEIGHT = 450;
export const AZIMUTH = 76;
/** Raised above the kit's 30 degrees to look down onto the table, where the planning happens. */
export const ELEVATION = 38;

/**
 * World units per unit of the toy latent plane. The plane is turned so the start-to-pick direction runs along
 * the table's x axis (a rotation keeps every distance; the toy's axes mean nothing), then centred on the table.
 */
export const SCALE = 300;
const ORIGIN = { x: 0.16, y: 0.74 };
const TURN = Math.atan2(0.46, 0.67);
/** The table's extent in the turned plane: every state, the target and every fan the figure can show. */
const LATENT = { x0: -0.12, x1: 0.86, y0: -0.34, y1: 0.5 };
const CENTRE = { x: (LATENT.x0 + LATENT.x1) / 2, y: (LATENT.y0 + LATENT.y1) / 2 };

type Point = { x: number; y: number };
/** The turned plane, before scaling: start at the origin, pick along +x. */
const turned = (p: Point): Plane => {
  const dx = p.x - ORIGIN.x;
  const dy = p.y - ORIGIN.y;
  const c = Math.cos(TURN);
  const s = Math.sin(TURN);
  return [c * dx - s * dy, s * dx + c * dy];
};
/** Where a toy latent point sits on the table. */
export const toTable = (p: Point): Plane => {
  const [u, v] = turned(p);
  return [(u - CENTRE.x) * SCALE, (v - CENTRE.y) * SCALE];
};
/** The inverse of `toTable`, for a point on the table. */
const fromTable = ([x, y]: Plane): Point => {
  const u = x / SCALE + CENTRE.x;
  const v = y / SCALE + CENTRE.y;
  const c = Math.cos(TURN);
  const s = Math.sin(TURN);
  return { x: ORIGIN.x + c * u + s * v, y: ORIGIN.y - s * u + c * v };
};

/** The widest a displayed fan opens either side of the goal direction. */
export const FAN_SPREAD = (100 * Math.PI) / 180;
/** The clear angle left between the kept pin and the next, so the kept pin reads as closest from any side. */
export const FAN_GAP = (20 * Math.PI) / 180;

/**
 * The displayed fan for one planning step, in latent units. The kept candidate is drawn exactly where the model
 * predicts it lands. Every other candidate keeps its side of the goal direction and the reach the model gives all
 * of them, and is spread evenly from FAN_GAP past the kept move's angle out to FAN_SPREAD, in its order of angle
 * from the goal: a display spread so every pin stands clear. For moves of one reach, the distance to the goal
 * grows with that angle, so the kept pin stays the one closest to the goal.
 */
export function fanOf(state: Point, goal: Point, endpoints: Point[], kept: number): Point[] {
  const toGoal = Math.atan2(goal.y - state.y, goal.x - state.x);
  const reach = Math.hypot(endpoints[kept]!.x - state.x, endpoints[kept]!.y - state.y);
  const angleOf = (p: Point) => {
    let a = Math.atan2(p.y - state.y, p.x - state.x) - toGoal;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  const keptAngle = Math.abs(angleOf(endpoints[kept]!));
  const shown: Point[] = endpoints.map((p) => ({ ...p }));
  for (const side of [1, -1]) {
    const members = endpoints
      .map((p, index) => ({ index, angle: angleOf(p) }))
      .filter(({ index, angle }) => index !== kept && (angle > 0 || (angle === 0 && index % 2 === 0) ? 1 : -1) === side)
      .sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle) || a.index - b.index);
    const from = keptAngle + FAN_GAP;
    members.forEach(({ index }, rank) => {
      const a = toGoal + side * (from + ((FAN_SPREAD - from) * rank) / Math.max(1, members.length - 1));
      shown[index] = { x: state.x + reach * Math.cos(a), y: state.y + reach * Math.sin(a) };
    });
  }
  return shown;
}

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone; role?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; role?: string }
  | { kind: 'fill'; d: string; shade: 0 | 1 | 2 | 3 | 'paper' | 'top'; role?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone; role?: string }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone; role?: string }
  | { kind: 'group'; role: string; parts: Part[]; data?: Record<string, string> }
  | { kind: 'slot'; id: 'card-now' | 'card-goal' };

/** The pictures on the easels, in the old figure's picture units (64 by 48). */
export const PICTURE = { w: 64, h: 48 };

// ---------------------------------------------------------------- layout
const TABLE: Plan = {
  x: (LATENT.x0 - CENTRE.x) * SCALE,
  y: (LATENT.y0 - CENTRE.y) * SCALE,
  w: (LATENT.x1 - LATENT.x0) * SCALE,
  d: (LATENT.y1 - LATENT.y0) * SCALE,
  r: 3,
};
const TABLE_H = 2.4;
/** The arm from the bridge to the probe head: longer than any feeler reaches back, so the bridge stays clear. */
export const ARM = 52;
/**
 * Where the probe head can stand, in x: every state from the second planning step on, over both goals and every
 * option count (the figure never shows an earlier one). The bridge rides ARM behind it, so the rails run from just
 * past the bridge's leftmost stand to just past its rightmost.
 */
export const HEAD_X = { min: -101.1, max: 127.4 };
/** Rails along x, behind and in front of the table, on end posts; the bridge rides them along y. */
const RAIL_BACK = TABLE.y - 11;
const RAIL_FRONT = TABLE.y + TABLE.d + 11;
export const RAIL_X0 = HEAD_X.min - ARM - 16;
export const RAIL_X1 = HEAD_X.max - ARM + 16;
const RAIL_Z = 5;
const RAIL_H = 3.4;
const BEAM_Z = RAIL_Z + RAIL_H + 3.2;
const BEAM_H = 5;
const ARM_Z = 7.4;
const ARM_T = 3;
const HUB_R = 5.6;
const BASE: Plan = { x: RAIL_X0 - 12, y: RAIL_BACK - 14, w: TABLE.x + TABLE.w + 12 - RAIL_X0 + 12, d: RAIL_FRONT - RAIL_BACK + 80, r: 10 };
const BASE_H = 9;
const FOOT_H = 5;
/** The front row: a pin tray, the "now" easel, the controller and the goal easel. */
const ROW_Y = RAIL_FRONT + 38;
const EASEL_SCALE = 0.86;
const EASEL_W = PICTURE.w * EASEL_SCALE;
const EASEL_H = PICTURE.h * EASEL_SCALE;
const EASEL = { now: { x: TABLE.x + 30, y: ROW_Y }, goal: { x: TABLE.x + TABLE.w - 100, y: ROW_Y } };
const EASEL_Z = 6;
const CONTROL: Plan = { x: (EASEL.now.x + EASEL.goal.x) / 2 - 40, y: ROW_Y - 18, w: 80, d: 34, r: 3 };
const DIAL = { x: CONTROL.x + 22, y: CONTROL.y + 17, r: 11 };
const SELECT = { x: CONTROL.x + 56, y: CONTROL.y + 15, r: 6.4 };
const TRAY: Plan = { x: TABLE.x + TABLE.w - 46, y: ROW_Y - 22, w: 44, d: 40, r: 3 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (const which of ['now', 'goal'] as const) extremes.push([EASEL[which].x, EASEL[which].y, EASEL_Z + 4 + EASEL_H]);
extremes.push([RAIL_X0, RAIL_BACK, BEAM_Z + BEAM_H + 10]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 8, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);

/** The transform that lays a picture's units (x right, y down) on an easel card's face. */
export const easelMatrix = (which: 'now' | 'goal') =>
  `${sideMatrix([EASEL[which].x - EASEL_W / 2, EASEL[which].y + 0.8], EASEL_Z + 4 + EASEL_H, P, 'left')} scale(${EASEL_SCALE})`;

/** The screen offset of a world move, as a CSS translate in user units, so a moving group can ease there. */
export function cssMove(dx: number, dy: number): string {
  const [x, y] = [iso([dx, dy, 0], P), iso([0, 0, 0], P)];
  return `translate(${(x[0] - y[0]).toFixed(2)}px, ${(x[1] - y[1]).toFixed(2)}px)`;
}

/** The printed arc a knob's scale hangs from: 270 degrees, the same span as its ticks. */
function arcOnTop(cx: number, cy: number, r: number, z: number): string {
  const points: Plane[] = Array.from({ length: 37 }, (_, i) => {
    const a = -0.75 * Math.PI + (i / 36) * 1.5 * Math.PI;
    return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  });
  return onTop(points, z, P);
}

// ---------------------------------------------------------------- static parts
const back: Part[] = [];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));

// The base: a plate on four turned feet with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 26, BASE.y + 22],
  [BASE.x + BASE.w - 26, BASE.y + 22],
  [BASE.x + 26, BASE.y + BASE.d - 22],
  [BASE.x + BASE.w - 26, BASE.y + BASE.d - 22],
])) {
  back.push({ kind: 'solid', paths: cyl(x, y, 8.5, -BASE_H - FOOT_H, 1.6), tone: 'lo' });
  back.push({ kind: 'solid', paths: cyl(x, y, 6.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), tone: 'mid' });
}
back.push({ kind: 'solid', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.6), tone: 'mid', inner: sideSeam(BASE, -BASE_H + 3, P, 8) });
back.push({ kind: 'line', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
{
  const screws: Plane[] = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  back.push({ kind: 'line', d: screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  back.push({ kind: 'dots', points: screws.map(([x, y]) => at([x, y, 0])), size: 0.55 });
}

/** A rail end post with its foot plate and the end block the rail sits in. */
function postParts(x: number, y: number): Part[] {
  return [
    { kind: 'solid', paths: slab({ x: x - 7, y: y - 7, w: 14, d: 14, r: 2 }, 0, 2, 3, 0.4), tone: 'lo' },
    { kind: 'dots', points: [[x - 4.4, y - 4.4], [x + 4.4, y + 4.4]].map(([px, py]) => at([px!, py!, 2])), size: 0.45 },
    { kind: 'solid', paths: cyl(x, y, 3.2, 2, RAIL_Z - 2.4, 22), tone: 'mid' },
    { kind: 'solid', paths: slab({ x: x - 5.4, y: y - 5.4, w: 10.8, d: 10.8, r: 1.4 }, RAIL_Z - 1.2, RAIL_H + 1.8, 3, 0.4), tone: 'mid' },
  ];
}
/** A rail along x between its end blocks, with its drive belt along the top. */
function railParts(y: number): Part[] {
  const plan: Plan = { x: RAIL_X0 + 5.4, y: y - 3.2, w: RAIL_X1 - RAIL_X0 - 10.8, d: 6.4, r: 1 };
  return [
    { kind: 'solid', paths: slab(plan, RAIL_Z, RAIL_H, 2, 0.4), tone: 'mid', inner: sideSeam(plan, RAIL_Z + 1.2, P, 2) },
    { kind: 'line', d: lineOnTop([plan.x, y], [plan.x + plan.w, y], RAIL_Z + RAIL_H, P), tone: 'lo' },
  ];
}

// The back rail on its posts, with the X drive motor on its left end block.
back.push(...postParts(RAIL_X0, RAIL_BACK), ...postParts(RAIL_X1, RAIL_BACK), ...railParts(RAIL_BACK));
back.push({ kind: 'solid', paths: cyl(RAIL_X0, RAIL_BACK, 5.2, RAIL_Z + RAIL_H + 0.6, 10, 28, 0.4), tone: 'hi', inner: sideArc(RAIL_X0, RAIL_BACK, 5.2, RAIL_Z + RAIL_H + 6.6, P, 24) });
back.push({ kind: 'dots', points: [at([RAIL_X0, RAIL_BACK, RAIL_Z + RAIL_H + 10.6])], size: 0.6 });

// The table: a ground plate with a faint grid, an edge scale along its front and its left side, and a datum
// block at the front left where both scales start.
back.push({ kind: 'solid', paths: slab(TABLE, 0, TABLE_H, 3, 0.6), tone: 'lo' });
{
  const grid: string[] = [];
  const step = 0.1 * SCALE;
  for (let x = Math.ceil(TABLE.x / step) * step; x < TABLE.x + TABLE.w; x += step) {
    if (x - TABLE.x > 12) grid.push(lineOnTop([x, TABLE.y], [x, TABLE.y + TABLE.d - 10], TABLE_H, P));
  }
  for (let y = Math.ceil(TABLE.y / step) * step; y < TABLE.y + TABLE.d; y += step) {
    if (TABLE.y + TABLE.d - y > 12) grid.push(lineOnTop([TABLE.x + 10, y], [TABLE.x + TABLE.w, y], TABLE_H, P));
  }
  back.push({ kind: 'line', d: grid.join(''), tone: 'faint' });
  back.push({ kind: 'dots', points: [[TABLE.x + TABLE.w - 4, TABLE.y + 4], [TABLE.x + 14, TABLE.y + 4], [TABLE.x + TABLE.w - 4, TABLE.y + TABLE.d - 14]].map(([x, y]) => at([x!, y!, TABLE_H])), size: 0.5 });
  // The edge scales: strips laid on the table, ticks every 0.05 of the toy plane, long every 0.25.
  const front: Plan = { x: TABLE.x + 10, y: TABLE.y + TABLE.d - 10, w: TABLE.w - 10, d: 9, r: 0.8 };
  const left: Plan = { x: TABLE.x + 1, y: TABLE.y, w: 9, d: TABLE.d - 10, r: 0.8 };
  for (const strip of [front, left]) back.push({ kind: 'solid', paths: slab(strip, TABLE_H, 0.7, 2), tone: 'lo', crease: 'none' });
  const top = TABLE_H + 0.7;
  const fine = 0.05 * SCALE;
  const along = topTicks(front.x + fine, front.x + front.w - 3, fine, 5, front.y, top, [2.4, 4.6], P, 'x');
  back.push({ kind: 'line', d: along.minor, tone: 'lo' });
  back.push({ kind: 'line', d: along.major, tone: 'mid' });
  const across = topTicks(left.y + 3, left.y + left.d - fine * 0.5, fine, 5, left.x + left.w, top, [-2.4, -4.6], P, 'y');
  back.push({ kind: 'line', d: across.minor, tone: 'lo' });
  back.push({ kind: 'line', d: across.major, tone: 'mid' });
  // The datum block: an L of two hardened bars where the two scales meet, with its two cap screws.
  const corner = { x: TABLE.x + 1, y: TABLE.y + TABLE.d - 10 };
  back.push({ kind: 'solid', paths: slab({ x: corner.x, y: corner.y, w: 22, d: 9, r: 0.8 }, TABLE_H, 4, 2, 0.4), tone: 'mid' });
  back.push({ kind: 'solid', paths: slab({ x: corner.x, y: corner.y - 13, w: 9, d: 13.6, r: 0.8 }, TABLE_H, 4, 2, 0.4), tone: 'mid' });
  back.push({ kind: 'dots', points: [at([corner.x + 15, corner.y + 4.5, TABLE_H + 4]), at([corner.x + 4.5, corner.y - 7, TABLE_H + 4])], size: 0.55 });
}

// A label plate on the base beside the table's left edge, its rules standing for print, with two screws.
{
  const plate: Plan = { x: RAIL_X0 - 5, y: -46, w: 14, d: 92, r: 1.6 };
  back.push({ kind: 'solid', paths: slab(plate, 0, 0.8, 3), tone: 'lo', crease: 'none' });
  back.push({ kind: 'line', d: planOutline(insetPlan(plate, 1.6), 0.8, P, 3), tone: 'faint' });
  back.push({
    kind: 'line',
    d: [0, 1, 2].map((row) => onTop([[plate.x + 4 + row * 3, plate.y + 12], [plate.x + 4 + row * 3, plate.y + (row === 1 ? 52 : 80)]], 0.8, P)).join(''),
    tone: 'lo',
    free: true,
  });
  back.push({ kind: 'dots', points: [at([plate.x + plate.w / 2, plate.y + 5, 0.8]), at([plate.x + plate.w / 2, plate.y + plate.d - 5, 0.8])], size: 0.5 });
}

// Four toe clamps hold the plate to the base along its back and right edges: a stud, a clamp bar and a nut each.
{
  const clamps: Array<{ x: number; y: number; along: 'x' | 'y' }> = [
    { x: TABLE.x + TABLE.w * 0.36, y: TABLE.y, along: 'y' },
    { x: TABLE.x + TABLE.w * 0.78, y: TABLE.y, along: 'y' },
    { x: TABLE.x + TABLE.w, y: TABLE.y + TABLE.d * 0.3, along: 'x' },
    { x: TABLE.x + TABLE.w, y: TABLE.y + TABLE.d * 0.72, along: 'x' },
  ];
  for (const c of [...clamps].sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y))) {
    const bar: Plan = c.along === 'y' ? { x: c.x - 4, y: c.y - 8, w: 8, d: 14, r: 1.2 } : { x: c.x - 8, y: c.y - 4, w: 14, d: 8, r: 1.2 };
    const stud: Plane = c.along === 'y' ? [c.x, c.y - 4] : [c.x + 4, c.y];
    back.push({ kind: 'solid', paths: slab(bar, TABLE_H, 2.4, 2, 0.3), tone: 'mid' });
    back.push({ kind: 'solid', paths: cyl(stud[0], stud[1], 2.6, TABLE_H + 2.4, 1.8, 6, 0.2), tone: 'mid' });
    back.push({ kind: 'solid', paths: cyl(stud[0], stud[1], 1.1, TABLE_H + 4.2, 1.6, 12), tone: 'lo' });
  }
}

// The front row: the pin tray with its spare pins, the controller with its cable, and the two picture easels.
const row: Part[] = [];
{
  row.push({ kind: 'solid', paths: slab(TRAY, 0, 2, 4, 0.4), tone: 'lo' });
  const walls: Plan[] = [
    { x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2.2, r: 1 },
    { x: TRAY.x, y: TRAY.y, w: 2.2, d: TRAY.d, r: 1 },
    { x: TRAY.x + TRAY.w - 2.2, y: TRAY.y, w: 2.2, d: TRAY.d, r: 1 },
  ];
  for (const wall of walls) row.push({ kind: 'solid', paths: slab(wall, 2, 6, 2), tone: 'mid' });
  const pins: Plane[] = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) pins.push([TRAY.x + 7 + i * 6, TRAY.y + 8 + j * 7.6]);
  for (const [x, y] of byDepth(pins)) {
    row.push({ kind: 'solid', paths: cyl(x, y, 1.4, 2, 3.2, 12), tone: 'mid', crease: 'none' });
  }
  row.push({ kind: 'solid', paths: slab({ x: TRAY.x, y: TRAY.y + TRAY.d - 2.2, w: TRAY.w, d: 2.2, r: 1 }, 2, 4, 2), tone: 'mid' });
}
const control: Part[] = [];
{
  const c = CONTROL;
  control.push({
    kind: 'wire',
    from: at([c.x, c.y + 10, 5]),
    via: [at([c.x - 8, c.y + 10, 0.3]), at([RAIL_X0 + 14, RAIL_FRONT + 10, 0.3]), at([RAIL_X0 + 4.2, RAIL_FRONT + 2, 0.3])],
    to: at([RAIL_X0 + 3.4, RAIL_FRONT + 0.6, 1.6]),
    tone: 'lo',
  });
  control.push({ kind: 'solid', paths: slab(c, 0, 14, 4, 0.8), tone: 'mid', inner: sideSeam(c, 9, P, 4) });
  control.push({ kind: 'line', d: planOutline(insetPlan(c, 3), 14, P, 4), tone: 'faint' });
  control.push({ kind: 'dots', points: [at([c.x + 4.4, c.y + 4.4, 14]), at([c.x + c.w - 4.4, c.y + c.d - 4.4, 14])], size: 0.5 });
  control.push({ kind: 'solid', paths: cyl(DIAL.x, DIAL.y, DIAL.r + 1.4, 14, 3, 44, 0.4), tone: 'mid' });
  control.push({ kind: 'line', d: knurl(DIAL.x, DIAL.y, DIAL.r + 1.4, 14.3, 16.7, 44, P), tone: 'faint' });
  control.push({ kind: 'line', d: ring(DIAL.x, DIAL.y, DIAL.r, 17, P, 48), tone: 'lo' });
  const ticks = radialTicks(DIAL.x, DIAL.y, DIAL.r, 20, 5, 17, [1.3, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  control.push({ kind: 'line', d: ticks.minor, tone: 'lo' });
  control.push({ kind: 'line', d: ticks.major, tone: 'mid' });
  const select = radialTicks(SELECT.x, SELECT.y, SELECT.r + 4.2, 15, 5, 14, [1.2, 2.4], P, -0.75 * Math.PI, 1.5 * Math.PI);
  control.push({ kind: 'line', d: arcOnTop(SELECT.x, SELECT.y, SELECT.r + 4.2, 14), tone: 'faint' });
  control.push({ kind: 'line', d: select.minor, tone: 'lo' });
  control.push({ kind: 'line', d: select.major, tone: 'mid' });
  control.push({ kind: 'solid', paths: cyl(c.x + c.w - 9, c.y + c.d - 8, 2.4, 14, 1.4, 20), tone: 'mid' });
  control.push({ kind: 'solid', paths: cyl(c.x + c.w - 9, c.y + c.d - 8, 1.4, 15.4, 1.4, 14), tone: 'hi' });
}

// The picture easels: a foot, a back block, the card and two clips; the picture itself is a slot.
function easelParts(which: 'now' | 'goal'): Part[] {
  const { x, y } = EASEL[which];
  const foot: Plan = { x: x - EASEL_W / 2 - 4, y: y - 7, w: EASEL_W + 8, d: 14, r: 2 };
  return [
    { kind: 'solid', paths: slab(foot, 0, EASEL_Z, 4, 0.6), tone: 'mid', inner: sideSeam(foot, 2.2, P, 4) },
    { kind: 'solid', paths: slab({ x: x - EASEL_W / 2 - 1, y: y - 3, w: EASEL_W + 2, d: 3, r: 0.6 }, EASEL_Z, 4, 2), tone: 'mid' },
    { kind: 'solid', paths: slab({ x: x - EASEL_W / 2, y: y - 0.4, w: EASEL_W, d: 1.2, r: 0.3 }, EASEL_Z + 4, EASEL_H, 2), tone: 'hi' },
    { kind: 'slot', id: which === 'now' ? 'card-now' : 'card-goal' },
    { kind: 'solid', paths: slab({ x: x - EASEL_W / 2 + 3, y: y - 1.4, w: 5, d: 3.6, r: 0.8 }, EASEL_Z + 2.4, 5, 3), tone: 'mid' },
    { kind: 'solid', paths: slab({ x: x + EASEL_W / 2 - 8, y: y - 1.4, w: 5, d: 3.6, r: 0.8 }, EASEL_Z + 2.4, 5, 3), tone: 'mid' },
  ];
}

// The front rail on its posts. The controller's cable climbs the front-left post in two clips to the drive.
const frontRail: Part[] = [...railParts(RAIL_FRONT)];
const frontPosts: Part[] = [...postParts(RAIL_X0, RAIL_FRONT)];
{
  const cx = RAIL_X0 + 3.4;
  const cy = RAIL_FRONT + 0.6;
  frontPosts.push({ kind: 'wire', from: at([cx, cy, 1.6]), via: [], to: at([cx, cy + 1.4, RAIL_Z - 1.2]), tone: 'lo' });
  for (const z of [2.6, 3.8]) {
    frontPosts.push({ kind: 'solid', paths: slab({ x: cx - 1.8, y: cy - 0.4, w: 3.6, d: 2.6, r: 0.6 }, z - 0.5, 1, 2), tone: 'mid', crease: 'none' });
  }
}
const frontRight: Part[] = [...postParts(RAIL_X1, RAIL_FRONT)];

/** The dial's needle: the distance left as a share of the start's, over the dial's 270 degrees. */
export function dialNeedle(share: number): string {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, share)) * 1.5 * Math.PI;
  return lineOnTop([DIAL.x - Math.sin(a) * 1.8, DIAL.y + Math.cos(a) * 1.8], [DIAL.x + Math.sin(a) * (DIAL.r - 1), DIAL.y - Math.cos(a) * (DIAL.r - 1)], 17.1, P);
}
/** The options knob: its pointer at the chosen count, 4 to 64. */
export function selectKnob(count: number, min: number, max: number): Part[] {
  const a = -0.75 * Math.PI + ((count - min) / (max - min)) * 1.5 * Math.PI;
  return [
    { kind: 'solid', paths: cyl(SELECT.x, SELECT.y, SELECT.r, 14, 4.6, 32, 0.4), tone: 'mid' },
    { kind: 'line', d: knurl(SELECT.x, SELECT.y, SELECT.r, 14.4, 18.2, 26, P), tone: 'lo' },
    { kind: 'line', d: lineOnTop([SELECT.x - Math.sin(a) * 1.8, SELECT.y + Math.cos(a) * 1.8], [SELECT.x + Math.sin(a) * (SELECT.r - 0.8), SELECT.y - Math.cos(a) * (SELECT.r - 0.8)], 18.6, P), tone: 'hi', free: true },
  ];
}

// ---------------------------------------------------------------- live parts
/** The marks on the table: the "now" ring at the start and the goal target. */
function markParts(start: Plane, goal: Plane): Part[] {
  return [
    { kind: 'line', d: ring(start[0], start[1], 7, TABLE_H, P, 40), tone: 'mid', role: 'start-ring' },
    { kind: 'line', d: ring(start[0], start[1], 3.6, TABLE_H, P, 28), tone: 'lo' },
    { kind: 'dots', points: [at([start[0], start[1], TABLE_H])], size: 0.9, tone: 'mid' },
    {
      kind: 'group',
      role: 'goal-marker',
      parts: [
        { kind: 'solid', paths: cyl(goal[0], goal[1], 14, TABLE_H, 0.7, 64), tone: 'hi', crease: 'none' },
        { kind: 'line', d: ring(goal[0], goal[1], 10, TABLE_H + 0.7, P, 56), tone: 'mid' },
        { kind: 'line', d: ring(goal[0], goal[1], 5.6, TABLE_H + 0.7, P, 44), tone: 'mid' },
        { kind: 'dots', points: [at([goal[0], goal[1], TABLE_H + 0.7])], size: 1.4, tone: 'hi' },
      ],
    },
  ];
}

/** The trail: a prick mark at every state the head has stood on, joined by a scribed line. */
function trailParts(history: Plane[]): Part[] {
  if (history.length < 2) return [];
  return [
    {
      kind: 'group',
      role: 'walked-path',
      parts: [
        { kind: 'line', d: onTop(history, TABLE_H, P), tone: 'mid' },
        { kind: 'dots', points: history.slice(0, -1).map(([x, y]) => at([x, y, TABLE_H])), size: 1.2, tone: 'hi' },
      ],
    },
  ];
}

/**
 * The fan, built round the origin (it rides with the head): one feeler per candidate move from the hub to a pin,
 * the kept one lit. Pins shrink when a fan is small, so neighbours never touch.
 */
function fanParts(ends: Plane[], kept: number): Part[] {
  const z = TABLE_H + 0.05;
  const reach = Math.max(1, ...ends.map(([x, y]) => Math.hypot(x, y)));
  // The tightest gap between neighbouring pins on the arc sets the pin size.
  const angles = ends.map(([x, y]) => Math.atan2(y, x)).sort((a, b) => a - b);
  let gap = Infinity;
  for (let i = 1; i < angles.length; i++) gap = Math.min(gap, (angles[i]! - angles[i - 1]!) * reach);
  const pinR = Math.max(0.6, Math.min(1.6, 0.34 * gap));
  const order = ends.map((end, index) => ({ end, index })).sort((a, b) => depth(a.end[0], a.end[1]) - depth(b.end[0], b.end[1]));
  const feelers: Part[] = [];
  const pins: Part[] = [];
  for (const { end, index } of order) {
    const isKept = index === kept;
    const length = Math.hypot(end[0], end[1]) || 1;
    const root: Plane = [(end[0] / length) * HUB_R * 0.6, (end[1] / length) * HUB_R * 0.6];
    feelers.push({ kind: 'line', d: lineOnTop(root, end, z, P), tone: isKept ? 'lit' : 'lo' });
    pins.push({
      kind: 'group',
      role: isKept ? 'feeler-kept' : 'feeler',
      parts: [{ kind: 'solid', paths: cyl(end[0], end[1], isKept ? pinR + 0.7 : pinR, z, isKept ? 4.6 : 3.2, isKept ? 20 : 14, 0.2), tone: isKept ? 'hi' : 'mid', lit: isKept, crease: 'none' }],
    });
  }
  // The kept feeler is drawn again over its neighbours, so the lit line reads all the way to its pin.
  const keptEnd = ends[kept];
  if (keptEnd) {
    const length = Math.hypot(keptEnd[0], keptEnd[1]) || 1;
    feelers.push({ kind: 'line', d: lineOnTop([(keptEnd[0] / length) * HUB_R * 0.6, (keptEnd[1] / length) * HUB_R * 0.6], keptEnd, z, P), tone: 'lit' });
  }
  return [{ kind: 'group', role: 'candidate-fan', data: { count: String(ends.length) }, parts: [...feelers, ...pins] }];
}

/** The bridge, built at x = 0 and moved along x with the head: trucks on both rails, the beam, its belt line. */
function bridgeParts(): Part[] {
  const parts: Part[] = [];
  for (const y of [RAIL_BACK, RAIL_FRONT]) {
    parts.push({ kind: 'solid', paths: slab({ x: -8, y: y - 6.6, w: 16, d: 13.2, r: 2 }, RAIL_Z + RAIL_H, 3.2, 3, 0.4), tone: 'mid' });
    parts.push({ kind: 'dots', points: [[-5, y - 3.6], [5, y + 3.6]].map(([px, py]) => at([px!, py!, RAIL_Z + RAIL_H + 3.2])), size: 0.45 });
  }
  const beam: Plan = { x: -5, y: RAIL_BACK - 6, w: 10, d: RAIL_FRONT - RAIL_BACK + 12, r: 1.6 };
  parts.push({ kind: 'solid', paths: slab(beam, BEAM_Z, BEAM_H, 3, 0.6), tone: 'mid', inner: sideSeam(beam, BEAM_Z + 1.8, P, 3) });
  parts.push({ kind: 'line', d: lineOnTop([0, beam.y], [0, beam.y + beam.d], BEAM_Z + BEAM_H, P), tone: 'lo' });
  return parts;
}

/**
 * The carriage, built with the probe head at the origin and moved to the head: the cap riding the beam, the plate
 * on its face, the arm forward to the stylus, the stylus collar and the feeler hub on the table.
 */
function carriageParts(): Part[] {
  const bx = -ARM;
  const parts: Part[] = [];
  parts.push({ kind: 'solid', paths: slab({ x: bx - 8, y: -9, w: 16, d: 18, r: 1.8 }, BEAM_Z + BEAM_H, 3, 3, 0.4), tone: 'mid' });
  parts.push({ kind: 'dots', points: [[-5, -5], [5, 5]].map(([dx, dy]) => at([bx + dx!, dy!, BEAM_Z + BEAM_H + 3])), size: 0.5 });
  const plate: Plan = { x: bx + 5, y: -8, w: 3.4, d: 16, r: 0.8 };
  parts.push({ kind: 'solid', paths: slab(plate, ARM_Z - 1, BEAM_Z + BEAM_H + 3 - ARM_Z + 1, 2), tone: 'hi' });
  parts.push({ kind: 'dots', points: [[-5, ARM_Z + 4], [5, ARM_Z + 4], [-5, BEAM_Z + 4], [5, BEAM_Z + 4]].map(([dy, z]) => at([bx + 8.4, dy!, z!])), size: 0.5 });
  const arm: Plan = { x: bx + 8.4, y: -3.4, w: ARM - 8.4 + 4, d: 6.8, r: 1.6 };
  parts.push({ kind: 'solid', paths: slab(arm, ARM_Z, ARM_T, 3, 0.4), tone: 'mid', inner: sideSeam(arm, ARM_Z + 1, P, 3) });
  parts.push({ kind: 'solid', paths: cyl(0, 0, 4, TABLE_H + 3.4, ARM_Z + ARM_T + 1.4 - TABLE_H - 3.4, 28, 0.4), tone: 'mid', inner: sideArc(0, 0, 4, ARM_Z - 0.8, P, 24) });
  parts.push({ kind: 'dots', points: [at([0, 0, ARM_Z + ARM_T + 1.4])], size: 0.6 });
  parts.push({ kind: 'solid', paths: cyl(0, 0, HUB_R, TABLE_H + 0.4, 3, 32, 0.4), tone: 'hi' });
  parts.push({ kind: 'line', d: ring(0, 0, HUB_R - 1.6, TABLE_H + 3.4, P, 32), tone: 'faint' });
  return parts;
}
const BRIDGE = bridgeParts();
const CARRIAGE = carriageParts();

export interface TableState {
  /** Every state the head has stood on, in latent units, the last one where it stands now. */
  history: Point[];
  goal: Point;
  /** The candidate landings of the move being chosen now (latent units, as the model predicts them); empty when done. */
  candidates: Point[];
  kept: number;
  /** The options knob's setting. */
  count: number;
  minCount: number;
  maxCount: number;
  /** Distance left as a share of the start's, for the dial. */
  left: number;
}

/** The whole table, in painter's order, for one state. */
export function tableParts(state: TableState): Part[] {
  const history = state.history.map(toTable);
  const here = state.history[state.history.length - 1]!;
  const head = history[history.length - 1]!;
  const goal = toTable(state.goal);
  const parts: Part[] = [...back];
  parts.push(...markParts(history[0]!, goal));
  parts.push(...trailParts(history));
  if (state.candidates.length) {
    const shown = fanOf(here, state.goal, state.candidates, state.kept).map(toTable).map(([x, y]) => [x - head[0], y - head[1]] as Plane);
    const fan = fanParts(shown, state.kept)[0] as Extract<Part, { kind: 'group' }>;
    parts.push({ ...fan, data: { ...fan.data, move: cssMove(head[0], head[1]) } });
  }
  parts.push(...frontRail);
  parts.push({ kind: 'group', role: 'bridge', data: { move: cssMove(head[0] - ARM, 0) }, parts: BRIDGE });
  parts.push({ kind: 'group', role: 'carriage', data: { move: cssMove(head[0], head[1]), x: head[0].toFixed(1), y: head[1].toFixed(1) }, parts: CARRIAGE });
  parts.push(...frontPosts, ...frontRight);
  parts.push(...row, ...control, ...selectKnob(state.count, state.minCount, state.maxCount));
  parts.push({ kind: 'line', d: dialNeedle(state.left), tone: 'hi', role: 'dial-needle', free: true });
  parts.push({ kind: 'dots', points: [at([DIAL.x, DIAL.y, 17.1])], size: 0.9, tone: 'hi' });
  parts.push(...easelParts('now'), ...easelParts('goal'));
  return parts;
}

export { fromTable };
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
