/**
 * The tangent-rule stand for LinearizationGap, drawn with the isometric kit.
 *
 * The object is the explanation: a large protractor stands upright on a
 * bench, and a one-joint arm swings over its face from the pivot at its
 * foot, its stylus riding in a groove engraved in the face: the true path of
 * the hand, the curve. Across the top a steel rule is clamped on two posts
 * so that its lower edge just touches the groove at the estimate: the
 * straight line the extended Kalman filter puts in the curve's place. A
 * cursor on the rule is where that straight line says the hand is for the
 * arm's angle: it travels along the rule by the same arc length the stylus
 * travels along the groove. The cursor carries a dial gauge whose plunger
 * reaches down to the arm's tip, so the gauge reads the miss: its plunger and
 * needle are the one lit assembly, and its dial turns once for 15 cm. Groove
 * and rule carry the same graduations, five degrees of arc apart, so at the
 * estimate they agree and away from it the groove falls away below the rule.
 *
 * The spread of the filter's belief is set by two pairs of stops: one pair
 * clamped on the rim either side of the estimate, the matching pair clipped
 * on the rule. The gap between each pair is the straight line's miss at the
 * edge of the spread: twice the spread, about four times the miss. The arm's
 * length and the spread are illustrative; the miss is the geometry of that
 * arm (lib/linearization-gap.ts).
 *
 * World units are about 1 px of the drawing: x along the bench, y toward the
 * viewer, z up. The protractor stands in the x-z plane with its face toward
 * the viewer, the pivot at PIVOT and the estimate straight up.
 */
import {
  cylinder as kitCylinder,
  depthOf,
  fitProjection,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
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
import { barBetween, circleAround, discAlong, plateIn, viewOf } from '../prism.ts';
import { steadySolid } from '../steady-path.ts';
import { ARM_CM, SPREAD_RANGE, handAt, tangentAt } from '../../../lib/linearization-gap.ts';

export const WIDTH = 640;
export const AZIMUTH = 62;
export const ELEVATION = 24;

/** World units per centimetre of the arm, and the arm's length on the stand. */
export const U = 2;
export const L = ARM_CM * U;
/** The protractor's span either side of the estimate, degrees; the rule covers the same arc length. */
export const SPAN = 48;
const RAD = Math.PI / 180;

const BASE: Plan = { x: -114, y: -24, w: 228, d: 48, r: 6 };
const BASE_H = 8;
const FOOT_H = 5;
/** The pivot, on its pedestal; the protractor's face, the arm in front of it, the rule in front of both. */
export const PIVOT: Point3 = [0, 0, 22];
const PLATE = { y0: -2, y1: 2 };
const ARM = { y0: 2.6, y1: 5.2 };
const RULE = { y0: 2.4, y1: 9.4, h: 6 };
/** The protractor's rim, outside the groove the stylus rides in; the scale band between them carries the degrees. */
const RIM = L + 6.4;
const GROOVE = 1.8;
/** The gauge on the cursor: its plunger's plane, its dial's centre above the rule, and how far one turn reads, cm. */
const PROBE_Y = RULE.y1 + 2.4;
const DIAL = { r: 12, z: 0, y0: RULE.y1 - 0.6, y1: RULE.y1 + 4.6, turnCm: 15 };
const RULE_HALF = L * SPAN * RAD + 8;
const POST = { r: 3.6, x: RULE_HALF + 7 };
const PEDESTAL: Plan = { x: -18, y: -12, w: 36, d: 24, r: 2 };
const LABEL: Plan = { x: -100, y: 8, w: 36, d: 10, r: 2 };

/** A point on the protractor's face plane (front face, y = PLATE.y1) at an angle from the estimate and a radius. */
const polar = (deg: number, r: number, y = PLATE.y1): Point3 => [PIVOT[0] + r * Math.sin(deg * RAD), y, PIVOT[2] + r * Math.cos(deg * RAD)];
/** From the lib's frame (centimetres along the estimate, up, and across it, along +x) to the stand. */
const fromLib = ([a, b]: [number, number], y: number): Point3 => [PIVOT[0] + U * b, y, PIVOT[2] + U * a];
/** The tip on the rim, and where the rule puts it, at an angle from the estimate. */
export const tipAt = (deg: number, y = ARM.y1): Point3 => fromLib(handAt(deg), y);
export const cursorAt = (deg: number, y = RULE.y1): Point3 => fromLib(tangentAt(deg), y);
/** The rule's lower edge: the tangent at the estimate. */
const RULE_Z = PIVOT[2] + L;
DIAL.z = RULE_Z + RULE.h + 3.4 + 2.2 + DIAL.r;

// ---------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const [x, y] of [[BASE.x, BASE.y], [BASE.x + BASE.w, BASE.y], [BASE.x, BASE.y + BASE.d], [BASE.x + BASE.w, BASE.y + BASE.d]] as const) {
  extremes.push([x, y, -BASE_H - FOOT_H], [x, y, 0]);
}
for (const sx of [-1, 1]) extremes.push([sx * (POST.x + 6), 0, RULE_Z + RULE.h + 6], [sx * RULE_HALF, RULE.y1, RULE_Z + RULE.h + 4]);
// The dial gauge riding the cursor, at either end of its travel.
for (const sx of [-1, 1]) extremes.push([sx * (L * 40 * RAD + DIAL.r + 1), DIAL.y1, DIAL.z + DIAL.r + 1], [sx * (L * 40 * RAD + DIAL.r + 1), DIAL.y0, DIAL.z + DIAL.r + 1]);
const FIT_PAD = 8;
const unitP = fitProjection(extremes, 1000, 1000, { pad: 0, azimuth: AZIMUTH, elevation: ELEVATION });
const flatExtremes = extremes.map((point) => iso(point, unitP));
const span = (axis: 0 | 1) => Math.max(...flatExtremes.map((p) => p[axis])) - Math.min(...flatExtremes.map((p) => p[axis]));
export const HEIGHT = Math.ceil(((WIDTH - 2 * FIT_PAD) * span(1)) / span(0) + 2 * FIT_PAD);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: FIT_PAD, azimuth: AZIMUTH, elevation: ELEVATION });

