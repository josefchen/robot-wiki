import {
  archivedExpectedRed,
  test,
  expect,
} from './brand-v2-static-fixture';

test.describe('brand-v2 core visual authority', () => {
  test('home public identity exposes the v2 contract', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 core visual authority', 'VAL-B2-ID-001'),
    );
    await page.goto(`${staticBase}/`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Robot Wiki' }),
    ).toBeVisible();
  });

  test('home descriptor exposes the exact v2 contract', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 core visual authority', 'VAL-B2-ID-002'),
    );
    await page.goto(`${staticBase}/`);
    await expect(
      page.getByText(
        'Citation-first encyclopedia of modern robot learning.',
        { exact: true },
      ),
    ).toHaveCount(1);
  });

  test('home display identity resolves to Tektur Variable', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed(
        'brand-v2 core visual authority',
        'VAL-B2-TYPE-003',
      ),
    );
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => document.fonts.ready);
    const family = await page
      .getByRole('heading', { level: 1 })
      .evaluate((node) => getComputedStyle(node).fontFamily);
    expect(family).toContain('Tektur');
  });

  test('runtime signal token resolves to exact v2 blue', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 core visual authority', 'VAL-B2-COL-002'),
    );
    await page.goto(`${staticBase}/`);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-signal')
          .trim()
          .toUpperCase(),
      ),
    ).toBe('#245FFF');
  });

  test('runtime paper token resolves to exact v2 foundation', async ({
    page,
    staticBase,
  }) => {
    test.fail(
      true,
      archivedExpectedRed('brand-v2 core visual authority', 'VAL-B2-COL-003'),
    );
    await page.goto(`${staticBase}/`);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-paper')
          .trim()
          .toUpperCase(),
      ),
    ).toBe('#F5F6F7');
  });
});
