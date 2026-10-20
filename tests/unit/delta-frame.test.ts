import { describe, expect, it } from 'vitest';
import {
  ANGLE_RANGE,
  DELTA_CM,
  MOVE_SECONDS,
  PARK_CM,
  REPLAY_SECONDS,
  RETURN_SECONDS,
  START_CM,
  STILL_ANGLE,
  chordCm,
  endFor,
  gapCm,
  moveFor,
  readoutFor,
  replayAt,
  settledPen,
  valueTextFor,
  type FrameId,
} from '@/lib/delta-frame';
import { ARM_SPAN, bridgeParts, demoParts, inkParts, movingAt, toWorld, PARTS, type LivePart } from '@/components/iso/figures/turret-plotter';
import { valueTextCovers } from '@/components/iso/anatomy-stage';
import { symbolHits } from '@/lib/figure-main-view';

const angles: number[] = [];
for (let a = ANGLE_RANGE[0]; a <= ANGLE_RANGE[1]; a += 5) angles.push(a);
const frames: FrameId[] = ['tool', 'table'];

describe('the delta-frame model', () => {
  it('turns the recorded move with the tool in the tool’s frame, and leaves it along the rails in the table’s', () => {
    for (const angle of angles) {
      const tool = moveFor('tool', angle);
      const table = moveFor('table', angle);
      // The same 5 cm either way: a frame changes where the move points, not how long it is.
      expect(Math.hypot(...tool)).toBeCloseTo(Math.hypot(...DELTA_CM), 12);
      expect(table).toEqual([...DELTA_CM]);
      expect((Math.atan2(tool[1], tool[0]) * 180) / Math.PI).toBeCloseTo(angle, 9);
    }
  });

  it('misses the demonstration by the chord between the two moves: nothing when square, most at 90 degrees', () => {
    for (const angle of angles) {
      expect(gapCm('tool', angle)).toBeCloseTo(0, 12);
      expect(gapCm('table', angle)).toBeCloseTo(chordCm(angle), 12);
    }
    expect(gapCm('table', 0)).toBe(0);
    expect(gapCm('table', 60)).toBeCloseTo(5, 12);
    expect(gapCm('table', 90)).toBeCloseTo(5 * Math.SQRT2, 12);
    for (let k = 1; k < angles.length; k++) expect(gapCm('table', angles[k]!)).toBeGreaterThan(gapCm('table', angles[k - 1]!));
  });

  it('reads the result in plain words on one line, and the slider’s value text says its numbers', () => {
    // At 60 degrees the two moves and the miss make an equilateral triangle: the replay misses by the whole 5 cm.
    expect(readoutFor('table', STILL_ANGLE)).toBe('60 degrees · table frame · 5 cm off');
    expect(readoutFor('tool', STILL_ANGLE)).toBe('60 degrees · tool frame · on the stroke');
    expect(readoutFor('table', 40)).toBe('40 degrees · table frame · 3.4 cm off');
    expect(readoutFor('table', 0)).toBe('0 degrees · table frame · on the stroke');
    for (const frame of frames) {
      for (const angle of angles) {
        const text = readoutFor(frame, angle);
        expect(text.length).toBeLessThanOrEqual(40);
        expect(symbolHits(text)).toEqual([]);
        expect(valueTextCovers(valueTextFor(frame, angle), text)).toBe(true);
      }
    }
  });

  it('replays by lifting the pen back to the start, inking the move to its end and parking the arm, with no jump', () => {
    for (const frame of frames) {
      for (const from of [[...PARK_CM] as [number, number], endFor('table', 40), endFor('tool', 90), [...START_CM] as [number, number]]) {
        let last = replayAt(frame, 40, 0, from);
        expect(last.at[0]).toBeCloseTo(from[0], 12);
        expect(last.down).toBe(false);
        for (let k = 1; k <= 1000; k++) {
          const pen = replayAt(frame, 40, (k / 1000) * (REPLAY_SECONDS + 0.2), from);
          expect(Math.hypot(pen.at[0] - last.at[0], pen.at[1] - last.at[1])).toBeLessThan(0.05);
          if (pen.phase === 'move') expect(pen.down).toBe(true);
          if (pen.phase === 'park') {
            expect(pen.down).toBe(false);
            expect(pen.inked).toBe(1);
          }
          last = pen;
        }
        expect(last).toEqual(settledPen());
      }
      // The move itself ends on the move's end, inked all the way, before the pen lifts and the arm parks.
      const moved = replayAt(frame, 40, RETURN_SECONDS + MOVE_SECONDS);
      expect(moved.at[0]).toBeCloseTo(endFor(frame, 40)[0], 9);
      expect(moved.at[1]).toBeCloseTo(endFor(frame, 40)[1], 9);
      expect(moved.inked).toBe(1);
    }
    expect(settledPen()).toEqual({ at: [...PARK_CM], down: false, inked: 1, phase: 'done' });
  });

  it('parks the arm on its rail beside the paper, clear of the start ring and of every stroke', () => {
    const [px] = toWorld(PARK_CM);
    const [sx] = toWorld(START_CM);
    // The truck stays on its rail.
    expect(px - ARM_SPAN.truckHalf).toBeGreaterThanOrEqual(ARM_SPAN.rail[0]);
    // The carriage, the turret, the tool and the rods all stay left of the start ring...
    expect(px + Math.max(ARM_SPAN.carriageHalf, ARM_SPAN.turretR, ARM_SPAN.toolReach, ARM_SPAN.rodDx)).toBeLessThan(sx - ARM_SPAN.startRing);
    // ...and both strokes run rightward from it, whichever frame and angle.
    for (const frame of frames) for (const angle of angles) expect(endFor(frame, angle)[0]).toBeGreaterThanOrEqual(START_CM[0] - 1e-9);
    // The rods clear the paper's printed area beside the margin.
    expect(px - ARM_SPAN.rodDx).toBeLessThan(ARM_SPAN.paperLeft);
  });
});

