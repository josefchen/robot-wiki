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
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
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
    // Scoped to the authored prose: the generated References bibliography
    // also renders arxiv links inside main, and with every inline chip deleted its 9 registry arxiv anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://arxiv.org/abs/"]');
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

  test('DPPO and ConRFT keep source-specific results and conflicts visible', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('PPO updates the denoising policy, not the environment dynamics.');
    await expect(prose).toContainText('16 of 20 hardware trials');
    await expect(prose).toContainText('from 15 to 90 minutes');
    await expect(prose).toContainText('not a percentage-point gain');
    await expect(prose).toContainText('PA-RL without them');
    const table = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Headline result' }) });
    await expect(table).toHaveCount(1);
    const dppo = table.getByRole('row').filter({ has: page.getByRole('cell', { name: 'DPPO', exact: true }) });
    const conrft = table.getByRole('row').filter({ has: page.getByRole('cell', { name: 'ConRFT', exact: true }) });
    await expect(dppo).toContainText('Not a universal sample-efficiency or wall-clock winner');
    await expect(conrft).toContainText('15-90 min online (prose says 45-90)');
    for (const [id, href] of [
      ['dppo-2024', 'https://arxiv.org/abs/2409.00588'],
      ['conrft-2025', 'https://arxiv.org/abs/2502.05450'],
    ]) {
      const chip = prose.locator(`[data-cite-id="${id}"] a[target="_blank"]`).first();
      await expect(chip).toHaveAttribute('href', href);
      await chip.focus();
      await expect(chip.locator('xpath=../..').getByRole('tooltip')).toBeVisible();
      await expect(page.locator(`#ref-${id} [data-reference-source-link]`)).toHaveAttribute('href', href);
    }
    const dppoReference = page.locator('#ref-dppo-2024');
    await dppoReference.getByRole('button', { name: 'Show all 9 authors' }).click();
    await expect(dppoReference.locator('[data-author-names]')).toContainText('Max Simchowitz');
    await dppoReference.getByRole('button', { name: 'Show 8 authors' }).click();
    await expect(page.locator('#ref-conrft-2025 [data-author-names]')).toContainText('Dongbin Zhao');
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
