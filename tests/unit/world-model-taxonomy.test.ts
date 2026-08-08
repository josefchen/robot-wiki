import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARADIGM,
  WM_PARADIGMS,
  WM_USES,
  paradigmById,
} from '@/lib/world-model-taxonomy';

describe('world-model taxonomy model', () => {
  it('defines exactly six paradigms in the contract order', () => {
    expect(WM_PARADIGMS.map((p) => p.id)).toEqual([
      'latent-dynamics',
      'decoder-free-latent',
      'generative-video',
      'jepa',
      'world-action',
      'symbolic',
    ]);
  });

  it('defines the four use categories from the survey', () => {
    expect(WM_USES.map((u) => u.id)).toEqual([
      'policy-learning',
      'planning',
      'evaluation',
      'data-generation',
    ]);
  });

  it('gives every paradigm non-empty table cells', () => {
    for (const p of WM_PARADIGMS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.predicts.length).toBeGreaterThan(0);
      expect(p.space.length).toBeGreaterThan(0);
      expect(p.trainedOn.length).toBeGreaterThan(0);
      expect(p.primaryUse.length).toBeGreaterThan(0);
      expect(p.systems.length).toBeGreaterThan(0);
    }
  });

  it('Dreamer row predicts next latent state + reward + continuation', () => {
    const p = paradigmById('latent-dynamics');
    expect(p.predicts).toMatch(/next latent state/i);
    expect(p.predicts).toMatch(/reward/i);
    expect(p.predicts).toMatch(/continuation/i);
    expect(p.systems).toMatch(/DreamerV3/);
  });

  it('TD-MPC row states there is no reconstruction or decoder', () => {
    const p = paradigmById('decoder-free-latent');
    expect(p.predicts).toMatch(/no reconstruction/i);
    expect(p.predicts).toMatch(/no decoder/i);
    expect(p.systems).toMatch(/TD-MPC2/);
  });

  it('generative-video row predicts future pixels conditioned on action or text', () => {
    const p = paradigmById('generative-video');
    expect(p.predicts).toMatch(/future pixels/i);
    expect(p.predicts).toMatch(/action\/text|action or text/i);
    expect(p.systems).toMatch(/Cosmos/);
    expect(p.systems).toMatch(/Genie/);
  });

  it('JEPA row predicts a future representation, never pixels', () => {
    const p = paradigmById('jepa');
    expect(p.predicts).toMatch(/future representation/i);
    expect(p.predicts).toMatch(/never pixels/i);
    expect(p.systems).toMatch(/V-JEPA 2/);
  });

  it('world-action row emits frames and action chunks from one backbone', () => {
    const p = paradigmById('world-action');
    expect(p.predicts).toMatch(/frames/i);
    expect(p.predicts).toMatch(/action chunks/i);
    expect(p.predicts).toMatch(/one backbone/i);
  });

  it('symbolic row predicts transitions over predicates and relations', () => {
    const p = paradigmById('symbolic');
    expect(p.predicts).toMatch(/predicates/i);
    expect(p.predicts).toMatch(/relations/i);
  });

  it('assigns each paradigm at least one valid use', () => {
    const valid = new Set(WM_USES.map((u) => u.id));
    for (const p of WM_PARADIGMS) {
      expect(p.uses.length).toBeGreaterThan(0);
      for (const use of p.uses) {
        expect(valid.has(use)).toBe(true);
      }
    }
  });

  it('uses differ across paradigms so the disambiguator has something to show', () => {
    const signatures = new Set(
      WM_PARADIGMS.map((p) => [...p.uses].sort().join(',')),
    );
    expect(signatures.size).toBeGreaterThanOrEqual(3);
  });

  it('defaults to the latent-dynamics paradigm', () => {
    expect(DEFAULT_PARADIGM).toBe('latent-dynamics');
  });
});
