import type { MetadataRoute } from 'next';
import { DOMAINS, publishedModules } from '@/data/modules';
import { articleDateModified, routeDateModified } from '@/lib/content-dates';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * The indexable standalone routes. /search/ and /privacy/ are noindex, so
 * they stay out of the sitemap.
 */
export const SITEMAP_STANDALONE_PATHS = [
  '/market-map/',
  '/playground/',
  '/how-robots-work/',
  '/glossary/',
  '/credits/',
  '/editorial-policy/',
  '/about/',
  '/a-z/',
] as const;

// Every lastmod is a git date from data/content-dates.json: an article's is
// its dateModified, and any other route's is the latest change to its page
// source or the data it renders (ROUTE_SOURCES in lib/content-dates.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: routeDateModified('/') },
    ...DOMAINS.map((domain) => ({
      url: `${SITE_URL}/${domain}/`,
      lastModified: routeDateModified(`/${domain}/`),
    })),
    ...SITEMAP_STANDALONE_PATHS.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: routeDateModified(path),
    })),
    // Drafts never appear here.
    ...publishedModules().map((m) => ({
      url: `${SITE_URL}/${m.domain}/${m.slug}/`,
      lastModified: articleDateModified(m.domain, m.slug),
      images: articleStructuredImagePaths(m.domain, m.slug).map(
        (path) => `${SITE_URL}${path}`,
      ),
    })),
  ];
}
