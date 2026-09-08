import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
    const limits = prose.locator('p').filter({ hasText: /^This is a bounded real-to-sim authoring/ });
    await expect(mechanism).toHaveCount(1);
    await expect(limits).toContainText('exclude runtime-error cases');
    await expect(limits).toContainText('Sim-to-real training and transfer remain future work');
    for (const paragraph of [mechanism, limits]) {
      await expect(paragraph.locator('[data-cite-id="grs-2024"] a[href="https://arxiv.org/abs/2410.15536"]')).toHaveCount(1);
    }
    const eureka = prose.locator('li').filter({ hasText: 'Task fitness need not capture human intent.' })
      .locator('[data-cite-id="eureka-2024"]');
    await eureka.locator('a[href^="http"]').focus();
    const popup = await eureka.getByRole('tooltip').boundingBox();
    expect(popup).not.toBeNull();
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
    const authors = page.locator('[data-reference-id="grs-2024"] [data-author-names]');
    await expect(authors).toHaveText('Alex Zook, Fan-Yun Sun, Josef Spjut, Valts Blukis, Stan Birchfield, Jonathan Tremblay');
    const physics = page.getByRole('button', { name: /^physics proxy$/i });
    await physics.focus();
    await page.keyboard.press('Enter');
    await expect(physics).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
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
    await expect(prose).toContainText('not strict wins everywhere');
    await expect(prose).toContainText('maximum task fitness over ten fixed-interval checkpoints');
    await expect(prose).toContainText('not a 52-percentage-point increase');
    const eureka = prose.locator('p').filter({ hasText: /^Eureka searches over reward code/ })
      .locator('[data-cite-id="eureka-2024"]');
    await eureka.locator('a[href^="http"]').focus();
    const popup = await eureka.getByRole('tooltip').boundingBox();
    expect(popup).not.toBeNull();
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(width);
    const reference = page.locator('[data-reference-id="eureka-2024"]');
    await reference.getByRole('button', { name: 'Show all 9 authors' }).click();
    await expect(reference.locator('[data-author-names]')).toContainText('Anima Anandkumar');
    await expect(reference.locator('[data-author-names]')).not.toContainText('more');
    const next = page.getByRole('button', { name: 'Run next generation' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('generation-readout')).toHaveText('Generation 1 of 2');
    await next.locator('..').getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('generation-readout')).toHaveText('Generation 0 of 2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
