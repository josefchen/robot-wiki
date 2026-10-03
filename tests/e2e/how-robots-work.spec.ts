import { expect, test, type Page } from '@playwright/test';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';

const ROUTE = '/how-robots-work/';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'narrow', width: 375, height: 812 },
] as const;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

async function waitForScene(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __explainer?: { ready: boolean; steps: number } })
      .__explainer?.ready === true,
    undefined,
    { timeout: 45_000 },
  );
  await expect(page.locator('[data-x="status"]')).toBeHidden();
  return page.evaluate(
    () => (window as unknown as { __explainer: { steps: number } }).__explainer.steps,
  );
}

test.describe('how robots work', () => {
  test('route metadata, heading and contents rail', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page).toHaveTitle(/How Robots Work/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How robots work');
    const rail = page.getByRole('navigation', { name: 'Explainers' });
    await expect(rail.getByRole('link')).toHaveCount(EXPLAINER_ORDER.length);
    for (const { id, label } of EXPLAINER_ORDER) {
      await expect(rail.locator(`a[href="#${id}"]`)).toHaveText(new RegExp(label));
    }
  });

  for (const viewport of VIEWPORTS) {
    for (const { id, label } of EXPLAINER_ORDER) {
      test(`${label} teaches its steps at ${viewport.name} width`, async ({ page }, testInfo) => {
        test.setTimeout(150_000);
        const errors = collectErrors(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${ROUTE}#${id}`);
        const steps = await waitForScene(page);
        expect(steps).toBeGreaterThan(1);
        await expect(page.locator(`[data-rail-id="${id}"]`)).toHaveAttribute('data-current', '');
        await expect(page.locator('[data-x="question"]')).not.toHaveText(/Loading/);
        const canvas = page.locator('[data-x="stage"] canvas');
        await expect(canvas).toBeVisible();
        const box = await canvas.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(200);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);

        const dots = page.locator('[data-x="dots"] button');
        await expect(dots).toHaveCount(steps);
        await expect(dots.first()).toHaveAttribute('aria-pressed', 'true');
        await page.screenshot({ path: testInfo.outputPath(`${id}-${viewport.name}-start.png`) });

        let sawPredict = false;
        const next = page.locator('[data-x="next"]');
        for (let i = 0; i < steps; i += 1) {
          await expect(dots.nth(i)).toHaveAttribute('aria-pressed', 'true');
          await expect(page.locator('[data-x="stepText"]')).not.toBeEmpty();
          const predict = page.locator('[data-predict]');
          // A step's entrance animates before any guess appears; it is
          // settled once it either asks for a guess or finishes entering.
          await page.waitForFunction(
            () =>
              !(window as unknown as { __explainer: { busy: boolean } }).__explainer.busy ||
              !(document.querySelector('[data-predict]') as HTMLElement).hidden,
            undefined,
            { timeout: 20_000 },
          );
          if (await predict.isVisible()) {
            sawPredict = true;
            await page.screenshot({ path: testInfo.outputPath(`${id}-${viewport.name}-predict.png`) });
            await predict.locator('.opts button').first().click();
            await expect(predict.locator('.explain')).toBeVisible();
            await expect(predict.locator('.opts button').first()).toBeDisabled();
          }
          if (i < steps - 1) {
            await next.click();
          }
        }
        expect(sawPredict, 'every explainer asks for a guess before it shows').toBe(true);
        await expect(next).toHaveText('Done');

        const summary = page.locator('[data-x="summary"]');
        await expect(summary).toBeVisible();
        await expect(page.locator('[data-x="sentence"]')).not.toBeEmpty();
        const concept = page.locator('[data-x="concept"] a');
        await expect(concept).toHaveAttribute('href', /^\/[a-z0-9-]+\/[a-z0-9-]+\/(#[a-z0-9-]+)?$/);
        const check = summary.locator('details.check');
        await check.locator('summary').click();
        await expect(page.locator('[data-x="checkA"]')).toBeVisible();
        await expect(page.locator('[data-x="checkA"]')).not.toBeEmpty();

        const fold = page.locator('[data-explainer-fold="how"]');
        await expect(fold).not.toHaveAttribute('open', '');
        await fold.locator('summary').click();
        await expect(fold.locator('[data-x="how"] li').first()).toBeVisible();
        for (const link of await fold.locator('a[target="_blank"]').all()) {
          await expect(link).toHaveAttribute('rel', /noopener/);
        }
        await page.screenshot({
          path: testInfo.outputPath(`${id}-${viewport.name}-done.png`),
          fullPage: true,
        });

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, 'the page does not scroll sideways').toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      });
    }
  }

  test('the pager and the rail move between explainers', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = collectErrors(page);
    await page.goto(ROUTE);
    await waitForScene(page);
    const [first, second] = EXPLAINER_ORDER;
    await expect(page.locator(`[data-rail-id="${first.id}"]`)).toHaveAttribute('data-current', '');
    await page.locator('[data-x="pagerNext"] a').click();
    await expect(page).toHaveURL(new RegExp(`#${second.id}$`));
    await waitForScene(page);
    await expect(page.locator(`[data-rail-id="${second.id}"]`)).toHaveAttribute('data-current', '');
    await expect(page.locator(`[data-rail-id="${first.id}"]`)).not.toHaveAttribute('data-current', '');
    await page.locator(`[data-rail-id="${first.id}"]`).click();
    await waitForScene(page);
    await expect(page.locator('[data-x="pagerPrev"] a')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
