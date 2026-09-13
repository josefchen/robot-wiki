import fs from 'node:fs';
import { expect, test as base, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { DEFAULT_PARAMS, SLIDER_SPECS, TARGET_CLASSES, composeBudget } from '../../lib/perception-error';
import { setSlider } from './slider';

const route = '/classical/perception/';
const manuscript = fs.readFileSync(new URL('../../content/classical/perception.mdx', import.meta.url), 'utf8');
const sourceIds = ['grounding-dino-2024', 'dinov2-2023', 'segment-anything-2023', 'sam2-2024'];
const termIds = ['semantic-segmentation', 'promptable-segmentation'];
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
  test.describe(`perception foundation readers at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('corrected paragraphs, Stat, real calculator and drawer remain readable', async ({ page }, info) => {
      await open(page, info);
      const prose = page.locator('div.prose[data-pagefind-body]');
      const checks = [
        { start: 'Classical detection returns', parts: [
          'feature enhancer, language-guided query selection and cross-modality decoder',
          'weak referring-expression performance without REC training data', '52.5 AP on COCO 2017 validation',
          'Grounding DINO L with a Swin-L backbone', 'O365, OpenImage and GoldG',
          'not that its object categories were absent from pretraining',
        ] },
        { start: 'DINOv2 learns', parts: ['LVD-142M', 'image encoder frozen while training task-specific predictors',
          'linear or DPT depth heads', 'does not mean that no downstream predictor is trained'] },
        { start: 'Segment Anything (SAM, 2023)', parts: ['1.1 billion automatically generated masks from 11 million images',
          'samples and filters masks', 'rather than establishing that every mask is used', 'multiple candidate masks'] },
        { start: 'The paper evaluates zero-shot', parts: ["ground-truth mask's center", "SAM's most confident mask",
          '16 of those 23 datasets, not all', 'oracle result selects the best mask using ground truth',
          'separately trained, CLIP-conditioned proof of concept', 'precomputed image embedding',
          'heavy image encoder prevents overall real-time performance'] },
        { start: 'SAM 2 extends', parts: ['28 October 2024', 'SAM 2.1', 'simulated comparison on nine',
          'Hiera-B+ at resolution 1024', 'three clicks', 'IoU falls below 0.75',
          'IoU exceeds 0.8', 'Those baseline descriptions do not fully agree'] },
        { start: 'The image-speed comparison', parts: ['SA-1B-only', 'Hiera-B+', 'ViT-H', '58.9 versus 58.1',
          '130.1 versus 21.7 images per second', 'one A100, with image batches of 10',
          'PyTorch 2.3.1, CUDA 12.1, bfloat16', 'not single-image latency',
          '37 datasets', '17 datasets'] },
        { start: 'These are model- and protocol-specific', parts: ['61.4', '61.9', 'unresolved source inconsistency',
          'OVIS is not strictly zero-shot', 'MOSE training data'] },
      ];
      await page.mouse.move(0, 0);
      await capture(page, info, 'article-top');
      const typography = [];
      for (const [i, check] of checks.entries()) {
        const paragraph = prose.locator(':scope > p').filter({
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
      await captureText(page, info, stat.locator('..'), 'corrected-stat');
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

    test('References full bylines and both glossary consumers retain source identities and history', async ({ page }, info) => {
      await open(page, info);
      const history = [];
      for (const id of sourceIds) {
        const source = CITATIONS.find(c => c.id === id)!;
        const chip = page.locator(`div.prose [data-cite-id="${id}"]`).first();
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
        if (id === 'segment-anything-2023') expect(text).toContain('arXiv 2023');
        if (id === 'grounding-dino-2024') expect(text).toContain('arXiv 2024');
        await captureText(page, info, reference, `${id}-full-reference`);
        await page.goBack(); await expect(page).toHaveURL(before);
        history.push({ id, activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      }
      const term = page.locator('[data-term-id="promptable-segmentation"] a');
      const before = page.url();
      await term.focus(); await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/glossary\/?#promptable-segmentation$/);
      for (const id of termIds) {
        const entry = GLOSSARY.find(t => t.id === id)!;
        const reader = page.locator(`[data-glossary-term="${id}"]`);
        await expect(reader.locator(':scope > p')).toHaveText(entry.definition);
        const expected = entry.citations.map(cid => CITATIONS.find(c => c.id === cid)!.url);
        expect(await reader.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(expected);
        if (id === 'promptable-segmentation') {
          await expect(reader).toContainText('separate ViTDet detector');
          await expect(reader).toContainText('performance is not guaranteed');
        }
        for (const link of await reader.locator('a').all()) {
          await link.focus(); await expect(link).toBeFocused();
          await expect(link).toHaveAttribute('rel', /noopener/);
        }
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
        await captureText(page, info, reader, `${id}-glossary`);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await page.goBack(); await expect(page).toHaveURL(before);
      history.push({ id: 'promptable-segmentation', activeTag: await page.evaluate(() => document.activeElement?.tagName) });
      await info.attach('reader-history', { body: JSON.stringify({ history, focusRestorationAccepted: false }), contentType: 'application/json' });
      // Citation Back -> BODY is inherited discovery debt, never silently accepted.
    });
  });
}
