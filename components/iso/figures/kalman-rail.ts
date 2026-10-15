/**
 * The estimating rail for the KalmanPredictUpdate scene, drawn with the
 * isometric kit.
 *
 * The object is the explanation. A cart rides a two-rail track at the back
 * of a long bench. In front of it run three caliper lanes, one for each
 * belief about where the cart is: the cart's own guess, the sensor's
 * reading and the blend of the two. Each caliper is a self-centring pair of
 * jaws on a carriage: the carriage stands at the estimate and the jaws
 * stand one spread to either side, so a narrower gap is a surer estimate.
 *
 * - The guess caliper is towed by the cart. As the cart rolls, its odometer
 *   drum counts the distance (the predict step) and the jaws open, because
 *   a prediction is less sure than where the cart was.
 * - A rangefinder at the left end of the track looks along it at the cart
 *   and drives the reading caliper, through a cable, to what it measured,
 *   with jaws one sensor spread wide.
 * - The blend caliper starts as a copy of the guess and runs along a share
 *   rule laid from the guess to the reading, stopping at the gain's share
 *   of the way, with its jaws closed narrower than both.
 *
 * World units are about 1 px: x along the track, y toward the viewer, z
 * up. One filter unit of position is `U` world units along x. Every static
 * path is built once here; the cart and each caliper's carriage and jaws
 * are built at x = 0 and moved with `shiftX`; the live code rebuilds only
 * the gap between each pair of jaws (the band, its outline and the screw),
 * the wheel spokes and the odometer's digit marks.
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
  sideTicks,
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
import { discAlong, viewOf } from '../prism.ts';

export const WIDTH = 600;
export const AZIMUTH = 74;
export const ELEVATION = 40;

// ---------------------------------------------------------------- the scale
/** World units per filter unit of position, along x. */
export const U = 56;
/** Where a filter position sits on the track. */
export const xOf = (position: number) => position * U;
/** The narrowest a caliper closes: its jaws against its carriage. */
export const JAW_MIN = 8;
/** Where the reading and blend carriages park, closed, in filter units, before their beats: both at the left, so every run is rightward. */
export const PARK = { reading: -1.55, blend: -1.55 } as const;
/** How far right the lanes reach, in filter units: past the reading's right jaw (0.82 + 1.00). */
const REACH = 1.9;

// ------------------------------------------------------------------- layout
/** The caliper lanes run from just past one park to just past the other. */
const JAW = { slide: 5.4, slideH: 3.6, blade: 2.4, bladeH: 12, d: 15 };
export const LANE_X0 = Math.round(xOf(PARK.reading) - JAW_MIN - JAW.slide - 7);
export const LANE_X1 = Math.round(xOf(REACH) + JAW.slide + 7);
const RAIL_X0 = LANE_X0 - 2;
const RAIL_X1 = LANE_X1 - 6;
/** The rangefinder on its post at the left end of the track, looking along +x at the cart. */
const FINDER = { x: RAIL_X0 - 26, y: -64, post: 3, foot: 7.5, z: 16, head: 15, d: 16, w: 15 };

const BASE: Plan = { x: FINDER.x - 14, y: -90, w: LANE_X1 + 16 - (FINDER.x - 14), d: 146, r: 8 };
const BASE_H = 10;
const FOOT_H = 6;

const BED: Plan = { x: RAIL_X0 - 10, y: -84, w: RAIL_X1 - RAIL_X0 + 22, d: 40, r: 4 };
const BED_H = 3.5;
const RAIL_H = 4.5;
const RAIL_TOP = BED_H + RAIL_H;
/** The two rails' centre lines. */
const RAILS = [-76, -52] as const;

/** The cart, built at x = 0: wheels on both rails, body between them. */
const WHEEL_R = 6;
const WHEEL_T = 3.4;
const WHEEL_Z = RAIL_TOP + WHEEL_R;
const WHEEL_X = 14;
const BODY: Plan = { x: -22, y: -71, w: 44, d: 14, r: 3 };
const BODY_Z = 11;
const BODY_H = 15;
const BODY_TOP = BODY_Z + BODY_H;
/** The odometer drum on the deck: three digit wheels on one axle, along y. */
const DRUM = { x: -4, y0: -70, length: 12, z: BODY_TOP + 6.5, r: 4.4, wheels: 3 };
/** One turn of the units wheel per this many world units rolled. */
export const DRUM_UNITS_PER_TURN = 10;

