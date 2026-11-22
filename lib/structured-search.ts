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
import {
  datasetRowCells,
  methodRowCells,
  SNIPPET_MIN_CHARS,
  trailingCellRun,
} from './entity-cells.ts';
import { roundsInWindow } from './rounds.ts';
import { formatShortDate } from './market-map.ts';
import { foldGreekToAscii } from './greek-transliteration.ts';

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
  /** Alternate names used to recognize an entity in a reader's question. */
  aliases?: readonly string[];
  /** Searchable body: aliases, description, tags. */
  text: string;
  /**
   * One line of the entity's own record, rendered for a reader choosing
   * between results. Verbatim on the destination route (see snippet()).
   */
  snippet: string;
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
  snippet: string;
};

export type StructuredFacet = {
  type: EntityType | 'all';
};

export const DEFAULT_STRUCTURED_FACET: StructuredFacet = { type: 'all' };

export const STRUCTURED_SEARCH_OPTIONS = {
  fields: ['title', 'text', 'type', 'facet'],
  storeFields: ['entityId', 'type', 'title', 'url', 'facet', 'snippet', 'aliases'],
  searchOptions: {
    boost: { title: 3, text: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
} as const;

/**
 * Term processor applied to both the indexed terms and the query terms, so
 * a Greek-lettered title and its ASCII spelling collapse to one term.
 *
 * It must be passed identically to the builder AND to MiniSearch.loadJSON:
 * a function cannot be serialized into the index, so a client that loads
 * the index without it processes queries differently from how the terms
 * were stored, and every Greek-named entity silently stops matching.
 */
export function processStructuredTerm(term: string): string {
  return foldGreekToAscii(term);
}

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
    aliases: method.aka,
    text: compactText([
      method.name,
      ...method.aka,
      method.year,
      method.actionRepresentation,
      method.backbone,
      ...method.conditioning,
    ]),
    url: `/manipulation/comparison-matrix/#method-${method.id}`,
    facet: method.actionRepresentation ?? '',
    snippet: trailingCellRun(methodRowCells(method)),
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
    aliases: company.aka,
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
    // The card renders the description as its own paragraph, so it is
    // verbatim on the destination route with no assembly needed.
    snippet: company.description,
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
    aliases: dataset.aka,
    text: compactText([
      dataset.name,
      ...dataset.aka,
      dataset.year,
      ...dataset.embodiments,
      dataset.license,
    ]),
    url: `/data-hardware/datasets/#dataset-${dataset.id}`,
    facet: dataset.year === null ? '' : String(dataset.year),
    snippet: trailingCellRun(datasetRowCells(dataset)),
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
    ...METHODS.map((method) => ({ type: 'method' as const, entityId: method.id })),
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
    processTerm: processStructuredTerm,
  });
}

/** Options that must be passed to MiniSearch.loadJSON for a built index. */
export function structuredIndexLoadOptions() {
  return {
    fields: [...STRUCTURED_SEARCH_OPTIONS.fields],
    storeFields: [...STRUCTURED_SEARCH_OPTIONS.storeFields],
    searchOptions: { ...STRUCTURED_SEARCH_OPTIONS.searchOptions },
    processTerm: processStructuredTerm,
  };
}

