/**
 * The denoising gauge for the DiffusionDenoising scene, drawn with the
 * isometric kit.
 *
 * The object is the explanation. Two pin gauges stand side by side on one
 * bench, each a guide block with sixteen steel pins: the sixteen planned
 * positions of one move (the prediction horizon T_p), each pin's height one
 * position. A thread runs from a start post through the ball head of every
 * pin to an end post, so the thread is the move. A round bar, clamped in a
 * post behind the gauges, crosses both of them between pins 8 and 9 at the
 * height where both threads start: it is the obstacle the camera on its
 * mast sees. One demonstration arches the thread over the bar, the other
 * sags it under; a thread that runs straight is the average of the two and
 * runs into the bar.
 *
 * - Training: the shaker on the controller runs, and the pins scatter into
 *   random heights, the demonstrations drowned in noise.
 * - Acting: the step dial clicks through ten clean-up steps and every pin
 *   moves to the model's next height; each gauge ends on a good move.
 *
 * World units are about 1 px: x along the gauges, y toward the viewer, z
 * up. One arch height (a demonstration's peak) is `ARCH` world units. Every
 * static path is built once here; the live code rebuilds the pins, the
 * threads, the dial pointer, the shaker's crank pin, the lever and the
 * camera's sight line.
 */
import {
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  pointsAt,
  radialTicks,
  ring,
  sideArc,
  sideSeam,
  sideTicks,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, circleAround, discAlong } from '../prism.ts';
import { DENOISING_STEPS, PIN_COUNT } from '../../../lib/denoising-gauge.ts';

export const WIDTH = 600;
export const AZIMUTH = 60;
export const ELEVATION = 26;

// ---------------------------------------------------------------- the scale
/** Pin spacing along x. */
const PITCH = 10.5;
/** Where pin i stands along the gauge; i = -1 and i = PIN_COUNT are the start and end posts. */
export const pinX = (i: number) => (i - (PIN_COUNT - 1) / 2) * PITCH;
/** World units per arch height: a demonstration's pins rise to one arch over the bar or fall to one under it. */
export const ARCH = 18;
/** The guide blocks' top face, where the pins come out. */
export const GUIDE_TOP = 12;
/** The bar's axis height: a pin at height 0 holds its ball here. */
export const BAR_Z = 49;
/** A pin's ball height for a position in arch heights. */
export const ballZ = (height: number) => BAR_Z + height * ARCH;
/** The lowest and highest a ball may sit: pins never fall into their guide or out of reach. */
export const BALL_RANGE = { low: GUIDE_TOP + 3, high: BAR_Z + 1.9 * ARCH } as const;

/** The two gauges: 0 is the front one (the guess the scene follows), 1 the back one. */
export const LANE_Y = [24, -24] as const;
export type Lane = 0 | 1;

const ROD_R = 0.95;
export const BALL_R = 2.1;
export const BAR_R = 2.8;
const BLOCK_HALF = 5;
/** The seam low on each guide block's sides. */
const BLOCK_SEAM = 3;
const BLOCK_X0 = pinX(-1) - 8;
const BLOCK_X1 = pinX(PIN_COUNT) + 8;
const blockPlan = (lane: Lane): Plan => ({ x: BLOCK_X0, y: LANE_Y[lane] - BLOCK_HALF, w: BLOCK_X1 - BLOCK_X0, d: BLOCK_HALF * 2, r: 2 });

/** The bar runs along y at x = 0, from the clamp post's front face to its end cap in front of the front gauge. */
const POST: Plan = { x: -5, y: -44, w: 10, d: 8, r: 1.5 };
const BAR_Y0 = POST.y + POST.d;
const COLLAR = { y0: -33, y1: -31, r: 3.6 };
const BAR_Y1 = LANE_Y[0] + BLOCK_HALF + 6;

