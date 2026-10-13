/**
 * The flight-test corridor for PerceptionLatency and SenseAvoid, drawn with
 * the isometric kit.
 *
 * The object is the explanation. A quadrotor rides a test carriage down a
 * rail toward a brick wall. A light gate stands 8 metres before the wall:
 * that is where the drone's camera first sees it. The carriage carries a
 * timer wheel set to the camera's delay; the gate starts it running down,
 * and only when it reaches zero is the cross-slide released, so a spring pack
 * throws the drone sideways as hard as the airframe can swerve. Run at the
 * fastest safe speed, the drone flies blind for speed x delay (the lit rider
 * on the gauge board), then swerves for the rest of the 8 metres and passes
 * the wall's edge with nothing to spare. A slower camera spends more of the 8
 * metres blind, so the same swerve only fits at a lower speed, which the dial
 * on the console reads.
 *
 * World units: x runs down the corridor (the gate at x = 0, the wall's face
 * at x = 8 m), y across it (toward the viewer is +y), z up. The drone's path
 * is y = 0. Along x the gauge board is to scale, 28 units a metre; the drone
 * and its sideways throw are drawn larger than that scale so the airframe
 * reads. The camera looks from azimuth 120, so the wall's face toward the
 * drone and the corridor's near side both face the viewer.
 *
 * One corridor has one lane. The twin corridor (SenseAvoid) adds a second,
 * identical lane behind the first, the same built parts moved back by
 * `TWIN_GAP`; both drones fly at the one wall through the one gate, and the
 * gauge board in front gets one track per lane.
 *
 * Every static path is built once. The moving groups are built at rest and
 * moved with `translateAlong`: the carriage (along x) and the cross-slide
 * with the drone (along y). The timer wheel, the propellers, the dial needle
 * and the knob pointers turn in their own face planes; the spring coil and
 * the gauge riders are the only paths rebuilt.
 */
import {
  coil,
  cylinder as kitCylinder,
  depthOf,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  radialTicks,
  ring,
  segment,
  sideArc,
  sideMatrix,
  sideRing,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  translateAlong,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';

// ------------------------------------------------------------ the model scale
/** Gauge-board units per metre along the corridor. */
export const UNITS_PER_M = 20;
/** The sensing range: the gate stands this far before the wall. */
export const RANGE_M = 8;
/** The wall's face, toward the drone. */
export const WALL_X = RANGE_M * UNITS_PER_M;
/** How far behind the front lane the twin corridor's back lane runs. */
export const TWIN_GAP = 124;
/** Where a run starts: the drone this far before the gate. */
export const START_X = -22;

export const AZIMUTH = 120;
export const ELEVATION = 30;

// ------------------------------------------------------------------- layout
/** The drone rides this high above the bed (the underside of its skids). */
const ZD = 56;
/** Propeller hubs sit this far from the drone's centre along x and y. */
const MOTOR_OFFSET = 25;
const PROP_R = 16;
/** The drone's reach from its centre to a propeller tip. */
export const DRONE_REACH = MOTOR_OFFSET * Math.SQRT2 + PROP_R;
/** The wall's near edge stands this far past the drone's path. */
const EDGE_PAST = 8;
/** The cross-slide's throw: at the wall's face the drone's reach just clears the wall's edge. */
export const THROW = EDGE_PAST + DRONE_REACH;

const BED_Z = -8;
const FOOT_H = 6;
const RAIL_Y = [30, 64] as const;
const RAIL_Z = [2.5, 7] as const;
const BELT_Y = [41, 53] as const;
const PLATE: Plan = { x: -28, y: 9, w: 56, d: 90, r: 3 };
const PLATE_Z = [12, 16] as const;
/** The cross-slide's back face when cocked. */
const SLIDER_Y = 27;
const SLIDER_D = 10;
const MAST_Y = SLIDER_Y + 5;
const ARM_Z = ZD - 5;
/** The timer wheel on the carriage. */
const WHEEL = { x: 17, y: 54, r: 7.5, z: PLATE_Z[1], h: 3 };
const WHEEL_SCALE_R = 10.2;
/** The timer scale: 0 to 200 ms over 300 degrees. */
export const TIMER_MAX_MS = 200;
const TIMER_SWEEP_DEG = 300;
const SPRING = { x: -14, z: 22.4, r: 3.2 };
/** The spring pack's turns for the four swerve settings, gentle to extreme: a stiffer pack throws harder. */
export const SPRING_TURNS = [4, 6, 8, 11] as const;
const BACK_STOP_Y = 16;
const FRONT_STOP_Y = 93;

/** The light gate's photo-eye looks across the corridor at this height; the carriage's mast breaks its beam. */
const BEAM_Z = 40;
const WALL_TOP = 100;

// The console at the start of each lane: the speed dial on its front, two knobs on its lid.
const CONSOLE: Plan = { x: -90, y: 100, w: 62, d: 32, r: 3 };
const CONSOLE_H = 48;
const DIAL = { x: -59, z: 25, r: 17, depth: 2.4 };
/** The speed dial: 0 to 250 km/h over 240 degrees, zero at lower left. */
export const DIAL_MAX_KMH = 250;
const DIAL_SWEEP = 240;
const KNOBS = { delay: [-76, 116] as Plane, agility: [-43, 116] as Plane };
const KNOB_R = 5;
const KNOB_SCALE_R = 8.6;
/** The delay knob's scale: 0 to 200 ms over 270 degrees; the agility knob's four detents over 180. */
const DELAY_SWEEP_DEG = 270;
const AGILITY_SWEEP_DEG = 180;

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'face'; d: string; fill: 'top' | 'paper' | 0 | 1 | 2 | 3 }
  | { kind: 'slot'; slot: Slot };

/**
 * Where the moving and rebuilt pieces go in the painter's order. Lane-owned
 * slots carry the lane's index: 0 is the front lane, 1 the twin's back lane.
 */
export type Slot =
  | 'wall'
  | 'board-ends'
  | `carriage-${number}`
  | `slider-${number}`
  | `coil-back-${number}`
  | `coil-front-${number}`
  | `wheel-${number}`
  | `props-${number}`
  | `dial-${number}`
  | `delay-knob-${number}`
  | `agility-knob-${number}`
  | `track-${number}`;

