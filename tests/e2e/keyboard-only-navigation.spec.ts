import { expect, test } from '@playwright/test';

/**
 * Keyboard-only global navigation (VAL-CROSS-022): a reader who never
 * touches the mouse can travel `/` -> sidebar section toggle -> module
 * link -> in-page interactive control, with focus visibly painted at each
 * stop. Component-level arrow-key behavior is already pinned by the
 * module specs and the shared setSlider helper; this spec pins the
 * global path: skip link reachability, section toggles as buttons,
 * module links reachable by Tab, Enter activation, and the visible focus
 * outline (the locked 2px signal-blue global outline) on the focused stops.
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
    // 2px global ring, not merely any visible outline.
    const outlineWidth = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return parseFloat(getComputedStyle(active).outlineWidth);
    });
    expect(outlineWidth).toBe(2);

    // Move focus into the sidebar taxonomy. The section toggles are
    // buttons (Enter toggles them) and the module links are links.
    // Walk tab stops until the Manipulation group toggle is focused.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
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
          .querySelector('nav[aria-label="robot-wiki taxonomy"]')
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
    // The compounding/action interactives live on specific modules; the
    // first manipulation module hosts a real slider. Find any slider and
    // drive it with the keyboard.
    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible();
    await slider.focus();
    const before = await slider.evaluate((el) => (el as HTMLInputElement).value);
    await page.keyboard.press('ArrowRight');
    const after = await slider.evaluate((el) => (el as HTMLInputElement).value);
    expect(after).not.toBe(before);

    // Focus is visibly painted on the slider too, at the locked 2px.
    const sliderOutline = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return parseFloat(getComputedStyle(active).outlineWidth);
    });
    expect(sliderOutline).toBe(2);
  });
});
