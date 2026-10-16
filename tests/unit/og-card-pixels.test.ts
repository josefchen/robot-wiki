// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { BRAND_COLORS } from '@/lib/brand-v2-tokens';
import { OG_FRAME_INSET_PX, OG_TEXT_INSET_PX, cardPaintedColors } from '@/lib/og-card-artwork';
import { ogCardCorpus, openSealedCardTree } from '@/lib/og-card-corpus';
import { OG_PIXEL_TOLERANCE, inspectCardPixels } from '@/lib/og-card-pixels';
import { decodePng, type DecodedPng } from '@/lib/png-decode';

/**
 * VAL-B2-OG-002..005 and VAL-B2-OG-008 read from decoded pixels: every
 * shipped card is opaque, stays on the palette its tree paints within the
 * declared tolerance, and carries the registered devices at their exact
 * pixels. The negative cases repaint a shipped card and re-encode it, so
 * each failure is caused by exactly one known change.
 */
const ROOT = process.cwd();
const corpus = ogCardCorpus(ROOT);

function paintedHexes(cardId: string): string[] {
  const entry = corpus.find((card) => card.cardId === cardId);
  if (!entry) throw new Error(`no corpus card ${cardId}`);
  return cardPaintedColors(openSealedCardTree(entry.card)).flatMap(({ hexes }) => hexes);
}

/** A non-interlaced 8-bit RGBA PNG, every row unfiltered. */
function encodeRgba(image: DecodedPng): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const chunk = (type: string, body: Buffer): Buffer => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'latin1');
    let crc = ~0;
    for (const byte of Buffer.concat([head.subarray(4), body])) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(~crc >>> 0, 0);
    return Buffer.concat([head, body, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(image.height * (image.width * 4 + 1));
  for (let y = 0; y < image.height; y += 1) {
    Buffer.from(image.rgba.buffer, image.rgba.byteOffset + y * image.width * 4, image.width * 4).copy(
      rows,
      y * (image.width * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function repaint(
  png: Buffer,
  box: { left: number; top: number; width: number; height: number },
  rgba: [number, number, number, number],
): Buffer {
  const image = decodePng(png);
  for (let y = box.top; y < box.top + box.height; y += 1) {
    for (let x = box.left; x < box.left + box.width; x += 1) image.rgba.set(rgba, (y * image.width + x) * 4);
  }
  return encodeRgba(image);
}

const SITE = readFileSync(join(ROOT, 'public/og/robot-wiki.png'));
const PAPER_RGBA = [
  ...[1, 3, 5].map((offset) => Number.parseInt(BRAND_COLORS.paper.slice(offset, offset + 2), 16)),
  255,
] as [number, number, number, number];

describe('decoded Open Graph card pixels', { timeout: 120_000 }, () => {
  it('passes every shipped card: opaque, on its painted palette, devices at their registered pixels', () => {
    expect(corpus).toHaveLength(58);
    for (const { cardId, cardPath } of corpus) {
      const report = inspectCardPixels({
        png: readFileSync(join(ROOT, 'public', cardPath)),
        kind: cardId === 'site' ? 'site' : 'article',
        paintedHexes: paintedHexes(cardId),
      });
      expect(report.failures, cardId).toEqual([]);
      expect(report.maxPaletteDistance).toBeLessThanOrEqual(OG_PIXEL_TOLERANCE);
      expect(report.anchors.length).toBeGreaterThan(cardId === 'site' ? 20 : 30);
    }
  });

  it('re-encoding without a change keeps the card passing, so the negatives below test only their repaint', () => {
    const report = inspectCardPixels({ png: encodeRgba(decodePng(SITE)), kind: 'site', paintedHexes: paintedHexes('site') });
    expect(report.failures).toEqual([]);
  });

  it('fails a retired lime fill, an off-token colour and a translucent pixel', () => {
    const lime = repaint(SITE, { left: 200, top: 300, width: 10, height: 10 }, [0xc6, 0xff, 0x19, 255]);
    expect(inspectCardPixels({ png: lime, kind: 'site', paintedHexes: paintedHexes('site') }).failures).toEqual([
      expect.stringMatching(/^100 pixels lie off the painted palette by more than 3 \(200,300 #C6FF19/),
    ]);
    // A blue that is not the locked signal token, ~54 away from any ink/signal blend.
    const offToken = repaint(SITE, { left: 200, top: 300, width: 4, height: 4 }, [0x00, 0x33, 0xff, 255]);
    expect(inspectCardPixels({ png: offToken, kind: 'site', paintedHexes: paintedHexes('site') }).offPalettePixels).toBe(16);
    const translucent = repaint(SITE, { left: 10, top: 10, width: 1, height: 1 }, [...PAPER_RGBA.slice(0, 3), 128] as [
      number,
      number,
      number,
      number,
    ]);
    expect(inspectCardPixels({ png: translucent, kind: 'site', paintedHexes: paintedHexes('site') }).failures).toEqual([
      '1 pixels are not opaque',
    ]);
  });

  it('fails a card whose registration cross or rail is missing at its registered pixel', () => {
    const inset = OG_FRAME_INSET_PX;
    const paper = PAPER_RGBA;
    const noCross = repaint(SITE, { left: inset, top: inset, width: 1, height: 1 }, paper);
    expect(inspectCardPixels({ png: noCross, kind: 'site', paintedHexes: paintedHexes('site') }).failures).toEqual([
      `top-left cross centre at (${inset}, ${inset}) is ${BRAND_COLORS.paper}, expected ${BRAND_COLORS.signal}`,
    ]);
    const noRail = repaint(SITE, { left: inset, top: 0, width: 1, height: inset }, paper);
    expect(inspectCardPixels({ png: noRail, kind: 'site', paintedHexes: paintedHexes('site') }).failures).toEqual([
      `left outer rail at (${inset}, ${inset / 2}) is ${BRAND_COLORS.paper}, expected ${BRAND_COLORS.concrete}`,
    ]);
  });

  it('fails a card whose identity region was left blank', () => {
    const textLeft = OG_FRAME_INSET_PX + 1 + OG_TEXT_INSET_PX;
    const textRight = 1200 - 1 - OG_FRAME_INSET_PX - OG_TEXT_INSET_PX;
    const blank = repaint(
      SITE,
      { left: textLeft, top: OG_FRAME_INSET_PX + 1, width: textRight - textLeft, height: 630 - 2 * (OG_FRAME_INSET_PX + 1) },
      PAPER_RGBA,
    );
    expect(inspectCardPixels({ png: blank, kind: 'site', paintedHexes: paintedHexes('site') }).failures).toEqual(
      expect.arrayContaining([expect.stringMatching(/^the identity region holds only 0 ink pixels/)]),
    );
  });
});
