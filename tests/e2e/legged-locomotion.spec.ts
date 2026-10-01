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

  test('the gait-support scene carries the support story the pointer describes', async ({
    page,
  }) => {
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const prose = page.locator('div.prose[data-pagefind-body]');
    const scene = prose.locator('[data-motion-scene="gait-support"]');
    await expect(scene).toHaveCount(1);
    // The retired gait lab leaves no controls or readouts behind.
    for (const id of ['duty-readout', 'phase-readout', 'support-readout', 'row-lf', 'playhead']) {
      await expect(page.getByTestId(id)).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: 'Play gait cycle' })).toHaveCount(0);
    await expect(page.getByRole('slider', { name: /gait phase/i })).toHaveCount(0);
    await expect(prose).toContainText(
      'Press Play on the scene below, then try Step forward from walk to trot to bound and watch the support readout',
    );

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
    // Three feet always down, then two, then a flight phase with none.
    const readout = scene.getByTestId('motion-readout');
    await expect(readout).toContainText(/walk\s*minimum support 3 feet/i);
    const forward = scene.getByRole('button', { name: 'Step forward one beat' });
    await expect(forward).toHaveText('Step forward');
    await forward.click();
    await expect(readout).toContainText(/trot\s*minimum support 2 feet/i);
    await forward.click();
    await expect(readout).toContainText(/bound\s*minimum support 0 feet/i);
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
