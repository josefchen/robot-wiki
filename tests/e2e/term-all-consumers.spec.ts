import { test, expect, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTerm } from '../../data/glossary';
import { termConsumerInventory } from './helpers/term-consumer-inventory';

const inventory = termConsumerInventory();
const widths = [375, 1440];
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const settle = (page: Page) => page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

if (process.env.TERM_CONSUMER_OUT) {
  const path = join(process.env.TERM_CONSUMER_OUT, 'consumer-population.json');
  writeFileSync(path, JSON.stringify({ articles: inventory,
    expected: inventory.flatMap(a => widths.flatMap(width => a.occurrences.flatMap(o =>
      ['hover', 'keyboard-focus'].map(state => ({
        identity: `${a.route}#${o.termId}@${o.occurrence}:${width}:${state}`,
        route: a.route, width, state, ...o, status: 'unrun',
      }))))), expectedRouteViewportCases: inventory.length * widths.length,
  }, null, 2) + '\n');
}

async function measure(tip: Locator) {
  return tip.evaluate(e => {
    const box = e.getBoundingClientRect();
    const headers = [...document.querySelectorAll('header')].filter(h => {
      const s = getComputedStyle(h), b = h.getBoundingClientRect();
      return ['sticky', 'fixed'].includes(s.position) && s.visibility !== 'hidden' &&
        b.width > 0 && b.height > 0 && b.top <= (parseFloat(s.top) || 0) &&
        b.right > box.left && b.left < box.right;
    });
    const definition = e.lastElementChild!;
    const range = document.createRange();
    range.selectNodeContents(definition);
    const rects = [...range.getClientRects()];
    const last = rects.at(-1);
    return { x: box.x, y: box.y, width: box.width, height: box.height,
      headerBottom: Math.max(0, ...headers.map(h => h.getBoundingClientRect().bottom)),
      viewport: { width: innerWidth, height: innerHeight },
      clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, scrollTop: e.scrollTop,
      tabIndex: (e as HTMLElement).tabIndex, overflowY: getComputedStyle(e).overflowY,
      definitionLastRect: last ? { top: last.top, bottom: last.bottom, left: last.left, right: last.right } : null,
      documentWidth: document.documentElement.scrollWidth };
  });
}

function checkBounds(m: Awaited<ReturnType<typeof measure>>) {
  expect(m.width).toBeGreaterThan(0);
  expect(m.height).toBeGreaterThan(0);
  expect(m.x).toBeGreaterThanOrEqual(0);
  expect(m.x + m.width).toBeLessThanOrEqual(m.viewport.width);
  expect(m.y).toBeGreaterThanOrEqual(m.headerBottom);
  expect(m.y + m.height).toBeLessThanOrEqual(m.viewport.height);
  expect(m.documentWidth).toBeLessThanOrEqual(m.viewport.width);
}

