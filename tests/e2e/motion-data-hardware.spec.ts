import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';

const scenes = [
  {
    id: 'farm-throughput',
    route: '/data-hardware/data-bottleneck/',
    captions: [/authored inputs/i, /low-rate hypothetical/i, /dedicated-farm hypothetical/i, /same target/i],
  },
  {
    id: 'episode-survival',
    route: '/data-hardware/evaluation-crisis/',
    captions: [/first decision/i, /fourteen decisions/i, /thirty decisions/i, /conditional-probability assumption/i],
  },
  {
    id: 'jam-overhead',
    route: '/data-hardware/industrial-deployment/',
    captions: [/authored cell/i, /short jam/i, /long clearing/i, /same success rate/i],
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
