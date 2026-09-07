import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`ACT five-source correction and readable citation at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/manipulation/action-chunking/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const cite = page.locator('div.prose [data-cite-id="pi0-2024"] a').first();
    await cite.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-pi0-tooltip.png`) });
    const box = await tooltip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    await expect(tooltip).toContainText('Flow');
    await cite.blur();
    const table = page.getByRole('table', { name: /Action horizon/ });
    for (const [name, text] of [['RT-1', 'not disclosed'], ['pi0.5', 'mobile'], ['GR00T N1.7', 'inference'], ['Helix 02', 'announcement']]) {
      const row = table.getByRole('row', { name: new RegExp(`^${name.replace('.', '\\.')} `) });
      await expect(row).toContainText(text);
      await row.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${viewport.width}-${name.replaceAll(' ', '-')}.png`) });
    }
    const region = page.getByRole('region', { name: /Action horizon/ });
    await region.focus();
    await page.keyboard.press('ArrowRight');
    if (viewport.width === 375) {
      await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: info.outputPath(`${viewport.width}-table-scroll.png`) });
    for (const id of ['openpi-repo-2024','rt1-2022','pi05-2025','isaac-gr00t-repo-2026','helix-02-2026']) {
      const note = page.locator(`div.prose [data-cite-id="${id}"]`).first().locator('..');
      await note.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${viewport.width}-note-${id}.png`) });
    }
    expect(await page.locator('.katex-error').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/manipulation/comparison-matrix/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('row', { name: /^π0.5 / })).toContainText('50 / n.d.');
    const group = page.getByRole('group', { name: 'Filter by weights' });
    await group.getByRole('button', { name: 'Not disclosed' }).click();
    await expect(page.getByRole('row', { name: /^RT-1 / })).toBeVisible();
    await expect(page.getByRole('row', { name: /^Helix / })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-comparison-unknown.png`) });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ viewport, tooltipBox: box, errors, captures: 12, outputDir: info.outputDir }));
  });
}
