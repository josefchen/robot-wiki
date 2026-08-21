import { expect, test, type Page } from '@playwright/test';

/**
 * Thin browser proof that market-map logos render. CONTRIBUTING requires
 * e2e when a browser can see the change; the component suite covers
 * onError reuse, this spec covers the three surfaces a reader actually
 * hits. Initials are only the broken-file fallback.
 */

const ROUTE = '/market-map/';

function gridLogo(page: Page, id: string) {
  return page.locator(`article[data-company-id="${id}"] [data-company-logo]`);
}

function bubbleLogo(page: Page) {
  return page.locator('[data-bubble-detail] [data-company-logo]');
}

function timelineLogo(page: Page, companyId: string) {
  return page.locator(
    `[data-timeline-id][data-company-id="${companyId}"] [data-company-logo]`,
  );
}

test.describe('market-map company logos', () => {
  test('grid cards render a real mark for licensed and official rows', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const nvidia = gridLogo(page, 'nvidia-robotics');
    await expect(nvidia).toHaveAttribute('data-logo-state', 'image');
    await expect(nvidia.locator('img')).toHaveAttribute(
      'src',
      '/images/logos/nvidia.svg',
    );

    const boston = gridLogo(page, 'boston-dynamics');
    await expect(boston).toHaveAttribute('data-logo-state', 'image');
    await expect(boston.locator('img')).toHaveAttribute(
      'src',
      '/images/logos/boston-dynamics.svg',
    );
  });

  test('bubble detail switches between two official marks', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Bubble' }).click();

    await page.locator('circle[data-company-id="figure-ai"]').click();
    await expect(page.locator('[data-bubble-detail]')).toContainText(
      'Figure AI',
    );
    await expect(bubbleLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(bubbleLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );

    await page.locator('circle[data-company-id="skild-ai"]').click();
    await expect(page.locator('[data-bubble-detail]')).toContainText('Skild AI');
    await expect(bubbleLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(bubbleLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/skild-ai.svg',
    );
  });

  test('timeline rows render official marks', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Timeline' }).click();

    const figure = timelineLogo(page, 'figure-ai');
    await expect(figure.first()).toHaveAttribute('data-logo-state', 'image');
    await expect(figure.first().locator('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );

    const skild = timelineLogo(page, 'skild-ai');
    await expect(skild.first()).toHaveAttribute('data-logo-state', 'image');
    await expect(skild.first().locator('img')).toHaveAttribute(
      'src',
      '/images/logos/skild-ai.svg',
    );
  });
});
