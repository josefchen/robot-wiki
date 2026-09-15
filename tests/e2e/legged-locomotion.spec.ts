import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/rl-sim2real/legged-locomotion/';

for (const width of [375, 1440]) {
  test(`Lee corrected citation stays visible on hover and keyboard focus at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto(ROUTE);
    const paragraph = page.locator('p').filter({ hasText: 'Lee and colleagues used a privileged' });
    const chip = paragraph.locator('[data-cite-id="lee-2020"]');
    const link = chip.locator('a').first();
    const tooltip = chip.getByRole('tooltip');
    await link.scrollIntoViewIfNeeded();
    for (const state of ['hover', 'focus']) {
      if (state === 'hover') await link.hover();
      else {
        await page.mouse.move(0, 0);
        await link.focus();
      }
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      await expect(tooltip).toContainText('Learning Quadrupedal Locomotion over Challenging Terrain');
      await expect(link).toHaveAttribute('href', 'https://arxiv.org/abs/2010.11251');
    }
    await page.screenshot({ path: `${process.env.DR_READER_OUT ?? 'test-results'}/lee-placement-${process.env.DR_READER_RUN ?? 'test'}-${width}.png` });
  });
}

for (const width of [375, 1440]) {
  test(`Park bound timing correction renders at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto(ROUTE);
    const paragraph = page.locator('p').filter({ hasText: 'In the MIT Cheetah 2 control design' });
    await expect(paragraph).toHaveCount(1);
    await expect(paragraph).toContainText('Park, Wensing and Kim plan stance time from stride length and desired speed');
    await expect(paragraph).toContainText('modulate the duty cycle via vertical impulse scaling');
    await expect(paragraph).toContainText('only up to 3 m/s and is fixed above it');
    await expect(paragraph).toContainText('6.4 m/s bounding result with cost of transport 0.47');
    await expect(paragraph).toContainText('qualified by side-wall contact and roll instability');
    // The drift gloss is gone: the paper's own impulse-scaling mechanism and
    // the Sec. 7 stride schedule replace the all-speed duty-cycle scaling.
    await expect(paragraph).not.toContainText('scaling the duty cycle with speed');
    const chip = paragraph.locator('[data-cite-id="park-2017-bounding"]');
    await expect(chip).toHaveCount(1);
    await expect(chip.locator('a').first()).toHaveAttribute(
      'href',
      'https://journals.sagepub.com/doi/10.1177/0278364917694244',
    );
    await chip.locator('a').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.DR_READER_OUT ?? 'test-results'}/park-timing-${process.env.DR_READER_RUN ?? 'test'}-${width}.png` });
  });
}

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
      /Etzel mountain hike covered 2\.2 km with 120 m of elevation gain in 78 minutes/,
      /beach sand at 3\.03/,
      /retargeted human motion/,
      /450M-parameter diffusion transformer/,
      /MIT humanoid/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
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

  test('reduced motion changes before and during playback rebuild the gait cadence', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const phase = page.getByTestId('phase-readout');
    const phaseNumber = async () =>
      Number(((await phase.textContent()) ?? '0').replace('%', ''));

    // Preference changed after mount but before playback.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Play gait cycle' }).click();
    await expect(phase).toHaveAttribute('data-playback-cadence', 'coarse');
    await expect.poll(phaseNumber, { timeout: 5_000 }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause gait cycle' }).click();
    await expect(phase).toHaveAttribute('data-playback-cadence', 'idle');
    expect((await phaseNumber()) % 10).toBe(0);

    // Preference changed again while smooth playback is active.
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Play gait cycle' }).click();
    await expect
      .poll(async () => {
        const value = await phaseNumber();
        return value !== 0 && value % 10 !== 0;
      }, { timeout: 5_000 })
      .toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(phase).toHaveAttribute('data-playback-cadence', 'coarse');
    const transitionedAt = await phaseNumber();
    await expect
      .poll(phaseNumber, { timeout: 5_000, intervals: [100] })
      .not.toBe(transitionedAt);
    await page.getByRole('button', { name: 'Pause gait cycle' }).click();
    await expect(phase).toHaveAttribute('data-playback-cadence', 'idle');
    const reachableCoarsePhases = new Set<number>();
    let coarsePhase = transitionedAt;
    for (let tick = 0; tick < 10; tick += 1) {
      coarsePhase = coarsePhase + 10 >= 100 ? 0 : coarsePhase + 10;
      reachableCoarsePhases.add(coarsePhase);
    }
    expect(reachableCoarsePhases.has(await phaseNumber())).toBe(true);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
