/**
 * The twin tray columns for MotInsulation, drawn with the isometric kit.
 *
 * The object is the explanation. Two process columns stand on one base: the
 * wide backbone (the language model) and the slim action expert, eight trays
 * each, their cross-sections in the ratio of their sizes (2B against 300M
 * parameters, so the backbone's side is sqrt(2000 / 300) times the
 * expert's). At every tray level a short cross pipe joins them through a
 * one-way check valve: a flap inside a cast body, its shaft carried out to a
 * lever with a counterweight, so the lever shows where the flap sits.
 *
 * Forward pass: activation rises tray by tray up both columns, and the
 * expert draws sideways from the backbone through the open valves. Backward
 * pass: the expert's training signal (its gradient) runs down the expert
 * column tray by tray. With the protection off the valves let it through
 * into the backbone's trays and the language gauge on the backbone's head
 * falls; with it on, every valve is shut against it, and the only feed that
 * reaches the backbone is the FAST-token line into its head, through its own
 * small valve. A depth rider on a scale beside the expert marks how far the
 * pass has reached.
 *
 * Every state the drawing shows comes from lib/knowledge-insulation.ts:
 * `restPose` reads `layerStates`, `languageScore` and `backboneSupervision`,
 * and the live component eases the drawing toward that pose.
 *
 * World units: x runs from the backbone to the expert, y toward the front,
 * z up.
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
  type Point3,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong, plateIn, roundedOutline } from '../prism.ts';
import {
  LANGUAGE_SCORE_MAX,
  LAYER_COUNT,
  backboneSupervision,
  languageScore,
  layerStates,
  type Pass,
} from '../../../lib/knowledge-insulation.ts';

export const WIDTH = 640;
export const AZIMUTH = 64;
export const ELEVATION = 32;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; shade: 0 | 1 | 2 | 3 }
  | { kind: 'slot'; name: string };

// ---------------------------------------------------------------- model numbers
/** Parameters of the two halves, as the method fold states them. */
export const BACKBONE_PARAMS = 2e9;
export const EXPERT_PARAMS = 3e8;
/** The backbone's square side; the expert's is smaller by the square root of the size ratio, so areas compare as sizes. */
export const BACKBONE_SIDE = 58;
export const EXPERT_SIDE = BACKBONE_SIDE / Math.sqrt(BACKBONE_PARAMS / EXPERT_PARAMS);

// ---------------------------------------------------------------- layout
/** Tray pitch: a tray body and the collar above it. */
export const PITCH = 10.5;
const COLLAR = 1.5;
const TRAY_H = PITCH - COLLAR;
/** The first tray's floor (the plinths' top). */
export const Z0 = 5;
/** The top of the eighth tray's collar. */
export const Z_TOP = Z0 + PITCH * LAYER_COUNT;
const HEAD_H = 8;

export const BACKBONE: Plan = { x: -48, y: -BACKBONE_SIDE / 2, w: BACKBONE_SIDE, d: BACKBONE_SIDE, r: 3 };
const E_X = 64;
/** The expert stands flush with the backbone's front, so its cross pipes leave the backbone's side near the front. */
export const EXPERT: Plan = { x: E_X, y: BACKBONE.y + BACKBONE.d - EXPERT_SIDE, w: EXPERT_SIDE, d: EXPERT_SIDE, r: 2 };
/** The cross pipes run along x on the expert's centre line. */
export const PIPE_Y = EXPERT.y + EXPERT.d / 2;
const BASE: Plan = { x: -106, y: -38, w: 208, d: 78, r: 8 };
const BASE_H = 8;
const FOOT_H = 5;

/** A tray's floor. */
export const trayZ = (index: number) => Z0 + index * PITCH;
/** The centre line of the cross pipe at a tray. */
export const pipeZ = (index: number) => trayZ(index) + TRAY_H / 2;

// Cross pipe stations along x.
const B_FACE = BACKBONE.x + BACKBONE.w;
const E_FACE = EXPERT.x;
const FLANGE_T = 1.2;
const PIPE_R = 1.9;
const NOZZLE_R = 3.4;
/** The valve's centre and its cast body. */
export const VALVE_X = 34;
const BODY_L = 12;
const BODY_HALF = 3.3;
const VALVE_FLANGE_R = 4.4;
const BOSS_Y = BODY_HALF + 1.3;
const LEVER_Y = BOSS_Y + 0.5;
const LEVER_L = 8;
const WEIGHT_R = 1.7;
/** The lever's angle above the horizontal, pointing upstream: shut rests it just below, open lifts it. */
export const SHUT_DEG = -8;
export const OPEN_DEG = 30;

// The windows (sight glasses) on each tray's front face.
const WIN_Z0 = 1.9;
const WIN_Z1 = TRAY_H - 1.9;
const B_WIN: [number, number] = [BACKBONE.x + 8, BACKBONE.x + BACKBONE.w - 8];
const E_WIN: [number, number] = [EXPERT.x + 4.4, EXPERT.x + EXPERT.w - 4.4];
const BEZEL_T = 0.8;
const BEZEL_RIM = 1.3;

