import { BRAND_V2_FLOW_SUITES, executeEvidencePlans } from '../../lib/brand-v2-runners';
import { COMPANIES } from '../../data/companies';
import { expect, test } from './brand-v2-static-fixture';
import type { Page } from '@playwright/test';

function segment(page: Page, name: RegExp) {
  return page.getByRole('group', { name: 'Segment' }).getByRole('button', { name });
}

test.describe('brand-v2-market-map-states', () => {
  test('executes ordered view, filter, selection, and history phases', async ({
    page,
    staticBase,
  }) => {
    const flow = BRAND_V2_FLOW_SUITES['brand-v2-market-map-states'];
    const records = await executeEvidencePlans(
      [{ id: 'route:/market-map/', ...flow }],
      {
        step: async (_, step) => {
          if (step.order === 1) await page.goto(`${staticBase}/market-map/`);
          if (step.action === 'exercise-three-views') {
            for (const name of ['Grid', 'Bubble', 'Timeline']) {
              await page.getByRole('button', { name, exact: true }).click();
            }
          } else if (step.action === 'exercise-filters') {
            await segment(page, /^Humanoids/).click();
            await expect(
              page.getByText(new RegExp(`of ${COMPANIES.length} companies`)),
            ).toBeVisible();
            await page.getByRole('button', { name: 'Clear filters' }).click();
          } else if (step.action === 'select-dismiss-company') {
            await page.getByRole('button', { name: 'Bubble', exact: true }).click();
            const mark = page.locator('circle[data-company-id]').first();
            await mark.click();
            await expect(page.locator('[data-company-detail]')).toBeVisible();
            await expect(page).toHaveURL(/#company-/);
            await mark.click();
            await expect(page.locator('[data-company-detail]')).toHaveCount(0);
            expect(new URL(page.url()).hash).toBe('');
          } else if (step.action === 'history-restore') {
            await page.evaluate(() => {
              history.pushState({}, '', location.pathname);
            });
            await segment(page, /^Humanoids/).click();
            const filtered = page.url();
            await page.goBack();
            await expect(segment(page, /^All/)).toHaveAttribute('aria-pressed', 'true');
            await page.goForward();
            await expect(page).toHaveURL(filtered);
          } else {
            throw new Error(`Unsupported market-map flow action: ${step.action}`);
          }
        },
        capture: async (_, capture) => {
          await test.step(capture.id, async () => {
            await expect(page.getByRole('heading', { name: 'Market Map' })).toBeVisible();
          });
        },
      },
    );
    expect(records[0].steps).toHaveLength(flow.steps.length);
    expect(records[0].captures).toHaveLength(flow.captures.length);
  });
});
