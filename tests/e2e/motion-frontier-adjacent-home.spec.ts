import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';

const scenes = [
  {
    id: 'reliability-threshold',
    route: '/frontier/reliability-gap/',
    captions: [/episode/i, /95%/i, /99.9%/i, /same horizon/i],
  },
  {
    id: 'tactile-slip',
    route: '/frontier/dexterity/',
    captions: [/object/i, /slips/i, /touch/i, /same object/i],
  },
  {
    id: 'sense-avoid',
    route: '/adjacent/drones/',
    captions: [/obstacle/i, /camera/i, /delay/i, /same obstacle/i],
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

test('home features the reliability scene as its only figure, with no calculator', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('[data-motion-scene="reliability-threshold"]');
  await expect(scene.getByTestId('motion-poster')).toBeVisible();
  await expect(page.locator('main [data-motion-scene]')).toHaveCount(1);
  await expect(page.getByTestId('episode-success-readout')).toHaveCount(0);
  await scene.getByTestId('motion-poster').click();
  await expect(scene.getByTestId('motion-scrubber')).toBeVisible();
  await page.keyboard.press('k');
  await page.keyboard.press('End');
  await scene.getByRole('button', { name: /step back one beat/i }).click();
  await expect(scene.getByTestId('motion-caption')).toContainText('99.9%');
});

test('sense-and-avoid keeps a fixed maneuver against 70, 135 and 200 ms delay', async ({ browser }) => {
  test.setTimeout(150_000);
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
        for (const [time, delay] of [[3000, 70], [4000, 135], [5000, 200]] as const) {
          await scrub.fill(String(time));
          await expect(readout).toContainText(`${delay} ms`);
          await expect(readout).toContainText('346 ms');
          expect(await widthOf('latency-budget')).toBeCloseTo(delay * 0.43, 1);
          expect(await widthOf('avoidance-budget')).toBeCloseTo(2 * Math.sqrt(0.75 / 25) * 430, 1);
          const label = await readout.innerText();
          speeds.push(Number(label.match(/maximum speed ([\d.]+) m\/s/)?.[1]));
          const audit = await scene.evaluate(auditSceneElement);
          expect([...audit.intersections, ...audit.overflow, ...audit.lowContrast], `${colorScheme} ${width} ${delay} ms`).toEqual([]);
        }
        expect(speeds[0]).toBeGreaterThan(speeds[1]);
        expect(speeds[1]).toBeGreaterThan(speeds[2]);
        await expect(scene).toContainText('≈346 ms');
      } finally {
        await context.close();
      }
    }
  }
});

test('reliability labels arrive with their bars, including on home', async ({ browser }) => {
  test.setTimeout(150_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        for (const route of ['/frontier/reliability-gap/', '/']) {
          await page.goto(route, { waitUntil: 'networkidle' });
          const scene = page.locator('[data-motion-scene="reliability-threshold"]');
          await scene.getByTestId('motion-poster').click();
          const scrub = scene.getByTestId('motion-scrubber');
          await expect(scrub).toBeVisible();
          await page.keyboard.press('k');
          const label = (value: string) => scene.locator('svg text').filter({ hasText: new RegExp(`^${value.replace('.', '\\.')}$`) });
          await scrub.fill('1000');
          await expect(scene.getByTestId('motion-caption')).toContainText('21.5%');
          expect(await label('95%').getAttribute('opacity')).toBe('1');
          for (const value of ['99%', '74.0%', '99.9%', '97.0%']) {
            expect(await label(value).getAttribute('opacity'), `${route} ${value} before its bar`).toBe('0');
          }
          await scrub.fill('3000');
          expect(await label('99%').getAttribute('opacity')).toBe('1');
          expect(await label('74.0%').getAttribute('opacity')).toBe('1');
          expect(await label('99.9%').getAttribute('opacity')).toBe('0');
          await scrub.fill('5000');
          expect(await label('99.9%').getAttribute('opacity')).toBe('1');
          expect(await label('97.0%').getAttribute('opacity')).toBe('1');
          await expect(scene).toContainText('Illustrative model: all 30 decisions succeed independently at the same rate.');
          await expect(scene).not.toContainText('calculator below');
          const audit = await scene.evaluate(auditSceneElement);
          expect([...audit.intersections, ...audit.overflow, ...audit.lowContrast], `${route} ${colorScheme} ${width}`).toEqual([]);
        }
      } finally {
        await context.close();
      }
    }
  }
});
