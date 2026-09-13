import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { setSlider } from './slider';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`named-device depth specifications and calculator at ${viewport.width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [], denied: string[] = [], states: object[] = [];
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS;
    const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
    const inputSha256 = inputPath ? hash(inputPath) : null;
    const save = () => writeFileSync(testInfo.outputPath('reader-state.json'), JSON.stringify({
      viewport, url: page.url(), inputPath, inputSha256, states, errors, denied,
    }, null, 2));
    const capture = async (name: string, state: object = {}) => {
      const path = testInfo.outputPath(name + '.png');
      await page.screenshot({ path, animations: 'disabled' });
      states.push({ name, path, sha256: hash(path), at: new Date().toISOString(),
        url: page.url(), viewport, inputPath, inputSha256, ...state });
      save();
    };
    const position = async (element: Locator, top = 100) => {
      await element.scrollIntoViewIfNeeded();
      await element.evaluate((el, top) => window.scrollBy(0, el.getBoundingClientRect().top - top), top);
    };
    const bounds = async (element: Locator) => {
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      return box!;
    };
    const captureText = async (element: Locator, name: string) => {
      await position(element);
      const box = await bounds(element);
      for (let offset = 0, part = 1; offset < box.height; offset += viewport.height - 180, part++) {
        await element.evaluate((el, offset) => window.scrollBy(0, el.getBoundingClientRect().top - 100 + offset), offset);
        await capture(`${name}-${part}`, { offset, elementHeight: box.height });
      }
    };
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.context().route('**/*', route => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue();
      denied.push(url.href);
      return route.abort();
    });
    await page.context().addInitScript(() => {
      const install = () => {
        if (!document.documentElement) return;
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
        document.documentElement.appendChild(style);
        observer.disconnect();
      };
      const observer = new MutationObserver(install);
      observer.observe(document, { childList: true, subtree: true });
      install();
    });
    await page.setViewportSize(viewport);
    expect((await page.goto('/classical/perception/'))?.status()).toBe(200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
      Object.keys(el).some(key => key.startsWith('__reactFiber$'))));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const prose = page.locator('div.prose[data-pagefind-body]');
    const fontRoles = await page.evaluate(() => {
      const selectors = ['h1', '[data-testid="perception-target-note"]', 'div.prose[data-pagefind-body] > p', '[data-testid="perception-total-readout"]'];
      return selectors.map(selector => {
        const family = getComputedStyle(document.querySelector(selector)!).fontFamily;
        return { selector, family, loaded: document.fonts.check('16px ' + family.split(',')[0]) };
      });
    });
    expect(fontRoles.every(role => role.loaded)).toBe(true);
    expect(fontRoles[0].family).toMatch(/tektur/i);
    expect(fontRoles[1].family).toMatch(/plex.*sans/i);
    expect(fontRoles[2].family).toMatch(/newsreader/i);
    expect(fontRoles[3].family).toMatch(/plex.*mono/i);
    await capture('opening-font-roles', { fontRoles });

    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    if (viewport.width === 375) {
      await menu.focus(); await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      const close = dialog.getByRole('button', { name: 'Close navigation menu' });
      await expect(close).toBeFocused();
      const nav = dialog.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
      await expect(nav.getByRole('link', { name: 'Perception for Manipulation', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('#main-content').locator('xpath=ancestor-or-self::*[@inert]').first()).toBeAttached();
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await close.focus(); await page.keyboard.press('Shift+Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await expect(close).not.toBeFocused();
      await page.keyboard.press('Tab'); await expect(close).toBeFocused();
      await capture('drawer-keyboard-trap', { backgroundInert: true, bothDirections: true });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0); await expect(menu).toBeFocused();
      await expect(page.locator('[inert]')).toHaveCount(0);
    } else {
      await expect(menu).not.toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Robot Wiki taxonomy' })
        .getByRole('link', { name: 'Perception for Manipulation', exact: true })).toHaveAttribute('aria-current', 'page');
    }

    const budget = page.getByTestId('perception-budget');
    await expect(page.getByTestId('perception-target-note')).toContainText('not a material-specific accuracy guarantee');
    await expect(budget).toContainText('D410/D415 and D43x');
    const opening = await page.getByTestId('perception-total-readout').innerText();
    for (const [target, expected] of [['specular', '6.0%'], ['transparent', '16.0%']] as const) {
      await page.getByTestId(`perception-target-${target}`).check();
      await expect(page.getByTestId('perception-depth-readout')).toContainText(expected);
      await position(page.getByTestId('perception-chart'));
      await capture('calculator-' + target, { teachingOnly: true, target });
    }
    for (const [slider, value] of [['handeye', 2.4], ['distance', 1.35], ['depth', 12], ['pose', 9]] as const) {
      await setSlider(page.getByTestId(`perception-${slider}-slider`), value);
    }
    await page.getByRole('button', { name: /reset the error budget/i }).click();
    for (const [slider, value] of [['handeye', '0.5'], ['distance', '0.5'], ['depth', '2'], ['pose', '3']]) {
      await expect(page.getByTestId(`perception-${slider}-slider`)).toHaveValue(value);
    }
    await expect(page.getByTestId('perception-target-opaque')).toBeChecked();
    await expect(page.getByTestId('perception-total-readout')).toHaveText(opening);
    await captureText(page.getByTestId('perception-target-note'), 'opaque-reset-note');
    await captureText(budget.locator('p').last(), 'calculator-reference');

    for (const [text, name, checks] of [
      ['The examples below report specifications', 'named-device-introduction', ['named devices', 'universal accuracy or speed ranking']],
      ['The March 2026 RealSense', 'd400-model-conditions', ['valid pixels', 'ground truth', '150 mW', '250 lux', 'D401/D405', '80%', 'HD resolution']],
      ['Industrial 3D scanning.', 'phoxi-separate-fields', ['0.200 mm (1 σ)', '0.190 mm (1 σ)', '870 to 2150 mm', '250 to 2750 ms', 'not establish uniform accuracy throughout']],
    ] as const) {
      const paragraph = prose.locator('p').filter({ hasText: text });
      for (const check of checks) await expect(paragraph).toContainText(check);
      await captureText(paragraph, name);
    }
    const specular = prose.locator('li').filter({ hasText: 'Table 3-50' });
    for (const text of ['D400f', 'May cause image saturation', 'Saturation mitigated', 'does not mean eliminated']) await expect(specular).toContainText(text);
    await expect(specular.locator('[data-cite-id="azure-kinect-depth-docs-2026"]')).toHaveCount(1);
    await captureText(specular, 'paired-saturation-statements');

    for (const id of ['realsense-d400-datasheet-2026', 'photoneo-phoxi-l-2026', 'azure-kinect-depth-docs-2026']) {
      const cite = id === 'realsense-d400-datasheet-2026'
        ? specular.locator(`[data-cite-id="${id}"]`)
        : prose.locator(`[data-cite-id="${id}"]`).first();
      for (const edge of [120, viewport.height - 80]) {
        await position(cite, edge);
        // The sticky top bar is mobile-only (site-shell.tsx: lg:hidden).
        // Measure the actual occluding edge instead of inventing a desktop bar.
        const header = await page.locator('header.sticky').boundingBox();
        const topBoundary = header ? header.y + header.height : 0;
        if (viewport.width === 375) {
          expect(header).not.toBeNull();
          expect(header!.y).toBe(0);
          expect(header!.height).toBeGreaterThan(0);
        } else expect(header).toBeNull();
        const trigger = cite.locator('a').first();
        await trigger.hover();
        const tooltip = cite.getByRole('tooltip');
        await expect(tooltip).toBeVisible();
        const hover = await bounds(tooltip);
        expect(hover.y).toBeGreaterThanOrEqual(topBoundary);
        expect(hover.y + hover.height).toBeLessThanOrEqual(viewport.height);
        await page.mouse.move(viewport.width - 1, viewport.height - 1);
        await trigger.focus(); await expect(tooltip).toBeVisible();
        const focus = await bounds(tooltip);
        expect(focus.y).toBeGreaterThanOrEqual(topBoundary);
        expect(focus.y + focus.height).toBeLessThanOrEqual(viewport.height);
        await capture(`${id}-edge-${edge}`, { hover, focus, edge, header, topBoundary });
        await page.keyboard.press('Escape'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      }
    }
    const term = prose.locator('[data-term-id="point-cloud"]');
    await position(term);
    await term.locator('a,button').first().focus();
    await expect(term.getByRole('tooltip')).toBeVisible();
    await bounds(term.getByRole('tooltip'));
    await capture('point-cloud-keyboard-definition');
    await page.keyboard.press('Escape'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const reference = page.locator('ol [data-reference-id="realsense-d400-datasheet-2026"]');
    await expect(reference).toContainText('RealSense Product Family D400 Series Datasheet');
    await expect(reference).toContainText('RealSense');
    await expect(reference.getByRole('link', { name: 'RealSense Product Family D400 Series Datasheet', exact: true }))
      .toHaveAttribute('href', 'https://www.realsenseai.com/wp-content/uploads/2026/03/RealSense-D400-Series-Datasheet-Mar-2026.pdf');
    // Leave the following PointNet citation before the unobscured byline image.
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(prose.getByRole('tooltip')).toHaveCount(0);
    await captureText(reference, 'd400-title-byline');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]); expect(denied).toEqual([]);
    save();
  });
}