const V = viewOf(P);
const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const seam = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const corners = (plan: Plan, inset: number): Plane[] => [
  [plan.x + inset, plan.y + inset],
  [plan.x + plan.w - inset, plan.y + inset],
  [plan.x + inset, plan.y + plan.d - inset],
  [plan.x + plan.w - inset, plan.y + plan.d - inset],
];
const X: Point3 = [1, 0, 0];
const Y: Point3 = [0, 1, 0];
const Z: Point3 = [0, 0, 1];
/** A box in the face planes: x0..x1 along the bench, y0..y1 toward the viewer, z0..z1 up. */
const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, bevel = 0.4) =>
  plateIn([x0, y0, z0], X, Z, [[0, 0], [x1 - x0, 0], [x1 - x0, z1 - z0], [0, z1 - z0]], -(y1 - y0), P, bevel);
/** Knurl lines on the visible side of a round part along +y (a knob on a front face). */
function knurlY(cx: number, cz: number, y0: number, y1: number, r: number, count: number, phase = 0): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    const n: Point3 = [Math.cos(a), 0, Math.sin(a)];
    if (n[0] * V[0] + n[2] * V[2] < 0.2) continue;
    out.push(pathOf([at([cx + r * n[0], y0 + 0.02, cz + r * n[2]]), at([cx + r * n[0], y1 - 0.02, cz + r * n[2]])]));
  }
  return out.join('');
}
/** Knurl lines on the visible side of an upright knob. */
function knurlZ(cx: number, cy: number, r: number, z0: number, z1: number, count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const n: Plane = [Math.cos(a), Math.sin(a)];
    if (n[0] * V[0] + n[1] * V[1] < 0.2) continue;
    out.push(pathOf([at([cx + r * n[0], cy + r * n[1], z0 + 0.02]), at([cx + r * n[0], cy + r * n[1], z1 - 0.02])]));
  }
  return out.join('');
}

// ---------------------------------------------------------------- parts
export type Slot = 'rimStops' | 'arm' | 'ruleStops' | 'cursor';
export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; name?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'face'; d: string; fill: 1 | 2 | 3; name?: string }
  | { kind: 'slot'; slot: Slot };
export type StandPart = Exclude<Part, { kind: 'slot' }>;

const list: Part[] = [];
const solid = (paths: SolidPaths, tone: Tone = 'mid', extra: { lit?: boolean; crease?: Tone | 'none'; inner?: string; name?: string } = {}) =>
  list.push({ kind: 'solid', paths: steadySolid(paths), tone, ...extra });
