import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodePng, type DecodedPng } from '@/lib/png-decode';
import { FX_RATES_DATE, FX_RATES_SOURCE_URL, TWD_RATE_DATE, TWD_RATE_SOURCE_URL } from '@/data/fx-rates';
import { logoIdFor } from '@/data/company-logos';
import { getCompanyLogo } from '@/data/logos';
import { PUBLIC_COMPANIES, type PublicCompany } from '@/data/public-companies';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import { formatLongDate } from '@/lib/dates';
import { CAPTION_MAX_WORDS, words } from '@/lib/figure-system-paint';
import { PUBLIC_SEGMENT_LABELS, isSized, toUsd } from '@/lib/public-companies';
import { MARK_PRESETS } from '@/lib/market-map-marks';
import { PAGE_RATES, formatMoney } from '@/lib/public-companies-page';
import {
  BAND,
  LIGHT_MARKS,
  LINE,
  MAX_NAME_LINES,
  PAD,
  PHONE_PAD,
  PLATE_PAD,
  conversionParts,
  labelPad,
  labelSentence,
  nameLines,
  mapCaption,
  mapDescription,
  mapHeadline,
  mapHeight,
  publicMarketMapData,
  publicMarketMapLayout,
  smallerBlocksText,
  squarify,
  type PublicMarketMapLayout,
  type Rect,
} from '@/lib/public-market-map';

const repoRoot = join(import.meta.dirname, '../..');

/**
 * The share of a mark's artwork (alpha 128 or more) that is near white,
 * luminance over 0.8, and joined through white to a transparent pixel or
 * the file's edge: the part a white ground would swallow.
 */
function exposedWhiteShare({ width, height, rgba }: DecodedPng): number {
  const linear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const n = width * height;
  const art = new Uint8Array(n);
  const white = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (rgba[k * 4 + 3] < 128) continue;
    art[k] = 1;
    const lum = 0.2126 * linear(rgba[k * 4]) + 0.7152 * linear(rgba[k * 4 + 1]) + 0.0722 * linear(rgba[k * 4 + 2]);
    if (lum > 0.8) white[k] = 1;
  }
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  for (let k = 0; k < n; k++) {
    const x = k % width;
    const y = Math.floor(k / width);
    const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    const besideClear =
      (x > 0 && !art[k - 1]) || (x < width - 1 && !art[k + 1]) || (y > 0 && !art[k - width]) || (y < height - 1 && !art[k + width]);
    if (white[k] && (edge || besideClear)) stack.push(k);
  }
  let exposed = 0;
  while (stack.length > 0) {
    const k = stack.pop()!;
    if (seen[k] || !white[k]) continue;
    seen[k] = 1;
    exposed += 1;
    const x = k % width;
    if (x > 0) stack.push(k - 1);
    if (x < width - 1) stack.push(k + 1);
    if (k >= width) stack.push(k - width);
    if (k + width < n) stack.push(k + width);
  }
  const total = art.reduce((sum, v) => sum + v, 0);
  return total === 0 ? 0 : exposed / total;
}

const DATA = publicMarketMapData();
const WIDTHS = [1200, 900, 334] as const;
const LAYOUTS = WIDTHS.map((width) => publicMarketMapLayout(width, DATA));
const EPS = 1e-6;

const inside = (inner: Rect, outer: Rect, inset = 0) =>
  inner.x >= outer.x + inset - EPS &&
  inner.y >= outer.y + inset - EPS &&
  inner.x + inner.w <= outer.x + outer.w - inset + EPS &&
  inner.y + inner.h <= outer.y + outer.h - inset + EPS;

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

function labelBoxes(layout: PublicMarketMapLayout) {
  return layout.tiles.map((tile) => {
    const { label } = tile;
    const boxes: Rect[] = [];
    if (label.kind === 'mark') boxes.push(label.plate);
    if (label.kind === 'name') boxes.push(...label.lines.map((l) => l.box));
    if (label.kind !== 'none' && label.value) boxes.push(label.value.box);
    return { tile, boxes };
  });
}

