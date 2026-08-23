import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/frontier/dexterity/';

test.describe('frontier dexterity module', () => {
  test('covers the tactile gap with the Brooks/Johansson argument (VAL-FRONT-007)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
    const main = page.locator('#main-content');
    const mainText = (await main.textContent()) ?? '';

    // The three named topic areas (VAL-FRONT-002 structure: several sections).
    await expect(
      main.getByRole('heading', { level: 2, name: 'The tactile gap' }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { level: 2, name: 'In-hand manipulation' }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', {
        level: 2,
        name: 'Deformables and the long tail',
      }),
    ).toBeVisible();
    expect(await main.getByRole('heading', { level: 2 }).count()).toBeGreaterThanOrEqual(6);
    expect(mainText.length).toBeGreaterThan(4000);
    expect(mainText).toMatch(/contact-rich manipulation/i);
    expect(mainText).toMatch(/in-hand manipulation/i);
    expect(mainText).toMatch(/deformab/i);
    expect(mainText).toMatch(/Cloth, liquids, and compliant packaging/);

    // The Brooks/Johansson argument with its numbers.
    expect(mainText).toContain('17,000');
    expect(mainText).toContain('seven seconds');
    expect(mainText).toContain('four times as long');
    expect(mainText).toMatch(/anesthetized/);
    expect(mainText).toMatch(/Johansson/);
    expect(mainText).toContain('Rodney Brooks');

    // No raw MDX or component syntax leaks into the rendered page.
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(nav.getByRole('link', { name: 'Dexterity' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(errors).toEqual([]);
  });

  test('presents both sides of the vision-only vs tactile dispute (VAL-FRONT-008, VAL-FRONT-019)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    const mainText = (await main.textContent()) ?? '';

    // Vision-only side, named proponents.
    await expect(
      main.getByRole('heading', { level: 2, name: 'The bet against touch' }),
    ).toBeVisible();
    expect(mainText).toMatch(/Tesla has shifted Optimus training to a vision-only approach/);
    expect(mainText).toMatch(/Project Go-Big/);
    expect(mainText).toMatch(/100% egocentric human video/);

    // Tactile-necessity side, named proponents.
    await expect(
      main.getByRole('heading', { level: 2, name: 'The bet on touch' }),
    ).toBeVisible();
    expect(mainText).toContain('Jeremy Fishel');
    expect(mainText).toContain('James Wells');
    expect(mainText).toMatch(/humanoid robots will need a sense of touch/i);

    // The intermediate 2026 state: tactile hardware ships, but no tactile
    // training pipeline at vision scale exists yet.
    expect(mainText).toMatch(/Figure 03 ships fingertip tactile sensors/);
    expect(mainText).toMatch(/Gemini Robotics 2 drives the 22-DoF SharpaWave hand/);
    expect(mainText).toMatch(/does not exist yet is a tactile training pipeline/);

    // The page does not declare the question resolved; it stays hedged.
    expect(mainText).toContain('The honest 2026 position is intermediate');
    expect(mainText).toContain('will be settled less by argument than');
    expect(mainText).toContain('Nobody is close');
    expect(mainText).not.toMatch(/the (debate|question|dispute) is (settled|resolved|over)/i);

    // Each side carries at least one citation chip.
    const betAgainst = main.getByRole('link', { name: 'Figure AI 2025' }).first();
    await expect(betAgainst).toHaveAttribute(
      'href',
      'https://www.figure.ai/news/project-go-big',
    );
    const betOnTouch = main.getByRole('link', { name: 'Sanctuary AI 2025' }).first();
    await expect(betOnTouch).toHaveAttribute(
      'href',
      'https://sanctuary.ai/news/sanctuary-ai-equips-general-purpose-robots/',
    );
  });

  test('citation chips resolve and link externally (VAL-FRONT-003)', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(main.getByRole('link', { name: 'Brooks 2025' }).first()).toHaveAttribute(
      'href',
      'https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/',
    );
    await expect(
      main.getByRole('link', { name: 'Macefield 2022' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1113/JP282846');

    // At least five inline citation chips, all external. Scoped to the
    // authored prose: the generated References bibliography also renders
    // external links inside main, and with every inline chip deleted its
    // 24 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
    expect(await main.getByText(/missing citation:/).count()).toBe(0);
    expect(await main.getByText(/unknown term:/).count()).toBe(0);
  });

  test('hand comparison sorts, selects, and resets (VAL-FRONT-009)', async ({ page }) => {
    await page.goto(ROUTE);
    const panel = page.getByTestId('hand-comparison');
    await expect(panel).toBeVisible();
    const readout = page.getByTestId('hand-comparison-readout');
    const rowIds = () =>
      page
        .getByTestId(/^hand-row-/)
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')));

    // All five hands are present, with the specs the contract anchors on.
    await expect(page.getByTestId(/^hand-row-/)).toHaveCount(5);
    await expect(page.getByTestId('hand-row-tesla-optimus-gen3')).toContainText('22');
    await expect(page.getByTestId('hand-row-tesla-optimus-gen3')).toContainText(
      'Tendon-driven',
    );
    await expect(page.getByTestId('hand-row-figure-02-03')).toContainText('16');
    await expect(page.getByTestId('hand-row-figure-02-03')).toContainText('3 g');
    await expect(page.getByTestId('hand-row-sanctuary-phoenix')).toContainText('~5 mN');
    await expect(page.getByTestId('hand-row-sanctuary-phoenix')).toContainText(
      'Hydraulic',
    );
    await expect(page.getByTestId('hand-row-shadow-dexterous')).toContainText('€110,000');
    await expect(page.getByTestId('hand-row-unitree-h2')).toContainText('$29,900');

    // Undisclosed specs render as "not disclosed", never as guessed numbers.
    expect(await panel.getByText('not disclosed', { exact: true }).count()).toBe(6);

    // Default order: tactile threshold, most sensitive first; nulls last.
    await expect(readout).toHaveText(
      '5 hands, sorted by tactile threshold, most sensitive first',
    );
    expect(await rowIds()).toEqual([
      'hand-row-sanctuary-phoenix',
      'hand-row-figure-02-03',
      'hand-row-tesla-optimus-gen3',
      'hand-row-shadow-dexterous',
      'hand-row-unitree-h2',
    ]);

    // Sort by DoF: switches to most-first on the first click, flips on the second.
    const dofButton = page.getByRole('button', { name: 'Sort by DoF' });
    await dofButton.click();
    await expect(readout).toHaveText(
      '5 hands, sorted by degrees of freedom, most first',
    );
    expect((await rowIds())?.[0]).toBe('hand-row-tesla-optimus-gen3');
    await expect(
      page.getByRole('columnheader', { name: /dof/i }),
    ).toHaveAttribute('aria-sort', 'descending');
    await dofButton.click();
    expect((await rowIds())?.[0]).toBe('hand-row-unitree-h2');

    // Sort by cost: cheapest first, undisclosed prices stay last.
    await page.getByRole('button', { name: 'Sort by cost' }).click();
    await expect(readout).toHaveText('5 hands, sorted by cost, lowest first');
    expect((await rowIds())?.slice(0, 2)).toEqual([
      'hand-row-unitree-h2',
      'hand-row-shadow-dexterous',
    ]);

    // Keyboard operation: focus the header button and press Enter.
    await page.getByRole('button', { name: 'Sort by tactile threshold' }).focus();
    await page.keyboard.press('Enter');
    await expect(readout).toHaveText(
      '5 hands, sorted by tactile threshold, most sensitive first',
    );

    // Selection reveals the trade-off lines and updates the readout.
    await page
      .getByRole('button', { name: 'Select Optimus Gen 3 for comparison' })
      .click();
    await page
      .getByRole('button', { name: 'Select Phoenix hand for comparison' })
      .click();
    const selection = page.getByTestId('hand-comparison-selection');
    await expect(selection).toContainText("didn't actually work");
    await expect(selection).toContainText('maintenance burden');
    await expect(readout).toHaveText(/, 2 selected$/);
    await expect(
      page.getByRole('button', { name: 'Select Optimus Gen 3 for comparison' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Every row carries an external source link and an as-of date.
    for (const id of [
      'tesla-optimus-gen3',
      'figure-02-03',
      'sanctuary-phoenix',
      'shadow-dexterous',
      'unitree-h2',
    ]) {
      const row = page.getByTestId(`hand-row-${id}`);
      await expect(row.getByRole('link').first()).toHaveAttribute('href', /^https:\/\//);
      await expect(row).toContainText(/[A-Z][a-z]{2} \d{4}/);
    }

    // Reset restores the default sort and clears the selection.
    await panel.getByRole('button', { name: 'Reset' }).click();
    await expect(readout).toHaveText(
      '5 hands, sorted by tactile threshold, most sensitive first',
    );
    await expect(selection).toContainText('Select hands to compare their trade-offs.');
    await expect(
      page.getByRole('button', { name: 'Select Optimus Gen 3 for comparison' }),
    ).toHaveAttribute('aria-pressed', 'false');
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