// One fresh Playwright context and one navigation for every route/viewport.
// This is a Term-only sweep, not a full route/visual/accessibility corpus.
for (const article of inventory) for (const width of widths) {
  test(`Term consumers ${article.route} at ${width}px`, async ({ context, page }, info) => {
    const out = process.env.TERM_CONSUMER_OUT ?? info.outputDir;
    const run = process.env.TERM_CONSUMER_RUN ?? 'term-consumers';
    mkdirSync(out, { recursive: true });
    const key = article.route.replaceAll('/', '-').replace(/^-|-$/g, '') + '-' + width;
    const inputPath = process.env.TERM_CONSUMER_OUT ? join(out, `${run}.inputs.json`) : undefined;
    const events: { kind: string; url?: string; message?: string; at: string }[] = [];
    const results = article.occurrences.flatMap(o => ['hover', 'keyboard-focus'].map(state => ({
      identity: `${article.route}#${o.termId}@${o.occurrence}:${width}:${state}`,
      ...o, state, status: 'unrun', measurements: [] as unknown[], error: '',
      captures: [] as { path: string; sha256: string; at: string; state: string }[],
    })));
    const meta: Record<string, unknown> = { at: new Date().toISOString(), article, width,
      viewport: { width, height: width === 375 ? 812 : 900 }, inputPath,
      inputHash: inputPath ? hash(inputPath) : undefined, results, events,
      navigationStatus: 'unrun', domStatus: 'unrun', notFullReferenceComparison: true };
    const save = () => writeFileSync(join(out, `${run}-${key}.json`), JSON.stringify(meta, null, 2) + '\n');
    save();
    page.on('pageerror', e => events.push({ kind: 'pageerror', message: String(e), at: new Date().toISOString() }));
    page.on('console', e => { if (e.type() === 'error') events.push({ kind: 'console-error', message: e.text(), at: new Date().toISOString() }); });
    await context.route('**/*', route => {
      const url = route.request().url(), host = new URL(url).hostname;
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
        events.push({ kind: 'blocked-browser-request', url, at: new Date().toISOString() });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await context.routeWebSocket(/.*/, ws => {
      if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(ws.url()).hostname)) ws.connectToServer();
      else {
        events.push({ kind: 'blocked-browser-websocket', url: ws.url(), at: new Date().toISOString() });
        ws.close();
      }
    });
    await context.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      if (document.documentElement) document.documentElement.appendChild(style);
      else {
        const observer = new MutationObserver(() => {
          if (document.documentElement) { document.documentElement.appendChild(style); observer.disconnect(); }
        });
        observer.observe(document, { childList: true });
      }
    });
    try {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      const response = await page.goto(article.route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      meta.navigationStatus = 'passed';
      await page.evaluate(() => document.fonts.ready);
      meta.fonts = await page.evaluate(() => [...document.fonts].map(f => ({
        family: f.family, status: f.status, weight: f.weight, style: f.style,
      })));
      meta.computedRoles = await page.evaluate(() => Object.fromEntries(
        ['h1', 'article p', '.term-link', '[role="tooltip"]', 'nav'].map(selector => {
          const e = document.querySelector(selector);
          if (!e) return [selector, null];
          const s = getComputedStyle(e);
          return [selector, { family: s.fontFamily, size: s.fontSize, lineHeight: s.lineHeight }];
        })));
      const actual = await page.locator('[data-term-id]').evaluateAll(nodes =>
        nodes.map(e => e.getAttribute('data-term-id')));
      meta.domTermIds = actual;
      expect(article.unresolved).toEqual([]);
      expect(actual).toEqual(article.occurrences.map(o => o.termId));
      const ids = await page.locator('[data-term-id] [role="tooltip"]').evaluateAll(nodes => nodes.map(e => e.id));
      expect(new Set(ids).size).toBe(ids.length);
      meta.domStatus = 'passed';
      for (const result of results) {
        const root = page.locator(`[data-term-id="${result.termId}"]`).nth(result.occurrence - 1);
        const link = root.getByRole('link'), tip = root.getByRole('tooltip');
        try {
          await page.mouse.move(width - 1, 1);
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
          // Same ordinary centered reading position for both inputs; never
          // relocate a failing trigger or retry it at a more favorable edge.
          await link.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await settle(page);
          if (result.state === 'hover') await link.hover();
          else {
            // Place the focus starting point, then use a real Shift+Tab/Tab
            // transition; focus() alone is not claimed as keyboard input.
            await link.focus();
            await page.keyboard.press('Shift+Tab');
            await page.keyboard.press('Tab');
            const intermediate = await page.evaluate(() => {
              const e = document.activeElement as HTMLElement | null;
              return { role: e?.getAttribute('role'), id: e?.id,
                termId: e?.closest('[data-term-id]')?.getAttribute('data-term-id'),
                tabIndex: e?.tabIndex, clientHeight: e?.clientHeight, scrollHeight: e?.scrollHeight };
            });
            // Revealing the PRECEDING Term can legitimately insert its
            // scrollable definition in the tab order. Traverse that exact
            // extra stop; never skip an unrelated control or refocus the
            // target programmatically to turn a real failure green.
            if (intermediate.role === 'tooltip') {
              expect(intermediate.termId).toBeTruthy();
              expect(intermediate.termId).not.toBe(result.termId);
              expect(intermediate.tabIndex).toBe(0);
              expect(intermediate.scrollHeight!).toBeGreaterThan(intermediate.clientHeight!);
              result.measurements.push({ at: new Date().toISOString(),
                state: 'preceding-scrollable-definition-tab-stop', ...intermediate });
              await page.keyboard.press('Tab');
            }
            await expect(link).toBeFocused();
          }
          await settle(page);
          await expect(tip).toBeVisible();
          // Next Link applies the frozen trailingSlash: true route policy.
          expect(await link.getAttribute('href')).toBe(`/glossary/#${result.termId}`);
          expect(await link.getAttribute('aria-describedby')).toBe(await tip.getAttribute('id'));
          const canonical = getTerm(result.termId)!;
          expect(await tip.locator(':scope > span').first().textContent()).toBe(canonical.term);
          expect(await tip.locator(':scope > span').last().textContent()).toBe(canonical.definition);
          const m = await measure(tip);
          result.measurements.push({ at: new Date().toISOString(), state: result.state, ...m,
            trigger: await link.boundingBox(), definition: canonical.definition });
          checkBounds(m);
          if (m.scrollHeight > m.clientHeight + 1) {
            expect(m.overflowY).toBe('auto');
            expect(m.tabIndex).toBe(0);
            // Independent pointer/keyboard reachability from the beginning,
            // not a keyboard pass inherited from the preceding wheel input.
            await tip.evaluate(e => { e.scrollTop = 0; });
            expect(await tip.evaluate(e => e.scrollTop)).toBe(0);
            if (result.state === 'hover') {
              const box = await tip.boundingBox();
              await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
              await page.mouse.wheel(0, m.scrollHeight);
            } else {
              await page.keyboard.press('Tab');
              await expect(tip).toBeFocused();
              await page.keyboard.press('End');
            }
            await expect.poll(() => tip.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 1)).toBe(true);
            await settle(page);
            const end = await measure(tip);
            result.measurements.push({ at: new Date().toISOString(), state: 'definition-end', ...end });
            checkBounds(end);
            expect(end.definitionLastRect?.bottom).toBeLessThanOrEqual(end.y + end.height);
            expect(end.definitionLastRect?.top).toBeGreaterThanOrEqual(end.y);
          }
          result.status = 'passed';
          // Legible witnesses for newly covered consumers only; these are
          // not hundreds of full-reference comparisons.
          if (result.ordinal === 1 && ['/adjacent/autonomous-vehicles/', '/classical/control/', '/manipulation/action-chunking/'].includes(article.route)) {
            const path = join(out, `${run}-${key}-${result.ordinal}-${result.state}.png`);
            await page.screenshot({ path, animations: 'disabled' });
            result.captures.push({ path, sha256: hash(path), at: new Date().toISOString(), state: result.state });
          }
        } catch (error) {
          result.status = 'failed';
          result.error = String(error);
          if (await tip.count()) result.measurements.push({ failure: await measure(tip).catch(() => null) });
          const path = join(out, `${run}-${key}-${result.ordinal}-${result.state}-failed.png`);
          await page.screenshot({ path, animations: 'disabled' });
          result.captures.push({ path, sha256: hash(path), at: new Date().toISOString(), state: result.state });
        }
        save();
      }
      meta.navigationStatus = 'passed';
      expect(results.filter(r => r.status !== 'passed'), 'Every raw trigger/input identity must pass').toEqual([]);
      expect(events).toEqual([]);
    } catch (error) {
      meta.error = String(error);
      throw error;
    } finally {
      meta.end = new Date().toISOString();
      save();
    }
  });
}
