import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForHydration } from './interaction-ready';
import { citeParts, revealCiteNote } from './helpers/citation-note';

/**
 * The box of a citation's source popup. Owner-approved successor (Josef,
 * 2026-10-10, the research-page standard): the focus tooltip became a
 * sidenote (tests/e2e/helpers/citation-note.ts), so the note is shown by
 * keyboard, as the tooltip was, and its source link is checked first.
 */
async function sourceNoteBox(cite: Locator) {
  const { mark, source } = citeParts(cite);
  await expect(source).toHaveAttribute('href', /^https?:\/\//);
  // Enter before hydration follows the number's #ref- link instead of
  // opening the note.
  await waitForHydration(mark);
  return (await revealCiteNote(cite, 'keyboard')).boundingBox();
}

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  await context.addInitScript(() => {
    const install = () => {
      if (!document.documentElement || document.getElementById('source-proof-motion')) return;
      const style = document.createElement('style');
      style.id = 'source-proof-motion';
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      document.documentElement.appendChild(style);
    };
    new MutationObserver(install).observe(document, { childList: true, subtree: true });
    install();
  });
});

for (const width of [1440, 375]) {
  test(`GRS bounded procedure and local source remain readable at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/world-models/generative-sim/');
    const prose = page.locator('div.prose[data-pagefind-body]');
    const mechanism = prose.locator('p').filter({ hasText: /^GRS starts from/ });
    const limits = mechanism;
    await expect(mechanism).toHaveCount(1);
    await expect(limits).toContainText('exclude runtime-error cases');
    await expect(limits).toContainText('sim-to-real transfer is future work');
    for (const paragraph of [mechanism, limits]) {
      await expect(paragraph.locator('[data-cite-id="grs-2024"] a[href="https://arxiv.org/abs/2410.15536"]')).toHaveCount(1);
    }
    const eureka = prose.locator('li').filter({ hasText: 'Task fitness may miss human intent.' })
      .locator('[data-cite-id="eureka-2024"]');
    const popup = await sourceNoteBox(eureka);
    expect(popup).not.toBeNull();
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
    const authors = page.locator('[data-reference-id="grs-2024"] [data-author-names]');
    await expect(authors).toHaveText('Alex Zook, Fan-Yun Sun, Josef Spjut, Valts Blukis, Stan Birchfield, Jonathan Tremblay');
    // The physics-proxy layer (collision hull, mass and friction) is the
    // "Shape, weight and friction" toggle. It and Reset sit in the push
    // figure's closed "Adjust more" fold, which a reader opens through its
    // summary. A fold opened before hydration makes React report an `open`
    // mismatch.
    const figure = page.locator('main [data-figure-frame="appearance-physics-push"]');
    const adjust = figure.locator('[data-figure-fold="adjust"] > summary');
    await waitForHydration(adjust);
    await adjust.click();
    const physics = figure
      .getByRole('group', { name: 'Layers' })
      .getByRole('button', { name: 'Shape, weight and friction', exact: true });
    await physics.focus();
    await page.keyboard.press('Enter');
    await expect(physics).toHaveAttribute('aria-pressed', 'true');
    await figure.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(physics).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`Eureka protocol, full byline and unchanged fixture controls at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/rl-sim2real/reward-design-mpc/');
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText(
      'matches or beats the human reward on all nine Isaac tasks and 15 of 20 Dexterity tasks');
    await expect(prose).toContainText('maximum task fitness over ten checkpoints');
    await expect(prose).toContainText('so 52% measures normalized reward improvement');
    const eureka = prose.locator('p').filter({ hasText: /^Eureka searches over reward code/ })
      .locator('[data-cite-id="eureka-2024"]');
    const popup = await sourceNoteBox(eureka);
    expect(popup).not.toBeNull();
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
    const reference = page.locator('[data-reference-id="eureka-2024"]');
    await reference.getByRole('button', { name: 'Show all 9 authors' }).click();
    await expect(reference.locator('[data-author-names]')).toContainText('Anima Anandkumar');
    await expect(reference.locator('[data-author-names]')).not.toContainText('more');
    const next = page.getByRole('button', { name: 'Next round' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('round-readout')).toHaveText('Round 2 of 3');
    await expect(page.getByTestId('generation-readout')).toHaveText('Generation 1 of 2');
    await next.locator('..').getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('round-readout')).toHaveText('Round 1 of 3');
    await expect(page.getByTestId('generation-readout')).toHaveText('Generation 0 of 2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
