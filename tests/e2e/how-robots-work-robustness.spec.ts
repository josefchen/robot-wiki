import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { EXPLAINER_WORDS } from '../../components/explainers/words';
import { forEachInOwnContext } from './helpers/per-route-context';

const ROUTE = '/how-robots-work/';
type Hook = {
  ready: boolean; live: boolean; busy: boolean; moving: boolean; frames: number; steps: number;
  go: (i: number) => Promise<void>; parts: { name: string; explode: number }[] | null;
  stage: { camera: { position: { x: number; y: number; z: number } }; controls: { target: { x: number; y: number; z: number } } } | null;
};
const hook = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as { __explainer: Hook }).__explainer;
  return { ready: h.ready, live: h.live, frames: h.frames, steps: h.steps, parts: h.parts };
});

// Counts the WebGL contexts the page asks for; `block` makes every request fail, as without WebGL.
async function countContexts(page: Page, block = false) {
  await page.addInitScript((noWebGL) => {
    const made: unknown[] = [];
    (window as unknown as { __contexts: unknown[] }).__contexts = made;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (/webgl/.test(kind)) {
        if (noWebGL) return null;
        made.push(kind);
      }
      return (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof original;
  }, block);
}
const contexts = (page: Page) => page.evaluate(() => (window as unknown as { __contexts: unknown[] }).__contexts.length);
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}
// Waits for the step to settle, answering its guess first if it asks for one. A stage moves only while
// it is on screen, and answering can scroll it away on a phone, so it is brought back into view.
async function settled(page: Page) {
  const stage = page.locator('[data-x="stage"]');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    const predict = document.querySelector<HTMLElement>('[data-predict]');
    return Boolean(h?.ready && h.live && (!h.busy || predict?.hidden === false));
  }, undefined, { timeout: 45_000 });
  const guess = page.locator('[data-predict] .opts button:not([disabled])').first();
  if (await guess.isVisible()) {
    await guess.click();
    await stage.scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => {
    const h = (window as unknown as { __explainer?: Hook }).__explainer;
    return Boolean(h && !h.busy && !h.moving);
  }, undefined, { timeout: 45_000 });
}

