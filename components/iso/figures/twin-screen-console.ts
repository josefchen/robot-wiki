/**
 * The twin-screen video console for ActionConditioning, drawn with the
 * isometric kit.
 *
 * The object is the explanation: a video world model is a machine that
 * takes a command and plays the future it imagines. This console has two
 * screens, each fed by its own command box on the desk in front: a shift
 * lever in a gate (left for push left, right for push right, back for lift),
 * cabled to a jack under its screen. Both screens start from the same frame,
 * the photo standing on top. Plugged in, each screen plays the future its
 * command causes; with the plugs pulled, the model never hears the command
 * and both screens play the same likely future, just as sharp. Two meters
 * between the screens read the two scores: action sensitivity, whose needle
 * swings below its threshold mark when the plugs are out, and realism, which
 * reads the same either way.
 *
 * World units are about a millimetre: x along the console, y toward the
 * viewer, z up. The front face is the plane y = FACE_Y; screen content is
 * drawn by the component in the old figure's frame units (150 by 80) through
 * `screenMatrix`, so the frames keep their geometry. Static parts are built
 * once; the levers, plugs, cables and meter needles come from the state.
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
  sideMatrix,
  sideSeam,
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
import { phoneFitOf } from '../phone-fit.ts';

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 62;

export type Panel = 'a' | 'b';
export type Command = 'push-left' | 'push-right' | 'lift';

export type Part =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string; innerTone?: LineTone; role?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end'; role?: string }
  | { kind: 'fill'; d: string; shade: 0 | 1 | 2 | 3 | 'paper' | 'top'; role?: string }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone; role?: string }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone; role?: string }
  | { kind: 'slot'; id: 'screen-a' | 'screen-b' | 'start-card' | 'lever-a' | 'lever-b' | 'plug-a' | 'plug-b' | 'meters' };

/** The old figure's frame, in its own units: every screen and the start card draw in these. */
export const FRAME = { w: 150, h: 80 };

