import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

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
      /less than 62 hours of Droid robot video/,
      /77.3% top-1 accuracy on Something-Something v2/,
      /zero-shot on Franka Emika Panda arms/,
      /energy minimization in latent space/,
      /\$1.03 billion at a \$3.5 billion/,
      /Every currently usable interactive simulator is generative/,
      /reported robot tests are bounded tabletop skills/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
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
      main.getByRole('link', { name: /Assran et al\. 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2506.09985');
    await expect(
      main.getByRole('link', { name: /Heim 2026/ }).first(),
    ).toHaveAttribute(
      'href',
      'https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/',
    );
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 10 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('interactive: planning steps reduce the distance to the goal, reset restores', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const figure = page.locator('[data-figure-frame="jepa-planning"]');

    // The plan opens two steps in: the walked path, the fan of tried moves
    // and the note pointing at the kept one are on the stage at settle.
    await expect(figure.getByTestId('walked-path')).toBeVisible();
    await expect(figure.getByTestId('candidate-fan')).toBeVisible();
    await expect(figure.locator('[data-figure-annotation]')).toContainText(
      'Each step: try 24 possible moves,',
    );
    await expect(figure.getByTestId('gap-label')).toHaveText('55% left');

    // The no-decoder marker and the readouts live in "How this was made".
    await openHowThisWasMade(figure);
    await expect(page.getByTestId('no-decoder-note')).toContainText(
      /no pixel decoder/i,
    );
    await expect(page.getByTestId('no-decoder-note')).toContainText(/synthetic two-dimensional points/);
    const initial = await distanceReadout(page);
    expect(initial).toBeGreaterThan(0.4);
    await expect(page.getByTestId('step-readout')).toHaveText('2');

    // Each planning step decreases the distance readout.
    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: 'Plan next move' }).click();
      values.push(await distanceReadout(page));
    }
    expect(values[0]).toBeLessThan(initial);
    expect(values[1]).toBeLessThan(values[0]);
    expect(values[2]).toBeLessThan(values[1]);
    await expect(page.getByTestId('step-readout')).toHaveText('5');

    // The fan renders one tried move per option.
    expect(await page.getByTestId('candidate-sequence').count()).toBe(24);

    // Reset, in "Adjust more", restores the opening distance and step count.
    await openAdjustMore(figure);
    await figure.getByRole('button', { name: 'Reset' }).click();
    expect(await distanceReadout(page)).toBeCloseTo(initial, 3);
    await expect(page.getByTestId('step-readout')).toHaveText('2');
  });

  test('interactive: goal switch restarts planning; keyboard path works', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const figure = page.locator('[data-figure-frame="jepa-planning"]');
    await openHowThisWasMade(figure);
    const pickInitial = await distanceReadout(page);

    await openAdjustMore(figure);
    await figure.getByTestId('goal-place').click();
    await expect(figure.getByTestId('goal-place')).toHaveAttribute('aria-pressed', 'true');
    await expect(figure.getByTestId('picture-place')).toBeVisible();
    await expect(page.getByTestId('step-readout')).toHaveText('2');
    const placeInitial = await distanceReadout(page);
    expect(placeInitial).toBeGreaterThan(0);
    expect(placeInitial).not.toBeCloseTo(pickInitial, 3);

    // Keyboard: focus the plan button and activate it with Enter.
    await page.getByRole('button', { name: 'Plan next move' }).focus();
    await page.keyboard.press('Enter');
    expect(await distanceReadout(page)).toBeLessThan(placeInitial);

    // The options slider is keyboard adjustable, and the fan follows it.
    const slider = page.getByRole('slider', { name: /options tried each step/i });
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveValue('20');
    await expect(slider).toHaveAttribute('aria-valuetext', '20 options');
    expect(await page.getByTestId('candidate-sequence').count()).toBe(20);
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
