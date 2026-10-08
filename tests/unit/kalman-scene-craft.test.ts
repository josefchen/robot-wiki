import { describe, expect, it } from 'vitest';
import {
  CAMERA_WINDOW,
  FOCUS_BOX,
  FOCUS_ZOOM,
  KALMAN_BUMPS,
  KALMAN_SCENE,
  KALMAN_STEP_DETAIL,
  KALMAN_WORKED_NUMBERS,
  bumpHeight,
  kalmanCameraAt,
  kalmanCameraTransform,
  kalmanFrameAt,
  kalmanGlyphsAt,
} from '@/components/motion/scenes/kalman-predict-update';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { kalmanGlyphs } from '@/scripts/generate-motion-equations';
import { MOTION_CAMERA, MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

const SPANS = beatSpans(KALMAN_SCENE.beats);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const parse = (transform: string) => {
  const [tx, ty, scale] = transform.match(/-?[\d.]+/g)!.map(Number);
  return { tx, ty, scale };
};
const same = (actual: { mean: number; sigma: number }, expected: { mean: number; sigma: number }) => {
  expect(actual.mean).toBeCloseTo(expected.mean, 9);
  expect(actual.sigma).toBeCloseTo(expected.sigma, 9);
};
const shownIds = (t: number) => kalmanGlyphsAt(t).filter((glyph) => glyph.opacity > 0).map((glyph) => glyph.id);

describe('Kalman flagship scene craft', () => {
  it('keeps the five beats in teaching order and ends on the poster', () => {
    expect(KALMAN_SCENE.beats.map((beat) => beat.id)).toEqual(['guess', 'measure', 'blend', 'in-symbols', 'recap']);
    expect(posterTime(SPANS)).toBe(END);
  });

  it('carries an object across every beat boundary and changes it in the next beat', () => {
    // Guess: the prior widens into the prediction.
    same(kalmanFrameAt(at(0, 0)).guess, KALMAN_BUMPS.prior);
    same(kalmanFrameAt(at(0, 1)).guess, KALMAN_BUMPS.guess);
    // Measure: the guess stays and the reading rises out of the track.
    expect(kalmanFrameAt(at(1, 0)).rise).toBe(0);
    expect(kalmanFrameAt(at(1, 0.5)).rise).toBeGreaterThan(0);
    expect(kalmanFrameAt(at(1, 1)).rise).toBe(1);
    // Blend: the blend leaves the guess and slides to the filter's update, the robot with it.
    same(kalmanFrameAt(at(2, 0.3)).blend, KALMAN_BUMPS.guess);
    same(kalmanFrameAt(at(2, 1)).blend, KALMAN_BUMPS.blend);
    expect(kalmanFrameAt(at(2, 1)).robot).toBeCloseTo(KALMAN_BUMPS.blend.mean, 9);
    // In symbols and the recap: the formula is written, rewritten and leaves.
    expect(shownIds(at(3, 0.3))).toContain('reading');
    expect(shownIds(at(3, 1))).toContain('reading-symbol');
    expect(shownIds(END)).toEqual([]);
  });

  it('keeps the camera home at every beat end and outside the blend beat', () => {
    for (const span of SPANS) {
      expect(kalmanCameraAt(span.end), span.beat.id).toBe(0);
      expect(kalmanCameraTransform(span.end)).toBe('translate(0 0) scale(1)');
    }
    expect(kalmanCameraAt(at(1, 0.5))).toBe(0);
    expect(kalmanCameraAt(at(3, 0.5))).toBe(0);
  });

  it('keeps the camera window inside the stage margin on the narrowest full-size stage', () => {
    const narrowest = MOTION_STAGE_TYPE.fullSizeMinStagePx / 340;
    for (const inset of [CAMERA_WINDOW.x, CAMERA_WINDOW.y, 340 - CAMERA_WINDOW.x - CAMERA_WINDOW.width]) {
      expect(inset * narrowest).toBeGreaterThanOrEqual(4);
    }
  });

  it('closes in on the gap from the guess to the reading, within the zoom token, and lands the blend in view', () => {
    expect(FOCUS_ZOOM).toBeGreaterThan(1.5);
    expect(FOCUS_ZOOM).toBeLessThanOrEqual(MOTION_CAMERA.focusMaxZoom);
    expect(kalmanCameraAt(at(2, 0.4))).toBe(1);
    const hold = parse(kalmanCameraTransform(at(2, 0.4)));
    expect(hold.scale).toBeCloseTo(FOCUS_ZOOM, 2);
    // The whole focus box, every peak down to the bracket, stays in the camera window while it holds.
    // The transform is written to three decimals of scale, which can push an edge by about 0.1 unit.
    const tolerance = 0.15;
    for (const [x, y] of [[FOCUS_BOX.x, FOCUS_BOX.y], [FOCUS_BOX.x + FOCUS_BOX.width, FOCUS_BOX.y + FOCUS_BOX.height]]) {
      expect(hold.tx + x * hold.scale).toBeGreaterThanOrEqual(CAMERA_WINDOW.x - tolerance);
      expect(hold.tx + x * hold.scale).toBeLessThanOrEqual(CAMERA_WINDOW.x + CAMERA_WINDOW.width + tolerance);
      expect(hold.ty + y * hold.scale).toBeGreaterThanOrEqual(CAMERA_WINDOW.y - tolerance);
      expect(hold.ty + y * hold.scale).toBeLessThanOrEqual(CAMERA_WINDOW.y + CAMERA_WINDOW.height + tolerance);
    }
    const peaks = [KALMAN_BUMPS.guess, KALMAN_BUMPS.reading, KALMAN_BUMPS.blend].map((bump) => 140 - bumpHeight(bump, bump.mean));
    expect(Math.min(...peaks)).toBeGreaterThanOrEqual(FOCUS_BOX.y);
    // In and back out with smooth easing: halfway in is not halfway zoomed.
    const halfIn = parse(kalmanCameraTransform(at(2, 0.2)));
    expect(halfIn.scale).toBeGreaterThan(1);
    expect(halfIn.scale).toBeLessThan(FOCUS_ZOOM);
    // The blend slides while the camera holds, not while it moves.
    same(kalmanFrameAt(at(2, 0.3)).blend, KALMAN_BUMPS.guess);
    same(kalmanFrameAt(at(2, 0.6)).blend, KALMAN_BUMPS.blend);
  });

  it('clears the stage-pinned labels before the camera moves and brings them back once it is home', () => {
    for (let step = 0; step <= 400; step += 1) {
      const t = at(2, step / 400);
      if (kalmanCameraAt(t) === 0) continue;
      const frame = kalmanFrameAt(t);
      expect([frame.guessLabel, frame.sensor, frame.blendLabel], `k=${step / 400}`).toEqual([0, 0, 0]);
    }
    expect(kalmanFrameAt(at(2, 0.05)).guessLabel).toBeGreaterThan(0);
    expect(kalmanFrameAt(at(2, 0.95)).blendLabel).toBeGreaterThan(0);
  });

  it('writes the worked step, then turns its numbers into the rule, moving only the shared signs', () => {
    const written = kalmanGlyphsAt(at(3, 0.3));
    const sliding = kalmanGlyphsAt(at(3, 0.65));
    const done = kalmanGlyphsAt(at(3, 1));
    expect(written.filter((glyph) => glyph.matched).map((glyph) => glyph.id))
      .toEqual(['equals', 'plus', 'open', 'minus', 'close']);
    expect(written.filter((glyph) => glyph.opacity === 1).map((glyph) => glyph.id).sort())
      .toEqual(['blend', 'close', 'equals', 'gain', 'guess', 'guess-again', 'minus', 'open', 'plus', 'reading']);
    for (const [index, glyph] of sliding.entries()) {
      if (glyph.matched) {
        const [from, to] = [written[index].x, done[index].x];
        expect(Math.min(from, to) < glyph.x && glyph.x < Math.max(from, to), glyph.id).toBe(true);
        expect(glyph.opacity).toBe(1);
      } else {
        expect(glyph.opacity, glyph.id).toBe(0);
      }
    }
    expect(done.filter((glyph) => glyph.opacity === 1).map((glyph) => glyph.id).sort()).toEqual([
      'close', 'equals', 'estimate', 'gain-symbol', 'minus', 'open', 'plus', 'prediction', 'prediction-again', 'reading-symbol',
    ]);
    const order = ['estimate', 'equals', 'prediction', 'plus', 'gain-symbol', 'open', 'reading-symbol', 'minus', 'prediction-again', 'close'];
    const xs = order.map((id) => done.find((glyph) => glyph.id === id)!.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('staggers the writing by the lag token, left to right', () => {
    const early = kalmanGlyphsAt(at(3, 0.1));
    const first = early.find((glyph) => glyph.id === 'blend')!.opacity;
    const last = early.find((glyph) => glyph.id === 'close')!.opacity;
    expect(first).toBeGreaterThan(last);
  });

  it('never paints two glyphs over each other, and keeps the row on the stage', () => {
    for (let step = 0; step <= 200; step += 1) {
      const shown = kalmanGlyphsAt(at(3, step / 200)).filter((glyph) => glyph.opacity > 0);
      for (const [index, first] of shown.entries()) {
        expect(first.x).toBeGreaterThanOrEqual(CAMERA_WINDOW.x);
        expect(first.x + first.width).toBeLessThanOrEqual(CAMERA_WINDOW.x + CAMERA_WINDOW.width);
        for (const second of shown.slice(index + 1)) {
          const overlap = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
          expect(overlap, `${first.id}/${second.id} at ${step / 200}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  it('shows no symbol before the symbols beat or on the finished frame', () => {
    for (const t of [0, SPANS[2].end, at(4, 0.5), END]) {
      expect(shownIds(t), `t=${t}`).toEqual([]);
    }
    expect(kalmanFrameAt(at(4, 0.2)).annotation).toBe(0);
    expect(kalmanFrameAt(END).annotation).toBe(1);
  });

  it('writes the filter\'s own numbers, and they satisfy the rule they turn into', () => {
    const { blend, guess, gain, reading } = KALMAN_WORKED_NUMBERS;
    expect([kalmanGlyphs.kalmanBlend, kalmanGlyphs.kalmanGuess, kalmanGlyphs.kalmanGain, kalmanGlyphs.kalmanReading])
      .toEqual([blend, guess, gain, reading]);
    expect(gain).toBe(KALMAN_STEP_DETAIL.gain.toFixed(2));
    expect(reading).toBe((KALMAN_STEP_DETAIL.measurement as number).toFixed(2));
    expect((Number(guess) + Number(gain) * (Number(reading) - Number(guess))).toFixed(2)).toBe(blend);
  });
});
