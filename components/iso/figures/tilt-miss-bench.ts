/**
 * The tilt-miss optical bench for PerceptionErrorBudget, drawn with the isometric kit.
 *
 * The object is the explanation: a camera sits in a tilting yoke at one end of an
 * optical rail, and a target staff rides the rail on a carriage. A micrometer under
 * the camera's tail sets how far the camera is tilted. The camera's line of sight
 * (the lit beam) leaves the lens and lands on the staff's scale above the target peg,
 * which sits on the rail's own line, where the camera should be looking. The gap on
 * the scale is the miss: distance times the tangent of the tilt, so sliding the staff
 * away along the rail makes the same tilt miss by more.
 *
 * World units: x along the rail (the camera at +x, looking toward -x), y across it
 * (toward the viewer is +y), z up. Distance along the rail is drawn at `U` units a
 * metre and the miss at `M` units a millimetre, far steeper, so a fraction of a
 * degree shows. The beam always passes exactly through the point `M` units per
 * millimetre of miss above the peg: the drawn tilt is solved from the miss, not
 * the other way round.
 *
 * Static paths are built once here. The staff's carriage is built at the rail's
 * zero and moved with `carriageAt`. The camera, the micrometer spindle and thimble,
 * the beam, the sight line and the cable are rebuilt for each tilt and distance.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  ring,
  segment,
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
import { discAlong, plateIn, prismAlong, roundedOutline, viewOf } from '../prism.ts';

export const WIDTH = 640;
export const AZIMUTH = 54;

/** World units per metre along the rail. */
export const U = 170;
/** World units per millimetre of miss on the staff's scale. */
export const M = 1.5;
/** The longest distance the rail reads, metres (the slider's end). */
export const RAIL_M = 1.5;
/** The tallest miss the staff's scale shows, millimetres; a bigger miss sends the beam over the staff's top. */
export const SCALE_MM = 32;

export type Group = 'static' | 'carriage';
export type LiveId = 'sight' | 'beam' | 'lens' | 'camera' | 'spindle' | 'thimble' | 'cable';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'live'; group: Group; id: LiveId };

// ---------------------------------------------------------------- layout
/** The pivot of the tilting yoke: the centre of the lens, where both lines of sight start. */
export const LENS_X = 150;
export const LENS_Z = 39;
export const PIVOT: Point3 = [LENS_X, 0, LENS_Z];

const BASE: Plan = { x: -144, y: -30, w: 352, d: 60, r: 7 };
const BASE_H = 7;
const FOOT_H = 4;
const RAIL: Plan = { x: -130, y: -8, w: 330, d: 16, r: 1.5 };
const RAIL_H = 10;
const RULER: Plan = { x: LENS_X - RAIL_M * U - 6, y: 13, w: RAIL_M * U + 12, d: 7, r: 1 };
const RULER_H = 0.8;
const CARRIER: Plan = { x: LENS_X - 7, y: -13, w: 45, d: 26, r: 2.5 };
const CARRIER_Z = [5, 14] as const;
const JUNCTION: Plan = { x: 178, y: 15, w: 22, d: 11, r: 2 };
const JUNCTION_H = 8;
const LABEL: Plan = { x: -136, y: -26, w: 44, d: 12, r: 2 };

/** The staff: its face at x = 0 in the carriage's own frame, 24 wide, the zero line at lens height. */
const STAFF = { y0: -12, y1: 12, z0: LENS_Z - 12, z1: LENS_Z + SCALE_MM * M + 5, t: 3 };
const SADDLE: Plan = { x: -17, y: -12, w: 25, d: 24, r: 2 };
const SADDLE_Z = [5, 15] as const;
const POST = { x: -7, r: 3, z0: SADDLE_Z[1] + 3, z1: STAFF.z0 - 4 };
const PEG = { r: 2.2, length: 4.5 };

