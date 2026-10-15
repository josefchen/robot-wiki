/**
 * The push bench for AppearancePhysicsPush, drawn with the isometric kit.
 *
 * The object is the explanation: a test bench that pushes things. A slide
 * projector on a post shines the picture of a mug onto a friction plate, and
 * a spring plunger at the left end fires along the plate. With only the
 * picture there, the plunger shoots straight through the light: a picture
 * has nothing to push against. Set the real mug (its weighted base and felt
 * pad are the shape, weight and friction) on the plate from its stand at the
 * back, and the same plunger strikes it and slides it along the ruler, d =
 * v²/2μg, until friction stops it or it meets the end stop at 50 cm. The
 * picture stays where the projector throws it.
 *
 * World units are millimetres: x along the bench (the push), y toward the
 * viewer, z up from the bench top. The mug's track is x = 0 (where it is set
 * down, the ruler's zero) to x = 500 (50 cm). Static parts are built once;
 * the plunger is rebuilt for its stroke, and the mug moves as one group.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideSeam,
  slabOf,
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong, prismAlong } from '../prism.ts';

export const WIDTH = 640;
export const HEIGHT = 316;
export const AZIMUTH = 58;

/** Slots the component fills, in painter's order. */
export type SlotId = 'switch' | 'picture' | 'ghosts' | 'plunger' | 'mug' | 'knob' | 'rod-back' | 'front';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'fill'; d: string; shade: 0 | 1 | 2 | 3 | 'top' | 'paper' }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; id: SlotId };

