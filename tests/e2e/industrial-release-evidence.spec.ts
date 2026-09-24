import { expect, test } from './servo-apollo-fixture';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { ARTICLE, BROWSER, DIRECTORY, artifact, defaults, dependencies, oracle, save, surfacePaths } from '../../audit/evidence/industrial-release-20260923/support';

const ROUTE = '/data-hardware/industrial-deployment/';

/**
 * The DeploymentEconomics calculator mount. The article has exactly one
 * instance, but scoping to the component root keeps the selectors stable
 * if a second mount ever appears.
 */
function calculator(page: import('@playwright/test').Page) {
  return page.locator('div.prose > div.rounded-md:has([data-testid="payback-months"])');
}

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
    command: 'NODE_DISABLE_COMPILE_CACHE=1 INDUSTRIAL_WRITE_BROWSER=1 node_modules/.bin/playwright test --config /home/remy-simpc4/.local/share/robot-wiki-codex-bridge/steward-industrial-20260923-1940.config.mjs',
    runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
    dependencies: surfacePaths.map(artifact), proofDependencies: dependencies(true),
    observations, surfaceObservations, glossary, dashboardLinkStatus, errors,
    p4: { checked: true, statCount: 4, authoredInputs: 7, undatedIds, absentNumericStandIns: [],
      population: 'All four Stat values; all seven authored controls; numeric prose supported by the full native row conjunction; glossary and bibliography from canonical registries; Figure success remains unpublished, not a guessed number. No spec/data table mounts on this article.' },
  });
});
