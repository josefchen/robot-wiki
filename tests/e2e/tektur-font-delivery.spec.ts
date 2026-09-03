import type { Page } from '@playwright/test';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import {
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_ROLE_INSTANCES,
  type TekturRoleInstance,
} from '../../data/type-roles';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from '../../lib/brand-v2-responsive-viewports';
import { deriveTekturRoleOccurrences } from '../../lib/tektur-role-occurrences';

/**
 * VAL-B2-TYPE-015 requires the rendered axis values to match the registry
 * "at every declared viewport", so the sweep is the canonical width
 * population derived from the declaring documents. Retyping a subset here is
 * how a width-specific role override escapes the gate entirely.
 */
const VIEWPORTS = BRAND_V2_RESPONSIVE_VIEWPORTS;

/**
 * The route population is derived from source, not chosen by the registry
 * being tested. A hand-typed `routes` array named three shell routes while
 * `app/layout.tsx` mounts the shell on all 62, and one article while the
 * shared template renders `article-h1` on all 47, so every genuine
 * occurrence outside the list went unmeasured.
 */
const OCCURRENCES = deriveTekturRoleOccurrences();
const SWEPT_ROUTES = OCCURRENCES.routes.map(({ route }) => route);
const NOT_FOUND_ROUTE = brandV2Registry.routes.notFound.path;
const REGISTERED_ROLE_IDS = TEKTUR_ROLE_INSTANCES.map(({ id }) => id);
const REGISTERED_CLASSES = TEKTUR_ROLE_INSTANCES.map(
  ({ cssClass }) => cssClass,
);

type RoleOccurrence = {
  role: string;
  family: string;
  weight: string;
  stretch: string;
  variationSettings: string;
  text: string;
};

type RouteMeasurement = {
  /** Every role annotation present, registered or not. */
  occurrences: RoleOccurrence[];
  /** Elements carrying a registered display class but no role annotation. */
  unannotatedClassUses: string[];
};

function measureRoles(classes: string[]): RouteMeasurement {
  const occurrences = [
    ...document.querySelectorAll<HTMLElement>('[data-tektur-role]'),
  ].map((element) => {
    const style = getComputedStyle(element);
    return {
      role: element.getAttribute('data-tektur-role') ?? '',
      family: style.fontFamily,
      weight: style.fontWeight,
      stretch: style.fontStretch,
      variationSettings: style.fontVariationSettings,
      text: (element.textContent ?? '').trim().slice(0, 40),
    };
  });
  const unannotatedClassUses = classes.flatMap((cssClass) =>
    [...document.querySelectorAll<HTMLElement>(`.${cssClass}`)]
      .filter(
        (element) => (element.getAttribute('data-tektur-role') ?? '') === '',
      )
      .map((element) => `${cssClass}:${element.tagName.toLowerCase()}`),
  );
  return { occurrences, unannotatedClassUses };
}

type Sweep = Map<string, RouteMeasurement>;

const sweepKey = (route: string, viewportId: string): string =>
  `${route} @${viewportId}`;

let sweepCache: Sweep | null = null;

/**
 * One sweep per file. The viewport is set before navigation rather than
 * resized afterwards, so a component that decides what to render from the
 * width it mounted at is measured at that width instead of being resized
 * into a state it never renders in production.
 */
async function sweep(page: Page, base: string): Promise<Sweep> {
  if (sweepCache) return sweepCache;
  const measured: Sweep = new Map();
  for (const route of SWEPT_ROUTES) {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const response = await page.goto(`${base}${route}`);
      expect(
        response?.status(),
        `${route} @${viewport.id} did not serve its document`,
        // The export writes the not-found document to `404/index.html` as
        // well, so every swept route resolves to a real 200 document.
      ).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      measured.set(
        sweepKey(route, viewport.id),
        await page.evaluate(measureRoles, REGISTERED_CLASSES),
      );
    }
  }
  sweepCache = measured;
  return measured;
}

