import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/manipulation/bc-foundations/';

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
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Behavior Cloning Foundations' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const dagger = main.getByRole('link', { name: /Ross 2011/ }).first();
    await expect(dagger).toHaveAttribute('href', 'https://arxiv.org/abs/1011.0686');
    const chips = main.locator('a[href^="https://arxiv.org/abs/"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);
  });

  test('interactive responds to sliders, mode toggle, DAgger, and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const readout = page.getByTestId('accumulated-deviation-readout');
    const initial = Number.parseFloat((await readout.textContent()) ?? '');
    expect(Number.isFinite(initial)).toBe(true);

    // Raising the per-step error grows the accumulated deviation.
    const errorSlider = page.getByRole('slider', { name: /per-step error/i });
    await errorSlider.focus();
    for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowUp');
    const raised = Number.parseFloat((await readout.textContent()) ?? '');
    expect(raised).toBeGreaterThan(initial);

    // Chunked prediction at identical settings is strictly lower.
    await page.getByRole('button', { name: /chunk of 25 actions/i }).click();
    const chunked = Number.parseFloat((await readout.textContent()) ?? '');
    expect(chunked).toBeLessThan(raised);

    // DAgger relabeling lowers it further.
    await page.getByRole('button', { name: /dagger/i }).click();
    const corrected = Number.parseFloat((await readout.textContent()) ?? '');
    expect(corrected).toBeLessThan(chunked);

    // Reset returns to the initial state.
    await page.getByRole('button', { name: /reset/i }).click();
    const restored = Number.parseFloat((await readout.textContent()) ?? '');
    expect(restored).toBeCloseTo(initial, 5);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
