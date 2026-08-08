import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_SCORE_MAX,
  LANGUAGE_SCORE_MIN,
  LAYER_COUNT,
  backboneSupervision,
  gradientBarrier,
  languageScore,
  layerStates,
} from '@/lib/knowledge-insulation';

describe('layerStates', () => {
  it('returns one state per layer, bottom-up indexing', () => {
    const states = layerStates('forward', true, 0);
    expect(states).toHaveLength(LAYER_COUNT);
    expect(states[0].index).toBe(0);
    expect(states[LAYER_COUNT - 1].index).toBe(LAYER_COUNT - 1);
  });

  it('forward pass reaches layers bottom-up with sideways attention at reached layers', () => {
    const states = layerStates('forward', true, 3);
    for (const s of states) {
      const reached = s.index < 3;
      expect(s.reached).toBe(reached);
      expect(s.backboneActive).toBe(reached);
      expect(s.expertActive).toBe(reached);
      expect(s.sidewaysAttention).toBe(reached);
      expect(s.gradientCrosses).toBe(false);
    }
  });

  it('backward pass reaches layers top-down', () => {
    const states = layerStates('backward', true, 2);
    for (const s of states) {
      const reached = s.index >= LAYER_COUNT - 2;
      expect(s.reached).toBe(reached);
      expect(s.expertActive).toBe(reached);
    }
  });

  it('insulated backward pass keeps gradients out of the backbone', () => {
    const states = layerStates('backward', true, LAYER_COUNT);
    for (const s of states) {
      expect(s.backboneActive).toBe(false);
      expect(s.gradientCrosses).toBe(false);
    }
  });

  it('uninsulated backward pass lets gradients cross into every reached backbone layer', () => {
    const states = layerStates('backward', false, 3);
    for (const s of states) {
      const reached = s.index >= LAYER_COUNT - 3;
      expect(s.gradientCrosses).toBe(reached);
      expect(s.backboneActive).toBe(reached);
    }
  });

  it('clamps the step to the layer count', () => {
    const states = layerStates('forward', true, LAYER_COUNT + 5);
    expect(states.every((s) => s.reached)).toBe(true);
  });
});

describe('languageScore', () => {
  it('stays at the peak during the forward pass', () => {
    expect(languageScore('forward', true, 0)).toBe(LANGUAGE_SCORE_MAX);
    expect(languageScore('forward', false, LAYER_COUNT)).toBe(LANGUAGE_SCORE_MAX);
  });

  it('stays at the peak through a fully insulated backward pass', () => {
    expect(languageScore('backward', true, LAYER_COUNT)).toBe(LANGUAGE_SCORE_MAX);
  });

  it('drops monotonically as uninsulated gradients penetrate deeper', () => {
    let prev = LANGUAGE_SCORE_MAX + 1;
    for (let step = 0; step <= LAYER_COUNT; step++) {
      const score = languageScore('backward', false, step);
      expect(score).toBeLessThanOrEqual(prev);
      prev = score;
    }
    expect(languageScore('backward', false, 0)).toBe(LANGUAGE_SCORE_MAX);
    expect(languageScore('backward', false, LAYER_COUNT)).toBe(LANGUAGE_SCORE_MIN);
  });
});

describe('gradientBarrier', () => {
  it('is visible only in the insulated backward pass', () => {
    expect(gradientBarrier('backward', true)).toBe(true);
    expect(gradientBarrier('backward', false)).toBe(false);
    expect(gradientBarrier('forward', true)).toBe(false);
    expect(gradientBarrier('forward', false)).toBe(false);
  });
});

describe('backboneSupervision', () => {
  it('is FAST cross-entropy in the insulated backward pass', () => {
    expect(backboneSupervision('backward', true)).toBe('fast-cross-entropy');
  });

  it('is the corrupting expert gradient in the uninsulated backward pass', () => {
    expect(backboneSupervision('backward', false)).toBe('expert-gradient');
  });

  it('has no gradient supervision during the forward pass', () => {
    expect(backboneSupervision('forward', true)).toBe('none');
  });
});
