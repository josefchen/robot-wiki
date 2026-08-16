import { expect, test } from '@playwright/test';
import {
  collectConsole,
  isBenignRequestFailure,
} from './helpers/console';

/**
 * Mutation proof for the shared console-collection helper
 * (tests/e2e/helpers/console.ts), per the test-infrastructure rule: a
 * filter that silently swallowed every error would keep every consuming
 * spec green, so the helper's discrimination is proven here, live, on
 * both sides.
 *
 * 1. A real injected console error is recorded -> a spec asserting
 *    `errors` is empty fails. (Red direction.)
 * 2. An injected net::ERR_ABORTED request cancellation is NOT recorded
 *    -> the App Router's site-wide speculative-prefetch cancels cannot
 *    fail a consuming spec. The abort is produced by route.abort
 *    ('aborted'), the same cancellation channel the router uses, so the
 *    requestfailed event carries errorText 'net::ERR_ABORTED' exactly.
 * 3. A non-aborted request failure (net::ERR_FAILED via
 *    route.abort('failed')) IS recorded.
 *
 * The injections ride the dev-server home page only as a host for the
 * events; nothing about the page itself is under test.
 */

test.describe('collectConsole helper', () => {
  test('records a real injected console error (mutation proof: red side)', async ({
    page,
  }) => {
    const { errors } = collectConsole(page);
    await page.goto('/');
    await page.evaluate(() => console.error('injected-mutation-proof-error'));
    // Drain pending console events before judging.
    await page.waitForTimeout(200);
    expect(errors.some((e) => e.includes('injected-mutation-proof-error'))).toBe(true);
  });

  test('records a real injected page error (mutation proof: red side)', async ({
    page,
  }) => {
    const { errors } = collectConsole(page);
    await page.goto('/');
    await page.evaluate(
      () => setTimeout(() => { throw new Error('injected-mutation-proof-pageerror'); }, 0),
    );
    await page.waitForTimeout(200);
    expect(errors.some((e) => e.includes('injected-mutation-proof-pageerror'))).toBe(true);
  });

  test('filters the injected net::ERR_ABORTED prefetch-cancel class (mutation proof: filtered side)', async ({
    page,
  }) => {
    const { errors } = collectConsole(page);
    // Abort a fetch the way the App Router aborts speculative prefetches:
    // a client-side cancel of a fetch() request. requestfailed fires with
    // errorText net::ERR_ABORTED and, like the router's real cancels, no
    // console error is logged (fetch rejections are console-silent; a
    // <link> load would additionally log "Failed to load resource").
    await page.route('**/injected-abort.css', (route) => route.abort('aborted'));
    await page.goto('/');
    await page.evaluate(() =>
      fetch('/injected-abort.css').catch(() => {
        /* the cancel is the point */
      }),
    );
    // requestfailed is emitted before the evaluate resolves downstream;
    // settle before judging.
    await page.waitForTimeout(300);
    expect(
      errors,
      `expected no recorded errors; got: ${errors.join('\n')}`,
    ).toEqual([]);
  });

  test('records a non-aborted request failure (mutation proof: red side)', async ({
    page,
  }) => {
    const { errors } = collectConsole(page);
    await page.route('**/injected-fail.css', (route) => route.abort('failed'));
    await page.goto('/');
    await page.evaluate(() =>
      fetch('/injected-fail.css').catch(() => {
        /* the failure is the point */
      }),
    );
    await page.waitForTimeout(300);
    expect(
      errors.filter((e) => e.startsWith('requestfailed:')),
      `expected the net::ERR_FAILED failure to be recorded; got: ${errors.join('\n')}`,
    ).toHaveLength(1);
  });

  test('the pure predicate still agrees with the live channel (unit-level guard)', () => {
    // The e2e channel proves the wire; this pins the exact constant the
    // filter matches against the event Playwright actually emitted in the
    // filtered test above.
    expect(isBenignRequestFailure('net::ERR_ABORTED')).toBe(true);
    expect(isBenignRequestFailure('net::ERR_FAILED')).toBe(false);
  });
});
