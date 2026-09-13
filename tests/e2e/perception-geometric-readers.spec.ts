import fs from 'node:fs';
import { expect, test as base, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { DEFAULT_PARAMS, SLIDER_SPECS, TARGET_CLASSES, composeBudget } from '../../lib/perception-error';
import { setSlider } from './slider';

const route = '/classical/perception/';
const manuscript = fs.readFileSync(new URL('../../content/classical/perception.mdx', import.meta.url), 'utf8');
const sourceIds = ["pointnet-plus-plus-2017", "dense-object-nets-2018", "dexnet-2-2017"];
const termIds = ['point-cloud'];
const positions = ['reading', 'upper-edge', 'lower-edge'] as const;
const methods = ['hover', 'keyboard'] as const;

// Every test owns a fresh context/page. No external source is retrieved.
const test = base.extend<{ readerGuard: void }>({
  readerGuard: [async ({ context, page }, runFixture, info) => {
    const errors: string[] = [], denied: string[] = [], navigations: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await context.route('**/*', async request => {
      const url = new URL(request.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        denied.push(url.href);
        return request.abort('blockedbyclient');
      }
      if (request.request().isNavigationRequest() && request.request().frame() === page.mainFrame()) {
        navigations.push(url.href);
        if (navigations.length > 16) return request.abort('blockedbyclient');
      }
      return request.continue();
    });
    await context.addInitScript(() => {
      const style = document.createElement('style');
      // Match the existing offline fixture: exclude only Next's dev toolbar,
      // which is absent from the export and can cover a bottom-left glyph.
      // No article, source panel, navigation or production content is hidden.
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}nextjs-portal{display:none!important}';
      const install = () => {
        if (document.documentElement && !style.isConnected) document.documentElement.append(style);
      };
      install();
      new MutationObserver(install).observe(document, { childList: true, subtree: true });
    });
    try { await runFixture(); } finally {
      await info.attach('reader-lifecycle', {
        body: JSON.stringify({ errors, denied, navigations, budget: 16 }), contentType: 'application/json',
      });
    }
    expect(errors).toEqual([]);
    expect(denied).toEqual([]);
    expect(navigations.length).toBeGreaterThan(0);
    expect(navigations.length).toBeLessThanOrEqual(16);
  }, { auto: true }],
});

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function open(page: Page, info: TestInfo) {
  expect((await page.goto(route))?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const style = getComputedStyle(document.body);
    return Promise.all(['--font-tektur', '--font-plex-sans', '--font-newsreader', '--font-plex-mono'].map(async role => {
      const family = style.getPropertyValue(role).trim().split(',')[0].trim();
      const faces = await document.fonts.load(`16px ${family}`);
      return { role, family, loaded: document.fonts.check(`16px ${family}`),
        faces: faces.map(face => ({ family: face.family, status: face.status })) };
    }));
  });
  expect(fonts.every(role => role.family && role.loaded && role.faces.length &&
    role.faces.every(face => face.status === 'loaded'))).toBe(true);
  await info.attach('loaded-fonts', { body: JSON.stringify(fonts), contentType: 'application/json' });
  await settle(page);
}

async function capture(page: Page, info: TestInfo, name: string) {
  await settle(page);
  await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' });
}

