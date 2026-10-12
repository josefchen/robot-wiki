/**
 * The node bench for Ros2Interfaces, drawn with the isometric kit.
 *
 * The object is the explanation: two node cabinets on one bench, joined
 * three ways, one per way ROS 2 nodes talk.
 *
 * - In front, a topic: a conveyor that carries picture cards out of the
 *   sender and into the receiver, one after another, and never brings
 *   anything back.
 * - In the middle, a service: a message duct with a window, through which a
 *   question capsule travels to the receiver and an answer capsule comes
 *   back.
 * - At the back, an action: a cable-drawn shuttle carries the job out to the
 *   receiver, and three flags on the sender rise as progress comes back,
 *   the last one when the job is done; a cancel lever sits on the sender's
 *   front, ready to call the job off.
 *
 * World units are about a millimetre: x along the bench (the sender is at
 * -x, the receiver at +x), y across it (toward the viewer is +y), z up.
 * Every static path is built here once; the moving tokens (cards, capsules,
 * the shuttle and the flags) are built at rest and moved with `shiftBy`.
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
  segment,
  sideArc,
  sideRing,
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

export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 56;

export type Lane = 'topic' | 'service' | 'action';
export type Group = 'static' | 'cards' | 'request' | 'reply' | 'shuttle' | 'flag-0' | 'flag-1' | 'flag-2';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; halo?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'fill'; group: Group; d: string; shade: number }
  | { kind: 'token'; group: Group; lane: Lane; index: number; parts: Part[] };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -186, y: -60, w: 372, d: 112, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;

/** The two node cabinets: the sender at -x, the receiver at +x. */
const CAB_H = 92;
const SENDER: Plan = { x: -172, y: -52, w: 48, d: 90, r: 3 };
const RECEIVER: Plan = { x: 124, y: -52, w: 48, d: 90, r: 3 };
/** The faces the three links run between. */
export const FROM_X = SENDER.x + SENDER.w;
export const TO_X = RECEIVER.x;

/** The topic conveyor, in front: bed, belt and guards, the cards upright on the belt. */
const CONVEYOR_Y = 26;
const BELT_Z = 16;
const CARD_W = 17;
const CARD_H = 23;
/** Where the cards stand along the belt when the stream is drawn, lead card last. */
export const CARD_SLOTS = [-88, -44, 0, 44] as const;
/** How far a card travels from inside the sender to inside the receiver. */
export const CARD_RUN = { from: FROM_X - 20, to: TO_X + 24 } as const;

/** The service duct, in the middle, with a window along its front. */
const DUCT: Plan = { x: FROM_X, y: -9, w: TO_X - FROM_X, d: 14, r: 1.5 };
const DUCT_Z = 40;
const DUCT_H = 17;
const WINDOW = { x0: FROM_X + 22, x1: TO_X - 22, z0: DUCT_Z + 2.4, z1: DUCT_Z + DUCT_H - 2.4 };
const WINDOW_Y = DUCT.y + DUCT.d;
/** The capsules ride inside the duct, centred on its axis. */
const CAPSULE_W = 20;
const CAPSULE_Z0 = WINDOW.z0;
const CAPSULE_Z1 = WINDOW.z0 + 8;
/** Where each capsule rests when the exchange is drawn: the question at the receiver's end, the answer at the sender's. */
export const CAPSULE_REST = { request: WINDOW.x1 - 18, reply: WINDOW.x0 + 18 } as const;

/** The action rail, at the back, with its shuttle and the sender's three flags. */
const RAIL: Plan = { x: FROM_X, y: -40, w: TO_X - FROM_X, d: 8, r: 1.5 };
const RAIL_Z = 64;
const RAIL_H = 6;
/** Where the shuttle stands: at the sender while the goal is written, at the receiver while the job runs. */
export const SHUTTLE_HOME = FROM_X + 24;
export const SHUTTLE_AWAY = TO_X - 24;
const POLE_Y = [-34, -18, -2] as const;
const POLE_X = SENDER.x + 14;
const POLE_H = 46;
/** How far a flag climbs its pole when its message arrives. */
export const FLAG_RISE = 28;

