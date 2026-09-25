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
    // Exercise the actual responsive taxonomy, not a hidden mobile sidebar.
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    const mobile = await menu.isVisible();
    if (mobile) {
      await menu.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
      await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
    }
    const nav = page.getByRole('navigation', {
      name: mobile ? 'Robot Wiki taxonomy drawer' : 'Robot Wiki taxonomy', exact: true,
    });
    const current = nav.getByRole('link', { name: 'RL Fine-Tuning of Policies', exact: true });
    await expect(current).toBeVisible();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    if (mobile) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Site navigation' })).toHaveCount(0);
      await expect(menu).toBeFocused();
      await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');
    }
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
    await expect(prose).toContainText('PPO updates the denoising policy while the environment dynamics stay fixed.');
    await expect(prose).toContainText('16 of 20 hardware trials');
    await expect(prose).toContainText('from 15 to 90 minutes');
    await expect(prose).toContainText('144% is a rounded relative gain');
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
      const chips = prose.locator(`[data-cite-id="${id}"] a[target="_blank"]`);
      expect(await chips.count()).toBeGreaterThan(0);
      for (const chip of await chips.all()) {
        await expect(chip).toHaveAttribute('href', href);
        await chip.focus();
        const tooltip = chip.locator('xpath=../..').getByRole('tooltip');
        await expect(tooltip).toBeVisible();
        const bounds = await tooltip.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      await expect(page.locator(`#ref-${id} [data-reference-source-link]`)).toHaveAttribute('href', href);
    }
    const dppoReference = page.locator('#ref-dppo-2024');
    await dppoReference.getByRole('button', { name: 'Show all 9 authors' }).click();
    await expect(dppoReference.locator('[data-author-names]')).toContainText('Max Simchowitz');
    await dppoReference.getByRole('button', { name: 'Show 8 authors' }).click();
    await expect(page.locator('#ref-conrft-2025 [data-author-names]')).toContainText('Dongbin Zhao');
  });

  test('PLD keeps benchmark populations and YAM recovery distinct', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const row = page.getByRole('row').filter({ hasText: 'Residual RL (PLD)' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('2025');
    await expect(row).toContainText('preprint');
    await expect(row).not.toContainText('peer-reviewed');
    await expect(row).toContainText('99.2% across 3 LIBERO suites');
    await expect(row).toContainText('50 trials/task');
    await expect(row).toContainText('not 100% one-shot success');
    await expect(prose).toContainText('50.6-percentage-point gain');
    await expect(prose).toContainText('displayed means differ by 24.8 points');
    await expect(prose).toContainText('per-stage one-shot success is not 100%');
    await expect(prose.getByRole('link', { name: /Xiao 2025/ }).first())
      .toHaveAttribute('href', 'https://arxiv.org/abs/2511.00091');
  });

  test('EXPO-FT keeps the paper numbers, dated attribution, and chart in sync', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    // Attribution names the Stanford authors and dates the position pieces.
    await expect(prose).toContainText('Perry Dong, Kuo-Han Hung, Tian Gao, Dorsa Sadigh and Chelsea Finn (Stanford)');
    // Verified paper numbers stay in prose.
    await expect(prose).toContainText('30/30 successes on every evaluated task');
    await expect(prose).toContainText('19.1 minutes of online robot data');
    await expect(prose).toContainText('over 95% accuracy');
    await expect(prose).toContainText('around 40% success before online RL starts');
    await expect(prose).toContainText("It's a craft.");
    await expect(prose).toContainText('from 42% to 97%');
    // Citation chips link to the primary sources.
    for (const [id, href] of [
      ['expo-ft-2026', 'https://arxiv.org/abs/2605.25477'],
      ['expo-2025', 'https://arxiv.org/abs/2507.07986'],
      ['realtime-expo-ft-2026', 'https://arxiv.org/abs/2609.18207'],
      ['dsrl-2025', 'https://arxiv.org/abs/2506.15799'],
      ['perry-dong-post-training-2026', 'https://pd-perry.github.io/posts/post-training.html'],
    ]) {
      const chips = prose.locator(`[data-cite-id="${id}"] a[target="_blank"]`);
      expect(await chips.count()).toBeGreaterThan(0);
      for (const chip of await chips.all()) {
        await expect(chip).toHaveAttribute('href', href);
      }
      await expect(page.locator(`#ref-${id} [data-reference-source-link]`)).toHaveAttribute('href', href);
    }
    // The chart renders the paper's own four-task comparison: every EXPO-FT
    // bar is 30/30 and the contrast methods keep their measured counts.
    const chart = page
      .locator('svg[role="img"]')
      .filter({ has: page.getByTestId('expo-ft-bar-expo-ft-0') });
    await expect(chart).toBeVisible();
    for (let gi = 0; gi < 4; gi += 1) {
      await expect(page.getByTestId(`expo-ft-bar-expo-ft-${gi}`)).toContainText('30');
    }
    const expected = { dsrl: ['15', '24', '25', '12'], 'hil-serl': ['13', '0', '1', '8'], sft: ['16', '22', '23', '14'] };
    for (const [method, values] of Object.entries(expected)) {
      for (let gi = 0; gi < 4; gi += 1) {
        await expect(page.getByTestId(`expo-ft-bar-${method}-${gi}`)).toContainText(values[gi]);
      }
    }
    // The HIL-SERL footnote keeps the protocol caveat next to the chart.
    await expect(page.getByText('randomizes a substantially larger initial-state space').first()).toBeVisible();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
