import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/world-models/jepa/';

async function distanceReadout(page: import('@playwright/test').Page) {
  const text = await page.getByTestId('distance-readout').textContent();
  const value = Number.parseFloat(text ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('world-models jepa module', () => {
  test('renders the V-JEPA 2 facts and both sides of the debate', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'JEPA and the Non-Generative Counterargument',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      /over 1 million hours of internet video/,
      /less than 62 hours of unlabeled robot video from the Droid dataset/,
      /77.3 top-1 on Something-Something v2/,
      /zero-shot on Franka arms/,
      /energy minimization in latent space/,
      /\$1.03 billion at a \$3.5 billion/,
      /Every currently usable interactive simulator is generative/,
      /short-horizon single-arm pick-and-place/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', {
        name: 'JEPA and the Non-Generative Counterargument',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to V-JEPA 2 and the AMI Labs funding source', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Assran 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2506.09985');
    await expect(
      main.getByRole('link', { name: /Heim 2026/ }).first(),
    ).toHaveAttribute(
      'href',
      'https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/',
    );
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('interactive: planning steps reduce the goal-latent distance, reset restores', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default state: goal-embedding distance readout, no-decoder marker.
    await expect(page.getByTestId('no-decoder-note')).toContainText(
      /no pixel decoder/i,
    );
    const initial = await distanceReadout(page);
    expect(initial).toBeGreaterThan(0.5);

    // Each planning step decreases the distance readout.
    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: /plan step/i }).click();
      values.push(await distanceReadout(page));
    }
    expect(values[0]).toBeLessThan(initial);
    expect(values[1]).toBeLessThan(values[0]);
    expect(values[2]).toBeLessThan(values[1]);
    await expect(page.getByTestId('step-readout')).toHaveText('3');

    // The candidate fan renders one sequence per budget unit.
    expect(await page.getByTestId('candidate-sequence').count()).toBe(24);

    // Reset restores the initial distance and step count.
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await distanceReadout(page)).toBeCloseTo(initial, 3);
    await expect(page.getByTestId('step-readout')).toHaveText('0');
  });

  test('interactive: goal switch restarts planning; keyboard path works', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const pickInitial = await distanceReadout(page);

    await page.getByRole('button', { name: /goal: place/i }).click();
    await expect(
      page.getByRole('button', { name: /goal: place/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('step-readout')).toHaveText('0');
    const placeInitial = await distanceReadout(page);
    expect(placeInitial).toBeGreaterThan(0);
    expect(placeInitial).not.toBeCloseTo(pickInitial, 3);

    // Keyboard: focus the plan button and activate it with Enter.
    await page.getByRole('button', { name: /plan step/i }).focus();
    await page.keyboard.press('Enter');
    expect(await distanceReadout(page)).toBeLessThan(placeInitial);

    // The search-budget slider is keyboard adjustable.
    const slider = page.getByRole('slider', { name: /search budget/i });
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveValue('20');
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
