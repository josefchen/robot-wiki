/**
 * Decoded-pixel checks for the shipped Open Graph cards.
 *
 * The element-tree evidence measures what the artwork asks the renderer to
 * paint; these checks read what the renderer actually wrote. Each card PNG
 * is decoded with the checked-in decoder (lib/png-decode.ts) and held to
 * two predicates:
 *
 * - **Palette.** Every pixel is opaque and lies, within a declared
 *   tolerance, on a straight blend between two colours the card's tree
 *   paints. Anti-aliased glyph and rule edges are such blends; an old v1
 *   blue, a lime fill, a fallback colour or a gradient is not.
 * - **Anchors.** The registered devices sit on their registered geometry:
 *   the rails at 48px from each edge, a signal-blue cross centred on each
 *   rail intersection and ending where the rail resumes, plain paper inside
 *   the frame where no text can reach, and the section rules meeting both
 *   rails, each checked at the exact pixel rather than within a band.
 *
 * Text is not read back; the manifest proves the strings. What is checked
 * here is that ink was painted where the title and the wordmark sit.
 */
import { BRAND_COLORS } from './brand-v2-tokens.ts';
import {
  OG_BAND_HEIGHT_PX,
  OG_CROSS_SPAN_PX,
  OG_FRAME_INSET_PX,
  OG_TEXT_INSET_PX,
  type OgCardKind,
} from './og-card-artwork.ts';
import { decodePng, pixelAt, type DecodedPng } from './png-decode.ts';

/** Largest RGB distance from a two-colour blend that still counts as on-palette. */
export const OG_PIXEL_TOLERANCE = 3;

type Rgb = [number, number, number];

function rgbOf(hex: string): Rgb {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
}

function distanceToSegment(point: Rgb, from: Rgb, to: Rgb): number {
  const direction = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const lengthSquared = direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2;
  let t = 0;
  if (lengthSquared > 0) {
    t =
      ((point[0] - from[0]) * direction[0] +
        (point[1] - from[1]) * direction[1] +
        (point[2] - from[2]) * direction[2]) /
      lengthSquared;
    t = Math.max(0, Math.min(1, t));
  }
  return Math.hypot(
    point[0] - (from[0] + t * direction[0]),
    point[1] - (from[1] + t * direction[1]),
    point[2] - (from[2] + t * direction[2]),
  );
}

export type CardPixelReport = {
  width: number;
  height: number;
  pixelCount: number;
  translucentPixels: number;
  offPalettePixels: number;
  /** Up to five off-palette samples, `x,y #RRGGBB`. */
  offPaletteSamples: string[];
  maxPaletteDistance: number;
  anchors: Array<{ anchor: string; x: number; y: number; expected: string; actual: string; ok: boolean }>;
  inkPixels: Record<string, number>;
  failures: string[];
};

function hexOf([red, green, blue]: readonly number[]): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function countNear(
  image: DecodedPng,
  target: Rgb,
  box: { left: number; top: number; right: number; bottom: number },
  within = 24,
): number {
  let count = 0;
  const limit = within * within;
  for (let y = box.top; y < box.bottom; y += 1) {
    for (let x = box.left; x < box.right; x += 1) {
      const at = (y * image.width + x) * 4;
      const red = image.rgba[at] - target[0];
      const green = image.rgba[at + 1] - target[1];
      const blue = image.rgba[at + 2] - target[2];
      if (red * red + green * green + blue * blue <= limit) count += 1;
    }
  }
  return count;
}

