import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CITATIONS } from '../../data/citations';

const out = process.env.DR_READER_OUT;
const run = process.env.DR_READER_RUN ?? 'newton-reader';
const sources = [
  ['parallel-sim-rl', 'newton-manipulation-blog-2026'],
  ['parallel-sim-rl', 'state-of-simulation-2026'],
  ['sim2real-transfer', 'newton-manipulation-blog-2026'],
  // This article's prose is held and unchanged. The shared six-author
  // metadata correction still changes its References byline.
  ['reward-design-mpc', 'state-of-simulation-2026'],
] as const;
async function capture(page: Page, name: string) {
  if (out) await page.screenshot({ path: path.join(out, `${run}-${page.viewportSize()!.width}-${name}.png`) });
}
async function center(locator: Locator) {
  await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
}
async function hit(locator: Locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    return u.hostname === '127.0.0.1' || u.protocol === 'data:' ? route.continue() : route.abort();
  });
});
for (const [slug, id] of sources) {
  test(`${slug}/${id}: all occurrences, ordered byline, Enter and Back`, async ({ page }) => {
    const errors: string[] = [], external: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => {
      const u = new URL(r.url());
      if (u.hostname !== '127.0.0.1' && u.protocol !== 'data:') external.push(u.href);
    });
    const citation = CITATIONS.find(c => c.id === id)!;
    const text = readFileSync(`content/rl-sim2real/${slug}.mdx`, 'utf8');
    const expected = text.split(`<Cite id="${id}" />`).length - 1;
    expect(expected).toBeGreaterThan(0);
    const route = `/rl-sim2real/${slug}/`;
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const chips = page.locator(`div.prose[data-pagefind-body] [data-cite-id="${id}"]`);
    await expect(chips).toHaveCount(expected);
    const observations = [];
    for (let i = 0; i < expected; i++) {
      const chip = chips.nth(i), link = chip.locator('a').first();
      await expect(link).toHaveAttribute('href', citation.url);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await center(link);
      for (const mode of ['hover', 'focus'] as const) {
        await page.mouse.move(0, 0);
        await link.evaluate(el => (el as HTMLElement).blur());
        if (mode === 'hover') await link.hover(); else await link.focus();
        const tooltip = chip.getByRole('tooltip');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(citation.title);
        const box = (await tooltip.boundingBox())!, source = (await link.boundingBox())!;
        const hitTest = await hit(link);
        observations.push({ id, slug, index: i, mode, tooltip: box, source, hitTest });
        expect.soft(box.x, `${slug}/${id}/${i}/${mode} left`).toBeGreaterThanOrEqual(0);
        expect.soft(box.x + box.width, `${slug}/${id}/${i}/${mode} right`).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect.soft(box.y, `${slug}/${id}/${i}/${mode} top`).toBeGreaterThanOrEqual(page.viewportSize()!.width < 1024 ? 48 : 0);
        expect.soft(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
        expect.soft(source.y).toBeGreaterThanOrEqual(64);
        expect.soft(hitTest, `${slug}/${id}/${i}/${mode} source hit`).toBe(true);
        if (mode === 'focus') await capture(page, `${slug}-${id}-${i}-focus`);
      }
    }
    const jump = chips.last().locator(`a[href="#ref-${id}"]`);
    await center(jump); await jump.focus(); await jump.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const reference = page.locator(`[data-reference-id="${id}"]`);
    const title = reference.locator('[data-reference-source-link]');
    await expect(title).toHaveText(citation.title);
    await expect(title).toHaveAttribute('href', citation.url);
    expect.soft(await hit(title)).toBe(true);
    const names = reference.locator('[data-author-names]');
    await expect(names).toHaveText(citation.authors.join(', '));
    await expect(reference.getByRole('button')).toHaveCount(0); // five/six authors: no truncation
    const byline = await names.boundingBox(), referenceBox = await reference.boundingBox();
    expect.soft(byline!.x).toBeGreaterThanOrEqual(0);
    expect.soft(byline!.x + byline!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await capture(page, `${slug}-${id}-byline`);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    const back = await page.evaluate(() => ({ tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.slice(0,160), scrollY }));
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const fonts = await page.evaluate(() => ({
      status: document.fonts.status,
      h1: getComputedStyle(document.querySelector('h1')!).fontFamily,
      prose: getComputedStyle(document.querySelector('div.prose[data-pagefind-body] p')!).fontFamily,
      loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
    }));
    expect(fonts.status).toBe('loaded');
    expect(fonts.h1).toMatch(/Tektur/i);
    expect(fonts.prose).toMatch(/Newsreader/i);
    expect(errors).toEqual([]);
    if (out) writeFileSync(path.join(out, `${run}-${page.viewportSize()!.width}-${slug}-${id}-metrics.json`),
      JSON.stringify({ expected, observations, byline, referenceBox, back, fonts, errors, external,
        limitation: 'Back URL observed; BODY focus is an existing history-owner gap, not a focus-restoration pass. No glyph/cmap, Axe, full-reference or independent acceptance.' }, null, 2) + '\n');
  });
}
test('parallel: changed Stat and source-scoped prose retain readable geometry', async ({ page }) => {
  await page.goto('/rl-sim2real/parallel-sim-rl/');
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  for (const text of ['Isaac Sim 6.0 and Isaac Lab 3.0 early access releases',
    'differentiation support differs between solvers', 'example configuration',
    'Samsung "will use Newton"', 'simulated RB-Y1', '252x for locomotion and 475x for manipulation',
    'RTX PRO 6000 Blackwell Series', 'not a comparative benchmark']) await expect(prose).toContainText(text);
  const value = prose.getByText('252x / 475x', { exact: true });
  await center(value);
  const stat = value.locator('..'), box = await stat.boundingBox();
  await expect(stat).toContainText('NVIDIA report: locomotion / manipulation; limits below');
  expect(await stat.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await capture(page, 'parallel-stat');
  await center(prose.getByText(/The release post describes SDF-based collision/));
  await capture(page, 'parallel-sdf');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('transfer: current Newton statement preserves the separate paper context', async ({ page }) => {
  await page.goto('/rl-sim2real/sim2real-transfer/');
  await page.evaluate(() => document.fonts.ready);
  const prose = page.locator('div.prose[data-pagefind-body]');
  for (const text of ['86.25%', 'Those descriptions disagree',
    'Only the fine-tuned tracking policy is deployed', '90% placement', '30% in RoboGSim',
    'ray-tracing backend supports both triangle meshes and Gaussian splats']) await expect(prose).toContainText(text);
  await center(prose.getByText(/This evaluation is not interchangeable with real-robot testing/));
  await capture(page, 'transfer-context');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
