import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * What a registered first-party visual asset *is*, read out of its own bytes.
 *
 * **This module does not decide whether an asset may ship.** That is the
 * seal's job (`lib/brand-v2-asset-seal.ts`), and the two must not grow into
 * each other. The seal answers "did anybody approve these exact bytes"; this
 * module answers "what is this file", so a sealed asset's row can say
 * something concrete about it instead of restating its filename.
 *
 * It used to try to answer both, by recognising the drawn subject: an SVG
 * failed if its canvas was icon-shaped, or if it carried fewer than two
 * label runs, on the theory that a mark is small, square and silent while a
 * diagram is wide and names its parts. A scrutiny reviewer drew a wide,
 * labelled robot head and it passed. That is not a gap in two thresholds; it
 * is the general result that recognising a drawn subject is not decidable,
 * so those clauses are **deleted** rather than tightened. What remains here
 * are readings that either match a record against the file or fail to, which
 * a machine can settle:
 *
 * - **Vector and model containers are decoded completely.** SVG is XML, and
 *   a glTF binary carries its scene graph as a JSON chunk, so the element
 *   census, the label text, the node and mesh names and the embedded-image
 *   count are read out of the file, and a mesh is required to be one the
 *   shipped kinematic description builds its chain from.
 * - **Raster containers are not decoded past their header.** JPEG pixels
 *   need a decoder this repository does not carry, so the mechanism reads
 *   the frame header and stops. The content claim therefore rests on the
 *   registered external origin: a source URL, creator, licence and retrieval
 *   date, with the decoded frame size matching the registered one, so the
 *   record provably describes this file. A raster with no external origin is
 *   recorded as `undecidable` and **fails**, which is the fail-closed
 *   direction.
 *
 * The limitation that remains is named rather than papered over: within a
 * decoded model, mesh geometry is not classified, so the shape a mesh draws
 * is not read. That is exactly why the seal, and not this module, decides
 * what ships. The related pixel-decode gap for the generated Open Graph
 * cards is owned by `brand-v2-og-renderer-manifest-and-48-card-corpus` and
 * is deliberately not duplicated here.
 */
export const ASSET_CONTENT_LIMITATIONS = {
  raster:
    'JPEG, PNG, GIF and WebP pixels are not decoded; this verdict reads the frame header and rests the content claim on the registered external origin',
  model:
    'glTF mesh geometry is read as counts, names and accessor extents, not as shape: what a mesh draws is not classified',
  vector:
    'SVG path and shape geometry is read as an element census and label text, not as a picture: what a drawing depicts is not classified, and the sealed byte approval is what decides whether it may ship',
} as const;

export type AssetFormat =
  | 'svg'
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'glb'
  | 'urdf'
  | 'unknown';

export type VectorDecode = {
  kind: 'vector';
  viewBox: string | null;
  widthPx: number | null;
  heightPx: number | null;
  elementCensus: Record<string, number>;
  drawingPrimitives: number;
  textRuns: string[];
  accessibleLabel: string | null;
  /** `<image>` elements: raster payload this mechanism cannot read. */
  embeddedRasterCount: number;
  /** References leaving the file, which carry content it does not hold. */
  externalReferences: string[];
};

export type ModelDecode = {
  kind: 'model';
  gltfVersion: string | null;
  generator: string | null;
  nodeNames: string[];
  nodeCount: number;
  meshCount: number;
  materialCount: number;
  /** Textures embedded in the model, which are undecoded raster content. */
  embeddedImageCount: number;
};

export type KinematicDecode = {
  kind: 'kinematic-description';
  robotName: string | null;
  linkNames: string[];
  jointNames: string[];
  meshReferences: string[];
};

export type RasterDecode = {
  kind: 'raster';
  widthPx: number | null;
  heightPx: number | null;
  colourComponents: number | null;
  /** Always false. Stated in the record so the row cannot read as complete. */
  pixelsDecoded: false;
};

export type AssetDecode =
  | VectorDecode
  | ModelDecode
  | KinematicDecode
  | RasterDecode
  | { kind: 'undecoded' };

export type AssetProvenance = {
  sourceName: string;
  sourceUrl?: string;
  creator: string;
  licence: string;
  retrieved: string;
  width: number;
  height: number;
};