/** The camera on its mast at the left end, between the gauges, looking at the bar. */
const MAST = { x: pinX(-1) - 26, y: 0, r: 2.2, top: 64 };
const CAMERA_BODY: Plan = { x: MAST.x - 4, y: -6, w: 13, d: 12, r: 2 };
const CAMERA_Z = 62;
const CAMERA_H = 11;
const LENS_FROM: Point3 = [CAMERA_BODY.x + CAMERA_BODY.w, 0, CAMERA_Z + CAMERA_H / 2];
const BAR_CENTRE: Point3 = [0, 0, BAR_Z];
const unit3 = (v: Point3): Point3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};
const LENS_AXIS = unit3([BAR_CENTRE[0] - LENS_FROM[0], 0, BAR_CENTRE[2] - LENS_FROM[2]]);
const along = (from: Point3, by: number): Point3 => [from[0] + LENS_AXIS[0] * by, from[1] + LENS_AXIS[1] * by, from[2] + LENS_AXIS[2] * by];
const LENS = { barrel: 5, ring: 1.2, hood: 3.2, r: 3.4 };
/** The lens glass's centre: where the sight line leaves. */
export const LENS_FRONT: Point3 = along(LENS_FROM, LENS.barrel + LENS.ring + LENS.hood);

/** The controller at the right end: the step dial, the shaker and the step lever. */
const BOX: Plan = { x: BLOCK_X1 + 11, y: -18, w: 36, d: 34, r: 3 };
/** The camera cable's run along the bench, in front of the back gauge where the front block does not hide it. */
const CABLE_Y = -13;
const BOX_H = 15;
const DIAL = { x: BOX.x + 11, y: BOX.y + 22, r: 7.5, z: BOX_H + 1.6 };
const SHAKER = { x: BOX.x + 26, y: BOX.y + 22, r: 4.6, h: 6.5, cam: 3.8 };
const LEVER = { x: BOX.x + 18, y: BOX.y + 7, length: 15 };

const BASE: Plan = { x: MAST.x - 15, y: -54, w: BOX.x + BOX.w + 9 - (MAST.x - 15), d: 96, r: 8 };
const BASE_H = 9;
const FOOT_H = 5;
const LABEL: Plan = { x: BASE.x + 17, y: LANE_Y[0] + BLOCK_HALF + 5, w: 30, d: 10, r: 1.5 };

// ---------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push(
  [CAMERA_BODY.x, CAMERA_BODY.y, CAMERA_Z + CAMERA_H + 1],
  [CAMERA_BODY.x + CAMERA_BODY.w, CAMERA_BODY.y + CAMERA_BODY.d, CAMERA_Z + CAMERA_H + 1],
  [POST.x, POST.y, BAR_Z + 8],
  ...LANE_Y.flatMap((y) => [pinX(0), pinX(PIN_COUNT - 1)].map((x): Point3 => [x, y, BALL_RANGE.high + BALL_R])),
);
const unitProjection = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flat = extremes.map((point) => iso(point, unitProjection));
const spanX = Math.max(...flat.map(([x]) => x)) - Math.min(...flat.map(([x]) => x));
const spanY = Math.max(...flat.map(([, y]) => y)) - Math.min(...flat.map(([, y]) => y));
/** The fit's margin, in viewBox units: every stroke stays 4 px inside the stage at the narrowest stage. */
export const PAD_VB = 14;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

// ------------------------------------------------------------------- parts
export type Slot =
  | 'pins-0-left'
  | 'pins-0-right'
  | 'thread-0'
  | 'pins-1-left'
  | 'pins-1-right'
  | 'thread-1'
  | 'beam'
  | 'lens'
  | 'dial'
  | 'shaker'
  | 'lever';
export type DrawnPart =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone };
export type Part = DrawnPart | { kind: 'slot'; slot: Slot };

