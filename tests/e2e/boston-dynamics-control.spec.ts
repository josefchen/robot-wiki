import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { getCitation } from '../../data/citations';
import { getTerm } from '../../data/glossary';

const targets = {
  'legged-locomotion': [
    ['Boston Dynamics describes a specific production lineage', 'bd-spot-rl-2024'],
    ['In its 2024 account, Boston Dynamics', 'bd-spot-rl-2024'],
    ['The reported evaluation process', 'bd-spot-rl-2024'],
    ['On March 19, 2025', 'rai-atlas-rl-2025'],
    ['In August 2025, Boston Dynamics', 'bd-atlas-lbm-2025'],
  ],
  'reward-design-mpc': [
    ['Boston Dynamics describes a source-specific hybrid arrangement', 'bd-spot-rl-2024'],
    ['Boston Dynamics describes a source-specific hybrid arrangement', 'bd-atlas-lbm-2025'],
  ],
} as const;

for (const width of [375, 1440]) for (const slug of ['legged-locomotion', 'reward-design-mpc'] as const) {
  test(`Boston control source reader ${slug} ${width}`, async ({ browser }, info) => {
    const height = width === 375 ? 812 : 900;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const directory = `${process.env.DR_READER_OUT ?? info.outputPath('readers')}/${process.env.DR_READER_RUN ?? 'boston'}/${slug}-${width}`;
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
      await page.screenshot({ path });
      captures.push({ path, viewport: { width, height }, scrollY: await page.evaluate(() => scrollY), kind: 'actual viewport; no stitching or retouching' });
    }
    async function slices(target: Locator, name: string) {
      await page.mouse.move(2, 2);
      const box = await target.evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; });
      for (let start = box.top, i = 0; start < box.bottom; start += height - 200, i++) {
        await page.evaluate(y => scrollTo({ top: Math.max(0, y - 100), behavior: 'instant' }), start);
        await capture(`${name}-${i}`);
      }
    }
    async function glyphs(target: Locator, name: string) {
      await target.evaluate(e => e.setAttribute('data-boston-glyph', 'current'));
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-boston-glyph="current"]' });
      const fonts = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
      const style = await target.evaluate(e => {
        const s = getComputedStyle(e);
        return { text: e.textContent, fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.color };
      });
      measures.push({ name, fonts, ...style });
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every(f => f.isCustomFont)).toBe(true);
      await target.evaluate(e => e.removeAttribute('data-boston-glyph'));
    }
    try {
      expect((await page.goto(`/rl-sim2real/${slug}/`, { waitUntil: 'networkidle' }))?.ok()).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const prose = page.locator('div.prose[data-pagefind-body]');
      const seen = new Set<string>();
      for (const [start, id] of targets[slug]) {
        const paragraph = prose.locator('p').filter({ hasText: start });
        await expect(paragraph).toHaveCount(1);
        if (!seen.has(start)) {
          await slices(paragraph, `prose-${seen.size}`);
          await glyphs(paragraph, `prose-${seen.size}`);
          seen.add(start);
        }
        const chip = paragraph.locator(`[data-cite-id="${id}"]`), link = chip.locator('a').first();
        await chip.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await link.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
        const tooltip = chip.getByRole('tooltip');
        for (const state of ['keyboard-focus', 'hover']) {
          if (state === 'hover') { await link.blur(); await link.hover(); }
          await expect(tooltip).toBeVisible();
          const box = await tooltip.boundingBox();
          expect.soft(box!.x).toBeGreaterThanOrEqual(0);
          expect.soft(box!.x + box!.width).toBeLessThanOrEqual(width);
          expect.soft(box!.y).toBeGreaterThanOrEqual(width === 375 ? 56 : 0);
          expect.soft(box!.y + box!.height).toBeLessThanOrEqual(height);
          await expect(link).toHaveAttribute('href', getCitation(id)!.url);
          await expect(tooltip).toContainText(getCitation(id)!.title);
          measures.push({ start, id, state, box, focusVisible: await link.evaluate(e => e.matches(':focus-visible')) });
          await capture(`cite-${targets[slug].findIndex(t => t[0] === start && t[1] === id)}-${state}`);
        }
        await page.mouse.move(2, 2); await link.blur();
      }
      for (const id of [...new Set(targets[slug].map(t => t[1]))]) {
        const reference = page.locator(`[data-reference-id="${id}"]`);
        await expect(reference).toContainText(getCitation(id)!.title);
        const authors = reference.locator('[data-author-names]');
        await expect(authors).toHaveText(getCitation(id)!.authors.join(', '));
        await slices(reference, `reference-${id}`); await glyphs(authors, `authors-${id}`);
      }
      const termId = slug === 'legged-locomotion' ? 'flow-matching' : 'mpc';
      const term = prose.locator(`[data-term-id="${termId}"]`).first(), termLink = term.locator('a').first();
      await term.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await termLink.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      await expect(termLink).toBeFocused();
      await expect(term.getByRole('tooltip')).toContainText(getTerm(termId)!.definition);
      await capture('glossary-inline-keyboard');
      await termLink.blur(); await termLink.hover();
      await expect(term.getByRole('tooltip')).toContainText(getTerm(termId)!.definition);
      await capture('glossary-inline-hover');
      await page.mouse.move(2, 2); await termLink.blur();
      if (slug === 'reward-design-mpc') {
        const panel = page.getByTestId('quad-preview').locator('..');
        const torque = panel.getByRole('slider', { name: /torque/i });
        await torque.focus(); await page.keyboard.press('End');
        await expect(page.getByTestId('behavior-status')).toContainText(/freeze/i);
        await page.getByTestId('behavior-status').evaluate(e => e.scrollIntoView({ block: 'center' }));
        await capture('reward-control-changed');
        await panel.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByTestId('behavior-status')).toContainText(/balanced/i);
        await capture('reward-control-reset');
      }
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).analyze();
      measures.push({ axeViolations: axe.violations, axeIncomplete: axe.incomplete });
      expect.soft(axe.violations).toEqual([]);
      expect(errors).toEqual([]); expect(external).toEqual([]);
    } finally {
      writeFileSync(`${directory}/observations.json`, JSON.stringify({ width, height, slug, captures, measures, errors, external,
        scope: 'Current source-specific development proof; not whole-P1, production export, full-state or brand-rubric acceptance' }, null, 2));
      await context.close();
    }
  });
}

