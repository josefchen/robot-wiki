/**
 * The token rack bank for ActionTokenization, drawn with the isometric kit.
 *
 * The object is the explanation. Seven racks lie side by side on a bench,
 * one per motion of the arm (forward/back, left/right, up/down, roll, tilt,
 * turn, open/close). Each rack is cut with 256 notches from -1 at the left
 * to +1 at the right, and a slider sits in one notch: the word a language
 * model writes for that motion. A setter on a gantry (the one lit part)
 * visits the racks one after another and drops each slider into the notch
 * nearest the arm's smooth command, and a register of seven pins at the
 * front pops one pin per word written. A second, close-up drawing shows
 * fifteen notches of the chosen rack around its slider, with a needle at
 * the smooth command, so the slider's notch and the needle's place differ
 * by less than half a notch.
 *
 * World units: x along the racks (one notch is one unit, so a value v sits
 * at x = 128 v), y across the bench (toward the viewer is +y), z up. Moving
 * parts are built at x = 0 (sliders, the gantry) or at rest (register pins)
 * and moved with `translateAlong`.
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
  sideArc,
  sideSeam,
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

export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 60;
export const ELEVATION = 32;

/** Notches per rack; one notch is one world unit along the rack. */
export const NOTCHES = 256;
export const RACKS = 7;
/** A smooth command v in [-1, 1] sits at x = HALF · v. */
export const HALF = NOTCHES / 2;
/** The centre of notch `bin` along the rack. */
export const notchX = (bin: number) => -HALF + bin + 0.5;
export const valueX = (value: number) => Math.max(-1, Math.min(1, value)) * HALF;

const RACK_PITCH = 13;
const RACK_HALF = 4;
/** The centre line of rack `index` across the bench; rack 0 (forward/back) is at the back. */
export const rackY = (index: number) => (index - (RACKS - 1) / 2) * RACK_PITCH;
const RACK_Z = 8;
const RACK_H = 4;
const RACK_TOP = RACK_Z + RACK_H;
const SLIDER_H = 5.5;
export const SLIDER_TOP = RACK_TOP + SLIDER_H;

export type Group = string;

export type Part =
  | { kind: 'solid'; group: Group; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; group: Group; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; group: Group; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; group: Group; from: Flat; to: Flat; via: Flat[]; tone?: LineTone }
  | { kind: 'slot'; group: Group };

// ---------------------------------------------------------------- layout
const BASE: Plan = { x: -186, y: -92, w: 372, d: 194, r: 10 };
const BASE_H = 8;
const FOOT_H = 5;
const END_BLOCKS: Plan[] = [
  { x: -150, y: -48, w: 10, d: 96, r: 1.5 },
  { x: 140, y: -48, w: 10, d: 96, r: 1.5 },
];
const RAIL_Y = [-60, 62] as const;
const RAIL_WALL_H = 9;
const RAIL_X0 = -164;
const RAIL_X1 = 164;
/** The gantry: a beam across the racks on two trucks, with the setter's carriage hung under it. */
const BEAM_Z = 36;
const BEAM_H = 6;
const TRUCK_Z = RAIL_WALL_H + 1.6;
const CARRIAGE: Plan = { x: -5, y: -6, w: 14, d: 12, r: 1.5 };
const CARRIAGE_Z = 24;
/** How far above a slider's top the setter's pin rides between racks. */
export const PIN_LIFT = 5;

const REGISTER: Plan = { x: 34, y: 77, w: 92, d: 16, r: 2 };
const REGISTER_H = 7;
export const REGISTER_PIN_RISE = 4.5;
const CONTROL: Plan = { x: -60, y: 75, w: 40, d: 20, r: 3 };
const CONTROL_H = 9;
const CABINET: Plan = { x: -178, y: -86, w: 44, d: 22, r: 3 };
const CABINET_H = 26;
const MOTOR = { x: 172, y: -60, r: 7.5, h: 20 };
const LABEL: Plan = { x: -170, y: 79, w: 62, d: 13, r: 2 };

// --------------------------------------------------------------- camera
const extremes: Point3[] = [];
for (const px of [BASE.x, BASE.x + BASE.w]) for (const py of [BASE.y, BASE.y + BASE.d]) {
  extremes.push([px, py, -BASE_H - FOOT_H]);
  extremes.push([px, py, 0]);
}
extremes.push([HALF, RAIL_Y[0], BEAM_Z + BEAM_H + 2], [-HALF, RAIL_Y[0], BEAM_Z + BEAM_H + 2], [CABINET.x, CABINET.y, CABINET_H + 2]);
export const P = fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point: Point3) => iso(point, P);
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) =>
  kitCylinder(cx, cy, r, z, h, P, steps, bevel);
