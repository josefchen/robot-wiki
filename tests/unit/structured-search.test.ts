import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { DATASETS } from '@/data/datasets';
import { METHODS } from '@/data/methods';
import { SNIPPET_MIN_CHARS } from '@/lib/entity-cells';
import {
  applyStructuredFacet,
  assertStructuredIndexMatchesData,
  assertStructuredSnippets,
  buildStructuredIndex,
  collectStructuredDocuments,
  expectedStructuredIds,
  structuredIndexLoadOptions,
  toStructuredHits,
  type StructuredHit,
  type StructuredSearchDocument,
} from '@/lib/structured-search';

const EXPECTED_COUNT = METHODS.length + COMPANIES.length + DATASETS.length;

function hit(overrides: Partial<StructuredHit> = {}): StructuredHit {
  return {
    id: 'company:figure-ai',
    entityId: 'figure-ai',
    type: 'company',
    title: 'Figure AI',
    url: '/market-map/#company-figure-ai',
    facet: 'humanoids',
    snippet: 'Builds general-purpose humanoid robots for commercial work.',
    ...overrides,
  };
}

describe('collectStructuredDocuments', () => {
  it('indexes every method, company, and dataset from the shipped files', () => {
    const docs = collectStructuredDocuments();
    expect(docs).toHaveLength(EXPECTED_COUNT);
    expect(docs.filter((doc) => doc.type === 'method')).toHaveLength(
      METHODS.length,
    );
    expect(docs.filter((doc) => doc.type === 'company')).toHaveLength(111);
    expect(docs.filter((doc) => doc.type === 'dataset')).toHaveLength(
      DATASETS.length,
    );
  });

  it('uses namespaced ids so method/company collisions stay unique', () => {
    const docs = collectStructuredDocuments();
    const ids = docs.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(docs.length);
    expect(ids).toContain('method:skild');
    expect(ids).toContain('company:skild-ai');
    expect(ids).toContain('method:act');
    expect(ids).toContain('company:figure-ai');
    expect(ids).toContain('dataset:droid');
  });

  it('stores title, type, destination, and searchable text for the UI', () => {
    const docs = collectStructuredDocuments();
    const figure = docs.find((doc) => doc.id === 'company:figure-ai');
    expect(figure).toMatchObject({
      entityId: 'figure-ai',
      type: 'company',
      title: 'Figure AI',
      url: '/market-map/#company-figure-ai',
    });
    expect(figure?.text.toLowerCase()).toContain('figure');

    const act = docs.find((doc) => doc.id === 'method:act');
    expect(act).toMatchObject({
      entityId: 'act',
      type: 'method',
      title: 'ACT',
      url: '/manipulation/comparison-matrix/#method-act',
    });

    const droid = docs.find((doc) => doc.id === 'dataset:droid');
    expect(droid).toMatchObject({
      entityId: 'droid',
      type: 'dataset',
      title: 'DROID',
      url: '/data-hardware/datasets/#dataset-droid',
    });
  });
});

describe('greek-lettered titles are reachable by their ASCII spelling', () => {
  const GREEK_FAMILY: Array<{ ascii: string; greek: string; entityId: string }> =
    [
      { ascii: 'pi0', greek: '\u03c00', entityId: 'pi0' },
      { ascii: 'pi0-FAST', greek: '\u03c00-FAST', entityId: 'pi0-fast' },
      { ascii: 'pi0.5', greek: '\u03c00.5', entityId: 'pi05' },
      { ascii: 'pi0.6', greek: '\u03c00.6', entityId: 'pi06' },
      { ascii: 'pi0.7', greek: '\u03c00.7', entityId: 'pi07' },
    ];

  async function searchLoaded(query: string) {
    const MiniSearch = (await import('minisearch')).default;
    const json = JSON.stringify(buildStructuredIndex());
    const index = MiniSearch.loadJSON(json, structuredIndexLoadOptions());
    return index.search(query);
  }

  it('folds Greek letters so an ASCII query reaches the method row first', async () => {
    for (const entry of GREEK_FAMILY) {
      const results = await searchLoaded(entry.ascii);
      expect(
        results[0]?.id,
        `ASCII query "${entry.ascii}" must rank method:${entry.entityId} first`,
      ).toBe(`method:${entry.entityId}`);
    }
  });

  it('keeps every Greek-form query working (the fix is additive)', async () => {
    for (const entry of GREEK_FAMILY) {
      const results = await searchLoaded(entry.greek);
      expect(
        results[0]?.id,
        `Greek query "${entry.greek}" must still rank method:${entry.entityId} first`,
      ).toBe(`method:${entry.entityId}`);
    }
  });

  it('does not hand the reader the lab when they asked for the model', async () => {
    // Physical Intelligence's alias list contains "Pi" and the Greek letter,
    // which sat within the configured fuzzy distance while the model's Greek
    // title sat outside it, so "pi0" returned the company and nothing else.
    const results = await searchLoaded('pi0');
    expect(results[0]?.id).toBe('method:pi0');
  });

  it('leaves ASCII-titled entities searching exactly as before', async () => {
    for (const [query, id] of [
      ['ACT', 'method:act'],
      ['Figure AI', 'company:figure-ai'],
      ['DROID', 'dataset:droid'],
    ] as const) {
      const results = await searchLoaded(query);
      expect(results.some((result) => result.id === id)).toBe(true);
    }
  });
});

