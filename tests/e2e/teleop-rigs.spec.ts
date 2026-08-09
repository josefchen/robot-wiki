import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/data-hardware/teleop-rigs/';

test.describe('data-hardware teleop-rigs module', () => {
  test('renders prose covering the four rig families (VAL-DATA-017)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Teleoperation Rigs' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // All four reference rig families appear in the prose.
    for (const family of [
      /ALOHA-class bimanual workstations/,
      /GELLO/,
      /UMI/,
      /VR teleoperation/,
    ]) {
      await expect(
        main.getByText(family).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    // Each family gets its own prose section.
    for (const heading of [
      'Bimanual workstations: fidelity first',
      'GELLO: the kinematic twin',
      'UMI: collection without a robot',
      'VR teleoperation: scale through headsets',
    ]) {
      await expect(
        main.getByRole('heading', { name: heading }),
      ).toBeVisible();
    }
    // No raw MDX or component syntax leaks into the rendered page.
    const mainText = (await main.textContent()) ?? '';
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Teleoperation Rigs' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips resolve and link externally (VAL-DATA-018)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: 'Zhao 2023' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2304.13705');
    await expect(
      main.getByRole('link', { name: 'Wu 2023' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2309.13037');
    await expect(
      main.getByRole('link', { name: 'Chi 2024' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2402.10329');
    await expect(
      main.getByRole('link', { name: 'Khazatsky 2024' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2403.12945');
    // Every chip is a real external link, never a dead anchor.
    const chips = main.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(9);
    for (const id of [
      'act-aloha-2023',
      'mobile-aloha-2024',
      'trossen-ai-2026',
      'lerobot-pricing-2026',
      'gello-2023',
      'umi-2024',
      'droid-2024',
      'open-television-2024',
      'bunny-visionpro-2024',
    ]) {
      // No unresolved citation fallbacks rendered.
      expect(await main.getByText(`missing citation: ${id}`).count()).toBe(0);
    }
  });

  test('rig comparison matrix renders four rigs across four dimensions (VAL-DATA-019)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /teleoperation rig families/i,
    });
    await expect(table).toBeVisible();
    const rows = table.getByRole('row');
    // Header plus four rig-family rows.
    await expect(rows).toHaveCount(5);
    for (const header of [
      'Rig',
      'Cost',
      'Data quality',
      'Throughput',
      'Embodiment gap',
      'Sources',
    ]) {
      await expect(
        table.getByRole('columnheader', { name: header }),
      ).toBeVisible();
    }
    for (const name of [
      /ALOHA-class workstation/,
      'GELLO',
      'UMI',
      /VR teleoperation/,
    ]) {
      await expect(table.getByText(name).first()).toBeVisible();
    }
    // Every row shows a low/medium/high badge plus a note in each of the
    // three rating columns, and every row links to an external source.
    const bodyRows = table.locator('tbody tr');
    for (let i = 0; i < (await bodyRows.count()); i += 1) {
      const row = bodyRows.nth(i);
      for (const col of [3, 4, 5]) {
        const cell = row.locator(`td:nth-child(${col})`);
        await expect(
          cell.getByText(/^(low|medium|high)$/).first(),
        ).toBeVisible();
        // The cell carries an explanatory note, not just the badge.
        expect(((await cell.textContent()) ?? '').trim().length).toBeGreaterThan(
          6,
        );
      }
      const links = row.locator('a[href^="https"]');
      expect(await links.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('matrix is interactive and honest about unknowns (VAL-DATA-020)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /teleoperation rig families/i,
    });

    // Highlight interaction: picking a dimension changes the presentation.
    const highlight = page.getByRole('button', {
      name: 'Data quality',
      exact: true,
    });
    await highlight.click();
    await expect(highlight).toHaveAttribute('aria-pressed', 'true');
    const detail = page.getByRole('region', { name: 'Dimension detail' });
    await expect(detail).toBeVisible();
    for (const name of [
      /ALOHA-class workstation/,
      'GELLO',
      'UMI',
      /VR teleoperation/,
    ]) {
      await expect(detail.getByText(name).first()).toBeVisible();
    }
    // Clicking the same dimension again returns to the overview.
    await highlight.click();
    await expect(highlight).toHaveAttribute('aria-pressed', 'false');
    await expect(detail).toHaveCount(0);

    // Sort interaction: embodiment gap ascending puts the matched-kinematics
    // rigs first.
    await page.getByRole('button', { name: 'Sort by embodiment gap' }).click();
    await expect(
      page.getByRole('columnheader', { name: 'Embodiment gap' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow.getByText(/ALOHA-class workstation|GELLO/)).toBeVisible();

    // Honesty: verified rigs show sourced costs; the VR family has no
    // published system cost and renders n/a, sorted last.
    const costCells = table.locator('tbody tr td:nth-child(2)');
    expect(await costCells.filter({ hasText: '$300' }).count()).toBe(1);
    expect(await costCells.filter({ hasText: '$371' }).count()).toBe(1);
    expect(await costCells.filter({ hasText: '$17,000' }).count()).toBe(1);
    expect(
      await costCells.getByText('n/a', { exact: true }).count(),
    ).toBe(1);
    await expect(costCells.last()).toContainText('n/a');

    // Reset restores the initial cost sort and clears the highlight.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(
      page.getByRole('columnheader', { name: 'Cost' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.getByText('4 of 4 rigs')).toBeVisible();
  });

  test('highlight buttons and sort headers are keyboard operable', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const throughput = page.getByRole('button', {
      name: 'Throughput',
      exact: true,
    });
    await throughput.focus();
    await page.keyboard.press('Enter');
    await expect(throughput).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('region', { name: 'Dimension detail' }),
    ).toBeVisible();

    // The table starts sorted by cost ascending, so one activation flips it.
    const sortByCost = page.getByRole('button', { name: 'Sort by Cost' });
    await sortByCost.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('columnheader', { name: 'Cost' }),
    ).toHaveAttribute('aria-sort', 'descending');
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