// ---------------------------------------------------------------- layout
const DESK: Plan = { x: -178, y: -76, w: 356, d: 134, r: 10 };
const DESK_H = 8;
const FOOT_H = 5;
const CAB: Plan = { x: -160, y: -66, w: 320, d: 46, r: 4 };
const PLINTH: Plan = insetPlan(CAB, 4);
const PLINTH_H = 6;
const CAB_TOP = 114;
/** The console's front face. */
export const FACE_Y = CAB.y + CAB.d;
const RECESS = 4;
/** Each screen window: its left edge in x, its top in z, and its scale from frame units to world units. */
const SCREEN_SCALE = 0.82;
const SCREEN_W = FRAME.w * SCREEN_SCALE;
const SCREEN_H = FRAME.h * SCREEN_SCALE;
const SCREEN_TOP = 104;
export const PANEL_X: Record<Panel, number> = { a: -80, b: 80 };
const screenLeft = (panel: Panel) => PANEL_X[panel] - SCREEN_W / 2;
/** The start card standing on the console's top. */
const CARD_SCALE = 0.44;
const CARD_W = FRAME.w * CARD_SCALE;
const CARD_H = FRAME.h * CARD_SCALE;
const CARD_Y = -43;
const CARD_Z = CAB_TOP + 4;
/** The jacks under the screens, and the meters in the middle strip. */
const JACK_Z = 23;
const METER_R = 11;
export const METERS = { sensitivity: { x: 0, z: 84 }, realism: { x: 0, z: 54 } };
/** The command boxes on the desk. */
const GATE_Y = 14;
const GATE_D = 34;
const GATE_W = 48;
const GATE_H = 12;
const SLOT_Y = GATE_Y + 22;
const LIFT_Y = GATE_Y + 9;
const THROW = 13;
const LEVER_TOP = 34;

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [DESK.x, DESK.x + DESK.w]) for (const py of [DESK.y, DESK.y + DESK.d]) {
  extremes.push([px, py, -DESK_H - FOOT_H], [px, py, 0]);
}
for (const px of [CAB.x, CAB.x + CAB.w]) extremes.push([px, CAB.y, CAB_TOP + 13], [px, FACE_Y, CAB_TOP]);
extremes.push([0, CARD_Y, CARD_Z + CARD_H + 2]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH });
/** The machine's own window, shown on a phone in place of the full viewBox (components/iso/phone-fit.ts). */
export const PHONE_FIT = phoneFitOf(extremes, P, WIDTH, HEIGHT, { pad: 14 });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const depth = (x: number, y: number, z = 0) => depthOf([x, y, z], P);
/** A point on the console's front face, or `back` units behind it. */
const face = (x: number, z: number, back = 0): Flat => at([x, FACE_Y - back, z]);
/** A closed outline on the front face from (x, z) corners. */
const faceLoop = (points: Array<[number, number]>, back = 0) => pathOf(points.map(([x, z]) => face(x, z, back)), true);
/** A rounded slot outline on the front face, its centre line from (x0, z) to (x1, z), half-height r. */
function faceSlot(x0: number, x1: number, z: number, r: number, back = 0) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI;
    points.push([x0 + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    points.push([x1 + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  return faceLoop(points, back);
}
/** A circle on the front face. */
const faceCircle = (x: number, z: number, r: number, back = 0, steps = 36) =>
  faceLoop(Array.from({ length: steps }, (_, i) => [x + Math.cos((i / steps) * Math.PI * 2) * r, z + Math.sin((i / steps) * Math.PI * 2) * r]), back);

/** The transform that lays a screen's frame units (x right, y down) on its glass, behind the recess. */
export const screenMatrix = (panel: Panel) => `${sideMatrix([screenLeft(panel), FACE_Y - RECESS], SCREEN_TOP, P, 'left')} scale(${SCREEN_SCALE})`;
/** The same for the start card's face. */
export const cardMatrix = `${sideMatrix([-CARD_W / 2, CARD_Y + 0.7], CARD_Z + CARD_H, P, 'left')} scale(${CARD_SCALE})`;

// ---------------------------------------------------------------- static parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));

// The desk: a plate on four turned feet with a groove and corner screws.
for (const [x, y] of byDepth([
  [DESK.x + 26, DESK.y + 20],
  [DESK.x + DESK.w - 26, DESK.y + 20],
  [DESK.x + 26, DESK.y + DESK.d - 20],
  [DESK.x + DESK.w - 26, DESK.y + DESK.d - 20],
])) {
  put({ kind: 'solid', paths: cyl(x, y, 8.5, -DESK_H - FOOT_H, 1.6), tone: 'lo' });
  put({ kind: 'solid', paths: cyl(x, y, 6.4, -DESK_H - FOOT_H + 1.6, FOOT_H - 1.6), tone: 'mid' });
}
put({ kind: 'solid', paths: slab(DESK, -DESK_H, DESK_H, 8, 1.6), tone: 'mid', inner: sideSeam(DESK, -DESK_H + 3, P, 8) });
put({ kind: 'line', d: planOutline(insetPlan(DESK, 5), 0, P), tone: 'faint' });
{
  const screws: Plane[] = [
    [DESK.x + 10, DESK.y + 10],
    [DESK.x + DESK.w - 10, DESK.y + 10],
    [DESK.x + 10, DESK.y + DESK.d - 10],
    [DESK.x + DESK.w - 10, DESK.y + DESK.d - 10],
  ];
  put({ kind: 'line', d: screws.map(([x, y]) => ring(x, y, 2.4, 0, P, 16)).join(''), tone: 'lo' });
  put({ kind: 'dots', points: screws.map(([x, y]) => at([x, y, 0])), size: 0.55 });
}

// The console: a plinth, the cabinet with its lid seam, and a carry handle on top.
put({ kind: 'solid', paths: slab(PLINTH, 0, PLINTH_H, 4), tone: 'lo' });
put({ kind: 'solid', paths: slab(CAB, PLINTH_H, CAB_TOP - PLINTH_H, 6, 1.2), tone: 'mid', inner: sideSeam(CAB, CAB_TOP - 8, P, 6) });
put({ kind: 'line', d: planOutline(insetPlan(CAB, 4), CAB_TOP, P, 6), tone: 'faint' });
put({ kind: 'dots', points: [[CAB.x + 8, CAB.y + 8], [CAB.x + CAB.w - 8, CAB.y + 8], [CAB.x + 8, CAB.y + CAB.d - 8], [CAB.x + CAB.w - 8, CAB.y + CAB.d - 8]].map(([x, y]) => at([x!, y!, CAB_TOP])), size: 0.5 });
// A carry handle along the back of the top: two posts with screw caps and the grip bar between them.
for (const hx of [-96, 96]) {
  put({ kind: 'solid', paths: slab({ x: hx - 5, y: CAB.y + 6, w: 10, d: 8, r: 1.6 }, CAB_TOP, 9, 3, 0.4), tone: 'mid' });
}
put({ kind: 'solid', paths: slab({ x: -100, y: CAB.y + 7.4, w: 200, d: 5.2, r: 2.4 }, CAB_TOP + 9, 4, 6, 0.6), tone: 'hi' });
put({ kind: 'dots', points: [-96, 96].map((hx) => at([hx, CAB.y + 10, CAB_TOP + 13])), size: 0.5 });
// Vent slots along the cabinet's right side, closed outlines in the side's plane.
{
  const side = CAB.x + CAB.w;
  const slots: string[] = [];
  for (let i = 0; i < 6; i++) {
    const z = 30 + i * 9;
    const pts: Point3[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI / 2 + (k / 8) * Math.PI;
      pts.push([side, CAB.y + 12 + Math.cos(a) * -1.6, z + Math.sin(a) * 1.6]);
    }
    for (let k = 0; k <= 8; k++) {
      const a = -Math.PI / 2 + (k / 8) * Math.PI;
      pts.push([side, CAB.y + 34 + Math.cos(a) * -1.6, z + Math.sin(a) * 1.6]);
    }
    slots.push(pathOf(pts.map(at), true));
  }
  put({ kind: 'line', d: slots.join(''), tone: 'lo' });
}

// The start card on top: a stand, the card, two clips holding it, and its picture (drawn by the component).
put({ kind: 'solid', paths: slab({ x: -CARD_W / 2 - 6, y: CARD_Y - 5, w: CARD_W + 12, d: 10, r: 2 }, CAB_TOP, 4, 4, 0.6), tone: 'mid' });
put({ kind: 'solid', paths: slab({ x: -CARD_W / 2, y: CARD_Y - 0.6, w: CARD_W, d: 1.3, r: 0.3 }, CARD_Z, CARD_H, 2), tone: 'hi' });
put({ kind: 'slot', id: 'start-card' });
for (const cx of [-CARD_W / 2 + 6, CARD_W / 2 - 6]) {
  put({ kind: 'solid', paths: slab({ x: cx - 2.5, y: CARD_Y - 2.2, w: 5, d: 4.4, r: 0.8 }, CARD_Z - 0.4, 5, 3), tone: 'mid' });
}

// The front face: around each screen a bezel with four screws, the recess walls, the glass and its picture.
for (const panel of ['a', 'b'] as const) {
  const x0 = screenLeft(panel);
  const x1 = x0 + SCREEN_W;
  const z1 = SCREEN_TOP;
  const z0 = SCREEN_TOP - SCREEN_H;
  const pad = 5;
  // The bezel: a raised frame, a ring outline round the opening.
  put({ kind: 'line', d: faceLoop([[x0 - pad, z0 - pad], [x1 + pad, z0 - pad], [x1 + pad, z1 + pad], [x0 - pad, z1 + pad]]), tone: 'lo' });
  put({ kind: 'dots', points: [[x0 - pad + 2.4, z0 - pad + 2.4], [x1 + pad - 2.4, z0 - pad + 2.4], [x0 - pad + 2.4, z1 + pad - 2.4], [x1 + pad - 2.4, z1 + pad - 2.4]].map(([x, z]) => face(x!, z!)), size: 0.5 });
  // The recess: its floor (seen from above) and its left wall (facing +x, toward the viewer).
  put({ kind: 'fill', d: pathOf([face(x0, z0), face(x1, z0), face(x1, z0, RECESS), face(x0, z0, RECESS)], true), shade: 'top' });
  put({ kind: 'fill', d: pathOf([face(x0, z0), face(x0, z1), face(x0, z1, RECESS), face(x0, z0, RECESS)], true), shade: 2 });
  put({ kind: 'line', d: pathOf([face(x0, z0, RECESS), face(x1, z0, RECESS)]), tone: 'faint' });
  put({ kind: 'line', d: pathOf([face(x0, z0, RECESS), face(x0, z1, RECESS)]), tone: 'faint' });
  put({ kind: 'line', d: pathOf([face(x0, z0), face(x0, z0, RECESS)]), tone: 'lo' });
  put({ kind: 'line', d: pathOf([face(x0, z1), face(x0, z1, RECESS)]), tone: 'lo' });
  put({ kind: 'line', d: pathOf([face(x1, z0), face(x1, z0, RECESS)]), tone: 'lo' });
  put({ kind: 'slot', id: panel === 'a' ? 'screen-a' : 'screen-b' });
  put({ kind: 'line', d: faceLoop([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]), tone: 'mid' });
  // The jack under the screen: a socket ring with its bore.
  const jx = PANEL_X[panel];
  put({ kind: 'fill', d: faceCircle(jx, JACK_Z, 4.6), shade: 3 });
  put({ kind: 'line', d: faceCircle(jx, JACK_Z, 4.6), tone: 'mid' });
  put({ kind: 'line', d: faceCircle(jx, JACK_Z, 3), tone: 'lo' });
  put({ kind: 'fill', d: faceCircle(jx, JACK_Z, 1.8), shade: 0 });
  put({ kind: 'dots', points: [face(jx - 7.4, JACK_Z), face(jx + 7.4, JACK_Z)], size: 0.45 });
  // A small brightness knob beside it, seen face on.
  const kx = jx + (panel === 'a' ? 26 : -26);
  put({ kind: 'line', d: faceCircle(kx, JACK_Z, 4), tone: 'lo' });
  put({ kind: 'line', d: faceCircle(kx, JACK_Z, 2.6), tone: 'faint' });
  put({ kind: 'line', d: pathOf([face(kx, JACK_Z + 0.6), face(kx, JACK_Z + 2.6)]), tone: 'mid' });
}

// The middle strip: two meters (action sensitivity above, realism below), a lamp and a vent column.
for (const [, meter] of Object.entries(METERS)) {
  put({ kind: 'fill', d: faceCircle(meter.x, meter.z, METER_R + 1.6), shade: 3 });
  put({ kind: 'line', d: faceCircle(meter.x, meter.z, METER_R + 1.6), tone: 'mid' });
  put({ kind: 'line', d: faceCircle(meter.x, meter.z, METER_R - 0.4), tone: 'faint' });
  put({ kind: 'dots', points: [face(meter.x, meter.z - METER_R + 3)], size: 0.9, tone: 'mid' });
}
put({ kind: 'slot', id: 'meters' });
{
  const slots: string[] = [];
  for (let i = 0; i < 4; i++) slots.push(faceSlot(-8, 8, 12 + i * 5, 1.3));
  put({ kind: 'line', d: slots.join(''), tone: 'lo' });
}

// A nameplate low on the right of the face, its rules standing for print.
{
  const x0 = 104;
  const x1 = 146;
  put({ kind: 'line', d: faceLoop([[x0, 11], [x1, 11], [x1, 19], [x0, 19]]), tone: 'lo' });
  put({ kind: 'line', d: [0, 1].map((row) => pathOf([face(x0 + 4, 16.6 - row * 3.2), face(row ? x0 + 26 : x1 - 6, 16.6 - row * 3.2)])).join(''), tone: 'lo', free: true });
  // Three indicator lamps low on the left: bezel rings with their lenses.
  for (const x of [-141, -133, -125]) {
    put({ kind: 'fill', d: faceCircle(x, 15, 2.6, 0, 20), shade: 3 });
    put({ kind: 'line', d: faceCircle(x, 15, 2.6, 0, 20), tone: 'lo' });
    put({ kind: 'line', d: faceCircle(x, 15, 1.4, 0, 16), tone: 'mid' });
  }
}

// The plugs and cables come next (slots), then the command boxes on the desk in front.
put({ kind: 'slot', id: 'plug-a' });
put({ kind: 'slot', id: 'plug-b' });
for (const panel of ['a', 'b'] as const) {
  const cx = PANEL_X[panel];
  const box: Plan = { x: cx - GATE_W / 2, y: GATE_Y, w: GATE_W, d: GATE_D, r: 3 };
  put({ kind: 'solid', paths: slab(box, 0, GATE_H, 4, 0.8), tone: 'mid', inner: sideSeam(box, 4, P, 4) });
  const plate = insetPlan(box, 3.4);
  put({ kind: 'solid', paths: slab(plate, GATE_H, 0.8, 3), tone: 'lo', crease: 'none' });
  put({ kind: 'dots', points: [[plate.x + 2.4, plate.y + 2.4], [plate.x + plate.w - 2.4, plate.y + 2.4], [plate.x + 2.4, plate.y + plate.d - 2.4], [plate.x + plate.w - 2.4, plate.y + plate.d - 2.4]].map(([x, y]) => at([x!, y!, GATE_H + 0.8])), size: 0.5 });
  // The gate: a T-shaped slot, across for the two pushes and back toward the screen for lift.
  const top = GATE_H + 0.8;
  const r = 1.9;
  const gate: Plane[] = [];
  const arc = (ox: number, oy: number, from: number, to: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + ((to - from) * i) / 6;
      gate.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
    }
  };
  arc(cx - THROW, SLOT_Y, Math.PI / 2, (3 * Math.PI) / 2);
  gate.push([cx - r, SLOT_Y - r]);
  arc(cx, LIFT_Y, Math.PI, 2 * Math.PI);
  gate.push([cx + r, SLOT_Y - r]);
  arc(cx + THROW, SLOT_Y, -Math.PI / 2, Math.PI / 2);
  put({ kind: 'fill', d: pathOf(gate.map(([x, y]) => at([x, y, top])), true), shade: 0 });
  put({ kind: 'line', d: onTop(gate, top, P, true), tone: 'mid' });
  // Index marks at the three ends of the gate, on the plate's edge.
  put({ kind: 'dots', points: [[cx - THROW, SLOT_Y + 5.4], [cx + THROW, SLOT_Y + 5.4], [cx - 5.4, LIFT_Y]].map(([x, y]) => at([x!, y!, top])), size: 0.6, tone: 'mid' });
  put({ kind: 'slot', id: panel === 'a' ? 'lever-a' : 'lever-b' });
}

export const PARTS: readonly Part[] = parts;

// ---------------------------------------------------------------- live parts
/** Where a lever stands in its gate for a command, as a world offset from the gate's centre. */
export function leverOffset(command: Command | 'neutral'): Point3 {
  if (command === 'push-left') return [-THROW, 0, 0];
  if (command === 'push-right') return [THROW, 0, 0];
  if (command === 'lift') return [0, LIFT_Y - SLOT_Y, 0];
  return [0, 0, 0];
}
/** The lever's screen offset for a command, as a CSS translate in user units, so the lever can ease there. */
export function leverCss(command: Command | 'neutral'): string {
  const [x, y] = translateAlong(P, leverOffset(command)).match(/-?[\d.]+/g)!.map(Number);
  return `translate(${x}px, ${y}px)`;
}

/** A shift lever built at the gate's centre: boot, stick and knurled knob. Moved with `leverCss`. */
export function leverParts(panel: Panel): Part[] {
  const cx = PANEL_X[panel];
  const top = GATE_H + 0.8;
  return [
    { kind: 'solid', paths: cyl(cx, SLOT_Y, 3.6, top, 1.4, 24, 0.3), tone: 'lo' },
    { kind: 'solid', paths: cyl(cx, SLOT_Y, 1.3, top + 1.4, LEVER_TOP - top - 1.4, 14), tone: 'mid' },
    { kind: 'solid', paths: cyl(cx, SLOT_Y, 4.2, LEVER_TOP, 6, 28, 0.5), tone: 'hi' },
    { kind: 'line', d: knurl(cx, SLOT_Y, 4.2, LEVER_TOP + 0.6, LEVER_TOP + 5.4, 22, P), tone: 'lo' },
  ];
}

/** How far a pulled plug sits from its seat: out of the jack and down onto the desk. */
export const PLUG_OUT: Point3 = [0, 9, -JACK_Z + 3.2];
const PLUG_LEN = 11;
const RELIEF_LEN = 5;

/** A plug built seated in its jack: body and strain relief. Moved by `share` of PLUG_OUT. */
export function plugParts(panel: Panel): Part[] {
  const jx = PANEL_X[panel];
  return [
    { kind: 'solid', paths: slab({ x: jx - 3.4, y: FACE_Y, w: 6.8, d: PLUG_LEN, r: 1.2 }, JACK_Z - 3.2, 6.4, 3, 0.4), tone: 'mid' },
    { kind: 'solid', paths: slab({ x: jx - 2.2, y: FACE_Y + PLUG_LEN, w: 4.4, d: RELIEF_LEN, r: 1 }, JACK_Z - 2, 4, 3), tone: 'lo' },
  ];
}
export const plugTransform = (share: number) => translateAlong(P, [PLUG_OUT[0] * share, PLUG_OUT[1] * share, PLUG_OUT[2] * share]);

/** The cable from a plug's tail, down to the desk and along it to its command box's back face. */
export function cableOf(panel: Panel, share: number): { from: Flat; via: Flat[]; to: Flat } {
  const jx = PANEL_X[panel];
  const side = panel === 'a' ? 1 : -1;
  const tail: Point3 = [jx, FACE_Y + PLUG_LEN + RELIEF_LEN + PLUG_OUT[1] * share, JACK_Z + PLUG_OUT[2] * share];
  const drop = tail[1] + 3 + 2 * (1 - share);
  return {
    from: at(tail),
    via: [at([jx, drop, Math.max(0.3, tail[2] * 0.35)]), at([jx, drop + 1.5, 0.3]), at([jx + side * 12, GATE_Y - 4, 0.3])],
    to: at([jx + side * 12, GATE_Y, 4]),
  };
}

/** A meter needle: value 0..1 across a 100 degree arc, from the pivot near the meter's foot. */
export function needleOf(meter: keyof typeof METERS, share: number): string {
  const { x, z } = METERS[meter];
  const pivot: [number, number] = [x, z - METER_R + 3];
  const a = (-50 + 100 * Math.min(1, Math.max(0, share))) * (Math.PI / 180);
  const length = METER_R + 0.2;
  return pathOf([face(pivot[0], pivot[1]), face(pivot[0] + Math.sin(a) * length, pivot[1] + Math.cos(a) * length)]);
}

/** A meter's scale: ticks inside the rim over the needle's arc, with a long mark at `mark` (0..1). */
export function scaleOf(meter: keyof typeof METERS, mark: number): { minor: string; major: string } {
  const { x, z } = METERS[meter];
  const pivot: [number, number] = [x, z - METER_R + 3];
  const tick = (share: number, length: number) => {
    const a = (-50 + 100 * share) * (Math.PI / 180);
    const r1 = METER_R + 0.2;
    // Ticks hang inward from the inner ring, which they meet exactly.
    const end = (r: number): Flat => face(pivot[0] + Math.sin(a) * r, pivot[1] + Math.cos(a) * r);
    return pathOf([end(r1 - length), end(r1)]);
  };
  const minor = Array.from({ length: 11 }, (_, i) => i / 10).filter((s) => Math.abs(s - mark) > 0.02).map((s) => tick(s, 1.6)).join('');
  return { minor, major: tick(mark, 3.4) };
}

/** The arc the ticks end on, inside the meter's rim. */
export function meterArc(meter: keyof typeof METERS): string {
  const { x, z } = METERS[meter];
  const pivot: [number, number] = [x, z - METER_R + 3];
  const r = METER_R + 0.2;
  return pathOf(Array.from({ length: 21 }, (_, i) => {
    const a = (-50 + 5 * i) * (Math.PI / 180);
    return face(pivot[0] + Math.sin(a) * r, pivot[1] + Math.cos(a) * r);
  }));
}

export const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
