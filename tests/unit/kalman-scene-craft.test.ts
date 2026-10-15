import { describe, expect, it } from 'vitest';
import {
  BLEND_TIMING,
  KALMAN_BUMPS,
  KALMAN_PARKED,
  KALMAN_READOUTS,
  KALMAN_SCENE,
  KALMAN_STEP_DETAIL,
  KALMAN_WORKED_NUMBERS,
  jawFaces,
  kalmanFrameAt,
  kalmanLitAt,
} from '@/components/motion/scenes/kalman-predict-update';
import {
  CARRIAGES,
  CART_PARTS,
  JAWS,
  JAW_MIN,
  LANE_X0,
  LANE_X1,
  PAD_VB,
  PARTS,
  U,
  WIDTH,
  HEIGHT,
  bandPath,
  drumMarks,
  pointAt,
  shareParts,
  wheelTurn,
  xOf,
  type DrawnPart,
} from '@/components/iso/figures/kalman-rail';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { kalmanGlyphs } from '@/scripts/generate-motion-equations';
import { symbolHits } from '@/lib/figure-main-view';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

const SPANS = beatSpans(KALMAN_SCENE.beats);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const same = (actual: { mean: number; sigma: number }, expected: { mean: number; sigma: number }) => {
  expect(actual.mean).toBeCloseTo(expected.mean, 9);
  expect(actual.sigma).toBeCloseTo(expected.sigma, 9);
};
/** Every x and y a path string visits, in viewBox units. */
const pointsOf = (d: string) => {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: Array<[number, number]> = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) points.push([numbers[index], numbers[index + 1]]);
  return points;
};
const partPoints = (part: DrawnPart): Array<[number, number]> => {
  if (part.kind === 'solid') return pointsOf(part.paths.outline);
  if (part.kind === 'line') return pointsOf(part.d);
  if (part.kind === 'dots') return part.points.map(([x, y]) => [x, y]);
  return [part.from, part.to, ...part.via].map(([x, y]) => [x, y]);
};