const line = (d: string, tone: LineTone = 'lo', free?: boolean | 'start' | 'end') => {
  if (d) list.push({ kind: 'line', d, tone, free });
};
const dots = (points: Point3[], size = 0.5, tone: Tone = 'mid') => list.push({ kind: 'dots', points: points.map(at), size, tone });
const slot = (name: Slot) => list.push({ kind: 'slot', slot: name });

// The bench: a plate on four turned feet, with an edge seam, a groove and corner screws.
for (const [x, y] of byDepth(corners(BASE, 14))) {
  solid(cyl(x, y, 7, -BASE_H - FOOT_H, 1.4), 'lo');
  solid(cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.4, FOOT_H - 1.4), 'mid');
}
solid(slab(BASE, -BASE_H, BASE_H, 8, 1.4), 'mid', { inner: seam(sideSeam(BASE, -BASE_H + 2.6, P, 8)) });
line(planOutline(insetPlan(BASE, 4.5), 0, P), 'faint');
line(corners(BASE, 9).map(([x, y]) => ring(x, y, 2.2, 0, P, 16)).join(''), 'lo');
dots(corners(BASE, 9).map(([x, y]) => [x, y, 0] as Point3), 0.5);

// The label plate at the front left.
solid(slab(LABEL, 0, 0.8, 3), 'lo', { crease: 'none' });
line(planOutline(insetPlan(LABEL, 1.6), 0.8, P), 'faint');
line([0, 1, 2].map((row) => onTop([[LABEL.x + 7, LABEL.y + 2.6 + row * 2.4], [LABEL.x + (row === 1 ? 22 : 29), LABEL.y + 2.6 + row * 2.4]], 0.8, P)).join(''), 'lo', true);
dots([[LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8], [LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8]], 0.45);

// The rule's two posts, each on a flange, behind the protractor's plane at the ends.
for (const sx of [-1, 1]) {
  const x = sx * POST.x;
  solid(cyl(x, 0, 7, 0, 2.4, 28, 0.4), 'mid');
  dots([0, 1, 2, 3].map((k) => [x + 5.4 * Math.cos((k / 4) * Math.PI * 2 + Math.PI / 4), 5.4 * Math.sin((k / 4) * Math.PI * 2 + Math.PI / 4), 2.4] as Point3), 0.42);
  solid(cyl(x, 0, POST.r, 2.4, RULE_Z + RULE.h + 3 - 2.4, 24), 'mid', { inner: seam(sideArc(x, 0, POST.r, 10, P, 16)) });
  solid(cyl(x, 0, POST.r + 0.8, RULE_Z + RULE.h + 3, 1.6, 24, 0.3), 'mid');
}

// Two braces behind the protractor, from foot blocks on the bench up to its back face.
for (const sx of [-1, 1]) {
  const top = polar(sx * (SPAN - 6), 52, PLATE.y0 - 1.7);
  const foot: Point3 = [sx * 52, PLATE.y0 - 1.7, 4];
  solid(slab({ x: foot[0] - 5, y: foot[1] - 5, w: 10, d: 10, r: 1.2 }, 0, 4, 2, 0.3), 'mid');
  solid(barBetween(foot, top, Y, 3.4, 3.4, P, 0.2), 'mid');
}

