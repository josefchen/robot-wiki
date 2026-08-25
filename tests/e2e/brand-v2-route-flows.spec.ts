import AxeBuilder from '@axe-core/playwright';
import {
  buildPublicRouteExecutionPlan,
} from '../../lib/brand-v2-runners';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { settleTransitions } from './settle';

test.describe('brand-v2-route-flows', () => {
  test('derives and renders every public destination while keeping 404 separate', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const plan = buildPublicRouteExecutionPlan(brandV2Registry, routes);
    expect(plan.members.length).toBeGreaterThan(5);
    expect(plan.notFound.publicContent).toBe(false);

    for (const member of plan.members) {
      await test.step(member.path, async () => {
        const response = await page.goto(`${staticBase}${member.path}`);
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main')).toBeVisible();
        await settleTransitions(page);
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
        expect(
          (await new AxeBuilder({ page }).analyze()).violations,
          `${member.path} axe violations`,
        ).toEqual([]);
      });
    }

    const notFound = await page.goto(`${staticBase}/not-a-public-route/`);
    expect(notFound?.status()).toBe(404);
  });
});