export type AssetContentVerdict = {
  id: string;
  path: string;
  category: string;
  byteCount: number;
  byteHash: string;
  declaredExtension: string;
  decodedFormat: AssetFormat;
  formatMatchesExtension: boolean;
  decode: AssetDecode;
  /** How the claim about this asset is supported. */
  basis: 'decoded-content' | 'external-provenance' | 'undecidable';
  /** What the mechanism established about this asset, in its own terms. */
  established: string[];
  /** What it did not establish, named. */
  limitations: string[];
  failures: string[];
};

const EXTENSION_FORMAT: Readonly<Record<string, AssetFormat>> = {
  '.svg': 'svg',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.gif': 'gif',
  '.webp': 'webp',
  '.glb': 'glb',
  '.urdf': 'urdf',
};

/**
 * The format the leading bytes declare, independent of the filename.
 *
 * This is what stops the extension from being the whole classification: a
 * `.jpg` whose bytes are an SVG monogram decodes as `svg` and fails on the
 * mismatch before any content clause runs.
 */
export function decodeFormat(bytes: Buffer): AssetFormat {
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === 'glTF') {
    return 'glb';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (bytes.length >= 6 && bytes.subarray(0, 4).toString('ascii') === 'GIF8') {
    return 'gif';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  // XML-rooted formats share a prolog, so they are told apart by their root
  // element rather than by the first four bytes.
  const head = bytes.subarray(0, 2048).toString('utf8');
  if (/<svg[\s>]/.test(head)) return 'svg';
  if (/<robot[\s>]/.test(head)) return 'urdf';
  return 'unknown';
}

const DRAWING_PRIMITIVES = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'use',
]);

export function decodeVector(text: string): VectorDecode {
  const elementCensus: Record<string, number> = {};
  for (const match of text.matchAll(/<([a-zA-Z][\w:-]*)/g)) {
    elementCensus[match[1]] = (elementCensus[match[1]] ?? 0) + 1;
  }
  const root = text.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const attribute = (name: string) =>
    root.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1] ?? null;
  const numeric = (value: string | null) => {
    if (value === null) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const textRuns = [
    ...text.matchAll(/<(text|title|desc)\b[^>]*>([\s\S]*?)<\/\1>/g),
  ]
    .map((match) => match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter((run) => run.length > 0);
  const externalReferences = [
    ...text.matchAll(/\b(?:xlink:href|href)\s*=\s*"([^"]*)"/g),
  ]
    .map((match) => match[1])
    .filter((value) => value.length > 0 && !value.startsWith('#'));
  return {
    kind: 'vector',
    viewBox: attribute('viewBox'),
    widthPx: numeric(attribute('width')),
    heightPx: numeric(attribute('height')),
    elementCensus,
    drawingPrimitives: Object.entries(elementCensus)
      .filter(([tag]) => DRAWING_PRIMITIVES.has(tag))
      .reduce((total, [, count]) => total + count, 0),
    textRuns: [...new Set(textRuns)],
    accessibleLabel: attribute('aria-label'),
    embeddedRasterCount: elementCensus.image ?? 0,
    externalReferences: [...new Set(externalReferences)],
  };
}

/**
 * The glTF scene graph out of a binary container.
 *
 * The format is a 12-byte header followed by length-prefixed chunks, the
 * first of which is the JSON document, so the whole node and mesh inventory
 * is readable without a library. Throws rather than guess on a container
 * whose header does not describe the file it is in, because a truncated or
 * mislabelled model is undecoded content wearing a decoded record.
 */
export function decodeModel(bytes: Buffer): ModelDecode {
  if (bytes.length < 20 || bytes.subarray(0, 4).toString('ascii') !== 'glTF') {
    throw new Error('not a glTF binary container');
  }
  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength !== bytes.length) {
    throw new Error(
      `glTF header declares ${declaredLength} bytes over a ${bytes.length}-byte file`,
    );
  }
  const chunkLength = bytes.readUInt32LE(12);
  if (bytes.subarray(16, 20).toString('ascii') !== 'JSON') {
    throw new Error('the first glTF chunk is not the JSON document');
  }
  if (20 + chunkLength > bytes.length) {
    throw new Error('the glTF JSON chunk runs past the end of the file');
  }
  const document = JSON.parse(
    bytes.subarray(20, 20 + chunkLength).toString('utf8'),
  ) as {
    asset?: { version?: string; generator?: string };
    nodes?: Array<{ name?: string }>;
    meshes?: unknown[];
    materials?: unknown[];
    images?: unknown[];
  };
  return {
    kind: 'model',
    gltfVersion: document.asset?.version ?? null,
    generator: document.asset?.generator ?? null,
    nodeNames: (document.nodes ?? [])
      .map(({ name }) => name)
      .filter((name): name is string => typeof name === 'string'),
    nodeCount: (document.nodes ?? []).length,
    meshCount: (document.meshes ?? []).length,
    materialCount: (document.materials ?? []).length,
    embeddedImageCount: (document.images ?? []).length,
  };
}

