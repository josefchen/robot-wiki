import { expect, test } from '@playwright/test';
import { waitForHydration } from './interaction-ready';

test('opening citations keeps horizontal scrolling inside the comparison table', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-hardware/research-arms-compared/#mechanics');

  const row = page.getByRole('row').filter({ hasText: '700 mm (store), 769 mm (docs)' });
  const region = row.locator('xpath=ancestor::*[@role="region"][1]');
  const pageOverflows = () => page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);

  await expect(row).toHaveCount(1);
  expect(await region.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  for (const id of ['trossen-widowx-ai-2026', 'trossen-wxai-docs-2026']) {
    const cite = row.locator(`[data-cite-id="${id}"]`);
    const marker = cite.locator('sup a');
    const note = cite.locator('[data-sidenote]');
    await waitForHydration(marker);
    await marker.focus();
    await marker.press('Enter');
    await expect(note).toBeVisible();
    await expect(marker).toBeFocused();
    expect(await pageOverflows()).toBe(false);
    await marker.press('Enter');
    await expect(note).toBeHidden();

    await marker.press('Enter');
    await note.getByRole('link', { name: /Jump to the full reference/ }).press('Enter');
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    await page.goBack();
    await expect(page).toHaveURL(/#mechanics$/);
    expect(await pageOverflows()).toBe(false);
  }
});
