import { describe, expect, it } from 'vitest';
import {
  CAMERA_WINDOW,
  DIFFUSION_SCENE,
  FOCUS_ZOOM,
  WORKED_DISTANCES,
  WORKED_GUESS,
  diffusionCameraAt,
  diffusionCameraTransform,
  diffusionGlyphsAt,
  diffusionSamplePointAt,
} from '@/components/motion/scenes/diffusion-denoising';
import { beatSpans } from '@/components/motion/timeline';
import { MOTION_CAMERA, MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

const SPANS = beatSpans(DIFFUSION_SCENE.beats);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const parse = (transform: string) => {
  const [tx, ty, scale] = transform.match(/-?[\d.]+/g)!.map(Number);
  return { tx, ty, scale };
};

describe('diffusion flagship scene craft', () => {
  it('keeps the five beats in teaching order', () => {
    expect(DIFFUSION_SCENE.beats.map((beat) => beat.id)).toEqual([
      'demos', 'forward-noise', 'reverse-steps', 'in-symbols', 'recap',
    ]);
  });

  it('keeps the camera home at every beat end and outside the clean-up beat', () => {
    for (const span of SPANS) {
      expect(diffusionCameraAt(span.end), span.beat.id).toBe(0);
      expect(diffusionCameraTransform(span.end)).toBe('translate(0 0) scale(1)');
    }
    expect(diffusionCameraAt(at(1, 0.5))).toBe(0);
    expect(diffusionCameraAt(at(3, 0.5))).toBe(0);
  });

  it('keeps every guess inside the camera window, with the stage margin, while the camera is home', () => {
    const dotR = 2.8;
    // The inset still paints the 4 px stage margin on the narrowest stage the
    // type scale is drawn full size on.
    const narrowest = MOTION_STAGE_TYPE.fullSizeMinStagePx / 340;
    for (const inset of [CAMERA_WINDOW.x, 340 - CAMERA_WINDOW.x - CAMERA_WINDOW.width, 240 - CAMERA_WINDOW.y - CAMERA_WINDOW.height]) {
      expect(inset * narrowest).toBeGreaterThanOrEqual(4);
    }
    // The noise end-state spreads the guesses widest; the clean end-state gathers them.
    for (const t of [SPANS[0].end, SPANS[1].end, SPANS[2].end, END]) {
      for (let index = 0; index < 60; index += 1) {
        const [x, y] = diffusionSamplePointAt(index, t);
        expect(x - dotR, `guess ${index} at ${t}`).toBeGreaterThanOrEqual(CAMERA_WINDOW.x);
        expect(x + dotR, `guess ${index} at ${t}`).toBeLessThanOrEqual(CAMERA_WINDOW.x + CAMERA_WINDOW.width);
        expect(y - dotR, `guess ${index} at ${t}`).toBeGreaterThanOrEqual(CAMERA_WINDOW.y);
        expect(y + dotR, `guess ${index} at ${t}`).toBeLessThanOrEqual(CAMERA_WINDOW.y + CAMERA_WINDOW.height);
      }
    }
  });

  it('closes in on the worked guess, within the zoom token, with its whole path in view', () => {
    expect(FOCUS_ZOOM).toBeGreaterThan(1.5);
    expect(FOCUS_ZOOM).toBeLessThanOrEqual(MOTION_CAMERA.focusMaxZoom);
    expect(diffusionCameraAt(at(2, 0.4))).toBe(1);
    const hold = parse(diffusionCameraTransform(at(2, 0.4)));
    expect(hold.scale).toBeCloseTo(FOCUS_ZOOM, 2);
    for (const k of [0, 0.25, 0.4, 0.6, 1]) {
      const [x, y] = diffusionSamplePointAt(WORKED_GUESS, at(2, k));
      const screenX = hold.tx + x * hold.scale;
      const screenY = hold.ty + y * hold.scale;
      expect(screenX, `x at ${k}`).toBeGreaterThan(4);
      expect(screenX, `x at ${k}`).toBeLessThan(340 - 4);
      expect(screenY, `y at ${k}`).toBeGreaterThan(30);
      expect(screenY, `y at ${k}`).toBeLessThan(240 - 4);
    }
    // In and back out with smooth easing: halfway in is not halfway zoomed.
    const halfIn = parse(diffusionCameraTransform(at(2, 0.125)));
    expect(halfIn.scale).toBeGreaterThan(1);
    expect(halfIn.scale).toBeLessThan(FOCUS_ZOOM);
  });

  it('turns a ~ p(a) into a ~ p(a | o) by moving the shared glyphs and fading in only | o', () => {
    const start = diffusionGlyphsAt(at(3, 0.3));
    const sliding = diffusionGlyphsAt(at(3, 0.45));
    const writing = diffusionGlyphsAt(at(3, 0.7));
    const done = diffusionGlyphsAt(at(3, 1));
    expect(start.filter((glyph) => glyph.matched).map((glyph) => glyph.id))
      .toEqual(['a', 'sim', 'p', 'open', 'arg', 'close']);
    expect(start.filter((glyph) => !glyph.matched).map((glyph) => glyph.id)).toEqual(['given', 'seen']);
    for (const glyph of start) {
      expect(glyph.opacity, glyph.id).toBe(glyph.matched ? 1 : 0);
    }
    // The shared glyphs slide first, keeping full ink; "| o" waits for room.
    for (const [index, glyph] of sliding.entries()) {
      if (glyph.matched) {
        const [from, to] = [start[index].x, done[index].x];
        if (from !== to) expect(Math.min(from, to) < glyph.x && glyph.x < Math.max(from, to), glyph.id).toBe(true);
        expect(glyph.opacity).toBe(1);
      } else {
        expect(glyph.opacity, glyph.id).toBe(0);
      }
    }
    for (const [index, glyph] of writing.entries()) {
      if (glyph.matched) expect(glyph.x, glyph.id).toBe(done[index].x);
      else expect(glyph.opacity > 0 && glyph.opacity < 1, glyph.id).toBe(true);
    }
    const order = ['a', 'sim', 'p', 'open', 'arg', 'given', 'seen', 'close'];
    const xs = order.map((id) => done.find((glyph) => glyph.id === id)!.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(done.every((glyph) => glyph.opacity === 1)).toBe(true);
  });

  it('never paints two glyphs over each other while the relation changes', () => {
    for (let step = 0; step <= 200; step += 1) {
      const t = at(3, step / 200);
      const shown = diffusionGlyphsAt(t).filter((glyph) => glyph.opacity > 0);
      for (const [index, first] of shown.entries()) {
        for (const second of shown.slice(index + 1)) {
          const overlap = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
          expect(overlap, `${first.id}/${second.id} at ${step / 200}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  it('shows no symbol before the symbols beat or on the finished frame', () => {
    for (const t of [0, SPANS[2].end, at(4, 0.5), END]) {
      const shown = diffusionGlyphsAt(t).filter((glyph) => glyph.opacity > 0).map((glyph) => glyph.id);
      expect(shown, `t=${t}`).toEqual([]);
    }
  });

  it('reads the worked guess from the model: far from its move at the start, on it at the end', () => {
    expect(WORKED_DISTANCES.start.toFixed(2)).toBe('3.17');
    expect(WORKED_DISTANCES.end.toFixed(2)).toBe('0.08');
  });
});
