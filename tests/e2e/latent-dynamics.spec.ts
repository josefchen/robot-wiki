import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
      /deterministic recurrent state/,
      /stochastic latent/,
      /trained purely on imagined latent rollouts/,
      /symlog/,
      /two-hot reward encoding/,
      /more than 150 tasks/,
      /collect diamonds in Minecraft/,
      /MPPI/,
      /317M-parameter agent across 104/,
      /roll over, stand up, and walk from scratch in about one hour/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
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
      main.getByRole('link', { name: /Hafner 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2301.04104');
    await expect(
      main.getByRole('link', { name: /Hansen 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2310.16828');
    await expect(
      main.getByRole('link', { name: /Wu 2022/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2206.14176');
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
  });

  test('interactive: horizon extends deviation monotonically, decoder-free mode, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: Dreamer mode with decoded frames and a finite deviation.
    await expect(
      page.getByRole('button', { name: /with decoder/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('decoded-frames')).toBeVisible();
    const initial = await deviationReadout(page);

    // Extending the horizon increases the deviation readout monotonically.
    const horizon = page.getByRole('slider', {
      name: /imagination horizon/i,
    });
    await horizon.fill('30');
    const at30 = await deviationReadout(page);
    await horizon.fill('50');
    const at50 = await deviationReadout(page);
    expect(at30).toBeGreaterThan(initial);
    expect(at50).toBeGreaterThan(at30);

    // Decoder-free mode: no image reconstruction, reward readout appears.
    await page.getByRole('button', { name: /decoder-free/ }).click();
    await expect(page.getByTestId('decoder-free-note')).toContainText(
      /no image reconstruction/i,
    );
    await expect(page.getByTestId('decoded-frames')).toHaveCount(0);
    const reward = Number.parseFloat(
      (await page.getByTestId('reward-error-readout').textContent()) ?? '',
    );
    expect(reward).toBeGreaterThan(0);

    // Reset restores the default state.
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await deviationReadout(page)).toBeCloseTo(initial, 3);
    await expect(
      page.getByRole('button', { name: /with decoder/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('slider', { name: /imagination horizon/i }),
    ).toHaveValue('15');
  });

  test('interactive: keyboard path and error slider', async ({ page }) => {
    await page.goto(ROUTE);
    const horizon = page.getByRole('slider', {
      name: /imagination horizon/i,
    });
    await horizon.focus();
    const before = await deviationReadout(page);
    await page.keyboard.press('ArrowRight');
    expect(await deviationReadout(page)).toBeGreaterThan(before);

    const errorSlider = page.getByRole('slider', { name: /model error/i });
    await errorSlider.fill('6');
    const sloppy = await deviationReadout(page);
    await errorSlider.fill('0.5');
    expect(await deviationReadout(page)).toBeLessThan(sloppy);
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
