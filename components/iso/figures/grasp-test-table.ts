/**
 * The grasp test table for GraspWrenchLab, drawn with the isometric kit.
 *
 * The object is the explanation: a square block stands on a round test
 * table, held by fingertip posts on magnetic bases that press its sides.
 * A wedge on the block's top at each fingertip shows its friction cone, the
 * directions it can push without slipping. A cord from a hook on the
 * block's centre runs to a force gauge on a carriage that rides the table's
 * rim; the carriage stops at eight stations, 45 degrees apart, and pulls
 * the block toward each one, a force through the centre in that direction.
 * A telltale pin at each station stands up when the grip held that pull and
 * stays down when the block slipped. A dial at the front reads the grip's
 * margin, the Ferrari-Canny quality.
 *
 * World units: the lib's unit square (half side 1) becomes a block SCALE
 * units across each half. Model (x, y) maps to world (x, -y) times SCALE, so
 * the model's top edge is the table's far side; x along the bench, y toward
 * the viewer, z up. Static paths are built once per grasp (contacts and mu);
 * the carriage, its cord and the block's nudge are rebuilt or moved live.
 */
import {
  cameraOf,
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  iso,
  knurl,
  lineOnTop,
  onTop,
  pathOf,
  radialTicks,
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
import { PUSH_COUNT, contactGeometry, pushAngle, type ContactGeometry } from '../../../lib/grasp.ts';

export const WIDTH = 640;
/** Set below from the parts' own extent, so the drawing fills the stage. */
export let HEIGHT = 440;
export const AZIMUTH = 40;
export const ELEVATION = 50;

/** World units per model unit: the block is twice this across. */
export const SCALE = 36;
const TABLE_R = 116;
const TABLE_H = 8;
const BLOCK_H = 22;
const BLOCK_TOP = TABLE_H + BLOCK_H;
/** The inlaid wedge plates' thickness. */
const WEDGE_T = 0.7;
/** The height the fingertips press at, and the plane a dragged finger is read in. */
export const CONTACT_Z = BLOCK_TOP - 5;
/** The cord's height: above every finger. */
const CORD_Z = BLOCK_TOP + 3.6;
/** The carriage rides the rim at this radius; the telltales stand inside it. */
const TRACK_R = 104;
const TELLTALE_R = 91;
/** The friction-cone wedge's length on the block top, in model units. */
export const WEDGE_LEN = 0.7;
/** The dial reads the margin from 0 at its left stop to this at its right. */
export const EPSILON_FULL = 1;
/** The dial sits on a bracket off the table's front rim. */
const DIAL_AT = (100 * Math.PI) / 180;
const DIAL = { x: Math.cos(DIAL_AT) * (TABLE_R + 30), y: Math.sin(DIAL_AT) * (TABLE_R + 30), r: 19 };
const DIAL_SPAN = (270 * Math.PI) / 180;

const DIAL_FROM = -DIAL_SPAN / 2;

export type Group = 'static' | 'block' | 'carriage' | 'cord' | 'needle';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; halo?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'fill'; group: Group; d: string; shade: number }
  | { kind: 'halo'; group: Group; d: string }
  | { kind: 'finger'; group: Group; index: number; grab: Flat; parts: Part[] }
  | { kind: 'station'; group: Group; index: number; held: boolean; parts: Part[] }
  | { kind: 'wedges'; group: Group; parts: Part[] }
  | { kind: 'slot'; group: Group; name: 'carriage-back' | 'carriage-front' | 'cord' | 'needle' };

// ---------------------------------------------------------------- layout
/** The table's top is a thick disc on four turned feet. */
const TOP_UNDER = 10;
const FOOT_H = 20;
const FOOT_R = 100;
/** The dial's face height: its body stands on the bracket under the rim. */
const DIAL_Z = -TOP_UNDER + 5 + 10.4;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (let k = 0; k < 64; k++) {
  const a = (k / 64) * Math.PI * 2;
  extremes.push([TABLE_R * Math.cos(a), TABLE_R * Math.sin(a), TABLE_H], [TABLE_R * Math.cos(a), TABLE_R * Math.sin(a), -TOP_UNDER]);
  // The carriage's gauge, wherever on the rim it stands: its outer corners and the dial ring on top.
  extremes.push([(TRACK_R + 11.2) * Math.cos(a), (TRACK_R + 11.2) * Math.sin(a), CORD_Z + 1.8]);
  extremes.push([(TRACK_R + 2) * Math.cos(a), (TRACK_R + 2) * Math.sin(a), CORD_Z + 1.8]);
}
for (let k = 0; k < 4; k++) {
  const a = Math.PI / 4 + (k * Math.PI) / 2;
  extremes.push([(100 + 9) * Math.cos(a), (100 + 9) * Math.sin(a), -TOP_UNDER - FOOT_H]);
}
extremes.push([DIAL.x + Math.cos(DIAL_AT) * (DIAL.r + 4), DIAL.y + Math.sin(DIAL_AT) * (DIAL.r + 4), -4]);
const FIT_PAD = 8;
{
  const unit = { origin: [0, 0] as Flat, scale: 1, azimuth: AZIMUTH, elevation: ELEVATION };
  const flat = extremes.map((point) => iso(point, unit));
  const span = (index: 0 | 1) => Math.max(...flat.map((f) => f[index])) - Math.min(...flat.map((f) => f[index]));
  HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
}
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);

