import {
  archivedExpectedRed,
  test,
  expect,
} from './brand-v2-static-fixture';

test.describe('brand-v2 OG authority', () => {
  test('site metadata carries exact v2 identity and descriptor', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 OG authority', 'VAL-B2-ID-009'),
    );
    await page.goto(`${staticBase}/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      'Robot Wiki',
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute(
      'content',
      'Citation-first encyclopedia of modern robot learning.',
    );
  });

  test('article metadata uses compact Robot Wiki without the descriptor', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 OG authority', 'VAL-B2-ID-009'),
    );
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      'Robot Wiki',
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).not.toHaveAttribute(
      'content',
      'Citation-first encyclopedia of modern robot learning.',
    );
  });
});
