import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import {
  SLIDER_MAX,
  SLIDER_MIN,
  hoursToSlider,
} from '@/lib/egoscale-law';

const ROUTE = '/frontier/generalization/';

const HORIZON = { name: /extrapolation horizon/i };

test.describe('frontier generalization module', () => {
  test('renders with prose, headings, and active sidebar state (VAL-FRONT-001, VAL-FRONT-002)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Generalization' }),
    ).toBeVisible();

    const main = page.locator('#main-content');
    const headings = await main
      .locator('h2')
      .allTextContents();
    expect(headings.length).toBeGreaterThanOrEqual(4);
    const proseLength = (await main.textContent())?.length ?? 0;
    expect(proseLength).toBeGreaterThan(4000);

    // No raw MDX or component syntax leaks into the rendered page.
    const mainText = (await main.textContent()) ?? '';
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Generalization' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('states what pi0.5/pi0.7 demonstrate, and what they do not (VAL-FRONT-010)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const text = (await main.textContent()) ?? '';

    // The demonstrated results.
    expect(text).toMatch(/cleaning kitchens and bedrooms in homes/i);
    expect(text).toMatch(/air fryer/i);
    expect(text).toMatch(/UR5e/);
    expect(text).toMatch(/85\.6%/);
    expect(text).toMatch(/375 hours/);

    // The explicit, unhedged limits.
    expect(text).toMatch(/does not finish the task without coaching/i);
    expect(text).toMatch(/no published result shows a generalist policy/i);
    expect(text).toMatch(/three homes and ten trials per task/i);

    // The open-world gap passage: distribution shift, lab scenes vs homes.
    expect(text).toMatch(/distribution shift/i);
    expect(text).toMatch(/one-centimeter grasp error/i);
  });

  test('citation chips resolve and link externally (VAL-FRONT-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: 'Black 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2504.16054');
    await expect(
      main.getByRole('link', { name: 'Zheng 2026' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2602.16710');
    await expect(
      main.getByRole('link', { name: 'Goldberg 2025' }).first(),
    ).toHaveAttribute(
      'href',
      'https://doi.org/10.1126/scirobotics.aea7390',
    );
    const chips = main.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
    for (const id of [
      'pi05-2025',
      'pi07-2026',
      'pi07-blog-2026',
      'egoscale-2026',
      'goldberg-data-gap-2025',
      'karcini-position-2026',
    ]) {
      expect(await main.getByText(`missing citation: ${id}`).count()).toBe(0);
    }
  });

  test('scaling-law interactive extrapolates with an uncertainty band and caveat (VAL-FRONT-011)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const slider = page.getByRole('slider', HORIZON);
    await expect(slider).toBeVisible();
    await expect(
      page.getByRole('button', { name: /reset/i }).first(),
    ).toBeVisible();

    // Default 100k horizon: the band and dashed extrapolation are visible
    // on load, and both scenarios are read out.
    const band = page.getByTestId('uncertainty-band');
    await expect(band).toBeVisible();
    await expect(page.getByTestId('extrapolated-loss-law')).toBeVisible();
    await expect(page.getByTestId('horizon-readout')).toHaveText('100k h');
    await expect(page.getByTestId('loss-readout')).toContainText('0.0102');
    await expect(page.getByTestId('loss-readout')).toContainText('0.0150');

    // The validation-loss caveat is stated next to the chart.
    const caveat = page.getByTestId('scaling-caveat');
    await expect(caveat).toContainText(/validation loss/i);
    await expect(caveat).toContainText(/not a confidence interval/i);
    await expect(caveat).toContainText(/real-world success rate/i);

    // Pulling back to the measured-range boundary removes the band.
    await setSlider(slider, SLIDER_MIN);
    await expect(page.getByTestId('horizon-readout')).toHaveText('20k h');
    await expect(page.getByTestId('uncertainty-band')).toHaveCount(0);

    // Pushing to 1M updates the projection and flags the impossible fit.
    await setSlider(slider, SLIDER_MAX);
    await expect(page.getByTestId('horizon-readout')).toHaveText('1M h');
    await expect(page.getByTestId('loss-readout')).toContainText('0.0033');
    await expect(page.getByTestId('impossible-note')).toBeVisible();

    // Keyboard operation moves the horizon.
    await setSlider(slider, hoursToSlider(100_000));
    const before = await page.getByTestId('horizon-readout').textContent();
    await slider.focus();
    for (let i = 0; i < 50; i += 1) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('horizon-readout')).not.toHaveText(
      before ?? '',
    );

    // Reset restores the default.
    await page.getByRole('button', { name: /reset/i }).first().click();
    await expect(page.getByTestId('horizon-readout')).toHaveText('100k h');
  });

  test('defines the solved bar and notes no system meets it (VAL-FRONT-012)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const text = (await main.textContent()) ?? '';

    // The criterion: >90% across many unseen homes, no per-site data.
    expect(text).toMatch(/better than 90% success across many unseen homes/i);
    expect(text).toMatch(/no per-site data collection/i);
    // The honest note.
    expect(text).toMatch(
      /no current system has been evaluated this way/i,
    );
    // The bar is drawn on the chart and every measured point sits below it.
    await expect(page.getByTestId('solved-bar')).toBeVisible();
    await expect(page.getByTestId('completion-readout')).toContainText(
      /below the solved bar/i,
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