// The backbone's head: the language gauge and the FAST-token port on top.
const HEAD_TOP = Z_TOP + HEAD_H;
export const GAUGE: Point3 = [-14, 6, HEAD_TOP + 2];
export const GAUGE_R = 16;
const GAUGE_H = 4.2;
/** The gauge sweeps three quarters of a turn from 0 to 100. */
export const GAUGE_SWEEP_DEG = 270;
const FAST_PORT: Point3 = [-40, 14, HEAD_TOP];
const FAST_Z = HEAD_TOP + 10;
const TANK: Point3 = [-88, FAST_PORT[1], 0];
const TANK_R = 9;
const TANK_H = 24;
const FAST_VALVE_Z = 44;
/** The sight tube on the riser, where the FAST-token feed shows. */
const SIGHT_Z0 = 66;
const SIGHT_Z1 = 84;
const SIGHT_R = 2.9;

// The depth scale beside the expert.
const SCALE: Plan = { x: EXPERT.x + EXPERT.w + 5, y: EXPERT.y + EXPERT.d - 6, w: 3, d: 3, r: 0.2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([TANK[0], TANK[1], FAST_Z + 4], [FAST_PORT[0], FAST_PORT[1], FAST_Z + 4], [BACKBONE.x, BACKBONE.y, HEAD_TOP + 8]);
extremes.push([EXPERT.x + EXPERT.w, EXPERT.y, HEAD_TOP + 10]);
const FIT_PAD = 14;
/** The drawing's height, fitted tightly to the machine at the full width. */
export const HEIGHT = (() => {
  const flat = extremes.map((point) => iso(point, { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION }));
  const span = (axis: 0 | 1) => Math.max(...flat.map((f) => f[axis])) - Math.min(...flat.map((f) => f[axis]));
  return Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
})();
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const disc = (from: Point3, axis: Point3, r: number, length: number, steps = 28, bevel = 0) => discAlong(from, axis, r, length, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const X: Point3 = [1, 0, 0];
const Y: Point3 = [0, 1, 0];
const Z: Point3 = [0, 0, 1];

const solidOf = (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<{ lit: boolean; crease: Tone | 'none'; inner: string }> = {}): Part => ({ kind: 'solid', paths, tone, ...extra });
const lineOf = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end'): Part => ({ kind: 'line', d, tone, free });
const dotsOf = (points: Flat[], size = 0.5, tone?: Tone): Part => ({ kind: 'dots', points, size, tone });
const seam = (d: string, tone: Tone = 'faint') => `<path class="iso-line" data-tone="${tone}" d="${d}"/>`;

// ---------------------------------------------------------------- face-plane helpers
/** A rounded rectangle on a front face (the plane y = const), as world points, counter-clockwise seen from the front. */
function faceRing(x0: number, x1: number, z0: number, z1: number, r: number, y: number, steps = 4): Point3[] {
  return roundedOutline(x0, z0, x1, z1, r, steps).map(([x, z]) => [x, y, z] as Point3);
}

/** The part of a closed ring at or below height `level` (a single half-plane clip). */
function clipBelow(points: Point3[], level: number): Point3[] {
  const out: Point3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const aIn = a[2] <= level;
    const bIn = b[2] <= level;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (level - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, level]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the model, as a pose
export type Column = 'backbone' | 'expert';

/** What the drawing shows for one model state. Fronts count trays reached (0 to 8) from where the pass starts. */
export interface Pose {
  /** Activation front, rising from the bottom tray (forward pass). */
  rise: number;
  /** Gradient front in the expert, falling from the top tray (backward pass). */
  fall: number;
  /** Gradient front in the backbone, falling from its top tray: what seeps through open valves. */
  seep: number;
  /** The FAST-token feed: 1 open and feeding the backbone's head, 0 shut. */
  fast: number;
  /** The language gauge's reading, 0 to 100. */
  score: number;
  /** Each valve's flap, 0 shut to 1 open. */
  valves: number[];
}

const clampStep = (step: number) => Math.min(LAYER_COUNT, Math.max(0, Math.round(step)));
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** The pose the machine settles in for a pass, protection setting and depth: read straight off the model. */
export function restPose(pass: Pass, stopGradient: boolean, step: number): Pose {
  const s = clampStep(step);
  const states = layerStates(pass, stopGradient, s);
  return {
    rise: pass === 'forward' ? s : 0,
    fall: pass === 'backward' ? s : 0,
    seep: pass === 'backward' && !stopGradient ? s : 0,
    fast: backboneSupervision(pass, stopGradient) === 'fast-cross-entropy' ? 1 : 0,
    score: languageScore(pass, stopGradient, s),
    valves: states.map((state) => (state.sidewaysAttention || state.gradientCrosses ? 1 : 0)),
  };
}

/** How full a tray is of activation (forward) and of gradient (backward), 0 to 1. */
export function trayFill(pose: Pick<Pose, 'rise' | 'fall' | 'seep'>, column: Column, index: number): { activation: number; gradient: number } {
  const fromTop = LAYER_COUNT - 1 - index;
  return {
    activation: clamp01(pose.rise - index),
    gradient: clamp01((column === 'expert' ? pose.fall : pose.seep) - fromTop),
  };
}

/** The lever's angle above the horizontal for a flap that is `open` (0 shut, 1 open). */
export const leverDeg = (open: number) => SHUT_DEG + (OPEN_DEG - SHUT_DEG) * clamp01(open);

/** The gauge needle's direction on the head's top, as a floor direction, for a reading 0 to 100. */
export function gaugeDirection(score: number): [number, number] {
  const { sinA, cosA } = { sinA: Math.sin((AZIMUTH * Math.PI) / 180), cosA: Math.cos((AZIMUTH * Math.PI) / 180) };
  // Away from the viewer reads as up on the dial, screen-right as right.
  const up: [number, number] = [-cosA, -sinA];
  const right: [number, number] = [sinA, -cosA];
  const beta = ((Math.min(100, Math.max(0, score)) / 100 - 0.5) * GAUGE_SWEEP_DEG * Math.PI) / 180;
  return [up[0] * Math.cos(beta) + right[0] * Math.sin(beta), up[1] * Math.cos(beta) + right[1] * Math.sin(beta)];
}

// ---------------------------------------------------------------- live shapes
const winX = (column: Column) => (column === 'backbone' ? B_WIN : E_WIN);
const faceY = (column: Column) => (column === 'backbone' ? BACKBONE.y + BACKBONE.d : EXPERT.y + EXPERT.d) + BEZEL_T;
const glassRing = (column: Column, index: number) => {
  const [x0, x1] = winX(column);
  return faceRing(x0, x1, trayZ(index) + WIN_Z0, trayZ(index) + WIN_Z1, 1, faceY(column));
};

/** The fluid in a tray's sight glass, filled to `fraction` of the glass. */
export function fluidPath(column: Column, index: number, fraction: number): string {
  const f = clamp01(fraction);
  if (f <= 0.002) return '';
  const level = trayZ(index) + WIN_Z0 + (WIN_Z1 - WIN_Z0) * f;
  return pathOf(clipBelow(glassRing(column, index), level).map(at), true);
}

/** The fluid's surface line across the glass, edge to edge (none when empty or brim full). */
export function levelPath(column: Column, index: number, fraction: number): string {
  const f = clamp01(fraction);
  if (f <= 0.02 || f >= 0.98) return '';
  const [x0, x1] = winX(column);
  const z = trayZ(index) + WIN_Z0 + (WIN_Z1 - WIN_Z0) * f;
  const y = faceY(column);
  const inset = 1 - Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, Math.max(trayZ(index) + WIN_Z0 + 1 - z, z - (trayZ(index) + WIN_Z1 - 1))), 2)));
  return pathOf([at([x0 + inset, y, z]), at([x1 - inset, y, z])]);
}

