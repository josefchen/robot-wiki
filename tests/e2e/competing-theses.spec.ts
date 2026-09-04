import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/frontier/competing-theses/';

const THESIS_NAMES = [
  'End-to-end VLA scaling',
  'Hierarchical planner over skills',
  'World-model-based training',
  'RL fine-tuning on imitation',
  'Teleoperation as a bridge',
  'Humanoid versus task-specific',
];

test.describe('frontier competing-theses module', () => {
  test('renders with prose, headings, and active sidebar state (VAL-FRONT-001, VAL-FRONT-002)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Competing Theses' }),
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

    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Competing Theses' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-FRONT-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: 'Brooks 2019' }).first(),
    ).toHaveAttribute('href', 'https://rodneybrooks.com/a-better-lesson/');
    await expect(
      main.getByRole('link', { name: 'Google DeepMind 2026' }).first(),
    ).toHaveAttribute(
      'href',
      'https://deepmind.google/models/gemini-robotics/embodied-reasoning/',
    );
    await expect(
      main.getByRole('link', { name: 'Xiao 2026' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2606.19980');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip
    // deleted its 21 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
    expect(await main.getByText(/missing citation:/).count()).toBe(0);
    expect(await main.getByText(/unknown term:/).count()).toBe(0);
  });

  test('comparison table renders all six theses (VAL-FRONT-013)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const panel = page.getByTestId('thesis-explorer');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId(/^thesis-row-/)).toHaveCount(6);
    for (const name of THESIS_NAMES) {
      await expect(
        panel.getByRole('button', { name }),
        `thesis row: ${name}`,
      ).toBeVisible();
    }
    await expect(page.getByTestId('thesis-readout')).toHaveText(
      '6 theses, showing: End-to-end VLA scaling',
    );
  });

  test('every thesis row names proponents, both evidence sides, and a falsification criterion (VAL-FRONT-014)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const detail = page.getByTestId('thesis-detail');
    for (const name of THESIS_NAMES) {
      await page
        .getByRole('button', { name })
        .first()
        .click();
      // The four required fields are present for every thesis.
      await expect(detail.getByText('Proponents')).toBeVisible();
      await expect(detail.getByText('Evidence for')).toBeVisible();
      await expect(detail.getByText('Evidence against')).toBeVisible();
      await expect(detail.getByText('Falsification criterion')).toBeVisible();
      // Each field carries content, and the evidence carries citation chips.
      const detailText = (await detail.textContent()) ?? '';
      expect(detailText.length).toBeGreaterThan(400);
      expect(
        await detail.locator('a[href^="http"]').count(),
        `citations in detail for ${name}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  test('row selection switches the detail view by mouse and keyboard (VAL-FRONT-015)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const detail = page.getByTestId('thesis-detail');
    const readout = page.getByTestId('thesis-readout');
    // Scoped to the interactive: several thesis names are also article
    // headings, and every heading carries a copy-link button whose
    // accessible name contains the heading text (VAL-WIKI-030), so an
    // unscoped by-name lookup matches two elements.
    const explorer = page.getByTestId('thesis-explorer');

    // Mouse: select the world-models thesis.
    await explorer
      .getByRole('button', { name: 'World-model-based training' })
      .click();
    await expect(readout).toHaveText(
      '6 theses, showing: World-model-based training',
    );
    await expect(detail).toContainText('V-JEPA 2');
    await expect(detail).toContainText('Cosmos 3');
    // Citations are present in the detail view.
    await expect(
      detail.getByRole('link', { name: 'Assran 2025' }).first(),
    ).toHaveAttribute('href', expect.stringMatching(/^https?:\/\//));

    // Mouse: select the teleop bridge thesis.
    await explorer
      .getByRole('button', { name: 'Teleoperation as a bridge' })
      .click();
    await expect(detail).toContainText('65,000+');
    await expect(detail).toContainText('teleop alone');
    await expect(detail).not.toContainText('Cosmos 3');

    // Keyboard: focus a row button and move with the arrow keys.
    await explorer
      .getByRole('button', { name: 'Teleoperation as a bridge' })
      .focus();
    await page.keyboard.press('ArrowUp');
    await expect(readout).toHaveText(
      '6 theses, showing: RL fine-tuning on imitation',
    );
    await expect(detail).toContainText('RL-100');
    const rlButton = explorer.getByRole('button', {
      name: 'RL fine-tuning on imitation',
    });
    await expect(rlButton).toHaveAttribute('aria-pressed', 'true');
    await expect(rlButton).toBeFocused();

    // Focus state is visible (the global accent focus ring,
    // signal blue #245FFF under brand-v2). The row's
    // transition-colors animates the outline over ~150ms, so poll.
    await expect
      .poll(() =>
        rlButton.evaluate((el) => getComputedStyle(el).outlineColor),
      )
      .toBe('rgb(36, 95, 255)');

    // Reset restores the default selection.
    await explorer.getByRole('button', { name: 'Reset' }).click();
    await expect(readout).toHaveText(
      '6 theses, showing: End-to-end VLA scaling',
    );
  });

  test('both sides are represented with named proponents and citations (VAL-FRONT-019)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const text = (await main.textContent()) ?? '';

    // Scaling: Sutton for, Brooks and Goldberg against.
    expect(text).toMatch(/Rich Sutton/);
    expect(text).toMatch(/Brooks answered Sutton directly/);
    expect(text).toMatch(/100,000-year gap/);

    // World models: NVIDIA and Meta for; cost and contact fidelity against.
    expect(text).toMatch(/Cosmos 3 and Meta's V-JEPA 2/);
    expect(text).toMatch(/2,048 GB200 GPUs/);

    // Teleop: Nucleus and Bessemer for; Ian Glow against.
    expect(text).toMatch(/Nucleus/);
    expect(text).toMatch(/Ian Glow/);

    // Form factor: both sides named in the same breath.
    expect(text).toMatch(/Figure, Tesla, 1X, Apptronik, and Unitree/);
    expect(text).toMatch(/Robust\.AI/);

    // No wording declares any thesis settled.
    expect(text).not.toMatch(/the (debate|question|dispute) is (settled|resolved|over)/i);
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
