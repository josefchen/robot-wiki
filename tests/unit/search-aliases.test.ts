import { describe, expect, it } from 'vitest';
import MiniSearch from 'minisearch';
import { COMPANIES } from '@/data/companies';
import { DATASETS } from '@/data/datasets';
import { METHODS } from '@/data/methods';
import { foldGreekToAscii } from '@/lib/greek-transliteration';
import {
  buildStructuredIndex,
  collectStructuredDocuments,
  structuredIndexLoadOptions,
} from '@/lib/structured-search';

/**
 * VAL-SEARCH-019 and VAL-SEARCH-020.
 *
 * Measured on the pre-alias index (2026-08-21, commit 677575f): a reader who
 * knows a method by its acronym expansion or by the vendor's own ASCII
 * spelling reached the wrong entity or nothing at all. "Action Chunking with
 * Transformers" ranked OpenVLA-OFT first and never returned ACT; "Optimized
 * Fine-Tuning" returned two companies and no method; "Distributed Robot
 * Interaction Dataset" returned four companies and not DROID; "pi05", "PI06"
 * and "pi07" all returned method:pi0 because the stored title tokens are
 * "pi0.5"/"pi0.6"/"pi0.7" and a prefix test cannot bridge the removed period.
 *
 * Greek folding (lib/greek-transliteration.ts) and this alias field divide the
 * work: folding is the mechanical character-level rule that makes the Greek
 * spelling and its ASCII transliteration collapse to one term for the whole
 * corpus for free, so no alias here is merely a transliteration. An alias
 * carries what no rule can derive: an acronym expansion, a vendor checkpoint
 * name, a paper nickname, a former name.
 */

const index = MiniSearch.loadJSON(
  JSON.stringify(buildStructuredIndex()),
  structuredIndexLoadOptions(),
);

function firstResultId(query: string): string | undefined {
  return index.search(query)[0]?.id;
}

/**
 * Greek folding is applied to both sides because it already runs corpus-wide,
 * so an alias that only transliterates the title would still read as a
 * substring here and be rejected. Punctuation is deliberately NOT stripped:
 * the assertion is about the displayed title, and "pi06" against the displayed
 * "π0.6" is a name the reader has to be given, not a slice of the title.
 */
function isSubstringOfTitle(alias: string, title: string): boolean {
  return foldGreekToAscii(title).includes(foldGreekToAscii(alias));
}

const ALIASED_METHODS = METHODS.filter((method) => method.aka.length > 0);
const ALIASED_DATASETS = DATASETS.filter((dataset) => dataset.aka.length > 0);

describe('methods and datasets carry aliases (VAL-SEARCH-020a)', () => {
  it('samples at least 10 methods and at least 3 datasets', () => {
    expect(ALIASED_METHODS.length).toBeGreaterThanOrEqual(10);
    expect(ALIASED_DATASETS.length).toBeGreaterThanOrEqual(3);
  });

  it('covers every entity whose displayed title contains a non-ASCII character', () => {
    const nonAscii = [...METHODS, ...DATASETS].filter((entity) =>
      [...entity.name].some((character) => character.codePointAt(0)! > 127),
    );
    expect(nonAscii.length).toBeGreaterThan(0);
    for (const entity of nonAscii) {
      expect(
        entity.aka.length,
        `${entity.name} has a non-ASCII title and must carry an alias by construction`,
      ).toBeGreaterThan(0);
    }
  });

  it('carries no alias that is merely a substring of its own title', () => {
    for (const entity of [...ALIASED_METHODS, ...ALIASED_DATASETS]) {
      for (const alias of entity.aka) {
        expect(
          isSubstringOfTitle(alias, entity.name),
          `alias "${alias}" is contained in the title "${entity.name}" and reaches nothing new`,
        ).toBe(false);
      }
    }
  });

  it('ranks the target entity first for every alias query', () => {
    for (const method of ALIASED_METHODS) {
      for (const alias of method.aka) {
        expect(
          firstResultId(alias),
          `alias "${alias}" must rank method:${method.id} first`,
        ).toBe(`method:${method.id}`);
      }
    }
    for (const dataset of ALIASED_DATASETS) {
      for (const alias of dataset.aka) {
        expect(
          firstResultId(alias),
          `alias "${alias}" must rank dataset:${dataset.id} first`,
        ).toBe(`dataset:${dataset.id}`);
      }
    }
  });
});

