import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/adjacent/drones/';

test.describe('adjacent drones module', () => {
  test('renders with h1 and substantive article prose (VAL-ADJ-003)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Drones and Aerial Robotics' }),
    ).toBeVisible();

    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const text = (await prose.textContent()) ?? '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    // Concise but substantive: the module targets roughly 2,000+ words
    // (VAL-ADJ-003 requires prose; VAL-ADJ-001's 3,000-word bar applies
    // only to the autonomous-vehicles module).
    expect(words, `article word count (${words})`).toBeGreaterThanOrEqual(1500);

    const fontFamily = await prose.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('font-family'),
    );
    expect(fontFamily.toLowerCase()).toContain('serif');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Drones and Aerial Robotics' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('covers autonomous flight with citations (VAL-ADJ-003a)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const heading of [
      'Why flight was the first solved testbed',
      'The autonomy stack on a flying robot',
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: heading }),
      ).toBeVisible();
    }
    // The three flight results: sim-to-real racing, champion-level RL,
    // and the RL-vs-optimal-control comparison.
    const prose = page.locator('div.prose[data-pagefind-body]');
    expect(await prose.textContent()).toMatch(/Swift/);
    expect(await prose.textContent()).toMatch(/reinforcement learning/);
  });

  test('covers swarm robotics with citations (VAL-ADJ-003b)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Swarm robotics' }),
    ).toBeVisible();
    const prose = page.locator('div.prose[data-pagefind-body]');
    const text = (await prose.textContent()) ?? '';
    expect(text).toMatch(/bamboo forest/);
    expect(text).toMatch(/trajectory optimi/);
  });

  test('citation chips resolve to primary sources in both topic areas (VAL-ADJ-003)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    // Autonomous flight area: high-speed flight, Swift, RL-vs-OC.
    await expect(
      prose.getByRole('link', { name: 'Loquercio 2021' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2110.05113');
    await expect(
      prose.getByRole('link', { name: 'Kaufmann 2023' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.nature.com/articles/s41586-023-06419-4',
    );
    await expect(
      prose.getByRole('link', { name: 'Song 2023' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2310.10943');
    await expect(
      prose.getByRole('link', { name: 'Falanga 2019' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/LRA.2019.2898117');
    // Swarm area: the Zhou micro-swarm and the Soria NMPC swarm.
    await expect(
      prose.getByRole('link', { name: 'Zhou 2022' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.science.org/doi/10.1126/scirobotics.abm5954',
    );
    await expect(
      prose.getByRole('link', { name: 'Soria 2021' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.nature.com/articles/s42256-021-00341-y',
    );
    const chips = prose.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('perception-latency interactive renders and responds to controls (interactive contract)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const slider = page.getByRole('slider', { name: /perception latency/i });
    await expect(slider).toBeVisible();
    // Opens at the study's stereo-camera operating point.
    await expect(page.getByTestId('max-speed-readout')).toHaveText('19.21 m/s');
    await expect(page.getByTestId('latency-readout')).toHaveText('70 ms');

    // Dragging the latency slider lowers the maximum speed.
    await slider.focus();
    await slider.press('ArrowLeft'); // step 5 ms down
    await expect(page.getByTestId('max-speed-readout')).not.toHaveText('19.21 m/s');

    // Agility selection changes the avoidance maneuver time.
    await page.getByRole('button', { name: '200 m/s²' }).click();
    await expect(page.getByTestId('avoid-readout')).toHaveText('122 ms');

    // Reset restores the study default.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('max-speed-readout')).toHaveText('19.21 m/s');
    await expect(
      page.getByRole('button', { name: '25 m/s²', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('swarm control table renders completely with no unparsed JSX (VAL-ADJ-007)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /control families for aerial swarms/i,
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader').first()).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(3);
    const text =
      (await page.locator('div.prose[data-pagefind-body]').textContent()) ?? '';
    expect(text).not.toContain('import {');
    expect(text).not.toContain('<Cite');
    expect(text).not.toContain('<Term');
    expect(text).not.toContain('<PerceptionLatency');
    expect(text).not.toContain('<SwarmControlTable');
    expect(text).not.toContain('$$');
  });

  test('wiki apparatus renders: see also, linked from, references', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    // The AV sibling links back to this module, so Linked from must list it.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    await expect(
      linkedFrom.getByRole('link', { name: 'Autonomous Vehicles' }),
    ).toBeVisible();
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
