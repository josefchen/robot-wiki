import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
      main.getByText(/not cheaply simulatable/i).first(),
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
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
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
      main.getByRole('link', { name: /Aljalbout 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2510.20808');
    await expect(
      main.getByRole('link', { name: /Rudin 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2109.11978');
    const chips = main.locator('a[href^="https://arxiv.org/abs/"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
  });

  test('contact geometry interactive: scenario switch, slider, and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: locomotion, survivable 2 mm error, four contacts.
    await expect(page.getByTestId('contact-count-readout')).toHaveText('4');
    await expect(page.getByTestId('outcome-readout')).toHaveText(/stable/i);

    // Scenario switch: more contacts, jammed at the same error.
    await page.getByRole('button', { name: 'Manipulation', exact: true }).click();
    await expect(page.getByTestId('contact-count-readout')).toHaveText('14');
    await expect(page.getByTestId('outcome-readout')).toHaveText(/jammed/i);

    // Keyboard slider: below clearance the peg seats.
    const slider = page.getByRole('slider', { name: /contact-model error/i });
    await slider.focus();
    for (let i = 0; i < 18; i += 1) await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('error-readout')).toHaveText('ε = 0.2 mm');
    await expect(page.getByTestId('outcome-readout')).toHaveText(/seats/i);

    // Locomotion tolerates the same error until 20 mm.
    await page.getByRole('button', { name: 'Locomotion', exact: true }).click();
    await expect(page.getByTestId('outcome-readout')).toHaveText(/stable/i);
    await slider.fill('25');
    await expect(page.getByTestId('outcome-readout')).toHaveText(
      /support lost/i,
    );

    // Reset restores the initial state.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('contact-count-readout')).toHaveText('4');
    await expect(page.getByTestId('error-readout')).toHaveText('ε = 2.0 mm');
    await expect(page.getByTestId('outcome-readout')).toHaveText(/stable/i);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