/** The camera, in its own frame: s runs back from the pivot (toward +x), the body is s 8 to 32. */
const CAMERA = { barrel: [-4, 8] as const, barrelR: 5.2, hood: [-5.6, -3.2] as const, hoodR: 6.2, body: [8, 32] as const, half: [8, 7] as const };
const CHEEK = { y: [6.4, 9.4] as const, x: [LENS_X - 4.2, LENS_X + 4.2] as const };
/** The micrometer stands on the carrier under the camera's tail. */
const MICRO = { x: LENS_X + 16, y: 0, thimble: [CARRIER_Z[1], CARRIER_Z[1] + 4.5] as const, sleeve: [CARRIER_Z[1] + 4.5, CARRIER_Z[1] + 7.5] as const };
/** The top of the micrometer's sleeve, where its spindle comes out. */
export const SLEEVE_TOP = MICRO.sleeve[1];

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
}
for (const d of [0.15, RAIL_M]) {
  const x = LENS_X - d * U;
  extremes.push([x - 3, STAFF.y0, STAFF.z1], [x - 3, STAFF.y1, STAFF.z1], [x, STAFF.y1, STAFF.z1]);
}
extremes.push([LENS_X + 32, 8, LENS_Z + 8]);
export const P = fitProjection(extremes, WIDTH, 1000, { pad: 12, azimuth: AZIMUTH });
// The height follows the fit: the drawing's own extent plus the pad.
const screen = extremes.map((point) => iso(point, P));
export const HEIGHT = Math.ceil(Math.max(...screen.map(([, y]) => y)) - Math.min(...screen.map(([, y]) => y)) + 24);
{
  const top = Math.min(...screen.map(([, y]) => y));
  P.origin = [P.origin[0], P.origin[1] - top + 12];
}

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const V = viewOf(P);
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Point3, k: number): Point3 => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---------------------------------------------------------------- model geometry
/** The staff's face, x, for a distance in metres. */
export const staffX = (distanceM: number) => LENS_X - distanceM * U;
/** The drawn tilt, radians: the beam from the pivot must land `missMm * M` above the peg at the staff. */
export const drawnTilt = (missMm: number, distanceM: number) => Math.atan2(missMm * M, distanceM * U);
/** Where the beam lands on the staff's face. */
export function spotAt(missMm: number, distanceM: number): Point3 {
  const rise = missMm * M;
  if (rise > PEG.r + 0.2) return [staffX(distanceM), 0, LENS_Z + rise];
  // A miss smaller than the peg: the beam lands on the peg's own face.
  const x = staffX(distanceM) + 1 + PEG.length;
  return [x, 0, LENS_Z + rise * ((LENS_X - x) / (distanceM * U))];
}
/** True when the miss is bigger than the staff's scale: the beam passes over the staff's top. */
export const overTop = (missMm: number) => missMm > SCALE_MM + 2;
/** True when the beam lands on the peg itself: the miss is smaller than the peg. */
export const onPeg = (missMm: number) => missMm * M <= PEG.r + 0.2;
/** The screen offset that moves the staff's carriage (built at x = 0) to a distance. */
export const carriageAt = (distanceM: number) => translateAlong(P, [staffX(distanceM), 0, 0]);
/** The carriage's screen offset, as numbers. */
export const carriageOffset = (distanceM: number): Flat => {
  const a = at([0, 0, 0]);
  const b = at([staffX(distanceM), 0, 0]);
  return [b[0] - a[0], b[1] - a[1]];
};

/** The camera's frame for a drawn tilt: forward (toward the staff), across, and up. */
function frameOf(tilt: number) {
  const forward: Point3 = [-Math.cos(tilt), 0, Math.sin(tilt)];
  const up: Point3 = [Math.sin(tilt), 0, Math.cos(tilt)];
  const across: Point3 = [0, 1, 0];
  const point = (s: number, u: number, v: number): Point3 => add(add(add(PIVOT, scale(forward, -s)), scale(across, u)), scale(up, v));
  return { forward, up, across, point };
}

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const solid = (group: Group, paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
  put({ kind: 'solid', group, paths, tone, ...extra });
const line = (group: Group, d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => put({ kind: 'line', group, d, tone, free });
const dots = (group: Group, points: Point3[], size = 0.5, tone: Tone = 'mid') => put({ kind: 'dots', group, points: points.map(at), size, tone });
const live = (id: LiveId) => put({ kind: 'live', group: 'static', id });
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** Knurl lines on the visible side of a round part along any axis. */
export function knurlAlong(from: Point3, axis: Point3, r: number, length: number, count: number, phase = 0): string {
  const a = axis;
  const helper: Point3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Point3, q: Point3): Point3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const u0 = cross(a, helper);
  const ul = Math.hypot(...u0);
  const u: Point3 = scale(u0, 1 / ul);
  const v = cross(a, u);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const angle = phase + (i / count) * Math.PI * 2;
    const n = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
    if (dot3(n, V) < 0.18) continue;
    const p0 = add(from, scale(n, r));
    out.push(pathOf([at(add(p0, scale(a, 0.4))), at(add(p0, scale(a, length - 0.4)))]));
  }
  return out.join('');
}

