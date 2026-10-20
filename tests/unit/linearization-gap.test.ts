import { describe, expect, it } from 'vitest';
import {
  ARM_CM,
  OPENING_SPREAD,
  SPREAD_RANGE,
  SPREAD_STEP,
  SWING_SECONDS,
  clampSpread,
  edgeMiss,
  handAt,
  missCm,
  readoutFor,
  swingAt,
  tangentAt,
  valueTextFor,
} from '@/lib/linearization-gap';
import { DIAL_TURN_CM, PARTS, cursorAt, dialAngle, movingAt, tipAt, type StandPart } from '@/components/iso/figures/tangent-rule-table';
import { symbolHits } from '@/lib/figure-main-view';

const SPREADS = [5, 10, 15, 20, 25, 30, 35, 40];

describe('linearization gap model', () => {
  it('puts the hand on the arc and the tangent on the straight line through the estimate', () => {
    for (const deg of [-40, -12.5, 0, 7, 40]) {
      const [hx, hy] = handAt(deg);
      expect(Math.hypot(hx, hy)).toBeCloseTo(ARM_CM, 9);
      const [tx, ty] = tangentAt(deg);
      expect(tx).toBe(ARM_CM);
      // Along the tangent the straight line covers the arc's own length.
      expect(ty).toBeCloseTo((ARM_CM * deg * Math.PI) / 180, 9);
    }
    expect(missCm(0)).toBe(0);
  });

  it('misses by the same amount either side, and by about the square of the spread', () => {
    for (const deg of SPREADS) expect(missCm(-deg)).toBeCloseTo(missCm(deg), 9);
    // Small angles: the miss approaches L·Δ²/2.
    const small = 2;
    const rad = (small * Math.PI) / 180;
    expect(missCm(small) / ((ARM_CM * rad * rad) / 2)).toBeCloseTo(1, 2);
    // Twice the spread, about four times the miss.
    expect(missCm(30) / missCm(15)).toBeGreaterThan(3.8);
    expect(missCm(30) / missCm(15)).toBeLessThan(4.1);
    for (let k = 1; k < SPREADS.length; k++) expect(missCm(SPREADS[k]!)).toBeGreaterThan(missCm(SPREADS[k - 1]!));
  });

  it('reads the miss at the edge of the opening spread, in plain words that the slider’s value text covers', () => {
    expect(SPREADS).toContain(OPENING_SPREAD);
    expect(edgeMiss(30)).toBe(6.8);
    expect(edgeMiss(15)).toBe(1.7);
    for (const spread of SPREADS) {
      const readout = readoutFor(spread);
      expect(symbolHits(readout)).toEqual([]);
      for (const number of readout.match(/\d+(?:\.\d+)?/g) ?? []) expect(valueTextFor(spread)).toContain(number);
    }
    expect(clampSpread(33)).toBe(35);
    expect(clampSpread(1)).toBe(SPREAD_RANGE[0]);
    expect(clampSpread(90)).toBe(SPREAD_RANGE[1]);
    expect(SPREAD_STEP).toBe(5);
  });

  it('swings from the + stop across the spread and back, ending where it began', () => {
    for (const spread of [5, 30, 40]) {
      expect(swingAt(spread, 0)).toBeCloseTo(spread, 9);
      expect(swingAt(spread, SWING_SECONDS / 2)).toBeCloseTo(-spread, 9);
      expect(swingAt(spread, SWING_SECONDS)).toBeCloseTo(spread, 9);
      let last = swingAt(spread, 0);
      for (let t = 0.01; t <= SWING_SECONDS; t += 0.01) {
        const angle = swingAt(spread, t);
        expect(Math.abs(angle)).toBeLessThanOrEqual(spread + 1e-9);
        // No jump: at most 2π·spread/SWING_SECONDS degrees a second, 0.63 of a degree in 10 ms at 40.
        expect(Math.abs(angle - last)).toBeLessThan(((2 * Math.PI * spread) / SWING_SECONDS) * 0.01 + 1e-9);
        last = angle;
      }
    }
  });
});

describe('tangent-rule stand', () => {
  it('draws the cursor and the arm’s tip apart by exactly the model’s miss, in drawing units', () => {
    for (const deg of [-40, -15, 0, 15, 40]) {
      const a = cursorAt(deg);
      const b = tipAt(deg);
      const drawn = Math.hypot(a[0] - b[0], a[2] - b[2]);
      // The stand draws 2 units a centimetre.
      expect(drawn / 2).toBeCloseTo(missCm(deg), 6);
    }
  });

  it('reads the miss on the gauge: the needle turns once for 15 cm, so it stands at the model\u2019s miss', () => {
    expect(DIAL_TURN_CM).toBe(15);
    for (const deg of [-40, -30, -15, 0, 15, 30, 40]) {
      expect(dialAngle(deg)).toBeCloseTo((missCm(deg) / 15) * Math.PI * 2, 9);
      // The widest spread stays inside one turn, so a reading is never ambiguous.
      expect(dialAngle(deg)).toBeLessThan(Math.PI * 2);
    }
    // At the opening spread the needle stands at 6.8 of the dial's 15 cm.
    expect((dialAngle(OPENING_SPREAD) / (Math.PI * 2)) * 15).toBeCloseTo(edgeMiss(OPENING_SPREAD), 1);
  });

  it('engraves the true arc as a groove on the protractor\u2019s face', () => {
    expect(PARTS.filter((part) => part.kind === 'face' && part.name === 'groove')).toHaveLength(1);
  });

  it('has one lit assembly, the gauge\u2019s plunger and needle, and no words', () => {
    for (const spread of SPREADS) {
      const parts = Object.values(movingAt({ spread, angle: spread })).flat() as StandPart[];
      const lit = parts.filter((part) => part.kind === 'solid' && part.lit).map((part) => (part as { name?: string }).name);
      // The plunger shows once the miss is more than a hair: from 10 degrees on.
      expect(lit.sort()).toEqual(spread > 5 ? ['feeler', 'needle'] : ['needle']);
    }
    const atEstimate = Object.values(movingAt({ spread: 30, angle: 0 })).flat() as StandPart[];
    expect(atEstimate.some((part) => (part as { name?: string }).name === 'feeler')).toBe(false);
    expect(PARTS.filter((part) => part.kind === 'solid' && part.lit)).toHaveLength(0);
    expect(JSON.stringify([PARTS, movingAt({ spread: 30, angle: 30 })])).not.toMatch(/<text|<title|<desc|foreignObject/);
  });
});
