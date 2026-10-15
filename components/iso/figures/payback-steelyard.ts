/**
 * The payback steelyard for DeploymentEconomics, drawn with the isometric
 * kit.
 *
 * The object is the explanation. A steelyard hangs from a gallows on a base.
 * Its short arm carries the cell's cost: slotted weights on a hanger, the
 * robot's discs and below them the integration's, so the cell's price as a
 * multiple of the robot's shows as extra discs. A poise standing for one
 * month of the cell's labour value rides the long arm, which is graduated in
 * months. The beam balances where cost times the short arm equals a month of
 * value times the poise's distance, so the poise comes to rest at the payback
 * in months. A collar marks the buyer's 24-month horizon and the arm ends at
 * 36 months on a stop; past that the poise sits on the stop and the beam
 * tips up against its rest. On the base's front face an hour plate shows
 * where each working hour goes: picking, a person fixing jams, and upkeep.
 *
 * Every number comes from lib/deployment-economics.ts (unchanged):
 * computeEconomics, the 24-month horizon and the time breakdown.
 *
 * World units: millimetres. x runs along the beam (the short arm to the
 * left), y across toward the viewer, z up.
 */
import {
  cameraOf,
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  planOutline,
  ring as kitRing,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { barBetween, discAlong } from '../prism.ts';

// ------------------------------------------------------------------ the scale
/** World units along the long arm per month of payback; the short arm is one month long. */
export const MONTH = 4.8;
/** The short arm: the load hook hangs one month's length from the knife edge, so the poise weighs one month of value. */
export const SHORT_ARM = MONTH;
/** The long arm's scale ends at 36 months, on the end stop. */
export const SCALE_MONTHS = 36;
/** The buyer's horizon collar. */
export const HORIZON_MONTHS = 24;
/** One slotted disc stands for this much cell cost; heavy discs for five times as much. */
export const DISC_USD = 20_000;
/** The furthest the beam tips onto its rests, in degrees (long end up). */
export const TIP_DEGREES = 4;

// --------------------------------------------------------------- the machine (mm)
const BEAM_Z = 76;
const BEAM = { x0: -14, x1: SCALE_MONTHS * MONTH + 9, half: 2, height: 6 };
const BASE: Plan = { x: -66, y: -24, w: 278, d: 48, r: 6 };
const BASE_Z = [0, 12] as const;
const POST = { x: -44, y: 0 };
const JIB_Z = 108;
const HANGER = { foot: 12.5, rod: 1.1 };
const DISC = { r: 8.8 };
const REST_X = BEAM.x1 + 7;
/** The hour plate on the base's front face: sixty minutes long. */
export const HOUR_PLATE = { x0: 18, length: 150, top: BASE_Z[1] - 2.2, height: 6.2 };
const LABEL: Plan = { x: 146, y: -18, w: 40, d: 9, r: 1 };

// ---------------------------------------------------------------- the fit
const AZIMUTH = 74;
const ELEVATION = 26;
const extremes: Point3[] = [
  [BASE.x, BASE.y, -6],
  [BASE.x + BASE.w, BASE.y, -6],
  [BASE.x, BASE.y + BASE.d, -6],
  [BASE.x + BASE.w, BASE.y + BASE.d, -6],
  [POST.x - 6, POST.y, JIB_Z + 8],
  [6, 0, JIB_Z + 8],
  [REST_X, 0, BEAM_Z + 14],
];
export const WIDTH = 600;
const SIDE = Math.round(WIDTH * 0.07);
const PAD = 8;
const unit = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const spanOf = (axis: 0 | 1) => {
  const values = extremes.map((point) => iso(point, unit)[axis]);
  return Math.max(...values) - Math.min(...values);
};
export const HEIGHT = Math.ceil(((WIDTH - 2 * SIDE) * spanOf(1)) / spanOf(0) + 2 * PAD);
export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
const fitted = fitProjection(extremes, WIDTH - 2 * SIDE, HEIGHT - 2 * PAD, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
export const P: Projection = { ...fitted, origin: [fitted.origin[0] + SIDE, fitted.origin[1] + PAD] };

// ----------------------------------------------------------------- the parts
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'slot'; slot: Slot };

/** Where the live pieces go in the painter's order: the hour plate's bands, the load, the beam with its poise. */
export type Slot = 'hour' | 'load' | 'beam';

const at = (point: Point3) => iso(point, P);
const deg = Math.PI / 180;

const solid = (list: Part[], paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string } = {}) =>
  list.push({ kind: 'solid', paths, tone, ...extra });
