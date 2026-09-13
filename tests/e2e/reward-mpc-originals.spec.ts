import { test, expect } from '@playwright/test';
import { CITATIONS } from '../../data/citations';

const sources = [
  { slug: 'legged-locomotion', id: 'mit-humanoid-rewards-2023', count: 1 },
  { slug: 'reward-design-mpc', id: 'rda-2026', count: 1 },
  { slug: 'reward-design-mpc', id: 'mujoco-ilqr-2026', count: 2 },
  { slug: 'reward-design-mpc', id: 'eureka-2024', count: 5 },
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
      const link = chip.locator('a[target="_blank"]');
      await expect(link).toHaveAttribute('href', citation.url);
      await link.evaluate(el => el.scrollIntoView({ block: 'center' }));
      for (const mode of ['hover', 'focus']) {
        if (mode === 'hover') await link.hover();
        else { await page.mouse.move(0, 0); await link.focus(); }
        const tip = chip.getByRole('tooltip');
        await expect(tip).toBeVisible();
        const box = (await tip.boundingBox())!;
        expect.soft(box.x, `${source.id} ${i} ${mode} left`).toBeGreaterThanOrEqual(0);
        expect.soft(box.x + box.width, `${source.id} ${i} ${mode} right`).toBeLessThanOrEqual(info.project.use.viewport!.width);
        expect.soft(box.y, `${source.id} ${i} ${mode} top`).toBeGreaterThanOrEqual(0);
        expect.soft(box.y + box.height, `${source.id} ${i} ${mode} bottom`).toBeLessThanOrEqual(info.project.use.viewport!.height);
      }
      if (i === source.count - 1) await page.screenshot({ path: info.outputPath('citation-focus.png') });
      expect(await link.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      const jump = chip.locator(`a[href="#ref-${source.id}"]`);
      await jump.focus();
      await jump.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#ref-${source.id}$`));
      const reference = page.locator(`[data-reference-id="${source.id}"]`);
      await expect(reference).toBeInViewport();
      await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
      const expand = reference.getByRole('button');
      if (await expand.count()) await expand.first().click();
      for (const author of citation.authors) await expect(reference).toContainText(author);
      if (i === source.count - 1) await page.screenshot({ path: info.outputPath('full-byline.png') });
      if (await expand.count()) await expand.first().click();
      await page.goBack();
      await expect(page).not.toHaveURL(new RegExp(`#ref-${source.id}$`));
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('retained Eureka generation control remains operable', async ({ page }) => {
  await page.goto('/rl-sim2real/reward-design-mpc/');
  const next = page.getByRole('button', { name: 'Run next generation' });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(next).toBeEnabled();
  await expect(page.getByRole('group', { name: 'Perturbation' }).getByRole('button').first()).toBeEnabled();
  await page.getByRole('group', { name: 'Perturbation' }).getByRole('button').last().click();
});
