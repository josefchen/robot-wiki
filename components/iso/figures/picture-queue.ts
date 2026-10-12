/**
 * The picture queue for QosQueueAge, drawn with the isometric kit.
 *
 * The object is the explanation: a camera on a carriage drops each picture
 * it takes, as a card in a stand, into a channel; an indexer walks the row
 * of cards one slot along per camera frame, and at the far end a small
 * gantry on the model's housing lifts the oldest card out and feeds it into
 * the model's reader slot. The camera stands as many slots from the model as
 * the queue keeps pictures, so the card the model is handed is that many
 * frames old, and the camera carriage's pointer reads that age on the ruler
 * in front (one tick a frame, a long tick every tenth of a second).
 *
 * Every card shows one frame of the same scene, a ball bouncing, so the row
 * reads as a film strip: the newest card under the camera shows the ball
 * where it is now, the card the model holds shows it where it was.
 *
 * World units are about a millimetre: x along the channel (the model's end
 * is +x), y across the bench (toward the viewer is +y), z up. The scene is
 * built once per queue depth and newest frame; the moving groups (the row,
 * the dropping card, the picked card, the gantry head and its gripper) are
 * built at rest and moved with `shiftBy`.
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
export const HEIGHT = 320;
export const AZIMUTH = 64;

/** One slot of the channel: the distance the row moves per camera frame. */
export const PITCH = 24;
/** The most pictures the channel can queue. */
export const SLOTS = 10;
/** The model's end stop: slot 1 is the slot against it. */
const STOP_X = 120;
/** The centre of slot `k` (1 = the oldest picture, against the model, where the gantry picks). */
export const slotX = (k: number) => STOP_X - (k - 0.5) * PITCH;
/**
 * The camera drops each new picture into the feed slot just upstream of
 * the queue, slot depth + 1, so the scale reads `k` frames at slot k + 1 and
 * its zero sits on the pick slot: a card loaded k slots from the pick slot
 * is k frames old when the gantry lifts it.
 */
export const scaleX = (frames: number) => slotX(frames + 1);

/** How far the gantry has lifted the oldest card out of the row in the still pose. */
export const LIFT = 32;

export type Group = 'static' | 'row' | 'drop' | 'picked' | 'head' | 'grip';

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; halo?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'card'; group: Group; frame: number; age: number; used: boolean; parts: Part[] };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -184, y: -44, w: 408, d: 76, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;

/** The channel the cards stand in: a bed, two lips, an end block and the indexer's drive block. */
const BED: Plan = { x: -164, y: -11, w: 284, d: 22, r: 2 };
const BED_H = 4;
const LIP_H = 5;
const BACK_LIP: Plan = { x: -164, y: -11, w: 284, d: 4.5, r: 1 };
const FRONT_LIP: Plan = { x: -164, y: 6.5, w: 284, d: 4.5, r: 1 };
const DRIVE: Plan = { x: STOP_X, y: -14, w: 22, d: 28, r: 2.5 };
const END_BLOCK: Plan = { x: -176, y: -14, w: 12, d: 28, r: 2.5 };

/** A card: its stand in the channel and the upright picture card, face toward the viewer. */
const STAND_Z = BED_H;
const STAND_H = 4;
const CARD_Z = STAND_Z + STAND_H;
const CARD_W = 19;
const CARD_T = 2;
const CARD_H = 28;
export const CARD_TOP = CARD_Z + CARD_H;

/** The front rail the camera carriage rides on; its front face carries the age scale. */
const RAIL: Plan = { x: -166, y: 15, w: 304, d: 8, r: 1.5 };
const RAIL_H = 8;
const RAIL_FACE = RAIL.y + RAIL.d;

/** The model's housing at the +x end, with the reader slot on top. */
const HOUSING: Plan = { x: 150, y: -30, w: 64, d: 42, r: 4 };
const HOUSING_H = 38;
/** Where the model's reader slot is, along x: the gantry carries the card there. */
export const READER_X = 176;
const READER_SLOT: Plan = { x: READER_X - 12, y: -2.2, w: 24, d: 4.4, r: 1 };
/** How far the card drops once the gripper lets it go over the reader slot: all the way in. */
export const FED_Z = HOUSING_H - CARD_TOP - 6;
/** Where the gripper lets the card go: its jaws just above the housing's top. */
export const RELEASE_Z = HOUSING_H + 4.2 - CARD_TOP;

