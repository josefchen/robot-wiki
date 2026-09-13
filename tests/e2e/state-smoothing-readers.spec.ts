import { test, expect, type Page, type Locator } from './helpers/state-smoothing-fixture';
import type { TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { ownedEvidencePath } from './helpers/keypoint-reader-oracle';
import { termConsumerInventory } from './helpers/term-consumer-inventory';
import { collectBrowserReferenceFeatures, type BrowserReferenceFeatureConfig } from '../../lib/brand-v2-reference-rubric';
const ROUTE = '/classical/state-estimation/';
const PROSE = 'div.prose[data-pagefind-body]';
// Exact retained corrected definition and registry values. These are rendering
// oracles, not new source reviews or bibliographic acceptance.
const DEFINITION = "Simultaneous localization and mapping: estimating a robot's state while building a model of its environment. In the landmark-based formulation studied by Square Root SAM, the unknowns include the robot trajectory and landmark map. With known data associations, Gaussian process and measurement models, a uniform landmark prior, and the initial reference frame fixed, joint MAP estimation becomes nonlinear least squares. Cadena and colleagues describe MAP estimation, often expressed with factor graphs, as a standard SLAM formulation while also noting high-performing EKF-based systems.";
const SOURCES = [
  { id: 'dellaert-kaess-2006', count: 2, title: 'Square Root SAM: Simultaneous Localization and Mapping via Square Root Information Smoothing',
    authors: ['Frank Dellaert', 'Michael Kaess'], meta: 'Frank Dellaert, Michael Kaess, Int. J. Robotics Research, 2006', url: 'https://doi.org/10.1177/0278364906072768' },
  { id: 'kaess-2012', count: 1, title: 'iSAM2: Incremental Smoothing and Mapping Using the Bayes Tree',
    authors: ['Michael Kaess', 'Hordur Johannsson', 'Richard Roberts', 'Viorela Ila', 'John J. Leonard', 'Frank Dellaert'],
    meta: 'Michael Kaess, Hordur Johannsson, Richard Roberts et al., Int. J. Robotics Research, 2012', url: 'https://doi.org/10.1177/0278364911430419' },
  { id: 'cadena-2016', count: 2, title: 'Past, Present, and Future of Simultaneous Localization And Mapping: Towards the Robust-Perception Age',
    authors: ['Cesar Cadena', 'Luca Carlone', 'Henry Carrillo', 'Yasir Latif', 'Davide Scaramuzza', 'José Neira', 'Ian Reid', 'John J. Leonard'],
    meta: 'Cesar Cadena, Luca Carlone, Henry Carrillo et al., IEEE Transactions on Robotics, 2016', url: 'https://arxiv.org/abs/1606.05830' },
];
async function open(page: Page, route = ROUTE) {
  expect((await page.goto(route))?.status()).toBe(200);
  await page.waitForFunction(() => [...document.querySelectorAll('a')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
}
function evidence(page: Page, info: TestInfo) {
  const root = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
  const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS!;
  const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const states: object[] = [];
  const save = () => writeFileSync(ownedEvidencePath(root, info.outputPath('reader-state.json')),
    JSON.stringify({ title: info.title, viewport: page.viewportSize(), inputPath, inputSha256: hash(inputPath), states,
      limits: 'Local offline reader checks only. Source truth, full profiles, release corpus and independent acceptance remain open.' }, null, 2));
  const record = (state: object) => { states.push(state); save(); };
  const capture = async (name: string, detail: object = {}) => {
    const path = ownedEvidencePath(root, info.outputPath(name + '.png'));
    await page.screenshot({ path, animations: 'disabled' });
    record({ name, path, sha256: hash(path), at: new Date().toISOString(), url: page.url(), ...detail });
  };
  const stickyBottom = () => page.locator('header').evaluateAll(elements => Math.max(0, ...elements.map(el => {
    const cs = getComputedStyle(el), b = el.getBoundingClientRect();
    return ['sticky', 'fixed'].includes(cs.position) && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0 &&
      b.top <= (parseFloat(cs.top) || 0) ? b.bottom : 0;
  })));
  const clear = async () => {
    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator(`${PROSE} [role="tooltip"]:visible`)).toHaveCount(0);
  };
  const position = async (element: Locator, y?: number) => {
    await element.scrollIntoViewIfNeeded();
    await element.evaluate((el, top) => window.scrollBy(0, el.getBoundingClientRect().top - top), y ?? (await stickyBottom()) + 24);
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  };
  const textCapture = async (element: Locator, name: string) => {
    await clear(); await position(element);
    const box = (await element.boundingBox())!, viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    const top = (await stickyBottom()) + 24, step = viewport.height - top - 24;
    expect(step).toBeGreaterThan(0);
    for (let offset = 0, index = 0; offset < box.height; offset += step, index++) {
      await element.evaluate((el, value) => window.scrollBy(0, el.getBoundingClientRect().top - value.top + value.offset), { top, offset });
      await capture(`${name}-${index}`, { offset, elementHeight: box.height });
    }
  };
  const popupGeometry = async (tip: Locator) => {
    const box = (await tip.boundingBox())!, viewport = page.viewportSize()!, headerBottom = await stickyBottom();
    const scroll = await tip.evaluate(el => ({ top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight, tabIndex: (el as HTMLElement).tabIndex }));
    record({ name: 'popup-geometry', box, headerBottom, scroll });
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(headerBottom); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    return scroll;
  };
  const endGeometry = async (tip: Locator) => {
    const result = await tip.evaluate(el => {
      const last = el.lastElementChild!, node = last.lastChild!, text = node.textContent ?? '';
      const range = document.createRange(); range.setStart(node, Math.max(0, text.length - 30)); range.setEnd(node, text.length);
      const rects = [...range.getClientRects()], panel = el.getBoundingClientRect();
      return { scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, lastText: text.slice(-30),
        rects: rects.map(r => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })),
        panel: { top: panel.top, bottom: panel.bottom, left: panel.left, right: panel.right } };
    });
    record({ name: 'popup-end-geometry', ...result });
    expect(result.lastText.length).toBeGreaterThan(0); expect(result.rects.length).toBeGreaterThan(0);
    for (const rect of result.rects) {
      expect(rect.top).toBeGreaterThanOrEqual(result.panel.top); expect(rect.bottom).toBeLessThanOrEqual(result.panel.bottom);
      expect(rect.left).toBeGreaterThanOrEqual(result.panel.left); expect(rect.right).toBeLessThanOrEqual(result.panel.right);
    }
    return result;
  };
  const axe = async (selector: string, name: string) => {
    const result = await new AxeBuilder({ page }).include(selector).analyze();
    record({ name, violations: result.violations, incomplete: result.incomplete,
      incompleteNodeCount: result.incomplete.reduce((n, item) => n + item.nodes.length, 0) });
    expect(result.violations).toEqual([]);
  };
  return { record, capture, clear, position, textCapture, popupGeometry, endGeometry, stickyBottom, axe };
}

