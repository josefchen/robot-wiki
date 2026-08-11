import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/data-hardware/data-bottleneck/';

test.describe('data-hardware data-bottleneck module', () => {
  test('renders the three prose strands and the active sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Data Bottleneck' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // Strand 1: robot-hours versus LLM tokens.
    for (const name of [
      /GPT-3 consumed 300 billion tokens/,
      /holds 76,000 trajectories totaling 350 hours/,
      /two data universes, eight orders of magnitude apart/i,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    // Strand 2: scaling laws, diversity over density.
    for (const name of [
      /diversity beats density/i,
      /32 environments with 50 demonstrations each/,
      /GO-1-Pro, a 15% performance gain/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    // Strand 3: EgoScale/EgoDex-style alternative data sources. The
    // "success rate" jargon is wrapped in a <Term> tooltip, which splits
    // the sentence across element boundaries, so assert text runs that
    // stay inside a single text node (library/user-testing.md quirk 8).
    for (const name of [
      /829 hours of dexterous human manipulation/,
      /20,854 hours of action-labeled egocentric human video/,
      /by 54% over a no-pretraining baseline/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'The Data Bottleneck' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips resolve and link externally', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Brown 2020/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2005.14165');
    await expect(
      main.getByRole('link', { name: /Meta AI 2024/ }).first(),
    ).toHaveAttribute('href', 'https://ai.meta.com/blog/meta-llama-3/');
    await expect(
      main.getByRole('link', { name: /Lin 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2410.18647');
    await expect(
      main.getByRole('link', { name: /Shi 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2507.06219');
    await expect(
      main.getByRole('link', { name: /Zheng 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2602.16710');
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(13);
  });

  test('log-log chart renders with power-of-ten tick labels on both axes', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const xTicks = page.locator('[data-testid^="x-tick-"]');
    await expect(xTicks).toHaveCount(7);
    await expect(xTicks.first()).toHaveText('10⁰');
    await expect(xTicks.last()).toHaveText('10⁶');
    const yTicks = page.locator('[data-testid^="y-tick-"]');
    await expect(yTicks).toHaveCount(6);
    await expect(yTicks.first()).toHaveText('10⁹');
    await expect(yTicks.last()).toHaveText('10¹⁴');
    await expect(page.getByTestId('robot-marker-droid')).toBeVisible();
    await expect(page.getByTestId('robot-marker-agibot')).toBeVisible();
    await expect(page.getByTestId('llm-marker-llama3')).toBeVisible();
    await expect(page.getByTestId('gap-line')).toBeVisible();
  });

  test('teleop-farm slider is keyboard-operable with a consistent readout', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const hours = page.getByTestId('hours-readout');
    const oxe = page.getByTestId('oxe-years-readout');
    await expect(hours).toHaveText('15,000 h/yr');
    await expect(oxe).toHaveText('8 mo');

    const slider = page.getByRole('slider', { name: /teleoperation rigs/i });
    await slider.focus();
    // Arrow up: more rigs, more throughput, fewer years.
    await page.keyboard.press('ArrowRight');
    await expect(hours).toHaveText('16,000 h/yr');
    // Arrow down below the default: the readout moves the other way.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(hours).toHaveText('14,000 h/yr');
    // Extremes stay finite and direction-consistent.
    await page.keyboard.press('End');
    await expect(hours).toHaveText('500,000 h/yr');
    await expect(oxe).toHaveText('1 mo');
    await page.keyboard.press('Home');
    await expect(hours).toHaveText('1,000 h/yr');
    await expect(oxe).toHaveText('10.0 yr');

    // Rate toggle switches to the measured DROID throughput.
    await page.getByRole('button', { name: /droid-measured/i }).click();
    await expect(hours).toHaveText('7 h/yr');

    // Reset restores the default fleet and rate.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(hours).toHaveText('15,000 h/yr');
    await expect(
      page.getByRole('button', { name: /dedicated farm/i }),
    ).toHaveAttribute('aria-pressed', 'true');
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
