/**
 * The guide-fence bench for SafetyFilterFence, drawn with the isometric kit.
 *
 * The object is the explanation. A learned policy cannot be certified, so
 * what ships wraps it in something simple enough to check: a safety filter
 * that takes the policy's proposal and changes it only as much as staying
 * safe needs. On this bench a sealed box (the policy: no window, a tamper
 * seal, nothing to inspect) swings a two-link arm over a work plate. The
 * arm's spindle is where the policy aims. A pen carriage hangs from the
 * spindle on a spring and draws on the plate. Round the keep-out zone stands
 * a ring fence, the filter and the one lit part. Where the policy's aim
 * stays outside the ring, the pen sits right under the spindle and draws
 * the proposal unchanged. Where the aim goes inside, the fence holds the
 * pen at the ring and the spring pulls it to the point on the ring nearest
 * the aim: the smallest change that keeps it out, which is what a safety
 * filter computes.
 *
 * The geometry is illustrative; no number is claimed. World units are about
 * a quarter of a millimetre: x along the plate, y toward the viewer, z up.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  roundedPlan,
  sideArc,
  sideSeam,
  slabOf,
  towardViewer,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
  SHADES,
} from '../iso-kit.ts';

export const WIDTH = 600;
export const AZIMUTH = 50;
export const ELEVATION = 38;

// ----------------------------------------------------------------- the layout
const PLATE: Plan = { x: -92, y: -56, w: 236, d: 138, r: 10 };
const PLATE_Z = 10;
const PLATE_H = 7;
const TOP = PLATE_Z + PLATE_H;
/** The work plate the pen draws on. */
const WORK: Plan = { x: -84, y: -48, w: 168, d: 122, r: 6 };
export const WORK_TOP = TOP + 6;

/** The keep-out zone and its ring fence. */
export const ZONE = { x: 14, y: -2 };
export const FENCE_IN = 32;
export const FENCE_OUT = 36;
const FENCE_H = 10;
/** The pen carriage's foot: its centre (the pen) can come no closer to the zone's centre than this. */
export const FOOT_R = 7;
export const KEEP_OUT = FENCE_OUT + FOOT_R;
const PASS = 30;
const SPAN = 80;
const BOW = 26;
const STROKE_TILT_DEG = 22;

/** The sealed policy box beside the plate, and the arm's shoulder on its output shaft. */
const BOX: Plan = { x: 92, y: -26, w: 44, d: 38, r: 3 };
const BOX_TOP = TOP + 38;
export const SHOULDER: Plane = [BOX.x + BOX.w / 2, BOX.y + BOX.d / 2];
const LINK = 96;
const ARM_Z = BOX_TOP + 5;
const LINK_T = 3;
/** The spindle hangs from the arm's tip; its eye and the pen carriage's eye hold the spring. */
const SPINDLE_EYE_Z = WORK_TOP + 33;
const PEN_TOP = WORK_TOP + 21;

// ------------------------------------------------------------------ the model
/**
 * The policy's proposed stroke: a smooth sweep from the back of the plate
 * to its front that bows into the zone from its left as the reader sees it,
 * so the pen's detour round the fence and the spring's stretch lie across
 * the view. Illustrative: built from the zone's place and the camera's
 * direction.
 */
const VIEW_DIR: Plane = [Math.cos((AZIMUTH * Math.PI) / 180), Math.sin((AZIMUTH * Math.PI) / 180)];
const SCREEN_LEFT: Plane = [-VIEW_DIR[1], VIEW_DIR[0]];
const TILT = (STROKE_TILT_DEG * Math.PI) / 180;
/** From the stroke toward the zone (to the right on screen, tipped back by TILT), and along the stroke (toward the viewer). */
const TOWARD: Plane = [-SCREEN_LEFT[0] * Math.cos(TILT) - VIEW_DIR[0] * Math.sin(TILT), -SCREEN_LEFT[1] * Math.cos(TILT) - VIEW_DIR[1] * Math.sin(TILT)];
const ALONG: Plane = [-TOWARD[1], TOWARD[0]];
const STROKE: [Plane, Plane, Plane] = [
  [ZONE.x - PASS * TOWARD[0] - SPAN * ALONG[0], ZONE.y - PASS * TOWARD[1] - SPAN * ALONG[1]],
  [ZONE.x - (PASS - 2 * BOW) * TOWARD[0], ZONE.y - (PASS - 2 * BOW) * TOWARD[1]],
  [ZONE.x - PASS * TOWARD[0] + SPAN * ALONG[0], ZONE.y - PASS * TOWARD[1] + SPAN * ALONG[1]],
];
export function proposalAt(t: number): Plane {
  const u = 1 - t;
  const [a, b, c] = STROKE;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
}