describe('expectedStructuredIds', () => {
  it('lists every shipped method, company, and dataset id', () => {
    const expected = expectedStructuredIds();
    expect(expected).toHaveLength(EXPECTED_COUNT);
    expect(
      expected.filter((entry) => entry.type === 'company').map((e) => e.entityId),
    ).toEqual(COMPANIES.map((company) => company.id));
    expect(
      expected.filter((entry) => entry.type === 'method').map((e) => e.entityId),
    ).toEqual(METHODS.map((method) => method.id));
    expect(
      expected.filter((entry) => entry.type === 'dataset').map((e) => e.entityId),
    ).toEqual(DATASETS.map((dataset) => dataset.id));
  });
});

describe('buildStructuredIndex', () => {
  it('serializes a MiniSearch index whose document count matches the data files', () => {
    const serialized = buildStructuredIndex() as { documentCount?: number };
    expect(serialized.documentCount).toBe(EXPECTED_COUNT);
  });

  it('round-trips through JSON and still searches by entity name', async () => {
    const MiniSearch = (await import('minisearch')).default;
    const serialized = buildStructuredIndex();
    const json = JSON.stringify(serialized);
    expect(() => JSON.parse(json)).not.toThrow();
    const index = MiniSearch.loadJSON(json, {
      fields: ['title', 'text', 'type', 'facet'],
      storeFields: ['entityId', 'type', 'title', 'url', 'facet'],
    });
    const figure = index.search('Figure AI');
    expect(figure.some((result) => result.id === 'company:figure-ai')).toBe(
      true,
    );
    const act = index.search('ACT');
    expect(act.some((result) => result.id === 'method:act')).toBe(true);
    const droid = index.search('DROID');
    expect(droid.some((result) => result.id === 'dataset:droid')).toBe(true);
  });
});

describe('assertStructuredIndexMatchesData', () => {
  it('accepts an index whose stored ids match the shipped data files', () => {
    expect(assertStructuredIndexMatchesData(buildStructuredIndex())).toBe(
      EXPECTED_COUNT,
    );
  });

  it('fails when the document count drifts', () => {
    expect(() =>
      assertStructuredIndexMatchesData({ documentCount: EXPECTED_COUNT - 1 }),
    ).toThrow(/count|drift|stale|partial/i);
  });

  it('fails when a stored entity id is missing from the data files', () => {
    const serialized = buildStructuredIndex() as {
      storedFields?: Record<string, { entityId?: string; type?: string }>;
    };
    if (serialized.storedFields) {
      const firstKey = Object.keys(serialized.storedFields)[0];
      serialized.storedFields[firstKey] = {
        ...serialized.storedFields[firstKey],
        entityId: 'not-a-real-entity',
      };
    }
    expect(() => assertStructuredIndexMatchesData(serialized)).toThrow(
      /id|drift|stale|partial|missing/i,
    );
  });
});

