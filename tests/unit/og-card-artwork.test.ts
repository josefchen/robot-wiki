import { describe, expect, it } from 'vitest';
import { DOMAINS } from '@/data/domains';
import { ornamentFor } from '@/lib/og-card-artwork';

/**
 * The panel ornament is selected by the article's `domain` field alone,
 * so it is a constant across a domain and encodes nothing about the
 * article (VAL-IMG-015; the drawing-level checks live in
 * og-card-diagram-honesty.test.ts).
 */
describe('ornament selection', () => {
  it('assigns an ornament to every registered domain', () => {
    for (const domain of DOMAINS) {
      expect(ornamentFor(domain)).toBeTypeOf('string');
    }
  });

  it('depends on the domain and nothing else', () => {
    expect(ornamentFor('classical')).toBe(ornamentFor('classical'));
    expect(ornamentFor('manipulation')).not.toBe(ornamentFor('classical'));
  });

  it('falls back to a real ornament for an unregistered domain', () => {
    expect(ornamentFor('not-a-domain')).toBe(ornamentFor('manipulation'));
  });
});
