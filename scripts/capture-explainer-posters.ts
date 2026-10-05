/**
 * Writes each explainer's poster (VAL-OPUS-045): its first step, settled, on the 16:10 desktop stage,
 * with the labels and without the interaction prompt, on a transparent background. It captures under
 * reduced motion, after pressing Start, so a first step whose text names a looping motion gives the
 * same still every run: the moment the scene holds for readers who ask for less motion.
 *
 *   node scripts/capture-explainer-posters.ts [--out out | --base-url URL] [--ids arm,hand]
 *
 * The page shows the poster until the scene runs, when WebGL is unavailable, in print and under
 * reduced motion until the reader presses Start. Rerun it after a change to an explainer's first step.
 */
import { mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { EXPLAINER_ORDER, POSTER_SIZE } from '../components/explainers/catalog.ts';
import { serveExport } from '../lib/visual-capture.ts';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../playwright.config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const ids = option('--ids', EXPLAINER_ORDER.map(({ id }) => id).join(',')).split(',');
const dir = resolve('public/explainers/posters');

type Hook = { ready: boolean; live: boolean; busy: boolean; moving?: boolean };
// Everything around the scene goes transparent or away, so the poster sits on any page background.
const POSTER_CSS = `html, body, body *:not(canvas):not(.tag) { background: transparent !important; }
  [data-x="stage"] { border: 0 !important; }
  [data-x="stage"] .hint, [data-x="stage"] .status, [data-x="stage"] .start, [data-card] { display: none !important; }`;

const served = option('--base-url', '') ? null : await serveExport(resolve(option('--out', 'out')), 3210);
const base = option('--base-url', '') || served!.base;
const browser = await chromium.launch({ args: [...PLAYWRIGHT_SWIFTSHADER_ARGS] });
const failures: string[] = [];
mkdirSync(dir, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2,
    reducedMotion: 'reduce' });
  for (const id of ids) {
    const page = await context.newPage();
    page.on('pageerror', (error) => failures.push(`#${id}: page error ${error.message}`));
    await page.goto(`${base}/how-robots-work/#${id}`, { waitUntil: 'load', timeout: 120_000 });
    await page.locator('[data-x="start"]').click({ timeout: 120_000 });
    await page.waitForFunction(() => {
      const h = (window as unknown as { __explainer?: Hook }).__explainer;
      return Boolean(h?.ready && h.live && !h.busy && !h.moving);
    }, undefined, { timeout: 120_000, polling: 100 });
    // Long enough for the label fades and any damping to finish.
    await page.waitForTimeout(1200);
    await page.addStyleTag({ content: POSTER_CSS });
    await page.waitForTimeout(100);
    const png = await page.locator('[data-x="stage"]').screenshot({ omitBackground: true, animations: 'disabled' });
    const file = join(dir, `${id}.webp`);
    await sharp(png).resize(POSTER_SIZE.width, POSTER_SIZE.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(file);
    console.log(`posters: #${id} -> ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
    await page.close();
  }
  await context.close();
} finally {
  await browser.close();
  served?.server.close();
}
for (const failure of failures) console.log(`posters: ${failure}`);
if (failures.length) process.exit(1);
