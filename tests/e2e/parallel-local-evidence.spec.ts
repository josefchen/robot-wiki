import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DIRECTORY, ROUTE, BROWSER, artifact, dependencies, oracle, save } from '../../audit/evidence/parallel-local-20260923/support';
import { setSlider } from './slider';

const producing = process.env.PARALLEL_WRITE_BROWSER === '1';
async function capture(page: Page, name: string) {
  const viewport = page.viewportSize()!;
  if (!producing) return { viewport, dom: null, capture: null };
  mkdirSync(`${DIRECTORY}/captures`, { recursive: true });
  const domPath = `${DIRECTORY}/captures/${name}.dom.json`;
  const pngPath = `${DIRECTORY}/captures/${name}.png`;
  const dom = await page.evaluate(() => ({
    text: document.body.innerText,
    html: document.querySelector('#main-content')!.outerHTML,
  }));
  writeFileSync(domPath, JSON.stringify(dom, null, 2) + '\n', { flag: 'wx' });
  await page.screenshot({ path: pngPath, animations: 'disabled' });
  return { viewport, dom: artifact(domPath), capture: artifact(pngPath) };
}

test('parallel18 actual default endpoints CPU and reset', async ({ page }) => {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    external.push(url.toString());
    return route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(ROUTE);
  await page.evaluate(() => document.fonts.ready);
  const slider = page.getByRole('slider', { name: /parallel environments/i });
  const toggle = page.getByRole('button', { name: 'CPU single-core bottleneck' });
  const reset = page.getByRole('button', { name: 'Reset', exact: true });
  const chart = slider.locator('xpath=../../..');
  const observations: unknown[] = [];
  const originalCurve = await page.getByTestId('active-curve').getAttribute('points');
  const mountId = 'mount:/rl-sim2real/parallel-sim-rl/:TrainingTimeChart:1';
  async function observe(name: string, envs: number, cpuBound: boolean, caseId: string, prestate: string, action: string) {
    const o = oracle(envs, cpuBound);
    await expect(slider).toHaveValue(String(Math.log2(envs)));
    await expect(toggle).toHaveAttribute('aria-pressed', String(cpuBound));
    for (const [i, id] of ['envs-readout', 'wallclock-readout', 'fps-readout'].entries()) await expect(page.getByTestId(id)).toHaveText(o.display[i]);
    await expect(page.getByTestId('iter-readout')).toHaveText(o.iterationDisplay);
    const readouts = ['envs-readout', 'wallclock-readout', 'fps-readout', 'iter-readout'].map((id, i) => ({
      selector: `[data-testid="${id}"]`, text: i < 3 ? o.display[i] : o.iterationDisplay,
    }));
    for (const [i, key] of ['sim', 'learn', 'cpu'].entries()) {
      await expect(page.getByTestId(`share-${key}`)).toHaveText(o.shareDisplay[i]);
      const width = await page.getByTestId(`breakdown-${key}`).getAttribute('width');
      expect(Number(width)).toBeCloseTo(o.barWidths[i], 2);
    }
    await expect(page.getByTestId('active-curve')).toHaveAttribute('points', o.polyline);
    expect(o.polyline.split(' ')).toHaveLength(49);
    await expect(page.getByTestId('position-marker')).toHaveAttribute('cx', String(o.point.x));
    await expect(page.getByTestId('position-marker')).toHaveAttribute('cy', String(o.point.y));
    if (cpuBound) {
      await expect(page.getByTestId('reference-curve')).toHaveAttribute('points', oracle(envs, false).polyline);
      await expect(page.getByTestId('cpu-explanation')).toContainText('Neither this curve nor its CPU-cost constant is measured');
    } else await expect(page.getByTestId('reference-curve')).toHaveCount(0);
    await expect(page.getByTestId('rudin-marker-flat')).toContainText('flat < 4 min; x illustrative');
    await expect(page.getByTestId('rudin-marker-uneven')).toContainText('rough < 20 min (bound)');
    for (const id of ['flat', 'uneven']) {
      const path = await page.getByTestId(`rudin-marker-${id}`).locator('path').getAttribute('d');
      expect(path).toMatch(/^M 484,/);
    }
    await chart.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
    const observed = await capture(page, name);
    observations.push({
      name, input: { envs, cpuBound, samples: 49 }, mountId, caseId, prestate, action,
      poststate: `${o.display.join('; ')}; ${o.iterationDisplay}; CPU ${cpuBound}; exact 49-point curve, position, breakdown and labelled bounds checked`,
      readouts, ...observed,
    });
  }
  await observe('default', 4096, false, 'default', 'Article not loaded', 'Navigate to existing article');
  await setSlider(slider, 6);
  await observe('min-off', 64, false, 'slider-boundaries-and-anchors', '4096 envs, CPU off', 'Set environment slider to minimum log2=6');
  await setSlider(slider, 14);
  await observe('max-off', 16384, false, 'slider-boundaries-and-anchors', '64 envs, CPU off', 'Set environment slider to maximum log2=14');
  await toggle.click();
  await observe('max-on', 16384, true, 'discrete-options', '16384 envs, CPU off', 'Activate CPU bottleneck toggle');
  await setSlider(slider, 6);
  await observe('min-on', 64, true, 'slider-boundaries-and-anchors', '16384 envs, CPU on', 'Set environment slider to minimum log2=6');
  await setSlider(slider, 12);
  await observe('default-on', 4096, true, 'slider-boundaries-and-anchors', '64 envs, CPU on', 'Set environment slider to default log2=12');
  await reset.click();
  await expect(page.getByTestId('active-curve')).toHaveAttribute('points', originalCurve!);
  await observe('reset', 4096, false, 'reset', '4096 envs, CPU on', 'Activate Reset');
  const desktopAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(desktopAxe.violations).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await observe('mobile-default', 4096, false, 'default', 'Desktop reset state', 'Resize existing mounted chart to375px');
  const mobileAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(mobileAxe.violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  if (producing) save('browser-run.json', {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 PARALLEL_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/parallel-local-evidence.spec.ts tests/e2e/parallel-sim-rl.spec.ts --workers=1 --retries=0 --reporter=line --output=audit/evidence/parallel-local-20260923/playwright',
    runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
    dependencies: dependencies(true), observations,
    pageErrors: errors, externalRequests: external,
    desktopAxeViolations: desktopAxe.violations, mobileAxeViolations: mobileAxe.violations,
  });
});
