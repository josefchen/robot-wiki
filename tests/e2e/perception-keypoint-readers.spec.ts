import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { termConsumerInventory } from './helpers/term-consumer-inventory';
import { setSlider } from './slider';
import { openAdjustMore } from './helpers/figure-fold';
import { assertFullReferenceAuthors, assertShortMetadata, KEYPOINT_SHORT_META, ownedEvidencePath } from './helpers/keypoint-reader-oracle';
import { readerGateInputs } from './helpers/reader-gate-inputs';
import { citeParts, dismissCiteNote, expectCiteNoteFacts, jumpFromCiteMark, showCiteNote } from './helpers/citation-note';

type ContentsLink = { href: string; name: string };
/**
 * The ordered href and accessible name of every link in one contents list. The layout lays one of the two lists away, so each name read
 * off a link is confirmed by Playwright's accessible-name engine with includeHidden, which names a laid-away link as it names a shown one.
 */
async function contentsLinks(nav: Locator): Promise<ContentsLink[]> {
  await expect(nav).toHaveCount(1);
  const links = nav.getByRole('link', { includeHidden: true });
  const entries = await nav.locator('a').evaluateAll(as => as.map(a => ({ href: a.getAttribute('href') ?? '', name: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim() })));
  expect(entries.length, 'a contents list links to the page sections').toBeGreaterThan(0);
  await expect(links).toHaveCount(entries.length);
  for (const [i, { name }] of entries.entries()) await expect(links.nth(i).and(nav.getByRole('link', { includeHidden: true, name, exact: true })), `contents entry ${i + 1} has the accessible name "${name}"`).toHaveCount(1);
  return entries;
}
/** The rail and the disclosure list the same sections in the same order; a difference fails naming the first entry where they part. */
function expectSameContents(rail: readonly ContentsLink[], disclosure: readonly ContentsLink[]): void {
  const at = [...Array(Math.max(rail.length, disclosure.length)).keys()].find(i => rail[i]?.href !== disclosure[i]?.href || rail[i]?.name !== disclosure[i]?.name);
  const first = at === undefined ? null : { entry: at + 1, rail: rail[at] ?? null, disclosure: disclosure[at] ?? null };
  expect(first, first ? `contents entry ${first.entry} differs: rail ${JSON.stringify(first.rail)}, disclosure ${JSON.stringify(first.disclosure)}` : 'the rail and the disclosure list the same links').toBeNull();
}

