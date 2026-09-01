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
      const readHex = (name: string) => {
        const value = style.getPropertyValue(name).trim().toUpperCase();
        // The authored tokens are pinned as uppercase six-digit literals by
        // design-system-contract.test.ts. Lightning CSS may shorten #FFFFFF
        // to #fff in the production bundle, so normalize only the runtime
        // representation before comparing the resolved semantic value.
        return /^#[0-9A-F]{3}$/.test(value)
          ? `#${value.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`
          : value;
      };
      return {
        signal: readHex('--color-signal'),
        focus: readHex('--color-focus'),
        selection: readHex('--color-selection'),
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
      const read = (name: string) => {
        const value = style.getPropertyValue(name).trim().toUpperCase();
        // Source-format drift is guarded separately; this accepts only the
        // production optimizer's equivalent three-digit runtime spelling.
        return /^#[0-9A-F]{3}$/.test(value)
          ? `#${value.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`
          : value;
      };
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
