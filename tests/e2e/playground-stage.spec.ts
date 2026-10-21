import { expect, test, type Page } from '@playwright/test';
import { expectReach, reachFor, setSlider, techDeg, waitForArm } from './helpers/playground';

/**
 * The playground stage as an instrument: the server HTML says it is not
 * live yet, the pixel ratio is clamped, a resize keeps the arm framed, the
 * selected joint's motor takes the accent, a reach that ends out of the
 * frame is brought into view, the canvas turns and zooms from the keyboard,
 * Reset pose returns pose, target and camera to one default while keeping
 * the recorded motion, Clear removes the motion and nothing else, and
 * reduced motion keeps every control live with no eased moves.
 */

function viewport(page: Page) {
  return page.getByTestId('playground-viewport');
}

async function camera(page: Page): Promise<number[]> {
  return ((await viewport(page).getAttribute('data-camera-position')) ?? '').split(',').map(Number);
}

/** How far the camera stands from the point it turns around, in metres. */
async function cameraDistance(page: Page): Promise<number> {
  const target = ((await viewport(page).getAttribute('data-camera-target')) ?? '').split(',').map(Number);
  const position = await camera(page);
  return Math.hypot(...position.map((value, i) => value - target[i]));
}

interface StageMarks {
  total: number;
  /** Pixels in the accent: blue well above red and green. */
  accent: number;
  /** Pixels in the error red of the gap line. */
  miss: number;
  /** Pixels off the paper in the strip the hint line covers, at the stage's top. */
  underHint: number;
}

/** Reads the canvas's own pixels (no page overlay) and counts the marks on it. */
async function stageMarks(page: Page): Promise<StageMarks> {
  return page.evaluate(() => {
    const el = document.querySelector('canvas') as HTMLCanvasElement;
    const gl = (el.getContext('webgl2') ?? el.getContext('webgl')) as WebGL2RenderingContext;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
    gl.bindTexture(gl.TEXTURE_2D, prevTex);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    const paperHex = getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim().slice(1);
    const paper = [0, 2, 4].map((at) => Number.parseInt(paperHex.slice(at, at + 2), 16));
    const hint = document.querySelector('.pg-hint')?.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const hintRows = hint ? Math.ceil(((hint.bottom - box.top) * h) / box.height) : 0;
    let accent = 0;
    let miss = 0;
    let underHint = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (b > r + 35 && b > g + 15) accent++;
      if (r > g + 60 && r > b + 60) miss++;
      // readPixels rows run bottom-up: the stage's top rows come last.
      const row = h - 1 - Math.floor(i / 4 / w);
      if (row < hintRows && (Math.abs(r - paper[0]) > 3 || Math.abs(g - paper[1]) > 3 || Math.abs(b - paper[2]) > 3)) underHint++;
    }
    return { total: w * h, accent, miss, underHint };
  });
}

/** Share of canvas pixels painted in the accent. */
async function accentShare(page: Page): Promise<number> {
  const marks = await stageMarks(page);
  return marks.accent / marks.total;
}