test('corrected smoothing qualifications and both factor equations remain readable', async ({ page }, info) => {
  const e = evidence(page, info); await open(page);
  const compact = page.viewportSize()!.width < 1024;
  const measurements = await page.evaluate(collectBrowserReferenceFeatures, {
    surfaceKind: 'article', identitySelector: compact ? 'header a[href="/"]' : 'aside a[href="/"]',
    descriptorRequired: false, primarySelector: 'article h1', supportingSelector: 'article h2', bodySelector: `${PROSE} > p`,
    shellSelector: compact ? 'header' : 'aside', proseSelector: PROSE, alternateSymbolSelector: '[data-brand-symbol]', repeatedModuleSelector: 'article section',
  } satisfies BrowserReferenceFeatureConfig);
  e.record({ name: 'reference-measurements', measurements, acceptance: 'Not a full reference acceptance' });
  await e.capture('state-article-top');
  const prose = page.locator(PROSE);
  for (const [index, expected] of [
    ['In EKF-based SLAM', 'cannot later relinearize those discarded pose variables', 'does not guarantee that nonlinear optimization reaches the global minimum'],
    ["Dellaert and Kaess's 2006", 'known data associations', 'a uniform landmark prior', 'initial reference frame fixed', 'successive linearized systems', 'QR acts on the measurement Jacobian', 'Cholesky acts on the information matrix', 'affected cliques and their ancestors', 'reattaches unaffected subtrees', 'thresholds trade accuracy for computation', 'large loop closures can be as expensive as a batch solution'],
    ['Cadena and colleagues describe a classical SLAM period', '1986 to 2004', '2004 to 2015', 'state-of-the-art performance', 'EKF linearization is accurate', 'unbounded graph growth', 'not a universal rule that smoothing wins'],
  ].entries()) {
    const paragraph = prose.locator(':scope > p').filter({ hasText: expected[0] }); await expect(paragraph).toHaveCount(1);
    for (const text of expected) await expect(paragraph).toContainText(text);
    e.record({ name: 'corrected-paragraph', index, text: await paragraph.innerText() }); await e.textCapture(paragraph, `corrected-paragraph-${index}`);
  }
  const equations = prose.locator('.katex-display'); expect(await equations.count()).toBeGreaterThanOrEqual(7);
  for (const [index, expected] of [String.raw`p(X \mid Z) \propto \prod_i \phi_i(X_i)`, String.raw`X^{\star} = \arg\min_X \sum_i \left\lVert h_i(X_i) - z_i \right\rVert_{\Sigma_i}^2`].entries()) {
    const equation = equations.nth((await equations.count()) - 2 + index);
    await expect(equation.locator('annotation')).toHaveText(expected); await expect(equation).toHaveAttribute('tabindex', '0');
    await e.position(equation); await equation.focus(); await e.capture(`factor-equation-${index}`);
    const geometry = await equation.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, text: el.getAttribute('aria-label') }));
    e.record({ name: 'factor-equation', index, geometry }); expect(geometry.text).toMatch(/Display equation/);
    if (geometry.scroll > geometry.width) { for (let i = 0; i < 50 && await equation.evaluate(el => el.scrollLeft + el.clientWidth < el.scrollWidth - 1); i++) await page.keyboard.press('ArrowRight');
      await expect.poll(() => equation.evaluate(el => el.scrollWidth - el.scrollLeft - el.clientWidth)).toBeLessThanOrEqual(1); await e.capture(`factor-equation-${index}-end`); }
    await page.keyboard.press('Tab'); await expect(equation).not.toBeFocused();
  }
  await expect(prose.locator('.katex-error')).toHaveCount(0); await e.clear(); await e.axe('#main-content', 'corrected-reader-axe');
});

