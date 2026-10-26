import { test, expect } from '@playwright/test';
import { CITATIONS } from '../../data/citations';
import { waitForHydration } from './interaction-ready';
import { citeParts, dismissCiteNote, jumpFromCiteMark, showCiteNote } from './helpers/citation-note';

const sources = [
  { slug: 'legged-locomotion', id: 'mit-humanoid-rewards-2023', count: 1 },
  // Since the length cut fa85511f (2026-10-13) the article no longer cites
  // RDA inline; its frontmatter keeps the source, so the References carry
  // it under "Further reading" and the bibliography half is read there.
  { slug: 'reward-design-mpc', id: 'rda-2026', count: 0 },
  { slug: 'reward-design-mpc', id: 'mujoco-ilqr-2026', count: 5 },
  { slug: 'reward-design-mpc', id: 'eureka-2024', count: 4 },
];

for (const source of sources) {
  test(`${source.id}: exact citations, focus and complete bibliography`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/rl-sim2real/${source.slug}/`);
    const citation = CITATIONS.find(c => c.id === source.id)!;
    const chips = page.locator(`[data-cite-id="${source.id}"]`);
    await expect(chips).toHaveCount(source.count);
    for (let i = 0; i < source.count; i++) {
      const chip = chips.nth(i);
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the chip and its hover/focus tooltip became a numbered
      // citation with a sidenote. The source link is the note's author-year
      // link; the note shows by pointer and by keyboard (in the margin from
      // 1200 px, inline below that) and must stay inside the viewport; the
      // number is the hit-tested stop and jumps to the References entry.
      const { mark, note, source: link } = citeParts(chip);
      await expect(link).toHaveAttribute('href', citation.url);
      await mark.evaluate(el => el.scrollIntoView({ block: 'center' }));
      for (const mode of ['hover', 'focus'] as const) {
        if (mode === 'focus') await page.mouse.move(0, 0);
        await showCiteNote(page, chip, mode === 'hover' ? 'hover' : 'keyboard');
        await expect(note).toBeVisible();
        const box = (await note.boundingBox())!;
        expect.soft(box.x, `${source.id} ${i} ${mode} left`).toBeGreaterThanOrEqual(0);
        expect.soft(box.x + box.width, `${source.id} ${i} ${mode} right`).toBeLessThanOrEqual(info.project.use.viewport!.width);
        expect.soft(box.y, `${source.id} ${i} ${mode} top`).toBeGreaterThanOrEqual(0);
        expect.soft(box.y + box.height, `${source.id} ${i} ${mode} bottom`).toBeLessThanOrEqual(info.project.use.viewport!.height);
        if (i === source.count - 1 && mode === 'focus') await page.screenshot({ path: info.outputPath('citation-focus.png') });
        await dismissCiteNote(page, chip, mode === 'hover' ? 'hover' : 'keyboard');
      }
      expect(await mark.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      const restore = await jumpFromCiteMark(page, chip, source.id);
      const reference = page.locator(`[data-reference-id="${source.id}"]`);
      await expect(reference).toBeInViewport();
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      const expand = reference.getByRole('button');
      if (await expand.count()) await expand.first().click();
      for (const author of citation.authors) await expect(reference).toContainText(author);
      if (i === source.count - 1) await page.screenshot({ path: info.outputPath('full-byline.png') });
      if (await expand.count()) await expand.first().click();
      await restore();
      await page.goBack();
      await expect(page).not.toHaveURL(new RegExp(`#ref-${source.id}$`));
    }
    if (source.count === 0) {
      const reference = page.locator(`[data-reference-id="${source.id}"]`);
      await expect(reference).toHaveCount(1);
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      // Successor of the full-byline pin (research-page standard, Josef
      // 2026-10-10): an entry over six names shows six and "and N more" with
      // a "Show all N authors" disclosure, which swaps in every name.
      if (citation.authors.length > 6) {
        await expect(reference.locator('[data-author-names]'))
          .toHaveText(`${citation.authors.slice(0, 6).join(', ')}, and ${citation.authors.length - 6} more`);
        await reference.getByRole('button', { name: `Show all ${citation.authors.length} authors`, exact: true }).click();
      }
      for (const author of citation.authors) await expect(reference).toContainText(author);
      const group = await reference.evaluate(el => el.closest('ol')?.previousElementSibling?.textContent?.trim());
      expect(group).toBe('Further reading');
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('retained Eureka generation control remains operable', async ({ page }) => {
  await page.goto('/rl-sim2real/reward-design-mpc/');
  const next = page.getByRole('button', { name: 'Next round' });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(next).toBeEnabled();
  const surprises = page.getByRole('group', { name: 'Surprise for the robot' }).getByRole('button');
  await expect(surprises.first()).toBeEnabled();
  await waitForHydration(surprises.last());
  await surprises.last().click();
  await expect(surprises.last()).toHaveAttribute('aria-pressed', 'true');
});
