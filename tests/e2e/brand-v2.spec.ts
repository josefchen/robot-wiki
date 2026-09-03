import {
  archivedExpectedRed,
  brandV2Registry,
  test,
  expect,
} from './brand-v2-static-fixture';

/**
 * Every contract colour, authored in app/globals.css as an uppercase
 * six-digit literal and pinned in that exact source form by
 * tests/unit/design-system-contract.test.ts.
 */
const CONTRACT_HEX = [
  '#0B0B0C',
  '#242D33',
  '#D9DADB',
  '#F5F6F7',
  '#FFFFFF',
  '#C6FF19',
  '#245FFF',
  '#1A6F45',
  '#8A5A00',
  '#A52A1E',
  '#6B1839',
] as const;

/**
 * Lightning CSS collapses a six-digit hex whose channel pairs repeat, so
 * `--color-white: #FFFFFF` is served as `#fff` in the production bundle while
 * every other contract colour keeps six digits (measured in
 * out/_next/static/chunks/*.css). Because the authored source form is guarded
 * separately, the runtime comparison only has to accept the optimizer's
 * equivalent spelling — and it accepts the exact shorthand OF A CONTRACT
 * COLOUR rather than expanding any three-digit token, so an authored or
 * resolved value like `#ABC` is left alone and still fails.
 */
const SHORTHAND_TO_CONTRACT_HEX = new Map<string, string>(
  CONTRACT_HEX.flatMap<[string, string]>((hex) => {
    const repeatedPairs = /^#([0-9A-F])\1([0-9A-F])\2([0-9A-F])\3$/.exec(hex);
    return repeatedPairs
      ? [[`#${repeatedPairs[1]}${repeatedPairs[2]}${repeatedPairs[3]}`, hex]]
      : [];
  }),
);

function canonicalToken(value: string): string {
  return SHORTHAND_TO_CONTRACT_HEX.get(value) ?? value;
}

const readRootTokens = (names: readonly string[]): string[] => {
  const style = getComputedStyle(document.documentElement);
  return names.map((name) => style.getPropertyValue(name).trim().toUpperCase());
};

/**
 * The sealed runtime token set, in one place, because the colour assertions
 * (VAL-B2-COL-001/002/003) and the semantic-token assertion
 * (VAL-B2-COMP-012) are scoped to the public-route population: measuring the
 * tokens on the home route alone leaves the other routes unmeasured, and a
 * route-scoped `passed` row would then quantify over a population no run
 * visited.
 */
const SEALED_ROOT_TOKENS = [
  ['--color-ink', '#0B0B0C'],
  ['--color-graphite', '#242D33'],
  ['--color-concrete', '#D9DADB'],
  ['--color-paper', '#F5F6F7'],
  ['--color-white', '#FFFFFF'],
  ['--color-highlight', '#C6FF19'],
  ['--color-signal', '#245FFF'],
  ['--color-focus', '#245FFF'],
  ['--color-selection', '#C6FF19'],
  ['--color-ok', '#1A6F45'],
  ['--color-warn', '#8A5A00'],
  ['--color-error', '#A52A1E'],
  ['--color-destructive', '#6B1839'],
] as const;

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
    const [signal, focus, selection] = await page.evaluate(readRootTokens, [
      '--color-signal',
      '--color-focus',
      '--color-selection',
    ]);
    expect({
      signal: canonicalToken(signal),
      focus: canonicalToken(focus),
      selection: canonicalToken(selection),
    }).toEqual({
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
    const FOUNDATION = [
      '--color-ink',
      '--color-graphite',
      '--color-concrete',
      '--color-paper',
      '--color-white',
      '--color-highlight',
    ] as const;
    const SEMANTIC = [
      '--color-ok',
      '--color-warn',
      '--color-error',
      '--color-destructive',
    ] as const;
    const SPACING = [
      '--space-4',
      '--space-8',
      '--space-12',
      '--space-16',
      '--space-24',
      '--space-32',
      '--space-48',
      '--space-64',
      '--space-96',
      '--space-128',
    ] as const;
    const raw = await page.evaluate(readRootTokens, [
      ...FOUNDATION,
      ...SEMANTIC,
      ...SPACING,
    ]);
    // Non-vacuous guard for SHORTHAND_TO_CONTRACT_HEX: `--color-white` is the
    // one contract colour the optimizer can shorten, so the mapping stays
    // exercised rather than becoming a blanket loosening nothing depends on.
    expect(['#FFFFFF', '#FFF']).toContain(raw[FOUNDATION.indexOf('--color-white')]);
    const canonical = raw.map(canonicalToken);
    expect({
      foundation: canonical.slice(0, FOUNDATION.length),
      semantic: canonical.slice(
        FOUNDATION.length,
        FOUNDATION.length + SEMANTIC.length,
      ),
      spacing: canonical.slice(FOUNDATION.length + SEMANTIC.length),
    }).toEqual({
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

  test('every public route resolves the sealed palette exactly', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    expect(routes.length).toBeGreaterThan(5);
    const names = SEALED_ROOT_TOKENS.map(([name]) => name);
    const expected = Object.fromEntries(
      routes.map((route) => [
        route,
        SEALED_ROOT_TOKENS.map(([, value]) => value),
      ]),
    );
    const observed: Record<string, string[]> = {};
    for (const route of routes) {
      const response = await page.goto(`${staticBase}${route}`);
      expect(response?.status(), route).toBe(200);
      const raw = await page.evaluate(readRootTokens, names);
      observed[route] = raw.map(canonicalToken);
    }
    expect(observed).toEqual(expected);
  });
});