test.describe('how robots work: robustness', () => {
  test('one WebGL context serves every explainer, and an idle stage stops drawing', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    await countContexts(page);
    await page.goto(`${ROUTE}#arm`);
    await settled(page);
    await page.waitForTimeout(1500);
    const before = (await hook(page)).frames;
    expect(before).toBeGreaterThan(0);
    await page.waitForTimeout(1000);
    expect((await hook(page)).frames, 'no frames drawn while nothing changes').toBe(before);
    for (const { id } of EXPLAINER_ORDER.slice(1, 5)) {
      await page.evaluate((to) => { location.hash = to; }, id);
      await settled(page);
      await expect(page.locator(`[data-rail-id="${id}"]`)).toHaveAttribute('data-current', '');
    }
    expect(await contexts(page)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('a stage scrolled off screen stops drawing, even mid-move', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 360 });
    await page.goto(`${ROUTE}#arm`);
    await settled(page);
    await page.evaluate(() => { void (window as unknown as { __explainer: Hook }).__explainer.go(1); });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => document.querySelector('[data-x="stage"]')!.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.waitForTimeout(300);
    const away = (await hook(page)).frames;
    await page.waitForTimeout(1000);
    expect((await hook(page)).frames, 'no frames drawn off screen').toBe(away);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await hook(page)).frames).toBeGreaterThan(away);
  });

  test('without WebGL the poster and the steps as text stand in', async ({ page }) => {
    const errors = collectErrors(page);
    await countContexts(page, true);
    await page.goto(`${ROUTE}#arm`);
    await page.waitForFunction(() => (window as unknown as { __explainer?: Hook }).__explainer?.ready === true);
    await expect(page.locator('[data-x="poster"]')).toBeVisible();
    await expect(page.locator('[data-x="poster"]')).toHaveAttribute('src', '/explainers/posters/arm.webp');
    await expect(page.locator('[data-x="status"]')).toContainText('cannot show 3D');
    await expect(page.locator('[data-x="stage"] canvas')).toHaveCount(0);
    await expect(page.locator('[data-x="stepText"]')).toHaveText(EXPLAINER_WORDS.arm.steps[0]);
    await page.locator('[data-x="next"]').click();
    await expect(page.locator('[data-x="stepText"]')).toHaveText(EXPLAINER_WORDS.arm.steps[1]);
    expect(errors).toEqual([]);
  });

  test('under reduced motion the poster stays until the reader presses Start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await countContexts(page);
    await page.goto(`${ROUTE}#grip`);
    await page.waitForFunction(() => (window as unknown as { __explainer?: Hook }).__explainer?.ready === true);
    await expect(page.locator('[data-x="poster"]')).toBeVisible();
    expect(await contexts(page), 'no WebGL context before Start').toBe(0);
    await page.locator('[data-x="start"]').click();
    await settled(page);
    await expect(page.locator('[data-x="poster"]')).toBeHidden();
    await expect(page.locator('[data-x="stage"] canvas')).toBeVisible();
    expect(await contexts(page)).toBe(1);
  });

  test('print shows the poster in place of the scene', async ({ page }) => {
    await page.goto(`${ROUTE}#flying`);
    await settled(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-x="poster"]')).toBeVisible();
    await expect(page.locator('[data-x="stage"] canvas')).toBeHidden();
  });

  test('arrow keys turn the scene, + and - zoom, and touch leaves page scrolling alone', async ({ page }) => {
    await page.goto(`${ROUTE}#arm`);
    await settled(page);
    const camera = () => page.evaluate(() => {
      const { stage } = (window as unknown as { __explainer: Hook }).__explainer;
      const p = stage!.camera.position, t = stage!.controls.target;
      return { x: p.x, z: p.z, d: Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) };
    });
    const canvas = page.locator('[data-x="stage"] canvas');
    await expect(canvas).toHaveCSS('touch-action', 'pan-y');
    await canvas.focus();
    const start = await camera();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(400);
    const turned = await camera();
    expect(Math.hypot(turned.x - start.x, turned.z - start.z)).toBeGreaterThan(0.01);
    await page.keyboard.press('+');
    await page.waitForTimeout(400);
    expect((await camera()).d).toBeLessThan(turned.d);
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await page.waitForTimeout(400);
    expect((await camera()).d).toBeGreaterThan(turned.d);
  });

  test('on touch a tap hands one finger to the scene', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${ROUTE}#arm`);
    await settled(page);
    const canvas = page.locator('[data-x="stage"] canvas');
    await expect(page.locator('[data-x="stage"]')).not.toHaveAttribute('data-touch-active', '');
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.9);
    await expect(page.locator('[data-x="stage"]')).toHaveAttribute('data-touch-active', '');
    await expect(canvas).toHaveCSS('touch-action', 'none');
    await context.close();
  });

  test('Tab reaches Back, Next, every control, the guess and the self-check, each with a blue ring', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`${ROUTE}#grip`);
    const reached = new Set<string>();
    const rings = new Set<string>();
    // Tabs from the scene through the explainer column and notes what took the focus and how it showed.
    const tabAround = async () => {
      await page.locator('[data-x="stage"] canvas').focus();
      for (let i = 0; i < 24; i += 1) {
        await page.keyboard.press('Tab');
        const seen = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el?.closest('[data-x="explainer"]')) return null;
          const style = getComputedStyle(el);
          const name = el.closest('details.check') ? 'self-check' : el.dataset.x ?? (el.closest('[data-predict]') ? 'guess'
            : el.closest('.controls') ? 'control' : el.closest('[data-x="dots"]') ? 'dot' : el.tagName.toLowerCase());
          return { name, ring: `${style.outlineStyle} ${style.outlineColor}` };
        });
        if (!seen) break;
        reached.add(seen.name);
        rings.add(seen.ring);
      }
    };
    const steps = await page.evaluate(async () => {
      const h = () => (window as unknown as { __explainer?: Hook }).__explainer;
      for (let t = 0; t < 400 && !(h()?.ready && h()?.live); t += 1) await new Promise((r) => setTimeout(r, 100));
      return h()!.steps;
    });
    for (let i = 0; i < steps; i += 1) {
      if (i > 0) await page.locator('[data-x="next"]').click();
      await page.waitForFunction(() => {
        const h = (window as unknown as { __explainer: Hook }).__explainer;
        return !h.busy || document.querySelector<HTMLElement>('[data-predict]')?.hidden === false;
      });
      await tabAround();
      await settled(page);
      await tabAround();
    }
    for (const name of ['prev', 'next', 'dot', 'control', 'guess', 'self-check']) expect(reached, `Tab reaches ${name}`).toContain(name);
    expect([...rings]).toEqual(['solid rgb(36, 95, 255)']);
  });

  test('each explainer keeps to its code, asset, main-thread and layout budget', async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const w = window as unknown as { __long: { start: number; duration: number }[]; __shift: { start: number; value: number }[] };
      w.__long = []; w.__shift = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__long.push({ start: e.startTime, duration: e.duration });
      }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) w.__shift.push({ start: e.startTime, value: e.value });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const rows: string[] = [];
    const over: string[] = [];
    for (const { id } of EXPLAINER_ORDER) {
      const loads: { url: string; gzip: number; bytes: number; three: boolean }[] = [];
      const onResponse = async (res: import('@playwright/test').Response) => {
        if (res.status() !== 200 || !/\/_next\/static\/chunks\/.+\.js$|\/explainers\//.test(res.url())) return;
        const body = await res.body().catch(() => null);
        // three.js is the shared chunk the budget leaves out; only its renderer carries this message.
        const three = Boolean(body?.includes('THREE.WebGLRenderer: Error creating WebGL'));
        if (body) loads.push({ url: res.url(), gzip: gzipSync(body).length, bytes: body.length, three });
      };
      await page.goto(`${ROUTE}#${id}`);
      await page.waitForFunction(() => (window as unknown as { __explainer?: Hook }).__explainer?.ready === true);
      const initial = new Set(await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean)));
      const stage = page.locator('[data-x="stage"]');
      const before = await stage.boundingBox();
      page.on('response', onResponse);
      const t0 = await page.evaluate(() => performance.now());
      await page.locator('[data-x="start"]').click();
      await settled(page);
      await page.waitForTimeout(500);
      page.off('response', onResponse);
      const { long, shift, ratio } = await page.evaluate((from) => {
        const w = window as unknown as { __long: { start: number; duration: number }[]; __shift: { start: number; value: number }[] };
        const { stage: s } = (window as unknown as { __explainer: { stage: { renderer: { getPixelRatio(): number } } } }).__explainer;
        return {
          long: Math.max(0, ...w.__long.filter((e) => e.start >= from).map((e) => e.duration)),
          shift: w.__shift.filter((e) => e.start >= from).reduce((sum, e) => sum + e.value, 0),
          ratio: s.renderer.getPixelRatio(),
        };
      }, t0);
      const code = loads.filter((l) => l.url.endsWith('.js') && !initial.has(l.url));
      const sceneCode = code.filter((l) => !l.three).reduce((sum, l) => sum + l.gzip, 0);
      const assets = loads.filter((l) => l.url.includes('/explainers/')).reduce((sum, l) => sum + l.bytes, 0);
      const after = await stage.boundingBox();
      rows.push(`${id}: scene code ${(sceneCode / 1024).toFixed(1)} KB gzipped in ${code.length - code.filter((l) => l.three).length} chunks, `
        + `assets ${(assets / 1024).toFixed(0)} KB, longest task ${long.toFixed(0)} ms, layout shift ${shift.toFixed(4)}, pixel ratio ${ratio}`);
      if (sceneCode > 250 * 1024) over.push(`#${id} scene code ${sceneCode} B gzipped`);
      if (assets > 1.5 * 1024 * 1024) over.push(`#${id} assets ${assets} B`);
      if (long > 50) over.push(`#${id} main thread blocked ${long.toFixed(0)} ms while mounting`);
      if (shift > 0 || JSON.stringify(after) !== JSON.stringify(before)) over.push(`#${id} layout shifted by ${shift}`);
      if (ratio > 2) over.push(`#${id} pixel ratio ${ratio}`);
    }
    console.log(rows.join('\n'));
    expect(over).toEqual([]);
  });

  for (const { width, height } of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`axe finds nothing at ${width} px, on the first and last step of every explainer`, async ({ browser }) => {
      test.setTimeout(360_000);
      const found: string[] = [];
      const scan = async (page: Page, id: string, at: string, whole = false) => {
        const builder = whole ? new AxeBuilder({ page }) : new AxeBuilder({ page }).include('[data-x="explainer"]');
        for (const v of (await builder.analyze()).violations) found.push(`#${id} ${at}: ${v.id} on ${v.nodes.length} node(s)`);
      };
      await forEachInOwnContext(browser, EXPLAINER_ORDER.entries(), async (page, [i, { id }]) => {
        await page.goto(`${ROUTE}#${id}`);
        await settled(page);
        await scan(page, id, 'first step', i === 0);
        await page.evaluate(() => {
          const h = (window as unknown as { __explainer: Hook }).__explainer;
          void h.go(h.steps - 1);
        });
        await settled(page);
        await page.locator('[data-x="summary"] details.check summary').click();
        await page.locator('[data-parts] summary').click({ timeout: 1000 }).catch(() => {});
        await scan(page, id, 'last step');
      }, { viewport: { width, height } });
      expect(found).toEqual([]);
    });
  }

  for (const id of ['arm', 'humanoid', 'flying'] as const) {
    test(`#${id} lists its parts, in the page and on the stage`, async ({ page }) => {
      await page.goto(`${ROUTE}#${id}`);
      await settled(page);
      const served = await page.locator(`[data-explainer-text="${id}"] [data-explainer-parts] li`).allTextContents();
      expect(served).toEqual(EXPLAINER_WORDS[id].parts);
      const list = page.locator('[data-parts]');
      for (let i = 0; i < 5 && !(await list.isVisible()); i += 1) {
        await page.locator('[data-x="next"]').click();
        await settled(page);
      }
      await expect(list).toBeVisible();
      await list.locator('summary').click();
      const buttons = list.locator('button.part');
      expect((await buttons.allTextContents()).sort()).toEqual([...served].sort());
      expect(((await hook(page)).parts ?? []).map((p) => p.name).sort()).toEqual([...served].sort());
      await buttons.nth(1).click();
      await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-card]')).toBeVisible();
    });
  }
});
