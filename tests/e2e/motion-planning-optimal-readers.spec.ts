import { test, expect, type Page, type Locator } from './helpers/motion-planning-offline-fixture';
import type { TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { ownedEvidencePath } from './helpers/keypoint-reader-oracle';
import { readerGateInputs } from './helpers/reader-gate-inputs';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';
import { collectBrowserReferenceFeatures, type BrowserReferenceFeatureConfig } from '../../lib/brand-v2-reference-rubric';
import { citeNoteEnd, citeParts, dismissCiteNote, expectCiteNoteFacts, jumpFromCiteMark, showCiteNote } from './helpers/citation-note';

const ROUTE = '/classical/motion-planning/';
const PROSE = 'div.prose[data-pagefind-body]';
// Pinned from inspected registry metadata, not from citationMeta or rendered output.
// These are reader expectations, not a fresh bibliographic/source certification.
const SOURCES = [
  { id: 'karaman-frazzoli-2011', count: 6, title: 'Sampling-based Algorithms for Optimal Motion Planning',
    authors: ['Sertac Karaman', 'Emilio Frazzoli'], year: 2011, venue: 'arXiv preprint',
    meta: 'Sertac Karaman, Emilio Frazzoli, arXiv preprint, 2011', url: 'https://arxiv.org/abs/1105.1186' },
  { id: 'gammell-2014', count: 2, title: 'Informed RRT*: Optimal Sampling-based Path Planning Focused via Direct Sampling of an Admissible Ellipsoidal Heuristic',
    authors: ['Jonathan D. Gammell', 'Siddhartha S. Srinivasa', 'Timothy D. Barfoot'], year: 2014, venue: 'IROS 2014',
    meta: 'Jonathan D. Gammell, Siddhartha S. Srinivasa, Timothy D. Barfoot, IROS 2014', url: 'https://arxiv.org/abs/1404.2334' },
  { id: 'ompl-2012', count: 1, title: 'The Open Motion Planning Library',
    authors: ['Ioan A. Șucan', 'Mark Moll', 'Lydia E. Kavraki'], year: 2012, venue: 'IEEE Robotics & Automation Magazine',
    meta: 'Ioan A. Șucan, Mark Moll, Lydia E. Kavraki, IEEE Robotics & Automation Magazine, 2012', url: 'https://doi.org/10.1109/MRA.2012.2205651' },
] as const;
const DEFINITIONS = {
  'trajectory-optimization': 'Trajectory optimization is motion planning by numerically optimizing a candidate trajectory. CHOMP pairs a dynamics prior with a workspace arc-length obstacle cost, using inverse-metric covariant updates. TrajOpt uses sequential convex subproblems, nonlinear constraint penalties and a trust region that can expand or shrink. Such local optimization can fail and depends on its initial trajectory. Ratliff et al. describe refining a feasible PRM/RRT path; Schulman et al. also study planning from infeasible seeds. Neither source shows this is the standard industrial pipeline, and their collision-handling assumptions are not unconditional safety guarantees.',
  'configuration-space': 'Configuration space is the space of a robot\'s configurations, one point per complete joint assignment; a 7-DoF arm moves through a 7-dimensional space with joint angles as coordinates. Lozano-Pérez introduced the planning formulation in 1983: shrink the robot to a point and grow obstacles by its shape, making collision-free motion a path through free space. Geometric motion planning searches it for paths. A kinodynamic planner can instead use a state that includes both configuration and velocity.',
  'degrees-of-freedom': 'Degrees of freedom are the number of independent coordinates needed to specify a mechanism\'s configuration; an arm has one per independent joint. A 7-DoF arm has one redundant coordinate beyond the six a rigid end-effector pose needs, so its elbow can reconfigure while the hand stays put. More degrees of freedom buy dexterity and obstacle avoidance at the price of a larger control problem.',
} as const;

function evidence(page: Page, info: TestInfo) {
  const { root, inputPath } = readerGateInputs(info, 'motion-planning');
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

async function openReader(page: Page) {
  expect((await page.goto(ROUTE))?.status()).toBe(200);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
}

test('optimal corrections retain qualifications, three repaired display blocks and bounded math', async ({ page }, info) => {
  const e = evidence(page, info); await openReader(page);
  // Owner-approved successor (Josef, 2026-10-10, the research-page standard):
  // DM Sans, Geist and Geist Mono replace Tektur, Newsreader and the IBM Plex
  // faces. The header's citation count is now muted Geist on the meta line,
  // so the interface role is read from it and the figure's control, and the
  // mono role from the RRT figure's node readout. Each role is matched as the
  // first family of its stack, so Geist Mono cannot pass for Geist.
  const roles = await page.evaluate(() => ['article h1', 'div.prose[data-pagefind-body] > p', '[data-testid="rrt-grow"]', '[data-header-citation-count]', '[data-testid="rrt-node-readout"]'].map((selector) => {
    const element = document.querySelector(selector)!;
    const cs = getComputedStyle(element); return { selector, family: cs.fontFamily, size: cs.fontSize, lineHeight: cs.lineHeight, loaded: document.fonts.check('16px ' + cs.fontFamily.split(',')[0]) };
  }));
  e.record({ name: 'five-font-roles', roles });
  for (const [index, family] of [/^"?DM Sans"?,/, /^"?Geist"?,/, /^"?Geist"?,/, /^"?Geist"?,/, /^"?Geist Mono"?,/].entries()) {
    expect(roles[index].loaded).toBe(true); expect(roles[index].family).toMatch(family);
  }
  await e.capture('article-top', { roles });
  // The top bar carries the identity and the shell at every width; the
  // desktop sidebar it replaced is gone.
  const measurements = await page.evaluate(collectBrowserReferenceFeatures, {
    surfaceKind: 'article', identitySelector: 'header a[href="/"]',
    descriptorRequired: false, primarySelector: 'article h1', supportingSelector: 'article h2',
    bodySelector: `${PROSE} > p`, shellSelector: 'header', proseSelector: PROSE,
    alternateSymbolSelector: '[data-brand-symbol]', repeatedModuleSelector: 'article section',
  } satisfies BrowserReferenceFeatureConfig);
  e.record({ name: 'reference-feature-measurements', measurements, acceptance: 'Collected, not a reference pass; evaluate every locked anchor independently.' });
  const prose = page.locator(PROSE);
  const groups = [
    ['forest-building version', 'rejects connections inside a connected component', 'Fixed-radius sPRM, which allows them, is asymptotically optimal'],
    ['least-cost parent selection and rewiring', 'cheapest collision-free parent among nearby vertices', 'neighbors reattach to it only when that lowers their cost'],
    ['two sufficient bounds', 'the conservative one is'],
    ['bounded Euclidean domain', 'which excludes differential constraints', 'weak clearance', 'bounded-variation norm'],
    ['so a finite budget can return a suboptimal path', 'measure zero', 'within a constant factor of RRT', 'collision checks per iteration'],
    ['This prolate hyperspheroid', 'contains every state on a strictly improving path', 'need not be collision-free', '100 runs per variation', '60 seconds', 'it gains nothing once the set covers the domain'],
    ['The library implements PRM and RRT', 'includes benchmarking tools', 'external collision checkers and visualizers'],
  ];
  for (const [index, expected] of groups.entries()) {
    const paragraph = prose.locator(':scope > p').filter({ hasText: expected[0] });
    await expect(paragraph).toHaveCount(1);
    for (const text of expected) await expect(paragraph).toContainText(text);
    await e.textCapture(paragraph, `qualified-prose-${index}`);
  }
  const displays = prose.locator('.katex-display');
  await expect(displays).toHaveCount(7);
  const repaired = [
    String.raw`r_n = \min\!\left\{\eta,\; \gamma\left(\frac{\log n}{n}\right)^{1/d}\right\},`,
    String.raw`\mathbb{P}\!\left(\lim_{n\to\infty}c_n=c^*\right)=1.`,
    String.raw`\hat{X}_f=\left\{x:\lVert x-x_{start}\rVert_2+\lVert x-x_{goal}\rVert_2\leq c_{best}\right\}.`,
  ];
  for (const [index, expected] of repaired.entries()) await expect(displays.nth(index + 2).locator('annotation')).toHaveText(expected);
  for (let index = 0; index < await displays.count(); index++) {
    const equation = displays.nth(index); await e.position(equation);
    await expect(equation).toHaveAttribute('role', 'region'); await expect(equation).toHaveAttribute('aria-label', `Display equation ${index + 1}`);
    await expect(equation).toHaveAttribute('tabindex', '0');
    const geometry = await equation.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight, source: el.querySelector('annotation')!.textContent }));
    e.record({ name: 'equation-geometry', index, ...geometry });
    await equation.focus(); await expect(equation).toBeFocused(); await e.capture(`equation-${index}-start`, { geometry });
    if (geometry.scrollWidth > geometry.width) {
      // Chromium's horizontal region is controlled with ArrowRight, not assumed End behavior.
      for (let step = 0; step < 40 && await equation.evaluate(el => el.scrollLeft + el.clientWidth < el.scrollWidth - 1); step++) await page.keyboard.press('ArrowRight');
      await expect.poll(() => equation.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await expect.poll(() => equation.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThanOrEqual(1);
      await e.capture(`equation-${index}-end`, { scrollLeft: await equation.evaluate(el => el.scrollLeft) });
    }
    await page.keyboard.press('Tab'); await expect(equation).not.toBeFocused();
  }
  const inline = prose.locator('.katex:not(.katex-display .katex)');
  expect(await inline.count()).toBeGreaterThan(10);
  for (let index = 0; index < await inline.count(); index++) {
    const equation = inline.nth(index); await e.position(equation);
    const geometry = await equation.evaluate(el => ({ source: el.querySelector('annotation')?.textContent, bases: [...el.querySelectorAll('.katex-html > .base')].map(base => { const b = base.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; }) }));
    e.record({ name: 'inline-equation-geometry', index, ...geometry });
    expect(geometry.bases.length).toBeGreaterThan(0);
    for (const box of geometry.bases) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width); }
  }
  const text = await prose.evaluate(el => { const clone = el.cloneNode(true) as HTMLElement; clone.querySelectorAll('.katex-mathml').forEach(n => n.remove()); return clone.textContent ?? ''; });
  expect(text).not.toMatch(/\$\$|\\mathcal|\\gamma|\\widehat|\\mathbb/);
  await expect(prose.locator('.katex-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await e.clear(); await e.axe('#main-content', 'math-reader-axe');
});

test('all affected optimal and OMPL citation occurrences expose bounded metadata and References', async ({ page }, info) => {
  const e = evidence(page, info); await openReader(page);
  const viewport = page.viewportSize()!, prose = page.locator(PROSE);
  for (const source of SOURCES) {
    const roots = prose.locator(`[data-cite-id="${source.id}"]`); await expect(roots).toHaveCount(source.count);
    for (let occurrence = 0; occurrence < source.count; occurrence++) {
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the chip's hover/focus tooltip became the numbered
      // citation's sidenote. Its title, venue line, source link and
      // description are read off the note (helpers/citation-note.ts); the note
      // must sit whole inside the viewport below the top bar at each
      // placement, never scroll, and end inside its own box; the tooltip's
      // Escape is the number pressed again, which an inline note closes on
      // and a margin note, at rest, has no use for.
      const root = roots.nth(occurrence), { mark: trigger, note: tip } = citeParts(root);
      for (const [placement, y] of [['top', (await e.stickyBottom()) + 24], ['middle', viewport.height / 2], ['bottom', viewport.height - 70]] as const) {
        for (const mode of ['hover', 'keyboard'] as const) {
          await e.clear(); await e.position(root, y);
          const inMargin = await showCiteNote(page, root, mode);
          await expectCiteNoteFacts(page, root, source);
          const scroll = await e.popupGeometry(tip);
          expect(scroll.height).toBeLessThanOrEqual(scroll.client + 1);
          await e.capture(`${source.id}-${occurrence}-${placement}-${mode}`, { id: source.id, occurrence, placement, mode, scroll, inMargin });
          if (mode === 'keyboard') {
            const end = await citeNoteEnd(tip); e.record({ name: 'note-end-geometry', ...end });
            expect(end.lastText.length).toBeGreaterThan(0); expect(end.rects.length).toBeGreaterThan(0);
            for (const rect of end.rects) {
              expect(rect.top).toBeGreaterThanOrEqual(end.panel.top - 0.5); expect(rect.bottom).toBeLessThanOrEqual(end.panel.bottom + 0.5);
              expect(rect.left).toBeGreaterThanOrEqual(end.panel.left - 0.5); expect(rect.right).toBeLessThanOrEqual(end.panel.right + 0.5);
            }
            await dismissCiteNote(page, root, 'keyboard'); await expect(trigger).toBeFocused();
            if (!inMargin) await expect(tip).not.toBeVisible();
          } else await dismissCiteNote(page, root, 'hover');
        }
      }
    }
    await e.clear();
    const restore = await jumpFromCiteMark(page, roots.first(), source.id);
    const reference = page.locator(`[data-reference-id="${source.id}"]`);
    await expect(reference.locator('[data-author-names]')).toHaveText(source.authors.join(', '));
    await expect(reference.locator('p').first()).toHaveText(source.meta + '.');
    await expect(reference.locator('p').last()).toHaveText(source.url);
    const external = reference.getByRole('link', { name: source.title, exact: true });
    await expect(external).toHaveAttribute('href', source.url); await expect(external).toHaveAttribute('rel', 'noopener noreferrer'); await expect(external).toHaveAttribute('target', '_blank');
    await e.textCapture(reference, `${source.id}-full-reference`);
    e.record({ name: 'reference-recovery', id: source.id, authors: source.authors, authorCount: source.authors.length, expansionRequired: false, sourceFollowed: false });
    await restore();
    await page.goBack(); await expect(page).toHaveURL(new RegExp(ROUTE + '$'));
    e.record({ name: 'citation-return', id: source.id, url: page.url(), focus: await page.evaluate(() => document.activeElement?.tagName), focusRestorationAccepted: false });
  }
  // The References list the cited sources in citation order and then the
  // frontmatter's uncited sources under "Further reading"
  // (components/article/references.tsx, lib/reference-order.ts). The length
  // cut fa85511f (2026-10-13) left eleven of the sources this list first
  // pinned without an inline citation, so they now follow the cited ones,
  // and a4b72c6f (2026-10-12) added ariadne-2026. Every earlier id is still
  // in the bibliography, exactly once and in this order.
  const expectedIds = [
    'lozano-perez-1983', 'kavraki-1996', 'lavalle-1998', 'lavalle-kuffner-2001', 'karaman-frazzoli-2011',
    'gammell-2014', 'ratliff-2009', 'schulman-2013', 'lavalle-2006', 'ompl-2012', 'solovey-complexity-2020',
    'rrt-connect-2000', 'orthey-review-2023', 'vamp-2023', 'ompl-release-notes-2026', 'gcs-2022', 'chomp-ijrr-2013',
    'curobo-2023', 'hauser-shortcut-2010', 'moveit-trajectory-processing-2026', 'moveit-time-parameterization-2026',
    'moveit-pro-10-1-2026', 'mpinets-2022', 'deep-reactive-policy-2025', 'mayne-2000', 'diffusion-policy-2023',
    'totg-2012', 'ruckig-2021', 'curobo-v2-2026', 'neural-motion-planner-survey-2026',
    // Further reading.
    'ariadne-2026', 'mcvamp-2026', 'flask-2026', 'prrtc-2025', 'ompl-2-2026', 'fmt-star-2013', 'bit-star-2017',
    'aorrtc-2025', 'stomp-2011', 'trajopt-ijrr-2014', 'industrial-curobo-2025', 'mr-pop-2026', 'neural-mp-2024',
  ];
  expect(await page.locator('[data-reference-id]').evaluateAll(els => els.map(el => el.getAttribute('data-reference-id')))).toEqual(expectedIds);
  await e.textCapture(page.locator('section[aria-labelledby="references-heading"]'), 'complete-references');
  await e.clear(); await e.axe('#main-content', 'citation-reader-axe');
});

test('actual RRT controls, disclosure and compact navigation remain keyboard operable', async ({ page }, info) => {
  const e = evidence(page, info); await openReader(page);
  // Owner-approved successor (Josef, 2026-10-10, the research-page standard):
  // the phone menu button became the top bar's "Articles" button, which opens
  // the same navigation dialog.
  const menu = page.getByRole('button', { name: 'Articles', exact: true });
  if (page.viewportSize()!.width === 375) {
    await menu.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    const close = dialog.getByRole('button', { name: 'Close navigation menu' }); await expect(close).toBeFocused();
    await expect(dialog.getByRole('link', { name: 'Motion Planning', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(dialog.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
    await page.keyboard.press('Shift+Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab'); await expect(close).toBeFocused(); await e.capture('mobile-drawer');
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(menu).toBeFocused();
  }
  const scene = page.getByTestId('rrt-scene'), container = scene.locator('xpath=ancestor::*[@data-brand-module-signature="instrument-frame"][1]'), slider = page.getByRole('slider', { name: /exploration iteration/i });
  // At settle the main view shows the grow button and the slider; the fold holds the other two buttons.
  await expect(container.getByRole('slider')).toHaveCount(1); await expect(container.getByRole('button')).toHaveCount(1);
  await expect(container.getByRole('button', { includeHidden: true })).toHaveCount(3);
  await expect(container.getByRole('radio')).toHaveCount(0); await expect(container.getByRole('tab')).toHaveCount(0);
  await e.textCapture(container, 'rrt-default');
  // The figure opens on the finished tree; Step forward, Reset and the readouts sit in "Adjust more".
  await expect(slider).toHaveValue('288'); await expect(page.getByTestId('rrt-path')).toBeVisible();
  await openAdjustMore(container);
  await slider.focus(); await page.keyboard.press('Home'); await expect(page.getByTestId('rrt-node-readout')).toHaveText('1');
  await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('rrt-node-readout')).toHaveText('2');
  await page.keyboard.press('End'); await expect(slider).toHaveValue('288'); await expect(page.getByTestId('rrt-node-readout')).toHaveText('289');
  await expect(page.getByTestId('rrt-path')).toBeVisible(); await expect(container.getByRole('button', { name: 'Step forward' })).toBeDisabled();
  await e.textCapture(container, 'rrt-completed');
  await slider.focus(); await page.keyboard.press('Home'); await expect(page.getByTestId('rrt-path')).toHaveCount(0);
  const reset = container.getByRole('button', { name: 'Reset', exact: true }); await reset.focus(); await page.keyboard.press('Enter');
  await expect(slider).toHaveValue('288'); await expect(page.getByTestId('rrt-node-readout')).toHaveText('289'); await expect(page.getByTestId('rrt-path')).toBeVisible();
  await e.textCapture(container, 'rrt-reset');
  // Two figure folds plus the data disclosure inside "How this was made".
  await expect(container.locator('details')).toHaveCount(3);
  await openHowThisWasMade(container);
  const details = container.locator('details[data-chart-data]'); await expect(details).toHaveCount(1);
  await details.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(details).toHaveAttribute('open', '');
  await e.textCapture(details, 'rrt-disclosure'); await details.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(details).not.toHaveAttribute('open', '');
  e.record({ name: 'control-inventory', sliders: 1, buttons: 3, disclosures: 3, radios: 0, tabs: 0, selfChecks: await page.locator('[data-self-check]').count(), authoredOriginal15Complete: false });
  await e.axe('#main-content', 'controls-reader-axe');
});

test('all mounted glossary terms expose their literal final text and keyboard exit', async ({ page }, info) => {
  const e = evidence(page, info); await openReader(page); const viewport = page.viewportSize()!;
  await expect(page.locator(`${PROSE} [data-term-id]`)).toHaveCount(3);
  for (const [termId, definition] of Object.entries(DEFINITIONS)) {
    const root = page.locator(`${PROSE} [data-term-id="${termId}"]`), anchor = root.locator('a'), tip = root.getByRole('tooltip');
    for (const [placement, y] of [['top', (await e.stickyBottom()) + 24], ['middle', viewport.height / 2], ['bottom', viewport.height - 70]] as const) {
      for (const mode of ['hover', 'keyboard'] as const) {
        await e.clear(); await e.position(root, y); if (mode === 'hover') await anchor.hover(); else await anchor.focus();
        await expect(tip).toBeVisible(); await expect(tip.locator(':scope > span').nth(1)).toHaveText(definition);
        await expect(anchor).toHaveAttribute('aria-describedby', (await tip.getAttribute('id'))!);
        const scroll = await e.popupGeometry(tip); await e.capture(`${termId}-${placement}-${mode}`, { termId, placement, mode, scroll });
        if (mode === 'keyboard') {
          if (scroll.height > scroll.client) { expect(scroll.tabIndex).toBe(0); await page.keyboard.press('Tab'); await expect(tip).toBeFocused(); await page.keyboard.press('End'); await expect.poll(() => tip.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop))).toBeLessThanOrEqual(1); }
          const end = await e.endGeometry(tip); await e.capture(`${termId}-${placement}-end`, { termId, end });
          await page.keyboard.press('Tab'); expect(await root.evaluate(el => el.contains(document.activeElement))).toBe(false); await expect(tip).not.toBeVisible();
        }
      }
    }
  }
  await e.clear(); const termId = 'trajectory-optimization';
  await page.locator(`${PROSE} [data-term-id="${termId}"] a`).click(); await expect(page).toHaveURL(new RegExp('/glossary/?#' + termId + '$'));
  await page.evaluate(() => document.fonts.ready);
  const entry = page.locator(`[data-glossary-term="${termId}"]`); await expect(entry.locator('[data-glossary-definition]')).toHaveText(DEFINITIONS[termId]);
  await e.textCapture(entry, 'glossary-destination'); await e.axe(`[data-glossary-term="${termId}"]`, 'glossary-destination-axe');
  await page.goBack(); await expect(page).toHaveURL(new RegExp(ROUTE + '$'));
  e.record({ name: 'glossary-return', focus: await page.evaluate(() => document.activeElement?.tagName), focusRestorationAccepted: false });
  await e.clear(); await e.axe('#main-content', 'glossary-reader-axe');
});