async function captureText(page: Page, info: TestInfo, element: Locator, name: string) {
  const height = await element.evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(0);
  const step = page.viewportSize()!.height - 180;
  for (let offset = 0, slice = 1; offset < height; offset += step, slice++) {
    await element.evaluate((el, y) => window.scrollBy(0, el.getBoundingClientRect().top - 100 + y), offset);
    await capture(page, info, `${name}-${slice}`);
  }
}

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test.describe(`perception geometric readers at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('geometric corrections, preserved Stat, real calculator and drawer remain readable', async ({ page }, info) => {
      await open(page, info);
      const prose = page.locator('div.prose[data-pagefind-body]');
      const checks = [
  {
    "start": "Once you have depth you have a point",
    "parts": [
      "all geometry. Small neighbourhoods can contain too few samples, so its density-adaptive variants combine information across scales"
    ]
  },
  {
    "start": "Dense Object Nets learns a descriptor vector for",
    "parts": [
      "Their class-consistent training mode generalizes across sufficiently similar hats, shoes and mugs, while instance-specific training distinguishes objects"
    ]
  },
  {
    "start": "The paper's 20-minute estimate is for learning a",
    "parts": [
      "mapped into depth geometry for grasp planning; the descriptor does not itself specify the gripper's 6-DoF orientation"
    ]
  },
  {
    "start": "Dex-Net 2.0 instead learns to score candidate parallel-jaw",
    "parts": [
      "camera. Its labels use thresholded robust epsilon quality and collision constraints; physical grasp success is evaluated separately"
    ]
  },
  {
    "start": "The Dex-Net planner samples and ranks antipodal candidates,",
    "parts": [
      "Missing depth on thin parts and collisions remain failure modes; its pile-handling demonstration separates objects before grasping"
    ]
  }
];
      await page.mouse.move(0, 0);
      await capture(page, info, 'article-top');
      const typography = [];
      for (const [i, check] of checks.entries()) {
        const paragraph = prose.locator(':scope > p, :scope > ul > li').filter({
          // Hidden glossary definitions can repeat a paragraph substring;
          // bind its actual opening, never a sibling's hidden tooltip text.
          hasText: new RegExp('^' + check.start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        });
        await expect(paragraph).toHaveCount(1);
        const text = await paragraph.innerText();
        for (const part of check.parts) expect(text).toContain(part);
        const style = await paragraph.evaluate(el => {
          const s = getComputedStyle(el), b = el.getBoundingClientRect();
          return { family: s.fontFamily, size: parseFloat(s.fontSize), lineHeight: parseFloat(s.lineHeight),
            left: b.left, right: b.right, color: s.color, background: s.backgroundColor };
        });
        expect(style.family).toMatch(/Newsreader/i);
        expect(style.size).toBeGreaterThanOrEqual(18);
        expect(style.size).toBeLessThanOrEqual(21);
        expect(style.left).toBeGreaterThanOrEqual(20);
        expect(style.right).toBeLessThanOrEqual(viewport.width - 20);
        typography.push({ paragraph: check.start, ...style });
        await captureText(page, info, paragraph, `corrected-paragraph-${i + 1}`);
      }
      const stat = prose.getByText('SAM; SA-1B: 1.1 billion masks on 11 million images', { exact: true });
      await expect(stat).toBeVisible();
      await captureText(page, info, stat.locator('..'), 'preserved-stat');
      const budget = page.getByTestId('perception-budget');
      const readout = budget.getByTestId('perception-total-readout');
      await expect(readout).toHaveText(`${composeBudget(DEFAULT_PARAMS).totalMm.toFixed(2)} mm`);
      await expect(budget.getByRole('radio')).toHaveCount(TARGET_CLASSES.length);
      await expect(budget.getByRole('slider')).toHaveCount(4);
      for (const target of TARGET_CLASSES) {
        const radio = budget.getByTestId(`perception-target-${target.id}`);
        await radio.focus(); await page.keyboard.press('Space');
        await expect(radio).toBeChecked();
        await expect(readout).toHaveText(`${composeBudget({ ...DEFAULT_PARAMS, target: target.id }).totalMm.toFixed(2)} mm`);
      }
      await budget.getByRole('button', { name: /Reset the error budget/ }).click();
      const sliderStates = [
        { id: 'handeye', spec: SLIDER_SPECS.handEye, value: DEFAULT_PARAMS.handEyeDeg },
        { id: 'distance', spec: SLIDER_SPECS.distance, value: DEFAULT_PARAMS.workingDistanceM },
        { id: 'depth', spec: SLIDER_SPECS.depth, value: DEFAULT_PARAMS.depthPct },
        { id: 'pose', spec: SLIDER_SPECS.pose, value: DEFAULT_PARAMS.poseMm },
      ];
      for (const item of sliderStates) {
        const slider = budget.getByTestId(`perception-${item.id}-slider`);
        for (const value of [item.spec.min, item.value, item.spec.max]) {
          await setSlider(slider, value);
          await expect(slider).toHaveValue(String(value));
        }
      }
      const disclosure = budget.locator('details[data-chart-data]');
      await expect(disclosure).toHaveCount(1);
      await disclosure.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(disclosure).toHaveAttribute('open');
      await expect(disclosure).toContainText(await readout.innerText());
      await captureText(page, info, disclosure, 'calculator-changed-disclosure');
      await budget.getByRole('button', { name: /Reset the error budget/ }).focus();
      await page.keyboard.press('Enter');
      await expect(readout).toHaveText(`${composeBudget(DEFAULT_PARAMS).totalMm.toFixed(2)} mm`);
      for (const item of sliderStates) await expect(budget.getByTestId(`perception-${item.id}-slider`)).toHaveValue(String(item.value));
      await expect(budget.getByTestId('perception-target-opaque')).toBeChecked();
      await captureText(page, info, budget, 'calculator-reset');
      // There are no PredictThenReveal or SelfCheck mounts on this article.
      expect(manuscript).not.toMatch(/<(PredictThenReveal|SelfCheck)\b/);
      await expect(page.locator('[data-predict],[data-self-check]')).toHaveCount(0);
      if (viewport.width === 375) {
        const menu = page.getByRole('button', { name: 'Open navigation menu' });
        await menu.focus(); await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        const close = dialog.getByRole('button', { name: 'Close navigation menu' });
        await expect(close).toBeFocused();
        await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
        await page.keyboard.press('Shift+Tab');
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
        await expect(close).not.toBeFocused();
        await page.keyboard.press('Tab'); await expect(close).toBeFocused();
        await capture(page, info, 'drawer-keyboard');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0); await expect(menu).toBeFocused();
      }
      await info.attach('paragraph-typography', { body: JSON.stringify(typography), contentType: 'application/json' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).analyze();
      await info.attach('axe', { body: JSON.stringify(axe.violations), contentType: 'application/json' });
      expect(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) ).toEqual([]);
    });

    test('every affected and mounted tooltip has hover keyboard and sticky-edge containment', async ({ page }, info) => {
      await open(page, info);
      const groups = [
        ...sourceIds.map(id => ({ id, attr: 'data-cite-id', count: [...manuscript.matchAll(new RegExp(`<Cite\\s+id="${id}"`, 'g'))].length })),
        ...termIds.map(id => ({ id, attr: 'data-term-id', count: [...manuscript.matchAll(new RegExp(`<Term\\s+id="${id}"`, 'g'))].length })),
      ];
      // Actual dynamic mount is reached, not inferred from authored markers.
      const budget = page.getByTestId('perception-budget');
      await expect(budget).toBeVisible();
      for (const id of ['realsense-d400-datasheet-2026', 'cleargrasp-2020']) {
        await expect(budget.locator(`[data-cite-id="${id}"]`)).toHaveCount(1);
        groups.push({ id, attr: 'data-cite-id', count: 1 });
      }
      const observations = [], failures: string[] = [];
      try {
        for (const group of groups) {
          expect(group.count).toBeGreaterThan(0);
          const dynamic = ['realsense-d400-datasheet-2026', 'cleargrasp-2020'].includes(group.id);
          const roots = (dynamic ? budget : page.locator('div.prose')).locator(`[${group.attr}="${group.id}"]`);
          await expect(roots).toHaveCount(group.count);
          for (let occurrence = 0; occurrence < group.count; occurrence++) {
            const root = roots.nth(occurrence), trigger = root.locator('a').first(), tip = root.getByRole('tooltip');
            for (const position of positions) for (const method of methods) {
              const identity = [viewport.width, dynamic ? 'mounted' : 'authored', group.id, occurrence, position, method].join(':');
              await page.mouse.move(0, 0);
              await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
              await root.evaluate((el, pos) => window.scrollBy(0, el.getBoundingClientRect().top -
                (pos === 'reading' ? innerHeight / 2 : pos === 'upper-edge' ? 100 : innerHeight - 80)), position);
              if (method === 'hover') await trigger.hover();
              else {
                await trigger.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
              }
              await settle(page);
              const measurement = await tip.evaluate(el => {
                const box = el.getBoundingClientRect(), link = el.parentElement!.querySelector('a')!;
                const rect = link.getBoundingClientRect(), style = getComputedStyle(el);
                const headerBottom = Math.max(0, ...[...document.querySelectorAll('header')].map(h => {
                  const s = getComputedStyle(h), b = h.getBoundingClientRect();
                  return ['sticky', 'fixed'].includes(s.position) && b.width && b.height && b.top <= 0 ? b.bottom : 0;
                }));
                return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, headerBottom,
                  visible: box.width > 0 && box.height > 0 && style.display !== 'none',
                  hovered: link.matches(':hover'), focused: document.activeElement === link,
                  hit: link.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)),
                  scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, tabIndex: (el as HTMLElement).tabIndex };
              });
              const pass = measurement.visible && measurement.left >= 0 && measurement.right <= viewport.width &&
                measurement.top >= measurement.headerBottom && measurement.bottom <= viewport.height && measurement.hit &&
                (method === 'hover' ? measurement.hovered : measurement.focused);
              observations.push({ identity, measurement, pass });
              if (!pass) failures.push(identity);
              if (occurrence === 0 && position === 'reading' && method === 'keyboard') {
                await capture(page, info, `${group.id}-keyboard`);
                if (measurement.scrollHeight > measurement.clientHeight + 1) {
                  expect(measurement.tabIndex).toBe(0);
                  for (let tab = 0; tab < 3 && !(await tip.evaluate(el => el === document.activeElement)); tab++) await page.keyboard.press('Tab');
                  await expect(tip).toBeFocused();
                  await page.keyboard.press('End');
                  await expect.poll(() => tip.evaluate(el => el.scrollTop + el.clientHeight)).toBeGreaterThanOrEqual(measurement.scrollHeight - 1);
                  await capture(page, info, `${group.id}-keyboard-panel-end`);
                  await page.keyboard.press('Tab');
                  // A correctly dismissed role=tooltip leaves the accessible
                  // population; check real focus, not a hidden-role locator.
                  expect(await root.evaluate(el => el.contains(document.activeElement))).toBe(false);
                }
              }
            }
          }
        }
      } finally {
        await info.attach('tooltip-identities', { body: JSON.stringify({ observations, failures }), contentType: 'application/json' });
      }
      const expected = groups.reduce((n, g) => n + g.count, 0) * positions.length * methods.length;
      expect(observations).toHaveLength(expected);
      expect(new Set(observations.map(o => o.identity)).size).toBe(expected);
      expect(failures).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });

    test('References and both changed glossary consumers retain source identities and history', async ({ page }, info) => {
      await open(page, info);
      const history = [];
      for (const id of sourceIds) {
        const source = CITATIONS.find(c => c.id === id)!;
        const chip = page.locator(`div.prose [data-cite-id="${id}"]`).first();
        await expect(chip.locator('a').first()).toContainText(String(source.year));
        await expect(chip.locator('a').first()).toHaveAttribute('href', source.url);
        await expect(chip.locator('a').first()).toHaveAttribute('rel', /noopener/);
        const before = page.url();
        await chip.locator('a[href^="#ref-"]').focus(); await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
        const reference = page.locator(`[data-reference-id="${id}"]`);
        await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', source.url);
        const expand = reference.getByRole('button', { name: /Show all/ });
        if (await expand.count()) { await expand.focus(); await page.keyboard.press('Enter'); }
        const text = await reference.innerText();
        let last = -1;
        for (const author of source.authors) {
          const index = text.indexOf(author, last + 1); expect(index).toBeGreaterThan(last); last = index;
        }
        await captureText(page, info, reference, `${id}-full-reference`);
        await page.goBack(); await expect(page).toHaveURL(before);
        history.push({ id, activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      }
      // The coupled point-cloud definition is a changed reader endpoint.
      const term = page.locator('[data-term-id="point-cloud"] a');
      const before = page.url();
      await term.focus(); await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/glossary\/?#point-cloud$/);
      for (const id of termIds) {
        const entry = GLOSSARY.find(t => t.id === id)!;
        const reader = page.locator(`[data-glossary-term="${id}"]`);
        await expect(reader.locator(':scope > p')).toHaveText(entry.definition);
        const expected = entry.citations.map(cid => CITATIONS.find(c => c.id === cid)!.url);
        expect(await reader.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(expected);
        for (const link of await reader.locator('a').all()) {
          await link.focus(); await expect(link).toBeFocused();
          await expect(link).toHaveAttribute('rel', /noopener/);
        }
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
        await captureText(page, info, reader, `${id}-glossary`);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await page.goBack(); await expect(page).toHaveURL(before);
      history.push({ id: 'point-cloud', activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      expect((await page.goto('/classical/scene-representation/'))?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      const sceneTerm = page.locator('div.prose [data-term-id="point-cloud"]');
      await expect(sceneTerm).toHaveCount(1);
      for (const method of methods) {
        await page.mouse.move(0, 0);
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
        await sceneTerm.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight / 2));
        const trigger = sceneTerm.locator('a').first();
        if (method === 'hover') await trigger.hover();
        else { await trigger.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); }
        const tip = sceneTerm.getByRole('tooltip');
        await expect(tip).toContainText(GLOSSARY.find(term => term.id === 'point-cloud')!.definition);
        await settle(page);
        const rect = await tip.boundingBox(); expect(rect).not.toBeNull();
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width);
        const headerBottom = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('header')].map(header => {
          const style = getComputedStyle(header), box = header.getBoundingClientRect();
          return ['sticky', 'fixed'].includes(style.position) && box.width && box.height && box.top <= 0 ? box.bottom : 0;
        })));
        expect(rect!.y).toBeGreaterThanOrEqual(headerBottom);
        expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
        await capture(page, info, `scene-point-cloud-${method}`);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await info.attach('reader-history', { body: JSON.stringify({ history, focusRestorationAccepted: false }), contentType: 'application/json' });
      // Citation Back -> BODY is inherited discovery debt, never silently accepted.
    });
  });
}
