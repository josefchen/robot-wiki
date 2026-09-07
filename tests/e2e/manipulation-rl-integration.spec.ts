import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`retained manipulation and RL corrections at ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const cases = [
      ['/manipulation/comparison-matrix', 'Octo transformer checkpoints:'],
      ['/manipulation/knowledge-insulation', '63 ms on one H100'],
      ['/manipulation/pi-line', 'control-mode label is not dropped'],
      ['/manipulation/realtime-execution', '138.98'],
      ['/rl-sim2real/rl-for-robotics', '122,880'],
    ];
    for (const [route, text] of cases) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('body')).toContainText(text);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(page.locator('.katex-error')).toHaveCount(0);
      const context = page.getByText(text, { exact: false }).last();
      await context.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${route.split('/').pop()}-${viewport.width}.png`) });
      if (route.endsWith('realtime-execution')) {
        await expect(page.locator('body')).toContainText('108.76');
        await expect(page.locator('body')).toContainText('training');
        const slider = page.getByRole('slider').first();
        await slider.focus();
        const before = await slider.inputValue();
        await slider.press('ArrowRight');
        expect(await slider.inputValue()).not.toBe(before);
        await page.screenshot({ path: info.outputPath(`control-interaction-${viewport.width}.png`) });
      }
    }
    expect(errors).toEqual([]);
  });
}
