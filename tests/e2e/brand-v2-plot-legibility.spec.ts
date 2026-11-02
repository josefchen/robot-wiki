import { readFileSync } from 'node:fs';
import { expect, test, brandV2Registry } from './brand-v2-static-fixture';

const tokens = JSON.parse(readFileSync('motion-tokens.json', 'utf8'));

test('every phone plot keeps its full-size stage and readable tick numerals', async ({ browser, staticBase }, testInfo) => {
  test.setTimeout(600_000);
  const observations: Array<{ route: string; width: number; ticks: number[] }> = [];
  for (const { path } of brandV2Registry.routes.public) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${staticBase}${path}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Method folds are real available states, including any plots they hold.
      await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>('main details').forEach((detail) => { detail.open = true; }));
      for (const frame of await page.locator('main [data-figure-frame]').all()) await frame.scrollIntoViewIfNeeded();
      const plots = page.locator('main [data-figure-frame] svg.motion-stage-svg');
      for (const plot of await plots.all()) {
        if (!(await plot.isVisible())) continue;
        await plot.scrollIntoViewIfNeeded();
        const measured = await plot.evaluate((svg) => ({
          width: svg.getBoundingClientRect().width,
          ticks: [...svg.querySelectorAll<SVGTextElement>('text[data-scene-tick]')].filter((text) => {
            const box = text.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && getComputedStyle(text).visibility === 'visible';
          }).map((text) => {
            const matrix = text.getScreenCTM();
            return parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0);
          }),
        }));
        observations.push({ route: path, ...measured });
        expect(measured.width, `${path} phone stage width`).toBeGreaterThanOrEqual(tokens.type.stageScale.fullSizeMinStagePx);
        for (const tick of measured.ticks) expect(tick, `${path} painted tick size`).toBeGreaterThanOrEqual(tokens.stage.labelMinPx);
      }
    } finally {
      await context.close();
    }
  }
  expect(observations.length).toBeGreaterThan(0);
  expect(observations.flatMap((row) => row.ticks).length).toBeGreaterThan(0);
  await testInfo.attach('phone-plot-legibility', { body: JSON.stringify(observations, null, 2), contentType: 'application/json' });
});
