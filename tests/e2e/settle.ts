import type { Page } from '@playwright/test';

/**
 * Wait for in-flight CSS transitions before grading colour contrast.
 *
 * Chips, nav links and control buttons carry Tailwind `transition-colors` at
 * 0.15s, and `goto` can hand control back while the first paint's transitions
 * are still interpolating. axe then samples a blended colour that no
 * stylesheet declares and reports contrast failures against it: measured as
 * foreground #a77164 on a citation chip whose settled computed colour is
 * rgb(154,164,171), and #889197 on #313437 for a Reset button whose tokens are
 * #9aa4ab on #181c1f. An immediate re-analyze of the same untouched page
 * returns zero nodes, which is what rules out a real contrast defect.
 *
 * A test that walks several routes in one `for` loop gets one chance to hit
 * this per route, which is why the two multi-route axe sweeps flaked and the
 * single-route ones did not. Awaiting the animation promises is deterministic
 * where a fixed sleep is not, and grades the colours a reader actually sees.
 */
export async function settleTransitions(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    ).then(() => undefined),
  );
}
