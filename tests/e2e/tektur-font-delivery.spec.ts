import { expect, test } from './brand-v2-static-fixture';
import {
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_ROLE_INSTANCES,
} from '../../data/type-roles';

/**
 * The sealed base viewports. VAL-B2-TYPE-015 requires the rendered axis
 * values to match the registry "at every declared viewport", so a role that
 * only resolves on one width is a failure rather than a pass.
 */
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const REGISTERED_ROLE_IDS = TEKTUR_ROLE_INSTANCES.map(({ id }) => id);
const REGISTERED_CLASSES = TEKTUR_ROLE_INSTANCES.map(
  ({ cssClass }) => cssClass,
);

/** Owning route -> the roles the registry says that route mounts. */
const ROUTE_EXPECTATIONS = new Map<string, typeof TEKTUR_ROLE_INSTANCES>();
for (const instance of TEKTUR_ROLE_INSTANCES) {
  for (const route of instance.routes) {
    ROUTE_EXPECTATIONS.set(route, [
      ...(ROUTE_EXPECTATIONS.get(route) ?? []),
      instance,
    ]);
  }
}
const OWNING_ROUTES = [...ROUTE_EXPECTATIONS.keys()].sort();

type RoleMeasurement = {
  role: string;
  members: Array<{
    family: string;
    weight: string;
    stretch: string;
    variationSettings: string;
    text: string;
  }>;
};

type RouteMeasurement = {
  measured: RoleMeasurement[];
  /** Every role annotation present, registered or not. */
  annotatedRoles: string[];
  /** Elements carrying a registered display class but no registered role. */
  unannotatedClassUses: string[];
};

