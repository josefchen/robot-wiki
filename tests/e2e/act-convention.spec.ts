import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`ACT reference convention renders consistently at ${viewport.width}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const dir = process.env.ACT_CORRECTION_EVIDENCE_DIR ?? testInfo.outputPath('act');
    mkdirSync(dir, { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/manipulation/action-chunking/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Action Chunking (ACT and ALOHA)');
    await page.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-top.png`) });
    const heading = page.getByRole('heading', { name: 'Temporal ensembling and its limits', exact: true });
    await heading.scrollIntoViewIfNeeded();
    const image = page.locator('img[src*="temporal-ensembling.svg"]');
    await expect(image).toHaveAttribute('alt', /oldest-to-newest unnormalized weights are 1.00, 0.61, and 0.37/);
    const figure = image.locator('xpath=ancestor::figure');
    await expect(figure).toContainText('oldest gets the largest weight');
    await expect(figure).toContainText('m=0.01, not 0.5');
    await expect(figure.getByRole('link', { name: /CC BY 4.0/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0');
    const response = await page.request.get('/images/temporal-ensembling.svg');
    expect(response.status()).toBe(200);
    const svg = await response.body();
    const source = readFileSync('public/images/temporal-ensembling.svg');
    expect(svg.equals(source)).toBe(true);
    await figure.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-figure.png`) });
    const paragraph = page.locator('p').filter({ hasText: 'The pinned ACT reference implementation uses' });
    await expect(paragraph).toContainText('oldest retained prediction has the largest weight');
    expect(await paragraph.locator('.katex').count()).toBe(4);
    await paragraph.scrollIntoViewIfNeeded();
    await page.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-convention.png`) });
    const term = page.locator('[data-term-id="temporal-ensembling"]');
    await term.getByRole('link').focus();
    await expect(term.getByRole('tooltip')).toContainText('oldest retained prediction has the largest weight');
    const tip = await term.getByRole('tooltip').boundingBox();
    expect(tip).not.toBeNull();
    expect(tip!.x).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-glossary.png`) });
    const cite = page.locator('[data-cite-id="act-reference-2023"] a').first();
    await cite.focus();
    await expect(cite).toHaveAttribute('href', 'https://github.com/tonyzhaozh/act/blob/76cf30b4fed1d72dafbc3e1c270c0839d57e8bcf/imitate_episodes.py');
    await expect(page.locator('#ref-act-reference-2023')).toContainText('imitate_episodes.py');
    await page.locator('#ref-act-reference-2023').scrollIntoViewIfNeeded();
    await page.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-reference.png`) });
    const example = page.locator('p').filter({ hasText: 'For an illustrative scalar example' });
    await expect(example).toContainText('after selection');
    await expect(example).toContainText('9.93333444');
    await example.scrollIntoViewIfNeeded();
    await page.screenshot({ caret: 'initial', path: join(dir, `act-${viewport.width}-numeric.png`) });
    const metrics = await page.evaluate(() => {
      const h = document.querySelector('h1')!;
      const p = [...document.querySelectorAll('p')].find(p => p.textContent?.startsWith('The pinned ACT reference'))!;
      const css = getComputedStyle(p), hs = getComputedStyle(h);
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        proseFamily: css.fontFamily, proseSize: css.fontSize, proseLineHeight: css.lineHeight,
        h1Family: hs.fontFamily, h1Size: hs.fontSize,
        katexErrors: document.querySelectorAll('.katex-error').length,
        sourceCount: document.querySelectorAll('[id^="ref-"]').length };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(metrics.proseFamily).toContain('Newsreader');
    expect(metrics.h1Family.toLowerCase()).toContain('tektur');
    expect(metrics.katexErrors).toBe(0);
    expect(metrics.sourceCount).toBe(7);
    const axe = await new AxeBuilder({ page }).analyze();
    writeFileSync(join(dir, `act-${viewport.width}-metrics.json`), JSON.stringify({ viewport, metrics, errors, axeViolations: axe.violations, svgSha256: createHash('sha256').update(svg).digest('hex') }, null, 2));
    expect(errors).toEqual([]);
    expect(axe.violations).toEqual([]);
  });
}
