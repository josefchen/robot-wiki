import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CITATIONS } from '../../data/citations';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';

const ids = ['exbody2-2024', 'kungfubot-2025', 'gmt-2025'] as const;
const out = process.env.DR_READER_OUT;
const run = process.env.DR_READER_RUN ?? 'advanced-reader';
async function capture(page: Page, name: string) {
  if (!out) return;
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, `${run}-${page.viewportSize()!.width}-${name}.png`) });
}
async function center(locator: Locator) {
  await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
}
async function hit(locator: Locator) {
  expect(await locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://localhost:3200' ||
      url.origin === 'http://127.0.0.1:3200' || url.protocol === 'data:'
      ? route.continue() : route.abort();
  });
  await page.goto('/rl-sim2real/humanoid-wbc/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toContainText(/whole.body control/i);
});

test('current corrected prose preserves scope, limitations and peer lineage', async ({ page }) => {
  for (const text of ['drifting global keypoint targets',
    'lower-body tracking error',
    'transitions between specialists remain unresolved', 'policy per processed reference motion',
    'ten Tai Chi trials', 'root fixed', 'expert actions']) {
    await expect(page.locator('main')).toContainText(text);
  }
  await center(page.getByRole('heading', { name: 'The tracking lineage', exact: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, 'lineage');
});

for (const id of ids) {
  test(`${id}: every corrected chip, keyboard reference and full byline`, async ({ page }) => {
    const citation = CITATIONS.find(c => c.id === id)!;
    const chips = page.locator(`[data-cite-id="${id}"]`);
    await expect(chips).toHaveCount(1);
    const observations = [];
    for (let i = 0; i < await chips.count(); i++) {
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the chip's first link (the source) and its role="tooltip"
      // became a number with a sidenote (helpers/citation-note.ts). The
      // source href is read off the note's author-year link; the number is
      // pointed at or focused, which shows the note (in the margin at rest
      // at this 1280 px viewport), and the number clears the top bar while
      // the source link takes the hit test.
      const chip = chips.nth(i);
      const { mark, note: tooltip, source } = citeParts(chip);
      await expect(source).toHaveAttribute('href', citation.url);
      await waitForHydration(mark);
      await center(mark);
      for (const mode of ['hover', 'focus'] as const) {
        await page.mouse.move(0, 0);
        await mark.evaluate(el => (el as HTMLElement).blur());
        await showCiteNote(page, chip, mode === 'hover' ? 'hover' : 'keyboard');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(citation.title);
        const r = await tooltip.boundingBox(), s = await mark.boundingBox();
        expect(r).not.toBeNull();
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(r!.y).toBeGreaterThanOrEqual(0);
        expect(s!.y).toBeGreaterThanOrEqual(64);
        await hit(source);
        observations.push({ id, index: i, mode, tooltip: r, source: s });
        if (mode === 'focus') await capture(page, `${id}-${i}-focus`);
        await dismissCiteNote(page, chip, mode === 'hover' ? 'hover' : 'keyboard');
      }
    }
    // The number now carries the #ref- link the chip's "Jump to the full
    // reference" link did.
    const jump = chips.last().locator(`a[href="#ref-${id}"]`);
    await center(jump);
    await jump.focus();
    await jump.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const reference = page.locator(`[data-reference-id="${id}"]`);
    await expect(reference).toBeVisible();
    const title = reference.locator('[data-reference-source-link]');
    await expect(title).toHaveText(citation.title);
    await expect(title).toHaveAttribute('href', citation.url);
    expect((await title.boundingBox())!.y).toBeGreaterThanOrEqual(page.viewportSize()!.width < 1024 ? 48 : 0);
    await hit(title);
    const names = reference.locator('[data-author-names]');
    if (citation.authors.length > 8) {
      const toggle = reference.getByRole('button', { name: `Show all ${citation.authors.length} authors` });
      await toggle.focus(); await toggle.press('Enter');
      await expect(names).toHaveText(citation.authors.join(', '));
      await expect(reference.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
      await capture(page, `${id}-expanded`);
      await reference.getByRole('button', { name: 'Show 8 authors' }).press('Enter');
      await expect(reference.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
      await expect(names).toContainText(`and ${citation.authors.length - 8} more`);
    } else {
      await expect(names).toHaveText(citation.authors.join(', '));
      await expect(reference.getByRole('button')).toHaveCount(0);
      await capture(page, `${id}-byline`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (out) writeFileSync(path.join(out, `${run}-${page.viewportSize()!.width}-${id}-metrics.json`), JSON.stringify(observations, null, 2) + '\n');
  });
}
