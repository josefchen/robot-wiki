import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { openAdjustMore } from './helpers/figure-fold';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';

const surfaces = [
  { slug: 'knowledge-insulation', domain: 'manipulation', text: '7.5 times the training steps', sources: ['knowledge-insulation-paper-2025', 'knowledge-insulation-2025'] },
  { slug: 'pi-line', domain: 'manipulation', text: 'one million one-second action chunks', sources: ['pi0-fast-2025', 'knowledge-insulation-paper-2025'] },
  { slug: 'comparison-matrix', domain: 'manipulation', text: 'DROID setup in the FAST v1 paper', sources: [] },
  { slug: 'latent-dynamics', domain: 'world-models', text: 'imagination horizon H = 15 in a table', sources: ['dreamerv3-2023'] },
  { slug: 'taxonomy', domain: 'world-models', text: 'critic also receives a loss on replay-buffer trajectories', sources: ['dreamerv3-2023'] },
];

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  for (const surface of surfaces) {
    test(`fixed corrected surfaces: ${surface.slug} at ${viewport.width}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/${surface.domain}/${surface.slug}/`);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.katex-error')).toHaveCount(0);
      await expect(page.locator('body')).toContainText(surface.text);
      if (surface.slug === 'comparison-matrix') {
        // The corrected text is a matrix cell; the full matrix sits in the
        // figure's "Adjust more" fold.
        await openAdjustMore(page.locator('main [data-figure-frame="comparison-matrix"]'));
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const observations: unknown[] = [];
      const context = page.getByText(surface.text, { exact: false }).last();
      await context.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      await page.screenshot({ path: info.outputPath(`corrected-${viewport.width}.png`) });

      if (surface.slug === 'comparison-matrix') {
        const row = page.getByRole('row', { name: /^π0-FAST / });
        await expect(row).toContainText('15 / {8, 15}');
        await expect(row).toContainText('750 ms');
        const horizon = row.getByRole('cell').nth(3);
        await horizon.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath(`fast-horizon-${viewport.width}.png`) });
        const links = row.locator('[data-method-source-id]');
        expect(await links.count()).toBe(2);
        for (const link of await links.all()) {
          await link.focus();
          await expect(link).toBeFocused();
          await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        }
        const region = page.getByRole('table').locator('..');
        await region.focus();
        const before = await region.evaluate(el => el.scrollLeft);
        await region.evaluate(el => { el.scrollLeft = 0; });
        await region.press('ArrowRight');
        await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        observations.push({ kind: 'table', before, after: await region.evaluate(el => el.scrollLeft), tooltip: 'not applicable: method source links do not implement tooltips' });
      }
      for (const id of surface.sources) {
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): the chip's source link and its role="tooltip" became a
        // number with a sidenote (helpers/citation-note.ts). The number is
        // pointed at, then reached by Shift+Tab/Tab, and shows the note each
        // way (inline below 1200 px, at rest in the margin from 1200 px)
        // with the same text, geometry and focus-outline checks.
        const chip = page.locator(`.prose [data-cite-id="${id}"]`).first();
        const { mark: link, note: tooltip } = citeParts(chip);
        await waitForHydration(link);
        await link.scrollIntoViewIfNeeded();
        await link.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await showCiteNote(page, chip, 'hover');
        await expect(tooltip).toBeVisible();
        const hoveredText = await tooltip.innerText();
        await page.screenshot({ path: info.outputPath(`${id}-hover-${viewport.width}.png`) });
        await dismissCiteNote(page, chip, 'hover');
        await page.mouse.move(2, 2);
        await link.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
        await showCiteNote(page, chip, 'keyboard');
        await expect(tooltip).toBeVisible();
        expect(await tooltip.innerText()).toBe(hoveredText);
        const geometry = await tooltip.evaluate(el => {
          const box = el.getBoundingClientRect();
          return { x: box.x, right: box.right, y: box.y, bottom: box.bottom, width: box.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
        });
        observations.push({ id, geometry, text: hoveredText });
        await page.screenshot({ path: info.outputPath(`${id}-focus-${viewport.width}.png`) });
        expect(geometry.x, `${id} left`).toBeGreaterThanOrEqual(0);
        expect(geometry.right, `${id} right`).toBeLessThanOrEqual(viewport.width);
        expect(geometry.y, `${id} top`).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom, `${id} bottom`).toBeLessThanOrEqual(viewport.height);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        const outline = await link.evaluate(el => ({ width: getComputedStyle(el).outlineWidth, style: getComputedStyle(el).outlineStyle }));
        observations.push({ id, outline });
        expect(outline.style).not.toBe('none');
        await dismissCiteNote(page, chip, 'keyboard');
        await link.evaluate(el => (el as HTMLElement).blur());
      }
      const axe = await new AxeBuilder({ page }).analyze();
      writeFileSync(info.outputPath('observations.json'), JSON.stringify({ route: page.url(), viewport, observations, axeViolations: axe.violations, pageErrors: errors }, null, 2));
      expect(axe.violations).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
