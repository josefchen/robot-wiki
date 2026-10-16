/**
 * Rendered glyph probes for every string the Open Graph corpus assigns to a
 * renderer face (VAL-B2-OG-012, VAL-B2-TYPE-017).
 *
 * A cmap lookup says a face *has* a glyph. It does not say the renderer
 * *used* it: satori walks the registered faces per glyph, so a code point
 * Tektur lacks would quietly paint in IBM Plex Mono, and one missing from
 * every face would make the bundled renderer ask the network for a
 * substitute. Each probe therefore paints its string twice through the
 * shipped render boundary — once with only the string's own face
 * registered, once with the production face set — and requires the two
 * PNGs to be byte-identical. Any glyph served by another face changes the
 * production render; any glyph served by no face makes the narrowed render
 * request a remote font, which the boundary refuses and reports. OCR plays
 * no part.
 */
import { createHash } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import { openSync, type LayoutFont } from 'fontkit';
import { TEKTUR_ASSIGNED_STRINGS } from '../data/type-roles.ts';
import { cardTextRuns } from './og-card-artwork.ts';
import {
  openSealedCardTree,
  sealGlyphProbe,
  type OgCardCorpusEntry,
} from './og-card-corpus.ts';
import { renderCorpusCard } from './og-card-render-boundary.ts';
import {
  OG_DISPLAY_STACK,
  OG_RENDERER_FACES,
  ogRendererFaceForStack,
  type OgRendererFace,
} from './og-renderer-fonts.ts';
import { sanitizeCardText } from './og-cards.ts';

export type GlyphProbeResult = {
  probeId: string;
  faceId: string;
  family: string;
  text: string;
  /** Where the string is assigned: painted by a card, or an OG type-role string. */
  assignedBy: string[];
  codePointCount: number;
  /** Code points the face's cmap does not map, as `U+XXXX`. */
  cmapMissing: string[];
  canvas: { width: number; height: number };
  /** The render with only this face registered. */
  ownFaceSha256: string | null;
  /** The render with the production face set registered. */
  productionSha256: string | null;
  fallbackFree: boolean;
  failure?: string;
};

const PROBE_FONT_SIZE = 32;
const PROBE_WIDTH = 1200;
const PROBE_PADDING = 16;

function digest(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function codePointLabel(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Every (face, string) pair the corpus paints, plus the type-role strings
 * assigned to the OG target, deduplicated and in a stable order.
 */
export function glyphProbePopulation(
  corpus: readonly OgCardCorpusEntry[],
): Array<{ face: OgRendererFace; text: string; assignedBy: string[] }> {
  const pairs = new Map<string, { face: OgRendererFace; text: string; assignedBy: Set<string> }>();
  const add = (face: OgRendererFace, text: string, by: string): void => {
    const key = `${face.faceId}\u0000${text}`;
    const entry = pairs.get(key) ?? { face, text, assignedBy: new Set<string>() };
    entry.assignedBy.add(by);
    pairs.set(key, entry);
  };
  for (const { cardId, card } of corpus) {
    for (const run of cardTextRuns(openSealedCardTree(card))) {
      const face = ogRendererFaceForStack(run.family);
      if (!face) {
        throw new Error(`${cardId} paints "${run.text}" in unregistered stack ${run.family}`);
      }
      add(face, run.text, `card:${cardId}`);
    }
  }
  const display = ogRendererFaceForStack(OG_DISPLAY_STACK) as OgRendererFace;
  for (const assigned of TEKTUR_ASSIGNED_STRINGS) {
    if (!assigned.targets.includes('og')) continue;
    // The cards paint sanitized text, so the probe paints what a card would.
    add(display, sanitizeCardText(assigned.text), `type-role:${assigned.id}`);
  }
  return [...pairs.values()]
    .map(({ face, text, assignedBy }) => ({ face, text, assignedBy: [...assignedBy].sort() }))
    .sort((left, right) =>
      left.face.faceId === right.face.faceId
        ? left.text < right.text
          ? -1
          : left.text > right.text
            ? 1
            : 0
        : left.face.faceId.localeCompare(right.face.faceId),
    );
}

export type GlyphProbeRun = {
  results: GlyphProbeResult[];
  failures: string[];
};

export async function runGlyphProbes(input: {
  root: string;
  corpus: readonly OgCardCorpusEntry[];
}): Promise<GlyphProbeRun> {
  const fonts = new Map<string, LayoutFont>();
  for (const face of OG_RENDERER_FACES) {
    fonts.set(face.faceId, openSync(isAbsolute(face.path) ? face.path : join(input.root, face.path)) as LayoutFont);
  }
  const productionFaceIds = OG_RENDERER_FACES.map(({ faceId }) => faceId);
  const population = glyphProbePopulation(input.corpus);
  if (population.length === 0) {
    return { results: [], failures: ['the glyph-probe population is empty'] };
  }
  const results: GlyphProbeResult[] = [];
  const failures: string[] = [];
  for (const { face, text, assignedBy } of population) {
    const font = fonts.get(face.faceId) as LayoutFont;
    const codePoints = [...text].map((character) => character.codePointAt(0) as number);
    const cmapMissing = [...new Set(codePoints)]
      .filter((codePoint) => !font.hasGlyphForCodePoint(codePoint))
      .map(codePointLabel);
    // Enough lines that every glyph lands inside the canvas: a glyph laid
    // out past the bottom edge would be painted by neither render.
    const advance = (font.layout(text).advanceWidth / font.unitsPerEm) * PROBE_FONT_SIZE;
    const lines = Math.ceil(advance / (PROBE_WIDTH - 4 * PROBE_PADDING)) + 1;
    const canvas = {
      width: PROBE_WIDTH,
      height: 2 * PROBE_PADDING + Math.ceil(lines * PROBE_FONT_SIZE * 1.2),
    };
    const probeId = `probe:${face.faceId}:${digest(text).slice(0, 16)}`;
    const probe = sealGlyphProbe({
      probeId,
      text,
      stack: face.stack,
      fontSize: PROBE_FONT_SIZE,
    });
    let ownFaceSha256: string | null = null;
    let productionSha256: string | null = null;
    let failure: string | undefined;
    try {
      ownFaceSha256 = digest(
        await renderCorpusCard(probe, input.root, canvas, { faceIds: [face.faceId] }),
      );
      productionSha256 = digest(
        await renderCorpusCard(probe, input.root, canvas, { faceIds: productionFaceIds }),
      );
      if (ownFaceSha256 !== productionSha256) {
        failure = `"${text}" renders differently once the other registered faces are available, so a glyph falls back from ${face.family}`;
      }
    } catch (error) {
      failure = `"${text}" could not be painted from ${face.family} alone: ${(error as Error).message}`;
    }
    if (cmapMissing.length > 0) {
      failure = `${face.faceId}: cmap misses ${cmapMissing.join(', ')} in "${text}"${failure ? `; ${failure}` : ''}`;
    }
    if (failure) failures.push(`${probeId}: ${failure}`);
    results.push({
      probeId,
      faceId: face.faceId,
      family: face.family,
      text,
      assignedBy,
      codePointCount: codePoints.length,
      cmapMissing,
      canvas,
      ownFaceSha256,
      productionSha256,
      fallbackFree: failure === undefined,
      ...(failure ? { failure } : {}),
    });
  }
  return { results, failures };
}
