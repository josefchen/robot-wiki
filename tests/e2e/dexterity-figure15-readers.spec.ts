import { writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { CITATIONS } from '../../data/citations';
import { test, expect, readerBaseURL } from './dexterity-reader-fixture';

test('Figure15 readers: complete corrected paragraph, both Cite metadata and full References', async ({ page }, info) => {
  test.skip(!readerBaseURL, 'Requires the current owned offline dexterity reader and qualified inputs.');
  await page.goto('/frontier/dexterity/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1, name: 'Dexterity' })).toBeVisible();
  const prose = page.locator('div.prose[data-pagefind-body]');
  const paragraph = prose.locator('p').filter({
    hasText: "Figure's October 2025 announcement describes a palm camera in each Figure 03 hand",
  });
  await expect(paragraph).toHaveCount(1);
  const rendered = await paragraph.innerText();
  expect(rendered).toContain('can detect "three grams of pressure", comparing the sensitivity to a paperclip\'s weight');
  expect(rendered).toContain('head cameras, palm cameras, fingertip tactile sensors, and full-body proprioception as System 1 inputs');
  expect(rendered).toContain('Figure describes this as "the first time we\'ve demonstrated neural network policies that depend on these modalities"');
  expect(rendered).not.toContain('Figure 03 ships fingertip tactile sensors');
  expect(rendered).not.toContain('the first Figure has shown that consumes touch directly');
  const frames: object[] = [];
  async function capture(name: string, target: Locator) {
    await expect(target).toHaveCount(1);
    await page.mouse.move(1, 1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    const text = await target.innerText();
    const rect = await target.evaluate(element => {
      const r = element.getBoundingClientRect();
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, height: r.height };
    });
    const viewport = page.viewportSize()!;
    const span = viewport.height - 240;
    const steps = Math.max(1, Math.ceil(rect.height / span));
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (let n = 0; n < steps; n++) {
      const desired = Math.min(maxScroll, Math.max(0, rect.top - 140 + n * span));
      const current = await page.evaluate(() => window.scrollY);
      await page.mouse.move(viewport.width - 15, viewport.height / 2);
      await page.mouse.wheel(0, desired - current);
      await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - desired)).toBeLessThan(3);
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`${name}-${n + 1}.png`), animations: 'disabled' });
      frames.push({ name, part: n + 1, parts: steps, text, rect, viewport, scrollY: await page.evaluate(() => window.scrollY) });
    }
  }
  await capture('figure15-paragraph', paragraph);
  const sources: object[] = [];
  for (const id of ['figure-03-2025', 'helix-02-2026']) {
    const citation = CITATIONS.find(c => c.id === id)!;
    const chipRoot = paragraph.locator(`[data-cite-id="${id}"]`);
    await expect(chipRoot).toHaveCount(1);
    const sourceLink = chipRoot.locator(`a[href="${citation.url}"]`);
    await expect(sourceLink).toHaveAttribute('target', '_blank');
    await expect(sourceLink).toHaveAttribute('rel', /noopener/);
    await sourceLink.scrollIntoViewIfNeeded();
    await sourceLink.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(citation.title);
    await expect(tooltip).toContainText('Figure AI');
    await expect(tooltip).toContainText(String(citation.year));
    const box = await tooltip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const metadata = await tooltip.innerText();
    await page.screenshot({ path: info.outputPath(`${id}-citation-metadata.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.mouse.move(1, 1);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await chipRoot.locator(`a[href="#ref-${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const reference = page.locator(`#ref-${id}`);
    await expect(reference).toBeInViewport();
    await expect(reference).toHaveAttribute('data-further-reading', 'false');
    await expect(reference).toContainText(citation.title);
    await expect(reference).toContainText('Figure AI');
    await expect(reference).toContainText(String(citation.year));
    await expect(reference).toContainText(citation.url);
    await capture(`${id}-full-reference`, reference);
    sources.push({ id, url: citation.url, title: citation.title, authors: citation.authors,
      year: citation.year, metadata, referenceText: await reference.innerText(), popupBox: box });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  writeFileSync(info.outputPath('figure15-reader-frames.json'), JSON.stringify({
    at: new Date().toISOString(), viewport: page.viewportSize(), rendered, frames, sources,
    fonts: await page.evaluate(() => [...document.fonts].map(f => ({ family: f.family, status: f.status }))),
    newSourceRetrievals: 0,
    limitations: 'Mounted development reader. The exact Figure15 paragraph replacement, its two citation metadata views and full reference entries are exercised; adjacent paragraph claims, threshold/superlative, full article/P1, shared Back/Term behavior and independent acceptance are not certified.',
  }, null, 2) + '\n');
});
