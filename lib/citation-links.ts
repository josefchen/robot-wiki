/**
 * Shared logic for the citation link-liveness sweep.
 *
 * The network runner lives in scripts/check-citation-links.ts; the pure
 * classification rules live here so they can be unit-tested without network
 * access. Kept deliberately small: one UA constant, two predicates, and the
 * result types.
 */

/**
 * A real browser user agent. This is load-bearing: some proceedings sites
 * (papers.nips.cc was the case that motivated this sweep) answer a bare curl
 * differently than a browser, so a naive check reports a false pass.
 */
export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Final verdict for a single citation URL. */
export type LinkVerdict = 'live' | 'dead' | 'blocked' | 'error';

/** HTTP status code from a response, or 0 when the request never got one. */
export type LinkStatus = number;

export interface LinkCheckResult {
  id: string;
  url: string;
  verdict: LinkVerdict;
  /** Final HTTP status after redirects (0 when the request failed outright). */
  status: LinkStatus;
  /** Final URL after redirects, when it differs from the registry URL. */
  finalUrl?: string;
  /** Error message for network-level failures (timeout, DNS, TLS). */
  error?: string;
}

/**
 * Classify a final HTTP status into a verdict.
 *
 * - 2xx: live.
 * - 404/410: dead.
 * - 401/403/429: blocked. A bot-wall or rate limit is not evidence of link
 *   rot; the sweep reports these separately so a human can re-check them in a
 *   real browser instead of "fixing" a link that is fine.
 * - everything else (5xx, 3xx leftovers, 0): error, i.e. inconclusive.
 */
export function classifyStatus(status: LinkStatus): LinkVerdict {
  if (status >= 200 && status < 300) return 'live';
  if (status === 404 || status === 410) return 'dead';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  return 'error';
}

/**
 * Whether a HEAD response should be retried as a GET. Some servers answer
 * HEAD with 405/501 (or even a generic 5xx), and some bot-walls only
 * challenge HEAD requests.
 */
export function shouldFallbackToGet(status: LinkStatus): boolean {
  return status === 405 || status === 501 || status === 403 || status >= 500;
}
