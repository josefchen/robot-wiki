import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  BROWSER, DIRECTORY, ENVS, MOUNT, ROUTE, artifact, batchOracle, dependencies, runCwd, save, stagePoint,
} from '../../audit/evidence/parallel-local-20261009/support';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

const producing = process.env.PARALLEL_WRITE_BROWSER === '1';
const DISCLOSURE = 'The opening scene is an illustrative calculation: a fixed 220-million-transition budget, an assumed CPU-cost curve that raises per-iteration costs, and a calibrated near-four-minute time at 4,096 environments.';
const CAPTIONS = [
  'With 64 virtual robots practising at once, the same amount of practice takes hours.',
  'With 4,096 robots side by side on one graphics chip, the same practice finishes in minutes.',
  'Some work for each robot still runs on the main computer, so with that overhead the dashed line flattens.',
  'Robots need huge amounts of practice; a graphics chip running 16,384 virtual robots side by side finishes it in minutes.',
];
type Envs = typeof ENVS[number];
type Beat = { n: number; id: string; envs: Envs; dashed: boolean };
const BEATS: readonly Beat[] = [
  { n: 1, id: 'one-batch', envs: 64, dashed: false },
  { n: 2, id: 'scale', envs: 4096, dashed: false },
  { n: 3, id: 'cpu', envs: 4096, dashed: true },
  { n: 4, id: 'recap', envs: 16384, dashed: true },
];
const solid = Object.fromEntries(ENVS.map(envs => [envs, batchOracle(envs, false)])) as Record<Envs, ReturnType<typeof batchOracle>>;
const dashed = Object.fromEntries(ENVS.map(envs => [envs, batchOracle(envs, true)])) as Record<Envs, ReturnType<typeof batchOracle>>;
const METHOD = `The lab's times along the solid curve: ${ENVS.map(envs => solid[envs].method).join('; ')}. `
  + `Along the dashed curve: ${dashed[64].words}, ${dashed[4096].words} and ${dashed[16384].words}.`;

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

