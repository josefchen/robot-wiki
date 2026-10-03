import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForHydration } from './interaction-ready';
import { openAdjustMore } from './helpers/figure-fold';

const ROUTE = '/manipulation/bc-foundations/';

/**
 * The article's only compounding-error figure, mounted inside the
 * prediction step's disclosure.
 */
function ce(page: Page) {
  return page.locator('[data-predict] [data-figure-frame="compounding-error"]');
}

/** Opens the prediction step so the figure inside it can be driven. */
async function openPrediction(page: Page) {
  await page.locator('[data-predict] details[data-reveal] > summary').click();
  await expect(ce(page)).toHaveCount(1);
  await expect(ce(page)).toBeVisible();
}


test.describe('bc-foundations module', () => {
  test('renders the module with prose, math, figure, and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Behavior Cloning Foundations' }),
    ).toBeVisible();
    // KaTeX rendered, no raw TeX delimiters leaking into the prose.
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.getByText('$$')).toHaveCount(0);
    // The covariate-shift figure shipped.
    await expect(
      page.getByRole('img', { name: /covariate shift/i }),
    ).toBeVisible();
    // Sidebar marks this module active.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Behavior Cloning Foundations' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const dagger = main.getByRole('link', { name: /Ross et al\. 2011/ }).first();
    await expect(dagger).toHaveAttribute('href', 'https://arxiv.org/abs/1011.0686');
    // Scoped to the authored prose: the generated References bibliography
    // also renders arxiv links inside main, and with every inline chip
    // deleted its 4 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://arxiv.org/abs/"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);
  });

  test('interactive responds to the presets, the error slider, and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await openPrediction(page);
    const readout = ce(page).getByTestId('accumulated-deviation-readout');
    const value = async () => Number.parseFloat((await readout.textContent()) ?? '');
    const initial = await value();
    expect(Number.isFinite(initial)).toBe(true);

    // The error slider sits in "Adjust more"; raising it grows the drift.
    await openAdjustMore(ce(page));
    const errorSlider = ce(page).getByRole('slider', { name: /per-step error/i });
    await waitForHydration(errorSlider);
    await errorSlider.focus();
    for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowUp');
    await expect.poll(value).toBeGreaterThan(initial);
    const raised = await value();

    // Planning 25 moves at once at identical settings is strictly lower.
    await ce(page).getByRole('button', { name: '25 moves per plan', exact: true }).click();
    const chunked = await value();
    expect(chunked).toBeLessThan(raised);

    // A teacher correcting one-move-at-a-time driving is lower than none.
    await ce(page).getByRole('button', { name: 'A teacher corrects it', exact: true }).click();
    const corrected = await value();
    expect(corrected).toBeLessThan(raised);

    // The short task drifts less than the doubled one.
    await ce(page).getByRole('button', { name: 'One move at a time', exact: true }).click();
    await ce(page).getByRole('button', { name: /^Short task/ }).click();
    expect(await value()).toBeLessThan(raised);

    // Reset returns to the initial state.
    await ce(page).getByRole('button', { name: /reset/i }).click();
    const restored = await value();
    expect(restored).toBeCloseTo(initial, 5);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
