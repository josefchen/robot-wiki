import { buildPublicRouteExecutionPlan } from '../../lib/brand-v2-runners';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';

test.describe('brand-v2-forced-colours', () => {
  test('preserves every derived route in forced-colours mode', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const plan = buildPublicRouteExecutionPlan(brandV2Registry, routes);
    await page.emulateMedia({ forcedColors: 'active' });
    for (const member of plan.members) {
      await page.goto(`${staticBase}${member.path}`);
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