/** The caliper lanes, back to front, and the share ledge in front of the blend lane. */
const LANE_D = 14;
const LANE_H = 5;
/** The seam low on each lane beam's sides; its long graduations reach down to it. */
const LANE_SEAM = 1.6;
export const LANES = { guess: -32, reading: -4, blend: 24 } as const;
export type LaneName = keyof typeof LANES;
const LEDGE: Plan = { x: LANE_X0, y: LANES.blend + LANE_D / 2 + 3, w: LANE_X1 - LANE_X0, d: 9, r: 1.2 };
const LEDGE_H = 2.5;

/** A caliper: the carriage at the estimate, a jaw on each side, a screw between them. */
const CARRIAGE = { half: 6, d: 12, h: 6 };
const SCREW = { z: LANE_H + 4.6, r: 1.1 };
/** The tow arm from the cart's front face to the guess carriage's post. */
const ARM = { z: BODY_Z + 9, h: 3.2, w: 6 };

export const BEAM_Z = BODY_Z + 9.5;
const LENS = { x0: FINDER.x + FINDER.w / 2, length: 7, r: 4.8 };

/** The reading caliper's drive at the left end of its lane. */
const DRIVE: Plan = { x: LANE_X0 - 17, y: LANES.reading - 8, w: 15, d: 16, r: 2 };
const DRIVE_H = 9;

// ---------------------------------------------------------------- the camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) extremes.push([px, py, -BASE_H - FOOT_H], [px, py, 0]);
extremes.push([FINDER.x - FINDER.w / 2, FINDER.y - FINDER.d / 2, FINDER.z + FINDER.head + 2], [BODY.x, BODY.y, DRUM.z + DRUM.r + 2], [BODY.x + BODY.w, BODY.y + BODY.d, DRUM.z + DRUM.r]);
const unitProjection = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitProjection));
const spanX = Math.max(...flatExtremes.map(([x]) => x)) - Math.min(...flatExtremes.map(([x]) => x));
const spanY = Math.max(...flatExtremes.map(([, y]) => y)) - Math.min(...flatExtremes.map(([, y]) => y));
/** The fit's margin, in viewBox units: every mark stays 4 px inside the stage at the narrowest stage. */
export const PAD_VB = 14;
export const HEIGHT = Math.ceil(((WIDTH - 2 * PAD_VB) * spanY) / spanX + 2 * PAD_VB);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: PAD_VB, azimuth: AZIMUTH, elevation: ELEVATION });
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;

const at = (point: Point3) => iso(point, P);
/** A seam drawn under a solid's outline: the kit's `inner` is line markup. */
const faint = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 26, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const VIEW = viewOf(P);

/** The screen offset that moves a part built at x = 0 to x = `dx` along the track. */
export const shiftX = (dx: number) => translateAlong(P, [dx, 0, 0]);

// ------------------------------------------------------------------- parts
export type Slot = 'beam' | 'cart' | 'guess' | 'reading' | 'share' | 'blend';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; slot: Slot };
export type DrawnPart = Exclude<Part, { kind: 'slot' }>;