/** Build a serializable MiniSearch index over the shipped data files. */
export function buildStructuredIndex(): unknown {
  const index = createStructuredMiniSearch();
  index.addAll(collectStructuredDocuments());
  // Only named lookups can return a financing record. Putting table cells in
  // MiniSearch would change ranking for every ordinary company or method query.
  const fundingRows = roundsInWindow().map(row => {
    const date = row.datePrecision === 'day' ? formatShortDate(row.date) : row.date;
    const stage = row.round === 'not disclosed' ? '' : row.round;
    const status = {closed: 'Closed', talks: 'In talks', announced: 'Announced', unconfirmed: 'Close unconfirmed'}[row.status];
    const details = [date, stage, status, row.sourceType === 'reported' ? 'Reported' : ''];
    return {
      key: row.key,
      company: row.company,
      snippet: details.filter(Boolean).join(' · '),
    };
  });
  return {...index.toJSON(), fundingRows};
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

/** Dashes banned from rendered snippet text. */
const BANNED_SNIPPET_DASH = /[\u2013\u2014]/;

/**
 * Fail if any entity's snippet is too short to be worth rendering, carries
 * a banned dash, or collides byte-for-byte with another entity's.
 *
 * Uniqueness is checked across the whole corpus rather than per result set:
 * two entities that share a snippet can always be returned together, so
 * corpus-wide distinctness is the only version of the rule a build can
 * enforce. Returns the number of snippets verified.
 */
export function assertStructuredSnippets(
  documents: readonly StructuredSearchDocument[] = collectStructuredDocuments(),
): number {
  const short = documents.filter(
    (doc) => doc.snippet.trim().length < SNIPPET_MIN_CHARS,
  );
  if (short.length > 0) {
    const named = short
      .slice(0, 8)
      .map((doc) => `${doc.id} (${doc.snippet.trim().length} chars)`)
      .join(', ');
    throw new Error(
      `structured snippet too short: ${short.length} entit${short.length === 1 ? 'y' : 'ies'} under ${SNIPPET_MIN_CHARS} characters (${named})`,
    );
  }

  const dashed = documents.filter((doc) => BANNED_SNIPPET_DASH.test(doc.snippet));
  if (dashed.length > 0) {
    throw new Error(
      `structured snippet contains a banned em-dash or en-dash: ${dashed
        .slice(0, 8)
        .map((doc) => doc.id)
        .join(', ')}`,
    );
  }

  const byText = new Map<string, string[]>();
  for (const doc of documents) {
    byText.set(doc.snippet, [...(byText.get(doc.snippet) ?? []), doc.id]);
  }
  const collisions = [...byText.values()].filter((ids) => ids.length > 1);
  if (collisions.length > 0) {
    throw new Error(
      `structured snippets are not distinct: ${collisions
        .slice(0, 4)
        .map((ids) => ids.join(' = '))
        .join('; ')}`,
    );
  }

  return documents.length;
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
    snippet: asString(result.snippet),
  }));
}

// Keep model versions intact: the name π0 must not match the token π0.5.
function nameWords(value: string): string[] {
  return value.normalize('NFKC').match(/[\p{L}\p{N}]+(?:\.\d+)*/gu) ?? [];
}

const QUESTION_START = /^(how|what|why|when|which|where|who|can|could|did|does|do|is|are|will|would|should)$/i;
const COMMON_NAMES = new Set(['act', 'automata', 'cobot', 'dexterity', 'figure', 'humanoid', 'intuitive', 'nimble', 'sunday']);

async function legacyAliases() {
  const [{COMPANIES: companies}, {METHODS: methods}, {DATASETS: datasets}] = await Promise.all([
    import('../data/companies.ts'), import('../data/methods.ts'), import('../data/datasets.ts'),
  ]);
  return new Map([
    ...companies.map(item => [namespacedId('company', item.id), item.aka] as const),
    ...methods.map(item => [namespacedId('method', item.id), item.aka] as const),
    ...datasets.map(item => [namespacedId('dataset', item.id), item.aka] as const),
  ]);
}

async function entityNames(index: MiniSearch<StructuredSearchDocument>) {
  const records = index.search(MiniSearch.wildcard);
  // A cached index from before aliases were stored can still serve older tabs.
  const legacy = records.some(row => !Array.isArray(row.aliases))
    ? await legacyAliases()
    : undefined;
  const names = new Map<string, StructuredHit[]>();
  let longest = 0;
  for (const [i, hit] of toStructuredHits(records).entries()) {
    const aliases: readonly string[] = records[i].aliases ?? legacy?.get(hit.id) ?? [];
    const title = hit.title.split(' (')[0];
    const shortName = hit.type === 'company'
      ? title.replace(/\s+(AI|Robotics|Technologies)$/i, '')
      : hit.type === 'dataset' ? title.replace(/\s+v\d+(?:\.\d+)*$/i, '') : title;
    const parenthetical = hit.title.match(/\(([^()]+)\)$/)?.[1] ?? '';
    const spacedVersion = foldGreekToAscii(hit.title).replace(/(\p{L})(?=\d)/gu, '$1 ');
    for (const name of new Set([hit.title, shortName, parenthetical, spacedVersion, hit.entityId, ...aliases])) {
      const words = nameWords(name).map(foldGreekToAscii);
      if (!words.length) continue;
      longest = Math.max(longest, words.length);
      const key = words.join(' ');
      const hits = names.get(key) ?? [];
      if (!hits.some(existing => existing.id === hit.id)) hits.push(hit);
      names.set(key, hits);
    }
  }
  return {names, longest};
}

