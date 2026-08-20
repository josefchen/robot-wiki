import { describe, expect, it } from 'vitest';
import {
  compareAuthorName,
  compareCitationAuthors,
  givenInitials,
  isDocumentedDivergence,
  isInitialOnlyName,
  parseCrossrefRecord,
  type CrossrefAuthorException,
} from '@/lib/crossref-authors';

describe('givenInitials / isInitialOnlyName', () => {
  it('extracts initials from full names, dotted initials, and compounds', () => {
    expect(givenInitials('Ranjan')).toEqual(['r']);
    expect(givenInitials('M. Y.')).toEqual(['m', 'y']);
    expect(givenInitials('Michelle A.')).toEqual(['m', 'a']);
    expect(givenInitials(undefined)).toEqual([]);
  });

  it('recognises initials-only strings, including hyphenated compounds', () => {
    expect(isInitialOnlyName('M.')).toBe(true);
    expect(isInitialOnlyName('M. Y.')).toBe(true);
    expect(isInitialOnlyName('J.-C.')).toBe(true);
    expect(isInitialOnlyName('L.E.')).toBe(true);
    expect(isInitialOnlyName('Ranjan')).toBe(false);
    expect(isInitialOnlyName(undefined)).toBe(false);
  });
});

describe('compareAuthorName', () => {
  it('passes a family and given name that match the record exactly', () => {
    expect(compareAuthorName('Ranjan Mukherjee', { family: 'Mukherjee', given: 'Ranjan' })).toBeNull();
  });

  it('flags a wrong family name', () => {
    expect(compareAuthorName('Ryo Katsura', { family: 'Mukherjee', given: 'Ryo' })).toBe(
      'family "Katsura" vs Crossref "Mukherjee"',
    );
  });

  it('folds diacritics, umlauts and hyphenation in family names', () => {
    expect(compareAuthorName('Alin Albu-Schäffer', { family: 'Albu-Schaeffer', given: 'Alin' })).toBeNull();
    expect(compareAuthorName('Alin Albu-Schaeffer', { family: 'Albu-Schäffer', given: 'Alin' })).toBeNull();
    // Crossref sometimes drops a letter of the transliteration entirely.
    expect(compareAuthorName('Gerd Hirzinger', { family: 'Hirzinger', given: 'G.' })).toBeNull();
  });

  it('matches multi-word family names on the last two tokens (Di Carlo)', () => {
    expect(compareAuthorName('Jared Di Carlo', { family: 'Di Carlo', given: 'Jared' })).toBeNull();
  });

  it('flags a full given name that contradicts the record (Josef vs Roberto)', () => {
    expect(compareAuthorName('Josef Martin-Martin', { family: 'Martin-Martin', given: 'Roberto' })).toBe(
      'given "Josef" vs Crossref "Roberto"',
    );
    expect(compareAuthorName('Ryojun Mukherjee', { family: 'Mukherjee', given: 'Ranjan' })).toBe(
      'given "Ryojun" vs Crossref "Ranjan"',
    );
    // Near-miss single-letter differences are still wrong names.
    expect(compareAuthorName('Gwanghyun Ji', { family: 'Ji', given: 'Gwanghyeon' })).toBe(
      'given "Gwanghyun" vs Crossref "Gwanghyeon"',
    );
  });

  it('flags an initial that contradicts the record (Seungjae Shin vs H. Shin)', () => {
    expect(compareAuthorName('Seungjae Shin', { family: 'Shin', given: 'H.' })).toBe(
      'given "Seungjae" vs Crossref "H." (initial S vs H)',
    );
  });

  it('tolerates Crossref middle-initial inconsistency on an agreeing primary name', () => {
    expect(compareAuthorName('Matthew Mason', { family: 'Mason', given: 'Matthew T.' })).toBeNull();
    expect(compareAuthorName('Daniel E. Whitney', { family: 'Whitney', given: 'Daniel' })).toBeNull();
  });

  it('treats a Crossref family-field whole name as a family match (Luqun Ni)', () => {
    expect(compareAuthorName('Luqun Ni', { family: 'Luqun Ni' })).toBeNull();
  });
});

