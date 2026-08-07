import type { MetadataRoute } from 'next';
import { publishedModules } from '@/data/modules';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Drafts never appear here: only the published registry set is exported.
    ...publishedModules().map((m) => ({
      url: `${SITE_URL}/${m.domain}/${m.slug}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
