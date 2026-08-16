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
    // Software-rendered WebGL under parallel load can need well over 10s
    // for the first real frame; give the pixel poll room to see it.
    test.setTimeout(60_000);
    const { consoleErrors, pageErrors } = collectErrors(page);
    await page.goto('/playground');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    const status = await waitForArm(page);
    await expect(status).toContainText('so-101');
    await expect(status).toContainText(/6 joints/);

    // The canvas must contain more than the flat background: sample pixels.
    // With frameloop="demand" the first real frame renders on the next rAF
    // after the model-load invalidate, so a single immediate readPixels can
    // legally beat it and see a clear buffer. Poll until the arm is on
    // screen instead of sampling once.
    //
    // The read goes through an explicit blit: the context is antialiased,
    // and plain readPixels on a multisampled default framebuffer
    // nondeterministically returns zeros under SwiftShader. Blitting the
    // default framebuffer into our own FBO resolves it deterministically.
    const readNonBackgroundRatio = () =>
      page.evaluate(() => {
        const el = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = (el.getContext('webgl2') ??
          el.getContext('webgl')) as WebGL2RenderingContext;
        const bw = gl.drawingBufferWidth;
        const bh = gl.drawingBufferHeight;

        // Save and restore every piece of GL state we touch so the app's
        // renderer never observes the detour.
        const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
        const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
        const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          bw,
          bh,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
          gl.DRAW_FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          tex,
          0,
        );
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.blitFramebuffer(
          0,
          0,
          bw,
          bh,
          0,
          0,
          bw,
          bh,
          gl.COLOR_BUFFER_BIT,
          gl.NEAREST,
        );
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
        const pixels = new Uint8Array(bw * bh * 4);
        gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
        gl.bindTexture(gl.TEXTURE_2D, prevTex);
        gl.deleteFramebuffer(fb);
        gl.deleteTexture(tex);

        let nonBackground = 0;
        // Background is #0b0d0e (11, 13, 14). Count pixels clearly above it.
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 90) nonBackground++;
        }
        return nonBackground / (bw * bh);
      });
    // Headless SwiftShader can kill the GL context under load; a lost
    // context never repaints, so give each attempt a bounded poll and
    // retry on a fresh page (fresh context) before calling it a failure.
    let rendered = false;
    for (let attempt = 0; attempt < 3 && !rendered; attempt += 1) {
      try {
        await expect
          .poll(readNonBackgroundRatio, {
            timeout: 15_000,
            intervals: [100, 200, 400, 800, 1_500, 3_000],
          })
          .toBeGreaterThan(0.01);
        rendered = true;
      } catch {
        if (attempt < 2) {
          await page.reload();
          await waitForArm(page);
        }
      }
    }
    expect(rendered).toBe(true);

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

    await expect(page.getByText(/WebGL is not available/i)).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