/** Model point to world floor point. */
export const toWorld = (x: number, y: number): Plane => [x * SCALE, -y * SCALE];
/** The world direction of test pull `k`: the model's push direction, mirrored like the block. */
export const pullDirection = (k: number): Plane => [Math.cos(pushAngle(k)), -Math.sin(pushAngle(k))];

/** The screen offset that moves a group built at rest by a world offset. */
export const shiftBy = (dx = 0, dy = 0, dz = 0) => translateAlong(P, [dx, dy, dz]);

/**
 * The model point under a pointer at viewBox point (vx, vy), read in the
 * plane the fingertips press at: the inverse of the camera on z = CONTACT_Z.
 */
export function modelPointAt(vx: number, vy: number): { x: number; y: number } {
  const { sinA, cosA, sinE, cosE, k } = cameraOf(P);
  const u = (vx - P.origin[0]) / k;
  const v = ((vy - P.origin[1]) / k + CONTACT_Z * cosE) / sinE;
  const x = u * sinA + v * cosA;
  const y = -u * cosA + v * sinA;
  return { x: x / SCALE, y: -y / SCALE };
}

/** A rotated rectangle on the floor: centred at `c`, `along` units along `dir`, `across` units across it. */
function box(c: Plane, dir: Plane, along: number, across: number): Plane[] {
  const [ux, uy] = dir;
  const [tx, ty] = [-uy, ux];
  const a = along / 2;
  const b = across / 2;
  return [
    [c[0] + ux * a + tx * b, c[1] + uy * a + ty * b],
    [c[0] - ux * a + tx * b, c[1] - uy * a + ty * b],
    [c[0] - ux * a - tx * b, c[1] - uy * a - ty * b],
    [c[0] + ux * a - tx * b, c[1] + uy * a - ty * b],
  ];
}
const prism = (ring: Plane[], z: number, h: number, bevel = 0) => extrude(ring, z, h, P, { bevel });

// ---------------------------------------------------------------- wedges
/** The friction-cone wedge at a contact on the block's top, as world floor points: apex, then the arc. */
export function wedgeOf(geom: ContactGeometry, mu: number): Plane[] {
  const half = Math.atan(mu);
  const base = Math.atan2(geom.normal.y, geom.normal.x);
  const steps = 10;
  const model: Plane[] = [[geom.point.x, geom.point.y]];
  for (let i = 0; i <= steps; i++) {
    const a = base - half + (2 * half * i) / steps;
    model.push([geom.point.x + WEDGE_LEN * Math.cos(a), geom.point.y + WEDGE_LEN * Math.sin(a)]);
  }
  // A wedge near a corner is cut where it would run off the block's top.
  return clipToSquare(model).map(([x, y]) => toWorld(x, y));
}

/** Sutherland-Hodgman: a convex polygon cut to the block's top, the square |x|, |y| <= 1. */
function clipToSquare(polygon: Plane[]): Plane[] {
  let out = polygon;
  const edges: Array<[0 | 1, 1 | -1]> = [[0, 1], [0, -1], [1, 1], [1, -1]];
  for (const [axis, sign] of edges) {
    const inside = (p: Plane) => sign * p[axis] <= 1 + 1e-9;
    const cross = (a: Plane, b: Plane): Plane => {
      const t = (sign - a[axis]) / (b[axis] - a[axis]);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    const next: Plane[] = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i];
      const b = out[(i + 1) % out.length];
      if (inside(a)) {
        next.push(a);
        if (!inside(b)) next.push(cross(a, b));
      } else if (inside(b)) next.push(cross(a, b));
    }
    out = next;
  }
  return out;
}

