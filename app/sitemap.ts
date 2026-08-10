import type { MetadataRoute } from 'next';
import { DOMAINS, publishedModules } from '@/data/modules';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Domain landing views (the taxonomy entry points).
    ...DOMAINS.map((domain) => ({
      url: `${SITE_URL}/${domain}/`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Standalone tools and reference surfaces.
    ...['/market-map/', '/playground/', '/search/', '/glossary/', '/credits/'].map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    // Drafts never appear here: only the published registry set is exported.
    ...publishedModules().map((m) => ({
      url: `${SITE_URL}/${m.domain}/${m.slug}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