/** How far a point is from the zone's centre. */
export const fromZone = ([x, y]: Plane) => Math.hypot(x - ZONE.x, y - ZONE.y);

/**
 * The safety filter: the nearest point to the proposal that keeps the pen
 * out of the zone. Outside, the proposal itself; inside, its projection onto
 * the keep-out circle. A spring pulling the pen toward the aim, against a
 * rigid fence, settles at exactly this point.
 */
export function filtered(point: Plane): Plane {
  const distance = fromZone(point);
  if (distance >= KEEP_OUT) return point;
  const [dx, dy] = distance > 1e-9 ? [(point[0] - ZONE.x) / distance, (point[1] - ZONE.y) / distance] : [0, 1];
  return [ZONE.x + KEEP_OUT * dx, ZONE.y + KEEP_OUT * dy];
}

/** The stroke sampled finely: proposal and pen at every step. */
export const SAMPLES = 360;
export const STROKE_POINTS = Array.from({ length: SAMPLES + 1 }, (_, k) => {
  const t = k / SAMPLES;
  const aim = proposalAt(t);
  return { t, aim, pen: filtered(aim) };
});

/** Where the aim enters and leaves the zone, and where it reaches deepest: the still pose. */
const insideSamples = STROKE_POINTS.filter(({ aim }) => fromZone(aim) < KEEP_OUT);
export const ENTER_T = insideSamples[0]!.t;
export const LEAVE_T = insideSamples[insideSamples.length - 1]!.t;
export const DEEPEST_T = STROKE_POINTS.reduce((best, sample) => (fromZone(sample.aim) < fromZone(best.aim) ? sample : best)).t;

/** The pen's ink from the start of the stroke to `t`. */
export function inkTo(t: number): Plane[] {
  const points = STROKE_POINTS.filter((sample) => sample.t <= t + 1e-9).map(({ pen }) => pen);
  if (t > 0 && t < 1) points.push(filtered(proposalAt(t)));
  return points;
}

/** The arm's elbow for an aim: two equal links from the shoulder, the elbow always on the same hand (behind the reach), so the arm never flips. */
export function elbowFor(aim: Plane): Plane {
  const dx = aim[0] - SHOULDER[0];
  const dy = aim[1] - SHOULDER[1];
  const reach = Math.min(Math.hypot(dx, dy), 2 * LINK - 1e-6);
  const along = Math.atan2(dy, dx);
  const spread = Math.acos(reach / (2 * LINK));
  const a = along + spread;
  return [SHOULDER[0] + LINK * Math.cos(a), SHOULDER[1] + LINK * Math.sin(a)];
}

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(PLATE, 10)) extremes.push([px, py, 0], [px, py, TOP]);
for (const [px, py] of roundedPlan(BOX, 3)) extremes.push([px, py, BOX_TOP]);
// The arm at every point of the stroke, so the fit holds all of it.
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
for (let k = 0; k <= 40; k++) {
  const aim = proposalAt(k / 40);
  const elbow = elbowFor(aim);
  extremes.push([elbow[0], elbow[1], ARM_Z + 2 * LINK_T + 2], [aim[0], aim[1], ARM_Z + 2 * LINK_T + 2]);
}
const flatExtremes = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 8;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const face3 = (points: Point3[]) => pathOf(points.map(at), true);

// ------------------------------------------------------------------- parts
export type Slot = 'ink' | 'pen-back' | 'pen-front' | 'arm';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
const into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => into.push({ kind: 'line', d, tone, free });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => into.push({ kind: 'face', d, fill });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}

/** Points round an arc on a horizontal plane. */
const arcAt = (cx: number, cy: number, r: number, z: number, a0: number, a1: number, steps = 40): Point3[] =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / steps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z] as Point3;
  });

/**
 * One half of a standing ring wall, as the kit's solid paths. The near half
 * shows its outer face, the far half its inner face (seen through the
 * ring); both show their half of the top. Split so a part inside or behind
 * the ring is drawn between the two halves.
 */