export function inspectCardPixels(input: {
  png: Uint8Array;
  kind: OgCardKind;
  /** The token hexes the card's tree paints. */
  paintedHexes: readonly string[];
  tolerance?: number;
}): CardPixelReport {
  const image = decodePng(input.png);
  const tolerance = input.tolerance ?? OG_PIXEL_TOLERANCE;
  const failures: string[] = [];
  const palette = [...new Set(input.paintedHexes.map((hex) => hex.toUpperCase()))].map(rgbOf);
  if (palette.length < 2) failures.push('the card paints fewer than two colours');
  const segments: Array<[Rgb, Rgb]> = [];
  for (let i = 0; i < palette.length; i += 1) {
    for (let j = i; j < palette.length; j += 1) segments.push([palette[i], palette[j]]);
  }

  const memo = new Map<number, number>();
  let translucent = 0;
  let offPalette = 0;
  let maxDistance = 0;
  const samples: string[] = [];
  let lastKey = -1;
  let lastDistance = 0;
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    const at = pixel * 4;
    if (image.rgba[at + 3] !== 255) translucent += 1;
    const key = (image.rgba[at] << 16) | (image.rgba[at + 1] << 8) | image.rgba[at + 2];
    // Most of a card is long runs of one flat colour.
    let distance = key === lastKey ? lastDistance : memo.get(key);
    if (distance === undefined) {
      const point: Rgb = [image.rgba[at], image.rgba[at + 1], image.rgba[at + 2]];
      distance = Math.min(...segments.map(([from, to]) => distanceToSegment(point, from, to)));
      memo.set(key, distance);
    }
    lastKey = key;
    lastDistance = distance;
    if (distance > maxDistance) maxDistance = distance;
    if (distance > tolerance) {
      offPalette += 1;
      if (samples.length < 5) {
        samples.push(`${pixel % image.width},${Math.floor(pixel / image.width)} ${hexOf([image.rgba[at], image.rgba[at + 1], image.rgba[at + 2]])}`);
      }
    }
  }
  if (translucent > 0) failures.push(`${translucent} pixels are not opaque`);
  if (offPalette > 0) {
    failures.push(`${offPalette} pixels lie off the painted palette by more than ${tolerance} (${samples.join('; ')})`);
  }

  const W = image.width;
  const H = image.height;
  const inset = OG_FRAME_INSET_PX;
  const far = { x: W - 1 - inset, y: H - 1 - inset };
  const arm = (OG_CROSS_SPAN_PX - 1) / 2;
  const contentTop = inset + 1;
  const bodyTop = input.kind === 'article' ? contentTop + OG_BAND_HEIGHT_PX : contentTop;
  const bodyBottom = input.kind === 'article' ? far.y - OG_BAND_HEIGHT_PX : far.y;
  // The text stops one text inset short of the right rail.
  const textRight = far.x - OG_TEXT_INSET_PX;
  const { paper, concrete, signal } = BRAND_COLORS;
  const anchors: CardPixelReport['anchors'] = [];
  const expect = (anchor: string, x: number, y: number, expected: string): void => {
    const actual = hexOf(pixelAt(image, x, y));
    anchors.push({ anchor, x, y, expected, actual, ok: actual === expected });
  };
  expect('ground outside the frame', inset / 2, inset / 2, paper);
  expect('left outer rail', inset, inset / 2, concrete);
  expect('right outer rail', far.x, inset / 2, concrete);
  expect('top outer rail', inset / 2, inset, concrete);
  expect('bottom outer rail', inset / 2, far.y, concrete);
  for (const [corner, cx, cy] of [
    ['top-left', inset, inset],
    ['top-right', far.x, inset],
    ['bottom-left', inset, far.y],
    ['bottom-right', far.x, far.y],
  ] as const) {
    expect(`${corner} cross centre`, cx, cy, signal);
    expect(`${corner} cross horizontal arm end`, cx - arm, cy, signal);
    expect(`${corner} rail resumes past the arm`, cx - arm - 1, cy, concrete);
    expect(`${corner} cross vertical arm end`, cx, cy + arm, signal);
    expect(`${corner} rail resumes past the vertical arm`, cx, cy + arm + 1, concrete);
  }
  const middleY = Math.floor((bodyTop + bodyBottom) / 2);
  const textLeft = inset + 1 + OG_TEXT_INSET_PX;
  expect('top rail is one pixel thick', textLeft, contentTop, paper);
  expect('left rail is one pixel thick', inset + 1, middleY, paper);
  expect('paper inside the left text inset', inset + 1 + OG_TEXT_INSET_PX / 2, middleY, paper);
  expect('paper inside the right text inset', textRight + OG_TEXT_INSET_PX / 2, middleY, paper);
  if (input.kind === 'article') {
    const headerRuleY = contentTop + OG_BAND_HEIGHT_PX - 1;
    const footerRuleY = far.y - OG_BAND_HEIGHT_PX;
    expect('header section rule', textRight, headerRuleY, concrete);
    expect('header section rule meets the left rail', inset + 1, headerRuleY, concrete);
    expect('header section rule meets the right rail', far.x - 1, headerRuleY, concrete);
    expect('footer section rule', textRight, footerRuleY, concrete);
    expect('footer section rule meets the left rail', inset + 1, footerRuleY, concrete);
    expect('footer section rule meets the right rail', far.x - 1, footerRuleY, concrete);
  }
  for (const anchor of anchors) {
    if (!anchor.ok) {
      failures.push(`${anchor.anchor} at (${anchor.x}, ${anchor.y}) is ${anchor.actual}, expected ${anchor.expected}`);
    }
  }

  const ink = rgbOf(BRAND_COLORS.ink);
  const inkPixels: Record<string, number> =
    input.kind === 'article'
      ? {
          title: countNear(image, ink, {
            left: textLeft,
            top: bodyTop,
            right: textRight,
            bottom: bodyBottom,
          }),
          identity: countNear(image, ink, {
            left: textLeft,
            top: far.y - OG_BAND_HEIGHT_PX + 1,
            right: Math.floor(W / 2),
            bottom: far.y,
          }),
        }
      : {
          identity: countNear(image, ink, { left: textLeft, top: bodyTop, right: textRight, bottom: bodyBottom }),
        };
  for (const [region, count] of Object.entries(inkPixels)) {
    if (count < 200) failures.push(`the ${region} region holds only ${count} ink pixels`);
  }

  return {
    width: W,
    height: H,
    pixelCount: W * H,
    translucentPixels: translucent,
    offPalettePixels: offPalette,
    offPaletteSamples: samples,
    maxPaletteDistance: Math.round(maxDistance * 100) / 100,
    anchors,
    inkPixels,
    failures,
  };
}