describe('parseCrossrefRecord', () => {
  it('projects title, authors and every candidate year out of a /works payload', () => {
    const record = parseCrossrefRecord({
      message: {
        title: ['Unified Impedance and Admittance Control'],
        author: [
          { family: 'Ott', given: 'Christian' },
          { family: 'Mukherjee', given: 'Ranjan' },
        ],
        issued: { 'date-parts': [[2010, 5]] },
      },
    });
    expect(record).toEqual({
      title: 'Unified Impedance and Admittance Control',
      authors: [
        { family: 'Ott', given: 'Christian' },
        { family: 'Mukherjee', given: 'Ranjan' },
      ],
      years: [2010],
    });
  });

  it('collects print and online years as candidates and rejects non-work payloads', () => {
    const record = parseCrossrefRecord({
      message: {
        author: [{ family: 'Lee', given: 'Michelle A.' }],
        issued: { 'date-parts': [[2019]] },
        'published-print': { 'date-parts': [[2020]] },
      },
    });
    expect(record?.years).toEqual([2019, 2020]);
    expect(parseCrossrefRecord(null)).toBeNull();
    expect(parseCrossrefRecord({ status: 'error' })).toBeNull();
  });
});

// The confirmed 2026-08-20 defects as fixtures: every one of these must be
// reported against the pre-fix registry rows, and none after the fix.
const hanRecord = parseCrossrefRecord({
  message: {
    author: [
      { family: 'Han', given: 'D.' },
      { family: 'Park', given: 'M. Y.' },
      { family: 'Choi', given: 'J.' },
      { family: 'Shin', given: 'H.' },
      { family: 'Behrens', given: 'R.' },
      { family: 'Rhim', given: 'S.' },
    ],
    issued: { 'date-parts': [[2024]] },
  },
})!;

