import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { RRT_GROWTH_SCENE, rrtGrowthFrame } from '@/components/motion/scenes/rrt-growth';
import { beatSpans } from '@/components/motion/timeline';

const scenes = [
  {
    id: 'fk-chain',
    route: '/classical/kinematics/',
    captions: [/base joint places/i, /elbow adds/i, /wrist adds/i, /upstream joint changes/i],
  },
  {
    id: 'rrt-growth',
    route: '/classical/motion-planning/',
    captions: [/fixed-seed authored/i, /accepted extensions grow/i, /connection occurs only at accepted extension 288/i, /selected start-to-goal route/i],
  },
] as const;

for (const { id, route, captions } of scenes) {
  test(`${id} steps through four accessible beats without geometry or contrast failures`, async ({ browser }) => {
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
        const checkFrame = async (state: string) => {
          const result = await scene.evaluate(auditSceneElement);
          expect(result.intersections, `${id} ${width} ${state}: overlap`).toEqual([]);
          expect(result.overflow, `${id} ${width} ${state}: stage margin`).toEqual([]);
          expect(result.lowContrast, `${id} ${width} ${state}: controls`).toEqual([]);
          expect(result.textCount).toBeGreaterThan(1);
          expect(result.markCount).toBeGreaterThan(0);
        };
        await checkFrame('poster');
        await scene.evaluate((node) => node.scrollIntoView({ block: 'start' }));
        const stage = scene.locator('[data-motion-stage] svg');
        const posterBox = await stage.boundingBox();
        const posterY = await stage.evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        try {
          await expect(scrubber).toBeVisible({ timeout: 4_000 });
        } catch {
          await scene.getByTestId('motion-poster').click();
          await expect(scrubber).toBeVisible({ timeout: 10_000 });
        }
        expect((await stage.boundingBox())?.width).toBe(posterBox?.width);
        expect(await stage.evaluate((node) => node.getBoundingClientRect().top + window.scrollY)).toBe(posterY);
        await expect(scene.getByTestId('motion-caption')).toHaveAttribute('aria-live', 'polite');
        await page.keyboard.press('k');
        await page.keyboard.press('Home');
        for (let index = 0; index < captions.length; index += 1) {
          await page.keyboard.press('ArrowRight');
          await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / 4`);
          await expect(scene.getByTestId('motion-caption')).toHaveText(captions[index]);
          await expect(scrubber).toHaveAttribute('aria-valuetext', captions[index]);
          if (id === 'fk-chain') {
            if (index === 3) {
              await expect(scene.getByTestId('motion-readout')).toContainText('tip (');
            } else {
              await expect(scene.getByTestId('motion-readout')).not.toContainText('tip (');
            }
          } else if (index < 2) {
            await expect(scene.getByTestId('motion-readout')).not.toContainText('goal connection');
          } else {
            await expect(scene.getByTestId('motion-readout')).toContainText('goal connection');
          }
          await checkFrame(`beat ${index + 1}`);
        }
        await expect(scrubber).toHaveAttribute('aria-label', 'Scene timeline');
        const alternative = page.locator(`#${await scene.getAttribute('aria-describedby')}`);
        for (const caption of captions) await expect(alternative).toContainText(caption);
      } finally {
        await context.close();
      }
    }
  });

  test(`${id} shows a still under reduced motion and responds to deliberate steps`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(route, { waitUntil: 'networkidle' });
      const scene = page.locator(`[data-motion-scene="${id}"]`);
      await scene.getByTestId('motion-poster').click();
      const scrubber = scene.getByTestId('motion-scrubber');
      try {
        await expect(scrubber).toBeVisible({ timeout: 4_000 });
      } catch {
        // The SSR poster can receive a click just before hydration.
        await scene.getByTestId('motion-poster').click();
        await expect(scrubber).toBeVisible({ timeout: 10_000 });
      }
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

test('goal connection readout follows the reached tree, not the beat label', async ({ browser }) => {
  const spans = beatSpans(RRT_GROWTH_SCENE.beats);
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto('/classical/motion-planning/', { waitUntil: 'networkidle' });
      const scene = page.locator('[data-motion-scene="rrt-growth"]');
      await scene.getByTestId('motion-poster').click();
      const scrubber = scene.getByTestId('motion-scrubber');
      await expect(scrubber).toBeVisible();
      await scrubber.fill(String(spans[2].start + spans[2].duration / 2));
      await expect(scene.getByTestId('motion-caption')).toContainText('connection occurs only at accepted extension 288');
      const tree = scene.locator('[data-scene-mark="accepted-tree"]');
      expect((await tree.getAttribute('d'))?.match(/M/g)?.length).toBe(
        rrtGrowthFrame(spans[2].start + spans[2].duration / 2).iteration,
      );
      await expect(scene.getByTestId('motion-readout')).not.toContainText('goal connection');
      await expect(scene.locator('[data-scene-mark="selected-route"]')).toHaveAttribute('d', '');
      await scrubber.fill(String(spans[2].end));
      await expect(scene.getByTestId('motion-readout')).toContainText('goal connection 288 accepted extensions');
      expect((await tree.getAttribute('d'))?.match(/M/g)?.length).toBe(288);
      await expect(scene.locator('[data-scene-mark="selected-route"]')).toHaveAttribute('d', '');
      await scrubber.fill(String(spans[3].end));
      await expect(scene.locator('[data-scene-mark="selected-route"]')).toHaveAttribute('d', /^M/);
      await expect(scene.getByTestId('motion-readout')).toContainText('goal connection 288 accepted extensions');
    } finally {
      await context.close();
    }
  }
});
