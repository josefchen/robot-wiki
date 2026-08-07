import { expect, test, type Page } from '@playwright/test';

const MODEL_URL = /\/models\/so101\//;

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Browser-generated network noise (failed/aborted resource loads) is
    // allowed by VAL-PLAY-004 when the fallback path renders; the status
    // assertions above catch a genuinely broken happy path.
    if (/^Failed to load resource/.test(msg.text())) return;
    consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  return { consoleErrors, pageErrors };
}

async function waitForArm(page: Page) {
  const status = page.getByTestId('robot-status');
  await expect(status).not.toHaveText(/loading/i, { timeout: 15_000 });
  return status;
}

test.describe('3D playground scene and model', () => {
  test('renders the SO-101 arm in a lit, gridded canvas with zero errors', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    const status = await waitForArm(page);
    await expect(status).toContainText('so-101');
    await expect(status).toContainText(/6 joints/);

    // The canvas must contain more than the flat background: sample pixels.
    const stats = await page.evaluate(() => {
      const el = document.querySelector('canvas') as HTMLCanvasElement;
      const gl = (el.getContext('webgl2') ??
        el.getContext('webgl')) as WebGLRenderingContext;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let nonBackground = 0;
      // Background is #0b0d0e (11, 13, 14). Count pixels clearly above it.
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 90) nonBackground++;
      }
      return { total: w * h, nonBackground };
    });
    expect(stats.nonBackground / stats.total).toBeGreaterThan(0.01);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('orbit controls rotate, zoom, and pan the camera', async ({ page }) => {
    await page.goto('/playground');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await waitForArm(page);

    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Rotate: primary-button drag across the canvas.
    const before = await canvas.screenshot();
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 180, cy + 40, { steps: 12 });
    await page.mouse.up();
    const afterRotate = await canvas.screenshot();
    expect(Buffer.compare(before, afterRotate)).not.toBe(0);

    // Zoom: wheel gesture over the canvas.
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -600);
    const afterZoom = await canvas.screenshot();
    expect(Buffer.compare(afterRotate, afterZoom)).not.toBe(0);

    // Pan: secondary-button drag.
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx - 120, cy + 60, { steps: 12 });
    await page.mouse.up({ button: 'right' });
    const afterPan = await canvas.screenshot();
    expect(Buffer.compare(afterZoom, afterPan)).not.toBe(0);
  });

  test('falls back to the procedural arm when model assets are missing', async ({
    page,
  }) => {
    await page.route(MODEL_URL, (route) => route.abort());
    const { pageErrors } = collectErrors(page);
    await page.goto('/playground');

    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    const status = await waitForArm(page);
    await expect(status).toContainText('fallback');
    await expect(status).toContainText(/3 joints/);
    expect(pageErrors).toEqual([]);
  });

  test('shows a clear message when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() =>
        null) as typeof HTMLCanvasElement.prototype.getContext;
    });
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');

    await expect(
      page.getByText(/WebGL is not available/i),
    ).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
