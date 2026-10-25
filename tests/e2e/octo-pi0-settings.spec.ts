import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openAdjustMore } from './helpers/figure-fold';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';
for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`Octo/pi0 conditional settings render at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/manipulation/action-chunking/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const table = page.getByRole('table', { name: /Action horizon/ });
    const octo = table.getByRole('row', { name: /^Octo / });
    const pi0 = table.getByRole('row', { name: /^pi0 2024/ });
    await expect(octo).toContainText('ALOHA finetuning');
    await expect(octo).toContainText('12 of 64');
    await expect(octo).toContainText('not disclosed');
    await expect(pi0).toContainText('UR5e/Franka');
    await expect(pi0).toContainText('50 Hz');
    await expect(table.getByText('n/a', { exact: true })).toHaveCount(0);
    await octo.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-table.png`) });
    const region = page.getByRole('region', { name: /Action horizon/ });
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await page.screenshot({ path: info.outputPath(`${viewport.width}-table-focus.png`) });
    const note = page.locator('div.prose > p').filter({ hasText: 'example predicts 64 actions' });
    await note.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-source-notes.png`) });
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): focusing the chip's link showed a role="tooltip"; the
    // citation is now a number with a sidenote, shown by keyboard (in the
    // margin at rest from 1200 px, opened inline by Enter below it).
    for (const id of ['octo-2024', 'pi0-2024']) {
      const citation = page.locator(`div.prose [data-cite-id="${id}"]`).first();
      const { mark: cite, note } = citeParts(citation);
      await waitForHydration(cite);
      await showCiteNote(page, citation, 'keyboard');
      await expect(note).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${viewport.width}-${id}.png`) });
      await dismissCiteNote(page, citation, 'keyboard');
      await cite.blur();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const styles = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1')!).fontFamily, prose: getComputedStyle(document.querySelector('div.prose > p')!).fontFamily }));
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the H1 was pinned to Tektur and the prose to Newsreader;
    // the display family is now DM Sans and the body family Geist (not its
    // mono cut).
    expect(styles.h1).toMatch(/DM Sans/i);
    expect(styles.prose).toMatch(/^"?Geist"?,/i);
    await page.goto('/manipulation/comparison-matrix/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    // The full matrix sits in the figure's "Adjust more" fold.
    await openAdjustMore(page.locator('main [data-figure-frame="comparison-matrix"]'));
    const modelOcto = page.getByRole('row', { name: /^Octo / });
    await expect(modelOcto).toContainText('64 / 12');
    await expect(modelOcto).toContainText('ALOHA finetuning');
    await expect(page.getByRole('row', { name: /^π0 2024/ })).toContainText('50 / 16');
    await modelOcto.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${viewport.width}-model-table.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ viewport, styles, errors, captures: 6, outputDir: info.outputDir }));
  });
}