/** The gantry over slot 1: a post behind the channel, one on the housing, the rail between. */
const GANTRY_Y = -27;
const GANTRY_Z = 84;
const POST_X = 70;
const GANTRY_RAIL: Plan = { x: POST_X - 4, y: GANTRY_Y - 3.5, w: 144, d: 7, r: 1.5 };

/** The camera, hung over the feed slot from a column on its carriage. */
const CHUTE_Z = 39;
const BODY_Z = 42;
const BODY_H = 16;

const LABEL: Plan = { x: 160, y: 17, w: 50, d: 10, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([GANTRY_RAIL.x, GANTRY_Y - 6, GANTRY_Z + 10], [GANTRY_RAIL.x + GANTRY_RAIL.w, GANTRY_Y - 6, GANTRY_Z + 6]);
extremes.push([scaleX(SLOTS) - 30, -13, BODY_Z + BODY_H + 6]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 12, azimuth: AZIMUTH });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** The screen offset that moves a group built at rest by a world offset. */
export const shiftBy = (dx = 0, dy = 0, dz = 0) => translateAlong(P, [dx, dy, dz]);

/** A closed rounded slot on the vertical face y = `y`, from x0 to x1 and z0 to z1: a vent. */
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

/** A closed rectangle on the vertical face y = `y`. */
const faceRect = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

// ----------------------------------------------------------------- cards
/** Where the ball sits in frame `frame`'s picture: across the window and above the ground, in mm. */
export function ballAt(frame: number): { u: number; v: number } {
  return { u: 4 * Math.sin((2 * Math.PI * frame) / 40), v: 9.4 * Math.abs(Math.sin((Math.PI * frame) / 10)) };
}

/**
 * The parts of one picture card centred at `x`: its stand, the upright card
 * and the picture printed on its face, an instant print with a deeper border
 * along the bottom. `z` lifts the whole card out of the channel.
 */
export function cardParts(group: Group, x: number, frame: number, lit: boolean): Part[] {
  const parts: Part[] = [];
  const face = CARD_T / 2;
  const stand: Plan = { x: x - 10.5, y: -5.4, w: 21, d: 10.8, r: 1.2 };
  parts.push({ kind: 'solid', group, paths: slab(stand, STAND_Z, STAND_H, 3, 0.4), tone: 'mid' });
  parts.push({ kind: 'line', group, d: planOutline({ x: x - CARD_W / 2 - 0.9, y: -face - 0.9, w: CARD_W + 1.8, d: CARD_T + 1.8, r: 0.6 }, CARD_Z, P, 2), tone: 'faint' });
  parts.push({
    kind: 'solid',
    group,
    paths: slab({ x: x - CARD_W / 2, y: -face, w: CARD_W, d: CARD_T, r: 0.4 }, CARD_Z, CARD_H, 2),
    tone: 'hi',
    lit,
  });
  // The print: a picture window inside a border, the ground and the ball.
  const left = x - CARD_W / 2 + 2;
  const right = x + CARD_W / 2 - 2;
  const bottom = CARD_Z + 7.5;
  const top = CARD_Z + CARD_H - 2;
  const ground = bottom + 4.2;
  const ball = ballAt(frame);
  parts.push({ kind: 'line', group, d: faceRect(left, right, bottom, top, face), tone: lit ? 'mid' : 'lo' });
  parts.push({ kind: 'line', group, d: pathOf([at([left, face, ground]), at([right, face, ground])]), tone: 'lo' });
  parts.push({ kind: 'line', group, d: pathOf([[right - 9, ground], [right - 5.5, ground + 5.2], [right - 3, ground + 3.4], [right, ground + 5.6]].map(([u, v]) => at([u, face, v]))), tone: 'lo' });
  parts.push({ kind: 'line', group, d: sideRing([x + ball.u, face, ground + 2.3 + ball.v], 2.1, 'y', P, 18), tone: lit ? 'lit' : 'mid' });
  return parts;
}

