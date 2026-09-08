import { expect, test } from '@playwright/test';
const routes = [
  "/rl-sim2real/parallel-sim-rl/",
  "/rl-sim2real/reward-design-mpc/",
  "/rl-sim2real/sim2real-transfer/",
  "/rl-sim2real/why-rl-locomotion/",
  "/world-models/generative-sim/"
];
for (const route of routes) {
  test(`Isaac Lab full credited list remains keyboard accessible on ${route}`, async ({ page }) => {
    await page.goto(route);
    const entry = page.locator('[data-reference-id="isaac-lab-2025"]');
    const toggle = entry.getByRole('button');
    await expect(toggle).toHaveText('Show all 106 authors');
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(entry.locator('[data-author-names]')).toContainText('Soowan Park (박수완)');
    await expect(entry.locator('[data-author-names]')).toContainText('Gavriel State');
    await expect(toggle).toBeFocused();
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(entry.locator('[data-author-names]')).toContainText('and 98 more');
    await expect(entry.locator('[data-reference-source-link]')).toHaveAttribute(
      'href', 'https://arxiv.org/abs/2511.04831');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