/** A list builder, so each assembly collects its parts in painter's order. */
function partsList() {
  const list: DrawnPart[] = [];
  return {
    list,
    solid: (paths: SolidPaths, tone: Tone = 'mid', extra: Partial<Extract<Part, { kind: 'solid' }>> = {}) => list.push({ kind: 'solid', paths, tone, ...extra }),
    line: (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => list.push({ kind: 'line', d, tone, free }),
    dots: (points: Flat[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points, size, tone }),
    screw: (x: number, y: number, z: number, r = 1.7) => {
      list.push({ kind: 'line', d: ring(x, y, r, z, P, 14), tone: 'lo' });
      list.push({ kind: 'dots', points: [at([x, y, z])], size: 0.42, tone: 'mid' });
    },
  };
}

export const PARTS: Part[] = [];
const main = partsList();
const flush = () => {
  PARTS.push(...main.list);
  main.list.length = 0;
};
const slot = (name: Slot) => {
  flush();
  PARTS.push({ kind: 'slot', slot: name });
};

// ---------------------------------------------------------------- the base
{
  const feet: Plane[] = [
    [BASE.x + 18, BASE.y + 18], [BASE.x + BASE.w - 18, BASE.y + 18],
    [BASE.x + BASE.w / 2, BASE.y + 16], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 16],
    [BASE.x + 18, BASE.y + BASE.d - 18], [BASE.x + BASE.w - 18, BASE.y + BASE.d - 18],
  ];
  for (const [x, y] of byDepth(feet)) {
    main.solid(cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), 'lo');
    main.solid(cyl(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 26), 'mid');
  }
  main.solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: faint(sideSeam(BASE, -BASE_H + 3.4, P, 8)) });
  main.line(planOutline(insetPlan(BASE, 5), 0, P), 'faint');
  for (const [x, y] of [[BASE.x + 10, BASE.y + 10], [BASE.x + BASE.w - 10, BASE.y + 10], [BASE.x + 10, BASE.y + BASE.d - 10], [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10]] as Plane[]) main.screw(x, y, 0, 2.1);
  // The label plate at the front left; its rule lines stand for print.
  const label: Plan = { x: BASE.x + 16, y: 37, w: 22, d: 11, r: 2 };
  main.solid(slab(label, 0, 0.8, 3), 'lo');
  main.line(planOutline(insetPlan(label, 1.4), 0.8, P, 3), 'faint');
  for (const [k, share] of [[0, 0.78], [1, 0.52], [2, 0.66]] as const) {
    const y = label.y + 3.4 + k * 2.6;
    main.line(lineOnTop([label.x + 5, y], [label.x + 5 + (label.w - 12) * share, y], 0.8, P), 'lo', true);
  }
  main.dots([at([label.x + 2.6, label.y + label.d / 2, 0.8]), at([label.x + label.w - 2.6, label.y + label.d / 2, 0.8])], 0.42, 'mid');
}

// ------------------------------------------------- the rangefinder's cable
// It runs on the bench from the rangefinder's connector to the reading drive.
const CABLE = {
  from: [FINDER.x + 2, FINDER.y + FINDER.foot + 3.2, 1.4] as Point3,
  via: [[FINDER.x + 2, -28, 0.6], [FINDER.x + 10, LANES.reading, 0.6]] as Point3[],
  to: [DRIVE.x, LANES.reading, 3] as Point3,
};
main.list.push({ kind: 'wire', from: at(CABLE.from), to: at(CABLE.to), via: CABLE.via.map(at), tone: 'lo' });

