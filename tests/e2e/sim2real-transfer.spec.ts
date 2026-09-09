import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import type { Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { splatTransferReaderProof } from './splat-transfer-reader-proof';

const ROUTE = '/rl-sim2real/sim2real-transfer/';

/**
 * The standalone article mount of the friction chart. The article also
 * renders a second FrictionTransfer inside the prediction step's
 * disclosure, so every per-mount locator must be scoped to exactly one.
 */
function friction(page: Page) {
  return page
    .locator('div.prose > div.rounded-md:has([data-testid="real-mu-readout"])')
    .first();
}


test.describe('sim2real-transfer module', () => {
  test('renders the four transfer families and sidebar state', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sim-to-Real Transfer' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      /domain randomization/i,
      /teacher/,
      /RMA/,
      /delta action model/,
      /3DGS twin/,
      /real2sim2real/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Sim-to-Real Transfer' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Lee 2020/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2010.11251');
    await expect(
      main.getByRole('link', { name: /Kumar 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2107.04034');
    await expect(
      main.getByRole('link', { name: /He 2025/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2502.01143');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 12 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('friction interactive: spike vs plateau, line drag, range widening, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: real robot at the training friction, point policy ahead.
    await expect(friction(page).getByTestId('real-mu-readout')).toHaveText('0.80');
    await expect(friction(page).getByTestId('point-readout')).toHaveText('97%');
    await expect(friction(page).getByTestId('dr-readout')).toHaveText('74%');
    await expect(friction(page).getByTestId('delta-readout')).toHaveText(
      /point \+\d+ pts/,
    );
    await expect(friction(page).getByTestId('point-curve')).toBeVisible();
    await expect(friction(page).getByTestId('dr-curve')).toBeVisible();
    await expect(friction(page).getByTestId('real-line')).toBeVisible();

    // Drag the real-robot line far off the training friction: DR wins.
    // setSlider (not fill) drives every range input: fill() can leave
    // React's change tracking one event behind under load (quirk 9).
    const muSlider = friction(page).getByRole('slider', {
      name: /real robot friction/i,
    });
    await setSlider(muSlider, 35);
    await expect(friction(page).getByTestId('real-mu-readout')).toHaveText('0.35');
    await expect(friction(page).getByTestId('point-readout')).toHaveText('0%');
    await expect(friction(page).getByTestId('delta-readout')).toHaveText(/DR \+\d+ pts/);

    // Keyboard path on the slider.
    await muSlider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(friction(page).getByTestId('real-mu-readout')).toHaveText('0.36');

    // Widen the randomization range: the DR peak drops.
    await setSlider(muSlider, 80);
    const rangeSlider = friction(page).getByRole('slider', {
      name: /randomization half-width/i,
    });
    await setSlider(rangeSlider, 65);
    await expect(friction(page).getByTestId('dr-readout')).toHaveText('57%');

    // Reset restores everything.
    await friction(page).getByRole('button', { name: 'Reset' }).click();
    await expect(friction(page).getByTestId('real-mu-readout')).toHaveText('0.80');
    await expect(friction(page).getByTestId('dr-readout')).toHaveText('74%');
  });

  test('teacher-student panel: degradation drives divergence up', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('teacher-panel')).toBeVisible();
    await expect(page.getByTestId('student-panel')).toBeVisible();
    await expect(page.getByTestId('recon-panel')).toBeVisible();

    const slider = page.getByRole('slider', {
      name: /proprioceptive degradation/i,
    });
    await setSlider(slider, 0);
    await expect(page.getByTestId('divergence-readout')).toHaveText('0.00');
    // Relational reads poll until the derived readout reflects the new
    // slider value instead of assuming the change flushed synchronously.
    const readout = page.getByTestId('divergence-readout');
    await setSlider(slider, 40);
    await expect
      .poll(async () => Number(await readout.textContent()))
      .toBeGreaterThan(0);
    const mid = Number(await readout.textContent());
    await setSlider(slider, 90);
    await expect
      .poll(async () => Number(await readout.textContent()))
      .toBeGreaterThan(mid);
    const high = Number(await readout.textContent());
    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const width of [375, 1440]) {
    test(`SplatSim and RoboGSim scoped source reader at ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      const external: string[] = [];
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
          external.push(url.href);
          await route.abort();
        } else await route.continue();
      });
      await page.goto(ROUTE);
      await page.evaluate(() => document.fonts.ready);
      const prose = page.locator('div.prose[data-pagefind-body]');
      const stat = prose.getByTestId('splatsim-transfer-stat');
      await expect(stat).toContainText('SplatSim zero-shot (UR5)');
      await expect(stat).toContainText('86.25%');
      await expect(stat).toContainText('vs 97.5% real-data; 4 tasks, 40 trials/task');
      for (const text of [
        'PyBullet supplies the physics', '40 trials per task', 'training augmentations',
        'Robotiq 2F-85', 'two RealSense D455', 'manual robot segmentation', 'ICP alignment',
        'CAD-derived link bounds', 'Figure 2 lists RGB observations plus end-effector position and orientation',
        'solely on RGB at test time', 'Those descriptions disagree', 'August 2025 v2',
        'Gaussian Reconstructor', 'Digital Twins Builder', 'Scene Composer', 'Interactive Engine',
        'mesh assets and measured layout alignment', 'inverse kinematics', 'collisions',
        'resulting state drives the next rendering', 'ten trials with up to three grasp attempts per trial',
        '90% placement', '30% in RoboGSim', 'not a demonstrated safety guarantee',
        'trajectory replay separately from closed-loop policy evaluation',
      ]) await expect(prose).toContainText(text);
      await expect(prose).not.toContainText("SplatSim replaces the simulator's mesh renderer");
      await expect(prose).not.toContainText('RoboGSim packages the same loop');
      await stat.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`splat-${width}-stat.png`) });
      const geometry: unknown[] = [];
      for (const [id, url, count] of [
        ['splatsim-2024', 'https://arxiv.org/abs/2409.10161', 3],
        ['robogsim-2024', 'https://arxiv.org/abs/2411.11839', 2],
      ] as const) {
        const clusters = prose.locator(`[data-cite-id="${id}"]`);
        await expect(clusters).toHaveCount(count);
        for (let i = 0; i < count; i++) {
          const cluster = clusters.nth(i);
          const link = cluster.locator('a').first();
          await expect(link).toHaveAttribute('href', url);
          await link.focus();
          await expect(link).toBeFocused();
          const popup = cluster.getByRole('tooltip');
          await expect(popup).toBeVisible();
          const box = await popup.boundingBox();
          geometry.push({ id, occurrence: i, box });
          expect.soft(box!.x, `${id}:${i} left edge`).toBeGreaterThanOrEqual(0);
          expect.soft(box!.x + box!.width, `${id}:${i} right edge`).toBeLessThanOrEqual(width);
          if (i === count - 1) await page.screenshot({ path: testInfo.outputPath(`splat-${width}-${id}-focused.png`) });
          await page.keyboard.press('Tab');
        }
      }
      const results = await new AxeBuilder({ page }).include('div.prose[data-pagefind-body]').analyze();
      writeFileSync(testInfo.outputPath(`splat-${width}-reader.json`), JSON.stringify({
        geometry, externalRequestsBlocked: external, axe: results,
        fonts: await page.evaluate(() => ({ status: document.fonts.status, families: [...document.fonts].map(f => ({ family: f.family, status: f.status })) })),
      }, null, 2));
      expect(results.violations).toEqual([]);
      expect(external).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await splatTransferReaderProof(page, testInfo);
      expect(external).toEqual([]);
    });
  }
});
