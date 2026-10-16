/**
 * A four-legged robot on a treadmill, drawn with the isometric kit, shared by
 * the reward-design figures (the reward mixing desk and the reward-writing
 * loop). Each figure fits its own camera and places the treadmill on its
 * base; this module builds the treadmill's parts and the robot at any pose
 * for that camera.
 *
 * World units are millimetres of a bench model: x runs along the belt (the
 * robot faces +x), y across it toward the viewer, z up. `o` is the
 * treadmill's centre on the base's top face.
 *
 * The robot is built in its own frame, origin at hip height on the body's
 * middle, then rolled about its long axis (a quarter turn lays it on its
 * side with its legs toward the viewer, a half turn on its back) and placed
 * over the belt. Its body is a convex box and each side's legs lie outside
 * one of its side faces, so a side's legs are drawn in front of the body
 * exactly when that face turns toward the viewer.
 */
import {
  depthOf,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  sideSeam,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from '../iso-kit.ts';
import { discAlong, prismAlong, viewOf, barBetween } from '../prism.ts';

/** A drawn part, as the shared PartView draws it. */
export type RigPart =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone };

// ------------------------------------------------------------------ the robot (mm)
/** Hip height above the belt when standing. */
export const HIP_H = 27;
export const THIGH = 16.5;
export const SHIN = 16.5;
export const HIP_X = 20;
/** The legs swing in planes just outside the hip motors. */
export const LEG_Y = 11;
/** The foot disc's radius: a foot on the belt has its centre this high. */
export const FOOT_R = 2.2;
/** The feet in drawing and model order: right hind, left hind, right front, left front. */
export const FOOT_ORDER = ['rh', 'lh', 'rf', 'lf'] as const;
export type Leg = (typeof FOOT_ORDER)[number];
const legY = (leg: Leg) => (leg === 'lh' || leg === 'lf' ? LEG_Y : -LEG_Y);
const legX = (leg: Leg) => (leg === 'lh' || leg === 'rh' ? -HIP_X : HIP_X);

/** The body box, battery and head in the robot's frame (z = 0 at the hips). */
const BODY = { plan: { x: -27, y: -6.5, w: 54, d: 13, r: 3 } as Plan, z0: -4, h: 10 };
const BATTERY = { plan: { x: -14, y: -4.2, w: 22, d: 8.4, r: 1.6 } as Plan, z0: 6, h: 2.6 };
const HEAD = { plan: { x: 27, y: -5, w: 7, d: 10, r: 1.6 } as Plan, z0: -2, h: 8 };
/** Lying on its back, the robot rests on its battery: its hips sit this far below standing height. */
export const BACK_RISE = BATTERY.z0 + BATTERY.h - HIP_H;

// ------------------------------------------------------------------ the treadmill (mm, from o)
export const DECK = { x0: -46, x1: 46, half: 14 };
const DECK_Z = [5, 10.4] as const;
/** The belt's top, where feet stand, above the base's top. */
export const BELT_Z = DECK_Z[1];
const RAIL = { thick: 2, height: 3.2 };
const ROLLER_R = 3.6;
/** The slats' pitch on the belt. */
export const SLAT_PITCH = 6.5;

export interface FootPose {
  /** Along the belt from below its hip, and lift of the foot above standing height (the robot's frame). */
  dx: number;
  lift: number;
  down: boolean;
}

export interface RobotPose {
  /** In FOOT_ORDER. */
  feet: readonly FootPose[];
  /** How far the hips ride above standing height. */
  rise: number;
  /** Roll about the body's long axis, in radians: 0 standing, π on its back. */
  roll: number;
}

/** The robot standing square, every foot under its hip. */
export const STANDING: RobotPose = { feet: FOOT_ORDER.map(() => ({ dx: 0, lift: 0, down: true })), rise: 0, roll: 0 };

export interface RobotSolid {
  paths: SolidPaths;
  tone: Tone;
  /** A seam under the outline: as line markup, and as its path data for live code. */
  inner?: string;
  seam?: string;
}

const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const seamMarkup = (d: string) => (d ? `<path class="iso-line" data-tone="faint" d="${d}"/>` : '');

