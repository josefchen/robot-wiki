import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/world-models/generative-sim/';

async function displacementCm(page: import('@playwright/test').Page) {
  const text = await page.getByTestId('displacement-readout').textContent();
  const value = Number.parseFloat(text ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('world-models generative-sim module', () => {
  test('renders the three systems and the core argument', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Generative Simulation' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      /propose-generate-learn cycle/,
      /selects objects from Objaverse/,
      /120 kitchen scenes/,
      /2,500 kitchen environments/,
      /A real solver then executes that content/,
      /A renderer is not a simulator/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Generative Simulation' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('keeps RoboGen algorithm and supervision qualifications', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('cross-entropy-method planning with the ground-truth simulator');
    await expect(prose).toContainText('human inspection of scenes, rewards, and learned skills');
    await expect(prose).not.toContainText('reinforcement learning for locomotion and contact-rich skills');
  });

  test('citation chips link to RoboGen, Holodeck, and RoboCasa', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Wang 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2311.01455');
    await expect(
      main.getByRole('link', { name: /Yang 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2312.09067');
    await expect(
      main.getByRole('link', { name: /Nasiriany 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2406.02523');
    await expect(
      main.getByRole('link', { name: /Nasiriany 2026/ }).first(),
    ).toHaveAttribute('href', 'https://robocasa.ai/assets/robocasa365_iclr26.pdf');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 8 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(8);
  });

  test('RoboCasa v1 inventory and scaling keep their source scope', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const inventory = prose.getByText(/RoboCasa v1 reports 120 kitchen scenes/);
    await expect(inventory).toContainText('10 floor plans combined with 12 styles');
    await expect(inventory).toContainText('2,509 objects and 153 categories');
    await expect(inventory).toContainText('25 atomic tasks and 75 composite tasks');
    await expect(inventory).toContainText('human filtering, modification, and code implementation');
    await expect(
      inventory.getByRole('link', { name: /Nasiriany 2024/ }),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2406.02523');
    const scaling = prose.getByText(/The scaling study is a specific simulation experiment/);
    for (const required of [
      'language-conditioned BC-Transformer',
      'Franka Panda on an Omron mobile base',
      '24 atomic manipulation tasks; navigation is excluded',
      'Objaverse objects and AI-generated training textures',
      'human-curated textures, unseen object instances',
      '50 trials per task across five fixed kitchen scenes',
      '26.3%, 35.0%, and 47.6%',
      'Individual tasks do not improve monotonically',
      'Section VIII-C refers broadly to datasets over 25 tasks',
    ]) {
      await expect(scaling).toContainText(required);
    }
    await expect(
      scaling.getByRole('link', { name: /Nasiriany 2024/ }),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2406.02523');
  });

  test('keeps Holodeck evaluation and constraint scope', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('soft relational constraints');
    await expect(prose).toContainText('pretrained on ProcTHOR-10K');
    await expect(prose).toContainText('not a test of physically valid manipulation');
    await expect(prose).not.toContainText('without any human-constructed data');
  });

  test('push test: no motion without physics, motion with it', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default stack: appearance and simulation on, physics proxy off.
    await expect(
      page.getByRole('button', { name: /^appearance$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: /^physics proxy$/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByRole('button', { name: /^simulation$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('no-dynamics-marker')).toBeVisible();

    // Push with only the appearance layer: nothing moves.
    const push = page.getByRole('button', { name: /push the mug/i });
    await push.click();
    expect(await displacementCm(page)).toBe(0);
    await expect(page.getByTestId('mug')).toHaveAttribute(
      'transform',
      'translate(80 0)',
    );
    await expect(page.getByTestId('push-test-note')).toContainText(
      /renderer is not a simulator/i,
    );
    await expect(page.getByTestId('push-count-readout')).toHaveText('0');

    // Enable the physics proxy: the same push produces motion.
    await page.getByRole('button', { name: /^physics proxy$/i }).click();
    await push.click();
    const afterOne = await displacementCm(page);
    expect(afterOne).toBeGreaterThan(10);
    await expect(page.getByTestId('push-count-readout')).toHaveText('1');
    await expect(page.getByTestId('collision-hull')).toBeVisible();
    await expect(page.getByTestId('motion-ghost').first()).toBeVisible();
    await expect(page.getByTestId('push-test-note')).toContainText(
      /collision geometry/i,
    );

    // A second push accumulates more displacement.
    await push.click();
    expect(await displacementCm(page)).toBeGreaterThan(afterOne);

    // Reset restores the initial state.
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await displacementCm(page)).toBe(0);
    await expect(
      page.getByRole('button', { name: /^physics proxy$/i }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('attributes the two scene-design limitations to their papers', async ({ page }) => {
    await page.goto(ROUTE);
    const item = page.locator('div.prose[data-pagefind-body] li')
      .filter({ hasText: 'Scene diversity has specific design sources.' });
    await expect(item).toHaveCount(1);
    await expect(item).toContainText('cultural biases from the LLM and the asset-retrieval component');
    await expect(item).toContainText('consulted home-design and architecture magazines');
    await expect(item.locator('[data-cite-id="holodeck-2024"] a[href="https://arxiv.org/abs/2312.09067"]')).toHaveCount(1);
    await expect(item.locator('[data-cite-id="robocasa-2024"] a[href="https://arxiv.org/abs/2406.02523"]')).toHaveCount(1);
    await expect(page.locator('div.prose[data-pagefind-body]')).not.toContainText('kitchens look like kitchen magazines');
  });

  test('interactive keyboard path: toggle, push, force slider', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    await page.getByRole('button', { name: /^physics proxy$/i }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: /^physics proxy$/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /push the mug/i }).focus();
    await page.keyboard.press('Enter');
    expect(await displacementCm(page)).toBeGreaterThan(0);

    const slider = page.getByRole('slider', { name: /push force/i });
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('5');
    await expect(page.getByText('5.0 N').first()).toBeVisible();
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
