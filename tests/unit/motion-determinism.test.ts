import { describe, expect, it } from 'vitest';
import { createSceneRng, mulberry32 } from '@/components/motion/rng';
import {
  MOTION_TIMING,
  beatSpans,
  locate,
  posterTime,
  stepTarget,
  totalDuration,
  type SceneBeat,
} from '@/components/motion/timeline';

describe('seeded rng determinism', () => {
  it('produces identical streams for identical seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('produces different streams for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const values = Array.from({ length: 10 }, () => a());
    const other = Array.from({ length: 10 }, () => b());
    expect(values).not.toEqual(other);
  });

  it('stays inside [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('derives stable per-scene streams', () => {
    const scene = createSceneRng('kalman-predict-update', 'forward-noise');
    const first = [scene.gaussian(), scene.gaussian(), scene.uniform()];
    const again = createSceneRng('kalman-predict-update', 'forward-noise');
    expect(first).toEqual([again.gaussian(), again.gaussian(), again.uniform()]);
  });

  it('separates streams by name', () => {
    const one = createSceneRng('scene', 'a');
    const two = createSceneRng('scene', 'b');
    expect(one.uniform()).not.toBe(two.uniform());
  });
});

const BEATS: SceneBeat[] = [
  { id: 'prior', caption: 'The prior belief.', duration: 'default' },
  { id: 'predict', caption: 'Predict moves the mean.', duration: 'long' },
  { id: 'measurement', caption: 'A measurement arrives.', duration: 'short' },
  { id: 'update', caption: 'Update fuses both.', duration: 'default' },
  { id: 'recap', caption: 'The recursion.', duration: 'long' },
];

describe('timeline math', () => {
  const spans = beatSpans(BEATS);

  it('resolves beat durations from the token ladder', () => {
    expect(spans.map((s) => s.duration)).toEqual([
      MOTION_TIMING.beat,
      MOTION_TIMING.beatLong,
      MOTION_TIMING.beatShort,
      MOTION_TIMING.beat,
      MOTION_TIMING.beatLong,
    ]);
  });

  it('lays beats end to end with no gaps', () => {
    expect(spans[0].start).toBe(0);
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i].start).toBe(spans[i - 1].end);
    }
    expect(totalDuration(spans)).toBe(spans[spans.length - 1].end);
  });

  it('locates a time inside its beat with raw and eased progress', () => {
    const atMiddle = locate(spans, spans[1].start + MOTION_TIMING.beatLong / 2);
    expect(atMiddle.index).toBe(1);
    expect(atMiddle.raw).toBeCloseTo(0.5, 9);
    expect(atMiddle.eased).toBeGreaterThan(0.4);
    expect(atMiddle.eased).toBeLessThan(0.6);
  });

  it('clamps times outside the scene', () => {
    expect(locate(spans, -5).index).toBe(0);
    expect(locate(spans, -5).raw).toBe(0);
    expect(locate(spans, Number.MAX_SAFE_INTEGER).index).toBe(
      spans.length - 1,
    );
    expect(locate(spans, Number.MAX_SAFE_INTEGER).raw).toBe(1);
  });

  it('keeps simulation beats linear', () => {
    // A beat flagged linear reports raw progress as its own eased value so
    // simulation time is never eased anywhere downstream.
    const linear = beatSpans([
      { id: 'roll', caption: 'Rollout.', duration: 'default', linear: true },
    ]);
    const half = locate(linear, MOTION_TIMING.beat / 2);
    expect(half.eased).toBe(half.raw);
  });

  it('places the poster at the final frame of the last beat', () => {
    expect(posterTime(spans)).toBe(totalDuration(spans));
  });

  it('steps forward onto the next beat end-state', () => {
    const total = totalDuration(spans);
    expect(stepTarget(spans, 0, 1)).toBe(spans[0].end);
    expect(stepTarget(spans, spans[0].end, 1)).toBe(spans[1].end);
    expect(stepTarget(spans, spans[2].end + 10, 1)).toBe(spans[3].end);
    expect(stepTarget(spans, total, 1)).toBe(total);
  });

  it('steps back onto the previous beat end-state', () => {
    expect(stepTarget(spans, totalDuration(spans), -1)).toBe(
      spans[spans.length - 2].end,
    );
    expect(stepTarget(spans, spans[1].end, -1)).toBe(spans[0].end);
    expect(stepTarget(spans, 0, -1)).toBe(0);
  });

  it('is a pure function of its inputs', () => {
    expect(beatSpans(BEATS)).toEqual(spans);
  });
});