test('all five changed-source chips preserve hover focus Escape and full References', async ({ page }, info) => {
  const e = evidence(page, info); await open(page);
  for (const source of SOURCES) {
    const roots = page.locator(`${PROSE} [data-cite-id="${source.id}"]`); await expect(roots).toHaveCount(source.count);
    for (let occurrence = 0; occurrence < source.count; occurrence++) {
      const root = roots.nth(occurrence), trigger = root.locator('a').first(), tip = root.getByRole('tooltip');
      for (const mode of ['hover', 'keyboard'] as const) {
        await e.clear(); await e.position(root, page.viewportSize()!.height / 2);
        if (mode === 'hover') await trigger.hover(); else await trigger.focus();
        await expect(tip).toBeVisible(); await expect(tip.locator(':scope > span').nth(0)).toHaveText(source.title);
        await expect(tip.locator(':scope > span').nth(1)).toHaveText(source.meta);
        await expect(trigger).toHaveAttribute('href', source.url); await expect(trigger).toHaveAttribute('target', '_blank'); await expect(trigger).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(trigger).toHaveAttribute('aria-describedby', (await tip.getAttribute('id'))!);
        await e.popupGeometry(tip); await e.capture(`${source.id}-${occurrence}-${mode}`);
        if (mode === 'keyboard') { await page.keyboard.press('Escape'); await expect(tip).not.toBeVisible(); await expect(trigger).toBeFocused(); }
      }
    }
    await e.clear();
    const jump = roots.first().getByRole('link', { name: `Jump to the full reference for ${source.title}`, exact: true });
    await jump.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(new RegExp(`#ref-${source.id}$`));
    const reference = page.locator(`[data-reference-id="${source.id}"]`);
    await expect(reference.locator('[data-author-names]')).toHaveText(source.authors.join(', '));
    await expect(reference.getByRole('link', { name: source.title, exact: true })).toHaveAttribute('href', source.url);
    e.record({ name: 'full-reference', id: source.id, text: await reference.innerText(), authors: source.authors });
    await e.textCapture(reference, `${source.id}-reference`);
  }
  await expect(page.locator('[data-reference-id]')).toHaveCount(12); await e.clear(); await e.axe('#main-content', 'source-reader-axe');
});