// ------------------------------------------------------------- the rangefinder
{
  const { x, y } = FINDER;
  main.solid(cyl(x, y, FINDER.foot, 0, 2, 30, 0.4), 'lo');
  // The connector block on the foot's front, where the cable leaves.
  main.solid(slab({ x: x - 2.6, y: y + FINDER.foot - 1, w: 9.2, d: 5, r: 1 }, 0, 4.2, 3, 0.3), 'mid');
  main.solid(cyl(x, y, FINDER.post + 1.4, 2, 3, 22), 'mid', { inner: faint(sideArc(x, y, FINDER.post + 1.4, 3.6, P, 16)) });
  main.solid(cyl(x, y, FINDER.post, 5, FINDER.z - 5, 22), 'mid', { crease: 'none' });
  const head: Plan = { x: x - FINDER.w / 2, y: y - FINDER.d / 2, w: FINDER.w, d: FINDER.d, r: 2.2 };
  main.solid(slab(head, FINDER.z, FINDER.head, 4, 0.8), 'mid', { inner: faint(sideSeam(head, FINDER.z + 4.2, P, 4)) });
  main.line(planOutline(insetPlan(head, 2.4), FINDER.z + FINDER.head, P, 4), 'faint');
  for (const [sx, sy] of [[head.x + 3, head.y + 3], [head.x + head.w - 3, head.y + 3], [head.x + 3, head.y + head.d - 3], [head.x + head.w - 3, head.y + head.d - 3]] as Plane[]) {
    main.dots([at([sx, sy, FINDER.z + FINDER.head])], 0.42, 'mid');
  }
}
/** The lens barrel and its hood, which the measure beat lights. */
export const LENS_PARTS: DrawnPart[] = (() => {
  const lens = partsList();
  const z = BEAM_Z;
  lens.solid(discAlong([LENS.x0, FINDER.y, z], [1, 0, 0], LENS.r + 1.2, 1.6, P, 30), 'mid');
  lens.solid(discAlong([LENS.x0 + 1.6, FINDER.y, z], [1, 0, 0], LENS.r, LENS.length - 1.6, P, 30), 'hi');
  lens.solid(discAlong([LENS.x0 + LENS.length - 1.4, FINDER.y, z], [1, 0, 0], LENS.r + 0.6, 1.4, P, 30), 'mid');
  return lens.list;
})();
/** Where the beam leaves the lens. */
export const BEAM_FROM: Point3 = [LENS.x0 + LENS.length, FINDER.y, BEAM_Z];
/** The beam's start on screen: the emitter's spot on the lens glass. */
export const BEAM_START = at(BEAM_FROM);
/** The beam from the lens to the cart's back face at `cartX`, drawn before the cart so its end lies under it. */
export const beamPath = (cartX: number) => pathOf([at(BEAM_FROM), at([cartX + BODY.x + 2, FINDER.y, BEAM_Z])]);

// ------------------------------------------------------------------ the track
main.solid(slab(BED, 0, BED_H, 4, 0.6), 'lo', { inner: faint(sideSeam(BED, BED_H / 2, P, 4)) });
for (const y of RAILS) {
  const rail: Plan = { x: RAIL_X0, y: y - 2, w: RAIL_X1 - RAIL_X0, d: 4, r: 1 };
  main.solid(slab(rail, BED_H, RAIL_H, 2, 0.4), 'mid');
  for (const x of [RAIL_X0 - 6, RAIL_X1]) {
    const stop: Plan = { x, y: y - 4.5, w: 6, d: 9, r: 1.2 };
    main.solid(slab(stop, BED_H, RAIL_H + 5, 3, 0.4), 'mid');
    main.dots([at([x + 3, y - 2, RAIL_TOP + 5]), at([x + 3, y + 2, RAIL_TOP + 5])], 0.4, 'mid');
  }
  for (let x = RAIL_X0 + 14; x < RAIL_X1; x += 34) main.dots([at([x, y, RAIL_TOP])], 0.4, 'lo');
}
for (const part of LENS_PARTS) main.list.push(part);
slot('beam');
slot('cart');

