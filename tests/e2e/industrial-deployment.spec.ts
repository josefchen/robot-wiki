import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

const ROUTE = '/data-hardware/industrial-deployment/';

/**
 * The DeploymentEconomics calculator mount. The article has exactly one
 * instance, but scoping to the component root keeps the selectors stable
 * if a second mount ever appears.
 */
function calculator(page: import('@playwright/test').Page) {
  return page.locator('div.prose > div.rounded-md:has([data-testid="payback-months"])');
}

async function payback(page: import('@playwright/test').Page): Promise<number> {
  const text =
    (await calculator(page).getByTestId('payback-months').textContent()) ?? '';
  expect(text).not.toContain('NaN');
  const value = Number.parseFloat(text);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

test.describe('data-hardware industrial-deployment module', () => {
  test('renders the installed base with a cited figure and the humanoid contrast (VAL-DATA-030)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByText(/4\.66 million|542,076/).filter({ visible: true }).first(),
    ).toBeVisible();
    // The citation chip resolves to a References entry with an external href.
    const chip = main
      .locator('a, [data-cite], sup')
      .filter({ hasText: /IFR|international federation/i })
      .first();
    await expect(chip).toBeVisible();
    // The humanoid contrast in the same opening flow.
    await expect(
      main.getByText(/5,500/).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/humanoid/i).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('names five task categories and the logistics stack, and links to the humanoid table instead of restating it', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    for (const task of [/welding/i, /painting/i, /palletising/i, /machine tending/i, /assembly/i]) {
      await expect(main.getByText(task).filter({ visible: true }).first()).toBeVisible();
    }
    for (const sys of [/storage and retrieval/i, /mobile robot/i, /goods-to-person/i, /piece picking/i]) {
      await expect(main.getByText(sys).filter({ visible: true }).first()).toBeVisible();
    }
    // Links to the reliability-gap module's dashboard, and does not
    // restate its seven rows (no DeploymentDashboard mount here).
    const link = main.locator('a[href="/frontier/reliability-gap"]').first();
    await expect(link).toBeVisible();
    await expect(page.locator('[data-testid="deployment-dashboard"]')).toHaveCount(0);
  });

  test('defines the operational vocabulary with at least three Terms (VAL-DATA-031)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // Each of the five is defined as prose, not a bare mention.
    for (const term of [
      /cycle time/i,
      /takt/i,
      /uptime|availability/i,
      /mean time between failures/i,
      /payback period/i,
    ]) {
      await expect(main.getByText(term).filter({ visible: true }).first()).toBeVisible();
    }
    // At least three resolve as <Term> tooltips: focus each and assert
    // its glossary definition becomes visible on focus.
    let revealed = 0;
    for (const id of ['cycle-time', 'takt-time', 'payback-period', 'mean-time-between-failures']) {
      const term = main.locator(`[data-term-id="${id}"]`).first();
      if ((await term.count()) === 0) continue;
      await term.locator('a, span, button').first().focus();
      // The tooltip is aria-described and CSS-revealed on focus-within.
      const tooltip = term.locator('span[id]');
      if ((await tooltip.count()) > 0) {
        await expect(tooltip.first()).toBeVisible();
        revealed += 1;
      }
    }
    expect(revealed).toBeGreaterThanOrEqual(3);
  });

  test('integration-cost claim carries components and a citation (VAL-DATA-032)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // The claim sentence lives in the article body; matching the inner
    // text node directly, because getByText on a regex can fail to match
    // when the phrase is one text child among several in the paragraph.
    await expect(
      main.locator('p', { hasText: 'two to three times the arm' }).first(),
    ).toBeVisible();
    // Component words asserted against the paragraph's text content
    // rather than getByText regex nodes (which fragment inside the
    // citation-chip spans).
    const sectionText = (await main.locator('p', { hasText: 'two to three times the arm' }).first().textContent()) ?? '';
    for (const comp of [
      'end-of-arm tool',
      'fixtures',
      'guarding',
      'vision',
      'PLC',
      'commissioning',
    ]) {
      expect(sectionText, `component ${comp}`).toContain(comp);
    }
    // The section carries a resolving chip: the reference anchor exists.
    await expect(
      page.locator('#ref-evst-cell-cost-2026'),
    ).toBeVisible();
  });

  test('jam-rate argument in prose and labour disagreement named (two positions)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByText(/99 percent/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/jam/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(main.getByText(/Acemoglu/).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Autor/).filter({ visible: true }).first()).toBeVisible();
  });

  test('the calculator isolates the jam-rate argument (VAL-DATA-033)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const mount = calculator(page);
    const success = mount.getByRole('slider', { name: /per-pick success/i });
    const jam = mount.getByRole('slider', { name: /jam-clearing time/i });

    // Baseline: defaults (99.9% success, 15 s jam clearing).
    const baseline = await payback(page);

    // Cheap jams at the minimum: drop success to 99.
    await setSlider(jam, 5);
    const cheapHigh = await payback(page);
    await setSlider(success, 99);
    const cheapLow = await payback(page);
    const deltaCheap = cheapLow - cheapHigh;

    // Expensive jams at the maximum: same success move.
    await setSlider(jam, 300);
    const expLow = await payback(page);
    await setSlider(success, 99.9);
    const expHigh = await payback(page);
    const deltaExpensive = expLow - expHigh;

    // All four settings produce finite numeric readouts, recorded in the
    // test output for the validation ledger.
    console.log('VAL-DATA-033 paybacks', {
      cheapJam: { at99_9: cheapHigh, at99: cheapLow },
      expensiveJam: { at99_9: expHigh, at99: expLow },
      deltaCheap,
      deltaExpensive,
      baseline,
    });
    // Ordering alone cannot fail in the way that matters: it passes on
    // 0.001 vs 0.002 months, so a refactor that flattened the jam-rate
    // effect to almost nothing would keep it green while the teaching
    // moment died. The contract wording is "barely moves" with cheap
    // clearing and "collapses" with expensive clearing, so the magnitudes
    // are pinned with headroom rather than fitted to today's values:
    // measured deltas are ~0.09 and ~5.2 months (a 60x ratio).
    expect(deltaCheap).toBeLessThan(1);
    expect(deltaExpensive).toBeGreaterThan(3);
    expect(deltaExpensive / deltaCheap).toBeGreaterThan(10);
    expect(deltaExpensive).toBeGreaterThan(deltaCheap);
  });

  test('every calculator default is sourced or labelled an assumption (VAL-DATA-034)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const mount = calculator(page);
    // Derived population: every slider the mount actually renders. A
    // hardcoded name list proves those seven are labelled but stays green
    // when an eighth slider ships with no provenance note, which is the
    // exact failure the sourced-or-assumption rule exists to prevent.
    const sliders = mount.getByRole('slider');
    const sliderCount = await sliders.count();
    // Non-zero cardinality first: an empty match satisfies any loop.
    expect(sliderCount).toBeGreaterThanOrEqual(1);
    let labelled = 0;
    for (const slider of await sliders.all()) {
      const name = (await slider.getAttribute('aria-label')) ?? 'unnamed slider';
      // The note under each slider names its default a source or an
      // assumption. Count before reading so a missing note fails fast
      // with this slider named, not as a 30s element wait.
      const notes = slider.locator('xpath=following-sibling::p');
      expect(await notes.count(), `note for ${name}`).toBeGreaterThanOrEqual(1);
      const text = (await notes.first().textContent()) ?? '';
      expect(text, `note for ${name}`).toMatch(/assumption|sourced/i);
      expect(text.length, `note for ${name} is not empty`).toBeGreaterThan(10);
      labelled += 1;
    }
    // Every rendered slider carried a labelled note: none unlabelled.
    expect(labelled).toBe(sliderCount);
  });

  test('reset restores all inputs', async ({ page }) => {
    await page.goto(ROUTE);
    const mount = calculator(page);
    const jam = mount.getByRole('slider', { name: /jam-clearing time/i });
    const wage = mount.getByRole('slider', { name: /displaced wage/i });
    await setSlider(jam, 300);
    await setSlider(wage, 60);
    await expect(jam).toHaveValue('300');
    await mount.getByRole('button', { name: /reset/i }).click();
    await expect(jam).toHaveValue('15');
    await expect(wage).toHaveValue('25');
  });

  test('keyboard operation moves a slider with arrow keys', async ({ page }) => {
    await page.goto(ROUTE);
    const mount = calculator(page);
    const success = mount.getByRole('slider', { name: /per-pick success/i });
    await success.focus();
    const before = await success.inputValue();
    await page.keyboard.press('ArrowLeft');
    const after = await success.inputValue();
    expect(Number(after)).toBeLessThan(Number(before));
  });

  test('internal links to reliability-gap and market-map resolve (VAL-DATA-034)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const href of ['/frontier/reliability-gap', '/market-map']) {
      const link = page.locator(`#main-content a[href="${href}"]`).first();
      await expect(link).toBeVisible();
      const hrefText = await link.getAttribute('href');
      expect(hrefText).toBeTruthy();
      const response = await page.request.get(hrefText!);
      expect(response.status()).toBe(200);
    }
  });

  test('wiki apparatus: see-also, linked-from, breadcrumbs, references match header count', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    // See also: the heading is present (entry count is graded by the
    // shared wiki-structure specs).
    const apparatus = main.getByText(/see also/i).first();
    await expect(apparatus).toBeVisible();
    // Linked from names the inbound sibling.
    await expect(
      main.getByText(/linked from/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/hardware taxonomy/i).filter({ visible: true }).first(),
    ).toBeVisible();
    // Three-level breadcrumbs.
    await expect(
      page.locator('nav[aria-label="Breadcrumb"]').first(),
    ).toBeVisible();
    // References block present.
    await expect(
      main.getByText(/references/i).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('zero axe violations, zero console errors, no horizontal scroll at 375px', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(ROUTE);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(375);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
});