export interface CorridorLane {
  index: number;
  /** World y of the lane's drone path (0 for the front lane). */
  dy: number;
  /** Parts that ride the carriage, built at carriage x = 0, in painter's order, with nested slots. */
  carriage: Part[];
  /** Parts that ride the cross-slide (and the drone on it), built cocked. */
  slider: Part[];
  /** The timer wheel's turning face (in `wheelMatrix` space). */
  wheelFace: { slots: string; dog: string; hub: string; pointer: string };
  /** The four propellers, each in its own top-face matrix at rest. */
  props: Array<{ matrix: string; blade: string; hub: string }>;
  wheelMatrix: string;
  dialMatrix: string;
  delayKnobMatrix: string;
  agilityKnobMatrix: string;
  /** World y span of this lane's track on the gauge board. */
  track: { y0: number; y1: number };
}

export interface Corridor {
  WIDTH: number;
  HEIGHT: number;
  VIEW_BOX: string;
  P: Projection;
  PARTS: Part[];
  /** The wall's parts (the slot `wall`). */
  WALL_PARTS: Part[];
  /** The gauge board's two end marks, at the gate and at the wall (the slot `board-ends`). */
  BOARD_ENDS: string;
  lanes: CorridorLane[];
  /** The dial face (rim, scale arc, ticks), its needle and hub, in the dial's face plane. */
  DIAL_FACE: { face: string; rim: string; arc: string; minor: string; major: string; zero: string };
  NEEDLE: string;
  NEEDLE_HUB: string;
  KNOB_POINTER: string;
  /** The hub ring the knob pointer starts from. */
  KNOB_HUB: string;
  /** The carriage moved `x` units down the corridor (x = 0: the drone at the gate). */
  carriageShift: (x: number) => string;
  /** The cross-slide thrown by `share` of its travel (0 cocked, 1 past the wall's edge). */
  sliderShift: (share: number) => string;
  /** The spring coil between the back stop and the slider, thrown by `share`; a stiffer pack (a harder swerve) has more turns. */
  coilAt: (lane: number, share: number, turns?: number) => { back: string; front: string };
  /** The two gauge riders for a blind stretch and a swerve stretch, in metres. */
  ridersAt: (lane: number, blindM: number, swerveM: number) => { blind: SolidPaths; swerve: SolidPaths };
  /** The track's face matrix, in units of `perMetre` a metre from the gate, so a rect's width reads metres x perMetre. */
  trackMatrix: (lane: number, perMetre: number) => string;
  /** The track's depth in the units of `trackMatrix(lane, perMetre)`. */
  trackDepth: (lane: number, perMetre: number) => number;
}

