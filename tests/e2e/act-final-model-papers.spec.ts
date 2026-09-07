import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`ACT final model paper settings and comparison at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/manipulation/action-chunking/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const boxes = [];
    for (const id of ['pi0-2024', 'pi06-model-card-2025', 'pi07-2026']) {
      const cite = page.locator(`div.prose [data-cite-id="${id}"] a`).first();
      await cite.focus();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
      boxes.push({ id, box });
      await page.screenshot({ path: info.outputPath(`${viewport.width}-${id}-tooltip.png`) });
      await cite.blur();
    }
    const table = page.getByRole('table', { name: /Action horizon/ });
    await expect(table.getByRole('row', { name: /^pi0.6 / })).toContainText('model card');
    await expect(table.getByRole('row', { name: /^pi0.7 / })).toContainText('either 15 or 25');
    await expect(table.getByRole('row', { name: /^pi0.7 / })).toContainText('UR5e reference');
    await table.getByRole('row', { name: /^pi0.6 / }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-ACT-horizons.png`) });
    const region = page.getByRole('region', { name: /Action horizon/ });
    await region.focus();
    await page.keyboard.press('ArrowRight');
    if (viewport.width === 375) {
      await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    }
    await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.screenshot({ path: info.outputPath(`${viewport.width}-ACT-availability.png`) });
    for (const id of ['pi06-model-card-2025', 'pi07-2026']) {
      await page.locator(`div.prose [data-cite-id="${id}"]`).first().locator('..').scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${viewport.width}-${id}-note.png`) });
    }
    expect(await page.locator('.katex-error').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/manipulation/comparison-matrix/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('row', { name: /^π0.7 / })).toContainText('50 / {15, 25}');
    await page.getByLabel('Filter methods').fill('π0.');
    await page.getByRole('group', { name: 'Filter by weights' }).getByRole('button', { name: 'Not disclosed' }).click();
    const comparison = page.getByRole('table');
    await expect(comparison.getByRole('row')).toHaveCount(3);
    await expect(comparison.getByRole('row', { name: /^π0.6 / })).toContainText('model card');
    await expect(comparison.getByRole('row', { name: /^π0.7 / })).toContainText('paper');
    await comparison.scrollIntoViewIfNeeded();
    const compareRegion = page.getByRole('region', { name: /policies across/ });
    if (viewport.width === 375) {
      await compareRegion.evaluate(el => {
        const cell = el.querySelector('tbody tr td:nth-child(4)')!;
        el.scrollLeft += cell.getBoundingClientRect().left - el.getBoundingClientRect().left - 1;
      });
      const cell = await comparison.getByRole('row', { name: /^π0.7 / }).getByRole('cell').nth(3).boundingBox();
      const bounds = await compareRegion.boundingBox();
      expect(cell!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(cell!.x + cell!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    } else {
      await compareRegion.evaluate(el => { el.scrollLeft = 250; });
    }
    await page.screenshot({ path: info.outputPath(`${viewport.width}-comparison-horizons.png`) });
    await compareRegion.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.screenshot({ path: info.outputPath(`${viewport.width}-comparison-availability.png`) });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ viewport, boxes, errors, captures: 9, outputDir: info.outputDir }));
  });
}
