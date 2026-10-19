/**
 * Measures where the artwork sits inside each company-mark file, so the
 * market map can place every mark by its artwork rather than by its file
 * box (a padded square file drew the Boston Dynamics wordmark a quarter of
 * the tile high).
 *
 *   node scripts/measure-logo-marks.ts          rewrite the measured block of lib/market-map-marks.ts
 *   node scripts/measure-logo-marks.ts --check  exit 1 when the block differs from a fresh measurement
 *
 * Each file under public/images/logos is drawn in Chromium at its own
 * resolution (raster files) or at 2000 px on the long side (SVG files), and
 * the bounding box of every pixel with any opacity at all is recorded as
 * fractions of the file box, rounded outward. Only fully transparent margin
 * lies outside that box, so placing the box on the tile cuts no artwork.
 * A file whose box reaches all four edges (most raster marks carry their
 * own background) records no box and is placed as a whole, as before.
 * Each entry also keeps the file's SHA-256 prefix, which the unit tests
 * compare with the bytes on disk: a changed file fails them until this
 * script is run again.
 */
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { companyLogoIds, getCompanyLogo } from '../data/logos.ts';
import { serveExport } from '../lib/visual-capture.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const TARGET = join(ROOT, 'lib/market-map-marks.ts');
const BEGIN = '// BEGIN measured marks (written by scripts/measure-logo-marks.ts)';
const END = '// END measured marks';
const check = process.argv.includes('--check');

type Box = [number, number, number, number];

const marks = companyLogoIds()
  .sort()
  .map((id) => {
    const asset = getCompanyLogo(id)!;
    const bytes = readFileSync(join(ROOT, 'public', asset.file));
    return { id, ...asset, sha256: createHash('sha256').update(bytes).digest('hex').slice(0, 16) };
  });

const { server, base } = await serveExport(join(ROOT, 'public'));
const browser = await chromium.launch();
let boxes: Record<string, Box | null>;
try {
  const page = await browser.newPage();
  await page.route(`${base}/__measure`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>measure</title>' }),
  );
  await page.goto(`${base}/__measure`);
  boxes = await page.evaluate(async (list) => {
    const result: Record<string, [number, number, number, number] | null> = {};
    for (const mark of list) {
      const img = new Image();
      img.src = mark.file;
      await img.decode();
      const vector = mark.file.endsWith('.svg');
      const scale = vector ? 2000 / Math.max(mark.width, mark.height) : 1;
      const w = Math.max(1, Math.round(mark.width * scale));
      const h = Math.max(1, Math.round(mark.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d')!;
      g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (data[(y * w + x) * 4 + 3] === 0) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) throw new Error(`${mark.id}: no opaque pixel`);
      // One pixel of slack on each side, then outward rounding to 1e-4.
      const down = (v: number) => Math.max(0, Math.floor(v * 1e4) / 1e4);
      const up = (v: number) => Math.min(1, Math.ceil(v * 1e4) / 1e4);
      const box: [number, number, number, number] = [
        down((x0 - 1) / w), down((y0 - 1) / h), up((x1 + 2) / w), up((y1 + 2) / h),
      ];
      const whole = box[0] <= 0.005 && box[1] <= 0.005 && box[2] >= 0.995 && box[3] >= 0.995;
      result[mark.id] = whole ? null : box;
    }
    return result;
  }, marks.map(({ id, file, width, height }) => ({ id, file, width, height })));
} finally {
  await browser.close();
  server.close();
}

const lines = marks.map(({ id, sha256 }) => {
  const box = boxes[id];
  return `  '${id}': { sha256: '${sha256}', box: ${box ? `[${box.join(', ')}]` : 'null'} },`;
});
const block = [
  BEGIN,
  'export const MARK_PLACEMENT: Readonly<Record<string, MarkPlacement>> = {',
  ...lines,
  '};',
  END,
].join('\n');

const current = readFileSync(TARGET, 'utf8');
const start = current.indexOf(BEGIN);
const stop = current.indexOf(END);
if (start < 0 || stop < start) throw new Error(`${TARGET} has no measured block`);
const next = `${current.slice(0, start)}${block}${current.slice(stop + END.length)}`;
if (check) {
  if (next !== current) {
    console.error('measure-logo-marks: lib/market-map-marks.ts differs from a fresh measurement; run node scripts/measure-logo-marks.ts');
    process.exit(1);
  }
  console.log(`measure-logo-marks: ${marks.length} marks match their measurement`);
} else {
  writeFileSync(TARGET, next);
  const trimmed = Object.values(boxes).filter(Boolean).length;
  console.log(`measure-logo-marks: ${marks.length} marks measured, ${trimmed} with transparent margin`);
}
