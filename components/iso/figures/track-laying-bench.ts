/**
 * The track-laying bench for LatentImagination, drawn with the isometric kit.
 *
 * The object is the explanation: a robot plans by imagining its future one
 * step at a time, and each imagined step starts from the last imagined one.
 * On this round bench each imagined step is one section of narrow-gauge
 * track, bolted to the end of the section before it. A curved steel
 * template round the edge is the real route, with one station mark per
 * step. Every joint carries a little of the model's one-step error into
 * every section after it, so the laid track spirals in, away from the
 * template: a little at first, further the more sections are laid. A
 * trolley (the one lit part) stands at the head of the track, where the
 * robot thinks it will be. A radius arm on the central hub swings to the
 * head, and the cursor on its scale reads how far the head is from the real
 * route.
 *
 * World units are about a millimetre of a small bench: x and y on the
 * bench top, z up, the hub at the origin. Section k ends at angle
 * START_ANGLE - k * STEP_ANGLE and sits SPREAD * d(k) inside the real
 * route's radius, where d(k) is the toy deviation from
 * lib/latent-imagination.ts. The hub's flange stops a track that drifts that
 * far, as the floor stopped the old figure's imagined ball. Static parts are
 * built once; the track, the trolley, the arm and the picture flags are
 * built from the current state by `benchParts`.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  iso,
  knurl,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  insetPlan,
  radialTicks,
  ring,
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
import { phoneFitOf } from '../phone-fit.ts';

export const WIDTH = 640;
export const HEIGHT = 340;
export const AZIMUTH = 61;
/** Raised above the kit's 30 degrees to look down onto the bench top, where the track lies. */
export const ELEVATION = 38;

/** World units of track per imagined step, measured along the real route. */
export const SECTION = 8;
/** The longest look-ahead the bench lays, one section per step (MAX_HORIZON). */
export const MAX_SECTIONS = 50;
/** The real route's radius: the track's centreline as it leaves the buffer stop. */
export const ROUTE_R = 122;
/** World units of inward drift per unit of toy deviation. */
export const SPREAD = 140;
/** The hub flange's rim: a track that drifts this far runs into it. */
const FLANGE_R = 26;
/** Half the gauge (centreline to each rail's middle) and the sleepers' half length. */
const GAUGE = 3.2;
const SLEEPER = 7;
/** The furthest the centreline can drift in before its sleepers touch the flange. */
export const REACH = ROUTE_R - FLANGE_R - SLEEPER - 0.8;
/** The first section starts here, at the buffer stop; the track runs clockwise seen from above. */
export const START_ANGLE = (128 * Math.PI) / 180;
export const STEP_ANGLE = SECTION / ROUTE_R;

const SLEEPER_H = 1.2;
const RAIL_Z = SLEEPER_H;
const RAIL_H = 1.5;
const RAIL_TOP = RAIL_Z + RAIL_H;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone; role?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; role?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone; role?: string }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone; role?: string }
  | { kind: 'group'; role: string; parts: Part[]; data?: Record<string, string> };

// ---------------------------------------------------------------- layout
const BASE_R = 152;
const BASE_H = 9;
const FOOT_H = 5;
/** The template: a curved steel strip just outside the track, one station mark per section. */
const TEMPLATE_IN = ROUTE_R + SLEEPER + 2.2;
const TEMPLATE_OUT = TEMPLATE_IN + 5;
const TEMPLATE_H = 3.4;
const TEMPLATE_H_ARM = TEMPLATE_H;
const END_ANGLE = START_ANGLE - MAX_SECTIONS * STEP_ANGLE;
const ARC_FROM = END_ANGLE - 0.09;
const ARC_TO = START_ANGLE + 0.16;
/** The hub: a flange, a turned column, the arm's bearing collar and a knurled cap. */
const COLUMN_R = 7;
const ARM_Z = TEMPLATE_H_ARM;
const ARM_H = 2.2;
const ARM_W = 7;
const COLLAR_R = COLUMN_R + 2.8;
const ARM_REACH = TEMPLATE_OUT + 0.6;
const CONTROL = { r: 92, angle: (198 * Math.PI) / 180, w: 40, d: 34 };
const TRAY = { r: 84, angle: (258 * Math.PI) / 180 };