describe('the turret plotter drawing', () => {
  const lit = (parts: LivePart[]) => parts.filter((p) => (p.kind === 'solid' && p.lit) || (p.kind === 'line' && p.tone === 'lit'));
  const endsOf = (d: string) => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    return [n.slice(0, 2), n.slice(-2)] as const;
  };

  it('lights one part, the replay’s ink, and nothing else in any pose', () => {
    expect(PARTS.some((p) => (p.kind === 'solid' && p.lit) || (p.kind === 'line' && p.tone === 'lit'))).toBe(false);
    for (const angle of [0, 40, 90]) {
      for (const frame of frames) {
        const live = movingAt({ angle, pen: endFor(frame, angle), lift: 0, inkTo: endFor(frame, angle), inked: 1 });
        const litParts = Object.values(live).flatMap(lit);
        expect(litParts).toHaveLength(1);
        expect(litParts[0]!.kind === 'line' && litParts[0]!.name).toBe('ink');
        expect(bridgeParts(endFor(frame, angle), angle, 0).length).toBe(bridgeParts(START_CM, 0, 4).length);
      }
    }
  });

  it('inks from the start ring to the pen, and draws the demonstration’s stroke along the tool', () => {
    for (const angle of [0, 40, 90]) {
      const ink = inkParts(START_CM, endFor('table', angle), 1).find((p) => p.kind === 'line');
      const demo = demoParts(angle).find((p) => p.kind === 'line' && p.name === 'demo');
      if (!ink || ink.kind !== 'line' || !demo || demo.kind !== 'line') throw new Error('missing strokes');
      const [inkStart] = endsOf(ink.d);
      const [demoStart] = endsOf(demo.d);
      // Both start at the printed ring.
      expect(inkStart[0]).toBeCloseTo(demoStart[0]!, 0);
      expect(inkStart[1]).toBeCloseTo(demoStart[1]!, 0);
    }
    // Nothing inked yet draws nothing.
    expect(inkParts(START_CM, endFor('table', 40), 0)).toEqual([]);
    expect(toWorld([1, 0])[0]).toBeGreaterThan(0);
  });
});
