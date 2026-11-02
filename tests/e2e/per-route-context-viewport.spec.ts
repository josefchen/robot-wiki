import { expect, test } from '@playwright/test';
import { forEachInOwnContext, inOwnContext, mapInOwnContext } from './helpers/per-route-context';

test('route sweep contexts inherit the phone override and retain explicit accessibility profiles', async ({ browser }) => {
  const previous = process.env.E2E_VIEWPORT;
  process.env.E2E_VIEWPORT = '375x812';
  try {
    await forEachInOwnContext(browser, ['first', 'second'], async (page) => {
      await page.setContent('<main>Viewport measurement</main>');
      expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 375, height: 812 });
    });
    expect(await mapInOwnContext(browser, [1, 2], (page) => page.evaluate(() => innerWidth))).toEqual([375, 375]);
    await inOwnContext(browser, async (page) => {
      expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 320, height: 800 });
    }, { viewport: { width: 320, height: 800 } });
  } finally {
    if (previous === undefined) delete process.env.E2E_VIEWPORT;
    else process.env.E2E_VIEWPORT = previous;
  }
});
