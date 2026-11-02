import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIGURES = [
  { id: 'model-based-loop', route: '/world-models/model-based-robot-learning/', series: 6 },
  { id: 'world-model-evaluation-ladder', route: '/world-models/evaluation/', series: 5 },
  { id: 'world-model-output-times', route: '/world-models/world-models-vs-simulators/', series: 6 },
] as const;

for (const width of [375, 1440]) {
  for (const { id, route, series } of FIGURES) {
    test(`${id} at ${width}px preserves sourced geometry, keyboard disclosure and an accessible description`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const figure = page.locator(`[data-figure-frame="${id}"]`);
      await expect(figure).toBeVisible();
      await figure.scrollIntoViewIfNeeded();
      const svg = figure.locator('svg[data-chart]');
      await expect(svg.locator('[data-series]')).toHaveCount(series);
      const name = await svg.getAttribute('aria-label');
      const descriptionId = await svg.getAttribute('aria-describedby');
      expect(name!.length).toBeLessThan((await page.locator(`[id="${descriptionId}"]`).textContent())!.length);
      const visible = await figure.evaluate(root => {
        const svg = root.querySelector('svg[data-chart]')!;
        const bounds = svg.getBoundingClientRect();
        const labels = [...svg.querySelectorAll('text')].map(el => ({ text: el.textContent, rect: el.getBoundingClientRect() }));
        const clipped = labels.filter(({ rect }) => rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1);
        const collisions: string[] = [];
        for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) {
          const x = labels[a].rect, y = labels[b].rect;
          if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1) {
            collisions.push(`${labels[a].text} / ${labels[b].text}`);
          }
        }
        return { clipped: clipped.map(label => label.text), collisions, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      expect(visible).toEqual({ clipped: [], collisions: [], overflow: false });
      expect(await figure.locator('[data-scene-readout]').count()).toBeLessThanOrEqual(3);
      await figure.screenshot({ path: info.outputPath(`${id}-${width}.png`) });
      const fold = figure.locator('[data-figure-fold="method"]');
      await expect(fold).not.toHaveAttribute('open');
      const disclosure = fold.locator(':scope > summary');
      await disclosure.focus();
      await page.keyboard.press('Enter');
      await expect(fold).toHaveAttribute('open', '');
      await expect(disclosure).toBeFocused();
      if (id === 'model-based-loop') {
        await expect(fold).toContainText('model updates need not follow every action');
        await expect(svg.locator('[data-series]')).toHaveCount(6);
      } else if (id === 'world-model-evaluation-ladder') {
        await expect(svg).toContainText('SimFoundry: 0.911 correlation');
        await expect(fold).toContainText('rank violation 0.018');
        await expect(fold).toContainText('Neither number is a success percentage or proof of safety');
      } else {
        const expected = [['3dgs', 0.01], ['dreamzero', 0.15], ['1xwm', 12], ['vjepa2', 16], ['predict2', 85.26], ['cosmos-planner', 240]] as const;
        for (const [system, seconds] of expected) {
          await expect(svg.locator(`[data-series="${system}"]`)).toHaveAttribute('data-seconds', String(seconds));
        }
        const table = fold.getByRole('table');
        await expect(table.getByRole('row')).toHaveCount(7);
        await expect(table).toContainText('at most 0.01 second');
        await expect(table).toContainText('85.26 seconds');
        await expect(table).toContainText('11 + 1 = 12 seconds');
        await expect(table).toContainText('GPU model and count are not disclosed');
        const [jepa, cosmos] = await Promise.all(['vjepa2', 'cosmos-planner'].map(system => svg.locator(`[data-series="${system}"] circle`).getAttribute('cx')));
        expect(Number(cosmos) - Number(jepa)).toBeCloseTo(Math.log10(15) / Math.log10(300 / 0.01) * 316, 2);
      }
      const axe = await new AxeBuilder({ page }).include(`[data-figure-frame="${id}"]`).analyze();
      expect(axe.violations).toEqual([]);
      await disclosure.focus();
      await page.keyboard.press('Enter');
      await expect(fold).not.toHaveAttribute('open');
      await page.emulateMedia({ forcedColors: 'active' });
      await expect(svg).toBeVisible();
      await expect(disclosure).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
