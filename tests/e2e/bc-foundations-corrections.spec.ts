import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';
import { openAdjustMore } from './helpers/figure-fold';

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
    await expect(prose).toContainText('it promises no improvement for any particular iterate');
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
    // The toy is stated once, in the prose, and the figure lives inside
    // the prediction step at its seeded 240-step horizon.
    await expect(prose).toContainText('neither a source benchmark nor a task-cost theorem');
    await page.locator('[data-predict] details[data-reveal] > summary').click();
    const toy = page.locator('[data-predict] [data-figure-frame="compounding-error"]');
    await expect(toy).toHaveCount(1);
    await toy.scrollIntoViewIfNeeded();
    await expect(toy).toContainText('Original deterministic toy');
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('1505');
    await expect(toy.getByTestId('half-deviation-readout')).toHaveText('370');
    await expect(toy.locator('[data-figure-stage] [data-figure-annotation]')).toHaveText(
      'Twice as long:about four times as far off course',
    );
    await capture('toy-default');
    await toy.getByRole('button', { name: 'Short task (120 moves)', exact: true }).click();
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('370');
    await openAdjustMore(toy);
    const horizon = toy.getByRole('slider', { name: /episode horizon/i });
    await expect(horizon).toHaveValue('120');
    await setSlider(horizon, 180);
    await expect(horizon).toHaveValue('180');
    await horizon.focus();
    await page.keyboard.press('End');
    await expect(horizon).toHaveValue('240');
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('1505');
    await toy.getByRole('button', { name: '25 moves per plan', exact: true }).click();
    const chunk = Number(await toy.getByTestId('accumulated-deviation-readout').textContent());
    expect(chunk).toBeLessThan(1505);
    await toy.getByRole('button', { name: 'A teacher corrects it', exact: true }).click();
    expect(Number(await toy.getByTestId('accumulated-deviation-readout').textContent())).toBeLessThan(1505);
    await capture('toy-changed');
    await toy.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(toy.getByTestId('accumulated-deviation-readout')).toHaveText('1505');
    for (const [name, heading] of [
      ['theory', 'Covariate shift, stated precisely'],
      ['dagger', 'DAgger: relabel the states you actually visit'],
    ]) {
      await page.getByRole('heading', { name: heading, exact: false }).scrollIntoViewIfNeeded();
      await capture(name);
    }
    // The pointer still rests where the Reset click left it, which after
    // the scrolls above can be over a glossary term; park it so no hover
    // tooltip competes with the focused citation's.
    await page.mouse.move(0, 0);
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
