import AxeBuilder from '@axe-core/playwright';
import {
  BRAND_V2_FLOW_SUITES,
  buildPublicRouteExecutionPlan,
  executeEvidencePlans,
} from '../../lib/brand-v2-runners';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { settleTransitions } from './settle';
import { collectConsole } from './helpers/console';

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
        let routeProfile:
          | {
              computed: {
                title: string;
                headingFont: string;
                fontStatus: string;
                fontResources: string[];
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
                  const response = await page.goto(
                    `${staticBase}${member.path}`,
                  );
                  expect(response?.status()).toBe(200);
                  await page.evaluate(() => document.fonts.ready);
                  await expect(page.locator('main')).toBeVisible();
                  await settleTransitions(page);
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
                  const computed = await page.evaluate(() => {
                    const heading = document.querySelector<HTMLElement>('h1');
                    const style = heading ? getComputedStyle(heading) : null;
                    return {
                      title: document.title,
                      headingFont: style?.fontFamily ?? '',
                      fontStatus: document.fonts.status,
                      fontResources: performance
                        .getEntriesByType('resource')
                        .filter(
                          (entry) =>
                            (entry as PerformanceResourceTiming).initiatorType ===
                            'font',
                        )
                        .map(({ name }) => name),
                      backdropResidue: [
                        ...document.querySelectorAll<HTMLElement>('body *'),
                      ].filter((node) => {
                        const nodeStyle = getComputedStyle(node);
                        const filters = [
                          nodeStyle.backdropFilter,
                          nodeStyle.getPropertyValue(
                            '-webkit-backdrop-filter',
                          ),
                        ].filter(Boolean);
                        return filters.some((value) => value !== 'none');
                      }).length,
                    };
                  });
                  expect(computed.title).not.toBe('');
                  expect(computed.headingFont).not.toBe('');
                  expect(computed.fontStatus).toBe('loaded');
                  expect(
                    computed.fontResources.every(
                      (resource) =>
                        new URL(resource).origin === new URL(staticBase).origin,
                    ),
                  ).toBe(true);
                  expect(computed.backdropResidue).toBe(0);

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

                  await page.emulateMedia({ forcedColors: 'active' });
                  await expect(page.locator('main')).toBeVisible();
                  await page.emulateMedia({ forcedColors: null });

                  expect(
                    await page.evaluate(
                      () =>
                        document.documentElement.scrollWidth <=
                        document.documentElement.clientWidth,
                    ),
                  ).toBe(true);
                  await page.setViewportSize({ width: 320, height: 800 });
                  const reflowOverflowPx = await page.evaluate(
                    () =>
                      document.documentElement.scrollWidth -
                      document.documentElement.clientWidth,
                  );
                  expect(Number.isFinite(reflowOverflowPx)).toBe(true);
                  routeProfile = { computed, reflowOverflowPx };
                  await page.setViewportSize({ width: 1440, height: 900 });

                  expect(
                    (await new AxeBuilder({ page }).analyze()).violations,
                    `${member.path} axe violations`,
                  ).toEqual([]);
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

    const notFound = await page.goto(`${staticBase}/not-a-public-route/`);
    expect(notFound?.status()).toBe(404);
  });
});
