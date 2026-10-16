/**
 * The Open Graph renderer-input manifest (VAL-B2-OG-011, VAL-B2-OG-012).
 *
 * For every card the manifest records each painted string with the card
 * field it carries, the canonical source it was derived from and that
 * source's raw value; the article facts; the routes that own the card in
 * the metadata ledger; the grid devices and colour tokens it paints; and
 * the hash, size and dimensions of every file the generator wrote. At the
 * corpus level it records the registered faces with their checksums and
 * the static instance each maps to, the resolved style tokens beside their
 * runtime declarations, the glyph probes, and the pinned toolchain.
 *
 * The expected strings are re-derived here from the sources — the module
 * registry, the article frontmatter and lib/identity.ts — independently of
 * the corpus builder, and compared with the runs the sealed tree paints.
 * So a card's text is proven equal to its facts without reading pixels.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import matter from 'gray-matter';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import { TEKTUR_FONT_METADATA } from '../data/tektur-font-metadata.ts';
import { TEKTUR_ROLE_INSTANCES } from '../data/type-roles.ts';
import { BRAND_COLORS } from './brand-v2-tokens.ts';
import { deriveAuthoredColorTokens } from './brand-v2-token-evidence.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import {
  OG_CARD_DEVICES,
  cardDevices,
  cardPaintedColors,
  cardTextRuns,
  type CardField,
  type OgCardKind,
} from './og-card-artwork.ts';
import { openSealedCardTree, type OgCardCorpusEntry } from './og-card-corpus.ts';
import type { GlyphProbeResult } from './og-card-glyph-probes.ts';
import { readOgMatrix, ogMatrixDrift, type OgMatrix } from './og-card-matrix.ts';
import {
  ARTICLE_IMAGE_VARIANTS,
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_URL_ORIGIN,
  articleCardPath,
  ogImageAltForTitle,
  sanitizeCardText,
  siteOgImageAlt,
} from './og-cards.ts';
import {
  OG_RENDERER_FACES,
  ogRendererFaceForStack,
} from './og-renderer-fonts.ts';
import { pngDimensions } from './png-decode.ts';

export const OG_CARD_EVIDENCE_DIR = 'evidence/brand-v2/og-cards';
export const OG_CARD_MANIFEST_PATH = `${OG_CARD_EVIDENCE_DIR}/manifest.json`;
export const OG_CARD_JOURNAL_PATH = `${OG_CARD_EVIDENCE_DIR}/journal.json`;
const REGISTRIES_PATH = 'contract/brand-v2-registries.json';
const RUNTIME_TOKENS_PATH = 'app/globals.css';

/** Colours a card may paint; the highlight tone never appears on a card. */
const CARD_PALETTE = ['paper', 'white', 'ink', 'graphite', 'concrete', 'signal'] as const;

/** The face role each card field is set in. */
const FIELD_FACE: Record<CardField, 'og-face:display' | 'og-face:data'> = {
  identity: 'og-face:display',
  title: 'og-face:display',
  descriptor: 'og-face:data',
  domain: 'og-face:data',
  reviewYear: 'og-face:data',
  referenceCount: 'og-face:data',
};

export type ManifestString = {
  field: CardField;
  text: string;
  faceId: string;
  /** The canonical source, e.g. `content/classical/control.mdx#frontmatter.lastReviewed`. */
  sourceId: string;
  sourceValue: string | number;
};

export type ManifestAsset = {
  path: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
};

export type ManifestCard = {
  cardId: string;
  kind: OgCardKind;
  matrixRow: number;
  assetPath: string;
  routeOwners: string[];
  alt: string;
  treeDigest: string;
  strings: ManifestString[];
  facts:
    | { identity: string; descriptor: string }
    | {
        title: string;
        domain: string;
        domainName: string;
        reviewYear: number;
        referenceCount: number;
      };
  devices: string[];
  paintedTokens: string[];
  asset: ManifestAsset;
  structuredVariants: ManifestAsset[];
  /** Decoded-pixel results, filled by the staged-corpus validation. */
  pixels?: {
    decodedWidth: number;
    decodedHeight: number;
    maxPaletteDistance: number;
    offPalettePixels: number;
    translucentPixels: number;
    anchorsChecked: number;
    anchorsFailed: string[];
    inkPixels: Record<string, number>;
    secondRenderSha256: string;
  };
};

