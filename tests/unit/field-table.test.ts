import { describe, expect, it } from 'vitest';
import {
  ARM,
  ARROWS,
  BEADS,
  BEAD_TRAVEL,
  FIELD_COLS,
  FIELD_ROWS,
  FOCUS_MODE,
  FOCUS_SAMPLE,
  HEIGHT,
  JUMP_END,
  NEEDLES,
  P,
  PER_ROD,
  POCKETS,
  POCKET_R,
  RODS,
  SX,
  TOP,
  U,
  WIDTH,
  BENCH_PARTS,
  CARRIAGE_PARTS,
  FAR_TRUCK_PARTS,
  FRONT_PARTS,
  NEAR_TRUCK_PARTS,
  beadAt,
  bridgeAt,
  carriageAt,
  guidesAt,
  hopsOf,
  inPocket,
  inkPath,
  knobAngle,
  leverAt,
  readingAngle,
  readingsOf,
  stylusPoint,
  toWorld,
  type Part,
} from '@/components/iso/figures/field-table';
import { axisVector, iso, pathOf, translateAlong } from '@/components/iso/iso-kit';
import {
  FLOW_MODES,
  MAX_STEPS,
  MIN_STEPS,
  MODE_SPREAD,
  PI06_STEPS,
  PI0_STEPS,
  generateFlowField,
  integrateFlow,
  transportVelocity,
} from '@/lib/flow-matching';

