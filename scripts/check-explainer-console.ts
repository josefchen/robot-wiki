/**
 * The explainer console sweep (VAL-OPUS-046).
 *
 *   node scripts/check-explainer-console.ts [--out out | --base-url URL] [--modes webgl,no-webgl,reduced-motion]
 *     [--log file.json]
 *
 * At 1280 x 800 and at 390 x 844 with touch, it opens each explainer in curriculum order from the
 * contents rail, steps forward through every step (answering the guess) and back, opens the
 * self-check answer, and moves on; then it loads each `#<id>` directly. It repeats the run with WebGL
 * unavailable and under reduced motion (pressing Start). It counts console errors and warnings,
 * uncaught exceptions, failed requests and the peak number of live WebGL contexts, and exits non-zero
 * on any error, warning, exception or failed request, or on a second live context.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium, type Page, type Request } from 'playwright';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';
import { serveExport } from '../lib/visual-capture.ts';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../playwright.config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const only = option('--modes', '').split(',').filter(Boolean);
const MODES = ([
  { mode: 'webgl', webgl: true, reduce: false },
  { mode: 'no-webgl', webgl: false, reduce: false },
  { mode: 'reduced-motion', webgl: true, reduce: true },
] as const).filter(({ mode }) => !only.length || only.includes(mode));
const WIDTHS = [{ width: 1280, height: 800, touch: false }, { width: 390, height: 844, touch: true }] as const;

type Hook = { id: string; ready: boolean; live: boolean; busy: boolean; moving: boolean; steps: number };
type Run = { mode: string; width: number; errors: string[]; warnings: string[]; exceptions: string[]; failed: string[]; peakContexts: number;
  pending: Promise<void>[] };

// Counts live WebGL contexts in the page; with `noWebGL` every request for one fails.
function contextCounter(noWebGL: boolean) {
  const w = window as unknown as { __live: number; __peak: number };
  w.__live = 0; w.__peak = 0;
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    if (/webgl/.test(kind)) {
      if (noWebGL) return null;
      const gl = (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
      if (gl && !(this as unknown as { __counted?: boolean }).__counted) {
        (this as unknown as { __counted?: boolean }).__counted = true;
        w.__live += 1; w.__peak = Math.max(w.__peak, w.__live);
        this.addEventListener('webglcontextlost', () => { w.__live -= 1; });
      }
      return gl;
    }
    return (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
  } as typeof original;
}

// Chromium reports a HEAD fetch as aborted once the page has read its status, although a HEAD
// response has no body to lose. The router's export-mode prefetch probes each linked route that way.
async function failedRequest(request: Request): Promise<string | null> {
  const error = request.failure()?.errorText ?? '';
  if (request.method() === 'HEAD' && error === 'net::ERR_ABORTED') {
    const status = (await request.response().catch(() => null))?.status();
    if (status !== undefined && status < 400) return null;
  }
  return `${request.method()} ${request.url()} ${error}`;
}

function listen(page: Page, run: Run, origin: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') run.errors.push(msg.text());
    if (msg.type() === 'warning') run.warnings.push(msg.text());
  });
  page.on('pageerror', (error) => run.exceptions.push(error.message));
  page.on('requestfailed', (request) => {
    run.pending.push(failedRequest(request).then((failure) => { if (failure) run.failed.push(failure); }));
  });
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) run.failed.push(`${response.url()} ${response.status()}`);
  });
}

async function settle(page: Page, id: string, webgl: boolean) {
  await page.waitForFunction(([want, wantLive]) => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    const predict = document.querySelector<HTMLElement>('[data-predict]');
    return Boolean(h?.id === want && h.ready && (h.live || !wantLive) && (!h.busy || predict?.hidden === false));
  }, [id, webgl] as const, { timeout: 120_000, polling: 100 });
  const guess = page.locator('[data-predict] .opts button:not([disabled])').first();
  if (await guess.isVisible()) await guess.click();
  await page.waitForFunction(() => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    return Boolean(h && !h.busy && !h.moving);
  }, undefined, { timeout: 120_000, polling: 100 });
}

async function walk(page: Page, id: string, webgl: boolean, reduce: boolean) {
  if (reduce && webgl) await page.locator('[data-x="start"]').click();
  await settle(page, id, webgl);
  const steps = await page.evaluate(() => (window as unknown as { __explainer: Hook }).__explainer.steps);
  for (let i = 1; i < steps; i += 1) {
    await page.locator('[data-x="next"]').click();
    await settle(page, id, webgl);
  }
  await page.locator('[data-x="summary"] details.check summary').click();
  for (let i = steps - 1; i > 0; i -= 1) {
    await page.locator('[data-x="prev"]').click();
    await settle(page, id, webgl);
  }
}

const served = option('--base-url', '') ? null : await serveExport(resolve(option('--out', 'out')), 3211);
const base = option('--base-url', '') || served!.base;
const browser = await chromium.launch({ args: [...PLAYWRIGHT_SWIFTSHADER_ARGS] });
const runs: Run[] = [];
try {
  for (const { mode, webgl, reduce } of MODES) {
    for (const { width, height, touch } of WIDTHS) {
      const run: Run = { mode, width, errors: [], warnings: [], exceptions: [], failed: [], peakContexts: 0, pending: [] };
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch,
        reducedMotion: reduce ? 'reduce' : 'no-preference' });
      await context.addInitScript(contextCounter, !webgl);
      const peak = async (page: Page) => {
        run.peakContexts = Math.max(run.peakContexts, await page.evaluate(() => (window as unknown as { __peak: number }).__peak));
      };
      const page = await context.newPage();
      listen(page, run, base);
      await page.goto(`${base}/how-robots-work/#${EXPLAINER_ORDER[0].id}`, { waitUntil: 'load', timeout: 120_000 });
      for (const [i, { id }] of EXPLAINER_ORDER.entries()) {
        if (i > 0) await page.locator(`nav.rail a[data-rail-id="${id}"]`).click();
        await walk(page, id, webgl, reduce);
        console.log(`console: ${mode} ${width} px: #${id} walked`);
      }
      await peak(page);
      await page.close();
      for (const { id } of EXPLAINER_ORDER) {
        const direct = await context.newPage();
        listen(direct, run, base);
        await direct.goto(`${base}/how-robots-work/#${id}`, { waitUntil: 'load', timeout: 120_000 });
        if (reduce && webgl) await direct.locator('[data-x="start"]').click();
        await settle(direct, id, webgl);
        await peak(direct);
        await direct.close();
      }
      await context.close();
      await Promise.all(run.pending);
      runs.push(run);
      console.log(`console: ${mode} ${width} px: ${run.errors.length} errors, ${run.warnings.length} warnings, `
        + `${run.exceptions.length} exceptions, ${run.failed.length} failed requests, peak ${run.peakContexts} live context(s)`);
    }
  }
} finally {
  await browser.close();
  served?.server.close();
}

const log = option('--log', '');
if (log) {
  mkdirSync(dirname(log), { recursive: true });
  writeFileSync(log, `${JSON.stringify({ base, runs }, (key, value) => (key === 'pending' ? undefined : value), 2)}\n`);
}
const bad = runs.filter((r) => r.errors.length || r.warnings.length || r.exceptions.length || r.failed.length || r.peakContexts > 1);
for (const r of bad) console.log(`console: FAIL ${r.mode} ${r.width} px: ${[...r.errors, ...r.warnings, ...r.exceptions, ...r.failed].slice(0, 8).join(' | ')}`);
if (bad.length) process.exit(1);
console.log(`console: ok, ${runs.length} runs with no error, warning, exception or failed request, and at most one live context`);
