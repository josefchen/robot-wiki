/**
 * Registration and parity checks for the Open Graph renderer's font faces
 * (VAL-B2-TYPE-001, VAL-B2-TYPE-011 through 014).
 *
 * The text population is walked out of the element trees the generator
 * renders, so a family painted by the artwork but never registered with the
 * renderer, or registered under a scoped exception family such as
 * KaTeX_Typewriter, fails here rather than shipping inside 48 cards.
 */
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import { publishedModules } from '../data/modules.ts';
import { FIRST_PARTY_TYPE_ROLES } from '../data/type-roles.ts';
import { sha256 } from './brand-v2-baseline.ts';
import { cardTextRuns, type CardTextRun } from './og-card-artwork.ts';
import { ogCardCorpus, type OgCardCorpusEntry } from './og-card-corpus.ts';
import {
  OG_RENDERER_FACES,
  primaryFamily,
  type OgRendererFace,
} from './og-renderer-fonts.ts';

export type OgRendererFontReport = {
  ok: boolean;
  failures: string[];
  faceCount: number;
  cardCount: number;
  textRunCount: number;
  familiesPainted: string[];
  codePointCount: number;
};

export type InspectOgRendererFontsOptions = {
  root?: string;
  faces?: readonly OgRendererFace[];
  /** Overrides the painted population; used by the mutation gates. */
  textRuns?: readonly CardTextRun[];
  openFont?: (path: string) => Font;
};

const EXCEPTION_FAMILY = /^KaTeX/i;

function resolve(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

function textRunsOf(corpus: readonly OgCardCorpusEntry[]): CardTextRun[] {
  return corpus.flatMap(({ card }) => cardTextRuns(card));
}

/** Every text run the shipped card corpus paints, with its resolved stack. */
export function ogCardTextRuns(root: string): CardTextRun[] {
  return textRunsOf(ogCardCorpus(root));
}

function inspectFace(
  root: string,
  face: OgRendererFace,
  openFont: (path: string) => Font,
  failures: string[],
): Font | null {
  if (EXCEPTION_FAMILY.test(face.family)) {
    failures.push(
      `${face.faceId}: ${face.family} is a scoped exception family and must never serve a first-party role`,
    );
  }
  const role = FIRST_PARTY_TYPE_ROLES.find(({ id }) => id === face.roleId);
  if (!role) {
    failures.push(`${face.faceId}: role ${face.roleId} is not first-party`);
  } else if (
    role.family !== face.family &&
    role.family !== `${face.family} Variable`
  ) {
    failures.push(
      `${face.faceId}: family ${face.family} does not serve the ${face.roleId} role family ${role.family}`,
    );
  }

  const path = resolve(root, face.path);
  let font: Font;
  try {
    font = openFont(path);
  } catch (error) {
    failures.push(
      `${face.faceId}: binary unreadable: ${(error as Error).message}`,
    );
    return null;
  }
  if (sha256(readFileSync(path)) !== face.sha256) {
    failures.push(`${face.faceId}: SHA-256 does not match metadata`);
  }
  if (font.type !== 'TTF') {
    failures.push(`${face.faceId}: expected a static TTF, received ${font.type}`);
  }
  const axes = Object.keys(font.variationAxes);
  if (axes.length > 0) {
    failures.push(
      `${face.faceId}: renderer face must be static, received axes ${axes.join(',')}`,
    );
  }
  if (!font.fullName.startsWith(face.family)) {
    failures.push(
      `${face.faceId}: family mismatch: expected ${face.family}, received ${font.fullName}`,
    );
  }
  const weightClass = font['OS/2']?.usWeightClass;
  if (weightClass !== face.weight) {
    failures.push(
      `${face.faceId}: weight mismatch: expected ${face.weight}, received ${String(weightClass)}`,
    );
  }
  const license = readFileSync(resolve(root, face.licensePath), 'utf8');
  if (!license.includes('SIL OPEN FONT LICENSE Version 1.1')) {
    failures.push(`${face.faceId}: OFL 1.1 license text is missing`);
  }
  return font;
}

export function inspectOgRendererFonts(
  options: InspectOgRendererFontsOptions = {},
): OgRendererFontReport {
  const root = options.root ?? process.cwd();
  const faces = options.faces ?? OG_RENDERER_FACES;
  const openFont = options.openFont ?? openSync;
  const failures: string[] = [];

  if (faces.length === 0) {
    return {
      ok: false,
      failures: ['no OG renderer face is registered'],
      faceCount: 0,
      cardCount: 0,
      textRunCount: 0,
      familiesPainted: [],
      codePointCount: 0,
    };
  }

  const fonts = new Map<string, Font>();
  for (const face of faces) {
    if (fonts.has(face.family)) {
      failures.push(`${face.faceId}: family ${face.family} is registered twice`);
    }
    const font = inspectFace(root, face, openFont, failures);
    if (font) fonts.set(face.family, font);
  }

  let runs: readonly CardTextRun[];
  let cardCount = 0;
  if (options.textRuns) {
    runs = options.textRuns;
  } else {
    const corpus = ogCardCorpus(root);
    runs = textRunsOf(corpus);
    cardCount = corpus.length;
    // The count used to be taken from the registry while the runs came from
    // the corpus, so a corpus that walked three cards still reported the
    // registry's total. Both sources are independent, so they are compared.
    const published = publishedModules().length + 1;
    if (cardCount !== published) {
      failures.push(
        `the card corpus holds ${cardCount} cards; the module registry publishes ${published}`,
      );
    }
  }
  if (runs.length === 0) {
    failures.push('the card corpus painted no text run');
  }

  const codePoints = new Set<number>();
  const familiesPainted = new Set<string>();
  for (const run of runs) {
    const family = primaryFamily(run.family);
    familiesPainted.add(family);
    const face = faces.find((entry) => entry.family === family);
    if (!face) {
      failures.push(
        `unregistered renderer family ${family || '(none)'} paints "${run.text}"`,
      );
      continue;
    }
    const font = fonts.get(face.family);
    for (const character of run.text) {
      const codePoint = character.codePointAt(0) ?? 0;
      codePoints.add(codePoint);
      if (font && !font.hasGlyphForCodePoint(codePoint)) {
        failures.push(
          `${face.faceId}: cmap missing U+${codePoint
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')} used by "${run.text}"`,
        );
      }
    }
  }

  // Every registered face has to be doing work: an unpainted face is an
  // unproven registration, and a role with no painted run means the card
  // corpus silently stopped using it.
  for (const face of faces) {
    if (!familiesPainted.has(face.family)) {
      failures.push(`${face.faceId}: registered but paints no card text`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    faceCount: faces.length,
    cardCount,
    textRunCount: runs.length,
    familiesPainted: [...familiesPainted].sort(),
    codePointCount: codePoints.size,
  };
}
