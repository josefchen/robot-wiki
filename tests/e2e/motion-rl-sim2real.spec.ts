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

test('paired RL figures keep value, constraint and stance roles in both schemes and changed states', async ({ browser }) => {
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
        const style = (selector: string, property: string) =>
          page.locator(selector).first().evaluate((node, field) =>
            getComputedStyle(node).getPropertyValue(field), property);

        await page.goto('/rl-sim2real/parallel-sim-rl/', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-motion-scene="batch-scale"]')).toBeVisible();
        const value = await role('value-graphic');
        const constraint = await role('constraint-graphic');
        expect(await style('[data-motion-scene="batch-scale"] [data-scene-mark="fixed-budget-time"]', 'stroke')).toBe(await role('value-stage'));
        expect(await style('[data-testid="active-curve"]', 'stroke')).toBe(value);
        expect(await style('[data-testid="breakdown-sim"]', 'fill')).toBe(value);
        expect(await style('[data-instrument-legend] span:first-child > span:first-child', 'background-color')).toBe(value);
        await page.getByRole('slider', { name: /parallel environments/i }).fill('14');
        expect(await style('[data-testid="position-marker"]', 'fill')).toBe(await role('highlight-graphic'));
        await page.getByRole('button', { name: /CPU single-core bottleneck/i }).click();
        expect(await style('[data-testid="active-curve"]', 'stroke')).toBe(constraint);
        expect(await style('[data-testid="position-marker"]', 'fill')).toBe(await role('highlight-graphic'));
        expect(await style('[data-motion-scene="batch-scale"] [data-scene-mark="cpu-cost-time"]', 'stroke')).toBe(await role('constraint-stage'));
        expect(await style('[data-testid="cpu-explanation"]', 'color')).not.toBe('');

        await page.goto('/rl-sim2real/legged-locomotion/', { waitUntil: 'networkidle' });
        const row = page.getByTestId('row-lf');
        const state = await role('state-graphic');
        expect(await row.locator('rect').last().evaluate((node) => getComputedStyle(node).fill)).toBe(state);
        expect(await style('[data-motion-scene="gait-support"] [data-scene-mark="walk-phase-0"]', 'fill')).toBe(await role('state-stage'));
        await page.getByRole('button', { name: 'Trot', exact: true }).click();
        await page.getByRole('slider', { name: /gait phase/i }).fill('50');
        expect(await row.locator('rect').last().evaluate((node) => getComputedStyle(node).fill)).toBe(state);
        expect(await style('[data-testid="playhead"] circle', 'fill')).toBe(await role('highlight-graphic'));
        expect(await style('[data-testid="stance-readout"]', 'color')).toBe(await role('state-text'));
      } finally {
        await context.close();
      }
    }
  }
});

test('paired RL stage labels render at least twelve CSS pixels across every reveal', async ({ browser }) => {
  for (const { id, route } of scenes) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const scene = page.locator(`[data-motion-scene="${id}"]`);
        const measure = async (beat: string) => {
          const sizes = await scene.locator('svg.motion-stage-svg text').evaluateAll((labels) => labels
            .filter((label) => {
              const svg = (label as SVGTextElement).ownerSVGElement!;
              const box = label.getBoundingClientRect();
              if (!box.width || !box.height) return false;
              for (let element: Element | null = label; element && element !== svg.parentElement; element = element.parentElement) {
                const style = getComputedStyle(element);
                if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) <= 0) return false;
              }
              return true;
            })
            .map((label) => {
              const text = label as SVGTextElement;
              const scale = text.getScreenCTM();
              return {
                text: text.textContent?.trim(),
                annotated: text.hasAttribute('data-scene-stage-label'),
                px: Number.parseFloat(getComputedStyle(text).fontSize) * (scale ? Math.hypot(scale.a, scale.b) : 0),
              };
            }));
          expect(sizes.length, `${id} ${width} ${beat} labels`).toBeGreaterThan(0);
          expect(sizes.some((label) => !label.annotated), `${id} ${width} ${beat} unannotated text covered`).toBe(true);
          const texts = sizes.map((label) => label.text);
          expect(texts, `${id} ${width} ${beat} stage heading`).toContain(
            id === 'gait-support' ? 'feet on ground · sampled cycle' : 'toy fixed-transition budget',
          );
          if (id === 'gait-support') {
            expect(texts, `${id} ${width} ${beat} toy disclosure`).toContain(
              'illustrative phases · no measured footfall data',
            );
          } else if (beat === 'poster' || beat === 'beat 4') {
            expect(texts, `${id} ${width} ${beat} recap`).toContain(
              'same budget · different iteration cost',
            );
          }
          for (const label of sizes) expect(label.px, `${id} ${width} ${beat} ${label.text}`).toBeGreaterThanOrEqual(12);
          const audit = await scene.evaluate(auditSceneElement);
          expect(audit.intersections, `${id} ${width} ${beat} intersections`).toEqual([]);
          expect(audit.overflow, `${id} ${width} ${beat} stage margin`).toEqual([]);
        };
        await measure('poster');
        await scene.getByTestId('motion-poster').click();
        const scrubber = scene.getByTestId('motion-scrubber');
        await expect(scrubber).toBeVisible();
        await page.keyboard.press('k');
        await page.keyboard.press('Home');
        for (let index = 0; index < 4; index += 1) {
          await page.keyboard.press('ArrowRight');
          await measure(`beat ${index + 1}`);
        }
      } finally {
        await context.close();
      }
    }
  }
});