// -------------------------------------------------------------------- the cart
/** Where a wheel's outer face sits, for its spokes: front wheels face the viewer. */
const WHEEL_FACE_Y = RAILS[1] + WHEEL_T / 2;
export const CART_PARTS: DrawnPart[] = (() => {
  const cart = partsList();
  // Back wheels, then the body, then the front wheels.
  for (const x of [-WHEEL_X, WHEEL_X]) {
    cart.solid(discAlong([x, RAILS[0] - WHEEL_T / 2 - 1.2, WHEEL_Z], [0, 1, 0], WHEEL_R + 1.2, 1.2, P, 30), 'lo');
    cart.solid(discAlong([x, RAILS[0] - WHEEL_T / 2, WHEEL_Z], [0, 1, 0], WHEEL_R, WHEEL_T, P, 30), 'mid');
  }
  for (const x of [-WHEEL_X, WHEEL_X]) cart.solid(discAlong([x, RAILS[0] + WHEEL_T / 2, WHEEL_Z], [0, 1, 0], 1.6, RAILS[1] - RAILS[0] - WHEEL_T, P, 16), 'lo');
  cart.solid(slab(BODY, BODY_Z, BODY_H, 4, 0.8), 'hi', { inner: faint(sideSeam(BODY, BODY_Z + 4.4, P, 4)) });
  cart.line(planOutline(insetPlan(BODY, 2.2), BODY_TOP, P, 4), 'faint');
  for (const [sx, sy] of [[BODY.x + 3.2, BODY.y + 3.2], [BODY.x + BODY.w - 3.2, BODY.y + 3.2], [BODY.x + 3.2, BODY.y + BODY.d - 3.2], [BODY.x + BODY.w - 3.2, BODY.y + BODY.d - 3.2]] as Plane[]) {
    cart.dots([at([sx, sy, BODY_TOP])], 0.42, 'mid');
  }
  // The odometer's cradle on the deck: a plate and the far cheek; the near cheek stands in front of the drum.
  cart.solid(slab({ x: DRUM.x - 5.5, y: DRUM.y0 - 3, w: 11, d: DRUM.length + 6, r: 1 }, BODY_TOP, 1.4, 2, 0.3), 'lo');
  cart.solid(slab(CHEEK(DRUM.y0 - 2.2), BODY_TOP + 1.4, DRUM.z - BODY_TOP + 0.6, 2, 0.3), 'mid');
  return cart.list;
})();
/** A cheek of the odometer's cradle, at y. */
function CHEEK(y: number): Plan {
  return { x: DRUM.x - 4, y, w: 8, d: 2.2, r: 0.6 };
}
/** The near cheek and the axle's end through it, drawn after the drum. */
export const DRUM_NEAR: DrawnPart[] = (() => {
  const near = partsList();
  near.solid(slab(CHEEK(DRUM.y0 + DRUM.length), BODY_TOP + 1.4, DRUM.z - BODY_TOP + 0.6, 2, 0.3), 'mid');
  near.solid(discAlong([DRUM.x, DRUM.y0 + DRUM.length + 2.2, DRUM.z], [0, 1, 0], 1.6, 1, P, 16), 'mid');
  return near.list;
})();
/** The odometer drum and its end caps, drawn after the cradle; the scene lights it while it predicts. */
export const DRUM_PATHS = discAlong([DRUM.x, DRUM.y0, DRUM.z], [0, 1, 0], DRUM.r, DRUM.length, P, 36);
/** The digit wheels' joins, drawn on the drum: each wheel's marks run from join to join. */
export const DRUM_JOINS = (() => {
  const joins: string[] = [];
  for (let k = 1; k < DRUM.wheels; k++) joins.push(visibleArcY(DRUM.x, DRUM.y0 + (k * DRUM.length) / DRUM.wheels, DRUM.z, DRUM.r));
  return joins.join('');
})();
/** The front wheels, with their hub rings; the spokes turn with `wheelSpokes`. */
export const FRONT_WHEELS: DrawnPart[] = (() => {
  const wheels = partsList();
  for (const x of [-WHEEL_X, WHEEL_X]) {
    wheels.solid(discAlong([x, RAILS[1] - WHEEL_T / 2, WHEEL_Z], [0, 1, 0], WHEEL_R, WHEEL_T, P, 30), 'mid');
    wheels.solid(discAlong([x, RAILS[1] + WHEEL_T / 2, WHEEL_Z], [0, 1, 0], WHEEL_R - 1.6, 0.8, P, 24), 'lo');
    wheels.line(circleY(x, WHEEL_FACE_Y + 0.8, WHEEL_Z, 1.8), 'lo');
  }
  return wheels.list;
})();
/** A circle in the plane y = `y` (a wheel face), as a closed path. */
function circleY(cx: number, y: number, cz: number, r: number, steps = 28) {
  const points: Flat[] = [];
  for (let k = 0; k < steps; k++) {
    const angle = (k / steps) * Math.PI * 2;
    points.push(at([cx + r * Math.cos(angle), y, cz + r * Math.sin(angle)]));
  }
  return pathOf(points, true);
}

/** The half of a ring round a y-axis drum that faces the viewer. */
function visibleArcY(cx: number, y: number, cz: number, r: number, steps = 24) {
  const facing = Math.atan2(VIEW[2], VIEW[0]);
  const points: Flat[] = [];
  for (let k = 0; k <= steps; k++) {
    const angle = facing - Math.PI / 2 + (k / steps) * Math.PI;
    points.push(at([cx + r * Math.cos(angle), y, cz + r * Math.sin(angle)]));
  }
  return pathOf(points);
}