// Base: a plate on four turned feet, with a seam, a groove and corner screws.
for (const [x, y] of byDepth([
  [BASE.x + 20, BASE.y + 14],
  [BASE.x + BASE.w - 20, BASE.y + 14],
  [BASE.x + 20, BASE.y + BASE.d - 14],
  [BASE.x + BASE.w - 20, BASE.y + BASE.d - 14],
])) {
  solid('static', cyl(x, y, 7, -BASE_H - FOOT_H, 1.4), 'lo');
  solid('static', cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.4, FOOT_H - 1.4), 'mid');
}
solid('static', slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: sideSeam(BASE, -BASE_H + 2.4, P, 8) });
line('static', planOutline(insetPlan(BASE, 4.5), 0, P), 'faint');
{
  const screws: Plane[] = [
    [BASE.x + 9, BASE.y + 9],
    [BASE.x + BASE.w - 9, BASE.y + 9],
    [BASE.x + 9, BASE.y + BASE.d - 9],
    [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9],
  ];
  line('static', screws.map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
  dots('static', screws.map(([x, y]) => [x, y, 0]), 0.5);
}

// A label plate at the back left, with three engraved rules.
solid('static', slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line('static', planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
line(
  'static',
  [0, 1, 2].map((row) => onTop([[LABEL.x + 7, LABEL.y + 3.4 + row * 2.6], [LABEL.x + (row === 1 ? 26 : 36), LABEL.y + 3.4 + row * 2.6]], 0.8, P)).join(''),
  'lo',
  true,
);
dots('static', [[LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8]], 0.45);

// The distance ruler in front of the rail: a tick every 5 centimetres from the lens, a long one every half metre.
solid('static', slab(RULER, 0, RULER_H, 2), 'lo', { crease: 'none' });
{
  const minor: string[] = [];
  const major: string[] = [];
  const steps = Math.round(RAIL_M / 0.05);
  for (let k = 0; k <= steps; k++) {
    const x = LENS_X - k * 0.05 * U;
    const big = k % 10 === 0;
    (big ? major : minor).push(lineOnTop([x, RULER.y], [x, RULER.y + (big ? 4.6 : 2.2)], RULER_H, P));
  }
  line('static', minor.join(''), 'lo');
  line('static', major.join(''), 'mid');
}

// The rail: a dovetail bar with a groove along its top and an end stop at the far end.
solid('static', slab(RAIL, 0, RAIL_H, 3, 0.6), 'mid', { inner: sideSeam(RAIL, RAIL_H - 2.2, P, 3) });
line('static', planOutline({ x: RAIL.x + 3, y: -1.6, w: RAIL.w - 6, d: 3.2, r: 1.2 }, RAIL_H, P), 'faint');
{
  const stop: Plan = { x: RAIL.x - 4, y: -11, w: 5, d: 22, r: 1.2 };
  solid('static', slab(stop, 0, RAIL_H + 5, 3, 0.5), 'mid');
  dots('static', [[stop.x + 2.5, -6, RAIL_H + 5], [stop.x + 2.5, 6, RAIL_H + 5]], 0.5);
}

// The staff's carriage, built at x = 0 and moved along the rail: saddle, clamp knob, the index blade over
// the ruler, a post with its collar, the bracket and the staff with its scale, zero line and target peg.
{
  const g: Group = 'carriage';
  solid(g, slab(SADDLE, SADDLE_Z[0], SADDLE_Z[1] - SADDLE_Z[0], 3, 0.6), 'mid', { inner: sideSeam(SADDLE, SADDLE_Z[0] + 3, P, 3) });
  dots(g, [[SADDLE.x + 3.4, SADDLE.y + 3.4, SADDLE_Z[1]], [SADDLE.x + 3.4, SADDLE.y + SADDLE.d - 3.4, SADDLE_Z[1]], [SADDLE.x + SADDLE.w - 3.4, SADDLE.y + 3.4, SADDLE_Z[1]]], 0.5);
  // Clamp knob on the front face: a neck and a knurled knob along +y.
  const knobAt: Point3 = [SADDLE.x + 6, SADDLE.y + SADDLE.d, 10];
  solid(g, discAlong(knobAt, [0, 1, 0], 1.6, 1.6, P, 16), 'mid');
  solid(g, discAlong(add(knobAt, [0, 1.6, 0]), [0, 1, 0], 3.4, 3.2, P, 28, 0.4), 'hi', { inner: knurlAlong(add(knobAt, [0, 1.6, 0]), [0, 1, 0], 3.4, 3.2, 22) });
  // Index blade: a tab down the saddle's front and a blade over the ruler with its hairline at the staff's face.
  // The blade and its hairline first, then the tab, whose face covers where the hairline starts.
  solid(g, slab({ x: -1.6, y: SADDLE.y + SADDLE.d, w: 3.2, d: 7.4, r: 0.5 }, 1.6, 0.8, 2), 'hi');
  line(g, lineOnTop([0, SADDLE.y + SADDLE.d + 0.6], [0, SADDLE.y + SADDLE.d + 7.4], 2.4, P), 'hi');
  solid(g, slab({ x: -1.6, y: SADDLE.y + SADDLE.d, w: 3.2, d: 1.2, r: 0.3 }, 1.6, SADDLE_Z[0] + 5 - 1.6, 2), 'mid');
  // Post on its collar, with a thumb screw.
  solid(g, cyl(POST.x, 0, POST.r + 1.6, SADDLE_Z[1], 3, 24, 0.4), 'mid');
  solid(g, cyl(POST.x, 0, POST.r, POST.z0, POST.z1 - POST.z0, 24), 'mid', { inner: sideArc(POST.x, 0, POST.r, POST.z0 + 5, P, 16) });
  // Bracket: a block on the post holding the staff's back.
  const bracket: Plan = { x: POST.x - 4, y: -5, w: -STAFF.t - (POST.x - 4), d: 10, r: 1 };
  solid(g, slab(bracket, POST.z1, STAFF.z0 + 9 - POST.z1, 2, 0.4), 'mid');
  dots(g, [[bracket.x + 2, -2.6, STAFF.z0 + 9], [bracket.x + 2, 2.6, STAFF.z0 + 9]], 0.45);
  // The staff: a plate whose face looks back up the rail at the camera.
  const staff = plateIn([0, 0, 0], [0, 1, 0], [0, 0, 1], [[STAFF.y0, STAFF.z0], [STAFF.y1, STAFF.z0], [STAFF.y1, STAFF.z1], [STAFF.y0, STAFF.z1]], -STAFF.t, P, 0.6);
  solid(g, staff, 'hi');
  // The scale on the face: a tick every 5 millimetres of miss rooted on its far edge, a long one every 10, and the
  // zero line across the whole face at lens height. The peg on the zero line is where the camera should look.
  const face = 0.02;
  const tick = (mm: number, length: number) => pathOf([at([face, STAFF.y0, LENS_Z + mm * M]), at([face, STAFF.y0 + length, LENS_Z + mm * M])]);
  const minor: string[] = [];
  const major: string[] = [];
  for (let mm = 5; mm <= SCALE_MM; mm += 5) (mm % 10 === 0 ? major : minor).push(tick(mm, mm % 10 === 0 ? 4.6 : 2.6));
  line(g, minor.join(''), 'lo');
  line(g, major.join(''), 'mid');
  line(g, pathOf([at([face, STAFF.y0, LENS_Z]), at([face, STAFF.y1, LENS_Z])]), 'mid');
  line(g, pathOf([at([face, 0, STAFF.z0]), at([face, 0, LENS_Z - PEG.r - 1.2])]), 'faint');
  dots(g, [[face, STAFF.y0 + 2.4, STAFF.z1 - 2.6], [face, STAFF.y1 - 2.4, STAFF.z1 - 2.6], [face, STAFF.y0 + 2.4, STAFF.z0 + 2.6], [face, STAFF.y1 - 2.4, STAFF.z0 + 2.6]], 0.45);
  solid(g, discAlong([0, 0, LENS_Z], [1, 0, 0], PEG.r + 1.2, 1, P, 24), 'mid');
  solid(g, discAlong([1, 0, LENS_Z], [1, 0, 0], PEG.r, PEG.length, P, 24, 0.3), 'hi');
  dots(g, [[1 + PEG.length, 0, LENS_Z]], 0.45, 'mid');
}

// The line the robot assumes the camera looks along (the rail's own line) and the camera's real one, the lit beam.
live('sight');
live('beam');

// The camera's carrier at the rail's near end, the micrometer under the camera's tail, and the yoke it tilts in.
solid('static', slab(CARRIER, CARRIER_Z[0], CARRIER_Z[1] - CARRIER_Z[0], 4, 0.8), 'mid', { inner: sideSeam(CARRIER, CARRIER_Z[0] + 3, P, 4) });
dots('static', [[CARRIER.x + 3.4, CARRIER.y + 3.2, CARRIER_Z[1]], [CARRIER.x + CARRIER.w - 3.4, CARRIER.y + 3.2, CARRIER_Z[1]], [CARRIER.x + CARRIER.w - 3.4, CARRIER.y + CARRIER.d - 3.2, CARRIER_Z[1]]], 0.5);
{
  const stop: Plan = { x: RAIL.x + RAIL.w - 1, y: -10, w: 4, d: 20, r: 1.2 };
  solid('static', slab(stop, 0, RAIL_H + 3, 3, 0.5), 'mid');
  dots('static', [[stop.x + 2, -5.5, RAIL_H + 3], [stop.x + 2, 5.5, RAIL_H + 3]], 0.45);
}
solid('static', cyl(MICRO.x, MICRO.y, 5.2, CARRIER_Z[1], 0.8, 28), 'lo');
live('thimble');
solid('static', cyl(MICRO.x, MICRO.y, 3, MICRO.sleeve[0], MICRO.sleeve[1] - MICRO.sleeve[0], 24, 0.3), 'mid');
{
  // The sleeve's scale: a datum line up its front with ticks off it.
  const facing = Math.atan2(V[1], V[0]);
  const px = MICRO.x + 3 * Math.cos(facing);
  const py = MICRO.y + 3 * Math.sin(facing);
  line('static', segment([px, py, MICRO.sleeve[0] + 0.3], [px, py, MICRO.sleeve[1] - 0.3], P), 'mid');
}
live('spindle');
// A cheek: a plate with a rounded top, its edge band one smooth surface (no creases between its facets).
const cheek = (y0: number, y1: number) =>
  prismAlong(
    roundedOutline(CHEEK.x[0], CARRIER_Z[1], CHEEK.x[1], LENS_Z + 4.2, 3.6, 6).map(([x, z]): Point3 => [x, y1, z]),
    [0, -(y1 - y0), 0],
    P,
    { round: true, bevel: 0.5 },
  );
solid('static', cheek(-CHEEK.y[1], -CHEEK.y[0]), 'mid');
live('lens');
solid('static', cheek(CHEEK.y[0], CHEEK.y[1]), 'mid');
solid('static', discAlong([LENS_X, CHEEK.y[1], LENS_Z], [0, 1, 0], 2.3, 1.4, P, 20, 0.3), 'hi');
dots('static', [[LENS_X - 2.2, CHEEK.y[1], CARRIER_Z[1] + 3], [LENS_X + 2.2, CHEEK.y[1], CARRIER_Z[1] + 3]], 0.45);
live('camera');

// The camera's junction box at the front right, which its cable runs down to.
solid('static', slab(JUNCTION, 0, JUNCTION_H, 3, 0.6), 'mid', { inner: sideSeam(JUNCTION, JUNCTION_H - 2.4, P, 3) });
line('static', ring(JUNCTION.x + 6, JUNCTION.y + JUNCTION.d / 2, 2.2, JUNCTION_H, P, 16), 'lo');
live('cable');

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------------- live pieces
/** The rail's line from the lens to the peg: where the robot assumes the camera looks. */
export const sightTo = (distanceM: number) => pathOf([at(PIVOT), at([staffX(distanceM) + 1 + PEG.length, 0, LENS_Z])]);
/** The beam from the lens to the spot on the staff: where the tilted camera really looks. */
export const beamTo = (missMm: number, distanceM: number) => pathOf([at(PIVOT), at(spotAt(missMm, distanceM))]);
/** The spot's screen point. */
export const spotPoint = (missMm: number, distanceM: number) => at(spotAt(missMm, distanceM));
/** How far, on screen, a beam that passes over the staff's top fades out before its end. */
export const BEAM_FADE = 26;

/**
 * The beam on screen: from the lens to the spot. A miss bigger than the scale passes over the staff's top, so
 * that beam has no spot: its last `BEAM_FADE` units fade out (`fadeFrom` to `to`) instead of ending in the air.
 */
export function beamOf(missMm: number, distanceM: number) {
  const from = at(PIVOT);
  const over = overTop(missMm);
  // Over the top, the beam runs on past the staff's top edge, to the staff's plane or to the top of the drawing,
  // whichever comes first, and fades out there.
  const spot = at(spotAt(missMm, distanceM));
  const top = 8;
  const share = over && spot[1] < top ? (from[1] - top) / (from[1] - spot[1]) : 1;
  const to: Flat = [from[0] + (spot[0] - from[0]) * share, from[1] + (spot[1] - from[1]) * share];
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const k = over ? Math.max(0, 1 - BEAM_FADE / length) : 1;
  const fadeFrom: Flat = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  return { from, to, fadeFrom, over };
}

/** A rectangle across the camera's axis at s, for its body: four sharp edges, each with one crease. */
function sectionAt(frame: ReturnType<typeof frameOf>, s: number, hu: number, hv: number): Point3[] {
  return [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]].map(([u, v]) => frame.point(s, u, v));
}

export interface CameraPose {
  hood: SolidPaths;
  barrel: SolidPaths;
  mount: SolidPaths;
  body: SolidPaths;
  connector: SolidPaths;
  screws: Flat[];
  connectorAt: Point3;
}

/** The camera at a drawn tilt (radians): hood, barrel, mount ring, body and the cable connector on its back. */
export function cameraAt(tilt: number): CameraPose {
  const f = frameOf(tilt);
  const back = scale(f.forward, -1);
  const body = prismAlong(sectionAt(f, CAMERA.body[0], CAMERA.half[0], CAMERA.half[1]), scale(back, CAMERA.body[1] - CAMERA.body[0]), P, { bevel: 0.6 });
  const barrel = discAlong(f.point(CAMERA.barrel[0], 0, 0), back, CAMERA.barrelR, CAMERA.barrel[1] - CAMERA.barrel[0], P, 32);
  const hood = discAlong(f.point(CAMERA.hood[0], 0, 0), back, CAMERA.hoodR, CAMERA.hood[1] - CAMERA.hood[0], P, 32, 0.4);
  const mount = discAlong(f.point(CAMERA.barrel[1] - 1.4, 0, 0), back, CAMERA.barrelR + 1.3, 1.4, P, 32);
  const connectorAt = f.point(CAMERA.body[1], 0, -1.5);
  const connector = discAlong(connectorAt, back, 2, 2.2, P, 20, 0.3);
  const screws = [f.point(CAMERA.body[0] + 3, CAMERA.half[0], CAMERA.half[1] - 2.4), f.point(CAMERA.body[1] - 3, CAMERA.half[0], CAMERA.half[1] - 2.4), f.point(CAMERA.body[0] + 3, CAMERA.half[0], -CAMERA.half[1] + 2.4), f.point(CAMERA.body[1] - 3, CAMERA.half[0], -CAMERA.half[1] + 2.4)].map(at);
  return { hood, barrel, mount, body, connector, screws, connectorAt: add(connectorAt, scale(back, 2.2)) };
}

/** Where the camera's underside meets the micrometer's spindle, z. */
export function spindleTop(tilt: number): number {
  const s = (MICRO.x - LENS_X + CAMERA.half[1] * Math.sin(tilt)) / Math.cos(tilt);
  return LENS_Z - s * Math.sin(tilt) - CAMERA.half[1] * Math.cos(tilt);
}

/** The micrometer's spindle, from the sleeve up to the camera's underside. */
export const spindleAt = (tilt: number) => cyl(MICRO.x, MICRO.y, 1.3, MICRO.sleeve[1], spindleTop(tilt) - MICRO.sleeve[1], 16);

/** The thimble, its knurl turned by the setting (one turn per degree of tilt). */
export function thimbleAt(tiltDeg: number) {
  const paths = cyl(MICRO.x, MICRO.y, 4.4, MICRO.thimble[0] + 0.8, MICRO.thimble[1] - MICRO.thimble[0] - 0.8, 32, 0.4);
  const knurl = knurlAlong([MICRO.x, MICRO.y, MICRO.thimble[0] + 0.8], [0, 0, 1], 4.4, MICRO.thimble[1] - MICRO.thimble[0] - 0.8, 30, tiltDeg * Math.PI * 2);
  return { paths, knurl };
}

/** The cable from the camera's connector, back off the camera and down to the junction box. */
export function cableAt(tilt: number) {
  const from = cameraAt(tilt).connectorAt;
  const end: Point3 = [JUNCTION.x + 6, JUNCTION.y + JUNCTION.d / 2, JUNCTION_H];
  const x = RAIL.x + RAIL.w - 4.5;
  return { from: at(from), to: at(end), via: [at([x, from[1], from[2]]), at([x, 0, RAIL_H + 9]), at([x, end[1], RAIL_H + 9]), at([end[0], end[1], RAIL_H + 9])] };
}

/** The resting pose's numbers, for tests and previews. */
export const SCREEN = { at, PIVOT };
