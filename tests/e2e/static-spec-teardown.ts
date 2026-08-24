/**
 * Shared afterAll teardown for specs that own BOTH a manually launched
 * browser and a static-export server (heading-permalink,
 * author-truncation, rail-clearance, search-placeholder-fit).
 *
 * Why this exists: under full-suite load, `browser.close()` plus
 * `server.stop()` inside one afterAll occasionally exceeded the default
 * 30-second hook budget, failing a spec whose assertions had already
 * passed (heading-permalink, full run 2026-08-21: test body 0ms,
 * "afterAll hook timeout of 30000ms exceeded"; the same file passed
 * 24/24 standalone). Two properties fix it:
 *
 * 1. An explicit, generous hook budget via `test.setTimeout` inside the
 *    hook (the documented way to size a beforeAll/afterAll hook; there
 *    is no per-hook timeout argument). 120s is the same budget the
 *    config grants the dev-server webServer to come UP; teardown of the
 *    same machinery should not have less.
 * 2. The two closes run independently (allSettled), so a slow or
 *    failing browser close cannot prevent the server from stopping and
 *    leaking its port. Rejections are inspected after both have run: one
 *    failure is re-thrown unchanged, while simultaneous failures are kept
 *    in cleanup order in an AggregateError.
 *
 * A hook that fails a green assertion is worse than a slow hook: the
 * budget is sized so the hook cannot be the thing that invalidates a
 * full-suite number.
 */
import { test, type Browser } from '@playwright/test';
import type { StaticExportServer } from './static-export-server';

export const TEARDOWN_TIMEOUT_MS = 120_000;

export async function closeBrowserAndStopServer(
  browser: Browser | null | undefined,
  server: StaticExportServer | null | undefined,
): Promise<void> {
  test.setTimeout(TEARDOWN_TIMEOUT_MS);
  const results = await Promise.allSettled([
    browser?.close(),
    server?.stop(),
  ]);
  const rejections = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (rejections.length === 1) throw rejections[0].reason;
  if (rejections.length > 1) {
    throw new AggregateError(
      rejections.map((rejection) => rejection.reason),
      'Browser and static-export server teardown both failed',
    );
  }
}