const byDepth = (points: Array<[number, number]>) =>
  [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const faint = (d: string) => `<path class="iso-line" data-tone="faint" d="${d}"/>`;
const seam = (plan: Plan, z: number, steps = 4) => faint(sideSeam(plan, z, P, steps));

/** The screen offset that moves a group built at rest by a world offset. */
export const shiftBy = (dx: number, dy = 0, dz = 0) => translateAlong(P, [dx, dy, dz]);

/** A closed rounded slot on a face of constant y, from x0 to x1, centred at height zc. */
function slotOnFront(y: number, x0: number, x1: number, zc: number, h: number): string {
  const r = h / 2;
  const points: Flat[] = [];
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x1 - r + r * Math.cos(a), y, zc + r * Math.sin(a)]));
  }
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI / 2 + (k / 8) * Math.PI;
    points.push(at([x0 + r + r * Math.cos(a), y, zc + r * Math.sin(a)]));
  }
  return pathOf(points, true);
}

// ---------------------------------------------------------------- parts
const parts: Part[] = [];
const put = (part: Part) => parts.push(part);

// Base: a plate on four turned feet, with a groove and corner screws.
{
  for (const [x, y] of byDepth([
    [BASE.x + 26, BASE.y + 22],
    [BASE.x + BASE.w - 26, BASE.y + 22],
    [BASE.x + 26, BASE.y + BASE.d - 22],
    [BASE.x + BASE.w - 26, BASE.y + BASE.d - 22],
  ])) {
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 8, -BASE_H - FOOT_H, 1.6, 28), tone: 'lo' });
    put({ kind: 'solid', group: 'static', paths: cyl(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), tone: 'mid' });
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
}

// Behind: the controller cabinet at the back left and its cable along the back to the gantry's motor.
{
  put({ kind: 'solid', group: 'static', paths: slab(CABINET, 0, CABINET_H, 5, 0.8), tone: 'mid', inner: seam(CABINET, 5, 5) });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(CABINET, 3), CABINET_H, P, 5), tone: 'faint' });
  put({
    kind: 'line',
    group: 'static',
    d: [0, 1, 2].map((k) => slotOnFront(CABINET.y + CABINET.d, CABINET.x + 6, CABINET.x + 26, 19 - k * 4, 1.8)).join(''),
    tone: 'lo',
  });
  put({
    kind: 'dots',
    group: 'static',
    points: [
      at([CABINET.x + 4, CABINET.y + 4, CABINET_H]),
      at([CABINET.x + CABINET.w - 4, CABINET.y + 4, CABINET_H]),
      at([CABINET.x + 4, CABINET.y + CABINET.d - 4, CABINET_H]),
      at([CABINET.x + CABINET.w - 4, CABINET.y + CABINET.d - 4, CABINET_H]),
    ],
    size: 0.5,
  });
  put({ kind: 'solid', group: 'static', paths: cyl(CABINET.x + 34, CABINET.y + 11, 2.4, CABINET_H, 1.6, 16), tone: 'mid' });
  put({
    kind: 'wire',
    group: 'static',
    from: at([CABINET.x + CABINET.w, CABINET.y + 8, 4]),
    via: [at([CABINET.x + CABINET.w + 4, -72, 0.4]), at([MOTOR.x - 14, -72, 0.4])],
    to: at([MOTOR.x - 9.5, MOTOR.y - 7, 1.4]),
    tone: 'lo',
  });
}

