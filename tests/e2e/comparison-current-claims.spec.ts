import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`comparison current claims at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/manipulation/comparison-matrix/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: info.outputPath('article-top.png') });
    const table = page.getByRole('table');
    const region = page.getByRole('region', { name: /policies across/ });
    await expect(table.locator('tbody tr')).toHaveCount(18);
    await expect(table.getByRole('columnheader', { name: 'Sources' })).toBeVisible();
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath('keyboard-table.png') });

    const weights = page.getByRole('group', { name: 'Filter by weights' });
    await weights.getByRole('button', { name: 'Not released', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(table.getByRole('row', { name: /^π0.6 / })).toHaveCount(0);
    await expect(table.getByRole('row', { name: /^π0.7 / })).toHaveCount(0);
    await page.getByLabel('Filter methods').fill('π0.');
    await weights.getByRole('button', { name: 'Not disclosed', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(table.locator('tbody tr')).toHaveCount(2);
    const row = table.getByRole('row', { name: /^π0.7 / });
    await expect(row).toContainText('50 / {15, 25}');
    await expect(row).toContainText('UR5e reference');
    await expect(table.getByRole('row', { name: /^π0.6 / })).toContainText('model card');
    await row.scrollIntoViewIfNeeded();
    await region.evaluate(el => {
      const cell = el.querySelector('tbody tr td:nth-child(4)')!;
      el.scrollLeft += cell.getBoundingClientRect().left - el.getBoundingClientRect().left - 1;
    });
    await page.screenshot({ path: info.outputPath('discrete-horizons.png') });
    await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await row.locator('[data-method-source-id="pi07-2026"]').focus();
    await expect(row.locator('[data-method-source-id="pi07-2026"]')).toBeFocused();
    await page.screenshot({ path: info.outputPath('source-links.png') });
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(table.locator('tbody tr')).toHaveCount(18);
    await expect(table.getByRole('columnheader', { name: /Year/ })).toHaveAttribute('aria-sort', 'ascending');

    const boxes = [];
    for (const id of ['pi06-model-card-2025', 'pi07-2026']) {
      const cite = page.locator(`div.prose [data-cite-id="${id}"] a`).first();
      await cite.focus();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
      boxes.push({ id, box });
      await page.screenshot({ path: info.outputPath(`${id}-tooltip.png`) });
      await cite.blur();
    }
    await page.getByRole('heading', { name: /What the matrix can establish/ }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('corrected-prose.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(await page.locator('.katex-error').count()).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ viewport, boxes, errors, outputDir: info.outputDir, captures: 7 }));
  });
}