const line = (list: Part[], d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (list: Part[], points: Point3[], size = 0.5, tone: Tone = 'mid') =>
  list.push({ kind: 'dots', points: points.map(at), size, tone });
const seamOf = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
function screw(list: Part[], x: number, y: number, z: number, r = 1.3) {
  line(list, kitRing(x, y, r, z, P, 16), 'lo');
  dots(list, [[x, y, z]], 0.45, 'mid');
}

const PARTS_LIST: Part[] = [];

// --------------------------------------------------------------- the base
{
  const list = PARTS_LIST;
  for (const [x, y] of [
    [BASE.x + 14, BASE.y + 12],
    [BASE.x + BASE.w - 14, BASE.y + 12],
    [BASE.x + 14, BASE.y + BASE.d - 12],
    [BASE.x + BASE.w - 14, BASE.y + BASE.d - 12],
  ] as Plane[]) {
    solid(list, cylinder(x, y, 7, -6, 1.6, P, 28), 'lo');
    solid(list, cylinder(x, y, 5.2, -4.4, 4.4, P, 28), 'mid');
  }
  solid(list, slabOf(BASE, BASE_Z[0], BASE_Z[1] - BASE_Z[0], P, 8, 1.4), 'mid');
  line(list, planOutline(insetPlan(BASE, 5), BASE_Z[1], P), 'faint');
  for (const [x, y] of [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ] as Plane[]) screw(list, x, y, BASE_Z[1]);
  // The label plate: three rule lines for its text, two screws.
  solid(list, slabOf(LABEL, BASE_Z[1], 0.8, P, 4), 'lo');
  line(list, planOutline(insetPlan(LABEL, 1.4), BASE_Z[1] + 0.8, P), 'faint');
  for (const [dy, length] of [[2.9, 22], [4.5, 17], [6.1, 20]] as const) {
    line(list, lineOnTop([LABEL.x + 7, LABEL.y + dy], [LABEL.x + 7 + length, LABEL.y + dy], BASE_Z[1] + 0.8, P), 'lo', true);
  }
  for (const x of [LABEL.x + 3.4, LABEL.x + LABEL.w - 3.4]) dots(list, [[x, LABEL.y + LABEL.d / 2, BASE_Z[1] + 0.8]], 0.45, 'mid');
  list.push({ kind: 'slot', slot: 'hour' });
}

// --------------------------------------------------------------- the gallows
{
  const list = PARTS_LIST;
  const top = BASE_Z[1];
  // The post on its bolted flange, capped, with a brace under the jib.
  solid(list, cylinder(POST.x, POST.y, 8, top, 2, P, 32, 0.5), 'lo');
  for (const angle of [45, 135, 225, 315]) {
    const a = angle * deg;
    dots(list, [[POST.x + 6.2 * Math.cos(a), POST.y + 6.2 * Math.sin(a), top + 2]], 0.42, 'mid');
  }
  const post = { x: POST.x - 3.2, y: POST.y - 3.2, w: 6.4, d: 6.4, r: 0.8 };
  solid(list, slabOf(post, top + 2, JIB_Z - 3 - top - 2, P, 3, 0.4), 'mid', { inner: seamOf(sideSeam(post, top + 18, P, 3)) });
  // The jib out over the knife edge, and its end cap.
  solid(list, barBetween([POST.x - 3.2, 0, JIB_Z], [7, 0, JIB_Z], [0, 1, 0], 6.4, 6, P, 0.4), 'mid');
  solid(list, barBetween([7, 0, JIB_Z], [8.4, 0, JIB_Z], [0, 1, 0], 7.4, 7, P, 0.3), 'mid');
  // The brace, with a gusset plate and two screws at each end.
  solid(list, barBetween([POST.x + 3.2, -1.2, JIB_Z - 26], [POST.x + 27, -1.2, JIB_Z - 3], [0, 1, 0], 3.6, 2.4, P), 'mid');
  for (const [x, z] of [[POST.x + 4.6, JIB_Z - 23.6], [POST.x + 24.4, JIB_Z - 4.4]]) {
    solid(list, slabOf({ x: x - 2.4, y: 1.2, w: 4.8, d: 0.8, r: 0.3 }, z - 2.4, 4.8, P, 2), 'lo');
    dots(list, [[x - 1.2, 2.0, z + 1.2], [x + 1.2, 2.0, z - 1.2]], 0.36, 'mid');
  }
  // The eye bolt under the jib, and the shackle's two cheeks down to the knife edge, joined by a pin.
  solid(list, cylinder(0, 0, 2.4, JIB_Z - 4.4, 1.4, P, 20), 'mid');
  solid(list, barBetween([0, -3.4, JIB_Z - 6], [0, -3.4, BEAM_Z + 4.6], [1, 0, 0], 2.2, 1.0, P), 'mid');
  solid(list, discAlong([0, -3.9, JIB_Z - 7.2], [0, 1, 0], 1.1, 7.8, P, 16), 'mid');
}

// --------------------------------------------------------------- the stop for the beam's long end
{
  const list = PARTS_LIST;
  const top = BASE_Z[1];
  solid(list, slabOf({ x: REST_X - 5, y: -5, w: 10, d: 10, r: 1.2 }, top, 2, P, 3, 0.4), 'lo');
  for (const [dx, dy] of [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]]) dots(list, [[REST_X + dx, dy, top + 2]], 0.4, 'mid');
  const fork = { x: REST_X - 2, y: -2, w: 4, d: 4, r: 0.6 };
  solid(list, slabOf(fork, top + 2, BEAM_Z - 10 - top - 2, P, 3, 0.3), 'mid');
  // The fork: a back cheek, the two pads (below and above the beam end) and, after the beam, the front cheek.
  solid(list, slabOf({ x: REST_X - 2.4, y: -4.6, w: 4.8, d: 1.6, r: 0.3 }, BEAM_Z - 10, 26, P, 2), 'mid');
  solid(list, slabOf({ x: REST_X - 2.4, y: -3, w: 4.8, d: 6, r: 0.3 }, BEAM_Z - 10, 1.8, P, 2), 'lo');
}

