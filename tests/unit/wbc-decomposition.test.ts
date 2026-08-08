import { describe, expect, it } from 'vitest';
import {
  APPROACH_ORDER,
  DEFAULT_APPROACH,
  GR2_RESULTS,
  WBC_APPROACHES,
  approachById,
  fastestRateHz,
  formatSuccess,
  gr2DexterityRange,
  layerCount,
  type WbcApproachId,
} from '@/lib/wbc-decomposition';

describe('WBC decomposition model', () => {
  it('defines exactly three approaches in a stable order', () => {
    expect(APPROACH_ORDER).toEqual([
      'tracking-rl',
      'latent-action',
      'end-to-end-vla',
    ]);
    expect(WBC_APPROACHES.map((a) => a.id)).toEqual(APPROACH_ORDER);
  });

  it('defaults to the motion-tracking RL approach', () => {
    expect(DEFAULT_APPROACH).toBe('tracking-rl');
  });

  it('gives each approach a named representative and at least one layer', () => {
    for (const id of APPROACH_ORDER) {
      const approach = approachById(id);
      expect(approach.representative.length).toBeGreaterThan(0);
      expect(approach.layers.length).toBeGreaterThanOrEqual(1);
      expect(layerCount(approach)).toBe(approach.layers.length);
    }
  });

  it('names the expected representatives per approach', () => {
    expect(approachById('tracking-rl').representative).toContain('Helix 02');
    expect(approachById('latent-action').representative).toContain('GR00T');
    expect(approachById('latent-action').representative).toContain(
      'GEAR-SONIC',
    );
    expect(approachById('end-to-end-vla').representative).toContain(
      'Gemini Robotics 2',
    );
  });

  it('carries the sourced Helix 02 S0 figures', () => {
    const stats = approachById('tracking-rl').stats;
    const byLabel = Object.fromEntries(stats.map((s) => [s.label, s.value]));
    expect(byLabel['S0 params']).toBe('10M');
    expect(byLabel['S0 loop rate']).toBe('1000 Hz');
    expect(byLabel['motion data']).toBe('1000+ h');
    expect(byLabel['sim envs']).toBe('200,000+');
  });

  it('carries the sourced GR00T N1.7 figures', () => {
    const stats = approachById('latent-action').stats;
    const byLabel = Object.fromEntries(stats.map((s) => [s.label, s.value]));
    expect(byLabel['VLA params']).toBe('3B');
    expect(byLabel['action horizon']).toBe('40');
    expect(byLabel['state/action']).toBe('132');
    expect(byLabel['human video']).toBe('20,000 h');
  });

  it('carries the sourced Gemini Robotics 2 figures without inventing architecture', () => {
    const approach = approachById('end-to-end-vla');
    const byLabel = Object.fromEntries(
      approach.stats.map((s) => [s.label, s.value]),
    );
    expect(byLabel['embodiments']).toBe('3');
    expect(byLabel['hand DoF']).toBe('22');
    expect(byLabel['adaptation']).toBe('< 200 examples');
    expect(byLabel['architecture']).toBe('not disclosed');
  });

  it('reports the fastest disclosed loop rate per approach', () => {
    expect(fastestRateHz(approachById('tracking-rl'))).toBe(1000);
    // Latent-action and end-to-end rates are not disclosed by the sources.
    expect(fastestRateHz(approachById('latent-action'))).toBeNull();
    expect(fastestRateHz(approachById('end-to-end-vla'))).toBeNull();
  });

  it('approachById throws on an unknown id', () => {
    expect(() => approachById('nope' as WbcApproachId)).toThrow();
  });
});

describe('Gemini Robotics 2 published results', () => {
  it('contains the six required published figures', () => {
    const byTask = Object.fromEntries(
      GR2_RESULTS.map((r) => [r.task, r.success]),
    );
    expect(byTask['pick from table']).toBe(68.4);
    expect(byTask['pick from floor']).toBe(45.7);
    expect(byTask['pick from shelf']).toBe(76.3);
    expect(byTask['unscrew bulb']).toBe(92);
    expect(byTask['dustpan']).toBe(32);
    expect(byTask['precise insertion']).toBe(89.6);
  });

  it('covers all three reported categories with plausible rates', () => {
    const categories = new Set(GR2_RESULTS.map((r) => r.category));
    expect(categories).toEqual(
      new Set([
        'whole-body pick',
        'multi-finger dexterity',
        'gripper dexterity',
      ]),
    );
    for (const row of GR2_RESULTS) {
      expect(row.success).toBeGreaterThan(0);
      expect(row.success).toBeLessThanOrEqual(100);
      expect(row.embodiment.length).toBeGreaterThan(0);
    }
  });

  it('reports the multi-finger dexterity range from dustpan to unscrew bulb', () => {
    const { min, max } = gr2DexterityRange();
    expect(min.task).toBe('dustpan');
    expect(min.success).toBe(32);
    expect(max.task).toBe('unscrew bulb');
    expect(max.success).toBe(92);
  });

  it('formats success rates with one decimal only when needed', () => {
    expect(formatSuccess(68.4)).toBe('68.4%');
    expect(formatSuccess(92)).toBe('92%');
    expect(formatSuccess(89.6)).toBe('89.6%');
  });
});