// --------------------------------------------------------------- fingers
/** One fingertip unit: magnetic base, its switch knob, post, clamp, arm and pad, pressing at contact `geom`. */
function fingerParts(geom: ContactGeometry, index: number): { parts: Part[]; grab: Flat } {
  const [px, py] = toWorld(geom.point.x, geom.point.y);
  const n: Plane = [geom.normal.x, -geom.normal.y];
  const out = (d: number): Plane => [px - n[0] * d, py - n[1] * d];
  const parts: Part[] = [];
  const g: Group = 'static';
  const footC = out(34);
  parts.push({ kind: 'solid', group: g, paths: prism(box(footC, n, 18, 18), TABLE_H, 9, 0.6), tone: 'mid' });
  // The finger's number as pips on its base, beside the post: one, two or three.
  {
    const [tx0, ty0] = [-n[1], n[0]];
    const pips: Flat[] = [];
    for (let k = 0; k <= index; k++) {
      const along = -5.5;
      const across = -5.5 + k * 3;
      pips.push(at([footC[0] - n[0] * along + tx0 * across, footC[1] - n[1] * along + ty0 * across, TABLE_H + 9]));
    }
    parts.push({ kind: 'dots', group: g, points: pips, size: 0.7, tone: 'mid' });
  }
  const knobC = out(41);
  const [tx, ty] = [-n[1], n[0]];
  const knob: Plane = [knobC[0] + tx * 5.5, knobC[1] + ty * 5.5];
  parts.push({ kind: 'solid', group: g, paths: cyl(knob[0], knob[1], 2.4, TABLE_H + 9, 3, 16), tone: 'mid' });
  parts.push({ kind: 'line', group: g, d: knurl(knob[0], knob[1], 2.4, TABLE_H + 9, TABLE_H + 12, 10, P), tone: 'lo' });
  parts.push({ kind: 'solid', group: g, paths: cyl(footC[0], footC[1], 3.4, TABLE_H + 9, CONTACT_Z + 5 - TABLE_H - 9, 18), tone: 'mid' });
  parts.push({ kind: 'solid', group: g, paths: prism(box(footC, n, 9, 9), CONTACT_Z - 4, 9, 0.4), tone: 'mid' });
  parts.push({ kind: 'solid', group: g, paths: prism(box(out(17), n, 26, 5.4), CONTACT_Z - 2.8, 5.6, 0.3), tone: 'hi' });
  parts.push({ kind: 'solid', group: g, paths: prism(box(out(2), n, 4, 12), CONTACT_Z - 6, 12, 0.3), tone: 'hi' });
  return { parts, grab: at([...out(17), CONTACT_Z] as Point3) };
}

// -------------------------------------------------------------- carriage
/** The force-gauge carriage on the rim, pulling toward world direction `dir`. */
export function carriageParts(dir: Plane): Part[] {
  const g: Group = 'carriage';
  const along = (r: number): Plane => [dir[0] * r, dir[1] * r];
  const parts: Part[] = [];
  parts.push({ kind: 'solid', group: g, paths: prism(box(along(TRACK_R + 2), dir, 16, 24), TABLE_H, 5, 0.5), tone: 'mid' });
  const [cx, cy] = along(TRACK_R + 4);
  parts.push({ kind: 'solid', group: g, paths: cyl(cx, cy, 3.6, TABLE_H + 5, CORD_Z - 7 - TABLE_H - 5, 18), tone: 'mid' });
  parts.push({ kind: 'solid', group: g, paths: prism(box(along(TRACK_R - 2), dir, 26, 10), CORD_Z - 7, 8.6, 0.5), tone: 'hi' });
  const [dx, dy] = along(TRACK_R + 2);
  parts.push({ kind: 'line', group: g, d: ring(dx, dy, 3, CORD_Z + 1.6, P, 18), tone: 'lo' });
  parts.push({ kind: 'solid', group: g, paths: prism(box(along(TRACK_R - 19), dir, 8, 2.4), CORD_Z - 1.2, 2.4), tone: 'mid' });
  // The eye the cord is tied to, at the hook's tip.
  parts.push({ kind: 'dots', group: g, points: [at([...along(TRACK_R - 23), CORD_Z] as Point3)], size: 1.1, tone: 'mid' });
  return parts;
}

/**
 * The eye bolt for pull `k` on the block's top, just inside the edge where the
 * ray from the centre toward station k leaves the block: a cord tied there
 * pulls along a line through the centre, so it is the same test force.
 */