describe('public market map data', () => {
  it('puts each company once, in the map or the row, by the module’s own sizing field', () => {
    const ids = [...DATA.sized, ...DATA.outOfScale].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(PUBLIC_COMPANIES.map((c) => c.id).sort());
    const byId = new Map(PUBLIC_COMPANIES.map((c) => [c.id, c]));
    for (const c of DATA.sized) expect(isSized(byId.get(c.id)!), c.id).toBe(true);
    for (const c of DATA.outOfScale) expect(isSized(byId.get(c.id)!), c.id).toBe(false);
    for (const layout of LAYOUTS) {
      expect(layout.tiles.map((t) => t.company.id).sort()).toEqual(DATA.sized.map((c) => c.id).sort());
    }
  });

  it('converts every value through the page’s rates and prints it as the listed table does', () => {
    const byId = new Map(PUBLIC_COMPANIES.map((c) => [c.id, c]));
    for (const c of [...DATA.sized, ...DATA.outOfScale]) {
      const row = byId.get(c.id)!;
      expect(c.usd).toBe(toUsd(row.marketCap, row.currency, PAGE_RATES));
      expect(c.valueText).toBe(formatMoney(c.usd, 'USD'));
    }
    const values = DATA.outOfScale.map((c) => c.usd);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it('totals each segment from its tiles and orders segments by total', () => {
    const totals = DATA.segments.map((s) => s.usd);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    for (const segment of DATA.segments) {
      const members = DATA.sized.filter((c) => c.segment === segment.segment);
      expect(segment.companies).toBe(members.length);
      expect(segment.usd).toBeCloseTo(members.reduce((sum, c) => sum + c.usd, 0), 0);
      expect(segment.totalText).toBe(formatMoney(segment.usd, 'USD'));
      expect(segment.label).toBe(PUBLIC_SEGMENT_LABELS[segment.segment]);
    }
    for (const layout of LAYOUTS) {
      for (const segment of layout.segments) {
        expect(segment.usd).toBeCloseTo(segment.tiles.reduce((sum, t) => sum + t.company.usd, 0), 0);
      }
    }
  });

  it('gives a mark only to a company the lookup has one for', () => {
    for (const c of [...DATA.sized, ...DATA.outOfScale]) {
      if (c.mark) expect(c.mark.logo).toBe(logoIdFor(c.name));
      else expect(logoIdFor(c.name) === null || c.mark === null).toBe(true);
    }
    expect(DATA.sized.some((c) => c.mark)).toBe(true);
  });

  it('sets white artwork on ink and every other mark on white, for marks this figure draws', () => {
    const drawn = new Map([...DATA.sized, ...DATA.outOfScale].flatMap((c) => (c.mark ? [[c.mark.logo, c.mark]] : [])));
    for (const id of LIGHT_MARKS) {
      expect(getCompanyLogo(id), id).toBeDefined();
      expect(drawn.get(id)?.ground, id).toBe('ink');
    }
    for (const [id, mark] of drawn) expect(mark.ground, id).toBe(LIGHT_MARKS.has(id) ? 'ink' : 'white');
    // White lettering beside a green emblem: on white it read "sym".
    expect(drawn.get('symbotic-logo')?.ground).toBe('ink');
  });

  it('measures each raster mark again: white artwork on a transparent ground goes on ink, all other art on white', () => {
    const drawn = new Map([...DATA.sized, ...DATA.outOfScale].flatMap((c) => (c.mark ? [[c.mark.logo, c.mark]] : [])));
    const rasters = [...drawn.values()].filter((mark) => mark.file.endsWith('.png'));
    expect(rasters.length).toBeGreaterThan(40);
    for (const mark of rasters) {
      const share = exposedWhiteShare(decodePng(readFileSync(join(repoRoot, 'public', mark.file))));
      // Measured 15 November 2026: 0.59 or more for white artwork, 0.004 or less for the rest.
      expect(share > 0.25 ? 'ink' : 'white', `${mark.logo}: ${share.toFixed(3)}`).toBe(mark.ground);
    }
  });
});

describe('public market map text', () => {
  it('computes the headline from the largest segment and the largest pure play', () => {
    const lead = DATA.segments[0];
    const pure = DATA.sized.filter((c) => c.exposure === 'pure play').sort((a, b) => b.usd - a.usd)[0];
    expect(mapHeadline(DATA)).toBe(
      `Largest segment: ${lead.label}, ${lead.totalText}. Largest pure play: ${pure.name}, ${pure.valueText}.`,
    );
    expect(mapHeadline(DATA)).toBe('Largest segment: Surgical, $161B. Largest pure play: Intuitive Surgical, $154B.');
  });

  it('follows the data when the data changes', () => {
    const bumped: PublicCompany[] = PUBLIC_COMPANIES.map((c) =>
      c.id === 'unitree-robotics' ? { ...c, marketCap: c.marketCap * 10 } : c,
    );
    expect(bumped.some((c) => c.id === 'unitree-robotics')).toBe(true);
    const headline = mapHeadline(publicMarketMapData(PAGE_RATES, bumped));
    expect(headline).toMatch(/^Largest segment: Humanoids, \$\d+B\. Largest pure play: Unitree Robotics, \$\d+B\.$/);
  });

  it('keeps the registered chart description equal to the computed one', () => {
    const entry = CHART_DESCRIPTIONS.find((e) => e.component === 'PublicMarketMap');
    expect(entry?.text).toBe(mapDescription(DATA));
    expect(entry?.route).toBe('/market-map/public/');
  });

  it('fits the caption and its colour key within the figure word limit', () => {
    const caption = mapCaption(DATA);
    expect(caption).toContain(`market value in US dollars for ${DATA.sized.length} companies`);
    expect(caption).toContain('Blue marks pure plays, grey major robotics businesses.');
    expect(caption).toContain(`${DATA.outOfScale.length} outlined companies are unscaled.`);
    expect(words(caption)).toBeLessThanOrEqual(CAPTION_MAX_WORDS);
  });

  it('links and dates both rate sources from the rates file', () => {
    const parts = conversionParts();
    const links = parts.filter((p) => typeof p !== 'string');
    expect(links.map((l) => l.href)).toEqual([FX_RATES_SOURCE_URL, TWD_RATE_SOURCE_URL]);
    const text = parts.map((p) => (typeof p === 'string' ? p : p.text)).join('');
    expect(text).toContain(formatLongDate(FX_RATES_DATE));
    expect(text).toContain(formatLongDate(TWD_RATE_DATE));
  });
});

describe('public market map layout', () => {
  it('fills a rectangle with squarified tiles of the given areas', () => {
    const rect = { x: 0, y: 0, w: 60, h: 40 };
    const areas = [6, 6, 4, 3, 2, 2, 1].map((a) => (a / 24) * 2400);
    const tiles = squarify(areas, rect);
    expect(tiles).toHaveLength(areas.length);
    for (const [k, tile] of tiles.entries()) {
      expect(tile.w * tile.h).toBeCloseTo(areas[k], 6);
      expect(inside(tile, rect)).toBe(true);
    }
    for (let a = 0; a < tiles.length; a++) {
      for (let b = a + 1; b < tiles.length; b++) expect(overlap(tiles[a], tiles[b])).toBe(false);
    }
  });

  it('sizes every tile to its share of the whole, bands set aside', () => {
    const totalUsd = DATA.sized.reduce((sum, c) => sum + c.usd, 0);
    for (const layout of LAYOUTS) {
      const tileArea = layout.tiles.reduce((sum, t) => sum + t.w * t.h, 0);
      for (const tile of layout.tiles) {
        const share = tile.company.usd / totalUsd;
        expect(Math.abs((tile.w * tile.h) / tileArea - share), tile.company.id).toBeLessThan(1e-4);
      }
      const bandArea = layout.segments.reduce((sum, s) => sum + (s.band ? BAND * s.w : 0), 0);
      expect(tileArea + bandArea).toBeCloseTo(layout.width * layout.height, 3);
    }
  });

  it('keeps tiles inside their segment and segments inside the map, none overlapping', () => {
    for (const layout of LAYOUTS) {
      const frame = { x: 0, y: 0, w: layout.width, h: layout.height };
      for (const segment of layout.segments) {
        expect(inside(segment, frame)).toBe(true);
        for (const tile of segment.tiles) expect(inside(tile, segment), tile.company.id).toBe(true);
      }
      for (let a = 0; a < layout.segments.length; a++) {
        for (let b = a + 1; b < layout.segments.length; b++) {
          expect(overlap(layout.segments[a], layout.segments[b])).toBe(false);
        }
      }
    }
  });

  it('is deterministic, whatever order the rows arrive in', () => {
    const shuffled = [...PUBLIC_COMPANIES].reverse();
    for (const width of WIDTHS) {
      const again = publicMarketMapLayout(width, publicMarketMapData());
      expect(again).toEqual(publicMarketMapLayout(width, DATA));
      expect(publicMarketMapLayout(width, publicMarketMapData(PAGE_RATES, shuffled))).toEqual(again);
    }
  });

  it('places every label inside its tile, clear of the edge and of every other label', () => {
    for (const layout of LAYOUTS) {
      for (const { tile, boxes } of labelBoxes(layout)) {
        for (const box of boxes) expect(inside(box, tile, labelPad(layout.width) - 1), tile.company.id).toBe(true);
        for (let a = 0; a < boxes.length; a++) {
          for (let b = a + 1; b < boxes.length; b++) expect(overlap(boxes[a], boxes[b]), tile.company.id).toBe(false);
        }
      }
      for (const segment of layout.segments) {
        if (!segment.band) continue;
        const band = { x: segment.x, y: segment.y, w: segment.w, h: BAND };
        expect(inside(segment.band.name.box, band), segment.segment).toBe(true);
        if (segment.band.total) {
          expect(inside(segment.band.total.box, band), segment.segment).toBe(true);
          expect(overlap(segment.band.name.box, segment.band.total.box)).toBe(false);
        }
        for (const tile of segment.tiles) expect(tile.y).toBeGreaterThanOrEqual(segment.y + BAND - EPS);
      }
    }
  });

  it('leaves a tile blank only when neither its mark nor its name fits, across or up', () => {
    let blank = 0;
    for (const layout of LAYOUTS) {
      for (const tile of layout.tiles) {
        if (tile.label.kind !== 'none') continue;
        blank += 1;
        const { company } = tile;
        const pad = labelPad(layout.width);
        const room = tile.w - 2 * pad;
        const across = nameLines(company.shortName, room);
        expect(across !== null && across.length * LINE <= tile.h - 2 * pad, company.id).toBe(false);
        if (tile.h > tile.w) {
          const up = nameLines(company.shortName, tile.h - 2 * pad);
          expect(up !== null && up.length * LINE <= room, company.id).toBe(false);
        }
        if (company.mark) {
          const { box } = company.mark.geometry.detail;
          const fits = box.width + 2 * PLATE_PAD.x <= room && box.height + 2 * PLATE_PAD.y <= tile.h - 2 * pad;
          expect(fits, company.id).toBe(false);
        }
      }
    }
    expect(blank).toBeGreaterThan(0);
    // Closer to the edge on a phone, where tiles are small.
    expect(labelPad(334)).toBe(PHONE_PAD);
    expect(labelPad(1200)).toBe(PAD);
    expect(PHONE_PAD).toBeLessThan(PAD);
  });

  it('draws a mark only at its detail size, never shrunk, else tries the name', () => {
    // The detail preset is at least 16 px tall: the size at which every mark
    // this map can draw, stacked ones included, reads at 1x.
    expect(MARK_PRESETS.sheet.minHeight).toBe(16);
    let marks = 0;
    for (const layout of LAYOUTS) {
      const pad = labelPad(layout.width);
      for (const tile of layout.tiles) {
        const { company, label } = tile;
        const { box, image } = company.mark?.geometry.detail ?? { box: null, image: null };
        if (label.kind === 'mark') {
          marks += 1;
          expect(label.plate.w, company.id).toBeCloseTo(box!.width + 2 * PLATE_PAD.x, 9);
          expect(label.plate.h, company.id).toBeCloseTo(box!.height + 2 * PLATE_PAD.y, 9);
          expect(label.plate.h - 2 * PLATE_PAD.y, company.id).toBeGreaterThanOrEqual(MARK_PRESETS.sheet.minHeight - EPS);
          expect([label.image.w, label.image.h], company.id).toEqual([image!.width, image!.height]);
        } else if (company.mark) {
          // No room for the whole plate at the detail size.
          const room = tile.w - 2 * pad;
          const fits = box!.width + 2 * PLATE_PAD.x <= room && box!.height + 2 * PLATE_PAD.y <= tile.h - 2 * pad;
          expect(fits, company.id).toBe(false);
        }
      }
    }
    expect(marks).toBeGreaterThan(0);
    // Shrunk to its tile, Harmonic Drive Systems' stacked mark drew 51 by 14 px
    // on the desktop map, its lettering about 3 px tall; the tile takes the name.
    const harmonic = LAYOUTS[0].tiles.find((t) => t.company.id === 'harmonic-drive-systems')!;
    expect(harmonic.label.kind).toBe('name');
  });

  it('breaks a name only at spaces, into at most three lines no wider than the room', () => {
    expect(nameLines('Estun Automation', 70)).toEqual(['Estun', 'Automation']);
    expect(nameLines('Estun Automation', 200)).toEqual(['Estun Automation']);
    expect(nameLines('AeroVironment', 60)).toBeNull();
    for (const layout of LAYOUTS) {
      for (const tile of layout.tiles) {
        if (tile.label.kind !== 'name') continue;
        const { lines } = tile.label;
        expect(lines.map((l) => l.text).join(' '), tile.company.id).toBe(tile.company.shortName);
        expect(lines.length).toBeLessThanOrEqual(MAX_NAME_LINES);
        expect(new Set(lines.map((l) => Boolean(l.vertical))).size, tile.company.id).toBe(1);
        if (lines[0].vertical) expect(tile.h, tile.company.id).toBeGreaterThan(tile.w);
      }
    }
  });

  it('says what the tiles carry in a sentence that agrees with every count', () => {
    expect(labelSentence({ mark: 7, name: 1, none: 84 })).toBe(
      'At this width 7 tiles carry the company’s own mark in its own colours, on white or, for white artwork, ' +
        'on ink; 1 tile carries the company’s name; and 84 tiles are too small for either.',
    );
    expect(labelSentence({ mark: 1, name: 0, none: 1 })).toBe(
      'At this width 1 tile carries the company’s own mark in its own colours, on white or, for white artwork, ' +
        'on ink; and 1 tile is too small for either.',
    );
    expect(labelSentence({ mark: 0, name: 3, none: 0 })).toBe('At this width 3 tiles carry the company’s name.');
    for (const layout of LAYOUTS) {
      const sentence = labelSentence(layout.counts);
      expect(sentence).not.toMatch(/\b1 (carry|are)\b/);
      if (layout.counts.none === 0) expect(sentence).not.toContain('too small');
    }
  });

  it('counts the labels it placed', () => {
    for (const layout of LAYOUTS) {
      const kinds = layout.tiles.map((t) => t.label.kind);
      expect(layout.counts).toEqual({
        mark: kinds.filter((k) => k === 'mark').length,
        name: kinds.filter((k) => k === 'name').length,
        none: kinds.filter((k) => k === 'none').length,
      });
    }
  });

  it('draws taller than wide on a phone and names every segment while listing totals that do not fit', () => {
    expect(mapHeight(334)).toBeGreaterThan(334);
    expect(mapHeight(1200)).toBeLessThan(1200);
    const phone = LAYOUTS[2];
    const text = smallerBlocksText(phone);
    expect(phone.segments.every(s => s.band?.name.text)).toBe(true);
    const unlabeled = phone.segments.filter((s) => !s.band?.total);
    if (unlabeled.length === 0) expect(text).toBeNull();
    else for (const s of unlabeled) expect(text).toContain(`${s.label} ${s.totalText}`);
    // The largest segment always keeps its name and total.
    for (const layout of LAYOUTS) expect(layout.segments[0].band).not.toBeNull();
  });
});
