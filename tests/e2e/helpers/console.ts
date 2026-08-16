import type { Page } from '@playwright/test';

/**
 * Shared e2e console-error collection.
 *
 * The App Router cancels its speculative link prefetches with
 * net::ERR_ABORTED on every page under the static export (verified
 * identical site-wide on the previously validated drones, surgical and
 * space pages, 2026-08-15). Those cancels are client-side aborts, not
 * failed requests, so counting them as errors makes any spec that listens
 * to requestfailed/console fail for a reason that is not a page defect.
 * Consolidated here from space.spec.ts's local filter so every spec that
 * judges console output shares one filter (and one mutation proof).
 *
 * Benign-failure classes must stay documented: add a new one only with a
 * comment naming where it was observed and why it is not a defect.
 */

/** Playwright errorText of a client-side request cancellation. */
export const ABORTED_REQUEST = 'net::ERR_ABORTED';

/**
 * True for a request failure that is documented-benign on this site.
 * Currently exactly one class: the App Router's net::ERR_ABORTED
 * speculative-prefetch cancels described above. Every other failure text
 * (net::ERR_FAILED, net::ERR_CONNECTION_REFUSED, ...) is a real defect.
 */
export function isBenignRequestFailure(errorText: string | undefined): boolean {
  return errorText === ABORTED_REQUEST;
}

export interface ConsoleLog {
  /** Everything a spec should assert is empty when the page is healthy. */
  errors: string[];
}

/**
 * Record console errors, page errors and failed requests on `page` while
 * filtering the benign prefetch cancels. Returns the live error list:
 * assert it is empty after the page has settled (`networkidle`).
 */
export function collectConsole(page: Page): ConsoleLog {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    if (!isBenignRequestFailure(req.failure()?.errorText)) {
      errors.push(
        `requestfailed: ${req.url()} :: ${req.failure()?.errorText}`,
      );
    }
  });
  return { errors };
}
