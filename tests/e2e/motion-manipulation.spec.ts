import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';

const scenes = [
  {
    id: 'action-decode',
    route: '/manipulation/vla-models/',
    captions: [/continuous action coordinate/i, /256 bins/i, /seven tokens/i, /sequential decodes/i],
  },
  {
    id: 'flow-transport',
    route: '/manipulation/pi-line/',
    captions: [/gaussian noise/i, /Euler steps/i, /one-step endpoint/i, /two action clusters/i],
  },
] as const;

for (const { id, route, captions } of scenes) {
  test(`${id} has reader-paced captions, accessible controls, and clear geometry`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 800 : 900 },
      });
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
          expect(result.intersections, `${id} ${width} ${state} intersections`).toEqual([]);
          expect(result.overflow, `${id} ${width} ${state} overflow`).toEqual([]);
          expect(result.lowContrast, `${id} ${width} ${state} contrast`).toEqual([]);
          expect(result.textCount).toBeGreaterThan(1);
          expect(result.markCount).toBeGreaterThan(0);
        };
        await audit('poster');
        await scene.evaluate((node) => node.scrollIntoView({ block: 'start' }));
        const stage = scene.locator('[data-motion-stage] svg');
        const posterBox = await stage.boundingBox();
        const posterDocumentY = await stage.evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        try {
          await expect(scrubber).toBeVisible({ timeout: 4_000 });
        } catch {
          await scene.getByTestId('motion-poster').click();
          await expect(scrubber).toBeVisible({ timeout: 10_000 });
        }
        const playerBox = await stage.boundingBox();
        const playerDocumentY = await stage.evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
        expect(playerBox?.width).toBe(posterBox?.width);
        expect(playerBox?.x).toBe(posterBox?.x);
        expect(playerDocumentY).toBe(posterDocumentY);
        await expect(scene.getByTestId('motion-caption')).toHaveAttribute('aria-live', 'polite');
        await page.keyboard.press('k');
        await page.keyboard.press('Home');
        for (let index = 0; index < captions.length; index += 1) {
          await page.keyboard.press('ArrowRight');
          await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / 4`);
          await expect(scene.getByTestId('motion-caption')).toHaveText(captions[index]);
          await audit(`beat ${index + 1}`);
        }
        await expect(scrubber).toHaveAttribute('aria-label', 'Scene timeline');
        const alternative = page.locator(`#${await scene.getAttribute('aria-describedby')}`);
        for (const caption of captions) await expect(alternative).toContainText(caption);
      } finally {
        await context.close();
      }
    }
  });

  test(`${id} keeps the poster still under reduced motion and steps only on request`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(route, { waitUntil: 'networkidle' });
      const scene = page.locator(`[data-motion-scene="${id}"]`);
      await scene.getByTestId('motion-poster').click();
      await expect(scene.getByTestId('motion-scrubber')).toBeVisible();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await scene.getByRole('button', { name: /step back one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[2]);
      await scene.getByRole('button', { name: /step forward one beat/i }).click();
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
      await scene.getByTestId('motion-scrubber').fill('0');
      await expect(scene.getByTestId('motion-caption')).toHaveText(captions[0]);
    } finally {
      await context.close();
    }
  });
}
