/**
 * The one place a shipped Open Graph card is painted.
 *
 * Everything about this module is structural. `rendererSourceIdentity` in
 * lib/brand-v2-token-evidence.ts requires that no other module in the
 * renderer closure can obtain an image renderer — by import or by
 * re-export — that the card generator does not bind the seal opener or the
 * artwork builders, and that the single
 * `new ImageResponse(...)` below receives the identifier the seal opener
 * returned, unwrapped and unreassigned. Together with the sealed corpus
 * handle — whose element tree is unreachable except through
 * `openSealedCardTree` — that makes the tree this renders the tree
 * `deriveRendererPaintedPopulation` measures, and keeps it so across an
 * evidence refresh: the check is re-derived from current source every time
 * the evidence is written or read, so no recorded fingerprint can absorb a
 * post-corpus transformation. lib/og-card-emitted-bytes.ts then requires
 * the cards on disk to be exactly what this function returns.
 *
 * The renderer is offline by construction. The bundled @vercel/og asks the
 * network for a substitute font whenever a glyph is missing from every
 * registered face, which would make a card depend on a third-party
 * response and silently paint a fallback glyph. Every render here runs with
 * outbound requests refused and fails if the renderer attempted one, so a
 * cmap gap fails generation instead of shipping. Only `data:` URLs, which
 * the bundle uses to instantiate its own WebAssembly, are let through.
 *
 * ImageResponse's bundled typings expect a ReactElement; the node build
 * accepts the same plain satori element trees our CardNode type describes.
 * Cast at the boundary rather than loosening CardNode.
 */
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';
import type { ImageResponseOptions } from 'next/dist/compiled/@vercel/og/index.node.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openSealedCardTree, type OgCardCorpusEntry } from './og-card-corpus.ts';
import { OG_CARD_HEIGHT, OG_CARD_WIDTH } from './og-cards.ts';
import { OG_RENDERER_FACES } from './og-renderer-fonts.ts';

type RendererFont = NonNullable<ImageResponseOptions['fonts']>[number];

const cachedFonts = new Map<string, RendererFont>();

/**
 * The vendored static faces, read once. The generator does not supply them:
 * it hands over the sealed entry and nothing else, so there is no argument
 * it could use to reach the element tree. A glyph probe may narrow the set
 * to named registered faces; it can never add one.
 */
function rendererFonts(
  root: string,
  faceIds?: readonly string[],
): NonNullable<ImageResponseOptions['fonts']> {
  const faces =
    faceIds === undefined
      ? OG_RENDERER_FACES
      : OG_RENDERER_FACES.filter(({ faceId }) => faceIds.includes(faceId));
  if (faces.length === 0 || (faceIds !== undefined && faces.length !== faceIds.length)) {
    throw new Error(
      `The render boundary registers only known faces; ${String(faceIds)} names none or an unknown one`,
    );
  }
  return faces.map((face) => {
    const cached = cachedFonts.get(face.faceId);
    if (cached) return cached;
    const font = {
      name: face.family,
      data: readFileSync(join(root, face.path)),
      weight: face.weight,
      style: face.style,
    } satisfies RendererFont;
    cachedFonts.set(face.faceId, font);
    return font;
  });
}

/** Outbound requests the renderer attempted during the current render. */
let refusedRequests: string[] = [];
let rendering = false;

/**
 * Runs one render with outbound requests refused. Renders are sequential:
 * the guard replaces the process-wide `fetch`, so an overlapping render
 * could restore it early or collect another card's requests.
 */
async function withoutNetwork<T>(render: () => Promise<T>): Promise<T> {
  if (rendering) {
    throw new Error('The render boundary paints one card at a time');
  }
  rendering = true;
  const original = globalThis.fetch;
  refusedRequests = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('data:')) return original(input, init);
    refusedRequests.push(url);
    throw new Error(`The Open Graph renderer is offline; refused ${url}`);
  }) as typeof fetch;
  try {
    const result = await render();
    if (refusedRequests.length > 0) {
      throw new Error(
        `The renderer requested ${refusedRequests.length} remote asset(s) (${refusedRequests.join(', ')}), so a glyph is missing from every registered face`,
      );
    }
    return result;
  } finally {
    globalThis.fetch = original;
    rendering = false;
  }
}

export async function renderCorpusCard(
  entry: Pick<OgCardCorpusEntry, 'card'>,
  root: string,
  dimensions?: { width: number; height: number },
  registration?: { faceIds: readonly string[] },
): Promise<Buffer> {
  const options = {
    width: dimensions?.width ?? OG_CARD_WIDTH,
    height: dimensions?.height ?? OG_CARD_HEIGHT,
    fonts: rendererFonts(root, registration?.faceIds),
  };
  const finalTree = openSealedCardTree(entry.card);
  return withoutNetwork(async () => {
    const response = new ImageResponse(finalTree as never, options);
    return Buffer.from(await response.arrayBuffer());
  });
}
