import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';

const scenes = [
  {
    id: 'batch-scale',
    route: '/rl-sim2real/parallel-sim-rl/',
    captions: [/64 parallel environments/i, /4,096 environments/i, /CPU-side work/i, /16,384 environments/i],
  },
  {
    id: 'gait-support',
    route: '/rl-sim2real/legged-locomotion/',
    captions: [/walk/i, /trot/i, /bound/i, /pronk/i],
  },
] as const;

for (const { id, route, captions } of scenes) {
  test(`${id} stays legible and reader-controlled through four beats`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
      try {
        const page = await context.newPage();
        const missingAssets: string[] = [];
        page.on('response', (response) => {
          if (response.status() === 404 && response.url().includes('/_next/static/')) {
            missingAssets.push(response.url());
          }
        });
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const scene = page.locator(`[data-motion-scene="${id}"]`);
        await expect(scene.getByTestId('motion-poster')).toBeVisible();
        await expect(scene.getByTestId('motion-scrubber')).toHaveCount(0);
        await expect(scene.getByTestId('motion-caption')).toHaveText(captions[3]);
        const audit = async (state: string) => {
          const result = await scene.evaluate(auditSceneElement);
          expect(result.intersections, `${id} ${width} ${state}: overlap`).toEqual([]);
          expect(result.overflow, `${id} ${width} ${state}: stage margin`).toEqual([]);
          expect(result.lowContrast, `${id} ${width} ${state}: controls`).toEqual([]);
          expect(result.markCount).toBeGreaterThan(0);
        };
        await audit('poster');
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        try {
          await expect(scrubber).toBeVisible({ timeout: 4_000 });
        } catch {
          await scene.getByTestId('motion-poster').click();
          await expect(scrubber).toBeVisible({ timeout: 10_000 });
        }
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
        expect(missingAssets, `${id} ${width}: missing development chunks`).toEqual([]);
      } finally {
        await context.close();
      }
    }
  });

  test(`${id} offers end-state stepping and scrubbing under reduced motion`, async ({ browser }) => {
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
