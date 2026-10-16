/**
 * The tracking bench for TimeOffsetMiss, drawn with the isometric kit.
 *
 * The object is the explanation: a gripper rides a belt-driven rail over a
 * ruler, and a camera on a boom above it tracks the gripper with a fine
 * beam. The beam lands where the camera's latest photo shows the gripper.
 * The photo arrives 55 ms late, so while the gripper moves the beam's spot
 * trails the gripper's own pointer on the ruler, by the speed times the
 * delay: the robot's belief against where its hand really is.
 *
 * World units are millimetres: x along the rail, y across the bench
 * (toward the viewer is +y), z up. Every static path is built once here.
 * The moving groups (the gripper carriage and the beam's spot) are built at
 * x = 0 and moved with `translateAlong`; the beam itself is one segment the
 * live code rebuilds with `beamTo`.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  onTop,
  pathOf,
  planOutline,
  ring,
  slabOf,
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { phoneFitOf } from '../phone-fit.ts';

export const WIDTH = 640;
export const HEIGHT = 340;
export const AZIMUTH = 58;

/** How far the gripper travels each way from the ruler's middle, in mm. */
export const TRAVEL = 105;

export type Group = 'static' | 'hand' | 'pointer' | 'spot';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; halo?: boolean; crease?: Tone | 'none' }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'beam'; group: Group };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -196, y: -62, w: 392, d: 124, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;

const RAIL: Plan = { x: -150, y: -34, w: 300, d: 14, r: 3 };
const RAIL_H = 12;
const RULER: Plan = { x: -136, y: -4, w: 272, d: 20, r: 1.5 };
const RULER_H = 1.4;
/** The ruler's reading line: both the gripper's pointer and the spot sit on it. */
export const READ_Y = 6;

const POST = { x: -178, y: READ_Y, r: 5.5 };
const ARM_Z = 118;
const ARM: Plan = { x: -184, y: READ_Y - 6, w: 156, d: 12, r: 2 };
const CAMERA: Plan = { x: -48, y: READ_Y - 10, w: 30, d: 20, r: 3 };
const CAMERA_Z = 96;
/** The beam leaves the emitter under the camera, at the lens's centre. */
export const EMITTER: Point3 = [-33, READ_Y, CAMERA_Z - 22];

