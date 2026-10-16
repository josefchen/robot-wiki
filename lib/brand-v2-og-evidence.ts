/**
 * Enforcement evidence for the Open Graph/X corpus: VAL-B2-ID-009 and
 * VAL-B2-OG-001 through VAL-B2-OG-015.
 *
 * Each row is decided from what the generator published and what the
 * export ships, re-checked here rather than read back. The renderer-input
 * manifest is rebuilt from the current tree and the shipped bytes and has
 * to equal the recorded one; every shipped card is decoded again and its
 * pixel reading has to equal the recorded one; the sealed contract matrix
 * has to equal the registry-derived corpus; every published tree has to
 * hold exactly the validated, journalled bytes; and each route's card
 * metadata is read out of its exported HTML. A stale, incomplete or
 * disagreeing reading throws, so no row is produced from evidence that does
 * not hold.
 *
 * Three clauses cannot be observed from one finished publication, and the
 * rows name the gates that observe them instead: rollback and crash
 * recovery (the publication engine's mutation tests), the HTTP content
 * type of a served card (the static-export spec), and a second clean
 * generation (the shipped-bytes re-render; the generator's own second
 * render is recorded per card). Equality with the blobs committed at HEAD
 * is read only when the caller asks, as release does, because a build may
 * run on a corpus regenerated but not yet committed.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openSync, type LayoutFont } from 'fontkit';
import matter from 'gray-matter';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import { BRAND_NAME_FAMILY, V1_DESCRIPTOR_PATTERN } from './brand-v2-identity-evidence.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import { OG_CARD_DEVICES, cardPaintedColors, type CardNode } from './og-card-artwork.ts';
import {
  ogCardCorpus,
  openSealedCardTree,
  type OgCardCorpusEntry,
} from './og-card-corpus.ts';
import { glyphProbePopulation } from './og-card-glyph-probes.ts';
import {
  OG_CARD_EVIDENCE_DIR,
  OG_CARD_JOURNAL_PATH,
  OG_CARD_MANIFEST_PATH,
  buildOgCardManifest,
  type ManifestCard,
  type OgCardManifest,
} from './og-card-manifest.ts';
import { OG_MATRIX_SOURCE, ogMatrixDrift, readOgMatrix, type OgMatrix } from './og-card-matrix.ts';
import { verifyOgCorpusParity } from './og-card-parity.ts';
import { inspectCardPixels } from './og-card-pixels.ts';
import {
  OG_PUBLICATION_TREES,
  OG_STAGING_DIR,
  filesDigest,
  readLiveJournal,
  treeFiles,
  type PublicationRecord,
} from './og-card-publication.ts';
import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_CARD_PATH,
  SITE_URL_ORIGIN,
  sanitizeCardText,
} from './og-cards.ts';
import { OG_RENDERER_FACES } from './og-renderer-fonts.ts';
import { pngDimensions } from './png-decode.ts';

export const OG_CARD_POPULATION_SOURCE = `${OG_MATRIX_SOURCE}#20:og-matrix`;
export const OG_SITE_CARD_POPULATION_SOURCE = `${OG_MATRIX_SOURCE}#20:og-matrix:site`;
export const OG_ARTICLE_CARD_POPULATION_SOURCE = `${OG_MATRIX_SOURCE}#20:og-matrix:article`;
export const OG_ROUTE_POPULATION_SOURCE = 'contract/brand-v2-registries.json#routes.public';
export const OG_DESTINATION_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#routes.public:destination';
export const OG_GLYPH_PROBE_POPULATION_SOURCE =
  'lib/og-card-glyph-probes.ts#glyphProbePopulation';
export const OG_PUBLICATION_TREE_POPULATION_SOURCE =
  'lib/og-card-publication.ts#OG_PUBLICATION_TREES';

/**
 * What each row quantifies over. Only two rows are about routes; the card
 * rows are about the sealed matrix, the font row about the assigned strings
 * the corpus paints, and the publication rows about the trees the journal
 * swaps, so recording any of them per route would emit rows for claims
 * never checked against a route (R8a).
 */
export const OG_ASSERTION_POPULATION_SOURCES: Readonly<Record<string, string>> = {
  'VAL-B2-ID-009': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-001': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-002': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-003': OG_SITE_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-004': OG_ARTICLE_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-005': OG_ARTICLE_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-006': OG_DESTINATION_POPULATION_SOURCE,
  'VAL-B2-OG-007': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-008': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-009': OG_ROUTE_POPULATION_SOURCE,
  'VAL-B2-OG-010': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-011': OG_CARD_POPULATION_SOURCE,
  'VAL-B2-OG-012': OG_GLYPH_PROBE_POPULATION_SOURCE,
  'VAL-B2-OG-013': OG_PUBLICATION_TREE_POPULATION_SOURCE,
  'VAL-B2-OG-014': OG_PUBLICATION_TREE_POPULATION_SOURCE,
  'VAL-B2-OG-015': OG_PUBLICATION_TREE_POPULATION_SOURCE,
};

/**
 * A card row is a reading of a shipped image. A route row reads the
 * exported HTML head, the font row reads the binaries and the recorded
 * probe renders (which are never written to disk), and a publication row
 * reads trees and the journal, so those are machine readings of build
 * output.
 */
const OG_MACHINE_ROWS = new Set([
  'VAL-B2-OG-006',
  'VAL-B2-OG-009',
  'VAL-B2-OG-012',
  'VAL-B2-OG-013',
  'VAL-B2-OG-014',
  'VAL-B2-OG-015',
]);
export const OG_ASSERTION_MODES: Readonly<
  Record<string, 'generated-image' | 'automated-machine'>
> = Object.fromEntries(
  Object.keys(OG_ASSERTION_POPULATION_SOURCES).map((id) => [
    id,
    OG_MACHINE_ROWS.has(id) ? 'automated-machine' : 'generated-image',
  ]),
);

const CARD_FIELDS = {
  site: ['descriptor', 'identity'],
  article: ['domain', 'identity', 'referenceCount', 'reviewYear', 'title'],
} as const;
/** The tones a card may paint; the highlight tone marks a selected state. */
const CARD_TOKENS = new Set(['paper', 'white', 'ink', 'graphite', 'concrete', 'signal']);
const ELEMENT_TYPES = new Set(['div', 'span']);
const MIN_CARD_BYTES = 5 * 1024;
const GENERATOR = 'scripts/generate-og-cards.ts';

export type OgRegistryRoute = {
  id: string;
  path: string;
  routeKind: 'article' | 'destination';
};

export type OgRouteMeta = {
  route: string;
  htmlPath: string;
  twitterCards: string[];
  ogImages: string[];
  twitterImages: string[];
  widths: string[];
  heights: string[];
  alts: string[];
  twitterWidths: string[];
  twitterHeights: string[];
  twitterAlts: string[];
};

