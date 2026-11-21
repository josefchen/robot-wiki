/**
 * The public companies market map's layout (components/public-companies/public-market-map.tsx):
 * the squarified tiles, where each label fits, and the sentences that
 * depend on the width. Pure functions; no React.
 *
 * The figure is a client component, so this module imports no values from
 * the data or the registries: it reads only the plain rows
 * lib/public-market-map.ts computes on the server. The client bundle stays
 * free of zod (tests/unit/widget-citations.test.tsx).
 *
 * Tiles are grouped by segment, segments ordered by total, largest top
 * left. A segment's name and total sit in a band above its tiles; the
 * bands' area is set aside before the tiles are sized, so every tile keeps
 * its share of the whole.
 *
 * Labels are placed here, never by hand: a tile carries its company's mark
 * where the mark fits, else its name where the name fits, else nothing.
 * Text widths come from Geist's advance widths, which only overstate a run.
 *
 * Tested in tests/unit/public-market-map.test.ts.
 */
import type { ExposureClass, PublicSegment } from '@/data/public-companies';
import type { MarkGeometry } from '@/lib/market-map-marks';

/** A registered mark at the two sizes the map draws (lib/market-map-marks.ts presets). */
export interface MapMark {
  logo: string;
  file: string;
  /** The ground the mark sits on: white, or ink for white artwork. */
  ground: 'white' | 'ink';
  /**
   * In the row under the map, at the tile preset; on a tile, at the detail
   * preset (lib/market-map-marks.ts 'sheet', at least 16 px tall), the
   * smallest size at which every mark this map can draw, stacked ones
   * included, has lettering that reads at 1x.
   */
  geometry: { tile: MarkGeometry; detail: MarkGeometry };
}

export interface MapCompany {
  id: string;
  name: string;
  /** The name as a tile prints it, without parentheses. */
  shortName: string;
  segment: PublicSegment;
  exposure: ExposureClass;
  usd: number;
  /** Market value in US dollars, as the listed table prints it. */
  valueText: string;
  mark: MapMark | null;
}

export interface MapSegmentTotal {
  segment: PublicSegment;
  label: string;
  /** Sum of the segment's tiles. */
  usd: number;
  totalText: string;
  companies: number;
}

/** Everything the figure draws, computed once on the server and handed to the client. */
export interface PublicMarketMapData {
  /** The tiles, largest first, ties by name. */
  sized: MapCompany[];
  /** The companies the module does not size, largest first. */
  outOfScale: MapCompany[];
  /** Segments with at least one tile, largest total first. */
  segments: MapSegmentTotal[];
}

/** A run of method text, or a link inside it. */
export type MethodPart = string | { text: string; href: string };

/** Every sentence the figure prints that does not depend on its width, computed on the server. */
export interface PublicMarketMapText {
  headline: string;
  caption: string;
  description: string;
  conversion: MethodPart[];
  /** The fold paragraphs before and after the label sentence. */
  shares: string;
  outOfScale: string;
  source: string;
}

export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function sumUsd(rows: readonly { usd: number }[]): number {
  return rows.reduce((sum, row) => sum + row.usd, 0);
}

export interface LabelCounts {
  mark: number;
  name: number;
  none: number;
}

/**
 * What the tiles carry at this width. A tile left blank has room neither
 * for its mark nor for its name in up to MAX_NAME_LINES lines, across or,
 * when taller than wide, up the tile; tileLabel tries all of them.
 */
export function labelSentence(counts: LabelCounts): string {
  const clauses: string[] = [];
  if (counts.mark > 0) {
    clauses.push(
      `${count(counts.mark, 'tile carries', 'tiles carry')} the company’s own mark in its own colours, on white ` +
        'or, for white artwork, on ink',
    );
  }
  if (counts.name > 0) clauses.push(`${count(counts.name, 'tile carries', 'tiles carry')} the company’s name`);
  if (counts.none > 0) clauses.push(`${count(counts.none, 'tile is', 'tiles are')} too small for either`);
  if (clauses.length === 0) return 'At this width the map has no tiles.';
  const last = clauses.pop()!;
  const joined = clauses.length > 0 ? `${clauses.join('; ')}; and ${last}` : last;
  return `At this width ${joined}.`;
}

/** The title of the outlined row under the map. */
export const OUT_OF_SCALE_TITLE = 'Not to scale: mostly other businesses';

