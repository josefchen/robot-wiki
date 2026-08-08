import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/manipulation/rl-finetuning/';

test.describe('rl-finetuning module', () => {
  test('renders the module with prose, math, and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'RL Fine-Tuning of Policies',
      }),
    ).toBeVisible();
    // The KL-regularized extraction equation rendered; no raw TeX leaks.
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.getByText('$$')).toHaveCount(0);
    // All six named methods appear in the prose and the table.
    for (const name of [
      'DPPO',
      'ConRFT',
      'Recap',
      'pi_RL',
      'Residual RL',
      'HIL-SERL',
    ]) {
      await expect(
        page.locator('#main-content').getByText(name, { exact: false }).first(),
      ).toBeVisible();
    }
    // Sidebar marks this module active.
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'RL Fine-Tuning of Policies' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Luo 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2410.21845');
    // Recap cites the pi.website lab report.
    await expect(
      main
        .getByRole('link', { name: /Physical Intelligence 2025/ })
        .first(),
    ).toHaveAttribute('href', /pi\.website|pi-asset\.com/);
    const chips = main.locator('a[href^="https://arxiv.org/abs/"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
  });

  test('advantage scrubber: scrub, views, and reset', async ({ page }) => {
    await page.goto(ROUTE);

    const timeReadout = page.getByTestId('time-readout');
    await expect(timeReadout).toHaveText(/t = 0\.0 s/);

    // Scrub with the keyboard into the grasp segment: value falls, low advantage.
    const slider = page.getByRole('slider', { name: /episode time/i });
    await slider.focus();
    for (let i = 0; i < 24; i += 1) await page.keyboard.press('ArrowRight');
    await expect(timeReadout).toHaveText(/t = 12\.0 s/);
    await expect(page.getByTestId('segment-readout')).toContainText(
      /low advantage/i,
    );

    // Credit-assignment annotation links the insertion failure to the grasp.
    await expect(page.getByTestId('credit-annotation')).toContainText(
      /20 s earlier/i,
    );

    // Training view retains every transition with binary tags.
    await page.getByRole('button', { name: /training data/i }).click();
    await expect(page.getByTestId('training-view')).toContainText(
      '5 transitions kept',
    );
    await expect(page.getByTestId('training-row-grasp')).toContainText(
      /low advantage/i,
    );
    await expect(page.getByTestId('training-row-reach')).toContainText(
      /high advantage/i,
    );

    // Execution view conditions on high advantage.
    await page.getByRole('button', { name: /at execution/i }).click();
    await expect(page.getByTestId('execution-view')).toContainText(
      /advantage:\s*high/i,
    );

    // Reset restores the initial state.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(timeReadout).toHaveText(/t = 0\.0 s/);
    await expect(page.getByTestId('segment-readout')).toBeVisible();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
