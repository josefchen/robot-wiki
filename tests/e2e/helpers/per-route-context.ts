import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

/**
 * Corpus sweeps must not walk their route set on one shared page.
 *
 * A Chromium renderer keeps every document it navigates away from. Measured
 * on this corpus, a single page walking the 47 published routes climbs from
 * 407MB to 1638MB and never gives any of it back (~26MB per route); the same
 * walk with one context per route stays flat at 450-466MB. That growth has
 * twice killed the browser mid-run, and both times the crash landed on a
 * later, innocent test: once as `Target page, context or browser has been
 * closed`, once as `net::ERR_INSUFFICIENT_RESOURCES`.
 *
 * The answer is never to visit fewer routes. It is to give each route its own
 * context and tear it down before the next, which is what these helpers do.
 * `scripts/check-e2e-navigation-budget.ts` enforces the same rule statically.
 *
 * `browser.newContext()` does not inherit the project's `use` options, so a
 * sweep that depends on a viewport, colour scheme or media emulation has to
 * pass them through `options`.
 */
export async function inOwnContext<T>(
  browser: Browser,
  visit: (page: Page) => Promise<T>,
  options?: BrowserContextOptions,
): Promise<T> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  try {
    return await visit(page);
  } finally {
    await context.close();
  }
}

/** Visit each item on a page of its own, in order, tearing down as it goes. */
export async function forEachInOwnContext<Item>(
  browser: Browser,
  items: Iterable<Item>,
  visit: (page: Page, item: Item) => Promise<void>,
  options?: BrowserContextOptions,
): Promise<void> {
  for (const item of items) {
    await inOwnContext(browser, (page) => visit(page, item), options);
  }
}

/** Collect one result per item, each measured on a page of its own. */
export async function mapInOwnContext<Item, T>(
  browser: Browser,
  items: Iterable<Item>,
  visit: (page: Page, item: Item) => Promise<T>,
  options?: BrowserContextOptions,
): Promise<T[]> {
  const results: T[] = [];
  for (const item of items) {
    results.push(await inOwnContext(browser, (page) => visit(page, item), options));
  }
  return results;
}