export type OgProbeMember = {
  memberId: string;
  faceId: string;
  text: string;
  assignedBy: string[];
};

export type OgEvidence = {
  root: string;
  matrix: OgMatrix;
  corpus: OgCardCorpusEntry[];
  manifest: OgCardManifest;
  journal: PublicationRecord;
  routes: OgRegistryRoute[];
  routeMeta: Map<string, OgRouteMeta>;
  probes: OgProbeMember[];
  /** Shipped bytes under public/, by site-absolute path. */
  shipped: Map<string, Buffer>;
  /** sha256 of each renderer face binary, read from disk. */
  faceSha256: Map<string, string>;
  /** Whether a publication was left part-way, read without recovering it. */
  liveJournal: boolean;
  stagingLeft: boolean;
};

export type OgVerdict =
  | {
      actual: string;
      payload: {
        kind: 'generated-image';
        imagePath: string;
        width: number;
        height: number;
        sha256: string;
        generator: string;
        generatorVersion?: string;
      };
    }
  | {
      actual: string;
      payload: {
        kind: 'source-build';
        sourcePath: string;
        predicate: string;
        observed: Record<string, unknown>;
        tool: string;
      };
    };

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** JSON with sorted keys, so two records compare by content alone. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const cardMemberId = (cardId: string): string => `og-card:${cardId}`;
export const treeMemberId = (path: string): string => `og-tree:${path}`;
/** The probe identifier lib/og-card-glyph-probes.ts gives a (face, string) pair. */
export const glyphProbeMemberId = (faceId: string, text: string): string =>
  `probe:${faceId}:${sha256(text).slice(0, 16)}`;

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag);
  return match ? decodeEntities(match[1]) : null;
}

/** Every Open Graph and X card declaration in a document's head. */
export function routeCardMeta(route: string, htmlPath: string, html: string): OgRouteMeta {
  const meta: OgRouteMeta = {
    route,
    htmlPath,
    twitterCards: [],
    ogImages: [],
    twitterImages: [],
    widths: [],
    heights: [],
    alts: [],
    twitterWidths: [],
    twitterHeights: [],
    twitterAlts: [],
  };
  const fields: Record<string, keyof Omit<OgRouteMeta, 'route' | 'htmlPath'>> = {
    'twitter:card': 'twitterCards',
    'og:image': 'ogImages',
    'twitter:image': 'twitterImages',
    'og:image:width': 'widths',
    'og:image:height': 'heights',
    'og:image:alt': 'alts',
    'twitter:image:width': 'twitterWidths',
    'twitter:image:height': 'twitterHeights',
    'twitter:image:alt': 'twitterAlts',
  };
  const end = html.search(/<\/head>/i);
  const head = end === -1 ? html : html.slice(0, end);
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = attribute(tag, 'property') ?? attribute(tag, 'name');
    const content = attribute(tag, 'content');
    const field = key === null ? undefined : fields[key];
    if (field && content !== null) meta[field].push(content);
  }
  return meta;
}

function exportedHtmlPath(route: string): string {
  return route === '/' ? 'out/index.html' : `out${route}index.html`;
}

function readRecord<T>(root: string, path: string, failures: string[]): T | null {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    failures.push(`${path} is missing`);
    return null;
  }
  return JSON.parse(readFileSync(absolute, 'utf8')) as T;
}

function withoutPixels(card: ManifestCard): Omit<ManifestCard, 'pixels'> {
  const copy = { ...card };
  delete copy.pixels;
  return copy;
}

export type OgEvidenceInput = {
  root: string;
  routes: readonly OgRegistryRoute[];
  /** Recorded artifacts; default to the published files under `root`. */
  manifest?: OgCardManifest;
  journal?: PublicationRecord;
  /** A route's exported HTML; defaults to the file under `out/`. */
  exportHtml?: (route: string) => string;
  /**
   * Also hold the tracked trees to the blobs committed at HEAD. Release
   * asks this; a build may run on a corpus regenerated but not committed.
   */
  committed?: boolean;
};

/**
 * Reads and re-checks everything the rows decide from, and throws when any
 * of it is stale, missing or disagrees: a manifest the current tree no
 * longer rebuilds, a sealed matrix the registry no longer derives, a
 * published tree that is not the journalled corpus, a destination set that
 * is not the sealed one, or an export that lacks a route.
 */