/** The lever and its counterweight at an angle, for the valve whose shaft is at `hub`. */
function leverAt(hub: Point3, deg: number): { arm: SolidPaths; weight: SolidPaths; cap: SolidPaths; pin: Flat } {
  const a = (deg * Math.PI) / 180;
  const tip: Point3 = [hub[0] - LEVER_L * Math.cos(a), hub[1], hub[2] + LEVER_L * Math.sin(a)];
  return {
    arm: barBetween([hub[0], hub[1] - 0.5, hub[2]], [tip[0], tip[1] - 0.5, tip[2]], Y, 1.0, 1.6, P),
    weight: disc([tip[0], hub[1] - 1.3, tip[2]], Y, WEIGHT_R, 1.8, 24),
    cap: disc([hub[0], hub[1], hub[2]], Y, 1.25, 0.5, 18),
    pin: at([hub[0], hub[1] + 0.5, hub[2]]),
  };
}

/** A cross valve's cast body, between its two flanges. */
export const valveBody = (index: number) =>
  barBetween([VALVE_X - BODY_L / 2, PIPE_Y, pipeZ(index)], [VALVE_X + BODY_L / 2, PIPE_Y, pipeZ(index)], Y, BODY_HALF * 2, BODY_HALF * 2, P, 0.4);

/** The FAST feed in the sight tube, filled from the bottom to `fraction`: its body and its surface ring. */
export function sightFluid(fraction: number): { fill: string; surface: string } {
  const f = clamp01(fraction);
  if (f <= 0.002) return { fill: '', surface: '' };
  const [tx, ty] = TANK;
  const h = (SIGHT_Z1 - SIGHT_Z0 - 1) * f;
  const body = kitCylinder(tx, ty, SIGHT_R - 0.7, SIGHT_Z0 + 0.5, h, P, 32);
  return { fill: body.fill, surface: f >= 0.98 ? '' : ring(tx, ty, SIGHT_R - 0.7, SIGHT_Z0 + 0.5 + h, P, 32) };
}

/** A cross valve's shaft. */
export const valveHub = (index: number): Point3 => [VALVE_X, PIPE_Y + LEVER_Y + 0.5, pipeZ(index)];
/** The FAST valve's shaft, on its riser. */
export const FAST_HUB: Point3 = [TANK[0], TANK[1] + BOSS_Y + 1, FAST_VALVE_Z];

export const leverPaths = (hub: Point3, open: number) => leverAt(hub, leverDeg(open));