PARTS_LIST.push({ kind: 'slot', slot: 'load' });
PARTS_LIST.push({ kind: 'slot', slot: 'beam' });

{
  const list = PARTS_LIST;
  // The shackle's front cheek, in front of the beam.
  solid(list, barBetween([0, 3.4, JIB_Z - 6], [0, 3.4, BEAM_Z + 4.6], [1, 0, 0], 2.2, 1.0, P), 'mid');
  // The rest's top pad and front cheek, in front of the beam's end.
  solid(list, slabOf({ x: REST_X - 2.4, y: -3, w: 4.8, d: 6, r: 0.3 }, BEAM_Z + 14, 1.8, P, 2), 'lo');
  solid(list, slabOf({ x: REST_X - 2.4, y: 3, w: 4.8, d: 1.6, r: 0.3 }, BEAM_Z - 10, 26, P, 2), 'mid');
  dots(list, [[REST_X, 3.8, BEAM_Z + 13.2]], 0.42, 'mid');
}

export const PARTS: readonly Part[] = PARTS_LIST;

// --------------------------------------------------------------- the beam and the poise, at an angle
/** A point on the beam at distance s from the knife edge, tipped by `tilt` degrees (long end up). */
export function onBeam(s: number, tilt: number, dy = 0, dz = 0): Point3 {
  const a = tilt * deg;
  return [s * Math.cos(a) - dz * Math.sin(a), dy, BEAM_Z + s * Math.sin(a) + dz * Math.cos(a)];
}

