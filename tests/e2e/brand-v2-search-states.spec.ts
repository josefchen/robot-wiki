import { expect, test } from './brand-v2-static-fixture';

test.describe('brand-v2-search-states', () => {
  test('covers deterministic results, Methods facet, URL sync, focus retention, and recovery', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('action chunking');
    await expect(page.getByRole('status').first()).not.toContainText(/searching/i);
    const methods = page.getByRole('button', { name: /^Methods/ }).first();
    await methods.click();
    await expect(methods).toBeFocused();
    expect(page.url()).toContain('q=action');
    await input.fill('quartz-lantern-7319');
    await expect(page.getByRole('status').first()).toContainText(
      /No article prose and no method, company or dataset entity matches/,
    );
  });
});