/** The gauge needle for a reading. */
export function needlePath(score: number): string {
  const [dx, dy] = gaugeDirection(score);
  const z = GAUGE[2] + GAUGE_H + 0.15;
  return lineOnTop([GAUGE[0] - dx * 2.6, GAUGE[1] - dy * 2.6], [GAUGE[0] + dx * (GAUGE_R - 4.6), GAUGE[1] + dy * (GAUGE_R - 4.6)], z, P);
}

/** The depth rider's height for a pass: the front of the reached trays. */
export function riderZ(pass: Pass, front: number): number {
  return pass === 'forward' ? Z0 + PITCH * front : Z_TOP - PITCH * front;
}
/** The rider is built at Z0 and moved up the scale. */
export const riderAt = (z: number) => translateAlong(P, [0, 0, z - Z0]);

// ---------------------------------------------------------------- base
const base: Part[] = [];
for (const [x, y] of byDepth([
  [BASE.x + 20, BASE.y + 18],
  [BASE.x + BASE.w - 20, BASE.y + 18],
  [BASE.x + 20, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 20, BASE.y + BASE.d - 18],
])) {
  base.push(solidOf(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), 'lo'));
  base.push(solidOf(cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), 'mid'));
}
base.push(solidOf(slab(BASE, -BASE_H, BASE_H, 8, 1.6), 'mid', { inner: seam(sideSeam(BASE, -3.2, P, 8)) }));
base.push(lineOf(planOutline(insetPlan(BASE, 5), 0, P), 'faint'));
{
  const screws: Array<[number, number]> = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  base.push(lineOf(screws.map(([x, y]) => ring(x, y, 2.3, 0, P, 16)).join(''), 'lo'));
  base.push(dotsOf(screws.map(([x, y]) => at([x, y, 0])), 0.55));
}
// The label plate at the front left, with three engraved rules and two screws.
const LABEL: Plan = { x: 22, y: 30, w: 36, d: 8, r: 1.6 };
base.push(solidOf(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' }));
base.push(lineOf(planOutline(insetPlan(LABEL, 1.5), 0.8, P, 3), 'faint'));
base.push(
  lineOf(
    [0, 1, 2].map((row) => onTop([[LABEL.x + 7, LABEL.y + 3.4 + row * 2.6], [LABEL.x + (row === 1 ? 24 : 33), LABEL.y + 3.4 + row * 2.6]], 0.8, P)).join(''),
    'lo',
    true,
  ),
);
base.push(dotsOf([at([LABEL.x + 3.4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.4, LABEL.y + LABEL.d / 2, 0.8])], 0.5));

// ---------------------------------------------------------------- a column: plinth, eight trays, head
type ColumnArt = { plinth: Part[]; trays: Part[][]; head: Part[] };

function columnArt(column: Column): ColumnArt {
  const plan = column === 'backbone' ? BACKBONE : EXPERT;
  const plinthPlan = insetPlan(plan, -3.2);
  const plinth: Part[] = [];
  plinth.push(solidOf(slab(plinthPlan, 0, Z0, 4, 0.6), 'mid', { inner: seam(sideSeam(plinthPlan, 1.6, P, 4)) }));
  const anchors = [
    [plinthPlan.x + 1.8, plinthPlan.y + plinthPlan.d - 1.8],
    [plinthPlan.x + plinthPlan.w - 1.8, plinthPlan.y + plinthPlan.d - 1.8],
    [plinthPlan.x + plinthPlan.w - 1.8, plinthPlan.y + 1.8],
  ] as Array<[number, number]>;
  plinth.push(dotsOf(anchors.map(([x, y]) => at([x, y, Z0])), 0.5));

  const [wx0, wx1] = winX(column);
  const yFront = plan.y + plan.d;
  const trays: Part[][] = [];
  for (let index = 0; index < LAYER_COUNT; index++) {
    const z = trayZ(index);
    const parts: Part[] = [];
    parts.push(solidOf(slab(plan, z, TRAY_H, 4, 0), 'hi'));
    const collar = insetPlan(plan, -0.9);
    parts.push(solidOf(slab(collar, z + TRAY_H, COLLAR, 4, 0.3), 'mid'));
    // Collar bolts along the front.
    const bolts = column === 'backbone' ? [plan.x + 4, plan.x + plan.w / 2, plan.x + plan.w - 4] : [plan.x + 3, plan.x + plan.w - 3];
    parts.push(dotsOf(bolts.map((x) => at([x, collar.y + collar.d, z + TRAY_H + COLLAR / 2])), 0.42));
    // The sight glass: a bezel on the front face, the glass, its fluid and its rim.
    const bezel = plateIn([0, yFront, 0], X, Z, roundedOutline(wx0 - BEZEL_RIM, z + WIN_Z0 - BEZEL_RIM, wx1 + BEZEL_RIM, z + WIN_Z1 + BEZEL_RIM, 2, 4), -BEZEL_T, P);
    parts.push(solidOf(bezel, 'mid', { crease: 'faint' }));
    const glass = faceRing(wx0, wx1, z + WIN_Z0, z + WIN_Z1, 1, yFront + BEZEL_T);
    parts.push({ kind: 'face', d: pathOf(glass.map(at), true), shade: 3 });
    parts.push({ kind: 'slot', name: `fluid-${column}-${index}` });
    parts.push(lineOf(pathOf(glass.map(at), true), 'mid'));
    parts.push(dotsOf([at([wx0 - BEZEL_RIM / 2 - 0.1, yFront + BEZEL_T, z + TRAY_H / 2]), at([wx1 + BEZEL_RIM / 2 + 0.1, yFront + BEZEL_T, z + TRAY_H / 2])], 0.38));
    trays.push(parts);
  }

  const head: Part[] = [];
  const headPlan = insetPlan(plan, column === 'backbone' ? 1.2 : 0.8);
  head.push(solidOf(slab(headPlan, Z_TOP, HEAD_H, 4, 0.8), 'hi', { inner: seam(sideSeam(headPlan, Z_TOP + 2.2, P, 4)) }));
  head.push(lineOf(planOutline(insetPlan(headPlan, 3), HEAD_TOP, P, 4), 'faint'));
  const corners: Array<[number, number]> = [
    [headPlan.x + 2, headPlan.y + 2],
    [headPlan.x + headPlan.w - 2, headPlan.y + 2],
    [headPlan.x + 2, headPlan.y + headPlan.d - 2],
    [headPlan.x + headPlan.w - 2, headPlan.y + headPlan.d - 2],
  ];
  head.push(dotsOf(corners.map(([x, y]) => at([x, y, HEAD_TOP])), 0.5));
  return { plinth, trays, head };
}

const backbone = columnArt('backbone');
const expert = columnArt('expert');

// The language gauge on the backbone's head: puck, knurled bezel, scale, needle (live) and hub.
const gauge: Part[] = [];
{
  const [cx, cy, z] = GAUGE;
  gauge.push(solidOf(cyl(cx, cy, GAUGE_R + 1.6, HEAD_TOP, z - HEAD_TOP, 56), 'mid'));
  gauge.push(
    solidOf(cyl(cx, cy, GAUGE_R, z, GAUGE_H, 72, 0.6), 'hi', {
      inner: seam(sideArc(cx, cy, GAUGE_R, z + GAUGE_H - 1.6, P, 48)),
    }),
  );
  gauge.push(lineOf(knurl(cx, cy, GAUGE_R, z + GAUGE_H - 1.6, z + GAUGE_H, 64, P, 0.3), 'lo'));
  const top = z + GAUGE_H;
  gauge.push(lineOf(ring(cx, cy, GAUGE_R - 1.8, top, P, 72), 'lo'));
  const minor: string[] = [];
  const major: string[] = [];
  for (let mark = 0; mark <= 100; mark += 5) {
    const [dx, dy] = gaugeDirection(mark);
    const r0 = GAUGE_R - 1.8;
    const r1 = r0 - (mark % 25 === 0 ? 2.5 : 1.5);
    (mark % 25 === 0 ? major : minor).push(lineOnTop([cx + dx * r0, cy + dy * r0], [cx + dx * r1, cy + dy * r1], top, P));
  }
  gauge.push(lineOf(minor.join(''), 'lo'));
  gauge.push(lineOf(major.join(''), 'mid'));
  // The intact reading, a long mark at the scale's peak.
  {
    const [dx, dy] = gaugeDirection(LANGUAGE_SCORE_MAX);
    const r0 = GAUGE_R - 1.8;
    gauge.push(lineOf(lineOnTop([cx + dx * r0, cy + dy * r0], [cx + dx * (r0 - 2.5), cy + dy * (r0 - 2.5)], top, P), 'hi'));
  }
  gauge.push({ kind: 'slot', name: 'needle' });
  gauge.push(solidOf(cyl(cx, cy, 1.5, top, 0.7, 16), 'hi'));
  gauge.push(dotsOf([at([cx, cy, top + 0.7])], 0.55, 'hi'));
}

// The FAST-token feed: a tank on the base, a riser with its own valve, two block elbows and a port on the head.
const fastFeed: Part[] = [];
{
  const [tx, ty] = TANK;
  fastFeed.push(solidOf(cyl(tx, ty, TANK_R + 1.6, 0, 1.8, 40), 'lo'));
  fastFeed.push(
    solidOf(cyl(tx, ty, TANK_R, 1.8, TANK_H - 1.8, 48, 0), 'hi', {
      inner: seam(sideArc(tx, ty, TANK_R, 8, P, 32) + sideArc(tx, ty, TANK_R, TANK_H - 6, P, 32)),
    }),
  );
  fastFeed.push(solidOf(cyl(tx, ty, TANK_R + 0.8, TANK_H, 1.6, 48, 0.4), 'mid'));
  fastFeed.push(dotsOf(Array.from({ length: 6 }, (_, k) => at([tx + (TANK_R - 1.2) * Math.cos(Math.PI * (0.05 + k / 3)), ty + (TANK_R - 1.2) * Math.sin(Math.PI * (0.05 + k / 3)), TANK_H + 1.6])), 0.45));
  const tankTop = TANK_H + 1.6;
  // The riser leaves the tank's lid through a flange.
  fastFeed.push(solidOf(cyl(tx, ty, 3.2, tankTop, 1.2, 24), 'mid'));
  const valveZ0 = FAST_VALVE_Z - BODY_L / 2;
  const valveZ1 = FAST_VALVE_Z + BODY_L / 2;
  fastFeed.push(solidOf(cyl(tx, ty, PIPE_R, tankTop + 1.2, valveZ0 - FLANGE_T - tankTop - 1.2, 20), 'mid'));
  fastFeed.push(solidOf(cyl(tx, ty, VALVE_FLANGE_R - 0.6, valveZ0 - FLANGE_T, FLANGE_T, 28), 'mid'));
  fastFeed.push(solidOf(slab({ x: tx - BODY_HALF, y: ty - BODY_HALF, w: BODY_HALF * 2, d: BODY_HALF * 2, r: 0.8 }, valveZ0, BODY_L, 2, 0.3), 'hi'));
  fastFeed.push(solidOf(cyl(tx, ty, VALVE_FLANGE_R - 0.6, valveZ1, FLANGE_T, 28), 'mid'));
  fastFeed.push(solidOf(disc([tx, ty + BODY_HALF, FAST_VALVE_Z], Y, 1.6, 1.3, 20), 'mid'));
  fastFeed.push({ kind: 'slot', name: 'fast-lever' });
  const elbowA: Plan = { x: tx - 3.4, y: ty - 3.4, w: 6.8, d: 6.8, r: 1 };
  // The sight tube: two flanges and a glass between them, the feed showing inside (live).
  fastFeed.push(solidOf(cyl(tx, ty, PIPE_R, valveZ1 + FLANGE_T, SIGHT_Z0 - FLANGE_T - valveZ1 - FLANGE_T, 20), 'mid'));
  fastFeed.push(solidOf(cyl(tx, ty, SIGHT_R + 1.3, SIGHT_Z0 - FLANGE_T, FLANGE_T, 28, 0.3), 'mid'));
  fastFeed.push(dotsOf([0, 1, 2].map((k) => at([tx + (SIGHT_R + 0.7) * Math.cos(Math.PI * (0.15 + k / 3)), ty + (SIGHT_R + 0.7) * Math.sin(Math.PI * (0.15 + k / 3)), SIGHT_Z0])), 0.36));
  fastFeed.push(solidOf(cyl(tx, ty, SIGHT_R, SIGHT_Z0, SIGHT_Z1 - SIGHT_Z0, 32), 'lo', { crease: 'none' }));
  fastFeed.push({ kind: 'slot', name: 'fast-fluid' });
  fastFeed.push(solidOf(cyl(tx, ty, SIGHT_R + 1.3, SIGHT_Z1, FLANGE_T, 28, 0.3), 'mid'));
  fastFeed.push(dotsOf([0, 1, 2].map((k) => at([tx + (SIGHT_R + 0.7) * Math.cos(Math.PI * (0.15 + k / 3)), ty + (SIGHT_R + 0.7) * Math.sin(Math.PI * (0.15 + k / 3)), SIGHT_Z1 + FLANGE_T])), 0.36));
  fastFeed.push(solidOf(cyl(tx, ty, PIPE_R, SIGHT_Z1 + FLANGE_T, FAST_Z - 3.4 - SIGHT_Z1 - FLANGE_T, 20), 'mid'));
  fastFeed.push(solidOf(slab(elbowA, FAST_Z - 3.4, 6.8, 2, 0.4), 'mid'));
  fastFeed.push(dotsOf([at([tx, ty, FAST_Z + 3.4])], 0.5));
  const [px, py, pz] = FAST_PORT;
  fastFeed.push(solidOf(disc([tx + 3.4, py, FAST_Z], X, PIPE_R, px - 3.4 - tx - 3.4, 20), 'mid'));
  fastFeed.push(solidOf(slab({ x: px - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 1 }, FAST_Z - 3.4, 6.8, 2, 0.4), 'mid'));
  fastFeed.push(dotsOf([at([px, py, FAST_Z + 3.4])], 0.5));
  // The port on the head: a boss and flange, the down-leg landing on it.
  fastFeed.push(solidOf(cyl(px, py, 4.2, pz, 1.4, 28, 0.3), 'mid'));
  fastFeed.push(solidOf(cyl(px, py, 2.8, pz + 1.4, 2.6, 24), 'mid'));
  fastFeed.push(solidOf(cyl(px, py, PIPE_R, pz + 4, FAST_Z - 3.4 - pz - 4, 20), 'mid'));
}

// ---------------------------------------------------------------- the cross pipes and their check valves
/**
 * One tray level's passage: the nozzle, pipe, flanges, cast body (a slot, lit in the forward pass), cover, boss and
 * stop pin. Its lever is drawn after every level, because a lifted lever stands in front of the level above.
 */
export type Level = { parts: Part[]; hub: Point3 };
const levels: Level[] = [];
for (let index = 0; index < LAYER_COUNT; index++) {
  const z = pipeZ(index);
  const parts: Part[] = [];
  // The nozzle on the backbone's side, the pipe to the valve.
  parts.push(solidOf(disc([B_FACE, PIPE_Y, z], X, NOZZLE_R, FLANGE_T, 28), 'mid'));
  const v0 = VALVE_X - BODY_L / 2;
  const v1 = VALVE_X + BODY_L / 2;
  parts.push(solidOf(disc([B_FACE + FLANGE_T, PIPE_Y, z], X, PIPE_R, v0 - FLANGE_T - B_FACE - FLANGE_T, 20), 'mid'));
  parts.push(solidOf(disc([v0 - FLANGE_T, PIPE_Y, z], X, VALVE_FLANGE_R, FLANGE_T, 32), 'mid'));
  // The cast body, its bolted cover, the shaft boss on the front face.
  parts.push({ kind: 'slot', name: `body-${index}` });
  parts.push(solidOf(slab({ x: VALVE_X - 4, y: PIPE_Y - 2.6, w: 8, d: 5.2, r: 0.8 }, z + BODY_HALF, 1.1, 2, 0.3), 'mid'));
  parts.push(dotsOf([at([VALVE_X - 2.8, PIPE_Y + 1.5, z + BODY_HALF + 1.1]), at([VALVE_X + 2.8, PIPE_Y + 1.5, z + BODY_HALF + 1.1])], 0.38));
  parts.push(solidOf(disc([v1, PIPE_Y, z], X, VALVE_FLANGE_R, FLANGE_T, 32), 'mid'));
  parts.push(dotsOf([0.25, 0.75, 1.25, 1.75].map((turn) => at([v1 + FLANGE_T, PIPE_Y + (VALVE_FLANGE_R - 1.3) * Math.cos(Math.PI * turn), z + (VALVE_FLANGE_R - 1.3) * Math.sin(Math.PI * turn)])), 0.36));
  parts.push(solidOf(disc([v1 + FLANGE_T, PIPE_Y, z], X, PIPE_R, E_FACE - FLANGE_T - v1 - FLANGE_T, 20), 'mid'));
  parts.push(solidOf(disc([E_FACE - FLANGE_T, PIPE_Y, z], X, NOZZLE_R, FLANGE_T, 28), 'mid'));
  parts.push(solidOf(disc([VALVE_X, PIPE_Y + BODY_HALF, z], Y, 1.6, BOSS_Y - BODY_HALF, 20), 'mid'));
  // The stop pin the shut lever rests on.
  parts.push(solidOf(disc([VALVE_X - 4, PIPE_Y + BODY_HALF, z - 2], Y, 0.7, 1.9, 14), 'mid'));
  levels.push({ parts, hub: valveHub(index) });
}

// ---------------------------------------------------------------- the expert's head: the loss port the gradient leaves from
const expertTop: Part[] = [];
{
  const cx = EXPERT.x + EXPERT.w / 2;
  const cy = PIPE_Y;
  expertTop.push(solidOf(cyl(cx, cy, 6.4, HEAD_TOP, 1.4, 36, 0.3), 'mid'));
  expertTop.push(solidOf(cyl(cx, cy, 4.6, HEAD_TOP + 1.4, 5, 32, 0), 'hi', { inner: seam(sideArc(cx, cy, 4.6, HEAD_TOP + 3.6, P, 24)) }));
  expertTop.push(solidOf(cyl(cx, cy, 5.4, HEAD_TOP + 6.4, 1.3, 36, 0.4), 'mid'));
  expertTop.push(dotsOf(Array.from({ length: 4 }, (_, k) => at([cx + 4.2 * Math.cos(Math.PI * (0.25 + k / 2)), cy + 4.2 * Math.sin(Math.PI * (0.25 + k / 2)), HEAD_TOP + 7.7])), 0.4));
}

// ---------------------------------------------------------------- the depth scale and its rider
const scale: Part[] = [];
{
  const foot: Plan = { x: SCALE.x - 2, y: SCALE.y - 2, w: SCALE.w + 4, d: SCALE.d + 4, r: 1 };
  scale.push(solidOf(slab(foot, 0, 2.4, 2, 0.4), 'lo'));
  scale.push(dotsOf([at([foot.x + 1.2, foot.y + foot.d - 1.2, 2.4]), at([foot.x + foot.w - 1.2, foot.y + 1.2, 2.4])], 0.4));
  scale.push(solidOf(slab(SCALE, 2.4, Z_TOP + 2 - 2.4, 2, 0.3), 'mid'));
  const yFace = SCALE.y + SCALE.d;
  const ticks: string[] = [];
  const longs: string[] = [];
  for (let k = 0; k <= LAYER_COUNT; k++) {
    const z = Z0 + k * PITCH;
    (k === 0 || k === LAYER_COUNT ? longs : ticks).push(segment([SCALE.x + 0.1, yFace, z], [SCALE.x + (k === 0 || k === LAYER_COUNT ? 2.2 : 1.5), yFace, z], P));
  }
  scale.push(lineOf(ticks.join(''), 'lo'));
  scale.push(lineOf(longs.join(''), 'mid'));
}
/** The rider, built at Z0: a clamp round the scale with an index toward the expert. */
const rider: Part[] = [];
{
  const clamp: Plan = { x: SCALE.x - 1.2, y: SCALE.y - 1.2, w: SCALE.w + 2.4, d: SCALE.d + 2.4, r: 0.8 };
  rider.push(solidOf(slab(clamp, Z0 - 1.3, 2.6, 2, 0.3), 'hi'));
  rider.push(solidOf(slab({ x: SCALE.x - 3.6, y: SCALE.y + 0.6, w: 2.4, d: 1.8, r: 0.3 }, Z0 - 0.5, 1, 2), 'hi'));
  rider.push(solidOf(cyl(SCALE.x + SCALE.w + 2, SCALE.y + SCALE.d / 2, 1, Z0 - 0.6, 1.2, 14), 'mid'));
}

// ---------------------------------------------------------------- exports in painter's order
export const BASE_PARTS: readonly Part[] = base;
export const BACKBONE_PLINTH: readonly Part[] = backbone.plinth;
export const BACKBONE_TRAYS: readonly (readonly Part[])[] = backbone.trays;
export const BACKBONE_HEAD: readonly Part[] = backbone.head;
export const GAUGE_PARTS: readonly Part[] = gauge;
export const FAST_PARTS: readonly Part[] = fastFeed;
export const LEVELS: readonly Level[] = levels;
export const EXPERT_PLINTH: readonly Part[] = expert.plinth;
export const EXPERT_TRAYS: readonly (readonly Part[])[] = expert.trays;
export const EXPERT_HEAD: readonly Part[] = [...expert.head, ...expertTop];
export const SCALE_PARTS: readonly Part[] = scale;
export const RIDER_PARTS: readonly Part[] = rider;

const everything: Part[] = [
  ...base,
  ...backbone.plinth,
  ...backbone.trays.flat(),
  ...backbone.head,
  ...gauge,
  ...fastFeed,
  ...levels.flatMap((level) => level.parts),
  ...expert.plinth,
  ...expert.trays.flat(),
  ...expert.head,
  ...expertTop,
  ...scale,
  ...rider,
];
/** Solids drawn at rest, counting the nine live levers and their weights. */
export const SOLID_COUNT = everything.filter((part) => part.kind === 'solid').length + 2 * (LAYER_COUNT + 1);

// ---------------------------------------------------------------- motion toward a pose
/** The fastest a fluid front moves, in trays a second, so a pass runs tray by tray. */
export const FRONT_SPEED = 3.2;
const FRONT_LAG = 0.08;
const FRONT_GAIN = 0.32;

/** Everything the live drawing eases: the shown pose, the fronts' speeds and the rider's height. */
export interface Motion {
  pose: Pose;
  rate: { rise: number; fall: number; seep: number };
  rider: number;
}

export const motionAt = (pass: Pass, pose: Pose): Motion => ({
  pose: { ...pose, valves: [...pose.valves] },
  rate: { rise: 0, fall: 0, seep: 0 },
  rider: riderZ(pass, pass === 'forward' ? pose.rise : pose.fall),
});

const ease = (current: number, target: number, dt: number, seconds: number, epsilon = 1e-3) => {
  const next = current + (target - current) * (1 - Math.exp(-dt / seconds));
  return Math.abs(target - next) < epsilon ? target : next;
};

/** A fluid front: critically damped toward its target, never faster than FRONT_SPEED. */
function moveFront(motion: Motion, key: 'rise' | 'fall' | 'seep', target: number, dt: number) {
  const x = motion.pose[key];
  const want = Math.max(-FRONT_SPEED, Math.min(FRONT_SPEED, (target - x) / FRONT_GAIN));
  const rate = motion.rate[key] + (want - motion.rate[key]) * (1 - Math.exp(-dt / FRONT_LAG));
  const next = x + rate * dt;
  if (Math.abs(target - next) < 2e-3 && Math.abs(rate) < 0.02) {
    motion.pose[key] = target;
    motion.rate[key] = 0;
  } else {
    motion.pose[key] = next;
    motion.rate[key] = rate;
  }
}

/**
 * One frame toward the rest pose `target`. The backbone's seep never runs ahead of the expert's gradient, and a
 * valve opens only once its pass's front has reached its tray. Returns true while anything still moves.
 */
export function stepMotion(motion: Motion, target: Pose, pass: Pass, dt: number): boolean {
  const pose = motion.pose;
  moveFront(motion, 'rise', target.rise, dt);
  moveFront(motion, 'fall', target.fall, dt);
  moveFront(motion, 'seep', Math.min(target.seep, pose.fall), dt);
  const front = pass === 'forward' ? pose.rise : pose.fall;
  for (let index = 0; index < LAYER_COUNT; index++) {
    const order = pass === 'forward' ? index : LAYER_COUNT - 1 - index;
    const want = target.valves[index]! > 0 && front >= order + 0.6 ? 1 : 0;
    pose.valves[index] = ease(pose.valves[index]!, want, dt, 0.16);
  }
  pose.fast = ease(pose.fast, target.fast, dt, 0.4);
  pose.score = ease(pose.score, target.score, dt, 0.55, 0.01);
  motion.rider = ease(motion.rider, riderZ(pass, pass === 'forward' ? target.rise : target.fall), dt, 0.3, 0.01);
  const settled =
    pose.rise === target.rise &&
    pose.fall === target.fall &&
    pose.seep === target.seep &&
    pose.fast === target.fast &&
    pose.score === target.score &&
    pose.valves.every((open, index) => open === target.valves[index]) &&
    motion.rider === riderZ(pass, pass === 'forward' ? target.rise : target.fall);
  return !settled;
}
