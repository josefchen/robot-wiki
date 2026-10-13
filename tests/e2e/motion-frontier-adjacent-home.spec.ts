import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

const scenes = [
  {
    id: 'tactile-slip',
    route: '/frontier/dexterity/',
    captions: [/holds a glass/i, /slips between the fingers/i, /fingertip sensors feel/i, /touch sensors can still notice/i],
  },
  {
    id: 'sense-avoid',
    route: '/adjacent/drones/',
    captions: [/spots a wall/i, /quick camera/i, /slower camera/i, /same swerving skill/i],
  },
] as const;

for (const { id, route, captions } of scenes) {
  test(`${id} has four audited keyboard beats at both widths`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
      try {
        const page = await context.newPage();
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const scene = page.locator(`[data-motion-scene="${id}"]`);
        await expect(scene.getByTestId('motion-poster')).toBeVisible();
        await expect(scene.getByTestId('motion-scrubber')).toHaveCount(0);
        await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
        const audit = async (state: string) => {
          const result = await scene.evaluate(auditSceneElement);
          expect(result.intersections, `${id} ${width} ${state}: text/mark overlap`).toEqual([]);
          expect(result.overflow, `${id} ${width} ${state}: stage overflow`).toEqual([]);
          expect(result.lowContrast, `${id} ${width} ${state}: control contrast`).toEqual([]);
          expect(result.markCount).toBeGreaterThan(0);
        };
        await audit('poster');
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        await expect(scrubber).toBeVisible();
        await page.keyboard.press('k');
        await page.keyboard.press('Home');
        for (let index = 0; index < captions.length; index += 1) {
          await page.keyboard.press('ArrowRight');
          await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / 4`);
          await expect(scene.getByTestId('motion-caption')).toHaveText(captions[index]);
          await expect(scrubber).toHaveAttribute('aria-valuetext', captions[index]);
          await audit(`beat ${index + 1}`);
        }
        const alternative = page.locator(`#${await scene.getAttribute('aria-describedby')}`);
        for (const caption of captions) await expect(alternative).toContainText(caption);
      } finally {
        await context.close();
      }
    }
  });

  test(`${id} keeps reduced-motion control at beat end states`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(route, { waitUntil: 'networkidle' });
      const scene = page.locator(`[data-motion-scene="${id}"]`);
      await scene.getByTestId('motion-poster').click();
      await expect(scene.getByTestId('motion-scrubber')).toBeVisible();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await openAdjustMore(scene);
      await scene.getByRole('button', { name: /step back one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[2]);
      await openAdjustMore(scene);
      await scene.getByRole('button', { name: /step forward one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await scene.getByTestId('motion-scrubber').fill('0');
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[0]);
    } finally {
      await context.close();
    }
  });
}

test('home features the humanoid explainer as its only figure, with no motion scene or calculator', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const frame = page.locator('main [data-explainer-scene="humanoid"]');
  await expect(frame).toHaveCount(1);
  await expect(page.locator('main [data-motion-scene]')).toHaveCount(0);
  await expect(page.getByTestId('episode-success-readout')).toHaveCount(0);
  await expect(frame.locator('[data-x="poster"]')).toBeVisible();
  // The explainer waits for the reader, then runs its own first step.
  await frame.getByRole('button', { name: 'Turn it in 3D' }).click();
  await page.waitForFunction(
    () => (window as unknown as { __explainer?: { live: boolean } }).__explainer?.live === true,
    undefined,
    { timeout: 45_000 },
  );
  await expect(frame.locator('canvas')).toBeVisible();
  await expect(frame.locator('[data-readout]')).toContainText('1.32 metres');
  await frame.getByRole('button', { name: 'Next' }).click();
  await expect(frame.locator('[data-step-text]')).toContainText('It has 23 motors');
});

