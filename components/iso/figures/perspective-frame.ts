/**
 * The perspective frame for KeypointString, drawn with the isometric kit.
 *
 * The object is the explanation, after Dürer's drawing machine. A camera
 * stands on a post at the left; its image is a framed grid of threads
 * standing between it and the table. The vision-language model's point is
 * the ring on the grid. A string, the one lit part, runs from the camera's
 * lens through that ring: every point on it shows up at the same place in
 * the image. A depth camera beside the lens casts a faint beam to the first
 * surface on that line, the toolbox's handle. Paying the string out to that
 * depth puts its bead, the arm's target, on the handle; short of it, the
 * bead hangs in the air on the same line.
 *
 * World units are the model's (lib/keypoint-lift.ts); x to the right, y
 * toward the viewer, z up.
 */
import {
  cylinder as kitCylinder,
  depthOf,
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
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { EYE, HANDLE_BAR, HANDLE_POSTS, IMAGE_X, PICKED, PIXEL, READING, TABLE, TOOLBOX, liftTo, type Box, type Vec } from '../../../lib/keypoint-lift.ts';

export const WIDTH = 600;
export const AZIMUTH = 40;
export const ELEVATION = 24;

// ----------------------------------------------------------------- the layout
const TOP = TABLE;
const BASE: Plan = { x: -114, y: -40, w: 194, d: 72, r: 9 };
const BASE_Z = 10;

/** The camera: its post, and the body whose right face carries the lens and the depth camera's window. */
const POST: Plane = [-93, EYE[1]];
const CAM: Plan = { x: -100, y: EYE[1] - 10, w: 14, d: 20, r: 1.6 };
const CAM_Z = EYE[2] - 8;
const CAM_TOP = EYE[2] + 8;
export const DEPTH_EYE: Vec = [EYE[0], EYE[1] - 6.5, EYE[2]];

/** The frame: two uprights and two bars round a window of threads, in the plane x = IMAGE_X. */
const FRAME_T = 4;
const WIN_Y0 = -28;
const WIN_Y1 = 14;
const WIN_Z0 = TOP + 46;
const WIN_Z1 = TOP + 82;
const UPRIGHTS: Plan[] = [
  { x: IMAGE_X - FRAME_T / 2, y: WIN_Y0 - FRAME_T, w: FRAME_T, d: FRAME_T, r: 0.6 },
  { x: IMAGE_X - FRAME_T / 2, y: WIN_Y1, w: FRAME_T, d: FRAME_T, r: 0.6 },
];
const BAR: Plan = { x: IMAGE_X - FRAME_T / 2, y: WIN_Y0 - FRAME_T, w: FRAME_T, d: WIN_Y1 - WIN_Y0 + 2 * FRAME_T, r: 0.6 };
const THREAD = 6;

const LABEL: Plan = { x: -104, y: 14, w: 40, d: 9, r: 1.4 };

// ----------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const [px, py] of roundedPlan(BASE, 8)) extremes.push([px, py, 0], [px, py, TOP]);
for (const [px, py] of roundedPlan(CAM, 2)) extremes.push([px, py, CAM_TOP]);
for (const [px, py] of roundedPlan(BAR, 1)) extremes.push([px, py, WIN_Z1 + FRAME_T]);
const stage0 = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, stage0));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
const PAD_VB = 6;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3 | Vec) => iso(point as Point3, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const face3 = (points: (Point3 | Vec)[], closed = true) => pathOf(points.map(at), closed);
const planOf = (box: Box): Plan => ({ x: box.min[0], y: box.min[1], w: box.max[0] - box.min[0], d: box.max[1] - box.min[1], r: 0.6 });
/** A circle in a plane of constant x (a face toward the camera's right). */
const xCircle = (x: number, cy: number, cz: number, r: number, steps = 32): Point3[] =>
  Array.from({ length: steps }, (_, k) => {
    const a = (k / steps) * Math.PI * 2;
    return [x, cy + r * Math.cos(a), cz + r * Math.sin(a)] as Point3;
  });

// ------------------------------------------------------------------- parts
export type Slot = 'string-back' | 'beam-back' | 'string-front';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; weight?: number }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 'paper' | 'top' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

