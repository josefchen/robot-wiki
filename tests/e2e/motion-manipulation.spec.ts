import { expect, test } from '@playwright/test';
import { binIndex, generateActionChunk } from '@/lib/action-tokenization';
import { endpointDispersion, generateFlowField, transportVelocity } from '@/lib/flow-matching';
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
        // The field table paints in the drawing's grey inks with one lit part: the ink the stylus lays down, in
        // the page's one accent, ending on its landing hop mark. The two pockets (the good moves) keep the plain
        // structure ink, and no words sit in the drawing.
        const drawingInk = (token: string) => page.evaluate(([value, selector]) => {
          const probe = document.createElement('span');
          probe.style.color = `var(${value})`;
          document.querySelector(selector)!.closest('[data-figure-stage]')!.querySelector('[data-anatomy-drawing]')!.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        }, [token, flowStage] as const);
        const litInk = await drawingInk('--anatomy-lit');
        const plainInk = await drawingInk('--anatomy-mid');
        const ink = flow.getByTestId('fm-ink');
        await expect(flow.locator('[data-tone="lit"], .iso-solid[data-lit]')).toHaveCount(1);
        expect(await ink.locator('.iso-line[data-tone="lit"]').evaluate((node) => getComputedStyle(node).stroke)).toBe(litInk);
        expect(await ink.locator('[data-hop]').last().evaluate((node) => getComputedStyle(node).fill)).toBe(litInk);
        const modes = await flow.locator('[data-flow-mode]').all();
        expect(modes).toHaveLength(2);
        for (const target of modes) {
          expect(await target.locator('.iso-line').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(plainInk);
        }
        await expect(flow.locator('text, title, desc, foreignObject')).toHaveCount(0);
        // The numbers come from the model: the ink's hops, one vane per hop turned to the velocity that hop reads
        // (action x runs along the plate's -x), and the mean endpoint error in the readout.
        const field = generateFlowField();
        const followed = field.samples[0]!;
        const readsTheModel = async (steps: number) => {
          await expect(page.getByTestId('fm-step-readout')).toHaveText(`${steps} steps`);
          await expect(page.getByTestId('fm-dispersion-readout')).toHaveText(endpointDispersion(field, steps).toFixed(2));
          await expect(ink).toHaveAttribute('data-hops', String(steps));
          await expect(ink.locator('[data-hop]')).toHaveCount(steps + 1);
          const vanes = flow.locator('[data-flow-reading]');
          await expect(vanes).toHaveCount(steps);
          for (let hop = 0; hop < steps; hop++) {
            const v = transportVelocity(followed, hop / steps);
            await expect(vanes.nth(hop)).toHaveAttribute('data-angle', Math.atan2(v.y, -v.x).toFixed(4));
          }
        };
        await readsTheModel(10);
        // The step presets are the main view; five steps is π0.6's and π0.7's setting.
        await page.getByRole('button', { name: /^5 steps/ }).click();
        await readsTheModel(5);
        expect(await ink.locator('.iso-line[data-tone="lit"]').evaluate((node) => getComputedStyle(node).stroke)).toBe(litInk);

        await page.goto('/manipulation/vla-models/', { waitUntil: 'networkidle' });
        await expect(page.locator('[data-motion-scene]')).toHaveCount(0);
        const bin = page.getByRole('img', { name: /binning detail/i });
        const chunk = page.getByRole('img', { name: /continuous action chunk/i });
        await expect(bin).toBeVisible();
        const tokenStage = '[data-testid="tok-token-readout"]';
        // The rack bank paints in the stage's grey inks with one lit part: the
        // setter on the gantry, edged in the page's one accent; the close-up's
        // lit part is the slider seated in the assigned notch.
        const accent = await page.evaluate((selector) => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--accent)';
          document.querySelector(selector)!.closest('[data-figure-stage]')!.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        }, tokenStage);
        const lit = chunk.locator('.iso-solid[data-lit] > .iso-edge');
        await expect(lit).toHaveCount(1);
        expect(await lit.evaluate((node) => getComputedStyle(node).stroke)).toBe(accent);
        expect(await bin.locator('.iso-solid[data-lit] > .iso-edge').first().evaluate((node) => getComputedStyle(node).stroke)).toBe(accent);
        // The main view zooms into the assigned slot; the full 256-slot
        // strip, where the nth rect is slot n, waits in "Adjust more".
        const selected = binIndex(generateActionChunk()[0][7]);
        await expect(bin.locator('[data-selection="assigned bin"]')).toHaveAttribute('data-notch', String(selected));
        const highlight = await stageRole('highlight-stage', tokenStage);
        const frame = page.locator('[data-figure-frame="action-tokenization"]');
        await openAdjustMore(frame);
        const strip = frame.getByTestId('tok-bin-strip');
        expect(await strip.locator('rect').nth(selected).evaluate((node) => getComputedStyle(node).fill)).toBe(highlight);
        expect(await strip.locator('rect').nth((selected + 1) % 256).evaluate((node) => getComputedStyle(node).fill)).not.toBe(highlight);
        await frame.getByRole('button', { name: 'left/right', exact: true }).click();
        await page.getByRole('slider', { name: /control step/i }).fill('9');
        const next = binIndex(generateActionChunk()[1][9]);
        expect(await strip.locator('rect').nth(next).evaluate((node) => getComputedStyle(node).fill)).toBe(highlight);
        // The chosen rack is now left/right, its slider in the notch of its word.
        await expect(chunk.locator('[data-selection="selected motion"]')).toHaveAttribute('data-motion', 'left/right');
        await expect(chunk.locator('[data-selection="selected motion"]')).toHaveAttribute('data-word', String(next));
        await expect(bin.locator('[data-selection="assigned bin"]')).toHaveAttribute('data-notch', String(next));
        // The readout's word reads in the readout's own ink: no colour on text.
        expect(await paint(tokenStage, 'color')).toBe(await paint('[data-figure-frame="action-tokenization"] [data-readout]', 'color'));
      } finally {
        await context.close();
      }
    }
  }
});
