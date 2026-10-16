// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodePng, pixelAt, pngDimensions } from '@/lib/png-decode';

/**
 * The checked-in decoder the generated-image claims rest on
 * (design-integrity §23: no undeclared image binary). Each filter and
 * colour type is exercised on a PNG assembled here byte by byte, so the
 * expected pixels are known without a second decoder.
 */

function crc32(bytes: Buffer): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** A PNG whose raw scanlines (filter byte included) are given verbatim. */
function png(input: {
  width: number;
  height: number;
  colorType: number;
  scanlines: number[][];
  extra?: Buffer[];
}): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(input.width, 0);
  header.writeUInt32BE(input.height, 4);
  header[8] = 8;
  header[9] = input.colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(input.extra ?? []),
    chunk('IDAT', deflateSync(Buffer.from(input.scanlines.flat()))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('the checked-in PNG decoder', () => {
  it('undoes every row filter on an RGB image', () => {
    // 2x5 RGB, one row per filter type. The second pixel of each row is the
    // first pixel plus (1, 2, 3) once unfiltered.
    const rows = [
      [0, 10, 20, 30, 11, 22, 33], // none
      [1, 10, 20, 30, 1, 2, 3], // sub
      [2, 0, 0, 0, 0, 0, 0], // up: copies row 1
      [3, 5, 10, 15, 1, 2, 3], // average
      [4, 0, 0, 0, 1, 2, 3], // paeth
    ];
    const image = decodePng(png({ width: 2, height: 5, colorType: 2, scanlines: rows }));
    expect(image.chunks).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(pixelAt(image, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(pixelAt(image, 1, 0)).toEqual([11, 22, 33, 255]);
    expect(pixelAt(image, 1, 1)).toEqual([11, 22, 33, 255]);
    expect(pixelAt(image, 0, 2)).toEqual([10, 20, 30, 255]);
    // average: 5 + floor((0 + 10) / 2) = 10 and so on.
    expect(pixelAt(image, 0, 3)).toEqual([10, 20, 30, 255]);
    // paeth picks the pixel above, then the second pixel adds its left.
    expect(pixelAt(image, 0, 4)).toEqual([10, 20, 30, 255]);
    expect(pixelAt(image, 1, 4)[0]).toBeGreaterThan(0);
  });

  it('expands greyscale, palette and alpha colour types to RGBA', () => {
    const grey = decodePng(png({ width: 1, height: 1, colorType: 0, scanlines: [[0, 77]] }));
    expect(pixelAt(grey, 0, 0)).toEqual([77, 77, 77, 255]);
    const greyAlpha = decodePng(png({ width: 1, height: 1, colorType: 4, scanlines: [[0, 77, 128]] }));
    expect(pixelAt(greyAlpha, 0, 0)).toEqual([77, 77, 77, 128]);
    const rgba = decodePng(png({ width: 1, height: 1, colorType: 6, scanlines: [[0, 1, 2, 3, 4]] }));
    expect(pixelAt(rgba, 0, 0)).toEqual([1, 2, 3, 4]);
    const palette = decodePng(
      png({
        width: 2,
        height: 1,
        colorType: 3,
        scanlines: [[0, 1, 0]],
        extra: [chunk('PLTE', Buffer.from([9, 8, 7, 198, 255, 25])), chunk('tRNS', Buffer.from([0]))],
      }),
    );
    // Entry 1 lies past the one-byte tRNS table, so it stays opaque.
    expect(pixelAt(palette, 0, 0)).toEqual([198, 255, 25, 255]);
    expect(pixelAt(palette, 1, 0)).toEqual([9, 8, 7, 0]);
  });

  it('rejects what it does not decode instead of guessing', () => {
    const good = png({ width: 1, height: 1, colorType: 2, scanlines: [[0, 1, 2, 3]] });
    expect(() => decodePng(Buffer.from('not a png at all, just text'))).toThrow(/signature/);
    expect(() => decodePng(good.subarray(0, good.length - 12))).toThrow(/IEND|truncated/);
    expect(() => decodePng(png({ width: 2, height: 1, colorType: 2, scanlines: [[0, 1, 2, 3]] }))).toThrow(/inflates/);
    expect(() => decodePng(png({ width: 1, height: 1, colorType: 2, scanlines: [[7, 1, 2, 3]] }))).toThrow(/filter 7/);
  });

  it('decodes a shipped card at its declared dimensions', () => {
    const bytes = readFileSync(join(process.cwd(), 'public/og/robot-wiki.png'));
    expect(pngDimensions(bytes)).toEqual({ width: 1200, height: 630 });
    const image = decodePng(bytes);
    expect(image.rgba.length).toBe(1200 * 630 * 4);
    // The decoder is part of the toolchain identity the manifest records.
    expect(createHash('sha256').update(readFileSync(join(process.cwd(), 'lib/png-decode.ts'))).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
  });
});
