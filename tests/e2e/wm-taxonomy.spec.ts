import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/world-models/taxonomy/';

test.describe('world-models taxonomy module', () => {
  test('renders the disambiguation framing and functional cut', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'What Is a World Model?' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      /multiple architecturally distinct paradigms/,
      /predictions change under the agent's action/,
      /useful for decision-making/,
      /A physics engine is a world model/,
      /3D Gaussian Splatting twin is not/,
      /appearance is learned, physics is not/i,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'What Is a World Model?' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Hou 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2605.00080');
    await expect(
      main.getByRole('link', { name: /Hafner 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2301.04104');
    await expect(
      main.getByRole('link', { name: /Assran 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2506.09985');
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(11);
  });

  test('six-paradigm table renders all rows with populated cells', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const rows = page.locator('[data-testid^="wm-row-"]');
    await expect(rows).toHaveCount(6);
    await expect(
      page.getByTestId('wm-row-latent-dynamics'),
    ).toContainText('continuation');
    await expect(
      page.getByTestId('wm-row-decoder-free-latent'),
    ).toContainText('no reconstruction');
    await expect(
      page.getByTestId('wm-row-generative-video'),
    ).toContainText('Future pixels');
    await expect(page.getByTestId('wm-row-jepa')).toContainText(
      'never pixels',
    );
    await expect(page.getByTestId('wm-row-world-action')).toContainText(
      'action chunks',
    );
    await expect(page.getByTestId('wm-row-symbolic')).toContainText(
      'predicates',
    );
  });

  test('disambiguator: panels, use highlighting, keyboard, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: latent dynamics selected, policy learning highlighted.
    await expect(
      page.getByRole('button', { name: /^Latent dynamics/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('use-policy-learning')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByTestId('use-evaluation')).toHaveAttribute(
      'data-active',
      'false',
    );

    // Selecting generative video highlights evaluation + data generation.
    await page.getByRole('button', { name: /^Generative video/ }).click();
    await expect(page.getByTestId('use-evaluation')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByTestId('use-data-generation')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByTestId('use-planning')).toHaveAttribute(
      'data-active',
      'false',
    );
    await expect(page.getByTestId('selected-readout')).toHaveText(
      'Generative video',
    );

    // Keyboard path: tab to the JEPA panel and activate with Enter.
    await page.getByRole('button', { name: /^JEPA/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('use-planning')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByTestId('use-data-generation')).toHaveAttribute(
      'data-active',
      'false',
    );

    // Reset restores the default.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('selected-readout')).toHaveText(
      'Latent dynamics',
    );
    await expect(page.getByTestId('use-policy-learning')).toHaveAttribute(
      'data-active',
      'true',
    );
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