export function decodeKinematicDescription(text: string): KinematicDecode {
  const names = (element: string) =>
    [...text.matchAll(new RegExp(`<${element}\\b[^>]*\\bname="([^"]*)"`, 'g'))].map(
      (match) => match[1],
    );
  return {
    kind: 'kinematic-description',
    robotName: text.match(/<robot\b[^>]*\bname="([^"]*)"/)?.[1] ?? null,
    linkNames: names('link'),
    jointNames: names('joint'),
    meshReferences: [...text.matchAll(/\bfilename="([^"]*)"/g)].map(
      (match) => match[1],
    ),
  };
}

/**
 * Frame geometry out of a JPEG's start-of-frame marker.
 *
 * This is the whole of what the mechanism reads from a raster asset, and the
 * record says so: `pixelsDecoded` is a literal `false` rather than an
 * absence, so a reader of the evidence cannot mistake a header reading for a
 * content reading.
 */
export function decodeRaster(bytes: Buffer, format: AssetFormat): RasterDecode {
  const empty: RasterDecode = {
    kind: 'raster',
    widthPx: null,
    heightPx: null,
    colourComponents: null,
    pixelsDecoded: false,
  };
  if (format === 'png' && bytes.length >= 24) {
    return {
      ...empty,
      widthPx: bytes.readUInt32BE(16),
      heightPx: bytes.readUInt32BE(20),
    };
  }
  if (format !== 'jpeg') return empty;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    // SOF0-SOF15, excluding the four markers in that range that are not
    // frame headers (DHT, JPG, DAC, RST).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        ...empty,
        heightPx: bytes.readUInt16BE(offset + 5),
        widthPx: bytes.readUInt16BE(offset + 7),
        colourComponents: bytes[offset + 9],
      };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return empty;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Words that mark the surrounding code as an identity slot rather than content. */
const IDENTITY_SLOT_CONTEXT =
  /\b(icons?|favicon|apple-?touch|shortcut|manifest|lockup|wordmark|logo|mascot|monogram|brand-?mark|emblem)\b/i;

/** How much source either side of a reference is read as its context. */
const IDENTITY_SLOT_CONTEXT_RADIUS = 240;

/**
 * Occurrences of an asset inside an identity slot in one source file.
 *
 * A source that owns metadata or renders a lockup also renders ordinary
 * content, so the mere presence of a path in it settles nothing: the home
 * page names the shipped kinematic description in a comment explaining that
 * the playground preview is drawn from the real model. What matters is
 * whether the reference sits in an icon, manifest or lockup declaration, so
 * the surrounding source is read and returned with the failure, and a
 * reference in plain content context passes.
 */
export function identitySlotReferences(
  source: string,
  assetPath: string,
): string[] {
  const found: string[] = [];
  let index = source.indexOf(assetPath);
  while (index !== -1) {
    const context = source.slice(
      Math.max(0, index - IDENTITY_SLOT_CONTEXT_RADIUS),
      index + assetPath.length + IDENTITY_SLOT_CONTEXT_RADIUS,
    );
    const marker = context.match(IDENTITY_SLOT_CONTEXT);
    if (marker) {
      found.push(`"${marker[0]}" within ${IDENTITY_SLOT_CONTEXT_RADIUS} characters`);
    }
    index = source.indexOf(assetPath, index + assetPath.length);
  }
  return found;
}

export type AssetContentInput = {
  root: string;
  /** The registered first-party visual assets, from the census registry. */
  assets: ReadonlyArray<{
    id: string;
    path: string;
    category: string;
    byteHash: string;
    sourceRegistryId: string | null;
  }>;
  /** The image provenance registry, keyed by its own ids. */
  provenanceById: ReadonlyMap<string, AssetProvenance>;
  /**
   * Sources that own a metadata surface or render an identity lockup. An
   * asset wired into one of those is filling an identity slot whatever it
   * contains, so the role clause is checked against them per asset.
   */
  identitySourcePaths: readonly string[];
};

