import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { CITATIONS } from '../../data/citations';
import {
  SLIDER_MAX,
  SLIDER_MIN,
  hoursToSlider,
} from '@/lib/egoscale-law';

const ROUTE = '/frontier/generalization/';

/**
 * The article's only scaling chart sits inside the prediction step's
 * disclosure, seeded at the 250k h horizon; it is hidden until the step
 * opens.
 */
function egs(page: Page) {
  return page.locator('[data-figure-frame="egoscale-scaling"]');
}

async function openStep(page: Page) {
  const reveal = page.locator(
    'details[data-reveal]:has([data-figure-frame="egoscale-scaling"])',
  );
  await reveal.locator(':scope > summary').click();
  await expect(reveal).toHaveAttribute('open');
}


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

    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
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
    ).toHaveAttribute('href', CITATIONS.find((c) => c.id === 'pi05-2025')!.url);
    await expect(
      main.getByRole('link', { name: 'Zheng 2026' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2602.16710');
    await expect(
      main.getByRole('link', { name: 'Goldberg 2025' }).first(),
    ).toHaveAttribute(
      'href',
      'https://doi.org/10.1126/scirobotics.aea7390',
    );
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 12 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://"]');
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
    await openStep(page);
    const slider = egs(page).getByRole('slider', HORIZON);
    await expect(slider).toBeVisible();
    await expect(
      egs(page).getByRole('button', { name: /reset/i }),
    ).toBeVisible();

    // Default 250k horizon: the band and dashed extrapolation are visible
    // once the step opens, both scenarios are read out, and the fit is
    // already past 100%.
    const band = egs(page).getByTestId('uncertainty-band');
    await expect(band).toBeVisible();
    await expect(egs(page).getByTestId('extrapolated-loss-law')).toBeVisible();
    await expect(egs(page).getByTestId('horizon-readout')).toHaveText('250k h');
    await expect(egs(page).getByTestId('loss-readout')).toContainText('0.0074');
    await expect(egs(page).getByTestId('loss-readout')).toContainText('0.0150');
    await expect(egs(page).getByTestId('impossible-note')).toBeVisible();

    // The validation-loss caveat is the figure's source line; the band's
    // status is named in the legend.
    const caveat = egs(page).getByTestId('scaling-caveat');
    await expect(caveat).toContainText(/validation loss/i);
    await expect(caveat).toContainText(/real-world success rate/i);
    await expect(egs(page).locator('[data-figure-legend]')).toContainText(
      /not a confidence interval/i,
    );

    // Pulling back to the measured-range boundary removes the band.
    await setSlider(slider, SLIDER_MIN);
    await expect(egs(page).getByTestId('horizon-readout')).toHaveText('20k h');
    await expect(egs(page).getByTestId('uncertainty-band')).toHaveCount(0);

    // Pushing to 1M updates the projection and flags the impossible fit.
    await setSlider(slider, SLIDER_MAX);
    await expect(egs(page).getByTestId('horizon-readout')).toHaveText('1M h');
    await expect(egs(page).getByTestId('loss-readout')).toContainText('0.0033');
    await expect(egs(page).getByTestId('impossible-note')).toBeVisible();

    // Keyboard operation moves the horizon.
    await setSlider(slider, hoursToSlider(100_000));
    const before = await egs(page).getByTestId('horizon-readout').textContent();
    await slider.focus();
    for (let i = 0; i < 50; i += 1) await page.keyboard.press('ArrowRight');
    await expect(egs(page).getByTestId('horizon-readout')).not.toHaveText(
      before ?? '',
    );

    // Reset restores the default.
    await egs(page).getByRole('button', { name: /reset/i }).click();
    await expect(egs(page).getByTestId('horizon-readout')).toHaveText('250k h');
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
    // The bar is drawn on the chart, and at 100k hours the fit is still
    // below it.
    await openStep(page);
    await expect(egs(page).getByTestId('solved-bar')).toBeVisible();
    await setSlider(
      egs(page).getByRole('slider', HORIZON),
      hoursToSlider(100_000),
    );
    await expect(egs(page).getByTestId('horizon-readout')).toHaveText('100k h');
    await expect(egs(page).getByTestId('completion-readout')).toContainText(
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
