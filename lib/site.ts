/**
 * Canonical site URL used by sitemap.ts and robots.ts. The apex origin is
 * authoritative; www.robot-wiki.com 307-redirects to it.
 */
export const SITE_URL = 'https://robot-wiki.com';

/**
 * Temporary indexing guard: while the wiki is unfinished, the published site
 * must stay out of search engines. While this is false, app/robots.ts
 * disallows all crawling and the root layout attaches a robots noindex meta
 * tag to every page.
 *
 * The polish-go-public feature flips this to true (VAL-BRAND-007 supersedes
 * VAL-BRAND-006 in the validation contract). Do not flip it anywhere else.
 */
export const ALLOW_INDEXING = false;