const tenth = (value: number) => Math.round(value * 10) / 10;

/**
 * The beam, its month scale and horizon collar, the knife edge and the
 * poise, rebuilt for a tilt and a poise position (in months from the knife
 * edge): solids in painter's order (the poise's weight first, as it hangs
 * below the beam), then the beam's front-face scale, the rider's index and
 * the weight's seam.
 */
export function beamParts(tilt: number, poiseMonths: number) {
  const solids: Array<{ paths: SolidPaths; tone: Tone; lit?: boolean }> = [];
  const add = (paths: SolidPaths, tone: Tone, lit = false) => solids.push({ paths, tone, lit });
  const up: Point3 = [-Math.sin(tilt * deg), 0, Math.cos(tilt * deg)];
  const along = (s: number, dy = 0, dz = 0) => onBeam(s, tilt, dy, dz);
  const rider = Math.max(0, Math.min(SCALE_MONTHS, poiseMonths)) * MONTH;
  // The poise's weight hangs below the beam on a link, so it is drawn first.
  const link0 = along(rider, 0, -BEAM.height / 2);
  const bob: Point3 = [link0[0], 0, link0[2] - 8];
  add(barBetween(link0, [bob[0], 0, bob[2] + 4.4], [1, 0, 0], 1.3, 1.3, P), 'hi', true);
  add(cylinder(bob[0], 0, 5.6, bob[2] - 8.6, 9, P, 36, 0.5), 'hi', true);
  add(cylinder(bob[0], 0, 3, bob[2] + 0.4, 2.2, P, 24), 'hi', true);
  // The beam itself.
  add(barBetween(along(BEAM.x0), along(BEAM.x1), [0, 1, 0], BEAM.half * 2, BEAM.height, P, 0.4), 'mid');
  // The knife edge's stirrup and pin at the fulcrum, and the load hook's eye pin on the short arm.
  add(barBetween(along(-1.6, -2.6, -3.2), along(1.6, -2.6, -3.2), up, 7.2, 1.0, P), 'mid');
  add(discAlong(along(0, -3.0, 1.2), [0, 1, 0], 1.1, 6.0, P, 16), 'mid');
  add(discAlong(along(-SHORT_ARM, -2.6, -1.2), [0, 1, 0], 1.0, 5.2, P, 16), 'mid');
  // The tongue on top at the fulcrum: level when it stands straight up between the shackle's cheeks.
  add(barBetween(along(0, 0, BEAM.height / 2), along(0, 0, BEAM.height / 2 + 5.2), [1, 0, 0], 0.9, 0.8, P), 'hi');
  // The horizon collar at 24 months.
  const collar = HORIZON_MONTHS * MONTH;
  add(barBetween(along(collar - 0.8), along(collar + 0.8), [0, 1, 0], BEAM.half * 2 + 1.2, BEAM.height + 1.2, P, 0.3), 'hi');
  // The rider: a saddle over the beam with its thumb screw.
  add(barBetween(along(rider - 2.6), along(rider + 2.6), [0, 1, 0], BEAM.half * 2 + 1.6, BEAM.height + 1.6, P, 0.3), 'hi', true);
  const screwAt = along(rider, 0, BEAM.height / 2 + 0.8);
  add(cylinder(screwAt[0], 0, 1.5, screwAt[2], 2.6, P, 20), 'mid');
  // The month scale on the beam's front face: a tick a month from the top edge, a long one every six, the zero at the knife edge.
  const minor: string[] = [];
  const major: string[] = [];
  for (let month = 0; month <= SCALE_MONTHS; month++) {
    const big = month % 6 === 0;
    const top = along(month * MONTH, BEAM.half, BEAM.height / 2);
    const bottom = along(month * MONTH, BEAM.half, BEAM.height / 2 - (big ? 2.8 : 1.4));
    (big ? major : minor).push(pathOf([at(top), at(bottom)]));
  }
  // The rider's index line, down its front face over the scale, and the weight's band seam.
  const index = pathOf([at(along(rider, BEAM.half + 0.8, BEAM.height / 2 + 0.8)), at(along(rider, BEAM.half + 0.8, -BEAM.height / 2 - 0.8))]);
  const seam = sideArc(bob[0], 0, 5.6, bob[2] - 4.6, P, 28);
  return { solids, minor: minor.join(''), major: major.join(''), index, seam, hookWorld: along(-SHORT_ARM, 0, -1.2) };
}

