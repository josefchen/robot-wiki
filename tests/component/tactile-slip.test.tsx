import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CATCH_T,
  TACTILE_SLIP_SCENE,
  TactileSlip,
  tactileSlipFrame,
} from '@/components/motion/scenes/tactile-slip';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import {
  EXTRA_LOAD_N,
  GRIP_HOLD_N,
  GRIP_REGRIP_N,
  MU,
  SLIP_MM,
  catchGrip,
  glassShift,
  gripHolds,
  holdingN,
  slipDialDegrees,
  weightN,
} from '@/components/iso/figures/slip-test-stand';
import { expectedSceneRole } from '@/lib/motion-scene-roles';

const SPANS = beatSpans(TACTILE_SLIP_SCENE.beats);

describe('the slip test stand model', () => {
  it('holds the glass by friction at 4 newtons a pad, slips under the extra load, and holds again at 6', () => {
    const load = weightN() + EXTRA_LOAD_N;
    expect(holdingN(GRIP_HOLD_N)).toBeCloseTo(2 * MU * GRIP_HOLD_N, 9);
    expect(gripHolds(GRIP_HOLD_N, weightN())).toBe(true);
    expect(gripHolds(GRIP_HOLD_N, load)).toBe(false);
    expect(gripHolds(GRIP_REGRIP_N, load)).toBe(true);
    // The least grip that holds the load sits between the two settings.
    expect(catchGrip(load)).toBeGreaterThan(GRIP_HOLD_N);
    expect(catchGrip(load)).toBeLessThan(GRIP_REGRIP_N);
    expect(gripHolds(catchGrip(load), load)).toBe(true);
    expect(gripHolds(catchGrip(load) - 1e-6, load)).toBe(false);
  });

  it('slides from the start of the slip beat until the rising grip catches the load, then stops 3 mm lower', () => {
    expect(CATCH_T).toBeGreaterThan(SPANS[2].start);
    expect(CATCH_T).toBeLessThan(SPANS[2].end);
    expect(tactileSlipFrame(SPANS[0].end).slipMm).toBe(0);
    expect(tactileSlipFrame(SPANS[1].end).sliding).toBe(true);
    expect(tactileSlipFrame(SPANS[1].end).holds).toBe(false);
    // At the catch the friction just passes the load: no sooner, no later.
    const before = tactileSlipFrame(CATCH_T - 1);
    const after = tactileSlipFrame(CATCH_T + 1);
    expect(before.holds).toBe(false);
    expect(after.holds).toBe(true);
    expect(after.sliding).toBe(false);
    expect(tactileSlipFrame(CATCH_T).slipMm).toBeCloseTo(SLIP_MM, 9);
    expect(tactileSlipFrame(posterTime(SPANS)).slipMm).toBe(SLIP_MM);
    // The slide only grows.
    let last = 0;
    for (let t = 0; t <= posterTime(SPANS); t += 25) {
      const mm = tactileSlipFrame(t).slipMm;
      expect(mm).toBeGreaterThanOrEqual(last);
      last = mm;
    }
    expect(tactileSlipFrame(posterTime(SPANS)).grip).toBe(GRIP_REGRIP_N);
  });

  it('keeps the beat frame the motion inventory reads', () => {
    expect(tactileSlipFrame(SPANS[0].end).slip).toBe(0);
    expect(tactileSlipFrame(SPANS[1].end).slip).toBeGreaterThan(0);
    expect(tactileSlipFrame(SPANS[2].end).correction).toBeGreaterThan(0);
    const end = tactileSlipFrame(SPANS[3].end);
    expect(end.slip).toBe(1);
    expect(end.correction).toBe(1);
  });
});

describe('TactileSlip stage (the slip test stand)', () => {
  it('draws the poster as the caught slip: the glass 3 mm lower, the pads lit, both dials reading the model', () => {
    const { container } = render(<TactileSlip />);
    const stage = container.querySelector('[data-motion-stage] svg')!;
    expect(stage).not.toBeNull();
    // No words in the drawing.
    expect(stage.querySelectorAll('text')).toHaveLength(0);
    for (const part of ['glass', 'far-finger', 'near-finger', 'far-pad', 'near-pad', 'plunger', 'slip-dial', 'grip-dial', 'camera-sight']) {
      expect(stage.querySelectorAll(`[data-scene-part="${part}"]`)).toHaveLength(1);
    }
    // The marks keep their names and reviewed roles.
    const marks = [...stage.querySelectorAll('[data-scene-mark]')].map((node) => node.getAttribute('data-scene-mark'));
    expect(marks.sort()).toEqual(['held-object', 'left-touch', 'right-touch']);
    expect(expectedSceneRole('tactile-slip', 'held-object')).toBe('state');
    expect(expectedSceneRole('tactile-slip', 'left-touch')).toBe('measurement');
    expect(stage.querySelector('[data-scene-mark="held-object"]')!.getAttribute('stroke')).toBe('var(--role-state-stage)');
    for (const mark of ['left-touch', 'right-touch']) {
      const node = stage.querySelector(`[data-scene-mark="${mark}"]`)!;
      expect(node.getAttribute('fill')).toBe('var(--role-measurement-stage)');
      expect(node.getAttribute('opacity')).toBe('1');
    }
    // The glass has slid the model's 3 mm on the poster.
    expect(stage.querySelector('[data-scene-part="glass"]')!.getAttribute('transform')).toBe(glassShift(SLIP_MM));
    // The slip dial's needle reads 3 mm; the grip dial's reads 6 newtons.
    const needles = [...stage.querySelectorAll('[data-scene-part$="-dial"] g[transform^="rotate"]')].map((node) => node.getAttribute('transform'));
    expect(needles).toContain(`rotate(${slipDialDegrees(SLIP_MM)})`);
    expect(slipDialDegrees(SLIP_MM)).toBeCloseTo(216, 9);
    // One lit part on the poster: the two fingertip pads, as one set.
    const lit = [...stage.querySelectorAll('[data-tone="lit"]')];
    expect(lit).toHaveLength(2);
    for (const node of lit) expect(node.closest('[data-scene-part$="-pad"]')).not.toBeNull();
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(TACTILE_SLIP_SCENE.beats[3].caption);
  });

  it('server-renders the same poster it hydrates, with no text in the stage', () => {
    expect(posterTime(SPANS)).toBe(SPANS[3].end);
    const html = renderToString(<TactileSlip />);
    expect(html).toContain('data-motion-scene="tactile-slip"');
    expect(html).toContain('data-scene-mark="held-object"');
    expect(html).toContain('data-scene-mark="left-touch"');
    expect(html).not.toContain('<text');
  });
});