const LABEL: Plan = { x: 62, y: 40, w: 50, d: 9, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
for (const plan of [SENDER, RECEIVER]) extremes.push([plan.x, plan.y, CAB_H + 6], [plan.x + plan.w, plan.y, CAB_H + 6]);
extremes.push([POLE_X, POLE_Y[0], CAB_H + POLE_H + 4]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The screen offset that moves a group built at rest by a world offset. */
export const shiftBy = (dx = 0, dy = 0, dz = 0) => translateAlong(P, [dx, dy, dz]);

/** A closed rectangle on the vertical face y = `y`. */
const faceRectY = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);
/** A closed rectangle on the vertical face x = `x`. */
const faceRectX = (y0: number, y1: number, z0: number, z1: number, x: number) =>
  pathOf([at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])], true);
/** A closed rounded slot on the face y = `y`, upright: a vent. */
function faceSlot(x0: number, x1: number, z0: number, z1: number, y: number) {
  const r = Math.min((z1 - z0) / 2, (x1 - x0) / 2);
  const points: Flat[] = [];
  const arc = (cx: number, cz: number, from: number) => {
    for (let step = 0; step <= 6; step++) {
      const angle = from + (step / 6) * Math.PI;
      points.push(at([cx + r * Math.cos(angle), y, cz + r * Math.sin(angle)]));
    }
  };
  arc((x0 + x1) / 2, z1 - r, 0);
  arc((x0 + x1) / 2, z0 + r, Math.PI);
  return pathOf(points, true);
}

// ---------------------------------------------------------------- tokens
/** One picture card on the topic belt, its centre at `x`: a stand, the card and its picture. */
export function cardParts(group: Group, x: number, lit: boolean, frame: number): Part[] {
  const face = CONVEYOR_Y + 1;
  const parts: Part[] = [];
  parts.push({ kind: 'solid', group, paths: slab({ x: x - 9, y: CONVEYOR_Y - 4.5, w: 18, d: 9, r: 1 }, BELT_Z, 3, 2, 0.3), tone: 'mid' });
  parts.push({ kind: 'solid', group, paths: slab({ x: x - CARD_W / 2, y: CONVEYOR_Y - 1, w: CARD_W, d: 2, r: 0.4 }, BELT_Z + 3, CARD_H, 2), tone: 'hi', lit });
  const left = x - CARD_W / 2 + 1.8;
  const right = x + CARD_W / 2 - 1.8;
  const bottom = BELT_Z + 3 + 5.5;
  const top = BELT_Z + 3 + CARD_H - 1.8;
  parts.push({ kind: 'line', group, d: faceRectY(left, right, bottom, top, face), tone: lit ? 'mid' : 'lo' });
  const ground = bottom + 3.4;
  parts.push({ kind: 'line', group, d: pathOf([at([left, face, ground]), at([right, face, ground])]), tone: 'lo' });
  parts.push({ kind: 'line', group, d: pathOf([[right - 8, ground], [right - 4.8, ground + 4.4], [right - 2.6, ground + 2.8], [right, ground + 4.6]].map(([u, v]) => at([u, face, v]))), tone: 'lo' });
  const sun = left + 3 + ((frame * 2.3) % (right - left - 6));
  parts.push({ kind: 'line', group, d: sideRing([sun, face, top - 3.4], 1.5, 'y', P, 16), tone: lit ? 'lit' : 'mid' });
  return parts;
}

/** One capsule inside the service duct, its centre at `x`. */
export function capsuleParts(group: Group, x: number, lit: boolean, banded: boolean): Part[] {
  const parts: Part[] = [];
  const plan: Plan = { x: x - CAPSULE_W / 2, y: -6, w: CAPSULE_W, d: 10, r: 4.6 };
  parts.push({ kind: 'solid', group, paths: slab(plan, CAPSULE_Z0, CAPSULE_Z1 - CAPSULE_Z0, 6, 0.5), tone: 'hi', lit });
  // A band round each end cap; the answer capsule carries a second band in its middle.
  const bands = banded ? [-5.4, 0, 5.4] : [-5.4, 5.4];
  for (const dx of bands) parts.push({ kind: 'line', group, d: segment([x + dx, 4, CAPSULE_Z0], [x + dx, 4, CAPSULE_Z1], P), tone: lit ? 'mid' : 'lo' });
  return parts;
}