const slamConsumers = termConsumerInventory().flatMap(a => a.occurrences.filter(o => o.termId === 'slam').map(o => ({ route: a.route, ...o })));
for (const consumer of slamConsumers) test(`SLAM final text and keyboard exit at ${consumer.route} occurrence ${consumer.occurrence}`, async ({ page }, info) => {
  expect(slamConsumers.length).toBeGreaterThan(0); const e = evidence(page, info); await open(page, consumer.route);
  const root = page.locator(`${PROSE} [data-term-id="slam"]`).nth(consumer.occurrence - 1), trigger = root.locator('a'), tip = root.getByRole('tooltip');
  for (const [placement, y] of [['top', (await e.stickyBottom()) + 24], ['middle', page.viewportSize()!.height / 2], ['bottom', page.viewportSize()!.height - 70]] as const) {
    for (const mode of ['hover', 'keyboard'] as const) {
      await e.clear(); await e.position(root, y);
      if (mode === 'hover') await trigger.hover(); else { await trigger.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(trigger).toBeFocused(); }
      await expect(tip).toBeVisible(); await expect(tip.locator(':scope > span').nth(1)).toHaveText(DEFINITION);
      const scroll = await e.popupGeometry(tip); await e.capture(`slam-${placement}-${mode}`, { consumer, scroll });
      if (mode === 'keyboard') {
        if (scroll.height > scroll.client) { expect(scroll.tabIndex).toBe(0); await page.keyboard.press('Tab'); await expect(tip).toBeFocused(); await page.keyboard.press('End');
          await expect.poll(() => tip.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1); }
        const end = await e.endGeometry(tip); expect(end.lastText).toBe(DEFINITION.slice(-30));
        await e.capture(`slam-${placement}-final-text`, { end });
        await page.keyboard.press('Tab'); expect(await root.evaluate(el => el.contains(document.activeElement))).toBe(false); await expect(tip).not.toBeVisible();
      }
    }
  }
  await e.clear(); await trigger.focus(); await e.axe('#main-content', 'slam-revealed-axe');
  await page.keyboard.press('Escape'); e.record({ name: 'term-escape-observation', hidden: !(await tip.isVisible()), activeElement: await page.evaluate(() => document.activeElement?.tagName), owner: 'Existing shared apparatus; no shared component edit authorized' });
  await e.capture('slam-escape-observed');
  await e.clear(); await trigger.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/glossary\/?#slam$/);
  await page.evaluate(() => document.fonts.ready); const entry = page.locator('[data-glossary-term="slam"]');
  await expect(entry.locator(':scope > p')).toHaveText(DEFINITION);
  const sourceLinks = entry.locator('ul a'); await expect(sourceLinks).toHaveCount(2);
  expect(await sourceLinks.evaluateAll(els => els.map(el => el.getAttribute('href')))).toEqual([SOURCES[2].url, SOURCES[0].url]);
  for (let index = 0; index < 2; index++) { await sourceLinks.nth(index).focus(); await expect(sourceLinks.nth(index)).toBeFocused(); await expect(sourceLinks.nth(index)).toHaveAttribute('rel', 'noopener noreferrer'); await expect(sourceLinks.nth(index)).toHaveAttribute('target', '_blank'); }
  await e.textCapture(entry, 'slam-glossary-definition'); await e.axe('[data-glossary-term="slam"]', 'slam-index-axe');
  await page.goBack(); await expect(page).toHaveURL(new RegExp(consumer.route + '$'));
  e.record({ name: 'glossary-back-focus', focus: await page.evaluate(() => ({ tag: document.activeElement?.tagName, href: document.activeElement?.getAttribute('href') })), acceptance: false, owner: 'Existing route/history restoration' });
});

