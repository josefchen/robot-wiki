import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CITATIONS } from '../../data/citations';
import { test, readerBaseURL } from './grasp-reader-fixture';
import { captureReaderText, dismissReaderPopups } from './grasp-reader-capture';

test.skip(!readerBaseURL, 'Requires a fully bound owned current-source reader');

test('grasp readers: complete final text pixels and clean apparatus', async ({ page }, info) => {
  const proof: Record<string, unknown> = { coverage: [], citations: [], math: [] };
  try {
    await page.goto('/classical/grasp-planning/');
    await expect(page.getByRole('heading', { level: 1, name: 'Grasp Planning' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: info.outputPath('overview.png') });
    const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
    if (await menu.isVisible()) {
      await menu.click();
      const drawer = page.getByRole('dialog', { name: 'Site navigation' });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Grasp Planning', exact: true })).toHaveAttribute('aria-current', 'page');
      await page.screenshot({ path: info.outputPath('navigation.png') });
      await page.getByRole('button', { name: 'Close navigation menu', exact: true }).click();
      await expect(drawer).not.toBeVisible();
      proof.navigation = 'mobile drawer opened, current route identified, close button dismissed';
    } else {
      await expect(page.getByRole('navigation', { name: 'Robot Wiki taxonomy' })).toBeVisible();
      proof.navigation = 'desktop taxonomy visible with original existing-spec current-route assertion';
    }
    const coverage = proof.coverage as unknown[];
    await dismissReaderPopups(page);
    for (const [label, prefix] of [
      ['roa-final', 'Roa and Suárez review quality measures'],
      ['dexnet-training', 'Dex-Net 2.0 uses analytic grasp metrics'],
      ['dexnet-method', 'The basic planner samples antipodal'],
      ['dexnet-results', 'For the eight known, 3D-printed adversarial objects'],
    ]) {
      const paragraph = page.locator('.prose > p').filter({ hasText: prefix });
      coverage.push(await captureReaderText(page, paragraph, label, info));
    }
    const stat = page.getByText('Dex-Net 2.0 training datapoints', { exact: true }).locator('..');
    await expect(stat).toContainText('6.7M');
    await expect(stat).toContainText('not robot trials');
    coverage.push(await captureReaderText(page, stat, 'training-stat', info));
    const mathematics = page.locator('.prose .katex-display');
    proof.katexCount = await page.locator('.prose .katex').count();
    proof.displayMathCount = await mathematics.count();
    expect(proof.katexCount).toBeGreaterThan(8);
    expect(proof.displayMathCount).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < await mathematics.count(); i++) {
      const math = mathematics.nth(i);
      await math.scrollIntoViewIfNeeded();
      await expect(math).toBeVisible();
      const bounds = await math.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth,
        annotation: el.querySelector('annotation')?.textContent, rect: el.getBoundingClientRect().toJSON() }));
      const path = info.outputPath(`math-${i + 1}.png`);
      await page.screenshot({ path });
      let horizontalScroll: { from: number; to: number; path: string } | null = null;
      if (bounds.scrollWidth > bounds.width + 1) {
        await math.focus();
        await expect(math).toBeFocused();
        const from = await math.evaluate(el => el.scrollLeft);
        for (let step = 0; step < 12; step++) await math.press('ArrowRight');
        await expect.poll(() => math.evaluate(el => el.scrollLeft + el.clientWidth))
          .toBeGreaterThanOrEqual(bounds.scrollWidth - 1);
        const to = await math.evaluate(el => el.scrollLeft);
        expect(to).toBeGreaterThan(from);
        const endPath = info.outputPath(`math-${i + 1}-scrolled.png`);
        await page.screenshot({ path: endPath });
        horizontalScroll = { from, to, path: endPath };
      }
      (proof.math as unknown[]).push({ index: i, path, ...bounds, horizontalScroll,
        limitation: 'Only actual overflow invokes keyboard scrolling; fitted equations do not earn scrolling credit.' });
    }
    for (const id of ['roa-suarez-2015', 'dexnet-2-2017']) {
      await dismissReaderPopups(page);
      const citation = CITATIONS.find(item => item.id === id)!;
      const chip = page.locator(`.prose [data-cite-id="${id}"]`).first();
      const link = chip.locator('a[target="_blank"]');
      await link.scrollIntoViewIfNeeded();
      await link.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight / 2, behavior: 'instant' }));
      await link.focus();
      await link.hover();
      const tip = chip.getByRole('tooltip');
      await expect(tip).toBeVisible();
      await expect(tip).toContainText(citation.title);
      await expect(link).toHaveAttribute('href', citation.url);
      const tooltipText = await tip.innerText();
      coverage.push(await captureReaderText(page, tip, `${id}-tooltip`, info, false));
      const popupSize = await tip.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
      await chip.locator(`a[href="#ref-${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toContainText(citation.title);
      for (const author of citation.authors) await expect(reference).toContainText(author);
      await page.goBack();
      const backRestoredChipFocus = await link.evaluate(el => el === document.activeElement);
      await dismissReaderPopups(page);
      await expect(page.getByRole('tooltip').filter({ visible: true })).toHaveCount(0);
      coverage.push(await captureReaderText(page, reference, `${id}-full-reference`, info));
      (proof.citations as unknown[]).push({ id, tooltipText, referenceText: await reference.innerText(),
        popupSize, backRestoredChipFocus, popupDismissedBeforeReferenceCapture: true });
    }
    await dismissReaderPopups(page);
    const slider = page.getByRole('slider', { name: /friction coefficient/i });
    await slider.scrollIntoViewIfNeeded();
    const before = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    expect(await slider.inputValue()).not.toBe(before);
    proof.slider = { before, after: await slider.inputValue() };
    await expect(page.getByRole('tooltip').filter({ visible: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('lab-keyboard.png') });
    for (const id of ['grasp-object-view', 'grasp-wrench-view']) {
      const view = page.getByTestId(id);
      await view.scrollIntoViewIfNeeded();
      await expect(view).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${id}.png`) });
    }
    const term = page.locator('.prose [data-term-id]').first();
    const trigger = term.locator('a.term-link');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await trigger.hover();
    const tip = term.getByRole('tooltip');
    proof.termOpened = await tip.isVisible();
    await page.keyboard.press('Escape');
    proof.termEscapeClosed = !(await tip.isVisible());
    await dismissReaderPopups(page);
    const axe = await new AxeBuilder({ page }).analyze();
    proof.axe = { violations: axe.violations, incomplete: axe.incomplete };
    expect(axe.violations).toEqual([]);
  } finally {
    mkdirSync(info.outputDir, { recursive: true });
    writeFileSync(info.outputPath('reader-proof.json'), JSON.stringify({
      observedAt: new Date().toISOString(), viewport: page.viewportSize(), status: info.status,
      inputs: process.env.ROBOT_WIKI_GATE_INPUTS, ...proof,
      limits: 'Zero science/original changes. Full corrected text coverage requires each recorded glyph to be hit-tested in a Read capture. Shared Back/Term Escape and contrast incompletes remain observations, not passes. Existing grasp cases are reported separately.',
    }, null, 2) + '\n');
  }
});