// The pedestal under the pivot, and the protractor: a sector plate standing on it, with two braces to the bench.
solid(slab(PEDESTAL, 0, PIVOT[2] - 9, 3, 0.6), 'mid', { inner: seam(sideSeam(PEDESTAL, 4, P, 3)) });
dots(corners(PEDESTAL, 3).map(([x, y]) => [x, y, PIVOT[2] - 9] as Point3), 0.45);
{
  // The sector: from the pivot's hub out to the rim, ±SPAN about the estimate, with a rounded foot round the pivot.
  const outline: Array<[number, number]> = [];
  for (let k = 0; k <= 48; k++) {
    const deg = -SPAN + (2 * SPAN * k) / 48;
    outline.push([RIM * Math.sin(deg * RAD), RIM * Math.cos(deg * RAD)]);
  }
  for (let k = 0; k <= 16; k++) {
    const a = (SPAN + (k / 16) * (360 - 2 * SPAN)) * RAD;
    outline.push([13 * Math.sin(a), 13 * Math.cos(a)]);
  }
  solid(plateIn([PIVOT[0], PLATE.y1, PIVOT[2]], X, Z, outline, PLATE.y1 - PLATE.y0, P, 0.5), 'hi');
  const arc = (r: number, from = -SPAN, to = SPAN, y = PLATE.y1) => {
    const points: Flat[] = [];
    for (let k = 0; k <= 64; k++) points.push(at(polar(from + ((to - from) * k) / 64, r, y)));
    return points;
  };
  // The scale band between the groove and the rim, a shade lighter than the face.
  {
    const band = pathOf([...arc(RIM), ...arc(L + GROOVE + 1).reverse()], true);
    solid({ fill: band, outline: pathOf(arc(L + GROOVE + 1)), crease: '', top: '', shades: ['', '', '', band] }, 'lo', { crease: 'none' });
  }
  // The groove the stylus rides in: the arc the hand truly follows, engraved at the arm's length, its lower wall in shade.
  {
    // A closed slot: its arcs stop short of the face's edges and turn round in half circles.
    const end = SPAN - 2.5;
    const upper = arc(L + GROOVE, -end, end);
    const lower = arc(L - GROOVE, -end, end);
    const cap = (deg: number, sign: number) => {
      const centre = polar(deg, L);
      const out: Flat[] = [];
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI;
        // Round the end from the outer arc to the inner one, bulging away from the slot.
        const radial = Math.cos(a) * GROOVE;
        const along = Math.sin(a) * GROOVE * sign;
        const dir: Point3 = [Math.sin(deg * RAD), 0, Math.cos(deg * RAD)];
        const tan: Point3 = [Math.cos(deg * RAD), 0, -Math.sin(deg * RAD)];
        out.push(at([centre[0] + dir[0] * radial + tan[0] * along, centre[1], centre[2] + dir[2] * radial + tan[2] * along]));
      }
      return out;
    };
    const slotPath = pathOf([...upper, ...cap(end, 1), ...[...lower].reverse(), ...cap(-end, -1).reverse()], true);
    list.push({ kind: 'face', d: slotPath, fill: 2, name: 'groove' });
    const wall = arc(L + GROOVE - 1, -end, end);
    list.push({ kind: 'face', d: pathOf([...upper, ...[...wall].reverse()], true), fill: 1 });
    line(slotPath, 'mid');
  }
  // Guide lines from an engraved circle round the hub out to the groove, every fifteen degrees; the estimate's is darker.
  {
    const hub = 20;
    // The engraved circle stops short of the face's edges on two screw heads.
    line(pathOf(arc(hub, -(SPAN - 4), SPAN - 4)), 'lo');
    dots([polar(-(SPAN - 4), hub), polar(SPAN - 4, hub)], 0.6);
    const guides: string[] = [];
    for (let deg = -30; deg <= 30; deg += 15) if (deg !== 0) guides.push(pathOf([at(polar(deg, hub)), at(polar(deg, L - GROOVE))]));
    line(guides.join(''), 'faint');
    line(pathOf([at(polar(0, hub)), at(polar(0, L - GROOVE))]), 'lo');
  }
  // Degree graduations hung from the rim: every degree, longer every five, longest every fifteen, the estimate's mark.
  {
    const fine: string[] = [];
    const five: string[] = [];
    const fifteen: string[] = [];
    for (let deg = -SPAN; deg <= SPAN; deg += 1) {
      if (deg === 0) continue;
      // The fifteens run the scale band's whole width, to its inner edge; the others hang from the rim.
      const length = deg % 15 === 0 ? RIM - (L + GROOVE + 1) : deg % 5 === 0 ? 2.4 : 1.4;
      (deg % 15 === 0 ? fifteen : deg % 5 === 0 ? five : fine).push(pathOf([at(polar(deg, RIM)), at(polar(deg, RIM - length))]));
    }
    line(fine.join(''), 'faint');
    line(five.join(''), 'lo');
    line(fifteen.join(''), 'mid');
    line(pathOf([at(polar(0, RIM)), at(polar(0, L + GROOVE))]), 'hi');
  }
  // The maker's plate on the face below the groove, with three engraved rule lines and two screws, and the screws that
  // hold the face to its frame.
  {
    const plate = { x0: -17, x1: 17, z0: PIVOT[2] + 30, z1: PIVOT[2] + 42 };
    solid(box(plate.x0, plate.x1, PLATE.y1, PLATE.y1 + 0.8, plate.z0, plate.z1, 0.3), 'mid', { crease: 'none' });
    const y = PLATE.y1 + 0.8;
    line(pathOf([at([plate.x0 + 1.4, y, plate.z0 + 1.4]), at([plate.x1 - 1.4, y, plate.z0 + 1.4]), at([plate.x1 - 1.4, y, plate.z1 - 1.4]), at([plate.x0 + 1.4, y, plate.z1 - 1.4])], true), 'faint');
    line([0, 1, 2].map((row) => pathOf([at([plate.x0 + 6, y, plate.z1 - 3.6 - row * 2.6]), at([row === 1 ? 6 : 11, y, plate.z1 - 3.6 - row * 2.6])])).join(''), 'lo', true);
    dots([[plate.x0 + 3, y, (plate.z0 + plate.z1) / 2], [plate.x1 - 3, y, (plate.z0 + plate.z1) / 2]], 0.45);
    dots([-SPAN + 6, -SPAN / 2, SPAN / 2, SPAN - 6].map((deg) => polar(deg, L - 16)), 0.45);
  }
}

