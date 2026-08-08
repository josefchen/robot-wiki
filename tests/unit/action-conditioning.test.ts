import { describe, expect, it } from 'vitest';
import {
  CONDITIONING_STRENGTH,
  GROUND_TRUTH_FINAL,
  INITIAL_STATE,
  INTENT_FINAL,
  REALISM_SCORE,
  ROLLOUT_STEPS,
  SENSITIVITY_THRESHOLD,
  actionSensitivity,
  finalState,
  realismScore,
  rollout,
  stateDistance,
} from '@/lib/action-conditioning';

describe('action-conditioning model', () => {
  it('starts every rollout from the shared initial frame', () => {
    const frames = rollout({ action: 'push-left', conditioning: 'strong' });
    expect(frames).toHaveLength(ROLLOUT_STEPS + 1);
    expect(frames[0]).toEqual(INITIAL_STATE);
    const weak = rollout({ action: 'lift', conditioning: 'weak' });
    expect(weak[0]).toEqual(INITIAL_STATE);
  });

  it('reaches the action-specific ground truth under strong conditioning', () => {
    for (const action of ['push-left', 'push-right', 'lift'] as const) {
      const end = finalState(action, 'strong');
      expect(end.blockX).toBeCloseTo(GROUND_TRUTH_FINAL[action].blockX, 6);
      expect(end.gripperY).toBeCloseTo(GROUND_TRUTH_FINAL[action].gripperY, 6);
    }
  });

  it('collapses to the same intention-consistent future under weak conditioning', () => {
    for (const action of ['push-left', 'push-right', 'lift'] as const) {
      const end = finalState(action, 'weak');
      const distanceFromIntent = stateDistance(end, INTENT_FINAL);
      const distanceFromGroundTruth = stateDistance(
        end,
        GROUND_TRUTH_FINAL[action],
      );
      expect(distanceFromIntent).toBeLessThan(0.05);
      expect(distanceFromGroundTruth).toBeGreaterThan(0.2);
    }
  });

  it('interpolates monotonically from the initial frame to the final state', () => {
    const frames = rollout({ action: 'push-right', conditioning: 'strong' });
    for (let k = 1; k < frames.length; k += 1) {
      expect(frames[k].blockX).toBeGreaterThan(frames[k - 1].blockX);
    }
    expect(frames[frames.length - 1].blockX).toBeCloseTo(0.8, 6);
  });

  it('scores distinct actions above the stated threshold under strong conditioning', () => {
    const s = actionSensitivity({
      actionA: 'push-left',
      actionB: 'lift',
      conditioning: 'strong',
    });
    expect(s).toBeGreaterThan(SENSITIVITY_THRESHOLD);
    const s2 = actionSensitivity({
      actionA: 'push-left',
      actionB: 'push-right',
      conditioning: 'strong',
    });
    expect(s2).toBeGreaterThan(SENSITIVITY_THRESHOLD);
  });

  it('drops the same pair to near zero under weak conditioning', () => {
    const s = actionSensitivity({
      actionA: 'push-left',
      actionB: 'lift',
      conditioning: 'weak',
    });
    expect(s).toBeLessThan(0.05);
    expect(s).toBeGreaterThan(0);
  });

  it('is zero for identical actions under any conditioning', () => {
    for (const conditioning of ['strong', 'weak'] as const) {
      expect(
        actionSensitivity({ actionA: 'lift', actionB: 'lift', conditioning }),
      ).toBeCloseTo(0, 6);
    }
  });

  it('is symmetric in the two rollouts', () => {
    const ab = actionSensitivity({
      actionA: 'push-left',
      actionB: 'lift',
      conditioning: 'strong',
    });
    const ba = actionSensitivity({
      actionA: 'lift',
      actionB: 'push-left',
      conditioning: 'strong',
    });
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('is deterministic across repeated calls', () => {
    const params = {
      actionA: 'push-right' as const,
      actionB: 'lift' as const,
      conditioning: 'weak' as const,
    };
    expect(actionSensitivity(params)).toBe(actionSensitivity(params));
  });

  it('keeps visual realism high and identical in both conditioning states', () => {
    expect(realismScore('strong')).toBe(REALISM_SCORE);
    expect(realismScore('weak')).toBe(REALISM_SCORE);
    expect(REALISM_SCORE).toBeGreaterThanOrEqual(0.85);
    expect(CONDITIONING_STRENGTH.weak).toBeLessThan(0.1);
  });
});
