import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 1440]) {
  test(`latent inherited scroll-edge regression at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/world-models/latent-dynamics/');
    await page.evaluate(() => document.fonts.ready);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await prose.getByText('545M', { exact: false }).first().scrollIntoViewIfNeeded();
    const source = prose.locator('a[aria-describedby][href="https://arxiv.org/abs/2310.16828"]').first();
    await source.focus();
    const tooltip = page.getByRole('tooltip').filter({ visible: true }).first();
    await expect(tooltip).toBeVisible();
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
    await source.evaluate(e => {
      const b = e.getBoundingClientRect();
      window.scrollBy(0, b.top - 100);
    });
    await source.focus();
    const edge = await measure();
    await page.screenshot({ caret: 'initial', path: info.outputPath('latent-explicit-top-edge.png') });
    await source.evaluate(e => (e as HTMLElement).blur());
    await source.hover();
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
  { domain: 'manipulation', slug: 'realtime-execution', text: 'roofline-based analytical model', source: 'vla-perf-2026' },
  { domain: 'data-hardware', slug: 'hardware-taxonomy', text: 'batch-one analytical predictions', source: 'vla-perf-2026' },
  { domain: 'world-models', slug: 'latent-dynamics', text: 'MBPO-PPO', source: 'robotic-world-model-2025' },
  { domain: 'world-models', slug: 'taxonomy', text: 'Causal Conditioning Gaps', source: 'world-model-survey-2026' },
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
        await expect(page.getByText('An editorial comparison of six world-model example groups:', { exact: false }).first()).toBeVisible();
        await expect(page.locator('#the-six-paradigms')).toHaveCount(1);
      }
      const correction = prose.getByText(route.text, { exact: false }).first();
      await correction.scrollIntoViewIfNeeded();
      await page.screenshot({ caret: 'initial', path: info.outputPath('correction.png') });
      const source = prose.locator(`${route.slug === 'jepa' ? 'li' : 'p'} [data-cite-id="${route.source}"] a[aria-describedby]`).first();
      await source.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await source.focus();
      const tooltip = page.getByRole('tooltip').filter({ visible: true }).first();
      await expect(tooltip).toBeVisible();
      const bounds = async () => tooltip.evaluate(e => {
        const b = e.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, overflow: e.scrollWidth - e.clientWidth };
      });
      const focused = await bounds();
      await page.screenshot({ caret: 'initial', path: info.outputPath('source-focus.png') });
      await source.evaluate(e => (e as HTMLElement).blur());
      await source.hover();
      const hovered = await bounds();
      await page.screenshot({ caret: 'initial', path: info.outputPath('source-hover.png') });
      const gpuRows: { name: string; cells: string[]; headerCount: number }[] = [];
      const controls: { name: string; initial: string; changed: string }[] = [];
      await page.mouse.move(0, 0);
      if (route.slug === 'realtime-execution') {
        // The second teaching mount is revealed by the reader's answer.
        await page.getByRole('radio', { name: 'About 1B toy parameters', exact: true }).check();
        const sliders = page.getByRole('slider', { name: /Model size in billions/ });
        await expect(sliders).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
          const slider = sliders.nth(i);
          await expect(slider).toHaveValue(i === 0 ? '3' : '1.1');
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
        const delay = page.getByRole('slider', { name: /Inference delay in milliseconds/ });
        await delay.focus();
        const initial = await delay.inputValue();
        await page.screenshot({ caret: 'initial', path: info.outputPath('execution-default.png') });
        await delay.press('ArrowRight');
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
