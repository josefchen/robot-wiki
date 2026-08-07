import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('home page smoke', () => {
  test('renders the atlas heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'robot-atlas' }),
    ).toBeVisible();
  });

  test('has zero axe accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