/** A rail: a low wall along the bench with a rail strip and end stops; the front one carries the value scale. */
function railParts(y: number, front: boolean) {
  const wall: Plan = { x: RAIL_X0, y: y - 5, w: RAIL_X1 - RAIL_X0, d: 10, r: 1.5 };
  put({ kind: 'solid', group: 'static', paths: slab(wall, 0, RAIL_WALL_H, 3, 0.8), tone: 'mid', inner: seam(wall, 3, 3) });
  const strip: Plan = { x: RAIL_X0 + 2, y: y - 2.2, w: RAIL_X1 - RAIL_X0 - 4, d: 4.4, r: 1 };
  put({ kind: 'solid', group: 'static', paths: slab(strip, RAIL_WALL_H, 1.6, 3), tone: 'hi' });
  for (const x of [RAIL_X0 + 4, RAIL_X1 - 10]) {
    put({ kind: 'solid', group: 'static', paths: slab({ x, y: y - 4.5, w: 6, d: 9, r: 1 }, RAIL_WALL_H, 5, 2, 0.4), tone: 'mid' });
    put({ kind: 'dots', group: 'static', points: [at([x + 3, y - 2.2, RAIL_WALL_H + 5]), at([x + 3, y + 2.2, RAIL_WALL_H + 5])], size: 0.42 });
  }
  if (front) {
    // The front wall's face carries the value scale: -1 at the left, 0 in the middle, +1 at the right.
    const scale: Plan = { x: -HALF - 2, y: y + 5, w: NOTCHES + 4, d: 0.8, r: 0.2 };
    put({ kind: 'solid', group: 'static', paths: slab(scale, 1.5, 6.5, 2), tone: 'lo', crease: 'none' });
    const top = 8;
    const minor: string[] = [];
    const major: string[] = [];
    for (let k = 0; k <= 32; k++) {
      const x = -HALF + k * 8;
      const big = k % 8 === 0;
      const line = pathOf([at([x, y + 5.8, top]), at([x, y + 5.8, top - (big ? 3.6 : 1.8)])]);
      (big ? major : minor).push(line);
    }
    put({ kind: 'line', group: 'static', d: minor.join(''), tone: 'lo' });
    put({ kind: 'line', group: 'static', d: major.join(''), tone: 'mid' });
  }
}

railParts(RAIL_Y[0], false);

// The rack frame: two end blocks with the seven racks across them.
{
  for (const block of END_BLOCKS) {
    put({ kind: 'solid', group: 'static', paths: slab(block, 0, RACK_Z, 3, 0.6), tone: 'mid' });
  }
  put({
    kind: 'dots',
    group: 'static',
    points: END_BLOCKS.flatMap((block) => [-1, 1].map((side) => at([block.x + block.w / 2, side * (block.d / 2 - 3), RACK_Z]))),
    size: 0.45,
  });
}

