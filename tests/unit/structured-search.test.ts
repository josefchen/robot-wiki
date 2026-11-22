import { describe, expect, it, vi } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { DATASETS } from '@/data/datasets';
import { METHODS } from '@/data/methods';
import { roundsInWindow } from '@/lib/rounds';
import { ROUNDS_PAGE_PATH, roundAnchor } from '@/lib/rounds-page';
import { SNIPPET_MIN_CHARS } from '@/lib/entity-cells';
import {
  applyStructuredFacet,
  assertStructuredIndexMatchesData,
  assertStructuredSnippets,
  buildStructuredIndex,
  collectStructuredDocuments,
  createStructuredSearchClient,
  expectedStructuredIds,
  structuredIndexLoadOptions,
  toStructuredHits,
  type StructuredHit,
  type StructuredSearchDocument,
} from '@/lib/structured-search';

const EXPECTED_COUNT = METHODS.length + COMPANIES.length + DATASETS.length;

describe('structured entity search in reader questions', () => {
  it.each([true, false])('recognizes names in the loaded index (stored aliases: %s)', async (storedAliases) => {
    const serialized = buildStructuredIndex() as {storedFields: Record<string, {aliases?: string[]}>};
    if (!storedAliases) {
      for (const row of Object.values(serialized.storedFields)) delete row.aliases;
    }
    const fetchIndex = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(serialized)));
    try {
      const client = await createStructuredSearchClient();
      const ids = async (query: string) => (await client.search(query)).map(hit => hit.id);
      expect(await ids('Where can I buy a Swiss fishing licence?')).toEqual([]);
      expect(await ids('Swiss fishing licence application instructions')).toEqual([]);
      expect(await ids('Which companies sell Swiss fishing licences?')).toEqual([]);
      expect(await ids('robotic hand with chocolate frosting')).toEqual([]);
      expect(await ids('robotic hand with no tactile sensors')).toEqual([]);
      expect(await ids('Did STAR stitch real bowel tissue by itself?')).toEqual([]);
      expect(await ids('How do I figure out how humanoid robots act?')).toEqual([]);
      expect(await ids('Which arm did the BridgeData V2 researchers use?')).toEqual(['dataset:bridgedata-v2']);
      expect(await ids('Which arm was used for BridgeData?')).toEqual(['dataset:bridgedata-v2']);
      expect(await ids('Which arm was used for BridgeData V1?')).toEqual([]);
      expect(await ids('What does Figure’s original Helix do?')).toEqual(['company:figure-ai']);
      expect(await ids('Does Figure AI make humanoid robots?')).toEqual(['company:figure-ai']);
      expect(await ids('When was Action Chunking with Transformers introduced?')).toEqual(['method:act']);
      expect(await ids('Which robots are part of OXE?')).toEqual(['dataset:open-x-embodiment']);
      expect(await ids('Can I use π0.5 or pi0-FAST for this?')).toEqual(['method:pi05', 'method:pi0-fast']);
      expect(await ids('How was pi 0.5 trained?')).toEqual(['method:pi05']);
      expect(await ids('How does OpenVLA compare with OpenVLA-OFT?')).toEqual(['method:openvla', 'method:openvla-oft']);
      expect((await ids('Which companies make surgical robots?')).sort()).toEqual([
        'company:cmr-surgical', 'company:intuitive-surgical', 'company:moon-surgical',
      ]);
      const hands = await ids('Which companies build dexterous robot hands?');
      expect(hands).toEqual(expect.arrayContaining(['company:shadow-robot', 'company:robot-era', 'company:agile-robots']));
      expect(hands.every(id => id.startsWith('company:'))).toBe(true);
      const hardware = await ids('robotic hand with tactile sensors');
      expect(hardware[0]).toBe('company:xela-robotics');
      expect(hardware).toContain('company:paxini');
      expect(hardware.indexOf('company:wonik-robotics')).toBeGreaterThan(hardware.indexOf('company:paxini'));
      expect(await ids('Who is building warehouse robots?')).toContain('company:locus-robotics');
      const diffusion = await ids('Which methods use diffusion to predict robot actions?');
      expect(diffusion).toEqual(expect.arrayContaining(['method:diffusion-policy', 'method:gr00t-2']));
      expect(diffusion.every(id => id.startsWith('method:'))).toBe(true);
      expect(diffusion).not.toContain('method:rt-1');
      expect(await ids('Which policy uses diffusion?')).toEqual(diffusion);
      expect(await ids('Which dataset uses the WidowX 250 arm?')).toEqual(['dataset:bridgedata-v2']);
      expect(await ids('Which datasets combine Franka Panda wrist-camera demonstrations?')).toEqual(['dataset:droid', 'dataset:robomind']);
      expect(await ids('Which data sets include AgiBot G1?')).toEqual(['dataset:agibot-world']);
      expect(await ids('Which datasets record Swiss fishing licences?')).toEqual([]);
      expect(await ids('Which methods use chocolate frosting?')).toEqual([]);
      expect(await ids('Which datasets use Franka Panda chocolate frosting?')).toEqual([]);
      expect((await ids('DROI'))[0]).toBe('dataset:droid');
      expect((await ids('Robotics Transformer 1'))[0]).toBe('method:rt-1');
      expect(fetchIndex).toHaveBeenCalledTimes(1);
    } finally {
      fetchIndex.mockRestore();
    }
  });
});