/** The screen offset the load moves by when the beam tips: its hook rides the short arm's end. */
export function loadShift(tilt: number): Point3 {
  const hook = onBeam(-SHORT_ARM, tilt, 0, -1.2);
  const level = onBeam(-SHORT_ARM, 0, 0, -1.2);
  return [hook[0] - level[0], 0, hook[2] - level[2]];
}

// --------------------------------------------------------------- the load
export interface Disc {
  /** Whose cost this disc carries. */
  kind: 'robot' | 'integration';
  /** Light discs stand for one unit, heavy ones for five, the largest for twenty-five. */
  units: 1 | 5 | 25;
}

/**
 * The slotted discs for a cell: the robot's price and then the integration
 * share, each to the nearest light disc. A share of more than ten light
 * discs is made up from heavier ones, as a weight set is: twenty-five units
 * to each largest disc, then five to a heavy disc while more than five
 * remain, and the rest light.
 */
export function discStack(robotCost: number, integrationMultiple: number): Disc[] {
  const robot = Math.max(1, Math.round(robotCost / DISC_USD));
  const integration = Math.max(0, Math.round((robotCost * integrationMultiple) / DISC_USD) - robot);
  const split = (count: number, kind: Disc['kind']): Disc[] => {
    if (count <= 10) return Array.from({ length: count }, () => ({ kind, units: 1 as const }));
    const largest = Math.floor(count / 25);
    const rest = count - largest * 25;
    const heavy = rest > 5 ? Math.floor(rest / 5) : 0;
    const light = rest - heavy * 5;
    return [
      ...Array.from({ length: largest }, () => ({ kind, units: 25 as const })),
      ...Array.from({ length: heavy }, () => ({ kind, units: 5 as const })),
      ...Array.from({ length: light }, () => ({ kind, units: 1 as const })),
    ];
  };
  // The hanger's foot carries the integration discs; the robot's sit on top.
  return [...split(integration, 'integration'), ...split(robot, 'robot')];
}

/** How thick and how wide each disc is drawn. */
export const DISC_SIZE: Record<Disc['units'], { thick: number; grow: number }> = {
  1: { thick: 2.0, grow: 0 },
  5: { thick: 3.2, grow: 1.2 },
  25: { thick: 4.6, grow: 2.6 },
};

/** The height the hanger leaves for discs: from its foot plate up to the hook's ring, less the rod's nut. */
export const STACK_ROOM = BEAM_Z - 1.2 - 10.4 - 2.2 - (HANGER.foot + 2) - 1.6;
/** How tall a stack of discs stands. */
export const stackHeight = (discs: readonly Disc[]) => discs.reduce((sum, disc) => sum + DISC_SIZE[disc.units].thick, 0);

/** The cost the discs stand for, in dollars. */
export const stackUsd = (discs: readonly Disc[]) => discs.reduce((sum, disc) => sum + disc.units * DISC_USD, 0);

/**
 * The load hanging from the hook: hook, shackle, the hanger rod and its foot,
 * and the discs from the foot up. Built at the hook's level position; the
 * live code moves it with the hook.
 */
