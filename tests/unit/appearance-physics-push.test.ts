import { describe, expect, it } from 'vitest';
import {
  CONTACT_TIME_S,
  DEFAULT_FORCE_N,
  FRICTION_MU,
  GRAVITY_MS2,
  INITIAL_LAYERS,
  INITIAL_MUG,
  MASS_KG,
  TRACK_MAX_M,
  applyPush,
  displacementForForce,
  formatCm,
  pushTestNote,
  setLayer,
} from '@/lib/appearance-physics-push';

describe('displacementForForce', () => {
  it('matches the impulse-and-friction kinematics d = (F·dt/m)² / (2μg)', () => {
    const v0 = (DEFAULT_FORCE_N * CONTACT_TIME_S) / MASS_KG;
    const expected = (v0 * v0) / (2 * FRICTION_MU * GRAVITY_MS2);
    expect(displacementForForce(DEFAULT_FORCE_N)).toBeCloseTo(expected, 12);
  });

  it('grows monotonically with force', () => {
    expect(displacementForForce(2)).toBeLessThan(displacementForForce(4));
    expect(displacementForForce(4)).toBeLessThan(displacementForForce(8));
  });
});

describe('applyPush', () => {
  it('produces no motion when the physics-proxy layer is off', () => {
    const result = applyPush(INITIAL_MUG, INITIAL_LAYERS, DEFAULT_FORCE_N);
    expect(result.moved).toBe(false);
    expect(result.displacement).toBe(0);
    expect(result.state.position).toBe(INITIAL_MUG.position);
    expect(result.state.attempts).toBe(1);
    expect(result.state.effectivePushes).toBe(0);
  });

  it('produces motion when the physics-proxy layer is on', () => {
    const layers = setLayer(INITIAL_LAYERS, 'physics', true);
    const result = applyPush(INITIAL_MUG, layers, DEFAULT_FORCE_N);
    expect(result.moved).toBe(true);
    expect(result.displacement).toBeCloseTo(
      displacementForForce(DEFAULT_FORCE_N),
      12,
    );
    expect(result.state.position).toBeCloseTo(result.displacement, 12);
    expect(result.state.effectivePushes).toBe(1);
  });

  it('accumulates displacement across effective pushes', () => {
    const layers = setLayer(INITIAL_LAYERS, 'physics', true);
    const first = applyPush(INITIAL_MUG, layers, DEFAULT_FORCE_N);
    const second = applyPush(first.state, layers, DEFAULT_FORCE_N);
    expect(second.state.position).toBeCloseTo(
      2 * displacementForForce(DEFAULT_FORCE_N),
      12,
    );
    expect(second.state.effectivePushes).toBe(2);
  });

  it('clamps at the end of the table instead of overshooting', () => {
    const layers = setLayer(INITIAL_LAYERS, 'physics', true);
    let state = INITIAL_MUG;
    for (let i = 0; i < 10; i += 1) {
      state = applyPush(state, layers, 10).state;
    }
    expect(state.position).toBeLessThanOrEqual(TRACK_MAX_M);
    expect(state.position).toBe(TRACK_MAX_M);
  });

  it('records a motion history only for effective pushes', () => {
    const noPhysics = applyPush(INITIAL_MUG, INITIAL_LAYERS, DEFAULT_FORCE_N);
    expect(noPhysics.state.history).toEqual([0]);
    const layers = setLayer(INITIAL_LAYERS, 'physics', true);
    const pushed = applyPush(INITIAL_MUG, layers, DEFAULT_FORCE_N);
    expect(pushed.state.history).toHaveLength(2);
    expect(pushed.state.history[1]).toBeCloseTo(pushed.displacement, 12);
  });

  it('is deterministic for identical inputs', () => {
    const layers = setLayer(INITIAL_LAYERS, 'physics', true);
    const a = applyPush(INITIAL_MUG, layers, 6);
    const b = applyPush(INITIAL_MUG, layers, 6);
    expect(a).toEqual(b);
  });
});

describe('setLayer', () => {
  it('toggles one layer without touching the others', () => {
    const next = setLayer(INITIAL_LAYERS, 'physics', true);
    expect(next.physics).toBe(true);
    expect(next.appearance).toBe(INITIAL_LAYERS.appearance);
    expect(next.simulation).toBe(INITIAL_LAYERS.simulation);
  });
});

describe('pushTestNote', () => {
  it('states that a renderer is not a simulator when physics is off', () => {
    const note = pushTestNote(INITIAL_LAYERS);
    expect(`${note.title} ${note.body}`).toMatch(
      /renderer is not a simulator/i,
    );
  });

  it('credits the collision geometry and integrator when physics is on', () => {
    const note = pushTestNote(setLayer(INITIAL_LAYERS, 'physics', true));
    expect(`${note.title} ${note.body}`).toMatch(/collision/i);
    expect(note.body).toMatch(/friction/i);
  });
});

describe('formatCm', () => {
  it('formats meters as centimeters with one decimal', () => {
    expect(formatCm(0.1812)).toBe('18.1 cm');
    expect(formatCm(0)).toBe('0.0 cm');
  });
});