// The rim's stops sit on the protractor's edge; the arm swings in front of it.
slot('rimStops');
slot('arm');

// The rule: a steel straightedge clamped to the posts, its lower edge on the tangent at the estimate, its
// graduations the same arc length apart as the rim's, the estimate's mark where it touches the rim.
{
  for (const sx of [-1, 1]) {
    const x = sx * POST.x;
    solid(box(x - 5, x + 5, RULE.y0 - 7, RULE.y0, RULE_Z - 2, RULE_Z + RULE.h + 2), 'mid');
    solid(discAlong([x, RULE.y0 - 7, RULE_Z + RULE.h / 2], [0, -1, 0], 1.6, 1.4, P, 16), 'mid');
  }
  solid(box(-RULE_HALF - 6, RULE_HALF + 6, RULE.y0, RULE.y1, RULE_Z, RULE_Z + RULE.h, 0.4), 'hi');
  const minor: string[] = [];
  const major: string[] = [];
  for (let deg = -SPAN + (SPAN % 5); deg <= SPAN; deg += 5) {
    if (deg === 0) continue;
    const x = PIVOT[0] + L * deg * RAD;
    // Every fifteen degrees of arc runs the rule's whole face, edge to edge; the others hang from its lower edge.
    const long = deg % 15 === 0 ? RULE.h : 2;
    (deg % 15 === 0 ? major : minor).push(pathOf([at([x, RULE.y1, RULE_Z]), at([x, RULE.y1, RULE_Z + long])]));
  }
  line(minor.join(''), 'lo');
  line(major.join(''), 'mid');
  line(pathOf([at([PIVOT[0], RULE.y1, RULE_Z]), at([PIVOT[0], RULE.y1, RULE_Z + RULE.h])]), 'hi');
  for (const sx of [-1, 1]) {
    const x = sx * POST.x;
    solid(discAlong([x, RULE.y1, RULE_Z + RULE.h / 2], Y, 1.4, 1.2, P, 16), 'mid');
    solid(discAlong([x, RULE.y1 + 1.2, RULE_Z + RULE.h / 2], Y, 3.2, 2.6, P, 28, 0.3), 'mid', { inner: seam(knurlY(x, RULE_Z + RULE.h / 2, RULE.y1 + 1.2, RULE.y1 + 3.8, 3.2, 24)) });
  }
}

// The stops clipped on the rule, then the cursor.
slot('ruleStops');
slot('cursor');

export const PARTS: readonly Part[] = list;

// ---------------------------------------------------------------- moving parts
/** The stops on the rim at ±spread: a clamp that straddles the protractor's edge, with a knurled screw on its face. */
function rimStopParts(spreadDeg: number): StandPart[] {
  const parts: StandPart[] = [];
  for (const sign of [-1, 1]) {
    const deg = sign * spreadDeg;
    const radial: Point3 = [Math.sin(deg * RAD), 0, Math.cos(deg * RAD)];
    const tangent: Point3 = [Math.cos(deg * RAD), 0, -Math.sin(deg * RAD)];
    // The clamp straddles the rim just past the spread and reaches in over the groove, so the stylus stops against it.
    const centre = polar(deg + sign * 3.2, L + 1.6, 0);
    const corner = (a: number, b: number): Point3 => [centre[0] + radial[0] * a + tangent[0] * b, 0, centre[2] + radial[2] * a + tangent[2] * b];
    const ringPts = [corner(-5.4, -2.4), corner(6.4, -2.4), corner(6.4, 2.4), corner(-5.4, 2.4)].map((p) => [p[0], PLATE.y0 - 1.6, p[2]] as Point3);
    parts.push({ kind: 'solid', paths: plateFrom(ringPts, PLATE.y1 - PLATE.y0 + 3.2), tone: 'mid' });
    const screw = corner(-1.6, 0);
    parts.push({ kind: 'solid', paths: discAlong([screw[0], PLATE.y1 + 1.6, screw[2]], Y, 1.6, 1.8, P, 20, 0.2), tone: 'mid' });
  }
  return parts;
}