const at = (point: Point3): Flat => iso(point, P);
const lineMarkup = (d: string, tone: Tone = 'faint') => `<path class="iso-line" data-tone="${tone}" d="${d}"/>`;
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<DrawnPart, { kind: 'solid' }>> = {}): DrawnPart => ({ kind: 'solid', paths, tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end'): DrawnPart => ({ kind: 'line', d, tone, free });
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid'): DrawnPart => ({ kind: 'dots', points: pointsAt(points, P), size, tone });
const slot = (name: Slot): Part => ({ kind: 'slot', slot: name });
/** A screw: a ring on the face and a dot in it. */
const screw = (x: number, y: number, z: number, r = 1.4): DrawnPart[] => [line(ring(x, y, r, z, P, 14), 'lo'), dots([[x, y, z]], 0.45)];

// The bench.
function bench(): DrawnPart[] {
  const parts: DrawnPart[] = [];
  const feet: Point3[] = [];
  for (const fx of [BASE.x + 16, BASE.x + BASE.w / 2, BASE.x + BASE.w - 16]) for (const fy of [BASE.y + 14, BASE.y + BASE.d - 14]) feet.push([fx, fy, 0]);
  feet.sort((a, b) => a[0] * Math.cos((AZIMUTH * Math.PI) / 180) + a[1] * Math.sin((AZIMUTH * Math.PI) / 180) - (b[0] * Math.cos((AZIMUTH * Math.PI) / 180) + b[1] * Math.sin((AZIMUTH * Math.PI) / 180)));
  for (const [fx, fy] of feet) {
    parts.push(solid(cylinder(fx, fy, 6.5, -BASE_H - FOOT_H, 1.6, P, 28), 'lo'));
    parts.push(solid(cylinder(fx, fy, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), 'mid', { inner: lineMarkup(sideArc(fx, fy, 5, -BASE_H - 1.6, P, 20)) }));
  }
  parts.push(solid(slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), 'mid', { inner: lineMarkup(sideSeam(BASE, -BASE_H + 3, P, 8)) }));
  parts.push(line(planOutline(insetPlan(BASE, 4.5), 0, P), 'faint'));
  for (const [sx, sy] of [[BASE.x + 9, BASE.y + 9], [BASE.x + BASE.w - 9, BASE.y + 9], [BASE.x + 9, BASE.y + BASE.d - 9], [BASE.x + BASE.w - 9, BASE.y + BASE.d - 9]]) parts.push(...screw(sx, sy, 0, 2));
  return parts;
}

/** The label plate at the front left: plate, inset rule, three printed rules, two screws. */
function labelPlate(): DrawnPart[] {
  const z = 0.8;
  const { x, y, w, d } = LABEL;
  return [
    solid(slabOf(LABEL, 0, z, P, 4), 'lo', { crease: 'none' }),
    line(planOutline(insetPlan(LABEL, 1.4), z, P, 4), 'faint'),
    line(lineOnTop([x + 7, y + 3.4], [x + w - 5, y + 3.4], z, P), 'lo', true),
    line(lineOnTop([x + 7, y + 5.2], [x + w - 9, y + 5.2], z, P), 'lo', true),
    line(lineOnTop([x + 7, y + 7], [x + w - 13, y + 7], z, P), 'lo', true),
    dots([[x + 3.4, y + d / 2, z], [x + w - 2.6, y + d / 2, z]], 0.45),
  ];
}

/** The clamp post behind the gauges and the bar's back end in its collar. */
function postAndCollar(): DrawnPart[] {
  const top = BAR_Z + 8;
  const parts: DrawnPart[] = [
    solid(slabOf({ x: POST.x - 3, y: POST.y - 3, w: POST.w + 6, d: POST.d + 6, r: 2 }, 0, 2.2, P, 4, 0.5), 'lo'),
    ...screw(POST.x - 1, POST.y + POST.d + 1.6, 2.2, 0.9),
    ...screw(POST.x + POST.w + 1, POST.y + POST.d + 1.6, 2.2, 0.9),
    solid(slabOf(POST, 2.2, top - 2.2, P, 4, 0.6), 'mid', { inner: lineMarkup(sideSeam(POST, BAR_Z - 7, P, 4)) }),
    solid(slabOf(insetPlan(POST, -0.8), top, 2.4, P, 4, 0.5), 'mid'),
    dots([[POST.x + POST.w / 2, POST.y + POST.d / 2, top + 2.4]], 0.5),
  ];
  // The bar's back length, from the post's face to the collar, then the collar.
  parts.push(solid(discAlong([0, BAR_Y0, BAR_Z], [0, 1, 0], BAR_R, COLLAR.y0 - BAR_Y0, P, 28), 'hi'));
  parts.push(solid(discAlong([0, COLLAR.y0, BAR_Z], [0, 1, 0], COLLAR.r, COLLAR.y1 - COLLAR.y0, P, 32), 'mid'));
  parts.push(dots([[0, (COLLAR.y0 + COLLAR.y1) / 2, BAR_Z + COLLAR.r]], 0.5));
  return parts;
}

/** The main bar from the collar to its end cap, in front of the front gauge. */
function barFront(): DrawnPart[] {
  return [
    solid(discAlong([0, COLLAR.y1, BAR_Z], [0, 1, 0], BAR_R, BAR_Y1 - COLLAR.y1, P, 28), 'hi'),
    solid(discAlong([0, BAR_Y1, BAR_Z], [0, 1, 0], BAR_R + 0.5, 1.4, P, 28), 'mid'),
  ];
}

/** One gauge's guide block: block with a seam, a bore ring for every pin, a tick under every pin on the front face, the start and end posts. */
function guide(lane: Lane, posts: 'start' | 'end' | 'both'): DrawnPart[] {
  const plan = blockPlan(lane);
  const y = LANE_Y[lane];
  const parts: DrawnPart[] = [];
  parts.push(solid(slabOf(plan, 0, GUIDE_TOP, P, 4, 0.8), 'mid', { inner: lineMarkup(sideSeam(plan, BLOCK_SEAM, P, 4)) }));
  for (let i = 0; i < PIN_COUNT; i++) parts.push(line(ring(pinX(i), y, ROD_R + 0.8, GUIDE_TOP, P, 16), 'lo'));
  // A tick under every pin, hanging from the top edge; every fourth runs down to the seam.
  const ticks = sideTicks(pinX(0), pinX(PIN_COUNT - 1), PITCH, 4, y + BLOCK_HALF, GUIDE_TOP, [2.4, GUIDE_TOP - BLOCK_SEAM], P, 'x');
  parts.push(line(ticks.minor, 'lo'), line(ticks.major, 'mid'));
  for (const sx of [BLOCK_X0 + 3, BLOCK_X1 - 3]) parts.push(dots([[sx, y, GUIDE_TOP]], 0.5));
  const which = posts === 'both' ? [-1, PIN_COUNT] : posts === 'start' ? [-1] : [PIN_COUNT];
  for (const i of which) parts.push(...endPost(lane, i));
  return parts;
}

/** A start or end post: a collar on the block, a slim post to the bar's height and a knob the thread ties to. */
function endPost(lane: Lane, i: number): DrawnPart[] {
  const x = pinX(i);
  const y = LANE_Y[lane];
  return [
    solid(cylinder(x, y, 2.6, GUIDE_TOP, 2, P, 24), 'mid'),
    solid(cylinder(x, y, 1.4, GUIDE_TOP + 2, BAR_Z - GUIDE_TOP - 3, P, 16), 'mid'),
    solid(cylinder(x, y, 2.2, BAR_Z - 1, 2, P, 24), 'hi'),
  ];
}

/** The camera mast: foot with screws, mast with a seam, a clamp with a thumb screw, the camera and its lens barrel. */
function cameraMast(): DrawnPart[] {
  const parts: DrawnPart[] = [
    solid(cylinder(MAST.x, MAST.y, 6.5, 0, 2, P, 32, 0.4), 'lo'),
    ...screw(MAST.x - 4, MAST.y + 3.4, 2, 0.8),
    ...screw(MAST.x + 4, MAST.y + 3.4, 2, 0.8),
    solid(cylinder(MAST.x, MAST.y, 3.2, 2, 3, P, 24), 'mid'),
    solid(cylinder(MAST.x, MAST.y, MAST.r, 5, CAMERA_Z - 9, P, 20), 'mid', { inner: lineMarkup(sideArc(MAST.x, MAST.y, MAST.r, 30, P, 16)) }),
  ];
  // The clamp block on the mast, with a thumb screw toward the viewer.
  const clamp: Plan = { x: MAST.x - 4, y: MAST.y - 4, w: 8, d: 8, r: 1.5 };
  parts.push(solid(slabOf(clamp, CAMERA_Z - 6, 6, P, 4, 0.5), 'mid'));
  parts.push(solid(discAlong([MAST.x, clamp.y + clamp.d, CAMERA_Z - 3], [0, 1, 0], 0.9, 2.2, P, 12), 'mid'));
  parts.push(solid(discAlong([MAST.x, clamp.y + clamp.d + 2.2, CAMERA_Z - 3], [0, 1, 0], 2.1, 2.4, P, 24), 'hi'));
  parts.push(line(knurlAlongY(MAST.x, clamp.y + clamp.d + 2.2, CAMERA_Z - 3, 2.1, 2.4), 'lo'));
  // The camera body, with a lid seam and two screws on top.
  parts.push(solid(slabOf(CAMERA_BODY, CAMERA_Z, CAMERA_H, P, 4, 0.6), 'hi', { inner: lineMarkup(sideSeam(CAMERA_BODY, CAMERA_Z + CAMERA_H - 2.4, P, 4)) }));
  parts.push(dots([[CAMERA_BODY.x + 2.6, CAMERA_BODY.y + 2.6, CAMERA_Z + CAMERA_H], [CAMERA_BODY.x + 2.6, CAMERA_BODY.y + CAMERA_BODY.d - 2.6, CAMERA_Z + CAMERA_H]], 0.45));
  // Lens barrel, focus ring and hood, along the sight line.
  parts.push(solid(discAlong(LENS_FROM, LENS_AXIS, LENS.r - 0.6, LENS.barrel, P, 28), 'mid'));
  parts.push(solid(discAlong(along(LENS_FROM, LENS.barrel), LENS_AXIS, LENS.r, LENS.ring, P, 28), 'mid'));
  parts.push(solid(discAlong(along(LENS_FROM, LENS.barrel + LENS.ring), LENS_AXIS, LENS.r + 0.6, LENS.hood, P, 28), 'hi'));
  return parts;
}

/** Knurl lines across a short knob that turns about y, on its visible side. */
function knurlAlongY(x: number, y0: number, z: number, r: number, length: number): string {
  const lines: string[] = [];
  for (let k = 0; k < 9; k++) {
    const angle = Math.PI * (0.2 + (0.6 * k) / 8);
    const dx = -Math.cos(angle) * r * 0.96;
    const dz = Math.sin(angle) * r * 0.96;
    lines.push(pathOf([at([x + dx, y0 + 0.2, z + dz]), at([x + dx, y0 + length - 0.2, z + dz])]));
  }
  return lines.join('');
}

/** The lens glass: the circle at the hood's mouth. */
export const LENS_GLASS = pathOf(circleAround(LENS_FRONT, LENS_AXIS, LENS.r - 0.4, 32).map(at), true);

/** The cable from the camera down the mast and along the bench to the controller. */
function cameraCable(): DrawnPart {
  const yFace = CAMERA_BODY.y + CAMERA_BODY.d;
  const from = at([MAST.x + 6, yFace, CAMERA_Z + 3]);
  const via = [
    at([MAST.x + 6, yFace + 0.6, CAMERA_Z - 2]),
    at([MAST.x + 6, yFace + 0.6, 1.4]),
    at([MAST.x + 8, CABLE_Y, 0.4]),
    at([BOX.x - 6, CABLE_Y, 0.4]),
  ];
  return { kind: 'wire', from, to: at([BOX.x, CABLE_Y, 3]), via, tone: 'lo' };
}

/** A gauge's drive cable from the controller's face to the block's end face. */
function driveCable(lane: Lane): DrawnPart {
  const y = LANE_Y[lane];
  // The back gauge's cable leaves high on the controller's face, clear of the camera cable that enters low beside it.
  const [yBox, zBox] = lane === 0 ? [BOX.y + BOX.d - 6, 7] : [BOX.y + 4, 11];
  return { kind: 'wire', from: at([BOX.x, yBox, zBox]), to: at([BLOCK_X1, y, 6]), via: [at([BOX.x - 5, yBox, zBox]), at([BLOCK_X1 + 4, y, 6])], tone: 'lo' };
}

/** The controller: box with a lid seam, vents and screws; the step dial's face; the shaker can; the lever's boss. */
function controller(): DrawnPart[] {
  const parts: DrawnPart[] = [
    solid(slabOf(BOX, 0, BOX_H, P, 6, 1), 'mid', { inner: lineMarkup(sideSeam(BOX, BOX_H - 3, P, 6)) }),
    line(planOutline(insetPlan(BOX, 2.2), BOX_H, P, 6), 'faint'),
  ];
  for (const [sx, sy] of [[BOX.x + 3.6, BOX.y + 3.6], [BOX.x + BOX.w - 3.6, BOX.y + 3.6], [BOX.x + 3.6, BOX.y + BOX.d - 3.6], [BOX.x + BOX.w - 3.6, BOX.y + BOX.d - 3.6]]) parts.push(dots([[sx, sy, BOX_H]], 0.45));
  // Vents on the front face: closed slots.
  for (let k = 0; k < 4; k++) {
    const vx = BOX.x + 20 + k * 3.4;
    const yf = BOX.y + BOX.d;
    parts.push(line(pathOf([at([vx, yf, 3]), at([vx, yf, 9]), at([vx + 1.4, yf, 9]), at([vx + 1.4, yf, 3])], true), 'lo'));
  }
  // The step dial: boss, face, eleven ticks for steps 0 to 10 over 270 degrees, the zero mark.
  parts.push(solid(cylinder(DIAL.x, DIAL.y, DIAL.r + 1.4, BOX_H, 1.2, P, 40, 0.4), 'mid'));
  parts.push(solid(cylinder(DIAL.x, DIAL.y, DIAL.r, BOX_H + 1.2, 0.4, P, 40), 'hi', { crease: 'none' }));
  const ticks = radialTicks(DIAL.x, DIAL.y, DIAL.r - 0.4, DENOISING_STEPS, 5, DIAL.z, [1.4, 2.6], P, dialAngle(0), dialAngle(DENOISING_STEPS) - dialAngle(0));
  parts.push(line(ring(DIAL.x, DIAL.y, DIAL.r - 0.4, DIAL.z, P, 40), 'lo'), line(ticks.minor, 'lo'), line(ticks.major, 'mid'));
  // The shaker: a motor can with a seam band and a cam disc on top.
  parts.push(solid(cylinder(SHAKER.x, SHAKER.y, SHAKER.r, BOX_H, SHAKER.h, P, 32, 0.4), 'mid', { inner: lineMarkup(sideArc(SHAKER.x, SHAKER.y, SHAKER.r, BOX_H + 2, P, 20)) }));
  parts.push(line(knurl(SHAKER.x, SHAKER.y, SHAKER.r, BOX_H + 2.6, BOX_H + SHAKER.h - 0.6, 22, P), 'faint'));
  parts.push(solid(cylinder(SHAKER.x, SHAKER.y, SHAKER.cam, BOX_H + SHAKER.h, 1.4, P, 32, 0.3), 'hi'));
  // The lever's pivot boss.
  parts.push(solid(cylinder(LEVER.x, LEVER.y, 2.6, BOX_H, 2, P, 24), 'mid'));
  return parts;
}

/** The dial's pointer angle for a number of steps done (radialTicks angles: 0 points to -y, clockwise from above). */
export function dialAngle(steps: number): number {
  return Math.PI * 0.75 + (steps / DENOISING_STEPS) * Math.PI * 1.5;
}
/** The dial's pointer: from the hub toward the tick for `steps`. */
export function dialPointer(steps: number): string {
  const a = dialAngle(steps);
  const reach = DIAL.r - 2.2;
  return lineOnTop([DIAL.x - Math.sin(a) * 1.6, DIAL.y + Math.cos(a) * 1.6], [DIAL.x + Math.sin(a) * reach, DIAL.y - Math.cos(a) * reach], DIAL.z + 0.05, P);
}
export const DIAL_HUB = ring(DIAL.x, DIAL.y, 1.1, DIAL.z, P, 16);

/** The shaker's crank pin at a turn angle (radians), on the cam disc's top. */
export function crankPin(angle: number): SolidPaths {
  const r = SHAKER.cam - 1.3;
  return cylinder(SHAKER.x + Math.cos(angle) * r, SHAKER.y + Math.sin(angle) * r, 0.9, BOX_H + SHAKER.h + 1.4, 1.8, P, 14);
}

/** The step lever: an arm from its boss, rocked by `tilt` (radians) toward +x, with a ball knob. */
export function leverAt(tilt: number): { arm: SolidPaths; knob: Flat; knobR: number } {
  const base: Point3 = [LEVER.x, LEVER.y, BOX_H + 2];
  const tip: Point3 = [LEVER.x + Math.sin(tilt) * LEVER.length, LEVER.y, BOX_H + 2 + Math.cos(tilt) * LEVER.length];
  return { arm: barBetween(base, tip, [0, 1, 0], 1.8, 1.6, P), knob: at(tip), knobR: 2.3 * P.scale * Math.sqrt(1.6) };
}

// ---------------------------------------------------------------- the pins
/** A pin's rod from its bore to its ball, for a ball height in arch heights. */
export function pinRod(lane: Lane, i: number, height: number): SolidPaths {
  const top = Math.min(BALL_RANGE.high, Math.max(BALL_RANGE.low, ballZ(height)));
  return cylinder(pinX(i), LANE_Y[lane], ROD_R, GUIDE_TOP, top - GUIDE_TOP, P, 12);
}
/** A pin's ball centre on screen. */
export function ballAt(lane: Lane, i: number, height: number): Flat {
  const top = Math.min(BALL_RANGE.high, Math.max(BALL_RANGE.low, ballZ(height)));
  return at([pinX(i), LANE_Y[lane], top]);
}
/** The ball's radius in viewBox units. */
export const BALL_PX = BALL_R * P.scale * Math.sqrt(1.6);
/** Where the thread is tied on the start and end posts' knobs. */
export const threadKnots = (lane: Lane): Flat[] => [at([pinX(-1), LANE_Y[lane], BAR_Z + 1]), at([pinX(PIN_COUNT), LANE_Y[lane], BAR_Z + 1])];
/** The thread: from the start post's knob through every ball to the end post's knob. */
export function threadPath(lane: Lane, heights: readonly number[]): string {
  const y = LANE_Y[lane];
  const points: Flat[] = [at([pinX(-1), y, BAR_Z + 1])];
  heights.forEach((height, i) => points.push(ballAt(lane, i, height)));
  points.push(at([pinX(PIN_COUNT), y, BAR_Z + 1]));
  return pathOf(points.map(([x, py]) => [Number(x.toFixed(2)), Number(py.toFixed(2))] as Flat));
}
/** The emitter spot on the lens glass, where the sight line leaves. */
export const BEAM_START: Flat = at(LENS_FRONT);
/** The camera's sight line: from the lens glass to the bar's near side. */
export const BEAM = pathOf([at(LENS_FRONT), at([BAR_CENTRE[0] - LENS_AXIS[0] * BAR_R, 0, BAR_CENTRE[2] - LENS_AXIS[2] * BAR_R])]);

/** Which pins stand left of the bar (drawn before it) and right of it (after it). */
export const LEFT_PINS = Array.from({ length: PIN_COUNT / 2 }, (_, i) => i);
export const RIGHT_PINS = Array.from({ length: PIN_COUNT / 2 }, (_, i) => i + PIN_COUNT / 2);

/** Every part in painter's order, back to front, with slots for what the live code moves. */
export const PARTS: Part[] = [
  ...bench(),
  ...postAndCollar(),
  ...guide(1, 'both'),
  slot('pins-1-left'),
  slot('pins-1-right'),
  slot('thread-1'),
  driveCable(1),
  ...cameraMast(),
  cameraCable(),
  slot('lens'),
  slot('beam'),
  ...controller(),
  slot('dial'),
  slot('shaker'),
  slot('lever'),
  driveCable(0),
  ...guide(0, 'start'),
  slot('pins-0-left'),
  ...barFront(),
  ...endPost(0, PIN_COUNT),
  slot('pins-0-right'),
  slot('thread-0'),
  ...labelPlate(),
];

/** Distinct parts drawn, for the record: static solids plus the live ones. */
export const SOLID_COUNT = PARTS.filter((part) => part.kind === 'solid').length;