// ---------------------------------------------------------------- layout
const BENCH: Plan = { x: -292, y: -158, w: 882, d: 276, r: 12 };
const BENCH_H = 14;
const FOOT_H = 8;
/** The friction plate the mug slides on, and its top. */
const PLATE: Plan = { x: -274, y: -50, w: 852, d: 100, r: 4 };
export const PLATE_TOP = 3;
/** The track: the mug's centre runs from x = 0 to x = TRACK_MM. */
export const TRACK_MM = 500;
/** The mug: weighted base disc, felt pad and body. */
const MUG_R = 40;
const MUG_H = 96;
const BASE_R = 38;
/** The ruler strip in front of the plate, its zero under the mug's start. */
const RULER: Plan = { x: -22, y: 52, w: 546, d: 11, r: 1 };
const RULER_H = 1.2;
/** The plunger's axis, and the housing it slides through. */
const AXIS_Z = 46;
const HOUSING: Plan = { x: -150, y: -17, w: 35, d: 34, r: 3 };
const HOUSING_TOP = 62;
/** The sled the plunger rides on: a base plate on four wheels, rolled up behind the mug before each push. */
const SLED: Plan = { x: -198, y: -24, w: 104, d: 48, r: 4 };
const WHEEL_R = 5.5;
const SLED_Z = PLATE_TOP + WHEEL_R + 1.5;
const SLED_H = 5;
const GLAND_FRONT = HOUSING.x + HOUSING.w + 4;
const GLAND_BACK = HOUSING.x - 4;
const ROD_R = 3.4;
/** Rod offset s along x: 0 is the plunger let down, its pad 8 mm short of the mug's face. */
const TIP_AT_REST = -MUG_R - 8;
const KNOB_LEN = 15;
const KNOB_R = 11;
const KNOB_FRONT_AT_REST = -228;
const COLLAR_AT_REST = -74;
const PAD_LEN = 5;
const PAD_R = 10;
/** The longest stroke: the knob comes up against the back gland. */
export const STROKE_MAX = GLAND_BACK - KNOB_FRONT_AT_REST;
/** The stroke at which the pad meets a mug standing at the start. */
export const STROKE_CONTACT = -MUG_R - TIP_AT_REST;
/** The projector's post, its head over the start, and the lens throwing the picture down. */
const POST = { x: 0, y: -116, r: 6.4, top: 186 };
const HEAD: Plan = { x: -26, y: -28, w: 52, d: 46, r: 4 };
const HEAD_Z = 166;
const HEAD_TOP = 192;
const LENS = { x: 0, y: -5, r: 11, z: 148 };
/** The patch of light on the plate, and the picture in it. */
const PATCH = { x0: -62, x1: 62, y0: -45, y1: 45 };
/** The stand at the back where the real mug waits. */
export const STAND = { x: 156, y: -104 };
const STAND_R = 46;
const STAND_H = 6;
/** The switch box beside the post. */
const SWITCH_BOX: Plan = { x: 40, y: -146, w: 50, d: 30, r: 3 };
const SWITCH_H = 18;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BENCH.x, BENCH.x + BENCH.w]) for (const py of [BENCH.y, BENCH.y + BENCH.d]) {
  extremes.push([px, py, -BENCH_H - FOOT_H], [px, py, 0]);
}
extremes.push([HEAD.x, HEAD.y, HEAD_TOP + 12], [HEAD.x + HEAD.w, HEAD.y + HEAD.d, HEAD_TOP + 12], [POST.x, POST.y - 10, POST.top + 8]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
/** A horizontal disc or rod along +x from `x0`, centred on the plunger's axis. */
const alongX = (x0: number, length: number, r: number, steps = 28, bevel = 0) => discAlong([x0, 0, AXIS_Z], [1, 0, 0], r, length, P, steps, bevel);
/** A closed outline on the vertical face y = `y`, from (x, z) points. */
const faceY = (y: number, points: Array<[number, number]>) => pathOf(points.map(([x, z]) => at([x, y, z])), true);
/** A rounded slot on the face y = `y`, its centre line from x0 to x1 at height z, half-height r. */
function slotY(y: number, x0: number, x1: number, z: number, r: number) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI;
    points.push([x0 + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    points.push([x1 + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  return faceY(y, points);
}

// ---------------------------------------------------------------- static parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const screwsAt = (points: Plane[], z: number, r = 2.4) => {
  put({ kind: 'line', d: points.map(([x, y]) => ring(x, y, r, z, P, 16)).join(''), tone: 'lo' });
  put({ kind: 'dots', points: points.map(([x, y]) => at([x, y, z])), size: 0.5 });
};

// The bench: a thick top on four turned feet, with a seam round its edge, a groove and corner screws.
for (const [x, y] of byDepth([
  [BENCH.x + 34, BENCH.y + 28],
  [BENCH.x + BENCH.w - 34, BENCH.y + 28],
  [BENCH.x + 34, BENCH.y + BENCH.d - 28],
  [BENCH.x + BENCH.w - 34, BENCH.y + BENCH.d - 28],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 11, -BENCH_H - FOOT_H, 2), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 8, -BENCH_H - FOOT_H + 2, FOOT_H - 2), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(BENCH, -BENCH_H, BENCH_H, 8, 1.6), tone: 'mid', inner: sideSeam(BENCH, -BENCH_H + 4, P, 8) });
put({ kind: 'line', d: planOutline(insetPlan(BENCH, 7), 0, P), tone: 'faint' });
screwsAt([
  [BENCH.x + 15, BENCH.y + 15],
  [BENCH.x + BENCH.w - 15, BENCH.y + 15],
  [BENCH.x + 15, BENCH.y + BENCH.d - 15],
  [BENCH.x + BENCH.w - 15, BENCH.y + BENCH.d - 15],
], 0);

// The stand at the back where the real mug waits: a turned base disc and three locating pins behind the mug.
put({ kind: 'solid', paths: cyl(STAND.x, STAND.y, STAND_R + 6, 0, 2, 40), tone: 'lo' });
put({ kind: 'solid', paths: cyl(STAND.x, STAND.y, STAND_R, 2, STAND_H - 2, 40, 0.6), tone: 'mid' });
for (const angle of [200, 240, 280]) {
  const a = (angle * Math.PI) / 180;
  const [vx, vy] = [Math.cos(a), Math.sin(a)];
  put({ kind: 'solid', paths: cyl(STAND.x + vx * (BASE_R + 4.4), STAND.y + vy * (BASE_R + 4.4), 2.6, STAND_H, 9, 14), tone: 'mid' });
}

// The projector's foot plate, the switch box beside it and the cable between them.
const FOOT_PLATE: Plan = { x: POST.x - 24, y: POST.y - 26, w: 48, d: 48, r: 3 };
const FOOT_PLATE_EDGE = FOOT_PLATE.x + FOOT_PLATE.w;
put({ kind: 'solid', paths: slab(FOOT_PLATE, 0, 4, 4, 0.6), tone: 'lo' });
screwsAt([
  [FOOT_PLATE.x + 6, FOOT_PLATE.y + 6],
  [FOOT_PLATE.x + FOOT_PLATE.w - 6, FOOT_PLATE.y + 6],
  [FOOT_PLATE.x + 6, FOOT_PLATE.y + FOOT_PLATE.d - 6],
  [FOOT_PLATE.x + FOOT_PLATE.w - 6, FOOT_PLATE.y + FOOT_PLATE.d - 6],
], 4, 1.8);
put({ kind: 'solid', paths: slab(SWITCH_BOX, 0, SWITCH_H, 4, 0.6), tone: 'mid', inner: sideSeam(SWITCH_BOX, 5, P, 4) });
put({ kind: 'line', d: planOutline(insetPlan(SWITCH_BOX, 3), SWITCH_H, P, 4), tone: 'faint' });
put({ kind: 'dots', points: [[SWITCH_BOX.x + 5, SWITCH_BOX.y + 5], [SWITCH_BOX.x + SWITCH_BOX.w - 5, SWITCH_BOX.y + 5], [SWITCH_BOX.x + 5, SWITCH_BOX.y + SWITCH_BOX.d - 5], [SWITCH_BOX.x + SWITCH_BOX.w - 5, SWITCH_BOX.y + SWITCH_BOX.d - 5]].map(([x, y]) => at([x!, y!, SWITCH_H])), size: 0.5 });
put({ kind: 'slot', id: 'switch' });
{
  // The cable leaves the box's left face and enters the post's foot plate at its side.
  const from: Point3 = [SWITCH_BOX.x, SWITCH_BOX.y + 15, 7];
  const to: Point3 = [FOOT_PLATE_EDGE, POST.y - 4, 2.2];
  put({ kind: 'wire', from: at(from), via: [at([SWITCH_BOX.x - 8, SWITCH_BOX.y + 15, 0.6]), at([FOOT_PLATE_EDGE + 6, POST.y - 4, 0.6])], to: at(to), tone: 'lo' });
}

// The post: a base collar, the column with seam rings, a clamp block at the top.
put({ kind: 'solid', paths: cyl(POST.x, POST.y, 9.4, 4, 9, 28, 0.5), tone: 'mid' });
put({ kind: 'solid', paths: cyl(POST.x, POST.y, POST.r, 13, POST.top - 13, 24), tone: 'mid', inner: [60, 120].map((z) => sideArc(POST.x, POST.y, POST.r, z, P, 16)).join('') });

// The friction plate, its hold-down screws and the ruler in front of it.
put({ kind: 'solid', paths: slab(PLATE, 0, PLATE_TOP, 4, 0.5), tone: 'mid', crease: 'lo' });
put({ kind: 'line', d: planOutline(insetPlan(PLATE, 4), PLATE_TOP, P, 4), tone: 'faint' });
screwsAt([-262, 566].flatMap((x) => [[x, -40], [x, 40]] as Plane[]), PLATE_TOP, 2.2);
put({ kind: 'solid', paths: slab(RULER, 0, RULER_H, 3), tone: 'lo', crease: 'none' });
{
  const ticks = topTicks(10, TRACK_MM, 10, 5, RULER.y + 0.2, RULER_H, [3.4, 6.4], P);
  put({ kind: 'line', d: ticks.minor, tone: 'lo' });
  put({ kind: 'line', d: ticks.major, tone: 'mid' });
  put({ kind: 'line', d: lineOnTop([0, RULER.y + 0.2], [0, RULER.y + 8.4], RULER_H, P), tone: 'hi' });
}

// The label plate on the bench's front right: rules standing for print, two screws.
{
  const label: Plan = { x: -250, y: 70, w: 104, d: 24, r: 2 };
  put({ kind: 'solid', paths: slab(label, 0, 1, 3), tone: 'lo', crease: 'none' });
  put({ kind: 'line', d: planOutline(insetPlan(label, 1.8), 1, P, 3), tone: 'faint' });
  put({ kind: 'line', d: [[8, 74], [13, 54], [18, 64]].map(([dy, len]) => lineOnTop([label.x + 10, label.y + dy!], [label.x + 10 + len!, label.y + dy!], 1, P)).join(''), tone: 'lo', free: true });
  put({ kind: 'dots', points: [at([label.x + 4.6, label.y + label.d / 2, 1]), at([label.x + label.w - 4.6, label.y + label.d / 2, 1])], size: 0.5 });
}

// The picture of the mug, the beam and the scuffs the real mug left, all on or over the plate.
put({ kind: 'slot', id: 'ghosts' });
put({ kind: 'slot', id: 'picture' });

// The plunger rides on its sled (live: the component moves the sled and works the rod).
put({ kind: 'slot', id: 'plunger' });

// The real mug (live), then the end stop at 50 cm.
put({ kind: 'slot', id: 'mug' });
{
  const stop: Plan = { x: TRACK_MM + MUG_R + 5, y: -24, w: 18, d: 48, r: 2 };
  put({ kind: 'solid', paths: slab(stop, PLATE_TOP, 30, 4, 0.6), tone: 'mid', inner: sideSeam(stop, PLATE_TOP + 8, P, 4) });
  put({ kind: 'dots', points: [at([stop.x + 9, stop.y + 8, PLATE_TOP + 30]), at([stop.x + 9, stop.y + stop.d - 8, PLATE_TOP + 30])], size: 0.5 });
  put({ kind: 'solid', paths: slab({ x: TRACK_MM + MUG_R + 1, y: -16, w: 4, d: 32, r: 1.6 }, PLATE_TOP + 7, 16, 3), tone: 'lo' });
}

// The projector: clamp on the post, the arm forward over the plate, the head with its lamp house, the lens.
{
  const clamp: Plan = { x: POST.x - 10, y: POST.y - 10, w: 20, d: 20, r: 2.4 };
  put({ kind: 'solid', paths: slab(clamp, POST.top - 16, 22, 3, 0.5), tone: 'mid' });
  put({ kind: 'solid', paths: cyl(POST.x + 13, POST.y, 3, POST.top - 9, 8, 14), tone: 'lo' });
  put({ kind: 'line', d: knurl(POST.x + 13, POST.y, 3, POST.top - 9, POST.top - 1, 10, P), tone: 'lo' });
  const arm: Plan = { x: POST.x - 7, y: POST.y + 8, w: 14, d: HEAD.y - POST.y - 6, r: 2 };
  put({ kind: 'solid', paths: slab(arm, POST.top - 6, 10, 3, 0.4), tone: 'mid' });
  put({ kind: 'solid', paths: cyl(LENS.x, LENS.y, LENS.r + 3, LENS.z + 8, HEAD_Z - LENS.z - 8, 32, 0.4), tone: 'mid' });
  put({ kind: 'solid', paths: cyl(LENS.x, LENS.y, LENS.r, LENS.z, 8, 32), tone: 'lo', inner: sideArc(LENS.x, LENS.y, LENS.r, LENS.z + 4, P, 20) });
  put({ kind: 'solid', paths: slab(HEAD, HEAD_Z, HEAD_TOP - HEAD_Z, 6, 1), tone: 'mid', inner: sideSeam(HEAD, HEAD_Z + 7, P, 6) });
  put({ kind: 'line', d: [0, 1, 2].map((i) => slotY(HEAD.y + HEAD.d, HEAD.x + 10, HEAD.x + 30, HEAD_Z + 13 + i * 4.4, 1.2)).join(''), tone: 'lo' });
  const lamp: Plan = { x: HEAD.x + 8, y: HEAD.y + 6, w: 36, d: 30, r: 3 };
  put({ kind: 'solid', paths: slab(lamp, HEAD_TOP, 10, 4, 0.6), tone: 'mid' });
  put({ kind: 'line', d: [0, 1, 2, 3].map((i) => lineOnTop([lamp.x + 6 + i * 8, lamp.y + 3], [lamp.x + 6 + i * 8, lamp.y + lamp.d - 3], HEAD_TOP + 10, P)).join(''), tone: 'faint' });
  put({ kind: 'line', d: planOutline(insetPlan(lamp, 3), HEAD_TOP + 10, P, 4), tone: 'faint' });
  // The focus knob on the head's right side.
  put({ kind: 'solid', paths: discAlong([HEAD.x + HEAD.w, 0, HEAD_Z + 13], [1, 0, 0], 6, 6, P, 24, 0.4), tone: 'hi' });
}

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------------- live parts
/** The rod offset at rest for a push strength: the knob pulled back two millimetres a newton. */
export const cockedStroke = (forceN: number) => -2 * forceN;

/** The sled's own parts, built at home, back to front: far wheels, base, housing with both glands and its grip. */
function sledParts(): { far: Part[]; middle: Part[]; near: Part[] } {
  const wheel = (x: number, y: number) => discAlong([x, y, PLATE_TOP + WHEEL_R], [0, 1, 0], WHEEL_R, 4, P, 24, 0.3);
  const xs = [SLED.x + 14, SLED.x + SLED.w - 14];
  const far: Part[] = xs.map((x) => ({ kind: 'solid', paths: wheel(x, SLED.y - 4.5), tone: 'lo' }) as Part);
  const middle: Part[] = [];
  middle.push({ kind: 'solid', paths: slab(SLED, SLED_Z, SLED_H, 4, 0.6), tone: 'mid', inner: sideSeam(SLED, SLED_Z + 2, P, 4) });
  middle.push({ kind: 'dots', points: [[SLED.x + 6, SLED.y + 6], [SLED.x + SLED.w - 6, SLED.y + 6], [SLED.x + 6, SLED.y + SLED.d - 6], [SLED.x + SLED.w - 6, SLED.y + SLED.d - 6]].map(([x, y]) => at([x!, y!, SLED_Z + SLED_H])), size: 0.5 });
  middle.push({ kind: 'slot', id: 'knob' });
  middle.push({ kind: 'slot', id: 'rod-back' });
  middle.push({ kind: 'solid', paths: alongX(GLAND_BACK, 4, 7.2, 24, 0.4), tone: 'mid' });
  middle.push({ kind: 'solid', paths: slab(HOUSING, SLED_Z + SLED_H, HOUSING_TOP - SLED_Z - SLED_H, 4, 0.8), tone: 'mid', inner: sideSeam(HOUSING, SLED_Z + SLED_H + 8, P, 4) });
  middle.push({ kind: 'line', d: planOutline(insetPlan(HOUSING, 3), HOUSING_TOP, P, 4), tone: 'faint' });
  // A grip on the housing to roll the sled by.
  const gx = HOUSING.x + HOUSING.w / 2;
  middle.push({ kind: 'solid', paths: cyl(gx, 0, 3, HOUSING_TOP, 8, 16), tone: 'mid' });
  middle.push({ kind: 'solid', paths: cyl(gx, 0, 6.5, HOUSING_TOP + 8, 7, 28, 0.5), tone: 'hi' });
  middle.push({ kind: 'line', d: knurl(gx, 0, 6.5, HOUSING_TOP + 8, HOUSING_TOP + 15, 22, P), tone: 'lo' });
  middle.push({ kind: 'solid', paths: alongX(HOUSING.x + HOUSING.w, 4, 7.2, 24, 0.4), tone: 'mid' });
  middle.push({ kind: 'slot', id: 'front' });
  const near: Part[] = xs.map((x) => ({ kind: 'solid', paths: wheel(x, SLED.y + SLED.d + 0.5), tone: 'lo' }) as Part);
  return { far, middle, near };
}
export const SLED_PARTS = sledParts();

/** The knob and its knurl, built with the plunger let down (stroke 0); moved along x by the stroke. */
export function knobParts(): Part[] {
  const knobFront = KNOB_FRONT_AT_REST;
  const out: Part[] = [];
  out.push({ kind: 'solid', paths: alongX(knobFront - KNOB_LEN, KNOB_LEN, KNOB_R, 32, 0.6), tone: 'hi' });
  const lines: string[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const n: Point3 = [0, Math.cos(a), Math.sin(a)];
    if (depthOf(n, P) < 0.2) continue;
    lines.push(pathOf([at([knobFront - KNOB_LEN + 2.4, n[1] * KNOB_R, AXIS_Z + n[2] * KNOB_R]), at([knobFront - 2.4, n[1] * KNOB_R, AXIS_Z + n[2] * KNOB_R])]));
  }
  out.push({ kind: 'line', d: lines.join(''), tone: 'lo' });
  return out;
}

/** The rod behind the housing at stroke `s`: from the knob's face into the back gland. */
export const rodBack = (s: number) => alongX(KNOB_FRONT_AT_REST + s, Math.max(0.5, GLAND_BACK - KNOB_FRONT_AT_REST - s), ROD_R, 20);

/** The collar and pad on the rod's end, built at stroke 0. */
export function headParts(): Part[] {
  return [
    { kind: 'solid', paths: alongX(COLLAR_AT_REST, 5, 7.6, 24, 0.4), tone: 'mid' },
    { kind: 'solid', paths: alongX(TIP_AT_REST - PAD_LEN, PAD_LEN, PAD_R, 28, 0.4), tone: 'hi' },
  ];
}

/** Translate by a stroke `s` along the plunger's axis, or the sled by `c` along the track. */
export const alongTrack = (by: number) => translateAlong(P, [by, 0, 0]);

/** The spring and rod in front of the housing at stroke `s`: the coil from the front gland to the collar. */
export function rodFront(s: number): { back: string; rod: SolidPaths; front: string } {
  const coil = cylCoil(GLAND_FRONT, COLLAR_AT_REST + s, 6.4, 6);
  return { back: coil.back, rod: alongX(GLAND_FRONT, TIP_AT_REST + s - PAD_LEN - GLAND_FRONT, ROD_R, 20), front: coil.front };
}

/** A coil spring round the plunger's axis from x0 to x1. */
function cylCoil(x0: number, x1: number, r: number, turns: number) {
  const count = Math.round(turns * 18);
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const a = t * turns * Math.PI * 2;
    const point: Point3 = [x0 + (x1 - x0) * t, Math.cos(a) * r, AXIS_Z + Math.sin(a) * r];
    const facing = depthOf([0, Math.cos(a), Math.sin(a)], P) > 0;
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

/** The real mug, built standing at the start of the track: felt pad, weighted base, body, rim, handle, index tab. */
export function mugParts(): Part[] {
  const out: Part[] = [];
  const z0 = PLATE_TOP;
  out.push({ kind: 'solid', paths: cyl(0, 0, BASE_R, z0, 1.6, 40), tone: 'lo', crease: 'none' });
  out.push({ kind: 'solid', paths: cyl(0, 0, BASE_R + 1, z0 + 1.6, 6, 44, 0.5), tone: 'mid' });
  // The index tab under the body, pointing at the ruler.
  out.push({ kind: 'solid', paths: slab({ x: -1.6, y: BASE_R - 2, w: 3.2, d: RULER.y + 3 - BASE_R + 2, r: 0.8 }, z0 + 1.6, 1.4, 2), tone: 'hi' });
  const body = cyl(0, 0, MUG_R, z0 + 7.6, MUG_H, 48, 0.8);
  out.push({ kind: 'solid', paths: body, lit: true, inner: sideArc(0, 0, MUG_R, z0 + 7.6 + 10, P, 32) });
  // The open top: the inside of the far wall, the inner lip.
  out.push({ kind: 'fill', d: pathOf(circlePts(0, 0, MUG_R - 3.4, z0 + 7.6 + MUG_H), true), shade: 1 });
  out.push({ kind: 'line', d: ring(0, 0, MUG_R - 3.4, z0 + 7.6 + MUG_H, P, 48), tone: 'lit' });
  // The handle on the body's +x side: a D-shaped loop in the plane y = 0, with the hole through it.
  const handle = handleOf();
  out.push({ kind: 'solid', paths: handle.loop, lit: true });
  out.push({ kind: 'fill', d: handle.hole, shade: 'paper' });
  out.push({ kind: 'line', d: handle.hole, tone: 'lit' });
  return out;
}

function circlePts(cx: number, cy: number, r: number, z: number, steps = 48): Flat[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return at([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  });
}

/** The handle: an outer D swept 7 mm across, and the hole through it on its near face. */
function handleOf(): { loop: SolidPaths; hole: string } {
  const z0 = PLATE_TOP + 7.6;
  const mid = z0 + MUG_H / 2 + 4;
  const half = 30;
  const root = MUG_R - 2.6;
  const outer: Point3[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI / 2 - (i / 16) * Math.PI;
    outer.push([root + Math.cos(a) * 21, -3.5, mid + Math.sin(a) * half]);
  }
  const loop = prismAlong(outer, [0, 7, 0], P, { round: true });
  const hole: Flat[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI / 2 - (i / 16) * Math.PI;
    hole.push(at([MUG_R + 0.4 + Math.cos(a) * 11, 3.5, mid + Math.sin(a) * (half - 8)]));
  }
  return { loop, hole: pathOf(hole, true) };
}

/** Where the mug is drawn: on the plate at `positionMm` along the track, or `parked` on its stand at the back. */
export function mugOffset(positionMm: number, lift = 0, parked = 0): Point3 {
  const x = positionMm * (1 - parked) + STAND.x * parked;
  const y = STAND.y * parked;
  const z = (STAND_H - PLATE_TOP) * parked + lift;
  return [x, y, z];
}
export const mugTransform = (offset: Point3) => translateAlong(P, offset);

/** The patch of light the projector throws on the plate, the picture in it and the beam from the lens. */
export function pictureOf(): { beam: string; beamEdges: string; patch: string; lines: string; table: string } {
  const z = PLATE_TOP;
  const corners: Point3[] = [
    [PATCH.x0, PATCH.y0, z],
    [PATCH.x1, PATCH.y0, z],
    [PATCH.x1, PATCH.y1, z],
    [PATCH.x0, PATCH.y1, z],
  ];
  const lensRing: Point3[] = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return [LENS.x + Math.cos(a) * (LENS.r - 1.5), LENS.y + Math.sin(a) * (LENS.r - 1.5), LENS.z];
  });
  const flat = [...corners, ...lensRing].map(at);
  const hull = hullOf(flat);
  // The beam's two side edges: hull edges that join a lens point to a patch corner.
  const cornerSet = new Set(corners.map(at).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`));
  const isCorner = (p: Flat) => cornerSet.has(`${p[0].toFixed(2)},${p[1].toFixed(2)}`);
  const edges: string[] = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    if (isCorner(a) !== isCorner(b)) edges.push(pathOf([a, b]));
  }
  // The picture: a mug seen from the side, as the slide shows it, lying in the patch with its top toward the back.
  const s = 0.82;
  const u0 = -6;
  const toWorld = (u: number, v: number): Flat => at([u0 + u * s, 38 - v * s, z]);
  const body: Flat[] = [];
  const W = 40;
  const H = 92;
  const R = 9;
  body.push(toWorld(-W, H));
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * (Math.PI / 2);
    body.push(toWorld(-W + R + Math.cos(a) * R, R + Math.sin(a) * R));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (3 * Math.PI) / 2 + (i / 6) * (Math.PI / 2);
    body.push(toWorld(W - R + Math.cos(a) * R, R + Math.sin(a) * R));
  }
  body.push(toWorld(W, H));
  const rim: Flat[] = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return toWorld(Math.cos(a) * W, H + Math.sin(a) * 5);
  });
  const handle: Flat[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 - (i / 10) * Math.PI;
    handle.push(toWorld(W + Math.cos(a) * 16, 46 + Math.sin(a) * 24));
  }
  const handleIn: Flat[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 - (i / 10) * Math.PI;
    handleIn.push(toWorld(W + Math.cos(a) * 8, 46 + Math.sin(a) * 14));
  }
  const shine = [toWorld(-W + 10, H - 12), toWorld(-W + 16, H - 12), toWorld(-W + 16, 18), toWorld(-W + 10, 18)];
  const shadow: Flat[] = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return toWorld(Math.cos(a) * (W + 10), -2 + Math.sin(a) * 3.2);
  });
  return {
    beam: pathOf(hull, true),
    beamEdges: edges.join(''),
    patch: pathOf(corners.map(at), true),
    lines: [pathOf(body, true), pathOf(rim, true), pathOf(handle), pathOf(handleIn), pathOf(shine, true)].join(''),
    table: pathOf(shadow, true),
  };
}

function hullOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Flat[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i]!;
    while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The lens glass, seen from below as the beam leaves it. */
export const lensGlass = () => pathOf(circlePts(LENS.x, LENS.y, LENS.r - 1.5, LENS.z), true);

/** A scuff ring on the plate where the mug's felt pad stood before a push. */
export const scuffAt = (positionMm: number) => ring(positionMm, 0, BASE_R + 0.5, PLATE_TOP, P, 40);

/** The rocker switch on the box, on or off, and the pilot lamp beside it. */
export function switchParts(on: boolean): { bezel: SolidPaths; rocker: SolidPaths; lamp: string; lampRing: string } {
  const cx = SWITCH_BOX.x + 18;
  const cy = SWITCH_BOX.y + SWITCH_BOX.d / 2;
  const bezel = slab({ x: cx - 7, y: cy - 5, w: 14, d: 10, r: 1.4 }, SWITCH_H, 1.2, 3);
  const tilt = on ? 1 : -1;
  const z = SWITCH_H + 1.2;
  const rocker = prismAlong(
    [[cx - 5.5, cy - 3.6, z + 1 + tilt * 1.6], [cx + 5.5, cy - 3.6, z + 1 - tilt * 1.6], [cx + 5.5, cy - 3.6, z], [cx - 5.5, cy - 3.6, z]],
    [0, 7.2, 0],
    P,
  );
  const lx = SWITCH_BOX.x + SWITCH_BOX.w - 12;
  return { bezel, rocker, lamp: pathOf(circlePts(lx, cy, 3.2, SWITCH_H), true), lampRing: ring(lx, cy, 4.4, SWITCH_H, P, 24) };
}

// ---------------------------------------------------------------- the push, in time
/** What the bench draws: the sled's place `c`, the rod's stroke `s`, the mug at `x` mm and how far it is `parked` off the plate. */
export type Pose = { c: number; s: number; x: number; parked: number };
/** One push, played once the mug is on the plate: where the sled fires from and what happens to the mug. */
export type Push = { c: number; from: number; to: number; body: boolean; moves: boolean; forceN: number };
/** A push as a function of time: the bench's pose and the readout's words at that instant. */
export type Script = { duration: number; at: (t: number) => { pose: Pose; phase: string } };
/** The slide's physics: launch speed v0 (m/s), friction's slowing (m/s²), the free sliding distance (mm), and how much slower than real time it plays. */
export type Slide = { v0: number; decel: number; free: number; slow: number };

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** The pad's face along x at stroke `s` with the sled at `c`. */
export const padFace = (s: number, c = 0) => TIP_AT_REST + s + c;

/**
 * A push in time. The sled rolls up behind the mug, the plunger is let go and its pad meets the mug's face (or, with
 * nothing on the plate, shoots on through the picture to the end of its stroke). A mug that can move leaves at v0 and
 * friction slows it evenly, so after u seconds of real time it has gone free × (1 − (1 − u/T)²), T = v0 / decel, until
 * it stops or meets the end stop. The pad rides the mug while the impulse lasts, then the spring draws the rod back.
 */
export function pushTimeline(start: Pose, push: Push, slide: Slide): Script {
  const cock = cockedStroke(push.forceN);
  // A push asked for while the last one still plays first brings the mug the rest of the way, with the sled.
  const travel = Math.max(Math.abs(push.c - start.c), Math.abs(push.from - start.x));
  const roll = travel > 0.5 ? 0.35 + travel / 420 : 0;
  const release = 0.16;
  const reach = push.body ? STROKE_CONTACT : STROKE_MAX;
  const sliding = push.moves ? (slide.v0 / slide.decel) * slide.slow : 0;
  const slid = (u: number) => {
    if (!push.moves) return 0;
    const share = Math.min(1, u / sliding);
    return Math.min(slide.free * (1 - (1 - share) * (1 - share)), push.to - push.from);
  };
  const hold = push.moves ? 0.1 : push.body ? 0.28 : 0.12;
  const back = 0.5;
  const fired = roll + release;
  const duration = fired + Math.max(sliding, hold + back);
  const at = (t: number) => {
    const pose: Pose = { c: push.c, s: cock, x: push.from, parked: start.parked };
    if (t < roll) {
      pose.c = start.c + (push.c - start.c) * smooth(t / roll);
      pose.x = start.x + (push.from - start.x) * smooth(t / roll);
      pose.s = start.s;
      return { pose, phase: 'rolling the plunger up to the mug' };
    }
    if (t < fired) {
      const k = (t - roll) / release;
      pose.s = start.s + (reach - start.s) * k * k;
      return { pose, phase: push.body ? 'releasing the plunger' : 'the plunger passes through the picture' };
    }
    const u = Math.min(t, duration) - fired;
    pose.x = push.from + slid(u);
    const held = reach + slid(Math.min(u, hold));
    pose.s = u < hold ? held : held + (cock - held) * smooth((u - hold) / back);
    const phase = push.moves
      ? `sliding · ${(pose.x / 10).toFixed(1)} centimetres from the start`
      : push.body
        ? 'struck, and nothing works out the motion'
        : 'the plunger passes through the picture';
    return { pose, phase };
  };
  return { duration, at };
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