export const PARTS: Part[] = [];
let into: Part[] = PARTS;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => into.push({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end', weight?: number) => into.push({ kind: 'line', d, tone, free, weight });
const dots = (points: Flat[], size = 0.5, tone: Tone = 'mid') => into.push({ kind: 'dots', points, size, tone });
const face = (d: string, fill: Extract<Part, { kind: 'face' }>['fill']) => into.push({ kind: 'face', d, fill });
const slot = (name: Slot) => into.push({ kind: 'slot', slot: name });
function collect(build: () => void): Part[] {
  const list: Part[] = [];
  const saved = into;
  into = list;
  build();
  into = saved;
  return list;
}
function screw(x: number, y: number, z: number, r = 1.8) {
  line(ring(x, y, r, z, P, 14), 'lo');
  line(lineOnTop([x - r * 0.7, y + r * 0.7], [x + r * 0.7, y - r * 0.7], z, P), 'lo');
}

/** Where the segment from a to b crosses the image plane. */
function onImage(a: Vec, b: Vec): Vec {
  const t = (IMAGE_X - a[0]) / (b[0] - a[0]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** The depth camera's beam to the first surface, and where it crosses the frame. */
const BEAM_AT_IMAGE = onImage(DEPTH_EYE, PICKED);
export const PIXEL_POINT: Vec = [IMAGE_X, PIXEL.y, PIXEL.z];

// ------------------------------------------------------------------ the base
for (const [x, y] of byDepth(corners(BASE, 15))) {
  solid(cyl(x, y, 8, 0, 2, 28, 0.4), 'lo');
  solid(cyl(x, y, 5.6, 2, BASE_Z - 4, 24), 'mid', { inner: sideArc(x, y, 5.6, BASE_Z / 2, P, 18) });
  solid(cyl(x, y, 7, BASE_Z - 2, 2, 26, 0.3), 'lo');
}
solid(slab(BASE, BASE_Z, TOP - BASE_Z, 10, 1.2), 'lo', { inner: sideSeam(BASE, BASE_Z + 2.6, P, 10) });
line(planOutline(insetPlan(BASE, 4.5), TOP, P, 10), 'faint');
for (const [x, y] of corners(BASE, 10)) screw(x, y, TOP, 2.1);
solid(slab(LABEL, TOP, 0.8, 3), 'lo');
for (const [k, share] of [[0, 0.82], [1, 0.58], [2, 0.36]] as const) {
  const y = LABEL.y + 2.6 + k * 2.3;
  line(lineOnTop([LABEL.x + 5, y], [LABEL.x + 5 + (LABEL.w - 12) * share, y], TOP + 0.8, P), 'lo', true);
}
dots([at([LABEL.x + 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d / 2, TOP + 0.8])], 0.42, 'mid');

// ------------------------------------------------------- the camera on its post
{
  const foot: Plan = { x: POST[0] - 10, y: POST[1] - 10, w: 20, d: 20, r: 2.5 };
  solid(slab(foot, TOP, 4, 3, 0.5), 'mid', { inner: sideSeam(foot, TOP + 1.6, P, 3) });
  for (const [x, y] of corners(foot, 3.4)) screw(x, y, TOP + 4, 1.2);
  solid(cyl(POST[0], POST[1], 4.2, TOP + 4, 3, 28, 0.3), 'mid');
  solid(cyl(POST[0], POST[1], 2.6, TOP + 7, CAM_Z - 4 - TOP - 7, 22), 'mid', { inner: sideArc(POST[0], POST[1], 2.6, TOP + 30, P, 16) });
  solid(cyl(POST[0], POST[1], 4.6, CAM_Z - 4, 4, 28, 0.3), 'mid');
  solid(slab(CAM, CAM_Z, CAM_TOP - CAM_Z, 2, 0.6), 'mid', { inner: sideSeam(CAM, CAM_TOP - 3.4, P, 2) });
  line(planOutline(insetPlan(CAM, 2.4), CAM_TOP, P, 2), 'faint');
  for (const [x, y] of [[CAM.x + 3, CAM.y + 3], [CAM.x + CAM.w - 3, CAM.y + CAM.d - 3]] as const) screw(x, y, CAM_TOP, 1.1);
  // The lens: a bezel, its glass and the centre the string leaves from; the depth camera's smaller window beside it.
  const x = CAM.x + CAM.w;
  face(face3(xCircle(x, EYE[1], EYE[2], 4.2, 40)), 'top');
  line(face3(xCircle(x, EYE[1], EYE[2], 4.2, 40)), 'mid');
  line(face3(xCircle(x, EYE[1], EYE[2], 2.6, 32)), 'lo');
  face(face3(xCircle(x, DEPTH_EYE[1], DEPTH_EYE[2], 1.9, 24)), 2);
  line(face3(xCircle(x, DEPTH_EYE[1], DEPTH_EYE[2], 1.9, 24)), 'mid');
  dots([at([x, CAM.y + CAM.d - 2.6, CAM_TOP - 2.6])], 0.55, 'hi');
}
slot('string-back');
slot('beam-back');

// ------------------------------------------------------------ the frame
{
  // Each upright on a screwed foot.
  for (const upright of UPRIGHTS) {
    const foot = insetPlan(upright, -4);
    solid(slab(foot, TOP, 3, 2, 0.4), 'mid');
    dots([at([foot.x + foot.w / 2, foot.y + 1.4, TOP + 3]), at([foot.x + foot.w / 2, foot.y + foot.d - 1.4, TOP + 3])], 0.42, 'mid');
  }
  // The threads: a grid in the frame's plane, every one running bar to bar or upright to upright.
  for (let y = WIN_Y0 + THREAD; y < WIN_Y1 - 1e-9; y += THREAD) line(face3([[IMAGE_X, y, WIN_Z0], [IMAGE_X, y, WIN_Z1]], false), 'faint');
  for (let z = WIN_Z0 + THREAD; z < WIN_Z1 - 1e-9; z += THREAD) line(face3([[IMAGE_X, WIN_Y0, z], [IMAGE_X, WIN_Y1, z]], false), 'faint');
  solid(slab(BAR, WIN_Z0 - FRAME_T, FRAME_T, 2, 0.4), 'mid');
  solid(slab(UPRIGHTS[0]!, TOP + 3, WIN_Z1 + FRAME_T - TOP - 3, 2, 0.4), 'mid');
  solid(slab(BAR, WIN_Z1, FRAME_T, 2, 0.4), 'mid');
  solid(slab(UPRIGHTS[1]!, TOP + 3, WIN_Z1 + FRAME_T - TOP - 3, 2, 0.4), 'mid');
  dots([UPRIGHTS[0]!, UPRIGHTS[1]!].map((upright) => at([upright.x + upright.w, upright.y + upright.d / 2, WIN_Z1 + FRAME_T / 2])), 0.45, 'mid');
  dots([UPRIGHTS[0]!, UPRIGHTS[1]!].map((upright) => at([upright.x + upright.w, upright.y + upright.d / 2, WIN_Z0 - FRAME_T / 2])), 0.45, 'mid');
  // The model's point on the image: a ring on the grid.
  line(face3(xCircle(IMAGE_X, PIXEL.y, PIXEL.z, 2.4, 28)), 'hi', undefined, 0.9);
}

// ------------------------------------------------------------- the toolbox
{
  const body = planOf(TOOLBOX);
  const lid = TOOLBOX.max[2];
  solid(slab(body, TOP, lid - TOP, 2, 0.8), 'mid', { inner: sideSeam(body, lid - 6, P, 2) });
  line(planOutline(insetPlan(body, 3), lid, P, 2), 'faint');
  for (const [x, y] of corners(body, 5.5)) screw(x, y, lid, 1.4);
  // Two latches over the lid's seam on the front.
  for (const x of [body.x + 12, body.x + body.w - 12]) {
    solid(slab({ x: x - 3, y: body.y + body.d, w: 6, d: 1.2, r: 0.4 }, lid - 10, 8, 2, 0.2), 'lo');
    dots([at([x, body.y + body.d + 1.2, lid - 4])], 0.42, 'mid');
  }
  // The carry handle: two posts and the bar the model points at.
  for (const post of HANDLE_POSTS) solid(slab(planOf(post), post.min[2], post.max[2] - post.min[2], 2, 0.3), 'mid');
  solid(slab(planOf(HANDLE_BAR), HANDLE_BAR.min[2], HANDLE_BAR.max[2] - HANDLE_BAR.min[2], 2, 0.4), 'hi');
  // Where the depth camera's beam meets the handle: the reading.
  dots([at(PICKED)], 0.9, 'lo');
}
slot('string-front');

// ---------------------------------------------------------- the moving parts
/** The string from the lens to its bead at a depth, behind the frame and in front of it, and the bead itself. */
export function movingAt({ share }: { share: number }): Record<Slot, Part[]> {
  const depth = share * READING;
  const bead = liftTo(depth);
  const pastImage = bead[0] > IMAGE_X + 0.01;
  const back = collect(() => {
    line(face3([EYE, pastImage ? PIXEL_POINT : bead], false), 'lit', undefined, 1.1);
    dots([at(EYE)], 1, 'hi');
  });
  const beam = collect(() => {
    line(face3([DEPTH_EYE, BEAM_AT_IMAGE], false), 'lo');
    dots([at(DEPTH_EYE)], 0.8, 'lo');
  });
  const front = collect(() => {
    // The beam's front part, to the reading on the handle.
    line(face3([BEAM_AT_IMAGE, PICKED], false), 'lo');
    // The rest of the line the pixel fixes, faint, from the bead on to the handle.
    if (share < 1 - 1e-6) line(face3([pastImage ? bead : PIXEL_POINT, PICKED], false), 'faint');
    if (pastImage) line(face3([PIXEL_POINT, bead], false), 'lit', undefined, 1.1);
    // The bead: the arm's target.
    dots([at(bead)], 2.1, 'hi');
    dots([at(bead)], 0.9, 'lo');
  });
  return { 'string-back': back, 'beam-back': beam, 'string-front': front };
}