export type OgCardManifest = {
  schemaVersion: 1;
  contract: {
    source: string;
    ogCardCount: number;
    articleCount: number;
    siteDestinations: string[];
    structuredImageCount: number;
  };
  /** Registry-ledger route owners outside the public population, e.g. the 404. */
  separateOwners: Array<{ route: string; assetPath: string }>;
  fonts: ManifestFont[];
  styleTokens: Array<{ token: string; renderer: string; runtime: string }>;
  toolchain: OgToolchain;
  cards: ManifestCard[];
  glyphProbes: GlyphProbeResult[];
  corpusSha256: string;
};

export type ManifestFont = {
  faceId: string;
  family: string;
  roleId: string;
  path: string;
  sha256: string;
  registeredSha256: string;
  weight: number;
  style: string;
  mappedRoleInstance: { id: string; wght: number; wdth: number } | null;
  binary: {
    format: string;
    fullName: string;
    usWeightClass: number | null;
    usWidthClass: number | null;
    variationAxes: string[];
    cmapCodePoints: number;
  };
};

export type OgToolchain = {
  node: string;
  packages: Array<{ name: string; version: string | null; integrity: string | null }>;
  renderer: {
    vercelOg: string | null;
    bundleSha256: string | null;
    resvgWasmSha256: string | null;
    yogaWasmSha256: string | null;
    /** The bundle rasterizes through sharp when it can import it. */
    rasterizer: 'sharp' | 'resvg-wasm';
    libvips: Array<{ package: string; version: string | null; vips: string | null; rsvg: string | null; png: string | null }>;
  };
  pngDecoderSha256: string;
};

export function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path: string): Record<string, unknown> | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>) : null;
}

