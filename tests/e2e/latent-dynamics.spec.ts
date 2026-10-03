import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

const ROUTE = '/world-models/latent-dynamics/';

async function deviationReadout(page: import('@playwright/test').Page) {
  const text = await page.getByTestId('deviation-readout').textContent();
  const value = Number.parseFloat(text ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('world-models latent-dynamics module', () => {
  test('renders the three systems with their specifics', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Latent-Dynamics World Models',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      /recurrent state that carries memory/,
      /stochastic categorical representation/,
      /trained purely on imagined latent rollouts/,
      /symlog/,
      /two-hot targets for reward and value prediction/,
      /more than 150 tasks/,
      /collect diamonds in Minecraft/,
      /MPPI/,
      /545M/,
      /240 single-task agents/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Latent-Dynamics World Models' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to the three required primary sources', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Hafner et al\. 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2301.04104');
    await expect(
      main.getByRole('link', { name: /Hansen et al\. 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2310.16828');
    await expect(
      main.getByRole('link', { name: /Wu et al\. 2022/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2206.14176');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 9 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
  });

  test('interactive: horizon extends deviation monotonically, decoder-free mode, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const figure = page.locator('[data-figure-frame="latent-imagination"]');

    // The stage says it is an illustrative toy; the method fold's chart
    // says its band is not a paper result.
    await expect(figure.getByText(/Illustrative: a toy model, not measured on a real robot/)).toBeVisible();
    await openHowThisWasMade(figure);
    await expect(figure.getByRole('img', { name: /latent deviation versus/i }))
      .toHaveAttribute('aria-label', /illustrative, not a published reliability bound/);
    // Default: the Dreamer view with its imagined pictures, and the
    // insight on the first frame.
    await expect(figure.getByTestId('decoded-frames')).toBeVisible();
    await expect(figure.getByTestId('drift-note')).toContainText('already this far off');
    const initial = await deviationReadout(page);

    // Extending the horizon increases the deviation readout monotonically.
    // Relational reads poll: the readout is derived state, so the test
    // waits for it to reflect each slider value (quirk 9).
    const horizon = figure.getByRole('slider', { name: /how far ahead to imagine/i });
    await setSlider(horizon, 30);
    await expect.poll(() => deviationReadout(page)).toBeGreaterThan(initial);
    const at30 = await deviationReadout(page);
    await setSlider(horizon, 50);
    await expect.poll(() => deviationReadout(page)).toBeGreaterThan(at30);
    const at50 = await deviationReadout(page);
    expect(at30).toBeGreaterThan(initial);
    expect(at50).toBeGreaterThan(at30);

    // TD-MPC2: no pictures, and the reward error is reported instead.
    const fold = await openAdjustMore(figure);
    const decoderFree = fold.getByRole('button', { name: 'TD-MPC2 (no pictures)', exact: true });
    await decoderFree.click();
    await expect(decoderFree).toHaveAttribute('aria-pressed', 'true');
    await expect(figure.getByTestId('decoder-free-note')).toContainText(/draws no pictures/i);
    await expect(figure.getByTestId('decoded-frames')).toHaveCount(0);
    const reward = Number.parseFloat(
      (await figure.getByTestId('reward-error-readout').textContent()) ?? '',
    );
    expect(reward).toBeGreaterThan(0);

    // Reset restores the default state.
    await fold.getByRole('button', { name: 'Reset', exact: true }).click();
    expect(await deviationReadout(page)).toBeCloseTo(initial, 3);
    await expect(
      fold.getByRole('button', { name: 'Dreamer (draws pictures)', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(horizon).toHaveValue('15');
  });

  test('interactive: keyboard path and error slider', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const figure = page.locator('[data-figure-frame="latent-imagination"]');
    const horizon = figure.getByRole('slider', { name: /how far ahead to imagine/i });
    await horizon.focus();
    const before = await deviationReadout(page);
    await page.keyboard.press('ArrowRight');
    expect(await deviationReadout(page)).toBeGreaterThan(before);
    await expect(figure.getByTestId('drift-note')).toContainText('16 steps ahead:');

    const errorSlider = figure.getByRole('slider', { name: /how accurate each step is/i });
    await setSlider(errorSlider, 6);
    const sloppy = await deviationReadout(page);
    await setSlider(errorSlider, 0.5);
    await expect.poll(() => deviationReadout(page)).toBeLessThan(sloppy);
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    const response = await page.goto(ROUTE);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
