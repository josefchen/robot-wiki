import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/data-hardware/datasets/';

test.describe('data-hardware datasets module', () => {
  test('renders prose naming the five dataset families', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Major Datasets' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // VAL-DATA-005: all five families named in the prose.
    for (const name of [
      /Open X-Embodiment/,
      /DROID/,
      /BridgeData V2/,
      /AgiBot World/,
      /RoboMIND/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Major Datasets' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips resolve and link externally (VAL-DATA-006)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Walke 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2308.12952');
    await expect(
      main.getByRole('link', { name: /Wu 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2412.13877');
    await expect(
      main.getByRole('link', { name: /AgiBot 2026/ }).first(),
    ).toHaveAttribute(
      'href',
      'https://huggingface.co/datasets/agibot-world/AgiBotWorld2026',
    );
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(12);
  });

  test('table renders six rows, each with a source link (VAL-DATA-007, VAL-DATA-010)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /robot-manipulation datasets/i,
    });
    await expect(table).toBeVisible();
    const rows = table.getByRole('row');
    // Header plus six dataset rows.
    await expect(rows).toHaveCount(7);
    for (const name of [
      /Open X-Embodiment/,
      'DROID',
      /BridgeData V2/,
      /AgiBot World/,
      /RoboMIND/,
    ]) {
      await expect(table.getByText(name).first()).toBeVisible();
    }
    const bodyRows = table.locator('tbody tr');
    for (let i = 0; i < (await bodyRows.count()); i += 1) {
      const links = bodyRows.nth(i).locator('a[href^="http"]');
      expect(await links.count()).toBeGreaterThanOrEqual(1);
    }
    // VAL-DATA-009: unpublished figures render as not disclosed, never as numbers.
    const unreleased = table.locator('tbody tr', {
      hasText: 'AgiBot World 2026',
    });
    expect(await unreleased.getByText('not disclosed', { exact: true }).count()).toBeGreaterThanOrEqual(4);
  });

  test('size, embodiment, and task filters work and compose (VAL-DATA-008)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const readout = page.getByText(/\d+ of 6 datasets/);

    // Size filter.
    await page.getByRole('button', { name: '1M+ episodes' }).click();
    await expect(page.getByText('2 of 6 datasets')).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'DROID' }),
    ).toHaveCount(0);

    // Compose with the embodiment filter.
    await page.getByRole('button', { name: 'Multi-platform' }).click();
    await expect(page.getByText('1 of 6 datasets')).toBeVisible();

    // Compose with the task filter; OXE is the only 1,000+ task dataset.
    await page.getByRole('button', { name: '1,000+ tasks' }).click();
    await expect(page.getByText('1 of 6 datasets')).toBeVisible();

    // Reset restores the full set.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('6 of 6 datasets')).toBeVisible();
    await expect(readout).toBeVisible();
  });

  test('filter buttons and sort headers are keyboard operable', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const singlePlatform = page.getByRole('button', {
      name: 'Single platform',
    });
    await singlePlatform.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('4 of 6 datasets')).toBeVisible();
    await expect(singlePlatform).toHaveAttribute('aria-pressed', 'true');

    const sortByYear = page.getByRole('button', { name: 'Sort by Year' });
    await sortByYear.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('columnheader', { name: /year/i }),
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
