import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { setSlider } from './slider';

const directory = 'audit/evidence/final-seven-closure-20260923';
const hash = (path: string) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
};
const mount = (route: string, component: string, number: number) => `mount:${route}:${component}:${number}`;
const chart = (page: Page, testid: string, index: number) =>
  page.getByTestId(testid).nth(index).locator('xpath=ancestor::div[@data-brand-surface-id="surface:flat"][1]');

test('final seven: actually mounted corrected arithmetic on two viewports', async ({ page }) => {
  test.setTimeout(240_000);
  const startedAt = new Date().toISOString();
  const observations: object[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());

  async function visit(route: string) {
    expect((await page.goto(route))?.status(), route).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
      Object.keys(el).some(key => key.startsWith('__reactFiber$'))));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  async function capture(
    route: string, component: string, number: number, caseId: string,
    prestate: string, action: string, poststate: string, scope: Locator,
    selectors: string[], expected: string[], viewport: { width: number; height: number },
  ) {
    expect(selectors).toHaveLength(expected.length);
    const readouts = [];
    for (const [index, selector] of selectors.entries()) {
      const element = scope.getByTestId(selector);
      await expect(element).toHaveText(expected[index]);
      readouts.push({ selector: `[data-testid="${selector}"]`, text: (await element.innerText()).trim() });
    }
    await scope.scrollIntoViewIfNeeded();
    const name = `${component.toLowerCase()}-${number}-${caseId}-${viewport.width}`;
    const dom = `${directory}/${name}.dom.txt`;
    const imagePath = `${directory}/${name}.png`;
    const content = await page.locator('#main-content').innerText();
    expect(content).not.toContain('$$');
    writeFileSync(dom, content + '\n');
    await page.screenshot({ path: imagePath, animations: 'disabled' });
    observations.push({ mountId: mount(route, component, number), caseId, prestate, action, poststate,
      viewport, readouts, dom: hash(dom), capture: hash(imagePath), observedAt: new Date().toISOString() });
  }
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);

    const gaitRoute = '/rl-sim2real/legged-locomotion/';
    await visit(gaitRoute);
    await expect(page.locator('#main-content')).toContainText('authored illustrative duty factors');
    await expect(page.locator('#main-content')).not.toContainText('classical and learned alike');
    const gait = chart(page, 'duty-readout', 0);
    await capture(gaitRoute, 'GaitDiagram', 1, 'default', 'unmounted', 'load', 'walk@0', gait,
      ['phase-readout', 'duty-readout'], ['0%', '0.75'], viewport);
    await gait.getByRole('button', { name: 'Trot', exact: true }).click();
    await capture(gaitRoute, 'GaitDiagram', 1, 'discrete-options', 'walk@0', 'select trot', 'trot@0', gait,
      ['phase-readout', 'duty-readout'], ['0%', '0.50'], viewport);
    await setSlider(gait.getByRole('slider'), 20);
    await gait.getByRole('button', { name: 'Step forward' }).click();
    await capture(gaitRoute, 'GaitDiagram', 1, 'slider-boundaries-and-anchors', 'trot@20%',
      'step forward on 5% grid', 'trot@25%', gait,
      ['phase-readout', 'duty-readout'], ['25%', '0.50'], viewport);
    await gait.getByRole('button', { name: 'Reset' }).click();
    await capture(gaitRoute, 'GaitDiagram', 1, 'reset', 'trot@25%', 'reset', 'walk@0', gait,
      ['phase-readout', 'duty-readout'], ['0%', '0.75'], viewport);

    const dataRoute = '/data-hardware/data-bottleneck/';
    await visit(dataRoute);
    await expect(page.locator('#main-content')).toContainText('The chart assigns it no hour estimate');
    const mainChart = chart(page, 'hours-readout', 0);
    await expect(mainChart.getByTestId('oxe-duration-note')).toContainText('no hour estimate');
    await expect(mainChart.getByTestId('robot-marker-oxe')).toHaveCount(0);
    await capture(dataRoute, 'DataScaleChart', 1, 'default', 'unmounted', 'load', '15-dedicated', mainChart,
      ['hours-readout', 'frontier-years-readout'], ['15,000 h/yr', '66.7 yr'], viewport);
    const predictData = page.locator('[data-predict]');
    await predictData.locator('details[data-reveal] > summary').click();
    const revealedChart = chart(page, 'hours-readout', 1);
    await capture(dataRoute, 'DataScaleChart', 2, 'default', 'unmounted', 'reveal prediction',
      '10-low-rate', revealedChart, ['hours-readout', 'oxe-years-readout'], ['70 h/yr', '143 yr'], viewport);
    await revealedChart.getByRole('button', { name: /Dedicated farm hypothetical/ }).click();
    await capture(dataRoute, 'DataScaleChart', 2, 'discrete-options', '10-low-rate', 'select dedicated',
      '10-dedicated', revealedChart, ['hours-readout', 'oxe-years-readout'], ['10,000 h/yr', '1.0 yr'], viewport);
    await revealedChart.getByRole('button', { name: 'Reset' }).click();
    await capture(dataRoute, 'DataScaleChart', 2, 'reset', '10-dedicated', 'reset', '10-low-rate',
      revealedChart, ['hours-readout', 'oxe-years-readout'], ['70 h/yr', '143 yr'], viewport);

    const evaluationRoute = '/data-hardware/evaluation-crisis/';
    await visit(evaluationRoute);
    await expect(page.locator('#main-content')).toContainText('conditional on all earlier decisions succeeding');
    const evaluation = chart(page, 'episode-success-readout', 0);
    await capture(evaluationRoute, 'ReliabilityCompounding', 1, 'default', 'unmounted', 'load',
      'p.95-n30', evaluation, ['episode-success-readout'], ['21.5%'], viewport);
    await setSlider(evaluation.getByRole('slider', { name: /Episode length/ }), 100);
    await capture(evaluationRoute, 'ReliabilityCompounding', 1, 'slider-boundaries-and-anchors',
      'p.95-n30', 'set horizon 100', 'p.95-n100', evaluation,
      ['episode-success-readout'], ['0.6%'], viewport);
    await evaluation.getByRole('button', { name: 'Reset' }).click();
    await capture(evaluationRoute, 'ReliabilityCompounding', 1, 'reset', 'p.95-n100', 'reset',
      'p.95-n30', evaluation, ['episode-success-readout'], ['21.5%'], viewport);
    const predictEvaluation = page.locator('[data-predict]');
    await predictEvaluation.locator('details[data-reveal] > summary').click();
    const predicted = chart(page, 'episode-success-readout', 1);
    await capture(evaluationRoute, 'ReliabilityCompounding', 2, 'default', 'unmounted',
      'reveal prediction', 'p.95-n14', predicted, ['episode-success-readout'], ['48.8%'], viewport);

    const safetyRoute = '/frontier/safety-and-assurance/';
    await visit(safetyRoute);
    await expect(page.locator('#main-content')).toContainText('2000 mm/s may be more prudent');
    const safety = chart(page, 'mode-constraint', 0);
    await capture(safetyRoute, 'CollaborativeOperationModes', 1, 'default', 'unmounted', 'load',
      'distance-r1-h1.6', safety, ['separation-readout'], ['1.42 m'], viewport);
    await safety.getByTestId('mode-power-force').click();
    await expect(safety.getByTestId('separation-readout')).toHaveCount(0);
    await capture(safetyRoute, 'CollaborativeOperationModes', 1, 'discrete-options',
      'distance-r1-h1.6', 'select power-force', 'force-r1-h1.6', safety,
      ['force-readout', 'force-limit-readout'], ['316 N', '255 N'], viewport);
    await safety.getByRole('button', { name: 'Reset' }).click();
    await capture(safetyRoute, 'CollaborativeOperationModes', 1, 'reset', 'force-r1-h1.6',
      'reset', 'distance-r1-h1.6', safety, ['separation-readout'], ['1.42 m'], viewport);
  }
  expect(errors).toEqual([]);
  expect(observations).toHaveLength(30);
  writeFileSync(`${directory}/browser-observations.json`,
    JSON.stringify({ startedAt, endedAt: new Date().toISOString(), observations, errors }, null, 2) + '\n',
    { flag: 'w' });
});