/** A prism swept toward the viewer from a ring in a plane of constant y. */
function plateFrom(ringPts: Point3[], depth: number): SolidPaths {
  const [o] = ringPts;
  const outline = ringPts.map((p) => [p[0] - o![0], p[2] - o![2]] as [number, number]);
  return plateIn(o!, X, Z, outline, -depth, P, 0.3);
}

/** The clips on the rule at ±spread, at the same arc length from the estimate. */
function ruleStopParts(spreadDeg: number): StandPart[] {
  const parts: StandPart[] = [];
  for (const sign of [-1, 1]) {
    const x = PIVOT[0] + L * spreadDeg * RAD * sign + sign * 2;
    parts.push({ kind: 'solid', paths: box(x - 1.6, x + 1.6, RULE.y0 - 1.2, RULE.y1 + 1.2, RULE_Z - 3, RULE_Z + RULE.h + 1.2), tone: 'mid' });
    parts.push({ kind: 'dots', points: [at([x, RULE.y1 + 1.2, RULE_Z + RULE.h - 1.4])], size: 0.45, tone: 'mid' });
  }
  return parts;
}

/** The contact ball on the arm's tip: its top is the tip, at the arm's length, in the plunger's plane. */
const BALL = 1.5;
const ballAt = (deg: number): Point3 => polar(deg, L - BALL, PROBE_Y - 1.1);

/** The miss as the stand draws it: the cursor's point on the rule's edge to the arm's tip, world units. */
const missLength = (deg: number) => {
  const a = cursorAt(deg);
  const b = tipAt(deg);
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
};

/** Where the gauge's needle points at an angle from the estimate, radians clockwise from the top: one turn is 15 cm. */
export const dialAngle = (deg: number) => (missLength(deg) / U / DIAL.turnCm) * Math.PI * 2;
export const DIAL_TURN_CM = DIAL.turnCm;

/**
 * The cursor at an angle from the estimate: a saddle that rides the rule, its pointer down to the rule's lower edge,
 * and the dial gauge it carries. The gauge's plunger runs from the pointer's tip down to the contact pin on the arm's
 * tip, so its length is the straight line's miss, and its needle turns once for 15 cm of plunger: the dial reads the
 * miss. Plunger, contact ball and needle are the lit assembly.
 */
