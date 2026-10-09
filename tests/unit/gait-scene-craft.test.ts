import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_WINDOW,
  FOCUS_ZOOM,
  GAIT_SUPPORT_SCENE,
  GaitSupport,
  LINE_UP,
  RECAP_INDEX,
  RECAP_REVEAL,
  SETTLE_PHASE,
  dogOpacity,
  dogPose,
  focusBox,
  gaitCameraTransform,
  gaitSupportFrame,
  labelOpacity,
  recapWords,
  tradeProgress,
} from '@/components/motion/scenes/gait-support';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { GAITS, GAIT_ORDER, minStanceCount, stanceLegs } from '@/lib/gait';
import { MOTION_CAMERA, MOTION_LAG, MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
const GAIT_SPANS = SPANS.slice(0, RECAP_INDEX);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const parse = (transform: string) => {
  const [tx, ty, scale] = transform.match(/-?[\d.]+/g)!.map(Number);
  return { tx, ty, scale };
};
const NAMES = LINE_UP.map((id) => `name-${id}`);
/** Left to right, the order the trade arrives in. */
const TRADE = ['steadier', 'arrow', 'bounce'];
const LABELS = [...NAMES, ...TRADE];
/** Everything the stage draws at time t, for comparing two moments. */
const picture = (t: number) => ({
  camera: gaitCameraTransform(t),
  dogs: LINE_UP.map((_, k) => dogOpacity(k, t)),
  labels: LABELS.map((key) => labelOpacity(key, t)),
  shaft: tradeProgress('arrow', t),
  phase: gaitSupportFrame(t).phase,
});

describe('gait-support flagship scene craft', () => {
  it('meets one new gait per beat, then a recap that ends on the poster', () => {
    // The bound also stops mid-leap with no feet down, so beside the hop it hid the trend: the line-up leaves it out.
    expect(LINE_UP).toEqual(['walk', 'trot', 'pronk']);
    expect(GAIT_SUPPORT_SCENE.beats.map((beat) => beat.id)).toEqual([...LINE_UP, 'recap']);
    expect(RECAP_INDEX).toBe(LINE_UP.length);
    expect(posterTime(SPANS)).toBe(END);
    SPANS.forEach((span, index) => {
      expect(gaitSupportFrame(span.end).visibleGaits).toEqual(LINE_UP.slice(0, index + 1));
    });
    expect(gaitSupportFrame(END).recap).toBe(true);
  });

  it('closes the camera in on the newest dog mid-beat and has it home at every beat end', () => {
    for (const span of SPANS) {
      expect(gaitSupportFrame(span.start).camera, span.beat.id).toBe(0);
      expect(gaitCameraTransform(span.end)).toBe('translate(0 0) scale(1)');
    }
    GAIT_SPANS.forEach((_, index) => {
      const held = parse(gaitCameraTransform(at(index, 0.45)));
      expect(held.scale).toBeCloseTo(FOCUS_ZOOM, 2);
      // The focus box's centre lands on the stage's centre.
      const box = focusBox(index);
      expect(held.tx + (box.x + box.width / 2) * held.scale).toBeCloseTo(170, 0);
    });
    expect(FOCUS_ZOOM).toBeLessThanOrEqual(MOTION_CAMERA.focusMaxZoom);
  });

  it('keeps the camera window inside the stage margin on the narrowest full-size stage', () => {
    const narrowest = MOTION_STAGE_TYPE.fullSizeMinStagePx / 340;
    for (const inset of [CAMERA_WINDOW.x, CAMERA_WINDOW.y, 340 - CAMERA_WINDOW.x - CAMERA_WINDOW.width]) {
      expect(inset * narrowest).toBeGreaterThanOrEqual(4);
    }
  });

  it('steps the newest dog and stops it at its settle moment, the earlier dogs still', () => {
    GAIT_SPANS.forEach((_, index) => {
      const id = LINE_UP[index];
      expect(gaitSupportFrame(at(index, 0.5)).phase).not.toBe(SETTLE_PHASE[id]);
      expect(gaitSupportFrame(at(index, 1)).phase).toBe(SETTLE_PHASE[id]);
    });
    expect(dogOpacity(0, at(1, 0.45))).toBeLessThan(0.5);
    expect(dogOpacity(0, at(1, 1))).toBe(1);
    expect(dogOpacity(2, at(1, 1))).toBe(0);
  });

  it('settles on three, two and no feet down, with the leaps off the ground', () => {
    const down = LINE_UP.map((id) => stanceLegs(GAITS[id], SETTLE_PHASE[id]).length);
    expect(down).toEqual([3, 2, 0]);
    // The bound's settle moment stays defined for the method note, which still lists it.
    expect(stanceLegs(GAITS.bound, SETTLE_PHASE.bound)).toHaveLength(0);
    for (const id of GAIT_ORDER) {
      const pose = dogPose(id, SETTLE_PHASE[id]);
      expect(pose.down.filter(Boolean)).toHaveLength(stanceLegs(GAITS[id], SETTLE_PHASE[id]).length);
      const lowest = Math.max(...pose.feet.map(([, y]) => y));
      if (id === 'bound' || id === 'pronk') expect(lowest, id).toBeLessThan(-5);
      else expect(lowest, id).toBe(0);
    }
  });

  it('brings the names back one lag apart once the camera is home, and keeps them off while it is away', () => {
    const last = RECAP_INDEX - 1;
    const order = NAMES.map((key) => labelOpacity(key, at(last, 0.9)));
    for (let i = 1; i < order.length; i += 1) expect(order[i]).toBeLessThanOrEqual(order[i - 1]);
    expect(order[0]).toBeGreaterThan(order[order.length - 1]);
    expect(MOTION_LAG.default).toBeGreaterThan(0);
    for (const key of LABELS) expect(labelOpacity(key, at(last, 0.45)), key).toBe(0);
    for (const key of NAMES) expect(labelOpacity(key, SPANS[last].end), key).toBe(1);
    // The trade waits for the recap.
    for (const span of GAIT_SPANS) expect(labelOpacity('arrow', span.end)).toBe(0);
  });

  it('draws the trade left to right, one lag apart, in the recap, then holds the whole picture still', () => {
    for (const key of NAMES) expect(labelOpacity(key, at(RECAP_INDEX, 0.05)), key).toBe(1);
    const mid = TRADE.map((key) => labelOpacity(key, at(RECAP_INDEX, 0.35)));
    for (let i = 1; i < mid.length; i += 1) expect(mid[i]).toBeLessThanOrEqual(mid[i - 1]);
    expect(mid[0]).toBeGreaterThan(mid[mid.length - 1]);
    // Mid-recap the arrow is part-drawn from the steadier end.
    const shaft = tradeProgress('arrow', at(RECAP_INDEX, 0.35));
    expect(shaft).toBeGreaterThan(0);
    expect(shaft).toBeLessThan(1);
    for (const span of GAIT_SPANS) expect(tradeProgress('arrow', span.end)).toBe(0);
    for (const key of LABELS) expect(labelOpacity(key, END), key).toBe(1);
    // From the end of the reveal to the poster nothing moves.
    const held = picture(at(RECAP_INDEX, RECAP_REVEAL.end));
    for (const k of [0.7, 0.85, 1]) expect(picture(at(RECAP_INDEX, k))).toEqual(held);
    expect(held.camera).toBe('translate(0 0) scale(1)');
    expect(held.dogs).toEqual([1, 1, 1]);
  });

  it('reads out what tells the gaits apart on the poster, and keeps the fewest feet down one click away', () => {
    expect(recapWords()).toBe('Walk lifts one foot at a time, trot a diagonal pair, hop all four at once.');
    const html = renderToStaticMarkup(createElement(GaitSupport)).replaceAll('<!-- -->', '');
    expect(html).toContain(recapWords());
    // The bound left the line-up but keeps its numbers and its description one click away.
    expect(html).toContain('The line-up leaves out the bound');
    const fewest = GAIT_ORDER.map((id) => `${id === 'pronk' ? 'hop' : id} ${minStanceCount(GAITS[id])}`).join(', ');
    expect(fewest).toBe('walk 3, trot 2, bound 0, hop 0');
    expect(html).toContain(`The fewest feet down at any moment of the stride: ${fewest}.`);
  });

  it('gives the scene a stable anchor that clears the sticky header', () => {
    const html = renderToStaticMarkup(createElement(GaitSupport));
    const root = html.match(/<div[^>]*data-motion-scene="gait-support"[^>]*>/)?.[0] ?? '';
    expect(root).toContain('id="gait-support"');
    expect(root).toContain('scroll-mt-16');
    expect([...html.matchAll(/\bid="gait-support"/g)]).toHaveLength(1);
  });
});