export function loadParts(discs: readonly Disc[]) {
  const parts: Part[] = [];
  const x = -SHORT_ARM;
  const hookZ = BEAM_Z - 1.2 - 0.0;
  // The hook: a link down from the beam's eye, and the hanger's ring.
  solid(parts, barBetween([x, 0, hookZ], [x, 0, hookZ - 9], [1, 0, 0], 1.0, 1.0, P), 'mid');
  solid(parts, discAlong([x, -1.4, hookZ - 10.4], [0, 1, 0], 2.2, 2.8, P, 20), 'mid');
  // The rod and the foot plate.
  const footTop = HANGER.foot + 2;
  solid(parts, cylinder(x, 0, DISC.r + 0.8, HANGER.foot, 2, P, 40, 0.4), 'mid');
  let z = footTop;
  const stack: Array<{ paths: SolidPaths; tone: Tone; inner: string }> = [];
  for (const disc of discs) {
    const thick = DISC_SIZE[disc.units].thick;
    // The robot's discs a size up from the integration's, so the cell's multiple reads as extra discs below.
    const radius = DISC.r + DISC_SIZE[disc.units].grow + (disc.kind === 'robot' ? 0.9 : 0);
    // The slot every slotted weight has, from its rim to the rod, on its top.
    const slot = lineOnTop([x, 0], [x + radius * 0.92, radius * 0.3], z + thick, P);
    stack.push({ paths: cylinder(x, 0, radius, z, thick - 0.15, P, 44, 0.3), tone: disc.kind === 'robot' ? 'mid' : 'lo', inner: seamOf(slot) });
    z += thick;
  }
  for (const item of stack) solid(parts, item.paths, item.tone, { inner: item.inner });
  solid(parts, cylinder(x, 0, HANGER.rod, z, hookZ - 10.4 - 2.2 - z, P, 16), 'mid');
  solid(parts, cylinder(x, 0, 2.4, z, 1.6, P, 20), 'mid');
  line(parts, knurl(x, 0, 2.4, z, z + 1.6, 16, P, 0.2), 'lo');
  return parts;
}

// --------------------------------------------------------------- the hour plate
/**
 * The hour plate in its own face plane: local x runs along the base's front
 * face, local y down it. `matrix` maps those onto the face; the bands go in
 * at `bandY` and `bandHeight`, sixty minutes over `length`.
 */
export const HOUR_FACE = (() => {
  const face = BASE.y + BASE.d;
  const matrix = sideMatrix([HOUR_PLATE.x0, face], HOUR_PLATE.top, P, 'left');
  const length = HOUR_PLATE.length;
  const plate = `M-3 -0.8H${length + 3}V${HOUR_PLATE.height + 0.8}H-3Z`;
  const bandY = 1.2;
  const bandHeight = 2.6;
  const ticks: string[] = [];
  const majors: string[] = [];
  for (let minute = 0; minute <= 60; minute += 5) {
    const x = tenth((minute / 60) * length);
    (minute % 15 === 0 ? majors : ticks).push(`M${x} ${bandY + bandHeight}V${bandY + bandHeight + (minute % 15 === 0 ? 2.0 : 1.1)}`);
  }
  const screws: Flat[] = [[-1.7, HOUR_PLATE.height / 2 - 0.4], [length + 1.7, HOUR_PLATE.height / 2 - 0.4]];
  return { matrix, length, plate, bandY, bandHeight, minor: ticks.join(''), major: majors.join(''), screws, frame: `M0 ${bandY}H${length}V${bandY + bandHeight}H0Z` };
})();

/** Screen units per world unit, for sizes the live code needs. */
export const SCALE = cameraOf(P).k;

// ------------------------------------------------------------------ the balance
/**
 * Where the poise rests, in months from the knife edge, and how far the beam
 * tips: the payback while it is on the scale; past 36 months the poise sits
 * on the end stop and the beam rests tipped up.
 */
export function balanceOf(paybackMonths: number | null): { poise: number; tilt: number; onScale: boolean } {
  if (paybackMonths === null || paybackMonths > SCALE_MONTHS) return { poise: SCALE_MONTHS, tilt: TIP_DEGREES, onScale: false };
  return { poise: paybackMonths, tilt: 0, onScale: true };
}

/** While the poise travels, the beam tips toward the heavier side, at most to its rests. */
export function tiltWhileMoving(poise: number, target: number, restTilt: number): number {
  const lean = (target - poise) * 0.35;
  return Math.max(-TIP_DEGREES, Math.min(TIP_DEGREES, restTilt + lean));
}