export function ringHalf(cx: number, cy: number, inner: number, outer: number, z: number, height: number, half: 'near' | 'far'): SolidPaths {
  const [vx, vy] = towardViewer(P);
  const facing = Math.atan2(vy, vx);
  const top = z + height;
  const [a0, a1] = half === 'near' ? [facing - Math.PI / 2, facing + Math.PI / 2] : [facing + Math.PI / 2, facing + (3 * Math.PI) / 2];
  const wallR = half === 'near' ? outer : inner;
  const steps = 48;
  const topOuter = arcAt(cx, cy, outer, top, a0, a1, steps);
  const topInner = arcAt(cx, cy, inner, top, a0, a1, steps);
  const wallTop = arcAt(cx, cy, wallR, top, a0, a1, steps);
  const wallBottom = arcAt(cx, cy, wallR, z, a0, a1, steps);
  const annulus = pathOf([...topOuter, ...[...topInner].reverse()].map(at), true);
  const wall = pathOf([...wallTop, ...[...wallBottom].reverse()].map(at), true);
  // The wall's tone in bands by how it faces the kit's light: the outer face lit like a cylinder, the inner face the other way round.
  const buckets: string[][] = Array.from({ length: SHADES }, () => []);
  const lightAngle = Math.atan2(Math.cos((AZIMUTH * Math.PI) / 180), -Math.sin((AZIMUTH * Math.PI) / 180));
  for (let k = 0; k < steps; k++) {
    const a = a0 + ((a1 - a0) * (k + 0.5)) / steps;
    const normal = half === 'near' ? a : a + Math.PI;
    const lit = (Math.cos(normal - lightAngle) + 1) / 2;
    const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
    buckets[shade]!.push(pathOf([wallTop[k]!, wallTop[k + 1]!, wallBottom[k + 1]!, wallBottom[k]!].map(at), true));
  }
  const outline =
    half === 'near'
      ? pathOf(wallBottom.map(at)) + pathOf(topOuter.map(at)) + pathOf(topInner.map(at)) + pathOf([at(topOuter[0]!), at(wallBottom[0]!)]) + pathOf([at(topOuter[steps]!), at(wallBottom[steps]!)])
      : pathOf(topOuter.map(at)) + pathOf(wallBottom.map(at));
  return {
    fill: annulus + wall,
    outline,
    crease: half === 'far' ? pathOf(topInner.map(at)) : '',
    top: annulus,
    shades: buckets.map((paths) => paths.join('')),
  };
}

// ------------------------------------------------------------------ the base
for (const [x, y] of byDepth(corners(PLATE, 13))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, PLATE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, PLATE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, PLATE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(PLATE, PLATE_Z, PLATE_H, 10, 1.2), 'lo', { inner: sideSeam(PLATE, PLATE_Z + 2.6, P, 10) });
line(planOutline(insetPlan(PLATE, 4.5), TOP, P, 10), 'faint');
for (const [x, y] of corners(PLATE, 10)) screw(x, y, TOP, 2.1);
const LABEL: Plan = { x: 94, y: 50, w: 44, d: 10, r: 1.4 };
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.8], [1, 0.52]] as const) {
  const y = LABEL.y + 3.2 + k * 2.8;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 12) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');

// ------------------------------------------------------------ the sealed box
{
  solid(slab(BOX, TOP, BOX_TOP - TOP, 3, 0.8), 'mid', { inner: sideSeam(BOX, BOX_TOP - 7, P, 3) });
  line(planOutline(insetPlan(BOX, 3.5), BOX_TOP, P, 3), 'faint');
  for (const [x, y] of corners(BOX, 6)) screw(x, y, BOX_TOP, 1.8);
  // The tamper seal: a strap across the lid seam on the front, with its crimped seal; nothing inside can be inspected.
  const front = BOX.y + BOX.d;
  const sx = BOX.x + BOX.w * 0.62;
  solid(extrude([[sx - 3, front], [sx + 3, front], [sx + 3, front + 0.8], [sx - 3, front + 0.8]], BOX_TOP - 14, 12, P), 'lo');
  const disc: Point3[] = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    disc.push([sx + 2.6 * Math.cos(a), front + 0.8, BOX_TOP - 8 + 2.6 * Math.sin(a)]);
  }
  face(face3(disc), 'top');
  line(face3(disc), 'mid');
  // The output shaft's collar on the lid.
  solid(cyl(SHOULDER[0], SHOULDER[1], 9, BOX_TOP, 2.2, 36, 0.4), 'mid');
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    dots([at([SHOULDER[0] + 7.4 * Math.cos(a), SHOULDER[1] + 7.4 * Math.sin(a), BOX_TOP + 2.2])], 0.45, 'mid');
  }
}