describe('toStructuredHits', () => {
  it('maps MiniSearch results onto renderable hits with type, destination, and snippet', () => {
    expect(
      toStructuredHits([
        {
          id: 'company:figure-ai',
          entityId: 'figure-ai',
          type: 'company',
          title: 'Figure AI',
          url: '/market-map/#company-figure-ai',
          facet: 'humanoids',
          snippet: 'Builds general-purpose humanoid robots.',
        },
      ]),
    ).toEqual([
      {
        id: 'company:figure-ai',
        entityId: 'figure-ai',
        type: 'company',
        title: 'Figure AI',
        url: '/market-map/#company-figure-ai',
        facet: 'humanoids',
        snippet: 'Builds general-purpose humanoid robots.',
      },
    ]);
  });

  it('reads the snippet back out of a round-tripped index', async () => {
    const MiniSearch = (await import('minisearch')).default;
    const index = MiniSearch.loadJSON<StructuredSearchDocument>(
      JSON.stringify(buildStructuredIndex()),
      structuredIndexLoadOptions(),
    );
    const [figure] = toStructuredHits(
      index.search('Figure AI').filter((r) => r.id === 'company:figure-ai'),
    );
    expect(figure.snippet.length).toBeGreaterThanOrEqual(SNIPPET_MIN_CHARS);
    expect(figure.snippet).toBe(
      COMPANIES.find((company) => company.id === 'figure-ai')?.description,
    );
  });
});

describe('assertStructuredSnippets', () => {
  it('passes over the shipped corpus and verifies every entity', () => {
    expect(assertStructuredSnippets()).toBe(EXPECTED_COUNT);
  });

  it('gives every entity a snippet of at least the minimum length', () => {
    for (const doc of collectStructuredDocuments()) {
      expect(
        doc.snippet.trim().length,
        `${doc.id} snippet is "${doc.snippet}"`,
      ).toBeGreaterThanOrEqual(SNIPPET_MIN_CHARS);
    }
  });

  it('covers all three entity types, so no type renders a bare title', () => {
    const byType = new Map<string, number>();
    for (const doc of collectStructuredDocuments()) {
      if (doc.snippet.trim()) {
        byType.set(doc.type, (byType.get(doc.type) ?? 0) + 1);
      }
    }
    expect(byType.get('method')).toBe(METHODS.length);
    expect(byType.get('company')).toBe(COMPANIES.length);
    expect(byType.get('dataset')).toBe(DATASETS.length);
  });

  it('rejects a snippet under the minimum length', () => {
    const docs = collectStructuredDocuments();
    expect(() =>
      assertStructuredSnippets([{ ...docs[0], snippet: 'too short' }, ...docs.slice(1)]),
    ).toThrow(/too short/i);
  });

  it('rejects an em-dash or an en-dash in a snippet', () => {
    const docs = collectStructuredDocuments();
    const long = 'A snippet long enough to clear the minimum length bound';
    expect(() =>
      assertStructuredSnippets([
        { ...docs[0], snippet: `${long} \u2014 with an em-dash` },
        ...docs.slice(1),
      ]),
    ).toThrow(/dash/i);
    expect(() =>
      assertStructuredSnippets([
        { ...docs[0], snippet: `${long} \u2013 with an en-dash` },
        ...docs.slice(1),
      ]),
    ).toThrow(/dash/i);
  });

  it('rejects two entities sharing byte-identical snippet text', () => {
    const docs = collectStructuredDocuments();
    expect(() =>
      assertStructuredSnippets([
        { ...docs[0], snippet: docs[1].snippet },
        ...docs.slice(1),
      ]),
    ).toThrow(/distinct/i);
  });
});

describe('applyStructuredFacet', () => {
  const hits = [
    hit(),
    hit({
      id: 'method:act',
      entityId: 'act',
      type: 'method',
      title: 'ACT',
      url: '/manipulation/comparison-matrix/#method-act',
      facet: 'continuous',
    }),
    hit({
      id: 'dataset:droid',
      entityId: 'droid',
      type: 'dataset',
      title: 'DROID',
      url: '/data-hardware/datasets/#dataset-droid',
      facet: '2024',
    }),
  ];

  it('returns the full set when the type facet is all', () => {
    expect(applyStructuredFacet(hits, { type: 'all' })).toHaveLength(3);
  });

  it('narrows to one entity type and restores the full set when cleared', () => {
    const companies = applyStructuredFacet(hits, { type: 'company' });
    expect(companies).toHaveLength(1);
    expect(companies[0].type).toBe('company');
    expect(applyStructuredFacet(hits, { type: 'all' })).toEqual(hits);
  });
});