test('the home explainer labels its motors inside the stage, at both widths and in both colour schemes', async ({ browser }) => {
  test.setTimeout(240_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto('/', { waitUntil: 'networkidle' });
        const frame = page.locator('main [data-explainer-scene="humanoid"]');
        const stage = frame.locator('[data-x="stage"]');
        // The poster stands until the reader starts the scene.
        await expect(frame.locator('[data-x="poster"]')).toBeVisible();
        await expect(stage.locator('canvas')).toHaveCount(0);
        await frame.getByRole('button', { name: 'Turn it in 3D' }).click();
        await page.waitForFunction(
          () => (window as unknown as { __explainer?: { live: boolean } }).__explainer?.live === true,
          undefined,
          { timeout: 60_000 },
        );
        await expect(stage.locator('canvas')).toBeVisible();
        await expect(frame.locator('[data-readout]')).toContainText('1.32 metres tall, about 35 kilograms');
        await frame.getByRole('button', { name: 'Next', exact: true }).click();
        const predict = frame.locator('[data-predict]');
        await expect(predict).toContainText('Where do most of its 23 motors go?');
        await predict.getByRole('button', { name: 'Legs' }).click();
        await expect(frame.locator('[data-readout]')).toContainText('legs 12, arms 10, waist 1. That is all 23');
        const box = (await stage.boundingBox())!;
        for (const label of ['Legs: 12 motors', 'Arms: 10 motors', 'Waist: 1 motor']) {
          const tag = stage.locator('.tag', { hasText: label });
          await expect(tag, `${colorScheme} ${width}px ${label}`).toBeVisible();
          const tagBox = (await tag.boundingBox())!;
          expect(tagBox.x, `${colorScheme} ${width}px ${label} left edge`).toBeGreaterThanOrEqual(box.x - 1);
          expect(tagBox.x + tagBox.width, `${colorScheme} ${width}px ${label} right edge`)
            .toBeLessThanOrEqual(box.x + box.width + 1);
        }
        // The parts are listed for the keyboard while the step lets the reader tap one.
        await expect(frame.locator('[data-parts]')).toBeVisible();
        expect(errors, `${colorScheme} ${width}px page errors`).toEqual([]);
      } finally {
        await context.close();
      }
    }
  }
});

test('sense-and-avoid keeps a fixed swerve against 70, 135 and 200 ms delay', async ({ browser }) => {
  test.setTimeout(150_000);
  // Distance drawn per metre of the 8 m sensing range; the swerve lasts 2 sqrt(0.75 / 25) s.
  const PX_PER_M = (300 - 64) / 8;
  const avoidS = 2 * Math.sqrt(0.75 / 25);
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        await page.goto('/adjacent/drones/', { waitUntil: 'networkidle' });
        const scene = page.locator('[data-motion-scene="sense-avoid"]');
        await scene.getByTestId('motion-poster').click();
        const scrub = scene.getByTestId('motion-scrubber');
        await expect(scrub).toBeVisible();
        await page.keyboard.press('k');
        const widthOf = (mark: string) => scene.locator(`[data-scene-mark="${mark}"]`)
          .evaluate((node) => Number(node.getAttribute('width')));
        const readout = scene.getByTestId('motion-readout');
        const speeds: number[] = [];
        for (const [time, delay, kmh] of [[2000, 70, 69], [3000, 135, 60], [4000, 200, 53]] as const) {
          await scrub.fill(String(time));
          await expect(readout).toContainText(`about ${kmh} km/h`);
          // The delay itself moved into the method note; the stage names no milliseconds.
          await expect(readout).not.toContainText(/\d\s?ms\b/);
          const speed = 8 / (delay / 1000 + avoidS);
          expect(await widthOf('latency-budget')).toBeCloseTo(speed * (delay / 1000) * PX_PER_M, 1);
          expect(await widthOf('avoidance-budget')).toBeCloseTo(speed * avoidS * PX_PER_M, 1);
          const label = await readout.innerText();
          speeds.push(Number(label.match(/top safe speed about (\d+) km\/h/)?.[1]));
          const audit = await scene.evaluate(auditSceneElement);
          expect([...audit.intersections, ...audit.overflow, ...audit.lowContrast], `${colorScheme} ${width} ${delay} ms`).toEqual([]);
        }
        expect(speeds[0]).toBeGreaterThan(speeds[1]);
        expect(speeds[1]).toBeGreaterThan(speeds[2]);
        await openHowThisWasMade(scene);
        await expect(scene.getByTestId('sense-avoid-method')).toContainText('about 346 ms');
      } finally {
        await context.close();
      }
    }
  }
});