function fileSha(path: string): string | null {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

/**
 * The pinned generator, runtime, font and image tooling, read from the
 * lockfile and the installed packages. Nothing here is imported or run: the
 * renderer bundle decides its rasterizer by whether `sharp` resolves, and
 * that is recorded from the installed package rather than by loading it.
 */
export function ogToolchain(root: string): OgToolchain {
  const lock = (readJson(join(root, 'package-lock.json'))?.packages ?? {}) as Record<
    string,
    { version?: string; integrity?: string }
  >;
  const pinned = (name: string) => ({
    name,
    version: lock[`node_modules/${name}`]?.version ?? null,
    integrity: lock[`node_modules/${name}`]?.integrity ?? null,
  });
  const og = join(root, 'node_modules/next/dist/compiled/@vercel/og');
  const sharpInstalled = existsSync(join(root, 'node_modules/sharp/package.json'));
  const libvips = Object.keys(lock)
    .filter((key) => /^node_modules\/@img\/sharp-libvips-[^/]+$/.test(key))
    .filter((key) => existsSync(join(root, key, 'package.json')))
    .sort()
    .map((key) => {
      const versions = readJson(join(root, key, 'versions.json')) as Record<string, string> | null;
      return {
        package: key.replace(/^node_modules\//, ''),
        version: lock[key]?.version ?? null,
        vips: versions?.vips ?? null,
        rsvg: versions?.rsvg ?? null,
        png: versions?.png ?? null,
      };
    });
  return {
    node: process.version,
    packages: ['next', 'sharp', 'fontkit', 'gray-matter'].map(pinned),
    renderer: {
      vercelOg: (readJson(join(og, 'package.json'))?.version as string | undefined) ?? null,
      bundleSha256: fileSha(join(og, 'index.node.js')),
      resvgWasmSha256: fileSha(join(og, 'resvg.wasm')),
      yogaWasmSha256: fileSha(join(og, 'yoga.wasm')),
      rasterizer: sharpInstalled ? 'sharp' : 'resvg-wasm',
      libvips,
    },
    pngDecoderSha256: sha256(readFileSync(join(root, 'lib/png-decode.ts'))),
  };
}

function inspectFonts(root: string, failures: string[]): ManifestFont[] {
  return OG_RENDERER_FACES.map((face) => {
    const path = join(root, face.path);
    const font = openSync(path) as Font;
    const actual = sha256(readFileSync(path));
    if (actual !== face.sha256) {
      failures.push(`${face.faceId}: ${face.path} hashes to ${actual}; the registry records ${face.sha256}`);
    }
    const os2 = font['OS/2'] as { usWeightClass?: number; usWidthClass?: number } | undefined;
    const axes = Object.keys(font.variationAxes ?? {});
    if (axes.length > 0) failures.push(`${face.faceId}: the OG face is variable (${axes.join(', ')})`);
    let mappedRoleInstance: ManifestFont['mappedRoleInstance'] = null;
    if (face.roleId === 'display') {
      const instance = TEKTUR_ROLE_INSTANCES.find(({ id }) => id === TEKTUR_FONT_METADATA.og.mappedRoleId);
      if (!instance) {
        failures.push(`${face.faceId}: mapped role ${TEKTUR_FONT_METADATA.og.mappedRoleId} is not a registered Tektur instance`);
      } else {
        mappedRoleInstance = { id: instance.id, wght: instance.wght, wdth: instance.wdth };
        if (os2?.usWeightClass !== instance.wght) {
          failures.push(`${face.faceId}: usWeightClass ${String(os2?.usWeightClass)} does not match the mapped ${instance.id} wght ${instance.wght}`);
        }
        // usWidthClass 5 is the OpenType "medium (normal)" width, wdth 100.
        if (instance.wdth !== 100 || os2?.usWidthClass !== 5) {
          failures.push(`${face.faceId}: usWidthClass ${String(os2?.usWidthClass)} does not match the mapped ${instance.id} wdth ${instance.wdth}`);
        }
      }
    }
    return {
      faceId: face.faceId,
      family: face.family,
      roleId: face.roleId,
      path: face.path,
      sha256: actual,
      registeredSha256: face.sha256,
      weight: face.weight,
      style: face.style,
      mappedRoleInstance,
      binary: {
        format: font.type,
        fullName: font.fullName,
        usWeightClass: os2?.usWeightClass ?? null,
        usWidthClass: os2?.usWidthClass ?? null,
        variationAxes: axes,
        cmapCodePoints: font.characterSet.length,
      },
    };
  });
}

type LedgerEntry = {
  routeId: string;
  openGraph?: { image?: string; width?: number; height?: number } | null;
  twitter?: { card?: string; image?: string } | null;
};

/**
 * The routes that own each card, from the metadata ledger. Every public
 * route must own exactly one card with a large-image twitter block whose
 * image equals its Open Graph image.
 */
function routeOwnership(
  root: string,
  failures: string[],
): { ownersByPath: Map<string, string[]>; separate: Array<{ route: string; assetPath: string }> } {
  const registries = readJson(join(root, REGISTRIES_PATH)) as {
    routes: { public: Array<{ path: string; publicContent: boolean }> };
    metadata: LedgerEntry[];
  };
  const publicRoutes = new Set(registries.routes.public.filter((route) => route.publicContent).map(({ path }) => path));
  const ownersByPath = new Map<string, string[]>();
  const separate: Array<{ route: string; assetPath: string }> = [];
  const seen = new Set<string>();
  for (const entry of registries.metadata) {
    const route = entry.routeId.replace(/^route:/, '');
    const image = entry.openGraph?.image ?? '';
    if (!image.startsWith(`${SITE_URL_ORIGIN}/og/`)) {
      failures.push(`${route}: og:image ${image || '(none)'} is not an absolute apex card URL`);
      continue;
    }
    if (entry.openGraph?.width !== OG_CARD_WIDTH || entry.openGraph?.height !== OG_CARD_HEIGHT) {
      failures.push(`${route}: declares ${String(entry.openGraph?.width)}x${String(entry.openGraph?.height)}, not 1200x630`);
    }
    if (entry.twitter?.card !== 'summary_large_image' || entry.twitter?.image !== image) {
      failures.push(`${route}: twitter block is not summary_large_image on the og:image`);
    }
    const assetPath = image.slice(SITE_URL_ORIGIN.length);
    if (!publicRoutes.has(route)) {
      separate.push({ route, assetPath });
      continue;
    }
    seen.add(route);
    ownersByPath.set(assetPath, [...(ownersByPath.get(assetPath) ?? []), route].sort());
  }
  for (const route of publicRoutes) {
    if (!seen.has(route)) failures.push(`${route}: the metadata ledger records no card for this public route`);
  }
  return { ownersByPath, separate: separate.sort((a, b) => a.route.localeCompare(b.route)) };
}

function expectedStrings(
  root: string,
  entry: OgCardCorpusEntry,
  failures: string[],
): { strings: ManifestString[]; facts: ManifestCard['facts'] } {
  const identity: ManifestString = {
    field: 'identity',
    text: PUBLIC_IDENTITY,
    faceId: FIELD_FACE.identity,
    sourceId: 'lib/identity.ts#PUBLIC_IDENTITY',
    sourceValue: PUBLIC_IDENTITY,
  };
  if (entry.cardId === 'site') {
    return {
      strings: [
        identity,
        {
          field: 'descriptor',
          text: PUBLIC_DESCRIPTOR,
          faceId: FIELD_FACE.descriptor,
          sourceId: 'lib/identity.ts#PUBLIC_DESCRIPTOR',
          sourceValue: PUBLIC_DESCRIPTOR,
        },
      ],
      facts: { identity: PUBLIC_IDENTITY, descriptor: PUBLIC_DESCRIPTOR },
    };
  }
  const [domain, slug] = entry.cardId.split('/');
  const article = publishedModules().find((m) => m.domain === domain && m.slug === slug);
  if (!article) throw new Error(`${entry.cardId} is not a published module`);
  const mdxPath = `content/${domain}/${slug}.mdx`;
  const frontmatter = matter(readFileSync(join(root, mdxPath), 'utf8')).data as Record<string, unknown>;
  if (frontmatter.title !== article.title) {
    failures.push(`${entry.cardId}: the registry title "${article.title}" differs from the article frontmatter title "${String(frontmatter.title)}"`);
  }
  const lastReviewed = String(frontmatter.lastReviewed ?? '');
  const reviewYear = Number(lastReviewed.slice(0, 4));
  const citations = Array.isArray(frontmatter.citations) ? frontmatter.citations.length : 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastReviewed)) failures.push(`${entry.cardId}: lastReviewed "${lastReviewed}" is not a date`);
  if (citations < 1) failures.push(`${entry.cardId}: the article cites nothing, so the card has no reference count`);
  const domainName = DOMAIN_META[article.domain].name;
  return {
    strings: [
      {
        field: 'domain',
        text: sanitizeCardText(domainName).toUpperCase(),
        faceId: FIELD_FACE.domain,
        sourceId: `data/modules.ts#DOMAIN_META.${domain}.name`,
        sourceValue: domainName,
      },
      {
        field: 'reviewYear',
        text: `REVIEWED ${reviewYear}`,
        faceId: FIELD_FACE.reviewYear,
        sourceId: `${mdxPath}#frontmatter.lastReviewed`,
        sourceValue: lastReviewed,
      },
      {
        field: 'title',
        text: sanitizeCardText(article.title),
        faceId: FIELD_FACE.title,
        sourceId: `data/modules.ts#${domain}/${slug}.title`,
        sourceValue: article.title,
      },
      identity,
      {
        field: 'referenceCount',
        text: `${citations} REFERENCES`,
        faceId: FIELD_FACE.referenceCount,
        sourceId: `${mdxPath}#frontmatter.citations`,
        sourceValue: citations,
      },
    ],
    facts: { title: article.title, domain, domainName, reviewYear, referenceCount: citations },
  };
}