let freshNavigations = 0;
const ids = ['moka-2024', 'rekep-2024', 'robopoint-2024'];
for (const route of ['/classical/perception/', '/manipulation/hierarchical/']) {
  test(`keypoint interfaces retain bounded reader evidence ${route}`, async ({ page }, testInfo) => {
    const viewport = page.viewportSize()!;
    const states: object[] = [], errors: string[] = [];
    const navigations: string[] = [];
    let previousDocument = '';
    page.on('framenavigated', frame => {
      if (frame !== page.mainFrame() || !frame.url().startsWith('http')) return;
      const url = new URL(frame.url()), document = url.origin + url.pathname;
      if (document !== previousDocument) { previousDocument = document; navigations.push(frame.url()); freshNavigations++; }
    });
    const { root: lane, inputPath } = readerGateInputs(testInfo, 'keypoint');
    const hash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
    const contained = (path: string) => ownedEvidencePath(lane, path);
    const save = () => writeFileSync(contained(testInfo.outputPath('reader-state.json')), JSON.stringify({ route, viewport, inputPath, inputSha256: hash(inputPath), states, errors, navigations, freshNavigations, navigationCap: 16, fullProfilesAccepted: false }, null, 2));
    const capture = async (name: string, detail: object = {}) => {
      const path = contained(testInfo.outputPath(name + '.png'));
      await page.screenshot({ path, animations: 'disabled' });
      states.push({ name, path, sha256: hash(path), at: new Date().toISOString(), url: page.url(), ...detail }); save();
    };
    const clear = async () => { await page.mouse.move(viewport.width - 1, viewport.height - 1); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await expect(page.locator('div.prose [role="tooltip"]:visible')).toHaveCount(0); };
    const stickyBottom = async () => page.locator('header').evaluateAll(elements => Math.max(0, ...elements.map(el => { const cs = getComputedStyle(el), b = el.getBoundingClientRect(); return ['sticky', 'fixed'].includes(cs.position) && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0 && b.top <= (parseFloat(cs.top) || 0) ? b.bottom : 0; })));
    const position = async (element: Locator, top?: number) => { await element.scrollIntoViewIfNeeded(); await element.evaluate((el, y) => window.scrollBy(0, el.getBoundingClientRect().top - y), top ?? (await stickyBottom()) + 24); };
    const textCapture = async (element: Locator, name: string) => {
      await clear(); await position(element); const box = (await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      const top = (await stickyBottom()) + 24, step = viewport.height - top - 24;
      expect(step).toBeGreaterThan(0);
      for (let offset = 0, index = 0; offset < box.height; offset += step, index++) {
        await element.evaluate((el, value) => window.scrollBy(0, el.getBoundingClientRect().top - value.top + value.offset), { top, offset });
        await capture(name + '-' + index, { offset, elementHeight: box.height });
      }
    };
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    expect((await page.goto(route))?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
    // A screenshot hides the caret with an inline style, and React reports that as a hydration mismatch on any input it has not hydrated yet.
    await page.waitForFunction(() => [...document.querySelectorAll('main input')].every(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
    const prose = page.locator('div.prose[data-pagefind-body]');
    const roles = await page.evaluate(() => ['h1', 'div.prose[data-pagefind-body] > p'].map(selector => { const cs = getComputedStyle(document.querySelector(selector)!); return { selector, family: cs.fontFamily, size: cs.fontSize, lineHeight: cs.lineHeight, loaded: document.fonts.check('16px ' + cs.fontFamily.split(',')[0]) }; }));
    // The research-page standard (owner decision, 10 October 2026) sets the H1 in DM Sans and article prose in Geist, in place of Tektur and Newsreader.
    expect(roles.every(r => r.loaded)).toBe(true); expect(roles[0].family).toMatch(/^"?DM Sans"?,/); expect(roles[1].family).toMatch(/^"?Geist"?,/); await capture('article-top', { roles });
    // The one top bar's "Articles" button opens the taxonomy drawer in place of the brand-v2 menu button (research-page standard, 9154d672).
    const menu = page.getByRole('banner').getByRole('button', { name: 'Articles', exact: true });
    await expect(menu).toHaveAttribute('aria-haspopup', 'dialog'); await expect(menu).toHaveAttribute('aria-controls', 'mobile-nav-drawer');
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
      // The target, the readouts and Reset sit in the budget's "Adjust more" fold.
      await openAdjustMore(page.getByTestId('perception-budget'));
      const original = await page.getByTestId('perception-total-readout').innerText(); await page.getByTestId('perception-target-specular').check();
      await expect(page.getByTestId('perception-depth-readout')).toContainText('6.0%'); await setSlider(page.getByTestId('perception-distance-slider'), 1.35);
      await textCapture(page.getByTestId('perception-chart'), 'calculator-changed'); await page.getByRole('button', { name: /reset the error budget/i }).click();
      await expect(page.getByTestId('perception-total-readout')).toHaveText(original); await expect(page.getByTestId('perception-target-opaque')).toBeChecked();
      const stat = page.getByText('visual-servo formulation', { exact: true }).locator('..'); await expect(stat).toContainText('1992'); await textCapture(stat, 'preserved-stat');
    } else {
      // The playhead and Reset sit in the figure's "Adjust more" fold; the playhead settles at the end of the 2 seconds, so it steps back.
      const adjust = await openAdjustMore(page.locator('main [data-figure-frame="hierarchy-timescales"]'));
      const slider = adjust.getByRole('slider', { name: /Point in the 2 seconds: playhead position/ }); await slider.focus(); const settled = await slider.inputValue(); await page.keyboard.press('ArrowLeft'); await expect(slider).not.toHaveValue(settled);
      await adjust.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(slider).toHaveValue(settled);
      const stat = page.getByText('keypoint interfaces', { exact: true }).locator('..'); await expect(stat).toContainText('2024'); await textCapture(stat, 'preserved-stat');
    }
    states.push({ name: 'calculator-or-playhead-default-changed-reset', kind: perception ? 'perception-error-budget' : 'hierarchy-playhead' });
    const details = page.locator('main details');
    // The research-page layout (owner decision, 10 October 2026; 9154d672) renders the page contents as a sticky rail from 1200 px and as the "Contents" disclosure below it, so at a rail width that one disclosure is display: none and the rail stands in for it. Every other disclosure is toggled.
    const railWidth = await page.locator('nav.article-toc').isVisible();
    const railLinks = await contentsLinks(page.locator('nav.article-toc'));
    let layoutHidden = 0;
    // A disclosure nested in a closed fold is reached by opening that fold first, as a reader would.
    for (let i = 0; i < await details.count(); i++) {
      const d = details.nth(i);
      if (await d.evaluate(el => getComputedStyle(el).display === 'none')) {
        expect(await d.evaluate(el => el.classList.contains('article-contents')), 'only the narrow-width contents disclosure is laid out away').toBe(true);
        expect(railWidth, 'the contents rail stands in for the hidden contents disclosure').toBe(true);
        expectSameContents(railLinks, await contentsLinks(d.locator('nav')));
        layoutHidden++; continue;
      }
      const fold = d.locator('xpath=ancestor::details[1]'); if (await fold.count() && !(await fold.evaluate(el => (el as HTMLDetailsElement).open))) await fold.locator(':scope > summary').click(); const before = await d.evaluate(el => (el as HTMLDetailsElement).open); await d.locator('summary').first().focus(); await page.keyboard.press('Enter'); expect(await d.evaluate(el => (el as HTMLDetailsElement).open)).toBe(!before); await page.keyboard.press('Enter'); expect(await d.evaluate(el => (el as HTMLDetailsElement).open)).toBe(before);
    }
    expect(layoutHidden).toBe(railWidth ? 1 : 0);
    // Below the rail width the rail is the list laid away, and the "Contents" disclosure that stands in for it carries the same links.
    if (!railWidth) expectSameContents(railLinks, await contentsLinks(page.locator('main details.article-contents nav')));
    states.push({ name: 'disclosures', count: await details.count(), layoutHidden, contents: railLinks, emptyPopulationIsNotApplicable: true });
    for (const [index, id] of ids.entries()) {
      const root = prose.locator(`[data-cite-id="${id}"]`); await expect(root).toHaveCount(1);
      const block = root.locator('xpath=ancestor::p[1]');
      for (const text of [['GroundedSAM', 'grasp, function and target keypoints', 'separate grasp sampler'], ['DINOv2', perception ? 'A large vision-language model' : 'GPT-4o', perception ? 'penalizes constraint violations' : 'penalizing violations', 'human annotations or disable tracking'], ['real-image VQA and LVIS detection data', 'end-effector offset and a motion planner']][index]) await expect(block).toContainText(text);
      if (id === 'robopoint-2024' && !perception) for (const text of ['100 real images', 'point-in-mask accuracy', '46.77%', '29.06%', 'means of three runs', 'add depth, an end-effector offset']) await expect(block).toContainText(text);
      await textCapture(block, id + '-prose');
      const citation = CITATIONS.find(c => c.id === id)!;
      // Owner-approved successor (Josef, 2026-10-10, the research-page standard): the citation tooltip became the numbered citation's sidenote (helpers/citation-note.ts).
      // The title, the short venue line, the source link and the description are read off the note at every placement and by pointer and keyboard; the note shows whole
      // inside the viewport below the top bar; the tooltip's Escape is the number pressed again, which closes an inline note and leaves a margin note at rest.
      const { mark: trigger, note: tip } = citeParts(root);
      for (const [placement, y] of [['top', (await stickyBottom()) + 24], ['middle', viewport.height / 2], ['lower', viewport.height - 70]] as const) {
        for (const mode of ['hover', 'keyboard'] as const) {
          await clear(); await position(root, y);
          const inMargin = await showCiteNote(page, root, mode);
          await expectCiteNoteFacts(page, root, { title: citation.title, meta: KEYPOINT_SHORT_META[id], url: citation.url });
          assertShortMetadata(id, (await tip.locator(':scope > .sr-only').textContent())!.replace(/^\. /, ''));
          const box = (await tip.boundingBox())!, headerBottom = await stickyBottom();
          expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(box.y).toBeGreaterThanOrEqual(headerBottom); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          const scroll = await tip.evaluate(el => ({ client: el.clientHeight, height: el.scrollHeight, top: el.scrollTop }));
          expect(scroll.height, 'the note shows whole, with nothing scrolled away').toBeLessThanOrEqual(scroll.client + 1);
          await capture(`${id}-${placement}-${mode}`, { citationId: id, placement, mode, inMargin, box, headerBottom, title: citation.title, metadata: KEYPOINT_SHORT_META[id], scroll });
          await dismissCiteNote(page, root, mode);
          if (mode === 'keyboard') { if (!inMargin) await expect(tip).not.toBeVisible(); await expect(trigger).toBeFocused(); }
        }
      }
      await clear(); const ref = page.locator(`ol [data-reference-id="${id}"]`); await expect(ref).toHaveCount(1); await expect(ref).toContainText(citation.title);
      // The tooltip's "Jump to the full reference" link is the number itself, which points at the References entry and jumps from it.
      const restoreViewport = await jumpFromCiteMark(page, root, id);
      const expand = ref.getByRole('button', { name: `Show all ${citation.authors.length} authors`, exact: true });
      const needsExpansion = citation.authors.length > 6;
      await expect(expand).toHaveCount(needsExpansion ? 1 : 0);
      if (needsExpansion) { await expand.focus(); await page.keyboard.press('Enter'); await expect(ref.getByRole('button', { name: 'Show 6 authors', exact: true })).toHaveAttribute('aria-expanded', 'true'); }
      const authorNames = ref.locator('[data-author-names]'); await expect(authorNames).toBeVisible(); await expect(authorNames).toHaveText(citation.authors.join(', '));
      assertFullReferenceAuthors(await authorNames.innerText(), citation.authors);
      await expect(authorNames.locator('..')).toHaveText(citation.authors.join(', ') + (citation.venue ? `, ${citation.venue}` : '') + `, ${citation.year}.` + (needsExpansion ? ' Show 6 authors' : ''));
      states.push({ name: 'full-reference', id, authors: citation.authors, authorCount: citation.authors.length, needsExpansion, title: citation.title, year: citation.year, venue: citation.venue ?? null, href: citation.url });
      const link = ref.getByRole('link', { name: citation.title, exact: true }); await expect(link).toHaveAttribute('href', citation.url); await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); await expect(link).toHaveAttribute('target', '_blank'); await expect(ref.locator('p').last()).toHaveText(citation.url); await link.focus(); await expect(link).toBeFocused(); await textCapture(ref, id + '-reference');
      await restoreViewport();
    }
    const termId = perception ? 'promptable-segmentation' : 'vision-language-model';
    const consumers = termConsumerInventory().flatMap(a => a.occurrences.filter(t => t.termId === termId).map(t => ({ route: a.route, ...t })));
    const term = prose.locator(`[data-term-id="${termId}"]`).first(); expect(consumers.some(c => c.route === route)).toBe(true);
    const definition = GLOSSARY.find(t => t.id === termId)!.definition;
    const anchor = term.locator('a').first(), tooltip = term.getByRole('tooltip');
    for (const [placement, y] of [['top', (await stickyBottom()) + 24], ['middle', viewport.height / 2], ['lower', viewport.height - 70]] as const) {
      for (const mode of ['hover', 'keyboard'] as const) {
        await clear(); await position(term, y);
        if (mode === 'hover') await anchor.hover(); else await anchor.focus();
        await expect(tooltip).toBeVisible(); await expect(tooltip.locator(':scope > span').nth(1)).toHaveText(definition);
        await expect(anchor).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
        const box = (await tooltip.boundingBox())!, headerBottom = await stickyBottom();
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); expect(box.y).toBeGreaterThanOrEqual(headerBottom); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        const scroll = await tooltip.evaluate(el => ({ client: el.clientHeight, height: el.scrollHeight, tabIndex: (el as HTMLElement).tabIndex }));
        await capture(`real-term-${placement}-${mode}`, { termId, consumers, scroll, box, headerBottom, mode, placement });
        if (mode === 'keyboard') {
          if (scroll.height > scroll.client) { expect(scroll.tabIndex).toBe(0); await page.keyboard.press('Tab'); await expect(tooltip).toBeFocused(); await page.keyboard.press('End'); await expect.poll(() => tooltip.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop))).toBeLessThanOrEqual(1); }
          const bottom = await tooltip.evaluate(el => {
            const node = el.lastElementChild!.lastChild!, range = document.createRange(); range.setStart(node, Math.max(0, (node.textContent?.length ?? 0) - 1)); range.setEnd(node, node.textContent!.length);
            const last = range.getBoundingClientRect(), box = el.getBoundingClientRect();
            return { top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight, lastTop: last.top, lastBottom: last.bottom, panelTop: box.top, panelBottom: box.bottom };
          });
          expect(bottom.lastTop).toBeGreaterThanOrEqual(bottom.panelTop); expect(bottom.lastBottom).toBeLessThanOrEqual(bottom.panelBottom); expect(bottom.lastBottom).toBeLessThanOrEqual(viewport.height);
          await capture(`real-term-${placement}-keyboard-end`, { termId, bottom });
          await page.keyboard.press('Tab'); expect(await term.evaluate(el => el.contains(document.activeElement))).toBe(false); await expect(tooltip).not.toBeVisible();
        }
      }
    }
    await clear();
    const axe = await new AxeBuilder({ page }).include('#main-content').analyze(); states.push({ name: 'article-axe', violations: axe.violations, incomplete: axe.incomplete }); save(); expect(axe.violations).toEqual([]);
    await anchor.click(); await expect(page).toHaveURL(new RegExp('/glossary/?#' + termId + '$')); await page.evaluate(() => document.fonts.ready);
    const entry = page.locator(`[data-glossary-term="${termId}"]`); await expect(entry.locator('[data-glossary-definition]')).toHaveText(definition); await textCapture(entry, 'glossary-consumer');
    const glossaryAxe = await new AxeBuilder({ page }).include(`[data-glossary-term="${termId}"]`).analyze(); states.push({ name: 'glossary-axe', violations: glossaryAxe.violations, incomplete: glossaryAxe.incomplete }); save(); expect(glossaryAxe.violations).toEqual([]);
    await page.goBack(); await expect(page).toHaveURL(new RegExp(route.replaceAll('/', '\\/') + '(#ref-[^/]+)?$')); states.push({ name: 'history-return', activeElement: await page.evaluate(() => document.activeElement?.tagName), fullFocusRestorationAccepted: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); expect(errors).toEqual([]); expect(navigations).toHaveLength(3); expect(freshNavigations).toBeLessThanOrEqual(16); states.push({ name: 'scoped-axe', axe, freshNavigationBudgetPerCase: 3 }); save();
  });
}