// ------------------------------------------------------------ the work plate
solid(slab(WORK, TOP, WORK_TOP - TOP, 6, 0.8), 'mid', { inner: sideSeam(WORK, TOP + 2.6, P, 6) });
line(planOutline(insetPlan(WORK, 4), WORK_TOP, P, 6), 'faint');
for (const [x, y] of corners(WORK, 8)) screw(x, y, WORK_TOP, 1.8);
// The keep-out zone: a darker inlay set flush in the plate, inside the fence.
{
  const inlay = arcAt(ZONE.x, ZONE.y, FENCE_IN, WORK_TOP, 0, Math.PI * 2, 72);
  face(face3(inlay), 1);
}
slot('ink');
slot('pen-back');
// The fence: the far half first, then the pen if it is in front of the zone's centre, then the near half.
solid(ringHalf(ZONE.x, ZONE.y, FENCE_IN, FENCE_OUT, WORK_TOP, FENCE_H, 'far'), 'hi', { lit: true });
slot('pen-front');
solid(ringHalf(ZONE.x, ZONE.y, FENCE_IN, FENCE_OUT, WORK_TOP, FENCE_H, 'near'), 'hi', { lit: true });
// Six bolts down through the fence's top hold it to the plate.
dots(Array.from({ length: 6 }, (_, k) => {
  const a = (k / 6) * Math.PI * 2 + 0.26;
  const r = (FENCE_IN + FENCE_OUT) / 2;
  return at([ZONE.x + r * Math.cos(a), ZONE.y + r * Math.sin(a), WORK_TOP + FENCE_H]);
}), 0.6, 'mid');
slot('arm');

// ---------------------------------------------------------- the moving parts
/** A coil along any segment, split into the half behind its axis and the half in front. */
function coilBetween(a: Point3, b: Point3, radius: number, turns: number) {
  const axis: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...axis) || 1;
  const w: Point3 = [axis[0] / length, axis[1] / length, axis[2] / length];
  const helper: Point3 = Math.abs(w[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Point3, q: Point3): Point3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const u0 = cross(w, helper);
  const ul = Math.hypot(...u0);
  const u: Point3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul];
  const v = cross(w, u);
  const [vx, vy] = towardViewer(P);
  const view: Point3 = [vx * Math.cos((ELEVATION * Math.PI) / 180), vy * Math.cos((ELEVATION * Math.PI) / 180), Math.sin((ELEVATION * Math.PI) / 180)];
  const count = Math.max(12, Math.round(turns * 24));
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let k = 0; k <= count; k++) {
    const share = k / count;
    const angle = share * turns * Math.PI * 2;
    const n: Point3 = [u[0] * Math.cos(angle) + v[0] * Math.sin(angle), u[1] * Math.cos(angle) + v[1] * Math.sin(angle), u[2] * Math.cos(angle) + v[2] * Math.sin(angle)];
    const point: Point3 = [a[0] + axis[0] * share + radius * n[0], a[1] + axis[1] * share + radius * n[1], a[2] + axis[2] * share + radius * n[2]];
    // A tolerance, so a sample exactly on the limb falls the same way in every JavaScript engine (server and browser).
    const facing = n[0] * view[0] + n[1] * view[1] + n[2] * view[2] > 1e-9;
    const flat = at(point);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(''), front: front.join('') };
}

/** A flat link from `a` to `b` at height z, with round ends. */
function linkPlan(a: Plane, b: Plane, width: number): Plane[] {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const points: Plane[] = [];
  const r = width / 2;
  for (let k = 0; k <= 10; k++) {
    const t = angle - Math.PI / 2 + (k / 10) * Math.PI;
    points.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]);
  }
  for (let k = 0; k <= 10; k++) {
    const t = angle + Math.PI / 2 + (k / 10) * Math.PI;
    points.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]);
  }
  return points;
}

/** The pen carriage at `pen`: a sliding foot, its body and the eye the spring hooks into. */
export function penParts(pen: Plane): Part[] {
  const [x, y] = pen;
  return [
    { kind: 'solid', paths: cyl(x, y, FOOT_R, WORK_TOP, 2, 40, 0.4), tone: 'mid' },
    { kind: 'solid', paths: cyl(x, y, 4.8, WORK_TOP + 2, PEN_TOP - WORK_TOP - 4.6, 32, 0.3), tone: 'hi', inner: sideArc(x, y, 4.8, WORK_TOP + 5.5, P, 20) },
    { kind: 'solid', paths: cyl(x, y, 2.6, PEN_TOP - 2.6, 2.6, 20, 0.3), tone: 'mid' },
  ];
}

