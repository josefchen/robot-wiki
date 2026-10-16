/**
 * A checked-in, dependency-free PNG decoder for generated-image validation.
 *
 * The contract forbids resting an image claim on an undeclared machine
 * binary (design-integrity §23): the Open Graph pixel checks therefore
 * decode with this file and the runtime's own zlib, so the decoder's
 * version is this source and its checksum. It reads exactly what the card
 * renderer emits — non-interlaced, 8-bit greyscale, RGB, palette,
 * greyscale-alpha or RGBA — and rejects anything else rather than
 * guessing. Pixels come back as straight RGBA bytes.
 */
import { inflateSync } from 'node:zlib';

export type DecodedPng = {
  width: number;
  height: number;
  colorType: number;
  bitDepth: number;
  /** Chunk types in file order, e.g. `['IHDR', 'pHYs', 'IDAT', 'IEND']`. */
  chunks: string[];
  /** width × height × 4 bytes, row-major, straight (unpremultiplied) RGBA. */
  rgba: Uint8Array;
};

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** The IHDR dimensions alone, without inflating the image data. */
export function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Not a PNG: the 8-byte signature is missing');
  }
  if (buffer.toString('latin1', 12, 16) !== 'IHDR') {
    throw new Error('Not a PNG: the first chunk is not IHDR');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

export function decodePng(bytes: Uint8Array): DecodedPng {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const { width, height } = pngDimensions(buffer);
  const chunks: string[] = [];
  const data: Buffer[] = [];
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  let bitDepth = 0;
  let colorType = -1;
  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error('PNG chunk is truncated');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (body.length !== length) throw new Error(`PNG ${type} chunk is truncated`);
    chunks.push(type);
    if (type === 'IHDR') {
      bitDepth = body[8];
      colorType = body[9];
      if (body[10] !== 0 || body[11] !== 0) {
        throw new Error('PNG uses an unknown compression or filter method');
      }
      if (body[12] !== 0) throw new Error('Interlaced PNGs are not decoded');
    } else if (type === 'PLTE') palette = Buffer.from(body);
    else if (type === 'tRNS') transparency = Buffer.from(body);
    else if (type === 'IDAT') data.push(Buffer.from(body));
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (chunks.at(-1) !== 'IEND') throw new Error('PNG has no IEND chunk');
  const channels = CHANNELS[colorType];
  if (channels === undefined) throw new Error(`Unknown PNG colour type ${colorType}`);
  if (bitDepth !== 8) throw new Error(`Only 8-bit PNGs are decoded, got ${bitDepth}-bit`);
  if (colorType === 3 && palette === null) throw new Error('Palette PNG has no PLTE');

  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) {
    throw new Error(
      `PNG image data inflates to ${raw.length} bytes; ${width}x${height} needs ${height * (stride + 1)}`,
    );
  }
  const pixels = new Uint8Array(height * stride);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];
    const source = row * (stride + 1) + 1;
    const target = row * stride;
    const above = target - stride;
    // One loop per filter type keeps the per-byte work branch-free; the
    // first row reads zeros above it and the first pixel zeros to its left.
    if (filter === 0) {
      pixels.set(raw.subarray(source, source + stride), target);
    } else if (filter === 1) {
      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? pixels[target + index - channels] : 0;
        pixels[target + index] = (raw[source + index] + left) & 0xff;
      }
    } else if (filter === 2) {
      for (let index = 0; index < stride; index += 1) {
        const up = row > 0 ? pixels[above + index] : 0;
        pixels[target + index] = (raw[source + index] + up) & 0xff;
      }
    } else if (filter === 3) {
      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? pixels[target + index - channels] : 0;
        const up = row > 0 ? pixels[above + index] : 0;
        pixels[target + index] = (raw[source + index] + ((left + up) >> 1)) & 0xff;
      }
    } else if (filter === 4) {
      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? pixels[target + index - channels] : 0;
        const up = row > 0 ? pixels[above + index] : 0;
        const upLeft = row > 0 && index >= channels ? pixels[above + index - channels] : 0;
        pixels[target + index] = (raw[source + index] + paeth(left, up, upLeft)) & 0xff;
      }
    } else {
      throw new Error(`Unknown PNG row filter ${filter} on row ${row}`);
    }
  }

  if (colorType === 6) return { width, height, colorType, bitDepth, chunks, rgba: pixels };
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const at = pixel * channels;
    const out = pixel * 4;
    if (colorType === 2) {
      rgba.set(pixels.subarray(at, at + 3), out);
      rgba[out + 3] = 255;
    } else if (colorType === 0 || colorType === 4) {
      rgba[out] = rgba[out + 1] = rgba[out + 2] = pixels[at];
      rgba[out + 3] = colorType === 4 ? pixels[at + 1] : 255;
    } else {
      const entry = pixels[at];
      const paletteBytes = palette as Buffer;
      if (entry * 3 + 2 >= paletteBytes.length) {
        throw new Error(`PNG palette index ${entry} is out of range`);
      }
      rgba[out] = paletteBytes[entry * 3];
      rgba[out + 1] = paletteBytes[entry * 3 + 1];
      rgba[out + 2] = paletteBytes[entry * 3 + 2];
      rgba[out + 3] = transparency && entry < transparency.length ? transparency[entry] : 255;
    }
  }
  return { width, height, colorType, bitDepth, chunks, rgba };
}

/** The RGBA value of one pixel. */
export function pixelAt(
  image: DecodedPng,
  x: number,
  y: number,
): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    throw new Error(`Pixel (${x}, ${y}) is outside the ${image.width}x${image.height} image`);
  }
  const at = (y * image.width + x) * 4;
  return [image.rgba[at], image.rgba[at + 1], image.rgba[at + 2], image.rgba[at + 3]];
}
