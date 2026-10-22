import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';

const articles = [
  {
    route: '/classical/perception/',
    source: 'zhang-2000-calibration',
    paragraphs: ['Zhang contrasts it with classical techniques'],
  },
  {
    route: '/classical/scene-representation/',
    source: 'nav2-2020',
    paragraphs: [
      'is an unordered set of 3D points',
      'where a RealSense camera failed to compute depth',
      'Navigation2, built on ROS 2, uses a layered costmap',
      'Its global planner computes a shortest route to the goal',
    ],
  },
  {
    route: '/data-hardware/industrial-deployment/',
    source: 'evst-cell-cost-2026',
    paragraphs: ["EVST's guide estimates 12 to 24 months"],
  },
] as const;

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  for (const article of articles) {
    test(`retained corrections ${article.route} at ${viewport.width}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(article.route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      // The local Next development badge is not product UI and covered a
      // bounded correction crop in the first capture. Hide only that portal.
      await page.addStyleTag({ content: 'nextjs-portal { visibility: hidden !important; }' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const headingFont = await page.getByRole('heading', { level: 1 }).evaluate(el => getComputedStyle(el).fontFamily);
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the article h1 is DM Sans in place of Tektur, matched as
      // the first family of the stack.
      expect(headingFont).toMatch(/^"?DM Sans"?,/);
      await page.screenshot({ path: info.outputPath('article-top.png') });
      for (const [index, phrase] of article.paragraphs.entries()) {
        const paragraph = page.locator('div.prose p').filter({ hasText: phrase }).first();
        await expect(paragraph).toBeVisible();
        await paragraph.scrollIntoViewIfNeeded();
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): from 1200 px the paragraph's citation notes float into
        // the right margin by design, which widens its scrollable overflow,
        // so the paragraph's own lines are measured against its box and each
        // margin note against the viewport.
        expect(await paragraph.evaluate(el => {
          const box = el.getBoundingClientRect();
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.parentElement!.closest('[data-sidenote], .sr-only')) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            for (const r of range.getClientRects()) if (r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5)) return false;
          }
          return [...el.querySelectorAll('[data-sidenote]')].every(note =>
            [...note.getClientRects()].every(r => r.left >= 0 && r.right <= innerWidth));
        })).toBe(true);
        await paragraph.screenshot({ path: info.outputPath(`correction-${index + 1}.png`) });
      }
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the chip's jump link and focus tooltip became the
      // citation's number and its sidenote. The number is the focus stop
      // that points at the References entry; focused, its note shows (in
      // the margin from 1200 px, opened inline by Enter below that) and
      // every line of it stays inside the viewport without overflowing.
      const cite = page.locator(`div.prose [data-cite-id="${article.source}"]`).last();
      const { mark: citation, note: tooltip } = citeParts(cite);
      await citation.focus();
      await expect(citation).toBeFocused();
      await expect(citation).toHaveAttribute('href', `#ref-${article.source}`);
      await showCiteNote(page, cite, 'keyboard');
      await expect(tooltip).toBeVisible();
      const tooltipBox = await tooltip.boundingBox();
      expect(tooltipBox!.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(viewport.width);
      const lines = await tooltip.evaluate(el => [...el.getClientRects()].map(r => ({ left: r.left, right: r.right })));
      for (const line of lines) {
        expect(line.left).toBeGreaterThanOrEqual(0);
        expect(line.right).toBeLessThanOrEqual(viewport.width);
      }
      expect(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
      await page.screenshot({ path: info.outputPath('citation-focus.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      expect(await page.locator('.katex-error').count()).toBe(0);
      await dismissCiteNote(page, cite, 'keyboard');
      await citation.blur();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(errors).toEqual([]);
      console.log(JSON.stringify({ route: article.route, viewport, headingFont, errors, captures: article.paragraphs.length + 2, outputDir: info.outputDir }));
    });
  }
}