/** Three spokes on each front wheel's face, turned by `angle` (radians, rolling toward +x). */
export function wheelSpokes(angle: number) {
  const d: string[] = [];
  for (const x of [-WHEEL_X, WHEEL_X]) {
    for (let k = 0; k < 3; k++) {
      const a = -angle + (k * Math.PI * 2) / 3;
      const inner = 1.8;
      const outer = WHEEL_R - 1.6;
      d.push(pathOf([
        at([x + inner * Math.cos(a), WHEEL_FACE_Y + 0.8, WHEEL_Z + inner * Math.sin(a)]),
        at([x + outer * Math.cos(a), WHEEL_FACE_Y + 0.8, WHEEL_Z + outer * Math.sin(a)]),
      ]));
    }
  }
  return d.join('');
}

/**
 * The odometer's digit marks for `rolled` world units: ten marks round each
 * wheel, the units wheel turning once per DRUM_UNITS_PER_TURN and each wheel
 * after it ten times slower. Only marks well on the visible side are drawn,
 * each running from one join to the next.
 */
export function drumMarks(rolled: number) {
  const d: string[] = [];
  const facing = Math.atan2(VIEW[2], VIEW[0]);
  const width = DRUM.length / DRUM.wheels;
  for (let wheel = 0; wheel < DRUM.wheels; wheel++) {
    const turn = rolled / DRUM_UNITS_PER_TURN / 10 ** (DRUM.wheels - 1 - wheel);
    const y0 = DRUM.y0 + wheel * width + (wheel === 0 ? 0.6 : 0);
    const y1 = DRUM.y0 + (wheel + 1) * width - (wheel === DRUM.wheels - 1 ? 0.6 : 0);
    for (let k = 0; k < 10; k++) {
      const angle = facing + Math.PI * 2 * (k / 10 - turn) + 0.31;
      const off = Math.cos(angle - facing);
      if (off < 0.42) continue;
      const point = (y: number): Point3 => [DRUM.x + DRUM.r * Math.cos(angle), y, DRUM.z + DRUM.r * Math.sin(angle)];
      d.push(pathOf([at(point(y0)), at(point(y1))]));
    }
  }
  return d.join('');
}

/** How far the wheels turn, in radians, for `rolled` world units. */
export const wheelTurn = (rolled: number) => rolled / WHEEL_R;

// ----------------------------------------------------------------- the lanes
const laneFront = (lane: LaneName) => LANES[lane] + LANE_D / 2;
const lanePlan = (lane: LaneName): Plan => ({ x: LANE_X0, y: LANES[lane] - LANE_D / 2, w: LANE_X1 - LANE_X0, d: LANE_D, r: 1.6 });

function laneTrack(lane: LaneName) {
  const plan = lanePlan(lane);
  main.solid(slab(plan, 0, LANE_H, 3, 0.6), 'mid', { inner: faint(sideSeam(plan, LANE_SEAM, P, 3)) });
  // The slot the carriages ride in: a closed slot, end to end between the end blocks.
  main.line(planOutline({ x: LANE_X0 + 6, y: LANES[lane] - 1.3, w: LANE_X1 - LANE_X0 - 12, d: 2.6, r: 1.3 }, LANE_H, P, 3), 'faint');
  // The beam's graduations hang from its top front edge: a mark every quarter unit, a long one every unit.
  const ticks = sideTicks(xOf(-1.5), xOf(1.75), U / 4, 4, laneFront(lane), LANE_H, [1.5, LANE_H - LANE_SEAM], P);
  main.line(ticks.minor, 'lo');
  main.line(ticks.major, 'mid');
}

function laneEnd(lane: LaneName, x: number) {
  const block: Plan = { x, y: LANES[lane] - LANE_D / 2 - 0.8, w: 4.4, d: LANE_D + 1.6, r: 1 };
  main.solid(slab(block, 0, LANE_H + 4, 2, 0.3), 'mid');
  main.dots([at([x + 2.2, LANES[lane] - 3.6, LANE_H + 4]), at([x + 2.2, LANES[lane] + 3.6, LANE_H + 4])], 0.4, 'mid');
}

