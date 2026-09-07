import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`BC corrections retain truthful math and toy behavior at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/manipulation/bc-foundations/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('camera and laser-range inputs');
    await expect(prose).toContainText('trained on simulated road images');
    await expect(prose).toContainText('proposed future work');
    await expect(prose).toContainText('not a promise that every iterate improves');
    await expect(prose).toContainText('strongly convex');
    await expect(prose).toContainText('uninterrupted control');
    await expect(prose.locator('.katex-error')).toHaveCount(0);
    expect(await prose.locator('.katex').count()).toBeGreaterThan(10);
    await expect(page.getByText('$$', { exact: true })).toHaveCount(0);
    const capture = async (name: string) => {
      await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-${name}.png`) });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, name).toBeLessThanOrEqual(0);
    };
    await capture('top');
    await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-full.png`), fullPage: true });
    const toy = page.locator('div.prose > div.rounded-md:has([data-testid="accumulated-deviation-readout"])').first();
    await toy.scrollIntoViewIfNeeded();
    await expect(toy).toContainText('not a task-cost theorem');
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('370');
    await capture('toy-default');
    const horizon = toy.getByRole('slider', { name: /episode horizon/i });
    await horizon.focus();
    await page.keyboard.press('End');
    await expect(horizon).toHaveValue('240');
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('1505');
    await toy.getByRole('button', { name: /chunk of 25/i }).click();
    const chunk = Number(await toy.getByTestId('accumulated-deviation-readout').textContent());
    await toy.getByRole('button', { name: /dagger/i }).click();
    expect(Number(await toy.getByTestId('accumulated-deviation-readout').textContent())).toBeLessThan(chunk);
    await capture('toy-changed');
    await toy.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('370');
    for (const [name, heading] of [
      ['theory', 'Covariate shift, stated precisely'],
      ['dagger', 'DAgger: relabel the states you actually visit'],
    ]) {
      await page.getByRole('heading', { name: heading, exact: false }).scrollIntoViewIfNeeded();
      await capture(name);
    }
    const hg = prose.locator('[data-cite-id="hg-dagger-2019"] a').first();
    await hg.focus();
    await expect(page.getByRole('tooltip')).toContainText('arXiv v2 (11 March 2019)');
    await capture('hg-citation');
    const citationIds = await prose.locator('[data-cite-id]').evaluateAll((els) =>
      [...new Set(els.map((el) => el.getAttribute('data-cite-id')))].sort());
    expect(citationIds).toEqual([
      'act-aloha-2023', 'alvinn-1988', 'dagger-2011',
      'diffusion-policy-2023', 'hg-dagger-2019', 'pistar06-blog-2025',
    ]);
    await hg.blur();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(pageErrors).toEqual([]);
    console.log(JSON.stringify({ viewport, citationIds, pageErrors, captures: 7, outputDir: testInfo.outputDir }));
  });

  test(`BC bounded equation captures and type roles at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/manipulation/bc-foundations/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const styles = await page.evaluate(() => {
      const heading = getComputedStyle(document.querySelector('h1')!);
      const body = getComputedStyle(document.querySelector('div.prose > p')!);
      return {
        headingFont: heading.fontFamily, headingSize: heading.fontSize,
        bodyFont: body.fontFamily, bodySize: body.fontSize,
        lineHeight: body.lineHeight,
      };
    });
    expect(styles.headingFont).toMatch(/Tektur/i);
    expect(styles.bodyFont).toMatch(/Newsreader/i);
    const equations = page.locator('div.prose .katex-display');
    await expect(equations).toHaveCount(3);
    const tex: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const equation = equations.nth(i);
      await equation.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      tex.push(await equation.locator('annotation').textContent() ?? '');
      await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-equation-${i + 1}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
    expect(tex[1]).toContain('uT\\varepsilon_N');
    expect(tex[2]).toContain('\\min_{\\pi\\in\\Pi}');
    console.log(JSON.stringify({ viewport, styles, tex, captures: 3, outputDir: testInfo.outputDir }));
  });
}
