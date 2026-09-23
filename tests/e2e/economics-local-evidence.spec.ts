import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { DIRECTORY, ROUTE, BROWSER, artifact, dependencies, defaults, ranges, oracle, save } from '../../audit/evidence/economics-local-20260923/support';
import { setSlider } from './slider';

const producing = process.env.ECONOMICS_WRITE_BROWSER === '1';
async function capture(page: Page, name: string) {
  const viewport = page.viewportSize()!;
  if (!producing) return { viewport, dom: null, capture: null };
  const domPath = `${DIRECTORY}/captures/${name}.dom.json`;
  const pngPath = `${DIRECTORY}/captures/${name}.png`;
  const dom = await page.evaluate(() => ({ text: document.body.innerText, html: document.querySelector('#main-content')!.outerHTML }));
  writeFileSync(domPath, JSON.stringify(dom, null, 2) + '\n', { flag: 'wx' });
  await page.screenshot({ path: pngPath, animations: 'disabled' });
  return { viewport, dom: artifact(domPath), capture: artifact(pngPath) };
}

test('industrial52 actual default robot-cost endpoints and reset', async ({ page }) => {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    external.push(url.toString());
    return route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  expect((await page.goto(ROUTE))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const mount = page.locator('div.prose > div.rounded-md:has([data-testid="payback-months"])');
  await expect(mount).toHaveCount(1);
  const slider = mount.getByRole('slider', { name: /robot cost/i });
  const controls = [/robot cost/i, /integration multiple/i, /cycle time/i, /uptime/i, /per-pick success/i, /jam-clearing time/i, /displaced wage/i];
  const observations: unknown[] = [];
  async function observe(name: string, robotCost: number, caseId: string, prestate: string, action: string) {
    const input = { ...defaults, robotCost };
    const o = oracle(input);
    for (const [i, key] of (Object.keys(defaults) as (keyof typeof defaults)[]).entries()) {
      const control = mount.getByRole('slider', { name: controls[i] });
      await expect(control).toHaveValue(String(input[key]));
      for (const attribute of ['min', 'max', 'step'] as const) await expect(control).toHaveAttribute(attribute, String(ranges[key][attribute]));
    }
    await expect(slider.locator('xpath=following-sibling::p')).toContainText('not a sourced arm-price quote');
    await expect(mount).not.toContainText('$25k-$80k');
    const readouts = [];
    for (const [i, id] of ['cost-per-pick', 'payback-months'].entries()) {
      await expect(mount.getByTestId(id)).toHaveText(o.display[i]);
      readouts.push({ selector: `[data-testid="${id}"]`, text: (await mount.getByTestId(id).innerText()).trim() });
    }
    await expect(mount.getByTestId('payback-verdict')).toHaveText(o.paysBack ? 'Pays back inside 24 months' : 'Outside a 24-month horizon');
    await expect(mount).toContainText(o.summary);
    const bar = mount.getByTestId('time-breakdown');
    await expect(bar).toHaveAttribute('aria-label', `Time breakdown per elapsed hour: ${o.shares[0]} productive cycles, ${o.shares[1]} jam clearing, ${o.shares[2]} downtime`);
    for (const [i, title] of ['Productive cycles', 'Jam clearing', 'Downtime'].entries()) expect(await bar.locator(`[title="${title}"]`).evaluate(e => Number.parseFloat((e as HTMLElement).style.width))).toBe(Number.parseFloat(o.shares[i]));
    for (const [id, key, label] of [
      ['breakdown-productive', 'productive', 'productive'],
      ['breakdown-jams', 'jamClearing', 'jam clearing'],
      ['breakdown-downtime', 'downtime', 'downtime'],
    ] as const) await expect(mount.getByTestId(id)).toHaveText(`${label} ${o.timeBreakdown[key].toFixed(0)} s`);
    await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('not a sourced arm-price quote');
    await expect(page.locator('p').filter({ hasText: 'The calculator above reports capital cost per modeled pick' })).toContainText('It does not include running costs.');
    await mount.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
    observations.push({ name, input, mountId: 'mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1',
      caseId, prestate, action, poststate: `${o.summary} ${o.display.join('; ')}; all seven inputs, notes, verdict, time shares and seconds checked`,
      readouts, ...await capture(page, name) });
  }
  await observe('default', 80000, 'default', 'Article not loaded', 'Navigate to existing article');
  await setSlider(slider, 20000);
  await observe('min', 20000, 'slider-boundaries-and-anchors', 'Default robotCost80000', 'Move robotCost to minimum20000');
  await setSlider(slider, 250000);
  await observe('max', 250000, 'slider-boundaries-and-anchors', 'Minimum robotCost20000', 'Move robotCost to maximum250000');
  await mount.getByRole('button', { name: 'Reset', exact: true }).click();
  await observe('reset', 80000, 'reset', 'Maximum robotCost250000', 'Activate Reset');
  const desktopAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(desktopAxe.violations).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await observe('mobile-default', 80000, 'default', 'Desktop reset state', 'Resize existing mounted calculator to375px');
  const mobileAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(mobileAxe.violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  if (producing) save('browser-run.json', {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 ECONOMICS_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/economics-local-evidence.spec.ts --workers=1 --retries=0 --reporter=line --output=audit/evidence/economics-local-20260923/playwright-final',
    runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
    dependencies: dependencies(true), observations, pageErrors: errors, externalRequests: external,
    desktopAxeViolations: desktopAxe.violations, mobileAxeViolations: mobileAxe.violations,
  });
});
