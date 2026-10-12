import { expect, test } from '@playwright/test';

/**
 * Keyboard-only global navigation (VAL-CROSS-022): a reader who never
 * touches the mouse can travel `/` -> sidebar section toggle -> module
 * link -> in-page interactive control, with focus visibly painted at each
 * stop. Component-level arrow-key behavior is already pinned by the
 * module specs and the shared setSlider helper; this spec pins the
 * global path: skip link reachability, section toggles as buttons,
 * module links reachable by Tab, Enter activation, and the visible focus
 * outline (the locked 1px ink global outline, offset 2px) on the focused
 * stops.
 *
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the persistent sidebar is gone and the focus ring is a 1px ink outline
 * offset 2px, in place of the 2px signal-blue ring. The taxonomy lives in
 * the panel the top bar's "Articles" button opens, so the keyboard path
 * reaches that button by Tab, opens the panel with Enter, and walks the
 * same section toggles and module links inside it.
 */

test.describe('keyboard-only global navigation (VAL-CROSS-022)', () => {
  test('a keyboard-only path from / to a module page to a slider works', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // The skip link is the first tab stop: keyboard users reach main
    // content without tabbing through the whole sidebar.
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', {
      name: /skip to (main )?content/i,
    });
    await expect(skipLink).toBeFocused();

    // Focus outline is visibly painted on the focused stop: the locked
    // 1px ink ring offset 2px, not merely any visible outline.
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return {
        width: parseFloat(style.outlineWidth),
        offset: parseFloat(style.outlineOffset),
        color: style.outlineColor,
      };
    });
    expect(ring.width).toBe(1);
    expect(ring.offset).toBe(2);
    expect(ring.color).toBe('rgb(28, 28, 26)');

    // The taxonomy sits in the panel the top bar's "Articles" button
    // opens. Walk tab stops until that button is focused and open the
    // panel with Enter; focus moves into the panel.
    const articles = page
      .locator('[data-site-topbar]')
      .getByRole('button', { name: 'Articles', exact: true });
    let focusedArticles = false;
    for (let i = 0; i < 6 && !focusedArticles; i += 1) {
      await page.keyboard.press('Tab');
      focusedArticles = await articles.evaluate(
        (el) => el === document.activeElement,
      );
    }
    expect(focusedArticles, 'Tab reaches the Articles button').toBe(true);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('dialog', { name: 'Site navigation' }),
    ).toBeVisible();
    await expect(articles).toHaveAttribute('aria-expanded', 'true');

    // Move focus into the panel's taxonomy. The section toggles are
    // buttons (Enter toggles them) and the module links are links.
    // Walk tab stops until the Manipulation group toggle is focused.
    const nav = page.getByRole('navigation', {
      name: 'Robot Wiki taxonomy drawer',
      exact: true,
    });
    let focusedToggle = false;
    for (let i = 0; i < 40 && !focusedToggle; i += 1) {
      await page.keyboard.press('Tab');
      focusedToggle = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return false;
        return (
          active.getAttribute('role') !== 'link' &&
          active.tagName === 'BUTTON' &&
          active.textContent?.includes('Manipulation')
        );
      });
    }
    expect(focusedToggle, 'Tab reaches the Manipulation section toggle').toBe(
      true,
    );

    await page.keyboard.press('Enter');
    await expect(
      nav.getByRole('button', { name: 'Manipulation & Learned Policies' }),
    ).toHaveAttribute('aria-expanded', 'true');

    // Tab into the now-expanded module list and activate the first
    // module link with the keyboard.
    let focusedModuleLink = false;
    for (let i = 0; i < 12 && !focusedModuleLink; i += 1) {
      await page.keyboard.press('Tab');
      focusedModuleLink = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active.tagName !== 'A') return false;
        const inNav = document
          .querySelector('nav[aria-label="Robot Wiki taxonomy drawer"]')
          ?.contains(active);
        // A module route, not the group's Domain overview link: two
        // segments under /manipulation/ (e.g. /manipulation/bc-foundations/).
        const href = active.getAttribute('href') ?? '';
        return !!inNav && /^\/manipulation\/[^/]+\/?$/.test(href);
      });
    }
    expect(focusedModuleLink, 'Tab reaches a manipulation module link').toBe(
      true,
    );

    const focusedHref = await page.evaluate(
      () => document.activeElement?.getAttribute('href'),
    );
    await page.keyboard.press('Enter');
    await page.waitForURL(focusedHref ?? /\/manipulation\//);

    // On the module page, an interactive control responds to arrow keys.
    // A figure keeps its sliders in its "Adjust more" fold. On the first
    // manipulation module that figure belongs to the prediction step, and
    // the guess is optional: the fold's summary is reachable with the
    // reasoning still closed, so a keyboard reader opens it with Enter and
    // drives the slider it uncovers without answering.
    const predict = page.locator('[data-predict]');
    const hasPredict = (await predict.count()) > 0;
    if (hasPredict) {
      await expect(predict.locator('details[data-reveal]').first()).not.toHaveAttribute('open');
      await expect(
        predict.locator(':scope > [data-predict-figure] [data-figure-fold="adjust"] > summary').first(),
      ).toBeVisible();
    }
    const summary = page
      .locator('[data-figure-fold="adjust"] > summary')
      .filter({ visible: true })
      .first();
    await summary.focus();
    await page.keyboard.press('Enter');
    const slider = page.locator('[data-figure-fold="adjust"][open]').getByRole('slider').first();
    await expect(slider).toBeVisible();
    await slider.focus();
    const before = await slider.evaluate((el) => (el as HTMLInputElement).value);
    await page.keyboard.press('ArrowRight');
    const after = await slider.evaluate((el) => (el as HTMLInputElement).value);
    expect(after).not.toBe(before);

    // Focus is visibly painted on the slider too, at the locked 1px ring
    // offset 2px.
    const sliderRing = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return {
        width: parseFloat(style.outlineWidth),
        offset: parseFloat(style.outlineOffset),
      };
    });
    expect(sliderRing.width).toBe(1);
    expect(sliderRing.offset).toBe(2);

    // A keyboard reader who does guess answers with Space on a choice,
    // which opens the reasoning and leaves the figure where it was.
    if (hasPredict) {
      const choice = predict.getByRole('radio').first();
      await choice.focus();
      await page.keyboard.press('Space');
      await expect(predict.locator('details[data-reveal]').first()).toHaveAttribute('open', '');
      await expect(slider).toBeVisible();
    }
  });
});
