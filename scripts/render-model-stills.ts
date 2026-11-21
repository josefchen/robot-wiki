/**
 * Writes each maker model's stills for /robots-in-3d/: the viewer's own canvas after "Load model",
 * at its first fitted frame, read pixel for pixel from the WebGL drawing buffer. The meshes, camera
 * fit, light and grey are therefore the viewer's, from the shipped URDF and GLB files; nothing is
 * drawn by hand. One still per stage shape, each in the window MODEL_STILLS names for it, where
 * that shape's stage is widest; the run fails if the stage there is not the width MODEL_STILLS says.
 *
 *   node scripts/render-model-stills.ts [--out out | --base-url URL]
 *
 * Rerun it after a change to a model's files or to the viewer's camera, light or material.
 */
import { join, resolve } from 'node:path';
import { statSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { MODELS_3D } from '../data/models-3d.ts';
import { MODEL_STILLS, ROBOTS_IN_3D_PATH } from '../lib/robots-in-3d-page.ts';
import { serveExport } from '../lib/visual-capture.ts';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../playwright.config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const served = option('--base-url', '') ? null : await serveExport(resolve(option('--out', 'out')), 3211);
const base = option('--base-url', '') || served!.base;
const browser = await chromium.launch({ args: [...PLAYWRIGHT_SWIFTSHADER_ARGS] });
const failures: string[] = [];
try {
  for (const still of [MODEL_STILLS.wide, MODEL_STILLS.square]) {
    // Reduced motion turns damping off, so the first fitted frame is the resting view.
    const context = await browser.newContext({ viewport: still.window, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    for (const model of MODELS_3D) {
      const page = await context.newPage();
      page.on('pageerror', (error) => failures.push(`${model.id}: page error ${error.message}`));
      await page.goto(`${base}${ROBOTS_IN_3D_PATH}`, { waitUntil: 'load', timeout: 120_000 });
      const viewer = page.locator(`[data-model-viewer="${model.id}"]`);
      await viewer.getByRole('button', { name: 'Load model' }).click();
      await page.locator(`[data-model-viewer="${model.id}"][data-drawn]`).waitFor({ timeout: 300_000 });
      await page.waitForTimeout(500);
      const frame = await viewer.locator('canvas').evaluate((canvas: HTMLCanvasElement) => ({
        png: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        stage: canvas.closest('[data-testid="model-stage"]')!.getBoundingClientRect().width,
      }));
      const aspect = still.width / still.height;
      if (Math.abs(frame.stage - still.stageWidth) > 0.5) {
        failures.push(`${model.id}: the stage is ${frame.stage} px wide at ${still.window.width} px, not ${still.stageWidth}`);
      } else if (Math.abs(frame.width / frame.height - aspect) > 0.01 || Math.abs(frame.width - still.width) > 0.01 * still.width) {
        failures.push(`${model.id}: canvas ${frame.width}x${frame.height} is not about ${still.width}x${still.height}`);
      } else {
        const file = join(model.dir, still.file);
        await sharp(Buffer.from(frame.png.split(',')[1], 'base64'))
          .resize(still.width, still.height, { fit: 'fill', kernel: 'lanczos3' })
          .webp({ quality: 90, smartSubsample: true, effort: 6 })
          .toFile(file);
        console.log(`stills: ${model.id} ${frame.width}x${frame.height} -> ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  served?.server.close();
}
for (const failure of failures) console.log(`stills: ${failure}`);
if (failures.length) process.exit(1);
