import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/adjacent/autonomous-vehicles/';

test.describe('adjacent autonomous-vehicles module', () => {
  test('renders with at least 3,000 words of article prose (VAL-ADJ-001)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Autonomous Vehicles' }),
    ).toBeVisible();

    // The article region excludes nav, sidebar, and footer by construction
    // (data-pagefind-body is the .prose div the template measures reading
    // time from).
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const text = (await prose.textContent()) ?? '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    expect(words, `article word count (${words})`).toBeGreaterThanOrEqual(3000);

    // Serif long-form typography is applied to the article region.
    const fontFamily = await prose.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('font-family'),
    );
    expect(fontFamily.toLowerCase()).toContain('serif');

    // Standard shell intact: sidebar taxonomy with the active route marked.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Autonomous Vehicles' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('names perception, prediction, planning, and control as distinct stages (VAL-ADJ-002a)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const stage of ['Perception', 'Prediction', 'Planning', 'Control']) {
      await expect(
        page.getByRole('heading', { level: 3, name: stage, exact: true }),
      ).toBeVisible();
    }
  });

  test('argues why AV is not solved and relates AV to robot learning (VAL-ADJ-002b/c)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const text = (await prose.textContent()) ?? '';
    // The long-tail / edge-case argument.
    expect(text).toMatch(/long tail/);
    expect(text).toMatch(/not solved|unsolved/);
    // The robot-learning relation: imitation lineage and VLA convergence.
    expect(text).toMatch(/behavior cloning|imitation learning/);
    expect(text).toMatch(/vision-language-action|VLA/);
  });

  test('citation chips resolve to primary sources in every topic area (VAL-ADJ-002)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    // Stack area: UniAD and VectorNet abs pages.
    await expect(
      prose.getByRole('link', { name: 'Hu 2023' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2212.10156');
    await expect(
      prose.getByRole('link', { name: 'Gao 2020' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2005.04259');
    // Why-not-solved area: Waymo crash-rate study, NTSB report, Koopman.
    await expect(
      prose.getByRole('link', { name: 'Kusano 2025' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2505.01515');
    await expect(
      prose.getByRole('link', { name: 'NTSB 2019' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.ntsb.gov/investigations/accidentreports/reports/har1903.pdf',
    );
    // Robot-learning relation: EMMA and the Waymo World Model post.
    await expect(
      prose.getByRole('link', { name: 'Hwang 2024' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2410.23262');
    await expect(
      prose.getByRole('link', { name: 'Waymo 2026' }).first(),
    ).toHaveAttribute(
      'href',
      'https://waymo.com/blog/2026/02/the-waymo-world-model-a-new-frontier-for-autonomous-driving-simulation/',
    );
    const chips = prose.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(12);
  });

  test('stack table renders completely with no unparsed JSX (VAL-ADJ-007)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /autonomous-driving stack/i,
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader').first()).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(4);
    const text =
      (await page.locator('div.prose[data-pagefind-body]').textContent()) ?? '';
    expect(text).not.toContain('import {');
    expect(text).not.toContain('<Cite');
    expect(text).not.toContain('<Term');
    expect(text).not.toContain('<AvStackTable');
    expect(text).not.toContain('$$');
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