test.describe('Tektur role population', () => {
  for (const route of OWNING_ROUTES) {
    const expected = ROUTE_EXPECTATIONS.get(route) ?? [];
    test(`renders every registered role ${route} owns, at every declared viewport (VAL-B2-TYPE-015)`, async ({
      page,
      staticBase,
    }) => {
      const failures: string[] = [];
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(`${staticBase}${route}`);
        await page.evaluate(() => document.fonts.ready);

        const observed = await page.evaluate<
          RouteMeasurement,
          { roleIds: string[]; classes: string[] }
        >(({ roleIds, classes }) => {
          const annotated = [
            ...document.querySelectorAll<HTMLElement>('[data-tektur-role]'),
          ];
          const measured = roleIds.map((role) => ({
            role,
            members: [
              ...document.querySelectorAll<HTMLElement>(
                `[data-tektur-role="${role}"]`,
              ),
            ].map((element) => {
              const style = getComputedStyle(element);
              return {
                family: style.fontFamily,
                weight: style.fontWeight,
                stretch: style.fontStretch,
                variationSettings: style.fontVariationSettings,
                text: (element.textContent ?? '').trim().slice(0, 40),
              };
            }),
          }));
          const unannotatedClassUses = classes.flatMap((cssClass) =>
            [
              ...document.querySelectorAll<HTMLElement>(`.${cssClass}`),
            ]
              .filter(
                (element) =>
                  !roleIds.includes(
                    element.getAttribute('data-tektur-role') ?? '',
                  ),
              )
              .map((element) => `${cssClass}:${element.tagName.toLowerCase()}`),
          );
          return {
            measured,
            annotatedRoles: annotated.map(
              (element) => element.getAttribute('data-tektur-role') ?? '',
            ),
            unannotatedClassUses,
          };
        }, { roleIds: REGISTERED_ROLE_IDS, classes: REGISTERED_CLASSES });

        const where = `${route} @${viewport.name}`;
        for (const unregistered of observed.annotatedRoles.filter(
          (role) => !REGISTERED_ROLE_IDS.includes(role as never),
        )) {
          failures.push(`${where}: unregistered role annotation ${unregistered}`);
        }
        for (const use of observed.unannotatedClassUses) {
          failures.push(`${where}: display class without a role annotation (${use})`);
        }

        for (const instance of expected) {
          const measurement = observed.measured.find(
            ({ role }) => role === instance.id,
          );
          const members = measurement?.members ?? [];
          // An empty population is the failure this gate exists to catch: a
          // role the registry claims and no route renders would otherwise
          // satisfy every per-member assertion vacuously.
          if (members.length === 0) {
            failures.push(
              `${where}: role ${instance.id} rendered no member on a route the registry says owns it`,
            );
            continue;
          }
          members.forEach((member, index) => {
            const at = `${where}: ${instance.id}[${index}] "${member.text}"`;
            if (!member.family.toLowerCase().includes('tektur')) {
              failures.push(`${at} resolves ${member.family}, not Tektur`);
            }
            if (member.weight !== String(instance.wght)) {
              failures.push(
                `${at} computes weight ${member.weight}, registry says ${instance.wght}`,
              );
            }
            if (member.stretch !== `${instance.wdth}%`) {
              failures.push(
                `${at} computes stretch ${member.stretch}, registry says ${instance.wdth}%`,
              );
            }
            if (!member.variationSettings.includes(`"wght" ${instance.wght}`)) {
              failures.push(
                `${at} carries ${member.variationSettings}, registry says "wght" ${instance.wght}`,
              );
            }
            if (!member.variationSettings.includes(`"wdth" ${instance.wdth}`)) {
              failures.push(
                `${at} carries ${member.variationSettings}, registry says "wdth" ${instance.wdth}`,
              );
            }
          });
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  test('every registered role is owned by at least one public route', () => {
    const orphans = TEKTUR_ROLE_INSTANCES.filter(
      ({ routes }) => routes.length === 0,
    ).map(({ id }) => id);
    expect(orphans).toEqual([]);
    expect(OWNING_ROUTES.length).toBeGreaterThan(0);
  });
});

test.describe('Tektur web delivery', () => {
  test('loads the local variable face without a third-party request or glyph fallback', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => document.fonts.ready);

    const result = await page.evaluate((assignedStrings: string[]) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const family = rootStyle.getPropertyValue('--font-tektur').trim();
      const text = assignedStrings.join(' ');
      // Measured on the page's own wordmark rather than an injected probe:
      // a span this test creates and styles proves only that the test can
      // set a font-family.
      const wordmark = document.querySelector<HTMLElement>(
        '[data-tektur-role="home-wordmark"]',
      );
      if (!wordmark) throw new Error('home wordmark Tektur role missing');
      const wordmarkStyle = getComputedStyle(wordmark);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D canvas context unavailable');
      context.font = `600 32px ${family}`;
      const tekturWidth = context.measureText(text).width;
      context.font = '600 32px monospace';
      const fallbackWidth = context.measureText(text).width;

      const resources = performance
        .getEntriesByType('resource')
        .filter(
          (entry) =>
            (entry as PerformanceResourceTiming).initiatorType === 'font' ||
            /\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(entry.name),
        )
        .map(({ name }) => name);

      return {
        family,
        fontCheck: document.fonts.check(`600 32px ${family}`, text),
        wordmarkFamily: wordmarkStyle.fontFamily,
        wordmarkWeight: wordmarkStyle.fontWeight,
        wordmarkStretch: wordmarkStyle.fontStretch,
        wordmarkVariationSettings: wordmarkStyle.fontVariationSettings,
        tekturWidth,
        fallbackWidth,
        resources,
        origin: location.origin,
      };
    }, TEKTUR_ASSIGNED_STRINGS.map(({ text }) => text));

    expect(result.family.toLowerCase()).toContain('tektur');
    expect(result.wordmarkFamily.toLowerCase()).toContain('tektur');
    expect(result.wordmarkWeight).toBe('600');
    expect(result.wordmarkStretch).toBe('100%');
    expect(result.wordmarkVariationSettings).toContain('"wght" 600');
    expect(result.wordmarkVariationSettings).toContain('"wdth" 100');
    expect(result.fontCheck).toBe(true);
    expect(result.tekturWidth).not.toBe(result.fallbackWidth);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.resources).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/_next\/static\/media\/.+\.woff2(?:$|\?)/i),
      ]),
    );
    expect(
      result.resources.every((url) => new URL(url).origin === result.origin),
    ).toBe(true);
    expect(result.resources).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fonts\.(?:googleapis|gstatic)\.com/i),
        expect.stringMatching(/Tektur-SemiBold\.ttf/i),
      ]),
    );
  });
});