describe('compareCitationAuthors against the confirmed defects', () => {
  it('flags Ryojun Mukherjee, Josef Martin-Martin and Munhee Lee', () => {
    expect(
      compareCitationAuthors(
        {
          id: 'ott-2010',
          authors: ['Christian Ott', 'Ryojun Mukherjee', 'Yoshihiko Nakamura'],
          year: 2010,
          title: 'Unified Impedance and Admittance Control',
        },
        parseCrossrefRecord({
          message: {
            author: [
              { family: 'Ott', given: 'Christian' },
              { family: 'Mukherjee', given: 'Ranjan' },
              { family: 'Nakamura', given: 'Yoshihiko' },
            ],
            issued: { 'date-parts': [[2010]] },
          },
        })!,
      ).map((d) => `${d.kind}: ${d.problem}`),
    ).toEqual(['author-mismatch: author 2: given "Ryojun" vs Crossref "Ranjan"']);

    expect(
      compareCitationAuthors(
        {
          id: 'martin-martin-2019',
          authors: ['Josef Martin-Martin', 'Munhee Lee'],
          year: 2019,
          title: 'Variable Impedance Control in End-Effector Space',
        },
        parseCrossrefRecord({
          message: {
            author: [
              { family: 'Martin-Martin', given: 'Roberto' },
              { family: 'Lee', given: 'Michelle A.' },
            ],
            issued: { 'date-parts': [[2019]] },
          },
        })!,
      ).map((d) => d.problem),
    ).toEqual([
      'author 1: given "Josef" vs Crossref "Roberto"',
      'author 2: given "Munhee" vs Crossref "Michelle A."',
    ]);
  });

  it('flags the contradicted initials (Seungjae Shin, Yongsik Rhim) and every unverifiable expansion in han-force-pain-2024', () => {
    const kinds = compareCitationAuthors(
      {
        id: 'han-force-pain-2024',
        authors: [
          'Donghwan Han',
          'Minki Park',
          'Jinsoo Choi',
          'Seungjae Shin',
          'Rainer Behrens',
          'Yongsik Rhim',
        ],
        year: 2024,
        title:
          'Evaluation of force pain thresholds to ensure collision safety in worker-robot collaborative operations',
      },
      hanRecord,
    );
    const problems = kinds.map((d) => d.problem);
    expect(problems).toContain('author 4: given "Seungjae" vs Crossref "H." (initial S vs H)');
    expect(problems).toContain('author 6: given "Yongsik" vs Crossref "S." (initial Y vs S)');
    const crossrefGiven = ['D.', 'M. Y.', 'J.', 'H.', 'R.', 'S.'];
    for (const [i, name] of ['Donghwan', 'Minki', 'Jinsoo', 'Seungjae', 'Rainer', 'Yongsik'].entries()) {
      expect(problems).toContain(
        `author ${i + 1}: given name "${name}" expands an initial; Crossref publishes only "${crossrefGiven[i]}"`,
      );
    }
  });

  it('passes after correction: initials kept where the source publishes initials', () => {
    expect(
      compareCitationAuthors(
        {
          id: 'han-force-pain-2024',
          authors: ['D. Han', 'M. Y. Park', 'J. Choi', 'H. Shin', 'R. Behrens', 'S. Rhim'],
          year: 2024,
          title:
            'Evaluation of force pain thresholds to ensure collision safety in worker-robot collaborative operations',
        },
        hanRecord,
      ),
    ).toEqual([]);
  });

  it('flags the wrong first author the sweep found in vasarhelyi-flocking-2018', () => {
    const problems = compareCitationAuthors(
      {
        id: 'vasarhelyi-flocking-2018',
        authors: ['Tamás Vásárhelyi', 'Csaba Virágh'],
        year: 2018,
        title: 'Optimized flocking of autonomous drones in confined environments',
      },
      parseCrossrefRecord({
        message: {
          author: [
            { family: 'Vásárhelyi', given: 'Gábor' },
            { family: 'Virágh', given: 'Csaba' },
          ],
          issued: { 'date-parts': [[2018]] },
        },
      })!,
    ).map((d) => d.problem);
    expect(problems).toContain('author 1: given "Tamás" vs Crossref "Gábor"');
  });

  it('reports author-count, no-authors, year and title divergences', () => {
    const problems = compareCitationAuthors(
      { id: 'x', authors: ['Alice Alpha'], year: 2001, title: 'Totally Different Paper' },
      parseCrossrefRecord({
        message: {
          title: ['The Real Title'],
          author: [
            { family: 'Alpha', given: 'Alice' },
            { family: 'Beta', given: 'Bob' },
          ],
          issued: { 'date-parts': [[2002]] },
        },
      })!,
    ).map((d) => d.kind);
    expect(problems).toContain('author-count');
    expect(problems).toContain('year');
    expect(problems).toContain('title');

    expect(
      compareCitationAuthors(
        { id: 'x', authors: ['Franka Robotics'], year: 2026, title: 'Docs' },
        parseCrossrefRecord({ message: { author: [], issued: { 'date-parts': [[2026]] } } })!,
      ).map((d) => d.kind),
    ).toEqual(['no-authors']);
  });
});

describe('isDocumentedDivergence', () => {
  const exceptions: CrossrefAuthorException[] = [
    { id: 'a', skip: 'author-expansion', reason: 'r', verified: 'v' },
    { id: 'a', skip: 'author-expansion', authorIndex: 2, reason: 'r', verified: 'v' },
    { id: 'b', skip: 'year', reason: 'r', verified: 'v' },
  ];

  it('scopes expansion exceptions by author position', () => {
    const d = (kind: 'author-expansion', authorIndex?: number) => ({ citationId: 'a', kind, authorIndex, problem: 'p' });
    // The un-scoped entry covers every expansion divergence for its id.
    expect(isDocumentedDivergence(d('author-expansion'), exceptions)).toBe(true);
    expect(isDocumentedDivergence(d('author-expansion', 3), exceptions)).toBe(true);
    // A scoped entry covers only its own position: drop the catch-all and
    // position 2 alone is masked.
    const scoped = exceptions.filter((e) => e.authorIndex !== undefined);
    expect(isDocumentedDivergence(d('author-expansion', 2), scoped)).toBe(true);
    expect(isDocumentedDivergence(d('author-expansion', 3), scoped)).toBe(false);
  });

  it('does not let a year exception mask an author problem', () => {
    expect(
      isDocumentedDivergence({ citationId: 'b', kind: 'author-mismatch', problem: 'p' }, exceptions),
    ).toBe(false);
    expect(isDocumentedDivergence({ citationId: 'b', kind: 'year', problem: 'p' }, exceptions)).toBe(true);
  });
});