describe('aliases are search-only (VAL-SEARCH-020c)', () => {
  it('is read by the search index and by no rendering surface', async () => {
    const { readFile, readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    async function walk(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const path = join(dir, entry.name);
          if (entry.isDirectory()) return walk(path);
          return /\.(ts|tsx|mdx)$/.test(entry.name) ? [path] : [];
        }),
      );
      return files.flat();
    }

    const readers: string[] = [];
    for (const root of ['app', 'components', 'lib', 'content']) {
      for (const file of await walk(root)) {
        const source = await readFile(file, 'utf8');
        // Both shapes count as reading it: a property access, and a bare
        // 'aka' key, which is how a table column or a field list would pull
        // the array onto the page without ever naming the entity.
        if (/\.aka\b/.test(source) || /['"`]aka['"`]/.test(source)) {
          readers.push(file);
        }
      }
    }
    // company-card.tsx is the one rendering surface that legitimately shows
    // aliases: the market map presented Company.aka before this change, and
    // VAL-SEARCH-020(c) exempts what a route already presented.
    expect(readers.sort()).toEqual([
      'components/market-map/company-card.tsx',
      'lib/structured-search.ts',
    ]);
  });
});

describe('aliases are unambiguous across the whole corpus (VAL-SEARCH-020b)', () => {
  it('maps no alias to two different entities', () => {
    const owners = new Map<string, string[]>();
    const rows = [
      ...COMPANIES.map((c) => [`company:${c.id}`, c.aka] as const),
      ...METHODS.map((m) => [`method:${m.id}`, m.aka] as const),
      ...DATASETS.map((d) => [`dataset:${d.id}`, d.aka] as const),
    ];
    for (const [id, aliases] of rows) {
      for (const alias of aliases) {
        const key = foldGreekToAscii(alias).replace(/[^a-z0-9]/g, '');
        owners.set(key, [...(owners.get(key) ?? []), id]);
      }
    }
    const duplicates = [...owners.entries()].filter(
      ([, ids]) => new Set(ids).size > 1,
    );
    expect(
      duplicates.map(([key, ids]) => `${key} -> ${ids.join(', ')}`),
    ).toEqual([]);
  });
});

describe('an acronym query outranks its prefix collisions (VAL-SEARCH-019)', () => {
  /**
   * The population is derived, not listed: every method and dataset whose
   * displayed title is a single short token is an acronym-shaped query, so a
   * row added later is graded by this test rather than skipped by it.
   */
  const documents = collectStructuredDocuments();
  const acronymTitled = documents.filter((doc) => {
    // Folded, so a Greek-lettered short title (π0) is graded as the acronym
    // query a reader actually types rather than skipped for its glyph.
    const folded = foldGreekToAscii(doc.title);
    return doc.type !== 'company' && folded.length <= 6 && /^[a-z0-9]+$/.test(folded);
  });

  it('finds acronym-shaped titles to grade', () => {
    expect(acronymTitled.length).toBeGreaterThanOrEqual(3);
    expect(acronymTitled.map((doc) => doc.title)).toContain('ACT');
  });

  it('ranks the exactly-titled row first, in either case', () => {
    for (const doc of acronymTitled) {
      for (const query of [doc.title.toUpperCase(), doc.title.toLowerCase()]) {
        expect(
          firstResultId(query),
          `query "${query}" must rank ${doc.id} above its prefix collisions`,
        ).toBe(doc.id);
      }
    }
  });

  it('records the prefix collisions each acronym actually has', () => {
    // A collision is an indexed term in a NON-title field that strictly
    // extends the query token: "act" reaches "actuator" and "action", which is
    // why actuator-drive companies appear in the ACT result set at all.
    const collisions = new Map<string, string[]>();
    for (const doc of acronymTitled) {
      const token = foldGreekToAscii(doc.title);
      const found = new Set<string>();
      for (const other of documents) {
        if (other.id === doc.id) continue;
        for (const word of foldGreekToAscii(
          [other.text, other.facet].join(' '),
        ).split(/[^a-z0-9.]+/)) {
          if (word.startsWith(token) && word !== token) found.add(word);
        }
      }
      if (found.size > 0) collisions.set(doc.title, [...found].sort());
    }
    expect(collisions.get('ACT')).toEqual(
      expect.arrayContaining(['action', 'actuator', 'actuators']),
    );
    expect(collisions.get('Octo')).toEqual(
      expect.arrayContaining(['october']),
    );
    // The third recorded collision: "pi0" strictly prefixes the later
    // generations' own folded names, which is why the whole family answers it.
    expect(collisions.get('\u03c00')).toEqual(
      expect.arrayContaining(['pi0.5', 'pi0.6', 'pi0.7']),
    );
    expect(
      collisions.size,
      'at least three acronym titles must have a recorded collision to grade',
    ).toBeGreaterThanOrEqual(3);
  });
});