export function readOgEvidence(input: OgEvidenceInput): OgEvidence {
  const { root } = input;
  const failures: string[] = [];
  const matrix = readOgMatrix(root);
  const corpus = ogCardCorpus(root);
  failures.push(...ogMatrixDrift(matrix, corpus));

  const manifest = input.manifest ?? readRecord<OgCardManifest>(root, OG_CARD_MANIFEST_PATH, failures);
  const journal = input.journal ?? readRecord<PublicationRecord>(root, OG_CARD_JOURNAL_PATH, failures);
  if (manifest === null || journal === null) {
    throw new Error(`Open Graph corpus evidence does not hold:\n- ${failures.join('\n- ')}`);
  }

  const shipped = new Map<string, Buffer>();
  for (const card of manifest.cards) {
    for (const { path } of [card.asset, ...card.structuredVariants]) {
      const file = join(root, 'public', path);
      if (existsSync(file)) shipped.set(path, readFileSync(file));
      else failures.push(`public${path} is recorded but not shipped`);
    }
  }

  // The recorded manifest is evidence only while the current tree and the
  // shipped bytes still rebuild it exactly.
  const rebuilt = buildOgCardManifest({
    root,
    corpus,
    files: shipped,
    glyphProbes: manifest.glyphProbes,
    matrix,
  });
  failures.push(...rebuilt.failures.map((failure) => `rebuilding the manifest: ${failure}`));
  if (rebuilt.manifest.corpusSha256 !== manifest.corpusSha256) {
    failures.push(
      `the shipped corpus hashes to ${rebuilt.manifest.corpusSha256}; the manifest recorded ${manifest.corpusSha256}`,
    );
  }
  const rebuiltById = new Map(rebuilt.manifest.cards.map((card) => [card.cardId, card]));
  for (const card of manifest.cards) {
    const current = rebuiltById.get(card.cardId);
    if (!current) failures.push(`${card.cardId}: recorded, but the current tree builds no such card`);
    else if (canonical(withoutPixels(card)) !== canonical(current)) {
      failures.push(`${card.cardId}: the recorded card is not the one the current tree and shipped bytes rebuild`);
    }
    if (!card.pixels) failures.push(`${card.cardId}: no decoded-pixel record`);
  }
  if (manifest.cards.length !== rebuilt.manifest.cards.length) {
    failures.push(`the manifest records ${manifest.cards.length} cards; the current tree builds ${rebuilt.manifest.cards.length}`);
  }
  for (const key of ['contract', 'separateOwners', 'fonts', 'styleTokens'] as const) {
    if (canonical(manifest[key]) !== canonical(rebuilt.manifest[key])) {
      failures.push(`the recorded ${key} is not what the current tree rebuilds`);
    }
  }

  // The pixel record is evidence only while the current inspector, run on
  // the shipped bytes, still reads it. The second-render hash is the one
  // field a decode cannot reproduce; the determinism row reads it against
  // the shipped hash instead.
  for (const card of manifest.cards) {
    const entry = corpus.find(({ cardId }) => cardId === card.cardId);
    const png = shipped.get(card.asset.path);
    if (!entry || !png || !card.pixels) continue;
    const reading = inspectCardPixels({
      png,
      kind: card.kind,
      paintedHexes: cardPaintedColors(openSealedCardTree(entry.card)).flatMap(({ hexes }) => hexes),
    });
    const recorded = { ...card.pixels } as Partial<NonNullable<ManifestCard['pixels']>>;
    delete recorded.secondRenderSha256;
    const decoded = {
      decodedWidth: reading.width,
      decodedHeight: reading.height,
      maxPaletteDistance: reading.maxPaletteDistance,
      offPalettePixels: reading.offPalettePixels,
      translucentPixels: reading.translucentPixels,
      anchorsChecked: reading.anchors.length,
      anchorsFailed: reading.anchors.filter(({ ok }) => !ok).map(({ anchor }) => anchor),
      inkPixels: reading.inkPixels,
    };
    if (canonical(recorded) !== canonical(decoded)) {
      failures.push(`${card.cardId}: the recorded pixel reading is not what decoding the shipped card reads`);
    }
  }

  const parity = verifyOgCorpusParity({ root, requireExport: true, committed: input.committed === true });
  failures.push(...parity.failures.map((failure) => `corpus parity: ${failure}`));
  const liveJournal = readLiveJournal(root) !== null;
  const stagingLeft = existsSync(join(root, OG_STAGING_DIR));

  // The destinations that share the site card are sealed by the contract
  // and derived by the registry; both readings have to name the same set.
  const destinations = input.routes.filter(({ routeKind }) => routeKind === 'destination').map(({ path }) => path);
  const sealed = new Set(matrix.siteDestinations);
  for (const path of destinations) {
    if (!sealed.has(path)) failures.push(`registry destination ${path} is not a sealed site-card destination`);
  }
  for (const path of sealed) {
    if (!destinations.includes(path)) failures.push(`sealed site-card destination ${path} is not a registry destination`);
  }

  const routeMeta = new Map<string, OgRouteMeta>();
  for (const route of input.routes) {
    const htmlPath = exportedHtmlPath(route.path);
    let html: string;
    if (input.exportHtml) html = input.exportHtml(route.path);
    else if (existsSync(join(root, htmlPath))) html = readFileSync(join(root, htmlPath), 'utf8');
    else {
      failures.push(`${htmlPath} is not exported`);
      continue;
    }
    routeMeta.set(route.id, routeCardMeta(route.path, htmlPath, html));
  }

  const probes = glyphProbePopulation(corpus).map(({ face, text, assignedBy }) => ({
    memberId: glyphProbeMemberId(face.faceId, text),
    faceId: face.faceId,
    text,
    assignedBy,
  }));
  const faceSha256 = new Map(
    OG_RENDERER_FACES.map((face) => [face.faceId, sha256(readFileSync(join(root, face.path)))]),
  );

  if (failures.length > 0) {
    throw new Error(`Open Graph corpus evidence does not hold:\n- ${failures.join('\n- ')}`);
  }
  return {
    root,
    matrix,
    corpus,
    manifest,
    journal,
    routes: [...input.routes],
    routeMeta,
    probes,
    shipped,
    faceSha256,
    liveJournal,
    stagingLeft,
  };
}

/** The populations the rows quantify over, keyed by canonical source. */
export function ogPopulations(evidence: OgEvidence): Record<string, string[]> {
  const rows = evidence.matrix.rows;
  return {
    [OG_CARD_POPULATION_SOURCE]: rows.map(({ cardId }) => cardMemberId(cardId)),
    [OG_SITE_CARD_POPULATION_SOURCE]: rows
      .filter(({ cardId }) => cardId === 'site')
      .map(({ cardId }) => cardMemberId(cardId)),
    [OG_ARTICLE_CARD_POPULATION_SOURCE]: rows
      .filter(({ cardId }) => cardId !== 'site')
      .map(({ cardId }) => cardMemberId(cardId)),
    [OG_DESTINATION_POPULATION_SOURCE]: evidence.routes
      .filter(({ routeKind }) => routeKind === 'destination')
      .map(({ id }) => id),
    [OG_GLYPH_PROBE_POPULATION_SOURCE]: evidence.probes.map(({ memberId }) => memberId),
    [OG_PUBLICATION_TREE_POPULATION_SOURCE]: OG_PUBLICATION_TREES.map(({ path }) => treeMemberId(path)),
  };
}

function fail(assertionId: string, member: string, problems: string[]): never {
  throw new Error(`${assertionId} ${member}: ${problems.join('; ')}`);
}

function cardFor(evidence: OgEvidence, assertionId: string, member: string): ManifestCard {
  const cardId = member.replace(/^og-card:/, '');
  const card = evidence.manifest.cards.find((candidate) => candidate.cardId === cardId);
  if (!member.startsWith('og-card:') || !card) fail(assertionId, member, ['no recorded card']);
  return card;
}

function shippedBytes(evidence: OgEvidence, assertionId: string, path: string): Buffer {
  const bytes = evidence.shipped.get(path);
  if (!bytes) fail(assertionId, path, ['not shipped under public/']);
  return bytes;
}

function cardImage(evidence: OgEvidence, card: ManifestCard, assertionId: string): Extract<OgVerdict['payload'], { kind: 'generated-image' }> {
  const bytes = shippedBytes(evidence, assertionId, card.asset.path);
  const { width, height } = pngDimensions(bytes);
  const version = evidence.manifest.toolchain.renderer.vercelOg;
  return {
    kind: 'generated-image',
    imagePath: `public${card.asset.path}`,
    width,
    height,
    sha256: sha256(bytes),
    generator: GENERATOR,
    ...(version ? { generatorVersion: `@vercel/og ${version}` } : {}),
  };
}

function nodes(node: CardNode): CardNode[] {
  const children = node.props.children;
  return [node, ...(Array.isArray(children) ? children.flatMap(nodes) : [])];
}

