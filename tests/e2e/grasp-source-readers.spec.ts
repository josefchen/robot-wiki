import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { ownedReaderBase } from './owned-reader-base';

const baseURL = ownedReaderBase();
test.skip(!baseURL, 'Requires an explicitly bound, owned current-source reader runtime');
test.use({ baseURL });

test('grasp readers: corrected source endpoints and existing apparatus', async ({ page }, info) => {
  const proof: Record<string, unknown> = {};
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(baseURL!) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url);
    return route.abort();
  });
  await page.addInitScript(() => {
    const install = () => {
      if (!document.documentElement || document.getElementById('grasp-reader-fixture')) return;
      const style = document.createElement('style');
      style.id = 'grasp-reader-fixture';
      style.textContent = 'nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      document.documentElement.append(style);
    };
    new MutationObserver(install).observe(document, { childList: true, subtree: true });
    install();
  });
  try {
    await page.goto('/classical/grasp-planning/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath('overview.png') });
    for (const [name, text] of [
      ['review', 'Most of their analysis is quasi-static'],
      ['training', 'not robot trials'],
      ['known', '93% success for GQ-L-Adv over 80 trials'],
      ['novel', '68 successes among 69 grasps classified as robust'],
    ]) {
      const node = page.getByText(text, { exact: false }).last();
      await node.scrollIntoViewIfNeeded();
      await expect(node).toBeVisible();
      proof[name] = await node.innerText();
      await page.screenshot({ path: info.outputPath(`${name}.png`) });
    }
    proof.math = await page.locator('.prose .katex').count();
    expect(proof.math).toBeGreaterThan(0);
    const math = page.locator('.prose .katex').first();
    await math.scrollIntoViewIfNeeded();
    await expect(math).toBeVisible();
    await page.screenshot({ path: info.outputPath('math.png') });
    const citations: unknown[] = [];
    for (const id of ['roa-suarez-2015', 'dexnet-2-2017']) {
      const citation = CITATIONS.find(item => item.id === id)!;
      const chip = page.locator(`.prose [data-cite-id="${id}"]`).first();
      const link = chip.locator('a[target="_blank"]');
      await link.scrollIntoViewIfNeeded();
      await link.focus();
      await link.hover();
      const tip = chip.getByRole('tooltip');
      await expect(tip).toBeVisible();
      await expect(tip).toContainText(citation.title);
      await expect(link).toHaveAttribute('href', citation.url);
      const geometry = await tip.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, viewport: [innerWidth, innerHeight] };
      });
      await page.screenshot({ path: info.outputPath(`${id}-tooltip.png`) });
      const tooltipText = await tip.innerText();
      await chip.locator(`a[href="#ref-${id}"]`).click();
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toBeVisible();
      await expect(reference).toContainText(citation.title);
      const referenceText = await reference.innerText();
      await page.screenshot({ path: info.outputPath(`${id}-reference.png`) });
      await page.goBack();
      citations.push({ id, tooltipText, referenceText, geometry, backRestoredChipFocus: await link.evaluate(el => el === document.activeElement) });
    }
    proof.citations = citations;
    const slider = page.getByRole('slider').first();
    await slider.scrollIntoViewIfNeeded();
    const before = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    proof.slider = { before, after: await slider.inputValue() };
    expect(await slider.inputValue()).not.toBe(before);
    await page.screenshot({ path: info.outputPath('lab-keyboard.png') });
    const term = page.locator('.prose [data-term-id]').first();
    const trigger = term.locator('a.term-link');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await trigger.hover();
    const tip = term.getByRole('tooltip');
    proof.termOpened = await tip.isVisible();
    await page.keyboard.press('Escape');
    proof.termEscapeClosed = !(await tip.isVisible());
    const axe = await new AxeBuilder({ page }).analyze();
    proof.axe = { violations: axe.violations, incomplete: axe.incomplete };
    expect(axe.violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  } finally {
    mkdirSync(info.outputDir, { recursive: true });
    writeFileSync(info.outputPath('reader-proof.json'), JSON.stringify({
      at: new Date().toISOString(), viewport: page.viewportSize(), status: info.status,
      inputs: process.env.ROBOT_WIKI_GATE_INPUTS, errors, external, ...proof,
      limits: 'Scoped reader observations, not release acceptance. Back focus, Term Escape, tooltip geometry and Axe incompletes are recorded rather than converted into passes. No tooltip scroll or full math sweep is claimed.',
    }, null, 2) + '\n');
  }
});
