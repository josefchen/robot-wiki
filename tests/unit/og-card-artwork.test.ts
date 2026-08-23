import { describe, expect, it } from 'vitest';
import { DOMAINS } from '@/data/domains';
import { ornamentFor } from '@/lib/og-card-artwork';

/**
 * The panel is the same engineering grid for every card, so it encodes
 * nothing about the article or its domain (VAL-IMG-015; drawing-level checks live in
 * og-card-diagram-honesty.test.ts).
 */
describe('grid selection', () => {
  it('assigns the shared grid to every registered domain', () => {
    for (const domain of DOMAINS) {
      expect(ornamentFor(domain)).toBe('grid');
    }
  });

  it('is stable across domains because it is identity, not a glyph set', () => {
    expect(ornamentFor('classical')).toBe(ornamentFor('classical'));
    expect(ornamentFor('manipulation')).toBe(ornamentFor('classical'));
  });

  it('uses the same grid for an unregistered domain', () => {
    expect(ornamentFor('not-a-domain')).toBe(ornamentFor('manipulation'));
  });
});
