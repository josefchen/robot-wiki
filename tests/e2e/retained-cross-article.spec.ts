import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const articles = [
  {
    route: '/classical/perception/',
    source: 'zhang-2000-calibration',
    paragraphs: ['compares this setup'],
  },
  {
    route: '/classical/scene-representation/',
    source: 'nav2-2020',
    paragraphs: [
      'is an unordered set of 3D points',
      'In their RealSense comparison',
      'Navigation2 provides one concrete',
      'Navigation2 separates global planning',
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
      expect(headingFont).toMatch(/Tektur/i);
      await page.screenshot({ path: info.outputPath('article-top.png') });
      for (const [index, phrase] of article.paragraphs.entries()) {
        const paragraph = page.locator('div.prose p').filter({ hasText: phrase }).first();
        await expect(paragraph).toBeVisible();
        await paragraph.scrollIntoViewIfNeeded();
        expect(await paragraph.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await paragraph.screenshot({ path: info.outputPath(`correction-${index + 1}.png`) });
      }
      const citation = page.locator(`div.prose [data-cite-id="${article.source}"] a`).last();
      await citation.focus();
      await expect(citation).toBeFocused();
      await expect(citation).toHaveAttribute('href', `#ref-${article.source}`);
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      const tooltipBox = await tooltip.boundingBox();
      expect(tooltipBox!.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(await tooltip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
      await page.screenshot({ path: info.outputPath('citation-focus.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      expect(await page.locator('.katex-error').count()).toBe(0);
      await citation.blur();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(errors).toEqual([]);
      console.log(JSON.stringify({ route: article.route, viewport, headingFont, errors, captures: article.paragraphs.length + 2, outputDir: info.outputDir }));
    });
  }
}