type FundingRow = {key: string; company: string; snippet: string};

function fundingCatalog(rows: readonly FundingRow[]) {
  const names = new Map<string, StructuredHit[]>();
  for (const {key, company, snippet} of rows) {
    const hit: StructuredHit = {
      id: `funding:${key}`, entityId: key, type: 'company', title: `${company} funding`,
      url: `/market-map/rounds/#round-${key}`, facet: '', snippet,
    };
    const parenthetical = company.match(/^(.*?)\s*\((.+)\)$/);
    for (const name of new Set([company, ...(parenthetical?.slice(1) ?? [])])) {
      const words = nameWords(name).map(foldGreekToAscii);
      const term = words.join(' ');
      const entries = names.get(term) ?? [];
      if (words.length && !entries.some(row => row.id === hit.id)) names.set(term, [...entries, hit]);
    }
  }
  return names;
}

// Look up the complete subject of a financing question. A company mentioned
// inside a longer subject (e.g. "motion planning research") is not that subject.
const FINANCE_TOPIC = /(?:funding(?: rounds?| history| amount)?|fundraising|financing|investments?|investors?|valuation|(?:pre seed|preseed|seed|series [a-z])(?: rounds?| funding)?|rounds?)/.source;
const LABELED_TOPIC = '(?:(?:latest|last|recent|current|first|total) )?' + FINANCE_TOPIC;
const QUESTION_COPULA = '(?:(?:what|when|who) (?:is|was|are|were) )?';
const FUNDING_QUESTIONS = [
  new RegExp('^(?:who|which investors?) (?:has |have )?(?:invested in|funds|funded|financed|backed) (.+?)(?: s ' + LABELED_TOPIC + ')?$'),
  new RegExp('^(?:who|which investors?) (?:led|participated in) (.+?) s ' + LABELED_TOPIC + '$'),
  /^(?:how much(?: money| funding| investment| capital)?|when|how) (?:did|has|had|will) (.+?) (?:raise|raised|fundraise|fundraised)(?: (?:money|capital|funding|funds))?(?: (?:in total|so far|to date))?$/,
  /^how much (?:money|funding|capital) (?:has|had|did) (.+?) (?:receive|received|get|secured?)$/,
  /^(?:(?:when|how) )?(?:was|is) (.+?) (?:funded|financed)$/,
  new RegExp('^(?:did|has) (.+?) (?:raise|raised|secure|secured) (?:money|capital|funding|(?:a |its )?' + LABELED_TOPIC + ')$'),
  new RegExp('^' + QUESTION_COPULA + '(.+?)(?: s)? ' + LABELED_TOPIC + '$'),
  new RegExp('^' + QUESTION_COPULA + '(?:the )?' + LABELED_TOPIC + ' (?:of|in|for|at|behind) (.+)$'),
];

function fundingSubject(query: string): string | undefined {
  for (const pattern of FUNDING_QUESTIONS) {
    const match = query.match(pattern);
    if (match) return match[1];
  }
}

function mentionedEntities(words: string[], catalog: Awaited<ReturnType<typeof entityNames>>): StructuredHit[] {
  const folded = words.map(foldGreekToAscii);
  const found = new Map<string, StructuredHit>();
  for (let start = 0; start < words.length; start++) {
    // Prefer the complete name at this position, e.g. OpenVLA-OFT over OpenVLA.
    for (let end = Math.min(start + catalog.longest, words.length); end > start; end--) {
      const phrase = folded.slice(start, end).join(' ');
      const hits = catalog.names.get(phrase);
      if (!hits) continue;
      // A family name alone cannot identify a different requested release.
      if (/^v\d/.test(folded[end] ?? '') && hits.every(hit => /\s+v\d/i.test(hit.title))) continue;
      if (phrase === 'figure' && folded[end] === 'out') continue;
      const namedSubject = phrase === 'figure' && folded[start - 1] === 'does';
      if (COMMON_NAMES.has(phrase) && words[start] === phrase && folded[end] !== 's' && !namedSubject) continue;
      for (const hit of hits) found.set(hit.id, hit);
      start = end - 1;
      break;
    }
  }
  return [...found.values()];
}