// The seven racks, back to front, each followed by its slider (its own moving group).
for (let index = 0; index < RACKS; index++) {
  const y = rackY(index);
  const rack: Plan = { x: END_BLOCKS[0].x + 1, y: y - RACK_HALF, w: END_BLOCKS[1].x + END_BLOCKS[1].w - END_BLOCKS[0].x - 2, d: RACK_HALF * 2, r: 0.8 };
  put({ kind: 'solid', group: 'static', paths: slab(rack, RACK_Z, RACK_H, 2, 0.4), tone: 'mid' });
  // A tick every four notches, a long one every 32, rooted on the rack's front edge; the zero mark across the middle.
  const ticks = topTicks(-HALF, HALF, 4, 8, y + RACK_HALF, RACK_TOP, [-1.3, -3], P, 'x');
  put({ kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
  put({ kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  put({ kind: 'line', group: 'static', d: lineOnTop([0, y + RACK_HALF], [0, y - RACK_HALF], RACK_TOP, P), tone: 'hi' });
  put({ kind: 'dots', group: 'static', points: [at([rack.x + 3, y, RACK_TOP]), at([rack.x + rack.w - 3, y, RACK_TOP])], size: 0.45 });
  // The slider, built at x = 0: a block that straddles the rack, with its index line.
  const slider: Plan = { x: -4.5, y: y - RACK_HALF - 1.2, w: 9, d: RACK_HALF * 2 + 2.4, r: 1.2 };
  put({ kind: 'solid', group: `slider${index}`, paths: slab(slider, RACK_TOP - 1.4, SLIDER_H + 1.4, 3), tone: 'hi' });
  put({ kind: 'line', group: `slider${index}`, d: lineOnTop([0, slider.y], [0, slider.y + slider.d], SLIDER_TOP, P), tone: 'hi' });
}

railParts(RAIL_Y[1], true);

// The gantry, built at x = 0: back truck, the setter's carriage and pin (its own group, moving across), front truck, beam.
const TRUCK = (y: number): Plan => ({ x: -7, y: y - 6, w: 14, d: 12, r: 1.5 });
put({ kind: 'solid', group: 'gantry', paths: slab(TRUCK(RAIL_Y[0]), TRUCK_Z, BEAM_Z - TRUCK_Z, 3, 0.6), tone: 'mid' });
put({ kind: 'dots', group: 'gantry', points: [at([-4.5, RAIL_Y[0] + 3.6, BEAM_Z - 0.2])], size: 0.4 });
put({ kind: 'solid', group: 'setter', paths: cyl(0, 0, 0.9, SLIDER_TOP, CARRIAGE_Z - SLIDER_TOP, 12), tone: 'hi' });
put({ kind: 'solid', group: 'setter', paths: cyl(0, 0, 1.9, CARRIAGE_Z - 3, 3, 16), tone: 'mid' });
put({ kind: 'solid', group: 'setter', paths: slab(CARRIAGE, CARRIAGE_Z, BEAM_Z - CARRIAGE_Z, 3, 0.6), tone: 'hi', lit: true });
put({ kind: 'line', group: 'setter', d: planOutline(insetPlan(CARRIAGE, 2), BEAM_Z, P, 3), tone: 'faint' });
put({ kind: 'solid', group: 'gantry', paths: slab(TRUCK(RAIL_Y[1]), TRUCK_Z, BEAM_Z - TRUCK_Z, 3, 0.6), tone: 'mid' });
{
  const beam: Plan = { x: -4.5, y: RAIL_Y[0] - 6, w: 9, d: RAIL_Y[1] - RAIL_Y[0] + 12, r: 1.5 };
  put({ kind: 'solid', group: 'gantry', paths: slab(beam, BEAM_Z, BEAM_H, 3, 0.6), tone: 'mid' });
  put({ kind: 'line', group: 'gantry', d: planOutline(insetPlan(beam, 2.2), BEAM_Z + BEAM_H, P, 3), tone: 'faint' });
  put({ kind: 'dots', group: 'gantry', points: RAIL_Y.map((y) => at([0, y, BEAM_Z + BEAM_H])), size: 0.6 });
  // The setter's drive: a small motor can on the beam's front end.
  put({
    kind: 'solid',
    group: 'gantry',
    paths: cyl(0, RAIL_Y[1] + 1, 4, BEAM_Z + BEAM_H, 7, 24, 0.4),
    tone: 'mid',
    inner: faint(sideArc(0, RAIL_Y[1] + 1, 4, BEAM_Z + BEAM_H + 3.5, P, 20)),
  });
}

// The gantry's motor at the back rail's right end.
{
  const { x, y, r, h } = MOTOR;
  put({ kind: 'solid', group: 'static', paths: slab({ x: x - 11, y: y - 10, w: 22, d: 20, r: 2 }, 0, 2, 3, 0.4), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(x, y, r, 2, h - 2, 32, 0.5), tone: 'hi', inner: faint(sideArc(x, y, r, 6, P, 24) + sideArc(x, y, r, h - 4, P, 24)) });
  put({ kind: 'solid', group: 'static', paths: cyl(x, y, 3, h, 2.4, 16), tone: 'mid' });
}

// The register: seven pins in a housing, one per word, each its own group.
{
  put({ kind: 'solid', group: 'static', paths: slab(REGISTER, 0, REGISTER_H, 4, 0.8), tone: 'mid', inner: seam(REGISTER, 2.5, 4) });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(REGISTER, 2.4), REGISTER_H, P, 4), tone: 'faint' });
  put({ kind: 'dots', group: 'static', points: [at([REGISTER.x + 3.6, REGISTER.y + REGISTER.d / 2, REGISTER_H]), at([REGISTER.x + REGISTER.w - 3.6, REGISTER.y + REGISTER.d / 2, REGISTER_H])], size: 0.5 });
  for (let index = 0; index < RACKS; index++) {
    const x = REGISTER.x + 12 + index * 11.3;
    const y = REGISTER.y + REGISTER.d / 2;
    put({ kind: 'line', group: 'static', d: ring(x, y, 3, REGISTER_H, P, 24), tone: 'lo' });
    put({ kind: 'solid', group: `pin${index}`, paths: cyl(x, y, 2.4, REGISTER_H - REGISTER_PIN_RISE, REGISTER_PIN_RISE + 0.8, 18, 0.3), tone: 'hi' });
  }
}

// The control box with the moment knob, and its cable to the register.
export const KNOB = { x: CONTROL.x + 13, y: CONTROL.y + 10, r: 5 };
{
  put({
    kind: 'wire',
    group: 'static',
    from: at([CONTROL.x + CONTROL.w, CONTROL.y + 6, 4]),
    via: [at([CONTROL.x + CONTROL.w + 5, CONTROL.y + 6, 0.4]), at([REGISTER.x - 5, REGISTER.y + 6, 0.4])],
    to: at([REGISTER.x, REGISTER.y + 6, 3.5]),
    tone: 'lo',
  });
  put({ kind: 'solid', group: 'static', paths: slab(CONTROL, 0, CONTROL_H, 4, 0.8), tone: 'mid' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(CONTROL, 2.4), CONTROL_H, P, 4), tone: 'faint' });
  put({ kind: 'dots', group: 'static', points: [at([CONTROL.x + 4, CONTROL.y + 4, CONTROL_H]), at([CONTROL.x + CONTROL.w - 4, CONTROL.y + CONTROL.d - 4, CONTROL_H])], size: 0.5 });
  put({ kind: 'solid', group: 'static', paths: cyl(KNOB.x, KNOB.y, KNOB.r + 1.2, CONTROL_H, 1, 32), tone: 'lo' });
  put({ kind: 'solid', group: 'static', paths: cyl(KNOB.x, KNOB.y, KNOB.r, CONTROL_H + 1, 4.6, 32, 0.4), tone: 'hi' });
  put({ kind: 'line', group: 'static', d: knurl(KNOB.x, KNOB.y, KNOB.r, CONTROL_H + 1.2, CONTROL_H + 5.4, 24, P), tone: 'faint' });
  put({ kind: 'slot', group: 'knob' });
  put({ kind: 'line', group: 'static', d: ring(CONTROL.x + 30, CONTROL.y + 10, 5.5, CONTROL_H, P, 28), tone: 'lo' });
  put({ kind: 'dots', group: 'static', points: [at([CONTROL.x + 30, CONTROL.y + 10, CONTROL_H])], size: 0.6, tone: 'hi' });
}