const polar = (r: number, angle: number): Plane => [r * Math.cos(angle), r * Math.sin(angle)];
const radial = (angle: number): Plane => [Math.cos(angle), Math.sin(angle)];
const tangent = (angle: number): Plane => [Math.sin(angle), -Math.cos(angle)];

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (let i = 0; i < 48; i++) {
  const [x, y] = polar(BASE_R, (i / 48) * Math.PI * 2);
  extremes.push([x, y, -BASE_H - FOOT_H], [x, y, 0]);
}
extremes.push([0, 0, 30]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 14 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);

/** A rectangle on the floor, length `along` in direction `dir`, width `across`, centred on `centre`. */
function box(centre: Plane, dir: Plane, along: number, across: number): Plane[] {
  const [ux, uy] = dir;
  const [nx, ny] = [-uy, ux];
  const a = along / 2;
  const b = across / 2;
  return [
    [centre[0] - ux * a - nx * b, centre[1] - uy * a - ny * b],
    [centre[0] + ux * a - nx * b, centre[1] + uy * a - ny * b],
    [centre[0] + ux * a + nx * b, centre[1] + uy * a + ny * b],
    [centre[0] - ux * a + nx * b, centre[1] - uy * a + ny * b],
  ];
}

/** A ring sector on the floor between two radii and two angles, as a closed outline. */
function sector(rIn: number, rOut: number, from: number, to: number, steps = 96): Plane[] {
  const outer = Array.from({ length: steps + 1 }, (_, i) => polar(rOut, from + ((to - from) * i) / steps));
  const inner = Array.from({ length: steps + 1 }, (_, i) => polar(rIn, to - ((to - from) * i) / steps));
  return [...outer, ...inner];
}

const unit = (a: Plane, b: Plane): Plane => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
};

// ------------------------------------------------------------- the model's track
/** The drawn inward offset for a toy deviation, stopped by the hub's flange. */
export const offsetOf = (deviation: number) => Math.min(SPREAD * deviation, REACH);
/** True when the track has run into the hub's flange. */
export const stoppedByHub = (deviation: number) => SPREAD * deviation > REACH;
export const angleOf = (k: number) => START_ANGLE - k * STEP_ANGLE;

/** The centreline of the laid track: point k is the end of section k. */
export function trackPoints(deviation: readonly number[], laid: number): Plane[] {
  const count = Math.max(0, Math.min(MAX_SECTIONS, Math.round(laid), deviation.length - 1));
  return Array.from({ length: count + 1 }, (_, k) => polar(ROUTE_R - offsetOf(deviation[k] ?? 0), angleOf(k)));
}

/** One rail: a thin strip offset `side` from the centreline (positive = left of travel), as a closed outline. */
function railRing(points: Plane[], side: number): Plane[] {
  const normals = points.map((_, k) => {
    const before = unit(points[Math.max(0, k - 1)]!, points[Math.max(1, k)]!);
    const after = unit(points[Math.min(points.length - 2, k)]!, points[Math.min(points.length - 1, k + 1)]!);
    const [tx, ty] = unit([0, 0], [before[0] + after[0], before[1] + after[1]]);
    // The mitre keeps the rail's width through a bend.
    const scale = 1 / Math.max(0.5, tx * before[0] + ty * before[1]);
    return [-ty * scale, tx * scale] as Plane;
  });
  const inner = points.map(([x, y], k) => [x + normals[k]![0] * (side - 0.7), y + normals[k]![1] * (side - 0.7)] as Plane);
  const outer = points.map(([x, y], k) => [x + normals[k]![0] * (side + 0.7), y + normals[k]![1] * (side + 0.7)] as Plane);
  return [...inner, ...outer.reverse()];
}

// ---------------------------------------------------------------- static parts
const base: Part[] = [];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));

