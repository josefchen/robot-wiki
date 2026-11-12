import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  actionSensitivity,
  INITIAL_STATE,
  realismScore,
  rollout,
  SENSITIVITY_THRESHOLD,
} from '@/lib/action-conditioning';
import { deviationAt, TYPICAL_HORIZON } from '@/lib/latent-imagination';
import { applyPush, DEFAULT_FORCE_N, INITIAL_LAYERS, INITIAL_MUG } from '@/lib/appearance-physics-push';
import { NO_SLOP_EXCEPTIONS } from '@/data/no-slop-exceptions';
import { findStructuralTells, structuralTellReport, STRUCTURAL_TELL_LIMIT } from '@/lib/no-slop';

const root = process.cwd();
const folder = join(root, 'content/world-models');
const articles = readdirSync(folder).filter((file) => file.endsWith('.mdx')).sort();

describe('world-models merged figures', () => {
  it('reaches every former beat state from the lab models', () => {
    // Action fork: one shared frame, a strong fork, a weak collapse, fixed realism.
    const strongA = rollout({ action: 'push-left', conditioning: 'strong' });
    const weakB = rollout({ action: 'lift', conditioning: 'weak' });
    expect(strongA[0]).toEqual(INITIAL_STATE);
    expect(weakB[0]).toEqual(INITIAL_STATE);
    const strong = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'strong' });
    const weak = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'weak' });
    expect(strong).toBeGreaterThan(SENSITIVITY_THRESHOLD);
    expect(weak).toBeLessThan(SENSITIVITY_THRESHOLD);
    expect(realismScore('strong')).toBe(realismScore('weak'));
    // Latent drift: the deviation keeps growing across the typical band.
    expect(deviationAt({ epsilon: 0.02, horizon: TYPICAL_HORIZON[1] }))
      .toBeGreaterThan(deviationAt({ epsilon: 0.02, horizon: TYPICAL_HORIZON[0] }));
    // Push layers: the appearance-only push is unanswered; the proxy answers it.
    expect(applyPush(INITIAL_MUG, INITIAL_LAYERS, DEFAULT_FORCE_N).state.position).toBe(0);
    expect(applyPush(INITIAL_MUG, { ...INITIAL_LAYERS, physics: true }, DEFAULT_FORCE_N).state.position)
      .toBeGreaterThan(0);
  });
});

describe('world-models prose truth', () => {

  it('measures all eight articles at no more than two structural tells per thousand words', () => {
    expect(articles.length).toBeGreaterThan(0);
    for (const file of articles) {
      const body = readFileSync(join(folder, file), 'utf8');
      const report = structuralTellReport(body, NO_SLOP_EXCEPTIONS);
      expect(report.measured, file).toBe(true);
      expect(report.tells, file).toBe(findStructuralTells(body, NO_SLOP_EXCEPTIONS).length);
      expect(report.density, file).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
    }
  });
});
