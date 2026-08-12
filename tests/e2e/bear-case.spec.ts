import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/frontier/bear-case/';

const MILESTONE_NAMES = [
  'One policy, >90% in unseen homes',
  'Verified 10,000-unit deployment',
  'Open benchmark, cross-lab agreement',
  'RL >99% across a broad task set',
  'Tactile model inside a VLA pipeline',
  'Contact-rich sim-to-real, zero real data',
  'Humanoid cost-per-task parity',
  '100x data, proportional gain',
];

test.describe('frontier bear-case module', () => {
  test('renders with prose, headings, and active sidebar state (VAL-FRONT-001, VAL-FRONT-002)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Bear Case' }),
    ).toBeVisible();

    const main = page.locator('#main-content');
    const headings = await main.locator('h2').allTextContents();
    expect(headings.length).toBeGreaterThanOrEqual(4);
    const mainText = (await main.textContent()) ?? '';
    expect(mainText.length).toBeGreaterThan(4000);

    // No raw MDX or component syntax leaks into the rendered page.
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'The Bear Case' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-FRONT-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main
        .locator(
          'a[href="https://rodneybrooks.com/predictions-scorecard-2026-january-01/"]',
        )
        .first(),
    ).toBeVisible();
    await expect(
      main
        .locator(
          'a[href="https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html"]',
        )
        .first(),
    ).toBeVisible();
    const chips = main.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
    expect(await main.getByText(/missing citation:/).count()).toBe(0);
    expect(await main.getByText(/unknown term:/).count()).toBe(0);
  });

  test('named-skeptic evidence items are present, attributed, and sourced (VAL-FRONT-016)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const text = (await main.textContent()) ?? '';

    // Brooks: the critique and the timeline prediction, named.
    expect(text).toMatch(/Rodney Brooks/);
    expect(text).toMatch(/pure fantasy thinking/);
    expect(text).toMatch(/pathetic compared to human hands/);

    // Morgan Stanley: the PR problem and the ROI warning, named.
    expect(text).toMatch(/Morgan Stanley/);
    expect(text).toMatch(/PR problem/);
    expect(text).toMatch(/social license to deploy/);
    expect(text).toMatch(/tangible evidence of real-world return on investment/);

    // Unitree: profit halving despite volume leadership.
    expect(text).toMatch(/Unitree/);
    expect(text).toMatch(/5,500/);
    expect(text).toMatch(/52% year over year/);

    // Computex: the on-stage collapse.
    expect(text).toMatch(/Computex 2026/);
    expect(text).toMatch(/collapsed face-first/);

    // Capital cycle: the >$23B tally and the named disagreement.
    expect(text).toMatch(/\$23B/);
    expect(text).toMatch(/Bessemer Venture Partners/);
    expect(text).toMatch(/no robotics bubble/);
    expect(text).toMatch(/structurally underinvested/);

    // Each evidence item carries a source link out to its origin.
    for (const href of [
      'https://rodneybrooks.com/predictions-scorecard-2026-january-01/',
      'https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html',
      'https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm',
      'https://interestingengineering.com/ai-robotics/qualcomm-robot-unexpected-collapse',
      'https://www.briefs.co/news/robotics-startups-raised-23-billion-in-2026-closing-in-on-all-of-2025/',
      'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/',
    ]) {
      expect(
        await main.locator(`a[href="${href}"]`).count(),
        `source link ${href}`,
      ).toBeGreaterThanOrEqual(1);
    }

    // The bubble question is framed as a disagreement, not a verdict.
    expect(text).not.toMatch(
      /the (bubble|debate|question) is (settled|resolved|over|real)/i,
    );
  });

  test('watchlist renders all eight milestones with status indicators (VAL-FRONT-017)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const panel = page.getByTestId('milestones-watchlist');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId(/^milestone-row-/)).toHaveCount(8);
    for (const name of MILESTONE_NAMES) {
      await expect(
        panel.getByRole('button', { name, exact: true }),
        `milestone row: ${name}`,
      ).toBeVisible();
    }
    await expect(page.getByTestId('watchlist-readout')).toHaveText(
      '8 milestones: 4 not met, 4 partial, 0 met',
    );

    // Status indicators are visible and differentiated across rows.
    const badges = await panel.locator('tbody [data-variant]').allTextContents();
    expect(new Set(badges)).toEqual(new Set(['not met', 'partial']));
  });

  test('milestone detail shows all three fields; filter and keyboard work (VAL-FRONT-017)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const detail = page.getByTestId('milestone-detail');
    const readout = page.getByTestId('watchlist-readout');

    // Expand two milestones and verify the three contract fields on each.
    for (const name of [
      'Verified 10,000-unit deployment',
      'Tactile model inside a VLA pipeline',
    ]) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(detail.getByText('Why it matters')).toBeVisible();
      await expect(detail.getByText('Current status')).toBeVisible();
      await expect(detail.getByText(/How we’d know/)).toBeVisible();
      const detailText = (await detail.textContent()) ?? '';
      expect(detailText.length).toBeGreaterThan(300);
      expect(
        await detail.locator('a[href^="http"]').count(),
        `citations in detail for ${name}`,
      ).toBeGreaterThanOrEqual(1);
    }

    // Filter narrows the board and the readout follows.
    await page.getByRole('button', { name: 'Partial', exact: true }).click();
    await expect(page.getByTestId(/^milestone-row-/)).toHaveCount(4);
    await expect(readout).toHaveText('showing 4 of 8 milestones (partial)');

    // The met filter renders the explicit empty state.
    await page.getByRole('button', { name: 'Met', exact: true }).click();
    await expect(page.getByTestId(/^milestone-row-/)).toHaveCount(0);
    await expect(page.getByTestId('watchlist-empty')).toContainText(
      'None of the eight milestones',
    );

    // Reset restores the full board and the default selection.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId(/^milestone-row-/)).toHaveCount(8);
    await expect(readout).toHaveText('8 milestones: 4 not met, 4 partial, 0 met');

    // Keyboard: arrows move the selection between rows.
    await page
      .getByRole('button', {
        name: 'One policy, >90% in unseen homes',
        exact: true,
      })
      .focus();
    await page.keyboard.press('ArrowDown');
    const second = page.getByRole('button', {
      name: 'Verified 10,000-unit deployment',
      exact: true,
    });
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(second).toBeFocused();
    await expect(detail).toContainText('Company filings or independent reporting');
  });

  test('forward-looking items carry explicit speculation labels (VAL-FRONT-018)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // The three winter mechanisms are labeled speculation; the skeptic and
    // economics items are labeled evidence. At least three of each render.
    expect(await main.getByText(/^Speculation:/).count()).toBeGreaterThanOrEqual(3);
    expect(await main.getByText(/^Evidence:/).count()).toBeGreaterThanOrEqual(3);
    const text = (await main.textContent()) ?? '';
    expect(text).toMatch(/scenarios, not predictions/);
  });

  test('contested claims name proponents on both sides (VAL-FRONT-019)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const text = (await main.textContent()) ?? '';

    // Bubble vs. no-bubble: Bessemer against Brooks and Morgan Stanley.
    expect(text).toMatch(/Bessemer Venture Partners/);
    expect(text).toMatch(/Brooks's timeline predictions and Morgan Stanley/);

    // Scaling holds vs. plateaus: EgoScale's law against Goldberg's data gap.
    expect(text).toMatch(/EgoScale/);
    expect(text).toMatch(/Ken Goldberg/);
    expect(text).toMatch(/100,000-year data gap/);

    // Reliability-gap length: Lisa Yan named on the steep-climb side.
    expect(text).toMatch(/Lisa Yan/);

    // Form factor: humanoid thesis against task-specific incumbents.
    expect(text).toMatch(/task-specific systems/);
    expect(text).toMatch(/humanoid thesis/);

    // No unattributed-critic phrasing.
    expect(text).not.toMatch(/critics say|skeptics say|some argue/i);
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
