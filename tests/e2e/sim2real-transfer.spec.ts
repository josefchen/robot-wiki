import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/rl-sim2real/sim2real-transfer/';

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
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
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
    const chips = main.locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('friction interactive: spike vs plateau, line drag, range widening, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: real robot at the training friction, point policy ahead.
    await expect(page.getByTestId('real-mu-readout')).toHaveText('0.80');
    await expect(page.getByTestId('point-readout')).toHaveText('97%');
    await expect(page.getByTestId('dr-readout')).toHaveText('74%');
    await expect(page.getByTestId('delta-readout')).toHaveText(
      /point \+\d+ pts/,
    );
    await expect(page.getByTestId('point-curve')).toBeVisible();
    await expect(page.getByTestId('dr-curve')).toBeVisible();
    await expect(page.getByTestId('real-line')).toBeVisible();

    // Drag the real-robot line far off the training friction: DR wins.
    // setSlider (not fill) drives every range input: fill() can leave
    // React's change tracking one event behind under load (quirk 9).
    const muSlider = page.getByRole('slider', {
      name: /real robot friction/i,
    });
    await setSlider(muSlider, 35);
    await expect(page.getByTestId('real-mu-readout')).toHaveText('0.35');
    await expect(page.getByTestId('point-readout')).toHaveText('0%');
    await expect(page.getByTestId('delta-readout')).toHaveText(/DR \+\d+ pts/);

    // Keyboard path on the slider.
    await muSlider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('real-mu-readout')).toHaveText('0.36');

    // Widen the randomization range: the DR peak drops.
    await setSlider(muSlider, 80);
    const rangeSlider = page.getByRole('slider', {
      name: /randomization half-width/i,
    });
    await setSlider(rangeSlider, 65);
    await expect(page.getByTestId('dr-readout')).toHaveText('57%');

    // Reset restores everything.
    await page.getByRole('button', { name: 'Reset' }).first().click();
    await expect(page.getByTestId('real-mu-readout')).toHaveText('0.80');
    await expect(page.getByTestId('dr-readout')).toHaveText('74%');
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
});
