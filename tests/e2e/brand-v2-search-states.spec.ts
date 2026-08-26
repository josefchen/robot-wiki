import type { Page } from '@playwright/test';
import { expect, test } from './brand-v2-static-fixture';

async function disableStructuredSearchIndex(page: Page) {
  await page.route('**/search-index.json', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{}',
    }),
  );
}

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

  test('shows the product unavailable state when both search indexes fail', async ({
    page,
    staticBase,
  }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'text/javascript',
        body: 'search index unavailable',
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    await page
      .getByRole('searchbox', { name: 'Search the wiki' })
      .fill('action chunking');

    await expect(page.getByRole('status').first()).toHaveText(
      'The search index is unavailable',
    );
    await expect(page.getByRole('note')).toContainText(
      /search index is unavailable in this environment/i,
    );
  });

  test('keeps the later query when an earlier request resolves after it', async ({
    page,
    staticBase,
  }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `
          window.__brandV2SearchRequests = [];
          window.__brandV2SearchCompletions = [];
          let releaseFirst;
          window.__brandV2ReleaseFirstSearch = () => releaseFirst?.();
          export async function search(query) {
            window.__brandV2SearchRequests.push(query);
            if (query === 'first query') {
              await new Promise((resolve) => {
                releaseFirst = resolve;
              });
            }
            const later = query === 'second query';
            window.__brandV2SearchCompletions.push(query);
            return {
              results: [{
                data: async () => ({
                  url: later
                    ? '/manipulation/diffusion-policy/'
                    : '/manipulation/action-chunking/',
                  meta: {
                    title: later ? 'Diffusion Policy' : 'Action Chunking',
                  },
                  excerpt: later ? 'second query result' : 'first query result',
                  content: later ? 'second query result' : 'first query result',
                }),
              }],
            };
          }
        `,
      }),
    );
    await disableStructuredSearchIndex(page);
    await page.goto(`${staticBase}/search/`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });

    await input.fill('first query');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & { __brandV2SearchRequests?: string[] }
            ).__brandV2SearchRequests ?? [],
        ),
      )
      .toContain('first query');

    await input.fill('second query');
    await expect(page.getByRole('link', { name: /^Diffusion Policy/ })).toBeVisible();
    await page.evaluate(() => {
      (
        window as Window & {
          __brandV2ReleaseFirstSearch?: () => void;
        }
      ).__brandV2ReleaseFirstSearch?.();
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __brandV2SearchCompletions?: string[];
              }
            ).__brandV2SearchCompletions ?? [],
        ),
      )
      .toContain('first query');
    await expect(page.getByRole('link', { name: /^Diffusion Policy/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Action Chunking/ }),
    ).toHaveCount(0);
  });
});