/** Segments too small at this width for their name and total, listed under the map. */
export function smallerBlocksText(layout: Pick<PublicMarketMapLayout, 'segments'>): string | null {
  const unlabeled = layout.segments.filter((segment) => !segment.band?.total);
  if (unlabeled.length === 0) return null;
  return `Smaller blocks: ${unlabeled.map((s) => `${s.label} ${s.totalText}`).join(', ')}.`;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Geist (the site's sans) advance widths at weight 400, in thousandths of
 * an em, for space (U+0020) to tilde (U+007E). Summing advances ignores
 * kerning, which only narrows a run, so a measured label is never shorter
 * than its text.
 */
const GEIST_ADVANCES = [
  250, 213, 346, 478, 629, 802, 620, 178, 274, 274, 430, 558, 201, 419, 201, 480,
  663, 384, 619, 613, 615, 626, 593, 524, 604, 593, 297, 297, 544, 540, 544, 559,
  906, 668, 680, 703, 694, 603, 590, 700, 713, 270, 597, 640, 580, 877, 743, 739,
  650, 733, 672, 640, 552, 689, 667, 945, 606, 576, 544, 347, 455, 347, 426, 557,
  248, 551, 595, 546, 595, 561, 395, 594, 581, 244, 260, 590, 267, 877, 581, 573,
  595, 595, 379, 520, 392, 575, 536, 819, 585, 537, 537, 389, 264, 389, 523,
] as const;

/** Width of `text` in Geist at `px`; a character outside the table counts one em. */
export function textWidth(text: string, px: number): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    units += code >= 32 && code <= 126 ? GEIST_ADVANCES[code - 32] : 1000;
  }
  return (units / 1000) * px;
}

/** Width of `text` in Geist Mono, every advance 600 thousandths of an em. */
export function monoWidth(text: string, px: number): number {
  return [...text].length * 0.6 * px;
}

/** The stage type: 12 px labels and readouts (lib/motion-tokens.ts), and the box a line of it fills. */
export const TEXT_PX = 12;
export const ASCENT = 1.03;
export const LINE = Math.ceil(TEXT_PX * (ASCENT + 0.28));

/** Inset of a label from its tile's edge (closer on a phone, where tiles are small), and of a mark from its ground. */
export const PAD = 6;
export const PHONE_PAD = 4;
export const PLATE_PAD = { x: 4, y: 3 } as const;
/** The segment band: its height, and the least room it leaves for tiles. */
export const BAND = 22;
export const MIN_INNER = 24;

export const MAP_WIDTH = { fallback: 1100, minimum: 300 } as const;
export const PHONE_MAX_WIDTH = 600;

/** The label inset at a map width. */
export function labelPad(width: number): number {
  return width < PHONE_MAX_WIDTH ? PHONE_PAD : PAD;
}

