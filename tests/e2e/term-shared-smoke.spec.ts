import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The article member of the five-route smoke set is exercised by the
// Term consumer sweep. These four routes do not mount the repaired primitive.
for (const route of ['/', '/market-map/', '/playground/', '/search/']) {
  for (const width of [375, 1440]) {
    test(`Term shared smoke ${route} at ${width}px`, async ({ context, page }, info) => {
      const out = process.env.TERM_CONSUMER_OUT ?? info.outputDir;
      const run = process.env.TERM_CONSUMER_RUN ?? 'term-smoke';
      mkdirSync(out, { recursive: true });
      const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
      const key = (route === '/' ? 'home' : route.replaceAll('/', '')) + '-' + width;
      const inputPath = process.env.TERM_CONSUMER_OUT ? join(out, `${run}.inputs.json`) : undefined;
      const events: { kind: string; value: string; at: string }[] = [];
      const proof: Record<string, unknown> = { route, width, at: new Date().toISOString(),
        inputPath, inputHash: inputPath ? hash(inputPath) : undefined,
        status: 'unrun', events, fullReferenceComparison: false,
        scope: 'Default shell, no Term mounts, viewport, keyboard skip and mobile drawer; not full route or WebGL acceptance' };
      page.on('pageerror', e => events.push({ kind: 'pageerror', value: String(e), at: new Date().toISOString() }));
      page.on('console', e => { if (e.type() === 'error') events.push({ kind: 'console-error', value: e.text(), at: new Date().toISOString() }); });
      await context.route('**/*', request => {
        const url = request.request().url();
        if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) return request.continue();
        events.push({ kind: 'blocked-browser-request', value: url, at: new Date().toISOString() });
        return request.abort('blockedbyclient');
      });
      await context.routeWebSocket(/.*/, ws => {
        if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(ws.url()).hostname)) ws.connectToServer();
        else {
          events.push({ kind: 'blocked-browser-websocket', value: ws.url(), at: new Date().toISOString() });
          ws.close();
        }
      });
      await context.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
        const append = () => { if (!document.documentElement) return false; document.documentElement.appendChild(style); return true; };
        if (!append()) {
          const observer = new MutationObserver(() => { if (append()) observer.disconnect(); });
          observer.observe(document, { childList: true });
        }
      });
      try {
        await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
        const response = await page.goto(route, { waitUntil: 'networkidle' });
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.getByRole('main')).toHaveCount(1);
        await expect(page.locator('[data-term-id]')).toHaveCount(0);
        const measurement = await page.evaluate(() => ({
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          title: document.querySelector('h1')?.textContent,
          h1Font: getComputedStyle(document.querySelector('h1')!).fontFamily,
          fonts: [...document.fonts].map(f => ({ family: f.family, status: f.status })),
        }));
        proof.measurement = measurement;
        expect(measurement.documentWidth).toBeLessThanOrEqual(width);
        await page.keyboard.press('Tab');
        const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
        await expect(skip).toBeFocused();
        await expect(skip).toBeVisible();
        proof.skipBox = await skip.boundingBox();
        await page.keyboard.press('Enter');
        if (width === 375) {
          const open = page.getByRole('button', { name: 'Open navigation menu', exact: true });
          await open.click();
          const close = page.getByRole('button', { name: 'Close navigation menu', exact: true });
          await expect(close).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(open).toBeFocused();
          proof.drawer = 'opened, close focused, Escape restored trigger';
        }
        const axe = await new AxeBuilder({ page }).analyze();
        proof.axe = axe;
        proof.axeIncompletesNotAcceptance = axe.incomplete.length > 0;
        expect(axe.violations).toEqual([]);
        expect(events).toEqual([]);
        proof.status = 'passed';
      } catch (error) {
        proof.status = 'failed';
        proof.error = String(error);
        throw error;
      } finally {
        const path = join(out, `${run}-${key}.png`);
        await page.screenshot({ path, animations: 'disabled' });
        proof.capture = { path, sha256: hash(path), at: new Date().toISOString(),
          viewport: page.viewportSize(), url: page.url() };
        proof.end = new Date().toISOString();
        writeFileSync(join(out, `${run}-${key}.json`), JSON.stringify(proof, null, 2) + '\n');
      }
    });
  }
}
