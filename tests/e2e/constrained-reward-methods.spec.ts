import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { getCitation } from '../../data/citations';

const targets = [
  ['The first approach reduces reward tuning', 'rewards-constraints-2024'],
  ['Dohyeong Kim and colleagues take a different', 'stagewise-cmorl-2024'],
  ['The second approach adapts reward weights', 'gain-adaptation-2025'],
] as const;

for (const width of [375, 1440]) {
  test(`Constrained reward source reader ${width}`, async ({ browser }, info) => {
    const height = width === 375 ? 812 : 900;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const directory = `${process.env.DR_READER_OUT ?? info.outputPath('readers')}/${process.env.DR_READER_RUN ?? 'reward'}/reward-${width}`;
    mkdirSync(directory, { recursive: true });
    const captures: object[] = [], measures: object[] = [], errors: string[] = [], external: string[] = [];
    const cdp = await context.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
      external.push(url.href); return route.abort();
    });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    async function capture(name: string) {
      const path = `${directory}/${name}.png`;
      await page.screenshot({ path, animations: 'disabled' });
      captures.push({ path, at: new Date().toISOString(), viewport: { width, height }, scrollY: await page.evaluate(() => scrollY), kind: 'unmodified viewport' });
    }
    async function slices(target: Locator, name: string) {
      await page.mouse.move(2, 2);
      const bounds = await target.evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; });
      for (let start = bounds.top, i = 0; start < bounds.bottom; start += height - 200, i++) {
        await page.evaluate(y => scrollTo({ top: Math.max(0, y - 100), behavior: 'instant' }), start);
        await capture(`${name}-${i}`);
      }
      measures.push({ name, bounds, stride: height - 200 });
    }
    async function fontProof(target: Locator, name: string) {
      await target.evaluate(e => e.setAttribute('data-reward-font-probe', 'current'));
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-reward-font-probe="current"]' });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const style = await target.evaluate(e => {
        const s = getComputedStyle(e), b = e.getBoundingClientRect();
        return { text: e.textContent, family: s.fontFamily, size: s.fontSize, lineHeight: s.lineHeight, color: s.color, left: b.left, right: b.right };
      });
      measures.push({ name, fonts, style });
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every(f => f.isCustomFont && /Tektur|Newsreader|IBM Plex (Sans|Mono)/.test(f.familyName))).toBe(true);
      await target.evaluate(e => e.removeAttribute('data-reward-font-probe'));
    }
    try {
      expect((await page.goto('/rl-sim2real/reward-design-mpc/', { waitUntil: 'networkidle' }))?.ok()).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await capture('article-top');
      await fontProof(page.locator('h1'), 'title');
      const prose = page.locator('div.prose[data-pagefind-body]');
      for (const [index, [start, id]] of targets.entries()) {
        const paragraph = prose.locator('p').filter({ hasText: start });
        await expect(paragraph).toHaveCount(1);
        await slices(paragraph, `prose-${index}`);
        await fontProof(paragraph, `prose-${index}`);
        const citation = getCitation(id)!;
        const chip = paragraph.locator(`[data-cite-id="${id}"]`), link = chip.locator('a').first();
        await expect(prose.locator(`[data-cite-id="${id}"]`)).toHaveCount(1);
        await expect(link).toHaveAttribute('href', citation.url);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener noreferrer/);
        await chip.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await link.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
        const tooltip = chip.getByRole('tooltip');
        let focusText = '';
        for (const state of ['focus', 'hover']) {
          if (state === 'hover') { await link.blur(); await link.hover(); }
          await expect(tooltip).toBeVisible();
          await expect(tooltip).toContainText(citation.title);
          if (state === 'focus') focusText = await tooltip.innerText();
          else expect(await tooltip.innerText()).toBe(focusText);
          const geometry = await tooltip.evaluate(e => {
            const b = e.getBoundingClientRect();
            const points = [[b.left + 3, b.top + 3], [b.right - 3, b.top + 3], [b.left + 3, b.bottom - 3], [b.right - 3, b.bottom - 3], [b.left + b.width / 2, b.top + b.height / 2]];
            return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth,
              hits: points.map(([x, y]) => { const h = document.elementFromPoint(x, y); return h === e || (h !== null && e.contains(h)); }) };
          });
          measures.push({ id, state, geometry });
          expect.soft(geometry.left).toBeGreaterThanOrEqual(0);
          expect.soft(geometry.right).toBeLessThanOrEqual(width);
          expect.soft(geometry.top).toBeGreaterThanOrEqual(width === 375 ? 56 : 0);
          expect.soft(geometry.bottom).toBeLessThanOrEqual(height);
          expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
          expect.soft(geometry.hits).toEqual([true, true, true, true, true]);
          if (state === 'focus') {
            const focus = await link.evaluate(e => { const s = getComputedStyle(e); return { visible: e.matches(':focus-visible'), width: s.outlineWidth, color: s.outlineColor }; });
            measures.push({ id, focus });
            expect(focus.visible).toBe(true);
            expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
            expect(focus.color).toBe('rgb(36, 95, 255)');
          }
          await capture(`cite-${index}-${state}`);
        }
        await page.mouse.move(2, 2); await link.focus(); await page.keyboard.press('Tab');
        const jump = chip.getByRole('link', { name: `Jump to the full reference for ${citation.title}`, exact: true });
        await expect(jump).toBeFocused();
        await page.keyboard.press('Enter');
        expect(new URL(page.url()).hash).toBe(`#ref-${id}`);
        const reference = page.locator(`[data-reference-id="${id}"]`);
        await expect(reference).toBeInViewport();
        const expand = reference.getByRole('button', { name: `Show all ${citation.authors.length} authors`, exact: true });
        if (await expand.count()) { await expand.focus(); await page.keyboard.press('Enter'); await expect(expand).toHaveCount(0); }
        await expect(reference.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
        const sourceLink = reference.getByRole('link', { name: citation.title, exact: true });
        await expect(sourceLink).toHaveAttribute('href', citation.url);
        await sourceLink.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
        await expect(sourceLink).toBeFocused();
        await sourceLink.blur();
        await slices(reference, `reference-${index}`);
        await fontProof(reference.locator('[data-author-names]'), `authors-${index}`);
        measures.push({ id, keyboardReferenceJump: true, fullOrderedAuthors: citation.authors, sourceUrl: citation.url });
      }
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).analyze();
      measures.push({ axeViolations: axe.violations, axeIncomplete: axe.incomplete });
      expect.soft(axe.violations).toEqual([]);
      expect(errors).toEqual([]); expect(external).toEqual([]);
    } finally {
      writeFileSync(`${directory}/observations.json`, JSON.stringify({ width, height, captures, measures, errors, external,
        scope: 'Assigned three source readers only; not whole-article, glossary, production, P1, full contrast or brand-rubric acceptance' }, null, 2));
      await context.close();
    }
  });
}