/** Taller than wide on a phone, a landscape block on a wide page. */
export function mapHeight(width: number): number {
  if (width < PHONE_MAX_WIDTH) return Math.round(width * 1.6);
  if (width < 960) return Math.round(width * 0.8);
  return Math.round(width * 0.56);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstRatio(areas: readonly number[], from: number, to: number, sum: number, side: number): number {
  let max = 0;
  let min = Infinity;
  for (let k = from; k < to; k++) {
    max = Math.max(max, areas[k]);
    min = Math.min(min, areas[k]);
  }
  if (min === 0 || sum === 0) return Infinity;
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

/**
 * Squarified treemap (Bruls, Huizing and van Wijk, 2000): the areas, in
 * the order given, fill `rect` in rows along its shorter side, each row
 * grown while its worst aspect ratio improves. The areas must sum to the
 * rectangle's area.
 */
export function squarify(areas: readonly number[], rect: Rect): Rect[] {
  const out: Rect[] = [];
  let { x, y, w, h } = rect;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    let j = i + 1;
    let sum = areas[i];
    let worst = worstRatio(areas, i, j, sum, side);
    while (j < areas.length) {
      const next = worstRatio(areas, i, j + 1, sum + areas[j], side);
      if (next > worst) break;
      worst = next;
      sum += areas[j];
      j += 1;
    }
    const last = j === areas.length;
    if (w >= h) {
      const thickness = last ? w : side === 0 ? 0 : sum / side;
      let cy = y;
      for (let k = i; k < j; k++) {
        const length = sum === 0 ? 0 : (areas[k] / sum) * h;
        out.push({ x, y: cy, w: thickness, h: length });
        cy += length;
      }
      x += thickness;
      w -= thickness;
    } else {
      const thickness = last ? h : side === 0 ? 0 : sum / side;
      let cx = x;
      for (let k = i; k < j; k++) {
        const length = sum === 0 ? 0 : (areas[k] / sum) * w;
        out.push({ x: cx, y, w: length, h: thickness });
        cx += length;
      }
      y += thickness;
      h -= thickness;
    }
    i = j;
  }
  return out;
}

/** A line of text: its baseline start, its box and the words. */
export interface PlacedText {
  x: number;
  y: number;
  text: string;
  /** The box the line fills, for the overlap checks. */
  box: Rect;
  /** Turned a quarter anticlockwise, reading up the tile from (x, y). */
  vertical?: boolean;
}

export type TileLabel =
  | { kind: 'mark'; plate: Rect; image: Rect; value: PlacedText | null }
  | { kind: 'name'; lines: PlacedText[]; value: PlacedText | null }
  | { kind: 'none' };

export interface PlacedTile extends Rect {
  company: MapCompany;
  label: TileLabel;
}

export interface PlacedSegment extends Rect {
  segment: PublicSegment;
  label: string;
  usd: number;
  totalText: string;
  /** The band with the name and total, or null when they do not fit. */
  band: { name: PlacedText; total: PlacedText | null } | null;
  tiles: PlacedTile[];
}

export interface PublicMarketMapLayout {
  width: number;
  height: number;
  segments: PlacedSegment[];
  tiles: PlacedTile[];
  counts: LabelCounts;
}

function line(x: number, top: number, text: string, width: number): PlacedText {
  return { x, y: top + TEXT_PX * ASCENT, text, box: { x, y: top, w: width, h: LINE } };
}

/** A name can take this many lines. */
export const MAX_NAME_LINES = 3;

/**
 * The name broken at spaces into the fewest lines no wider than `room`,
 * at most MAX_NAME_LINES; null when a word is wider than `room` or more
 * lines are needed. Words are never split.
 */
export function nameLines(name: string, room: number): string[] | null {
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    if (textWidth(word, TEXT_PX) > room) return null;
    const joined = lines.length > 0 ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length > 0 && textWidth(joined, TEXT_PX) <= room) lines[lines.length - 1] = joined;
    else lines.push(word);
  }
  return lines.length <= MAX_NAME_LINES ? lines : null;
}

/**
 * Whether a tile has room for the mark at its detail size, on its plate.
 * A mark is drawn at that size or not at all, never shrunk to fit: shrunk,
 * the lettering of a stacked mark (an emblem over a wordmark, or a name
 * over a second script) fell to 3 or 4 px.
 */
export function markFits(tile: Rect, mark: MapMark, pad: number = PAD): boolean {
  const { box } = mark.geometry.detail;
  return (
    box.width + 2 * PLATE_PAD.x <= tile.w - 2 * pad + 1e-9 &&
    box.height + 2 * PLATE_PAD.y <= tile.h - 2 * pad + 1e-9
  );
}

/**
 * The label that fits a tile: the mark, else the name across the tile, else
 * the name up a tile taller than wide, else nothing. The value goes under a
 * mark or a name across when it fits.
 */
export function tileLabel(tile: Rect, company: MapCompany, pad: number = PAD): TileLabel {
  const room = tile.w - 2 * pad;
  const bottom = tile.y + tile.h - pad;
  const value = (top: number): PlacedText | null => {
    const width = monoWidth(company.valueText, TEXT_PX);
    return width <= room && top + LINE <= bottom ? line(tile.x + pad, top, company.valueText, width) : null;
  };
  if (company.mark && markFits(tile, company.mark, pad)) {
    const { box, image } = company.mark.geometry.detail;
    const plate = { x: tile.x + pad, y: tile.y + pad, w: box.width + 2 * PLATE_PAD.x, h: box.height + 2 * PLATE_PAD.y };
    return {
      kind: 'mark',
      plate,
      image: {
        x: plate.x + PLATE_PAD.x + image.left,
        y: plate.y + PLATE_PAD.y + image.top,
        w: image.width,
        h: image.height,
      },
      value: value(plate.y + plate.h + 4),
    };
  }
  const across = nameLines(company.shortName, room);
  if (across && across.length * LINE <= tile.h - 2 * pad) {
    const top = tile.y + pad;
    const lines = across.map((text, k) => line(tile.x + pad, top + k * LINE, text, textWidth(text, TEXT_PX)));
    return { kind: 'name', lines, value: value(top + across.length * LINE + 2) };
  }
  if (tile.h > tile.w) {
    const up = nameLines(company.shortName, tile.h - 2 * pad);
    if (up && up.length * LINE <= room) {
      // Read with the head tilted left: the first line is the leftmost column.
      const lines = up.map((text, k): PlacedText => {
        const width = textWidth(text, TEXT_PX);
        const left = tile.x + pad + k * LINE;
        return {
          x: left + TEXT_PX * ASCENT,
          y: bottom,
          text,
          box: { x: left, y: bottom - width, w: LINE, h: width },
          vertical: true,
        };
      });
      return { kind: 'name', lines, value: null };
    }
  }
  return { kind: 'none' };
}

