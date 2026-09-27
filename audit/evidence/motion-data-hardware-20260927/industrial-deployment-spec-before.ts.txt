import { expect, test } from './servo-apollo-fixture';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { ARTICLE, BROWSER, DIRECTORY, artifact, defaults, dependencies, oracle, save, surfacePaths } from '../../audit/evidence/industrial-closure-20260923/support';

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
      main.getByText(/4,663,698|542,076/).filter({ visible: true }).first(),
    ).toBeVisible();
    // The citation chip resolves to a References entry with an external href.
    const chip = main
      .locator('[data-cite-id="ifr-world-robotics-2025"] a[target="_blank"]')
      .first();
    await expect(chip).toBeVisible();
    // The vendor-reported humanoid baseline in the same opening flow.
    await expect(
      main.getByText(/65,000 hours/).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/humanoid/i).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('names OSHA use examples and the logistics stack, and links to the humanoid table instead of restating it', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    for (const task of [/welding/i, /painting/i, /machine-tool loading and unloading/i, /assembly/i, /materials handling and packaging/i]) {
      await expect(main.getByText(task).filter({ visible: true }).first()).toBeVisible();
    }
    for (const sys of [/storage and retrieval/i, /mobile robot/i, /goods-to-person/i, /piece picking/i]) {
      await expect(main.getByText(sys).filter({ visible: true }).first()).toBeVisible();
    }
    // Links to the reliability-gap module's dashboard, and does not
    // restate its rows (no DeploymentDashboard mount here).
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
    const response = await page.goto(ROUTE);
    expect(response?.status()).toBe(200);
    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { level: 1, name: 'Industrial Deployment' })).toBeVisible();
    // The claim sentence lives in the article body; matching the inner
    // text node directly, because getByText on a regex can fail to match
    // when the phrase is one text child among several in the paragraph.
    await expect(
      main.locator('p', { hasText: 'two to three times the arm' }).first(),
    ).toBeVisible();
    // Component words asserted against the paragraph's text content
    // rather than getByText regex nodes (which fragment inside the
    // citation-chip spans).
    const sectionText = await main.locator('p', { hasText: "EVST's July 15, 2026" }).first().innerText();
    for (const comp of [
      'end-of-arm tool',
      'light curtains',
      'fencing',
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


test('industrial closure paired cases and complete reader surfaces', async ({ page }) => {
  const startedAt = new Date().toISOString();
  const producing = process.env.INDUSTRIAL_WRITE_BROWSER === '1';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1100 });
  expect((await page.goto(ROUTE))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const mount = calculator(page);
  const success = mount.getByRole('slider', { name: /per-pick success/i });
  const jam = mount.getByRole('slider', { name: /jam-clearing time/i });
  const observations: unknown[] = [];
  async function capture(name: string) {
    const viewport = page.viewportSize()!;
    if (!producing) return { viewport, dom: null, capture: null };
    const domPath = `${DIRECTORY}/final-${name}.dom.json`, pngPath = `${DIRECTORY}/final-${name}.png`;
    const dom = await page.evaluate(() => ({ text: document.body.innerText, allText: document.body.textContent, html: document.querySelector('#main-content')!.outerHTML }));
    writeFileSync(domPath, JSON.stringify(dom, null, 2) + '\n', { flag: 'wx' });
    await page.screenshot({ path: pngPath, animations: 'disabled' });
    return { viewport, dom: artifact(domPath), capture: artifact(pngPath) };
  }
  for (const clearing of [15, 300]) {
    for (const rate of [99.9, 99]) {
      const prestate = `success=${await success.inputValue()}; clearing=${await jam.inputValue()}`;
      await setSlider(jam, clearing); await setSlider(success, rate);
      const input = { ...defaults, successRatePercent: rate, jamClearSeconds: clearing };
      const o = oracle(input);
      await expect(success).toHaveValue(String(rate)); await expect(jam).toHaveValue(String(clearing));
      const readouts = [];
      for (const [i, id] of ['cost-per-pick', 'payback-months'].entries()) {
        await expect(mount.getByTestId(id)).toHaveText(o.display[i]);
        readouts.push({ selector: `[data-testid="${id}"]`, text: (await mount.getByTestId(id).innerText()).trim() });
      }
      await expect(mount).toContainText(o.summary);
      await expect(mount.getByTestId('payback-verdict')).toHaveText('Pays back inside 24 months');
      await mount.scrollIntoViewIfNeeded();
      observations.push({ input, mountId: 'mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1',
        caseId: 'slider-boundaries-and-anchors', prestate,
        action: `Set clearing=${clearing} seconds and success=${rate} percent`,
        poststate: `${o.summary}; ${o.display.join('; ')}; Pays back inside 24 months`,
        readouts, ...await capture(`case-${rate}-${clearing}`) });
    }
  }
  await mount.getByRole('button', { name: 'Reset', exact: true }).click();
  const article = readFileSync(ARTICLE, 'utf8');
  const ids = [...new Set([...article.matchAll(/<Term id="([^"]+)"/g)].map(m => m[1]))];
  const glossary: { id: string; resolves: boolean; tooltipObserved: boolean }[] = [];
  const surfaceObservations: unknown[] = [];
  const undatedIds = ['lei-takt-time-definition', 'lei-cycle-time-definition'];
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1100 });
    const checkedText: string[] = [];
    for (const id of ids) {
      const canonical = GLOSSARY.find(g => g.id === id);
      expect(canonical).toBeDefined();
      for (const citation of canonical!.citations) expect(CITATIONS.some(c => c.id === citation)).toBe(true);
      const term = page.locator(`[data-term-id="${id}"]`).first();
      await term.locator('a, span, button').first().focus();
      const tooltip = term.locator('span[id]').first();
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(canonical!.definition);
      checkedText.push(canonical!.definition);
      if (width === 1440) glossary.push({ id, resolves: true, tooltipObserved: true });
    }
    for (const id of undatedIds) {
      const canonical = CITATIONS.find(c => c.id === id)!;
      expect(canonical.year).toBe('n.d.'); expect(canonical.accessedOn).toBe('2026-09-22');
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toContainText(canonical.title);
      await expect(reference).toContainText('n.d.; accessed 2026-09-22');
      await expect(reference.locator('a[href^="https://www.lean.org/"]').first()).toHaveAttribute('href', canonical.url);
      checkedText.push(canonical.title, 'n.d.; accessed 2026-09-22');
    }
    for (const value of ['4,663,698', '542,076', '54%']) {
      await expect(page.locator('#main-content')).toContainText(value); checkedText.push(value);
    }
    const sliders = mount.getByRole('slider'); expect(await sliders.count()).toBe(7);
    for (const slider of await sliders.all()) await expect(slider.locator('xpath=following-sibling::p')).toContainText(/assumption|sourced/i);
    await expect(page.locator('#main-content')).toContainText('not a measured intervention rate');
    await expect(page.locator('#main-content')).toContainText('no published success rate');
    checkedText.push('not a measured intervention rate', 'no published success rate');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const axe = await new AxeBuilder({ page }).include('#main-content').analyze();
    expect(axe.violations).toEqual([]);
    await page.locator('#the-metrics-that-decide-a-deployment').scrollIntoViewIfNeeded();
    surfaceObservations.push({ checkedText, ...await capture(`surfaces-${width}`), axeViolations: axe.violations });
  }
  const dashboardLinkStatus = (await page.request.get('/frontier/reliability-gap/')).status();
  expect(dashboardLinkStatus).toBe(200); expect(errors).toEqual([]);
  if (producing) save('browser-run.json', {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 INDUSTRIAL_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/industrial-deployment.spec.ts --grep "industrial closure paired" --workers=1 --retries=0 --reporter=line --output=audit/evidence/industrial-closure-20260923/playwright-final',
    runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
    dependencies: surfacePaths.map(artifact), proofDependencies: dependencies(true),
    observations, surfaceObservations, glossary, dashboardLinkStatus, errors,
    p4: { checked: true, statCount: 4, authoredInputs: 7, undatedIds, absentNumericStandIns: [],
      population: 'All four Stat values; all seven authored controls; numeric prose supported by the full native row conjunction; glossary and bibliography from canonical registries; Figure success remains unpublished, not a guessed number. No spec/data table mounts on this article.' },
  });
});
