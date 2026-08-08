import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/rl-sim2real/parallel-sim-rl/';

test.describe('parallel-sim-rl module', () => {
  test('renders the infrastructure arc, throughput figures, and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Massively Parallel Sim RL',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // The 2021 to 2026 systems are all named in the prose. The citation
    // tooltips also carry the titles but stay hidden until hover, so filter
    // to visible matches.
    for (const name of [
      /Isaac Gym/,
      /Isaac Lab 3\.0/,
      /Newton/,
      /MuJoCo XLA \(MJX\)/,
      /Brax/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    // Both headline throughput figures appear.
    await expect(main.getByText(/900,000 frames per second/)).toBeVisible();
    await expect(
      main.getByText(/1\.6 million frames per second/),
    ).toBeVisible();
    // Sidebar marks this module active.
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Massively Parallel Sim RL' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Rudin 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2109.11978');
    await expect(
      main.getByRole('link', { name: /Mittal 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2511.04831');
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(7);
  });

  test('training-time chart: slider, Rudin markers, CPU toggle, and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: 4,096 envs at the four-minute anchor.
    await expect(page.getByTestId('envs-readout')).toHaveText('4,096');
    await expect(page.getByTestId('wallclock-readout')).toHaveText('4.0 min');
    await expect(page.getByTestId('rudin-marker-flat')).toBeVisible();
    await expect(page.getByTestId('rudin-marker-uneven')).toBeVisible();

    // Slider: hours at 64 envs, minutes at 16,384.
    const slider = page.getByRole('slider', {
      name: /parallel environments/i,
    });
    await slider.fill('6');
    await expect(page.getByTestId('wallclock-readout')).toHaveText(/h$/);
    await slider.fill('14');
    await expect(page.getByTestId('wallclock-readout')).toHaveText('1.5 min');

    // CPU bottleneck: wall-clock rises, reference curve appears.
    const toggle = page.getByRole('button', {
      name: /cpu single-core bottleneck/i,
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('wallclock-readout')).toHaveText('4.8 min');
    await expect(page.getByTestId('reference-curve')).toBeVisible();
    await expect(page.getByTestId('cpu-explanation')).toContainText('5090');

    // Keyboard on the slider, then reset.
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('envs-readout')).toHaveText('8,192');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('envs-readout')).toHaveText('4,096');
    await expect(page.getByTestId('wallclock-readout')).toHaveText('4.0 min');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
