/**
 * Structured-entity search: MiniSearch over methods, companies, and datasets.
 *
 * The index is built at build time (scripts/build-search.ts) and written to
 * public/search-index.json. The runtime client loads that file and searches
 * it in the browser. This module is the seam the /search UI plugs into.
 *
 * Keep this on the existing search stack (lib/search.ts + scripts/build-search.ts).
 * Do not add a second indexer or a second result-mapping path.
 */
import MiniSearch from 'minisearch';
import { COMPANIES } from '../data/companies.ts';
import { DATASETS } from '../data/datasets.ts';
import { METHODS } from '../data/methods.ts';

export const STRUCTURED_INDEX_PATH = '/search-index.json';

export const ENTITY_TYPES = ['method', 'company', 'dataset'] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export type StructuredSearchDocument = {
  /** Namespaced MiniSearch id, e.g. "company:figure-ai". */
  id: string;
  /** Raw entity id from the shipped data file. */
  entityId: string;
  type: EntityType;
  title: string;
  /** Searchable body: aliases, description, tags. */
  text: string;
  /** Destination path including hash or query that presents this entity. */
  url: string;
  /** Extra facet values the UI can filter on (segment, year, etc.). */
  facet: string;
};

export type StructuredHit = {
  id: string;
  entityId: string;
  type: EntityType;
  title: string;
  url: string;
  facet: string;
};

export type StructuredFacet = {
  type: EntityType | 'all';
};

export const DEFAULT_STRUCTURED_FACET: StructuredFacet = { type: 'all' };

