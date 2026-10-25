import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';

test.describe('calibration and TSDF reader', () => {
  for (const slug of ['perception', 'scene-representation'] as const) {
    for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
      test(`${slug} retains source scope, bylines and accessible reader behavior at ${viewport.width}`, async ({ page, context }, testInfo) => {
        await page.setViewportSize(viewport);
        const external: string[] = [];
        const errors: string[] = [];
        const captures: Array<Record<string, unknown>> = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
            external.push(url.href);
            return route.abort();
          }
          return route.continue();
        });
        await context.addInitScript(() => {
          const install = () => {
            if (!document.documentElement || document.getElementById('calibration-tsdf-motion-off')) return;
            const style = document.createElement('style');
            style.id = 'calibration-tsdf-motion-off';
            style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
            document.documentElement.append(style);
          };
          new MutationObserver(install).observe(document, { childList: true, subtree: true });
          install();
        });
        const capture = async (state: string, fullPage = false) => {
          await page.evaluate(() => document.fonts.ready);
          const path = testInfo.outputPath(`${state}.png`);
          await page.screenshot({ path, fullPage, animations: 'disabled' });
          captures.push({
            path, state, url: page.url(), viewport, fullPage,
            capturedAt: new Date().toISOString(),
            bytes: readFileSync(path).length,
            sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
          });
        };
        try {
          const response = await page.goto(`/classical/${slug}/`);
          expect(response?.status()).toBe(200);
          await page.evaluate(() => document.fonts.ready);
          const prose = page.locator('div.prose[data-pagefind-body]');
          const sourceId = slug === 'perception' ? 'zhang-2000-calibration' : 'kinectfusion-2011';
          // Owner-approved successor (Josef, 2026-10-10, the research-page
          // standard): the perception paragraph pinned "models radial lens
          // distortion"; db856b22 (rewrite of the classical articles) states
          // the same Zhang claim as "It models radial distortion".
          const paragraph = prose.locator('p').filter({
            hasText: slug === 'perception' ? 'It models radial distortion' : '11-bit, 640×480 Kinect depth frames at 30 Hz',
          });
          await expect(paragraph).toHaveCount(1);
          const source = paragraph.locator(`[data-cite-id="${sourceId}"]`);
          // Owner-approved successor (Josef, 2026-10-10, the research-page
          // standard): the focused source link showed a role="tooltip" chip;
          // the citation is now a number with a sidenote. The note's
          // author-year link carries the source URL, and the number, once
          // hydrated, shows the note by keyboard (helpers/citation-note.ts).
          const { mark, note, source: link } = citeParts(source);
          await mark.evaluate((element) => element.scrollIntoView({ block: 'center' }));
          await waitForHydration(mark);
          await showCiteNote(page, source, 'keyboard');
          await expect(note).toBeVisible(); // Hydrated behavior, not SSR-only presence.
          await dismissCiteNote(page, source, 'keyboard');
          await mark.evaluate((element) => element.blur());

          await page.evaluate(() => window.scrollTo(0, 0));
          await capture('article-full', true);
          const h1 = page.getByRole('heading', { level: 1 });
          // Owner-approved successor (Josef, 2026-10-10, the research-page
          // standard): the H1 was pinned to Tektur; the display family is
          // now DM Sans.
          expect(await h1.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/DM Sans/i);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
          if (slug === 'perception') {
            await expect(prose.getByText('planar target; motion need not be known', { exact: true })).toBeVisible();
            // Owner-approved successor (Josef, 2026-10-10, the research-page
            // standard): "maximum-likelihood criterion" became
            // "maximum-likelihood nonlinear refinement" in db856b22.
            await expect(paragraph).toContainText('maximum-likelihood nonlinear refinement');
            await expect(link).toHaveAttribute('href', 'https://doi.org/10.1109/34.888718');
            await prose.getByText('planar target; motion need not be known', { exact: true }).scrollIntoViewIfNeeded();
            await capture('calibration-stat');
          } else {
            await expect(prose).toContainText('positive toward visible free space and negative on the non-visible side');
            await expect(prose).toContainText('both at zero weight');
            await expect(prose).toContainText('Its projective TSDF caps visible-space values');
            await expect(prose).toContainText('leaves non-visible points beyond');
            await expect(paragraph).toContainText('at the sensor rate');
            await expect(paragraph).toContainText('drift or tracking failure');
            await expect(link).toHaveAttribute('href', 'https://doi.org/10.1109/ISMAR.2011.6092378');
            await prose.getByRole('heading', { name: 'Signed-distance fields' }).scrollIntoViewIfNeeded();
            await capture('tsdf-conventions');
          }
          // Owner-approved successor (Josef, 2026-10-10, the research-page
          // standard): the tooltip shown by hover, then by focus, is the
          // note shown by pointer, closed, then shown by keyboard, with the
          // same text both ways and the same viewport bounds.
          await mark.evaluate((element) => element.scrollIntoView({ block: 'center' }));
          await showCiteNote(page, source, 'hover');
          const tooltip = note;
          await expect(tooltip).toBeVisible();
          const hoverText = await tooltip.innerText();
          await dismissCiteNote(page, source, 'hover');
          await page.mouse.move(0, 0);
          await showCiteNote(page, source, 'keyboard');
          await expect(tooltip).toBeVisible();
          expect(await tooltip.innerText()).toBe(hoverText);
          const bounds = await tooltip.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.y).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
          await capture('source-focused');
          await dismissCiteNote(page, source, 'keyboard');
          await mark.evaluate((element) => element.blur());

          const authors = slug === 'perception'
            ? [['zhang-2000-calibration', 'Z. Zhang']]
            : [
              ['curless-levoy-1996', 'Brian Curless, Marc Levoy'],
              ['kinectfusion-2011', 'Richard A. Newcombe, Shahram Izadi, Otmar Hilliges, David Molyneaux, David Kim, Andrew J. Davison, Pushmeet Kohli, Jamie Shotton, Steve Hodges, Andrew Fitzgibbon'],
            ];
          for (const [id, byline] of authors) {
            const entry = page.locator(`ol [data-reference-id="${id}"]`);
            const expand = entry.getByRole('button', { name: /^Show all \d+ authors$/ });
            if (await expand.count()) {
              await expand.focus();
              await page.keyboard.press('Enter');
            }
            await expect(entry).toContainText(byline);
            await entry.evaluate((element) => element.scrollIntoView({ block: 'center' }));
            const rect = await entry.boundingBox();
            expect(rect!.x).toBeGreaterThanOrEqual(0);
            expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width);
            await capture(`reference-${id}`);
          }
          if (viewport.width === 375) {
            // Owner-approved successor (Josef, 2026-10-10, the research-page
            // standard): the "Open navigation menu" drawer button is gone;
            // the top bar's "Articles" button opens the same "Site
            // navigation" dialog, makes the page inert and takes focus back.
            const trigger = page.getByRole('button', { name: 'Articles' });
            await trigger.focus();
            await page.keyboard.press('Enter');
            const drawer = page.getByRole('dialog', { name: 'Site navigation' });
            await expect(drawer).toBeVisible();
            await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
            await capture('drawer-open');
            await page.keyboard.press('Escape');
            await expect(drawer).toHaveCount(0);
            await expect(trigger).toBeFocused();
            await expect(page.locator('[inert]')).toHaveCount(0);
          }
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
          expect(external).toEqual([]);
          expect(errors).toEqual([]);
        } finally {
          writeFileSync(testInfo.outputPath('reader-evidence.json'), JSON.stringify({
            route: `/classical/${slug}/`, viewport, captures, external, errors,
            limit: 'Selected reader/source scope only; inherited glossary, authored claims, scene10 and whole-reference-rubric acceptance are not certified.',
          }, null, 2) + '\n');
        }
      });
    }
  }
});
