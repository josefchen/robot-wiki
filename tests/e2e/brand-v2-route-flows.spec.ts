import AxeBuilder from '@axe-core/playwright';
import {
  BRAND_V2_FLOW_SUITES,
  ROUTE_CHECKS,
  buildPublicRouteExecutionPlan,
  executeEvidencePlans,
} from '../../lib/brand-v2-runners';
import { validateRouteProfile } from '../../lib/brand-v2-route-profile';
import {
  archivedExpectedRed,
  archivedExpectedRedRoutes,
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { settleTransitions } from './settle';
import { collectConsole } from './helpers/console';
import { documentOverflow } from './helpers/document-overflow';

test.describe('brand-v2-route-flows', () => {
  test('derives and renders every public destination while keeping 404 separate', async ({
    page,
    staticBase,
  }, testInfo) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const plan = buildPublicRouteExecutionPlan(brandV2Registry, routes);
    const suite = BRAND_V2_FLOW_SUITES['brand-v2-route-flows'];
    expect(plan.members.length).toBeGreaterThan(5);
    expect(plan.notFound.publicContent).toBe(false);
    const archivedReflowReason = archivedExpectedRed(
      'brand-v2-reflow-320-200',
      'VAL-B2-EVID-011',
    );
    const expectedArchivedReflowRoutes = archivedExpectedRedRoutes(
      'brand-v2-reflow-320-200',
      'VAL-B2-EVID-011',
    );
    const archivedReflowFailures: string[] = [];
    const archivedReflowRoutes: string[] = [];
    const { errors: resourceFailures } = collectConsole(page);
    page.on('response', (response) => {
      if (response.status() >= 400) {
        resourceFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    for (const member of plan.members) {
      await test.step(member.path, async () => {
        const resourceStart = resourceFailures.length;
        const captureIds: string[] = [];
        const executedChecks = new Set<string>();
        let routeProfile:
          | {
              computed: {
                title: string;
                headingFont: string;
                fontStatus: string;
                fontResources: string[];
                bodyElementCount: number;
                backdropResidue: number;
              };
              reflowOverflowPx: number;
            }
          | undefined;
        await executeEvidencePlans(
          [
            {
              id: member.path,
              steps: suite.steps,
              captures: suite.captures,
            },
          ],
          {
            step: async (_route, step) => {
              await test.step(`${member.path}:${step.action}`, async () => {
                if (step.action === 'navigate') {
                  await page.setViewportSize({ width: 1440, height: 900 });
                  await page.evaluate(() => performance.clearResourceTimings());
                  const response = await page.goto(
                    `${staticBase}${member.path}`,
                  );
                  expect(response?.status()).toBe(200);
                  await page.evaluate(async () => {
                    await document.fonts.ready;
                  });
                  await expect(page.locator('main')).toBeVisible();
                  await settleTransitions(page);
                  executedChecks.add('browser-render');
                } else if (step.action === 'exercise-history') {
                  const routeUrl = new URL(member.path, staticBase).href;
                  await page.evaluate(() => {
                    history.pushState(
                      { brandV2HistoryProbe: true },
                      '',
                      '#brand-v2-history-probe',
                    );
                  });
                  await expect(page).toHaveURL(
                    `${routeUrl}#brand-v2-history-probe`,
                  );
                  await page.goBack();
                  await expect(page).toHaveURL(routeUrl);
                  await expect(page.locator('main')).toBeVisible();
                } else if (step.action === 'run-route-profiles') {
                  const computed = await page.evaluate(async () => {
                    const heading = document.querySelector<HTMLElement>('h1');
                    const style = heading ? getComputedStyle(heading) : null;
                    const headingFont = style?.fontFamily ?? '';
                    const bodyElements =
                      document.querySelectorAll<HTMLElement>('body *');
                    let backdropResidue = 0;
                    for (const node of bodyElements) {
                      const nodeStyle = getComputedStyle(node);
                      const filters = [
                        nodeStyle.backdropFilter,
                        nodeStyle.getPropertyValue(
                          '-webkit-backdrop-filter',
                        ),
                      ];
                      if (
                        filters.some(
                          (value) => Boolean(value) && value !== 'none',
                        )
                      ) {
                        backdropResidue += 1;
                      }
                    }
                    await document.fonts.ready;
                    return {
                      title: document.title,
                      headingFont,
                      fontStatus: document.fonts.status,
                      fontResources: performance
                        .getEntriesByType('resource')
                        .filter(
                          (entry) =>
                            (entry as PerformanceResourceTiming).initiatorType ===
                              'font' ||
                            /\.(?:woff2?|ttf|otf)$/i.test(
                              new URL(entry.name).pathname,
                            ),
                        )
                        .map(({ name }) => name),
                      bodyElementCount: bodyElements.length,
                      backdropResidue,
                    };
                  });
                  expect(computed.title).not.toBe('');
                  expect(computed.headingFont).not.toBe('');
                  expect(computed.fontStatus).toBe('loaded');
                  executedChecks.add('computed-style');

                  await page.keyboard.press('Home');
                  await page.evaluate(() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  });
                  const skipLink = page.getByRole('link', {
                    name: 'Skip to content',
                  });
                  await page.keyboard.press('Tab');
                  await expect(skipLink).toBeFocused();
                  executedChecks.add('keyboard');

                  await page.emulateMedia({ forcedColors: 'active' });
                  await expect(page.locator('main')).toBeVisible();
                  await page.emulateMedia({ forcedColors: null });
                  executedChecks.add('forced-colours');

                  expect(
                    await page.evaluate(
                      () =>
                        document.documentElement.scrollWidth <=
                        document.documentElement.clientWidth,
                    ),
                  ).toBe(true);
                  executedChecks.add('overflow');
                  await page.setViewportSize({ width: 320, height: 800 });
                  const reflowOverflowPx = await documentOverflow(page);
                  const profileFailures = validateRouteProfile({
                    staticOrigin: new URL(staticBase).origin,
                    fontResources: computed.fontResources,
                    bodyElementCount: computed.bodyElementCount,
                    backdropResidue: computed.backdropResidue,
                    reflowOverflowPx,
                  });
                  const reflowFailures = profileFailures.filter(
                    ({ check }) => check === 'reflow',
                  );
                  archivedReflowFailures.push(
                    ...reflowFailures.map(
                      ({ reason }) => `${member.path}:${reason}`,
                    ),
                  );
                  if (reflowFailures.length > 0) {
                    archivedReflowRoutes.push(member.path);
                  }
                  expect(
                    profileFailures.filter(
                      ({ check }) => check !== 'reflow',
                    ),
                    `${member.path} non-archived route-profile failures`,
                  ).toEqual([]);
                  executedChecks.add('resource-font');
                  executedChecks.add('residue');
                  executedChecks.add('reflow');
                  routeProfile = { computed, reflowOverflowPx };
                  await page.setViewportSize({ width: 1440, height: 900 });

                  expect(
                    (await new AxeBuilder({ page }).analyze()).violations,
                    `${member.path} axe violations`,
                  ).toEqual([]);
                  executedChecks.add('axe');
                  expect(resourceFailures.slice(resourceStart)).toEqual([]);
                } else {
                  throw new Error(
                    `Unsupported public-route flow action: ${step.action}`,
                  );
                }
              });
            },
            capture: async (_route, capture) => {
              captureIds.push(capture.id);
            },
          },
        );
        expect(routeProfile).toBeDefined();
        expect([...executedChecks].sort()).toEqual([...member.checks].sort());
        expect(member.checks).toEqual([...ROUTE_CHECKS]);
        await testInfo.attach(`${member.routeId}-flow.json`, {
          body: Buffer.from(
            JSON.stringify({
              route: member.path,
              url: page.url(),
              title: await page.title(),
              captureIds,
              routeProfile,
            }),
          ),
          contentType: 'application/json',
        });
      });
    }

    expect([...new Set(archivedReflowRoutes)].sort()).toEqual(
      [...expectedArchivedReflowRoutes].sort(),
    );
    const notFound = await page.goto(`${staticBase}/not-a-public-route/`);
    expect(notFound?.status()).toBe(404);
    await testInfo.attach('archived-reflow-320.json', {
      body: Buffer.from(
        JSON.stringify({
          reason: archivedReflowReason,
          failures: archivedReflowFailures,
        }),
      ),
      contentType: 'application/json',
    });
  });

  test('rejects a route profile when font requests are suppressed', async ({
    page,
    staticBase,
  }) => {
    await page.route(/\.(?:woff2?|ttf|otf)(?:$|\?)/i, (route) =>
      route.abort(),
    );
    await page.goto(staticBase);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.evaluate(() => performance.clearResourceTimings());
    const fontResources = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter(
          (entry) =>
            (entry as PerformanceResourceTiming).initiatorType === 'font',
        )
        .map(({ name }) => name),
    );
    expect(fontResources).toEqual([]);
    expect(
      validateRouteProfile({
        staticOrigin: new URL(staticBase).origin,
        fontResources,
        bodyElementCount: await page.locator('body *').count(),
        backdropResidue: 0,
        reflowOverflowPx: 0,
      }),
    ).toContainEqual({
      check: 'resource-font',
      reason: 'empty-font-resource-population',
    });
  });

  test('rejects a route profile that overflows at 320 CSS px', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(staticBase);
    // Wider than twice the viewport, so the overflow the document reports is
    // a number no setup dimension supplies: a plant at 640px overflows a
    // 320px viewport by exactly 320px, which is indistinguishable from the
    // viewport width in any record of the result.
    await page.evaluate(() => {
      const plant = document.createElement('div');
      plant.style.width = '1280px';
      plant.style.height = '1px';
      document.body.append(plant);
    });
    const reflowOverflowPx = await documentOverflow(page);
    expect(reflowOverflowPx).toBeGreaterThan(0);
    expect(
      validateRouteProfile({
        staticOrigin: new URL(staticBase).origin,
        fontResources: [new URL('/font.woff2', staticBase).href],
        bodyElementCount: await page.locator('body *').count(),
        backdropResidue: 0,
        reflowOverflowPx,
      }),
    ).toContainEqual({
      check: 'reflow',
      reason: `${reflowOverflowPx}px-overflow`,
    });
  });
});
