import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/data-hardware/hardware-taxonomy/';

test.describe('data-hardware hardware-taxonomy module', () => {
  test('renders prose naming the five hardware families (VAL-DATA-011)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Hardware Taxonomy' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // All five families named in the rendered prose or the guide.
    for (const label of [/Arms/, /Humanoids/, /Hands/, /Sensors/, /Compute/]) {
      await expect(
        main.getByText(label).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Hardware Taxonomy' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('guide renders 40 rows across all five categories (VAL-DATA-013)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', { name: /hardware entries/i });
    await expect(table).toBeVisible();
    const rows = table.getByRole('row');
    // Header plus 40 hardware rows.
    await expect(rows).toHaveCount(41);
    const categoryColumn = table.locator('tbody tr td:nth-child(2)');
    for (const label of ['Arm', 'Humanoid', 'Hand', 'Sensor', 'Compute']) {
      expect(
        await categoryColumn.filter({ hasText: label }).count(),
        `category ${label} missing`,
      ).toBeGreaterThanOrEqual(2);
    }
    // VAL-DATA-014: every row carries an external source link.
    const bodyRows = table.locator('tbody tr');
    for (let i = 0; i < (await bodyRows.count()); i += 1) {
      const links = bodyRows.nth(i).locator('a[href^="https"]');
      expect(await links.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('every listed price carries an explicit as-of note (VAL-DATA-012)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', { name: /hardware entries/i });
    const bodyRows = table.locator('tbody tr');
    const count = await bodyRows.count();
    let priced = 0;
    for (let i = 0; i < count; i += 1) {
      const priceCell = bodyRows.nth(i).locator('td:nth-child(3)');
      const text = (await priceCell.textContent()) ?? '';
      if (text.trim() === 'not disclosed') continue;
      priced += 1;
      expect(text, `price cell without as-of note: ${text}`).toMatch(
        /as of (?:[A-Z][a-z]{2} \d{4}|\d{4})/,
      );
    }
    expect(priced).toBeGreaterThanOrEqual(20);
  });

  test('unpublished figures render as not disclosed, never invented (VAL-DATA-015)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', { name: /hardware entries/i });
    // Tesla publishes no Optimus 3 price or DoF.
    const optimus = table.locator('tbody tr', { hasText: 'Tesla Optimus 3' });
    expect(
      await optimus.getByText('not disclosed', { exact: true }).count(),
    ).toBeGreaterThanOrEqual(3); // price, DoF, distinction
    // Boston Dynamics publishes no Atlas price, but does publish 56 DoF.
    const atlas = table.locator('tbody tr', { hasText: 'Atlas (Electric)' });
    expect(
      await atlas.locator('td:nth-child(3)').getByText('not disclosed').count(),
    ).toBe(1);
    await expect(
      atlas.locator('td:nth-child(4)').getByText(/^56/),
    ).toBeVisible();
  });

  test('citation chips resolve and link externally (VAL-DATA-014)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Shaw 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2309.06440');
    await expect(
      main.getByRole('link', { name: /Luo 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2508.11261');
    await expect(
      main.getByRole('link', { name: /NVIDIA Research 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2602.18397');
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(20);
  });

  test('price, DoF, and availability filters work and compose (VAL-DATA-016)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Category filter.
    await page.getByRole('button', { name: 'Humanoids', exact: true }).click();
    await expect(page.getByText('14 of 40 entries')).toBeVisible();

    // Compose with price: H2 ($29,900) and GR-3 ($27,500) are the $25k+ humanoids.
    await page.getByRole('button', { name: '$25k and up' }).click();
    await expect(page.getByText('2 of 40 entries')).toBeVisible();
    await expect(page.getByRole('cell', { name: /Unitree H2/ })).toBeVisible();

    // Compose with the DoF filter; GR-3 discloses no DoF, so only the H2
    // (31 DoF) survives the 30+ bucket.
    await page.getByRole('button', { name: '30+', exact: true }).click();
    await expect(page.getByText('1 of 40 entries')).toBeVisible();

    // Compose with availability; the H2 is orderable, so the row survives.
    await page.getByRole('button', { name: 'Orderable', exact: true }).click();
    await expect(page.getByText('1 of 40 entries')).toBeVisible();

    // Reset restores the full set.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('40 of 40 entries')).toBeVisible();
  });

  test('zero-result combinations show an empty state with a clear affordance', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // No sensor in the guide carries a listed price.
    await page.getByRole('button', { name: 'Sensors', exact: true }).click();
    await page.getByRole('button', { name: 'Under $1k' }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText(/no hardware matches/i);
    await status.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('40 of 40 entries')).toBeVisible();
  });

  test('filter buttons and sort headers are keyboard operable', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const arms = page.getByRole('button', { name: 'Arms', exact: true });
    await arms.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('11 of 40 entries')).toBeVisible();
    await expect(arms).toHaveAttribute('aria-pressed', 'true');

    const sortByPrice = page.getByRole('button', { name: 'Sort by Price' });
    await sortByPrice.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('columnheader', { name: /price/i }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