// A label plate at the front left, with three engraved rules.
{
  put({ kind: 'solid', group: 'static', paths: slab(LABEL, 0, 0.8, 3), tone: 'lo', crease: 'none' });
  put({ kind: 'line', group: 'static', d: planOutline(insetPlan(LABEL, 1.8), 0.8, P), tone: 'faint' });
  put({
    kind: 'line',
    group: 'static',
    d: [0, 1, 2]
      .map((row) => onTop([[LABEL.x + 8, LABEL.y + 3.6 + row * 3], [LABEL.x + (row === 1 ? 36 : 52), LABEL.y + 3.6 + row * 3]], 0.8, P))
      .join(''),
    tone: 'lo',
    free: true,
  });
  put({ kind: 'dots', group: 'static', points: [at([LABEL.x + 4, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 0.8])], size: 0.5 });
}

export const PARTS: readonly Part[] = parts;

/** The moment knob's pointer, turned through 270 degrees as `share` goes from 0 to 1. */
export function knobPointer(share: number): string {
  const a = (-135 + 270 * Math.max(0, Math.min(1, share))) * (Math.PI / 180);
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  return lineOnTop([KNOB.x + dx * 1.4, KNOB.y + dy * 1.4], [KNOB.x + dx * (KNOB.r - 0.6), KNOB.y + dy * (KNOB.r - 0.6)], CONTROL_H + 5.6, P);
}

/** The gantry over x; the setter over rack `index` (fractional while it travels), its pin `lift` above the slider. */
export const gantryAt = (x: number) => shiftBy(x);
export const setterAt = (index: number, lift: number) => shiftBy(0, rackY(index), lift);
export const sliderAt = (x: number) => shiftBy(x);
export const pinAt = (up: number) => shiftBy(0, 0, up * REGISTER_PIN_RISE);

// ------------------------------------------------------------- the close-up

/** The close-up of one rack: fifteen notches around the slider, twelve units a notch. */
export const DETAIL_WIDTH = 640;
export const DETAIL_HEIGHT = 150;
export const DETAIL_NOTCHES = 15;
export const DETAIL_PITCH = 12;
const D_RACK: Plan = { x: -6, y: 0, w: DETAIL_NOTCHES * DETAIL_PITCH + 12, d: 20, r: 0.6 };
const D_RACK_Z = 3;
const D_RACK_H = 6;
const D_TOP = D_RACK_Z + D_RACK_H;
const D_SCALE: Plan = { x: -6, y: 23, w: DETAIL_NOTCHES * DETAIL_PITCH + 12, d: 9, r: 0.6 };

