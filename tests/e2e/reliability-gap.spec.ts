import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/frontier/reliability-gap/';

const PER_STEP = { name: /per-step success/i };
const HORIZON = { name: /episode length/i };

/** Parse the compounded-success readout, e.g. "21.5%" -> 21.5. */
async function readoutValue(page: import('@playwright/test').Page): Promise<number> {
  const text = (await page.getByTestId('episode-success-readout').textContent()) ?? '';
  expect(text).not.toContain('NaN');
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('frontier reliability-gap module', () => {
  test('frames the 80%-vs-99.9% thesis with correct compounding math (VAL-FRONT-004)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Reliability Gap' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    const mainText = (await main.textContent()) ?? '';

    // The core framing.
    expect(mainText).toContain('80%');
    expect(mainText).toContain('99.9%');
    expect(mainText).toMatch(/demo/i);
    expect(mainText).toMatch(/product/i);

    // The three compounding data points, arithmetically exact.
    // 0.95^30 = 0.2146, 0.99^30 = 0.7397, 0.999^30 = 0.9704.
    expect(mainText).toMatch(/95% per-step[\s\S]{0,120}21%/);
    expect(mainText).toMatch(/99% per-step[\s\S]{0,120}74%/);
    expect(mainText).toMatch(/99\.9% per-step[\s\S]{0,120}97%/);

    // The steep-hill-climb position is attributed to Lisa Yan via Bessemer,
    // not presented as unattributed fact.
    expect(mainText).toContain('Lisa Yan');
    expect(mainText).toMatch(/steep hill climb/);
    expect(mainText).toContain('Bessemer');

    // No raw MDX or component syntax leaks into the rendered page.
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'The Reliability Gap' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-FRONT-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // Headline sources named by the module brief.
    await expect(
      main.getByRole('link', { name: 'Bessemer Venture Partners 2026' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai',
    );
    await expect(
      main.getByRole('link', { name: 'Lei 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2510.14830');
    await expect(
      main.getByRole('link', { name: 'Noreika 2026' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
    );
    // At least five inline citation chips, all external.
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 8 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
    for (const id of [
      'bessemer-robotics-2026',
      'pistar06-blog-2025',
      'rl-100-2025',
      'asimov-agentic-2026',
      'gemini-robotics-2-2026',
      'technology-org-deployed-2026',
    ]) {
      expect(await main.getByText(`missing citation: ${id}`).count()).toBe(0);
    }
  });

  test('compounding calculator is interactive and computes correctly (VAL-FRONT-005)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const perStep = page.getByRole('slider', PER_STEP);
    const horizon = page.getByRole('slider', HORIZON);
    const readout = page.getByTestId('episode-success-readout');
    await expect(perStep).toBeVisible();
    await expect(horizon).toBeVisible();
    await expect(readout).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i }).first()).toBeVisible();
    // Boundary inputs are reachable on this mount.
    await expect(perStep).toHaveAttribute('min', '0');
    await expect(perStep).toHaveAttribute('max', '100');

    // Anchor: 95% per-step over 30 steps reads about 21%.
    await setSlider(perStep, 95);
    await setSlider(horizon, 30);
    await expect(readout).toHaveText('21.5%');
    expect(await readoutValue(page)).toBeCloseTo(21.5, 0);

    // 99% updates the readout to about 74% without a reload.
    await setSlider(perStep, 99);
    await expect(readout).toHaveText('74.0%');
    expect(await readoutValue(page)).toBeCloseTo(74.0, 0);

    // Keyboard operation moves the readout in the right direction.
    await setSlider(perStep, 95);
    await perStep.focus();
    await page.keyboard.press('ArrowUp');
    expect(await readoutValue(page)).toBeGreaterThan(21.5);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await readoutValue(page)).toBeLessThan(21.5);

    // Reset restores the anchor state.
    await page.getByRole('button', { name: /reset/i }).first().click();
    await expect(readout).toHaveText('21.5%');
    await expect(perStep).toHaveValue('95');
    await expect(horizon).toHaveValue('30');
  });

  test('task-horizon control drives the compounding readout (VAL-FRONT-021)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const horizon = page.getByRole('slider', HORIZON);
    const readout = page.getByTestId('episode-success-readout');
    await setSlider(page.getByRole('slider', PER_STEP), 95);

    await setSlider(horizon, 30);
    await expect(readout).toHaveText('21.5%');
    // 0.95^60 = 4.61%, contract tolerance +/-1pp.
    await setSlider(horizon, 60);
    await expect(readout).toHaveText('4.6%');
    // Decreasing N monotonically raises the readout.
    await setSlider(horizon, 10);
    await expect(readout).toHaveText('59.9%');
    await setSlider(horizon, 30);
    await expect(readout).toHaveText('21.5%');
  });

  test('boundary inputs produce honest outputs (VAL-FRONT-022)', async ({ page }) => {
    await page.goto(ROUTE);
    const perStep = page.getByRole('slider', PER_STEP);
    const horizon = page.getByRole('slider', HORIZON);
    const readout = page.getByTestId('episode-success-readout');

    // 100% per-step yields 100% at any horizon.
    await setSlider(perStep, 100);
    await setSlider(horizon, 30);
    await expect(readout).toHaveText('100.0%');
    await setSlider(horizon, 100);
    await expect(readout).toHaveText('100.0%');

    // 0% per-step yields 0% for any N >= 1.
    await setSlider(perStep, 0);
    await setSlider(horizon, 1);
    await expect(readout).toHaveText('0.0%');
    await setSlider(horizon, 100);
    await expect(readout).toHaveText('0.0%');

    // N=1 reads exactly the per-step value.
    await setSlider(horizon, 1);
    await setSlider(perStep, 73.4);
    await expect(readout).toHaveText('73.4%');

    // No NaN, blank, >100%, or <0% readout at any extreme.
    const text = (await readout.textContent()) ?? '';
    expect(text).not.toContain('NaN');
    expect(text.trim()).not.toBe('');
    const value = Number.parseFloat(text);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  test('deployment-reality dashboard separates verified from claimed (VAL-FRONT-006)', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // The four anchor entries with their figures.
    const agility = page.getByTestId('deployment-row-agility-digit');
    await expect(agility).toContainText('65,000');
    await expect(agility).toContainText('verified');
    const figure = page.getByTestId('deployment-row-figure-bmw');
    await expect(figure).toContainText('1,250');
    await expect(figure).toContainText('verified');
    const unitree = page.getByTestId('deployment-row-unitree-2025');
    await expect(unitree).toContainText('5,500');
    await expect(unitree).toContainText('verified');
    const tesla = page.getByTestId('deployment-row-tesla-optimus');
    await expect(tesla).toContainText(/not started/i);
    await expect(tesla).toContainText('verified');

    // Every row carries an external source link and an as-of date.
    const rows = page.getByTestId(/^deployment-row-/);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < rowCount; i += 1) {
      const row = rows.nth(i);
      const source = row.getByRole('link');
      await expect(source).toHaveAttribute('href', /^https:\/\//);
      await expect(row).toContainText(/[A-Z][a-z]{2} \d{4}/);
    }

    // Claimed rows exist and are visually distinct from verified rows.
    const claimedBadges = page.getByText('claimed', { exact: true });
    expect(await claimedBadges.count()).toBeGreaterThanOrEqual(1);
    const verifiedVariant = await page
      .getByText('verified', { exact: true })
      .first()
      .getAttribute('data-variant');
    const claimedVariant = await claimedBadges.first().getAttribute('data-variant');
    expect(verifiedVariant).not.toBe(claimedVariant);

    // The filter separates the two classes, and reset restores the full set.
    // Scope to the dashboard: the compounding calculator has its own Reset.
    const dashboard = page.getByTestId('deployment-dashboard');
    await dashboard.getByRole('button', { name: 'Claimed' }).click();
    expect(await page.getByTestId(/^deployment-row-/).count()).toBe(
      await claimedBadges.count(),
    );
    await expect(page.getByTestId('deployment-row-agility-digit')).toHaveCount(0);
    await dashboard.getByRole('button', { name: 'Reset' }).click();
    expect(await page.getByTestId(/^deployment-row-/).count()).toBe(rowCount);
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
