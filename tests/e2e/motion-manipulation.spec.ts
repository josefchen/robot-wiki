import { expect, test } from '@playwright/test';
import { binIndex, generateActionChunk } from '@/lib/action-tokenization';
import { openAdjustMore } from './helpers/figure-fold';

test('paired manipulation labs use action/reference roles and only highlight the current selection', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        // Figures paint on the page stage, which maps every role to its stage
        // colour, so a stage mark is compared with a probe inside it.
        const stageRole = (name: string, anchor: string) => page.evaluate(([value, selector]) => {
          const probe = document.createElement('span');
          probe.style.color = `var(--role-${value})`;
          document.querySelector(selector)!.closest('[data-figure-stage]')!.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        }, [name, anchor] as const);
        const paint = (selector: string, property: string) =>
          page.locator(selector).first().evaluate((node, field) =>
            getComputedStyle(node).getPropertyValue(field), property);

        await page.goto('/manipulation/pi-line/', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-motion-scene]')).toHaveCount(0);
        const flow = page.getByRole('img', { name: /2D action-space view/i });
        await expect(flow).toBeVisible();
        const flowStage = '[data-testid="fm-step-readout"]';
        const action = await stageRole('action-graphic', flowStage);
        const reference = await stageRole('reference-graphic', flowStage);
        expect(await flow.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(action);
        expect(await flow.locator('circle').last().evaluate((node) => getComputedStyle(node).fill)).toBe(action);
        const modes = await flow.locator('g:has(> path)').all();
        expect(modes.length).toBeGreaterThan(0);
        for (const target of modes) {
          expect(await target.locator('path').evaluate((node) => getComputedStyle(node).stroke)).toBe(reference);
          expect(await target.locator('text').evaluate((node) => getComputedStyle(node).fill)).toBe(await stageRole('reference-text', flowStage));
        }
        // The step presets are the main view; five steps is π0.6's and π0.7's setting.
        await page.getByRole('button', { name: /^5 steps/ }).click();
        await expect(page.getByTestId('fm-step-readout')).toHaveText('5 steps');
        expect(await flow.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(action);

        await page.goto('/manipulation/vla-models/', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-motion-scene]')).toHaveCount(0);
        const bin = page.getByRole('img', { name: /binning detail/i });
        const chunk = page.getByRole('img', { name: /continuous action chunk/i });
        await expect(bin).toBeVisible();
        const tokenStage = '[data-testid="tok-token-readout"]';
        // On the light page stage the selection paints in the stage variant
        // of the highlight role, the dark lime that holds contrast on paper.
        const highlight = await stageRole('highlight-stage', tokenStage);
        expect(await chunk.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(await stageRole('action-graphic', tokenStage));
        // The main view zooms into the assigned slot; the full 256-slot
        // strip, where the nth rect is slot n, waits in "Adjust more".
        expect(await bin.locator('rect[data-selection="assigned bin"]').evaluate((node) => getComputedStyle(node).fill)).toBe(highlight);
        const frame = page.locator('[data-figure-frame="action-tokenization"]');
        await openAdjustMore(frame);
        const strip = frame.getByTestId('tok-bin-strip');
        const selected = binIndex(generateActionChunk()[0][7]);
        expect(await strip.locator('rect').nth(selected).evaluate((node) => getComputedStyle(node).fill)).toBe(highlight);
        expect(await strip.locator('rect').nth((selected + 1) % 256).evaluate((node) => getComputedStyle(node).fill)).not.toBe(highlight);
        await frame.getByRole('button', { name: 'left/right', exact: true }).click();
        await page.getByRole('slider', { name: /control step/i }).fill('9');
        const next = binIndex(generateActionChunk()[1][9]);
        expect(await strip.locator('rect').nth(next).evaluate((node) => getComputedStyle(node).fill)).toBe(highlight);
        // The one trace under the gripper now follows the left/right motion.
        await expect(chunk.locator('[data-selection="selected motion"]')).toHaveText('left/right');
        expect(await chunk.locator('polyline').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(await stageRole('action-graphic', tokenStage));
        expect(await paint(tokenStage, 'color')).toBe(await stageRole('action-text', tokenStage));
      } finally {
        await context.close();
      }
    }
  }
});
