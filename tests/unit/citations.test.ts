import { describe, expect, it } from 'vitest';
import {
  CITATIONS,
  citationLabel,
  citationMeta,
  getCitation,
} from '@/data/citations';
import { citationSchema } from '@/data/schemas/citation';

describe('citation registry', () => {
  it('contains only schema-valid entries', () => {
    for (const citation of CITATIONS) {
      const parsed = citationSchema.safeParse(citation);
      expect(parsed.success, JSON.stringify(citation)).toBe(true);
    }
  });

  it('has unique ids', () => {
    const ids = CITATIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links arXiv entries to their abs page', () => {
    for (const c of CITATIONS) {
      if (c.arxiv) {
        expect(c.url).toBe(`https://arxiv.org/abs/${c.arxiv}`);
      }
    }
  });

  it('getCitation resolves known ids and misses unknown ones', () => {
    const known = CITATIONS[0];
    expect(getCitation(known.id)?.id).toBe(known.id);
    expect(getCitation('no-such-citation')).toBeUndefined();
  });

  it('citationLabel is "FirstAuthorSurname Year"', () => {
    const zhao = getCitation('act-aloha-2023');
    expect(zhao).toBeDefined();
    expect(citationLabel(zhao!)).toBe('Zhao 2023');
  });

  it('citationLabel keeps organization names whole', () => {
    const org = getCitation('pi-real-time-chunking-blog-2025');
    expect(org).toBeDefined();
    expect(citationLabel(org!)).toBe('Physical Intelligence 2025');
  });

  it('citationMeta lists authors, venue, and year', () => {
    const zhao = getCitation('act-aloha-2023');
    const meta = citationMeta(zhao!);
    expect(meta).toContain('Tony Z. Zhao');
    expect(meta).toContain('2023');
  });

  it('citationMeta truncates long author lists with et al.', () => {
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One', 'B Two', 'C Three', 'D Four', 'E Five'],
      year: 2024,
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toContain('et al.');
    expect(meta).not.toContain('E Five');
  });
});
