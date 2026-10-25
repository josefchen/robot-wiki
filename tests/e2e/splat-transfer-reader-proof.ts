import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { CITE_MARK, citeParts, dismissCiteNote, jumpFromCiteMark, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';

const route = '/rl-sim2real/sim2real-transfer/';
const proseSelector = 'div.prose[data-pagefind-body]';
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/**
 * Bounded reader evidence, not a source audit or whole-article/brand seal.
 * Keep actual reporter outcomes separate from assertion completion: TestInfo.status
 * in a test's finally block can still be "passed" after an assertion has thrown.
 */
export async function splatTransferReaderProof(page: Page, info: TestInfo) {
  const steps: unknown[] = [];
  const captures: unknown[] = [];
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  let assertionsComplete = false;
  const view = page.viewportSize()!;
  const output = info.outputPath('bounded-reader.json');
  const errorListener = (error: Error) => errors.push(String(error));
  page.on('pageerror', errorListener);
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  async function settle() {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  async function center(locator: Locator) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await settle();
  }
  async function capture(state: string) {
    await settle();
    const path = info.outputPath(`${state}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    captures.push({
      state, path, sha256: sha(path), at: new Date().toISOString(),
      viewport: view, url: page.url(), scrollY: await page.evaluate(() => scrollY),
    });
  }
  async function contained(locator: Locator, state: string) {
    await expect(locator).toBeVisible();
    const geometry = await locator.evaluate(element => {
      const r = element.getBoundingClientRect();
      const samples = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2],
        [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2],
        [r.left + r.width / 2, r.top + r.height / 2]];
      return {
        x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
        unobscured: samples.map(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return hit === element || (hit !== null && element.contains(hit));
        }),
      };
    });
    steps.push({ state, geometry });
    expect(geometry.x, `${state} left`).toBeGreaterThanOrEqual(0);
    expect(geometry.right, `${state} right`).toBeLessThanOrEqual(view.width + 1);
    expect(geometry.y, `${state} below chrome`).toBeGreaterThanOrEqual(view.width === 375 ? 60 : 0);
    expect(geometry.bottom, `${state} bottom`).toBeLessThanOrEqual(view.height + 1);
    expect(geometry.scrollWidth, `${state} internal width`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.scrollHeight, `${state} full text`).toBeLessThanOrEqual(geometry.clientHeight + 1);
    expect(geometry.unobscured, `${state} hit testing`).toEqual([true, true, true, true, true]);
  }
  /**
   * The tooltip's containment, on its successor (Owner-approved successor,
   * Josef, 2026-10-10, the research-page standard): a citation note opened
   * inline at 375 px runs on after its number and wraps, so its box is a
   * set of line boxes. Each painted line must sit inside the viewport and
   * below the sticky top bar, and its two ends and middle must hit the note
   * itself; the note's whole text is rendered (no clipped overflow). A
   * margin note at 1440 px is one block box and meets the same checks.
   */
  async function noteContained(note: Locator, state: string) {
    await expect(note).toBeVisible();
    const geometry = await note.evaluate(element => {
      const bar = document.querySelector('[data-site-topbar]')!.getBoundingClientRect();
      const lines = [...element.getClientRects()].filter(r => r.width > 2 && r.height > 2);
      return {
        chromeBottom: bar.bottom,
        lines: lines.map(r => ({
          left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          unobscured: [[r.left + 2, r.top + r.height / 2], [r.right - 2, r.top + r.height / 2],
            [r.left + r.width / 2, r.top + r.height / 2]].map(([x, y]) => {
            const hit = document.elementFromPoint(x, y);
            return hit === element || (hit !== null && element.contains(hit));
          }),
        })),
        scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
      };
    });
    steps.push({ state, noteGeometry: geometry });
    expect(geometry.lines.length, `${state} painted lines`).toBeGreaterThan(0);
    for (const [index, line] of geometry.lines.entries()) {
      expect(line.left, `${state} line ${index} left`).toBeGreaterThanOrEqual(0);
      expect(line.right, `${state} line ${index} right`).toBeLessThanOrEqual(view.width + 1);
      expect(line.top, `${state} line ${index} below chrome`).toBeGreaterThanOrEqual(geometry.chromeBottom);
      expect(line.bottom, `${state} line ${index} bottom`).toBeLessThanOrEqual(view.height + 1);
      expect(line.unobscured, `${state} line ${index} hit testing`).toEqual([true, true, true]);
    }
    expect(geometry.scrollWidth, `${state} internal width`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.scrollHeight, `${state} full text`).toBeLessThanOrEqual(geometry.clientHeight + 1);
  }
  async function fontProof(selector: string) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    expect(nodeId, selector).toBeGreaterThan(0);
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const styles = await page.locator(selector).first().evaluate(element => {
      const s = getComputedStyle(element);
      const backgrounds = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        backgrounds.push({ tag: node.tagName, color: style.backgroundColor, image: style.backgroundImage });
      }
      return {
        text: element.textContent, family: s.fontFamily, size: s.fontSize,
        lineHeight: s.lineHeight, color: s.color, background: s.backgroundColor,
        transform: s.textTransform, backgrounds,
      };
    });
    steps.push({ selector, styles, platformFonts: fonts });
    expect(fonts.length, selector).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(font.isCustomFont, `${selector}: ${font.familyName}`).toBe(true);
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the brand-v2 families (Tektur, Newsreader, IBM Plex Sans
      // and Mono) gave way to DM Sans, Geist and Geist Mono (9154d672).
      expect(font.familyName).toMatch(/DM Sans|Geist|Geist Mono/);
    }
    await cdp.detach();
  }
  try {
    await page.goto(route, { waitUntil: 'networkidle' });
    await settle();
    await page.mouse.move(1, 1);
    await capture('survey-top');
    await fontProof('h1');
    const prose = page.locator(proseSelector);
    const stat = prose.getByTestId('splatsim-transfer-stat');
    await center(stat);
    await capture('corrected-stat');
    await contained(stat, 'corrected-stat');

    // Readable viewport slices, with overlap, cover the entire changed section.
    // Other section starts are a bounded survey, never full-article coverage.
    const heading = prose.getByRole('heading', { name: 'Real-to-sim: rebuild the scene, keep the physics', exact: true });
    const nextHeading = prose.getByRole('heading', { name: 'Levers behind successful transfer', exact: true });
    const section = await heading.evaluate((element, nextText) => {
      const next = [...document.querySelectorAll('h2')].find(node => node.textContent === nextText)!;
      return { top: element.getBoundingClientRect().top + scrollY, bottom: next.getBoundingClientRect().top + scrollY };
    }, await nextHeading.textContent());
    const stride = view.height - 160;
    for (let y = section.top - 90, index = 0; y < section.bottom - 90; y += stride, index++) {
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), y);
      await capture(`changed-section-${index}`);
    }
    steps.push({ changedSection: section, sliceStride: stride, visualCoverage: 'Changed section only; remaining article is a section-start survey.' });
    const sourceParagraphs = prose.locator('p').filter({ hasText: /^(SplatSim replaces mesh rendering|The setup uses a Robotiq|RoboGSim's August 2025 revision)/ });
    await expect(sourceParagraphs).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const paragraph = sourceParagraphs.nth(index);
      const measured = await paragraph.evaluate(element => {
        const s = getComputedStyle(element), r = element.getBoundingClientRect();
        return { text: element.textContent, x: r.x, right: r.right, size: s.fontSize, lineHeight: s.lineHeight };
      });
      steps.push({ paragraph: index, ...measured });
      expect(measured.x).toBeGreaterThanOrEqual(20);
      expect(measured.right).toBeLessThanOrEqual(view.width - 20);
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the 18 to 21 px Newsreader reading size became the
      // 16 px / 1.62 Geist reading body (data/type-roles.json).
      expect(parseFloat(measured.size)).toBe(16);
      expect(parseFloat(measured.lineHeight) / parseFloat(measured.size)).toBeCloseTo(1.62, 2);
    }

    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the chip, its hover/focus tooltip and its "Jump to the full
    // reference" link became a numbered mark with a sidenote
    // (helpers/citation-note.ts). The source link with its href, target and
    // rel is the note's author-year link; the tooltip is the note, shown by
    // pointer and by keyboard (inline at 375 px, standing in the margin at
    // 1440 px) with the same containment and equal rendered text; the focus
    // stop is the number, whose ring is the 1 px ink outline offset 2 px
    // (the retired ring was 2 px signal blue); and the number is the jump to
    // the References entry. Every number hydrates up front: a reference jump
    // is a hash navigation, which clears history.state, the hydration signal.
    for (const [id] of [['splatsim-2024'], ['robogsim-2024']] as const) {
      const marks = prose.locator(`[data-cite-id="${id}"]`).locator(CITE_MARK);
      for (let index = 0; index < await marks.count(); index++) await waitForHydration(marks.nth(index));
    }
    for (const [id, count] of [['splatsim-2024', 3], ['robogsim-2024', 1]] as const) {
      const citation = CITATIONS.find(item => item.id === id)!;
      const chips = prose.locator(`[data-cite-id="${id}"]`);
      await expect(chips).toHaveCount(count);
      for (let index = 0; index < count; index++) {
        const chip = chips.nth(index);
        const { mark, note: tooltip, source: link } = citeParts(chip);
        await expect(link).toHaveAttribute('href', citation.url);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener noreferrer/);
        await center(mark);
        await showCiteNote(page, chip, 'hover');
        await noteContained(tooltip, `${id}-${index}-hover`);
        const hoverText = await tooltip.innerText();
        if (index === count - 1) await capture(`${id}-hover`);
        await dismissCiteNote(page, chip, 'hover');
        await page.mouse.move(1, 1);
        await center(mark);
        await showCiteNote(page, chip, 'keyboard');
        await expect(mark).toBeFocused();
        await noteContained(tooltip, `${id}-${index}-focus`);
        // Both sides use rendered innerText: block boundaries add line breaks
        // that textContent intentionally lacks (recorded red in both viewports).
        await expect(tooltip).toHaveText(hoverText, { useInnerText: true });
        const focus = await mark.evaluate(element => {
          const s = getComputedStyle(element);
          return { visible: element.matches(':focus-visible'), width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset };
        });
        steps.push({ id, occurrence: index, focus });
        expect(focus.visible).toBe(true);
        expect(parseFloat(focus.width)).toBe(1);
        expect(parseFloat(focus.offset)).toBe(2);
        expect(focus.color).toBe('rgb(28, 28, 26)');
        if (index === count - 1) await capture(`${id}-focus`);
        await dismissCiteNote(page, chip, 'keyboard');
        // Only a note in running prose can stand in the margin, where the
        // number jumps. The SplatSim number under the stat card always opens
        // its note in place, so there the References entry is reached at the
        // number's own fragment, the target it carries for assistive
        // technology and readers without script.
        const prosed = await chip.evaluate(element =>
          element.closest('.prose > p, .prose > ul > li, .prose > ol > li, .prose > blockquote') !== null);
        let restore = async () => {};
        if (prosed) {
          restore = await jumpFromCiteMark(page, chip, id);
        } else {
          await expect(mark).toHaveAttribute('href', `#ref-${id}`);
          await page.goto(`${page.url().split('#')[0]}#ref-${id}`);
        }
        expect(new URL(page.url()).hash).toBe(`#ref-${id}`);
        const ref = page.locator(`[data-reference-id="${id}"]`);
        await expect(ref).toBeInViewport();
        steps.push({ id, occurrence: index, keyboardJump: true, url: page.url(),
          activeAfterJump: await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id })) });
        await restore();
        const expand = ref.getByRole('button', { name: `Show all ${citation.authors.length} authors`, exact: true });
        if (await expand.count()) { await expand.focus(); await expand.press('Enter'); }
        await expect(ref.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
        await expect(ref.getByRole('link', { name: citation.title, exact: true })).toHaveAttribute('href', citation.url);
        if (index === count - 1) {
          await page.mouse.move(1, 1);
          await center(ref);
          await contained(ref, `${id}-full-reference`);
          await capture(`${id}-full-reference`);
          await fontProof(`[data-reference-id="${id}"] [data-author-names]`);
        }
      }
    }
    // All section starts, not a misleading scaled-down full-page screenshot.
    const headings = prose.locator('h2');
    expect(await headings.count()).toBeGreaterThan(0);
    for (let index = 0; index < await headings.count(); index++) {
      await page.mouse.move(1, 1);
      await page.locator('body').click({ position: { x: view.width - 2, y: 2 } });
      await center(headings.nth(index));
      await capture(`survey-heading-${index}`);
    }
    for (const id of ['domain-randomization', 'system-identification', 'end-effector']) {
      const term = prose.locator(`[data-term-id="${id}"]`);
      await expect(term).toHaveCount(1);
      const link = term.locator('a'), tooltip = term.getByRole('tooltip');
      // Mobile hover starts independently of the prior definition's keyboard
      // focus; that still-open popup otherwise covers the next term's target.
      if (view.width === 375) await page.locator('h1').click();
      await center(link);
      await link.hover();
      await contained(tooltip, `${id}-definition-hover`);
      const text = await tooltip.innerText();
      await page.mouse.move(1, 1);
      await link.focus();
      await expect(link).toBeFocused();
      await contained(tooltip, `${id}-definition-focus`);
      await expect(tooltip).toHaveText(text, { useInnerText: true });
      // next/link applies the repository's trailingSlash:true route contract.
      await expect(link).toHaveAttribute('href', `/glossary/#${id}`);
      await capture(`${id}-definition`);
    }
    // Inspect actual displayed glyphs and roles, rather than document.fonts.status alone.
    await fontProof(`${proseSelector} > p`);
    // CDP reports this node's text runs, not arbitrary nested descendants.
    // The wrapper's zero font runs were a harness target defect, not missing fonts.
    for (const child of [1, 2, 3]) {
      await fontProof(`[data-testid="splatsim-transfer-stat"] > div > div:nth-child(${child})`);
    }
    const equations = {
      display: await page.locator('.katex-display').count(),
      inline: await page.locator('.katex').count(),
      mathml: await page.locator('math').count(),
    };
    steps.push({ equations, notApplicableReason: 'This rendered article has no display, inline KaTeX, or MathML equations; prose numbers and authored chart labels are not equation checks.' });
    expect(equations).toEqual({ display: 0, inline: 0, mathml: 0 });
    await page.keyboard.press('Tab');
    await page.mouse.move(1, 1);
    const axe = await new AxeBuilder({ page }).include('article').analyze();
    steps.push({ axe: { violations: axe.violations, incomplete: axe.incomplete } });
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    assertionsComplete = true;
  } finally {
    const inputPath = process.env.DR_READER_OUT && `${process.env.DR_READER_OUT}/${process.env.DR_READER_RUN}.inputs.json`;
    writeFileSync(output, JSON.stringify({
      identity: info.title, viewport: view, steps, captures, errors, consoleErrors, assertionsComplete,
      ...(inputPath ? { input: { path: inputPath, sha256: sha(inputPath) } } : {}),
      limits: [
        'Reporter terminal outcome governs test status; assertion completion does not erase prior failures.',
        'No source retrieval, new source certification, whole-article/P1 acceptance, production export, or brand acceptance.',
        'Axe incompletes remain unresolved; selected platform fonts do not establish corpus-wide cmap coverage.',
        'Inherited chart contrast and tiny SVG labels retain their existing owners.',
      ],
    }, null, 2) + '\n');
    await info.attach('bounded-reader', { path: output, contentType: 'application/json' });
    page.off('pageerror', errorListener);
  }
}
