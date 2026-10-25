import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openArticlesPanel } from './helpers/articles-panel';

/**
 * Search e2e coverage that does not depend on the Pagefind index (the dev
 * server never serves out/pagefind, so result rendering is verified against
 * the static export instead). VAL-SEARCH-001/007/009 plus an axe pass on the
 * empty state.
 */
test.describe('search shell', () => {
  test('search page renders one labeled input and an idle state', async ({
    page,
  }) => {
    await page.goto('/search');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Search' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    const inputs = main.getByRole('searchbox');
    await expect(inputs).toHaveCount(1);
    await expect(inputs.first()).toHaveAccessibleName('Search the wiki');
    await expect(
      main.getByText(/try: temporal ensembling/i),
    ).toBeVisible();
  });

  test('shell search box lands on /search with the query preserved', async ({
    page,
  }) => {
    await page.goto('/');
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old pin typed into the persistent sidebar's search box
    // at rest; the shell's search box, with the same "Search" label, now
    // lives in the Articles panel opened from the top bar.
    await openArticlesPanel(page);
    const sidebar = page.getByRole('searchbox', { name: 'Search', exact: true });
    await sidebar.fill('temporal ensembling');
    await sidebar.press('Enter');
    await expect(page).toHaveURL(/\/search\/?\?q=temporal%20ensembling/);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('searchbox', { name: 'Search the wiki' }),
    ).toHaveValue('temporal ensembling');
  });

  test('zero axe violations on the search page idle state', async ({
    page,
  }) => {
    await page.goto('/search');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