test.describe('Tektur role population', () => {
  test('renders the derived role occurrences with registry axes on every public route at every declared viewport (VAL-B2-TYPE-015)', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(900_000);
    expect(VIEWPORTS.length, 'declared viewport population').toBeGreaterThan(1);
    expect(SWEPT_ROUTES.length, 'derived route population').toBeGreaterThan(1);

    const registered = new Map<string, TekturRoleInstance>(
      TEKTUR_ROLE_INSTANCES.map((instance) => [instance.id, instance]),
    );
    const measured = await sweep(page, staticBase);
    // The sweep has to have visited the whole cross product; a route or a
    // width dropped from the loop would otherwise reduce the population
    // silently, which is the defect this gate exists to prevent.
    expect(measured.size, 'route x viewport observations').toBe(
      SWEPT_ROUTES.length * VIEWPORTS.length,
    );

    const failures: string[] = [];
    const observedRoutesByRole = new Map<string, Set<string>>();
    let occurrenceCount = 0;
    for (const { route, roles: expectedRoles } of OCCURRENCES.routes) {
      const perViewportCounts = new Set<number>();
      for (const viewport of VIEWPORTS) {
        const where = `${route} @${viewport.id}`;
        const observation = measured.get(sweepKey(route, viewport.id));
        if (!observation) {
          failures.push(`${where}: not measured`);
          continue;
        }
        occurrenceCount += observation.occurrences.length;
        perViewportCounts.add(observation.occurrences.length);

        const observedRoles = [
          ...new Set(observation.occurrences.map(({ role }) => role)),
        ].sort();
        if (observedRoles.join(',') !== expectedRoles.join(',')) {
          failures.push(
            `${where}: renders roles [${observedRoles.join(', ')}], source derives [${expectedRoles.join(', ')}]`,
          );
        }
        for (const use of observation.unannotatedClassUses) {
          failures.push(
            `${where}: display class without a role annotation (${use})`,
          );
        }

        observation.occurrences.forEach((occurrence, index) => {
          const routes = observedRoutesByRole.get(occurrence.role) ?? new Set();
          routes.add(route);
          observedRoutesByRole.set(occurrence.role, routes);

          const at = `${where}: ${occurrence.role}[${index}] "${occurrence.text}"`;
          const instance = registered.get(occurrence.role);
          if (!instance) {
            failures.push(`${at} is not a registered role`);
            return;
          }
          if (!occurrence.family.toLowerCase().includes('tektur')) {
            failures.push(`${at} resolves ${occurrence.family}, not Tektur`);
          }
          if (occurrence.weight !== String(instance.wght)) {
            failures.push(
              `${at} computes weight ${occurrence.weight}, registry says ${instance.wght}`,
            );
          }
          if (occurrence.stretch !== `${instance.wdth}%`) {
            failures.push(
              `${at} computes stretch ${occurrence.stretch}, registry says ${instance.wdth}%`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wght" ${instance.wght}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wght" ${instance.wght}`,
            );
          }
          if (!occurrence.variationSettings.includes(`"wdth" ${instance.wdth}`)) {
            failures.push(
              `${at} carries ${occurrence.variationSettings}, registry says "wdth" ${instance.wdth}`,
            );
          }
        });
      }
      // Nothing in the shipped shell renders a different number of role
      // occurrences at a different width; the annotations live in the static
      // document and responsive behaviour is CSS. A width-dependent count is
      // a client component swapping markup, which the per-width role sets
      // above would only catch if the swap removed the last occurrence.
      if (perViewportCounts.size > 1) {
        failures.push(
          `${route}: role occurrence count varies by width (${[...perViewportCounts].join(', ')})`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
    expect(occurrenceCount, 'measured role occurrences').toBeGreaterThan(0);

    // Exact in both directions, per role: a role that stops rendering on a
    // subset of the routes source says render it fails here even though every
    // route it still renders on passes.
    for (const role of REGISTERED_ROLE_IDS) {
      expect(
        [...(observedRoutesByRole.get(role) ?? [])].sort(),
        `routes rendering ${role} must equal the routes source derives`,
      ).toEqual([...(OCCURRENCES.routesByRole[role] ?? [])].sort());
    }
  });

  test('registers exactly the roles first-party source writes, each reaching a public route', () => {
    expect(
      [...REGISTERED_ROLE_IDS].sort(),
      'registered roles must be exactly the roles source writes',
    ).toEqual([...OCCURRENCES.writtenRoles].sort());
    expect(
      [...SWEPT_ROUTES].sort(),
      'the swept routes must be exactly the registered public destinations plus 404',
    ).toEqual(
      [
        ...brandV2Registry.routes.public.map(({ path }) => path),
        NOT_FOUND_ROUTE,
      ].sort(),
    );
    for (const instance of TEKTUR_ROLE_INSTANCES) {
      expect(
        [...instance.definedIn].sort(),
        `${instance.id} definedIn must be exactly the modules that write it`,
      ).toEqual([...(OCCURRENCES.writerModulesByRole[instance.id] ?? [])].sort());
      expect(
        OCCURRENCES.routesByRole[instance.id] ?? [],
        `${instance.id} must be reachable from at least one route entry`,
      ).not.toEqual([]);
    }
  });
});

test.describe('Tektur web delivery', () => {
  test('loads the local variable face without a third-party request or glyph fallback', async ({
    page,
    staticBase,
  }) => {
    // Font delivery is not width-dependent, so this one runs at a single
    // viewport — the widest declared one, taken from the derived population
    // rather than retyped.
    const widest = VIEWPORTS.at(-1);
    expect(widest, 'declared viewport population').toBeDefined();
    await page.setViewportSize({
      width: widest?.width ?? 0,
      height: widest?.height ?? 0,
    });
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