/** The knee for a hip and foot: two equal links, the knee bending back toward the tail. */
function kneeOf(hip: Point3, foot: Point3): Point3 {
  const dx = foot[0] - hip[0];
  const dz = foot[2] - hip[2];
  const reach = Math.min(Math.hypot(dx, dz), THIGH + SHIN - 0.01);
  const toward = Math.atan2(dz, dx);
  const bend = Math.acos(Math.max(-1, Math.min(1, (THIGH * THIGH + reach * reach - SHIN * SHIN) / (2 * THIGH * reach))));
  const angle = toward - bend;
  return [hip[0] + THIGH * Math.cos(angle), hip[1], hip[2] + THIGH * Math.sin(angle)];
}

/** Builders for one figure's camera, with the treadmill's centre at `o` on the base's top face. */
export function rigFor(P: Projection, o: Point3) {
  const at = (point: Point3) => iso(point, P);
  const w = (x: number, y: number, z: number): Point3 => [o[0] + x, o[1] + y, o[2] + z];
  const V = viewOf(P);

  /** The robot's frame for a pose: a body-frame point to the world. */
  const placer = (pose: RobotPose) => {
    const c = Math.cos(pose.roll);
    const s = Math.sin(pose.roll);
    const origin = w(0, 0, BELT_Z + HIP_H + pose.rise);
    const turn = ([x, y, z]: Point3): Point3 => [x, y * c - z * s, y * s + z * c];
    return { point: (p: Point3) => add(turn(p), origin), axis: turn };
  };

  /** A rounded box in the robot's frame, turned with it. */
  function box(place: ReturnType<typeof placer>, plan: Plan, z0: number, h: number, bevel = 0.5): SolidPaths {
    const corners = roundPlan(plan, 4).map(([x, y]) => place.point([x, y, z0]));
    return prismAlong(corners, place.axis([0, 0, h]), P, { round: true, bevel });
  }

  /** The visible half of a ring round a box at height z in the robot's frame (a seam on its sides). */
  function boxSeam(place: ReturnType<typeof placer>, plan: Plan, z: number): string {
    const ringPoints = roundPlan(plan, 4);
    const n = ringPoints.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = ringPoints[i]!;
      const [bx, by] = ringPoints[(i + 1) % n]!;
      area += ax * by - bx * ay;
    }
    const sign = area > 0 ? 1 : -1;
    const visible = ringPoints.map((point, i) => {
      const next = ringPoints[(i + 1) % n]!;
      const normal = place.axis([sign * (next[1] - point[1]), -sign * (next[0] - point[0]), 0]);
      return normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2] > 1e-9;
    });
    // Runs of visible edges, walked from the first hidden one so a run never wraps.
    const start = visible.findIndex((v) => !v);
    if (start < 0) return '';
    const runs: Flat[][] = [];
    let run: Flat[] = [];
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n;
      if (visible[i]) {
        if (!run.length) run.push(at(place.point([ringPoints[i]![0], ringPoints[i]![1], z])));
        const next = ringPoints[(i + 1) % n]!;
        run.push(at(place.point([next[0], next[1], z])));
      } else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);
    return runs.map((points) => pathOf(points)).join('');
  }

  /** One leg's solids, hip motor to foot. */
  function legSolids(place: ReturnType<typeof placer>, leg: Leg, foot: FootPose): RobotSolid[] {
    const y = legY(leg);
    const side = Math.sign(y);
    const hip: Point3 = [legX(leg), y, 0];
    const toe: Point3 = [legX(leg) + foot.dx, y, -(HIP_H - FOOT_R) + foot.lift];
    const knee = kneeOf(hip, toe);
    const across = place.axis([0, side, 0]);
    return [
      { paths: discAlong(place.point([hip[0], side * 6.5, 0]), across, 4.6, 3.6, P, 28, 0.3), tone: 'mid' },
      { paths: barBetween(place.point(hip), place.point(knee), across, 2.6, 3.8, P, 0.3), tone: 'mid' },
      { paths: discAlong(place.point([knee[0], y - side * 1.6, knee[2]]), across, 2.4, 3.2, P, 20), tone: 'mid' },
      { paths: barBetween(place.point(knee), place.point([toe[0], y, toe[2] + 1.2]), across, 2.0, 2.6, P, 0.2), tone: 'mid' },
      { paths: discAlong(place.point([toe[0], y - side * 1.4, toe[2]]), across, FOOT_R, 2.8, P, 20), tone: foot.down ? 'hi' : 'mid' },
    ];
  }

  /**
   * The robot at a pose: the legs behind its body, its body and the legs in
   * front, each in painter's order, and all of them as one list. The counts
   * never change, so the live code can write every solid in place.
   */
  function robot(pose: RobotPose): { far: RobotSolid[]; body: RobotSolid[]; near: RobotSolid[]; all: RobotSolid[] } {
    const place = placer(pose);
    const legs = FOOT_ORDER.map((leg, index) => ({ leg, solids: legSolids(place, leg, pose.feet[index]!) }));
    const depthOfHip = (leg: Leg) => depthOf(place.point([legX(leg), legY(leg), 0]), P);
    // A side's legs are in front when that side face of the body turns toward the viewer.
    const facing = (leg: Leg) => {
      const normal = place.axis([0, Math.sign(legY(leg)), 0]);
      return normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2] > 0;
    };
    const sideLegs = (far: boolean) =>
      legs
        .filter(({ leg }) => facing(leg) !== far)
        .sort((a, b) => depthOfHip(a.leg) - depthOfHip(b.leg))
        .flatMap(({ solids }) => solids);
    const shellSeam = boxSeam(place, BODY.plan, BODY.z0 + 3.4);
    const batterySeam = boxSeam(place, BATTERY.plan, BATTERY.z0 + 1.2);
    const shell: RobotSolid = { paths: box(place, BODY.plan, BODY.z0, BODY.h, 0.8), tone: 'hi', inner: seamMarkup(shellSeam), seam: shellSeam };
    const battery: RobotSolid = { paths: box(place, BATTERY.plan, BATTERY.z0, BATTERY.h, 0.4), tone: 'mid', inner: seamMarkup(batterySeam), seam: batterySeam };
    const head: RobotSolid = { paths: box(place, HEAD.plan, HEAD.z0, HEAD.h, 0.5), tone: 'mid', seam: '' };
    const lens: RobotSolid = { paths: discAlong(place.point([34, 0, 2]), place.axis([1, 0, 0]), 2.6, 1.6, P, 24), tone: 'mid', seam: '' };
    const middle = (point: Point3) => depthOf(place.point(point), P);
    const body = [
      { solid: shell, key: middle([0, 0, 1]) },
      { solid: battery, key: middle([-3, 0, 7.3]) },
      { solid: head, key: middle([30.5, 0, 2]) },
      { solid: lens, key: middle([35, 0, 2]) },
    ]
      .sort((a, b) => a.key - b.key)
      .map(({ solid }) => solid);
    const far = sideLegs(true);
    const near = sideLegs(false);
    return { far, body, near, all: [...far, ...body, ...near] };
  }

  /** The hatch on the robot's back and its screws; nothing once its back turns away from the viewer. */
  function hatch(pose: RobotPose): { outline: string; screws: Flat[] } {
    const place = placer(pose);
    const up = place.axis([0, 0, 1]);
    if (up[0] * V[0] + up[1] * V[1] + up[2] * V[2] < 0.05) return { outline: '', screws: [] };
    const plan = insetPlan(BODY.plan, 3.2);
    const top = BODY.z0 + BODY.h;
    const ringPoints = roundPlan(plan, 4).map(([x, y]) => at(place.point([x, y, top])));
    const screws = [-21, 21].flatMap((x) => [-3.6, 3.6].map((y) => at(place.point([x, y, top]))));
    return { outline: pathOf(ringPoints, true), screws };
  }

  // ---------------------------------------------------------------- the treadmill
  /** The treadmill behind the robot: end housings, deck, rollers and the far rail. */
  function treadmillBack(): RigPart[] {
    const list: RigPart[] = [];
    for (const x of [DECK.x0 - 6, DECK.x1]) {
      const housing: Plan = { x: o[0] + x, y: o[1] - DECK.half - 3, w: 6, d: 2 * DECK.half + 6, r: 1.2 };
      list.push({ kind: 'solid', paths: slabOf(housing, o[2], DECK_Z[1] - 1, P, 3, 0.5), tone: 'mid', inner: seamMarkup(sideSeam(housing, o[2] + 3, P, 3)) });
      list.push({ kind: 'dots', points: [-DECK.half - 1.4, DECK.half + 1.4].map((y) => at(w(x + 3, y, DECK_Z[1] - 1))), size: 0.42, tone: 'mid' });
    }
    list.push({
      kind: 'solid',
      paths: slabOf({ x: o[0] + DECK.x0, y: o[1] - DECK.half, w: DECK.x1 - DECK.x0, d: 2 * DECK.half, r: 0.6 }, o[2] + DECK_Z[0], DECK_Z[1] - DECK_Z[0], P, 2, 0.4),
      tone: 'mid',
    });
    for (const x of [DECK.x0 - 1.8, DECK.x1 + 1.8]) {
      list.push({ kind: 'solid', paths: discAlong(w(x, -DECK.half, DECK_Z[1] - ROLLER_R), [0, 1, 0], ROLLER_R, 2 * DECK.half, P, 28), tone: 'lo' });
    }
    return list;
  }

  /** The far rail, drawn after the belt and before the robot. */
  function farRail(): RigPart[] {
    return [
      {
        kind: 'solid',
        paths: slabOf({ x: o[0] + DECK.x0 - 6, y: o[1] - DECK.half - RAIL.thick, w: DECK.x1 - DECK.x0 + 12, d: RAIL.thick, r: 0.5 }, o[2] + DECK_Z[1], RAIL.height, P, 2, 0.3),
        tone: 'mid',
      },
    ];
  }

  /** The near rail with its screws and the drive motor at the front end, drawn after the robot. */
  function treadmillFront(): RigPart[] {
    const list: RigPart[] = [];
    list.push({
      kind: 'solid',
      paths: slabOf({ x: o[0] + DECK.x0 - 6, y: o[1] + DECK.half, w: DECK.x1 - DECK.x0 + 12, d: RAIL.thick, r: 0.5 }, o[2] + DECK_Z[1], RAIL.height, P, 2, 0.3),
      tone: 'mid',
    });
    list.push({
      kind: 'dots',
      points: Array.from({ length: 5 }, (_, i) => at(w(DECK.x0 + 4 + i * 21, DECK.half + RAIL.thick / 2, DECK_Z[1] + RAIL.height))),
      size: 0.42,
      tone: 'mid',
    });
    list.push({ kind: 'solid', paths: discAlong(w(DECK.x1 + 3, DECK.half + 3, DECK_Z[1] - ROLLER_R), [0, 1, 0], 4.6, 7, P, 32, 0.4), tone: 'mid' });
    list.push({ kind: 'solid', paths: discAlong(w(DECK.x1 + 3, DECK.half + 10, DECK_Z[1] - ROLLER_R), [0, 1, 0], 3.0, 2.4, P, 24), tone: 'mid' });
    return list;
  }

  /** The belt's band on the deck, under its slats. */
  const beltBand = planOutline({ x: o[0] + DECK.x0, y: o[1] - DECK.half, w: DECK.x1 - DECK.x0, d: 2 * DECK.half, r: 0 }, o[2] + BELT_Z, P, 1);

  /** The belt's slats when the belt has moved `travel` mm back. */
  function beltSlats(travel: number): string {
    const offset = ((travel % SLAT_PITCH) + SLAT_PITCH) % SLAT_PITCH;
    const lines: string[] = [];
    for (let x = DECK.x1 - offset; x > DECK.x0 + 0.05; x -= SLAT_PITCH) {
      lines.push(lineOnTop([o[0] + x, o[1] - DECK.half], [o[0] + x, o[1] + DECK.half], o[2] + BELT_Z, P));
    }
    return lines.join('');
  }

  /** The middle of the drive motor's end cap, where a cable leaves. */
  const motorCapPoint = w(DECK.x1 + 3, DECK.half + 12.4, DECK_Z[1] - ROLLER_R);

  return { robot, hatch, treadmillBack, farRail, treadmillFront, beltBand, beltSlats, motorCapPoint, at, w };
}

/** A rounded rectangle's outline on the floor plane, as the kit's roundedPlan, without its import cycle. */
function roundPlan({ x, y, w, d, r }: Plan, steps: number): Array<[number, number]> {
  const radius = Math.max(0, Math.min(r, w / 2, d / 2));
  const corners: Array<[number, number, number]> = [
    [x + w - radius, y + radius, -Math.PI / 2],
    [x + w - radius, y + d - radius, 0],
    [x + radius, y + d - radius, Math.PI / 2],
    [x + radius, y + radius, Math.PI],
  ];
  const out: Array<[number, number]> = [];
  for (const [cx, cy, start] of corners) {
    for (let step = 0; step <= steps; step++) {
      const angle = start + (step / steps) * (Math.PI / 2);
      out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return out;
}

/** Screen offset (a translate) between two world points: how far a part moved on screen. */
export function shiftBetween(P: Projection, from: Point3, to: Point3): string {
  const a = iso(from, P);
  const b = iso(to, P);
  const r2 = (value: number) => Math.round(value * 100) / 100;
  return `translate(${r2(b[0] - a[0])} ${r2(b[1] - a[1])})`;
}