describe('Kalman estimating rail scene craft', () => {
  it('keeps the five beats in teaching order and ends on the poster', () => {
    expect(KALMAN_SCENE.beats.map((beat) => beat.id)).toEqual(['guess', 'measure', 'blend', 'in-symbols', 'recap']);
    expect(posterTime(SPANS)).toBe(END);
  });

  it('carries an object across every beat boundary and changes it in the next beat', () => {
    // Guess: the cart tows the guess caliper from the prior to the prediction, and its jaws open.
    same(kalmanFrameAt(at(0, 0)).guess, KALMAN_BUMPS.prior);
    same(kalmanFrameAt(at(0, 1)).guess, KALMAN_BUMPS.guess);
    expect(kalmanFrameAt(at(0, 1)).cart).toBeCloseTo(KALMAN_BUMPS.guess.mean, 9);
    // Measure: the guess stays, and the reading caliper runs out of its park to the reading.
    same(kalmanFrameAt(at(1, 0)).reading, KALMAN_PARKED.reading);
    expect(kalmanFrameAt(at(1, 0)).readingShown).toBe(0);
    expect(kalmanFrameAt(at(1, 0.5)).reading.mean).toBeGreaterThan(KALMAN_PARKED.reading.mean);
    same(kalmanFrameAt(at(1, 1)).reading, KALMAN_BUMPS.reading);
    same(kalmanFrameAt(at(1, 1)).guess, KALMAN_BUMPS.guess);
    expect(kalmanFrameAt(at(1, 1)).readingShown).toBe(1);
    // Blend: the blend caliper copies the guess exactly, then lands on the filter's update.
    same(kalmanFrameAt(at(2, 0)).blend, KALMAN_PARKED.blend);
    same(kalmanFrameAt(at(2, BLEND_TIMING.copy)).blend, KALMAN_BUMPS.guess);
    same(kalmanFrameAt(at(2, BLEND_TIMING.ruleTo)).blend, KALMAN_BUMPS.guess);
    same(kalmanFrameAt(at(2, 1)).blend, KALMAN_BUMPS.blend);
    // In symbols: the share is measured out along the rule; the recap holds it.
    expect(kalmanFrameAt(at(3, 0)).measured).toBe(0);
    expect(kalmanFrameAt(at(3, 0.5)).measured).toBeGreaterThan(0);
    expect(kalmanFrameAt(at(3, 1)).measured).toBeCloseTo(KALMAN_STEP_DETAIL.gain, 3);
    expect(kalmanFrameAt(END)).toEqual(kalmanFrameAt(at(3, 1)));
  });

  it('lands every beat end on the model\'s own states, never mid-run, where a reduced-motion step stops', () => {
    const states = (list: Array<{ mean: number; sigma: number }>) => (bump: { mean: number; sigma: number }) =>
      list.some((state) => Math.abs(state.mean - bump.mean) < 1e-9 && Math.abs(state.sigma - bump.sigma) < 1e-9);
    const guessAt = states([KALMAN_BUMPS.prior, KALMAN_BUMPS.guess]);
    const readingAt = states([KALMAN_PARKED.reading, KALMAN_BUMPS.reading]);
    const blendAt = states([KALMAN_PARKED.blend, KALMAN_BUMPS.guess, KALMAN_BUMPS.blend]);
    for (const span of [{ end: 0, beat: { id: 'start' } }, ...SPANS]) {
      const frame = kalmanFrameAt(span.end);
      expect(guessAt(frame.guess), span.beat.id).toBe(true);
      expect(readingAt(frame.reading), span.beat.id).toBe(true);
      expect(blendAt(frame.blend), span.beat.id).toBe(true);
      expect(frame.beam, span.beat.id).toBe(0);
      for (const share of [frame.readingShown, frame.blendShown, frame.share, frame.settled]) expect([0, 1]).toContain(share);
      expect([0, Number(KALMAN_STEP_DETAIL.gain.toFixed(3))]).toContain(frame.measured);
    }
    // Each beat's own change is complete at its end.
    expect(kalmanFrameAt(SPANS[2].end).settled).toBe(1);
    expect(kalmanFrameAt(SPANS[2].end).share).toBe(1);
    expect(kalmanFrameAt(SPANS[2].end).blendShown).toBe(1);
    expect(kalmanFrameAt(SPANS[1].end).blendShown).toBe(0);
    expect(kalmanFrameAt(SPANS[0].end).readingShown).toBe(0);
  });

  it('keeps the whole drawing inside the 4 px stage margin on the narrowest full-size stage, at every moment', () => {
    const narrowest = MOTION_STAGE_TYPE.fullSizeMinStagePx / WIDTH;
    expect(PAD_VB * narrowest).toBeGreaterThanOrEqual(4);
    const statics = PARTS.flatMap((part) => (part.kind === 'slot' ? [] : partPoints(part)));
    const xs = statics.map(([x]) => x);
    const ys = statics.map(([, y]) => y);
    for (const inset of [Math.min(...xs), WIDTH - Math.max(...xs), Math.min(...ys), HEIGHT - Math.max(...ys)]) {
      expect(inset * narrowest).toBeGreaterThanOrEqual(4);
    }
    // The moving calipers never leave their lanes, in any frame.
    for (let t = 0; t <= END; t += 25) {
      const frame = kalmanFrameAt(t);
      for (const bump of [frame.guess, frame.reading, frame.blend]) {
        const { left, right } = jawFaces(bump);
        expect(left - 5.4, `t=${t}`).toBeGreaterThan(LANE_X0);
        expect(right + 5.4, `t=${t}`).toBeLessThan(LANE_X1);
        expect(bump.sigma * U).toBeGreaterThanOrEqual(JAW_MIN - 1e-9);
      }
    }
  });

  it('stands each caliper\'s jaws one spread either side of its estimate, and the band fills exactly that gap', () => {
    const poster = kalmanFrameAt(END);
    for (const [lane, bump, expected] of [
      ['guess', poster.guess, KALMAN_BUMPS.guess],
      ['reading', poster.reading, KALMAN_BUMPS.reading],
      ['blend', poster.blend, KALMAN_BUMPS.blend],
    ] as const) {
      same(bump, expected);
      const { left, centre, right } = jawFaces(bump);
      expect(centre).toBeCloseTo(xOf(expected.mean), 9);
      expect(right - left).toBeCloseTo(2 * expected.sigma * U, 9);
      // The band is the mark: its two ends are the jaws' inner faces.
      expect(bandPath(lane, centre, (right - left) / 2)).toBe(bandPath(lane, xOf(expected.mean), expected.sigma * U));
      expect(JAWS[lane].left.length).toBeGreaterThan(1);
      expect(CARRIAGES[lane].length).toBeGreaterThan(1);
    }
    // Narrower than both: the blend's jaws are the closest.
    expect(KALMAN_BUMPS.blend.sigma).toBeLessThan(Math.min(KALMAN_BUMPS.guess.sigma, KALMAN_BUMPS.reading.sigma));
  });

  it('lands the blend on the share rule at the gain\'s share of the way from the guess to the reading', () => {
    const { guess, reading, blend } = KALMAN_BUMPS;
    const rule = shareParts(xOf(guess.mean), xOf(reading.mean));
    // The rule's two ends are the guess's and the reading's stops: the pointer's line runs down its middle.
    const [backFrom, backTo, frontTo, frontFrom] = pointsOf(rule.top);
    const middle = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (const [end, x] of [[middle(backFrom, frontFrom), guess.mean], [middle(backTo, frontTo), reading.mean]] as const) {
      expect(end[0]).toBeCloseTo(pointAt(xOf(x))[0], 0);
      expect(end[1]).toBeCloseTo(pointAt(xOf(x))[1], 0);
    }
    // The pointer stops at the gain's share of the rule's length, on screen as in the world.
    const share = (xOf(blend.mean) - xOf(guess.mean)) / (xOf(reading.mean) - xOf(guess.mean));
    expect(share).toBeCloseTo(KALMAN_STEP_DETAIL.gain, 6);
    const [tip, from, to] = [blend.mean, guess.mean, reading.mean].map((x) => pointAt(xOf(x)));
    expect((tip[0] - from[0]) / (to[0] - from[0])).toBeCloseTo(KALMAN_STEP_DETAIL.gain, 2);
    // The rule is laid before the blend leaves the guess, and the share is measured out only after it lands.
    expect(kalmanFrameAt(at(2, BLEND_TIMING.ruleTo)).share).toBe(1);
    expect(kalmanFrameAt(at(2, BLEND_TIMING.copy)).share).toBe(0);
    // The copy is at full ink before the rule is laid, and the rule is laid before the blend leaves the guess.
    expect(kalmanFrameAt(at(2, BLEND_TIMING.copy)).blendShown).toBe(1);
    expect(BLEND_TIMING.copy).toBeLessThan(BLEND_TIMING.ruleFrom);
    for (let t = SPANS[2].start; t <= SPANS[2].end; t += 20) expect(kalmanFrameAt(t).measured).toBe(0);
  });

  it('rolls the cart the predicted distance, and its odometer and wheels count the roll', () => {
    const rolled = (KALMAN_BUMPS.guess.mean - KALMAN_BUMPS.prior.mean) * U;
    expect(kalmanFrameAt(0).rolled).toBe(0);
    expect(kalmanFrameAt(SPANS[0].end).rolled).toBeCloseTo(rolled, 3);
    // From where it was and how fast it was going: the predicted move is the velocity estimate times one step.
    expect(KALMAN_BUMPS.guess.mean - KALMAN_BUMPS.prior.mean).toBeCloseTo(KALMAN_STEP_DETAIL.prior.mean[1], 6);
    expect(wheelTurn(rolled)).toBeGreaterThan(Math.PI / 4);
    expect(drumMarks(rolled)).not.toBe(drumMarks(0));
    // The cart does not move again after it predicts.
    for (let t = SPANS[0].end; t <= END; t += 50) expect(kalmanFrameAt(t).cart).toBeCloseTo(KALMAN_BUMPS.guess.mean, 9);
    expect(CART_PARTS.length).toBeGreaterThan(8);
  });

  it('lights one part per beat: the odometer, then the rangefinder, then the share rule', () => {
    expect(kalmanLitAt(at(0, 0.5))).toBe('odometer');
    expect(kalmanLitAt(at(1, 0.5))).toBe('rangefinder');
    for (const beat of [2, 3, 4]) expect(kalmanLitAt(at(beat, 0.5))).toBe('share');
    // The beam shows only while the rangefinder measures.
    for (let t = 0; t <= END; t += 25) {
      if (t <= SPANS[1].start || t >= SPANS[1].end) expect(kalmanFrameAt(t).beam, `t=${t}`).toBe(0);
    }
    expect(kalmanFrameAt(at(1, 0.5)).beam).toBe(1);
  });

  it('says each beat in plain words, with no symbol in the readout', () => {
    expect(KALMAN_READOUTS).toHaveLength(SPANS.length);
    for (const line of KALMAN_READOUTS) expect(symbolHits(line), line).toEqual([]);
    expect(KALMAN_READOUTS[3]).toBe(`0.03 plus 62% of the way to 0.82 is 0.52`);
    expect(KALMAN_READOUTS[4]).toBe('Jaws either side: guess 1.27 · reading 1.00 · blend 0.79');
  });

  it('writes the filter\'s own numbers, and they satisfy the rule they stand for', () => {
    const { blend, guess, gain, reading } = KALMAN_WORKED_NUMBERS;
    expect([kalmanGlyphs.kalmanBlend, kalmanGlyphs.kalmanGuess, kalmanGlyphs.kalmanGain, kalmanGlyphs.kalmanReading])
      .toEqual([blend, guess, gain, reading]);
    expect(gain).toBe(KALMAN_STEP_DETAIL.gain.toFixed(2));
    expect(reading).toBe((KALMAN_STEP_DETAIL.measurement as number).toFixed(2));
    expect((Number(guess) + Number(gain) * (Number(reading) - Number(guess))).toFixed(2)).toBe(blend);
  });
});
