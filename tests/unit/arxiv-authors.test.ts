import { describe, expect, it } from 'vitest';
import {
  extractArxivId,
  isPublishedVenue,
  parseArxivAtom,
} from '@/lib/arxiv-authors';
import { compareCitationAuthors } from '@/lib/crossref-authors';

const ACT_XML = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2304.13705v1</id>
    <title>Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware</title>
    <published>2023-04-23T19:10:53Z</published>
    <author><name>Tony Z. Zhao</name></author>
    <author><name>Vikash Kumar</name></author>
    <author><name>Sergey Levine</name></author>
    <author><name>Chelsea Finn</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/1011.0686v2</id>
    <title>A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning</title>
    <published>2010-11-02T19:51:34Z</published>
    <author><name>Stéphane Ross</name></author>
    <author><name>Geoffrey J. Gordon</name></author>
    <author><name>J. Andrew Bagnell</name></author>
  </entry>
</feed>`;

describe('extractArxivId', () => {
  it('pulls the bare id out of abs and pdf urls, ignoring versions', () => {
    expect(extractArxivId('https://arxiv.org/abs/2304.13705')).toBe('2304.13705');
    expect(extractArxivId('https://arxiv.org/abs/1011.0686v2')).toBe('1011.0686');
    expect(extractArxivId('https://arxiv.org/pdf/2401.02117')).toBe('2401.02117');
    expect(extractArxivId('https://arxiv.org/pdf/2401.02117v3')).toBe('2401.02117');
  });

  it('returns null for non-arXiv urls', () => {
    expect(extractArxivId('https://doi.org/10.1109/70.508439')).toBeNull();
    expect(extractArxivId('https://example.com/2304.13705')).toBeNull();
    expect(extractArxivId(undefined)).toBeNull();
  });
});

describe('parseArxivAtom', () => {
  it('projects each entry into the shared CrossrefWorkRecord shape', () => {
    const records = parseArxivAtom(ACT_XML);
    expect(records.size).toBe(2);
    expect(records.get('2304.13705')).toEqual({
      title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
      authors: [
        { family: 'Zhao', given: 'Tony Z.' },
        { family: 'Kumar', given: 'Vikash' },
        { family: 'Levine', given: 'Sergey' },
        { family: 'Finn', given: 'Chelsea' },
      ],
      years: [2023],
    });
    // Diacritics survive; the shared name comparison folds them.
    expect(records.get('1011.0686')?.authors[0]).toEqual({ family: 'Ross', given: 'Stéphane' });
  });

  it('keeps a bare family name when the byline has a single token', () => {
    const records = parseArxivAtom(
      `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2401.00001v1</id>
       <title>Paper</title><published>2024-01-01T00:00:00Z</published>
       <author><name>Hinton</name></author></entry></feed>`,
    );
    expect(records.get('2401.00001')?.authors).toEqual([{ family: 'Hinton' }]);
  });

  it('maps a missing entry to null so the sweep reports it unverified, never vacuously green', () => {
    const records = parseArxivAtom(ACT_XML);
    expect(records.get('9999.99999')).toBeUndefined();
  });
});

describe('isPublishedVenue (the preprint-vs-published rule)', () => {
  it('treats an explicit arXiv venue or no venue as citing the preprint', () => {
    expect(isPublishedVenue({ venue: 'arXiv preprint' })).toBe(false);
    expect(isPublishedVenue({ venue: 'arXiv 2304.13705' })).toBe(false);
    expect(isPublishedVenue({})).toBe(false);
  });

  it('treats a named conference/journal venue as citing the published version', () => {
    expect(isPublishedVenue({ venue: 'RSS 2023' })).toBe(true);
    expect(isPublishedVenue({ venue: 'ICLR 2025' })).toBe(true);
    expect(isPublishedVenue({ venue: 'Nature 615, 2023' })).toBe(true);
  });
});

describe('compareCitationAuthors against an arXiv record (the red-phase defect shape)', () => {
  const actRecord = parseArxivAtom(ACT_XML).get('2304.13705')!;

  it('names a planted wrong given name on an arXiv-only citation', () => {
    const divergences = compareCitationAuthors(
      {
        id: 'act-aloha-2023',
        authors: ['Tony Z. Zhao', 'Vikram Kumar', 'Sergey Levine', 'Chelsea Finn'],
        year: 2023,
        title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
      },
      actRecord,
      'arXiv',
    );
    expect(divergences.map((d) => `${d.kind}: ${d.problem}`)).toContain(
      'author-mismatch: author 2: given "Vikram" vs arXiv "Vikash"',
    );
  });

  it('passes the intact byline', () => {
    expect(
      compareCitationAuthors(
        {
          id: 'act-aloha-2023',
          authors: ['Tony Z. Zhao', 'Vikash Kumar', 'Sergey Levine', 'Chelsea Finn'],
          year: 2023,
          title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
        },
        actRecord,
        'arXiv',
      ),
    ).toEqual([]);
  });

  it('accepts registry initials where arXiv publishes the full name (no unverifiable expansion)', () => {
    expect(
      compareCitationAuthors(
        {
          id: 'x',
          authors: ['T. Z. Zhao', 'V. Kumar', 'S. Levine', 'C. Finn'],
          year: 2023,
          title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
        },
        actRecord,
        'arXiv',
      ),
    ).toEqual([]);
  });
});
