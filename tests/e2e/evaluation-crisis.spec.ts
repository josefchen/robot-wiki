import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/data-hardware/evaluation-crisis/';

const PER_STEP = { name: /per-step success/i };
const HORIZON = { name: /episode length/i };

/** Parse the compounded-success readout, e.g. "21.5%" -> 21.5. */
async function readoutValue(page: import('@playwright/test').Page): Promise<number> {
  const text = (await page.getByTestId('episode-success-readout').textContent()) ?? '';
  expect(text).not.toContain('NaN');
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

/**
 * Set a range slider's value deterministically. Playwright's fill() assigns
 * the value through the element's own (React-tracked) setter, so React's
 * change detection can swallow the dispatched event and the handler never
 * fires; going through the prototype setter leaves the tracker behind and
 * always delivers the input event.
 */
async function setSlider(
  slider: import('@playwright/test').Locator,
  value: number,
): Promise<void> {
  await slider.focus();
  await slider.evaluate((el, next) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('data-hardware evaluation-crisis module', () => {
  test('renders prose covering the three evaluation strands (VAL-DATA-021)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Evaluation Crisis' }),
    ).toBeVisible();
    const main = page.locator('#main-content');

    // Strand 1: small-N trial statistics and confidence-interval width.
    await expect(main.getByText(/Clopper-Pearson/i).first()).toBeVisible();
    await expect(main.getByText(/confidence interval/i).first()).toBeVisible();
    // Strand 2: SIMPLER-style sim-to-real evaluation correlation.
    await expect(main.getByText(/SIMPLER/i).first()).toBeVisible();
    await expect(main.getByText(/system identification/i).first()).toBeVisible();
    // Strand 3: crowd-sourced pairwise evaluation (RoboArena).
    await expect(main.getByText(/RoboArena/i).first()).toBeVisible();
    await expect(main.getByText(/double-blind/i).first()).toBeVisible();

    // No raw MDX or component syntax leaks into the rendered page.
    const mainText = (await main.textContent()) ?? '';
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'The Evaluation Crisis' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-DATA-022)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // The three headline sources named in the module brief.
    await expect(
      main.getByRole('link', { name: 'TRI LBM Team 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2507.05331');
    await expect(
      main.getByRole('link', { name: 'Li 2024' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2405.05941');
    await expect(
      main.getByRole('link', { name: 'Atreya 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2506.18123');
    // Supporting sources: sequential testing, LIBERO-Plus, optimal stopping.
    await expect(
      main.getByRole('link', { name: 'Snyder 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2503.10966');
    await expect(
      main.getByRole('link', { name: 'Fei 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2510.13626');
    // Every chip is a real external link, never a dead anchor.
    const chips = main.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
    for (const id of [
      'tri-lbm-2025',
      'optimal-stopping-2025',
      'libero-2023',
      'libero-plus-2025',
      'simpler-2024',
      'roboarena-2025',
      'robochallenge-2025',
    ]) {
      expect(await main.getByText(`missing citation: ${id}`).count()).toBe(0);
    }
  });

  test('compounding calculator renders slider, horizon, and readout (VAL-DATA-023)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const perStep = page.getByRole('slider', PER_STEP);
    const horizon = page.getByRole('slider', HORIZON);
    await expect(perStep).toBeVisible();
    await expect(horizon).toBeVisible();
    await expect(page.getByTestId('episode-success-readout')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    // Full-range bounds: the boundary inputs 0% and 100% are reachable.
    await expect(perStep).toHaveAttribute('min', '0');
    await expect(perStep).toHaveAttribute('max', '100');
  });

  test('demonstrates the 95%/30-step failure mode (VAL-DATA-024)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const perStep = page.getByRole('slider', PER_STEP);
    const readout = page.getByTestId('episode-success-readout');

    // Anchor: 95% per-step over 30 steps lands near 21% (+/- 2pp).
    await setSlider(perStep, 95);
    await setSlider(page.getByRole('slider', HORIZON), 30);
    await expect(readout).toHaveText('21.5%');
    expect(await readoutValue(page)).toBeCloseTo(21.5, 0);

    // Monotone, direction-consistent response to the slider.
    await setSlider(perStep, 99);
    expect(await readoutValue(page)).toBeGreaterThan(70);
    await setSlider(perStep, 90);
    expect(await readoutValue(page)).toBeLessThan(10);

    // Keyboard operation: arrow keys move the readout in the right direction.
    await setSlider(perStep, 95);
    await expect(readout).toHaveText('21.5%');
    await perStep.focus();
    await page.keyboard.press('ArrowUp');
    expect(await readoutValue(page)).toBeGreaterThan(21.5);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await readoutValue(page)).toBeLessThan(21.5);
  });

  test('task-horizon control drives the compounding readout (VAL-DATA-027)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const horizon = page.getByRole('slider', HORIZON);
    await setSlider(page.getByRole('slider', PER_STEP), 95);

    await setSlider(horizon, 30);
    await expect(page.getByTestId('episode-success-readout')).toHaveText('21.5%');
    // 0.95^60 = 4.61%, contract tolerance +/-1pp.
    await setSlider(horizon, 60);
    await expect(page.getByTestId('episode-success-readout')).toHaveText('4.6%');
    // Decreasing N monotonically raises the readout.
    await setSlider(horizon, 10);
    await expect(page.getByTestId('episode-success-readout')).toHaveText('59.9%');
    await setSlider(horizon, 30);
    await expect(page.getByTestId('episode-success-readout')).toHaveText('21.5%');
  });

  test('boundary inputs produce honest outputs (VAL-DATA-028)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const perStep = page.getByRole('slider', PER_STEP);
    const horizon = page.getByRole('slider', HORIZON);
    const readout = page.getByTestId('episode-success-readout');

    // 100% per-step yields 100% at any horizon.
    await setSlider(perStep, 100);
    await setSlider(horizon, 30);
    await expect(readout).toHaveText('100.0%');
    await setSlider(horizon, 100);
    await expect(readout).toHaveText('100.0%');

    // 0% per-step yields 0% for any N >= 1.
    await setSlider(perStep, 0);
    await setSlider(horizon, 1);
    await expect(readout).toHaveText('0.0%');
    await setSlider(horizon, 100);
    await expect(readout).toHaveText('0.0%');

    // N=1 reads exactly the per-step value.
    await setSlider(horizon, 1);
    await setSlider(perStep, 73.4);
    await expect(readout).toHaveText('73.4%');
    await setSlider(perStep, 0);
    await expect(readout).toHaveText('0.0%');
    await setSlider(perStep, 100);
    await expect(readout).toHaveText('100.0%');

    // No NaN, blank, >100%, or <0% readout at any extreme.
    const text = (await readout.textContent()) ?? '';
    expect(text).not.toContain('NaN');
    expect(text.trim()).not.toBe('');
    const value = Number.parseFloat(text);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  test('reset restores the anchor state', async ({ page }) => {
    await page.goto(ROUTE);
    await setSlider(page.getByRole('slider', PER_STEP), 0);
    await setSlider(page.getByRole('slider', HORIZON), 100);
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('episode-success-readout')).toHaveText('21.5%');
    await expect(page.getByRole('slider', PER_STEP)).toHaveValue('95');
    await expect(page.getByRole('slider', HORIZON)).toHaveValue('30');
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