test('Miki mobile source and hike closeout is unobscured and earns zero original credit', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/rl-sim2real/legged-locomotion/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const directory = `${process.env.DR_READER_OUT ?? info.outputPath('readers')}/${process.env.DR_READER_RUN ?? 'boston'}/miki-375`;
  mkdirSync(directory, { recursive: true });
  const captures: object[] = [];
  const p = page.locator('p').filter({ hasText: 'Miki and colleagues combined' });
  await expect(p).toContainText("planner's 76 minutes");
  await expect(p).toContainText('reattach a shoe and swap batteries');
  const targets = [page.getByText('78 min', { exact: true }).locator('..'), p];
  for (let i = 0; i < targets.length; i++) {
    const bounds = await targets[i].evaluate(e => { const r=e.getBoundingClientRect(); return { top:r.top+scrollY, bottom:r.bottom+scrollY }; });
    for (let y = bounds.top, part = 0; y < bounds.bottom; y += 612, part++) {
      await page.evaluate(top => scrollTo({ top: Math.max(0, top - 100), behavior: 'instant' }), y);
      const path = `${directory}/target-${i}-${part}.png`; await page.screenshot({ path });
      captures.push({ path, bounds, viewport: { width:375, height:812 }, scrollY:await page.evaluate(()=>scrollY) });
    }
  }
  const chip=p.locator('[data-cite-id="miki-2022"]'), link=chip.locator('a').first();
  await chip.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await link.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(link).toBeFocused(); await expect(chip.getByRole('tooltip')).toBeVisible();
  const box=await chip.getByRole('tooltip').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(375);
  expect(box!.y).toBeGreaterThanOrEqual(56); expect(box!.y+box!.height).toBeLessThanOrEqual(812);
  const path=`${directory}/source-keyboard.png`; await page.screenshot({path});
  captures.push({path,box,viewport:{width:375,height:812}});
  writeFileSync(`${directory}/observations.json`,JSON.stringify({captures,credit:0,scope:'Viewport recapture only; no new Miki audit or alteration'},null,2));
});
