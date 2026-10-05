import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { waitForHydration } from './interaction-ready';
import { openAdjustMore } from './helpers/figure-fold';

const ROUTE = '/rl-sim2real/why-rl-locomotion/';

test.describe('why-rl-locomotion module', () => {
  test('renders the module with prose, the asymmetry claim, and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Why RL Won Locomotion but Not Manipulation',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // The core asymmetry and its cause are stated in the prose.
    await expect(
      main.getByText(/default production approach for quadruped locomotion/i),
    ).toBeVisible();
    await expect(
      main.getByText(/difficult to simulate cheaply/i).first(),
    ).toBeVisible();
    // The six MDP property rows render with both cells populated.
    for (const key of [
      'observation-sufficiency',
      'contact-structure',
      'contact-error-sensitivity',
      'reward-density',
      'environment-authoring',
      'episode-reset',
    ]) {
      const row = page.getByTestId(`mdp-row-${key}`);
      await expect(row).toBeVisible();
      const cells = await row.locator('td').allTextContents();
      expect(cells).toHaveLength(2);
      for (const cell of cells) expect(cell.trim().length).toBeGreaterThan(0);
    }
    // Sidebar marks this module active.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', {
        name: 'Why RL Won Locomotion but Not Manipulation',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // The reality-gap survey is cited and links to arXiv:2510.20808.
    await expect(
      main.getByRole('link', { name: /Aljalbout et al\. 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2510.20808');
    await expect(
      main.getByRole('link', { name: /Rudin et al\. 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2109.11978');
    // Scoped to the authored prose: the generated References bibliography
    // also renders arxiv links inside main, and with every inline chip deleted its 6 registry arxiv anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://arxiv.org/abs/"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
  });

  test('contact geometry interactive: error presets, slider, and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const frame = page.locator('main [data-figure-frame="contact-geometry"]');

    // Default: the coin preset, a survivable 2 mm error for locomotion with
    // four contacts, while the peg beside it, with fourteen, jams.
    await expect(frame.getByRole('button', { name: /coin/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('contact-count-readout-locomotion')).toHaveText('4');
    await expect(page.getByTestId('outcome-readout-locomotion')).toHaveText(/stable/i);
    await expect(page.getByTestId('contact-count-readout-manipulation')).toHaveText('14');
    await expect(page.getByTestId('outcome-readout-manipulation')).toHaveText(/jammed/i);
    await expect(frame.locator('[data-figure-annotation]')).toContainText('the peg misses the hole');

    // Keyboard slider, in Adjust more: below clearance the peg seats.
    await openAdjustMore(frame);
    const slider = page.getByRole('slider', { name: /contact-model error/i });
    await waitForHydration(slider);
    await slider.focus();
    for (let i = 0; i < 18; i += 1) await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('error-readout')).toHaveText('0.2 mm');
    await expect(page.getByTestId('outcome-readout-manipulation')).toHaveText(/seats/i);

    // Locomotion tolerates the same error until 20 mm.
    await expect(page.getByTestId('outcome-readout-locomotion')).toHaveText(/stable/i);
    await setSlider(slider, 25);
    await expect(page.getByTestId('outcome-readout-locomotion')).toHaveText(
      /support lost/i,
    );

    // Reset restores the initial state.
    await frame.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('contact-count-readout-locomotion')).toHaveText('4');
    await expect(page.getByTestId('error-readout')).toHaveText('2.0 mm');
    await expect(page.getByTestId('outcome-readout-locomotion')).toHaveText(/stable/i);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