export const STRUCTURED_SEARCH_OPTIONS = {
  fields: ['title', 'text', 'type', 'facet'],
  storeFields: ['entityId', 'type', 'title', 'url', 'facet'],
  searchOptions: {
    boost: { title: 3, text: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
} as const;

export type StructuredSearchClient = {
  search(query: string): Promise<StructuredHit[]>;
};

function namespacedId(type: EntityType, entityId: string): string {
  return `${type}:${entityId}`;
}

function compactText(parts: Array<string | number | null | undefined>): string {
  return parts
    .flatMap((part) => {
      if (part === null || part === undefined) return [];
      const value = String(part).trim();
      return value ? [value] : [];
    })
    .join(' ');
}

function methodDocument(
  method: (typeof METHODS)[number],
): StructuredSearchDocument {
  return {
    id: namespacedId('method', method.id),
    entityId: method.id,
    type: 'method',
    title: method.name,
    text: compactText([
      method.name,
      method.year,
      method.actionRepresentation,
      method.backbone,
      ...method.conditioning,
    ]),
    url: `/manipulation/comparison-matrix/#method-${method.id}`,
    facet: method.actionRepresentation ?? '',
  };
}

function companyDocument(
  company: (typeof COMPANIES)[number],
): StructuredSearchDocument {
  return {
    id: namespacedId('company', company.id),
    entityId: company.id,
    type: 'company',
    title: company.name,
    text: compactText([
      company.name,
      ...company.aka,
      company.description,
      company.segment,
      company.subSegment,
      ...company.approach,
      company.hq.city,
      company.hq.country,
    ]),
    url: `/market-map/#company-${company.id}`,
    facet: company.segment,
  };
}

function datasetDocument(
  dataset: (typeof DATASETS)[number],
): StructuredSearchDocument {
  return {
    id: namespacedId('dataset', dataset.id),
    entityId: dataset.id,
    type: 'dataset',
    title: dataset.name,
    text: compactText([
      dataset.name,
      dataset.year,
      ...dataset.embodiments,
      dataset.license,
    ]),
    url: `/data-hardware/datasets/#dataset-${dataset.id}`,
    facet: dataset.year === null ? '' : String(dataset.year),
  };
}

/** Collect every structured entity as a MiniSearch document. */
export function collectStructuredDocuments(): StructuredSearchDocument[] {
  return [
    ...METHODS.map(methodDocument),
    ...COMPANIES.map(companyDocument),
    ...DATASETS.map(datasetDocument),
  ];
}

/** Expected (type, entityId) pairs from the shipped data files. */
export function expectedStructuredIds(): Array<{
  type: EntityType;
  entityId: string;
}> {
  return [
    ...METHODS.map((method) => ({
      type: 'method' as const,
      entityId: method.id,
    })),
    ...COMPANIES.map((company) => ({
      type: 'company' as const,
      entityId: company.id,
    })),
    ...DATASETS.map((dataset) => ({
      type: 'dataset' as const,
      entityId: dataset.id,
    })),
  ];
}

function createStructuredMiniSearch(): MiniSearch<StructuredSearchDocument> {
  return new MiniSearch<StructuredSearchDocument>({
    fields: [...STRUCTURED_SEARCH_OPTIONS.fields],
    storeFields: [...STRUCTURED_SEARCH_OPTIONS.storeFields],
    searchOptions: { ...STRUCTURED_SEARCH_OPTIONS.searchOptions },
  });
}

/** Options that must be passed to MiniSearch.loadJSON for a built index. */
export function structuredIndexLoadOptions() {
  return {
    fields: [...STRUCTURED_SEARCH_OPTIONS.fields],
    storeFields: [...STRUCTURED_SEARCH_OPTIONS.storeFields],
    searchOptions: { ...STRUCTURED_SEARCH_OPTIONS.searchOptions },
  };
}

/** Build a serializable MiniSearch index over the shipped data files. */
export function buildStructuredIndex(): unknown {
  const index = createStructuredMiniSearch();
  index.addAll(collectStructuredDocuments());
  return index.toJSON();
}

type StoredDocument = {
  entityId?: unknown;
  type?: unknown;
};

type SerializedStructuredIndex = {
  documentCount?: unknown;
  storedFields?: Record<string, StoredDocument>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Fail if the serialized MiniSearch index's stored documents do not match
 * the shipped data files in count and IDs. Returns the verified document
 * count on success.
 */
export function assertStructuredIndexMatchesData(indexJson: unknown): number {
  const expected = expectedStructuredIds();
  const expectedCount = expected.length;

  if (!isRecord(indexJson)) {
    throw new Error(
      'structured index is stale or partial: serialized index is not an object',
    );
  }

  const serialized = indexJson as SerializedStructuredIndex;
  const documentCount = serialized.documentCount;
  if (typeof documentCount !== 'number' || documentCount !== expectedCount) {
    throw new Error(
      `structured index count drift: expected ${expectedCount} documents, got ${String(documentCount)} (stale or partial index)`,
    );
  }

  const storedFields = serialized.storedFields;
  if (!storedFields || typeof storedFields !== 'object') {
    throw new Error(
      'structured index is stale or partial: serialized index is missing storedFields',
    );
  }

  const stored = Object.values(storedFields);
  if (stored.length !== expectedCount) {
    throw new Error(
      `structured index count drift: storedFields has ${stored.length} rows, expected ${expectedCount} (stale or partial index)`,
    );
  }

  const expectedKeys = new Set(
    expected.map((entry) => namespacedId(entry.type, entry.entityId)),
  );

  for (const entry of stored) {
    if (!isRecord(entry)) {
      throw new Error(
        'structured index is stale or partial: stored document is not an object',
      );
    }
    const entityId = entry.entityId;
    const type = entry.type;
    if (typeof entityId !== 'string' || typeof type !== 'string') {
      throw new Error(
        'structured index id drift: stored document is missing type or entityId',
      );
    }
    if (!ENTITY_TYPES.includes(type as EntityType)) {
      throw new Error(
        `structured index id drift: stored type ${type} is not a shipped entity type`,
      );
    }
    const key = namespacedId(type as EntityType, entityId);
    if (!expectedKeys.has(key)) {
      throw new Error(
        `structured index id drift: stored entity ${key} is missing from the shipped data files (stale or partial)`,
      );
    }
    expectedKeys.delete(key);
  }

  if (expectedKeys.size > 0) {
    const missing = [...expectedKeys].slice(0, 8).join(', ');
    throw new Error(
      `structured index id drift: data files have ids missing from the index (${missing}) (stale or partial)`,
    );
  }

  return expectedCount;
}

/** Filter structured hits by the active facet. */
export function applyStructuredFacet(
  hits: readonly StructuredHit[],
  facet: StructuredFacet,
): StructuredHit[] {
  if (facet.type === 'all') return [...hits];
  return hits.filter((hit) => hit.type === facet.type);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Map MiniSearch results to renderable structured hits. */
export function toStructuredHits(
  results: ReadonlyArray<Record<string, unknown>>,
): StructuredHit[] {
  return results.map((result) => ({
    id: asString(result.id),
    entityId: asString(result.entityId),
    type: result.type as EntityType,
    title: asString(result.title),
    url: asString(result.url),
    facet: asString(result.facet),
  }));
}

/**
 * Loads the build-time MiniSearch index and adapts it to a search client.
 * Rejects when /search-index.json is unavailable (for example under a
 * preview that did not run the postbuild indexer).
 */
export async function createStructuredSearchClient(): Promise<StructuredSearchClient> {
  const response = await fetch(STRUCTURED_INDEX_PATH);
  if (!response.ok) {
    throw new Error(
      `structured index unavailable (${response.status} ${response.statusText})`,
    );
  }
  const json = await response.text();
  const index = MiniSearch.loadJSON<StructuredSearchDocument>(
    json,
    structuredIndexLoadOptions(),
  );
  return {
    async search(query: string) {
      if (!query.trim()) return [];
      return toStructuredHits(index.search(query));
    },
  };
}