test.describe('playground stage', () => {
  test('the server HTML marks the playground as not yet live', async ({ request }) => {
    const html = await (await request.get('/playground/')).text();
    expect(html).toContain('data-playground-state="loading"');
    expect(html).not.toContain('data-playground-state="ready"');
    // The deck's places are already laid out, so nothing jumps on load.
    expect(html).toContain('Base turn');
    expect(html).toContain('Gripper open');
  });

  test('clamps the pixel ratio to 2 and sizes the drawing buffer from it', async ({ browser }) => {
    test.setTimeout(60_000);
    for (const [scale, expected] of [[1, 1], [3, 2]] as const) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: scale });
      const page = await context.newPage();
      await page.goto('/playground');
      await waitForArm(page);
      await expect(viewport(page)).toHaveAttribute('data-dpr', String(expected), { timeout: 10_000 });
      const box = (await page.locator('canvas').boundingBox())!;
      const [w, h] = ((await viewport(page).getAttribute('data-drawing-buffer')) ?? '').split('x').map(Number);
      expect(Math.abs(w - box.width * expected)).toBeLessThanOrEqual(2);
      expect(Math.abs(h - box.height * expected)).toBeLessThanOrEqual(2);
      await context.close();
    }
  });

  test('a resize keeps the canvas filling the stage and widens the lens on a narrow stage', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/playground');
    await waitForArm(page);
    const wideFov = Number(await viewport(page).getAttribute('data-camera-fov'));
    expect(wideFov).toBeGreaterThanOrEqual(30);

    await page.setViewportSize({ width: 390, height: 844 });
    const stage = (await viewport(page).boundingBox())!;
    await expect
      .poll(async () => (await page.locator('canvas').boundingBox())!.width, { timeout: 10_000 })
      .toBeCloseTo(stage.width, 0);
    await expect
      .poll(async () => Number(await viewport(page).getAttribute('data-camera-fov')), { timeout: 10_000 })
      .not.toBe(wideFov);
    // A 5:4 phone stage keeps the explainers' horizontal view: a lens wider than 30 degrees.
    const narrowFov = Number(await viewport(page).getAttribute('data-camera-fov'));
    expect(narrowFov).toBeGreaterThan(30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('working a slider lights that joint\'s motor in the accent, and only then', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/playground');
    await waitForArm(page);
    await expect.poll(() => accentShare(page), { timeout: 10_000 }).toBe(0);

    const slider = page.getByTestId('joint-slider-elbow_flex');
    await slider.focus();
    await expect(slider.locator('xpath=ancestor::li')).toHaveAttribute('data-active', '');
    await expect.poll(() => accentShare(page), { timeout: 10_000 }).toBeGreaterThan(0.0005);

    await slider.blur();
    await expect(slider.locator('xpath=ancestor::li')).not.toHaveAttribute('data-active', '');
    await expect.poll(() => accentShare(page), { timeout: 10_000 }).toBe(0);
  });

  test('a reach that ends out of the frame is brought into view: the target, its ring and the dashed gap, under the hint', async ({ page }) => {
    test.setTimeout(180_000);
    for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.goto('/playground');
      await waitForArm(page);
      const home = await viewport(page).getAttribute('data-camera-position');

      // 60 cm forward and 50 cm up: past the arm's reach, and above and
      // beyond the home view, so the stretched arm would leave the stage.
      // 120 cm forward and 100 cm up: a view past the default orbit limits,
      // which must not clamp it back.
      const far = { x: 1.2, y: 0, z: 1 };
      const outOfReach = async (target: typeof far) => {
        const at = `${target.x * 100} cm forward and ${target.z * 100} cm up at ${size.width} px`;
        await reachFor(page, target);
        await expectReach(page, 'unreachable', 10_000);
        await expect
          .poll(async () => {
            const marks = await stageMarks(page);
            return { gapLine: marks.miss >= 30, target: marks.accent >= 30, clearOfHint: marks.underHint === 0 };
          }, { timeout: 15_000, message: `the out-of-reach verdict for ${at} is drawn in view` })
          .toEqual({ gapLine: true, target: true, clearOfHint: true });
      };
      await outOfReach({ x: 0.6, y: 0, z: 0.5 });
      await outOfReach(far);
      const farDistance = await cameraDistance(page);

      // A reach near the base afterwards brings the view back in, so the arm
      // is not left small on an empty stage. Either verdict will do: the
      // solver's wall-clock guard can cut a solve from the stretched pose
      // short on a loaded software renderer, and the view follows the reach
      // once it settles, whatever the verdict.
      await reachFor(page, { x: 0.3, y: 0.1, z: 0.1 });
      await expectReach(page, /^(reached|unreachable)$/, 15_000);
      await expect
        .poll(async () => {
          const marks = await stageMarks(page);
          const closer = (await cameraDistance(page)) < 0.75 * farDistance;
          return { closer, target: marks.accent >= 30, clearOfHint: marks.underHint === 0 };
        }, { timeout: 15_000, message: `a near reach after a far one is framed closer at ${size.width} px` })
        .toEqual({ closer: true, target: true, clearOfHint: true });

      // Reset pose still brings the view home from a far reach...
      await outOfReach(far);
      await page.getByRole('button', { name: 'Reset pose' }).click();
      await expect(viewport(page)).toHaveAttribute('data-camera-position', home!, { timeout: 15_000 });

      // ...and the default limits with it: zooming out from home stops at
      // the orbit's 2.2 m, not at the distance the far reach needed.
      await page.locator('canvas').focus();
      for (let i = 0; i < 12; i += 1) await page.keyboard.press('-');
      await expect.poll(() => cameraDistance(page), { timeout: 5_000 }).toBeGreaterThan(2.15);
      expect(await cameraDistance(page)).toBeLessThanOrEqual(2.2 + 1e-3);
    }
  });

  test('the canvas turns and zooms from the keyboard, with a visible focus ring', async ({ page }) => {
    await page.goto('/playground');
    await waitForArm(page);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await expect(canvas).toHaveAccessibleName(/arrow keys to turn/);
    await canvas.focus();
    expect(await canvas.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');

    const home = await camera(page);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => camera(page)).not.toEqual(home);
    const turned = await camera(page);
    const distance = (c: number[], t: number[]) => Math.hypot(c[0] - t[0], c[1] - t[1], c[2] - t[2]);
    const target = ((await viewport(page).getAttribute('data-camera-target')) ?? '').split(',').map(Number);
    await page.keyboard.press('+');
    await expect.poll(async () => distance(await camera(page), target)).toBeLessThan(distance(turned, target) - 0.01);
  });

  test('Reset pose restores pose, target and camera, and keeps the motion; Clear removes only the motion', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/playground');
    await waitForArm(page);
    const home = await viewport(page).getAttribute('data-camera-position');

    await page.getByTestId('trajectory-record').click();
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '35');
    await setSlider(page.getByTestId('joint-slider-wrist_flex'), '-20');
    await page.getByTestId('trajectory-record').click();
    await expect(page.getByTestId('trajectory-count')).toHaveText('2 poses · 1.2 s');

    const canvas = page.locator('canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 + 30, { steps: 10 });
    await page.mouse.up();
    await expect(viewport(page)).not.toHaveAttribute('data-camera-position', home!);

    await page.getByRole('button', { name: 'Reset pose' }).click();
    for (const joint of ['shoulder_pan', 'wrist_flex']) {
      await expect(page.getByTestId(`tech-joint-${joint}`)).toHaveText('+0.0°');
    }
    await expect(page.getByTestId('tech-target')).toHaveText('none');
    // The move takes 0.9 s; the budget is for software rendering under load.
    await expect(viewport(page)).toHaveAttribute('data-camera-position', home!, { timeout: 15_000 });
    await expect(page.getByTestId('trajectory-count')).toHaveText('2 poses · 1.2 s');

    // Clear removes the poses and leaves pose and camera where they are.
    await setSlider(page.getByTestId('joint-slider-shoulder_pan'), '20');
    await page.getByTestId('trajectory-clear').click();
    await expect(page.getByTestId('trajectory-count')).toHaveText('No poses yet');
    await expect(page.getByTestId('tech-joint-shoulder_pan')).toHaveText('+20.0°');
    await expect(viewport(page)).toHaveAttribute('data-camera-position', home!);
  });

  test('reduced motion keeps the live scene and its controls, and resets the view at once', async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/playground');
    await waitForArm(page);
    // Reduced motion never selects the static fallback.
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.getByText(/WebGL is not available/i)).toHaveCount(0);
    const home = await viewport(page).getAttribute('data-camera-position');

    const before = await page.locator('canvas').screenshot();
    await setSlider(page.getByTestId('joint-slider-shoulder_lift'), '-40');
    expect(await techDeg(page, 'shoulder_lift')).toBeCloseTo(-40, 1);
    expect(Buffer.compare(before, await page.locator('canvas').screenshot())).not.toBe(0);

    await page.locator('canvas').focus();
    await page.keyboard.press('ArrowRight');
    await expect(viewport(page)).not.toHaveAttribute('data-camera-position', home!);
    const framesBefore = Number(await viewport(page).getAttribute('data-scene-frame'));
    await page.getByRole('button', { name: 'Reset pose' }).click();
    // No eased move: the first frame drawn after the press already shows the
    // home view (an eased move would show the view part-way).
    await expect
      .poll(async () => Number(await viewport(page).getAttribute('data-scene-frame')), { timeout: 15_000, intervals: [10, 20, 50] })
      .toBeGreaterThan(framesBefore);
    await expect(viewport(page)).toHaveAttribute('data-camera-position', home!, { timeout: 0 });
  });
});