function assetRecord(path: string, bytes: Buffer | undefined, failures: string[]): ManifestAsset {
  if (bytes === undefined) {
    failures.push(`${path}: no staged file`);
    return { path, width: 0, height: 0, bytes: 0, sha256: '' };
  }
  const { width, height } = pngDimensions(bytes);
  return { path, width, height, bytes: bytes.length, sha256: sha256(bytes) };
}

export type BuildManifestInput = {
  root: string;
  corpus: readonly OgCardCorpusEntry[];
  /** Staged bytes by site-absolute path, e.g. `/og/robot-wiki.png`. */
  files: ReadonlyMap<string, Buffer>;
  glyphProbes: readonly GlyphProbeResult[];
  matrix?: OgMatrix;
};

/**
 * Builds the manifest and checks every record it can check without pixels.
 * The manifest is returned even when failures exist, so a failing run can
 * still be inspected; the caller must not publish unless failures is empty.
 */
export function buildOgCardManifest(input: BuildManifestInput): {
  manifest: OgCardManifest;
  failures: string[];
} {
  const { root, corpus } = input;
  const failures: string[] = [];
  const matrix = input.matrix ?? readOgMatrix(root);
  failures.push(...ogMatrixDrift(matrix, corpus));
  const published = publishedModules();
  if (corpus.length !== published.length + 1) {
    failures.push(`the corpus holds ${corpus.length} cards; the registry publishes ${published.length} articles plus the site card`);
  }

  const registryDevices = new Set(
    ((readJson(join(root, REGISTRIES_PATH))?.gridDevices ?? []) as Array<{ id: string }>).map(({ id }) => id),
  );
  const { ownersByPath, separate } = routeOwnership(root, failures);
  const authored = deriveAuthoredColorTokens(readFileSync(join(root, RUNTIME_TOKENS_PATH), 'utf8'));
  const tokenByHex = new Map(
    CARD_PALETTE.map((token) => [BRAND_COLORS[token].toUpperCase(), token as string]),
  );
  const usedTokens = new Set<string>();

  const cards: ManifestCard[] = corpus.map((entry) => {
    const kind: OgCardKind = entry.cardId === 'site' ? 'site' : 'article';
    const tree = openSealedCardTree(entry.card);
    const row = matrix.rows.find(({ cardId }) => cardId === entry.cardId);
    const { strings, facts } = expectedStrings(root, entry, failures);

    // The painted runs must be exactly the derived strings, field by field.
    const runs = cardTextRuns(tree);
    const painted = runs.map((run) => ({
      field: run.field,
      text: run.text,
      faceId: ogRendererFaceForStack(run.family)?.faceId ?? `unregistered:${run.family}`,
    }));
    const key = (value: { field?: string; text: string; faceId: string }) =>
      `${value.field ?? '(no field)'}|${value.faceId}|${value.text}`;
    const expectedKeys = strings.map(key).sort();
    const paintedKeys = painted.map(key).sort();
    if (expectedKeys.join('\n') !== paintedKeys.join('\n')) {
      failures.push(
        `${entry.cardId}: paints [${paintedKeys.join('; ')}]; its sources derive [${expectedKeys.join('; ')}]`,
      );
    }

    const devices = cardDevices(tree).map(({ device, instance }) => `${device}#${instance}`);
    const expectedDevices = OG_CARD_DEVICES.filter(({ cards: kinds }) => kinds.includes(kind))
      .map(({ device, instance }) => `${device}#${instance}`)
      .sort();
    if ([...devices].sort().join('|') !== expectedDevices.join('|')) {
      failures.push(`${entry.cardId}: paints devices [${devices.join(', ')}]; the device table registers [${expectedDevices.join(', ')}]`);
    }
    for (const device of new Set(devices.map((id) => id.split('#')[0]))) {
      if (!registryDevices.has(device)) {
        failures.push(`${entry.cardId}: ${device} is not a website grid device in ${REGISTRIES_PATH}`);
      }
    }

    const paintedTokens = new Set<string>();
    for (const colour of cardPaintedColors(tree)) {
      for (const hex of colour.hexes) {
        const token = tokenByHex.get(hex);
        if (token === undefined) failures.push(`${entry.cardId}: paints ${hex} (${colour.property}), which is not a card palette token`);
        else paintedTokens.add(token);
      }
      for (const raw of colour.unregistered) failures.push(`${entry.cardId}: paints unregistered colour syntax ${raw}`);
    }
    paintedTokens.forEach((token) => usedTokens.add(token));

    const assetPath = entry.cardPath;
    const routeOwners = ownersByPath.get(assetPath) ?? [];
    if (kind === 'site') {
      const sealed = [...matrix.siteDestinations].sort();
      if (routeOwners.join('|') !== sealed.join('|')) {
        failures.push(`site card is owned by [${routeOwners.join(', ')}]; the matrix seals [${sealed.join(', ')}]`);
      }
    } else if (routeOwners.join('|') !== `/${entry.cardId}/`) {
      failures.push(`${entry.cardId}: owned by [${routeOwners.join(', ')}], not by /${entry.cardId}/ alone`);
    }

    const alt = kind === 'site' ? siteOgImageAlt() : ogImageAltForTitle((facts as { title: string }).title);
    if (alt.length < 15 || /[\u2013\u2014]/.test(alt)) failures.push(`${entry.cardId}: og:image:alt "${alt}" is too short or carries a dash`);

    const asset = assetRecord(assetPath, input.files.get(assetPath), failures);
    if (asset.width !== OG_CARD_WIDTH || asset.height !== OG_CARD_HEIGHT) {
      failures.push(`${assetPath}: ${asset.width}x${asset.height}, not ${OG_CARD_WIDTH}x${OG_CARD_HEIGHT}`);
    }
    const structuredVariants =
      kind === 'site'
        ? []
        : ARTICLE_IMAGE_VARIANTS.filter(({ id }) => id !== 'landscape').map((variant) => {
            const [domain, slug] = entry.cardId.split('/');
            const path = articleCardPath(domain, slug, variant.id);
            const record = assetRecord(path, input.files.get(path), failures);
            if (record.width !== variant.width || record.height !== variant.height) {
              failures.push(`${path}: ${record.width}x${record.height}, not ${variant.width}x${variant.height}`);
            }
            return record;
          });

    return {
      cardId: entry.cardId,
      kind,
      matrixRow: row?.row ?? 0,
      assetPath,
      routeOwners,
      alt,
      treeDigest: entry.card.cardTreeDigest,
      strings,
      facts,
      devices,
      paintedTokens: [...paintedTokens].sort(),
      asset,
      structuredVariants,
    };
  });

  const ownedPaths = new Set(cards.map(({ assetPath }) => assetPath));
  for (const path of ownersByPath.keys()) {
    if (!ownedPaths.has(path)) failures.push(`the metadata ledger points routes at ${path}, which the corpus does not ship`);
  }

  // Every file is at least 5KB and no two files share bytes.
  const allAssets = cards.flatMap(({ asset, structuredVariants }) => [asset, ...structuredVariants]);
  const byHash = new Map<string, string>();
  for (const asset of allAssets) {
    if (asset.bytes < 5 * 1024) failures.push(`${asset.path} is ${asset.bytes} bytes; the minimum card body is 5KB`);
    const clash = byHash.get(asset.sha256);
    if (clash && asset.sha256 !== '') failures.push(`${asset.path} and ${clash} are byte-identical`);
    byHash.set(asset.sha256, asset.path);
  }
  const structuredCount = cards.reduce((sum, { structuredVariants }) => sum + structuredVariants.length, 0);
  if (structuredCount !== matrix.structuredImageCount) {
    failures.push(`${structuredCount} structured images; the matrix seals ${matrix.structuredImageCount}`);
  }
  if (input.files.size !== allAssets.length) {
    failures.push(`${input.files.size} files were staged; the corpus accounts for ${allAssets.length}`);
  }

  const styleTokens = [...usedTokens].sort().map((token) => ({
    token,
    renderer: BRAND_COLORS[token as keyof typeof BRAND_COLORS],
    runtime: authored.hexByToken[token] ?? 'absent',
  }));
  for (const { token, renderer, runtime } of styleTokens) {
    if (renderer !== runtime) failures.push(`--color-${token} resolves to ${runtime} at runtime; the renderer mirror paints ${renderer}`);
  }

  const fonts = inspectFonts(root, failures);
  for (const probe of input.glyphProbes) {
    if (!probe.fallbackFree) failures.push(`${probe.probeId}: ${probe.failure ?? 'glyph probe failed'}`);
  }
  if (input.glyphProbes.length === 0) failures.push('no glyph probe was run');

  const corpusSha256 = sha256(
    allAssets.map(({ path, sha256: hash }) => `${path} ${hash}`).sort().join('\n'),
  );
  const manifest: OgCardManifest = {
    schemaVersion: 1,
    contract: {
      source: `${'contract/design-integrity.md'}#20`,
      ogCardCount: matrix.rows.length,
      articleCount: matrix.rows.length - 1,
      siteDestinations: matrix.siteDestinations,
      structuredImageCount: matrix.structuredImageCount,
    },
    separateOwners: separate,
    fonts,
    styleTokens,
    toolchain: ogToolchain(root),
    cards,
    glyphProbes: [...input.glyphProbes],
    corpusSha256,
  };
  return { manifest, failures };
}