/** The shuttle on the action rail, built at the sender's end, carrying the job box. */
function shuttleParts(lit: boolean): Part[] {
  const x = SHUTTLE_HOME;
  const parts: Part[] = [];
  const truck: Plan = { x: x - 13, y: RAIL.y - 3, w: 26, d: RAIL.d + 6, r: 2 };
  parts.push({ kind: 'solid', group: 'shuttle', paths: slab(truck, RAIL_Z + 2, RAIL_H + 2, 3, 0.5), tone: 'mid' });
  parts.push({ kind: 'dots', group: 'shuttle', points: [at([x - 9, truck.y + 3, RAIL_Z + RAIL_H + 4]), at([x + 9, truck.y + truck.d - 3, RAIL_Z + RAIL_H + 4])], size: 0.45 });
  const box: Plan = { x: x - 9, y: RAIL.y - 1, w: 18, d: RAIL.d + 2, r: 1.2 };
  parts.push({ kind: 'solid', group: 'shuttle', paths: slab(box, RAIL_Z + RAIL_H + 4, 12, 3, 0.6), tone: 'hi', lit, inner: '' });
  parts.push({ kind: 'line', group: 'shuttle', d: sideSeam(box, RAIL_Z + RAIL_H + 12, P, 3), tone: 'faint' });
  parts.push({ kind: 'line', group: 'shuttle', d: planOutline(insetPlan(box, 2.4), RAIL_Z + RAIL_H + 16, P, 2), tone: lit ? 'mid' : 'faint' });
  return parts;
}

/** Flag `k` on its pole on the sender's top, built at the bottom of the pole. */
function flagParts(k: number, lit: boolean): Part[] {
  const group = `flag-${k}` as Group;
  const y = POLE_Y[k];
  const z = CAB_H + 6;
  const flag: Plan = { x: POLE_X + 2, y: y - 0.6, w: 20, d: 1.2, r: 0.3 };
  const parts: Part[] = [];
  parts.push({ kind: 'solid', group, paths: slab(flag, z, 13, 2), tone: 'hi', lit });
  parts.push({ kind: 'solid', group, paths: cyl(POLE_X, y, 2.2, z - 1, 15, 16), tone: 'mid' });
  return parts;
}

// ---------------------------------------------------------------- scene
export interface BenchState {
  lane: Lane;
  /** The index of the lit message (the one just sent or arrived). */
  lit: number;
}

/** How many messages each way of talking sends. */
export const MESSAGES: Record<Lane, number> = { topic: 4, service: 2, action: 4 };

/**
 * Everything drawn for the bench, with `lane` the way of talking picked.
 * Only the picked lane's tokens carry a message index; the token of message
 * `lit` is the one lit part.
 */
