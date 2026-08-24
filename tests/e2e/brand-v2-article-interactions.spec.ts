import { BRAND_V2_FLOW_SUITES, executeEvidencePlans } from '../../lib/brand-v2-runners';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';

test.describe('brand-v2-article-interactions', () => {
  test('executes the ordered article interaction flow over the derived article population', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(180_000);
    const articleRoutes = brandV2Registry.routes.public
      .filter(({ routeKind }) => routeKind === 'article')
      .map(({ path }) => path);
    expect(articleRoutes.length).toBeGreaterThan(0);

    const flow = BRAND_V2_FLOW_SUITES['brand-v2-article-interactions'];
    const records = await executeEvidencePlans(
      articleRoutes.map((route) => ({ id: route, ...flow })),
      {
        step: async (route, step) => {
          if (step.order === 1) {
            await page.goto(`${staticBase}${route}`);
            await page.evaluate(() => document.fonts.ready);
          }
          await test.step(`${route}:${step.action}`, async () => {
            await expect(page.locator('article')).toBeVisible();
            if (step.action === 'copy-heading-link') {
              const button = page
                .locator('.prose h2, .prose h3')
                .first()
                .locator('button[data-heading-permalink]');
              await button.focus();
              await button.click();
              await expect(button).toBeFocused();
            } else if (step.action === 'citation-and-term-parity') {
              const citation = page.locator('.prose [data-cite-id]').first();
              await citation.hover();
              const citationLink = citation.locator('a').first();
              await citationLink.focus();
              await expect(citation.getByRole('tooltip')).toBeVisible();
              await citationLink.evaluate((node) =>
                (node as HTMLElement).blur()
              );
              await page.mouse.move(2, 2);
              const term = page.locator('.prose [data-term-id]').first();
              if ((await term.count()) > 0) {
                await term.hover();
                const tooltip = term.getByRole('tooltip');
                await expect(tooltip).toBeVisible();
                await term.locator('a').focus();
                await expect(tooltip).toBeVisible();
              }
            } else if (step.action === 'table-keyboard') {
              const table = page.locator('.prose table').first();
              if ((await table.count()) > 0) {
                const details = table.locator('xpath=ancestor::details[1]');
                if (
                  (await details.count()) > 0 &&
                  !(await details.evaluate((node) =>
                    (node as HTMLDetailsElement).open
                  ))
                ) {
                  await details.locator('summary').click();
                }
                const region = table.locator('xpath=ancestor::*[@tabindex="0"][1]');
                if ((await region.count()) > 0) {
                  await region.focus();
                  await expect(region).toBeFocused();
                } else {
                  const control = table.getByRole('button').first();
                  if ((await control.count()) > 0) {
                    await control.focus();
                    await expect(control).toBeFocused();
                  } else {
                    expect(await table.locator('th').count()).toBeGreaterThan(0);
                  }
                }
              }
            } else if (step.action === 'wiki-furniture') {
              await expect(
                page.locator('[data-section="see-also"]'),
              ).toBeVisible();
              await expect(page.locator('#references-heading')).toBeVisible();
              await expect(page.locator('[data-reference-id]').first()).toBeVisible();
            } else {
              throw new Error(`Unsupported article flow action: ${step.action}`);
            }
          });
        },
        capture: async (route, capture) => {
          await test.step(`${route}:${capture.id}`, async () => {
            expect(await page.locator('article').count()).toBe(1);
          });
        },
      },
    );
    expect(records).toHaveLength(articleRoutes.length);
  });
});
