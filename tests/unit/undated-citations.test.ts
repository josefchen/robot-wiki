import { describe, expect, it } from 'vitest';
import { citationSchema } from '../../data/schemas/citation';
import { citationLabel, citationMeta, venueStatesYear } from '../../data/citations';

const entry = {
  id: 'lei-takt-time-definition', title: 'Takt Time',
  authors: ['Lean Enterprise Institute'], year: 'n.d.' as const,
  accessedOn: '2026-09-22', url: 'https://www.lean.org/lexicon-terms/takt-time/',
  type: 'docs' as const,
};

describe('explicit undated source dates', () => {
  it('accepts n.d. only with the actual access date', () => {
    expect(citationSchema.parse(entry)).toEqual(entry);
  });
  for (const accessedOn of [undefined, '', '2026-02-30', '2026-13-01', 'yesterday']) {
    it(`rejects missing or invalid access date ${String(accessedOn)}`, () => {
      expect(citationSchema.safeParse({ ...entry, accessedOn }).success).toBe(false);
    });
  }
  for (const year of [undefined, null, 0, '2026', 'unknown']) {
    it(`rejects ambiguous publication year ${String(year)}`, () => {
      expect(citationSchema.safeParse({ ...entry, year }).success).toBe(false);
    });
  }
  it('never renders the access year as publication year', () => {
    const parsed = citationSchema.parse(entry);
    expect(citationLabel(parsed)).toContain('n.d.');
    expect(citationMeta(parsed)).toContain('n.d.; accessed 2026-09-22');
    expect(venueStatesYear(parsed)).toBe(false);
  });
  it('preserves dated citation metadata', () => {
    const dated = citationSchema.parse({ ...entry, year: 2020, accessedOn: undefined });
    expect(citationLabel(dated)).toContain('2020');
    expect(citationMeta(dated)).not.toContain('accessed');
  });
});
