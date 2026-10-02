import { expect, test } from './dexterity-reader-fixture';
import AxeBuilder from '@axe-core/playwright';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

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
    expect(mainText).toContain("These are the essay's descriptions of the demonstration");
    expect(mainText).toContain('an imagined inner dialogue');
    expect(mainText).toContain('will likely require the right sensory data and the right thing to learn');
    expect(mainText).toContain('His assessment belongs to the time of the essay');
    expect(mainText).not.toContain('Her vision is intact');
    expect(mainText).not.toContain('Nothing about her plan changed');
    expect(mainText).not.toContain('If touch-driven pipelines get there first');
    expect(mainText).toContain('his reported first-video time; second described as four times as long');

    // No raw MDX or component syntax leaks into the rendered page.
    expect(mainText).not.toContain('import {');
    expect(mainText).not.toContain('<Cite');
    expect(mainText).not.toContain('$$');

    const openMenu = page.getByRole("button", { name: "Open navigation menu" });
    const mobileMenu = await openMenu.isVisible();
    if (mobileMenu) await openMenu.click();
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(nav.getByRole('link', { name: 'Dexterity' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    if (mobileMenu) {
      await page.screenshot({ path: test.info().outputPath("mobile-navigation.png") });
      await page.keyboard.press("Escape");
      await expect(nav).toBeHidden();
    }
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
    expect(mainText).toContain(
      'Brooks reproduces an eWeek report that describes Tesla as moving Optimus training toward a "vision-only approach"',
    );
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
    expect(mainText).toContain("Figure's October 2025 announcement describes a palm camera in each Figure 03 hand");
    expect(mainText).toContain('can detect "three grams of pressure"');
    expect(mainText).toContain('full-body proprioception as System 1 inputs');
    expect(mainText).toContain("the first time we've demonstrated neural network policies that depend on these modalities");
    expect(mainText).not.toContain('the first Figure has shown that consumes touch directly');
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
    const cardIds = () =>
      page
        .getByTestId(/^hand-card-/)
        .evaluateAll((cards) =>
          cards.map((card) => (card.getAttribute('data-testid') ?? '').replace('hand-card-', '')),
        );
    const rowIds = () =>
      page
        .getByTestId(/^hand-row-/)
        .evaluateAll((rows) =>
          rows.map((row) => (row.getAttribute('data-testid') ?? '').replace('hand-row-', '')),
        );

    await expect(
      panel.getByText('No hand here publishes both touch sensitivity and price'),
    ).toBeVisible();
    await expect(page.getByTestId(/^hand-card-/)).toHaveCount(5);
    await expect(page.getByTestId('hand-gap-note')).toBeVisible();
    // Unitree's listed price is the whole robot, labelled as such on its card.
    await expect(page.getByTestId('whole-robot-price')).toHaveText('Whole robot: $29,900');
    // Cards stamp every undisclosed spec; none is guessed.
    await expect(panel.locator('[data-hand-gap]')).toHaveCount(7);

    // The full table, with the specs the contract anchors on, is in the method.
    await openHowThisWasMade(panel);
    await expect(page.getByTestId(/^hand-row-/)).toHaveCount(5);
    await expect(page.getByTestId('hand-row-tesla-optimus-gen3')).toContainText('22');
    await expect(page.getByTestId('hand-row-tesla-optimus-gen3')).toContainText(
      'Tendon-driven',
    );
    await expect(page.getByTestId('hand-row-figure-02-03')).toContainText('16');
    await expect(page.getByTestId('hand-row-figure-02-03')).toContainText('3 g');
    await expect(page.getByTestId('hand-row-sanctuary-phoenix')).toContainText('approx. 5 mN');
    await expect(page.getByTestId('hand-row-sanctuary-phoenix')).toContainText(
      'Hydraulic',
    );
    await expect(page.getByTestId('hand-row-shadow-dexterous')).toContainText('€110,000');
    await expect(page.getByTestId('hand-row-unitree-h2')).toContainText('$29,900');
    await expect(page.getByTestId('hand-row-unitree-h2')).toContainText('whole robot');
    expect(
      await page
        .getByTestId(/^hand-row-/)
        .getByText('not disclosed', { exact: true })
        .count(),
    ).toBe(6);

    // Default order: lightest touch felt first; undisclosed thresholds last.
    await expect(readout).toHaveText('5 hands, lightest touch felt first');
    const defaultOrder = [
      'sanctuary-phoenix',
      'figure-02-03',
      'tesla-optimus-gen3',
      'shadow-dexterous',
      'unitree-h2',
    ];
    expect(await cardIds()).toEqual(defaultOrder);
    expect(await rowIds()).toEqual(defaultOrder);

    // Most joints: most first; "Reverse the order" flips it.
    await panel.getByRole('button', { name: 'Most joints' }).click();
    await expect(readout).toHaveText('5 hands, most ways to move first');
    expect((await cardIds())[0]).toBe('tesla-optimus-gen3');
    await expect(
      page.getByRole('columnheader', { name: /dof/i }),
    ).toHaveAttribute('aria-sort', 'descending');
    await openAdjustMore(panel);
    await panel.getByRole('button', { name: 'Reverse the order' }).click();
    expect((await cardIds())[0]).toBe('unitree-h2');

    // Lowest price compares hand prices only: the whole-robot price never
    // ranks as the cheapest hand.
    await panel.getByRole('button', { name: 'Lowest price' }).click();
    await expect(readout).toHaveText('5 hands, lowest hand price first');
    expect((await cardIds())[0]).toBe('shadow-dexterous');

    // Keyboard operation.
    await panel.getByRole('button', { name: 'Lightest touch felt' }).focus();
    await page.keyboard.press('Enter');
    await expect(readout).toHaveText('5 hands, lightest touch felt first');

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
    for (const id of defaultOrder) {
      const row = page.getByTestId(`hand-row-${id}`);
      await expect(row.getByRole('link').first()).toHaveAttribute('href', /^https:\/\//);
      await expect(row).toContainText(/[A-Z][a-z]{2} \d{4}/);
    }

    // Reset restores the default sort and clears the selection.
    await panel.getByRole('button', { name: 'Reset' }).click();
    await expect(readout).toHaveText('5 hands, lightest touch felt first');
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
    test.info().attach('axe-results', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
});
