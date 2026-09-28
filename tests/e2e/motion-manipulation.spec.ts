import { expect, test } from '@playwright/test';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { ACTION_DIMS, binIndex, generateActionChunk, tokenForBin } from '@/lib/action-tokenization';
import { ACTION_DECODE_SCENE } from '@/components/motion/scenes/action-decode';
import { beatSpans } from '@/components/motion/timeline';

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

test('paired manipulation labs use action/reference roles and only highlight the current selection', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        const role = (name: string) => page.evaluate((value) => {
          const probe = document.createElement('span');
          probe.style.color = `var(--role-${value})`;
          document.body.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        }, name);
        const paint = (selector: string, property: string) =>
          page.locator(selector).first().evaluate((node, field) =>
            getComputedStyle(node).getPropertyValue(field), property);

        await page.goto('/manipulation/pi-line/', { waitUntil: 'networkidle' });
        const flow = page.getByRole('img', { name: /2D action-space view/i });
        await expect(flow).toBeVisible();
        const action = await role('action-graphic');
        const reference = await role('reference-graphic');
        expect(await flow.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(action);
        expect(await flow.locator('circle').last().evaluate((node) => getComputedStyle(node).fill)).toBe(action);
        for (const target of await flow.locator('g:has(> path)').all()) {
          expect(await target.locator('path').evaluate((node) => getComputedStyle(node).stroke)).toBe(reference);
          expect(await target.locator('text').evaluate((node) => getComputedStyle(node).fill)).toBe(await role('reference-text'));
        }
        await page.getByRole('slider', { name: /integration steps/i }).fill('5');
        expect(await flow.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(action);

        await page.goto('/manipulation/vla-models/', { waitUntil: 'networkidle' });
        const bin = page.getByRole('img', { name: /binning detail/i });
        const chunk = page.getByRole('img', { name: /continuous action chunk/i });
        await expect(bin).toBeVisible();
        expect(await chunk.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(action);
        const selected = binIndex(generateActionChunk()[0][7]);
        expect(await bin.locator('rect').nth(selected).evaluate((node) => getComputedStyle(node).fill)).toBe(await role('highlight-graphic'));
        expect(await bin.locator('rect').nth((selected + 1) % 256).evaluate((node) => getComputedStyle(node).fill)).not.toBe(await role('highlight-graphic'));
        await page.getByRole('button', { name: 'Δy', exact: true }).click();
        await page.getByRole('slider', { name: /control step/i }).fill('9');
        const next = binIndex(generateActionChunk()[1][9]);
        expect(await bin.locator('rect').nth(next).evaluate((node) => getComputedStyle(node).fill)).toBe(await role('highlight-graphic'));
        expect(await chunk.locator('polyline').nth(1).evaluate((node) => getComputedStyle(node).stroke)).toBe(action);
        expect(await paint('[data-testid="tok-token-readout"]', 'color')).toBe(await role('action-text'));
      } finally {
        await context.close();
      }
    }
  }
});

test('action decode prints computed toy tokens progressively at both widths', async ({ browser }) => {
  const tokens = ACTION_DIMS.map((_, index) => tokenForBin(binIndex(generateActionChunk()[index][7])));
  const spans = beatSpans(ACTION_DECODE_SCENE.beats);
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto('/manipulation/vla-models/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const scene = page.locator('[data-motion-scene="action-decode"]');
      await expect(scene.getByTestId('motion-poster')).toBeVisible();
      const labels = scene.locator('[data-scene-token]');
      await expect(labels).toHaveText(tokens);
      await scene.getByTestId('motion-poster').click();
      const scrubber = scene.getByTestId('motion-scrubber');
      await expect(scrubber).toBeVisible();
      await scrubber.fill(String(spans[2].start + spans[2].duration / 2));
      const visible = await labels.evaluateAll((nodes) => nodes
        .filter((node) => Number(node.getAttribute('opacity')) > 0.5)
        .map((node) => node.textContent));
      expect(visible).toEqual(tokens.slice(0, 4));
      expect((await scene.evaluate(auditSceneElement)).intersections).toEqual([]);
      await scrubber.fill(String(spans[2].end));
      expect(await labels.evaluateAll((nodes) => nodes.filter((node) => Number(node.getAttribute('opacity')) > 0.5).map((node) => node.textContent))).toEqual(tokens);
      expect((await scene.evaluate(auditSceneElement)).overflow).toEqual([]);
      await scrubber.fill(String(spans[3].end));
      await expect(scene.getByTestId('motion-caption')).toContainText('sequential decodes');
      await expect(labels).toHaveText(tokens);
      expect((await scene.evaluate(auditSceneElement)).intersections).toEqual([]);
    } finally {
      await context.close();
    }
  }
});
