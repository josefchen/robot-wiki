import { describe, expect, it } from 'vitest';
import {
  BACKBONE,
  BACKBONE_PARAMS,
  BACKBONE_TRAYS,
  EXPERT,
  EXPERT_PARAMS,
  EXPERT_TRAYS,
  GAUGE_SWEEP_DEG,
  LEVELS,
  OPEN_DEG,
  PITCH,
  SHUT_DEG,
  Z0,
  Z_TOP,
  fluidPath,
  gaugeDirection,
  leverDeg,
  motionAt,
  restPose,
  riderZ,
  stepMotion,
  trayFill,
  type Motion,
} from '@/components/iso/figures/tray-columns';
import {
  LANGUAGE_SCORE_MAX,
  LANGUAGE_SCORE_MIN,
  LAYER_COUNT,
  backboneSupervision,
  languageScore,
  layerStates,
  type Pass,
} from '@/lib/knowledge-insulation';

const STATES: Array<[Pass, boolean, number]> = [];
for (const pass of ['forward', 'backward'] as const) {
  for (const stop of [true, false]) for (let step = 0; step <= LAYER_COUNT; step++) STATES.push([pass, stop, step]);
}

/** Run the live easing until it settles, as the figure's loop does at 60 frames a second. */
function settle(motion: Motion, pass: Pass, stop: boolean, step: number): number {
  const target = restPose(pass, stop, step);
  let frames = 0;
  while (stepMotion(motion, target, pass, 1 / 60)) {
    frames++;
    if (frames > 60 * 20) throw new Error('never settles');
  }
  return frames;
}

describe('tray columns: the drawing is the model', () => {
  it('draws one tray per layer in each column, one cross valve per tray', () => {
    expect(BACKBONE_TRAYS).toHaveLength(LAYER_COUNT);
    expect(EXPERT_TRAYS).toHaveLength(LAYER_COUNT);
    expect(LEVELS).toHaveLength(LAYER_COUNT);
    expect(Z_TOP - Z0).toBeCloseTo(PITCH * LAYER_COUNT);
  });

  it('sizes the two columns so their cross-sections compare as 2B against 300M parameters', () => {
    expect(BACKBONE.w).toBe(BACKBONE.d);
    expect(EXPERT.w).toBeCloseTo(EXPERT.d);
    expect((BACKBONE.w * BACKBONE.d) / (EXPERT.w * EXPERT.d)).toBeCloseTo(BACKBONE_PARAMS / EXPERT_PARAMS, 9);
    expect(BACKBONE_PARAMS / EXPERT_PARAMS).toBeCloseTo(2000 / 300);
  });

  it('fills exactly the trays the model reaches, and opens exactly the valves it passes through', () => {
    for (const [pass, stop, step] of STATES) {
      const pose = restPose(pass, stop, step);
      for (const state of layerStates(pass, stop, step)) {
        const backbone = trayFill(pose, 'backbone', state.index);
        const expert = trayFill(pose, 'expert', state.index);
        expect(Math.max(backbone.activation, backbone.gradient)).toBe(state.backboneActive ? 1 : 0);
        expect(Math.max(expert.activation, expert.gradient)).toBe(state.expertActive ? 1 : 0);
        // Forward the trays hold activation; back, the gradient.
        expect(backbone.activation + expert.activation > 0).toBe(pass === 'forward' && state.reached);
        expect(pose.valves[state.index]).toBe(state.sidewaysAttention || state.gradientCrosses ? 1 : 0);
        expect(fluidPath('expert', state.index, expert.gradient + expert.activation) !== '').toBe(state.expertActive);
      }
      expect(pose.score).toBe(languageScore(pass, stop, step));
      expect(pose.fast).toBe(backboneSupervision(pass, stop) === 'fast-cross-entropy' ? 1 : 0);
    }
  });

  it('reads the gauge over three quarters of a turn, intact at the top of the model scale', () => {
    const step = (a: number, b: number) => Math.acos(Math.min(1, gaugeDirection(a)[0] * gaugeDirection(b)[0] + gaugeDirection(a)[1] * gaugeDirection(b)[1]));
    // The gap between 0 and 100 is the quarter turn the scale leaves open.
    expect(step(0, 100)).toBeCloseTo(2 * Math.PI - (GAUGE_SWEEP_DEG * Math.PI) / 180, 9);
    expect(step(0, 50) + step(50, 100)).toBeCloseTo((GAUGE_SWEEP_DEG * Math.PI) / 180, 9);
    // Equal score steps turn the needle by equal angles, so the needle's drop is the score's drop.
    expect(step(LANGUAGE_SCORE_MIN, LANGUAGE_SCORE_MAX)).toBeCloseTo(((LANGUAGE_SCORE_MAX - LANGUAGE_SCORE_MIN) / 100) * (GAUGE_SWEEP_DEG * Math.PI) / 180, 9);
  });

  it('swings each lever from its stop to open with the flap', () => {
    expect(leverDeg(0)).toBe(SHUT_DEG);
    expect(leverDeg(1)).toBe(OPEN_DEG);
    expect(OPEN_DEG - SHUT_DEG).toBeGreaterThan(30);
  });

  it('puts the depth rider at the front of the reached trays', () => {
    for (let step = 0; step <= LAYER_COUNT; step++) {
      expect(riderZ('forward', step)).toBeCloseTo(Z0 + step * PITCH);
      expect(riderZ('backward', step)).toBeCloseTo(Z_TOP - step * PITCH);
    }
  });

  it('eases from any state to any other and settles exactly on the model pose', () => {
    const picks: Array<[Pass, boolean, number]> = [
      ['backward', true, 8],
      ['backward', false, 8],
      ['forward', true, 3],
      ['backward', false, 2],
      ['forward', false, 8],
      ['backward', true, 0],
    ];
    for (const from of picks) {
      for (const to of picks) {
        const motion = motionAt(from[0], restPose(...from));
        settle(motion, ...to);
        const target = restPose(...to);
        expect(motion.pose).toEqual(target);
        expect(motion.rider).toBeCloseTo(riderZ(to[0], to[0] === 'forward' ? target.rise : target.fall));
      }
    }
  });

  it('runs the gradient down tray by tray, and never lets the backbone fill ahead of the expert', () => {
    const motion = motionAt('backward', restPose('backward', true, 0));
    const target = restPose('backward', false, LAYER_COUNT);
    let frames = 0;
    let lastFall = 0;
    let maxStep = 0;
    while (stepMotion(motion, target, 'backward', 1 / 60)) {
      frames++;
      expect(motion.pose.seep).toBeLessThanOrEqual(motion.pose.fall + 1e-9);
      maxStep = Math.max(maxStep, motion.pose.fall - lastFall);
      lastFall = motion.pose.fall;
    }
    // At most one tray every 0.3 s or so: the front never jumps, and the full column takes over two seconds.
    expect(maxStep).toBeLessThan(0.06);
    expect(frames / 60).toBeGreaterThan(2);
    expect(frames / 60).toBeLessThan(6);
  });
});