/** The arm for an aim and the pen's place: links, hubs, the spindle down to its eye, and the spring to the pen. */
export function armParts(aim: Plane, pen: Plane): Part[] {
  const parts: Part[] = [];
  const elbow = elbowFor(aim);
  // The spring from the pen's eye up to the spindle's eye: short and upright when the pen is under the aim, stretched when the fence holds it off.
  const coil = coilBetween([pen[0], pen[1], PEN_TOP], [aim[0], aim[1], SPINDLE_EYE_Z], 1.7, 6);
  parts.push({ kind: 'line', d: coil.back, tone: 'lo' });
  // The spindle: down from the arm's tip to its eye.
  parts.push({ kind: 'solid', paths: cyl(aim[0], aim[1], 1.6, SPINDLE_EYE_Z + 1.6, ARM_Z - SPINDLE_EYE_Z - 1.6, 18), tone: 'mid' });
  parts.push({ kind: 'solid', paths: cyl(aim[0], aim[1], 2.6, SPINDLE_EYE_Z, 1.6, 22, 0.2), tone: 'mid' });
  parts.push({ kind: 'line', d: coil.front, tone: 'mid' });
  // The shoulder hub on the box's shaft, the lower link, the elbow, the upper link and the tip hub.
  parts.push({ kind: 'solid', paths: cyl(SHOULDER[0], SHOULDER[1], 6.4, ARM_Z - 4, 4, 32, 0.4), tone: 'mid' });
  parts.push({ kind: 'solid', paths: extrude(linkPlan(SHOULDER, elbow, 8), ARM_Z, LINK_T, P, { bevel: 0.5 }), tone: 'mid' });
  parts.push({ kind: 'solid', paths: cyl(elbow[0], elbow[1], 5.6, ARM_Z + LINK_T, 1.2, 28, 0.3), tone: 'lo' });
  parts.push({ kind: 'solid', paths: extrude(linkPlan(elbow, aim, 7.4), ARM_Z + LINK_T + 1.2, LINK_T, P, { bevel: 0.5 }), tone: 'mid' });
  for (const [px, py, z] of [[SHOULDER[0], SHOULDER[1], ARM_Z + LINK_T], [elbow[0], elbow[1], ARM_Z + 2 * LINK_T + 1.2], [aim[0], aim[1], ARM_Z + 2 * LINK_T + 1.2]] as const) {
    parts.push({ kind: 'line', d: ring(px, py, 2.2, z, P, 16), tone: 'lo' });
    parts.push({ kind: 'line', d: lineOnTop([px - 1.5, py + 1.5], [px + 1.5, py - 1.5], z, P), tone: 'lo' });
  }
  return parts;
}

/** The ink the pen has laid from the start to `t`, and the stroke's start and end marks. */
export function inkParts(t: number): Part[] {
  const ink = inkTo(t);
  const parts: Part[] = [];
  const start = STROKE_POINTS[0]!.aim;
  const end = STROKE_POINTS[SAMPLES]!.aim;
  // The proposal, as the policy drew it before the filter: faint, from the start mark to the end mark.
  parts.push({ kind: 'line', d: pathOf(STROKE_POINTS.map(({ aim }) => at([aim[0], aim[1], WORK_TOP]))), tone: 'lo' });
  if (ink.length > 1) parts.push({ kind: 'line', d: pathOf(ink.map(([x, y]) => at([x, y, WORK_TOP]))), tone: 'hi' });
  parts.push({ kind: 'dots', points: [at([start[0], start[1], WORK_TOP]), at([end[0], end[1], WORK_TOP])], size: 1.3, tone: 'hi' });
  return parts;
}

/** Every moving part at `t` along the stroke, by slot. The pen is drawn before the fence when it is behind the zone's centre. */
export function movingAt(t: number): Record<Slot, Part[]> {
  const aim = proposalAt(t);
  const pen = filtered(aim);
  const behind = depthOf([pen[0], pen[1], 0], P) < depthOf([ZONE.x, ZONE.y, 0], P);
  const pens = penParts(pen);
  return {
    ink: inkParts(t),
    'pen-back': behind ? pens : [],
    'pen-front': behind ? [] : pens,
    arm: armParts(aim, pen),
  };
}

/** Where the stroke stands at `t`: before, inside or after the zone, or done. */
export function phaseAt(t: number): 'before' | 'inside' | 'after' | 'done' {
  if (t >= 1 - 1e-9) return 'done';
  const aim = proposalAt(t);
  if (fromZone(aim) < KEEP_OUT) return 'inside';
  return t < ENTER_T ? 'before' : 'after';
}
