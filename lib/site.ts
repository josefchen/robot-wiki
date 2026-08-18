/**
 * Canonical site URL used by sitemap.ts and robots.ts. The apex origin is
 * authoritative; www.robot-wiki.com 307-redirects to it.
 */
export const SITE_URL = 'https://robot-wiki.com';

/**
 * Single indexing switch (off before go-public, on after).
 * The owner's go-public decision of 2026-08-16 set it to true: app/robots.ts
 * permits crawling and the root layout attaches no site-wide noindex meta.
 * Flipping it back to false would restore a blanket Disallow plus noindex on
 * every page; the one route that stays noindex in EITHER state is /404/,
 * which pins its own route-level robots directive (app/not-found.tsx).
 */
export const ALLOW_INDEXING = true;