/** The left jaw, built with its inner face at x = 0; the right jaw mirrors it. */
function jawParts(lane: LaneName, side: -1 | 1): DrawnPart[] {
  const jaw = partsList();
  const y = LANES[lane] - JAW.d / 2;
  const slideX = side < 0 ? -JAW.slide : 0;
  const bladeX = side < 0 ? -JAW.blade : 0;
  jaw.solid(slab({ x: slideX, y, w: JAW.slide, d: JAW.d, r: 0.8 }, LANE_H, JAW.slideH, 2, 0.3), 'mid');
  jaw.solid(slab({ x: bladeX, y: y + 0.6, w: JAW.blade, d: JAW.d - 1.2, r: 0.4 }, LANE_H + JAW.slideH, JAW.bladeH, 2, 0.3), 'hi');
  jaw.dots([at([slideX + JAW.slide / 2 + (side < 0 ? -0.6 : 0.6), LANES[lane] + JAW.d / 2 - 2.2, LANE_H + JAW.slideH])], 0.4, 'mid');
  return jaw.list;
}

/** The carriage at the estimate, built at x = 0, with its knob; the guess's also carries the tow post and arm. */
function carriageParts(lane: LaneName): DrawnPart[] {
  const carriage = partsList();
  const y = LANES[lane];
  const plan: Plan = { x: -CARRIAGE.half, y: y - CARRIAGE.d / 2, w: CARRIAGE.half * 2, d: CARRIAGE.d, r: 1.4 };
  carriage.solid(slab(plan, LANE_H, CARRIAGE.h, 3, 0.4), 'hi', { inner: faint(sideSeam(plan, LANE_H + 2.2, P, 3)) });
  const top = LANE_H + CARRIAGE.h;
  // The index: a fine line across the carriage's top, exactly at the estimate.
  carriage.line(lineOnTop([0, plan.y + 0.8], [0, plan.y + plan.d - 0.8], top, P), 'hi');
  if (lane === 'guess') {
    // The tow post rises from the carriage to the arm the cart pushes.
    carriage.solid(cyl(0, y - 2.8, 2.2, top, 1.2, 18), 'mid');
    carriage.solid(cyl(0, y - 2.8, 1.5, top + 1.2, ARM.z - top - 1.2, 16), 'mid', { crease: 'none' });
    const arm: Plan = { x: -ARM.w / 2, y: BODY.y + BODY.d, w: ARM.w, d: y - 2.8 + 3 - (BODY.y + BODY.d), r: 1.6 };
    carriage.solid(slab(arm, ARM.z, ARM.h, 3, 0.3), 'mid', { inner: faint(sideSeam(arm, ARM.z + ARM.h / 2, P, 3)) });
    carriage.screw(0, y - 2.8, ARM.z + ARM.h, 1.3);
  } else {
    // The knob that sets the jaws.
    carriage.solid(cyl(0, y - 1.6, 2.6, top, 3.2, 22, 0.3), 'mid');
    carriage.line(knurl(0, y - 1.6, 2.6, top, top + 3.2, 22, P), 'lo');
  }
  if (lane === 'blend') {
    // The pointer reaches over the ledge to the share rule.
    const pointer: Plan = { x: -1.1, y: y + CARRIAGE.d / 2 - 0.4, w: 2.2, d: POINT_Y - (y + CARRIAGE.d / 2 - 0.4) + 1.2, r: 0.6 };
    carriage.solid(slab(pointer, POINTER_Z, 1, 2, 0.2), 'mid');
  }
  return carriage.list;
}

/** The share rule lies on the ledge; the blend's pointer tip rests on it here. */
export const SHARE = { y: LEDGE.y + 2.8, d: 3, z: LEDGE_H, h: 1 };
export const POINT_Y = SHARE.y + SHARE.d / 2;
const POINTER_Z = SHARE.z + SHARE.h + 0.2;

