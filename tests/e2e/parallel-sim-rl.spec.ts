import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/rl-sim2real/parallel-sim-rl/';

test.describe('parallel-sim-rl module', () => {
  test('renders the infrastructure arc, throughput figures, and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Massively Parallel Sim RL',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // The 2021 to 2026 systems are all named in the prose. The citation
    // tooltips also carry the titles but stay hidden until hover, so filter
    // to visible matches.
    for (const name of [
      /Isaac Gym/,
      /Isaac Lab 3\.0/,
      /Newton/,
      /MuJoCo XLA \(MJX\)/,
      /Brax/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    // Both headline throughput figures appear.
    await expect(main.getByText(/900,000 frames per second/)).toBeVisible();
    await expect(
      main.getByText(/Franka cabinet-drawer task exceeds 1\.6 million/),
    ).toBeVisible();
    // Sidebar marks this module active.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Massively Parallel Sim RL' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Rudin 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2109.11978');
    await expect(
      main.getByRole('link', { name: /NVIDIA 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2511.04831');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 7 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(7);
  });

  test('the batch-scale scene is the one throughput figure and the pointer names its controls', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const prose = page.locator('div.prose[data-pagefind-body]');
    const scene = prose.locator('[data-motion-scene="batch-scale"]');
    await expect(scene).toHaveCount(1);
    // The retired training-time lab leaves no controls or readouts behind.
    for (const id of ['envs-readout', 'wallclock-readout', 'active-curve', 'rudin-marker-flat', 'cpu-explanation']) {
      await expect(page.getByTestId(id)).toHaveCount(0);
    }
    await expect(page.getByRole('slider', { name: /parallel environments/i })).toHaveCount(0);
    await expect(prose).toContainText('Press Play, then try Step forward from 64 environments upward');

    const poster = scene.getByRole('button', { name: /^play the motion scene/i });
    await expect(poster).toHaveText('Play');
    await poster.click();
    const scrubber = scene.getByTestId('motion-scrubber');
    try {
      await expect(scrubber).toBeVisible({ timeout: 4_000 });
    } catch {
      await poster.click();
      await expect(scrubber).toBeVisible({ timeout: 10_000 });
    }
    await page.keyboard.press('k');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await expect(scene.getByTestId('motion-caption')).toHaveText(/64 parallel environments/i);
    const forward = scene.getByRole('button', { name: 'Step forward one beat' });
    await expect(forward).toHaveText('Step forward');
    await forward.click();
    await expect(scene.getByTestId('motion-caption')).toHaveText(/4,096 environments/i);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