/**
 * One verdict per registered first-party visual asset.
 *
 * Every clause is about the asset in hand: its own bytes, its own decoded
 * content, its own registered origin, and its own reference sites. Nothing
 * is decided by a document-wide observation, which is what let twenty-one
 * members share one sentence, and nothing here is decided by what the file
 * appears to draw, which is what let a labelled robot head through.
 */
export function assetContentVerdicts(
  input: AssetContentInput,
): AssetContentVerdict[] {
  if (input.assets.length === 0) {
    throw new Error(
      'no first-party visual asset was supplied: VAL-B2-ID-006 would quantify over nothing',
    );
  }
  // Derived from the population rather than named: the description is the
  // one registered asset that is a kinematic chain, and a second one would
  // make "the chain a model belongs to" ambiguous rather than wrong.
  const descriptions = input.assets.filter(({ path }) =>
    path.toLowerCase().endsWith('.urdf'),
  );
  if (descriptions.length !== 1) {
    throw new Error(
      `${descriptions.length} registered assets are kinematic descriptions; the playground models are tied to exactly one`,
    );
  }
  const modelDescriptionPath = descriptions[0].path;
  const modelRoot = modelDescriptionPath.slice(
    0,
    modelDescriptionPath.lastIndexOf('/') + 1,
  );
  const descriptionPath = join(input.root, 'public', modelDescriptionPath);
  if (!existsSync(descriptionPath)) {
    throw new Error(
      `${modelDescriptionPath} is not shipped, so no playground model can be tied to the chain it belongs to`,
    );
  }
  const shippedDescription = decodeKinematicDescription(
    readFileSync(descriptionPath, 'utf8'),
  );
  const identitySources = new Map(
    input.identitySourcePaths.map((path) => [
      path,
      existsSync(join(input.root, path))
        ? readFileSync(join(input.root, path), 'utf8')
        : null,
    ]),
  );
  for (const [path, text] of identitySources) {
    if (text === null) {
      throw new Error(
        `${path} is registered as an identity-bearing source but is not readable, so the asset role clause would silently pass`,
      );
    }
  }

  return input.assets.map((asset) => {
    const absolute = join(input.root, 'public', asset.path);
    const bytes = readFileSync(absolute);
    const declaredExtension = extname(asset.path).toLowerCase();
    const decodedFormat = decodeFormat(bytes);
    const expected = EXTENSION_FORMAT[declaredExtension] ?? 'unknown';
    const failures: string[] = [];
    const established: string[] = [];
    const limitations: string[] = [];

    const byteHash = sha256(bytes);
    if (byteHash !== asset.byteHash) {
      failures.push(
        `${asset.path} hashes to ${byteHash.slice(0, 12)} but is registered as ${asset.byteHash.slice(0, 12)}, so the registry describes different bytes`,
      );
    }
    const formatMatchesExtension =
      decodedFormat !== 'unknown' && decodedFormat === expected;
    if (decodedFormat === 'unknown') {
      failures.push(
        `${asset.path} carries no recognised container signature, so its content cannot be read at all`,
      );
    } else if (!formatMatchesExtension) {
      failures.push(
        `${asset.path} is a ${decodedFormat} file behind a ${declaredExtension} name, so its filename describes something it is not`,
      );
    }
    const identityReferences: string[] = [];
    for (const [path, text] of identitySources) {
      for (const slot of identitySlotReferences(text as string, asset.path)) {
        identityReferences.push(`${path}: ${slot}`);
      }
    }
    if (identityReferences.length > 0) {
      failures.push(
        `${asset.path} is wired into an identity slot by ${identityReferences.join('; ')}`,
      );
    }

    let decode: AssetDecode = { kind: 'undecoded' };
    let basis: AssetContentVerdict['basis'] = 'undecidable';

    if (decodedFormat === 'svg') {
      basis = 'decoded-content';
      const vector = decodeVector(bytes.toString('utf8'));
      decode = vector;
      if (vector.embeddedRasterCount > 0) {
        failures.push(
          `${asset.path} embeds ${vector.embeddedRasterCount} raster image(s), which this mechanism does not decode, so what it draws is unread`,
        );
      }
      if (vector.externalReferences.length > 0) {
        failures.push(
          `${asset.path} references ${vector.externalReferences.join(', ')} outside itself, so its content is not in the file that was read`,
        );
      }
      established.push(
        `decoded ${vector.drawingPrimitives} drawing primitive(s) and ${vector.textRuns.length} label run(s) on a ${vector.widthPx}x${vector.heightPx} canvas, with ${vector.embeddedRasterCount} embedded raster payload(s)`,
      );
      limitations.push(ASSET_CONTENT_LIMITATIONS.vector);
    } else if (decodedFormat === 'glb') {
      basis = 'decoded-content';
      const model = decodeModel(bytes);
      decode = model;
      const reference = asset.path.startsWith(modelRoot)
        ? asset.path.slice(modelRoot.length)
        : asset.path;
      if (!shippedDescription.meshReferences.includes(reference)) {
        failures.push(
          `${asset.path} is not one of the ${shippedDescription.meshReferences.length} meshes ${modelDescriptionPath} builds its chain from, so nothing in the product says what it is`,
        );
      }
      if (model.embeddedImageCount > 0) {
        failures.push(
          `${asset.path} embeds ${model.embeddedImageCount} texture image(s), which this mechanism does not decode`,
        );
      }
      established.push(
        `decoded a glTF ${model.gltfVersion} scene of ${model.nodeCount} node(s) named ${model.nodeNames.join(', ') || 'nothing'}, ${model.meshCount} mesh(es) and ${model.materialCount} material(s) with ${model.embeddedImageCount} embedded texture(s), referenced by ${modelDescriptionPath} as ${reference}`,
      );
      limitations.push(ASSET_CONTENT_LIMITATIONS.model);
    } else if (decodedFormat === 'urdf') {
      basis = 'decoded-content';
      const kinematic = decodeKinematicDescription(bytes.toString('utf8'));
      decode = kinematic;
      if (kinematic.linkNames.length === 0 || kinematic.jointNames.length === 0) {
        failures.push(
          `${asset.path} declares ${kinematic.linkNames.length} link(s) and ${kinematic.jointNames.length} joint(s), so it describes no kinematic chain`,
        );
      }
      established.push(
        `decoded the kinematic description of ${kinematic.robotName ?? 'an unnamed robot'}: ${kinematic.linkNames.length} link(s), ${kinematic.jointNames.length} joint(s) and ${kinematic.meshReferences.length} mesh reference(s)`,
      );
    } else if (decodedFormat !== 'unknown') {
      const raster = decodeRaster(bytes, decodedFormat);
      decode = raster;
      limitations.push(ASSET_CONTENT_LIMITATIONS.raster);
      const provenance = asset.sourceRegistryId
        ? input.provenanceById.get(asset.sourceRegistryId)
        : undefined;
      const externalOrigin =
        provenance && typeof provenance.sourceUrl === 'string'
          ? provenance.sourceUrl.trim()
          : '';
      if (externalOrigin.length === 0) {
        basis = 'undecidable';
        failures.push(
          `${asset.path} is a ${decodedFormat} asset with no registered external origin, and its pixels are not decoded, so nothing establishes whether it is a first-party symbol`,
        );
      } else {
        basis = 'external-provenance';
        if (
          provenance!.creator.trim().length === 0 ||
          provenance!.licence.trim().length === 0 ||
          provenance!.retrieved.trim().length === 0
        ) {
          failures.push(
            `${asset.path} has an incomplete origin record (creator "${provenance!.creator}", licence "${provenance!.licence}", retrieved "${provenance!.retrieved}")`,
          );
        }
        if (
          raster.widthPx !== provenance!.width ||
          raster.heightPx !== provenance!.height
        ) {
          failures.push(
            `${asset.path} decodes to ${raster.widthPx}x${raster.heightPx} while its origin record describes ${provenance!.width}x${provenance!.height}, so the record is about a different file`,
          );
        }
        established.push(
          `decoded a ${raster.widthPx}x${raster.heightPx} ${decodedFormat} frame matching the registered original retrieved ${provenance!.retrieved} from ${externalOrigin} by ${provenance!.creator}, so this repository did not author it`,
        );
      }
    }

    return {
      id: asset.id,
      path: asset.path,
      category: asset.category,
      byteCount: bytes.length,
      byteHash,
      declaredExtension,
      decodedFormat,
      formatMatchesExtension,
      decode,
      basis,
      established,
      limitations,
      failures,
    };
  });
}