export function sceneOf({ lane, lit }: BenchState): Part[] {
  const parts: Part[] = [];
  const put = (part: Part) => parts.push(part);
  const tokenOf = (laneOf: Lane, index: number, group: Group, list: Part[]): Part => ({ kind: 'token', group, lane: laneOf, index: laneOf === lane ? index : -1, parts: list });

  // Base: a plate on four turned feet, with a groove and corner screws.
  put({ kind: 'line', group: 'static', d: slab(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H).fill, tone: 'faint' });
  for (const [x, y] of byDepth([
    [BASE.x + 26, BASE.y + 18],
    [BASE.x + BASE.w - 26, BASE.y + 18],
    [BASE.x + 26, BASE.y + BASE.d - 18],
    [BASE.x + BASE.w - 26, BASE.y + BASE.d - 18],
  ])) {
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.6), tone: 'lo' });
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6), tone: 'mid' });
  }
  put({ kind: 'solid', group: 'static', paths: slab(BASE, -BASE_H, BASE_H, 8, 1.6), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(BASE, 5), 0, P), tone: 'faint' });
  const screws: Array<[number, number]> = [
    [BASE.x + 10, BASE.y + 10],
    [BASE.x + BASE.w - 10, BASE.y + 10],
    [BASE.x + 10, BASE.y + BASE.d - 10],
    [BASE.x + BASE.w - 10, BASE.y + BASE.d - 10],
  ];
  put({ kind: 'line', group: 'static', d: screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: screws.map(([x, y]) => at([x, y, 0])), size: 0.55 });

  // The sender's cabinet: plinth, body with seams, door, vents, lamp and its three link ports.
  cabinet(put, SENDER, 'sender');
  // Its three flag poles, each with a flag that climbs it as progress comes back.
  for (let k = 0; k < 3; k++) {
    put({ kind: 'solid', group: 'static', paths: cyl(POLE_X, POLE_Y[k], 3.4, CAB_H, 2, 20), tone: 'mid' });
    put({ kind: 'solid', group: 'static', paths: cyl(POLE_X, POLE_Y[k], 1.2, CAB_H + 2, POLE_H - 2, 12), tone: 'mid' });
    put({ kind: 'solid', group: 'static', paths: cyl(POLE_X, POLE_Y[k], 1.9, CAB_H + POLE_H, 1.6, 12), tone: 'mid' });
    put(tokenOf('action', k + 1, `flag-${k}` as Group, flagParts(k, lane === 'action' && lit === k + 1)));
  }

  // The action rail at the back: a middle post, the rail, the cable and the shuttle.
  put({ kind: 'solid', group: 'static', paths: cyl(0, RAIL.y + RAIL.d / 2, 7, 0, 3, 24, 0.5), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(0, RAIL.y + RAIL.d / 2, 3.2, 3, RAIL_Z - 3, 24), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: sideArc(0, RAIL.y + RAIL.d / 2, 3.2, 30, P, 16), tone: 'faint' });
  put({ kind: 'solid', group: 'static', paths: slab(RAIL, RAIL_Z, RAIL_H, 3, 0.5), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: onTop([[RAIL.x, RAIL.y + 2], [RAIL.x + RAIL.w, RAIL.y + 2]], RAIL_Z + RAIL_H, P), tone: 'lo' });
  put({ kind: 'line', group: 'static', d: onTop([[RAIL.x, RAIL.y + RAIL.d - 2], [RAIL.x + RAIL.w, RAIL.y + RAIL.d - 2]], RAIL_Z + RAIL_H, P), tone: 'lo' });
  // The cable that draws the shuttle: off the sender's pulley, along the rail and into the receiver.
  put({
    kind: 'wire',
    group: 'static',
    from: at([FROM_X - 6, RAIL.y + RAIL.d / 2, CAB_H + 3.2]),
    via: [at([FROM_X + 2, RAIL.y + RAIL.d / 2, RAIL_Z + RAIL_H + 0.8])],
    to: at([TO_X + 4, RAIL.y + RAIL.d / 2, RAIL_Z + RAIL_H + 0.8]),
    tone: 'lo',
  });
  put(tokenOf('action', 0, 'shuttle', shuttleParts(lane === 'action' && lit === 0)));

  // The service duct in the middle: two hangers, the duct with its window, the capsules seen through it.
  for (const x of [-56, 56]) {
    put({ kind: 'solid', group: 'static', paths: cyl(x, DUCT.y + DUCT.d / 2, 6.5, 0, 3, 24, 0.5), tone: 'lo' });
    put({ kind: 'solid', group: 'static', paths: cyl(x, DUCT.y + DUCT.d / 2, 2.8, 3, DUCT_Z - 3, 20), tone: 'mid' });
  }
  put({ kind: 'solid', group: 'static', paths: slab(DUCT, DUCT_Z, DUCT_H, 3, 0.8), tone: 'mid' });
  // The window: the duct's dark inside, its sill and left jamb, the capsules, then the frame.
  put({ kind: 'fill', group: 'static', d: faceRectY(WINDOW.x0, WINDOW.x1, WINDOW.z0, WINDOW.z1, WINDOW_Y), shade: 0 });
  put({ kind: 'fill', group: 'static', d: pathOf([at([WINDOW.x0, WINDOW_Y, WINDOW.z0]), at([WINDOW.x1, WINDOW_Y, WINDOW.z0]), at([WINDOW.x1, WINDOW_Y - 11, WINDOW.z0]), at([WINDOW.x0, WINDOW_Y - 11, WINDOW.z0])], true), shade: 3 });
  put(tokenOf('service', 0, 'request', capsuleParts('request', CAPSULE_REST.request, lane === 'service' && lit === 0, false)));
  put(tokenOf('service', 1, 'reply', capsuleParts('reply', CAPSULE_REST.reply, lane === 'service' && lit === 1, true)));
  put({ kind: 'line', group: 'static', d: faceRectY(WINDOW.x0, WINDOW.x1, WINDOW.z0, WINDOW.z1, WINDOW_Y), tone: 'lo' });
  // Clamp bands where the hangers hold the duct.
  for (const x of [-56, 56]) {
    const band: Plan = { x: x - 2, y: DUCT.y - 0.8, w: 4, d: DUCT.d + 1.6, r: 0.6 };
    put({ kind: 'solid', group: 'static', paths: slab(band, DUCT_Z - 0.8, DUCT_H + 1.6, 2, 0.3), tone: 'mid' });
    put({ kind: 'dots', group: 'static', points: [at([x, DUCT.y + DUCT.d / 2, DUCT_Z + DUCT_H + 0.8])], size: 0.45 });
  }

  // The topic conveyor in front: legs, bed, belt, the cards, then the front guard.
  for (const x of [-100, 0, 100]) {
    put({ kind: 'solid', group: 'static', paths: cyl(x, CONVEYOR_Y, 2.6, 0, 9, 16), tone: 'mid' });
  }
  const bed: Plan = { x: FROM_X, y: CONVEYOR_Y - 11, w: TO_X - FROM_X, d: 22, r: 1.5 };
  put({ kind: 'solid', group: 'static', paths: slab(bed, 9, BELT_Z - 10, 3, 0.4), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: FROM_X, y: CONVEYOR_Y - 9, w: TO_X - FROM_X, d: 18, r: 0.8 }, BELT_Z - 1, 1, 2), tone: 'lo', crease: 'none' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: FROM_X, y: CONVEYOR_Y - 11, w: TO_X - FROM_X, d: 2.2, r: 0.6 }, BELT_Z, 3, 2, 0.3), tone: 'mid' });
  const cards: Part[] = [];
  // The lead card left the sender first: it carries message 0, the card just out of the sender the last.
  CARD_SLOTS.forEach((x, slot) => {
    const message = CARD_SLOTS.length - 1 - slot;
    cards.push(tokenOf('topic', message, 'cards', cardParts('cards', x, lane === 'topic' && lit === message, slot)));
  });
  for (const card of cards) put(card);
  put({ kind: 'solid', group: 'static', paths: slab({ x: FROM_X, y: CONVEYOR_Y + 8.8, w: TO_X - FROM_X, d: 2.2, r: 0.6 }, BELT_Z - 6, 9, 2, 0.3), tone: 'mid' });
  // Roller ends on the guard's face, and the belt's drive motor under the bed at the receiver.
  for (const x of [FROM_X + 6, TO_X - 6]) put({ kind: 'line', group: 'static', d: sideRing([x, CONVEYOR_Y + 11, BELT_Z - 1.5], 2.4, 'y', P, 18), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: [FROM_X + 6, TO_X - 6].map((x) => at([x, CONVEYOR_Y + 11, BELT_Z - 1.5])), size: 0.5 });

  // The receiver's cabinet, with its link ports hidden on its far side.
  cabinet(put, RECEIVER, 'receiver');

  // A label plate on the base, with three engraved rules.
  put({ kind: 'solid', group: 'static', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
  put({
    kind: 'line',
    group: 'static',
    d: [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 2.6 + row * 2.4], [LABEL.x + (row === 1 ? 30 : 44), LABEL.y + 2.6 + row * 2.4]], 0.8, P)).join(''),
    tone: 'lo',
    free: true,
  });
  put({ kind: 'dots', group: 'static', points: [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], size: 0.5 });

  return parts;
}

