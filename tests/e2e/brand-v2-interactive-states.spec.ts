import {
  buildInteractiveExecutionPlan,
} from '../../lib/brand-v2-runners';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';

test.describe('brand-v2 interactive-state runner', () => {
  test('reconciles non-empty registry sources, production mounts, controls, and exact cases', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    expect(plan.observedCaseCount).toBe(plan.expectedCaseCount);

    const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
    const mountsByRoute = Map.groupBy(plan.mounts, (mount) => mount.route);
    let observedMounts = 0;
    for (const [route, mounts] of mountsByRoute) {
      await test.step(route, async () => {
        await page.goto(`${staticBase}${route}`);
        await page.evaluate(() => document.fonts.ready);
        const html = readFileSync(
          join(process.cwd(), 'out', route, 'index.html'),
          'utf8',
        );
        for (const mount of mounts) {
          const source = sourceById.get(mount.sourceId);
          expect(source, `${mount.id} resolves to a source`).toBeTruthy();
          expect(
            html.includes(source?.component ?? ''),
            `${mount.id} renders ${source?.component} in shipped RSC output`,
          ).toBe(true);
          for (const stateCase of mount.cases) {
            const selector =
              'selector' in stateCase &&
              typeof stateCase.selector === 'string'
                ? stateCase.selector
                : null;
            if (!selector) continue;
            expect(
              await page.locator(selector).count(),
              `${mount.id}:${stateCase.id} reconciles a DOM control/action`,
            ).toBeGreaterThan(0);
          }
          observedMounts += 1;
        }
      });
    }
    expect(observedMounts).toBe(plan.mounts.length);
  });
});