/** Keep narrow segments identifiable even when their total has to move to the caption. */
function bandName(rect: Rect, segment: MapSegmentTotal): string | null {
  if (rect.h < BAND + MIN_INNER) return null;
  const available = rect.w - 2 * PAD;
  if (textWidth(segment.label, TEXT_PX) <= available) return segment.label;
  const compact = segment.segment === 'vehicles' ? 'AVs' : segment.segment === 'components' ? 'Parts' : null;
  return compact && textWidth(compact, TEXT_PX) <= available ? compact : null;
}

/**
 * Segment rectangles whose tile area, after their band, is in proportion
 * to their totals: the band's area is added to each segment's weight and
 * the layout repeated until the widths settle.
 */
function segmentRects(segments: readonly MapSegmentTotal[], rect: Rect, banded: ReadonlySet<PublicSegment>): Rect[] {
  const total = sumUsd(segments);
  const area = rect.w * rect.h;
  let rects = squarify(
    segments.map((s) => (s.usd / total) * area),
    rect,
  );
  for (let pass = 0; pass < 24; pass++) {
    const bands = rects.map((r, k) => (banded.has(segments[k].segment) ? BAND * r.w : 0));
    const perUsd = (area - bands.reduce((a, b) => a + b, 0)) / total;
    rects = squarify(
      segments.map((s, k) => s.usd * perUsd + bands[k]),
      rect,
    );
  }
  return rects;
}

export function publicMarketMapLayout(width: number, data: PublicMarketMapData): PublicMarketMapLayout {
  const height = mapHeight(width);
  const frame = { x: 0, y: 0, w: width, h: height };
  const banded = new Set(data.segments.map((s) => s.segment));
  let rects = segmentRects(data.segments, frame, banded);
  // A segment whose name cannot fit loses its band; repeat until none does.
  for (let pass = 0; pass < data.segments.length; pass++) {
    const drop = data.segments.filter((s, k) => banded.has(s.segment) && !bandName(rects[k], s));
    if (drop.length === 0) break;
    for (const s of drop) banded.delete(s.segment);
    rects = segmentRects(data.segments, frame, banded);
  }

  const counts: LabelCounts = { mark: 0, name: 0, none: 0 };
  const segments = data.segments.map((segment, k): PlacedSegment => {
    const rect = rects[k];
    const label = banded.has(segment.segment) ? bandName(rect, segment) : null;
    const bandHeight = label ? BAND : 0;
    const inner = { x: rect.x, y: rect.y + bandHeight, w: rect.w, h: rect.h - bandHeight };
    const members = data.sized.filter((c) => c.segment === segment.segment);
    const tileRects = squarify(
      members.map((c) => (c.usd / segment.usd) * inner.w * inner.h),
      inner,
    );
    const tiles = members.map((company, n): PlacedTile => {
      const label = tileLabel(tileRects[n], company, labelPad(width));
      counts[label.kind] += 1;
      return { ...tileRects[n], company, label };
    });
    const top = rect.y + (BAND - LINE) / 2;
    const totalWidth = monoWidth(segment.totalText, TEXT_PX);
    const labelWidth = label ? textWidth(label, TEXT_PX) : 0;
    return {
      ...rect,
      segment: segment.segment,
      label: segment.label,
      usd: segment.usd,
      totalText: segment.totalText,
      band: label
        ? {
            name: line(rect.x + PAD, top, label, labelWidth),
            total: labelWidth + 8 + totalWidth <= rect.w - 2 * PAD
              ? line(rect.x + rect.w - PAD - totalWidth, top, segment.totalText, totalWidth)
              : null,
          }
        : null,
      tiles,
    };
  });
  return { width, height, segments, tiles: segments.flatMap((s) => s.tiles), counts };
}
