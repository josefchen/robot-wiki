/**
 * Canonical site URL used by sitemap.ts and robots.ts. The apex origin is
 * authoritative; www.robot-wiki.com 307-redirects to it.
 */
export const SITE_URL = 'https://robot-wiki.com';
export const SITE_DISPLAY_NAME = 'Robot Wiki';
export const SITE_DESCRIPTOR =
  'Citation-first encyclopedia of modern robot learning.';

export type VercelEnvironment = 'production' | 'preview' | 'development';

/**
 * Vercel exposes the deployment environment at build time. Keep the policy
 * helpers pure so preview/indexing and analytics behavior can be tested
 * without mutating process.env in a shared test worker.
 */
export function allowIndexingForEnvironment(
  environment: string | undefined,
): boolean {
  return environment !== 'preview';
}

export function enableAnalyticsForEnvironment(
  environment: string | undefined,
): boolean {
  return environment === 'production';
}

/**
 * Single indexing switch (off before go-public, on after).
 * The owner's go-public decision of 2026-08-16 set it to true: app/robots.ts
 * permits crawling and the root layout attaches no site-wide noindex meta.
 * Flipping it back to false would restore a blanket Disallow plus noindex on
 * every page. /404 and the internal /search utility stay noindex in either
 * state through their own route-level directives.
 */
export const ALLOW_INDEXING = allowIndexingForEnvironment(
  process.env.VERCEL_ENV,
);

/** Anonymous analytics ships only in a real Vercel production build. */
export const ENABLE_ANALYTICS = enableAnalyticsForEnvironment(
  process.env.VERCEL_ENV,
);
