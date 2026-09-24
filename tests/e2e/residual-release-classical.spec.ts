import { expect, test } from '@playwright/test';
import { setSlider } from './slider';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getTerm } from '../../data/glossary';
import { recomputeLocalDerivation } from '../../lib/audit-local-basis';

const ROUTE = '/classical/kinematics/';


test('classical closure mounted observations at desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000);
  const startedAt = new Date().toISOString();
  const directory = join(process.cwd(), 'audit/evidence/residual-release-20260924/classical');
  const captureEnabled = process.env.CLASSICAL_CLOSURE_CAPTURE === '1';
  const ref = (path: string) => {
    const bytes = readFileSync(join(directory, path));
    return { path: `audit/evidence/residual-release-20260924/classical/${path}`, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  const captures: object[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Local rendered behavior only. No article-source retrieval or external embed.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  const capture = async (name: string, details: object) => {
    if (!captureEnabled) return;
    const dom = { text: await page.locator('#main-content').innerText(),
      allText: await page.locator('#main-content').textContent(), url: page.url() };
    writeFileSync(join(directory, `${name}.dom.json`), JSON.stringify(dom, null, 2) + '\n');
    await page.screenshot({ path: join(directory, `${name}.png`), animations: 'disabled' });
    captures.push({ name, viewport: page.viewportSize(), observedAt: new Date().toISOString(),
      ...details, dom: ref(`${name}.dom.json`), capture: ref(`${name}.png`) });
  };
  const ready = async (route: string) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button,input')].some(el =>
      Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
    await page.evaluate(async () => { await document.fonts.ready; });
  };
  await page.clock.install();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await ready(ROUTE);
    const main = page.locator('#main-content');
    for (const absent of ['Wampler', 'Levenberg-Marquardt', 'residual decreases monotonically']) {
      await expect(main).not.toContainText(absent);
    }
    for (const id of ['wampler-1986', 'levenberg-1944', 'marquardt-1963', 'denavit-hartenberg-1955']) {
      await expect(main.locator(`[data-cite-id="${id}"],[data-reference-id="${id}"]`)).toHaveCount(0);
    }
    await expect(main.getByRole('link', { name: '3D kinematics playground' })).toHaveAttribute('href', '/playground');
    await expect(page.getByTestId('fk-theta-1')).toHaveText('110°');
    await expect(main).toContainText('±0.5mm');
    const glossary = [];
    for (const id of ['inverse-kinematics', 'denavit-hartenberg-parameters']) {
      const term = main.locator(`[data-term-id="${id}"]`).first();
      await term.locator('a').first().focus();
      await expect(term.getByRole('tooltip')).toBeVisible();
      await expect(term.getByRole('tooltip')).toContainText(getTerm(id)!.definition);
      glossary.push({ id, resolves: true, tooltipObserved: true, definition: getTerm(id)!.definition });
      await page.keyboard.press('Tab');
    }
    await main.getByRole('heading', { name: 'Denavit-Hartenberg parameters', exact: true }).scrollIntoViewIfNeeded();
    await capture(`kinematics-${viewport.width}`, { surface: 'kinematics', glossary,
      checkedText: ['LaValle describes', '3D kinematics playground', '±0.5mm'] });

    await ready('/classical/motion-planning/');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    const rrtControl = page.getByRole('slider', { name: /exploration iteration/i });
    const rrtReadouts = ['rrt-iteration-readout', 'rrt-node-readout', 'rrt-status-readout', 'rrt-path-readout'];
    const rrtState = async (name: string, iteration: number, prestate: string, action: string, caseId: string) => {
      const result = recomputeLocalDerivation({ id: 'rrt', mode: 'derive', inputs: { iteration } });
      const display = (result.values as { display: string[] }).display;
      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(rrtReadouts[i])).toHaveText(display[i]);
      await page.getByTestId('rrt-iteration-readout').scrollIntoViewIfNeeded();
      await capture(`rrt-${name}-${viewport.width}`, { surface: 'rrt', recipe: { id: 'rrt', mode: 'derive', inputs: { iteration } },
        mountId: 'mount:/classical/motion-planning/:RrtExplorer:1', caseId, prestate, action, poststate: name,
        readouts: display.map((text, i) => ({ selector: `[data-testid="${rrtReadouts[i]}"]`, text })) });
    };
    await rrtState('opening', 0, 'unmounted', 'navigate to article', 'default');
    await page.getByRole('button', { name: 'Step forward', exact: true }).click();
    await rrtState('step', 1, 'opening', 'Step forward', 'slider-boundaries-and-anchors');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Run the exploration', exact: true }).click();
    await expect(page.getByTestId('rrt-iteration-readout')).toHaveAttribute('data-playback-cadence', 'smooth');
    await page.clock.runFor(50);
    await page.getByRole('button', { name: 'Pause the exploration', exact: true }).click();
    await rrtState('playback', 3, 'reset at 0', 'Run, one 50ms timer tick, Pause', 'slider-boundaries-and-anchors');
    await setSlider(rrtControl, 100);
    await rrtState('scrub', 100, 'playback at 3', 'set iteration slider to 100', 'slider-boundaries-and-anchors');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await rrtState('reset', 0, 'scrub at 100', 'Reset', 'reset');
    await page.clock.resume();

    await ready('/classical/perception/');
    const base = { handEyeDeg: .5, depthPct: 2, poseMm: 3, workingDistanceM: .5, target: 'opaque' };
    const perceptionReadouts = ['perception-total-readout', 'perception-depth-readout', 'perception-verdict-readout'];
    const state = async (name: string, inputs: typeof base, prestate: string, action: string, caseId: string) => {
      const result = recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs });
      const display = (result.values as { display: string[] }).display;
      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(perceptionReadouts[i])).toHaveText(display[i]);
      await page.getByTestId('perception-total-readout').scrollIntoViewIfNeeded();
      await capture(`perception-${name}-${viewport.width}`, { surface: 'perception',
        recipe: { id: 'perception', mode: 'derive', inputs },
        mountId: 'mount:/classical/perception/:PerceptionErrorBudget:1', caseId, prestate, action, poststate: name,
        readouts: display.map((text, i) => ({ selector: `[data-testid="${perceptionReadouts[i]}"]`, text })) });
    };
    await state('opening', base, 'unmounted', 'navigate to article', 'default');
    await expect(page.getByTestId('perception-distance-slider')).toHaveAttribute('min', '0.15');
    await setSlider(page.getByTestId('perception-distance-slider'), .15);
    await state('near', { ...base, workingDistanceM: .15 }, 'opening', 'distance to 0.15m', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-distance-slider'), 1.5);
    await state('far', { ...base, workingDistanceM: 1.5 }, 'near', 'distance to 1.5m', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-handeye-slider'), 0);
    await state('zeroFar', { ...base, handEyeDeg: 0, workingDistanceM: 1.5 }, 'far', 'angle to zero', 'slider-boundaries-and-anchors');
    await setSlider(page.getByTestId('perception-distance-slider'), .15);
    await state('zeroNear', { ...base, handEyeDeg: 0, workingDistanceM: .15 }, 'zeroFar', 'distance to 0.15m', 'slider-boundaries-and-anchors');
    for (const target of ['specular', 'transparent']) {
      await page.getByRole('button', { name: 'Reset the error budget to its opening values' }).click();
      await page.getByTestId(`perception-target-${target}`).check();
      await state(target, { ...base, target }, 'reset opening', `select ${target}`, 'discrete-options');
    }
    await page.getByRole('button', { name: 'Reset the error budget to its opening values' }).click();
    await state('reset', base, 'transparent', 'Reset', 'reset');
    await expect(page.getByTestId('perception-budget')).not.toContainText('will jam');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
  if (captureEnabled) writeFileSync(join(directory, 'mounted-observations.json'), JSON.stringify({
    startedAt, endedAt: new Date().toISOString(), runner: 'playwright', documentNavigations: 6,
    externalRequests: 'blocked; no external source or embed retrieval', errors, captures,
  }, null, 2) + '\n');
});

