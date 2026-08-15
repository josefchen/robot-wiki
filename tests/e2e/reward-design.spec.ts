import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * RL reward-design + MPC module. The module shipped with unit and component
 * coverage but no e2e spec; this closes the gap for the global polish pass:
 * the reward-shaping panel is one of the interval-playing interactives that
 * must degrade to coarse discrete jumps under prefers-reduced-motion
 * (VAL-A11Y-019), plus the standard module contract (axe, 375px).
 */

const ROUTE = '/rl-sim2real/reward-design-mpc/';

test.describe('RL reward-design and MPC module', () => {
  test('the reward-shaping panel renders weights, total, and preview', async ({ page }) => {
    await page.goto(ROUTE);
    const panel = page.locator('[data-testid="quad-preview"]').locator('..');
    await expect(page.getByTestId('quad-preview')).toBeVisible();
    await expect(page.getByTestId('total-readout')).toContainText(/\/ step/);
    await expect(page.getByTestId('behavior-status')).toContainText(/balanced/i);
    // Twelve weight sliders, all labelled.
    const sliders = panel.getByRole('slider');
    expect(await sliders.count()).toBe(12);
  });

  test('a dominant torque weight flips the behavior readout; reset restores it', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('behavior-status')).toContainText(/balanced/i);
    // Find the torque slider by its accessible name and push it high.
    const torque = page.getByRole('slider', { name: /torque/i });
    await torque.focus();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('ArrowRight');
    }
    await expect(page.getByTestId('behavior-status')).toContainText(/freeze/i);
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('behavior-status')).toContainText(/balanced/i);
  });

  test('reduced motion: preview playback steps discretely (VAL-A11Y-019)', async ({ browser }) => {
    // lib/reward-shaping.ts: reduced cadence is 200 ms ticks advancing the
    // preview phase by 0.125 per tick, versus the smooth 50 ms / 0.02. The
    // phase readout ("Preview phase: N%") must therefore hold 0% inside the
    // smooth-tick window and then advance by the coarse increment.
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const phaseReadout = page
      .locator('span', { hasText: 'Preview phase:' })
      .locator('span');
    await expect(phaseReadout).toHaveText('0%');
    await page.getByRole('button', { name: /play rollout preview/i }).click();
    // One immediate read, deliberately NOT auto-retrying: the first coarse
    // tick cannot fire before 200 ms, but a smooth tick would land at 50 ms.
    await page.waitForTimeout(120);
    expect(await phaseReadout.textContent()).toBe('0%');
    await expect
      .poll(async () => (await phaseReadout.textContent()) ?? '', { timeout: 5_000 })
      .not.toBe('0%');
    const phase = Number.parseInt(
      (await phaseReadout.textContent()) ?? '0',
      10,
    );
    // Coarse jumps advance the phase in multiples of 12.5 (rounded by the
    // readout's Math.round).
    expect(phase % 12.5 === 0 || Math.abs(phase / 12.5 - Math.round(phase / 12.5)) < 0.01).toBe(true);
    await context.close();
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
