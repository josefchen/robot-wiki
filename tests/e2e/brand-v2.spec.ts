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
    await page.goto(`${staticBase}/`);
    expect(await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        signal: style.getPropertyValue('--color-signal').trim().toUpperCase(),
        focus: style.getPropertyValue('--color-focus').trim(),
        selection: style.getPropertyValue('--color-selection').trim(),
      };
    })).toEqual({
      signal: '#245FFF',
      focus: '#245FFF',
      selection: '#C6FF19',
    });
  });

  test('runtime paper token resolves to exact v2 foundation', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    expect(await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const read = (name: string) =>
        style.getPropertyValue(name).trim().toUpperCase();
      return {
        foundation: [
          read('--color-ink'),
          read('--color-graphite'),
          read('--color-concrete'),
          read('--color-paper'),
          read('--color-white'),
          read('--color-highlight'),
        ],
        semantic: [
          read('--color-ok'),
          read('--color-warn'),
          read('--color-error'),
          read('--color-destructive'),
        ],
        spacing: [
          read('--space-4'),
          read('--space-8'),
          read('--space-12'),
          read('--space-16'),
          read('--space-24'),
          read('--space-32'),
          read('--space-48'),
          read('--space-64'),
          read('--space-96'),
          read('--space-128'),
        ],
      };
    })).toEqual({
      foundation: [
        '#0B0B0C',
        '#242D33',
        '#D9DADB',
        '#F5F6F7',
        '#FFFFFF',
        '#C6FF19',
      ],
      semantic: ['#1A6F45', '#8A5A00', '#A52A1E', '#6B1839'],
      spacing: [
        '4PX',
        '8PX',
        '12PX',
        '16PX',
        '24PX',
        '32PX',
        '48PX',
        '64PX',
        '96PX',
        '128PX',
      ],
    });
  });
});