const detailExtremes: Point3[] = [
  [D_RACK.x - 4, -8, 0],
  [D_RACK.x + D_RACK.w + 4, -8, 0],
  [D_RACK.x - 4, D_SCALE.y + D_SCALE.d + 4, 0],
  [D_RACK.x + D_RACK.w + 4, D_SCALE.y + D_SCALE.d + 4, 0],
  [D_RACK.x, 0, D_TOP + 7],
  [D_RACK.x + D_RACK.w, 0, D_TOP + 7],
];
export const DP = fitProjection(detailExtremes, DETAIL_WIDTH, DETAIL_HEIGHT, { pad: 10, azimuth: 84, elevation: 40 });

const dat = (point: Point3) => iso(point, DP);
const dslab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, DP, steps, bevel);

/** The close-up's notch k centre along its rack. */
export const detailNotchX = (k: number) => (k + 0.5) * DETAIL_PITCH;

export type DetailPart = Part | { kind: 'notch'; index: number; d: string; group?: undefined };

const detail: DetailPart[] = [];
{
  // Two supports under the rack's cut segment.
  for (const x of [8, D_RACK.w - 26]) {
    detail.push({ kind: 'solid', group: 'static', paths: dslab({ x: D_RACK.x + x, y: -4, w: 12, d: 38, r: 1 }, 0, D_RACK_Z, 3, 0.4), tone: 'lo' });
  }
  detail.push({ kind: 'solid', group: 'static', paths: dslab(D_RACK, D_RACK_Z, D_RACK_H, 2, 0.5), tone: 'mid' });
  // The notches: closed slots cut across the rack's top, one per word.
  for (let k = 0; k < DETAIL_NOTCHES; k++) {
    const x = detailNotchX(k);
    const slot: Plan = { x: x - 2.2, y: 2.2, w: 4.4, d: D_RACK.d - 4.4, r: 1.2 };
    detail.push({ kind: 'notch', index: k, d: planOutline(slot, D_TOP, DP, 3) });
  }
  // The scale strip in front: a tick at every notch boundary, rooted on its back edge; every fifth runs across it.
  detail.push({ kind: 'solid', group: 'static', paths: dslab(D_SCALE, D_RACK_Z, 3, 2, 0.4), tone: 'lo' });
  const ticks = topTicks(0, DETAIL_NOTCHES * DETAIL_PITCH, DETAIL_PITCH, 5, D_SCALE.y, D_RACK_Z + 3, [2.4, D_SCALE.d], DP, 'x');
  detail.push({ kind: 'line', group: 'static', d: ticks.minor, tone: 'lo' });
  detail.push({ kind: 'line', group: 'static', d: ticks.major, tone: 'mid' });
  detail.push({ kind: 'slot', group: 'detailSlider' });
  detail.push({ kind: 'slot', group: 'detailNeedle' });
}

export const DETAIL_PARTS: readonly DetailPart[] = detail;

/** The close-up's slider (the lit part) seated in notch k: a block over the rack with its pawl in the slot. */
export function detailSlider(k: number): { body: SolidPaths; pawl: SolidPaths; index: string } {
  const x = detailNotchX(k);
  return {
    pawl: dslab({ x: x - 2, y: 3, w: 4, d: D_RACK.d - 6, r: 1 }, D_TOP - 3, 3.6, 3),
    body: dslab({ x: x - 6.5, y: -2.5, w: 13, d: D_RACK.d + 5, r: 1.6 }, D_TOP + 0.6, 6, 3, 0.6),
    index: pathOf([dat([x, -2.5, D_TOP + 6.6]), dat([x, D_RACK.d + 2.5, D_TOP + 6.6])]),
  };
}

/** The needle at the smooth command, `offset` notches from the close-up's left end: a blade lying on the scale. */
export function detailNeedle(offset: number): { blade: SolidPaths; tip: string } {
  const x = offset * DETAIL_PITCH;
  return {
    blade: dslab({ x: x - 1.2, y: D_SCALE.y + 1.2, w: 2.4, d: D_SCALE.d - 1.2, r: 0.4 }, D_RACK_Z + 3, 0.8, 2),
    tip: pathOf([dat([x, D_SCALE.y + 1.2, D_RACK_Z + 3.8]), dat([x, D_SCALE.y + D_SCALE.d, D_RACK_Z + 3.8])]),
  };
}