// ---------------------------------------------------------------- the angles
/** The dial needle's turn from its zero mark, in degrees, for a speed in km/h. */
export const needleDegrees = (kmh: number) => (Math.min(Math.max(kmh, 0), DIAL_MAX_KMH) / DIAL_MAX_KMH) * DIAL_SWEEP;
/** The dial needle's own angle at zero (the needle path points along +x of the face). */
export const NEEDLE_ZERO_DEG = 90 + (360 - DIAL_SWEEP) / 2;
/** The timer wheel's turn for the delay still to run, in degrees from its zero at the pawl. */
export const wheelDegrees = (ms: number) => (Math.min(Math.max(ms, 0), TIMER_MAX_MS) / TIMER_MAX_MS) * TIMER_SWEEP_DEG;
/** The delay knob's pointer, in degrees from straight back (-y), for a set delay. */
export const delayKnobDegrees = (ms: number) => -DELAY_SWEEP_DEG / 2 + (Math.min(Math.max(ms, 0), TIMER_MAX_MS) / TIMER_MAX_MS) * DELAY_SWEEP_DEG;
/** The agility knob's pointer for detent 0..3. */
export const agilityKnobDegrees = (detent: number) => -AGILITY_SWEEP_DEG / 2 + (Math.min(Math.max(detent, 0), 3) / 3) * AGILITY_SWEEP_DEG;
/** The cross-slide's throw at a share of the swerve's duration: full sideways push, then full brake. */
export const throwShare = (timeShare: number) => {
  const s = Math.min(Math.max(timeShare, 0), 1);
  return s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
};

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const circlePath = (r: number) => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`;
const deg = Math.PI / 180;

// -------------------------------------------------------------------- build
export function buildCorridor({ tracks, width = 640 }: { tracks: 1 | 2; width?: number }): Corridor {
  const twin = tracks === 2;
  const laneShifts = twin ? [0, -TWIN_GAP] : [0];
  const backLane = Math.min(...laneShifts);
  const FAR_Y = backLane - 74;
  const RULER: Plan = twin ? { x: -8, y: 102, w: WALL_X + 16, d: 30, r: 1.5 } : { x: -8, y: 102, w: WALL_X + 16, d: 22, r: 1.5 };
  const RULER_TOP = 1.2;
  const GATE = { far: FAR_Y + 15 };
  const NEAR_Y = RULER.y + RULER.d + 12;
  const BED: Plan = { x: -96, y: FAR_Y, w: WALL_X + 44 + 96, d: NEAR_Y - FAR_Y, r: 8 };
  const WALL: Plan = { x: WALL_X, y: backLane - DRONE_REACH - 8, w: 8, d: EDGE_PAST - (backLane - DRONE_REACH - 8), r: 1 };

  // ---- camera, fitted to the extremes of every pose the figure shows
  const extremes: Point3[] = [];
  for (const px of [BED.x, BED.x + BED.w]) for (const py of [BED.y, BED.y + BED.d]) extremes.push([px, py, BED_Z - FOOT_H], [px, py, 0]);
  for (const py of [WALL.y, WALL.y + WALL.d]) extremes.push([WALL.x, py, WALL_TOP + 3]);
  extremes.push([-94, FAR_Y + 4, 101], [WALL_X - 4, FAR_Y + 4, 101]);
  extremes.push([0, GATE.far, BEAM_Z + 12]);
  // The drone at the start of a run, and at the wall, thrown (the end of a run).
  for (const dy of laneShifts) extremes.push([START_X - DRONE_REACH, dy - DRONE_REACH, ZD + 28]);
  extremes.push([WALL_X + DRONE_REACH, THROW + DRONE_REACH, ZD + 28]);
  const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
  const flat = extremes.map((point) => iso(point, unit));
  const spanX = Math.max(...flat.map(([x]) => x)) - Math.min(...flat.map(([x]) => x));
  const spanY = Math.max(...flat.map(([, y]) => y)) - Math.min(...flat.map(([, y]) => y));
  const PAD = 12;
  const WIDTH = width;
  const HEIGHT = Math.ceil(((WIDTH - 2 * PAD) * spanY) / spanX + 2 * PAD);
  const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH, elevation: ELEVATION });

  const at = (point: Point3) => iso(point, P);
  const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
  const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
  const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
  const corners = (plan: Plan, inset: number): Plane[] => [
    [plan.x + inset, plan.y + inset],
    [plan.x + plan.w - inset, plan.y + inset],
    [plan.x + inset, plan.y + plan.d - inset],
    [plan.x + plan.w - inset, plan.y + plan.d - inset],
  ];

  /** A closed rectangle on the face x = `x` (a brick). */
  const faceRectX = (y0: number, y1: number, z0: number, z1: number, x: number) =>
    pathOf([at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])], true);
  /** A closed rounded slot on the face x = `x` (a vent). */
  const slotX = (y0: number, y1: number, z0: number, z1: number, x: number) => {
    const r = Math.min((y1 - y0) / 2, (z1 - z0) / 2);
    const points: Flat[] = [];
    const arc = (cy: number, cz: number, from: number) => {
      for (let step = 0; step <= 6; step++) {
        const angle = from + (step / 6) * Math.PI;
        points.push(at([x, cy + r * Math.cos(angle), cz + r * Math.sin(angle)]));
      }
    };
    arc((y0 + y1) / 2, z1 - r, 0);
    arc((y0 + y1) / 2, z0 + r, Math.PI);
    return pathOf(points, true);
  };
  /** A round part standing out of a face whose normal is +y, from y0 to y0 + depth. */
  const bossY = (cx: number, cz: number, y0: number, depth: number, r: number, steps = 48): SolidPaths => {
    const front: Flat[] = [];
    const back: Flat[] = [];
    for (let k = 0; k < steps; k++) {
      const angle = (k / steps) * Math.PI * 2;
      front.push(at([cx + r * Math.cos(angle), y0 + depth, cz + r * Math.sin(angle)]));
      back.push(at([cx + r * Math.cos(angle), y0, cz + r * Math.sin(angle)]));
    }
    const outline = pathOf(hull([...front, ...back]), true);
    return { fill: outline, outline, crease: pathOf(front, true), top: pathOf(front, true), shades: ['', '', outline, ''] };
  };
  /** A bar between two floor points, `w` wide, from z to z + h. */
  const barBetween = (a: Plane, b: Plane, w: number, z: number, h: number) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * (w / 2);
    const ny = (dx / length) * (w / 2);
    return extrude([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], z, h, P);
  };

  const PARTS: Part[] = [];
  const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) =>
    list.push({ kind: 'solid', paths, tone, ...extra });
  const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => list.push({ kind: 'line', d, tone, free });
  const dots = (list: Part[], points: Flat[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone });
  const slot = (list: Part[], name: Slot) => list.push({ kind: 'slot', slot: name });
  const screwsOnTop = (list: Part[], plan: Plan, z: number, inset = 2.5, size = 0.45) => dots(list, corners(plan, inset).map(([x, y]) => at([x, y, z])), size, 'mid');

  // ---------------------------------------------------------------- the bed
  const feet = byDepth([BED.x + 24, BED.x + BED.w / 2, BED.x + BED.w - 24].flatMap((x) => [[x, BED.y + 18], [x, BED.y + BED.d - 18]] as Plane[]));
  for (const [x, y] of feet) {
    solid(PARTS, cyl(x, y, 8, BED_Z - FOOT_H, 1.6, 28), 'lo');
    solid(PARTS, cyl(x, y, 6, BED_Z - FOOT_H + 1.6, FOOT_H - 1.6, 28), 'mid');
  }
  solid(PARTS, slab(BED, BED_Z, -BED_Z, 8, 1.4), 'mid', { inner: sideSeam(BED, BED_Z + 2.6, P, 8) });
  line(PARTS, planOutline(insetPlan(BED, 5), 0, P), 'faint');
  for (const [x, y] of corners(BED, 10)) line(PARTS, ring(x, y, 2.2, 0, P, 16), 'lo');
  dots(PARTS, corners(BED, 10).map(([x, y]) => at([x, y, 0])), 0.55, 'mid');
  // The label plate on the bed's front face; its three rule lines stand for print.
  const LABEL = { x0: BED.x + BED.w - 96, x1: BED.x + BED.w - 40, y: BED.y + BED.d };
  solid(PARTS, slab({ x: LABEL.x0, y: LABEL.y, w: LABEL.x1 - LABEL.x0, d: 0.8, r: 0.6 }, BED_Z + 1.4, -BED_Z - 2.8, 2), 'lo');
  for (const [k, share] of [[0, 0.82], [1, 0.56], [2, 0.7]] as const) {
    const z = -2.6 - k * 1.3;
    line(PARTS, segment([LABEL.x0 + 4, LABEL.y + 0.8, z], [LABEL.x0 + 4 + (LABEL.x1 - LABEL.x0 - 14) * share, LABEL.y + 0.8, z], P), 'lo', true);
  }
  dots(PARTS, [at([LABEL.x0 + 1.8, LABEL.y + 0.8, BED_Z / 2]), at([LABEL.x1 - 1.8, LABEL.y + 0.8, BED_Z / 2])], 0.45, 'mid');
  // The flight lane under each drone's path: a mat from the gate to the wall, one bay a metre.
  for (const dy of laneShifts) {
    const mat: Plan = { x: 0, y: dy - 22, w: WALL_X, d: 44, r: 1 };
    const bays = Array.from({ length: RANGE_M - 1 }, (_, k) => lineOnTop([(k + 1) * UNITS_PER_M, mat.y], [(k + 1) * UNITS_PER_M, mat.y + mat.d], 0.8, P)).join('');
    solid(PARTS, slab(mat, 0, 0.8, 2), 'lo');
    line(PARTS, bays, 'lo');
    line(PARTS, lineOnTop([0, dy], [WALL_X, dy], 0.8, P), 'faint');
  }

  // ------------------------------------------- the safety net along the far side
  // Posts on foot plates, a top and a bottom rail, and the mesh between them (it ends under the posts and rails).
  const NET_Y = FAR_Y + 4;
  const NET_X = [-92, -40, 12, 64, 116, WALL_X - 18];
  const NET_TOP = 96;
  const mesh: string[] = [];
  for (let x = NET_X[0] + 12.5; x < NET_X[NET_X.length - 1] - 2; x += 12.5) {
    if (NET_X.some((post) => Math.abs(post - x) < 3)) continue;
    mesh.push(segment([x, NET_Y + 1.4, 4], [x, NET_Y + 1.4, NET_TOP], P));
  }
  // The mesh's courses run between the end posts and stop where they meet each post's outline on screen.
  const toward = (side: 1 | -1) => (side * 2.3 + Math.cos((AZIMUTH * Math.PI) / 180) * 1.4) / Math.sin((AZIMUTH * Math.PI) / 180);
  for (let z = 4 + 11.5; z < NET_TOP - 2; z += 11.5) mesh.push(segment([NET_X[0] + toward(1), NET_Y + 1.4, z], [NET_X[NET_X.length - 1] + toward(-1), NET_Y + 1.4, z], P));
  line(PARTS, mesh.join(''), 'faint');
  solid(PARTS, slab({ x: NET_X[0] - 2, y: NET_Y - 1.4, w: NET_X[NET_X.length - 1] - NET_X[0] + 4, d: 2.8, r: 1 }, 0, 4, 2), 'lo');
  for (const x of NET_X) {
    solid(PARTS, slab({ x: x - 4.5, y: NET_Y - 4.5, w: 9, d: 9, r: 1.2 }, 0, 1.8, 2), 'lo');
    solid(PARTS, cyl(x, NET_Y, 2.3, 1.8, NET_TOP + 3 - 1.8, 18), 'mid');
  }
  solid(PARTS, slab({ x: NET_X[0] - 2, y: NET_Y - 1.4, w: NET_X[NET_X.length - 1] - NET_X[0] + 4, d: 2.8, r: 1 }, NET_TOP, 3, 2, 0.3), 'mid');
  for (const x of NET_X) solid(PARTS, cyl(x, NET_Y, 3, NET_TOP + 3, 1.6, 18), 'lo');

  // ---------------------------------------------------- the gate's far post
  const gatePost = (list: Part[], y: number, toward: 1 | -1) => {
    const base: Plan = { x: -7, y: y - 7, w: 14, d: 14, r: 1.5 };
    solid(list, slab(base, 0, 2.2, 3, 0.5), 'lo');
    screwsOnTop(list, base, 2.2, 2.6);
    solid(list, cyl(0, y, 4, 2.2, 3, 24), 'mid');
    solid(list, cyl(0, y, 2.6, 5.2, BEAM_Z - 12, 20), 'mid', { inner: sideArc(0, y, 2.6, 20, P, 16) });
    const head: Plan = toward > 0 ? { x: -5, y: y - 4.5, w: 10, d: 13, r: 1.5 } : { x: -5, y: y - 8.5, w: 10, d: 13, r: 1.5 };
    solid(list, slab(head, BEAM_Z - 7, 14, 3, 0.5), 'mid', { inner: sideSeam(head, BEAM_Z + 3.6, P, 3) });
    const face = toward > 0 ? head.y + head.d : head.y;
    solid(list, slab({ x: -3, y: toward > 0 ? face : face - 1.4, w: 6, d: 1.4, r: 1.4 }, BEAM_Z - 3, 6, 4), 'hi');
    solid(list, cyl(0, y, 1.8, BEAM_Z + 7, 2.4, 16), 'lo');
    return face + (toward > 0 ? 1.4 : -1.4);
  };
  gatePost(PARTS, GATE.far, 1);

  // --------------------------------------------------------------- the wall
  // A brick panel in a steel foot channel, held from behind by two stepped buttresses.
  const WALL_PARTS: Part[] = [];
  for (const y of [WALL.y + 9, WALL.y + WALL.d - 13]) {
    for (const [x0, w, h] of [[WALL.x + 8, 22, 14], [WALL.x + 8, 14, 38], [WALL.x + 8, 7, 68]] as const) {
      const step: Plan = { x: x0, y: y - 4, w, d: 8, r: 1 };
      solid(WALL_PARTS, slab(step, 2.5, h, 2, 0.4), 'lo');
    }
  }
  const CHANNEL: Plan = { x: WALL.x - 6, y: WALL.y - 3, w: WALL.w + 34, d: WALL.d + 6, r: 1.5 };
  solid(WALL_PARTS, slab(CHANNEL, 0, 2.5, 3, 0.5), 'lo');
  screwsOnTop(PARTS, CHANNEL, 2.5, 2.4);
  const BRICK_H = 8.4;
  const courses: string[] = [];
  for (let k = 0, z = 3.6; z + BRICK_H <= WALL_TOP - 2; k++, z += BRICK_H) {
    const offset = k % 2 ? 9 : 0;
    for (let y0 = WALL.y + 1 - offset; y0 < WALL.y + WALL.d - 1; y0 += 18) {
      const a = Math.max(y0 + 0.7, WALL.y + 1.2);
      const b = Math.min(y0 + 18 - 0.7, WALL.y + WALL.d - 5);
      if (b - a > 2.5) courses.push(faceRectX(a, b, z + 0.7, z + BRICK_H - 0.7, WALL.x));
    }
  }
  solid(WALL_PARTS, slab(WALL, 2.5, WALL_TOP - 2.5, 2), 'mid', { inner: courses.join('') });
  const CAP: Plan = { x: WALL.x - 2, y: WALL.y - 2, w: WALL.w + 4, d: WALL.d + 4, r: 1 };
  solid(WALL_PARTS, slab(CAP, WALL_TOP, 3.4, 2, 0.5), 'mid');
  dots(WALL_PARTS, [at([WALL.x + 4, WALL.y + 3, WALL_TOP + 3.4]), at([WALL.x + 4, WALL.y + WALL.d - 3, WALL_TOP + 3.4])], 0.5, 'mid');
  // The edge post: the wall's near edge, the one the drone's propellers clear.
  solid(WALL_PARTS, slab({ x: WALL.x - 1.2, y: WALL.y + WALL.d - 4.6, w: WALL.w + 2.4, d: 4.6, r: 0.8 }, 2.5, WALL_TOP - 2.5, 2), 'hi');

  slot(PARTS, 'wall');

  // ------------------------------------------------------- the gauge board
  /** Each lane's track on the gauge board: the back lane's nearer the ticks. */
  const trackOf = (index: number) =>
    twin
      ? index === 1
        ? { y0: RULER.y + 8.4, y1: RULER.y + 17.4 }
        : { y0: RULER.y + 19.2, y1: RULER.y + 28.2 }
      : { y0: RULER.y + 8.6, y1: RULER.y + 19.6 };
  solid(PARTS, slab(RULER, 0, RULER_TOP, 3), 'lo');
  const ticks = topTicks(0, WALL_X, UNITS_PER_M / 2, 2, RULER.y + 0.6, RULER_TOP, [2.6, 5], P);
  line(PARTS, ticks.minor, 'lo');
  line(PARTS, ticks.major, 'mid');
  slot(PARTS, 'board-ends');
  for (const index of laneShifts.keys()) {
    const t = trackOf(index);
    line(PARTS, planOutline({ x: 0, y: t.y0 - 0.7, w: WALL_X, d: t.y1 - t.y0 + 1.4, r: 0.6 }, RULER_TOP, P, 2), 'faint');
  }
  dots(PARTS, [at([RULER.x + 3.4, RULER.y + RULER.d / 2, RULER_TOP]), at([RULER.x + RULER.w - 3.4, RULER.y + RULER.d / 2, RULER_TOP])], 0.45, 'mid');
  for (const index of [...laneShifts.keys()].reverse()) slot(PARTS, `track-${index}`);

  // --------------------------------------------------------------- the lanes
  const lanes: CorridorLane[] = [];
  const laneOrder = [...laneShifts.keys()].reverse(); // the back lane first
  for (const index of laneOrder) {
    const dy = laneShifts[index];
    const list: Part[] = [];
    const Y = (y: number) => y + dy;
    // The back lane's rails stop short of the wall, which spans its path.
    const railEnd = twin && index === 1 ? WALL_X - 34 : WALL_X + 28;

    // Cross ties, the belt round its two pulleys, the rails with their buffers.
    for (let x = -68; x <= railEnd; x += 32) solid(list, slab({ x, y: Y(RAIL_Y[0] - 8), w: 7, d: RAIL_Y[1] - RAIL_Y[0] + 16, r: 1 }, 0, RAIL_Z[0], 2), 'lo');
    const pulleys: Plane[] = [[-64, Y((BELT_Y[0] + BELT_Y[1]) / 2)], [railEnd - 6, Y((BELT_Y[0] + BELT_Y[1]) / 2)]];
    for (const [x, y] of pulleys) {
      const block: Plan = { x: x - 8, y: y - 8, w: 16, d: 16, r: 1.5 };
      solid(list, slab(block, 0, 2, 2), 'lo');
      solid(list, cyl(x, y, (BELT_Y[1] - BELT_Y[0]) / 2, 2, 3.4, 28), 'mid');
      line(list, ring(x, y, 1.4, 5.4, P, 12), 'lo');
    }
    for (const by of BELT_Y) line(list, lineOnTop([pulleys[0][0], Y(by)], [pulleys[1][0], Y(by)], 5.4, P), 'lo');
    for (const ry of RAIL_Y) {
      const rail: Plan = { x: -76, y: Y(ry) - 2.4, w: railEnd + 12 + 76, d: 4.8, r: 1 };
      solid(list, slab(rail, RAIL_Z[0], RAIL_Z[1] - RAIL_Z[0], 2, 0.4), 'mid');
      for (const x of [rail.x + 3, rail.x + rail.w - 3]) dots(list, [at([x, Y(ry), RAIL_Z[1]])], 0.45, 'mid');
      solid(list, slab({ x: railEnd + 4, y: Y(ry) - 4.5, w: 6, d: 9, r: 1 }, RAIL_Z[1], 6, 2), 'lo');
      solid(list, slab({ x: -74, y: Y(ry) - 4.5, w: 6, d: 9, r: 1 }, RAIL_Z[1], 6, 2), 'lo');
    }
    // The drive motor beside the start pulley: body with seam, ribbed can, coupling to the pulley block.
    const MOTOR: Plan = { x: -92, y: Y(38), w: 18, d: 18, r: 2 };
    solid(list, slab({ x: -74, y: Y(44), w: 4, d: 6, r: 1 }, 1, 4, 2), 'lo');
    solid(list, slab(MOTOR, 0, 13, 3, 0.5), 'mid', { inner: sideSeam(MOTOR, 9.6, P, 3) });
    solid(list, slab({ x: MOTOR.x + 3, y: MOTOR.y + 3, w: MOTOR.w - 6, d: MOTOR.d - 6, r: 1.5 }, 13, 3, 2, 0.4), 'lo');
    screwsOnTop(list, MOTOR, 13, 2.2);

    // ------------------------------------------------- the carriage (x = 0)
    const car: Part[] = [];
    const plate: Plan = { ...PLATE, y: Y(PLATE.y) };
    for (const ry of RAIL_Y) for (const bx of [-20, 8]) {
      solid(car, slab({ x: bx, y: Y(ry) - 5, w: 12, d: 10, r: 1.5 }, RAIL_Z[0] + 1.5, PLATE_Z[0] - RAIL_Z[0] - 1.5, 2, 0.4), 'mid');
    }
    solid(car, slab({ x: -6, y: Y(BELT_Y[0]) - 2, w: 12, d: BELT_Y[1] - BELT_Y[0] + 4, r: 1 }, 4, PLATE_Z[0] - 4, 2), 'lo');
    solid(car, slab(plate, PLATE_Z[0], PLATE_Z[1] - PLATE_Z[0], 3, 0.6), 'mid', { inner: sideSeam(plate, PLATE_Z[0] + 1.6, P, 3) });
    screwsOnTop(car, plate, PLATE_Z[1], 3, 0.5);
    // The timer wheel: its printed scale on the plate, the wheel, the pawl at its zero; the turning face is a slot.
    const W = { ...WHEEL, y: Y(WHEEL.y) };
    line(car, ring(W.x, W.y, WHEEL_SCALE_R, W.z, P, 48), 'lo');
    // Zero sits at the pawl, on the wheel's -x side (270 degrees in the kit's tick convention); the scale runs clockwise from it.
    const scale = radialTicks(W.x, W.y, WHEEL_SCALE_R + 2.4, 20, 5, W.z, [1.2, 2.4], P, 1.5 * Math.PI, TIMER_SWEEP_DEG * deg);
    line(car, scale.minor, 'lo');
    line(car, scale.major, 'mid');
    solid(car, cyl(W.x, W.y, W.r, W.z, W.h, 40, 0.4), 'hi', { inner: sideArc(W.x, W.y, W.r, W.z + 1.2, P, 20) });
    slot(car, `wheel-${index}`);
    solid(car, slab({ x: W.x - W.r - 2.6, y: W.y - 1.2, w: 2.4, d: 2.4, r: 0.6 }, W.z, W.h + 1.8, 2), 'mid');
    // The release lever from the pawl to the latch in front of the cocked slider.
    solid(car, slab({ x: 6.6, y: Y(SLIDER_Y + SLIDER_D), w: 2, d: W.y - 1.2 - Y(SLIDER_Y + SLIDER_D), r: 0.6 }, W.z, 1.6, 2), 'lo');
    // The cross-slide: guide, back stop, the spring on its rod, front stop; the slider is a slot.
    solid(car, slab({ x: -4.5, y: Y(PLATE.y + 2), w: 9, d: PLATE.d - 4, r: 1 }, PLATE_Z[1], 3, 2, 0.4), 'lo');
    solid(car, slab({ x: SPRING.x - 5.5, y: Y(BACK_STOP_Y) - 5, w: 11, d: 5, r: 1 }, PLATE_Z[1], 11, 2, 0.4), 'mid');
    // The spring's seat on the back stop: the coil starts on this ring.
    line(car, sideRing([SPRING.x, Y(BACK_STOP_Y), SPRING.z], SPRING.r, 'y', P, 28), 'lo');
    slot(car, `coil-back-${index}`);
    solid(car, slab({ x: SPRING.x - 1.2, y: Y(BACK_STOP_Y), w: 2.4, d: FRONT_STOP_Y - BACK_STOP_Y, r: 1.2 }, SPRING.z - 1.2, 2.4, 3), 'lo');
    slot(car, `coil-front-${index}`);
    solid(car, slab({ x: SPRING.x - 5.5, y: Y(FRONT_STOP_Y), w: 11, d: 5, r: 1 }, PLATE_Z[1], 11, 2, 0.4), 'mid');
    slot(car, `slider-${index}`);
    dots(car, [-20, -12, -4, 4, 12, 20].map((x) => at([x, plate.y + plate.d, PLATE_Z[0] + 2])), 0.4, 'mid');
    if (index === 0) {
      // The index blade: from the plate's front edge down over the gauge board, its hairline at the drone's x.
      const BRACKET: Plan = { x: -5, y: plate.y + plate.d - 1, w: 10, d: 4, r: 0.8 };
      solid(car, slab(BRACKET, RULER_TOP + 3.7, PLATE_Z[0] - RULER_TOP - 3.7, 2), 'mid');
      const BLADE: Plan = { x: -5, y: plate.y + plate.d - 1, w: 10, d: RULER.y + 7 - (plate.y + plate.d - 1), r: 1 };
      solid(car, slab(BLADE, RULER_TOP + 2.9, 0.8, 3, 0.3), 'mid');
      line(car, lineOnTop([0, BRACKET.y + BRACKET.d], [0, BLADE.y + BLADE.d], RULER_TOP + 3.7, P), 'hi');
    }

    // ------------------------------------------------ the cross-slide (cocked)
    const sl: Part[] = [];
    const SLIDER: Plan = { x: -6, y: Y(SLIDER_Y), w: 12, d: SLIDER_D, r: 1.5 };
    solid(sl, slab({ x: SPRING.x - 3.8, y: SLIDER.y, w: 9, d: 6, r: 1 }, PLATE_Z[1] + 2, 9, 2), 'mid');
    line(sl, sideRing([SPRING.x, SLIDER.y, SPRING.z], SPRING.r, 'y', P, 28), 'lo');
    solid(sl, slab(SLIDER, PLATE_Z[1], 12, 3, 0.5), 'mid', { inner: sideSeam(SLIDER, PLATE_Z[1] + 4, P, 3) });
    screwsOnTop(sl, SLIDER, PLATE_Z[1] + 12, 2);
    const MAST: Plane = [0, Y(MAST_Y)];
    solid(sl, cyl(MAST[0], MAST[1], 4.6, PLATE_Z[1] + 12, 3, 24), 'mid');
    solid(sl, cyl(MAST[0], MAST[1], 3, PLATE_Z[1] + 15, ARM_Z - PLATE_Z[1] - 15, 20), 'mid', { inner: sideArc(MAST[0], MAST[1], 3, 40, P, 16) });
    // The arm reaching back over the lane to the drone's clamp, with a gusset under it at the mast.
    const ARM: Plan = { x: -3.5, y: Y(-8), w: 7, d: MAST_Y + 6 + 8, r: 1 };
    solid(sl, slab({ x: -1.5, y: Y(MAST_Y - 11), w: 3, d: 8, r: 0.5 }, ARM_Z - 8, 8, 2), 'lo');
    solid(sl, slab(ARM, ARM_Z, 5, 2, 0.4), 'mid');
    dots(sl, [at([0, ARM.y + ARM.d - 2.6, ZD]), at([0, ARM.y + 2.6, ZD])], 0.45, 'mid');

    // ---- the drone, centred over the clamp
    const DY = Y(0);
    solid(sl, slab({ x: -6, y: DY - 6, w: 12, d: 12, r: 1.2 }, ZD, 9, 2), 'lo');
    const motors = byDepth([[-MOTOR_OFFSET, DY - MOTOR_OFFSET], [MOTOR_OFFSET, DY - MOTOR_OFFSET], [-MOTOR_OFFSET, DY + MOTOR_OFFSET], [MOTOR_OFFSET, DY + MOTOR_OFFSET]]);
    const bodyDepth = depthOf([0, DY, 0], P);
    const armAndMotor = (target: Part[], [mx, my]: Plane) => {
      solid(target, barBetween([Math.sign(mx) * 10, DY + Math.sign(my - DY) * 7], [mx, my], 6, ZD + 13, 4), 'mid');
      solid(target, cyl(mx, my, 6, ZD + 12, 10, 28), 'mid', { inner: sideArc(mx, my, 6, ZD + 16, P, 18) });
      solid(target, cyl(mx, my, 4.8, ZD + 22, 3, 24), 'hi', { inner: knurl(mx, my, 4.8, ZD + 22, ZD + 25, 16, P, 0.25) });
      solid(target, cyl(mx, my, 1.5, ZD + 25, 1.6, 12), 'lo');
    };
    for (const sy of [-11, 11]) {
      const skid: Plan = { x: -21, y: DY + sy - 1.3, w: 42, d: 2.6, r: 1.3 };
      solid(sl, slab(skid, ZD, 2.4, 2), 'mid');
      for (const lx of [-12, 12]) solid(sl, cyl(lx, skid.y + 1.3, 1.3, ZD + 2.4, 6.6, 12), 'mid');
    }
    for (const m of motors.filter(([x, y]) => depthOf([x, y, 0], P) < bodyDepth)) armAndMotor(sl, m);
    const BODY: Plan = { x: -20, y: DY - 14, w: 40, d: 28, r: 6 };
    solid(sl, slab(BODY, ZD + 9, 10, 6, 0.6), 'hi', { inner: sideSeam(BODY, ZD + 14, P, 6) });
    screwsOnTop(sl, BODY, ZD + 19, 4, 0.45);
    // The camera on the nose, looking down the corridor at the wall, and its lens.
    const CAMERA: Plan = { x: 17, y: DY - 5.5, w: 9, d: 11, r: 1.5 };
    solid(sl, slab(CAMERA, ZD + 11, 7, 2, 0.4), 'mid');
    solid(sl, slab({ x: 26, y: DY - 3.6, w: 3.6, d: 7.2, r: 2.4 }, ZD + 12, 4.8, 4), 'lo');
    const BATTERY: Plan = { x: -12, y: DY - 8, w: 22, d: 16, r: 2 };
    solid(sl, slab(BATTERY, ZD + 19, 6.4, 2, 0.5), 'mid');
    line(sl, lineOnTop([-2, DY - 8], [-2, DY + 8], ZD + 25.4, P), 'lo');
    line(sl, lineOnTop([2, DY - 8], [2, DY + 8], ZD + 25.4, P), 'lo');
    solid(sl, cyl(-16, DY + 8, 1.8, ZD + 19, 1.4, 14), 'lo');
    solid(sl, cyl(-16, DY + 8, 0.8, ZD + 20.4, 13, 8), 'mid');
    for (const m of motors.filter(([x, y]) => depthOf([x, y, 0], P) >= bodyDepth)) armAndMotor(sl, m);
    slot(sl, `props-${index}`);

    const props = motors.map(([mx, my]) => ({
      matrix: topMatrix([mx, my], ZD + 26.6, P),
      blade: 'M-15.4 -0.8C-10 -4.2 -3.4 -3.8 0 -2.1C3.4 -0.5 10 4.2 15.4 0.8C10 4.2 3.4 3.8 0 2.1C-3.4 0.5 -10 -4.2 -15.4 -0.8Z',
      hub: circlePath(2),
    }));

    // The wheel's turning face: twelve rim slots, a dog on the rim, a hub and a pointer (all in its top plane).
    const wheelSlots: string[] = [];
    for (let k = 0; k < 12; k++) {
      const a = ((k + 0.5) / 12) * Math.PI * 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const [r0, r1, w] = [W.r - 3.4, W.r - 1.2, 0.6];
      wheelSlots.push(pathOf([[r0 * c - w * s, r0 * s + w * c], [r1 * c - w * s, r1 * s + w * c], [r1 * c + w * s, r1 * s - w * c], [r0 * c + w * s, r0 * s - w * c]], true));
    }
    const laneRig: CorridorLane = {
      index,
      dy,
      carriage: car,
      slider: sl,
      wheelFace: {
        slots: wheelSlots.join(''),
        // The dog points at -x (the pawl) when the delay left is zero.
        dog: pathOf([[-(W.r - 1.8), -1.1], [-(W.r - 1.8), 1.1], [-(W.r + 1), 1.1], [-(W.r + 1), -1.1]], true),
        hub: circlePath(1.8),
        pointer: pathOf([[-1.8, 0], [-(W.r - 1.8), 0]]),
      },
      props,
      wheelMatrix: topMatrix([W.x, W.y], W.z + W.h, P),
      dialMatrix: sideMatrix([DIAL.x, Y(CONSOLE.y + CONSOLE.d) + DIAL.depth], DIAL.z, P, 'left'),
      delayKnobMatrix: topMatrix([KNOBS.delay[0], Y(KNOBS.delay[1])], CONSOLE_H + 5.4, P),
      agilityKnobMatrix: topMatrix([KNOBS.agility[0], Y(KNOBS.agility[1])], CONSOLE_H + 5.4, P),
      track: trackOf(index),
    };
    lanes[index] = laneRig;
    slot(list, `carriage-${index}`);
    // The console: plinth, case with lid seam and side vents, the speed dial on its front, knobs and a lamp on its lid.
    const C: Plan = { ...CONSOLE, y: Y(CONSOLE.y) };
    solid(list, slab(insetPlan(C, -2.4), 0, 2.4, 3), 'lo');
    const vents = [0, 1, 2, 3, 4].map((k) => slotX(C.y + 5 + k * 5, C.y + 8 + k * 5, 12, 36, C.x)).join('');
    solid(list, slab(C, 2.4, CONSOLE_H - 2.4, 3, 0.6), 'mid', { inner: sideSeam(C, CONSOLE_H - 6, P, 3) + vents });
    screwsOnTop(list, C, CONSOLE_H, 2.6);
    const face = C.y + C.d;
    solid(list, bossY(DIAL.x, DIAL.z, face, DIAL.depth, DIAL.r + 2), 'mid');
    slot(list, `dial-${index}`);
    for (const [name, where] of Object.entries(KNOBS) as Array<[keyof typeof KNOBS, Plane]>) {
      const [kx, ky] = [where[0], Y(where[1])];
      line(list, ring(kx, ky, KNOB_SCALE_R - 2.2, CONSOLE_H, P, 40), 'lo');
      const ticks = name === 'delay'
        ? radialTicks(kx, ky, KNOB_SCALE_R, 8, 4, CONSOLE_H, [1.5, 2.2], P, (-DELAY_SWEEP_DEG / 2) * deg, DELAY_SWEEP_DEG * deg)
        : radialTicks(kx, ky, KNOB_SCALE_R, 3, 1, CONSOLE_H, [2.2, 2.2], P, (-AGILITY_SWEEP_DEG / 2) * deg, AGILITY_SWEEP_DEG * deg);
      line(list, ticks.minor, 'lo');
      line(list, ticks.major, 'mid');
      solid(list, cyl(kx, ky, KNOB_R, CONSOLE_H, 5.4, 28), 'mid', { inner: knurl(kx, ky, KNOB_R, CONSOLE_H, CONSOLE_H + 5.4, 32, P, 0.25) });
      slot(list, `${name}-knob-${index}`);
    }
    solid(list, cyl(-59.5, Y(104.5), 2.8, CONSOLE_H, 1.6, 20), 'lo');
    solid(list, cyl(-59.5, Y(104.5), 1.9, CONSOLE_H + 1.6, 2.4, 16), 'hi');
    // The console's cable along the bed to the drive motor.
    list.push({
      kind: 'wire',
      from: at([CONSOLE.x, Y(CONSOLE.y + 8), 6]),
      via: [at([CONSOLE.x - 5, Y(CONSOLE.y + 8), 0]), at([CONSOLE.x - 5, Y(62), 0]), at([-83, Y(62), 0])],
      to: at([-83, Y(56), 4]),
      tone: 'lo',
    });

    PARTS.push(...list);
  }


  // ---------------------------------------------------- moving and rebuilt
  const coilAt = (laneIndex: number, share: number, turns: number = SPRING_TURNS[1]) => {
    const dy = laneShifts[laneIndex];
    return coil(BACK_STOP_Y + dy, SLIDER_Y + dy + share * THROW, [SPRING.x, SPRING.z], SPRING.r, turns, 'y', P, 16);
  };
  const ridersAt = (laneIndex: number, blindM: number, swerveM: number) => {
    const t = lanes[laneIndex].track;
    const b = Math.max(1, blindM * UNITS_PER_M);
    const s = Math.max(1, swerveM * UNITS_PER_M);
    return {
      blind: slabOf({ x: 0, y: t.y0, w: b - 0.5, d: t.y1 - t.y0, r: 1 }, RULER_TOP, 2.6, P, 2, 0.4),
      swerve: slabOf({ x: b + 0.5, y: t.y0, w: Math.max(0.5, s - 0.5), d: t.y1 - t.y0, r: 1 }, RULER_TOP, 2.6, P, 2, 0.4),
    };
  };
  const trackMatrix = (laneIndex: number, perMetre: number) =>
    `${topMatrix([0, lanes[laneIndex].track.y0], RULER_TOP, P)} scale(${Number((UNITS_PER_M / perMetre).toFixed(5))})`;
  const trackDepth = (laneIndex: number, perMetre: number) =>
    Number((((lanes[laneIndex].track.y1 - lanes[laneIndex].track.y0) * perMetre) / UNITS_PER_M).toFixed(3));

  // The dial's printed face: a rim, the scale arc and a tick every 10 km/h (long every 50).
  const arcR = DIAL.r - 2.6;
  const point = (angle: number, radius: number): Flat => [radius * Math.cos(angle), radius * Math.sin(angle)];
  const arc: Flat[] = [];
  for (let step = 0; step <= 72; step++) arc.push(point((NEEDLE_ZERO_DEG + (step / 72) * DIAL_SWEEP) * deg, arcR));
  const minor: string[] = [];
  const major: string[] = [];
  for (let k = 0; k <= DIAL_MAX_KMH / 10; k++) {
    const angle = (NEEDLE_ZERO_DEG + (k / (DIAL_MAX_KMH / 10)) * DIAL_SWEEP) * deg;
    (k % 5 === 0 ? major : minor).push(pathOf([point(angle, arcR), point(angle, arcR - (k % 5 === 0 ? 3.4 : 1.8))]));
  }

  return {
    WIDTH,
    HEIGHT,
    VIEW_BOX: `0 0 ${WIDTH} ${HEIGHT}`,
    P,
    PARTS,
    WALL_PARTS,
    BOARD_ENDS: [0, WALL_X].map((x) => lineOnTop([x, RULER.y], [x, RULER.y + RULER.d], RULER_TOP, P)).join(''),
    lanes,
    DIAL_FACE: {
      face: circlePath(DIAL.r),
      rim: circlePath(DIAL.r - 1),
      arc: pathOf(arc),
      minor: minor.join(''),
      major: major.join(''),
      zero: pathOf([point(NEEDLE_ZERO_DEG * deg, arcR), point(NEEDLE_ZERO_DEG * deg, arcR - 3.6)]),
    },
    NEEDLE: `M-2.6 0L${(arcR - 1.2).toFixed(1)} 0`,
    NEEDLE_HUB: circlePath(1.6),
    KNOB_POINTER: `M0 -1.1L0 ${-(KNOB_R - 0.9)}`,
    KNOB_HUB: circlePath(1.1),
    carriageShift: (x: number) => translateAlong(P, [x, 0, 0]),
    sliderShift: (share: number) => translateAlong(P, [0, share * THROW, 0]),
    coilAt,
    ridersAt,
    trackMatrix,
    trackDepth,
  };
}