// ---------------------------------------------------------------- scene
export interface QueueScene {
  parts: Part[];
  /** The frame number printed on each queued card, oldest first. */
  frames: number[];
}

/**
 * Everything drawn for a queue that keeps `depth` pictures, with `newest`
 * the frame number of the last picture the camera took. The cards stand in
 * slots 1..depth, the oldest (frame newest - depth + 1) against the model,
 * and the oldest is lifted out by the gantry, lit. The `drop` group holds
 * the next picture, inside the camera's chute until the queue runs.
 */
export function sceneOf(depth: number, newest: number): QueueScene {
  const parts: Part[] = [];
  const put = (part: Part) => parts.push(part);
  const frames = Array.from({ length: depth }, (_, k) => newest - depth + 1 + k);
  const cameraX = scaleX(depth);
  const carriageX = cameraX - 21;

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

  // The gantry's back post, behind the channel at the model's end.
  put({ kind: 'solid', group: 'static', paths: cyl(POST_X, GANTRY_Y, 7.5, 0, 3, 28, 0.5), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: [0, 1, 2].map((k) => at([POST_X + 5.6 * Math.cos(k * 2.1 + 0.9), GANTRY_Y + 5.6 * Math.sin(k * 2.1 + 0.9), 3])), size: 0.45 });
  put({ kind: 'solid', group: 'static', paths: cyl(POST_X, GANTRY_Y, 3.4, 3, GANTRY_Z - 3, 24), tone: 'mid' });

  // The channel: the end block, the bed and its back lip, and the floor's centre groove.
  put({ kind: 'solid', group: 'static', paths: slab(END_BLOCK, 0, 16, 4, 0.6), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(END_BLOCK, 2.6), 16, P), tone: 'faint' });
  put({ kind: 'dots', group: 'static', points: [at([END_BLOCK.x + 6, END_BLOCK.y + 5, 16]), at([END_BLOCK.x + 6, END_BLOCK.y + END_BLOCK.d - 5, 16])], size: 0.5 });
  put({ kind: 'solid', group: 'static', paths: slab(BED, 0, BED_H, 3, 0.5), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: slab(BACK_LIP, BED_H, LIP_H, 2, 0.4), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: onTop([[BED.x, 0], [STOP_X, 0]], BED_H, P), tone: 'faint' });

  // The queued cards, newest (slot depth, far) to second oldest (slot 2, near): far to near in depth.
  for (let k = depth; k >= 2; k--) {
    const frame = frames[k - 1];
    put({ kind: 'card', group: 'row', frame, age: depth - k + 1, used: false, parts: cardParts('row', slotX(k), frame, false) });
  }
  // The next picture, inside the camera's chute over the feed slot until the queue runs.
  put({ kind: 'card', group: 'drop', frame: newest + 1, age: 0, used: false, parts: cardParts('drop', cameraX, newest + 1, false) });

  // The front lip hides the stands' feet.
  put({ kind: 'solid', group: 'static', paths: slab(FRONT_LIP, BED_H, LIP_H, 2, 0.4), tone: 'mid' });

  // The indexer's drive block and its gear motor end the channel.
  put({ kind: 'solid', group: 'static', paths: slab(DRIVE, 0, 20, 4, 0.8), tone: 'mid', inner: '' });
  put({ kind: 'line', group: 'static', d: sideSeam(DRIVE, 6, P, 4), tone: 'faint' });
  put({ kind: 'dots', group: 'static', points: [at([DRIVE.x + 4, DRIVE.y + 4, 20]), at([DRIVE.x + DRIVE.w - 4, DRIVE.y + DRIVE.d - 4, 20]), at([DRIVE.x + DRIVE.w - 4, DRIVE.y + 4, 20])], size: 0.5 });
  put({ kind: 'solid', group: 'static', paths: cyl(DRIVE.x + 10, DRIVE.y + 18, 6.5, 20, 3, 28), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(DRIVE.x + 10, DRIVE.y + 18, 5.6, 23, 13, 28, 0.4), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: [27, 31].map((z) => sideArc(DRIVE.x + 10, DRIVE.y + 18, 5.6, z, P, 16)).join(''), tone: 'faint' });

  // The model's housing: lid seam, cooling fins, the reader slot, a lamp and vents.
  put({ kind: 'solid', group: 'static', paths: slab(HOUSING, 0, HOUSING_H, 8, 1.2), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: sideSeam(HOUSING, HOUSING_H - 7, P, 8), tone: 'faint' });
  for (let k = 0; k < 5; k++) {
    put({ kind: 'line', group: 'static', d: planOutline({ x: HOUSING.x + 8 + k * 8, y: HOUSING.y + 5, w: 3.2, d: 16, r: 1.6 }, HOUSING_H, P, 3), tone: 'lo' });
  }
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(READER_SLOT, -1.6), HOUSING_H, P, 3), tone: 'faint' });
  put({ kind: 'line', group: 'static', d: planOutline(READER_SLOT, HOUSING_H, P, 3), tone: 'mid' });
  put({ kind: 'dots', group: 'static', points: [[4, 4], [HOUSING.w - 4, 4], [4, HOUSING.d - 4], [HOUSING.w - 4, HOUSING.d - 4]].map(([dx, dy]) => at([HOUSING.x + dx, HOUSING.y + dy, HOUSING_H])), size: 0.5 });
  const front = HOUSING.y + HOUSING.d;
  for (let k = 0; k < 6; k++) put({ kind: 'line', group: 'static', d: faceSlot(HOUSING.x + 8 + k * 6.5, HOUSING.x + 11 + k * 6.5, 8, 24, front), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(HOUSING.x + HOUSING.w - 10, front - 6, 3.2, HOUSING_H, 2.4, 20), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(HOUSING.x + HOUSING.w - 10, front - 6, 2.2, HOUSING_H + 2.4, 2.2, 20, 0.3), tone: 'hi' });

  // The gantry: the post on the housing, the rail and the head that rides it.
  put({ kind: 'solid', group: 'static', paths: cyl(204, GANTRY_Y, 6, HOUSING_H, 2.5, 24), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(204, GANTRY_Y, 3.4, HOUSING_H + 2.5, GANTRY_Z - HOUSING_H - 2.5, 24), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: slab(GANTRY_RAIL, GANTRY_Z, 6, 3, 0.5), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: onTop([[GANTRY_RAIL.x, GANTRY_Y], [GANTRY_RAIL.x + GANTRY_RAIL.w, GANTRY_Y]], GANTRY_Z + 6, P), tone: 'lo' });
  put({ kind: 'solid', group: 'head', paths: slab({ x: slotX(1) - 9, y: GANTRY_Y - 6, w: 18, d: 12, r: 1.6 }, GANTRY_Z - 3, 12, 3, 0.6), tone: 'mid' });
  put({ kind: 'dots', group: 'head', points: [at([slotX(1) - 6, GANTRY_Y - 3, GANTRY_Z + 9]), at([slotX(1) + 6, GANTRY_Y + 3, GANTRY_Z + 9])], size: 0.45 });
  put({ kind: 'solid', group: 'head', paths: slab({ x: slotX(1) - 2.6, y: -6.6, w: 5.2, d: 3.6, r: 0.6 }, CARD_TOP + 6, GANTRY_Z - CARD_TOP - 6, 2), tone: 'mid' });
  put({ kind: 'solid', group: 'head', paths: slab({ x: slotX(1) - 3.5, y: GANTRY_Y + 6, w: 7, d: -GANTRY_Y - 6 - 3, r: 1 }, GANTRY_Z, 5, 2, 0.4), tone: 'mid' });

  // The oldest card, lifted out of the row by the gripper: the one lit part.
  put({ kind: 'card', group: 'picked', frame: frames[0], age: depth, used: true, parts: cardParts('picked', slotX(1), frames[0], true) });
  put({ kind: 'solid', group: 'grip', paths: slab({ x: slotX(1) - 6, y: -6.8, w: 12, d: 8.6, r: 1.2 }, CARD_TOP + 1.6, 4.4, 3, 0.5), tone: 'mid' });
  put({ kind: 'solid', group: 'grip', paths: slab({ x: slotX(1) - 3.6, y: 1.2, w: 7.2, d: 1.4, r: 0.4 }, CARD_TOP - 2.6, 4.2, 2), tone: 'mid' });
  put({ kind: 'dots', group: 'grip', points: [at([slotX(1) - 3.8, -4.6, CARD_TOP + 6]), at([slotX(1) + 3.8, -4.6, CARD_TOP + 6])], size: 0.45 });

  // The front rail and its end stops; its front face carries the age scale, zero at the model's end.
  put({ kind: 'solid', group: 'static', paths: slab(RAIL, 0, RAIL_H, 3, 0.5), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: onTop([[RAIL.x, RAIL.y + RAIL.d / 2], [RAIL.x + RAIL.w, RAIL.y + RAIL.d / 2]], RAIL_H, P), tone: 'lo' });
  {
    const minor: string[] = [];
    const major: string[] = [];
    for (let f = 0; f <= SLOTS; f++) {
      const x = scaleX(f);
      const long = f % 3 === 0;
      if (f > 0) (long ? major : minor).push(segment([x, RAIL_FACE, RAIL_H], [x, RAIL_FACE, RAIL_H - (long ? 4.6 : 3)], P));
      if (f < SLOTS) minor.push(segment([x - PITCH / 2, RAIL_FACE, RAIL_H], [x - PITCH / 2, RAIL_FACE, RAIL_H - 1.6], P));
    }
    put({ kind: 'line', group: 'static', d: minor.join(''), tone: 'lo' });
    put({ kind: 'line', group: 'static', d: major.join(''), tone: 'mid' });
    put({ kind: 'line', group: 'static', d: segment([scaleX(0), RAIL_FACE, RAIL_H], [scaleX(0), RAIL_FACE, 0], P), tone: 'hi' });
  }
  for (const x of [RAIL.x - 4, RAIL.x + RAIL.w]) {
    put({ kind: 'solid', group: 'static', paths: slab({ x, y: RAIL.y - 1.5, w: 4, d: RAIL.d + 3, r: 0.8 }, 0, RAIL_H + 4, 2, 0.4), tone: 'mid' });
  }

  // The camera's carriage on the front rail, its lock knob, and the index plate that reads the scale.
  const carriage: Plan = { x: carriageX - 9, y: 12, w: 18, d: 13, r: 2 };
  put({ kind: 'solid', group: 'static', paths: slab(carriage, RAIL_H - 3, 12, 3, 0.6), tone: 'mid', inner: '' });
  put({ kind: 'line', group: 'static', d: sideSeam(carriage, RAIL_H + 2, P, 3), tone: 'faint' });
  const plate: Plan = { x: carriageX - 9, y: RAIL_FACE, w: cameraX - carriageX + 11.5, d: 1.4, r: 0.4 };
  put({ kind: 'solid', group: 'static', paths: slab(plate, 0.6, RAIL_H - 5.2, 2), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: segment([cameraX, RAIL_FACE + 1.4, RAIL_H - 4.6], [cameraX, RAIL_FACE + 1.4, 0.6], P), tone: 'hi' });
  put({ kind: 'dots', group: 'static', points: [at([carriageX - 5, RAIL_FACE + 1.4, 2]), at([carriageX + 5, RAIL_FACE + 1.4, 2])], size: 0.45 });
  put({ kind: 'solid', group: 'static', paths: cyl(carriageX - 4, 21.5, 3.2, RAIL_H + 9, 3, 20), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: knurl(carriageX - 4, 21.5, 3.2, RAIL_H + 9, RAIL_H + 12, 12, P), tone: 'lo' });

  // The camera: the print chute, the body with its seam, viewfinder and shutter button.
  const body: Plan = { x: cameraX - 27, y: -13, w: 37, d: 20, r: 2.4 };
  put({ kind: 'solid', group: 'static', paths: slab({ x: cameraX - 11.5, y: -3.2, w: 23, d: 6.4, r: 1 }, CHUTE_Z, BODY_Z - CHUTE_Z, 2), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: slab(body, BODY_Z, BODY_H, 4, 0.8), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: sideSeam(body, BODY_Z + 4, P, 4), tone: 'faint' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: cameraX + 1, y: -10, w: 7, d: 8, r: 1 }, BODY_Z + BODY_H, 4, 2, 0.3), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(cameraX - 21, -6, 2.2, BODY_Z + BODY_H, 1.8, 16), tone: 'mid' });
  // The column and the arm that hang the camera over slot `depth`.
  put({ kind: 'solid', group: 'static', paths: cyl(carriageX + 2, 18, 5, RAIL_H + 9, 4, 24), tone: 'mid' });
  put({ kind: 'solid', group: 'static', paths: cyl(carriageX + 2, 18, 3.2, RAIL_H + 13, BODY_Z + BODY_H - RAIL_H - 13, 24), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: sideArc(carriageX + 2, 18, 3.2, 38, P, 16), tone: 'faint' });
  // The lens: a boss on the body's front face with its rings.
  const lensX = cameraX - 4.5;
  const lensY = body.y + body.d;
  put({ kind: 'solid', group: 'static', paths: slab({ x: lensX - 7, y: lensY, w: 14, d: 3, r: 1.2 }, BODY_Z + 2.5, 12, 2, 0.4), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: [5.2, 3.8, 2.2].map((r) => sideRing([lensX, lensY + 3, BODY_Z + 8.5], r, 'y', P, 28)).join(''), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: [at([lensX, lensY + 3, BODY_Z + 8.5])], size: 0.7, tone: 'mid' });
  // The flash window and the print counter's window beside the lens.
  put({ kind: 'line', group: 'static', d: faceRect(cameraX + 4, cameraX + 8.5, BODY_Z + 9.5, BODY_Z + 13, lensY), tone: 'lo' });
  put({ kind: 'line', group: 'static', d: faceRect(cameraX - 21.5, cameraX - 16, BODY_Z + 10, BODY_Z + 12.6, lensY), tone: 'faint' });
  put({ kind: 'solid', group: 'static', paths: slab({ x: carriageX - 1.5, y: -12, w: 7, d: 33, r: 1 }, BODY_Z + BODY_H, 5, 2, 0.4), tone: 'mid' });
  put({ kind: 'dots', group: 'static', points: [at([carriageX + 2, -8, BODY_Z + BODY_H + 5]), at([carriageX + 2, 18, BODY_Z + BODY_H + 5])], size: 0.45 });
  // A label plate at the front right, with three engraved rules.
  put({ kind: 'solid', group: 'static', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
  put({
    kind: 'line',
    group: 'static',
    d: [0, 1, 2].map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.4 + row * 2.6], [LABEL.x + (row === 1 ? 30 : 44), LABEL.y + 3.4 + row * 2.6]], 0.8, P)).join(''),
    tone: 'lo',
    free: true,
  });
  put({ kind: 'dots', group: 'static', points: [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], size: 0.5 });

  return { parts, frames };
}

/**
 * Clip paths in the plane of the cards' faces: a dropping card shows only
 * below the camera's chute, and a fed card only above the reader slot's
 * front edge. Each cut lies on a drawn edge (the chute's bottom, the slot's
 * front rim), so the clip reads as the card passing behind it.
 */
const planeClip = (corners: Array<[number, number]>, y: number) => pathOf(corners.map(([x, z]) => at([x, y, z])), true);
export const DROP_CLIP = planeClip([[-400, -60], [400, -60], [400, CHUTE_Z], [-400, CHUTE_Z]], 3.2);
export const FEED_CLIP = planeClip(
  [[-400, -60], [HOUSING.x - 2, -60], [HOUSING.x - 2, HOUSING_H], [600, HOUSING_H], [600, 400], [-400, 400]],
  READER_SLOT.y + READER_SLOT.d,
);

/** How high the next card waits inside the camera's chute: wholly above its mouth, so the clip hides it. */
export const DROP_REST = CHUTE_Z - CARD_Z;
/** How far the gantry carries a card from the pick slot to the reader slot. */
export const CARRY = READER_X - slotX(1);

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
