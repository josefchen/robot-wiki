import { BRAND_V2_FLOW_SUITES, executeEvidencePlans } from '../../lib/brand-v2-runners';
import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import {
  citeParts,
  closeCiteNote,
  cycleInlineCiteNote,
  revealCiteNote,
} from './helpers/citation-note';
import { openClosedAncestorDetails } from './helpers/open-ancestor-details';

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
              // Owner-approved successor (Josef, 2026-10-10, the research-page
              // standard): the citation's hover tooltip became its numbered
              // sidenote. The number is the focus stop and its note is shown
              // (in the margin at rest from 1200px, opened by the number
              // elsewhere); the tooltip's pointer and keyboard dismissal is
              // checked as the inline open and close at 375px. Glossary terms
              // keep their tooltip.
              const citation = page.locator('.prose [data-cite-id]').first();
              const { mark } = citeParts(citation);
              await mark.focus();
              await expect(mark).toBeFocused();
              const note = await revealCiteNote(citation);
              await expect(mark).toHaveAttribute(
                'aria-describedby',
                (await note.getAttribute('id')) ?? 'the note has no id',
              );
              await closeCiteNote(citation);
              await cycleInlineCiteNote(page, citation);
              await mark.evaluate((node) => (node as HTMLElement).blur());
              await page.mouse.move(2, 2);
              const term = page.locator('.prose [data-term-id]').first();
              if ((await term.count()) > 0) {
                await term.hover();
                const tooltip = term.getByRole('tooltip');
                await expect(tooltip).toBeVisible();
                await term.locator('a').focus();
                await expect(tooltip).toBeVisible();
                // An open term tooltip covers whatever sits above the term,
                // such as the summary of the fold the next step opens, so the
                // step ends with it dismissed by blur and pointer-leave.
                await term
                  .locator('a')
                  .evaluate((node) => (node as HTMLElement).blur());
                await page.mouse.move(2, 2);
                await expect(tooltip).toBeHidden();
              }
            } else if (step.action === 'table-keyboard') {
              const table = page.locator('.prose table').first();
              if ((await table.count()) > 0) {
                await openClosedAncestorDetails(table);
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