const SUPPLIERS = /^(compan(y|ies)|firms?|makers?|manufacturers?|vendors?|suppliers?|startups?|brands?)$/;
const SUPPLY_VERBS = /^(mak(e|es|ing)|build(s|ing)?|sell(s|ing)?|suppl(y|ies|ying)|offer(s|ing)?|produc(e|es|ing)|manufactur(e|es|ing)|develop(s|ing)?|buy|purchas(e|ing))$/;
const PRODUCT_FILLER = new Set(`
  a an and any are at be can could currently do does equipment equipped featuring find for
  from has have i in including is it leading list looking me need of on or product products
  system systems that the them there those to top using want we what where which who with would
`.trim().split(/\s+/));
const CATALOG_VERBS = /^(uses?|contains?|includes?|combines?|provides?|features?)$/;

function catalogType(subject: string): EntityType | undefined {
  if (SUPPLIERS.test(subject)) return 'company';
  if (/^(methods?|models?|polic(?:y|ies)|algorithms?|techniques?)$/.test(subject)) return 'method';
  if (/^(datasets?|collections?)$/.test(subject)) return 'dataset';
}

function requestedEntityType(words: string[]): EntityType | undefined {
  // Identify the subject of a catalog lookup, not a type mentioned later in
  // a question about something else ("What does Figure's model do?").
  const query = words.join(' ').toLowerCase().replace(/\bdata sets?\b/g, 'dataset');
  const match = /^(?:(?:which|what|list|find|show|any|are there)(?: me)? (?:any |the )?)?(?:robot(?:ic)?s? |learning )?(\w+)/.exec(query);
  return catalogType(match?.[1] ?? '');
}

function productWord(word: string): string {
  if (/^(robotics?|robots?)$/.test(word)) return 'robot';
  return word.length > 3 ? word.replace(/ies$/, 'y').replace(/(?<!s)s$/, '') : word;
}

