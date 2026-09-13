import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { termConsumerInventory } from './helpers/term-consumer-inventory';
import { setSlider } from './slider';

const lane = '/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/convergence-keypoint-hierarchy-integration-20260913';
const ids = ['moka-2024', 'rekep-2024', 'robopoint-2024'];
for (const route of ['/classical/perception/', '/manipulation/hierarchical/']) {
  test(`keypoint interfaces retain bounded reader evidence ${route}`, async ({ page }, testInfo) => {
    const viewport = page.viewportSize()!;
    const states: object[] = [], errors: string[] = [];
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS!;
    const hash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
    const contained = (p: string) => { const target = resolve(p); expect(target.startsWith(realpathSync(lane) + sep)).toBe(true); return target; };
    const save = () => writeFileSync(contained(testInfo.outputPath('reader-state.json')), JSON.stringify({ route, viewport, inputPath, inputSha256: hash(inputPath), states, errors, fullProfilesAccepted: false }, null, 2));
    const capture = async (name: string, detail: object = {}) => {
      const path = contained(testInfo.outputPath(name + '.png'));
      await page.screenshot({ path, animations: 'disabled' });
      states.push({ name, path, sha256: hash(path), at: new Date().toISOString(), url: page.url(), ...detail }); save();
    };
    const clear = async () => { await page.mouse.move(viewport.width - 1, viewport.height - 1); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await expect(page.locator('div.prose [role="tooltip"]:visible')).toHaveCount(0); };
    const position = async (element: Locator, top = 110) => { await element.scrollIntoViewIfNeeded(); await element.evaluate((el, y) => window.scrollBy(0, el.getBoundingClientRect().top - y), top); };
    const textCapture = async (element: Locator, name: string) => {
      await clear(); await position(element); const box = (await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      for (let offset = 0, index = 0; offset < box.height; offset += viewport.height - 180, index++) {
        await element.evaluate((el, n) => window.scrollBy(0, el.getBoundingClientRect().top - 110 + n), offset);
        await capture(name + '-' + index, { offset, elementHeight: box.height });
      }
    };
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    expect((await page.goto(route))?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
    const prose = page.locator('div.prose[data-pagefind-body]');
    const roles = await page.evaluate(() => ['h1', 'div.prose[data-pagefind-body] > p'].map(selector => { const cs = getComputedStyle(document.querySelector(selector)!); return { selector, family: cs.fontFamily, size: cs.fontSize, lineHeight: cs.lineHeight, loaded: document.fonts.check('16px ' + cs.fontFamily.split(',')[0]) }; }));
    expect(roles.every(r => r.loaded)).toBe(true); expect(roles[0].family).toMatch(/tektur/i); expect(roles[1].family).toMatch(/newsreader/i); await capture('article-top', { roles });
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    if (viewport.width === 375) {
      await menu.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog');
      const close = dialog.getByRole('button', { name: 'Close navigation menu' }); await expect(close).toBeFocused();
      await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
      await page.keyboard.press('Shift+Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Tab'); await expect(close).toBeFocused(); await capture('drawer-keyboard');
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(menu).toBeFocused();
    }
    const perception = route.includes('/perception/');
    if (perception) {
      const original = await page.getByTestId('perception-total-readout').innerText(); await page.getByTestId('perception-target-specular').check();
      await expect(page.getByTestId('perception-depth-readout')).toContainText('6.0%'); await setSlider(page.getByTestId('perception-distance-slider'), 1.35);
      await textCapture(page.getByTestId('perception-chart'), 'calculator-changed'); await page.getByRole('button', { name: /reset the error budget/i }).click();
      await expect(page.getByTestId('perception-total-readout')).toHaveText(original); await expect(page.getByTestId('perception-target-opaque')).toBeChecked();
      const stat = page.getByText('visual-servo formulation', { exact: true }).locator('..'); await expect(stat).toContainText('1992'); await textCapture(stat, 'preserved-stat');
    } else {
      const slider = page.getByRole('slider', { name: /Playhead position/ }); await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).not.toHaveValue('0');
      await page.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(slider).toHaveValue('0');
      const stat = page.getByText('keypoint interfaces', { exact: true }).locator('..'); await expect(stat).toContainText('2024'); await textCapture(stat, 'preserved-stat');
    }
    const details = page.locator('main details');
    for (let i = 0; i < await details.count(); i++) { const d = details.nth(i), before = await d.evaluate(el => (el as HTMLDetailsElement).open); await d.locator('summary').first().focus(); await page.keyboard.press('Enter'); expect(await d.evaluate(el => (el as HTMLDetailsElement).open)).toBe(!before); await page.keyboard.press('Enter'); expect(await d.evaluate(el => (el as HTMLDetailsElement).open)).toBe(before); }
    states.push({ name: 'disclosures', count: await details.count(), emptyPopulationIsNotApplicable: true });
    for (const [index, id] of ids.entries()) {
      const root = prose.locator(`[data-cite-id="${id}"]`); await expect(root).toHaveCount(1);
      const block = root.locator(perception ? 'xpath=ancestor::p[1]' : 'xpath=ancestor::li[1]');
      for (const text of [['GroundedSAM', 'grasp, function and target keypoints where applicable', 'separate grasp sampler'], ['DINOv2', 'GPT-4o', 'penalizes constraint violations', 'human annotations or disable tracking'], ['real-image VQA and LVIS detection data', 'end-effector offset and a motion planner']][index]) await expect(block).toContainText(text);
      if (id === 'robopoint-2024' && !perception) for (const text of ['100 real-world images', 'Table 2', '46.77%', '29.06%', 'means over three runs', 'not robot grasp success']) await expect(block).toContainText(text);
      await textCapture(block, id + '-prose');
      const citation = CITATIONS.find(c => c.id === id)!;
      for (const [placement, y] of [['top', 110], ['middle', viewport.height / 2], ['lower', viewport.height - 70]] as const) {
        await clear(); await position(root, y); const trigger = root.locator('a').first(), tip = root.getByRole('tooltip');
        for (const mode of ['hover', 'keyboard'] as const) {
          if (mode === 'hover') await trigger.hover(); else { await clear(); await trigger.focus(); }
          await expect(tip).toBeVisible(); await expect(tip).toContainText(citation.title); for (const author of citation.authors) await expect(tip).toContainText(author);
          const box = (await tip.boundingBox())!, header = await page.locator('header.sticky').boundingBox();
          expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(box.y).toBeGreaterThanOrEqual(header ? header.y + header.height : 0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          await capture(`${id}-${placement}-${mode}`, { box, header });
        }
      }
      await clear(); const ref = page.locator(`ol [data-reference-id="${id}"]`); await expect(ref).toContainText(citation.title); for (const author of citation.authors) await expect(ref).toContainText(author);
      const link = ref.getByRole('link', { name: citation.title, exact: true }); await expect(link).toHaveAttribute('href', citation.url); await expect(link).toHaveAttribute('rel', /noopener/); await textCapture(ref, id + '-reference');
    }
    const termId = perception ? 'promptable-segmentation' : 'vision-language-model';
    const consumers = termConsumerInventory().flatMap(a => a.occurrences.filter(t => t.termId === termId).map(t => ({ route: a.route, ...t })));
    const term = prose.locator(`[data-term-id="${termId}"]`).first(); expect(consumers.some(c => c.route === route)).toBe(true);
    const definition = GLOSSARY.find(t => t.id === termId)!.definition; await clear(); await position(term);
    const anchor = term.locator('a').first(); await anchor.focus(); const tooltip = term.getByRole('tooltip'); await expect(tooltip).toContainText(definition); await expect(tooltip).toBeVisible();
    const scroll = await tooltip.evaluate(el => ({ client: el.clientHeight, height: el.scrollHeight, tabIndex: (el as HTMLElement).tabIndex }));
    if (scroll.height > scroll.client) { expect(scroll.tabIndex).toBe(0); await page.keyboard.press('Tab'); await expect(tooltip).toBeFocused(); await page.keyboard.press('End'); await expect.poll(() => tooltip.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop))).toBeLessThanOrEqual(1); }
    await capture('real-term-definition', { termId, consumers, scroll }); await clear();
    const axe = (await new AxeBuilder({ page }).include('#main-content').analyze()).violations; expect(axe).toEqual([]);
    await anchor.click(); await expect(page).toHaveURL(new RegExp('/glossary/?#' + termId + '$')); await page.evaluate(() => document.fonts.ready);
    const entry = page.locator(`[data-glossary-term="${termId}"]`); await expect(entry.locator('p')).toHaveText(definition); await textCapture(entry, 'glossary-consumer');
    expect((await new AxeBuilder({ page }).include(`[data-glossary-term="${termId}"]`).analyze()).violations).toEqual([]);
    await page.goBack(); await expect(page).toHaveURL(new RegExp(route.replaceAll('/', '\\/') + '$')); states.push({ name: 'history-return', activeElement: await page.evaluate(() => document.activeElement?.tagName), fullFocusRestorationAccepted: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); expect(errors).toEqual([]); states.push({ name: 'scoped-axe', axe, freshNavigationBudgetPerCase: 3 }); save();
  });
}
