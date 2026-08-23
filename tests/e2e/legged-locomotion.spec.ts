import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/rl-sim2real/legged-locomotion/';

test.describe('legged-locomotion module', () => {
  test('renders the lineage and sidebar state', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Legged Locomotion Lineage' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    // Probe phrases that do not collide with citation tooltip titles.
    for (const name of [
      /series-elastic actuators/,
      /temporal convolutional network/,
      /hour-long hike in the Alps/,
      /beach sand at 3\.03/,
      /retargeted human motion/,
      /450M-parameter diffusion transformer/,
      /MIT humanoid/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Legged Locomotion Lineage' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('citation chips link to external primary sources', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Lee 2020/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2010.11251');
    await expect(
      main.getByRole('link', { name: /Rudin 2021/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2109.11978');
    await expect(
      main.getByRole('link', { name: /Miki 2022/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2201.08117');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 12 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(12);
  });

  test('gait diagram: selector, patterns, stepping, playback, reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    // Default: walk at cycle start, three feet down.
    await expect(page.getByTestId('duty-readout')).toHaveText('0.75');
    await expect(page.getByTestId('phase-readout')).toHaveText('0%');
    await expect(page.getByTestId('support-readout')).toHaveText(
      /always 3 feet/i,
    );
    for (const row of ['row-lf', 'row-rf', 'row-lh', 'row-rh']) {
      await expect(page.getByTestId(row)).toBeVisible();
    }

    // Trot: diagonal pairs, duty factor drops.
    await page.getByRole('button', { name: 'Trot' }).click();
    await expect(page.getByTestId('duty-readout')).toHaveText('0.50');
    await expect(page.getByTestId('stance-readout')).toHaveText('LF + RH');

    // Step halfway: the other diagonal takes over.
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'Step forward' }).click();
    }
    await expect(page.getByTestId('phase-readout')).toHaveText('50%');
    await expect(page.getByTestId('stance-readout')).toHaveText('RF + LH');

    // Bound: a flight phase appears.
    await page.getByRole('button', { name: 'Bound' }).click();
    await expect(page.getByTestId('support-readout')).toHaveText(
      /flight phase/i,
    );

    // Play advances the cycle; pause holds it. The wait is on the
    // observable phase readout (state-driven), not a wall-clock sleep,
    // and the pause click auto-waits for the swapped control to appear.
    await page.getByRole('button', { name: 'Play gait cycle' }).click();
    await expect
      .poll(
        async () =>
          (await page.getByTestId('phase-readout').textContent()) ?? '',
        { timeout: 10_000 },
      )
      .not.toBe('0%');
    await page.getByRole('button', { name: 'Pause gait cycle' }).click();
    const afterPlay = await page.getByTestId('phase-readout').textContent();
    expect(afterPlay).not.toBe('0%');

    // Keyboard path on the phase slider.
    const slider = page.getByRole('slider', { name: /gait phase/i });
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('phase-readout')).toHaveText(/\d+%/);

    // Reset restores the default gait and phase.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('phase-readout')).toHaveText('0%');
    await expect(page.getByTestId('duty-readout')).toHaveText('0.75');
    await expect(page.getByRole('button', { name: 'Walk' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('reduced motion: playback steps discretely', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    // Wait for the observable phase change instead of sleeping on the
    // wall clock; under reduced motion playback advances the playhead in
    // discrete 10% jumps.
    await page.getByRole('button', { name: 'Play gait cycle' }).click();
    await expect
      .poll(
        async () =>
          (await page.getByTestId('phase-readout').textContent()) ?? '',
        { timeout: 10_000 },
      )
      .not.toBe('0%');
    await page.getByRole('button', { name: 'Pause gait cycle' }).click();
    // Paused on a discrete jump: the phase is a multiple of 10%.
    const phase = (await page.getByTestId('phase-readout').textContent()) ?? '';
    expect(Number(phase.replace('%', '')) % 10).toBe(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