/** A node cabinet: plinth, body with a lid seam, front door, vents, a lamp, and for the sender its ports and cancel lever. */
function cabinet(put: (part: Part) => void, plan: Plan, role: 'sender' | 'receiver') {
  const plinth = insetPlan(plan, -2);
  put({ kind: 'solid', group: 'static', paths: slab(plinth, 0, 5, 4, 0.6), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: slab(plan, 5, CAB_H - 5, 6, 1.2), tone: 'mid', inner: '' });
  put({ kind: 'line', group: 'static', d: sideSeam(plan, CAB_H - 9, P, 6), tone: 'faint' });
  const front = plan.y + plan.d;
  // The door on the front face, its hinge side, handle and vents.
  const x0 = plan.x + 5;
  const x1 = plan.x + plan.w - 5;
  put({ kind: 'line', group: 'static', d: faceRectY(x0, x1, 12, CAB_H - 14, front), tone: 'lo' });
  for (let k = 0; k < 4; k++) put({ kind: 'line', group: 'static', d: faceSlot(x0 + 6 + k * 6, x0 + 8.6 + k * 6, 18, 32, front), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: x1 - 7, y: front, w: 3.2, d: 2.6, r: 0.6 }, 40, 16, 2, 0.3), tone: 'mid' });
  put({ kind: 'dots', group: 'static', points: [at([x0 + 2, front, 16]), at([x0 + 2, front, CAB_H - 18]), at([x1 - 2, front, 16]), at([x1 - 2, front, CAB_H - 18])], size: 0.45 });
  // The status lamp and the screws on the lid.
  put({ kind: 'solid', group: 'static', paths: cyl(plan.x + plan.w - 10, front - 10, 3.6, CAB_H, 2.4, 20), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(plan.x + plan.w - 10, front - 10, 2.4, CAB_H + 2.4, 2.4, 20, 0.3), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(plan, 3.2), CAB_H, P, 6), tone: 'faint' });
  if (role === 'sender') {
    const face = plan.x + plan.w;
    // The link ports on the sender's inner face: the belt's exit slot, the duct's collar, the rail's bracket.
    put({ kind: 'line', group: 'static', d: faceRectX(CONVEYOR_Y - 9.5, CONVEYOR_Y + 8.5, BELT_Z - 1, BELT_Z + 24, face), tone: 'lo' });
    put({ kind: 'solid', group: 'static', paths: slab({ x: face, y: DUCT.y - 4, w: 6, d: DUCT.d + 8, r: 1.2 }, DUCT_Z - 4, DUCT_H + 8, 3, 0.5), tone: 'mid' });
    put({ kind: 'dots', group: 'static', points: [at([face + 3, DUCT.y - 2, DUCT_Z + DUCT_H + 4]), at([face + 3, DUCT.y + DUCT.d + 2, DUCT_Z + DUCT_H + 4])], size: 0.45 });
    put({ kind: 'solid', group: 'static', paths: slab({ x: face, y: RAIL.y - 4, w: 8, d: RAIL.d + 8, r: 1.2 }, RAIL_Z - 4, RAIL_H + 8, 3, 0.5), tone: 'mid' });
    // The shuttle cable's pulley on the lid.
    put({ kind: 'solid', group: 'static', paths: cyl(face - 6, RAIL.y + RAIL.d / 2, 5.4, CAB_H, 3.2, 24, 0.4), tone: 'mid' });
    put({ kind: 'line', group: 'static', d: knurl(face - 6, RAIL.y + RAIL.d / 2, 5.4, CAB_H, CAB_H + 3.2, 16, P), tone: 'faint' });
    // The cancel lever on the front, beside the door: a boss, the arm and its knob.
    const lx = plan.x + plan.w - 13;
    put({ kind: 'solid', group: 'static', paths: slab({ x: lx - 4, y: front, w: 8, d: 3, r: 1 }, 62, 10, 2, 0.4), tone: 'mid' });
    put({ kind: 'solid', group: 'static', paths: slab({ x: lx - 1.4, y: front + 1, w: 2.8, d: 9, r: 0.6 }, 66, 2.6, 2), tone: 'mid' });
    put({ kind: 'solid', group: 'static', paths: cyl(lx, front + 10.5, 2.6, 64, 7, 16, 0.3), tone: 'hi' });
  } else {
    // The receiver's lid: a vent grille of closed slots over its drives.
    for (let k = 0; k < 5; k++) put({ kind: 'line', group: 'static', d: planOutline({ x: plan.x + 8 + k * 6, y: plan.y + 10, w: 2.6, d: 30, r: 1.3 }, CAB_H, P, 3), tone: 'lo' });
  }
}

/**
 * Clip for the cards: a card shows only where it has come out of the sender's
 * face and before it goes into the receiver. Built in the plane of the cards'
 * faces, so the cut lies on the sender's exit slot.
 */
export const CARD_CLIP = (() => {
  const y = CONVEYOR_Y + 1;
  const corners: Array<[number, number]> = [[FROM_X, -40], [TO_X + 60, -40], [TO_X + 60, 200], [FROM_X, 200]];
  return pathOf(corners.map(([x, z]) => at([x, y, z])), true);
})();
/** Clip for the capsules: the duct's window, in its own plane. */
export const WINDOW_CLIP = faceRectY(WINDOW.x0, WINDOW.x1, WINDOW.z0, WINDOW.z1, WINDOW_Y);

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