// The round bench top on four turned feet, with a seam, a groove and four screws.
for (const [x, y] of byDepth([45, 135, 225, 315].map((deg) => polar(BASE_R - 30, (deg * Math.PI) / 180)))) {
  base.push({ kind: 'solid', paths: cyl(x, y, 9, -BASE_H - FOOT_H, 1.6, 28), tone: 'lo' });
  base.push({ kind: 'solid', paths: cyl(x, y, 7, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), tone: 'mid' });
}
base.push({ kind: 'solid', paths: cyl(0, 0, BASE_R, -BASE_H, BASE_H, 120, 1.6), tone: 'mid', inner: sideArc(0, 0, BASE_R, -BASE_H + 3.4, P, 72) });
base.push({ kind: 'line', d: ring(0, 0, BASE_R - 6, 0, P, 120), tone: 'faint' });
{
  const screws = [20, 110, 200, 290].map((deg) => polar(BASE_R - 13, (deg * Math.PI) / 180));
  base.push({ kind: 'line', d: screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  base.push({ kind: 'dots', points: screws.map(([x, y]) => at([x, y, 0])), size: 0.55 });
}

// The template: the real route, a curved steel strip with a station mark for every section.
const template: Part[] = [];
{
  const strip = sector(TEMPLATE_IN, TEMPLATE_OUT, ARC_FROM, ARC_TO);
  template.push({ kind: 'solid', paths: extrude(strip, 0, TEMPLATE_H, P, { convex: false }), tone: 'mid' });
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; k <= MAX_SECTIONS; k++) {
    const angle = angleOf(k);
    const big = k % 5 === 0;
    const a = polar(TEMPLATE_IN, angle);
    const b = polar(TEMPLATE_IN + (big ? 3.4 : 1.9), angle);
    (big ? major : minor).push(lineOnTop(a, b, TEMPLATE_H, P));
  }
  template.push({ kind: 'line', d: minor.join(''), tone: 'lo' });
  template.push({ kind: 'line', d: major.join(''), tone: 'mid' });
  // Hold-down screws at both ends and the middle of the strip.
  template.push({ kind: 'dots', points: [ARC_FROM + 0.035, (ARC_FROM + ARC_TO) / 2 + 0.017, ARC_TO - 0.035].map((angle) => at([...polar(TEMPLATE_OUT - 1.3, angle), TEMPLATE_H] as Point3)), size: 0.5 });
}

// Station posts outside the template every five steps: the real robot's positions along the route.
const posts: Part[] = [];
for (const k of byStation()) {
  const [x, y] = polar(TEMPLATE_OUT + 5.5, angleOf(k));
  posts.push({ kind: 'solid', paths: cyl(x, y, 2.6, 0, 1.2, 20), tone: 'lo' });
  posts.push({ kind: 'solid', paths: cyl(x, y, 1.2, 1.2, 5.4, 14), tone: 'mid' });
  posts.push({ kind: 'solid', paths: cyl(x, y, 2, 6.6, 1.6, 18, 0.2), tone: k === 0 ? 'hi' : 'mid' });
}
function byStation(): number[] {
  const list = Array.from({ length: MAX_SECTIONS / 5 + 1 }, (_, i) => i * 5);
  return list.sort((a, b) => depth(...polar(ROUTE_R, angleOf(a))) - depth(...polar(ROUTE_R, angleOf(b))));
}

// The buffer stop where the first section is bolted: the real encoded state, step 0.
const buffer: Part[] = [];
{
  const angle = START_ANGLE + 0.05;
  const centre = polar(ROUTE_R, angle);
  const dir = tangent(angle);
  buffer.push({ kind: 'solid', paths: extrude(box(centre, dir, 8, 20), 0, 11, P, { bevel: 0.6 }), tone: 'mid' });
  const across: Plane = [-dir[1], dir[0]];
  const face: Plane = [centre[0] + dir[0] * 4, centre[1] + dir[1] * 4];
  for (const side of [-5, 5]) {
    const c: Plane = [face[0] + across[0] * side + dir[0] * 1.3, face[1] + across[1] * side + dir[1] * 1.3];
    buffer.push({ kind: 'solid', paths: extrude(box(c, dir, 2.6, 3.4), 4.6, 3.4, P), tone: 'mid' });
  }
  buffer.push({ kind: 'dots', points: [-6, 6].map((side) => at([centre[0] + across[0] * side, centre[1] + across[1] * side, 11])), size: 0.5 });
}

// The joint-play controller at the back left: a knurled knob over a scale, a lamp, a label, and its cable to the hub.
const control: Part[] = [];
const CONTROL_PLAN: Plan = (() => {
  const [cx, cy] = polar(CONTROL.r, CONTROL.angle);
  return { x: cx - CONTROL.w / 2, y: cy - CONTROL.d / 2, w: CONTROL.w, d: CONTROL.d, r: 3 };
})();
const KNOB = { x: CONTROL_PLAN.x + 13, y: CONTROL_PLAN.y + 14, r: 6.2 };
{
  const c = CONTROL_PLAN;
  control.push({
    kind: 'wire',
    from: at([c.x + c.w, c.y + c.d - 8, 5]),
    via: [at([c.x + c.w + 9, c.y + c.d - 8, 0.3]), at([...polar(FLANGE_R + 7, (205 * Math.PI) / 180), 0.3] as Point3)],
    to: at([...polar(FLANGE_R, (205 * Math.PI) / 180), 2] as Point3),
    tone: 'lo',
  });
  control.push({ kind: 'solid', paths: slab(c, 0, 17, 4, 0.8), tone: 'mid', inner: sideSeam(c, 12, P, 4) });
  control.push({ kind: 'line', d: planOutline(insetPlan(c, 3), 17, P, 4), tone: 'faint' });
  control.push({ kind: 'dots', points: [at([c.x + 4.5, c.y + 4.5, 17]), at([c.x + c.w - 4.5, c.y + c.d - 4.5, 17])], size: 0.5 });
  const scale = radialTicks(KNOB.x, KNOB.y, KNOB.r + 4.4, 22, 11, 17, [1.4, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
  control.push({
    kind: 'line',
    d: onTop(Array.from({ length: 37 }, (_, i) => {
      const a = -0.75 * Math.PI + (i / 36) * 1.5 * Math.PI;
      return [KNOB.x + Math.sin(a) * (KNOB.r + 4.4), KNOB.y - Math.cos(a) * (KNOB.r + 4.4)] as Plane;
    }), 17, P),
    tone: 'faint',
  });
  control.push({ kind: 'line', d: scale.minor, tone: 'lo' });
  control.push({ kind: 'line', d: scale.major, tone: 'mid' });
  control.push({ kind: 'solid', paths: cyl(c.x + 31, c.y + 9, 2.6, 17, 1.4, 20), tone: 'mid' });
  control.push({ kind: 'solid', paths: cyl(c.x + 31, c.y + 9, 1.6, 18.4, 1.6, 16), tone: 'hi' });
  const tag: Plan = { x: c.x + 25, y: c.y + 17, w: 11, d: 12, r: 1.2 };
  control.push({ kind: 'solid', paths: slab(tag, 17, 0.6, 3), tone: 'lo', crease: 'none' });
  control.push({ kind: 'line', d: [0, 1, 2].map((row) => onTop([[tag.x + 2.4, tag.y + 3 + row * 3], [tag.x + (row === 1 ? 6.5 : 8.6), tag.y + 3 + row * 3]], 17.6, P)).join(''), tone: 'lo', free: true });
}

// The spare-section tray at the back right, three sections ready to lay.
const tray: Part[] = [];
{
  const [cx, cy] = polar(TRAY.r, TRAY.angle);
  const plan: Plan = { x: cx - 17, y: cy - 15, w: 34, d: 30, r: 2.5 };
  tray.push({ kind: 'solid', paths: slab(plan, 0, 1.6, 4, 0.4), tone: 'lo' });
  const walls: Plan[] = [
    { x: plan.x, y: plan.y, w: plan.w, d: 2.2, r: 1 },
    { x: plan.x, y: plan.y, w: 2.2, d: plan.d, r: 1 },
    { x: plan.x + plan.w - 2.2, y: plan.y, w: 2.2, d: plan.d, r: 1 },
  ];
  for (const wall of walls) tray.push({ kind: 'solid', paths: slab(wall, 1.6, 9, 2), tone: 'mid' });
  for (const level of [0, 1, 2]) {
    const z = 1.6 + level * (RAIL_TOP + 0.1);
    const sx = cx - 3 + level * 2;
    for (const sy of [-4, 4]) tray.push({ kind: 'solid', paths: extrude(box([sx, cy + sy], [1, 0], SLEEPER * 2, 2.4), z, SLEEPER_H, P), tone: 'lo' });
    for (const side of [-GAUGE, GAUGE]) tray.push({ kind: 'solid', paths: extrude(box([sx + side, cy], [0, 1], SECTION * 1.7, 1.4), z + SLEEPER_H, RAIL_H, P), tone: 'mid' });
  }
  tray.push({ kind: 'solid', paths: slab({ x: plan.x, y: plan.y + plan.d - 2.2, w: plan.w, d: 2.2, r: 1 }, 1.6, 5, 2), tone: 'mid' });
}

// A label plate on the front of the bench, set along the rim, with three engraved rules.
const label: Part[] = [];
{
  const angle = (160 * Math.PI) / 180;
  const centre = polar(BASE_R - 11, angle);
  const dir = tangent(angle);
  const across: Plane = [-dir[1], dir[0]];
  label.push({ kind: 'solid', paths: extrude(box(centre, dir, 64, 11), 0, 0.8, P), tone: 'lo', crease: 'none' });
  const rule = (row: number, length: number) => {
    const off = (row - 1) * 2.6;
    const a: Plane = [centre[0] - dir[0] * 22 + across[0] * off, centre[1] - dir[1] * 22 + across[1] * off];
    return lineOnTop(a, [a[0] + dir[0] * length, a[1] + dir[1] * length], 0.8, P);
  };
  label.push({ kind: 'line', d: [rule(0, 44), rule(1, 28), rule(2, 44)].join(''), tone: 'lo', free: true });
  label.push({ kind: 'dots', points: [-28, 28].map((s) => at([centre[0] + dir[0] * s, centre[1] + dir[1] * s, 0.8])), size: 0.5 });
}

// The hub's flange: the kerb a far-drifted track runs into, with its bolt circle.
const flange: Part[] = [
  { kind: 'solid', paths: cyl(0, 0, FLANGE_R, 0, TEMPLATE_H, 72, 0.6), tone: 'mid' },
  { kind: 'line', d: ring(0, 0, FLANGE_R - 4, TEMPLATE_H, P, 72), tone: 'faint' },
  { kind: 'dots', points: Array.from({ length: 8 }, (_, i) => at([...polar(FLANGE_R - 7.5, (i / 8) * Math.PI * 2 + 0.2), TEMPLATE_H] as Point3)), size: 0.5 },
];

// ---------------------------------------------------------------- live parts
/** The joint-play knob: its pointer turns with the one-step error, over a 270 degree scale. */
export function knobParts(errorShare: number): Part[] {
  const angle = -0.75 * Math.PI + Math.min(1, Math.max(0, errorShare)) * 1.5 * Math.PI;
  const tip: Plane = [KNOB.x + Math.sin(angle) * (KNOB.r - 1), KNOB.y - Math.cos(angle) * (KNOB.r - 1)];
  const tail: Plane = [KNOB.x - Math.sin(angle) * 2.2, KNOB.y + Math.cos(angle) * 2.2];
  return [
    { kind: 'solid', paths: cyl(KNOB.x, KNOB.y, KNOB.r + 1.6, 17, 1.2, 32), tone: 'lo' },
    { kind: 'solid', paths: cyl(KNOB.x, KNOB.y, KNOB.r, 18.2, 4.4, 32, 0.4), tone: 'mid' },
    { kind: 'line', d: knurl(KNOB.x, KNOB.y, KNOB.r, 18.6, 22.2, 30, P), tone: 'lo' },
    { kind: 'line', d: lineOnTop(tail, tip, 22.6, P), tone: 'hi', free: true, role: 'knob-pointer' },
  ];
}

/** Every section's sleeper, both rails and the joint bolts, for the laid centreline; with the flags between the rails. */
function trackParts(points: Plane[], flags: Part[][], flagAngle: number): Part[] {
  if (points.length < 2) return flags.flat();
  const parts: Part[] = [];
  const sleepers: Array<{ key: number; part: Part }> = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]!;
    const b = points[k]!;
    const mid: Plane = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    sleepers.push({ key: depth(mid[0], mid[1]), part: { kind: 'solid', paths: extrude(box(mid, unit(a, b), 2.8, SLEEPER * 2), 0, SLEEPER_H, P), tone: 'lo' } });
  }
  sleepers.sort((p, q) => p.key - q.key).forEach(({ part }) => parts.push(part));
  // Left of travel is the outer rail. It is the near one wherever the track faces the viewer, so the flags'
  // feet stand between the far rail and the near one.
  const outer = { kind: 'solid', paths: extrude(railRing(points, GAUGE), RAIL_Z, RAIL_H, P, { convex: false }), tone: 'hi', role: 'rail-outer' } as Part;
  const inner = { kind: 'solid', paths: extrude(railRing(points, -GAUGE), RAIL_Z, RAIL_H, P, { convex: false }), tone: 'hi', role: 'rail-inner' } as Part;
  const outerNear = depth(Math.cos(flagAngle), Math.sin(flagAngle)) > 0;
  parts.push(outerNear ? inner : outer, ...flags.flat(), outerNear ? outer : inner);
  const bolts: Flat[] = [];
  for (let k = 1; k < points.length; k++) {
    const dir = unit(points[k - 1]!, points[k]!);
    for (const side of [-GAUGE, GAUGE]) bolts.push(at([points[k]![0] - dir[1] * side, points[k]![1] + dir[0] * side, RAIL_TOP]));
  }
  parts.push({ kind: 'dots', points: bolts, size: 0.45, tone: 'mid', role: 'joints' });
  return parts;
}

/** A picture flag on section k's sleeper: where Dreamer turns an imagined step back into a picture. */
function flagParts(points: Plane[], k: number): Part[] {
  const a = points[Math.max(0, k - 1)]!;
  const b = points[k]!;
  const mid: Plane = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dir = unit(a, b);
  const top = 21;
  const cardH = 8;
  const cardW = 10;
  // The card faces outward from the hub, toward the viewer's side of the bench.
  const face: Plane = [dir[1], -dir[0]];
  const corner = (u: number, z: number): Point3 => [mid[0] + dir[0] * u + face[0] * 0.6, mid[1] + dir[1] * u + face[1] * 0.6, z];
  return [
    { kind: 'solid', paths: cyl(mid[0], mid[1], 1.3, SLEEPER_H, 1.8, 14), tone: 'mid' },
    { kind: 'solid', paths: cyl(mid[0], mid[1], 0.6, SLEEPER_H + 1.8, top - cardH - SLEEPER_H - 1.8, 10), tone: 'mid' },
    { kind: 'solid', paths: extrude(box(mid, dir, cardW, 1.2), top - cardH, cardH, P), tone: 'hi' },
    { kind: 'line', d: pathOf([corner(-3.6, top - 1.4), corner(3.6, top - 1.4), corner(3.6, top - cardH + 1.4), corner(-3.6, top - cardH + 1.4)].map(at), true), tone: 'lo' },
    { kind: 'line', d: pathOf(Array.from({ length: 16 }, (_, i) => corner(0.4 + 1.7 * Math.cos((i / 16) * Math.PI * 2), top - cardH / 2 + 1.7 * Math.sin((i / 16) * Math.PI * 2))).map(at), true), tone: 'mid' },
    { kind: 'line', d: pathOf([corner(-3.6, top - cardH + 2.2), corner(3.6, top - cardH + 2.2)].map(at)), tone: 'lo' },
  ];
}

/** The trolley at the head of the track: the imagined robot, the one lit part. */
function trolleyParts(points: Plane[]): Part[] {
  const head = points[points.length - 1]!;
  const dir = points.length > 1 ? unit(points[points.length - 2]!, head) : tangent(START_ANGLE);
  const [nx, ny] = [-dir[1], dir[0]];
  const centre: Plane = [head[0] - dir[0] * 5, head[1] - dir[1] * 5];
  const parts: Part[] = [];
  const wheels: Array<{ key: number; part: Part }> = [];
  for (const along of [-3.2, 3.2]) {
    for (const side of [-GAUGE, GAUGE]) {
      const wx = centre[0] + dir[0] * along + nx * side;
      const wy = centre[1] + dir[1] * along + ny * side;
      wheels.push({ key: depth(wx, wy), part: { kind: 'solid', paths: extrude(box([wx, wy], dir, 3.4, 1.6), RAIL_TOP - 0.7, 2.6, P), tone: 'mid' } });
    }
  }
  wheels.sort((p, q) => p.key - q.key).forEach(({ part }) => parts.push(part));
  parts.push({ kind: 'solid', paths: extrude(box(centre, dir, 10.6, 10.2), RAIL_TOP + 1.5, 1.3, P), tone: 'mid' });
  parts.push({ kind: 'solid', paths: extrude(box(centre, dir, 8.8, 8.2), RAIL_TOP + 2.8, 4.2, P, { bevel: 0.4 }), tone: 'hi', lit: true, role: 'trolley' });
  const z = RAIL_TOP + 2.8 + 4.2;
  parts.push({ kind: 'dots', points: [-2.8, 2.8].flatMap((along) => [-2.4, 2.4].map((side) => at([centre[0] + dir[0] * along + nx * side, centre[1] + dir[1] * along + ny * side, z]))), size: 0.42 });
  return parts;
}

/** How far ahead of the head the arm lies, so it clears the trolley's nose at any radius. */
const armLead = (headR: number) => (ARM_W / 2 + 4.2) / Math.max(headR, 30);

/**
 * The radius arm: it swings on the hub to lie just ahead of the head, resting on the template. Its scale reads
 * inward from the real route's radius; the cursor sits at the head's radius and the trolley's pointer touches it.
 */
function armParts(headAngle: number, headR: number, offset: number, showBracket: boolean): Part[] {
  const angle = headAngle - armLead(headR);
  const dir = radial(angle);
  const [nx, ny] = [-dir[1], dir[0]];
  const along = (r: number, side = 0): Plane => [dir[0] * r + nx * side, dir[1] * r + ny * side];
  const parts: Part[] = [];
  const inner = 2;
  parts.push({ kind: 'solid', paths: extrude(box(along((inner + ARM_REACH) / 2), dir, ARM_REACH - inner, ARM_W), ARM_Z, ARM_H, P, { bevel: 0.4 }), tone: 'mid', role: 'arm' });
  // The scale: zero at the real route's radius, a tick every 0.05 of toy deviation, inward toward the hub.
  const minor: string[] = [];
  const major: string[] = [];
  const top = ARM_Z + ARM_H;
  const edge = ARM_W / 2;
  for (let j = 0; j * SPREAD * 0.05 <= REACH + 1e-6; j++) {
    const r = ROUTE_R - j * SPREAD * 0.05;
    const big = j % 2 === 0;
    (big ? major : minor).push(lineOnTop(along(r, edge), along(r, edge - (big ? 3 : 1.7)), top, P));
  }
  parts.push({ kind: 'line', d: minor.join(''), tone: 'lo' });
  parts.push({ kind: 'line', d: major.join(''), tone: 'mid' });
  parts.push({ kind: 'line', d: lineOnTop(along(ROUTE_R, edge), along(ROUTE_R, -edge), top, P), tone: 'hi' });
  parts.push({ kind: 'dots', points: [at([...along(ARM_REACH - 3), top] as Point3)], size: 0.5 });
  if (showBracket) {
    parts.push({
      kind: 'group',
      role: 'drift-bracket',
      data: { offset: offset.toFixed(2) },
      parts: [
        { kind: 'line', d: lineOnTop(along(ROUTE_R, -edge + 1.3), along(headR + 2.2, -edge + 1.3), top, P), tone: 'hi' },
        { kind: 'dots', points: [at([...along(ROUTE_R, -edge + 1.3), top] as Point3)], size: 0.7, tone: 'hi' },
      ],
    });
  }
  // The cursor straddles the arm at the head's radius; its index line faces the trolley.
  parts.push({ kind: 'solid', paths: extrude(box(along(headR), dir, 4.4, ARM_W + 2.6), ARM_Z - 0.8, ARM_H + 2.2, P, { bevel: 0.3 }), tone: 'hi', role: 'cursor' });
  parts.push({ kind: 'line', d: lineOnTop(along(headR, edge + 1.3), along(headR, -edge - 1.3), top + 1.4, P), tone: 'hi' });
  return parts;
}

/** The trolley's pointer: a slim arm from its nose forward to the radius arm's near edge. */
function pointerParts(head: Plane, headAngle: number, headR: number): Part[] {
  const angle = headAngle - armLead(headR);
  const dir = radial(angle);
  const near: Plane = [-dir[1], dir[0]];
  const edgePoint: Plane = [dir[0] * headR + near[0] * (ARM_W / 2 + 1.3), dir[1] * headR + near[1] * (ARM_W / 2 + 1.3)];
  const z = RAIL_TOP + 3.6;
  return [{ kind: 'line', d: pathOf([at([head[0], head[1], z]), at([edgePoint[0], edgePoint[1], z])]), tone: 'hi', role: 'pointer' }];
}

/** The arm's clamp boss round the column: it turns with the arm and covers the arm's root. */
function bossParts(headAngle: number, headR: number): Part[] {
  const dir = radial(headAngle - armLead(headR));
  return [
    { kind: 'solid', paths: extrude(box([0, 0], dir, COLLAR_R * 2 + 2, ARM_W + 5), ARM_Z, ARM_H + 1, P, { bevel: 0.4 }), tone: 'mid', role: 'arm-boss' },
    { kind: 'dots', points: [-4.2, 4.2].map((s) => at([dir[0] * s, dir[1] * s, ARM_Z + ARM_H + 1])), size: 0.5 },
  ];
}

/** The hub above the arm's boss: the column and its knurled cap. */
function hubParts(): Part[] {
  return [
    { kind: 'solid', paths: cyl(0, 0, COLUMN_R, ARM_Z + ARM_H + 1, 8.4, 32), tone: 'mid', inner: sideArc(0, 0, COLUMN_R, ARM_Z + ARM_H + 5, P, 24) },
    { kind: 'solid', paths: cyl(0, 0, COLUMN_R + 1.4, ARM_Z + ARM_H + 9.4, 4.6, 32, 0.4), tone: 'hi' },
    { kind: 'line', d: knurl(0, 0, COLUMN_R + 1.4, ARM_Z + ARM_H + 9.8, ARM_Z + ARM_H + 13.6, 26, P), tone: 'lo' },
  ];
}

export interface BenchState {
  /** Toy deviation at every step 0..MAX (lib/latent-imagination.ts). */
  deviation: readonly number[];
  /** Sections laid: the look-ahead. */
  laid: number;
  /** Where the joint-play knob points, 0 (sharp) to 1 (sloppy). */
  errorShare: number;
  /** The imagined steps Dreamer decodes into pictures; empty for a model with no decoder. */
  pictures: readonly number[];
  /** Below this drawn offset the bracket on the arm is not drawn. */
  visibleGap: number;
}

/** The whole bench, in painter's order, for one state. */
export function benchParts(state: BenchState): Part[] {
  const points = trackPoints(state.deviation, state.laid);
  const laid = points.length - 1;
  const head = points[laid]!;
  const headR = Math.hypot(head[0], head[1]);
  const offset = ROUTE_R - headR;
  const headAngle = angleOf(laid);
  const pictures = state.pictures.filter((k) => k >= 1 && k < laid);
  const flags: Part[] = pictures.map((k) => ({ kind: 'group', role: 'flag', data: { step: String(k) }, parts: flagParts(points, k) }));
  const parts: Part[] = [...base, ...control, ...knobParts(state.errorShare), ...tray, ...flange, ...template, ...posts, ...buffer];
  const flagAngle = pictures.length ? angleOf(pictures[Math.floor(pictures.length / 2)]!) : headAngle;
  parts.push(...trackParts(points, flags.length ? [[{ kind: 'group', role: 'decoded-frames', data: { count: String(pictures.length) }, parts: flags }]] : [], flagAngle));
  // The arm lies ahead of the head over bare bench, so the trolley and its pointer are drawn over it.
  // The arm, then its clamp boss over the arm's root, then the column standing on the boss.
  const arm = armParts(headAngle, headR, offset, offset >= state.visibleGap);
  parts.push(arm[0]!, ...bossParts(headAngle, headR), ...arm.slice(1), ...hubParts());
  parts.push({ kind: 'group', role: 'trolley', data: { offset: offset.toFixed(2) }, parts: [...trolleyParts(points), ...pointerParts(head, headAngle, headR)] });
  parts.push(...label);
  return parts;
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