test('state controls disclosures and real navigation retain keyboard paths', async ({ page }, info) => {
  const e = evidence(page, info); await open(page);
  if (page.viewportSize()!.width === 375) {
    const menu = page.getByRole('button', { name: 'Open navigation menu' }); await menu.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog'), close = dialog.getByRole('button', { name: 'Close navigation menu' }); await expect(close).toBeFocused();
    await expect(dialog.locator('[aria-current="page"]')).toHaveCount(1); await expect(dialog.getByRole('link', { name: 'State Estimation', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
    await page.keyboard.press('Shift+Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab'); await expect(close).toBeFocused(); await e.capture('state-drawer'); await e.axe('[role="dialog"]', 'drawer-axe');
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(menu).toBeFocused();
  }
  const scene = page.getByTestId('kalman-scene'); const container = scene.locator('..');
  e.record({ name: 'actual-controls', sliders: await page.getByRole('slider').count(), buttons: await container.getByRole('button').count(), disclosures: await container.locator('details').count() });
  await expect(page.getByTestId('kalman-step-readout')).toHaveText('60 / 600'); await e.textCapture(container, 'kalman-default');
  const q = page.getByRole('slider', { name: /process noise/i }); await q.focus(); await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('kalman-sigmaq-value')).toHaveText('0.25');
  await e.capture('kalman-noise-changed'); const reset = page.getByRole('button', { name: /reset/i }); await reset.focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('kalman-sigmaq-value')).toHaveText('0.20'); await e.textCapture(container, 'kalman-reset');
  const disclosures = container.locator('details'); expect(await disclosures.count()).toBeGreaterThan(0);
  for (let index = 0; index < await disclosures.count(); index++) { const d = disclosures.nth(index); await d.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(d).toHaveAttribute('open', '');
    await e.textCapture(d, `kalman-disclosure-${index}`); await d.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(d).not.toHaveAttribute('open', ''); }
  await e.axe('#main-content', 'state-control-axe');
});

test('inventory delta is the actual added teleoperation member, not a duplicated or empty trigger', async ({ page }, info) => {
  const route = '/rl-sim2real/legged-locomotion/'; const authored = termConsumerInventory().find(a => a.route === route)!;
  const e = evidence(page, info); await open(page, route);
  const actual = await page.locator(`${PROSE} [data-term-id]`).evaluateAll(els => { const counts: Record<string, number> = {}; return els.map((el, index) => { const termId = el.getAttribute('data-term-id')!; return {termId, ordinal:index+1, occurrence:counts[termId]=(counts[termId]??0)+1}; }); });
  expect(actual).toEqual(authored.occurrences.map(({termId, ordinal, occurrence}) => ({termId, ordinal, occurrence})));
  const root = page.locator(`${PROSE} [data-term-id="teleoperation"]`); await expect(root).toHaveCount(1); await expect(root.locator('a')).toHaveText('teleoperation');
  await expect(root.locator('a')).toHaveAttribute('href', '/glossary/#teleoperation'); await e.position(root); await root.locator('a').focus(); await expect(root.getByRole('tooltip')).toBeVisible();
  e.record({ name:'added-member-runtime', route, authored, actual }); await e.capture('added-teleoperation-runtime');
});
