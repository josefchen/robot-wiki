import { test, expect, type Locator, type Page } from '@playwright/test';
import { getTerm } from '../../data/glossary';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const settle = (page: Page) => page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function geometry(tip: Locator, page: Page) {
  const measured = await tip.evaluate(e => {
    const r = e.getBoundingClientRect();
    const headers = [...document.querySelectorAll('header')].filter(h => {
      const s = getComputedStyle(h), b = h.getBoundingClientRect();
      return ['sticky', 'fixed'].includes(s.position) && b.width > 0 && b.height > 0 && b.top <= 0;
    });
    return { x: r.x, y: r.y, width: r.width, height: r.height,
      headerBottom: Math.max(0, ...headers.map(h => h.getBoundingClientRect().bottom)),
      clientHeight: e.clientHeight, scrollHeight: e.scrollHeight,
      scrollTop: e.scrollTop, overflowY: getComputedStyle(e).overflowY };
  });
  const viewport = page.viewportSize()!;
  expect(measured.x).toBeGreaterThanOrEqual(0);
  expect(measured.x + measured.width).toBeLessThanOrEqual(viewport.width);
  expect(measured.y).toBeGreaterThanOrEqual(measured.headerBottom);
  expect(measured.y + measured.height).toBeLessThanOrEqual(viewport.height);
  return measured;
}

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ context, page }) => {
  const errors: string[] = []; pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(String(error)));
  await context.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    if (!['localhost', '127.0.0.1'].includes(host)) {
      throw new Error(`Unexpected external browser request: ${route.request().url()}`);
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
    if(document.documentElement)document.documentElement.appendChild(style);else{const observer=new MutationObserver(()=>{if(document.documentElement){document.documentElement.appendChild(style);observer.disconnect();}});observer.observe(document,{childList:true});}
  });
});

test.afterEach(async ({ page }, info) => {
  const out = process.env.RMA_READER_OUT ?? info.outputDir;
  mkdirSync(out, { recursive: true });
  const run = process.env.RMA_READER_RUN ?? 'term';
  const name = info.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const path = join(out, `${run}-${name}-final.png`);
  await page.screenshot({ path, animations: 'disabled' });
  const inputPath = process.env.RMA_READER_OUT ? join(out, `${run}.inputs.json`) : undefined;
  writeFileSync(join(out, `${run}-${name}-final.json`), JSON.stringify({
    at: new Date().toISOString(), route: page.url(), viewport: page.viewportSize(),
    state: 'terminal state after exact test steps', test: info.title,
    path, sha256: sha(path), inputPath, inputHash: inputPath ? sha(inputPath) : undefined,
    pageErrors: pageErrors.get(page),
    prepaintStylePresent: await page.evaluate(() => [...document.querySelectorAll('style')].some(s => s.textContent?.includes('animation:none!important'))),
  }, null, 2) + '\n');
  expect(pageErrors.get(page)).toEqual([]);
});

for (const width of [375, 1440]) {
  test(`PPO centered reveal stays below the header at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/rl-sim2real/reward-design-mpc/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const term = page.locator('[data-term-id="ppo"]').first();
    const link = term.getByRole('link');
    const tip = term.getByRole('tooltip');
    await link.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.mouse.move(width - 1, 1);
    await settle(page);
    await link.hover();
    await expect(tip).toBeVisible();
    const out = process.env.RMA_READER_OUT ?? info.outputDir;
    mkdirSync(out, { recursive: true });
    const run = process.env.RMA_READER_RUN ?? 'term';
    const path = join(out, `${run}-ppo-${width}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    const inputPath = process.env.RMA_READER_OUT ? join(out, `${run}.inputs.json`) : undefined;
    writeFileSync(join(out, `${run}-ppo-${width}.json`), JSON.stringify({
      at: new Date().toISOString(), route: page.url(), viewport: page.viewportSize(),
      state: 'centered-hover', path, sha256: sha(path), inputPath,
      inputHash: inputPath ? sha(inputPath) : undefined,
      tip: await tip.boundingBox(), trigger: await link.boundingBox(),
      definition: await tip.innerText(),
    }, null, 2) + '\n');
    await geometry(tip, page);
    expect(await tip.locator('span').last().innerText()).toBe(getTerm('ppo')!.definition);
    await page.mouse.move(width - 1, 1);
    await link.focus();
    await geometry(tip, page);
  });

  test(`shared short definitions fit at top and bottom edges at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/classical/kinematics/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['forward-kinematics', 'inverse-kinematics']) {
      const term = page.locator(`[data-term-id="${id}"]`).first();
      const link = term.getByRole('link'), tip = term.getByRole('tooltip');
      for (const y of [90, page.viewportSize()!.height - 70]) {
        await page.mouse.move(width - 1, 1);
        await link.evaluate((e, top) => {
          (document.activeElement as HTMLElement)?.blur();
          window.scrollBy({ top: e.getBoundingClientRect().top - top, behavior: 'instant' });
        }, y);
        await link.hover();
        await geometry(tip, page);
        const hover = await tip.innerText();
        await page.mouse.move(width - 1, 1);
        await link.focus();
        await geometry(tip, page);
        expect(await tip.innerText()).toBe(hover);
        expect(await tip.locator('span').last().innerText()).toBe(getTerm(id)!.definition);
      }
    }
  });
}

test('open focused tooltip follows normal scrolling and viewport resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/rl-sim2real/reward-design-mpc/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const term = page.locator('[data-term-id="ppo"]').first(), link = term.getByRole('link');
  const tip = term.getByRole('tooltip');
  await link.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await link.focus();
  await page.mouse.move(1, 1);
  await page.mouse.wheel(0, 120);
  await settle(page);
  await geometry(tip, page);
  await expect(link).toBeFocused();
  await page.setViewportSize({ width: 375, height: 812 });
  await settle(page);
  await geometry(tip, page);
  await expect(link).toBeFocused();
});

test('oversized definition remains complete and scrollable with mouse and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 240 });
  await page.goto('/rl-sim2real/reward-design-mpc/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const term = page.locator('[data-term-id="ppo"]').first(), link = term.getByRole('link');
  const tip = term.getByRole('tooltip');
  await link.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await link.hover();
  const first = await geometry(tip, page);
  expect(first.scrollHeight).toBeGreaterThan(first.clientHeight);
  expect(first.overflowY).toBe('auto');
  const b = await tip.boundingBox();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => tip.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await page.mouse.move(374, 1);
  await link.focus();
  await page.keyboard.press('Tab');
  await expect(tip).toBeFocused();
  await page.keyboard.press('End');
  await settle(page);
  expect(await tip.locator('span').last().textContent()).toBe(getTerm('ppo')!.definition);
  await expect.poll(() => tip.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 1)).toBe(true);
  await geometry(tip, page);
  await page.keyboard.press('Tab');
  await expect(tip).toBeHidden();
});
