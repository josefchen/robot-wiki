import { buildInteractiveExecutionPlan } from '../../lib/brand-v2-runners';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';

test.describe('brand-v2-reduced-motion', () => {
  test('keeps every registered mount route interactive under reduce', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    const routes = [...new Set(plan.mounts.map(({ route }) => route))];
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of routes) {
      await page.goto(`${staticBase}${route}`);
      expect(await page.locator('main button, main input, main select').count())
        .toBeGreaterThan(0);
    }
  });
});
