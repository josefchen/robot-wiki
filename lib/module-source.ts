import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Raw source for a registry-backed MDX module. */
export function moduleSource(domain: string, slug: string): string {
  return readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
}

/**
 * The reviewed date is the only truthful per-article freshness signal in
 * the content model, so it is also the source for sitemap lastmod.
 */
export function moduleLastReviewed(
  domain: string,
  slug: string,
): string | undefined {
  const value = matter(moduleSource(domain, slug)).data.lastReviewed;
  return typeof value === 'string' ? value : undefined;
}

/** Verified publication date; legacy modules may honestly omit it. */
export function moduleDatePublished(
  domain: string,
  slug: string,
): string | undefined {
  const value = matter(moduleSource(domain, slug)).data.datePublished;
  return typeof value === 'string' ? value : undefined;
}