test('parallel18 BatchScale default, every beat, method times, reset and 375 px', async ({ page }) => {
  // One page walks all eight observations and two axe passes in order.
  test.setTimeout(180_000);
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
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  const scene = prose.locator('[data-motion-scene="batch-scale"]');
  await expect(scene).toHaveCount(1);
  // The retired training-time chart leaves no slider, toggle, readout or marker behind.
  await expect(page.getByRole('slider', { name: /parallel environments/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'CPU single-core bottleneck' })).toHaveCount(0);
  for (const id of ['envs-readout', 'wallclock-readout', 'fps-readout', 'iter-readout', 'active-curve', 'rudin-marker-flat', 'rudin-marker-uneven']) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  // The Rudin bounds stay in the prose and the stat tile, apart from the authored scene.
  await expect(prose).toContainText('Flat terrain took under four minutes and uneven terrain twenty');
  await expect(prose).toContainText('Flat-terrain walk');
  await expect(prose).toContainText('< 4 min');
  await expect(prose).toContainText(DISCLOSURE);
  await expect(scene.locator('[data-scene-status]')).toHaveText('An illustrative calculation, not a measured training curve');

  const solidPaths = await scene.locator('[data-scene-mark="fixed-budget-time"] path').evaluateAll(paths => paths.map(p => p.getAttribute('d')!));
  const dashedPaths = await scene.locator('[data-scene-mark="cpu-cost-time"] path').evaluateAll(paths => paths.map(p => p.getAttribute('d')!));
  expect(solidPaths).toHaveLength(32);
  expect(dashedPaths).toHaveLength(32);
  const vertex = (envs: Envs, cpuBound: boolean) => {
    const { x, y } = stagePoint(envs, (cpuBound ? dashed : solid)[envs].seconds);
    return `${x} ${y}`;
  };
  // Every curve vertex the scene names sits on the independently recomputed point.
  for (const envs of ENVS) {
    for (const [paths, cpuBound] of [[solidPaths, false], [dashedPaths, true]] as const) {
      const point = vertex(envs, cpuBound);
      expect(paths.some(d => d.startsWith(`M${point} `) || d.endsWith(` L${point}`)), `${envs} ${cpuBound}`).toBe(true);
    }
  }

  const observations: unknown[] = [];
  async function checkBeat(beat: Beat) {
    const time = solid[beat.envs];
    const point = stagePoint(beat.envs, time.seconds);
    await expect(scene.getByTestId('motion-beat-readout')).toHaveText(`${beat.n} / 4`);
    await expect(scene.getByTestId('motion-caption')).toHaveText(CAPTIONS[beat.n - 1]);
    await expect(scene.getByTestId('motion-readout')).toHaveText(`beat ${beat.n} / 4 ${time.readout}`);
    const marker = scene.locator('[data-scene-mark="selected-environment-count"]');
    await expect(marker).toHaveAttribute('cx', String(point.x));
    await expect(marker).toHaveAttribute('cy', String(point.y));
    await expect(marker).toHaveAttribute('opacity', '1');
    const dots = await scene.locator('[data-robot-dots]').getAttribute('d');
    expect(dots?.match(/M/g)).toHaveLength(Math.max(1, beat.envs / 64));
    await expect(scene.locator('[data-scene-mark="cpu-cost-time"]')).toHaveAttribute('opacity', beat.dashed ? '1' : '0');
    const annotation = scene.locator('g[data-figure-annotation]');
    await expect(annotation).toHaveAttribute('opacity', beat.n === 4 ? '1' : '0');
    await expect(annotation.locator('text')).toHaveText(['16,384 at once:', `about ${solid[16384].words}`]);
    return point;
  }
  async function observe(name: string, beat: Beat, cpuBound: boolean, caseId: string, prestate: string, action: string) {
    const point = await checkBeat(beat);
    const method = await openHowThisWasMade(scene);
    await expect(method).toContainText(METHOD);
    const time = (cpuBound ? dashed : solid)[beat.envs];
    const readouts = cpuBound
      ? [{ selector: '[data-motion-scene="batch-scale"] [data-figure-fold="method"]', text: time.words }]
      : [{ selector: '[data-motion-scene="batch-scale"] [data-testid="motion-readout"]', text: time.readout },
        { selector: '[data-motion-scene="batch-scale"] [data-figure-fold="method"]', text: time.method }];
    expect(readouts.map(r => r.text)).toEqual(time.display);
    await scene.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
    const observed = await capture(page, name);
    const curve = cpuBound
      ? `dashed curve ${beat.dashed ? 'shown' : 'hidden'} with its ${time.robots}-robot vertex at (${vertex(beat.envs, true)}); How this was made reads the dashed time ${time.words}`
      : `How this was made reads "${time.method}"; dashed curve ${beat.dashed ? 'shown' : 'hidden'}`;
    observations.push({
      name, input: { envs: beat.envs, cpuBound }, mountId: MOUNT, caseId, prestate, action,
      poststate: `beat ${beat.n} / 4 ${beat.id}: "${solid[beat.envs].readout}"; ${curve}; marker at (${point.x}, ${point.y}); `
        + `${Math.max(1, beat.envs / 64)} robot dots${beat.n === 4 ? `; annotation about ${solid[16384].words}` : ''}; exact 32-segment solid and dashed paths checked`,
      readouts, ...observed,
    });
  }

  await observe('default', BEATS[3], false, 'default', 'Article not loaded', 'Navigate to the article at 1440 px and open How this was made');
  // A click before hydration reaches no handler, so wait until React owns the poster.
  await page.waitForFunction(() => {
    const poster = document.querySelector('[data-motion-scene="batch-scale"] [data-testid="motion-poster"]');
    return poster !== null && Object.keys(poster).some(key => key.startsWith('__reactProps'));
  });
  const adjust = await openAdjustMore(scene);
  await adjust.getByRole('button', { name: 'Step back one beat' }).click();
  // The poster's step activates the player one beat back, paused, with Adjust more open.
  await expect(scene.getByTestId('motion-poster')).toHaveCount(0);
  await expect(scene.getByTestId('motion-step-back')).toBeVisible();
  await expect(scene.getByTestId('motion-play')).toHaveText('Play');
  await observe('cpu', BEATS[2], true, 'step-each-beat', 'Poster at beat 4 / 4 recap, 16,384 robots', 'Open Adjust more and step back one beat');
  const back = scene.getByTestId('motion-step-back');
  const forward = scene.getByTestId('motion-step-forward');
  await back.click();
  await observe('scale', BEATS[1], false, 'step-each-beat', 'Beat 3 / 4 cpu, 4,096 robots', 'Step back one beat');
  await back.click();
  await observe('one-batch', BEATS[0], false, 'step-each-beat', 'Beat 2 / 4 scale, 4,096 robots', 'Step back one beat');
  await back.focus();
  await page.keyboard.press('Home');
  await expect(scene.getByTestId('motion-beat-readout')).toHaveText('1 / 4');
  await expect(scene.locator('[data-scene-mark="selected-environment-count"]')).toHaveAttribute('opacity', '0');
  await page.keyboard.press('ArrowRight');
  await observe('one-batch-keyboard', BEATS[0], true, 'step-each-beat', 'Beat 1 / 4 one-batch, 64 robots',
    'Press Home, then ArrowRight: the keyboard steps from the start to the first beat end');
  for (let i = 0; i < 3; i++) await forward.click();
  await observe('recap', BEATS[3], true, 'step-each-beat', 'Beat 1 / 4 one-batch, 64 robots', 'Step forward three beats');
  await back.click();
  await checkBeat(BEATS[2]);
  await scene.getByRole('button', { name: 'Reset the scene to its poster still' }).click();
  await observe('reset', BEATS[3], false, 'reset', 'Beat 3 / 4 cpu, stepped back one beat from the recap', 'Activate Reset');
  const desktopAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(desktopAxe.violations).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await observe('mobile-default', BEATS[3], false, 'default', 'Desktop reset state', 'Resize the mounted scene to 375 px');
  const mobileAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(mobileAxe.violations).toEqual([]);
  expect(observations).toHaveLength(8);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  if (producing) save('browser-run.json', {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 PARALLEL_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/parallel-local-evidence.spec.ts --workers=1 --retries=0 --reporter=line --output=audit/evidence/parallel-local-20261009/playwright',
    runner: 'playwright', cwd: runCwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
    dependencies: dependencies(true), observations,
    pageErrors: errors, externalRequests: external,
    desktopAxeViolations: desktopAxe.violations, mobileAxeViolations: mobileAxe.violations,
  });
});
