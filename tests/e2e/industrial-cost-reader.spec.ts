import { test, expect } from './servo-apollo-fixture';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`industrial cost and responsibility reader at ${viewport.width}px`, async ({ page }, testInfo) => {
    const captures: object[] = [];
    const errors: string[] = [];
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS ?? null;
    const inputSha256 = inputPath
      ? createHash('sha256').update(readFileSync(inputPath)).digest('hex')
      : null;
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const capture = async (name: string, state: object = {}) => {
      const path = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path, animations: 'disabled' });
      captures.push({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
        viewport, url: page.url(), utc: new Date().toISOString(), inputPath, inputSha256, state });
      writeFileSync(testInfo.outputPath('reader.json'), JSON.stringify({ captures, errors }, null, 2));
    };
    await page.setViewportSize(viewport);
    const response = await page.goto('/data-hardware/industrial-deployment/');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const paragraph = prose.locator('p').filter({ hasText: "EVST's July 15, 2026" });
    await expect(paragraph).toContainText('application-specific end-of-arm tooling');
    await expect(paragraph).not.toContainText('part fixtures');
    const responsibility = prose.locator('p').filter({ hasText: "OSHA's Technical Manual, discussing" });
    await expect(responsibility).toContainText('Manufacturers or employers may also act as integrators');
    await expect(responsibility).toContainText('risk assessment alone does not establish');
    await expect(responsibility).not.toContainText('not the robot manufacturer');
    for (const [name, element] of [['cost', paragraph], ['responsibility', responsibility]] as const) {
      await element.scrollIntoViewIfNeeded();
      const box = (await element.boundingBox())!;
      for (let offset = 0, i = 1; offset < box.height; offset += viewport.height - 180, i++) {
        await element.evaluate((e, y) => window.scrollBy(0, e.getBoundingClientRect().top - 100 + y), offset);
        await capture(`${name}-${i}`, { offset, text: await element.innerText() });
      }
    }
    for (const [id, parent, byline] of [
      ['evst-cell-cost-2026', paragraph, 'EVST Engineering Team'],
      ['osha-otm-robots', responsibility, 'Occupational Safety and Health Administration'],
    ] as const) {
      const cite = parent.locator(`[data-cite-id="${id}"]`).last();
      await cite.scrollIntoViewIfNeeded();
      await cite.evaluate(e => window.scrollBy(0, e.getBoundingClientRect().top - (innerHeight - 120)));
      const link = cite.locator('a, button').first();
      await link.hover();
      const tip = cite.getByRole('tooltip');
      await expect(tip).toBeVisible();
      const hover = (await tip.boundingBox())!;
      await link.focus();
      await expect(tip).toContainText(byline);
      const focus = (await tip.boundingBox())!;
      for (const bounds of [hover, focus]) {
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      }
      await capture(`${id}-focus`, { hover, focus, byline });
      await page.keyboard.press('Tab');
      const reference = page.locator(`#ref-${id}`);
      await expect(reference).toContainText(byline);
      await reference.scrollIntoViewIfNeeded();
      await capture(`${id}-reference`, { text: await reference.innerText() });
    }
    const slider = prose.getByRole('slider', { name: /per-pick success/i });
    await slider.focus();
    const initial = await slider.inputValue();
    await page.keyboard.press('ArrowLeft');
    expect(Number(await slider.inputValue())).toBeLessThan(Number(initial));
    await prose.getByRole('button', { name: /reset/i }).focus();
    await page.keyboard.press('Enter');
    await expect(slider).toHaveValue(initial);
    if (viewport.width === 375) {
      const open = page.getByRole('button', { name: /open navigation/i });
      await open.focus(); await page.keyboard.press('Enter');
      const close = page.getByRole('button', { name: /close navigation/i });
      await expect(close).toBeFocused();
      expect(await page.locator('[inert]').count()).toBeGreaterThan(0);
      await page.keyboard.press('Shift+Tab');
      const last = await page.evaluate(() => document.activeElement?.outerHTML);
      await page.keyboard.press('Tab'); await expect(close).toBeFocused();
      await page.keyboard.press('Tab');
      await capture('drawer-keyboard', { last, first: await page.evaluate(() => document.activeElement?.outerHTML) });
      await page.keyboard.press('Escape'); await expect(open).toBeFocused();
      await expect(page.locator('[inert]')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
