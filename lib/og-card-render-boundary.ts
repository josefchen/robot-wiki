/**
 * The one place a shipped Open Graph card is painted.
 *
 * Everything about this module is structural. `rendererSourceIdentity` in
 * lib/brand-v2-token-evidence.ts requires that no other module in the
 * renderer closure imports an image renderer, that the card generator does
 * not bind the seal opener or the artwork builders, and that the single
 * `new ImageResponse(...)` below receives the identifier the seal opener
 * returned, unwrapped and unreassigned. Together with the sealed corpus
 * handle — whose element tree is unreachable except through
 * `openSealedCardTree` — that makes the tree this renders the tree
 * `deriveRendererPaintedPopulation` measures, and keeps it so across an
 * evidence refresh: the check is re-derived from current source every time
 * the evidence is written or read, so no recorded fingerprint can absorb a
 * post-corpus transformation.
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

let cachedFonts: NonNullable<ImageResponseOptions['fonts']> | null = null;

/**
 * The vendored static faces, read once. The generator does not supply them:
 * it hands over the sealed entry and nothing else, so there is no argument
 * it could use to reach the element tree.
 */
function rendererFonts(
  root: string,
): NonNullable<ImageResponseOptions['fonts']> {
  if (cachedFonts) return cachedFonts;
  const fonts = OG_RENDERER_FACES.map((face) => ({
    name: face.family,
    data: readFileSync(join(root, face.path)),
    weight: face.weight,
    style: face.style,
  })) satisfies NonNullable<ImageResponseOptions['fonts']>;
  cachedFonts = fonts;
  return fonts;
}

export async function renderCorpusCard(
  entry: OgCardCorpusEntry,
  root: string,
): Promise<Buffer> {
  const options = {
    width: OG_CARD_WIDTH,
    height: OG_CARD_HEIGHT,
    fonts: rendererFonts(root),
  };
  const finalTree = openSealedCardTree(entry.card);
  const response = new ImageResponse(finalTree as never, options);
  return Buffer.from(await response.arrayBuffer());
}