function recordedProbe(evidence: OgEvidence, faceId: string, text: string) {
  return evidence.manifest.glyphProbes.find((probe) => probe.faceId === faceId && probe.text === text);
}

function identityVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const identity = card.strings.filter(({ field }) => field === 'identity');
  if (identity.length !== 1 || identity[0].text !== PUBLIC_IDENTITY) {
    problems.push(`paints identity [${identity.map(({ text }) => text).join(', ')}], not exactly "${PUBLIC_IDENTITY}" once`);
  }
  const descriptors = card.strings.filter(
    ({ field, text }) => field === 'descriptor' || text.includes(PUBLIC_DESCRIPTOR),
  );
  if (card.kind === 'site') {
    if (descriptors.length !== 1 || descriptors[0].text !== PUBLIC_DESCRIPTOR) {
      problems.push(`the site card paints descriptor [${descriptors.map(({ text }) => text).join(', ')}], not the exact descriptor once`);
    }
  } else if (descriptors.length > 0) {
    problems.push('an article card paints the descriptor');
  }
  const ink = card.pixels?.inkPixels.identity ?? 0;
  if (ink <= 0) problems.push('the identity region decoded to no ink');
  const probed = [...identity, ...descriptors].filter((string) => {
    const probe = recordedProbe(evidence, string.faceId, string.text);
    return probe?.fallbackFree === true && probe.assignedBy.includes(`card:${card.cardId}`);
  });
  if (probed.length !== identity.length + descriptors.length) {
    problems.push('an identity string has no fallback-free glyph probe from this card');
  }
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual:
      card.kind === 'site'
        ? `the site card paints exactly "${PUBLIC_IDENTITY}" (${identity[0].faceId}, ${ink} identity ink pixels decoded) and exactly "${PUBLIC_DESCRIPTOR}" (${descriptors[0].faceId}), both glyph-probed fallback-free`
        : `${card.cardId} paints the compact identity "${PUBLIC_IDENTITY}" once (${identity[0].faceId}, ${ink} identity ink pixels decoded, glyph-probed fallback-free) and no descriptor`,
    payload: cardImage(evidence, card, id),
  };
}

function corpusCountVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const { matrix, manifest } = evidence;
  const problems: string[] = [];
  const row = matrix.rows.find(({ cardId }) => cardId === card.cardId);
  if (!row || row.assetPath !== card.asset.path) problems.push(`is not sealed at ${card.asset.path}`);
  if (manifest.cards.filter(({ asset }) => asset.path === card.asset.path).length !== 1) {
    problems.push('is not recorded exactly once');
  }
  const ogFiles = treeFiles(join(evidence.root, 'public', 'og')).map((file) => `/og/${file}`).sort();
  const sealedFiles = matrix.rows.map(({ assetPath }) => assetPath).sort();
  if (ogFiles.join('|') !== sealedFiles.join('|')) {
    problems.push(`public/og holds ${ogFiles.length} files, not exactly the ${sealedFiles.length} sealed cards`);
  }
  if (ogFiles.some((file) => !file.endsWith('.png'))) problems.push('public/og holds a file that is not a PNG');
  const structured = manifest.cards.flatMap(({ structuredVariants }) => structuredVariants);
  if (structured.some(({ path }) => path.startsWith('/og/'))) problems.push('a structured image ships inside the OG/X corpus');
  if (structured.length !== matrix.structuredImageCount) {
    problems.push(`${structured.length} structured images, not the sealed ${matrix.structuredImageCount}`);
  }
  if (problems.length > 0) fail(id, member, problems);
  const articles = matrix.rows.length - 1;
  return {
    actual: `${card.cardId} is sealed matrix row ${row?.row} and ships once at ${card.asset.path}; public/og holds exactly the ${ogFiles.length} sealed PNGs (the site card plus ${articles} article cards), and the ${structured.length} 4:3 and square structured images ship separately under public/structured-images`,
    payload: cardImage(evidence, card, id),
  };
}

function dimensionsVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const bytes = shippedBytes(evidence, id, card.asset.path);
  const { width, height } = pngDimensions(bytes);
  if (width !== OG_CARD_WIDTH || height !== OG_CARD_HEIGHT) problems.push(`decodes to ${width}x${height}`);
  const ratio = width / height;
  if (Math.abs(ratio - 1200 / 630) > 1e-7) problems.push(`has aspect ratio ${ratio}`);
  if (bytes.length < MIN_CARD_BYTES) problems.push(`is ${bytes.length} bytes, under 5KB`);
  if (!card.asset.path.endsWith('.png')) problems.push('does not carry the .png extension the static server types as image/png');
  const exported = join(evidence.root, 'out', card.asset.path);
  if (!existsSync(exported) || sha256(readFileSync(exported)) !== sha256(bytes)) {
    problems.push(`out${card.asset.path} is not the same bytes`);
  }
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${card.asset.path} decodes to ${width}x${height} (${ratio.toFixed(7)}:1) at ${bytes.length} bytes, and out${card.asset.path} is the same bytes, which the static export serves as image/png`,
    payload: cardImage(evidence, card, id),
  };
}

function siteStringsVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const painted = card.strings.map(({ field, text }) => `${field}=${text}`).sort();
  const expected = [`descriptor=${PUBLIC_DESCRIPTOR}`, `identity=${PUBLIC_IDENTITY}`];
  if (card.kind !== 'site') problems.push('is not the site card');
  if (painted.join('|') !== expected.join('|')) problems.push(`paints [${painted.join('; ')}]`);
  const facts = card.facts as { identity?: string; descriptor?: string };
  if (facts.identity !== PUBLIC_IDENTITY || facts.descriptor !== PUBLIC_DESCRIPTOR) problems.push('records other facts');
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `the site card paints exactly two strings: "${PUBLIC_IDENTITY}" and "${PUBLIC_DESCRIPTOR}", each equal to lib/identity.ts`,
    payload: cardImage(evidence, card, id),
  };
}

function articleFactsVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const [domain, slug] = card.cardId.split('/');
  const article = publishedModules().find((entry) => entry.domain === domain && entry.slug === slug);
  if (card.kind !== 'article' || !article) fail(id, member, ['is not a published article card']);
  // Re-derived from the article's own frontmatter and the registry, apart
  // from the manifest builder, so the row does not grade its own record.
  const frontmatter = matter(
    readFileSync(join(evidence.root, 'content', domain, `${slug}.mdx`), 'utf8'),
  ).data as Record<string, unknown>;
  const reviewYear = Number(String(frontmatter.lastReviewed ?? '').slice(0, 4));
  const references = Array.isArray(frontmatter.citations) ? frontmatter.citations.length : 0;
  const domainName = DOMAIN_META[article.domain].name;
  if (frontmatter.title !== article.title) problems.push('the registry title differs from the frontmatter title');
  const expected = [
    `domain=${sanitizeCardText(domainName).toUpperCase()}`,
    `identity=${PUBLIC_IDENTITY}`,
    `referenceCount=${references} REFERENCES`,
    `reviewYear=REVIEWED ${reviewYear}`,
    `title=${sanitizeCardText(String(frontmatter.title))}`,
  ];
  const painted = card.strings.map(({ field, text }) => `${field}=${text}`).sort();
  if (painted.join('|') !== expected.join('|')) {
    problems.push(`paints [${painted.join('; ')}]; its sources derive [${expected.join('; ')}]`);
  }
  if (!Number.isInteger(reviewYear) || reviewYear < 2000) problems.push('has no review year');
  if (references < 1) problems.push('has no references to count');
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${card.cardId} paints its title "${article.title}", domain ${domainName}, review year ${reviewYear} and ${references} references, each equal to what its frontmatter and the registry derive, plus the compact "${PUBLIC_IDENTITY}" and no descriptor`,
    payload: cardImage(evidence, card, id),
  };
}

function uniqueAssetVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const [domain, slug] = card.cardId.split('/');
  const route = `/${domain}/${slug}/`;
  const expectedPath = `/og/${domain}/${slug}.png`;
  if (card.asset.path !== expectedPath) problems.push(`ships at ${card.asset.path}, not the slug-bearing ${expectedPath}`);
  if (canonical(card.routeOwners) !== canonical([route])) problems.push(`is owned by [${card.routeOwners.join(', ')}]`);
  const registryRoute = evidence.routes.find(({ path }) => path === route);
  const meta = registryRoute ? evidence.routeMeta.get(registryRoute.id) : undefined;
  const url = `${SITE_URL_ORIGIN}${expectedPath}`;
  if (!meta) problems.push(`${route} has no exported head`);
  else if (canonical(meta.ogImages) !== canonical([url]) || canonical(meta.twitterImages) !== canonical([url])) {
    problems.push(`${route} declares og:image [${meta.ogImages.join(', ')}] and twitter:image [${meta.twitterImages.join(', ')}]`);
  }
  const hash = sha256(shippedBytes(evidence, id, card.asset.path));
  const clashes = evidence.manifest.cards.filter(
    (other) => other.cardId !== card.cardId && sha256(shippedBytes(evidence, id, other.asset.path)) === hash,
  );
  if (clashes.length > 0) problems.push(`is byte-identical to ${clashes.map(({ cardId }) => cardId).join(', ')}`);
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${route} declares ${url} as og:image and twitter:image in its exported head, the card is owned by that route alone, and its bytes differ from the other ${evidence.manifest.cards.length - 1} cards including the site card`,
    payload: cardImage(evidence, card, id),
  };
}

function destinationVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const route = evidence.routes.find((candidate) => candidate.id === member);
  const meta = evidence.routeMeta.get(member);
  if (!route || route.routeKind !== 'destination' || !meta) fail(id, member, ['is not an exported destination']);
  const problems: string[] = [];
  const url = `${SITE_URL_ORIGIN}${SITE_CARD_PATH}`;
  if (canonical(meta.ogImages) !== canonical([url])) problems.push(`declares og:image [${meta.ogImages.join(', ')}]`);
  if (canonical(meta.twitterImages) !== canonical([url])) problems.push(`declares twitter:image [${meta.twitterImages.join(', ')}]`);
  if (!evidence.matrix.siteDestinations.includes(route.path)) problems.push('is not a sealed site-card destination');
  const site = evidence.manifest.cards.find(({ cardId }) => cardId === 'site');
  if (!site?.routeOwners.includes(route.path)) problems.push('is not recorded as an owner of the site card');
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${route.path} is a sealed site-card destination and its exported head declares ${url} as og:image and twitter:image`,
    payload: {
      kind: 'source-build',
      sourcePath: meta.htmlPath,
      predicate: 'og:image and twitter:image equal the single site card',
      observed: { route: route.path, ogImage: meta.ogImages, twitterImage: meta.twitterImages, siteCard: SITE_CARD_PATH },
      tool: 'lib/brand-v2-og-evidence.ts#routeCardMeta',
    },
  };
}

function renderingVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const display = evidence.manifest.fonts.find(({ faceId }) => faceId === 'og-face:display');
  if (!display) fail(id, member, ['the manifest records no display face']);
  const fileSha = evidence.faceSha256.get(display.faceId);
  if (fileSha !== display.sha256 || display.sha256 !== display.registeredSha256) {
    problems.push(`the display face ${display.path} hashes to ${fileSha}, not the registered ${display.registeredSha256}`);
  }
  if (display.mappedRoleInstance === null) problems.push('the display face maps to no web Tektur role instance');
  if (display.binary.variationAxes.length > 0) problems.push('the display face is not a static instance');
  for (const string of card.strings.filter(({ field }) => field === 'identity' || field === 'title')) {
    if (string.faceId !== display.faceId) problems.push(`${string.field} is set in ${string.faceId}`);
  }
  for (const token of card.paintedTokens) {
    const resolved = evidence.manifest.styleTokens.find((entry) => entry.token === token);
    if (!CARD_TOKENS.has(token)) problems.push(`paints ${token}`);
    if (!resolved || resolved.renderer !== resolved.runtime) problems.push(`${token} differs between renderer and runtime`);
  }
  const registered = OG_CARD_DEVICES.filter(({ cards }) => cards.includes(card.kind))
    .map(({ device, instance }) => `${device}#${instance}`)
    .sort();
  if (canonical([...card.devices].sort()) !== canonical(registered)) problems.push('paints other devices than the registered table');
  for (const device of ['device:outer-rail', 'device:registration-cross']) {
    if (!card.devices.some((use) => use.startsWith(`${device}#`))) problems.push(`paints no ${device}`);
  }
  const pixels = card.pixels;
  if (!pixels) fail(id, member, ['has no decoded-pixel record']);
  if (pixels.decodedWidth !== OG_CARD_WIDTH || pixels.decodedHeight !== OG_CARD_HEIGHT) problems.push('decoded at another size');
  if (pixels.offPalettePixels !== 0 || pixels.translucentPixels !== 0) {
    problems.push(`${pixels.offPalettePixels} off-palette and ${pixels.translucentPixels} translucent pixels`);
  }
  if (pixels.anchorsChecked === 0 || pixels.anchorsFailed.length > 0) {
    problems.push(`device anchors failed: [${pixels.anchorsFailed.join(', ')}] of ${pixels.anchorsChecked}`);
  }
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${card.cardId} sets its display strings in ${display.family} ${display.path} (the registered static instance mapped to ${display.mappedRoleInstance?.id} wght ${display.mappedRoleInstance?.wght} wdth ${display.mappedRoleInstance?.wdth}), paints only ${card.paintedTokens.join(', ')} with renderer and runtime values equal, and its ${card.devices.length} registered rail, rule and registration devices decoded at all ${pixels.anchorsChecked} anchors with no off-palette or translucent pixel`,
    payload: cardImage(evidence, card, id),
  };
}

function contentVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  const fields = card.strings.map(({ field }) => field).sort();
  if (canonical(fields) !== canonical(CARD_FIELDS[card.kind])) problems.push(`paints fields [${fields.join(', ')}]`);
  for (const { field, text } of card.strings) {
    if (BRAND_NAME_FAMILY.test(text) && text !== PUBLIC_IDENTITY) problems.push(`paints the retired identity "${text}"`);
    else if (/robot[\s\-_]*wiki/i.test(text) && text !== PUBLIC_IDENTITY) problems.push(`paints a brand variant "${text}"`);
    if (V1_DESCRIPTOR_PATTERN.test(text)) problems.push(`paints the retired descriptor "${text}"`);
    // A real article title may contain these words; it is held to its
    // frontmatter by VAL-B2-OG-004 instead.
    else if (field !== 'title' && /citation|encyclop/i.test(text) && text !== PUBLIC_DESCRIPTOR) {
      problems.push(`paints a descriptor variant "${text}"`);
    }
  }
  const entry = evidence.corpus.find(({ cardId }) => cardId === card.cardId);
  if (!entry) fail(id, member, ['has no corpus tree']);
  const tree = nodes(openSealedCardTree(entry.card));
  const types = [...new Set(tree.map(({ type }) => type))].sort();
  if (types.some((type) => !ELEMENT_TYPES.has(type))) problems.push(`renders elements [${types.join(', ')}]`);
  // Interface chrome, a chart label or a collage caption would be text that
  // carries no card field.
  const unlabelled = tree.filter(({ props }) => typeof props.children === 'string' && !props.ogMeta?.field);
  if (unlabelled.length > 0) problems.push(`paints ${unlabelled.length} text run(s) outside the card fields`);
  for (const node of tree) {
    const style = node.props.style;
    if (style.backgroundImage !== undefined || style.boxShadow !== undefined) {
      problems.push('paints a background image, gradient or shadow');
    }
  }
  if (card.paintedTokens.includes('highlight')) problems.push('paints the highlight tone of a selected or progress state');
  const registered = OG_CARD_DEVICES.filter(({ cards }) => cards.includes(card.kind)).length;
  if (card.devices.length !== registered) problems.push(`paints ${card.devices.length} devices, not the ${registered} registered`);
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${card.cardId} paints only its canonical fields (${fields.join(', ')}) and no other text, with no retired identity or descriptor spelling, renders ${tree.length} ${types.join('/')} elements with no image, gradient or shadow, paints no highlight tone, and draws only its ${card.devices.length} registered devices`,
    payload: cardImage(evidence, card, id),
  };
}

function metadataVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const meta = evidence.routeMeta.get(member);
  if (!meta) fail(id, member, ['has no exported head']);
  const problems: string[] = [];
  if (canonical(meta.twitterCards) !== canonical(['summary_large_image'])) {
    problems.push(`declares twitter:card [${meta.twitterCards.join(', ')}]`);
  }
  const image = meta.ogImages.length === 1 ? meta.ogImages[0] : '';
  let url: URL | null = null;
  try {
    url = new URL(image);
  } catch {
    url = null;
  }
  if (!url || url.protocol !== 'https:' || url.hostname !== new URL(SITE_URL_ORIGIN).hostname) {
    problems.push(`declares og:image [${meta.ogImages.join(', ')}], not one absolute apex-domain URL`);
  } else if (!evidence.manifest.cards.some(({ asset }) => asset.path === url.pathname)) {
    problems.push(`points at ${url.pathname}, which the corpus does not ship`);
  }
  if (canonical(meta.widths) !== canonical([String(OG_CARD_WIDTH)]) || canonical(meta.heights) !== canonical([String(OG_CARD_HEIGHT)])) {
    problems.push(`declares ${meta.widths.join(',')}x${meta.heights.join(',')}`);
  }
  const alt = meta.alts.length === 1 ? meta.alts[0] : '';
  if (alt.trim().length < 15) problems.push(`declares og:image:alt [${meta.alts.join(', ')}]`);
  // X reads its own tags, so the large card it shows has to be the same
  // image, size and alt text.
  if (canonical(meta.twitterImages) !== canonical(meta.ogImages)) {
    problems.push(`declares twitter:image [${meta.twitterImages.join(', ')}], not its og:image`);
  }
  if (canonical(meta.twitterWidths) !== canonical(meta.widths) || canonical(meta.twitterHeights) !== canonical(meta.heights)) {
    problems.push(`declares an X image of ${meta.twitterWidths.join(',')}x${meta.twitterHeights.join(',')}`);
  }
  if (canonical(meta.twitterAlts) !== canonical(meta.alts)) {
    problems.push(`declares twitter:image:alt [${meta.twitterAlts.join(', ')}], not its og:image:alt`);
  }
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${meta.route} declares one twitter:card summary_large_image, og:image ${image} at ${meta.widths[0]}x${meta.heights[0]}, and og:image:alt "${alt}" (${alt.length} characters), and its twitter:image, size and alt equal them`,
    payload: {
      kind: 'source-build',
      sourcePath: meta.htmlPath,
      predicate: 'one summary_large_image twitter:card, an absolute apex-domain og:image, 1200x630, and alt text of at least 15 characters, with the X image tags equal to the Open Graph ones',
      observed: {
        route: meta.route,
        twitterCard: meta.twitterCards,
        ogImage: meta.ogImages,
        width: meta.widths,
        height: meta.heights,
        alt: meta.alts,
        twitterImage: meta.twitterImages,
        twitterWidth: meta.twitterWidths,
        twitterHeight: meta.twitterHeights,
        twitterAlt: meta.twitterAlts,
      },
      tool: 'lib/brand-v2-og-evidence.ts#routeCardMeta',
    },
  };
}

function determinismVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const shippedHash = sha256(shippedBytes(evidence, id, card.asset.path));
  const second = card.pixels?.secondRenderSha256;
  if (!second || second !== card.asset.sha256 || shippedHash !== card.asset.sha256) {
    fail(id, member, [`staged ${card.asset.sha256}, second render ${String(second)}, shipped ${shippedHash}`]);
  }
  return {
    actual: `a second render of ${card.cardId} from identical inputs reproduced the staged bytes exactly (${second}) during validation, and the shipped file still hashes to that value`,
    payload: cardImage(evidence, card, id),
  };
}

function manifestVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const card = cardFor(evidence, id, member);
  const problems: string[] = [];
  for (const string of card.strings) {
    if (!string.sourceId || string.sourceValue === undefined || string.sourceValue === '') {
      problems.push(`${string.field} records no source`);
    }
  }
  if (card.routeOwners.length === 0) problems.push('records no route owner');
  const shippedHash = sha256(shippedBytes(evidence, id, card.asset.path));
  if (shippedHash !== card.asset.sha256) problems.push('records an asset hash the shipped file does not have');
  for (const token of card.paintedTokens) {
    const resolved = evidence.manifest.styleTokens.find((entry) => entry.token === token);
    if (!resolved || resolved.renderer !== resolved.runtime) problems.push(`records no resolved value for ${token}`);
  }
  if (Object.keys(card.facts).length === 0) problems.push('records no facts');
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `the manifest records ${card.strings.length} painted strings for ${card.cardId}, each with its source (${card.strings.map(({ sourceId }) => sourceId).join(', ')}), its facts, ${card.routeOwners.length} route owner(s), asset hash ${card.asset.sha256} equal to the shipped file and ${card.paintedTokens.length} resolved style tokens, and the current tree rebuilds that record exactly`,
    payload: cardImage(evidence, card, id),
  };
}

function glyphVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const derived = evidence.probes.find(({ memberId }) => memberId === member);
  if (!derived) fail(id, member, ['is not in the derived probe population']);
  const probe = evidence.manifest.glyphProbes.find(({ probeId }) => probeId === member);
  if (!probe) fail(id, member, ['was never probed']);
  const problems: string[] = [];
  if (probe.faceId !== derived.faceId || probe.text !== derived.text) problems.push('probed another string or face');
  if (canonical(probe.assignedBy) !== canonical(derived.assignedBy)) problems.push('records other assignments');
  if (!probe.fallbackFree || probe.ownFaceSha256 === null || probe.ownFaceSha256 !== probe.productionSha256) {
    problems.push(probe.failure ?? 'the own-face and production renders differ');
  }
  const face = OG_RENDERER_FACES.find(({ faceId }) => faceId === probe.faceId);
  const record = evidence.manifest.fonts.find(({ faceId }) => faceId === probe.faceId);
  if (!face || !record) fail(id, member, ['names an unregistered face']);
  if (evidence.faceSha256.get(face.faceId) !== face.sha256 || record.sha256 !== face.sha256 || record.registeredSha256 !== face.sha256) {
    problems.push(`${face.path} is not the registered checksum ${face.sha256}`);
  }
  const font = openSync(join(evidence.root, face.path)) as LayoutFont;
  const missing = [...new Set([...probe.text].map((character) => character.codePointAt(0) as number))].filter(
    (codePoint) => !font.hasGlyphForCodePoint(codePoint),
  );
  if (missing.length > 0 || probe.cmapMissing.length > 0) problems.push(`cmap misses ${missing.length} code points`);
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `"${probe.text}" (${probe.codePointCount} code points, assigned by ${probe.assignedBy.join(', ')}) is covered by the cmap of ${face.path}, whose bytes equal the registered checksum${record.mappedRoleInstance ? ` and which maps to the static instance ${record.mappedRoleInstance.id}` : ''}, and rendered identically with only ${face.family} and with every production face registered, so no glyph fell back`,
    payload: {
      kind: 'source-build',
      sourcePath: OG_CARD_MANIFEST_PATH,
      predicate: 'the assigned string is in the registered face cmap, the face bytes equal the registered checksum, and its own-face and production probe renders are identical',
      observed: {
        probeId: probe.probeId,
        faceId: probe.faceId,
        facePath: face.path,
        faceSha256: face.sha256,
        mappedRoleInstance: record.mappedRoleInstance?.id ?? null,
        codePoints: probe.codePointCount,
        cmapMissing: missing,
        canvas: probe.canvas,
        ownFaceSha256: probe.ownFaceSha256,
        productionSha256: probe.productionSha256,
        assignedBy: probe.assignedBy,
      },
      tool: 'lib/og-card-glyph-probes.ts#runGlyphProbes',
    },
  };
}

function treeReading(evidence: OgEvidence, id: string, member: string) {
  const path = member.replace(/^og-tree:/, '');
  const tree = OG_PUBLICATION_TREES.find((candidate) => candidate.path === path);
  if (!member.startsWith('og-tree:') || !tree) fail(id, member, ['is not a publication tree']);
  const journalled = evidence.journal.trees.find((candidate) => candidate.path === path);
  const directory = join(evidence.root, path);
  const files = tree.kind === 'evidence' ? ['manifest.json'] : existsSync(directory) ? treeFiles(directory) : [];
  const digest = files.length > 0 ? filesDigest(directory, files) : null;
  const prefix = path.split('/')[1];
  const recorded = new Map<string, string>();
  for (const card of evidence.manifest.cards) {
    for (const asset of [card.asset, ...card.structuredVariants]) {
      if (asset.path.split('/')[1] === prefix) recorded.set(asset.path.split('/').slice(2).join('/'), asset.sha256);
    }
  }
  return { path, tree, journalled, directory, files, digest, recorded };
}

function publicationObserved(evidence: OgEvidence, reading: ReturnType<typeof treeReading>) {
  return {
    tree: reading.path,
    kind: reading.tree.kind,
    journalState: evidence.journal.state,
    journalStatus: reading.journalled?.status ?? null,
    stagedDigest: reading.journalled?.stagedDigest ?? null,
    currentDigest: reading.digest,
    files: reading.files.length,
    liveJournal: evidence.liveJournal,
    stagingLeft: evidence.stagingLeft,
  };
}

function stagingVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const reading = treeReading(evidence, id, member);
  const problems: string[] = [];
  const { manifest, journal } = evidence;
  if (journal.state !== 'complete') problems.push(`the journal is ${journal.state}`);
  if (!reading.journalled || reading.journalled.status !== 'swapped') problems.push('was not swapped by the journal');
  else if (reading.digest !== reading.journalled.stagedDigest) problems.push('is not the staged tree the journal validated');
  const toolchain = manifest.toolchain;
  const unpinned = toolchain.packages.filter(({ version, integrity }) => !version || !integrity).map(({ name }) => name);
  if (!toolchain.node || unpinned.length > 0 || !toolchain.renderer.vercelOg || !toolchain.renderer.bundleSha256 || !toolchain.pngDecoderSha256) {
    problems.push(`the manifest does not pin the toolchain (unpinned: ${unpinned.join(', ') || 'renderer'})`);
  }
  if (manifest.fonts.some(({ sha256: hash }) => !hash)) problems.push('a font binary is not pinned');
  if (manifest.cards.length !== manifest.contract.ogCardCount) problems.push('the input manifest is not the full corpus');
  if (evidence.stagingLeft || evidence.liveJournal) problems.push(`${OG_STAGING_DIR} is left behind`);
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${reading.path} was validated in the clean staging tree and swapped in by the completed journal: its current digest ${reading.digest} is the staged digest the journal recorded; the manifest records all ${manifest.cards.length} cards' inputs, node ${toolchain.node}, ${toolchain.packages.map(({ name, version }) => `${name} ${version}`).join(', ')}, @vercel/og ${toolchain.renderer.vercelOg} through ${toolchain.renderer.rasterizer}, and ${manifest.fonts.length} hashed font binaries`,
    payload: {
      kind: 'source-build',
      sourcePath: OG_CARD_JOURNAL_PATH,
      predicate: 'every published tree is the journalled staged tree, and the manifest pins the inputs and toolchain',
      observed: publicationObserved(evidence, reading),
      tool: 'lib/og-card-publication.ts#publishOgCorpus',
    },
  };
}

function parityVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const reading = treeReading(evidence, id, member);
  const problems: string[] = [];
  if (evidence.journal.state !== 'complete') problems.push(`the journal is ${evidence.journal.state}`);
  if (!reading.journalled || reading.digest !== reading.journalled.stagedDigest) problems.push('is not the validated staging tree');
  if (reading.tree.kind === 'evidence') {
    const file = join(reading.directory, 'manifest.json');
    const published = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as OgCardManifest) : null;
    if (!published || canonical(published) !== canonical(evidence.manifest)) {
      problems.push('does not hold the manifest every other row reads');
    }
  } else {
    const wanted = [...reading.recorded.keys()].sort();
    if (canonical(reading.files) !== canonical(wanted)) {
      problems.push(`holds ${reading.files.length} files; the validated corpus records ${wanted.length}`);
    }
    for (const file of reading.files) {
      if (sha256(readFileSync(join(reading.directory, file))) !== reading.recorded.get(file)) {
        problems.push(`${file} is not the recorded bytes`);
      }
    }
    if (new Set(reading.recorded.values()).size !== reading.recorded.size) problems.push('two recorded files share bytes');
    const twin = reading.path.startsWith('public/') ? reading.path.replace(/^public\//, 'out/') : reading.path.replace(/^out\//, 'public/');
    const twinDirectory = join(evidence.root, twin);
    const twinFiles = existsSync(twinDirectory) ? treeFiles(twinDirectory) : [];
    if (filesDigest(twinDirectory, twinFiles) !== reading.digest) problems.push(`is not byte-equal to ${twin}`);
  }
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual:
      reading.tree.kind === 'evidence'
        ? `${reading.path}/manifest.json is the manifest the journal validated (digest ${reading.digest}), and it records the hash of every published file`
        : `${reading.path} holds exactly the ${reading.files.length} files the validated corpus records, each equal to its recorded hash, with no extra, missing, linked or duplicate file, and it is byte-equal to its ${reading.path.startsWith('public/') ? 'out/' : 'public/'} twin (digest ${reading.digest}); equality with the blobs committed at HEAD is enforced on release by this reader and by the committed byte gate`,
    payload: {
      kind: 'source-build',
      sourcePath: OG_CARD_MANIFEST_PATH,
      predicate: 'the staged, published, exported and recorded bytes are equal, with nothing extra, missing, linked or duplicated',
      observed: { ...publicationObserved(evidence, reading), recordedFiles: reading.tree.kind === 'evidence' ? 1 : reading.recorded.size },
      tool: 'lib/og-card-parity.ts#verifyOgCorpusParity',
    },
  };
}

function rollbackVerdict(evidence: OgEvidence, id: string, member: string): OgVerdict {
  const reading = treeReading(evidence, id, member);
  const problems: string[] = [];
  if (evidence.journal.state !== 'complete') problems.push(`the journal is ${evidence.journal.state}, so a publication did not complete`);
  if (!reading.journalled) problems.push('is missing from the journal');
  else if (reading.journalled.status !== 'swapped') problems.push(`is ${reading.journalled.status}, not swapped`);
  else if (reading.digest !== reading.journalled.stagedDigest) problems.push('holds a mixed or partial tree');
  if (evidence.liveJournal) problems.push('an incomplete journal is waiting for recovery');
  if (evidence.stagingLeft) problems.push(`${OG_STAGING_DIR} is left behind`);
  if (problems.length > 0) fail(id, member, problems);
  return {
    actual: `${reading.path} is the complete tree the journal swapped in (digest ${reading.digest}); no live journal or staging tree is left, so no partial or mixed corpus is in place, and rollback and crash recovery are exercised by the named publication tests`,
    payload: {
      kind: 'source-build',
      sourcePath: OG_CARD_JOURNAL_PATH,
      predicate: 'no incomplete journal or partial tree remains, and every tree is the one a completed publication swapped in',
      observed: publicationObserved(evidence, reading),
      tool: 'lib/og-card-publication.ts#recoverOgPublication',
    },
  };
}

const VERDICTS: Readonly<Record<string, (evidence: OgEvidence, id: string, member: string) => OgVerdict>> = {
  'VAL-B2-ID-009': identityVerdict,
  'VAL-B2-OG-001': corpusCountVerdict,
  'VAL-B2-OG-002': dimensionsVerdict,
  'VAL-B2-OG-003': siteStringsVerdict,
  'VAL-B2-OG-004': articleFactsVerdict,
  'VAL-B2-OG-005': uniqueAssetVerdict,
  'VAL-B2-OG-006': destinationVerdict,
  'VAL-B2-OG-007': renderingVerdict,
  'VAL-B2-OG-008': contentVerdict,
  'VAL-B2-OG-009': metadataVerdict,
  'VAL-B2-OG-010': determinismVerdict,
  'VAL-B2-OG-011': manifestVerdict,
  'VAL-B2-OG-012': glyphVerdict,
  'VAL-B2-OG-013': stagingVerdict,
  'VAL-B2-OG-014': parityVerdict,
  'VAL-B2-OG-015': rollbackVerdict,
};

/** One member's reading for one row; throws when the member fails it. */
export function ogAssertionVerdict(evidence: OgEvidence, assertionId: string, member: string): OgVerdict {
  const verdict = VERDICTS[assertionId];
  if (!verdict) throw new Error(`${assertionId} is not an Open Graph row`);
  return verdict(evidence, assertionId, member);
}

export { OG_CARD_EVIDENCE_DIR };