export const JAWS = {
  guess: { left: jawParts('guess', -1), right: jawParts('guess', 1) },
  reading: { left: jawParts('reading', -1), right: jawParts('reading', 1) },
  blend: { left: jawParts('blend', -1), right: jawParts('blend', 1) },
} as const;
export const CARRIAGES = {
  guess: carriageParts('guess'),
  reading: carriageParts('reading'),
  blend: carriageParts('blend'),
} as const;

/** The gap between the jaws on the lane's top: x from `centre - half` to `centre + half`. */
export function bandPath(lane: LaneName, centre: number, half: number) {
  const y0 = LANES[lane] - LANE_D / 2 + 1.4;
  const y1 = LANES[lane] + LANE_D / 2 - 1.4;
  return pathOf([at([centre - half, y0, LANE_H]), at([centre + half, y0, LANE_H]), at([centre + half, y1, LANE_H]), at([centre - half, y1, LANE_H])], true);
}

/** The screw between the jaws, rebuilt as they open or close; its ends lie on the jaws' inner faces. */
export const screwPaths = (lane: LaneName, centre: number, half: number) =>
  discAlong([centre - half, LANES[lane] + 0.8, SCREW.z], [1, 0, 0], SCREW.r, Math.max(0.2, half * 2), P, 14);

/** The share rule from the guess's x to the reading's x, its two stops, and its top face for the mark. */
export function shareParts(fromX: number, toX: number) {
  const plan: Plan = { x: fromX, y: SHARE.y, w: toX - fromX, d: SHARE.d, r: 0.8 };
  const share = partsList();
  for (const x of [fromX, toX]) {
    share.solid(cyl(x, SHARE.y + SHARE.d / 2, 1.9, SHARE.z, SHARE.h + 2.6, 16, 0.2), 'mid');
  }
  return {
    bar: slab(plan, SHARE.z, SHARE.h, 2, 0.2),
    top: pathOf([at([fromX, SHARE.y, SHARE.z + SHARE.h]), at([toX, SHARE.y, SHARE.z + SHARE.h]), at([toX, SHARE.y + SHARE.d, SHARE.z + SHARE.h]), at([fromX, SHARE.y + SHARE.d, SHARE.z + SHARE.h])], true),
    stops: share.list,
  };
}

/** Where the blend pointer's tip rests on the share rule, at x. */
export const pointAt = (x: number): Flat => at([x, POINT_Y, SHARE.z + SHARE.h]);

// -------------------------------------------- lanes in painter's order, back to front
laneTrack('guess');
laneEnd('guess', LANE_X0 - 4.4);
laneEnd('guess', LANE_X1);
slot('guess');

// The reading drive: a block at the lane's left end with its motor and the cable's landing.
main.solid(slab(DRIVE, 0, DRIVE_H, 3, 0.5), 'mid', { inner: faint(sideSeam(DRIVE, 3.2, P, 3)) });
main.solid(cyl(DRIVE.x + DRIVE.w / 2, LANES.reading, 5, DRIVE_H, 7, 26, 0.4), 'mid', { inner: faint(sideArc(DRIVE.x + DRIVE.w / 2, LANES.reading, 5, DRIVE_H + 2.2, P, 18)) });
main.solid(cyl(DRIVE.x + DRIVE.w / 2, LANES.reading, 3.2, DRIVE_H + 7, 2.4, 22, 0.3), 'lo');
main.line(knurl(DRIVE.x + DRIVE.w / 2, LANES.reading, 3.2, DRIVE_H + 7, DRIVE_H + 9.4, 22, P), 'lo');
laneTrack('reading');
laneEnd('reading', LANE_X1);
slot('reading');

laneTrack('blend');
laneEnd('blend', LANE_X0 - 4.4);
laneEnd('blend', LANE_X1);
main.solid(slab(LEDGE, 0, LEDGE_H, 3, 0.3), 'lo');
main.line(planOutline(insetPlan(LEDGE, 1.2), LEDGE_H, P, 3), 'faint');
slot('share');
slot('blend');

flush();

/** Every lane's centre y and its front edge, for tests. */
export const LANE_GEOMETRY = { front: laneFront, plan: lanePlan, height: LANE_H, jawInner: 0 } as const;
