import { writeFile } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  { slug: 'knowledge-insulation', domain: 'manipulation', text: 'eight drawn layers', source: 'https://www.pi.website/research/knowledge_insulation' },
  { slug: 'pi-line', domain: 'manipulation', text: 'The pinned openpi README', source: 'https://arxiv.org/abs/2501.09747' },
  { slug: 'comparison-matrix', domain: 'manipulation', text: 'multi-TPU cloud service', source: 'https://arxiv.org/abs/2307.15818' },
  { slug: 'rl-finetuning', domain: 'manipulation', text: 'about a factor of two', source: 'https://www.pi.website/download/pistar06.pdf' },
  { slug: 'latent-dynamics', domain: 'world-models', text: '545M', source: 'https://arxiv.org/abs/2310.16828' },
  { slug: 'taxonomy', domain: 'world-models', text: '545M', source: 'https://arxiv.org/abs/2206.14176' },
] as const;

for (const width of [375, 1440]) {
  for (const route of routes) {
    test(`final source closeout ${route.slug} at ${width}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`/${route.domain}/${route.slug}/`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (route.slug === 'pi-line') {
        await expect(page.locator('main').getByText(/source-scoped checkpoint availability/).first()).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath('current-header.png') });
      const prose = page.locator('div.prose[data-pagefind-body]');
      const correction = prose.getByText(route.text, { exact: false }).first();
      await correction.scrollIntoViewIfNeeded();
      await expect(correction).toBeVisible();
      await page.screenshot({ path: info.outputPath('final-correction.png') });

      const measure = async (locator: Locator) => locator.evaluate(element => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left, right: box.right, top: box.top, bottom: box.bottom,
          internalOverflow: element.scrollWidth - element.clientWidth,
        };
      });
      const source = prose.locator(`a[aria-describedby][href="${route.source}"]`).first();
      // A repeatable centered focus state; this does not certify every scroll-edge placement.
      await source.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await source.focus();
      await expect(source).toBeFocused();
      const tooltip = page.getByRole('tooltip').filter({ visible: true }).first();
      await expect(tooltip).toBeVisible();
      const focused = await measure(tooltip);
      expect(focused.left).toBeGreaterThanOrEqual(0);
      expect(focused.right).toBeLessThanOrEqual(width);
      expect(focused.top).toBeGreaterThanOrEqual(0);
      expect(focused.bottom).toBeLessThanOrEqual(width === 375 ? 812 : 900);
      expect(focused.internalOverflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath('final-source-focus.png') });
      await source.evaluate(element => (element as HTMLElement).blur());
      await source.hover();
      await expect(tooltip).toBeVisible();
      const hovered = await measure(tooltip);
      expect(hovered.left).toBeGreaterThanOrEqual(0);
      expect(hovered.right).toBeLessThanOrEqual(width);
      expect(hovered.top).toBeGreaterThanOrEqual(0);
      expect(hovered.bottom).toBeLessThanOrEqual(width === 375 ? 812 : 900);
      expect(hovered.internalOverflow).toBeLessThanOrEqual(1);
      await page.mouse.move(0, 0);

      if (route.slug === 'knowledge-insulation') {
        const slider = page.getByRole('slider');
        await slider.focus();
        const initial = await slider.inputValue();
        await slider.press(initial === await slider.getAttribute('max') ? 'ArrowLeft' : 'ArrowRight');
        await expect(slider).not.toHaveValue(initial);
        await page.getByRole('button', { name: /reset/i }).click();
        await expect(slider).toHaveValue(initial);
        await page.getByTestId('mot-diagram').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('insulation-controls.png') });
      }
      if (route.slug === 'pi-line') {
        await page.getByRole('button', { name: 'π0.6-MEM', exact: true }).click();
        await expect(page.getByTestId('generation-detail')).toContainText('Date unverified');
        await expect(page.getByTestId('generation-detail')).toContainText('weights unverified');
        await expect(page.getByRole('img', { name: /Timeline of dated/ })).toHaveAccessibleDescription(/not plotted/);
        await page.getByTestId('generation-track').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('mem-unknown-state.png') });
        const mem = page.getByRole('button', { name: 'π0.6-MEM', exact: true });
        await mem.focus();
        await mem.press('ArrowRight');
        await expect(page.getByRole('button', { name: 'π0.7', exact: true })).toBeFocused();
        await page.getByTestId('generation-track').getByRole('button', { name: 'Reset' }).click();
        await expect(page.getByRole('button', { name: 'π0', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
      if (route.slug === 'comparison-matrix') {
        const weights = page.getByRole('group', { name: 'Filter by weights' });
        await weights.getByRole('button', { name: 'Not disclosed', exact: true }).click();
        await expect(page.getByRole('row', { name: /^ACT / })).toBeVisible();
        await weights.getByRole('button', { name: 'Not released', exact: true }).click();
        await expect(page.getByRole('row', { name: /^ACT / })).toHaveCount(0);
        await weights.getByRole('button', { name: 'All weights', exact: true }).click();
        await expect(page.locator('table tbody tr')).toHaveCount(18);
        const scroll = page.getByRole('region').filter({ has: page.locator('table') }).first();
        if (width === 375) {
          await expect(scroll).toHaveCount(1);
          await scroll.focus();
          const before = await scroll.evaluate(element => element.scrollLeft);
          await scroll.press('ArrowRight');
          await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(before);
          await page.screenshot({ path: info.outputPath('table-keyboard-scroll.png') });
        }
      }
      if (route.slug === 'rl-finetuning') {
        const slider = page.getByRole('slider').first();
        await slider.focus();
        const before = await slider.inputValue();
        await slider.press('ArrowRight');
        await expect(slider).not.toHaveValue(before);
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(slider).toHaveValue(before);
        await page.screenshot({ path: info.outputPath('scrubber-controls.png') });
        // rl-finetuning now ships two described charts (the advantage
        // scrubber and the EXPO-FT comparison); scope to the scrubber's
        // description panel, which is the one this block exercises.
        const description = page
          .locator('[data-chart-description]', { hasText: 'stage' })
          .first();
        await expect(description).toContainText('tinted stage blocks');
        await page.getByRole('button', { name: /training data/i }).click();
        await expect(description).toContainText('transitions between fictional stage endpoints');
        await page.screenshot({ path: info.outputPath('scrubber-training.png') });
        await page.getByRole('button', { name: /at execution/i }).click();
        await expect(description).toContainText('high-tag examples');
        await page.screenshot({ path: info.outputPath('scrubber-execution.png') });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
      }
      if (route.slug === 'latent-dynamics') {
        await expect(page.getByText('Illustrative toy, not measured model performance.', { exact: false })).toBeVisible();
        await page.getByRole('button', { name: /decoder-free/ }).click();
        await expect(page.getByTestId('decoded-frames')).toHaveCount(0);
        await expect(page.getByTestId('decoder-free-note')).toContainText('fixed multiple of the toy latent deviation');
        await page.getByTestId('decoder-free-note').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('decoder-free-toy.png') });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByRole('slider', { name: /imagination horizon/i })).toHaveValue('15');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await page.locator('.katex-error').count()).toBe(0);
      expect(errors).toEqual([]);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations).toEqual([]);
      const proofPath = info.outputPath('measured-reader-proof.json');
      await writeFile(proofPath, JSON.stringify({
        route, width, focused, hovered, overflow, pageErrors: errors, axeViolations: axe.violations,
        scope: 'Centered source focus and hover only; scroll-edge placements are not certified.',
      }, null, 2));
      await info.attach('measured-reader-proof', { path: proofPath, contentType: 'application/json' });
    });
  }
}