function cursorParts(deg: number): StandPart[] {
  const c = cursorAt(deg);
  const x = c[0];
  const parts: StandPart[] = [];
  parts.push({ kind: 'solid', paths: box(x - 4.4, x + 4.4, RULE.y0 - 1.4, RULE.y1 + 1.6, RULE_Z + 1.6, RULE_Z + RULE.h + 3.4), tone: 'hi', name: 'cursor' });
  parts.push({ kind: 'dots', points: [at([x - 2.8, RULE.y1 + 1.6, RULE_Z + RULE.h + 1.6]), at([x + 2.8, RULE.y1 + 1.6, RULE_Z + RULE.h + 1.6])], size: 0.4, tone: 'mid' });
  // The gauge: a stem up from the saddle, the dial's case with its bezel, the face's graduations and the needle.
  const base = RULE_Z + RULE.h + 3.4;
  parts.push({ kind: 'solid', paths: cyl(x, (DIAL.y0 + DIAL.y1) / 2, 1.6, base, DIAL.z - DIAL.r - base + 0.6, 16), tone: 'mid' });
  parts.push({ kind: 'solid', paths: discAlong([x, DIAL.y0, DIAL.z], Y, DIAL.r, DIAL.y1 - DIAL.y0, P, 48, 0.4), tone: 'hi', name: 'dial' });
  parts.push({ kind: 'solid', paths: discAlong([x, DIAL.y1, DIAL.z], Y, DIAL.r - 1.2, 0.4, P, 48, 0.2), tone: 'mid' });
  const face = DIAL.y1 + 0.4;
  const onFace = (a: number, r: number): Point3 => [x + r * Math.sin(a), face, DIAL.z + r * Math.cos(a)];
  const ticks: string[] = [];
  const majors: string[] = [];
  for (let cm = 0; cm < DIAL.turnCm; cm++) {
    const a = (cm / DIAL.turnCm) * Math.PI * 2;
    const long = cm % 5 === 0;
    (long ? majors : ticks).push(pathOf([at(onFace(a, DIAL.r - 1.2)), at(onFace(a, DIAL.r - (long ? 4 : 2.4)))]));
  }
  // The scale's inner circle, where the five-centimetre marks end.
  const inner: Flat[] = [];
  for (let k = 0; k <= 64; k++) inner.push(at(onFace((k / 64) * Math.PI * 2, DIAL.r - 4)));
  parts.push({ kind: 'line', d: pathOf(inner, true), tone: 'faint' });
  parts.push({ kind: 'line', d: ticks.join(''), tone: 'lo' });
  parts.push({ kind: 'line', d: majors.join(''), tone: 'hi' });
  const reading = dialAngle(deg);
  // The needle: a slim blade from a short tail through the centre to the graduations, and the cap that holds it.
  const along: Point3 = [Math.sin(reading), 0, Math.cos(reading)];
  const across: Point3 = [Math.cos(reading), 0, -Math.sin(reading)];
  const blade = [[-1.8, -0.7], [-1.8, 0.7], [DIAL.r - 2.4, 0]] as Array<[number, number]>;
  parts.push({ kind: 'solid', paths: plateIn([x, face + 0.4, DIAL.z], along, across, blade.map(([a, b]) => [a, b]), 0.3, P, 0.05), tone: 'hi', lit: true, name: 'needle' });
  parts.push({ kind: 'solid', paths: discAlong([x, face + 0.4, DIAL.z], Y, 1.1, 0.6, P, 16, 0.2), tone: 'hi' });
  // The pointer on the rule's lower edge, where the straight line puts the hand.
  parts.push({ kind: 'solid', paths: plateIn([x, RULE.y1 + 1.6, RULE_Z], X, Z, [[-2.4, 1.6], [2.4, 1.6], [0, 0]], -1.2, P, 0.1), tone: 'hi', name: 'cursor-pointer' });
  // The plunger: from the pointer's tip down to the contact pin on the arm's tip, in front of the rule. Its length is
  // the miss: nothing at the estimate, growing as the arm swings away. A contact ball closes it on the pin.
  // The arm's contact pin and ball, in front of the rule: the ball's top is the arm's tip.
  const ball = ballAt(deg);
  parts.push({ kind: 'solid', paths: discAlong([ball[0], ARM.y1, ball[2]], Y, 0.7, ball[1] - ARM.y1, P, 12), tone: 'mid' });
  parts.push({ kind: 'solid', paths: discAlong(ball, Y, BALL, 2.2, P, 20, 0.4), tone: 'hi', name: 'contact-ball' });
  const top: Point3 = [x, PROBE_Y, RULE_Z];
  const end = tipAt(deg, PROBE_Y);
  const miss = missLength(deg);
  if (miss > 0.6) {
    parts.push({ kind: 'solid', paths: barBetween(top, end, X, 2, 1.6, P, 0.1), tone: 'hi', lit: true, name: 'feeler' });
    // The plunger is graduated every centimetre from the rule's edge, so the miss can be counted on it too.
    const dir: Point3 = [(end[0] - top[0]) / miss, 0, (end[2] - top[2]) / miss];
    const side: Point3 = [dir[2], 0, -dir[0]];
    const marks: string[] = [];
    for (let cm = 1; cm * U < miss - 0.4; cm++) {
      const c: Point3 = [top[0] + dir[0] * cm * U, PROBE_Y + 0.8, top[2] + dir[2] * cm * U];
      const half = cm % 5 === 0 ? 1 : 0.55;
      marks.push(pathOf([at([c[0] - side[0] * 1, c[1], c[2] - side[2] * 1]), at([c[0] - side[0] * (1 - 2 * half), c[1], c[2] - side[2] * (1 - 2 * half)])]));
    }
    if (marks.length) parts.push({ kind: 'line', d: marks.join(''), tone: 'lo' });
  }
  return parts;
}

