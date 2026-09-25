import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '@playwright/test';
import { test as evidenceTest } from './helpers/state-smoothing-fixture';
import { getCitation, citationMeta } from '../../data/citations';
import { THESES } from '../../lib/competing-theses';

// Normal E2E remains runnable without program-only evidence inputs.
// Guarded Mission runs retain the strict input-bound offline fixture.
const test = process.env.ROBOT_WIKI_GATE_INPUTS ? evidenceTest : base;

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`Brooks corrected reader at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/frontier/competing-theses/');
    await expect(page.getByRole('heading', { level: 1, name: 'Competing Theses' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath('article-top.png') });

    const prose = page.locator('div.prose[data-pagefind-body]');
    for (const phrase of [
      'paraphrases Sutton and describes itself, including its closing comment',
      'implementations use different selections',
      'leaving as much as possible to learning was critical',
      'plug-compatible humanoids replacing people in manual jobs at lower prices and just as well',
      'robustness, force and lifetime',
      'his assessments, not an independently established industry census',
      'Baxter and Sawyer',
      'task-specialized robots still called humanoids over the next fifteen years',
    ]) await expect(prose).toContainText(phrase);
    const humanoid = prose.locator('p').filter({ hasText: 'In his 2025 essay, Brooks calls plug-compatible' });
    await expect(humanoid).toBeVisible();
    if (viewport.width === 375) {
      await humanoid.evaluate(element => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const offset = (node.textContent ?? '').indexOf('In his 2025 essay');
          if (offset < 0) continue;
          const range = document.createRange();
          range.setStart(node, offset); range.setEnd(node, offset + 1);
          window.scrollTo(0, window.scrollY + range.getBoundingClientRect().top - 80);
          break;
        }
      });
      await page.screenshot({ path: testInfo.outputPath('humanoid-correction-viewport.png') });
      await page.evaluate(() => window.scrollBy(0, 540));
      await page.screenshot({ path: testInfo.outputPath('humanoid-countercontext-viewport.png') });
    } else {
      await humanoid.screenshot({ path: testInfo.outputPath('humanoid-correction.png') });
    }

    const panel = page.getByTestId('thesis-explorer');
    const detail = page.getByTestId('thesis-detail');
    for (const thesis of THESES) {
      await panel.getByRole('button', { name: thesis.name, exact: true }).click();
      await expect(panel.getByRole('button', { name: thesis.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(detail.locator(`[aria-labelledby="${thesis.id}-for"] li`)).toHaveCount(thesis.evidenceFor.length);
      await expect(detail.locator(`[aria-labelledby="${thesis.id}-against"] li`)).toHaveCount(thesis.evidenceAgainst.length);
      await expect(detail.getByText('Falsification criterion', { exact: true })).toBeVisible();
    }
    await expect(detail).toContainText('plug-compatible');
    await expect(detail).toContainText('lower prices');
    await expect(detail).toContainText('equal competence');
    await expect(detail).toContainText('his assessments rather than an industry census');
    const last = panel.getByRole('button', { name: THESES[5].name, exact: true });
    await last.focus();
    await page.keyboard.press('Home');
    await expect(panel.getByRole('button', { name: THESES[0].name, exact: true })).toBeFocused();
    await expect(detail).toContainText('lists FFTs and Mel filter banks among implementation-dependent');
    await expect(detail).toContainText('leaving as much as possible to learning was critical');
    await page.keyboard.press('End');
    await expect(last).toBeFocused();
    await panel.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('thesis-readout')).toHaveText('6 theses, showing: End-to-end VLA scaling');

    const citations = [];
    for (const id of ['brooks-better-lesson-2019', 'brooks-dexterity-2025', 'enpire-2026']) {
      const citation = getCitation(id)!;
      const chip = prose.locator(`[data-cite-id="${id}"]`).first();
      const link = chip.locator('a[target="_blank"]');
      const tooltip = chip.getByRole('tooltip');
      await expect(link).toHaveAttribute('href', citation.url);
      await link.hover();
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(citation.title);
      await expect(tooltip).toContainText(citationMeta(citation));
      await page.keyboard.press('Escape');
      await expect(tooltip).toBeHidden();
      await page.mouse.move(0, 0);
      await link.focus();
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      await page.keyboard.press('Escape');
      await expect(tooltip).toBeHidden();
      await expect(link).toBeFocused();
      await chip.locator(`a[href="#ref-${id}"]`).click();
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toBeInViewport();
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      if (citation.authors.length > 8) {
        await reference.getByRole('button', { name: `Show all ${citation.authors.length} authors` }).click();
      }
      await expect(reference.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
      citations.push({ id, url: citation.url, shortMeta: citationMeta(citation), fullAuthors: citation.authors, tooltipBounds: box });
    }

    if (viewport.width === 375) {
      const open = page.getByRole('button', { name: 'Open navigation menu' });
      await open.click();
      const drawer = page.getByRole('dialog', { name: 'Site navigation' });
      await expect(drawer).toBeVisible();
      await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
      await expect(drawer.getByRole('link', { name: 'Competing Theses', exact: true })).toHaveAttribute('aria-current', 'page');
      for (let index = 0; index < 12; index++) {
        await page.keyboard.press('Tab');
        expect(await drawer.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(open).toBeFocused();
      await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');
    } else {
      await expect(page.getByRole('navigation', { name: 'Robot Wiki taxonomy', exact: true })
        .getByRole('link', { name: 'Competing Theses', exact: true })).toHaveAttribute('aria-current', 'page');
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('#main-content').analyze();
    writeFileSync(testInfo.outputPath('reader-proof.json'), JSON.stringify({ viewport, citations, overflow, axe }, null, 2));
    expect(axe.violations).toEqual([]);
  });
}
