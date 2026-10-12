import { writeFile } from 'node:fs/promises';
import { openAdjustMore } from './helpers/figure-fold';
import { closeCiteNote, citeParts, revealCiteNote } from './helpers/citation-note';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 1440]) {
  test(`latent inherited scroll-edge regression at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/world-models/latent-dynamics/');
    await page.evaluate(() => document.fonts.ready);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await prose.getByText('545M', { exact: false }).first().scrollIntoViewIfNeeded();
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the tooltip chip became a numbered sidenote. Keyboard and
    // pointer now open the note (or find it in the margin at 1440), and the
    // same viewport bounds are asserted on the note.
    const cite = prose.locator('[data-cite-id="tdmpc2-2023"]').first();
    const { mark, source } = citeParts(cite);
    await expect(source).toHaveAttribute('href', 'https://arxiv.org/abs/2310.16828');
    const tooltip = await revealCiteNote(cite, 'keyboard');
    const measure = async () => tooltip.evaluate(e => {
      const b = e.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, overflow: e.scrollWidth - e.clientWidth };
    });
    const inherited = await measure();
    await page.screenshot({ caret: 'initial', path: info.outputPath('latent-inherited-edge.png') });
    await writeFile(info.outputPath('latent-inherited-edge.json'), JSON.stringify(inherited, null, 2));
    expect(inherited.top).toBeGreaterThanOrEqual(0);
    expect(inherited.right).toBeLessThanOrEqual(width);
    // Deliberately reproduce a top-edge placement, not just centered focus.
    await closeCiteNote(cite);
    await mark.evaluate(e => {
      const b = e.getBoundingClientRect();
      window.scrollBy(0, b.top - 100);
    });
    await revealCiteNote(cite, 'keyboard');
    const edge = await measure();
    await page.screenshot({ caret: 'initial', path: info.outputPath('latent-explicit-top-edge.png') });
    await closeCiteNote(cite);
    await revealCiteNote(cite, 'pointer');
    const hover = await measure();
    await page.screenshot({ caret: 'initial', path: info.outputPath('latent-edge-hover.png') });
    await writeFile(info.outputPath('latent-edge-proof.json'), JSON.stringify({ inherited, edge, hover }, null, 2));
    for (const b of [edge, hover]) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(width);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(width === 375 ? 812 : 900);
      expect(b.overflow).toBeLessThanOrEqual(1);
    }
  });
}

const routes = [
  { domain: 'manipulation', slug: 'realtime-execution', text: 'analytical roofline model', source: 'vla-perf-2026' },
  { domain: 'data-hardware', slug: 'hardware-taxonomy', text: 'batch-one analytical predictions', source: 'vla-perf-2026' },
  { domain: 'world-models', slug: 'latent-dynamics', text: 'MBPO-PPO', source: 'robotic-world-model-2025' },
  // The 2026-10-12 world-models rewrite cut the survey's causal-conditioning
  // passage; its functional definition, under the same source, is the
  // successor text.
  { domain: 'world-models', slug: 'taxonomy', text: 'Hou and colleagues count a model only if', source: 'world-model-survey-2026' },
  { domain: 'world-models', slug: 'jepa', text: 'Fast-WAM separates video co-training', source: 'fast-wam-2026' },
] as const;

for (const width of [375, 1440]) {
  for (const route of routes) {
    test(`scoped current reader ${route.slug} at ${width}`, async ({ page }, info) => {
      const height = width === 375 ? 812 : 900;
      await page.setViewportSize({ width, height });
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      expect((await page.goto(`/${route.domain}/${route.slug}/`))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*,*::before,*::after { transition: none !important; animation: none !important; }' });
      await page.screenshot({ caret: 'initial', path: info.outputPath('header.png') });
      const prose = page.locator('div.prose[data-pagefind-body]');
      if (route.slug === 'taxonomy') {
        await expect(page.getByText('Six example groups compared, from DreamerV3 to V-JEPA 2.', { exact: false }).first()).toBeVisible();
        await expect(page.locator('#the-six-paradigms')).toHaveCount(1);
      }
      const correction = prose.getByText(route.text, { exact: false }).first();
      await correction.scrollIntoViewIfNeeded();
      await page.screenshot({ caret: 'initial', path: info.outputPath('correction.png') });
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the citation's note replaces the tooltip, opened by
      // keyboard and by pointer, with the same bounds asserted.
      const cite = prose.locator(`${route.slug === 'jepa' ? 'li' : 'p'} [data-cite-id="${route.source}"]`).first();
      await citeParts(cite).mark.evaluate(e => e.scrollIntoView({ block: 'center' }));
      const tooltip = await revealCiteNote(cite, 'keyboard');
      const bounds = async () => tooltip.evaluate(e => {
        const b = e.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, overflow: e.scrollWidth - e.clientWidth };
      });
      const focused = await bounds();
      await page.screenshot({ caret: 'initial', path: info.outputPath('source-focus.png') });
      await closeCiteNote(cite);
      await revealCiteNote(cite, 'pointer');
      const hovered = await bounds();
      await page.screenshot({ caret: 'initial', path: info.outputPath('source-hover.png') });
      await closeCiteNote(cite);
      const gpuRows: { name: string; cells: string[]; headerCount: number }[] = [];
      const controls: { name: string; initial: string; changed: string }[] = [];
      await page.mouse.move(0, 0);
      if (route.slug === 'realtime-execution') {
        await openAdjustMore(page.locator('main [data-figure-frame="control-loop-budget"]'));
        const sliders = page.getByRole('slider', { name: /Model size in billions/ });
        await expect(sliders).toHaveCount(1);
        for (let i = 0; i < 1; i++) {
          const slider = sliders.nth(i);
          await expect(slider).toHaveValue('3');
          await slider.focus();
          const initial = await slider.inputValue();
          await page.screenshot({ caret: 'initial', path: info.outputPath(`budget-${i}-default.png`) });
          await slider.press('ArrowRight');
          const changed = await slider.inputValue();
          expect(changed).not.toBe(initial);
          await page.screenshot({ caret: 'initial', path: info.outputPath(`budget-${i}-keyboard.png`) });
          const container = slider.locator('xpath=ancestor::*[.//*[@data-testid="model-assumption-note"]][1]');
          await container.getByRole('button', { name: 'Reset', exact: true }).click();
          await expect(slider).toHaveValue(initial);
          controls.push({ name: `budget-${i}`, initial, changed });
        }
        await openAdjustMore(page.locator('main [data-figure-frame="execution-modes"]'));
        const delay = page.getByRole('slider', { name: /Inference delay in milliseconds/ });
        await delay.focus();
        const initial = await delay.inputValue();
        await page.screenshot({ caret: 'initial', path: info.outputPath('execution-default.png') });
        // The figure opens at the top of the delay range.
        await delay.press('ArrowLeft');
        const changed = await delay.inputValue();
        expect(changed).not.toBe(initial);
        await page.screenshot({ caret: 'initial', path: info.outputPath('execution-keyboard.png') });
        await delay.locator('xpath=ancestor::*[.//*[@data-testid="execution-assumption-note"]][1]').getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(delay).toHaveValue(initial);
        controls.push({ name: 'execution', initial, changed });
      }
      if (route.slug === 'hardware-taxonomy') {
        await page.getByRole('button', { name: 'Compute', exact: true }).click();
        const table = page.locator('table').first();
        const headers = await table.locator('thead th').count();
        for (const name of ['RTX 4090', 'A100', 'H100', 'B100']) {
          const row = table.locator('tbody tr').filter({ hasText: name }).first();
          const cells = row.locator('td');
          await expect(cells).toHaveCount(headers);
          const text = await cells.allTextContents();
          expect(text.join(' ')).toContain('not disclosed');
          expect(text.join(' ')).toContain('predicted pi0 inference');
          expect(text.join(' ')).toContain('no network');
          for (let i = 0; i < headers; i++) await cells.nth(i).scrollIntoViewIfNeeded();
          await page.screenshot({ caret: 'initial', path: info.outputPath(`gpu-${name.replaceAll(' ', '-')}-right.png`) });
          await cells.first().scrollIntoViewIfNeeded();
          await page.screenshot({ caret: 'initial', path: info.outputPath(`gpu-${name.replaceAll(' ', '-')}-left.png`) });
          gpuRows.push({ name, cells: text, headerCount: headers });
        }
        const scroll = table.locator('xpath=ancestor::*[@role="region"][1]');
        await scroll.focus();
        if (width === 375) {
          await scroll.evaluate(e => { e.scrollLeft = 0; });
          await scroll.press('ArrowRight');
          await expect.poll(() => scroll.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
        }
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const axe = await new AxeBuilder({ page }).analyze();
      await writeFile(info.outputPath('reader-proof.json'), JSON.stringify({
        route, width, height, focused, hovered, gpuRows, controls, overflow, pageErrors: errors, axeViolations: axe.violations,
      }, null, 2));
      for (const b of [focused, hovered]) {
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(width);
        expect(b.top).toBeGreaterThanOrEqual(0);
        expect(b.bottom).toBeLessThanOrEqual(height);
        expect(b.overflow).toBeLessThanOrEqual(1);
      }
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      expect(axe.violations).toEqual([]);
      expect(await page.locator('.katex-error').count()).toBe(0);
    });
  }
}