describe('named company funding records', () => {
  it('returns each anchored issuer with the recorded status and preserves the ordinary profile rankings', async () => {
    const serialized = buildStructuredIndex() as Record<string, unknown>;
    const legacy = {...serialized};
    delete legacy.fundingRows;
    const fetchIndex = vi.spyOn(globalThis, 'fetch');
    try {
      fetchIndex.mockResolvedValueOnce(new Response(JSON.stringify(legacy)));
      const before = await createStructuredSearchClient();
      fetchIndex.mockResolvedValueOnce(new Response(JSON.stringify(serialized)));
      const client = await createStructuredSearchClient();
      for (const company of COMPANIES) {
        expect(await client.search(company.name), company.name).toEqual(await before.search(company.name));
      }
      const rows = roundsInWindow();
      for (const row of rows) {
        const matches = await client.search(row.company + ' funding');
        const sameIssuer = rows.filter(other => other.company === row.company);
        expect(matches.map(hit => hit.url), row.company).toEqual(
          sameIssuer.map(other => ROUNDS_PAGE_PATH + '#' + roundAnchor(other.key)),
        );
        const match = matches.find(hit => hit.entityId === row.key)!;
        expect(match.snippet.toLowerCase()).toContain(row.status);
        expect(match.snippet.includes('Reported')).toBe(row.sourceType === 'reported');
      }
      const ids = async (q: string) => (await client.search(q)).map(hit => hit.id);
      expect(await ids('O-ID')).toEqual(['funding:o-id-2026-09-24']);
      expect(await ids('Minerva Humanoids')).toEqual(['funding:minerva-humanoids-2026-10-06']);
      expect(await ids('How much did 1X raise?')).toEqual(['funding:1x-softbank-talks-2026-08-28']);
      expect(await ids('Who invested in Motion?')).toEqual(['funding:motion-2026-08-27']);
      expect(await ids('How much money did Minerva Humanoids raise?')).toEqual(await ids('Minerva Humanoids funding'));
      expect(await ids('What is O-ID’s latest funding round?')).toEqual(await ids('O-ID funding'));
      expect(await ids('Who led O-ID’s pre-seed round?')).toEqual(await ids('O-ID funding'));
      expect(await ids('Did Motion raise capital?')).toEqual(await ids('Motion funding'));
      expect(await ids('Who are the investors in Motion?')).toEqual(await ids('Motion funding'));
      expect(await ids('Who funded O-ID or Figure AI?')).toEqual(['funding:o-id-2026-09-24', 'company:figure-ai']);
      for (const q of [
        'How high can 1X raise its arms?',
        'How much did 1X raise its gripper?',
        'Who invested in motion planning research?',
        'Who invested in Motion Planning Research?',
        'How do I raise the sample rate for Physical Intelligence controllers?',
        'Who funded Physical Intelligence research?',
        'Motion planning research funding',
        'Which companies make robots that raise boxes?',
      ]) {
        expect(await client.search(q), q).toEqual(await before.search(q));
      }
      expect(await ids('motion')).toEqual((await before.search('motion')).map(hit => hit.id));
      for (const q of ['funding', 'CarbonSix funding', 'How do I seed a motion planner?', 'Which companies make surgical robots?']) {
        expect((await ids(q)).some(id => id.startsWith('funding:'))).toBe(false);
      }
    } finally {
      fetchIndex.mockRestore();
    }
  });
});

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
    expect(docs.filter((doc) => doc.type === 'company')).toHaveLength(COMPANIES.length);
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