const MOTOR: Plan = { x: 166, y: -46, w: 24, d: 38, r: 3 };
const CONTROL: Plan = { x: -192, y: -54, w: 30, d: 26, r: 3 };
const LABEL: Plan = { x: 96, y: 36, w: 74, d: 14, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([POST.x, POST.y, ARM_Z + 10], [ARM.x + ARM.w, ARM.y, ARM_Z + 10]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 18 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) =>
  kitCylinder(cx, cy, r, z, h, P, steps, bevel);

/** The screen offset that moves a group built at x = 0 to x. */
export const slideTo = (x: number) => translateAlong(P, [x, 0, 0]);

/** The beam, from the emitter to the spot on the ruler's reading line at x. */
export const beamTo = (x: number) => pathOf([at(EMITTER), at([x, READ_Y, RULER_H + 0.1])]);

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

// Base: a plate on four turned feet, with a groove and corner screws.
put({ kind: 'line', group: 'static', d: slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, tone: 'faint' });
for (const [x, y] of byDepth([
  [BASE.x + 24, BASE.y + 18],
  [BASE.x + BASE.w - 24, BASE.y + 18],
  [BASE.x + 24, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 24, BASE.y + BASE.d - 18],
])) {
  put({ kind: 'solid', group: 'static', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), tone: 'mid' });
}
put({ kind: 'solid', group: 'static', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.6), tone: 'mid' });
put({ kind: 'line', group: 'static', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
const SCREWS: Array<[number, number]> = [
  [BASE.x + 10, BASE.y + 10],
  [BASE.x + BASE.w - 10, BASE.y + 10],
  [BASE.x + 10, BASE.y + BASE.d - 10],
  [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
];
put({ kind: 'line', group: 'static', d: SCREWS.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
put({ kind: 'dots', group: 'static', points: SCREWS.map(([x, y]) => at([x, y, 0])), size: 0.55 });

// The tracking controller at the back left, where the camera's cable lands.
put({ kind: 'solid', group: 'static', paths: slab(CONTROL, 0, 16, 4, 0.8), tone: 'mid' });
put({ kind: 'line', group: 'static', d: planOutline(insetPlan(CONTROL, 3), 16, P), tone: 'faint' });
put({ kind: 'dots', group: 'static', points: [at([CONTROL.x + 4, CONTROL.y + 4, 16]), at([CONTROL.x + CONTROL.w - 4, CONTROL.y + CONTROL.d - 4, 16])], size: 0.5 });
put({ kind: 'solid', group: 'static', paths: cyl(CONTROL.x + 21, CONTROL.y + 9, 3.2, 16, 3.5, 20), tone: 'mid' });
put({ kind: 'line', group: 'static', d: knurl(CONTROL.x + 21, CONTROL.y + 9, 3.2, 16.3, 19.2, 12, P), tone: 'lo' });

// The rail along the back: an end block with its pulley, the rail and its belt.
put({ kind: 'solid', group: 'static', paths: slab({ x: -164, y: -40, w: 14, d: 26, r: 2 }, 0, 22, 4, 0.6), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(-157, -27, 4.5, 22, 3, 20), tone: 'mid' });
put({ kind: 'dots', group: 'static', points: [at([-157, -27, 25])], size: 0.6 });
put({ kind: 'solid', group: 'static', paths: slab(RAIL, 0, RAIL_H, 4, 0.6), tone: 'mid' });
put({ kind: 'line', group: 'static', d: onTop([[RAIL.x, RAIL.y + 4], [RAIL.x + RAIL.w, RAIL.y + 4]], RAIL_H, P), tone: 'lo' });
put({ kind: 'line', group: 'static', d: onTop([[RAIL.x, RAIL.y + RAIL.d - 4], [RAIL.x + RAIL.w, RAIL.y + RAIL.d - 4]], RAIL_H, P), tone: 'lo' });

// The gripper carriage (moves along x): block, wrist, the palm (the one lit part), two fingers, and its pointer.
const BLOCK: Plan = { x: -20, y: -39, w: 40, d: 24, r: 3 };
const TOP = RAIL_H + 11;
put({ kind: 'solid', group: 'hand', paths: slab(BLOCK, RAIL_H, 11, 4, 0.8), tone: 'mid', halo: true });
put({ kind: 'line', group: 'hand', d: planOutline(insetPlan(BLOCK, 3.2), TOP, P), tone: 'faint' });
put({ kind: 'dots', group: 'hand', points: [[-15, -35], [15, -35], [-15, -19], [15, -19]].map(([x, y]) => at([x, y, TOP])), size: 0.5 });
put({ kind: 'solid', group: 'hand', paths: cyl(0, -27, 7, TOP, 4, 28, 0.4), tone: 'mid' });
put({ kind: 'line', group: 'hand', d: knurl(0, -27, 7, TOP + 0.4, TOP + 3.6, 22, P), tone: 'faint' });
put({ kind: 'solid', group: 'hand', paths: slab({ x: -12, y: -34, w: 24, d: 14, r: 2 }, TOP + 4, 6, 4, 0.6), tone: 'hi', lit: true });
put({ kind: 'solid', group: 'hand', paths: slab({ x: -10.5, y: -31, w: 4, d: 8, r: 0.8 }, TOP + 10, 17, 2), tone: 'hi' });
put({ kind: 'solid', group: 'hand', paths: slab({ x: 6.5, y: -31, w: 4, d: 8, r: 0.8 }, TOP + 10, 17, 2), tone: 'hi' });
put({ kind: 'solid', group: 'hand', paths: slab({ x: -3, y: -15, w: 6, d: 3, r: 0.6 }, RULER_H, TOP - RULER_H, 2), tone: 'mid' });

// The far end block and the motor that drives the belt, with its speed knob.
put({ kind: 'solid', group: 'static', paths: slab({ x: 150, y: -40, w: 14, d: 26, r: 2 }, 0, 22, 4, 0.6), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(157, -27, 4.5, 22, 3, 20), tone: 'mid' });
put({ kind: 'dots', group: 'static', points: [at([157, -27, 25])], size: 0.6 });
put({ kind: 'solid', group: 'static', paths: slab(MOTOR, 0, 24, 4, 0.8), tone: 'mid' });
put({ kind: 'line', group: 'static', d: planOutline(insetPlan(MOTOR, 3), 24, P), tone: 'faint' });
put({ kind: 'solid', group: 'static', paths: cyl(178, -34, 9, 24, 18, 32, 0.6), tone: 'hi' });
put({ kind: 'line', group: 'static', d: knurl(178, -34, 9, 26, 40, 26, P), tone: 'faint' });
put({ kind: 'solid', group: 'static', paths: cyl(178, -16, 4.5, 24, 7, 24, 0.4), tone: 'mid' });
put({ kind: 'line', group: 'static', d: knurl(178, -16, 4.5, 24.4, 30.6, 14, P), tone: 'lo' });

// The ruler in front of the rail, in millimetres, with its reading line.
put({ kind: 'solid', group: 'static', paths: slab(RULER, 0, RULER_H, 3, 0.4), tone: 'lo' });
{
  const ticks = topTicks(-125, 125, 5, 5, READ_Y, RULER_H, [3, 6], P, 'x');
  put({ kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
  put({ kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  put({ kind: 'line', group: 'static', d: onTop([[RULER.x + 4, READ_Y], [RULER.x + RULER.w - 4, READ_Y]], RULER_H, P), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: [at([RULER.x + 3, RULER.y + 3, RULER_H]), at([RULER.x + RULER.w - 3, RULER.y + 3, RULER_H])], size: 0.45 });
}

// The gripper's pointer blade lies on the ruler (moves with the gripper, drawn above the ruler).
put({ kind: 'solid', group: 'pointer', paths: slab({ x: -2, y: -13, w: 4, d: READ_Y + 13 + 1.6, r: 0.8 }, RULER_H, 1.2, 2), tone: 'hi' });
put({ kind: 'line', group: 'pointer', d: onTop([[0, -12], [0, READ_Y + 1]], RULER_H + 1.2, P), tone: 'hi', free: 'end' });

// The spot where the beam lands: where the camera's latest photo puts the gripper.
put({ kind: 'line', group: 'spot', d: ring(0, READ_Y, 3.2, RULER_H + 0.05, P, 24), tone: 'mid' });
put({ kind: 'dots', group: 'spot', points: [at([0, READ_Y, RULER_H + 0.05])], size: 1.1, tone: 'hi' });

// The camera boom: a turned post on a foot plate at the front left, an arm over the ruler.
put({ kind: 'solid', group: 'static', paths: cyl(POST.x, POST.y, 12, 0, 3, 36, 0.6), tone: 'lo' });
put({ kind: 'dots', group: 'static', points: [0, 1, 2, 3].map((k) => at([POST.x + 9 * Math.cos(k * Math.PI / 2 + 0.7), POST.y + 9 * Math.sin(k * Math.PI / 2 + 0.7), 3])), size: 0.5 });
put({ kind: 'solid', group: 'static', paths: cyl(POST.x, POST.y, POST.r, 3, ARM_Z - 3, 28), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(POST.x, POST.y, POST.r + 1.6, 60, 8, 28), tone: 'mid' });
put({ kind: 'line', group: 'static', d: knurl(POST.x, POST.y, POST.r + 1.6, 60.4, 67.6, 18, P), tone: 'faint' });
put({ kind: 'solid', group: 'static', paths: slab(ARM, ARM_Z, 9, 4, 0.6), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(POST.x, POST.y, POST.r + 2.6, ARM_Z - 4, 14, 28, 0.4), tone: 'mid' });
put({ kind: 'line', group: 'static', d: knurl(POST.x, POST.y, POST.r + 2.6, ARM_Z - 3.6, ARM_Z + 9.6, 20, P), tone: 'faint' });
put({ kind: 'solid', group: 'static', paths: slab({ x: CAMERA.x + 8, y: CAMERA.y + 3, w: 14, d: 14, r: 1.5 }, CAMERA_Z + 18, ARM_Z - CAMERA_Z - 18, 3), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: slab(CAMERA, CAMERA_Z, 18, 4, 0.8), tone: 'hi' });
put({ kind: 'line', group: 'static', d: planOutline(insetPlan(CAMERA, 3), CAMERA_Z + 18, P), tone: 'faint' });
put({ kind: 'dots', group: 'static', points: [at([CAMERA.x + 4, CAMERA.y + 4, CAMERA_Z + 18]), at([CAMERA.x + CAMERA.w - 4, CAMERA.y + CAMERA.d - 4, CAMERA_Z + 18])], size: 0.5 });
put({ kind: 'solid', group: 'static', paths: cyl(EMITTER[0], EMITTER[1], 7.6, CAMERA_Z - 4, 4, 28), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(EMITTER[0], EMITTER[1], 6.4, CAMERA_Z - 15, 11, 28), tone: 'hi' });
put({ kind: 'line', group: 'static', d: knurl(EMITTER[0], EMITTER[1], 6.4, CAMERA_Z - 12, CAMERA_Z - 7, 22, P), tone: 'faint' });
put({ kind: 'solid', group: 'static', paths: cyl(EMITTER[0], EMITTER[1], 7.8, CAMERA_Z - 19, 4, 28), tone: 'mid' });
put({ kind: 'solid', group: 'static', paths: cyl(EMITTER[0], EMITTER[1], 2.2, CAMERA_Z - 22, 3, 16), tone: 'mid' });
// The camera's cable runs back along the arm, down the post and across the base to the controller.
put({
  kind: 'wire',
  group: 'static',
  from: at([CAMERA.x, CAMERA.y + 6, CAMERA_Z + 9]),
  via: [at([POST.x + 9, POST.y - 6, ARM_Z - 2]), at([POST.x - 3, POST.y - 7, ARM_Z - 8]), at([POST.x - 3, POST.y - 7, 8]), at([POST.x - 3, -24, 0.4])],
  to: at([CONTROL.x + 8, CONTROL.y + CONTROL.d, 8]),
  tone: 'lo',
});
put({ kind: 'beam', group: 'static' });

// A label plate at the front right, with three engraved rules.
put({ kind: 'solid', group: 'static', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
put({ kind: 'line', group: 'static', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
put({
  kind: 'line',
  group: 'static',
  d: [0, 1, 2]
    .map((row) => onTop([[LABEL.x + 9, LABEL.y + 3.8 + row * 3.2], [LABEL.x + (row === 1 ? 42 : 58), LABEL.y + 3.8 + row * 3.2]], 0.8, P))
    .join(''),
  tone: 'lo',
  free: true,
});
put({ kind: 'dots', group: 'static', points: [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], size: 0.5 });

export const PARTS: readonly Part[] = parts;
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