/** The arm at an angle from the estimate: hub, bar, the tip on the rim and the knob that swings it. */
function armParts(deg: number): StandPart[] {
  const parts: StandPart[] = [];
  const hub: Point3 = [PIVOT[0], ARM.y0, PIVOT[2]];
  parts.push({ kind: 'solid', paths: discAlong([PIVOT[0], PLATE.y1, PIVOT[2]], Y, 9, ARM.y0 - PLATE.y1, P, 36, 0.3), tone: 'mid' });
  const dir: Point3 = [Math.sin(deg * RAD), 0, Math.cos(deg * RAD)];
  const from: Point3 = [hub[0] + dir[0] * 4, (ARM.y0 + ARM.y1) / 2, hub[2] + dir[2] * 4];
  const to: Point3 = [hub[0] + dir[0] * (L - 10), (ARM.y0 + ARM.y1) / 2, hub[2] + dir[2] * (L - 10)];
  parts.push({ kind: 'solid', paths: barBetween(from, to, Y, ARM.y1 - ARM.y0, 6, P, 0.3), tone: 'mid' });
  // The tip: a pointer from the bar's end to the rim.
  const across: Point3 = [dir[2], 0, -dir[0]];
  const base = (k: number): [number, number] => [(L - 10) * dir[0] + across[0] * k, (L - 10) * dir[2] + across[2] * k];
  const tip: [number, number] = [L * dir[0], L * dir[2]];
  parts.push({ kind: 'solid', paths: plateIn([PIVOT[0], ARM.y1, PIVOT[2]], X, Z, [base(-3), base(3), tip], ARM.y1 - ARM.y0, P, 0.1), tone: 'hi', name: 'tip' });
  // The stylus at the tip rides in the groove. (The pin forward from it and its ball sit in front of the rule, so the
  // cursor's slot draws them.)
  parts.push({ kind: 'solid', paths: discAlong(polar(deg, L - 0.2, PLATE.y1 - 0.8), Y, 1.2, ARM.y0 - PLATE.y1 + 0.8, P, 16, 0.2), tone: 'mid' });
  parts.push({ kind: 'solid', paths: discAlong([PIVOT[0], ARM.y1, PIVOT[2]], Y, 6, 2.4, P, 32, 0.3), tone: 'mid' });
  parts.push({ kind: 'dots', points: [0, 1, 2, 3].map((k) => at([PIVOT[0] + 3.8 * Math.cos(k * Math.PI / 2 + deg * RAD), ARM.y1 + 2.4, PIVOT[2] + 3.8 * Math.sin(k * Math.PI / 2 + deg * RAD)])), size: 0.42, tone: 'mid' });
  const knob: Point3 = [hub[0] + dir[0] * L * 0.55, ARM.y1, hub[2] + dir[2] * L * 0.55];
  parts.push({ kind: 'solid', paths: discAlong(knob, Y, 1.6, 2.2, P, 16), tone: 'mid' });
  parts.push({ kind: 'solid', paths: discAlong([knob[0], knob[1] + 2.2, knob[2]], Y, 3.2, 3.6, P, 28, 0.3), tone: 'mid', inner: seam(knurlY(knob[0], knob[2], knob[1] + 2.2, knob[1] + 5.8, 3.2, 22)) });
  return parts;
}

export interface StandPose {
  /** The spread either side of the estimate, and the arm's angle from the estimate, degrees. */
  spread: number;
  angle: number;
}

export function movingAt(pose: StandPose): Record<Slot, StandPart[]> {
  const steady = (parts: StandPart[]) => parts.map((part) => (part.kind === 'solid' ? { ...part, paths: steadySolid(part.paths) } : part));
  return { rimStops: steady(rimStopParts(pose.spread)), arm: steady(armParts(pose.angle)), ruleStops: steady(ruleStopParts(pose.spread)), cursor: steady(cursorParts(pose.angle)) };
}

/** A pose from preview input: `{ spread, angle }`; the angle defaults to the + stop. */
export const poseFrom = (raw: { spread?: number; angle?: number }): StandPose => {
  const spread = raw.spread ?? 30;
  return { spread, angle: raw.angle ?? spread };
};

export const LIMITS = { SPREAD_RANGE, SPAN };
export const SCREEN = { at, PIVOT, RULE_Z, knurlZ, circleAround };
