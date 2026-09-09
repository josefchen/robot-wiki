import { test, expect } from './servo-apollo-fixture';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const route = '/data-hardware/industrial-deployment/';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`industrial cost and responsibility reader at ${viewport.width}px`, async ({ page }, testInfo) => {
    const captures: object[] = [];
    const placements: object[] = [];
    const errors: string[] = [];
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS ?? null;
    const inputSha256 = inputPath
      ? sha256(readFileSync(inputPath))
      : null;
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const capture = async (name: string, state: object = {}) => {
      const path = testInfo.outputPath(`${name}.png`);
      const capturedState = { ...state, scrollY: await page.evaluate(() => scrollY) };
      await page.screenshot({ path, animations: 'disabled' });
      captures.push({ path, sha256: sha256(readFileSync(path)),
        viewport, url: page.url(), utc: new Date().toISOString(), inputPath, inputSha256,
        testFile: testInfo.file, testFileSha256: sha256(readFileSync(testInfo.file)),
        state: capturedState, stateSha256: sha256(JSON.stringify(capturedState)) });
      writeFileSync(testInfo.outputPath('reader.json'), JSON.stringify({ captures, placements, errors }, null, 2));
    };
    await page.setViewportSize(viewport);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Industrial Deployment' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const documentNode = await cdp.send('DOM.getDocument');
    const fonts = [];
    for (const [selector, family] of [
      ['h1', 'Tektur'],
      ['div.prose[data-pagefind-body] > p', 'Newsreader'],
      ['nav[aria-label="Breadcrumb"] a', 'IBM Plex Sans'],
      ['[data-cite-id="evst-cell-cost-2026"] a', 'IBM Plex Mono'],
    ]) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const used = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.filter(f => f.glyphCount > 0);
      expect(used.some(f => f.familyName.includes(family)), `${selector}: ${family}`).toBe(true);
      expect(used.every(f => f.isCustomFont), `${selector}: no platform fallback`).toBe(true);
      fonts.push({ selector, family, used });
    }
    await cdp.detach();
    // The glossary now also names this dated source. Select the article's
    // full lead, not a substring repeated inside a dormant Term tooltip.
    const paragraph = prose.locator('p').filter({
      hasText: "EVST's July 15, 2026 commercial palletising-cell guide",
    });
    await expect(paragraph).toHaveCount(1);
    await expect(paragraph).toContainText('commercial palletising-cell guide', { useInnerText: true });
    await expect(paragraph).toContainText('application-specific end-of-arm tooling', { useInnerText: true });
    await expect(paragraph).not.toContainText('part fixtures', { useInnerText: true });
    const responsibility = prose.locator('p').filter({ hasText: "OSHA's Technical Manual, discussing" });
    await expect(responsibility).toHaveCount(1);
    await expect(responsibility).toContainText('Manufacturers or employers may also act as integrators', { useInnerText: true });
    await expect(responsibility).toContainText('risk assessment alone does not establish', { useInnerText: true });
    // This is a visible-prose oracle, not a textContent oracle over dormant
    // Term/Cite tooltips. A tooltip's own wording needs its own source audit.
    await expect(responsibility).not.toContainText('not the robot manufacturer', { useInnerText: true });
    await capture('page-identity', { httpStatus: response?.status(), title: await page.title(), fonts });
    for (const [name, element] of [['cost', paragraph], ['responsibility', responsibility]] as const) {
      await element.scrollIntoViewIfNeeded();
      const box = (await element.boundingBox())!;
      for (let offset = 0, i = 1; offset < box.height; offset += viewport.height - 180, i++) {
        await element.evaluate((e, y) => window.scrollBy(0, e.getBoundingClientRect().top - 100 + y), offset);
        await capture(`${name}-${i}`, { offset, text: await element.innerText() });
      }
    }
    for (const [id, parent] of [
      ['evst-cell-cost-2026', paragraph],
      ['osha-otm-robots', responsibility],
    ] as const) {
      const citation = CITATIONS.find(c => c.id === id)!;
      const byline = citation.authors.join(', ');
      const cites = parent.locator(`[data-cite-id="${id}"]`);
      await expect(cites).toHaveCount(1);
      const cite = cites.first();
      const link = cite.locator('a').first();
      await expect(link).toHaveAttribute('href', citation.url);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
      for (const placement of ['reading', 'lower-edge'] as const) {
        await cite.scrollIntoViewIfNeeded();
        await cite.evaluate((e, p) => window.scrollBy(0,
          e.getBoundingClientRect().top - (p === 'reading' ? innerHeight / 2 : innerHeight - 120)), placement);
        const tip = cite.getByRole('tooltip');
        await page.mouse.move(0, 0);
        await link.evaluate(e => e.blur());
        for (const mode of ['hover', 'focus'] as const) {
          if (mode === 'hover') await link.hover();
          else {
            await page.mouse.move(0, 0);
            await link.focus();
            await expect(link).toBeFocused();
          }
          await expect(tip).toBeVisible();
          await expect(tip).toContainText(citation.title);
          await expect(tip).toContainText(byline);
          const bounds = (await tip.boundingBox())!;
          const focusStyle = await link.evaluate(e => {
            const s = getComputedStyle(e);
            return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor };
          });
          const state = { id, placement, mode, bounds, byline, url: citation.url, focusStyle };
          placements.push(state);
          await capture(`${id}-${placement}-${mode}`, state);
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
          expect(bounds.y).toBeGreaterThanOrEqual(0);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
          if (mode === 'focus') {
            expect(focusStyle.outlineStyle).not.toBe('none');
            expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
          }
        }
      }
      await page.keyboard.press('Tab');
      const jump = cite.locator(`a[href="#ref-${id}"]`);
      await expect(jump).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toContainText(byline);
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      await page.mouse.move(0, 0);
      await jump.evaluate(e => e.blur());
      await reference.scrollIntoViewIfNeeded();
      await capture(`${id}-reference`, { text: await reference.innerText(), byline, url: citation.url });
    }
    const slider = prose.getByRole('slider', { name: /per-pick success/i });
    await slider.focus();
    const initial = await slider.inputValue();
    await page.keyboard.press('ArrowLeft');
    expect(Number(await slider.inputValue())).toBeLessThan(Number(initial));
    await capture('slider-keyboard', { initial, changed: await slider.inputValue() });
    await prose.getByRole('button', { name: /reset/i }).focus();
    await page.keyboard.press('Enter');
    await expect(slider).toHaveValue(initial);
    await capture('slider-reset', { initial, restored: await slider.inputValue() });
    if (viewport.width === 375) {
      const open = page.getByRole('button', { name: /open navigation/i });
      await open.focus(); await page.keyboard.press('Enter');
      const close = page.getByRole('button', { name: /close navigation/i });
      await expect(close).toBeFocused();
      expect(await page.locator('[inert]').count()).toBeGreaterThan(0);
      await page.keyboard.press('Shift+Tab');
      const last = await page.evaluate(() => document.activeElement?.outerHTML);
      const drawer = page.getByRole('dialog');
      await expect(drawer.locator(':focus')).toHaveCount(1);
      await page.keyboard.press('Tab'); await expect(close).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(drawer.locator(':focus')).toHaveCount(1);
      await expect(drawer.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(drawer.locator('[aria-current="page"]')).toHaveAttribute('href', /\/data-hardware\/industrial-deployment\/?$/);
      await capture('drawer-keyboard', { last, first: await page.evaluate(() => document.activeElement?.outerHTML) });
      await page.keyboard.press('Escape'); await expect(open).toBeFocused();
      await expect(page.locator('[inert]')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    await capture('checks-complete', { httpStatus: response?.status(), axeViolations: 0, errors });
    // The revealed definition is part of this paragraph's reader experience,
    // even though it is not part of the paragraph's visible text at rest.
    // Keep a genuine source-alignment failure red rather than hiding it by
    // changing the prose assertion from textContent to innerText.
    const term = responsibility.locator('[data-term-id="systems-integrator"]');
    const termLink = term.locator('a');
    await term.scrollIntoViewIfNeeded();
    await term.evaluate(e => window.scrollBy(0, e.getBoundingClientRect().top - innerHeight / 2));
    for (const mode of ['hover', 'focus'] as const) {
      if (mode === 'hover') await termLink.hover();
      else {
        await page.mouse.move(0, 0); await termLink.focus();
        await expect(termLink).toBeFocused();
      }
      const tip = term.getByRole('tooltip');
      await expect(tip).toBeVisible();
      const text = await tip.innerText();
      const bounds = (await tip.boundingBox())!;
      const focusStyle = await termLink.evaluate(e => {
        const s = getComputedStyle(e);
        return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor };
      });
      await capture(`systems-integrator-${mode}`, { mode, text, bounds, focusStyle });
      expect.soft(text, `revealed ${mode} definition must not contradict the corrected responsibility paragraph`)
        .not.toContain('not the robot manufacturer');
      // Positive source-backed scope is mandatory: deleting the definition
      // or replacing it with an empty disclaimer cannot repair this case.
      for (const supported of [
        'integrates a robot',
        'end-effectors, sensors, safeguarding and controls needed for an application',
        'Manufacturers or employers may also act as integrators.',
        "OSHA's Technical Manual, discussing ANSI/RIA R15.06-2012",
        'complete and document an application risk assessment before commissioning',
        'employers remain responsible for a safe workplace',
        "EVST's July 15, 2026 commercial palletising guide",
        'tooling, guarding, controls integration, commissioning and programming beyond the arm price.',
      ]) expect(text, `${mode}: ${supported}`).toContain(supported);
      expect(text).not.toMatch(/two to three|2\s*[-–]\s*3|sign-off|agreed cycle time|Under ISO/);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      if (mode === 'focus') {
        expect(focusStyle.outlineStyle).not.toBe('none');
        expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
      }
    }
    await capture('reader-result', { assertionErrors: testInfo.errors.map(e => e.message), errors });
  });
}