export function eyeOf(k: number): Plane {
  const [ux, uy] = pullDirection(k);
  const r = SCALE / Math.max(Math.abs(ux), Math.abs(uy)) - EYE_INSET / Math.max(Math.abs(ux), Math.abs(uy));
  return [ux * r, uy * r];
}
const EYE_INSET = 4.2;

/** The pull cord for station `k`: from its eye bolt on the block (nudged by `nudge`) to the gauge's hook. */
export function cordPath(k: number, nudge: Plane = [0, 0]): string {
  const dir = pullDirection(k);
  const [ex, ey] = eyeOf(k);
  const hook: Point3 = [dir[0] * (TRACK_R - 23), dir[1] * (TRACK_R - 23), CORD_Z];
  return pathOf([at([ex + nudge[0], ey + nudge[1], CORD_Z]), at(hook)]);
}
/** The eye bolt screwed into tapped hole `k` for the pull in progress, on the block nudged by `nudge`. */
export function eyeBoltParts(k: number, nudge: Plane = [0, 0]): Part[] {
  const [x, y] = eyeOf(k);
  const ex = x + nudge[0];
  const ey = y + nudge[1];
  return [
    { kind: 'solid', group: 'cord', paths: cyl(ex, ey, 2.2, BLOCK_TOP, 0.8, 16), tone: 'mid' },
    { kind: 'solid', group: 'cord', paths: cyl(ex, ey, 1.1, BLOCK_TOP + 0.8, CORD_Z - BLOCK_TOP - 1.7, 12), tone: 'mid' },
    { kind: 'solid', group: 'cord', paths: cyl(ex, ey, 2, CORD_Z - 0.9, 1.6, 16), tone: 'mid' },
    { kind: 'dots', group: 'cord', points: [at([ex, ey, CORD_Z])], size: 0.9, tone: 'mid' },
  ];
}

/**
 * Where the carriage waits at rest: at the first pull the grip cannot hold,
 * or else at the right-most station, not behind the block, whose cord would
 * not run along a finger's arm.
 */
export function restStationFor(contacts: number[], held: boolean[]): number {
  const slip = held.findIndex((ok) => !ok);
  if (slip >= 0) return slip;
  const clear = (k: number) => {
    const [ux, uy] = pullDirection(k);
    return contacts.every((s) => {
      // The finger's outward direction on the table: the model normal reversed, then mirrored in y.
      const g = contactGeometry(s);
      const [ox, oy] = [-g.normal.x, g.normal.y];
      return ux * ox + uy * oy < Math.cos(Math.PI / 6);
    });
  };
  // Prefer a station off to the right, beside the block rather than in front of it or behind it.
  const { sinA, cosA } = cameraOf(P);
  const across = (k: number) => pullDirection(k)[0] * sinA - pullDirection(k)[1] * cosA;
  const order = Array.from({ length: PUSH_COUNT }, (_, k) => k)
    .filter((k) => depth(...pullDirection(k)) > -0.3)
    .sort((a, b) => across(b) - across(a));
  return order.find(clear) ?? order[0];
}

/** Where the cord leaves the block, for the tests: its eye, on the ray from the centre. */
export const cordStart = (k: number): Point3 => [...eyeOf(k), CORD_Z] as Point3;

/** Is the carriage, at world direction `dir`, nearer the viewer than the block (drawn after it)? */
export const carriageInFront = (dir: Plane) => depth(dir[0] * TRACK_R, dir[1] * TRACK_R) > depth(0, 0) + SCALE * 0.6;

/** The dial's needle for a margin of `epsilon`. */
export function needlePath(epsilon: number): string {
  const share = Math.max(0, Math.min(1, epsilon / EPSILON_FULL));
  const a = DIAL_FROM + DIAL_SPAN * share;
  const tip: Plane = [DIAL.x + Math.sin(a) * (DIAL.r - 6), DIAL.y - Math.cos(a) * (DIAL.r - 6)];
  const tail: Plane = [DIAL.x - Math.sin(a) * 4, DIAL.y + Math.cos(a) * 4];
  return lineOnTop(tail, tip, DIAL_Z, P);
}
/** The needle's angle, in degrees from straight up, for a margin of `epsilon`. */
export const needleDegrees = (epsilon: number) =>
  ((DIAL_FROM + DIAL_SPAN * Math.max(0, Math.min(1, epsilon / EPSILON_FULL))) * 180) / Math.PI;