/** Search only the requested catalog and require support in the indexed record. */
function descriptiveMatches(words: string[], question: boolean, index: MiniSearch<StructuredSearchDocument>, requested?: EntityType): StructuredHit[] {
  const tokens = words.map(foldGreekToAscii);
  const hasSupplier = tokens.some(word => SUPPLIERS.test(word));
  const buying = tokens.includes('buy') || tokens.includes('purchase');
  const requestsList = hasSupplier && (!question || ['which', 'what'].includes(tokens[0]));
  const makingOrSelling = tokens.some(word => SUPPLY_VERBS.test(word));
  const wantsSupplier = requestsList || (makingOrSelling && (hasSupplier || tokens[0] === 'who' || buying));
  const type = requested ?? 'company';
  const modifier = type === 'company' ? tokens.findIndex(word => /^(with|featuring|including)$/.test(word)) : -1;
  if (!requested && !wantsSupplier && (QUESTION_START.test(tokens[0]) || modifier < 1)) return [];
  if (tokens.some(word => /^(no|not|without)$/.test(word))) return [];

  const descriptive = (word: string) => !PRODUCT_FILLER.has(word) && !SUPPLIERS.test(word) && !SUPPLY_VERBS.test(word);
  const terms = new Set(tokens.filter(descriptive).map(productWord));
  terms.delete('robot');
  if (type !== 'company') {
    // These nouns and verbs express the request. The useful discriminators
    // are e.g. the action representation, named platform or licence.
    for (const term of terms) {
      if (CATALOG_VERBS.test(term) || catalogType(term) === type) terms.delete(term);
    }
    const context = type === 'method'
      ? ['action', 'predict', 'predicting', 'generate', 'generating']
      : ['demonstration', 'trajectory', 'collected', 'recorded', 'data', 'set'];
    for (const term of context) terms.delete(term);
  }
  if (!terms.size) return [];
  const variants = new Set(tokens.filter(word => terms.has(productWord(word))));
  for (const term of terms) {
    variants.add(term);
    variants.add(term.endsWith('y') ? term.slice(0, -1) + 'ies' : term + 's');
  }
  const indexed = index.search([...variants].join(' '), {
    fields: ['title', 'text', 'facet'], prefix: false, fuzzy: false,
  });
  const candidates = indexed.filter(result => result.type === type);
  const subject = modifier > 0 ? tokens.slice(0, modifier).filter(descriptive).map(productWord) : [];
  const subjectTerms = subject.filter(word => terms.has(word));
  const features = new Set(modifier > 0 ? tokens.slice(modifier + 1).filter(descriptive).map(productWord) : []);
  const rows = candidates.map(result => ({
    result,
    matched: new Set(Object.keys(result.match).map(productWord).filter(word => terms.has(word))),
  }));
  // The method and dataset indexes describe different fields. Two matching
  // platform terms can identify a dataset whose camera details are unlisted.
  const known = new Set(indexed.flatMap(row => Object.keys(row.match).map(productWord)));
  const coverage = type === 'dataset' && [...terms].filter(term => !known.has(term)).length <= 1 ? 1 / 2 : 2 / 3;
  const required = Math.min(terms.size, Math.max(2, Math.ceil(terms.size * coverage)));
  const supportsSubject = (matched: Set<string>) => !subjectTerms.length || subjectTerms.some(word => matched.has(word));
  const hasSupportedSpec = subject.length > 1 && rows.some(({matched}) =>
    matched.size >= required && supportsSubject(matched) && [...features].some(word => matched.has(word)),
  );
  const phrase = ' ' + subject.join(' ') + ' ';
  const relevant = rows.filter(({result, matched}) => {
    if (matched.size >= required && supportsSubject(matched)) return true;
    // A parts buyer can also inspect an exact match to the product itself. Put it
    // after results that support the requested features in their own records.
    if (!hasSupportedSpec) return false;
    const description = nameWords(result.title + ' ' + result.snippet).map(foldGreekToAscii).map(productWord);
    return (' ' + description.join(' ') + ' ').includes(phrase);
  });
  relevant.sort((a, b) => b.matched.size - a.matched.size || b.result.score - a.result.score);
  return toStructuredHits(relevant.map(row => row.result));
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
  const serialized = await response.json();
  const funding = fundingCatalog(serialized.fundingRows ?? []);
  const index = MiniSearch.loadJS<StructuredSearchDocument>(
    serialized,
    structuredIndexLoadOptions(),
  );
  let names: ReturnType<typeof entityNames> | undefined;
  let financeNames: Map<string, StructuredHit[]> | undefined;
  return {
    async search(query: string) {
      if (!query.trim()) return [];
      const words = nameWords(query);
      const question = words.length >= 2 && (/[?？]/u.test(query) || QUESTION_START.test(words[0]));
      const exactName = words.map(foldGreekToAscii).join(' ');
      const exactRounds = funding.get(exactName);
      const subject = fundingSubject(exactName);
      if (subject) {
        const catalog = await (names ??= entityNames(index));
        const known = financeNames ??= new Map([...catalog.names, ...funding]);
        const issuers = known.has(subject) ? [subject] : subject.split(/ (?:or|and|versus|vs) /);
        const companies = issuers.map(issuer => known.get(issuer)?.filter(hit => hit.type === 'company'));
        const named = companies.every(matches => matches?.length) ? companies.flatMap(matches => matches ?? []) : [];
        const hits = named.flatMap(hit => {
          // An alias such as "1X" can identify a market profile whose full
          // company name is how its funding row is recorded.
          if (hit.id.startsWith('funding:')) return [hit];
          const issuer = nameWords(hit.title.split(' (')[0]).map(foldGreekToAscii).join(' ');
          return funding.get(issuer) ?? [hit];
        });
        if (hits.some(hit => hit.id.startsWith('funding:'))) {
          return [...new Map(hits.map(hit => [hit.id, hit])).values()];
        }
      } else if (exactRounds) {
        const catalog = await (names ??= entityNames(index));
        // Keep an ordinary word already in the wiki, e.g. lowercase "motion".
        const existingTerm = words.length === 1 && query.trim() === exactName &&
          index.search(exactName, {prefix: false, fuzzy: false}).length > 0;
        if (!existingTerm && !catalog.names.has(exactName)) return exactRounds;
      }
      if (question || words.length >= 5) {
        const requested = requestedEntityType(words);
        const mentioned = mentionedEntities(words, await (names ??= entityNames(index)))
          .filter(hit => !requested || hit.type === requested);
        return mentioned.length ? mentioned : descriptiveMatches(words, question, index, requested);
      }
      return toStructuredHits(index.search(query));
    },
  };
}