const field = generateFlowField();
const followed = field.samples[0]!;
const steps = Array.from({ length: MAX_STEPS - MIN_STEPS + 1 }, (_, i) => MIN_STEPS + i);
const numbersOf = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('field table model', () => {
  it('follows seeded sample 0 of the unchanged model', () => {
    expect(FOCUS_SAMPLE).toEqual(followed);
    expect(FOCUS_MODE).toEqual(FLOW_MODES[followed.mode]);
    expect(JUMP_END).toEqual(integrateFlow(followed, 1)[1]);
  });

  it('hops along the forward-Euler polyline of the followed sample at every step count', () => {
    for (const k of steps) {
      const hops = hopsOf(k);
      expect(hops).toEqual(integrateFlow(followed, k));
      // The finished ink is exactly that polyline on the plate's top, one action unit to U world units.
      expect(inkPath(hops, k)).toBe(pathOf(hops.map((p) => iso([SX * p.x * U, p.y * U, TOP], P))));
      expect(stylusPoint(hops, k)).toEqual(hops[k]);
    }
  });

  it('turns each vane to the velocity its hop reads, and each hop runs straight along its vane', () => {
    for (const k of steps) {
      const hops = hopsOf(k);
      const readings = readingsOf(k);
      expect(readings).toHaveLength(k);
      readings.forEach((reading, hop) => {
        const v = transportVelocity(followed, hop / k);
        expect(reading.angle).toBeCloseTo(Math.atan2(v.y, SX * v.x), 12);
        expect(readingAngle(k, hop)).toBeCloseTo(reading.angle, 12);
        const a = hops[hop]!;
        const b = hops[hop + 1]!;
        expect(Math.atan2(b.y - a.y, SX * (b.x - a.x))).toBeCloseTo(reading.angle, 9);
        // The vane stands beside the hop's start, never on the ink.
        const [x, y] = toWorld(a);
        expect(Math.hypot(reading.at[0] - x, reading.at[1] - y)).toBeCloseTo(5, 9);
      });
    }
  });

  it('lays the action space on the plate one unit to U world units, action x mirrored', () => {
    expect(SX).toBe(-1);
    for (const point of [followed.noise, followed.target, JUMP_END]) expect(toWorld(point)).toEqual([-point.x * U, point.y * U]);
  });

  it('lands one jump outside the pocket and five or ten small steps inside it', () => {
    expect(POCKET_R).toBe(2 * MODE_SPREAD);
    const landing = (k: number) => hopsOf(k)[k]!;
    expect(inPocket(landing(1))).toBe(false);
    expect(inPocket(landing(2))).toBe(false);
    for (const k of [3, 4, PI06_STEPS, PI0_STEPS, MAX_STEPS]) expect(inPocket(landing(k))).toBe(true);
    // The pocket holds the followed sample's own good move.
    expect(inPocket(followed.target)).toBe(true);
  });

  it('carries the stylus, built at (ARM, 0), to every hop point through the trucks and the carriage', () => {
    for (const k of [1, PI06_STEPS, PI0_STEPS, MAX_STEPS]) {
      for (const point of hopsOf(k)) {
        expect(bridgeAt(point)).toBe(translateAlong(P, [SX * point.x * U - ARM, 0, 0]));
        expect(carriageAt(point)).toBe(translateAlong(P, [0, point.y * U, 0]));
        const [bx, by] = axisVector(P, [SX * point.x * U - ARM, 0, 0]);
        const [cx, cy] = axisVector(P, [0, point.y * U, 0]);
        const built = iso([ARM, 0, TOP], P);
        const target = iso([SX * point.x * U, point.y * U, TOP], P);
        expect(built[0] + bx + cx).toBeCloseTo(target[0], 9);
        expect(built[1] + by + cy).toBeCloseTo(target[1], 9);
      }
    }
  });

  it('turns the field vanes to the learned field at mid-transport', () => {
    expect(ARROWS).toHaveLength(FIELD_COLS * FIELD_ROWS);
    expect(NEEDLES).toHaveLength(ARROWS.length);
  });

  it('counts one bead a hop, up to the slider\'s top end, and points the knob at the step count', () => {
    expect(BEADS).toHaveLength(MAX_STEPS);
    expect(RODS * PER_ROD).toBe(MAX_STEPS);
    expect(beadAt(0)).toBe(translateAlong(P, [-0, 0, 0]));
    expect(beadAt(1)).toBe(translateAlong(P, [-BEAD_TRAVEL, 0, 0]));
    expect(knobAngle(MIN_STEPS)).toBeCloseTo(-0.75 * Math.PI);
    expect(knobAngle(MAX_STEPS)).toBeCloseTo(0.75 * Math.PI);
    for (let k = MIN_STEPS; k < MAX_STEPS; k++) expect(knobAngle(k + 1)).toBeGreaterThan(knobAngle(k));
  });

  it('keeps every drawn coordinate inside the drawing, at every step count and stylus place', () => {
    // The phone stage draws the figure 116% wide with -8% margins: 44 viewBox units a side are cropped there, so
    // nothing may sit within 50 units of either side (4 px at 390 px); top and bottom keep 4 units.
    const SIDE = 50;
    const inside = (d: string) => {
      const values = numbersOf(d);
      for (let i = 0; i + 1 < values.length; i += 2) {
        expect(values[i]).toBeGreaterThanOrEqual(SIDE);
        expect(values[i]).toBeLessThanOrEqual(WIDTH - SIDE);
        expect(values[i + 1]).toBeGreaterThanOrEqual(4);
        expect(values[i + 1]).toBeLessThanOrEqual(HEIGHT - 4);
      }
    };
    const solidPaths = (part: Part) => (part.kind === 'solid' ? [part.paths.fill, part.paths.outline] : part.kind === 'line' ? [part.d] : []);
    for (const part of [...BENCH_PARTS, ...FRONT_PARTS]) for (const d of solidPaths(part)) inside(d);
    for (const pocket of POCKETS) for (const d of [pocket.wall, pocket.rim, pocket.floor]) inside(d);
    for (const k of [1, PI06_STEPS, PI0_STEPS, MAX_STEPS]) {
      for (const point of [hopsOf(k)[0]!, hopsOf(k)[k]!]) {
        const [bx, by] = axisVector(P, [SX * point.x * U - ARM, 0, 0]);
        const [cx, cy] = axisVector(P, [0, point.y * U, 0]);
        const moved = (d: string, dx: number, dy: number) => {
          const values = numbersOf(d);
          return values.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
        };
        const check = (values: number[]) => {
          for (let i = 0; i + 1 < values.length; i += 2) {
            expect(values[i]).toBeGreaterThanOrEqual(SIDE);
            expect(values[i]).toBeLessThanOrEqual(WIDTH - SIDE);
            expect(values[i + 1]).toBeGreaterThanOrEqual(4);
          }
        };
        for (const part of [...FAR_TRUCK_PARTS, ...NEAR_TRUCK_PARTS]) for (const d of solidPaths(part)) check(moved(d, bx, by));
        for (const part of CARRIAGE_PARTS) for (const d of solidPaths(part)) check(moved(d, bx + cx, by + cy));
        const guides = guidesAt(point.y * U);
        for (const paths of [...guides.far, ...guides.near]) check(moved(paths.outline, bx, by));
      }
    }
    const lever = leverAt(1);
    inside(lever.bar.outline);
    inside(lever.ball.outline);
  });
});