// ---------------------------------------------------------------- scene
export interface TableState {
  contacts: number[];
  mu: number;
  /** Which of the eight pulls the grip held. */
  held: boolean[];
}

/**
 * Everything drawn for a grasp: the table, the fingers far side first, the
 * block (the one lit part) with its wedges and hook, the near fingers, the
 * eight stations with their telltales, the slots where the live carriage,
 * cord and needle are drawn, and the dial.
 */
export function sceneOf({ contacts, mu, held }: TableState): Part[] {
  const parts: Part[] = [];
  const put = (part: Part) => parts.push(part);

  // The soft shadow the table casts on the floor, then its four turned feet, far ones first.
  put({ kind: 'halo', group: 'static', d: cyl(0, 0, TABLE_R - 6, -TOP_UNDER - FOOT_H, 0.1, 96).fill });
  // The table's four turned feet, far ones first, under its thick top.
  const feet: Plane[] = [0, 1, 2, 3].map((k) => [Math.cos(Math.PI / 4 + (k * Math.PI) / 2) * FOOT_R, Math.sin(Math.PI / 4 + (k * Math.PI) / 2) * FOOT_R]);
  for (const [x, y] of [...feet].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]))) {
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 9, -TOP_UNDER - FOOT_H, 2, 28), tone: 'lo' });
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 6.4, -TOP_UNDER - FOOT_H + 2, FOOT_H - 2, 24), tone: 'mid' });
    put({ kind: 'line', group: 'static', d: sideArc(x, y, 6.4, -TOP_UNDER - 5, P, 16), tone: 'faint' });
  }
  // The dial's bracket, bolted under the front rim, drawn before the top that covers its root.
  {
    const dir: Plane = [Math.cos(DIAL_AT), Math.sin(DIAL_AT)];
    put({ kind: 'solid', group: 'static', paths: prism(box([dir[0] * (TABLE_R + 12), dir[1] * (TABLE_R + 12)], dir, 40, 22), -TOP_UNDER, 5, 0.4), tone: 'lo' });
  }
  // The round table: its top, the rim track with a degree scale, and the centre mark.
  put({ kind: 'solid', group: 'static', paths: cyl(0, 0, TABLE_R, -TOP_UNDER, TABLE_H + TOP_UNDER, 128, 1.2), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: sideArc(0, 0, TABLE_R, 2, P, 96), tone: 'faint' });
  put({ kind: 'line', group: 'static', d: ring(0, 0, TRACK_R + 8, TABLE_H, P, 96) + ring(0, 0, TRACK_R - 7, TABLE_H, P, 96), tone: 'lo' });
  {
    // Majors span the whole scale band between its two rings; minors hang from the outer ring.
    const ticks = radialTicks(0, 0, TRACK_R + 8, 72, 9, TABLE_H, [2.6, 15], P);
    put({ kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
    put({ kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  }
  // Four T-slots along the diagonals, where the finger bases clamp, and the table's screws.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    put({ kind: 'line', group: 'static', d: onTop(box([ux * 70, uy * 70], [ux, uy], 26, 4.4), TABLE_H, P, true), tone: 'lo' });
    put({ kind: 'line', group: 'static', d: onTop(box([ux * 70, uy * 70], [ux, uy], 30, 8), TABLE_H, P, true), tone: 'faint' });
  }
  put({ kind: 'dots', group: 'static', points: [0, 1, 2, 3].map((k) => at([Math.cos((k * Math.PI) / 2) * 82, Math.sin((k * Math.PI) / 2) * 82, TABLE_H])), size: 0.5 });

  // The eight stations: a bushing and a telltale pin, up where the grip held that pull.
  const stations = Array.from({ length: PUSH_COUNT }, (_, k) => k).sort(
    (a, b) => depth(pullDirection(a)[0], pullDirection(a)[1]) - depth(pullDirection(b)[0], pullDirection(b)[1]),
  );
  const stationParts = (k: number): Part => {
    const [ux, uy] = pullDirection(k);
    const x = ux * TELLTALE_R;
    const y = uy * TELLTALE_R;
    const list: Part[] = [
      { kind: 'solid', group: 'static', paths: cyl(x, y, 3.6, TABLE_H, 1.6, 18), tone: 'mid' },
      // A standing pin is lit: together they are the one thing to watch, the directions the grip held.
      { kind: 'solid', group: 'static', paths: cyl(x, y, 1.7, TABLE_H + 1.6, held[k] ? 9 : 1.4, 12, 0.2), tone: held[k] ? 'hi' : 'lo', lit: held[k] },
    ];
    return { kind: 'station', group: 'static', index: k, held: held[k], parts: list };
  };
  const behindBlock = stations.filter((k) => depth(pullDirection(k)[0], pullDirection(k)[1]) <= depth(0, 0));
  const frontOfBlock = stations.filter((k) => depth(pullDirection(k)[0], pullDirection(k)[1]) > depth(0, 0));
  for (const k of behindBlock) put(stationParts(k));
  put({ kind: 'slot', group: 'carriage', name: 'carriage-back' });

  // Fingers on the far side of the block, then the block, its wedges and hook, then the near fingers.
  const geoms = contacts.map((s) => contactGeometry(s));
  const toward = (g: ContactGeometry) => {
    const n: Plane = [g.normal.x, -g.normal.y];
    return depth(-n[0], -n[1]) - depth(0, 0) > 0;
  };
  const fingerOf = (index: number): Part => {
    const { parts: list, grab } = fingerParts(geoms[index], index);
    return { kind: 'finger', group: 'static', index, grab, parts: list };
  };
  const order = geoms.map((_, i) => i).sort((a, b) => {
    const [ax, ay] = toWorld(geoms[a].point.x, geoms[a].point.y);
    const [bx, by] = toWorld(geoms[b].point.x, geoms[b].point.y);
    return depth(ax, ay) - depth(bx, by);
  });
  for (const i of order) if (!toward(geoms[i])) put(fingerOf(i));

  const half = SCALE;
  const block: Plan = { x: -half, y: -half, w: 2 * half, d: 2 * half, r: 1.2 };
  put({ kind: 'solid', group: 'block', paths: slab(block, TABLE_H, BLOCK_H, 3, 0.8), tone: 'hi', inner: '' });
  put({ kind: 'line', group: 'block', d: sideSeam(block, TABLE_H + 4, P, 3), tone: 'faint' });
  // The eight tapped holes a pull's eye bolt screws into, one per test direction.
  put({ kind: 'line', group: 'block', d: Array.from({ length: PUSH_COUNT }, (_, k) => ring(...eyeOf(k), 1.6, BLOCK_TOP, P, 14)).join(''), tone: 'faint' });
  // The friction-cone wedges, inlaid in the block's top: apex on each contact, opening along its normal.
  const wedges: Part[] = [];
  for (const g of geoms) {
    const pts = wedgeOf(g, mu);
    const plate = extrude(pts, BLOCK_TOP, WEDGE_T, P, { convex: true });
    wedges.push({ kind: 'solid', group: 'block', paths: plate, tone: 'mid', crease: 'none', inner: `<path class="iso-shade" data-shade="1" d="${onTop(pts, BLOCK_TOP + WEDGE_T, P, true)}"/>` });
  }
  put({ kind: 'wedges', group: 'block', parts: wedges });

  for (const i of order) if (toward(geoms[i])) put(fingerOf(i));
  for (const k of frontOfBlock) put(stationParts(k));
  put({ kind: 'slot', group: 'cord', name: 'cord' });
  put({ kind: 'slot', group: 'carriage', name: 'carriage-front' });

  // The margin dial at the front right: body, knurled bezel, face, scale, stops and the needle.
  put({ kind: 'solid', group: 'static', paths: cyl(DIAL.x, DIAL.y, DIAL.r + 2, DIAL_Z - 10.4, 3, 48), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(DIAL.x, DIAL.y, DIAL.r, DIAL_Z - 7.4, 7.4, 64, 0.6), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: knurl(DIAL.x, DIAL.y, DIAL.r, DIAL_Z - 7, DIAL_Z - 4, 44, P, 0.3), tone: 'lo' });
  put({ kind: 'line', group: 'static', d: ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL_Z, P, 64), tone: 'lo' });
  {
    const ticks = radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL_Z, [1.4, 2.6], P, DIAL_FROM, DIAL_SPAN);
    put({ kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
    put({ kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  }
  put({ kind: 'slot', group: 'needle', name: 'needle' });
  put({ kind: 'line', group: 'static', d: ring(DIAL.x, DIAL.y, 1.6, DIAL_Z, P, 16), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: DIAL.x + DIAL.r - 2, y: DIAL.y - 3, w: 6, d: 6, r: 1 }, DIAL_Z - 6.4, 4, 2, 0.3), tone: 'mid' });

  return parts;
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
