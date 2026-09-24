import type { MetadataRoute } from 'next';
import { DOMAINS, publishedModules } from '@/data/modules';
import { moduleLastReviewed } from '@/lib/module-source';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

function latestReviewDate(
  entries: ReadonlyArray<{ domain: string; slug: string }>,
): string | undefined {
  return entries
    .map((entry) => moduleLastReviewed(entry.domain, entry.slug))
    .filter((date): date is string => typeof date === 'string')
    .sort()
    .at(-1);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const published = publishedModules();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: latestReviewDate(published),
    },
    // Domain landing views (the taxonomy entry points).
    ...DOMAINS.map((domain) => ({
      url: `${SITE_URL}/${domain}/`,
      lastModified: latestReviewDate(
        published.filter((entry) => entry.domain === domain),
      ),
    })),
    // Standalone indexable tools and reference surfaces. /search remains a
    // visitor utility, but its query-dependent output is intentionally
    // noindex and therefore must not appear in the sitemap.
    ...[
      '/market-map/',
      '/playground/',
      '/glossary/',
      '/credits/',
      '/editorial-policy/',
      '/a-z/',
    ].map((path) => ({
      url: `${SITE_URL}${path}`,
    })),
    // Drafts never appear here. lastReviewed is a real, content-backed
    // significant-modification date; unlike changefreq and priority, Google
    // can use it when it is consistently accurate.
    ...published.map((m) => ({
      url: `${SITE_URL}/${m.domain}/${m.slug}/`,
      lastModified: moduleLastReviewed(m.domain, m.slug),
      images: articleStructuredImagePaths(m.domain, m.slug).map(
        (path) => `${SITE_URL}${path}`,
      ),
    })),
  ];
}
