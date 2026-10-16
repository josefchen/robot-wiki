import { describe, expect, it } from 'vitest';
import {
  CARD,
  CARD_IN_READER,
  CARD_IN_WRITER,
  CARD_RULES,
  EPISODE_SECONDS,
  FALL_AT,
  GAP_PAPER,
  OUTCOMES,
  PARTS,
  RULES,
  RUN_PAPER,
  ROUND_SECONDS,
  SPRINT_SPEED,
  STANDING_SPEED,
  STEPS,
  TARGET_SPEED,
  TRACKING_ERROR,
  cardOutline,
  inkPaths,
  loopFrame,
  notchX,
  paperAfter,
  restFrame,
  speedAt,
} from '@/components/iso/figures/reward-writing-loop';
import { EUREKA_GENERATIONS } from '@/lib/eureka';

const stat = (gen: number, label: string) => EUREKA_GENERATIONS[gen]!.stats.find((s) => s.label === label)!.value;
const sample = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

describe('reward-writing loop: the model behind the drawing', () => {
  it('takes every number from the scripted statistics', () => {
    expect(SPRINT_SPEED).toBe(Number.parseFloat(stat(0, 'base_vel_x (mean)')));
    expect(FALL_AT).toBe(Number.parseFloat(stat(0, 'episode length')));
    expect(STANDING_SPEED).toBe(Number.parseFloat(stat(1, 'base_vel_x (mean)')));
    expect(EPISODE_SECONDS).toBe(Number.parseFloat(stat(1, 'episode length')));
    expect(TRACKING_ERROR).toBe(Number.parseFloat(stat(2, 'velocity tracking error')));
    expect([SPRINT_SPEED, FALL_AT, STANDING_SPEED, EPISODE_SECONDS, TRACKING_ERROR]).toEqual([2.8, 0.4, 0.02, 20, 0.12]);
    expect(OUTCOMES).toEqual(['falls', 'stands', 'walks']);
  });

  it('punches each card with the rules its round of reward code pays or charges for', () => {
    expect(CARD_RULES).toEqual([['speed'], ['speed', 'up', 'fall'], ['target', 'up', 'fall', 'smooth']]);
    for (const [gen, rules] of CARD_RULES.entries()) {
      // The card's outline: four corners, then four points for each notch, at that rule's place on the edge.
      const outline = cardOutline(gen);
      expect(outline).toHaveLength(4 + 4 * rules.length);
      const top = Math.max(...outline.map(([, z]) => z));
      const notched = RULES.filter((_, index) => outline.some(([x, z]) => z < top - 1e-9 && z > top - CARD.notchD - 1e-9 && Math.abs(x - notchX(0, index)) <= CARD.notchW / 2 + 1e-9));
      expect(notched).toEqual(rules);
    }
  });

  it('runs each round as its statistics say: a sprint that falls, a robot standing still, a walk on the target', () => {
    const peak = Math.max(...sample(0, FALL_AT, 0.005).map((s) => speedAt(0, s) ?? 0));
    expect(peak).toBeCloseTo(SPRINT_SPEED, 9);
    // The fall stops it dead: the trace comes back to zero as the run ends.
    expect(speedAt(0, FALL_AT)).toBe(0);
    expect(speedAt(0, FALL_AT + 0.01)).toBeNull();
    expect(sample(0, EPISODE_SECONDS, 0.5).every((s) => speedAt(1, s) === STANDING_SPEED)).toBe(true);
    const run = sample(0, EPISODE_SECONDS, 0.001).map((s) => speedAt(2, s)!);
    const meanMiss = run.reduce((sum, v) => sum + Math.abs(v - TARGET_SPEED), 0) / run.length;
    expect(meanMiss).toBeCloseTo(TRACKING_ERROR, 2);
    // It starts from standing (the trace leaves the zero line) and holds the target once up to speed.
    expect(speedAt(2, 0)).toBe(0);
    const cruising = sample(2, EPISODE_SECONDS, 0.001).map((s) => speedAt(2, s)!);
    const mean = cruising.reduce((sum, v) => sum + v, 0) / cruising.length;
    expect(Math.abs(mean - TARGET_SPEED)).toBeLessThan(0.02);
  });

  it('ends every lap exactly on the next round at rest, with no jump on the way', () => {
    for (const gen of [1, 2]) {
      expect(loopFrame(gen, ROUND_SECONDS)).toEqual(restFrame(gen));
      const end = loopFrame(gen, ROUND_SECONDS - 1e-6);
      const rest = restFrame(gen);
      expect(end.cardX).toBeCloseTo(rest.cardX, 6);
      expect(end.fed).toBeCloseTo(rest.fed, 3);
      expect(end.penLift).toBeCloseTo(rest.penLift, 3);
      expect(end.pose.roll).toBeCloseTo(rest.pose.roll, 6);
      end.pose.feet.forEach((foot, index) => {
        expect(foot.dx).toBeCloseTo(rest.pose.feet[index]!.dx, 3);
        expect(foot.lift).toBeCloseTo(rest.pose.feet[index]!.lift, 3);
      });
      // Every 10 ms, nothing moves more than a smooth motion allows.
      let previous = loopFrame(gen, 0);
      for (const t of sample(0.01, ROUND_SECONDS, 0.01)) {
        const frame = loopFrame(gen, t);
        expect(Math.abs(frame.cardX - previous.cardX)).toBeLessThan(1);
        expect(Math.abs(frame.pinDrop - previous.pinDrop)).toBeLessThan(0.1);
        expect(Math.abs(frame.pose.roll - previous.pose.roll)).toBeLessThan(0.1);
        expect(Math.abs(frame.pose.rise - previous.pose.rise)).toBeLessThan(1);
        expect(Math.abs(frame.fed - previous.fed)).toBeLessThan(0.5);
        expect(Math.abs(frame.penLift - previous.penLift)).toBeLessThan(0.2);
        previous = frame;
      }
    }
  });

  it('swaps the card only while it is inside the writer, after one punch stroke per notch', () => {
    for (const gen of [1, 2]) {
      let swappedAt = -1;
      let strokes = 0;
      let down = false;
      for (const t of sample(0, ROUND_SECONDS, 0.002)) {
        const frame = loopFrame(gen, t);
        if (swappedAt < 0 && frame.cardGen === gen) {
          swappedAt = t;
          expect(frame.cardX).toBeCloseTo(CARD_IN_WRITER, 6);
        }
        if (frame.stroke > 0.9 && !down) strokes++;
        down = frame.stroke > 0.9 ? true : frame.stroke < 0.1 ? false : down;
        // The pins are lifted clear whenever the card moves.
        if (Math.abs(frame.cardX - CARD_IN_READER) > 1e-6) expect(frame.pinDrop).toBe(0);
      }
      expect(swappedAt).toBeGreaterThanOrEqual(STEPS.cardOut[1]);
      expect(strokes).toBe(CARD_RULES[gen]!.length);
    }
  });

  it('feeds one run and one gap of ribbon a round, and writes the fall as a single short spike', () => {
    expect(paperAfter(0)).toBe(RUN_PAPER);
    expect(paperAfter(1) - paperAfter(0)).toBe(RUN_PAPER + GAP_PAPER);
    expect(paperAfter(2) - paperAfter(1)).toBe(RUN_PAPER + GAP_PAPER);
    const strokes = (gen: number) => (inkPaths(paperAfter(gen), gen, EPISODE_SECONDS).match(/M/g) ?? []).length;
    expect([strokes(0), strokes(1), strokes(2)]).toEqual([1, 2, 3]);
    // Round 1's ink spans only the 0.4 seconds before the fall.
    const xs = [...inkPaths(paperAfter(0), 0, EPISODE_SECONDS).matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => Number(m[1]));
    const spanOnScreen = Math.max(...xs) - Math.min(...xs);
    expect(spanOnScreen).toBeLessThan((RUN_PAPER * FALL_AT) / EPISODE_SECONDS * 4);
  });

  it('rests each round on its own robot: on its back, standing, trotting', () => {
    expect(restFrame(0).pose.roll).toBeCloseTo(Math.PI, 12);
    expect(restFrame(1).pose.roll).toBe(0);
    expect(restFrame(1).pose.feet.every((foot) => foot.down)).toBe(true);
    expect(restFrame(2).pose.feet.filter((foot) => foot.down)).toHaveLength(2);
  });

  it('draws no words, only parts', () => {
    const kinds = new Set(PARTS.map((part) => part.kind));
    for (const kind of kinds) expect(['solid', 'line', 'dots', 'wire', 'fill', 'slot']).toContain(kind);
    expect(JSON.stringify(PARTS)).not.toMatch(/<text|<title|<desc|foreignObject/);
  });
});
