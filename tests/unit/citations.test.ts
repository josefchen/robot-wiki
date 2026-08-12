import { describe, expect, it } from 'vitest';
import {
  CITATIONS,
  citationLabel,
  citationMeta,
  getCitation,
  type Citation,
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

  it('citationLabel keeps multi-word surnames via override, without breaking lookalikes', () => {
    const diCarlo = getCitation('di-carlo-2018');
    expect(diCarlo).toBeDefined();
    expect(citationLabel(diCarlo!)).toBe('Di Carlo 2018');
    // "Di" as a given name must not be swallowed into the surname.
    const lookalike: Citation = {
      id: 'test-lookalike',
      title: 'T',
      authors: ['Di Huang'],
      year: 2024,
      url: 'https://example.com/',
      type: 'paper',
    };
    expect(citationLabel(lookalike)).toBe('Huang 2024');
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

  it('citationMeta renders the year once when the venue already states it', () => {
    // act-aloha-2023: venue "RSS 2023", year 2023. The meta line must read
    // "..., RSS 2023." rather than "..., RSS 2023, 2023.".
    const zhao = getCitation('act-aloha-2023');
    expect(zhao).toBeDefined();
    const meta = citationMeta(zhao!);
    expect(meta).toContain('RSS 2023');
    expect(meta.match(/2023/g)).toHaveLength(1);
  });

  it('citationMeta keeps both years when the venue year differs from the entry year', () => {
    // A paper published at a later venue ("RSS 2025" with year 2024)
    // renders both years: dropping the entry year would lose information.
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One'],
      year: 2024,
      venue: 'RSS 2025',
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toBe('A One, RSS 2025, 2024');
  });

  it('citationMeta keeps the trailing year when the venue has none', () => {
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One'],
      year: 2024,
      venue: 'Science Robotics',
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toBe('A One, Science Robotics, 2024');
  });
});
