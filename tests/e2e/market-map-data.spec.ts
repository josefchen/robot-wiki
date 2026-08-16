import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { COMPANIES } from '../../data/companies';

/**
 * Data-layer surface for /market-map (VAL-MKT-014). The visualization
 * feature owns the filterable map; this spec only asserts that the
 * shipped dataset is wired into the existing placeholder and that the
 * page still renders with the research count.
 */

const EXPECTED_COUNT = 112;

test.describe('market-map data layer', () => {
  test('ships exactly 112 companies into the rendered placeholder', async ({
    page,
  }) => {
    expect(COMPANIES).toHaveLength(EXPECTED_COUNT);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const response = await page.goto('/market-map/');
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();
    await expect(
      page.getByText(`${EXPECTED_COUNT} companies in six segments`),
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('has no axe violations and no horizontal overflow at 375px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/market-map/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Market Map' }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
