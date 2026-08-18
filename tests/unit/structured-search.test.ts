import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { DATASETS } from '@/data/datasets';
import { METHODS } from '@/data/methods';
import {
  applyStructuredFacet,
  assertStructuredIndexMatchesData,
  buildStructuredIndex,
  collectStructuredDocuments,
  expectedStructuredIds,
  toStructuredHits,
  type StructuredHit,
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
  it('maps MiniSearch results onto renderable hits with type and destination', () => {
    expect(
      toStructuredHits([
        {
          id: 'company:figure-ai',
          entityId: 'figure-ai',
          type: 'company',
          title: 'Figure AI',
          url: '/market-map/#company-figure-ai',
          facet: 'humanoids',
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
      },
    ]);
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
